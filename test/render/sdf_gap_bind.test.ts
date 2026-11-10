// K832: the SDF ribbons read the scene's gap-slot table (they were
// built with the empty default before, so rp=sdf crossings never cut
// a casing), take their across coordinate from the winning cone (the
// own cone's lateral creased the border into per-segment sawteeth),
// and cut inside a fused junction's fan reach like the strip does.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gapSource, setGapSource } from "../../src/render/fabric_sdf";
import { CrossingGaps } from "../../src/render/ribbon/crossing_gaps";
import { SDF_FRAG } from "../../src/render/ribbon/ribbon_sdf";
import { gapTurn } from "../../src/render/pluck_model";

describe("K8 the SDF gap call reads a turn", () => {
  // gapKeepAt multiplies its turn by the slot's arcScale (crossing_gaps:
  // closed total, open total / 0.45). K832 passed the ARC, so every
  // fragment fell outside every window and rp=sdf cut no casing at all.
  const line =
    "float gTurn = (float(segK) + t1) * (kc.closed ? 1.0 / float(kc.count) : 0.45 / float(max(kc.count - 1, 1)));";
  it("passes the strip's turn, never the arc", () => {
    expect(SDF_FRAG).toContain(line);
    expect(SDF_FRAG).toContain("float gk = gapKeepAt(pxW, vPos, gTurn, vDir, vIds);");
    expect(SDF_FRAG).not.toContain("gapKeepAt(pxW, vPos, arc,");
  });
  it("matches gapTurn (the strip's encoding) at every sample and between", () => {
    // The shader's expression, mirrored; arcPer as gap_mask.ts defines it.
    const sdfTurn = (k: number, closed: boolean, count: number) =>
      k * (closed ? 1 / count : 0.45 / Math.max(count - 1, 1));
    for (const closed of [true, false]) {
      for (const count of [5, 64, 401]) {
        const total = 37.25;
        const arcPer = total / (closed ? count : count - 1);
        const last = closed ? count : count - 1;
        for (let k = 0; k <= last; k += 0.25) {
          const turn = sdfTurn(k, closed, count);
          expect(turn).toBeCloseTo(gapTurn(k * arcPer, total, closed), 12);
          // and the slot's arcScale gives the sample's arc back
          expect(turn * (closed ? total : total / 0.45)).toBeCloseTo(k * arcPer, 9);
        }
      }
    }
  });
});

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");

describe("K832 SDF gaps, border and junction cut", () => {
  it("binds the scene's gap table through gapSource, and follows it", () => {
    // (Pixi programs are never constructed in Node - k320_slim.test.ts -
    // so the binding is pinned as text here and proven by the stills.)
    const fake = { tag: "scene" } as never;
    setGapSource(fake);
    expect(gapSource()).toBe(fake);
    const sdf = read("../../src/render/ribbon/ribbon_sdf.ts");
    expect(sdf).toContain("uGapData: gapSource() ?? defaultGapTexture().source,");
    // K905: one shared shader per variant (plain, -root), so sdfShader and
    // sdfShaderExplore each rebind the one they hand out.
    const follow = "if (gs && shared.resources.uGapData !== gs) shared.resources.uGapData = gs;";
    expect(sdf.split(follow).length - 1).toBe(2);
    expect(read("../../src/render/ribbon/ribbon_shader.ts")).toContain(
      "setGapSource(tex.source as unknown as BufferImageSource);"
    );
  });

  it("takes the border's across coordinate from the winning cone", () => {
    expect(SDF_FRAG).toContain("if (a0 < a) { a = a0; lW = l0; rW = mix(vRadii.x, vRadii.y, t0); }");
    expect(SDF_FRAG).toContain("if (a2 < a) { a = a2; lW = l2; rW = mix(vRadii.z, vRadii.w, t2); }");
    expect(SDF_FRAG).toContain("float side01 = 0.5 - 0.5 * clamp(lW / max(r, 1e-6), -1.0, 1.0);");
    expect(SDF_FRAG).not.toContain("clamp(l1 / max(r, 1e-6), -1.0, 1.0)");
  });

  it("cuts inside a fused junction's fan reach in the border look", () => {
    expect(SDF_FRAG).toContain("lookA *= 1.0 - kJunctionCut(kc.closed, kc.total, arc, jcaps, pxW);");
    expect(SDF_FRAG).toContain("vSegInfo.z >= 1.5 ? 4.0 : 0.0");
    const src = readFileSync(new URL("../../src/render/ribbon/ribbon_shader.ts", import.meta.url), "utf8").replace(
      /\r\n/g,
      "\n"
    );
    expect(src).toContain("lookA *= 1.0 - kJunctionCut(kc.closed, kc.total, kpt.x, g3ChainAt(kc.ch, 0), pxW);");
    expect(src).toContain("uG3Chain: g3ChainSource(),");
    expect(src).toContain("setGapSource(tex.source as unknown as BufferImageSource);");
  });

  it("packs RANGES for chains that have no strip fills (the SDF pass)", () => {
    // SdfPass.fills is empty, so a fills-bounded packing loop wrote zero
    // range entries and the SDF fragment's window search found nothing:
    // rp=sdf crossings cut no casing. Windows come from chainWins, which
    // update() solves for either pass.
    const written: number[] = [];
    const stub = {
      g3Data: true,
      G3: {},
      fills: [] as never[],
      chainSamples: [
        { count: 40, closed: false, totalLength: 20 },
        { count: 40, closed: false, totalLength: 20 },
      ],
      chainWins: new Map([[0, [0, 10, 3, 3]]]),
      // K846: the junction side cut reads these (no junctions here).
      junctionCutEntries: [] as never[],
      g3NJunc: new Int32Array(2),
      idScratch: new Map(),
      g3RangeScratch: new Float32Array(4096),
      g3WinBase: new Int32Array(2),
      g3NWin: new Int32Array(2),
      g3WriteRanges: (entries: number) => {
        written.push(entries);
      },
    };
    new CrossingGaps(stub as never).assignGapIds();
    expect(written).toEqual([1]);
    expect(stub.g3NWin[0]).toBe(1);
    expect(stub.g3NWin[1]).toBe(0);
  });
});

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

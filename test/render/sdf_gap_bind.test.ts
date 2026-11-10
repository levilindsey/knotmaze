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

describe("K8 one SDF quad per pixel", () => {
  // Segment boxes overlap by R, so before K8 up to three quads drew a
  // pixel and every partial alpha compounded (a hard, narrow casing fade,
  // rims stepped per segment). A quad now owns the slab between its two
  // joints' bisectors, a hair (oe) past each.
  it("pins the ownership test and the hoisted derivative", () => {
    expect(SDF_FRAG).toContain("vec2 sdfJointT(vec2 a, vec2 b, vec2 c) {");
    expect(SDF_FRAG).toContain(
      "bool own = (sA >= -oe && sB < oe) || (sA < 0.0 && sB >= 0.0 && a1 <= a0 && a1 < a2);"
    );
    expect(SDF_FRAG).toContain("if (!own) discard;");
    // fwidth only in uniform control flow: before the first discard
    expect(SDF_FRAG).not.toContain("fwidth(side01)");
    const main = SDF_FRAG.slice(SDF_FRAG.indexOf("void main(void)"));
    const firstDiscard = main.indexOf("discard;");
    let at = main.indexOf("fwidth(");
    expect(at).toBeGreaterThan(0);
    while (at >= 0) {
      expect(at).toBeLessThan(firstDiscard);
      at = main.indexOf("fwidth(", at + 1);
    }
  });

  it("leaves no hole and doubles only a hair at the joints (CPU mirror)", () => {
    type V = [number, number];
    const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
    const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
    const unit = (a: V): V => {
      const q = Math.hypot(a[0], a[1]);
      return q > 1e-7 ? [a[0] / q, a[1] / q] : [0, 0];
    };
    const jointT = (a: V, b: V, c: V): V => {
      const d0 = unit(sub(b, a));
      const d1 = unit(sub(c, b));
      const n: V = [d0[0] + d1[0], d0[1] + d1[1]];
      return Math.hypot(n[0], n[1]) > 1e-4 ? unit(n) : d1;
    };
    // an open wavy polyline, spacing 0.09 (SAMP's), radius 0.3, turns up
    // to ~30 degrees per sample
    const P: V[] = [];
    for (let i = 0; i < 60; i++) {
      const s = i * 0.09;
      P.push([s, 0.5 * Math.sin(s * 2.1) + 0.2 * Math.sin(s * 5.3)]);
    }
    const r = 0.3;
    const R = r + 0.03;
    const pxW = 0.013;
    const oe = 2e-3 * pxW + 1e-5;
    let rnd = 12345;
    const noise = () => {
      rnd = (rnd * 1103515245 + 12345) % 2147483648;
      return (rnd / 2147483648 - 0.5) * 1e-5;
    };
    const owners = (p: V): number => {
      let n = 0;
      for (let k = 0; k + 1 < P.length; k++) {
        const q: V = [p[0] + noise(), p[1] + noise()];
        const P1 = P[k];
        const P2 = P[k + 1];
        const dir = unit(sub(P2, P1));
        const L = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
        const u = dot(sub(q, P1), dir);
        const v = dot(sub(q, P1), [-dir[1], dir[0]]);
        if (u < -R || u > L + R || Math.abs(v) > R) continue; // outside the box
        const sA = k === 0 ? 1e9 : dot(sub(q, P1), jointT(P[k - 1], P1, P2));
        const sB = k + 2 >= P.length ? -1e9 : dot(sub(q, P2), jointT(P1, P2, P[k + 2]));
        if (sA >= -oe && sB < oe) n++;
      }
      return n;
    };
    // the distance to the polyline, to keep only the ribbon's pixels
    const dist = (p: V): number => {
      let best = 1e9;
      for (let k = 0; k + 1 < P.length; k++) {
        const ab = sub(P[k + 1], P[k]);
        const t = Math.max(0, Math.min(1, dot(sub(p, P[k]), ab) / dot(ab, ab)));
        best = Math.min(best, Math.hypot(p[0] - P[k][0] - t * ab[0], p[1] - P[k][1] - t * ab[1]));
      }
      return best;
    };
    let holes = 0;
    let doubles = 0;
    let inside = 0;
    for (let x = 0.4; x < 4.8; x += pxW * 1.37) {
      for (let y = -1.2; y < 1.2; y += pxW * 1.37) {
        if (dist([x, y]) > r) continue;
        inside++;
        const n = owners([x, y]);
        if (n === 0) holes++;
        if (n > 1) doubles++;
      }
    }
    expect(inside).toBeGreaterThan(10000);
    expect(holes).toBe(0);
    expect(doubles / inside).toBeLessThan(0.002);
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

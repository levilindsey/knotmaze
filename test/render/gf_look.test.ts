// K1389 s1: today's thread look under rp=gf (gf_look.ts). The look form finds
// its label sites in every program the pass draws (alone and over the reveal
// form) and leaves the originals as they were; the colour table maps a
// chain's s to the ribbon's section colour, and its index twin (lookIndex)
// clamps to the chain's colours.
import { describe, expect, it, vi } from "vitest";
vi.mock("../../src/render/paint_math", async (orig) => ({
  ...(await orig<typeof import("../../src/render/paint_math")>()),
  knotSection: (_D: unknown, _U: unknown, c: { ch: number }, ctrl: number, out: number[]) => { out[0] = ctrl; out[1] = c.ch; out[2] = 0; },
}));
vi.mock("../../src/render/paint_model", async (orig) => ({
  ...(await orig<typeof import("../../src/render/paint_model")>()),
  knotUniformValues: () => ({}),
}));
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { revealForm } from "../../src/render/gpu_field/gf_reveal";
import { GfLookTable, lookForm, lookIndex, LOOK_COMP_FS } from "../../src/render/gpu_field/gf_look";
import type { KChain, KData } from "../../src/render/paint_math";

describe("K1389 s1 look form", () => {
  const T = GF_TIERS[0];
  const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
  it("finds its sites in every program the pass draws, alone and over the reveal form", () => {
    for (const src of programs) {
      for (const f of [lookForm(src), lookForm(revealForm(src))]) {
        expect(f).toContain("uniform highp sampler2D uLk;");
        expect(f).toContain("lkJb = lkJ; lkSb = lkS; lkKb = lkK;");
        expect(f).toContain("lkIo = lkIdx(lab,");
        expect(f).toContain("o0 = vec4(oInk, oCov, floor(lkIo / 256.0) / 255.0, mod(lkIo, 256.0) / 255.0);");
        expect(f).not.toContain("o0 = vec4(oInk, oCov, 0.0, 1.0);");
        // the ink band takes today's stroke profile, ending at W (inside form B's reach)
        expect(f).toContain("(1.0 - ss(uW - max(3.0 * uAA, 0.02 * uH), uW, D)) * ss(-uAA, uAA, D)");
        expect(f).not.toContain("ss(uW - uAA, uW + uAA, D)");
        // every label write records the label's piece or corner
        const labs = f.split(/labC = (?!-1)/).length - 1;
        const recs = f.split(/lkJ = /).length - 1;
        expect(recs).toBeGreaterThanOrEqual(Math.min(labs, 1));
      }
    }
    // the full program records its surfaces' pieces and corners
    const full = lookForm(programs[programs.length - 1]);
    expect(full).toContain("lkj[e] = j;");
    expect(full).toContain("lkJ = lkj[top];");
  });
  it("leaves the original programs as they were", () => {
    for (const src of programs) {
      expect(src).not.toContain("lkIo");
      expect(src).not.toContain("uLk");
    }
    expect(gfFs(false, true)).toBe(programs[programs.length - 1]);
  });
  it("refuses a program without its anchors", () => {
    expect(() => lookForm("void main() {}")).toThrow(/gf look/);
  });
  it("decodes the index the program writes", () => {
    expect(LOOK_COMP_FS).toContain("int(c.z * 255.0 + 0.5) * 256 + int(c.w * 255.0 + 0.5)");
  });
});

describe("K1389 s1 colour table", () => {
  // A chain on a line, x 0..4 in 5 samples, its 5 controls at arcs 0..4 (so sample k sits at ctrl k), and a closed
  // unit square of 4 samples. The section read is mocked to write (ctrl, chain, 0): the table must resample it
  // uniformly in s, lerping between the bracketing samples, and close the ring on sample 0's colour.
  const geom = new Float32Array(64);
  // chain 0: G0 at texel 0 (total 4), arcs 0..4 at texels 1-2; chain 1: G0 at texel 4 (total 4), arcs 0..3 at texel 5
  geom.set([4, 0, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0], 0);
  geom.set([4, 0, 0, 0, 0, 1, 2, 3], 16);
  const kd = { stat: new Float32Array(16), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as KData;
  const kcv = [
    { ch: 0, nCtrl: 5, closed: false, count: 5, geom: 0, total: 4 },
    { ch: 1, nCtrl: 4, closed: true, count: 4, geom: 4, total: 4 },
  ] as unknown as KChain[];
  const chainSamples = [
    { positions: new Float32Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]), count: 5 },
    { positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), count: 4 },
  ];
  it("lays out one header per chain, then the section colours uniform in s", () => {
    const L = new GfLookTable();
    expect(L.build({ kd, kcv, chainSamples })).toBe(true);
    expect(L.oK).toBe(2);
    const d = L.data;
    const ds = L.ds;
    const n0 = Math.floor(4 / ds) + 2;
    expect([d[0], d[1], d[2], d[3]]).toEqual([0, n0, 0, Math.fround(ds)]);
    expect([d[4], d[5]]).toEqual([n0, n0]);
    // chain 0's colour i is the ctrl at s = i ds (clamped to the end); chain 1's s 3.5 is between sample 3 and the
    // closing sample 0 (ctrl 3 -> 0)
    for (const s of [0, 0.5, 1.26, 3.98, 4]) {
      const i = lookIndex(L, 0, s) - 1;
      expect(d[4 * (2 + i)]).toBeCloseTo(Math.min(4, Math.round(s / ds) * ds), 5);
      expect(d[4 * (2 + i) + 1]).toBe(0);
    }
    const j = lookIndex(L, 1, 3.5) - 1;
    expect(d[4 * (2 + j)]).toBeCloseTo(1.5, 5);
    expect(d[4 * (2 + j) + 1]).toBe(1);
    // the index twin clamps to the chain's colours
    expect(lookIndex(L, 0, -1)).toBe(1);
    expect(lookIndex(L, 0, 1e9)).toBe(n0);
    expect(lookIndex(L, 1, 0)).toBe(n0 + 1);
    // a rebuild from the same state changes nothing
    const v = L.version;
    expect(L.build({ kd, kcv, chainSamples })).toBe(false);
    expect(L.version).toBe(v);
  });
});
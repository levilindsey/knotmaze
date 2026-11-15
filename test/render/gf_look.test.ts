// K1389: today's thread look under rp=gf (gf_look.ts). The look form finds
// its label sites in every program the pass draws (alone and over the reveal
// form) and leaves the originals as they were. s2: the colour table is static
// (section colours by ctrl), the positions place each sample in it from the
// current arcs, and the colour twin (lookColour) lerps the segment's two
// samples and clamps to the chain's.
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
import { GfLookGate, GfLookTable, lookColour, lookForm, lookKey, LOOK_COMP_FS, LOOK_R } from "../../src/render/gpu_field/gf_look";
import type { KChain, KData } from "../../src/render/paint_math";

describe("K1389 look form", () => {
  const T = GF_TIERS[0];
  const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
  it("finds its sites in every program the pass draws, alone and over the reveal form", () => {
    for (const src of programs) {
      for (const f of [lookForm(src), lookForm(revealForm(src))]) {
        expect(f).toContain("uniform highp sampler2D uLk; uniform highp sampler2D uLkP;");
        expect(f).toContain("lkJb = lkJ; lkSb = lkS; lkKb = lkK;");
        expect(f).toContain("lkCo = lkColour(lab, lkJb >= 0 ? lookQ(lkJb, p) : lookQs(lab, lkSb));");
        // the colour rides a second target; o0 keeps (ink, coverage)
        expect(f).toContain("o0 = vec4(oInk, oCov, 0.0, 1.0); o1 = lkCo;");
        expect(f).toContain("layout(location = 0) out vec4 o0;\nlayout(location = 1) out vec4 o1;");
        expect(f).not.toMatch(/\nout vec4 o0;/);
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
      expect(src).not.toContain("lkCo");
      expect(src).not.toContain("uLk");
      expect(src).not.toContain("out vec4 o1;\n#endif");
    }
    expect(gfFs(false, true)).toBe(programs[programs.length - 1]);
  });
  it("refuses a program without its anchors", () => {
    expect(() => lookForm("void main() {}")).toThrow(/gf look/);
  });
  it("composites the colour target, a label-less fringe taking its neighbour's", () => {
    expect(LOOK_COMP_FS).toContain("vec4 k = texelFetch(uCo, q, 0);");
    expect(LOOK_COMP_FS).toContain("vec3 C = k.a > 0.0 ? k.rgb : uFill;");
  });
});

describe("K1389 s2 colour table", () => {
  // A chain on a line, x 0..4 in 5 samples, its 5 controls at arcs 0..4 (so sample k sits at ctrl k), and a closed
  // unit square of 4 samples, controls at arcs 0..3. The section read is mocked to write (ctrl, chain, 0), linear in
  // ctrl, so the table's lerp is exact and a colour reads back as its ctrl.
  const geom = new Float32Array(64);
  // chain 0: G0 at texel 0 (total 4, arcPer 1), arcs 0..4 at texels 1-2; chain 1: G0 at texel 4 (total 4, arcPer 1),
  // arcs 0..3 at texel 5
  geom.set([4, 1, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0], 0);
  geom.set([4, 1, 0, 0, 0, 1, 2, 3], 16);
  const kd = { stat: new Float32Array(16), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as KData;
  const kcv = [
    { ch: 0, nCtrl: 5, closed: false, count: 5, geom: 0, total: 4 },
    { ch: 1, nCtrl: 4, closed: true, count: 4, geom: 4, total: 4 },
  ] as unknown as KChain[];
  const chainSamples = [
    { positions: new Float32Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]), count: 5 },
    { positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), count: 4 },
  ];
  const R1 = LOOK_R + 1;
  it("lays out one header per chain, then each slot's section colours by ctrl", () => {
    const L = new GfLookTable();
    expect(L.build({ kd, kcv, chainSamples })).toBe(true);
    const d = L.data;
    // (first colour texel, first position, sample count, closed)
    expect([d[0], d[1], d[2], d[3]]).toEqual([2, 0, 5, 0]);
    expect([d[4], d[5], d[6], d[7]]).toEqual([2 + 5 * R1, 6 - 1, 4, 1]);
    expect(L.nColors).toBe(9 * R1);
    expect(L.nPos).toBe(5 + 5);
    // slot sl's texel i holds ctrl sl + i / R (the last the slot's end); an open chain stops at its last control
    for (const [sl, i] of [[0, 0], [1, 3], [2, LOOK_R], [4, 5]]) {
      const o = 4 * (2 + sl * R1 + i);
      expect(d[o]).toBeCloseTo(Math.min(4, sl + i / LOOK_R), 6);
      expect([d[o + 1], d[o + 3]]).toEqual([0, 1]);
    }
    const o = 4 * (2 + 5 * R1 + 3 * R1 + LOOK_R);
    expect(d[o]).toBeCloseTo(4, 6);
    expect(d[o + 1]).toBe(1);
    // a rebuild from the same state changes nothing, and moved arcs need no rebuild (the key reads no geometry)
    const v = L.version;
    expect(L.build({ kd, kcv, chainSamples })).toBe(false);
    expect(L.version).toBe(v);
    const k0 = lookKey({ kd, kcv, chainSamples });
    const g2 = geom.slice(); g2[5] = 0.5;
    expect(lookKey({ kd: { ...kd, geom: g2 }, kcv, chainSamples })).toBe(k0);
  });
  it("places the samples by the current arcs and lerps a segment's two colours", () => {
    const L = new GfLookTable();
    L.build({ kd, kcv, chainSamples });
    const P = L.positions({ kd, kcv, chainSamples });
    expect(Array.from(P.subarray(0, 10))).toEqual([0, R1, 2 * R1, 3 * R1, 4 * R1, 0, R1, 2 * R1, 3 * R1, 0]);
    expect(P.length % 64).toBe(0);
    const at = (c: number, k: number, u: number): number[] | null => lookColour(L, P, c, k, u);
    expect(at(0, 1, 0.25)![0]).toBeCloseTo(1.25, 6);
    expect(at(0, 1, 0.25)![1]).toBe(0);
    // the closed chain's last segment runs from sample 3 back to sample 0
    expect(at(1, 3, 0.5)![0]).toBeCloseTo(1.5, 6);
    expect(at(1, 3, 0.5)![1]).toBe(1);
    // clamped to the chain's samples
    expect(at(0, -1, 0.7)![0]).toBe(0);
    expect(at(0, 9, 0.5)![0]).toBeCloseTo(4, 6);
    // the arcs move (control 1 to arc 0.5): sample 1 (arc 1) is a third into slot 1, with no table rebuild
    const g2 = geom.slice(); g2[5] = 0.5;
    const P2 = L.positions({ kd: { ...kd, geom: g2 }, kcv, chainSamples });
    expect(lookColour(L, P2, 0, 1, 0)![0]).toBeCloseTo(1 + 1 / 3, 5);
    expect(lookColour(L, P2, 0, 0, 0.5)![0]).toBeCloseTo((0 + 1 + 1 / 3) / 2, 5);
  });
  it("indexes the field scene's kept samples (scene_export mapChain), not every sample", () => {
    // chain 0's sample 2 repeats sample 1: the pass's vertices are samples 0, 1, 3, 4, and the tail holds the end;
    // the ring's last sample repeats its first: no vertex, and the closing vertex is sample 0
    const cs2 = [
      { positions: new Float32Array([0, 0, 1, 0, 1, 0, 3, 0, 4, 0]), count: 5 },
      { positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0]), count: 4 },
    ];
    const L = new GfLookTable();
    L.build({ kd, kcv, chainSamples: cs2 });
    const P = L.positions({ kd, kcv, chainSamples: cs2 });
    expect(Array.from(P.subarray(0, 10))).toEqual([0, R1, 3 * R1, 4 * R1, 4 * R1, 0, R1, 2 * R1, 0, 0]);
    // vertex 2 (sample 3) halfway to vertex 3 (sample 4): ctrl 3.5
    expect(lookColour(L, P, 0, 2, 0.5)![0]).toBeCloseTo(3.5, 6);
  });
  it("gives a chain without controls no label", () => {
    const L = new GfLookTable();
    const kc2 = [kcv[0], { ...kcv[1], nCtrl: 0 }] as unknown as KChain[];
    L.build({ kd, kcv: kc2, chainSamples });
    const P = L.positions({ kd, kcv: kc2, chainSamples });
    expect(lookColour(L, P, 1, 0, 0)).toBeNull();
    expect(lookColour(L, P, 0, 2, 0)![0]).toBeCloseTo(2, 6);
  });
  it("lets the hash decide when the source has no revision", () => {
    const G = new GfLookGate();
    expect(G.changed({ kd, kcv, chainSamples })).toBe(true);
    expect(G.changed({ kd, kcv, chainSamples })).toBe(true);
  });
});

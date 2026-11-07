// K1040 S4a2: the band pass's tables - the parts S4a2's fixes read.
// An END arm's window reaches the extension to c' (s < 0), and a group
// surface's arms are all in the arm table under their group (the naming
// chain's distance the shader walks for a group top, R2), on a small tee
// whose end arm starts short of the through.
import { describe, expect, it } from "vitest";
import { FormB } from "../../../src/render/field/form_b";
import { buildLabelB } from "../../../src/render/field/label_b";
import { armWindowWalk } from "../../../src/render/field/label_b";
import { armReach, buildBandB } from "../../../src/render/field/band_b";
import type { FieldScene, SceneArm, SceneJunction } from "../../../src/render/field/scene";

function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return out;
}

function ray(cx: number, cy: number, deg: number, r0: number, r1: number, step = 0.2): number[] {
  const a = (deg * Math.PI) / 180;
  return line(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), step);
}

function scene(chains: number[][], junctions: SceneJunction[] = []): FieldScene {
  return {
    version: 1,
    name: "band_b.test",
    source: { kind: "synthetic", generator: "band_b.test", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: chains.map((pts, id) => ({ id, closed: false, pts, z: new Array(pts.length / 2).fill(0) })),
    crossings: [],
    junctions,
    deadEnds: [],
  };
}

function junction(c: [number, number], arms: SceneArm[]): SceneJunction {
  return { id: "j0", c, arms, corners: arms.map(() => ({ style: "round" as const, pinned: false })) };
}

// The tee of label_b.test's ramp fixture: the end arm starts 0.6 short of
// the through along 60 degrees, so form B extends its chain to c' and the
// extended part has s < 0.
function tee(): FieldScene {
  return scene(
    [line(-10, 0, 10, 0), ray(0, 0, 60, 0.6, 10)],
    [
      junction(
        [0, 0],
        [
          { chain: 0, s: 10, dir: 1, kind: "through" },
          { chain: 1, s: 0, dir: 1, kind: "end" },
          { chain: 0, s: 10, dir: -1, kind: "through" },
        ],
      ),
    ],
  );
}

describe("band B tables: an END arm's s < 0 reach (K1040 S4a2)", () => {
  const fb = new FormB(tee());
  const T = buildLabelB(fb);
  const B = buildBandB(fb, T);
  const endAi = fb.arms.findIndex((a) => a.kind === "end");

  it("form B extends the end chain to c-prime", () => {
    expect(endAi).toBeGreaterThanOrEqual(0);
    expect(fb.polys[1].s0).toBeLessThan(0);
    expect(fb.arms[endAi].sR).toBe(fb.polys[1].s0);
    // The label's point table carries the extension vertex at s0.
    expect(T.pts[4 * T.ptOff[1] + 2]).toBeCloseTo(fb.polys[1].s0, 6);
  });

  it("the arm's burial window starts at segment 0, over the extension", () => {
    const [sLo, , k0, cnt] = armWindowWalk(fb, endAi, armReach(fb, endAi));
    expect(sLo).toBe(fb.polys[1].s0);
    expect(k0).toBe(0);
    expect(cnt).toBeGreaterThan(0);
    const wins: number[][] = [];
    for (let w = 0; w < B.nWin; w++) wins.push([B.gw[8 * w], B.gw[8 * w + 1], B.gw[8 * w + 2], B.gw[8 * w + 3]]);
    expect(wins.some(([chain, wk0, , arm]) => chain === 1 && wk0 === 0 && arm === endAi)).toBe(true);
  });

  it("strips are built for the extension segment too", () => {
    let n = 0;
    for (let i = 0; i < B.nInst; i++) if (B.inst[3 * i] === 1 && B.inst[3 * i + 1] === 0) n++;
    expect(n).toBe(2);
  });
});

describe("band B tables: a group surface's arms (K1040 S4a2)", () => {
  const fb = new FormB(tee());
  const T = buildLabelB(fb);
  const B = buildBandB(fb, T);

  it("every arm of the group is in the arm table under its group, with a window", () => {
    expect(fb.nGroups).toBe(1);
    const g = 0;
    const arms = fb.arms.map((a, i) => [a, i] as const).filter(([a]) => a.g === g);
    expect(arms.length).toBe(3);
    for (const [, ai] of arms) expect(B.arm[8 * ai]).toBe(g);
    const off = B.grp[4 * g];
    const cnt = B.grp[4 * g + 1];
    expect(cnt).toBe(arms.length);
    const winArms = new Set<number>();
    for (let w = 0; w < cnt; w++) winArms.add(B.gw[8 * (off + w) + 3]);
    for (const [, ai] of arms) expect(winArms.has(ai)).toBe(true);
  });

  it("the cone key's reciprocal rides the tables for the cap mix's order", () => {
    expect(B.invK).toBeCloseTo(1 / fb.K, 15);
  });
});

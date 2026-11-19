// K1517 (26P): a near-null corner's seam fill. At a junction corner whose fillet radius is at most
// 2aa, the two arms' tubes leave the wedge between them uncovered past V (form B's fill needs
// r > 0): in the fill that wedge reads as a dark speck where the tubes nearly touch (the muse
// scenes at j64) or a pinhole where they part wider (Levi's link A). The corner fills its seam
// instead: eval / gf_glsl
// treat the corner as filling where a point is near the corner, outside both arms' tubes and the hole between them is narrower than a stroke; the sector keeps form B's reach (kRmax) untouched. They treat it as filling where it is near
// both arms' edges
// both arms' edges (seamFill / seamIn). This synthetic scene is j64's west corner in miniature: a
// through chain and an end chain leaving it nearly collinearly (r = 0.0207 at aa = 0.011), then
// curving apart.
import { describe, expect, it } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { GfEval } from "../../src/render/gpu_field/eval";
import { buildTables } from "../../src/render/gpu_field/tables";

function dense(pts: number[][], step = 0.1): { pts: number[]; len: number } {
  const out: number[] = []; let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]; const [bx, by] = pts[i + 1]; const d = Math.hypot(bx - ax, by - ay); const n = Math.max(1, Math.round(d / step));
    for (let j = 0; j < n; j++) { out.push(ax + (bx - ax) * (j / n), ay + (by - ay) * (j / n)); if (j > 0 || i > 0) len += d / n; }
    if (i === pts.length - 2) { out.push(bx, by); len += d / n; }
  }
  return { pts: out, len };
}

function seamScene(): FieldScene {
  const c0 = dense([[-4, 0.28], [4, 0.28]]);
  const c1 = dense([[-4, -0.95], [-3, -0.68], [-2, -0.48], [-1, -0.28], [0, 0.14], [0.75, 0.2], [1.5, 0.28]]);
  return {
    version: 1, name: "k1517_seam", source: { kind: "synthetic", generator: "k1517" },
    camera: { worldToCss: [10, 0, 0, -10, 0, 0], pxPerUnit: 10, dpr: 1, viewport: [160, 160] },
    look: { halfWidth: 0.26, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, ctrlArc: 0.47, paper: "#e6e9ee", ink: "#1d2330" },
    chains: [
      { id: 0, closed: false, pts: c0.pts },
      { id: 1, closed: false, pts: c1.pts },
    ],
    crossings: [],
    junctions: [{
      id: "j0", c: [1.5, 0.28], arms: [
        { chain: 0, s: 5.5, dir: 1, kind: "through" },
        { chain: 1, s: c1.len, dir: -1, kind: "end" },
        { chain: 0, s: 5.5, dir: -1, kind: "through" },
      ], corners: [{ style: "round", pinned: false }, { style: "round", pinned: false }, { style: "round", pinned: false }],
    }],
    deadEnds: [
      { chain: 0, s: 0, offscreen: true }, { chain: 0, s: c0.len, offscreen: true }, { chain: 1, s: 0, offscreen: true },
    ],
  } as unknown as FieldScene;
}

describe("K1517: a near-null corner fills its seam", () => {
  const AA = 0.011;
  const T = buildTables(seamScene(), { aa: AA });
  const E = new GfEval(T);
  const west = [...Array(T.nK).keys()].find((k) => T.kCx[k] < 0)!;

  it("the west corner is near-null, and the seam covers past form B's reach", () => {
    expect(T.kR[west]).toBeLessThanOrEqual(2 * AA);
    expect(T.kR[west]).toBeGreaterThan(0); // a grown corner, not only the r = 0 push
    const rho = Math.hypot(-1.6 - T.kCx[west], -0.06 - T.kCy[west]);
    expect(rho).toBeGreaterThan(T.kRmax[west]); // form B's fill stops short of the seam point
    expect(E.eval(-1.6, -0.06).cov).toBe(1);
  });

  it("seam points between the arms are covered, the opened eye and tube interiors are untouched", () => {
    for (const [x, y] of [[-1.6, -0.06], [-1.2, -0.02]] as const) expect(E.eval(x, y).cov, `seam (${x},${y})`).toBe(1);
    expect(E.eval(-3.4, -0.4).cov).toBe(0); // the arms have parted into an eye: background stays
    expect(E.eval(0, 0.28).cov).toBe(1); // inside the through chain's tube as before
  });
});

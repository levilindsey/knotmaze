// K868 S1b: unit tests for the field oracle's core (geometry, the ink rule
// on a straight arm, a 90° rolling-ball corner, the checks' run finder).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { edt2, runsOn } from "../../../src/render/field/checks";
import { type Cand, SegGrid, candidates, closestOnSeg, dS, footInWindow, makePoly, normS, pointAt } from "../../../src/render/field/geom";
import { FieldModel } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const scene = (name: string) => JSON.parse(readFileSync(join(__dirname, "scenes", `${name}.json`), "utf8")) as FieldScene;

describe("geom", () => {
  it("closestOnSeg clamps to the segment", () => {
    expect(closestOnSeg(5, 3, 0, 0, 10, 0)).toEqual({ t: 0.5, d2: 9 });
    expect(closestOnSeg(-2, 0, 0, 0, 10, 0).t).toBe(0);
    expect(closestOnSeg(13, 4, 0, 0, 10, 0)).toEqual({ t: 1, d2: 25 });
  });

  it("makePoly measures open and closed chains", () => {
    const open = makePoly(7, [0, 0, 3, 4, 3, 10], null, false);
    expect(open.len).toBeCloseTo(11, 12);
    const sq = makePoly(8, [0, 0, 2, 0, 2, 2, 0, 2], null, true);
    expect(sq.len).toBeCloseTo(8, 12);
    const at = pointAt(sq, 3);
    expect(at.x).toBeCloseTo(2, 12);
    expect(at.y).toBeCloseTo(1, 12);
    expect(at.tx).toBeCloseTo(0, 12);
    expect(at.ty).toBeCloseTo(1, 12);
  });

  it("normS wraps closed chains and clamps open ones; dS goes the short way", () => {
    const sq = makePoly(1, [0, 0, 2, 0, 2, 2, 0, 2], null, true);
    expect(normS(sq, 9)).toBeCloseTo(1, 12);
    expect(normS(sq, -1)).toBeCloseTo(7, 12);
    expect(dS(sq, 7, 1)).toBeCloseTo(2, 12);
    expect(dS(sq, 1, 7)).toBeCloseTo(-2, 12);
    const open = makePoly(2, [0, 0, 4, 0], null, false);
    expect(normS(open, 9)).toBe(4);
    expect(dS(open, 3, 1)).toBe(-2);
  });

  it("footInWindow finds the foot inside the window only", () => {
    const p = makePoly(3, [0, 0, 10, 0], null, false);
    const f = footInWindow(p, 4, 2, 0, 10);
    expect(f.d).toBeCloseTo(2, 12);
    expect(f.s).toBeCloseTo(4, 12);
    const g = footInWindow(p, 4, 2, 6, 10);
    expect(g.s).toBeCloseTo(6, 12);
    expect(g.d).toBeCloseTo(Math.hypot(2, 2), 12);
  });

  it("candidates are local minima of the distance, one per pass", () => {
    // A U: two parallel legs 4 apart; a point between them sees both.
    const u = makePoly(5, [0, 10, 0, 0, 4, 0, 4, 10], null, false);
    const grid = new SegGrid([u], 1, 0);
    const out: Cand[] = [];
    candidates(grid, 2, 6, 3, out);
    const ss = out.map((c) => c.s).sort((a, b) => a - b);
    expect(ss.length).toBe(2);
    expect(ss[0]).toBeCloseTo(4, 9);
    expect(ss[1]).toBeCloseTo(10 + 4 + 6, 9);
    for (const c of out) expect(c.d).toBeCloseTo(2, 9);
  });
});

describe("oracle field", () => {
  const s = scene("t90");
  const h = s.look.halfWidth;
  const W = s.look.band * h;
  const model = new FieldModel(s, { rRound: 0.5 * h });

  it("a straight arm: F = h − |y| and a band W wide on each side", () => {
    const p = model.polys[model.idxOf.get(0)!];
    const at = pointAt(p, 4);
    const nx = -at.ty;
    const ny = at.tx;
    for (const y of [0, 0.3, -0.55, 0.7, -0.95]) {
      const e = model.evalPoint(at.x + y * nx, at.y + y * ny, true);
      expect(e.inside).toBe(true);
      expect(e.F).toBeCloseTo(h - Math.abs(y), 9);
      expect(e.ink).toBe(h - Math.abs(y) <= W);
    }
    expect(model.evalPoint(at.x + 1.05 * nx, at.y + 1.05 * ny, false).inside).toBe(false);
  });

  it("a 90° round corner: V, q and the tangent points of the rolling ball", () => {
    const r = 0.5 * h;
    const c90 = model.corners.filter((c) => c.style === "round" && Math.abs(c.theta - Math.PI / 2) < 1e-6);
    expect(c90.length).toBe(1);
    const c = c90[0];
    expect(c.ok).toBe(true);
    expect(c.r).toBeCloseTo(r, 12);
    const [jx, jy] = s.junctions[c.junction].c;
    const V = [c.V[0] - jx, c.V[1] - jy];
    const q = [c.q[0] - jx, c.q[1] - jy];
    expect(Math.abs(V[0])).toBeCloseTo(h, 9);
    expect(Math.abs(V[1])).toBeCloseTo(h, 9);
    expect(q[0]).toBeCloseTo(V[0] * (h + r), 9);
    expect(q[1]).toBeCloseTo(V[1] * (h + r), 9);
    for (const t of [c.tA, c.tB]) {
      expect(Math.hypot(t[0] - c.q[0], t[1] - c.q[1])).toBeCloseTo(r, 9);
      const tx = t[0] - jx;
      const ty = t[1] - jy;
      // On one arm's outline (|x| = h or |y| = h), at q's foot.
      expect(Math.min(Math.abs(Math.abs(tx) - h), Math.abs(Math.abs(ty) - h))).toBeLessThan(1e-9);
    }
    // The ball itself is paper; just outside it, between the ball and V, ink.
    const ux = (c.V[0] - c.q[0]) / Math.hypot(c.V[0] - c.q[0], c.V[1] - c.q[1]);
    const uy = (c.V[1] - c.q[1]) / Math.hypot(c.V[0] - c.q[0], c.V[1] - c.q[1]);
    expect(model.evalPoint(c.q[0], c.q[1], false).inside).toBe(false);
    expect(model.evalPoint(c.q[0] + ux * (r - 0.02), c.q[1] + uy * (r - 0.02), false).inside).toBe(false);
    const e = model.evalPoint(c.q[0] + ux * (r + 0.05), c.q[1] + uy * (r + 0.05), true);
    expect(e.inside).toBe(true);
    expect(e.ink).toBe(true);
    expect(e.F).toBeCloseTo(0.05, 6);
  });

  it("the sharp corner meets at V with no fill", () => {
    const sharp = model.corners.filter((c) => c.style === "sharp");
    expect(sharp.length).toBe(1);
    const c = sharp[0];
    const e = model.evalPoint(c.V[0], c.V[1], true);
    expect(Math.abs(e.F)).toBeLessThan(1e-6);
  });
});

describe("checks", () => {
  it("runsOn bisects exact run ends", () => {
    const probe = { exact: true, label: "t", cov: (x: number) => (Math.abs(x - 1) <= 0.25 || Math.abs(x - 2.5) <= 0.1 ? 1 : 0) };
    const runs = runsOn(probe, (t) => [t, 0], 0, 4, 0.07);
    expect(runs.length).toBe(2);
    expect(runs[0][0]).toBeCloseTo(0.75, 8);
    expect(runs[0][1]).toBeCloseTo(1.25, 8);
    expect(runs[1][0]).toBeCloseTo(2.4, 8);
    expect(runs[1][1]).toBeCloseTo(2.6, 8);
  });

  it("edt2 gives exact Euclidean distances on a grid", () => {
    const nx = 9;
    const ny = 7;
    const mask = new Uint8Array(nx * ny).fill(1);
    mask[3 * nx + 4] = 0;
    const D = edt2(mask, nx, ny);
    expect(D[3 * nx + 4]).toBe(0);
    expect(D[0]).toBe(16 + 9);
    expect(D[6 * nx + 8]).toBe(16 + 9);
    expect(D[3 * nx + 7]).toBe(9);
  });
});

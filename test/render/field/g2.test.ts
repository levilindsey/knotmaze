// K868 S2 step 3: the G2 corner candidates (§3.7) in the CPU oracle.
// Clothoid pair and quintic Bézier: curvature continuous at both joins,
// tangent to both sides without crossing them, one-hump combs, and sized
// either to G1's apex inset or to G1's tangent points. The arc spline:
// built on straight symmetric corners, with its curvature steps reported.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { oracleProbe, runChecks } from "../../../src/render/field/checks";
import { type CornerEnd, bezier5, humpFall } from "../../../src/render/field/g2";
import { FieldModel, type OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const scene = (name: string) => JSON.parse(readFileSync(join(__dirname, "scenes", `${name}.json`), "utf8")) as FieldScene;

/** §3.8's proposed r: master's mapping, capped at 2h. */
const rule =
  (h: number, cr: number): OracleParams["rOf"] =>
  (_j, _i, theta, style) =>
    style === "round" ? Math.min(2 * h, h * Math.max(0, 1.25 * cr * Math.tan(theta / 2) - 0.97)) : 0;

// Clearance slack: the oracle's sides are offsets of polylines, which sit
// inside the true curve by the chord sag ds²/(8R) (0.0023h on tight_curve);
// a curve that matches the true side's curvature dips below the chord by
// up to that much. Measured worst: tight_curve's clothoid pair at 0.0061h
// (2.6x the chord sag; the rest is not attributed), so the slack is 0.01h.
const SAG = 0.01;

describe("G2 corners", () => {
  it("clothoid and quintic: G2 joins, no crossing, one hump, both sizings", { timeout: 120_000 }, () => {
    for (const name of ["t90", "y120", "acute30", "curved", "tight_curve"]) {
      const s = scene(name);
      const h = s.look.halfWidth;
      for (const kind of ["clothoid", "bezier5"] as const)
        for (const size of ["inset", "tangent"] as const) {
          const m = new FieldModel(s, { rRound: 0, rOf: rule(h, s.look.cuspRadius), webCap: 1.5 * h, cornerCurve: kind, cornerSize: size });
          const tag = `${name} ${kind}/${size}`;
          expect(m.diagnostics, tag).toEqual([]);
          let built = 0;
          for (const c of m.corners) {
            if (c.r <= 0) continue;
            const g = c.g2!;
            expect(g.ok, `${tag}: ${g.note}`).toBe(true);
            built++;
            expect(g.jumpA * h, tag).toBeLessThanOrEqual(0.01);
            expect(g.jumpB * h, tag).toBeLessThanOrEqual(0.01);
            expect(g.clearA / h, tag).toBeGreaterThan(-SAG);
            expect(g.clearB / h, tag).toBeGreaterThan(-SAG);
            expect(g.humpFall * h, tag).toBeLessThanOrEqual(1e-9);
            // Straight sides match G1's inset exactly; on curved polyline
            // sides inset(σ) steps where an end crosses a vertex (the
            // side's tangent turns by ds/R), up to 0.022h on curved.
            if (size === "inset") expect(Math.abs(g.inset - g.insetG1) / h, tag).toBeLessThan(name.includes("curve") ? 0.03 : 1e-6);
            else expect(g.sigma, tag).toBe(0);
          }
          expect(built, tag).toBeGreaterThan(0);
          for (const r of runChecks(m, oracleProbe(m))) expect(r.status, `${tag} #${r.id} ${r.value}`).not.toBe("fail");
        }
    }
  });

  it("the arc spline builds on straight symmetric corners and reports its steps", () => {
    for (const name of ["t90", "y120", "acute30"]) {
      const s = scene(name);
      const h = s.look.halfWidth;
      const m = new FieldModel(s, { rRound: 0, rOf: rule(h, s.look.cuspRadius), webCap: 1.5 * h, cornerCurve: "arcs3", cornerSize: "tangent" });
      for (const c of m.corners) {
        if (c.r <= 0) continue;
        const g = c.g2!;
        expect(g.ok, name).toBe(true);
        // Four equal steps of κ_m/2: the two joins and the two inside.
        expect(g.curve.steps.length).toBe(2);
        expect(g.curve.steps[0]).toBeCloseTo(g.curve.steps[1], 9);
        expect(g.jumpA).toBeCloseTo(g.curve.steps[0], 6);
        expect(g.peak).toBeCloseTo(2 * g.curve.steps[0], 6);
      }
    }
  });

  it("the quintic's λ gives one hump at every turn", () => {
    for (const td of [-20, -45, -90, -120, -150, -160]) {
      const t = (td * Math.PI) / 180;
      const a: CornerEnd = { p: [0, 0], t: [1, 0], k: 0 };
      const b: CornerEnd = { p: [1 + Math.cos(t), Math.sin(t)], t: [Math.cos(t), Math.sin(t)], k: 0 };
      const c = bezier5(a, b);
      expect(c.ok).toBe(true);
      expect(humpFall(c, -1), `${td}`).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(c.k[0])).toBeLessThan(1e-9);
      expect(Math.abs(c.k[c.k.length - 1])).toBeLessThan(1e-9);
    }
  });
});

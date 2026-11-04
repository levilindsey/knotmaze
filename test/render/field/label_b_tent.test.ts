// K1040 S3c: the tent pass's pins. The pass must keep the two properties it
// exists for (a fragment shader with no discard and no gl_FragDepth, depth
// from the vertex shader), and its facets must keep the chord error the
// census was measured at. The pixel census itself is a GPU probe
// (.claude/probes/K1040/s3/s3.mjs verdict --tent 1).
import { describe, expect, it } from "vitest";
import { tentBalanced, tentFacetK, tentFacets } from "../../../src/render/field/label_b_tent";
import { labelBTentSources, TENT_NC, TENT_NF, TENT_NW } from "../../../src/render/field/label_b_tent_glsl";

/** GLSL with its comments removed. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("tent sources", () => {
  for (const dbg of [false, true]) {
    const S = labelBTentSources(dbg);
    it(`no discard, no gl_FragDepth (debugOut ${dbg})`, () => {
      for (const src of [S.segVs, S.capVs, S.fillVs, S.fs]) {
        expect(code(src)).not.toMatch(/\bdiscard\b/);
        expect(code(src)).not.toMatch(/\bgl_FragDepth\b/);
      }
    });
    it(`every vertex shader writes depth through gl_Position (debugOut ${dbg})`, () => {
      for (const src of [S.segVs, S.capVs, S.fillVs]) expect(code(src)).toMatch(/gl_Position\s*=/);
    });
  }
});

/** The vertex radii along an arc cut into n chords: the ends at rad, the rest balanced. */
function radii(rad: number, d: number, n: number): number[] {
  const rb = tentBalanced(rad, d);
  return Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === n ? rad : rb));
}

/** The deepest point inside the arc of the chord from (r0, angle 0) to (r1, angle d). */
function inward(rad: number, r0: number, r1: number, d: number): number {
  const ax = r0, ay = 0, bx = r1 * Math.cos(d), by = r1 * Math.sin(d);
  const ex = bx - ax, ey = by - ay;
  const t = Math.min(1, Math.max(0, -(ax * ex + ay * ey) / (ex * ex + ey * ey)));
  return rad - Math.hypot(ax + t * ex, ay + t * ey);
}

describe("tent facets", () => {
  it("uFacetK is 0.25 / sqrt(eps)", () => {
    expect(tentFacetK(0.01)).toBeCloseTo(2.5, 12);
    expect(tentFacetK(1e-4)).toBeCloseTo(25, 10);
  });

  it("the count is the smallest n whose chords meet eps, clamped to [1, nmax]", () => {
    for (const eps of [1e-4, 1e-3, 4e-3])
      for (const rad of [0.05, 0.3, 1, 2.5])
        for (const ang of [1e-3, 0.05, 0.4, 1.2, Math.PI / 2, Math.PI])
          for (const nmax of [TENT_NW, TENT_NF, TENT_NC]) {
            const n = tentFacets(ang, rad, tentFacetK(eps), nmax);
            const x = ang * Math.sqrt(rad) * tentFacetK(eps);
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(1);
            expect(n).toBeLessThanOrEqual(nmax);
            if (n > 1 && n < nmax) {
              expect(n - 1).toBeLessThan(x);
              expect(n).toBeGreaterThanOrEqual(x);
            }
          }
  });

  it("an unclamped arc's chords stay within eps outside, 2 eps inside, eps for interior chords", () => {
    let worstEnd = 0;
    for (const eps of [1e-4, 1e-3, 4e-3])
      for (const rad of [0.3, 1, 2.5])
        for (const ang of [0.05, 0.4, 1.2, Math.PI / 2, Math.PI]) {
          const n = tentFacets(ang, rad, tentFacetK(eps), 4096);
          const d = ang / n;
          const R = radii(rad, d, n);
          const tol = eps * (1 + eps / rad) + 1e-12;
          const rb = tentBalanced(rad, d);
          // Balanced: a vertex is outside by what a chord's middle is inside.
          expect(rb - rad).toBeCloseTo(rad * Math.tan(d / 4) ** 2, 12);
          expect(rad - rb * Math.cos(d / 2)).toBeCloseTo(rad * Math.tan(d / 4) ** 2, 12);
          for (const r of R) expect(r - rad).toBeLessThanOrEqual(tol);
          for (let i = 0; i < n; i++) {
            const dip = inward(rad, R[i], R[i + 1], d);
            const end = i === 0 || i === n - 1;
            expect(dip).toBeLessThanOrEqual((end ? 2 : 1) * tol);
            if (end && n > 1) worstEnd = Math.max(worstEnd, dip / eps);
          }
        }
    // An end chord (from the radius-rad corner to a balanced vertex) dips
    // about 1.5 eps: the bound the census's 0.003-0.01 px bucket rests on.
    expect(worstEnd).toBeGreaterThan(1.2);
    expect(worstEnd).toBeLessThan(1.6);
  });
});

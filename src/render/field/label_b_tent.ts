// K1040 S3c: the tent pass's facet math, shared by the pass (its uFacetK
// uniform) and the pins (test/render/field/label_b_tent.test.ts). The vertex
// shader (label_b_tent_glsl.ts) computes the same counts and radii in GLSL.
//
// An arc of angle ang at radius rad is cut into n chords. Interior vertices
// sit at the BALANCED radius 2 rad / (1 + cos(d / 2)), d = ang / n, so each
// chord's midpoint lies as far inside the arc as its ends lie outside:
// the error is rad tan^2(d / 4) both ways, about rad d^2 / 16. The count is
// the smallest n with that error under eps: d = 4 sqrt(eps / rad), so
// n = ceil(ang sqrt(rad) facetK), facetK = 0.25 / sqrt(eps), clamped to
// [1, nmax]. The end vertices of a segment's wedge or a fill's rays sit at
// rad exactly (they share the quad's corners), so the two end chords dip
// inside by up to about 1.5 eps instead.

/** The uFacetK uniform for a chord error target eps (world units). */
export function tentFacetK(eps: number): number {
  return 0.25 / Math.sqrt(Math.max(eps, 1e-30));
}

/** The facet count the shader's facets() computes. */
export function tentFacets(ang: number, rad: number, facetK: number, nmax: number): number {
  return Math.trunc(Math.min(Math.max(Math.ceil(ang * Math.sqrt(Math.max(rad, 0)) * facetK), 1), nmax));
}

/** The balanced vertex radius for chords of angle d on an arc of radius rad. */
export function tentBalanced(rad: number, d: number): number {
  return (2 * rad) / (1 + Math.cos(0.5 * d));
}

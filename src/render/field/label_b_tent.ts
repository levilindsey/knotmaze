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

/** The tables tentSpanRecord reads (label_b.ts's LabelBTables). */
export interface TentSpanTables {
  nChains: number;
  pts: Float32Array;
  chain: Float32Array;
  span: Float32Array;
}

/**
 * K1040 S3d, the vertex-light tent's table "ps": per point j (pts' texel j)
 * the span holding its s, found as S3c's vertex shader's spanAt finds it
 * (label_b_tent_glsl.ts: at most 16 halvings over the chain's spans, sorted
 * by lo, the comparison lo <= s on the same float32 values), as (index, code,
 * the next span's lo or fround(1e30), 0). A span texel past the table reads 0
 * here; the GPU's out-of-range texelFetch is undefined (no chain has 0 spans).
 */
export function tentSpanRecord(T: TentSpanTables, out?: Float32Array): Float32Array {
  const ps = out && out.length === T.pts.length ? out : new Float32Array(T.pts.length);
  const { pts, chain, span } = T;
  const at = (i: number) => (i < span.length ? span[i] : 0);
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = chain[8 * ci];
    const n = chain[8 * ci + 1];
    const so = chain[8 * ci + 6];
    const ns = chain[8 * ci + 7];
    for (let j = off; j < off + n; j++) {
      const s = pts[4 * j + 2];
      let lo = 0;
      let hi = ns - 1;
      for (let it = 0; it < 16; it++) {
        if (lo >= hi) break;
        const mid = (lo + hi + 1) >> 1;
        if (at(4 * (so + mid)) <= s) lo = mid;
        else hi = mid - 1;
      }
      ps[4 * j] = lo;
      ps[4 * j + 1] = Math.trunc(at(4 * (so + lo) + 1));
      ps[4 * j + 2] = lo + 1 < ns ? at(4 * (so + lo + 1)) : 1e30;
      ps[4 * j + 3] = 0;
    }
  }
  return ps;
}

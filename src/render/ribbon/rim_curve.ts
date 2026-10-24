// K859 (curves research §3.2): the wedge rim's curve between two
// flank tips, extracted from joinery so it can be unit-tested.
//
// Two branches, both pre-K859 behaviour, pinned by tests:
// - Corner-projection cubic (K846): end controls along each tip's
//   own tangent, lengths 0.62 x the corner's projection on the
//   tangent. G1 at both tips - but it fires only when the corner
//   (the edge lines' intersection) lies BEYOND both tips along
//   their tangents, which at cuspRadius 3 means wedges narrower
//   than ~29 degrees or unusually short reaches. Measured on the
//   frozen seed-3 maze (.claude/probes/K859/fallback_count.mjs):
//   the projection is negative on at least one side at 392 of 392
//   wedges - the cubic is nearly dead code.
// - Quadratic through the corner (the de-facto rim): traces the
//   corridor-union outline through the edge-line intersection.
//   Its end tangents point at the corner, so the join at each tip
//   is G0, not G1 - softened in practice by the fan's solid rim
//   band straddling the line (K854).
//
// A tangent-Hermite replacement for the quadratic (arc-fit control
// lengths, G1 by construction) was tried in K859 and measured
// WORSE: its outward bulge overshoots into neighbouring threads
// at tight junctions (.claude/probes/K857/out old_site1 vs
// k859_site1) and churned 163k px on the frozen maze. It stays
// out. The next candidate for a G1-everywhere rim is a biarc
// through the corner region; this function is its seam.
export interface RimCurve {
  // Interior points only (i = 1..n-1), [x0, y0, x1, y1, ...].
  pts: number[];
  // True when the corner projection failed on a side and the
  // quadratic-through-corner branch produced the curve.
  fellBack: boolean;
}

export function rimCurvePoints(
  ax: number,
  ay: number,
  tanAx: number,
  tanAy: number,
  bx: number,
  by: number,
  tanBx: number,
  tanBy: number,
  cx: number,
  cy: number,
  n: number
): RimCurve {
  const projA = (cx - ax) * tanAx + (cy - ay) * tanAy;
  const projB = (cx - bx) * tanBx + (cy - by) * tanBy;
  const dA = projA > 0 ? projA * 0.62 : 0;
  const dB = projB > 0 ? projB * 0.62 : 0;
  const pts: number[] = [];
  if (dA > 1e-6 && dB > 1e-6) {
    const c1x = ax + tanAx * dA;
    const c1y = ay + tanAy * dA;
    const c2x = bx + tanBx * dB;
    const c2y = by + tanBy * dB;
    for (let i = 1; i < n; i++) {
      const q = i / n;
      const u = 1 - q;
      const m0 = u * u * u;
      const m1 = 3 * u * u * q;
      const m2 = 3 * u * q * q;
      const m3 = q * q * q;
      pts.push(
        m0 * ax + m1 * c1x + m2 * c2x + m3 * bx,
        m0 * ay + m1 * c1y + m2 * c2y + m3 * by
      );
    }
    return { pts, fellBack: false };
  }
  for (let i = 1; i < n; i++) {
    const q = i / n;
    const u = 1 - q;
    pts.push(
      u * u * ax + 2 * u * q * cx + q * q * bx,
      u * u * ay + 2 * u * q * cy + q * q * by
    );
  }
  return { pts, fellBack: true };
}

// K115 stage 9: the authoring form of a glyph path. A knot is a point the
// curve passes through with a primitive integer tangent and two integer
// handle multipliers; consecutive knots make one cubic:
//   P0 = A, P1 = A + dirOut(A) * A.hout, P2 = B - dirIn(B) * B.hin, P3 = B.
// A joint is G1 exact by construction (both handles are positive multiples
// of the same primitive vector) unless the knot names a second, outgoing
// direction: a CORNER, allowed only at a spur's junction.

import type { Pt } from "./glyph_types";

/** [x, y, dx, dy, hin, hout] or, at a corner, [..., dx2, dy2]. */
export type Knot =
  | readonly [number, number, number, number, number, number]
  | readonly [number, number, number, number, number, number, number, number];

export function knotsToPath(knots: readonly Knot[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < knots.length; i++) {
    const k = knots[i];
    if (i === 0) out.push([k[0], k[1]]);
    if (i + 1 >= knots.length) break;
    const n = knots[i + 1];
    const odx = k.length === 8 ? k[6] : k[2];
    const ody = k.length === 8 ? k[7] : k[3];
    out.push([k[0] + odx * k[5], k[1] + ody * k[5]]);
    out.push([n[0] - n[2] * n[4], n[1] - n[3] * n[4]]);
    out.push([n[0], n[1]]);
  }
  return out;
}

/** A straight segment as a cubic (thirds), integer when the run divides. */
export function line(a: Pt, b: Pt): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return [
    [a[0], a[1]],
    [a[0] + Math.round(dx / 3), a[1] + Math.round(dy / 3)],
    [b[0] - Math.round(dx / 3), b[1] - Math.round(dy / 3)],
    [b[0], b[1]],
  ];
}

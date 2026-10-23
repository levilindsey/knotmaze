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

/**
 * K831 follow-up: a dot (the i's tittle) as a closed ellipse loop from
 * its centre and two half-axis vectors - the dedicated dot-drawing
 * function, so a dot is never authored as a pretend segment. A ring
 * of points around the ellipse: the first form's four-corner square put
 * so few nodes on the loop that the renderer's spline through them,
 * under a stroke wider than the loop, drew lobes at the corners (an
 * irregular nobbly blob, not a dot). At dot size the stroke fills the
 * loop solid, so the loop's own figure is the dot's figure.
 */
export function dotLoop(c: Pt, a: Pt, b: Pt): Pt[] {
  // The twelve unit-circle directions as literals: src/core stays free
  // of implementation-approximated math (K108), and the dot's figure is
  // identical on every engine.
  const H = 0.8660254037844386; // sqrt(3)/2
  const Q = 0.9659258262890683; // cos(15 deg)
  const S = 0.25881904510252074; // sin(15 deg)
  const D = 0.7071067811865476; // sqrt(2)/2
  const RING: readonly Pt[] = [
    [1, 0], [Q, S], [H, 0.5], [D, D], [0.5, H], [S, Q],
    [0, 1], [-S, Q], [-0.5, H], [-D, D], [-H, 0.5], [-Q, S],
    [-1, 0], [-Q, -S], [-H, -0.5], [-D, -D], [-0.5, -H], [-S, -Q],
    [0, -1], [S, -Q], [0.5, -H], [D, -D], [H, -0.5], [Q, -S],
  ];
  const N = RING.length;
  const cs: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const [co, si] = RING[i];
    cs.push([
      c[0] + a[0] * co + b[0] * si,
      c[1] + a[1] * co + b[1] * si,
    ]);
  }
  const out: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const seg = line(cs[i], cs[(i + 1) % N]);
    for (let j = i === 0 ? 0 : 1; j < seg.length; j++) out.push(seg[j]);
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

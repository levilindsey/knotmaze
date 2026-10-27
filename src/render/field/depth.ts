// K868 S2: depth from the diagram (K868_field_border.md §3.3).
//
// Each crossing in the scene's table pins its two passes at the crossing's
// arc length on each chain: z = +amp on the over pass, −amp on the under.
// Along a chain every pin carries a hat, 1 at the pin and falling linearly
// to 0 over a window that is, on each side, min(win, the gap to the
// neighbouring pin on that side); z is the sum of the signed hats. So:
// - z is exact at every pin: a neighbour's hat is 0 there, since its window
//   toward the pin is at most the gap;
// - two pins closer than win are joined by a straight line (linear
//   interpolation: no dip toward 0 between two overs, a straight ramp from
//   over to under);
// - a pin whose neighbours are at least win away keeps the physics tent
//   (amp at the pin, 0 at win, as particle_system.ts addDepthTent); between
//   win and 2·win the two tents overlap and sum, as physics sums them, and
//   each pin is still exact;
// - z is continuous along the chain and continuous in the pins' positions
//   (a window shrinks continuously as a neighbour comes within win), so a
//   crossing sliding along a chain never makes the depth pop.
// Only the two pins bracketing s matter: no hat reaches past a neighbour.

export interface DepthPin {
  s: number;
  z: number;
}

export interface DepthChain {
  closed: boolean;
  /** Arc length range [s0, s0 + len] (a closed chain wraps). */
  s0: number;
  len: number;
  /** Sorted by s, normalised into [s0, s0 + len). */
  pins: DepthPin[];
}

function hat(z: number, d: number, w: number): number {
  if (w <= 1e-12) return d <= 0 ? z : 0;
  return d >= w ? 0 : z * (1 - d / w);
}

/** Diagram depth at arc length s on a chain; win is the tent window in arc length. */
export function diagramDepth(c: DepthChain, win: number, s: number): number {
  const P = c.pins;
  const n = P.length;
  if (n === 0) return 0;
  let u = s;
  if (c.closed) {
    u = (s - c.s0) % c.len;
    if (u < 0) u += c.len;
    u += c.s0;
  }
  // Largest i with P[i].s <= u (−1 if none).
  let lo = -1;
  let hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (P[m].s <= u) lo = m;
    else hi = m;
  }
  if (c.closed) {
    const iL = lo < 0 ? n - 1 : lo;
    const sL = lo < 0 ? P[iL].s - c.len : P[iL].s;
    const iR = lo + 1 >= n ? 0 : lo + 1;
    const sR = lo + 1 >= n ? P[iR].s + c.len : P[iR].s;
    const w = Math.min(win, sR - sL);
    return hat(P[iL].z, u - sL, w) + hat(P[iR].z, sR - u, w);
  }
  if (lo < 0) return hat(P[0].z, P[0].s - u, win);
  if (lo + 1 >= n) return hat(P[n - 1].z, u - P[n - 1].s, win);
  const w = Math.min(win, P[lo + 1].s - P[lo].s);
  return hat(P[lo].z, u - P[lo].s, w) + hat(P[lo + 1].z, P[lo + 1].s - u, w);
}

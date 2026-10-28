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
  /** K922 (plateauDepth): the plateau's length before and after s, the
   * pass's overlap reach (default 0: today's hat). */
  rL?: number;
  rR?: number;
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

// K922 depth "overlap": the same blend with each pin's value held over a
// plateau, its pass's overlap reach (how far along the chain its tube still
// overlaps the crossing's other pass, OracleParams.depth "overlap"), so a
// crossing's over pass lies above its under pass over the whole overlap
// instead of only near the pin (the tent reaches 0 at win, about 1.4h, while
// a 30° crossing's overlap reaches 3.7h along each pass). The tents fall
// from the plateau edges, over min(win, the gap left between the two
// plateaus), so z is still exact on every plateau, continuous, and straight
// between two plateaus closer than win. Facing plateaus of opposite sign
// shrink in proportion to leave at least rho between them (a ramp, never a
// step, so two chains never tie along a stretch); with rho = win a pair of
// opposite pins closer than win (a twist eye) keeps today's straight ramp.
// Same-sign plateaus that meet merge. With every reach 0 this is
// diagramDepth.

function trap(z: number, d: number, r: number, w: number): number {
  if (d <= r) return z;
  return hat(z, d - r, w);
}

function pairDepth(zL: number, sL: number, aL: number, zR: number, sR: number, aR: number, u: number, win: number, rho: number): number {
  const g = sR - sL;
  let a = aL;
  let b = aR;
  if (zL === zR) {
    if (a + b >= g) return zL;
  } else if (a + b > 0) {
    const k = Math.min(1, Math.max(0, g - rho) / (a + b));
    a *= k;
    b *= k;
  }
  const w = Math.min(win, g - a - b);
  return trap(zL, u - sL, a, w) + trap(zR, sR - u, b, w);
}

/** K922: diagramDepth with plateaus (DepthPin.rL, rR); rho is the least ramp between opposite plateaus. */
export function plateauDepth(c: DepthChain, win: number, s: number, rho: number): number {
  const P = c.pins;
  const n = P.length;
  if (n === 0) return 0;
  let u = s;
  if (c.closed) {
    u = (s - c.s0) % c.len;
    if (u < 0) u += c.len;
    u += c.s0;
  }
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
    if (n === 1) return trap(P[0].z, Math.min(u - sL, sR - u), Math.max(P[0].rL ?? 0, P[0].rR ?? 0), Math.min(win, c.len / 2));
    return pairDepth(P[iL].z, sL, P[iL].rR ?? 0, P[iR].z, sR, P[iR].rL ?? 0, u, win, rho);
  }
  if (lo < 0) return trap(P[0].z, P[0].s - u, P[0].rL ?? 0, win);
  if (lo + 1 >= n) return trap(P[n - 1].z, u - P[n - 1].s, P[n - 1].rR ?? 0, win);
  return pairDepth(P[lo].z, P[lo].s, P[lo].rR ?? 0, P[lo + 1].z, P[lo + 1].s, P[lo + 1].rL ?? 0, u, win, rho);
}

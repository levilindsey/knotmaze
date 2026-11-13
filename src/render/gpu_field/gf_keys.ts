// K1362 s6: KEYS PER BIN. A piece's keys (gf_glsl.ts depth() and member()) searched every pin and looped over every
// arm of the piece's chain: def's chains carry 26.5 pins and 15.6 arms per segment on average, and member() fetched
// two texels per arm, twice. This splits each chain's s range into bins and gives each bin
//   - pin search bounds (lo, hi) for depth()'s binary search, and
//   - the arms that can pass member()'s tests anywhere in the bin, in the chain's arm order.
// A pure function of GfTables (gf_pack.ts packs it; gf_pass.ts builds it at upload).
//
// Exact by construction: the program still runs the same tests on the same texel values, over a superset of the
// arms that pass them (kept in the original order, so loop 1's tie rule picks the same arm; loop 2 takes a min), and
// starts its search from bounds that hold the search's invariant (pin[lo] <= u < pin[hi]) for every u the bin can
// see, so it ends on the same pin. Every bound is taken over the bin widened by half a bin on each side (the program
// picks the bin in float32), the outer bins of an open chain reach to infinity, and every value is compared as the
// float32 the texture holds.

import type { GfTables } from "./tables";

/** Bins per pin + arm on a chain, and the most bins a chain gets. */
export const GF_KEY_DENSITY = 2;
export const GF_KEY_BINS_MAX = 2048;
/** The program's BIGT: an arm with Lcut at or past it has no ramp (member()'s loop 2 skips it). */
const BIGT = 1e29;

export interface GfKeys {
  /** Per chain: first bin, bin count, bin width, s origin (float32 values; the program's u0 and bw). */
  kc: Float64Array;
  /** Per bin: pin search lo, hi (chain-relative), first candidate, candidate count. */
  kb: Float64Array;
  nB: number;
  /** Candidate arms (global arm indices), each bin's run in arm order. */
  ka: Int32Array;
  nKA: number;
}

const f = Math.fround;

export function buildKeys(T: GfTables): GfKeys {
  const lam = f(T.h);
  const nbOf = new Int32Array(T.nC);
  let nB = 0;
  for (let c = 0; c < T.nC; c++) {
    const len = f(T.cLen[c]);
    const scale = Math.abs(f(T.cS0[c])) + len;
    let nb = Math.max(1, Math.min(GF_KEY_BINS_MAX, Math.ceil(GF_KEY_DENSITY * (T.cPinN[c] + T.cArmN[c]))));
    // a bin stays wide against float32's resolution of u (the program's bin pick is off by far less than half a bin)
    if (len > 0) nb = Math.max(1, Math.min(nb, Math.floor(len / (1e-4 * scale + 1e-9))));
    else nb = 1;
    nbOf[c] = nb; nB += nb;
  }
  const kc = new Float64Array(4 * T.nC);
  const kb = new Float64Array(4 * nB);
  let ka = new Int32Array(Math.max(16, 4 * nB));
  let nKA = 0;
  let b0 = 0;
  for (let c = 0; c < T.nC; c++) {
    const nb = nbOf[c];
    const closed = T.cClosed[c] > 0.5;
    const len = f(T.cLen[c]);
    const u0 = f(T.cS0[c]);
    const bw = len > 0 && nb > 1 ? f(len / nb) : f(Math.max(len, 1));
    kc[4 * c] = b0; kc[4 * c + 1] = nb; kc[4 * c + 2] = bw; kc[4 * c + 3] = u0;
    const scale = Math.abs(u0) + len;
    const mD = 1e-4 * scale + 1e-6;
    // pins as the texture holds them (sorted: buildTables emits them in s order)
    const n = T.cPinN[c];
    const pins = new Float64Array(n);
    for (let i = 0; i < n; i++) pins[i] = f(T.pinS[T.cPin0[c] + i]);
    // each arm's s set that can pass member()'s tests: [a, b], or all
    const a0 = T.cArm0[c]; const an = T.cArmN[c];
    const aLo = new Float64Array(an); const aHi = new Float64Array(an); const aAll = new Uint8Array(an);
    for (let q = 0; q < an; q++) {
      const i = a0 + q;
      const dir = f(T.aDir[i]); const sR = f(T.aSR[i]); const L = f(T.aL[i]);
      const Lc = T.aLcut[i] === Infinity ? 1e30 : f(T.aLcut[i]);
      // loop 1: d in [-1e-12, L + 1e-12]; loop 2: d in (Lc - lam, 1e-12) when Lc < BIGT
      const dLo = Math.min(0, Lc < BIGT ? Lc - lam : 0) - mD;
      const dHi = Math.max(L, 0) + mD;
      if ((dir !== 1 && dir !== -1) || !(dHi - dLo < (closed ? len : Infinity))) { aAll[q] = 1; continue; }
      aLo[q] = dir > 0 ? sR + dLo : sR - dHi;
      aHi[q] = dir > 0 ? sR + dHi : sR - dLo;
    }
    for (let bi = 0; bi < nb; bi++) {
      // the u range this bin can see (half a bin of slack each side; an open chain's outer bins are unbounded)
      let ua = u0 + bw * (bi - 0.5); let ub = u0 + bw * (bi + 1.5);
      if (bi === 0) ua = closed ? u0 - bw : -Infinity;
      if (bi === nb - 1) ub = closed ? u0 + len + bw : Infinity;
      // depth(): lo = the last pin at or below ua (-1), hi = the first pin above ub (n)
      let lo = -1; while (lo + 1 < n && pins[lo + 1] <= ua) lo++;
      let hi = n; while (hi - 1 > lo && pins[hi - 1] > ub) hi--;
      // member(): the arms whose s set meets [ua, ub] (closed: on the circle)
      const k0 = nKA;
      for (let q = 0; q < an; q++) {
        let hit = aAll[q] === 1;
        if (!hit) {
          if (!closed) hit = aLo[q] <= ub && aHi[q] >= ua;
          else if (!(Number.isFinite(ua) && Number.isFinite(ub)) || ub - ua >= len) hit = true;
          else hit = Math.ceil((aLo[q] - ub) / len) <= Math.floor((aHi[q] - ua) / len);
        }
        if (!hit) continue;
        if (nKA === ka.length) { const g = new Int32Array(2 * ka.length); g.set(ka); ka = g; }
        ka[nKA++] = a0 + q;
      }
      const t = 4 * (b0 + bi);
      kb[t] = lo; kb[t + 1] = hi; kb[t + 2] = k0; kb[t + 3] = nKA - k0;
    }
    b0 += nb;
  }
  return { kc, kb, nB, ka, nKA };
}

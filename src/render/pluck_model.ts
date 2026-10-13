// RENDER-ONLY PLUCK MODEL (pure: no pixi, no renderer state). Taps and auto
// plucks never touch the physics; they draw a "time-exposure string" over
// the plucked thread instead (render/pluck_overlay.ts draws it). This file
// is the math that look is built from, unit-tested in
// test/render/pluck_model.test.ts.
//
// THE IDEAL PLUCKED STRING (Russell, "The Plucked Fixed-Fixed String";
// d'Alembert). A string of length 1 pulled into a triangle with its apex
// at beta and released from rest moves as two half-height copies of that
// triangle travelling in opposite directions (the odd, period-2 extension
// of the initial shape). Over a period it sweeps a PARALLELOGRAM: bounded
// above by the plucked triangle tri_beta and below by the inverted mirror
// triangle -tri_(1-beta). Its fundamental's amplitude is a1(beta). Real
// strings lose their overtones first, so the swept region rounds from the
// parallelogram into the fundamental's sine LENS within ~0.1 s (q below:
// 1 = all overtones, 0 = fundamental only) while the whole thing decays
// on the voice's clock.
//
// WHAT THE EYE SEES: a string ringing at 100-1400 Hz is far above any
// display's Nyquist rate, so under steady light it reads as the envelope
// of its positions - a translucent spindle, densest at the turning points,
// because a sinusoid spends most of its time near its extremes (the
// ARCSINE dwell density). The fragment shader computes that time-averaged
// coverage exactly per pixel (coverage() below is its CPU twin); a faint
// STROBE GHOST - one crisp copy of the instantaneous string, jumping to a
// new phase ~60 times a second - carries the speed. Nothing aliases: the
// blur has no frequency, and the ghost is decorrelated frame to frame.
//
// NODES AND LOBES: every crossing, junction and thread end the plucked
// thread passes is a NODE (zero displacement, like a fret); the stretch
// between two nodes is a LOBE, which vibrates on its own. Crossings stay
// pixel-static by construction.

// Sympathetic lobes (the rest of the plucked unit) hum at this fraction of
// the tapped lobe, falling off by SYMPATHY_FALLOFF per lobe of distance,
// each starting ONSET_STAGGER seconds later per lobe.
export const SYMPATHY = 0.55;
export const SYMPATHY_FALLOFF = 0.8;
export const ONSET_STAGGER = 0.025;
// Attack double image: share of the period spent "held" at the two
// extremes while the overtones are alive (an ideal pluck's waveform at a
// point is a trapezoid - it dwells at its extremes).
export const ATTACK_MIX = 0.45;
// A lobe may swing into its nearest neighbor's edge by this much (x h).
export const CLEAR_OVERLAP = 0.35;
// SOFT NODES: inside a node's footprint (where the static crossing patches
// are drawn) the amplitude stays under NODE_CORE * h, so the overlay's
// core stays opaque over the static thread; beyond it the cap opens at
// NODE_SLOPE per unit of arc.
export const NODE_CORE = 0.9;
export const NODE_SLOPE = 1.5;
// Strobe ghost: phase steps at GHOST_HZ in wall time, each step pi +/-
// GHOST_JITTER * pi (roughly the opposite side every time, never a
// coherent slow pattern); drawn GHOST_TINT of the way to white.
export const GHOST_HZ = 60;
export const GHOST_JITTER = 0.35;
export const GHOST_TINT = 0.2;
// A pluck ends once every lobe's on-screen amplitude is under this many
// CSS pixels (the overlay is then indistinguishable from the thread).
export const KILL_PX = 0.35;
// The tap position's share of its lobe, clamped off the nodes.
export const BETA_MIN = 0.15;
export const BETA_MAX = 0.85;

const PI = Math.PI;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clampBeta(beta: number): number {
  return clamp(beta, BETA_MIN, BETA_MAX);
}

// Fundamental (mode-1) amplitude of a unit-height pluck at beta:
// 2 sin(pi b) / (pi^2 b (1 - b)). 0.81 at the middle.
export function a1(beta: number): number {
  const b = clampBeta(beta);
  return (2 * Math.sin(PI * b)) / (PI * PI * b * (1 - b));
}

// The plucked triangle: 0 at both ends, 1 at x = b.
export function tri(b: number, x: number): number {
  if (x <= 0 || x >= 1) return 0;
  return x <= b ? x / b : (1 - x) / (1 - b);
}

// The odd, period-2 extension of tri_b.
function oddExt(b: number, xi: number): number {
  const u = ((xi % 2) + 2) % 2;
  return u <= 1 ? tri(b, u) : -tri(b, 2 - u);
}

// d'Alembert: the string's instantaneous shape at phase phi (radians of
// the fundamental; phi = pi is the half period).
export function yInst(b: number, x: number, phi: number): number {
  return 0.5 * (oddExt(b, x - phi / PI) + oddExt(b, x + phi / PI));
}

// The region the string sweeps at overtone weight q (1 = the attack's
// parallelogram, 0 = the fundamental's lens), for unit amplitude pulled
// toward +: out[0] = lower bound, out[1] = upper bound.
export function envelope(
  b: number,
  x: number,
  q: number,
  out: { [i: number]: number }
): void {
  const lens = a1(b) * Math.sin(PI * clamp(x, 0, 1));
  out[1] = q * tri(b, x) + (1 - q) * lens;
  out[0] = -(q * tri(1 - b, x) + (1 - q) * lens);
}

// Largest excursion either side ever reaches (over every q) - the t = 0
// extent the overlay strip and the base collapse are sized from.
export function peakShape(b: number, x: number, tapped: boolean): number {
  const lens = a1(tapped ? b : 0.5) * Math.sin(PI * clamp(x, 0, 1));
  if (!tapped) return lens;
  return Math.max(tri(b, x), tri(1 - b, x), lens);
}

// The instantaneous (ghost) offset at overtone weight q, unit amplitude.
export function ghostShape(
  b: number,
  x: number,
  q: number,
  phi: number
): number {
  const lens = a1(b) * Math.sin(PI * clamp(x, 0, 1)) * Math.cos(phi);
  return q * yInst(b, x, phi) + (1 - q) * lens;
}

// The synth's string decay (knot_synth.ts, the worklet's t60): seconds to
// -60 dB at the fundamental. Kept verbatim so sight and sound stay locked.
export function stringT60(freq: number, sustain: number): number {
  const f = clamp(freq || 220, 40, 1800);
  const sus = clamp(sustain, 0, 1);
  return Math.min(9, Math.max(0.5, 4.2 * Math.sqrt(220 / f) * (0.35 + 1.3 * sus)));
}

// Visual amplitude decay constant: e^(-t/tau), a little quicker than the
// sound's (the eye reads a fading blur as "over" before the ear does).
export function visualTau(freq: number, sustain: number): number {
  return (0.8 * stringT60(freq, sustain)) / 6.91;
}

// Overtone rounding time: the parallelogram -> lens transition.
export function roundTau(tau: number): number {
  return clamp(0.15 * tau, 0.04, 0.1);
}

// Tapped-lobe amplitude (world units): longer lobes swing wider, as a real
// string's would. size = the pluckSize param, gain = pluck strength. The
// median tapped lobe at the defaults is short enough to sit on the floor,
// so the floor sets how big a typical pluck reads: 0.45 h until Levi asked
// for a more pronounced swing (2026-10-12), 0.65 h since.
export function tapAmplitude(
  lobeLength: number,
  h: number,
  size: number,
  gain: number
): number {
  return size * gain * clamp(0.12 * lobeLength, 0.65 * h, 2.2 * h);
}

// A sympathetic lobe k lobes away from the tapped one.
export function sympatheticAmplitude(
  aTap: number,
  k: number,
  lobeLength: number,
  tapLength: number
): number {
  if (k === 0) return aTap;
  const fall = Math.pow(SYMPATHY_FALLOFF, Math.abs(k) - 1);
  const len = Math.min(1, Math.sqrt(Math.max(0, lobeLength) / Math.max(1e-6, tapLength)));
  return aTap * SYMPATHY * fall * len;
}

// Soft-node amplitude ceiling at arc distance dS from a node whose
// footprint (on this side) is `foot`.
export function nodeCap(h: number, dS: number, foot: number): number {
  return NODE_CORE * h + NODE_SLOPE * Math.max(0, dS - foot);
}

// Polynomial smooth minimum (blend width k): equals min(a, b) once the two
// differ by k or more, and never exceeds it.
export function softMin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const t = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - t * t * k * 0.25;
}

// ---------------------------------------------------------------------------
// The rounded base collapse (K77).
//
// The plucked thread's base ribbon narrows by a per-sample DEPTH D (its
// width multiplier is 1 - D). D is an allowance: the most the base may
// narrow there without uncovering anything (0 in node footprints, gap
// fades, tight bends). Its raw profile is a product of ramps meeting in
// min()s, and where two of them meet across a short window it is a V; the
// base edge h (1 - D) then reads through the overlay's translucent fringe
// as a sharp wedge cut into the thread. Limiting the slope cannot fix a V
// (its corner is a curvature spike), so the collapse keeps instead the
// largest profile under D built from RAISED-COSINE BUMPS whose curvature
// is at most `curv`: s cos^2(pi u / (2 a)), half-width a(s) =
// pi sqrt(s / (2 curv)), so a taller bump is also wider. That is a
// morphological opening of D: everything stays at or under D (footprints
// and the other hard limits hold), a window too short for a full-depth
// bump gets a shallower round dip instead of a V, every peak and every
// shoulder bends at most `curv` (edge radius >= 1 / (h curv)), and a
// smooth D wider than its bumps comes through unchanged. The family is
// nested (a lower bump lies under every higher one at the same center),
// so each center's height is the minimum over its constraints, each
// found by bisection.

// One bump's value at scaled distance w = u sqrt(curv / 2) from its center.
function bumpAt(s: number, w: number): number {
  const phase = w / Math.sqrt(s);
  if (!(phase < 0.5 * PI)) return 0;
  const c = Math.cos(phase);
  return s * c * c;
}

// out = the rounded collapse of `depth` (per base sample, spacing `per`
// along the chain; a closed chain wraps, an open chain's ends count as 0).
// curv <= 0 copies `depth` unchanged. out must not alias depth.
export function roundCollapse(
  depth: ArrayLike<number>,
  per: number,
  closed: boolean,
  curv: number,
  out: Float32Array
): void {
  const n = depth.length;
  if (!(curv > 0) || !(per > 0)) {
    for (let k = 0; k < n; k++) out[k] = depth[k];
    return;
  }
  out.fill(0, 0, n);
  const at = (z: number): number => {
    if (closed) return depth[((z % n) + n) % n];
    return z < 0 || z >= n ? 0 : depth[z];
  };
  // A closed chain's bump never wraps onto itself.
  const reach = closed ? (n - 1) >> 1 : n;
  const scale = per * Math.sqrt(0.5 * curv);
  const halfPi = 0.5 * PI;
  for (let c = 0; c < n; c++) {
    let s = depth[c];
    if (!(s > 0)) continue;
    // Tallest bump at c under every neighbor (s only ever shrinks, so a
    // constraint past the current bump's reach can never bind).
    for (let d = 1; d <= reach; d++) {
      const w = d * scale;
      if (!(w < halfPi * Math.sqrt(s))) break;
      const lim = Math.min(at(c - d), at(c + d));
      if (bumpAt(s, w) <= lim) continue;
      if (!(lim > 0)) {
        s = (w / halfPi) * (w / halfPi);
        continue;
      }
      let lo = 0;
      let hi = s;
      for (let it = 0; it < 24 && hi - lo > 1e-6; it++) {
        const mid = 0.5 * (lo + hi);
        if (bumpAt(mid, w) <= lim) lo = mid;
        else hi = mid;
      }
      s = lo;
    }
    if (!(s > 0)) continue;
    if (s > out[c]) out[c] = s;
    for (let d = 1; d <= reach; d++) {
      const w = d * scale;
      if (!(w < halfPi * Math.sqrt(s))) break;
      const v = bumpAt(s, w);
      for (const z of [c - d, c + d]) {
        let zz = z;
        if (closed) zz = ((z % n) + n) % n;
        else if (z < 0 || z >= n) continue;
        if (v > out[zz]) out[zz] = v;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Coverage (CPU twin of the overlay's fragment shader, for tests/probes).

// Integral of the arcsine CDF over [lo, hi]: 0 below lo, r at hi, slope 1
// beyond. Differencing it box-filters the dwell density over a pixel -
// exact AA even at the rims, where the density itself is singular.
export function coverG(y: number, lo: number, hi: number): number {
  const r = 0.5 * (hi - lo);
  const c = 0.5 * (hi + lo);
  if (r < 1e-6) return Math.max(0, y - c);
  const t = (y - c) / r;
  if (t <= -1) return 0;
  if (t >= 1) return r * t;
  return r * (0.5 * t + (t * Math.asin(t) + Math.sqrt(1 - t * t)) / PI);
}

// Fraction of time a thread of half-width h covers lateral offset u while
// its centerline dwells on [lo, hi] (arcsine density), averaged over a
// pixel of width p.
export function coverage(
  u: number,
  h: number,
  lo: number,
  hi: number,
  p: number
): number {
  const a = coverG(u + h + 0.5 * p, lo, hi) - coverG(u + h - 0.5 * p, lo, hi);
  const b = coverG(u - h + 0.5 * p, lo, hi) - coverG(u - h - 0.5 * p, lo, hi);
  return clamp((a - b) / p, 0, 1);
}

// An anti-aliased solid band of half-width h around 0.
export function band(v: number, h: number, p: number): number {
  return clamp((h - Math.abs(v)) / p + 0.5, 0, 1);
}

// ---------------------------------------------------------------------------
// Lobe segmentation.

export interface LobeSpan {
  // Node indices (into the sorted node list) at the lobe's two ends; -1 for
  // a pseudo lobe (a closed chain with no nodes at all).
  a: number;
  b: number;
  // UNWRAPPED arcs (s0 < s1), in the tap's frame: s0 <= tapArc' <= s1 for
  // the tapped lobe, neighbors continue from there (closed chains may run
  // past total or below 0 - consumers wrap when sampling).
  s0: number;
  s1: number;
  // Offset from the tapped lobe (0 = tapped, -1 = the one before, ...).
  k: number;
}

// The lobes of a pluck unit. `nodes` = node arcs on the chain, sorted
// ascending in [0, total] (an OPEN chain's list includes its two ends).
// `reach` = lobes kept on each side of the tapped one. `span` (optional,
// unwrapped [a0, a1] with a0 <= a1) restricts the unit to lobes inside
// it - the fabric's walk run; a tap outside the span ignores it.
export function segmentLobes(
  nodes: readonly number[],
  total: number,
  closed: boolean,
  tapArc: number,
  reach: number,
  span: [number, number] | null = null,
  pseudoHalf = 1.5
): LobeSpan[] {
  const m = nodes.length;
  if (total <= 0) return [];
  if (closed && m === 0) {
    const half = Math.min(pseudoHalf, total / 2);
    return [{ a: -1, b: -1, s0: tapArc - half, s1: tapArc + half, k: 0 }];
  }
  if (!closed && m < 2) return [];
  const lobeCount = closed ? m : m - 1;
  // Lobe i runs from node i to node i + 1 (closed: the last wraps to node
  // 0 + total). Its unwrapped extent in the base frame:
  const lobeAt = (i: number): [number, number] => {
    const s0 = nodes[i];
    const s1 = i + 1 < m ? nodes[i + 1] : nodes[0] + total;
    return [s0, s1];
  };
  // The tapped lobe.
  let t = closed ? ((tapArc % total) + total) % total : clamp(tapArc, 0, total);
  let it = -1;
  for (let i = 0; i < lobeCount; i++) {
    const [s0, s1] = lobeAt(i);
    if (t >= s0 && t <= s1) {
      it = i;
      break;
    }
  }
  if (it < 0) {
    // Closed chain, tap before the first node: it lives in the wrap lobe.
    it = lobeCount - 1;
    if (closed) t += total;
  }
  // Frame shift so the tapped lobe contains the caller's tapArc itself.
  const [b0, b1] = lobeAt(it);
  const shift = closed ? tapArc - t : 0;
  const tapped: LobeSpan = {
    a: it,
    b: (it + 1) % m,
    s0: b0 + shift,
    s1: b1 + shift,
    k: 0,
  };
  // The span, in the same frame as tapArc.
  let lo = -Infinity;
  let hi = Infinity;
  if (span) {
    let a0 = span[0];
    let a1v = span[1];
    if (closed) {
      // Slide the span by whole loops until it holds the tap, if it can.
      while (a1v < tapArc - 1e-6) {
        a0 += total;
        a1v += total;
      }
      while (a0 > tapArc + 1e-6) {
        a0 -= total;
        a1v -= total;
      }
    }
    if (tapArc >= a0 - 1e-6 && tapArc <= a1v + 1e-6) {
      lo = a0;
      hi = a1v;
    }
  }
  const eps = 1e-4 + 1e-6 * total;
  const out: LobeSpan[] = [tapped];
  const maxLobes = closed ? lobeCount : Infinity;
  // Forward.
  let s = tapped.s1;
  let idx = it;
  for (let j = 1; j <= reach && out.length < maxLobes; j++) {
    idx += 1;
    if (!closed && idx >= lobeCount) break;
    const i = closed ? idx % lobeCount : idx;
    const [c0, c1] = lobeAt(i);
    const len = c1 - c0;
    if (s + len > hi + eps) break;
    out.push({ a: i, b: (i + 1) % m, s0: s, s1: s + len, k: j });
    s += len;
  }
  // Backward.
  s = tapped.s0;
  idx = it;
  for (let j = 1; j <= reach && out.length < maxLobes; j++) {
    idx -= 1;
    if (!closed && idx < 0) break;
    const i = closed ? ((idx % lobeCount) + lobeCount) % lobeCount : idx;
    const [c0, c1] = lobeAt(i);
    const len = c1 - c0;
    if (s - len < lo - eps) break;
    out.push({ a: i, b: (i + 1) % m, s0: s - len, s1: s, k: -j });
    s -= len;
  }
  out.sort((p, q) => p.s0 - q.s0);
  return out;
}

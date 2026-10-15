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

// K105: re-derive the sympathetic lobes from the tapped lobe's CAPPED
// amplitude once every lobe has been clearance-capped. They were sized
// from the pre-cap one, and the tapped lobe is capped in most fabric taps
// (K77: 74 of 80), so a roomier neighbor could out-swing the lobe that was
// tapped. Each lobe keeps its own cap too (the min). `len` = the lobe's
// vibrating length, `tapLen` the tapped lobe's; k = 0 is the tapped lobe.
export function rescaleSympathetic(
  lobes: { k: number; A0: number; len: number }[],
  tapLen: number
): void {
  let aTap = -1;
  for (const l of lobes) if (l.k === 0) aTap = l.A0;
  if (aTap < 0) return;
  for (const l of lobes) {
    if (l.k === 0) continue;
    l.A0 = Math.min(l.A0, sympatheticAmplitude(aTap, l.k, l.len, tapLen));
  }
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
// THE WHOLE-SEGMENT TERM W (K104 goal 1). Levi, 2026-10-13: the pluck was
// "way too subtle ... Even maxing pluckSize to 3, I can't tell when some
// segments are plucked", asking for "a set-amount of whole-segment
// vibration" that the local lobes build on. The tapped lobe is clearance-
// capped in 90-100% of taps, mostly by the crossing partner through its own
// end node, at a floor pluckSize cannot raise, so lobes alone peak at 2-3
// CSS px. W is the plucked UNIT's fundamental at a set amount:
//   W(u) = AW0 sin(pi (u - E0) / (E1 - E0)),  AW0 = WHOLE_AMP size gain h,
// over the unit's vibrating extent [E0, E1] (its outer frets, past any hide
// zone), independent of length, on the lobes' decay clock from onset 0 and
// as a lens (no attack double image). The soft-node and tight-bend caps
// apply to the SUM lobe + W, so footprints and kinks keep their limits.
export const WHOLE_AMP = 0.5;
// "overlap" mode: W may run into a neighbor's edge (crossing partners and
// junction arms are not neighbors) by WHOLE_OVERLAP h, and its room never
// drops under WHOLE_FLOOR h. Stations within WHOLE_NODE_ZONE h + 0.1 of a
// node are not measured: the soft node rules there.
export const WHOLE_OVERLAP = 0.6;
export const WHOLE_FLOOR = 0.5;
export const WHOLE_NODE_ZONE = 2;
// "cue" mode (no W displacement): the unit brightens toward white by up to
// this much, on the same shape and clock.
export const CUE_WHITE = 0.6;

export function wholeAmplitude(
  h: number,
  size: number,
  gain: number,
  amp: number = WHOLE_AMP
): number {
  return Math.max(0, amp * size * gain * h);
}

// W's shape at unit coordinate u over the vibrating extent [e0, e1]; 0
// outside it.
export function wholeShape(u: number, e0: number, e1: number): number {
  const L = e1 - e0;
  if (!(L > 1e-6)) return 0;
  const x = (u - e0) / L;
  if (x <= 0 || x >= 1) return 0;
  return Math.sin(PI * x);
}

// ---------------------------------------------------------------------------
// PLUCK PARAMS (K180; Levi, 2026-10-14: "let's have a parameter to play
// with" for W's size, "a dropdown param to test" for the crossings and the
// glow). Viewer preferences, live, read by main.ts into the overlay:
//   pluckWhole     W's amount (the overlay's wholeAmp; WHOLE_AMP default, 0
//                  = the lobes alone, the pre-K104 pluck bit for bit), in
//                  [0, PLUCK_WHOLE_MAX]: 1.5 is 3x the default, W0 = 2.6 h
//                  at the default pluckSize, about where the overlap room
//                  (a neighbor's edge + WHOLE_OVERLAP h) binds W in most of
//                  a fabric, and still under the neighbor search's 2.2.
//   pluckCrossings how W meets the unit's interior crossings (WholeNodes).
//   pluckGlow      the cue (CUE_WHITE, W's shape and clock) on a full-motion
//                  pluck: off (K104's look) | instead (K104's "cue" mode:
//                  no W displacement, the unit brightens) | with (W and the
//                  cue) | fallback (W, plus the cue only on a pluck that
//                  cannot SHOW, by pluckShows - K104's census criterion).
export type PluckCrossings = "through" | "ride" | "pinch";
export const PLUCK_CROSSINGS: PluckCrossings[] = ["through", "ride", "pinch"];
export type PluckGlow = "off" | "instead" | "with" | "fallback";
export const PLUCK_GLOWS: PluckGlow[] = ["off", "instead", "with", "fallback"];
export const PLUCK_WHOLE_MAX = 1.5;

// K279's pluck emphasis params (stage 1 prototypes; docs/design/K279.md).
// Viewer preferences, live, read by main.ts:
//   pluckRipple     the render-only ripple from the pluck point
//                   (render/pluck_ripple.ts): off | wave (bends what it
//                   crosses) | glint (brightens it) | ring (a soft ring).
//   rippleStrength  the player's ripple, [0, RIPPLE_STRENGTH_MAX]; 0 = none.
//   rippleAuto      auto plucks' ripple (random and music modes), same range.
//   pluckSheen      bright turning-point edges on the time exposure, [0, 1];
//                   0 = the pre-K279 strip bit for bit.
//   pluckTug        a small physics displace-and-release of the plucked lobe,
//                   [0, 1]; 0 = render-only plucks (K3).
//   tugAuto         auto plucks tug too (default off: they never wake the knot).
//   autoPluckGain   auto plucks' volume, [0, 1]; 1 = a manual pluck's level.
export type PluckRipple = "off" | "wave" | "glint" | "ring";
export const PLUCK_RIPPLES: PluckRipple[] = ["off", "wave", "glint", "ring"];
export const RIPPLE_STRENGTH_MAX = 2;

// K104's "can't tell" line: a pluck SHOWS when its largest drawn swing
// (world) reaches SHOW_MIN_H of the half-width h AND SHOW_MIN_PX CSS px at
// the view scale (CSS px per world unit). The census (K104's census.mjs:
// CANT_TELL_H, CANT_TELL_PX) reads the same two numbers.
export const SHOW_MIN_H = 0.6;
export const SHOW_MIN_PX = 2;
export function pluckShows(peak: number, h: number, viewScale: number): boolean {
  return peak >= SHOW_MIN_H * h && peak * viewScale >= SHOW_MIN_PX;
}

// When the census looks, after each lobe's onset (s): K104's PEAK_DT.
export const SHOW_DT = [0, 0.01, 0.02, 0.035, 0.05, 0.075, 0.1, 0.15, 0.2];

// One station's drawn swing, exactly as the overlay's writeFrame builds the
// envelope it hands the shader: the lobe term s (amplitude x the station's
// factor) at overtone weight q, pulled toward side, plus W's w on both
// sides, the concave side clamped (capL above, capR below; Infinity = the
// convex side). Returns max(hi, -lo), the census's PEAK at that station.
export function drawnSwing(
  b: number,
  x: number,
  q: number,
  s: number,
  w: number,
  side: number,
  capL: number,
  capR: number,
  env: { [i: number]: number }
): number {
  let lo = 0;
  let hi = 0;
  if (!(s > 0 || w > 0)) return 0;
  if (s > 0) {
    envelope(b, x, q, env);
    lo = env[0] * s;
    hi = env[1] * s;
    if (side < 0) {
      const t = lo;
      lo = -hi;
      hi = -t;
    }
  }
  if (w > 0) {
    lo -= w;
    hi += w;
  }
  if (hi > capL) hi = capL;
  if (-lo > capR) lo = -capR;
  return Math.max(hi, -lo);
}

// Whether a pluck carries the cue under a glow option, given whether its
// swing shows (only "fallback" asks).
export function glowCue(glow: PluckGlow, shows: boolean): boolean {
  if (glow === "instead" || glow === "with") return true;
  return glow === "fallback" && !shows;
}

// ---------------------------------------------------------------------------
// REDUCED MOTION (K104 goal 3; the Motion setting, ui/motion.ts): the pluck
// shows without displacement and the sound is unchanged. The plucked unit
// BRIGHTENS toward white on the voice's decay clock instead - one instant
// rise, one smooth fall, nothing that moves. Its weight along the unit is a
// plateau CUE_UNIT over the unit's vibrating extent (W's extent; each end
// ramps in over CUE_RAMP h, at most a third of the unit) plus CUE_TAP
// sin(pi x) on the tapped lobe, so the lobe under the finger reads first,
// as its larger swing does in the moving pluck.
export const CUE_UNIT = 0.45;
export const CUE_TAP = 0.3;
export const CUE_RAMP = 2;
// A cue ends once its brightest station is under this share of white.
export const CUE_KILL = 0.01;

function smooth01(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

// The cue's weight at unit coordinate u over the extent [e0, e1]: ramp =
// the end ramp (world), tap = the tapped lobe's bump there (sin(pi x) on
// that lobe, else 0). In [0, 1]; 0 outside the extent and at its ends.
export function cueWeight(
  u: number,
  e0: number,
  e1: number,
  ramp: number,
  tap: number
): number {
  const L = e1 - e0;
  if (!(L > 1e-6)) return 0;
  const d0 = u - e0;
  const d1 = e1 - u;
  if (!(d0 > 0 && d1 > 0)) return 0;
  const r = Math.min(Math.max(0, ramp), L / 3);
  const plateau = r > 0 ? smooth01(d0 / r) * smooth01(d1 / r) : 1;
  return Math.min(1, CUE_UNIT * plateau + CUE_TAP * Math.max(0, tap));
}

// The cue's strength (its weights' multiplier at onset): the request's gain
// (tap 1; auto 0.75-1.25; drag 0.6-1.4), capped at CUE_GAIN_MAX, times
// sqrt(pluckSize / CUE_SIZE_REF). pluckSize's default (url_state) is the
// calibrated look; the slider still reads as stronger or weaker without
// the swing's linear scale, and pluckSize 0 stays sound only (add()).
export const CUE_GAIN_MAX = 1.25;
export const CUE_SIZE_REF = 1.75;

export function cueStrength(size: number, gain: number): number {
  const g = Math.min(CUE_GAIN_MAX, Math.max(0, gain));
  return g * Math.sqrt(Math.max(0, size) / CUE_SIZE_REF);
}

// A still pluck takes its crossing gaps from G1's own mask (gap_mask.ts
// gapKeepAt), which reads a fragment's place along its chain as a TURN: the
// ribbon's per-sample encoding (ribbon_mesh.ts: i / count on rings, 0.45 i
// / (count - 1) on open chains) times the slot's arcScale (the chain's
// length, or length / 0.45) gives the arc back. On rings the mask wraps by
// the period, so any whole number of turns names the same place: callers
// keep a lobe's arcs unwrapped (one smooth varying across the seam) and
// offset by whole lengths to stay >= 0 (a turn under -0.5 reads as a fan).
export function gapTurn(arc: number, total: number, closed: boolean): number {
  if (!(total > 0)) return 0;
  if (closed) return arc / total;
  return (0.45 * Math.max(0, Math.min(total, arc))) / total;
}

const UNION_SEEN = new Float64Array(64);

// The gap slots whose windows touch the arc span [a0, a1] of a chain whose
// ribbon samples carry `ids` (count samples x `slots` lanes, -1 = none;
// ribbon_renderer's assignGapIds, every window already padded by a sample):
// the distinct ids over samples floor(a0 per)..ceil(a1 per) - wrapped on
// rings (a0, a1 unwrapped), clamped into the chain on open ones (as gapTurn
// clamps) - written to out[o..o +
// slots) in first-seen order and padded with -1. Returns how many distinct
// ids there were; more than `slots` = overflow (the extras are dropped).
export function unionGapIds(
  ids: Float32Array,
  count: number,
  slots: number,
  closed: boolean,
  total: number,
  a0: number,
  a1: number,
  out: Float32Array,
  o: number
): number {
  out.fill(-1, o, o + slots);
  if (count < 2 || !(total > 0) || ids.length < count * slots) return 0;
  const per = (closed ? count : count - 1) / total;
  let k0 = Math.floor(Math.min(a0, a1) * per);
  let k1 = Math.ceil(Math.max(a0, a1) * per);
  if (!closed) {
    // Both ends into the chain, as gapTurn clamps the arc.
    k0 = Math.min(count - 1, Math.max(0, k0));
    k1 = Math.min(count - 1, Math.max(0, k1));
  } else if (k1 - k0 + 1 >= count) {
    k0 = 0;
    k1 = count - 1;
  }
  let n = 0;
  for (let k = k0; k <= k1; k++) {
    const kk = closed ? ((k % count) + count) % count : k;
    for (let s = 0; s < slots; s++) {
      const id = ids[kk * slots + s];
      if (!(id >= 0)) continue;
      let seen = false;
      for (let j = 0; j < n; j++) {
        if (UNION_SEEN[j] === id) {
          seen = true;
          break;
        }
      }
      if (seen) continue;
      if (n >= UNION_SEEN.length) return n;
      UNION_SEEN[n] = id;
      if (n < slots) out[o + n] = id;
      n++;
    }
  }
  return n;
}

// W's room at a station whose nearest neighbor edge is `gap` away from the
// thread's own edge ("overlap" mode).
export function wholeRoom(gap: number, h: number): number {
  return Math.max(WHOLE_FLOOR * h, Math.max(0, gap) + WHOLE_OVERLAP * h);
}

// In place: v[i] = min over j of v[j] + slope * spacing * |i - j| (uniform
// samples; Infinity stays Infinity until a finite value spreads in).
export function slopeLimitUniform(
  v: Float32Array,
  spacing: number,
  slope: number
): void {
  const step = slope * spacing;
  for (let i = 1; i < v.length; i++) {
    if (v[i - 1] + step < v[i]) v[i] = v[i - 1] + step;
  }
  for (let i = v.length - 2; i >= 0; i--) {
    if (v[i + 1] + step < v[i]) v[i] = v[i + 1] + step;
  }
}

// A room profile sampled uniformly over a lobe, read at fraction f in [0, 1]
// (linear between finite samples; an unmeasured Infinity yields the other).
export function roomAt(room: Float32Array, f: number): number {
  const n = room.length - 1;
  if (n < 1) return n === 0 ? room[0] : Infinity;
  const x = clamp(f, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const a = room[i];
  const b = room[i + 1];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Math.min(a, b);
  return a + (b - a) * (x - i);
}

// "pinch": W's own ceiling near an INTERIOR node of the unit (a crossing
// inside the run): core * h inside the footprint, opening at NODE_SLOPE.
export function pinchCap(h: number, dS: number, foot: number, core: number): number {
  return core * h + NODE_SLOPE * Math.max(0, dS - foot);
}

// "through": one station's swing when W passes the unit's interior
// crossings. lobeRaw = the lobe's raw peak there; lobeInt = it soft-capped
// at the lobe's INTERIOR nodes only; lobeOnly = it capped at all its nodes
// (the pre-K104 swing); w = W's raw peak (world); capEnd = the ceiling of
// the unit's end nodes and hide zones. The sum lobeInt + w is soft-capped
// once at capEnd. Capping the lobe at its end nodes first and the sum there
// again put the sum right at the cap, where softMin dips (up to h / 16), so
// W lowered the swing near every unit end (sliver runs between junction
// cores read 0.12 -> 0.03 CSS px). And W never lowers the LOBE: its share
// is never under lobeOnly, and W draws what the cap leaves above it, so
// the drawn swing is at least the pre-K104 one at every instant (W only
// widens [lo, hi]). Splitting the capped sum by its ratio let the lobe's
// share fall under lobeOnly wherever the end cap held the sum, which
// lowered the swing whenever W's time factor ran below the lobe's, and
// switching to the lobe alone where the sum undershot stepped both shares
// along the strip. out = [pk, f, g]: the station's swing, the lobe's
// factor on lobeRaw and W's on w (f lobeRaw + g w = pk); both shares are
// continuous in the inputs.
export function throughStation(
  lobeRaw: number,
  lobeInt: number,
  lobeOnly: number,
  w: number,
  capEnd: number,
  h: number,
  out: Float64Array
): void {
  const sum = lobeInt + w;
  let pk = 0;
  let k = 0;
  if (sum > 1e-9) {
    pk = Math.max(0, Math.min(sum, softMin(sum, capEnd, 0.25 * h)));
    k = pk / sum;
  }
  // k lobeInt <= pk, so the lobe's share never exceeds the swing, and W's
  // (pk - lobe) never exceeds k w (the min only absorbs rounding).
  const lobe = Math.max(k * lobeInt, lobeOnly);
  if (lobeOnly > pk) pk = lobeOnly;
  out[0] = pk;
  out[1] = lobeRaw > 1e-9 ? lobe / lobeRaw : 1;
  out[2] = w > 1e-9 ? Math.min(k, Math.max(0, pk - lobe) / w) : 0;
}

// THE SEAM: a closed chain's node arcs live in [0, total), so a unit that
// crosses arc 0 is not continuous in them. Each lobe carries a shift (a
// multiple of total) so arc + shift is continuous over the unit. Given the
// lobe's previous continuous start `cont` and its newly resolved start s0,
// the shift that keeps s0 + shift nearest `cont`.
export function unitShift(
  cont: number,
  s0: number,
  total: number,
  closed: boolean
): number {
  return closed && total > 0 ? Math.round((cont - s0) / total) * total : 0;
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

// ---------------------------------------------------------------------------
// The tapped lobe, and whether the tap fell inside a junction core (K235).

export const LOBE_MIN_LEN = 0.05; // Shorter node pairs are not lobes.
export const HIDE_RAMP = 0.1; // Arc over which a hide zone fades back in.

// The vibrating span of a node-to-node lobe [s0, s1]: the lobe minus its hide
// zones (a junction core or a marker gap hides the overlay, so the string's
// effective fret sits where its hide ramp ends). hideA / hideB = the hide
// radius at the lobe's two end nodes, 0 = none.
export function vibratingSpan(
  s0: number,
  s1: number,
  hideA: number,
  hideB: number
): [number, number] {
  const e0 = s0 + (hideA > 0 ? hideA + HIDE_RAMP : 0);
  const e1 = s1 - (hideB > 0 ? hideB + HIDE_RAMP : 0);
  return [e0, Math.max(e0, e1)];
}

export interface TapLobes {
  // The pluck unit's lobes at least LOBE_MIN_LEN long, ascending.
  spans: LobeSpan[];
  // The one holding the tap (k 0), or null when it is shorter than
  // LOBE_MIN_LEN (or the chain has no lobes at all).
  tapped: LobeSpan | null;
  // Its vibrating span (hide zones trimmed); null with `tapped`.
  vibrating: [number, number] | null;
  // The tap fell inside a junction core: it holds a lobe, but that lobe minus
  // its hide zones is under LOBE_MIN_LEN, so nothing vibrates. This is the
  // decision behind the overlay's `skipCore`, and K235's: such a tap draws no
  // pluck and so makes no sound either (main.ts tapPluck).
  core: boolean;
}

// The unit's lobes for a tap, and the tapped lobe's verdict. `nodes` = the
// chain's nodes ascending by arc (an open chain's list includes its two ends)
// with each one's hide radius; the rest is segmentLobes'. One function for
// the overlay's add() and its tests, so the decision exists once.
export function tapLobes(
  nodes: ReadonlyArray<{ readonly arc: number; readonly hide: number }>,
  total: number,
  closed: boolean,
  tapArc: number,
  reach: number,
  span: [number, number] | null = null
): TapLobes {
  const spans = segmentLobes(
    nodes.map((n) => n.arc),
    total,
    closed,
    tapArc,
    reach,
    span
  ).filter((s) => s.s1 - s.s0 >= LOBE_MIN_LEN);
  const tapped = spans.find((s) => s.k === 0) ?? null;
  if (!tapped) {
    return { spans, tapped: null, vibrating: null, core: false };
  }
  const vibrating = vibratingSpan(
    tapped.s0,
    tapped.s1,
    tapped.a >= 0 ? nodes[tapped.a].hide : 0,
    tapped.b >= 0 ? nodes[tapped.b].hide : 0
  );
  return {
    spans,
    tapped,
    vibrating,
    core: vibrating[1] - vibrating[0] < LOBE_MIN_LEN,
  };
}

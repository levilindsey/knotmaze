import { segmentsNear } from "../audio/pitch_space";
import type { PitchAssignment } from "../audio/pitch_space";

// K244 (docs/design/K244_cores.md; Levi, 2026-10-20: "Players shouldn't be
// able to pluck junction cores."): how the auto plucks (random and music
// modes) choose a site that will actually draw, so the note never sounds
// with nothing on screen. PURE: the caller supplies the questions ("would
// the pluck at this segment / ctrl draw?", PluckOverlay.siteTester) and the
// random source, so the selection is testable without a scene. "Valid"
// means the pluck would draw (render/pluck_model.ts wouldPluck: not in a
// junction core, not a degenerate lobe); the hot, held and size-0 cases stay
// sound-only by design and are not asked.

// Random draws a pick makes before it sweeps the whole list. Most sites are
// valid (K180's census put 21 of 284 fabric taps and 51 of 564 dense taps in
// cores), so a few draws nearly always find one without testing the rest;
// the sweep makes the answer exact when most are not, and the draws alone
// are still uniform among the valid ones (rejection sampling).
const PICK_TRIES = 12;

// Random ctrls a knot strand's pick tries before it sweeps the strand, and
// the sweep's step (ctrl units). A lobe that can draw is at least 0.05 world
// long and a ctrl is about a lattice unit, so the sweep cannot step over one.
const CTRL_TRIES = 12;
const CTRL_SCAN_STEP = 0.25;

// Random mode: a uniformly random segment among those `valid` accepts, or
// -1 when none is valid (the caller plays nothing).
export function pickRandomSegment(
  n: number,
  valid: (seg: number) => boolean,
  rand: () => number
): number {
  if (!(n > 0)) return -1;
  for (let i = 0; i < PICK_TRIES; i++) {
    const seg = Math.min(n - 1, Math.floor(rand() * n));
    if (valid(seg)) return seg;
  }
  const ok: number[] = [];
  for (let seg = 0; seg < n; seg++) if (valid(seg)) ok.push(seg);
  return ok.length > 0 ? ok[Math.min(ok.length - 1, Math.floor(rand() * ok.length))] : -1;
}

// Music mode: a random one of the VALID segments nearest the note's pitch
// (segmentsNear over the valid set), so the song's true pitch still plays
// and a valid segment moves; -1 when no segment is valid anywhere.
export function pickMusicSegment(
  assign: PitchAssignment,
  freq: number,
  valid: (seg: number) => boolean,
  rand: () => number
): number {
  const segs = segmentsNear(assign, freq, valid);
  if (segs.length === 0) return -1;
  return segs[Math.min(segs.length - 1, Math.floor(rand() * segs.length))];
}

// A knot strand's pluck ctrl: a random one on the strand that `ok` accepts
// (the old pick: Math.random() * len), resampled up to CTRL_TRIES times and
// then swept from a random start so a strand with any valid lobe is found and
// one with none is known to have none. -1 when no ctrl on it is valid.
export function findValidCtrl(
  len: number,
  ok: (ctrl: number) => boolean,
  rand: () => number
): number {
  if (!(len > 0)) return -1;
  for (let i = 0; i < CTRL_TRIES; i++) {
    const c = rand() * len;
    if (ok(c)) return c;
  }
  const steps = Math.ceil(len / CTRL_SCAN_STEP);
  const start = rand() * len;
  for (let k = 0; k < steps; k++) {
    const c = (start + k * CTRL_SCAN_STEP) % len;
    if (ok(c)) return c;
  }
  return -1;
}

// A fabric segment's pluck ctrl: the run's midpoint (where its auto plucks
// have always tugged) when that would draw, else the nearest place along the
// run [c0, c1] that does, searched outward from the midpoint; null when no
// place on the run would draw (the whole run is junction core).
export function nearestValidCtrl(
  c0: number,
  c1: number,
  mid: number,
  ok: (ctrl: number) => boolean,
  step = 0.5
): number | null {
  const lo = Math.min(c0, c1);
  const hi = Math.max(c0, c1);
  const m = Math.min(hi, Math.max(lo, mid));
  if (ok(m)) return m;
  for (let k = 1; ; k++) {
    const a = m - k * step;
    const b = m + k * step;
    const inLo = a >= lo;
    const inHi = b <= hi;
    if (!inLo && !inHi) return null;
    if (inLo && ok(a)) return a;
    if (inHi && ok(b)) return b;
  }
}

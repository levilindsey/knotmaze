// K835: the path irregularity + excursion scales. Two sliders drive how
// loosely the drawn route follows the thread's true centerline:
//   - pathIrregularity (0..1, default PATH_IRREGULARITY_DEFAULT): how
//     wiggly the route is. The Ariadne string (pathViz "string") sags
//     off the centerline by an amplitude scaled by yarnIrregularityMult,
//     and the traveled fill (goldTexture pencil / crayon / highlighter)
//     wobbles its edge by fillIrregularityExcess in the ribbon shaders
//     (uKPathB.x), so the fill reads hand-drawn instead of ribbon-exact.
//   - pathExcursion (0..1, default 0): how far outside the thread's
//     bounds the route may drift. It feeds a smooth low-frequency swell
//     (excursionSwell) and raises the soft cap on the total offset
//     (excursionCap). The swell is gated by excursionGate: at exactly
//     zero irregularity the route lies on the centerline no matter
//     where this slider sits; a little irregularity unlocks the swell,
//     so low irregularity + high excursion draws a smooth curve that
//     leaves the thread for long stretches, while high + high cuts in
//     and out constantly.
// At the defaults the string and the fills draw exactly as they did
// before the sliders: the yarn multiplier is 1, both excesses are 0,
// and the excursion cap (0.9 thread widths) sits past the largest
// offset the pre-slider yarn could reach (0.85), so the soft knee
// never bites.
export const PATH_IRREGULARITY_DEFAULT = 0.4;
export const PATH_IRREGULARITY_MAX_MULT = 2.5;

export function yarnIrregularityMult(v: number): number {
  return PATH_IRREGULARITY_MAX_MULT * v;
}

export function fillIrregularityExcess(v: number): number {
  const m = yarnIrregularityMult(v);
  return Math.min(
    1,
    Math.max(0, (m - 1) / (PATH_IRREGULARITY_MAX_MULT - 1))
  );
}

// The excursion gate: 0 at zero irregularity, fully open once the
// irregularity reaches 0.3 (below the 0.4 default), opening with a
// square-root knee so a small nonzero irregularity already lets the
// smooth swell carry the route out of bounds.
export function excursionGate(irregularity: number): number {
  if (irregularity <= 0) return 0;
  return Math.sqrt(Math.min(1, irregularity / 0.3));
}

// The traveled fill's excursion (uKPathB.y): the excursion slider as
// unlocked by the irregularity gate.
export function fillExcursion(excursion: number, irregularity: number): number {
  return excursion * excursionGate(irregularity);
}

// The yarn's swell amplitude in thread widths, before the base sag
// scale: the excursion slider as unlocked by the gate.
export function excursionSwell(excursion: number, irregularity: number): number {
  return 2.0 * fillExcursion(excursion, irregularity);
}

// The soft cap on the yarn's total lateral offset, in thread widths
// from the centerline: 0.9 at rest (inside, past the pre-slider max),
// 2.5 at full excursion.
export function excursionCap(excursion: number): number {
  return 0.9 + 1.6 * excursion;
}

// Identity inside the cap; past it the offset keeps only a quarter of
// the overshoot, so the route presses smoothly against the allowance
// instead of clipping flat.
export function softKnee(raw: number, cap: number): number {
  const a = Math.abs(raw);
  if (a <= cap) return raw;
  return Math.sign(raw) * (cap + (a - cap) * 0.25);
}

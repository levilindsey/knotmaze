// gridAlign SLIDER <-> STRENGTH. The URL (ga=) and the physics
// (PhysicsTuning.gridAlign: every particle eased toward its lattice point by
// GRID_ALIGN_STIFFNESS * strength per substep) carry the STRENGTH; only the
// panel slider speaks this curve, so every existing link keeps its look.
//
// Why a curve: the settled look follows the LOG of the strength. Measured
// 2026-10-11 by real-time settles to the asleep stamp over a strength ladder
// 0, 5e-4, 1e-3, 2e-3, 5e-3 ... 1. "Alignment progress" is the mean of two
// metrics, each normalized 0 (strength 0) to 1 (strength 1): the RMS
// residual of the particles from their lattice points after the best
// uniform scale + translation (what reads as "in line"; scale is removed
// because the slack shrink is not misalignment), and the mean angle of each
// thread segment off its lattice segment (runs straightening onto the
// diagonals). Position moves first and direction last, so either one alone
// is lopsided; their mean tracks the screenshot sheets. On the default
// fabric progress is 6% at 5e-4, 20% at 2e-3, 37% at 0.01, 56% at 0.05, 76%
// at 0.2 and 100% at 1: about 30% per decade across three decades. The old
// linear slider therefore spent 56% of the visible change (71% on a loose
// ring URL) on its first 0.05 step.
//
// Curve: strength = (e^(a x) - 1) / (e^a - 1) with a = 10 ln 2, i.e.
// (2^(10x) - 1) / 1023. Each +0.1 of slider doubles the strength, and
// x = 0.1 lands on ~1e-3, where the look starts to move. Evenness (RMS of
// progress(strength(x)) - x over x = 0.05..1) on the default fabric: 0.02
// (linear 0.39; the best power curve, x^4.5, 0.06; the best exponential,
// a = 7.25, 0.017). Verified by settling x = 0, 0.1, ..., 1: progress per
// step 11, 13, 9, 8, 9, 9, 10, 10, 10, 11%. Loose fabrics (sl=1, the
// user's ring URL) add a CLIFF: the free threads buckle the whole figure
// lopsided below ~1.8e-3 and it snaps round above, so that change lands
// in one step (x 0.1 -> 0.2); from 5e-4 to 1.6e-3 (x = 0.06-0.14) the
// ring also wanders for 10 s to minutes before it sleeps, some runs
// never. Above the cliff its steps are 3-10%. Knot mode responds later
// (its free knot already sits near the lattice): 22% of its change lies
// below x = 0.5. Fabric is the default mode, so the curve fits fabric.
const CURVE = 10 * Math.LN2;
const SPAN = Math.expm1(CURVE); // e^a - 1 = 1023

// Slider position [0, 1] -> anchor strength [0, 1]. 0 -> 0, 1 -> 1.
// Snapped to 12 significant digits: the raw float round trip strength ->
// slider -> strength is off by an ulp or two (0.1 -> 0.669070 ->
// 0.09999999999999998), which would read as a modified default and leak
// ga= into short links. Snapped, any strength written as a decimal (the
// default, URL values rounded to 6 places) comes back bit-exactly. Only
// this side snaps: each direction amplifies the other's rounding (by ~a
// and ~1/a), so both cannot be exact at once; slider -> strength ->
// slider stays within 1e-12.
export function gridAlignStrength(slider: number): number {
  if (!(slider > 0)) return 0;
  if (slider >= 1) return 1;
  return Number((Math.expm1(CURVE * slider) / SPAN).toPrecision(12));
}

// Anchor strength [0, 1] -> slider position [0, 1]: the inverse of
// gridAlignStrength.
export function gridAlignSlider(strength: number): number {
  if (!(strength > 0)) return 0;
  if (strength >= 1) return 1;
  return Math.log1p(strength * SPAN) / CURVE;
}

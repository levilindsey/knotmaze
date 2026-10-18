// Layer 3: Verlet-integrated particles over the tangle graph. Each strand is
// an INDEPENDENT closed chain of particles (one per graph node occurrence
// plus one per edge midpoint) - nothing is anchored to the lattice, and
// crossings are SLIDING BINDINGS rather than shared particles: each crossing
// tracks a fractional position along each of its two threads, re-projects
// onto the local geometry every substep (so the intersection point migrates
// along both threads), and a coincidence constraint holds the two points
// together. Ordering clamps keep crossings from sliding past their neighbors
// along a thread, preserving the diagram's topology while the overall shape
// relaxes into an organic, force-directed equilibrium.

import type { TangleGraph } from "../core/types";
import { NODE_TYPE } from "../core/types";
import type {
  DistanceConstraint,
  JunctionCover,
  SegmentTopology,
} from "./forces";
import {
  applyDistanceConstraints,
  applyRepulsion,
  applySegmentCollision,
} from "./forces";
import { SeededRNG } from "../util/random";
import { createNoise3D } from "simplex-noise";

export interface CrossingPass {
  chain: number; // Chain (strand) index.
  ctrl: number; // FRACTIONAL control position along the chain; slides live.
  // Set by slideCrossing each kinetic substep: the slide target was the
  // TRUE local polyline intersection (vs the nearest-point fallback).
  // Diagnostic bookkeeping (a fallback means the threads have locally
  // separated at the crossing).
  intersected?: boolean;
  // The other pass of the same crossing. When the partner is also this
  // pass's chain-order neighbor, the crossing is a self-crossing kink and
  // the ordering clamp holds the larger KINK_MIN_SEPARATION so the kink's
  // loop keeps enough material to render as an eyelet.
  partner?: CrossingPass;
  // |slide target - achieved ctrl| after the ordering clamps, updated
  // each kinetic substep. Nonzero means the clamp (or rate cap) is
  // holding this binding away from the true intersection; the coupling
  // scales down with it (see the coupling block).
  clampLag?: number;
  // RENDER-ONLY ctrl of the true local intersection (raw slide target,
  // before easing and ordering clamps; undefined while the threads are
  // locally separated). The renderer draws the crossing HERE: during a
  // tug the clamps can pin the physics binding away from where the
  // threads actually cross, and erase/fill patches drawn at the binding
  // land beside the real overlap - mangled, torn-looking crossings
  // mid-gesture. Physics never reads this.
  displayF?: number;
  // P4 fabric: ctrl of the nearest fused junction BEHIND (jnPrevCtrl) /
  // AHEAD (jnNextCtrl) of this pass along its chain, recorded at fusion
  // time when within JN_CLAMP_SCAN (see JN_MIN_SEPARATION). The slide's
  // ordering clamp holds the pass at least jnSep of thread outward of
  // the joint, as a rate-limited ratchet. Never set in knot mode - the
  // clamp is structurally absent there.
  jnPrevCtrl?: number;
  jnNextCtrl?: number;
}

export interface CrossingInfo {
  over: CrossingPass;
  under: CrossingPass;
  // Initial sign of cross(overTangent, underTangent): the crossing's
  // orientation. The transversality torque steers toward this sign's
  // perpendicular, which both keeps crossings X-shaped (no tangential
  // gluing) and prevents orientation flips (fold-inversions).
  sign: number;
}

// Live physics tuning, applied per substep (no rebuild needed).
export interface PhysicsTuning {
  temperature: number; // [0, 1] Simplex agitation.
  slack: number; // [0, 1] rest-state looseness.
  drag: number; // [0, 1] 0 = ringy waves, 1 = heavily damped.
  repulsion: number; // Multiplier on the repulsion distance.
  bend: number; // Multiplier on bending stiffness.
  smooth: number; // [0, 1] Laplacian fairing: evens curvature along threads.
  stiffness: number; // Multiplier on the structural (adjacency) springs.
  // [0, 1] soft anchor of every particle to its lattice position (0 =
  // off; 1 = the original full-strength checkbox).
  gridAlign: number;
  threadWidth: number; // Render width; the hard collision floor honors it.
}

export const DEFAULT_TUNING: PhysicsTuning = {
  temperature: 0,
  slack: 0.55,
  drag: 0.5,
  repulsion: 1,
  bend: 1,
  smooth: 0.25,
  stiffness: 1,
  gridAlign: 0,
  threadWidth: 0.42,
};

// Collision floor margin: centerlines may not come closer than
// threadWidth * this outside crossing lenses (surfaces just kiss at
// 1.0). This is a VISUAL floor, not just a physical one: at 1.05 the
// edge clearance was 0.02 - sub-pixel - so threads squeezed to the
// floor (tight twist eyes under bending pressure) rendered as touching/
// merged and were reported as "sinking into each other". 1.16 keeps a
// visible sliver of background (~0.07 at default width) between any two
// passing threads.
const COLLISION_MARGIN = 1.16;
const COLLISION_STIFFNESS = 0.5;

// Fixed physics timestep; frames accumulate real time into substeps.
// The per-frame cap must be generous: Chrome throttles rAF to ~1fps for
// occluded (or occlusion-misdetected) windows, and a small cap would pin
// the sim at a few percent of real time - the knot freezes mid-settle,
// which reads as kinked threads and notched crossings. A large cap lets
// throttled tabs catch up in bursts.
// Exported for K147's settle budget (physics/settle_budget.ts), which
// computes the dt that runs a chosen number of these substeps.
export const SUBSTEP = 1 / 120;
export const MAX_SUBSTEPS_PER_FRAME = 30;
export const MAX_FRAME_DT = 0.25;
// The emergent-crossing collector's capacity in rows (forces.ts stops
// collecting when it is full), and the floats per row of the K7 snapshot's
// copy of it: i, u, j, v and the over flag (writeEmergentRows).
export const EMERGENT_MAX = 256;
export const EMERGENT_ROW = 5;
const CONSTRAINT_ITERATIONS = 2;
// Verlet velocity retention maps from the drag tuning: drag 0 keeps 99.5%
// per substep (waves ring), drag 1 keeps 80% (heavily damped).
const DAMPING_MIN_DRAG = 0.995;
const DAMPING_MAX_DRAG = 0.8;
const GRID_ALIGN_STIFFNESS = 0.08;

// The hero settle: structural rest lengths are stored at their full lattice
// values, so the angular initial state is a true equilibrium. Over
// SETTLE_DURATION seconds a smoothstep ramp shrinks rests toward the slack-
// dependent target and fades bending in, so corners visibly open into smooth
// curves while the constraints themselves stay stiff (crisp at every moment).
const SETTLE_DURATION = 2.2;
const STRUCTURAL_STIFFNESS = 0.7;
const BENDING_STIFFNESS = 0.18;
const REPULSION_STIFFNESS = 0.15;

// Slack [0, 1] shapes the rest state: 0 = taut threads pulled tight against
// the crossings, 1 = loose threads with round, continuous curvature and
// generous spacing. It interpolates three knobs:
const SHRINK_TAUT = 0.82; // Rest-length fraction at slack 0...
const SHRINK_LOOSE = 0.97; // ...and at slack 1.
// The taut floor must stay high enough that threads never kink at
// crossings at TRUE equilibrium (validate with a real-time run, not a
// virtual-time screenshot): taut string over a peg bends at a small round
// radius, not a corner. Tautness comes from the structural shrink, not
// from bending going slack.
const BEND_TAUT = 2.8; // Bending-stiffness multiplier at slack 0...
const BEND_LOOSE = 3.0; // ...and at slack 1.
const REPULSE_DIST_TAUT = 0.62; // Repulsion min distance at slack 0...
const REPULSE_DIST_LOOSE = 0.95; // ...and at slack 1.

const TEMPERATURE_SCALE = 0.05;
const NOISE_SPATIAL_FREQ = 0.3;
const NOISE_TIME_FREQ = 0.8;

// Sliding-crossing tuning. Bindings re-project within a small local window
// each substep, rate-limited for stability; passes along one chain keep a
// minimum separation (in control units, 2 per lattice edge) so crossings
// never swap order; the coincidence constraint is applied inside the
// iteration loop; particles inside a crossing's windows are exempt from
// repulsion against the other side (the threads are supposed to touch).
// Bindings track the geometric contact essentially at motion speed: wide
// projection window, strong easing, generous rate cap. The ordering clamp
// below (MIN_PASS_SEPARATION) remains the one deliberate restriction - it
// stops a loop-end twist's two crossings from sliding through each other
// and untwisting.
const SLIDE_WINDOW = 3; // Segments each side searched by the projection.
// Slide chase runs in two regimes: fast while the user is dragging (a
// grabbed thread can sweep an intersection along the threads far faster
// than material moves through space, and a lagging chase makes the
// coupling drag the other thread bodily), gentle at rest (fast chase
// amplifies contact chatter between closely-spaced twist crossings).
// Grabbed chase is EXACT (ease 1): any per-substep chase lag becomes a
// parasitic pull on the other thread - the coupling pulls the lagging
// binding's thread toward the leading one every substep, which integrates
// into bodily drag during sweeps and grabs at intersections.
const MAX_SLIDE_GRABBED = 0.6;
const SLIDE_EASE_GRABBED = 1.0;
const MAX_SLIDE_REST = 0.12;
const SLIDE_EASE_REST = 0.5;
// Chase deadband: numerical epsilon ONLY. A perceptible deadband is a
// friction trap: a weak tug moves material ~0.006 ctrl/substep - below
// any deadband of useful size - so the binding never slides, the
// exemption lens stays glued to the material, collision welds the two
// threads, and they translate together, which keeps the re-projection
// delta sub-threshold forever (measured: 99% of slide calls swallowed,
// binding slid 0.12 ctrl while the other thread was dragged 1.5 units).
// Rest-chatter suppression - the deadband's original job - is now
// handled by static friction freezing the crossing machinery entirely
// (CONTACT_STICK_EPS below).
const SLIDE_DEADBAND = 1e-4;
// Minimum binding separation along a chain. This is set by the DEPTH
// FIELD'S RESOLUTION, not by inversion guarding: the field lives on
// particles (resolution 1 ctrl), so passes closer than ~2 ctrl cannot be
// represented - their opposite-sign tents overlap and cancel, the
// exemption fails at segments the diagram requires to intersect, and the
// resulting coupling-vs-collision fight can never resolve (the post-play
// endless jiggle: an over-tightened interleaved twist pinned at the old
// 0.9 floor rang forever at ~5e-2). With the floor above DEPTH_WINDOW,
// neighbor tents never cancel at a crossing, and the window is wide
// enough that a clamp-pinned binding's intersection (lag <= ~1.3) stays
// covered. The ceiling is the corridor weave pitch: checkerboard
// corridors place passes exactly 2.0 apart, and a floor at 2.0 left zero
// slack - bindings could only slide as convoys, which re-created the
// pinned-intersection drag feel (grab-at-X crossing motion 0.59 -> 1.29
// measured). 1.6 restores 0.4 of independent play per crossing. The
// historical warning about large values ("forced bindings away from true
// intersections, coupling contorted threads") predates the depth model:
// the wide tents cover exactly that displacement, and the coupling
// additionally YIELDS under clamp lag instead of contorting.
const MIN_PASS_SEPARATION = 1.6;
// Between the two passes of a SELF-crossing (a kink: the thread crossing
// itself), the material between the passes IS the kink's visible eyelet.
// The generic 0.9 floor let kink loops starve to ~0.25 arc of material -
// unrenderable (the erase cuts ~1 unit of thread with nothing to repaint:
// the reported giant gaps at loop-end non-twists). ~2.6 ctrl of loop
// material renders as a legible eyelet at the DEFAULT thread width -
// and the budget must SCALE with width: a fat ribbon's eye needs a
// proportionally longer loop or its turn radius is geometrically
// capped below the renderable minimum (measured at tw 0.52: a 2.6-ctrl
// eye froze at radius 0.13-0.25 vs the 0.30 floor - the "merged
// parallel threads" seam was its strip self-overlapping). 6.2 = 2.6 /
// 0.42, the original calibration expressed per unit width.
const KINK_MIN_SEPARATION = 2.6;
const KINK_SEP_PER_WIDTH = 6.2;
// KINK EYES - the eye-OPENING layer above the hard floor. The floor above
// guarantees a renderable eyelet, not an OPEN one: at rest the census
// (every kink, 5 configs) measured holes of 0.05-0.5 widths - knot mode
// 20/20 under 0.4 - and a phone parked one AT the floor (3.37 ctrl,
// ~1.3 world of loop): a closed dark notch. Three mechanisms closed eyes,
// each measured, and each has its own fix:
// 1. LASSO DRAIN (material): kinks are all one lattice motif (8 ctrl,
//    3.29 world of rest material at slack 0.55), and in the first ~0.5 s
//    the initial transient pulls material out through the crossing
//    (traced: 8.0 -> 6.65 ctrl) before the contacts go static at ~0.6 s
//    and freeze whatever is left. Fix: a material RATCHET (below).
// 2. FAIRING (shape): on a closed loop the umbrella step is pure curve-
//    shortening - the dominant closer at rest. Fix: kink loops are exempt
//    from fairing (the fairing pass).
// 3. ASYMMETRIC REPULSION (shape): the global repulsion skips same-chain
//    pairs within 6 ctrl, so an 8-ctrl loop never repels across its own
//    eye, while each loop arm IS repelled by the opposite pass's tail.
//    Fix: EYE PRESSURE (applyKinkEyePressure).
// Material alone was tried first and is not enough: holding the full
// lattice material (3.32 world, no drain) left knot-mode holes at
// 0.30-0.49 widths, the extra arc going into a long narrow neck.
//
// The RATCHET's budget is REST MATERIAL (world arc of the structural
// rests between the two passes), not ctrl: lattice segments rest anywhere
// from 0.16 to 0.64 world per ctrl (fabric bridges, junction half-edges),
// so a ctrl count is not a size. 7 widths of arc: the census needed ~6.8
// for a 0.8-width hole in a teardrop eye before pressure; with pressure
// it is headroom. Applied the P3.39 way - RATE-LIMITED and mobility-
// scaled, rising from the CURRENT gap - so while a kink's contact is
// kinetic its loop can never lose material and grows into free room,
// while a pinned kink's standing push stays sub-stick and the graduated
// friction weld strangles it. It never outranks a neighbor: the ordering
// clamps (MIN_PASS_SEPARATION, the hard kink floor) always win, and a
// fused joint's jn ratchet or a twist twin's ratchet on the pass's outer
// side INTERSECTS with it (see easePassToward) - neither takes material
// from the other's unmet budget.
const KINK_EYE_ARC_MIN = 2.9;
const KINK_EYE_ARC_PER_WIDTH = 7.0;
const KINK_SEP_RATE = 0.015;
// EYE PRESSURE distance: the eye's DIAMETER target. Particles of one kink
// loop facing each other across the eye repel toward the CHORD of a round
// eye of this diameter (max(repulseDist, this x width)): the target of a
// pair Ds of rest arc apart on a loop of L is D sin(pi Ds / L) - the full
// diameter for diametric pairs, falling to zero toward the crossing
// (see applyKinkEyePressure). The knot's own spacing law, applied to the
// pairs the 6-ctrl exclusion hides. Width-scaled because the target is
// in widths. HISTORY: the first version (2.4, flat - every gated pair
// targeted the full diameter) demanded what the crossing cannot give:
// the loop's first and last particles flank the crossing ~0.3 world from
// it on the two passes, a whole diameter apart by fiat, so the pressure
// pried every kink crossing's bound pair open against the coupling
// (resting separation 0.04-0.06 world vs 0.01 now) and squeezed the
// neighboring eye - on the fat knot URL into a never-sleeping limit cycle
// (K41, with the 3D-closest-point bug in applySegmentCollision). The
// chord law asks nothing there; 2.6 restores the flat-2.4 eye sizes
// (medians within 0.01 widths on all five census URLs), since the
// diametric pairs carry the opening. Flat-law lore, for the record: 2.0 /
// 2.2 left fat eyes at 0.59 / 0.76 widths; flat 2.8 PUMPED (2/8 fat
// seeds) - the same crossing-core fight.
const KINK_EYE_DIST_PER_WIDTH = 2.6;
// Which pairs of a loop face each other ACROSS the eye: those at least
// this fraction of the loop's interior material apart along it (on a
// round loop, a chord of >= 0.89 diameters at 0.35). Relative to the
// loop, so small and large loops alike are pressurized only across their
// eye, never along a side.
const KINK_EYE_GATE_FRACTION = 0.35;
// TWIST contact spacing, in WORLD space. A twist's two crossings
// (adjacent along BOTH threads) can fold onto each other during a held
// grab: the along-thread ordering clamps stay satisfied (bindings >=
// MIN_PASS_SEPARATION apart ALONG the threads) while the two contact
// POINTS converge to ~0 in 2D - and each crossing's erase march is
// capped at ERASE_NEIGHBOR_CLEARANCE times the world arc to its twin,
// so both erase windows shrink to slivers and the two opposite-
// orientation patch systems overwrite each other as a raw painter's-
// order merge. No along-thread rule can see this; the floor must be
// world-space. Census (fat + default + kink seeds): healthy resting
// pairs sit at 1.03+ world, so the floor below engages only on
// abnormal folds. Two-tier authority mirrors the anti-riding law
// (P3.33): a hard tier that wins standing micro-fights against
// bending near the floor, a soft tier so deep deficits recover
// gently instead of ringing.
const TWIST_CONTACT_MIN_BASE = 0.72;
const TWIST_CONTACT_MIN_PER_WIDTH = 1.8;
const TWIST_HARD_SNAP = 0.12;
const TWIST_SOFT_STIFFNESS = 0.15;
// Below this separation the live axis between the contacts is noise;
// push along the last trusted axis instead.
const TWIST_AXIS_TRUST = 0.05;
// ALONG-THREAD material budget between twist twins (the kinkSep analog,
// twist-scoped). The world floor above cannot exceed the material arc
// connecting the contacts: with the generic 1.6-ctrl clamp a held fold
// pulls the eye into a TAUT CHORD (measured: ctrl gaps 1.6/1.6, arc
// 0.77, chord 0.77-0.81) - a stacked ride whose over/under flip has no
// clean flat-layer rendering. A bigger twist-only clamp keeps enough
// material that the eye stays OPEN (curved) at the world floor, so
// held twists render as two ordinary separated crossings. Twist-scoped
// like kinkSep, so the global MIN_PASS_SEPARATION corridor triangle
// (floor < 2.0 corridor pitch) is untouched for everything else.
const TWIST_MIN_SEPARATION = 2.2;
const TWIST_SEP_PER_WIDTH = 5.2;
// Max ctrl the twist ratchet may raise a pair's clamp floor per slide
// call (mobility-scaled). ~0.0075 world/substep - below the 1e-2 stick
// gate, so a pinned pair's standing push cannot hold the knot awake;
// a free eye still opens 1.6 -> 2.7 ctrl in ~0.6 s of kinetic time.
const TWIST_SEP_RATE = 0.015;
// JUNCTION-CROSSING material budget (P4 fabric; the jnSep ratchet).
// A fused joint wears tuck/fillet/seal joinery, and the renderer caps
// nearby under-gap cuts at the joint's clearance (junctionArcCtrls +
// jointClear in ribbon_renderer) - so a crossing that settles too close
// to a joint renders a truncated, cramped gap crowding the web. Reduce
// the INCIDENCE in physics: each fused joint acts as a FIXED virtual
// neighbor in the slide's ordering clamps for the FIRST crossing pass
// outward along each arm direction (recorded once at fusion time
// within JN_CLAMP_SCAN ctrl; pass order never changes, so "first" is
// build-stable). Budget calibrated from the resting census on the
// fabric repro (seed 2430477599, mf=1): healthy junction-adjacent
// passes sit at 2.0-2.5 ctrl (the corridor pitch), while the incidence
// tail sits at 1.4-2.0 ctrl = 0.53-0.65 world arc vs the render's
// jointClear + typical gap half-span ~0.66 world at default width.
// 5.7/width (= 2.4 ctrl ~ 0.79 world at tw 0.42) clears the tail while
// asking only ~0.4 ctrl above lattice pitch from the healthy cluster's
// lower edge; the base floors narrow threads at the twistSep base.
// Applied as a RATE-LIMITED RATCHET at the twist budget's proven rate
// (P3.39): the floor rises from the pair's CURRENT gap toward the
// budget at most JN_SEP_RATE (mobility-scaled) per slide, so a
// geometry-pinned pass's standing push stays sub-stick and the
// graduated friction weld strangles it - never a snap (the P3.39 snap
// version pinned a fat seed awake forever). The junction clamp runs
// BEFORE the pass-ordering clamps, so MIN_PASS_SEPARATION / kinkSep /
// twistSep always win conflicts - diagram topology is never forced,
// and in corridors too short for both budgets the pass simply parks
// below jnSep (its inward push is clamped away entirely, leaving no
// standing world push at all).
const JN_MIN_SEPARATION = 2.2;
const JN_SEP_PER_WIDTH = 5.7;
const JN_SEP_RATE = 0.015;
const JN_CLAMP_SCAN = 8;
// Crossing coverage for the anti-riding 2D floor is measured in WORLD
// ARC bounded by the renderer's erase reach - see updatePassCover.
const COUPLING_STIFFNESS = 0.7;
// Clamp lag (ctrl) at which the coupling has yielded to half strength.
const COUPLING_YIELD_LAG = 0.25;
// Static/kinetic contact friction. KINETIC (frictionless coupling -
// material slides through crossings) while the user drags, temperature
// agitates, or the knot is in motion; STATIC (full-vector coupling, the
// crossing grips its material points) once per-substep motion falls
// below STICK. Rationale: at rest the constraint set is a standing
// tug-of-war (bending/structural/collision each correct ~8e-2 per
// substep and cancel); friction pins its free tangential mode so the
// cancellation repeats identically and the knot can sleep, while a
// permanently frictionless contact lets the standoff wander forever
// (~3e-2 peaks, measured) - and no damping can quiet a constraint
// conflict. Hysteresis: re-release only on strong motion (UNSTICK), so
// the rest wander cannot unlock itself. A static weld is invisible at
// rest; kinetic sliding is active whenever the user can see motion.
// Engage must be SUB-VISIBLE: at 2.5e-2/substep the knot is still
// clearly flowing, and welding then reads as intersections snapping
// rigid to material points mid-motion. 1e-2 matches the historical rest
// oscillation floor. (Per-substep displacement conflates drift with
// oscillation; if freezing still reads wrong, the next refinement is
// net-displacement-over-a-window, which separates the two.)
const CONTACT_STICK_EPS = 1e-2; // Per-substep displacement, engage.
const CONTACT_UNSTICK_EPS = 2.5e-2; // Per-substep displacement, release.
// GRADUATED contact friction, the dissipation channel between fully
// kinetic and the deep-freeze above. Per crossing, from a smoothed
// contact speed: below LO the coupling keeps its full tangential
// component (weld); above HI it is fully projected off (frictionless);
// blended between. Rationale: the depth model removed the old exemption
// lens's parasitic tangential weld - which was ALSO the only dissipation
// for the PBD standoff (bending/structural/collision cancel ~1e-1 each
// at rest). Without any friction the standoff wanders at ~4e-2 forever,
// above the binary stick gate, and the knot never sleeps after play.
// Graduated + LOCAL: an active region (wave crest, agitation) stays
// slippery while quiet regions grip; while GRABBED the weld is released
// everywhere, so gestures never feel it (a weak tug moves material
// ~3e-3/substep - below LO - and would otherwise weld mid-gesture).
const CONTACT_WELD_HI = 3e-2;
const CONTACT_WELD_LO = 5e-3;
const CONTACT_SPEED_EMA = 0.15; // Per-substep blend into the average.
// Contacts within RADIUS of the grabbed particle are released (a weak
// tug moves material ~3e-3/substep - below WELD_LO - and would
// otherwise weld mid-gesture); the release tapers out by
// RADIUS + TAPER. Beyond that the speed sensing decides, keeping the
// response to a drag LOCAL. The release EASES in time (GATE_EASE per
// substep): welded crossings hold pent-up slide/torque corrections, and
// an instant release dumped them all at once - nearby crossings visibly
// twitched "in unrelated ways" at the start of every drag. Easing
// bleeds the stored stress out over ~100ms instead.
const GRAB_FREE_RADIUS = 1.2;
const GRAB_FREE_TAPER = 1.8;
const GRAB_GATE_EASE = 0.05;
// Depth field: the quasi-3D crossing model. Each pass tents its thread's
// depth to +/-amp over DEPTH_WINDOW ctrl around the binding; collision and
// repulsion treat threads as 3D capsules (required 2D separation
// sqrt(margin^2 - dz^2)). Contributions SUM, so a twist eye's midpoint
// (opposite-sign tents from its two crossings) returns to depth 0 and
// recovers the full width floor - eyes stay open with no tuned taper.
// The WINDOW must be NARROWER than MIN_PASS_SEPARATION (neighbor tents
// pinned at the ordering clamp must not cancel at the crossing - that
// cancellation was the post-play endless-jiggle pump) yet WIDE enough to
// keep a clamp-pinned binding's true intersection covered (lag reaches
// ~1.3 ctrl on over-tightened twists). 1.4 sits between the 1.6 clamp
// floor and the ~1.3 lag reach; see MIN_PASS_SEPARATION for the triangle
// of constraints.
// AMP_FACTOR is sized so the worst-case tent sampling (binding at ctrl
// x.5: nearest particles carry weight 1 - 0.5/W = 0.64 each) still fully
// exempts the crossing point: dz = 2 * 0.64 * amp >= margin.
const DEPTH_WINDOW = 1.4;
const DEPTH_AMP_FACTOR = 1.0;
// Per-substep ease of the real z toward its diagram target. Strong
// enough to enforce over/under ordering within a few substeps, soft
// enough that the (last-run, full-stiffness) collision projection wins
// wherever the layout genuinely overlaps.
const Z_EASE = 0.2;
// Laplacian fairing stiffness at smooth = 1.
const FAIRING_MAX = 0.3;
// Transversality torque: fraction of the angular error (toward the signed
// perpendicular) corrected per substep, and its per-substep clamp. The
// torque must rotate a WINDOW of particles around the binding, not just
// the binding segment: a single-segment rotation gets absorbed by bending
// and fairing as a local S-kink while the thread's course through the
// crossing stays tangential.
const TRANSVERSALITY_GAIN = 0.15;
const TRANSVERSALITY_MAX_STEP = 0.08;
const TRANSVERSALITY_WINDOW = 2; // Particles each side beyond the segment.
// Without lattice anchors the knot free-floats; a gentle pull keeps its
// centroid where it started (applied to positions and prev alike, so it
// injects no velocity).
const CENTER_PULL = 0.04;

// Merge coincidence stiffness (per-constraint, scaled by the global structural
// multiplier): a junction's arm terminals are pulled together by rest-0
// springs at near-full authority so the merge stays a tight point.
const JUNCTION_MERGE_STIFFNESS = 1.0;

// P4 maze mode topology generalization. A JUNCTION is a real degree-3+ merge:
// several open-chain ARMS whose terminals are pulled to coincidence (rest-0
// springs, so the flat per-particle topology is preserved - no shared index),
// with one designated STEM pair bent straight through the merge while the
// remaining arms branch off. An END is a degree-1 open-chain terminal anchored
// to a fixed off-screen point. In knot mode there are none of either, so the
// sim stays a set of closed chains.
export interface MazeJunction {
  // Each arm's terminal particle and the particle one step INWARD from it
  // (used for the straight-through bending of the stem pair).
  arms: Array<{ terminal: number; inward: number }>;
  stem: [number, number]; // indices into `arms` of the two collinear arms.
}
export interface MazeEnd {
  particle: number;
  chain: number;
  anchor: [number, number];
}

export class ParticleSystem {
  particleCount: number;
  positions: Float32Array;
  chains: number[][]; // Particle-index paths, one per strand (closed in knot mode).
  crossings: CrossingInfo[];

  // Topology generalization (P4 maze mode). Knot mode: chainClosed all true,
  // junctions/ends empty, anchored all 0 -> `hasCarve` false -> none of the
  // generalized code branches run, so the closed-loop path is byte-identical.
  chainClosed: boolean[] = [];
  // Per-chain cyclic seam that is REMOVED to open the loop: the segment
  // between chain slot `chainBreakAfter[c]` and slot +1 carries no
  // structural/bending spring and no collision segment, so the chain is a
  // path instead of a loop. -1 (the knot-mode default) = closed, every
  // break-aware branch takes its original cyclic path -> byte-identical.
  chainBreakAfter: number[] = [];
  junctions: MazeJunction[] = [];
  // Graph-carved junction fusions: each entry is the group of coincident
  // particles of one JUNCTION node (host pass-throughs + bridge/stub
  // terminals, or a merged crossing's two passes).
  fusedJunctions: number[][] = [];
  private junctionIdCounter = 0;
  // Particle -> index into fusedJunctions (-1 = not a fused member).
  // Empty in knot mode (no fusions).
  private fusedGroupOf: Int32Array = new Int32Array(0);
  // The fusion rest-0 springs, shared into `structural` (in-loop voice) and
  // re-applied as a final projection each substep (see the substep tail).
  private fusionConstraints: DistanceConstraint[] = [];
  ends: MazeEnd[] = [];
  anchored: Uint8Array = new Uint8Array(0);
  anchorPos: Float32Array = new Float32Array(0);
  // Particle indices with anchored[p] === 1, for the substep-end pin. Empty
  // in knot mode -> the pin loop is a no-op.
  private anchoredList: number[] = [];
  // Particle -> junction id (-1 none); the collision/repulsion exemption for
  // arms of the same merge. Shared into `topology.junctionOf`.
  private junctionOf: Int32Array = new Int32Array(0);

  private prev: Float32Array;
  private initial: Float32Array;
  private structural: DistanceConstraint[] = [];
  private bending: DistanceConstraint[] = [];
  private noise3D: (x: number, y: number, z: number) => number;
  private time = 0;
  private accumulator = 0;
  private substepCount = 0;
  private frameMaxMoveSq = 0;
  private grabbed = -1;
  private grabX = 0;
  private grabY = 0;
  private particleChain: Int32Array;
  private passesByChain: CrossingPass[][] = [];
  private passPrev = new Map<CrossingPass, CrossingPass>();
  private passNext = new Map<CrossingPass, CrossingPass>();
  private initialCtrl = new Map<CrossingPass, number>();
  // TRUE-3D depth: zPos is a real simulated per-particle coordinate
  // (collision/repulsion push it); zTargets are the soft diagram-derived
  // targets it eases toward (over passes +amp, under passes -amp, tents
  // along the thread, contributions summing).
  private zPos: Float32Array;
  private zTargets: Float32Array;
  private contacts: Float32Array;
  // Per-particle registered-crossing membership for the anti-riding
  // floor's crossing coverage (see PassCover in forces.ts). Rebuilt each
  // substep from pass ctrls - no incremental state, nothing to go stale.
  private passCoverSlot: Int32Array;
  private passCoverCov: Float32Array;
  // Junction cover (see JunctionCover in forces.ts): graded 2-slot marks
  // along each fused arm, built once at fusion time. null in knot mode,
  // so the collision pass sees undefined and behaves byte-identically.
  private jnCoverId: Int32Array = new Int32Array(0);
  private jnCoverCov: Float32Array = new Float32Array(0);
  private jnCover: JunctionCover | null = null;
  private topology!: SegmentTopology;
  private emergentCollector = {
    data: new Float32Array(EMERGENT_MAX * 4),
    n: 0,
  };
  private homeX = 0;
  private homeY = 0;

  constructor(graph: TangleGraph) {
    const initialPositions: number[] = [];
    const addParticle = (x: number, y: number): number => {
      initialPositions.push(x, y);
      return initialPositions.length / 2 - 1;
    };

    // Build fully independent chains: every node occurrence gets its own
    // particle (crossings appear once per pass). JUNCTION and anchored END
    // occurrences (maze fabric) are recorded for fusion/anchoring below;
    // knot-mode graphs have neither, so those paths stay inert.
    const occurrences = new Map<
      string,
      Array<{ pass: CrossingPass; isOver: boolean; overFirst?: boolean }>
    >();
    const junctionOcc = new Map<
      string,
      Array<{ chain: number; slot: number }>
    >();
    const endOcc: Array<{
      anchor: [number, number] | undefined;
      chain: number;
      slot: number;
    }> = [];

    this.chains = graph.strands.map((strand, chainIdx) => {
      const chain: number[] = [];
      // Closed strands repeat the start node at the end; open strands (maze
      // bridges/stubs and carved hosts) list every node exactly once.
      const nodeCount = strand.isClosed
        ? strand.nodes.length - 1
        : strand.nodes.length;
      for (let i = 0; i < nodeCount; i++) {
        const node = graph.nodes.get(strand.nodes[i])!;
        if (node.type === NODE_TYPE.CROSSING) {
          const pass: CrossingPass = { chain: chainIdx, ctrl: chain.length };
          const list = occurrences.get(node.id);
          const entry = { pass, isOver: node.isOver === true, overFirst: node.overFirst };
          if (list) list.push(entry);
          else occurrences.set(node.id, [entry]);
        } else if (node.type === NODE_TYPE.JUNCTION) {
          const rec = { chain: chainIdx, slot: chain.length };
          const list = junctionOcc.get(node.id);
          if (list) list.push(rec);
          else junctionOcc.set(node.id, [rec]);
        } else if (node.type === NODE_TYPE.END) {
          endOcc.push({
            anchor: node.anchor,
            chain: chainIdx,
            slot: chain.length,
          });
        }
        chain.push(addParticle(node.latticePos[0], node.latticePos[1]));

        // Open strands have one fewer edge than nodes; closed strands pair
        // every node with its outgoing edge (the condition is always true
        // there - byte-identical knot path).
        if (i < strand.edgeIds.length) {
          const edge = graph.edges.get(strand.edgeIds[i])!;
          const [pa, pb] = edge.latticePoints;
          chain.push(addParticle((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2));
        }
      }
      return chain;
    });

    this.particleCount = initialPositions.length / 2;
    this.initial = new Float32Array(initialPositions);
    this.positions = new Float32Array(this.initial);
    this.prev = new Float32Array(this.initial);
    this.zPos = new Float32Array(this.particleCount);
    this.zTargets = new Float32Array(this.particleCount);
    // Topology from the graph: knot-mode strands are all closed (-1 seam,
    // nothing anchored); maze-fabric open strands are natively open - their
    // "removed seam" is the nonexistent wrap segment (last slot), which makes
    // every Stage-1/2 seam-aware branch handle them with no extra cases.
    this.chainClosed = graph.strands.map((s) => s.isClosed);
    this.chainBreakAfter = this.chains.map((chain, i) =>
      graph.strands[i].isClosed ? -1 : chain.length - 1
    );
    this.anchored = new Uint8Array(this.particleCount);
    this.anchorPos = new Float32Array(this.particleCount * 2);

    for (let i = 0; i < this.particleCount; i++) {
      this.homeX += this.initial[i * 2];
      this.homeY += this.initial[i * 2 + 1];
    }
    this.homeX /= this.particleCount;
    this.homeY /= this.particleCount;

    this.buildConstraints();
    this.buildRestCum();
    this.crossings = this.assignCrossings(occurrences);
    this.buildPassOrder();
    this.buildTwistPairs();
    this.contacts = new Float32Array(this.crossings.length * 2);
    this.prevContacts = new Float32Array(this.crossings.length * 2);
    // Seed high so contacts start kinetic; the EMA settles within ~10
    // substeps.
    this.contactSpeedEma = new Float32Array(this.crossings.length).fill(1);
    this.grabGate = new Float32Array(this.crossings.length).fill(1);
    this.passCoverSlot = new Int32Array(this.particleCount * 4);
    this.passCoverCov = new Float32Array(this.particleCount * 4);

    this.particleChain = new Int32Array(this.particleCount).fill(-1);
    this.chains.forEach((chain, chainIdx) => {
      for (const p of chain) {
        if (this.particleChain[p] < 0) this.particleChain[p] = chainIdx;
      }
    });

    // Segment topology for capsule collision: every particle starts the
    // segment to its chain successor.
    const next = new Int32Array(this.particleCount);
    const ctrlOf = new Int32Array(this.particleCount);
    const chainLen = new Int32Array(this.particleCount);
    this.chains.forEach((chain, chainIdx) => {
      const brk = this.chainBreakAfter[chainIdx]; // -1 closed.
      for (let i = 0; i < chain.length; i++) {
        // Open-chain terminal: point at itself (a zero-length segment the
        // collision math skips) instead of wrapping to slot 0.
        next[chain[i]] = i === brk ? chain[i] : chain[(i + 1) % chain.length];
        ctrlOf[chain[i]] = i;
        chainLen[chain[i]] = chain.length;
      }
    });
    this.junctionOf = new Int32Array(this.particleCount).fill(-1);
    this.topology = {
      next,
      chainOf: this.particleChain,
      ctrlOf,
      chainLen,
      junctionOf: this.junctionOf,
    };
    this.buildKinkList();

    // Graph-carved maze fabric: fuse each JUNCTION node's particle
    // occurrences (host pass-through + bridge/stub terminals, or a merged
    // crossing's two passes) and pin anchored END nodes. Knot mode records
    // neither, so both loops are no-ops there.
    for (const occ of junctionOcc.values()) {
      if (occ.length >= 2) this.fuseJunction(occ);
    }
    for (const { anchor, chain, slot } of endOcc) {
      if (!anchor) continue; // Free tip (dead-end stub).
      const p = this.chains[chain][slot];
      this.setAnchor(p, anchor[0], anchor[1]);
      this.ends.push({ particle: p, chain, anchor });
    }

    // K115: a pinned strand (text) anchors every particle at its start.
    graph.strands.forEach((strand, chainIdx) => {
      if (!strand.pinned) return;
      for (const p of this.chains[chainIdx]) {
        this.setAnchor(p, this.initial[p * 2], this.initial[p * 2 + 1]);
      }
    });

    const noiseRng = new SeededRNG((graph.seed ^ 0x9e3779b9) >>> 0);
    this.noise3D = createNoise3D(() => noiseRng.next());
  }

  // Fuse one graph JUNCTION node's particle occurrences: rest-0 springs chain
  // consecutive occurrences to coincidence, and junctionOf marks each
  // occurrence plus its immediate chain neighbors so collision/repulsion
  // don't fight the merge (the arms legitimately meet here; the mark radius
  // keeps everything inside the collision floor exempt, while material one
  // more step out sits beyond it). junctionOf is single-slot: where two
  // junctions' neighborhoods touch (a short bridge's midpoint), the later
  // mark wins - the overwritten pair sits ~half a bridge away, outside the
  // floor, so nothing fights.
  private fuseJunction(occ: Array<{ chain: number; slot: number }>): void {
    const jid = this.junctionIdCounter++;
    if (this.jnCoverId.length === 0) {
      this.jnCoverId = new Int32Array(this.particleCount * 2).fill(-1);
      this.jnCoverCov = new Float32Array(this.particleCount * 2);
      this.jnCover = { id: this.jnCoverId, cov: this.jnCoverCov };
    }
    const group: number[] = [];
    for (const { chain, slot } of occ) {
      const chainArr = this.chains[chain];
      const len = chainArr.length;
      const brk = this.chainBreakAfter[chain];
      const p = chainArr[slot];
      group.push(p);
      this.junctionOf[p] = jid;
      // Chain neighbors, respecting the open seam (a bridge terminal's
      // "previous" wraps across the removed segment to the far end - skip).
      const prevSlot = (slot - 1 + len) % len;
      if (prevSlot !== brk) this.junctionOf[chainArr[prevSlot]] = jid;
      if (slot !== brk) this.junctionOf[chainArr[(slot + 1) % len]] = jid;
      // Graded junction COVER +/-3 ctrl along the arm (2-slot, so a short
      // bridge keeps BOTH of its junctions): the tuck/fillet joinery
      // renders this neighborhood as a joint, and a tucked arm hugs its
      // host ~2 ctrl past the merge - without cover the 2D anti-riding
      // floor records an unresolvable standing violation there every
      // substep and ridersPending blocks fabric sleep PERMANENTLY (the
      // 2026-10-10 audit's F1; one measured site held depth 0.247 for
      // 60+ sim-s). The unconditional 3D capsule still governs covered
      // pairs. Walks stop at the open seam like the hard marks above.
      const coverAt = (off: number): number =>
        off <= 1 ? 1 : off === 2 ? 0.7 : 0.3;
      let fwd = slot;
      for (let off = 0; off <= 3; off++) {
        this.markJnCover(chainArr[fwd], jid, coverAt(off));
        if (fwd === brk) break;
        fwd = (fwd + 1) % len;
      }
      let bwd = slot;
      for (let off = 1; off <= 3; off++) {
        if ((bwd - 1 + len) % len === brk) break;
        bwd = (bwd - 1 + len) % len;
        this.markJnCover(chainArr[bwd], jid, coverAt(off));
      }
      // Record this joint as a FIXED virtual neighbor for the first
      // crossing pass outward along each arm direction (the jnSep
      // ratchet; see JN_MIN_SEPARATION).
      this.recordJunctionClamps(chain, slot);
    }
    for (let k = 1; k < group.length; k++) {
      const spring: DistanceConstraint = {
        a: group[k - 1],
        b: group[k],
        rest: 0,
        stiffness: JUNCTION_MERGE_STIFFNESS,
      };
      this.structural.push(spring);
      this.fusionConstraints.push(spring);
    }
    // Particle -> fused group, for crossing coverage that continues
    // through the joint onto its other arms (updatePassCover).
    if (this.fusedGroupOf.length === 0) {
      this.fusedGroupOf = new Int32Array(this.particleCount).fill(-1);
    }
    for (const m of group) this.fusedGroupOf[m] = this.fusedJunctions.length;
    this.fusedJunctions.push(group);
  }

  // Find the FIRST crossing pass outward of a fused-junction occurrence
  // in each chain direction (within JN_CLAMP_SCAN ctrl, never across the
  // open seam) and stamp the joint's ctrl onto it as a fixed virtual
  // neighbor for the slide's ordering clamps (the jnSep ratchet; see
  // JN_MIN_SEPARATION). Build-once: the ordering clamps preserve pass
  // order, so the first-outward pass can never be overtaken, and the
  // joint's ctrl is a fixed chain slot. Runs inside the constructor's
  // fusion loop, after buildPassOrder - passesByChain is final. Knot
  // mode has no fusions, so no pass ever carries a record.
  private recordJunctionClamps(chainIdx: number, slot: number): void {
    const len = this.chains[chainIdx].length;
    const brk = this.chainBreakAfter[chainIdx]; // -1 closed.
    const cyc = (d: number): number => ((d % len) + len) % len;
    // Ctrl distance from the joint to the seam in each direction
    // (passes beyond it are on the far side of the removed segment).
    const seamF = brk >= 0 ? cyc(brk + 0.5 - slot) : Infinity;
    const seamB = brk >= 0 ? cyc(slot - (brk + 0.5)) : Infinity;
    let fwd: CrossingPass | null = null;
    let fwdD = JN_CLAMP_SCAN;
    let bwd: CrossingPass | null = null;
    let bwdD = JN_CLAMP_SCAN;
    for (const pass of this.passesByChain[chainIdx]) {
      const dF = cyc(pass.ctrl - slot);
      if (dF < fwdD && dF <= seamF) {
        fwd = pass;
        fwdD = dF;
      }
      const dB = cyc(slot - pass.ctrl);
      if (dB < bwdD && dB <= seamB) {
        bwd = pass;
        bwdD = dB;
      }
    }
    // Same pass on both sides (short closed chain): keep the nearer
    // side only - clamping one pass against the same joint from both
    // directions would squeeze it between two floors.
    if (fwd !== null && fwd === bwd) {
      if (fwdD <= bwdD) bwd = null;
      else fwd = null;
    }
    // Nearest joint wins when two claim the same pass side (ctrls are
    // still build-time integers here - fusion precedes any stepping).
    if (fwd) {
      const cur = fwd.jnPrevCtrl;
      if (cur === undefined || fwdD < cyc(fwd.ctrl - cur)) {
        fwd.jnPrevCtrl = slot;
      }
    }
    if (bwd) {
      const cur = bwd.jnNextCtrl;
      if (cur === undefined || bwdD < cyc(cur - bwd.ctrl)) {
        bwd.jnNextCtrl = slot;
      }
    }
  }

  // Keep the strongest two junction marks per particle.
  private markJnCover(p: number, jid: number, cov: number): void {
    const s = p * 2;
    for (let u = 0; u < 2; u++) {
      if (this.jnCoverId[s + u] === jid) {
        if (cov > this.jnCoverCov[s + u]) this.jnCoverCov[s + u] = cov;
        return;
      }
    }
    for (let u = 0; u < 2; u++) {
      if (this.jnCoverId[s + u] < 0) {
        this.jnCoverId[s + u] = jid;
        this.jnCoverCov[s + u] = cov;
        return;
      }
    }
    const w = this.jnCoverCov[s] <= this.jnCoverCov[s + 1] ? 0 : 1;
    if (cov > this.jnCoverCov[s + w]) {
      this.jnCoverId[s + w] = jid;
      this.jnCoverCov[s + w] = cov;
    }
  }

  private get jnCoverActive(): JunctionCover | undefined {
    return this.jnCover ?? undefined;
  }

  // True once the topology has been carved (open ends and/or junctions). In
  // knot mode this is false and every generalized code path is skipped.
  get hasCarve(): boolean {
    return (
      this.junctions.length > 0 ||
      this.fusedJunctions.length > 0 ||
      this.ends.length > 0
    );
  }

  isAnchored(i: number): boolean {
    return this.anchored[i] === 1;
  }

  private buildConstraints(): void {
    const dist = (a: number, b: number): number =>
      Math.hypot(
        this.initial[b * 2] - this.initial[a * 2],
        this.initial[b * 2 + 1] - this.initial[a * 2 + 1]
      );

    this.chains.forEach((chain, chainIdx) => {
      const len = chain.length;
      const brk = this.chainBreakAfter[chainIdx]; // -1 closed.
      for (let i = 0; i < len; i++) {
        const a = chain[i];
        const b = chain[(i + 1) % len];
        // Structural: skip the removed seam so the two loose ends aren't
        // held together (i === brk closed => never skips => byte-identical).
        if (i !== brk) {
          // Rests stored at full lattice length; the settle ramp scales them.
          this.structural.push({
            a,
            b,
            rest: dist(a, b),
            stiffness: STRUCTURAL_STIFFNESS,
          });
        }

        // Bending: pull i-1 and i+1 apart toward a straight line. Skip any
        // triple whose i-1..i or i..i+1 leg crosses the removed seam, so the
        // seam carries no straightening pull across the gap either.
        if (brk !== i && brk !== (i - 1 + len) % len) {
          const p = chain[(i - 1 + len) % len];
          this.bending.push({
            a: p,
            b,
            rest: dist(p, a) + dist(a, b),
            stiffness: BENDING_STIFFNESS,
            pullOnly: true,
          });
        }

        // (Nearby same-chain repulsion exclusion lives in applyRepulsion
        // itself now, as a topology ctrl-distance test.)
      }
    });
  }

  // KINK LOOPS (see KINK_EYE_ARC_PER_WIDTH): self-crossings whose two
  // passes are chain-order neighbors - an R1 monogon, the thread between
  // the passes being the loop. Pass order never changes, so the list is
  // fixed until the pass links are rebuilt (constructor, openChain).
  private buildKinkList(): void {
    this.kinks = [];
    for (const c of this.crossings) {
      if (c.over.chain !== c.under.chain) continue;
      const next = this.passNext.get(c.over);
      const prev = this.passPrev.get(c.over);
      const fwd = next === c.under && next !== c.over;
      const bwd = prev === c.under && prev !== c.over;
      if (fwd || bwd) this.kinks.push({ over: c.over, under: c.under, fwd, bwd });
    }
    this.kinkLoopOf = new Int32Array(this.particleCount).fill(-1);
    this.kinkLoopStart = new Int32Array(this.kinks.length);
    this.kinkLoopEnd = new Int32Array(this.kinks.length);
    this.kinkLoopLen = new Float64Array(this.kinks.length);
    // Kink-free scenes leave the topology field unset: applyRepulsion and
    // the fairing pass then take exactly their kink-free paths.
    this.topology.kinkOf = this.kinks.length > 0 ? this.kinkLoopOf : undefined;
  }

  // Per-substep kink-loop membership (kinkLoopOf: particle -> kink, -1
  // none) plus the flat particle / unwrapped lattice-arc lists the eye
  // pressure walks. The loop is every particle strictly between the two
  // bindings (a two-pass chain loops on both sides: the shorter one is the
  // eye).
  private updateKinkLoops(): void {
    this.kinkLoopOf.fill(-1);
    let n = 0;
    for (let k = 0; k < this.kinks.length; k++) {
      const { over, under, fwd, bwd } = this.kinks[k];
      const chain = this.chains[over.chain];
      const len = chain.length;
      const cyc = (d: number): number => ((d % len) + len) % len;
      const sF = cyc(under.ctrl - over.ctrl);
      const sB = cyc(over.ctrl - under.ctrl);
      const useF = fwd && (!bwd || sF <= sB);
      const a = useF ? over.ctrl : under.ctrl;
      const span = useF ? sF : sB;
      const cum = this.chainRestCum[over.chain];
      // Rest arc between the two bindings (the loop's material, lattice
      // units, unwrapped like kinkLoopArc): the eye pressure's chord law.
      const restAt = (f: number): number => {
        const fl = Math.floor(f);
        const slot = ((fl % len) + len) % len;
        return (
          cum[slot] +
          Math.floor(fl / len) * cum[len] +
          (f - fl) * (cum[slot + 1] - cum[slot])
        );
      };
      this.kinkLoopLen[k] = restAt(a + span) - restAt(a);
      this.kinkLoopStart[k] = n;
      for (let s = Math.floor(a) + 1; s < a + span; s++) {
        if (n >= this.kinkLoopParts.length) {
          const parts = new Int32Array(this.kinkLoopParts.length * 2 + 64);
          parts.set(this.kinkLoopParts);
          this.kinkLoopParts = parts;
          const arcs = new Float64Array(parts.length);
          arcs.set(this.kinkLoopArc);
          this.kinkLoopArc = arcs;
        }
        const slot = cyc(s);
        const p = chain[slot];
        this.kinkLoopOf[p] = k;
        this.kinkLoopParts[n] = p;
        // Unwrapped along the loop (a closed chain's loop may straddle
        // slot 0).
        this.kinkLoopArc[n] = cum[slot] + (s >= len ? cum[len] : 0);
        n++;
      }
      this.kinkLoopEnd[k] = n;
    }
  }

  // EYE PRESSURE (see KINK_EYE_DIST_PER_WIDTH): the same soft 3D
  // repulsion law applyRepulsion applies between any two threads, between
  // particles of ONE kink loop that face each other across the eye. The
  // global repulsion skips same-chain pairs within 6 ctrl (it exists to
  // keep straight runs from accordion-buckling), and a lattice kink is 8
  // ctrl: its loop never repelled itself at all, while each loop arm WAS
  // repelled by the opposite pass's tail - an asymmetric squeeze that
  // pushed the arms together (measured at rest: -23e-3 and -26e-3 per
  // substep on the two arm particles, into the eye). Pairs qualify by
  // REST ARC along the loop, not ctrl (segments rest 0.16-0.64 world per
  // ctrl): at least KINK_EYE_GATE_FRACTION of the loop's material apart,
  // so a pair is always across the eye, never neighbors along one side -
  // the force is eye pressure, not a stretch along the thread. The global
  // pass skips these pairs (topology.kinkOf), so nothing counts twice.
  //
  // The target is the CHORD of a round eye of diameter eyeDist: a pair Ds
  // of rest arc apart on a loop of L rest arc between the bindings wants
  // eyeDist * sin(pi Ds / L) - diametric pairs the whole diameter, pairs
  // that flank the crossing almost nothing. Every target is met at once by
  // a round eye, so the law never asks for an impossible shape; a flat
  // target asked the two loop ends beside the crossing to stand a full
  // diameter apart, which only tearing the crossing open could give (see
  // KINK_EYE_DIST_PER_WIDTH).
  private applyKinkEyePressure(eyeDist: number, stiffness: number): void {
    const P = this.positions;
    const Z = this.zPos;
    const d2Max = eyeDist * eyeDist;
    for (let k = 0; k < this.kinks.length; k++) {
      const start = this.kinkLoopStart[k];
      const end = this.kinkLoopEnd[k];
      if (end - start < 2) continue;
      const gateLattice =
        KINK_EYE_GATE_FRACTION *
        (this.kinkLoopArc[end - 1] - this.kinkLoopArc[start]);
      const loopLen = this.kinkLoopLen[k];
      if (!(loopLen > 1e-9)) continue;
      const phase = Math.PI / loopLen;
      for (let u = start; u < end; u++) {
        const i = this.kinkLoopParts[u];
        const arcI = this.kinkLoopArc[u];
        for (let v = u + 1; v < end; v++) {
          const dS = this.kinkLoopArc[v] - arcI;
          if (dS < gateLattice) continue;
          const j = this.kinkLoopParts[v];
          const dx = P[j * 2] - P[i * 2];
          const dy = P[j * 2 + 1] - P[i * 2 + 1];
          const dz = Z[j] - Z[i];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= d2Max || d2 < 1e-9) continue;
          const target = eyeDist * Math.sin(Math.min(Math.PI, dS * phase));
          if (d2 >= target * target) continue;
          const dist = Math.sqrt(d2);
          const push = ((target - dist) / dist) * stiffness * 0.5;
          P[i * 2] -= dx * push;
          P[i * 2 + 1] -= dy * push;
          P[j * 2] += dx * push;
          P[j * 2 + 1] += dy * push;
          Z[i] -= dz * push;
          Z[j] += dz * push;
        }
      }
    }
  }

  // Cumulative lattice rest arc per chain (see chainRestCum). An open
  // chain's seam entry (last slot -> slot 0) is a phantom; kink loops
  // never straddle the seam (its pass pair is unlinked), so it is unread.
  private buildRestCum(): void {
    this.chainRestCum = this.chains.map((chain) => {
      const len = chain.length;
      const cum = new Float64Array(len + 1);
      for (let k = 0; k < len; k++) {
        const a = chain[k];
        const b = chain[(k + 1) % len];
        cum[k + 1] =
          cum[k] +
          Math.hypot(
            this.initial[b * 2] - this.initial[a * 2],
            this.initial[b * 2 + 1] - this.initial[a * 2 + 1]
          );
      }
      return cum;
    });
  }

  // Ctrl gap from `anchor` (walking `dir` along the chain) that holds the
  // kink-eye rest-material budget (kinkEyeLattice), capped at half the
  // chain. Pure function of ctrl - no geometry feedback, so a squeezed
  // eye cannot read as "short" and drive the ratchet on.
  private kinkGapTarget(chainIdx: number, anchor: number, dir: number): number {
    const cum = this.chainRestCum[chainIdx];
    const len = cum.length - 1;
    const cap = len / 2;
    const seg = (k: number): number => cum[k + 1] - cum[k];
    const a = ((anchor % len) + len) % len;
    let k = Math.min(len - 1, Math.floor(a));
    let remaining = this.kinkEyeLattice;
    let g = 0;
    if (dir > 0) {
      let frac = a - k; // Consumed part of segment k.
      while (g < cap) {
        const s = seg(k);
        const avail = s * (1 - frac);
        if (avail >= remaining && s > 1e-9) return g + remaining / s;
        remaining -= avail;
        g += 1 - frac;
        frac = 0;
        k = (k + 1) % len;
      }
    } else {
      let frac = a - k; // Available part of segment k, behind the anchor.
      while (g < cap) {
        const s = seg(k);
        const avail = s * frac;
        if (avail >= remaining && s > 1e-9) return g + remaining / s;
        remaining -= avail;
        g += frac;
        frac = 1;
        k = (k - 1 + len) % len;
      }
    }
    return cap;
  }

  // P4 maze mode. Carve a closed chain OPEN by removing the cyclic seam
  // after chain slot `breakAfter`: the two flanking particles become loose
  // ends, pinned to fixed (off-screen) anchor points so the thread hangs
  // between them. Crossings are untouched - the carved seam must be a plain
  // edge, not a crossing pass. Knot mode never calls this; every break-aware
  // branch keeps its cyclic form until it does.
  openChain(
    chainIndex: number,
    breakAfter: number,
    anchorA: [number, number] | null,
    anchorB: [number, number] | null
  ): void {
    if (this.fusedJunctions.length > 0) {
      // rebuildTopology below resets and re-derives the per-chain constraint
      // lists, which would silently DROP the graph-carved fusion springs.
      // Graph-built fabrics carve at graph level instead (applyMazeCuts).
      throw new Error("openChain is unsupported after graph junction fusion.");
    }
    const chain = this.chains[chainIndex];
    const len = chain.length;
    this.chainClosed[chainIndex] = false;
    this.chainBreakAfter[chainIndex] = breakAfter;
    const pa = chain[breakAfter];
    const pb = chain[(breakAfter + 1) % len];
    // A null anchor leaves that terminal FREE (a junction arm fuses it to
    // other arms instead of pinning it off-screen).
    if (anchorA) {
      this.setAnchor(pa, anchorA[0], anchorA[1]);
      this.ends.push({ particle: pa, chain: chainIndex, anchor: anchorA });
    }
    if (anchorB) {
      this.setAnchor(pb, anchorB[0], anchorB[1]);
      this.ends.push({ particle: pb, chain: chainIndex, anchor: anchorB });
    }
    this.rebuildTopology();
    // Re-derive pass links + twist pairs so the seam's straddling passes are
    // unlinked (crossings themselves are unchanged by an open plain edge).
    this.buildPassOrder();
    this.buildTwistPairs();
    this.buildKinkList();
  }

  // P4 maze mode. Fuse several open-chain ARM terminals into a degree-3+
  // merge: rest-0 springs pull the terminals to coincidence and a pullOnly
  // bending constraint runs the STEM pair straight through, while the other
  // arms branch off. The arms must already be OPEN (openChain, free terminals)
  // and this must run AFTER all openChain calls - rebuildTopology rebuilds the
  // per-chain constraints and would drop these otherwise. Collision/repulsion
  // between the arms is exempted near the merge via junctionOf.
  addJunction(
    arms: Array<{ terminal: number; inward: number }>,
    stem: [number, number]
  ): void {
    if (arms.length < 3) throw new Error("A junction needs at least 3 arms.");
    const jid = this.junctionIdCounter++;
    this.junctions.push({ arms, stem });

    const dist = (a: number, b: number): number =>
      Math.hypot(
        this.positions[b * 2] - this.positions[a * 2],
        this.positions[b * 2 + 1] - this.positions[a * 2 + 1]
      );

    // Coincidence: a chain of rest-0 springs joining consecutive terminals
    // pulls every arm terminal to the same point (a rigid merge).
    for (let k = 1; k < arms.length; k++) {
      this.structural.push({
        a: arms[k - 1].terminal,
        b: arms[k].terminal,
        rest: 0,
        stiffness: JUNCTION_MERGE_STIFFNESS,
      });
    }

    // Straight-through: bend the two stem arms' inward particles apart so the
    // stem reads as one smooth line passing through the merged terminals.
    const s0 = arms[stem[0]];
    const s1 = arms[stem[1]];
    this.bending.push({
      a: s0.inward,
      b: s1.inward,
      rest: dist(s0.inward, s0.terminal) + dist(s1.terminal, s1.inward),
      stiffness: BENDING_STIFFNESS,
      pullOnly: true,
    });

    // Exempt the merge zone from collision/repulsion between arms.
    for (const arm of arms) {
      this.junctionOf[arm.terminal] = jid;
      this.junctionOf[arm.inward] = jid;
    }
  }

  private setAnchor(p: number, x: number, y: number): void {
    if (this.anchored[p] !== 1) this.anchoredList.push(p);
    this.anchored[p] = 1;
    this.anchorPos[p * 2] = x;
    this.anchorPos[p * 2 + 1] = y;
    this.positions[p * 2] = x;
    this.positions[p * 2 + 1] = y;
    this.prev[p * 2] = x;
    this.prev[p * 2 + 1] = y;
  }

  // Re-derive constraints + the collision segment successors after the chain
  // topology (chainBreakAfter) changes. Crossings/passes are unaffected by an
  // open seam, so only structural/bending and topology.next are rebuilt.
  private rebuildTopology(): void {
    this.structural = [];
    this.bending = [];
    this.buildConstraints();
    this.chains.forEach((chain, chainIdx) => {
      const len = chain.length;
      const brk = this.chainBreakAfter[chainIdx];
      for (let i = 0; i < len; i++) {
        this.topology.next[chain[i]] =
          i === brk ? chain[i] : chain[(i + 1) % len];
      }
    });
  }

  // Pair up the two passes of each crossing and assign over/under from the
  // graph's checkerboard bit (isOver = the "/" pass goes over), using the
  // initial geometry for the diagonal class of each pass.
  private assignCrossings(
    occurrences: Map<string, Array<{ pass: CrossingPass; isOver: boolean; overFirst?: boolean }>>
  ): CrossingInfo[] {
    const crossings: CrossingInfo[] = [];
    for (const list of occurrences.values()) {
      if (list.length !== 2) {
        throw new Error("Crossing does not have exactly two passes; bug.");
      }
      const isSlash = (pass: CrossingPass): boolean => {
        const chain = this.chains[pass.chain];
        const p = chain[pass.ctrl];
        const next = chain[(pass.ctrl + 1) % chain.length];
        const vx = this.initial[next * 2] - this.initial[p * 2];
        const vy = this.initial[next * 2 + 1] - this.initial[p * 2 + 1];
        return vx * vy > 0;
      };
      const slashFirst = isSlash(list[0].pass);
      const overFirst = list[0].overFirst !== undefined ? list[0].overFirst : list[0].isOver ? slashFirst : !slashFirst;
      const over = overFirst ? list[0].pass : list[1].pass;
      const under = overFirst ? list[1].pass : list[0].pass;

      const tangent = (pass: CrossingPass): [number, number] => {
        const chain = this.chains[pass.chain];
        const a = chain[pass.ctrl];
        const b = chain[(pass.ctrl + 1) % chain.length];
        return [
          this.initial[b * 2] - this.initial[a * 2],
          this.initial[b * 2 + 1] - this.initial[a * 2 + 1],
        ];
      };
      const [ox, oy] = tangent(over);
      const [ux, uy] = tangent(under);
      over.partner = under;
      under.partner = over;
      crossings.push({
        over,
        under,
        sign: Math.sign(ox * uy - oy * ux) || 1,
      });
    }
    return crossings;
  }

  // Sorted pass lists per chain, with cyclic prev/next links used by the
  // slide's ordering clamps (and by the renderer's patch clearances). On an
  // OPEN chain the one consecutive pass pair straddling the removed seam is
  // unlinked (each side points at itself) so the two loose ends' passes are
  // not treated as chain-order neighbors - the ordering clamp and twist
  // detection skip that phantom adjacency.
  private buildPassOrder(): void {
    this.passesByChain = this.chains.map(() => []);
    for (const c of this.crossings) {
      this.passesByChain[c.over.chain].push(c.over);
      this.passesByChain[c.under.chain].push(c.under);
      this.initialCtrl.set(c.over, c.over.ctrl);
      this.initialCtrl.set(c.under, c.under.ctrl);
    }
    this.passesByChain.forEach((list, chainIdx) => {
      list.sort((a, b) => a.ctrl - b.ctrl);
      const m = list.length;
      for (let i = 0; i < m; i++) {
        this.passNext.set(list[i], list[(i + 1) % m]);
        this.passPrev.set(list[i], list[(i - 1 + m) % m]);
      }
      const brk = this.chainBreakAfter[chainIdx];
      if (brk < 0 || m === 0) return; // Closed (or empty): fully cyclic.
      // The seam sits between slots brk and brk+1, i.e. at ctrl brk + 0.5.
      // Break the one consecutive pass pair whose forward ctrl-arc spans it.
      const x = brk + 0.5;
      for (let i = 0; i < m; i++) {
        const a = list[i];
        const b = list[(i + 1) % m];
        const spans =
          a.ctrl < b.ctrl
            ? x > a.ctrl && x < b.ctrl
            : x > a.ctrl || x < b.ctrl; // wrap pair
        if (spans) {
          this.passNext.set(a, a);
          this.passPrev.set(b, b);
          break;
        }
      }
    });
  }

  passNeighbors(pass: CrossingPass): { prev: CrossingPass; next: CrossingPass } {
    return {
      prev: this.passPrev.get(pass) ?? pass,
      next: this.passNext.get(pass) ?? pass,
    };
  }

  // Twist pairs: crossings whose passes are chain-order neighbors on
  // BOTH threads (a bigon in the diagram). Pass order never changes
  // (the ordering clamps preserve it), so this is build-once. Kinks
  // (partner adjacency, same crossing) are excluded by j === i.
  private buildTwistPairs(): void {
    const passCrossing = new Map<CrossingPass, number>();
    for (let i = 0; i < this.crossings.length; i++) {
      passCrossing.set(this.crossings[i].over, i);
      passCrossing.set(this.crossings[i].under, i);
    }
    const seen = new Set<number>();
    const list: number[] = [];
    for (let i = 0; i < this.crossings.length; i++) {
      const a = this.crossings[i];
      for (const qA of [this.passNext.get(a.over), this.passPrev.get(a.over)]) {
        if (!qA) continue;
        const j = passCrossing.get(qA);
        if (j === undefined || j === i) continue;
        const b = this.crossings[j];
        const qB = b.over === qA ? b.under : b.over;
        if (qB.chain !== a.under.chain) continue;
        if (
          this.passNext.get(a.under) !== qB &&
          this.passPrev.get(a.under) !== qB
        ) {
          continue;
        }
        const key = Math.min(i, j) * 65536 + Math.max(i, j);
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(i, j);
        // Fill bias for the renderer's twist-flip treatment: over-fill
        // meshes draw in crossing order, so the HIGHER-indexed crossing
        // of a pair wins overlaps; its fill extends across the flip.
        const s = i > j ? 1 : -1;
        this.setTwistBias(a.over, qA, s);
        this.setTwistBias(qA, a.over, -s);
        this.setTwistBias(a.under, qB, s);
        this.setTwistBias(qB, a.under, -s);
      }
    }
    this.twistPairs = Int32Array.from(list);
    this.twistAxis = new Float32Array(list.length);
    for (let p = 0; p * 2 < list.length; p++) {
      const ca = this.crossings[list[p * 2]];
      const cb = this.crossings[list[p * 2 + 1]];
      this.bindingPoint(ca.over, this.bindScratch, 0);
      this.bindingPoint(cb.over, this.bindScratch, 2);
      const dx = this.bindScratch[2] - this.bindScratch[0];
      const dy = this.bindScratch[3] - this.bindScratch[1];
      const d = Math.hypot(dx, dy) || 1;
      this.twistAxis[p * 2] = dx / d;
      this.twistAxis[p * 2 + 1] = dy / d;
    }
  }

  // World position of a fractional control position along a chain
  // (optionally read from another position array, e.g. prev).
  pointOnChain(
    chainIndex: number,
    f: number,
    out: Float32Array,
    offset: number,
    source: Float32Array = this.positions
  ): void {
    const chain = this.chains[chainIndex];
    const len = chain.length;
    const i = Math.floor(f);
    const t = f - i;
    const a = chain[((i % len) + len) % len];
    const b = chain[(((i + 1) % len) + len) % len];
    out[offset] = source[a * 2] * (1 - t) + source[b * 2] * t;
    out[offset + 1] = source[a * 2 + 1] * (1 - t) + source[b * 2 + 1] * t;
  }

  bindingPoint(pass: CrossingPass, out: Float32Array, offset: number): void {
    this.pointOnChain(pass.chain, pass.ctrl, out, offset);
  }

  // Separation between a crossing's two bound points (diagnostic/tests).
  crossingSeparation(c: CrossingInfo): number {
    this.bindingPoint(c.over, this.bindScratch, 0);
    this.bindingPoint(c.under, this.bindScratch, 2);
    return Math.hypot(
      this.bindScratch[2] - this.bindScratch[0],
      this.bindScratch[3] - this.bindScratch[1]
    );
  }
  private bindScratch = new Float32Array(4);
  private tangentScratch = new Float32Array(4);
  private slideScratch = new Float32Array(4);
  // Twist pairs (2 crossing indices per pair) and each pair's last
  // trusted separation axis (2 floats per pair); see buildTwistPairs.
  private twistPairs = new Int32Array(0);
  private twistAxis = new Float32Array(0);
  // Per pass-adjacency fill bias for twist twins (see buildTwistPairs).
  private twistBias = new Map<CrossingPass, Map<CrossingPass, number>>();

  private setTwistBias(
    p: CrossingPass,
    q: CrossingPass,
    s: number
  ): void {
    let m = this.twistBias.get(p);
    if (!m) {
      m = new Map();
      this.twistBias.set(p, m);
    }
    m.set(q, s);
  }

  // +1: `pass`'s crossing twins with `neighbor`'s and draws LATER (its
  // over-fill wins overlaps at the flip); -1: twins but draws earlier;
  // 0: not a twist adjacency.
  twistFillBias(pass: CrossingPass, neighbor: CrossingPass): number {
    return this.twistBias.get(pass)?.get(neighbor) ?? 0;
  }
  private stickyContacts = false;
  // Width-scaled kink-eye material budget, refreshed each substep.
  private kinkSep = KINK_MIN_SEPARATION;
  // Kink-eye rest-material budget in LATTICE rest units (world arc / the
  // settled shrink), refreshed each substep (see KINK_EYE_ARC_PER_WIDTH).
  private kinkEyeLattice = KINK_EYE_ARC_MIN;
  // Per-chain cumulative lattice rest arc: entry k = rest arc from slot 0
  // to slot k (len + 1 entries; the structural rests ARE these lattice
  // distances). Static - built once from the initial positions.
  private chainRestCum: Float64Array[] = [];
  // Kink loops (see buildKinkList / updateKinkLoops): the kink crossings'
  // passes with which side of the over pass the loop lies on, per-particle
  // loop membership, and the flat per-substep loop lists.
  private kinks: Array<{
    over: CrossingPass;
    under: CrossingPass;
    fwd: boolean;
    bwd: boolean;
  }> = [];
  private kinkLoopOf: Int32Array = new Int32Array(0);
  private kinkLoopStart: Int32Array = new Int32Array(0);
  private kinkLoopEnd: Int32Array = new Int32Array(0);
  private kinkLoopParts: Int32Array = new Int32Array(256);
  private kinkLoopArc: Float64Array = new Float64Array(256);
  // Per kink: rest arc between its two bindings (lattice units) - the
  // eye pressure's chord law (see applyKinkEyePressure).
  private kinkLoopLen: Float64Array = new Float64Array(0);
  // Width-scaled twist-eye material budget (see TWIST_MIN_SEPARATION).
  private twistSep = TWIST_MIN_SEPARATION;
  // Width-scaled junction-crossing material budget (see
  // JN_MIN_SEPARATION). Read only by passes carrying jn clamp records,
  // which exist only on the maze fabric.
  private jnSep = JN_MIN_SEPARATION;
  // (The loud-attractor A/B knobs - ab* multipliers and the slip-EMA
  // plumbing - were removed after their experiments concluded; the
  // measured verdicts live in the loud-attractor entry of
  // .claude/rules/physics-collision.md and the code in commit 0b91d15 if
  // fingerprinting is ever re-run.)
  // Per-crossing smoothed contact speed (units/substep) and the previous
  // contact points, for GRADUATED contact friction (see weldFactor).
  private contactSpeedEma: Float32Array = new Float32Array(0);
  private prevContacts: Float32Array = new Float32Array(0);
  // Per-crossing eased grab-release gate: 1 = weld allowed, 0 = released.
  private grabGate: Float32Array = new Float32Array(0);
  // Standing hard violations at substep end ([x, y, depth] rows), from
  // the last final-authority collision sweep. (A violation-driven local
  // weld release was tried here and REJECTED - it fed the loud
  // attractor. The list's remaining jobs: block the global stick and
  // the sleep gate, so the knot never freezes ON a rendered merge.)
  private violationList = { data: new Float32Array(32 * 3), n: 0 };

  get simTime(): number {
    return this.time;
  }

  // The step accumulator: simulated time requested but not yet run, under
  // one SUBSTEP between frames unless MAX_SUBSTEPS_PER_FRAME cut a frame
  // short (K147's budget reads it, read-only).
  get pendingTime(): number {
    return this.accumulator;
  }

  get maxMove(): number {
    return Math.sqrt(this.frameMaxMoveSq);
  }

  get settleComplete(): boolean {
    return this.time > SETTLE_DURATION + 0.3;
  }

  reset(): void {
    this.positions.set(this.initial);
    this.prev.set(this.initial);
    this.time = 0;
    this.accumulator = 0;
    this.grabbed = -1;
    this.stickyContacts = false;
    this.contactSpeedEma.fill(1);
    this.grabGate.fill(1);
    this.violationList.n = 0;
    this.prevContacts.fill(0);
    this.zPos.fill(0);
    for (const [pass, ctrl] of this.initialCtrl) {
      pass.ctrl = ctrl;
      pass.displayF = undefined;
    }
  }

  get grabbedParticle(): number {
    return this.grabbed;
  }

  // Chain owning a particle (pure query; -1 if unknown). Lets the pointer
  // layer pick the pluck voice at pointerup, BEFORE the deferred release.
  chainOfParticle(p: number): number {
    return p >= 0 && p < this.particleChain.length ? this.particleChain[p] : -1;
  }

  // True while contacts are in the STATIC (welded/frozen) regime.
  get contactsStatic(): boolean {
    return this.stickyContacts;
  }

  // Standing hard violations of the anti-riding floor at substep end.
  // Nonzero means an unrenderable overlap is still being worked on -
  // the sleep gate must not freeze the knot on it.
  get ridersPending(): number {
    return this.violationList.n;
  }

  // Nearest particle within radius (lattice units), or -1. Pure query.
  nearest(x: number, y: number, radius: number): number {
    let best = -1;
    let bestDistSq = radius * radius;
    for (let i = 0; i < this.particleCount; i++) {
      const dx = this.positions[i * 2] - x;
      const dy = this.positions[i * 2 + 1] - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = i;
      }
    }
    return best;
  }

  // Grab the nearest particle within radius; returns its index or -1.
  // While grabbed, substeps pull it stiffly toward the drag target, and
  // the springs propagate the tug through the knot.
  grab(x: number, y: number, radius = 0.7): number {
    return this.grabAt(this.nearest(x, y, radius), x, y);
  }

  // Grab particle `p` (picked by the caller, e.g. with nearest()) with its
  // drag target at (x, y); -1 or an index out of range grabs nothing.
  // Returns the grabbed index or -1. K7: main picks on its read view and
  // the physics host grabs by index, so a worker grabs what main picked.
  grabAt(p: number, x: number, y: number): number {
    this.grabbed = p >= 0 && p < this.particleCount ? p : -1;
    if (this.grabbed >= 0) {
      this.grabX = x;
      this.grabY = y;
    }
    return this.grabbed;
  }

  dragTo(x: number, y: number): void {
    this.grabX = x;
    this.grabY = y;
  }

  // Release the grabbed particle; reports which chain was plucked and the
  // release speed (lattice units/second) for pluck loudness.
  release(): { particle: number; chain: number; speed: number } | null {
    if (this.grabbed < 0) return null;
    const p = this.grabbed;
    this.grabbed = -1;
    const vx = this.positions[p * 2] - this.prev[p * 2];
    const vy = this.positions[p * 2 + 1] - this.prev[p * 2 + 1];
    return {
      particle: p,
      chain: this.particleChain[p],
      speed: Math.hypot(vx, vy) / SUBSTEP,
    };
  }

  // K279 TUG: a tap-pluck's small physical kick. Displaces the chain's
  // slots strictly between ctrls c0 and c1 (cTap between them) by a sine
  // bump of peak `amp` world units along the thread's normal (side +1 =
  // (-ty, tx), beginRelease's convention), the bump's crest at cTap. The
  // move goes into positions AND prev, so it starts at rest and the springs
  // pull it back; the caller wakes the solver. A closed chain wraps, an
  // open one never moves its two ends (joints and tips), and the grabbed
  // particle stays put. Returns how many particles moved.
  tug(chain: number, c0: number, c1: number, cTap: number, side: number, amp: number): number {
    const arr = this.chains[chain];
    if (!arr || arr.length < 3 || !(amp > 0) || !(c1 > c0)) return 0;
    const len = arr.length;
    const closed = this.chainBreakAfter[chain] < 0;
    const tap = Math.max(c0 + 1e-6, Math.min(c1 - 1e-6, cTap));
    const pos = this.positions;
    const prev = this.prev;
    // Displacements first, from the unmoved shape.
    const moves: number[] = [];
    for (let k = Math.floor(c0) + 1; k < c1; k++) {
      let s = k;
      if (closed) s = ((k % len) + len) % len;
      else if (k <= 0 || k >= len - 1) continue;
      const p = arr[s];
      if (p === this.grabbed) continue;
      const u = k <= tap ? (0.5 * (k - c0)) / (tap - c0) : 0.5 + (0.5 * (k - tap)) / (c1 - tap);
      const d = amp * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
      if (!(d > 0)) continue;
      const a = arr[closed ? (s - 1 + len) % len : Math.max(0, s - 1)];
      const b = arr[closed ? (s + 1) % len : Math.min(len - 1, s + 1)];
      const tx = pos[b * 2] - pos[a * 2];
      const ty = pos[b * 2 + 1] - pos[a * 2 + 1];
      const tl = Math.sqrt(tx * tx + ty * ty);
      if (!(tl > 1e-9)) continue;
      moves.push(p, (-ty / tl) * side * d, (tx / tl) * side * d);
    }
    for (let i = 0; i < moves.length; i += 3) {
      const p = moves[i];
      pos[p * 2] += moves[i + 1];
      pos[p * 2 + 1] += moves[i + 2];
      prev[p * 2] += moves[i + 1];
      prev[p * 2 + 1] += moves[i + 2];
    }
    return moves.length / 3;
  }

  // Thread pairs that tunneled through each other during motion: real
  // visual crossings absent from the graph. Over/under is assigned
  // deterministically (coarse ctrl compare, so it doesn't flap frame to
  // frame as bindings drift).
  get emergentCrossings(): Array<{ over: CrossingPass; under: CrossingPass }> {
    const out: Array<{ over: CrossingPass; under: CrossingPass }> = [];
    const { data, n } = this.emergentCollector;
    for (let k = 0; k < n; k++) {
      const i = data[k * 4];
      const u = data[k * 4 + 1];
      const j = data[k * 4 + 2];
      const v = data[k * 4 + 3];
      out.push(this.emergentPair(i, u, j, v, this.emergentAOver(i, u, j, v)));
    }
    return out;
  }

  // One emergent crossing from its collector row: segment i at fraction u
  // and segment j at fraction v, `aOver` = the first thread rides higher.
  protected emergentPair(
    i: number,
    u: number,
    j: number,
    v: number,
    aOver: boolean
  ): { over: CrossingPass; under: CrossingPass } {
    const a: CrossingPass = {
      chain: this.topology.chainOf[i],
      ctrl: this.topology.ctrlOf[i] + u,
    };
    const b: CrossingPass = {
      chain: this.topology.chainOf[j],
      ctrl: this.topology.ctrlOf[j] + v,
    };
    return aOver ? { over: a, under: b } : { over: b, under: a };
  }

  // Over/under from REAL z: with the simulated third coordinate, the
  // thread that rides higher at the overlap genuinely is the over thread
  // (collision separated them in z).
  private emergentAOver(i: number, u: number, j: number, v: number): boolean {
    const za = this.zPos[i] + (this.zPos[this.topology.next[i]] - this.zPos[i]) * u;
    const zb = this.zPos[j] + (this.zPos[this.topology.next[j]] - this.zPos[j]) * v;
    return za >= zb;
  }

  // K7 snapshot: the emergent collector as EMERGENT_ROW floats a row
  // (i, u, j, v, aOver 1/0) from out[at]; returns the row count. The
  // over flag is the same test the getter makes, so a mirror rebuilds
  // emergentCrossings bit for bit without zPos.
  writeEmergentRows(out: Float32Array, at: number): number {
    const { data, n } = this.emergentCollector;
    for (let k = 0; k < n; k++) {
      const i = data[k * 4];
      const u = data[k * 4 + 1];
      const j = data[k * 4 + 2];
      const v = data[k * 4 + 3];
      const o = at + k * EMERGENT_ROW;
      out[o] = i;
      out[o + 1] = u;
      out[o + 2] = j;
      out[o + 3] = v;
      out[o + 4] = this.emergentAOver(i, u, j, v) ? 1 : 0;
    }
    return n;
  }

  // Current arc length of a chain, for mapping loop size to pluck pitch.
  chainArcLength(chainIdx: number): number {
    const chain = this.chains[chainIdx];
    let arc = 0;
    for (let k = 0; k < chain.length; k++) {
      const a = chain[k];
      const b = chain[(k + 1) % chain.length];
      arc += Math.hypot(
        this.positions[b * 2] - this.positions[a * 2],
        this.positions[b * 2 + 1] - this.positions[a * 2 + 1]
      );
    }
    return arc;
  }

  step(dt: number, tuning: PhysicsTuning = DEFAULT_TUNING): void {
    const substeps = this.beginFrame(dt);
    for (let s = 0; s < substeps; s++) {
      this.substep(tuning);
    }
  }

  // K7: step() in two halves, so the worker can run a frame's substeps one
  // task at a time (a drag lands between substeps). beginFrame does the
  // accumulator arithmetic and returns how many substeps the frame owes;
  // runSubstep runs one. step(dt) is exactly beginFrame(dt) then that many
  // runSubstep calls: the same float operations in the same order.
  beginFrame(dt: number): number {
    this.accumulator += Math.min(dt, MAX_FRAME_DT);
    let substeps = Math.floor(this.accumulator / SUBSTEP);
    substeps = Math.min(substeps, MAX_SUBSTEPS_PER_FRAME);
    this.accumulator = Math.max(0, this.accumulator - substeps * SUBSTEP);

    if (substeps > 0) this.frameMaxMoveSq = 0;
    return substeps;
  }

  runSubstep(tuning: PhysicsTuning = DEFAULT_TUNING): void {
    this.substep(tuning);
  }

  // Re-project a crossing's bindings onto their local chain geometry so
  // the crossing can slide along the threads toward wherever the threads
  // actually intersect. The target is the TRUE INTERSECTION of the two
  // local polylines when one exists: nearest-point projection onto a
  // polyline parks at vertices (a corner captures the projection for a
  // whole range of source points), which read as bindings snapping to
  // particles. Intersections move continuously through vertices.
  //
  // The search is JOINT - one candidate chosen for the crossing by
  // minimal combined cyclic ctrl distance from BOTH passes. Per-pass
  // nearest-candidate selection could lock the two passes onto DIFFERENT
  // intersections of the same two threads (a twist eye keeps two in the
  // window), and once the coupling goes silent at intersecting crossings
  // nothing reconciles the split (measured: sep 0.60 mid-drag).
  //
  // Projection of the other thread's bound point remains the fallback for
  // the moments when the threads have locally separated.
  private slideCrossing(crossing: CrossingInfo, mobility = 1): void {
    const over = crossing.over;
    const under = crossing.under;
    const chain = this.chains[over.chain];
    const len = chain.length;
    const brk = this.chainBreakAfter[over.chain]; // -1 closed.
    const i0 = Math.floor(over.ctrl);
    const oChain = this.chains[under.chain];
    const oLen = oChain.length;
    const oBrk = this.chainBreakAfter[under.chain];
    const j0 = Math.floor(under.ctrl);

    let bestFOver = Number.NaN;
    let bestFUnder = Number.NaN;
    let bestCost = Infinity;
    for (let s = i0 - SLIDE_WINDOW; s <= i0 + SLIDE_WINDOW; s++) {
      const sSlot = ((s % len) + len) % len;
      if (sSlot === brk) continue; // Removed seam: no segment here.
      const a = chain[sSlot];
      const b = chain[(((s + 1) % len) + len) % len];
      const ax = this.positions[a * 2];
      const ay = this.positions[a * 2 + 1];
      const e1x = this.positions[b * 2] - ax;
      const e1y = this.positions[b * 2 + 1] - ay;
      for (let r = j0 - SLIDE_WINDOW; r <= j0 + SLIDE_WINDOW; r++) {
        const rSlot = ((r % oLen) + oLen) % oLen;
        if (rSlot === oBrk) continue; // Removed seam on the under thread.
        const c = oChain[rSlot];
        const d = oChain[(((r + 1) % oLen) + oLen) % oLen];
        const cx = this.positions[c * 2];
        const cy = this.positions[c * 2 + 1];
        const e2x = this.positions[d * 2] - cx;
        const e2y = this.positions[d * 2 + 1] - cy;
        const denom = e1x * e2y - e1y * e2x;
        if (Math.abs(denom) < 1e-12) continue;
        const rx = cx - ax;
        const ry = cy - ay;
        const u = (rx * e2y - ry * e2x) / denom;
        if (u < 0 || u > 1) continue;
        const v = (rx * e1y - ry * e1x) / denom;
        if (v < 0 || v > 1) continue;
        const rawO = Math.abs(s + u - over.ctrl) % len;
        const cycO = Math.min(rawO, len - rawO);
        const rawU = Math.abs(r + v - under.ctrl) % oLen;
        const cycU = Math.min(rawU, oLen - rawU);
        const cost = cycO + cycU;
        if (cost < bestCost) {
          bestCost = cost;
          bestFOver = s + u;
          bestFUnder = r + v;
        }
      }
    }

    const found = !Number.isNaN(bestFOver);
    over.intersected = found;
    under.intersected = found;
    if (found) {
      over.displayF = ((bestFOver % len) + len) % len;
      under.displayF = ((bestFUnder % oLen) + oLen) % oLen;
      this.easePassToward(over, bestFOver, mobility);
      this.easePassToward(under, bestFUnder, mobility);
      return;
    }
    over.displayF = undefined;
    under.displayF = undefined;
    // Fallback: each binding chases the projection of the other's bound
    // point. Compute both q points BEFORE easing either pass.
    this.bindingPoint(under, this.slideScratch, 0);
    this.bindingPoint(over, this.slideScratch, 2);
    this.easePassToward(
      over,
      this.projectOntoChain(over, this.slideScratch[0], this.slideScratch[1]),
      mobility
    );
    this.easePassToward(
      under,
      this.projectOntoChain(under, this.slideScratch[2], this.slideScratch[3]),
      mobility
    );
  }

  private projectOntoChain(
    self: CrossingPass,
    qx: number,
    qy: number
  ): number {
    const chain = this.chains[self.chain];
    const len = chain.length;
    const brk = this.chainBreakAfter[self.chain]; // -1 closed.
    const i0 = Math.floor(self.ctrl);
    let bestDistSq = Infinity;
    let bestF = self.ctrl;
    for (let s = i0 - SLIDE_WINDOW; s <= i0 + SLIDE_WINDOW; s++) {
      const sSlot = ((s % len) + len) % len;
      if (sSlot === brk) continue; // Removed seam: no segment here.
      const a = chain[sSlot];
      const b = chain[(((s + 1) % len) + len) % len];
      const ax = this.positions[a * 2];
      const ay = this.positions[a * 2 + 1];
      const bx = this.positions[b * 2];
      const by = this.positions[b * 2 + 1];
      const ex = bx - ax;
      const ey = by - ay;
      const lenSq = ex * ex + ey * ey;
      const t =
        lenSq > 1e-12
          ? Math.max(
              0,
              Math.min(1, ((qx - ax) * ex + (qy - ay) * ey) / lenSq)
            )
          : 0;
      const px = ax + ex * t;
      const py = ay + ey * t;
      const dSq = (px - qx) * (px - qx) + (py - qy) * (py - qy);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestF = s + t;
      }
    }
    return bestF;
  }

  // Accumulate one pass's depth tent: +/-amp at the binding, linear to
  // zero over DEPTH_WINDOW ctrl each side.
  private addDepthTent(pass: CrossingPass, amp: number): void {
    const chain = this.chains[pass.chain];
    const len = chain.length;
    const c = pass.ctrl;
    const brk = this.chainBreakAfter[pass.chain]; // -1 closed.
    if (brk < 0) {
      for (
        let k = Math.ceil(c - DEPTH_WINDOW);
        k <= Math.floor(c + DEPTH_WINDOW);
        k++
      ) {
        const w = 1 - Math.abs(k - c) / DEPTH_WINDOW;
        this.zTargets[chain[((k % len) + len) % len]] += amp * w;
      }
      return;
    }
    // Open chain: work in seam-relative coords r (the strand runs r = 0 at
    // one loose end to r = len - 1 at the other, no wrap across the removed
    // seam), so the tent never leaks onto the far loose end.
    const off = brk + 1;
    const rc = (((c - off) % len) + len) % len;
    const rLo = Math.max(0, Math.ceil(rc - DEPTH_WINDOW));
    const rHi = Math.min(len - 1, Math.floor(rc + DEPTH_WINDOW));
    for (let r = rLo; r <= rHi; r++) {
      const w = 1 - Math.abs(r - rc) / DEPTH_WINDOW;
      this.zTargets[chain[(r + off) % len]] += amp * w;
    }
  }

  // Ease a pass toward its slide target with a rate limit, then keep
  // order against neighboring passes on the same chain. `mobility` scales
  // the chase (graduated friction: a quieting contact's slide fades out).
  private easePassToward(
    self: CrossingPass,
    bestF: number,
    mobility: number
  ): void {
    const len = this.chains[self.chain].length;
    const maxSlide =
      (this.grabbed >= 0 ? MAX_SLIDE_GRABBED : MAX_SLIDE_REST) * mobility;
    const ease =
      (this.grabbed >= 0 ? SLIDE_EASE_GRABBED : SLIDE_EASE_REST) * mobility;
    const delta = bestF - self.ctrl;
    this.slideStats.calls++;
    this.slideStats.requested += Math.abs(delta);
    if (Math.abs(delta) < SLIDE_DEADBAND) {
      this.slideStats.deadbandSkips++;
      self.clampLag = 0;
      return;
    }
    let f =
      self.ctrl + Math.max(-maxSlide, Math.min(maxSlide, delta * ease));
    const unclamped = f;
    const prev = this.passPrev.get(self);
    const next = this.passNext.get(self);
    const kPrev =
      prev !== undefined && prev === self.partner && prev !== self;
    const kNext =
      next !== undefined && next === self.partner && next !== self;
    const hasJn =
      self.jnPrevCtrl !== undefined || self.jnNextCtrl !== undefined;
    // A twist twin on either side (a self-linked side is no neighbor; a
    // kink partner is the kink's own side).
    const twinPrev =
      prev !== undefined &&
      prev !== self &&
      !kPrev &&
      this.twistBias.get(self)?.has(prev) === true;
    const twinNext =
      next !== undefined &&
      next !== self &&
      !kNext &&
      this.twistBias.get(self)?.has(next) === true;
    // RATCHET INTERSECTION: wherever two along-thread material budgets
    // meet at one pass from different sources - a kink eye, a fused
    // joint's jn, a twist twin's soft part - they bound this step's
    // offset together (below) instead of clamping in sequence, where the
    // later clamp wins and conveys the pass into the other budget's unmet
    // share. Kink passes measured that first (see below). K41 found the
    // same conveyance at a plain pass between a joint and its twist twin:
    // the twin's ratchet walked the pass 2.0 -> 1.34 ctrl into the joint's
    // unmet jn budget (jnSep 3.65 at tw .64) in the first 0.5 s, parking
    // the crossing so close to the joint that the joint's bridge arm rode
    // the crossing's over thread at the anti-riding floor's hard line - a
    // standing rider (depth 0.04-0.05) that held the rect user URL awake
    // forever (3 of 8 jittered starts on a868f31, 1 of 8 even before the
    // kink eyes).
    if (kPrev || kNext || (hasJn && (twinPrev || twinNext))) {
      const cycK = (d: number): number => ((d % len) + len) % len;
      // Bounds on this step's ctrl offset o = f - self.ctrl.
      let lo = -Infinity;
      let hi = Infinity;
      // KINK EYE material ratchet (see KINK_EYE_ARC_PER_WIDTH): when the
      // chain-order neighbor IS this pass's partner, the thread between
      // them is the kink's loop. Its floor rises from the current gap
      // toward the rest-material budget at the twist rate; the ordering
      // clamps below always outrank it (an eye grows only into free
      // corridor room).
      // A two-pass chain is a loop on BOTH sides: share the chain.
      const cap = kPrev && kNext ? len / 2 : len;
      if (kPrev) {
        const gap = cycK(self.ctrl - prev!.ctrl);
        const sep = Math.min(
          Math.min(cap, this.kinkGapTarget(self.chain, prev!.ctrl, 1)),
          gap + KINK_SEP_RATE * mobility
        );
        lo = Math.max(lo, sep - gap);
      }
      if (kNext) {
        const gap = cycK(next!.ctrl - self.ctrl);
        const sep = Math.min(
          Math.min(cap, this.kinkGapTarget(self.chain, next!.ctrl, -1)),
          gap + KINK_SEP_RATE * mobility
        );
        hi = Math.min(hi, gap - sep);
      }
      // A fused joint beside a kink pass carries the jn ratchet (same
      // form, same rate). Two ratchets on opposite sides must never take
      // material from each other's UNMET budget: applied in sequence the
      // later one wins, and both orders were measured failing - jn last
      // walked a joint-adjacent kink back into its loop (8 -> 6.8 ctrl:
      // the lasso drain again, by another route), kink last parked the
      // joint on the crossing (its bridge arm rode the kink's other pass
      // as a standing rider; the fabric never slept). So they intersect:
      // each yields only slack above its own budget, and when both are
      // short the pass HOLDS (neither advances).
      if (hasJn) {
        let budget = this.jnSep;
        if (self.jnPrevCtrl !== undefined && self.jnNextCtrl !== undefined) {
          budget = Math.min(budget, cycK(self.jnNextCtrl - self.jnPrevCtrl) / 2);
        }
        if (self.jnPrevCtrl !== undefined) {
          const gap = cycK(self.ctrl - self.jnPrevCtrl);
          const sep = Math.min(budget, gap + JN_SEP_RATE * mobility);
          lo = Math.max(lo, sep - gap);
        }
        if (self.jnNextCtrl !== undefined) {
          const gap = cycK(self.jnNextCtrl - self.ctrl);
          const sep = Math.min(budget, gap + JN_SEP_RATE * mobility);
          hi = Math.min(hi, gap - sep);
        }
      }
      // Same for a TWIST twin (beside a kink: a second self-crossing
      // bracketing it - the lattice's curl-plus-twist motif; beside a
      // joint: see the K41 note above): the twist ratchet's soft part
      // (above MIN_PASS_SEPARATION) joins the intersection instead of
      // outranking it from the ordering clamps - at tw 0.64 its 3.3-ctrl
      // budget conveyed a measured kink's end pass back into the loop at
      // the twist rate (8.34 -> 8.01 ctrl). The hard MIN_PASS_SEPARATION
      // part stays in the ordering clamps.
      if (twinPrev) {
        const gap = cycK(self.ctrl - prev!.ctrl);
        const sep = Math.min(this.twistSep, gap + TWIST_SEP_RATE * mobility);
        lo = Math.max(lo, sep - gap);
      }
      if (twinNext) {
        const gap = cycK(next!.ctrl - self.ctrl);
        const sep = Math.min(this.twistSep, gap + TWIST_SEP_RATE * mobility);
        hi = Math.min(hi, gap - sep);
      }
      const o = f - self.ctrl;
      f = self.ctrl + (lo <= hi ? Math.max(lo, Math.min(hi, o)) : 0);
    } else if (hasJn) {
      // JUNCTION material budget (P4 fabric; see JN_MIN_SEPARATION): a
      // fused joint is a FIXED virtual neighbor - this pass keeps at
      // least jnSep of thread between its binding and the joint, with
      // the floor rising from the CURRENT gap as a rate-limited,
      // mobility-scaled ratchet (the P3.39 twist pattern: a pinned
      // pass's standing push stays sub-stick, and the friction weld
      // strangles it as the contact quiets). Deliberately BEFORE the
      // pass-ordering clamps below, so kink/twist/ordering floors always
      // win conflicts - the budget may park unconverged, never force.
      // Knot mode sets no jn records, so this is structurally absent.
      // (Kink passes and passes with a twist twin take the branch above,
      // which applies the same jn floors intersected with the others.)
      const cycJ = (d: number): number => ((d % len) + len) % len;
      // Between TWO joints the corridor can be too short for both full
      // budgets (a lattice J-X-J corridor is 4.0 ctrl vs a 2*jnSep
      // demand of ~4.8), and one-sided clamps with last-writer
      // dominance then CONVEY the pass across it - the winning side
      // converges at full budget while the loser is walked down to
      // corridor - jnSep (measured on the repro: 2.09/1.91 ->
      // 1.61/2.39, the tight side made WORSE). Share the corridor
      // instead: each side's budget caps at half the fixed
      // joint-to-joint span, so the pass CENTERS and both ratchets go
      // inert at the midpoint.
      let budget = this.jnSep;
      if (self.jnPrevCtrl !== undefined && self.jnNextCtrl !== undefined) {
        budget = Math.min(
          budget,
          cycJ(self.jnNextCtrl - self.jnPrevCtrl) / 2
        );
      }
      if (self.jnPrevCtrl !== undefined) {
        const gap = cycJ(self.ctrl - self.jnPrevCtrl);
        const sep = Math.min(budget, gap + JN_SEP_RATE * mobility);
        if (cycJ(f - self.jnPrevCtrl) < sep) f = self.jnPrevCtrl + sep;
      }
      if (self.jnNextCtrl !== undefined) {
        const gap = cycJ(self.jnNextCtrl - self.ctrl);
        const sep = Math.min(budget, gap + JN_SEP_RATE * mobility);
        if (cycJ(self.jnNextCtrl - f) < sep) f = self.jnNextCtrl - sep;
      }
    }
    // Each side clamps INDEPENDENTLY, skipping only a SELF-linked side.
    // buildPassOrder unlinks an OPEN chain's seam-straddling pair by
    // pointing each side at itself, so its FIRST pass has prev === self
    // and its LAST pass next === self (a closed chain self-links only
    // when single-pass, where both sides skip - knot mode is unchanged).
    // The old shared `prev !== self` guard dropped BOTH clamps for the
    // first pass (it slid into and through its neighbor), and clamped the
    // last pass against its OWN pre-step ctrl: any backward step snapped a
    // full MIN_PASS_SEPARATION back, overriding the prev clamp - 1.6-ctrl
    // jumps, a sawtooth against the jn ratchet, order inversions, and in
    // fallback a runaway that marched a binding down its whole strand.
    // Measured on the fabric: 4/28 configs never slept; all sleep now.
    if (prev && next) {
      const cyc = (d: number): number => ((d % len) + len) % len;
      // Kink partners and twist twins hold a larger material budget:
      // a kink's budget is its eyelet; a twist's keeps the eye OPEN so
      // it never flattens into a taut chord (a chord equal to the
      // material arc is a stacked ride whose over/under flip has no
      // clean rendering - the held-grab merge; see the twist entries).
      // The twist budget is a RATE-LIMITED RATCHET, not a snap: the
      // floor rises from the pair's current gap toward twistSep at
      // most TWIST_SEP_RATE (mobility-scaled) per slide, so at a
      // geometry-pinned pair the standing push stays sub-stick and the
      // graduated friction weld can strangle it (a full-authority snap
      // pinned fat seed 42424242 at mv 1.6e-2 forever - the P3.31
      // pump shape).
      // (A pass that took the RATCHET INTERSECTION above already applied
      // its twin's soft twist ratchet there; only the hard floor remains
      // here.)
      const intersected = kPrev || kNext || (hasJn && (twinPrev || twinNext));
      const sepOf = (nb: CrossingPass, gap: number): number =>
        nb === self.partner
          ? this.kinkSep
          : !intersected && this.twistBias.get(self)?.has(nb)
            ? Math.max(
                MIN_PASS_SEPARATION,
                Math.min(this.twistSep, gap + TWIST_SEP_RATE * mobility)
              )
            : MIN_PASS_SEPARATION;
      if (prev !== self) {
        const sepPrev = sepOf(prev, cyc(self.ctrl - prev.ctrl));
        if (cyc(f - prev.ctrl) < sepPrev) {
          f = prev.ctrl + sepPrev;
        }
      }
      if (next !== self) {
        const sepNext = sepOf(next, cyc(next.ctrl - self.ctrl));
        if (cyc(next.ctrl - f) < sepNext) {
          f = next.ctrl - sepNext;
        }
      }
    }
    if (f !== unclamped) this.slideStats.clampHits++;
    {
      const raw = Math.abs(f - self.ctrl) % len;
      this.slideStats.applied += Math.min(raw, len - raw);
    }
    {
      const raw = Math.abs(bestF - f) % len;
      self.clampLag = Math.min(raw, len - raw);
    }
    self.ctrl = ((f % len) + len) % len;
  }

  // Slide telemetry, accumulated between readSlideStats() calls: answers
  // "are bindings actually sliding, and what stops them - deadband, rate
  // cap, or the ordering clamp?"
  readonly slideStats = {
    calls: 0,
    requested: 0,
    applied: 0,
    deadbandSkips: 0,
    clampHits: 0,
  };

  readSlideStats(): typeof this.slideStats {
    const out = { ...this.slideStats };
    this.slideStats.calls = 0;
    this.slideStats.requested = 0;
    this.slideStats.applied = 0;
    this.slideStats.deadbandSkips = 0;
    this.slideStats.clampHits = 0;
    return out;
  }

  // Phase probe: when enabled, records the max single-particle
  // displacement produced by each solver phase (accumulated across
  // substeps until read). Costs nothing when disabled.
  private phaseProbe: Map<string, number> | null = null;
  private probeSnap: Float32Array | null = null;

  enablePhaseProbe(): void {
    this.phaseProbe = new Map();
    this.probeSnap = new Float32Array(this.positions.length);
    this.probeSnap.set(this.positions);
  }

  readPhaseProbe(): Map<string, number> {
    const out = this.phaseProbe ?? new Map<string, number>();
    if (this.phaseProbe) this.phaseProbe = new Map();
    return out;
  }

  private probe(label: string): void {
    if (!this.phaseProbe || !this.probeSnap) return;
    let m = 0;
    for (let i = 0; i < this.particleCount * 2; i++) {
      const d = Math.abs(this.positions[i] - this.probeSnap[i]);
      if (d > m) m = d;
    }
    this.phaseProbe.set(
      label,
      Math.max(this.phaseProbe.get(label) ?? 0, m)
    );
    this.probeSnap.set(this.positions);
  }

  private substep(tuning: PhysicsTuning): void {
    this.time += SUBSTEP;
    this.substepCount++;
    if (this.probeSnap) this.probeSnap.set(this.positions);

    // Temperature: Simplex-noise agitation, injected as velocity.
    if (tuning.temperature > 0) {
      const amp = tuning.temperature * TEMPERATURE_SCALE;
      const t = this.time * NOISE_TIME_FREQ;
      for (let i = 0; i < this.particleCount; i++) {
        const nx = this.positions[i * 2] * NOISE_SPATIAL_FREQ;
        const ny = this.positions[i * 2 + 1] * NOISE_SPATIAL_FREQ;
        this.prev[i * 2] -= this.noise3D(nx, ny, t) * amp;
        this.prev[i * 2 + 1] -= this.noise3D(nx + 137, ny + 71, t) * amp;
      }
    }

    // Verlet integration. (current - prev) is the net displacement of the
    // previous substep, so quiescence tracking is free here.
    const damping =
      DAMPING_MIN_DRAG + (DAMPING_MAX_DRAG - DAMPING_MIN_DRAG) * tuning.drag;
    let substepMoveSq = 0;
    for (let i = 0; i < this.particleCount * 2; i++) {
      const current = this.positions[i];
      const d = current - this.prev[i];
      const dSq = d * d;
      // K346: NaN fails every > test, so a NaN displacement must raise
      // the max explicitly or the non-finite halt never fires.
      if (dSq > substepMoveSq || Number.isNaN(dSq)) substepMoveSq = dSq;
      this.positions[i] = current + d * damping;
      this.prev[i] = current;
    }
    if (substepMoveSq > this.frameMaxMoveSq || Number.isNaN(substepMoveSq)) {
      this.frameMaxMoveSq = substepMoveSq;
    }

    // Static/kinetic friction switch (see CONTACT_STICK_EPS). Standing
    // hard violations of the anti-riding floor block the global freeze:
    // the work gate needs the machinery live to resolve them, and a
    // frozen merge is the one rest state the renderer cannot draw.
    if (
      this.grabbed >= 0 ||
      tuning.temperature > 0 ||
      this.violationList.n > 0
    ) {
      this.stickyContacts = false;
    } else if (substepMoveSq < CONTACT_STICK_EPS * CONTACT_STICK_EPS) {
      this.stickyContacts = true;
    } else if (substepMoveSq > CONTACT_UNSTICK_EPS * CONTACT_UNSTICK_EPS) {
      this.stickyContacts = false;
    }

    // Settle ramp: 0 at load (lattice equilibrium) -> 1 when fully relaxed.
    const x = Math.min(this.time / SETTLE_DURATION, 1);
    const settle = x * x * (3 - 2 * x);

    const slack = tuning.slack;
    const shrink = SHRINK_TAUT + (SHRINK_LOOSE - SHRINK_TAUT) * slack;
    const restScale = 1 - (1 - shrink) * settle;
    const bendScale =
      settle * (BEND_TAUT + (BEND_LOOSE - BEND_TAUT) * slack) * tuning.bend;
    const collisionDist = tuning.threadWidth * COLLISION_MARGIN;
    this.kinkSep = Math.max(
      KINK_MIN_SEPARATION,
      tuning.threadWidth * KINK_SEP_PER_WIDTH
    );
    // In LATTICE units at the SETTLED rest scale: the budget is the
    // resting eye's, and measuring it at the live ramp (restScale ~1 for
    // the first ~0.6 s - the only window the slides run in before the
    // contacts go static) made the target the lattice loop itself.
    this.kinkEyeLattice =
      Math.max(KINK_EYE_ARC_MIN, tuning.threadWidth * KINK_EYE_ARC_PER_WIDTH) /
      shrink;
    this.twistSep = Math.max(
      TWIST_MIN_SEPARATION,
      tuning.threadWidth * TWIST_SEP_PER_WIDTH
    );
    this.jnSep = Math.max(
      JN_MIN_SEPARATION,
      tuning.threadWidth * JN_SEP_PER_WIDTH
    );
    // Aesthetic spacing can never drop below the hard floor: at low
    // repulsion x wide threads the raw formula fell below the thread
    // width (rep 0.4 x taut 0.62 = 0.25 < width 0.52), silently
    // disabling all soft spacing.
    const repulseDist = Math.max(
      collisionDist * 1.02,
      (REPULSE_DIST_TAUT + (REPULSE_DIST_LOOSE - REPULSE_DIST_TAUT) * slack) *
        tuning.repulsion
    );

    // Kink eye pressure distance (see KINK_EYE_DIST_PER_WIDTH): never
    // below the knot's own spacing, so an eye is at least as open as the
    // gap between any two threads.
    const kinkEyeDist = Math.max(
      repulseDist,
      tuning.threadWidth * KINK_EYE_DIST_PER_WIDTH
    );

    // Slide bindings toward the other thread's current point, record each
    // crossing's contact point, and rebuild the z-target field.
    const depthAmp = collisionDist * DEPTH_AMP_FACTOR;
    this.zTargets.fill(0);
    for (let c = 0; c < this.crossings.length; c++) {
      const crossing = this.crossings[c];
      this.bindingPoint(crossing.over, this.bindScratch, 0);
      this.bindingPoint(crossing.under, this.bindScratch, 2);
      this.contacts[c * 2] = (this.bindScratch[0] + this.bindScratch[2]) / 2;
      this.contacts[c * 2 + 1] =
        (this.bindScratch[1] + this.bindScratch[3]) / 2;
      // Smoothed contact speed for graduated friction (weldFactor).
      {
        const mdx = this.contacts[c * 2] - this.prevContacts[c * 2];
        const mdy = this.contacts[c * 2 + 1] - this.prevContacts[c * 2 + 1];
        this.contactSpeedEma[c] =
          this.contactSpeedEma[c] * (1 - CONTACT_SPEED_EMA) +
          Math.sqrt(mdx * mdx + mdy * mdy) * CONTACT_SPEED_EMA;
      }
      this.prevContacts[c * 2] = this.contacts[c * 2];
      this.prevContacts[c * 2 + 1] = this.contacts[c * 2 + 1];
      // Eased grab-release gate (see GRAB_GATE_EASE).
      {
        let target = 1;
        if (this.grabbed >= 0) {
          const d = Math.hypot(
            this.contacts[c * 2] - this.positions[this.grabbed * 2],
            this.contacts[c * 2 + 1] - this.positions[this.grabbed * 2 + 1]
          );
          target = Math.max(
            0,
            Math.min(1, (d - GRAB_FREE_RADIUS) / GRAB_FREE_TAPER)
          );
        }
        this.grabGate[c] += (target - this.grabGate[c]) * GRAB_GATE_EASE;
      }
      // STATIC contacts freeze the crossing machinery entirely: no
      // sliding, no transversality torque. Both serve motion; at rest the
      // springs hold the shape, and a welded binding that keeps
      // micro-adjusting its ctrl is itself a motor (the weld turns every
      // re-projection nudge into thread motion). Graduated friction
      // applies the same logic per crossing BEFORE the global freeze: a
      // quieting contact's slide/torque fade with its weld, so the local
      // constraint standoff becomes substep-identical and the whole knot
      // can reach the global stick threshold (anchors that keep
      // micro-moving hold the standoff in slow wander forever).
      if (!this.stickyContacts) {
        const weld = this.weldFactor(c, tuning.temperature);
        const mobility = 1 - weld;
        if (mobility > 0) {
          this.slideCrossing(crossing, mobility);
          this.applyTransversality(crossing, c, mobility);
        }
      }

      // z-target tents from the diagram (see DEPTH_WINDOW).
      this.addDepthTent(crossing.over, depthAmp);
      this.addDepthTent(crossing.under, -depthAmp);
    }
    // Ease the REAL z toward its diagram target (overdamped - z carries
    // no inertia, so it cannot ring; collision's z-pushes stack on top
    // and, running last, win where the layout genuinely overlaps).
    for (let i = 0; i < this.particleCount; i++) {
      const target = Math.max(
        -depthAmp,
        Math.min(depthAmp, this.zTargets[i])
      );
      this.zPos[i] += (target - this.zPos[i]) * Z_EASE;
    }
    this.updatePassCover();
    // Bindings are final for this substep: refresh the kink loops (eye
    // pressure + fairing exemption read them).
    if (this.kinks.length > 0) this.updateKinkLoops();
    this.probe("slide+transversality");

    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      // The grabbed particle chases the pointer stiffly; springs carry the
      // tug outward through the knot.
      if (this.grabbed >= 0) {
        const g = this.grabbed;
        this.positions[g * 2] += (this.grabX - this.positions[g * 2]) * 0.6;
        this.positions[g * 2 + 1] +=
          (this.grabY - this.positions[g * 2 + 1]) * 0.6;
      }
      // Structural stiffness scales with the tuning param, clamped so the
      // PBD correction fraction stays below 1 (0.7 base x 1.35 max = 0.95).
      applyDistanceConstraints(
        this.positions,
        this.structural,
        restScale,
        Math.max(0.1, Math.min(1.35, tuning.stiffness))
      );
      this.probe("structural");
      this.applyTurnRadiusFloor(tuning.threadWidth * 0.5 * 1.15, 0.5);
      applyDistanceConstraints(
        this.positions,
        this.bending,
        restScale,
        bendScale
      );
      this.probe("bending");

      // Repulsion runs at full strength from the first substep: while the
      // settle ramp shrinks rests, parallel threads get dragged toward the
      // same corridor line, and weak early repulsion lets them pass through
      // each other and lock into braided local minima.
      applyRepulsion(
        this.positions,
        this.zPos,
        this.particleCount,
        this.topology,
        repulseDist,
        REPULSION_STIFFNESS
      );
      if (this.kinks.length > 0) {
        this.applyKinkEyePressure(kinkEyeDist, REPULSION_STIFFNESS);
      }
      this.probe("repulsion");
      // Hard 3D floor: no two threads within the margin in 3D, ever. The
      // collector gathers tunneled (properly intersecting) pairs so the
      // renderer can gap emergent crossings.
      if (iter === 0) this.emergentCollector.n = 0;
      applySegmentCollision(
        this.positions,
        this.zPos,
        this.particleCount,
        this.topology,
        collisionDist,
        tuning.threadWidth,
        COLLISION_STIFFNESS,
        this.contacts,
        { slot: this.passCoverSlot, cov: this.passCoverCov },
        iter === 0 ? this.emergentCollector : undefined,
        undefined,
        this.jnCoverActive
      );
      this.probe("collision");

      // Coincidence coupling LAST, so nothing re-separates the crossing
      // within the iteration: pull each crossing's two bound points
      // together, distributing corrections to the surrounding particles.
      //
      // The coupling stays CONTINUOUS (with the kinetic tangential
      // projection) even while grabbed. Silencing it at intersecting
      // crossings during a grab was tried and made things WORSE: without
      // the coupling's organizing pull, raw segment collision outside the
      // exemption lens couples the threads instead and welds them
      // tangentially (weak-tug material flow dropped from 2.17 to 1.14
      // ctrl and bodily drag of the other thread returned). Disabling it
      // outright (the retired cp=0 experiment) also welded crossings and
      // left stress-torn bound pairs (sep 0.83) whose erase gaps rendered
      // as naked holes. The coupling is the crossing's lubricant in every
      // measured gesture.
      //
      // But the coupling YIELDS where the ordering clamp holds a binding
      // away from the true intersection (clampLag): coincidence at the
      // binding is then geometrically unachievable - the threads already
      // intersect elsewhere - and insisting on it demands tangential
      // overlap, a fight against collision that cannot resolve and pumps
      // energy forever (the post-play endless jiggle: an over-tightened
      // twist's bindings pinned at MIN_PASS_SEPARATION, coupling and
      // collision each correcting ~1.5e-1/substep indefinitely). Yielding
      // lets the pair separate slightly instead; when the clamp releases,
      // lag returns to zero and full coupling resumes.
      for (let ci = 0; ci < this.crossings.length; ci++) {
        const crossing = this.crossings[ci];
        // Yield ONLY while the threads genuinely intersect: coincidence
        // at the binding is then redundant and insisting on it fights
        // collision. In fallback (threads locally separated) the coupling
        // is the boundary guard - the only force that can pull an
        // uncrossing pair back together - and must act at full strength
        // (yielding there abandoned crossings: bound pairs torn 5.4
        // apart, weave visibly broken).
        const lag =
          crossing.over.intersected === true &&
          crossing.under.intersected === true
            ? Math.max(
                crossing.over.clampLag ?? 0,
                crossing.under.clampLag ?? 0
              )
            : 0;
        // As the weld engages, the yield fades back out: the yield exists
        // for the KINETIC fight (coupling vs collision while material
        // moves), but a resting crossing should close its bound pair
        // fully - the wide depth tents cover the clamp-lagged
        // intersection, so the pull no longer fights collision - or the
        // freeze would fossilize the pair mid-separation and render as a
        // displaced gap.
        const weld = this.weldFactor(ci, tuning.temperature);
        const give =
          1 / (1 + (lag / COUPLING_YIELD_LAG) ** 2) * (1 - weld) + weld;
        this.bindingPoint(crossing.over, this.bindScratch, 0);
        this.bindingPoint(crossing.under, this.bindScratch, 2);
        const dx =
          (this.bindScratch[2] - this.bindScratch[0]) *
          0.5 *
          COUPLING_STIFFNESS *
          give;
        const dy =
          (this.bindScratch[3] - this.bindScratch[1]) *
          0.5 *
          COUPLING_STIFFNESS *
          give;
        this.applyBindingCorrection(crossing.over, dx, dy, weld);
        this.applyBindingCorrection(crossing.under, -dx, -dy, weld);
      }
      this.probe("coupling");

      // Twist contact spacing AFTER the coupling: it translates both
      // bindings of a crossing by the same vector, so the coincidence
      // the coupling just enforced is preserved exactly.
      this.applyTwistSpacing(
        Math.max(
          TWIST_CONTACT_MIN_BASE,
          tuning.threadWidth * TWIST_CONTACT_MIN_PER_WIDTH
        )
      );
      this.probe("twist-spacing");
    }

    // Laplacian fairing: nudge every particle toward its chain neighbors'
    // midpoint, evening out curvature so threads read as smooth continuous
    // curves (the structural springs preserve length against shrinkage).
    // Kink loops are EXEMPT: on a closed loop the umbrella step is pure
    // curve-shortening - it was the dominant eye-closing force at rest
    // (measured -21.6e-3 per loop particle per substep at the default
    // smooth 0.75, against bending's +26.5e-3 holding the eye open), and a
    // loop has no straightening left for it to do. Bending still evens the
    // loop's curvature.
    if (tuning.smooth > 0) {
      const k = tuning.smooth * FAIRING_MAX * settle;
      const kinkOf = this.topology.kinkOf;
      this.chains.forEach((chain, chainIdx) => {
        const len = chain.length;
        const brk = this.chainBreakAfter[chainIdx]; // -1 closed.
        for (let i = 0; i < len; i++) {
          // Skip the two loose-end particles: one fairing neighbor is across
          // the removed seam (closed => brk -1 => never skips).
          if (i === brk || (i - 1 + len) % len === brk) continue;
          const p = chain[i];
          if (kinkOf !== undefined && kinkOf[p] >= 0) continue;
          const a = chain[(i - 1 + len) % len];
          const b = chain[(i + 1) % len];
          this.positions[p * 2] +=
            ((this.positions[a * 2] + this.positions[b * 2]) / 2 -
              this.positions[p * 2]) *
            k;
          this.positions[p * 2 + 1] +=
            ((this.positions[a * 2 + 1] + this.positions[b * 2 + 1]) / 2 -
              this.positions[p * 2 + 1]) *
            k;
        }
      });
    }

    // Optional grid alignment: softly anchor every particle back toward
    // its lattice position, restoring the structured look. Strength 0
    // skips the pass entirely (bit-identical to the old unchecked box).
    if (tuning.gridAlign > 0) {
      const k = GRID_ALIGN_STIFFNESS * Math.min(1, tuning.gridAlign);
      for (let i = 0; i < this.particleCount * 2; i++) {
        this.positions[i] += (this.initial[i] - this.positions[i]) * k;
      }
    }

    // Keep the free-floating knot centered without injecting velocity.
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < this.particleCount; i++) {
      cx += this.positions[i * 2];
      cy += this.positions[i * 2 + 1];
    }
    cx /= this.particleCount;
    cy /= this.particleCount;
    const shiftX = (this.homeX - cx) * CENTER_PULL;
    const shiftY = (this.homeY - cy) * CENTER_PULL;
    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 2] += shiftX;
      this.positions[i * 2 + 1] += shiftY;
      this.prev[i * 2] += shiftX;
      this.prev[i * 2 + 1] += shiftY;
    }
    this.probe("fairing+align+center");

    // FINAL AUTHORITY collision projection: the last position operation
    // of every substep, at full stiffness. In-loop collision is one
    // voice in a committee - at high bend/smooth or minimum repulsion,
    // the other constraints outvote its 0.5-stiffness correction and the
    // equilibrium (which the quiescence gate then freezes) can sit in
    // visible interpenetration. Projecting the floor once more AFTER
    // everything else guarantees the substep-END state - the only state
    // ever rendered or frozen - honors the width floor everywhere the
    // depth field doesn't exempt it. Internal tug-of-wars continue
    // between substeps but can no longer appear on screen. TWO sweeps:
    // one Gauss-Seidel pass leaves residual where a particle sits
    // between two violated pairs (each correction pushes into the
    // other; measured 0.45 vs the 0.60 floor after one sweep).
    // (The turn-radius floor was tried at final authority here and
    // REJECTED: on a violently wounded tangle it pinned a standing
    // 3.4e-2 pump for 3+ minutes - a tangle-squeezed fold cannot open
    // without the tangle yielding, and full-stiffness insistence is a
    // pump by construction. The floor stays an in-loop preference; the
    // renderer's concave-side miter clamp owns renderability at any
    // radius.)
    for (let fs = 0; fs < 2; fs++) {
      if (fs === 1) this.violationList.n = 0;
      applySegmentCollision(
        this.positions,
        this.zPos,
        this.particleCount,
        this.topology,
        collisionDist,
        tuning.threadWidth,
        1.0,
        this.contacts,
        { slot: this.passCoverSlot, cov: this.passCoverCov },
        undefined,
        // Record standing hard violations from the LAST sweep only -
        // the substep-end truth that drives the work gate, the global
        // stick block, and the sleep gate.
        fs === 1 ? this.violationList : undefined,
        this.jnCoverActive,
        this.anchored
      );
    }
    this.probe("final-collision");

    // Junction coincidence is FINAL AUTHORITY, same pattern as the collision
    // floor above: in-loop the fusion springs are one committee voice and
    // bending gets a later word, leaving merges parked ~0.3 apart; projecting
    // the rest-0 springs once more here guarantees the substep-END state -
    // the only state ever rendered or frozen - shows every merge closed.
    // Fused pairs are collision-exempt (junctionOf), so this cannot fight the
    // floor just enforced; and at rest the projection repeats identically, so
    // the integrated quiescence metric stays quiet (the final collision sweep
    // established this pattern). Two sweeps close 3+-particle groups.
    if (this.fusionConstraints.length > 0) {
      applyDistanceConstraints(this.positions, this.fusionConstraints, 1, 1);
      applyDistanceConstraints(this.positions, this.fusionConstraints, 1, 1);
      this.probe("fusion-snap");
    }

    // Anchored loose ends (maze open-chain terminals) are authoritative:
    // pin them exactly at their off-screen anchor, injecting no velocity, so
    // no upstream force can drag them off. Empty in knot mode -> no-op.
    for (let a = 0; a < this.anchoredList.length; a++) {
      const p = this.anchoredList[a];
      const x = this.anchorPos[p * 2];
      const y = this.anchorPos[p * 2 + 1];
      this.positions[p * 2] = x;
      this.positions[p * 2 + 1] = y;
      this.prev[p * 2] = x;
      this.prev[p * 2 + 1] = y;
    }
  }

  // Minimum turn radius: the ribbon's OWN renderability floor. A
  // centerline turning tighter than the ribbon half-width makes the
  // triangle strip self-overlap (jagged seam inside the fill) - a
  // single-thread artifact no pair census can see. Enforced as a
  // per-triple chord floor: for neighbors a, c of b, the chord |ac|
  // that corresponds to turn radius R at mean segment length l is
  // 2l / sqrt(1 + (l / 2R)^2); push a and c apart when below it. The
  // renderer's concave-side miter clamp covers any residual.
  private applyTurnRadiusFloor(minRadius: number, stiffness: number): void {
    const p = this.positions;
    this.chains.forEach((chain, chainIdx) => {
      const len = chain.length;
      const brk = this.chainBreakAfter[chainIdx]; // -1 closed.
      for (let k = 0; k < len; k++) {
        // Skip triples straddling the removed seam (closed => never skips).
        if (k === brk || (k - 1 + len) % len === brk) continue;
        const a = chain[(k - 1 + len) % len];
        const b = chain[k];
        const c = chain[(k + 1) % len];
        const e1x = p[b * 2] - p[a * 2];
        const e1y = p[b * 2 + 1] - p[a * 2 + 1];
        const e2x = p[c * 2] - p[b * 2];
        const e2y = p[c * 2 + 1] - p[b * 2 + 1];
        const l1 = Math.sqrt(e1x * e1x + e1y * e1y);
        const l2 = Math.sqrt(e2x * e2x + e2y * e2y);
        const lm = (l1 + l2) / 2;
        if (lm < 1e-9) continue;
        const q = lm / (2 * minRadius);
        const minChord = (2 * lm) / Math.sqrt(1 + q * q);
        const dx = p[c * 2] - p[a * 2];
        const dy = p[c * 2 + 1] - p[a * 2 + 1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= minChord || d < 1e-9) continue;
        const corr = ((minChord - d) / d) * stiffness * 0.5;
        p[a * 2] -= dx * corr;
        p[a * 2 + 1] -= dy * corr;
        p[c * 2] += dx * corr;
        p[c * 2 + 1] += dy * corr;
      }
    });
  }

  // Rebuild the per-particle registered-crossing membership table used by
  // the anti-riding 2D floor's crossing coverage. 4 slots per particle,
  // slot value = crossing * 2 + side (0 over / 1 under).
  //
  // Coverage is measured in WORLD ARC along the thread and bounded by
  // the renderer's actual erase-gap reach. The original ctrl-count
  // window (2.5 per side) was the P3.31 -> P3.34 regression the user
  // kept reporting: a twist is two crossings a few ctrl apart, their
  // ctrl windows CHAINED across the whole eye, the anti-riding floor
  // went to zero through the entire twist, and the two threads rode
  // flat through it - re-opening the exact merge P3.30 had fixed
  // ("Success!"), while every census that consulted the same slots
  // certified it healthy. The exemption must match what the renderer
  // paints, nothing more: erase reach = max(1.35, 3.25 * width) along
  // the thread, and coverage ends where the erase ends.
  private updatePassCover(): void {
    this.passCoverSlot.fill(-1);
    const p = this.positions;
    // Coverage reach 2.0: the MINIMAL span where separation is
    // geometrically impossible (measured pump sites: crossing-adjacent
    // pairs out to arc ~1.7 from their bindings; a shorter reach - the
    // fixed 1.16 erase span - moved the P3.31 pump to the coverage
    // boundary at wide-kink necks, and the renderer's full 4.5
    // long-overlap reach exposed a different post-tug standoff).
    // Beyond 2.0 the floor prefers separation, which is achievable
    // there; the P3.36 long-overlap erase covers whatever overlap
    // remains while it resolves.
    const reach = 2.0;
    const fade = reach * 0.35;
    const segLen = (chain: number[], k: number): number => {
      const len = chain.length;
      const a = chain[((k % len) + len) % len];
      const b = chain[(((k + 1) % len) + len) % len];
      const dx = p[b * 2] - p[a * 2];
      const dy = p[b * 2 + 1] - p[a * 2 + 1];
      return Math.sqrt(dx * dx + dy * dy);
    };
    const mark = (pp: number, arc: number, value: number): void => {
      const cov = Math.min(1, Math.max(0, (reach - arc) / fade));
      if (cov <= 0) return;
      const s = pp * 4;
      for (let u = 0; u < 4; u++) {
        if (this.passCoverSlot[s + u] === value) {
          if (cov > this.passCoverCov[s + u]) {
            this.passCoverCov[s + u] = cov;
          }
          break;
        }
        if (this.passCoverSlot[s + u] < 0) {
          this.passCoverSlot[s + u] = value;
          this.passCoverCov[s + u] = cov;
          break;
        }
      }
    };
    // COVERAGE THROUGH A FUSED JOINT (K41): a joint is ONE material point
    // shared by all its arms, so a crossing's coverage that reaches it on
    // one arm continues onto the others with the remaining arc budget.
    // The coverage is the zone where separation is geometrically
    // impossible, and that holds for every arm at the joint alike: a
    // joint sitting ~0.6 world from a crossing's binding can never stand
    // a full width off the crossing's other thread, whichever arm
    // carries the pair. Without this, a bridge arm leaving such a joint
    // alongside the over thread was held to the full floor - an
    // impossible demand that parked at the hard line as a standing rider
    // and kept the fabric awake forever (the tw .64 rect URL at seed
    // 3zz2a1: a lattice-forced joint 2.0 ctrl from its crossing). Pair-
    // scoped like all PassCover (the other side must sit on the same
    // crossing's other pass); one joint deep; walks stop at open seams.
    const throughJoint = (pp: number, arc0: number, value: number): void => {
      const g = this.fusedGroupOf[pp];
      if (g < 0) return;
      for (const q of this.fusedJunctions[g]) {
        if (q === pp) continue;
        const qChainIdx = this.particleChain[q];
        const qChain = this.chains[qChainIdx];
        const qLen = qChain.length;
        const qBrk = this.chainBreakAfter[qChainIdx]; // -1 closed.
        const qSlot = this.topology.ctrlOf[q];
        mark(q, arc0, value);
        let arc = arc0;
        for (let k = qSlot; k < qSlot + 12; k++) {
          if (((k % qLen) + qLen) % qLen === qBrk) break;
          arc += segLen(qChain, k);
          if (arc >= reach) break;
          mark(qChain[(k + 1) % qLen], arc, value);
        }
        arc = arc0;
        for (let k = qSlot - 1; k > qSlot - 13; k--) {
          const ks = ((k % qLen) + qLen) % qLen;
          if (ks === qBrk) break;
          arc += segLen(qChain, k);
          if (arc >= reach) break;
          mark(qChain[ks], arc, value);
        }
      }
    };
    const fused = this.fusedGroupOf.length > 0;
    const addWindow = (chainIdx: number, ctrl: number, value: number): void => {
      const chain = this.chains[chainIdx];
      const len = chain.length;
      const base = Math.floor(ctrl);
      const frac = ctrl - base;
      const seg = (k: number): number => segLen(chain, k);
      const put = (k: number, arc: number): void => {
        const pp = chain[((k % len) + len) % len];
        mark(pp, arc, value);
        if (fused) throughJoint(pp, arc, value);
      };
      // Walk outward from the binding in both directions, accumulating
      // real arc length; stop where the erase gap ends.
      let arc = frac * seg(base);
      for (let k = base; arc < reach && k > base - 12; k--) {
        put(k, arc);
        arc += seg(k - 1);
      }
      arc = (1 - frac) * seg(base);
      for (let k = base + 1; arc < reach && k < base + 13; k++) {
        put(k, arc);
        arc += seg(k);
      }
    };
    for (let c = 0; c < this.crossings.length; c++) {
      const crossing = this.crossings[c];
      addWindow(crossing.over.chain, crossing.over.ctrl, c * 2);
      addWindow(crossing.under.chain, crossing.under.ctrl, c * 2 + 1);
    }
    // EMERGENT crossings cover their neighborhoods too - they render
    // with erase gaps exactly like registered ones, so the strict
    // anti-riding ramp must not fight their converging arms. The
    // collector still holds the PREVIOUS substep's rows here (it is
    // reset inside the iteration loop) - one substep of lag, which the
    // fade tolerates.
    const eBase = this.crossings.length;
    const { ctrlOf, chainOf } = this.topology;
    for (let k = 0; k < this.emergentCollector.n; k++) {
      const row = k * 4;
      const pi = this.emergentCollector.data[row] | 0;
      const pj = this.emergentCollector.data[row + 2] | 0;
      addWindow(
        chainOf[pi],
        ctrlOf[pi] + this.emergentCollector.data[row + 1],
        (eBase + k) * 2
      );
      addWindow(
        chainOf[pj],
        ctrlOf[pj] + this.emergentCollector.data[row + 3],
        (eBase + k) * 2 + 1
      );
    }
  }

  // Steer the two threads at a crossing toward the signed perpendicular:
  // rotate each binding's segment about the contact point so tangents can
  // never align (threads gluing along a stretch) or flip orientation.
  private applyTransversality(
    crossing: CrossingInfo,
    index: number,
    mobility = 1
  ): void {
    const segment = (
      pass: CrossingPass
    ): [number, number, number, number] => {
      const chain = this.chains[pass.chain];
      const len = chain.length;
      const i = Math.floor(pass.ctrl);
      return [
        chain[((i % len) + len) % len],
        chain[(((i + 1) % len) + len) % len],
        0,
        0,
      ];
    };

    const [a0, a1] = segment(crossing.over);
    const [b0, b1] = segment(crossing.under);
    let tax = this.positions[a1 * 2] - this.positions[a0 * 2];
    let tay = this.positions[a1 * 2 + 1] - this.positions[a0 * 2 + 1];
    let tbx = this.positions[b1 * 2] - this.positions[b0 * 2];
    let tby = this.positions[b1 * 2 + 1] - this.positions[b0 * 2 + 1];
    const la = Math.sqrt(tax * tax + tay * tay) || 1;
    const lb = Math.sqrt(tbx * tbx + tby * tby) || 1;
    tax /= la;
    tay /= la;
    tbx /= lb;
    tby /= lb;

    // Angle from over-tangent to under-tangent, steered toward sign * 90deg.
    const theta = Math.atan2(tax * tby - tay * tbx, tax * tbx + tay * tby);
    let error = crossing.sign * (Math.PI / 2) - theta;
    if (error > Math.PI) error -= 2 * Math.PI;
    if (error < -Math.PI) error += 2 * Math.PI;

    const delta =
      Math.max(
        -TRANSVERSALITY_MAX_STEP,
        Math.min(TRANSVERSALITY_MAX_STEP, error * TRANSVERSALITY_GAIN)
      ) * mobility;
    if (delta === 0) return;

    const cx = this.contacts[index * 2];
    const cy = this.contacts[index * 2 + 1];
    const rotate = (p: number, angle: number): void => {
      const dx = this.positions[p * 2] - cx;
      const dy = this.positions[p * 2 + 1] - cy;
      this.positions[p * 2] += -dy * angle;
      this.positions[p * 2 + 1] += dx * angle;
    };
    // Rotating the under side CCW increases theta; the over side CW does
    // the same, splitting the correction between the two threads. Apply
    // across the window (weights falling off outward) so the thread's
    // course rotates rather than kinking at one segment.
    const rotateWindow = (pass: CrossingPass, angle: number): void => {
      const chain = this.chains[pass.chain];
      const len = chain.length;
      const base = Math.floor(pass.ctrl);
      for (
        let k = base - TRANSVERSALITY_WINDOW;
        k <= base + 1 + TRANSVERSALITY_WINDOW;
        k++
      ) {
        const distOut =
          k < base ? base - k : k > base + 1 ? k - (base + 1) : 0;
        const weight = 1 / (1 + distOut);
        rotate(chain[((k % len) + len) % len], angle * weight);
      }
    };
    rotateWindow(crossing.under, delta / 2);
    rotateWindow(crossing.over, -delta / 2);
  }

  // Graduated contact friction for one crossing: 0 (frictionless) while
  // agitated or near the grab point, else blended from its smoothed
  // contact speed - 1 (full weld) below CONTACT_WELD_LO, 0 above
  // CONTACT_WELD_HI. The grab release is LOCAL: a global release
  // unfroze every contact in the knot at once, dumping the whole
  // fabric's stored standoff stress on the first touch (reported as
  // "the ENTIRE tangle jiggles" on a small one-sided drag). Distant
  // contacts stay welded until the tension wave actually arrives and
  // raises their contact speed.
  private weldFactor(ci: number, temperature: number): number {
    if (temperature > 0) return 0;
    const speed = this.contactSpeedEma[ci];
    return (
      Math.max(
        0,
        Math.min(
          1,
          (CONTACT_WELD_HI - speed) / (CONTACT_WELD_HI - CONTACT_WELD_LO)
        )
      ) * this.grabGate[ci]
    );
  }

  // World-space floor between the two contacts of every twist pair.
  // Fires only when a fold has pulled a pair below the floor (healthy
  // rest sits at 1.03+ vs a floor of 0.72-0.81); pushes the pairs apart
  // along the contact-contact axis with full-vector binding
  // corrections (weld 1: the axis is largely ALONG the threads near a
  // folded eye, and the kinetic tangential projection would swallow
  // exactly the component that reopens it). Runs regardless of grab,
  // weld, or the global stick - the collapse forms DURING a held grab,
  // and a world-collapsed twist is a rendered merge the knot must
  // never freeze on.
  private applyTwistSpacing(minDist: number): void {
    for (let p = 0; p * 2 < this.twistPairs.length; p++) {
      const a = this.crossings[this.twistPairs[p * 2]];
      const b = this.crossings[this.twistPairs[p * 2 + 1]];
      this.bindingPoint(a.over, this.bindScratch, 0);
      this.bindingPoint(a.under, this.bindScratch, 2);
      const ax = (this.bindScratch[0] + this.bindScratch[2]) / 2;
      const ay = (this.bindScratch[1] + this.bindScratch[3]) / 2;
      this.bindingPoint(b.over, this.bindScratch, 0);
      this.bindingPoint(b.under, this.bindScratch, 2);
      const bx = (this.bindScratch[0] + this.bindScratch[2]) / 2;
      const by = (this.bindScratch[1] + this.bindScratch[3]) / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > TWIST_AXIS_TRUST) {
        this.twistAxis[p * 2] = dx / dist;
        this.twistAxis[p * 2 + 1] = dy / dist;
      }
      if (dist >= minDist) continue;
      const nx = this.twistAxis[p * 2];
      const ny = this.twistAxis[p * 2 + 1];
      const deficit = minDist - dist;
      // Per side, per iteration: hard tier at collision's in-loop
      // authority, soft tier beyond (see TWIST_HARD_SNAP).
      const push =
        (Math.min(deficit, TWIST_HARD_SNAP) * COLLISION_STIFFNESS +
          Math.max(0, deficit - TWIST_HARD_SNAP) * TWIST_SOFT_STIFFNESS) *
        0.5;
      this.applyBindingCorrection(a.over, -nx * push, -ny * push, 1);
      this.applyBindingCorrection(a.under, -nx * push, -ny * push, 1);
      this.applyBindingCorrection(b.over, nx * push, ny * push, 1);
      this.applyBindingCorrection(b.under, nx * push, ny * push, 1);
    }
  }

  private applyBindingCorrection(
    pass: CrossingPass,
    dx: number,
    dy: number,
    weld: number
  ): void {
    const chain = this.chains[pass.chain];
    const len = chain.length;
    const i = Math.floor(pass.ctrl);
    const t = pass.ctrl - i;
    const a = chain[((i % len) + len) % len];
    const b = chain[(((i + 1) % len) + len) % len];
    // KINETIC contacts are frictionless: drop the component ALONG this
    // thread, keeping only the sideways push, so material slides through
    // the crossing and the slide re-projection alone owns the tangential
    // dimension. (Full-vector coupling welds the crossing to two material
    // points - correct for STATIC contacts at rest, but it made dragged
    // threads carry each other bodily.) `weld` grades between the two
    // regimes: 0 = frictionless, 1 = full weld (graduated friction; see
    // weldFactor). The tangent is a central difference across the
    // binding, NOT the raw segment direction, which jumps at every vertex
    // and made each particle a detent the binding snapped to.
    if (!this.stickyContacts && weld < 1) {
      this.pointOnChain(pass.chain, pass.ctrl - 0.5, this.tangentScratch, 0);
      this.pointOnChain(pass.chain, pass.ctrl + 0.5, this.tangentScratch, 2);
      const ex = this.tangentScratch[2] - this.tangentScratch[0];
      const ey = this.tangentScratch[3] - this.tangentScratch[1];
      const eLenSq = ex * ex + ey * ey;
      if (eLenSq > 1e-12) {
        const along = ((dx * ex + dy * ey) / eLenSq) * (1 - weld);
        dx -= ex * along;
        dy -= ey * along;
      }
    }
    // Normalize by the lerp-weight energy so the bound POINT moves by
    // exactly (dx, dy) rather than a t-dependent fraction of it.
    const w = (1 - t) * (1 - t) + t * t;
    this.positions[a * 2] += (dx * (1 - t)) / w;
    this.positions[a * 2 + 1] += (dy * (1 - t)) / w;
    this.positions[b * 2] += (dx * t) / w;
    this.positions[b * 2 + 1] += (dy * t) / w;
  }


}

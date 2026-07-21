# Knotmaze — Procedural Celtic Knot Maze Generator

A web-based procedural generator for celtic-knot-style mazes with physics-based relaxation, interactive tugging, and maze-solving gameplay.

## Overview

Three-layer architecture:
- **Layer 1 (Combinatorial):** `TangleGraph` — planar multigraph on a lattice with nodes (crossing/junction/end) and edges (thread segments). Strand tracing, checkerboard alternation, pairwise-crossing invariants.
- **Layer 2 (Geometric):** Centripetal Catmull-Rom splines through lattice points; arc-length parameterization.
- **Layer 3 (Dynamic):** Verlet-integrated particles; each strand is an independent closed chain (springs, bending, repulsion — no lattice anchors). Crossings are SLIDING BINDINGS: a fractional position along each of the two threads, re-projected each substep (true polyline-intersection targeting, nearest-point fallback) so intersections migrate along threads, coupled by a coincidence constraint, with ordering clamps preserving diagram topology. Contacts have STATIC/KINETIC friction: kinetic (coupling projected off each thread's tangent — material slides through crossings; slide + transversality active) while grabbed/agitated/moving, static (full-vector weld, crossing machinery frozen) once per-substep motion drops below a stick threshold — kinetic-only contacts wander forever (a PBD constraint standoff pumps the free tangential mode; no damping fixes it — measured via the phase probe), static-only reads as pinned when dragging. The knot is QUASI-3D: each particle carries a depth derived from the crossing diagram (over passes tent to +amp, under to −amp, over DEPTH_WINDOW 1.2 ctrl; contributions SUM, so a twist eye's midpoint cancels back to 0), and collision/repulsion treat threads as 3D capsules — required 2D separation is sqrt(margin² − dz²). Crossings therefore exempt themselves exactly where the diagram says the threads overlap, at any angle, and the width floor applies everywhere else, including inside kink loops and twist eyes (same-chain collision skip is only ±2 ctrl; KINK_MIN_SEPARATION 2.6 keeps a self-crossing's loop stocked with enough material to render). This replaced the circular contact-lens exemption (CONTACT_RADIUS + taper), whose radius mismatched the true overlap span (margin/sinθ) at oblique crossings — the mismatch both welded threads tangentially and fought geometry in a standing conflict (the source of the "threads bound at intersections" feel and the loop-end gap artifacts). Slide-chase corollaries that remain load-bearing: NO perceptible deadband (a weak tug moves material ~0.006 ctrl/substep — any useful deadband is a self-sustaining stick-slip trap), JOINT per-crossing intersection targeting (per-pass targeting can lock the two passes onto different intersections of a twist eye), and EXACT grabbed chase (ease 1.0 — chase lag feeds parasitic pull through the coupling). Gentle centroid centering + a bounds-following viewport replace grid anchoring. Simplex-noise temperature agitation.

Rendering: PixiJS v8 custom ribbon meshes with depth-based over/under casing gaps.

## Key Design Decisions

- **URL-as-complete-state:** Every design fully specified by `(seed, params)` serialized in the URL. Deterministic seeded RNG throughout.
- **ParamField abstraction:** All generator parameters read through a `ParamField` (constant | Simplex-modulated | painted), enabling region-biome variety natively.
- **Hero relaxation:** On load, lattice paths (angular 45° zigzags) visibly settle into smooth curves. Temperature slider allows re-agitation.
- **Knot-as-instrument:** Pluck threads → waves propagate; Web Audio maps loop-length to pitch.
- **Daily seed:** Wordle-style shared daily maze with time-to-solve sharing.

## Project Structure

```
src/
  core/
    tangle_graph.ts       # Layer 1: combinatorial structure
    lattice_grower.ts     # Lattice-based generation
    param_field.ts        # ParamField abstraction
  geometry/
    spline_generator.ts   # Layer 2: splines from lattice
  physics/
    particle_system.ts    # Layer 3: Verlet particles
    forces.ts             # Springs, bending, repulsion
  render/
    ribbon_renderer.ts    # PixiJS ribbon meshes
    ribbon_mesh.ts        # Triangle strip extrusion
  audio/
    knot_synth.ts         # Web Audio pluck/strum
  ui/
    tweakpane_panel.ts    # Control panel
    url_state.ts          # URL serialization
  main.ts                 # Entry point
test/
  core/
    tangle_graph.test.ts  # Layer 1 invariant tests
    lattice_grower.test.ts
  geometry/
    spline_generator.test.ts
```

## Running Locally

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm test         # Vitest
```

## Commit Policy

Work lands directly to `main`. All changes must be end-to-end working before committing; no partial or broken work.

## Notes

- Phased roadmap: P0 (scaffold) → P1 (combinatorial) → P2 (beauty + live physics) → P3 (touch + audio) → P4 (maze mode) → P5 (growth animation) → P6 (flourishes).
- Each phase ships as a working demo starting from P2.

## Verification rule (hard-won)

**Never use Chrome's `--virtual-time-budget` to screenshot anything
physics-dependent.** Virtual-time mode advances the sim only a fraction of
the nominal budget (~0.5 sim-seconds for a 12s budget), so screenshots show
an early mid-settle state, not equilibrium — an entire debugging session
chased "fixed" artifacts that only existed at true equilibrium. Use
`node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]` instead: it
drives a headed, hardware-GPU Chrome in real time and reports the page's
build stamp plus `sim/wall` seconds (which must match; the on-page
bottom-left stamp shows the same counters).

## Follow-ups

- **Crossing weld + loop-end gaps: RESOLVED by quasi-3D depth collision
  (P3.22).** The circular exemption lens was the root cause of four
  bugs (twist-eye merge, oblique naked gaps, R1-kink collapse,
  tangential weld); the depth model replaces it wholesale. Measured
  deltas on the repro seeds: weak-tug material flow through a crossing
  2.2 → 8.2 ctrl; grab-at-intersection now pins the junction (crossing
  moves 0.59 world, was 1.2–1.4) while 5 ctrl of the grabbed strand
  slips through; settle-to-sleep 21s → 3.9s sim (the standing
  collision-vs-geometry conflict at oblique crossings was the main
  quiescence obstacle); kink seed 2773729296 spans 0.67–1.31 with 3
  degenerate self-crossings → 0.67–0.72 with 0 (kinks no longer
  collapse — KINK_MIN_SEPARATION 2.6 + depth floor). Scanner clean on
  both repro seeds; 18/18 tests. Retired: CONTACT_RADIUS,
  EXEMPTION_TAPER_SLOPE, the taper sizing lore in earlier entries.
  Side effect (intended): hairpin tips and kink loops now hold ~a
  thread width open everywhere — same-chain skip is ±2 (was ±6).
- **Stuck-crossing feel: RESOLVED by removing the slide deadband (P3.19)
  + joint slide targeting and exact grabbed chase (P3.20).**
  A weak tug moves material ~0.006 ctrl/substep — below the old 0.015
  deadband — so bindings never slid, the exemption lens stayed glued to
  the material, and collision welded the two threads (measured: 99% of
  slide calls swallowed; binding slid 0.12 ctrl while the other thread was
  dragged 1.5 units; at cp=1 the slide was stick-slip jerks). Final state
  (deadband 1e-4, joint targeting, SLIDE_EASE_GRABBED 1.0): the same weak
  tug slides 2.21 ctrl smoothly, other-thread residual 0.042, no
  snapback. Rest chatter (the deadband's old job) is owned by static
  friction. Negative results from the same investigation: transversality
  off and MIN_PASS_SEPARATION 0.3 each changed nothing (clamp hits went
  to zero without freeing the slide); silencing the coupling at
  intersecting crossings while grabbed (a "boundary guard" theory) made
  it WORSE (slide 2.17 → 1.14, drag returned — collision re-welds).
  RETRACTED (P3.21): the "woven fabric co-motion" claim was a MEASUREMENT
  ARTIFACT — the sweep probe sampled reference points at fixed offsets
  from the SLIDING binding ctrl, conflating binding slide with material
  motion. With fixed material coordinates, swept-through material returns
  to within 0.06–0.09 of start after release: the crossings genuinely
  let material through. Probe rule: reference points must be FIXED
  material ctrls captured before the gesture. `ParticleSystem.slideStats`
  + `window.__knotPoint(chain, ctrl)` are the diagnostics.
- **Giant gaps at loop-end twists: RESOLVED by arc-length gap margins
  (P3.21).** The erase cut boundary was the over ribbon's OFFSET CURVE
  (perpendicular distance = fillHalf + gap), so the bare margin projected
  as gap/sin(angle) along the under thread — at the ~30° crossings that
  loop-end twists settle into, spans hit 1.07 with naked background
  wedges ~2× gap per side, reading as giant gaps. Fix: cut at the over
  SILHOUETTE (fillHalf) and push caps outward by `gap` as ARC LENGTH —
  margin now constant along the thread at every angle (span range
  collapsed 0.59–1.07 → 0.59–0.67). The scanner's BIG-GAP threshold sat
  at 1.3 and certified the bug as healthy through two "clean" audits —
  now 0.85. Lesson: a scanner threshold chosen without a perceptual
  reference is a rubber stamp; calibrate against what the worst healthy
  case SHOULD be.
- **The `cp` coupling toggle is REMOVED (P3.20).** The experiment
  answered its question: cp=0 welds crossings (collision has no
  tangential projection) and under stress leaves bound pairs torn up to
  ~0.8 apart that render as naked holes / displaced gaps at twists (the
  user-reported "occasional large gaps at loop-end twists" repro'd
  exactly this way). It was removed rather than kept as a toggle because
  a lingering `cp=0` in a live tab's URL silently poisons every later
  evaluation (Vite reloads preserve query params). Re-add from git
  history if ever needed.
- **Physics micro-oscillation floor: RESOLVED by static/kinetic contacts
  (P3.17).** Rest floor is now ~2e-3 units/substep (was ~1e-2): static
  mode freezes the crossing machinery so the constraint standoff repeats
  identically. QUIET_EPS 1.5e-2 and the test bound 1.2e-2 could tighten
  to ~5e-3 if ever useful. Hard-won negative results (measured with
  `ParticleSystem.enablePhaseProbe()`): velocity-impulse damping at
  bindings destabilizes (fights constraint projection, twice), inertial
  zone drag does nothing (the motion is constraint-driven, not inertial),
  and permanently frictionless contacts wander forever. Still open:
  default composition got looser/sprawlier after the twist-eye work
  (MIN_PASS_SEPARATION is the main compactness lever; consider making
  twist-eye openness a user param instead of a constant).
- **Wobbly threads at slack ~0 (P2 polish).** At the taut end the true
  equilibrium shows small-amplitude waviness along runs and rope-tight
  twist chains. Candidate knobs: constraint iterations (2 -> 3), pullOnly
  bending nonlinearity, repulsion/structural balance. Validate only via
  the real-time diag harness (see verification rule).

- **Make the hero settle more dramatic (P2 polish).** The settle currently
  reads as a gentle "tightening breath" rather than the zigzag-to-curve
  transition the design imagined: the Catmull-Rom splines round the lattice
  corners from frame one, so the initial angularity never shows. Fix: blend
  spline output toward the raw control polyline when settle progress is low
  (e.g. lerp sampled positions toward straight-line interpolation of the
  controls by `1 - settle`), so early frames render angular 45° zigzags that
  visibly soften. Touch points: `RibbonRenderer.update()` +
  `ParticleSystem` (expose settle progress).

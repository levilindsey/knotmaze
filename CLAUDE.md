# Knotmaze — Procedural Celtic Knot Maze Generator

A web-based procedural generator for celtic-knot-style mazes with physics-based relaxation, interactive tugging, and maze-solving gameplay.

## Overview

Three-layer architecture:
- **Layer 1 (Combinatorial):** `TangleGraph` — planar multigraph on a lattice with nodes (crossing/junction/end) and edges (thread segments). Strand tracing, checkerboard alternation, pairwise-crossing invariants.
- **Layer 2 (Geometric):** Centripetal Catmull-Rom splines through lattice points; arc-length parameterization.
- **Layer 3 (Dynamic):** Verlet-integrated particles; each strand is an independent closed chain (springs, bending, repulsion — no lattice anchors). Crossings are SLIDING BINDINGS: a fractional position along each of the two threads, re-projected each substep (true polyline-intersection targeting, nearest-point fallback) so intersections migrate along threads, coupled by a coincidence constraint, with ordering clamps preserving diagram topology. Contacts have STATIC/KINETIC friction: kinetic (coupling projected off each thread's tangent — material slides through crossings; slide + transversality active) while grabbed/agitated/moving, static (full-vector weld, crossing machinery frozen) once per-substep motion drops below a stick threshold — kinetic-only contacts wander forever (a PBD constraint standoff pumps the free tangential mode; no damping fixes it — measured via the phase probe), static-only reads as pinned when dragging. The knot is QUASI-3D: each particle carries a depth derived from the crossing diagram (over passes tent to +amp, under to −amp, over DEPTH_WINDOW 1.2 ctrl; contributions SUM, so a twist eye's midpoint cancels back to 0), and collision/repulsion treat threads as 3D capsules — required 2D separation is sqrt(margin² − dz²). Crossings therefore exempt themselves exactly where the diagram says the threads overlap, at any angle, and the width floor applies everywhere else, including inside kink loops and twist eyes (same-chain collision skip is only ±2 ctrl; KINK_MIN_SEPARATION 2.6 keeps a self-crossing's loop stocked with enough material to render). This replaced the circular contact-lens exemption (CONTACT_RADIUS + taper), whose radius mismatched the true overlap span (margin/sinθ) at oblique crossings — the mismatch both welded threads tangentially and fought geometry in a standing conflict (the source of the "threads bound at intersections" feel and the loop-end gap artifacts). Contacts carry GRADUATED friction (per-crossing smoothed contact speed → weld 0 while grabbed/agitated/fast, weld 1 when quiet) applied to the coupling's tangential component and to slide/transversality mobility — the dissipation channel that lets the constraint standoff freeze and the knot sleep after interaction (the lens's parasitic weld used to provide this by accident); the coupling also yields under clamp lag while threads intersect. MIN_PASS_SEPARATION (1.6) / DEPTH_WINDOW (1.4) sit in a measured constraint triangle with the 2.0 corridor pitch — see the constants' comments before touching any of the three. Slide-chase corollaries that remain load-bearing: NO perceptible deadband (a weak tug moves material ~0.006 ctrl/substep — any useful deadband is a self-sustaining stick-slip trap), JOINT per-crossing intersection targeting (per-pass targeting can lock the two passes onto different intersections of a twist eye), and EXACT grabbed chase (ease 1.0 — chase lag feeds parasitic pull through the coupling). Gentle centroid centering + a bounds-following viewport replace grid anchoring. Simplex-noise temperature agitation.

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

- **Fresh-settle limit cycle at fat widths: RESOLVED by crossing
  coverage + soft cosmetic margin on the anti-riding floor (P3.31).**
  P3.30's floor pumped with NO interaction at fat params (tw 0.52,
  rep 0.4, bd 1.75, sm 0.7): 3 of 8 seeds never slept, hot sites at
  STEEP crossings (sin 0.85-1.0), mv bursting 1.2e-2 - 7e-2 through
  the stick/unstick hysteresis (the freeze/unfreeze regimes have
  different equilibria - a limit cycle THROUGH the friction switch).
  Floor-push instrumentation found two standing-violation classes the
  angle gate alone can't be right about: (1) arm segments converging
  INTO a genuine crossing sweep through the shallow band at 2D
  separations the crossing's own geometry forbids raising (walls meet
  at the crossing point) - the floor demanded the impossible forever;
  (2) packed parallel weave pairs pinned at ~90% of the floor (0.54 vs
  0.60 target, ribbon width 0.52) - a full-stiffness war over COSMETIC
  margin the weave cannot yield. Fixes: (1) per-pair crossing COVERAGE
  (`PassCover`: 4 slots/particle, crossing*2+side, rebuilt every
  substep from pass ctrls - no stale state; a pair fades the floor
  out only when one endpoint sits near a shared registered crossing's
  over pass and the other near its UNDER pass, cover 1 within 1.0
  ctrl fading to 0 at 2.5) - pair-aware like P3.24, so third threads
  get no relief, and the unconditional 3D test still forbids
  interpenetration inside covered zones (coverage legalizes exactly
  what the erase gap renders, nothing more - visually audited);
  (2) TWO-ZONE stiffness: full authority below ribbon width (the true
  renderability line), RIDE_SOFT_STIFFNESS 0.15 in the width->margin
  band, so margin standoffs sit sub-stick-threshold and freeze.
  QUIET_EPS restored 2.2e-2 -> 1.5e-2 (its raise existed solely to
  tolerate the removed standing pushes; rest floor is ~2e-3 again).
  Verified: fat sweep 8/8 asleep sim 5-7s (was 5/8 at 12-23s + 3
  never); default sweep 8/8 at 3.9s unchanged; rider census 0 fresh
  AND post-tug (P3.30 regression guarded); play+tap re-sleeps; scans
  clean both repro URLs; 19/19 tests. Amends the P3.30 invariant:
  enforce closeness by angle, not place - EXCEPT that the rendered
  neighborhood of a crossing is a legitimate pair-scoped place (it is
  precisely where the renderer draws overlap), and a floor may never
  demand what geometry cannot give (that is a pump by construction).
- **Tangential riding under true-3D: RESOLVED by the
  transversality-gated 2D floor (P3.30).** True-3D collision legalized
  the one thing the eye still caught: threads riding ALONG each other,
  2D-close but z-separated - legal in 3D, unrenderable in 2D (only
  transversal overlap has a rendering: the erase gap). New stateless
  rule in collision: required 2D separation scales with parallelism -
  full width floor when local tangents are parallel (regardless of z),
  fading to zero by |sin| 0.55 (real crossings; the 3D test governs).
  Ramp (0.55 - sin)/0.25 - the shallower first ramp left riders parked
  at partial floors in the sin~0.3 band. Post-tug tangential census 12
  -> 0. QUIET_EPS raised 1.5e-2 -> 2.2e-2 (the gated push holds
  ~1.8e-2 standing corrections at shallow crossings post-interaction).
  THE INVARIANT, hard-won over ~10 iterations: a 2D-rendered knot may
  overlap only transversally; enforce closeness rules by ANGLE, not by
  place (every place-based exemption leaked).
- **"Threads too close" (all remaining forms): RESOLVED by TRUE-3D
  collision (P3.29).** The tug-then-rest census showed ZERO violations
  of the depth-exemption spec - the spec itself permitted sub-width
  hugging in every crossing's exempt core. Root insight after five
  exemption patches: an exempt region is a hole, and holes admit bugs.
  z is now a REAL simulated per-particle coordinate (`zPos`, overdamped,
  eased toward diagram-derived `zTargets` at Z_EASE 0.2); collision and
  repulsion are UNCONDITIONAL 3D capsule tests - no zones, no gates, no
  falloff shapes, at any width. 2D-squeezed threads resolve by
  separating in z (one goes over) - renderable by definition; emergent
  crossings order over/under by real z. Deleted: ZONE_SLOTS/zones,
  sharedZone, quartic falloff, CrossingZones (collector dedup is now a
  spatial scan of registered contacts). Post-tug census: flatClose
  (2D-close without depth separation) 0, VIOL3D 1 marginal at 92% of
  floor (Gauss-Seidel sandwich residual), 472 clean over/unders. All
  scans/settles/tests green. The z state is invisible to rendering
  except through over/under ordering.
- **Torn/mangled crossings after a small pull: RESOLVED by rendering at
  the true intersection (P3.28).** The user's actual workflow - a small
  tug, then observe AT REST - left crossings drawn as jagged, torn
  merges. Cause: the ordering clamps pin the physics binding away from
  the true intersection during the pull, the graduated weld then
  freezes that displacement into the rest state, and the renderer drew
  the erase + over-fill AT THE BINDING - beside the real overlap.
  Passes now carry a RENDER-ONLY `displayF` (the raw joint slide
  target, before easing/clamps, stale-frozen through static mode);
  `RibbonRenderer.renderCtrl()` prefers it everywhere crossing
  geometry is placed (centers + neighbor gaps). The physics ctrl keeps
  its clamp/topology duties untouched. Probe rule (twice burned):
  verify AT REST **after a small tug**, not just fresh settles or long
  play sessions - the three states fail differently.
- **Fat-thread "penetration": RESOLVED by width-scaled renderer reaches
  (P3.27).** After P3.26 the post-play physics state was verifiably
  clean (0 overlap pairs without full depth separation) yet tw 0.52
  still showed merges: the RENDERER's reach caps (CUT_REACH_MAX 1.35,
  OVER_REACH_MAX 1.2, neighbor clearances 0.65/0.42) were absolute
  constants calibrated at tw 0.42 - a fat shallow crossing's overlap
  extends past them, the erase cap lands INSIDE the overlap, and
  everything beyond renders uncut. Reaches now scale with fillHalf
  (CUT 6.5x, OVER 5.8x, floored at the old values), clearances raised
  to 0.8/0.5 (window-overlap invariant: their sum must exceed 1 so
  neighbor windows meet), local polylines out-reach the marches by 0.8,
  over-patch capacity 36 -> 56 samples. The scanner's BIG-GAP threshold
  is now derived from tw/gap in the URL instead of a constant. Probe
  rule: verify the POST-PLAY state, not just fresh settles - and
  separate "physics penetration" (pairs without depth separation) from
  "renderer failure" (depth-separated pairs drawn uncut) before fixing
  either.
- **Deep penetration at extreme params: RESOLVED by the final-authority
  collision projection (P3.26).** At rep 0.4 (raw repulsion distance
  0.25 < thread width — the slider could silently disable spacing),
  bend 1.75, smooth 0.7, tw 0.52, PBD collision at stiffness 0.5 lost
  its committee votes: equilibria settled in visible interpenetration
  (census: 9 cross-thread pairs at 0.31 vs the 0.60 floor) and the
  quiescence gate froze them. Architectural principle: collision is now
  the FINAL AUTHORITY over the rendered state — a full-stiffness
  double-sweep projection is the LAST position operation of every
  substep, so the substep-end state (the only state ever rendered or
  frozen) honors the width floor wherever depth doesn't exempt it;
  internal tug-of-wars continue between substeps but cannot appear on
  screen. Two sweeps because one Gauss-Seidel pass leaves ~25% residual
  where a particle sits between two violated pairs. Also: repulseDist
  now floors at collisionDist*1.02. Census after: crossFree 0,
  selfNear 0, remaining selfMid pairs are kink necks that render as
  proper covered crossings. Play-settle, scans, tests all green.
- **Shallow-crossing tangential merges + release twitching: RESOLVED
  (P3.25).** Two P3.24 leftovers. (1) The 3D-capsule floor
  sqrt(margin²−dz²) is the wrong SHAPE for renderability: its slow
  lateral recovery let shallow crossings hug tangentially along the tent
  slopes (dz = 0.7·margin still allowed centerlines at 0.71·margin —
  inside ribbon overlap, unrenderable since the erase covers only the
  silhouette span). Now QUARTIC (1 − u⁴): ~90% floor at dz = 0.7·margin,
  still exactly 0 at the crossing point. Tangential-merge census
  (shared pairs < 0.85·width beyond 0.6 of every shared contact): 8
  artifacts → 0 real (probe rule: with multi-zone tags, always measure
  against the NEAREST shared crossing — first-match flags legit crossing
  pairs of a twist's other crossing). (2) Grab release snapped welds
  open instantly across the whole radius — every released crossing
  dumped its pent slide/torque corrections at once ("nearby parts
  jiggle in unrelated ways"). Now a per-crossing gate eased at 0.05/
  substep (~100ms) with a tighter bubble (1.2 → 3.0). Locality: 4–8
  band mean displacement for a 1.3-unit drag 0.199 → 0.080.
- **Whole-tangle response to a local tug + thread sink-through: RESOLVED
  (P3.24).** Two P3.23 leftovers. (1) `weldFactor` released EVERY weld
  globally on grab — first touch dumped the entire fabric's stored
  standoff stress (reported: "the ENTIRE tangle jiggles"). Now the grab
  release is spatial (free within 2.5 of the grab, tapering to
  speed-sensed by 5.0); far-field response to a 1.3-unit drag dropped
  0.25 → 0.097 mean (residual is spring transmission, physical at slack
  0). (2) The depth exemption was pair-blind: any third thread near a
  crossing inherited a reduced floor and could sink into the pair with
  no rendered gap (grazing overlaps are below the collector's |sin|
  cutoff too). Depth scaling (collision AND repulsion) now gates on the
  pair sharing a registered crossing's zone — and the zone table itself
  was a bug: 2 slots with last-writer eviction flapped tags in dense
  weaves (crossings every ~5 ctrl on big chains), letting pairs sink
  while covered then freeze as canceled standoffs 0.18-0.25 apart.
  ZONE_SLOTS=4, first-come no-evict. Sink census (non-shared pairs
  < 0.7 margin at rest): 8 → 0. Probe rule: census scripts must
  replicate the force pass's zone lookup exactly or they lie.
- **Post-play endless jiggle: RESOLVED by graduated contact friction +
  the spacing/window triangle (P3.23).** P3.22's depth model removed the
  lens's parasitic tangential weld — which had ALSO been the only
  dissipation for the PBD standoff (bending/structural/collision cancel
  ~1e-1 each at rest). After a play session the knot rang forever at
  ~5e-2, above the binary stick gate. Two root causes, both measured via
  an OFF-SCREEN browser probe (`--window-position=2200,50` — headed
  probe windows on the desktop get contaminated by real pointer activity;
  one contaminated run cost an hour of false theories): (1) passes pinned
  at the old 0.9 ordering floor sat inside each other's opposite-sign
  depth tents — cancellation left a residual collision floor at segments
  the diagram requires to intersect, an unresolvable coupling-vs-collision
  pump; (2) with no contact friction, nothing dissipated the standoff.
  Fixes: MIN_PASS_SEPARATION 1.6 with DEPTH_WINDOW 1.4 (triangle: window
  < floor so tents never cancel; window > ~1.3 clamp-lag so pinned
  intersections stay covered; floor < 2.0 corridor pitch so bindings keep
  slack — 2.0 made corridors convoy-only and grab-at-X regressed to
  1.29); per-crossing GRADUATED friction from a smoothed contact speed
  (weld 0 above 3e-2 or while grabbed/agitated, 1 below 5e-3) applied to
  the coupling's tangential component AND fading the slide/transversality
  mobility, so quieting anchors freeze and the standoff becomes
  substep-identical; the coupling YIELDS under clamp lag while threads
  intersect (unachievable coincidence = pure fight) but NOT in fallback
  (yielding there abandoned crossings — pairs tore 5.4 apart), and the
  yield fades back out as the weld engages (else pairs fossilize
  mid-separation, sep 0.89 → 0.03 after the fix). Failed approaches, for
  the record: exempting properly-intersecting shared-zone pairs from
  collision (binary flicker, mv spikes 3.5e-1), anchoring depth tents at
  the true intersection (stale anchors during separation tore pairs to
  5.9), transversality-off (no effect — it was never the pump). Verified:
  play session + tap re-sleeps in ~2s at dr 0.5; all 4 tap sites clean;
  scans clean on both repro seeds; weak tug still slides 9.4 ctrl.
  `test/quiescence.regression.test.ts` guards the dissipation channel.
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

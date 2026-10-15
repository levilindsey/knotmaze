---
paths:
  - "src/physics/particle_system.ts"
  - "src/physics/forces.ts"
  - "test/physics/particle_system.test.ts"
  - "test/quiescence.regression.test.ts"
---

# Physics lore: contacts and collision (the P3 saga)

Moved verbatim from `physics.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `physics.md` lists the area's other files.

## The P3 saga: invariants, mechanisms, lessons, negative results

- *From P3.42 (broadphase rebuilt flat), the counting-sort grid:* Now a
  zero-allocation counting-sort grid (forces.ts `buildGrid`), with the
  repulsion exclusion moved from the precomputed pair Set to a topology
  ctrl-distance test, and hot-loop Math.hypot -> Math.sqrt (hypot is
  several times slower in V8). Pair iteration order is preserved by the
  counting sort; cell ORIGINS moved from absolute to bounds-anchored,
  which shifts marginal broadphase catches - trajectories diverge from
  P3.41 (chaotic, statistically identical; both grids only guarantee
  catches within one cell size). Non-finite states now SKIP the force
  pass instead of collapsing the Map into one bucket (the old O(9N^2)
  NaN hang).

- *From P3.42, gotcha (2):* (2) The pathological-wound regression test failed on a healthy state:
  its fixed 60s measurement window landed on a transient burst (the
  wound transient bursts to ~2e-1 near 50s, decays to the ~1e-2 band by
  ~110s - measured over 240s; the loud attractor by contrast holds
  1.3e-1+ with NO trend). The test now measures at 120s, past the
  transient, so it asserts the actual guarantee (no self-sustainment).

- *From P3.39 (the flattened-twist flip), the twist material ratchet:* The escape: make the
  flattened state UNREACHABLE - the taut chord existed only because
  twist twins clamp at the generic MIN_PASS_SEPARATION 1.6 ctrl (arc
  0.77 at slack 0), too little material for the eye to stay open at
  the P3.37 world floor. Twist twins now hold a kinkSep-style budget
  twistSep = max(2.2, 5.2*threadWidth) ctrl, applied as a
  RATE-LIMITED RATCHET (TWIST_SEP_RATE 0.015 ctrl/slide,
  mobility-scaled): the clamp floor rises from the pair's current gap
  toward the budget instead of snapping. The snap version pinned fat
  seed 42424242 at mv 1.6e-2 FOREVER (hot at two steep crossings the
  weave would not let separate - the P3.31 full-authority pump
  shape); rate-limiting keeps a pinned pair's standing push
  sub-stick (~7.5e-3 world) and mobility-scaling lets the graduated
  friction weld strangle it, so the sweep sleeps again.

- *From P3.39, lessons:* LESSONS: (1) when a render corridor is over-constrained, fix
  the PHYSICS reachability of the state, not the paint; (2) a
  positional clamp is full-authority by construction - any clamp
  RAISE against unknown geometry needs a rate limit under the stick
  gate or it is a pump waiting for the right seed; (3) my own "tidy"
  judgment of a color-color boundary was the blind spot - the user's
  standard is NO thread-thread contact without a dark line, ever.

- *From P3.37 (twist collapse during a held grab), the world-space contact floor:* Two mechanisms, both
  needed: (1) PHYSICS - the twist's two crossings world-collapsed to
  pairDist 0.01-0.04 while the along-thread clamps stayed satisfied;
  `applyTwistSpacing` now enforces a WORLD floor between the contact
  points of every twist pair (pass-adjacency on BOTH threads, built
  once in `buildTwistPairs`): max(0.72, 1.8*threadWidth), two-tier
  authority (TWIST_HARD_SNAP 0.12 at collision stiffness, 0.15 soft
  beyond), full-vector binding corrections (weld 1 - the separation
  axis is largely ALONG the threads and the kinetic tangential
  projection would swallow it), runs after the coupling every
  iteration regardless of grab/weld/stick. Census anchor (fat +
  default + kink seeds): healthy resting pairs sit at 1.03+ world, so
  the floor engages only on abnormal folds.

- *From P3.37, lessons:* LESSONS: a world-space invariant cannot be enforced by
  along-thread rules (the clamps could not see the collapse); and
  when a floor parks below target, measure the MATERIAL ARC before
  adding authority - twist 1 parked at 0.80 because 0.78 of thread
  connected the contacts, and no push law can exceed a taut chord.

- *From P3.36 (the cinched-twist merge), force-side coverage:* Force-side coverage
  reach settled at 2.0 WORLD ARC by triangulation: 1.16 (fixed erase
  span) moved the pump to wide-kink necks at arc 1.2-1.7; 3.8 (the
  full render cap) exposed a coupling-side post-tug standoff; 2.0
  covers the measured impossible-separation band, and beyond it the
  floor separates threads while the long erase covers the interim.

- *From P3.36, the quiescence test:* Quiescence test split in two tiers: realistic drags (radius 1.2)
  must fully re-sleep; the pathological teleport wound (radius 2.5
  dragTo jumps) leaves topologically stuck sub-width tangles that the
  sim REFUSES to freeze (never sleep on a merge) - its guarantee is
  bounded churn < 7e-2, no loud attractor.

- *From P3.36, lesson:* LESSON: the P3.31 sin was never exemption size - it was exempting
  more than the renderer painted. Force exemptions and render reach
  must quote the same geometry, and when physics legitimately cannot
  separate threads, rendering must own the overlap.

- *From P3.34 (the merged-parallel-threads seam), the physics helpers:* Physics keeps two gentler helpers:
  a per-triple TURN-RADIUS chord floor (in-loop 0.5 only - full
  authority was tried and pinned a flat 3.4e-2 pump for 3+ minutes on
  a wounded tangle; a tangle-squeezed fold cannot open without the
  tangle yielding) and a WIDTH-SCALED kink-eye budget (kinkSep =
  max(2.6, 6.2 * threadWidth) ctrl - 2.6 was calibrated at tw 0.42
  and starves fat eyes; note the ctrl metric cannot see COMPRESSED
  segments, measured at 53% rest inside a squeezed eye, so arc
  starvation can persist regardless - the miter clamp is the
  correctness layer, physics floors are aesthetics).

- *From P3.33 (the frozen merge seam after play), the push-law experiments and the riders gate:* Six push-law/mechanism experiments, all measured (do not re-run
  them): flat cap loses small fights; unbounded authority rings 90+
  sim-s on violent wounds; violation-driven local weld release (work
  gate) FED the attractor (5 min mv 1e-1-3e-1, rejected); two-tier
  wins: full authority for the first HARD_SNAP 0.04 of deficit
  (exceeds bending's ~2.4e-2/substep re-creation - standing
  tug-of-wars are WON and held at width), RIDE_SOFT 0.15 beyond.
  Plus: the last final-authority sweep records standing hard
  violations deeper than 0.03 into `violationList`; `ridersPending`
  blocks BOTH the global stick and main.ts sleep - the knot may never
  freeze ON a rendered merge.

- *From P3.33, known residual:* KNOWN RESIDUAL: 75-s torture gestures create multi-thread
  tangle clusters (~10 pairs at d 0.29-0.49, same set for 5 min) that
  are TOPOLOGICALLY stuck at slack ~0 - no local push law resolves
  them (separating one pair violates another); the knot stays dimly
  awake on them (mv ~3-5e-2, slowly trending down) instead of
  freezing merged. Their resolution needs material redistribution
  through crossings - the open loud-attractor problem below.

- *From P3.32 (post-play riders), the fix:* Fix: (1)
  ramp par = (0.8 - sin)/0.25 - full floor through sin 0.55, zero
  only above 0.8 so threads can still pass transversally to FORM
  crossings; (2) properly-intersecting pairs at collectible angle
  (sin > 0.25) are exempt - they render as crossings by definition;
  (3) PassCover extended to EMERGENT crossings (previous substep's
  collector rows feed addWindow with ids crossings.length+k) so the
  strict ramp cannot pump at tunneled crossings' arms; (4) BOUNDED
  AUTHORITY - the hard sub-width push is capped at RIDE_MAX_PUSH
  1.2e-2: at slack ~0 a violent wound can leave overlap the geometry
  cannot undo without stretching thread (globally infeasible), and
  the uncapped floor rang forever on it (90 sim-s no trend in the
  headless drag test); capped, free riders still separate ~0.3
  units/s (gone within the sleep gate's 45-frame window) while
  blocked pairs freeze sub-threshold. Only the 2D renderability
  preference is bounded; the 3D capsule keeps unbounded final
  authority.

- *From P3.31 (fresh-settle limit cycle at fat widths), crossing coverage and the two-zone floor:* Floor-push instrumentation found two standing-violation classes the
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

- *From P3.31, the amended invariant:* Amends the P3.30 invariant:
  enforce closeness by angle, not place - EXCEPT that the rendered
  neighborhood of a crossing is a legitimate pair-scoped place (it is
  precisely where the renderer draws overlap), and a floor may never
  demand what geometry cannot give (that is a pump by construction).

- *From P3.30 (tangential riding under true-3D), THE INVARIANT:* THE INVARIANT, hard-won over ~10 iterations: a 2D-rendered knot may
  overlap only transversally; enforce closeness rules by ANGLE, not by
  place (every place-based exemption leaked).

- *From P3.29 (true-3D collision), the true-3D model:* Root insight after five
  exemption patches: an exempt region is a hole, and holes admit bugs.
  z is now a REAL simulated per-particle coordinate (`zPos`, overdamped,
  eased toward diagram-derived `zTargets` at Z_EASE 0.2); collision and
  repulsion are UNCONDITIONAL 3D capsule tests - no zones, no gates, no
  falloff shapes, at any width. 2D-squeezed threads resolve by
  separating in z (one goes over) - renderable by definition; emergent
  crossings order over/under by real z.

- *From P3.29 (true-3D collision), the z state and rendering:* The z state is invisible to rendering
  except through over/under ordering.

- *From P3.26 (deep penetration at extreme params), the final-authority principle:* Architectural principle: collision is now
  the FINAL AUTHORITY over the rendered state — a full-stiffness
  double-sweep projection is the LAST position operation of every
  substep, so the substep-end state (the only state ever rendered or
  frozen) honors the width floor wherever depth doesn't exempt it;
  internal tug-of-wars continue between substeps but cannot appear on
  screen. Two sweeps because one Gauss-Seidel pass leaves ~25% residual
  where a particle sits between two violated pairs. Also: repulseDist
  now floors at collisionDist*1.02.

- *From P3.23 (post-play endless jiggle), the root causes, the triangle and graduated friction:* Two root causes, both measured via
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
  5.9), transversality-off (no effect — it was never the pump).

- *From P3.23 (post-play endless jiggle), the regression guard:* `test/quiescence.regression.test.ts` guards the dissipation channel.

- *From P3.19/P3.20 (stuck-crossing feel), negative results:* Negative results from the same investigation: transversality
  off and MIN_PASS_SEPARATION 0.3 each changed nothing (clamp hits went
  to zero without freeing the slide); silencing the coupling at
  intersecting crossings while grabbed (a "boundary guard" theory) made
  it WORSE (slide 2.17 → 1.14, drag returned — collision re-welds).

- *From P3.17 (static/kinetic contacts), negative results:* Hard-won negative results (measured with
  `ParticleSystem.enablePhaseProbe()`): velocity-impulse damping at
  bindings destabilizes (fights constraint projection, twice), inertial
  zone drag does nothing (the motion is constraint-driven, not inertial),
  and permanently frictionless contacts wander forever.

## Open: the loud attractor (K13)

- **OPEN: post-VIOLENT-play loud attractor at fat params.** After ~75s
  of machine-gun gestures (fast circles + sweeps at 5 sites) on the fat
  URL, the knot sometimes parks at mv 1.3-2.3e-1 indefinitely (3-min
  watch, no trend) and sometimes self-recovers - stochastically
  bistable. Gentle play (3 small tugs) always re-sleeps (~sim 14).
  MEASURED FINGERPRINT, do not re-derive: (1) hot particle wanders the
  whole knot (not one site); ~half the hot attributions sit at torn
  fallback pairs, sep 0.77-1.17; (2) high-speed slide/transversality
  mobility taper (`abHighSpeedTaper`): partial - drops to 4-9e-2 then
  re-inflates; aligning the taper band to the weld band did not close
  it; ALSO freezes bindings stale, blocking torn-pair recovery - wrong
  lever; (3) slip-based weld (`abSlipWeld`, EMA of relative binding
  slip instead of absolute contact speed): NO effect - the loud state
  slips for real, co-motion is not the issue; (4) `abCoupling=0`
  explodes the fabric (mv 5.8) - the fallback boundary guard is
  load-bearing; (5) extra velocity damping 0.3/substep
  (`abExtraDrag`) does NOT kill it - the motion is DRIVEN (constraints
  re-inject each substep), not kinetic; note this was measured on the
  post-explosion state. WORKING THEORY: torn fallback pairs whose
  reunion path is BLOCKED by an interposed thread - the coupling does
  not yield in fallback (P3.23: chronic fallback yield abandons
  crossings), so a blocked pair fights collision at full strength
  forever. Candidate directions: progress-gated fallback yield (yield
  only while sep is not decreasing; risks parking above the sleep
  gate), or a z-aware reunion channel (the path is blocked in 2D but
  legal over the obstruction in 3D - Z_EASE currently pulls z back to
  the diagram tents faster than a traversal can hold altitude). The
  `ab*` A/B knobs and `contactSlipEma` plumbing from this
  investigation were REMOVED in the P3.41 cleanup (their verdicts are
  recorded above; re-add from commit 0b91d15 if injector
  fingerprinting is ever re-run).

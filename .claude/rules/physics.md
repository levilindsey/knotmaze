---
paths:
  - "src/physics/**"
  - "test/physics/**"
  - "test/*.regression.test.ts"
  - "test/sweep.manual.test.ts"
---

# Physics lore

Binding lore for the particle system, moved verbatim from CLAUDE.md by
K45 (2026-10-12). A passage taken from inside a longer entry is labeled
with its source; the narrative and measurements around it are in
`docs/history.md`. Elsewhere: the knot-mode byte-identity rule is in
CLAUDE.md, probe and census methods in `probes.md`, render-side lessons
in `render.md`. Add new physics lore here, not to CLAUDE.md.

## The sleep gate (K63)

- **The sleep gate counts SIM TIME (K63): QUIET_WINDOW 2.5 s,
  physics/sleep_gate.ts.** It counted 45 frames: 4.5 sim-s at <= 10 fps
  (pixi caps a frame at 0.1 s, and real-size settles are physics-bound
  there, so every design slept at exactly sim 7.0 = settleComplete 2.5 +
  4.5) but 0.75 s at 60 fps and in the physics-off load. A short window
  is NOT free: some designs are not at rest at 2.5 s - a bridge, an open
  tail or a kink's neighborhood snaps through to a new rest 3.5-5 s in,
  mostly under QUIET_EPS, so no window sees it start. 0.75 s froze 2 of
  1071 K46 designs before a loud snap and ~4% of a sample 0.05-0.17
  world from rest. Chosen by tripping every window on one trajectory and
  diffing each frozen state against a run that kept stepping
  (.claude/probes/K63 window.ts, gesture.ts): clean (within 0.05 world,
  no loud lull) from 2.25 s; 2.5 adds a margin. Sleep is ~5.0 sim-s
  everywhere (default design: desktop 12.3 -> 8.9 s wall, phone 13.0 ->
  8.8 s) and sim-at-sleep is comparable across frame rates. No window
  covers sub-QUIET_EPS creep: a ga=0 knot drifts ~1.5 world over ~50 s.

## Kink eyes (KINK EYES, with K41)

- KINK EYES (worktree agent, 2026-10-11; Levi: "This twist is getting too
  squished" - crossing 305 at `?k88dtb.oHFEfg` parked at the 3.2-ctrl kink
  floor, its eye a closed notch). Every kink (a self-crossing whose two
  passes are chain-order neighbors) now rests with an OPEN, round eye.
  TARGET + CENSUS: hole = 2 x (largest circle inside the loop's RENDERED
  centerline - half width) >= 0.8 widths, every kink, at rest, headed
  real-time Chrome. Before -> after (min / median widths; kinks under):
  user 0.17/0.36 -> 0.97/1.24 (16/21 -> 0); default 0.20/0.72 ->
  1.10/1.25 (12/17 -> 0); tw .64 0.08/0.45 -> 0.88/1.17 (17/17 -> 0); tw
  .42 0.35/1.09 -> 1.27/1.44 (5/17 -> 0); knot mode (19ven80, mf=0)
  0.22/0.32 -> 1.05/1.27 (20/20 -> 0). THREE CLOSERS, each measured (per-
  loop-particle phase attribution through the probe() hooks + settle
  traces): (1) LASSO DRAIN - every kink is one lattice motif (8 ctrl, 3.29
  world of rest material at slack .55); the initial transient pulls it
  out through the crossing (8.0 -> 6.65 ctrl in 0.5 s), then the contacts
  go STATIC at ~0.6 s and freeze what is left; (2) FAIRING is curve-
  shortening on a closed loop (-21.6e-3 per particle per substep against
  bending's +26.5e-3); (3) ASYMMETRIC REPULSION - the +-6 ctrl same-chain
  exclusion hides an 8-ctrl loop's own across-eye pairs while each arm is
  still pushed INTO the eye by the opposite tail. Material alone is NOT
  enough: holding the full lattice loop left knot holes at 0.30-0.49, the
  arc going into a narrow neck. FIX (particle_system.ts): (a) EYE RATCHET -
  a budget of 7 widths of REST material (structural rests; segments rest
  0.16-0.64 world per ctrl, so ctrl is not a size) in settled-shrink
  units, P3.39 form (0.015 ctrl per slide, mobility-scaled, from the
  current gap), FIRST in the clamp stack. The jn ratchet and a twist
  twin's soft ratchet on a kink pass's outer side INTERSECT with it
  (neither takes the other's unmet budget; both short = the pass holds) -
  both sequential orders failed measurably (jn last walked a kink back
  into its loop 8 -> 6.8 ctrl; kink last parked a joint on the crossing, a
  standing rider that never slept; the twin's 3.3-ctrl budget conveyed a
  fat kink 8.34 -> 8.01). Ordering clamps still always win, so a MIN_PASS
  convoy can still take a little (seen: 8.0 -> 7.8). (b) EYE PRESSURE -
  pairs of one loop at least 35% of its material apart repel toward the
  CHORD of a round eye, D sin(pi Ds / L) (Ds = their rest arc apart, L =
  the loop's rest arc between the bindings, D = max(repulseDist, 2.6
  widths); since K41 - a flat 2.4 before, see below) with
  applyRepulsion's 3D law and stiffness (which now skips them via
  topology.kinkOf). (c) Kink loops skip fairing
  (a residual 0.15/0.3 changed roundness by nothing). VERIFIED: browser
  sleep sweeps, 8 seeds x default/fat, 16/16 asleep at sim 7.0, riders 0
  (baseline 13/16 - 3 fat seeds never slept); gesture battery, 6 kinks x
  hold 6 s / pull 0.5 / cinch 1.2, 18/18 re-slept, riders 0, eyes >= 1.0
  widths after; crossing-gap scan clean at all 5 URLs (kink erase spans
  0.62-0.89); vitest incl. quiescence green; golden REGENERATED (both
  golden knots contain kinks - 2 and 4; kink-free knots stay
  byte-identical). RESIDUALS: at tw .64, 3 of ~152 kinks over 8 seeds rest
  at 0.56-0.78 widths - BOXED kinks (a fused joint on one side, the 1.6
  corridor floor on the other) keep only lattice material, whose round
  loop leaves at most a 0.64-width hole at that width (pressure stretches
  it ~20%). tw >= 0.72 does not sleep in the baseline either (standing
  riders: 2/4 at .72, 0/4 at .8 in both builds). The phone's 3.37-ctrl
  state did not reproduce on desktop: a 1e-3 initial jitter barely moves
  the settle (it is contractive at that scale), so engine math or prior
  play put it there; the ratchet now blocks the drain either way. LORE
  (flat law): 2.8 widths PUMPED (2/8 fat seeds never slept: once the eye
  distance outruns the depth tents' z separation, pressure on the arms
  beside the crossing fights the coupling - lags 0.5-1.4, mv bursts to
  1e-1 through the friction switch); 2.6 inflated default eyes (median
  1.25 -> 1.34) without lifting the boxed outliers. PROBE LORE: a vite-node harness that
  builds the scene with main.ts's own calls (parseParams,
  generateLatticeKnotwork, the maze plan/apply) and steps step(0.1)
  frames (pixi caps a frame's dt at 0.1 s; gs 18 runs ~5 fps here)
  reproduces the browser's physics exactly - identical spans - at 8-15 s
  per scene, 14 in parallel; attribution experiments take minutes, not
  hours. Wrapping ps.probe() decomposes every solver phase per particle.
  And the contacts go globally STATIC ~0.6 s into the hero settle: slides,
  and every along-thread ratchet with them, act only in that window and
  during gestures - a budget cannot "grow in" during the settle.
  K41 SLEEP REGRESSION (2026-10-12, worktree agent): after 9920fab the
  rect user link (?s=1471kin&gs=12&rep=1&bd=1&sm=.25&ga=0&tw=.64...) and
  the fat knot link (?s=p9ar6&mf=0&rep=.4&bd=1.75&sm=.7&tw=.52) never
  slept (~100 ms of physics per frame at rest). Three causes, attributed
  per particle and phase, each confirmed by a SAME-STATE switch (one
  settled state, one mechanism toggled; the knob tree lives in
  .claude/probes/K41/exp): (1) applySegmentCollision's "true-3D" capsule
  solved its closest points in 2D and read z there. A twist eye's arms
  run parallel in the plane with opposite z slopes, so that point jumped
  between segment ends and the two final sweeps overshot in turn - a
  period-2 limit cycle, mv pinned at 1.9e-2. Solved in 3D now (exact
  early-out on the 2D distance). PRE-EXISTING: the fat fabric (rep .4,
  bd 1.75, sm .7, tw .52, gs 18) failed 4 of 9 seeds even on df373b5; all
  sleep now. (2) The flat eye-pressure target asked the loop's two ends,
  which flank the crossing, to stand a diameter apart: kink crossings
  rested pried 0.04-0.06 open against the coupling (~0.01 now), and the
  squeezed neighbor eye fell into (1). The chord law asks nothing there;
  D 2.6 keeps the flat-2.4 eye sizes. (3) A twist ratchet conveyed a
  plain pass 2.0 -> 1.34 ctrl into a fused joint's unmet jn budget, and
  the joint's bridge arm rode the crossing's over thread at the hard line:
  a standing rider (pre-existing: df373b5 stuck there on 1 of 8 jittered
  starts). The ratchet INTERSECTION now covers every pass with a jn
  record and a twist twin, and PassCover continues THROUGH a fused joint
  onto its other arms with the remaining arc - the joint is one material
  point, and a joint lattice-forced 2.0 ctrl from its crossing (tw .64,
  seed 3zz2a1) can never clear the over thread. AFTER: both links asleep
  at sim ~7 (wall ~9 s), frame cost at rest 111/119 -> 5/8 ms, settle
  cost unchanged. Census (min/median widths): user 0.96/1.26, default
  1.10/1.22, tw .64 0.91/1.23, tw .42 1.11/1.29 (its D is repulseDist;
  was 1.27/1.43), knot 1.04/1.22. Browser sweeps 32/32 asleep (8 seeds x
  default, tw .64, fat fabric, fat knot). BOXED kinks (span 8, lattice
  material) rest smaller than under the flat law, which bought them size
  by prying their crossings open: default 3zz2a1 X304 0.78-0.80, tw .64
  five at 0.64-0.74 (K29). Guard: test/physics/sleep.regression.test.ts.
  PROBE LORE: a still press is a render-only tap-pluck since df373b5
  (tugs start past a 4 CSS px slop), so a "hold" probe must move ~12 px
  first - the battery above held nothing.

## Fabric and open-chain mechanisms (P4 rounds)

- *From the FABRIC SLEEP FIX (2026-10-10), the junction cover:* Fix = a graded
  2-slot JUNCTION COVER (forces.ts `JunctionCover`): marks walked ±3
  ctrl along each fused arm at fusion time fade the 2D anti-riding
  floor for pairs near arms of the SAME junction — the P3.31 theorem
  again (the tuck/fillet joinery RENDERS that overlap as a joint, so
  the floor may not demand separation there). 3D capsule unconditional;
  knot mode never allocates the cover (byte identity green).

- PHYSICS JUNCTION SPACING (worktree agent, user-requested): fused
  joints keep their nearest crossing at jnSep = max(2.2,
  5.7*threadWidth) ctrl per arm via a P3.39-style rate-limited ratchet
  (JN_SEP_RATE 0.015, mobility-scaled) in easePassToward BEFORE the
  ordering clamps (they always win - never forces topology). Corridor
  lesson: a pass flanked by TWO joints needs each side's budget capped
  at half the joint-to-joint span, or last-writer dominance CONVEYS it
  tighter than before. Census at the repro seed: sub-2.0-ctrl tail
  41 -> 9, worst 1.39 -> 1.90, survivors parked sub-stick (fabric
  still sleeps 3.9). Knot mode structurally untouched (no fusions ->
  no clamp records). Full battery green (sweeps knot+fabric incl. the
  P3.39 pin seed, quiescence, gesture battery 9/9 re-sleep, scans).
  The flagged easePassToward seam-end guard bug was REAL and is fixed
  (633d290 - see the late-2026-10-10 round below).

- *From the ROOT-CAUSE ROUND (late 2026-10-10), open-chain terminal passes:* PHYSICS: easePassToward's open-chain
  terminal passes clamp against their REAL neighbors (the first pass
  skipped all ordering clamps; the last clamped against its own
  pre-step ctrl - 1.6-ctrl sawtooth jumps, order inversions, a
  fallback runaway; 4/28 fabrics incl. seed 20 at defaults never
  slept).

- *From the open artifact queue (2026-10-11), agent-measured and not yet fixed:* AGENT-MEASURED, NOT YET
  FIXED: (1) [FIXED late 2026-10-10: neighborGaps now gives an open
  chain's self-linked side the run to its chain end - first passes'
  chain-start cut 0.360 -> 0.482]; (2) latent
  seam-window wraps on open chains (applyTransversality's window, the
  slideCrossing/projectOntoChain windows, updatePassCover +-12 slots)
  index modulo len - a seam-relative clamp like addDepthTent's;
  (3) [GONE with the erase grid in G1] the lane-cut limiter stack.

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

## Architecture and tooling

- `test/sweep.manual.test.ts` was reviewed and KEPT (2026-07-24): a
  skip-gated (`SWEEP=1`), asserts-nothing node-side census of crossing
  quality across seeds — zero CI cost, self-labeled "not a regression
  gate." If it ever breaks against a `ParticleSystem` API change,
  delete it rather than fix it.

**CANDIDATE perf follow-up — move the sim to a Web Worker (NOT taken;
recorded 2026-07-24).** The one multi-threading win with a good
risk/reward, if mid-drag perf ever needs it (currently ~32fps mid-drag
is playable; at rest the sleep gate makes it moot). Mid-drag the main
thread runs physics (~15.8ms) THEN render (~10ms) serially → ~25ms. The
render only needs a positions snapshot, so relocating the whole
(still single-threaded) `ParticleSystem` into a dedicated worker
overlaps them → frame ≈ max(15.8, 10) ≈ 15.8ms, potentially 60fps
mid-drag, with the physics NUMERICS UNCHANGED (the sim just moves
threads; it is not re-ordered). Good fit already: `positions`/`zPos`
are `Float32Array`, so a `SharedArrayBuffer` backs them zero-copy for
the render read. Costs: (1) COOP/COEP cross-origin-isolation headers
for SAB (Vite dev config + a Cloudflare `_headers` file); (2)
marshaling grab/dragTo/release to the worker and sharing the extra
per-crossing render state (displayF, over/under, emergent crossings),
not just positions; (3) THE REAL TAX — the diagnostic harness
(`window.__knotPoint`/`__knotRenderer`, the sim/wall build-stamp
counters, the `diag_*` probes) reaches SYNCHRONOUSLY into
`ParticleSystem` from the main thread and is load-bearing per the
verification lore; it needs an async/shared-memory bridge. Architecture-
change-sized; rank it BELOW P4 unless drag perf actually bothers you on
target hardware. DO NOT instead parallelize the SOLVER: it is
Gauss-Seidel PBD (each constraint reads the prior one's writes — the
P3.26 double-sweep exists for exactly this reason); coloring it into
independent sets changes the numerics and would perturb the hard-won
equilibria, for a payoff only on the ~7ms collision slice. WebGPU
compute (particle count too small — dispatch overhead eats it) and WASM
threads (same SAB+coloring cost plus a language rewrite) are both ruled
out at this scale; single-threaded WASM for just the collision
narrow-phase is a separate non-threading raw-speed lever (2–4× on that
~7ms) if ever wanted.

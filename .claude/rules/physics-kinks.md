---
paths:
  - "src/physics/particle_system.ts"
  - "src/physics/forces.ts"
  - "test/physics/sleep.regression.test.ts"
---

# Physics lore: kink eyes

Moved verbatim from `physics.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `physics.md` lists the area's other files.

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

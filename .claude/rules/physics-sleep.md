---
paths:
  - "src/physics/sleep_gate.ts"
  - "test/physics/sleep_gate.test.ts"
  - "test/physics/sleep.regression.test.ts"
  - "test/quiescence.regression.test.ts"
---

# Physics lore: the sleep gate (K63)

Moved verbatim from `physics.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `physics.md` lists the area's other files.

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

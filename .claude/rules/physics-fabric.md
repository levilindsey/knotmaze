---
paths:
  - "src/physics/particle_system.ts"
  - "src/physics/forces.ts"
  - "test/physics/open_chain.test.ts"
  - "test/physics/junction.test.ts"
  - "test/physics/maze_fabric.test.ts"
---

# Physics lore: fabric and open chains

Moved verbatim from `physics.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `physics.md` lists the area's other files.

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

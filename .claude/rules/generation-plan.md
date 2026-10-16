---
paths:
  - "src/core/maze_plan.ts"
  - "src/core/maze_apply.ts"
  - "src/core/shapes.ts"
  - "test/core/maze_plan.test.ts"
  - "test/core/maze_plan_identity.test.ts"
  - "test/core/maze_apply.test.ts"
  - "test/core/maze_solvable.test.ts"
  - "test/core/maze_reachable.test.ts"
  - "test/core/shapes.test.ts"
  - "test/core/fixtures/maze_plan_v1.ts"
---

# Generation lore: the maze plan

Moved verbatim from `generation.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `generation.md` lists the area's other files.

- *K87 (2026-10-13), the plan identity pin:*
  `test/core/maze_plan_identity.test.ts` builds whole plans with today's
  `maze_plan.ts` and with the frozen pre-K87 copy
  (`test/core/fixtures/maze_plan_v1.ts`, never edited) and requires the
  same JSON: defaults per shape and size, random knobs, dense maps, the
  first dailies. A refactor must keep it green. A deliberate plan change
  (K86) keeps its default path equal to the pin, or re-freezes the
  fixture in a commit that says which mazes move. Plan coordinates are
  QUARTER units (crossings integer, turn nodes x.5, edge mids x.25/.75),
  so 64·d² is an exact integer: `.claude/probes/K87/margin.ts` counts
  exact ties by it. Two thirds of farthest-first picks are exact ties,
  broken by pool order; some tie between different (dx, dy) pairs at
  the same distance, where the last bit of the distance decides: V8's
  `Math.hypot` bits, through `hypot2` since K108. Since K74 the pin runs
  on PRE_K74 inputs (exitClearance 5, no dead ends, deadEndLength 0), so
  it still certifies the older path; a second test in the same file
  ("maze plan at the K74 defaults") freezes FNV-1a hashes of whole plans
  at today's defaults and requires each to reach every piece.
- *K74 (2026-10-13), long-tail dead ends:* `deadEndLength` > 0 (u, half
  lattice cells; default 20) runs `placeLongTails` before the choice
  splices: `round(deadEndDensity × distinct strands in the pool)` tails,
  each the free flank that runs farthest before its first junction
  (capped at the length), whose run is then reserved so junctions,
  4-ways, later trims and K110 joins keep off it (the header comment has
  the tie order). `deadEndLength` 0 is the older spread placement,
  byte-identical (the K87 pin). Defaults since K74: dead ends on at 0.5,
  exitClearance 12. Measured on dailies 1-80: 4.1 tails per maze, tip
  runs median 22.4 u (94% at least 20 u), the far-end greedy walk median
  3.12x the optimal with 11% of dailies within 1.5x (before: 1.96x, 25%);
  density 1.0 crowds the tails (61% at least 20 u, greedy 2.54x).
  Every design slept by 5 s sim except K136, which fails the same way
  without tails. Probes and results: `.claude/probes/K74/` (`run_scan.ps1`
  with `spec_stage1.json`; `out/analyze_stage1.txt`, `out/phys1.jsonl`,
  the before/after sheet `out/K74_stage1_before_after.png`).
- *K74 stage 2 (2026-10-14), H1 fused arm cuts:* a splice reads as an H
  (a junction on each of two host threads, a one-tap bridge between).
  `fuseHCuts` (`maze_apply.ts`; last in `applyMazeCuts`, since its guards
  read the END runs the other cuts made) removes one of B's host arms
  back to its first crossing X, fuses X into a 3-way junction (the trim
  surgery the corner and dead-end cuts use) and leaves B a turn: the
  second branch point moves to X and the bridge joins a longer run.
  `hCutShare` (`hcs`, codec v5 index 117, a maze param, not exempt;
  default 1 = every H; 0 = off: the plan carries no field and the maze is
  the older one) cuts round(share × bridges) H's at an even stride in
  strand order; each H tries the option whose kept arm runs smoothest
  through B first. NEVER: an arm that meets a junction or an end before a
  crossing; a crossing on an END's run up to its first junction (the
  entrance and exit corridors and the long tails stay junction-free; the
  set is refreshed after each cut); a self-crossing of the host; a
  same-strand splice. Every option is checked on the strands it would
  produce (a union-find over the walk vertices) and refused when it would
  split the walk. When the kept strand runs B to A, the bridge edge's
  nodes swap and its lattice points reverse. K108-exact (integer
  strides, a cosine order normalized with `hypot2`, a stable sort).
  Measured on dailies 1-80, shares 0 / .25 / .5 / .75 / 1: the far-end
  greedy walk (gF) median 3.12 / 3.07 / 2.81 / 2.57 / 2.65x the optimal,
  within 1.5x on 11 / 9 / 16 / 19 / 15% of dailies (the brief's bar was
  15%); at 1 the heading walker (gH3) median 4.55 -> 3.66x, splice
  bridges per maze 83 -> 26 (6644 attempted, 4562 cut, 2082 skipped, 1
  refused by reachability), bridge taps per solve 4.76 -> 1.31, the
  optimal route 90.4 -> 94.2 u, generation 30 -> 44 ms, no dead-end
  tail shorter. Skips, per bridge end or arm: host self-crossing 3894,
  same-strand splice 3594, protected END-run crossing 2002, arm meets a
  junction 169 (dense heart and ring maps cut none). On dailies 81-240
  the bar fails at every share (share 0: 2.30x, 23% within 1.5x; share
  1: 2.15x, 26%), so stage 1's margin was partly sample luck. K110's
  3780 designs: 0 failures. Every design slept by 5 s sim at shares 0
  and 1 except K136; the last loud move moved 0.6 -> about 1.2 s.
  The pass costs about 9 ms at gs 18 (`whole()`'s string maps and the
  host scans). Pins: the golden dailies, and "applied maze at the K74
  defaults" in `maze_plan_identity.test.ts` (39 walk graphs at share 0
  and at the default; 29 move). Probes: `.claude/probes/K74/stage2/`
  (`run_scan.ps1`, `out/analyze_stage2.txt`, `out/analyze_stage2b.txt`,
  `why_skip.ts`, `find_fused.ts`, the sheet
  `out/K74_stage2_before_after.png` and `out/closeups/`).

- *K109 (2026-10-13), a route from start to exit:* spanning joins whole
  STRANDS, but the exit's nearest-edge search can cut the entrance's
  strand too: a loop cut twice falls into two arcs, and when both cuts
  are trimmed on the same side each arc fuses into itself (a lasso) or
  into a strand nothing else reaches, so the walk graph had no route
  (optimal Infinity; small shaped designs, never a rect design or a
  daily). The PIECE model (`buildPieces`, `planTailsJoined`) predicts the
  walk graph's verdict before surgery: a union-find over node
  occurrences, joined along surviving edges (cut edges and trim stubs
  removed), across each merged node's occurrences and across splice
  bridges; trimming side "a" leaves the tail at the cut edge's nodeB
  end, "b" at its nodeA end, no trim both.
  `buildMazePlan` builds the plan as before and keeps it when its tails
  meet (every solvable plan stays byte-identical); otherwise it rebuilds
  with `repairTailRoute` right after spanning (fewest junctions by BFS
  hops from the exit's pieces; splices before merges, corner-clear sites,
  most room from `placed`, then pool order; same-strand splices and
  self-crossings allowed), so choices and dead ends space around the
  repair. Measured over 1110 designs: model and walk graph agree on
  every plan, 0 solvable plans moved, 20/20 unsolvable ones repaired
  with one splice; K108's snapshot moved only its 29 Infinity entries.
  The identity pin names its one repaired case. Probes:
  `.claude/probes/K109/` (`verify.ts`, `diag.ts`, `links.ts`,
  `orphans.ts`); test: `test/core/maze_solvable.test.ts`. Resolved by
  K110 (below).
- *K110 (2026-10-13), every piece reachable from the start:*
  `planReachesAll` runs K109's piece model over the finished plan (tail
  anchors included) and predicts unreachable pieces before surgery. A
  plan without them is kept as built. Otherwise `buildMazePlan` appends
  one join per piece to the spanning lists, after everything else:
  Prim-style from the start's region, splices before merges,
  corner-clear sites, most room, then pool order; a splice whose bridge
  would cross a placed bridge is skipped. The old plan stays a prefix and
  the fabric route is unchanged. When no join can make the plan whole,
  the exit moves to the next-nearest edge (up to 16 tries). The walk
  optimal can still move: a different start/exit pair, or a rerouted
  escape tail. Measured over 3780 designs: 331 had unreachable pieces,
  0 after; every plan that was already whole is byte-identical. Older
  plans can hold crossed join bridges (K133). Test:
  `test/core/maze_reachable.test.ts`; probes: `.claude/probes/K110/`.

- *K74 stage 3 (2026-10-16), the trap-zone finish and H1's exit guard:*
  `exitCorridor` (`xcr`, codec 152, [0,32], default 24), `exitFlank`
  (`xfl`, 153: stub | away | near, default away), `exitTaperRadius`
  (`xtr`, 154, [0,32], default 0) and `exitTaperStrength` (`xtk`, 155,
  [0,2], default 0) - all maze params, never daily-exempt. The corridor is
  the exit's kept flank (both flanks untrimmed) to arc L, collected before
  spanning, ranked LAST by spanning, K109's repair and K110's joins
  (never skipped), claimed after the repair so choices, 4-ways and dead
  ends keep off it. The flank score is the farthest squared node distance
  from the exit point within L (24 without a corridor); the taper grades
  the choice/4-way spacing floor by least hypot2 distance to the exit.
  `edgeLen`/`walkFlank` are module-level (`makeEdgeLen`/`walkFlankImpl`),
  shared with `placeLongTails`. The plan carries `exitGuardPoint` /
  `exitGuardClearance` (only when H1 runs and clearance > 0) and
  `exitGuardCrossings` (only when H1 runs and corridor > 0); `fuseHCuts`
  refuses those crossings - on dailies 1-80 H1 now adds 0 junctions inside
  the exit clearance (stage 2: 36 fused; totals 134 at share 1 vs 138 at
  share 0, `stage2/clearance.ts`). Golden dailies re-frozen: optimal
  122.610/189/283, 66.483/185/273, 122.679/183/273. K87 pin and the knot
  golden hold; K74_PLANS, K74_WALKS_H0 and K74_WALKS_DEFAULT re-frozen
  (H0 moves because the plan itself changed). Sources (K284): Pullen's
  near misses at the goal (corridor) and Pullen plus Zhao and Marquez
  2013 (long blind alleys, at `placeLongTails`); RESEARCH entries in
  `notices/credits.ts`. Tests: `test/core/maze_trapzone.test.ts`.

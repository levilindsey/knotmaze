---
paths:
  - "src/core/**"
  - "src/geometry/**"
  - "test/core/**"
  - "test/geometry/**"
---

# Maze generation lore

Lore for the lattice, the maze plan and its graph surgery, moved
verbatim from CLAUDE.md by K45 (2026-10-12). The core insight stays in
CLAUDE.md: the threads ARE the maze paths.

- Generation changes move every daily and every link:
  `test/ui/daily_link.test.ts` pins dailies #1-#3, and a saved daily
  attempt refuses to replay on a moved walk graph. The daily rules are
  in `gameplay.md`.
- The plan's design history (splices, merges, corner cuts, long dead
  ends, shaped lattices) is in `docs/history.md`: Stages 5a–5d, 9 and
  11, SHAPED LATTICES and SHAPED START/EXIT CLEARANCE.
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
- *K108 (2026-10-13), engine-exact generation:* everything that decides
  the maze (`src/core/`, `src/util/`) uses only operations the spec makes
  exact (+ - * /, `Math.sqrt`, abs/floor/min/max and the like) plus
  `src/util/det_math.ts`. `Math.hypot`, trig, exp/log and `**` are
  "implementation-approximated": Firefox's hypot (fdlibm) differs from
  V8's in the last bit on 7074 of 20301 quarter-grid pairs, and that
  built a different plan for 31 of the first 60 dailies (real Chrome 155
  vs Firefox 153: 34 of 144 designs). Safari's JSC calls the platform's
  `std::hypot`, a third rounding. `hypot2` is V8's algorithm from exact
  ops, so Chrome-built mazes did not move (snapshot of 3355 plans, walks
  and optimal lengths: 0 differ) and Firefox now matches Chrome (0 of
  144). V8's bits are an ulp off the correctly rounded ones on those 7074
  pairs; they stay because the shipped mazes use them. The star mask
  folds by reflections with sqrt-only constants instead of
  atan2/sin/cos (same cells at every size 2..400). Guards:
  `test/core/deterministic_math.test.ts` (a comment-stripped source scan
  for `Math.<approximated>` and `**`, plus whole builds with those
  functions and `Math.random` rigged to throw) and
  `test/util/det_math.test.ts` (hypot2's bits frozen on the quarter grid
  and on random doubles). Probes in `.claude/probes/K108/`: `engines.mjs`
  (real Chrome vs Firefox, esbuild bundle), `snapshot.ts`,
  `star_margin.mjs`, `pin.ts`, `fdlibm_hypot.mjs`, `unsolvable.ts`.
  Not held to the rule: Layer 2 and physics (they never change which
  maze is built) and the codec's integer `2 **` powers.
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

## Shapes, anchors and escape tails

- *From SHAPED LATTICES, rect identity and the start/exit anchors:* rect = null mask, BYTE-IDENTICAL path (unit-tested + the
  physics golden). Maze entrance/exit generalize to ANCHORS (sa=/xa=,
  compass points): maskExtremePoint -> thick-material nudge (cuts at
  silhouette slivers parked tails beside boundary-hairpin kink eyes
  that tore and stood - shapes were FATTENED instead of touching
  physics, per the convexify rule) -> nearest maze-strand edge.

- *From SHAPED START/EXIT CLEARANCE (late 2026-10-10), escape tails:* PLANARITY is the root:
  a cut on an interior edge can never hand its tail to open space without
  crossing threads. Shaped plans (plan.escapeTails) therefore cut only
  OUTER-FACE edges (maze_plan outerFaceEdges: rasterize every edge, flood
  the exterior from the raster border), and the tail follows a
  shortest path through a clearance field (maze_apply escapePath:
  chamfer distance transform + Dijkstra biased toward the compass
  direction; tiers [pass, clear] = [0.45, 3] -> [0.45, 2.2] -> [0.3, 3]
  -> [0.3, 2.2], else the historic fixed tail) with the path written in
  as real lattice points. Rect keeps the exact historic search and tails
  (the default-plan JSON identity test holds). checkAlternation now reads
  each pass's diagonal from its own edge's FIRST segment, as physics
  does (an escaped END sits far down a bent path).

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
  `Math.hypot` bits, through `hypot2` since K108.
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

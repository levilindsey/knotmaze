---
paths:
  - "src/core/shapes.ts"
  - "src/core/lattice_grower.ts"
  - "src/core/maze_plan.ts"
  - "src/core/maze_apply.ts"
  - "test/core/shapes.test.ts"
  - "test/core/lattice_grower.test.ts"
---

# Generation lore: shapes, anchors and escape tails

Moved verbatim from `generation.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `generation.md` lists the area's other files.

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

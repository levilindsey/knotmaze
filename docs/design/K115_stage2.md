# K115 Stage 2 brief: the standalone word is walkable

Stage 1b (cb7d006..bc357c4) renders a pinned cursive word as a knot-mode
scene (`?txt=Welcome`, panel Text row, codec v8 `text`). It cannot be
played: scene.ts gates the walk graph and fabric controller off for text
scenes. This stage makes the standalone scene playable as designed
(design section 5, progress mode P2: each tap writes the next letter).

Levi's calls still bind: pinned; spurs travelable dead ends; capitals
via connectors; one-token links.

## Builder (`src/core/text_graph.ts`)

- Mark letter-boundary nodes on the main path with a new optional
  `Node.waypoint?: boolean` (types.ts; lattice never sets it). The
  boundary is the node where each glyph's lead-in begins (the join
  point), plus `mexit_a`. One waypoint per glyph, in reading order.

## Walk graph (`src/core/walk_graph.ts`)

- A node with `waypoint` set is a walk vertex stop (a run boundary)
  even at degree 2. It is never a branch: choices at it are exactly
  its two path neighbours (plus any spur junction arms if it coincides
  with one — it should not by construction; assert in tests).
- Lattice graphs never set it: walk output for mazes must be identical
  (existing walk tests + maze pins green, no re-freeze).

## Scene (`src/app/scene.ts`, `src/core/scene_graph.ts`)

- Text scenes now build the walk graph + fabric controller like fabric
  scenes, but keep: no maze plan, no hueGroup surgery. Markers: the
  start marker sits at `mentr_a`, finish at `mexit_a` (existing marker
  machinery keyed on walk start/exit — verify, adapt minimally).
- Section colors / reveal / fog run their normal fabric paths over the
  text walk graph. If a fabric subsystem hard-assumes maze-only data
  (e.g. hue groups), take the knot-mode fallback it already has; do
  not invent new paint.
- Win = reaching `mexit_a`: the normal finish banner + confetti path.

## Out of scope

Per-letter draw reveal, RUN_FLAG.TEXT color, title thread (E3),
cartouche (E2), P3 drag-scrub. Waypoints only.

## Verification

Unit: walk graph over `buildTextGraph("Welcome")` — vertices include
one waypoint per letter, a scripted tap sequence walks W→e→l→c→o→m→e
in order (fabric_controller test style), spur junctions offer their
dead end and back. Full `npm test` green (byte_identity and the maze
pins untouched). Real screenshot pair via diag_screenshot: `?txt=Solved`
at load and after a scripted first tap, panel closed if the harness
allows; report what the head/markers show.

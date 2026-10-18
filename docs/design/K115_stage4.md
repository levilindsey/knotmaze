# K115 Stage 4 brief: text inside the maze (E2, the cartouche)

Design `docs/design/K115_cursive_text.md` sections 4.1 (E2/E2'), 4.2
(in-hole attach), 4.3 (lent segments), 4.4 (solvable), 4.5 (color) and
4.6 (walkability). Stages 1b-3a are in: `buildTextGraph` emits a pinned
word with waypoints (`src/core/text_graph.ts:588`), `attachTitle` hangs
it on a maze's entrance tail after the start/exit selection
(`src/core/scene_graph.ts:134-152`, `src/core/text_graph.ts:1033`), the
forced walk excludes the title's arc from every meter
(`src/core/walk_graph.ts:259-279`, `src/game/fabric_controller.ts:231-242`),
and hue comes from one `hueGroup` slot per word
(`src/core/scene_graph.ts:140-144`). This stage puts the same pinned
word inside the maze: a masked-out hole whose border threads form the
frame by themselves (design 1.1: the ring mask already proves a hole),
with the word as a bridge between two frame junctions. Levi's calls
still bind: pinned; spurs travelable; capitals via connectors; one-token
links. Decisions this brief makes where the design left the mechanism
open are marked (picked); the genuinely open ones are Calls for Levi at
the end, each with a recommendation - build the recommendation unless
Levi says otherwise before the stage starts.

## Scope pick: E2, not E2' (picked)

4a ships design 4.1's E2: an interior hole, the frame a closed loop
around it, the word a second route across. E2' (a full-width band, the
word the only link between two maze halves) is deferred, for three
reasons grounded in the code:

- E2 needs no multi-component mask. `buildCellMask` keeps only the
  largest component (`src/core/shapes.ts:163-178`), and the grower's
  tree spans whatever single component the mask leaves
  (`src/core/lattice_grower.ts:92-126`). An interior hole leaves one
  component (the ring precedent), so the grower, the plan and the
  anchors are untouched in shape. E2' makes the mask two components:
  the grower would need a forest, `planAnchors` a per-half story, and
  the maze plan's strand cull a new meaning.
- E2's solvability is free. The hole is stamped before the plan, so
  K109/K110 run on the frame alone and `planReachesAll`
  (`src/core/maze_plan.ts:1022-1034`) already guarantees the frame
  connects start to exit. The word, attached after surgery like the
  title, only adds a route between two vertices of that one piece. E2'
  would make the pinned word load-bearing: K109's piece model
  (`src/core/maze_plan.ts:906-960`) would have to count a strand that
  does not exist at plan time, and `repairTailRoute`
  (`src/core/maze_plan.ts:1067`) would have to be forbidden from
  cutting it - new plan machinery for a variant.
- Stage 3a already guarantees every daily solve writes a word (the
  title). The cartouche's distinct value is a word found inside the
  maze, not a second compulsory writing. Forcing it is E2-prime's job if
  Levi wants it (Call C2).

## The hole: a cartouche rect stamped into the mask (picked)

Not multi-component masks: a rectangular hole stamped into the one
kept component, exactly the ring's topology at cell resolution.

- `src/core/types.ts`: `GenerationParams` gains
  `hole?: { cx: number; cy: number; w: number; h: number }` (integer
  cell coordinates of the hole's top-left cell; absent = today).
  `src/core/scene_graph.ts:73-80` passes `params`' hole through; the
  lattice grower stays otherwise untouched.
- `src/core/shapes.ts`: `buildCellMask(shape, size, hole?)`. Without
  `hole`, byte-identical to today (rect returns null at `:167`). With
  `hole`: for `rect`, materialize the full mask instead of returning
  null; for shaped masks stamp after `keepLargestComponent`
  (`:183-223`) so the silhouette rule is unchanged. Stamp = set the
  hole's cells false. Then verify with the same orthogonal flood:
  the remaining cells are still ONE component of at least 2 cells;
  if not, return the unstamped mask (the planner below never passes
  such a hole; the fallback keeps a bad caller from silently
  splitting a maze - a test asserts the two agree).
- Why the grower needs no change: masked-out cells keep every border
  midpoint walled and consume no RNG on those guards
  (`src/core/lattice_grower.ts:140-160`), so hole-border threads TURN
  along the frame by the existing wall rule. The frame is not built;
  it falls out, as design 4.2 promises.
- Placement lives with the word, not the mask: a new pure export in
  `src/core/text_graph.ts`,
  `planCartoucheHole(text, gridSize, shape): { hole, xHeight } | null`,
  called from `buildSceneGraph` before `generateLatticeKnotwork`.
  It builds the word once at x-height 3 to measure it (Word sizing),
  takes the kept mask from `buildCellMask(shape, size)`, and scans
  candidate top-left cells in a deterministic order (below). Null =
  no cartouche; the caller generates exactly today's maze.

Constants (picked; all in cell/LU integer arithmetic, K108-exact):
`PAD_LU = 2` of clearance between the word's bounds and the hole's
walls on every side (one cell: the lead-in swashes and the pinned
word's casing live in it, and the frame's settled drift has somewhere
to go that is not the word); `FRAME_MIN = 2` cells of kept mask
between the hole and the mask's bounding box on every side (a 1-cell
frame is a hairpin tube - the star lesson, `src/core/shapes.ts:85-88`).

Placement algorithm (deterministic, no RNG):

1. Measure the fitted word (next section): LU width `w`, height `h`.
   Hole cells: `W = ceil((w + 2*PAD_LU) / 2)`,
   `H = ceil((h + 2*PAD_LU) / 2)` (a cell is 2 LU).
2. Candidates: every `(cx, cy)` whose hole, expanded by 1 cell, lies
   entirely in kept cells (a real frame ring exists - the hole never
   merges with the silhouette's exterior or the grid edge) and whose
   rect, expanded by `FRAME_MIN`, lies inside the kept mask's
   bounding box.
3. Order: squared distance from the hole's center to the kept mask's
   cell centroid, on doubled integer coordinates; ties by `cy`, then
   `cx` (row-major, the `keepLargestComponent` convention). Centered
   wins: the landmark sits where routes pass, and the scan is the
   fallback for shapes whose centroid is unusable (heart notch, tree
   trunk), not a search for a clever spot.
4. First candidate whose stamping keeps the mask one component wins
   (trial-stamp a copy, flood-count). None: return null.

## Word sizing inside the hole

Mirror the title's fit rule (`src/core/text_graph.ts:1077-1096`: build
at 3, shrink-only rebuild), with the maze, not the word, as the cap:

1. Build at x-height 3 and measure the LU bounds, as `attachTitle`
   does. The budget is the kept mask's bounding box minus the frame:
   `maxW = (bboxWcells - 2*FRAME_MIN) * 2 - 2*PAD_LU` LU, and `maxH`
   likewise. (Rect at the default gs 18: a 28 LU-wide budget - a
   4-5 letter word at x-height 3, per design 3.8; longer words
   shrink or refuse, see the floor.)
2. If the word exceeds either budget, rebuild once at
   `3 * min(maxW/w, maxH/h)` (shrink only, never grow). If the result
   is below `MIN_XHEIGHT = 2.0` LU, return null: below the design's
   3 LU legibility floor by a third, a squeezed word in a hole is
   worse than no word (kill criterion; Call C4 may set the floor).
3. `planCartoucheHole` returns that fitted `xHeight`;
   `attachCartouche` rebuilds at exactly it, so the word measured is
   the word placed. Two builds of the same `(text, gridSize, shape)`
   are bit-identical (test).

## Attach: two frame junctions (design 4.2)

New export in `src/core/text_graph.ts`, the `attachTitle` pattern
(same `t` namespace, `hermitePts` `:558-582`, `MAX_EDGE_LU` `:25`):
`attachCartouche(graph, text, hole, xHeight): [string, string] | null`
returning the two junction ids. It runs in `buildSceneGraph` AFTER
`applyMazePlan`/`applyMazeCuts` (`src/core/scene_graph.ts:129-130`),
so no splice, cut, trim or H1 arm can land inside the hole (there is
no material there) and the plan never sees the word (piece model,
above). Steps:

1. Rebuild the word at the fitted `xHeight`; translate it (no
   rotation) so its bounds center in the hole's LU rect
   `[2cx, 2cy]` to `[2(cx+W), 2(cy+H)]`. Word strands keep
   `pinned: true` (`src/core/types.ts:45-49`).
2. Entry/exit targets: the word's placed start and end points,
   projected to the hole's west and east walls at the word's own
   height - `entryPt = (2cx, startY)`, `exitPt = (2(cx+W), endY)`
   (left-to-right text; right-to-left scripts are a later stage's
   mirror, design 5).
3. Frame edges: every maze edge with a lattice point on the hole
   rect's perimeter or a midpoint within 1.0 LU of it, ranked by
   midpoint distance to `entryPt` (west half) / `exitPt` (east
   half). Take the first whose midpoint is at least
   `max(2, junctionSpacing)` LU (Euclidean) from every existing
   JUNCTION and from the other pick - design 4.2's junction-spacing
   sentence, with the maze's own knob passed in from `SceneParams`.
   No qualifying edge on either side: return null.
4. Split each chosen edge at its midpoint, the splice mechanism
   (`splitEdge`, `src/core/maze_apply.ts:74-96`) re-implemented in `text_graph`
   as title attach re-implements its pieces - `maze_apply` stays
   untouched, so plan splices keep their `mnode_` sequence. New
   JUNCTION nodes `cj_a` (entry) and `cj_b` (exit) join the host
   strand's traversal; the frame strand passes through, the word
   branches off: degree 3 each.
5. Connectors: rename the word's `mentr_a`/`mexit_a` to
   `cstart`/`cend` (the maze's own ends keep those ids;
   `ENTRANCE_END_IDS`/`EXIT_END_IDS`, `src/core/maze_apply.ts:325-326`,
   are untouched). `cstart` is retyped TURN without a waypoint - the
   junction is the stop before the word; `cend` is retyped TURN and
   keeps its exit waypoint (`src/core/text_graph.ts:826-828`), the
   title's `texit` pattern (`:1109-1112`). A Hermite lead-in
   (junction tangent = the direction into the hole, word tangent =
   its first segment) resampled to `MAX_EDGE_LU` TURN edges runs
   `cj_a` to `cstart`, prepended to the main strand; a lead-out runs
   `cend` to `cj_b`, appended. The junctions are thus occurrences on
   the pinned main strand: the physics anchors them through it
   (`src/physics/particle_system.ts:718-724`), and the frame is held
   at exactly those two points and free everywhere else (design 4.2).
6. Crossings: both connectors are tested pre-mutation against every
   maze and word segment (the `properIntersect` sweep,
   `src/core/text_graph.ts:1128-1162`); either crossing anything
   returns null with the graph untouched. The connectors run in the
   pad ring, which holds only the word, so this is an assertion, not
   an expectation - the sweep in Tests makes it a kill criterion if
   it ever fires on a shippable design.

Scene order (`src/core/scene_graph.ts`, maze branch only): when
`params.cartouche === ""`, nothing below runs and every pin in
Determinism stays byte-identical. Otherwise: `planCartoucheHole`
runs before generation and its hole goes into `GenerationParams`;
plan, apply and cuts run as today; the existing title block runs
exactly as today (its `walk0` selection therefore never sees the
word - the cartouche cannot move a daily's start or exit, design
4.4's attach-order rule, learned again from stage 3); then
`attachCartouche`; then, if it attached, `hueGroup` gains one entry
per appended strand, all the first cartouche strand's index (the
title's rule, `:140-144`; a scene with both words gets two slots,
title first); finally `buildSceneGraph` returns a walk built after
the attach - the forced walk with the same `{start, exit, mazeStart}`
when titled, a plain `buildWalkGraph(graph)` otherwise - in
`SceneGraph.walk`, which the caller already prefers
(`src/app/scene.ts:256`). Returning it matters: the caller's rebuild
would produce the same graph, but the returned one is the tested
artifact, as stage 3a found.

## Walk and stats: a landmark, counted (picked)

Placement on the route: **landmark** (Call C2). The word is a route
the player may take across the hole, not a gate. Three arguments:
the frame always offers the around-route, so making the word
compulsory means either E2' or deleting a frame arc - both change
the maze to serve the word; the optimal path depends on the hole
while the hole would have to depend on the optimal path, an
iterative rebuild search at generation time; and the centered hole
already puts the word where traffic passes - if the through-word
route happens to be shortest for a given seed, the recomputed
`optimalLength` simply is that route. Nothing is forced, nothing is
excluded.

Because the word is ordinary maze ground, it is **counted**, the
opposite of the title's exclusion, and design 4.6 says so outright
("the title thread's arc is excluded"; taps, length and the optimal
count include an in-maze word's run). The exclusion was right for a
preamble outside the maze whose writing is untimed (stage 3a); the
cartouche is walked instead of maze, under the same clock, fire and
minotaur as any run. Concretely, 4a needs no stats code at all:

- No new `WalkGraph` field, no `buildWalkGraph` change: `cj_a`/`cj_b`
  are JUNCTION vertices, the word's letter waypoints are degree-2
  stops (`src/core/walk_graph.ts:119-125`), one tap per letter as in
  the standalone scene, spurs travelable dead ends (Levi's D2, as
  shipped since stage 1b - design 4.6's decorative-flag paragraph is
  superseded by that call), dot loops vertex-free and skipped
  (`:182`). `distToExit` covers the word, so `g`/`d` move
  classification, hints and the fire read it as maze.
- `FabricMazeController` untouched: the word populates none of
  `titleVertices`/`titleEdges`, so `walkedDist`/`pathLength` count
  its runs (`src/game/fabric_controller.ts:321-333`), `arrive`
  counts `cj_a`/`cj_b` as visited junctions and word spur tips as
  dead ends (`:378-388`, title vertices alone are exempted), and the
  solve clock, star rating (`walked/optimal`) and share grid need
  no prefix rules. If the word is a seed's shortest route, the
  optimal includes it - that is the counted rule working.
- Markers, reveal and fog need no change: the word is inside the
  maze's bounds (the camera fit does not grow, unlike the title),
  trace/bloom reach it when the player does, and fog reveals it as
  walked (design 4.6).

## Color: one hue slot now (picked), `RUN_FLAG.TEXT` later

4a uses the title's mechanism: the appended strands share one
`hueGroup` slot (`src/core/section_colors.ts:258-261`), so under the
`strands` scheme the word wears one hue family end to end and its
junction blends walk to the frame's hues (`:337-361`). Under the
default `segments` scheme (`src/ui/url_state.ts:767`) the word's
runs take per-run colors like every maze run - the word reads by its
hole, frame and cursive shape, not by a paint override. That is
coherent with the counted-stats pick: in 4a the word is maze
material that happens to spell.

`RUN_FLAG.TEXT` (design 4.5's recommendation: one text color, a
reading-order gradient) is deferred, not rejected. It is a paint
stage of its own - a new bit in `RUN_FLAG`
(`src/render/paint_const.ts:132-138`), a `section_colors` override
that must find the word's runs across three scheme builders, a
gradient coordinate for runs split by junctions, and the GLSL/CPU
mirror parity tests (G2) - and stage 3a's shots already showed a
hue-slotted word reading clearly without it. Lent segments (4b)
need a paint override by definition (design 4.5's third bullet), so
the two land together if Levi's look call on 4a asks for them
(Call C3). Until then, word membership is recoverable from the
appended strand range (`Strand.pinned` plus scene order), so no
walk field is added now to serve a deferred scheme.

## Which designs get text (picked)

- A new link param `cartouche: string` (default `""`) for ordinary
  designs, end to end like `text`: `UrlParams.cartouche`
  (`src/ui/url_state.ts:276` beside `text`), a panel row under the
  Text row in the Design folder
  (`src/ui/tweakpane_panel.ts:922`, the same `row` pattern), and
  `SceneParams.cartouche: string` in `src/core/scene_graph.ts:20-54`.
  It flows through `src/app/scene.ts:235`'s spread with no new dep
  (unlike the title, it is a design param, not a derivation).
  `SCENE_FIELDS` in `src/physics/physics_worker_core.ts:205-238`
  gains `cartouche: "string"` - that `Record<keyof SceneParams, ...>`
  compile error is the checklist, as in stage 3a, and
  `test/physics/host_seam.test.ts` keeps the hosts in lockstep.
- Codec: `str("cartouche")` appended LAST in `CODEC_PARAMS`, after
  `text` (`src/ui/param_codec.ts:309`). Append-only per the codec
  header (`:37-39`): no `CODEC_VERSION` bump (stays 8), old links
  lack the entry and read `""`. Only the literal table pin in
  `test/ui/param_codec.test.ts` moves, deliberately - the same pin
  stage 1b's `text` append moved.
- Daily treatment: none in 4a. A daily's design is today's defaults
  (`src/ui/daily_link.ts:69-71`), whose `cartouche` is `""`, so
  dailies are untouched mazes with their stage-3 titles. The
  param is design-defining, so it joins `MAZE_PARAM_KEYS`
  (`:78-109` - a cartouche changes the walked maze, and `mazeKey`
  must say so) and never `DAILY_EXEMPT_KEYS` (`:135-196`); editing
  it on a daily therefore leaves the daily by the ordinary
  non-exempt rule, no special routing. A daily cartouche word -
  derived like `dailyTitle(n)` (`:65-67`), e.g. a word of the day -
  is a small follow-on once 4a's look is proven, not part of this
  stage (Call C1).
- Precedence: `params.text !== ""` keeps winning - the standalone
  scene early return (`src/core/scene_graph.ts:66-72`) stays first
  and a link naming both shows the standalone word. Knot mode
  (`mazeFabric` off) has no frame and ignores `cartouche`. Shaped
  designs are in scope: the placement scan is mask-generic, and the
  shaped-anchor nudge reads kept cells, so a stamped hole only
  lowers a cell's thickness count on the walk to the centroid
  (`src/core/shapes.ts:346-387`) - the sweep in Tests covers every
  shape rather than exempting them.

## Determinism and pins

- `cartouche === ""` (every default, every daily, knot mode): the
  hole is absent, `buildCellMask` and the grower take today's paths,
  and the plan, apply, walk and physics are untouched. K87's plan
  pin (`test/core/maze_plan_identity.test.ts`), the golden dailies
  (`test/ui/daily_link.test.ts:102-119`), the K74 walk pins and the
  physics golden (`test/physics/byte_identity.test.ts`) all stay
  green UNREFROZEN. The only deliberate pin movement is the codec
  table pin above (an appended entry, not a moved value).
- With a cartouche, the new design family gets its own pins: a
  frozen scene pin (node/edge/strand counts plus a rounded-position
  hash, the `test/core/text_graph.test.ts` "Welcome" pattern) for a
  rect gs 18 seed with word "knot", and a mask pin for the stamped
  hole. Building the same scene twice is bit-identical (test).
- K108: cell placement is integer arithmetic; sizing, fitting and
  connectors reuse `buildTextGraph`/`hermitePts` arithmetic (`+ - * /`,
  `Math.sqrt` via `hypot2` only). The K108 scan covers the new code
  in `src/core` automatically.
- Records: cartouche designs are ordinary designs, so no daily
  store change. (The deferred daily variant would change titled
  dailies' played walks a second time; stage 3a's answer applies -
  `walkFingerprint` refuses the old attempt, results keep counted
  numbers, `DAILY_DEF` stays 2 pre-launch.)

## Stages within the stage

- 4a (this brief, one code stage): `GenerationParams.hole` +
  `buildCellMask` stamping, `planCartoucheHole` (sizing, placement),
  `attachCartouche` (frame junctions, connectors), the `cartouche`
  param end to end (codec append, panel row, worker field,
  `MAZE_PARAM_KEYS`), hue slot, returned walk, tests, screenshots.
- 4b (only if needed): lent bar segments (design 4.3). Not needed by
  the letters the builder already ships: a t's bar is already a
  pinned bar strand crossing its stem (stage 1b, design 3.3's third
  option), and join-bars cover the handwritten case. 4b runs only if
  a word Levi wants has a bar no builder strand gives, or he asks
  for a living (unpinned) bar: then the nearest frame turn on the
  stem's line is rerouted through the hole as the bar (two border
  junctions, its frame half-ends rejoined by a border splice or left
  as stubs), painted by the `RUN_FLAG.TEXT`/KPAINT override deferred
  above - the two land together or not at all. Until then, no
  foreign thread crosses a letter (design 4.3's rule, Decision 6).

## Out of scope

E2' forced bridge and its piece-model counting (Call C2), daily
cartouche words (Call C1), `RUN_FLAG.TEXT` and lent segments (4b),
shapes as inner line art (design 6: star, trefoil, wreath - the next
stage's reuse of this hole), right-to-left entry/exit mirroring,
live (unpinned) cartouche text, per-letter draw reveal inside the
maze.

## Tests

- `test/core/shapes.test.ts`: `buildCellMask` with a hole - rect
  materializes and stamps; a shaped mask stamps after the largest
  component; a disconnecting hole returns the unstamped mask; no
  hole reproduces today's masks cell for cell (rect still null).
- `test/core/text_graph.test.ts`: `planCartoucheHole` - fits, shrink
  and refusal cases (long word at gs 6 returns null); placement is
  centered on rect gs 18 and deterministic across calls; the hole
  rect, expanded one cell, sits in kept cells for every shape.
  `attachCartouche` on an applied maze - `checkStructure`,
  `checkAlternation` and `checkStrandPartition` pass (allowing the
  stage-3a parity conflicts a standalone word already logs; the
  "Daily #6" caveat in `docs/design/K115_stage3.md` is inherited, not
  introduced); `cj_a`/`cj_b` degree-3 JUNCTIONs; word strands pinned;
  word bounds inside the hole rect inset by 0.5 LU; connectors
  proper-intersect no maze or word segment; maze `mentr_*`/`mexit_*`
  ids and anchors untouched; a null attach leaves the graph as built.
- `test/core/scene_graph.test.ts` - the solvability sweep: words
  "knot" and "maze" x seeds {11, 23} x shapes {rect, heart, ring,
  circle} at gs {12, 18}, plus all 7 shapes at gs 18: a built walk
  exists, start->exit distance is finite, start/exit equal the
  un-cartouched scene's, and - the guarantee E2 buys - with every
  word walk edge removed (`walkDistances` over the filtered graph,
  `src/core/walk_graph.ts:73-102`) start still reaches exit through
  the frame alone. The word never disconnects the maze, by test and
  by construction. A cartouche scene built twice is bit-identical;
  gs 6 with a long word ships an ordinary maze (null hole).
- `test/game/fabric_controller.test.ts` style: scripted walk - at
  `cj_a` the choices are the two frame runs and the word; one tap
  per letter across, backtrack over the seam junctions, exit at
  `cj_b`; `pathLength`/`walkedDist` include the word's arc,
  `visitedJunctions` holds `cj_a`, a word spur tip is a dead end,
  and `replay(taps)` arrives at the same state.
- `test/ui/param_codec.test.ts`: `cartouche` round-trips (including
  a word with a space and a capital), the table pin gains exactly
  its appended entry, `CODEC_VERSION` still 8.
  `test/ui/daily_link.test.ts`: `dailyParams` unchanged (`cartouche`
  still `""`), `cartouche` in `MAZE_PARAM_KEYS`, absent from
  `DAILY_EXEMPT_KEYS`; golden dailies green unmodified.
- Sleep and identity: a cartouche rect design joins the sleep
  battery (the two pinned frame junctions must not pump the frame
  awake - the stage-3 titled-daily regression's sibling); full
  `npm test` and `npm run build`. Real screenshots via
  `scripts/diag_screenshot.mjs` (never virtual time): a cartouche
  design (`?` link with word "knot") at load and after writing two
  letters, worker and `phw=0`, panel closed, plus a 411 px fit shot.
  In-page probe: settled distance from the nearest frame particle
  to the word's bounds (the pad must survive relaxation).

## Kill criteria

- The attach sweep ships an empty hole (plan found a hole,
  `attachCartouche` returned null) on any swept word/shape/gs, or a
  connector crosses material there: the pad or frame-edge rule is
  wrong; do not ship around it by loosening the crossing assertion.
- A cartouche maze never sleeps, or either pinned junction holds its
  frame loop in a standing fight (sleep battery + probe): the two
  held points are the design's physics bet (design 7.3); if it
  fails, the fallback is a word pinned to nothing - a decorative
  island in the hole with its junctions on the word's own strands,
  walked as a spur off one frame junction - not softer pinning.
- Settled frame material intrudes into the word's bounds (probe
  above) on any swept design: raise `PAD_LU` one cell and re-sweep;
  if gs 18 then refuses ordinary words, the hole form is desktop-
  only and 4a stops at the brief.
- The word is illegible at 411 px in the real renderer (junction
  fans at `cj_a`/`cj_b` blot the lead-ins, or the squeeze floor
  triggers on a 5-letter word at gs 18): in-maze text falls back to
  the title + standalone scenes, per design 7.3.
- Any no-cartouche pin moves (K87, golden dailies, byte identity):
  the stamp or attach leaked into the default path; fix the leak,
  never re-freeze over it.

## Calls for Levi

- C1. Scope: ordinary designs via the `cartouche` param only, no
  dailies in 4a (rec. - dailies keep their proven titles; a derived
  daily word follows once the look is proven), or a daily-derived
  cartouche word from the start, which needs its word rule (of the
  day? always the same word?) and moves every daily's maze at once?
- C2. Route: landmark (rec. - the word is a findable route across a
  centered hole; stats count it; nothing is forced) or the forced
  bridge E2' (every solve writes the word, at the price of
  multi-component masks, a piece model that counts the word, and no
  around-route)? This brief builds the landmark; E2' is a different
  hole, not a knob on this one.
- C3. Color: one hue slot now (rec.; the word reads by hole and
  shape; default `segments` colors stay per-run), or `RUN_FLAG.TEXT`
  with a reading-order gradient in 4a, accepting the paint-mirror
  work and splitting the stage?
- C4. Words: free text in the param, refused under x-height 2.0
  (rec.), or a curated word list / tighter floor at 2.5? The floor
  is the legibility call the shots will test; the panel row can
  hint "4-5 letters at gs 18" either way.
- C5. Stats: counted like any maze run (rec., design 4.6), or
  excluded like the title's arc (the word becomes a free detour the
  meters ignore, and a through-word shortest route would then
  understate the optimal the stars compare against)?

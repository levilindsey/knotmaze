# K115 Stage 5 brief: predefined shapes via the stroke builder

Design `docs/design/K115_cursive_text.md` section 6 (shapes: the
{5/2} star / cinquefoil, trefoil / triquetra, Solomon's knot, wreath;
closed knots may stay LIVE; embed as hole-bridge or decorative
island), with sections 3.5-3.7, 4.2 and 4.6 where they carry over.
Stages 1b-4a are in: `buildTextGraph` emits a pinned word
(`src/core/text_graph.ts:590`), `attachTitle` hangs it on an entrance
tail (`:1035`), `attachCartouche` hangs it across a stamped hole on
two frame junctions (`:1462`, hole planned by `planCartoucheHole`
`:1279`), one `hueGroup` slot per appended word
(`src/core/scene_graph.ts:182-186`), and the run-phase solver
`assignOverUnder` (`src/core/text_graph.ts:1762`, currently private)
already assigns `overFirst` phases for free-form crossings. Levi's
calls still bind: text pinned; spurs travelable; capitals via
connectors; one-token links. Decisions this brief makes where the
design left the mechanism open are marked (picked); the genuinely
open ones are Calls for Levi at the end, each with a recommendation -
build the recommendation unless Levi says otherwise before the stage
starts.

## Scope pick and order: standalone first, cartouche island second (picked)

Section 6 gives two embeddings (hole-bridge, decorative island) and
the stage-1 ladder gives a third surface the shapes can prove
themselves on: a standalone scene, the `text` scene's sibling. This
brief builds both embeddings, in this order:

- **5a: standalone emblem scenes.** A new builder turns a shape id
  into a `TangleGraph` of closed strands; a new `emblem` link param
  shows it alone, the way `text` shows a word alone
  (`src/core/scene_graph.ts:68-74`). No maze, no frame, no hole. This
  isolates the two new risks - authored crossing geometry and LIVE
  closed strands in the physics - from the frame interaction, so a
  shape that melts or never sleeps is diagnosed in a scene with
  nothing else in it.
- **5b: cartouche emblems.** The same graph, placed as a decorative
  ISLAND inside a cartouche hole stamped exactly as in stage 4a:
  hole first (generation), emblem appended after maze surgery, no
  frame junctions at all. The island is stage 4a's kill-criterion
  fallback ("a decorative island in the hole ... walked as a spur")
  promoted to the primary form, because a closed knot has no ends
  to hang on junctions and opening it to make ends destroys the
  knot it is.
- **5c (only on Call C3): the hole-bridge.** A shape opened at one
  authored point and hung on two frame junctions like the
  cartouche word, as a counted route across the hole. Sketched at
  the end of the embedding section; not built unless Levi asks for
  walkable shapes.

Why not the bridge first: the bridge form must be pinned (an open
chain held only at its ends is pulled toward its chord, design
3.7), so it cannot test section 6's live claim at all; and it
re-opens stage 4a's pinned-junction sleep question for zero new
topology. The island keeps the knot closed, keeps the frame
untouched, and makes "the word never disconnects the maze" (4a)
into "the emblem cannot affect the maze" by construction.

## Shape data: precomputed point tables, generated offline (picked)

No trig in `src/core` (K108: `+ - * /`, `Math.sqrt` via `hypot2`
only; the scan in `test/core/deterministic_math.test.ts` reads
`src/core` recursively). A trefoil's parametric curve therefore
cannot be evaluated at runtime. The tables are data, generated
once, exactly as the Hershey module was (`src/core/hershey_script.ts`
from `.jhf` files, stage 1b):

- Generator: `.claude/probes/K115/gen_emblems.mjs` (probe code, not
  shipped, not scanned; `Math.sin`/`cos` and segment-intersection
  search are free there). It evaluates each shape's defining curve,
  finds its self-intersections, inserts each crossing point into
  every pass that meets there, and emits TypeScript literals.
  Re-running it must reproduce the committed tables byte for byte;
  the tables' header names the command, the formulas and the
  sample counts.
- Committed data: `src/core/emblem_data.ts` - per shape, one
  `EmblemDef`:

```ts
interface EmblemDef {
  id: EmblemId;
  // Closed loops in strand traversal order, canonical box [-1, 1]^2.
  // Crossing points appear inline in every loop that passes through
  // them, as the SAME decimal literal, so the builder's coincidence
  // match is exact, not a search. Points are [x, y] at 6 dp.
  loops: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  crossings: number;      // Expected CROSSING node count (asserted).
  pinned: boolean;        // Per-shape pinning (next section).
  openAt?: number;        // 5c only: loop/point index of the bridge cut.
}
```

- Runtime use is exact ops only: translate/scale by multiplication
  and addition, coincidence by squared distance in canonical units
  (tolerance `1e-12`, far below the 6 dp grid), lengths by
  `hypot2`, TURN resampling by `lerpPt`-style interpolation. The
  decimal literals are the shape; nothing is recomputed.

The five shapes (design section 6's list, in build order):

| shape | strands | crossings | generator definition |
|---|---|---|---|
| `star` ({5/2} / cinquefoil) | 1 closed | 5 | Pentagram: 5 tips on R=1 in step-2 order; the 5 edge-edge intersections computed in the generator and inserted in traversal order (tip, crossing, crossing, tip, ...). Straight control polygon; Layer 2 splines and the live relaxation round it into the cinquefoil. |
| `trefoil` | 1 closed | 3 | Classic parametric trefoil, sampled at 144 steps in the generator, crossings located from the sampled polyline and inserted exactly, then decimated to control points no more than 0.16 canonical units apart, crossings kept. |
| `triquetra` | 1 closed | 3 | Three vesica arcs (pairwise circle intersections, R=1 lobes on centers at 120 degrees in the generator); the 3 lobe tips are authored TURN cusps, the 3 crossings inserted where the arcs cross. Pointed where the trefoil is plump - the distinction is the glyph. |
| `solomon` (Solomon's knot) | 2 closed | 4 | Two rounded-rectangle loops, one rotated 90 degrees (rotation done in the generator; the table is axis-aligned data), overlapping so each loop crosses the other 4 times, alternating. |
| `wreath` | 2 closed | 8 | A (2,8) torus link: two phase-shifted radial waves `r = R + a*sin(8t)` sampled in the generator (n=8, Call C5), closing as two components because 8 is even; 8 crossings, each strand alternating. |

Generator invariants, asserted in the generator's own output and
re-asserted by the builder tests at the shipped diameter: every
crossing is transversal with crossing angle at least 30 degrees
(measured in the generator from the inserted segments; the star's
36-degree crossings are the floor case, and the quasi-3D depth
exemption - CLAUDE.md, `DEPTH_WINDOW` - is angle-exact where the
old 40-degree text rule in design 3.4 was a lens-era floor; the
render check is a kill criterion below), and the along-strand arc
between consecutive crossings is at least 2.2 LU at diameter 10,
comfortably over `MIN_PASS_SEPARATION` (1.6 ctrl, about 1.1 LU on
a 1.4 LU-edge chain). A table that fails either is regenerated
plumper (larger lobe offset / wave amplitude), never shipped
around by loosening the assertion.

## The builder: `buildEmblemGraph` (`src/core/emblem_graph.ts`)

New file; `emblem_data.ts` beside it. It reuses the text builder's
machinery by export, not by copy: `assignOverUnder` is exported
from `src/core/text_graph.ts` (its text call site unchanged), and
the TURN resample rule is the text builder's `MAX_EDGE_LU = 1.4`
(`src/core/text_graph.ts:27`), re-declared with a comment, as
`attachTitle` re-declared its pieces in stage 3. Steps, all exact
ops:

1. Look up the `EmblemDef`; scale canonical points to the target
   diameter (`opts.diameter`, default below) about the box center,
   so the authored bounds become `diameter` LU across the larger
   axis. No rotation, ever (reading order is meaningless here, but
   the tables' authored up stays up).
2. Build nodes: one node per distinct canonical point (exact
   coincidence merges the passes at each crossing), TURN edges
   between consecutive points, wrapping each loop closed. A point
   shared by 2 passes (4 incident edge-ends) is a CROSSING; any
   other authored point is degree 2, a TURN. No END, no JUNCTION,
   no waypoint: an island has no walk vertices by construction.
3. Resample any edge longer than `MAX_EDGE_LU` with TURN nodes
   (the text builder's chunking, `:761-778`), so the physics'
   one-particle-per-edge gives the same ~0.7 LU particle spacing
   as text and lattice chains.
4. Strands are the def's loops, in order, `isClosed: true`,
   `pinned` copied per strand from the def. Node ids in a private
   `s` namespace (`sn<i>`), edges `se<i>` - the `t` namespace idiom
   of stage 1b, collision-proof against maze and text ids.
5. `assignOverUnder(graph)`, then the caller runs
   `checkStructure` / `checkAlternation` / `checkStrandPartition`
   as every scene build does (`src/core/scene_graph.ts:164-166`).
   The builder asserts the def's crossing count against the built
   CROSSING nodes and throws on a mismatch - a regenerated table
   that lost a crossing fails loudly in tests, not silently on
   screen.

Diameter: `EMBLEM_DIA = 10` LU default (authored bounds' larger
axis). At gs 18 the maze is 36 LU wide; a 10 LU emblem reads at
phone zoom (design 3.8's floor logic: the 3 LU x-height word is
26 CSS px; a 10 LU emblem is far over it) and leaves a hole the
frame can surround (next sections). Standalone scenes fit whatever
diameter results; the camera already frames every particle.

## Live or pinned: per shape (picked)

Design section 6: "Closed knots have no ends to pin and nothing
to read, so they may stay LIVE." The physics needs no new code for
either choice: `Strand.pinned` anchors every particle of a chain
at its authored position (`src/physics/particle_system.ts:718-724`),
and for an unpinned chain the structural and bending rests are
derived from the initial positions themselves
(`buildConstraints`, `:903-948` - structural rest = authored
segment length, bending rest = the two legs' sum, pull-only), so a
live shape's authored proportions ARE its rest proportions. What
relaxation does to a live shape is rounding: bending opens cusps,
fairing shortens curves, collision and the kink machinery work
the loops; nothing restores an authored angle. That decides each
shape:

| shape | pinned? | reasoning |
|---|---|---|
| `star` | LIVE | The headline test of section 6's claim. Rounding is the desired look (a rounded cinquefoil, not a polygon); the single strand's tension is symmetric, so it rounds in place. Its 5 crossings are self-crossings of one run (alternation below); no second component to drift against. |
| `trefoil` | LIVE | Same argument, plumper: 3 fat lobes survive rounding as a trefoil. The two live shapes are the cheapest possible experiment - if live fails its kill criteria, both flip to pinned by one data bit each, and the stage still ships. |
| `triquetra` | PINNED | Its difference from the trefoil is its three pointed vesica tips. Live bending opens exactly those cusps (design 3.7's table, applied to shapes): a live triquetra relaxes INTO a trefoil and the set loses a shape. The points are the glyph, so they are pinned. |
| `solomon` | PINNED | Two components, no strand between them: nothing holds the register between the loops. Live, material slides through their 4 shared crossings (the sliding bindings migrate), one loop drifts eccentric inside the other, and the 90-degree symmetry - the whole figure - is gone within seconds. |
| `wreath` | PINNED | 8 crossings of dense braid: live material slides through the crossings and bunches the braid unevenly around the ring (the slide-chase behaviour CLAUDE.md documents), and the (2,8) link's even spacing is the figure. A pinned wreath still reads as woven; a bunched one reads as damage. |

Bridge forms (5c), if ever built, are always pinned, like text:
an open chain's ends are frame junctions, and its middle must
hold the authored figure between them.

Live-shape physics notes, all consequences of existing code, no
new physics in this stage:

- Rest lengths need no authored support: `buildConstraints` reads
  them from the placed points, so scaling a table scales its rests.
  The settle ramp and `slack` act on a live emblem exactly as on
  lattice chains - an emblem scene is a knot scene of 1-2 chains.
- A live closed strand is grabbed and plucked like any thread;
  plucks are render-only (K77) and crossings are sliding bindings,
  so a tugged cinquefoil deforms and recovers toward its rests.
  There is no home spring and none is added (design 3.7's warning).
- Self-collision exemption is the depth model's, exact at the
  authored crossing angles; same-chain collision skip (+/-2 ctrl)
  and `KINK_MIN_SEPARATION` apply as on lattice chains. The
  generator's 2.2 LU crossing spacing keeps consecutive crossings'
  depth windows from overlapping into a standing fight.
- Sleep: a live emblem must sleep like a knot (the sleep gate,
  `src/physics/sleep_gate.ts`). The pinned-word precedent - a pair
  whose four endpoints are all anchored records no rider - does
  not cover live-live standing deficits inside an emblem; the
  sleep battery below is the test, and pinning is the fallback.

## Alternation: the run-phase solver, closed strands included

`assignOverUnder` (design 3.5, shipped for text) already solves
exactly these systems; the shapes are its closed cases:

- One closed strand with no junctions (star, trefoil, triquetra)
  is ONE run. Its k-th pass is over iff `phi XOR (k mod 2) = 1`;
  a self-crossing between passes k1, k2 is satisfiable iff k1 and
  k2 differ in parity. For the pentagram the traversal meets its
  10 passes in an order that pairs each crossing's passes 5 apart
  (odd), and the trefoil's 6 passes pair 3 apart (odd) - both
  satisfiable with a single phase, which is the algebraic content
  of "the {5/2} star is one alternating strand with 5 crossings".
  The builder does not hardcode this: it runs the solver and the
  cyclic branch of `checkAlternation`
  (`src/core/tangle_graph.ts:173-179`) verifies it, wrapping the
  last pass to the first. A regenerated table whose pairing parity
  broke fails that check instead of shipping a non-alternating
  knot - the solver's accepted-conflict count is asserted zero
  for all five defs in tests.
- Two closed strands (solomon, wreath) are two runs; every
  crossing is between runs, and the parity union-find assigns the
  two phases so each component alternates along itself. For the
  wreath this is the (2,8) link's ordinary alternating weave.
- `overFirst` carries the result, as for text; lattice graphs
  never set it, so no existing pin can move.

## Embedding 5b: the cartouche island

Reuse stage 4a's hole whole; only the sizing input and the attach
change.

- Hole planning: factor the candidate scan out of
  `planCartoucheHole` (`src/core/text_graph.ts:1279-1378`) into a
  shared `planHoleForBounds(w, h, gridSize, shape)` (the
  `PAD_LU = 2`, `FRAME_MIN = 2` constants, the centroid-ordered
  candidate scan and the one-component trial stamp,
  `src/core/shapes.ts` `buildCellMask(shape, size, hole?)`), used
  by both planners. The word path must stay byte-identical: the
  existing rect gs 18 "knot" pin (hole `{cx: 3, cy: 6, w: 12,
  h: 6}`, stage 4a handoff) is the regression test for the factor.
  `planEmblemHole(emblem, gridSize, shape)` measures
  `buildEmblemGraph` once at `EMBLEM_DIA`, shrink-only rebuilds
  against the kept mask's budget exactly as the word does
  (`:1316-1334`), and refuses below `MIN_EMBLEM_DIA = 6` LU - an
  emblem squeezed under 6 LU loses its crossings into each other,
  worse than no emblem (the `MIN_XHEIGHT` argument, Call C5).
- Attach: `attachEmblem(graph, emblem, hole, diameter): boolean`
  in `src/core/emblem_graph.ts`, the anti-`attachCartouche`: build
  at the fitted diameter, translate the bounds' center to the
  hole LU rect's center, append nodes/edges/strands. NO frame
  edge is split, no junction created, no connector, no crossing
  test needed - the emblem floats in the pad ring the hole
  guarantees, and `PAD_LU` of clearance is asserted from the
  placed bounds to the hole rect (0.5 LU slack, the 4a test's
  form). A pinned emblem is then held by its own anchors; a live
  emblem is held by nothing, which is the point - its drift
  inside the hole is a kill criterion, with the 5c junction
  tether as the named fallback, never softer pinning.
- Scene order (`src/core/scene_graph.ts`, maze branch): exactly
  the cartouche's order with the emblem substituted - plan before
  generation into `GenerationParams.hole`, plan/apply/cuts as
  today, title block unchanged, emblem attach after it, one
  `hueGroup` entry per appended strand (all the first emblem
  strand's index, `:182-186`'s rule), then the returned walk. If
  both a cartouche word and an emblem are named, the emblem wins
  the hole and the word is not built (one hole, one tenant;
  precedence below). `params.cartouche === "" &&
  params.cartoucheShape === ""` generates exactly today's maze.

## 5c sketch (only on Call C3): the hole-bridge

Each def carries `openAt`, a point index where its first loop may
be cut. The bridge build cuts there, giving the loop two ENDs;
`attachEmblemBridge` then follows `attachCartouche` step for step
(split the two ranked frame edges into `ej_a`/`ej_b` junctions,
Hermite lead-in/out in the pad ring, proper-intersection assertion,
junction-spacing preference with the 4a deviation's rule). The
opened strand is pinned (always, per Live or pinned above), its
ENDs retyped TURN on the junctions' strand as `cstart`/`cend` were.
The result is a counted route across the hole - the shape walked,
not found. It is a different tenant for the same hole, mutually
exclusive with the island by the selection below, and it inherits
every stage-4a kill criterion about pinned junctions.

## Selection: two params, one shape vocabulary (picked)

The silhouette param is already named `shape`
(`src/ui/url_state.ts`, the outer mask), so the emblems get their
own names; one `EmblemId` union (`"star" | "trefoil" | "triquetra"
| "solomon" | "wreath"`, `""` = none) serves both new params:

- `emblem: string` (5a, standalone): end to end like `text` -
  `UrlParams.emblem` beside `cartouche`
  (`src/ui/url_state.ts:276-277`), `SceneParams.emblem` beside
  `cartouche` (`src/core/scene_graph.ts:20-25`),
  `SCENE_FIELDS.emblem: "string"` in
  `src/physics/physics_worker_core.ts:205-208` (the
  `Record<keyof SceneParams, ...>` compile error is the checklist,
  as in stages 3a/4a), a panel dropdown in the Design folder under
  the Cartouche row ("Emblem"), and codec
  `choice("emblem", ["", "star", "trefoil", "triquetra", "solomon",
  "wreath"])` appended LAST in `CODEC_PARAMS` after `cartouche`
  (`src/ui/param_codec.ts:309-310`). Append-only: `CODEC_VERSION`
  stays 8, old links read `""`; only the literal table pin in
  `test/ui/param_codec.test.ts` moves, deliberately.
- `cartoucheShape: string` (5b, in-maze tenant choice): the same
  treatment one stage later (its own LAST append when 5b lands, so
  each sub-stage's pin movement is attributable). Panel: a
  "Cartouche shape" dropdown under the Cartouche text row; naming
  a shape greys the word row in the panel (display only - the
  builder's precedence governs links that name both).
- Precedence, in `buildSceneGraph` order: `text !== ""` wins
  (standalone word, today's early return first); then
  `emblem !== ""` (standalone emblem, same early-return position);
  then the maze, where a named `cartoucheShape` takes the hole
  over a named `cartouche` word. No link is ambiguous, and every
  losing param is simply not built - no merged scenes.
- Why not one param with a magic value (`cartouche =
  "shape:star"`): Hershey text can contain a colon, so the word
  namespace and the shape namespace genuinely collide; and the
  codec already has a typed enum choice, so the shape tenant costs
  one appended entry instead of a string convention every reader
  must parse. The cartouche's content choice is therefore expressed
  as two params with a stated precedence - the text-vs-shape choice
  a link makes is visible in the link's decoded params, not hidden
  inside a string.
- Dailies: neither param joins `DAILY_EXEMPT_KEYS`
  (`src/ui/daily_link.ts:135-196`); both join `MAZE_PARAM_KEYS`
  (`:78-109`, `cartouche`'s precedent at `:109`) - an emblem
  changes the design, so editing one on a daily leaves the daily
  by the ordinary rule. Daily emblems (e.g. an emblem of the day)
  are not in this stage; defaults give `""` everywhere, so every
  daily builds exactly today's scene.

## Walk and stats: decorative island, by construction

- Island (5a standalone, 5b in-maze): the emblem's strands carry
  no JUNCTION, END or waypoint nodes, so the walk graph skips
  each strand whole (`src/core/walk_graph.ts:182`: no stops, no
  walkable structure - the dot-loop precedent from text). In a
  maze, the returned walk is therefore identical in vertices,
  edges, start, exit and optimal to the holed scene without the
  emblem, which the tests assert directly; nothing is counted,
  nothing is excluded by code, there is simply no run to count.
  Fog, reveal and markers read the walk, so the island is found
  visually, never by a hint; it is plucked and tugged as thread,
  not walked as ground. This is design section 6's decorative
  island and Decision-2's opposite number: a word's spurs were
  made travelable, a knot's interior is not a route at all.
- Standalone emblem scenes have no `mentr_a`/`mexit_a` and no
  walk: the fabric controller stays off (the `text` scene's
  non-fabric path, `src/app/scene.ts`, with no controller), the
  camera fits the emblem, the solve clock never starts. The scene
  is a living sculpture: drag, pluck, temperature - the knot-mode
  interactions, on one authored knot.
- Bridge (5c only): counted like the cartouche word, verbatim -
  the opened strand is a run between two frame JUNCTION vertices,
  taps/length/optimal include it, frame-alone solvability is
  asserted with its walk edges removed (stage 4a's sweep form).

## Color and reveal

One `hueGroup` slot per emblem (appended strands share the first
emblem strand's index), as for words: under the `strands` scheme a
two-component emblem (solomon, wreath) still wears one hue family,
and under the default `segments` scheme its runs - there are no
walk runs on an island, so section colors treat each closed chain
as its own run - take per-chain colors. `RUN_FLAG.TEXT` stays
deferred with stage 4b; an emblem that needs a paint identity to
read gets one then, and emblem membership stays recoverable from
`Strand.pinned` plus scene order until then. Reveal needs no
change: closed chains reveal as knot strands do (draw/bloom flood
their chains), and a standalone emblem is its scene's whole
reveal.

## Determinism and pins

- `emblem === "" && cartoucheShape === ""` (every default, every
  daily, knot mode): no table is read, `buildCellMask` and the
  grower take today's paths, K87's plan pin, the golden dailies,
  the K74 walk pins and the physics golden stay green UNREFROZEN.
  The only deliberate pin movements are the codec table's appended
  entries (one per sub-stage) and the worker-host field counts.
- With an emblem, the new family gets frozen pins in the
  `test/core/text_graph.test.ts` "Welcome" pattern: per shape,
  node/edge/strand counts plus a rounded-position hash at
  `EMBLEM_DIA`, for the standalone graph; for 5b, a rect gs 18
  seed-11 emblem pin (hole + counts + hash). Building any emblem
  scene twice is bit-identical (test).
- K108: the builder and hole planners use only `+ - * /` and
  `hypot2`; the offline generator is outside `src/core` and
  outside the scan. Tables are decimal literals - data, like the
  Hershey integers.

## Stages within the stage

- 5a (first code stage): `gen_emblems.mjs` + `emblem_data.ts`,
  `buildEmblemGraph`, the exported `assignOverUnder`, the
  `emblem` param end to end (codec append, panel row, worker
  field), standalone scene wiring, builder/physics tests, live
  sleep battery entries, screenshots.
- 5b (second code stage, gated on 5a's kill criteria): the
  `planHoleForBounds` factor (word pin as regression guard),
  `planEmblemHole`, `attachEmblem`, the `cartoucheShape` param
  end to end, hole sweep, sleep entries, screenshots.
- 5c (only on Call C3): `openAt` cuts + `attachEmblemBridge`,
  counted-route tests. A separate brief amendment if it grows
  teeth; the sketch above is the contract it would build to.

## Out of scope

Hole-bridge emblems (5c, Call C3), daily emblems, `RUN_FLAG.TEXT`
and lent/paint overrides (stage 4b's deferred pair), emblems as
outer silhouettes (the `shape` masks already are that, section 6),
lattice-native Celtic panels (section 6's last bullet - inner
masks with chosen walls; a generation stage, not a stroke stage),
live text, per-script work (the stage after this one), emblem
rotation or mirroring in links.

## Tests

- `test/core/emblem_graph.test.ts` (new): per shape -
  `checkStructure` / `checkAlternation` / `checkStrandPartition`
  pass; strand count, `isClosed` on every strand, CROSSING count
  equals the def's table; `pinned` matches the per-shape table;
  no END/JUNCTION/waypoint nodes; consecutive-crossing arc at
  least 2.2 LU and crossing angle at least 30 degrees at
  `EMBLEM_DIA` (recomputed from built geometry with `hypot2` and
  squared cosines - no trig, mirroring the generator's asserts);
  solver conflicts zero; double-build bit-identical; the frozen
  counts-and-hash pin per shape.
- `test/core/scene_graph.test.ts`: standalone emblem scene -
  graph is the emblem's, `text` precedence over `emblem`, maze
  params ignored; 5b sweep: each emblem x shapes {rect, heart,
  ring, circle} x gs {12, 18} plus all 7 silhouettes at gs 18 -
  attached scenes' walks equal the holed-no-emblem walk exactly
  (vertices, start, exit, optimal), refused designs (small gs,
  thin silhouettes) ship an ordinary maze with no empty hole, and
  a planned hole is never left tenantless on any swept design.
- Physics: a live star scene settles and sleeps (sleep battery),
  retaining at least 70% of its authored diameter with its
  centroid inside the central half of its bounds after settling
  (the rounding budget, measured in-page or in the Node stepping
  harness the battery already uses); pinned triquetra/solomon/
  wreath particles do not move over steps (the stage-1b pinned
  test's form); a 5b island maze sleeps, and a live island's
  bounds stay inside its hole rect inset by 0.5 LU at sleep.
- Codec/daily: `emblem` (5a) and `cartoucheShape` (5b) round-trip
  every option, the table pin gains exactly the appended entries,
  `CODEC_VERSION` still 8; both keys in `MAZE_PARAM_KEYS`, absent
  from `DAILY_EXEMPT_KEYS`; golden dailies green unmodified;
  `test/physics/host_seam.test.ts` keeps the hosts in lockstep.
- Full `npm test`, `npm run build`, `npx tsc --noEmit`. Real
  screenshots via `scripts/diag_screenshot.mjs` (never virtual
  time): standalone star at load and settled (live rounding
  visible, asleep), trefoil cartouche island at 411 px, worker
  and `phw=0`, panel closed; a tugged live star mid-recovery.

## Kill criteria

- A live shape never sleeps, or settles into a blob (diameter
  retention or the crossing pattern unreadable in the settled
  shot): flip that shape's `pinned` bit and ship it pinned - the
  live claim dies per shape, not the stage. If BOTH live shapes
  fail, section 6's live sentence is recorded as measured-false
  in the handoff and every emblem ships pinned.
- Authored crossings melt at the shipped diameter (gap census or
  the shots: adjacent crossings' gaps merge, the figure reads as
  blobs at 411 px): regenerate plumper once; if gs 18's hole then
  refuses ordinary emblems, 5b is desktop/standalone-only and the
  cartouche keeps words as its only tenant.
- A live island drifts into its frame (bounds assertion at sleep
  on any swept design): the island form fails for live shapes in
  mazes - live emblems become standalone-only, and in-maze live
  waits for 5c's tether. Pinned islands are unaffected.
- The `planHoleForBounds` factor moves the word's rect pin or any
  no-emblem pin (K87, golden dailies, byte identity): the factor
  leaked; fix it, never re-freeze over it.
- The generator cannot be re-run to the committed tables byte for
  byte: the data's provenance is broken; stop and fix the
  generator before any table grows.

## Calls for Levi

- C1. Order and scope: standalone emblems first (5a), then
  cartouche islands (5b), bridge only if asked (rec. - each step
  isolates one new risk and reuses the last step's builder), or
  cartouche-first, or standalone-only shapes?
- C2. Live set: star + trefoil live, triquetra + Solomon +
  wreath pinned (rec., per-shape reasoning in Live or pinned),
  or all five live (accepting the triquetra-into-trefoil melt
  and Solomon/wreath drift as looks), or all pinned (shapes as
  still heraldry, no live experiment at all)?
- C3. Walk treatment: decorative islands, uncounted and
  unwalkable (rec. - the knot stays closed and entire), or the
  5c bridge as the in-maze form (every emblem a counted route
  across its hole, pinned, opened at one point), or both forms
  offered per design?
- C4. Selection: two params (`emblem` standalone,
  `cartoucheShape` in-maze) sharing one shape list, emblem wins
  the hole when both tenants are named (rec.), or a single param
  whose meaning shifts with the maze/cartouche context, or the
  `shape:star` magic string inside `cartouche` (rejected above -
  say so if wanted anyway)?
- C5. The wreath's braid count and the size floor: (2,8) at
  `MIN_EMBLEM_DIA = 6` LU (rec. - 8 crossings read at hole scale
  and the refusal floor matches the word's legibility logic), a
  denser (2,12) wreath, or a lower floor that squeezes emblems
  into smaller mazes at some legibility cost?


## Stage 5a handoff (standalone emblems, built)

Built per this brief's picks for 5a only (5b cartouche island untouched):
offline tables, builder, `emblem` param end to end, standalone scene
sibling of the text scene, walk treatment by construction (no walk
vertices on a closed emblem, so `buildWalkGraph` returns null and no
fabric controller/clock starts).

- Data: `.claude/probes/K115/gen_emblems.mjs` (probe code, trig allowed)
  regenerates `src/core/emblem_data.ts` byte for byte; verified by
  re-running it (identical SHA-256 twice). Tables are 6 dp decimal
  literals; crossing points are the SAME literal on every pass, so the
  builder's coincidence match (squared distance in canonical units,
  tolerance 1e-12) is exact.
- Per shape (at `EMBLEM_DIA = 10`): star 35 nodes / 40 edges / 1 strand /
  5 crossings, LIVE; trefoil 69/72/1/3, LIVE; triquetra 33/36/1/3,
  PINNED (pin counts/hash frozen in test/core/emblem_graph.test.ts);
  solomon 60/64/2/4, PINNED; wreath 136/144/2/8, PINNED.
  checkStructure / checkAlternation / checkStrandPartition pass for all
  five, solver conflicts zero (assignOverUnder now returns the accepted
  conflict count; its text call site is unchanged), no END/JUNCTION/
  waypoint nodes, every strand closed, minimum along-strand crossing
  arc at least 2.2 LU and every crossing angle at least 30 degrees
  (recomputed with hypot2 and squared cosines, no trig).
- Solomon is two rounded rectangles (1.8 x 1.0 and 1.0 x 1.8, corner
  radius 0.25, crossings at (+-0.5, +-0.5)), NOT stadiums: a stadium's
  cap centres sit on the other loop's sides and the threads kiss
  tangentially at four extra non-crossing points. The wreath's two
  components are `r = 0.72 +/- 0.22 sin(4t)` sampled every 5 degrees,
  meeting at r = 0.72 every 45 degrees (8 crossings); the triquetra is
  three pointed lobes (crossings on R = 0.28, tips on R = 1, inner arcs
  bowed to the centre, visits A B C A B C) rather than sampled circle
  arcs - the pointed cusps are the glyph, and it reads pointed in the
  shot. These are generator-side readings of the brief's definitions;
  topology, alternation and the shipped diameters are its contract.
- Live verdict: no pin flips. A live star and a live trefoil both
  settle and sleep in the Node battery (sleep gate tripped at sim
  5.0 s for both). Diameter retention measured from the probe: star
  10.000 -> 8.440 LU (0.844), trefoil 10.000 -> 9.779 LU (0.978), both
  above the 0.7 budget, with the centroid inside the central half of
  the authored bounds. Section 6's live sentence stands, as-is, for
  two shapes. Pinned triquetra/solomon/wreath hold every particle
  exact over 120 steps.
- Invariants: `emblem === ""` (every default, every daily, knot mode)
  reads no table; no no-emblem pin moved. Only deliberate pin moves:
  codec table appended `choice("emblem", ["", "star", "trefoil",
  "triquetra", "solomon", "wreath"])` LAST (CODEC_VERSION still 8),
  `SCENE_FIELDS.emblem` (worker field count 33 -> 34 in
  test/physics/worker_host.test.ts), PARAM_DEFAULTS / OVERRIDE_KEYS /
  daily pins for the new key. `emblem` joins MAZE_PARAM_KEYS and stays
  out of DAILY_EXEMPT_KEYS, so an emblem edit on a daily leaves the
  daily by the ordinary rule. K87 / golden dailies / byte_identity
  green UNREFROZEN: full suite 1487 passed, 1 skipped.
- Screenshots (real-time headed Chrome via
  scripts/diag_screenshot.mjs, never virtual time; vite preview on
  port 5216): .claude/probes/K115/stage5/{star,trefoil,triquetra,
  solomon,wreath}-load.png at load (all asleep, sim 5.0 s), and
  star-tugged.png from tug_shot.mjs in the same folder (a live star
  dragged by mouse, shot mid-recovery: deformable, crossings intact,
  recovering). Shots used `&snd=none`: observed along the way - the
  translucent halo sometimes seen on a thread is the app's ambient
  auto-pluck overlay (`soundMode = music` default, `?s=7&emb=...`
  shots without it show ghosted threads on emblems and on today's
  text/maze scenes alike, and it moves between shots). It is not an
  emblem defect; clean shots turned the ambient plucks off.
  Minor: on triquetra-load.png two small dark gap slivers cut the
  lower-left lobe where an inner arc passes close by - the ordinary
  crossing-gap cut at a close approach; the figure still reads.
- Deviation note: `sceneParamsOf` / `SCENE_FIELDS` live under
  src/physics (the K7 worker seam), so the emblem field landed there
  too, per the brief's own checklist reference, even though the
  delegating brief listed src/physics among the render-adjacent
  area to leave to the K320 agent. No src/render file was touched.

## Stage 5b handoff (cartouche emblems, built)

Built per this brief's picks for 5b only (5c bridge untouched): the
stage 4a hole reused whole with an emblem island as its tenant - hole
first (generation), emblem appended after maze surgery, no frame
junctions at all, decorative and unwalked by construction.

- Hole: the candidate scan is factored out of `planCartoucheHole`
  into `planHoleForBounds(w, h, gridSize, shape)` plus `holeBudget`
  (`src/core/text_graph.ts`; `PAD_LU`/`FRAME_MIN`, centroid-ordered
  scan, one-component trial stamp unchanged). The word path is
  byte-identical: the rect gs 18 "knot" pin (hole `{cx: 3, cy: 6,
  w: 12, h: 6}`) and every no-emblem pin stay green unrefrozen.
  `planEmblemHole(emblem, gridSize, shape)` and `attachEmblem(graph,
  emblem, hole, diameter): boolean` live in
  `src/core/emblem_graph.ts` (the planner cannot live in text_graph
  without an import cycle): measure at `EMBLEM_DIA`, shrink-only
  against the kept mask's budget, refuse below `MIN_EMBLEM_DIA = 6`.
  Attach builds at the fitted diameter, centers the bounds on the
  hole LU rect, appends `sn`/`se` nodes/edges/strands, and refuses
  (graph untouched) on id clash or placed bounds without `PAD_LU`
  clearance (0.5 LU slack). No frame edge split, no junction, no
  connector, no crossing test.
- Selection: `cartoucheShape` end to end like `emblem` - `UrlParams`
  beside `emblem`, `PARAM_DEFAULTS ""`, codec
  `choice("cartoucheShape", ...)` appended LAST (`CODEC_VERSION`
  still 8), legacy override `csh`, `SCENE_FIELDS` /
  `sceneParamsOf` (worker field count 34 -> 35), `MAZE_PARAM_KEYS`
  in, `DAILY_EXEMPT_KEYS` out, panel "Cartouche shape" dropdown
  under the Cartouche row (naming a shape greys the word row,
  display only). Precedence in `buildSceneGraph`: text, then
  standalone emblem, then the maze, where a named `cartoucheShape`
  takes the hole over a named `cartouche` word and the word is not
  built; a refused emblem ships an ordinary maze, never a fallback
  word hole. `cartouche === "" && cartoucheShape === ""` generates
  exactly today's maze.
- Walk: the island's strands carry no JUNCTION, END or waypoint
  nodes, so the walk graph skips each whole; the scene sweep (each
  emblem x {rect, heart, ring, circle} x gs {12, 18} plus {star,
  fish, tree} at gs 18, seed 11) asserts attached scenes' walks equal
  the holed-no-emblem walk exactly (vertices, edges, start, exit,
  optimal, distToExit), refused designs serialize identically to the
  plain maze, and a planned hole is never left tenantless. At gs 18
  heart, fish and ring refuse a diameter-10 emblem (the 7x7 hole
  plus its frame ring fits no 9x9 in-mask block there); rect, circle,
  star and tree take every emblem. Rect gs 18 seed-11 trefoil pin:
  hole `{cx: 5, cy: 5, w: 7, h: 7}` at diameter 10, 935 nodes / 1308
  edges / 81 strands, hash `4b8fab24`, one hue slot at strand 80.
  A gs 10 rect shrinks the star to diameter 8; gs 6 refuses all five.
- Live verdict: no pin flips, and live islands are not demoted to
  standalone-only. A live star island maze sleeps in the Node battery
  (sleep gate at sim 5.0 s) with its settled bounds inside its hole
  rect inset by 0.5 LU; pinned islands hold by their own anchors as
  in 5a. Section 6's live sentence stands in-maze for star/trefoil.
- Invariants: with both tenants empty (every default, every daily,
  knot mode) no table is read and no pin moved - K87, the golden
  dailies, the K74 walk pins and the physics golden stay green
  UNREFROZEN. Deliberate pin moves only: the codec table's appended
  `cartoucheShape` entry, the PARAM_DEFAULTS/override-key pins, the
  daily maze-key list, and the worker-host field counts (34 -> 35).
  Full suite 1495 passed, 1 skipped; `npm run build` and
  `npx tsc --noEmit` green.
- Screenshots (real-time headed Chrome via
  `scripts/diag_screenshot.mjs`, never virtual time; vite preview on
  port 5217, `&snd=none`): `.claude/probes/K115/stage5b/` -
  `trefoil-load.png` (seed 11 trefoil island at load, appearance
  trace still drawing), `trefoil-settled.png` (asleep, sim 5.0 s,
  worker) and `trefoil-settled-phw0.png` (same scene in-thread).
  All three log 935 nodes / 1308 edges / 81 strands. The panel is
  open in the shots (the diag harness's default view); the Cartouche
  row reads greyed behind the named Cartouche shape, as built.
  Observed in the shot logs: PixiJS `aGap`/`aUV` attribute warnings
  from the render area's in-flight K550 shader work in the shared
  checkout - no `src/render` file was touched by this stage.
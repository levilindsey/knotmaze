---
paths:
  - "src/core/**"
  - "src/util/**"
  - "test/core/**"
  - "test/util/**"
---

# Maze generation lore

Lore for the lattice, the maze plan and its graph surgery, moved
verbatim from CLAUDE.md by K45 (2026-10-12). The core insight stays in
CLAUDE.md: the threads ARE the maze paths.

- Generation changes move every daily and every link, and since K132 (no
  frozen daily) so does a default change that reaches the maze:
  `test/ui/daily_link.test.ts` pins dailies #1-#3 (re-freeze them and
  name what moved), and a saved daily attempt refuses to replay on a
  moved walk graph. The daily rules are in `gameplay-daily.md`.
- The plan's design history (splices, merges, corner cuts, long dead
  ends, shaped lattices) is in `docs/history.md`: Stages 5a–5d, 9 and
  11, SHAPED LATTICES and SHAPED START/EXIT CLEARANCE.

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

- *K580 s5 (2026-10-21), the glyph flag:* `Strand.glyph`
  (`src/core/types.ts`) is true on every strand that
  `src/core/glyphs/glyph_graph.ts` builds (the stroke font, `#glyphs2`),
  in tapered and notaper mode alike; `Strand.taper` exists only when
  tapered. The Hershey text path and mazes set none, except a maze title
  drawn under `#glyphs2`: `attachTitle` (`text_graph.ts`) builds it from
  the glyph graph when the set covers the title and pushes its strands,
  flag and all, into the maze graph. `src/app/scene.ts`
  passes it to the renderer as `RibbonStyle.glyph` (per chain, undefined
  when no strand has it), and only glyph-gated render code reads it: the
  stadium cap cover (render-ribbon.md, K580 s5). Pinned by
  `test/core/glyph_flag.test.ts`.

## Where the rest of the generation lore lives

K173 (2026-10-14) moved each topic to a file that attaches only with the
files it is about; `docs/lore_index.md` lists every rules file and its paths.
- `generation-plan.md`: the maze plan: the identity pin (K87), dead ends (K74), H1 fused arm cuts (K74 stage 2), route and reachability (K109, K110)
- `generation-shapes.md`: shapes, anchors and escape tails
- `generation-geometry.md`: the splines (Layer 2): the bend bound (K90)

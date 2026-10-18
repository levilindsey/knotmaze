# K115 Stage 1b brief: cursive builder + standalone scene

Design: `docs/design/K115_cursive_text.md`. Levi's calls
(`docs/design/levi_notes_2026-10-13.md`, 14:32 and 15:30): pinned (D1);
junction+spur with spurs TRAVELABLE as dead ends (D2, differs from the
design's decorative rec); standalone first, then title, then in-maze
(D3); Hershey Script Simplex (D4); text in links as ONE TOKEN (D5,
differs from the design's `&t=` rec); no foreign threads except glyph
bars via join-bars (D6); capitals supported — generated connector
first, hand-made joins where needed; phone legibility ASSUMED, Stage
1a skipped.

Types already landed with this brief: `Node.overFirst?: boolean` and
`Strand.pinned?: boolean` in `src/core/types.ts`.

## Part A: data + builder (`src/core/`)

- `src/core/hershey_script.ts`: Hershey Script Simplex as integer
  arrays (offline-generated from `.claude/probes/K115/data/scripts.jhf`;
  a generator script under `.claude/probes/K115/` is fine). Glyphs for
  ASCII 32-126. No `.jhf` text parsing at runtime.
- `src/core/text_graph.ts`: `buildTextGraph(text: string, opts?:
  { xHeight?: number }): TangleGraph`. Defaults: xHeight 3 LU.
  Deterministic, K108-exact ops only (+ - * /, Math.sqrt, hypot2; no
  trig/`**`/Math.hypot in `src/core`). Steps (design section 3.1,
  adjusted):
  1. Layout glyphs by Hershey left/right advance. Scale HU -> LU by
     xHeight/9. Keep Hershey's y-down (screen y-down, so text reads).
  2. Build the word stroke graph: split strokes at proper crossings
     (X), endpoint-on-stroke contacts (T), coincident endpoints (V).
     Tolerances in HU space with squared-distance comparisons.
  3. Retraces: in-stroke cusps (reversal > ~150 degrees) become opened
     V's (blunt tip: replace tip with a short segment perpendicular to
     the bisector, ~0.9 LU wide). Separate-stroke pieces that retrace
     the path collinearly are dropped where they overlap it; their
     non-overlapping remainder is a spur.
  4. Thread path: `mentr_a` at the first lead-in, reading order through
     the glyphs, `mexit_a` at the last exit. Merge-class letters
     (a c d e g o q) join onto the body at a JUNCTION; their own start
     becomes a spur END. Join-class letters continue end to end.
     Capitals (and any glyph whose entry/exit are not at (left,4)/
     (right,4)): generated Hermite connector from the previous exit to
     the glyph entry, and from its exit onward (design section 3.3).
     Word spaces: baseline swash (continue along y=4 line).
     Dots (i, j): tiny CLOSED loop strands (walk graph skips them for
     free). Bars (t): the bar stroke is a spur strand crossing the stem
     (a CROSSING with the path, no junction).
  5. Emit: CROSSING/JUNCTION/END feature nodes, TURN chains resampled
     to at most ~1.4 LU per edge, one 2-point edge per segment, strands:
     main path, one per spur, dot loops. Every edge in exactly one
     strand. `Strand.pinned = true` on all. Ids in a private `t`
     namespace (maze_apply Idiom B); literal `mentr_a`/`mexit_a`.
  6. Over/under: enumerate runs (strand spans between JUNCTION/END
     stops), assign per-run phase bits with a parity union-find
     (design section 3.5), set `Node.overFirst` per crossing. Self-
     crossings with unsatisfiable parity: accept and report via a
     returned diagnostics count? Keep simple: builder picks the phase
     minimizing conflicts deterministically.
  7. Unsupported characters: skip (space advance only) — no throw.
- Flip `shipped: true` on `hershey-fonts` in `notices/credits.ts`.
- Tests `test/core/text_graph.test.ts`: checkStructure /
  checkAlternation / checkStrandPartition pass for "Welcome",
  "knotmaze", "minimum", "hello", "Daily #12", "Solved"; strands all
  pinned; mentr_a/mexit_a present; a frozen pin (node/edge/strand
  counts + a hash of rounded positions) for "Welcome"; determinism
  (build twice, identical).

## Part B: physics + scene + link integration

- `src/physics/particle_system.ts`: (a) constructor: after chains are
  built, for each `Strand.pinned` strand pin every particle of its
  chain at its initial position (existing private `setAnchor`).
  (b) `assignCrossings`: when `node.overFirst` is set, first strand-
  order pass is over iff `overFirst`; else today's slash reading.
  (c) `checkAlternation` in `src/core/tangle_graph.ts` mirrors (b).
  Lattice graphs never set either field: physics golden and lattice
  checks must stay byte-identical (run them).
- `src/core/scene_graph.ts`: `SceneParams.text: string`. When
  non-empty, `buildSceneGraph` returns the text graph (maze surgery
  skipped), runs the same invariant checks.
- Link: `text` param end-to-end, ONE token (Levi D5): `UrlParams.text:
  string` (default ""), a `string` codec type in
  `src/ui/param_codec.ts` appended LAST in `CODEC_PARAMS` (UTF-8,
  NFC-normalized, length-prefixed bytes in the bitstream). Bump
  `CODEC_VERSION` and re-freeze the codec pin tests; note the bump in
  the commit (pre-launch rule: older blobs read defaults + warn).
- `src/app/scene.ts`: pass `text` through to `buildSceneGraph`. Text
  scenes force the non-fabric path (fabric controller stays off).
- Panel: a text row (string input) that rebuilds, in the Design
  folder of `src/ui/tweakpane_panel.ts`, following the existing
  structural-param rows' pattern. Daily-exempt: no (it IS the design).
- Tests: extend `test/ui/param_codec.test.ts` (string round-trip,
  table pin), a physics test that a text graph's particles do not move
  over steps (`test/physics/`), keep `byte_identity` green.

## Out of scope (later stages)

Waypoint tap-writing (P2), per-letter draw reveal, title thread (E3),
in-maze cartouche (E2), RUN_FLAG.TEXT color, shapes (stage 4), other
scripts (stage 5), live text.

## Verification

`npm test` full suite green (esp. byte_identity, maze_plan_identity,
deterministic_math, param_codec, notices); `npm run build` clean;
a real screenshot of `?text` scene (phw default AND phw=0) via
`scripts/diag_screenshot.mjs` showing "Welcome" pinned and asleep.

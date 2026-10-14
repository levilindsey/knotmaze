# K115 design: cursive text and shapes in the maze

Stage 1 (design and research), 2026-10-13. Brief: Levi's notes (verbatim
in the appendix). Nothing merges from this stage except this document; no
file under `src/` or `test/` changed. Branch
`worktree-agent-addea8f896840f12c`. Probes live in `.claude/probes/K115/`
(untracked); probe paths below are relative to it, and its `results.md`
holds the raw numbers.

The question: can knotmaze's threads trace cursive text (and predefined
shapes), embedded in a maze or standing alone, for arbitrary text and for
other scripts?

The short answer is yes, but not with the lattice. The lattice cannot
carry a lone thread (§1.2), so text has to be FREE-FORM strands built from
stroke-font data, emitted as a `TangleGraph` the rest of the pipeline
already understands, and pinned in place. Standalone text (a welcome or
credits scene) is cheap and comes first. A title thread on the entrance
tail comes next. Text inside a maze works through a masked hole (a
cartouche) and costs the most. The topology is script-agnostic: each new
script costs data, shaping and licensing, not new algorithms.

## 0. Recommendation and the decisions for Levi

Recommendation:

1. Build a text-to-graph builder (`src/core/text_graph.ts`). It turns a
   string into a `TangleGraph` of free-form, pinned strands from a
   single-line stroke font (Hershey Script Simplex for Latin), and makes
   every stroke feature a CROSSING, JUNCTION, TURN or decorative piece
   (§3).
2. Ship it first as a STANDALONE scene (a welcome, credits). The word is
   one walkable path with a waypoint per letter, so each tap writes the
   next letter (§5).
3. Then the TITLE THREAD (E3): the same builder attached to a maze's
   entrance tail, outside the maze, so "Daily #12" writes itself on the
   way in (§4.2).
4. Only then text INSIDE a maze: a masked hole whose walls form a frame
   (the cartouche), with the word as a bridge across it (E2, §4).
5. Shapes (stars, knots, wreaths) use the same builder; closed knots may
   stay live (§6).

Gate all of it on Stage 1a: a half-day probe that renders a pinned word
with the real renderer at phone zoom (§7.2). The SVG proxies say an
x-height of 3 lattice units (26 CSS px) reads at both thread widths, but
junction fans and per-pixel gaps may not.

**Decision 1: static or live text.** Recommended: pinned. The relaxation
would round an "l" into an "e", straighten joins and blow retraces apart
(§3.7). Plucks are render-only (K77), so a pinned word still vibrates and
sounds when tapped. Live text is a later experiment with its own risk of
never sleeping.

**Decision 2: spurs.** Glyph pieces that dead-end (the c's top terminal,
the foot of a stem below a retrace) become spurs. Recommended: decorative
spurs that the walk graph ignores. Making them real dead ends is a
difficulty knob for later.

**Decision 3: where text appears first.** Recommended order: a
standalone intro or credits scene, then the daily title thread, then
text inside mazes. Each step reuses the previous step's builder.

**Decision 4: font and data.** Recommended: Hershey Script Simplex for
Latin (free with an acknowledgement, integer data, measured here). Every
other script needs its own data decision (§2.5); the best CJK data is
share-alike or Arphic-licensed.

**Decision 5: text in links.** Either append a string type to the link
codec (links stay one token) or carry the text as a readable `&t=` key
after the token (readable and hand-editable; the codec already reads
trailing keys). Recommended: `&t=`, unless the one-token rule matters
more.

**Decision 6: foreign threads inside words.** A thread that crosses a
letter changes the letter: an o crossed reads ø, an l crossed reads t.
Recommended: no foreign threads inside words, except as bars a glyph
needs (t, f, x), and those only if join-bars drawn by the text thread
itself (§3.3) prove insufficient.

## 1. The medium

### 1.1 What each layer does today

| layer | file | what text must know |
|---|---|---|
| lattice | `src/core/lattice_grower.ts` | Doubled integer lattice; cell (cx,cy) spans [2cx,2cx+2]². Nodes sit at border midpoints. An OPEN midpoint is a CROSSING (both diagonals traced); a WALL midpoint is a TURN (a reflection, offset half a step). The outer border is all walls, so every strand is closed, and planarity holds by construction. Corridor pitch 2 LU; an edge between adjacent midpoints is √2 LU. |
| graph | `src/core/types.ts`, `src/core/tangle_graph.ts` | Node types CROSSING (degree 4, `isOver`), JUNCTION (3+), END (1; entrance/exit ends carry an `anchor`), TURN (2). Edges carry `latticePoints`. Over/under comes from `assignCheckerboardParity` (line 82). Checks: `checkStructure`, `checkAlternation` (within runs between junctions; it reads each pass's diagonal from the first segment of its own edge), `checkStrandPartition`. |
| maze plan and surgery | `src/core/maze_plan.ts`, `src/core/maze_apply.ts` | A splice splits a host edge and inserts a JUNCTION (`maze_apply.ts` near line 68); a bridge is an open strand with JUNCTION ends. `hueGroup` (line 36) gives each strand a color slot, and bridges inherit strandA's. Entrance and exit END ids `mentr_a/_b`, `mexit_a/_b` (lines 321-322). Tails route by `escapePath` (a chamfer field plus Dijkstra, four tiers). K109's piece model predicts solvability before surgery. |
| shapes | `src/core/shapes.ts` | Masks rect/heart/star/fish/tree/ring/circle. `buildCellMask` (line 163) keeps the largest component. Masked-out cells keep their walls, so a hole gets a frame by itself. The ring mask already has a hole. `maskExtremePoint` (line 231) picks the entrance and exit points. |
| walk graph | `src/core/walk_graph.ts` | Vertices are JUNCTION and END nodes; a strand with none is skipped as decorative (line 125). Entrances are `ENTRANCE_END_IDS.filter(id => vertices.has(id))` (line 154), so a graph with only `mentr_a` and `mexit_a` already works. Lengths use `hypot2` over every lattice point. |
| splines | `src/geometry/spline_generator.ts` | Centripetal Catmull-Rom through the particles, arc-length parameterized. It rounds a sharp V slightly. |
| physics | `src/physics/particle_system.ts` | One particle per node plus ONE per edge, at the midpoint of `latticePoints[0..1]` (lines ~585-620); walk ctrl = 2 × node index. Crossings are sliding bindings; `assignCrossings` (line 1255) reads `isOver` as "the '/' pass goes over" and takes each pass's slash class from its initial direction (`vx*vy > 0`). Hard pins exist: `anchored`, `anchorPos`, `setAnchor`, `anchoredList`, enforced exactly at substep end. COLLISION_MARGIN 1.16 tw (line 108), MIN_PASS_SEPARATION 1.6 ctrl, KINK_MIN_SEPARATION 2.6, DEPTH_WINDOW 1.4. Same-chain collision skip ±2 ctrl (about 1.2-1.4 LU). Junction spacing max(2.2, 5.7 tw) ctrl, kink spacing max(2.6, 6.2 tw). |
| render | `src/render/ribbon_renderer.ts`, `junction_field.ts`, `gap_mask.ts` | Crossings are G1 per-pixel gaps; junctions are the fused fan field (MAX_ARMS 12); free tips are AXIS records (caps). The standard: no thread-thread contact without a dark line. A tight fold renders as a thinned fold (the miter clamp). Markers have radius max(0.55, 1.5 tw). |
| color | `src/core/section_colors.ts` | One `RunSection` per walk run (chain, ctrl range, ramps, `flags`, colA/colMid/colB). `RUN_FLAG` bits live in `src/render/paint_const.ts` (line 98). The per-strand hueGroup slot is read at line 259. |
| reveal | `src/core/reveal_plan.ts` | Sequences instant/trace/bloom/draw/ink; FX none/rainbow/comet/dust/burn/roots. One `RevealSource {chain, cFrom, cTo, t0, rate}` per chain; DRAW_SPEED 14 LU/s, FLOOD_SPEED 8, INK_SPEED 4.5. |

### 1.2 A lone thread is impossible on the lattice

Every open midpoint is traced by both diagonals. A thread that passes
through an open midpoint crosses the other diagonal there, so a corridor
one cell wide always carries two passes plaited around each other (a
two-strand braid), and a wall reflects the thread back across. No lattice configuration lets one
thread run alone along a corridor.

Lattice-native lettering is therefore BRAIDED: each letter is a corridor
whose two strands plait along it (A2/T2, measured in §3.8 and §9).
Single-thread cursive has to be free-form strands, built off the lattice
and joined to it. This answers "preallocating corresponding cells" in
Levi's notes: cells preallocated for a letter give a braid, not a cursive
stroke. Cells masked OUT give a hole that a free-form word can sit in
(E2, §4).

### 1.3 What text must survive

- **Relaxation.** Under the physics, a free chain straightens (rest
  shrink pulls it toward the chord between its anchors) and opens its
  cusps (bending). It also loses detail, because Laplacian fairing is
  curve-shortening. The kink-eye ratchet and round-eye pressure round its
  loops open, repulsion and collision blow its retraces apart, and
  centering moves it. Text must be pinned, or run a reduced live mode
  (§3.7).
- **Over/under alternation**, checked per run between junctions
  (`checkAlternation`). Free-form crossings need their own phase
  assignment and an explicit over-pass, because the slash test is
  lattice-specific (§3.5).
- **Planarity with transversal crossings.** P3.30: threads overlap only
  transversally; tangents and retraces must be junctions.
- **The walk graph.** The entrance and exit must be reachable through the
  text, the text's runs walkable, and decorative pieces kept out of the
  stats.
- **Daily determinism.** K87's plan identity pin
  (`test/core/maze_plan_identity.test.ts`), the golden dailies and the
  physics golden must not move when no text is present. Generation code
  in `src/core` follows K108: exact operations (+ − × ÷, `Math.sqrt`,
  `hypot2`); no `Math.hypot`, trig or `**`. Angle classes come from
  squared-cosine comparisons, never `acos`. Stroke data ships as
  integers.

## 2. Stroke data and scripts

### 2.1 What the data must provide

A single-line (stroke) font: each glyph as polylines in pen order, with
an entry and an exit point for joining; integer coordinates (K108); a
license that allows shipping it inside the app; and coverage of the text
we want. Outline fonts (TTF/OTF) give filled shapes whose centerlines
must be extracted by skeletonization, which produces junk branches at
joins and terminals (A4, §7.1).

### 2.2 Sources

| source | kind | coverage | license | use |
|---|---|---|---|---|
| Hershey Script Simplex (`scripts.jhf`) | single-line, integer | 96 ASCII glyphs: Latin cursive lowercase and capitals, digits, punctuation; no accents | any use, provided the acknowledgements to A. V. Hershey (NBS) and James Hurt (Cognition, Inc.) ship with the data; any format except NTIS's | Latin v1 (measured, §2.3) |
| Hershey Cursive (`cursive.jhf`) | same | lowercase identical to Script Simplex | same | none |
| Hershey Script Complex (`scriptc.jhf`) | doubled parallel strokes fake pen weight | ASCII | same | useless here (its m has 6 strokes) |
| Hershey Greek, Cyrillic, Japanese | single-line print | Greek and Cyrillic print faces; Japanese 193 glyphs | same | print only, not cursive |
| EMS fonts (Evil Mad Scientist's Hershey Text for Inkscape) | single-line SVG fonts | Latin in several styles | per font; several derive from OFL outline fonts, so OFL applies to those | other Latin styles; check each font |
| KanjiVG | stroke-order SVG paths per character | Japanese kanji and kana, thousands | CC BY-SA 3.0 (share-alike) | CJK option; license decision |
| Make Me a Hanzi | stroke medians, integer, 1024 box, y flipped | 9000+ Chinese characters | graphics derived from Arphic PL fonts (Arphic Public License); dictionary LGPL | CJK option |
| animCJK | stroke SVGs | Japanese 7,335 + 177 kana; Chinese 8,190 simplified + 1,425 traditional; Korean 535 Hanja, no Hangul | Arphic-derived and LGPL | CJK option |
| IAM On-Line Handwriting Database | pen trajectories | English handwriting | non-commercial research | training data only (A5); not shippable |
| outline font + HarfBuzz + skeletonization | centerlines | any script with a font | the font's (OFL is common) | offline bootstrap only (A4) |

### 2.3 Hershey Script Simplex, measured

From `hershey_thread.mjs`, `census.mjs` and `dump.mjs`:

- Units: x-height 9 HU (Hershey units), ascender 21 HU. Every lowercase
  join sits at mid x-height: the lead-in starts at (left, 4) and the exit
  ends at (right, 4).
- Letters that start at the join (i l m n t u ...) continue the previous
  exit. For a c d e g o q the previous exit lands ON the letter's body: a
  T merge, not an end-to-end join. A naive connector that bridges each
  gap to the next letter's first point mangles c, o and m
  (`out/scripts_Welcome_xh3.png`).
- Retraces are separate strokes. The m/n humps start on the previous
  down-stroke (a T); the t's lead-in ends on its stem; the W is four
  strokes meeting at V's; the i/u stems are in-stroke cusps (a turn of
  about 172°, arms about 8° apart).
- It is plotter cursive, not one pen path: an o has 4 odd-degree
  vertices. Assembly must walk the stroke graph (§3.1), not concatenate
  strokes.

Census (`census.mjs`). "T (on own stroke)" counts stroke ends touching
their own stroke, like the o's closure. V counts two stroke ends
meeting; the census sees each meeting from both ends and halves the
count, so a .5 is a meeting seen from one end only.

| word | X (of them under 40°) | T (on own stroke) | V | cusps | dots |
|---|---|---|---|---|---|
| Welcome | 2 (1) | 8 (3) | 2.5 | 0 | 0 |
| knotmaze | 4 (1) | 10 (3) | 3 | 1 | 0 |
| minimum | 0 | 8 (0) | 3 | 3 | 2 |
| Daily | 3 (2) | 3 (2) | 1.5 | 3 | 1 |
| hello | 4 (3) | 4 (2) | 1.5 | 0 | 0 |
| amazing | 2 (1) | 9 (2) | 2 | 3 | 1 |

- Crossing angles: l 34°, o 63°, h 27°, k 27°, t-bar 72°, z 83°, D 90°,
  y 38°, g 36°. Half of the loop crossings are under 40°.
- Clear gap (closest approach of two parts of the word that are not
  neighbors along a stroke): 0.2-0.36 HU when only 1.5 HU around each
  feature is excluded. That gap is set by the retraces, which no thread
  can carry. With 4.5 HU around each T/V/cusp excluded (the retraces
  resolved, §3.2): 1.07-1.45 HU. "hello" stays at 0.73 HU (the h loop).
  "Daily" is 0.11 HU because the capital D's flourish touches itself, so
  capitals need their own pass.
- Join gaps from an exit to the next letter's first point: W→e 19 HU,
  l→c 7.3, c→o 7.2, m→e 3.2, m→a 9.1, m→i 9.5. For a c d e g o q the
  real join is the T on the body, not this gap.
- Thread length: "Welcome" joined naively is 369 HU. At an x-height of
  3 LU that is 123 LU: about 174 particles at the lattice's 0.71 LU
  spacing, and about 9 s at the draw reveal's 14 LU/s.

### 2.4 Shaping and bidi

- **Latin with Hershey** needs no shaper. The builder lays glyphs left to
  right by their left/right bounds (Hershey's advance); joins are
  geometric.
- **Accents:** NFD-decompose (`normalize("NFD")`; Unicode's
  normalization stability policy freezes the decompositions of existing
  characters) into a base and combining marks. Marks are small decorative
  strokes over or under the base. Hershey has no accents, so about eight
  marks need authoring (acute, grave, circumflex, diaeresis, tilde, ring,
  cedilla, caron).
- **Arabic joining is table-driven:** each letter's joining type in
  Unicode's `ArabicShaping.txt` picks its isolated, initial, medial or
  final form, plus the mandatory lam-alef ligature. No HarfBuzz is needed
  while we own the stroke data.
- **Indic scripts (Devanagari) and full CJK typography need a real
  shaper.** harfbuzzjs (MIT, WASM; download size still to be measured)
  maps text plus a font to glyph ids and positions. Its output depends on
  the HarfBuzz version and the font binary, so links and dailies must pin
  both or must not depend on it.
- **Bidi:** a single right-to-left run is easy (lay out right to left,
  entry at the right). Mixed-direction text needs UAX #9 for visual
  order; defer it.

### 2.5 Scripts

Effort figures are estimates.

| script | joined? | data | shaping | treatment | effort |
|---|---|---|---|---|---|
| Latin | yes | Hershey Script | none | v1; accents as composed marks | in Stage 1b; accents about 1 day |
| Greek, Cyrillic | Hershey has print only | Hershey print, or authored cursive | none | joined print (connectors between print letters), or authored cursive. Cyrillic cursive differs from print (т is written like m), so it cannot be derived from print | 1-2 days each |
| Arabic, Persian | natively joined | authored: up to 4 forms × 28 letters, many sharing a skeleton | `ArabicShaping.txt` + lam-alef | a word breaks into pieces after ا د ذ ر ز و; each piece is its own segment, linked by a baseline swash or a junction; dots are essential (ب ت ث differ only by dots) | 3-5 days |
| Hebrew (not researched; by analogy) | no | authored | none | right to left, connectors between letters | 1-2 days |
| Devanagari | the headline joins a word | font-keyed strokes | HarfBuzz (conjuncts, reordering) | the headline is the thread; letter bodies hang from it as spurs or loops | 5+ days |
| CJK | no | KanjiVG, Make Me a Hanzi or animCJK | none for stroke data | about 10 strokes per character: a cluster of X/T/END features, many spurs; 6-8 LU per character, about 5 per phone line; lazy-load per character | 2-3 days + a license decision |
| Hangul | no | about 50-70 authored jamo variants | conjoining jamo (Unicode ch. 3.12) compose all 11,172 syllables | each syllable block a cluster; connectors between blocks | 3-4 days |

**Does it scale to other scripts?** For the topology, yes. The builder
works on a stroke graph, and every script's glyphs are stroke graphs made
of the same features (X, T, V, ends, dots). The cost is per script and
varies by an order of magnitude:

- data and licensing: Latin is free; the CJK sources are share-alike or
  Arphic-licensed;
- shaping: none for Latin, a table for Arabic, a real shaper for Indic
  scripts;
- direction: right to left alone is easy, mixed bidi is hard;
- size: a CJK character needs 2-3 times a Latin letter's width to stay
  legible;
- cursiveness: scripts that do not join need connectors, which are a
  design choice, not data.

Scripts that do not join also make more spurs (every free stroke end is a
dead end), so Decision 2 matters more for them.

## 3. Strokes to threads

### 3.1 The stroke graph

1. Lay out the glyphs (§2.4) in HU and scale to LU by the x-height (3 LU
   is the recommended floor, §3.8).
2. Intersect everything with exact operations (segment intersection needs
   only + − × ÷). Build a planar graph. Its nodes are stroke ends, T
   contacts (an end on another stroke's interior, within a tolerance), V
   meetings (two ends together), X crossings (transversal) and cusps
   (in-stroke reversals above about 150°). Its edges are the stroke
   pieces between them.
3. Classify each node (§3.4) and resolve the retraces (§3.2).
4. Choose the THREAD PATH, the walk the player takes: entry, the glyphs
   in reading order, exit. At a JUNCTION the path takes one branch, and
   pieces off the path become spurs. Per glyph, the choice (which branch
   continues, which piece becomes a spur, and how the glyph joins a
   "continue" or "merge" neighbor) is made OFFLINE when the data module
   is generated. A glyph has a handful of nodes, so brute force works,
   and the committed module holds integer arrays with the path already
   chosen. At runtime the builder only lays out, joins, intersects across
   letters and emits.
5. Emit a `TangleGraph`: chains of TURN nodes along every piece (§3.6);
   CROSSING, JUNCTION and END nodes at the features; one strand per
   maximal chain; `mentr_a` and `mexit_a` at the ends of the path.
6. Assign crossing phases (§3.5), then run `checkStructure`,
   `checkAlternation` and `checkStrandPartition`.

### 3.2 Retraces

A pen retrace (the stroke running back along itself, as in the i's stem
or where an n's hump leaves the stem) is a doubled path that no thread
can carry: two passes closer than the collision margin merge on screen.
Three treatments:

- **(a) Junction + spur.** The second stroke starts at a JUNCTION on the
  first, and the doubled part becomes a short spur. The shape stays
  exact; the spur is a dead end (decorative per Decision 2).
- **(b) Opened V.** Replace the retrace with a sharp TURN whose arms
  diverge enough to stay apart (§3.4). Near the tip the arms overlap and
  read as one stroke, which is how a retrace looks in ink. Recommended
  for the i/u/w stems and the m/n humps.
- **(c) Loop.** Turn the retrace into a small loop with a crossing. This
  changes letters: a looped i reads as e, a looped t as l, looped n humps
  as ll. Use it only for letters whose loop IS the letter.

### 3.3 Joins, pen lifts, dots and bars

- **Joins.** Into letters that start at the join (i l m n t u ...) the
  exit continues into the lead-in as a TURN chain. Into a c d e g o q the
  exit merges into the body at a JUNCTION, and the glyph's own start (the
  c's top terminal) becomes a spur. An authored "thread cursive" variant
  can replace that spur with a hook loop (a crossing), which gives a
  cleaner single path. This is the per-character choice between a
  junction and a crossing that Levi's notes ask about: a spur keeps the
  printed shape, a hook keeps a single path.
- **Pen lifts inside a letter** (the m's humps in Hershey, the W's four
  strokes) become junctions or opened V's (§3.2).
- **Dots** (i, j, a diaeresis) become a pinned decorative dash: two
  particles with caps at both tips, which renders as a round dot one
  thread wide. A tiny closed loop is the alternative; with no walk
  vertices, the walk graph already skips it. The i's dot is 1×1 HU,
  0.33 LU at an x-height of 3, smaller than a thread width, so it renders
  as a dot the thread's own width. A dash's END nodes need the
  decorative flag (§4.6).
- **Bars** (t, f, the second stroke of x, the crossbar of A or H), in
  order of preference:
  1. a JOIN-BAR: the exit stroke swings back across the stem and then on
     to the next letter, the common handwritten crossed t in one stroke.
     It is a crossing on the main thread and needs no extra strand.
  2. in a maze, a LENT segment from a maze thread (§4.3);
  3. a decorative bar strand with two free tips, crossing the stem.
- **Accents** are composed marks, decorative (§2.4).
- **Capitals.** Hershey's capitals are not built to join (the W→e gap is
  19 HU; the D touches itself at 0.11 HU). Author a joined subset, use a
  Hermite connector from the capital's exit to the next lead-in, or keep
  v1 lowercase.
- **Word spaces** become a baseline swash (the thread runs on along the
  baseline) or, in a maze, a junction where a maze thread can attach.

### 3.4 Crossing or junction, per feature

The thresholds below are placeholders; Stage 1a calibrates them against
the real renderer.

| feature | examples | becomes | condition |
|---|---|---|---|
| X at ~40° or more | o 63°, t-bar 72°, z 83° | CROSSING | at least MIN_PASS_SEPARATION (1.6 ctrl) from other crossings, and at least the junction spacing from junctions, along both passes |
| X under ~40° | l 34°, h/k 27°, y 38°, g 36° | widen the loop's neck to 40° or more in the glyph data, or close the loop with a JUNCTION (a loop that closes by touching) | two passes at angle θ stay within the margin over margin/sin θ on each side of the crossing: 1.3 LU at 27° (tw 0.52), close to the whole x-height |
| T | m/n humps, t lead-in, joins into a c d e g o q | JUNCTION, plus a spur off the path | junction spacing from other junctions |
| V | the W's points | TURN | opening at least 2·asin(margin/2.4): 24° at tw 0.42, 29° at tw 0.52, so the arms clear the margin by the edge of the same-chain collision skip; open narrower V's |
| cusp or retrace | i, u, w stems | opened V (recommended), junction + spur, or a loop | §3.2 |
| tangent | strokes that touch without crossing | JUNCTION | P3.30 |
| dot | i, j | decorative dash or tiny loop | §3.3 |
| free end | the c's top, the a's tail | END on a spur (decorative), or an end of the path | |

### 3.5 Over/under: the run-phase solver

Alternation is checked per RUN, the stretch of a strand between two walk
vertices. The solver:

1. Give each run r a phase bit φ_r. Its k-th crossing is over exactly
   when φ_r ⊕ (k mod 2) = 1.
2. A crossing between run r1 (its k1-th) and run r2 (its k2-th) needs
   exactly one pass over: φ_r1 ⊕ φ_r2 = 1 ⊕ k1 ⊕ k2. A crossing of a run
   with itself (r1 = r2) is satisfiable only when k1 and k2 differ in
   parity.
3. A parity union-find solves all constraints in near-linear time. An odd
   cycle is a conflict. Fix it by splitting a run with a junction (each
   piece gets its own phase), or accept one non-alternating crossing.

The probe's naively joined "Welcome" had 0 conflicts
(`out/scripts_Welcome.json`).

A closed curve C added over an alternating field (a shape over a woven
area, §6) always has a solution: set `isOver ⊕ inside(C)` on every
existing crossing inside C, which is the checkerboard parity flipped
inside the curve, and C's own crossings then alternate. The price is that
the field inside C changes its look (not its walk). A word drawn always
OVER the maze, like a label, is non-alternating by design: possible as a
style, not as the default.

**Physics needs an explicit over-pass.** `assignCrossings`
(`particle_system.ts:1255`) reads `isOver` as "the '/' pass is over" and
classes each pass by the sign of vx·vy in its initial direction. Two
free-form passes can fall in the same class, which makes that reading
ambiguous. There are two ways out:

- the builder encodes `isOver` against that test and the occurrence
  order. This works today but is fragile;
- recommended: an explicit over-pass field on CROSSING nodes, which
  `assignCrossings` and `checkAlternation` prefer when it is present.
  Lattice crossings keep the old path, so the physics golden stays
  byte-identical.

### 3.6 Lattice snapping and particle spacing

Text stays free-form. Snapping glyph geometry to the lattice (or to the
quarter grid) destroys the curves at legible sizes. Only the attachment
points snap: the junctions where the text meets a frame thread sit on
frame edges (§4.2).

Each stroke piece is resampled into a chain of TURN nodes about √2 LU
apart, each edge holding two lattice points. The physics' one particle
per edge then gives the lattice's 0.71 LU particle spacing, and walk
ctrl = 2 × node index still holds. Tight curves (the e's eye is about
1.3 LU across at x-height 3) may want half that spacing. That changes the
meaning in LU of the ctrl-based constants for the text chains only, and
those are pinned; Stage 1a decides. Centripetal Catmull-Rom (Layer 2)
passes through the particles but rounds sharp V's slightly; pinned
particles keep the tip in place.

### 3.7 Relaxation and its counters

| mechanism | what it does to text | counter |
|---|---|---|
| rest shrink | pulls an open chain toward the straight line between its anchors | pin (v1); live: rest length = authored length |
| bending | opens cusps and V's | pin; live: per-particle rest angles |
| Laplacian fairing | curve-shortening; loses detail | pin; live: exclude text chains |
| kink-eye ratchet (7 widths) and round-eye pressure | rounds an l loop into an e-like eye | pin; live: no kink treatment on text |
| repulsion, collision | blow retraces and close passes apart | resolve retraces (§3.2); pin |
| centering | moves the whole word | pin |

V1 pins every text particle with `setAnchor`. Anchors are enforced
exactly at substep end, by the mechanism END anchors and open chains
already use, so the cost is negligible. Plucks are render-only (K77): a
pinned word still vibrates and sounds when tapped.

A crossing between a pinned text pass and a FREE maze thread keeps an
ordinary sliding binding: the free side moves and the pinned side holds.
The builder must give such crossings the spacing the clamps demand on
BOTH chains: at least 1.6 ctrl between crossings, at least the junction
spacing to junctions. Otherwise the clamps fight geometry that cannot
move, and the maze never sleeps ("never demand what the geometry cannot
give"). Crossings between two pinned passes can be frozen bindings.

Live text (later, optional) would drop shrink, fairing and the kink
treatment, give bending rest angles, and add soft home springs toward the
authored shape. A home spring is a positional pull against unknown
geometry. It needs a rate limit, or some seed turns it into a pump (the
position-based simulation lessons).

### 3.8 Scale and legibility on phones

The phone's default zoom is 8.8 CSS px per LU at gs 18, so a 36 LU maze
is about 317 px wide on a 411 px phone.

- **x-height 3 LU = 26 CSS px.** "Welcome", "knotmaze" and "minimum" read
  clearly in the SVG proxy at tw 0.42 and at the default tw 0.52
  (`out/*_fused3.png`, `out/*_fused3_tw052.png`). At 0.52 the e/o/a
  counters shrink to slits, and the m/n humps fill in at the retrace,
  which reads as one stroke. Widths are 323, 370 and 375 CSS px: 46-54
  CSS px (5-6 LU) per letter.
- **x-height 4 LU = 35 CSS px:** 430-501 CSS px wide, wider than the
  phone.
- **So a 7-letter word at the legible floor spans the whole default
  maze.** Words of 4-5 letters fit inside a gs-18 maze with weave around
  them. Longer text needs a bigger maze, a follow camera that scrolls
  along the text (standalone), or a desktop.
- **The collision floor for LIVE text** is x-height ≥ margin / clear gap
  × 9 HU: 3.0-4.1 LU at tw 0.42 (margin 0.49 LU) and 3.7-5.1 LU at tw
  0.52 (margin 0.60 LU); "hello" needs 6.0 and 7.4 because of the h
  loop. PINNED text only has to clear the render floor.
- **The i's dot** is about one thread width at x-height 3. It should
  read as a dot; Stage 1a confirms.
- **Braided corridor lettering (A2/T2)** reads as knot blobs at a 3-cell
  x-height. At 5 cells it is recognizable rope lettering, but "Welcome"
  is then 1056 CSS px wide: desktop banners only.

Caveat: these are SVG proxies (round joins, a flat 0.07 LU casing), not
the renderer. Junction fans, G1 gaps, the miter clamp and the real
casing all differ. Stage 1a measures the real thing.

## 4. Embedding in a maze

### 4.1 Options

| option | how | verdict |
|---|---|---|
| E1 overlay | free text strands laid over the woven field, crossing lattice threads | Ruled out. A stroke meets a lattice thread about every 1 LU, which is under MIN_PASS_SEPARATION (1.6 ctrl, about 1.1 LU on a text chain sampled as in §3.6), and the letters vanish into the 17.6 px weave pitch. |
| E2 hole + cartouche | mask out the cells under the word. Masked cells keep their walls, so the hole's border threads form a frame by themselves, and the physics does the "shoving". The word is a long bridge joined to frame threads at its two ends | Recommended in-maze form (Stage 3). |
| E2' forced bridge | a full-width band: the word is the only link between two halves of the maze, so every solve writes it | Variant. Needs multi-component masks (`buildCellMask` keeps only the largest component today), and K109's piece model must count the word as the spanning link. |
| E3 title thread | the word outside the maze, joined to the entrance or exit tail | The cheapest maze-adjacent form (Stage 2). |
| A2 braided corridors (T2) | cells preallocated along the letter shapes; lattice-native | Desktop-banner size only (§3.8). |
| A3 Jacquard paint | letters painted onto the weave by color only (G2 paint records); any font or script | Cosmetic, large text only; no thread follows the letter. |
| A6 shoving lattice threads | deform existing threads into letters | Unworkable: lattice threads come in braided pairs (§1.2). |

Levi's notes suggest "preallocating corresponding cells, or shoving".
Preallocated cells give braided corridor lettering (A2). Masked-OUT cells
give the hole that a free-form word sits in (E2), and the physics shoves
the frame threads out of the way by itself.

### 4.2 Connecting the ends

**In a hole (E2):**

- The frame forms on the hole's border, from TURN nodes reflecting at the
  hole's walls.
- At the entry (left at mid x-height, or right for right-to-left text)
  and at the exit, split a frame edge and insert a JUNCTION (the splice
  mechanism in `maze_apply.ts`). Use the border midpoint nearest the
  glyph's lead-in.
- A generated lead-in swash (a Hermite curve matching the lead-in's
  tangent) runs from the junction to the first glyph. A lead-out runs
  from the last exit to the second junction.
- The junctions keep the junction spacing from the other junctions on
  the frame.
- Pinned text pins the junction particle, so the frame is held at those
  two points and free everywhere else.

**Title thread (E3):**

- The word sits outside the maze (above it, or beside the entrance
  anchor), and its exit joins the entrance tail. The tail's END moves to
  the word's start (`mentr_a` = the first letter's lead-in), so the walk
  starts with the word.
- `escapePath` (chamfer field plus Dijkstra) already routes tails out of
  the maze and can route the connector.
- Attach AFTER the start/exit selection, which picks the longest optimal
  solve over the tail combinations, and exclude the title's arc from the
  stats. Otherwise the title changes which start is chosen.
- The camera's bounds grow to include the title. On a phone, a title
  wider than the maze shrinks everything, so titles stay short (about 7
  glyphs at x-height 3).

### 4.3 Foreign threads and lent segments

A stroke that crosses a letter changes the letter: an o crossed reads ø,
an l crossed reads t, a c crossed reads ¢. So foreign (maze) threads may
cross a word only where the glyph needs a bar. A cohesive text color
(§4.5) softens this, because a crossing thread of another color reads as
passing over the word rather than as part of it, but it does not make it
safe.

A LENT segment is a frame thread rerouted through the cartouche, between
two border turns, so that it crosses the t's stem as its bar. The two
half-ends it leaves on the frame are rejoined by a border splice or left
as dead-end stubs. It is painted in the text color inside the cartouche
(§4.5). Junctions with foreign threads happen only at the word's entry,
its exit and its word gaps. Prefer join-bars (§3.3), which need no
foreign thread at all.

### 4.4 Solvable and interesting

- K109's piece model and spanning must count the text bridge as a link
  between pieces, and `repairTailRoute` must not cut it.
- Put the word ON the optimal path: among the start/exit tail
  combinations, prefer one whose optimal route walks the word, or use the
  forced bridge. Then every solve writes the word, which is the "trigger
  progress across them" in Levi's notes. Off the path, the word is a
  landmark.
- With decorative spurs (Decision 2), a word adds no dead ends or choices
  of its own; the maze's difficulty stays in the maze.
- No text, no change: the text path runs only when text is present, so
  K87's identity pin, the golden dailies and the physics golden stay
  byte-identical.

### 4.5 Color

Section colors are per walk run, so a word split into several runs by
junctions would take several colors. The options:

- put every text chain in one hueGroup slot, so schemes keyed on hueGroup
  agree;
- add a `RUN_FLAG.TEXT` bit: the paint takes one text color, optionally
  as a gradient in reading order (colA at the first letter, colB at the
  last);
- give lent segments a G2 paint override (KPAINT records): the text color
  inside the cartouche, fading back to the maze color at the frame.

Recommended: `RUN_FLAG.TEXT` with a reading-order gradient, plus the
paint override for lent segments.

### 4.6 Walkability

- **Decorative pieces need a walk-graph flag.** A junction whose only
  extra arm is decorative becomes a pass-through, not a vertex, and the
  spur strand is skipped, as decorative loops already are
  (`walk_graph.ts:125`). Dots and accent dashes need the same flag;
  otherwise their END nodes form separate components.
- Then the word's main path is ONE run: a single tap carries the head
  through the whole word, and the yarn (the trail) writes it. With
  WAYPOINT vertices (degree-2 vertices at letter or word boundaries),
  each tap writes one letter or one word (§5).
- Fog of war (K99) reveals the word as it is walked.
- Stats (K19): taps, length and the optimal count include the word's run
  like any other run. The title thread's arc is excluded (§4.2).

### 4.7 Determinism, links and dailies

- The builder lives in `src/core` and follows K108: integer stroke data,
  exact operations, `hypot2` for lengths, squared-cosine angle tests. The
  K108 scan (`test/core/deterministic_math.test.ts`) reads `src/core`
  recursively, so it covers the new file automatically.
- Links: the codec has no string type. Either append a UTF-8 string type
  (length-prefixed bytes) to the current codec table, or carry the text
  as a readable `&t=` key after the token (Decision 5). Normalize text to
  NFC before encoding it.
- Dailies are pinned by DAILY_V1 (codec v3's defaults). A daily title
  thread changes the daily's walk graph, so it needs a DAILY_V2 from some
  day number on. The alternative is a title shown as its own scene before
  the maze, which leaves the maze unchanged; that is recommended first.

## 5. Standalone text

`buildTextGraph(text, font, opts)` in `src/core/text_graph.ts` returns a
`TangleGraph` with `mentr_a` at the first lead-in and `mexit_a` at the
last exit, spurs and marks flagged decorative, and every particle pinned.
The rest of the pipeline (splines, physics, renderer, fabric controller,
walk graph, reveal) runs on it as it runs on a maze, plus the flags from
§3.5 and §4.6.

Progress across the text:

| mode | how | note |
|---|---|---|
| P1 one tap | the whole word is one run | simplest |
| P2 waypoints | degree-2 walk vertices at letter (or word) boundaries; each tap writes the next letter | recommended: the player writes the word |
| P3 drag-scrub | the head follows a drag along the thread | needs a new input path |
| P4 passive | the `draw` reveal, with one `RevealSource` per letter in reading order | about 9 s for "Welcome" at 14 LU/s; maybe a faster pen |

With the Motion setting (K53/K79) reduced, every mode should show the
text at once.

- **Uses:** a welcome before the first daily ("Welcome", then the daily);
  the daily's title as its own scene ("Daily #12"); credits; the win
  banner ("Solved").
- **Multiline text:** each line is its own strand or scene. No
  boustrophedon for Latin, since the pen would run backwards on every
  other line.
- **Long lines:** the follow camera scrolls with the head instead of
  shrinking the text.
- **Right to left:** the entry is at the right; mixed bidi is deferred.

## 6. Predefined shapes

The same stroke-graph path draws any line art:

- a {5/2} star drawn as one closed alternating strand (the cinquefoil
  knot, 5 crossings);
- a trefoil or a triquetra (3 crossings), and Solomon's knot (2 loops, 4
  crossings);
- a wreath: a two-strand braid around a circle (a (2,n) torus link), or
  the ring mask's own corridor;
- hearts, stars and fish already exist as OUTER masks. An inner mask
  makes a hole of that shape, whose frame traces it at cell resolution
  (coarse at gs 18);
- lattice-native Celtic panels: Kaplan and Cohen's breaks are walls, so
  an inner mask with chosen walls gives a classic panel inside the maze.

Closed knots have no ends to pin and nothing to read, so they may stay
LIVE: the relaxation rounds them prettily (a rounded star). Text must be
pinned. A shape embeds like a word: a hole with its frame, holding
either a bridge (the shape drawn as an open path) or a closed knot. The
closed knot is either joined to the frame by a junction or left as a
decorative island with no walk vertices.

## 7. Alternatives, plan and kill criteria

### 7.1 Alternatives considered

| alternative | why not now |
|---|---|
| A2 braided corridor lettering | lattice-native and live, but needs a 5-cell x-height (desktop only) |
| A3 Jacquard paint text (or the tonal approach of Xu and Kaplan's image-guided mazes: text emerging from wall density and direction) | any font or script, and cheap, but no thread traces the letter; large text only. A good fallback for scripts without stroke data |
| A4 outline font + skeletonization (harfbuzzjs `glyphToPath` + medial axis) | junk branches at joins and terminals, inconsistent strokes. An offline tool to bootstrap stroke data, never runtime |
| A5 neural handwriting (Graves 2013, trained on IAM-OnDB) | beautiful and varied, but nondeterministic, and the data is non-commercial. At most an offline bake |
| A6 shoving lattice threads | unworkable (§1.2) |
| E1 text over the weave | crossings too dense, illegible (§4.1) |

### 7.2 Staged plan

Effort figures are estimates.

| stage | content | effort |
|---|---|---|
| 1a | Legibility go/no-go. Inject a pinned text graph through a probe hook; screenshot with the real renderer at phone zoom, at tw 0.52 and 0.42, for Welcome, knotmaze, minimum, hello and "Daily #12". Calibrate the 40° crossing threshold, the V floor and the particle spacing. | ½ day |
| 1b | `src/core/text_graph.ts` and a Hershey Script data module (integers, with the acknowledgement); pinning; the decorative flag and waypoints in the walk graph; the explicit over-pass field; a per-letter draw reveal; the standalone intro and credits scene. Tests: topology checks, a frozen JSON pin of a word's graph, the K108 scan. | 2-3 days |
| 2 | The title thread on the entrance or exit tail (E3); DAILY_V2 if the dailies get it. | 1-2 days |
| 3 | In-maze text: hole mask and cartouche, attachments, the piece model, run-phase alternation, lent segments, `RUN_FLAG.TEXT` and paint. | 3-5 days |
| 4 | Shapes: star, trefoil, Solomon's knot, wreath. | 1-2 days |
| 5 | Per script: accents about 1 day; Cyrillic or Greek 1-2; Arabic 3-5; Hangul 3-4; CJK 2-3 plus a license decision; Devanagari 5+. | per script |

Prototype first: Stage 1a, because it can kill the idea in half a day.

### 7.3 What would kill it

- **Illegible at phone scale in the real renderer.** Junction fans and
  gaps blot the letters at 26 CSS px, and at 35 px a word no longer fits
  the screen. Fallbacks: standalone text only, with a follow camera;
  in-maze text on desktop only; A3 paint text.
- **Pinned text reads as dead** next to the living maze, or the
  cartouche never sleeps (a pump at the pinned boundary).
- **Licensing** for the scripts we want (KanjiVG's share-alike, Arphic).
- **Determinism:** data or a shaper that we cannot pin.

## 8. Sources

- Hershey fonts data (the `.jhf` files and `hershey.txt` with the
  distribution terms): https://github.com/kamalmostafa/hershey-fonts
- Hershey font license: https://fedoraproject.org/wiki/Licensing/HersheyFontLicense
  (any use, with the acknowledgements to A. V. Hershey at NBS and James
  Hurt at Cognition, Inc.; any format except the NTIS one).
- Hershey format notes: https://solhsa.com/hershey/
- Evil Mad Scientist's Hershey Text extension for Inkscape (the EMS
  single-line fonts; per-font licenses, several derived from OFL fonts).
- Single-line fonts discussion: https://typedrawers.com/discussion/5026/
- MIT SkeleType: https://www.media.mit.edu/projects/skeletype/overview/
- KanjiVG: https://kanjivg.tagaini.net/
- Make Me a Hanzi: https://github.com/skishore/makemeahanzi
- animCJK: https://github.com/parsimonhi/animCJK
- harfbuzzjs: https://github.com/harfbuzz/harfbuzzjs
- IAM On-Line Handwriting Database:
  https://fki.tic.heia-fr.ch/databases/iam-on-line-handwriting-database
- A. Graves, "Generating Sequences With Recurrent Neural Networks", 2013
  (arXiv:1308.0850).
- J. Xu and C. S. Kaplan, "Image-Guided Maze Construction", SIGGRAPH
  2007: https://cgl.uwaterloo.ca/jiexu/paper/xu_siggraph07.pdf
- C. S. Kaplan and E. Cohen, "Computer Generated Celtic Design", EGWR
  2003: https://diglib.eg.org/handle/10.2312/EGWR.EGWR03.009-019
- Unicode: UAX #9 (bidi), https://www.unicode.org/reports/tr9/;
  `ArabicShaping.txt`,
  https://www.unicode.org/Public/UCD/latest/ucd/ArabicShaping.txt; the
  Unicode Standard section 3.12 (conjoining jamo); the stability
  policy, https://www.unicode.org/policies/stability_policy.html.

## 9. Probe evidence

Everything is in `.claude/probes/K115/` (untracked):

- `data/`: `scripts.jhf`, `cursive.jhf`, `scriptc.jhf`, `japanese.jhf`
  and `hershey.txt` (the distribution terms), from
  github.com/kamalmostafa/hershey-fonts.
- `hershey_thread.mjs <font> <word>`: layout, a naive joined thread, its
  crossings and alternation, SVGs at x-heights 2/3/4/6 (`*_xh*`), fused
  renders (`*_fused3`, `*_fused4`), braided corridors (`*_braid3`,
  `*_braid5`) and a JSON report. With `TW=0.52` it writes `*_tw052.*`.
- `census.mjs <font> <words...>` (env `RET`): the topology census and the
  clear gap.
- `shoot.mjs [filter]`: SVG to PNG in a headed, off-screen Chrome at
  dpr 2.
- `dump.mjs`: a glyph's strokes.
- `results.md`: the raw numbers.

Key images:

- `out/scripts_Welcome_fused3.png` (tw 0.42) and
  `out/scripts_Welcome_fused3_tw052.png` (tw 0.52): the legible floor;
- `out/scripts_Welcome_xh3.png`: the naive connector mangling c, o and m;
- `out/scripts_Welcome_braid3.png`, `out/scripts_Welcome_braid5.png`:
  braided corridor lettering (37×10 cells, 192 crossings, 8 strands; and
  60×14 cells, 287 crossings, 11 strands);
- `out/scripts_{knotmaze,minimum}_fused3*.png`: two more words.

## Appendix: Levi's notes (verbatim)

Cursive text:
- I'd love to also explore algorithms to generate thread patterns to trace out cursive text. It would be really cool if we could embed specific text within a maze. Maybe by preallocating corresponding cells, or maybe by taking some cells and shoving a bit in some places. Idk. We'd need to make sure the cursive letters connect and that start and end of the overall text connects to the surrounding maze. We'd probably also want to color the text cohesively. Not sure whether we'd want to allow intersections/junctions/crossings with other threads in the middle of the cursive text threads or not--probably this would be guided by which junction/crossing locations would better-convey the text-strokes in a clear way.
- Junctions vs crossings would need to be considered and which looks better for the given character. We could have outside threads provide crossing segments, but we'd need to them make sure to connect those segments with the surrounding maze as well.
- If embedding text within a maze is impractical, I'd at least like to be able to generate cursive thread shapes in isolation, and then still trigger progress across them. This could be a fun interactive welcome, or intro, or credits, etc.
- Also, we'd need to be able to procedurally handle arbitrary text, and internationalization and other alphabets as well.
- Please research how the algorithmic design of this might work, tradeoff considerations, alternatives, and whether this can scale well to other language characters.
- We could also use the same sort of idea to embed predefined shapes within a maze, like stars, or wreaths, or other shapes.

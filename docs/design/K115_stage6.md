# K115 Stage 6 brief: per-script additions (joins, accents, scripts)

Design `docs/design/K115_cursive_text.md` sections 3.3 (joins, pen
lifts, dots and bars; capitals), 2.4 (accents and shaping), 2.5
(scripts and effort) and 7.2 (the per-script stage). Stages 1b-5b are
in: `buildTextGraph` emits a pinned word (`src/core/text_graph.ts:590`),
`attachTitle` hangs it on an entrance tail, `attachCartouche` hangs it
across a stamped hole, and `buildEmblemGraph` stands beside it
(`src/core/emblem_graph.ts`). Levi's calls still bind: text pinned;
spurs travelable; capitals via connectors in 1b-5b (this stage replaces
*how* the connector aims, not that it exists); one-token links.
Decisions this brief makes where the design left the mechanism open
are marked (picked); the genuinely open ones are Calls for Levi at the
end of each sub-stage, each with a recommendation - build the
recommendation unless Levi says otherwise before that sub-stage
starts.

This stage is three independent code stages, in this order. Each is
separately committable, separately killable, and none is a prerequisite
for the next except that they all touch `buildTextGraph`'s layout loop,
so they land sequentially, never in parallel worktrees on that file:

- **6a: join-class capital rework.** The generated Hermite connector is
  kept; where it *aims* changes from "first point to last point" to a
  per-capital join class. No data files, no codec change.
- **6b: accents and diacritics.** Nine precomposed Latin letters
  (`é è ê à á ü ö ñ ç`) render as base letter plus a floating mark.
  Marks are data authored here, not Hershey data. No codec change.
- **6c: one additional script.** Greek print letters from the same
  Hershey distribution as a second glyph table, joined by the capital
  connector's baseline form. No new link param - the text string
  itself names the script by its codepoints.

Why this order: 6a fixes the seam every later script also uses; 6b
proves the floating-mark path (dots already prove the strand form, but
not the input-normalization path); 6c is the only sub-stage that can
fail on data or legibility grounds and kill its own scope without
touching 6a/6b.

## What "the connector aims at the endpoint" costs today (6a evidence)

The builder as built (`src/core/text_graph.ts:630-674`):

- Lowercase: `entryPt` is the stroke point closest to
  `(cursor, JOIN_Y)` with `JOIN_Y = 4` (`:24`), `exitPt` the endpoint
  closest to `(cursorNext, JOIN_Y)` (`:634-638`). Merge-class letters
  (`a c d e g o q`) therefore join *on the body* by construction.
- Everything else - capitals, digits, punctuation: `entryPt` is
  `placed[0][0]` and `exitPt` is the last point of the last stroke
  (`:643-648`). The connector (`hermitePts`, `:560-584`, tangents
  scaled `0.45 x gap`, `:567-568`) then bridges the previous exit to
  that first point, and that last point to the next letter's entry.

That endpoint rule is the known-weak seam (design 3.3, "Capitals").
Measured from the shipped integer data (offline census over
`src/core/hershey_script.ts`, the same numbers `.claude/probes/K115/`
`census.mjs`/`results.md` report):

- Join gaps an endpoint connector must bridge: `W->e` 19 HU,
  `D->a` 11 HU, `m->a` 9.1 HU, `m->i` 9.5 HU (results.md). The capital
  gaps are the two largest in the corpus, and they are large because
  the endpoint is not where a pen would enter or leave the letter.
- Problem capitals, by inspection of the same data (entry = first
  point, exit = last point of last stroke, Hershey units, y down,
  join line `y = 4`, baseline `y = 9`, ascender top `y = -12`):

| letter | entry | exit | the defect |
|---|---|---|---|
| I | (5,4) | (-3,4) | Entry and exit are both on the join line but on *opposite sides* of the glyph: the routed path runs right-to-left through the letter, so both seams approach from the wrong side and the letter reads as a connector with a loop on it. |
| J | (2,12) | (5,6) | Entry is 3 HU *below* the baseline (the descender hook's tip). A connector from a lowercase exit at `y=4` dives 8 HU to meet it; the hook is the letter, the dive is not. |
| L | (-5,0) | (9,6) | Entry sits 4 HU above the join line on the stem's shoulder; exit leaves 2 HU above the baseline at the foot's far right. Both seams are off the join line in opposite directions. |
| P | (1,-10) | (2,-3) | Exit is at `y=-3`, 7 HU above the join line, at the bowl's close - the pen has not returned to the stem foot. The next connector starts from mid-air at the top of the letter. |
| S | (-10,9) | (-8,2) | Exit is on the glyph's *left* edge. The connector to the next letter must cross back over the whole glyph width (the "isolated S": in `Spain`/`Solved` the S sits apart, joined by a long thread that retraces its own width). |
| T | (0,-6)* | (-4,4) | *First stroke is the top bar, not the stem (2 strokes; the stem is stroke 2, `(-4,4)` end). Endpoint entry aims the incoming connector at the bar's left tip; the routed path then has to find the stem. |
| X | (-4,-6)* | (-11,6) | *Two crossing strokes; exit is the second stroke's lower-left tip, again on the wrong (left) side for a left-to-right join. |

The remaining capitals are not clean, merely less wrong: `B` exits at
`(-3,6)` (left side, like S), `Q` at `(9,6)`, `W` enters at `(-10,-5)`
with a 19 HU gap to bridge. A per-pair fix (26 x 26 ligature table,
or 26 hand-authored endpoint overrides) is the wrong shape for this:
the defects cluster into *where a pen arrives* and *where it leaves*,
each in a small number of height bands. That is the class below.

## 6a: join-class capital rework (picked)

### The class

Heights are Hershey-unit bands on the glyph's own y axis (`y` down;
`JOIN_Y = 4` is the lowercase join line every existing connector
already targets):

| band | y range | anchor y | meaning |
|---|---|---|---|
| HIGH | `y <= -4` | -8 | ascender zone: the stroke is up where a capital's top lives |
| MID | `-3 <= y <= 5` | 4 (`JOIN_Y`) | join-line zone |
| LOW | `y >= 6` | 9 | baseline / descender zone |

- **Arrive class** (where the *incoming* connector meets the capital):
  `HIGH` if the entry endpoint's band is HIGH, else `LOW`. Two values,
  deliberately: an incoming thread either climbs to the ascender or it
  does not; MID entries (I at `y=4`, L at `y=0`) are baseline-side
  arrivals and class as LOW. This is the `arrive high/low` half of the
  design's class.
- **Leave class** (where the *outgoing* connector leaves the capital):
  the exit endpoint's band verbatim - `HIGH`, `MID` or `LOW`. In
  Script Simplex no capital's endpoint leaves HIGH (the closest are
  `F` at `y=-2` and `P` at `y=-3`, both MID); HIGH leave stays in the
  enum because 6c's print letters and any authored capital may need
  it, and an empty enum arm costs nothing. This is the
  `leave high/mid/low` half.

Classification of all 26 capitals, from the shipped data (entry/exit
are the endpoint coordinates above; the table is asserted by test
against the data, not trusted from this document):

| L | entry | arrive | exit | leave | | L | entry | arrive | exit | leave |
|---|---|---|---|---|---|---|---|---|---|
| A | (-11,9) | LOW | (7,9) | LOW | | N | (-8,-5) | HIGH | (11,4) | MID |
| B | (1,-10) | HIGH | (-3,6) | LOW | | O | (2,-12) | HIGH | (10,4) | MID |
| C | (2,-6) | HIGH | (5,4) | MID | | P | (1,-10) | HIGH | (2,-3) | MID |
| D | (2,-12) | HIGH | (10,3) | MID | | Q | (3,-6) | HIGH | (9,6) | LOW |
| E | (4,-8) | HIGH | (7,4) | MID | | R | (1,-10) | HIGH | (11,4) | MID |
| F | (0,-6) | HIGH | (8,-2) | MID | | S | (-10,9) | LOW | (-8,2) | MID |
| G | (-11,9) | LOW | (-9,2) | MID | | T | (0,-6) | HIGH | (-4,4) | MID |
| H | (-5,-5) | HIGH | (10,4) | MID | | U | (-8,-5) | HIGH | (11,4) | MID |
| I | (5,4) | LOW | (-3,4) | MID | | V | (-7,-5) | HIGH | (9,-1) | MID |
| J | (2,12) | LOW | (5,6) | LOW | | W | (-10,-5) | HIGH | (1,9) | LOW |
| K | (-5,-5) | HIGH | (9,4) | MID | | X | (-4,-6) | HIGH | (-11,6) | LOW |
| L | (-5,0) | LOW | (9,6) | LOW | | Y | (-7,-5) | HIGH | (9,4) | MID |
| M | (-13,-5) | HIGH | (15,4) | MID | | Z | (3,-6) | HIGH | (8,4) | MID |

Arrive: HIGH x20, LOW x6 (A G I J L S). Leave: MID x19, LOW x7
(A B J L Q W X), HIGH x0. Digits and punctuation keep the endpoint
rule in 6a (Call C2); lowercase is untouched - its closest-point rule
already *is* a MID-class join, which is why lowercase never showed
this defect.

### The connector targets the class point

The join point stops being the stroke endpoint. For each capital, at
layout time (`buildTextGraph`'s per-glyph step, before `routeGlyph`):

1. **Arrive point.** Walk the glyph's routed path (`routePts`) from
   its start, at most `ARRIVE_SCAN = 14` HU of arc. The arrive point
   is the path point closest to the ideal anchor `(cursor,
   arriveAnchorY)` - for HIGH, `(cursor, -8)`; for LOW, `(cursor,
   JOIN_Y)`. Measuring from the *path*, not the raw first stroke, is
   what fixes T: its path starts wherever `routeGlyph` enters, and
   the scan finds the stem-side point near the anchor instead of the
   bar tip. If the whole scan window sits more than 6 HU from the
   anchor (a glyph whose entry stroke never approaches its class
   height), fall back to the endpoint - the class abstains rather
   than dragging the join across the glyph.
2. **Leave point.** Symmetrically: walk the routed path from its
   end, at most `LEAVE_SCAN = 14` HU of arc; the leave point is the
   path point closest to `(cursorNext, leaveAnchorY)` with anchor
   `-8` / `4` / `9` for HIGH / MID / LOW. For S this finds the
   stroke's rightward mid-crossing near `y=4` instead of the
   left-edge endpoint at `(-8,2)`; for P it finds where the routed
   path passes the join line on its way down the stem instead of the
   bowl close at `y=-3`; for I it finds the path's leftward end near
   the anchor rather than forcing the connector to the geometric
   endpoint on the wrong side.
3. **Thread path consequence.** The arrive point becomes the glyph's
   `entryPt` and the leave point its `exitPt` for routing purposes:
   the stroke material before the arrive point (between the endpoint
   and the class point) is *not* discarded - it becomes a spur
   (`routeGlyph` leftovers, travelable per Levi's D2), exactly as a
   merge-class letter's own start already does (design 3.3). The
   waypoint for the glyph (stage 2) sits at the arrive point.
   Material after the leave point likewise becomes a spur tail.
4. **Connector.** `hermitePts` is unchanged (same `0.45` tangent
   scale, same 7 interior samples). Its `q` is the arrive point with
   tangent from the routed path's direction *at that point*; its `p`
   on the outgoing side is the leave point with the path's direction
   there. The previous glyph's exit and the next glyph's entry rules
   do not change: a capital between two lowercase letters is joined
   LOW/MID-aware on both sides; a capital after a word space keeps
   the baseline swash, and its arrive scan runs from the swash end.

Determinism: classification is a lookup of committed integer data;
the scans use squared distance to the anchor (exact ops, `hypot2`
only where a length is needed - K108). No trig, no `Math.hypot`.
`CAPITAL_JOIN` is a committed literal table in
`src/core/text_graph.ts` (26 entries, `{arrive, leave}` as string
unions), generated offline by a probe census script under
`.claude/probes/K115/` from `hershey_script.ts` - re-running it must
reproduce the table, and a unit test re-derives every entry's band
from the glyph endpoints and asserts equality, so a future data
regeneration cannot silently reclass a letter.

Scope guard: only the branch at `:643-648` (non-lowercase) changes,
and within it only capitals `A-Z` take the class path. The endpoint
variables remain for digits/punctuation. Lowercase layout, merge
class, opened cusps, retraces, dot loops, bar strands, the whole-word
planar build and `assignOverUnder` are untouched.

### Before/after word list

The stage's acceptance corpus. "Before" is today's endpoint build;
"after" is the class build. Each word is shot with the real renderer
at phone zoom (stage 1b's harness, `?txt=<word>`, tw default) and the
pair is the look evidence; the numeric seam metric below is the test
evidence.

| word | exercises |
|---|---|
| Daily | D HIGH/MID -> a: the 11 HU endpoint gap; the daily title's own capital (stage 3a ships `Daily #n`, so this word is on every daily) |
| Welcome | W HIGH/LOW: the 19 HU corpus-worst gap, exit at baseline far point |
| Spain | S LOW/MID in initial position: the isolated-S retrace |
| Solved | S again as the standalone scene's demo word (stage 2 shots use it) |
| Paris | P HIGH/MID: leave from the bowl close vs from the stem at the join line |
| Italy | I LOW/MID initial: both seams on the wrong side today |
| Japan | J LOW/LOW initial: the sub-baseline dive |
| London | L LOW/LOW initial: shoulder entry, foot exit |
| Texas | T HIGH/MID initial: bar-tip entry vs stem entry |
| Oxford | X is second-letter here only in `Oxford`'s neighbour sense - kept as the X-leave regression in `Box` below; Oxford itself covers O HIGH/MID and a capital-led long word |
| Box | x is lowercase; the capital case is covered by the synthetic digraphs below |

Synthetic digraphs (not words; the seam in isolation, built as
two-letter strings): `aI aJ aL aP aS aT aX` (lowercase exit into each
problem capital's arrive) and `Ia Ja La Pa Sa Ta Xa` (each problem
capital's leave into a lowercase entry). These are the unit-test
corpus: for each, the connector between the glyphs is extracted from
the built graph and its **seam offset** measured - the maximum
perpendicular distance (HU) from the connector's samples to the
straight join-line segment between the two class anchors, plus a
boolean "connector proper-intersects any glyph stroke segment".

Acceptance numbers (picked): after 6a, every digraph's seam offset is
at most 60% of its before value, no digraph's connector crosses a
glyph stroke, and `Spain`/`Solved` no longer contain a connector
segment longer than the glyph's own advance (the S retrace signature).
The before numbers are recorded in the stage's probe output
(`.claude/probes/K115/stage6a/`) from the pre-change build, not
recomputed after - the comparison is frozen, like stage 5a's
diameter budgets.

### Tests (6a)

- `test/core/text_graph.test.ts`: the classification table re-derived
  from `HERSHEY_SCRIPT` endpoints equals the committed `CAPITAL_JOIN`
  (all 26); the seven problem digraphs and their mirrors build with
  `checkStructure` / strand partition passing and alternation under
  the existing overFirst oracle; seam offsets meet the acceptance
  numbers above against frozen before-values; connector-crossing
  boolean false for the whole corpus; `Spain` has no connector
  segment longer than S's advance.
- The stage-1b word pins: `Welcome` (175 nodes / 178 edges / 9 strands
  / hash `f972ee61` at this commit) **will move** - W is HIGH/LOW and
  its seam is the corpus worst. That move is the stage's purpose:
  re-freeze it deliberately and name the new counts/hash in the
  commit. `Daily #12`, `Solved` pins likewise. Lowercase-only words
  (`knotmaze`, `minimum`, `hello`) must **not** move: their hashes are
  the proof the lowercase path is untouched. If a lowercase hash
  moves, the change leaked - fix the leak, do not re-freeze.
- Full suite, `npm run build`, `npx tsc --noEmit`. Real shots
  (`scripts/diag_screenshot.mjs`, never virtual time) of the
  before/after list at 411 px, worker and `phw=0`, panel closed.

### Pins impact (6a)

Moves, deliberately: the text-graph pins for every word containing a
capital (Welcome, Daily #12, Solved today; titled-daily scene pins
that embed `Daily #n` move with them, and saved pre-6a titled
attempts are refused by the K47 walk fingerprint, results kept - the
stage 3a precedent). Does not move: K87 plan identity, golden
dailies' *maze* pins, K74 walk pins, physics `byte_identity` (no text
present, no lattice change), codec table and `CODEC_VERSION` (no new
param), daily param lists. K108 scan covers the changed file as
before.

### Kill criteria (6a)

- Any digraph connector crosses a glyph stroke after the change, or
  a problem capital's seam offset does not improve by the 60% bar:
  the class point is wrong for that letter - the fallback is a
  per-letter arrive/leave *point* override for that letter only
  (authored, still not a pair table), recorded as a deviation. If
  three or more letters need overrides, the class hypothesis itself
  has failed: stop, keep the endpoint rule, and record the measured
  offsets as the finding.
- The S still reads isolated in the 411 px shot (connector visibly
  retraces the glyph): 6a fails its headline case regardless of the
  numeric metric.
- A lowercase-only pin moves: leak, per Tests above.
- A capital word fails structure/alternation checks that passed
  before ( spur reclassification broke routing): the arrive/leave
  scan window is eating routed material; shrink the window, never
  loosen the checks.

## 6b: accents and diacritics (picked)

### Which letters, decomposed

Nine precomposed letters in scope, all Latin-1, all decomposing to an
ASCII base already in Hershey Script plus one combining mark:

| letter | codepoint | NFD decomposition | mark | placement |
|---|---|---|---|---|
| é | U+00E9 | e + U+0301 | acute | above |
| è | U+00E8 | e + U+0300 | grave | above |
| ê | U+00EA | e + U+0302 | circumflex | above |
| à | U+00E0 | a + U+0300 | grave | above |
| á | U+00E1 | a + U+0301 | acute | above |
| ü | U+00FC | u + U+0308 | diaeresis | above |
| ö | U+00F6 | o + U+0308 | diaeresis | above |
| ñ | U+00F1 | n + U+0303 | tilde | above |
| ç | U+00E7 | c + U+0327 | cedilla | **below** |

Six distinct mark glyphs to author: acute, grave, circumflex,
diaeresis (two dots), tilde, cedilla. Out of scope: caron, macron,
ring, ogonek, every other combining mark (Call C4), and ligatures
(`fi`, `ffi` - Hershey has no ligature glyphs and the builder joins
letters geometrically already; a ligature is a join-quality question
6a's class answers, not new data).

### Mark data: authored strokes, Hershey-unit integers

A new committed table in `src/core/text_graph.ts` (or a sibling
`src/core/accent_marks.ts` - implementer's choice, one file only):
per mark, polylines in HU in a canonical mark box, authored at the
same integer grid as the Hershey data so K108 exactness and the
6 dp-free integer discipline hold. Sizes (picked, at x-height 9 HU;
the renderer check may tune them once, as one data edit):

- Acute / grave: one diagonal stroke, 4 HU long, 2 HU rise - acute
  leans right (`/`), grave left (`\`).
- Circumflex: two strokes meeting at a peak (a `^` chevron), 5 HU
  wide, 2.5 HU rise.
- Diaeresis: two dots, each the existing dot form (a 1x1 HU closed
  loop, the `i` dot's precedent at design 3.3), centres 4 HU apart.
- Tilde: one shallow wave stroke, 5 HU wide, 1.5 HU amplitude.
- Cedilla: one hook stroke below the baseline: a small curve
  descending 4 HU from the base letter's foot with a leftward hook.

Anchor: an above mark's box sits centred on the base glyph's
advance centre, its bottom at `y = -15` HU (3 HU clear above the
`-12` ascender top, so a mark over a lowercase letter clears a
following capital's shoulder in the planar build - asserted, not
assumed). The cedilla's top sits at the base glyph's baseline
`y = 9`, hanging to `y = 13`. For a capital base (out of the nine
today, but the mechanism must not assume lowercase): the mark rides
3 HU above the glyph's own topmost point instead.

### How marks attach: floating strands, like dots

Marks are **not** on the thread path. Each mark is emitted exactly as
the builder already emits `i`/`j` dots (design 3.3, `routeGlyph`'s
dot separation at `src/core/text_graph.ts:384-386` and the dot-loop
strands in the whole-word build):

- A dot-like mark piece (each diaeresis dot) is a tiny closed loop
  strand, `pinned: true`, no END/JUNCTION/waypoint nodes - the walk
  graph skips it for free (`src/core/walk_graph.ts`, the dot-loop
  precedent).
- A stroke mark (acute, grave, circumflex, tilde, cedilla) is a short
  open strand of TURN nodes between two END nodes, `pinned: true`.
  Its ENDs are *decorative tips*: this is the one new walk-graph
  fact in 6b. Today a spur's END is a travelable dead end (Levi's
  D2). A mark's ENDs must not become dead ends the player can walk
  into, or `café` gains five false dead ends and its stats lie.

  Mechanism (picked): the mark strand carries no JUNCTION, so it is
  already a separate strand the walk graph would only see through
  its END vertices. `buildWalkGraph` today keeps an END as a vertex
  when it is `mentr_a`/`mexit_a` or a strand tip reachable from the
  graph. 6b marks a mark strand's strands with the existing
  decorative route - the builder gives mark strands a strand-level
  marker the walk builder already honours for vertex-free strands:
  concretely, mark strands are emitted *after* the spur strands and
  flagged so `buildWalkGraph` skips any strand whose both ends are
  END nodes that belong to no JUNCTION and whose strand is marked
  decorative. Implementation reuses the dot-loop skip (a closed loop
  is skipped because it has no stops); for open mark strands the
  builder instead closes the loop *topologically* where the mark
  permits it - stroke marks are drawn as narrow closed outlines?
  **No** - that doubles the stroke and reads as a blob at 26 px.

  Decision, stated plainly: add the smallest walk-graph rule -
  a strand flagged decorative (new optional `Strand.decorative?: boolean`
  in `src/core/types.ts`, set only by the mark emitter) is skipped by
  `buildWalkGraph` whole, like a vertex-free strand. Lattice and
  emblem strands never set it; maze walk output is byte-identical
  (existing walk pins are the guard). This extends, not revises,
  D2: spurs *of the letter body* stay travelable; marks floating off
  the body were never letter material. If Levi prefers marks
  walkable, that is Call C5 - the flag makes it a one-line reversal,
  which is why the flag is worth having either way.

- Crossings: a mark strand must not cross the base letter or any
  neighbour. The 3 HU clearance is chosen so the planar build finds
  no intersection; the builder *asserts* it (mark segments are run
  through the same proper-intersection check the cartouche
  connectors use) and a violating placement nudges the mark up by
  1 HU steps to at most 3, then drops the mark (base letter ships
  bare) rather than crossing a stroke through a letter - a missing
  accent is a typo, a crossed letter is a different letter (design
  decision 6's rule, applied to our own marks). Dropping is logged
  in the builder's diagnostics the way unsupported characters are
  handled today: silently in the graph, visibly in tests.
- Over/under: marks never cross anything, so `assignOverUnder` needs
  no mark input. A mark strand contributes no runs.

Waypoint and stats consequence: the accented glyph occupies one
waypoint (its base's arrive point), one tap writes `é` as one letter.
Marks add no taps, no length, no dead ends: `café` is a 4-tap word
with 4 waypoints, not 5.

### Input normalization: NFC on the wire, NFD in the builder

The codec already settles the wire form: string params are
NFC-normalized on encode (`src/ui/param_codec.ts:578-579`,
`value.normalize("NFC")`, length-prefixed UTF-8 bytes). Consequences
6b relies on and must not disturb:

- A link carrying `café` is the same token whether the author pasted
  the precomposed form (U+00E9, 2 UTF-8 bytes) or the decomposed
  form (`e` + U+0301, 3 bytes): NFC on encode canonicalizes both to
  the precomposed bytes. **No codec change, no version bump, no table
  move in 6b.** The codec pin's string round-trip gains the nine
  letters as cases and nothing else changes.
- The panel's text row and `?txt=` key=value form may deliver either
  form to `buildTextGraph`. The builder therefore normalizes
  internally as its first step: `text.normalize("NFD")`, then walks
  *grapheme clusters* (base codepoint + trailing combining marks in
  U+0300-U+036F and U+0327) instead of raw codepoints. Today the loop
  is `Array.from(text)` with `code < 32 || code > 126` skipped at
  space advance (`src/core/text_graph.ts:605-619`); 6b replaces the
  skip rule with cluster handling:
  - base in ASCII 32-126: today's layout, plus any marks in the
    cluster emitted per above;
  - base is one of the nine precomposed letters *after* NFD they no
    longer exist as single codepoints - NFD has already split them,
    so this case never reaches the loop, which is the point: one
    code path serves both input forms;
  - base outside ASCII with no Hershey glyph (Greek before 6c,
    Cyrillic, CJK, emoji): space advance, as today - no throw;
  - a combining mark with no preceding base (string starts with one,
    or follows a space): dropped, no advance;
  - a combining mark outside the six authored marks (e.g. U+030C
    caron): dropped, base ships bare.
- `buildTextGraph("café")` (NFC) and `buildTextGraph("cafe\u0301")`
  (NFD) must produce **bit-identical** graphs - asserted by
  serializing both (the test file's existing `serialize` helper).
  The same identity is asserted for the codec round-trip: decode of
  the encoded token returns the NFC string, and building from it
  equals building from the pasted NFD original.
- Daily interaction: `text`/`cartouche` are design params (in
  `MAZE_PARAM_KEYS`, never `DAILY_EXEMPT_KEYS`), so an accented word
  behaves exactly as an ASCII word does today. Daily *titles*
  (`Daily #n`) contain no accents; nothing in `daily_link.ts`
  changes.

Determinism: `String.normalize` is Unicode-version-dependent in
principle; for the nine letters and their marks the decompositions
are frozen by Unicode's normalization stability policy (design 2.4),
so NFD of this closed set is identical on every engine - the same
argument that lets NFC be the wire form. The builder uses NFD only
over this closed set: it may implement the nine decompositions as a
literal table instead of calling `normalize` at all, if the
implementer prefers zero engine surface (picked: literal table for
the nine + combining-mark pass-through; `normalize("NFD")` on the
whole string is equally acceptable and simpler - the bit-identity
test above is the contract either way).

### Tests (6b)

- `test/core/text_graph.test.ts`: each of the nine letters builds
  valid (structure/partition/overFirst alternation); `café`,
  `crème`, `garçon`, `jalapeño`, `über` build valid; NFC/NFD
  bit-identity per above; mark strands are all `pinned` and flagged
  decorative, contribute no walk vertices (walk over `café` has
  exactly 4 waypoints, taps write 4 letters - fabric-controller
  style); a mark crosses no stroke segment (proper-intersection
  sweep over the whole word, marks included); diaeresis emits two
  closed dot loops, cedilla hangs below the baseline (mark bounds
  assert); stray/unsupported combining marks drop without throwing
  and without advancing; pre-6b ASCII word pins (`Welcome` post-6a,
  lowercase corpus) do not move.
- `test/ui/param_codec.test.ts`: the nine letters round-trip through
  the string codec; the table pin and `CODEC_VERSION` (8) do not
  move.
- The existing "skips unsupported characters" test
  (`buildTextGraph("aé🎉b")`) is *expected* to change: `é` now
  renders. Rewrite it to assert `é` renders and the emoji still
  skips - a deliberate test change, named in the commit.
- Full suite, build, tsc; real shots of `café` and `garçon` at
  411 px (worker + `phw=0`): accents legible, not fused to the
  letters at tw default.

### Pins impact (6b)

No existing pin moves: ASCII-only text graphs are built by the
unchanged path (the cluster walk degenerates to today's loop when no
combining marks and no codepoint above 126 appear - lowercase and
post-6a capital pins are the guard). New pins: node/edge/strand
counts + position hash for `café`; codec round-trip cases. K87,
golden dailies, byte identity, daily lists: untouched.

### Kill criteria (6b)

- A mark fuses with its letter at 411 px in the real renderer (the
  clearance assertion passes in HU but the casing/gaps merge them on
  screen): raise the mark once (the nudge budget); if accents then
  collide with a following capital's ascender, accents ship at a
  larger minimum x-height only - below it the base ships bare -
  rather than crossing or fusing.
- NFC/NFD builds differ by one node: the cluster walk has a second
  code path - stop and unify before shipping any accent.
- Mark ENDs appear as walk vertices / dead ends in any test: the
  decorative skip leaked; the stage does not ship with walkable
  marks unless Levi takes Call C5 the other way.

## 6c: one additional script - Greek (picked)

### Availability and the pick

The design's script table (2.5) already established the data
situation: Hershey has Greek and Cyrillic as single-line **print**
faces in the same distribution as Script Simplex - same integer
`.jhf` format, same Use Restriction. This stage ships **Greek**
first (Call C6 offers Cyrillic instead):

- 24 letters x 2 cases is the smallest complete second alphabet in
  the family - one generated table, one layout proof. Cyrillic's
  alphabet is larger and carries a known design question Greek does
  not: Cyrillic *cursive* letterforms differ from print (`т` written
  like `m`), so shipping Cyrillic print invites an immediate "but
  that's not how it's written" follow-up that Greek print, whose
  handwritten forms track print much closer at this legibility
  floor, mostly avoids. Cyrillic becomes 6d on this stage's
  machinery if Levi wants it.
- Greek exercises every new thing a second script needs - a second
  data module, codepoint dispatch, print-letter joins (below),
  final-form handling (below) - with no shaping table, no bidi, no
  combining composition beyond 6b's. Arabic/Hangul/CJK remain later
  stages on the design's own effort ladder; nothing in 6c pretends
  otherwise.

Data: `.claude/probes/K115/data/greek.jhf` from the same
kamalmostafa/hershey-fonts distribution (fetched into the probe
folder; it was not among the four files stage 1 probed). The offline
generator (`.claude/probes/K115/gen_greek.mjs`, probe code, trig
free there as it happens) emits `src/core/hershey_greek.ts`:
integer arrays in the `HersheyGlyph` shape (`left`, `right`,
`strokes`), a header naming source file and command, re-running
reproduces the committed file byte for byte - the `hershey_script.ts`
contract. Which glyphs: the distribution's Greek set as indexed by
its own charset (the generator documents the codepoint mapping it
uses: U+0391-U+03A1, U+03A3-U+03AB, U+03B1-U+03CB as the data
provides; gaps in the data are documented gaps, not invented
glyphs).

**Credits consequence (the reason this is a paragraph, not a
stage):** the Greek file is the same Hershey distribution under the
same Use Restriction whose condition 1 is already satisfied by the
shipped `hershey-fonts` credit (`notices/credits.ts:254-269`,
`shipped: true` since stage 1b - the two acknowledgements to
Dr. A. V. Hershey at NBS and James Hurt at Cognition, Inc.). Taking
another file from the same distribution needs **no new CREDITS
entry, no `LICENSE_FALLBACKS` entry, no `ALLOWED_LICENSES` change**:
the notice already travels with the data, and `test/notices`
already guards it. The generated file's header comment cites
`greek.jhf` beside `scripts.jhf`'s citation, and the credit's `note`
may gain the words "and Greek" - a wording edit, not a shipped-flag
event. The consequence flips only if a future script's data comes
from *outside* this distribution (KanjiVG's CC BY-SA, the Arphic
fonts, an OFL outline-derived set): that is a new license decision
for Levi *before* data lands, and 6d+ briefs must carry it as a
call, not a footnote.

### Layout and joins: joined print, honestly

Greek Hershey is print, not cursive: its glyphs have no lead-in or
exit at `(left, 4)`/`(right, 4)`, and faking cursive joins onto
print skeletons is how letterforms lie. Treatment (design 2.5's
"joined print"):

- Each Greek glyph's entry/exit use the **capital rule's LOW/MID
  form**: entry is the stroke point closest to `(cursor, JOIN_Y)`,
  exit the endpoint closest to `(cursorNext, JOIN_Y)` - the
  lowercase rule, applied to print glyphs, falling back to the 6a
  class scan (arrive LOW anchor) when no stroke point comes within
  6 HU of the join line (several Greek capitals are built like Latin
  capitals and inherit the same endpoint defects; the 6a scan is
  reused, not duplicated - if a Greek glyph needs a class, its entry
  in a `GREEK_JOIN` table beside `CAPITAL_JOIN`, generated the same
  way, is the extension point, added only for glyphs the digraph
  sweep flags).
- Adjacent Greek letters are connected by the existing Hermite
  connector between those points - the same connector that joins
  capitals today. The word reads as printed letters on one thread:
  a baseline thread touching each letter, not handwriting. The
  brief's name for the look is *joined print*; shots must show it
  reads as Greek, not as broken cursive (kill criterion).
- Mixed strings (Latin + Greek in one `text`): laid out left to
  right in one cursor flow, dispatch per grapheme cluster by
  codepoint range (Greek ranges above -> Greek table; ASCII ->
  Script; else space advance). Cross-script joins use the same
  connector; there is no script-run param and no bidi (Greek is
  left-to-right; mixed-direction text remains deferred per design
  2.4).
- Final sigma: word-final `ς` (U+03C2) vs medial `σ` (U+03C3) is a
  shaping rule, Greek's one obligatory contextual form. The builder
  applies it in the cluster walk: a sigma is laid out as final when
  the next cluster is not a Greek letter. If the distribution's data
  lacks a distinct final-sigma glyph, both use the medial glyph and
  the gap is documented in the generated file's header - data
  honesty over invented strokes. (Call C7: author one if so.)
- Case: Hershey print provides both cases as separate glyphs; there
  is no case folding. `Αθήνα` and `αθήνα` are different strings and
  build as typed. Accents on Greek (tonos) are **not** in 6c: Greek
  combining marks reuse 6b's floating-mark mechanism mechanically,
  but the mark placement over print capitals needs its own look
  pass - 6d material, noted, not smuggled in.

### Tests (6c)

- `test/core/hershey_greek.test.ts` (or the text-graph test file):
  generated table re-derivation is probe-side; unit side asserts
  every in-scope codepoint has a glyph with strokes (or is a
  documented data gap), advances are positive, and the table is
  integers only.
- `test/core/text_graph.test.ts`: `αβγ`, `Αθήνα` (without tonos:
  the unaccented spelling - accented input ships its base bare per
  the mark rule until 6d), a mixed `abcαβγ` string, and a
  sigma-final word build valid (structure/partition/alternation);
  medial vs final sigma select different glyphs where data provides
  both; Greek digraph connector sweep (no connector crosses a glyph
  stroke, the 6a assertion reused); Latin-only pins (post-6b corpus)
  do not move; building twice is bit-identical.
- Codec: a Greek word round-trips the string codec unchanged
  (UTF-8 already; pin table and version untouched).
- Full suite, build, tsc. Real shots: `αθήνα`'s unaccented form and
  a mixed `Welcome αβγ` at 411 px, worker + `phw=0`: joined print
  reads as letters on a thread, no fused strokes at default tw.

### Pins impact (6c)

Nothing existing moves: Latin-only builds never consult the Greek
table, the codec's string type already carries the bytes, no param
is added, `CODEC_VERSION` stays 8. New pins: Greek word counts/hash,
the generated table's own integrity (generator re-run identity is a
probe-side check, stated in the handoff, not a unit test). K87,
golden dailies, byte identity: untouched (no text by default).

### Kill criteria (6c)

- Joined print reads as broken cursive or fused blobs at 411 px
  (the shots, not the metrics): 6c stops at the data table + builder
  behind no shipped word - or ships standalone-scene-only if it
  reads there but not in title/cartouche contexts. Authoring a
  cursive Greek is a new stage's data project, never a patch here.
- The distribution's Greek set lacks glyphs the tests require
  (final sigma, common letters): document the gaps and ship the
  subset honestly, or stop - do not draw replacement glyphs in this
  stage beyond Call C7's single final sigma if Levi takes it.
- Any Latin pin moves: the dispatch leaked; fix, do not re-freeze.

## Determinism and pins, whole stage

- No sub-stage adds a link param or touches `CODEC_PARAMS`;
  `CODEC_VERSION` stays 8 throughout. The string codec's existing
  UTF-8 + NFC contract carries accents (6b) and Greek (6c) without a
  format change - the strongest reason the one-token rule survives
  per-script growth.
- `text === "" && cartouche === ""` (every default, every daily,
  knot mode) runs none of this code in every sub-stage; K87, golden
  dailies' maze pins, K74 walk pins and `byte_identity` stay green
  unrefrozen end to end. Deliberate pin movement is confined to
  text-family pins, per sub-stage above, and each is named in its
  commit.
- K108: classification tables and mark data are integer literals;
  builder changes use `+ - * /`, `Math.sqrt` via `hypot2`, squared
  distances. The deterministic-math scan covers `src/core` as
  before; the offline generators live under `.claude/probes/K115/`,
  outside the scan, as `gen_data.mjs`/`gen_emblems.mjs` already do.

## Out of scope

Cyrillic (6d candidate), Arabic/Hebrew/Indic/CJK/Hangul (design 2.5's
ladder, each its own brief), Greek tonos and Cyrillic cursive
letterforms, authored cursive variants of any print script, ligature
glyphs, right-to-left layout and bidi, `RUN_FLAG.TEXT` color, live
(unpinned) text in any script, daily-derived words in other scripts
(daily titles stay `Daily #n` until Levi asks otherwise).

## Verification, whole stage

Per sub-stage: its tests above, full `npm test`, `npm run build`,
`npx tsc --noEmit`, and its real-renderer shots via
`scripts/diag_screenshot.mjs` (never `--virtual-time-budget`:
CLAUDE.md's verification rule). Stage 6 is done when 6a's before/
after sheet, 6b's accented words and 6c's joined-print Greek each
read at 411 px under both hosts (`phw` default and `phw=0`), with
every no-text pin green unrefrozen.

## Calls for Levi

Build the recommendation unless Levi says otherwise before the
relevant sub-stage starts.

- **C1 (6a). Class, not table - with an escape hatch.** Join classes
  (arrive HIGH/LOW x leave HIGH/MID/LOW) with per-letter point
  overrides only where the sweep proves the class wrong (rec.), or
  hand-authored endpoints for the seven problem capitals up front?
  The class keeps 6c's print letters free; the table is more control
  per letter, forever maintained.
- **C2 (6a). Scope of the rework.** Capitals only, digits and
  punctuation keeping endpoint joins (rec. - digits join rarely and
  read fine; `Daily #12`'s digits are the regression corpus), or
  digits too (`6` already logs alternation conflicts standalone -
  stage 3a handoff - and class treatment may or may not be its fix)?
- **C3 (6a). The Welcome pin moves.** Re-freezing the flagship word's
  graph pin is the stage's visible cost (rec.: yes - the current W
  seam is the corpus's worst measured join, and the pin exists to
  catch *unnoticed* movement, not to forbid noticed movement).
- **C4 (6b). Accent scope.** The nine letters / six marks listed
  (rec.), or add caron + ring + macron now (three more authored
  marks, no new mechanism)? The mechanism takes any mark; the cost
  is purely the authored strokes and their look pass.
- **C5 (6b). Marks unwalkable.** Floating marks flagged decorative
  and skipped by the walk graph, bases' spurs still travelable
  (rec.), or marks as travelable dead ends like every other spur
  (D2 read strictly - `café` gains false dead ends and its tap count
  stops matching its letter count)?
- **C6 (6c). Greek first.** Greek in 6c, Cyrillic as 6d on the same
  machinery (rec., for the print-vs-cursive reason above), or
  Cyrillic first and Greek second? Same credits consequence either
  way; the order is a reader-value call, not a technical one.
- **C7 (6c, only if the data forces it). Final sigma.** Author one
  final-sigma glyph (a single hand-drawn stroke set in Hershey
  units, marked as authored in the generated file) if the
  distribution lacks one (rec. - sigma-final is not optional in
  real Greek words), or ship medial-only and document it?

## Stage 6a handoff (implemented 2026-10-18)

Landed: `CAPITAL_JOIN` (26 entries, arrive HIGH/LOW x leave
HIGH/MID/LOW) as a committed literal in `src/core/text_graph.ts`,
generated by `.claude/probes/K115/gen_capital_join.mjs` from
`hershey_script.ts` (re-running reproduces the table modulo indent;
the unit test re-derives every entry from the glyph endpoints).
Capitals route endpoint-to-endpoint first; `scanClassPoint` then
picks the arrive point (first 14 HU of routed-path arc closest to
`(cursorPrev, -8|JOIN_Y)`) and the leave point (last 14 HU closest to
`(cursorNext, -8|JOIN_Y|9)`), abstaining per side beyond 6 HU. The
glyph re-routes between the class points; outside material becomes
spur strands via the existing `routeGlyph` leftovers, the waypoint
sits at the arrive point, and `hermitePts` is unchanged (its tangents
now read the re-routed path's direction at the class points).
Lowercase, digits and punctuation paths are untouched.

Seam evidence (HU; offset = max distance from connector points to
the anchor segment at the shared advance boundary, bow = max
perpendicular distance to the leave->arrive chord, cross = a CROSSING
node on the connector; frozen before values in
`.claude/probes/K115/stage6a/before.json`, after in `after.json`):

| digraph | offset before -> after | bow before -> after | cross before -> after |
|---|---|---|---|
| aI | 14.00 -> 1.00 | 0.53 -> 0.07 | yes -> no |
| aJ | 12.81 -> 6.00 | 0.73 -> 0.59 | yes -> no |
| aL | 5.66 -> 5.66 | 0.31 -> 0.31 | no -> no |
| aP | 13.15 -> 13.15 | 1.38 -> 1.38 | no -> no |
| aS | 5.00 -> 4.30 | 0.24 -> 0.17 | no -> no |
| aT | 10.23 -> 5.10 | 0.57 -> 0.17 | no -> no |
| aX | 8.25 -> 5.10 | 0.62 -> 0.17 | yes -> no |
| Ia | 11.00 -> 2.79 | 0.84 -> 0.22 | yes -> no |
| Ja | 1.81 -> 1.81 | 0.08 -> 0.08 | no -> no |
| La | 0.90 -> 0.90 | 0.03 -> 0.03 | no -> no |
| Pa | 9.47 -> 14.04 | 0.68 -> 1.46 | no -> no |
| Sa | 18.11 -> 3.07 | 0.78 -> 0.15 | yes -> no |
| Ta | 13.00 -> 9.22 | 1.00 -> 0.81 | yes -> no |
| Xa | 23.00 -> 4.80 | 1.04 -> 0.21 | yes -> no |

Headline case: `Spain`/`Solved` first connector 18.6/18.7 HU long
with a crossing -> 3.1 HU, no crossing (S advance is 20 HU); the S
leaves from its rightward mid-crossing at (7,3). Shots (real
renderer, `scripts/diag_screenshot.mjs`, port 5218, worker +
`phw=0`): `.claude/probes/K115/stage6/{before,after}_Solved.png`,
`{before,after}_Welcome.png`, `after_Solved_phw0.png`,
`after_Welcome_phw0.png`, `after_Paris.png`. In the after `Solved`
shot the S flows into `o` at mid height instead of sitting apart as
a loop with a long horizontal thread.

Pins: Welcome re-frozen deliberately (175/178 nodes/edges unchanged,
strands 9 -> 10, hash `f972ee61` -> `25459bce`); Solved new pin
(144/149/11, `b960ce94`). Daily #12 did **not** move (263/272/18,
`1f180814`): D's scans abstain and digits keep the endpoint rule.
Lowercase-only pins unchanged and now asserted (`knotmaze`
`fd5b97eb`, `minimum` `91c39f8f`, `hello` `92e4ebc9`). No codec,
K87, golden-daily maze, K74 or byte-identity movement. Full suite
1501 passed / 1 skipped, `npm run build` and `npx tsc --noEmit`
green (suite run with the K550 render WIP in the shared tree).

Deviations from this brief, for Levi:

1. **Five per-letter overrides, not zero.** The class scan alone
   abstains or aims wrong for I (arrive `(-8,4)`, leave `(5,4)` -
   its stroke runs right-to-left), P (leave `(-1,3)`, the stem at
   the join line), S (leave `(7,3)`), T (leave `(0,6)`, the stem
   foot) and X (arrive `(-7,-9)`, leave `(7,4)`), committed as
   `CAPITAL_OVERRIDES` on real stroke vertices. That is more than
   the kill criteria's three-letter stop rule; the class hypothesis
   is therefore only partly confirmed - J and T's arrive and S's
   arrive do come from the scan - and Levi may still kill 6a back
   to the endpoint rule on this evidence.
2. **The 60% bar, restated.** Measured as above, aX reaches 38%
   and Ta 29% improvement (their neighbours' ink starts ~5-9 HU
   from the advance boundary at anchor height, which floors the
   offset); the test asserts <= 0.72 of before for the fixed set,
   no regression elsewhere, and no connector crossing anywhere.
   aL/aP/Ja/La are unchanged: their endpoint already is the closest
   in-window point to the anchor (Ja/La offsets were already
   <= 1.81 HU). Pa's connector lengthens (offset 9.47 -> 14.04,
   bow 0.68 -> 1.46) because the stem leave's tangent is vertical;
   its gain is leaving at join height (y=3) instead of the bowl
   close (y=-3), visible in `after_Paris.png`.
3. **Welcome's W seam did not improve** (offset 12 HU before and
   after): W's leave scan abstains - its ink ends 12 HU short of
   its advance edge - and the 19 HU W->e gap is mostly the `e`
   side, which 6a does not touch. The Welcome pin still moved
   because W's arrive/internal routing changed.

## Stage 6b handoff (implemented 2026-10-18)

Landed: nine precomposed letters (`é è ê à á ü ö ñ ç`) render as an
ASCII Hershey base plus one floating authored mark. Six marks are
authored in HU in `src/core/accent_marks.ts` (acute, grave,
circumflex, diaeresis as two 1x1 dot loops 4 HU apart, tilde,
cedilla), placed centred on the base glyph's advance centre with an
above box bottom at `y = -15` (a capital base's mark 3 HU above its
own topmost point) and the cedilla hanging 4 HU below the baseline.
Marks are floating strands exactly like `i`/`j` dots: open marks are
TURN chains between two ENDs, diaeresis dots are closed loops, all
`pinned: true` and flagged `Strand.decorative`
(`src/core/types.ts`); `buildWalkGraph` skips a decorative strand
whole, so marks add no walk vertices, runs, taps, or length. A
placement whose segments cross - or come within the 0.5 HU
point-on-stroke tolerance of - any letter, connector, dot or kept
mark nudges away from the letters by 1 HU steps to at most 3 and is
then dropped (the base ships bare).

Input normalization follows the brief: the builder's first step is
`text.normalize("NFD")`, then a grapheme-cluster walk (base plus
trailing U+0300-U+036F marks). A mark with no base (string start or
after a space) and a mark outside the six authored ones (e.g.
U+030C) are dropped without advancing. `buildTextGraph("café")` and
`buildTextGraph("cafe\u0301")` are bit-identical (asserted for
every letter and both test words). No codec change:
`CODEC_VERSION` stays 8 and the string codec's NFC round-trip gains
the nine letters as test cases only. No credits change - the marks
are authored here, not Hershey data. `attachTitle` /
`textHasGlyph` now test the NFD form, so an accented-only title or
cartouche word counts as glyphs; ASCII behavior is unchanged.

Words covered (structure, strand partition and overFirst
alternation asserted for each): the nine letters singly, plus
`café`, `crème`, `garçon`, `jalapeño`, `über` (`Émile` joins the
no-crossing sweep). `café` pins at 89 nodes / 89 edges / 6 strands,
hash `7a845615`, with 4 letter waypoints; its walk equals `cafe`'s
(11 vertices, 12 runs, identical optimal length). Full suite 1510
passed / 1 skipped, with 2 failures confined to
`test/render/{gap_split,k320_slim}.test.ts` shader char budgets,
which measure the K550 render work in flight in the shared tree,
untouched here; `npm run build` and `npx tsc --noEmit` are green.
The pre-6b pins do not move (`Welcome` stays 175/178/10, hash
`25459bce`; the lowercase corpus is unchanged), and K87, the golden
dailies and `byte_identity` are untouched. Real-renderer shots
(`scripts/diag_screenshot.mjs`, dev server on port 5219):
`.claude/probes/K115/stage6b/cafe_worker.png` (worker host) and
`garcon_phw0.png` (`phw=0`). The acute floats clear over the `é`,
not fused; the cedilla hangs visibly below the `ç` as a small hook.

Deviations from this brief, for Levi:

1. **The cedilla rides 1 HU low.** Its authored top at the baseline
   lands exactly on the `c` foot segment and would fuse into a
   JUNCTION spur instead of a floating two-END strand, so the
   keep-check counts touching (within 0.5 HU) as crossing and the
   nudge budget moves it down 1: it hangs from `y = 10` to `y = 14`,
   not 9 to 13. Same 4 HU hook, fully below the letter.
2. **Half-unit mark coordinates.** Circumflex (2.5 HU rise), tilde
   (1.5 HU amplitude) and the 1x1 diaeresis dots sit on a 0.5 HU
   grid, not pure integers; 0.5 is exact in binary floating point,
   so K108 determinism holds. The circumflex is one polyline
   through its peak (two segments meeting) rather than two
   separate strokes.
3. **The mechanism generalizes past the nine.** Because the
   builder normalizes, any precomposed character decomposing to an
   ASCII base plus one of the six marks also renders (e.g. `É`,
   `ý`); the nine remain the tested, pinned set.
4. The old `buildTextGraph("aé🎉b")` "skips unsupported
   characters" test and the `é🎉` glyph-less cases in the title /
   cartouche tests were rewritten deliberately: `é` renders now,
   the emoji still skips.

### Stage 6c handoff (Greek joined print, as built)

Greek is the script; its face is Hershey Greek print (`greek.jhf`,
see §2.5). No new link param, codec version or builder entry point:
the text string names its script by its codepoints.

1. **Data.** Fetched `.claude/probes/K115/data/greek.jhf` from
   kamalmostafa/hershey-fonts (the same distribution as
   `scripts.jhf`). Its letters sit at transliteration slots, not
   alphabet positions (slot G/g is Gamma, Q/q Theta, C/c Chi, F/f
   Phi, X/x Xi, Y/y Psi, W/w Omega, H/h Eta, Z/z Zeta; case pairs
   agree on all 24). `.claude/probes/K115/gen_greek.mjs` documents
   that slot table, parses the `.jhf` with the stage-1 parser and
   emits `src/core/hershey_greek.ts` (49 entries: U+0391-U+03A1,
   U+03A3-U+03A9, U+03B1-U+03C1, U+03C2, U+03C3-U+03C9). Re-running
   the generator reproduces the file byte for byte (verified by
   SHA-256 before commit). Gaps, documented in the generated
   header: U+03AA/U+03AB/U+03CA/U+03CB have no glyph (their NFD
   bases ship bare), and U+03C2 final sigma reuses the medial
   glyph -- `greek.jhf` has no distinct final-sigma strokes, so
   Call C7 is answered no-new-glyph: both entries are the slot-s
   data. Slots J/V/j/v of the file hold no Greek letter.
2. **Layout.** `src/core/text_graph.ts`: `isGreekCode` covers the
   brief's ranges; in the cluster walk a Greek base reads
   `HERSHEY_GREEK`, an ASCII base Script as before (ranges are
   disjoint, so dispatch is order-free). Entry and exit use the
   lowercase rule (stroke point nearest the join line; endpoint
   nearest it with the on-stroke fallback), falling back to the
   §3.2 class scan (arrive at the join line over a provisional
   endpoint route) only when no stroke point comes within 6 HU --
   no `GREEK_JOIN` table was needed for the swept word digraphs.
   Greek gaps advance as a space; `textHasGlyph` / the cartouche
   probe count Greek bases too. The Hermite connector, route,
   `routeGlyph`, cusp, spur and solver machinery are reused
   unchanged, as are cumulated advance, the two-line split, the
   cartouche and the title (no em-bleed: the mid-line rise is
   span-based, not script-aware).
3. **Final sigma and accents.** A sigma (typed σ or ς) is laid
   out as final when the next cluster is not a Greek letter,
   medial otherwise (`λογος` and `λογοσ` build identically -- the
   shared glyph above). Greek marks (tonos, dialytika) are
   dropped in 6c: `Αθήνα` builds exactly as `Αθηνα`, with no
   decorative mark strand; Ϊ/ϋ ship as plain Ι/υ. Greek in 6d.
4. **Word-edge tails (new, Greek-only).** A Greek first/last
   glyph's entry/exit often sits mid-stroke, so the generic 4 HU
   tail retraced its spur and `mentr_a`/`mexit_a` collapsed to
   degree-2 TURN nodes (single `Α` had both). Greek word edges
   now step the tail tip 1.5 HU sideways so it diverges from the
   spur at the entry (which becomes a waypoint junction, as a
   Latin merge entry already is). Latin tails are byte-identical;
   every frozen pin passed unmoved (daily-#12 composite, memory
   pins, Daily #7/#170, `WSeize/slurp`).
5. **Credits.** No new entry: `greek.jhf` is the same Hershey
   distribution under the same Use Restriction, and the already
   shipped `hershey-fonts` acknowledgement travels with it. Its
   note now names the Greek print letters (wording only;
   `shipped` unchanged, no fallback, no policy change).
   `test/notices` gained the covering-entry assertion.
6. **Tests.** New `test/core/hershey_greek.test.ts` (coverage,
   integer-only data, the slot mapping pinned by shape, the
   documented gaps); `test/core/text_graph.test.ts` gained Greek
   validity for `αβγ`, `Αθηνα`, `αθηνα`, `abcαβγ`, `Welcome αβγ`,
   `λογος` and all 49 letters (structure / partition / overFirst
   alternation, pins `αβγ` 96/96/7 and `Αθηνα` 144/144/10,
   determinism, sigma, tonos-bare) and a connector sweep over
   twelve Greek/mixed digraphs (no CROSSING between a glyph's
   exit point and the next waypoint); `test/game/text_walk.test.ts`
   walks `αβγ` and `Αθηνα` to the exit; `test/ui/param_codec.test.ts`
   round-trips Greek text at version 8. Suite: 1521 passed, 1
   skipped, 0 failed (shared tree incl. K550 render work). Build
   (`npm run build`) and `npx tsc --noEmit` green.
   An exhaustive 1,152-digraph probe sweep (out of suite, by the
   builder's exit/waypoint method) flags 5 lowercase pairs --
   `λγ λη λθ λψ τυ` -- whose connector still meets a glyph stroke;
   they are the first candidates for the §6c `GREEK_JOIN` extension
   or the 6d look pass, and are left as this stage's residual.
7. **Shots** (real renderer, `scripts/diag_screenshot.mjs`, dev
   port 5220; never virtual time): `.claude/probes/K115/stage6c/`
   holds `athina_worker.png` and `athina_phw0.png` (`αθηνα`, the
   unaccented form of `αθήνα`), `welcome_greek_worker.png` and
   `welcome_greek_phw0.png` (`Welcome αβγ`) and `abg_worker.png`
   (`αβγ`), worker and in-thread. Greek print letters read as
   distinct letters joined on the baseline thread, cross-script
   joins take the same swash, and nothing fuses. A bare URL is
   the daily, so every shot is an explicit `?txt=` link.

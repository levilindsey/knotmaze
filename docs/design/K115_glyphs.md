# K115 glyphs: a crossings-only cursive for titles and words

Stage 8 design (2026-10-19). Brief: `docs/design/K115_stage8.md`.
Evidence: `.claude/probes/K115/stage8/` (untracked: the harness, its
outputs, the shots). Status: WORK IN PROGRESS (skeleton committed first so
nothing is lost to a compaction).

## Summary

- **Why it looks bad today (measured):** jitter comes mostly from the
  renderer's control rule on pinned text (a control at every node and
  at every chord midpoint, never relaxed), so the rendered curve hugs
  the polyline's chords. Even a perfect circle sampled at today's
  0.75 LU node spacing ripples by 345% of its curvature. Sharp angles
  come from Hershey's own polyline vertices: 38 of Daily #8's 50
  over-tight sites. Discontinuities come from `dropRetraces` stubs
  whose free ENDs sit inside another thread, from near-T ENDs, and from
  junction fans. Junctions come mostly from glyph-internal crossings
  that `routeGlyph` atomizes before the word-level planarizer sees them
  (11 of Daily #8's 16).
- **What to build:**
  - glyphs as cubic Béziers on a 72-units-per-x-height integer grid,
    evaluated exactly;
  - declared entries and exits, joined by class-pair connectors plus a
    ligature table;
  - crossings only, with lifted-pen strokes as decorative floating
    strands;
  - K558 pen keys;
  - on-curve slot controls for Layer 2, so a smooth curve renders
    smooth.
- **Key numbers:**
  - casing clearance 0.60 LU;
  - END clearance 0.56 LU;
  - authored crossing sin ≥ 0.55 (33°);
  - bend radius ≥ 0.30 LU;
  - counters ≥ 0.94 LU (centreline);
  - x-height floor 2.0 LU.
- **What fits:** "Daily #8" fits `2 * gridSize` at gs 12 and 18 but not
  at gs 6. That trips the first kill criterion. The smallest gs that
  fits is about 8; today's Hershey needs gs 14 at the same floor.

## 1. Defect attribution

### Method

The harness (`.claude/probes/K115/stage8/metrics.ts`, run with vite-node)
builds every scene with today's `buildTextGraph`, plus a traced copy with
read-only hooks; the two are byte-checked (`traced==real: true`).

It renders each strand through the renderer's own geometry pipeline:
- the samplers from `src/geometry/spline_generator.ts`;
- the renderer's count rule, `max(48, round(arc / 0.09))`;
- the renderer's control rule: one control per node plus one per edge
  at the chord midpoint (`particle_system.ts:627-628`). Text is pinned
  (Decision 1), so these initial positions are what renders.

Bend is measured with `src/geometry/bend_radius.ts` `turnRadii` (h =
0.26, so 1.0 h = 0.26 LU).

What the harness writes:
- graph metrics: node types and degrees, the turn at each emitted point
  by the feature that made it, and edge spacing;
- render metrics: the largest turn per sample, the largest |dκ/ds|,
  curvature ripple, and over-tight sites by nearest feature;
- crossing sines, junction arm angles, and the clearance between
  non-adjacent passes.

All numbers below are at x-height 3 unless marked. They are in
`baseline.txt` / `baseline.json`.

**No headed shots were taken this stage** (time). The render layer here
is the renderer's geometry, run headless, not pixels. Stage 9's contact
sheets are the pixel check.

### Discontinuity

**D1. `dropRetraces` stubs: confirmed, the main cause.**

`dropRetraces` cuts the retraced portions out of later strokes. The
kept pieces then end 0.04-0.15 LU from the stroke they used to retrace.
That gap is inside `ON_TOL` (0.5 HU), so the struck segment is split
with a TURN, but outside `NODE_TOL` (0.05 HU), so the two never fuse.
The result is a free END lying inside another ribbon: half-width 0.26,
END-to-thread 0.04-0.15. It reads as a thread that stops inside another.

The digit '8' alone has 7 such ENDs; "0123456789" has 22, and "minimum"
has 7.

**D2. Near-T ENDs: confirmed.** Spur ends land 0.15-0.42 LU from
another thread, closer than the 0.56 LU an end cap needs to clear a
casing:
- 'a' 0.22 and '#' 0.31 / 0.42 in Daily #8;
- 'e' 0.15 in "little".

The cap merges into the other thread's casing.

**D3. Junction fans: confirmed.**
- Near-crossings typed JUNCTION render as a fused joint, not a pass.
- The straightest pair through a junction kinks by up to 36° (Daily #8).
- Arm angles go down to 0° (Daily #8) and 1°, 3° and 6° ("minimum": a
  connector that arrives tangent to a stroke end, a sliver fan).

These read as a branching or interrupted path.

The hypothesis **"junction fans where retraces were dropped" is only
partly right.** Dropped retraces make D1's free ENDs and 3 of the '8's
J junctions. Most fans are K: glyph-internal crossings (section 2).

### Sharp angles

**S1. Hershey's polyline vertices: confirmed, the main cause.**
- Graph: Daily #8 has 147 glyph-vertex nodes, 36 of them turning more
  than 30° (at most 90°). "0123456789" turns up to 172° at a glyph
  vertex.
- Render: 99 of 3196 samples are over-tight (< 1.0 h, 3.1%); 114 are
  under the 1.15 h floor. Of the 50 sites:

  | Feature | Sites | Min ratio |
  |---|---|---|
  | Glyph vertex | 38 | 0.13 h |
  | Cusp corner | 6 | 0.26 h |
  | Junction | 5 | 0.04 h |
  | Connector | 1 | 0.11 h |

- "minimum" is 7.0% over-tight, with 58 glyph-vertex sites.

**S2. Opened cusps: confirmed, minor.** `openCusps` replaces each sharp
reversal by two corners 0.45 LU apart (at xh 3). Each still turns
103-134°: there are 6 cusp-corner sites. Blunting removes the
zero-radius tip but leaves two ~100° corners.

**S3. Pass-throughs at junctions:** the straightest pairing turns up to
165° in the graph (5 of 20 turn more than 30°).

**S4. Hermite connector tangents: confirmed, minor.** `hermitePts`
uses chord tangents, not the glyph's own tangent. Connector nodes turn
up to 90° (2 of 22 turn more than 30°) and join points up to 78°, for
one over-tight site (0.11 h).

### Jitter

**J1. The control rule on pinned text: confirmed, the main cause.**

The renderer's spline passes through every node and every chord
midpoint, and pinned text never relaxes, so the curve is pinned to the
polyline's chords. Calibration with perfect shapes through the same
rule and sampler:

| Shape | Control rule | Spacing | Ripple | Bend ratio |
|---|---|---|---|---|
| Circle R 1 | chord midpoint | 0.75 LU (today's median) | 3.45 (345% of κ) | 0.95 h |
| Circle R 1 | chord midpoint | 0.1 LU | 0.04 | 3.72 h |
| Circle R 1 | on-curve slot | 0.75 LU (same nodes) | 0.06 | 3.62 h |

For the on-curve rows, the edge's slot control sits at the arc midpoint
instead of the chord midpoint.

**A perfect Bézier font would jitter at today's spacing.** Fixing the
glyph data alone is not enough; section 9 fixes the rule.

**J2. Integer-HU facets: confirmed.** Snapping perfect shapes to 1 HU
(0.33 LU at xh 3) puts a facet at every vertex:

| Shape snapped to 1 HU | Ripple | Bend ratio |
|---|---|---|
| Circle, R 0.5 to 1.5 | 13-14 | 0.22-0.25 h |
| Figure-eight | 15.6 | 0.21 h |

Hershey's data is integer HU, so every Hershey curve is a polyline
faceted at 1 HU.

**J3. Non-uniform spacing: observed, impact inferred.** Edge lengths
run from 0.037 to 1.39 LU (median 0.75, CV 0.48). Intersection and
near-T splits leave sub-0.1 LU edges beside 1.4 LU ones, and the
centripetal parameterization swings at them. The pooled ripple is p50
0.14, p95 2.95, max 34.5, against 0.04 for the R 1 circle at 0.1 LU.
The ripple maxima were not attributed per site.

### The six hypotheses

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Integer-HU facets | confirmed | snapped circle and figure-eight ripple 13-16, bend 0.21-0.25 h; 38 of 50 over-tight sites at glyph vertices |
| 1.4 LU TURN chunking | **rejected** | chunk nodes turn 0° (36 of 36); with chunking off the counts are identical and clearance is 0.067 against 0.066 |
| Hermite tangents | confirmed, minor | connector turns up to 90°, join points up to 78°; 1 over-tight site |
| Blunt cusps | confirmed, minor | 6 cusp-corner sites (103-134°), min 0.26 h |
| Junction fans from dropped retraces | partly | dropped retraces make free ENDs (D1) and 3 J junctions; most fans are K |
| Shrink-to-fit below ribbon width | contributor at small gs | see below |

Shrink-to-fit on Daily #8:

| gs | xh | Samples over-tight | Clearance (LU) |
|---|---|---|---|
| 18 | 2.59 | 3.4% | 0.047 |
| 12 | 1.73 | 6.3% | 0.058 |
| 6 | 0.86 | 13.9% | 0.039 |

The topology counts do not change with scale. Clearance already fails
at xh 3 (min 0.066 LU against the 0.60 floor, 6498 sample pairs; worst
inside the '8', next to the D1 stubs), so shrink only makes it worse.

## 2. Junction census by construct

Key to the causes:

| Class | What makes it |
|---|---|
| A | the word's lead tails (start and finish of the main strand) |
| D | a `dropRetraces` cut: a kept piece's free end |
| E / I | `openCusps` corners (made no node in any scene) |
| F spur | a stroke end left off the route (a leftover) |
| F free | a leftover piece with both ends free |
| J | a stroke end, or a connector end, landing on a stroke |
| K | a near-crossing: a pass through a vertex, typed JUNCTION |
| L | an entry mid-stroke: merge-class (a c d e g o q) and Greek glyphs entered mid-body, a join T |

| Scene (xh 3) | JUNCTIONs by cause | ENDs by cause | CROSSINGs |
|---|---|---|---|
| Daily #8 | **16**: K 11, J 4, L 1 | 17: F spur 8, D 7, A 2 | 4 |
| little | **7**: K 4, J 3 | 9: F spur 7, A 2 | 0 |
| minimum | **4**: J 4 | 14: D 7, F free 4, A 2, F spur 1 | 3 |
| quick brown fox | **16**: J 9, K 6, L 1 | 12: F spur 6, A 2, F free 2, D 1, other 1 | 2 |
| 0123456789 | **27**: J 20, K 7 | 36: D 22, F spur 9, F free 3, A 2 | 16 |
| # | **4**: K 4 | 8: F spur 6, A 2 | 0 |
| σοφός | **13**: L 10, J 2, K 1 | 6: F spur 4, A 2 | 0 |
| ς | **3**: L 2, J 1 | 3: F spur 1, A 2 | 0 |

**K, the biggest single class (11 of Daily #8's 16):**
- Glyph-internal crossings are atomized by `routeGlyph`'s local
  `buildPlanar`: the route points and the leftovers are split at the
  local crossing point.
- The word-level `buildPlanar` then meets a four-way vertex, not two
  segments crossing in their interiors. That is not a proper crossing,
  so the node gets `cross = false` and is typed JUNCTION.
- '#' has 4 junctions and 0 crossings; the loops of l, b, f and k go the
  same way.
- Every surviving CROSSING in these scenes is a connector or lead
  crossing a leftover; no glyph-internal crossing survives as one.

**J (connector ends and stroke ends on strokes) leads "minimum" and the
digits:**
- In "minimum", m, n and u begin with a stroke end that the previous
  connector lands on.
- In the digits, kept pieces end on strokes after their retrace was
  dropped.

**L leads the Greek**, because Greek is entered mid-stroke by the
lowercase rule. **ς has 3 junctions on its own.**

**What the new system must remove:** every class except A (and a
floating stroke's own free ENDs). Specifically:
- K becomes proper crossings (section 5);
- D cannot arise, since retraces become loops;
- J and L cannot arise: entries are declared points, and connectors end
  only there;
- F spurs become run-ons past a crossing, or separate strokes.

## 3. Representation

### The unit: 72 glyph units (GU) per x-height

- **Hershey embeds exactly.** 72 = 8 × 9, so 1 HU = 8 GU. Every Hershey
  coordinate embeds exactly, and the old data and the new compare point
  for point.
- **Proportions are whole units.** 72's divisors are 2, 3, 4, 6, 8, 9,
  12, 18, 24 and 36, so halves, thirds, quarters, sixths, eighths, ninths
  and twelfths of the x-height are whole units. Those are the
  proportions a hand is drawn in.
- **Fine enough.** 1 GU is 0.042 LU at xh 3 and 0.028 LU at the 2.0
  floor. Rounding to the grid moves a point at most 0.021 LU, under a
  tenth of the ribbon's half-width (0.26).
- **Lines:** the baseline is y = 0, the join line y = 32 (Hershey's 4 HU)
  and the x-height y = 72.

### A stroke is a chain of cubic Béziers with integer control points

- **Segments.** Segment i is (P0, P1, P2, P3), all in GU, and
  consecutive segments share their end point.
- **Every interior joint is G1.** The incoming handle P3 − P2 and the
  outgoing handle Q1 − Q0 point the same way.
  - The check is exact in integers: their cross product is 0 and their
    dot product is positive.
  - Neither handle may be zero.
- **Joint directions.** An author writes each joint's direction as a
  primitive integer vector (a, b), with gcd 1, and each handle as a
  whole multiple of it, so G1 holds by construction. A direction with no
  small integer form takes the nearest one: (7, 4) is 29.7° for 30°.
- **No corners anywhere.** A cusp becomes a loop (section 5's counter
  rule) or a rounded turn. The turn needs R ≥ 0.30 LU at the floor
  x-height, which is 10.8 GU. The authoring rule is therefore **R ≥
  11 GU everywhere (0.15 xh)**, checked on the evaluated polyline.

### Evaluation is exact (K108)

- **Points.** A segment is evaluated at t = k/64, for k = 0..64, as an
  integer Bernstein sum over 64³ = 2^18:

  B(k) = [(64−k)³ P0 + 3(64−k)² k P1 + 3(64−k) k² P2 + k³ P3] / 2^18

  - The weights are integers that sum to 2^18.
  - With |P| ≤ 2^12 GU (57 x-heights, far more than any glyph), every
    product and partial sum is an integer below 2^31, exact in a double.
  - The division by a power of two is exact.

  So each point is a dyadic rational, with the same bits in every
  engine.
- **Placement.** The glyph's integer origin (in GU) is added before
  scaling. That stays exact: under 2^40, with 18 fractional bits.
- **Scale.** Converting to LU is one multiply and one divide,
  (B · xh) / 72. Each is correctly rounded IEEE arithmetic, so the result
  is deterministic everywhere.
- **Arc length.** Sum each segment's 64 chords, each
  `Math.sqrt(dx*dx + dy*dy)` (never `Math.hypot`), in a fixed order. The
  result is deterministic, not exact, which is all K108 asks.
- **Crossings.**
  - Candidates come from the 64-chord polylines: bounding boxes first,
    then chord-chord tests.
  - Each candidate is refined on the cubics by 4 Newton steps using
    only + − × ÷.
  - A refinement that does not converge to within 1e-9 is a lint error,
    never a fallback.

### The glyph record

```ts
interface Glyph {
  ch: string;                  // one code point; ς (U+03C2) is its own
  advance: number;             // GU
  entries: Entry[];            // a low entry, plus a high one if the glyph takes H exits
  exit: { at: Pt; cls: "B" | "H" | "D" };
  body: CubicPath;             // pen down, from an entry to the exit
  floats: CubicPath[];         // lifted-pen strokes, in pen order
  crossings: number;           // declared; the lint checks it
}
interface Entry { at: Pt; kind: "b" | "o" | "m"; from: "low" | "high" }
type CubicPath = Pt[];         // P0, then 3 points per segment (integers, GU)
```

The data lives in a module like today's `hershey_script.ts`, one record
per code point.

## 4. Joins

**Each glyph declares where it is entered and where it exits.** An
entry or exit is a point on the body plus a tangent class. The body runs
from the entry to the exit, so a connector never lands mid-stroke. That
removes the J and L classes of section 2.

**Exits:**

| Class | Where | Tangent | Latin glyphs |
|---|---|---|---|
| B | the baseline swing, ending on the join line (y 32) | rising, about 50° | a d e h i k l m n t u x, most |
| H | high, near the x-height | heading right, level or dipping | o v w b, and r s in some forms |
| D | after a descender loop, on the join line | rising, about 65° | f g j q y z |

**Entries.** Each glyph declares a low entry, which takes B and D exits.
A glyph that is entered differently after a high exit also declares a
high entry, which takes H exits: after o, the n starts at the top of its
first hump. These are contextual forms, as in real cursive fonts. Each
entry's kind fixes its tangent:
- **b, an upstroke** on the join line, rising (i u t e l b h k f j r s
  w);
- **o, an oval's top**: about 2 o'clock, heading up and left into a
  counter-clockwise oval (a c d g o q);
- **m, an overturn**: rising into a hump that turns over (m n v x y z).

**The connector.** One cubic per join:
- P0 is the exit point and P3 the entry point.
- P1 = exit + tE · L1 and P2 = entry − tN · L2, where tE and tN are the
  class tangents (primitive integer vectors).
- L1 and L2 are about a third of the chord, rounded to whole multiples.

The connector is G1 at both ends by construction. The next glyph's
origin is placed so the connector's chord matches the pair's spacing: a
default per class pair, or the ligature table's.

**The lint.** It runs at the floor, xh 2.0, where every rule is
tightest, over every glyph and every class pair before any mass
authoring. It checks:
- bend R ≥ 0.30 LU;
- clearance ≥ 0.60 LU between non-adjacent passes, except at declared
  crossings;
- every crossing at sin ≥ 0.55;
- no third pass inside a crossing's overlap span;
- ENDs only where declared;
- the declared crossing count.

**The ligature table** holds the pairs that fail the lint. Each is keyed
by (previous character, next character) and gives a bespoke connector
(its own cubic path), plus an alternate form of either glyph where the
pair needs one: a b whose high exit drops lower before e, for example.
These are the bespoke cases Levi allowed. They are written and verified
before the mass data.

**Capitals, Greek, digits and punctuation** use the same record.
- A capital declares its exit, and an entry for mid-word use.
- Greek declares its entries, which ends today's mid-stroke "lowercase
  rule": σ ο α δ are entered mid-body now, class L.
- A space is a low swash connector between two words of one strand,
  linted like any other.
- The word's first glyph gets a lead-in from a free start (an A END) and
  its last glyph a lead-out (the other A END), both linted.

## 5. Crossings only

### The rules

The numbers come from section 8.

1. **Every meeting of two passes is a proper X.**
   - There are exactly two passes, each G1 through the node, crossing at
     sin θ ≥ 0.55 (33°); the target is ≥ 0.64 (40°).
   - No pass starts, ends or turns on another pass, and no two passes
     are tangent.
2. **A retrace becomes a loop or a spread turn.** Wherever Hershey goes
   up a stroke and back down it (the stems of i u t n m r, the stems of
   a d q, o's closure), the two directions separate into one of:
   - **a loop**, whose counter (the largest circle inside the
     centreline) spans ≥ 0.94 LU at the floor, which is ≥ 0.47 xh, with
     one crossing at its neck;
   - **a spread turn**: R ≥ 0.30 LU, with the legs ≥ 0.60 LU apart until
     they diverge, and no crossing.
3. **A T-meet becomes a crossing that runs on, or the strokes
   separate.**
   - **Runs on:** the arriving stroke crosses and continues
     ≥ 0.56 / sin θ LU (0.65 at 60°) to a free END, which is a floating
     stroke's end or the word's end.
   - **Separate:** the END's tip stays ≥ 0.56 LU from the other
     centreline.
4. **Crossings keep their distance.** Along one pass, consecutive
   crossings are ≥ 0.30 / sin θ1 + 0.30 / sin θ2 apart: 0.69 LU at 60°,
   0.93 at 40°. Their overlap spans must not touch, and no third pass
   enters one: `assignCrossings` throws on any crossing that does not
   have exactly two passes (`particle_system.ts:1277-1280`).
5. **Clearance.** Two passes that do not cross stay ≥ 0.60 LU apart,
   centre to centre (the casing). This is measured between non-adjacent
   samples.
6. **The ENDs are fixed by construction.**
   - A word's body has exactly two: its lead-in start and its lead-out
     finish (class A).
   - Each floating stroke has two.
   - A glyph contributes 2 × (its floating strokes) and nothing else: no
     spur, no stub, no cut piece.

### ENDs and crossings for the stage 9 set

These are the targets the authoring must meet; the lint checks each
declared count.

| Glyph | Body | Floats | ENDs | Crossings |
|---|---|---|---|---|
| D | stem and bowl in one stroke, from an entry loop at the foot | 0 | 0 | 1-2: the entry loop, the bowl's return across the stem |
| a | oval, closure, stem | 0 | 0 | 1: the closure across its entry |
| i | a spread or looped stem | dot | 2 | 0 spread, 1 looped |
| l | ascender loop | 0 | 0 | 1 |
| y | hump, descender loop | 0 | 0 | 1: the descender loop across the stem |
| space | low swash connector | 0 | 0 | 0 |
| # | the lower bar | the 2 verticals and the upper bar | 6 | 4 (section 10) |
| 8 | both bowls in one stroke | 0 | 0 | 1-2: the waist, plus the exit across the entry if it is entered at the top |
| e | upstroke, eye, exit | 0 | 0 | 1 |
| o | oval, closure, high exit | 0 | 0 | 1 |
| t | a spread or looped stem | bar | 2 | 2: the bar across both legs; +1 if looped |
| n | hump, a spread first leg, the second hump | 0 | 0 | 0 spread, 1 looped |
| 6 | one stroke: the bowl closes across the downstroke | 0 | 0 | 1 |
| ς | one stroke | 0 | 0 | 0 |

"Daily #8" then has 10 ENDs (2 lead tails, 2 for the dot, 6 for '#') and
zero JUNCTIONs. Today it has 17 and 16.

## 6. Floating strokes as separate strands

(pending: walk graph, forced title walk, stats, fog, reveal; the dot)

## 7. Pen order

(pending: K558's key)

## 8. Constraints with numbers

(pending: ribbon width, clearance, crossing angle, the physics constants that
do or do not bind a pinned word, bend radius, the x-height floor and the
Daily #8 fit at gs 6 / 12 / 18)

## 9. Layer 2 sampling spec

(pending)

## 10. Named cases

(pending: final sigma, digit 6, '#', the K555 joins, CAPITAL_OVERRIDES,
accents as floating strokes, stacked marks, same-slash crossings)

## 11. Calls for Levi

(pending: dots; lifted-pen strokes not walkable; looped vs unlooped hand; the
x-height floor; Hershey replaced or kept as fallback)

## 12. Kill criteria

(pending)

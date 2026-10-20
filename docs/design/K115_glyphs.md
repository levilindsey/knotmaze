# K115 glyphs: a crossings-only cursive for titles and words

Stage 8 design (2026-10-19). Brief: `docs/design/K115_stage8.md`.
Evidence: `.claude/probes/K115/stage8/` (untracked: the harness, its
outputs). Status: the stage 8 design, complete; the calls in section 11
wait on Levi. Next: `docs/design/K115_stage9.md`.

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
| 6 | one stroke, bowl first: the stem rises out of the bowl across the entry (section 10) | 0 | 0 | 1 |
| ς | one stroke | 0 | 0 | 0 |

"Daily #8" then has 10 ENDs (2 lead tails, 2 for the dot, 6 for '#') and
zero JUNCTIONs. Today it has 17 and 16.

## 6. Floating strokes as separate strands

**A lifted-pen stroke is its own open strand.** That covers t-bars, i
and j dots, accents, the x's second diagonal, the strokes of '#' and a
capital's floating bar. Each has two free ENDs and touches the body only
at proper crossings.

**The mechanism exists today.** Accents are class −4 (mark) segments,
and a strand whose edges are all marks is decorative
(`text_graph.ts:1358`). The new builder emits every floating stroke
through the same class.

What the code does with one (checked 2026-10-19; the helper's report is
in `notes.md`):

| Concern | Today's code | Verdict |
|---|---|---|
| Walk graph | decorative strands are skipped (`walk_graph.ts:161-163`); crossings are not walk vertices, so the walk passes straight through them | fine: a floating stroke is not walkable (Call 2) |
| Forced title walk | start `mentr_a`, exit `walk0.exit`, seam `tseam`: the main strand only | unchanged |
| Stats, stars, trail, fire, minotaur, audio | walk-keyed (`runForCtrl` is null off the walk, `app/audio_map.ts:107-124`) | unaffected |
| Fog | spatial; only walked runs lay stamps, so a stroke shows inside holes and its tails stay fogged | acceptable: the body around it is revealed |
| Thread reveal | **never visible**: pieces come from walk edges only (`explore_view.ts:204`), a pieceless chain is culled (`explore_gaps.ts:275`), its vis is 0 (`ribbon_renderer.ts:4055-4068`); a hidden OVER stroke cuts no gap, so the walked thread draws uncut | **must fix in stage 9**: show a floating strand once a run it crosses is revealed |
| Crossing passes | `assignCrossings` throws unless a crossing has exactly two passes (`particle_system.ts:1277-1280`) | covered by the lint's two-pass rule (section 5) |
| Colour | the off-walk fallback, an arbitrary constant per chain (`section_colors.ts:256-266`) | stage 9: the colour of the first body run it crosses |
| Reveal plan | draw mode gives it its own pen; trace and bloom use the loop fallback (`reveal_plan.ts:312-342`); a gap waits for its later pass (`ribbon_renderer.ts:1779-1788`) | check on the contact sheets |
| Picking | moves iterate walk edges, so a stroke cannot steal a tap; `pickThread` loops every chain, so a stroke is pluckable while the reveal is off | accept |
| Over/under | K558: a later pen key goes over | section 7 |

**Kill criterion 2 does not trip** (section 12). Two local fixes cover
it: the reveal's visibility rule and the two-pass lint.

**The dot (Call 1).** The recommendation is a short slanted pill: a
floating strand with about 0.2 xh of centreline (0.4 LU at the floor,
0.92 LU drawn with its two caps, about 1.8 ribbon widths), slanted with
the hand and ≥ 0.60 LU clear of the body. Stage 9's sheets settle the
length.

## 7. Pen order (K558's key)

The builder emits every segment with K558's pen key. K558's contract:
- one monotone key per `SegIn`;
- the later key goes over (K558's param reverses it);
- equal keys on two crossing segments are a bug;
- text is exempt from `checkAlternation`.

Keys are assigned in this order:

1. **The body, in writing order:** the lead-in, then each glyph's body
   from entry to exit, then the connector to the next glyph, and so on
   to the lead-out. Keys increase along the strand.
2. **Then the floating strokes**, glyph by glyph left to right, and
   within a glyph in authored order. The i's dot comes after the whole
   body. In '#' the order is the left vertical, then the right vertical,
   then the upper bar.

**Over/under then falls out with no parity solve:**
- a self-crossing of the body puts its later pass over;
- a floating stroke goes over the body;
- the later of two floating strokes goes over the earlier.

**The cases K555 listed cannot conflict:**
- **The digit 6:** today "Daily #6" fails strict alternation around the
  6 (`K115_stage3.md` 376-381). In the new glyph the closing pass (the
  stem, rising across the entry; section 10) is later, so it goes over,
  and no alternation is consulted.
- **Same-slash crossings:** no slash class is consulted; only keys order
  a crossing.
- **'#':** the lower bar (body) goes under both verticals and the upper
  bar (last) over both, giving a woven '#'.

## 8. Constraints with numbers

| Constraint | Number | Source | Binds pinned text? |
|---|---|---|---|
| Ribbon width | tw 0.52 LU, half-width h 0.26 | `threadWidth` default; text draws with it | yes |
| Casing | 0.60 LU centre to centre between passes that do not cross (tw + 2 × gap 0.04); the collision margin is 1.16 · tw = 0.603 | the defaults | yes, as render geometry: closer passes merge into one band |
| END clearance | 0.56 LU from the tip to the other centreline (casing half 0.30 + cap 0.26) | derived | yes |
| Crossing angle | the renderer handles a crossing above sin 0.25 (14.5°): the floor of the gaps' protect interval and the emergent collector's limit. Free threads' collision floor reaches full strength at sin 0.55 (33.4°) and below | `render-gaps.md`; `physics-collision.md` P3.32 | the 0.25 floor binds. 0.55 is this design's margin, borrowed from the P3.32 ramp, not a renderer limit (a crossing's overlap span grows as 1 / sin θ). Author at ≥ 0.55, target ≥ 0.64 |
| Crossing spacing | ≥ 0.30 / sin θ1 + 0.30 / sin θ2 along a pass | derived from the casing | yes |
| Bend radius | over-tight below 1.0 h (0.26 LU); floor 1.15 h (0.30 LU) | `bend_radius.ts` | yes |
| Counter | hole ≥ 0.8 widths, so a centreline span ≥ 0.94 LU | the kink-eye target (`physics-kinks.md`) | yes |
| `MIN_PASS_SEPARATION` 1.6, `DEPTH_WINDOW` 1.4, `KINK_MIN_SEPARATION` 2.6, corridor pitch 2.0 | ctrl units | `particle_system.ts` | **no**: they budget the sliding bindings of free threads. Pinned text never steps them (stage 3a measured standing width deficits on pinned words that still sleep) |
| x-height | titles: 3 LU, shrinking to fit `2 * gridSize` with no floor; cartouches: ≥ `MIN_XHEIGHT` 2.0 | `attachTitle`; `text_graph.ts:1667` | none: this is the input |

Two of the rules agree by construction. A bar crossing two parallel legs
d apart at angle θ meets them d / sin θ apart along the bar, and rule 4
asks for 0.60 / sin θ. So legs that keep the 0.60 casing clearance also
satisfy the crossing spacing.

### The x-height floor

**The counter rule binds first.** A counter that is a fraction f of the
x-height needs xh ≥ 0.94 / f:

| Feature | Counter (fraction of xh) | Needs xh ≥ |
|---|---|---|
| e's eye, n and m counters | about 0.5 | 1.88 |
| o | about 0.6 | 1.57 |
| a Palmer l loop | about 0.4 | 2.35 |

**The bend rule** (R ≥ 0.30 LU) with a hand whose tightest turn is
0.15 xh needs xh ≥ 2.0. The crossing angle is scale-free, and the
crossing spacing follows from the clearance (above).

**The floor is xh 2.0 LU, the same as `MIN_XHEIGHT`,** with loops
authored at ≥ 0.47 xh and turns at R ≥ 0.15 xh. A Palmer-proportioned l
loop (0.4 xh) would push the floor to 2.35, so the hand's loops are
slightly rounder than Palmer's. The floor scales with the ribbon:
2.0 × tw / 0.52, so 1.4 LU at tw 0.36.

### Daily #8 at gs 6, 12 and 18

**The new hand's width (inferred).** The glyphs are not authored yet, so
this is an estimate, not a measurement. Advances in x-heights:

| D | a | i | l | y | space | # | 8 | lead tails |
|---|---|---|---|---|---|---|---|---|
| 1.1 | 0.9 | 0.45 | 0.45 | 0.85 | 0.6 | 1.2 | 0.8 | 2 × 0.4 |

They sum to 7.15 xh, and looser joins (+0.15 per join) give 8.2: call it
7 to 8.5 xh. Today's Hershey measures 13.9 xh (41.67 LU at xh 3).

| gs | Declared width (`2 * gs`) | New hand's xh | Fits at the 2.0 floor? | Today's Hershey xh |
|---|---|---|---|---|
| 6 | 12 LU | 1.41-1.71 | **no**: kill criterion 1 trips | 0.86 |
| 12 | 24 LU | 2.82-3 | yes | 1.73 |
| 18 (default) | 36 LU | 3 (capped) | yes | 2.59 |

**The smallest gs that fits** is gs ≥ (the word's width in x-heights),
because 2 · gs ≥ 2.0 × width: **about gs 8** (7 to 9). Hershey at the
same floor would need gs 14. The `gridSize` slider runs 4-24, so titles
at gs 4-7 need Call 4.

## 9. Layer 2 sampling spec

**Today.** A text edge contributes two controls: its start node, and its
chord midpoint, `(pa + pb) / 2` from `edge.latticePoints`
(`particle_system.ts:625-628`). The renderer draws a centripetal
Catmull-Rom through every control (`ribbon_renderer.ts:957-966`, with
count = max(48, round(arc / 0.09))). Pinned text never relaxes, so
those controls are what renders. That is J1.

**The spec:**

1. **Nodes go on the Bézier** at:
   - every crossing (the refined point; crossings are graph nodes);
   - every END;
   - every curvature maximum of the authored curve, so the spline cannot
     cut the tightest turn;
   - elsewhere, at spacing ≤ min(0.5 LU, 0.6 R), where R is the authored
     local radius.
2. **Each edge's slot control sits on the Bézier** at the edge's
   mid-ARC point, not its chord midpoint.
   - A text edge carries that point in a new optional field (say
     `edge.mid`), and line 628 uses it when present.
   - Knot and maze edges never carry it, so the knot-mode golden stays
     byte-identical.
   - Controls are then ≤ min(0.25 LU, 0.3 R) apart: at the 0.30 LU floor
     that is 0.09 LU, the renderer's own sample spacing.
3. **Spacing is near-uniform:** CV ≤ 0.15 per run between forced nodes.
   A forced node (a crossing or an END) redistributes its free
   neighbours instead of leaving a short edge beside a long one. Today
   edges run from 0.037 to 1.39 LU, CV 0.48.
4. **Sampling happens at the final x-height,** in LU. Shrink-to-fit
   rebuilds the samples; it never scales a sampled polyline.

### Calibration

From `baseline.txt`, "Calibration, on-curve controls":

| Reference (on-curve controls) | Control spacing (LU) | Ripple | max \|dκ/ds\| | Bend |
|---|---|---|---|---|
| circle R 1 | 0.375 | 0.06 | 0.8 | 3.62 h |
| circle R 1 | 0.25 | 0.03 | 0.5 | 3.73 h |
| circle R 0.5 | 0.375 | 0.65 | 9.1 | 1.42 h |
| circle R 0.5 | 0.15 | 0.06 | 1.5 | 1.87 h |
| figure-eight 3 LU tall | 0.15 | 2.30 | 15.4 | 0.93 h |
| figure-eight 3 LU tall | 0.10 | 2.02 | 11.1 | 1.00 h |

- **Ripple** is the curvature's swing inside a ±0.5 LU arc window,
  relative to its mean there (`metrics.ts`).
- The figure-eight's 1.8-2.0 is the shape's own curvature change inside
  the window, the same at every spacing.
- Within the spec (controls ≤ 0.3 R), a circle ripples by about 3%
  (R 0.5 at 0.15: 0.06 against κ 2).

### Gates for stage 9

Per scene, on the worst strand:

- **Ripple:** max ≤ 2.3 and p95 ≤ 1.9 (the on-curve figure-eight at
  0.15 LU, the reference that must pass); circles ≤ 5%.
- **max |dκ/ds| ≤ 15.4** (the same reference). The exception is an
  authored G1 joint where the curvature itself steps: the harness names
  the joint, and a step there is not jitter.
- **Bend ≥ 1.15 h** wherever the authored R ≥ 0.30 LU. The figure-eight
  reference reads 1.00 h because its own R is 0.26, so the authored 8
  must keep R ≥ 0.30.
- **Clearance:** ≥ 0.60 LU between passes that do not cross; END tips
  ≥ 0.56 LU from other threads.
- **Crossings:** sin ≥ 0.55.
- **Topology:** zero JUNCTIONs, and ENDs = 2 + 2 × (floating strokes).
- **Position error:** Hausdorff distance from the rendered spline to the
  Bézier ≤ 0.02 LU. This is a new metric that stage 9 adds; stage 8 did
  not measure it.

**Particle count (inferred):** about 1 to 1.5 times today's. Nodes are
≤ 0.5 LU apart against today's 0.75 median, with no sub-0.1 LU splits.
Text is pinned, and the renderer's sample count depends only on arc
length, so the cost is negligible. Stage 9 measures it.

## 10. Named cases

### ς, the final sigma

- **Its own record.** ς (U+03C2) gets its own glyph record. Today it
  routes Hershey's ς into 3 JUNCTIONs (L 2, J 1) and 3 ENDs (section 2).
- **Its form:** one stroke, a c with a descender tail.
  - It starts at an o-kind entry near the top and runs counter-clockwise
    down the left side and along the baseline.
  - It then drops below the baseline into a tail that hooks back left.
  - ς ends a word, so the tail runs into the word's lead-out. If
    something follows it, the tail swings up into a D exit, as in g or y.
- **Counts:** 0 crossings, 0 JUNCTIONs, and no ENDs of its own.
- **No substitution:** the builder never swaps σ and ς; the input string
  decides.

### The digit 6

**The written form fails.** Most people write a 6 from the top: the stem
comes down the left side into the bowl, and the bowl closes across the
stem. Mid-word that stroke is then left of the stem, heading left. It
cannot reach an exit on the right without a second crossing or a
spiral.

**So the glyph is written bowl first.**
- The connector rises from the join line into the bowl's upper left.
- The stroke goes round the bowl clockwise, then up its left side and on
  up as the stem.
- The stem crosses the stroke's own entry at about 9 to 10 o'clock
  (about 50°, sin 0.77) and curls right at the top into a high exit.

That gives the same shape, 1 crossing and 0 ENDs. The stem is later than
the entry, so it goes over (section 7). The top-down form remains
possible only where the 6 ends a word, with its closure running on into
the lead-out; the sheets compare the two there.

### '#'

**Today:** 4 K-class JUNCTIONs, 0 crossings, 8 ENDs (6 spurs and the
2 lead tails).

**New:**
- **The body is the lower bar.** It is entered from the left at the join
  line and exits right on it.
- **The left vertical, the right vertical and the upper bar float,** in
  that pen order.
- **Weave:** the verticals cross over the lower bar and under the upper
  bar.
- **Counts:** 4 crossings and 6 ENDs.
- **Overhang:** every end runs ≥ 0.6 LU past its crossing (rule 3's
  0.56 / sin θ).
- **Spacing:** the crossings sit ≥ 0.62 LU apart along each bar and each
  vertical at 75° (rule 4). At about 1.2 xh wide, these limits do not
  bind.

### The K555 joins (λγ λη λθ λψ τυ)

**Today** each of these connectors lands on a glyph stroke
(`K115_stage6.md` 971-975), because the entry is the closest point on
the strokes. **In the new record** a connector always ends at the next
glyph's declared entry, which is an end of its body.

The entries for these pairs:
- **γ and ψ:** a b-kind entry at the top of the left arm.
- **η:** an m-kind entry into its first hump, like n.
- **θ:** an o-kind entry.
- **τυ:** τ's bar is part of its body, and τ exits high from the bar's
  right end into υ's high entry, as o → v does.

A pair that still fails the lint gets a ligature table entry.

### `CAPITAL_OVERRIDES` (`text_graph.ts:646`)

The five overrides of stage 6a (`K115_stage6.md` 800-809) patch where
Hershey's routing enters and leaves a capital. Authored entries and
exits replace all five.

**An exit is always an end of the body,** never a crossing or a point on
another pass.

| Capital | Today's override | New form |
|---|---|---|
| I | arrive [-8, 4], leave [5, 4] | authored entry and exit |
| P | leave [-1, 3] | written from the top of the stem; the bowl closes across the stem with a small loop, and the stroke runs down the lower stem to exit at its foot |
| S | leave [7, 3] | exits at the end of its tail |
| T | leave [0, 6] | the body is the stem with an exit hook at its foot; the bar floats |
| X | arrive [-7, -9], leave [7, 4] | the body is one diagonal with an entry and an exit swing; the other diagonal floats |

### Accents and stacked marks

**Each accent is a decorative floating strand:** acute, grave, tonos,
dieresis, breathings, and the dots of i and j.
- It is authored as a cubic path in a mark table keyed by the combining
  code point.
- It is placed at an anchor above the x-height or the cap height.
- It keeps ≥ 0.60 LU from the body and from every other mark, or
  crosses one properly (rule 1).
- Stacked marks follow the same rule: in ΐ the tonos sits between the
  dieresis dots, ≥ 0.60 LU from each.
- **Placement fallback:** today's rule stays, judged by the lint's
  numbers. A mark is nudged up to 3 HU (1/3 xh); if it still fails, it
  is dropped and counted in the census.
- **Pen order:** a mark's keys come after the body, in its glyph's float
  order (section 7).

### Same-slash crossings

Stage 1b's same-slash crossings relied on `overFirst` alone (K555). With
pen keys (section 7), no crossing consults a slash class or the strand
order: the later key goes over. The design never relies on slash
class, and rules 1 and 4 still apply.

## 11. Calls for Levi

1. **Dots.**
   - A round dot is impossible: a closed ring of this ribbon needs a
     0.94 LU counter, so it is at least 1.46 LU across, 0.73 xh at the
     floor.
   - The options:
     - a short slanted pill (a floating strand of about 0.2 xh, two
       ENDs);
     - omitting dots;
     - a solid disc, which the thread renderer cannot draw.
   - **Recommended: the pill.**
2. **Lifted-pen strokes are not walkable.**
   - t-bars, dots, accents, '#' strokes and floating capital bars are
     decorative strands. The player walks the body and passes straight
     through their crossings.
   - This replaces stage 1b's "spurs travelable". Walkable strokes would
     need JUNCTIONs, which the crossings-only rule excludes.
   - **Recommended: yes.**
3. **Looped or unlooped hand.**
   - Crossings-only turns every retrace into either a loop (one crossing)
     or a spread turn (legs ≥ 0.60 LU apart).
   - Unlooped everywhere reads as a print hand with wide, open stems.
   - **Recommended: looped,** Palmer-like, with loops ≥ 0.47 xh. Use
     spread turns only where a loop would crowd, such as n's first leg
     and i's stem.
4. **The x-height floor and small mazes.**
   - The floor is 2.0 LU. "Daily #8" fits `2 * gridSize` down to about
     gs 8.
   - The word grows by about 0.95 xh per digit: two-digit dailies (from
     Daily #10, 2026-10-21) need about gs 9, and three-digit ones about
     gs 10. These are estimates; stage 9 measures the authored widths.
   - Below that, the options are:
     - (a) the title overhangs the maze width, up to 1.5×, which covers
       gs 6;
     - (b) the short form "#8", about 3 xh, which fits down to gs 3;
     - (c) two lines;
     - (d) no title (K552's flag off);
     - (e) a thinner title ribbon: the floor scales with tw, to 1.4 LU at
       tw 0.36.
   - **Recommended: (a) down to gs 6, then (b) at gs 4-5.**
5. **Hershey's fate.**
   - **Recommended: replace it whole.** Keep it only as the fallback for
     characters not yet authored, counted in the census, and delete it
     once the set is complete.
   - Fix the `dropRetraces` tolerance mismatch (ON_TOL 0.5 HU against
     NODE_TOL 0.05 HU, section 1) only if the fallback outlives stage 10.

## 12. Kill criteria

**1. No x-height fits the title band at gs 6: TRIPS.**
- At tw 0.52, every hand needs xh ≥ 2.0. A looped hand needs it for its
  counters, and an unlooped one for its spread legs at 0.60 LU.
- "Daily #8" in the new hand is 7 to 8.5 xh wide, which is 14-17 LU
  against gs 6's 12.
- At gs 6 the fitted xh would be 1.41-1.71.
  - Counters (0.47 xh) would be 0.66-0.80 LU against the 0.94 needed.
  - The tightest bends (0.15 xh) would be 0.21-0.26 LU against the 0.30
    floor.
- The smallest gs that fits is about 8, and today's Hershey needs gs 14.
- The alternatives are Call 4's (a) to (e). (e) alone fits gs 6, barely:
  8.2 xh × 1.4 = 11.5 LU.

**2. Floating strokes break the walk graph: does NOT trip.**
- The walk graph skips decorative strands (`walk_graph.ts:161-163`).
- The forced title walk uses the main strand only.
- Stats, trail, fire, the minotaur and audio are walk-keyed.
- Two problems are local, and stage 9 fixes both:
  - the thread reveal never shows a non-walk strand (show it once a run
    it crosses is revealed);
  - `assignCrossings` throws on a crossing with other than two passes
    (the lint's rule 4).
- **If either fix fails,** omit floating strokes on titles: an undotted
  i, a t with its bar folded into the body, and a body-only '#'.

Stage 9's own kill criteria are in its brief.

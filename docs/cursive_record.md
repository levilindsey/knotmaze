# Cursive a/i: the change record

Written 2026-10-26 at Levi's request ("document well all the changes
you've made around cursive and why"), after Levi stopped the cursive-fix
line of work the same day. This is the record of what was tried on the
cursive `a` and `i`, why each attempt was made, what it actually
changed, and where things stand. It is a history document, not a
design: the design lives in `docs/design/K115_cursive_text.md` and
`docs/design/K115_glyphs.md`; the glyph machinery's lore is in the
path-scoped rules files. Nothing here is a to-do list - the open items
at the end are Levi's to reopen or not.

## Background: how cursive letters are built

Letters are not font outlines. `src/core/glyphs/glyph_data.ts` holds
hand-authored centerline skeletons (cubic segments in glyph units,
GU), and the builder turns a letter's skeleton into graph strands the
normal ribbon/junction renderer draws. A letter that connects to its
neighbours (the cursive joins) therefore has JUNCTIONS where the
entry/exit strand meets the letter body, and three pieces of machinery
decide how those joins look:

- The skeleton itself: where the junctions sit (points L and R on the
  `a`, J on the `i`) and the tangent of every segment at those points.
- Junction flares (K843): the strand widens near a junction and tapers
  back to normal width, so a join reads as one swelling stroke rather
  than two tubes butted together. Flare length/falloff are per-letter
  data.
- The glyph lint (`test/core/glyph_flare.test.ts` and the probe
  lint): numeric guards - minimum bend radius along the body (no
  kinks/lumps), tangent continuity at junctions, flare reach. The lint
  is the objective half of "looks right"; Levi's eye is the other half,
  and the record below is mostly about the gap between them.

Physics does not run inside letter segments (decided early: letters
are pinned authored shapes, not simulated strands).

## The changes, in order

### K831 (3b5c520f, 2026-10-22): the a/i redesign

First deliberate redesign of the two letters. The `a` got a low,
tangential bottom-left (BL) join - the entry strand meets the bowl
low and tangent to it - a declared corner at the top-right (the
single-story cursive `a` has a genuine corner where the top arc meets
the right stem), and a "landing spur": the exit strand leaves the
right side from a point partway up, with flare dressing. The `i`
entry/junction/stem were made colinear at the junction point J, and
the dot stopped pretending to be a normal segment: it got a dedicated
dot-drawing path (`061b7af1`: a clean skewed ellipse - the ring is
engine-exact) after Levi pointed out the drawn dot was irregular and
nobbly. The dot is a separate closed loop, slightly skewed to match
the `i`'s lean, never part of the walk graph.

Why: the letters before K831 were the raw Hershey-derived skeletons
with junctions wherever the stroke data happened to cross; they read
as tubes colliding, not as written letters.

### K831 follow-up (8072a2ee, 2026-10-22): junction tangents corrected

Levi's review of K831: the bottom corners had been rounded into a
"rectangle with rounded corners" - fundamentally wrong. The fix
restored the original `a` silhouette and re-placed the junctions as
attachments on it: entry contacts the left side about halfway up,
tangent there (which forces a very acute angle under the junction -
that acuteness is correct cursive geometry, not a defect); the
bottom-right of the bowl curves continuously up into the right side,
and the exit junction sits further up that side, acute at its bottom,
smooth on both sides. Flares ("spur-line" fattening) dress the strand
above both junctions. The `i`'s entry bump (it curved up, then right,
then up into the stem) was flattened toward colinearity at J.

### K836 (761003ab, 2026-10-22): tangent attachments on the undisturbed oval

The principle from the follow-up, stated as a rule and applied
cleanly: a junction is a tangent attachment to an otherwise
UNDISTURBED letter shape. The body curve of the `a` is one continuous
skeleton whether or not strands attach; attachments land on it
tangent (`landTangent`), and the inside curve through the junction
must be the curve the letter would have had anyway.

### K843 (df80e1f6, 2026-10-22): junction flares as shared machinery

Flare support generalised out of the a/i special cases: any junction
can carry a flare spec (fat at the junction, cosine taper to normal
width over a declared arc length). This is the mechanism both letters'
spur dressing uses, and what later attempts tuned (lengths 30->46 on
the `a`, 34->50 on the `i` at various points - flare reach was a
recurring complaint: "the flares end way too early - both for the a
and the i").

### K847 (ca08eb7a, 2026-10-23): the "rethink"

After Levi judged the K836 stills fundamentally wrong ("the overall
body of the a is very lumpy/knobbly/irregular... there is no point in
the top-right at all"), the `a` was re-silhouetted from scratch as a
single-story cursive `a`: apex at the top-right, proven shipped
segment proportions, integer tangents, lint-clean; the `i` entry
became one sweep into J; flares lengthened. Levi's verdict on the
stills (`.claude/probes/K847/after`): "I see no difference. Still
fundamentally wrong."

### K850 (20687641, 2026-10-23): measured rework against the lint

The final attempt changed method rather than shapes: author against
the numbers. Endpoint curvature from the cubic cross/handle^3
formula, lint as oracle, iterating until the lint was clean at xh 2
and 3 (`.claude/probes/K850/measure.mts`): the `a`'s topmost point
moved from x=49 (flat top) to x~=60-66 with a one-way heading turn
through the apex (bend radius >= 11 GU by lint) and a steep right
descent; the entry spur lands within ~5 degrees of the body tangent
with monotone heading (no hook); the exit leaves colinear with the
descent; flares shortened to exactly the arcs they dress (40/34 GU).
The `i`'s entry control points climb monotonically into J, its bottom
is one wide arc, the stem flare reaches plain width exactly at the
tip. Stills: `.claude/probes/K850/after/ai2.png`, `ai3.png`.

Status: pushed, lint-clean, full suite green - and NOT accepted.
Levi has not given K850 a look verdict, and on 2026-10-26 they closed
the line: "I need you to just stop trying with the cursive fixes."

Known residuals at K850 (recorded in the ledger when it landed): pale
seam discs inside the `a` at L and R (the taper-root/joinery
machinery, not the centerline), and a small notch at the `i` stem
base.

## Why it kept failing (the honest summary)

Three distinct failure modes recurred, and only the third was visible
in the numbers:

1. **Junctions treated as reroutes.** Early attempts let the entry
   strand bend the letter body - the skeleton itself kinked at L, R
   and J, so the `a` stopped being an `a` wherever a strand attached.
   K836's undisturbed-shape rule fixed this in principle.
2. **The renderer fighting the skeleton.** Flares ending early, taper
   roots leaving seam discs, junction fans painting inside the join -
   several "wrong shape" reports were the drawing machinery, not the
   centerline. These were fixed piecemeal (K833/K843/K846/K849
   border-junction work is the same family on the maze side).
3. **Authoring by eye from stills.** Each attempt nudged control
   points from screenshots; the skeleton would pass one zoom and fail
   another, and "lumpy/knobbly" curvature is invisible in a control
   polygon - it lives in the heading/curvature plots. K850's
   contribution, win or lose, is that the letters are now authored
   against measurable criteria (bend radius, heading monotonicity,
   tangent error at the junctions), so the next person starts from
   instruments, not vibes.

The deeper open question, Levi's own framing: whether this should be
hand-authored skeletons at all, or a separate calligraphy tool (Levi
expects to extend this into one; see the K726 note in the ledger -
the tapered-stroke disc-envelope support, K829, was kept desirable
for exactly that reason).

## What is NOT changed by stopping

- The rest of the glyph system (other letters, Greek, accents,
  cartouche/title-thread embedding) is untouched and shipped; only
  the a/i refinement loop stopped.
- K606 (the wider `i` and `a` - i 40->58 GU, a 104->120, built
  reversible) still waits on Levi's call in the ledger.
- K850's stills and measure script stay in `.claude/probes/K850/` as
  the review packet whenever Levi wants to give the verdict.
- No letter data was reverted: K850 is what ships. If Levi later
  judges it wrong, the revert target is K847 (ca08eb7a) or K836
  (761003ab) - both named here so nobody has to archaeology them.

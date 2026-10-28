# K980: Cursive J1, derived pieces that stay local (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: K944 (`docs/design/K944_cursive_asdrawn.md`). Read its
`## Handoff`, and `NOTES.md` `## K944` in `.claude/probes/K863/trace/`,
before anything else. Ledger items: K980 (this stage), K981 (the retrace
rule) and K982 (K944's untraced leftovers).

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews
them (v5.8, ledger K975, still open), the pipeline reads Levi's edits as
drawn (K944, done), then Levi hand-edits the template. Levi: "After I
hand-edit them, you should probably not change them."

K944 brings every body back exactly as drawn. But an edit to one letter
still moves what the pipeline derives around other letters, and some
derived pieces jump instead of following smoothly (K944's step 4):
- **Joins.** join_k925's class/global refit moves the joins of untouched
  pairs: minimum's six joins moved 0.22-0.62 u.
- **e variants.** evar_k926 picks a point on a 60 fu grid, and
  Nelder-Mead never improves on it. A 2.5 u edit to e jumped variant o's
  sJ a whole step (359.8 -> 300.0 fu) and variant g's (299.9 -> 240.0),
  and the variants moved 2.65-4.58 u.
- **Word-final e tails** follow the m/n/y/d tail medians, so the n and d
  edits moved every word-final e tail 8.2-8.9 u.
- **p's entry frame** is taken by node index: deleting node 7 turned its
  tangent (T 0.786 -> 0.513), and the joins into p moved up to 0.91 u.
- **Retraced stems.** When one pass is edited, the far fork's departing
  handle stays put, so n kinks -16 deg there and rough fails (facet
  0.0056 > 0.0053).
- **A whole-letter move** shows in "boxes" (x moved exactly (+4, -3))
  but "fox" absorbs most of it (x moved (-0.74, -3)).

Once Levi edits, each edit must change only what it touches, and change
it smoothly. This stage (J1) fixes that. The join quality fixes (K962,
K948, K946, K949, K937) are the next stage (J2), built on this one.

## Coordinator's calls (technical)

- **Local.** Every derived piece depends only on the letters it touches
  and on constants in the map (`template_map_k980.json`):
  - a join on its two letters; a variant, a tail or a lead-in on its own
    letter;
  - the derived pieces are the joins, the entry modes, the e and o
    variants, the tails and lead-ins, the fused junctions, the retrace
    and overstroke splits, and the end frames.
  Nothing is fitted across letters at build time. Where a value is shared
  today (a class fit, a median over reference letters, a variant fitted
  against several predecessors' exits), freeze it into the map at its
  v5.8 value (`work16/build/`), so the unedited build moves as little as
  possible.
- **Continuous.** Each derived piece is a continuous function of its
  letters' curves: no grid, no node index, no jump between basins.
  evar's grid becomes a continuous fit: a smooth objective, solved to
  convergence from a fixed start (the frozen v5.8 optimum, never the
  previous run's answer). The sweep below checks it.
- **By rule, not by index.** Every point and frame the SVG does not mark
  is found on the drawn curve by the rule that made it (arc length from a
  stroke end, a tangent direction, a lowest point), never by node index.
  Adding or deleting a node away from it then moves nothing.
- **The retrace rule (K981).** When the reader moves the following pass
  of a retraced stem, look at the far fork's departing handle:
  - at a smooth fork (`sodipodi:nodetypes` `s` or `z`), it rotates to
    stay collinear and keeps its length, as Inkscape treats a smooth node;
  - at a corner (`c`), it is left alone.
  The reader's report lists it as derived.
- **A whole-letter move shows the same in every word.** A letter's ink
  in a word is the template's ink, placed by the word's layout from
  constants (the font's advances). Nothing in the layout absorbs an edit.
  Trace why "fox" absorbs x's move and fix it, or show it is how it was
  measured.
- **Bodies stay as drawn.** This stage changes no body.
- **The unedited build stays close to v5.8.** Freezing moves nothing by
  construction. The continuous e fit and the frame rules may move pieces.
  - Report each derived piece's move against v5.8's build.
  - Compare the joins with `fid_cmp_k969`: no row worse by more than
    0.25 u, or each such row explained.
- **K950's tail** is a map constant with both values: long (rising as
  high as the m/n/y/d tails, today's) and short (as long as their tails
  by arc). Levi's answer then picks one flag. Long stays the default
  until Levi answers.

## The sensitivity harness (the stage's check)

`work18/dbg/sensitivity_k980.py`:
- It runs the derived stages only: the reader, joins, variants, tails
  and the word layout's placements. No renders, no review.
- It runs on the unedited template and on each of K944's nine scripted
  edits (`work17/dbg/edits_k944.py`):
  - the drags scaled to 0.25, 0.5, 0.75 and 1 of their size;
  - the node add, node delete, corner, line and Joins-layer edits as
    they are.
- Per derived piece it records the letters the piece touches and its
  largest distance from the unedited build's piece, sampled along the
  curve.
- It passes when:
  - every piece that touches no edited letter moves at most 1e-6 u;
  - every piece that touches an edited letter moves continuously: from
    one scale to the next, its move changes by at most 3 times the
    edit's change. Report each piece's measured gain; a larger step is a
    jump and fails;
  - the words with no edited letter come out byte for byte the same.
- Run it first on today's pipeline (K944's tools) as the baseline. It
  should reproduce K944's moves: minimum's joins, the sJ jumps, the
  tails. The join step takes about 200 s today, so the baseline may use
  one scale only.

## Goal

- `work18/dbg/build_from_svg.ps1` (from K944's) runs the whole build
  with the local derived stages.
- The harness passes on all nine edits.
- K981's rule is in the reader.
- The traces are done: "fox", p's frame, and the short tail (the words
  draw it about 30 u from its lowest point, tails_k926 reports 33.9 u).
- In `out18/`:
  - `cursive_template.svg` (the file Levi will edit; say how it differs
    from `out17/`'s);
  - `words_k980.svg` and `combs_k980.svg` (minimum, hippo, and the
    letters whose derived pieces moved most against v5.8);
  - `sensitivity_k980.txt`.

## Order

1. **Map the dependencies.** For every derived piece, list what it reads
   today: which letters, which shared fits, which constants, which node
   indices. Write the table into `NOTES.md` `## K980` as you go, and
   mark each read that is not local or goes by index.
2. **The harness,** run on today's pipeline (the baseline).
3. **Freeze** the shared values into the map and solve each join on its
   own pair. Rerun the harness.
4. **The continuous e fit.** Rerun.
5. **Frames by rule, and the retrace rule (K981).** Rerun.
6. **The traces:** "fox" and the short tail.
7. **Build and look.**
   - The unedited build against v5.8: the moves and `fid_cmp`.
   - The words and combs sheets.
   - Crop and look at the pieces that moved most.

Not this stage: the join quality fixes (K962, K948, K946, K949, K937;
the next stage), the bodies' smoothness, K961's node counts, K927,
capitals (K931), and K950's choice itself.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k980.py`, copied from the latest versions.
  - Outputs go in `work18/` and `out18/`, and the record goes in
    `NOTES.md` `## K980` with its rerun commands, every label list
    written out. Write each finding there when you have it, not at the
    end: it survives a compaction, and a transcript is a poor place to
    dig results back out of. Scripts go in `work18/dbg/`, never the
    session scratchpad.
  - Leave earlier versions' tools and outputs untouched.
- **K930's writer.** Every new curve goes through it: few nodes, G2.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`, from the
    command line only. Never open its window, and don't change its
    preferences.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Downloads: none should be needed. If one is, put it in a new, empty
    directory and run Python on it with `-I`.
- **Levi's chart.** `ref/chart.jpg` is never committed, uploaded or
  embedded in an SVG, and the review PNG contains it. Upload nothing: the
  coordinator uploads the SVGs.
- **Tracked files.** Everything lives in the untracked probe directory,
  so there is nothing to commit. The `## Handoff` you append to this
  brief is the coordinator's to commit. `LEDGER.md` is the coordinator's.
  Don't touch other tracked files.
- **Another agent** (K868's design stage) times Node prototypes until
  about 06:40. You time nothing, so never take the perf lock, and run
  one Python build at a time.
- **Not allowed.** No phone, no timing, no `npm run build` in the main
  checkout, no processes you did not start, and never Levi's Chrome
  profile.
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-7 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the step you are on, rerun the harness, and
    say what is missing. What is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## K980`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - the dependency table in short: what was not local or went by index,
    and what each became;
  - the harness, at the baseline and at the end: per edit, the largest
    move of a piece that touches no edited letter, and the gains of the
    pieces that do;
  - the unedited build against v5.8: the largest moves, and each
    `fid_cmp` row worse by more than 0.25 u, explained;
  - the retrace rule on K944's n edit: the kink and rough's result;
  - the traces;
  - the outputs, and the crops you looked at;
  - anything Levi should know before editing, in plain words;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

## Handoff

K980 stage agent, 2026-10-28 04:55:59 to 06:40 (-07:00). Steps 1-7
are done, in the main checkout on master, and nothing is committed. All
the work is in `.claude/probes/K863/trace/` (untracked): tools in
`tools/*_k980.py`, scripts in `work18/dbg/`, work files in `work18/`,
outputs in `out18/`. The findings and every rerun command are in
`NOTES.md` `## K980`.

Done:
- **Dependency map** (NOTES step 1, one row per derived piece). Not
  local today:
  - the join sets (class and global refits on every build) and the
    (class|e) sets;
  - the e tail (cut at the m/n/y/d median);
  - the other tails' and leads' class means;
  - the virtual lead (n's exit);
  - the layout's ini/fin dx (refitted to the drawn letter).
  Jumps or indices: evar's grid and its 0.5 fu snap, the cusp entry's
  swap from the fitted arrival to the drawn tangent on any edit, and
  transport's node alignment.
- **Freeze.** `work18/dbg/freeze_k980.py` writes
  `work18/template_map_k980.json`. Its `k980` key holds:
  - v5.8's final join params whole (every set, tail, lead and ini/fin
    dx);
  - n's v5.8 exit for the virtual lead;
  - both e tails (`tail_e_mode`, default long; or `-Tail`);
  - the e fit's start and target.
  Each join is drawn from its own pair's end frames with its frozen set.
  Nothing is fitted across letters at build time.
- **Continuous e fit** (`tools/evar_k980.py`). It keeps evar_k926's
  parts, with J at the exact arc length and a smooth L8 objective. It is
  solved by Nelder-Mead to convergence from v5.8's point. The target is
  v5.8's variant curve, not the font's. Against the font, the optimum
  sits 3.4-3.8 u from v5.8 at the same glyph distance: v5.8's point was
  a grid point on a flat objective.
- **Reader** (`tools/asdrawn_k980.py`, K944's plus three changes):
  - K981: at a smooth far fork (`s`, `z`) the departing handle turns to
    stay collinear and keeps its length. A corner is left alone. The
    report lists it as derived.
  - A cusp entry (i j p r s t u w y) keeps its fitted arrival, and its
    point follows the drawn start. K944 swapped in the drawn tangent on
    any edit of the stroke: p turned 20.95 deg, t 37.3, w 29.1.
  - The cusp letters' after_o and after_b points follow the drawn start.
- **Build script.** `work18/dbg/build_from_svg.ps1 <template.svg>
  [-Name <run>] [-Tail long|short] [-Letters <comb letters>]` takes
  about 2 min. Its unedited bodies and join params equal the harness's
  byte for byte.
- **Harness** (`work18/dbg/sensitivity_k980.py`; reports in
  `work18/base/` and `work18/local/<stage>/`).
  - Baseline, K944's tools: 7 of 9 edits fail. Untouched pieces moved
    up to:
    - 5.12 u (e_end), 3.66 u (r_line), 2.16 u (d_fused);
    - 1.88 u (w_corner), 1.38 u (x_move), 1.34 u (n_retrace), 1.10 u
      (p_delete).
    The e variants jumped with a gain of 7.40.
  - End: all 9 pass (s5, and s6 rerun from scratch, byte for byte the
    same). Untouched pieces move 0 u, and no word without the edited
    letter changes. Touched maxima (gain per scale step):
    - d 3.659 u (1.48), n 2.268 u (0.92), e 2.530 u (1.06), x 5.000 u
      (1.00);
    - h 0.033 u, p 1.080 u, w 4.017 u, r 0.815 u, the Joins layer 0 u.
    Each is the edited body as drawn, or a join or frame on it.
- **Unedited build against v5.8** (`work18/cmp_v58.txt`). 32 of 510
  pieces moved over 1e-6 u, all from the e fit:
  - the variant frames 0.546 u (after_o, after_b: at most 2.2 deg at J)
    and 0.057 u (after_g);
  - the variant curves 0.075 u and 0.195 u, and e in the words 0.02 u;
  - the joins into e, up to 0.061 u (oe).
  Everything else is 0. fid_cmp_k969: 88 rows, none moved more than
  0.05 u.
- **Traces (K982).**
  - "fox": the layout's fin dx was refitted to the moved x and pulled it
    back 4.74 u. Now that it is frozen, x's move shows whole in "fox",
    as in "boxes".
  - p's frame: the 20.95 deg turn came from the reader's swap, not from
    deleting node 7. Fixed in the reader (above).
  - Short tail: tails_k926 measures 33.9 u on the font's path. The
    drawn tail's own lowest point sits 4.48 u later on e's flat bottom,
    and from there the tail is 29.9 u. It is the same curve: the lowest
    point of a flat bottom is ill-conditioned.
- **out18/:**
  - `cursive_template.svg`: out17's, apart from last-digit noise in two
    reference layers. The Letters and Guides layers are identical
    (`work18/tpl_diff.txt`).
  - `words_k980.svg`.
  - `combs_k980.svg`: minimum, hippo, and "be we shoe maze huge bye" for
    the joins into e's variants. e is the comb letter, the only letter
    whose pieces moved.
  - `sensitivity_k980.txt`.
  None of them has an `<image>`. Crops looked at:
  `work18/build_k980/dbg/crops/`.

Open:
- **The e fit's target is absolute.** It holds e's variants to v5.8's
  curve, not to the drawing. When e's eye is edited, the fit bends the
  start curve back toward the old curve (b0 0.46 -> 4.32 at e_end). The
  other rule: apply v5.8's sJ, prm and kC to the edited body, with no
  fit. A coordinator's call.
- **K981 is G1 only.** n's far fork no longer turns, but its curvature
  jump grows with the drag (dk 2.70e-2 1/fu at s1; K944: 1.50e-2). Node
  6 gets a small new jump (1.63e-4), and n has 4 kinks (K944: 3). A G2
  rule at a smooth node would be next, if wanted.
- **rough still fails n** after K944's n edit (facet 0.0056 > 0.0053,
  peak 14.67 at 166 u). It fails the same with and without K981, so the
  fork is not the cause. Not traced.
- **Short tail.** It is cut on the font's path, but the m/n/y/d medians
  are measured on their drawn tails. If Levi picks short and it must
  match them as drawn, cut it on the drawn tail.
- **Transport.** Frames with a bk (after_o with s: b f h k l x z;
  s_fused: a c d g o q) still go through K944's node alignment, then
  locate. The harness's node add on h moved h's frames at most 1e-4 u.
- **maze's z exit node** is a near-cusp. Its comb is a capped spike in
  v5.8 and K980, and its teeth fan differently after a 0.016 u join
  move. For the join fixes.
- **No GUI test**, as in K944: the edits are emulated.

Next: Levi edits `out18/cursive_template.svg` (the Letters layer only)
and builds it with `pwsh -File work18\dbg\build_from_svg.ps1 <svg>
-Name <run>`, from the trace directory. Then J2, the join fixes (K962,
K948, K946, K949, K937), on this pipeline.

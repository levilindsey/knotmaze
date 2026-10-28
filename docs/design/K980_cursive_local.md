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

# K944: Cursive, reading Levi's edits as drawn (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: v5.8 (`docs/design/K969_cursive_v58.md`). Read its
`## Handoff`, and `NOTES.md` `## v5.8` in `.claude/probes/K863/trace/`,
before anything else; then `K930_cursive_smooth.md` step 4 and its Open
items 1 and 2 (the hold prototype, which stays opt-in).

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews,
the pipeline learns to read Levi's edits as drawn (this stage), then
Levi hand-edits the template. Levi: "After I hand-edit them, you should
probably not change them."

So the reader hands every letter back exactly as Levi saved it, and
derives from it only what the pipeline derives from the bodies today:
the joins, the variants (the two entry modes, the e and o ends), the
tails, the fused junctions (a/c/d/g/o/q at 60 u, o at 86 u) and the
overstroke splits. Today's `--from-svg` (`words_k965.py`,
`G.read_template`) changes edited strokes: `--split blend` (the default)
and `--split fair`. K930's `hold` refits around moved nodes. All three
stay, as opt-in flags.

## Coordinator's calls (technical)

- **As drawn.** Every node and handle of every stroke in the Letters
  layer is used within 1e-6 u of the file, after the file's own
  transforms. Nothing refits, fairs or blends a letter unless a flag
  asks.
- **Levi's file is the master.** After Levi's edits, a rebuild copies
  the file's Letters layer through unchanged (byte for byte where the
  format allows) and rebuilds only the reference layers (Context, Joins,
  Guides) around it. The pipeline never rewrites Levi's letters.
- **What Levi edits:** the Letters layer ("Letters - draw here"). Edits
  in the reference layers are not read; the report lists them.
- **Points the SVG does not mark** (end frames, the fused junction
  points, retrace and overstroke split points, the e and o ends):
  re-derive each on the drawn curve by the rule that made it (for
  example the junction at 60 u of arc length), and use the nearest point
  to the old position only where no rule exists. Report each one that
  moved more than 0.5 u.
- **Retraced stretches** (a stem drawn down and back up in one path,
  so its nodes appear twice): if Levi moved one copy, the other copy
  follows it exactly; if both moved, differently, keep both as drawn and
  report it.
- **Kinks are reported, never fixed.** Inkscape's smooth nodes keep the
  tangent but not the curvature, so a curvature jump at a node Levi
  touched is expected. The report lists, per stroke, each node whose
  tangent turns more than 0.5 deg or whose curvature jumps above the
  rounding floor (measured in step 1), and says whether Inkscape marks
  it a corner (`sodipodi:nodetypes` `c`). Joins meet each body with G2 to
  the body as drawn.
- **Any Inkscape path reads the same way:** absolute or relative
  commands, M/L/H/V/C/S/Q/T/A/Z, transforms on paths and groups, nodes
  added or deleted. An arc becomes cubics within 1e-6 u; a line is a
  cubic with its handles on the line.

## Goal

- One script, `work17/dbg/build_from_svg.ps1 <template>`, runs the whole
  build from an edited template, in v5.8's order (bodies as drawn, joins,
  evar, fitp, tails, the reference layers, nodes, words, review, eye,
  rough, combs). `--split asdrawn` is the reader's default.
- Each edit comes back within 1e-6 u; untouched letters come back within
  1e-6 u of the pipeline's own; the derived pieces follow the edits, G2
  at the body ends; the build's outputs for untouched letters do not
  change.
- The template is the file Levi edits: 6 decimals or more (v5.7's and
  v5.8's are), and a plain Inkscape save moves nothing.

## Order

1. **The round trip.** Save the newest template through the Inkscape CLI
   with no edits, as an Inkscape SVG (the way the GUI saves it). Read it
   back: every letter within 1e-6 u. Record what Inkscape changed
   (precision, relative commands, transforms, `sodipodi:nodetypes`) and
   the rounding floor for the kink report. Run the whole build from it:
   the outputs match the direct build, or each difference is explained.
2. **The reader and the build script**, as the calls say. What the SVG
   cannot carry (which pass is which, where the retraces are, the rule
   for each unmarked point) goes in `template_map.json`.
3. **Scripted edits on a copy**, each saved through the Inkscape CLI:
   - drag nodes and handles by 1 to 5 u in three letters: one with a
     fused junction, one with a retrace, one with an e or o end;
   - add a node, delete a node, make a corner, turn a segment into a
     line, move a whole letter;
   - an edit in the Joins layer (not read, reported).
   Each edit comes back as drawn, the derived pieces follow, the kink
   report names the corner, the other letters do not change.
4. **Build from the edited copy:** the words sheet, combs of the edited
   letters and of "minimum" and "hippo", and crops of each edit beside
   the original. Crop and look at each.
5. **K950's picture.** On the newest bodies, the word-final e with the
   long tail (51.1 u, today's) beside the short one (34.2 u), in four or
   five words from the words sheet, as one SVG with no chart, for Levi
   to choose from.

Not this stage: the join fixes (K962, K948, K946, K949, K937; the next
stage), the bodies' smoothness, K961's node counts, K927 and capitals
(K931).

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k944.py`, copied from the latest versions.
  - Outputs go in `work17/` and `out17/`, and the record goes in
    `NOTES.md` `## K944` with its rerun commands, every label list
    written out. Write each finding there when you have it, not at the
    end: it survives a compaction, and a transcript is a poor place to
    dig results back out of (v5.8's agent compacted six times in its
    first hour). Scripts go in `work17/dbg/`, never the session
    scratchpad.
  - Leave earlier versions' tools and outputs untouched.
  - In `out17/`: `cursive_template.svg` (the file Levi edits, only if it
    must differ from the newest build's template; say how),
    `words_edit_test.svg` (+ `.png`), `combs_edit_test.svg`,
    `e_tails_k950.svg`.
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
- **Tracked files.** Everything lives in the untracked probe directory, so
  there is nothing to commit. The `## Handoff` you append to this brief is
  the coordinator's to commit. `LEDGER.md` is the coordinator's. Don't
  touch other tracked files.
- **Not allowed.** No phone, no timing, no `npm run build` in the main
  checkout, no processes you did not start, and never Levi's Chrome
  profile.
- **Crop and look** at your own renders before you call a visual result
  done.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, if step 4 has not started, finish the step you are on
    and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## K944`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - the round trip: what Inkscape changed, the largest deviation, the
    rounding floor, the build's differences;
  - per scripted edit: what moved, the largest deviation as read back,
    what followed, the kink report's lines, and a crop;
  - the file Levi edits, and anything Levi should know before editing,
    in plain words;
  - K950's picture;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

## Handoff

K944 stage agent, 2026-10-28 03:26 to 04:45 (-07:00). Steps 1-5 are
done, in the main checkout on master, and nothing is committed. All the
work is in `.claude/probes/K863/trace/` (untracked): tools in
`tools/*_k944.py`, scripts in `work17/dbg/`, work files in `work17/`,
outputs in `out17/`. The findings and every rerun command are in
`NOTES.md` `## K944`.

Done:
- **Round trip.** A plain Inkscape CLI save keeps every path `d`, every
  attribute and `sodipodi:nodetypes`. It only adds ids, a `<defs>` and a
  namedview, and re-indents the file. It reads back within 6.05e-7 u.
  The whole build from the saved file matches v5.8's direct build:
  - bodies and join params match value for value;
  - words.svg, the nodes sheet and the review PNG match byte for byte.
  An edited path is rewritten as relative commands at 8 significant
  digits, and a handle can lose up to 4.39e-4 u.
- **Reader and build script.**
  - `tools/asdrawn_k944.py` reads the file (`read`, `map`, `refs`,
    `floor`).
  - `work17/dbg/build_from_svg.ps1 <template> [-Name] [-Letters]` runs
    the whole build in v5.8's order.
  - The map is `work17/template_map_k944.json`.
- **Scripted edits.** There are nine, in `work17/dbg/edits_k944.py`.
  - They are node-tool edits emulated in Python, then saved through the
    Inkscape CLI.
  - Edited strokes read back 0 u from the file, and untouched ones 0 u.
  - Derived points follow the edits. There are 12 kink lines, all at an
    edited node or its neighbour.
  - The Joins-layer edit is reported, not read.
- **Build from the edited copy.**
  - Outputs: `out17/words_edit_test.svg` (+ `.png`),
    `out17/combs_edit_test.svg`, and the crops
    `work17/edit/crops/1_d_fused.png` to `8_x_move.png`.
  - Joins stay G2 to the bodies as drawn.
  - Rough fails once: n's facet is 0.0056, over the 0.0053 limit (the
    retrace's far-fork kink).
- **K950.** The picture is `out17/e_tails_k950.svg`, five words, long
  tail beside short. Measured from the tail's lowest point:
  - long: 51.2 u, rising 23.7 u;
  - short: about 30 u, rising 10.5 u.

Open:
- **No GUI test.** The edits are emulated, and Inkscape's GUI node tool
  was never driven. Levi's first real edit is the real test.
- **Untouched letters' outputs still move.** Their bodies stay put, but
  three things around them move:
  - joins: join_k925's class and global refit (minimum's joins move
    0.22-0.62 u);
  - e variants: evar_k926's 9-point grid, where Nelder-Mead never
    improves. A 2.5 u e edit moved variant o's sJ a whole 60 fu step,
    and the variant e's moved 2.65-4.58 u;
  - word-final e tails: they follow the reference medians and moved
    8.2-8.9 u after the n and d edits.
  This is the next stage's scope (the join fixes).
- **Retrace edits kink.** When one pass of a retrace is edited, the
  other pass follows, but the far fork's outer handle does not. n kinks
  16 deg there.
- **Sideways letter moves.** "boxes" keeps a sideways move of the whole
  letter, but "fox" mostly absorbs it: x moved (-0.74, -3) for a
  (+4, -3) drag. Not traced.
- **Node deletes.** Deleting a node refits its neighbours (p: up to
  1.07 u) and changed p's entry frame, so joins into p moved up to
  0.91 u. Not traced.
- **K950 tail lengths.** The words draw the short tail about 30 u from
  its lowest point, but tails_k926 reports 33.9 u for the letter. The
  final-e shear is not the cause (checked). Not traced further.

Next: Levi edits `out17/cursive_template.svg` in Inkscape, in the
Letters layer only. Run `build_from_svg.ps1` on Levi's file, then the
join-fix stage (K962, K948, K946, K949, K937).

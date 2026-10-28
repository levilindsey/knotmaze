# K959: Cursive v5.6, the template ready for Levi's review (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: v5.5 (`docs/design/K945_cursive_v55.md`). Read its
`## Handoff`, and `NOTES.md` `## v5.5` in `.claude/probes/K863/trace/`,
before anything else.

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews,
the pipeline learns to read Levi's edits as drawn (K944), then Levi
hand-edits the template. After the hand edits the pipeline never changes
a body again, so each body stroke has to be as smooth and as easy to edit
as the pipeline can make it before the review. Levi: "I want them to even
be smoother than you currently have them."

v5.5 put the centreline on the font's axis and the a/g/q stem tops at the
font's V. It left these (ledger K959-K963):
- **K959, the exit ends.** o's last 15 u lean 3.1 u inside the stroke and
  end in a short hook. The fair causes it; its evaluation cap does not
  (tested). Inferred: the fair holds the end to the stored exit frame.
  e's last 5 u turn 8.2 deg, against 1.0 in v5.4; cause untested.
- **K960, eye flags over 3.** The exit-brace curls b@3076 26.5, v@1879
  17.7 and w@3111 11.5 (they grew from v5.4); p's entry p@621 5.0 (new);
  p's bowl join p@3562 5.0; t's cusp 4.3.
- **K961, nodes.** 17 of 30 strokes have more than 12 (k 27, m 25, p 22,
  q 20, a 19, f 18, h 18). The hard nodes at the frames, cusps and
  corners cut a stroke into 3-8 pieces.
- **K963, small ones.** f's hairpin sits 1.30 u off the axis with three
  nodes clustered at its top; a's fair stops at its evaluation cap.
- **Peaks.** Peak |dk/ds| rose in a, u, m, k, l, d and f, mostly at the
  exit curls and k's start. Inferred: the new centreline builds curvature
  into each curl over a shorter stretch.

## Goal

v5.6: every body stroke is smooth along its whole length, ends included,
and easy to edit. No eye flag over 3 except the intended corners and
cusps; peak |dk/ds| no higher than v5.4's on any stroke; at most 12 nodes
a stroke wherever the shape allows; within 1 u of the font's axis. Where
smoothness and fidelity to the font pull apart, smoothness wins inside
the 1 u budget.

## Order

1. **The exit ends (K959).** Find what bends o's and e's ends and fix it
   at its source. The frames were measured on the raster trace: check
   that they still match the new centreline, and re-derive them from it
   if not. Each end stays G2 with the join that leaves it.
2. **The eye flags and the peaks (K960).** For each flag over 3 and each
   stroke whose peak is above v5.4's: the cause, then a fix at the
   source, or a measurement showing it is the font's own shape and why
   the 1 u budget cannot smooth it.
3. **Few nodes (K961).** Test whether the frames have to be hard nodes
   (the joins could attach at a parameter along a cubic instead). At most
   12 nodes a stroke wherever the shape allows; G2 except at cusps and
   the a/g/q corners; within 1 u of the centreline (report the largest
   deviation). Where a stroke needs more, say why. Fix f's hairpin and
   a's evaluation cap on the way (K963).
4. **Build v5.6** as v5.5 was built (`work13/dbg/run_v55.ps1`): refit the
   joins, then rerun evar, fitp and tails, in that order. The titles say
   v5.6. Outputs:
   - `out14/cursive_v56.svg` (the template);
   - `cursive_v56_words.svg` (+ `.png`);
   - `combs_v56.svg`;
   - `cursive_v56_nodes.svg`: each letter's body at 3x the template's
     size, its nodes as dots, its node count beside it, no chart (what
     Levi will look at before editing);
   - the review PNG, which stays local.
5. **Checks.**
   - Rerun fidelity to the font, `split_check`, the eye check and the
     roughness check (the ceilings stay at v5.5's or tighten). Explain
     every result that changes, and every fidelity change over 0.25 u.
   - Combs at 288 DPI, v5.5 beside v5.6, for every stroke that changed
     and the words "minimum" and "hippo". Crop and look at each.
   - The stem tops stay at the V (`work13/vtops/`).

Not this stage: K944 (reading Levi's edits as drawn), K962 (the join seams
and the join regressions), K946, K948, K949, K937, K950's side-by-side and
capitals (K931). They come in the next stage, which runs while Levi
reviews.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k959.py`, copied from the latest versions.
  - Outputs go in `work14/` and `out14/`, and the record goes in
    `NOTES.md` `## v5.6` with its rerun commands.
  - Leave earlier versions' tools and outputs untouched.
- **K930's writer.** Every new curve goes through it: few nodes, G2.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`.
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
- **Crop and look** at your own renders before you call a visual fix done.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, if step 4 has not started, build v5.6 from what you
    have and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.6`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per stroke, v5.5 against v5.6: node count, roughness and peak
    |dk/ds| (and v5.4's peak);
  - K959-K961 and K963, each: the cause, the fix or why not, and a crop;
  - the eye flags and the fidelity changes, each explained;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.
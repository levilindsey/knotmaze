# K965: Cursive v5.7, smoother bodies before Levi's review (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: v5.6 (`docs/design/K959_cursive_v56.md`). Read its
`## Handoff`, and `NOTES.md` `## v5.6` in `.claude/probes/K863/trace/`,
before anything else.

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews,
the pipeline learns to read Levi's edits as drawn (K944), then Levi
hand-edits the template. After the hand edits the pipeline never changes
a body again. Levi: "I want them to even be smoother than you currently
have them."

v5.6 fixed the exit ends (K959) and lowered the peaks on 18 of 30
strokes. It left (ledger K960, K961, K963, K965):
- **K965, peaks and ceilings.** Peak |dk/ds| above v5.4's at f 9.90 (its
  end tie), k 6.58 (its leg), q 7.04 (its exit hook), r 8.88 (its start
  hook) and y 1.53; i rose from 2.88 to 4.83 (not located); o's exit turn
  is tight (6.90). q and r fail the roughness ceilings (q band 0.84,
  wobble 0.0168; r wobble 0.0203), and r's comb spikes where its start
  hook meets the shoulder (`work14/combs/crops/rows_18_r.png`).
- **K960, eye flags.** New: r@669 9.9, w@618 8.6 and k@2136 4.2. r@669
  and w@618 come with the band. Inferred: at these crotches the medial
  axis bends toward the ink junction, and the band pulls the curve onto
  that bend. k@2136 comes from the few-node fit.
- **K961, nodes.** 12 strokes have more than 12 (m 28, h 20, k 19, p 19,
  n 17, w 17, y 17, a 15, d 14, f 14, q 14, u 14).
- **K963.** f's hairpin sits 1.48 u off the axis, with three nodes in
  its last 23 u and a tighter turn than v5.5's.

The 1 u budget is what holds most of these: the smoothest band fair
inside it still peaks f 15.0, k 8.3, q 8.1, r 11.4 and y 6.1, and o's
softer exit turn sits 1.5-2.3 u off the axis.

**Coordinator's call (technical, from Levi's "smoother"):** the budget
widens to 2.5 u from the font's axis. That is inside the 3 u half-width
of the drawn line, so the line still covers the font's own centreline.
Inside the budget, smoothness wins over closeness to the font. o's exit
turn softens under it.

## Goal

v5.7: every body stroke is smooth along its whole length.
- Peak |dk/ds| at or below v5.4's on every stroke, and no stroke above
  its v5.6 peak unless a fix elsewhere costs it (explain each).
- q and r under the roughness ceilings, which stay at v5.6's or tighten.
- No eye flag over 3 except the intended corners and cusps.
- At most 12 nodes a stroke wherever the shape allows.
- Within 2.5 u of the font's axis, the writer's error included. Report
  each stroke's largest distance.
- Kept from earlier stages: the e and o ends (K959), the a/g/q stem tops
  at the font's V (K939), the joins G2 with the bodies.

## Order

1. **A reference that knows the ink junctions (K960).** Where the medial
   axis of the merged ink bends toward a branch point (crotches,
   bowl-to-stem joins, crossings), the band should not pull. Find those
   stretches from the axis itself (the branch's extent), then drop the
   band there and let the fair bridge them, or continue the pen path
   into them from both sides. Choose by the checks. Check: r@669 and
   w@618 are gone, and the bowl bottoms and stem feet are no rougher.
2. **The 2.5 u budget (K965).** Rerun the per-letter band choice under
   it. For each stroke above its v5.4 peak (f, k, q, r, y), i, o's exit
   and any new flag: the cause, then a fix at the source, or a
   measurement showing the font's own shape needs that turn even at
   2.5 u. Fix f's hairpin on the way (K963): a softer tie with its nodes
   spread.
3. **Few nodes (K961).** At most 12 a stroke wherever the shape allows,
   with the writer's tolerance chosen so that the total distance from
   the font's axis stays within 2.5 u. G2 except at cusps and the a/g/q
   corners. Where a stroke needs more than 12, say why. Remove k@2136's
   flag.
4. **Build v5.7** as v5.6 was built (`work14/dbg/run_v56.ps1`): refit the
   joins on the new end frames, then rerun evar, fitp and tails, in that
   order. The titles say v5.7. Outputs:
   - `out15/cursive_v57.svg` (the template);
   - `cursive_v57_words.svg` (+ `.png`);
   - `combs_v57.svg`;
   - `cursive_v57_nodes.svg`, as v5.6's (each body at 3x the template's
     size, its nodes as dots, its node count beside it, no chart);
   - the review PNG, which stays local.
5. **Checks.**
   - Rerun fidelity to the font, `split_check`, the eye check and the
     roughness check. Explain every result that changes, and every
     fidelity change over 0.25 u.
   - Combs at 288 DPI, v5.6 beside v5.7, for every stroke that changed
     and the words "minimum" and "hippo". Crop and look at each.
   - Crop and look at every changed letter at the nodes sheet's scale:
     it still reads as the font's letter. Name any that reads
     differently.
   - The stem tops stay at the V (`work13/vtops/`).

Not this stage: K944 (reading Levi's edits as drawn), K962 (the join seams
and the join regressions), K946, K948, K949, K937, K950's side-by-side and
capitals (K931). They come in the next stage, which runs while Levi
reviews.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k965.py`, copied from the latest versions.
  - Outputs go in `work15/` and `out15/`, and the record goes in
    `NOTES.md` `## v5.7` with its rerun commands.
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
  - At 1 h 30 min, if step 4 has not started, build v5.7 from what you
    have and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.7`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per stroke, v5.6 against v5.7: node count, roughness, peak |dk/ds|
    (and v5.4's peak) and the largest distance from the font's axis;
  - K960, K961, K963 and K965, each: the cause, the fix or why not, and a
    crop;
  - the eye flags and the fidelity changes, each explained;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

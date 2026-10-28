# K945: Cursive v5.5, smooth at the source (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stages: v5.3 (`docs/design/K930_cursive_smooth.md`) and v5.4
(`docs/design/K926_cursive_e.md`). Read both `## Handoff` sections, and
`NOTES.md` `## v5.3` and `## v5.4` in `.claude/probes/K863/trace/`, before
anything else.

## Why

Levi, 2026-10-27 (K928): "Yes, we need them to be smooth. I want them to
even be smoother than you currently have them. I can make them smoother
with my manual edits. After I hand-edit them, you should probably not
change them. Which is why I want to finish iterating with you BEFORE I
start hand-editing." Once Levi edits the template, the pipeline reads
those curves as drawn and never refits them (K944), so the smoothness has
to come from the pipeline before then. And on the stem tops (K939): "No.
We need to get rid of the U."

What v5.4 still has (K930 `## Handoff`, Open 3-5; ledger K945 and K939):
- The noise enters with the raster trace. The fair halves it, but the
  stems of m, a and p still S-wiggle, by more than the writer's 0.6 u
  budget. At 4x, a's stem bends, p's entry wobbles and p's bowl waves at
  the baseline.
- 17 of 30 strokes have more than 12 nodes (m 26, k 25, q 25, p 23, n 21,
  g 20, h 20, a 19, ...).
- Eye flags: b@3076 17.9, v@1879 12.9, t's cusp 5.6, p@3562 4.5,
  a@2317 3.16.
- The stem tops of a, d, g and q turn in a small U about 6 u left of the
  font's sharp V, since v5.2's dip fix (`work10/dip_tops.png`).

## Goal

v5.5: every body stroke smooth at its source and drawn with few nodes, so
the combs are clean with no smoothing pass, and the a/d/g/q stem tops come
to a point at the font's V.

## Order

1. **Baseline.** Per stroke on v5.4: the node count, the roughness check's
   numbers, the comb's peak |dk/ds| and the eye flags, into `NOTES.md`
   `## v5.5`.
2. **The centreline from the font's vectors** (K930's untried step 2).
   The font, `font/PlaywriteUSTrad[wght].ttf`, is variable, and its
   outlines are quadratic curves. Ways to try, judged by the result:
   - the medial axis of the exact outline, sampled densely from its curves
     (not from a raster);
   - the thinnest instance on the weight axis, whose two sides lie close to
     the skeleton;
   - extrapolating the weight axis toward zero width, if the design varies
     linearly with weight.

   The new centreline must give the later steps everything the raster
   trace gives them (the stroke splits, cusps, retraces, the fused
   junctions at 60 u and o's at 86 u, the frames), so the rest of the
   pipeline runs unchanged. The a/d/g/q stem tops are cusps at the font's
   V, with no U (K939). Report the roughness at each step against v5.4,
   and every place the centreline moves more than 1 u from v5.4's, with a
   crop and the reason.
3. **Few nodes.** Fit the new centreline with K930's writer: G2 except at
   cusps, within 1 u of the centreline (report the largest deviation), and
   at most 12 nodes a stroke wherever the shape allows. Where a stroke
   needs more, say why.
4. **Defaults.** `--split fair` becomes the default in every script (K928;
   blend stays an option). Write the template at 6 decimals or more (K930
   Open 2).
5. **Checks.**
   - Rerun fidelity to the font, `split_check`, the eye check and the
     roughness check, and explain every result that changes.
   - Each eye flag above is fixed or explained.
   - Tighten the roughness ceilings to v5.5's worst stroke.
   - Combs at 288 DPI, v5.4 beside v5.5, for a, b, d, e, g, m, p, q, t, v
     and w and the words "minimum" and "hippo". Crop and look at each.
6. **Build v5.5** as v5.4 was built (`work12/dbg/run_v54.ps1`). Rerun
   evar, fitp and tails, in that order, after the template changes (K951),
   and make the titles say v5.5. Outputs:
   - `out13/cursive_v55.svg` (the template);
   - `cursive_v55_words.svg` (+ `.png`);
   - `combs_v55.svg`;
   - the review PNG, which stays local.

Not this stage: K948 (the o-entry e's elbow), K950's side-by-side, K946
(the generator's hooks), K949 (joins off the font), K944 (reading Levi's
edits as drawn) and capitals (K931). They come in the next stage, before
Levi reviews.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k945.py`, copied from the latest versions.
  - Outputs go in `work13/` and `out13/`, and the record goes in
    `NOTES.md` `## v5.5` with its rerun commands.
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
  - Stop when steps 1-6 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 40 min, if step 6 has not started, build v5.5 from what you
    have and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.5`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per stroke, v5.4 against v5.5: node count, roughness and peak
    |dk/ds|;
  - what you tried for the centreline, what you chose and why;
  - the eye flags and the fidelity changes, each explained;
  - the stem tops: their distance from the font's V, with a crop;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K945's current handle fields.

## Handoff

Stage agent, 2026-10-27 20:49-22:24 (stopped with steps 1-6 done, before
the 22:49 cap). The full record and every rerun command are in
`.claude/probes/K863/trace/NOTES.md` `## v5.5`; nothing is committed.

- **Done.** v5.5 is built (`work13/dbg/run_v55.ps1`, every step exit 0):
  `out13/cursive_v55.svg`, `cursive_v55_words.svg` + `.png`,
  `combs_v55.svg`, and `cursive_v55_review.png`, which holds the chart
  and stays local.
- **Centreline.** The exact medial axis of the wght-100 outline
  (`tools/medial_k945.py`), snapped onto the raster trace's routing. The
  raster trace takes over across Y-junctions. Cusp ends are trimmed and
  carried straight. a, g and q get a corner at the V.
  - Rejected: zero-width extrapolation. The sides stay 5-10 fu apart.
- **Stem tops (K939).**
  - a, g and q's node sits at the font's V: 0.13, 0.26 and 0.00 u from
    it, with turns of 91, 86 and 84 deg. v5.4's nearest node was about
    7 u away, in a U.
  - d starts at its cusp, 0.00 u from the V.
  - Crop: `work13/vtops/vtops.png`.
- **Nodes and smoothness.**
  - Nodes: median 13 -> 14, max 26 -> 27. The largest deviation is
    0.95 u.
  - The roughness check passes. Its ceilings are tightened to v5.5's
    worst stroke (band 0.72, wobble 0.016, facet 0.0053). Under them,
    v5.4 fails p, r and t.
  - Eye check: the median p90 |dk/ds| goes 144 -> 127.
- **Fidelity.** The mean join distance to the font goes 1.996 -> 1.865 u
  (28 joins better and 10 worse, by more than 0.25 u).
- **Open, for the next stage.**
  - o's last 15 u before its exit lean 3.1 u inside the stroke and end
    in a short hook. The fair is the cause; raising its evaluation cap
    is not the fix (tested). Inferred: the held exit frame.
  - The exit-curl flags on b, v and w grew. They are the same spots as
    v5.4's.
  - p@621 is a new flag: p's entry hook.
  - The comb spikes at the join seams in "minimum" and "hippo".
  - e's comb has a new tail at its exit end. The last 5 u turn 8 deg,
    against 1 deg in v5.4 (radius 17 u at the end); the cause is not
    tested.
- **Next.** Fix o's exit end in `bodies_k945`, then refit the joins and
  rerun `run_v55.ps1`. Then look at the b/v/w exit curls and p's entry.

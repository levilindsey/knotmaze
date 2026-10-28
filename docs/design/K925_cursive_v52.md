# K925: Cursive v5.2, the a/g/q dip, then fairing Levi's edits

Stage brief (coordinator, 2026-10-27). Parent: K863. Previous stage: K916
(`docs/design/K916_cursive_v51.md`). Read its `## Handoff`, then
`.claude/probes/K863/trace/NOTES.md` `## v5.1`, before anything else.

## Where v5.1 stands

The coordinator compared v5 and v5.1 crop by crop at 288 DPI. The crotches
are now clean tangent forks at a, d, g, q, u, y, n, m, h and w. The hooks
at the stem bottoms of n, m and h and at the tops of u and w are gone. q's
exit jog is gone, and words that start with a, c, d, g, o or q lead in
from the left. Levi's rule still stands: "I'm going to want our eventual
letter strokes/threads to look smooth and continuous", with no bump where
an overstroke starts or stops.

One new artifact. fair bends the bowl's top line of a, g and q into a
dip ("~") just before the stem-top cusp, where the fused overstroke turns
back. v5 had a small hook there instead. See
`.claude/probes/K863/trace/work10/coordinator_dip_tops.png` (v5 left,
v5.1 right) and the "a cusp y 120 u" panel of `out9/split_combs.svg`,
where the curvature is a deep V. It will read as a bump.

## Order

1. The dip. Look at the font's outline at that spot at high zoom first.
   If the font does not dip there, remove the dip in the fairing (for
   example, hold the curvature's sign up to the cusp). Show crops of a, g
   and q in v5, v5.1 and the fix, side by side at 288 DPI.
2. The eye check's scale. `split_check` divides by each letter's own p90
   |dk/ds|, and a cusp inflates that (a: 1524 in v5, 619 in fair, against
   about 60-200 for the others), so a's crotch never flags (0.25 and 0.44)
   although Levi saw the bump there. Give the check a scale that a cusp
   cannot inflate, rerun it on v5, v5.1 and the fix, and say which passes
   change. It must flag v5.1's dip.
3. Handoff Open item 1: run Levi's edited strokes through the fairing on
   the `--from-svg` path (the same `--split` switch), rerun the from-svg
   line, and compare it with the direct run.
4. Handoff Open items 3 and 4: the tops of b, v and w and p's entry and
   loop (curvature ratio over 3), then the hooks left at body-end cusps
   (c 3.89, d 5.51, p 3.60).
5. For K917, data only: with o's junction at 86 u (`work9/fair_86`),
   measure every pair into o against 60 u, not only eo, so Levi can decide
   whether o's junction moves.
6. Build v5.2: `out10/cursive_v52.svg`, `cursive_v52_words.svg`, the
   review PNG and `split_combs.svg`. Fix the template's title and header
   (v5.1 still says "Cursive v5 (K904)"), and the clipped section titles
   on the K917 sheet if you rebuild it.

Not this stage: the generated e and the joins fair made worse (K926), the
fits stopped at nfev 600 (K927), Levi's calls (K917, K928).

## Rules

- New tools as `tools/*_k925.py`, copied from `*_k916.py`. Outputs go in
  `work10/` and `out10/`, and the record in `NOTES.md` `## v5.2` with its
  rerun commands. Leave v5.1's tools and outputs untouched, so its rerun
  stays byte-identical.
- fair stays behind `--split fair`; blend stays the default until Levi
  accepts fair (K928).
- Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`. Read code
  through the shell (`Select-String`, then `Get-Content | Select-Object
  -Skip -First`).
- Levi's chart (`ref/chart.jpg`) is never committed, uploaded or embedded
  in an SVG, and the review PNG contains it. Upload nothing: the
  coordinator uploads the SVGs.
- Everything lives in the untracked probe directory, so there is nothing
  to commit, and `LEDGER.md` is the coordinator's. Don't touch other
  tracked files.
- Crop and look at your own renders before you call a visual fix done.
- Stop when the stage is done or 2 h after your start, whichever comes
  first (`Get-Date` at the start and at each milestone). A compaction is
  not a stop: after one, re-read this brief and `NOTES.md` `## v5.2`. On
  stopping, append a `## Handoff` to this brief (the coordinator commits
  it) and report, ending with a `Ledger items` list.

## Redirect (coordinator, 2026-10-27 16:05)

Levi answered K917 ("sgtm"): the fused junction stays at 60 u for a, c, d,
g and q, and o's moves to 86 u if the other pairs into o agree. So step 5
is no longer data only. Give the build a per-letter junction height
(`--fuse-y` is one height for all six), and measure every pair into o at
60 u and at 86 u. If the pairs into o are closer to the font on average at
86 u and none gets worse by more than 0.5 u, build v5.2 with o at 86 u
and the rest at 60 u. Otherwise keep 60 u and list the pairs that get
worse. Either way, put the table in `NOTES.md` `## v5.2` and the handoff.

## Redirect 2 (coordinator, 2026-10-27 16:40)

Levi looked at K917's sheet and chose the set with o's junction at 86 u:
"Seems better than the other two sets". So v5.2 has o at 86 u and a, c,
d, g and q at 60 u, whatever the 0.5 u gate above says. Keep the table of
every pair into o at both heights in `NOTES.md` `## v5.2` and the handoff,
and crop any pair that looks worse at 86 u. That sheet's `--fuse-y 358`
was global, so video's d sat at 86 u too: d stays at 60 u unless Levi says
otherwise. The jitter Levi saw in v5.1 belongs to the next stage (K930,
`docs/design/K930_cursive_smooth.md`): don't start on the writer.

## Handoff (K925 agent, 2026-10-27 16:55)

Stage done; stopped at 16:55 (cap 17:32). Nothing is committed. The
work is in the untracked `.claude/probes/K863/trace/`, and its
`NOTES.md` `## v5.2` (lines 766-953) records it, with rerun commands.
v5.2 is the `--split fair` build with o's junction at 86 u and the
junction of a, c, d, g and q at 60 u (`work10/fair_o86/`, built by
`work10/dbg/run_fair_o86.ps1` and `run_v52_o86.ps1`). Its bodies are
byte-identical to the all-60-u build's (`work10/fair/`); only o's
junction frame and the join refit differ. Blend stays the default
(K928). I did not touch node density or the dense-cubic writer (K930).

Before -> after:
- Step 1, the dip: fixed. The fused body start is now faired free
  (`--fair-fused-start free`, the default; `held` rebuilds v5.1's), and
  the "~" at the stem tops of a, c, d, g and q is gone
  (`work10/dip_tops.png`). On the fixed eye scale, v5.1 -> v5.2:
  a 9.27 -> 1.91, c 7.99 -> 0.16, d 4.38 -> 0.17, g 6.24 -> 1.92,
  q 8.09 -> 1.92. The font's V becomes a U whose bottom sits about 6 u
  left of the V's.
- Step 2, one eye scale: 200 /Mfu^2, flagged above 3, plus both sides of
  every cusp. Passes over 3, v5 / v5.1 / v5.2: 18 / 7 / 7. Cusp sides
  over 3: 35 / 12 / 7. Still flagged: the tops of b, v and w, p's entry
  and loop, r@668, and t's cusp.
- Step 3, Levi's edits: `words_k925.py --from-svg <svg> <map> --split
  fair` fairs only the strokes he changed. An unedited copy reads back
  within 0.010 u on all 68 rows, and the faired edits pass the eye
  check. However, the fairing's length scale (30 fu) also undoes
  deliberate edits: it keeps only 23% of a 3 u node drag.
  `--fair-ell 15` keeps 38% and passes; 8 keeps 70% and fails. The
  default stays at 30.
- Step 4, hooks, v5.1 -> v5.2: a 2.08 -> 1.40, c 3.89 -> 0.98,
  d 5.51 -> 0.28, g 0.04 -> 2.09, q 0.42 -> 1.37. p is unchanged at
  3.60.
- Pairs (126), v5.1 -> v5.2: mean 3.09 -> 3.08 u, median 1.65 -> 1.68,
  over 4 u 13 -> 12. Worse by > 0.5 u: nd 1.22 -> 2.31, ng 1.08 -> 2.13,
  do 1.73 -> 2.70. Better by > 0.5 u: eo 5.14 -> 1.16, br 6.17 -> 5.53.
- Words: the joins are G2. Crossings 4 -> 9. The four old ones remain
  (ve in woven, cursive and over at 21 deg; knotmaze's ot at 15 deg).
  Four of the new ones are joins into o that cross o's start at under
  20 deg, where the font's own connectors cross too (hippo's po,
  knotmaze's no, brown's ro, dog's do). The fifth is the lead-in to
  over's o.
- The template checks and the Inkscape export are unchanged from the
  all-60-u build: smallest clearance 26.1 u, round trip within 0.114 u,
  exit 0.

K917, every pair into o (deviation in u from the font's connector; the
full table is in NOTES). Columns: 60u (all six at 60 u), o86 (v5.2) and
all86.
- Mean: 7.83 / 7.88 / 7.71.
- Mean without zo: 2.467 / 2.515 / 2.335. zo reads 142 u in all three:
  its reference connector is probably the wrong one (not checked).
- Median: 1.995 / 2.375 / 2.395. `into_o_cmp.py` prints the upper of
  the two middle values: 2.00 / 2.46 / 2.40.

o86 against 60u: 19 pairs move by 0.5 u or less.
- Worse by more than 0.5 u: ho 1.78 -> 2.87, to 1.76 -> 2.84,
  io 1.70 -> 2.73, do 1.71 -> 2.68, mo 2.18 -> 2.77.
- Better: eo 5.11 -> 1.13, co 6.95 -> 5.98.

The redirect's gate failed on both counts, and o86 was built on Levi's
call. Inferred, not tested: those five pairs, and nd and ng above, all
use cnct.mod_n_o. That is the entry class of all six fused letters, so
one refit of it now has to serve two junction heights. ao, no and qo use
it too and move less (+0.13, -0.04, +0.30), so the cause is still open.

No pair looks worse at 86 u. The crops:
- `work10/k917/worse_overlay_grid.png`: each join at 400 DPI, labelled
  60u -> o86, with the 60 u connector drawn wide in blue under v5.2's
  red, over the font's grey fill.
  - ho, to, io, do and mo ride about 1 u off the 60 u line, then run up
    o's left side to 86 u.
  - nd and ng ride about 1 u to the other side.
  - Every one stays inside the font's fill.
  - eo is clearly better, and co slightly better.
- `work10/k917/worse_crops.png`: the same nine pairs as words from both
  builds, side by side at 288 DPI. It is cut into
  `work10/k917/look/worse_{1,2,3}.png`.
- `work10/dbg/look/ow_<word>_<k>.png`: the word sheet's o-words, with
  60u above v5.2 (bow, woven, boxes, people, hippo, knotmaze, brown,
  dog).
- `work10/dbg/look/o_cell_ab.png`: o's template cell, where the junction
  moves from 60 u to 86 u.

Outputs: v5.2 is in `out10/`. The files to upload are `cursive_v52.svg`
and `cursive_v52_words.svg`. Also there: `cursive_v52_words.png`,
`split_combs.svg` and `split_check.txt`. The all-60-u build's outputs
are in `work10/fair/out60/`. Both copies of `cursive_v52_review.png`
contain Levi's chart: never upload or commit them.

Open:
- Levi: K928 (fair as the default; v5.2 is built with it).
- Split the refit of `cnct.mod_n_o` by junction height, to win back ho,
  to, io, do, mo, nd and ng.
- Edit fairing: hold the nodes Levi moved and fair the rest around them
  (decide together with K928).
- Eye flags over 3: the tops of b, v and w; p's entry and loop; r@668;
  t's cusp.
- The U at the fused stem tops sits about 6 u left of the font's V.
- 16 of 26 letters stop at the nfev 600 cap, as in v5.1, except that a
  now converges and q now stops at the cap.
- zo's reference connector (142 u at every height).
- Next stage: K930's few-node G2 writer (`docs/design/K930_cursive_smooth.md`).

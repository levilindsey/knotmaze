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

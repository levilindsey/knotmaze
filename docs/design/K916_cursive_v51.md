# K916: cursive v5.1, the join refit, leads and tails, the generated e (agent brief)

Coordinator, 2026-10-27 13:35. One stage, opus, 2 h cap. Follows K904
(`K904_cursive_v5.md`, its `## Handoff`). v5 is in
`.claude/probes/K863/trace/out8/` and on Drive as `K863/cursive_v5.svg`.

## Why

v5 removed the bumps where an overstroke starts or stops: the split
curvature ratio peaked at 120.5 in v4 and 4.8 in v5. It also built the
fused entries and the high entry mode. But its join refit made some
pairs worse, and K904's steps 4 and 5 (leads and tails, the generated e)
never started. Levi edits v5's template next, and his edits come back
through `--from-svg`. The generator around the template should be at its
best by then.

Binding (`K863_trace.md` ## Levi's calls):
- Strokes and threads are smooth and continuous, with no bump where an
  overstroke starts or stops.
- Each letter has two entry modes.
- a, c, d, g, o and q are fused at a junction about 60 u up.
- The generator makes every variant.

These calls are still open for Levi. Keep both ways of each behind a
switch, with today's defaults:
- the fused junction's height: 60 u, or the font's own
  (`--fuse-junction`);
- the junction after e: the font's e-to-o connector merges near 86 u.

Levi chose the dip for r after a high exit (K901): r dips the way the
font's does. `--r-straight` can stay as it is, with no further work.

## Setup

- Everything is in `.claude/probes/K863/trace/` (untracked). Read
  `NOTES.md` `## v5` and K904's `## Handoff` first.
- v5's tools are `tools/*_k904.py`. Write v5.1's as `tools/*_k916.py`
  (copies, so v5 still reruns), and its outputs to `work9/` and `out9/`.
  Leave `work4`-`work8` and `out4`-`out8` as they are.
- Keep v5's template format. Levi may edit `cursive_v5.svg` while you
  work, and v5.1's `--from-svg` must read his edits unchanged.
- The font, `OFL.txt`, the venv and Inkscape are as in K904. Run Python
  with the venv's interpreter and `-I`, scripts from `tools/`, and data
  paths as arguments.
- The chart (`ref/chart.jpg`) is for review sheets only. Never commit it,
  upload it alone or ship it, and keep it out of every SVG.
- View images as small crops (1000 px or less, cut by script into
  `work9/dbg/`), never whole sheets. Keep `NOTES.md` current under a new
  `## v5.1` heading.

## Order

1. **The join refit** (`join_k904.py`, K904's ledger item 1):
   - Start the class and (class, right letter) fits from several points,
     v4's coefficients among them.
   - Fit the pairs that use another letter form after a high exit on
     their own, or split the high-smooth group by exit class.
   - Make the per-pair best a multi-start search, so it bounds the fits.

   These pairs got worse in v5:

   | pair | v5 (u) | target (u) |
   |---|---|---|
   | wn | 5.1 | per-pair best 1.5 |
   | bn | 4.7 | per-pair best 1.4 |
   | on | 4.2 | per-pair best 1.1 |
   | of, ol, ob | 3.9 | v4's 2.0-2.4 |
   | om | 3.1 | v4's 1.5 |
2. **Fused entries, measured with their retraced stretch.** eo reads
   27.6 u from the join alone and 5.8 u with the stretch.
3. **The splits still above ratio 3:** b@3243 (4.8), k@2133 (3.8),
   v@2044 (3.3), k@2765 (3.2) and w@3247 (3.0). Crop each, v4 against
   v5, and smooth any that still shows a bump. Report how far the curve
   moves off the trace there; in v5 it moves up to 3.73 u inside the
   split windows.
4. **Leads and tails** (K904 step 4):
   - A lead runs from a free end left of the entry whose path leaves the
     body; if there is none, the letter has no lead-in.
   - A tail runs from the free end that leaves along the exit tangent; if
     there is none, the letter has no tail.

   v4's references were wrong: b's tail by 138 u; the leads into a by
   61.5, u by 52.1 and z by 25.3 u; the tails after p by 35.8 and c by
   26.4 u.

   The steep connector-body crossings (20 deg or more) rose from 14 to
   17:
   - leads into the fused a, d and q, across their bowls;
   - tails after s, d and x;
   - ot, at 34 deg.
5. **The generated e** (K904 step 5): after o, b, v, w and z, bend the
   loop toward the font's variant, and keep the exit stretch and its
   frame fixed. Report the distance to the font's variant over the body.
   Then do the other forms of t and n (ot; on, wn, bn), or confirm they
   need no bend.
6. **Rebuild as v5.1** with K904's checks, every table v5 against v5.1:
   - `out9/cursive_v51.svg`;
   - `out9/cursive_v51_words.png`, and the same sheet as `.svg` with no
     chart;
   - the `--from-svg` rerun;
   - `out9/cursive_v51_review.png`.

Steps 1-3 come first. Write every rerun command at the end of `NOTES.md`
under "### Rerun commands (K916 v5.1)". Check them with
`work9/dbg/rerun_check.ps1`, which stops at the next `###` heading.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-6 are done or 2 h after the start, whichever comes first. A
  compaction is not a stop: after one, re-read this brief and `NOTES.md`'s
  `## v5.1` before going on.
- No commits, no Drive uploads (the coordinator uploads the SVGs), and no
  npm or repo dependencies.
- No edits to tracked files. The one exception: if the stage stops
  unfinished, append a `## Handoff` to this brief and leave it
  uncommitted, for the coordinator.
- Never touch processes you did not start, and never use Levi's Chrome
  profile.
- Use PowerShell for local commands. Read repo code through the shell
  (`Select-String`, `Get-Content | Select-Object`).
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives:
  - what was built;
  - the check numbers for v5 and v5.1;
  - the pairs still over 4 u, with a cause for each;
  - the rerun commands;
  - a `Ledger items` list (follow-ups, residuals, decisions for Levi).

## Redirect (2026-10-27 14:05)

Levi on v5, two reports. Both come before the join refit.

- "I still see a discontinuous crotch curvature in most of the same
  letters." The coordinator's crops agree. Each arch of n and m leaves
  its stem with an elbow. In a, d and q the bowl's closing curve bends
  hard where it joins the stem. The tops of the retraced stems (a, q, u)
  show small hooks.
- "words starting with a, q, and d have initial entry segments coming in
  from the right to the left to reach the start of the first letter's
  stroke." In `cursive_v5_words.svg` (and, quick, dog) the lead starts at
  the letter's own foot and crosses the bowl to the 60 u junction on its
  left side.

Why the split blend still shows: each window has to make the whole turn
from the shared stretch's direction to the branch's (the font's crisp
crotch angle). It does so within about 17 u (`W_SHARED`, 70 fu) and
inside the font's ink, so the curvature piles up mid-window. That is G2,
but the eye reads the spike as a corner. The check passed it because it
compared the window's peak |κ| with the letter's p95 |κ| away from
splits, and hump tops, bowls and cusps set that p95. An elbow on a
near-straight stroke scores low.

New order. It replaces Order steps 1-6 until it is done; then return to
them as time allows.

1. **Fair each pen stroke as a whole.** Replace the per-split blend with
   one curve per stroke that minimizes the variation of curvature
   (∫(dκ/ds)² ds or a discrete equivalent; use a better energy if you
   find one). A soft pull toward the font's centreline replaces the 1 u
   bound.
   - Every retraced or fused stretch is shared exactly by its passes, and
     each pass is G2 through every split.
   - A split point may slide along its stretch: smooth passes part
     slowly, so a crotch becomes a long, narrow V. The fused junctions
     stay at Levi's 60 u.
   - Per split, report the node and where the passes visibly part (their
     centrelines 6 u apart, the template's stroke width).
   - A cusp (a pen reversal) stays a clean point: the passes coincide up
     to it, with no hook.

   Put it behind a switch, `--split blend|fair`, with `blend` the default
   until Levi accepts the look; v5.1's sheets use `fair`. `--from-svg`
   runs Levi's edited curves through the same fairing.
2. **A check that matches the eye.** Per split and per pass, over the
   window and 40 u either side:
   - the curvature profile, and the max |dκ/ds| against the same pass's
     p90 away from splits and cusps;
   - any sign change of κ that the pass lacks outside the window.

   Also `out9/split_combs.svg`: every split, and every cusp at the end of
   a retraced stretch, cropped, v5 against `fair`, with curvature combs.
   Report how far `fair` moves each letter off the font's centreline (max
   and mean) and the pair distances, v5 against `fair`.
3. **Leads into the fused letters.** A lead into a, c, d, g, o or q rises
   from the baseline on the left into the junction, shaped like a low
   connector from a virtual exit. No lead or tail may cross its own
   letter's body. Check that, and list the steep crossings that remain
   (tails after s, d and x; ot).
4. Then, in order:
   - Order step 1, the join refit, on the faired bodies;
   - Order step 6, v5.1 built with `fair`;
   - a K917 sheet, `out9/k917_junctions.svg`, all faired: eo with o's
     junction at 60 u and at the font's 86 u, and c, d and g at 60 u and
     at their own heights.

   The new check replaces Order step 3 (report the ratio-3 splits under
   it). Order step 5 waits.

The stop rule is unchanged: 2 h from your start.

## Handoff (2026-10-27 15:00, the K916 stage agent)

Stopped at the cap with the redirect's items 1-4 built except one piece of
item 1, and Order step 5 waiting as the redirect says. Nothing is
committed. Everything is in `.claude/probes/K863/trace/` (untracked):
tools `tools/*_k916.py`, outputs `work9/` and `out9/`, and the record in
`NOTES.md` `## v5.1` (`### Status`, `### Results`, `### Rerun commands
(K916 v5.1)`, which `work9/dbg/rerun_check.ps1` runs line by line).

Done:
- Item 1: `tools/fair_k916.py` (its header is the spec), behind
  `bodies_k916 --split blend|fair`, blend the default. v5.1 uses fair
  (`work9/fair`). Off the trace: max a 5.03 u, q 4.03 u, the rest
  under 3.5 u; means 0.07-0.47 u.
- Item 2: `tools/eye_k916.py`: `out9/split_check.txt`,
  `out9/split_combs.svg`. Passes over ratio 3: v5 17 of 48, fair 7.
  Retrace-cusp hooks 0.62-12.46 in v5, 0.04-0.32 in fair.
- Item 3: `gen_k916.virtual_lead` (`words_k916 --fused-lead
  virtual|none`, virtual the default). A word starting with a, c, d, g,
  o or q gets the low connector a virtual n would make into the
  letter's junction. No lead or tail crosses its own letter. Crossings
  left: ve into e's body at 21 deg (font: no) and ot at 15 deg (font:
  yes); the tails after s, d and x no longer cross.
- Item 4: the join refit on the faired bodies, the v5.1 sheets
  (`out9/cursive_v51.svg`, `_words`, `_review`) and
  `out9/k917_junctions.svg`.

Open, in order:
1. `--from-svg` reads Levi's edited curves as drawn. It does not run
   them through the fairing yet (item 1's last sentence). Next: in
   words_k916's from-svg path, fit each edited stroke with fair_k916
   (the same switch), then rerun the from-svg line and compare it with
   the direct run.
2. Order step 5, the generated e: the cause of ze 66.9, be, ve and oe
   (about 31 u), en 7.1 and er 8.4.
3. Over ratio 3 in fair: the tops of b, v and w (each body ends before
   its passes part 6 u), and p's entry and loop (p@621 23.6, p@3562
   pass 2 13.9).
4. Cusps at a body's end keep some hook (c 3.89, d 5.51, p 3.60).
5. 16 of 26 letters stop at nfev 600 (status 0); a and q move 5.0 and
   4.0 u off the trace.
6. For Levi: the fused junction's height (60 u, or `--fuse-junction
   font`), and e into o: at 86 u (`--fuse-y 358`) eo reads 1.13-1.18 u,
   against 5.14 u at 60 u.

Rerun check (14:55-15:11): `work9/dbg/rerun_check.ps1` ran the 18 rerun
command lines verbatim, every one exit 0, and all 27 watched outputs came
out byte-identical; the from-svg copy matches the direct run within
0.010 u (`NOTES.md`, the paragraph after the rerun commands).

Restart: re-read this brief and `NOTES.md` `## v5.1`, then take Open
item 1.

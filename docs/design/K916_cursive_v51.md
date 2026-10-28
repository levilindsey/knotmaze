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

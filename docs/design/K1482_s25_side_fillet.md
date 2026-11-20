# K1482 stage 25: where two outlines run together with no corner (K1528; Claude agent stage)

**Queued behind stage 24** (`docs/design/K1482_s24_tick_step.md`): one code agent at a time in
`src/render/gpu_field/`. Start only when the coordinator says stage 24 has landed or stopped.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
The 14 sites he named on link A are in `The sites` of `docs/design/K1482_s20_wedges_notches.md`.

This stage takes the four sites where **two outlines converge and no corner exists**, so no corner ball is
ever built and the two strokes run together into a dark patch or a pointed V:
- **t59s** (wedge): one chain's two sides converge at a twist's foot.
- **j15** (wedge): the Z spike at the right; the +1 sides of chains 70 and 5 converge with no corner within
  30 px.
- **t58e** (notch): the second V, at centre right.
- **t23e** (wedge): the patch between two chains' sides.

Read `### Handoff K1482 s21` in `docs/design/K1482_s21_corners_rest.md` (the site table and its last list)
and `### Handoff K1482 s22` in `docs/design/K1482_s22_landable_corners.md` (the class table). Stage 21's
starting idea was a new corner kind, a side-to-side fillet. If time remains, **j41** (notch: a sharp ">" on
the right outline that a 0.26 h first-pass corner keeps; retrying it changes nothing visible) is yours too.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill. `gfk=1` turns on the second corner try (stage 23), off by default.

## The goal

On link A, switch off and switch on: at the four sites the two outlines meet in **one clean join** (a round
or a clean point, the stroke at its own width) with no solid patch, spike, stub or gap, and the fill does not
move. Nothing else on link A or on the bar's four mazes gets worse. You own the technique. The cause is not
the finish line: a stage that ends with a diagnosis and nothing in `src/` has not reached the goal while time
remains. If the join you can build is a shape Levi has not seen (a round where today shows a point at places
he did not name), build it, count those places and show the ten largest: that becomes his look question, not
a reason to stop.

## Done

- **By eye**, the four sites (and j41 if taken), context crop and detail crop, today | new, switch off and on.
- **Link A**, loads of one state and one view (pin the background clock; stage 21's handoff, `The 76,609 px
  fill difference`; report the floor first): every place outside the sites where the border look changes is
  counted, the ten largest are on a sheet (surrounding threads with a red box, then the box closer; today |
  new) and judged by eye; the fill look 0 px, or each place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s25`: new 0 and grown 0; each
  gone find shown as a fault the fix removed.
- Under the perf lock on your tip: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`; both
  dragchecks; `npm test` green (a pin that moves is re-frozen in the same commit and named in its message).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge origin/master` in your worktree first. Then as stage 24's `How to work`, with these changes:
ports 6110-6129, profiles `$env:TEMP\k1482s25-*`, probe directories `.claude/probes/K1482/s25` and
`.claude/probes/K1482/out/s25` (untracked: do not `git add` raw captures or dumps).

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s25` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.

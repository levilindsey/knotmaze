# K1482 stage 32: t84e's wedge, by giving the corner's own fold paper (K1526; Claude agent stage)

**Started 2026-11-20 05:45** on master c83dc2588, after stage 31 stopped with nothing in `src/` (its band-end
rule, runT, cleared j59's step but tapered t81s, t76e, t53e and t36s: `### Handoff K1482 s31` in
`docs/design/K1482_s31_j59_band_end.md`; do not shorten those wedges). Stage 30's tools are tracked in
`.claude/probes/K1482/s30`. Agent worktrees are siblings: use absolute paths.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
t84e is one of the 14 sites he named on link A (`The sites` in `docs/design/K1482_s20_wedges_notches.md`; his
sheet `.claude/probes/K1490/out/k1490_wedge.png` in the coordinator worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a`).

## The site

**t84e** is at 1554,914 on the 3200x1800 frame of link A; the wedge is near 1541,940. Where corner k159 meets
chain 84's outline a dark patch fills the angle between the two outlines: they should each run on at their
own width with paper between them. Picture: the `t84e` row of `.claude/probes/K1482/cards/s29_landed.png`
(coordinator worktree; before = now, stages 29 and 30 did not move it).

Three stages found what the patch is and no fix. Read `### Handoff K1482 s29`
(`docs/design/K1482_s29_corner_side_wedge.md`), `### Handoff K1482 s28`
(`docs/design/K1482_s28_crossing_outline_corner.md`) and the corner entries of
`.claude/rules/render-gpu-field.md` first. In short:

- The patch is k159's own-fold piece band against chain 84. It is ink that has to become PAPER: no rule that
  only adds ink, and no burial of one band under another, makes it.
- The home burial (stage 28) does not reach it: the ink belongs to a corner, not to a piece outside every
  group. t84e has no retry corner, so a smaller ball does nothing either.
- The pocket incircle (`GF_KXO`, stage 28) moved 0 px here and turned 22 points elsewhere into rounds.
- The own-fold variants of stage 29 left a flag; its side-face burial along a tangent run, with a tolerance,
  left a flag tick and a hairline here and removed a whole outline to the left.
- Stage 27's fold shift (a side point inside its own piece's tube is buried by another piece only past that
  fold) is the nearest working rule of the kind: t4s's pinhole.

**First step:** stage 28's `wmap28.ts` over the patch (who draws each of its pixels, on the CPU copy), then
build the candidate there, where a try costs seconds: stage 29's tools are in
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af74bc71e7b05839a\.claude\probes\K1482\s29`
(`hb29.ts`, `spine29.ts` with BOX, `mimg29.ts`; `capseq28.ps1`, `diff28.ps1`, `sheet27.py`, `run29.ps1`
capture, diff, make sheets and run the guards), stage 30's are tracked in `.claude/probes/K1482/s30`; copy
what you use, change nothing in another worktree.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). `&tlk=border` draws the
outlines only, `&tlk=fill` the fill; `&gfk=0` turns the second corner try off. A Node build leaves it off
unless env `GF_KRETRY=1` (K1536): set that for a Node probe and for the bar, and clear it before `npm test`.

## The goal

On link A as it loads: t84e's patch is gone, the two outlines there each run on at their own width and meet
without a flag, tick or hairline, and the outline to the left of the site is whole; the fill does not move.
With `&gfk=0` nothing gets worse. Nothing else on link A or on the bar's four mazes gets worse: a clean round
turned into a point, a clean point rounded, or an outline that loses ink at a joint corner is a failure, and
a changed shape at a place Levi did not name is his to judge: list it and say what it looked like before and
now. You own the technique: if the first candidate fails, say what it did at the site and try the next. A
stage that ends with more diagnosis and nothing in `src/` has not reached the goal while time remains. j47
and j59 are NOT this stage's: leave them.

## Done

- **By eye**: t84e, context crop and detail crop, today | new, as it loads and with `&gfk=0`, contrast
  stretched (the outline is only about 15 levels darker than a pinhole inside it).
- **Link A**, loads of one state and one view (compare the image hashes of repeat loads first, K1539; report
  the floor), made **before** you commit anything as a fix: every place outside t84e where the border look
  changes at a luminance step of 1 is counted, the places that only gain or only lose ink counted separately;
  the ten largest are on a sheet (surrounding threads with a red box, then the box closer; today | new) and
  judged by eye; the fill look 0 px, or each place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` master's SHA at your start, `-Tag k1482s32`: new 0, grown 0.
- Under the perf lock (`scripts/perf_lock.ps1 -MaxWaitMin 60`, each wait in ONE blocking command): `hold.mjs`
  60/60 on link A, as it loads and with `&gfk=0`; `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks.
  `npm test` green, run WITHOUT the lock (a pin that moves is re-frozen in the same commit and named in its
  message). Each guard's whole output kept in a file.
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge --ff-only origin/master` in your worktree first. Ports 6250-6269, profiles `$env:TEMP\k1482s32-*`,
probe directories `.claude/probes/K1482/s32` and `.claude/probes/K1482/out/s32` (untracked: do not `git add`
raw captures or dumps). Pass `&snd=none` in every look capture; never Chrome's `--virtual-time-budget`. The
border look under gf is gf's own: today's renderer's border strokes are no bar. Read code through the shell
(`Select-String`, a range of `Get-Content`); use the Read tool only on a file you are about to edit. No
helpers. Commit WIP at every milestone, broken or not, and add two or three handoff lines here each time.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; start the guards by 75 minutes in. A compaction is not a stop:
re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s32` here, commit, and
report: the commits to land by SHA in order, what changed at the site by eye, the numbers, each guard's result
with the path of its whole output file, the sheets' absolute paths, a `Ledger items` list and K1482's handle
fields. Never push, never edit `LEDGER.md`.

### WIP K1482 s32 (06:15)

- Mirror only so far (`.claude/probes/K1482/s32`: px32, mimg32, wd32; outputs in `out/s32`). The patch is
  chain 84's hairpin: ONE piece spans both legs, so no tube burial applies and foldD (s7) is skipped when no
  other same-surface piece is in reach; the two inner bands overlap past the cusp (legs at about 35 degrees).
- C1 (foldD without its inOther guard): crotch gone but a flag (right leg's band up to c66's group step) and a
  dot stay; notches 1689,224, 1571,252, 1895,1358, 1543,1602. C2 (C1 gated on the fold angle) cannot tell
  t84e from those clean points. B (same-surface pieces zt deeper do not bury): 52 gain-only places. All fail.
- G1 (C1 only where the fold run's group or home differs from the piece's): 3 loss-only places (t84e, 1689,224, 1571,252). G3 (carried on with; env `GF_S32=1`, off by default so src behaves as master): C1 only where p's piece is in a group
  and the fold's other run is not (t84e and 1689,224 change); at t84e the diagonal now thins to a hairline
  and the flag stays. Next: a join at the cusp (round or bevel) instead of burying one band.
### WIP K1482 s32 (07:00)

- Failed on the mirror: R, Z (with D: 1687,226 and 1565,256), C 0.55, CH 0.55 (V-notch 1571,254), CH 0.62 without
  DH (1565,256). Passing (wd32_hmdh.txt: only t84e, 1537,938, 32 samples, loss-only): foldD past !inOther with
  fold cos > 0.62; buries when cos > 0.7 with a sibling piece of the chain on another surface within arc 2, or the
  partner run (depth/member at its foot) is homed in a group but in none, or p's piece is in a group the partner is not;
  a D search (tangents at arc +-0.3) only when the plain search finds no fold (hi then off); G6 burial by the sibling's tube.
- Next: write it as one clean rule (no env), port to gf_glsl.ts, npm test, guards as time allows. Residual: one faint px 1540,950.

### Handoff K1482 s32 (07:30)

- Done on the mirror: the lone fold rule (eval.ts foldD past `!inOther` + the sibling burial, now behind env GF_S32=1).
  wd32 (`out/s32/wd32_final2.txt`): only t84e changes, 1537,938, 32 samples at stride 2, all loss; with gfk=0
  (`wd32_final_gfk0.txt`) nothing changes. By eye (mirror, `out/s32/mimg_t84e_hmdh.png`, `_z`): the patch is gone,
  the diagonal and the ear meet at the cusp; one faint px stays at 1540,950 (ink 0.225: a D fold at cos 0.599).
- The GLSL twin `loneFold` (gf_glsl.ts, statement for statement) was on in retryForm at 8cc774eb8 (npm test green) but in
  Chrome its composites ran about 50x slower than master's (diag_n.txt: 3 composites in the 5 s after the switch; master's
  diag_m.txt: 90, then 237) and cap.mjs's forced redraw stalled past 240 s twice (cap_n1.txt). Turned OFF after it, so the
  tip renders as master. Not run: the capture diff and sheets, the bar, hold, panelopen, dragchecks.
- Next: make loneFold cheap (suspects: member()/depth() inlined inside foldD inside the faces loop, the D search's two
  extra segment loops for every lone-piece face pixel, the zb form's second copy), e.g. bake a per-piece "lone fold"
  flag and the fold's foot group at the piece scan, run the D search only where the plain loop found a turned segment;
  then switch it on, capture master twice + new, sheets, the bar, the lock guards.

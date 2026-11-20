# K1482 stage 30: t81s's tick, by running the in-leg on (K1527; Claude agent stage)

**Started 2026-11-20 03:02** on master dbee156b4, after stage 29 landed (the home burial's depth guard; t56s
only). Stage 29's tools are in `.claude/probes/K1482/s29` of the worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af74bc71e7b05839a` (`run29.ps1` keeps each guard's
whole output; `capseq28.ps1` and `diff28.ps1` gave byte-identical repeat loads). Agent worktrees are siblings:
use absolute paths.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
t81s is one of the 14 sites he named on link A (`The sites` in `docs/design/K1482_s20_wedges_notches.md`; his
sheets `.claude/probes/K1490/out/k1490_wedge.png` and `k1490_notch.png` in the coordinator worktree
`.claude/worktrees/agent-af52b1a95572b7c1a`).

## The site

**t81s** is at 929,1153 on the 3200x1800 frame of link A; the tick is near 908,1136. An outline coming up from
the lower left meets a diagonal outline, and a nub about 3 px long sticks out below the joint. Picture: the
`t81s` row of `.claude/probes/K1482/cards/s27_sites.png` (coordinator worktree; before = now, nothing has
moved it yet).

Two stages found what it is and no fix. Read `### Handoff K1482 s24` (`docs/design/K1482_s24_tick_step.md`),
`### Handoff K1482 s27` (`docs/design/K1482_s27_flag_step.md`) and the GAP JOINT FLAGS, FOLD SHIFT and t81s
lines of `.claude/rules/render-gpu-field.md` first. In short:

- The nub is chain 45's +1 side: its corner sits 2-3 px below chain 9's outline, and the flagged short cut
  keeps chain 45's out-leg from that corner up to chain 9's band.
- Every slot k348-370 of crossing 9:45 carries flag bits 3, so no flag switch separates the nub from the
  about 270 V-corner joints the same rule holds closed (stage 24's gate on dN >= reach removed the nub and
  opened all of them: 3902 px at 274 places, backed out in 9b98e47b0). Do not gate the rule again.
- The nub's pixels sit in no fold (own distance h), so stage 27's fold shift leaves them.
- Removing the out-leg alone opens the corner.

**The untried step:** run chain 45's +1 in-leg on from its corner until it meets chain 9's band (a corner, not
a cut), then drop the short out-leg. Stage 27's tools are in
`.claude/worktrees/agent-a198fbb25c384a8cf/.claude/probes/K1482/s27` (`wmap28.ts` maps who draws each pixel,
`bur27.ts` the burial; `capseq28.ps1`, `diff28.ps1`, `sheet27.py`, `run27.ps1`); copy what you use, change
nothing there.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). `&tlk=border` draws the
outlines only, `&tlk=fill` the fill; `&gfk=0` turns the second corner try off. A Node build leaves it off
unless env `GF_KRETRY=1` (K1536): set that for a Node probe and for the bar, and clear it before `npm test`.

## The goal

On link A as it loads: the nub at t81s is gone and both outlines there run on at their own width, joined in a
corner with no gap; the fill does not move. With `&gfk=0` nothing gets worse. Nothing else on link A or on the
bar's four mazes gets worse: a clean round turned into a point, a clean point rounded, or an outline that
loses ink at a joint corner is a failure. You own the technique: if the in-leg step fails, say what it did at
the site and try the next thing. A stage that ends with more diagnosis and nothing in `src/` has not reached
the goal while time remains.

## Done

- **By eye**: t81s, context crop and detail crop, today | new, as it loads and with `&gfk=0`, contrast
  stretched (the outline is only about 15 levels darker than a pinhole inside it).
- **Link A**, loads of one state and one view (compare the image hashes of repeat loads first, K1539; report
  the floor), made **before** you commit anything as a fix: every place outside t81s where the border look
  changes at a luminance step of 1 is counted, the places that only gain or only lose ink counted separately;
  the ten largest are on a sheet (surrounding threads with a red box, then the box closer; today | new) and
  judged by eye; the fill look 0 px, or each place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` master's SHA at your start, `-Tag k1482s30`: new 0, grown 0.
- Under the perf lock (`scripts/perf_lock.ps1 -MaxWaitMin 60`, each wait in ONE blocking command): `hold.mjs`
  60/60 on link A, as it loads and with `&gfk=0`; `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks.
  `npm test` green, run WITHOUT the lock (a pin that moves is re-frozen in the same commit and named in its
  message). Each guard's whole output kept in a file.
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge --ff-only origin/master` in your worktree first. Ports 6210-6229, profiles `$env:TEMP\k1482s30-*`,
probe directories `.claude/probes/K1482/s30` and `.claude/probes/K1482/out/s30` (untracked: do not `git add`
raw captures or dumps). Pass `&snd=none` in every look capture; never Chrome's `--virtual-time-budget`. The
border look under gf is gf's own: today's renderer's border strokes are no bar. Read code through the shell
(`Select-String`, a range of `Get-Content`); use the Read tool only on a file you are about to edit. No
helpers. Commit WIP at every milestone, broken or not, and add two or three handoff lines here each time.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; start the guards by 75 minutes in. A compaction is not a stop:
re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s30` here, commit, and
report: the commits to land by SHA in order, what changed at the site by eye, the numbers, each guard's result
with the path of its whole output, the sheets' absolute paths, a `Ledger items` list and K1482's handle
fields. Never push, never edit `LEDGER.md`.

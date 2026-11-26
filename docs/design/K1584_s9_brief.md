# K1584 stage 9: the wedge only at balls tight enough to need it

Read first: `K1584_s6_brief.md` and its handoff (the wedge as built, `lkBall` in `gf_look.ts`), then
`K1584_s8_brief.md`'s handoff (this stage's base). Base: this worktree's HEAD. The wedge variants' sheet and
tools are on branch `k1584-wedge` (`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1584-wedge`, read
only; its brief's handoff lists the 8 balls and the tools).

## Levi (2026-11-25, on the 8-ball sheet `wedge_sheet.png`)

> V1 seems ok? But, of all these rows, only the last really seems like the ball is tight enough to need the
> wedge treatment

V1 is the wedge as stage 6 built it, which this branch already draws. The last row is ball 8, A_a k202. The
other seven rows (A_3 k63, k103, k157, k275, A_4 k343, A_5 k2, A_6 k331) are, to his eye, not tight enough.
The coordinator's reading: a ball as tight as A_a k202 keeps V1's wedge; a looser one gets the ordinary gap,
as stage 5 drew it. Levi has seen 8 of the 76 balls that sit in a crossing's gap, so where the line falls
among the rest is his to mark, from pictures.

## This stage

One thing: the wedge applies only at balls tight enough. You own the measure of "tight" (the turn's radius
against the thread's width is the obvious start; note `kR` is 0 at A_3 k63, which he does not count as
tight, so the measure must say what he sees). Everything that is not a ball in a crossing's gap stays as
stage 8 drew it, pixel for pixel. Not this stage: the wedge's shape, the four corner misses (K1608), the
loop and far terms, the junction rule (`eval.ts`, `gf_glsl.ts`: keep out unless you must, and name it).

Bindings: all earlier briefs'. In particular no loose piece of border left by a ball where the wedge
applies, never remove a thread's border, the under pass keeps its width and heading, `fadeLength` stays
live with no table rebuild.

## Done

1. The measure, for every ball in a crossing's gap on all 21 mazes (stage 6's census,
   `s6/balltable_s6a.txt`, is the start), as a table: maze, k, measure, sorted tightest first. Say where A_a
   k202 and the other seven fall. If no measure puts k202 on one side and the seven on the other, stop and
   report that with the table and the pictures: do not build.
2. For Levi, pictures only: a sheet of every such ball, tightest first, columns `today | stage 5 | V1`
   (captures `s1/out/before`, `s5/out/s5d`, `s7/out/s8a`), tone-mapped with `region.py`, large enough to
   read, each row labelled with maze, k and the measure, the eight he has seen marked. He marks where the
   line falls. Split it over several images if it is too tall to read.
3. The rule in `src/render/gpu_field/` with its mirror and tests, the line set between A_a k202 and the
   tightest of the seven; a ball on the loose side draws stage 5's gap exactly. `npm test` green; every
   re-frozen pin named.
4. A capture of all 21 mazes (tag `s9a`; warm the profiles first with `warm7.ps1`; under the perf lock,
   `scripts/perf_lock.ps1`, never by hand; nothing else heavy running).
5. s8a against s9a, every changed place on all 21 mazes listed and viewed: each is a ball on the loose side
   going back to stage 5's look, or you report it. Balls on the tight side: pixel-identical to s8a.
6. Counts within one run of `screen.py`: closed sides (s8: 136) and loose pieces (s8: 501/15/33/1367), and
   the loose pieces by a ball on each side of the line.

## How to work

- Work in this worktree on this branch from its HEAD: no reset, rebase or merge. `Get-Date` first.
- Preview ports 5630 to 5639. PowerShell. Read code through the shell; the Read tool only just before an
  Edit, and for images.
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never their outputs). Never
  push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
  `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours: view every place you report.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes first.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 9)` here, commit, and report: what holds and what does not (failing checks with their
numbers), sheet paths, the table, the counts, a `Ledger items` list and K1584's handle fields (owner,
branch, last commit, evidence, next).

## Handoff (stage 9)

Stopped 2026-11-25 about 08:20, every Done met, inside the 2 h (started 07:34). Branch
`worktree-agent-a2dfb242b056cf793`: the rule is a0f00983b (`src/render/gpu_field/gf_pack.ts`, `gf_look.ts`; test
`test/render/gf_ball.test.ts` "K1584 s9 the wedge's line"); the probe tools are e3e4d3430, 66a5ea1bb and 1ee2705a0, all
under `.claude/probes/K1584/s9/`. Outputs are untracked in `s9/out/`; the captures are `s7/out/s9a/` (the rule) and
`s7/out/s9n/` (the same HEAD with no wedge anywhere, `s9/nowedge.patch` as off-branch commit c987a1ff1, never on a
branch).

**This brief names the wrong ball.** It says the wedge sheet's last row is A_a k202; on `wedge_sheet.png`
(k1584-wedge worktree, `.claude/probes/K1584/wedge/v/`) the last row, ball 8, is **A_3 k63**, and A_a k202 is ball 5.
The stage followed Levi's words ("only the last really seems like the ball is tight enough"): tight = A_3 k63, the
other seven (k103, k157, k275, A_4 k343, A_a k202, A_5 k2, A_6 k331) not tight. Under the brief's literal reading
(k202 tight, k63 among the seven) no measure in the table separates them: k202 opens 45.7 deg, but k63 (40.1) and
A_6 k331 (45.2) open tighter, and on closed(W) k63 (2.92) is above k202 (2.58).

**The measure: the corner's opening angle** (the turn's theta, smaller = tighter), `s9/measure.py`, table
`s9/out/measure.txt` (76 balls in a crossing's gap, tightest first; r/W, closed(W) and the ball's radius beside it).
`kR` (r/W 0.00) cannot say it: k63, k202, k157 and k103 all have r/W 0. The top of the table:

| rank | ball | opening | r/W | closed(W) | Levi |
|---|---|---|---|---|---|
| 1 | A_3 k63 | 40.1 | 0.00 | 2.92 | tight (row 8) |
| 2 | A_5 k176 | 43.2 | 0.00 | 2.72 | not seen |
| 3 | A_6 k265 | 44.9 | 0.30 | 1.82 | not seen |
| 4 | A_6 k331 | 45.2 | 0.47 | 1.38 | not tight (row 7) |
| 5 | A_a k202 | 45.7 | 0.00 | 2.58 | not tight (row 5) |
| 13 | A_3 k275 | 52.3 | 0.38 | 1.41 | not tight (row 3) |
| 15 | A_3 k157 | 53.7 | 0.00 | 2.21 | not tight (row 2) |
| 22 | A_5 k2 | 60.2 | 0.16 | 1.67 | not tight (row 6) |
| 24 | A_4 k343 | 61.1 | 0.28 | 1.42 | not tight (row 4) |
| 36 | A_3 k103 | 67.9 | 0.00 | 1.79 | not tight (row 1) |

**The rule (a0f00983b).** The corner pack carries the opening: texel 5 .w = 1 + theta for a tight turn (0 otherwise;
other readers test .w > 0.5). `lkBall` (shader) and `ballScaleAt` (mirror) skip a corner whose fround(1 + theta) is at
or above fround(1 + GAP_WEDGE_THETA); GAP_WEDGE_THETA = 42.5 deg, provisional, between k63 (40.1) and k331 (45.2). A_5
k176 (43.2) and A_6 k265 (44.9), which Levi has not seen, fall on the loose side. Of all 324 tight corners on the 21
mazes, only A_3 k63 is below the line. No pin was re-frozen; `npm test` green (3251). No change to `eval.ts` or
`gf_glsl.ts`.

**Done 1 to 6 hold.**

- **Done 1, 2.** The table above; the ranked sheet for Levi is `s9/out/rank_1.png` .. `rank_6.png` (today | stage 5
  | V1, tightest first, the eight he saw marked, a blue bar at the line).
- **Done 3.** The rule and its tests (a loose ball's bs is 1, so its gap is stage 5's; a tight one keeps V1's).
- **Done 4.** s9a captured on all 21 mazes, warmed, under the perf lock (`s9/out/run9.log`), every view the same as s8a.
- **Done 5, s8a against s9a** (`s9/chg9.py`, `s9/out/chg9.txt`; sheets `s9/out/chg_1.png` .. `chg_6.png`, all
  viewed). 50 changed places (thr 1); 49 lie at loose-side balls (within 9.5 px of the centre), and each one moves
  back toward stage 5's look: the gap reopens where the wedge had closed or shrunk it. The fiftieth is A_4 (1393,
  1187), 1 px at 4 levels in the background, 217 px from any ball (inferred: capture-session noise). The tight ball,
  A_3 k63, is 0 px changed: pixel-identical to s8a. The D mazes change only at D_6 k357 (7 px).
- **Done 3 and 5, observed: s9a against s9n**, the same HEAD with no wedge anywhere (`s9/capn9.ps1`, warmed and
  captured under the perf lock, `s9/out/run9n.log`: warm exit 0, cap exit 0; `s9/cmpn9.py`, `s9/out/cmpn9.txt`; sheet
  `s9/out/cmpn9.png`, viewed). All 21 views the same. Every one of the 75 loose-side balls in a gap: 0 px differ
  (> 1 level, within 30 px), so each draws exactly the no-wedge gap. The whole difference over all 21 mazes is 6 px
  (any level; 5 px > 1, 1 px > 6, at most 14 levels), all at the tight ball A_3 k63, in a 6 x 2 px box at
  (1050..1055, 265..266) along the thin line through the ball's centre; 0 px lie farther than 30 px from a ball. On
  the sheet s9n and s9a look the same at k63: with stages 7 and 8 on top, the wedge adds 6 px there.
- **Done 6, counts (one screen.py run per maze, s8a | s9a, `s9/an9.ps1`, `s9/out/an9.txt`).**
  - Closed sides 136 | 136. One side changed verdict: A_a x344 (dir 1, lat 1), part -> bare, at k202's place;
    stage 5 (s5d) reads it bare too.
  - Loose pieces (bins 1-8 / 9-40 / 41-120 / 121-300): today 486/2/17/882, s8a 501/15/33/1367, s9a 501/16/36/1367.
  - Loose pieces by a ball (centroid within the ball's radius + 10 px, `s9/a9.py`):
    tight side today 0/0/0/1, s8a 0/0/0/1, s9a 0/0/0/1 (stage 5: 0/0/1/0);
    loose side today 0/0/0/1, s8a 0/1/0/2, s9a 0/2/3/2 (stage 5: 0/3/10/1).

**What does not hold, or holds only in part.**

- **A loose piece at the tight ball.** A_3 k63 keeps a 149 px loose piece (the ball's ring, cut off by the gap)
  in s8a and s9a alike (stage 5 116 px, today 156 px). The binding "no loose piece of border left by a ball where the
  wedge applies" fails there, as it did in s6 and s8 (s6 handoff: "the ring stays a loose piece ... not tuned to
  it"). Levi called V1 "ok" on that row.
- **Stage 5's loose pieces come back at loose-side balls.** s9a has new loose pieces at A_3 k103 (58 px), A_5 k185
  (77), A_a k101 (29), A_a k202 (31) and A_c k141 (64): each the same size and place as stage 5's (s5d). A_6 k331's
  14 px piece, which the wedge made in stage 6, is gone. The brief allows this (the wedge applies only on the tight
  side); Levi's eye decides whether these balls want it after all.
- **Loose balls are stage 5's gap, not stage 5's picture.** s9a still differs from s5d at 15 loose balls: 213 px
  (> 6 levels, within 30 px; `s9/res9.py`, `s9/out/res9.txt`). 212 of them lie inside a stage 7 mirror place where rule
  K or rule C adds ink (`s7/out/px/<maze>.json`), so they are stage 7's change (inferred from the
  places). That they are not the wedge's is observed: s9n, which draws no wedge, draws the same pixels. The one left is A_9 k43, 1 px at (1299, 1660), 2 to 3 px from the centre: s5 reads 26, s6 to
  s9 read 20; the stage 7 place there (x72, rules K and C) adds no ink in the mirror. Not the wedge (s9n reads the same); which change moved it is unexplained.

**Sheets in `s9/out/`.** `rank_1.png` .. `rank_6.png` (for Levi: where the line falls), `chg_1.png` .. `chg_6.png`
(every s8a -> s9a change), `res_1.png` (five balls: today | stage 5 | V1 | s6a | s9a), `cmpn9.png` (stage 5 | s9n | s9a | difference: the one ball that differs, k63), plus `measure.txt`,
`chg9.txt`, `res9.txt`, `an9.txt`, `cmpn9.txt`, `run9.log`, `run9n.log`.

**Process.** One wrong-path write: `res9.py` was first written into the main checkout's
`.claude/probes/K1584/s9/`; the file and the directory were deleted at once (main's `git status` clean after) and the
file rewritten here.

**Next.**

1. Levi marks the line on `rank_1.png` .. `rank_6.png`. It is 42.5 deg for now, with A_5 k176 (43.2) and A_6 k265
   (44.9) unseen between k63 and k331; moving it is one constant.
2. Merge s9 (check K1493's rule first: `git merge-base --is-ancestor d39e363fe <branch>`).
3. If Levi wants the loose pieces gone at the loose balls stage 5 left them at (k103, k185, k101, k202, k141), that is
   a rule of its own, not the wedge's line.

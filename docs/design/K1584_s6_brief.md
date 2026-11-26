# K1584 stage 6: at a ball, the gap is a wedge cut from the ball's centre

Read first: `K1584_s5_brief.md` (this stage's base, its handoff and its bindings all hold) and
`K1584_s4_brief.md`'s handoff. Base: this worktree's HEAD `9894c1091` (stage 5).

## Levi (2026-11-24 16:00, on stage 5's balls)

Stage 5 showed him that where a thread crosses right beside a tight turn, the turn's ball (K1572, approved
Nov 23: "tight turns keep today's ball") is the under thread's own border and sits inside that crossing's
gap, so the gap cuts the ball into a fork, a point, a notch or a loose piece. Offered: the gap stops at the
ball's edge, or keep it as built. His answer, verbatim:

> ahh, interesting... On this case, I think the only thing that will look at all correct is to taper the
> gap--it should be widen out from the ball center, so it shows as a wedge cut out from the center; the fade
> should then also taper here

My reading, which you test against the pictures: at such a ball the gap has no width at the ball's centre
and widens outward along the radius, reaching the ordinary gap width where the ball ends (the border beyond
the ball shows the ordinary gap). The ball stays one piece, joined at its centre, with a wedge of gap cut
out of it. The crossing fade (the `fadeLength` look on the under thread at the crossing) narrows with the
same wedge there. If the pictures show a second reasonable reading (for example where the wedge reaches full
width), build the one above and show the other on a sheet as a variant: Levi picks looks, not you or I.

## This stage

One thing only: the wedge at balls. Everywhere that is not a ball in a crossing's gap stays as stage 5 drew
it, pixel for pixel. Not this stage: stems (K1595), closed sides (K1594, K1591), loops and hooks, the
junction rule (K1588: another agent owns `eval.ts` and `gf_glsl.ts` on another branch right now; prefer
`gf_look.ts`, and if you must touch those two files keep the change small and name it in the report).

Bindings (beyond the earlier briefs'): the under pass keeps its width and heading; never remove a thread's
border; never trade a hook for a point; stage 4's angled cut ends stay; `fadeLength` stays live with no
table rebuild; no loose piece of border (ink joined to nothing) is left by a ball.

## Done

1. The wedge in `src/render/gpu_field/` with its CPU mirror and tests; `npm test` green; name every pin you
   re-freeze.
2. A capture of all 21 mazes (tag `s6a`, same recipe as `s5d`, under the perf lock).
3. Every ball in a crossing's gap found on all 21 mazes (stage 5's lists are a start, not the census:
   `.claude/probes/K1584/s5/screen/balls_kind.json`, `balls_lost.json`, `balls.py`, `ballkind.py`; the 29
   loose pieces at tight turns come from the tracked `.claude/probes/K1584/screen/floats.py` family in the
   coordinator's checkout `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a`).
   Sheets `today | stage 5 | stage 6` (tone-mapped, `region.py`) of every one, each viewed by you; say for
   each: one piece, wedge from the centre, or what is wrong.
4. Stage 5 against stage 6, every changed place on all 21 mazes listed and viewed: each is a ball, or it is a
   defect you report.
5. Counts within one run of `screen.py`: closed sides (stage 5: 133) and loose pieces (stage 5: 67), stage 5
   against stage 6. Report the on-screen counts only, never the model's.
6. Fade at 0, 0.14, 0.5 and 1.2 on three balls: a sheet showing the fade narrowing with the wedge.

## How to work

- Work in this worktree on this branch from its HEAD: no reset, rebase or merge. `Get-Date` first.
- Preview ports 5630 to 5639. The perf lock (`scripts/perf_lock.ps1`, never by hand) is held by the
  coordinator's drag checks until about 17:15 PST and then wanted by the K1588 agent: do the mirror work
  first and wait for the lock inside one blocking command.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never their outputs). Never
  push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
  `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours: view every place you report.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes first.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 6)` here, commit, and report: what holds and what does not (failing checks with their
numbers), sheet paths, the counts, a `Ledger items` list and K1584's handle fields (owner, branch, last
commit, evidence, next).

## Handoff (stage 6)

Agent K1584-s6, 2026-11-24, 15:48 to 17:05. Branch `worktree-agent-a2dfb242b056cf793`, code in 044e1d010,
probe tools in 348fd2b0b and the handoff commit. Evidence: `.claude/probes/K1584/s6/` (outputs untracked).

**The rule (gf_look.ts only).** `lkBall` gives `bs = min |p - K0| / (kR + W)` over the tight corners of the
pixel's own chains (within `GAP_BALL_ARC` 1.0 of the tangent arcs), clamped to [0, 1]; `lkCut` scales the
gap's margin (`uLkG`) and its fade width (`uLkF`) by it. The over thread's own footprint (`uH`) is not
scaled. CPU mirror `ballScaleAt` / `gapCutAt`; `test/render/gf_ball.test.ts` (7 tests); re-frozen pins:
`gf_look.test.ts` (lkCut's `fw` and `e` lines, the output site), `gf_gap.test.ts` (lkCut's `e` line).
`npm test` green, 3245 tests.

**Holds.** s6a captured on all 21 mazes (s5d's recipe, under the lock; A_3, A_4, A_a re-shot after a
"no gf frame" timeout). Outside every ball's disk ((r + W) scale + 3 px) s6a equals s5d bit for bit on all
21 mazes (0 px at any level); 1285 px differ inside balls, 320 of them by more than 6 levels (319 darker).
Every changed place is a ball (44 balls, `fdball.json`; sheets d1 to d5). The fade narrows with the wedge
(fade_sheet.png, fl 0 / 0.14 / 0.5 / 1.2). On-screen counts, one screen.py run each: closed sides 132 to
132; gap to part 3 (A_3 x176, A_5 x0, A_5 x277: the wedge tips at A_3 k103, A_5 k2, A_5 k185).
Loose pieces (9 to 120 px) 67 to 58.

**Does not hold.**
- The wedge is too small to read as one. It reaches full width at `kR + W`, 5 to 10 px on screen, so it
  adds 1 to 19 px a ball, all in the inner few px: on the sheets stage 5 and stage 6 look nearly the same.
  Where the gap crosses the ball's ring, `bs` is already 0.6 to 1, and the light band still cuts the ring.
- Balls are not one piece: 6 of 76 are still a loose piece (A_3 k63, A_5 k2, A_5 k185, A_8 k81, A_a k202,
  A_b k177); 7 joined (A_3 k103, k157, A_6 k19, k157, A_a k101, A_c k141, D_6 k357).
- A_6 k331: a new 14 px loose piece (breaks "no loose piece left by a ball"). A_d k198: a thin 2 px spike.
- A_3 k63 (x100, Levi's eye, K1586): the ball test selects it (`kR` = 0 there); 9 px darker at the gap's
  inner end; the ring stays a loose piece (116 to 127 px), as in stage 5. Not tuned to it.
- 32 of the 76 balls in a gap show no change over 6 levels: at those viewed, stage 5 no longer draws a
  ball there (a hook or a V with a faded arm).

**Next.** Decide with Levi, from fade_sheet.png and d3 to d5, whether the wedge should reach further (a
reach of the ball's outer edge plus the gap, or scale `uH`'s cut too) before any tuning; then fix A_6 k331
and A_d k198. Per-ball table: `s6/balltable_s6a.txt`.

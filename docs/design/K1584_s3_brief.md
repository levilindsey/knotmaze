# K1584 stage 3: every crossing gap matches the good gap

Earlier stages: `docs/design/K1584_crossing_gaps.md` (the brief; the look rules there still bind) and its two
handoffs on branch `worktree-agent-a2dfb242b056cf793` (worktree `.claude/worktrees/agent-a2dfb242b056cf793`,
tools under `.claude/probes/K1584/s1/` and `s2/`). Work in that worktree, on that branch; first
`git fetch` and `git merge origin/master`.

## Levi's pick (2026-11-24, on the stage 2 variant sheets)

"I think you're right about the three classes: normal/good gap, tiny gap, no gap. In all of your gap examples,
it seems like you are updating the no-gap cases to match the tiny-gap cases, but the good-gap cases are
different. I want them all to match the good-gap cases when possible. I know there was some logic to account
for close-by junctions, and that's still valid. But most of these cases have enough room to match or at least
get a lot closer to the good-gap case"

So the target is not a new size. It is the gap that today's renderer (rp=gf gfh=1) already draws at its good
crossings, on every crossing side that has room for it. The stage 2 variants missed: turning the joint flag off
gave those sides a gap, but a smaller one than the good crossings have.

## This stage

1. Find what makes a good gap good. On A_3 today, take crossings that read as a good gap, as a tiny gap and as
   no gap in the picture, and for each side get the renderer's own numbers (margin, fade length, any scale or
   window clamp, which path). Name the quantity that differs between good and tiny. Suspects, unchecked: the
   joint-room scale, a window that ends early, the fade shortened beside a joint, the s15/s17 and s18 rules.
2. Change `src/render/gpu_field/` so every crossing side gets the good gap's numbers when it has room. The
   close-by-junction logic stays for the sides that truly lack room (a joint's outline must stay closed), but
   it should yield only as much as the room forces: a side with some room gets as near the good gap as fits,
   not the tiny one. Keep `gf_glsl.ts` and the CPU mirror in step. Marker gaps, `gfJointClear` and `pinReach`
   must not move. Decide whether stage 1's commit b4c48f3a9 stays, is folded in or is reverted.
3. Look at it yourself: before and after of A_3 b1 (frame x 800..1600, y 0..600) and A_3 c2 at 2x, the named
   joint sites (j15, j22, t65s, j88, t80s, t81s, t57e, j148), and whole-frame checks on all 21 mazes for
   anything else that moved. In the handoff give counts per maze: sides at the full good gap, sides reduced
   for room (with how much they keep), sides still closed and why. Sheets under `.claude/probes/K1584/s3/`
   (untracked; tools may be committed).
4. `npm test` green. Commit on the branch; do not push, do not land.

Not this stage: junction stubs (K1585), the eye loop border gap (K1586), the single shared border (K1587).
Note any you see change.

## Stop rule

Stop when the stage is done or 2 hours after your start (`Get-Date` at the start and at each milestone),
whichever comes first; then commit WIP (broken or not), append a handoff to this file and report. A compaction
is not a stop: re-read this brief and `git log`. Read code through the shell (`Select-String`, ranges of
`Get-Content`); the Read tool only just before an Edit. `scripts/perf_lock.ps1` around captures; never
Chrome's --virtual-time-budget. No ledger edits: end your report with a `Ledger items` list and the item's
handle fields. Helpers, if any, run on sonnet for mechanical work only and follow this stop rule.

# K1584 stage 4: no crossing side stays closed

Earlier stages: `docs/design/K1584_crossing_gaps.md` (the look rules there still bind) and
`docs/design/K1584_s3_brief.md` with its handoff, on branch `worktree-agent-a2dfb242b056cf793` (worktree
`.claude/worktrees/agent-a2dfb242b056cf793`, tools under `.claude/probes/K1584/s1/`, `s2/`, `s3/`). Work in
that worktree, on that branch; first `git fetch` and `git merge origin/master`. Stage 3 (2078ee391) passed the
land guards and is the base; it is not landed.

## Levi on stage 3's pictures (2026-11-24)

"There are still MANY places where gaps aren't being shown and they should be. Every single under thread border
at a crossing should show a gap. Only if the border is VERY close to a junction do we shorted the gap--but we
then still show as much gap as fits"

So the rule is now absolute: a crossing side closed on purpose is a fault. After stage 3, 3,076 of 29,800 sides
on the 21 mazes are still closed (1,898 by the over rule of s15/s17, 1,178 by the under rule of s18), 534 are
reduced for room and 307 are cut short by the gap's window. A_3 alone has 263 closed.

## This stage

1. Every under-thread border at every crossing shows a gap: the full good gap where there is room, and as much
   as fits where a junction's outline is very close. Zero closed sides is the target. The joint flag may still
   shape how a border meets a junction's own outline, but it may not close a crossing gap. Look also at the
   reduced and window-cut sides: each should keep as much gap as truly fits, and a side whose gap reads as
   closed at 1x counts as closed.
2. What the over and under rules were protecting (a fused joint's outline staying closed, no stray border
   stubs or slivers between a crossing and a joint) still matters: find another way to protect it that does
   not close the crossing gap, and say in the handoff what each rule protected and how that is kept. If a
   place truly cannot have both, list it with a crop; do not quietly keep it closed.
3. Fix A_4 t84e (crossing 356: one border went from full gap to tiny in stage 3; room is per side, per border
   is the likely fix).
4. Keep `gf_glsl.ts` and the CPU mirror in step. Marker gaps, `gfJointClear` and `pinReach` must not move.
5. Look at it yourself: A_3 b1 (frame x 800..1600, y 0..600) and A_3 c2 at 2x, stage 3 against stage 4, with
   every changed place cropped close; the named joint sites (j15, j22, t65s, j88, t80s, t81s, t57e, j148,
   A_c j104); whole-frame changed-place checks on all 21 mazes. In the handoff: counts per maze of full,
   reduced (how much they keep), and closed (should be none; list any). Sheets under
   `.claude/probes/K1584/s4/` (untracked; tools may be committed).
6. `npm test` green. Commit on the branch at each milestone; do not push, do not land.

Not this stage: junction stubs (K1585), the eye loop border gap (K1586), the single shared border (K1587).
Note any you see change.

## Stop rule

Stop when the stage is done or 2 hours after your start (`Get-Date` at the start and at each milestone),
whichever comes first; then commit WIP (broken or not), append a handoff to this file and report. A compaction
is not a stop: re-read this brief and `git log`. Read code through the shell (`Select-String`, narrow ranges of
`Get-Content`); the Read tool only just before an Edit; crop images before viewing them. `scripts/perf_lock.ps1`
around captures; never Chrome's --virtual-time-budget. No ledger edits: end your report with a `Ledger items`
list and the item's handle fields. Helpers, if any, run on sonnet for mechanical work only and follow this stop
rule.

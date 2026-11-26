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

## Handoff (stage 4 agent, 2026-11-24, 07:22 to 09:22)

State: done to the stop rule, waits on Levi's look. Branch `worktree-agent-a2dfb242b056cf793` (not pushed, not
landed); commits 0336a7a22 (per-border codes, both flag rules gone), 90addb39e (a joint ctrl closes no border),
6f635c2dd (no exit pad on a corner room), and the last commit (a border's cut ends at its own gap end). `npm test`
green. Probes and tools: `.claude/probes/K1584/s4/` (untracked outputs; tools listed at the end).

**What changed (all in `src/render/gpu_field/gf_look.ts`, the gap table; `gf_glsl.ts` decodes it).** Each under
slot now carries a code per BORDER instead of one per side: the right border's in x's fraction (/ 2048), the left's
in z's (/ 1024), code = round(fs*31)*32 + round(ms*31), 0 = that border's outline closed. The joint flag's over
rule (s15/s17) and under rule (s18) are gone. Each border's room runs to its own joint corners' tangent points
(`gfJointArcs` + the source's `jointLats`; a corner of unknown side holds both borders), with no exit pad (the pad
closed A_4 x256 where the corner sits right at the gap's end). The joint ctrl less a fill half-width caps only the
window, never a border. No floors: `gapWindow` scales a border's margin, then its fade, to what fits before its
corner, and gives 0 only when the corner sits at the over's outline. The shader and the mirror read the same
table; marker gaps, `gfJointClear` and `pinReach` are untouched.

**What each old rule protected, and how it is kept now.**
- Over rule (s15/s17): the under arm's outline where it meets a fused joint the OVER is a member of. Kept by the
  per-border room: a slot past that border's corner tangent point codes 0 (the joint's outline stays whole), and the
  gap before it shrinks to fit (A_3 j15, j22, j88, t65s, t80s, t81s, t57e, j148 now open near the joint and close
  at it; `sheet_named_sites.png`).
- Under rule (s18): V-corner joint outlines, and A_c j104, where the window runs on into the joint and the over (a
  member too) comes back within the cut's reach of the joint's outline. Kept by the room (as above) and, since the
  last commit, by each border's GAP END: the march records where a border first clears the over's fill, margin and
  fade (`endB`, table slots 14..17 of `gapWindow`'s result) and a slot past it (plus `GAP_END_PAD`, a step and the
  exit pad) codes 0. An over that comes back on the way into a joint, or past its end cap, cuts nothing of a border
  that already showed its whole gap.

**Counts (all 21 mazes, 29,800 sides; `counts_s4.md`, `cnt/<maze>_s4.json`).** s3 to s4: full 25,856 to 28,811;
scaled 534 to 415 (mean margin kept 0.91, fade 0.29); window-end 307 to 283; closed 3,076 to 264; a further 188
open sides keep over 0.8 of the border in the margin band and read closed at 1x. Per maze, full s3 to s4 / closed
s3 to s4 / reads closed: A_3 1080-1326 / 263-18 / 9; A_4 1113-1374 / 290-27 / 16; A_5 1062-1296 / 248-15 / 19;
A_6 1125-1372 / 284-30 / 11; A_7 1098-1355 / 283-28 / 19; A_8 1033-1296 / 268-11 / 32; A_9 1108-1355 / 271-21 /
17; A_a 1066-1332 / 283-16 / 11; A_b 1090-1348 / 276-22 / 9; A_c 1123-1397 / 286-18 / 20; A_d 1112-1365 /
278-29 / 22. D mazes closed s3 to s4: D_1 4-2, D_2 3-4, D_3 7-2, D_4 6-5, D_5 6-2, D_6 4-1, D_7 2-3, D_8 2-7,
D_9 4-1, D_a 8-2. The closed and read-closed sides are listed (crossing, side, border, corner and place) in
`counts_s4_list.md` (`python cntsum4.py --closed`). The gap-end rule changes no count (the counts read the gap at
the crossing).

**A_4 t84e (x356) is fixed:** its lat -1 border is the full gap (s3: 0.58 of it), its lat +1 border shrinks alone.

**Whole-frame changed places, s3 to s4 (`fd_s4f.txt`, `diff_s4f_<m>.json`):** 5,715-7,424 px a link-A maze at
201-235 boxes, nearly all brighter (gaps opening); D mazes 127-235 px. 13 darker boxes, `sheet_s4f_darker.png`.

**Can't have both:** the D sides where s3's floors kept a tiny gap and s4 closes it because nothing fits before the
corner (D_2 x153, D_4 x140, D_7 x102 and x271, D_8 x227, D_9 x262, D_a x268; also A_4 x27, A_4 x362, A_7 x359,
A_c x235, A_d x75, A_d x42): any gap there cuts the joint's own outline. `sheet_s4f_darker.png`.

**Worse or open:** where a border rides inside the over's margin into a joint (the over and under both fusing),
its cut runs the whole ride: a slit or a crescent sliver (A_3 x100's tiny eye blob, A_9 x75 by t9e, A_d x225 by
t49e, A_6 x274 by j165, A_d x294 by j155, A_b x77 by j34). 525 open borders have a window over 1 ctrl long; 29 of
them were s3 flags (`longwin.json`, `sheet_s4f_longwin1/2.png`). The gap-end rule fixes those where the border
cleared first (A_c j104, A_6 x274 by j165, A_d x294 by j155/j157, A_a j177 and j96); a border that never clears
before the joint still cuts along (A_d t49e, A_b j34 and A_9 t9e are unchanged by it). A_d x28 j14: a small stub
at a T is gone (K1585's area). Eye blobs (A_3 x100) overlap K1586.

**Sheets to view (`.claude/probes/K1584/s4/`):** `sheet_A_3_b1_2x.png`, `sheet_A_3_c2_2x.png`,
`sheet_A_3_b1_changed.png`, `sheet_A_3_c2_changed.png` (A_3 b1/c2 at 2x, s3 against s4), `sheet_named_sites.png`
(the named sites and A_4 t84e), `sheet_s4f_darker.png`, `sheet_s4f_far1.png`, `sheet_s4f_far2.png`,
`sheet_s4f_longwin1.png`, `sheet_s4f_longwin2.png`, `z_j104w.png`, and the gap-end rule's changes:
`sheet_s4g_1.png`, `sheet_s4g_2.png` (every changed place, s3 | before the rule | after), `sheet_s4g_3.png` (the
riding sites it leaves) and `sheet_s4g_atcross.png` (the same crossings at the crossing: their gaps are kept),
`z_j104g.png`. Whole frames before and after the rule (`fd_s4g_vs_s4f.txt`): 729 px at 25 boxes on the 11 link-A
mazes, every one darker (a border put back past its gap's end), 0 px on the D mazes.

**Tools (`.claude/probes/K1584/s4/`):** `gapcheck.ts` (s4's per-border decode), `counts.ps1` + `cntsum4.py`
(counts), `fdall4.ps1` (framediff s3 to an s4 tag), `fdpair.ps1` (two s4 tags), `gsheet.ps1` (crops of a
framediff's boxes), `closedpl.py`, `atsite4.py`, `region.py`, `boxes2pl.py`, `bdelta.py`, `stack.py`. Captures:
`../s3/capmany.ps1` under `scripts/perf_lock.ps1`. Probe gotcha: a `cnt` json's `pts` sit about 25 px above the
image content (add 25 to y); framediff boxes are image coordinates.

# K1584 stage 5: gaps carve into junctions; border ends taper into the crossing

Earlier stages: `docs/design/K1584_crossing_gaps.md` (look rules still bind), `K1584_s3_brief.md`,
`K1584_s4_brief.md` with its handoff, on branch `worktree-agent-a2dfb242b056cf793` (worktree
`.claude/worktrees/agent-a2dfb242b056cf793`, tools under `.claude/probes/K1584/s1/`..`s4/`). Work in that
worktree, on that branch; first `git fetch` and `git merge origin/master`. Stage 4 (e8aab8b50) passed the land
guards and is the base; it is not landed.

## Levi on stage 4's pictures (2026-11-24)

On the sheet of A_3's 27 sides that still show no gap (18 closed, 9 too short to read; listed in
`.claude/probes/K1584/s4/counts_s4_list.md`):

"we have to fix all of these. I suppose that means we need to add support for having gaps carve into junctions.

There are also other artifacts we need to fix:
- 195: the rightside border at the under crossing extends too far into the thread, constricting the width of
  the under thread--it should instead be made to curve more and show a taper into the crossing. Same problem for
  338 and 37.
- 303, 227, 132: These all have a little sliver/notch of border extending into a junction.
- 'Thirteen places on other mazes that got worse': this seems inaccurate. Many of these places are strictly
  better. Many have way better angling of the border cut-end to align with the gap which is a very important
  fix. Some do indeed have narrower gaps."

The numbers are A_3 crossing ids (x195, x338, x37, x303, x227, x132). To see what he saw, crop 80 px around
each crossing's `dev` point (+25 px in y) from `s4/out/s4g/A_3/gf.png`, inverted and contrast-stretched, at 3x.

## This stage

1. Every crossing side shows a gap, with no exception: where a joint's own corner sits at the over thread's
   edge, the gap carves into the junction's outline. This overrides the earlier "a fused joint's outline stays
   closed" wherever that outline is the under thread's border at a crossing. Target: zero closed and zero
   reads-closed sides on all 21 mazes; list any that remain, with a crop.
2. x195, x338, x37 (and every place of the same kind): the under thread's border beside the crossing must not
   run into the thread and pinch the under thread's width. It curves more and tapers into the crossing.
   **WITHDRAWN as a shape change (Levi, 2026-11-24, via the coordinator after stage 5 started):** do NOT make any
   border "curve more" or "taper into the crossing", here or anywhere. "The under pass keeps its width and
   heading" stays binding ("definitely not" relaxed); "'curve more and taper' is giving us problems". Item 2 is now
   DIAGNOSIS ONLY, no shape change: for x195, x338 and x37, evaluate the CPU mirror at the pixels of the border that
   runs into the under thread and report the winning outline term (winKind / winA / winB), its chain and piece,
   whether it is the under thread's own side band, a corner arc, a tangent point, a vertex cap or another thread's
   band, and why it is not buried or cut there; a crop per place, in the handoff.
3. x303, x227, x132 (and the same kind): no sliver or notch of border left sticking into a junction.
4. Keep what Levi called a very important fix in stage 4: a border's cut end angled to line up with the gap.
   Where stage 4 made a gap narrower than stage 3 (some of the 13 on `s4/sheet_s4f_darker.png`), bring the
   width back without losing that angle.
5. Keep `gf_glsl.ts` and the CPU mirror in step. Marker gaps, `gfJointClear` and `pinReach` must not move unless
   carving needs it; say so if it does.
6. Look at it yourself: the 27 A_3 sides stage 4 against stage 5 in the same inverted 3x crops; A_3 b1 and c2
   at 2x; the 13 places; the named joint sites; whole-frame changed-place checks on all 21 mazes, with anything
   that got worse cropped. Counts per maze in the handoff. Sheets under `.claude/probes/K1584/s5/` (untracked;
   tools may be committed).
7. `npm test` green (update the test that pins A_c j104's outline closed to the new rule). Commit on the
   branch at each milestone; do not push, do not land.

Not this stage: the eye loop border gap (K1586) and the single shared border (K1587) on A_3 b1. Note any you
see change.

## Stop rule

Stop when the stage is done or 2 hours after your start (`Get-Date` at the start and at each milestone),
whichever comes first; then commit WIP (broken or not), append a handoff to this file and report. A compaction
is not a stop: re-read this brief and `git log`. Read code through the shell (`Select-String`, narrow ranges of
`Get-Content`); the Read tool only just before an Edit; crop images before viewing them. `scripts/perf_lock.ps1`
around captures; never Chrome's --virtual-time-budget. No ledger edits: end your report with a `Ledger items`
list and the item's handle fields. Helpers, if any, run on sonnet for mechanical work only and follow this stop
rule.

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

## WIP note (2026-11-24 01:08, claude agent; full handoff follows at the stop)

- GOOD gap = the full cut (margin and fade scales 1). TINY gap = K1458's clearance scales at their floors (margin
  0.5, fade 0.45): the side's joint room was measured to the joint ctrl less `jointClear` (1.72, the old ribbon
  renderer's fillet reach), which is usually 0, so most sides near a junction read "no room". NO gap = the joint
  flag (the over rule of K1482 s15/s17, unchanged; s18's under rule).
- Change (gf_look.ts, gf_app.ts; tables only, no GLSL): a side's room is the arc to gf's OWN joint-corner tangent
  point (`gfJointArcs`) less a pad, capped by the arc to the joint ctrl less the fill half-width. s18's under rule
  no longer holds on a slot inside its side's room when that side has room for the full gap; it still holds on a
  tight side, past the room, and on a side with no joint (per slot: a first per-side form cut A_c j104's fused-joint
  outline; fixed, test pinned).
- Counts, stage-1 rules -> s3, all 21 mazes (29,800 sides): full 22,402 -> 25,856; scaled 2,348 -> 534; window
  end 547 -> 307; over rule 1,898 (same); under rule 2,578 -> 1,178. Per maze: `.claude/probes/K1584/s3/counts_s3.md`.
- Frame checks so far (stage 1 -> s3, 17 of 21 mazes captured): every changed box is brighter (a gap opened) and
  within 45 px of a crossing, except a handful at 45-61 px; viewed A_3 j58/j81, A_4 t84e, A_5 t51s/t62e, A_a j168,
  A_b j182: all are crossing sides opening near a junction, no lost border seen. Open: A_8, D_2, D_3 and the look
  review of the darker boxes.

## Handoff (2026-11-24 01:20, claude agent, stage 3 done; waits on Levi's look)

Branch `worktree-agent-a2dfb242b056cf793`, worktree `.claude/worktrees/agent-a2dfb242b056cf793`. Not pushed, not
landed. `npm test` green (259 files, 3,235 tests).

**What makes a gap good, tiny or none** (the renderer's own table numbers, per crossing side, A_3 and then all 21
mazes through `.claude/probes/K1584/s3/gapcheck.ts`):
- GOOD = the full cut: margin and fade scales 1 (pack .999).
- TINY = K1458's clearance scales at their floors, margin 0.516 / fade 0.45 (pack .453). The cause is the side's
  joint room. It was measured to the joint ctrl less `jointClear` (1.72 on link A, the ribbon renderer's fillet
  reach), which left 0 room on most sides near a junction, whatever gf's own joint outline looks like there.
- NONE = the joint flag (slot + 0.375): the over rule (K1482 s15/s17, untouched) or s18's under rule.

**The change** (`src/render/gpu_field/gf_look.ts`, `gf_app.ts`; tables only, so `gf_glsl.ts` and the mirror stay
in step without an edit; marker gaps, `gfJointClear` and `pinReach` unchanged):
- A side's room is now the arc to gf's own joint-corner tangent point (`gfJointArcs`, the min over the under
  chain's corners on that side) less GAP_EXIT_PAD, capped by the arc to the joint ctrl less the fill half-width.
  A side with room for the full gap gets the full gap; a side with some room gets scales between the floor and 1.
- s18's under rule holds per slot (`tightAt`): on a side too tight for the full gap, on a slot past the side's
  room, and on a side with no joint. A per-side first form opened A_c j104's fused-joint outline (the slots past
  the room belong to the joint); the per-slot form keeps it closed, pinned in `test/render/gf_gap.test.ts`.
- Stage 1's b4c48f3a9 stays as it is (the change builds on it).

**Counts** (29,800 sides on 21 mazes, stage-1 rules -> s3): full 22,402 -> 25,856; scaled 2,348 -> 534 (they
keep mean margin 0.68 / fade 0.48 of the full cut); window end 547 -> 307; closed by the over rule 1,898 (same);
closed by the under rule 2,578 -> 1,178 (sides too tight for the full gap, and slots past their side's room).
A_3: full 862 -> 1,080 of 1,400, scaled 123 -> 36, under rule 204 -> 95, over rule 168. Per maze:
`.claude/probes/K1584/s3/counts_s3.md`.

**Look checks** (captures under `scripts/perf_lock.ps1`, stage 1 `s1/out/after/<m>` against `s3/out/s3b/<m>`,
`fdall.ps1` -> `fd_s3b.txt`): on all 21 mazes every changed box is brighter (a gap opened), except one; all but
14 lie within 45 px of a crossing, and those 14 (45-61 px, on A_3, A_5-A_8, A_a, A_b, A_d) are crossing sides
opening near a junction or a thread end, all viewed.
No lost border, no hook traded for a point, A_c j104 closed. The one place a gap shrank: A_4 t84e (x356, side +1,
lat -1), full -> floor scales. That side's lat +1 border is joint-flagged 0.48 along chain 84, so its joint's
corner likely sets the whole side's room (inferred). A room per border is the next refinement. K1585, K1586 and
K1587 were not examined on purpose; no changed box read as a stub, eye-loop or shared-border change.

**Sheets** (`.claude/probes/K1584/s3/`, untracked): `A_3_b1_2x.png` and `A_3_c2_2x.png` (master | stage 1 | s3,
2x; quarters `zz_b1q1..4.png`, `zz_c2q1..4.png`), `sites_s3.png` (j15, j22, t65s, j88, t80s, t81s, t57e,
j148), `zz_j88_j22.png`, the far boxes `far_s3b_1.png`, `far_s3b_2.png`, `far_s3b_3.png` with zooms
`zz_A5_t51s_z.png`, `zz_A6_t50sw.png`, `zz_A6_j165w.png`, `zz_Ad_j14.png`, and the shrunk gap `zz_A4_t84e.png`.

**Next:** Levi looks at the b1/c2 sheets and the named sites. If he takes it, land it (the branch is on the new
history, so a normal merge works) and consider the per-border room for t84e.

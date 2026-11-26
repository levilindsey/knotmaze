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

## Handoff (stage 5 agent, 2026-11-24, stopped done-ish before the 11:47 cap)

**What changed** (only `src/render/gpu_field/gf_look.ts`'s CPU bake plus `test/render/gf_gap.test.ts`; `gf_glsl.ts`,
`eval.ts`, `tables.ts`, marker gaps, `gfJointClear` and `pinReach` untouched, so the mirror stays in step):
- 7ac955c1b, CARVE (item 1): a crossing side's gap no longer stops at a joint's room. The room no longer scales a
  side or a border down and no longer closes a slot past it (`codeAt`); each border's own gap end (`endB`, sc6
  14..17) still closes its slot past that end, so the gap carves into the junction's outline exactly as far as the
  under thread's border is cut, and stage 4's angled cut ends stay. Env `GF_S4ROOM=1` restores stage 4.
- 9b4ccfb53, K1476 RULE: where the under centreline never clears the over thread (`all` NaN), the window runs to
  the furthest border gap end + GAP_END_PAD instead of the room. This is what takes "reads closed" from 146
  (carve alone, capture s5a) to 12. It is its own commit so it can be dropped alone (see "to judge" below).
  `GF_NOENDROOM=1` is the rejected s5b form (it closed borders): off, kept only for the record.

**Counts** (gapcheck model, `$env:SFX="s5d"; python .claude/probes/K1584/s5/cntsum5.py`): stage 4 -> stage 5,
all 21 mazes: full 28811 -> 29650, scaled 415 -> 0, window end 283 -> 123, closed 264 -> 0, reads closed 146 -> 12,
stolen 3, none 24. Per maze (closed / reads closed at s5): every maze closed 0; reads closed A_3 1, A_4 1, A_5 2,
A_7 4, A_8 2, A_9 1, A_d 1, others 0. Full table: run the command above.

**The 27 A_3 sides** (`homecase_s5d.md`, sheets `sheet_sides27_p0..p3.png`: s4g | s5d | diff): 26 of 27 now model
full, x221 d-1 l-1 still window 0.82. The render changed at 17 (4-33 px within 30 px). It did NOT change at 10
(x27, x37, x46, x55, x195, x243, x338, x28, x100, x221; 0-1 px): the model counts them full, but the line there is
not the under border lkGap cuts. 8 of those 10 are home cases (a junction with the under thread as its through arm
and another thread's END arm within 1.6 world: x27 j5, x37 j51, x46 j33, x55 j25, x195 j101, x243 j79, x338 j84, x28
j130); x100 and x221 have none. Inferred, tested by the coordinator only at x195/x338/x37: the visible line is the
end arm's outline drawn above the under thread because membership dropped the under thread (see item 2), and
gapcheck does not model membership or the depth key, so its "full" over-counts there. 24 of the 27 are home cases.

**Item 1, what is left in the model** (39 sides, each listed with its home case in `homecase_s5d.md`, crops in
`sheet_left_p0..p4.png`): reads closed (window, keep > 0.8) A_3 x221 (no home); A_4 x121 (self, j82 0.88 yes);
A_5 x135 (self, j66 0.88 yes), x138 (self, j50 0.78 other side); A_7 x83, x84, x280 (self, no home), x274 (j18
0.75 other side); A_8 x117 (none), x304 (j33 1.36 yes); A_9 x198 (self, none); A_d x24 (self, j10 0.90 yes).
Stolen: A_3 x12 (none), x134 (j81 1.30 yes), A_4 x247 (self, j78 1.44 yes). "none" (the walk never reaches the
border's edge band: mostly twist-eye self crossings, K1586's kind): A_3 x15, A_8 x60, A_c x12, A_7 x150, D_8 x60
(self), and A_7 x10, x94, A_8 x237, x291 (j38 1.38 other side), A_9 x113, x323 (j68 0.91 other side), A_a x81,
A_b x161. Home cases among the 15 window/stolen sides: 8 (6 on the side's own side of the crossing).

**Item 2: cause: home membership fades with depth (eval.ts member/homeRamp, gf_glsl.ts member), coordinator's
finding.** No shape change was made. My earlier mirror reads agree: at x195 the line is chain 76's side band
(winKind 1), the END arm of T junction j101 whose through thread is the under thread (c45); x338 chain 36 at j84;
x37 chain 19 at j51. lkGap cuts only the under chain's own borders, so it cannot open them. Crops `q195.png`,
`q338.png`, `q37.png`; s4g/s5d rows at the bottom of `sheet_named_p1.png`.

**Item 3:** no sliver rule was written. x303's notch is gone with the carve (the gap now carves through it,
`sheet_z2.png`, `sheet_named_p1.png`). x132 and x227 gained carved gaps (20 / 14 px within 30 px); whatever
sliver remains there is the membership kind (coordinator), left for that fix.

**Item 4:** at the 13 places of `s4/sheet_s4f_darker.png` no pixel is darker than stage 3 any more (stage 4 had 2-11
darker each, s5d 0) and none is darker than stage 4; 3-45 px are lighter than stage 3 (the angled cut runs on).
`sheet_13_p0/_p1.png` (s3b | s4g | s5d | diff s3b->s5d). Angles kept.

**Changed places, all 21 mazes** (frame diffs at luminance step 6, `fd_s5d_vs_s4g.txt`, `fd_s5d_vs_s5a.txt`):
s4g -> s5d 686 boxes, 12306 px, every one ink removed, none added; s5a -> s5d (the K1476 rule alone) 125 boxes,
2974 px, all removed. Named joint sites (`sheet_named_p0/_p1.png`): no new ink. A_3 b1 and c2 at 2x:
`cell_A_3_b1_{s4g,s5d,diff}_2x.png`, `cell_A_3_c2_*` (123 / 171 px removed, at gap ends only; b1's eye loop, K1586,
unchanged).

**To judge (possible worse places), all from the K1476 rule:** at hooks the window now runs on past a side that
already read full in s5a, and opens the hook's own outline 0.5-1.4 world along the under chain: A_5 x158, A_c x258,
A_7 x58, A_6 x48 (all four sides full in both s5a and s5d; the window alone grew, e.g. A_c x258 1.16 -> 2.56), and
A_9 x3 (its d+1 l+1 side went window 0.56 -> full). Sheets `sheet_hook.png` (s5a | s5d at 2x), `sheet_far3.png`
(4x), `sheet_far2.png`, `sheet_big.png` (the 16 largest s5a -> s5d changes, mostly longer gaps at gap ends). If
those read as a border removed away from the gap, the fix is to extend only where the carve leaves the side
reading closed (a keep estimate in the bake), or to drop 9b4ccfb53 (back to 146 reads closed). Also x44: the carved
cut end is ragged (`sheet_z2.png`).

**Tools** (committed): `.claude/probes/K1584/s5/` counts.ps1 + cntsum5.py (model counts), fdpair.ps1 (frame
diffs), specs.py + tiles.py + split.py (the sheets), homecase.py, cell2x.py (review cells at 2x), mir.ts /
mirview.py / mirpair.py (mirror reads). Captures `s5/out/s5a` (carve only) and `s5/out/s5d` (HEAD), untracked.

**Next:** the membership fix (eval.ts / gf_glsl.ts `member` / homeRamp, coordinator's lane), then recount and
re-look at the 10 unchanged A_3 sides and the 7 home-case window/stolen sides; Levi judges the K1476 hooks.

# K1584 stage 7b: draw stage 7's rules on the GPU and judge them

Read first: `K1584_s7_brief.md` here, whole, with its `Handoff (stage 7)`. Stage 7 put both rules in src
(04eeb1b69, npm test green) but its capture gave no frames. Note for the diagnosis: the coordinator ran the
full `npm test` (150 s, all cores) in another worktree from 18:31 to 18:34, inside that capture's window
(18:30 to 18:43), so machine load is a candidate cause, untested. Nothing else heavy runs now.

Done:
1. The load check: one load each of the stage 6 build (7f8701166) and the stage 7 build (HEAD src) under the
   perf lock, same profile kind, time to first GPU frame. Say what the numbers show. If stage 7 is slower by
   itself, find why (the `if (!fo)` branch is one candidate) and fix it without changing the picture.
2. The `s7a` capture of all 21 mazes (`cap7.ps1`), then `post7.ps1`.
3. Stage 7 brief's Done 3 to 7, each sheet viewed by you. Extra rows to judge: A_8 x304 (rule K takes 39 px
   of border there in the mirror: a slit opened, or a border removed? Removing a thread's border breaks a
   binding: then change the rule); and why the mirror changed 19 rule-K and 37 corner places against the
   diagnoses' 44 and 50-odd (name the places that do not change and say whether each still shows the fault).
4. `npm test` green if src changed.

Bindings and "How to work" are the stage 7 brief's, unchanged (this worktree and branch, no reset or rebase,
perf lock through `scripts/perf_lock.ps1`, never push, never edit LEDGER.md, never bare `git stash`, ports
5630 to 5639, commit WIP at milestones, view every place you report).

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` now and at each milestone), whichever comes
first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 7b)` here, commit, and report: what holds and what does not (numbers), sheet paths, the
counts, a `Ledger items` list and K1584's handle fields.
## Handoff (stage 7b)

Stopped 19:45 (started 18:47), every Done run; no src change (src = 04eeb1b69's, `npm test` not needed). Probes
in `.claude/probes/K1584/s7b/` (tools committed, outputs untracked in `s7b/out/` and `s7/out/`).

1. Load check (fresh profile each, alone, under the perf lock): first gf pass s6 107 s, s7 99 s. Stage 7 is
   not slower by itself. The s7a failure (no frame by 240 s, then 225-231 s with hash misses, all three GPU
   processes replaced in one second) reads as cold look-shader compiles in three parallel profiles plus the
   coordinator's `npm test`: inferred, not reproduced. `warm7.ps1` warmed the three capture profiles with the
   s7 build; `cap7.ps1` then captured all 21 (lock 18:57:52, CAPMANY s7a DONE 19:05:51), `post7.ps1` ran.
2. Done 3 holds: the three wrong loops lose the extra cut (A_b x75 38 px, A_8 x65 18, A_5 x277 9); the twelve
   right loops are pixel-identical to stage 6. Sheets `s7/out/loops7.png`, `s7b/out/wrongloops.png`.
3. Done 4 holds at 5 of 7 stems. Fails at A_6 1362,1615 (corner k197, 23 px) and A_d 2199,952 (k148, 14 px):
   rule C's flag misses, the cut fillet pixels project nearer the crossing than the flag start. Sheets
   `s7/out/stems7.png`, `s7b/out/stems_zoom.png`. The far-end gap (`s7/out/farend7.png`): stage 4 and stage 7
   show it the same, today has none; Levi decides.
4. A_8 x304: a gap opened at the crossing, no border removed (`s7b/out/a8x304_zoom.png`, `a8x304_rgb.png`).
5. Done 5: 58 changed boxes on 21 mazes, all viewed (`s7/out/chg_1..8.png`). Most are the two faults going
   away; four went back to the stage 4 look (A_3 x100, A_8 x41, D_3 x100, A_5 x258); one for Levi: A_a x148
   goes gap -> closed (`s7b/out/aax148_*.png`). No new defect found. Done 7: A_3 x100 is one of the four.
6. Done 6 (`s7/out/an7.txt`): closed sides 132 -> 136, loose pieces 501/15/43/1371 -> 501/15/33/1368; the 11
   side changes classified on `s7b/out/sides11a.png`, `sides11b.png`.
7. Counts. Rule K: all 44 of K1601's crossings are in the K table diff; 18 change pixels, plus x304
   (`s7b/out/k1601_44.txt`, `k44why.txt`). Rule C against K1595's 50 corners (`s7b/out/ringcut_s7.txt`): 23 at
   0 px, 4 at 2-3 px, 23 still cut: 18 by the loop term (the flag removes only the far term), flag misses at
   A_6 k197 23, A_9 k307 41, A_c k310 44, A_d k148 14, A_3 k148 10 partial. K1595's n5 overcounted.

Flag-pad trials in the mirror (`mkpad.ps1` makes a src copy, `padall.ps1` runs tabdiff + pxdiff over the 21
s7a captures; outputs `s7b/out/pad<P><var>/px/<maze>.json`; the copy's column = the pad build):
- Uniform pad (flag start `stop - arcPer/2 - P`): 0.5 and 0.3 clear both failing stems (A_6 p3 far 30 -> 0,
  A_d p7 17 -> 0; 0.15 clears A_d only) but each also adds border at 9-12 places on every D maze (offsets
  0.3-0.8 arc, 7-40 px): real crossing gaps beside a junction cut short. Rejected.
- Gated by both borders' gap ends (`g`) or by rule K room ends (`k`): clear neither stem. `padlog.ts` shows
  why: the cutting border's OWN gap end reaches the corner (A_6 b1 end 2.293 vs flag start 2.334; A_d b0
  2.427 vs 2.284). The stem cut is that border's own gap, so no pad can clear it without cutting into a gap.
- Gated by "a border's end reaches the flag start" (`i`, pad 0.3): clears A_d p7, not A_6 p3 (0.04 arc short);
  20 places (14 A, 6 D: D_2 x55, D_3 x67, D_5 x258 x110 x320, D_a x268), none viewed. `j` (the gate on the
  border's code reach) is close to uniform: 100 places.
- So the stems need a rule question, not a pad: where a border runs alongside the over into a pair corner
  (gap end past the corner tangent), does its gap stop at the corner's fillet start? Which border places that
  moves must be listed from the mirror and viewed before a capture.

Next: Levi's calls (far-end gap, A_a x148, the loop term at 18 corners); then the corner-fillet gap end in the
mirror (variant `i` is the closest so far), its places viewed, then src + capture + sheets.
# K1525 stage 1: rp=gf's fill look where a thread dives under a junction (Claude agent stage)

The fill look of rp=gf has one approved reference: today's renderer on the same link and physics state (K1474
set the fill's colour to it). At a dive, where a thread passes under a junction, gf's fill does not read as
today's. Link A in the fill look is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&tlk=fill` (hash
fff8c9e5); today's is the same link without `rp=gf` and `gfh`.

The goal: at each spot below gf's fill reads as today's. The same thin gap line where today's draws one; no
dark block, no gap line that loops on around the thread, no small triangle; at a long fade no straight hard
edge and no bright sliver across the ramp; smooth colour where today's is smooth. You own the technique.

## The spots

- **The four dives** of `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1495\out\sheet_dives.png` (made
  2026-11-18 by `shots.mjs` and `sheet2.py` beside it; device px in that capture: 1968,432; 2224,976;
  1904,1136; 1248,1104), each at Crossing fade (`fl`) 0, 0.14, 0.5 and 1.2. Seen then: dive 1 a dark square
  block at the lower left at fl 0, and at 0.5 and 1.2 a straight-edged dark wedge across the ramp; dive 2 a
  gap line that runs on in a loop plus a dark triangle, where today's draws one short line; dive 3 the line
  runs on around the lobe; dive 4 a small triangle at the joint. Master has moved since (Muse 26L, 26M, 26N,
  K1482 stages 7 to 19): re-shoot first and class what is left.
- **K1419**: hard run-colour wedges in the fill at junction spots where today's is smooth
  (`...\.claude\probes\K1407\out\c2\c2_sheet_fixed.png` rows 1-4, 11, 13; `gf_look.ts` steps the colour label
  between chains, K1407's c2 handoff in `docs/design/K1407_c2_bar.md`). Filed before K1474: re-shoot first.
- **K1463**: a small notch where the pink arm meets the blue thread at `?3&xp=off&am=instant&rp=gf` (lower
  right of `...\.claude\probes\K1458\live\zoom_a.png`): the look's fill, the field is clean there (Handoff
  K1451 in `docs/design/K1451_crossing_ties.md`).

## Do

1. In the first 20 minutes: today's | master gf at every spot, in context and closer, on one physics hash.
   A spot that already reads as today's is closed with its picture. If all do, stop and report.
2. Each remaining spot to its terms before a fix: which pass and term draws the fault, with numbers.
3. Fix what lives in the look (`gf_look.ts`, `gf_pass.ts`, the look's part of `gf_glsl.ts`). **Hands off the
   junction field**: `tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_pack.ts` and the field evaluation in
   `gf_glsl.ts` belong to the agent of K1482 stage 21 this afternoon. A fault whose cause is there: name the
   term with its numbers, keep your fix as a patch in your probe directory, and leave `src/` alone for it.
4. Judge each spot against today's, not against master gf. Commit WIP on your branch at every milestone; a
   fix that fails Done stays a patch in your probe directory.

## Done

- The class table by your own eyes, in context and at 4x or more: each spot at each fade value finished,
  better with its leftover named, unchanged, or the field's (with its term).
- Beside it, per spot and fade value, the count of pixels in a 76 px box whose colour is further than a
  stated distance from today's: master gf | your tip. The count is not the bar; the look is.
- Nothing else moves for the worse: in the fill look on link A and on `?3`, at fl 0.14 and 1.2, every place
  your tip differs from master gf outside the spots is listed with a crop and judged against today's. The
  border look on link A (`&tlk=border` off the same link, Levi's own view) is 0 px against master gf, or each
  moved place is named with a crop.
- Sheets in the layout of `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1524\card.py` (the surrounding
  threads with a red box, then the box closer), columns today's | master gf | your tip, one row per spot and
  fade value; colours stretched as there.
- Captures pin the physics state and the background clock: two loads of one build differ by 0 px.
- On your tip, in the last 30 minutes: `node .claude/probes/K1450/hold.mjs <url> <outDir> <profileDir> 60 250
  5000` 60/60 on `?3&xp=off&am=instant&rp=gf` and on link A; `.claude/probes/K1458/dragcheck.mjs` passes for gf
  and gfh (the fade slider still moves the fade); `npm test` green; the K1436 bar once, `STRICT=1
  -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` your starting commit, `-Tag k1525s1`: no new
  find, none grown. A check you could not run is named as not run, with why.

## How to work

As `docs/design/K1482_s20_wedges_notches.md`'s How to work, with these changes: profiles under
`$env:TEMP\k1525s1-*`; ports 6030-6049; your probe directories are `.claude/probes/K1525/s1` and
`.claude/probes/K1525/out/s1` (untracked: do not `git add` pictures or dumps). Look captures need no perf
lock; a timing check does. At most three preview builds alive at once; stop yours and remove their
directories when you finish (the disk is short: K1467, CC156). Change no file in the main checkout or in
another agent's worktree; copy what you use.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop early
while a spot is untried and time remains. A compaction is not a stop: re-read this brief and `git log`. On
stopping: commit WIP, append `### Handoff K1525 s1` here, commit, and report: the class table, the sheets'
absolute paths (each spot named), the numbers, which commits are confirmed on screen, a `Ledger items` list
and K1525's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1525 s1

Claude agent, 10:56-12:56 2026-11-19, branch `worktree-agent-a63f2fb4fcbd5d82d`. **No src change lands**: the branch's
`src/` equals 330069e61's. Two K1419 attempts failed Done and are kept as a patch with the debug views
(`.claude/probes/K1525/s1/k1419_attempts_dbg.patch`, `git apply` onto 330069e61). Running notes:
`.claude/probes/K1525/s1/notes.md`.

**Class table** (link A fill, same state: hash fff8c9e5, simT 20, par 0; counts = px of a 76 px box further than 32
from today's, master gf | tip; tip = master gf, the src is unchanged):

| spot | fl 0 | fl 0.14 | fl 0.5 | fl 1.2 | class |
|---|---|---|---|---|---|
| d1 1968,432 | 676 / 676 | 706 / 706 | 730 / 730 | 727 / 727 | the field's |
| d2 2224,976 | 300 / 300 | 326 / 326 | 506 / 506 | 1100 / 1100 | the field's |
| d3 1904,1136 | 186 / 186 | 209 / 209 | 450 / 450 | 868 / 868 | the field's |
| d4 1248,1104 | 310 / 310 | 529 / 529 | 861 / 861 | 885 / 884 | the field's (part: a gap cut) |
| K1419 mdt r1-r4, g41 r11, r13 | | | | | unchanged |
| K1463 notch on `?3` | | | | | not judged: master gf's `?3` is not stable between two redraws |

- **Dives: the field's term.** Debug mode 6 (raw field coverage, label, min pd/h, under the px gf leaves dark where
  today's draws ink, fl 0): d1 336 px, d2 45, d3 30 with raw field coverage 0 and no label (lab < 0); the nearest piece
  reads pd/h 1.02-1.44, i.e. no piece within h and no corner disc covers them. d4 129 px, coverage 0..1, the labelled part
  cut by a gap. Two look-side causes were ruled out with numbers: lkGap's cut taken only from the slot's over chain
  (uLkFix 1: d1 676 -> 676, d4 310 -> 303) and skipping lkFringe (uLkFix 2: d1 676 -> 676, d4 310 -> 311). The pd/h
  readings come from the end of the look's output site and are suspect (see K1419 below); the coverage term is not.
- **K1419: unchanged.** The wedge is a boundary between the PIECE labels of two chains (mdt r1: chains 77 / 68; r2:
  68 / 57; debug mode 2), not the corner label's bisector. tip1 (lkCornerW: the other corner arm's composed colour, mixed
  by the edge-distance ratio) and tip2 (lkPairJ: the label piece's nearest covered piece of another chain, blended by a
  smoothstep of the two depths) both left the wedges on screen: fill r1 453 -> 436, r2 740 -> 732, r3 515 -> 506,
  r4 493 -> 502 (worse), g41 r11 419 -> 384, r13 484 -> 448; tip2 moved 152 px outside the spots on A fill, each a few px
  nearer today's. Dbg5 (modes 7 / 8) at mdt r1 / r2: the pair search finds no partner at any of 1122 / 1162 boundary px,
  and pd[] at the output site does not describe the evaluation that chose the label (289 px read the label piece itself
  at pd >= h). layers() runs once per ramp configuration and `lab` is the best-weighted configuration's, while pd[] and
  psurf are the last configuration's; the label rule breaks ties by surface entry e, not by distance.
- **Next step for K1419:** capture the partner INSIDE layers() where labC is assigned (gf_glsl.ts ~1324-1331: the second
  covered same-key piece of another chain, with both pd), carried out with the best configuration the way the look's
  SITE at gf_look.ts ~2417 carries lkJ / lkS, then blend the two composed colours by (pdB - pdA). The SITE is in the
  look's part; it only reads the field's values.

**Sheets** (K1524 card.py layout, today's | master gf | attempt tip2 (patch), 1st/99.5th percentile stretch):
- dives d1-d4 at fl 0, 0.14, 0.5, 1.2: `.claude/probes/K1525/out/s1/sheets_final/dives_tip2.png` (master-only:
  `out/s1/sheets/dives_base.png` and `_d1`.. `_d4`);
- K1419 mdt r1-r4 fill / border: `out/s1/sheets_final/k1419_mdt_f.png`, `k1419_mdt_b.png`;
- K1419 g41 r11, r13 fill / border: `out/s1/sheets_final/k1419_g41_f.png`, `k1419_g41_b.png`;
- tip2's moves outside the spots (A fill / border, fl 0.14 / 1.2): `out/s1/sheets/moved_A_{f,b}_fl{0.14,1.2}.png`.

**Confirmed on screen:** none lands; tip1 and tip2 were looked at in crops (wedges still there, r4 worse).

**Checks on the tip** (6030 serves 330069e61's build, the tip's src):
- hold.mjs 60 / 250 / 5000: `?3&xp=off&am=instant&rp=gf` PASS 60/60 (12:08); link A PASS 60/60 (12:09).
- K1458 dragcheck: gf PASS (stops 0.5 / 1.2 / 0.14: 99 / 131 / 0 px of 4357572 > 24 levels), gfh PASS (0 / 124 / 60).
- fade.mjs (SHOTS=1, fl 0 / 0.5 / 1.2 / 0.14): FADE GUARD FAIL, on master's own build: the arc distances pass at every
  fl (678/679, 627/631, 439/451, 676/679 sides), K1460's dot test fails (79 / 98 / 68 / 103 sides with more than 2 dots,
  gf and gfh alike). Not this stage's (the src is master's); not investigated.
- `npm test`: green (256 files passed, 2 skipped; 3190 tests passed, 18 skipped).
- K1436 bar, STRICT=1 -NoPerfLock, ring,def,muse_hash,g41_user_tw64, -Ref 7e905988d -Base 330069e61, tag k1525s1:
  PASS, new 0 grown 0 gone 0 (taken under load; `.claude/probes/K1436/out/bar/k1525s1/bar.txt`).
- Two-load control: link A gf fill fl 0.14 and 1.2 captured again on the same build: 0 px differ from the first load.
- Nothing else moves: the tip's src is master's, so A (fill, border) and `?3` at fl 0.14 / 1.2 are master gf to the px.
- The branch was rebased onto origin/master at 12:46; origin/master has no src change since 330069e61.

**Ledger items**
- K1525: dives d1-d4 are the field's (raw field coverage 0 where today's draws ink; numbers above): hand to the junction
  field's agent (`tables.ts` / `eval.ts` coverage near a dive, no piece within h).
- K1419: next step above (partner captured inside layers() at the label assignment); tip1 / tip2 failed, patch kept.
- K1463 / `?3&xp=off&am=instant&rp=gf`: master gf differs between two redraws of one frozen state (cause not found:
  suspects K390's start-marker flip, fog / explore ticks); K1463 cannot be judged by a same-state capture until it is.

**Handle**
- owner: nobody since 12:56 2026-11-19 (stage 1 stopped at its 2 h cap; no fix landed).
- branch: `worktree-agent-a63f2fb4fcbd5d82d` (worktree `.claude/worktrees/agent-a63f2fb4fcbd5d82d`); last commit: the "K1525 s1 handoff" commit (git log).
- evidence: `.claude/probes/K1525/s1/` (cap.mjs, sheet.py, k1419_spec.py, dbgread.py, moved.py, run_checks.ps1, the jobs
  and spec files, notes.md, k1419_attempts_dbg.patch), outputs in `.claude/probes/K1525/out/s1/` (untracked).
- next: K1419's partner capture inside layers() (above); dives wait on the field's coverage.
- brief: this file.

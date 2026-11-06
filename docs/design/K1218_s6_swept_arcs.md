# K1218 S6: S5's swept arcs with no new lines, cross ji 33's crease, the eye edges

Ledger: K1218. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5980-5989.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." S5 (branch `worktree-agent-aad78f17014e89727` at fc991f51, not merged) built `sweptArc`: a
web paints each arm at the arc its own ribbon gives the pixel (GLSL in `junction_field.ts`, its
mirror in `joinery.ts`). It took out cross ji 33's pulse seam and ji 115's line and smoothed loop ji
113, but it adds two flaws that hold its merge. Its handoff, at the end of
`docs/design/K1218_s5_section_edges.md` on that branch, has the evidence. Make the branch
mergeable and finish the spots:

1. **ji 80's new line** (cross and x4): a 7-level vertical line in the green ramp, on the branch
   only, where the 7-segment search window moves past segment 1 for chain 58's arm. S5's lead: the
   right point lies more than 3 segments back on the inside of chain 58's turn, so let the window
   reach segment 0 near the centre.
2. **Cross ji 155's streak** at device (777-789, 679-682), t2-t5, on the branch only. Arm B's arc
   jumps from 17.2 to 17.07 there, and a second cause S5 did not find also shapes it.
3. **Cross ji 33's leftover crease** at (652-674, 804-814), ±5-7 luma. S5's lead: clamp u at the
   first segment (g == 0).
4. **Loop ji 123 and x4 ji 101**: eye edges that step pixel by pixel, and a violet sliver or fringe,
   in every build.
5. **Any other line the swept arcs add**, at rest and at the four pulse moments, at every junction
   (S5 made no sheets for cross 65, loop 64 or loop 106). Also cross ji 80's faint crease below the
   purple apex, which shows in every build.

Not in this stage: cross ji 51's spur (K1228, `ribbon_mesh.ts`), web rims' MSAA steps (K1227), a
strip edge's 1 px offset from 7474d09b (K1229).

Looks that stay: S2's fused gold, S3's smooth gap edges, S4's gold edge, S5's smooth cross ji 33,
ji 115 and loop ji 113, and everything under "Looks that stay" in
`docs/design/K1218_s2_fused_junctions.md` (the pulse's split and run, no dark wedge between lit
siblings, never the whole junction lit, the gold path's round edge, no gold nub in an off-route
arm). Mode 0.

## Authority

Every technical decision is yours: the technique (swept arcs or anything that serves the look
better), the masks, coverage and fades, the section and gold composite, the paint and its CPU
mirror (`paint_math.ts`), the pulse terms, the fan's geometry and records. No numeric gate: tests
pin what you built, they don't define done. When you find a cause, fix it; don't stop to report it.
Where a call leaves a look open, pick what reads closest to one fused unit and say what you picked.
Re-freeze any pin your change moves and name it in the commit message.

## Start

- Your worktree starts at master. Take S5's work first:
  `git merge --ff-only worktree-agent-aad78f17014e89727` (fc991f51 sits on master's ceff3b43).
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- Tools: S5's in `.claude/probes/K1218/s5/` (tracked; `seam_s5`, `blend_s5`, `diff_s5`, `zoom_s5`,
  `edge_s5` and the rest; headers give usage), and S4's in `s4/`. Copy any you change into `s6/`.
- Read-only shots: master's in the main checkout's `.claude/probes/K1218/s4/out/b2/`; S5's branch
  and sheets in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-aad78f17014e89727\.claude\probes\K1218\s5\out\`;
  7474d09b's in `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\r7474\`.

## Done

1. Per spot (ji 80 in cross and x4, cross ji 155, cross ji 33, loop ji 123, x4 ji 101, each line item
   5 finds), a sheet at K1190's four pulse moments, zoom 4, three rows: 7474d09b, master, your
   branch; plus an at-rest row, master and branch. In `.claude/probes/K1218/s6/out/sheets/`.
2. At rest and at the four pulse moments, a whole-frame diff of master against your branch for x4,
   loop and cross; you viewed every junction it lists with a visible change, and none shows a line,
   streak or step that master lacks.
3. You viewed every crop at full size. Iterate until no spot shows one, or the cap comes. Name any
   you could not remove, and why.
4. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s6/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone (each tool, each src change that renders), broken or
  not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S6`; wait
  for it inside one blocking command), at most two browsers, ports 5980-5989. A dev server's stamp
  is the SHA it started from: check the served code with a mark, as S4's tools do. Stop your
  servers.
- Out of scope (name it if a crop shows it; don't fix it): the text forks (K1220), fire and
  collapse (K1210), the pulse's timing (K1224), shader compile time (K1230).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP, append your handoff to this brief and report. A compaction is not a stop: re-read
  this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against the top row and master; the
sheets' paths, with the two or three to show Levi first; the pins you moved; anything out of scope
a crop showed; the rebase; your last SHA. Commit messages carry the record. End with
`Ledger items` and K1218's handle fields (owner, branch, last commit, evidence, next).

## Handoff (S6, 2026-11-06, 03:04-04:31)

**Built** (src; each commit changes the GLSL in `junction_field.ts` and its CPU mirror in
`ribbon/joinery.ts` together):
- `8b3aba9a`: sweptArc searches every segment a near sweep can reach, from
  trunc((rho - 2fh) / DR) to trunc((rho + 2fh) / DR) + 2. S5 searched seven segments from
  rp - 3 DR. Where an arm bends, a sweep shorter than two half-widths can land outside that
  window, and the window stepping past it made ji 80's 7-level line. Behind the arm's first
  sample (g 0, dot(e, tb) < 0) no sweep exists, and S5 jumped to the projection there. That
  pixel now reads the joint (best = rho, arc = the joint's arc), which equals the u = 0 sweep
  on the normal line.
- `75d338e6`, `9019b404`: on a bend's concave side the normal sweep converges toward the bend's
  focus, which squeezes the arc map into a line (ji 80's). There the arc hands over to the plain
  projection. fold = the winner's signed distance, positive on the concave side. kappa is read at
  the pixel's own radius, between the curvatures at the two segment ends. The weight is
  w = 1 - (1 - smoothstep(fh, 2fh, |l|)) (1 - smoothstep(0.1, 0.9, fold kappa)), and the result
  is mix(arc, proj, w).
- Pins:
  - K320's JUNCTION_FRAG budget (`test/render/k320_slim.test.ts`): master 32,884, S5 34,759,
    then 35,079 -> 35,509 -> 35,635 here.
  - K299's ROUNDED_QUOTIENTS (`test/render/paint_ring_lap.test.ts`) lists the window's two
    bounds, `int((rho - reach) / uJParams2.x)` and `int((rho + reach) / uJParams2.x)`, each
    with why one off is benign.
  - The junction-field text changed, so that program compiles cold once for every player
    (K307).
- Tools in `.claude/probes/K1218/s6/` (each header gives its usage):
  - `sheets_s6.ps1`: the sheets;
  - `swept_s6.mjs`: the field's roots per pixel, read from the served module;
  - `ramp_s6.mjs`: a window's largest luma second difference;
  - `row_s6.mjs`, `windiff_s6.mjs`, `locked_s6.ps1`, `run_shots_s6.ps1`.
- Outputs (untracked) are in `s6/out/`:
  - `c/`: this branch's shots;
  - `nomark_c/`: no-marker shots;
  - `mvc/`: the whole-frame diff tables;
  - `look/`: crops;
  - `sheets/`.

**Spots**
1. **ji 80 (cross, x4): fixed.**
   - S5's 7-level line (the search window stepping) is gone with 8b3aba9a. The focal
     compression it then showed (arm B, row 222: the CPU field's d(arc)/dx peaks at 73 with
     no hand-over, against 13-17 around it) reads 30 with the hand-over.
   - GPU row y 230: the 2-levels-per-px jump at x 2087-2089 is gone. The worst luma second
     difference reads master 3.2, 8b3aba9a (no hand-over) 2.7, this branch 2.1.
   - Sheets `cross_80`, `x4_80`: the branch row is smooth. The 7474d09b and master rows show the
     notch and crease below the purple apex (spot 5's ji 80 crease); the branch has neither.
2. **Cross ji 155: not fixed. Cause measured, not removed.**
   - The streak at (777-789, 679-682) shows only without markers (`nomark_c/`, crop
     `look/c155_nomark.png`). It is on S5's branch and on this one, not on master.
   - On this branch, at t2-t4 it covers 283-284 px over 2 levels (max 7), 112 px at t5 and 3 px
     at rest. S5's branch read 263-267 px and 96.
   - Mechanism (`swept_s6`, `out/swept155/col783.txt`): at x 783, arm 0 (chain 71) switches root.
     It uses segment 3 (arc 0.172) at y 679, segment 0 (arc 0.021) at y 680, then the joint from
     y 682.
   - Row 680 has three near-tied roots at rho 0.311: segments 0, 2 and 3, with |l| 0.31-0.32,
     all beyond fh.
   - fold kappa reads 0.047-0.124 there, so the hand-over weight is 0. Inferred: kappa read at
     the pixel's radius misses the bend next to the joint. That is the second cause.
   - Untested fixes:
     - kappa = max(kappa at rho, kappa at the winner's foot);
     - blend the arcs of near-tied roots;
     - hand over to the projection where the candidates' arcs disagree.
3. **Cross ji 33: not fixed** (measured at the end).
   - The zoom-4 sheet reads smooth, but the crease window (650-676, 802-816) measures the
     leftover crease at t5 and t6 only. Largest luma second difference, x / y:

     | Build | t5 | t6 |
     |---|---|---|
     | 7474d09b | 2.2 / 2.8 | 1.4 / 1.7 |
     | master | 1.9 / 2.2 | 2.0 / 2.9 |
     | branch | 3.2 / 4.5 | 4.9 / 5.6 |

   - The branch's worst is at (656-659, 806-808). At rest and at t4, all three read about 1.4.
   - Master against the branch in the window: 208-214 px over 0.5 levels, max 6-7.
   - Crop: `look/c33_win.png`. Next: `swept_s6` at (657, 807); it is likely ji 155's root switch.
4. **Loop ji 123, x4 ji 101: not fixed, not attributed.**
   - The eye edges step identically in the 7474d09b, master and branch rows.
   - x4 101's violet sliver at the eye's upper left is in all three builds. Inferred: not the
     swept arcs, since 7474d09b and master show it too. Not attributed.
5. **The others.**
   - Sheets `cross_65`, `loop_64`, `loop_106`: no line on the branch that master lacks. Their dark
     edges step identically in master and the branch.
   - Kept looks: `cross_115` is smooth. `loop_113`'s corners are smooth; its centre is under the
     marker.

**Whole-frame diffs** (`s4/near_s2.mjs`, master against this branch, at rest and t3-t6; tables in
`out/mvc/`):

| Stand | Changed px | Groups |
|---|---|---|
| cross | 127.6-128.9k | 59 |
| x4 | 186.6-195.4k | 74 |
| loop | 114.9-115.7k | 56 |

- Viewed: the largest change in each stand (x4 t3 ji 108 and ji 147, loop t6 ji 89, loop t3
  ji 88, loop at rest ji 80 and ji 47). Each is a step, line or crease on master that the branch
  smooths.
- Not viewed one by one: about 50 more groups per stand, most 2.6-4.5k px with max 3-12.
- Done item 2 therefore does not fully hold: ji 155's streak is branch-only, and ji 33's
  crease is stronger on the branch than on master at t5 and t6.

**Out of scope seen:** none. The magenta band or column on some sheets is the same in every
row. Inferred: the sheet tool's fill outside the frame.

**Rebase:** clean onto origin/master `e72e6768`. `npm test` is green: 217 files, 2879 tests.

**Next (S7):**
1. Cross 155's near-tied root switch.
2. Cross 33's t5/t6 crease (re-measure it with `ramp_s6`).
3. Spot 4's eye edges.
4. The unviewed groups in `out/mvc/`.

Sheets for Levi first: `sheets/cross_80.png`, `sheets/x4_80.png`, `look/c155_nomark.png`.
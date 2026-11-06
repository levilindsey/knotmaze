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

# K1218 S7: the swept arc continuous where its roots tie, and the branch ready to merge

Ledger: K1218. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5980-5989.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." S5 and S6 (branch `worktree-agent-ae639b326ea18b921` at 626a5a21, not merged) built
`sweptArc`: a web paints each arm at the arc its own ribbon gives the pixel (GLSL in
`junction_field.ts`, its mirror in `ribbon/joinery.ts`). It smooths many of master's steps (ji 80,
ji 115, loop ji 113, cross ji 33's pulse seam, x4 ji 108 and 147, loop ji 89, 88, 80 and 47), but two
flaws hold its merge. S6's handoff, at the end of `docs/design/K1218_s6_swept_arcs.md` on that
branch, has the evidence. Make the branch mergeable:

1. **Cross ji 155's streak** at device (777-789, 679-682), t2-t5, seen without markers: where
   several roots tie (row 680: segments 0, 2 and 3 at rho 0.311, |l| beyond fh), the winner flips
   from row to row and the arc jumps (0.172, then 0.021, then the joint). Make the arc continuous
   through such ties, wherever they occur. S6's untested leads: blend near-tied roots' arcs; hand
   over to the projection where the candidates' arcs disagree; kappa = max(kappa at rho, kappa at
   the winner's foot). The technique is yours.
2. **Cross ji 33's crease** in (650-676, 802-816) at t5 and t6: the largest luma second
   difference reads 3.2-5.6 on the branch against master's 1.9-2.9 (`ramp_s6.mjs`), worst at
   (656-659, 806-808). S6's lead: the same root switch.
3. **Every other junction**: S6 viewed only the largest groups of master against the branch;
   about 50 more per stand are unviewed (`s6/out/mvc/`). Build a check that scores, per group, at
   rest and t3-t6, where the branch is rougher than master (edges both builds share dominate a
   box's maximum: compare the two builds' second differences pixel by pixel). View every group it
   flags at full size, and fix what reads as a line, streak, step or crease master lacks.

Not in this stage: dark edges inside junctions and x4 ji 101's violet sliver (K1231), cross ji 51's
spur (K1228), web rims' MSAA steps (K1227), a strip edge's 1 px offset (K1229).

Looks that stay: S2's fused gold, S3's smooth gap edges, S4's gold edge, every spot the branch
smooths (above), and everything under "Looks that stay" in `docs/design/K1218_s2_fused_junctions.md`
(the pulse's split and run, no dark wedge between lit siblings, never the whole junction lit, the
gold path's round edge, no gold nub in an off-route arm). Mode 0.

## Authority

Every technical decision is yours: the technique, the masks, coverage and fades, the section and
gold composite, the paint and its CPU mirror (`paint_math.ts`), the pulse terms, the fan's geometry
and records. No numeric gate: tests pin what you built, they don't define done. When you find a
cause, fix it; don't stop to report it. Where a call leaves a look open, pick what reads closest to
one fused unit and say what you picked. Re-freeze any pin your change moves and name it in the
commit message.

## Start

- Your worktree starts at master. Take the branch first:
  `git merge --ff-only worktree-agent-ae639b326ea18b921` (626a5a21 sits on master's e72e6768).
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- Tools: S6's in `.claude/probes/K1218/s6/` (`swept_s6`, `ramp_s6`, `row_s6`, `windiff_s6`,
  `sheets_s6.ps1`, `run_shots_s6.ps1`; headers give usage), S4's in `s4/` (`near_s2`,
  `nomark_s4`). Copy any you change into `s7/`.
- Read-only shots: master's in the main checkout's `.claude/probes/K1218/s4/out/b2/`; the branch's
  shots, no-marker shots, diff tables and sheets in
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ae639b326ea18b921\.claude\probes\K1218\s6\out\`;
  7474d09b's in `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\r7474\`. Shoot
  master's no-marker shots yourself if you need them.

## Done

1. Cross ji 155 without markers, at t2-t5 and at rest, and cross ji 33 at t3-t6: sheets at zoom 4
   with rows master, S6's branch, yours, in `.claude/probes/K1218/s7/out/sheets/`. Neither shows a
   streak or crease master lacks.
2. The check from item 3 for x4, loop and cross, its table in `s7/out/`; you viewed every group it
   flags, and none shows a line, streak, step or crease master lacks.
3. Re-shot on your branch, S6's `cross_80` and `x4_80` and S5's `cross_115` and `loop_113` still
   read smooth.
4. You viewed every crop at full size. Name any flaw you could not remove, and why.
5. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s7/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone (each tool, each src change that renders), broken or
  not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S7`; wait
  for it inside one blocking command), at most two browsers, ports 5980-5989. A dev server's stamp
  is the SHA it started from: check the served code with a mark, as S4's tools do. Stop your
  servers.
- Out of scope (name it if a crop shows it; don't fix it): the text forks (K1220), fire and
  collapse (K1210), the pulse's timing (K1224), shader compile time (K1230).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP, append your handoff to this brief (after your final rebase) and report. A compaction
  is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against master; the sheets' paths,
with the two or three to show Levi first; the pins you moved; anything out of scope a crop showed;
the rebase; your last SHA. Commit messages carry the record. End with `Ledger items` and K1218's
handle fields (owner, branch, last commit, evidence, next).

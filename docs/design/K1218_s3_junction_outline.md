# K1218 S3: a junction's outline as smooth as a ribbon's edge, and the spots S2 left

Ledger: K1218. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5980-5989.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." K1218 S2 (master 5a12c51f) removed the zigzags, notches and colored slivers inside junctions:
where another arm's sliver showed between the gold path and a dark gap, the gold now reaches the
gap. What is left:

1. **A gap's edge is a pixel staircase.** Where a junction meets its dark gap (the background
   between two arms, the inner turn's round edge), the edge has no anti-aliasing: full gold pixels
   against full background, in one-device-pixel steps. It was as hard against teal and purple in
   master before S2 and in 7474d09b, but gold against the background shows it. Seen at rest at x4
   ji 149, 125, 102 and at (372, 240) frame px; loop ji 12 (the gold's lower edge), 13, 88, 91, 122;
   cross ji 112, 114. Make it as smooth as a ribbon's own edge, at rest and pulsing.
2. **Nubs where a gap's outline kinks**: loop ji 88 (a dark point into the gold at its cusp), 89
   (the cusp left of the gold), 13 (the gap's upper left), 122 (the gap's left end).
3. **Loop ji 113's short vertical edge**: the rim crosses arm 2's outward-bulging edge (a 0.91 px
   dip). S2's lead: a rim that stays outside a curved arm edge (`joinery.ts`'s wedge loop, about
   lines 1976-2112; `rim_curve.ts`). Its rim census's deepest dips (15-24 px at 106-163° wedges) are
   unexplained. Evidence: `.claude/probes/K1218/s2/rim113.mjs`, `rimcensus.mjs`, and their outputs
   in the main checkout's `.claude/probes/K1218/s2/out/rim113/` and `out/rimcensus/`.
4. **Loop ji 12's small dark triangle**: one crossing's casing margin plus its fade by the shared
   joint (7474d09b draws it too).
5. **Cross ji 33's faint lines** at the lower left at t5 and t6: S2 traced them to the ribbons'
   own pulse paint, fainter than 7474d09b's. If a line still reads there, it goes.

Looks that stay: master's fused gold from S2, and everything under "Looks that stay" in
`docs/design/K1218_s2_fused_junctions.md` (the pulse's split and run, no dark wedge between lit
siblings, never the whole junction lit, the gold path's round edge, no gold nub in an off-route
arm). Mode 0.

## Authority

Every technical decision is yours: the technique, the masks, coverage and fades, the gold
composite, the fan's geometry and records, the rims, the CPU twin. No numeric gate: the tests you
keep or add pin what you built; they don't define done. When you find a cause, fix it; don't stop
to report it. Where the calls above leave a look open, pick what reads closest to one fused unit
and say what you picked. Re-freeze any pin your change moves and name it in the commit message.

## Start

- Your worktree starts at master 5a12c51f.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- S2's tools are tracked in `.claude/probes/K1218/s2/`: `shoot_s2.mjs`, `run_shots_s2.ps1`,
  `sheets_s2.mjs`, `near_s2.mjs` (which junctions changed between two shot folders), `diff_s2.mjs`.
  Copy any you change into `.claude/probes/K1218/s3/`. Read-only shots in the main checkout:
  7474d09b's in `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\r7474\`, master's
  (S2's last round) in `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1218\s2\out\branchC\`.
- A staircase shows in nearest-neighbour crops at zoom 4 or more; a ribbon's own edge beside it is
  the smooth reference.

## Done

1. Per spot (x4 ji 149, 125, 102; loop ji 12, 13, 88, 89, 91, 113, 122; cross ji 33, 112, 114), a
   sheet at K1190's four pulse moments, zoom 4, three rows: 7474d09b, master, your branch; plus an
   at-rest row, master and branch. In `.claude/probes/K1218/s3/out/sheets/`.
2. At rest, `near_s2.mjs` master against your branch for x4, loop and cross; you viewed every
   junction it lists with a visible change.
3. You viewed every crop at full size. Iterate until no spot shows a staircase, nub, edge,
   triangle or line on or inside a junction, at rest or pulsing, or the cap comes. Name any you
   could not remove, and why.
4. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s3/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S3`; wait
  for it inside one blocking command), at most two browsers, ports 5980-5989. A dev server's stamp
  is the SHA it started from: check the served code with a mark, as S2's tools do. Stop your
  servers.
- Out of scope (name it if a crop shows it; don't fix it): the text forks (K1220), fire and
  collapse (K1210), the pulse's timing against 7474d09b.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP and report. A compaction is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against the top row and master; the
sheets' paths, with the two or three to show Levi first; the pins you moved; anything out of scope
a crop showed; the rebase; your last SHA. Commit messages carry the record. End with
`Ledger items` and K1218's handle fields (owner, branch, last commit, evidence, next).

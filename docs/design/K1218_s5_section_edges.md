# K1218 S5: the section colours' edges, cross ji 33's pulse seam, and the last spots

Ledger: K1218. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5980-5989.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." S2 (5a12c51f) took out the zigzags and slivers, S3 (e8cb5264) anti-aliased the gap edges,
and S4 (master 73be7c90) gave the gold path's edge a 2.5 px ramp where it meets an arm's colour in
a web or on a cover strip (`ROUTE_BAND_RAMP`, `junction_field.ts`, its mirror in `joinery.ts`).
S4's handoff (the end of `docs/design/K1218_s4_route_edge.md`) names what is left:

1. **Section colours' staircases**: where two sections' colours meet inside a junction, at cross ji
   155 and loop ji 113 (S4 saw them, did not look further). Make that edge as smooth as the gold
   band's edge now is, at rest and pulsing, at every junction that shows one (find the others).
2. **Cross ji 33's pulse seam** at (647,830)-(660,821) frame px, at t0, t5 and t6: along the fan's
   edge the web's pulse reads 5-8 levels above the ribbon's. Hiding the fans removes it; with no
   pulse the window is flat. Make the web's pulse meet the ribbon's there without a seam.
3. **Loop ji 123's oval edge** and **x4 ji 101's edge at the frame's left**: look, and fix any
   staircase, edge or line on or inside the junction.
4. **Cross ji 51's hairline** at (1019,1136): 4 px of background between two ribbons in every build,
   unchanged with fans, strips and the gap mask off. Find which two ribbons; fix it if the drawing
   is at fault, and name it if the threads really stand that far apart.
5. **Where a gold band leaves a cover strip**: check that S4's ramp doesn't shift the edge 1-2 px.

Not in this stage: cross ji 112's lip (MSAA on a web's near-level rim; ribbons' edges step the same
way, so it stays unless Levi asks).

Looks that stay: S2's fused gold, S3's smooth gap edges, S4's gold edge, and everything under
"Looks that stay" in `docs/design/K1218_s2_fused_junctions.md` (the pulse's split and run, no dark
wedge between lit siblings, never the whole junction lit, the gold path's round edge, no gold nub
in an off-route arm). Mode 0.

## Authority

Every technical decision is yours: the technique, the masks, coverage and fades, the section and
gold composite, the paint (and its CPU mirror, `paint_math.ts`), the pulse terms, the fan's
geometry and records, the rims. No numeric gate: the tests you keep or add pin what you built; they
don't define done. When you find a cause, fix it; don't stop to report it. Where a call above leaves
a look open, pick what reads closest to one fused unit and say what you picked. Re-freeze any pin
your change moves and name it in the commit message.

## Start

- Your worktree starts at master 73be7c90.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- S4's tools are tracked in `.claude/probes/K1218/s4/` (`run_shots_s4.ps1`, `sheets_s4.mjs`,
  `near_s2.mjs`, `attr_s4.mjs`, `nomark_s4.mjs`, `lumawin_s4.mjs`; headers give usage). Copy any you
  change into `.claude/probes/K1218/s5/`. Read-only shots in the main checkout: master's (S4's
  branch) in `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1218\s4\out\b2\`, 7474d09b's in
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\r7474\`.
- A staircase shows in nearest-neighbour crops at zoom 4 or more; a ribbon's own edge beside it is
  the smooth reference.

## Done

1. Per spot (cross ji 155, loop ji 113 and the other section edges you find; cross ji 33; loop ji
   123; x4 ji 101; cross ji 51; one band leaving a strip), a sheet at K1190's four pulse moments,
   zoom 4, three rows: 7474d09b, master, your branch; plus an at-rest row, master and branch. In
   `.claude/probes/K1218/s5/out/sheets/`.
2. At rest, `near_s2.mjs` master against your branch for x4, loop and cross; you viewed every
   junction it lists with a visible change.
3. You viewed every crop at full size. Iterate until no spot shows a staircase, seam, hairline, edge
   or line on or inside a junction, at rest or pulsing, or the cap comes. Name any you could not
   remove, and why.
4. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s5/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S5`; wait
  for it inside one blocking command), at most two browsers, ports 5980-5989. A dev server's stamp
  is the SHA it started from: check the served code with a mark, as S4's tools do. Stop your
  servers.
- Out of scope (name it if a crop shows it; don't fix it): the text forks (K1220), fire and
  collapse (K1210), the pulse's timing (K1224).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP and report. A compaction is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against the top row and master; the
sheets' paths, with the two or three to show Levi first; the pins you moved; anything out of scope
a crop showed; the rebase; your last SHA. Commit messages carry the record. End with
`Ledger items` and K1218's handle fields (owner, branch, last commit, evidence, next).

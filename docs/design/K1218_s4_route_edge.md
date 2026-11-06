# K1218 S4: the gold path's edge as smooth as a ribbon's, and the spots S3 left

Ledger: K1218. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5980-5989.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." S2 (5a12c51f) took out the zigzags, notches and slivers. S3 (master e8cb5264) anti-aliased
the gap edges (the fan's discard tests a centroid look, so MSAA reaches a fan's rim), capped the
joint's gap window (loop ji 12's triangle) and kept a folded rim's inner ring inside (loop ji 122's
shelf, the teeth where a gap's outline kinks). What is left:

1. **The gold path's edge is a pixel staircase** where it meets an arm's own colour inside a
   junction (the route band's round edge and its corner, K81): full gold against full teal in
   one-device-pixel steps, in every build since K81. See x4 ji 149's gold/teal boundary in S3's
   `out/sheets3/x4_149.png`. Make it as smooth as a ribbon's edge against the background, at rest
   and pulsing, wherever gold meets an arm's colour in a junction.
2. **Cross ji 33's faint lines** at the lower left, t5 and t6: a pulse band, and a 6-7-level step
   between the fan and the ribbon at (650,828)-(658,823) frame px.
3. **Cross ji 112's soft lip**, about 5 px, at (1086,195) frame px.
4. **Cross ji 51's hairline**: 4 px of ribbon at (1019,1136), in every build.
5. **x4 at (372,240)** frame px: a gap edge S3 did not reach.
6. **Loop ji 113's short vertical edge** (S3's brief, item 3, has S2's lead). A marker sits on it
   in the shots; look in a moment where it shows, and fix it if it does.
7. **Fold tips**: S3's fold fallback (cd93a184, `ribbon_mesh.ts` pushFan) pulls the fan's inner
   ring toward the centre at a sharp rim fold. Check the border look at the tips it changed.

Looks that stay: S2's fused gold, S3's smooth gap edges, and everything under "Looks that stay" in
`docs/design/K1218_s2_fused_junctions.md` (the pulse's split and run, no dark wedge between lit
siblings, never the whole junction lit, the gold path's round edge, no gold nub in an off-route
arm). Mode 0.

## Authority

Every technical decision is yours: the technique, the masks, coverage and fades, the gold
composite, the paint (and its CPU mirror, `paint_math.ts`), the fan's geometry and records, the
rims. No numeric gate: the tests you keep or add pin what you built; they don't define done. When
you find a cause, fix it; don't stop to report it. Where a call above leaves a look open, pick what
reads closest to one fused unit and say what you picked. Re-freeze any pin your change moves and
name it in the commit message.

## Start

- Your worktree starts at master e8cb5264.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- S3's tools are tracked in `.claude/probes/K1218/s3/` (`shoot_s3.mjs`, `run_shots_s3.ps1`,
  `sheets_s2.mjs`, `near_s2.mjs`, `diff_s2.mjs`, `attr_s3.mjs`, ...). Copy any you change into
  `.claude/probes/K1218/s4/`. Read-only shots in the main checkout: master's (S3's last round) in
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1218\s3\out\branch3\`, 7474d09b's in
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\r7474\`.
- A staircase shows in nearest-neighbour crops at zoom 4 or more; a ribbon's own edge beside it is
  the smooth reference.

## Done

1. Per spot (x4 ji 149 and two other route junctions where gold meets an arm, your choice; cross
   ji 33, 112, 51; x4 (372,240); loop ji 113; one fold tip), a sheet at K1190's four pulse
   moments, zoom 4, three rows: 7474d09b, master, your branch; plus an at-rest row, master and
   branch. In `.claude/probes/K1218/s4/out/sheets/`.
2. At rest, `near_s2.mjs` master against your branch for x4, loop and cross; you viewed every
   junction it lists with a visible change.
3. You viewed every crop at full size. Iterate until no spot shows a staircase, lip, hairline, edge
   or line on or inside a junction, at rest or pulsing, or the cap comes. Name any you could not
   remove, and why.
4. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s4/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S4`; wait
  for it inside one blocking command), at most two browsers, ports 5980-5989. A dev server's stamp
  is the SHA it started from: check the served code with a mark, as S3's tools do. Stop your
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

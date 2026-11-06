# K1220 S2: a text fork reads as one fused piece, as the maze's junctions now do

Ledger: K1220. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5970-5979.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." K1218 S2-S7 (master e4075024) made the maze's junctions read that way. The cursive text's
forks don't: at the i fork in "ai" and at the a's two attachments (K836), a disc of a different
colour shows its round edge inside the stroke, and the arms' straight end cuts stick out of it as
a notch and a ledge (Run N's 3x crops, `.claude/probes/K1220/run_n/out/ai_xh3_ji0_normal_3x.png`
and `a_xh3_ji1_normal_3x.png` in the main checkout). Make every text fork read as one piece: no
disc edge inside, no notch or ledge where an arm's cut meets it, its crotch drawn by K830's corner
rule, at every letter that forks.

Run N's cause (`.claude/probes/K1220/run_n/SUMMARY.md`, and `## K1220` in `docs/ledger_notes.md`;
its line numbers are 02805d13's, so search by the code): a text arm shorter than 0.15 world is
dropped (`joinery.ts`, `if (len < 0.15) continue;`), so the fork writes no field record and falls
back to a disc on the host chain's axis, painted by the AXIS strip lookup, which blends no arm;
each arm ends in a straight perpendicular cap (`ribbon_mesh.ts`), and the wedge loop skips these
forks. N's leads (its task 4): real field records for text forks (a threshold at glyph scale, so
they take the maze's blend, strips, wedges and corners), or an AXIS disc that blends the fork's
arms and covers the cuts' corners. S1 stopped at a session's end and left 9 lines in `joinery.ts`
(branch `worktree-agent-a887c979ca2299b92`, 25a5c501, on an old base): a lead only.

Levi's calls that bind: K1119, v6.8 is the approved cursive, so no glyph's centreline, width or
join moves, only how a fork is filled and coloured; K1001, keep K830's corner rule
(`cornerRoundShare`: broad gaps round, narrow points sharp); K836, the a attaches to its
undisturbed oval, tangent. The maze's junctions keep K1218's look, and nothing away from a text
fork changes. Mode 0.

## Authority

Every technical decision is yours: the records, the threshold, the disc, the wedges, the caps, the
blend, the paint and its CPU mirror, the fan's geometry. No numeric gate: tests pin what you built,
they don't define done. When you find a cause, fix it; don't stop to report it. Where a call leaves
a look open, pick what reads closest to one fused unit and say what you picked. Re-freeze any pin
your change moves and name it in the commit message. If a fix would need a glyph's shape to change,
say what it would take and take another way.

## Start

- Your worktree starts at master e4075024.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- Tools: Run N's in `.claude/probes/K1220/run_n/` (`shoot.mjs`, `measure.mjs`, `proof.mjs`,
  `run_locked.ps1`, `crop.mjs`, `lib.mjs`, `png.mjs`, `vite.private-cache.config.ts`), and K1218's
  sheet and diff tools in `.claude/probes/K1218/s7/` and `s4/`. Copy any you use into
  `.claude/probes/K1220/s2/`. N's shots are from an old master: shoot today's master yourself.

## Done

1. A census of every text fork the cursive draws, at xh 2 and xh 3, on a word set holding every
   letter plus N's words (say which): how many write a field record, on master and on yours.
2. Sheets, nearest-scaled at zoom 4, rows master and yours, for N's stands (the i fork in "ai", the
   a's L and R, at xh 2 and 3) and every other letter's forks, at rest and in every state the
   text shows that reaches a fork. In `.claude/probes/K1220/s2/out/sheets/`.
3. A whole-frame diff of master against yours, at rest, for a text stand and for the maze's x4,
   loop and cross stands: only text forks change.
4. You viewed every crop at full size. Name any flaw you could not remove, and why.
5. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1220/s2/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone (each tool, each src change that renders), broken or
  not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1220-S2`; wait
  for it inside one blocking command), at most two browsers, ports 5970-5979. A dev server's stamp
  is the SHA it started from: check the served code with a mark. Stop your servers.
- Out of scope (name it if a crop shows it; don't fix it): the glyphs' shapes and tails (K863,
  K1112, K1213, K1225), fire and collapse (K1210), the maze junctions' residuals (K1227-K1231), the
  pulse's timing (K1224), shader compile time (K1230).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP, append your handoff to this brief (after your final rebase) and report. A compaction
  is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per fork, what you see against master; the sheets' paths,
with the two or three to show Levi first; the pins you moved; anything out of scope a crop showed;
the rebase; your last SHA. Commit messages carry the record. End with `Ledger items` and K1220's
handle fields (owner, branch, last commit, evidence, next).

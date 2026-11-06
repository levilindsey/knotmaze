# K1218 S2: every junction one fused unit, the edges the approved build also draws included

Ledger: K1218 (with K1219). One Claude Opus stage agent in its own worktree, the only code agent in
junction files while it runs. Cap 2 h. Ports 5970-5979.

## Goal

Levi, 2026-11-05: "There are clear lines/edges of the highlight within the interior of the
junction. ... These junctions need to appear as though they are one whole fused seamless unit."
K1211 S6 (master 13aab452) made the pulse light one soft glow, as the approved build 7474d09b
draws it. Its sheets (`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\sheets\`;
rows: 7474d09b, master before S6, S6, then at rest) still show edges inside junctions that
7474d09b draws too. They go now:

- loop ji 89, 12, 88: the gold path's straight cut and zigzag. Earlier runs' lead: a crossing next
  to the joint masks the fan inside its over thread's tube, so that ribbon's straight gold cut at
  the joint and its crest show through (`walked_gold.ts:172`).
- loop ji 12: a small dark triangle (lead: slot 28's casing fade on ch5's gold, `gap_mask.ts:802`).
  x4 ji 149: a teal notch past the gold band's round edge (lead: the fan's untraveled web,
  `junction_field.ts:358`). This is K1219.
- loop ji 113: a short vertical edge. cross ji 33: faint lines at the lower left at t5 and t6.

The leads' detail is in `docs/ledger_notes.md` under `## K1218 (2026-11-05, 22O reviewed)`.
K1201 (an arm's light stepping near its joint) was to be fixed by crossfading the pulse bands
that S6 removed: if a crop shows a step there, it is yours too.

Looks that stay: everything else as master draws it, which matches the top row. The pulse
"splits, it runs toward the player, and it goes straight through with no dim moment"; "no dark
wedge between two lit siblings"; never the whole junction lit (K1139). The gold path's edge stays
round; no gold "discontinuous flat nub" in an off-route arm (K81). At rest, junctions as master
draws them or closer to one fused unit. Mode 0.

## Authority

Every technical decision is yours: the technique, the masks and fades, the gold composite, the
fan's geometry and records, the CPU twin. No numeric gate: the tests you keep or add pin what you
built, they don't define done. When you find a cause, fix it; don't stop to report it. Where the
calls above leave a look open, pick what reads closest to one fused unit and say what you picked.
Re-freeze any pin your change moves and name it in the commit message. K1218 S1's WIP (branch
`worktree-agent-ab5152230ff5f1d62`, 8d28700f..bcbf5dec: jointMask drops a fan slot whose own-arm
over tube reaches the joint; a fade waiver it called too broad) is yours to cherry-pick, rework or
ignore.

## Start

- Your worktree starts at master 13aab452.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- S6's tools are tracked: `.claude/probes/K1211/shoot6.mjs`, `run_shots6.ps1`, `sheets6.mjs`,
  `diff6.mjs`. Copy any you change into `.claude/probes/K1218/s2/`. S6's shots, 7474d09b's row
  among them, are in the main checkout's `.claude/probes/K1211/out6/` (read-only); its 7474d09b
  build may still be in `$env:TEMP\knotmaze-previews\k1211s6` (else `scripts/preview.ps1 -Ref
  7474d09b -Root $env:TEMP\knotmaze-previews\k1218s2 -BuildOnly`).

## Done

1. Per spot (cross ji 33; x4 ji 149, 125; loop ji 89, 88, 113, 13, 12), a sheet at K1190's four
   pulse moments, three rows: 7474d09b, master, your branch; plus an at-rest row, master and
   branch. In `.claude/probes/K1218/s2/out/sheets/`.
2. You viewed every crop at full size. Iterate until no spot shows a line, edge, zigzag, triangle,
   notch, wedge or bite inside a junction, at rest or pulsing, or the cap comes. Name any you
   could not remove, and why.
3. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s2/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S2`; wait
  for it inside one blocking command), at most two browsers, ports 5970-5979. A dev server's stamp
  is the SHA it started from: check the served code as S6's tools do. Stop your servers.
- Out of scope (name it if a crop shows it; don't fix it): the text forks (K1220), fire and
  collapse (K1210), the pulse's timing against 7474d09b.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP and report. A compaction is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against the top row and master;
the sheets' paths; the pins you moved; anything out of scope a crop showed; the rebase; your last
SHA. Commit messages carry the record. End with `Ledger items` and K1218's handle fields (owner,
branch, last commit, evidence, next).

# K1211 S6: one fused glow inside each junction, judged by the approved look

Ledger: K1211. One Claude Opus stage agent in its own worktree, the only code agent in junction
files while it runs. Cap 2 h. Ports 5960-5969.

## Goal

Levi, 2026-11-05: "There are clear lines/edges of the highlight within the interior of the
junction. ... These junctions need to appear as though they are one whole fused seamless unit."
The approved look is the TOP ROW of K1190's sheets (build 7474d09b): while a pulse crosses a
junction its light reads as one soft glow, and the gold path's edge stays round. The rows below
show the four defects to remove (`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1139\out\s4\sheets\`,
`t4_ji33_cross_n.png` and `t6_ji149_x4_n.png` first): sharp curved fronts; straight edges and a
paler straight-sided wedge; the gold path's edge a straight line with a corner; a small bite.

Looks that stay as Levi called them: K1139, the pulse "splits, it runs toward the player, and it
goes straight through with no dim moment", "no dark wedge between two lit siblings", and never the
whole junction lit; K81, no gold "discontinuous flat nub" in an off-route arm; at rest, junctions
as master draws them (S2's round gold edge, S3's lit edge) or closer to one fused unit; mode 0.

## Authority

Every technical decision is yours: the technique, K81's route-band composite (rebuild it if that
is what it takes), the pulse bands and their taus, S4's soft field (keep, change or drop it), the
fan's geometry and records, the CPU twin. No numeric gate: S4's bar and `soft_light.test.ts`'s
bar tests may be rewritten or removed; the tests you keep or add pin what you built, they do not
define done. When you find a cause, fix it; don't stop to report it. Where the calls above leave
a look open, pick what reads closest to the top row and say what you picked. Re-freeze any pin
your change moves and name it in the commit message.

## Start

- `git cherry-pick cd868eec..2b11df8e` (S4's six commits, on `worktree-agent-ad43222916dc55569`).
  S4's Handoff (end of `docs/design/K1211_s4_soft_light.md`) names two causes: K81's composite
  paints the gold band's crest over its tube (`c = cg + gT*(c - c0)`), and bands sharing an arm
  read different taus near the joint.
- `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- S4's references, read-only: `Copy-Item -Recurse C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a222ff792a21132ec\.claude\probes\K1211\out4 .claude\probes\K1211\out4`.
  S4's tools are `.claude/probes/K1211/*4.*` and `s4_ids.ts`; copy any you change to a `6` name.

## Done

1. Per spot (cross ji 33; x4 ji 149, 125; loop ji 89, 88, 113, 13, 12), a sheet at K1190's four
   pulse moments, three rows: 7474d09b (`scripts/preview.ps1 -Ref 7474d09b -Root
   $env:TEMP\knotmaze-previews\k1211s6 -BuildOnly`), master, your branch; plus an at-rest row,
   master and branch. In `.claude/probes/K1211/out6/sheets/`.
2. You viewed every crop at full size. Iterate until no spot shows a line, edge, wedge or bite
   inside a junction that the top row doesn't, or the cap comes.
3. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Read-only by absolute path: K1190's sheets and the main checkout's
  `.claude/probes/K1139/`, S4's `out4`, S3's shots (`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a48fddd224c96d898\.claude\probes\K1211\out3\`).
  Output to `.claude/probes/K1211/out6/`; never `git add -f` a probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1211-S6`; wait
  for it inside one blocking command), at most two browsers, ports 5960-5969. A dev server's stamp
  is the SHA it started from: check the served code as `smoke4.mjs` does. Stop your servers.
- Out of scope (name it if a crop shows it; don't fix it): a crossing's gold cut inside a fan
  (K1218), the triangle and teal notch at rest (K1219), the text forks (K1220), fire and collapse
  (K1210).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP and report. A compaction is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against the top row; the sheets'
paths; what it adds per fan fragment and the K320 pin's delta (`k320_slim.test.ts`, 42,123 at
S4); the pins you moved; anything out of scope a crop showed; the rebase; your last SHA. Commit
messages carry the record (no Handoff section). End with `Ledger items` and K1211's handle
fields (owner, branch, last commit, evidence, next).

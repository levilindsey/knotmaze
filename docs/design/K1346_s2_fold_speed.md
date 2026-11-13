# K1346 stage 2: the fold fixes' frame cost

Ledgers: K1346 (this), K1350 (the fill walk's turn-backs, fixed on the same branch), K1240 (the redesign; the
speed gate in `docs/design/K1240_gate.md`). One Claude Opus agent in its own worktree. Cap 2 h. Read first: the
stage 1 handoff at the end of `docs/design/K1346_s1_tail_folds.md`.

## Why

Stage 1 (branch `worktree-agent-a686e24ad31e738a0`, last commit 4edbd1c3) cut every outline fold its detector
found (57 band folds and 1 fill-tail fold on master) to 0. The census, the twins and `npm test` all pass, and I
viewed the crops: c8's dotted seam and the folded slabs are gone. It cannot merge yet. The app ABBA puts the
worker's frame part 5-7 ms slower on the branch (drag p50, master | branch: def 52.2/52.1 | 57.2/61.6, fat
55.6/56.3 | 62.1/62.0, against a spread of up to 4.4). A Node CPU profile shows outline.ts's own time unchanged
(1526 against 1541 ms), so the cost may be allocation and GC from the new per-frame arrays, deopts in the
worker, or load from another agent during the branch's runs.

## Goal

The branch's fixes merge with no worker part slower than master's by more than the run-to-run spread, and the
output byte-identical to stage 1's (the same piece hashes in all 12 census scenes, `k1346_hash.ts`).

1. Find out whether the cost is real: a Node ABBA of `frame()` over the captured drags (def and fat, allocation
   and GC counted), and app ABBAs that record the machine's load.
2. If it is real, find where it is (a profile of the worker under drag) and remove it without changing the
   output. A pre-pass that skips the work where nothing folds is already in. Allocation hoisted out of the
   frame and an exact cheaper test are the obvious next steps, but the technique is yours.

## Done

1. **Speed:** app ABBA, twice, under the perf lock (`.claude/probes/K1247/k1247s30_run.ps1 -Steps load,def,fat`,
   which records the load), master against your branch: no part slower than the spread. Mark any run taken under
   load. The Node ABBA's numbers, with GC time.
2. **Identity:** piece hashes equal to 4edbd1c3's in all 12 census scenes; the fold detector still at 0 in each.
3. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins as stage 1 left them.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Setup

Your worktree starts at master. Before anything else, note master's SHA (`git rev-parse HEAD`), then put your
branch on stage 1's work rebased onto it: `git reset --hard worktree-agent-a686e24ad31e738a0`, then
`git rebase <that SHA>` (your own new branch; never touch stage 1's branch or worktree, only read from it). This
brief comes back with the rebase. Copy stage 1's tools and outputs that you need from
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a686e24ad31e738a0\.claude\probes\K1346\`, and the
untracked inputs from the main checkout's `.claude/probes/`: `K868/scenes/g41_ring_tw42.json`, `muse_hash.json`
and `g41_user_tw64.json`, and `K1247/out/s18/` (the drags `outline_inc.test.ts` reads). Without them tests skip.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Your files:** what stage 1 changed in `outline.ts` (its builders and the fold functions), `fill_tri.ts`,
  `draw.ts`, the band files, tests, and your tools and outputs under `.claude/probes/K1346/` (name new ones
  `k1346s2_*`). **K1247 s31** owns `outline_model.ts`, `outline_worker.ts` and in `outline.ts` the `frame` /
  `frameFast` phase drivers, the caching around the phase calls and the `KF_INC` code: stay out of those.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Agents share the lock, so expect waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 30 lines:
- whether the cost was real, where it was, and the fix;
- the Node and app ABBAs, with load and GC;
- the identity check;
- what is left;
- your last SHA.

End with `Ledger items` and the handle fields for K1346 and K1350.

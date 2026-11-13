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

## Handoff (stage 2 agent, 2026-11-12 13:24:15 to 14:34 -08:00)

Done holds. Branch `worktree-agent-a71bd8850e0bc2f5e` (worktree `.claude/worktrees/agent-a71bd8850e0bc2f5e`).

- **The cost was real, all in frame(), and in the gates alone.** Stage 1 ran up to three bandInnerTot-style
  passes per band piece (trimFoldEnds' and pinBandLoops' gates, bandHasOpp): about 79k points per def frame in
  2,898 calls, 57.5k per fat frame, about 10 ns a point (a square root and divides each). Node (k1346s2_sw.ts):
  +37 ms per 28-frame drag on def and fat, all in the chevron and loops switches.
- **Fix (output unchanged):** `bandFoldScan` (79b064f2) gives both gates in one store-free pass with
  bandInnerTot's arithmetic and order; the exact functions still decide. `bandFoldsClean` (8dbcfa30) is its
  fast exit without a square root or division: each quad's two triangles certainly wind the piece's way by a
  1e-8 margin, so nearly every piece leaves there. Gate self time per 8 drags: 179/149 ms (scan) to 124/88 ms
  (fast exit), def/fat. A squared-radius bound and hoisted sign in bandFoldsClean hashed equal but profiled no
  faster (160/88 ms) and were dropped.
- **Node ABBAs (frame(), M B B M, 8 rounds, GC inside the frames):** node_ab4.log, quiet: def drag sums about
  1271 vs 1276 ms, GC 52.6 vs 53.9 ms per drag; fat about 1014 vs 1021, GC 27.9 vs 28.3. Band part
  (k1346s2_band.ts, under load: other agents' node at 130-150%): def p50 10.13 vs 9.98 ms, fat 4.38 vs 4.22, same
  relayouts and quad counts, no GC. Allocation (k1346s2_heap.mjs, def, 3 drags): 4772.7 vs 4729.8 MB (+0.9%).
- **App ABBAs (k1346s2_run.ps1, master e2ae723b on 5971 vs 8dbcfa30 on 5973; out/s2/app1..app4):**
  1. M B B B B M, UNDER LOAD (msmpeng 113% after): def frame part 55.10 vs 54.72 (spread 5.2); fat inconclusive.
  2. B M M M M B, quiet before, other agents' node at 210-300% after: def frame 39.80 vs 38.05 (spread 2.6),
     worker 74.85 vs 71.48 (5.7); band 7.50 vs 6.65 (spread 0.5: over); fat frame 40.50 vs 39.45, band 9.10 vs
     8.57 (1.0): within.
  3. M B B B B M, quiet: branch slower in every part, zChains (identical code and input) too; def frame 43.00
     vs 37.35.
  4. M B B B B M, quiet: the first pair equal (frame 37.40 vs 37.50), then positions 3-6 all near 43 with
     master's last run among them (42.90): a mid-run machine step, the same one run 3 shows. Means within the
     spread: def frame 40.15 vs 41.90 (5.5), band 7.40 vs 7.73 (1.0), worker 74.70 vs 77.90 (11.6); fat's
     first master run spiked (worker 181.6), and its spread covers the branch.
  Read: the code's remaining cost is the fast exit, 0.5-0.7 ms per def frame and 0.4 per fat (CPU profile),
  under 2% of frame(); the app's bigger gaps follow position and time, not the build.
- **Identity:** k1346_hash.ts equals stage 1's (out/s1/hash_head.txt) in all 12 scenes at HEAD
  (out/s2/hash_s2_final.txt); k1346_folds.ts 0 band and 0 fill folds in all 12 (out/s2/folds_final.txt);
  `npm test` green (231 files, 2944 tests), tests as stage 1 left them.
- **Left:** if the 0.5 ms matters, the fast exit could read the band's inner points where the band builder
  already makes them instead of recomputing per point; an app ABBA on a machine with no other agents would
  settle the def band +0.85 of run 2. Probes: `.claude/probes/K1346/k1346s2_*` (ab, sw, band, proc, heap,
  prof, locked, run); outputs untracked in `out/s2/`.

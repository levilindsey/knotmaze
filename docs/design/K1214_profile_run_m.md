# Muse batch 22, Run M: what costs in play since K1139's pulses (K1214)

Ledger: K1214. Chain tag 22M; ports 5990-5999. One Muse run in the main checkout on master.
Probes only. It starts after K1211's stage 2 has landed (it edits the same code); Claude releases
its hold.

## Why

Run E's tail watch (22E) found fabric 7 moves' frame p95 up about 1.6 ms over K1139's Stages 3 and
4 (1fe793f5 to 71eedb94) and again over S5 (36aed2d5 to fbc1b212), measured while other work ran.
Junctions are Levi's main priority, and K1211 adds light to the same code. Before it adds more,
name the piece that costs.

## Read first

- Batch 22's How to work (`docs/design/K1208_muse_batch22.md`) and the pages it sends you to.
- `docs/ledger_notes.md`: `## K1214 (2026-11-05, filed from 22E's tail watch)` and
  `## K1196 (2026-11-05, 22E reviewed)`.
- `.claude/probes/K1196/out22e/SUMMARY.md`, and E's `tail22e.mjs`, `bench22e.mjs`, `lib.mjs` and
  `run_locked.ps1` in `.claude/probes/K1196/` (copy them; never edit them).
- The stage commits' messages: `git log --format=%B 1fe793f5..71eedb94`, then b05e7a5a and fbc1b212.
- `src/app/probe_hooks.ts`: the frame's JS phases (`__knotPerf()`) and the GPU timings per pass.

## Tasks

1. Build 1fe793f5, 71eedb94, 36aed2d5, fbc1b212 and master (name its sha; it includes K1211's
   stage 2) with `pwsh -NoProfile -File scripts/preview.ps1 -Ref <sha> -Root
   $env:TEMP\knotmaze-previews -BuildOnly`.
2. Time E's tail stand again on each pair, and master against fbc1b212, ABBA, under the perf lock:
   p50, p95, p99, max, frames over twice the median, the control spread. List what else ran on the
   machine while you timed (`paseo ls`, and the count of node and chrome processes).
3. Split the frame's cost on each build: the main thread's JS (`__knotPerf()`'s phases, and a CDP
   Profiler sample over the same 7 moves: the top functions by self time, then grouped by file:
   `junction_routes.ts`, `ribbon/joinery.ts`, `junction_field.ts`, `ribbon_renderer.ts`, the rest)
   and the GPU (the probe hooks' timings per pass). Name the piece whose growth matches the p95
   step, and how sure you are.
4. If one function or pass carries the step, give its cost per frame against the frame (a table
   of frames sorted by cost) and say whether it runs every frame or only on frames where a pulse
   crosses a junction.

No fix in this run.

## Record

`.claude/probes/K1214/`: the scripts and `SUMMARY.md` (the tables and the attribution); traces and
builds stay untracked.

## Done and close

Done when the tables hold for every build. Commit message:
`K1214: the frame tail in play attributed (Muse batch 22 Run M, 22M)`. Pull with rebase and
autostash, then push to master (probes only, so nothing deploys). Leave the ledger to Claude.

## Report

Plain words: master's sha; the tails per pair; the split per build; the piece that costs and how
sure; `Ledger items`.

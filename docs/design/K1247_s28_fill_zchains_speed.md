# K1247 stage 28: the worker frame's fill and zChains

Ledgers: K1247 (this), K1310 (the course check: speed first), K1240 (the redesign). One Claude Opus agent in its
own worktree, on its own branch from master. Cap 2 h. Read first: the Speed table in `docs/design/K1240_gate.md`
and the s27 handoff at the end of `docs/design/K1247_s27_c8_gpu_drift.md`.

## Why

The gate wants the outline's work per moved frame at <= 3 ms p50 / 6 ms p95 on desktop def mid-drag. It is about
150 ms. `OutlineModel.update` (`src/render/outline/outline_model.ts`) times its parts. K1324 s2's ABBA on def
(`.claude/probes/K1324/out/s2/bench_abba1.json`, drag, p50 / p95 ms, four runs):

| part | where | p50 | p95 |
|---|---|---|---|
| frame | outline.ts `frame` (+ `alignJunctionArms`) | 66-71 | 86-90 |
| fill | fill_tri.ts `fillFrame` | 35-43 | 62-83 |
| band | outline_model.ts `bandOf`, band files | 16-26 | 31-36 |
| zChains | draw.ts `zChains` | 16-17 | 18-21 |
| paint | paint.ts `paintFrame` | 3.4-4.0 | 4-8 |
| worker total | | 139-160 | 204-225 |

This stage takes **fill** and **zChains** (about 56 ms together). frame and band are in outline.ts and the band
files, which K1314 s10 owns now; they are the next speed stage.

## Goal

fill <= 5 ms and zChains <= 2 ms p50 on desktop def mid-drag, with the look unchanged. Profile inside each part
first (what runs per frame that only changes per diagram, allocation, repeated searches, work the GPU could place
as the record fill already does), then cut. The technique is yours. Today's look (no `rp=outline`) stays
byte-identical.

## Done

1. **Speed:** the desktop worker frame on def, ABBA under the perf lock (`.claude/probes/K1314/k1314_s8_bench.ps1`,
   or a wrapper of yours that reads the same `parts`), master against your branch: fill and zChains at the goal, or
   as close as you got, with the profile that says what is left; no other part slower than the run-to-run spread.
   Also fat, once, to show the cut holds on a heavier scene.
2. **The look:** `outline_port.test.ts`'s pins unchanged. If your technique must move them, the K1314 census
   (`.claude/probes/K1314/k1314_run.ps1 -Lock`) shows no bar kind above `census_k1324s2a` (stray_ink 10,
   hard_edge 1, paper 0, broken_ink 12, k1049 0; copy `.claude/probes/K1314/out/s1/census_k1324s2a.*` from the
   main checkout), every moved find named with its spot and crops (reference | master | after, 4x) in
   `.claude/probes/K1247/out/s28/`, and you re-pin and name the pins in the commit.
3. **The twins:** wherever a part moves to the GPU, a test or probe ties it to the CPU path (as `rec_tie.test.ts`
   and `self_bury.test.ts` do).
4. `npm test` green, golden snapshots unchanged. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`,
   `muse_hash.json` and `g41_user_tw64.json` from the main checkout first. They are untracked, so without them
   tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB, fill_tri.ts nearly 100 KB. Keep each tool output under about 40 lines
  (write long results to a file and read only the lines you need). Use the Read tool only right before an Edit,
  and to view crops. Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, scenes, benches) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there.
- **Your files:** `fill_tri.ts`, `rec_glsl.ts`, `chain_frame.ts`, `outline_app.ts`, `outline_model.ts`,
  `outline_worker.ts`, `src/app/frame_loop.ts`, `draw.ts` (`zChains` and what it calls), tests, and your tools
  and outputs under `.claude/probes/K1247/`. **K1314 s10** owns `outline.ts` and the band files (`band_gpu.ts`,
  `band_place.ts`, `band_rec.ts`); **K1325** owns the census tools. If your cut needs one of theirs, report it
  rather than editing it. If you both re-pin `outline_port.test.ts`, the coordinator re-pins at the later merge.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it. Agents share the lock, so expect
  waits; profile in Node (no lock needed) where you can, and time in the browser under the lock.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- fill and zChains: what cost, what you cut and where, the profile of what is left;
- the worker frame by part on def (and fat once), master against your branch;
- the pins, or the census and crops if they moved;
- what is left, with numbers;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

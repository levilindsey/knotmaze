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

## Handoff (stage 28 agent, 2026-11-12, start 08:38:51, stop 09:39; Done holds)

Branch `worktree-agent-a4625873239640993`. Every cut is bit-exact: `.claude/probes/K1247/k1247s28_check.ps1`
compares float64 digests of zChains, fill, paint and band, frame by frame over two passes of a captured
drag, against master's (def and fat at fillRec 2, def default, def fillRec 1); all four are identical.
`outline_port.test.ts` pins and the golden snapshots are unchanged (`npm test` on d53bacf1: 230 files,
2941 tests passed), so no census was needed and nothing moved to the GPU (no twin).

Commits:
- 29f369bf `chain_frame` recTables memoized on (zc, h), so the fill and the band share one table a
  frame; stepsAt once per sample; no atan2 under FAN_STEP. Fan triangles get per-junction boxes before
  the barycentric test. outline_worker dedupes its transfer list.
- 6cbe803a The tail and disk fan search by diamond-angle bucket about the junction centre (2.3 scans per
  vertex, was about R).
- 9a05c477 fillFrame reuses the model's per-vertex arrays (`FillBuf`) instead of about 20 MB of fresh
  arrays a frame (GC and first-touch faults).
- 0b86b524 zChains' nearVisit orders by squared distance outside a 1e-12 relative margin; hypot only on
  near ties.
- d53bacf1 The disk rim's cos/sin from a table. 677496bc `k1247s28_bench.ps1` (ABBA, def then fat).

Bench (`out/s28/bench_def.json`, `bench_fat.json`; desktop, drag p50 ms, A = master 76090c0a,
B = d53bacf1, runs A B B A; the middle def pair ran under outside load, structure 1404 vs 838 ms):

| part | def A1 / A2 | def B1 / B2 | fat A1 / A2 | fat B1 / B2 |
|---|---|---|---|---|
| worker | 163.4 / 248.0 | 116.4 / 186.5 | 173.4 / 168.1 | 126.8 / 115.0 |
| frame | 69.3 / 115.4 | 65.1 / 109.3 | 74.4 / 74.3 | 68.2 / 61.2 |
| zChains | 15.6 / 22.4 | 16.2 / 23.3 | 19.1 / 18.8 | 18.2 / 16.9 |
| fill | 39.3 / 61.0 | 20.0 / 29.5 | 46.8 / 47.7 | 23.3 / 21.6 |
| paint | 3.4 / 5.1 | 3.3 / 4.7 | 3.2 / 3.4 | 3.1 / 3.0 |
| band | 28.4 / 28.9 | 10.4 / 16.3 | 30.8 / 19.2 | 12.9 / 12.0 |

fill about halves (-49 to -55% per pair); band drops 44-63% (the shared recTables); zChains is flat
(+0.6 / +0.9 def, -0.9 / -1.9 fat, inside A's own 6.8 ms spread); nothing is slower beyond the spread.

What is left (Node profile `out/s28/prof/c10`, def, samples inside each part): fillFrame 1684, of which
its own body 724 (the disk off-fan nearest-ring scan, the zero-fills, tail cum hypot, corner arc
cos/sin), recStrip2 117 + colAt 85 + col 77 (record columns; spanOf's two binary searches), zAt1 72,
bufF64 72, band_place's footS 66 (K1314's file). zChains 1295: nearScan 353, nearVisit 273,
contactPasses 127, walk 124 (about 100k nearW a frame from walk's h/4 steps; nearRange's reach sqrt is
the hottest line). frame (outline.ts, s29's lane) is 5321: the largest part now.

Next: (1) zChains reads only the scene, so it can run beside `frame` in a second worker: about 17 ms
off the critical path with identical output. (2) zChains to 2 ms needs an algorithm change (coarser
walk steps refined only near a hit, or last frame's foot as an exact seed with a lower-bound proof).
(3) fill to 5 ms means placing the fans, disks and tails on the GPU as the record strips are (with a
twin test). (4) Exact micro-cuts left: a squared pre-check before nearRange's sqrt, hinted searches in
spanOf, a box lower bound in the disk off-fan scan. Note for the coordinator: s29's fat link
`?p9ar6.EihVJ8adf0_iA8kPQ0HgzAtI` is codec v9 and now reads as seed p9ar6 at today's defaults (not fat);
the current fat token is `p9ar6.FHFUnxp1_T-IDyQ9`.

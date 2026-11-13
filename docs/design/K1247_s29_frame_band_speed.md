# K1247 stage 29: the worker frame's frame() and band

Ledgers: K1247 (this), K1310 (the course check: speed first), K1314 (the look census). One Claude Opus agent
in its own worktree, on its own branch from master. Cap 2 h. Read first: the Speed table in
`docs/design/K1240_gate.md`, this stage's sibling `docs/design/K1247_s28_fill_zchains_speed.md` (its table of the
worker frame's parts), and the s10 handoff at the end of `docs/design/K1314_s10_breaks_step.md` (runRootRamp).

## Why

The gate wants the outline's work per moved frame at <= 3 ms p50 / 6 ms p95 on desktop def mid-drag; it is about
150 ms. `OutlineModel.update` times its parts (K1324 s2 and K1314 s10 ABBA, p50 ms): **frame** 64-71 (outline.ts
`frame` = `alignJunctionArms` + `frameFast`, which takes a `profile` record), **band** 16-26 (outline_model.ts
`bandOf` and the band files), fill 35-43, zChains 16, paint 4. K1247 s28 is cutting fill and zChains now. This
stage takes frame and band, the largest parts. Also in frame: `runRootRamp` costs 0.51 ms, mostly `tailFoot`
(1511 calls a frame, 124 find a foot; the rest walk the 8h window to reject: K1314 s10).

## Goal

frame + band <= 10 ms p50 on desktop def mid-drag, the look unchanged. Profile inside each first (`frameFast`'s
`profile`: corners, pieces, caps, folds; what runs per frame that only changes per diagram; allocation; repeated
searches; work the GPU could place, as the record fill does), then cut the largest. The technique is yours.
Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Speed:** the desktop worker frame on def, ABBA under the perf lock (`.claude/probes/K1314/k1314_s10_bench.ps1`
   or `k1314_s8_bench.ps1`, which read the parts), master against your branch: frame and band at the goal, or as
   close as you got, with the profile of what is left; no other part slower than the run-to-run spread. Also fat,
   once.
2. **The look:** `outline_port.test.ts`'s pins unchanged. If your technique must move them, the K1314 census
   (`.claude/probes/K1314/k1314_run.ps1 -Lock`) shows no bar kind above `census_s10` (stray_ink 7, hard_edge 1,
   paper 0, broken_ink 12, k1049 0; copy `.claude/probes/K1314/out/s1/census_s10.*` and `census_k1324s2a.*` from
   the main checkout; master since K1324 s2 counts stray_ink 10, the three extra being form B's smear, K1334),
   every moved find named with its spot and crops (reference | master | after, 4x) in
   `.claude/probes/K1247/out/s29/`, and you re-pin and name the pins in the commit.
3. **The twins:** wherever a part moves to the GPU, a test or probe ties it to the CPU path.
4. `npm test` green, golden snapshots unchanged. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`,
   `muse_hash.json` and `g41_user_tw64.json` from the main checkout first. They are untracked, so without them
   tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, scenes, benches) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there.
- **Your files:** `src/render/outline/outline.ts`, the band files (`band_gpu.ts`, `band_place.ts`, `band_rec.ts`),
  tests, and your tools and outputs under `.claude/probes/K1247/` (name them `k1247s29_*`). **K1247 s28** owns
  `fill_tri.ts`, `rec_glsl.ts`, `chain_frame.ts`, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts`,
  `src/app/frame_loop.ts` and `draw.ts`; if your cut needs `bandOf` in outline_model.ts, change only that
  method's body and say so in the report. **K1325** owns the census tools. If you both re-pin
  `outline_port.test.ts`, the coordinator re-pins at the later merge.
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
- frame and band: what cost, what you cut and where, the profile of what is left;
- the worker frame by part on def (and fat once), master against your branch;
- the pins, or the census and crops if they moved;
- what is left, with numbers;
- your last SHA.

End with `Ledger items` and K1247's handle fields (this stage's).

## Handoff (2026-11-12, start 08:48:44 PT, stop 2026-11-12 09:32 PT)

Stopped with the stage's cuts done and the look byte-identical, well short of the goal: frame + band
is 58.5 + 17.6 ms p50 in the browser on def (master 68.8 + 21.2). Only `src/render/outline/outline.ts`
changed; `k1247s29_ident.ts` (7 scenes x 2 looks, chained digests) read "same" after each cut.

Cuts (outline.ts):
- 6cc6d3db: tailFoot's segment window is built once per (poly, lo, hi): the walk's segments in order,
  grouped 8 to a box (`tailFootWin`), so a query rejects whole groups beyond its best (or its cap).
- 7723b0d3: endTailPts's fill walk reads the band walk's grid feet (sE, sF, dF by grid index) instead of
  searching again.
- 0b5003e9: tailF and tailAlphaAt (no bend) cap tailFoot at h: past h only f's sign, or `own ? 1 : 0`,
  is read, and both are the same at the true foot.

Measured (`k1247s29_bench.ps1` ABBA, perf lock, `k1247s29_abba.mjs`; drag p50, mean of 2, spread):
def master vs branch: worker 162.4 (12.4) vs 137.6 (13.4); frame 68.8 (1.2) vs 58.5 (0.4); zChains
16.6 vs 16.6; fill 44.5 (1.9) vs 37.9 (7.9); paint 3.8 vs 3.9; band 21.2 (7.1) vs 17.6 (2.0);
roundTrip 179.5 vs 164.0; upload 1.5 vs 1.65; page frameMs 6.7 vs 6.95 (both at the spread; fat reads
1.7 vs 1.6 and 6.8 vs 6.8). Fat once: frame 71.3 vs 59.7, band 30.7 vs 18.6, worker 174.1 vs 153.8.
Node mbench (def, 120 reps): frame 37.4 -> 33.6 p50.

Left (Node profile of HEAD, def, ms per update; the browser runs about 1.75x Node):
- frameFast 38.9: cornersPhaseC 10.0 (growCFC 7.35: cfAt/cfStep/cfNext 2.96, cfRefine 2.2, wOfC 1.75
  with marginOfC 2.82 under it; trySolve 1.64), piecesPhaseC 9.36 (endTailPts' tailWalk 6.39: tailAlpha
  2.27, f 1.99, the bisection 1.29), buildBorderC 6.43 (cutFoldsC 2.14, self 2.05, spreadTiesC 1.13),
  regionsPhaseC 3.59, setupFrame 2.94, crossingsPhaseC 2.24, mergeBorders 1.45, eyesPhaseC 1.03.
  Diffuse: the next cut is algorithmic (carry growCFC's and tailWalk's results frame to frame).
- bandRec 11.7: self 4.45 (diffuse), recTables 1.78 (chain_frame.ts; fill_tri.ts computes the same
  table, s28's files: compute once and pass it), footS 1.2 (band_gpu.ts: no segment boxes), quad 1.1,
  endFans 0.87, rowShift 0.78.

Next: merge; then a stage on growCFC and tailWalk (frame to frame), buildBorderC, bandRec's self and
footS, and the recTables dedupe with fill's owner.
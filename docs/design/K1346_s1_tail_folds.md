# K1346 stage 1: outline pieces that fold back and ink twice

Ledgers: K1346 (this), K1350 (the turn-backs K1344 left), K1314 (the census; j58a), K1240 (the redesign; the look
gate in `docs/design/K1240_gate.md`). One Claude Opus agent in its own worktree, on its own branch from master.
Cap 2 h. Read first: the handoffs at the end of `docs/design/K1344_s1_j116_crease.md`,
`docs/design/K1324_s3_under_seams.md` and `docs/design/K1314_s10_breaks_step.md` (its j58a bullet).

## Why

K1344 s1 found that j116's dark crease came from a tail walk that turned back on itself (a hook narrower than the
walk's step), so its quads inked the same spot twice; `cutTailHooks` fixed that one. Folds of the same kind remain:

- **c8's dotted seam** (muse_hash (19.41, 14.16), K1346): tail p1781's corner fan folds. Its outer corner points
  jitter by 0.0003-0.0035 against the inner arc's sweep, so slivers overlap and ink twice (76 px in the app at
  960 ppu). The cause is outline.ts's tail corner cluster plus the shared untied inner rule (band_gpu.ts `inner()`,
  band_rec.ts `innerOfP`, draw.ts `bandData`). Crop: `.claude/probes/K1247/out/s27/after4x/spot_001.png` (right
  panel, x 1215-1240) and `.claude/probes/K1324/out/s3/x8x/spot_003.png`.
- **The fill walk** (K1350): the fill's tail walk (fpts) gets neither `cutTailLoop` nor `cutTailHooks`.
- **Sub-pixel turn-backs** (K1350): muse_hash 6, g41_ring_tw64 1 (`.claude/probes/K1344/k1344_tag.ts`).
- **j58a** (K1314): run piece 371 ends at j58 in a fold chevron (out to the cusp (4.8, 33.496), an exact retrace
  back). Corner 176's `runEndFade` lays its fade on the return leg, so the fade runs opposite to form B's. Cutting
  the return leg exposed fill seams and dropped the black V's ink (`.claude/probes/K1314/out/s10/j58a_try/`).

## Goal

1. **A fold detector:** a tool that finds every place where one chain's band or fill pieces fold back over
   themselves (overlap with opposite winding, or a retrace), across all census scenes at rest. Report the count
   and pixel area per scene, and a crop sheet of the largest.
2. **Folds to zero:** none inks more than 1 px at 960 ppu in any census scene, fixed where each is built (the
   builders, and the three inner-point rules together). Never hide one.
3. **j58a** shades as form B does there (the fade's direction follows form B), with no fill seam and the black V
   intact.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Crops:** form B | master | after at 4x and 8x for c8 (19.41, 14.16), j58a, the 12 largest folds the detector
   found on master, and every moved census find, in `.claude/probes/K1346/out/s1/`, from the app's own rendering
   where the census raster differs. I view them before merging.
2. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): your branch against master's `census_k1344s1` (copy
   `.claude/probes/K1314/out/s1/census_k1344s1.*` from the main checkout: stray_ink 4, hard_edge 1, paper 0,
   broken_ink 12, k1049 0; tail_look 188): no bar kind up, every moved find named with its crop. Re-pin
   `outline_port.test.ts` if it moves and name the pins in the commit.
3. **The twins:** `rec_tie.test.ts`, `self_bury.test.ts` and the GPU probes still tie the GPU band to the CPU path.
4. **Speed:** no worker part slower than the run-to-run spread (Node ABBA is enough unless you change per-frame
   work; then an app ABBA under the perf lock, `.claude/probes/K1247/k1247s28_bench.ps1`).
5. `npm test` green, golden snapshots unchanged. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`,
   `muse_hash.json` and `g41_user_tw64.json`, and `.claude/probes/K1247/out/s18/` (the drags
   `outline_inc.test.ts` reads), from the main checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, crops, scenes) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there (the census's shared form B cache writes itself).
- **Your files:** `outline.ts`'s builders (tail, corner, run, junction and fan functions, `cutTailLoop`,
  `cutTailHooks`, `runEndFade`), the band files (`band_gpu.ts`, `band_place.ts`, `band_rec.ts`), `draw.ts`,
  `fill_tri.ts`, `outline_app.ts`, `rec_glsl.ts`, `chain_frame.ts` and `paint.ts` (all in `src/render/outline/`),
  tests, and your tools and outputs under `.claude/probes/K1346/`. **K1247 s31** owns `outline_model.ts`,
  `outline_worker.ts` and in `outline.ts` the `frame` / `frameFast` phase drivers, the caching around the phase
  calls and the `KF_INC` code: stay out of those. Both of you keep `outline_inc.test.ts` green. Use the census
  tools as they are.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Run the census with `-Lock`
  and hold no lock of your own around it. While someone else holds it, wait inside one blocking command; a lock
  older than 30 min is stale. Agents share the lock, so expect waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- the detector: folds per scene on master and after;
- each fold kind (c8's fan, the fill walk, the turn-backs, j58a): its cause, the fix and where;
- the census counts per kind, and any moved find;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and the handle fields for K1346, K1350 and K1314.

## Handoff (K1346 s1, 2026-11-12)

Start 11:55:19 -08:00, stop 13:21:26 -08:00. Branch `worktree-agent-a686e24ad31e738a0` (worktree
`.claude/worktrees/agent-a686e24ad31e738a0`), last commit 4ed0cc79 (code; this handoff is the commit after it). Outputs (untracked) in
`.claude/probes/K1346/out/s1/`; tools committed in `.claude/probes/K1346/`.

- **Detector** `k1346_folds.ts`: a band piece's quads (or a fill tail item's triangles) wound against the piece,
  in px at 960 ppu. Master: muse_hash 33 (160461 px), muse_default_tw 2 (1143), def 1 (1466) + fill tail 1
  (2376, #1043), fat 6 (9611), g41_def_tw42 1 (125), g41_def_tw64 6 (13372), g41_ring_tw42 1 (166),
  g41_ring_tw64 1 (160), g41_user_tw64 6 (23584); ring, user_tw42.lightpaper, g41_user_tw42 0. After: 0 everywhere.
- **Fixes** (all in outline.ts, switches `K1346` {fill, chevron, fan, loops, fanDrop}): run start/end hooks
  inside cut swallowtails (`trimFoldEnds`); band loops, crossings, retrace hooks (run 198), closing loops (ghost
  2574), near touches (tail 2012), end corners (g41_user_tw64 run 159) and short-step merges (muse_hash run 491,
  LOOP_STEP 0.01) pinned by triangle (`pinBandLoops`, per frame in piecesPhaseC, with the `bandHasOpp` pre-pass);
  degenerate point arcs (`resweepPointArc` in arcEndFeet; thruJoinFan sweeps from the arc's end foot); c8's tail
  fan (`pinTailFan` + fanDrop); the fill walk (K1350: `cutTailLoop` on fill.pts). K1350's turn-backs: 0
  (`tag_b.txt`).
- **Census** k1346s1b against census_k1344s1: every bar kind equal; 8 moved finds, px only (`cdiff_b.txt`):
  muse_hash #39, #167, #217 (owner_only wedge), #250 (tail_look); muse_default_tw #116; def #75; g41_def_tw64
  #40, #109; crops cA-cH. outline_port re-pinned in c1ae6e33 (ring and g41_ring_tw42, table and band, f0 and f1;
  paint unchanged); self_bury's x22 precondition is < 0.6 (run 47's fold loop pinned there).
- **Crops** `final4x/` and `final8x/` (+ sheet.png): c8, j58a, m01-m13 (the largest master folds), r_* (folds
  the later rounds found), cA-cH.
- **Left:** j58a is not done. Run 371's fade there is runRootRamp's (K1314 s9 root ramp, RUN_RAMP_L), not
  runEndFade's; flipping it (`look7/j58a.png`) left a hard slab at the cusp and a seam in the V, so it was
  reverted. A j58a fix must also add its switch to k1346_crops.ts lines 88-89 (master/after panels). c8: the
  dotted seam is gone, a straight soft shading edge remains (`final8x/c8.png`).
- **Speed:** fails. App ABBA (k1247s28_bench under the perf lock, drag `frame` part p50, master | branch): first +11 ms (`abba.log`); with the `bandHasOpp` pre-pass (2fa15572) def 53.4/54.3 | 61.8/58.1, fat 53.5/56.1 | 58.9/59.6 (`abba2.log`); with `bandInnerTot` in trimFoldEnds (4ed0cc79) def 52.2/52.1 | 57.2/61.6, fat 55.6/56.3 | 62.1/62.0 (`abba3.log`): +5 to +7 ms against a 0.1-4.4 ms spread; band, fill and paint parts flat. Node `k1346_time.ts` on fat: switches all on 43.3, all off 39.1 ms; loops 3.3, fill 2.4, fan 2.4 each (noisy: K1247 s31 was running). Both speedups are bit-identical (`k1346_hash.ts`: all 12 scenes equal `hash_head.txt`). A CPU profile of master's outline.ts (51cc6e5f, as a temporary module) against the branch's in one Node process (`k1346_ab.ts` under `--cpu-prof`, `prof_ab/`): outline.ts self time 1541 | 1526 ms, the K1346 functions about 25 ms in all, so the app's +6 ms is not outline.ts arithmetic. Next: profile the worker in the app on def under drag (allocation and GC from the per-frame arrays trimFoldEnds, pinBandLoops and cutTailLoop return; deopts), then reuse buffers or the pins across frames (the caching is K1247's code).
- **Twins and tests:** `rec_tie.test.ts`, `self_bury.test.ts` green; `k1324_s2_gpu.ts` muse_hash x22: 1071 samples, max |gpu - cpu| 0.0000 with burial on and off, the rule moves 86 on both (`gpu_twin.log`). `npm test` green at 4ed0cc79 (231 files, 2944 tests; `npm_test2.log`); golden snapshots unchanged.

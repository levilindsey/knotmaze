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

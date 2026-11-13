# K1344 stage 1: the dark wedge crease at muse_hash j116's lower junction

Ledgers: K1344 (this), K1347 (the census against the app at g41_user_tw64), K1314 (the census), K1240 (the
redesign; the look gate in `docs/design/K1240_gate.md`). One Claude Opus agent in its own worktree, on its own
branch from master. Cap 2 h. Read first: the handoffs at the end of `docs/design/K1325_s2_self_crossing_reference.md`
and `docs/design/K1324_s3_under_seams.md`.

## Why

At muse_hash j116's lower junction, about (25.88-25.92, 14.21-14.35), rp=outline draws a dark wedge with a hard
diagonal crease where form B shades smoothly (`.claude/probes/K1325/out/s2/x4/j116_notch.png`, reference before |
after | rp=outline; right panel, the circle). The census books it as `tail_look` (60 px at (25.987, 14.299)), a
diagnostic kind, so the bar never counts it. g41_user_tw64 (5.19, 17.60) shows a similar needle and hard diagonal
in the census raster (`.claude/probes/K1324/out/s3/moved8x/spot_003.png`, form B | master | after), though there
the census and the app disagree (.888 against 1.0, K1347).

## Goal

1. j116's crease gone in the app: the junction shades as form B does, or as smoothly, with no hard diagonal.
   Find the cause first (which piece draws the wedge, from which builder), then fix it there. Never hide it.
2. Whether g41_user_tw64 (5.19, 17.60) is the same fault in the app (render the app there, not only the census),
   and if so fixed with it.
3. A count: how many of the census's 187 `tail_look` finds are this kind of crease (a tool that tags them, and a
   crop sheet of the 12 largest), so the next stage knows whether the bar has a blind spot. Report it; changing
   the census's bar kinds is not this stage.

## Done

1. **Crops:** form B | master | after at 4x and 8x for j116, g41_user_tw64 (5.19, 17.60) and every moved census
   find, in `.claude/probes/K1344/out/s1/`, from the app's own rendering where the census raster differs. I view
   them before merging.
2. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): if `outline_port.test.ts`'s pins move, your branch
   against master's `census_k1324s3b` (copy `.claude/probes/K1314/out/s1/census_k1324s3b.*` from the main
   checkout: stray_ink 4, hard_edge 1, paper 0, broken_ink 12, k1049 0): no bar kind up, every moved find named
   with its crop. Re-pin and name the pins in the commit.
3. **The twins:** wherever the GPU path changes, `rec_tie.test.ts`, `self_bury.test.ts` and the GPU probes still tie
   it to the CPU path.
4. **Speed:** no worker part slower than the run-to-run spread (Node is enough unless you change per-frame work;
   then an ABBA under the perf lock, `.claude/probes/K1247/k1247s28_bench.ps1`).
5. `npm test` green, golden snapshots unchanged. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`,
   `muse_hash.json` and `g41_user_tw64.json` from the main checkout first. They are untracked, so without them
   tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, crops, scenes) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there (the census's shared form B cache writes itself).
- **Your files:** `draw.ts`, `outline_app.ts`, `fill_tri.ts`, `rec_glsl.ts`, `chain_frame.ts`, `paint.ts`,
  `outline_model.ts` (all in `src/render/outline/`), tests, and your tools and outputs under
  `.claude/probes/K1344/`. Use the census tools as they are. **K1247 s30** owns `outline.ts` and the band files
  (`band_gpu.ts`, `band_place.ts`, `band_rec.ts`) until it merges, about 11:40. If the cause is there, prototype
  the change in a probe file and wait for my message that s30 has merged; then rebase onto master and make the
  change in place.
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
- j116's crease: its cause, the fix and where;
- g41_user_tw64 (5.19, 17.60): the same fault or not;
- the `tail_look` count and its sheet;
- the census counts per kind, if it ran, and any moved find;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1344's handle fields.

## Handoff (stage 1, 2026-11-12)

Start 10:43:51, stop 11:51 (Done holds; no cap stop). Branch `worktree-agent-a42df6f917fe7a386`, rebased on
master 903756d4; the fix is 12240470.

- **Cause.** j116's crease is tail p1952's walk over E's final border: buildBorder's inner miter makes a
  swallowtail narrower than the walk's step, so the walk turns back in a HOOK with no sampled crossing,
  cutTailLoop found nothing to cut, and the folded quads inked one spot twice (the dark crease).
- **Fix.** `src/render/outline/outline.ts` cutTailHooks, called at the end of cutTailLoop: a hook at point 1
  drops point 1; elsewhere the cusp moves to where the out-leg, extended back by at most its back step, crosses
  the in-leg (cpts and alpha along the in-leg), else the cusp point goes; up to 8 rounds; turn-backs with a step
  under 0.001 world are ignored. Pins: outline_port ring table and band, f0 and f1 (paint and g41_ring_tw42
  unchanged). Inside the lane bounds (a tail function; no phase driver, KF_INC, outline_model or worker code).
- **g41_user_tw64 (5.19, 17.60)** is not this fault: it is run p427's per-vertex vs per-pixel tie gap (K1347);
  the fix changes 0 px there.
- **tail_look.** `k1344_tag.ts` on census_k1324s3b: 6 of 187 tail_look finds meet a folded tail (muse_hash
  #210, #185, #183 = j116, #211 sub-pixel; muse_default_tw #39; g41_user_tw64 #1); on census_k1344s1: 0 of 188.
  Sheets: `.claude/probes/K1344/out/s1/sheet/x4/tag_sheet_x4.png`, `sheet/x8/tag_sheet_x8.png`.
- **Census k1344s1** (`.claude/probes/K1314/out/s1/census_k1344s1.*` in this worktree): stray_ink 4,
  hard_edge 1, paper 0, broken_ink 12, k1049 0, all as k1324s3b; no bar find moved. tail_look 187 -> 188: one
  new find, muse_hash 40 px at (25.979, 28.526) (j38), where the crops show master's two fold slivers gone;
  form B's broader shade there is missing in master and after alike (general tail_look).
- **Crops** (form B | master | after, app band): `.claude/probes/K1344/out/s1/x4/` and `x8/` (j116.png,
  g41_user_tw64_5.19_17.60.png, muse_hash_new_j38.png and its _census twin).
- **Twins:** rec_tie, self_bury and the GPU probes pass (the GPU path is unchanged; the fix is in the table).
- **Speed.** Node ABBA of frame(), hook cut on - off: muse_hash -0.036 ms (spread 0.78), g41_user_tw64
  +0.085 (0.60), def +0.218 (1.09). Browser ABBA (`k1344_bench.ps1`, master vs branch, perf lock 11:44-11:49):
  def worker p50 100.5/101.5 vs 87.8/84.0, fat 107.7/107.7 vs 103.7/106.4; no part slower than the spread
  (`out/s1/bench_def.json`, `bench_fat.json`).
- **Tests.** `npm test` green, goldens unchanged, outline_inc.test.ts 3/3 (with K1247 s18's captured drags
  copied into this worktree).
- **Left.** The fill walk (fpts) gets no hook or loop cut; muse_hash still has 6 tails that turn back (sub-0.001
  jogs or span-cut splices) and g41_ring_tw64 1, all sub-pixel; muse_hash #210's soft start-edge tone and j38's
  missing form-B shade are general tail_look, not this crease.

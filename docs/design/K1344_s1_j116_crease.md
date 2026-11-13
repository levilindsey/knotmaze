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

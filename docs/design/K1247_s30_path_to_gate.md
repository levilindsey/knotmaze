# K1247 stage 30: the path to the speed gate

Ledgers: K1338 (this: frame and band), K1247 (the frame cost; s28 runs on fill and zChains), K1310 (the
course check: speed first), K1240 (the redesign). One Claude Opus agent in its own worktree, on its own branch
from master. Cap 2 h. Read first: the Speed table in `docs/design/K1240_gate.md` and the handoffs at the end of
`docs/design/K1247_s29_frame_band_speed.md` and `K1247_s21_structure_cost.md`.

## Why

The gate wants the outline's work per moved frame at <= 3 ms p50 / 6 ms p95 on desktop def mid-drag and
<= 16 ms p50 on the Pixel. After s29 (1463742d) the def worker frame is about 138 ms p50: frame 58.5, fill 38,
band 17.6, zChains 16.6, paint 3.9. s29's tuning took 24 ms and found the rest spread thin (frameFast in Node:
growCFC 7.4, tailWalk 6.4, buildBorderC 6.4, regionsPhaseC 3.6, setupFrame 2.9, ...). Tuning will not close a
40x gap. K1310 projected a floor of about 2.7 ms only with every part GPU-placed and a fixed band topology. This
stage decides the route with measurements, before more tuning stages.

## Goal

A measured route from 138 ms to the gate, proven on the largest part. In order:

1. **What changes per frame.** On def and fat mid-drag (the bench's drag), per frame: how many chains,
   junctions, corners and pieces move by more than a sub-pixel at the app's scale, and how many of `frameFast`'s
   outputs actually change. If a drag moves a few percent, an incremental frame (recompute only what moved,
   carry the rest) is the route; if most of it moves, it is not.
2. **The browser's 1.75x.** s29 timed the same code at 58.5 ms in the worker against 33.5 ms in Node. Find why
   (build mode, deopts, GC, the worker's priority, the bench's load from other agents), and fix it if it is
   ours.
3. **A prototype of the route** on frame(): the incremental frame, or GPU placement, or what the data in (1)
   says, behind a flag, byte-identical to the full frame on the outline_port scenes (or, if it cannot be, the
   census no worse than master's), with its def cost measured.
4. **The plan:** a section appended to this brief that projects each part's cost on the route (frame, fill,
   band, zChains, paint), names the stages to get there in order, and says what the Pixel needs on top (its
   ratio to the desktop, from `.claude/probes/K1240/` or K156's last numbers if any).

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. (1) and (2) measured, with the tools committed under `.claude/probes/K1247/k1247s30_*`.
2. The prototype on a flag, default off unless it is byte-identical and faster, with a test that it matches the
   full frame on at least def and muse_hash across frames of a drag; its cost ABBA under the perf lock
   (`.claude/probes/K1247/k1247s29_abba*` or `.claude/probes/K1314/k1314_s10_bench.ps1`), master against the
   branch, flag on and off.
3. The plan section.
4. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json` from the main
   checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap. Done
holding early is not a stop while the prototype can still be taken further: use the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, scenes, benches) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there (the census's shared form B cache writes itself).
- **Your files:** `src/render/outline/outline.ts`, the band files (`band_gpu.ts`, `band_place.ts`,
  `band_rec.ts`), tests, and your tools and outputs under `.claude/probes/K1247/`. **K1247 s28** owns `fill_tri.ts`,
  `rec_glsl.ts`, `chain_frame.ts`, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts`,
  `src/app/frame_loop.ts` and `draw.ts`; if your route needs them, prototype in your own probe files or report it.
  **K1325** owns the census tools.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Agents share the lock, so expect waits; measure in Node where you can.
- **Stop** 2 h after your start (`Get-Date` at the start and at each milestone). Before stopping, run `Get-Date`
  and check that 2 h have really passed. Leave the last 25 minutes for the checks. Then commit WIP, append the
  plan and a handoff to this brief with your start and stop times, and report. Neither a compaction nor context
  size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Under 40 lines:
- what changes per frame mid-drag (def, fat);
- the browser's 1.75x: why, and the fix;
- the prototype: what, its cost against master, its identity check;
- the plan: each part's projected cost and the stages in order;
- your last SHA.

End with `Ledger items` and K1338's handle fields.

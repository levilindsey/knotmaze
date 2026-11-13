# K1247 stage 31: the snap, one dirty set, and exact caches for frame's phases

Ledgers: K1247 (this), K1310 (the course check: speed first), K1240 (the redesign). One Claude Opus agent in its
own worktree, on its own branch from master. Cap 2 h. Read first: the Speed table in `docs/design/K1240_gate.md`,
then the Findings, `## Plan to the gate (s30)` and the handoff in `docs/design/K1247_s30_path_to_gate.md`.

## Why

s30 measured that a def drag moves few chains a frame (5.4% of chains, 16.3% of points at 0.5 device px), and
that the 1.75x it was asked about was machine load: quiet master's def drag p50 is worker 72 ms, frame 38.2,
fill 13.9, zChains 9.85, band 6.9, paint 2.15. Its plan reaches ~7-9 ms in six stages by recomputing only what
moved. This stage is the plan's stages 1 and 2, which take frame from 38 to a projected ~14 ms.

## Goal

def drag frame p50 at ~14 ms or below (quiet machine), the look unchanged:

1. **The snap and one dirty set** (plan stage 1): move s30's `KF_INC` hold out of `frame` into
   `OutlineModel.update`, so one snapped input and one dirty set (chains, crossing ends, junction arms) feed
   every part. Snap cost <= 0.3 ms.
2. **Exact caches for frame's phases** at chain granularity (plan stage 2): corners and pieces first (the
   largest in s29's profile), then the rest as the cap allows. Each cache is exact: frame with caches equals
   frame without them, byte for byte, on the snapped input.
3. **The snap's default.** The snap approximates the input by up to 0.5 device px, so it may be on by default only
   if all three checks hold:
   - when a drag ends and the knot sleeps, the frame equals the full frame on the true input;
   - mid-drag, no drawn point is off by more than 0.5 device px;
   - a census of mid-drag frames (snap on against off) moves no bar find.
   Otherwise it stays off and you report which check failed.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Identity:** a test in the style of `test/render/outline_inc.test.ts` showing caches on equals caches off,
   across the frames of a drag on def, muse_hash and fat.
2. **Speed:** app ABBA under the perf lock (`.claude/probes/K1247/k1247s30_run.ps1 -Steps load,def,fat`, which
   records the machine's load), master against your branch, flags on and off. Mark any run taken under load. No
   other part slower than the run-to-run spread.
3. **The snap's three checks**, with their numbers.
4. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json` from the main
   checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap. Done
holding early is not a stop while another phase can still be cached: use the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, scenes, benches, s30's drags in `.claude/probes/K1247/out/s30/`) are in the main
  checkout's `.claude/probes/`. Copy what you need into your worktree and never write there.
- **Your files:** `outline_model.ts`, `outline_worker.ts`, and in `outline.ts` the `frame` / `frameFast` phase
  drivers, the caching around the phase calls and the `KF_INC` code; tests; your tools and outputs under
  `.claude/probes/K1247/` (name them `k1247s31_*`). **K1344 s1** owns `outline.ts`'s builders (tail, corner,
  junction and fan functions), the band files, `draw.ts`, `fill_tri.ts`, `outline_app.ts`, `rec_glsl.ts`,
  `chain_frame.ts` and `paint.ts`. If a cache needs a builder's signature changed, keep the change minimal and name
  it in your report. Both of you keep `outline_inc.test.ts` green. **K1325's** census tools: use them as they are.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it. Measure in Node where you can.
- **Stop** 2 h after your start (`Get-Date` at the start and at each milestone). Before stopping, run `Get-Date`
  and check that 2 h have really passed. Leave the last 25 minutes for the checks. Then commit WIP, append a
  handoff to this brief with your start and stop times, and report. Neither a compaction nor context size is a
  stop; after a compaction, re-read this brief and `git log`.

## Report

Under 40 lines:
- what is cached and where, and the dirty set's shape;
- the worker frame by part on def and fat, master against your branch, flags on and off, with the load;
- the snap's three checks and its default;
- what is left, against the plan's stage 2 projection;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

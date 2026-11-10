# K1247: is WebAssembly faster on the outline's hottest kernel?

Ledger: K1247 (K1240's frame cost), the WASM measurement. One Claude Opus agent in its own worktree, on
its own branch. Cap 2 h.

## Why

The redesigned outline's `frame()` (`.claude/probes/K1240/proto/outline.ts`) takes 18.4 ms on def; the
gate is 3 ms (`docs/design/K1247_s3_speed.md`, Handoff 1). Its hottest functions are tight loops over
Float64Arrays:
- `footNearM`: the nearest point of a polyline window;
- `fwScan` / `footWinFast`;
- `marginOfC`;
- `scanRange`.

Stage 3 removed the boxing and most of the allocation. Nobody knows whether WebAssembly beats V8's
optimized JS on these loops. Measure it before anyone ports.

## Goal

The speed ratio of WASM to JS on `footNearM` (and `fwScan` and `marginOfC` if time allows), on def's
real inputs, with the same answers. Also say what the app's build would need.

1. **Record the real inputs.** Instrument a copy of `outline.ts` (as `k1247s3_inst.ts` does) to dump
   one def frame's calls: the polylines, the windows and the query points, plus each call's answer.
2. **Port the kernel.** The toolchain is your choice. AssemblyScript is the lightest; install it into
   your folder (`npm install --prefix .claude/probes/K1240/wasm assemblyscript`), never into the
   repo's `package.json`.
   - Use raw linear memory (`load<f64>` / `store<f64>`), `-O3` and `--runtime stub`, with no managed
     arrays in the hot loop.
   - Copy the inputs into WASM memory once per frame, and count that copy in the time.
   - Try SIMD (`f64x2`) if it fits.
3. **Time both** over one frame's worth of calls, JS against WASM, under the lock. Do it twice:
   - calling WASM once per call;
   - batched, one call per frame.

   Answers must match the JS bit for bit, or within 1e-12 where an operation's order differs.

## Done

- The ratios (per-call and batched), from two locked runs, with matching answers.
- A note on what a real port would take:
  - whether the corner integrator (`footNearM`, `marginOfC`, `advanceToC`) has to move in together to
    avoid per-call overhead;
  - what Vite needs (a `?init` import, the toolchain as a devDependency, the `.wasm` size).

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`,
  and never change the repo's `package.json` or lockfile.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it for every timing and delete it when you're done.
  - While someone else holds it, wait inside one blocking command. The stage 4 agent times too.
  - A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/wasm/` only. Read `outline.ts`, and copy what you need into your
  folder. Another agent is changing `outline.ts`'s corners, so don't edit it. No `src/` changes.
  - Commit WIP on your branch at each milestone. Use `git add -f` for sources and tools, never for
    `node_modules`, builds or outputs.
  - Never push, never edit `LEDGER.md`, and never touch the main checkout.
- Stop when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain: the ratios; how the answers compared; what a port would take; your last SHA. End with
`Ledger items` and the handle fields (owner, branch, last commit, evidence, next).

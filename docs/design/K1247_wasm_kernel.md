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

## Handoff (2026-11-09, agent ac93d89bccb4b3372, 4:52-5:18 PM)

Done holds. Everything is in `.claude/probes/K1240/wasm/` (README-style headers in each file; the
generated builds, `build/` and `out/` are untracked: `make_rec.mjs`, `make_js.mjs` and
`make_wasm_frame.mjs` regenerate them, `build.ps1` compiles, `run_locked.ps1` times under the lock).

**Answers.** Bit-exact everywhere: JS, WASM per call and WASM batched reproduce all 54047 recorded
calls (footNearM 32810, footWinFast 4247, marginOfC 16990, def) before and after every timing; inside
the real frame, every table of 41 fresh def motion frames is identical, JS against WASM, and so is the
next frame of every build after the timing. The port needs JS-semantics helpers: `Math.round` (ties
up, -0 kept), `x || 1` on a double; f64 `%`, `min`/`max` (NaN, -0) and `sqrt` already match.

**Replay ratios** (one recorded def frame's calls; AssemblyScript 0.28.20, `-O3 --runtime stub`;
medians of 60 reps, two locked runs):

| kernel | JS ms | per call | batched | batched + poly copy | kernel only |
|---|---|---|---|---|---|
| footNearM | 2.699 / 2.683 | 1.65x / 1.65x | 1.64x / 1.62x | 1.56x / 1.55x | 1.88x / 1.87x |
| footWinFast | 1.148 / 1.160 | 1.17x / 1.19x | 1.22x / 1.22x | 1.13x / 1.13x | 1.25x / 1.26x |
| marginOfC | 2.812 / 2.786 | 1.79x / 1.78x | 1.67x / 1.67x | 1.59x / 1.59x | 2.06x / 2.05x |

Per call: footNearM 82 ns JS against 50 ns WASM, marginOfC 166 against 93. The boundary is cheap
(about 6 ns a call, reading the answer included), so batching buys nothing. The copy of all 92
polylines (2.80 MB) costs 0.085-0.088 ms in the replay.

**Inside the real frame** (def motion, the gated bench's 40-scene cycle, 40-frame blocks per build,
under the lock; `frame_wasm.ts`): footNearM and marginOfC swapped for WASM, everything else JS.
- The swap gains nothing measurable. Frame medians, JS copy against WASM: 20.63 / 20.15,
  20.41 / 20.71, 20.02 / 20.33 ms; the corners phase 7.64 / 7.29, 7.61 / 7.76, 7.48 / 7.32 ms (three
  quiet runs; a fourth, taken while another agent's verify ran, read 45% slower overall and is
  discarded).
- The kernels' own in-frame cost, from builds that run each call twice: JS 3.47-3.57 ms a frame, WASM
  with its marshalling 2.31-2.68 ms (1.3-1.55x, on warm repeat calls).
- The per-frame poly copy costs 0.27-0.33 ms in the frame (cold, against 0.09 in the replay); a
  copy-only build adds 0.34 ms to the corners phase.
- Inferred, not tested: the rest of the gain is lost because the JS kernels warm the caches for the
  JS around them (advanceToC and friends read the same poly arrays), which a copy in WASM memory does
  not, plus the WalkCache's 15 fields copied in and out on every marginOfC call.

**SIMD** (`kernels_simd.ts`, f64x2) does not fit. footNearM's common case is one covered segment per
call, with x and y in one lane pair needing a horizontal add. fwScan's box reject two segments at a
time was bit-exact but made footWinFast slower (0.979 -> 1.072 ms per call); the others were unchanged.

**What a real port would take.**
- The corner integrator has to move in together, but because of data, not call overhead. As long as
  JS owns the polylines, tangents and WalkCaches, every frame pays the copy and every marginOfC call
  marshals its cache. A port that pays puts growIntegC -> advanceToC -> wOfC -> marginOfC ->
  footNearM / footWinFast / fwScan, plus solveVC and footArmGlobal (outline.ts 3882-4107, 5373 and 5579-5633, at sha a1d8c35998b8),
  in WASM with their WalkCaches, one call per corner or per frame, and has setupFrame build the
  polylines straight into WASM memory (Float64Array views on it) so nothing is copied.
- Its ceiling (inferred from the ratios, not measured): the corners phase is about 7.4 of def's 20 ms;
  at 1.6-2x it saves about 3 ms, 15% of the frame. WASM is a constant factor of 1.2-2x on these loops;
  the 3 ms gate needs about 6x, so it cannot close the gate alone. Port after stage 4's corner solve
  settles, since that reshapes this code.
- Vite (8.3.5 here): `import init from "./kernels.wasm?init"`, awaited at load before the first
  frame (frame() is synchronous), with the JS path as the fallback; the same import works in a module
  worker. The .wasm is 5787 B (2831 B gzipped), above the 4 KB inline limit, so it ships as a hashed
  asset fetched relative to the module (fine under the relative base and the levi.dev proxy).
- Toolchain: `assemblyscript` as a devDependency (7.5 MB, plus `binaryen` 93.5 MB in every `npm ci`,
  CI included), and an `asc` step before `vite build` and before vitest, or a committed .wasm with a
  test that rebuilds and compares it. The tests can load the same .wasm in Node to pin it against the
  JS. Check the K122 notices policy for AssemblyScript's stdlib code compiled into the .wasm
  (Apache-2.0).

Next: no port now. If wanted after stage 4, port the whole integrator into WASM memory as above and
measure the corners phase in the frame (this folder's `frame_wasm.ts` is the harness).
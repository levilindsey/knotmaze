# K1247 stage 3: make the redesigned outline fast

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline (offset-polyline borders, cuts, corner arcs) for both looks.
`structure()` decides the diagram once; `frame()` computes the points every frame. Levi, 2026-11-09:
keep the redesign and "explore more ways to speed up the redesign" (no fallback to K1040's GPU field).

- Stage 1 (`docs/design/K1247_fast_frame.md`) took def's frame from 322 to 38 ms.
- Stage 2 (`docs/design/K1247_s2_speed.md`, Handoff 1, code at 1346ad87 on master) took it to 20.7 ms median and
  22.6 ms p95, with bit-identical output. Phases: corners 8.4, setupBorders 4.7, cutsEyesExposure 4.5,
  regions 2.1, pieces 1.3.

Exact micro-cuts are spent. What's left is call counts: per frame, `footNearM` runs 31.8k times and
`marginOfC` 16.7k, because 386 corners each take 32 Newton steps and every step re-foots both arms. The
frame also allocates about 25 MB.

## Goal

`frame()` on def: ≤3 ms median and ≤6 ms p95 under the lock. The technique is yours. Measure each idea,
keep what gains, revert what doesn't. Handoff 1's leads, roughly by size:

1. **Corners (the biggest phase).** Any of these:
   - fewer steps;
   - a better solve (the corner is a smooth one-parameter curve: a higher-order method, a closed form,
     or a fit);
   - warm starts with a proof. Read Handoff 2 of `K1247_fast_frame.md` first, for how the unproven
     ones broke.
2. **WebAssembly** for `footNearM`, `marginOfC`, `scanRange` and other tight loops. Any toolchain that
   `node scripts/run_node.mjs` can run. Note what Vite's app build would need.
3. **Cuts:** a uniform grid over border segments, built once per frame, in place of the block scan.
4. **Allocation:** 25 MB a frame becomes GC pauses in the phone's p95. Reuse buffers wherever the output
   needn't be fresh.
5. **Decide more in `structure()`:** anything that depends only on the diagram.

## Accuracy (Claude's call, 2026-11-09)

Bit-exactness is no longer required; the look is.
- **Allowed:** every face, region and piece within 1e-3 h of stage 2's output (h = halfWidth), on every
  check scene. Counts, piece kinds and order stay the same.
- **Cold = warm** within 1e-6 h: a frame never lands on a different answer because of earlier frames.
- **The exact checks** (verify, faces, cmp_*) then report distances instead of matches. Read them
  against these bounds, and report the largest distance per scene.

## Checks

All in `.claude/probes/K1240/proto/`. Stage 2's "Same output" section applies:
- `k1247c_final.ps1`. From your worktree, pass
  `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`. Read each log's last line.
- Run `k1247c_dump.ts` once before your first change.
- `k1247c_coldwarm.ts`.
- `k1247c_time.ts` under the lock (`run_locked_k1247s2.ps1`).

Stage 2's tools are there too: `k1247s2_prof.ts` (with `K1247_AB=1` for A/Bs), `k1247s2_heap.ts`,
`k1247s2_cpuagg.mjs` and `k1247s2_lines.mjs`.

## Done

Two timing runs under the lock, before and after, with def's phases. Every check passes within the
bounds above, and `npm test` is green. If 3 / 6 ms isn't reached by the cap, commit the fastest version
that passes, with its numbers and what each route gained.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it for every timing and delete it when you're done.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` (`outline.ts`, the checks, any WASM sources and builds).
  No `src/` changes. Commit WIP on your branch at each milestone, with `git add -f` for tools and
  sources, never for outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- Stop when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- each route you tried and what it gained;
- the checks' results, with the largest distance per scene;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

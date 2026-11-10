# K1247 stage 8: fewer points into the outline

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline for both looks. Levi, 2026-11-09: keep it, and find more ways
to speed it up. The gate is def's `frame()` at ≤3 ms median and ≤6 ms p95. It takes about 19 ms:
- setupBorders 5.0 ms;
- corners 7.5;
- cuts, eyes and exposure 4.1;
- regions 2.2;
- pieces, caps and the rest 1.4.

Stage 7 (`docs/design/K1247_s7_cf_speed.md`, Handoff 1) made the corner growth about as fast as
tuning gets. No single function dominates. WASM gives 1.2-2x on the kernels (K1253). The lever left
is how many points the outline reads. Its pieces follow the chain polylines' points, and def's mean
segment is 0.24 h, far finer than gently curving threads need. Stage 7 measured a bound by keeping
every k-th point (accuracy not checked): k = 2 took the corners phase from 6.72 to 4.85 ms, and
k = 4 to 3.63. Every other phase reads the same points.

## Goal

Feed frame() fewer points, and keep an outline that looks the same: every piece within 0.25 device
px of the full-density outline's. Make def's whole frame as fast as that bar allows. The reduction
runs inside the timed frame, so its own cost counts. The technique is yours: uniform spacing,
spacing by curvature, a set of samples chosen once per diagram, or something else.

The diagram doesn't change. structure() of the reduced scene gives the same piece keys in the same
order as the full scene's, and frame() still moves only points.

## Done

1. On every scene and mult of `k1247s5_scenes.ts`, still and moved (0.1h, 0.5h, and def's 40-frame
   cycle):
   - the piece keys and their order are identical to the full scene's;
   - every piece is within 0.25 device px of the full outline's, Hausdorff both ways, at dpr 2
     (`pxPerUnit`, as `k1257_sliver.ts` measures);
   - report the max and p99 per scene.
2. Cold = warm within 1e-6 h on the reduced path (as `k1247c_coldwarm.ts` checks the full one).
3. def under the lock (`run_locked_k1247s4.ps1`), master against yours in one session, in two runs:
   the median, p95 and every phase. Also report time against tolerance at three tolerances or more.
4. `npm test` green.

`outline.ts` stays as it is, so the existing checks on full scenes (`k1247c_final.ps1`,
`k1247s5_cmp.ts`, `k1247s5_outside.ts`) can't move. Run `k1247c_final.ps1` once at the end to show
it.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Your files: new `.claude/probes/K1240/proto/k1247s8_*` files only. Don't edit `outline.ts`:
  another agent (K1240 round 4) is changing it. If the reduction needs a change there, write it as
  a `.diff` beside your tools, apply it only in a scratch copy, and give its measured payoff. No
  `src/` changes, and don't touch `.claude/probes/K1240/wasm/`.
- Commit WIP on your branch at each milestone, with `git add -f` for tools, never for outputs.
  Never push, never edit `LEDGER.md`, and never touch the main checkout.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it for every
  timing and delete it when you're done. While someone else holds it, wait inside one blocking
  command. A lock older than 30 min is stale.
- **Use the full 2 h.** Stop early only when Done holds.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- the reduction: what it keeps, and its own cost;
- the distance per scene (max, p99) and time against tolerance;
- what an app version would need (where the reduction runs, what changes in `outline.ts`);
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

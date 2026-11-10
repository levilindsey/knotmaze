# K1247 stage 7: the closed-form corners, made fast

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline for both looks. Levi, 2026-11-09: keep it, and speed it up. The gate
is def's `frame()` at ≤3 ms median and ≤6 ms p95; it takes about 18.7 ms, and corners are the biggest
phase.

Stage 6 (`docs/design/K1247_s6_analytic.md`, Handoff 1) replaced the stepping growth with closed-form
pieces along the medial path: lines, parabolas and point-point pieces. It is on master. It is the most
accurate growth so far, but not yet faster. On def in motion, under the lock, corners take 7.4-7.5 ms
(the old growth took 6.5). Its profile:
- pieces 2.2 ms, of which finding the next event is 1.3;
- w 2.3 ms, of which the margin is 2.0;
- the cold V solve 0.8 ms.

A corner averages 16.3 pieces, 6.1 of them lag switches. The margin is 0 in about 95% of calls.

## Goal

def's corners phase ≤1 ms median, under the lock, with the whole frame. The technique is yours. The
leads, in stage 6's order:
1. A margin bound per piece. Skip the walk wherever the bound proves the margin is 0.
2. Fewer pieces: merge lag switches that change nothing, and find events in closed form.
3. Reuse the values the dip test recomputes.
4. A cheaper V solve.

Build them, and commit each one with its locked number. Don't spend the stage sizing ideas you won't
build.

## Accuracy

Unchanged from stage 6:
- no more corners over 0.01 / 0.03 / 0.1 / 0.3 h of the converged reference than stage 6's
  58 / 17 / 0 / 0 (`k1247s5_cmp.ts`);
- run interiors 0 h from master (`k1247s5_outside.ts`);
- cold = warm within 1e-6 h (`k1247c_coldwarm.ts`);
- every `k1247c_final.ps1` step exits 0, and verify fails no more than stage 6's 48.

Another agent (K1257) is changing form B's corners in `src/render/field/` to match yours, which will
drop verify's failures. If it merges while you run, `git merge master` and expect fewer failures.

## Checks

In `.claude/probes/K1240/proto/`:
- `k1247c_final.ps1` with `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`;
- `k1247c_coldwarm.ts`, `k1247s5_cmp.ts`, `k1247s5_outside.ts`;
- `k1247c_time.ts` under the lock (`run_locked_k1247s4.ps1`), master against yours in one session;
- `k1247s6_qt.ts` for rough unlocked numbers between locked ones.

## Done

Corners ≤1 ms with the checks above, from two locked runs, and `npm test` green. If you don't get there
by the cap, commit the fastest version that passes, with what each lead gained.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it for every
  timing and delete it when you're done. While someone else holds it, wait inside one blocking
  command; a phone round may hold it briefly while it builds. A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` only. No `src/` changes. Don't touch
  `.claude/probes/K1240/wasm/`. Commit WIP on your branch at each milestone, with `git add -f` for
  tools, never for outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- **Use the full 2 h.** Stop early only when Done holds.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- each lead, and what it gained;
- the accuracy numbers against stage 6's;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

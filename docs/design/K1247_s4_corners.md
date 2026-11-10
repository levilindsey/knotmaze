# K1247 stage 4: a cheaper corner solve

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline (offset-polyline borders, cuts, corner arcs) for both looks. Levi,
2026-11-09: keep the redesign and "explore more ways to speed up the redesign".

Stages 1-3 took def's `frame()` from 322 to 38, 20.7 and then 18.4 ms, with bit-identical output. The
gate is ≤3 ms median and ≤6 ms p95. Stage 3's Handoff 1 (`docs/design/K1247_s3_speed.md`) shows the
micro-cuts are spent: no function is above about 1.7 ms. The structure has to change.

Corners are the biggest phase, at 6.7 ms:
- 386 corners, each traced at 32 nodes (`kfGN`), about 1.9 evaluations per node;
- each evaluation re-foots both arms (`footNearM`) and walks both margins (`marginOfC`).

Stage 3 tried 16 nodes and lost the branch, landing about 0.5 h off. The node count guards the branch
tracking, not only the integration error.

## Goal

def's corners phase ≤1 ms median, measured under the lock with the whole frame. The technique is yours.
Some leads:
- **Fewer nodes, with a branch guard that doesn't need 32.** For example a bracket, a
  predictor-corrector continuation, or adaptive spacing where the curve is nearly straight.
- **Cheaper evaluations.**
  - A foot moves little between nodes, so walk from the last foot instead of searching.
  - Check margins only where a bound says they could bind.
- **A closed form for the common case,** with the general solve as the fallback wherever a cheap
  check fails. Over straight arm segments, offset lines meet in closed form.
- **Decide in `structure()`** which corners are simple.

Another agent is measuring WebAssembly on these kernels in `.claude/probes/K1240/wasm/`. Don't port
anything to WASM, and don't touch that folder.

## Accuracy

As stage 3's brief says:
- every face, region and piece within 1e-3 h of stage 3's output (h = halfWidth) on every check scene;
- counts, piece kinds and order the same;
- cold = warm within 1e-6 h.

Report the largest distance per scene.

## Checks

As stage 3's brief says, in `.claude/probes/K1240/proto/`:
- `k1247c_final.ps1`. From your worktree, pass
  `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`. Read each log's last line.
- Run `k1247c_dump.ts` once before your first change.
- `k1247c_coldwarm.ts`.
- `k1247c_time.ts` under the lock (`run_locked_k1247s3.ps1`).

The profilers are `k1247s2_prof.ts` (with `K1247_AB=1` for A/Bs), `k1247s2_heap.ts`,
`k1247s3_inst.ts`, `k1247s2_cpuagg.mjs` and `k1247s2_lines.mjs`. Compare timings only within one
session: the same code read 2 ms apart across sessions.

## Done

Two timing runs under the lock, before and after, with def's phases. Every check passes within the
bounds above, and `npm test` is green. If corners don't reach 1 ms by the cap, commit the fastest
version that passes, with its numbers and what each idea gained.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it for every timing and delete it when you're done.
  - While someone else holds it, wait inside one blocking command. The WASM agent times too.
  - A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` (`outline.ts` and the checks). No `src/` changes. Commit
  WIP on your branch at each milestone, with `git add -f` for tools, never for outputs. Never push,
  never edit `LEDGER.md`, and never touch the main checkout.
- **Use the full 2 h.** A route bigger than the time left is still worth starting: commit it as WIP
  and hand it off with where it stands. Stop early only when Done holds.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- each idea you tried and what it gained;
- the checks' results, with the largest distance per scene;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

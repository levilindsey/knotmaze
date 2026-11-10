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

## Handoff 1 (stage 4 agent, 2026-11-09 16:52 to 18:05)

The 1 ms gate was not reached. Three bit-exact cuts took corners from about 6.9 to about 6.6-6.75 ms
(timed code: `b3572cfe`). Measurements below show the gate can't be reached by more JS cuts at the
required tolerance. Branch `worktree-agent-a441151101638a205`.

### Numbers (locked `k1247c_time.ts`; `out/k1247c_time/time_s4*.json`)

| | before (s4before1, 94de06fa) | after (s4after1 / s4after2, b3572cfe) |
|---|---|---|
| def median / p95 | 19.78 / 30.84 | 17.86 / 19.57, 17.96 / 20.86 |
| def setupBorders | 4.84 | 4.91, 4.76 |
| def corners | 6.91 | 6.60, 6.75 |
| def cutsEyesExposure | 4.29 | 4.21, 4.46 |
| def regions | 1.99 | 2.01, 2.03 |
| def piecesCapsEtc | 1.47 | 1.55, 1.47 |
| ring median / p95 | 4.52 / 7.07 | 4.21 / 6.49, 4.14 / 6.36 |
| fat median / p95 | 29.40 / 37.47 | 28.11 / 35.80, 27.32 / 38.06 |
| def (consistent) median / p95 | 27.02 / 35.31 | 25.32 / 30.63, 25.71 / 37.17 |

The def phases' sum fell only about 0.1-0.2 ms, so most of the 1.9 ms drop in the motion median is
run-to-run variance. The before run came first, while the WASM agent was also working. The corners
gain (0.2-0.3 ms) matches the unlocked A/B.

### Ideas and what each gained (unlocked A/Bs of `k1247s2_prof.ts`, def)

| Idea | Result |
|---|---|
| Cuts 1-3 (`b3572cfe`): a two-tier cache for `marginOfC`'s walks (suffix minima, certified by \|q - q_cached\|); `saveNodeC` as a module function; a one-step fast path in `footNearM` when every window stays inside the hint segment | corners 6.72/6.83 to 6.49/6.71; bit-exact |
| `normS` without fmod when s is already in range | bit-exact, no gain; reverted |
| Walk cache in blocks of 8 segments | slower (6.93/6.97 vs 6.55/6.49); reverted |
| Tangent-aware block bounds plus suffix bounds | slower (6.98/7.07 vs 6.53); reverted |
| Newton corrector on local nearest feet instead of `footNearM`'s windowed tracked feet | saves 24% of `footNearM` pairs, but verify fails at up to 0.175 h with faces reordered: in about 2% of advances the local nearest foot differs from the windowed tracked foot (which skips small bumps), and Newton lands on another root. The certified-exact version applies to only 201 of 8743 advances, with no gain. Reverted; the diff is `proto/k1247s4_corrector_diag.diff` |
| `mergeBorders` split into one call per border (removes about 150 "exit from OSR'd inner loop" deopts per 2 reps) | bit-exact, no measurable gain; reverted |

### Why 1 ms is out of reach in JS at 1e-3 h

- **The 32-node path is load-bearing.** Changing the node count moves the output far past 1e-3 h:
  - 16 nodes: 0.04-0.21 h. 8: 0.03-0.34. 64: 0.03-0.17. 128: 0.15-0.69.
  - Sampling w at only 16 nodes on the same r0/32 path: 0.009-0.18 h.
  - Tool: `proto/k1247s4_nodes.mjs`, with verify `--impl=./outline_nodes.ts`. fat has no corners and reads 0.
- **So the 32-node trapezoid is what defines the corner's end.** Every one of the 32 advances and
  32 w evaluations per corner has to be reproduced.
  - Inferred, not tested: where w reaches 0, the break and the integral are quantized at
    dN = r0/32, about 0.05 h. Motion along the bisector, |u| ≥ 1, scales that error up.
- **Per-node cost.**
  - Per frame on def: 346 grown corners, 8503 advances, 8503 `wOfC` calls, 16661 `marginOfC` calls,
    31756 `footNearM` calls. 66% of nodes have w = 1. r0/h runs from 0.77 to 2.0, median 1.53.
  - Corners (about 6.6 ms) = solve about 0.9 + fallbacks about 0.5 + growth about 5.2. That is about
    610 ns per node: about 3.7 `footNearM` calls at about 65 ns, the Newton steps, and 2 `marginOfC`
    calls at about 128 ns.
  - 1 ms would need about 100 ns per node for everything.
- **Profile** (`node --cpu-prof`, def, 8 reps, unlocked):
  - Self time: `marginOfC` 683 ms, `footNearM` 658, `fwScan` 350 (shared with other phases),
    `advanceToC` 207, `wOfC` 117, `growIntegC` 70. `cornersPhaseC` total is 2445.
  - So `marginOfC` and `footNearM` are about 28% and 27% of corners.
- **A spatial-index certificate for the margins** isn't promising. After cut 1, the walk averages
  about 5.6 steps per call, so per-call overhead dominates, and a tree query would cost about the same.

### What's left

1. A compiled kernel for `advanceToC` + `wOfC` + `marginOfC` + `footNearM` that replays the same path.
   The WASM measurement in `.claude/probes/K1240/wasm/` decides whether this is worth it.
2. A redesigned growth: an exact stop where w reaches 0, and adaptive nodes. It would be more accurate
   and cheaper, but it moves corners by up to about 0.2 h, so Levi has to look at it first.
3. Leads outside corners, not yet measured:
   - `crossingsPhaseC`: 25 OSR-exit deopts per 2 reps.
   - `frameFast`: 34 "wrong map" deopts and 16 "insufficient type feedback for generic global access"
     deopts.
   - `cornerFallbackC`: about 39.6 code-2 fallbacks per frame, about 0.5 ms.

### Checks (`k1247c_final.ps1` at b3572cfe, `out/k1247c_final/`)

- Every step exited 0.
- verify: 54/54 lines at max pts 0.00e+0 on all 12 scenes. Result: ALL KEYS AND FIELDS MATCH.
- coldwarm: COLD = WARM, worst 0.00e+0.
- All pass: cmp cold/warm/move, structure, pieces, move_def, outline_test, the rows, and cmprows still/0.1/0.5 against Muse's base.
- `npm test` is green: 220 files, 2887 tests.

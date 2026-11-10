# K1247 stage 5: a corner growth that converges

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline (offset-polyline borders, cuts, corner arcs) for both looks. Levi,
2026-11-09: keep the redesign and "explore more ways to speed up the redesign". The gate is def's
`frame()` at ≤3 ms median and ≤6 ms p95; it now takes about 18 ms, and corners are the biggest phase at
6.6 ms.

Stage 4 (`docs/design/K1247_s4_corners.md`, Handoff 1) found that the exact cuts are spent:
- Each grown node costs about 610 ns (3.7 `footNearM`, 2 `marginOfC`, the Newton steps). 1 ms would
  need about 100 ns.
- Today's output is not a converged answer. The 32-node trapezoid quantizes where w reaches 0 at
  r0/32, about 0.05 h, and motion along the bisector scales that up. Other node counts move corners
  by 0.03-0.69 h (16: 0.21, 64: 0.17, 128: 0.69). So no faster growth can stay within 1e-3 h of it.

So this stage replaces the growth itself and judges it against a converged reference, not against
today's 32 nodes.

## Goal

def's corners phase ≤1 ms median, under the lock, with the whole frame. The technique is yours. Stage
4's leads:
- an exact stop where w reaches 0 (a root find on the last interval, not a quantized node);
- adaptive nodes: long steps where the corner is nearly straight, short ones where it turns;
- a branch guard that doesn't need dense nodes (a bracket, a predictor-corrector, or a step check);
- walking feet from the last foot, and checking margins only where a bound says they could bind.

The 128-node run's 0.69 h says something loses the branch, either at 32 nodes or at 128. Find out
which, because the reference depends on it.

## Accuracy (Claude's call, technical)

1. **A reference.** Grow every corner with the same equations to convergence: an exact stop, nodes
   doubled until no corner moves more than 1e-4 h, and the branch tracked. Build it offline, for every
   check scene, as a tool in `proto/`.
2. **The new growth stays within 0.01 h of the reference** in every corner. Report today's 32-node
   distance to the reference beside it, per scene.
3. **Everything outside corners stays within 1e-3 h of master's output.** Counts, piece kinds and order
   stay the same; if a corner's change alters one, report where. Cold = warm within 1e-6 h.
4. **Pictures for the look.** Crop the 6 corners that move most from today's output (today | new, at
   the app's scale), with the crop tools the S3f checks use. Claude looks at them and asks Levi if the
   change shows.

## Checks

In `.claude/probes/K1240/proto/`, as stage 4's brief says:
- `k1247c_final.ps1`. From your worktree, pass
  `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`. The corner distances will
  exceed its tolerances by design; read them against the reference instead, and say so per scene.
- `k1247c_coldwarm.ts`.
- `k1247c_time.ts` under the lock (`run_locked_k1247s4.ps1`), before and after in one session.
- The profilers and `k1247s4_nodes.mjs` (stage 4's node-count tool).

## Done

The corners phase at ≤1 ms with the checks above, from two locked runs, and `npm test` green. If it
doesn't get there by the cap, commit the fastest version that passes, with its numbers and what each
idea gained.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it for every
  timing and delete it when you're done. A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` (`outline.ts` and the checks). No `src/` changes. Don't
  touch `.claude/probes/K1240/wasm/`. Commit WIP on your branch at each milestone, with `git add -f`
  for tools, never for outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- **Use the full 2 h.** A route bigger than the time left is still worth starting: commit it as WIP
  and hand it off with where it stands. Finding that something is out of reach is not Done; try the
  next route.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- the reference: how it was built, which branch was right at 32 or 128 nodes;
- per scene, the new growth's and today's largest distance to the reference, and the largest move
  from today's output;
- the crops' paths;
- each idea and what it gained; what's left; your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

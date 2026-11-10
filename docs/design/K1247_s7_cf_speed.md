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

## Handoff 1 (2026-11-09, 21:29-23:2x, claude agent a82e0a83c91fe4c5a)

**Done does not hold.** def's corners phase is still about 7.4 ms, the same as stage 6's, against
the 1 ms target. The leads as briefed are worth tenths of a millisecond between them, because no
single function dominates the phase (profile below). As the Done rule allows, the fastest passing
version is committed: the clear certificate, fSteep from tangents, and growth at 10 nodes with
E 5e-4 h (last code commit 7bc879c9, then this handoff).

### Timing (locked, def's 40-frame cycle, ms)

`_s7_pair.mjs` runs master's outline.ts (54a6b84d, written to `_s7_base.ts`, not committed) and the
branch's in turn, in one locked session, 2 rounds each. The machine had other agents and a phone
round on it, so the base numbers move by about 0.5 ms between runs; compare within a run.

| run | median | p95 | setupBorders | corners | cutsEyesExposure | regions | piecesCapsEtc |
|---|---|---|---|---|---|---|---|
| stage 6 final (s6 handoff, cf 5) | 18.88 | 22.63 | 4.94 | 7.35 | 4.01 | 2.28 | 1.32 |
| stage 6 final (s6 handoff, cf 6) | 18.67 | 21.07 | 4.93 | 7.51 | 4.12 | 2.22 | 1.42 |
| master, s7f1 r0 | 19.43 | 24.20 | 5.31 | 7.95 | 4.30 | 2.33 | 1.47 |
| s7 at 900fdce9, s7f1 r0 | 18.97 | 23.26 | 4.92 | 7.63 | 4.10 | 2.21 | 1.46 |
| master, s7f1 r1 | 19.58 | 23.85 | 4.94 | 7.38 | 4.00 | 2.13 | 1.43 |
| s7 at 900fdce9, s7f1 r1 | 18.87 | 24.65 | 4.76 | 7.40 | 4.04 | 2.18 | 1.33 |
| master, s7f2 r0 | 18.94 | 22.52 | 4.96 | 7.46 | 3.93 | 2.16 | 1.49 |
| s7 at 900fdce9, s7f2 r0 | 18.75 | 23.10 | 5.14 | 7.71 | 4.04 | 2.12 | 1.41 |
| master, s7f2 r1 | 18.92 | 25.44 | 4.96 | 7.50 | 4.24 | 2.17 | 1.44 |
| s7 at 900fdce9, s7f2 r1 | 18.99 | 23.60 | 5.16 | 7.49 | 4.18 | 2.43 | 1.45 |
| master, s7g1 r0 | 19.34 | 22.66 | 5.47 | 7.74 | 4.18 | 2.38 | 1.54 |
| s7 final (7bc879c9), s7g1 r0 | 19.26 | 24.87 | 4.97 | 7.60 | 4.37 | 2.17 | 1.36 |
| master, s7g1 r1 | 19.04 | 25.46 | 5.19 | 7.76 | 4.07 | 2.27 | 1.45 |
| s7 final (7bc879c9), s7g1 r1 | 19.46 | 25.34 | 4.95 | 7.49 | 4.11 | 2.16 | 1.44 |
| master, s7g2 r0 | 19.73 | 32.38 | 5.13 | 7.76 | 4.20 | 2.15 | 1.42 |
| s7 final (7bc879c9), s7g2 r0 | 19.07 | 25.93 | 5.33 | 7.64 | 4.18 | 2.28 | 1.47 |
| master, s7g2 r1 | 19.15 | 27.10 | 5.19 | 8.18 | 4.33 | 2.13 | 1.41 |
| s7 final (7bc879c9), s7g2 r1 | 18.65 | 24.27 | 4.98 | 7.31 | 4.21 | 2.23 | 1.42 |

In the s7g runs the branch's corners phase is 0.12-0.87 ms under master's in all four pairs (7.31-7.64
against 7.74-8.18); its median and p95 are within the load's noise.

Under this load a locked run can't resolve a 0.3 ms change in one phase. The leads' gains below come
from `k1247s7_ab.ts`: an in-process A/B of one knob, alternating off and on for 8 rounds, scored as
the fastest of the rounds for each frame, averaged over the cycle. Other load only adds time, so the
minimum is the steady number; paired medians swung by 3 ms.

### Leads

| lead | built | gain on corners (min metric) | kept |
|---|---|---|---|
| 1. margin bound | the clear certificate, 337d587a: a walk that covered both whole windows records its smallest half-plane slack, and the next call on the same (corner, side) whose q moved less than that returns Infinity without walking. Exact. | 0.009 ms | yes (harmless, exact) |
| 2. fewer pieces | not built (see below) | - | - |
| 2'. fewer evaluations | 10 growth nodes at E 5e-4 h in place of 16 at 1e-3, 7bc879c9. Accuracy follows E more than N, so this is also closer to the reference. | 0.10-0.11 ms (three A/Bs; paired 0.07-0.16) | yes |
| 3. reuse the dip test's values | fSteep without point evaluations, 900fdce9: on a line piece denQ = 1 + sgnA sgnB (TA . TB) from the tangents; a parabola or point piece takes its start value from the previous piece's end. Outputs unchanged. | 0.28 ms (paired 0.48) | yes |
| 4. cheaper V solve | Newton seeded from the corner's local feet in place of footArmGlobal (`vhint.diff` in the session scratchpad; not committed) | -0.25 ms (slower) | no |
| extra | bit-exact fmod fast path for normS/dS/armDistC/meetSegsOf | 0.002 ms | no |
| extra | interleaved walk arrays in marginOfC | -0.05 ms | no |

Lead 2 as briefed: the pieces are geometry. Every event changes a foot's site, q depends on both
sites, and the growth asks about 1.1 evaluations per piece (225723 pieces, 84279 of them lag
switches, for 257995 evaluations a cycle), so neither merging pieces nor a per-piece certificate has
anything to amortize. Fewer evaluations was the version of it that paid.

Other growth settings measured (N / E h: accuracy, gain): 10 / 1e-3 95/26/1/0, 10 / 7e-4 65/16/0/0
and 8 / 5e-4 45/17/1/0 fail the accuracy bar; 8 / 2.5e-4 -0.19 ms, 12 / 5e-4 -0.03, 12 / 2.5e-4
-0.48, 10 / 4e-4 -0.01 and 16 / 5e-4 -0.37 are slower. (`k1247s5_cmp.ts --N` defaults E to 0.002,
not 1e-3; pass `--E` explicitly. 4b458e20's note that 12 or 14 nodes fail was measured at 0.002.)

Also measured and rejected: the jump split's floor (cfJumpTol, 1e-3 h) at 3e-3, 1e-2 or 3e-2 h fails
accuracy (3e-3: 65/16/0/0); the refinement's Lmin (kfGrowZ, 1e-3 h) at 3e-3, 1e-2 or 3e-2 h fails
(3e-3: 49/9/1/0). The m-cert (kfMCache, a cached margin searched to dc + R) is slower at every R
tried: -0.22 ms at R 0.5 h, -0.12 at 0.1, -0.11 at 0.02 (min metric), so it stays off. solveVC runs
385 times a frame at 3.25 Newton iterations on average: no iteration count to cut.

### Where the corners phase goes

Timed by call (`k1247s7_split.ps1`, locked, 22:47; the fastest of 8 rounds per frame, mean over the
cycle): the phase is 6.73 ms a frame, of which growCFC 5.20 ms (346 calls), the V solve 0.87 ms (386
calls), cornerFallbackC 0.40 ms (40 calls, about 10 us each, nearly all borderMeetC) and the rest
(arm setup, addPointAtC, warm state) 0.27 ms. Solve, fallback and rest alone are 1.53 ms, over the
1 ms target. The growth's cost is spread evenly: a median call takes 13.8 us (p10 24.4, max 46.0),
the slowest 10% of calls hold 21% of the time, and no corner holds more than 0.8% of the cycle's
growth, so there is no hot corner to special-case. By class (22:49 run): free corners (w 1 at every
node) are 29% of calls but 24.0% of the time at 12.2 us each; corners whose w reaches 0 are 52% of
calls and 51.6% of the time at 14.7 us; the rest are 20% of calls and 24.4% of the time at 18.0 us. A
certificate that a corner is free would save at most a quarter of the growth (about 1.2 ms), less
whatever the certificate costs.

Self time inside growCFC (22.6% of the whole profile): marginOfC 27.7%, cfNext 11.3%, cfRoot 7.5%,
cfAt 6.9%, fwScan 6.4%, cfStep 6.1%, cfFoot 6.1%, wOfC 4.2%, cfQ 4.1%, growCFC 3.8%, cfDipIn 3.7%,
cfLagLine 3.1%, cfRefine 2.8%, cfMake 2.1%, cfBad 1.8%, footWinFast 1.1%. Per cycle: 13842 corners,
free 28%, zero at the end 53%. About 11.7k margin calls a frame at about 130 ns each: the clear
certificate answers 8%, the m-cert is off (kfMCache false), and the rest search, walking about 3
half-planes each way (a full rebuild in 22% of calls, about 6 entries). Outside growCFC, solveVC
(about 10% of corners), cornerFallbackC (5.5%) and borderMeetC (4.2%) add up to about 1.4 ms in the
profile (1.53 ms timed with the rest, above): over the 1 ms target before any growth runs. A deopt trace shows no repeated deopts on the corners' path.

### Accuracy (final code, 7bc879c9)

| check | stage 6 | stage 7 | bar |
|---|---|---|---|
| `k1247s5_cmp.ts` corners over 0.01/0.03/0.1/0.3 h | 58/17/0/0, worst 0.0787 h | 48/9/0/0, worst 0.0762 h | ≤58/17/0/0 |
| `k1247s5_outside.ts` run interiors | 0.00e+0 h (worst run curve 3.81e-2 h) | 0.00e+0 h (3.75e-2 h) | 0 h |
| `k1247c_coldwarm.ts` | 0.00e+0 | 0.00e+0 | ≤1e-6 h |
| `k1247c_final.ps1` | every step exits 0, verify 48 | every step exits 0, verify 48 (cmprows 17, was 16; 0.1 14, 0.5 2) | all exit 0, verify ≤48 |
| `npm test` | green | 220 files, 2887 tests green | green |

### What's left

- **Port** 10 nodes / E 5e-4 h to `src/render/field/corner_cf.ts` (the coordinator, per K1257).
  `kfGrowN` and `kfGrowE` also drive the stepping growth (`K1247_CF=0`, and the `growIntegC`
  fallback when `cfInit` fails; it never fails in def), so those move too.
- **1 ms needs a structural change**, not a faster growth. In order of likely payoff:
  - reuse across frames: a corner whose inputs (its two arms' windows) are bit-identical to last
    frame's keeps its result, and the rest grow as now (not measured: how many corners a drag frame
    leaves untouched decides the payoff, and def's cycle perturbs every point);
  - WASM for the growth and margin (typed arrays already; the hot functions are small and
    branchy, which is where JIT overhead shows);
  - a different scheme for the 1.4 ms outside growCFC (solveVC, the fallback, borderMeet).
- setupBorders' `mergeBorders` takes 176 "exit from OSR'd inner loop" deopts a run: a lead for that
  phase, not this one.

### Tools (`.claude/probes/K1240/proto/`)

- `k1247s7_ab.ts --knob=steep|clear|grow|mcert|mcertr [--N= --E=] [--R=] [--rounds=8]`: the
  in-process A/B above (`mcertr` sets the m-cert's search radius, in h).
- `k1247s5_cmp.ts --jt=<h>` sets the jump split's floor for an accuracy check.
- `k1247s7_split.ps1 [-Rounds 8]`: patches timers into a copy of outline.ts's corners phase, runs
  `k1247s7_split.ts` under the lock (the split by call and the per-corner distribution above) and
  restores outline.ts byte for byte.
- `_s7_pair.mjs <tag> <rounds>`: master's outline.ts against the branch's under one lock, every
  phase of def. Run it through `run_locked_k1247s4.ps1 -ScriptName _s7_pair.mjs -RunArgs @('<tag>','2')`.
  It writes `_s7_base.ts` from 54a6b84d on first use.
- `K1247_STEEP=0` and `K1247_CLEAR=0` turn off leads 3 and 1; `setGrowUniform(16, 1e-3)` restores
  stage 6's growth.

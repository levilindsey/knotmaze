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

## Handoff 1 (2026-11-09, 18:20-20:20, claude agent a3deb5723f8c1b194)

**Done does not hold.** def's corners phase is 5.7-5.8 ms (it was 6.5-6.7). The 1 ms target needs a
different growth, not a faster version of this one (see What's left). As the Done rule says, the
fastest version that passes is committed: c7c9aac3, plus this handoff.

### Timing (k1247c_time, under the perf lock, base and new alternated in one lock, 19:26-19:28)

Base is master 2d452e0e's `outline.ts`, run as scratch `_s5time_base.ts`. New is c7c9aac3.

| | median ms | p95 ms | setupBorders | corners | cutsEyesExposure | regions | piecesCapsEtc |
|---|---|---|---|---|---|---|---|
| base 1 | 18.06 | 22.94 | 4.72 | 6.66 | 4.16 | 1.97 | 1.42 |
| base 2 | 17.97 | 22.31 | 4.76 | 6.52 | 3.99 | 1.97 | 1.34 |
| new 1 | 17.60 | 20.91 | 4.93 | 5.84 | 4.11 | 2.18 | 1.36 |
| new 2 | 17.29 | 20.13 | 4.90 | 5.70 | 4.16 | 2.23 | 1.43 |

- Other scenes, base then new:
  - ring: 4.18 / 4.10 ms, then 4.24 / 4.05 ms.
  - fat: 28.3 / 29.0 ms, then 28.1 / 29.0 ms. fat grows no corners.
  - def through the consistent S': 26.0 / 25.8 ms, then 24.7 / 24.9 ms.
- `structure()` is one cold call, so it is noisy: 5.8-8.3 ms in both builds.
- The frame gate (≤3 ms median, ≤6 ms p95) is far off. The corners phase is about a third of the frame.
- An earlier locked pair at cd4386a0, before the segment predictor, gave corners 6.56 / 6.74 (base) and 6.26 / 6.14 (new).

### The reference and the branch answer

- **How the reference is built.** `k1247s5_mkref.mjs` writes scratch `outline_ref.ts` from master
  2d452e0e's `outline.ts`, so the reference stays fixed while `outline.ts` changes. It keeps the same
  equations and adds:
  - a node count set at run time;
  - an exact stop: the interval where w reaches 0 is bisected along the path, and the trapezoid runs
    over the bisection's points;
  - a landing floor of 0.1h in place of 1e-3h.
- **How it is run.** `k1247s5_ref.ts` doubles N from 32 until no corner moves more than 1e-4h between
  N and 2N. Output is `out/k1247s5/ref_<scene>_<mult>.json`, with today's 32-node and 128-node runs
  beside it.
- **Where it did not converge.** muse_hash, user_tw42 0.1, g41_def_tw42 0, g41_user_tw42 0.1 and
  g41_user_tw64 did not converge. In those, a few corners flip between near-tied foot branches as N
  grows, so 0.01h everywhere is not reachable against any reference.
- **Which branch was right: neither node count, and the floor is the cause.** advanceToC accepts a
  Newton landing only within max(0.5|u|dd, 1e-3h) of its predictor. A foot that jumps to another
  segment lands farther away than that. As steps shrink, more advances are refused, the advance gives
  up, and the growth stops early (`why` = 3).
  - 128 nodes hit this more often. Its 0.69h was the wrong branch.
  - 32 nodes hits it too, for example def c354, 0.51h off the reference.
  - With the floor at 0.1h (`kfJump`), the growth follows the reference's branch and converges in N.

### Accuracy: c7c9aac3 against the reference (`k1247s5_cmp.ts --tag=_final`)

Distances are in h. "Today" is master's 32 nodes. `*` = the reference did not converge.

| scene | mult | new to ref | today to ref | largest move |
|---|---|---|---|---|
| muse_hash* | 0 | 0.529 | 0.528 | 0.433 |
| muse_hash* | 0.1 | 0.201 | 0.191 | 0.045 |
| muse_default_tw | 0 | 0.491 | 0.092 | 0.502 |
| muse_default_tw | 0.1 | 0.085 | 0.095 | 0.105 |
| def | 0 | 0.090 | 0.512 | 0.522 |
| def | 0.1 | 0.089 | 0.517 | 0.526 |
| def | 0.5 | 0.108 | 0.434 | 0.507 |
| fat | all | 0 | 0 | 0 |
| ring | 0 | 0.083 | 0.117 | 0.116 |
| ring | 0.1 | 0.034 | 0.093 | 0.104 |
| ring | 0.5 | 0.142 | 0.085 | 0.114 |
| user_tw42 | 0 | 0.435 | 0.509 | 0.941 |
| user_tw42* | 0.1 | 0.096 | 0.656 | 0.684 |
| g41_def_tw42* | 0 | 0.486 | 0.882 | 1.181 |
| g41_def_tw42 | 0.1 | 0.521 | 0.876 | 1.212 |
| g41_def_tw64 | 0 | 0.062 | 0.389 | 0.349 |
| g41_def_tw64 | 0.1 | 0.058 | 0.385 | 0.357 |
| g41_ring_tw42 | 0 | 0.412 | 0.189 | 0.426 |
| g41_ring_tw42 | 0.1 | 0.439 | 0.396 | 0.469 |
| g41_ring_tw64 | 0 | 0.095 | 0.078 | 0.093 |
| g41_ring_tw64 | 0.1 | 0.099 | 0.076 | 0.087 |
| g41_user_tw42 | 0 | 0.434 | 0.510 | 0.940 |
| g41_user_tw42* | 0.1 | 0.096 | 0.657 | 0.684 |
| g41_user_tw64* | 0 | 0.061 | 0.157 | 0.112 |
| g41_user_tw64* | 0.1 | 0.070 | 0.210 | 0.209 |

- **Overall.** The worst corner is 0.529h new against 0.882h today.
  - Corners over 0.01 / 0.03 / 0.1 / 0.3h: 286 / 149 / 36 / 12 new, against 567 / 211 / 39 / 15 today.
  - ok flags match in every case.
  - 77,384 advances per pass over all scenes.
- **The 0.01h target is not met.** The large remaining distances are the ambiguous corners above:
  near-tied foot branches, where the reference itself flips with N.
- **Where new is worse than today.** muse_default_tw 0 c303, g41_def_tw42 0 c85 and g41_ring_tw42.
  Today happens to sit on the reference's branch there and new does not.
- **Outside the corners (`k1247s5_outside.ts` against master's tables in `out/k1247s5_master/`):**
  - Piece keys: 0 diffs. Cut counts: the same.
  - Run interiors are identical except one point in each of two cases: muse_hash 0.1 at 1.3e-2h and
    g41_user_tw64 0.1 at 3.2e-3h. **Both are over the 1e-3h bar.**
  - Run ends move with their corners, by up to 0.94h.
  - Faces and regions: the face key set differs in def 0.5, g41_def_tw64 0.1 and ring 0, with one
    region key diff each. Face index moves reach 489 (def 0), and point counts differ in most cases.
- **Cold against warm (`k1247c_coldwarm.ts`):** worst 0. **npm test:** 220 files, 2887 tests, green.
- **k1247c_final on c7c9aac3** (logs in `out/k1247c_final/`): every step exited 0.
  - coldwarm 0. Structure and pieces identical. move_def rigid 4.8e-9. outline_test ALL PASS.
  - cmp_cold / warm / move: key diffs 0 in all 12 scenes. Points move up to 0.047 at the corners.
  - verify reports 48 failures, all corner-driven point counts and face/region order (piece keys ok).
  - cmprows reports 19 / 16 / 3 failures (still / 0.1 / 0.5). It was 19 / 14 / 3 at cd4386a0.
- **`k1247s4_nodes.mjs`** is ported to the uniform growth: `<N>` sets kfGrowN, and `--w-only` keeps 16
  path steps. It still patches the old growth when it finds one.

### Crops: does the change show? (question for Levi)

`.claude/probes/K1240/out/k1247s5/pics/`, from k1247s5_pics.ts on c7c9aac3. Each crop has three
tiles: today, new, and both (today red, new blue), at the app's dpr-2 scale, zoomed 3x.

| # | file | moved | today to ref | new to ref |
|---|---|---|---|---|
| 1 | `1_g41_def_tw42_0.1_c35.png` | 1.21h | 0.88h | 0.34h |
| 2 | `2_user_tw42.lightpaper_0_c31.png` | 0.94h | 0.51h | 0.44h |
| 3 | `3_g41_def_tw42_0_c354.png` | 0.56h | 0.55h | 0.01h |
| 4 | `4_muse_default_tw_0_c303.png` | 0.50h | 0.02h | 0.49h |
| 5 | `5_g41_def_tw42_0_c85.png` | 0.49h | 0.00h | 0.49h |
| 6 | `6_g41_ring_tw42_0.1_c19.png` | 0.47h | 0.40h | 0.11h |

h is 9.4-14.3 device px. In the crops viewed (1-5), the arc shifts about 1-2 device px, and the corner
point moves a little more.

### Ideas and what each gained

All timings are def's corners phase, under the lock, one config per process. In-process A/Bs deopt
after the first config: the second module ran about 25 ms. Base is 6.1-6.3 ms.

| idea | result |
|---|---|
| Landing floor 1e-3h → 0.1h (`kfJump`) | Fixes the branch loss. Without it nothing converges. |
| Adaptive hybrid (midpoint error control, failure = path end) | Converges, but 12.9 ms. Dropped. |
| Uniform N = 16 + midpoint-checked refinement (`refineC`, E = Z = 1e-3h) | Fewer advances and closer to the reference than 32 nodes. About 5.9 ms. |
| Foot hint shift (`shiftFootC`) | Scan windows 25k → 15k at N = 32; 5.93 → 5.81 ms. |
| Segment predictor (`kfSegPred`, on) | Predicts q as the intersection of both feet's segment offsets. Foot pairs per attempt 1.97 → 1.54; 0.1-0.35 ms. Output changes only in a few ambiguous corners; ok flags match. |
| Margin certificate (`setMarginCache`, off) | Exact and bit-identical, about 50% hits. 0 gain at R = 0.25 / 0.5 / 1h. |
| w at fewer nodes (scratch `outline_w8` / `outline_w4`; `setGrowSub`, default 1) | Ceiling about 1.1 ms. Keeping the path at N·S steps (N = 8, S = 2) costs too much accuracy. |
| N = 8 or 12 | Accuracy worse. |

- **Profile of the final build** (def in motion, self time, as a share of growth):
  - marginOfC 27.8% (the half-plane walks);
  - footNearM 26.1%;
  - fwScan 18.4% (the margin's window searches).
- Growth is about 89% of the corners phase. The rest of the phase is about 0.7 ms.

### What's left

1. **The 1 ms target needs another formulation.** Each corner still advances about 16 times, and each
   advance does a Newton step on two feet, then two margin walks and two window searches. That is about
   330 ns per foot query. Candidates:
   - an analytic growth on the medial path: piecewise between segment and segment, or segment and
     vertex, so each piece is a line or a parabola and its feet and w come in closed form;
   - or a per-arm distance field.
   Either is a rewrite, about one stage.
2. **The remaining accuracy gap is ambiguity, not convergence.** Near-tied foot branches flip with N.
   Deciding them needs a tie rule, for example prefer the branch continuous with the previous frame,
   or the nearer arm.
3. Two run-interior points over 1e-3h: muse_hash 0.1 and g41_user_tw64 0.1. Also, face and region key
   or order changes in def 0.5, g41_def_tw64 0.1 and ring 0. Check them before this lands in `src/`.
4. Levi: do the crops' corner changes show?

### Addendum: sizing the rewrite (19:38)

Two measurements on c7c9aac3 for the next stage. Neither changes `outline.ts`.

**How many pieces would an analytic growth walk?** `k1247s5_pieces.mjs` writes a scratch copy with
counters, and `k1247s5_pieces.ts` runs every scene. Per grown corner, over its nodes in rho order:

| | def 0 | all scenes |
|---|---|---|
| grown corners | 361 | 4640 |
| nodes per corner | 17.0 | 16.7 |
| foot-state changes per corner (a lower bound on pieces, minus 1) | 9.5 (max 21) | 9.0 |
| segments the two feet cross per corner | 10.4 (max 32) | 10.0 |
| corners crossing 9 or more segments | 227 | 2768 |
| w calls that reach the margin | 97% | 96% |
| margin calls that are nonzero / in ss01's band | 4.3% / 4.1% | 4.9% / 4.7% |
| half-plane walk segments per margin call | 6.0 | 6.1 |
| integral / r0: = 1, ≥ 0.9, ≥ 0.5, > 0, = 0 | 109 / 47 / 76 / 100 / 29 | 1254 / 524 / 865 / 1637 / 360 |

- An analytic growth would walk about 10-20 pieces per corner, which is no fewer than today's 17
  nodes. Its gain would come only from closed-form feet replacing the Newton steps and foot searches.
- The margin is 0 in 95% of its calls. w still falls on 70% of def's corners, so the fall comes from
  fSteep, fSlack and the root factors. Those are closed-form in the feet.
- Only 27% of def's corners keep w = 1, so a whole-corner w = 1 fast path would skip at most a quarter
  of the work.

**What is the margin worth?** I ran a scratch copy with mA = mB = 0. Its output is wrong, so this is a
ceiling only. Locked, def in motion, alternating, one config per process:

| run | corners (ms) |
|---|---|
| today, run 1 | 5.70 |
| margin-free, run 1 | 4.22 |
| today, run 2 | 5.77 |
| margin-free, run 2 | 4.10 |

So the margin costs about 1.6 ms. The advance and the w factors cost about 3.4 ms, and the rest of the
phase about 0.7 ms.

**Budget.** Today a grown corner costs about 14 µs (5.0 ms over def's 361). The phase also spends
0.7 ms outside the growth. A 1 ms phase therefore leaves 0.3 ms for growth, or 0.8 µs per corner:
40-80 ns per piece, margin included. Even with the outside cost at zero, the budget is only 2.8 µs per
corner, or 140-280 ns per piece.

**The next stage needs all three of these:**
- closed-form pieces, which remove the Newton steps and foot searches;
- a margin bounded once per corner or once per piece, not once per node;
- a fixed cost outside the growth below 0.7 ms.

Without all three, ≤1 ms is out of reach. A realistic intermediate target is about 2-3 ms.

**What picks c303's branch? (19:40)** `k1247s5_cmp.ts` now takes `--shift=0|1` and
`--segpred=0|1`. muse_default_tw 0's corner 303 is 0.49h from the reference with the hint shift on
(the default) and 0.003h with it off. The reference converged and does not shift. But the shift off
everywhere is worse overall: 455 corners over 0.01h, against 286 with it on, and user_tw42 0.1 goes
from 0.096h to 0.297h. I also tried a scratch clamp, which stops the shifted hint at its segment's end.
It was neutral: 285 corners over 0.01h (285/145/43/14 over 0.01/0.03/0.1/0.3h), c303 still 0.49h. I
reverted it. So the shift picks between near-tied branches, as item 2 above says; it is not a
convergence error. A tie rule could start here: when the shifted and the unshifted foot disagree,
check both and keep the one continuous with the previous node.

**Where does the margin's cost go? (19:45)** Two more scratch copies of outline.ts, timed like the
table above (locked, def in motion, one config per process, three rounds):
- walks only: `marginOfC` runs its two half-plane walks, then returns 0 before the window searches;
- a whole-window certificate: one `footWinFast` over the arm's whole window [winLo, winHi], bounded
  by dc. It returns 0 when nothing is closer, and falls back to today's code when something is. On def
  0 it certifies 11346 of 11854 calls in a frame.

| run | today | walks only | certificate |
|---|---|---|---|
| 1 | 5.62 | 5.73 | 6.46 |
| 2 | 5.62 | 5.61 | 6.41 |
| 3 | 5.57 | 5.42 | 6.36 |

Walks only and margin-free (4.31 and 4.34 ms, in an earlier locked batch beside today's 5.63) both
force the margin to 0, so they grow the same path. Their difference is the walks and the calls: about
1.2-1.3 ms, about 105 ns per `marginOfC` call. The window searches cost at most 0.1-0.2 ms. The
certificate is 0.8 ms slower than today, because its block-box scan over the whole window costs more
than the walks it skips. So a margin bound for the next stage has to replace the half-plane walks,
once per corner or once per piece.

**A CPU profile corrects one number (19:50).** `k1247s5_prof_sum.cjs` and `k1247s5_prof_split.cjs`
read a `.cpuprofile` of `_s5bench`-style def in motion (100 µs sampling; the profile is
`out/k1247s5/prof/def_motion_c7c9aac3.cpuprofile`). Walks only grows further than today, since no
margin stops a corner, so it hid part of the window searches' cost. By the profile, the window searches
are about a quarter of the margin's cost (footWinFast under marginOfC: 1.9% of samples, against
marginOfC's own 5.4%). That is about 0.4-0.5 ms, and the walks are the rest. The corners phase splits:

| part of cornersPhaseC | share |
|---|---|
| growIntegC (the growth) | 75.5% |
| trySolve (the cold V solve: solveVC, a global foot per Newton iteration) | 13.7% |
| cornerFallbackC | 5.4% |
| addPointAtC and the phase's own code | 4.6% |

Inside the growth: advanceToC 35%, wOfC 33% (86% of it marginOfC), refineC 26%. So the 0.7 ms
outside the growth is mostly the V solve, about 0.8 ms on def. Its global foot per iteration is
deliberate ("history must not pick a different root"), so speeding it up needs a cheaper exact global
test, not a tracked foot.

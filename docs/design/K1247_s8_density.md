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

## Handoff 1 (stage 8 agent, 2026-11-10 00:10)

**Verdict: at 0.25 device px, point reduction does not speed def's frame up.**
The only reductions that hold the bar on every scene, still and moved, keep
94.9-97.9% of the points. At that density, reduce's own cost (0.4-0.5 ms) and
the corners phase cancel the saving. The bar is broken by discontinuities in
the full outline, not by the reduction's precision, so a tighter eps never
fixes it. A speedup needs `outline.ts` to change first (see "What an app
version would need").

### Timing (def, under the perf lock, master's path = eps 0, same session)

pairC (23:56-23:57), two rounds each, ms:

| path | kept | median | p95 | reduce | setupBorders | corners | cutsEyes | regions | pieces |
|---|---|---|---|---|---|---|---|---|---|
| full (master) r0 | 100% | 18.80 | 26.2 | - | 5.00 | 7.59 | 4.26 | 2.28 | 1.45 |
| full (master) r1 | 100% | 18.77 | 25.3 | - | 4.55 | 7.03 | 4.00 | 2.12 | 1.27 |
| eps 0.02, short 4h, armwin 0.5h, armx 2h (passes) r0 | 96.3% | 19.11 | 30.6 | 0.42 | 4.60 | 7.20 | 4.04 | 2.17 | 1.32 |
| same r1 | 96.3% | 19.01 | 25.1 | 0.51 | 4.89 | 8.05 | 4.43 | 2.35 | 1.42 |
| armx 1h (3 failures) r0/r1 | 92.1% | 18.86 / 18.73 | 29.9 / 25.2 | 0.44 / 0.59 | | | | | |
| eps 0.1 + the same windows, armx 1h (10 failures) r0/r1 | 78.0% | 17.81 / 17.71 | 23.2 / 23.7 | 0.46 / 0.43 | | | | | |

Time against tolerance, plain Douglas-Peucker (pairA, 23:36-23:37, two rounds;
none passes the bar):

| eps (device px) | kept (def) | median r0/r1 | p95 r0/r1 | reduce | corners | all scenes kept, failures, worst |
|---|---|---|---|---|---|---|
| 0 (full) | 100% | 18.85 / 18.81 | 21.7 / 24.9 | - | 7.47 / 7.37 | - |
| 0.02 | 78.7% | 16.84 / 16.58 | 21.8 / 23.6 | 0.43 | 6.41 / 6.21 | 81.8%, 22, 15.8 px |
| 0.05 | 62.8% | 14.93 / 15.02 | 21.2 / 22.4 | 0.40-0.44 | 5.54 / 5.67 | 67.9%, 25, 15.8 px |
| 0.1 | 47.9% | 13.23 / 12.95 | 15.0 / 14.3 | 0.48 | 5.00 / 4.82 | 54.0%, 25, 16.0 px |
| 0.2 | 34.5% | 11.52 / 11.55 | 13.0 / 13.4 | 0.35 | 3.96 / 4.17 | 39.8%, 28, 43.3 px |

Frame cost against the kept fraction f is about 7.6 + 11.2 f ms. Selection
costs 8-12 ms with plain DP. With the arm windows it costs about 500 ms,
because the tool takes the arms from a `buildOutlineFull` of the still scene.
An app would read them from `structure()` instead.

### The reduction (k1247s8_reduce.ts)

- `selectKeep` runs once per diagram, beside `structure()`. It applies
  Douglas-Peucker on each chain's centreline at eps / (pxPerUnit * 2).
- It always keeps:
  - chain ends and feature anchors (each crossing end, junction root and
    drape);
  - whole chains shorter than `keepShort` (4h);
  - every junction arm's window `[sR, sR + dir L]` ± 0.5h (`armRanges`);
  - ± 2h around the crossing that caps each arm's L, on both of that
    crossing's chains (`armCrossRanges`).
- `reduceScene` runs per frame: it gathers the kept points and remaps each
  feature's s piecewise linearly.
- structure() of the reduced scene gives identical keys in the same order on
  every case.

Accuracy of the passing setting (eps 0.02, short 4h, armwin 0.5h, armx 2h;
all scenes 94.9% kept). Device px at dpr 2, Hausdorff both ways, piece by
piece; every case has identical keys:

| scene | kept | still max / p99 | 0.1h max / p99 | 0.5h max / p99 |
|---|---|---|---|---|
| def | 96.3% | 0.021 / 0.019 | 0.021 / 0.020 | 0.032 / 0.022 |
| def 40-frame cycle (warm) | | 0.032 / 0.020 over 66600 pieces | | |
| muse_hash | 97.7% | 0.069 / 0.019 | 0.066 / 0.020 | |
| muse_default_tw | 95.8% | 0.020 / 0.020 | 0.020 / 0.020 | |
| fat | 82.8% | 0.026 / 0.021 | 0.035 / 0.024 | 0.120 / 0.038 |
| ring | 96.1% | 0.020 / 0.020 | 0.020 / 0.020 | 0.028 / 0.026 |
| user_tw42.lightpaper | 95.3% | 0.020 / 0.020 | 0.020 / 0.020 | |
| g41_def_tw42 | 94.6% | 0.020 / 0.020 | 0.022 / 0.020 | |
| g41_def_tw64 | 97.4% | 0.033 / 0.020 | 0.033 / 0.019 | |
| g41_ring_tw42 | 95.2% | 0.020 / 0.020 | 0.021 / 0.021 | |
| g41_ring_tw64 | 96.6% | 0.025 / 0.019 | 0.027 / 0.019 | |
| g41_user_tw42 | 95.3% | 0.020 / 0.020 | 0.020 / 0.020 | |
| g41_user_tw64 | 96.5% | 0.025 / 0.019 | 0.021 / 0.020 | |

Cold equals warm within 1e-6 h on the reduced path (k1247s8_coldwarm.ts, 81
of 81 cases):

| setting | worst cold-warm gap |
|---|---|
| plain eps 0.05, 0.1, 0.2 | 2.4e-17 h |
| armwin + winx 2 | 0 |
| armwin + armx 2 | 0 |

Variants that fail:

- armx 1h: 91.8% kept, 3 failures, worst 0.737 px. These are muse_hash run
  ch46 side 1 (0.256 still, 0.737 at 0.1h) and def cycle frame 18's region
  key (816 vs 817).
- Arm windows cut to the first 3h from the root (`--armreach=3`, armx 2h):
  - eps 0.02: 93.8% kept, 3 failures (worst 0.479 px);
  - eps 0.05: 11 failures;
  - eps 0.1: 18 failures (g41_ring_tw64 6.26 px).
  
  The corner depends on its whole arm, not just its near end.
- Certifying by restoring points near failing pieces (`--cert`): 83.3% kept, 9
  failures.

### Why the bar needs 95% (measured)

The full outline is discontinuous in its own points. 0.001 px of random
jitter, with no reduction, moves def pieces by 9.0 px and muse_default_tw
pieces by 8.7 px (k1247s8_jitter.ts). Three mechanisms:

1. **Corner growth bifurcates at an end arm's root kink** (def corners 34 and
   38). Under jitter, arm A's foot ua stays pinned at 0 instead of sliding, so
   w falls to 0 by rho 1.2h, and r drops from the 2h cap (0.52 h) to 0.197 h
   (k1247s8_corner.ts, k1247s8_wrows.ts).
2. **A corner's foot amplifies an arm's L 9-20x.** L is the min of the next
   root, the chain's end and each crossing cut `d - h cot(theta/2) - h`. theta
   is read from both threads' tangents, so a reduced crossing shortens L by
   0.03-0.08 px and moves the foot by 0.68-0.75 px:
   - def corner 182: arm 266 on ch32, dL -0.034 px, ta moves 0.677 px;
   - muse_default_tw corner 277: arm 409 on ch84, dL -0.080 px, ta moves
     0.746 px;
   - k1247s8_cornred.ts traces both.
3. **Frame-time region ids depend on sliver existence.** A polygon with fewer
   than 3 points is skipped, so the region ids that follow shift (def cycle
   frame 18, run/3/1/-1/816 vs 817; k1247s8_regions.ts).

### What an app version would need

The reduction itself is small:

- `selectKeep` beside `structure()`, with arms from the structure;
- `reduceScene`, about 0.45 ms, inside the worker's frame before `frame()`.

It pays only after three changes in `outline.ts`, none written or measured
here:

- (a) Corner growth must be continuous at an end arm's root kink: the foot
  should slide, not pin.
- (b) The corner foot must be well conditioned against arm L: for example, L
  from a smoothed cut, or the foot independent of L when L is not binding.
- (c) Region ids must not depend on whether a sliver polygon exists.

With those, plain eps 0.1-0.2 (48-35% kept) would time at 13.0-11.5 ms against
18.8 ms, if its errors then fall under the bar. That is unmeasured.

### Done checks 4 and 5

**npm test** (00:01, on 3cbe5fbc): green.
- The typecheck passed.
- 220 test files passed and 2 were skipped; 2887 tests passed.

**k1247c_final.ps1** (00:03, logs in `out/k1247c_final/`) ran once with
`-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`, which
is the default path seen from an agent worktree. Every step exited 0.

| result | steps |
|---|---|
| pass | faces, outline_test (ALL PASS), structure (STRUCTURE IS THE DIAGRAM), pieces (ordered keys identical everywhere), coldwarm (worst 0), move_def (4.8e-9), cmp_cold, cmp_warm, cmp_move |
| fails | verify (27 FAILURES, then 48 FAILURES; see below), cmprows_still (3 FAILURES), cmprows_0.1 (3 FAILURES) |
| within tolerance | cmprows_0.5 |

- **verify, 27 FAILURES:** each failure is the missing `out/k1247c_base`
  table. That output lives only in the main checkout.
- **verify again, 48 FAILURES, after copying that base in**
  (`verify_withbase.txt`): keys are OK everywhere, and face point counts and
  order differ.
- **cmprows_still, 3 FAILURES:**
  - muse_hash A over2 547 -> 552;
  - muse_default_tw A 8 -> 10;
  - g41_def_tw64 A 39 -> 42.
- **cmprows_0.1, 3 FAILURES:**
  - muse_hash A and B;
  - g41_def_tw64 A.

Stage 8 changed nothing in `outline.ts` or `src/` (empty diff against
df6216bd). These deviations are master's outline against baselines written
2026-11-09 12:30-12:36, before K1247 s7's outline commits, not stage 8's
doing.

### What's left

- Measure (a)-(c) in a scratch copy of outline.ts once K1240 round 4 lands.
- Then re-run k1247s8_acc.ts at plain eps 0.1 / 0.2 and k1247s8_pair.mjs.

### Tools (.claude/probes/K1240/proto/)

| tool | what it does |
|---|---|
| `k1247s8_reduce.ts` | the reduction and its windows |
| `k1247s8_acc.ts` | accuracy: `--eps --short --armwin --armreach --armx --armxreach --winx --winj --wind --cert --scene --nocycle --list` |
| `k1247s8_time.ts` | the timed cycle, with phases and reduce |
| `k1247s8_pair.mjs` | master against reduced, alternating; entries are `eps` or `eps:--a=1+--b=2`; run through `k1247s8_run_locked.ps1` (owner K1247-s8) |
| `k1247s8_coldwarm.ts` | cold against warm on the reduced path |
| `k1247s8_jitter.ts` | `--cyc` |
| `k1247s8_corner.ts`, `k1247s8_wrows.ts`, `k1247s8_diag.ts`, `k1247s8_cornred.ts`, `k1247s8_regions.ts` | the diagnoses above |

Outputs are in `out/k1247s8_time/` and are not committed. The accuracy logs
were in the session scratchpad, and the tables above hold their numbers.

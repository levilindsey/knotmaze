# K1196 (batch 20 Run F): two-ended pulses on loops and cycles — timing

Master records in `bench_all.json` (2026-11-05T09:50:49.118Z); raw per-load dumps in `dumps/`, appended records in `rounds.jsonl`.
Host: desktop 1600x900@2 angle=d3d11 (bench_frame size). Caps renderer: ANGLE (AMD, AMD Radeon RX 6800 XT (0x000073BF) Direct3D11 vs_5_0 ps_5_0, D3D11). Rest window 5 s; play window 24 moves back to back per load.
Sequence: same-build control pair (baseline twice) first, then 4 ABBA rounds (even: baseline, cyc, loop; odd: loop, cyc, baseline); each load measures rest then play on the same page.

Stands (verbatim from `stands_cyc.mjs`): baseline = k111 link, no moves, start head; cyc = k111 moves 0,246,82,83,199,150,151,38,155,211 to node_221; loop = seed 1 &pr=8 moves 185,186,187,122,50,118,117,165,60,9,178,57,101 to node_635.
Two-ended knowledge: `__knotPulses()` items with `two === true` in the dumped declaration (see bench.mjs header), cross-checked with `dumpPulses`.

## At rest — frame ms per load

| load (seq, round) | state | target two | head | frame p50 | frame mean | finish p50 | frames | window s / moves |
|---|---|---|---|---:|---:|---:|---:|---|
| 0, -1 | baseline | — (none expected) | mentr_b | 7.10 | 7.12 | 6.70 | 277 | 5 s |
| 1, -1 | baseline | — (none expected) | mentr_b | 6.90 | 7.00 | 6.60 | 277 | 5 s |
| 2, 0 | baseline | — (none expected) | mentr_b | 7.00 | 7.03 | 6.70 | 277 | 5 s |
| 3, 0 | cyc | e210 two | node_221 | 7.40 | 7.52 | 7.10 | 277 | 5 s |
| 4, 0 | loop | e102 two | node_635 | 7.70 | 7.88 | 7.40 | 277 | 5 s |
| 5, 1 | loop | e102 two | node_635 | 7.80 | 7.93 | 7.50 | 275 | 5 s |
| 6, 1 | cyc | e210 two | node_221 | 7.60 | 7.67 | 7.20 | 277 | 5 s |
| 7, 1 | baseline | — (none expected) | mentr_b | 7.20 | 7.25 | 6.80 | 276 | 5 s |
| 8, 2 | baseline | — (none expected) | mentr_b | 7.10 | 7.10 | 6.70 | 277 | 5 s |
| 9, 2 | cyc | e210 two | node_221 | 7.60 | 7.64 | 7.20 | 277 | 5 s |
| 10, 2 | loop | e102 two | node_635 | 7.90 | 7.96 | 7.50 | 277 | 5 s |
| 11, 3 | loop | e102 two | node_635 | 7.90 | 7.96 | 7.50 | 276 | 5 s |
| 12, 3 | cyc | e210 two | node_221 | 7.40 | 7.49 | 7.10 | 276 | 5 s |
| 13, 3 | baseline | — (none expected) | mentr_b | 7.00 | 7.04 | 6.70 | 278 | 5 s |

| state (4 rounds, control pair excluded) | frame p50 mean (min–max) | frame mean mean (min–max) | finish p50 mean (min–max) |
|---|---:|---:|---:|
| baseline (n=4) | 7.07 (7.00–7.20) | 7.10 (7.03–7.25) | 6.72 (6.70–6.80) |
| cyc (n=4) | 7.50 (7.40–7.60) | 7.58 (7.49–7.67) | 7.15 (7.10–7.20) |
| loop (n=4) | 7.82 (7.70–7.90) | 7.93 (7.88–7.96) | 7.47 (7.40–7.50) |
| baseline control pair (n=2) | 7.00 (6.90–7.10; each 7.10, 6.90) | | |

## In play — frame ms per load

| load (seq, round) | state | target two | head | frame p50 | frame mean | finish p50 | frames | window s / moves |
|---|---|---|---|---:|---:|---:|---:|---|
| 0, -1 | baseline | — (none expected) | mentr_b | 6.80 | 6.86 | 6.50 | 1969 | 35.54 s / 24 |
| 1, -1 | baseline | — (none expected) | mentr_b | 6.90 | 6.92 | 6.60 | 1961 | 35.44 s / 24 |
| 2, 0 | baseline | — (none expected) | mentr_b | 6.90 | 6.96 | 6.60 | 1961 | 35.46 s / 24 |
| 3, 0 | cyc | e210 two | node_221 | 7.10 | 7.21 | 6.80 | 319 | 5.79 s / 24 |
| 4, 0 | loop | e102 two | node_635 | 7.20 | 7.24 | 6.90 | 1348 | 24.45 s / 24 |
| 5, 1 | loop | e102 two | node_635 | 7.20 | 7.24 | 6.90 | 1340 | 24.35 s / 24 |
| 6, 1 | cyc | e210 two | node_221 | 7.50 | 7.54 | 7.10 | 318 | 5.82 s / 24 |
| 7, 1 | baseline | — (none expected) | mentr_b | 7.00 | 7.07 | 6.70 | 1955 | 35.42 s / 24 |
| 8, 2 | baseline | — (none expected) | mentr_b | 7.00 | 7.02 | 6.70 | 1958 | 35.45 s / 24 |
| 9, 2 | cyc | e210 two | node_221 | 7.30 | 7.40 | 7.00 | 319 | 5.79 s / 24 |
| 10, 2 | loop | e102 two | node_635 | 7.30 | 7.30 | 6.90 | 1356 | 24.55 s / 24 |
| 11, 3 | loop | e102 two | node_635 | 7.20 | 7.21 | 6.90 | 1349 | 24.53 s / 24 |
| 12, 3 | cyc | e210 two | node_221 | 7.10 | 7.22 | 6.80 | 319 | 5.78 s / 24 |
| 13, 3 | baseline | — (none expected) | mentr_b | 6.90 | 6.91 | 6.60 | 1960 | 35.41 s / 24 |

| state (4 rounds, control pair excluded) | frame p50 mean (min–max) | frame mean mean (min–max) | finish p50 mean (min–max) |
|---|---:|---:|---:|
| baseline (n=4) | 6.95 (6.90–7.00) | 6.99 (6.91–7.07) | 6.65 (6.60–6.70) |
| cyc (n=4) | 7.25 (7.10–7.50) | 7.34 (7.21–7.54) | 6.92 (6.80–7.10) |
| loop (n=4) | 7.22 (7.20–7.30) | 7.25 (7.21–7.30) | 6.90 (6.90–6.90) |
| baseline control pair (n=2) | 6.85 (6.80–6.90; each 6.80, 6.90) | | |

## In play — did the target stay two-ended?

- cyc seq 3 round 0: e210 two before 24/24 moves, after 24/24; heads visited: node_221, node_218; ends at node_221 with two-ended 210.
- loop seq 4 round 0: e102 two before 24/24 moves, after 24/24; heads visited: node_635; ends at node_635 with two-ended 102.
- loop seq 5 round 1: e102 two before 24/24 moves, after 24/24; heads visited: node_635; ends at node_635 with two-ended 102.
- cyc seq 6 round 1: e210 two before 24/24 moves, after 24/24; heads visited: node_221, node_218; ends at node_221 with two-ended 210.
- cyc seq 9 round 2: e210 two before 24/24 moves, after 24/24; heads visited: node_221, node_218; ends at node_221 with two-ended 210.
- loop seq 10 round 2: e102 two before 24/24 moves, after 24/24; heads visited: node_635; ends at node_635 with two-ended 102.
- loop seq 11 round 3: e102 two before 24/24 moves, after 24/24; heads visited: node_635; ends at node_635 with two-ended 102.
- cyc seq 12 round 3: e210 two before 24/24 moves, after 24/24; heads visited: node_221, node_218; ends at node_221 with two-ended 210.

Baseline play is e0 back and forth between mentr_b and node_12 (24 moves, ends at mentr_b); it declares no two-ended arm, as expected.

Reference: S4's rest bench (`.claude/probes/K1139/out/s4cyc/bench_rest.json`, ABBA x4, 5 s, k111 start head) read frameP50 base 7.15 ms against S4 7.10 ms — start-head one-ended pulses only.

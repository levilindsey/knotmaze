# K1196 22E (batch 22 Run E): S4's own cost on the desktop, ABBA

Builds (all `scripts/preview.ps1 -Ref <sha> -Root $env:TEMP\knotmaze-previews -BuildOnly`, exit 0):
`aa1156ae` (S4's base), `36aed2d5` (S4+S4b), `95fcf3b7` (S4 alone, third
build — triggered, see below), `1fe793f5`, `71eedb94`, `fbc1b212`.
Each build was served with `vite preview` on ports 5910-5915 and timed
with `bench22e.mjs` (copy of 20F's `bench.mjs`; its header names the
changes: preview host instead of the dev server, `dumpPulses` falls
back when `/src` is absent, and with `K1196_BASE=1` the two-ended stop
records the target arm's one-ended declaration and goes on — on the
base build cyc's e210 and loop's e102 both declared one-ended at every
load, as the drafting brief directs). Sequence per build: same-build
control pair first, then ABBA x4; rest 5 s then play 24 moves per load.
All timing under the perf lock (`run_locked.ps1 -Batch`,
`batch22e.txt`, then `batch22e_s4.txt`; the first batch held the lock
past its 30 min staleness mark and the lock file was already gone when
it released — no other timing ran in that window). Full table:
`out22e_table.txt` (from `table22e.mjs` over the three `bench_all.json`).

## S4's own cost (head minus base, ms, 4-round means)

At rest, frame p50: baseline +0.22, cyc +0.05, loop -0.02 (frame mean
+0.32 / +0.06 / -0.03; finish p50 +0.20 / +0.08 / -0.03). In play,
frame p50: baseline +0.18, cyc +0.03, loop -0.10 (frame mean +0.41 /
-0.01 / -0.07). Control-pair spread: base 0.00, head 0.20 (rest and
play, frame p50).

Baseline — a stand with no two-ended arm on any build — crossed
0.2 ms, so the third build ran. It splits the baseline gap away from
S4: S4 alone reads +0.05 (p50) / +0.07 (mean) over base at baseline,
and the rest sits in S4b's span (head-S4 +0.17 / +0.25). At the
two-ended stands S4's own step is +0.15 frame p50 at rest (cyc and
loop; frame mean +0.10 / +0.17) and +0.04 to +0.10 in play, with
head-base back at ~0 there (S4b's span reads -0.10 to -0.20): in
play, neither S4 nor S4b costs anything measurable at the stands
that light a two-ended arm.

## Frame-tail watch (7-moves stand)

Stand: link `b.J&am=instant&fw=0&snd=none&phw=0` (the phone pass's
fabric link `?b.J&am=instant&snd=none` from
`scripts/phone_pass/bench.mjs`, plus the K1196 bench's `fw=0&phw=0`),
walk 7 cheapest moves (`walk.mjs` `makeMoves`' pick, driven by
`__knotTurnMove` as `bench.mjs`'s play driver does), timed with
`tail22e.mjs` (bench's play collector keeping per-frame times), ABBA
x4 per pair after a same-build control pair. Means over the 4 rounds:

| pair | build | p95 | p99 | max | frames >2x median |
|---|---|---:|---:|---:|---:|
| 1fe793f5 → 71eedb94 | base | 10.43 | 12.10 | 15.1 | 3 |
| | head | 12.00 | 13.98 | 19.8 | 6 |
| 36aed2d5 → fbc1b212 | base | 8.45 | 9.28 | 19.6 | 1 |
| | head | 10.03 | 11.38 | 18.4 | 2 |

Control-pair p95 spread: pair 1: 0.50; pair 2: 1.30. Pair 1's head
moves its tail (p95 +1.58 and p99 +1.88 against a 0.50 spread; the
head's p50 also rises 6.90 → 7.93, so the whole frame is slower, tail
with it). Pair 2's head also reads higher (p95 +1.58 against a 1.30
spread, p99 +2.10, one head load at p50 10.2) — moved, but only just
past its own control spread.

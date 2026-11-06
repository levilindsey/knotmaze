# K1214 22M (batch 22 Run M): what costs in play since K1139's pulses

Probes only; no `src/` change. Scripts in this folder (`tail22m.mjs`,
`prof22m.mjs`, `gpu22m.mjs`, `cdp22m.mjs`, `table22m.mjs`,
`prof_table.mjs`, `run_cdp.ps1`, the `batch22m_*.txt` lock batches,
copied `lib.mjs` / `run_locked.ps1` / `vite.private-cache.config.ts`);
raw outputs (`out_*/`, logs, `udd/`, `vite-cache/`) stay untracked.

## Builds (task 1)

All five made with `pwsh -NoProfile -File scripts/preview.ps1 -Ref <sha>
-Root $env:TEMP\knotmaze-previews -BuildOnly`, exit 0, and served with
`vite preview` on 5990-5994:

| build | port | what it is |
|---|---:|---|
| `1fe793f5` | 5990 | pair 1 base (before K1139 Stages 3-4) |
| `71eedb94` | 5991 | pair 1 head (Stages 3+4) |
| `36aed2d5` | 5992 | pair 2 base (S4+S4b) |
| `fbc1b212` | 5993 | pair 2 head (S5 on by default) |
| `734c55b9` | 5994 | master (HEAD at run start; K1211 S2's `a84225d3` verified an ancestor) |

Master's full sha: `734c55b937073079c61c218e2e8aaca608bb6944`.

## The tail again (task 2)

E's tail stand verbatim (`tail22m.mjs`, a copy of 22E's `tail22e.mjs`:
link `b.J&am=instant&fw=0&snd=none&phw=0`, 7 cheapest moves, per-frame
first-draw to 1-px `readPixels`), same-build control pair first, then
ABBA x4 per pair, all under the perf lock (`run_locked.ps1 -Batch
batch22m_tail.txt`, 14:33-14:49). Means over the 4 rounds; max is the
largest round max; `>2x` summed over rounds.

| pair | build | p50 | p95 | p99 | max | frames >2x median |
|---|---|---:|---:|---:|---:|---:|
| 1fe793f5 → 71eedb94 | base | 6.67 | 7.30 | 7.80 | 11.0 | 0 |
| | head | 7.68 | 8.43 | 9.23 | 19.8 | 1 |
| 36aed2d5 → fbc1b212 | base | 7.13 | 7.88 | 8.43 | 14.1 | 0 |
| | head | 7.15 | 7.95 | 8.43 | 14.8 | 2 |
| fbc1b212 → 734c55b9 | base | 7.17 | 8.00 | 8.65 | 18.1 | 1 |
| | head (master) | 7.00 | 7.78 | 8.63 | 15.6 | 1 |

Head minus base: pair 1 p50 +1.00, p95 **+1.13**, p99 +1.43 (control-pair
p95 spread 0.20). Pair 2: +0.03 / **+0.07** / 0.00 (spread 0.20). Pair 3
(master): -0.17 / **-0.22** / -0.03 (spread 0.20).

So on a quiet machine only pair 1's step reproduces. E's pair-2 step
(+1.58 against a 1.30 spread, timed while other work ran) does not:
S5 costs nothing measurable here. Master, with K1211 S2 in, is not
slower than fbc1b212 at this stand.

What else ran: `paseo ls` at 14:33 showed only this run `running`
(every earlier batch-22 run idle, none timing); 18 node and 20 chrome
processes, five of the node processes being this run's own preview
servers (20 node / 22 chrome at the batch's end, the probe browsers
included). The phase-split batch waited 8.2 min for the perf lock
behind another holder before starting; its numbers were still taken
under the lock.

## The split (task 3)

One 7-moves window per build on the preview builds (`prof22m.mjs`:
the tail collector plus probe-only wraps, restored afterwards, of
`renderer.update`, `renderer.rebuildFillets`, `renderer.tickPaint`,
`fabric.tickAnim`, `fabric.tickExplore`, `fabric.update`), then a CDP
Profiler sample over the same 7 moves per build (`cdp22m.mjs`;
see the dev-server note below). `submitMs` is first draw to the
readPixels call, `finishMs` the blocked-in-read time: the GPU-stall
proxy. `src/app/probe_hooks.ts` exposes no per-pass GPU timer for the
fabric passes (its GPU timing surface is the label pass's, text only),
so the GPU split is submit/finish plus the fan-hidden run further
down. `rebuildFillets` runs inside `tickPaint`, so tickPaint's own
share is the exclusive column (tickPaint minus rebuild).

| build | frame p50/p95 | submit mean/p95 | finish mean/p95 | tickAnim mean | rebuild total (calls) | tickPaint excl. total | draws/frame |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1fe793f5 | 6.50 / 7.30 | 0.446 / 0.70 | 6.154 / 6.80 | 0.210 | 84.3 (15) | 0.1 | 101 |
| 71eedb94 | 7.20 / 8.00 | 0.445 / 0.70 | 6.822 / 7.50 | 0.209 | 64.2 (11) | 0.6 | 101 |
| 36aed2d5 | 7.20 / 8.20 | 0.502 / 0.80 | 6.838 / 7.50 | 0.238 | 107.6 (13) | 0.1 | 101 |
| fbc1b212 | 7.10 / 8.20 | 0.467 / 0.80 | 6.782 / 7.50 | 0.216 | 89.9 (14) | 0.1 | 101 |
| 734c55b9 | 7.10 / 7.80 | 0.459 / 0.70 | 6.674 / 7.20 | 0.227 | 62.4 (13) | 0.5 | 100 |

`renderer.update` was called 0 times in every window (asleep fabric;
geometry static). `__knotPerf()` after each window (its 600-frame ring
still holds settle frames, so read it as a bracket, not the window):
mean 15.79 / 17.24 / 16.49 / 16.46 / 16.25, p95 41.5 / 41.5 / 41.0 /
41.2 / 40.6 in the table's build order; `__knotPerf(120)` after the
fan-hidden windows reads mean about 1.40 ms on every build: the JS
ticker callback itself is about 1.4 ms a frame everywhere.

CDP Profiler, self ms over the window, grouped by file (dev servers
of per-build worktrees, `run_cdp.ps1` on port 5995: a preview bundle
is one minified chunk and cannot be grouped by file, so these costs
attribute by file only; they are not the tail's numbers):

| file | 1fe793f5 | 71eedb94 | 36aed2d5 | fbc1b212 | 734c55b9 |
|---|---:|---:|---:|---:|---:|
| junction_routes.ts | 0 | 1.07 | 1.11 | 1.08 | 0.08 |
| ribbon/joinery.ts | 42.22 | 32.40 | 34.50 | 35.75 | 26.69 |
| junction_field.ts | 0 | 0 | 0 | 0 | 0 |
| ribbon_renderer.ts | 19.53 | 15.63 | 14.70 | 14.64 | 11.54 |
| rest (idle 3.5 s, (program) about 0.5 s, Pixi, the rest of src) | 4272 | 4289 | 4212 | 4208 | 4235 |

Top JS functions are the same on every build (`rebuildFillets` in
joinery 15-22 ms and in ribbon_renderer 6-14 ms over the whole 4.3 s
window, `pushFan`, `sampleAt`, `pulseTree`, `runsToExit`, all under
25 ms). No JS function or file grows from base to head in either
pair; joinery's self time falls. `junction_field.ts` reads 0 on the
CPU because its cost is its GLSL, which is the next table.

Fan-hidden windows (`gpu22m.mjs`, `K1214_VARIANT=nofans`:
`filletMesh`/`filletTopMesh` `mesh.renderable = false`, the fans'
fragment pass out of the frame), finish mean:

| | all fans | no fans | fan pass's own |
|---|---:|---:|---:|
| 1fe793f5 | 6.154 (repeat 6.210) | 4.699 (repeat 4.706) | 1.46 (1.50) |
| 71eedb94 | 6.822 (repeat 6.807) | 4.882 (repeat 4.917) | 1.94 (1.89) |
| fbc1b212 | 6.782 | 4.933 | 1.85 |

Pair 1's finish growth is +0.67 / +0.60 over the two load pairs; with
the fans hidden it is +0.18 / +0.21. The fan pass's own growth, +0.49
/ +0.39, is about two thirds to three quarters of the frame's GPU
growth, and it matches the tail's p95 step (+1.13, ABBA) in direction
and rough size (the prof windows are single loads, so read the share,
not the third digit). fbc1b212's fan cost (1.85) sits at the head's
level, not the base's: S5 changed the ribbon crest shader, not the
fan, and adds nothing on top. The master fan-hidden load caught a
machine hiccup (wall 44.7 s against about 37 s, settle lag 25 s) and
its row is discarded; master's all-fans finish (6.674) already reads
at or below fbc1b212's.

**The piece that costs is the junction fan's fragment work**
(`junction_field.ts`'s `junctionField` GLSL, drawn by the fillet fan
meshes), which Stages 3 and 4 grew (+182 lines in that file, with
`junction_routes.ts` +219 and `joinery.ts` +209 of route and record
work whose CPU side the CDP table clears). Sure: high that the step
is GPU fan fragment and not JS (submit flat, every JS phase flat or
down, the gap surviving in finish on both load pairs, and shrinking
to about a quarter with the fans hidden); the exact share is ±10
points or so, the residual +0.2 with fans hidden being unattributed
(other GPU work or single-load noise). No fix in this run.

## The carrying piece per frame (task 4)

On 71eedb94 (`out_prof_71eedb94/prof.json`, 229 frames; per-frame
phase buckets can sit one frame off the draw they belong to, totals
are exact). Frames sorted by finishMs, against the whole frame:

| frame | finishMs | frameMs | rebuild that frame |
|---:|---:|---:|---|
| 0 | 14.4 | 16.8 | x0 |
| 154 | 8.0 | 9.0 | x1 |
| 60 | 7.8 | 8.2 | x0 |
| 97 | 7.8 | 8.7 | x1 |
| 42 | 7.6 | 8.1 | x0 |
| 74 | 7.6 | 8.1 | x0 |
| 215 | 7.6 | 7.9 | x0 |
| 220 | 7.6 | 8.4 | x1 |
| 40 | 7.5 | 7.9 | x0 |
| 135 | 7.5 | 7.9 | x0 |

finishMs is present on 229 of 229 frames (mean 6.82 of a 7.20 p50
frame): **the fan pass runs every frame**, pulses crossing junctions
or not, so its growth lifts the whole frame (pair 1's p50 rose
+1.00 with its p95). The separate, rarer spike is `rebuildFillets`:
over 0.05 ms on only 8 of 229 frames (one per move or so; those
frames' p95 9.0 against 7.9 for the rest), which is where the max
(19.8 in the tail) comes from. Its total did not grow (64 ms on the
head against 84 ms on the base), so it is not the p95 step.

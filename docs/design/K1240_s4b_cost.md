# K1240 S4b: `rp=outline` at the prototype's cost, then merge-ready

Ledgers: K1240 (the redesign), K1247 (its frame cost). One Claude Opus agent in its own worktree. Cap 2 h.
Builds on S4 (`docs/design/K1240_s4_app.md` and its handoff, on branch `worktree-agent-a5393aa1f25f2ff33`
at 60f934b7).

## Why

S4 ported the prototype's default path into `src/render/outline/` behind `rp=outline`. The port equals
the prototype on the 12 scenes, but in the app it runs about 100 times slower. A def maze frame takes
about 3 s in the outline worker against the prototype's `frame()` at about 29 ms median (K1290, today).
The band, the per-frame vertex buffer, holds 6.3M vertices and takes about 2.5 s of that. In knot mode a
build takes 17-19 s. Equal output on the same scene with 100x the cost suggests the app gives the
outline different input (sample density, scale, DPR, scene size, or a band built at screen resolution),
but that is unmeasured. Two more problems:
- The structure is rebuilt in 12 of 18 replies on def maze, because the diagram key changes or the frame
  update throws. Levi's rule: the structure is decided once, and only positions follow the frame.
- With flow on (`fw=1`) the outline rebuilds continuously and never settles.

Until the cost is fixed, Levi can't judge the redesign on his phone.

## Done

- **Cost:** the outline worker's frame on def maze (`?b&am=instant&snd=none&fw=0&rp=outline`) is within
  1.5x of the prototype's `frame()` on the same state. Otherwise, numbers that say where the remainder
  goes and why it can't go. Say what the 100x was.
- **Structure once:** over a 5 s drag on def maze, the structure is built once unless the diagram
  changes. Log each rebuild with its cause. Flow on settles.
- **Tests:** `npm test` green, and the golden snapshots (`test/physics/byte_identity.test.ts`) unchanged.
- **Timing:** `scripts/bench_frame.mjs` on def at rest and mid-drag, with and without `rp=outline`,
  under the perf lock. Report build, per-frame update, upload and draw, median and p95.
- **Crops:**
  - Fix `k1240s4_crops` picking the wrong canvas: def's fbb column is white. Use
    `scripts/export_scene.mjs`'s rule: the largest on-screen canvas, skipping `knot-loading-canvas`.
  - Regenerate the rows in `.claude/probes/K1240/out/s4/crops/`.
  - At def_j156, the outline column has a thin green-grey line along the seam between two runs. Say
    whether the prototype draws it too. If only the app does, fix it.

The look (the corner bites, K1283; junction colour hand-off, K1278 stage 2) and the missing app pieces
(palette, overlays inside the base layer) are not this stage.

## Setup

`git reset --hard 60f934b7`, then `git rebase <the master SHA the coordinator gives you>`. Nothing
overlaps, so it applies cleanly. Copy `.claude/probes/K1240/out/` and `.claude/probes/K868/scenes/`
from the main checkout if your worktree lacks them. The g41_ring_tw64 capture now reads physics hash
a4b8c1bf, not ea67fc77; the defaults moved, and that's expected.

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Your files:** `src/render/outline/`, `src/app/frame_loop.ts` and the `__knotLookAt` hook in `main.ts`
  (both from S4), tests under `test/`, and the tools in `.claude/probes/K1240/s4/`. The prototype in
  `.claude/probes/K1240/proto/` is read only. The flag-off app must stay byte-identical.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout. Never kill a process you did
  not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  delete it after. While someone else holds it, wait inside one blocking command; older than 30 min is
  stale. Never touch the phone.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Say what the 100x was and what fixed it, with numbers before and after. Then the rebuild causes, the
timings, the crop paths, the def_j156 line, and your last SHA. End with `Ledger items` and K1240's
handle fields.

## Handoff (S4b agent, 2026-11-10 19:45; started 18:54)

**The 100x was the tie-alpha band, rebuilt every frame.** S4's worker rebuilt `bandData` (draw.ts) on
each frame: every tied border segment split at s = m h/8 into 8 rows, `alphaAt` per vertex, 6.29M
vertices, about 2.2-2.5 s of the 3.4 s frame. The prototype runs the same loop (`proto/draw.ts`
`buildDrawData`, `SUB = h / 8; ROWS = 8`): on def it costs 2549-2578 ms (3 runs,
`k1240s4b_protodraw.ts`; `buildOutline` 144-174 ms). K1290's 35.6 ms timed `O.frame()` only, and the
prototype builds its draw data once for a still page, so nothing ever timed that loop per frame. The input
was not different: same scene, same counts.

**What fixed it:**
- `src/render/outline/band_gpu.ts`: one quad per border segment (428-432k vertices on def), with the tie
  alpha computed per fragment from a chain-sample texture and a pass table. `alphaCpu` is its CPU twin,
  and `test/render/band_gpu.test.ts` ties it to `tieAlpha`.
- The restructure churn: junction arm lists came back rotated (same diagram, a different first arm), so
  the key changed. `diagramKey` now takes each junction's least rotation, and `alignJunctionArms` runs
  before every part in `OutlineModel.update`.

**Before and after, def, `fw=0`, in the browser:**

| | S4 | S4b (p50 / p95) |
|---|---|---|
| Worker per moved frame | 3.4 s | 116.6 / 155.3 ms |
| Structure | 3.3 s | 410 ms, once |
| Round trip | 3.3-3.45 s | 131.1 / 165 ms |
| Upload | 38-65 ms | 3.6 / 5.7 ms |
| Band vertices | 6.29M | 0.43M |

**Where the 117 ms goes:** mid-drag, the browser worker, 28 replies, p50 / p95 (`k1240s4b_bench.mjs`).

| Part | p50 ms | p95 ms |
|---|---|---|
| frame | 33.7 | 54.5 |
| zChains | 16.7 | 21.7 |
| fill | 21.4 | 36.8 |
| paint | 4.9 | 6.9 |
| band | 38.1 | 51.7 |

The 1.5x target (about 53 ms) is not met:
- The frame part is at parity with the prototype's `frame()` (35.6 ms median, K1290).
- The other ~81 ms is the per-frame draw data. The prototype's `frame()` doesn't include it; the
  prototype builds it in `buildDrawData`, at 2.55 s.
- Next levers, in order:
  1. the band's per-segment foot search (`footS`) and slot choice;
  2. zChains' span walks;
  3. the fill;
  4. or a second worker for the draw data: latency about max(frame + zChains + paint, fill + band).
- Node timings (`scripts/run_node.mjs`) inflate these hot loops: paintFrame reads 44 ms in Node and
  4.9 ms in the worker. Compare in the browser.

**Rebuild causes:**
- In S4, 12 of 18 replies restructured.
- Now: one restructure, cause `first`, on def over 30 s at rest, a 5 s loop drag and 30 s after. This
  holds with `fw=0` (`k1240s4_smoke.mjs`, smoke2) and with `fw=1` (smoke3). None happened during the
  drag.
- Each one is logged:
  - in `__knotOutline.stats.rebuilds` (`{at, cause, ms}`);
  - as `console.info`;
  - the worker names the cause: `first`, a key change with its diff, or a frame that threw.

**Flow on (`fw=1`): the structure settles, but `settled` never holds.**
- Flow displaces every chain sample every frame (ribbon_renderer's `FLOW_*`, render side), so the
  outline follows positions back to back: 422 replies in about 75 s, worker 104-120 ms each, forever at
  rest. One core stays busy.
- Settling under flow needs a decision:
  - apply flow to a rest build in the outline's vertex shader (the roadmap's "shader displacement"), or
  - throttle the follow.

**Timing:**
- Setup: desktop RX 6800 XT, 1600x900 at dpr 2, d3d11, under the perf lock.
- `bench_frame.mjs` has no drag mode. The mid-drag numbers come from `k1240s4b_bench.mjs`: bench_frame's
  method (first draw to a 1-px readPixels) on the app canvas, plus a 5 s loop drag.
- `updateMsPerCall` reads null (no `__knotRenderer().update` hook).

| def | frameMs p50 / p95 | rAF interval p50 / p95 |
|---|---|---|
| Rest, today (bench_frame, 2 rounds ABBA) | 12.3 / 12.4-12.8 (100 draws) | 16.7 / 17.5-17.9 |
| Rest, `rp=outline` | 1.1 / 1.4-1.5 (8 draws) | 16.7 / 17.7-17.8 |
| Mid-drag, today | 13.9 / 14.2 | 32.3 / 33.2 |
| Mid-drag, `rp=outline` | 6.3 / 9.6 | 26.8 / 48.1 |

The outline's parts:
- build (structure): 410 ms, once;
- per-frame update: 116.6 / 155.3 ms in the worker, round trip 131.1 / 165;
- upload: 3.6 / 5.7 ms;
- draw: 0.1 / 0.2 ms CPU.

**Tests:**
- `npm test` is green: 222 files, 2901 tests (19:38).
- `test/physics/` has no diff against ae2a1787.
- The K299 quotient guard (`paint_ring_lap.test.ts`) now lists the outline's three GLSL sites. S4's
  draw.ts paint lap had already failed it.

**Crops:** in `.claude/probes/K1240/out/s4/crops/`.
- Files:
  - `rows.png`, `<spot>.png`, `full_<scene>_<look>.png` and `crops.json`;
  - for the four def spots, `<spot>_proto.png` and `<spot>_proto_vs_app.png` (`k1240s4b_protocrop.mjs`).
    It needs `.claude/probes/K868/scenes/def.json` copied to `.claude/probes/K1240/out/scenes/`, and
    hides the app loader that the dev server injects.
- The fbb column is now the app canvas. Form B is ink only, so on def's dark backdrop it reads as
  dark-brown lines, and on muse's light backdrop as black ones. It is no longer white.
- g41's hash mismatch is not the defaults and not the flag. `__knotStepUntil(40)` lands at 40.00833
  (a4b8c1bf) or at 40.01667 (ea67fc77), depending on the starting phase: one substep apart. The plain
  link gave both in two runs (`k1240s4b_hash.mjs`). This run's g41 outline column is one substep early;
  fbb and today are on ea67fc77.

**def_j156: the prototype draws the line too.**
- `def_j156_proto_vs_app.png` shows the same thin strip on the same seam in both, with the same geometry.
  Only the colours differ, because of the app palette (S4's known gap).
- The other def spots show the same: `def_j16_proto_vs_app.png`; the strips at j14 and j81 in `rows.png`.
- It's the junction colour hand-off (K1278 stage 2), not an app bug, so I made no fix.

**Next:**
1. Decide what flow does under the outline.
2. Cost: the band's footS and slots, zChains, the fill, or a second worker.
3. Phone timing (not run: this stage never touches the phone).
4. Knot mode was not re-measured (S4: a 17-19 s structure).
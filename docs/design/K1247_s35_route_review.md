# K1247 stage 35: the route to the speed gate, after the incremental route

Ledgers: K1247 (this), K1310 (speed first), K1240 (the redesign; the Speed table in `docs/design/K1240_gate.md`).
One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: `## Plan to the gate
(s30)` in `docs/design/K1247_s30_path_to_gate.md`, then the handoffs at the end of `docs/design/K1247_s33_local_holds.md`
and `docs/design/K1247_s34_span_holds.md`.

## Why

s30 chose an incremental frame (rebuild only what moved, carry the rest) and planned six stages to about 7-9 ms
p50 on the desktop def drag. s31-s34 built its first stages, and it does not hold:

- **The cascade:** a moved crossing releases its partner, a blended pass counts as moved, and the release spreads
  through every crossing. Dirty spans are about 100% at p50 on def, muse_hash and fat.
- **Check (b) fails:** the gentler hold rules (s33's, s34's `span` and `jxa`) cut the dirty share (def 33.7%) but
  break (b): muse_hash 2.36 px at f63 near jj113.
- **The flags lose:** with them on, the app is slower than master on both drags (s34's ABBA).
- **The ceiling misses the bar:** rebuilding exactly what moves more than 0.25 px takes the def frame to 8.36 ms
  (s33), and the whole pipeline to about 7-9 ms. The bar is 3 / 6 ms on desktop and 16 ms p50 on the Pixel.
- **Today:** the def worker is about 105-117 ms per moved frame in the app (s12's and s34's ABBAs, under load),
  so the outline redraws at about 9-10 Hz mid-drag.
- **K1310's floor:** K1310 projected about 2.7 ms only with every part placed on the GPU and a fixed band topology.

So the route has to change before more stages are built on it.

## Goal

A route that can reach the gate, decided by measurements, with a staged plan and its first, riskiest part
prototyped and timed in Chrome. Candidates; add any the data points to:

1. **GPU placement with a fixed topology:** the worker builds the outline's topology (pieces, corners, regions,
   band records) when it changes. The GPU places geometry each frame from the current particle positions, and fill,
   band and paint evaluate per pixel. Questions:
   - How often does the topology change mid-drag on def, muse_hash and fat?
   - What does each part cost on the GPU?
   - What did K1310's 2.7 ms assume?
2. **Algorithmic cuts to `frame()`** that don't depend on holds (s29's profile: growCFC, tailWalk, buildBorderC,
   regionsPhaseC, setupFrame).
3. **A per-frame deadline:** recompute up to a budget and carry the rest with a bounded lag. This changes what a
   drag looks like, so it's Levi's call: name what he'd see.
4. **A mix:** for example, 2 for the worker's rate and 1 for the drawn frame.

For each candidate, give the projected desktop p50 / p95 and Pixel p50, and what the look loses, if anything.
Also project two bars:
- the gate as written;
- a fallback in case Levi relaxes it: the outline redrawn at the physics rate on desktop, and at half of it on
  the Pixel.

## Done

1. A table, from measurement where you can and projection where you can't, labelled which is which. For each
   route: its stages, the time each stage reaches, the risk and what the look loses.
2. **The chosen route,** with its first stage's riskiest part prototyped under `.claude/probes/K1247/`
   (`k1247s35_*`, not in `src/`) and timed in Chrome on desktop under the perf lock, against the projection.
3. **Levi's questions,** if any: looks only, each with a picture or a clip path.
4. Written into this brief's handoff: the table, the route, the next stage's brief outline, and what you'd stop
   doing (K1247's incremental flags and options: keep, or remove).

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view images.
  Junction `node_modules` from the main checkout; never `npm ci`. Keep any copy of master's code outside `src/`.
- **Files:** no edits in `src/` this stage; prototypes and tools go under `.claude/probes/K1247/` (`k1247s35_*`).
  Others are working in `outline.ts`'s builders, the band files, `rec_glsl.ts` and `paint.ts` (K1314 s13), and
  `draw.ts`, `fill_tri.ts` and `chain_frame.ts` (K1341 s3, Muse).
- **Untracked inputs** (drags, scenes) are in the main checkout's `.claude/probes/`; copy what you need and never
  write there. s18's drags: `.claude/probes/K1247/out/s18/`.
- **Commits:** WIP on your branch at each milestone. `git add -f` for tools, never for outputs. Never push, never
  edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Agents share the lock, so expect waits. Mark any number taken under load.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at each
  milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. A Done that looks
  out of reach is not a stop: spend the time on the most promising candidate. Then commit WIP, append a handoff
  to this brief with your start and stop times, and report. Neither a compaction nor context size is a stop;
  after a compaction, re-read this brief and `git log`.

## Report

Under 30 lines:
- the table;
- the route and why;
- the prototype's timing against its projection;
- Levi's questions;
- your last SHA.

End with `Ledger items` and the handle fields for K1247.

## Handoff (s35, agent a8d93842; start 2026-11-12 18:13 PT, stop 19:04 PT)

**Verdict.** Nothing measured or projected reaches the gate as written (desktop def worker <=3 / 6 ms per
update) except a per-frame deadline (R3, a look change) or moving the SOLVES to the GPU (R5, unmeasured, the
largest rewrite). Chosen: the mix R4. A POOL of outline workers comes first (rate now, no look change, a small
change in `src/`), then GPU placement with the fixed topology (R1) and frame() cuts (R2) inside the pool. On
desktop it reaches the FALLBACK bar: today the pool measures 83-96% of 60 Hz on def and fat at K=4-5, and 60 Hz is
projected with R1. On the Pixel the fallback is reached only with R1 + R2, and that is projected. Stop building the
incremental frame.

### The topology mid-drag (measured: Node, `k1247s35_topo.ts`, s18's drags at sub=10, about 60 Hz)

| | def | muse_hash | fat |
|---|---|---|---|
| frames / diagram pieces | 281 / 2902 | 231 / 2746 | 331 / 1712 |
| piece set changes; band relayouts | 0% ; 0 | 0% ; 0 | 0% ; 0 |
| region / face signature changes | 0% | 13.9% | 13.3% |
| corner ok flips | 66.8% | 54.3% | 0% |
| point-count changes (pieces p50 / p95) | 99.3% (62 / 164) | 88.7% (101) | 100% (125 / 740) |
| band layout-mode changes | 67.9% | 67.8% | 13.3% |
| band quads CPU-padded; fill vertices CPU-placed | 12.0%; 23.9% | 28.1%; 29.0% | 0%; 4.8% |

The piece set and the band layout are fixed per diagram. Regions are fixed on def and change on 13-14% of frames
on muse_hash and fat. What changes on every frame are parameters: point counts, corner presence and the band's
per-piece mode. So for R1, "fixed topology" means a fixed piece and region skeleton with padded per-piece
capacities, where the counts and corner presence are inputs to each frame. That is what the band records already do.

### K1310's 2.7 ms

K1310 assumed 0.61 ms of tangents and 2.12 ms of moving-end solves. The 2.12 ms came from a synthetic microbench:
8 frameAt calls per end, unseeded, over 5450 ends, about 0.39 us per end. It did not measure z or the per-frame
searches (moving ends, the band restructure, 16600 tail borders).

Measured instead:
- **The corners phase** costs about 18 us per corner (10.0 ms / 563 corners on def, s29), about 45x the assumption.
- **The solves** (setup 2.9, borders 6.4, corners 10.0, crossings 2.2, eyes 1.0, tailWalk 6.4) are about 29 ms of
  frame()'s 38. So GPU placement alone (R1) lands near 31-43 ms per update, not 2.7.
- **GPU placement itself** is cheap on the desktop: s25's per-column band pass reads 0.95 ms against a 0.94 ms
  empty timer query.

### The routes

M = measured, P = projected. All times are ms per update, desktop def. The Pixel is projected at 1.7x desktop
(K544). Projected p95 = 1.2x p50, the bench's K=1 ratio. The fallback bar is 60 Hz on desktop and 30 Hz on the Pixel.

| Route | Stages | Desktop p50 / p95 | Desktop rate (def) | Pixel p50 | Gate | Fallback | Risk | Look loss |
|---|---|---|---|---|---|---|---|---|
| R0 today | 1 worker | 65-66 / 76-79 M (bench); 105-117 M (app, loaded) | 14 Hz M (bench); 9-10 Hz M (app) | ~110 P | no | no | - | - |
| R1 GPU placement, fixed topology | the worker keeps the solves (~29) plus parameters (2-4); the GPU places fill, band and z | 31-43 / 37-52 P | 23-32 Hz P | 55-73 P | no | no, alone | high: fans, disks, tails, arcs and z all move to the GPU, while K1314 s13 rewrites the builders | none, if (b) holds |
| R2 frame() cuts | skip regions when unchanged (-3.6), warm tailWalk (-5), warm growCFC (-4) | 50-60 / 60-72 P (frame 38 -> 22-25) | 17-20 Hz P | 85-100 P | no | no | medium: s5-s7 already tuned growCFC | none |
| R3 deadline B | recompute up to B ms and carry the rest | B (3) by construction P | 60 Hz P | B P | time only | yes | medium | today: tears at fresh/stale joins, healing in 72/B updates (0.4 s at B=3). On R1: cut ends, fillets and tails lag up to ~8 frames (130 ms) P. Levi's call |
| **R4 pool (stage 1)** | K workers, the newest scene to an idle one, replies in id order | K=4: 78-81 / 94-98 M; K=5: 81-86 / 105-113 M | K=4: 45-46 Hz M; K=5: 50-52 Hz M; fat 57 Hz M; muse_hash 33 Hz M | 15-22 Hz at K=2-3 P | no: latency 84-89 M | desktop: fat 96%, def 83-87%, muse_hash 55% M; Pixel no P | low: one dispatch | none; latency 84-89 M vs the app's ~105-117 today |
| R4 + R1 | the pool over R1's worker | 31-43 / 37-52 P | 60 Hz at K=2-3, latency 35-50 P | 55-73; 30 Hz at K=2-3 P | no | desktop yes P; Pixel borderline P | high (R1) | none |
| R4 + R1 + R2 | | 15-20 / 18-24 P | 60 Hz at K=1-2 P | 25-35; 30 Hz at K=1-2 P | no | yes P | high | none |
| R5 GPU solves | corners, borders, crossings and tails solved on the GPU | <=3 only if all of them move (P, unmeasured) | | | maybe | yes | very high: tailWalk is sequential, and WebGL2 has no compute | none, if exact |

### The prototype: the pool (Chrome 158, desktop, under the perf lock)

**Setup.** The files are `k1247s35_pool.html` and `.mjs`, driven by `k1247s35_cdp.mjs` and run by
`k1247s35_pool_locked.ps1`.
- The worker is the app's own `outline_worker.ts`, bundled unchanged (a vite lib build, minified), in K workers.
- The input is s18's capture frames, played ping-pong at 60 Hz with the records on.
- The bench uses sub=1. Lerped sub-frames trigger "run count changed" restructures that real scenes don't: 2 per
  pass on def at sub=10.

**Runs.** Three runs on def:
- 18:33, quiet;
- 18:54 and 18:56, one in each K order. Another agent's node used 1.3-1.6 cores during these, so they are lightly
  loaded.

| K | rate Hz | interval p50 / p95 | worker ms p50 / p95 | latency p50 / p95 | dropped (8 s) | structure ms |
|---|---|---|---|---|---|---|
| 1 | 14.1-14.4 | 68-69 / 81-83 | 65-66 / 76-79 | 68-69 / 81-83 | 0 | 466-507 |
| 2 | 23.1-26.8 | 37-40 / 59-81 | 70-77 / 85-107 | 73-75 / 89 | 0 | 517-530 |
| 3 | 34.9-37.1 | 25-28 / 46-51 | 74-78 / 87-93 | 77-78 / 90-91 | 3-7 | 590-658 |
| 4 | 45.0-46.1 | 19-21 / 41-42 | 78-81 / 94-98 | 82-84 / 99 | 5-15 | 682-737 |
| 5 | 49.6-52.1 | 18 / 35-42 | 81-86 / 105-113 | 84-89 / 105-112 | 22-23 | 812-863 |
| 6 | 48.1-49.0 | 18-19 / 41-44 | 97-100 / 134-138 | 98-101 / 126-134 | 41-47 | 935-1156 |
| 8 | 40.9-45.0 | 21-22 / 46-52 | 130-134 / 170-193 | 131 / 155-164 | 78-100 | 1185-1210 |

The other drags, lightly loaded:
- **fat:** K=1 is 22.5 Hz at 41.8 ms per update. K=4-5 is 57.4-57.6 Hz, with intervals of 17 / 29-30 and a
  latency of 49 / 60-62.
- **muse_hash:** K=1 is 9.6 Hz at 98.7 ms. K=4 is 28.9 Hz. K=5 is 32.9 Hz, with intervals of 25 / 68 and a
  latency of 136 / 175.
- **Main's post** (a structured clone of the scene) costs 0.8-0.9 ms p50 and 1.6-1.9 ms p95 at K=5.

**Against the projection.** Before timing, I projected K=5 at 60 Hz, with per-update cost +15% and latency about
80 ms. Measured: 50-52 Hz, +24-33% (81-86 ms against 65) and 84-89 ms of latency. The rate missed by 13-17% for
two reasons:
- the contention is higher than I assumed;
- 5% of replies arrive out of order and are dropped.

The bench posts at most 60 scenes a second (one per tick), so its "about 61 updates/s ceiling" is partly that cap.

**The contention is the machine's, not Chrome's.** `k1247s35_contend.mjs` runs the same bundle in K Node
worker_threads with no input cap. Def, under the lock, with the same light load:

| K | per-update ms p50 | total updates/s |
|---|---|---|
| 1 | 67.5 | 13.2 |
| 2 | 76 | 23 |
| 4 | 82 | 43 |
| 6 | 100 | 51 |
| 8 | 154 | 44 |
| 12 | 344 | 32.5 |

- GC is 8-16% of wall time.
- A 128 MB young generation helps by 9-15% (61.5 ms at K=1, 131 at K=8) but does not change the curve's shape.

Throughput peaks at 6 workers on 12 cores, then falls. I infer the update is memory- or cache-bound: the falloff
does not match a core limit, and GC is too small a share to explain it.

What this means for the pool:
- On this desktop the useful width is 4-5 workers.
- Less work per update (R1, R2) shortens each update and also lowers the memory traffic that caps the width.
- The Pixel's width is unknown (projected 2-3).

### The route

R4, in stages:
1. **s36: the pool in the app.** Rate now, no look change. Outline below.
2. **R1: GPU placement with the fixed topology**, part by part. Start with the fill's 24% CPU-placed vertices and
   the band's 12% padded quads, and re-measure each part in the pool.
3. **R2's cuts.**
4. **If the gate stays at 3 ms:** R3's deadline on top of R1, which is Levi's call with a clip, or R5.

Why:
- **The pool moves what Levi sees now.** Def goes from 14 to 45-52 Hz and fat to 57 Hz, and latency drops below
  today's app. The risk is low and nothing in the look is lost.
- **R1 and R2 compound inside the pool.** They cut the work per update, which shortens latency and widens the pool.
- **Nothing reaches 3 ms per update without a deadline or GPU solves.**

### Next stage's brief outline (K1247 s36: the pool in the app)

- **Dispatch** (outline_app.ts, around line 1720): K workers, each with its own OutlineModel and structure. The
  newest scene goes to any idle worker, and a reply applies only if its id is newer than the last applied.
- **K:** from hardwareConcurrency, capped at 4. Measure K = 3, 4 and 5.
- **Structure:** worker 0 builds first and serves, and the others build after its first reply. Building on all K
  at once takes 812-863 ms at K=5, against 466-507 at K=1 and the 410 ms bar.
- **Main's budget:** the post (0.8-0.9 ms) and the upload (1.6-2.2 ms per reply, s34) now land on most frames,
  against the 8.5 ms mid-drag bar. Send the scene as transferable typed arrays. Measure main frameMs p50 / p95.
- **Restructures:** each worker restructures on its own diagramKey change or throw. Remove the KF_INC options and
  `exact` first.
- **Heap:** measure the heap of the K models.
- **Checks:**
  - An app ABBA, pool against master, on def, fat and muse_hash under the perf lock. Record reply rate,
    interval, latency, main frameMs, structure time and heap.
  - (b): the drawn table must be unchanged.
  - The Pixel at K = 2 and 3, run by an agent allowed on the phone.
- **Levi's clip:** a pooled def drag next to master's.

### Stop doing

- **The incremental frame** (s30's remaining stages). Its ceiling misses the bar. Under a pool, each model sees only
  every Kth frame, so frame-to-frame reuse shrinks.
- **The KF_INC flags** (snap, cache, jlocal, jx, jxw, span, jxa), SNAP_DBG and the request's `exact`: remove them,
  in their own commit once K1314 s13 has landed in outline.ts. In s34's ABBA they cost def +24.8 ms; the cascade
  drives about 100% of spans dirty; and the gentler holds fail (b).

### Levi's questions

None this stage, because the pool changes no look. Stage 36 asks one, with a clip: is an outline redrawn at about
50 Hz and trailing the threads by about 85 ms on def good enough? If so, that is the fallback bar. If not, the
3 ms gate stands, which leaves R3 (its tears need their own clip) or R5.

### Notes

- **The shared node_modules (main checkout) broke at about 18:34.**
  - Observed: `@puppeteer/browsers` is missing. Vite fails with "Cannot find native binding": at 19:03
    `@rolldown/binding-win32-x64-msvc` held its .node file but no package.json.
  - Inferred cause: an npm install after d3ecf45d's happy-dom bump. [Coordinator, 19:10: wrong. The cause was
    `git worktree remove` on Muse's K1341 s3 worktree at 18:34. It followed a junction nested in that worktree's
    probe output into the main `node_modules` and deleted five scoped packages, `.bin` and
    `.package-lock.json`. Restored from the lockfile's versions at 19:06; npm test green at the s35 merge.]
  - I left it untouched. `k1247s35_cdp.mjs` drives Chrome without puppeteer, and `nobuild=1` reuses the worker
    bundle built at 18:33:49 from this branch's src.
- **Tools (tracked):** `k1247s35_topo.ts`, `_pool.html`, `_pool.mjs`, `_cdp.mjs`, `_pool_locked.ps1` and
  `_contend.mjs`.
- **Outputs (untracked):** `out/s35/` (topo_*, pool_*, contend_*).

# K1247 stage 30: the path to the speed gate

Ledgers: K1338 (this: frame and band), K1247 (the frame cost; s28 runs on fill and zChains), K1310 (the
course check: speed first), K1240 (the redesign). One Claude Opus agent in its own worktree, on its own branch
from master. Cap 2 h. Read first: the Speed table in `docs/design/K1240_gate.md` and the handoffs at the end of
`docs/design/K1247_s29_frame_band_speed.md` and `K1247_s21_structure_cost.md`.

## Why

The gate wants the outline's work per moved frame at <= 3 ms p50 / 6 ms p95 on desktop def mid-drag and
<= 16 ms p50 on the Pixel. After s29 (1463742d) the def worker frame is about 138 ms p50: frame 58.5, fill 38,
band 17.6, zChains 16.6, paint 3.9. s29's tuning took 24 ms and found the rest spread thin (frameFast in Node:
growCFC 7.4, tailWalk 6.4, buildBorderC 6.4, regionsPhaseC 3.6, setupFrame 2.9, ...). Tuning will not close a
40x gap. K1310 projected a floor of about 2.7 ms only with every part GPU-placed and a fixed band topology. This
stage decides the route with measurements, before more tuning stages.

## Goal

A measured route from 138 ms to the gate, proven on the largest part. In order:

1. **What changes per frame.** On def and fat mid-drag (the bench's drag), per frame: how many chains,
   junctions, corners and pieces move by more than a sub-pixel at the app's scale, and how many of `frameFast`'s
   outputs actually change. If a drag moves a few percent, an incremental frame (recompute only what moved,
   carry the rest) is the route; if most of it moves, it is not.
2. **The browser's 1.75x.** s29 timed the same code at 58.5 ms in the worker against 33.5 ms in Node. Find why
   (build mode, deopts, GC, the worker's priority, the bench's load from other agents), and fix it if it is
   ours.
3. **A prototype of the route** on frame(): the incremental frame, or GPU placement, or what the data in (1)
   says, behind a flag, byte-identical to the full frame on the outline_port scenes (or, if it cannot be, the
   census no worse than master's), with its def cost measured.
4. **The plan:** a section appended to this brief that projects each part's cost on the route (frame, fill,
   band, zChains, paint), names the stages to get there in order, and says what the Pixel needs on top (its
   ratio to the desktop, from `.claude/probes/K1240/` or K156's last numbers if any).

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. (1) and (2) measured, with the tools committed under `.claude/probes/K1247/k1247s30_*`.
2. The prototype on a flag, default off unless it is byte-identical and faster, with a test that it matches the
   full frame on at least def and muse_hash across frames of a drag; its cost ABBA under the perf lock
   (`.claude/probes/K1247/k1247s29_abba*` or `.claude/probes/K1314/k1314_s10_bench.ps1`), master against the
   branch, flag on and off.
3. The plan section.
4. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json` from the main
   checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap. Done
holding early is not a stop while the prototype can still be taken further: use the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, scenes, benches) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there (the census's shared form B cache writes itself).
- **Your files:** `src/render/outline/outline.ts`, the band files (`band_gpu.ts`, `band_place.ts`,
  `band_rec.ts`), tests, and your tools and outputs under `.claude/probes/K1247/`. **K1247 s28** owns `fill_tri.ts`,
  `rec_glsl.ts`, `chain_frame.ts`, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts`,
  `src/app/frame_loop.ts` and `draw.ts`; if your route needs them, prototype in your own probe files or report it.
  **K1325** owns the census tools.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Agents share the lock, so expect waits; measure in Node where you can.
- **Stop** 2 h after your start (`Get-Date` at the start and at each milestone). Before stopping, run `Get-Date`
  and check that 2 h have really passed. Leave the last 25 minutes for the checks. Then commit WIP, append the
  plan and a handoff to this brief with your start and stop times, and report. Neither a compaction nor context
  size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Under 40 lines:
- what changes per frame mid-drag (def, fat);
- the browser's 1.75x: why, and the fix;
- the prototype: what, its cost against master, its identity check;
- the plan: each part's projected cost and the stages in order;
- your last SHA.

End with `Ledger items` and K1338's handle fields.

## Findings (s30, 2026-11-12)

Tools: `.claude/probes/K1247/k1247s30_*` (each header says how to run it); outputs (untracked) in
`.claude/probes/K1247/out/s30/` (`drag/` def, fat, muse_hash captures; `run/` and `run2/` the locked batches).

**(1) What changes per frame mid-drag** (captured drags interpolated to 60 Hz, sub 10; motion snapped at T 0.5
device px with commit semantics: a unit is recomputed when any point drifts past T from where it was last
committed; `k1247s30_dirty.ts`, `k1247s30_spread.ts`):

| per frame, p50 (p95) | def (92 chains) | muse_hash (86) | fat (6) |
|---|---|---|---|
| chains released by the snap | 5.4% (16.3%) | 12.8% (25.6%) | 33% (50%) |
| points in released chains | 16.3% (31.7%) | 19.4% (37.4%) | 76.8% (94.0%) |
| points in released 32-point spans | 3.8% (11.3%) | 7.1% (17.0%) | 9.6% (47.7%) |
| piece points that change, bit-exact | 33.5% (54.9%) | 39.4% (63.2%) | 86.7% (97.6%) |
| faces that change, bit-exact | 61% (81%) | 65% (83%) | 97% (99.5%) |
| piece points that differ point-wise, chain snap | 15.3% (28.8%) | - | - |
| the same, 32-point span snap (`span=32`) | 13.6% (27.7%) | - | 15.9% (46.6%) |
| whole changed pieces' points, 32-point span snap | 27.4% (47.0%) | - | 41.4% (77.9%) |
| piece points NEW (x,y absent from the piece's last version), chain snap | 11.4% (21.9%) | - | - |
| the same, 32-point span snap | 9.7% (16.4%) | - | 1.4% (8.0%) |

- Point-wise by index overstates the work: a released span that gains or loses a border point (a miter turned
  arc, `buildBorder`'s arc steps) shifts every index after it. Counted by set membership (`piecePtsNew`, the
  exact x,y missing from the piece's last version), the work at 32-point spans on def is 9.7% of piece points,
  2.6x the 3.8% released; at chain granularity 11.4%, 0.7x. Observed: `buildBorder` offsets each vertex from
  its own two segments, so a held vertex's own offset point cannot move. The 2.6x is untraced: the candidates
  are cut and corner points placed from the other thread's border at a crossing, corner rounding, and the
  vertices next to a released span. Fat's piece points are few (piecesCapsEtc 1.4 ms), so its 1.4% new is small
  in time too. Purity held throughout (`again:*` 0%). Files: `out/s30/run/spread_*_new.txt`.

- Spread: an exact incremental frame redoes about 2x the released points (pieces on held chains change where
  they meet released ones: on def 181 held-chain pieces a frame against 119 on released chains, but only 43 of
  them move more than 0.05 px; p50 0.004 px). frame() is a pure function of its input (the same scene twice gives
  the same table on every output), so exact caching is sound.
- The released share scales as about 1/T (def 32-point spans: 7.3% at 0.25 px, 3.8% at 0.5, 1.6% at 1 px).
- Per captured pair (~170 ms) on def: 14/92 chains move more than 0.5 px; no input is bit-equal frame to frame.

**(2) The browser's 1.75x does not reproduce on a quiet machine.** Observed: with total CPU at 3-5% (the `load`
step, before and after every batch), one minified bundle of OutlineModel.update (`k1247s30_engine.mjs`) on today's
captured def frames gives frame p50 35.4-36.0 ms in a Chrome worker, 35.8 on Chrome main and 43.3-44.7 in Node
(totals: worker ~64, Node ~88); cold (fresh Worker, no warm-up, one rep) the worker reads 36.0-37.4 and Node is
the slower engine (total 74-91, frame p95 up to 141). The app's own frame (ABBA, master 76e52b64) is 38.2: 1.07x
the engine worker. The coordinator's master numbers (worker 116, frame 65, fill 20, band 10, zChains 16, paint
3.3) are uniformly 1.4-1.7x today's quiet ones on the same code. Inferred, not tested: machine load during those
runs, not our code. Fix: measurement hygiene, not code. Every bench records the load (`k1247s30_run.ps1`'s `load`
step) and a loaded run is flagged; the shared benches should do the same (ledger item).

**(3) The prototype** (`outline.ts`, `KF_INC`, default off): `snap` holds every chain, crossing end and junction
arm whose motion is at most T px from its last committed value (and END-arm feet), and `cache` is an exact
per-chain border cache keyed on buildBorderC's real inputs. Identity: cache on = off on every frame of def
(281/281), muse_hash (231/231) and fat (331/331) at 60 Hz; `test/render/outline_inc.test.ts` pins it (ring
synthetic drag, def and muse_hash captured drags). App ABBA under the lock (`k1240s4b_bench.mjs`, A B C C B A,
drag p50): def master 72.05 / frame 38.2, flags off 70.65 / 37.65, flags on 67.2 / 34.65 (spreads <= 0.7: frame
-3.0 ms); fat 75.45 / 38.15, 76.55 / 38.8, 76.3 / 38.3 (no change; spreads up to 3.2). It stays off: the snap is a
0.5 px approximation of the input (the cache is exact given the snap). Node phases p50 (`run2/inc_*.txt`, raw ->
snap+cache): def corners 12.8, piecesCapsEtc 12.5, setupBorders 8.5 -> 5.5, regions 6.5, cutsEyesExposure 5.8
(frame 43.9 -> 42.5); muse_hash setupBorders 16.5 -> 7.4, frame 50.2 -> 43.0; fat cutsEyesExposure 15.5, regions
7.7, setupBorders 3.8, piecesCapsEtc 1.4 (frame 28.7 -> 29.3). The cache only touches setupBorders: corners and
pieces are next.

## Plan to the gate (s30)

Baseline: today's quiet master, def drag p50 (app ABBA): worker 72, frame 38.2, fill 13.9, zChains 9.85, band 6.9,
paint 2.15. On the coordinator's (loaded) scale multiply by about 1.6. Projections use the measured work shares
above (the work is assumed to scale with the new points; the per-phase split is unmeasured): whole changed
pieces are 33.5% of piece points at chain granularity, new points 9.7% (index-wise 13.6%) at 32-point spans.
The extra overhead (snap, dirty sets, the worker's own ~1 ms) is in the worker column.

| stage | what | frame | fill | band | zChains (crit. path) | paint | worker p50 |
|---|---|---|---|---|---|---|---|
| 0 | today | 38.2 | 13.9 | 6.9 | 9.85 | 2.15 | 72 |
| 1 | snap in OutlineModel.update, one dirty set for every part; snap <= 0.3 ms | 35 | 13.9 | 6.9 | 9.85 | 2.15 | ~68 |
| 2 | exact caches for frame's phases, chain granularity (closure = 33.5% of piece points) | ~14 | 13.9 | 6.9 | 9.85 | 2.15 | ~47 |
| 3 | zChains in a second worker (reads only the scene; same output) | ~14 | 13.9 | 6.9 | 0 | 2.15 | ~37 |
| 4 | 32-point spans, exact: a dependency map from each span to the outputs it reaches (9.7-13.6% of points) | 3.7-5.2 | 13.9 | 6.9 | 0 | 2.15 | ~28-29 |
| 5 | fill, band, paint per dirty span (never per face: 61-97% of faces change a frame) | 3.7-5.2 | ~1.4 | ~0.7 | 0 | ~0.2 | ~7-9 |
| 6 | zChains incremental in its worker | - | - | - | 0 (side ~1-2) | - | ~7-9 |

- Desktop gate 3 ms p50 / 6 ms p95: stage 5 lands at ~7-9 ms p50 at T 0.5, exact. The rest is, in order of
  certainty: tracing the 2.6x span spread to a tighter dependency map (if it reaches ~1x, frame ~1.5-2 ms);
  T = 1 px (halves the released share: ~4-5 ms; Levi's call, a look question with a picture); GPU placement of
  fill and band (K1310). p95 (16.4% new points, ~6.3 ms frame) needs a per-frame budget: a deadline scheduler
  that recomputes dirty spans up to the budget and carries the rest, with a bounded extra lag.
- fat: chain granularity is useless (77% of points); stage 4 first there (9.6% p50, 47.7% p95). Its frame is
  cutsEyesExposure and regions, so the crossing and eye phases must be per span too; its p95 needs the budget.
- A tolerance option (not byte-identical, census-gated): skip held-chain pieces moved under 0.05 px; on def it
  cuts the closure from ~300 to ~162 pieces a frame.
- Pixel (16 ms p50): the only measured CPU ratio is K544's 1.7x the desktop median (designs searched in a worker,
  2026-10-20); K1247_fast_frame.md's "several times slower" is unmeasured. At 1.7x the gate is ~9.4 ms of
  desktop work: stage 5's ~7-9 ms desktop is ~12-15 ms Pixel, under 16 but thin; the 2.6x trace or T = 1 px
gives the margin. On top it needs: (a) this code's own
  ratio (`k1247s30_engine.html` on the phone: the coordinator's run); (b) stage 6 before stage 3 ships there:
  a second worker may land on a little core (zChains 9.85 x 1.7 x ~2.5 = ~42 ms a frame would lag the drag);
  (c) a sustained 30 s drag for thermal throttling; (d) nothing for T, which is in device px on both (the
  bench's dsf 2 = the Pixel's 2x cap).

## Handoff (s30)

Start 09:36:11 PT; stop: see the report. Branch `worktree-agent-a644f27c6e57d73f2`; the ABBA builds were
62a74126 (flags off) and f806add8 (flags on), build-only commits on no branch. Next: stage 1 above (the snap and
its dirty set move into OutlineModel.update: s28's file), then stage 2 phase by phase, each with
`outline_inc.test.ts`-style identity on def, muse_hash and fat and a Node timing (`k1247s30_inc.ts`), and an app
ABBA (`k1247s30_run.ps1 -Steps load,def,fat`) at each stage.

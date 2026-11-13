# K1247 stage 34: holds per span

Ledgers: K1247 (this), K1352 (span-local L/Lcut), K1310 (speed first), K1240 (the redesign; the Speed table in
`docs/design/K1240_gate.md`). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.
Read first: the handoff at the end of `docs/design/K1247_s33_local_holds.md`, then `## Plan to the gate (s30)` in
`docs/design/K1247_s30_path_to_gate.md` (this is its stage 4).

## Why

s33 (merged at 1f17fb8c) measured the room and showed where it leaks:

- **The ceiling:** rebuilding only the output that moves more than 0.25 px takes the def frame from 36.97 to
  8.36 ms, muse_hash from 50.03 to 19.90 and fat from 22.97 to 12.18 (`k1247s33_ceiling.ts`).
- **Holds per chain hold nothing:** a moved crossing releases its partner chain, a blended chain counts as moved,
  and the release spreads through every crossing (dirty chains 100% at p50 on def, muse_hash and fat). The gentler
  rules hold more but break check (b): muse_hash 2.36 px at f63 near jj113, def 1.17 px at f41
  (`k1247s33_spread.ts`).
- **The snap's own cost:** the jlocal fixpoint costs 18.8 ms p50 / 88.6 ms p95 on def with the snap on.
- **K1352:** `reachOf` samples its partner by global arc length, so any change upstream on a chain shifts every
  sample after it. That is where s30 traced the corner misses.

The unit has to be smaller than a chain: a span moves, and only the spans and outputs within reach of it rebuild.

## Goal

Flags on (`KF_INC.snap`, `KF_INC.cache`) faster than master on the def drag by more than the spread, and fat no
slower, with checks (a), (b) and (c) passing. The technique is yours; s30's stage 4 is the outline:

1. **Span-local addressing (K1352)** first: L / Lcut and `reachOf` address a partner by span and offset, so an edit
   upstream on a chain no longer moves every sample after it.
2. **A dirty set per 32-point span:** a span is dirty when its snapped points change; a held span keeps its output
   even when another span of its chain moves. A crossing releases its partner's spans within reach, not the chain.
3. **A dependency map** from each span to the frame outputs it reaches (corners, pieces, regions), so only those
   rebuild.
4. **The snap's cost** to about 1 ms p50 (a grid for the release centres, only nearby crossings), and a p95 that
   stays bounded.

After each step, measure in Node (s33's tools) the dirty share against the ceiling and the frame time, and put
both in the report. If after step 2 the dirty share is still near 100%, find and name the cascade before building
step 3.

Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Identity:** caches on equal caches off, frame by frame, on def, muse_hash and fat (s31's test style in
   `outline_inc.test.ts`).
2. **The snap's checks** (a), (b) and (c) pass with the new holds, measured with s32's and s33's tools: (b) at most
   0.5 device px on every frame.
3. **Speed:** app ABBA under the perf lock (`.claude/probes/K1247/k1247s30_run.ps1 -Steps load,def,fat`), master
   against your branch, flags on and off. Mark any run taken under load. If flags on is faster than master by more
   than the spread on def, and fat is no slower, turn the flags on by default.
4. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json`, and
   `.claude/probes/K1247/out/s18/`, from the main checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`. Keep any copy of master's code outside
  `src/` (`paint_ring_lap.test.ts` scans every GLSL file under `src/render`).
- **Your files:**
  - `outline_model.ts`, `outline_worker.ts` and `outline_app.ts`;
  - in `outline.ts`: the frame drivers, `snapScene` / `frameSnapped`, `KF_INC`, the caches, the jlocal closure, the
    junction corner solve, `reachOf`, and the L / Lcut addressing;
  - tests, and your tools and outputs under `.claude/probes/K1247/` (name them `k1247s34_*`).

  Other agents own these files; stay out of them:
  - **K1314 s12:** `outline.ts`'s run, tail, corner-cap and fan builders, `runRootRamp`, `runEndFade`,
    `RUN_FADE_TIE`, `pinTailFan` and the fold functions, plus the band files, `rec_glsl.ts` and `paint.ts`.
  - `draw.ts`, `fill_tri.ts` and `chain_frame.ts`: fill, band and paint per dirty span are the next stage; if this
    one needs a hook there, keep it minimal and name it in your report.

  If a builder's signature has to change, keep the change minimal and name it in your report. Everyone keeps
  `outline_inc.test.ts` green.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Agents share the lock, so expect waits. Run the census with `-Lock` and hold no lock of your own around
  it. Measure in Node where you can.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at each
  milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave the last 25
  minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop times, and
  report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Under 30 lines:
- per step: what changed, the dirty share against the ceiling, the Node frame time;
- the hold and hit rates, the checks' numbers, and the ABBA by part with the load;
- the flags' default;
- what is left;
- your last SHA.

End with `Ledger items` and the handle fields for K1247 and K1352.

## Handoff (s34 agent, 2026-11-12, start 17:00:53, stop 18:08 PT)

Result: the snap fixpoint is 3x faster and bit-identical, but the hold still dirties about 100% of the scene, so
the flags stay OFF (`KF_INC.snap`, `.cache` false). K1352 (step 1) and the span-to-output map (step 3) were not
started: step 2's cascade, named below, has to be fixed first.

- **Step 4 first (2544f992, bit-identical on def, muse_hash and fat).** jlocal's `wAt` gets a squared-distance
  prefilter with a (1+1e-9) margin and a grid of centres; the jx sweep gets a worklist skip; the forced check is
  prefiltered. Snap p50/p95 ms: def 22.36/48.13 -> 7.15/11.43, muse_hash 13.12/23.08 -> 5.51/7.86, fat
  0.79/71.15 -> 0.61/6.53. Not 1 ms: the remainder is blending the whole scene, because nearly all of it is dirty.
- **Step 2, the dirty share against the ceiling** (`k1247s34_snap.ts`, rep 2, `out/s34/shares.txt`, ms taken under load):

  | drag | dirty spans p50 | ceiling p50 | span + jxa dirty p50 |
  |---|---|---|---|
  | def | 100% | 7.2% | 33.7% (but 69% of chains) |
  | muse_hash | 99.2% | 13.6% | 80.1% |
  | fat | 100% | 23.5% | 48.8% |
- **The cascade is jx + jxw.** A blended pass counts as moved and releases its partner. The partner's ramp then
  covers its other crossings, and so on through every crossing. `KF_INC.span` (f24e0728) releases only around a
  failing chain's moved points. `.jxa` releases a crossing only when its drawn point would sit more than
  jxaTol·T off the true one. Both are off by default.
- **(b) fails with span + jxa:**
  - muse_hash: f63 2.356 px, f67 2.142, f50 1.715 near jj113; 0.87 near jj58.
  - def: f41 1.258 near jj61.
  - With jR 8, muse_hash passes (0.467) but def fails (0.698).
  - With cache=0, muse_hash f63 is the same 2.356 px, so the caches are not the cause.
- **The f63 site** (`k1247s34_site.ts`, `SNAP_DBG`): within 30 px of the site, every point of the four nearest
  chains matches truth exactly (w 1). Crossing s is within 0.25 px and junction 113's arm s is exact. So the snap's
  output is exact near the site, and the 2.4 px comes from somewhere else.
  - Inferred, not tested: a non-local dependency in the frame. A run's width taper or fade is measured along its
    arc length, and that length includes held stretches elsewhere on the run (K1352's global s).
- **The checks with the default flags on in the tools:** `outline_inc` + `outline_port` 9/9.
  - (b) max: def 0.277, muse_hash 0.399, fat 0.232 px.
  - (a): none differ.
  - (c), census (`k1247s34_census.ts`, -Lock): no bar exists only in the snapped scene at def f80 or f244 (0 chains
    held there, so a weak check) or at muse_hash f26 (86/86 held). Bars per frame, true/snapped: 0/0, 1/1, 3/3.
  - `npm test` was green at 02371dde. tsc and the inc/port tests were green after the SNAP_DBG hook.
- **App ABBA, taken UNDER LOAD** (other agents' node processes at 99-148% of a core, plus my own census):
  - Ports: A = master 54637d48, B = flags off 02371dde, C = flags on af809d4f.
  - def worker means: A 104.2, B 144.65, C 167.95 (spread 74, so the middle passes were disturbed). On the first
    clean pass: A 107.4, B 107.3, C 131.7.
  - fat: A 117.6, B 113.95, C 122.35 (spreads 6-7).
  - Node book on def: off 92.02, on 102.76 ms (+10.75: snap 8.26, frame +2.28). Border-cache hits 7.4%, corner 6.9%.
  - Node book on fat: +2.42 ms; border hits 10.9%, corner 0.
  - C is slower than master on both drags, which is why the flags stay off.
- **Next:**
  1. Test the f63 inference: diff the model's per-run widths, fades and s ranges between the snapped and true scenes
     at f63, then find the run feature that reads far points.
  2. Then pick a hold rule that passes (b) without the jx/jxw cascade (span + jxa, plus whatever step 1 shows).
  3. Then K1352 span addressing and the span-level caches.
  4. Flip the flags on only when an unloaded ABBA shows C beating A on def by more than the spread, with fat no slower.

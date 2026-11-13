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

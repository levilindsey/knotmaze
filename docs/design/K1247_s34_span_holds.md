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

# K1247 stage 33: holds that pay (a local closure, span-local reach)

Ledgers: K1247 (this), K1352 (span-local L/Lcut), K1310 (speed first), K1240 (the redesign; the Speed table in
`docs/design/K1240_gate.md`). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.
Read first: the handoffs at the end of `docs/design/K1247_s32_snap_valid.md` and
`docs/design/K1247_s31_snap_phase_caches.md`, then `## Plan to the gate (s30)` in
`docs/design/K1247_s30_path_to_gate.md`.

## Why

s31 and s32 made the snap and the exact caches correct (checks (a), (b) and (c) pass), but they still don't make
frames faster. With the flags on, master's def worker goes from 70.85 to 75.95 ms (frame 37.95 to 41.95); fat goes
from 75.75 to 82.00. There are two reasons:

- **The junction closure is transitive.** A chain is held only while every junction it is an arm of holds whole. On
  maze links, one moving chain therefore releases them all: def holds 0 of 92 chains and muse_hash 0 of 86.
- **The bookkeeping costs more than the holds save.** fat has no junctions and holds 3 of 6 chains, yet it is still
  about 6 ms slower.

s30 measured that a def drag moves only 5.4% of chains and 16.3% of points at 0.5 device px. So the room is there,
but nothing captures it yet.

## Goal

Flags on (`KF_INC.snap`, `KF_INC.cache`) faster than master on the def drag, and fat no slower, with checks
(a), (b) and (c) still passing. In order:

1. **The ceiling first.** Before you build, measure how much a local closure could hold. Over the s18 drags (def,
   muse_hash), count the chains, corners and pieces whose output really changes from one frame to the next, against
   what the current closure releases. Then estimate the frame time if only the changed ones were rebuilt. This
   number decides how far the rest of the stage goes, and it goes in the report either way.
2. **The bookkeeping cost on fat.** Profile `snapScene`, the border keys and the cache copies, and cut them until
   flags-on is no slower than flags-off when nothing is held.
3. **Make holds local.** Hold a junction's arms only near the junction (s30's span granularity, plan stage 4), and
   address L and Lcut per span (K1352), so that one moving chain no longer releases its crossing partners. Corner
   hits were 38.8% on def and 19.1% on muse_hash, almost all lost to `reachOf` sampling partners.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Identity:** caches on equal caches off, frame by frame, on def, muse_hash and fat (s31's test style in
   `outline_inc.test.ts`).
2. **The snap's checks** (a), (b) and (c) pass with the new holds. Measure them with s32's tools
   (`.claude/probes/K1247/k1247s32_*`): (b) at most 0.5 device px on every frame.
3. **Speed:** app ABBA under the perf lock (`.claude/probes/K1247/k1247s30_run.ps1 -Steps load,def,fat`), master
   against your branch, flags on and off. Mark any run taken under load. If the flags-on run is faster than master by
   more than the spread on def, and fat is no slower, turn the flags on by default.
4. If (1) shows the ceiling can't reach a useful gain, report it with its numbers and stop there. That decision
   comes back to me.
5. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json`, and
   `.claude/probes/K1247/out/s18/`, from the main checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Your files:**
  - `outline_model.ts`, `outline_worker.ts` and `outline_app.ts`;
  - in `outline.ts`: the frame drivers, `snapScene` / `frameSnapped`, `KF_INC`, the caches, the junction corner
    solve, `reachOf`, and the L / Lcut addressing;
  - tests, and your tools and outputs under `.claude/probes/K1247/` (name them `k1247s33_*`).

  Other agents own these files; stay out of them:
  - **K1314 s11:** `outline.ts`'s run, tail and fan builders, `runRootRamp`, `runEndFade`, `pinTailFan` and the fold
    functions, plus the band files, `rec_glsl.ts` and `paint.ts`.
  - **K1341 s1:** `draw.ts`, `fill_tri.ts` and `chain_frame.ts`.

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
- the ceiling: what could be held, and the frame time it implies;
- what you changed: the bookkeeping cut, the local closure, the per-span reach;
- the hold and hit rates, the checks' numbers, and the ABBA by part with the load;
- the flags' default;
- your last SHA.

End with `Ledger items` and the handle fields for K1247 and K1352.

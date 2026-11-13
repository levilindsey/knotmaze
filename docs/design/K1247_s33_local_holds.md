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

## Handoff (s33 agent, 2026-11-12, 15:28:19 to 16:57 PT)

The checks were done by 16:57. That left 31 minutes before the cap, 25 of them set aside for the checks, so I stopped there.

Branch `worktree-agent-ab58662face0c6b64`. Tools are `.claude/probes/K1247/k1247s33_*` (committed). Outputs are in
`out/s33/` (untracked).

**The ceiling** (`k1247s33_ceiling.ts`, s18 drags, sub 10). This rebuilds only the output units that move past
eps. def's frame goes from 36.97 ms to 8.36 (eps 0.25) or 7.08 (eps 0.5); muse_hash from 50.03 to 19.90 or
16.32; fat from 22.97 to 12.18. On the input side at T 0.25, the chains released at p50 are:

| drag | own test | one-hop closure | transitive (s32) |
|---|---|---|---|
| def | 9.8% | 38% | 100% |
| muse_hash | 19.8% | 50% | 100% |
| fat | 50% | 50% | 50% |

The room is real.

**The bookkeeping cut** (measured with `k1247s33_book.ts`). On fat, the cost of the caches alone fell from +2.25 to
+0.51 ms frame p50. Two changes did it:
- border keys and entries no longer allocate (BInc klen and miss; buildBorderInc reuses its key and entry buffers);
- chainVersC reuses its aux buffer (CInc alen).

**The local closure** (`KF_INC.jlocal`). It is on by default now, but does nothing while the snap is off.
- A chain that passes its own test but has release centres recommits blended: `old + w·(true − old)`. w is 1 within
  jR·hw of a centre and ramps to 0 over jM·hw.
- Release centres are the junctions that are not whole, plus (jx) the crossings where the partner pass moved. jx is
  needed: without it, def f41's held chain 61 was 1.26 px off.
- A whole junction within 2R+M of a centre is released too (iterated).
- On blended chains, s is re-addressed (sNew in snapScene). Without this, sectionPaint's cuts shift and paintFrame
  throws "run count changed".

The checks all pass with it:
- **Identity:** `outline_inc.test.ts` 7/7 (both closures on def, muse_hash and fat; fat is the knot).
- **(a):** after update(exact), nothing differs on def or muse_hash.
- **(b):** max drawn px on def 0.277, muse_hash 0.399, fat 0.232. No frame is over 0.5 (`out/s33/checks/bX_*.txt`).
- **(c):** the census on def f80 and f244 and muse_hash f26 finds no bar that exists only in the snapped scene
  (`k1247s33_census.ts`, `out/s33/census/run.txt`).

**But it holds almost nothing** (`k1247s33_spread.ts`):

| drag | recommitted points p50 | dirty chains p50 | border hits | corner hits |
|---|---|---|---|---|
| def | 99.7% | 100% | 7.7% | 7.2% |
| muse_hash | 98.5% | 100% | 14.1% | 7.8% |
| fat | 100% | 100% | 11.1% | 0 |

jx causes the cascade. A moved pass releases its partner at the crossing, a blended pass counts as moved, and the
crossings connect the whole drawing.

The variants (KF_INC flags; the defaults are the passing rule):

| variant | def dirty p50 / border hits | (b) def | (b) muse_hash |
|---|---|---|---|
| jx off | 60.9% / - | 1.26 px (f41) | - |
| jxw off (a blended pass does not release its partner), jR 4 jM 3 | 71.7% / 35.7% | 0.341 | 2.356 (f63, near jj113) |
| jxw off, jR 1 jM 1 | 56.5% / 46.6% | 1.171 | 2.731 |
| jxs (a pass whose own s slid releases its own chain), jR 4 jM 3 | 59.8% / 43.7% | 0.617 | 2.356 (f63) |
| jxs, jR 1 jM 1 | 42.4% / 58.1% | 1.174 | - |

Only fat improves with jxs, at jR 1 jM 1: 50% dirty, 58.6% border hits, (b) 0.247.

**The ABBA** (`k1247s33_run.ps1`, log in `out/s33/run/abba.log`, run 16:40 to 16:46). Under load at the start: the
machine was at 19% total, with three node processes at 100% that were not this agent's. At the end it was at 6%.
- Ports: A = master ae86cce4, B = flags off 4ece0ac8, C = flags on 71dd1d60 (the passing rule).
- Worker p50 (A / B / C): def 72.90 / 73.05 / 97.70 (spread at most 2.5); fat 81.00 / 77.20 / 95.15 (spread up to
  3.7).
- def by part (A / B / C):

  | part | A | B | C |
  |---|---|---|---|
  | frame | 39.15 | 39.35 | 44.05 |
  | zChains | 9.85 | 9.80 | 10.40 |
  | fill | 13.65 | 13.85 | 15.20 |
  | paint | 2.10 | 2.20 | 2.35 |
  | band | 7.35 | 7.05 | 8.30 |

- fat by part (A / B / C):

  | part | A | B | C |
  |---|---|---|---|
  | frame | 41.80 | 39.25 | 41.50 |
  | fill | 15.85 | 15.80 | 16.20 |
  | band | 9.05 | 8.85 | 9.20 |

- Flags on lose by 24.8 ms on def and 14 ms on fat. On def, worker minus parts is 0.8 ms on master and 17.4 ms with
  the flags on.
- The snap itself takes most of that loss. I measured it in Node under the perf lock, with CPU at 12% at the start
  and 8% at the end (`k1247s33_book.ts` on def, sub 10, rep 2; `out/s33/book/def_final.txt`):

  | flags | snap p50 / p95 (ms) | frame p50 (ms) | total p50 (ms) |
  |---|---|---|---|
  | off | 0.02 / 0.03 | 40.18 | 85.97 |
  | on | 18.78 / 88.57 | 41.64 | 107.83 |

  The snap is jlocal's fixpoint over centres × crossings.
- The flags stay off by default (ed624182).

**Not done:** K1352 (L and Lcut per span; `reachOf` samples its partner by global arc length, which accounts for the
corner misses).

**Next** (pick one direction; neither fits in a stage alongside the other):
1. Per-span border caches, keyed on a span's committed points and its crossing cuts, so a blended span costs only
   itself. This makes jx's cascade cheap rather than global.
2. A release rule bounded by the error. jxs at jR 1 is the best hold so far. Fix its two faults first:
   - muse_hash f63 near jj113 (2.36 px; the jxw variant has it too);
   - def f41 (1.17 px).

   Diagnose them with `node scripts/run_node.mjs .claude/probes/K1247/k1247s33_diag.ts <drag> f=63 kf.jxs=true
   kf.jxw=false kf.jR=1 kf.jM=1`.

Either way, the snap's own cost has to come down from 18.8 ms p50 to about 1 ms (a grid for the centres, and only the
crossings near a centre) before any hold can pay. Then rerun the ABBA.

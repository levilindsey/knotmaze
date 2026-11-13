# K1247 stage 32: make the snap valid

Ledgers: K1247 (this), K1310 (the course check: speed first), K1240 (the redesign). One Claude Opus agent in its
own worktree, on its own branch from master. Cap 2 h. Read first: the Speed table in `docs/design/K1240_gate.md`,
`## Plan to the gate (s30)` in `docs/design/K1247_s30_path_to_gate.md`, and the s31 handoff at the end of
`docs/design/K1247_s31_snap_phase_caches.md`.

## Why

s31 moved the snap into `OutlineModel.update` (one snapped input and one dirty set for every part) and added an
exact corner cache keyed on chain versions. With both on, def's frame drops from 41 to 37 ms in Node (55 to 46 ms
in the app, under load). Without the snap every chain moves a little each frame, so no cache can hit. The snap stays
off by default because it fails two of its three checks:

- **(a) the rest frame.** The app sends only when positions change, so after a drag the last frame stays snapped
  (28.1 px off on def). `update(scene, true)` frames the true input exactly, but nothing asks for it. The fix is in
  `outline_app.ts`: an exact request once the last move has settled, or an id check in `onReply`. Today `onReply`
  clears `inFlight` with no id and uses the latest `sentMaps`, so an unsolicited worker reply would race.
- **(b) mid-drag error.** Drawn borders, snapped against true: def max 38.8 px, muse_hash 46.2. The cause is
  ill-conditioned self corners. Def's j83 (chain 31, θ 2.67) flips between solved and fallback within 0.5 px of
  input and moves its corner V about 38 px. s31 notes its pieces are zero-length arcs. Fat has no junctions and
  passes (max 0.43 px).

If that flip is visible, it is also a look bug: a plain drag through the threshold pops the same way.

## Goal

The snap on by default, with every cache s31 built on behind it:

1. **(a):** after a drag ends, the drawn frame equals the full frame on the true input, byte for byte, with no race
   between replies.
2. **(b):** mid-drag, no drawn point is off by more than 0.5 device px, snapped against true, on def, muse_hash
   and fat. Fix the corners' discontinuity where it is built: the solve and its fallback must agree where they
   hand over, or one rule must cover both. Then the corner moves continuously with its input. First show whether
   j83's flip is visible: crops of the true frames on either side of the threshold, at 4x and 8x. Never hide it,
   and never widen the 0.5 px check.
3. **(c):** a census of snapped mid-drag frames against true ones (written out as scenes, with form B for each)
   moves no bar find. Use the K1314 census tools as they are.
4. Turn `KF_INC.snap` and `KF_INC.cache` on by default only when all three hold. Otherwise leave them off and
   report which check failed and by how much.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Checks (a), (b) and (c)** with their numbers. For (b), the worst five frames' max error and where it is.
2. **Crops:** before and after for j83's flip and for every junction the corner fix changes at rest, form B | master |
   after at 4x and 8x, in `.claude/probes/K1247/out/s32/`. I view them before merging.
3. **Census at rest** (`.claude/probes/K1314/k1314_run.ps1 -Lock`) if the corner fix moves `outline_port.test.ts`'s
   pins: your branch against master's `census_k1344s1` (copy `.claude/probes/K1314/out/s1/census_k1344s1.*` from
   the main checkout: stray_ink 4, hard_edge 1, paper 0, broken_ink 12, k1049 0). No bar kind up, every moved find
   named with its crop. Re-pin and name the pins in the commit.
4. **Speed:** app ABBA under the perf lock (`.claude/probes/K1247/k1247s31_run.ps1 -Steps load,def,fat`, which
   records the load), master against your branch with the flags at their new defaults. Mark any run taken under
   load. No part slower than the run-to-run spread.
5. `npm test` green, golden snapshots unchanged, `outline_inc.test.ts` green. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json`, and
   `.claude/probes/K1247/out/s18/` and `out/s31/` from the main checkout first. They are untracked, so without them
   tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, scenes, drags) are in the main checkout's `.claude/probes/`. Copy what you need
  into your worktree and never write there (the census's shared form B cache writes itself).
- **Your files:** `outline_model.ts`, `outline_worker.ts`, `outline_app.ts`; in `outline.ts`, the `frame` /
  `frameFast` phase drivers, the `KF_INC` code and caches, and the junction corner solve and its fallback; tests;
  your tools and outputs under `.claude/probes/K1247/` (name them `k1247s32_*`). **K1346 s2** owns the fold
  functions stage 1 added to `outline.ts` (`pinBandLoops`, `trimFoldEnds`, `resweepPointArc`, `pinTailFan`,
  `cutTailLoop`, `cutTailHooks`), the tail and fan builders, `fill_tri.ts`, `draw.ts` and the band files. Stay out
  of those. If the corner fix needs one, keep the change minimal and name it in your report.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it. Agents share the lock, so expect
  waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at each
  milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave the last
  25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop times, and
  report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Under 40 lines:
- j83's flip: visible or not (crop paths), its cause, the fix and where;
- (a): the fix and the race;
- the checks (a), (b), (c) with numbers, and the flags' defaults;
- the worker frame by part, master against your branch, with the load;
- the census counts if it ran, and any moved find;
- what is left against s30's plan;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

## Handoff (stage 32 agent, 2026-11-12 13:47:07 to 15:25 PT)

Outputs in `.claude/probes/K1247/out/s32/` (untracked), tools `.claude/probes/K1247/k1247s32_*` (committed).
- **j83's flip: not visible.** `after/def_j83_f{13,14,26,27}_{4,8}x_ba.png` (form B | the true frame | snapped; at
  f14 8x true and snapped match and follow form B). Nothing to fix there.
- **(a) passes** on def, muse_hash and fat: after `update(exact)` no part differs from the true frame. The race:
  replies were not matched to requests, so a late snapped reply could replace the exact one and the app settled on
  it. Replies now carry an id and `exact`; the app drops stale ids, asks for an exact frame once nothing moves, and
  `settled` needs `shownExact` (76be9b7b).
- **(b) passes at T 0.25 with the junction closure `KF_INC.jclose`** (a chain is held only while every junction it is
  an arm of holds whole; no END-foot hold under it), stride 1: def max 0.290 px, muse_hash 0.399, fat 0.247, no frame
  over 0.5 (`checks/bG_*.txt`). The old error was the corner solve mixing held and released arms, the END-foot hold
  (muse_hash tails 1.19 px), and the corners and tails amplifying 0.5 px input holds.
- **(c) passes**: the census moves no bar find (`checks/c_census2.txt`).
- **The ABBA fails with the flags on**, so `KF_INC.snap` and `.cache` are OFF by default (54e25617; T 0.25,
  jclose on, border off). Flags on against master, p50 ms: def worker 75.95 vs 70.85, frame 41.95 vs 37.95; fat
  worker 82.00 vs 75.75, frame 42.10 vs 38.00 (`run_on/`, load 12% then 6%). Flags off: within the spread on
  every part (`run_off/`, load 22% then 8%).
- **Why it does not pay:** the closure is transitive over the junction graph, so on maze links one moving chain
  releases them all. def holds 0 of 92 chains at f5..f60, muse_hash 0 of 86 (86 at f30) (`checks/held_*.txt`).
  fat (no junctions) holds 3 of 6 and is still 6 ms slower, so the snap and cache bookkeeping costs more than the
  holds save.
- **Next:** make holds pay without breaking (b). That means a local closure (hold a junction's arms only near the
  junction, s30's span granularity, stage 4) and profiling the snap and cache overhead on fat (snapScene, the
  border keys). Then turn the flags on again behind the same three checks and the ABBA. s30's stages 3-6 remain.
# K1341 stage 1: exact cuts in fill and zChains

Ledgers: K1341 (this), K1247 (the speed plan), K1240 (the redesign; the Speed table in `docs/design/K1240_gate.md`).
One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the handoff at the end
of `docs/design/K1247_s28_fill_zchains_speed.md`.

## Why

On a quiet machine, master's def drag p50 is worker 72 ms: frame 38.2, fill 13.9, zChains 9.85, band 6.9 and
paint 2.15 (K1247 s30). K1247's stages are cutting frame. Fill and zChains are about a third of the worker, and no
one is working on them. s28 left three exact cuts:

- a squared pre-check before `nearRange`'s square root (`draw.ts` 624, zChains' hottest line);
- hinted searches in `spanOf` (`chain_frame.ts` 402, two binary searches per record column);
- a box lower bound in `fill_tri.ts`'s disk off-fan nearest-ring scan.

In s28's profile (`out/s28/prof/c10`, def), `fillFrame` is 1684 samples, of which its own body is 724: the disk
scan, the zero-fills, the tail's cumulative hypot and the corner arcs. zChains is 1295, led by nearScan 353 and
nearVisit 273.

## Goal

Make the fill and zChains parts faster on the def, muse_hash and fat drags, with output identical bit for bit. Start
with the three cuts, then take the next hotspots a fresh profile of the two parts shows. The technique is yours, but
every cut must be exact. Algorithm changes (coarser grids, GPU placement, a second worker) are later stages.

## Done

1. **Identity:** zChains' and fill's outputs are bit-identical to master's on every frame of the s18 drags (def,
   muse_hash, fat) and in all 12 census scenes. Compare digests, with `.claude/probes/K1247/k1247s28_digest.ts` or
   your own.
2. **Speed:**
   - A Node ABBA of the two parts, with GC time.
   - Then two app ABBAs under the perf lock (`.claude/probes/K1247/k1247s30_run.ps1 -Steps load,def,fat`, which
     records the load), master against your branch. Fill and zChains must be faster by more than the spread, and
     no other part slower than the spread. Mark any run taken under load.
3. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json`, and
   `.claude/probes/K1247/out/s18/`, from the main checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If one cut can't be made exact, drop it and take the next one.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Your files:** `draw.ts` (zChains), `fill_tri.ts`, `chain_frame.ts`, tests, and your tools and outputs under
  `.claude/probes/K1341/` (name them `k1341s1_*`). Other agents own these; stay out of them:
  - **K1247 s32:** `outline_model.ts`, `outline_worker.ts` and `outline_app.ts`, plus, in `outline.ts`, the
    frame drivers, `KF_INC`, the caches and the junction corner solve.
  - **K1314 s11:** `outline.ts`'s builders, the band files, `rec_glsl.ts` and `paint.ts`.

  Everyone keeps `outline_inc.test.ts` green.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Agents share the lock, so expect waits. Measure in Node where you can.
- **Stop** 2 h after your start (`Get-Date` at the start and at each milestone). Before stopping, run `Get-Date`
  and check that 2 h have really passed. Leave the last 25 minutes for the checks. Then commit WIP, append a
  handoff to this brief with your start and stop times, and report. Neither a compaction nor context size is a
  stop; after a compaction, re-read this brief and `git log`.

## Report

Under 30 lines:
- each cut: where it is and what it saved;
- the Node ABBA and both app ABBAs by part, with the load;
- the identity check;
- what is left;
- your last SHA.

End with `Ledger items` and K1341's handle fields.

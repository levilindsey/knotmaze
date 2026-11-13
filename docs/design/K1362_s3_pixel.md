# K1362 stage 3: the per-pixel look's numbers on the Pixel

Ledgers: K1362 (this), K156 (the phone round). One Claude Opus agent in its own worktree, on its own branch from
master. Cap 2 h. Read first: the stage 2 handoff at the end of `docs/design/K1362_s2_glsl.md`; "How the result is
judged" in `docs/design/K1362_s1_gpu_formb.md` (it holds here too); then `docs/design/K156.md`, the
"Round 2026-11-11" section and its handoff, for how the phone is reached and driven.

## Why

rp=gf (merged at 68baf0d1) draws the junction look per pixel on the GPU. On the desktop its pass takes 3.9 ms (def)
and 5.4 ms (muse_hash) when the GPU runs at full clock. In the app it reads 14-16 ms, which stage 2 believes is the
GPU idling at a low clock behind the 15-24 ms table build on main; the clocks were not read. Stage 2's Pixel figure
is an estimate (about 11 ms def, 16 ms muse_hash, from a 12x compute ratio), against the switch criterion of about
8 ms. That estimate is the number most likely to decide the route, so this stage measures it. Levi has left the
phone on its charger for the night for this.

## Goal

Measured Pixel numbers for rp=gf, each with the same measurement on the desktop beside it:

1. **The GPU pass at full clock,** on def, muse_hash and fat at rest. The phone has no timer query: time the pass by
   sync (`gl.finish()` or a 1-pixel `readPixels` after it), with passes run back to back so the clock is up, and
   an empty pass timed the same way and subtracted. Report the median and p90 of at least 30 timed passes, the
   pixels shaded, and the candidates per pixel. Then check the clock assumption: the same pass with one pass per
   frame (as the app runs it) on both devices. Say what the gap is, and whether the app can keep the clock up.
2. **The table build** (`src/render/gpu_field/tables.ts`) on the Pixel, at rest and through a drag if the kit
   can replay one, median and p90, and the Pixel/desktop CPU ratio. Also run
   `.claude/probes/K1247/k1247s30_engine.html` there, which K1247 s30 wrote for this ratio.
3. **The app's frame interval** on the Pixel under rp=gf, rp=outline and today's look, on the drags the kit already
   replays, if the time allows. This one is optional.
4. **A floor for the pass:** from the measured per-candidate cost and stage 1's floor (def 11.5, muse_hash 18.1
   candidates per pixel against stage 2's 18.7 and 30.4), the Pixel pass with candidates cut to the floor, and with
   the layering run once (stage 2: it can run 3 times). Mark these as estimates from measured parts.

## Done

1. The four numbers above in a table, Pixel beside desktop, with the load and the phone's state (temperature or
   throttling if the kit reads it).
2. A verdict in stage 1's three forms. A Pixel pass over 8 ms is not a verdict by itself: break it down (distance
   tests, layering, composite, fixed cost), give its floor, and name each fix with its expected effect.
3. The tools committed (`k1362s3_*` under `.claude/probes/K1362/`), the outputs in `out/s3/` (untracked).
4. `npm test` green and the goldens unchanged if you touched `src/` at all.

## Rules

- **The phone:** never wake it, unlock it, rotate it, or send it input, and never restart Chrome on it. Open and
  close only the tabs you create, through DevTools, the way the K156 kit does. Run `scripts/phone_pass.ps1 -Phase
  check` first; if the phone is not ready, wait inside one blocking command (poll every few minutes, up to 30
  minutes), and if it never is, do the desktop half and report. Take the phone lock
  (`.claude/probes/agents/phone_lock_take.ps1`, release with `phone_lock_release.ps1`) for the whole phone part.
  Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** tools and outputs under `.claude/probes/K1362/` (`k1362s3_*`), and a bench page there that imports
  `src/render/gpu_field/`. Change `src/` only if the bench cannot work without it (an export, a timing hook), and say
  why. No other agent is running.
- **Untracked inputs** (scenes, drags) are in the main checkout's `.claude/probes/`. Copy what you need; never write
  there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock** for the desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what); take it
  only to time and delete it after.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start, write the time
  into your first commit message, and run it at each milestone; before stopping for the cap, check that 2 h have
  really passed. Leave the last 20 minutes for the write-up. Then commit WIP, append a handoff to this brief with your
  start and stop times, release the phone lock, and report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- the table of numbers, Pixel beside desktop, with the method for each;
- the clock check's result;
- the floor estimates;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and the handle fields for K1362 (and K156 if the round's own steps moved).

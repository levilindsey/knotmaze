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

## Handoff (stage 3, 2026-11-12 23:29:48 to 2026-11-13 00:27)

Done; src/ untouched. Tools: `.claude/probes/K1362/k1362s3_*` (`run.mjs` builds the bench page from `entry.ts` +
`bench.html` and runs the desktop half; `phone.mjs` runs a cfg in the K156 pass's own tab; `gpuclk.mjs` samples the
Pixel's GPU devfreq `cur_freq` while `phone.mjs` runs; `sum.mjs` summarizes; `cfg_*.json` are the runs). Outputs:
`out/s3/` (untracked). Pass = 822x1506 (the Pixel's app canvas, fit 0.917), rp=gf at rest, timed by a 1-px readPixels
after the draw, 4 targets rotated (`sync4`), the empty variant's p50 subtracted; >= 40 passes per number. Desktop
under the perf lock (CPU 5-9%). Phone: thermal status 0 for every run but the clock run (status 1, skin 38.5 C).

**1. The pass (ms, p50 minus empty; phone p90 raw in brackets).** Shaded px: def 0.558M, muse_hash 0.575M, fat
0.556M; candidates per shaded px (per px with any): def 20.4 (26.2), muse 32.6 (38.6), fat 17.8 (24.7), identical on
both devices. Pieces per px: def mean 0.93, muse 1.33, fat 0.86; never over 4; corner candidates over 3 on 0.7% (def),
0.2% (muse) of px.

| scene | Pixel | desktop | ratio |
|---|---|---|---|
| def | 32.8 (34.5) | 1.20 | 27x |
| muse_hash | 42.6 | 1.70 | 25x |
| fat | 22.7 | 0.85 | 27x |

Breakdown, def, by cutting the program (variants `scan`, `keys`, `lay1`, `once`, `full`; phone / desktop): fixed
(empty) 0.97 / 0.10; scan (cells + distance tests) 4.5 / 0.28; keys, membership and corners 3.7 / 0.10; layers once
19.6 / 0.79; composite ~0 / ~0; layer repeats over the ramp configurations 7.1 / 0.05. muse: scan 7.1, keys 11.6,
lay1 34.8, once 34.1, full 44.3. **The layering's cost is the per-pixel arrays, not the work:** the same program with
the arrays sized MAXP 4 / MAXK 3 (`small`, same output wherever np <= 4 and corners <= 3) is def 21.1 (-37%), muse
26.4-27.1 (-39%) on the Pixel, -15% on the desktop; plus layering once (`smallonce`) def 19.3-19.6, muse 23.9-24.8,
fat 12.9-13.1; MAXP 2 / MAXK 2 (`tinyonce`, a footprint proxy that changes 0.1% of def's px and 3.7% of muse's) def
14.0, muse 16.8. An early out for simple px (np <= 1, no corner; 42% of def, 30% muse, 77% fat) saves nothing
(`skip1`: 33.3 vs 33.5 def, 21.6 vs 22.7 fat). Inferred, not observed: occupancy (register footprint) and divergence
set the cost. Resolution is sublinear (phone, def / muse): full 616x1130 24.4 / 31.3, 411x753 18.4 / 21.8; smallonce
14.0 / 16.9 and 9.5 / 10.5; tinyonce 9.5 / 11.7 and **6.9 / 7.3** (the only configuration under 8 ms).

**Clock check.** One pass per frame against back to back (`frame1` vs `sync4`, raw): Pixel full def 38.2 vs 33.8, muse
48.8 vs 43.5, scan 15.7 vs 5.3, empty 4.5 vs 1.05; desktop def 6.3 vs 1.3, muse 8.7 vs 1.8. Observed GPU clock (devfreq
`cur_freq`, 0.1 s samples, `out/s3/gpuclk_clk.json`): full sync4 1286 MHz median (p10 1017), full frame1 1094 (p10
499), scan sync4 1017 (p10 460), **scan frame1 460 flat**, scan with a busy main 460. The app cannot keep the clock up
for a short pass at one per frame: a ~5 ms pass reads 16 ms at 460 MHz (2.8x below the 1286 max). The long full pass
holds most of it. Caveat: the short variants' sync4 times may be partly under-clocked too, so the breakdown's small
parts may be overstated.

**2. Tables (CPU, ms p50/p90).** Rest, Pixel vs desktop: def 19.0/24.6 vs 13.0/14.7 (1.46x), muse 10.9/14.4 vs
5.9/10.1 (1.85x), fat 2.6/4.9 vs 1.9/2.3. Through the def drag (29 frames x 3): 18.0/21.4 vs 11.6/13.7 (1.55x); corners
are 12.3 of it on the Pixel (7.7 desktop); pack + upload 1.5 + 0.6. K1247 s30's engine probe on the drag (total p50/p95):
Pixel worker 60.2/92.0, main 91.5/104.0; desktop worker 60.8/71.6, main 61.0/71.3. **3. Frame interval:** not run.

**4. Floor (estimates from measured parts).** Candidates cut to stage 1's floor: about -0.8 def, -1.0 muse (the
distance tests' share of scan). Layering once: -7.1 with today's arrays (measured), -1.5 after the array fix.

**Verdict: reaches the gate only after these fixes**, at full clock, app size 822x1506 (def / muse, Pixel):
1. (b) arrays sized to need (MAXP 4, MAXK 3): measured -12.4 / -18; look unchanged except corner candidates past 3.
2. (b) layer once over the ramp configurations: measured -1.5 / -2.5 on top.
3. (b) a smaller per-pixel footprint (pack the 312 scalars, or split the pass in two): the tinyonce proxy measures
   -5.3 / -7 more; the real fix must keep the look.
4. (b) candidate cut to stage 1's floor: estimated -0.8 / -1.0.
Together about 13 / 16 ms, still over 8. 5. (a) fewer shaded px: dpr 1 (411x753) with 1-3 measured 6.9 / 7.3 (+1.0
fixed), a look change Levi must judge from a picture. 6. (c) the GPU governor: at the app's pacing a short pass ran at
460 MHz, so an 8 ms pass may read about 20 ms in the app; not measured for the fixed pass. 7. (b) the table build is
18 ms through a drag on the Pixel (corners 12.3): move it off main or cut corners.

**Next stage:** implement 1-3 in src/render/gpu_field/ with goldens unchanged, re-time on the Pixel with
`k1362s3_gpuclk.mjs` at frame1 and sync4, make the dpr-1 field picture for Levi, and move or cut the table build.

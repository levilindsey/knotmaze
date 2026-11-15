# K1369 stage 1: the Pixel's budget in motion under rp=gf (the intro's settle and a drag)

Coordinator brief, 2026-11-14. Background: `K1362_c1_cpu_off_main.md` (its "Pixel" section and handoff).

## Where it stands

- **Levi's targets (2026-11-14):** on the Pixel, 30 fps in motion is acceptable and 60 is better, and the intro's
  physics matters most: "Intro physics fps is probably more important."
- **c1's Pixel drag** (3 s CDP touch drag, `k1362c1_phone.ps1` / `k1362c1_drag.mjs`):
  - frame p50 is 33.3 ms under rp=gf against 50.0 for today's look;
  - the physics runs at sim/wall 0.29-0.32 under rp=gf against 0.62-0.71;
  - the physics worker steps about 790 ms per wall second under rp=gf against about 930, so a sim second costs it
    about 1.8x the CPU (estimates from frame sums);
  - the gf tables take 20 ms in the worker (12.5 on main, 9.8 on the desktop).
  - Neither the CPU clocks nor which core each thread ran on were recorded.
- **Even today's look is CPU-bound on the Pixel.** Its physics worker is about 93% busy mid-drag and still reaches
  only 0.65 of real time.
- **One table build at a time** (`gf_app.ts` `rebuild`): at 22.7 ms per build (export plus tables), rp=gf updates at
  most about 44 times a second on the Pixel.
- **No reveal in rp=gf:** `gf_app.ts` has no appearance-reveal code, and what the intro shows under rp=gf is unknown.

## Goal

Find out why the physics runs at half speed under rp=gf on the Pixel, and fix it. Measure the intro, since it is
Levi's first priority. The technique is yours. Hypotheses, none tested:
- the gf build worker and the physics worker contend for the fast cores;
- the scheduler moves the physics worker to a slower core;
- the CPU clocks drop under the GPU's load;
- the worker's allowances (`.claude/rules/physics-worker.md`) arrive differently at rp=gf's frame pacing.

## Done

1. **The motion table on the Pixel,** rp=gf against today's look, on def and one more link. Rows:
   - **the intro's settle,** from load until the sim sleeps, with `am=instant` and with the default appearance;
   - **c1's drag.**

   Columns:
   - frame p50 and p90;
   - sim/wall, and the time until the sim sleeps;
   - the physics worker's busy ms per wall second and per substep;
   - the gf build in ms, and main's ms per frame;
   - the GPU clock and every CPU core's clock (`/sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq`, sampled through
     the run);
   - if readable, the core each thread ran on (`/proc/<pid>/task/*/stat`).
2. **The cause, shown by an A/B that removes it** (for example, the table build paused, throttled or moved), or each
   hypothesis ruled out with its numbers.
3. **A fix, if the cause allows one:**
   - rp=gf's physics in motion at least as fast as today's look (sim/wall) on the Pixel;
   - its frame p50 no worse than 33.3 ms;
   - rp=gf stays off by default;
   - `npm test` green, the goldens unchanged (`byte_identity` included);
   - the tables digest (`.claude/probes/K1362/k1362t1_digest.ts`) bit-identical;
   - the pass still 0 px against the full program.
4. **What the intro shows under rp=gf:** desktop captures at three moments with `scripts/diag_screenshot.mjs`. Record
   it; do not build the reveal.
5. **A one-call Pixel runner** for the motion table.

## Rules

- **The phone:**
  - **When it is ready:** unlocked, the home screen (or Chrome) in front, untouched for 2 minutes. Levi may take it
    back at any time, and its screen turns off by itself.
  - **Order:** do the desktop part first. Wait at most 30 minutes per attempt (`scripts/phone_pass.ps1 -Phase start
    -WaitReady <min>`). The watchdog stops a run at a touch: rerun only what did not finish.
  - **Hands off:** never wake, unlock or rotate it, never press Home or send it any input, and never restart Chrome
    on it. Open and close only your own tabs, through DevTools.
  - **The lock:** hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each
    phone part, and release it between parts.
  - **K1362's queued run comes first:** the first time you hold the lock, run
    `pwsh -NoProfile -File .claude/probes/K1362/k1362s15_phone_run.ps1 -Cfgs p15b -WaitMin 30` before your own parts.
    Report its output path; don't analyze it.
  - **Privacy:** no device serials, IP addresses or Tailscale names in any tracked file, commit or report.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images. Junction
  `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting a directory, delete each
  junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:**
  - `src/render/gpu_field/gf_app.ts`, `gf_worker.ts`, `gf_build.ts`;
  - scheduling and instrumentation in `src/physics/worker_host.ts`, `physics_worker.ts` and `physics_worker_core.ts`,
    with the golden unchanged;
  - their tests;
  - `.claude/probes/K1369/` (copy the c1 tools from `.claude/probes/K1362/k1362c1_*`).
  - Untracked inputs are in the main checkout's `.claude/probes/`: copy them, never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start. No helpers.
- **Perf lock** for desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Hold it only
  while timing. If another owner holds it, wait inside one blocking command.
- **Stop:** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start (put the time
  in your first commit message) and at each milestone. A hypothesis that does not pan out is a result: record it and
  move to the next. Leave the last 20 minutes for the write-up: commit WIP, append a handoff to this brief with your
  start and stop times, release the locks, report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- the motion table, with its clocks;
- the cause, its A/B, and the fix with its before and after;
- what the intro shows under rp=gf;
- p15b's output path;
- your verdict on Levi's targets (30 and 60 fps in motion, the intro first) and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1369's handle fields.

## Handoff (K1369 s1, 2026-11-14)

Started 17:10:03, stopped 18:37 (claude session 01SUPGULDxvE5gKXozfaFaFG). No fix shipped; the cause is found.
Outputs are untracked under `.claude/probes/K1369/out/` (`motion_t1.json`, `motion_t2.json`, `motion_t3.json`,
`intro/sheet.png`, `desk_*.json`). Tabulate a run with `node .claude/probes/K1369/k1369_table.mjs <motion json>`.

### The motion table (Pixel; def = `b.FMKB4DIQ`, bj = `b.J`, c1's)

Three runs. t1: 16 cells back to back, thermal status 0 for the first five, then 1 (skin 36 to 42 C). t2: 6 cells,
each after an equal 246 s rest on about:blank (status 1, skin 38.9-40.1). t3: 4 drag cells after 150 s rests. Threads
are run / runnable-wait ms per wall second (schedstat), with the share of 500 ms samples on cpu6. Clocks are the
cell's p50 MHz: L cpu0-1 (max 2649), M cpu2-5 (3379), B cpu6 (4109), G the GPU (1286). Worker busy was 907-1001 ms
per wall second in every cell.

| cell | th/skin | frame p50/p90 | app fps | sleep s | sim/wall | ms/substep | main | physics | gf builds/s, lat ms, main ms/frame | L/M/B/G |
|---|---|---|---|---|---|---|---|---|---|---|
| t1 def today intro-i | 0/36.4 | 50.1/66.8 | 23.7* | 7.89 | 0.801 | 10.1 | 472/41 | 779/71 | - | 691/2169/4109/1286 |
| t1 def gf intro-i | 0/36.8 | 16.8/33.4 | 43.2* | 8.71 | 0.715 | 11.1 | 892/20 | 859/33 | 12.9, 31 | 960/3379/4109/748 |
| t1 def today intro-d | 0/37.3 | 16.7/66.7 | 41.4* | 7.60 | 0.718 | 11.4 | 671/31 | 899/63 | - | 787/3379/4109/1286 |
| t1 def gf intro-d | 0/38.3 | 16.7/33.4 | 42.2* | 8.51 | 0.672 | 11.7 | 880/21 | 912/28 | 12.7, 37 | 1440/3379/4109/883 |
| t1 def today drag | 0/39.1 | 66.7/66.8 | 16.6* | - | 0.552 | 14.0 | 383/80 | 759/172 | - | 533/394/3033/1190 |
| t2 def today intro-i | 1/38.9 | 50.1/66.8 | 17.8 | 9.60 | 0.628 | 13.0 | 464/38 | 789/74, cpu6 13/15 | - | 614/1804/2150/1286 |
| t2 def gf intro-i | 1/39.0 | 33.3/33.4 | 35.3 | 10.98 | 0.535 | 14.8 | 861/51 | 775/109, 14/19 | 12.0, 41, 1.17 | 1036/3379/2150/499 |
| t2 def gfc intro-i (cap 30 fps) | 1/39.2 | 16.7/33.4 | 30.2 | 10.96 | 0.529 | 15.1 | 774/53 | 765/108, 17/19 | 11.8, 35, 0.81 | 1152/3148/2150/691 |
| t2 def gfc drag (cap 30 fps) | 1/39.5 | 33.4/33.5 | 29.2 | - | 0.221 | 35.1 | 693/279, cpu6 12/12 | 310/683, 11/12 | 14.4, 38, 1.42 | 533/394/3033/1286 |
| t2 def gf drag | 1/40.0 | 33.4/50.1 | 26.5 | - | 0.198 | 39.0 | 691/281, 12/12 | 305/687, 11/12 | 12.6, 45, 1.49 | 787/394/2803/614 |
| t2 def today drag | 1/40.1 | 50.1/66.8 | 17.6 | - | 0.413 | 18.8 | 408/121, 12/17 | 658/280, 15/17 | - | 533/394/2803/1286 |
| t3 def gfq drag (cap 20 fps) | 1/39.1 | 16.7/16.8 | 20.8 | - | 0.430 | 18.1 | 499/165, cpu6 9/10 | 604/390, 9/10 | 12.2, 49, 0.59 | 691/1036/3340/460 |
| t3 def gf drag | 1/40.0 | 33.6/50.1 | 24.7 | - | 0.183 | 42.6 | 692/274, 12/13 | 323/663, 13/13 | 11.6, 45, 1.67 | 883/614/2496/1286 |
| t3 def today drag | 1/40.1 | 50.1/66.8 | 17.6 | - | 0.319 | 24.9 | 461/166, 14/15 | 597/398, 14/15 | - | 394/394/2323/1286 |
| t3 def gfq drag again | 1/40.5 | 33.3/50.1 | 19.9 | - | 0.203 | 38.0 | 631/219, 10/11 | 454/524, 10/11 | 10.8, 53, 1.21 | 883/1036/1843/460 |

\* rAF fps (t1 did not yet record the app's own frames). The other t1 cells, status 1 and hot, no rests (skin
40.9-42.4): bj drag today 0.202 (37.9 ms/substep, B 1689), gf 0.142 (54.1; physics on cpu0-1), gff (builds frozen)
0.186, gfr (frozen, redrawn every frame) 0.151, gft (builds on main) 0.150 at p50 83.5; and at B 921 every intro
sleeps in about 22 s whatever the look (bj today 0.250, gf 0.248; def gff/gfr/gft 0.241-0.257).

**The frame p50 under gf is not the motion on screen.** gf's pass redraws only when the tables or the camera change,
so the knot visibly moves at the build rate: 12-13 builds/s in intros and 9-14 in drags, each 31-73 ms after its
frame. Today's look redraws every app frame: 16.6-23.7/s.

### The cause

- **H4, the allowances: ruled out.** The worker was busy 907-1001 ms per wall second in every cell, so it never
  starved, and sim/wall is set by wall ms per substep alone. On the desktop (`k1369_desk.mjs`) both looks post
  0.98 s of allowance per wall second and sleep at 8.5-8.75 s.
- **H3, the clocks under the GPU's load: ruled out as a gf effect.** The GPU runs lower under gf (p50 460-883 MHz
  against 1190-1286), and the CPU clocks follow heat equally in both looks. Heat is the largest single factor: def
  today intro-i ran at 0.801 at status 0 and 0.25 once cpu6 was capped at 921 MHz. The Pixel reaches status 1 within
  three cells and does not cool below 39 C in four minutes, so a phone A/B needs equal rests and an order that
  brackets the heating.
- **H1, the builder: not the cause.** The builder worker (330-370 ms/s) runs on cpu0-5 and almost never on cpu6.
  Freezing the builds (gff) recovered only part of the hot bj gap, and redrawing every frame without builds (gfr) cost
  nearly as much as gf. Main stayed at 880-970 ms/s in all three.
- **H2, physics loses the fast core: the cause.** Main and the physics worker both run on cpu6. Main costs at least as
  much per frame under gf (`__knotPerf().totalCostMs` in the t2 intro and drag: today 26.4 and 27.6 ms, gf 26.0 and
  34.2; gf's own share is 0.8-1.5 ms). But today's
  frames are GPU-bound (p50 50 ms at the GPU's 1286 MHz cap) and gf's are not, so the on-demand loop runs about 1.7
  times as many frames under gf. Main goes from 408 to 691 ms/s in the t2 drag (464 to 861 in the intro). In the drag
  both threads sit on cpu6 (12 of 12 and 11 of 12 samples): together 996 ms/s, one core's worth. Physics runs 305 ms/s
  and waits runnable 687, while the mid cores idle at 394 MHz. When hotter (t1 bj), the scheduler moves physics to
  cpu0-1 instead, which is slower per ms. Main's 23 ms: `src/app/frame_loop.ts` still runs `scene.renderer.update()`
  (the ribbon renderer's whole CPU update), the fabric update and `app.render()` every frame under gf, although
  gf_app hides the ribbon's base and fillets (root children 0 and 1) and draws from its own tables. This part is
  inferred from the code, not profiled on the Pixel.
- **The A/B.** A 30 fps cap (gfc, gf_app's probe-only `cap` 31) changed nothing in drag. gf already ran 26-30 fps
  there, main stayed at 693 ms/s, and sim/wall was 0.221 against 0.198. In the intro it took main from 861 to 774
  ms/s and left sim/wall at 0.529 against 0.535. A 20 fps cap (gfq, `cap` 21, t3; order gfq, gf, today, gfq, after equal 150 s rests) brings main back to today's run per second, and physics back to today's share of cpu6. gfq ran 0.430 (main 499, physics 604/390 ms/s), gf 0.183 (692; 323/663), today 0.319 (461; 597/398).

The confound: cpu6's p50 clock fell through the run (3340, 2496, 2323, 1843 MHz). At 1843 MHz main's frame cost 32 ms against 24, so the second gfq ran 0.203 (631; 454/524). In every drag cell, main plus physics came to 1000-1100 ms/s, and physics got what main left. gf at 2496 MHz still ran below gfq at 1843.

The cap costs no visible motion: 12.2 and 10.8 builds/s under gfq against 11.6 under gf (latency 49-53 ms against 45). It is not a fix, though: the app's frame becomes 50 ms, against the 33.3 limit.

The builder thread is busy only 310-370 ms/s, at 26-36 ms per build. So the builds are not back to back, and the request/result round trip, not the build, sets the 12/s (inferred).

### The fix

None shipped. rp=gf stays off; src/ differs from master only by gf_app's probe-only knobs, which are off unless
`window.__knotGfOpts` sets them. `npm test` is green, buildTables and its imports are untouched, so the K1362 digest
inputs are unchanged. The next stage's lever is main's work per second under gf, in `src/app/frame_loop.ts` and the
ribbon renderer (outside this stage's files). Either skip `renderer.update()` (and whatever else gf does not draw)
while gf runs, or pace main's frames to the build rate. Either brings main's run back under today's and returns cpu6
to the physics.

### The intro under rp=gf (desktop, `diag_screenshot.mjs`, `out/intro/sheet.png`)

- gf draws the whole maze from the first frame, still in its unsettled lattice shape, while the loader shows.
- There is no trace or burn and no thread reveal, so the full maze stays visible throughout. At about 15 s the
  intro's trace FX ghosts on top of it.
- Today's look traces at 9 s, burns at 12 s, and from 15 s shows only the start and the finish.
- On a cold profile, gf_pass's synchronous compile freezes the loader for about 6.7 s (frame max 6675 ms against
  268). gf's first physics allowance comes 6.6 s later than today's.

### Other

- K1362's queued p15b run: `.claude/probes/K1362/out/s15/phone_p15b.json` and `gpuclk_p15b.json` (not analyzed).
- Rerun the phone (one call: check, lock, pass, cells, cleanup, release):
  `pwsh -NoProfile -File .claude/probes/K1369/k1369_phone.ps1 -Sha <commit> -Label <l> -Cells "def:today:drag,..."`.
  Use the env `K1369_COOL=37.5` and `K1369_COOLMAX=<s>` for equal rests; the Pixel never reaches 37.5, so each rest
  is the maximum.
  - Settings: today, gf, gff, gfr, gft, gfc (cap 30 fps), gfq (cap 20 fps).
  - Scenarios: intro-i, intro-d, drag. Links: def, bj.
- Desktop: `node .claude/probes/K1369/k1369_desk.mjs <url> <label> [gfOptsJson]`, under the perf lock.

### Verdict on the targets, and the next stage

- **Intro (Levi's first target):** gf's physics is 11-15% behind today's (sim/wall 0.535-0.715 against 0.628-0.801;
  sleep 8.7-11.0 s against 7.9-9.6). The motion on screen is 12-13 updates/s under gf (the build rate) against
  17.8-23.7 frames/s today. Neither look reaches 30.
- **Drag:** gf halves the physics (0.18-0.20 against 0.32-0.41) and shows 9-14 updates/s against today's 16.6-17.6.
  No look meets 30 fps in motion on the Pixel today, and 60 is far off. gf's frame p50 of 33.3 ms counts redraws of a
  stale picture.
- **Stage 2:**
  - Under rp=gf, stop main's per-frame work that gf does not draw: `scene.renderer.update()` and the rest of the
    ribbon pipeline in `src/app/frame_loop.ts`. That frees cpu6 for physics without a cap.
  - Then raise gf's visible rate toward 30/s by pipelining builds: start the next build when the last result lands, or
    keep two in flight. The builder is idle two thirds of the time.
  - Measure on the Pixel: ABBA order, equal rests, clocks beside every number (`k1369_phone.ps1`, then
    `k1369_table.mjs`).
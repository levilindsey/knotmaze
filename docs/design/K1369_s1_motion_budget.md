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

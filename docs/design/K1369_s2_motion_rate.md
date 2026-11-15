# K1369 stage 2: how often the knot moves under rp=gf on the Pixel

Coordinator brief, 2026-11-14. Stage 1's brief and handoff: `K1369_s1_motion_budget.md`.

## Where it stands

- **Levi's targets (2026-11-14):** on the Pixel, 30 fps in motion is acceptable and 60 is better, and the intro's
  physics matters most.
- **Stage 1** (Pixel, def; full table in its handoff):

  | Cell | Today's look: fps, sim/wall | rp=gf: builds/s, sim/wall |
  |---|---|---|
  | intro, am=instant, cool | 23.7, 0.80 | 12.9, 0.72 |
  | drag, warm | 17.6, 0.41 | 12.6, 0.20 |

  - rp=gf draws 26-43 frames a second, but the knot moves only when a build lands. Its extra frames redraw the same
    tables.
- **The cause:**
  - Main costs 24-34 ms of CPU a frame in both looks. Under gf it is not held back by the GPU, so it runs about 1.7x
    as many frames.
  - In the drag, main shares the big core (cpu6) with the physics worker. The physics worker waits 687 ms of each
    second while the mid cores idle.
  - Main still runs `scene.renderer.update()` (`src/app/frame_loop.ts`) every frame, though gf reads only part of
    its output: `chainSamples`, `borderColor`, and whatever the field export reads.
- **The build rate:** the gf builder is busy only about a third of the time. One build is in flight at a time
  (`gf_app.ts` `rebuild`), and main installs a returned build at its next frame, so the round trip sets about 12 a
  second (inferred).
- **The thermals:** the Pixel heats within three cells, and cpu6 falls from 4100 to 1800-2800 MHz
  (`.claude/rules/probes-phone.md`).

## Goal

Under rp=gf on the Pixel, the knot moves at least as often as today's look draws frames, in the intro and in the
drag, and the physics runs at least as fast (sim/wall). Then push toward 30 moves a second. The technique is yours.
Directions, none tested:
- skip the ribbon work gf does not draw, keeping exactly what gf and its export read;
- pipeline the builds:
  - start the next build the moment one returns, or keep two in flight;
  - or feed the gf worker the physics worker's snapshots directly (a MessageChannel), so that main only uploads;
- hold main to the build rate if that frees the big core. Stage 1's 20 fps cap A/B was confounded by heat; repeat it
  ABBA if it matters.

## Done

1. **A Pixel table, ABBA with equal rests** (`.claude/probes/K1369/k1369_phone.ps1`, extended as needed).
   - Cells: the intro with `am=instant`, the intro with the default appearance, and the drag.
   - Columns: stage 1's columns plus builds installed per second and touch-to-pixels latency, with the thermal status
     and every core's clock per cell.
   - The bar: in each cell, at a matched thermal state, gf's builds per second at least today's fps, and gf's sim/wall
     at least today's.
2. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - the tables digest (`.claude/probes/K1362/k1362t1_digest.ts`) bit-identical;
   - the pass program unchanged;
   - rp=gf stays off by default;
   - desktop main ms per frame no worse.
3. **A one-call runner** for the table.

## Rules

- **The phone:**
  - **When it is ready:** unlocked, the home screen (or Chrome) in front, untouched for 2 minutes. Levi may take it
    back at any time, and its screen turns off by itself.
  - **Order:** do the desktop part first. Wait at most 30 minutes per attempt (`scripts/phone_pass.ps1 -Phase start
    -WaitReady <min>`). The watchdog stops a run at a touch: rerun only what did not finish.
  - **Hands off:** never wake, unlock or rotate it, never press Home or send it any input, and never restart Chrome
    on it. Open and close only your own tabs, through DevTools.
  - **The lock:** hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for
    each phone part, and release it between parts.
  - **Privacy:** no device serials, IP addresses or Tailscale names in any tracked file, commit or report.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images. Never pipe a
  long-running command into `Select-Object -First` (it stops the command). Junction `node_modules` from the main
  checkout; never `npm ci` or `npm install`. Before deleting a directory, delete each junction inside it with
  `(Get-Item <path>).Delete()`.
- **Your files:**
  - the gf branches of `src/app/frame_loop.ts`;
  - `src/render/gpu_field/gf_app.ts`, `gf_worker.ts`, `gf_build.ts` and `gf_slice_worker.ts`;
  - a snapshot channel in `src/physics/worker_host.ts`, `physics_worker.ts` and `physics_worker_core.ts`, with the
    golden unchanged;
  - their tests;
  - `.claude/probes/K1369/k1369s2_*` (copy stage 1's tools as needed).
  - Untracked inputs are in the main checkout's `.claude/probes/`: copy them, never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start. No helpers.
- **Perf lock** for desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Hold it only
  while timing. If another owner holds it, wait inside one blocking command.
- **Stop:** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start (put the time
  in your first commit message) and at each milestone. A lever that does not pay is a result: record it and move to
  the next. Leave the last 20 minutes for the write-up: commit WIP, append a handoff to this brief with your start
  and stop times, release the locks, report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what main and the workers stopped doing, or do differently;
- the Pixel table, with the clocks;
- the checks;
- your verdict on Levi's targets (30 and 60 fps in motion, the intro first) and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1369's handle fields.

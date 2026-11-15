# K1369 stage 4: depth by gesture, and the physics-to-gf snapshot channel

Coordinator brief, 2026-11-14. Stage 3's brief and handoff (the Pixel table, the runner `k1369s3_phone.ps1`):
`K1369_s3_lean_default.md`; stage 2's: `K1369_s2_motion_rate.md`.

## Where it stands

- **Levi's targets (2026-11-14):** on the Pixel, 30 moves a second in motion is acceptable and 60 is better; the
  intro's physics matters most.
- **Stage 3** (merged at bbdb28d2): lean is rp=gf's default, and `DEPTH` stays 1. On the Pixel (def, ABBA, thermal 0-1):

  | Cell | today: fps, sim/wall | depth 2 (gf2l): builds/s, sim/wall | depth 1 (gfl): builds/s, sim/wall |
  |---|---|---|---|
  | intro, default appearance | 30.2-32.9, .675-.710 | 50.9-54.3, .694-.767 | not measured |
  | intro, am=instant | 17.8-18.0, .794-.840 | 52.4-53.4, .773-.795 | not measured |
  | drag | 17.6-17.7, .671-.707 | 40.3-43.6, .488-.505 | 19.4-20.6, .737-.807 |

  - At depth 2 in the drag, the physics worker waits for a core 239-335 ms per second (depth 1: 39-72), and a
    substep takes 15.5 ms instead of 10. Main, the physics worker and the gf worker are competing for cores
    (inferred, not isolated).

## Goal

Under rp=gf on the Pixel, the knot moves faster than today's look in every cell, with sim/wall at least today's:
- first, by choosing the depth by gesture;
- then, toward 30 a second in the drag, by taking main out of the path from the physics to the gf worker.

The technique is yours.

## Done

1. **Depth by gesture.** Depth 2 while no pointer is down, depth 1 during a drag (or a better rule the table
   supports).
   - The Pixel table gets depth-1 intro cells too, so the choice rests on measurements.
2. **The snapshot channel,** or the measured reason it does not pay.
   - The physics worker hands its state straight to the gf worker (a MessageChannel), and the gf worker samples the
     splines and builds. Main only installs and uploads.
   - Main still needs its samples for what it draws over gf: the markers, the yarn, fog and the pluck. Get them to
     main without a second sampling on main (for example, returned with the build).
   - The tables digest stays bit-identical: the gf worker's samples must equal main's `chainSamples` bit for bit.
     Prove it with a check like `k1369s2_lean.mjs`.
   - The physics worker's stepping is unchanged: `byte_identity` and the golden pass, and `phw=0` (the physics on
     main) still works with rp=gf.
3. **A Pixel table,** ABBA with equal rests, using the `k1369s3_phone.ps1` runner extended as needed.
   - Cells: today, the shipped setting, and any variant you need, in the intro with the default appearance, the
     intro with `am=instant`, and the drag.
   - Columns: builds installed per second, sim/wall, touch-to-install latency, the physics worker's wait for a core,
     the thermal status, and every core's clock per cell.
4. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - the K1362 tables digest bit-identical;
   - the pass program unchanged;
   - rp=gf stays off by default;
   - today's desktop main ms per frame no worse.

## Rules

- **Order:**
  - Do the desktop part of step 1 and commit.
  - Then the desktop part of step 2 and commit.
  - Then one phone run covering both. A phone run in between is fine if the phone is free.
- **The phone:** the same rules as stage 3's brief.
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt.
  - Hold the phone lock for each phone part.
  - No device serials, IP addresses or Tailscale names anywhere.
  - If the phone never comes free, ship what the desktop proves, with the depth rule off by default, and say so.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images.
  - Never pipe a long-running command into `Select-Object -First`.
  - Junction `node_modules` from the main checkout; never `npm ci` or `npm install`.
  - Delete junctions with `(Get-Item <path>).Delete()` before removing a directory.
- **Your files:**
  - `src/render/gpu_field/gf_app.ts`, `gf_worker.ts`, `gf_build.ts`, `gf_slice_worker.ts`;
  - the snapshot channel in `src/physics/worker_host.ts`, `physics_worker.ts`, `physics_worker_core.ts`;
  - the gf branches of `src/app/frame_loop.ts`;
  - the spline sampling, if the gf worker needs to import it (move it, do not copy it);
  - their tests;
  - `.claude/probes/K1369/k1369s4_*`.
  - Untracked inputs are in the main checkout's `.claude/probes/`: copy them, never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs.
  - Never push, never edit `LEDGER.md`, never touch the main checkout.
  - Never kill a process you did not start. No helpers.
- **Perf lock:** `$env:TEMP\claude-perf.lock` for desktop timings, one line (owner, start time, what), held only
  while timing. If another owner holds it, wait inside one blocking command.
- **Stop:** when Done holds or 2 h after your start, whichever comes first.
  - Run `Get-Date` at the start (put the time in your first commit message) and at each milestone.
  - A lever that does not pay is a result: record it and move to the next.
  - Leave the last 20 minutes for the write-up: commit WIP, append a handoff to this brief with your start and stop
    times, release the locks, report.
  - Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what changed;
- the Pixel table, with the clocks;
- the depth rule and why;
- the checks;
- your verdict on Levi's targets (30 and 60 a second in motion, the intro first) and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1369's handle fields.

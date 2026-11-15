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

## Handoff (stage 2 agent, 2026-11-14, start 18:43:33, stop STOPTIME)

**What changed: everything below applies only while rp=gf is attached.** rp=gf off runs the same code as before.
- **Gate** (189d38cf): while gf's builds are at depth, main skips `renderer.update()`, the ribbon pipeline gf does
  not draw. Desktop drag: main 930 -> 560 ms/s. `__knotGfOpts.gate = false` turns it off.
- **Depth** (`__knotGfOpts.depth`, default `DEPTH = 1` in `gf_app.ts`): builds in flight. Depth 2 roughly doubles the
  builds installed per second, but main rises back to about 890 ms/s.
- **Fans off** (695f19e9): gf switches off the joinery's fan rebuild while attached; its layer is hidden anyway. This
  saves about 7 ms of main per build on the desktop. `__knotGfOpts.fillets = true` keeps the fans.
- **Lean** (eb76b4d5, **probe-only**: `__knotGfOpts.lean`, off by default):
  - What it does: gf swaps the renderer instance's `computeGapSlot` for one that writes only diagData x, y from
    `ps.bindingPoint(crossing.over)`. That is the only gap output gf's gather reads (`slottedEmergent`'s dedupe).
    Emergent solves pass index -1, which writes nothing, and gated crossings are skipped before the call.
  - Exactness: `k1369s2_lean.mjs` compares chainSamples, tips and diagData x, y bitwise, at rest and frozen mid-drag
    (353 crossings, control 0). Exact.
  - Why it is not the default: the pluck footprint reads `eraseExtentPos` / `overHalfPos`, which only the full solve
    writes.
- **Not built:** the physics-to-gf snapshot channel (MessageChannel). The workers are unchanged.

**Where main's update() time goes** (desktop gf drag, ms per build, `k1369s2_attr.mjs`): gap solves 8.8, extrude
2.5, spline sampling about 6.9, fans 7.3 (now off); gf's gather 0.9 and install 3.0.

**Desktop A/B** (phone viewport 411x753 at DPR 2.625, link b.FMKB4DIQ, 2 reps ABBA, `k1369s2_desk.mjs`; JSON in
`out/s2desk_{fil,introd,lean}.json`). Today's rate is app fps; gf's is installs per second.

| drag | rate | main ms/s | sim/wall | touch -> install p50 |
|---|---|---|---|---|
| today | 34.3-37.3 | 923-933 | .564-.571 | - |
| gf | 18.2-19.5 | 462-467 | .583-.594 | 19-20 ms |
| gf2 | 36.7-38.1 | 848-890 | .544-.565 | 27-28 ms |
| gfl | 24.9-25.4 | 352-373 | .577-.584 | 19.5 ms |
| gf2l | 44.5-45.2 | 638 | .543-.547 | 22-23 ms |

- **Intro with the default appearance:**
  - today: 38.8-41.9 fps, sim/wall .565-.577;
  - gf: 20.8 / 20.7 installs/s, sim/wall .59;
  - gf2: 40.8 / 40.0 installs/s, sim/wall .567 / .565;
  - gfl: 25.5 / 25.5 installs/s, sim/wall .625 / .607, at 381-394 main ms/s;
  - gf2l: 42.2 / 43.5 installs/s, sim/wall .573 / .576, at 674-681 main ms/s. Paired with that run's today (40.1 /
    41.9 fps, sim/wall .566 / .577; `out/s2desk_introdl.json`), **gf2l passes this cell on the desktop.**
- **Intro with am=instant:** today 32.9-35.4 fps; gf, gfl and gf2l draw 53-54 fps.
- **Depth 2's sim/wall dip:**
  - Observed: in the drag, sim/wall at depth 2 sits 0.01-0.03 below today's (gf2l .535-.559 against .563-.566), so
    gf2l misses the drag bar on sim/wall alone.
  - Observed: the physics worker's ms per substep moves with it: gf2l 14.3-14.9, today 14.0-14.1, gfl 13.4-13.5.
  - Inferred, not isolated: two builds in flight compete with the physics worker for the CPU. The Pixel has fewer
    big cores, so check this there first.

**Pixel table:** PIXELTABLE

**Checks:**
- `npm test` green at b89f4e46: 237 files, 3018 tests. The goldens and `byte_identity` are in it. tsc is clean.
- The K1362 tables digest is bit-identical: 5446 lines, 0 differ, at 695f19e9. Since then only `gf_app.ts` and probes
  have changed.
- The pass program is unchanged: no diff to tables, `gf_glsl`, `gf_pass` or `gf_pack`.
- rp=gf is off by default.
- Today's desktop main ms per frame is unchanged: the today rows above match stage 1's.

**Next stage:**
1. **Make lean the default under gf.** Land it in `ribbon_renderer.ts` as a mode flag rather than an instance patch.
   Run the full solve whenever a pluck is live, so the footprint stays fresh. Keep `k1369s2_lean.mjs` as the gate.
2. **Run the Pixel table** for today, gf2l and gf2 (the runner call is below).
3. **Decide `DEPTH = 2`:** it wins on rate, but sim/wall dips.
4. **Then the snapshot channel,** so main only uploads.
5. **Residual:** after detach, a sleeping knot can show stale fans and gaps until its next awake update.

Runner call:
`$env:K1369_COOL = "37.5"; $env:K1369_COOLMAX = "120"; pwsh -NoProfile -File .claude/probes/K1369/k1369s2_phone.ps1
-Sha <sha> -Label <l> -Cells "def:today:intro-i,def:gf2l:intro-i,def:gf2:intro-i,def:today:drag,def:gf2l:drag,
def:gf2:drag,def:today:intro-d,def:gf2l:intro-d" -WaitReady 20`, then
`node .claude/probes/K1369/k1369s2_table.mjs .claude/probes/K1369/out/pass/motion_<l>.json`.

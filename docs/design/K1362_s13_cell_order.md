# K1362 stage 13: the layering resolved per cell, def under 8 ms on the Pixel

Coordinator brief, 2026-11-14. Stage 12's brief and handoff: `K1362_s12_corners_faces.md`. Stage 8's verdict
(`K1362_s8_intercept.md`, end) proposed this route; stage 9 (`K1362_s9_layer_tables.md`) was briefed on it and
measured only a one-piece skip (`fast`), which did nothing because it removed work, not state.

## Where it stands

- rp=gf is off by default. `GF_TIERS` (gf_pass.ts) is t32rlgyjfc3: a frame whose cells list no corners draws the
  tier with the corner code compiled out, other frames t32rlgyc3, each followed by the full program behind the
  stencil. On the Pixel (822x1506, sync4, 1286 MHz) def is 12.1 ms, muse_hash 17.0, fat 6.8. 0 px on the 12 scenes
  on both GPUs.
- Without the layering (`nolay`) def is 5.9-6.1, so the layering is about 6 ms and 8 ms needs it near 2.
- In-shader trimming has stopped paying on def. Stage 9 (surface cap) gave -17%, stage 10 (per-piece arrays) -10%,
  stage 11 (state folds) 0 and stage 12 (face loop shape, per-cell routing) 0. What paid every time was removing
  per-pixel state outright; packing, recomputing in hot loops, and loop-shape changes did not.
- Def's corner-free cells (55% of pixels) cost 5.7 ms alone and its corner cells 8.2: both halves pay the layering.
- Routing: the tier sends what it cannot draw to the full program through `discard` and the stencil. Scattered
  pixels sent to full cost far more than their share (MAXK 1 sent 2.7% of def and cost 3.75 ms); per-cell routing to
  a second tier was 3 ms slower; a per-frame program choice is free (stages 4, 11, 12).

## Goal

def at most 8 ms at 822x1506 on the Pixel, exact, by taking the layering's per-pixel sort and surface state out of
the tier. The technique is yours. The intended shape:
1. **Decide from the code what of the layering does not depend on the pixel within a cell or bin**: for example,
   the order of the cell's surfaces or faces, or which faces can bury which, wherever a conservative bound over
   the cell proves it the same for every pixel in it. Cells where it cannot be proved keep today's path.
2. **Measure the coverage before building the shader form**: with the CPU mirror on the 12 scenes, the share of
   inked pixels in cells whose order is proved. The tier keeps its cover today (99.81 / 99.9 / 100% on def /
   muse_hash / fat), so a cell that cannot be proved must still be drawn inside the tier (today's layering, or a
   per-frame program choice), not routed to full.
3. **Build the tier form that reads the cell's order** and holds no sort and no per-surface arrays where the order
   is proved. Bench it on the Pixel.
If step 2 shows the coverage cannot be high enough, write that result with its numbers (it is a finding, not a
failure), and spend the rest of the time on stage 12's next levers: an exact bound that skips faces that cannot
beat a surface's running maximum (ties kept), and the corner cells' own loops.

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32rlgyjfc3 is replaced only by a program
   faster on def, muse_hash and fat on the Pixel at 1286 MHz in one bench, with an `aid@` repeat when a gain is
   under 0.5 ms. A per-frame choice counts per scene: no scene slower.
   - 0 px and 0 unwritten against the full program on the 12 scenes on both GPUs, and the CPU mirror holds.
   - `npm test` green and the goldens unchanged.
   - Every existing table field bit-identical (the digest in `.claude/probes/K1362/k1362t1_digest.ts`). New tables
     are additive and built from the old ones in the gf build worker (`gf_build.ts`), and count only with their
     build cost (desktop and the Pixel's worker) and their bytes uploaded per rebuild. If an old field must change,
     stop and write the gate argument `K1362_t1_muse_tables.md` addendum 2 asks for instead.
2. The coverage table (step 2), the before/after table on the Pixel (def, muse_hash, fat at 822x1506 and
   1079x1977, sync4 and frame1, with the clock), the desktop beside it, and a one-call Pixel runner for every A/B,
   copied from `.claude/probes/K1362/k1362s12_phone_run.ps1`.

## Rules

- **The phone:**
  - It is ready only when it is unlocked with the home screen (or Chrome) in front and untouched for 2 minutes. Levi
    may take it back at any time; its screen also turns itself off while charging. Do the desktop part first, then
    each phone part through the runner (`phone_pass.ps1 -Phase start -WaitReady <min>`), waiting at most 30 minutes
    per attempt. The watchdog stops a run at a touch: rerun only the benches that did not finish. If the phone is
    still not ready, commit the runner and say so in the report.
  - Never wake it, unlock it, rotate it, press Home or send it any input, and never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone part,
    and release it between parts. No other agent uses the phone.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a whole
  file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view images.
  Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any directory,
  delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** everything in `src/render/gpu_field/` (tables under Done 1's gate); `test/render/gf_*`;
  `.claude/probes/K1362/k1362s13_*` (copy stage 12's `k1362s12_*` tools as needed).
- **Untracked inputs** (scenes, drags, earlier stages' outputs) are in the main checkout's `.claude/probes/`. Copy
  what you need; never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock** for desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to
  time, and delete it after. If another owner holds it, wait inside one blocking command.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start, write the time
  into your first commit message, and run it at each milestone; before stopping for the cap, check that 2 h have
  really passed. A lever that looks out of reach is not a stop: spend the time on the next most promising one. Leave
  the last 20 minutes for the write-up. Then commit WIP, append a handoff to this brief with your start and stop
  times, release the phone lock, and report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what the cell resolves, the coverage, and why the tier is still exact;
- the before/after table with the clock, and any attribution behind the choice;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

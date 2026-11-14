# K1362 stage 14: the corner cells' own loops, def under 8 ms on the Pixel

Coordinator brief, 2026-11-14. Stage 13's brief and handoff: `K1362_s13_cell_order.md`. The corner attribution is
stage 11's (`K1362_s11_layer_state.md` handoff); the per-frame corner-free program is stage 12's
(`K1362_s12_corners_faces.md`).

## Where it stands

- rp=gf is off by default. `GF_TIERS` (gf_pass.ts) is t32rlgyjfFkc3: a corner-free frame draws the tier with the
  corner code compiled out; other frames draw the corner tier with the exact face skip (`fs` "c"); each is followed
  by the full program behind the stencil. Pixel, 822x1506, sync4, 1286 MHz: def 12.01 ms, muse_hash 16.50, fat
  7.07 (fat's frames are corner-free). 0 px on the 12 scenes on both GPUs.
- Def's corner-free cells (55% of pixels) cost 5.7 ms alone and its corner cells 8.2 (stage 12). Stage 11 put about
  2.25 ms of def in layers()'s corner use (the corner faces, kb, kf, tangents) and about 1.6 ms in the scan's corner
  keep loop; removing all corner work (`nocorn`, inexact) saved 3.1-3.8 ms.
- What did not pay on the Pixel: packing or folding state (stages 10, 11); cutting layers()'s corner key loop alone
  (`nokey`, 1.05 ms slower); a MAXK 1 tier (2.7% of def to full, +3.75 ms); per-cell routing (+3 ms); the per-cell
  layering order (coverage below 100%); stopping the face loop at the first opaque surface (`lz`). Removing work
  pays when it also removes live state or indexed slots; measure every cut.
- Stage 11's kprune: a ring-aware corner list (drop each cell's corners that no point of the cell can pass the ring
  or reach test with) removes 19% of def's list entries and 29% of muse_hash's. Not built.

## Goal

def at most 8 ms at 822x1506 on the Pixel, exact, by making the corner cells cheaper. The technique is yours; the
levers stage 11 and 13 left: the scan's corner keep loop (fewer candidates per cell, for example kprune as an
additive table, or an exact bound that rejects a corner before its full test), and layers()'s corner faces (an exact
bound like `fs` that skips a corner face that cannot change the result, or less corner state held across the face
loop). Spend the whole 2 h: a lever that does not pay is a result to record, then move to the next.

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32rlgyjfFkc3 is replaced only by a program
   faster on def and muse_hash on the Pixel at 1286 MHz in one bench, with an `aid@` repeat when a gain is under
   0.5 ms, and fat no slower. 0 px and 0 unwritten against the full program on the 12 scenes on both GPUs, the CPU
   mirror holds, `npm test` green, the goldens unchanged, and every existing table field bit-identical (the digest in
   `.claude/probes/K1362/k1362t1_digest.ts`; new tables are additive, built in the gf build worker, and count with
   their build cost and bytes; if an old field must change, stop and write the gate argument
   `K1362_t1_muse_tables.md` addendum 2 asks for instead).
2. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and 1079x1977, sync4 and frame1, with the
   clock), the desktop beside it, the attribution rows behind each lever tried, and a one-call Pixel runner for every
   A/B, copied from `.claude/probes/K1362/k1362s13_phone_run.ps1`.

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
  `.claude/probes/K1362/k1362s14_*` (copy stage 13's `k1362s13_*` tools as needed).
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
- what the corner cells stopped doing, and why the tier is still exact;
- the attribution rows, and the before/after table with the clock;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

# K1362 stage 5: the per-pixel pass under 8 ms on the Pixel by changing its structure

Ledger: K1362. One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the
stage 4 handoff at the end of `docs/design/K1362_s4_shader.md` (the numbers, the tier programs, what failed on the
Pixel and why); the stage 3 handoff in `docs/design/K1362_s3_pixel.md` (the breakdown by program cuts); "How the
result is judged" in `docs/design/K1362_s1_gpu_formb.md`; K156's "Round 2026-11-11" in `docs/design/K156.md`.

## Where it stands

After stage 4 the pass on the Pixel (822x1506, sync4, 1286 MHz) is def 19.65 ms, muse_hash 24.6, fat 11.8, exact
against the full program. Stage 4 measured that the remaining implementation fixes reach only about 12 / 15. It found
that on the Pixel a stencil-routed middle program shades every remaining pixel (a whole pass), and that mediump
changes nothing. Its verdict: 8 ms needs a structural change, for example keys per tile instead of per pixel.

## Goal

The pass at or under 8 ms on the Pixel for def and muse_hash at 822x1506 and full clock, with the output exact as
stage 4 defined it (0 px differ from the full program; the CPU mirror check). You own the technique. Candidates:

- **Route by geometry, not by stencil or discard.** Draw each class of tile as its own list of quads: tiles in the
  background far from every piece, tiles inside one piece far from its edges, and the rest. Each list gets its own
  program, so a skipped tile costs nothing. The lists come from the bins the tables already build, or from a coarse
  GPU pass.
- **Keys per tile:** the candidate pieces, their membership and their layering order, decided once per tile (on the
  CPU from the bins, or in a coarse pass), so the per-pixel program carries a few distances instead of the arrays.
- **A distance pass that is not per pixel,** if you find one that keeps the output exact.

Measure each on the phone as stage 4 did: sync4 and frame1, with the GPU clock beside every number. Report the levers
that did nothing too.

## Done

1. The change in `src/render/gpu_field/`, with rp=gf still off by default. On the 12 scenes and on both GPUs: 0 px
   differ from the full program, and the CPU mirror check holds as in stage 4. `npm test` green, the goldens
   unchanged.
2. The before/after table on the Pixel (def, muse_hash, fat; 822x1506 and 1079x1977), sync4 and frame1, with the
   clock, and the desktop beside it.
3. If def or muse_hash is still over 8 ms: what remains, its floor, and the next fix, in stage 1's three verdicts.

## Rules

- **The phone:**
  - Never wake it, unlock it, rotate it, or send it input, and never restart Chrome on it.
  - Open and close only your own tabs, through DevTools, as stage 4 did.
  - Run `scripts/phone_pass.ps1 -Phase check -AllowChrome` first. If the phone is not ready, wait inside one
    blocking command (poll every few minutes, up to 30 minutes).
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone
    part, and release it between parts. Another agent may want the phone for one short run. If the lock is held,
    wait for it inside one blocking command.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** `gf_glsl.ts`, `gf_pass.ts`, `gf_pack.ts` and new files in `src/render/gpu_field/`;
  `test/render/gf_*`; `.claude/probes/K1362/k1362s5_*`. Another Claude agent is working on the CPU side (`tables.ts`,
  `gf_app.ts`, the physics worker). Stay out of those. If you need a new table from the CPU (tile lists, say), build
  it in your own new file from `GfTables` and call it from `gf_pass.ts`'s upload.
- **Untracked inputs** (scenes, drags) are in the main checkout's `.claude/probes/`. Copy what you need; never write
  there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock** for desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only
  to time, and delete it after. If another owner holds it, wait inside one blocking command.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start, write the time
  into your first commit message, and run it at each milestone; before stopping for the cap, check that 2 h have
  really passed. A lever that looks out of reach is not a stop: spend the time on the next most promising one. Leave
  the last 20 minutes for the write-up. Then commit WIP, append a handoff to this brief with your start and stop
  times, release the phone lock, and report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- the before/after table with the clock;
- each lever's effect;
- the exactness checks;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

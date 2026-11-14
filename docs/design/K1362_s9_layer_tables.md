# K1362 stage 9: the layering in the tables, def under 8 ms on the Pixel

Ledger: K1362. One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the
stage 8 handoff at the end of `docs/design/K1362_s8_intercept.md` (its verdict is this stage's plan); addendum 2 of
`docs/design/K1362_t1_muse_tables.md` (the tables' bit-identity gate); "How the result is judged" in
`docs/design/K1362_s1_gpu_formb.md`.

## Where it stands

On the Pixel at 822x1506 and 1286 MHz (sync4), t32r is def 15.95 ms, muse_hash 22.35, fat 11.57, exact. Stage 8
measured the per-pixel layering (`layers()`: surfaces, face order, burial) at about 10 of def's 16 ms (3.9 ms +
4.7 per Mpx). With the layering removed (inexact, for timing), def is 5.95 ms. Every exact cut inside the shader
(single-trip loops, the burial's early exit, the layering-once fold) bounds at a few ms together. The layering
also drives most of the fixed cost: its loops diverge more when an 8x8 tile covers more world. So 8 ms needs the
layering at about 2 ms, a 5x cut, and the remaining fix is structural.

## Goal

The pass at or under 8 ms on the Pixel for def at 822x1506 and full clock, muse_hash as low as it goes, output
exact as stage 4 defined it: 0 px against the current full program on the 12 scenes and on both GPUs, plus the CPU
mirror check. You own the technique. The plan stage 8 left:

1. Optional first probe (cheap): separate fetch locality from loop divergence on the Pixel with a 2x2-replicated map
   at 822 (each 2x2 block evaluates one world point).
2. Resolve per bin or per cell, on the CPU, whatever of the layering does not depend on the pixel: which faces can
   meet, their order, which faces can bury which. Store it in NEW tables, and have the shader read it instead of
   working it out per pixel. Per-pixel values (distances, bands, burial amounts) stay per pixel. Only the work
   that is the same for every pixel of a bin moves.

Measure on the phone as stages 4 to 8 did (sync4 and frame1, the GPU clock beside every number), and report what did
nothing too. If def still misses, say what the remaining (b) fix is, or prove (c).

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32r is replaced only if the new program is
   faster on def, muse_hash and fat on the Pixel. 0 px against the current full program on the 12 scenes on both
   GPUs, the CPU mirror holds, `npm test` green, the goldens unchanged.
2. The tables gate: every EXISTING table field stays bit-identical (the digest in
   `.claude/probes/K1362/k1362t1_digest.ts` over the old fields). The new tables are additive and built from the
   old ones. If any old field must change, stop and write the gate argument addendum 2 asks for instead.
3. The build's cost before and after: the table build's ms (`tables.ts`'s per-part timings) on the desktop and in
   the Pixel's build worker, and the bytes uploaded per frame. A new table that the worker cannot build within a
   Pixel frame does not count as a win.
4. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and 1079x1977), sync4 and frame1, with the
   clock, and the desktop beside it. A one-call Pixel runner for every A/B, copied from
   `.claude/probes/K1362/k1362s8_phone_run.ps1`.

## Rules

- **The phone:**
  - It is ready only when it is unlocked with the home screen (or Chrome) in front and untouched for 2 minutes. Levi
    may take it back at any time. Do the desktop part first, then each phone part through the runner
    (`phone_pass.ps1 -Phase start -WaitReady <min>`), waiting at most 30 minutes per attempt. If the phone is still
    not ready, commit the runner and say so in the report.
  - Never wake it, unlock it, rotate it, press Home or send it any input, and never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone part,
    and release it between parts. No other agent uses the phone.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a whole
  file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view images.
  Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any directory,
  delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** everything in `src/render/gpu_field/` except `gf_app.ts` (now including `tables.ts`, `gf_build.ts`,
  `gf_worker.ts` and `gf_pack.ts`, under item 2's gate); `test/render/gf_*`; `.claude/probes/K1362/k1362s9_*` (copy
  stage 8's `k1362s8_*` tools as needed).
- **Untracked inputs** (scenes, drags, stage 8's outputs) are in the main checkout's `.claude/probes/`. Copy what you
  need; never write there.
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
- what moved to the tables, and why it is exact;
- the before/after table with the clock, and the build's cost;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

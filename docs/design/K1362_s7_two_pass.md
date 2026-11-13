# K1362 stage 7: the two-pass split, the tier under 8 ms on the Pixel

Ledger: K1362. One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the
stage 6 handoff at the end of `docs/design/K1362_s6_footprint.md` (its verdict and "Next stage" are this stage's
plan); the stage 5 handoff at the end of `docs/design/K1362_s5_tiles.md` (the cost split); "How the result is
judged" in `docs/design/K1362_s1_gpu_formb.md`.

## Where it stands

On the Pixel at 822x1506 and 1286 MHz (sync4), t32r with keys per bin is def 16.7-16.9 ms, muse_hash 22.6-23.4,
fat 11.6-11.9, exact; the desktop runs the same program at 1.18 / 1.67 / 0.75. Stage 6's split of def is about
1 fixed + 4.5 scan + 1.2 keys + 10.5 layering, and cost follows the per-pixel state the program holds (register
footprint), not the work. Packing that state into vec4/ivec4 arrays was slower on the Pixel (the ivec4 group cost);
the register form and constant trip counts were slower too. A tier without ramps (t32) lost +5 / +9 ms, so ramps
stay in the tier.

## Goal

The pass at or under 8 ms on the Pixel for def at 822x1506 and full clock, muse_hash as low as it goes, output
exact as stage 4 defined it (0 px against the full program on the 12 scenes and on both GPUs; the CPU mirror check).
You own the technique. Levers, in order:

1. **The two-pass split** (stage 6's estimate -5 to -7): pass 1 runs the scan and keys and writes each pixel's
   pieces (the tier's p3/k2 state) to render targets; pass 2 runs `layers()` + `composite()` from them. Each pass
   then holds only its own state. Exactness needs the full 32-bit values, so float32 / uint32 targets, not half
   floats, unless you show 0 px. Check what the Pixel's GPU supports first (`EXT_color_buffer_float`, MRT count,
   whether a 32-bit-per-channel MRT shrinks its tiles), and measure the bytes per pixel against its bandwidth. The
   stencil routing (tier, then full) has to hold through both passes; a pixel the tier overflows still goes to full.
2. **Layering once inside the tier, exactly** (at most -1.8): the incremental surface grouping stage 6 describes
   (each ramp configuration flips at most two ramping pieces).
3. The scan to stage 1's floor (-0.8).

A distance pass at cell resolution, interpolated, is NOT exact; it is out unless you show 0 px. Measure each lever on
the phone as stages 4 to 6 did (sync4 and frame1, the GPU clock beside every number), and report the ones that did
nothing too. If def still misses after all of them, say what the remaining (b) fix is, or prove (c).

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default, t32r replaced only if the new program is faster
   on def, muse_hash and fat on the Pixel. 0 px against full on the 12 scenes on both GPUs, the CPU mirror holds,
   `npm test` green, the goldens unchanged.
2. The before/after table on the Pixel (def, muse_hash, fat; 822x1506 and 1079x1977), sync4 and frame1, with the
   clock, and the desktop beside it.
3. If def or muse_hash is still over 8 ms: what remains, its floor, and the next fix, in stage 1's three verdicts.
   muse_hash may need a smaller canvas (class (a), Levi's call, K1367); give its estimate at dpr 1.5 and the full
   one.

## Rules

- **The phone:**
  - Never wake it, unlock it, rotate it, or send it input, and never restart Chrome on it.
  - Open and close only your own tabs, through DevTools, as stages 4 to 6 did.
  - Run `scripts/phone_pass.ps1 -Phase check -AllowChrome` first. If the phone is not ready, wait inside one
    blocking command (poll every few minutes, up to 30 minutes).
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone
    part, and release it between parts. No other agent uses the phone this morning.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** `gf_glsl.ts`, `gf_pass.ts`, `gf_pack.ts`, `gf_keys.ts`, `gf_reg.ts` and new files in
  `src/render/gpu_field/`; `test/render/gf_*` except `gf_build.test.ts`; `.claude/probes/K1362/k1362s7_*` (reuse
  stage 6's `k1362s6_*` tools by copying them). Stay out of `tables.ts`, `gf_build.ts`, `gf_worker.ts` and
  `gf_app.ts`, and keep `GfTables`' fields and layout as they are. Moving `buildKeys` into the build worker is a
  separate item (K1375), not this stage.
- **Untracked inputs** (scenes, drags, stage 6's outputs) are in the main checkout's `.claude/probes/`. Copy what you
  need; never write there.
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

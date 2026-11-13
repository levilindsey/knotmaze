# K1362 stage 6: the tier program's per-pixel footprint, under 8 ms on the Pixel

Ledger: K1362. One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the
stage 5 handoff at the end of `docs/design/K1362_s5_tiles.md` (its verdict and fix list are this stage's plan); the
stage 4 handoff at the end of `docs/design/K1362_s4_shader.md`; the stage 3 handoff's breakdown in
`docs/design/K1362_s3_pixel.md`; "How the result is judged" in `docs/design/K1362_s1_gpu_formb.md`.

## Where it stands

On the Pixel at 822x1506 and 1286 MHz, t32r (a p3/k2 tier with ramps, then the full program) is def 19-20 ms,
muse_hash 24.6, fat 12.0, exact. Stage 5 showed routing is spent: the tier already takes 99.7% / 100% of inked
pixels, so the cost is the tier program itself, about 1 fixed + 4.5 scan + 3.7 keys + 10.5 layering on def. Stage 3
showed that cost follows the per-pixel arrays (register footprint), not the work: the `tinyonce` proxy was 14.0 / 16.8.
The physics' table build now runs in a worker (c1, `gf_build.ts` / `gf_worker.ts`).

## Goal

The pass at or under 8 ms on the Pixel for def and muse_hash at 822x1506 and full clock, output exact as stage 4
defined it (0 px against the full program on the 12 scenes and on both GPUs; the CPU mirror check). You own the
technique. Stage 5's list, in its order:

1. **Keys per tile:** each tile's key list (the corner and membership candidates the tier program now gathers per
   pixel) built on the CPU from `GfTables` and uploaded as a table, so the per-pixel program holds no key array.
   Estimated -2 to -3 ms; the largest unmeasured term. Build it in your own new file, as a pure function of
   `GfTables`. In the app, call it where the tables arrive (`gf_pass.ts`'s upload) for now and report its main CPU on
   the Pixel and the desktop; the coordinator moves it into the build worker after the Muse lane below finishes.
2. **Packed state or a two-pass split:** the tier's per-pixel state packed, or the pass split in two (for example a
   first pass writing each pixel's few nearest pieces and distances to render targets, a second layering from them).
   Estimated -5 to -7 from the `tinyonce` proxy.
3. **Layering once** inside the program over the ramp configurations (not as a routed tier: stage 4 measured that a
   middle routed program tests late). Measured -1.8 as a routed variant.
4. Scan and keys to stage 1's floor: estimated -0.8 / -1.0.

A distance pass at cell resolution, interpolated, is NOT exact; it is out unless you show 0 px. Measure each lever
on the phone as stages 4 and 5 did (sync4 and frame1, the GPU clock beside every number), and report the ones that
did nothing too. If muse_hash still misses after all of them, say what the remaining (b) fix is, or prove (c).

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default, t32r replaced only if the new program is faster
   on def, muse_hash and fat on the Pixel. 0 px against full on the 12 scenes on both GPUs, the CPU mirror holds,
   `npm test` green, the goldens unchanged.
2. The before/after table on the Pixel (def, muse_hash, fat; 822x1506 and 1079x1977), sync4 and frame1, with the
   clock, and the desktop beside it.
3. Stage 5's tile routes (`gf_tiles.ts`, `GF_TILE_*` in `gf_pass.ts`, `GF_TILE_VS` / `GF_MASK_FS`, their test): reuse
   what helps the key tiles; delete the rest of it, and say which in the report.
4. If def or muse_hash is still over 8 ms: what remains, its floor, and the next fix, in stage 1's three verdicts.

## Rules

- **The phone:**
  - Never wake it, unlock it, rotate it, or send it input, and never restart Chrome on it.
  - Open and close only your own tabs, through DevTools, as stages 4 and 5 did.
  - Run `scripts/phone_pass.ps1 -Phase check -AllowChrome` first. If the phone is not ready, wait inside one
    blocking command (poll every few minutes, up to 30 minutes).
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone
    part, and release it between parts. No other agent uses the phone tonight.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** `gf_glsl.ts`, `gf_pass.ts`, `gf_pack.ts`, `gf_tiles.ts` and new files in `src/render/gpu_field/`;
  `test/render/gf_*` except `gf_build.test.ts`; `.claude/probes/K1362/k1362s6_*`. A Muse run is working on
  `tables.ts`, `gf_build.ts`, `gf_worker.ts` and `gf_app.ts` (the build worker) and pushes to master; stay out of
  those, and keep `GfTables`' fields and layout as they are.
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

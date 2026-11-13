# K1362 stage 4: the per-pixel pass under 8 ms on the Pixel, look unchanged

Ledger: K1362. One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the
stage 3 handoff at the end of `docs/design/K1362_s3_pixel.md` (the numbers this stage starts from, and its tools);
the stage 2 handoff at the end of `docs/design/K1362_s2_glsl.md` (the shader, the mirror check); "How the result is
judged" in `docs/design/K1362_s1_gpu_formb.md`; and K156's "Round 2026-11-11" in `docs/design/K156.md` for the phone.

## Where it stands

Stage 3 measured the rp=gf pass on the Pixel at the app's canvas (822x1506), at rest, at full clock: def 32.8 ms,
muse_hash 42.6, fat 22.7 (desktop 1.2 / 1.7 / 0.85, a 27x ratio). The switch criterion is about 8 ms. By cutting the
program it found the cost is the per-pixel arrays, not the work: the layering is 19.6 of def's 32.8, and the same
program with the arrays sized MAXP 4 / MAXK 3 runs def 21.1, muse 26.4. Layering once over the ramp configurations
saves 1.5 / 2.5 more; a footprint proxy (MAXP 2 / MAXK 2) reaches 14.0 / 16.8. An early out for simple pixels saves
nothing, which points at the register footprint (occupancy), not the work (inferred, not observed). At one pass per
frame a short pass ran at 460 MHz against 1286 MHz back to back, so the GPU clock at the app's pacing is part of the
answer. Stage 3's estimate after its fixes is about 13 / 16 ms: a miss with fixable causes, not a verdict.

## Goal

The rp=gf pass at or under 8 ms on the Pixel, def and muse_hash, at the app's canvas and full resolution, with the
look unchanged. Then measure what the app actually gets. You own the technique. Start with stage 3's three fixes, then
the levers it did not try, measuring each on the phone as you go:

- **Arrays sized to need,** made exact: stage 3 saw at most 4 pieces per pixel and more than 3 corner candidates on
  0.7% of def's pixels. A bound you observed is not a bound you can rely on. Prove it from the tables, or route the
  pixels over the bound to a path that handles them (a second program, a second pass), or keep a cap with a census
  that shows it never binds on the 12 scenes and an explicit flag where it would.
- **Layering once** over the ramp configurations.
- **A smaller footprint:**
  - pack the per-pixel state;
  - use `mediump` (fp16) for whatever does not need highp; check it against the mirror, since mobile GPUs run fp16
    faster and hold twice as much of it;
  - split the pass in two (per-piece distances to a render target, then the layering).
- **Different programs for different pixels:** classify tiles or bins (simple: one piece and no corner, stage 3's 42%
  of def, 77% of fat) and draw them with a small program. An in-shader early out cannot lower the register footprint;
  a separate program can.
- **No pass when nothing moved:** the field at rest is the same frame after frame.

Report each lever's measured effect, including the ones that did nothing.

## Done

1. The shader changes in `src/render/gpu_field/`, rp=gf still off by default. The read-back equals the mirror on the
   12 scenes, as stage 2 checked it, or each difference is explained and bounded (fp16). `npm test` green, the goldens
   unchanged.
2. On the Pixel, for def, muse_hash and fat:
   - the pass at full clock (stage 3's sync4), before and after;
   - the GPU clock beside every number, from `k1362s3_gpuclk.mjs`; stage 3 warned its short variants may have run
     under-clocked even back to back;
   - the pass at one per frame (frame1);
   - the app's frame interval (p50 and p90) through the drags the K156 kit replays, under rp=gf and under today's
     look. Use the kit's own pass if it can set rp, or a minimal change to it.
3. If def or muse_hash is still over 8 ms at full clock: the breakdown that remains, its floor, and the next fixes, in
   stage 1's three verdicts. Also make the dpr 1 picture, the field at full resolution beside dpr 1 on the same two
   crops at x4, for Levi to judge. A lower resolution is a look change and his call.

## Rules

- **The phone:**
  - Never wake it, unlock it, rotate it, or send it input, and never restart Chrome on it.
  - Open and close only your own tabs, through DevTools, as stage 3 did.
  - Run `scripts/phone_pass.ps1 -Phase check` first. If the phone is not ready, wait inside one blocking command
    (poll every few minutes, up to 30 minutes).
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone part.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** `src/render/gpu_field/` except `tables.ts`; the rp hook in `src/app/frame_loop.ts` if you need it;
  `test/render/gf_*`; and `.claude/probes/K1362/k1362s4_*`. Another lane may work on `tables.ts` (the CPU table
  build). Change its outputs' layout only through `gf_pack.ts`, and say so if you need more than that.
- **Untracked inputs** (scenes, drags) are in the main checkout's `.claude/probes/`. Copy what you need; never write
  there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock** for the desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what); take it
  only to time and delete it after.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start, write the time
  into your first commit message, and run it at each milestone; before stopping for the cap, check that 2 h have
  really passed. Leave the last 20 minutes for the write-up. Then commit WIP, append a handoff to this brief with your
  start and stop times, release the phone lock, and report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- the before/after table, Pixel beside desktop, with the clock;
- each lever's effect;
- the frame interval;
- the mirror check;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

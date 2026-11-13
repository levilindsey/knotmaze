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
  - Run `scripts/phone_pass.ps1 -Phase check -AllowChrome` first. Stage 3's cleanup left Chrome in front, as the
    kit's cleanup does, and at 00:32 the check passed with `-AllowChrome`. If the phone is not ready, wait inside one
    blocking command (poll every few minutes, up to 30 minutes).
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

## Handoff (stage 4, 2026-11-13 00:33:07 to 01:59:21)

**Not done: def and muse_hash are still over 8 ms.** Stopped about 30 min before the cap: each lever left (packed state, the two-pass split, layering once inside the program) needs more than the time left for a build, the exactness check and a phone batch. One exact lever landed, and it takes 40 to 45% off the pass;
rp=gf is still off by default.

**What landed** (`src/render/gpu_field/`, commits b09440eb..edbc61aa):
- `gf_glsl.ts`, tier builds: the same program with smaller arrays (MAXP/MAXK per tier, ramps on or off, an optional
  mediump variant). A tier is exact by construction: on any overflow it sets a flag, breaks and discards, and the
  full program (MAXP 8 / MAXK 6), always drawn last, shades those pixels.
- The ANGLE/D3D traps it hit:
  - execution continues past a `discard` (so it is `discard; return;`);
  - a `&& !ovf` loop condition was mistranslated (it is now a `break`);
  - an inlined NORAMP build failed at draw.
- `gf_pass.ts`, routing by stencil (EQUAL 0, INCR). The last program uses KEEP, so the Pixel tests its stencil before
  the shader. The default `GF_TIERS` is `[{p:3,k:2,ramps:true}]` (p3/k2 with ramps, then full: "t32r").
- On fallback, full shades 0.19% of def's pixels and 0.10% of muse_hash's (1079x1977: 0.12% / 0.07%; 411x753: 0.8% /
  0.3%).

**Pass, Pixel sync4 (ms, the empty pass subtracted), with the GPU clock:**

| | s3 (before) | full | **t32r (after)** | desktop s3 → t32r |
|---|---|---|---|---|
| 822x1506, def | 33.8 @1286 | 33.0 @1286 | **19.65 @1286** | 1.2 → 1.2 |
| 822x1506, muse_hash | 44.7 @1286 | 42.3 @1286 | **24.6 @1286** | 1.7 → 1.77 |
| 822x1506, fat | 22.3 @1286 | 21.2 @1286 | **11.8 @1286** | 0.88 → 0.78 |
| 1079x1977, def | 47.7 @1286 | 45.7 @1286 | **26.7 @1286** | 1.85 → 1.65 |
| 1079x1977, muse_hash | 62.5 @1286 | 59.6 @1286 | **33.75 @1286** | 2.48 → 2.25 |
| 411x753 (dpr 1), def / muse | | 16.7 / 19.75 @1286 | **12.1 / 13.8 @1286** | |

**Frame1 (one pass per frame):**
- 822x1506:
  - s3: def 39.3 @1190, muse 49.7 @1286, fat 28.0 @1190;
  - t32r: def 24.3 @940, muse 29.2 @1094, fat 17.5 @825.
- 1079x1977:
  - s3: def 54.1, muse 68.8, both @1286;
  - t32r: def 31.1 @1017, muse 37.5 @1286.
- 411x753, t32r: def 18.7, muse 19.3, both @825.
- At the app's pacing the GPU drops to 825-1100 MHz; the empty pass reads 460.
- Desktop frame1 (822x1506): s3 5.9 / 8.3 / 4.3, t32r 5.7 / 8.6 / 3.7.

**Levers** (Pixel, 822x1506, sync4 @1286; def / muse / fat):
1. **Arrays sized to need (exact by routing):** t32r against full saves 13.3 / 17.7 / 9.7 ms, and against s3 14.2 /
   20.1 / 10.5. Every variant differs from full on 0 px, on the Pixel and on the desktop. The other tiers:
   - t22r: 17.85 / 26.8-27.65 / 10.3 (muse falls back on 3.7%);
   - t33r: 19.63 / 25.03 / 12.27;
   - t42r: 22.28 / 28.23 / 14.2;
   - t43r: 21.85 / 28.25 / 13.95.
2. **Layering once over the ramp configurations:** built as a routed NORAMP tier in front of the ramp tier, it costs
   19 to 21 ms more (t43_43r: 41.2 / 51.9 / 27.2; t22r_43r: 40.9 / 52.2 / 26.5).
   - A middle routed program writes the route with a discard, so the Pixel runs its stencil test late and shades
     every remaining pixel: a whole pass.
   - So only one tier sits in front of full.
   - Layering once inside one program was not built.
3. **mediump** (t43rh against t43r): 22.2 / 28.4 / 14.43 against 22.0 / 28.4 / 14.2, nothing. The output is
   bit-identical on both GPUs: the driver kept highp, or what it lowered did not matter.
4. **A separate program for simple pixels:** this is what t22r is, a small program first. It is the best for def
   and worse for muse_hash. A second small program in front costs a pass (lever 2).
5. **Packed state, and the two-pass split:** not built (time).
6. **No pass when nothing moved:** `gf_app.ts` already skips the pass (its dirty flag plus the camera key).

**The app's frame interval:**
- Setup: the Pixel, the app built at 8e133d39, an 822x1506 canvas, at 1286 MHz.
- Drag: a 3 s DevTools touch drag in `k1362s4_drag.mjs`, ABAB x2, `?b.J&am=instant&snd=none` with and without
  `&rp=gf`. This is not the K156 kit's replay.
- Today's look: p50 50.1, p90 50.2 (max 66.8).
- rp=gf: p50 83.5, p90 116.9 (max 283 to 367).
- gf's main-thread CPU per frame: export 21.5-23.4 ms, tables 27.7-28.7 ms, pack 0.7 ms, upload 0.2 ms.
- So about 50 ms of CPU on main bounds the frame, not the 20 to 25 ms pass.

**Mirror check:**
- Read-back against the CPU mirror: 0 of about 3000 sampled px per scene over 1e-2 (max 9e-5 to 2.3e-4), for every
  variant, on the Pixel and on the desktop.
- The stage 2 census over the 12 scenes (`k1362s4_census.ps1` → `out/s2/census_s4*`) equals stage 2's table row for
  row (total 301).
- `npm test` is green (2944 passed, 18 skipped, at edbc61aa) and the goldens are unchanged.

**What remains (def at t32r, 822x1506):**
- Stage 3's breakdown, rescaled: about 1 fixed + 4.5 scan + 3.7 keys + 10.5 layering = 19.65.
- The footprint floor proxy (stage 3's tinyonce, MAXP 2 / MAXK 2, layering once) is 14.0 / 16.8 at 822x1506 and
  6.9 / 7.3 at 411x753.
- So at the app's canvas, this per-pixel structure is over 8 ms even at its proxy floor.

**Next fixes, in stage 1's verdicts:**
- **(b) implementation:**
  - layering once inside the program (about -1.8);
  - packed state or the two-pass split, towards the proxy floor (about -5 to -7);
  - scan and keys cut to stage 1's floor (about -0.8 / -1.0).
  - Together these give about 12 / 15 ms at 822x1506. The 8 ms goal needs a structural change on top: for example,
    keys per tile instead of per pixel, or a distance pass that is not per pixel.
- **(b) the app's frame:** the per-frame export and tables (about 50 ms on main) must move off main or become
  incremental. That is the larger lever for what the app gets.
- **(a) definition:** dpr 1 gives t32r 12.1 / 13.8 now, and a proxy floor of about 7. This is a look change and Levi's
  call.
  - Pictures: `out/s4/dpr1_def.png`, `dpr1_muse_hash.png` (untracked; full resolution beside dpr 1, two crops at
    x4).
  - At dpr 1 the dark outline lines mostly vanish and the edges blur.
- **(c) inherent:** the clock drop at frame pacing (825-1100 MHz) is the governor's, not the shader's; no proof yet.

**Evidence:**
- tools: `.claude/probes/K1362/k1362s4_*` (bench, run, phone, gpuclk, drag, census, configs, and `pic` in
  `k1362s4_entry.ts`);
- outputs: `.claude/probes/K1362/out/s4/` (`phone_p1..p3`, `gpuclk_p1..p3`, `desk_ab`, `desk_desk`, `drag_d1`,
  `drag_d2`, the dpr 1 PNGs).

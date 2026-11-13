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

## Handoff (stage 6, 2026-11-13, start 03:28:33, stop STOPTIME)

**Not done: def and muse_hash are still over 8 ms** (t32r at 822x1506, sync4: def 16.7-16.9, muse_hash 22.6-23.4).
rp=gf stays off; `GF_TIERS` is still t32r. Keys per bin (lever 1) now feed every program, full included.

**Built** (all in `src/render/gpu_field/`):
- `gf_keys.ts` `buildKeys(T)`: lever 1, a pure function of GfTables. Each chain's u range is split into bins
  (2 per pin + arm, at most 2048, each at least 1e-4 of the chain's scale). Each bin holds pin search bounds for
  depth() and the candidate arms for member(), in arm order. Every bound is taken over the bin widened by half a bin
  on each side. An open chain's outer bins are unbounded, and a closed chain's two end bins search every pin.
  `gf_pack.ts` packs three regions (KC, KB, KA), and `gf_pass.ts` calls buildKeys at upload. In `gf_glsl.ts`,
  keyBin() picks the bin; `#ifdef OLDKEYS` (GfForm.oldKeys) keeps the old full ranges for bench A/Bs.
  `test/render/gf_keys.test.ts` emulates depth()'s search and member() on float32 values. On every test scene,
  chain and pin, and at every arm edge, it checks that the binned answers equal the full ones, with the bin also
  picked 0.4 bin either way.
- `gf_reg.ts` (register form `reg`, constant trip counts `unroll`): opt-in tier forms, off by default, tested by
  `gf_reg.test.ts`. Both are slower on the Pixel (below).
- Outside my file list: `test/render/paint_ring_lap.test.ts` (K299's registry) gained keyBin's two rounded
  quotients (`mod(s - C1.x, C0.w)` and `floor((u - KC.w) / KC.z)`), each with its reason.
- Stage 5's tile route was **deleted** (5d4db0f7: `gf_tiles.ts`, its test, gf_pass's tile modes and shaders), not
  reused: every route was slower, and the keys made its per-tile bounds moot.

**Pixel, before/after** (ms net of empty @ the p50 GPU MHz; before = t32ro, the same tier on the old keys, run
interleaved with t32r on the same build; two runs, s6c and s6d, given as s6c / s6d; thermal status 0). The desktop
(RX 6800 XT, ANGLE D3D11, perf lock) is before → after:

| scene, canvas, mode | before (t32ro) | after (t32r) | desktop |
|---|---|---|---|
| def 822 sync4 | 19.40 / 19.27 @1286 | 16.92 / 16.65 @1286 | 1.32 → 1.18 |
| def 822 frame1 | 25.0@1017 / 23.9@1017 | 22.2@940 / 20.2@1286 | 7.1 → 6.3 |
| muse_hash 822 sync4 | 24.93 / 24.53 @1286 | 23.35 / 22.58 @1286 | 1.80 → 1.67 |
| muse_hash 822 frame1 | 31.2@1286 / 28.2@1094 | 25.9@1190 / 27.3@1190 | 9.3 → 8.7 |
| fat 822 sync4 | 11.92 / 11.82 @1286 | 11.90 / 11.55 @1286 | 0.75 → 0.75 |
| fat 822 frame1 | 17.5@748 / 15.1@691 | 16.9@691 / 16.2@748 | 4.1 → 4.1 |
| def 1079 sync4 | 26.25 / 25.77 @1286 | 23.00 / 22.30 @1286 | 1.70 → 1.45 |
| def 1079 frame1 | 30.6@1190 / 30.4@1190 | 28.6@1017 / 27.4@1017 | 9.0 → 7.7 |
| muse_hash 1079 sync4 | 34.33 / 34.13 @1286 | 31.50 / 31.35 @1286 | 2.25 → 2.05 |
| muse_hash 1079 frame1 | 37.6 / 36.3 @1286 | 35.7 / 34.1 @1286 | 11.6 → 10.7 |
| fat 1079 sync4 | 17.38 / 16.90 @1286 | 16.83 / 16.35 @1286 | 1.10 → 1.05 |
| fat 1079 frame1 | 24.0@940 / 21.1@1094 | 23.4@1094 / 22.1@1094 | 5.8 → 5.6 |

Stage 5's t32r for comparison (822 sync4): def 18.7-19.75, muse_hash 24.4-24.6, fat 12.2. The full program
(822 sync4, old → new keys): def 32.7-32.9 → 28.1-28.5, muse_hash 41.4-42.1 → 38.3-39.2, fat 20.8-21.4 → 20.0-20.4.
At sync4 (a fixed clock) the new keys are faster on all three scenes in every sample, fat by 0.02-0.55 ms. At
frame1, fat moves within the governor's noise. buildKeys' main-thread CPU at upload, p50 per scene and size: Pixel
0.1-1.4 ms (median 0.6), desktop 0.0-0.6 ms (median 0.2).

**Levers:**
1. Keys per bin: def -2.5 to -2.6 ms (822 sync4) and -3.3 to -3.5 (1079); muse_hash -1.6 to -2.0 and -2.8;
   fat -0.0 to -0.3 and -0.5 (fat has no arms, so only depth()'s search gains). Kept.
2. Packed state / two-pass split: not built (no time after levers 1 and 4's attempts).
3. Layering once: not built. layers() groups pieces into surfaces by psurf, so entry order, burial and the sort
   all change with the configuration. An exact fold rewrites that grouping incrementally (each configuration
   flips at most two ramping pieces). PART5
4. Scan and keys toward stage 1's floor. Tried, and both did nothing or worse:
   - the register form (`reg`, gf_reg.ts): +10 / +16 / +8 ms on def / muse_hash / fat;
   - constant trip counts (`unroll`): +0.65 / +0.77 / +0.75 (t32ru against t32r), and t22ru was mixed.
   The keys themselves reached their part of the floor (stage 5 put keys at 3.7 of def's 19.7).

**Exactness** (42ede7fd): 0 px against the full program on 12 scenes on the desktop (78 compare rows) and on the
Pixel (42 rows over def, muse_hash and fat at both sizes; 9824ab87's run also covered the 9 other scenes, 0 px). The
CPU mirror holds (54 Pixel and 60 desktop mirror rows with no miss). `npm test` passes (235 files, 2968 tests), and
the goldens are unchanged.

**Verdict.** def reaches after these fixes, all (b). Stage 5's split, with lever 1 applied, is about 1 fixed + 4.5
scan + 1.2 keys + 10.5 layering:
- lever 2, packed state or a two-pass split: est. -5 to -7;
- lever 3, layering once: at most PART5C;
- the scan to its floor: -0.8.
These give def an expected EXPECTDEF; it reaches 8 if lever 2 lands at -6 or better.

muse_hash (22.6-23.4) reaches after the same fixes (expected about MUSEEXP) plus (a) a smaller canvas: the pass
scales with pixels, so dpr 1.5 (0.56 of 822x1506's pixels) gives about MUSEDPR, and dpr 1 about a quarter. That
is Levi's call. No (c): the desktop runs the same program at 1.18 / 1.67 ms.

**Next stage:** build lever 2 (packed per-piece state, or a two-pass split of scan + keys from layering) and
measure it on the Pixel; then lever 3 exactly (the incremental surface grouping), with the same 12-scene and
mirror checks. Move buildKeys into the build worker once the Muse lane (`gf_build.ts`, `gf_worker.ts`) is merged.
Probes: `.claude/probes/K1362/k1362s6_*` (run, entry, sum, gpuclk, keystats; cfg_phone3 is the before/after,
cfg_cmp3 the 12 scenes, cfg_phone4 t32 against t32r). Outputs: `out/s6/` (untracked).

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

## Handoff (stage 7, 2026-11-13, start 05:10:51, stop 06:41)

**Not done: no Pixel numbers.** The phone was locked at every check from 05:24 to 06:40 (waits of 30, 28 and 9 minutes, polled every 2-3 minutes; never woken or touched, the phone lock never taken), so nothing ran on it. So t32r stays (`GF_TIERS` unchanged), rp=gf stays off, and whether
def reaches 8 ms is still open. The split is built, exact, and faster on the desktop at both sizes.

**Built** (lever 1, all in `src/render/gpu_field/`; bench forms only, nothing in the app uses them yet):
- `gf_split.ts` `GfPieces`: pass 1's integer targets over the GfTarget's depth-stencil. Default layout: one RGBA32UI
  per piece the tier holds plus one RG32UI of corners (`gfSplitBytes`: 56 B/px for p3, 40 for p2). SPLITK layout
  (keys in pass 2): two RGBA32UI, 32 B/px. The header gives each field.
- `gf_glsl.ts`: `GfForm.split` 1 | 2, `splitSkip`, `splitKeys` (defines SPLIT1/SPLIT2, SPLITSKIP, SPLITK). Pass 1 is
  the tier's scan (+ keys, + corners) and writes the pieces; pass 2 texelFetches them, rebuilds pd/pfx/pfy and the
  corner radii (and, under SPLITK, ps and the keys loop) with the scan's own lines, then layers() + composite().
  A value outside its field discards in pass 1, so the full program draws that pixel.
- `gf_pass.ts`: `new GfPass(gl, probe, [tier], fs, split)` with `split` true | "skip" | `{skip, keys}`. Routing:
  pass 1 ALWAYS ref 1 REPLACE into the pieces; pass 2 EQUAL 1 KEEP into the target; full EQUAL 0 KEEP. "skip":
  pass 1 also writes depth (1 where the pixel has no piece), and pass 2 runs at GREATER with the stencil off, so
  empty pixels skip it (the target is cleared to 0, which is what full writes there).
- `test/render/gf_split.test.ts`: the defines and interfaces, the refusals, and pass 2's lines counted against the
  scan's own (a reworded copy could round differently).
- Bench (`.claude/probes/K1362/k1362s7_*`): variant `x<tier>[k][e][1]` = that tier split (k keys in pass 2, e skip
  empties, 1 pass 1 alone). `cfg.glTrace` names each GL call that raised an error: the x..1 forms' glError 1282 is
  their two DISCARD draws (pass 2 and full, on the target) only; pass 1 draws clean, so x..1 times pass 1 alone.

**Exactness.** 0 px against full on all 12 scenes (def, muse_hash, fat and cmp12's nine) for x32re, x22re, x32rke and
x22rke on the desktop (ANGLE D3D11), mirror [n, 0, 0, ~1e-4] for every row, the same as t32r's. `npm test` green
(2978 passed), goldens unchanged. Pixel exactness: not run (no phone).

**Desktop** (D3D11, `out/s7/desk_p1.json`, the phone's own cfg; sync4 is ms above the empty pass, frame1 as measured):

| scene, canvas | t32r sync4 / frame1 | x32re | x22re | x32rke | x22rke | pass 1 alone (x32re1 / x32rke1) |
|---|---|---|---|---|---|---|
| def 822 | 1.02 / 5.4 | 0.90 / 4.2 | 0.85 / 4.1 | 0.95 / 4.2 | 0.85 / 4.0 | 0.55 / 2.3, 0.50 / 2.2 |
| muse_hash 822 | 1.63 / 8.3 | 1.43 / 6.9 | 1.30 / 6.1 | 1.40 / 6.6 | 1.27 / 6.3 | 0.70 / 3.3, 0.68 / 3.0 |
| fat 822 | 0.72 / 4.0 | 0.63 / 2.9 | 0.60 / 2.7 | 0.63 / 2.8 | 0.60 / 2.7 | 0.50 / 2.2, 0.45 / 2.0 |
| def 1079 | 1.43 / 7.4 | 1.25 / 5.8 | | 1.25 / 5.8 | 1.13 / 5.2 | |
| muse_hash 1079 | 2.05 / 10.7 | 1.80 / 8.4 | | 1.77 / 8.2 | 1.73 / 8.2 | |
| fat 1079 | 1.05 / 5.6 | 0.88 / 4.0 | | 0.85 / 3.9 | 0.78 / 3.5 | |

**Pixel:** not measured. Before = t32r, stage 6's numbers @1286 MHz: def 822 sync4 16.65-16.92, frame1 20.2-22.2;
muse_hash 822 22.58-23.35 / 25.9-27.3; fat 822 11.55-11.90 / 16.2-16.9; def 1079 22.30-23.00; muse_hash 1079
31.35-31.50; fat 1079 16.35-16.83. Ready to run: `k1362s7_cfg_phone1.json` (every form, both sizes, cmp12) or
`k1362s7_cfg_phone2.json` (t32r, x32re, x22rke, x32rke1: about half the time), through `k1362s7_gpuclk.mjs`
after `phone_pass.ps1 -Phase start` with `out/s7/site` copied to `<Out>\builds\<sha>\k1362s7\`. The bench's info()
records floatRT (EXT_color_buffer_float), MAX_DRAW_BUFFERS and MAX_COLOR_ATTACHMENTS, which answer the brief's
support questions on the first run.

**Levers.**
1. The two-pass split: built and exact; desktop -12 to -22% sync4 and -25 to -37% frame1 (x22rke best). Pixel:
   not measured. Bytes per pixel 56 (x32r), 40 (x22r), 32 (SPLITK); the x22 forms send 3-piece pixels to full.
2. Layering once inside the tier: not built (no time after the phone wait). Design notes for the next stage: a ramp
   configuration flips at most two ramping pieces (rIdx0, rIdx1) between their singleton surface (-1-j) and their
   group pg, so only those surfaces change between configurations; an exact fold keeps the entry order and the stable
   insertion sort's tie order and reruns composite() only. Stage 6's t32 (+5 to +9 ms) says it must stay in the tier.
   With the split, it lives in pass 2 only.
3. The scan to stage 1's floor: not attempted (stage 6's reg/unroll forms did nothing or worse on the Pixel).

**Verdict.** open. The split is a (b) fix; whether it gives the -6 ms def needs on the Pixel is unmeasured, and desktop gains do
not predict the Pixel (stage 6), so this stage offers no Pixel projection. If it lands at stage 6's -5 to -7, def
is 9.7-11.9 after it and 7.1-9.5 only with levers 2 and 3 too (all (b)). No (c): the desktop runs the same programs
at 0.85-1.02 ms.

muse_hash: t32r is 22.6-23.4 ms at 822x1506 and 31.4-31.5 at 1079x1977 (stage 6). The pass scales with pixels
(t = a + b px, a about 1 ms), so dpr 1.5 (617x1130, 0.56 of 822's pixels) gives t32r about 13.4 and full canvas
1079x1977 about 31.5; after the split nothing measured.

**Correction to stage 6's dpr 1.5 estimate:** the pass does not scale with pixels alone. Desktop at three sizes
(`desk_d15.json`, 617x1130 = 0.70 Mpx; `desk_p1.json`): t32r def 0.75 / 1.02 / 1.43 ms (0.70 / 1.24 / 2.13 Mpx),
muse_hash 1.20 / 1.63 / 2.05, so dpr 1.5 keeps 74% of def's 822 time against 56% of its pixels (fit a about 0.4 ms,
39%). The Pixel's two sizes (stage 6) fit t = 8.7 + 6.5 px (def) and 11.3 + 9.5 px (muse_hash, ms, px in Mpx).
Observed: those intercepts; cause not isolated (fixed per-pass costs or a world-space cost, untested). So t32r's
muse_hash at dpr 1.5 is about 17.9 ms by the fit (13.4 by pixel share), and 31.4-31.5 measured at full 1079x1977.
If the levers cut the same share at every size (stage 6's expected 13-15 at 822), dpr 1.5 gives about 10.1-11.7
(7.6-8.7 by pixel share) and full canvas about 17.8-20.5. A smaller canvas is class (a), Levi's call (K1367), and
on this fit dpr 1.5 alone does not reach 8.. A smaller canvas is class (a), Levi's call (K1367).

**Next stage:**
1. Measure the split on the Pixel: `k1362s7_cfg_phone1.json` (or phone2) plus `k1362s7_cfg_dpr15.json`, with the clock, and read info()'s MRT and float-target support. Replace t32r only if x22rke or x32re is faster on def, muse_hash and fat there; the cmp12 rows check exactness on the Pixel.
2. Lever 2 exactly in pass 2 (the incremental surface grouping), with the same 12-scene and mirror checks.
3. If the split wins on the Pixel: replace t32r in `GF_TIERS` with it (needs the app's GfPass call to pass `split`,
   and `gf_app.ts`, which this stage stayed out of).

## Pixel results (coordinator, 2026-11-13 12:21-12:29)

`k1362s7_phone_run.ps1` (cfg phone2 twice, dpr15 once; outputs `out/s7/gpuclk_phone2*.json`, `gpuclk_dpr15.json`).
sync4 net ms, run 1 / run 2, GPU clock 1286 MHz unless noted:

| scene, canvas | t32r | x32re | x22rke | pass 1 alone (x32rke1) |
|---|---|---|---|---|
| def 822 | 15.95 / 16.32 | 15.62 / 16.15 | 14.38 / 14.98 | 7.92 (748) / 8.8 (883) |
| muse_hash 822 | 22.45 / 22.70 | 20.40 / 20.48 | 22.07 / 23.32 | 10.60 / 10.93 |
| fat 822 | 11.35 / 11.70 | 10.28 / 10.90 | 9.48 / 9.88 (1017) | 7.80 / 7.95 (1094) |
| def 1079 | 22.43 / 21.77 | | 18.75 / 19.13 | |
| muse_hash 1079 | 31.05 / 30.92 | | 29.73 / 29.72 | |
| fat 1079 | 16.00 / 15.95 | | 12.50 / 12.03 (1017) | |
| def 617 | 12.57 | | 11.95 | |
| muse_hash 617 | 16.38 | | 18.75 | |
| fat 617 (1190) | 7.67 | | 7.92 | |

Exact on the Pixel: 0 px against full on def, muse_hash, fat and the nine cmp12 scenes for t32r, x32re and x22rke.
The split saves 1-2 ms on the Pixel against 12-37% on the desktop; x22rke ties t32r on muse_hash at 822 and loses at
617; x32re wins all three at 822 but def by 1-2% (run noise) at 56 B/px of targets (69 MB at 822). **t32r stays.**

**Size.** t32r over three sizes is linear in pixels with a large intercept: def about 8.0 ms + 6.6 per Mpx (0.70 /
1.24 / 2.13 Mpx: 12.57 / ~16.1 / ~22.1), muse_hash about 9-10 + 9.4-11.5, fat about 3-4 + 5-7. The timed loop
excludes uploads (4 draws and a 1-px readPixels; the empty variant, about 0.85 ms, is subtracted), so half of def's
822 time is in the program's work but does not scale with the canvas. Unexplained (K1376); stage 8 starts there.
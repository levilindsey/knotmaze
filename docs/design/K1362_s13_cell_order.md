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

## Handoff (stage 13, 2026-11-14)

Started 2026-11-13 23:47:42 PT, stopped 2026-11-14 00:55 PT. Branch `worktree-agent-afe832471aec3d743` (from
427d43e1); the last commit is in the report. GF_TIERS is now t32rlgyjfFkc3 (fs "c", the exact face skip in the corner
program): def 12.55 -> 12.01 ms and muse_hash 17.03 -> 16.50 at 822 on the Pixel, fat unchanged. Done's 8 ms is not
met; the cell order is closed (below).

### What a cell could resolve, and how much it covers (steps 1-2)

In the tier, a pixel's layering state is its surfaces (`sid`, `skey`, `sv`, `sa`, `sord`, at most s = 3), sorted by
key, and `composite()` mixes in the swapped order wherever two adjacent keys are closer than zt. A cell could carry
that state instead of the pixel only where every pixel has one surface (no order) or all of its surfaces fall in one
cell-wide order with no pixel reaching the tie mix. `k1362s13_cov.ts` runs the CPU mirror at every pixel centre of
the bench map (822x1506) and classes each cell. The observed ceiling, in % of ink (px2 and tie: % of ink pixels with
2+ surfaces and with a tie swap; 1surf and ordered: ink in cells of each class; all: their sum; lost: the rest):

| scene | px2 | tie | 1surf | ordered | all | lost |
|---|---|---|---|---|---|---|
| def | 17.63 | 1.49 | 62.66 | 31.83 | 94.49 | 5.51 |
| muse_hash | 33.01 | 6.87 | 34.45 | 46.78 | 81.23 | 18.77 |
| fat | 22.49 | 0 | 55.43 | 44.51 | 99.93 | 0.07 |
| g41_ring_tw64 | 20.51 | 2.21 | | | 93.57 | 6.43 |
| g41_def_tw64 | 24.21 | 3.67 | | | 89.39 | 10.61 |
| user_tw42.lightpaper | 14.12 | 0.47 | | | 97.66 | 2.34 |
| g41_user_tw42 | 14.12 | 0.46 | | | 97.66 | 2.34 |
| muse_default_tw | 17.42 | 1.39 | | | 94.44 | 5.56 |
| ring | 17.62 | 1.35 | | | 95.51 | 4.49 |
| g41_def_tw42 | 13.02 | 0.35 | | | 98.04 | 1.96 |
| g41_user_tw64 | 25.52 | 3.62 | | | 88.83 | 11.17 |
| g41_ring_tw42 | 11.44 | 0.1 | | | 99.01 | 0.99 |

Why that rules the form out (a finding, not a failure): a per-frame choice (stage 12's mechanism, the one routing
that pays) needs 100% of the frame's cells, and no scene reaches it; per-cell routing sends the rest (0.07-18.8% of
ink) to a program that keeps the per-pixel state, and stage 12 measured routing cells at about 3 ms slower on def
and muse_hash. So the tie cells stay in the same program, and so do the arrays. No conservative bound
(`k1362s13_prove.ts`) was written: the observed ceiling already falls short. The tier is unchanged in what it
computes; the forms below are exact by construction and drew 0 px against full.

### What was built (`src/render/gpu_field/gf_glsl.ts`; bench forms unless GF_TIERS says otherwise)

- `lz` (lazy faces, tier letter `L`): the face loop walks the surfaces in sorted order and stops after the first
  opaque one (D > 2aa makes `ss(-aa, aa, D)` exactly 1, so `Tt` is 0 behind it), plus the next one when its gap is
  under 2zt (the tie mix reads it). `composite()` never reads an uncomputed surface (a float32 simulation of 40000
  cases in the test). Exact, but slower on the Pixel: `SORD(lzI)` indexes the surface arrays dynamically.
- `fs` (exact face skip, letter `F`): stage 8's face skip without its break. Each face's `band2` is taken once
  (`fb`) and the face is skipped when `!(fb > v)`; its value `(1 - bur) * fb` (tangent: `* ss(...)`) has every
  factor in [0, 1], so a skipped face cannot beat the running maximum under any rounding or FMA, ties kept.
- `fs "c"` (letter `Fk`, now in GF_TIERS): fs in the corner programs only. `cornerPlan` (gf_pass.ts) drops it from
  the corner-free program, which fat's frames draw, so that program is the shipped one's text.
- Bench attribution (`k1362s13_entry.ts`): `strm` streams the faces in sorted order into the composite (no sv/sa,
  no tie mix, stop once opaque). It is inexact and bounds what any cell-order form could save. `nolay` (stage 11)
  drops the layering.
- `test/render/gf_tier_forms.test.ts`: lz's and fs's text against the plain tier on 7 and 6 bases, the probe
  untouched, lz's no-uncomputed-read simulation, the refused combinations; fs "c"'s plan (the corner-free text
  equals the plain tier's); the GF_TIERS pin.

### Checks

- Against full on the 12 scenes at 822: desktop lz, fs and lz+fs 0 px and 0 unwritten (`desk_cmp_lz.json`,
  `desk_p13b.json`), fs "c" too (`desk_p13c.json`, 24 rows); Pixel lz (`phone_p13a.json`), fs and lz+fs
  (`phone_p13b.json`, 36 rows) and fs "c" (`phone_p13c.json`, 24 rows) 0 px and 0 unwritten; the CPU mirror equal.
- The app with rp=gf and VERIFY=1 on three links (`b.FMKB4DIQ`, `3.FGH1HtvQeDjm6e4BII`, `p9ar6.FMKB4DIQ`, am=instant):
  0 errors, the worker ready, no fallback, 0 mismatches (247 / 366 / 237 verified).
- Table digest unchanged: `all ae1d23920dd9bd6f7614e7bf3ca3c1893537de7bd76640b41b34494865a85a27 lines 5445`; no
  table changes.
- `npm test` green (3002 passed, 18 skipped); goldens unchanged.

### Before / after on the Pixel (ms @ MHz; sync4 net of empty, frame1 gross)

p13c (`phone_p13c.json`, one bench; def / muse_hash / fat; sync4 cells @1286 unless marked):

| bench | t32rlgyjfc3 | aid@ repeat | t32rlgyjfFkc3 | aid@ repeat |
|---|---|---|---|---|
| sync4 822 | 12.50 / 16.63 / 7.25@1094 | 12.60 / 17.20 / 6.80 | 12.05 / 16.50 / 7.03 | 11.88@1190 / 16.90 / 7.05 |
| frame1 822 | 15.00@748 / 20.00@1094 / 17.80@460 | 16.90@748 / 18.00@1017 / 17.90@460 | 16.60@748 / 19.90@940 / 18.20@460 | 16.70@825 / 19.00@1017 / 18.00@460 |
| sync4 1080 | 16.80 / 23.45 / 9.50 | 17.08 / 22.90 / 9.68 | 16.68 / 22.57 / 10.10 | 15.95 / 22.82 / 9.72 |
| frame1 1080 | 19.40@883 / 26.40@1094 / 16.40@883 | 18.80@1017 / 28.60@1286 / 15.80@748 | 17.40@883 / 25.00@1094 / 18.00@614 | 19.80@940 / 26.30@1286 / 15.50@614 |

frame1 is the governor's (460-1286 MHz in one column), so the sync4 rows decide. The gains are about 0.5 ms, so
p13d (`phone_p13d.json`) repeated sync4 three times in the reverse order (Fk first): def 822 Fk 11.90 / 11.97 /
12.18 against 12.68 / 12.53 / 12.60, muse_hash 822 16.27 / 16.43 / 16.68 against 16.90 / 17.25 / 17.18. Pooled
(sync4 at 1286, p13b's fs and p13c-p13d's Fk, which draw the same corner program; 7 runs each):

| scene | 822 before | 822 after | 1080 before | 1080 after |
|---|---|---|---|---|
| def | 12.55 (12.35-12.68) | 12.01 (11.88-12.18) | 16.66 | 16.35 |
| muse_hash | 17.03 | 16.50 | 23.25 | 22.76 |
| fat (same program) | 7.03 | 7.07 | 9.79 | 9.73 |

Every Fk def run at 822 is below every base run. fat's frames draw the corner-free program, and with fs "c" that is
the shipped program's exact text (test-asserted), so fat cannot be slower: its spread (6.80-7.25, 9.40-10.22) is
run-to-run noise. 1080 def gains only about 0.3 ms.

### Desktop beside it (ANGLE D3D11, sync4 net ms; def / muse_hash / fat)

| variant | 822 | 1080 |
|---|---|---|
| t32rlgyjfc3 | 0.68 / 1.13 / 0.40 | 0.85 / 1.30 / 0.53-0.55 |
| lz (t32rlgyjfLc3) | 0.70 / 1.10 / 0.38 | 0.85 / 1.30 / 0.55 |
| fs (t32rlgyjfFc3) | 0.68 / 1.07 / 0.40 | 0.80 / 1.27 / 0.55 |
| lz+fs (t32rlgyjfLFc3) | 0.70 / 1.10 / 0.40 | 0.82 / 1.25 / 0.55 |
| t32rlgyjfc3 (p13c) | 0.68 / 1.15 / 0.38 | 0.85 / 1.30 / 0.55 |
| fs "c" (t32rlgyjfFkc3, p13c) | 0.65 / 1.10 / 0.38 | 0.82 / 1.27 / 0.55 |
| strm (attribution) | 0.68 / 1.07 / 0.38 | |
| nolay (attribution) | 0.38 / 0.68 / 0.20 | |

### Attribution

Pixel, sync4 at 822 (p13a, p13c):
- `nolay` (no layering at all): def 5.77@1094, muse_hash 8.25@1286, fat 5.58@1017 against 12.35 / 16.77 / 7.53@1094:
  the layering is about 6.5 / 8.5 / 2 ms.
- `strm` (no per-surface state, no tie mix, the same faces): def 12.47 and 12.30 against 12.50 and 12.60 (p13c, all
  but one at 1286), muse_hash 16.60 and 16.38 against 16.63 and 17.20; fat 6.38 and 6.23@1190 against 7.25@1094 and
  6.80. What a cell order could ever take out of def and muse_hash is about 0.2-0.4 ms, fat about 0.5; p13a's def
  12.13@1094 was the outlier. So the layering's cost is its face loop (and the entry and sort), not the state a cell
  could carry: consistent with stage 11's face loop at about 4.2 of 6.2 ms.
- `fs` saves face-loop work in the corner program (def and muse_hash, about 0.4-0.5 ms); without corners (fat's
  frames) it was 0.2-0.5 ms slower (p13b), so `fs "c"` leaves that program as shipped.

### What the next stage needs

- The cell order is closed: the per-surface state is worth at most about 0.3 ms, and the ceiling stays below 100%.
- What is left in def's 12 ms on the Pixel is the face loop's work for the surfaces that are drawn, and the corner
  code. Stage 12's second lever, the corner cells' own loops (def's corner cells 8.17 ms against 5.72 for its
  corner-free ones, stage 12), was not reached here, and is the next lever: the corner faces in layers() and the
  scan's keep loop (stage 11: about 2.25 and 1.6 ms of def).
- 8 ms at 822 on def is still about 4 ms away.

### Tools

- `node .claude/probes/K1362/k1362s13_run.mjs build`, then `... desktop <label> <cfg>` (writes
  `out/s13/desk_<label>.json`); `node .claude/probes/K1362/k1362s13_sum.mjs <json>` prints cmp rows and timings.
- Pixel, one call: `pwsh -NoProfile -File .claude/probes/K1362/k1362s13_phone_run.ps1 -Cfgs p13a|p13b|p13c|p13d -WaitMin 20`
  (lock, readiness wait, benches, cmp, cleanup); `node .claude/probes/K1362/k1362s13_tab2.cjs out/s13/gpuclk_<cfg>.json`
  prints ms@MHz.
- Coverage: `node scripts/run_node.mjs .claude/probes/K1362/k1362s13_cov.ts out/s13/cov_all.json [scenes] [w] [h]`.
- Tier names: `k1362s13_entry.ts`'s header (`L` = lz, `F` = fs, `Fk` = fs "c", after the `jf` letters, before
  `c<n>`).
- Configs: `k1362s13_cfg_p13a..p13d.json` (p13c is the before/after bench with the 24-row cmp; p13d the reversed
  sync4 repeats).

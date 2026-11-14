# K1362 stage 8: the pass's fixed cost, then def under 8 ms on the Pixel

Ledger: K1362 (and K1376, the fixed cost). One Claude Opus agent in its own worktree, on its own branch from master.
Cap 2 h. Read first: the stage 7 handoff and its "Pixel results" addendum at the end of
`docs/design/K1362_s7_two_pass.md`; the stage 6 handoff (`K1362_s6_footprint.md`, the cost split); "How the result is
judged" in `docs/design/K1362_s1_gpu_formb.md`.

## Where it stands

On the Pixel at 822x1506 and 1286 MHz (sync4), t32r is def 16.0-16.3 ms, muse_hash 22.5-22.7, fat 11.4-11.7, exact.
Stage 7's two-pass split is exact on the Pixel too but gains only 1-2 ms there, and its pass 1 alone (the scan, keys
and piece write) is already 8-11 ms. So the split is not the route: t32r stays.

The new lead: t32r's time is linear in canvas pixels with a large intercept. Over 617x1130, 822x1506 and 1079x1977
(0.70 / 1.24 / 2.13 Mpx), def is about 8 ms + 6.6 per Mpx, muse_hash about 9-10 + 10, fat about 3-4 + 6. The
desktop shows it too (617 keeps 74% of 822's time at 56% of the pixels). The timed loop excludes uploads and
subtracts an empty variant, so the intercept is the program's work. Half of def's time does not scale with the
canvas, and nothing explains it yet (K1376).

## Goal

The pass at or under 8 ms on the Pixel for def at 822x1506 and full clock, muse_hash as low as it goes, output exact as
stage 4 defined it (0 px against the full program on the 12 scenes and on both GPUs; the CPU mirror check). You own
the technique. The order is suggested, not required:

1. **Find what the intercept is.** Ideas, none tested:
   - Per-pixel work that grows as pixels get bigger in world space (a search radius, AA or ramp band, or bin
     margin set in screen pixels, so a coarser canvas visits more candidates per pixel). Count it: loop trips per
     pixel (candidates, keys, pieces, ramps) at the three sizes, on the desktop, without the phone.
   - Fetch locality: a tile of coarse pixels touches more distinct table texels. Test on the Pixel by drawing a crop
     of the 822 frame at the SAME pixel density (scissor or a smaller viewport) against the whole frame at a lower
     density. If the crop scales with its area, the intercept is a density effect.
   - A fixed per-draw or per-tile cost that the empty variant does not share.
2. **Cut whatever dominates**, exactly. If layering dominates, stage 7's layering-once fold (its handoff design
   note) applies. If the scan dominates, look at the scan's floor in stage 1.

Measure on the phone as stages 4 to 7 did (sync4 and frame1, the GPU clock beside every number), and report what did
nothing too. If def still misses, say what the remaining (b) fix is, or prove (c).

## Done

1. The intercept explained, with the counts or the crop test that shows it.
2. The cut in `src/render/gpu_field/`, rp=gf still off by default, t32r replaced only if the new program is faster on
   def, muse_hash and fat on the Pixel. 0 px against full on the 12 scenes on both GPUs, the CPU mirror holds,
   `npm test` green, the goldens unchanged.
3. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and one other size), sync4 and frame1, with
   the clock, and the desktop beside it.
4. A one-call Pixel runner for every A/B you need (copy `.claude/probes/K1362/k1362s7_phone_run.ps1`), committed, so
   the coordinator can run it if the phone is not free during your window.

## Rules

- **The phone:**
  - Levi took it back at 12:30 on 2026-11-13. It is ready only when it is unlocked with the home screen (or Chrome) in
    front and untouched for 2 minutes. Do the desktop part first.
  - Never wake it, unlock it, rotate it, press Home or send it any input, and never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Run each phone part through the runner pattern: `phone_pass.ps1 -Phase start -WaitReady <min>` waits for the
    phone inside one blocking command. Wait at most 30 minutes per attempt. If the phone is still not ready, stop the
    phone part, commit the runner and say so in the report.
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone part,
    and release it between parts. No other agent uses the phone.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a whole
  file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view images.
  Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any directory,
  delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** `gf_glsl.ts`, `gf_pass.ts`, `gf_pack.ts`, `gf_keys.ts`, `gf_reg.ts`, `gf_split.ts` and new files in
  `src/render/gpu_field/`; `test/render/gf_*` except `gf_build.test.ts`; `.claude/probes/K1362/k1362s8_*` (copy stage
  7's `k1362s7_*` tools as needed). Stay out of `tables.ts`, `gf_build.ts`, `gf_worker.ts` and `gf_app.ts`, and keep
  `GfTables`' fields and layout as they are. The tables stay bit-identical (`k1362t1_digest.ts`).
- **Untracked inputs** (scenes, drags, stage 7's outputs) are in the main checkout's `.claude/probes/`. Copy what you
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
- what the intercept is, and the evidence;
- the before/after table with the clock (or, without the phone, the desktop table and the runner to use);
- each change's effect, the exactness checks;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

## Handoff (stage 8 agent, started 2026-11-13 12:35:22, stopped 13:37)

Stopped at Done items 1, 3 and 4. Item 2 has no cut: nothing exact was faster on all three scenes on the Pixel, so
t32r stays (`GF_TIERS` unchanged, rp=gf off by default, tables untouched). The goal (def <= 8 ms) is missed.

**The intercept is not a fixed cost: it is mostly density.** On the Pixel, a pass has a real fixed cost of about
1-2 ms. Most of the rest of the "8 ms" comes from per-pixel cost that rises as pixels get coarser in world space.
- *Crops at the same density* (Pixel, 822, sync4, net of empty's crop). def's whole frame is 15.9 ms. Its four
  quadrants sum to 21.5 and its two halves to 18.1, so each extra pass costs about 1.9 ms (muse_hash 2.2, fat 1.9).
  A quadrant is 0.31 Mpx at 822's density and costs about 5.4 ms. The whole 411 frame, with the same pixel count
  at half the density, costs 10.2. After the per-pass cost, a pixel at half density costs 2.0x as much. The desktop
  shows the same at 1.7x (411 whole 0.60 ms, an 822 quadrant 0.35).
- *Tiny crops* (8x7 px, cfg p8c) measure the per-pass cost directly: t32r about 1.1-1.3 ms at 822 (noisy, +-0.5).
  - The route alone (`emptyS`: depth-stencil clear and two discarding draws) is 0.4-1.0, at the idle 460 MHz clock.
  - The full program's draw adds about 0.1-0.6 per pass (`tE`, the tier with a discarding last program: def 15.6
    against t32r 16.3, muse_hash 21.6 against 22.5, fat equal).
  - On the desktop the per-pass cost is 0.1-0.15 ms.
- *Counts* (desktop, `cnt`, at 617 / 822 / 1079). The trips per lane barely move with density: nSeg 21.4 / 20.4 /
  19.7. The 8x8-tile maxima do move: nSeg 33.2 / 30.1 / 27.7, nL 3.07 / 2.52 / 2.12, nPd (burial) 12.1 / 8.3 / 6.2.
  - Under a group-max cost model, nPd's total is about 60% intercept and nL's about 30%, against about 7% for the
    per-lane counts.
  - So the divergence of the burial and layer loops grows with each group's world span. Fetch locality (a coarse
    tile touches more table texels) would give the same constant-in-pixels term. It is not separated from
    divergence here.
- *Attribution across sizes* (Pixel, def, sync4; the `a*` variants are inexact, for timing only).
  - Layering (t32r minus `anolay`) is 5.4 ms at 411, 10.0 at 822 and 14.0 at 1079: about 3.9 ms + 4.7 per Mpx.
  - Everything else (`anolay`) is 4.8 / 6.0 / 7.7 ms, which is mostly intercept. Its clocks were 883 / 1094 / 1286,
    so the clock inflates the small sizes.

**The Pixel table** (net ms @ GPU MHz; the empty pass runs at 460). The 822 figures are from p8a and the 1079x1977
ones from p8b. Desktop figures are from the RX 6800 XT under ANGLE D3D11, with `dtab` on the same build.

| scene, mode | 822 t32r (before = after) | 822 t32r1 | 822 t32rb | 1079 t32r | 1079 t32r1 | 1079 t32rb | desktop t32r 822 / 1079 |
|---|---|---|---|---|---|---|---|
| def sync4 | 15.95@1286 | 16.48@1286 | 15.82@1286 | 21.65@1286 | 22.50@1286 | 21.20@1286 | 1.025 / 1.425 |
| def frame1 | 19.60@883 | 18.80@1017 | 19.20@883 | 26.90@1190 | 26.70@1094 | 24.80@1094 | 5.0 / 6.9 |
| muse_hash sync4 | 22.35@1286 | 23.57@1286 | 22.05@1286 | 30.70@1286 | 31.02@1286 | 30.13@1286 | 1.65 / 2.05 |
| muse_hash frame1 | 26.30@1094 | 26.50@1286 | 25.20@1286 | 34.10@1286 | 34.50@1286 | 33.00@1190 | 7.9 / 10.2 |
| fat sync4 | 11.57@1286 | 11.50@1286 | 11.42@1286 | 16.20@1286 | 16.25@1286 | 16.43@1286 | 0.75 / 1.05 |
| fat frame1 | 16.80@825 | 15.40@883 | 14.80@748 | 18.70@940 | 17.70@1094 | 18.80@1190 | 3.4 / 5.1 |

More sizes, all t32r at sync4:
- 411x753: def 10.17, muse_hash 12.20, fat 5.35@1094.
- 617x1130: def 12.15, muse_hash 16.57, fat 7.88.
- Pixel fit for def: about 8.2 ms + 6.2 per Mpx.

**What was tried** (the tier forms are in `gf_glsl.ts`, bench only; the tests are in `test/render/gf_tier_forms.test.ts`):
- `one` (t32r1): pixels with nr == 0 run a copy of the configuration loop's body under a constant trip count.
  - Exact: 0 px against full on all 12 scenes on both GPUs.
  - Slower at sync4 on def and muse_hash on the Pixel (+0.5 and +1.2 ms at 822), and +0.05 on the desktop.
  - The loop's copy still sets the program's registers. The compile-time single configuration (`aonce`, inexact)
    saves 2.35 ms (def) and 3.7 (muse_hash) at 822, while a runtime single trip (`aoncer`, the bound on stage 7's
    layering-once fold) saves only 0.75 and 1.6. So most of the "once" gain is code shape, not trips.
- `bx` (t32rb): the burial's early exit.
  - Desktop: exact, 0 px on 12 scenes.
  - Pixel: 8-97 px against full on 11 of 12 scenes. Its compiler evidently forms the value and the check
    differently (fused or reordered).
  - Gain: 0.1-1.2 ms at 822, but fat is +0.2 at 1079 sync4.
  - Not adoptable. A conservative relative margin in the check might make it exact, but the gain is too small to
    chase.
- Bounds at 822 (inexact cuts): no burial (`anobur`) -1.9 (def) / -2.2 (muse_hash); no layering (`anolay`) leaves
  5.95 / 8.65.

**Verdict.** In-shader tweaks cannot reach 8 ms for def; this is (c) for the per-pixel layering as written. With the
layering removed entirely (`anolay`), def is 5.95 ms at 822. So 8 ms needs layering at about 2 ms, against 10 now: a
5x cut. Every measured cut (once, burial, the fold, bx, one) bounds at a few ms together. The remaining (b) is
structural: take the layering out of the per-pixel program. Resolve each bin's or cell's face order and burial on the
CPU into the tables (the per-cell work is constant in pixels, which is the intercept's own shape), and have the shader
read the order. That touches `tables.ts`, `gf_pack.ts` and `gf_build.ts`, under the tables' bit-identity gate (a new
gate argument, `K1362_t1_muse_tables.md` addendum 2). A cheaper first probe for the next stage: separate fetch
locality from divergence on the Pixel with a 2x2-replicated map at 822 (each 2x2 block evaluates one world point).

**Runner** (one call; it waits up to -WaitMin for the phone, holds the phone lock and releases it):
`pwsh -NoProfile -File .claude/probes/K1362/k1362s8_phone_run.ps1 -Cfgs p8a,p8b -WaitMin 25`. The cfgs are
`k1362s8_cfg_*.json`:
- p8a: 822 with crops, attribution and 411 / 617.
- p8b: 1079 and cmp12.
- p8c: per-pass, with tiny crops.
- dtab: the desktop table, run through `k1362s8_run.mjs desktop <label> <cfg>`.

Outputs go to `out/s8/` (untracked).

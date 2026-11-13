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

## Handoff (stage 5, 2026-11-13, start 02:06:35, stop 03:23)

**Not done: def and muse_hash are still over 8 ms.** No default changed: rp=gf stays off and still routes by t32r
(`GF_TILE_CELLS = 0`). Every routing lever built here is exact where it claims to be, and every one loses on the Pixel.

**Built** (all in `src/render/gpu_field/`):
- `gf_tiles.ts` `buildTileRoute`: world tiles of tc x tc cells, classified from the tables to `GF_TILE_TIERS` (11, 22,
  32r) or full. opt 0 is an exact bound: every pixel of a tier tile fits the tier. opt 1 and 2 are optimistic.
- `gf_pass.ts` tile modes (`GF_TILE_CELLS` tc, `GF_TILE_FALLBACK` fb):
  - fb 0: the exact route as instanced quads;
  - fb 1 / 2: optimistic quads plus a stencil fallback to full;
  - fb 3: a stencil mask, exact. A color-masked draw writes class+1 per tile, then each program draws fullscreen behind
    EQUAL class+1 / KEEP;
  - fb 4: the mask over the optimistic classes with no fallback. Bench only, NOT exact.
- `gf_glsl.ts`: `GF_TILE_VS` and `GF_MASK_FS`.
- `test/render/gf_tiles.test.ts`: the route against the CPU mirror (4 scenes; tc 1, 2, 4; opt 0, 1, 2).
- Probes `.claude/probes/K1362/k1362s5_*`: run, entry, sum, gpuclk, route and the cfgs. A bench variant is
  `g<tc>[f|F|m|M][_tiers]`; for example `g4F_32r`, or `g4m_` for full only.

**Pixel** (net ms at the p50 GPU clock; s5a run; thermal status 0). The four cells per row are sync4 / frame1:

| scene, canvas | s4 t32r | s5 t32r | s5 full (sync4) | best tile route (exact) |
|---|---|---|---|---|
| def 822x1506 | 19.65 | 20.18@1286 / 22.4@1017 | 33.3 | g4f 26.07@1286 / 29.3@1286 |
| muse_hash 822x1506 | 24.6 | 24.57@1286 / 28.7@1017 | 41.7 | g2f 34.75@1286 / 38.0@1286 |
| fat 822x1506 | 11.8 | 12.0@1286 / 18.2@748 | 21.28 | g8F 15.05@1286 / 18.1@825 |
| def 1079x1977 | 26.7 | 26.6@1286 / 31.8@1286 | 45.67 | g8F 36.95@1286 / 39.8@1286 |
| muse_hash 1079x1977 | 33.75 | 34.77@1286 / 39.8@1286 | 60.0 | g4F 49.9@1286 / 56.0@1286 |
| fat 1079x1977 | - | 17.15@1286 / 19.7@940 | 31.38 | g8F 20.82@1286 / 25.4@883 |

Repeat runs s5b-s5d: t32r def 18.7-19.75, muse_hash 24.38-24.6 at 1286 MHz.

Desktop, the same benches (sync4, def / muse_hash / fat):
- t32r 1.20 / 1.77 / 0.75;
- full 1.20 / 1.67 / 0.85;
- exact mask g8m 1.30 / 1.88 / 0.95;
- the g2M ceiling 1.05 / 1.65 / 0.65 (not exact).

**Levers** (observed unless marked):
1. **Optimistic tiles plus the stencil fallback (fb 1, 2):** slower than t32r in all 6 cells above. Attribution, def
   822 sync4 (s5b):
   - `g4F_` (quads over the reached tiles, full program only) 36.05 against fullscreen full 31.9. The quads cost
     about 4 ms more than skipping the unreached half of the canvas saves.
   - `g4F_32r` 24.85 against t32r 19.4.
2. **The exact stencil mask (fb 3):** 0 px but slow (def 822 sync4: g4m 74.85, g8m 41.82). In s5d, `g4m_` (mask,
   full only) read 33.15 against full 32.88, so the mask draw costs about nothing. But `g4m_32r` read 52.9, about tier
   everywhere plus full everywhere.
   - Observed: on the Pixel, a program behind EQUAL class+1 over a mask laid by a color-masked draw is not rejected
     before shading, while t32r's EQUAL 0 behind the tier's own writes is.
   - Not isolated. Candidates: ref 0 against nonzero, the color-masked mask draw, the write order.
3. **The mask over the optimistic classes (fb 4, the ceiling for a perfect tile class):** 44.42 on the Pixel. On the
   desktop, 1.05 against t32r 1.20 (-12%).
4. **The tile bound is loose.**
   - def tc 4: 1198 of the 1255 reached tiles are full, every one for 'pieces unbounded' (sigma 0.817, about 2 rc, on
     5.2 px cells).
   - Exact-bound shares, def g2: tiers 0.062 / 0.015 / 0.033, full 0.798, empty 0.092.
5. **The per-pixel ceiling** (`k1362s5_route.ts`: the CPU mirror at every 3rd pixel, 822x1506), shares of the canvas:
   - def: 11 / 22 / 32r / full / empty = 0.185 / 0.113 / 0.030 / 0.001 / 0.671;
   - muse_hash: 0.143 / 0.185 / 0.062 / 0.000 / 0.610.
   - So t32r already sends 99.7% (def) / 100% (muse_hash) of inked pixels to its one tier. Routing of any kind can only
     move pixels from p3/k2 to a smaller tier. Stage 4 measured that a routed middle program tests late on the Pixel.
6. **Route CPU:** 20-70 ms on the Pixel's main thread, 15-45 ms on the desktop in page.

**Exactness:**
- 0 px against full on 12 scenes on both GPUs for every exact variant (g*f, g*F, g*m, g*m_32r, t32r):
  - desktop: cmp12;
  - Pixel: s5a, 84 compare lines; s5c, g4m and g8m.
- The CPU mirror holds: [n, 0, 0, <1e-3] on every scene.
- `gf_tiles.test.ts`: 0 violations.
- `npm test` is green with the goldens unchanged.
- fb 4 differs (def 15141 / 9163 / 7457 px for g2M / g4M / g8M), as it must: bench only.

**Verdict: def reaches after these fixes. muse_hash needs one more, (a) or (b).** Every fix is (b) implementation; no
(c) argument exists (the desktop runs the same program at 1.2 / 1.8 ms). Routing is spent (lever 5), so what is left is
the tier program itself: about 1 fixed + 4.5 scan + 3.7 keys + 10.5 layering for def. The fixes, with their effect at
822x1506 and full clock:
1. Stage 4's list: layering once (-1.8); packed state or the two-pass split (-5 to -7); scan and keys to stage 1's
   floor (-0.8 / -1.0). Together: about 12 / 15.
2. Keys per tile, not built: each tile's key list carried in the tables (built off main, beside K1362 c1). The
   per-pixel program then holds no key array. Estimated about -2 to -3 on what fix 1 leaves of the keys' 3.7.
3. A distance pass that is not per pixel, not built: distances at cell resolution, interpolated. Estimated about -2.5
   to -3.5 on what fix 1 leaves of the scan's 4.5.

These estimates are breakdown arithmetic, not measurements:
- def comes to about 6-8;
- muse_hash comes to about 8.5-10, so it needs one more fix: (a) dpr 1 (stage 4: t32r 13.8, proxy floor about 7;
  Levi's call), or a (b) not yet identified.

**Next stage:**
- Build fix 2 first and measure it. It is the largest unmeasured term, and its tables can ride on c1's CPU work.
- Then the two-pass split.
- Drop tile routing on the Pixel (levers 1-5).
- If the stencil route is ever revisited, test lever 2's late-test question first: a nonzero ref, and a mask laid
  with colors on.

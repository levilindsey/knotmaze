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

# K1362 stage 10: the tier's per-piece arrays, def under 8 ms on the Pixel

Coordinator brief, 2026-11-13. Stage 9's brief and handoff: `K1362_s9_layer_tables.md` (its addendum has the Pixel
A/B this stage starts from). Earlier stages: `K1362_s4_shader.md` (tiers), `K1362_s6_footprint.md` (what was slower
on the Pixel), `K1362_s8_intercept.md`.

## Where it stands

- rp=gf is off by default. `GF_TIERS` (gf_pass.ts) is t32rlc3 since be627d55: p3/k2 with ramps, surfaces capped at 3
  (`s`, overflow routed to the full program), the label's top surface kept as a running best (`lab`). On the Pixel
  (822x1506, sync4, 1286 MHz) that is def 13.95 / muse_hash 18.38 / fat 9.33 ms against t32r's 16.85 / 22.45 / 11.5,
  at 0 px on the 12 scenes on both GPUs.
- The Pixel's cost follows the per-pixel register footprint, not the work done (stages 4 and 9): taking the surface
  arrays from 8 x 5 slots to 5 x 3 gained 17-19%; cutting work without shrinking arrays (`fast`) gained nothing.
- What the tier still carries (`gf_glsl.ts`, around line 212): 11 arrays per piece (pc, ps, pd, pfx, pfy, plo, phi,
  pkey, pg, pramp, psurf) at MAXP 3, so 33 slots, and 4 per corner key (kk, krho, kIn, kSec) at MAXK 2, so 8.
- Slower on the Pixel already (stage 6, `gf_reg.ts`): the register form, constant trip counts, and packing per-piece
  state into an ivec4 group. Desktop gains do not predict the Pixel; only a Pixel number decides.
- Not yet measured on the Pixel (a touch cut the run): the attribution `att822` (which part of the layering costs,
  and probe 1 `aquad`, the divergence) and the 1079x1977 canvas `f1080`. Both are in
  `.claude/probes/K1362/k1362s9_cfg_p9e.json`: `pwsh -NoProfile -File .claude/probes/K1362/k1362s9_phone_run.ps1
  -Cfgs p9e -WaitMin 25`, about 6 minutes on a ready phone.

## Goal

def at most 8 ms at 822x1506 on the Pixel, exact. The technique is yours. Where to start:
1. Run p9e on the phone as soon as it is ready (do the desktop work while you wait); its att822 rows say which part
   of the program to shrink first.
2. The per-piece footprint: keep fewer values live across the layering. For example, rebuild pd, pfx and pfy from the
   nearest segment's index when they are needed (stage 7's pass 2 did this with `pkq`), drop or merge fields a later
   phase can recompute, or route pixels with more pieces to the full program as `s` did for surfaces (measure the
   coverage it gives up).
3. Whatever att822 names, if it is not the footprint.

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32rlc3 is replaced only if the new program is
   faster on def, muse_hash and fat on the Pixel at 1286 MHz. 0 px and 0 unwritten against the full program on the 12
   scenes on both GPUs, the CPU mirror holds, `npm test` green, the goldens unchanged, and every existing table field
   bit-identical (the digest in `.claude/probes/K1362/k1362t1_digest.ts`; if a table must change, stop and write the
   gate argument `K1362_t1_muse_tables.md` addendum 2 asks for instead).
2. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and 1079x1977, sync4 and frame1, with the
   clock), the desktop beside it, and att822's rows for t32rlc3 on the Pixel. A one-call Pixel runner for every A/B,
   copied from `.claude/probes/K1362/k1362s9_phone_run.ps1`.

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
- **Your files:** everything in `src/render/gpu_field/` except `gf_app.ts` (tables under Done 1's gate);
  `test/render/gf_*`; `.claude/probes/K1362/k1362s10_*` (copy stage 9's `k1362s9_*` tools as needed).
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
- what the tier stopped carrying, and why it is still exact;
- att822's rows on the Pixel, and the before/after table with the clock;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

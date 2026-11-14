# K1362 stage 12: the face loop and the corners, def under 8 ms on the Pixel

Coordinator brief, 2026-11-13. Stage 11's brief and handoff: `K1362_s11_layer_state.md` (every number below is from
its handoff). Earlier: `K1362_s8_intercept.md` (density, the per-cell layering idea), `K1362_s9_layer_tables.md`,
`K1362_s10_piece_arrays.md`, `K1362_s4_shader.md` (tiers and the stencil rules).

## Where it stands

- rp=gf is off by default. `GF_TIERS` (gf_pass.ts) is t32rlgyc3. On the Pixel (822x1506, sync4, 1286 MHz) def is
  12.0-12.9 ms, muse_hash 16.5-17.5, fat 8.3-8.7. 0 px on the 12 scenes on both GPUs.
- Without the layering (`nolay`) def is 5.9-6.1, so 8 ms needs the layering at about 2 ms against 6.2 now.
- Stage 11's attribution on the Pixel (def / muse_hash / fat, cuts inexact, timing only):
  - The face loop is about 4.2 ms of def's layering (`noface` 7.82 / 11.47 / 6.57). Inside it, piece burial is 0.7,
    and corner burial with tangents (kb + kf + tan) about 1.0. The rest is the per-surface walk over pieces and the
    band2 / depth arithmetic.
  - The corner code costs 3.1-3.8 ms of def (`nocorn` 8.5-9.0 / 13.4-14.6 / 7.3-7.5). layers()'s corner use is about
    2.25 (`nolk`), the scan's keep loop about 1.6. fat has no corners and still pays 0.8-1.2: compile shape.
  - Divergence (`quad`) is 1.1 / 1.7 / 0.4.
- What did not pay on the Pixel:
  - folding per-surface or corner-key state (stage 11's v, a, d, e);
  - packing two arrays into one, or recomputing a value in a hot loop (stage 10);
  - cutting layers()'s corner key loop alone (`nokey`: 1.05 ms slower);
  - a MAXK 1 tier (routes 2.7% of def to full, +3.75 ms);
  - stage 8's burial exit `bx` (inexact on the Pixel).
- Desktop gains do not predict the Pixel. Run noise is about ±0.5 ms on def; repeat a variant as `aid@<tier>`.

## Goal

def at most 8 ms at 822x1506 on the Pixel, exact. The technique is yours. The levers, largest first:
1. **The face loop.** Make it cheaper per pixel: walk fewer pieces per surface, order the walk so neighbouring pixels
   take the same branches (divergence), or resolve what a bin's or cell's pixels share on the CPU into additive tables
   the loop reads (stage 8's suggestion; stage 9 measured only a one-piece skip).
2. **The corners in the tier.** def and muse_hash need corners in the tier (k1 above), so shrink what the corner code
   costs there; stage 11's kprune list (ring-aware corner lists, 19% / 29% fewer entries) is one input.
3. **A cornerless program for a frame whose tables hold no corners.** It is exact, and takes back fat's 0.8-1.2 ms
   with the corner code compiled out (k0 sized to zero does not compile). The program choice is in `gf_app.ts`, which
   is in your files this stage. A per-pixel route to such a program is a different matter: a middle program that
   writes the stencil through `discard` shades every remaining pixel (stage 4), and scattered pixels sent to full cost
   far more than their share (k1). Measure any route before building on it.

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32rlgyc3 is replaced only by a program that is
   faster on def, muse_hash and fat on the Pixel at 1286 MHz in one bench, with a repeat when the gain is under
   0.5 ms. A per-frame choice counts per scene: no scene slower.
   - 0 px and 0 unwritten against the full program on the 12 scenes on both GPUs, and the CPU mirror holds.
   - `npm test` green and the goldens unchanged.
   - Every existing table field bit-identical (the digest in `.claude/probes/K1362/k1362t1_digest.ts`). New tables are
     additive and built from the old ones, and count only with their build cost (desktop and the Pixel's build
     worker) and their bytes uploaded per rebuild. If an old field must change, stop and write the gate argument
     `K1362_t1_muse_tables.md` addendum 2 asks for instead.
2. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and 1079x1977, sync4 and frame1, with the
   clock), the desktop beside it, and the attribution rows behind the choice. A one-call Pixel runner for every A/B,
   copied from `.claude/probes/K1362/k1362s11_phone_run.ps1`.

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
- **Your files:** everything in `src/render/gpu_field/`, `gf_app.ts` included (tables under Done 1's gate);
  `test/render/gf_*`; `.claude/probes/K1362/k1362s12_*` (copy stage 11's `k1362s11_*` tools as needed).
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
- what changed in the face loop and the corner code, and why it is still exact;
- the attribution rows, and the before/after table with the clock;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

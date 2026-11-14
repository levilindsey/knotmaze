# K1362 stage 11: the layering's state, def under 8 ms on the Pixel

Coordinator brief, 2026-11-13. Stage 10's brief and handoff: `K1362_s10_piece_arrays.md` (every number below is from
its handoff). Earlier: `K1362_s9_layer_tables.md` (the surface cap, the running label, the per-bin tables idea),
`K1362_s6_footprint.md` (what was slower on the Pixel), `K1362_s4_shader.md` (tiers).

## Where it stands

- rp=gf is off by default. `GF_TIERS` (gf_pass.ts) is t32rlgyc3 since dd959bdc: p3/k2 with ramps, surfaces capped at
  3, the running label, the ramp group in psurf and the key in ps. On the Pixel (822x1506, sync4, 1286 MHz) def is
  11.5-11.7 ms, muse_hash 16.2-16.3, fat 7.9-8.3; 1079x1977 def 16.1. 0 px on the 12 scenes on both GPUs.
- Stages 4, 9 and 10 agree: the Pixel's cost follows the per-pixel state the program keeps, not the work it does.
  Removing an array pays (stage 9: surfaces 8 x 5 to 5 x 3, -17 to -19%; stage 10: per-piece 33 slots to 24, -8 to
  -11%). Cutting work without removing state (`fast`), packing two arrays into one (`lh`, `cs`) and rebuilding a value
  in the hot loop (`kq`) did not pay or were slower.
- The layering is about 6.2 of def's 11.7 ms: without it (`nolay`) def is 5.5. Yet no single part of it costs much:
  dropping tangents, kf, pb or gaps saves 0.3-0.9 ms each, all three of tan, kf and gap 0.8 ms, and keys 0 (att822,
  stage 10's handoff). So most of the layering's cost is what it holds per pixel, not one step of its work.
- Its state in the tier (`gf_glsl.ts`): per surface sid, skey, sv, sa, sord at MAXS 3 (15 slots); per corner key kk,
  krho, kIn, kSec at MAXK 2 (8); plus the label and winner scalars. Stage 10's `so` (sort without sord) and `kr` (kIn,
  kSec rebuilt) were equal within noise; `kl` (rho rebuilt too) was 1-2 px off on the desktop.
- Divergence: probe 1 `aquad` (each 2x2 block evaluates one world point; a probe, not an exact form) saves 1.0 / 1.7 /
  0.6 ms on def / muse_hash / fat.

## Goal

def at most 8 ms at 822x1506 on the Pixel, exact. The technique is yours. Where to start:
1. Measure where the layering's 6.2 ms goes: which of its state, once removed, frees the most on the Pixel (bench
   forms that drop one array at a time, exactness aside, as stage 4 and 9 attributed).
2. Remove that state exactly: fold values the program already holds, recompute outside the hot loops, or move what a
   bin's pixels share into tables the CPU builds (stage 9's original idea, never measured; additive tables only).
3. If the layering cannot drop under about 2.5 ms, the scan's 5.5 ms, or the divergence `aquad` shows.

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32rlgyc3 is replaced only if the new program
   is faster on def, muse_hash and fat on the Pixel at 1286 MHz in one bench. 0 px and 0 unwritten against the full
   program on the 12 scenes on both GPUs, the CPU mirror holds, `npm test` green, the goldens unchanged, and every
   existing table field bit-identical (the digest in `.claude/probes/K1362/k1362t1_digest.ts`; new tables are
   additive and built from the old ones; if an old field must change, stop and write the gate argument
   `K1362_t1_muse_tables.md` addendum 2 asks for instead). A new table counts only with its build cost (desktop and
   the Pixel's build worker) and its bytes uploaded per rebuild.
2. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and 1079x1977, sync4 and frame1, with the
   clock), the desktop beside it, and the attribution rows behind the choice. A one-call Pixel runner for every A/B,
   copied from `.claude/probes/K1362/k1362s10_phone_run.ps1`.

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
  `test/render/gf_*`; `.claude/probes/K1362/k1362s11_*` (copy stage 10's `k1362s10_*` tools as needed).
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
- what the layering stopped holding (or what moved to tables), and why it is still exact;
- the attribution rows, and the before/after table with the clock;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

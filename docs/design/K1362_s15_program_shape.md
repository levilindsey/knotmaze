# K1362 stage 15: a smaller program per pixel, def under 8 ms on the Pixel

Coordinator brief, 2026-11-14. Stage 14's brief and handoff: `K1362_s14_corner_loops.md`; before it
`K1362_s13_cell_order.md`, `K1362_s12_corners_faces.md`, `K1362_s11_layer_state.md`, and the two-pass split of
`K1362_s7_*.md`.

## Where it stands

- rp=gf is off by default. `GF_TIERS` (gf_pass.ts) is t32rlgyjfFkDc3. A frame whose cells list no corner draws the
  tier with the corner code compiled out. Other frames draw the corner tier with the exact face skips (`fs` "c",
  `kd`). Each is followed by the full program behind the stencil. Pixel, 822x1506, sync4, 1286 MHz, means of 10 runs:
  def 11.97 ms, muse_hash 16.45, fat 7.13. 0 px on the 12 scenes on both GPUs.
- **Six stages trimmed this one program.** They took def from 16.85 to 11.97 ms, and each later trim came out level.
  The cost follows the program's compile shape (register footprint, so occupancy), not the work it does:
  - stage 9: cutting work without shrinking arrays (`fast`) gained nothing;
  - stage 11: fat paid 0.8-1.2 ms for corner code it never ran;
  - stage 12: compiling the corner code out of corner-free frames took fat from 7.95 to 6.80 ms;
  - stage 14: halving the corner walks (`P`) was level. Corner-cell pixels keep 0 or 1 corners 93% of the time.
    None of the fetch cuts (G I H), reorders (T O) or the merged loop (M) beat the default.
- **Def's two halves** (stage 12, measured alone): corner-free cells (55% of pixels) 5.7 ms, corner cells 8.2.
  The whole frame is 12.0, which suggests about 2 ms is shared. The face loop is about 4.2 of the 6.2 ms of layering
  (stage 11).
- **Closed on the Pixel:**
  - packing, folding or recomputing per-piece state (stages 10, 11);
  - per-cell routing by stencil (+3 ms), tile quads (about 4 ms alone) and any route with scattered pixels sent to
    full (stage 5);
  - a MAXK 1 tier (+3.75 ms);
  - the per-cell layering order (stage 13);
  - `lz` and `bx`.
  The two-pass split (stage 7, `gf_split.ts`) was exact but gained only 1-2 ms; its pass 1 alone (the scan) was
  8-11 ms. Half of def's time does not scale with the canvas (K1376, cause unknown).

## Goal

def at most 8 ms at 822x1506 on the Pixel, exact. Another trim inside today's program is not the lever. Change the
program's structure so that the program every pixel runs is smaller. The technique is yours. Directions to weigh:
- move the corner contribution, or the face loop, into a pass of its own whose small per-pixel result the tier reads;
  stage 7 split the program along a different line;
- carry per-cell results from the gf build worker that remove a per-pixel loop;
- restructure the face loop so less state stays live across it;
- find a desktop proxy for the Pixel's register footprint, so forms can be ranked without the phone. For example,
  Imagination's offline GLSL ES compiler, but only if it downloads without an account.
Per-pixel piece identity and the u coordinate must stay recoverable (Levi plans further uses of the outline). Spend
the whole 2 h: a lever that does not pay is a result to record, then move to the next.

## Done

1. **The change** goes in `src/render/gpu_field/`, with rp=gf still off by default.
   - **When it may replace the default:** only if it is faster than t32rlgyjfFkDc3 on def and muse_hash on the Pixel
     at 1286 MHz, in one bench, with fat no slower. A gain under 0.5 ms needs an `aid@` repeat.
   - **Exactness:** 0 px and 0 unwritten against the full program on the 12 scenes on both GPUs. The CPU mirror holds.
   - **Tests:** `npm test` is green and the goldens are unchanged.
   - **Tables:** every existing table field stays bit-identical (the digest in
     `.claude/probes/K1362/k1362t1_digest.ts`). New tables are additive, built in the gf build worker, and count with
     their build cost and bytes. If an old field must change, stop and write the gate argument that
     `K1362_t1_muse_tables.md` addendum 2 asks for instead.
2. **The record:**
   - the before/after table on the Pixel: def, muse_hash and fat at 822x1506 and 1079x1977, sync4 and frame1, each
     with the clock;
   - the desktop beside it;
   - the attribution rows behind each lever tried;
   - a one-call Pixel runner for every A/B, copied from `.claude/probes/K1362/k1362s14_phone_run.ps1`.

## Rules

- **The phone:**
  - **When it is ready:** unlocked, the home screen (or Chrome) in front, and untouched for 2 minutes. Levi may take
    it back at any time, and its screen turns itself off while charging.
  - **Order:** do the desktop part first. Then run each phone part through the runner
    (`phone_pass.ps1 -Phase start -WaitReady <min>`), waiting at most 30 minutes per attempt. The watchdog stops a
    run at a touch: rerun only the benches that did not finish. If the phone is still not ready, commit the runner and
    say so in the report.
  - **Hands off:** never wake it, unlock it, rotate it, press Home or send it any input, and never restart Chrome on
    it. Open and close only your own tabs, through DevTools.
  - **The lock:** hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for
    each phone part, and release it between parts. No other agent uses the phone.
  - **Privacy:** keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- **Shell and reading:**
  - Use PowerShell.
  - Read code through the shell: Select-String, then 40-80 line ranges of Get-Content. Never print a whole file, and
    keep each tool output under about 40 lines.
  - Use the Read tool only right before an Edit, and to view images.
  - Junction `node_modules` from the main checkout; never run `npm ci` or `npm install`.
  - Before deleting any directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** everything in `src/render/gpu_field/` (tables under Done 1's gate); `test/render/gf_*`;
  `.claude/probes/K1362/k1362s15_*` (copy stage 14's `k1362s14_*` tools as needed).
- **Untracked inputs** (scenes, drags, earlier stages' outputs) are in the main checkout's `.claude/probes/`. Copy
  what you need; never write there.
- **Commits:**
  - WIP on your branch at each milestone, broken or not.
  - `git add -f` for tools, never for outputs.
  - Never push, never edit `LEDGER.md`, never touch the main checkout, and never kill a process you did not start.
- **Perf lock** for desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to
  time, and delete it after. If another owner holds it, wait inside one blocking command.
- **Stop:**
  - **When:** stop when Done holds or 2 h after your start, whichever comes first. Stopping early with Done unmet is
    not allowed. A lever that looks out of reach is not a stop: spend the time on the next most promising one.
  - **Clock:** run `Get-Date` at the start and write the time into your first commit message. Run it again at each
    milestone. Before stopping for the cap, check that 2 h have really passed.
  - **Write-up:** leave the last 20 minutes for it. Commit WIP, append a handoff to this brief with your start and
    stop times, release the phone lock, and report.
  - Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what the program stopped doing per pixel, and why the tier is still exact;
- the attribution rows, and the before/after table with the clock;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

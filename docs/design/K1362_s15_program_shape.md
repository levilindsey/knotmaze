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

## Handoff (stage 15, 2026-11-14)

Started 14:27:04 PT, stopped 16:08 PT. Done is NOT met: every lever is exact on the desktop, none is measured on
the Pixel (the phone was never ready: in use through all three attempts). `GF_TIERS` is unchanged (t32rlgyjfFkDc3); every new form is a
bench form behind a tier flag, off by default.

**The structure: depth classes (`zc`, tier suffix `Z`).** The tier splits into two programs per frame plan entry
(`cornerPlan`, gf_pass.ts): P0 is the tier without ramps and with one configuration, drawn first over every pixel
(depth ALWAYS, depth write on); it writes `gl_FragDepth` 0.5 where it drew, 0 for a pixel P1 must draw (ramping, or
a lever's route below), 1 for an overflow. P1 (the unchanged tier, depthRange(0,0), GEQUAL, no depth write) draws
only the depth-0 pixels; full (depthRange(1,1), LEQUAL) only the depth-1 ones. Exact by routing: every pixel is
drawn by exactly one program, and P0 sees every overflow P1 could hit (cfg >= 1 only merges surfaces). Three P0
levers on top, each exact by the same routing:
- `zb` (`B`): P0's burial loops become bound checks (`pd[m] - |h - X| - 0.25 aa >= h`, a ring overlap for keys:
  the triangle inequality says the face is unburied); a failed check sets `zbR` and breaks, and main routes it to
  P1 after the overflow test. P0 loses pieceD() at burial: PVR corner P0 86 -> 76 temps, 4715 -> 3079 cycles.
- `zk` (`K`): on a corner frame P0 is the FREE program with the corner scan cut to a route loop (a kept or
  through key routes the pixel; more than MAXK sets ovf); P1 there is the corner tier with surfaces uncapped,
  since P0 cannot see the corners' surfaces. Non-routed pixels have nk 0, no through key and no yield, the free
  program's constants. PVR P0 59 temps / 1778 cycles.
- `zf` (`S`): P0 keeps only stage 9's `layers1()` (one piece, no key, no ramp) and routes every other pixel, so
  layers() leaves P0: PVR free P0 38 temps / 1113 cycles, zk P0 41 / 1297. A free frame's P1 keeps s = p (np <= p
  there), a corner frame's runs uncapped.
- ANGLE lesson: a `return` inside layers()'s nested loops lost the context at draw (36061 FRAMEBUFFER_UNSUPPORTED).
  Route with a flag and `break`, and return from main.

**Attribution (PVR offline compiler, register footprint and static cycles; temps / cycles).** The compiler is
Imagination's free PVR compiler (Series B, BVNC 35.3.408.101), run by `k1362s15_pvr.ps1 -Dir <unpacked> <frags>`;
`k1362s15_cuts.ts <dir> [k=v,...]` writes inexact cut variants (footprint only, never drawn), `k1362s15_dumpfs.ts`
the real programs, `k1362s15_compile.mjs` links them on ANGLE.

| program | temps | cycles |
|---|---|---|
| today corner / free / full | 99 / 79 / 254 | 4881 / 1969 / 5419 |
| zc P0 corner / free | 86 / - | 4715 / - |
| zb P0 corner / free | 76 / 56 | 3079 / 1595 |
| zk P0 / its P1 (corner, uncapped) | 59 / 108 | 1778 / 4833 |
| zf P0 free / zk | 38 / 41 | 1113 / 1297 |

Cuts on zb P0 (temps, corner / free): no layering 48 / 38, no composite 72 / 52, no ring 72 / -, no tangents 74 /
-, no keys 74 / 56; on the zk P0 no layering 41, no keys 58 (cycles 1778 -> 1193). Layering is still the footprint
(76 -> 48); zf takes it out and pays in routed pixels.

**Routed share on the desktop (822x1506, the zm bench: pixels P1 draws).**

| | def | muse_hash | fat |
|---|---|---|---|
| DZc3 (ramps only) | 6.7% | 10.4% | 0 |
| DZBc3 | 12.0% | 13.3% | 0 |
| DZBKc3 | 28.1% | 24.7% | 0 |
| DZBKSc3 | 45.4% | 59.6% | 23.2% |

**Desktop (ANGLE D3D11, sync4 / frame1 ms; `desk_dtab1`, `desk_dtabK`, `desk_dtabS`; aid@ repeats equal).**

| variant | 822 def | 822 muse | 822 fat | 1080 def | 1080 muse | 1080 fat |
|---|---|---|---|---|---|---|
| Dc3 (default) | 0.65 / 3.50 | 1.07 / 5.60 | 0.40 / 2.30 | 0.80 / 4.50 | 1.23 / 6.60 | 0.55 / 3.10 |
| DZc3 | 0.72 / 3.80 | 1.20 / 6.10 | 0.45 / 2.50 | 0.93 / 5.00 | 1.43 / 7.40 | 0.60 / 3.30 |
| DZBc3 | 0.63 / 3.30 | 1.00 / 5.30 | 0.30 / 1.80 | 0.80 / 4.40 | 1.18 / 6.30 | 0.38 / 2.30 |
| DZBKc3 | 0.70 / 3.70 | 1.13 / 5.80 | 0.28 / 1.80 | 0.90 / 4.90 | 1.27 / 6.70 | 0.38 / 2.30 |
| DZBSc3 | 0.85 / 4.40 | 1.52 / 7.90 | 0.47 / 2.60 | 1.15 / 6.10 | 1.90 / 9.80 | 0.60 / 3.50 |

zb is the only form at or under the default everywhere on the desktop (fat -25%); the desktop does not predict
the Pixel (stage 6), and the PVR cycles favour zk (estimated per pixel, weighted by routed share: zb about 3665, zk
about 3131 against today's 4881 on a corner frame).

**Exactness.** cmp3 + cmp12 (`desk_cmp1`, `desk_cmpB`, `desk_cmpK`, `desk_cmpS`): DZc3, DZBc3, DZBKc3, DZBSc3 and
DZBKSc3 are 0 px and 0 unwritten against full on all 12 scenes, and the CPU mirror rows are unchanged. Not run on
the Pixel (queued in p15b). `npm test` green (tier-form tests for zc, zb, zk, zf in `gf_tier_forms.test.ts`),
goldens unchanged. The table digest is unchanged by construction: tables.ts, gf_pack and the gf worker are
untouched, and no lever adds a table.

**Pixel.** Not measured. Three runner attempts waited for the phone: p15a and p15b (to 15:48) and p15c (15:50-15:59,
a short cut: b822 Dc3 / DZBc3 / DZBKc3 / DZBKSc3 with an aid@Dc3, and cmp3). Each ended PHONE NOT READY (touches and an
app in front throughout); the runner released the phone lock each time, and no bench or tab ran. The s14 baselines
the forms must beat stand (sync4, 1286 MHz): 822 def 12.08 / muse_hash 16.80 / fat 6.72; 1079 16.65 / 22.03 / 9.63.

**Verdict and next.** The program now has a structure that can drop work per pixel class exactly; whether it pays
is a Pixel question. Next: run `pwsh -NoProfile -File .claude/probes/K1362/k1362s15_phone_run.ps1 -Cfgs p15b
-WaitMin 30` (Dc3, DZc3, DZBc3, DZBKc3, DZBKSc3 at 822 and 1079 with the clock, aid@ repeats of Dc3 and DZBc3, and
cmp3 / cmp12 on the Pixel for the zc forms; summarize with `k1362s15_tab2.cjs`). If a form beats Dc3 on def and
muse_hash at 1286 MHz with fat no slower and is 12/12 exact there, set it in `GF_TIERS[0]` (`zc: true, zb: true`,
plus `zk` / `zf` if they win). If none pays, the next lever is a P0 whose layering handles two pieces without the
general face loop (zf shows layering is the footprint, 76 -> 38-48 temps, but routing 45-60% of the canvas to P1
costs more than it saves on the desktop).

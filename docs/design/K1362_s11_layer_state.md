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

## Handoff (stage 11, 2026-11-13)

Start 21:17:19 PT, stop 22:25 PT. Branch `worktree-agent-a1b8e615d3284b37e` (worktree
`.claude/worktrees/agent-a1b8e615d3284b37e`). **GF_TIERS is unchanged (t32rlgyc3):** no exact candidate was faster
on def, muse_hash and fat in one bench at 1286 MHz.

### What was built (`gf_glsl.ts`, exact; off unless a tier name carries the letter)

- `v` (SVSID): a surface's sv lives in bits of its sid; no sv array.
- `a` (SGAP): the gaps gp0 and gp1 are taken after the sort, and sa goes into skey; no sa array.
- `d` (SCODE): the sort order is one int, 2 bits an entry (sordc), not an index array.
- `e` (KSGN, with KLEAN and KRHO): the scan keeps krho = rho, or -1 outside the sector; kSG rebuilds sec and kin from
  it, so layers() neither holds kin nor repeats the sector test.
- Tier names: `t32rlgy[v][a][d][e]c3` (`k1362s11_entry.ts` parseTiers); `test/render/gf_tier_forms.test.ts` checks
  each form lands in the tier's source and nowhere else.

Why it is exact: each form stores the same values in another shape (bits of an int, one array for two, a sign for a
boolean) and reads them back bit for bit; the tier overflows to full on exactly the pixels it did.

### Checks

- Desktop (RX 6800 XT, ANGLE D3D11) against full: 0 px and 0 unwritten on the 12 scenes for every form and
  combination (`desk_cmpa` 84 rows, `desk_cmpb` 60 rows, `desk_cmpc` for k1, `desk_cmpt` for tj and tjo below);
  mirror equal (def [3016,0,0,0.0000911]).
- Pixel: p11c (t32rlgyc3, ec3, vadec3 and xvaec3) 48 rows of 0/0, mirror equal, thermal 0; p11g (k1) 36 rows and
  p11t (tj, tjo) 36 rows of 0/0. The one inexact form found is stage 8's bx (below).
- Tables untouched: digest `all ae1d2392...` (5445 lines), identical to stage 10. `npm test` green (2992 passed, run
  at 21:42 after the last source change, 756d6b2c).
- Probe residual: a cfg with `cover: true` leaves GL error 1282 at the scene level on the desktop (t32rlgyc3 alone
  shows it, every pass reads 0, the cmp is unaffected). Not chased.

### Before / after on the Pixel (p11b; ms @ MHz; sync4 net of empty, frame1 gross)

| canvas, mode | def t32rlgyc3 → vadec3 | muse_hash | fat |
|---|---|---|---|
| 822 sync4 | 12.63@1286 → 12.53@1286 | 16.85@1286 → 16.95@1286 | 8.32@1094 → 8.53@1190 |
| 822 frame1 | 18.2@825 → 16.9@748 | 21.8@1017 → 20.9@883 | 13.1@499 → 15.4@460 |
| 1079 sync4 | 17.25@1286 → 16.78@1286 | 23.07@1286 → 22.9@1286 | 12.2@1286 → 12.35@1286 |
| 1079 frame1 | 17.9@1094 → 20.2@1094 | 27.5@1286 → 24.4@1094 | 17.1@748 → 17.2@748 |

xvaec3 at 822: sync4 12.55@1286 / 16.98@1286 / 8.4@1190; frame1 17.2@748 / 19.6@1017 / 15.6@460. frame1 follows the
governor (748-1094 MHz for one variant within a run), so sync4 at 1286 decides.

Desktop (dtab, 822, sync4 / frame1): t32rlgyc3 def 0.70/3.70, muse_hash 1.15/5.80, fat 0.45/2.50; every form within
±0.03 sync4. At 1079, t32rlgyc3 vs vadec3: def 0.85/4.7 vs 0.82/4.7, muse_hash 1.30/7.0 vs 1.27/6.9, fat 0.60/3.5 vs
0.60/3.4.

### Attribution on the Pixel (822, sync4 net ms @ 1286 unless marked; cuts are NOT exact, timing only)

| tier or cut (`a<cut>@t32rlgyc3`) | def | muse_hash | fat | runs |
|---|---|---|---|---|
| t32rlgyc3 | 12.03-12.75 | 16.50-17.48 | 8.25-8.65 | p11a, d, e, f |
| nolay (no layers()) | 5.90-6.08 | 8.32-8.70 | 4.80-5.53 (1017-1094) | a, d, e |
| noface (no face loop) | 7.82@1190 | 11.47 | 6.57@1094 | d |
| nocorn (no corner work, scan or layers) | 8.52-8.97 | 13.38-14.55 | 7.27-7.48 | d, e, f |
| nolk (the scan keeps corners, layers() sees none) | 10.10 | 15.70 | 8.15@1190 | f |
| nokey (layers()'s corner key loop cut) | 13.40 | 18.90 | 9.15 | f |
| noloop (no piece-over-piece burial) | 11.30 | 16.15 | 8.97 | d |
| nokb (no corner burial of faces) | 11.68 | 16.02 | 8.10@1190 | e |
| noarm (the arm test only) | 11.90 | 16.30 | 8.30@1190 | e |
| nokb+nokf+notan | 11.03 | 15.30 | 8.15 | e |
| nofoot | 12.10 | 16.42 | 8.28 | d |
| quad (divergence) | 10.93 | 15.10 | 7.92 | d |
| nosa / nosv | 12.72 / 12.03 | 16.88 / 16.90 | 8.30 / 8.55 | a |
| forms v / a / d / e / vade | 12.20 / 12.45 / 12.20 / 12.95 / 12.38 | 16.85 / 16.95 / 16.67 / 17.15 / 16.70 | 8.63 / 8.45 / 8.60 / 8.85 / 8.40 | a |

Reading:
- The per-surface state is not where the layering's time goes: the forms and the sa / sv cuts are within run noise
  (about ±0.3 ms on def). Stage 10's per-slot model held for per-piece arrays, not for surface or corner state.
- The corners are: nocorn saves 3.1-3.8 on def and 2.9-3.2 on muse_hash, and 0.8-1.2 on FAT, which has no corner
  (kprune below: no list entries), so on fat it is pure compile shape (register footprint). Of def's share,
  layers()'s corner use is about 2.25 (nolk) and the scan's keep loop about 1.6 (nocorn minus nolk). Yet cutting
  layers()'s corner key loop alone (nokey) is 1.05 / 1.4 / 0.65 SLOWER: on the Pixel a cut has to be measured.
- The face loop is about 4.2 of def's 6.2 ms of layering; inside it piece burial is 0.7 and the corner parts
  (kb + kf + tangents) about 1.0. Divergence is 1.1 / 1.7 / 0.4.

### Levers measured, not shipped

All exact (0 px / 0 unwritten against full on the 12 scenes, desktop and Pixel); none faster on all three.

- **A smaller corner tier (k1, `t31rlgyc3`, MAXK 1).** Covers 97.15 / 98.63 / 100% of the rect (def / muse_hash /
  fat) against t32's 99.81 / 99.90 / 100. Pixel 822 sync4 (p11g): 16.35 / 19.65 / 8.05@1190 against t32's 12.60 /
  17.30 / 7.73, all at 1286 unless marked; vade on k1 15.03 / 18.75 / 7.88. Routing 2.7% of def's pixels to full costs
  3.75 ms, so any cut must keep the tier's cover where it is. k0 (`t30`) does not compile ("array size must be
  greater than zero"): a cornerless tier needs its corner code compiled out, not its arrays sized 0.
- **A ring-aware corner list (kprune, not built).** Dropping each cell's corners that no point of the cell can pass
  the ring (and, for thru corners, the reach) test removes 19% of def's list entries and 29% of muse_hash's (fat has
  none). The scan's keep loop is about 1.6 ms of def, so it bounds at a few tenths.
- **The scan's thru-chain array (`tj`, `tjo`, ATT forms in `k1362s11_entry.ts`).** `tj[8]` as two scalars (a third
  passing thru corner overflows to full) or one (a second chain overflows): cover unchanged to 4 decimals. Pixel 822
  sync4 (p11t): tj 12.57 / 17.55 / 8.25, tjo 12.72 / 17.20 / 8.55@1094, against t32 12.85@1094 / 17.38 / 8.28; noise.
- **Stage 8's burial exit on today's tier (`t32rblgyc3`).** Exact on the desktop (desk_cmpx), but **8-97 px off full
  on 11 of the 12 scenes on the Pixel** (p11x; t32rlgyc3 0 on all 12 in the same run): its bound `band2 > v` is not
  bit-safe under the PowerVR compiler. Slower too: 822 sync4 13.35 / 18.25 / 9.22 against 12.15 / 16.93 / 8.45, 1079
  sync4 17.75 / 24.68 / 13.45 against 16.78 / 23.20 / 11.92, all at 1286. Do not revive it.
- **Noise.** The same program benched twice under two names (`aid@`, p11x) read def 12.15 / 12.65, muse_hash 16.93 /
  17.10, fat 8.45 / 8.68@1017 at 822 sync4: about ±0.5 ms on def, so a gain under 0.5 needs repeats. (A variant listed
  twice in one bench is measured once: the bench keys on the name; use `aid@<tier>` for a true repeat.)

### What the next stage needs

def is 12.0-12.9 ms at 822 against the 8 ms goal, and the state folds this brief asked for are spent: no fold of
surface or corner state moved the Pixel, and the layering will not fall under 2.5 ms by holding less. What is left:
- **Corner code's footprint.** fat pays 0.8-1.2 ms for corner code it never runs (nocorn on a scene with no corner).
  A tier with the corner code compiled out, used for a frame whose tables hold no corner (CPU knows: `nK` or the
  cell lists), is exact and would take that back on corner-free scenes only (nocorn against full on the desktop:
  fat 0 px, def 11712, muse_hash 5742; `desk_cmpn`); def and muse_hash need the corners in the tier (k1 above).
  The program choice is made in `gf_app.ts`, outside this stage's files.
- **The face loop** (about 4.2 of def's 6.2): piece burial 0.7, corner burial and tangents 1.0, the rest is the
  per-surface walk over pieces and band2/depth arithmetic. A cut there has to be measured on the Pixel one by one:
  nokey, which removes work, was slower.
- **Divergence** (quad: 1.1 / 1.7 / 0.4) is the only lever left of more than 1 ms that is not the face loop; it
  would need work regrouped across a quad (pieces ordered alike in neighbouring pixels), not fewer values.
- Without one of those, the goal needs a change of approach (fewer pixels shaded per frame, or a lower-cost field
  form), which is Levi's call.

### Tools

- Desktop: `node .claude/probes/K1362/k1362s11_run.mjs build`, then `... desktop <label> <cfg>` (perf lock) →
  `out/s11/desk_<label>.json`; `k1362s11_sum.mjs` tabulates those.
- Pixel, one call: `pwsh -NoProfile -File .claude/probes/K1362/k1362s11_phone_run.ps1 -Cfgs p11b -WaitMin 25` (build,
  phone lock, the K156 start with its ready wait, gpuclk on each cfg, clean-up, release) → `out/s11/gpuclk_<cfg>.json`;
  tabulate with `node .claude/probes/K1362/k1362s11_tab.cjs <json>...`. cfgs: p11a (state attribution), p11b
  (before/after), p11c (Pixel cmp), p11d-f (layering and corner attribution), p11g-h (k1 tier), p11t (tj), p11x
  (bx and the `aid@` repeat). Desktop cfgs: cmpa-c, cmpt, cmpx, cmpn, chk2-3, dk1, cov. `cover: true` now measures
  ATT forms too.
- `node scripts/run_node.mjs .claude/probes/K1362/k1362s11_kprune.ts <main checkout>/.claude/probes/K868/scenes`.

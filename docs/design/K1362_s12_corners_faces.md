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

## Handoff (stage 12, 2026-11-13)

Start 22:31:12 PT (commit 936fef53's message says 2026-11-12: a typo), stop 23:42:27 PT. Branch
`worktree-agent-a31b4af5e23a7ec03` (worktree `.claude/worktrees/agent-a31b4af5e23a7ec03`). **GF_TIERS is now
t32rlgyjfc3** (`kz: "frame"`, b543a5d0): a frame whose cells list no corner draws the tier with the corner code compiled out, a frame with
corners draws t32rlgyc3 itself (fat -1.1 to -2.4 ms; def and muse_hash unchanged). **Def is still about 12 ms at 822
on the Pixel: the 8 ms goal is not met.**

### What was built (exact; bench forms unless named in GF_TIERS)

- `kz` (`gf_glsl.ts` cornerRoute, `gf_pass.ts` cornerPlan; tier letter `j`): `free` compiles the corner code out
  (nk is const 0; the scan's loops, all bounded by the cell's corner count, are gone) and discards a pixel whose cell
  lists a corner; `corner` is the tier plus a discard for a corner-free cell. `route` draws free, then corner, then
  full (per cell, `j`); `frame` (`jf`) picks per frame: no corner in any cell (GfPass.upload reads T.cellKN) draws
  free then full, otherwise the plain tier then full. `jc` / `jx` are corner / free alone (timing only).
- The probe (gf_app's counts GfPass, and gfFs with probe) ignores kz and fj: the probe draws the tier's own pixels.
- `fj` (`gf_glsl.ts` faceJoin; tier letter `p`): layers() makes one pass over the pieces, then the corners, then the
  tangent points, each face updating its own surface's slot (v in sv, D in sa, smoothed once at the end), in place
  of a pass over every piece per surface. `fj: "s"` (`ps`) keeps v in a scalar per face and writes it back where
  it rises. Under kz `frame`, cornerPlan gives fj to the corner-free program only (with corners it was slower).
  Bench forms only: GF_TIERS has no fj.
- Tests: `test/render/gf_tier_forms.test.ts` (s12 corner-free cells, s12 face loop).

Why it is exact: kz removes only loops that make no trip in a corner-free cell (their state keeps its declared
values) and routes every other pixel to a program that draws it as before; the stencil route is unchanged (the plain
tier or free, then full). fj visits each (surface, face) pair once and keeps each surface's faces in the old order
(pieces by j, then corners, then tangent points), so the strict running maxima v and D pick the same face, ties
included; D is final (pieces and corners) before the tangent points read it.

### Checks

- cmp, 0 px and 0 unwritten against full on the 12 scenes, CPU mirror equal: desktop (`desk_cmp.json`: route,
  frame, free and corner forms; `desk_fj.json`: t32rlgypc3, t32rlgypjfc3, 36 rows) and Pixel (p12a: 60 rows;
  p12b and p12c: 36 rows each; p12d: 24 rows; all 0 px, 0 unwritten, mirror equal).
- App (dev server, `VERIFY=1 k1362s12_app.mjs`, the default GF_TIERS through gf_app): errors none, no fallback,
  nMismatch 0 over 245 / 362 / 245 builds on `?b.FMKB4DIQ`, `?3.FGH1HtvQeDjm6e4BII`, `?p9ar6.FMKB4DIQ` (all with
  `&am=instant&snd=none&rp=gf`), counts() returns.
- Digest unchanged: `all ae1d23920dd9bd6f7614e7bf3ca3c1893537de7bd76640b41b34494865a85a27 lines 5445`.
- `npm test`: green on the final tree (tsc, then 2998 passed, 18 skipped; goldens unchanged, no tracked file modified).

### Before / after on the Pixel (ms @ MHz; sync4 net of empty, frame1 gross)

822x1506 sync4 (p12a; jc3 = route, jfc3 = frame):

| | def | muse_hash | fat |
|---|---|---|---|
| t32rlgyc3 | 12.42@1286 | 16.90@1286 | 7.95@1286 |
| aid t32rlgyc3 | 12.10@1094 | 17.03@1286 | 8.17@1190 |
| t32rlgyjc3 (route) | 15.45 | 20.28 | 6.90@1190 |
| aid t32rlgyjc3 | 15.22 | 20.23 | 6.85 |
| **t32rlgyjfc3 (frame)** | 12.10 | 17.05 | 6.80@1286 |

822x1506 frame1: t32 16.50@1286 / 19.60@1094 / 14.90@499; route 17.70@1017 / 22.90@1094 / 16.80@460; frame
16.20@883 / 20.90@1017 / 17.80@460; aid t32 17.20@940 / 19.20@1094 / 15.60@556 (fat's frame1 clock is 460-556:
confounded).

1079x1977 sync4: t32 16.20@1286 / 22.80 / 11.05; aid t32 16.25 / 22.80 / 10.82; route 20.50 / 26.80 / 9.30; aid
route 20.57 / 27.30 / 9.72; **frame 16.52 / 22.35 / 8.68**. frame1: t32 15.40@1190 / 26.20@1017 / 16.60@825; route
23.50@1017 / 30.70@1286 / 15.10@691; frame 18.30@940 / 24.70@1094 / 14.60@825; aid t32 19.40@1017 / 25.80@1094 /
16.90@825.

fj on the Pixel (822x1506 sync4, ms@MHz, 1286 unless noted; each bench has its own control rows). p12b and p12c
put fj in every program; p12d (the shipped cornerPlan) puts it in the corner-free program only, so there def and
muse_hash, whose frames all list corners, draw the identical program in both rows:

| bench | form (/ aid) | def | muse_hash | fat |
|---|---|---|---|---|
| p12b | t32rlgyc3 | 12.10 | 16.63 | 7.90 |
| p12b | t32rlgypc3 (fj) | 12.38 | 17.00 | 8.05 |
| p12b | t32rlgyjfc3 | 12.25@1190 / 12.35 | 16.48 / 17.13 | 6.92@1094 / 6.65@1190 |
| p12b | t32rlgypjfc3 | 12.20 / 12.13 | 16.75 / 16.82 | 6.30@1190 / 6.55 |
| p12c | t32rlgyc3 | 11.93 | 16.35 | 7.75 |
| p12c | t32rlgypsc3 (fj "s") | 13.13 | 17.72 | 8.53 |
| p12c | t32rlgyjfc3 | 12.03 / 11.93 | 16.35 / 16.82 | 7.02@1190 / 6.75 |
| p12c | t32rlgypsjfc3 | 13.15 / 13.10 | 17.57 / 17.45 | 6.27@1190 / 6.17@1190 |
| p12d | t32rlgyjfc3 | 12.22 / 12.10 | 16.83 / 16.78 | 6.70@1190 / 6.70 |
| p12d | t32rlgypjfc3 (fj, free only) | 12.00 / 11.95 | 16.78 / 16.60 | 6.50@1190 / 6.58 |
| p12d | t32rlgypsjfc3 (free only) | 12.00 / 12.63 | 16.68 / 17.05 | 6.73 / 6.55 |

1079x1977 sync4 (form / aid, against t32rlgyjfc3 / aid in the same bench): p12b pjfc3 16.50 / 16.70, 23.13 / 23.27,
9.15 / 9.20 against 16.20 / 16.20, 22.40 / 23.02, 9.55 / 9.70; p12c psjfc3 17.75 / 17.88, 24.28 / 23.98, 9.10 /
9.20@1094 against 16.40 / 16.40, 22.13 / 21.95, 9.55 / 9.72; p12d pjfc3 16.40 / 16.27, 22.60 / 22.38, 8.97@1190 /
9.07 against 16.02 / 16.20, 22.50 / 22.40, 9.88 / 9.45. p12d frame1 at 822: jfc3 14.10@825 / 19.90@940 / 17.20@460,
pjfc3 15.10@940 / 18.90@1017 / 16.30@460 (governor-bound).

Desktop (RX 6800 XT, ANGLE D3D11; sync4 / frame1 ms, 822): t32rlgyc3 0.68 / 3.60, 1.10 / 5.80, 0.43 / 2.50; route
0.85 / 4.40, 1.32 / 6.80, 0.38 / 2.30; frame 0.70 / 3.70, 1.10 / 5.80, 0.38 / 2.30. 1079 sync4: t32 0.85 / 1.30
(def / muse_hash), route 1.07 / 1.65, frame 0.85 / 1.30. fj (desk_fj, 822): t32rlgypjfc3 0.80 / 3.70, 1.23 / 5.70,
0.50 / 2.30 against t32rlgyjfc3 0.78 / 3.60, 1.23 / 5.80, 0.50 / 2.30 (noise).

### Attribution (822, sync4 net; one program alone, NOT exact, timing only)

| | def | muse_hash | fat |
|---|---|---|---|
| zt: the tier alone | 11.78 | 16.05 | 7.90 |
| zf: free alone | 5.72@1190 | 7.97@1190 | 6.70 |
| zc: corner alone | 8.17@1190 | 10.47 | 0.70@460 |

Cover (desktop, share of inked pixels the program draws): t32rlgyc3 99.81 / 99.9 / 100%; free alone 55.12 / 57.4 /
100%. So on def, free draws 55% of the pixels in 5.7 ms and corner the other 45% in 8.2: the corner cells cost
about as much per pixel as the whole tier, and the corner-free half is not cheap either. The z rows log glError
1282 on the desktop (K1379's residual, timing only).

### Levers measured, not shipped

- Per-cell routing (`route`, kz `j`): exact, but +3 ms on def and muse_hash on the Pixel (fat -1.1). A cell is finer
  than the Pixel's thread groups, so a group straddling free and corner cells runs both programs' shapes; the second
  routed program also tests the stencil late (s4's rule). Do not route by cell; a per-frame choice is what paid.
- fj (`p`, `ps`): exact on both GPUs, not faster where it matters. In the program with corners it is +0.15 to
  +0.4 ms (p12b), and the scalar form "s" (v loaded per face, written back where it rises) +0.8 to +1.3 ms on def
  and muse_hash (p12c). So cornerPlan gives fj to the corner-free program only (3087ec0b). There (p12d) fat gains
  0.12-0.2 ms at 822 (aid agrees) and 0.4-0.9 at 1080, while def and muse_hash are unchanged (same program; their
  0.6 ms spread between rows is run noise). Not shipped: the gain is fat-only, under 0.5 ms at 822, and leaves def
  where it was. Inferred, not isolated: one pass over the faces in place of one per surface does the same per-face
  work, so the loop's shape is not what costs; an indexed slot (sv[e], sa[e] through slotOf) and a live register
  more (the "s" form) do cost on the Pixel.

### What the next stage needs

- Def 12.1 ms against 8 at 822 (sync4, 1286 MHz), muse_hash 17. The corner-free half of def's pixels alone costs
  5.7 ms and the corner half 8.2, so neither half alone is under 8: the per-pixel program itself must shrink, on
  both halves.
- The face loop's shape is spent (fj); what is left is the work per face and the register footprint. Next cuts to
  measure: fewer faces evaluated per pixel through an exact bound (skip a face whose largest possible val cannot
  beat the surface's running maximum, ties kept), and the corner half's own cost (zc 8.2 ms on def, the corner key
  loop and keep loop of stage 11). Bench each on the Pixel at 1286 MHz with an aid repeat; def's run noise is
  about ±0.5 ms (p12d's identical-program rows differ by 0.63).
- t32rlgypjfc3 (fj in the corner-free program) is a measured, exact, fat-only candidate (-0.1 to -0.9 ms): switch
  GF_TIERS to it only if fat's time matters on its own, after the compile check below.
- Residual: the frame form compiles one more program at init (free beside the tier); measure the first frame's
  compile on the Pixel before the default goes on.
- Lore for `render-gpu-field.md` (stage 12): a per-frame program choice by the tables' content is exact and free;
  per-cell routing is slower on the Pixel.

### Tools

- `k1362s12_run.mjs build` (bench site into `out/s12/site`), `k1362s12_run.mjs desktop <label> <cfg>` (writes
  `out/s12/desk_<label>.json`; take the perf lock), configs `k1362s12_cfg_{cmp,cov,dtab,fj,fjs,fjf,p12a,p12b,p12c,p12d}.json` (desk_fj / fjs / fjf: the fj forms'
  cmp and timings on the desktop; p12b-d: the Pixel's).
- Pixel, one call: `pwsh -NoProfile -File .claude/probes/K1362/k1362s12_phone_run.ps1 -Cfgs p12b -WaitMin 25`
  (holds the phone lock, A/A build check, ready check, watchdog; writes `out/s12/phone_<cfg>.json` and
  `gpuclk_<cfg>.json`). Tables: `node .claude/probes/K1362/k1362s12_tab2.cjs out/s12/gpuclk_<cfg>.json`.
- Bench names: `k1362s12_entry.ts` parseTiers (`...[p][j[fcx]]c<n>`; `z[tfc]@<tier>` for one program alone;
  `aid@<tier>` repeats a variant).
- App check: `VERIFY=1 node .claude/probes/K1362/k1362s12_app.mjs <out.json>` against a dev server.
- Source dump: `node scripts/run_node.mjs .claude/probes/K1362/k1362s12_dump.ts <out> [kz|-] [fj]`.
- Digest: `node scripts/run_node.mjs .claude/probes/K1362/k1362t1_digest.ts <drag scenes> <census scenes>` (the
  main checkout's `.claude/probes/K1247/out/s18/drag` and `.claude/probes/K868/scenes`, read only).

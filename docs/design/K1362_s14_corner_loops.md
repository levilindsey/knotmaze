# K1362 stage 14: the corner cells' own loops, def under 8 ms on the Pixel

Coordinator brief, 2026-11-14. Stage 13's brief and handoff: `K1362_s13_cell_order.md`. The corner attribution is
stage 11's (`K1362_s11_layer_state.md` handoff); the per-frame corner-free program is stage 12's
(`K1362_s12_corners_faces.md`).

## Where it stands

- rp=gf is off by default. `GF_TIERS` (gf_pass.ts) is t32rlgyjfFkc3: a corner-free frame draws the tier with the
  corner code compiled out; other frames draw the corner tier with the exact face skip (`fs` "c"); each is followed
  by the full program behind the stencil. Pixel, 822x1506, sync4, 1286 MHz: def 12.01 ms, muse_hash 16.50, fat
  7.07 (fat's frames are corner-free). 0 px on the 12 scenes on both GPUs.
- Def's corner-free cells (55% of pixels) cost 5.7 ms alone and its corner cells 8.2 (stage 12). Stage 11 put about
  2.25 ms of def in layers()'s corner use (the corner faces, kb, kf, tangents) and about 1.6 ms in the scan's corner
  keep loop; removing all corner work (`nocorn`, inexact) saved 3.1-3.8 ms.
- What did not pay on the Pixel: packing or folding state (stages 10, 11); cutting layers()'s corner key loop alone
  (`nokey`, 1.05 ms slower); a MAXK 1 tier (2.7% of def to full, +3.75 ms); per-cell routing (+3 ms); the per-cell
  layering order (coverage below 100%); stopping the face loop at the first opaque surface (`lz`). Removing work
  pays when it also removes live state or indexed slots; measure every cut.
- Stage 11's kprune: a ring-aware corner list (drop each cell's corners that no point of the cell can pass the ring
  or reach test with) removes 19% of def's list entries and 29% of muse_hash's. Not built.

## Goal

def at most 8 ms at 822x1506 on the Pixel, exact, by making the corner cells cheaper. The technique is yours; the
levers stage 11 and 13 left: the scan's corner keep loop (fewer candidates per cell, for example kprune as an
additive table, or an exact bound that rejects a corner before its full test), and layers()'s corner faces (an exact
bound like `fs` that skips a corner face that cannot change the result, or less corner state held across the face
loop). Spend the whole 2 h: a lever that does not pay is a result to record, then move to the next.

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32rlgyjfFkc3 is replaced only by a program
   faster on def and muse_hash on the Pixel at 1286 MHz in one bench, with an `aid@` repeat when a gain is under
   0.5 ms, and fat no slower. 0 px and 0 unwritten against the full program on the 12 scenes on both GPUs, the CPU
   mirror holds, `npm test` green, the goldens unchanged, and every existing table field bit-identical (the digest in
   `.claude/probes/K1362/k1362t1_digest.ts`; new tables are additive, built in the gf build worker, and count with
   their build cost and bytes; if an old field must change, stop and write the gate argument
   `K1362_t1_muse_tables.md` addendum 2 asks for instead).
2. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and 1079x1977, sync4 and frame1, with the
   clock), the desktop beside it, the attribution rows behind each lever tried, and a one-call Pixel runner for every
   A/B, copied from `.claude/probes/K1362/k1362s13_phone_run.ps1`.

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
- **Your files:** everything in `src/render/gpu_field/` (tables under Done 1's gate); `test/render/gf_*`;
  `.claude/probes/K1362/k1362s14_*` (copy stage 13's `k1362s13_*` tools as needed).
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
- what the corner cells stopped doing, and why the tier is still exact;
- the attribution rows, and the before/after table with the clock;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

## Handoff (stage 14, 2026-11-14)

Started 2026-11-14 00:59:32 PT, stopped STOPTIME PT. Branch `worktree-agent-a523f744a0007e4e9` (from d32ebc13); the
last commit is in the report. GF_TIERS is unchanged (t32rlgyjfFkc3) and Done's 8 ms is not met. One Pixel bench ran
(p14a, 01:15-01:20: kp). From about 01:20 to the stop the phone's screen stayed off, and four more runner attempts
(p14b-p14e, then p14f) waited without a ready phone. T, O, G, I, M, D and H therefore have desktop numbers only. p14f
(02:12-02:37, 25 min) and a last short p14g (02:37-02:49, 12 min) both read "the screen is off" for their whole
wait. Neither ran a bench, and both cleaned up and released the phone lock.

### What was built (`src/render/gpu_field/gf_glsl.ts`; bench letters after `Fk`, corner program only)

cornerPlan (gf_pass.ts) strips every one of these from the corner-free program, so fat's frames are untouched.
- `kp` (P): the scan walks a pruned corner list per cell (stage 11's kprune, an additive table built in the gf
  worker: 0.45 ms, def 209 KB, muse_hash 85 KB). Walks per corner-cell pixel 2.85 -> 1.21.
- `kt` (T): the thru ids are held in two scalars, not an array.
- `ko` (O): the corner burial runs first.
- `kg` (G): the corner's surface is packed into kk and tested before any fetch. 4 of 8 K1 fetches go.
- `ki` (I): kIn 3 files rho > K0.z. layers()'s first corner loop fetches no K0, and fetches K3 only for a new label.
- `km` (M): the ring faces and the tangent faces share one corner loop and one burial (pieceD calls 5 -> 4).
- `kd` (D): the tangent faces' fs skip tests fb * cD > v, with cD = ss(-aa, aa, D) hoisted. The tangent loop is
  bounded by nkT = cD > 0 ? nk : 0. `kd: "g"` (Dg) keeps only the bound.
- `kh` (H, needs G): kk also carries the corner's thru bit (k + 32768 * thru + 65536 * surface; a corner index past
  32767 overflows to full). The tangent loop skips a thru corner, or one of another surface, without fetching K1, so
  with G it fetches no K1 at all.

Each is exact by the same argument as fs: every factor is in [0, 1] and rounding is monotone, so a skipped face cannot
beat v, and v starts at 0. Overflow still discards to full.

### Checks

- Desktop (ANGLE D3D11): 0 px and 0 unwritten against full on the 12 scenes for A, P, T, O, G, I, M, D, Dg, TOM,
  PTOM, TOGI, TOGID, PTOGID, TOGIDg, GH, TOGIDH and PTOGIDH. Pixel (p14a): A and P are 12/12.
- kd's first form put the guard in the loop condition (`i < nk && cD > 0.0`). D and Dg alike were then 2-29 px off on
  6 of 12 scenes. Written as a bound, both are 0 px on all 12: this is ANGLE's `&&` loop-condition mistranslation again
  (render-gpu-field.md), not reassociation.
- The CPU mirror columns match full on every scene. `npm test` is green at 4f02fb99 (3013 passed, 18 skipped). The
  digest is unchanged (`ae1d2392...85a27`, 5445 lines, run at 2e7399b9; since then only gf_glsl.ts and gf_pass.ts
  changed, and tables.ts imports neither), and so are the goldens. `test/render/gf_tier_forms.test.ts`
  pins each letter's source shape and its refusals.
- TOGIDH's dumped source (`k1362s14_dumpfs.ts`) has no K1 fetch in layers(). The tangent loop tests
  `kS != S || (kk[i] & 32768) != 0` from kk alone, and the only K1 fetches left are the scan's.

### Before / after on the Pixel (p14a; ms @ MHz; def / muse_hash / fat; `aid@` = the same program again)

| 822x1506 | sync4 | frame1 |
|---|---|---|
| A t32rlgyjfFkc3 | 12.08@1286 / 16.80@1286 / 6.72@1286 | 16.10@825 / 23.50@1017 / 18.80@460 |
| aid@A | 12.63@1286 / 16.63@1286 / 7.32@1286 | 16.20@691 / 18.50@1286 / 17.80@460 |
| P | 12.68@1286 / 16.43@1286 / 7.70@1286 | 17.20@825 / 19.70@940 / 18.30@460 |
| aid@P | 12.40@1286 / 16.55@1286 / 6.80@1286 | 16.40@825 / 17.50@1017 / 18.10@460 |

| 1079x1977 | sync4 | frame1 |
|---|---|---|
| A | 16.65@1286 / 22.03@1286 / 9.63@1286 | 19.50@1017 / 26.10@1094 / 15.80@614 |
| aid@A | 16.00@1286 / 22.60@1286 / 9.65@1286 | 18.90@1017 / 26.00@1094 / 17.00@614 |
| P | 16.10@1286 / 22.48@1286 / 10.07@1286 | 18.20@1094 / 27.60@1286 / 16.20@614 |
| aid@P | 16.15@1286 / 22.48@1286 / 9.78@1286 | 18.50@1094 / 25.00@1094 / 15.80@614 |

P is within the run noise (about ±0.5 ms) of A everywhere, so it is not a replacement.

### Desktop beside it (sync4 / frame1 ms; def, muse_hash, fat)

| | 822 def | 822 muse_hash | 822 fat | 1080 def | 1080 muse_hash | 1080 fat |
|---|---|---|---|---|---|---|
| A | 0.65 / 3.50 | 1.10 / 5.70 | 0.40 / 2.30 | 0.80 / 4.60 | 1.27 / 6.80 | 0.53 / 3.20 |
| T, O, G, I, TOGI | 0.65 / 3.50 | 1.10-1.13 / 5.60-5.70 | 0.40 / 2.30 | 0.80-0.82 / 4.60 | 1.25-1.27 / 6.70-6.80 | 0.53-0.55 / 3.10 |
| M | 0.75 / 4.00 | 1.25 / 6.40 | 0.40 / 2.30 | 0.98 / 5.30 | 1.48 / 7.80 | 0.55 / 3.10 |
| D (aid@D) | 0.65 / 3.50 | 1.07 / 5.60 | 0.40 / 2.30 | 0.80 / 4.50 | 1.23 / 6.60 | 0.55 / 3.10 |
| TOGID | 0.65 / 3.50 | 1.07 / 5.60 | 0.40 / 2.30 | 0.80 / 4.50 | 1.23 / 6.60 | 0.53 / 3.10 |
| GH, TOGIDH (desk_khx) | 0.65-0.68 / 3.50-3.60 | 1.05-1.07 / 5.60-5.70 | 0.38 / 2.30 | 0.80 / 4.40-4.60 | level with TOGID | level |

The desktop does not predict the Pixel (stage 6); these numbers only flag M as slower.

### Attribution

- **The scan's keep loop (P).** P halves the walks (2.85 -> 1.21 per corner-cell pixel) and is level on the Pixel. The
  keep loop's cost is not its trip count.
- **What a corner-cell pixel keeps (`k1362s14_nkhist.ts`, an upper bound: ring and thru-reach tests only).** Def:
  0 / 1 / 2 / 3+ corners on 44.3 / 48.7 / 6.6 / 0.5% of pixels. The corner work done is small. What costs is the
  corner code's compile shape (stage 11's fat finding).
- **layers()'s fetches (G, I).** G removes 4 of 8 K1 fetches. I removes the K0 fetch from the first corner loop and
  defers K3. H removes the tangent loop's last K1 fetch. All three are desktop-level; none has Pixel numbers yet.
- **One corner loop (M).** Exact, but 14-23% slower on def and muse_hash on the desktop (fat level). It nests a
  dynamic face loop inside the corner loop. Not worth a Pixel slot ahead of the others.
- **The tangent faces' D factor (D).** Level on def and -0.03 to -0.04 ms on muse_hash on the desktop (aid@
  agrees). It skips the tangent loop wherever the surface's D factor is 0.
- **TANGENT per frame (`k1362s14_tng.ts`, not built).** Tangent faces come only from non-thru corners (K1.x =
  kThru <= 0.5). Those are 80-93% of the listed corners on every corner scene (def 332 of 376), and 83-98% of the
  corner cells list one (def 8871 of 9399). Every corner frame needs TANGENT, so a stage 12-style per-frame program
  without it would never be drawn.

### What the next stage needs

1. Run the p14f bench on the Pixel with one call:
   `pwsh -NoProfile -File .claude/probes/K1362/k1362s14_phone_run.ps1 -Cfgs p14f -WaitMin 30`. It covers A, T, O,
   G, I, M, D, TOGI, TOGID, TOGIDH, PTOGID, aid@A and aid@D at both sizes, plus the cmp (full, A, M, D, TOGID,
   TOGIDH, PTOGID, PTOM). A short wake window fits `-Cfgs p14g` instead (822 only: A, TOGID, TOGIDH, PTOGIDH,
   aid@A, plus the 12-scene cmp). Run
   it while the phone is awake. Replace GF_TIERS only under Done 1, then update the pin in `gf_tier_forms.test.ts`
   (the GF_TIERS test) and the docs.
2. If none of T, O, G, I, D or H pays on the Pixel, the corner levers inside the corner program are spent: P, the
   fetch cuts and the skips all leave its compile shape alone. Def's 8 ms then needs the corner-free half too
   (5.7 ms of def alone, stage 12), whose cost is the face loop (stage 11: about 4.2 of the 6.2 ms of layering).

### Tools (`.claude/probes/K1362/`)

- `node k1362s14_run.mjs build`, then `node k1362s14_run.mjs desktop <label> <cfg.json>`. Run the desktop part under
  the perf lock. It writes `out/s14/desk_<label>.json`.
- `node k1362s14_sum.mjs <json>` prints per-scene timings and the cmp exactness with the mirror. `node
  k1362s14_tab2.cjs out/s14/gpuclk_<cfg>.json` prints the Pixel ms@MHz table.
- `k1362s14_phone_run.ps1 -Cfgs <name> [-WaitMin n]`: the one-call Pixel runner. It builds, takes and releases the
  phone lock, and runs `k1362s14_gpuclk.mjs`. It writes `out/s14/phone_<cfg>.json` and `gpuclk_<cfg>.json`, and logs
  go to `$env:TEMP\claude\k1362s14_<cfg>.log`.
- `k1362s14_entry.ts` reads the tier letters (`t32rlgyjfFk[P][T][O][G][I][M][D|Dg][H]c3`).
- `node scripts/run_node.mjs .claude/probes/K1362/k1362s14_dumpfs.ts <out.glsl> '{"kd":true}'` writes a corner tier's
  fragment source.
- `k1362s14_nkhist.ts` counts the corners kept per corner-cell pixel. `k1362s14_kstat.ts` measures what a pruned list
  removes from the scan, pixel-weighted. `k1362s14_kpcheck.ts` checks the pruned lists (`cellKPList`) against the whole
  cell list, per pixel. `k1362s14_tng.ts <sceneDir>` counts the non-thru corners and the cells listing one, per scene.
- Configs: `cfg_cmpe/f/g/i`, `cfg_cmph` (H: cmp plus a short dtab), `cfg_dtabe/f` and `cfg_p14a-g` (a p14 config is
  a dtab plus a cmp; p14g is the short one).

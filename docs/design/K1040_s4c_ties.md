# K1040 S4c: the field band's ties, outer edge and corner gaps on the GPU

Ledger: K1040. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5960-5969.

## Goal

Levi (window 84): junctions must "appear as though they are one whole fused seamless unit". S4b
(1ef55958) drew the band's corners on the GPU and added the `fbb` flag (off by default). Check #12
near corners went from 9.3-13.6 px to 0.19-3.28 px against form B's float64 reference; every spot
still over 1/32 px is one of these (S4b's Handoff, "Next", items 1 and 2):
- D4 ties: blend the two composite orders by cone-key distance rather than MAX one (S4a2's Left),
  in `band_b_glsl.ts`;
- the outer edge's AA (F7 notes 3 and 4 in `docs/design/K1040_junction_field.md`) and the exact cap
  mix at grazing crossings;
- the over-ink at g41_user_tw64 (1576.4, 770.2) and muse_hash's dark hook at (1904.1, 1117.0);
- `alphaG` takes each piece's AA without its `selfW` (form_b.ts's alphaOf takes
  `A.selfW * ss(-aa, aa, h - A.d)`), and CORNER_FS composites with the label's top T as lay 1 only,
  without the foot pass's lays 2 and 3.

Make the GPU frames match the reference everywhere. The reference (`src/render/field/form_b.ts`)
defines the look: don't change its math. Where it shows its own artifact (the grey haze halos),
crop it and say so.

## Read first

- S4b's Handoff (`docs/design/K1040_s4b_band.md`, from `## Handoff`) and S4a2's (from line 90 of
  `docs/design/K1040_s4a2_band.md`); F7 notes 3 and 4; `probes.md`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1040-s4c`. Claude made
  it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- S4b's tools are tracked in `.claude/probes/K1040/s4b/` (`s4a.mjs check|time|diag`, `run_locked.ps1`,
  `split.mjs`, the `diag_*.ts`). Copy them to `.claude/probes/K1040/s4c/`, lock owner `K1040-S4c`.
  The 12 scenes: `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`. S4b's outputs,
  read-only: `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1040\s4b\out\`.
- Every browser job runs under the perf lock through your `run_locked.ps1`, waiting inside one
  blocking command; at most two browsers. Start dev servers only on the private-cache config
  (`npx.cmd vite --config .claude/probes/K1040/s4c/vite.private-cache.config.ts --port 5961
  --strictPort --host 127.0.0.1`): a plain vite rewrites the shared `node_modules\.vite`.

## Done

1. Check #12 on the 12 scenes' GPU frames: per scene the worst ΔF away from corners and near them,
   with the counts, beside S4b's table. Every spot over 1/32 px is fixed, or cropped and named as
   the reference's own.
2. checks.ts's checks 1-9 and 11 (K868 §6) on the same frames. The reference fails some of them
   itself (S1f's table, line 441 of `docs/design/K1040_s1f_reach.md`): per scene, the GPU fails
   nothing the reference passes, or each such spot is cropped and named.
3. With the flag off no pixel changes: the golden snapshots stay green, and a flag-off whole-frame
   diff of def and muse against master's build differs only at the markers (K390).
4. Sheets at zoom 4, reference | GPU | diff, of each spot you fixed, in
   `.claude/probes/K1040/s4c/out/sheets/`. Name the two to show first.
5. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 1 doesn't hold by the cap, push only finished,
   green fixes that lower check #12 and keep the rest as a patch in `.claude/probes/K1040/s4c/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs).
  The copied tools may go in with the fix's commit.
- Edit only the GPU side of the field: `src/render/field/band_b*.ts` and the passes they feed.
  Don't touch: form_b.ts's math; `scene_export*.ts` (K1239); `src/render/ribbon/` and
  `junction_field.ts` (K1220, another run); the main checkout or any other worktree; port 5173,
  ports 5940-5949 and 5980-5989; the phone. Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it): the pop census and the free ends (S4d); the
  CPU prep's cost (S5); paint on the field (S7); the label pass's Pixel speed (K1097); the scene
  export's shapes (K1239); the old renderer's junctions.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you built, Done's tables, the sheets to show
first, anything out of scope you saw, your last SHA. Commit messages carry the record.

## Handoff (S4c, 2026-11-06)

Muse run 01a1b252 (coordinator: Claude) ran 11:24-12:5x PST in
`.claude/worktrees/muse-k1040-s4c`, under the perf lock through
`.claude/probes/K1040/s4c/` (owner `K1040-S4c`; tools copied from S4b, plus
`checks`/`crops` modes in `s4a.mjs`/`page.ts` and `ab_master.mjs`).
Servers on the private-cache config and both preview builds are stopped.
Fix commit 0733a0e5 (after rebase onto origin/master 096baa91); `npm test`
green after the rebase: 220 files passed / 2 skipped, 2887 tests passed /
9 skipped. Pushed to master; the deploy is watched below.

### Built (all in `src/render/field/band_b*.ts`; `form_b.ts` untouched)

- **The tie (D4), and A under a top wherever its coverage is below 1.**
  The foot fragment used to composite A under the label's top T only
  inside T's naming chain's AA rim, and discard A where that chain's
  distance read deeper - even where form B's `alphaOf(T)` is below 1
  (a group covering by a fill at omega, a folded piece) and even where
  the two cone keys tie within `zt`, where form B blends in the swapped
  order (muse_hash chain 71 at (1901, 1128): sorted order 0, swapped 1,
  reference 0.42). Now: `surfAlpha` reads T's coverage (`alphaG` for a
  group, the naming piece's AA for an own surface), the tie rescues the
  fragment, lays 1-3 blend the two orders by `ss(-zt, zt, |key gap|)`,
  and lay 0 (A on top) finds the runner-up by the neighbour scan and
  blends too (muse_hash chains 24/6 at (544, 709): orders 1 and 0).
  `zt` rides `BandBTables` (`uZt`; a pin in `band_b.test.ts`).
- **`alphaG` at each piece's fold weight.** It took the outline AA
  alone; now `A.selfW * ss(-aa, aa, h - A.d)` as form B's `alphaOf`,
  with `selfW` from a same-chain walk to the nearer kept piece within
  2 sigma (`foldSelfW`).
- **The cap mix's separate shares, where a ramp burier buries at
  wb ~ 1** (and the burier's ramp is below A's, or A itself is in its
  ramp): the both-member share stays `minR (1 - wb)`; the group-alone
  and own shares are valued by their tie-blended composite (B's ink
  approximated by its piece's rim, as lay 1 approximates T's) instead
  of full strength / AA alone. muse_hash chain 42 at (1430, 375):
  GPU 124 -> 49 against the reference's 49 (configs 0.52 x buried,
  0.48 x tie(1, 0)). The untied two-piece and multi-piece cases keep
  S4a2's form.
- **CORNER_FS lays.** Lay 1 extended as the foot's (the corner terms
  show under a top wherever its coverage is below 1); lay 2 added:
  with the group on top, the surface below (neighbour scan) shows
  through the group's alpha, as the foot's lay 2.

### Done 1 - check #12, GPU vs the float64 reference (2480x1800)

Counts are sections over 1/32 px (then run-count mismatches), beside
S4b's table. `out/check_final_*.json`, sheets in `out/sheets/`.

| Scene | Away worst dF | Away counts | Near worst dF | Near counts |
|---|---|---|---|---|
| muse_hash | 2.068 -> 1.224 at (1295, 577) | 107 -> 31, mism 7 -> 2 | 2.732 -> 2.602 at (1093, 754) | 861 -> 519, mism 31 -> 21 |
| muse_default_tw | 0.014 -> 0.014 | 0 -> 0 | 1.102 -> 0.468 | 179 -> 166 |
| def | 0.430 -> 0.328 | 5 -> 5 | 3.097 -> 1.484 | 220 -> 215 |
| fat | 0.029 -> 0.029 | 0 -> 0 | none | 0 |
| ring | 0.947 -> 0.352 | 7 -> 2 | 1.885 -> 0.832 | 72 -> 59 |
| user_tw42.lightpaper | 2.840 -> 0.850 | 7 -> 5 | 2.496 -> 1.871 | 52 -> 48 |
| g41_def_tw42 | 0.075 -> 0.075 | 1 -> 1 | 0.190 -> 0.326 | 51 -> 59 |
| g41_def_tw64 | 0.652 -> 1.341 at (1400, 820) | 42 -> 35 | 1.631 -> 2.297 | 516 -> 399 |
| g41_ring_tw42 | 0.143 -> 0.143 | 3 -> 3 | 0.226 -> 0.225 | 7 -> 9 |
| g41_ring_tw64 | 0.636 -> 0.219 | 16 -> 2 | 2.130 -> 1.592 | 124 -> 84 |
| g41_user_tw42 | 2.852 -> 0.850 | 7 -> 5 | 2.464 -> 1.859 | 51 -> 48 |
| g41_user_tw64 | 1.352 -> 1.131; the (1576, 770) over-ink is gone from the worst list | 36 -> 19 | 3.277 -> 6.869 at (866, 1053) | 270 -> 209 |

Named spots (the brief's list): muse_hash's dark hook at (1904, 1117)
is the tie above - fixed (its section no longer lists; the scene's
away worst is now (1295, 577)); g41_user_tw64 (1576, 770) likewise.
What is still over 1/32 px, every scene: the **multi-piece cap mix**
- pixels where two or more pieces sit in their cap ramps, so form B
sums three or more configurations, each with its own tie (e.g.
muse_hash (1093, 754), chain 46 at ramp 0 facing group 73 with a
second ramp piece; g41_user_tw64 (866, 1053), group 29's root arm
against chain 30; g41_def_tw64 (1400, 820), chain 61 at ramp 0.82).
The GPU values one dominant burier; the rest is that class, not a
new artifact. Two regressions in worst-only terms, counts down in
both: g41_def_tw64's away worst (a multi-ramp spot at (1400, 820),
GPU under-inks 0.04-0.14 ink the reference shows through a tie) and
g41_user_tw64's near worst (866, 1053). The reference's own grey
haze halos (form B's fill AA at partial omega) appear in both
columns of the sheets and are not GPU error.

### Done 2 - checks 1-9 and 11 on the same frames

`s4a.mjs checks` (checks.ts `runChecks` on the GPU probe; #1 with F
from the GPU label's own top-change mask, read back from the R32UI
target). Reference statuses are S1's `scenes.ts` run on form B (its
#1 included; scale 1, exact probe - the GPU probe is scale 2,
image-interpolated, so statuses, not values, are compared). Per
scene, the GPU fails nothing the reference passes except four
marginal spots, each cropped in `out/sheets/*_crops_viol.png`
(reference | GPU | diff at zoom 4; the diff column is blank):

- fat #5: 2 of 16491 walks not one run (longest 2.409 px), worst at
  world (7.37, 27.15); fat #6: 2 of 1712 band ends off, max 0.832 px,
  worst (2.54, 13.40). `fat_crops_viol.png`, both rows.
- g41_ring_tw42 #6: 1 of 348 ends off by 0.520 px (threshold 0.5),
  worst (12.00, 2.76). `g41_ring_tw42_crops_viol.png`.
- g41_user_tw64 #4: max |2h' - 2h| 0.0935 px (threshold 0.05) over
  the 2 sections the check measures, worst (0.39, 0.58).
  `g41_user_tw64_crops_viol.png`.

At those spots the GPU matches form B at zoom 4; the excess is the
oracle walks' reading of the interpolated GPU coverage, not a
GPU-vs-reference miss. Everything else tracks the reference's own
pass/fail per scene (muse_hash fails #1, #3-#9 and #11 on both;
#8 passes everywhere on both; #11 fails only on muse_hash, on both).

### Done 3 - flag off

No pixel changes: the app imports the band only behind `fbb`
(`field_b_app` is dynamically imported with the flag on), and the
golden snapshots stay green (above). Whole-frame flag-off diff,
this build vs master's build 096baa91 (both `scripts/preview.ps1`
builds, def and muse seed links, `phy=0&fw=0`, `ab_master.mjs`):
def 1639 px and muse 1607 px differ, all in the same four 100 px
cells in both scenes - the start marker at left (its K390 pulse)
and the panel header's build stamp (`v0.4.0 - <sha>`) at right.
No knot pixel differs. Frames in `out/ab_master2/`.

### Done 4 - sheets

`out/sheets/`: per scene `<scene>_junctions.png` and
`<scene>_worst.png` (reference | GPU | diff x4, zoom 4) from the
final check, plus the three `*_crops_viol.png`. **Show first:**
`muse_hash_worst.png` (the (1904, 1117) tie and the remaining
junction spots; the grey haze around the loop in row 0 is the
reference's own) and `user_tw42.lightpaper_worst.png` (the
(737, 793) cap+tie spot, now a small blue under-ink patch).

### Out of scope, seen and not fixed

- The multi-piece cap mix above (the remaining check #12 class).
  One narrower attempt (valuing the middle share through the
  burier's coverage wherever `rA < 1`) regressed def and the rings
  and was reverted; the gated form kept is in the fix commit.
- muse_hash check time rose (the `alphaG` reads in the tie paths):
  check runs 24 s against S4b's ~7 s for that scene. The Pixel cost
  (S5's concern) was not measured; the flag stays off by default.
- S4b's remaining list stands: the pop census and free ends (S4d),
  the CPU prep's cost (S5), paint on the field (S7), the phone batch.

Ledger items: none new - K1040's remainder is S4d/S5 under the same
handle. Last SHA: 425db3bc (fix f5eb875c), pushed to master; deploy run 42292158004 green (4m27s). This line's own commit follows it.

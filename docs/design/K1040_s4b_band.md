# K1040 S4b: the junction borders' corners, ties and outer edge on the GPU, behind a flag

Ledger: K1040. One Claude Opus stage agent in its own worktree. Cap 2 h. Ports 5960-5969.

## Goal

Levi, 2026-11-06: "When are we going to fix junction borders though?" S4a (f294dc08) and S4a2
(365d2244) drew the band's tube edges, the dead-end caps, term 1 with burial and the endpoint
terms on the GPU, behind a probe switch. Away from corners, check #12 now holds or nearly holds
on 6 of the 12 scenes; every spot still over 1/32 px carries form B's D4 tie, most with the cap
mix (S4a2's Handoff, from line 90 of `docs/design/K1040_s4a2_band.md`). S4b finishes F2 on the
GPU (F7's S4b in `docs/design/K1040_junction_field.md`):
- the fillet-arc strips and the corner terms (V, t_a, t_b, ω);
- S1's rules for D4 (the depth tie; S4a2's Left: blend the two composite orders by cone-key
  distance rather than MAX one) and the outer edge's AA (F7 notes 3 and 4), with the exact cap
  mix at grazing crossings and the over-ink where the top rim is itself buried
  (g41_user_tw64 (1576.4, 770.2));
- a flag param appended to CODEC_PARAMS, off by default, that draws the app's junctions with the
  new passes, so Levi can look in motion on the desktop and the Pixel.

Looks that bind: junctions "appear as though they are one whole fused seamless unit" (Levi,
window 84). Corners follow K830's rule (K1001, kept 2026-11-05): splits sharp, as F2 draws them.
The reference is the look; if it looks wrong somewhere, show where with a crop and keep its
definition.

## Authority

Every technical decision is yours: the strips, the corner table (junction_field.ts's record
textures are the pattern), the tie's raster form, the flag's wiring, the probe switches. Tests pin
what you built; they don't define done. When you find a cause, fix it; don't stop to report it.

## Start

- Your worktree starts at master, at this brief's commit, with S4a and S4a2 in it. Junction
  node_modules:
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- The tools: S4a2's in `.claude/probes/K1040/s4a2/` (the newest; `s4a.mjs check|time|diag`, the
  `diag_*` CPU diags), S4a's in `s4a/`, S3's in `s3/`. S4a2's outputs and sheets, read-only:
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1040\s4a2\out\`. The 12 scenes:
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`. New tools go in
  `.claude/probes/K1040/s4b/`.

## Done

1. All of F2 on the GPU. Behind the flag, the app draws its junctions with the new passes; with
   the flag off no pixel changes (the golden snapshots stay green). The flag is appended to
   CODEC_PARAMS and its pin moved (`test/ui/param_codec.test.ts`).
2. On the GPU frames of the 12 scenes: check #12 everywhere, corners and ties included, and
   checks 1-9 and 11. Per scene, the worst ΔF and where, beside S4a2's table. View every spot
   over 1/32 px; fix it or explain it.
3. The pop census over the recordings (`scripts/label_pops.ts` driving the new passes): no pops
   outside the fades (K1000, K1041, K1043). The free-end check against the reference on the 12
   scenes, g41_user_tw64 and sheet K's cases (K972, K973, K955, K956).
4. Levi's look, as sheets in `.claude/probes/K1040/s4b/out/sheets/` at zoom 4, the new look beside
   today's master: the corners; each fade where it shows in motion (foldw = σ, capw = h,
   zt = 0.1·amp, ovw = 0.05h); the junction eyes (K1045); the through-pass bends (K1049); a
   corner ball near another thread (K1002); a V apex (K1003); the reference's group-surface
   halos (S4a's crops `muse_hash_worst_1.png` row 1 and `g41_def_tw64_worst_1.png`, in
   `.claude/worktrees/agent-a938d2e1d4d9b45e3/.claude/probes/K1040/s4a/out/`). Plus one flag-on
   link per family for Levi to open live. You viewed every crop at full size.
5. The desktop cost, label plus band per scene (render sync), under the perf lock, and an updated
   `phone_batch.ps1` set for Claude to run on the Pixel (check #13), dry-run only. S4a's batch was
   never run; yours replaces it.
6. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master`.

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit and to view
  crops. No helpers.
- Write only in your worktree; outputs in `.claude/probes/K1040/s4b/out/`, never `git add -f`'d.
- Commit WIP on your branch at every milestone. Never push. Never edit LEDGER.md.
- Every browser job under the perf lock, owner `K1040-S4b`, waiting inside one blocking command; at
  most two browsers, ports 5960-5969 (5940-5949 and 5980-5989 belong to other runs). Check a
  served build by a mark. Stop your servers. No phone commands.
- Two Muse runs push to master beside you: K1228 in `src/render/ribbon_mesh.ts` (until about
  10:50) and K1220 S4 in `src/render/ribbon/joinery.ts`, `arm_strip.ts` and `junction_field.ts`'s
  fan shader (until about 11:40). Keep the flag's wiring out of those files where you can; any
  edit there stays a few lines, and your final rebase takes theirs.
- Out of scope (name it, don't fix it): the CPU prep's cost (S5), paint on the field (S7: tint,
  hover rim, reveal masks, explore), the label pass's Pixel speed (K1097), the old renderer's
  junctions (K1227-K1231), the text forks (K1220).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append your handoff to this brief (after your final rebase) and report. A compaction
  is not a stop: re-read this brief and `git log`.

## Report

Short, plain words: what you built; checks #12, 1-9 and 11 per scene; the census and the free
ends; the sheets, naming the three to show Levi first, and the flag-on links; the desktop cost;
the pins you moved; anything out of scope; the rebase and your last SHA. End with `Ledger items`
and K1040's handle fields.

## Handoff (S4b, 2026-11-06)

Claude agent ac5c423693cf9dec3 (coordinator: claude session c18e2f02-e64f-41ba-9af0-2dbd583358e2) ran
9:43-11:12 PST. It stopped 30 minutes before the 2 h cap (11:43), because no open Done item, plus
the handoff, fit in the time left. Branch `worktree-agent-ac5c423693cf9dec3` (worktree
`.claude/worktrees/agent-ac5c423693cf9dec3`), rebased onto origin/master 291780c5 (nothing newer at
11:09). `npm test` is green at 86bf5b0c: 220 files passed and 2 skipped, 2886 tests passed and 9
skipped. Not pushed.

| Done item | State |
|---|---|
| 1. F2 on the GPU, the flag | Corners and the flag are done. D4 ties, the outer-edge AA (F7 notes 3, 4), the exact cap mix and the g41_user_tw64 over-ink are not |
| 2. Checks on the 12 scenes | #12 ran on all 12 (below). Checks 1-9 and 11 were not run. The worst rows were viewed, not every spot over 1/32 px |
| 3. Pop census, free ends | Not run |
| 4. Sheets | #12's junction and worst sheets per scene (ref, GPU, diff at zoom 4), and the app's master and new rows. The fades, eyes, bends, ball and V apex sheets were not made |
| 5. Cost | Desktop table below. The `phone_batch.ps1` dry run passed (`out/batch_s4b_dry_20261106_1040.log`) |
| 6. Tests | Green after the rebase |

### Built (commits, oldest first)

- **3f278d6e: the corner terms on the GPU.**
  - `band_b.ts` packs a CRN table (CRN_TEXELS per corner; the layout is in its header) and each
    group's corner range.
  - The foot pass reads the table in `cornerBurial`: F9's same-chain burial and the fill's burial at
    omega, over the corners form B's `cornersNear` lists, through `uCell`.
  - A corner pass (`CORNER_VS`/`CORNER_FS`) draws one quad per corner over its terms' bbox. It draws
    the endpoint discs and V's disc clipped by `alphaG`, and the arc inside the wedge. MAX blending
    joins it to the foot strips.
  - On by default in BandBPass.
- **7b3c9dd9: the band's isMin reads no segment past an open chain's end** (`bestSeg + 1 < int(b0.z) || bcl`).
  def's near worst went from 5.839 to 3.097 (mismatches 87 to 9), and g41_user_tw64's from 10.427 to 3.277.
- **b5cad63d: the flag.** `fieldBand` (`fbb`, link-only, off by default) is appended to CODEC_PARAMS
  after `ruleUndos`. With it on, form B's GPU passes draw the border look's ink:
  - `src/render/field/field_b_app.ts` (new) builds the scene with K868's `gatherSceneInput` and
    `buildFieldScene`, calls `new FormB(scene, {dpr})` (the look's ctrlArc defaults to CTRL_ARC, 0.47), and draws
    LabelBPass and BandBPass.
  - `src/app/frame_loop.ts` imports it only with the flag on, and restores it after a context loss.
  - `src/app/panel_wiring.ts` sets `renderer.labelInk = params.labelInk || params.fieldBand`, so the
    old ink steps aside as it does for K868's `lbi`.
  - Hook: `window.__knotFieldB` (`stats`: rebuilds, kept, renders, fallback, chains, corners,
    instances, buildMs).
  - No edit in the Muse runs' files.
- **e7c04a6f: the probe scripts** in `.claude/probes/K1040/s4b/` (out/ is untracked).
- **86bf5b0c: K299's quotient census lists the corner grid's `floor(p / uCell)`** (reviewed benign:
  `test/render/paint_ring_lap.test.ts`).

Pins moved:
- `test/ui/param_codec.test.ts`: `["fieldBand", "boolean"]` appended.
- `test/ui/url_codec.test.ts`: the defaults and the key map.
- `test/ui/panel_rows.test.ts`: EXEMPT.
- `test/ui/daily_link.test.ts`: the counted table, 270/82/188.
- `test/render/paint_ring_lap.test.ts`: the reviewed quotient.

The golden snapshots stay green. With the flag off, no pixel changes by construction: the live path
only gains `|| params.fieldBand` (false) and an import behind the flag. No cross-build pixel A/B was
taken.

### Check #12, corners on (`out/check_c2_*.json`, `check_c2_summary.md`)

Away from corners and near them (S4a2's split). Counts are > 1/32, > 1/8, > 1/2 px, then run-count
mismatches.

Spots are in device px of the 2480x1800 frame.

| Scene | Corners | Away worst ΔF | Away counts | Near worst ΔF | Near counts |
|---|---|---|---|---|---|
| muse_hash | 192 | 2.068 at (1904.1, 1117.0) | 107, 74, 8, 7 | 2.732 at (1194.4, 914.4) | 861, 596, 104, 31 |
| muse_default_tw | 320 | 0.0138 at (1721.3, 261.6) | 0, 0, 0, 1 | 1.102 at (633.0, 702.8) | 179, 52, 8, 3 |
| def | 361 | 0.4295 at (1000.1, 611.1) | 5, 1, 0, 0 | 3.097 at (1674.4, 427.2) | 220, 101, 20, 9 |
| fat | 0 | 0.0294 at (843.9, 955.3) | 0, 0, 0, 0 | no near sections | |
| ring | 45 | 0.947 at (1737.0, 1434.1) | 7, 7, 1, 1 | 1.885 at (1408.3, 410.8) | 72, 44, 8, 0 |
| user_tw42.lightpaper | 150 | 2.840 at (736.7, 793.4) | 7, 5, 4, 1 | 2.496 at (1108.7, 1181.5) | 52, 23, 6, 2 |
| g41_def_tw42 | 385 | 0.0748 at (1955.3, 1388.6) | 1, 0, 0, 1 | 0.190 at (994.9, 610.0) | 51, 9, 0, 2 |
| g41_def_tw64 | 302 | 0.6515 at (628.3, 480.4) | 42, 31, 3, 2 | 1.631 at (1308.4, 1017.6) | 516, 302, 36, 12 |
| g41_ring_tw42 | 51 | 0.143 at (721.0, 1214.0) | 3, 1, 0, 0 | 0.2255 at (1160.7, 233.5) | 7, 2, 0, 0 |
| g41_ring_tw64 | 41 | 0.6356 at (1770.7, 1483.2) | 16, 14, 4, 0 | 2.130 at (1526.1, 1338.5) | 124, 82, 12, 4 |
| g41_user_tw42 | 150 | 2.852 at (736.7, 793.4) | 7, 5, 4, 1 | 2.464 at (1108.7, 1181.5) | 51, 21, 6, 3 |
| g41_user_tw64 | 122 | 1.352 at (1576.4, 770.2) | 36, 24, 4, 0 | 3.277 at (1920.0, 773.8) | 270, 184, 36, 11 |

- **Away from corners**, the numbers equal S4a2's in every scene except g41_user_tw64, where S4a2 had
  2.815 (37, 27, 7, 2).
- **Near corners**, S4a2 drew none. With the corners off on this branch (tag nc), def's near worst is
  9.330 (1454 mismatches) and g41_user_tw64's is 13.583.
- **Builds:** ten scenes ran at 99926182 (now 7b3c9dd9). def and g41_user_tw64 ran at b23390ae with
  the isMin fix uncommitted.

### Desktop cost (`out/time_t1_*.json`)

Measured at 18:36Z under the perf lock on build 56d7a839: 2480x1800, scale 2, 40 frames x 5 rounds
per arm, render sync, the band with corners. Lost 0, errors 0.

| Scene | Label p50/p95 ms | Label + band p50/p95 | Band adds | S4a2 adds | Prep label / band ms |
|---|---|---|---|---|---|
| muse_hash | 1.40 / 1.90 | 5.50 / 5.90 | +4.10 | +3.90 | 101.7 / 157.7 |
| muse_default_tw | 1.30 / 2.40 | 3.80 / 4.30 | +2.50 | +2.10 | 62.7 / 112.7 |
| def | 1.30 / 2.70 | 4.20 / 4.60 | +2.90 | +2.70 | 68.3 / 121.2 |
| fat | 1.20 / 2.60 | 1.90 / 2.40 | +0.70 | +0.70 | 35.4 / 68.6 |
| ring | 1.20 / 3.60 | 1.70 / 2.30 | +0.50 | +0.20 | 9.7 / 18.3 |
| user_tw42.lightpaper | 1.20 / 2.50 | 2.50 / 2.90 | +1.30 | +1.10 | 24.9 / 43.6 |
| g41_def_tw42 | 1.20 / 2.50 | 3.70 / 4.10 | +2.50 | +2.10 | 54.4 / 94.9 |
| g41_def_tw64 | 1.30 / 2.00 | 4.80 / 5.20 | +3.50 | +3.20 | 81.2 / 134.8 |
| g41_ring_tw42 | 1.50 / 4.00 | 1.70 / 2.70 | +0.20 | +0.30 | 7.5 / 13.7 |
| g41_ring_tw64 | 1.20 / 3.80 | 1.80 / 2.30 | +0.60 | +0.50 | 10.7 / 19.6 |
| g41_user_tw42 | 1.30 / 3.30 | 2.50 / 2.90 | +1.20 | +1.10 | 24.6 / 44.0 |
| g41_user_tw64 | 1.30 / 2.60 | 3.40 / 3.80 | +2.10 | +2.10 | 34.0 / 61.0 |

The corners cost 0-0.4 ms over S4a2's band.

### In the app

**Smoke** (`smoke.mjs`, `out/smoke/`, build 56d7a839). The six K868 links all load with the flag
on: fallback "", no context loss, no console errors, and zoom and drag rebuild the field. muse's first
load was still loading at 6.5 s; it is the browser's first page, with cold shader compiles.

The flag-on app rebuilds form B on every moved frame, on main. Each build takes 243-339 ms, so the
app runs at about 3 fps while the knot settles, zooms or drags. That is S5's CPU prep.

**Same-state A/B of def** (`app_ab.mjs` with phw=0 and phy=0, the K83 pins, the same physics hashes
and views; sheets in `out/sheets/app_phw0/`, `app_lbi/` and `app_ctrl/`):
- The control, flag off twice, differs only at the markers (K390).
- Flag on against off: the ink is one near-black colour instead of master's per-section ink (K868's
  residual, S7). The band's geometry also differs at many junctions: band IoU 0.674 over the frame.
- Against K868's `lbi` label app, which master already ships, the fbb band's IoU is 0.887. The
  differences are the markers and one arm, at (440-470, 300-380), that bends the other way.
- lbi against the old ink scores 0.588. So most of the geometry change against the old renderer is
  already in K868's label path (the scene export), not in S4b.
- Inferred, untested: the field scene lacks the old renderer's fused-arm cuts and stub ends. The old
  ink shows cut, notched ends where the field draws closed loops.
- `app_ab.mjs` loads each family by its seed alone, at today's defaults; `smoke.mjs` uses the K868
  tokens.

### Spots viewed

- muse_hash's away worst, 2.068 at (1904.1, 1117.0) (`out/sheets/view/muse_hash_worst_r0-1.png`, row
  0): a GPU dark hook, a red arc. Not fixed.
- g41_user_tw64 (1576.4, 770.2) (`view/g41_user_tw64_worst_r0-1.png`): the reference's halo arc, with
  a little GPU over-ink at its ends. This is the brief's over-ink item. Not fixed.
- g41_def_tw64's worst row 1 shows faint grey arcs, a dot and red streaks. def_junctions row 1 shows a
  GPU halo arc.
- The halos in S4a's `muse_hash_worst_1.png` row 1 and `g41_def_tw64_worst_1.png` are form B's own:
  the reference draws a soft grey haze there.
- Not fixed: muse_hash's near-corner spots at (1277, 828) and (1907, 550).

### Next (S4b's remainder)

1. **D4 ties.** Blend the two composite orders by cone-key distance (S4a2's Left) in
   `band_b_glsl.ts`. Then do the outer-edge AA (F7 notes 3 and 4), the exact cap mix at grazing
   crossings, the over-ink at g41_user_tw64 (1576.4, 770.2) and muse_hash's dark hook at (1904.1,
   1117.0).
2. **Two known gaps against form B in the corner code.**
   - `alphaG` takes each piece's AA without its `selfW`. form_b.ts's alphaOf takes
     `A.selfW * ss(-aa, aa, h - A.d)`.
   - CORNER_FS composites with the label's top T as lay 1 only. It lacks the foot pass's lays 2 and 3.
3. **The other checks.** Run checks 1-9 and 11 on the 12 scenes' GPU frames, then view every spot
   over 1/32 px.
4. **The pop census and the free ends.** Run `scripts/label_pops.ts` driving the new passes. Then run
   the free-end check on the 12 scenes, g41_user_tw64 and K972, K973, K955, K956.
5. **The missing sheets:** fades in motion, the eyes (K1045), the bends (K1049), the ball (K1002) and
   the V apex (K1003).
6. **The phone batch.** Claude runs it with the phone on its charger:
   `& '.\.claude\probes\K1040\s4b\phone_batch.ps1' -Name s4b -Runs @('--fit 411x753 --label s4bfit', '--label s4b')`.

**Tools:**
- `& .claude\probes\K1040\s4b\run_locked.ps1 -RunArgs @('check', '<scene>')` runs s4a.mjs (check,
  time or diag) under the perf lock. `-Script smoke.mjs` or `-Script app_ab.mjs` runs the app probes
  against a dev server started with
  `npx.cmd vite --config .claude/probes/K1040/s4b/vite.private-cache.config.ts --port 5961 --strictPort --host 127.0.0.1`.
- `ab_view.mjs`: two shots and a band overlay, with the IoU.
- `split.mjs`: cuts a sheet into pieces small enough to view.
- The CPU diags, `diag_*.ts`.

**Flag-on links** (live once a merge deploys): `https://levi.dev/knotmaze/?<token>&tlk=border&fbb=1&am=instant&snd=none`
with the K868 tokens:
- muse: `3.EjB9R7b0Hkh6LIKXm6e4geDMC0g`
- def: `b.EnCgeSHoaDwZgWk`
- fat: `p9ar6.EihVJ8adf0_iA8kPQ0HgzAtI`
- ring: `1rphqy1.EhKJfM6RfQ-qdfRUv6b1RfpY8lE3w-PuHoaDwZgWk`
- user: `1471kin.EhSJeJH4_ol9B-mT9CXsPh8aFfclDHiTEvRLYyJg6Gg8GYFpA`

**Out of scope** (named, not fixed): S5's CPU prep (the rebuild on every moved frame), S7's paint on
the field (the one ink colour), K868's scene export against the old ink, and the old renderer's
junctions (K1227-K1231).

**Incident:** at 10:28:59 a plain Vite on the shared cache rewrote `node_modules\.vite\deps`. I
restarted it on the private-cache config.

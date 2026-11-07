# K1040 S4a: the junction borders' tube edges on the GPU, drawn as the reference draws them

Ledger: K1040. One Claude Opus stage agent in its own worktree. Cap 2 h. Ports 5960-5969.

## Goal

Levi, 2026-11-06: "When are we going to fix junction borders though?" The new junction renderer
(K1040) draws every junction's borders, label and corners from one definition (F2 of
`docs/design/K1040_junction_field.md`). It has a float64 reference (`src/render/field/form_b.ts`)
and a GPU label pass (`src/render/field/label_b_*.ts`, S3: 0 DEFECT on the 12 scenes). Nothing
draws the borders on the GPU yet. Build the band pass's first half, F7's S4a:
- the tube-edge strips and the dead-end caps;
- term 1, the foot, with burial against the group's arm table and F3 D1-D2's fades;
- the endpoint terms where a burial ends;
- MAX blending, and coverage by S1's rule.

Its ink must be the reference's: on fat (no corners) and on the straight parts of the other 11
scenes, the GPU's border matches form B's within check #12 (ΔF ≤ 1/32 px away from corners, read
through checks.ts's InkProbe). S4b (the corners, the ties, the outer edge and the flag) comes
next, so nothing shows in the app yet.

## Authority

Every technical decision is yours: the strips, the arm table, the burial reads, the blend, the
shader, the probe switches, and check #12's code if it doesn't exist yet. The reference is the
look. Tests pin what you built; they don't define done. When you find a cause, fix it; don't stop
to report it. If the reference itself looks wrong somewhere, show where with a crop and keep its
definition: Levi looks at S4b.

## Start

- Your worktree starts at master 302ab066.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- Reuse K923's band prototype: `src/render/label/label_band.ts` (`buildBandStrips`, one instanced
  quad per outline piece, with its outward normal), `label_band_gpu.ts` and their tests in
  `test/render/label/`.
- S3's tools are tracked in `.claude/probes/K1040/s3/` (`page.ts`, `s3.mjs`, `run_locked.ps1`, and
  `phone_batch.ps1` for the Pixel plan). The 12 scenes are untracked, in the main checkout:
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`. Read them there or copy them.
  The probe server's config is
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1040\vite.private-cache.config.ts`; copy it.
  Put copies and new tools in `.claude/probes/K1040/s4a/`.

## Done

1. S4a's half of the band is drawn on the GPU behind a probe switch, off by default, so no
   default pixel in the app changes.
2. Check #12 runs on all 12 scenes away from corners. Per scene, report the worst ΔF and where it
   is. View every spot over 1/32 px, then fix it or explain it.
3. Sheets at zoom 4, with columns reference, GPU and difference, at five or more junctions per
   scene family (fat, def, user, ring, muse), in `.claude/probes/K1040/s4a/out/sheets/`. You
   viewed every crop at full size.
4. The desktop cost, label plus band per scene (render sync, as S3f2's split measures it), timed
   under the perf lock. Also write a Pixel batch for Claude: a `phone_batch.ps1` set, dry-run only.
5. `npm test` is green after `git fetch -q origin` and a rebase onto `origin/master`.

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges). Use the Read tool
  only right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output goes to `.claude/probes/K1040/s4a/out/`. Never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone, broken or not. Never push. Never edit LEDGER.md.
- Run every browser job (checks, shots, timings) under the perf lock, owner `K1040-S4a`. Wait for
  the lock inside one blocking command. Use at most two browsers, on ports 5960-5969.
- A dev server's stamp is the SHA it started from, so check the served code with a mark. Stop your
  servers when you're done. Run no phone commands.
- K1220 S2 runs beside you in `joinery.ts`, `ribbon_mesh.ts`, `junction_field.ts`, `arm_strip.ts`
  and `paint_*.ts`. Don't edit those files.
- Out of scope (name it if you see it, don't fix it):
  - the corners, fillet arcs, ties, outer edge and flag (S4b);
  - the CPU prep's cost (S5);
  - the label pass's Pixel speed (K1097);
  - the old renderer's junctions (K1227-K1231);
  - the text forks (K1220).
- Stop when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and
  at each milestone). Then commit WIP, append your handoff to this brief (after your final rebase)
  and report. A compaction is not a stop: re-read this brief and `git log`.

## Report

Keep it short and in plain words:
- what you built;
- check #12 per scene;
- the sheets, naming the two or three to show first;
- the desktop cost;
- the pins you moved;
- anything out of scope you saw;
- the rebase, and your last SHA.

Commit messages carry the record. End with `Ledger items` and K1040's handle fields (owner,
branch, last commit, evidence, next).

## Handoff (S4a, 2026-11-06, claude agent a938d2e1d4d9b45e3)

Stopped at the 2 h cap (start 06:42). Done 1, 3, 4 and 5 hold. Done 2 runs, but the goal's
1/32 px is not met yet: every scene, fat included, has sections over it. The causes are R1-R4 and
the unbuilt endpoint terms below. Each class was seen in a crop and has a place in it.

### What is built

Everything is in `src/render/field/`. Nothing in the app imports it; only the probe page builds a
`BandBPass`, so no default pixel changes.
- `band_b.ts`: `buildBandB` packs the tables, `BandBTables`. They hold a strip per chain
  segment and side, the dead-end caps, and each group's arm table and windows (`armReach`).
- `band_b_glsl.ts` is the shader.
  - A strip quad is widened to R = h + W + 2aa.
  - The fragment reads L's word at its pixel. The gate is `names()` and `topDist()`, lays 1-3: a
    chain's rim draws where L's top is that chain within the window, or where the top's own
    distance puts the rim outside the top surface.
  - Term 1 is the foot: (1 - bur) * selfW * beta * band2(h - d). Burial is taken against the
    group's arm table, with F3 D1-D2's fades. Coverage follows S1's rule.
  - Its two lap wraps are exact single steps, not `mod`, so K299's scan stays clean.
- `band_b_pass.ts`: `upload(T, B)` puts the tables on units 0-8 and L on unit 9. `draw(M, label,
  w, h)` is one instanced triangle-strip draw with MAX blending, into the framebuffer the caller
  has bound.
- **No target of its own.** A full-size pass costs about 2 ms fixed on the Pixel, 1.5 ms of it the
  bind and viewport:
  - main checkout, `.claude/probes/K1040/s3/out/split_s3f5.md`: on the desktop, "a pass that
    draws" is 0.70 ms of 2.60 (fat 1.00);
  - `phone_table_s3f5.md`: fat s3f3new 6.3/8.1 against s3ffloorall 1.0/2.7; def 7.5/9.3 against
    0.8/1.6.
- `label_b.ts` now exports `armWindowWalk` and `nbWindows`, for the band.
- Probe: `.claude/probes/K1040/s4a/`.
  - `page.ts`: label plus band and the readback; `--fit WxH` is the fit camera.
  - `s4a.mjs check|time|diag [scenes]`, run through `run_locked.ps1 -RunArgs @(...)` (perf lock
    `K1040-S4a`).
  - `ref_at.ts <scene> <u> <v> <chain> <k> <side>` prints form B's terms along one section.
  - `phone_time.mjs`, `run_phone.ps1`, `phone_batch.ps1`.
  - Outputs go in `out/`, untracked.

### Check #12

All scenes are 2480x1800. Sections are every 6 device px with t every 0.25 px, skipped near
corners. Lost 0, errors 0, re-run on the final shader.

| scene | worst dF px | at (dev) | chain k side | >1/32 | >1/8 | >1/2 | mismatches |
|---|---|---|---|---|---|---|---|
| muse_hash | 2.068 | 1904.1, 1117.0 | 71 1410 -1 | 132 | 89 | 10 | 7 |
| muse_default_tw | 1.053 | 643.2, 437.7 | 33 190 -1 | 14 | 5 | 1 | 1 |
| def | 0.977 | 1527.2, 1299.8 | 78 299 -1 | 29 | 9 | 3 | 0 |
| fat (21706 sections) | 0.579 | 990.0, 1549.3 | 2 4386 +1 | 49 | 11 | 1 | 1 |
| ring | 0.947 | 1737.0, 1434.1 | 3 322 -1 | 12 | 11 | 1 | 1 |
| user_tw42.lightpaper | 4.872 | 751.9, 803.1 | 22 322 -1 | 13 | 5 | 3 | 4 |
| g41_def_tw42 | 0.450 | 1067.9, 592.6 | 45 59 -1 | 17 | 9 | 0 | 1 |
| g41_def_tw64 | 3.280 | 1120.2, 1167.6 | 30 191 -1 | 54 | 35 | 8 | 6 |
| g41_ring_tw42 | 0.143 | 721.0, 1214.0 | 2 705 -1 | 8 | 2 | 0 | 1 |
| g41_ring_tw64 | 0.636 | 1770.7, 1483.2 | 4 31 +1 | 21 | 14 | 4 | 2 |
| g41_user_tw42 | 4.857 | 751.9, 803.1 | 22 322 -1 | 13 | 5 | 3 | 4 |
| g41_user_tw64 | 4.210 | 1443.8, 895.5 | 24 59 +1 | 42 | 27 | 6 | 4 |

Fat's worst went 1.19 px, then 0.728 with gate v2, then 0.579 with lay 3.

### What is left, by class

Crops are in `out/sheets/view/`.
- **R1. Two partial rims at one pixel. Cause observed.** Form B unions rims, 1 - prod(1 - a); MAX
  keeps only the larger.
  - At fat's worst, t 11.75, form B reads 0.822 against a largest term of 0.628. Chain 2's rims at
    s 362.9 and 354.85 overlap there.
  - It shows as single-pixel dots at crossing notches (fat_worst_0-2).
  - Fix, not built: per-pixel ownership so that each rim writes once, then a union blend
    (`blendFunc(ONE_MINUS_DST_COLOR, ONE)`).
- **R2. Group surfaces.** `topDist()` returns -1 when L's surface code is not 0, so a group
  surface's band is missing or too low.
  - The reference's soft grey halos and fades around burials are absent; stray grey dashes appear
    instead.
  - Seen in muse_hash_worst_0-1, g41_def_tw64_worst_0-1, user_tw42.lightpaper_worst_0 and
    muse_hash_junctions_0-2.
  - Next: the distance to a group's surface, from its arm table.
- **R3. END arms.** Form B extends END-arm chains to c-prime (s < 0); the GPU's strips and `candOn`
  stop at sample 0. user_tw42 chain 1 k0 at (1337.0, 999.8): ref 95-254, GPU 5-11.
- **R4. Over-ink beside a group surface.** user_tw42 (736.7, 793.4) side +1: GPU 19-105, ref 4-45.
- **Burial endpoints.** The GPU cuts where the reference fades: muse_hash_junctions_1,
  ring_junctions_2 row 1, user_tw42.lightpaper_worst_1 rows 1 and 3. The endpoint terms are not
  built.
- **Not diagnosed:** muse_hash (1904.1, 1117.0) and g41_user_tw64 (1443.8, 895.5).
- **For Levi at S4b.** At zoom 4 the reference's halos around group surfaces read as grey smudges
  inside a white tube (muse_hash_worst_1 row 1, g41_def_tw64_worst_1). I kept its definition.
- **Not built:**
  - fill burial and F9, and ties;
  - the exact cap mix for several buriers;
  - the winW +-3-segment window, and GW windows bounded by `armReach`;
  - other chains' selfW, taken as 1;
  - unit-test pins for band_b;
  - shared tables: the band's are copies of the label pass's PTS/CHAIN/SPAN.

### Sheets

`out/sheets/<scene>_junctions.png` holds 5 or more junctions per scene; `<scene>_worst.png` holds
the worst sections. Columns are reference, GPU, difference (red = GPU over, blue = GPU under), at
zoom 4. Show first:
- fat_junctions, the match;
- muse_hash_worst, R2;
- ring_junctions: S4b's missing corner arcs, plus a burial fade.

At every junction of def, ring, user and muse, the GPU's arm borders end in V-cuts where the
reference has rounded corners: S4b.

### Desktop cost

Render sync p50/p95 ms, label alone against label plus band, under the perf lock at 8eaa84a3
(lay 3, before the exact wraps, which draw the same). Prep is the CPU build of label / band, the
cost S5 owns.

| scene | 2480x1800: label, +band, adds | fit 822x1506: label, +band, adds | strips | prep ms |
|---|---|---|---|---|
| muse_hash | 1.5/1.9, 5.0/5.3, +3.5 | 1.4/2.9, 3.2/3.6, +1.8 | 46698 | 102 / 162 |
| muse_default_tw | 1.5/2.9, 3.2/3.6, +1.7 | 1.7/4.3, 2.3/2.7, +0.6 | 47284 | 62 / 114 |
| def | 1.4/2.6, 3.5/3.9, +2.1 | 1.5/4.4, 2.4/2.8, +0.9 | 49036 | 65 / 116 |
| fat | 1.3/3.5, 1.9/2.3, +0.6 | 1.3/3.8, 1.8/3.5, +0.5 | 34650 | 38 / 65 |
| ring | 1.6/4.3, 1.7/2.3, +0.1 | 1.2/3.8, 1.7/4.5, +0.5 | 9128 | 10 / 17 |
| user_tw42.lightpaper | 1.6/4.3, 2.1/2.7, +0.5 | 1.3/3.9, 1.8/3.4, +0.5 | 21290 | 25 / 45 |
| g41_def_tw42 | 1.4/2.6, 3.1/3.5, +1.7 | 1.6/4.2, 2.2/2.7, +0.6 | 49320 | 56 / 95 |
| g41_def_tw64 | 1.5/2.4, 4.2/4.6, +2.7 | 1.4/4.3, 2.8/3.3, +1.4 | 48706 | 83 / 133 |
| g41_ring_tw42 | 1.5/4.0, 1.7/3.1, +0.2 | 1.1/3.7, 1.6/4.5, +0.5 | 9212 | 8 / 14 |
| g41_ring_tw64 | 1.4/4.1, 1.7/2.2, +0.3 | 1.3/3.9, 1.8/3.5, +0.5 | 9108 | 10 / 18 |
| g41_user_tw42 | 1.4/4.1, 2.1/2.5, +0.7 | 1.3/3.9, 1.7/3.0, +0.4 | 21290 | 24 / 42 |
| g41_user_tw64 | 1.5/2.7, 3.0/3.3, +1.5 | 1.6/4.2, 1.9/2.5, +0.3 | 21094 | 33 / 59 |

**Pixel batch.** The dry run passed: both runs bundle all 12 scenes. For Claude to run with the
phone on its charger (set `$env:ANDROID_SERIAL` when USB and wireless adb are both up):
`& .claude\probes\K1040\s4a\phone_batch.ps1 -Name s4a -Runs @('--fit 411x753 --label s4afit', '--label s4a')`

### Next

1. R2: a group surface's band.
2. The endpoint terms and fades.
3. R3: END arms in the strips and `candOn`.
4. R1: ownership plus a union blend.
5. R4.
6. The Pixel batch, then S4b.
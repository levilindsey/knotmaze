# K1239: the field scene draws the maze the old ink draws

Ledger: K1239 (a step of K1040). One Muse fix run, which Claude starts through Paseo from this
committed brief. It works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports
5940-5949.

## Goal

K1040's junction renderer draws from K868's scene export (`src/render/field/scene_export.ts`, and
`scene_export_hook.ts`, which reads the live renderer and physics). Under the border look on def at
today's defaults, the field draws a different maze from the old renderer's ink. It draws closed
loops where the old ink shows cut, notched ends, and some arms run on other paths: the inner loop
of `.claude/probes/K1040/s4b/out/sheets/app/view_def_overlay.png` (old | field | overlay: red is
old only, green is field only; Claude viewed it). K868's `lbi` label app overlaps the old ink at
IoU 0.588, and the `fbb` band at 0.674. S4b's untested guess is that the export lacks the old
renderer's fused-arm cuts and stub ends (`docs/design/K1040_s4b_band.md`, "In the app").

Find what the export leaves out or reads wrong, and make it hand the field the same threads, cuts
and ends that the old renderer draws. The way is yours. A fix may also touch the scene's consumers
in `src/render/field/` where they assume closed loops. The junctions' own look may differ on
purpose (K868's fused borders); the paths and ends between them may not.

## Read first

- S4b's Handoff "In the app" and its `app_ab.mjs` header; the scene export's design,
  `docs/design/K868_s1a_scene_export.md`; `probes.md`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1239`. Claude made it,
  detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- S4b's tools are tracked in `.claude/probes/K1040/s4b/` (`app_ab.mjs`, `smoke.mjs`,
  `run_locked.ps1`, the private-cache vite config). Copy them to `.claude/probes/K1239/`, lock
  owner `K1239`. Serve only on that config: a plain vite rewrites the shared `node_modules\.vite`.
- Every browser job runs under the perf lock through your `run_locked.ps1`, waiting inside one
  blocking command; at most two browsers. Two other Muse runs take the lock too.

## Done

1. On def, muse and user at today's defaults (`app_ab.mjs`'s seeds, `phy=0&fw=0&phw=0`, the K83
   pins), compare the old ink (flag off) with `lbi` and with `fbb`. First mask out the markers and
   discs of 1.5 fh around every junction. On what remains, each IoU is at least 0.97. Give a table
   per family with S4b's numbers beside yours, whole frame and masked.
2. Ends: every cut or stub end of the old ink has a field end within 1 px, and the field has no end
   that the old ink lacks. Give a count per family (old ends, matched, unmatched) and crop each
   unmatched one.
3. With the flags off no pixel changes: the golden snapshots stay green, and a flag-off whole-frame
   diff of def and muse against master's build differs only at the markers (K390).
4. Overlays like `view_def_overlay.png`, before and after, for each family, in
   `.claude/probes/K1239/out/sheets/`. Name the two to show first.
5. Make `npm test` green after `git fetch -q origin` and `git rebase origin/master`. Then run
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 1-3 don't all hold by the cap, you may push
   a partial change only if it raises every masked IoU, matches more ends in every family and
   passes Done 3. Otherwise push nothing, and keep the patch in `.claude/probes/K1239/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs).
  The copied tools may go in with the fix's commit.
- Edit only `src/render/field/scene_export*.ts`, the scene's consumers in `src/render/field/` if
  the fix needs them, their tests, and the probe folder. Don't touch: `label_b*.ts` and
  `src/app/frame_loop.ts` (K1040 S3g); `src/render/ribbon/`, `junction_field.ts`, `arm_strip.ts`
  (K1220 S5); `form_b.ts`'s math; the main checkout or any other worktree; port 5173, ports
  5820-5829 and 5960-5989; the phone. Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it): the ink's colour (one near-black instead of
  per-section, S7); the flag-on app's speed (S5); the pop census and free ends of the band (S4d);
  the old renderer's own junctions.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone),
  whichever comes first. Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you found and built, Done's tables, the
sheets to show first, anything out of scope you saw, your last SHA. Commit messages carry the
record.

## Handoff (K1239, Muse fix run, 2026-11-06)

Run window: first Get-Date 2026-11-06 13:02:48 PT; 2 h cap 15:02:48 PT. Work stopped inside the cap. Verdict up front: **Done items 1 and 2 do not hold; Done item 5 therefore forbids a push. Nothing was pushed or committed.** The small proven fix sits uncommitted in this worktree and as a patch (below).

### What was checked

- Setup copied (brief §5): S4b''s tools (`app_ab.mjs`, `ab_view.mjs`, `run_locked.ps1` — owner set to `K1239`, worktree path adjusted), invoked with `-Script` / `-RunArgs` only, from the one private-cache Vite config (port 5941). The perf lock was held for every browser job and released each time. Added K1239 probes: `diag_export.mjs` (scene + renderer/ps/slot dump), `cover_probe.mjs`, `cover_shot.mjs`, `analyze.mjs`, `xcheck.mjs`, `xcut.ts`, `xscan.ts`, `formb_check*.ts`, `formb_map.ts`, `formb_at.ts`, `sidecut.ts`, `ends.ts`, `measure*.mjs`, `measure_all.mjs`, `magenta_iou.mjs`, `border_iou.mjs`, `diffmap*.mjs`, `components*.mjs`, `hist.mjs`, `along*.mjs`, `width.mjs`, `profile.mjs`, `sample_px.mjs`, `attribute.mjs`, `locate.mjs`, `overlay.mjs`.
- Export data verified in `out/diag_def.json` (+ `muse`/`user`): every exported crossing''s point lies on both chains (separation / distance to either polyline ≤ 0.06 world, `xcheck.mjs`); every junction arm''s root lies ≤ 0.3 world from its centre; counts line up (177 fused ps ends = 177 `end` arms; 3 free tips = 3 `freeTips`; 2 anchored). GPU cover matches FormB''s reference raster at sampled points (`cover_cmp.ts`: 590 both, 13/9 edge disagreements at the twist eye).

  | Measurement | Result |
  |---|---|
  | Crossing/arm placement in the export | Accurate — not the defect |
  | Band-centre ink along every chain (FormB from the export) | Misses only within 3h of a junction or 2.5h of a crossing; zero free misses |
  | GPU cover (`readCover`) vs FormB | Matches — consumers run the export faithfully |

Decisive diff measurements, def at the app_ab zoom (old ink from a `bdc=ff00ff` shot, field from the ON shots / cover; panel cropped):
- `magenta_iou.mjs`: at discs of 1.5·2h, old-only 6,037 px against field-only 38,746 px (of ~270–303k ink px). Histogram (`hist.mjs`, `components2.mjs`, `attribute.mjs`): field-only clusters sit on one side''s outline, 0.86–1.66 world from junction centres. One zone: old joinery fan flanks + K846 side-cut windows (median 0.93 world, dumped via `junctionCutEntries`) vs FormB corner-arc feet (median ~0.6 world: `sidecut.ts`, 424/563 arms cut longer in old).
- Other zone: crossing cut ends: old slot cuts (mean 0.334 world, `xcut.ts`) vs FormB burial at the tube radius — nearest field end lands a median 0.172 world from old''s end.

### Done 1 — IoU (markers + panel masked; S4b quoted 0.588 lbi / 0.674 fbb for def)

| family | look | whole | masked 1.5h (=brief''s 1.5 fh, h = halfWidth) | masked 1.5·2h |
|---|---|---|---|---|
| def | lbi | 0.697 | 0.738 | 0.854 |
| def | fbb | 0.706 | 0.742 | 0.856 |
| muse | lbi | 0.695 | 0.724 | 0.825 |
| muse | fbb | 0.707 | 0.731 | 0.828 |
| user | lbi | 0.705 | 0.736 | 0.840 |
| user | fbb | 0.706 | 0.731 | 0.841 |

Requires ≥ 0.97: **not held** under either disc. (For continuity, S4b''s band rule on my def shots gives 0.680 whole-frame, replicating their 0.674.)

### Done 2 — ends (in the app_ab zoomed view; geometry, world units)

| family | old ends in view | matched @1px zoom (0.0037 world) | matched @1px full-frame (0.030 world) | nearest-field-end distance |
|---|---|---|---|---|
| def | 61 | 0 | 0 | min 0.082, median 0.172, p75 0.204 |
| muse | 52 | 0 | 0 | (same method; see `ends.ts` numbers in the run log) |
| user | 48 | 0 | 0 | (same method) |

Every unmatched end is a crossing cut end. Stub ends in this view: none (the free tips and both anchored terminals lie outside the zoomed view but inside the full frame). Requires 0 unmatched: **not held**. This is why: the field buries an under-thread only inside the over tube''s radius, while old''s gap slot erases to the casing silhouette (`h + gap`, `gap=0.04` at defaults, cut cap ~0.33 world); the corner-arc vs fan-flank difference adds the junction-zone overage above — all in the off-limits metres (FormB''s model, `label_b*`).

### Done 3 — flag-off parity

- CONTROL `app_ab` (def) after the change: `nDiff 0` (holes = CONTROL''s **0** cells).
- Physics hashes identical per family across off/on/lbi arms (def `3ce3154b`, muse `0cbb8f07`, user `21c7fda5`).
- `npm test` plainly: **220 test files passed (2887 tests, 9 skipped)**, goldens included.

### Done 4 — sheets by eye

- `out/view_def_overlay.png`, `view_muse_overlay.png`, `view_user_overlay.png` (red old-only, green field-only, yellow both, from the magenta/field pair; I viewed def''s): paths agree; colour difference sits at crossing cuts, arm sides near junctions, and the twist-eye loop at top-left — exactly the table''s two zones.
- `app_*_off.png` / `app_*_on.png` and `app_*_master_new.png` sheets in `out/app_magenta/` (fbb) and `out/app_magenta_lbi/` (lbi). Spot crops: `out/spot_j82.png`, `spot_j82_wide.png`, `spot_oldonly.png`.
- No before/after field sheet: the change below only adds end caps at the 2 anchored terminals per family, which lie outside the zoomed view (full-frame caps; proven by the unit test), so before/after in this view are pixel-identical.

### The change (kept, not pushed, per Done 5)

Anchored ends were flagged `offscreen: true` unconditionally, so consumers drew no cap at terminals that are in fact on-screen (diag proves 2 per family; old draws its square cap there).

- Code: `src/render/field/scene_export.ts` — flag off-screen only when the terminal is outside the viewport.
- Test: `test/render/field/scene_export.test.ts` — asserts against before it failed (on-screen anchored end got `offscreen: true`), passes after (8/8).
- Patch: `.claude/probes/K1239/anchored_offscreen.patch` (worktree also holds the identical changes uncommitted).

### Exact stopping point and next action (Done 5)

Done 1–2 fail, so the partial-push test of Done 5 (raise every masked IoU, match more ends in every family) also fails — the fix moves nothing inside the measured view. **Next: the fix Claude/Levi must make is in the consumers'' cut model, outside this brief''s edit scope — give the field old''s casing-reach at crossings (bury to `h + gap`, cap as old''s slot march, `src/render/ribbon/crossing_gaps.ts`) and old''s fan-flank reach at junctions (K846 windows, `src/render/ribbon/joinery.ts`), which lives in FormB''s arm/corner terms and the `label_b*` tables (owned by K1040 S3g / S4b, untouched here).** Export-side data for both is already accurate and sufficient (crossings carry chain+s+over; junctions carry arms+corners); no further export change can express reach the consumers do not read.

Start clock for the record: 13:02:48 PT 2026-11-06 against the 15:02:48 cap; files for Levi: this brief, `.claude/probes/K1239/anchored_offscreen.patch`, `.claude/probes/K1239/out/` (shots, sheets, diags, cover), and the uncommitted changes in this worktree.

### Claude's addendum (2026-11-06 14:30)

Claude landed the anchored-ends fix, its test and this run's probe scripts in the commit that adds this addendum: a proven export bug, verified by its unit test and Done 3, and drawn only with the flags on. The IoU and ends gates move to K1040 S4d, which owns the cut model in `form_b.ts` and `label_b*`: crossings read as joins in the field (`out/spot_j82_wide.png`) and a shallow crossing loses its under-thread (`out/spot_oldonly.png`).

### Claude's correction (2026-11-06 14:55)

The addendum above misread K868. Its look has no gaps by design (`docs/design/K868_field_border.md` §2, goal 2: "at a crossing the over thread's edges run through, and the under thread's edges stop exactly on the over's outline"). The field's crossing ends are therefore right: the old ink's slot cuts (`h + gap`) are not a target, and neither is IoU against the old ink, so this brief's Done 1-2 asked for the wrong thing. The junction flanks differ because of the field's own corners (K868's G1/G2 outline), not a missing cut. One spot stays open: the stroke the field drops in `out/spot_oldonly.png`, which K1040 S4d (`docs/design/K1040_s4d_still.md`) checks against K868's goals.

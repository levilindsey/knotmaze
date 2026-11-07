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

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

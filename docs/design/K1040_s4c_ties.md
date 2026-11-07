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

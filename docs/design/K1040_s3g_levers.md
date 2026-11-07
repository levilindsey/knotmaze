# K1040 S3g: the label pass's structural levers, timed on the Pixel

Ledger: K1097. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5820-5829 (the
phone's `phone_time.mjs` keeps 5403).

## Goal

The label pass (`src/render/field/label_b_pass.ts`, F7 of `docs/design/K1040_junction_field.md`)
must cost at most 2 ms on the Pixel (p50 of the pass minus the floor, plus its upload) on each of
the 12 scenes before form B's junction ink can ship. S3f5 (Run B of
`docs/design/K1204_muse_batch21.md`; `.claude/probes/K1040/s3/out/phone_table_s3f5.md`) measured
4.1 to 9.7 ms: a fixed cost of about 2.2 ms that a pass drawing nothing already pays, the drawing
about 2.6, the upload 0.6 to 2.8. Its shader-level variants (d24, dinv, dtex, fetch, spflat) moved
nothing beyond noise. What is left is structural; the way is yours. Two leads:
- where the pass sits in the frame. A fixed cost for an empty pass smells of a tiled GPU storing
  and reloading the canvas around a target switch: e.g. run the pass before anything draws to the
  canvas in that frame, and drop clears or stores that nothing needs;
- the upload: fewer rows, smaller or packed formats where the result stays exact, fewer textures.

The label target must not change: every lever keeps it bit-identical on the 12 scenes.

## Read first

- Run B of `docs/design/K1204_muse_batch21.md` (from its "Run B" heading: the pass, its probe
  knobs, the page, the tools, the gate-script model) and its Handoff; F7 of
  `docs/design/K1040_junction_field.md`; `probes.md`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1097-s3g`. Claude made
  it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- The tools are tracked in `.claude/probes/K1040/s3/` (`page.ts`, `s3.mjs`, `split.mjs`,
  `run_locked.ps1`, `s3f5_gate.ps1`, `phone_batch.ps1`, `run_phone.ps1`, `phone_time.mjs`,
  `phone_table.ps1`). Add your variants and an `s3g_gate.ps1` beside them, lock owner `K1040-S3g`;
  outputs go to `.claude/probes/K1040/s3/out/` under `s3g` names.
- Desktop browser jobs run under the perf lock through `run_locked.ps1`, waiting inside one
  blocking command; at most two browsers. Two other Muse runs take the lock too.

## The phone

Levi's Pixel is on its charger, unlocked, from about 12:45; Claude runs one batch on it first
(about 12:45 to 13:05). Use the phone only through `phone_batch.ps1` (its `run_phone.ps1` takes the
phone lock, then the perf lock, then the ready check). Before 13:05, wait inside one blocking
command. If the ready check says not ready, wait 10 minutes and try once more, then stop and report.
Never wake, unlock or send keys to the phone, and never print or write its serial or an address.

## Done

1. Each lever is a variant beside today's pass (a probe knob, default off, as S3f4's and S3f5's
   were), and its label target is bit-identical to today's on the 12 scenes (`s3.mjs check`).
2. One phone batch holds today's pass, each lever and the floor, so they share the phone's state.
   A table per scene: each one's p50/p95 and upload, the gate number, and each lever's difference
   from today's.
3. Every lever that lowers the gate number on at least 10 of 12 scenes by more than the batch's
   run-to-run difference becomes the pass's default; the rest are removed. Say whether the result
   is at most 2 ms on all 12 scenes, and give the split of what remains.
4. The default app doesn't change (the label pass runs only under its flags): `npm test` green.
5. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If no lever qualifies by the cap, push nothing but the
   tables' tools and keep the variants as a patch in `.claude/probes/K1040/s3/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs).
- Edit only `src/render/field/label_b*.ts`, the label slot in `src/app/frame_loop.ts` if a lever
  needs it, and the probe folder. Don't touch: `band_b*.ts`, `field_b_app.ts`, `form_b.ts` and
  `scene_export*.ts` (K1040 S4c and K1239); `src/render/ribbon/`, `junction_field.ts`,
  `arm_strip.ts` (K1220 S5); the main checkout or any other worktree; port 5173, ports 5940-5989.
  Don't edit LEDGER.md.
- Out of scope (name it if you see it): one pass for the label and the band (after S4c lands);
  the form B app's speed while moving (S5); oracle30's verdicts and the pops.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you built, Done's tables, anything out of
scope you saw, your last SHA. Commit messages carry the record.

# K1040 S4a2: the GPU band's ink matches form B away from corners

Ledger: K1040. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5960-5969.

## Goal

Levi, 2026-11-06: "When are we going to fix junction borders though?" S4a (its Handoff ends
`docs/design/K1040_s4a_band.md`) built the GPU band pass's first half in
`src/render/field/band_b.ts`, `band_b_glsl.ts` and `band_b_pass.ts`. Check #12 (ΔF ≤ 1/32 px
against the float64 reference, form B, away from corners) fails on all 12 scenes. S4a found five
causes and placed each in a crop. Fix them, in this order:

1. R2, group surfaces: `topDist()` returns -1 when L's surface code is not 0, so a group surface's
   band is missing or too low. Give it the distance to the group's surface, from its arm table.
2. The burial endpoint terms and their fades (F3 and F7's S4a in
   `docs/design/K1040_junction_field.md`): today the GPU cuts where the reference fades.
3. R3, END arms: form B extends an END arm's chain to c-prime (s < 0); the strips and `candOn`
   stop at sample 0.
4. R1, two partial rims at one pixel: form B unions them, 1 - (1 - a)(1 - b); MAX keeps the
   larger. S4a's proposal is per-pixel ownership plus a union blend; any way that gives form B's
   value is fine.
5. R4, the over-ink beside a group surface in user_tw42 at (736.7, 793.4), side +1.

Then the two spots S4a did not diagnose: muse_hash (1904.1, 1117.0) and g41_user_tw64
(1443.8, 895.5). Form B (`src/render/field/form_b.ts`) is the definition: don't change it.

## Read first

- S4a's Handoff (from line 94 of `docs/design/K1040_s4a_band.md`) and the brief above it.
- F3 (line 355) and F7 (line 616) of `docs/design/K1040_junction_field.md`.
- `.claude/rules/render-field.md`, `render-shaders.md` (K299's scan: no `mod` in lap wraps) and
  `probes.md`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1040-s4a2`. Claude
  made it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- S4a's tools are tracked in `.claude/probes/K1040/s4a/`: `s4a.mjs check|time|diag [scenes]`, run
  through `run_locked.ps1 -RunArgs @(...)`, and `ref_at.ts` (form B's terms along one section).
  Copy them to `.claude/probes/K1040/s4a2/`, with lock owner `K1040-S4a2`, and work there.
- The 12 scenes are in the main checkout's `.claude/probes/K868/scenes/` (read them, don't write).
  S4a's results and crops are in its kept worktree:
  `.claude/worktrees/agent-a938d2e1d4d9b45e3/.claude/probes/K1040/s4a/out/` (read-only).
- Every browser job runs under the perf lock through your copy of `run_locked.ps1`: real time,
  headed, at most two browsers.

## Done

1. Check #12 on all 12 scenes, away from corners: ΔF ≤ 1/32 px. A table per scene: the worst ΔF
   and where, before (S4a's) and after. A spot still over: crop it and name its cause. A spot
   that is a corner's (S4b's) says so.
2. The fixes are in the band files (`label_b.ts` only for shared exports), each with a
   `K1040 S4a2` comment. Nothing in the app imports the band, so no default pixel changes and the
   golden snapshots stay green.
3. `test/render/field/band_b.test.ts` pins the tables' new parts (an END arm's s < 0 reach, a
   group surface's distance), on a small scene.
4. The desktop cost again (`s4a.mjs time`), beside S4a's table.
5. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 1 does not hold at the cap, push what
   passes Done 2-5, and the Handoff says what is left.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs).
  The copied tools may go in with a fix's commit.
- Don't touch:
  - the main checkout (Claude merges there), or any other worktree;
  - `src/render/ribbon/joinery.ts` and `ribbon_renderer.ts` (K1220 S3, another Muse run, in
    `muse-k1220-s3` on ports 5980-5989);
  - port 5173, or the phone.
- Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it):
  - the corners, fillet arcs, V, t_a, t_b, ω, the D4 tie, the outer edge's AA and the flag (S4b,
    a Claude agent after you);
  - the CPU prep's cost (S5), and the band's copies of the label pass's tables;
  - the label pass's Pixel speed (K1097);
  - the old renderer's junctions (K1227-K1231);
  - how the reference's halos look (Levi judges that at S4b).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you fixed per cause, check #12's table
before and after, the cost, anything left, your last SHA. Commit messages carry the record.

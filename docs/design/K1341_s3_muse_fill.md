# K1341 stage 3 (Muse): def fill no slower than master

Ledger: K1341. One Muse run, started by Claude through Paseo from this committed brief. Cap 2 h. Read first: the
handoff at the end of `docs/design/K1341_s2_split_cuts.md`, then `.claude/rules/render.md` and
`.claude/rules/probes.md` (Claude's area rules; Muse does not load them by itself).

## Why

K1341 s2 (merged at 1da71a35) kept stage 1's exact `draw.ts` cuts: zChains is 22% faster on def, 20% on muse_hash
and 35% on fat, bit-identical. It dropped every `fill_tri.ts` and `chain_frame.ts` cut. In its interleaved Node A/B
(`.claude/probes/K1341/k1341s2_ab.ts`, master and branch in one process, alternated frame by frame), def fill still
read +1.0% to +2.7% slower than master in three runs (the last +2.4% ±2.1%). Suspects: GC moving into the fill window
now that zChains allocates less, or the shared helpers in `draw.ts` that fill reaches (`footNear`, `zAtC`).

## Goal

Fill on the def drag no slower than master, with zChains' gains kept and every output bit-identical. In order:

1. **A null test:** run the A/B with two identical copies of today's code. If fill reads slower there too, the
   harness has an order or position bias: fix the harness (randomize or alternate the order per pair) and re-measure
   before changing code.
2. If the slowdown is real, find it (a GC trace with `--trace-gc`, or bisecting the `draw.ts` cuts with the A/B)
   and fix it: change or revert the cut that costs fill, keeping zChains at least 15% faster than master on def.

## Done

1. The interleaved Node table: fill, band and zChains for def, muse_hash and fat, master against yours, with the
   95% interval. Fill's interval on def includes zero or is negative; zChains keeps at least 15% on def.
2. **Identity:** the s18 drags and the 12 census scenes digest equal to master's
   (`.claude/probes/K1341/k1341s1_digest.ts`, built with `.claude/probes/K1247/k1247s28_build.mjs`; run it in your
   worktree and against a `git archive` export of master, and compare the files).
3. `npm test` green, golden snapshots and the pins in `outline_port.test.ts`, `outline_inc.test.ts` and
   `byte_identity.test.ts` unchanged. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and
   `g41_user_tw64.json`, and `.claude/probes/K1247/out/s18/`, from the main checkout first (untracked; without them
   tests skip).

## How to work

- **Your worktree** is `.claude/worktrees/muse-k1341-s3` (detached, at master). `node_modules` is a junction to the
  main checkout's; never `npm ci`.
- **The A/B's master copy** (`k1341s2_ab.ts` expects it at `src/render/outline_m`) must be deleted before every
  `npm test`: `paint_ring_lap.test.ts` scans every GLSL file under `src/render` and fails on the copy. Never commit
  it.
- **Your files:** `src/render/outline/draw.ts`, `fill_tri.ts`, `chain_frame.ts`, tests, and tools under
  `.claude/probes/K1341/` named `k1341s3_*`. Two Claude agents are working in `outline.ts`, `outline_model.ts`,
  `outline_worker.ts`, `outline_app.ts`, the band files (`band_gpu.ts`, `band_place.ts`, `band_rec.ts`),
  `rec_glsl.ts` and `paint.ts`: stay out of those. `draw.ts`'s `bandData` calls `ownAlpha` from `band_gpu.ts`;
  leave that call as it is.
- PowerShell. Read code with Select-String and 40-80 line ranges of Get-Content; never print a whole file. Write
  TypeScript through Node or the editor, never through PowerShell text IO.
- Timing: the interleaved Node A/B needs no perf lock (load cancels in the paired diff). Note the machine's load
  with each run.
- **Commits:** commit finished, tested parts and push them yourself: `git fetch`, rebase on origin/master,
  `npm test` green, then `git push origin HEAD:master`. Stage files by name; scripts under `.claude/` need
  `git add -f`. Never force-push, skip hooks, or add outputs (`out/`) or probe JSON.
- **Ledger:** leave K1341 to Claude. File new items only with
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
- No subagents. Run `Get-Date` at the start and at each milestone. **Stop** at the 2 h cap or when every Done
  holds. A Done that looks out of reach is not a stop: spend the time on the next most promising cause.
- When you stop: append a Handoff to this brief (start and stop times, the table, what changed, what is left),
  commit and push it, and report. A stopped run pushes only its finished part; keep unfinished code as a patch under
  `.claude/probes/K1341/` (untracked).

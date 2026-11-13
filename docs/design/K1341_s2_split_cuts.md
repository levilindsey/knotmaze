# K1341 stage 2: keep the cuts that pay

Ledgers: K1341 (this), K1247 (the speed plan). One Claude Sonnet agent in its own worktree. Cap 1 h. Read first: the
stage 1 handoff at the end of `docs/design/K1341_s1_fill_zchains_cuts.md`.

## Why

Stage 1 (branch `worktree-agent-a74fd2c72ec40ff48`, last commit 109e621f) made exact cuts in three files, and every
build matched master bit for bit:

- **`draw.ts` (zChains):** zChains is 25% faster on def, 17% on muse_hash and 40% on fat, in both Node and the app.
- **`chain_frame.ts` and `fill_tri.ts`:** these saved less than the noise. One Node run timing fill and band alone on
  def put fill about 7% slower and band slower by about the spread. Every run was under load, so the result is
  unclear.

Some of the shared helpers changed too (`footNear`, `zAtC`, `dSC`, `csAt`), and band calls them as well.

## Goal

A branch that keeps every cut that measurably pays and drops the rest, with no part slower than master. Output stays
bit-identical.

Time each part in one Node process, with master's and the branch's code side by side and alternated frame by frame.
That cancels the load from other agents, which ruined stage 1's runs. `.claude/probes/K1346/k1346_ab.ts` loads
master's `outline.ts` as a temporary module next to HEAD's in this way: copy that pattern for `fill_tri.ts`,
`chain_frame.ts` and `draw.ts`. Then:

1. Time fill, band and zChains, master against the branch, alternated, over the s18 drags (def, muse_hash, fat), with
   enough repetitions that the interval excludes zero or shows equality.
2. If fill or band is slower, bisect stage 1's cuts in `chain_frame.ts`, `fill_tri.ts` and the shared helpers.
   Revert any cut that reads slower or no faster. Keep the `draw.ts` cuts unless one of them is what slows band.

## Done

1. The interleaved Node table: fill, band and zChains for def, muse_hash and fat, master against your branch, with
   the interval. No part is slower.
2. **Identity:** the s18 drags and all 12 census scenes are bit-identical to master. Use
   `.claude/probes/K1341/k1341s1_digest.ts`.
3. `npm test` green, with the golden snapshots and the pins in `outline_port.test.ts`, `outline_inc.test.ts` and
   `byte_identity.test.ts` unchanged. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and
   `g41_user_tw64.json`, and `.claude/probes/K1247/out/s18/`, from the main checkout first. They are untracked, so
   without them tests skip.

## Setup

Your worktree starts at master. Note master's SHA (`git rev-parse HEAD`), then
`git reset --hard worktree-agent-a74fd2c72ec40ff48` and `git rebase <that SHA>`. Never touch stage 1's branch or
worktree, only read from it. Copy stage 1's tools from its worktree's `.claude/probes/K1341/` if the rebase didn't
bring them.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Your files:** `draw.ts`, `fill_tri.ts`, `chain_frame.ts`, tests, and your tools under `.claude/probes/K1341/`
  (`k1341s2_*`). Other agents own `outline.ts`, `outline_model.ts`, `outline_worker.ts`, `outline_app.ts`, the band
  files, `rec_glsl.ts` and `paint.ts`: stay out of them.
- **Commits:** WIP on your branch at each milestone. `git add -f` for tools, never for outputs. Never push, never
  edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start. Never touch the phone.
- **Perf lock:** an interleaved Node run doesn't need the lock. Take it only for an app ABBA, which this stage
  doesn't require.
- **Stop** when Done holds or 1 h after your start, whichever comes first (`Get-Date` at the start and at each
  milestone). Leave the last 15 minutes for the checks. Then commit WIP, append a handoff to this brief with your
  start and stop times, and report.

## Report

Under 20 lines:
- the interleaved table;
- which cuts were kept and which dropped;
- the identity check;
- your last SHA.

End with `Ledger items` and K1341's handle fields.

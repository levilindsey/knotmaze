# K1395 stage 1: rp=gf's reveal carries the reveal's colours

Read first: `docs/design/K1383_s1_gf_reveal.md` with its handoff, `docs/design/gf_default_gate.md` gate 5,
and ledger items K1395, K1472, K1459, K1431 (`node $HOME/Repositories/claude-config/tools/ledger.mjs show
<ID> --repo .`). Base: `origin/master`.

## Goal

Under `rp=gf` the reveal draws the widths and fronts but not its colours: the burn tint, the rainbow stripes,
the materialize alpha, the rainbow's swell and its white bulb. Today's look draws them (`src/render/reveal.ts`,
`paint_glsl.ts`, `appear_fx.ts`). Levi's bar: the new renderer is finished before it replaces today's, so its
reveal must show what today's shows, in every appearance mode. Today's reveal on the same link is the
reference for colour and timing; gf's own thread shapes, borders and gaps stay as they are.

## This stage

Carry the reveal colours into gf, one mode at a time, starting with the mode that differs most. You own the
technique. Files: gf's reveal path in `src/render/gpu_field/` and what it reads; keep out of `gf_look.ts`'s
gap pass (`lkBall`, `lkCut`, `lkGap`), `eval.ts` and `gf_glsl.ts`'s junction rule (another agent works
there); if you must touch them, stop and report. Today's renderer stays byte-identical (the golden tests).

## Done

1. Each mode you finish: src, tests, `npm test` green, `npm run build` passes, every re-frozen pin named.
2. For Levi, per mode: one sheet of frames at the same reveal times, `today | gf before | gf now`, on his link
   `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`, large enough to read, viewed by you. Real-time captures only
   (`scripts/diag_screenshot.mjs` style, the perf lock through `scripts/perf_lock.ps1`, ports 5630 to 5634).
3. With the reveal finished (`am=instant` too), gf's settled picture equals master's capture pixel for pixel.
4. A list of the modes done and not done, with what each still lacks.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1395-s1`, branch `k1395-s1`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Read code through the
shell; the Read tool only just before an Edit, and for images. Write only inside your worktree. Commit WIP at
every milestone (`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`,
never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical
work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first; finish and commit whole modes rather
than leave one half done. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit
WIP, append `## Handoff (stage 1)` here, commit, and report: verdict first (safe to land or not, which
modes), sheet paths, a `Ledger items` list and the handle fields.

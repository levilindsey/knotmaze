# K1604 stage 3: cut by the under thread's own gap, across the whole end (named by Levi)

Levi, 2026-11-25, on stage 2's untested idea ("cut by the under thread's own gap, across the whole end, so no
sliver is left"): "Let's try that". This is the third stage, run because he named it.

Read first: `K1604_s2_brief.md` with its `## Handoff (stage 2)` on branch `k1604-s2` (worktree
`...\worktrees\k1604-s2`, read only: its rule commit `12bf58046`, tools under `.claude/probes/K1604/s2/`,
captures in `out/`), and `K1604_s1_brief.md`'s handoff on `k1604-s1`. Base: `origin/master`.

## The two places

- A_3 x278: a stray dark pixel beside the junction.
- A_6 x326: a border's blunt end touching the upright line by a corner. Stage 2 left a sliver here.

## This stage

Build stage 2's idea: at such an end, cut by the under thread's own gap across the whole end, so no sliver is
left. You own the technique. Files: `src/render/gpu_field/` gap pass (`eval.ts`, `gf_glsl.ts`, `gf_look.ts`,
their mirrors and tests). Another agent works in gf's reveal path (the fx table, `lkRainbow`, the reveal
alpha): keep out of it.

Bindings, as before: every other pixel on all 21 mazes equals a capture of master's build, or you list and
view it and it is the same kind of leftover going right. Stage 2 failed here (356 other changes with strays,
smudges and holes): a result like that is a fail, say so. Stage 4's angled cut ends stay; never remove a
thread's border; the under pass keeps its width and heading; closed sides do not rise (master: 132).

## Done

1. Src, mirror, tests; `npm test` green; every re-frozen pin named; `npm run build` passes.
2. Captures of all 21 mazes from master's build and yours (stage 1's recipe; the perf lock through
   `scripts/perf_lock.ps1`; ports 5650 to 5654).
3. One sheet, 14x, `master | yours`, of the two places, viewed by you; every other changed place counted,
   and listed and viewed.
4. `screen.py` counts, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s3`, branch `k1604-s3`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Commit WIP at
every milestone (`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`,
never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical
work only. Two other agents share the perf lock: wait for it inside one blocking command.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the two places cannot be fixed without other damage, stop and say so. On
stopping: commit WIP, append `## Handoff (stage 3)` here, commit, and report: verdict first, what holds and
what does not, sheet paths, counts, a `Ledger items` list and the handle fields.

# K1604 stage 2: the two junction leftovers, relabel only where no gap exists (second and last try)

Read first: `K1604_s1_brief.md` with its handoff on branch `k1604-s1` (worktree `...\worktrees\k1604-s1`, read
only: the rule `a42590b70`, its tools under `.claude/probes/K1604/s1/`, its captures in `out/`). Base:
`origin/master` (K1584 stage 12 landed, `3d516f1ce`).

## The two places (Levi, 2026-11-25: "agreed. Fix them")

- A_3 x278: a stray dark pixel beside the junction.
- A_6 x326: a border's blunt end touching the upright line by a corner.

Stage 1's rule (the under pass's own label wins the pixel) fixes both but changes 359 other places on the A
mazes, smudging stage 4's angled cut ends and removing borders at 126 crossing sides. Its untested lead: at
the smudged ends the old label has a gap window (kind 2 or 6); at the named A_3 pixel it has none (kind 0).

## This stage

Fix the two places and nothing else. Start from the lead: relabel only where the old label has no gap window.
You own the technique. Files: `src/render/gpu_field/` (`eval.ts`, `gf_glsl.ts`, `gf_look.ts` and their
mirrors and tests). Cherry-pick what you need from `k1604-s1`.

Bindings: every other pixel on all 21 mazes equals a capture of master's build, or you list and view it and
it is the same kind of leftover going right. Stage 4's angled cut ends stay; never remove a thread's border;
the under pass keeps its width and heading; closed sides do not rise (master: 132).

## Done

1. Src, mirror, tests; `npm test` green; every re-frozen pin named; `npm run build` passes.
2. Captures of all 21 mazes from master's build and yours (stage 1's recipe; the perf lock through
   `scripts/perf_lock.ps1`; ports 5635 to 5639).
3. One sheet, 14x, `today | master | yours`, of the two places, viewed by you; every other changed place
   listed and viewed.
4. `screen.py` counts, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s2`, branch `k1604-s2`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Read code through the
shell; the Read tool only just before an Edit, and for images. Write only inside your worktree. Commit WIP at
every milestone (`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`,
never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical
work only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the two places cannot be fixed without other damage, stop and say so: there is
no third stage. On stopping: commit WIP, append `## Handoff (stage 2)` here, commit, and report: verdict
first, what holds and what does not, sheet paths, counts, a `Ledger items` list and the handle fields.

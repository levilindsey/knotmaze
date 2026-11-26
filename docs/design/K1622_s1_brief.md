# K1622 stage 1: why threads kink on junction arms, and a physics fix

Read first: `docs/design/kink_diag.md` (the whole page; its tools are in `.claude/probes/kink/`) and ledger
item K1622 (`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1622 --repo .`). Base:
`origin/master`.

## Goal

Levi sees slight kinks in threads (his place: the bottom of `?3.FHH1HtvQeDjm6e4BII`... see kink_diag.md for
the link and the spot) and they give the renderer hard cases. Measured (K1619): the kinks are in the physics
shape, the same under both renderers, and cluster on junction arms 1 to 1.5 world from a chain's end (36.5
sharp turns per 1000 samples against 3.5 elsewhere). Levi looked at the bend limit in the spline
(K90's `splineBend`) and said it does not look right, so that fix is out: do not touch
`spline_generator.ts`'s bend limit. The fix, if there is one, is in the physics.

## This stage

1. Confirm or refute the cause by a change, not by reasoning: on a frozen settled state of seed 3, vary the
   suspected mechanism (the junction cover grading, the arm's bending terms near a chain end, whatever the
   measurements point to) and re-measure with `analyze.py`. Say which mechanism it is, observed.
2. If confirmed, fix it in `src/physics/` so the arm's turn spreads over its first particles and no kink
   forms: sharp turns on junction arms fall toward the rate elsewhere, on seed 3 and on at least four other
   seeds (name them), with no new kinks elsewhere.
3. The knot still sleeps (the sleep and quiescence tests pass as written; never loosen them), drag feel is
   unchanged in kind, and a physics update costs no more than 5% over master (one measurement, under the
   perf lock, A/B on the same machine state).

Golden snapshots and other pins that move with a physics change: re-freeze them and name each (pre-launch,
no back-compat). Keep out of `src/render/` (another agent works in `gpu_field/`).

## Done

1. The cause, with the measurement that confirms it; or "refuted", with what was tried.
2. If fixed: src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: one picture, `master | yours`, large crops (at least 10x) of his place and of five other
   junction arms that kink on master, in the fill look and in `rp=gf&gfh=1` with his link's border look,
   settled, real-time captures, viewed by you; plus the whole maze side by side.
4. The numbers: sharp turns per 1000 samples on arms and elsewhere, master against yours, per seed; update
   cost; time to sleep.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1622-s1`, branch `k1622-s1`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`), ports 5645 to 5649. Commit WIP at every
milestone (`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`, never edit
LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical work only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the cause is refuted or the fix costs the sleep, stop and say so. On stopping:
commit WIP, append `## Handoff (stage 1)` here, commit, and report: verdict first (safe to land or not),
picture paths, numbers, a `Ledger items` list and the handle fields.

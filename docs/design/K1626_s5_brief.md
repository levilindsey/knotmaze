# K1626 stage 5: round a joint eye's inner tip (the narrow end)

Read first: `K1626_s4_brief.md` with its `## Handoff (stage 4)` (landed on master in 2bca35b65) and the tools
under `.claude/probes/K1626/` (`cap4.mjs`, `compose4.py`, `seq4.ps1`, `s4_meas.py`, `s4_census.ps1`,
`jeye.ts`, `eyetab.py`, `widthjump.ts`, `bench.ts`). Stage 4's pictures, read only:
`...\worktrees\k1626-s4\.claude\probes\K1626\out\sheet4.png`, `sheet4_zoom\zz28.png`, `zz132.png`: look at
them first. Base: `origin/master`.

## Levi, 2026-11-26, on stage 4's pictures

Told that at J28 (the salmon triangle) "the eye's inner tip is still a small narrow notch", he answered:
"More would be better if it's not too much cost". So: round the eyes' inner tips further, as far as it is
cheap. Link: `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`.

## This stage

At J28xX64 the two arms meet at the eye's narrow end in a slit (zz28.png, right half, the tip at the bottom
of the triangle); J149xX305's upper tip is pointed the same way. Make the eye's narrow end a round bottom,
not a slit: the paper inside should end in a curve about as wide as the eye's corners elsewhere. Stage 4's
lead: the eye pressure's lens shape at the narrow end (the target goes to 0 at both ends of the lens; the
end by the crossing must close, the arms cross there, but how fast it opens is free), since a stronger arm
bend moved 8 to 65 openings. You own the technique, in `src/physics/`. Confirm on a frozen settled state
before building.

Cost lines ("not too much cost"), all must hold or you stop and show the trade: step cost within 3% of
master (`bench.ts` and `perf2.ts`-style A/B, under the perf lock); every maze still sleeps, his link within
6.0 s (5.5 s now), the width jump re-sleeps (`joint_crossing.test.ts` as written); sleep and quiescence
tests as written; openings: J138, J64, J13 within 0.15 widths of master, at most 2 eyes under 1.5 over his
link and `?1`..`?a`, at most 3 eyes narrowed by more than 0.15; sharp turns (over 60 degrees) do not rise
(94 now; `?8` 7). Keep out of `src/render/`.

## Done

1. A tip measure (the eye's paper width at a fixed small distance from its narrow end, or the tip's radius),
   master against yours, for every eye on his link; sharp-turn and opening tables as in stage 4.
2. Src, tests, `npm test` green, `npm run build` passes, pins named (the maze goldens will move).
3. For Levi: `master | yours`, device scale 2, settled, real time, viewed by you: 1:1 zooms of J28 and J149
   like `zz28.png`, and stage 4's sheet rows (J132, J28, J138, J64, J149, J140, J144, whole maze).
4. Step cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s5`, branch `k1626-s5`, from
`origin/master`; `node_modules` as a directory junction to the main checkout's (never `npm install`). Write
only inside your worktree. Read code through the shell; the Read tool only just before an Edit, and for
images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; a capture agent shares it:
read a lock before touching it, wait inside one blocking command, never delete another owner's), ports 5655
to 5659. Commit WIP at every milestone (`git add -f` for probe tools, never their outputs). Never push,
never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`.
Helpers on sonnet, mechanical only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the tip cannot round inside the cost lines, land nothing in src and show the
best trade with pictures and numbers. On stopping: commit WIP, append `## Handoff (stage 5)` here, commit,
and report: verdict first (safe to land or not), picture paths, numbers, a `Ledger items` list and the
handle fields.

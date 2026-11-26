# K1626 stage 4: round the hooks the open joint eyes leave (and carry K1622 over)

Read first: `K1626_s2_brief.md` and `K1626_s3_brief.md` with their handoffs (landed on master), the tools
under `.claude/probes/K1626/` (`jeye.ts`, `eyetab.py`, `widthjump.ts`, `bench.ts`, `cap3.mjs`, `compose3.py`,
`seq3.ps1`), and ledger item K1622 with branch `k1622-s1` (its `fairJunctionArms` / `updateArmBends` in
`particle_system.ts`, tools under `.claude/probes/K1622/`, `perf2.ts`). Base: `origin/master`.

## Levi, 2026-11-26, on the sheet `master | stage 1 | stage 2`

"stage 2 is best! Row 5 and 6 though have some pretty sharply angled triangular hooks because of it though,
and it might be good to round that a bit". Rows 5 and 6 are J132xX254 and J28xX64 on
`?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`: the open eye is a triangle whose arm turns sharply at a corner
(J132: the blue thread's hook around the eye; J28: the salmon triangle's pointed lower corner). The sheet is
`...\worktrees\k1626-s2\.claude\probes\K1626\out\K1626_s2_sheet.png` (read only): look at it first.

## This stage

1. Carry K1622's arm-bend fix over from `k1622-s1` onto master by `git cherry-pick` of its src and test
   commits (or re-apply by hand; the same file moved under it). Measure: does it round those two hooks?
   Sharp turns on arms, his link and `?1`..`?a`, master against carried.
2. If the hooks are still sharp, round them: an eye's arm should turn through its corner over several
   particles, not at one (you own the technique, in `src/physics/`; the eye pressure's lens shape and
   K1622's bend spreading are the two obvious places). Confirm on a frozen settled state before building.
3. Keep: every eye's opening within 0.15 widths of master's (his J138 2.05, J64 1.84, J13 2.02; at most 2
   eyes under 1.5 over his link and `?1`..`?a`); `joint_crossing.test.ts` as written, width jump included;
   sleep and quiescence tests as written; step cost within 5% of master with K1622 included (`perf2.ts` and
   `bench.ts`, under the perf lock); no new pinches or stretched arms (`?8` has 7 sharp turns now: do not
   add). Keep out of `src/render/`. If K1622's carry-over costs the sleep or the 5%, leave it out and say so.

## Done

1. Sharp-turn counts and the two hooks' tightest turn (radius or angle per particle), master against yours.
2. Src, tests, `npm test` green, `npm run build` passes, pins named (the maze golden will move).
3. For Levi: one picture `master | yours`, crops at least 600 px wide at device scale 2, of J132, J28, J138,
   J64 and two other eyes with a hook, his link's look, settled, real time, viewed by you; plus his spot for
   K1622 (world (24.67, 35.10), `pairs.py` on `k1622-s1`).
4. Step cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s4`, branch `k1626-s4`, from
`origin/master`; `node_modules` as a directory junction to the main checkout's (never `npm install`). Write
only inside your worktree. Read code through the shell; the Read tool only just before an Edit, and for
images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; read a lock before touching
it), ports 5655 to 5659. Commit WIP at every milestone (`git add -f` for probe tools, never their outputs).
Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If rounding costs the openings or the sleep, stop and show the trade with
pictures. On stopping: commit WIP, append `## Handoff (stage 4)` here, commit, and report: verdict first
(safe to land or not), picture paths, numbers, a `Ledger items` list and the handle fields.

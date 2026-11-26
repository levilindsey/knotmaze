# K1626 stage 2: open the eye a junction's two arms close when they cross

Read first: `K1626_s1_brief.md` with its `## Handoff (stage 1)` on branch `k1626-s1` (your base), and its
tools under `.claude/probes/K1626/` (`eyes.py`, `census.ts`, `frozen.ts`, `bench.ts`, `cap.mjs`,
`compose.py`, `match_levi.py`, `widthjump.ts`).

## Goal

Levi's place on `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1` is J138: a T junction whose two arms cross each
other at X282, 2.6 ctrl from the junction, closing a small eye between junction and crossing. Stage 1
lengthened the half segments beside fused junctions (joint-to-crossing distances rose everywhere) but the
eye is still nearly shut: opening 0.80 -> 1.23 widths, and it reads open at about 2. On his link 9 such eyes
exist; J64 (0.25 w), J138 (1.23 w) and J13 (1.38 w) stay under 1.5. Levi: "Physics isn't doing a good enough
job of keeping these threads apart. This is a recurring problem in other places too", "a priority".

## This stage

Make every junction eye of this kind rest open (paper visible inside, opening at least about 2 widths, or
the largest the arm lengths allow: say which), at his link and on `?1`..`?a`, the way kink eyes are held
open (the KINK EYES lore in `.claude/rules/physics*.md`: rest-material ratchet, across-eye pressure, fairing
exemption) or another way: you own the technique, in `src/physics/`. Confirm by a change on a frozen settled
state before building. Keep stage 1's gains (its `joint_crossing.test.ts` passes, tightened if you can).

Binding: the knot still sleeps (sleep and quiescence tests as written, never loosened; stage 1's
width-jump case re-sleeps); drag feel unchanged in kind; step cost within 5% of MASTER (stage 1 used 0.4 to
3.3% of it); no new kinks, pinches or stretched arms elsewhere (stage 1 left one x1.48 segment on `?7` and a
few more sharp bends: do not add to them, reduce them if it is cheap). Keep out of `src/render/`. Another
agent (K1622) is changing how junction arms bend, on `k1622-s1` (read only).

## Done

1. Per-eye openings, master | stage 1 | yours, on his link and `?1`..`?a`; the count under 1.5 and under 2.
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: one picture `master | stage 1 | yours`, each crop at least 600 px wide and sharp (capture at
   high zoom or device scale 3, not an upscaled 1x), of J138, J64, J13 and three more eyes, in his link's
   look, settled, real time, viewed by you; plus the three whole mazes.
4. Step cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s2`, branch `k1626-s2`, from branch
`k1626-s1` (not master); `node_modules` as a directory junction to the main checkout's (never
`npm install`). Write only inside your worktree. Read code through the shell; the Read tool only just before
an Edit, and for images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; other
agents share it: wait inside one blocking command), ports 5655 to 5659. Commit WIP at every milestone
(`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`, never edit
LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. This is the second stage: if the eyes cannot be opened without costing the sleep,
stop and say so with pictures. On stopping: commit WIP, append `## Handoff (stage 2)` here, commit, and
report: verdict first, picture paths, numbers, a `Ledger items` list and the handle fields.

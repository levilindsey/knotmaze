# K1627 stage 1: no notch cut into a junction's rounded corner (rp=gf; Levi: "pretty important")

Levi, 2026-11-25, with a phone picture (`.claude/probes/K1627/levi_phone.png` in the main checkout, untracked;
copy it into your worktree): on `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`, right side of the maze, a third
down from the top: "I guess we're seeing either a border space or a notch cut out for some other reason into
the rounded corner of the junction. This is also a generally recurring issue we must solve".

In the picture the place is the junction at about (470, 1050) of the 891 x 2000 screenshot: where the salmon
thread from the lower left meets the purple junction and passes under, a wedge of paper is cut into the
junction's rounded corner, leaving a small pointed tab of thread at about (450, 1050). A second, smaller one
shows on the junction above it at about (375, 865). His earlier picture of the same link
(`.claude/probes/K1626/levi_phone.png`) shows the same kind of notch at about (500, 715). Read ledger item
K1627 (`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1627 --repo .`). Base: `origin/master`.

## Goal

A junction's rounded corner stays whole: no wedge, notch or tab cut into it by a neighbouring crossing's gap,
a border space or anything else, at Levi's places and at every place of this kind. You own the technique.
Still binding: never remove a thread's border; the under pass keeps its width and heading; stage 4's angled
cut ends stay; tight turns keep today's ball (K1572); closed sides do not rise (master: 132).

## This stage

1. Attribute the notch: which primitive removes those pixels (the gap pass's `lkCut` / `lkGap` / `lkBall`,
   the junction rule, a border space), observed by switching it off on a frozen settled state, not by
   reasoning. Then count the places of this kind on Levi's link and the 21 test mazes (A_3..A_d, D_1..D_a).
2. Fix it in `src/render/gpu_field/` (source, the CPU mirror, tests).
3. Every other changed pixel on the 21 mazes and Levi's link: counted, and the changed places listed and
   viewed; each must be this kind of notch going right. Strays, smudges or holes elsewhere are a fail: say so.

Another agent (K1604 stage 3) is changing the gap pass for two other junction leftovers right now, on branch
`k1604-s3` (read only for you; its captures recipe and `screen.py` are under `.claude/probes/K1604/` on
`k1604-s1` / `k1604-s2`). Keep your change small and local. A third agent works in gf's reveal path (the fx
table, `lkRainbow`, the reveal alpha): keep out of it.

## Done

1. The cause, with the switch-off measurement; the count of such places per maze, master against yours.
2. Src, mirror, tests; `npm test` green; every re-frozen pin named; `npm run build` passes.
3. For Levi: one sheet, `master | yours`, 14x, of his three places and five others, settled real-time
   captures of a frozen state (same state both sides), viewed by you; the list of every other changed place.
4. `screen.py` counts, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1627-s1`, branch `k1627-s1`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`; four other agents share it: wait inside one
blocking command), ports 5660 to 5664. Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. On stopping: commit WIP, append `## Handoff (stage 1)` here, commit, and report:
verdict first (safe to land or not), sheet paths, counts, a `Ledger items` list and the handle fields.

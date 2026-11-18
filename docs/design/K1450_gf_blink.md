# K1450: rp=gf draws the maze only in flashes (Claude agent stage)

## What Levi saw (2026-11-17)

On `https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`: "the entire maze blinks in and out
constantly." He could not judge the junctions or the fade at all. This blocks every look decision on rp=gf, so
it comes before all other gf work.

## What is measured (coordinator, live builds fc861de and 4106c49, desktop Chrome, real GPU)

Probe: `.claude/probes/K1444/blink2.mjs <url> <outPrefix> <profileDir> [frames] [gapMs]` (full-viewport frames,
rAF gaps over 300 ms, `__knotGf.stats`; keep one profile directory so the shader cache is warm on reruns).
Frames are in `.claude/probes/K1444/` of the coordinator worktree `agent-af52b1a95572b7c1a`.

- With rp=gf the maze is drawn in a few frames and missing in most. 30 frames at 400 ms on
  `?3&xp=off&am=instant&rp=gf` (today's defaults, whole maze, no reveal): the maze shows in frames 10, 11 and
  22 only; the rest show the background, the markers and nothing else. The same with `gfh=1` on or off, with
  the fill look and the border look, with `xp=off` and with the thread reveal, with `am=instant` and after a
  burn reveal. No WebGL context loss, no page error, `stats.fallback` empty.
- rp=outline on the same link holds the maze in every frame (`w_out_*.jpg`).
- On Levi's link (border look, `tlk=border`) the flashes also show no fill: dim outlines only
  (`w_h_fl014_01.jpg`), where rp=outline draws coloured threads with dark borders (`w_out_12.jpg`). With
  `&tlk=fill` on the same link the flashes show the coloured maze. Find out whether that is a second defect or
  the same one.
- A cold profile's first rp=gf load blocks the main thread for 116 s, then 38 s and 29 s more after the reveal
  ends (three program compiles, probably); a warm profile shows none. K1449 measured the same 110 s. Report
  what compiles there and what would cut it, but do not fix it in this stage unless it is the blink's cause.
- Not known: which commit started it. The agents' and Muse's probes all force their own frames, so none saw it.
  K1439's build is 963029e8; Muse batch 24's later gf commits are 72620196 (24G), 5394edc5 (24H),
  83de5130 (24I), and batch 25's 4106c490 (25A).

## Do

1. Reproduce on a local build of origin/master with the probe, then bisect with
   `pwsh scripts/preview.ps1 -Port <p> -Ref <commit> -Root <your own folder>` until one commit separates
   "holds" from "blinks". Diagnose from what the page does (which pass draws, what it clears, what the frame
   loop skips at rest), not from the commit's message.
2. Fix the cause in `src/`. Keep the fix as small as the cause allows: Muse batch 25 is editing
   `gf_look.ts`, `gf_pass.ts`, `gf_reveal.ts` and `gf_explore.ts` in the main checkout, and your branch has to
   merge with it.
3. The border look's missing fill, if it is a separate defect: fix it too, or report its cause and commit.
4. Add a guard that would have caught this: a probe under `scripts/` or `.claude/probes/K1450/` that loads a
   link the ordinary way (no forced frames, no hooks that draw), samples N frames at rest, and fails when any
   frame lacks the maze. Say in the handoff how Muse and agent briefs should call it.

## Done

1. On a local build of your branch, 60 consecutive frames at 250 ms, taken from 5 s after load, each show the
   whole maze, on all of: `?3&xp=off&am=instant&rp=gf`; `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (after its
   reveal); `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`; and the first one during a 5 s thread drag.
   Report the frame sizes or a maze-pixel count per frame, and look at six frames yourself.
2. The border-look link shows coloured threads as rp=outline does, or the cause is reported.
3. The bisect result: the commit, and the mechanism in two or three sentences.
4. `npm test` green; flag-off shader text, keys and pack unchanged (`test/render/gf_home_glsl.test.ts`).
5. The guard of item 4 exists and fails on origin/master's build.

## How to work

- Work in your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5560-5579. Screenshots from a headed, real-time Chrome, never `--virtual-time-budget`. No performance
  numbers are asked for, so do not take the perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (the bisect's builds and captures), with this stop rule.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1450` here, commit, and report: what holds, the frames' paths, the numbers, a
`Ledger items` list and K1450's handle fields.

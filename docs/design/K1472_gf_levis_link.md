# K1472: what rp=gf shows on Levi's own link, reveal and all (Claude agent stage)

Levi judges rp=gf on `https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (2026-11-17: "the entire
maze blinks in and out constantly. I don't see any fading happening, regardless of the slider value. I still
see plenty of border artifacts."). Every check so far ran on `...&xp=off&am=instant&rp=gf&gfh=1`. His link
has no `am=instant`, so it plays the appearance reveal, and that path has not been looked at.

The token differs from today's defaults only in threadWidth 0.8, cuspRadius 6, flowStrength 0,
backgroundBase "#e6e9ee" and threadLook "border". In force besides: appearSequence "trace", appearFx "burn",
appearSpeed 2.2, exploration "off", borderWidth 0.38, borderColor "#000000", fadeLength 0.14,
backgroundColorMode "gamut" (so backgroundBase is unused and the page is dark).

## Observed (coordinator, 2026-11-17 19:10-19:45, live fc520c2d, 1600x900, machine at 96% CPU, so every time is inflated)

Probe: `.claude/probes/K1468/gfshots.mjs <url> <profileDir> [seconds] [shotEvery]` (gf's stats per second, a
rAF count, screenshots; `FULL=1` runs the whole window).

- The blink is gone: five loads, no loss on the app's canvas, no Crashpad dump, `fallback` empty.
- This link needs TWO gf programs before gf composes (`compileIssued=3 compileReady=2` at the first
  composite). Cold: the first program ready at 151-208 s, the first composite at about 282 s. Warm: 2.6 s.
- gf link, before the first composite (15, 90, 180 s): the maze area holds a few faint thread fragments and no
  reveal animation. 8 s after the first composite: the whole maze as dim dark outlines. Warm, 24 s: nearly
  blank with a few faint reddish fragments. Warm, 90-180 s: scattered short dark dashes, two loop outlines,
  wandering glints, nothing at the start marker.
- Today's renderer, same link without `rp=gf`: cold at 68 s the burn reveal is starting at the start marker;
  warm at 15-180 s the maze area stays nearly dark with a small lit piece beside the start marker. With
  `&am=instant` at 15 s the whole maze is there but so dim it needs a 6x contrast stretch to read.

Not explained: why today's reveal barely leaves the start marker in 180 s; why the instant frame is that dim;
whether any of this is the probe (load, a hidden or throttled window, an overlay still fading) or the page.

## Do

1. **Today's renderer first, as the bar.** On a local preview of origin/master and on the live site: what
   this link shows from load to the end of the reveal, and at rest after it, on a headed real-time Chrome
   with nothing else of yours running. Find which clock drives the reveal (wall, sim, the load settle's
   budget) and what dims the instant frame (read the page: overlays and their opacity, the loader, the
   canvas's own alpha, the reveal's width masks). Separate probe artifact from page behaviour with a test,
   not a guess. Say plainly what Levi sees on today's renderer, with frames.
2. **gf on the same link**, same times: before its first composite (today's renderer should draw the reveal
   meanwhile: does it?), during the reveal after the first composite, and at rest. Pin the reveal time where
   you can (Muse's `k1459_cap` pins, `.claude/probes/K1459/` in the main checkout, read-only) and make sheets
   today | gf, whole frame and 4x crops. Name every difference: stray dashes, outlines where today shows
   nothing, a missing front or missing burn at the start, dimness.
3. **Fix what is gf's.** The bar is today's renderer at the same reveal time, spot by spot; gf's border look
   at rest stays as it is (Levi, 2026-11-17). If today's renderer does not draw while gf compiles on this
   link, or gf draws pieces the reveal has not reached, fix it.
4. **The two-program wait.** Name the two programs. If the page can compose with the first while the second
   compiles and stay correct, do it; else say what bounds it.

## Done

1. A written account, with frames, of what this exact link shows on today's renderer and on gf, cold and
   warm, each observation marked page or probe.
2. Sheets today | master gf | your gf at five or more reveal times and at rest under
   `.claude/probes/K1472/out/`. Look at every tile yourself and name each spot fixed, same as master or open.
3. A number for each fixed difference that fails on master and passes on your tip. `npm test` green.
   `hold.mjs` (`.claude/probes/K1450/`) 60/60 on the `xp=off&am=instant` gfh=1 link, warm.

A partial result lands: Done 1 alone is worth merging.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `gf_reveal.ts`, the reveal's code in `gf_app.ts` and `gf_look.ts`, their tests. Muse batch 26 edits
  `gf_app.ts` and `gf_look.ts` in the main checkout and another agent (K1460 stage 5) the fade and gap code
  in `gf_look.ts`: keep the diff small and rebase on origin/master before the handoff. Do not change any
  file in the main checkout.
- **Memory and disk.** The machine ran out of both today (C: fell to 0.9 GB as the pagefile grew). One
  Chrome at a time, at most two preview builds, profiles under `$env:TEMP\k1472-*`, all deleted when you
  stop. Before each build or Chrome launch read `Get-CimInstance Win32_OperatingSystem` and wait (one
  blocking loop, 10 minutes at most) while `FreeVirtualMemory` is under 3 GB. Stop to report if
  `(Get-PSDrive C).Free` is under 5 GB.
- A profile is warm only for the exact links it has loaded. A cold gf load needs no
  `--disable-gpu-watchdog` since K1468.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5640-5659. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1472` here, commit, and report: the account, the sheets' paths (each spot named), the
numbers, a `Ledger items` list and K1472's handle fields.

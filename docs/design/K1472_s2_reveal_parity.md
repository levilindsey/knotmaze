# K1472 stage 2: rp=gf's reveal against today's, spot by spot (Claude agent stage)

Stage 1 (`docs/design/K1472_gf_levis_link.md`: read Handoff K1472 whole) found why gf's appearance reveal
drew no thread ink (two tables uploaded as R32F) and fixed it (merged, 998be573). Its sheets
(`.claude/probes/K1472/out/pin/levi_sheet_whole.png`, `levi_f6_zoom8.png`; tools `pinsheet.mjs`, `sheet.py`,
`progs.mjs`, `watch.mjs`) show gf's ink following today's front. This stage makes the reveal match.

The bar: **today's renderer on the same link at the same pinned reveal time**, spot by spot. gf's border look
at rest stays as it is (Levi, 2026-11-17: darker borders than today's are wanted).

Links: Levi's `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (trace, burn, border look) and `?b.FMKB4DIQ` with the
default look and with trace-rainbow (K1469's link: `.claude/probes/K1459/k1469_pinwatch.mjs`,
`k1469_live.mjs`, `docs/design/K1469_reveal_cut_check.md`).

## Observed on the live site (coordinator, 2026-11-17 20:30-20:40, build 998be57, 1600x900, two other agents' Chromes running, so times are inflated)

Unpinned frames 3-17 s after the load event (`.claude/probes/K1472/liveshots.mjs <url> <profileDir> <outPrefix> [times]`):

- Today's renderer on Levi's link: coloured thread ink behind the burn front at 3 s and 5 s; by 7 s the reveal
  is over and the maze is at rest, nearly invisible (black borders on the dark page). The unpinned reveal
  lasts about 6 s.
- The same link with `rp=gf&gfh=1`, gf not yet composing (`composites=0 compileIssued=1 compileReady=0`): smoke
  at 3 s and 5 s and **no thread ink**; rest from 7 s. Today's renderer is meant to stay on screen until the
  switch (`gf_app.ts` ~1061), yet its reveal ink is missing while gf waits. The page's rAF ran at 16-21 fps
  through the wait.
- gf's first composite on the same Chrome profile: first load of the new build 208 s (first program ready at
  110 s), third load 107 s (first program at 48 s). `compileWorker=""` and `compileWarmed=0` on every load:
  the probe closes 20 s after the first composite, with the queue still at issued 3 / ready 2, so the worker
  that persists programs never ran. On fc520c2d earlier today a warm load composed at 2.6 s.

So a visit to Levi's link today shows: a reveal with no ink, a nearly invisible maze for one to three minutes,
then gf's dark outlines arriving at once. Stage 1's fix is on screen only if gf composes inside the reveal's
6 s, which did not happen on any live load here.

## Do

0. **Before the switch.** Find why the reveal's ink is missing on an rp=gf link while today's renderer is
   still the one on screen, and fix it: until gf composes, the page must look exactly as it does without
   `rp=gf` (number: pixels differing from today's frame at 3 s and 5 s on a load where gf has not composed;
   pin the reveal clock if you need matched times). Then the wait itself: why a repeat visit is not warm
   (does the compile worker ever run on a visit of a minute or two; does the next load find its programs),
   and what makes the first program take 48-110 s. Shorten what you can and say what bounds the rest.
1. **Sheets first.** Three builds: today (no `rp=gf`), origin/master, and origin/master with 01c72dfc
   reverted (a probe branch; 01c72dfc is Muse 26B's junction cut in the reveal, `lkJCut`, never seen on
   screen). Pinned frames at eight reveal times on the three links, whole frame and 4x crops at twelve or
   more spots: thread ends, fused junction ends, wedge sides, crossings behind the front, the front itself.
   A gf frame counts only once `compileReady` covers the programs it draws.
2. **Name every difference** from today's, largest first. Known so far: at a thread's end today's cut is
   notched and gf's is a straight diagonal with stray pixels (`levi_f6_zoom8.png`); on the whole-frame sheet
   gf's ink behind the front looks fuller and brighter than today's at the early times (today's strokes are
   dimmer and more broken there). Say for 01c72dfc's cut at each junction: where today's is / wrong side /
   missing / over-cut, and whether it made the spot closer to today, the same or worse.
3. **Fix them**, a number for each (pixels differing from today inside a named box at a pinned time, or a
   count that fails on master). Keep 01c72dfc, repair it or revert it by what the sheets show.
4. **Levi's own complaints on this link**: "the entire maze blinks in and out constantly" and "I don't see
   any fading happening, regardless of the slider value". On a warm page, drag Crossing fade (`fl`) through
   the panel and watch gf's stats and the picture: does an edit replay the reveal, drop gf back to today's
   renderer, or queue a compile? Whatever makes the maze vanish or the fade not respond, fix it.
5. **The cold wait.** `progs.mjs` cold on Levi's link: which programs compile, in what order, and when gf
   takes over. If the order can put the reveal's program first, do it.

## Done

0. Item 0's number failing on master and passing on your tip, and the measured wait before and after (same
   profile, first and second load).
1. Sheets today | master gf | your gf under `.claude/probes/K1472/out/s2/`, every tile looked at, each spot
   named fixed, same as master or open.
2. Each number failing on master and passing on your tip; a plain verdict on 01c72dfc.
3. Item 4 answered with what you saw, and fixed if it is gf's.
4. `npm test` green; `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`; at rest (`am=instant`) your gf against master's gf
   differs by 0 px, or every differing pixel is named.

A partial result lands: say plainly which commits are confirmed on the sheets.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `gf_reveal.ts`, the reveal's code in `gf_look.ts` (`lkJCut`, `lkFx`), `gf_app.ts` and `gf_pass.ts`,
  the FX table, their tests. Another agent (K1460 stage 5) edits the fade and gap code in `gf_look.ts`,
  `tables.ts` and `gf_pack.ts`; Muse batch 26 edits gf files in the main checkout. Keep the diff small and
  rebase on origin/master before the handoff. Do not change any file in the main checkout.
- **Memory and disk.** C: free space swings by 10 GB or more within minutes: it is the pagefile growing
  under commit spikes (cold gf compiles are the likely cost), and it comes back. One Chrome at a time, one
  cold gf load at a time, at most two preview builds, profiles under `$env:TEMP\k1472s2-*`, all deleted when
  you stop. Before each build or Chrome launch wait in ONE blocking loop (15 minutes at most) while
  `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB. Stop to report only if C: is
  still under 5 GB after that wait.
- A profile is warm only for the exact links it has loaded.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5640-5659. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Items 0, 4 and 5 come before the parity sheets if time is short. Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1472 s2` here, commit, and report: what holds, the sheets' paths (each spot named), the
numbers, which commits are confirmed on screen, a `Ledger items` list and K1472's handle fields.

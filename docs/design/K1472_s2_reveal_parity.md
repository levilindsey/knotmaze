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

### Handoff K1472 s2

Agent, 2026-11-17 20:44-21:50 PT, branch `worktree-agent-afc6826ee5adb2d40`, rebased on origin/master 6cc2663d.
Builds: master = cfabf14f (port 5640), tip = the worker-first build (5641; src identical to the branch tip).

**Item 0, held (observed).** 8d63c583: gf's raw GL leaked into Pixi's cached state, so today's frames before gf's
switch drew no reveal ink. `frame()` now ends in `ctx.app.renderer.resetState()`. Pre-switch frames differed from
today's by 5654-101815 px on master, by 279-35565 px on tip, and by 226-3626 px on the today-vs-today control
(`preswitch.mjs`, `out/s2/`).
**Item 0's wait / item 5, held (observed).** 62964f14: the compile worker links every program first on a fresh
OffscreenCanvas context, enables KHR_parallel_shader_compile only after issuing the link (so the binary reaches
Chrome's disk cache), and the app's own links wait behind it (`compileGate`). During the reveal, the set the reveal
ends on goes first, then the reveal's own full program. Timings on Levi's link: cold switch about 121 s on master,
85 s on tip; repeat visit 60 s on master (and 431 s for all 12 programs on a third master visit tonight), against
1.9 s on tip with all 12 ready by 2.8 s. Tests: `gf_compile.test.ts` (the gate, the reveal order).
**Item 4, answered (observed).** 98e76485, `fadedrag.mjs` and `out/s2/i4/fade_response.txt`. The real-mouse drag
of Crossing fade on a warm page causes no reveal replay, no fallback and no compile. Pixels changed between fl
0.02 and 1.18: today 4012; master pre-switch 49 (frozen, no ink); tip pre-switch 4081; after the switch 15998 on
master and 15966 on tip. Levi's "vanished maze, dead slider" was the item-0 ink loss lasting the whole uncached
pre-switch wait. INFERRED, not caught: "blinking" = that wait, then gf's switch bringing in its border look at once.
**Rest A/B (observed).** `out/s2/rest/rest_ab.txt`: tip vs master 169 px (max delta 17). The tip with the compile
worker refused is 0 px against master, and with Pixi's resetState no-oped it still differs, so every pixel comes
from the binaries the worker links. Cause not found. INFERRED candidates: the worker context's state at link time
(no EXT_color_buffer_float, default attributes).
**hold.mjs** 60/60 warm on the tip (`out/s2/hold_wt2.txt`). **npm test** green after the rebase (3167 passed).

**Sheets (items 1-2, partial).** Levi's link only. The 01c72dfc-reverted build and the two other links were not
run. `out/s2/pin/levi_sheet_whole.png` (today | master gf | my gf, f0-f7 + rest) and `levi_spots_x3_{0,1,2}.png`
(13 spots at 3x, f3/f5/f6/rest; counts in `levi_spots_counts.txt`; tool `spots.py`). Every tile was looked at.
Master and my gf match at every spot except reveal-FX sparkles (0-57 px). Differences from today's, largest first:
1. gf reveals more ink than today's. Today's strands come in as broken pieces where gf's are whole: TR cluster
   f6 1681 px, R flare f6 2491, unrevealed top-mid f3 2108 and f5/f6 550 (today shows a small lilac quad, gf a
   long strand), blue loop f6 1212, centre f5 1415. Unexplained: a different per-piece reveal clock or extent is
   the first suspect (gf_reveal.ts KREVEAL against today's reveal widths).
2. gf's cut ends are staircase diagonals, today's straight or notched (unrevealed top-mid, centre f6, L middle f6).
3. The underlay: today draws thin dark-brown centrelines under unrevealed thread, gf its black border look (the
   rest difference, 3.9k px). By design per the brief: keep.
4. gf draws hard dark seams across a strand at crossings where today fades softly (BR f5, BL f5, bottom orange).
5. Start marker: today shows the white stub glint right of the marker at f3/f5, gf only at rest (start marker 415/199 px).
Not fixed; no lkJCut verdict (needs the revert build).

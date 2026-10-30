# K658: K137's page gaps, checked (no fixes)

Run B of `docs/design/K1062_muse_batch3.md` (K658). Checks only: nothing under `src/` or `test/` changed. A failure below is a finding for Claude, filed in the ledger pointing at its row.

- Build under test: master `ae3ee071` (working-tree build), served with `pwsh scripts/preview.ps1 -Port 5530` at `http://127.0.0.1:5530` (port in 5500-5599). Server started in the background for the runs and stopped at the end.
- Driver: `node .claude\probes\K658\k137_page.mjs <case> <desktop|phone> 7 [extra]` (copy of `.claude/probes/K137/page/k137_page.mjs` with `BASE` changed to 5530; the six new cases added in the copy). Headed Chrome on its own profile per `open()` (deleted after), no `--virtual-time-budget`. Desktop 1400x900; phone 411x753, dsf 2, `isMobile` true (`hasTouch` true only for `c1touch`). Seed 7 throughout, links `?7&am=instant&<keys>`. Realtime runs pass `&clk=realtime` as the probe's fourth argument. Traces: `.claude/probes/K658/out/<case>_<vp>_7.json` (every check with its numbers, plus the full log).
- Step 1 checks before any run: `__knotTurnMove`, `__knotFabric` and `__knotFabricRenderer` are still present in `src/app/probe_hooks.ts`, and wrapping `FabricMazeRenderer.syncBroken` (`src/render/fabric_maze_renderer.ts:2778`) still captures the controller as `window.__k137c`. Observed: present, and every run below captured a controller (a missing capture would have failed `open()`), so the run continued.
- How each check was read: from the captured controller (`window.__k137c`: `taps`, `brokenRuns()`, `crackedRuns()`, `stranded`, `parLost`, `par`, `strokesLeft`, `breakLimits`) and the HUD/banner DOM (`.km-banner`, `#maze-hud`), never from a picture. Stills were taken for Claude's review only and decide no check (case `c5` reads the renderer's `brokenSpans`/`anim` state, also not pixels).
- Console: 0 errors and 0 warnings across all 14 runs (counted per run in the summary). Every `cchase` console check reads the same counters.
- Totals from the scripts' state: 155 checks, 140 PASS, 11 FAIL, 4 NOT RUN. Each FAIL has its own ledger item pointing at its row (see “Findings filed” at the end).

## Reading the FAILs (observed, then inferred)

- Observed (script state): the tail run (edge 0, entrance to `mnode_109`) is `cracked [0]` after its first crossing in every crack run, with limit 2. Inferred from source, not from the page: this is K840's shipped rule — `src/game/fragile.ts` (“runs into an END vertex are NOT exempt”) — so the probe's old “tail crossing breaks nothing (exempt)” expectation is stale. The product strands and restarts exactly as the later checks show; no later crack check fails for this reason.
- Observed: `c4` finds no stub (`STUBPLAN` candidates `[]`, tail limit 1). Same K840 cause: in snap there is no exempt dead-end stub to visit, so the case stops at its plan check. Snap breaking itself is covered by `c5` (both checks PASS).
- Observed: `c1fog` fog IoU 0.9613 (34 stamps before and after Undo, cells 4688 -> 4542) against the probe's 0.97 line. K137's own results recorded the same measure at 0.9564-0.9723 on the phone and 0.9811 once on desktop, with equal stamp counts; the explored region is intact in stamp count and the shortfall is the known live-vs-replay fog difference, not a lost region. The 0.97 line is the probe's, so this is filed as a probe-threshold finding, not as a fog loss.
- Observed: on the realtime clock the Stranded banner offers Restart only (`[What the numbers mean, Restart, ×]`), so the turn-case Undo checks cannot pass there. This matches the lore (`rule_loss.ts`: Restart only under the realtime chase, the turn minotaur or the fire; Undo is a turn-clock affordance). Filed as realtime-vs-turn expectation findings with their values; the strand, banner text, running clock, HUD count and Restart checks all PASS on realtime.
- Observed: while stranded the live choice list is empty (`choices []` at `mnode_109`, taps 5), so `c1stranded` clicked the head's screen point (case 6's point) rather than a choice that does not exist. It moved nothing and re-showed Stranded, as required.
- Observed: `cchase` with a cheapest-choice walk solved in 14 clicks without meeting the hunter, so the shipped walk uses the dearest choice (the same “wrong choice” the par case uses). It stranded in 2 clicks (tail broken `[0]`, `snapped 1`) before any catch; the recorded end state is below. No console error, and the HUD/banner agree with the controller.

## Summary (one row per run; console counted from the trace)

| Run | Checks | PASS | FAIL | NOT RUN | Errors | Warnings | Seconds | Trace |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| c1fog desktop | 19 | 17 | 2 | 0 | 0 | 0 | 27.7 | `.claude/probes/K658/out/c1fog_desktop_7.json` |
| c1plain desktop | 18 | 16 | 1 | 1 | 0 | 0 | 25.8 | `.claude/probes/K658/out/c1plain_desktop_7.json` |
| c2 desktop | 10 | 10 | 0 | 0 | 0 | 0 | 21.1 | `.claude/probes/K658/out/c2_desktop_7.json` |
| c3 desktop | 6 | 6 | 0 | 0 | 0 | 0 | 26.3 | `.claude/probes/K658/out/c3_desktop_7.json` |
| c4 desktop | 2 | 1 | 1 | 0 | 0 | 0 | 12.9 | `.claude/probes/K658/out/c4_desktop_7.json` |
| c5 desktop | 2 | 2 | 0 | 0 | 0 | 0 | 25.2 | `.claude/probes/K658/out/c5_desktop_7.json` |
| c6 desktop | 7 | 7 | 0 | 0 | 0 | 0 | 17.6 | `.claude/probes/K658/out/c6_desktop_7.json` |
| c1click desktop | 18 | 16 | 1 | 1 | 0 | 0 | 35.2 | `.claude/probes/K658/out/c1click_desktop_7.json` |
| c1touch phone | 18 | 16 | 1 | 1 | 0 | 0 | 34.4 | `.claude/probes/K658/out/c1touch_phone_7.json` |
| c1stranded desktop | 8 | 8 | 0 | 0 | 0 | 0 | 22 | `.claude/probes/K658/out/c1stranded_desktop_7.json` |
| c1rt desktop | 18 | 12 | 5 | 1 | 0 | 0 | 24.4 | `.claude/probes/K658/out/c1rt_desktop_7.json` |
| c2rt desktop | 10 | 10 | 0 | 0 | 0 | 0 | 16.3 | `.claude/probes/K658/out/c2rt_desktop_7.json` |
| cpanel desktop | 12 | 12 | 0 | 0 | 0 | 0 | 12.5 | `.claude/probes/K658/out/cpanel_desktop_7.json` |
| cchase desktop | 7 | 7 | 0 | 0 | 0 | 0 | 22.7 | `.claude/probes/K658/out/cchase_desktop_7.json` |

## c1fog (desktop, seed 7) — Old 1 fog: crack strand + Undo + Restart (`&fg=crack&xp=fog`), hooks

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"crack","parMode":"off","parSlack":1,"exploration":"fog"} |
| 2 | tail crossing breaks nothing (exempt) | FAIL | {"head":"mnode_109","broken":[],"cracked":[0]} |
| 3 | run 220: first crossing cracks it | PASS | {"cracked":[0,220],"broken":[],"stranded":false} |
| 4 | run 220: second crossing (backtrack) breaks it, not yet stranded | PASS | {"broken":[220],"head":"mnode_109","stranded":false} |
| 5 | run 221: first crossing cracks it | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 6 | last break strands (controller) | PASS | {"broken":[220,221],"stranded":true,"head":"mnode_109"} |
| 7 | Stranded banner text | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:04 walked 345 snapped 2","btns":["What the numbers mean","Undo","Restart","×"]} |
| 8 | banner buttons Undo + Restart | PASS | ["What the numbers mean","Undo","Restart","×"] |
| 9 | clock keeps running while stranded | PASS | {"at_banner":{"state":"running","ms":5342.5},"plus1500ms":{"state":"running","ms":7272}} |
| 10 | HUD snapped row counts the broken runs | PASS | {"hud":"snapped 2","broken":2} |
| 11 | Undo clicked, banner hides | PASS | {"clicked":true,"banners":[]} |
| 12 | Undo: head back one move (head, walked, taps) | PASS | {"before":{"head":"node_14","walked":33.758,"taps":4},"after":{"head":"node_14","walked":33.758,"taps":4},"strandedHead":"mnode_109","strandedWalked":34.465,"strandedTaps":5} |
| 13 | Undo: last run cracked again (one crossing), earlier runs still broken as the replay says | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 14 | Undo: explored fog intact (IoU of the stamp discs, before the strand vs after Undo) | FAIL | {"preStamps":34,"undoStamps":34,"cellsPre":4688,"cellsUndo":4542,"iou":0.9613,"fogRestarts":{"pre":1,"undo":2}} |
| 15 | strands again after Undo | PASS | {"shown2":true,"broken":[220,221],"stranded":true} |
| 16 | Restart: head at the start, nothing taken | PASS | {"head":"mentr_b","start":"mentr_b","taps":0,"walked":0} |
| 17 | Restart: every run whole | PASS | {"broken":[],"cracked":[],"banners":[]} |
| 18 | Restart: HUD snapped 0 | PASS | snapped 0 |
| 19 | Restart: fog reset | PASS | {"stampsBefore":34,"after":1,"restarts":{"was":2,"now":3}} |

Console: 0 errors, 0 warnings. 

## c1plain (desktop, seed 7) — Old 1 plain: crack strand + Undo + Restart (`&fg=crack`), hooks

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"crack","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | tail crossing breaks nothing (exempt) | FAIL | {"head":"mnode_109","broken":[],"cracked":[0]} |
| 3 | run 220: first crossing cracks it | PASS | {"cracked":[0,220],"broken":[],"stranded":false} |
| 4 | run 220: second crossing (backtrack) breaks it, not yet stranded | PASS | {"broken":[220],"head":"mnode_109","stranded":false} |
| 5 | run 221: first crossing cracks it | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 6 | last break strands (controller) | PASS | {"broken":[220,221],"stranded":true,"head":"mnode_109"} |
| 7 | Stranded banner text | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:04 walked 345 snapped 2","btns":["What the numbers mean","Undo","Restart","×"]} |
| 8 | banner buttons Undo + Restart | PASS | ["What the numbers mean","Undo","Restart","×"] |
| 9 | clock keeps running while stranded | PASS | {"at_banner":{"state":"running","ms":5371.800000071526},"plus1500ms":{"state":"running","ms":7317.5}} |
| 10 | HUD snapped row counts the broken runs | PASS | {"hud":"snapped 2","broken":2} |
| 11 | Undo clicked, banner hides | PASS | {"clicked":true,"banners":[]} |
| 12 | Undo: head back one move (head, walked, taps) | PASS | {"before":{"head":"node_14","walked":33.758,"taps":4},"after":{"head":"node_14","walked":33.758,"taps":4},"strandedHead":"mnode_109","strandedWalked":34.465,"strandedTaps":5} |
| 13 | Undo: last run cracked again (one crossing), earlier runs still broken as the replay says | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 14 | Undo: explored fog intact | NOT RUN | no fog on this link |
| 15 | strands again after Undo | PASS | {"shown2":true,"broken":[220,221],"stranded":true} |
| 16 | Restart: head at the start, nothing taken | PASS | {"head":"mentr_b","start":"mentr_b","taps":0,"walked":0} |
| 17 | Restart: every run whole | PASS | {"broken":[],"cracked":[],"banners":[]} |
| 18 | Restart: HUD snapped 0 | PASS | snapped 0 |

Console: 0 errors, 0 warnings. 

## c2 (desktop, seed 7) — Old 2: strict par loss (`&pa=strict&par=0`)

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"off","parMode":"strict","parSlack":0,"exploration":"off"} |
| 2 | P = F at slack 0 (par equals runs to the exit) | PASS | {"par":13,"runsLeft":13} |
| 3 | a wrong choice loses (parLost set) | PASS | {"taps":2,"runsLeft":13,"strokesLeft":11} |
| 4 | Out of strokes banner | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Out of strokes","sub":"The exit is 13 runs away with 11 moves left.","rows":"time 0:04 walked 374 par 13 · 11 left","btns":["What the numbers mean","Try again","×"]} |
| 5 | banner sentence matches the numbers | PASS | {"sub":"The exit is 13 runs away with 11 moves left.","runsLeft":13,"strokesLeft":11} |
| 6 | banner button Try again only | PASS | ["What the numbers mean","Try again","×"] |
| 7 | clock stops | PASS | {"at_banner":{"state":"stopped","ms":4109},"plus1400ms":{"state":"stopped","ms":4109}} |
| 8 | Try again restarts the solve | PASS | {"head":"mentr_b","taps":0,"parLost":false,"restarts":{"was":1,"now":2}} |
| 9 | strokes left full again | PASS | {"strokesLeft":13,"par":13} |
| 10 | lowest-cost route (by length) finishes within par or loses cleanly | PASS | {"solved":false,"parLost":true,"taps":4,"par":13} |

Console: 0 errors, 0 warnings. 

## c3 (desktop, seed 7) — Old 3: strokes finish (`&pa=strokes&par=0`), share text

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"off","parMode":"strokes","parSlack":0,"exploration":"off"} |
| 2 | detour ends back at the junction | PASS | {"from":"mnode_109","back":"mnode_109","taps":3,"was":1} |
| 3 | solved | PASS | {"taps":16,"strokes":16,"par":13} |
| 4 | share button clicked and text captured | PASS | {"clicked":true,"captured":1} |
| 5 | share title first line has "⛳ +3" (strokes 16 - par 13 = 3) | PASS | Knotmaze 🧶 ★★★ · ⛳ +3 |
| 6 | win banner shows par line | PASS | {"rows":"time 0:16 path / optimal 886 / 886 efficiency 100% backtracked 187 junctions 13 dead ends 0","hud":"strokes 16 / par 13"} |

Console: 0 errors, 0 warnings. 

## c4 (desktop, seed 7) — Old 4: snap (`&fg=snap`), stub plan

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"snap","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | a stub was found | FAIL | {"best":null,"cands":[],"path":[],"verts":["mentr_b"],"limits":[]} |

Console: 0 errors, 0 warnings. 

## c5 (desktop, seed 7) — Old 5: broken runs vanish mid-move (`&fg=snap&ms=0.12`)

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | snap: the run is broken after its crossing | PASS | {"broken":[0,220]} |
| 2 | renderer holds a broken span for the run after arrival | PASS | {"brokenSpans":2,"firstSpan":{"chain":0,"b0":0,"b1":36},"anim":null} |

Console: 0 errors, 0 warnings. 

## c6 (desktop, seed 7) — Old 6: taps while par-lost, real clicks at the head

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | lost by par | PASS | {"taps":2,"strokesLeft":11,"runsLeft":13} |
| 2 | a move while lost changes nothing (taps, head) | PASS | {"hook":true,"before":{"taps":2,"head":"mentr_b"},"after":{"taps":2,"head":"mentr_b"}} |
| 3 | the x hides the banner | PASS | {"closed":true,"banners":[]} |
| 4 | a real click on the maze re-shows the banner | PASS | {"banners":["Out of strokes"]} |
| 5 | that click moved nothing | PASS | {"taps":2,"head":"mentr_b"} |
| 6 | a click while the banner shows moves nothing | PASS | {"taps":2,"head":"mentr_b","banners":["Out of strokes"]} |
| 7 | arrow keys while lost move nothing | PASS | {"taps":2,"head":"mentr_b"} |

Console: 0 errors, 0 warnings. 

## c1click (desktop, seed 7) — New 1 `c1click`: `c1plain` with every move by real mouse click

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"crack","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | tail crossing breaks nothing (exempt) | FAIL | {"head":"mnode_109","broken":[],"cracked":[0]} |
| 3 | run 220: first crossing cracks it | PASS | {"cracked":[0,220],"broken":[],"stranded":false} |
| 4 | run 220: second crossing (backtrack) breaks it, not yet stranded | PASS | {"broken":[220],"head":"mnode_109","stranded":false} |
| 5 | run 221: first crossing cracks it | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 6 | last break strands (controller) | PASS | {"broken":[220,221],"stranded":true,"head":"mnode_109"} |
| 7 | Stranded banner text | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:07 walked 345 snapped 2","btns":["What the numbers mean","Undo","Restart","×"]} |
| 8 | banner buttons Undo + Restart | PASS | ["What the numbers mean","Undo","Restart","×"] |
| 9 | clock keeps running while stranded | PASS | {"at_banner":{"state":"running","ms":8810.199999928474},"plus1500ms":{"state":"running","ms":10784.799999952316}} |
| 10 | HUD snapped row counts the broken runs | PASS | {"hud":"snapped 2","broken":2} |
| 11 | Undo clicked, banner hides | PASS | {"clicked":true,"banners":[]} |
| 12 | Undo: head back one move (head, walked, taps) | PASS | {"before":{"head":"node_14","walked":33.758,"taps":4},"after":{"head":"node_14","walked":33.758,"taps":4},"strandedHead":"mnode_109","strandedWalked":34.465,"strandedTaps":5} |
| 13 | Undo: last run cracked again (one crossing), earlier runs still broken as the replay says | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 14 | Undo: explored fog intact | NOT RUN | no fog on this link |
| 15 | strands again after Undo | PASS | {"shown2":true,"broken":[220,221],"stranded":true} |
| 16 | Restart: head at the start, nothing taken | PASS | {"head":"mentr_b","start":"mentr_b","taps":0,"walked":0} |
| 17 | Restart: every run whole | PASS | {"broken":[],"cracked":[],"banners":[]} |
| 18 | Restart: HUD snapped 0 | PASS | snapped 0 |

Console: 0 errors, 0 warnings. 

## c1touch (phone, seed 7) — New 2 `c1touch`: `c1plain` on phone viewport by `touchscreen.tap` (own browser)

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"crack","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | tail crossing breaks nothing (exempt) | FAIL | {"head":"mnode_109","broken":[],"cracked":[0]} |
| 3 | run 220: first crossing cracks it | PASS | {"cracked":[0,220],"broken":[],"stranded":false} |
| 4 | run 220: second crossing (backtrack) breaks it, not yet stranded | PASS | {"broken":[220],"head":"mnode_109","stranded":false} |
| 5 | run 221: first crossing cracks it | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 6 | last break strands (controller) | PASS | {"broken":[220,221],"stranded":true,"head":"mnode_109"} |
| 7 | Stranded banner text | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:07 walked 345 snapped 2","btns":["What the numbers mean","Undo","Restart","×"]} |
| 8 | banner buttons Undo + Restart | PASS | ["What the numbers mean","Undo","Restart","×"] |
| 9 | clock keeps running while stranded | PASS | {"at_banner":{"state":"running","ms":8750.299999952316},"plus1500ms":{"state":"running","ms":10750.100000023842}} |
| 10 | HUD snapped row counts the broken runs | PASS | {"hud":"snapped 2","broken":2} |
| 11 | Undo clicked, banner hides | PASS | {"clicked":true,"banners":[]} |
| 12 | Undo: head back one move (head, walked, taps) | PASS | {"before":{"head":"node_14","walked":33.758,"taps":4},"after":{"head":"node_14","walked":33.758,"taps":4},"strandedHead":"mnode_109","strandedWalked":34.465,"strandedTaps":5} |
| 13 | Undo: last run cracked again (one crossing), earlier runs still broken as the replay says | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 14 | Undo: explored fog intact | NOT RUN | no fog on this link |
| 15 | strands again after Undo | PASS | {"shown2":true,"broken":[220,221],"stranded":true} |
| 16 | Restart: head at the start, nothing taken | PASS | {"head":"mentr_b","start":"mentr_b","taps":0,"walked":0} |
| 17 | Restart: every run whole | PASS | {"broken":[],"cracked":[],"banners":[]} |
| 18 | Restart: HUD snapped 0 | PASS | snapped 0 |

Console: 0 errors, 0 warnings. 

## c1stranded (desktop, seed 7) — New 3 `c1stranded`: real click while stranded re-shows Stranded, moves nothing

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"crack","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | stranded (controller) before the click | PASS | {"broken":[220,221],"stranded":true} |
| 3 | Stranded banner before the click | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:04 walked 345 snapped 2","btns":["What the numbers mean","Undo","Restart","×"]} |
| 4 | the x hides the Stranded banner | PASS | {"closed":true,"banners":[]} |
| 5 | a real click on a choice while stranded moves nothing (taps, head) | PASS | {"before":{"taps":5,"head":"mnode_109"},"after":{"taps":5,"head":"mnode_109"},"clickedEdge":null} |
| 6 | that click re-shows the Stranded banner | PASS | {"banners":["Stranded"]} |
| 7 | controller still stranded after the click | PASS | {"stranded":true,"broken":[220,221]} |
| 8 | a click while the Stranded banner shows moves nothing | PASS | {"taps":5,"head":"mnode_109","banners":["Stranded"]} |

Console: 0 errors, 0 warnings. 

## c1rt (desktop, seed 7) — New 4a `c1rt`: `c1plain` with `&clk=realtime` (fourth argument)

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"crack","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | tail crossing breaks nothing (exempt) | FAIL | {"head":"mnode_109","broken":[],"cracked":[0]} |
| 3 | run 220: first crossing cracks it | PASS | {"cracked":[0,220],"broken":[],"stranded":false} |
| 4 | run 220: second crossing (backtrack) breaks it, not yet stranded | PASS | {"broken":[220],"head":"mnode_109","stranded":false} |
| 5 | run 221: first crossing cracks it | PASS | {"cracked":[0,221],"broken":[220],"stranded":false} |
| 6 | last break strands (controller) | PASS | {"broken":[220,221],"stranded":true,"head":"mnode_109"} |
| 7 | Stranded banner text | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:02 walked 345 snapped 2","btns":["What the numbers mean","Restart","×"]} |
| 8 | banner buttons Undo + Restart | FAIL | ["What the numbers mean","Restart","×"] |
| 9 | clock keeps running while stranded | PASS | {"at_banner":{"state":"running","ms":2889.4000000953674},"plus1500ms":{"state":"running","ms":4922.600000023842}} |
| 10 | HUD snapped row counts the broken runs | PASS | {"hud":"caught 0 lures 2 / 2 snares 1 / 1 snapped 2","broken":2} |
| 11 | Undo clicked, banner hides | FAIL | {"clicked":false,"banners":["Stranded"]} |
| 12 | Undo: head back one move (head, walked, taps) | FAIL | {"before":{"head":"node_14","walked":33.758,"taps":4},"after":{"head":"mnode_109","walked":34.465,"taps":5},"strandedHead":"mnode_109","strandedWalked":34.465,"strandedTaps":5} |
| 13 | Undo: last run cracked again (one crossing), earlier runs still broken as the replay says | FAIL | {"cracked":[0],"broken":[220,221],"stranded":true} |
| 14 | Undo: explored fog intact | NOT RUN | no fog on this link |
| 15 | strands again after Undo | PASS | {"shown2":true,"broken":[220,221],"stranded":true} |
| 16 | Restart: head at the start, nothing taken | PASS | {"head":"mentr_b","start":"mentr_b","taps":0,"walked":0} |
| 17 | Restart: every run whole | PASS | {"broken":[],"cracked":[],"banners":[]} |
| 18 | Restart: HUD snapped 0 | PASS | caught 0 lures 2 / 2 snares 1 / 1 snapped 0 |

Console: 0 errors, 0 warnings. 

## c2rt (desktop, seed 7) — New 4b `c2rt`: `c2` with `&clk=realtime` (fourth argument)

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params | PASS | {"fragile":"off","parMode":"strict","parSlack":0,"exploration":"off"} |
| 2 | P = F at slack 0 (par equals runs to the exit) | PASS | {"par":13,"runsLeft":13} |
| 3 | a wrong choice loses (parLost set) | PASS | {"taps":2,"runsLeft":13,"strokesLeft":11} |
| 4 | Out of strokes banner | PASS | {"id":"maze-loss","cls":"km-banner km-rule","head":"Out of strokes","sub":"The exit is 13 runs away with 11 moves left.","rows":"time 0:00 walked 374 par 13 · 11 left","btns":["What the numbers mean","Try again","×"]} |
| 5 | banner sentence matches the numbers | PASS | {"sub":"The exit is 13 runs away with 11 moves left.","runsLeft":13,"strokesLeft":11} |
| 6 | banner button Try again only | PASS | ["What the numbers mean","Try again","×"] |
| 7 | clock stops | PASS | {"at_banner":{"state":"stopped","ms":488.2999999523163},"plus1400ms":{"state":"stopped","ms":488.2999999523163}} |
| 8 | Try again restarts the solve | PASS | {"head":"mentr_b","taps":0,"parLost":false,"restarts":{"was":1,"now":2}} |
| 9 | strokes left full again | PASS | {"strokesLeft":13,"par":13} |
| 10 | lowest-cost route (by length) finishes within par or loses cleanly | PASS | {"solved":false,"parLost":true,"taps":4,"par":13} |

Console: 0 errors, 0 warnings. 

## cpanel (desktop, seed 7) — New 5 `cpanel`: panel + Classic rules folder by real clicks, rows by `page.select`

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | panel starts at defaults (fragile off, par off) | PASS | {"fragile":"off","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | panel open after the click (or already open) | PASS | {"wasOpen":true,"isOpen":true} |
| 3 | Classic rules folder found | PASS | {"x":1230,"y":1092.3333740234375,"expanded":false} |
| 4 | Classic rules folder expanded after the click (or already) | PASS | {"before":{"x":1230,"y":1092.3333740234375,"expanded":false},"expanded":true} |
| 5 | Fragile runs row is a native select | PASS | {"fragileFound":true,"parFound":true,"fragileVal":"off","parVal":"off"} |
| 6 | Par row is a native select | PASS | {"fragileFound":true,"parFound":true,"fragileVal":"off","parVal":"off"} |
| 7 | __knotParams reads fragile crack | PASS | {"fragile":"crack"} |
| 8 | __knotParams reads par strict | PASS | {"parMode":"strict"} |
| 9 | controller reports fragile on (finite break limits) | PASS | {"fragileOn":true,"parMode":"strict","par":26,"finite":278,"broken":[],"stranded":false,"parLost":false} |
| 10 | controller reports par strict (mode and finite par) | PASS | {"fragileOn":true,"parMode":"strict","par":26,"finite":278,"broken":[],"stranded":false,"parLost":false} |
| 11 | state params agree (fragile crack, par strict) | PASS | {"fragile":"crack","parMode":"strict","parSlack":1,"exploration":"off"} |
| 12 | no console errors in the panel case so far | PASS | [] |

Console: 0 errors, 0 warnings. 

## cchase (desktop, seed 7) — New 6 `cchase`: `&mt=hunter&fg=crack` on turns, dearest-choice wander by real clicks

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | params fragile crack | PASS | {"fragile":"crack","parMode":"off","parSlack":1,"exploration":"off"} |
| 2 | minotaur hunter on the turn clock | PASS | {"minotaur":"hunter","clock":"turn"} |
| 3 | walk ended stranded or caught with real clicks (dearest-choice wander) | PASS | {"outcome":"stranded","steps":2,"head":"mentr_b","taps":2,"broken":[0],"cracked":[],"stranded":true,"solved":false,"hud":"caught 0 lures 2 / 2 snares 1 / 1 snapped 1","banners":[{"head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:04 walked 374 snapped 1"}],"catches":0,"turns":2,"mode":"wander"} |
| 4 | no console errors | PASS | [] |
| 5 | HUD and banner agree with the controller (no Caught banner on a stranded controller, no Stranded banner without stranded) | PASS | {"heads":["Stranded"],"stranded":true,"catches":0,"hud":"caught 0 lures 2 / 2 snares 1 / 1 snapped 1"} |
| 6 | HUD snapped row matches the broken count | PASS | {"hud":"caught 0 lures 2 / 2 snares 1 / 1 snapped 1","broken":1} |
| 7 | recorded end state (controller, HUD, banner) | PASS | {"outcome":"stranded","steps":2,"head":"mentr_b","taps":2,"broken":[0],"cracked":[],"stranded":true,"solved":false,"hud":"caught 0 lures 2 / 2 snares 1 / 1 snapped 1","banners":[{"head":"Stranded","sub":"Every way to the exit has broken behind you.","rows":"time 0:04 walked 374 snapped 1"}],"catches":0,"turns":2,"mode":"wander"} |

Console: 0 errors, 0 warnings. 

## Findings filed

Each FAIL row above has its own ledger item (text names the case, the check and this row), plus the one gap the brief leaves:

- K137's sounds (the snap pluck, the strand glissando) are unchecked; they need an ear.

The ledger IDs are in the run's ledger commit (`LEDGER: K658 done (<sha>)`); this doc is the work commit Claude reviews.

# K186 win-banner confetti: in-page verification, rerun for K647 on adee40a6

Rerun 2026-11-05 for K647 (Muse batch 22 Run J, ports 5920-5929, perf lock held):
every path below ran on the BEFORE build `cb5a7301` (port 5920) and the AFTER
build `adee40a6` (port 5921, "K647: Reset path during the winning move keeps its
result card"), both served by `scripts/preview.ps1 -Ref <sha>` and checked by the
harness's stamp before trusting a result. The first run of this file (2026-10-20,
build `9cd859e`, before K336's cannons landed) is superseded; its harness and
recipe below still hold. Everything is OBSERVED in the page unless a line says
"reading" (inferred from code, with file:line).

- Rig: headed Chrome off-screen (`--window-position=2200,50`, occlusion and
  backgrounding switches off), a FRESH `--user-data-dir` per run, 1600x900,
  `prefers-reduced-motion: no-preference` emulated BEFORE every load except case
  (a), localStorage `knotmaze.panelOpen` "0", real mouse clicks on the choices
  (`finishByMouse`), no `--virtual-time-budget`. An in-page rAF recorder
  (`window.__kc`) logs, per frame, `__knotConfetti()` (bursts, rain, spray,
  cannon), the banner and loss banner visibility, and a MutationObserver on
  `#maze-banner`.
- Free-play maze: `?7&am=instant&ms=4` (14 moves). Today's daily: #25 (13 moves).
  No page errors in any run (`errors: []`).
- Normal plan at 1600x900 on both builds: rain 988 + spray 320 + cannon 564 =
  1872 pieces alive at +0.3 s (K336's cannons have landed since the 2026-10-20
  run, whose 1308 was rain + spray only). At 411x753 @2.625: 980 alive.

## Paths to the win banner

All go through `showFabricWin` (src/main.ts), which records the result, shows
the banner and ends with `throwConfetti()`. BEFORE and AFTER agree on every
path but path 8; the numbers below are the AFTER build's (the BEFORE build's
rows are identical on paths 1-7b and 5p, in `out/*_b647*.json`).

| # | path | URL | banner | bursts delta | pieces alive +0.3 s | notes |
|---|---|---|---|---|---|---|
| 1 | live finish of today's daily | bare URL (Daily #25) | y, "Daily #25 solved!" | +1 | 1872 (988 + 320 + 564) | official record written; burst in the same frame as the banner (lag 0); badge "Daily #25 · solved" |
| 2a | reload of a solved attempt, in the arrive window (reload between the winning tap and the dot's arrival) | bare URL | y, "Daily #25 solved!" (restored) | +1 | 1872 | `restoreSavedAttempt` sets `pendingWin`; the frame loop shows it. The negative `burstLagMs` is a reload artifact (the recorder's page clock restarts with the document), not a lag |
| 2b | plain reload AFTER an official finish | bare URL | n | 0 | 0 | by design, see "Paths that do not throw" |
| 3 | replay (finish the daily again) | bare URL after the official finish | y, "Daily #25 replay solved" | +1 | 1872 | |
| 4 | practice | `?daily=1` (below today's) | y, "Daily #1 practice solved" | +1 | 1872 | 22 moves; attemptRecord practice |
| 5 | free play | `?7&am=instant&ms=4` | y, "Solved!" | +1 | 1872 | 14 moves |
| 6 | real time (minotaur chase) | `?7.J&am=instant&ms=4&clk=realtime` | y, "Solved!" 2 stars, time 0:16 | +1 | 1872 | 25-26 taps, 1 catch; bursts stayed 0 through the catch, +1 only at the win |
| 7 | escaped burn race, turn clock | `?7&am=instant&fi=fuse` | y, "Solved!" | +1 | 1872 | not lost (closest call 12.45), no loss banner |
| 7b | escaped burn race, real-time fire | `?7&am=instant&fi=fuse&fck=realtime` | y, "Solved!" | +1 | 1872 | not lost (closest call 92.50-92.70) |
| 8 | "Reset path" pressed while the winning move is in flight | `?7&am=instant&ms=4`, and the bare daily | y (see "Path 8" below) | +1 at the press | 1872 | K647: the press finishes the win as the dot's arrival would |
| 5p | free play at phone size, desktop stand-in (411x753 @2.625, isMobile, mouse) | same as 5 | y | +1 | 980 | NOT a phone pass |

## Reduced motion

Unchanged BEFORE and AFTER (both builds PASS):

| case | observed |
|---|---|
| (a) reduce emulated BEFORE load, free-play finish | banner y ("Solved!"); bursts 0, pieces 0 at +0.3 s and never any piece (`maxAliveEver` 0, `activeAfter` false); plan rain 0 / spray 0 / cannon 0. PASS |
| (b) no-preference, finish, tick the Reduced motion checkbox at +0.3 s | 1872 pieces alive before; the first frame after the click shows 0 (about 5 ms). PASS |
| (b') same, but flipping the emulated media query instead of the checkbox (pref stays "system") | 1872 -> 0 within about 60-77 ms of the CDP call (the change event reaches the page asynchronously). PASS |

## Paths that do NOT throw

Only 2b. A plain reload after an official finish builds a FRESH replay with no
banner at all (badge "Daily #25 replay · not scored", bursts 0, pieces 0), so
there is no win banner to throw for. This is by design, not a gap: the real
"reload of a solved attempt" is the arrive window (2a), and it throws.

## Path 8: Reset path during the winning move (K647, resolved)

BEFORE (`cb5a7301`; `out/reset_b647.json`, `out/reset_b647d.json`): with the
winning move's dot still travelling (`animating` true, `pendingWin` set),
pressing Reset path (a real click on the panel button, armed in-page on the
first solved frame):

- bursts 0 -> 1 at the press, but the banner was NEVER painted: the
  MutationObserver on `#maze-banner` saw the banner's content rebuilt and its
  `hidden` attribute flipped at ONE timestamp (show + hide in one synchronous
  task), `bannerEventsAfterPress` empty, and 0 pieces alive at +0.3 s and +5 s
  (`restartSolve` clears the confetti, K188, and hides the card);
- on a daily, the same press wrote the OFFICIAL result (the `knotmaze.daily`
  store held `days.25.official`, timeMs 5585, moves `ggggggggggggg`), and the
  badge read "Daily #25 replay · not scored" afterwards;
- the attempt restarted (`afterSolved` false, head at the entrance `mentr_b`).

AFTER (`adee40a6`; `out/reset_a647.json`, `out/reset_a647d.json`): the same
press ends the way the dot's arrival would:

- free play: banner shown ("Solved!", `bannerEventsAfterPress` one shown
  event), bursts 0 -> 1 at the press, 1872 pieces alive at +0.3 s (107 still
  falling at +5 s over the un-restarted maze), `solved` true, head at the exit
  (`mexit_b`), the full tap list kept; the MutationObserver shows the banner
  un-hidden with no later hide;
- daily: banner shown ("Daily #25 solved!"), bursts +1, 1872 alive at +0.3 s,
  the OFFICIAL result written once (store `days.25.official`, timeMs 5435,
  `replays` empty), `attemptRecord` "official", badge "Daily #25 · solved" -
  the same badge a live finish leaves - head at the exit (`mexit_a`), solved
  true.

READING (code): `resetPathAction` (`src/game/daily_attempt.ts`) answers "win"
when `pendingWin` is set, ahead of its backtrack/refuse/restart answers;
`onResetPath` (`src/app/panel_wiring.ts`) then clears `pendingWin`, cancels
the dot's move (`cancelMove`, which lands the fog and the explored run as an
arrival does) and calls `showFabricWin()` - and returns, so no restart or
backtrack runs under the card and `restartSolve` never clears the burst. A
press with no pending win answers as before. The one number that cannot equal
a live finish is the recorded time: the press stops the clock where it lands,
a live finish at the dot's arrival.

## Files and rerun recipe

- Harness: `.claude/probes/K336/banners/lib.mjs` (launch, cleanup, recorder,
  finishByMouse, analyze) and `banners.mjs`. Cases: `smoke free free_phone
  daily arrive practice realtime burn reset rm_a rm_b rm_b2`. Env: `FREE`,
  `PRACTICE`, `RT`, `BURN`, `RESET` ("daily" = bare URL), `OUTTAG`, `BASE`,
  `BUILD`. Pieces alive = rain + spray + cannon.
- This rerun: BEFORE `OUTTAG=_b647` (daily-reset `_b647d`, real-time burn
  `_b647rt`) on `cb5a7301` port 5920; AFTER `OUTTAG=_a647` (same suffixes) on
  `adee40a6` port 5921. Results: `out/<case><OUTTAG>.json`, screenshots
  `out/<case>.png` (overwritten each run), `rows.jsonl` appended in run order.
- Rerun on another build: `pwsh scripts/preview.ps1 -Port <p> -Ref <sha>`,
  then `$env:BASE="http://localhost:<p>/"; $env:BUILD="<sha>"; node
  banners.mjs <case>` from the folder above, under the perf lock.

## Phone passes still wanted (none run)

1. A real touch finish on the Pixel 11 (411x753): bursts +1, 980 pieces at
   desktop stand-in counts, the burst frame's cost and the fall's frame rate
   (with K336's cannon layer on top; rides K156's next pass).
2. The Reduced motion checkbox by touch while pieces fall (pieces to 0).
3. The phone's own reduced-motion setting before load: a finish throws nothing.
4. Touch Reset path during the winning move (path 8 on a touch device).
5. A real-time chase finish and a burn-race escape by touch (paths 6, 7).
6. K336's cannons on the phone: both edge anchors at 411 px, no overlap with
   the banner, frame rate.

## Ledger items

- K647 closes path 8 (above); no decision is left on it.
- K186 / K336: the six phone passes above.

## Handles

- K647: Muse batch 22 Run J (22J) in the main checkout on master; work commit
  `adee40a6`; evidence `.claude/probes/K336/banners/` (this file,
  `out/*_b647*.json` before, `out/*_a647*.json` after); next: Claude reviews
  and closes K647.

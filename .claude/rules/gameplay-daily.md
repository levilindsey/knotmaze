---
paths:
  - "src/game/daily_attempt.ts"
  - "src/game/daily_calendar.ts"
  - "src/game/daily_store.ts"
  - "src/game/maze_stats.ts"
  - "src/game/share_text.ts"
  - "src/ui/daily_link.ts"
  - "src/ui/daily_stats_view.ts"
  - "src/ui/share.ts"
  - "src/ui/maze_hud.ts"
  - "test/game/daily_attempt.test.ts"
  - "test/game/daily_calendar.test.ts"
  - "test/game/daily_store.test.ts"
  - "test/game/maze_stats.test.ts"
  - "test/ui/daily_link.test.ts"
---

# Gameplay lore: the daily maze and stats

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## The daily maze and stats (binding)

- MAZE STATS + DAILY MAZE (K19 + K20, then K47 + K56 saved attempts and
  the front door, 2026-10-12; the commit messages hold the design notes
  and verification records). STATS: the definitions live in
  game/maze_stats.ts (time = first move to the dot's arrival, hidden time
  excluded; efficiency = optimal / the route you ended on, shown once
  solved, rounded down; distinct junctions; distinct dead-end tips, only
  with deadEnds on; a g/d/b move log for sharing).
  DAILY - binding rules: (1) a daily's design is today's PARAM_DEFAULTS
  on the day's seed (ui/daily_link.ts `dailyParams`; K132 dropped the
  frozen DAILY_V1, pre-launch), so a default or generation change moves
  every daily; test/ui/daily_link.test.ts pins dailies #1-#3 to catch
  that (re-freeze them and name what moved). (2) Day numbers are the player's LOCAL date
  counted in UTC calendar days (game/daily_calendar.ts), Daily #1 =
  2026-10-12. (3) A page is the daily only while every param but
  DAILY_EXEMPT_KEYS (playback preferences: the Sound folder, cameraMode,
  Touch & feel, physics on/off) equals the day's design (isDailyDesign,
  K56). Any other edit (panel, seed row, dice) LEAVES it: the attempt is
  parked, a toast ("Left Daily #N. Your attempt is saved."), the bar
  becomes a token, the solve on screen plays on as an ordinary one; the
  Daily button returns. Exempt edits made on a daily are stored as
  prefs (only what the player changed) that every daily opens with.
  MAZE_PARAM_KEYS (sameMaze) names the walk-graph params: a test requires
  every DEFAULT_MAZE_PARAMS key there, and none may be exempt. (4) Links:
  NO query = today's daily, the bar stays bare; `?daily` = the same
  (rewritten bare); `?daily=<n>` (1..today+2) stays in the bar; `&k=v`
  after it keep the daily only for exempt keys; ANY other query is an
  ordinary design; anything after the day's number (`?daily=<n>.<x>`,
  K20's old delta links) is ignored with one warning. (5) Records: localStorage
  `knotmaze.daily`, ONE document `{v: 3, days, prefs}` (K146; v1 reads
  without attempts, v2 without practice) - bump `v` for any shape
  change, never overwrite a newer one; every access is wrapped and the
  page must boot and play without storage (then all of it is
  session-only). The first finish is official, later ones replays;
  streaks count results whose attempt began on or before their day (a
  result's and an attempt's `day` is the local day the attempt BEGAN).
  PRACTICE (K146, 2026-10-14; brief docs/design/K146_K151.md): an
  attempt begun after its day (`begunLate(n, day)`: day > n) finishes
  into that day's `practice` list (the newest MAX_PRACTICE 20), never
  official, even with no official result yet; it stays outside every
  aggregate (played, solved, streaks, best time, the star counts) and
  outside K144's future shared stats, and its moves never set `played`.
  A day that already has an official result records every later finish
  as a replay, practice or not. An attempt begun ON its day and finished
  later is still the official result, streaks included. Old records are
  read as they are: a v2 official result whose attempt began late (a
  past daily's first finish was official before K146) stays official,
  flagged late in History, counting toward solved and best time but not
  streaks. HISTORY (the stats view, `dailyHistory`): every past daily
  from #1 to yesterday, newest first, unplayed days included, plus any
  recorded day ahead of today (a link from a time zone ahead); today
  keeps its own row above. A row's tap plays or resumes the day, and its
  title says whether that will be a replay or practice; past 10 rows,
  All / Played / Not played chips filter it (Played = any record,
  practice included, so it can exceed the played tile), under sticky
  month headers. Share = a Wordle-style move grid + the `?daily=<n>`
  link, native sheet on coarse pointers; a practice finish's banner
  reads `Daily #N practice solved` and its share title
  `Knotmaze Daily #N (practice)`. (6) SAVED ATTEMPTS
  (K47, game/daily_attempt.ts): an attempt IS its tap list
  (FabricMazeController.taps; replay() rebuilds path, meters, stats, move
  log) plus active time, start time + day, and a walk-graph fingerprint
  (a moved maze refuses the replay). Saved after every move, on hide and
  pagehide, every 10 s while running and before any rebuild; restored
  whenever its daily opens, the clock PAUSED at the saved time until the
  intro ends or the next move. In an unfinished official attempt Reset
  path backtracks to the entrance (logged, priced, clock running; none
  in trail mode); in a replay it starts over. A finish drops the
  attempt; a tab coming into view adopts a newer one another tab saved.

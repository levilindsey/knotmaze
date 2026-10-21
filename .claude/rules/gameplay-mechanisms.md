---
paths:
  - "src/game/fragile.ts"
  - "src/game/par.ts"
  - "src/game/collapse.ts"
  - "src/app/rule_loss.ts"
  - "test/game/fragile.test.ts"
  - "test/game/par.test.ts"
  - "test/game/collapse.test.ts"
---

# Gameplay lore: fragile runs, par (K137) and collapse (K139)

Written by K137 stage 1 (2026-10-20; brief `docs/design/K137_s1.md`,
design `docs/design/K80_gameplay_additions.md` section 4.3); `gameplay.md`
lists the area's other files. Params: gameplay-links.md's FRAGILE AND PAR
PARAMS and COLLAPSE PARAM; rows: gameplay-panel.md's FRAGILE AND PAR ROWS
and COLLAPSE ROW. The headers of `fragile.ts`, `par.ts`, `collapse.ts` and
`src/app/rule_loss.ts` are the spec.

## Fragile runs

- THE RULE IS DATA (`fragile.ts`): every run has a LIMIT, the crossings
  it takes before it breaks (Infinity: never). A crossing is one
  completed move along the run, advance or backtrack alike. snap = 1 (it
  breaks after its first crossing), crack = 2 (it cracks after the first
  and breaks after the second). K139's collapse rides the same machinery
  with a table of its own (`collapseLimits`, END runs included; Collapse,
  below).
- EXEMPT RUNS (limit Infinity): a run with an END vertex at either end
  (the start's and the exit's tails and every dead-end stub's: such a run
  is walked only in and back out, so breaking it would strand the player
  without a choice), and K115 title runs.
- STRANDED: no route over unbroken runs from the head to the exit
  (`runsToExit` with the broken runs blocked). A breadth-first route never
  crosses a run twice, so a route over unbroken runs can always be walked:
  a cracked run on it breaks behind the player.
- THE STATE IS A FUNCTION OF THE TAPS: FabricMazeController counts
  crossings from its taps, and replay(taps) is reset() plus the taps, so
  Undo (main.ts `undoMove`: replay `taps.slice(0, -1)`) and a saved
  attempt's restore give back the same broken set. An Undo bumps the
  controller's `restarts` (the renderer's fog signal); the fog is re-laid
  from the taps, and the HUD's restarts row reads the minotaur's count,
  not the controller's. tapEdge returns "noop" once stranded or lost.
- THE GONE THREAD (`fabric_maze_renderer.ts`): syncBroken turns the broken
  runs into spans, which syncExplore's burning branch subtracts whatever
  `burntLook` says (a broken run is always gone; the fire's spans, char,
  fronts and smolder are as before). The run breaking under the dot goes
  behind it: only the stretch swept so far is gone until the move
  arrives. The pick (targetAt) skips broken runs, planRoute refuses a
  broken target and routes around broken runs, and litArms takes a
  `blocked` predicate: a broken run neither lights nor carries light, at
  the head too (the existing gate only sees arms beyond the head). The
  first snap switches every ribbon, strip and fan onto the explore
  programs, so `shader_warmup.ts` puts the explore variants in wave 1 for
  a fragile game, as it does for a fire race.
- THE STRANDED BANNER (`rule_loss.ts`, shown through the frame loop's
  pendingLoss slot, main.ts `showLoss`): "Stranded", "Every way to the
  exit has broken behind you.", with Undo and Restart, or Restart only
  under the real-time chase, the turn minotaur or the fire (main.ts
  `canUndo`). The clock keeps running, since Undo resumes the same
  attempt. A tap on the maze while stranded shows the banner again.
- SOUNDS: a snap plucks the run's own pitch an octave up (strength 0.85)
  once the dot arrives (rule_loss `step()`, in the frame loop's keyStep
  slot). A strand plays a falling glissando once per stranding
  (controller + restarts): 6 plucks 0.12 s apart, each 2 semitones lower,
  fading, from the pitch at the head, 0.12 s after a snap that sounds with
  it. Both only with sound on (not muted, a sound mode, volume above 0).
- MEASURED (K137 step 5, 30 dailies + 20 free designs at today's defaults,
  END runs exempt; `.claude/probes/K137/results.md`): crack strands none of
  K155's profiles (greedy 0/50, random 0/400; every crack game is the same
  walk as its fragile-off game, 1150 of 1150); snap strands greedy and
  explorer on 40/50 (dailies 25/30), random on 397/400, careful never. The
  design expected snap near 20 of 30.

## Par

- `par.ts`: F is the fewest runs from the start to the exit (a BFS,
  `runsToExit`); P = F + round(parSlack x F), counted in hundredths so the
  rounding is the same on every engine, fixed when the solve starts. A
  stroke is a move (one accepted tap: an advance or a backtrack, a title
  run included), so strokes = taps.
- strict: lost (`parLost`, sticky; judged again after a respawn) the
  moment the fewest unbroken runs from the head to the exit exceed the
  strokes left, reaching P short of the exit included. The banner "Out of
  strokes" says how far the exit is ("The exit is N runs away with M
  moves left.", or "No way to the exit is left."), stops the clock and
  offers Try again (a restart).
- strokes: never lost; the HUD shows "S / par P", and a finish's share
  title gets " · ⛳ +N" (E, or −N under par; `parScore`). The ⛳ tag shows
  in both par modes, after the minotaur's catch tag and " · snapped N"
  (fragile on).
- PAR COUNTS RUNS, THE STARS COUNT LENGTH (K155), and they disagree: the
  shortest route by length walks more than F runs on 37 of 50 mazes. Copy
  must never promise that a par finish is "perfect play".
- THE DEFAULT SLACK is 1 (P = 2F; step 5). Strict finish rates over the 50
  mazes at slack 0 / 0.1 / 0.25 / 0.5 / 1: K155's careful player 7.5 / 17 /
  36.5 / 65.5 / 89%, careful at noise 0.2 2 / 6 / 12.5 / 24.5 / 49.5%,
  K155's greedy walker 2 / 4 / 10 / 14 / 30% (it re-walks dead ends: a
  median 4.5 F strokes). The brief's aim, greedy about half and careful
  nearly always, needs slack 3 (greedy 48%, careful 100%), outside the
  brief's [0, 1] range: open for Levi.

## The HUD, the stats and the share

- HUD rows (`maze_hud.ts` `ruleEntries`, after the burn rows): "snapped"
  (fragile on), "par" ("P · L left", strict) and "strokes" ("S / par P",
  strokes); a non-finite value shows "—". rule_loss `ruleFields(fc)`
  builds all three (null: that rule is off) for the HUD, the banners and
  the share. `maze_stats.ts` carries their help lines. The win banner
  shows only K139's collapse row (`WinInfo.collapse`); K137's three rows
  are not passed to it yet.

## Collapse (K139)

Brief `docs/design/K139.md` (its Handoff lists Levi's six calls and their
alternatives). Levi, 2026-10-13: "You cannot backtrack, segments collapse
behind you; try to collapse as much of the level as possible while still
reaching the finish line. Or, alternatively, without reaching the finish
line".

- THE RULE (`collapse.ts` `collapseLimits`): every MAZE run gets limit 1,
  so a walk is a trail. END runs collapse too: the start tail on the first
  move, a stub when you enter it (stranding you at its tip), the exit tail
  on the finish. K115 title runs never collapse and score nothing. While
  collapse is on, setRules turns `fragile` and `parMode` off (their rows
  stay visible; parSlack is kept, unused).
- THE MODES: finish: reaching the exit wins; no unbroken route to it is
  K137's strand. free: tapEdge treats the exit as a dead end, and judge()
  sets `solved` once `freeStranded` holds (no unbroken maze run reachable
  from the head), after every move and every respawn; that move returns
  "win" and the game is never `stranded`. A free end is a FINISH (banner
  "N% collapsed", Share, confetti). To stop early, walk into a stub or the
  exit tail.
- THE SCORE: the share of the maze's thread LENGTH collapsed. Units are
  `round(length x 1000)` (exact integer sums on every engine, K108);
  cross() adds a run's units when it breaks (`collapsedUnits`), and
  `sharePercent` floors to a whole percent.
- PAR (`collapsePar`): the longest trail from `mazeStart ?? start`, to the
  exit (finish) or ending anywhere (free). A DFS with an admissible bound,
  children longest first (ordering by bound measured worse), capped at
  PAR_STEP_BUDGET (20k nodes, never wall-clock time: one link, one par).
  The controller's `collapsePar` getter runs it once per walk and mode, on
  first read, synchronously on the main thread. `tripped` reads "≥N%"
  (rule_loss `parText`; "—" with no trail). The HUD, banner and share must
  never call a tripped par the maximum.
- MEASURED (step 4; dailies 1-60 and 20 gridSize-24 mazes;
  `.claude/probes/K139/par_curve.txt`, `par_time.log`): the search trips
  on EVERY maze at every budget up to 200k, so par always reads "≥". At
  20k it sits a mean 1.4-2.1 points below the 200k search (max 11-14;
  equal on 12-20 of 60 and 12-14 of 20). Desktop under the perf lock
  (median of 3, 15 large mazes): 20k costs a median 10 ms, p90 12-34,
  max 38 (40k: 20 / 74; 60k: 30 / 116). A phone is about 5x (estimated;
  the real timing is owed, K662).
- THE ROWS: "collapsed N% · par M%" (maze_hud `ruleEntries`, from
  rule_loss `ruleFields`; help line `collapsed` in maze_stats.ts) in the
  HUD (even with the stat rows off), the win banner and the Stranded
  banner. Win heading: free "N% collapsed", finish "Solved! N% collapsed".
  Share line (share_text `collapseLine`): "🧱 Free collapse: N% · par M%"
  or "🧱 Collapse to the finish: ...". No efficiency (HUD or banner), no
  stars, no daily result (collapse is not daily-exempt, so a collapse game
  is never a daily). OPEN: the banner still shows path / optimal,
  backtracked, junctions and dead ends.
- THE STRAND (finish): K137's Stranded banner, "Every way to the exit has
  collapsed behind you.", with Undo and Restart (Restart only under the
  chase, the turn minotaur or the fire). Undo replays the taps, so the run
  comes back whole and its units come off the score.
- CHASE AND FIRE are allowed. A catch respawns at the start; main.ts then
  raises pendingWin when `fc.solved` and pendingLoss when
  `fc.collapseOn && ruleLoss.over()`, so a finish game whose start tail
  has collapsed is stranded at once and a free one ends with its score.
  tickChase holds the chase once a free game has ended and the dot is in
  (`freeEnded`). Burnt runs block like collapsed ones. Par ignores both.
- LOOK AND SOUND: a collapse is snap's broken run (syncBroken, the explore
  programs; shader_warmup puts the explore variants in wave 1 when collapse
  is on) and plays the snap sound, on every collapse.
- PROBES (`.claude/probes/K139/`): `par_measure.ts` + `par_curve.mjs` (the
  budget curve), `par_time.ts` + `run_time.ps1` (timing, perf lock),
  `page/k139_page.mjs <finish|free|strand> <desktop|phone> [seed]` +
  `run_page.ps1` (real taps on a private-cache dev server; 16, 17 and 13
  checks; seed 7 passed all six runs, stills in `shots/`). Hooks:
  `__knotFabric().collapse` (`{mode, units, total, pct, par: {units,
  total, tripped, steps}}`); the controller is not a window hook, so wrap
  `__knotFabricRenderer().syncBroken` to capture it (`k137_lib.ts`).

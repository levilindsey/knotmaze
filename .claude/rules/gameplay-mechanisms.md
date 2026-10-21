---
paths:
  - "src/game/fragile.ts"
  - "src/game/par.ts"
  - "src/game/collapse.ts"
  - "src/game/cut.ts"
  - "src/ui/cut_buttons.ts"
  - "src/game/walker.ts"
  - "src/ui/walker_buttons.ts"
  - "test/game/walker.test.ts"
  - "src/app/rule_loss.ts"
  - "test/game/fragile.test.ts"
  - "test/game/par.test.ts"
  - "test/game/collapse.test.ts"
  - "test/game/cut.test.ts"
  - "test/ui/cut_buttons.test.ts"
  - "src/game/spool.ts"
  - "src/game/hints.ts"
  - "src/ui/aid_buttons.ts"
  - "test/game/spool.test.ts"
  - "test/game/hints.test.ts"
---

# Gameplay lore: fragile runs, par (K137), collapse (K139), the cut (K114) and the aids (K137 stage 2)

Written by K137 stage 1 (2026-10-20; brief `docs/design/K137_s1.md`,
design `docs/design/K80_gameplay_additions.md` section 4.3); `gameplay.md`
lists the area's other files. Params: gameplay-links.md's FRAGILE AND PAR
PARAMS, COLLAPSE PARAM and CUT PARAM; rows: gameplay-panel.md's FRAGILE AND
PAR ROWS, COLLAPSE ROW and CUT ROW. The headers of `fragile.ts`, `par.ts`,
`collapse.ts`, `cut.ts` and `src/app/rule_loss.ts` are the spec.

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
- BROKEN RUNS BLOCK THE CHASES (K137-b, stage 3a, 2026-10-20; brief
  `docs/design/K137_s3a.md`): a broken run is a wall for the minotaur on
  both clocks (gameplay-minotaur.md's BROKEN RUNS BLOCK IT) and for the
  fire (gameplay-fire.md's BROKEN RUNS STOP THE FIRE). Call 1 (Levi's):
  built, it is blocked; the alternatives are that it crosses, or that its
  own crossings break runs too.

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
  equal on 17-20 of the 60 dailies, 12-14 of the 20 large mazes). Desktop
  under the perf lock (median of 3, 15 large mazes): 20k costs a median
  10 ms, p90 12-34, max 38 (40k: 20 / 74; 60k: 30 / 116). A phone is
  about 5x (estimated; the real timing is owed, K662).
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

## The cut (K114)

Written by K114's cut stage (2026-10-20; brief `docs/design/K114_cut.md`,
whose Handoff has the calls and their alternatives; design
`docs/design/K80_gameplay_additions.md` R.4.1). The header of
`src/game/cut.ts` is the spec.

- THE VERB: the scissors delete a whole run for the rest of the solve
  (until Undo or a restart). Walk graph and render only: the physics is
  untouched. CUTTABLE: every maze run but the start tail (`mazeStart ??
  start`), the exit tail and K115 title runs; a dead-end stub can be cut,
  which prunes the dead end. REFUSED: a cut that would leave no route over
  live runs from the head to the exit (`cutStrands`: runsToExit with the
  cuts blocked), so a game with cuts is never stranded. A refusal or an
  uncuttable run toasts why ("That cut would leave no way to the exit.",
  "The title's runs can't be cut.", "The runs at the entrance and the exit
  can't be cut.") with a dull pluck (REFUSE_OCTAVE 0.5, REFUSE_STRENGTH
  0.35), and the scissors stay armed.
- CONTRACTION (`carryChain`): a vertex that had three or more runs and has
  exactly two live ones now is no decision. A move arriving there carries
  on along its other live run, through every contracted vertex, until a
  vertex with three or more live runs, an END, the exit, or a run this move
  already took. A vertex with two runs to begin with (the K115 title seam,
  a title waypoint) never contracts; a self-loop counts twice. LAZY:
  tapEdge applies the move's first run and sets `carry` (the rest of the
  chain); main.ts `carryStep` (first in keyStep, ahead of K480's route and
  the keys) walks `carry[0]` on each arrival, one run per moveAlong, so the
  per-run animation is unchanged and `taps` and the move log list the
  carried runs too. While a carry is pending any other tapEdge is a
  reject, and cut() is "invalid".
- ACTIONS AND UNDO: the controller logs `actions` (`{kind: "move", run}`
  per player move, its first run; `{kind: "cut", run}`); with the cut off
  they match `taps` one to one. `replayActions(actions)` resets and replays
  (each cut through cut(), each move through tapEdge plus its carry; a
  failure resets and returns false). Undo (the button or U) replays all
  but the last action, then undoMove's restore sequence: a move comes back
  with every run it carried on along, a cut comes back whole.
- DISTANCES: `distToExit` is a controller field, the walk graph's own
  while nothing is cut, else `distancesToExit(walk, cuts)` (walkDistances
  with a removed set), recomputed on every cut, Undo and reset;
  onShortestRoute reads it. Stars keep the uncut `walk.optimalLength`.
- SCOPE: the classic game only (fabricRulesOf passes `cut` for gameMode
  classic, so never with a minotaur or the burn race), and setRules drops
  it while fragile, par or collapse is on. Not daily-exempt, so in practice
  free play only.
- THE SCISSORS (`src/ui/cut_buttons.ts`, wired in main.ts): two round
  buttons bottom left, the scissors and Undo, styled like K120's move pad
  (bottom right). `cutTick` (every frame) shows them while the cut is on,
  the keys are live and no open panel covers them (`panelCoversCut`: a
  phone's settings sheet does; the desktop's side panel, open by default,
  leaves their corner clear); hidden by visibility so that `covered()` can
  measure them, and hiding puts the scissors down. The scissors arm the
  next tap on the maze (lit, aria-pressed, a crosshair; on a mouse the K145
  glow lights the run a click would cut, `FabricMazeRenderer.cutAt`): a
  tap on a live run cuts it (`pickRadius(pt, true)`); a tap on empty space
  or a cut run, a second press or Esc puts them down. Keys by `e.key`
  (`cutKeyOf`): X arms or disarms, Esc disarms, U undoes; not Z, which is
  WASD's up (KeyW) on AZERTY. An armed tap while the dot moves or a carry
  is pending waits as `pendingCut` (one slot, the latest wins) and lands
  when the move ends (Call 2); a finished solve or the cut turned off drops
  it. Undo is disabled with no actions.
- LOOK AND SOUND: a cut run is K137's gone thread (syncBroken draws
  `cutRuns()` beside the broken runs; shader_warmup puts the explore
  variants in wave 1 when the cut is on) and plays the snap sound.
- THE ROWS: the HUD's "cuts N" while the cut is on (zero included;
  maze_hud's `entry("cuts", ...)`, the STATS line `cuts` in maze_stats.ts)
  and the win banner's; the share title's ` · ✂️ N` once a run was cut
  (share_text). Cuts count toward nothing else (Call 3): not the stars,
  the efficiency or par.
- PROBES (`.claude/probes/K114/cut/`): `page/cut_page.mjs <desktop|phone>
  [seed] [extra]` on a private-cache dev server (port 5114,
  `page/vite.private-cache.config.ts`): real clicks or touch taps through
  the buttons and (desktop) the keys, an empty-tap disarm, a cut and its
  Undo, a contracted move in one tap and its Undo, a refused cut at a
  dead-end stub, a mid-move cut queued, a solve by live distances, the
  banner row and the share tag. Seed 7 passed desktop 22/22 and phone
  (411x753) 20/20; stills in `shots/`. Hooks: `__knotFabric().cut`
  (`{mode, runs, count, armed, pending, shown, actions, carry}`, null with
  the cut off), `.runPoint(eid, frac)` (a run's screen and world point) and
  `.toWorld(x, y)`; choices' `cost` reads the live distances.

## The walker (K114)

Written by K114's walker stage (2026-10-20; brief
`docs/design/K114_walker.md`, whose Handoff has the calls and their
alternatives; design `docs/design/K80_gameplay_additions.md` R.3.9 and
R.4.3). The header of `src/game/walker.ts` is the spec: the directed
state, the map, both rules and the par search.

- MODES: the cut param's `lead` and `delay` (CUT_MODES; the controller's
  `walkerMode`). The head is a WALKER and the player's only verb is the
  cut: keys, the move pad and the gamepad never move it (main.ts
  `moveAlong` refuses unless `walkerDriving`), and `carryStep` hands every
  arrival to `walkerStep`. Carry is empty in walker modes (no
  contraction). A tap on a live run cuts it, no scissors to arm
  (`walkerTap`; the pointer's `cutPick` dep makes a touch press on a run a
  pending tap and the hover glow light the run under a crosshair). The
  refusal toasts "That cut would leave the walker no way to the exit.".
- LEAD (puzzle): the walker follows its strand, else the next run end
  clockwise from straight on ("keeps right"), else back; an END sends it
  back. The ROUTE THREAD (`syncWalker`, fabric_maze_renderer.ts) shows
  the whole route as the cuts stand (`leadRoute`, recomputed when the cut
  set changes). Go walks it one run per arrival (the dot's move is the
  clock); at its end the exit wins, a LOOP ("It's going in circles.") or a
  dead stop ("The walker has no way to go.") puts the walker back at the
  entrance with the cuts kept (`walkerBack`: replayActions of the cut
  actions only). Undo takes the last cut back while planning; Reset clears
  the cuts, or ends a walk. PAR (`leadPar`): the fewest cuts that bring it
  to the exit, the exact search under PAR_STEP_BUDGET 400k directed steps
  and PAR_MAX_CUTS 12, else the checked model's cut set as an upper bound;
  memoized per controller, found the first time the HUD asks. Dailies
  1-30: all exact, par 0:1, 1:7, 2:12, 3:9, 4:1, 1.1 s for all thirty
  (daily 23: 74k steps).
- DELAY (action-free turns): the walker takes the live run with the least
  length + distance to the exit (`delayNext`, ties by run id). Each turn
  is a cut, after which it walks one run, or "Let it walk" (a pass). Undo
  takes the last turn back (its move, then its cut). The route thread
  shows its way out from the head (`delayRoute`). The cut's refusal keeps
  a way to the exit, so the walker always gets there.
- THE BUTTONS (`src/ui/walker_buttons.ts`): Go (or "Let it walk"), Reset
  and Undo, bottom left like the scissors, shown while a walker mode is
  on, the keys are live and no open panel covers them. Keys: G is Go, U is
  Undo (`walkerKeyOf`; `cutKey` passes only U to the walker).
- THE ROWS: Lead's HUD and banner row "cuts N · par P" (a dash when no
  par is known); Delay adds "walker W · shortest S" (STATS `walker`). The
  share title ends ` · ✂️ N, par P` (Lead) or ` · 🐢 W runs (it wanted S)`
  (Delay). STARS (Call 4 in the brief): Lead rates the cuts against par
  (`rateCuts`, star_rating.ts: 3 at par or under, 2 one cut over, 1
  beyond; the popover gives Lead's rules, then "You led the walker out
  with N cuts; par is P."); Delay has none (rating null).
- SCOPE: as the cut's (the classic game, free play). Not built: Keep it
  in, Show it, Race the solver, Lead's action variant, cuts with the
  minotaur or the fire (K688), dailies and saved attempts.
- HOOK: `__knotFabric().walker` (`WalkerProbe` in probe_hooks.ts:
  {mode, state, idx, par, parCuts, cuts, route, end, walk, shortest,
  shown}, null with no walker). Probes: `.claude/probes/K114/walker/`
  (`par_census.ts`, `balance.ts`: the Keep-it-in balance probe; run with
  `node node_modules\vite-node\vite-node.mjs --config <that
  folder>\vite.node.config.mjs <that folder>\<script>.ts <out.md>`).

## The aids (K137 stage 2)

Written by K137 stage 2 (2026-10-21; brief `docs/design/K137_s2.md`, whose
Design and Handoff sections hold the calls and the page results; design
`docs/design/K80_gameplay_additions.md` 4.15, 4.16 and 4.28). Free play
only; none is daily-exempt. Params: gameplay-links.md's AIDS PARAMS; rows:
gameplay-panel.md's AIDS ROWS; the tick and the compass: render-markers.md's
THE CHALK TICK AND THE COMPASS. The headers of `spool.ts`, `hints.ts` and
`src/ui/aid_buttons.ts` are the spec.

- ARIADNE'S SPOOL (`spool.ts`, 4.15): the yarn IS `pathEdges`, the path
  stack, so a tap on its top run reels in, any other tap pays out and Undo
  replays one tap fewer. Measure: par's (call 1), capacity =
  `spoolCapacity(fewestRuns, spoolSlack)` = `parFor`, title runs counted,
  default slack 0.3. Controller: `spoolOn`, `spoolCap`, `spoolUsed` (=
  `pathEdges.length`), `spoolShare`, `spoolWouldRefuse(eid)` (a retrace of
  the top run never refuses). tapEdge's result "spool" refuses a push past
  the capacity after the burnt and smolder checks and changes and logs
  nothing (replay treats it as a failure); main toasts "Out of yarn:
  retrace your last run to reel some in." (throttled) and flashes the HUD
  gauge. The spool forces the string look (`pathVizOf`, url_state.ts, at
  every pathViz read, so the pathViz row is inert under it) and turns the
  cut off (setRules' `plain`). The reel-in look: the newest yarn event is
  clipped to the dot in reverse while a backtrack retraces it, then popped
  at the move's end; restores rebuild the yarn from `pathEdges`. HUD
  "spool ████████ 100%" shows the share LEFT (SPOOL_GAUGE_CELLS 8); the
  stats and the finish show the share USED; share " · 🧶 82% of the spool".
- HINTS (`hints.ts`, 4.28): `hints` 0-5 a solve. `nextGoodArm` = the
  head's live arm minimizing its length plus the far end's walk distance
  to the exit (`liveDistances`: broken and cut runs removed; lowest id on a
  tie), -1 at the exit or with no route; the controller's `goodArm()`.
  It ignores the minotaur, the fire and the spool, so with the minotaur a
  hint still points to the exit. Hint (the button or H) spends one
  (`useHint()`; `hintsLeft`, `hintsUsed`) and lights the arm for
  HINT_SECONDS 2 in K525's rim look, in mint (0x7dffc4, against the
  walker's cyan); a move ends it early. While lit it takes the one
  telegraph slot and puts the base telegraph back after. HUD "hints 2 /
  3"; share " · 💡1".
- THE COMPASS (`compass`, its own flag: call 2): a small mint arrow beside
  the resting head along `goodArm()`'s first stretch, never aimed at the
  exit itself, found once per move, hidden while the dot moves, once
  solved and in walker modes.
- CHALK (4.16): a viewer pref (`knotmaze.chalk`, `chalkPref`, a panel row,
  never a link). The Chalk button and C toggle a tick on the head's
  junction (`toggleChalk`; `chalk` is the set of marked junctions). With
  the pref off the button and the ticks hide and C does nothing.
- RESTART VS UNDO: the hints used and the chalk marks live on the
  controller and `reset()` keeps them (Undo replays through it); main's
  real restart clears them (`clearAids`). Not a catch's level restart
  (the carry keeps both). Hints, the compass and chalk are off in walker
  modes.
- BUTTONS (`AidButtons`, `src/ui/aid_buttons.ts`): Hint (a count badge)
  and Chalk, one group bottom left above the cut buttons' row, clear of
  the move pad at the bottom right (call 3); the bottom toasts (K698) sit
  below them on the phone.
- HOOK: `__knotFabric().aids` {spool: {used, cap, share} or null,
  hintsMax, hintsLeft, hintsUsed, hintRun, goodArm, chalk, compassRun}.
  Probe: `.claude/probes/K137/s2/aids_page.mjs <base> [desktop|phone]
  [seed] [slack]` (real clicks or touch taps on
  `?<seed>&am=instant&snd=none&sp2=1&sps=<slack>&hn=3&cmp=1`: a spool run
  to its limit and a reel-in, a hint, chalk on and off and the pref off,
  the compass at every rest; ends in a CHECK summary; stills and JSON in
  `out/`, results in `results.md`).

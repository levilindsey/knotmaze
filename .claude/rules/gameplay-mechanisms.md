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
  - "src/game/rule_search.ts"
  - "src/game/ice.ts"
  - "src/game/color_rule.ts"
  - "test/game/rule_search.test.ts"
  - "test/game/ice.test.ts"
  - "test/game/color_rule.test.ts"
  - "test/game/rule_controller.test.ts"
  - "src/game/turnstiles.ts"
  - "src/game/hidden_runs.ts"
  - "test/game/turnstiles.test.ts"
  - "test/game/hidden_runs.test.ts"
  - "src/game/one_way.ts"
  - "test/game/one_way.test.ts"
---

# Gameplay lore: fragile runs, par (K137), collapse (K139), the cut (K114), the aids (K137 stage 2), ice and the color rule (K138 stage 1), turnstiles and hidden runs (K138 stage 2), one-way runs (K138 stage 3)

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
- K713 (2026-10-21; brief `docs/design/K698_polish.md`): AN UPPER-BOUND
  PAR (the search ran out, `par.exact` false) reads `par ≤ P` in the HUD
  and banner row, the share title (` · ✂️ N, par ≤ P`; WalkerShare
  `upper`) and the popover ("par is at most P"; `rateCuts(cuts, par,
  upper)`, the stars unchanged); an exact par, 0 included (K706 call 6),
  reads as before. THE MOVE PAD HIDES in walker modes (frame_loop.ts;
  the keys still refuse). THE WALKER'S GLOW: while a walker mode is on,
  before Go and while walking, the dot wears a glow in WALKER_COLOR
  (`placeWalkerGlow`, fabric_maze_renderer.ts: one Sprite just under the
  head mesh, at the head, the minotaur highlight's gradient at its
  hunting size, MINO_GLOW_DIAM_HUNT, and WALKER_GLOW_ALPHA 1; at the plain
  3 radii and 0.9 it showed only as a faint fringe past the head's rings,
  `.claude/probes/K698/` stills). The size and alpha are open to tuning.
  syncMinotaur is untouched.
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
  the move pad at the bottom right (call 3); since K698 the toasts rise
  above the group, as above every bottom control in their column
  (gameplay-indicators.md, THE TOASTS CLEAR THE CONTROLS).
- HOOK: `__knotFabric().aids` {spool: {used, cap, share} or null,
  hintsMax, hintsLeft, hintsUsed, hintRun, goodArm, chalk, compassRun}.
  Probe: `.claude/probes/K137/s2/aids_page.mjs <base> [desktop|phone]
  [seed] [slack]` (real clicks or touch taps on
  `?<seed>&am=instant&snd=none&sp2=1&sps=<slack>&hn=3&cmp=1`: a spool run
  to its limit and a reel-in, a hint, chalk on and off and the pref off,
  the compass at every rest; ends in a CHECK summary; stills and JSON in
  `out/`, results in `results.md`).

## Ice and the color rule (K138 stage 1)

Written by K138 stage 1 (2026-10-21; brief `docs/design/K138_s1.md`, whose
Design and Handoff sections hold the calls, the census and the page
results; plan `docs/design/K138_plan.md`; design
`docs/design/K80_gameplay_additions.md` 4.18 and 4.19). The classic game
only; neither is daily-exempt. Params: gameplay-links.md's ICE AND COLOR
RULE PARAMS; rows: gameplay-panel.md's ICE AND COLOR RULE ROWS. The headers
of `rule_search.ts` (the kit: rules, the search, composition, placement),
`ice.ts` and `color_rule.ts` are the spec.

- THE CONTROLLER: `setRules` keeps one composed rule (null unless ice or
  the color rule is on, collapse, fragile runs, the cut, the fire and the
  spool are off, and the placement found a layout). A fresh tap asks
  `rule.step`: null returns `"refused"` and changes nothing (replay treats
  it as a failure); otherwise `ruleState` moves on and `carry` takes the
  rest of a slide, which main's `carryStep` walks one run per arrival at
  the walk's own pace (call 7). A fresh backtrack undoes the whole move
  (call 1): the state comes back from `stateStack`. Under a rule a stroke
  is a tap (a slide counts one), Undo replays the actions
  (`replayActions`), par's F and strict's runs-left come from the kit, and
  `optimal` (the kit's shortest legal length) feeds the stars and the
  efficiency. `choices()` leaves refused runs out, so they never pulse;
  `refusedChoices()` lists them.
- A TAP ON A REFUSED RUN picks no choice. K480's `targetAt` takes the run
  as a one-run route, and `executeRouteRun` hands it to `moveAlong`, whose
  `"refused"` result plays `cutPluck(eid, REFUSE_OCTAVE, REFUSE_STRENGTH)`
  and toasts the rule ("Cycle the colors: light, then middle, then dark,
  then light again." or "Alternate the shades: light, then dark, then
  light."), at most once per 1.5 s; the route clears. A route planned
  further out does not read the rule: it walks until its first refused run
  and stops there with the same toast (a residual).
- THE LOOKS (`section_colors.ts` `ruleRunTable`, applied by scene.ts at the
  build and in `recolorScene`): one flat override record per walk run,
  frost (FROST_RGB 0.86, 0.95, 1.0) on icy runs and the rule colors on
  colored ones (ALTERNATE_LUMAS 0.8 / 0.3, CYCLE_LUMAS 0.8 / 0.5 / 0.22 over
  the design's gamut); exempt runs keep the scheme's own records.
- THE AIDS (call 5): the spool turns the rules off; hints and the compass
  follow the kit's route under a rule; the chalk is independent.
- MEASURED (a Node census, 50 seeds at today's defaults,
  `.claude/probes/K138/s1/census/results_after.md`): every config placed
  and bit on 50 of 50, in at most 2 draws. Legal against plain, medians:
  fewest taps ice 0.929, alternate 1.345, cycle 1.481, ice + alternate
  1.267; shortest length 1.044, 1.364, 1.399, 1.575.
- PROBES: `__knotFabric().rules` (null with no rule; `mode`, "off" without
  a color rule; `icy`, `colors`, `state`, `placed`, `bites`, `draws`,
  `key`, `optimal`, `carry`). `.claude/probes/K138/s1/rules_page.mjs <base>
  ice|alternate|cycle [desktop|phone] [seed]` (real clicks or touch taps on
  `?<seed>&am=instant&snd=none&ice=0.25` or `&cru=<mode>`: a slide and its
  checks, or a refused run, its toast and the next move; a CHECK summary).
  GOTCHA: refused runs are not in `__knotFabric().choices`; read them from
  the controller's `refusedChoices()`.

## Turnstiles and hidden runs (K138 stage 2)

Written by K138 stage 2 (2026-10-21; brief `docs/design/K138_s2.md`, whose
Handoff holds the calls, the census and the page results; design
`docs/design/K80_gameplay_additions.md` 4.12 and 4.27). The classic game
only, off under the same switches as ice; neither is daily-exempt. Params:
gameplay-links.md's TURNSTILES AND HIDDEN RUNS PARAMS; rows:
gameplay-panel.md's TURNSTILES AND HIDDEN RUNS ROWS. The headers of
`turnstiles.ts` and `hidden_runs.ts` are the spec.

- THE KIT: `WalkRule.step(from, run, state, last?, phase?)` now sees the
  arrival run and the move clock, and `ruleSearch(walk, rule, {vertex,
  state, last, phase})` searches from any node. A rule with `period` > 1
  runs `clockSearch`, which adds bounce edges (out and back, 2 taps) and
  deep bounces (4 taps) so a player can wait out a turnstile; longer
  excursions are not modeled (a residual). The search bars the arrival
  run at its source, so a dead end has no route: a retreat is the
  controller's backtrack.
- THE CONTROLLER: `refusalOf(eid)` names why a fresh tap is refused
  ("hidden" | "turnstile" | "rule" | null); `strokes` (the clock, call 1)
  is the actions minus the reveals, in every mode, real time included; a
  reveal is an action `{kind: "reveal", run}`, so Undo past one replays
  the rest and hides the run again (call 4). `hiddenRuns()`, `reveal`,
  `isHidden`, `revealed` and `fewestWithHidden` serve the app.
- TURNSTILES: three runs at a junction, two connected at a time; the open
  pair is `(phase0 + clock) % 3` (call 2: phase0 seeded per junction), and
  the arrival run always lets you back out. A band through the junction
  (`junction_routes.ts`, drawn by `fabric_maze_renderer.ts`) shows the open
  pair; a refused tap toasts "That turnstile is closed this way. It turns
  one step with every move." with the refusal pluck. Under ice a slide
  through a closed turnstile is refused whole.
- HIDDEN RUNS: an unrevealed one draws nothing (its spans are gone, like a
  burnt run's), is not a choice and is untappable (`edgeAt` and
  `pickThread` skip it). A pluck (a tap's, or a drag's release) on thread
  of the same note within REVEAL_RUNS 3 runs reveals every such hidden run
  (`main.ts` `revealByPluck`, call 3; a pluck on the hidden run itself
  reveals nothing) with the toast "A hidden run appears." (or "N hidden
  runs appear."). Auto plucks (music mode) do not reveal. Under the thread
  reveal an unexplored run is empty space, so only explored thread can
  reveal (the page check's near pluck found none at seed 7).
- PAR (call 5): par, strict, the stars and the efficiency rate the maze
  without the hidden runs; the HUD's hidden row also shows the fewest with
  them ("1 / 2 found · fewest 16, 14 with them").
- HUD AND SHARE: rows "rules" (stage 1's ice share and color rule),
  "turnstiles" and "hidden" (their `STATS` lines in `maze_stats.ts`, the
  values from `app/rule_loss.ts` `ruleFields`); share tags ` · 🧊 25%`,
  ` · 🎨 cycle`, ` · 🔄 4` and ` · 👻 1/2` (`ruleShareTags`).
- MEASURED (a Node census, seeds 1-50 at today's defaults,
  `.claude/probes/K138/s2/census/results.md`): every config placed and bit
  on 50 of 50, the same layout twice. Legal against plain, medians: fewest
  taps tst 2 1.065, tst 4 1.067, tst 8 1.138, hid 2 1.087, hid 4 1.215, tst
  4 + ice 0.25 1.065; shortest length 1.014, 1.030, 1.047, 1.057, 1.123,
  1.102. Draws at most 7 (tst 2). With every hidden run revealed, fewest /
  plain = 1.000.
- PROBES: `__knotFabric().rules` adds `turnstiles` ({vertex, arms,
  phase0}), `phase`, `hidden`, `revealed`, `unrevealed`, `fewest`,
  `fewestWithHidden` and `notes` (each run's pluck note). `.claude/probes/
  K138/s2/s2_page.mjs <base> turnstile|hidden [desktop|phone] [seed]` (env
  EXTRA appends link keys; on `?<seed>&am=instant&snd=none&tst=4` or
  `&hid=4`: a refused arm, going back through a closed turnstile, the arm
  opening a move later; or a tap on a hidden run, a far pluck, a near
  pluck, the walk; then the finish and the share; a CHECK summary).
  GOTCHA: a probe that finishes by the kit's route must backtrack at a
  dead end (the search has no route there). A hint and the compass do:
  at a turnstile dead end `goodArm()` is the backtrack (ruleGoodArm's
  undo search; turnstiles.test.ts checks 260 seeded dead ends).
- RESIDUALS: the third arm of a turnstile is not dimmed; the bands show
  the next phase during a move's animation; a band's contrast depends on
  the section colors; after a backtrack the arrival run is the path's
  previous run, so re-entering the run just retraced can be refused; the
  HUD reads "0 / 0 found" when nothing was placed; outside the thread
  reveal a press on a hidden run grabs its particles and tugs the unseen
  thread instead of panning (by reading: `grabAt` and `onThread` take
  `ps.nearest`, which knows no gone span; not run in the page).

## One-way runs (K138 stage 3)

Written by K138 stage 3 (2026-10-21; brief `docs/design/K138_s3.md`, whose
Handoff holds the calls, the census and the page results; design
`docs/design/K80_gameplay_additions.md` 4.2). The classic game only, off
under the same switches as ice; not daily-exempt. Param:
gameplay-links.md's ONE-WAY RUNS PARAM; row: gameplay-panel.md's ONE-WAY
RUNS ROW. The header of `one_way.ts` is the spec.

- THE ORIENTATION (`oneWayCore`): the CORE is the largest 2-edge-connected
  piece of the walk graph over the runs that may turn one-way (no exempt
  run, no self-loop); the bridges (Tarjan, by run id) split off the pockets
  and tails, which stay two-way. One DFS of the core, rooted on the base
  route, orients every core run (Robbins); a draw orients round(share x
  core runs) of them and reverses the whole subset on a coin. NO TRAPS
  without ice: a subset of a strongly connected orientation keeps every
  vertex reaching the exit (one_way.test.ts: strongly connected on every
  real core; random walks at 0.6 never stuck).
- PLACEMENT (`placeOneWay`): after the turnstiles and before the hidden
  runs, against the rules beneath composed. A weighted draw without
  replacement from the "oneWay" stream (ROUTE_WEIGHT 4 tickets for a run of
  the base route, 1 for any other), kept by the kit's placeRule (the first
  solvable draw that bites, else the last solvable). Share 0 places nothing
  and draws nothing, so off is bit-identical. Under the color rule a
  directed walk must also keep the colors, so a draw can fail (seed 1,
  alternate, 0.4): then nothing is one-way and the rules beneath still play.
- THE RULE (`oneWayRule`; call 5): a one-way run may be tapped only from
  its entry, and par, strict, the stars and the fewest moves are the
  directed search. A backtrack retraces a whole move, so the controller
  refuses one whose move took a one-way run (`oneWayBlocksBack`), and a
  clocked search (turnstiles) keeps its bounces off such a move
  (`WalkRule.blocksBack`, which `composeRules` carries).
- REFUSALS: `refusalOf(eid)` returns "oneWay" for a run tapped against its
  arrow and for the arrival run when its backtrack is refused; main.ts
  `ruleRefused` toasts "That run is one-way: follow the arrows." or "No
  going back over a one-way run." with the refusal pluck.
- UNDO: the controller's Undo (main.ts `undoMove`: the actions but the
  last, replayed) is never refused, but NO UNDO CONTROL SHOWS beside the
  rules. The cut's and the walker's bars need the cut, which turns the
  rules off, and the only rule-loss banner with Undo (Stranded) needs
  fragile runs or collapse, which turn them off too. So the brief's "Undo
  is always allowed" holds at the controller only (a ledger item for Levi).
- CHEVRONS (call 2): marker glyphs (`marker_glyphs.ts` role "chevron",
  design "oneway", a placeholder for Levi's own), drawn by
  `fabric_maze_renderer.ts` `drawOneWay` from a page-lifetime pool
  (CHEVRON_POOL): one at a run's middle, two (at 0.3 and 0.7) on a run
  longer than CHEVRON_LONG 16 ctrl, CHEVRON_SCALE 0.55 marker radii, turned
  along the way by the tangent over CHEVRON_TANGENT 0.4 ctrl. A mesh, and so
  a draw call, per chevron (seed 7 at 0.4: 116; not timed).
- WITH A CHASE (call 1): the rules bind the player only, as s1 did for ice
  and the color rule. No chase file reads the one-way layout; stage 6 makes
  the minotaur and the fire obey the rules.
- HUD AND SHARE: the row "one-way" (the runs laid; `maze_stats.ts`,
  `rule_loss.ts` `ruleFields`) and the share tag ` · ⏩ <n>`
  (`ruleShareTags`).
- MEASURED (a Node census, seeds 1-50 at today's defaults,
  `.claude/probes/K138/s3/census/results.md`): every config placed and bit
  on 50 of 50 and laid the same layout twice; draws median 1. Laid,
  medians: 53 / 106.5 / 160 of a 266.5-run core at ow 0.2 / 0.4 / 0.6, 6 /
  9 / 11 of them on the 14-run plain route. Legal against plain, medians:
  fewest taps 1.172 / 1.342 / 1.500, shortest length 1.146 / 1.300 /
  1.417; ow 0.4 + ice 0.25 1.445 and 1.527, ow 0.4 + tst 4 1.408 and
  1.303.
- PROBES: `__knotFabric().rules.oneWay` ([run, entry vertex] pairs) and
  `__knotFabricRenderer().chevronCount`. `.claude/probes/K138/s3/
  ow_page.mjs <base> [desktop|phone] [seed=7]` (env EXTRA appends link
  keys; on `?<seed>&am=instant&snd=none&ow=0.4`: the HUD row, a tap against
  an arrow, a one-way run walked, its backtrack refused, the controller's
  Undo, the finish and the share; a CHECK summary): 18 of 18 on desktop and
  at 411x753 with touch taps. GOTCHA: `&ct=on` turns every rule off, so a
  one-way probe never reaches the cut's Undo button.
- RESIDUALS (inferred from the rules, none seen in the page): with ice a
  move can be a slide, so the NO TRAPS argument fails and nothing checks
  for a trap; at a turnstile whose open pair leaves out the arrival run, a
  one-way arrival leaves the player no move; and no control rescues either
  (UNDO above). Unchecked: the chevrons under the fog and the thread
  reveal. The chevron's look is a placeholder.

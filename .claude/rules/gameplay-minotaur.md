---
paths:
  - "src/game/minotaur.ts"
  - "test/game/minotaur.test.ts"
  - "src/game/minotaur_turns.ts"
  - "test/game/minotaur_turns.test.ts"
---

# Gameplay lore: the real-time minotaur

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## The real-time minotaur

- REAL-TIME MINOTAUR (K80 stage 1, 2026-10-13; game/minotaur.ts, brief
  docs/design/K80_realtime.md). `clock` (`clk`) = turn (default) |
  realtime, a fabric-mode panel row with its own Minotaur folder. CLOCK:
  a fixed-step sim, CHASE_HZ 120, at most 30 ticks (0.25 s) an advance;
  main.ts advances it only while the page is visible, after the first tap
  and before the finish. A tick depends only on the tick count, the
  params, seedMix(seed) and the player's inputs (replayChase), and the
  module uses only exact math (K108). THE PLAYER: one run per tap at
  playerPace; a tap while moving QUEUES (the latest wins, it leaves on
  arrival); no undo (`undoAllowed(clock)`, which K92 must consult) and no
  wait move. THE MINOTAUR: waits `wake` s in its lair at the exit end,
  then wanders (shortest route to a junction roamRange/4..roamRange away,
  or with chance deadEndBias a dead-end tip, since K174 leaning toward
  the player: roamPull, the entry below; legs at wanderPace x
  (1 +- paceJitter), pauses pauseMin..pauseMax at its destination and
  with chance pauseChance at a junction it passes). HUNT: begins within
  detectStart and ends beyond detectEnd, both THREAD distance through the
  walk graph minus the two tails; it runs at approachPace on the shortest
  path to the player, re-planned every tick, and turns back mid-run only
  when that is shorter by REVERSE_MARGIN 1.5. THE TAILS ARE A SANCTUARY:
  barred to it, a player on either is unseen and uncatchable. A CATCH
  (catchDist) is a respawn, not a loss: the player goes back to the
  entrance (FabricMazeController.respawn: the path, yarn and trail follow
  an empty path; under K174's minoRefog, default on, the fog goes back to
  the solve's start, and with it off the explored fog stays, as K100 made
  it; before K100 a catch cleared the fog), the minotaur to its lair, the clock
  runs on; it counts in the HUD (the "caught N" row shows in real time
  even with stat rows off), a toast ("Caught! Back to the entrance.") and
  the win banner (caught, chased). Reset path restarts the chase. (K80
  turns stage 2 made both optional and counted: CATCH RESETS below.)
  minoFog (shown only under fog of war) = when the minotaur shows THROUGH
  the fog: always (default, a decision for Levi) | hunting (only while it
  hunts) | never (only where the fog has lifted). Its off-screen
  indicator (#7a0c0c disc, the minotaur's default glyph) shows only once
  it has left the lair. The marker (a K83 marker wearing a placeholder
  glyph: the bull, since K98 the Taurus horns, which the indicator wears
  too) is drawn at markerRadius, the player's size (K98; until then
  markerRadius x 1.15 with a MINO_MIN_CSS_R 10 CSS px floor), over a red
  glow (dim in the lair, larger and full while it hunts), and like the
  exit marker waits for the intro to draw its thread. Live panel edits reach a running chase through
  setParams. CODEC: appended at 84-98 (clock, playerPace, the minotaur's
  paces, jitter and pauses, detect, lose, catch, deadEnds, roam, wake,
  minoFog; keys clk plp mwp mhp mpj mpc mpn mpx mdt mls mct mde mrm mwk
  mfg); K174 appended minoToward and minoRefog at 106-107 (mtw mrf) and
  made mwp and mhp fractions of playerPace. A retune edits
  DEFAULT_CHASE_PARAMS (PARAM_DEFAULTS reads it; the paces' fractions are
  WANDER_PACE_FRACTION and HUNT_PACE_FRACTION) and url_codec.test.ts's
  defaults pin.
  `clock` is not a DAILY_EXEMPT_KEY: the dailies stay turn-based.
  DEFAULTS come from a headless simulation of 288 mazes with scripted
  players (`.claude/probes/K80/rt/`, results.md): only approachPace
  moved (8 -> 7). At the defaults a greedy
  player is caught 1.26 times a game (median 0; 51% never), a fleeing one
  escapes 53% of hunts (75% with queued taps); think time decides
  escapes, most catches are in dead-end pockets, and 45% of games never
  meet it (K174's roam toward the player: 37%, 1.68 catches a game). A
  player who hides on the entrance tail is often caught on
  walking back out: the minotaur pauses at that tail's junction. PROBE
  HOOKS: `__knotChase()` (state, events, counts), `__knotChaseTap(edge)`,
  `__knotChaseObj()`.

- THE MINOTAUR'S CONTROLS (K174, 2026-10-14; brief docs/design/K174.md,
  Levi's answers to K80's six calls). PACES ARE FRACTIONS of playerPace:
  minoWanderPace / minoHuntPace (`mwp` / `mhp`, panel "(x your pace)",
  0-2, no step, shown to 2 decimals) default to WANDER_PACE_FRACTION 0.5
  and HUNT_PACE_FRACTION 0.7. ChaseParams stays in u/s: url_state.ts's
  chaseParamsOf multiplies, so one playerPace edit scales the chase, and
  0.5 x 10 and 0.7 x 10 are exactly master's 5 and 7 in doubles (the
  default chase replays K80's tick for tick: minotaur.test.ts's
  K80_DIGESTS). Links are not clamped: a K80 probe link's `mhp=25` now
  means 25 x your pace. ROAM TOWARD THE PLAYER: `minoToward` (`mtw`,
  default on) sets ChaseParams.roamPull to DEFAULT_CHASE_PARAMS' 0.5, off
  to 0. With chance roamPull a roam leg draws its destination only among
  the candidates (K80's tips or junctions) whose thread distance to the
  player is shorter than the minotaur's own; with none nearer, or the
  player on a tail (unseen), it draws among all. It splits K80's u2 draw
  (below roamPull, u2 / roamPull picks among the nearer; above,
  (u2 - roamPull) / (1 - roamPull) among all), so roamPull 0 is K80's
  pick exactly. It still roams: only where a leg ends leans, there is no
  homing. MEASURED on the K80 sim (288 mazes x 3 reps,
  `.claude/probes/K174/rt/results.md`), off -> 0.5: a greedy player meets
  it in 56% -> 63% of games, is caught 1.32 -> 1.68 times (median 0 ->
  1), has 0-2 catches in 82% -> 74% of games and is chased 4.7 -> 5.6 s;
  the fleers' escape rates do not move (53%, 76% with queued taps). Pull
  1 reaches 66% for 1.94 catches: most of the gain comes by 0.5, so one
  strength and no slider. RE-MEASURED ON H1 MAZES (K278 (c), K80 turns
  stage 2; `.claude/probes/K80/turns2/rt/`): pull 0 / 0.25 / 0.5 / 0.75
  / 1 gives a greedy player 1.29 / 1.47 / 1.66 / 1.73 / 2.02 catches,
  spotted in 57 / 61 / 61 / 65 / 65% of games; the fleers' escapes stay
  near 54-58% (75-77% queued), so 0.5 stays. minotaur.test.ts's
  still-player test now runs on H1 mazes (no `hCutShare: 0`), averaged
  over mazes 100-119 x 6 seeds: 65.6 s to reach a still player at pull
  0, 43.9 s at pull 1 (ratio 0.67, bound 0.8); K80_DIGESTS re-frozen. THE CEILING: a fifth of greedy solves end
  inside 30 s, before it can arrive (11-17% of those meet it at any
  pull), so meetings top out near two thirds without homing. Rejected,
  "closest" (with chance roamPull, the single candidate closest to the
  player): about the same meetings for more catches (2.11 at 0.5, 0-2 in
  68% of games). RE-FOG ON A CATCH: `minoRefog` (`mrf`, default on, shown
  only under fog of war like minoFog): main.ts's catch calls
  `fc.respawn(params.minoRefog)`, respawn(true) bumps the controller's
  `refogs`, and the renderer clears the stamps when it moves
  (gameplay-fog.md); the solve, its clock and its counts go on. Off keeps
  the explored fog. The toast still says only "Caught! Back to the
  entrance.". CODEC: minoToward 106, minoRefog 107, after hoverGlow;
  neither is daily-exempt. COST: none measurable. chase.advance takes
  0.008 ms a frame (max 0.3), syncMinotaur 0.011 and setMoveProgress
  0.059, and a chase frames like turn mode (desktop rAF median 17.6 ms,
  p95 18.1; `.claude/probes/K174/k174_page.mjs perfq`). K177's checks
  passed: the three minoFog modes, the indicator at 411x753, and a
  non-instant intro (no chase tick during the pre-settle or the intro;
  it waits in its lair for the first tap).

## The turn-aligned minotaur

- TURN-ALIGNED MINOTAUR (K80 turns stage 1, 2026-10-14;
  game/minotaur_turns.ts, brief docs/design/K80_turns.md). `minotaur`
  (`mt`) = off (default) | hunter | guard | stalker, on the turn clock
  only (ignored under clk=realtime, whose panel hides the turn rows). AN
  EXACT PORT of the brief's research harness (section 0) on ChaseGraph
  plus a hop matrix (TurnGraph): walk edge id === chase edge index, vertex
  order = walk.vertices order, candidates sorted by run id. RULES: every
  accepted move (a run, or a WAIT) is one minotaur turn; the game state
  moves at once and the minotaur's run plays over the player's move
  animation (`progress`, a wait's over moveSeconds of the same thread).
  CONTACT is continuous: caught when your run ends where its turn ends,
  or meets it head-on on one run; a wait is caught when its path passes
  your junction. An exit END run always wins (before contact). It never
  steps onto the start or the exit, and the start hides you (sanctuary).
  THE TELEGRAPH (default on, forced on at charge and two): after each
  turn the next one is decided from where you stand (`commit`) and drawn
  as a red 0xff2418 polyline along its runs with a ring at the
  destination; null mid-animation; on minoLayer, so minoFog covers it.
  THE RNG is counter-based on the game's global `turns` (rng.at), so the
  same taps replay the same game; sleep and half-speed parity count
  `lifeTurn` (since the last spawn). MODELS: hunter = prox (roams to a
  junction rMin = min(minoRoamMin, roam)..roam runs away, hunts within
  sight, gives up beyond sight + minoGiveUp and checks where it last saw
  you; both 3, the constants ROAM_MIN and LOSE_MARGIN until stage 3a);
  guard = prox around the exit's junction, rMin 1..territory; stalker =
  chase (a best step with chance accuracy while you are off the start,
  random otherwise). Speed half (odd lifeTurns) | one | charge (two runs
  a turn while it hunts or has you in sight; the stalker charges within
  sight) | two; pause = chance it stands still a turn; sleep = turns in
  its lair first. A CATCH happens at the tap that makes it (stage 1
  animates no catching move): turnCaught cancels the move, respawns
  (re-fog under minoRefog), clears the yarn, bumps the HUD's caught row,
  toasts "Caught! Back to the entrance.", and the model puts you at the
  start and it in its lair (lifeTurn 0) and re-commits. Display: lair
  until it leaves; hunt = the stalker sees you or prox mode != 0 (the
  committed state); else wander, with real time's glow alphas. PARAMS,
  108-116 (codec v5 then, v6 since K76 stage 2c), after minoRefog (107;
  109-117 on the branch until K111 stage 3 removed highlightMode's 108;
  stage 3a appended six more at 140-145, its entry below):
  minotaur `mt`, minoSpeed `msp` (one), minoTelegraph `mtg` (on),
  minoSight `msi` (2 runs; 4 until stage 2), minoRoamRuns `mro` (8),
  minoTerritory `mtr` (6; both 1 at least since stage 2), minoAccuracy
  `mac` (0.3; 0.9 until stage 2), minoPause `mpa` (0.1), minoSleep `msl`
  (0). SEPARATE from real time's knobs (turn units: runs, turns,
  chances); SHARED: minoFog, minoRefog and the minotaurIndicator setting.
  Not daily-exempt. UNDO: `minotaur` restarts the solve (onClockChange
  covers clock and minotaur), the tuning rows are live (onTurnMinoChange
  -> setConfig); no move undo (`undoAllowed(clock, minotaur)`). THE WAIT
  TAP: within max(1.5 head discs, 0.9) world of your junction AND nearer
  it than any run's tappable part (renderer `runDistance`, every run's
  HEAD_EXCLUDE neighborhood excluded), checked before run hit-testing.
  The radius alone (the 0.9 floor at the default width) swallowed every
  real click on a choice's tap point, 1.5 ctrl out (probe: 0 clicks, 8
  fallbacks; with the split 30 and 0). Since stage 3a the `.` and Space
  keys and the move pad's center wait too, and every wait queues while a
  move plays instead of snapping it (gameplay-moves.md's THE WAIT ON
  EVERY INPUT); a wait is still not in `fc.taps` (attempt saves miss
  it). HOOKS: `__knotTurnMino()` (state,
  telegraph, minoScreen), `__knotTurnMove(edge)`, `__knotTurnWait()`,
  `__knotTurnMinoObj()`. MEASURED (`.claude/probes/K80/turns/`, the
  probes.md K80 entry): the module and the harness agree on 9600 games
  (80 designs x 5 configs x 3 players x 8 reps), 0 trace mismatches.
  TODAY'S mazes are far deadlier than section 0's: the default hunter
  catches an attentive explorer on 14% of dailies (1% then) and an
  80%-attention one on 32% (13%), since dailies now have dead ends (5.9
  ends vs 2.0) and fewer loops (cycle rank 89 vs 102). STAGE 2'S RETUNE
  (K269, 2026-10-14) moved sight 4 -> 2 and accuracy 0.9 -> 0.3, nothing
  else (`.claude/probes/K80/turns2/`: sweep.ts, the sweeps, full_*.md):
  on dailies the hunter now catches the explorer / 80%-attention / fog-4
  players on 2 / 13 / 13% (64 reps: 1.0 / 13.1 / 13.2), the guard 3 /
  19 / 22, the stalker 1 / 20 / 22, against section 0's 1 / 13 / 11. The
  cost: on the treelike and dead-end sets the hunter fell below section
  0 (treelike 80%: 8% vs 27%). Sight 1 / accuracy 0.65 was rejected: it
  hunts only when adjacent. The table is in the brief's stage 2 handoff;
  the stalker lost the most (per-model accuracy: K294, stage 3a below).

- TURN MINOTAUR STAGE 3a (2026-10-15; brief
  docs/design/K80_turns_stage3.md, whose Stage 3a handoff holds the
  tables; `.claude/probes/K80/stage3/`, untracked: sim.ts, sweep.ts,
  compare_after.ts, the sweep_3a_* and compare_3a_* files). KNOBS (codec
  140-145, gameplay-links.md; rows by model, gameplay-panel.md):
  `minoGiveUp` and `minoRoamMin` (both 3) replace LOSE_MARGIN and
  ROAM_MIN (K324 section 4.3); `minoTurnPull` (0); K294's per-model
  sight and accuracy: the guard `minoGuardSight` 4 / `minoGuardAccuracy`
  0.3, the stalker `minoStalkerAccuracy` 0.45, while the hunter keeps
  minoSight 2 / minoAccuracy 0.3 and the stalker's charge reads
  minoSight (TURN_MODEL_DEFAULTS; turnMinoParamsOf picks by model). THE
  PULL (wanderDest): with chance pull a roam's destination is drawn only
  among the in-range junctions nearer you (hops) than the junction it
  stands on (m.v); none nearer, or you on the entrance tail (p < 0),
  draws among all. It splits the one draw u as roamPull does, so pull 0
  is the old pick exactly. The stalker never roams, so it ignores it.
  Default 0 (the brief's question 5): % caught on dailies, explorer /
  80% / fog-4, 8 reps, at pull 0 / 0.25 / 0.5 / 1: hunter 2/13/13,
  2/16/13, 0/18/15, 2/22/18; the hunter at speed charge 2/18/15,
  2/18/16, 3/23/21, 8/28/26; guard 3/19/22, 1/21/24, 2/28/20, 1/27/25. K294'S DEFAULTS:
  the criterion is the sum over the nine cells (daily, treelike and
  dead-end sets x the three players) of |caught% - section 0's target|,
  a near-tie (within about 4) broken by the daily cells alone. At 64
  reps the guard (sight 2 / 0.3 -> 4 / 0.3) scores 48.9 -> 43.3 and the
  stalker (0.3 -> 0.45) 100.8 -> 90.5 (0.6 scored 87.6 with daily cells
  34.3 vs 24.9). OPEN FOR LEVI: the stalker's daily 80% and fog-4 cells
  overshoot section 0's (27.9 / 28.5 vs 20 / 12); stage 2's dailies-only
  criterion would keep 0.25-0.3. PIN: test/game/minotaur_turns.test.ts
  TURN_GAMES, 18 whole games (seeds x the three models x scripted walks
  with waits) played at turnMinoDefaults(model) and digested; K294
  re-froze the guard and stalker rows (all but stalker:42:2), the hunter
  rows held through the pull. guard:42:2 now digests as stalker:42:2
  does: at sight 4 it hunts the whole game (not a bug). The harness
  mirror (sim.ts) matches the module on 9600 games at the new defaults
  and at every pull tried, 0 trace mismatches.

- TURNS BY LENGTH (K481 stage 1, 2026-10-15; brief
  docs/design/K481.md, model only, no page or param yet). Behind
  `TurnConfig.byLength` (off by default; stage 2 wires `minoByLength`):
  each accepted move, the minotaur travels the speed factor times the
  player's thread length (half 0.5x every turn, one 1x, two 2x, charge
  2x while hunting or in sight else 1x; a wait travels the maze's median
  run length, `TurnGraph.medianLength`, times the factor). Sleep and
  pause still gate the turn. Its position is a `Spot` (`MinoState.spot`;
  at a vertex, or mid-run with `v` the vertex ahead, so a turn can stop
  mid-run and can turn back on a run). The route
  (`planLengthRoute`) is decided at the move's start from where the
  player stands, as the telegraph commits today, long enough for the
  longest choice at that vertex; its hops keep today's run decisions
  (sight, roam, give-up, territory, the counter RNG), only the travel
  changed. Where the travel outruns a roam destination the route
  EXTENDS past it (a new destination is picked, as decide()'s loop
  does), keeping the mean travel at the factor times the player's
  length; a hunting route stops at the player's standing vertex.
  Contact (`contactByLength` / `lengthContactDistance`) is continuous:
  the player at t x their run and it at t x its travel, caught when the
  thread distance (`ChaseGraph.spotToSpot`, whole graph) falls to
  `BY_LENGTH_CATCH_DIST`. Tuned on the turn sim from the real-time 1
  down to 0 (the runs rule caught only coincidences too, and crossing
  already catches head-on and through-vertex meetings; sweep
  `.claude/probes/K481/sweep_length_32.md`, 32 reps): today's / by-length
  % caught, hunter daily 1.1/3.4, treelike 1.6/4.2 (explorer cell;
  nine-cell scores 24.9 hunter, 17.3 guard, 54.6 stalker at 0, the best
  of 0-1). The mode stays deadlier for the attentive explorer (stalker
  daily explorer 3.4 -> 8.9): at speed one it averages 1.69 hops a turn
  (its runs are shorter than the player's picks), which no catch
  distance in [0, 1] offsets without a travel scale the brief forbids;
  that is the stage 2 / Levi call in the K481 handoff. The entrance
  still hides the player (a move ending on the start is never a catch),
  it never steps onto the start or the exit, and an exit run wins
  before contact. Stats (decision 9): `seen` counts a turn when any hop
  it actually started was decided hunting or checking (the chase: the
  player was visible where the turn was decided), and a close call is
  a non-catch move ending within one median run of thread from it, out
  of its lair and off the start. The telegraph carries the route plus
  `stops` (where it would stop for each choice, the wait included), for
  stage 3's ticks. With the flag off, `TURN_GAMES` is unchanged; in the
  mode, `LENGTH_GAMES` pins 18 games and the probe mirror
  (`.claude/probes/K481/sim_length.ts`) matches the module on 1872
  games, 0 trace mismatches (`compare_length_8.md`).

- CATCH RESETS (K80 turns stage 2, K273, 2026-10-14; Levi: "a toggle to
  conditionally reset the level/Minotaur/fog when dying to the
  Minotaur"). Both clocks, shared rows after minoSleep / the real-time
  knobs. `minoRestart` (`mrs`, default off): a catch IS the level restart
  (main.ts `restartSolve(true)`: path, yarn, fog, fuse, a new minotaur,
  the clock restarted by resetAttempt and idle until the next move), the
  toast "Caught! Starting over.". `minoLair` (`mlr`, default on, hidden
  while minoRestart is on, as minoRefog is): off, a catch leaves the
  minotaur where it caught you instead of in its lair. Turn clock: its
  state keeps the vertex its turn ended on (left, mode 0, nothing
  remembered) and lifeTurn restarts, so its sleep applies again there;
  real time: it keeps its Spot, even mid-run, and pauses `wake` s there.
  It can camp the entrance's first junction: the start hides you, so wait
  it out (K293 (d), kept). TALLIES CARRY: a restart under a minotaur
  hands the old one's counts to the new (`carry()`: catches, restarts,
  and huntTicks or closeCalls and seen), so a restart never launders a
  catch. A Reset path under a minotaur, with a move made and the run
  unsolved, is a COUNTED restart (`restarts`, a stat row above 0); with
  no move made since the last restart it carries the tallies too,
  uncounted (stage 3a; before, it called restartSolve() without carry,
  so a catch under minoRestart, or a counted restart, then a Reset path
  started a fresh minotaur at 0 catches). A Reset path shows no toast
  (K293 (f), kept). STATS (section 2.9;
  game/maze_stats.ts STATS): close calls (turn clock: a move that ends
  one run from it, out of its lair, off the start; real time has none)
  and seen (turns it spent hunting you, the hunting getter's rule, with
  the telegraph read from where you stood when it decided). The move log
  gains `x` (fabric_controller `markCaught`: replaces the run you were
  caught on, adds one for a wait), drawn as the ox U+1F402 in the share
  grid; the share title wears `🐂 N`, or `🐂 0 · N close calls`. An added
  `x` is no move: `moveCount` reads the taps, not the move log (K293 (c),
  stage 3a), so a catch on an empty log does not make a Reset path a
  counted restart. Under minoRestart the move log restarts with the
  level, so the grid shows no ox (the title still counts) and the stars
  rate the walk since the level last started over, which the popover
  says since stage 3a (K293 (a); gameplay-stars.md). The win banner has
  no move grid.

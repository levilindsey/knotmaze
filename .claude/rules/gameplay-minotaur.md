---
paths:
  - "src/game/minotaur.ts"
  - "test/game/minotaur.test.ts"
  - "src/game/minotaur_turns.ts"
  - "test/game/minotaur_turns.test.ts"
  - "src/game/sword.ts"
  - "test/game/sword.test.ts"
  - "src/game/sprint.ts"
  - "test/game/sprint.test.ts"
  - "src/ui/sprint_button.ts"
  - "src/game/monsters.ts"
  - "test/game/monsters.test.ts"
  - "src/game/lures.ts"
  - "test/game/lures.test.ts"
  - "src/game/snares.ts"
  - "test/game/snares.test.ts"
  - "src/ui/tool_buttons.ts"
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
  when that is shorter by REVERSE_MARGIN 1.5 (the param minoTurnBack
  since K324 stage 1). THE TAILS ARE A SANCTUARY:
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
  and HUNT_PACE_FRACTION 0.7 (0.9 since K324 stage 1, the entry below).
  ChaseParams stays in u/s: url_state.ts's
  chaseParamsOf multiplies, so one playerPace edit scales the chase, and
  0.5 x 10 and 0.7 x 10 are exactly master's 5 and 7 in doubles (the
  default chase replays K80's tick for tick: minotaur.test.ts's
  K80_DIGESTS; K324 stage 1's stops and 0.9, exactly 9, re-froze them).
  Links are not clamped: a K80 probe link's `mhp=25` now
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
  stage 2; `.claude/probes/K80/turns2/rt/`), and again at 9ccf360 (K637;
  the main checkout's `.claude/probes/K637/results.md`): pull 0 / 0.25 /
  0.5 / 0.75 / 1 gives a greedy player 2.19 / 2.38 / 2.50 / 2.93 / 3.25
  catches; the fleers escape 50-55% (75-78% with queued taps), so 0.5
  still holds. The rise from 1.66 at pull 0.5 is K74 stage 3's trap-zone
  finish (9ccf360: the exit corridor about +0.62, the away flank +0.22,
  the H1 guard +0.13), intended; the harness is ruled out. minotaur.test.ts's
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

- JUNCTION STOPS AND THE PLAN (K324 stage 1, 2026-10-20; brief
  docs/design/K324_s1.md, whose Handoff holds the full tables; design
  docs/design/K324_realtime_minotaur.md 2.2, 2.3, 3.1-3.4, 4.2). Real
  time only: the turn clock is untouched (TURN_GAMES, LENGTH_GAMES held).
  STOPS: it stops at EVERY junction it reaches, never at a dead-end tip,
  for stopMin..stopMax s (minoStopMin / minoStopMax, 0.2 / 0.6;
  chaseParamsOf plays the max at least the min), huntStop x that while it hunts
  (minoHuntStop 0.5). The draw is a COUNTER stream (`TurnRng` from
  minotaur_turns.ts on seedMix(seed), indexed by the chase's junction
  `arrivals`), never the sequential rng, so a stop shifts no roam draw.
  `hold` = ticks of stop left. A long stop (pauseChance, mode "pause")
  replaces the junction stop; spotting you never cuts a junction stop
  short, though it still cuts a long one (q4). Stops 0 / 0 = none (commit
  1 shipped the machinery at zero with K80_DIGESTS unchanged). PICK ON
  ARRIVAL (q7): a roaming leg picks its next destination as it arrives,
  before the stop, so plan() can show it. CAVEAT: that pick draws from
  the sequential rng at once, so a pick a spot or a catch discards during
  the stop still advanced the rng; design 2.3 / 3.3's claim that the draws
  are unchanged is inexact (replays stay exact). CONSTANTS TO PARAMS:
  REVERSE_MARGIN -> minoTurnBack (`turnBack` 1.5), the roam window's
  roamRange / 4 -> minoRoamNear (`roamNear` 0.25), the tip reach ->
  minoTipReach (`tipReach` 2, x roamRange); the defaults are the old
  values. plan(reach): read-only, the next `reach` runs of its route
  (PLAN_REACH_MAX 8) as ChasePlan `{lead, steps: [edge, farVertex][],
  dest, hunting}`; empty in the lair until its last LAIR_TELL 0.5 s.
  minoTelegraphRuns (`mtn`, 1) is the reach stage 2's telegraph will draw;
  it is inert until then. HUNT PACE 0.7 -> 0.9 (q3: keep the catch rates
  the stops cost). MEASURED on K80's real-time sim (copied, fixed, to
  `.claude/probes/K324/rt/`; 288 H1 mazes x 3 reps, pull 0.5; catches a
  game / % of hunts escaped): baseline bcd907c (no stops, 0.7) greedy
  2.50 / 6%, fleer 0.86 / 50%, queued fleer 0.51 / 75%; with stops, hunt
  pace 0.7 / 0.8 / 0.9 / 1.0: greedy 1.95 / 2.20 / 2.61 / 2.68, fleer
  0.43 / 0.51 / 0.72 / 1.28 (escapes 79 / 73 / 55 / 29%), queued fleer
  0.39 / 0.42 / 0.43 / 0.46 (83 / 81 / 79 / 76%). At 0.9 the greedy solve
  median is 83.1 s (80.8 baseline); the queued fleer keeps about 4 points
  more escapes at any pace. 0.9 departs from the brief's fallback ("leave
  the default"): a call for Levi; reverting is one constant and its pins.
  The still-player test reads 69.1 s at pull 0, 48.8 s at pull 1 (ratio
  0.71, bound 0.8). TESTS: minotaur.test.ts's K324 block (ranges and no
  tip stop, a long stop replaces, a zero stop costs no tick, spotting
  keeps a junction stop, replay, the lair plan, roaming and hunting plans
  against the runs walked). PINS MOVED: K80_DIGESTS (twice), the paces
  test, url_codec.test.ts's defaults table and paces case, the codec
  table pin; held: the golden dailies, K87, byte_identity. HOOK:
  `__knotChase()` adds `hold`, `holdSeconds`, `arrivals`, `plan`
  (plan(minoTelegraphRuns)) and `plan8`. PAGE CHECK:
  `.claude/probes/K324/k324_page.mjs <base> [outDir] [seed] [secs]` wraps
  the live chase's step and records every tick (60 s unseen: 29 arrivals,
  18 stops of 24-70 ticks, 11 long stops, a tip held 0, no stray motion).

- REAL-TIME GUARD AND STALKER (K324 stage 3, 2026-10-20; brief and
  Handoff docs/design/K324_s3.md, which hold the full tables; design 8;
  the module header's THE MODELS). The Behavior row (`minotaur`) picks
  real time's model too (ChaseParams.model). THE HUNTER is stage 1's
  chase, byte-identical (K80_DIGESTS unchanged), and reads none of the
  new knobs. THE GUARD roams only its TERRITORY (`territory()`, cached
  per value): home = the exit tail's junction; a vertex is in within
  `territory` u of home along the threads (radius = territory, or home's
  shortest run out when longer), a run when its farthest point is
  ((d[a] + d[b] + len) / 2 <= radius, so the territory is connected).
  Roam destinations are territory vertices (here, home, start and exit
  excepted; tips with chance deadEndBias, roamPull as the hunter's); a
  guard routes along territory runs only while both it and its
  destination are in (`territoryRoute`), so one caught or left outside
  walks the shortest way back. TERRITORY CONVERSION: the turn guard's 6
  runs x about 5 u a run = 30 u. It spots you within guardDetect and
  loses you beyond guardLose (its own sight, wherever you are; lose kept
  >= detect); hunting, each junction takes the best run with chance
  guardAccuracy, else a random one; lost, it checks where it last saw
  you, then roams home. THE STALKER has no destinations and no long
  stops (junction stops apply): while it sees you (you off the tails)
  each junction aims with chance stalkerAccuracy, else a random run;
  unseen, a random run, never back the way it came while it has another.
  Within the hunter's shared sight (detectStart / detectEnd) it CHARGES:
  mode hunt, approachPace, still at chance accuracy. Its "hunt" is that
  charge only, so a stalker closing in at wander pace reads "wander" in
  the HUD and the glow. DECISIONS: the guard's hunting steps and every
  stalker step draw from a second counter stream (aimRng on seedMix,
  indexed by `decisions`; three draws: aim, random run, the stalker's
  leg pace), never the sequential rng, so plan() reads them ahead
  (decideFrom at decisions + i) and a hunt turns back mid-run only after
  an aimed choice (`aimed`). DEFAULTS (CHASE_MODEL_DEFAULTS, K294's shape
  beside TURN_MODEL_DEFAULTS since the units differ): guard territory 30,
  detect 20, lose 30, accuracy 0.4; stalker accuracy 0.45. The straight
  sight conversion (30 / 40, twice the hunter's as the turn guard's 4
  runs are twice its 2) kept a player hunted most of a solve. MEASURED
  (stage 1's sim, 288 H1 mazes x 3 reps, pull 0.5; catches a game / %
  of hunts escaped; greedy, fleer, queued fleer): hunter 2.61 / 5%,
  0.72 / 55%, 0.43 / 79%; guard 2.49 / 56%, 0.78 / 89%, 0.86 / 89%
  (hunted about 25-28 s a game); stalker 2.72 / 48%, 0.56 / 88%, 0.50 /
  89%. The first guess (guard sight 30 / 40, accuracy 0.7; stalker 0.7)
  caught the greedy player 6.4 and 6.3 times; the territory barely
  matters (20 / 30 / 45 u: 7.2 / 6.4 / 6.3 at 0.7). PARAMS: five numbers,
  codec 185-189 (gameplay-links.md), LIVE_EFFECTS under onChaseChange;
  rows: gameplay-panel.md. TESTS: minotaur.test.ts's "K324 stage 3"
  block (the hunter reads no model knob; MODEL_DIGESTS pin both models
  tick for tick; replayChase per model; a roaming guard stays in or
  walks back; accuracy as a rate; the stalker's sight and charge; plans
  equal the runs walked, unseen and tracking). HOOK: `__knotChase()`
  adds `model` and `decisions`. PAGE CHECK:
  `.claude/probes/K324/k324_page_s3.mjs <base> <model> [outDir] [seed]
  [secs]` (env PHASEB=walk|stand; `run_s3_page.ps1` runs specs
  `model:phase:seed` under the perf lock): every model held its stops,
  stood still through them and planned validly on every tick, with no
  page errors (the Handoff has the runs).

## The turn-aligned minotaur

- TURN-ALIGNED MINOTAUR (K80 turns stage 1, 2026-10-14;
  game/minotaur_turns.ts, brief docs/design/K80_turns.md). `minotaur`
  (`mt`) = hunter (the default since 35f3ec2, K534) | guard | stalker
  (K323 removed off); `gameMode` decides whether a minotaur plays at
  all. Stage 1 read it on the turn clock only; since K324 stage 3 real
  time plays the same three models with its own rows (REAL-TIME GUARD
  AND STALKER above), and each clock's panel hides the other's rows. AN
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
  its lair first. A CATCH is decided at the tap that makes it: the model
  counts it, puts you at the start and it in its lair (lifeTurn 0) and
  re-commits at once. The page SHOWS it at its contact moment (K546
  stage 1, as by length does; TURNS BY LENGTH below): the move or wait
  plays on until the two markers meet, then turnCaught stops the move,
  respawns (re-fog under minoRefog), clears the yarn, bumps the HUD's
  caught row and toasts "Caught! Back to the entrance.". Until K546 a
  runs catch did all of that at the tap, cancelling the move with the
  two still apart (stage 1 animated no catching move). Display: lair
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
  0.3, the stalker `minoStalkerAccuracy` 0.45 (0.3 since K421, below),
  while the hunter keeps
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
  criterion would keep 0.25-0.3. K421 (2026-10-20) CLOSED IT: Levi set
  `minoStalkerAccuracy` back to 0.3 (0.45 caught 27.9% at 80% against a
  20% target); only PARAM_DEFAULTS and `turnMinoDefaults` read the row,
  so the stalker rows of TURN_GAMES (all six) and LENGTH_GAMES (four of
  six; maze 42's hold) re-froze and the hunter and guard rows held.
  PIN: test/game/minotaur_turns.test.ts
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
  games, 0 trace mismatches (`compare_length_8.md`). STAGE 2 (the
  page, 2026-10-16): the `minoByLength` toggle (`mbl`, codec 156, off,
  not daily-exempt) among the turn rows, live by `setConfig`. K501's
  TRAVEL SCALE: travel = factor x your length x
  `BY_LENGTH_TRAVEL_SCALE` 0.65, a code constant (no panel row), tuned
  on the turn sim toward today's nine-cell rates (totals 41.4 at 0.65;
  hunter 9.9 and stalker 8.8, their best, the guard alone preferring
  0.85; `.claude/probes/K481/sweep_scale_32.md` + the fine sweep), so
  `LENGTH_GAMES` pins at the shipped config and `TURN_GAMES` stays
  bit-identical with the toggle off. The catch SHOWS at its contact
  moment: the turn keeps its route and records `lastContact`
  (`lengthContactFraction`, the earliest fraction at the catch
  distance); the game state catches at the tap, the page defers the
  burst (on the contact spot), the fog lift (`stopMove`) and the
  respawn until the move or wait animation reaches that fraction, on
  the same mid-move input gates as a runs move (Levi's 3b1612f
  correction). BY RUNS TOO since K546 stage 1 (2026-10-20, brief and
  handoff docs/design/K546_s1.md): `runsContact` gives a runs catch its
  `lastContact` (`lengthContactFraction` along the minotaur's path at
  the path's whole length, catch distance 0; t = 1 only as a fallback):
  a same-vertex or stand catch meets at t = 1, a head-on swap inside
  your run, a wait where its path reaches you, and the earliest zero can
  be an overtake before the case contact() named (accepted). The turn
  keeps `lastFrom` / `lastPath` for the animation (`catchRoute`,
  progress 0) until `setProgress` reaches 1 or `finishCatchAnim` ends it
  (`endCatchRoute`); contact() still decides, so TURN_GAMES,
  LENGTH_GAMES, K87 and the golden dailies held. One `pendingCatch`
  {tm, t, wait} serves both modes: the count is taken at the tap (the
  HUD subtracts the pending catch until it lands), and the toast, the
  HUD row, the burst (`minoSpotWorld(lastContact.player)`), the sound
  and the vibration come at the contact, with `stopMove` (an undeferred
  catch still cancels); a contact at t 0 lands on the next frame.
  MEASURED (`.claude/probes/K546/k546_page.mjs`,
  `?7&am=instant&snd=none&fw=0&phy=0&mt=stalker&msa=1&ms=0.35`, the
  four cases found by headless clones of the page's TurnMinotaur,
  replayed with a rAF sampler and in-page frame copies; JSON and stills
  in `out/runs/` and `out/length/` there): before (21e83cb) the burst fired on the tap's
  frame with the two markers 3.3-11.8 touching distances (2 radii)
  apart, 75-271 CSS px at 1400x900 and 30-109 at 411x753; now they meet
  first in all four cases at both sizes, 0-0.08 of a touching distance
  apart on the frame before the burst (under 2 CSS px), the burst
  within 0.06 world of both, after 32 (head-on, t 0.5) to 342 frames of
  travel. A by-length catch (`&mbl=1`: 9 taps, t 0.71) is unchanged:
  225 frames to the burst on both builds and a byte-identical burst
  frame.
  The first telegraph draws the route from where it
  stands with a tick ring at each choice's stop, the wait's included;
  hover and press lighting is stage 3. Probed at 1400x900 and a phone
  viewport (`.claude/probes/K481/out_stage2/`). STAGE 3 (K530, 2026-10-16;
  decision 7): hovering or pressing a choice lights its tick and moves
  the destination ring there (`mino_feedback.resolveTelegraphHover` /
  `telegraphTickLook`: the wait's tick in the wait zone, a multi-run
  tap's first run, a held key's pick; unlit ticks at 3b's roam 0.45 /
  hunt 0.95, a lit roam tick at hunt brightness, the others halved);
  with nothing hovered the route and ticks show alone. The phone
  (coarse or <=700 px) gets bigger ticks and the tint fallback: a
  choice that would get you caught (`TurnTelegraph.stops[].caught`,
  the exit winning first, the start never a catch) tints red at the
  head - at fit zoom the ticks alone are a few px near the minotaur,
  far from the eye, as 3b's roam alpha already was (K525). Same-state
  A/Bs (clocks pinned): toggle off 0 px desktop and phone, by-length
  idle 0 px desktop, phone idle 403 px (the bigger ticks only);
  evidence `.claude/probes/K481/stage3/`.

- TURNS STAGE 3b (2026-10-16; sections 2.7, 2.8, 2.10): the telegraph draws one stroke a run with `mino_feedback.telegraphAlphas` (roam 0.45, hunt 0.95, later runs half; the ring follows the first), route-shaped for K324 stage 2 to reuse; the chevrons still wait for it. A catch records `TurnMinotaur.lastCatch` (player and minotaur vertices, both travel modes) and main.ts bursts a red ring (`showCatchBurst`/`tickCatchFx`, static under reduced motion) where the two meet, `minoSpotWorld(lastContact.player)` (by runs since K546; at the tap, on lastCatch's vertices, before), plucks the caught run an octave down plus its semitone neighbor, and vibrates 60 ms. K270 DIAGNOSED: `turnCaught` updated the controller but left the minotaur layer showing its pre-catch telegraph and glow at the site until the next frame's `syncMinotaur` — over the pink/lavender threads that stale red frame read as a lavender band; `turnCaught` now re-syncs in the same call. Sounds (`mino_feedback.turnCue`): a growl (two low plucks) on the turn it first sees you, a heartbeat double pluck ending within two runs, else a footstep per run walked, strength fading to 0 at 6 runs; no pan (KnotSynth has none). Fog (2.10): when `minoFog` keeps it hidden under fog of war, only its glow bleeds through at `MINO_FOG_BLEED_ALPHA` 0.16, over the fog, with no marker or telegraph. Tests: `test/game/mino_feedback.test.ts`. Sheet: `.claude/probes/K80/stage3b/contact_sheet.png` (desktop + emulated phone; the real-phone sheet waits for a phone window).
- TELEGRAPH LOOK (K525, 2026-10-20; brief and handoff
  `docs/design/K525_telegraph.md`): `minoTelegraphLook` (`mtl`, rims |
  line | both, default rims; gameplay-links.md) picks how the turn
  telegraph draws. RIMS (the new default) light both edges of each run on
  the route in red through the ribbon shader, as the hover glow does
  (render-paint.md's TELEGRAPH RIMS): roam 0.6, roam on a coarse pointer
  0.8, hunt 1 (`telegraphRimStrength`), later runs at half. LINE is 3b's
  stroke, whose roam alpha is 0.7 on a coarse pointer since K525
  (`telegraphAlphas(hunting, runs, coarse)`; desktop 0.45, hunt 0.95).
  BOTH draws the two. The destination ring and K481's ticks draw in every
  look: the ring at the first run's line alpha (so 0.7 roaming on a
  coarse pointer too), the ticks at K481's alphas. The fabric renderer
  holds the look
  (`fabric.telegraphLook`, set by scene.ts and live by the panel);
  drawTelegraph skips the strokes under rims and the pieces under line.
  The fog's bleed shows no telegraph in any look.
- REAL-TIME TELEGRAPH (K324 stage 2, 2026-10-20; brief and handoff
  `docs/design/K324_s2.md`). With `minoTelegraph` on, main.ts's tickChase
  hands syncMinotaur `chase.plan(minoTelegraphRuns)` (read-only: no
  digest moved), and `chaseRoute` (`render/telegraph_route.ts`) turns the
  ChasePlan into the route drawTelegraph draws, in all three looks:
  - the LEAD, the partial run from the minotaur's spot to the end it
    walks toward (dropped when empty, at that end);
  - then the whole runs;
  - then the ring, only when `dest >= 0`: a plan that stops short of its
    destination (reach, or a hunter tracking you) has none.
  - In its lair: nothing until the last LAIR_TELL (0.5 s) of its wait,
    then the exit tail's first run (plan() already did this, 2.1).
  - ALPHAS, rule (B): the lead AND the first whole run after it at the
    look's alpha, every later run at TELEGRAPH_LATER_SHARE (0.5); roam
    and hunt as on the turn clock (`telegraphRimStrength`,
    `telegraphAlphas`). Rule (A), the lead counting as the first run, is
    a two-place flip: `first = false` once telegraphPieces pushes the
    lead's piece, and the line look's `alphas[s + 1]` when there is a
    lead.
  - The lead's moving end rides a uniform (K654; render-paint.md's
    TELEGRAPH RIMS), so a walking minotaur rewrites KPAINT only when its
    route changes.
  - HIDDEN THREAD (K652, K271): under the thread reveal the line look's
    strokes, its ticks and the ring skip thread the reveal hides, on
    both clocks (`teleShown`: `exploreVisAt` >= TELE_VIS_MIN 0.5;
    `teleStroke` bisects a stroke's edge TELE_VIS_BISECT (6) times). The
    rims already drew nothing there.
  - The telegraph's panel rows show on both clocks (gameplay-panel.md).
  - MEASURED (desktop RX 6800 XT, perf lock; `.claude/probes/K324/`
    `k324_page_s2.mjs`, `run_s2_page.ps1`, results in `out_page_s2/`).
    plan() costs 0.005-0.007 ms a frame on average (the 0.2 ms max is
    timer granularity; budget 0.05), and syncMinotaur 0.042-0.045 ms
    against 0.015 with the telegraph off. Texture uploads rise 3-5 row
    calls/s (135 against 129) and 2-3% of row bytes. Over a perfq run
    KPAINT was rewritten 0.9 times a second, and the riding end moved on
    15 frames a second (each one a KPAINT rewrite before K654, now only
    the uniform). A catch hides the telegraph in the same call (K270
    holds). NO FLICKER, so no hysteresis: 0 next-run changes in 1.6 s of
    hunting on the page, and headless (`flicker/flicker.ts`, K174's
    players on 48 seeds, reach 1) 0.14 changes per hunting second over
    1802 s, 10 of them straight back, one under 0.1 s apart (a 2-tick
    blip).
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

- LIVES (K137 stage 3a, 4.32, 2026-10-20; brief and handoff
  `docs/design/K137_s3a.md`). Both clocks, free play. `lives` (`mlv`, 0
  off, 1..5; game/lives.ts, pure: `catchHeart` returns off | spent |
  restart). main.ts keeps `heartsLeft` / `heartsOf`: `restartChase`
  refills them (so the scene build, every level restart and a Reset path
  do), and `syncHearts` refills them when the setting changes. A catch,
  where it lands (tickChase's "caught" event; `turnCaught`, at contact),
  takes one heart and does today's respawn with the toast "Caught! N
  hearts left."; the catch that takes the last restarts the level
  (`restartSolve(true)`, the tallies carried as under minoRestart) with
  every heart back and the toast "Out of hearts! Starting over.". Off,
  minoRestart decides as before; on, minoRestart is ignored (its row
  hides). Rows: the HUD and the win banner show "hearts L / N" after
  "caught" (maze_stats STATS line); the share title adds "❤️ L left"
  after the minotaur's tag. Hook: `hearts` ({left, of} or null) in
  `__knotChase()` and `__knotTurnMino()`. Not checked on a page yet (the
  handoff). Call 2 (Levi's): a catch under lives returns you to the
  entrance; the alternatives are the last junction or a checkpoint.

- BROKEN RUNS BLOCK IT (K137-b, stage 3a, 2026-10-20; the brief's Design
  section). With fragile runs or collapse on (`fc.fragileOn`: any run can
  break), the minotaur treats a broken run as a wall on both clocks. It
  counts its own crossings from the controller's limits
  (`setBreakLimits(fc.breakLimits)` in main.ts `restartChase`, null when
  nothing can break), one per accepted player run: the turn clock
  in `TurnMinotaur.turn(edge)`, real time at the player's `depart` in
  `movePlayer`, so `replayChase(..., limits)` rebuilds the blocked set
  with no controller. Turn clock: `TurnGraph(walk, blocked)` skips blocked
  runs (`UNREACH` 32767 while anything is blocked), `moves()` skips them,
  a Spot on one goes only ahead; the turn already committed over the
  breaking move plays out (call 1: it finishes the run it is on) and the
  next `commit()` routes around. Real time: `ChaseGraph.block(eid)`
  (restricted searches skip it, cache cleared); roam, the guard's
  territory, random, stalker, aimed and plan() choices skip blocked runs;
  a player on a blocked run is hunted at the vertex it leads to. CONTACT
  stays the unrestricted thread distance, so a real-time catch "through"
  a broken run is possible (a residual). Off (nothing breakable), both
  minotaurs are bit-identical: K80_DIGESTS, MODEL_DIGESTS, TURN_GAMES and
  LENGTH_GAMES held. Tests: `test/game/k137b_block.test.ts`.

- THE SWORD (K137 stage 3b, 4.7, 2026-10-21; brief, Design section and
  Handoff `docs/design/K137_s3b.md`). Both clocks, free play. `sword`
  (`swd`: off | timed | oneuse) and `swordMoves` (`swm`, 4..20, default
  8); game/sword.ts (pure) holds where it lies and its state, shared by
  both clocks.
  - WHERE (`swordSpot(g, seed, avoid)`): a vertex 4-8 runs
    (SWORD_RING_MIN..MAX) off one shortest start-exit route (run hops
    from its vertices, a multi-source BFS; route ties to the lowest run
    id), never the start, the exit or either tail's junction, and clear
    of the lair: 1 hop around the exit tail's junction for the hunter
    and the stalker, the guard's territory for the guard (minoTerritory
    hops on the turn clock, minoGuardRoam u in real time). Dead-end tips
    first, else junctions, sorted by vertex index, one drawn from its
    own counter stream (TurnRng on seed xor "SWRD"), so no other draw
    shifts. None in range: no sword. main.ts `laySword` lays it in every
    `restartChase` (the scene build, a level restart, a Reset path), on
    whichever clock plays.
  - STATE (`SwordState`: phase ready | fleeing | used | slain, left,
    takenAt, slainAt, banished): arriving on the spot takes it. While it
    flees a touch is no catch: timed banishes it to its lair and spends
    the sword (used); one use slays it (slain: no turns, contact or
    sight for the rest of the attempt, and its layer hides). At left 0
    the sword is spent (used) and it plays on from where it stands.
  - TURN CLOCK (`TurnMinotaur`): the pickup turn already flees (left =
    moves - 1 after it), and each later accepted move spends one, a wait
    included. The committed move is re-decided at the pickup, so the
    telegraph shows the reversal. A flee hop (`fleeHop`) takes the move
    whose far end lies farthest from you in runs (one a broken run cuts
    off counts farthest), ties to the lowest run id, no draw; at a
    vertex it holds when every move would close in. It forgets its hunt
    and roam (mode 0), so it comes out of the flee roaming; the speed
    applies, charge does not. By length, `planFleeLength` chains flee
    hops over the scaled travel in planLengthRoute's shape, so
    realizing, contact and the ticks read it unchanged. A banish counts
    its sleep from that turn.
  - REAL TIME (`MinotaurChase`): the pickup turns it round on its run
    (Pac-Man) and ends any stop and any hunt; left starts at `moves` and
    falls per run you walk (s3a call 3, as built: counted as each run
    ends). It flees at wanderPace with no stops and no sight, never
    turning back mid-run; at each vertex `fleeEdgeFrom` takes the run
    whose far end is farthest from you by thread distance (ties to the
    lowest id), and it holds when every run closes in. A banish puts it
    in its lair for `wake` s. plan() returns the flee route
    (`fleePlan`), so the real-time telegraph shows it.
    `replayChase(..., sword)` rebuilds it from the taps. Events:
    `{kind: "sword", what: taken | banish | slay | spent}`.
  - LOOK (render-markers.md's THE SWORD MARKER): the sword glyph at its
    spot until taken; while it flees, its glow, the telegraph's strokes,
    ring and ticks, and the rims are FLEE_BLUE 0x8fd0ff instead of red
    (s3a call 4, pale blue as built; the walker never shares a game with
    the minotaur, so the rims' `teleColor` is free). Toasts: "You have
    the sword! It flees.", "Banished to its lair!", "Slain! The maze is
    yours." and "The sword is spent.". Rows: "sword" in the HUD and the
    win banner (ready / N left / used / slain on move N; maze_stats
    STATS), and the share title's "⚔️ on move N" (the pickup move).
    Hooks: `sword`, `fleeing` and `slain` on `__knotChase()` and
    `__knotTurnMino()`.
  - OFF: no sword object and no draw, so K80_DIGESTS, MODEL_DIGESTS,
    TURN_GAMES, LENGTH_GAMES, K87, the golden dailies and byte identity
    held. Tests: `test/game/sword.test.ts`. PAGE CHECK:
    `.claude/probes/K137/s3b/sword_page.mjs` (probes.md, K137 stage 3b)
    on seed 7: the desktop on turn oneuse 20 and timed 8 and realtime
    oneuse 8 and 20 and timed 8, and a phone viewport on both clocks at
    oneuse 20, all passed: the pickup on move 12 and its toast, the HUD
    rows, the pale blue ink and red again once spent, a slay on move 25
    that hides the layer (turn, both viewports, and desktop real time;
    the phone's real-time flee ran out first, spent), the moves left
    only falling, no page errors.

- SPRINT (K137 stage 3c, 4.29, 2026-10-21; brief and Handoff
  `docs/design/K137_s3c.md`, design `docs/design/K137_s3b.md`'s "Sprint
  (4.29)"). Both clocks, free play, once per attempt: `sprint` (`spr`: off
  | on). game/sprint.ts (pure) holds the state machine and the key; the
  clocks hold the mechanics.
  - TURN CLOCK (`TurnMinotaur`): two player moves make one minotaur
    turn. The first is a SKIPPED turn (`turn(edge, {sprint: "skip"})`,
    private `skipTurn`): the minotaur stands, `turns` and `lifeTurn`
    stay, contact is checked against where it stands, and `skips` records
    the move's index in `inputs`; a wait cannot start a sprint, and a
    second skip is rejected while one is pending (`sprintPending`). The
    next move plays the turn. BY LENGTH that turn travels for half the
    pair's summed length (`pairLen`; s3a call 5, as designed), so a
    sprint halves its travel per move. `replayTurnMinotaur(..., skips)`
    rebuilds it. The sword's `takenAt` / `slainAt` count minotaur turns,
    so after a sprint they read one less than the player's moves (a
    residual).
  - REAL TIME (`MinotaurChase`): `sprint()` arms the NEXT two departures
    at twice playerPace (`sprintLeft` 2; `sprints` records the tick,
    apart from `inputs`); in movePlayer a departure with `sprintLeft > 0`
    spends one and runs sprinted (`rem * 2` while on the run, `toEnd /
    2` at its end: exact, K108). `sprintActive` and `playerSpeed` read it
    (the dot's pace). A catch clears both (spent). Rejected while armed or
    running, or once finished. Pressed before the first move it records
    tick 0 (the chase does not tick before the first tap).
    `replayChase(..., sprints)` re-arms it at each recorded tick, after
    that tick's taps.
  - STATE (main.ts `sprintState`, game/sprint.ts `SprintState`): ready |
    armed | first | used. `sprintToggle`: ready arms; armed disarms on
    the turn clock before its first sprinted move (real time spends it at
    once, no disarm). `sprintAfterMove(s, run)` after each accepted turn
    move: armed + a run is the skip (first, or used on a catch or win);
    first goes to used; an armed sprint stays armed through a wait but a
    catch spends it. Every `restartChase` gives it back (the scene build,
    a level restart, a Reset path, the last heart, minoRestart:
    "starting over"); a catch while armed or mid-sprint spends it.
  - INPUT: the lightning button (ui/sprint_button.ts, bottom left at the
    scissors' spot: K114's cut is the classic game's and the walker's,
    never a chase's, so the two never show together; Hint and Chalk sit
    60 px above; class `km-control`; gold while armed, dimmed when it
    cannot act; shown while the keys are live and the panel is closed)
    and the key F (`sprintKeyOf`, by `key`; app/input_keys.ts). Not Q:
    WASD reads by code, so AZERTY prints Q where A moves.
  - ROWS: "sprint" in the HUD and the win banner (maze_stats STATS:
    ready / armed / 1 more move / running / used; `sprintValue`), and the
    share title's " · ⚡ used" (share_text `sprintUsed`).
    Hooks: `__knotSprint()` (press), and `sprint`, `sprintShown`,
    `sprintLeft`, `sprintActive`, `sprints` on `__knotChase()`; `sprint`,
    `sprintShown`, `skips`, `sprintPending` on `__knotTurnMino()`.
  - OFF: no state, no button, no row, so K80_DIGESTS, MODEL_DIGESTS,
    TURN_GAMES, LENGTH_GAMES, K87, the golden dailies and byte identity
    held. Tests: `test/game/sprint.test.ts` (the state machine, both
    clocks on hand-built graphs and real mazes, replays, by length) and
    the stats and share tests. PAGE CHECK:
    `.claude/probes/K137/s3c/sprint_page.mjs` (probes.md, K137 stage 3c)
    on seed 7, desktop and 411x753, each clock: all passed (a real click
    and the real F key, the gold armed look, the turn clock's standing
    minotaur then one turn, real time's doubled pace for two runs, the HUD
    rows, used after, no page errors).

- SLEEPERS AND THE FOLLOWER (K137 stage 3d, 4.9 and Levi's follower,
  2026-10-21; brief and Handoff `docs/design/K137_s3d.md`, design
  `docs/design/K137_s3b.md`'s "Decided" 1-3). MORE THAN ONE MONSTER, on the
  TURN CLOCK only: `sleepers` (`slp`: 0 off, or 1..SLEEPERS_MAX 3) and
  `sleepKind` (`slk`: wake | follow | both). game/monsters.ts (pure) lays
  them and states the rules in its header; `TurnMinotaur.extras`
  (minotaur_turns.ts `extrasTurn`, `extraCatch`, `extrasOnCatch`) plays
  them. Real time has no extras yet, and the panel hides both rows there.
  - WHERE (`sleeperSpots`, `monsterSpecs`): distinct junctions 1-3 runs
    (SLEEPER_RING_MIN..MAX) off one shortest start-exit route (sword.ts's
    BFS). Never the start, the exit or either tail's junction, never within
    one run of the entrance's junction, clear of the lair as the sword is
    (`avoid`: one hop, a guard's territory) and off the sword's spot. They
    are drawn without replacement from their own counter stream (TurnRng on
    the seed xor "SLPR"), so no other draw shifts; with fewer candidates
    than asked, fewer monsters. KINDS (`monsterKinds`): wake (all
    sleepers), follow (all followers), both (alternating, the first drawn
    on that stream). Each monster draws from its own stream (`monsterRng`:
    the seed xor "MNST" xor a per-index hash) at the game's turn. main.ts
    `layMonsters()` runs in every restartChase, after the sword is laid.
  - A SLEEPER wakes when you walk a run that touches its junction (onto it
    or off it; `woken++`). It neither moves nor catches on that move. Awake,
    it hunts as the minotaur does: `decide()` with `extraConfig` (the
    hunter's policy, prox, at the minotaur's pace, sight and accuracy; no
    telegraph, sleep, territory or pull), deciding from where you stood, as
    the telegraph has the minotaur do.
  - A FOLLOWER does not wake when you pass. Leaving its junction sets it
    off ("waiting"): FOLLOW_DELAY 1 or 2 moves later (drawn per follower)
    it appears there and walks your trail, a run a turn (`followStep`). At
    each junction there is a FOLLOW_SHORTCUT 0.25 chance that it steps
    along its shortest route to you instead; it rejoins your trail where it
    lands on it. While waiting it cannot catch. You at the entrance: it
    loses you, walks home and sleeps again. THE HARSH FOLLOWER (call 3): a
    wait or a backtrack while it is a run behind is a catch, and so is
    walking back onto its junction on the move its wait ends.
  - ORDER AND CONTACT: each extra plays after the minotaur's part of every
    accepted move, by the minotaur's contact rule (`contact`). A sprint's
    skipped move stands them all (`extrasTurn(..., stand)`). By length
    they still step a run a turn. They ignore the sword: they neither flee
    nor die.
  - A CATCH by any monster is the minotaur's catch (s3b call 1, rec):
    `catches++` and `lastCatcher` (-1 for the minotaur, else the extra's
    index); you go to the entrance, the minotaur to its lair (or stays
    where it stands, lair off), and every extra home, asleep
    (`sleepExtra`). The turn returns `caught`, so main.ts's catch path
    (hearts, minoRestart) runs unchanged, and the toast names an extra
    catcher (`catcherOf`): "Caught by a sleeper! Back to the entrance.",
    "Caught by a follower: 2 times now. ...", and with hearts on "Caught
    by a follower! N hearts left." (the minotaur's toasts are unchanged).
    No telegraph for the extras (s3b call 2, rec).
  - ROWS: "woken" in the HUD and the win banner (maze_stats STATS: the
    sleepers woken this attempt; a follower setting off does not count),
    and the share title's " · 😴 N woken" (share_text `woken`), both only
    while a sleeper-kind monster is on (main.ts `wokenShown`). Hooks:
    `__knotTurnMino()` adds `monsters` ([{kind, phase, spot, at, home,
    trail}]), `woken` and `lastCatcher`.
  - OFF (sleepers 0, so every daily): no extras, so K80_DIGESTS,
    MODEL_DIGESTS, TURN_GAMES, LENGTH_GAMES, K87, the golden dailies and
    byte identity held. Tests: `test/game/monsters.test.ts` (placement,
    kinds and delays; sleepers and the follower on hand-built graphs; an
    empty list plays every model as before; the minotaur's turns do not
    change with extras until one catches; replays from the taps) and the
    stats, HUD and share tests. PAGE CHECK:
    `.claude/probes/K137/s3d/monsters_page.mjs` (probes.md, K137 stage
    3d): desktop both/2 seed 7, wake/3 seed 11 and follow/2 seed 5, and
    411x753 both/2 seed 7 and follow/1 seed 3, all passed with real clicks.
  - RESIDUALS (the Handoff): the extras snap home asleep after any catch;
    K481's by-length tint ignores them; no off-screen indicator; minoFog
    "hunting" keeps them under the fog; saved attempts do not cover them;
    SLEEPER_GRACE_S waits for the real-time port.

- LURES AND SNARES (K137 stage 4, 4.10 and 4.30, 2026-10-21; brief and
  Handoff `docs/design/K137_s4.md`). Two TOOLS on the TURN CLOCK, each a
  stock per attempt that a level restart refills (main.ts `luresLeft`,
  `snaresLeft`): `lures` (`lur`, 0..LURES_MAX 5) and `snares` (`snr`,
  0..SNARES_MAX 3). game/lures.ts and game/snares.ts (pure) state the rules
  in their headers; `TurnMinotaur.lure(edge)` and `setSnare(edge)` play
  them. Both are FREE IN TIME (no turn passes; s3b call 5's rec) and
  re-commit the next move, so the telegraph shows the result at once.
  Real time takes neither yet, and the panel hides both rows there.
  - A LURE plucks the tapped run (sound and overlay, `cutPluck` at 0.8)
    and uses one lure, heard or not. The minotaur (not fleeing the sword,
    not slain) and every SLEEPER within LURE_RANGE 6 runs of walk distance
    (the hop matrix, so a broken run's cut stops the sound) head for the
    run's end nearer to them by runs (`lureTarget`: ties to the lower
    vertex index, never the start or the exit). `decide()` and
    `decideLengthHop()` step toward it before the model's rules; at it, or
    cut off from it, the lure is spent and the model decides again. The
    minotaur forgets its hunt and roam (`mode` 0, `dest` -1), so a hunter
    lured away has to see you again. An asleep sleeper wakes (`woken++`)
    and comes. A FOLLOWER ignores lures (s3b's rec). A minotaur asleep in
    its lair (minoSleep) takes the lure as its destination but moves only
    once awake. `lure()` returns how many heard it (0: nobody, -1:
    refused), and main.ts toasts "Nothing heard the lure.", "Something
    heard the lure." or "N heard the lure.".
  - A SNARE goes on a run with an end at the head's junction, the run
    behind you included (`snareRuns`, `canSnare`), one snare a run for the
    attempt (a spent one included). By runs only: `setSnare` refuses by
    length, and the button and the panel row hide there. The first monster whose turn would
    step onto a set snare's run stops at its near end (`snareCut`,
    minotaur_turns.ts `cutAtSnare`: the committed path is cut there, and the
    snare springs when that move plays) and is HELD: it stands for its
    next SNARE_HOLD 3 turns, then the snare is spent. The telegraph
    previews the cut and shows an empty move while it holds. ANY monster
    springs it (the minotaur, a sleeper, a follower). A sprint's skipped
    move does not count toward the hold. A held monster still catches by
    contact (you walking onto it). A catch releases every holder: each goes
    home and its snare is spent (`releaseSnares`), as a banish does for
    its holder.
  - INPUT (ui/tool_buttons.ts, `km-control`): a lure button (a note) and a
    snare button (a loop with crossed tails) with their stocks, shown
    while each tool is on. A press, or L / N (by `key`), ARMS the tool, and
    the next tap on a run uses it (main.ts `toolTap`, the cut's pick
    `cutAt` with the touch radius); a second press, Esc or a tap off the
    runs puts it down. Arming a tool disarms the scissors (one armed thing
    at a time). A tool applies at once, even mid move (the turn already
    happened at the move's tap), and is refused while the maze is solved,
    a win or a catch waits, or that stock is spent. A refused snare toasts
    "A snare goes on a run at your junction, one to a run." and stays
    armed. A snare sprung since the last frame toasts "Snared! It stands
    three turns.". THE LOOK: a gold ring at the snared run's middle
    (fabric_maze_renderer.ts `syncSnares`, explicit polygons redrawn each
    frame while one is laid; heavier and filled while it holds, gone once
    spent; hidden where the reveal has not shown its point), a stand-in
    for a glyph that stays out of K138's glyph table.
  - ROWS: "lures" and "snares" in the HUD and the win banner (maze_stats
    STATS: left of the stock, "2/3"), shown while that tool is on, and the
    share title's " · 🎵 N lures" and " · 🪢 N snares" once used (share_text
    `luresUsed`, `snaresUsed`). Hooks: `__knotTurnMino().tools` (the two
    rows, `armed`, `shown`, the `laid` snares, `lured`, `heardBy`, and
    `tapEdge`: the run the last armed tap picked, -1 none),
    `__knotTool("lure" | "snare")` (a press, the button's and L / N's path),
    and
    `__knotFabric().cutPick(x, y, maxD)`, the run a tap at a screen point
    would pick (probes.md, K137 stage 4).
  - REPLAY: `tools` records each use before input `at` (inputs.length
    then), so a replay rebuilds the lures and snares between the taps.
  - OFF (lures 0 and snares 0, so every daily): `tools` and `snares` stay
    empty, no field is added (a monster's `lure` is absent until a lure is
    heard) and nothing draws, so K80_DIGESTS, MODEL_DIGESTS, TURN_GAMES,
    LENGTH_GAMES, K87, the golden dailies and byte identity held. Tests:
    `test/game/lures.test.ts` (targets, range, the cut stopping the sound,
    the hunt forgotten, sleepers woken, the follower and a fleeing or
    slain minotaur deaf, the telegraph, replays, the pins with no lure)
    and `test/game/snares.test.ts` (where a snare may go, the cut, the
    hold and its count, any monster, the sprint skip, a catch releasing
    holders, by length refused, replays), plus maze_hud.test.ts's rows.
    PAGE CHECK: `.claude/probes/K137/s4/tools_page.mjs` (probes.md, K137
    stage 4), hunter seed 7, lures 3, snares 2: desktop and 411x753 dsf
    2, every check passed with real clicks (the phone 3 of 3 runs once the
    probe aimed at a point `cutPick` confirms).
  - RESIDUALS (the Handoff): the "Snared!" toast fires as your move is
    accepted, before the monster visibly reaches the snare; the hover glow
    under an armed tool is the cut's pick, which can light a neighbour run;
    a live switch to by length keeps the laid snares, which then never
    spring; a follower's first appearance step is not snare-checked; by
    length clears a lure one hop later than by runs; L and N may clash
    with K138's keys;
    the ring is a stand-in (no glyph); real-time lures, snares and extras
    wait for `MinotaurChase`; no s3b sims for the tools; saved attempts do
    not cover them.

---
paths:
  - "src/game/minotaur.ts"
  - "test/game/minotaur.test.ts"
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
  the win banner (caught, chased). Reset path restarts the chase.
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
  strength and no slider. THE CEILING: a fifth of greedy solves end
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

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
  or with chance deadEndBias a dead-end tip; legs at wanderPace x
  (1 +- paceJitter), pauses pauseMin..pauseMax at its destination and
  with chance pauseChance at a junction it passes). HUNT: begins within
  detectStart and ends beyond detectEnd, both THREAD distance through the
  walk graph minus the two tails; it runs at approachPace on the shortest
  path to the player, re-planned every tick, and turns back mid-run only
  when that is shorter by REVERSE_MARGIN 1.5. THE TAILS ARE A SANCTUARY:
  barred to it, a player on either is unseen and uncatchable. A CATCH
  (catchDist) is a respawn, not a loss: the player goes back to the
  entrance (FabricMazeController.respawn: the path, yarn and trail follow
  an empty path; explored fog stays, true only since K100: before it a
  catch cleared the fog), the minotaur to its lair, the clock
  runs on; it counts in the HUD (the "caught N" row shows in real time
  even with stat rows off), a toast ("Caught! Back to the entrance.") and
  the win banner (caught, chased). Reset path restarts the chase.
  minoFog (shown only under fog of war) = when the minotaur shows THROUGH
  the fog: always (default, a decision for Levi) | hunting (only while it
  hunts) | never (only where the fog has lifted). Its off-screen
  indicator (#7a0c0c disc, the bull glyph) shows only once it has left
  the lair. The marker (a K83 marker wearing a placeholder bull) is
  markerRadius x 1.15 with a MINO_MIN_CSS_R 10 CSS px floor, over a red
  glow (dim in the lair, larger and full while it hunts), and like the
  exit marker waits for the intro to draw its thread. Live panel edits reach a running chase through
  setParams. CODEC: appended at 84-98 (clock, playerPace, the minotaur's
  paces, jitter and pauses, detect, lose, catch, deadEnds, roam, wake,
  minoFog; keys clk plp mwp mhp mpj mpc mpn mpx mdt mls mct mde mrm mwk
  mfg). A retune edits DEFAULT_CHASE_PARAMS (PARAM_DEFAULTS reads it) and
  url_codec.test.ts's defaults pin.
  `clock` is not a DAILY_EXEMPT_KEY: the dailies stay turn-based.
  DEFAULTS come from a headless simulation of 288 mazes with scripted
  players (`.claude/probes/K80/rt/`, results.md): only approachPace
  moved (8 -> 7). At the defaults a greedy
  player is caught 1.26 times a game (median 0; 51% never), a fleeing one
  escapes 53% of hunts (75% with queued taps); think time decides
  escapes, most catches are in dead-end pockets, and 45% of games never
  meet it. A player who hides on the entrance tail is often caught on
  walking back out: the minotaur pauses at that tail's junction. PROBE
  HOOKS: `__knotChase()` (state, events, counts), `__knotChaseTap(edge)`,
  `__knotChaseObj()`.

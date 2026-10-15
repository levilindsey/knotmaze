---
paths:
  - "src/game/fabric_controller.ts"
  - "src/game/daily_attempt.ts"
  - "src/render/fabric_maze_renderer.ts"
  - "src/render/fog_arc.ts"
  - "test/render/fog_arc.test.ts"
  - "test/game/fabric_controller.test.ts"
  - "test/game/daily_attempt.test.ts"
---

# Gameplay lore: the fog of war

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## The fog of war

- THE FOG RESETS ON A RESTART ONLY (K100 stage 1, 2026-10-14; brief
  docs/design/K100.md). The fog of war is Stage 25's (`fow`, radius `fr`;
  docs/history.md): a sprite over the maze with a hole at every explored
  stamp, the stamps at least FOG_STAMP_SPACING 0.8 world apart; since K99
  a move stamps fixed stations along its run (`render/fog_arc.ts`; the
  K83 PROBE LORE in probes.md). Levi, 2026-10-13: "The fog should reset
  when the maze restarts. But the fog shouldn't reset if we just
  backtrack to the start." Before K100 the renderer cleared the stamps
  whenever the path was empty, so a walk back to the entrance by hand, a
  daily's Reset path (retreatToStart, K47) and a K80 catch all wiped the
  fog, the catch against its own lore. THE SIGNAL:
  `FabricMazeController.restarts` counts reset() calls (the
  constructor's and replay()'s included: Reset path where
  resetPathAction says restart, restartSolve after a finish, a rebuild
  or a new design, a clock change, K80's Reset path), and
  FabricMazeRenderer.update() clears the stamps when it moves. Keyed on
  the event, not on the state it leaves: a level test (empty path, empty
  taps) misses a reset followed by taps before the next update(), which
  is what replay() does. reset() is also the only thing that empties
  `taps`, so the taps are everything explored: `exploredRuns(c)` =
  `[...c.taps]`, repeats kept (each pass stamps, as in live play).
  DIRECTION: a restore (`exploreRuns(runs, start)`) stamps each run as a
  live move does, its departure end and then fogArcStations in travel
  direction (`travelOrder` from the walk's start, through `moveEnds`,
  which beginMove shares); the pre-K100 restoreExplored stamped every
  run A -> B. A daily's Reset path jumps instead of animating, so main.ts
  explores the runs it retraced from the old head
  (`exploreRuns(retraced, depart)`), and the live fog is the one a
  restore of the same taps draws. A CATCH ends the move where the dot is
  (`stopMove`, not `cancelMove`, whose finishFogArc would uncover the
  part of the run the dot never reached). CONSEQUENCES: stamps only grow
  within a solve (the spacing filter checks the last stamp only: 33
  stamps four runs out, 64 back at the entrance), and the fog-fit camera
  (`fogVisibleBounds`) keeps framing everything explored after a
  backtrack. MEASURED (`.claude/probes/K100/`): on a static daily
  (`phy=0`, flow 0) a restore lays the live stamps exactly, before and
  after a reload; with physics, live vs a restore of the same taps on one
  page has fog IoU 0.977 (the A -> B rule 0.947; the same restore 1.2 s
  later 0.991), and 0.957 across a reload: live stamps land over seconds
  while the threads move, a restore's right after the intro. DAILIES
  have the fog off today (DAILY_V1 pins codec v3's defaults plus K74's
  overrides, and fogOfWar is not exempt), so the daily paths run only on
  a probe's fogged daily.

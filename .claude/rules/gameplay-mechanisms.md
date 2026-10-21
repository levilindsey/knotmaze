---
paths:
  - "src/game/fragile.ts"
  - "src/game/par.ts"
  - "src/app/rule_loss.ts"
  - "test/game/fragile.test.ts"
  - "test/game/par.test.ts"
---

# Gameplay lore: fragile runs and par (K137)

Written by K137 stage 1 (2026-10-20; brief `docs/design/K137_s1.md`,
design `docs/design/K80_gameplay_additions.md` section 4.3); `gameplay.md`
lists the area's other files. Params: gameplay-links.md's FRAGILE AND PAR
PARAMS; rows: gameplay-panel.md's FRAGILE AND PAR ROWS. The headers of
`fragile.ts`, `par.ts` and `src/app/rule_loss.ts` are the spec.

## Fragile runs

- THE RULE IS DATA (`fragile.ts`): every run has a LIMIT, the crossings
  it takes before it breaks (Infinity: never). A crossing is one
  completed move along the run, advance or backtrack alike. snap = 1 (it
  breaks after its first crossing), crack = 2 (it cracks after the first
  and breaks after the second). K139's collapse is meant to ride the same
  machinery (`breakLimits(walk, 1)`, or a table of its own).
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
  does not show them yet: showFabricWin belongs to the confetti lane.

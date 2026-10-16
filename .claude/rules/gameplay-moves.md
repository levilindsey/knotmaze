---
paths:
  - "src/ui/key_moves.ts"
  - "src/ui/move_pad.ts"
  - "test/ui/key_moves.test.ts"
  - "test/ui/move_pad.test.ts"
  - "src/ui/gamepad.ts"
  - "test/ui/gamepad.test.ts"
  - "src/game/route_plan.ts"
  - "test/game/route_plan.test.ts"
---

# Gameplay lore: moves by direction (K120)

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

- MOVES BY DIRECTION (K120 stage 1, 2026-10-14; ui/key_moves.ts,
  ui/move_pad.ts, brief docs/design/K120.md). THE PICK: a run's
  direction is the chord from the junction to the point KEY_REACH 0.5
  world units of arc along it, as the ribbons draw it (flow offset
  included; the camera only scales and translates, so world direction =
  screen direction). A key takes the run nearest its own direction within
  KEY_TOLERANCE 70 degrees; when the runner-up is within KEY_TIE 15 of
  the best the key is ambiguous and takes the one near-tied run no
  unambiguous key claims, else nothing (keyMap; K329's tie cycles below).
  A PRESS moves along its key's run at once (since K334, once the dot has
  arrived) through moveAlong / chaseAlong, so it IS a tap on that
  run to everything that records one (move log, saved attempt, stats, the
  chase's inputs); it may backtrack or win like a tap. A HOLD (the key
  still down HOLD_DELAY_MS 200 after the press, so a quick press on a
  short run stays one move) takes its key's next run on arrival, never the
  arrival run (it would ping-pong), and stops at no match, a tie, a
  dead-end tip and the finish; while the dot travels the choice hover
  shows the run it will take. Real time: a press while running QUEUES (the
  chase's own queue, the latest wins) and the hover shows it. A tap, Reset
  path, a restore or a rebuild ends a hold; a catch also clears the held
  keys (they must come up first). KEYS: the arrows by `key`, WASD by
  `code` (the physical cluster on any layout); `e.repeat` is ignored (the
  hold repeats); two keys pressed one after the other are an ORDER OF
  PREFERENCE, newest first (HeldKeys), while two adjacent keys pressed
  within 80 ms are a diagonal (K333 below). THE MAZE LEAVES A KEY ALONE
  (keyBelongsElsewhere) for any modifier chord (Shift included), a
  handled event, a focused input / textarea / select / contenteditable, a
  Tweakpane row (`.tp-dfwv, .tp-rotv` unless inside a button: sliders and
  lists use the arrows, a key after clicking a folder or Reset path still
  moves) and while any `[aria-modal='true']` is open (the daily stats
  view). Keys are live only in fabric mode, after the intro (sceneReady),
  unsolved, no win pending, the chase not finished (keysLive). keyup
  listens in the capture phase; blur and a hidden page drop every key.
  CENSUS (24 settled mazes at v4's defaults, 4259 junctions, 96% degree
  3; `.claude/probes/K120/census*.txt`): runs leave mostly diagonally
  (half within 9 degrees of one); the smallest angle between a junction's
  runs, 1st percentile, is 62 degrees at reach 0.5, 48 at 1, 21 at 1.5, 0
  at the far ends. At 0.5 / 70 / 15 every run has a key at 98.9% of
  junctions; a press finds no run for 1.9% and a tie for 9.4% of
  key-junction pairs; a hold goes on 83%, ties 15%, finds nothing 2% (tie
  10: 87%). THE MOVE PAD (Part B; K120's call, open for Levi): a four-way
  pad fixed bottom-right (132 px, 16 px in plus the safe area, z-index
  18; at 411x753 it spans x 263-395, y 605-737), shown only while the
  keys are live and the viewer preference is on: localStorage
  `knotmaze.movePad` and the panel's movePad row (Maze folder, fabric
  only), on by default for coarse pointers, never a link param or part of
  a daily. Each finger is a held key (`pad:<pointerId>`, pointer
  capture): down on an arm = press, kept down = hold, sliding to another
  arm = release + press, a 14 px dead radius at the center picks nothing;
  hiding lifts every finger. The off-screen indicators avoid it (main.ts's
  avoid list). Its arms are not focusable (keyboards have the keys).
  PROBES: `.claude/probes/K120/keys.mjs <base>
  'solve,hold,realtime,daily,guards,knot'` and `pad.mjs <base>
  'phone,pref,desktop,knot,indicator'` (quote the list in PowerShell);
  hook `__knotKeyMoves()` (vertex, departures, press and holdPick per key,
  live, hold, held, pad, census(reaches)). GOTCHA: a scripted player that
  alternates a tap and a hold of the best key can cycle for good (the
  hold runs past the shortest route, the taps bring it back); the pad
  probe holds on three steps only.

- THE PAD HIDES UNDER THE OPEN PANEL (K224, 2026-10-14): main.ts shows
  the pad only while the panel is closed. On a phone the open panel (x
  81..401, y 110..743 at 411x753) covers the pad's corner (x 263..395, y
  605..737) and nearly all of the maze, so a pad there has nothing to
  steer, and stacking the panel over it would cut the pad in half at a
  short panel's edge. The keys still move with the panel open. Checked by
  `.claude/probes/K92/undo.mjs <base> <out> phone`.

- TIE CYCLES, CHORDS AND THE MOVE WAIT (K329 + K333 + K334, 2026-10-14;
  the key_moves.ts header; main.ts keyPress, queueTap, stepWaiting).
  Levi: at a 4-way junction no arrow key moved (`?qoietk.KaIeBFFfBGVG3x8Mj4`,
  the junction after the entrance). ROOT CAUSE: K120's tie rule settles an
  ambiguous key only through a near-tied run that no UNAMBIGUOUS key
  claims. At an X (arms there at -50, 42, 147 and -138 degrees, y down)
  every key ties between the two arms beside it, so nothing is ever
  claimed and every key returned `tie`: none of the 8 keys (arrows and
  WASD) moved, on the dev build and on 00789b3, before K7 stage 1 (the
  physics worker is not involved). It was the one such junction of 45 on
  that maze (6 of degree 4). FIX (K329): ambiguous keys whose free runs
  pair up one to one get one each. At an X each key takes the arm
  CLOCKWISE of it (up the up-right arm, right the down-right, down the
  down-left, left the up-left), elsewhere the pairing with the smallest
  worst error; while every key is within KEY_TIE of both its arms the deal
  ignores which arm is a degree nearer, so it does not flicker as the
  threads drift. A key no other key shares a run with is still a real
  fork (nothing). Not taken: X's left to chords only (a lone key stays
  dead); each key its own nearest arm (on Levi's X right and down both
  took 54 and 53 had no key); counterclockwise (as arbitrary; clockwise
  matches K120's own fork example).
  CHORDS (K333): two ADJACENT keys pressed within CHORD_WINDOW_MS 80 of
  each other name a diagonal; chordMap picks over the four diagonals by
  the same rules, a held chord holds along its diagonal (HeldKeys.chord),
  opposite keys are no chord. A lone press waits out the window ONLY
  where a chord could change it (chordMatters: the key alone is tied, a
  tie or nothing, and a chord with a key beside it picks another run);
  elsewhere it moves at once, and a second key in the window whose chord
  picks the run already taken adds nothing (absorbsChord). 80 ms: keys
  pressed "together" land 0-50 ms apart, fighting games accept 33-83 ms,
  a delay reads as lag from about 100 ms, and it sits inside
  HOLD_DELAY_MS. On Levi's maze 41-45 of 180 key-junction pairs wait
  (varies with the settle); the wider rule (any chord beside the key
  picking another run) would delay 114. THE PAD shares keyPress: two
  fingers on adjacent arms within 80 ms are a chord; no diagonal sectors.
  THE MOVE WAIT (K334): a press mid-move went through moveAlong, whose
  FabricMazeRenderer.beginMove snaps the in-flight move to its end (keys
  read the head, the destination during a move). Now no input cuts a move
  short: a press, a pad touch, a tap or a click while the dot travels in
  turn mode waits in MoveWait (the latest wins, the hover shows its run)
  and is taken on the arrival frame (stepWaiting, first in keyStep). Levi
  on taps: "Yes. But held-down arrows when reaching the next junction can
  immediately/seamlessly trigger the next move." main.ts `tapsWait`
  (default on; the hook's setTapsWait(false)) restores the tap snap for
  A/Bs. A HELD key chains on the arrival frame (holdDue), except after a
  first run shorter than HOLD_DELAY_MS 200, where it waits out the delay
  (a quick press stays one move). The real-time chase keeps its own
  queue. tickAnim drops the arrival frame's overshoot, so a chained
  junction loses under one frame of travel; nothing else pauses.
  MEASURED (`.claude/probes/K329/repro.mjs <base>
  node2,chords,nosnap,tapwait,holdchain,census [tag]`, real key presses
  and clicks on Levi's link; `out/`): before, 0 of 8 keys moved at node_2;
  after, up/W took run 15, right/D 54, down/S 18, left/A 53, and the
  chords up+right 15, right+down 54, down+left 18, left+up 53 (0 and 40
  ms apart). The run taken is read from the path stack: two runs join
  node_2 and node_4, so the far junction cannot tell them apart. The snap
  test wraps beginMove and records whether a move was in flight: a press
  mid-move (progress 0.58) began on arrival, nothing in flight; a click
  at progress 0.51 began 111 ms later on arrival (setTapsWait(false): 2
  ms later, in flight at 0.51, the old snap). Holds from node_2: right
  chained 6 moves, down 3, with 0 idle frames and 0 snaps. Census: 0 of
  45 junctions where no key moves, 0 of 141 runs on no key or chord.
  Hook `__knotKeyMoves()` adds chord, waiting, tapsWait, setTapsWait and
  censusPress(). Tests: test/ui/key_moves.test.ts (K329, K333, K334).

- THE WAIT ON EVERY INPUT (K80 turns stage 3a, 2026-10-15; brief
  docs/design/K80_turns_stage3.md; the turn minotaur's wait move,
  gameplay-minotaur.md). Before, only a tap on the head waited. THE KEY
  (key_moves.ts `waitKeyOf`): `.` always (by `key`, wherever the layout
  puts it; the keydown guard lets Shift through for `.` only, since some
  layouts need it), and Space unless the focus is in SPACE_OWNERS (a
  button, a link, [role=button], summary, a field, contenteditable):
  there Space presses that (Reset path, a folder) and must not wait too.
  Live only with the turn minotaur on and the keys live
  (keyBelongsElsewhere and keysLive as the arrows); one wait a press,
  `e.repeat` ignored, no hold. THE PAD (move_pad.ts): while the turn
  minotaur is on (`setWait`, from fabricTick) the center is a WAIT button,
  an hourglass PAD_WAIT 22 px in radius (the arms start there instead of
  PAD_DEAD 14): a finger coming DOWN inside it waits a turn
  (`hooks.wait`) and lights it; sliding into the center only releases the
  arm. ONE WAY IN (main.ts `inputWait`): the key, the pad, a tap or click
  on the head and the probe hook's `waitTurn`. A press waiting out its
  chord window goes first (it was pressed first); a wait ends a key hold,
  as a tap does; while the turn is under way it waits in MoveWait
  (`wait(at, moving)`, the latest press, tap or wait winning) and
  takeWaiting runs it on the arrival frame; else it is taken at once. THE
  SNAP IS GONE: waitTurn used to cancelMove (snap the in-flight dot to its
  run's end) before a mid-move wait; now no input cuts a move short. The
  wait's own turn (`turnWait > 0`, the minotaur's run playing over
  moveSeconds) counts as the turn under way (`dotMoving`), so a press or
  tap during it queues too. THE HOVER CUE: the hover path tests the wait
  zone FIRST (`inWaitZone`: the turn minotaur on, the maze open, `onHead`,
  the same test a click uses, so hover and click agree everywhere): in it
  the cursor is a pointer, the head marker wears the "hourglass" glyph
  (marker_glyphs.ts; `setWaitCue` swaps it and puts back the one it wore,
  a glyph swap rather than a DOM overlay), and no choice lights and no
  glow shows. A touch on the head starts a pending tap like a choice's,
  resolved on release. During a move the zone is the destination's (the
  controller's head), and the cue clears when the head changes (a move, a
  catch) or the minotaur goes; the next pointer move puts it back. Tests:
  key_moves.test.ts (waitKeyOf, MoveWait.wait), move_pad.test.ts
  (padDirAt at PAD_WAIT).

- MID-MOVE INPUT (Levi's correction, 2026-10-15, over K334's MOVE WAIT
  for pointers; `tapWhileMoving` + `queuedPressHeld` in key_moves.ts,
  main.ts `handleFabricTap` + `stepWaiting`). TAPS/CLICKS: a tap or
  click (touch or mouse) on a run while the dot travels is IGNORED -
  it queues nothing and replaces nothing, so a multi-run route in
  flight walks on and the next segment is never a queued tap's. (The
  tap on the head for a wait is the exception that stays: K348's
  mid-move wait-tap leftover is intentional for pointers, and it still
  waits through `inputWait`.) KEYS: a direction press mid-move waits
  for the arrival frame but counts ONLY when its key is still held
  then: press-and-release before the arrival is discarded; held at
  the arrival, it continues in that direction; a chord needs both
  keys held, exactly as a lone key needs its one. The hook's
  `tapsWait` flag is now a legacy no-op (setTapsWait moves nothing).
  The real-time chase keeps its own input queue (its inputs are
  tick-recorded), untouched. Tests: key_moves.test.ts, "Levi's
  correction" (a mid-move tap ignored, a released press discarded, a
  held press taken, chords, the wait slot ungated).

- MULTI-RUN TAPS (K480 stage 1, 2026-10-15; brief `docs/design/K480.md`
  stage 1; Levi: chains of short segments are tedious to click through
  one by one). REACH: a tap on any SHOWN run within `pulseReach` (pr,
  default 3, world arc from the head along the walk graph; under the
  thread reveal capped at `revealDistance`, as the pulses are) walks
  there run by run. The runs leaving the head stay tappable along their
  whole length, as before, with K479's arrival preference among them
  (`FabricMazeRenderer.targetAt`: a choice is edgeAt's pick; past them,
  the nearest shown sample whose tapped point the planner reaches, a
  beyond run's samples near either junction excluded, burnt runs out,
  and under the fog only where a lifted stamp shows the thread, under
  the thread reveal only `shownAt` thread). THE ROUTE
  (`game/route_plan.ts` `planRoute`, pure): the shortest walk to the
  tapped point (Dijkstra over walk lengths, the approach never crossing
  the tapped run), then that run finished to its far end; refused past
  the reach or unreachable. THE WALK (main.ts `startRoute` /
  `routeStep` / `executeRouteRun`, from `handleFabricTap`): one run per
  move, each a normal move - stats, stars, the fire's clock and the
  minotaur's turns count it as one - and each logged as its own tap, so
  a multi-run tap is a tap list and replays to the same game with no
  new format (saved attempts included). A tap issued mid-move is
  ignored (MID-MOVE INPUT above), so a route in flight walks on; a new
  tap at rest, a key taken at an arrival (held-at-arrival), or a wait
  replaces the route. THE STOPS (decision 4;
  `routeWarning` + `firstSmolderIndex` in route_plan.ts, judged in
  `routeStep` before each next run): the route ends at a catch, the
  finish or a burn loss; under the turn minotaur it stops before its
  next run when the last move spotted you (hunting flipped on) or the
  minotaur's new telegraph walks a remaining run or ends on a junction
  the route ends a run on; under the turn-clock burn it stops before a
  run that would be smoldering when reached (the fire is deterministic
  on walked distance, so the departure test is the controller's own),
  with the Smoldering toast. HOLDS (decision 5): an arrow-key or pad
  hold stops for the same three warnings, judged on the run it would
  take next (main.ts keyStep); a catch already ended it. REAL TIME
  (decision 6): no warning stops - a chase tap queues its route run by
  run (`handleChaseTap`, fed in `tickChase` as each run departs), a
  new tap redirects it, and a smoldering arm under the realtime fire
  is refused when it comes up (tested at its departure clock), which
  ends the route with the toast. THE HOVER (stage 1's scope): over a
  beyond run it lights the run a tap would finish (`setGlowRun` on
  targetAt's run, the pointermove path); the pulses and the hover
  branching to the same reach are stage 2. Tests:
  `test/game/route_plan.test.ts` (the planner, the projected smolder,
  the warnings, whole-route solves and replays, the minotaur replay).

- GAMEPAD (K499, 2026-10-16; `src/ui/gamepad.ts` pure, main.ts
  `pollGamepad`): the Gamepad API polled once a frame from fabricTick
  (before keyStep, in every ticker branch), first connected pad, edges
  only - an idle poll reads `navigator.getGamepads()` and changes
  nothing, so it never wakes a sleeping scene (a move it does take
  goes through moveAlong, which never wakes either). THE MAPPING:
  d-pad buttons 12-15 (opposites cancel) and the left stick (axes
  0/1, radial STICK_DEADZONE 0.35, quantized to the eight sectors; a
  diagonal is two dirs), unioned one entry per direction. Directions
  are held keys `game:<dir>` through keyPress/releaseKey, so picker,
  chords, preference order, holds and HOLD_DELAY are the keys' own;
  unplug (a null poll) releases everything. HELD-AT-ARRIVAL: a
  direction pressed mid-move queues in MoveWait and counts only while
  still held on the arrival frame, exactly as a key - tapped and
  released before the arrival, it is discarded; still held, it
  continues. A/CONFIRM (button 0, edge only) is TAP-CLASS (Levi's
  correction): at rest it takes one step along the currently held
  gamepad direction (pressMove; the direction's own hold may chain
  on after it, A starts none), while the dot travels it is discarded
  and queues nothing; with no direction held it does nothing (the
  turn minotaur's wait stays on `.`/Space, the pad center and the
  head tap). Presses count only while keysLive (releases always
  land). Gameplay movement only: no panel navigation, no link param,
  no panel row. Tests: `test/ui/gamepad.test.ts` (deadzone, sectors,
  d-pad, unions, edges, unplug, and the held-at-arrival rule through
  HeldKeys/MoveWait/queuedPressHeld). Unprobed on real hardware -
  first pad check rides the next phone/desktop play pass.

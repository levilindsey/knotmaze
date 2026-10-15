---
paths:
  - "src/ui/key_moves.ts"
  - "src/ui/move_pad.ts"
  - "test/ui/key_moves.test.ts"
  - "test/ui/move_pad.test.ts"
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
  unambiguous key claims, else nothing (keyMap). A PRESS moves along its
  key's run at once through moveAlong / chaseAlong, so it IS a tap on that
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
  hold repeats); two keys held are an ORDER OF PREFERENCE, newest first
  (HeldKeys), not a diagonal. THE MAZE LEAVES A KEY ALONE
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

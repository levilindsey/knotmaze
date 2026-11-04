# K1170: the key hints show the d-pad button (Muse run 15D)

The coordinator's brief, 2026-11-03. One run for Muse, on master.

## Why

K332 (`698a2924`) put a small arrow at the start of each run at the
player's junction after the first direction press, and K1132
(`f2c79236`) added an "out" placement behind `__knotKeyHintPlace`.
Levi, 2026-11-03, after seeing them: "It looks like you have added
arrows to indicate each branch from the current position. However,
these are supposed to indicate which d-pad button corresponds to which
branch".

The cause: `hintMap` (`src/ui/key_moves.ts`) gives each run the
direction with the smallest err, and a cardinal wins only an exact
tie. Most runs on this lattice leave diagonally, so most hints are
chords (K332's probe: `mnode_109 0:downLeft 220:downRight 221:upLeft,
all chords`), and each arrow points along its run. The move pad has
four arms (`move_pad.ts` ARMS: up, right, down, left), as the arrow
keys and WASD do, so a diagonal arrow names no button.

## The run

1. `hintMap`: a cardinal that takes a run always beats a chord; among
   cardinals the smaller err, an exact tie in KEY_DIRS order. A
   chord's diagonal shows only on a run no cardinal takes (keyboard
   and gamepad chords; the pad cannot press one, taps still can).
   Rewrite its header comment to say so. Which key takes which run
   does not change: keyMap, chordMap, the picker and the holds stay as
   they are.
2. Check that the drawn arrow points the shown direction on screen
   (screen y down): the up hint points up on the screen, and so on.
3. `test/ui/key_moves.test.ts`: move K332's hintMap cases to the new
   rule, and add a run that a cardinal and a diagonal take where the
   diagonal's err is smaller (the cardinal shows), a run two cardinals
   take (the smaller err shows), a chord-only run (its diagonal shows)
   and a run nothing takes (no entry).
4. Rerun `.claude/probes/K332/hints.mjs` with its expectations moved
   to the new rule: the shown hints equal the hook's picks at the
   entrance and the next three junctions, and each press still takes
   the run it took before.
5. Pictures for Levi: copy `.claude/probes/K1132/hints2.mjs` and
   `compose.mjs` to `.claude/probes/K1170/` and run `pics` and the
   sheets there: K332's link verbatim, the three states, the desktop
   and the phone's size, both placements. The sheets go to
   `.claude/probes/K1170/shots/sheet_desk.png` and `sheet_phone.png`,
   beside K1132's for comparison. Desktop Chrome only, never the phone
   itself.
6. `npm test`, then commit and push. The commit message records the
   probe's hints per junction before and after. CI green after the
   push.

Ports: 5570-5579.

## How to work

Batch 15's How to work (`docs/design/K1169_muse_batch15.md`) applies,
with one change: update K1170's handle, not K1169's:
`ledger.mjs handle K1170 --last-commit <sha8> --next "Run 15D done; Claude reviews the pictures, then K1132's placement goes back to Levi"`.
Area rules: `.claude/rules/gameplay-moves.md` (moves by direction, the
picker, the move pad, the gamepad).

Report: the hint per run at the four junctions before and after, the
test counts, the commit, and the sheets' paths.

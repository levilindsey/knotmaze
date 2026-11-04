# K1173: a Tug threads checkbox (Muse run 15F)

The coordinator's brief, 2026-11-03. One run for Muse, on master.

## Why

Levi, 2026-11-03: "I think we should have a checkbox for toggling
whether the player can tug on threads in a way that drags threads with
physics. If disabled, taps would still trigger plucks, but drags would
only trigger panning." No such setting exists today: Tug limit, Pluck
tug and Auto plucks tug tune tugs, and none turns them off.

## The run

1. A viewer preference, on by default, kept per browser like `movePad`
   (`src/ui/move_pad.ts`) and never in a link. A checkbox "Tug threads"
   in the Feel folder above Tug limit, with a help line: off, a drag
   pans the view wherever it starts; taps still pluck (and move, in maze
   play).
2. `src/app/input_pointer.ts`: with it off, a press on a thread that
   moves past its tap slop (`TAP_SLOP_PX`) pans the view exactly as a
   drag from empty space does, and the physics never sees a grab. A
   press that stays inside the slop is a tap as today, whatever a tap
   does there (a pluck, a move, K279's tap tug). Pinch, the wheel, keys
   and the gamepad are unchanged. Pluck tug and Auto plucks tug are the
   pluck's own settings and stay as they are. A change mid-drag applies
   from the next press.
3. With it on, today's behavior exactly: every existing test passes
   unchanged, the golden snapshots included.
4. Tests: the preference (default, persistence, storage failures, as
   `test/ui/move_pad.test.ts` tests the move pad's), and the routing:
   off, a drag that starts on a thread pans and sends the host no grab;
   a tap still plucks; on, the same drag grabs.
5. A desktop probe (desktop Chrome only, never the phone), in
   `.claude/probes/K1173/`: with it off, drag a thread 80 px: the view
   pans by the drag, the host reports no grab and the thread's particles
   stay put; tap the thread: one pluck. With it on, the same drag moves
   the thread.
6. `npm test`, then commit and push. CI green after the push.

Ports: 5585-5589.

## How to work

Batch 15's How to work (`docs/design/K1169_muse_batch15.md`) applies,
with one change: update K1173's handle, not K1169's:
`ledger.mjs handle K1173 --last-commit <sha8> --next "Run 15F done; Levi tries the checkbox on the phone"`.
Area rules: `.claude/rules/gameplay-camera.md` (taps and drags, the tap
tug) and `.claude/rules/gameplay-panel.md`.

Report: what a drag and a tap do in each state (the probe's numbers),
the test counts, the commit.

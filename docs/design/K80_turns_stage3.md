# K80 turns stage 3a: the wait on every input, the knobs, per-model tuning

One build stage, Opus, two-hour cap. Ports 5940-5949; probes in
`.claude/probes/K80/stage3/`. Read first: `K80_turns.md` "The stages"
(44-52) and its "Stage 2 handoff" (from 568: Calls 649-665, the table
667-693, "For stage 3" 736-754). Stage 3's first half (question 1).

## What is there (checked on master 21d701e)

- `src/game/minotaur_turns.ts`: the header (1-36) is the spec (41-42 say
  stage 3 adds abbott; `K80_turns.md` says 4). DEFAULT_TURN_MINO 77 (one
  sight and accuracy for all three models), LOSE_MARGIN 91, ROAM_MIN 93,
  turnConfig 118 (lose 126, the hunter's rMin 133), wanderDest 262 (one
  draw, 272), decide 278 (the stalker never reads sight, 309-313).
- `src/main.ts`: onHead 2933, waitTurn 2944 (in flight, cancelMove snaps
  the dot to the run's end, 2947-2950), handleFabricTap 3158 (the wait at
  3174 comes before K334's queue at 3180; the comment at 3177-3179 says
  tapsWait is off by default, but it is on, 3283), queueTap 3417, keydown
  3543 (no wait key), `new MovePad` 3580, the hover 4063-4085 (no onHead;
  inferred: it can light a choice that a click there would not take).
- `src/ui/key_moves.ts`: MoveWait 609 (a run or key directions, never a
  wait), keyBelongsElsewhere 797. `move_pad.ts`: PAD_DEAD 14 px (18),
  padDirAt 30. Lore: `gameplay-moves.md` (K120, K334).
- The real-time pull to mirror: `minotaur.ts` 39-43 and 636-650 (roamPull
  splits one draw, so 0 is the old pick).
- Params: `url_state.ts` 523-531 and 549-550, turnMinoParamsOf 826;
  `param_codec.ts` turn rows 108-116, last row 139 (line 272),
  CODEC_VERSION 6 (279); `undo_stack.ts` onTurnMinoChange 170;
  `tweakpane_panel.ts` "Minotaur behavior" 1102-1133. Free keys: `mlm`,
  `mrn` (reserved by K324 section 4.3), `mtp`.
- K293's sites: (a) `star_rating.ts` 123; (c) `fabric_controller.ts`
  markCaught 173; (e) the panel 1133; (f) main.ts resetPathAction 1694-1748.
- Tests: `test/game/minotaur_turns.test.ts` (no digest of whole games);
  K80_DIGESTS (`test/game/minotaur.test.ts` 438, real time).
- Tools, untracked in the main checkout's `.claude/probes/` (copy what you
  use; run lines in `probes.md` 208, `gameplay-moves.md` 65 and 131):
  `K80/turns2/` (sweep.ts, compare_after.ts, sim.ts, tables, `banner/`),
  `K80/turns/turns_page.mjs`, `K120/{keys,pad}.mjs`, `K329/repro.mjs`.

## The work

1. **A turn-game pin first:** a digest of whole games (seeds, the three
   models, a scripted walk with waits) at today's defaults. Check: it
   holds through item 7.
2. **A wait key** (question 3): one wait a press, no hold, live as the
   arrows are. Check: unit tests; with Reset path focused, Space presses
   only the button.
3. **A wait mid-move waits** for the arrival, as every input does (K334):
   MoveWait holds a wait (key, pad or head tap; the latest wins); the snap
   (2947-2950) goes; fix the comment at 3177-3179. Check: a MoveWait test;
   repro.mjs with beginMove and cancelMove wrapped: no wait taken mid-move.
4. **The pad's wait** (question 4). Check: padDirAt tests; pad.mjs phone
   with a wait.
5. **A hover cue for the wait zone:** onHead first in the hover path; in
   the zone the cursor is a pointer, the head shows a cue, no choice
   lights (the existing glow and markers while K290 3b is open). Check: a
   real cursor across the zone; hover and click agree at every step.
6. **K324 section 4.3's knobs** (Levi took its recs): minoGiveUp (`mlm`,
   [0, 10]) and minoRoamMin (`mrn`, [1, 10]), default 3, for LOSE_MARGIN
   and ROAM_MIN, in "Minotaur behavior"; the tooltips that say "3" follow.
   Check: compare_after.ts: 0 mismatches, stage 2's table reproduced.
7. **The turn pull**, the design's turn analogue of `minoToward` (question
   5; `mtp`, default 0): with chance p a roam destination is one nearer
   the player than it is (in runs), splitting the one draw as roamPull
   does; sim.ts mirrors it. Check: item 1's pin at 0; 0 mismatches at 0
   and 0.5; % caught at p = 0, 0.25, 0.5 and 1.
8. **K294, per-model defaults** (Levi said "Yes." to each model's own
   defaults, tuned to section 0's rates), in question 2's shape: sweep.ts
   per model on the three sets toward section 0's % caught (each cell's
   first number); the hunter keeps sight 2, accuracy 0.3. Check: the full
   table before and after, 0 mismatches; item 1's pin re-frozen, named.
9. **K293:** (a) say what is rated under minoRestart, or rate every life
   (your call, stated); (c) a catch on an empty log counts no move; (e)
   minoSleep's tooltip true with minoLair off; (d), (f) per question 6;
   (b), (g), (h) need no code. Check: tests for (a) and (c);
   `banner/probe_stars.mjs` turnmino and `&mrs=1`.
10. **Checks, shots, lore.** `npm test`, `npm run build`; K80_DIGESTS,
    the golden, the K87 pin and the golden dailies don't move; the codec
    table pin and url_codec.test.ts's defaults table move (name them).
    Shots at 1400x900 and 411x753 (diag_screenshot rules): the hover cue
    and the pad's wait. Lore: `gameplay-moves.md`, `gameplay-links.md`,
    `gameplay-panel.md`, `gameplay-minotaur.md` (fix "codec v5 108-116").

## Questions (take the recommendation unless the coordinator says otherwise)

1. **The split.** Rec: 3a now; 3b after K290 3b merges (it edits
   `fabric_maze_renderer.ts`): section 2.7's telegraph (a route-shaped
   drawTelegraph K324 can reuse), 2.8's catch feedback with K270's band,
   2.10's sounds and fog, a contact sheet for Levi; the chevrons after
   K324 stage 2 (its D9). Keys and the pad cannot wait today: 3a first.
2. **K294's shape.** (a) The model pick writes a per-model table into the
   shared rows (`?7&mt=guard` reads the hunter's numbers; a switch
   overwrites a tuned value). (b) A per-model "auto" sentinel. (c) Rec:
   rows for the knobs the guard (sight, accuracy) and the stalker
   (accuracy) read, shown for that model only; the hunter keeps today's.
3. **Wait keys.** Rec: `.` always, Space unless a button or link has
   focus (it would press the button too).
4. **The pad's wait.** Rec: while the turn minotaur is on, the pad's
   center, its radius grown to about 22 px; or a fifth button beside it.
5. **The turn pull.** Rec: its own param, default 0; K323's `minoPull`
   defaults to 0.5 for real time and would move stage 2's rates.
6. **K293 (d), (f):** with minoLair off it can camp the first junction
   past the entrance; Reset path shows no toast. Rec: keep both, in lore.

## Order and neighbors

- K114 stage 2 edits the same main.ts paths (handleFabricTap, queueTap,
  fabricTick), the panel's exclusivity and the codec: one after the other.
- K323 Stage A (codec 7, the Game folder, `mtw` to `minoPull`): whichever
  lands second rebases and re-freezes the codec pins.
- K324 stage 1 leaves `minotaur_turns.ts` to this stage (section 4.3).
- K7 stage 7 (main.ts's boot), K5 M2 (the camera out of main.ts): keep
  main.ts edits to the input and minotaur paths.
- Out of scope: waits in `fc.taps` and K47's fingerprint (before a daily
  pins a minotaur); K271 (K76 2c's).

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5940-5949, each vite server with a private cacheDir
  (`probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** every instance you launch gets its own `--user-data-dir` in
  your probes folder, and the off-screen window flags. Delete the profile
  when you are done (K161).
- **Files:** probes, logs and notes go in your worktree's
  `.claude/probes/K80/stage3/` (untracked; the coordinator copies them at
  the merge).
- **Timing:** if you time frames, hold the perf lock (`probes.md`).
- **No phone:** pad.mjs emulates it.

## Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
  - Helpers, if any: `model: sonnet`, this stop rule, a 1-hour cap.
- **The stop.** Stop when items 1-10 are done and verified, or at your
  cap, whichever comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append a "Stage 3a handoff" section to this
    file, commit it and report.
- **The final report covers:** what changed and where, and the tests that
  pin it; your answers to the questions and any other calls; the sweep and
  comparison tables; the shots; the test count, the build and the pins
  that moved; the lore you added; a `Ledger items` list; and the handle
  fields (branch, last commit, evidence and next).

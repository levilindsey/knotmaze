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

## Stage 3a handoff (2026-10-15)

Agent `ad4536aff31e4c7ba` of claude session 05e60da0, 08:50 to 10:15:
stopped with items 1-10 done and verified, inside the cap. Branch
`worktree-agent-ad4536aff31e4c7ba`, rebased onto master d1281ba (K5 M2's
camera move) with no conflicts: 50bd32b (item 1), 7e28e8b (2-5), 2536192
(6-7), cb1abcc (8), 49ab6b1 (9), 4535f92 (lore), then this handoff. Not
pushed. Probes, logs and shots: the worktree's untracked
`.claude/probes/K80/stage3/` (copy it at the merge).

### What changed

- **Item 1, the pin.** `test/game/minotaur_turns.test.ts`: turnGame and
  TURN_GAMES, 18 whole games (seeds x hunter, guard, stalker x scripted
  walks with waits) at `turnMinoDefaults(model)`. It held through item 7.
  Item 8 re-froze the guard and stalker rows, all but stalker:42:2.
  guard:42:2 now has stalker:42:2's digest: at sight 4 the guard hunts
  the whole game.
- **Items 2-5, the wait on every input.**
  - `key_moves.ts`: `waitKeyOf` takes `.` always (by key; Shift is let
    through for layouts that need it) and Space unless focus is on a
    SPACE_OWNERS element (button, a[href], [role=button], summary,
    input, textarea, select, contenteditable). `MoveWait.wait(at,
    moving)` queues a wait as it queues a run; the latest input wins.
  - `main.ts` `inputWait()` is the one way in: the key, the pad's
    center, a tap on the head, and the hook `__knotTurnWait`. A press in
    its chord window goes first, then endKeyHold, then MoveWait mid-turn
    or waitTurn. A held `.` is one wait (e.repeat is ignored).
    `dotMoving()` counts a wait's animation (turnWait > 0) as the turn
    under way. The cancelMove snap is gone, and handleFabricTap's K334
    comment is fixed.
  - The hover tests `inWaitZone` first. In the zone the head's glyph
    becomes "hourglass" (`marker_glyphs.ts`), the cursor is a pointer
    and no choice lights. Hover and click use one test (edgeAt with
    `pickRadius(pt, true)`). A touch on the head starts a pending tap.
  - `move_pad.ts`: while the turn minotaur is on, the pad's center is
    the wait (PAD_WAIT 22 px, `.km-pad-wait`, an hourglass, aria-label
    "Wait"). A finger coming DOWN there waits and lights it; sliding in
    from an arm only releases the arm.
  - Tests: `key_moves.test.ts`, `move_pad.test.ts`.
- **Items 6-7, the knobs and the pull.**
  - Six params are appended to the codec (rows 140-145); CODEC_VERSION
    stays 6.

    | param | key | default | range |
    |---|---|---|---|
    | minoGiveUp | `mlm` | 3 | [0, 10] |
    | minoRoamMin | `mrn` | 3 | [1, 10] |
    | minoTurnPull | `mtp` | 0 | [0, 1] |
    | minoGuardSight | `mgs` | 4 | [0, MINO_SIGHT_MAX] |
    | minoGuardAccuracy | `mga` | 0.3 | [0, 1] |
    | minoStalkerAccuracy | `msa` | 0.45 | [0, 1] |

  - turnMinoParamsOf picks each model's values. The params sit in
    LIVE_EFFECTS under onTurnMinoChange; none is daily-exempt. The panel
    shows each model only the rows it reads (`gameplay-panel.md`).
  - The pull (wanderDest): with chance p, the roam destination is drawn
    among the in-range junctions nearer the player (in runs) than the
    minotaur is. It splits the one draw as roamPull does, so 0 is the
    old pick. The stalker ignores it. `sim.ts` mirrors it.
- **Item 8, K294.** TURN_MODEL_DEFAULTS: guard {sight 4, accuracy 0.3},
  stalker {accuracy 0.45}. The hunter keeps 2 and 0.3.
- **Item 9, K293.**
  - (a) The controller counts `respawns`, and `rateRun(walked, optimal,
    catches, walkedCatches)` uses them: the popover says which catches'
    walks count. The walk is not carried across a restart: that would
    charge a catch on top of the two-star cap.
  - (c) A catch's moveCount is taps.length, so a catch on an empty log
    counts no move.
  - (e) minoSleep's tooltip is now true with minoLair off.
  - A stage 2 bug is fixed: under a minotaur, a Reset path with no move
    skipped restartSolve, which laundered the catches. It now always
    restarts, and restarts++ only if the player moved.
  - (d) and (f) are kept and written into lore. (b), (g) and (h) need
    no code.
  - Tests: `star_rating.test.ts`, `fabric_controller.test.ts`.
- **Item 10, lore.** `gameplay-moves.md`, `gameplay-links.md`,
  `gameplay-panel.md`, `gameplay-minotaur.md` (its "codec v5 108-116"
  is fixed) and `gameplay-stars.md`.

### Tables

`compare_after.ts`, 9600 games each, 0 trace mismatches, at:
- pull 0 with the knobs at 3 (`compare_3a_p0.md`), which matches stage
  2's `compare_after.md` cell for cell;
- pull 0.25, 0.5 and 1;
- K294's defaults (`compare_3a_k294.md`).

The pull, % caught on dailies (explorer / 80% / fog-4, 8 reps):

| config | pull 0 | 0.25 | 0.5 | 1 |
|---|---|---|---|---|
| hunter | 2/13/13 | 2/16/13 | 0/18/15 | 2/22/18 |
| hunterBurst | 2/18/15 | 2/18/16 | 3/23/21 | 8/28/26 |
| guard | 3/19/22 | 1/21/24 | 2/28/20 | 1/27/25 |

K294, 64 reps (`sweep_3a_guard64.md`, `sweep_3a_stalker64.md`):
- Score: the sum of |x - section 0| over nine cells (daily, treelike and
  deadends x explorer, 80% and fog-4). Near ties, within about 4, go to
  the daily cells.
- Section 0 targets:
  - guard: daily 1/18/13, treelike 10/23/21, deadends 4/23/19;
  - stalker: daily 3/20/12, treelike 23/43/33, deadends 8/23/28.

| model | defaults | score | daily | treelike | deadends |
|---|---|---|---|---|---|
| guard | 2 / 0.3 (before) | 48.9 | 1.3/19.6/19.3 | 2.4/13.0/11.7 | 2.3/14.6/15.3 |
| guard | 4 / 0.3 (after) | 43.3 | 1.7/20.4/21.5 | 2.3/15.8/12.1 | 2.2/17.6/18.1 |
| stalker | 0.3 (before) | 100.8 | 1.9/22.3/22.6 | 2.3/15.7/14.5 | 1.4/19.4/17.9 |
| stalker | 0.45 (after) | 90.5 | 3.4/27.9/28.5 | 4.5/20.6/19.0 | 3.5/22.8/22.0 |

Stalker 0.6 scored 87.6, but its daily cells scored 34.3 against 0.45's
24.9. **Open for Levi:** at 0.45 the stalker overshoots section 0 on the
dailies' 80% and fog-4 cells (27.9 and 28.5 against 20 and 12). Stage
2's dailies-only criterion would keep it at 0.25-0.3.

### Verification

- **The suite**, after the rebase: 84 files passed and 1 skipped; 1177
  tests passed and 1 skipped. `npm run build` and `tsc --noEmit` are
  clean.
- **The pins that moved:**
  - `param_codec.test.ts`: rows 140-145;
  - `url_codec.test.ts`: the defaults table, KEYS, and minoTurnPull's
    non-default test value;
  - TURN_GAMES, which is new.
- **The pins that did not move:** K80_DIGESTS, the byte_identity golden,
  the K87 pin and the golden dailies. None of their files changed.
- **`wait_inputs.mjs`** (new; `node <it> <base> desktop,phone [seed]`):
  all 47 checks pass on the rebased production build (4535f92), and they
  passed on the dev server before the rebase.
  - The hover sweep: the cue shows on 19 of 50 steps, in one interval
    per axis, with a pointer cursor and no choice lit. Hover and click
    agree at 5 points.
  - Mid-move, `.` and a click on the head queue and are taken after the
    arrival, with 0 cancelMove.
  - Space on a focused Reset path presses only the button, and `.` there
    waits. A held `.` waits once.
  - The pad's wait on the phone: lit while the finger is down, one turn,
    queued mid-move, and a slide in takes no wait. On a desktop with the
    stored pref and the panel stored closed, the pad shows its wait.
- **`banner/`** (K155's probe_stars.mjs): turnmino and turnmino_restart
  (`&mrs=1`) pass all 21 checks each.
- **K120 regressions on the branch build:**
  - keys.mjs: solve 8/8, hold 7/7, guards 11/11, realtime 7/8.
  - pad.mjs: phone 13/13, pref 6/6, desktop 3/5.
  - Both failures fail the same way on master d1281ba, so this stage did
    not cause them:
    - realtime's "a held key keeps adding inputs" reads 2->3, twice on
      each build. Inferred, untested: seed 7's maze changed under the
      probe.
    - desktop's "the stored choice shows it" gets no pad rect. K224
      (86dc0cf) hides the pad under the open panel, and a wide desktop
      opens the panel by default. The probe needs
      `knotmaze.panelOpen` stored as "0", as `wait_inputs.mjs` does.
- **Shots** (`shots/`): hover_cue_1400x900(_zoom).png,
  hover_nocue_1400x900_zoom.png, pad_wait_1400x900(_zoom).png,
  pad_wait_411x753(_zoom).png and pad_wait_lit_411x753_zoom.png.

### Next

- Stage 3b, after K290 3b merges (it edits `fabric_maze_renderer.ts`):
  - section 2.7's telegraph;
  - 2.8's catch feedback, with K270's band;
  - 2.10's sounds and fog;
  - a contact sheet for Levi;
  - the chevrons, after K324 stage 2 (D9).
- Still out of scope: waits in fc.taps and in K47's fingerprint.
- Fix the two K120 probe checks above.

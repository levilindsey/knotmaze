# K114 stage 2: real-time burning behind `fireClock`

One build stage, Opus, two-hour cap. Ports 5950-5959; probes in
`.claude/probes/K114/stage2/`. Read first: `K114_burn.md` lines 117-137
(stage 2) and 685-716 (the Stage 1 handoff's "Next: stage 2"). Levi (call
7, 2026-10-14): "Will we have a toggle for turn-aligned vs realtime
burning? I think we should!"

## What is there (checked on master 21d701e)

- `src/game/fire.ts`: the header (1-30) is the spec; L is an input.
  armSafe 66, fireTrapped 84, runBurnAt 101, fireLead 134.
- `fabric_controller.ts` reads `walkedDist` as L in four places: choices()
  202, fireLeadHere 208-209, smoldering() 213-216, fireArrive 260-266.
- `src/main.ts`: fireOf 463, pendingLoss 468, showFireLoss 2685,
  restartSolve 2787 (the one restart), moveAlong 3194 (a loss sets
  pendingLoss, 3213), K334's queued taps (tapsWait 3283, used at 3180;
  queueTap 3417), fabricTick 4467 (the loss waits for the dot, 4534).
- The clock to reuse: `minotaur.ts` CHASE_HZ 120 (59), MAX_STEPS_PER_ADVANCE
  30 (63), advance() 451-462; main.ts tickChase 2823 runs it only while the
  chase runs on a visible page (2826). K80_DIGESTS
  (`test/game/minotaur.test.ts` 438) pin the chase.
- The dot: `fabric_maze_renderer.ts` MOVE_CTRL_PER_S 34 (180) times
  moveSpeed, slower in bends (181-182). Observed: ctrl per second, not
  lattice units; the chase's dot runs at PLAYER_PACE 10 u/s (minotaur.ts
  109).
- The look: drawFire 1158 redraws when fireKey (491; built at 1170-1173)
  changes; setBurnSpans 1283 re-declares visibility (syncExplore 2485) when
  the spans change, as the reveal does every frame it grows (2443).
- Params: url_state.ts fire fields 538-540, defaults 751-753, fireSettingsOf
  770-780 (null unless the fire is fuse, the clock turn and the turn
  minotaur off), ENUM_OPTIONS 922; param_codec.ts's last row is 139 `burnt`
  (272), CODEC_VERSION 6 (279); undo_stack.ts onClockChange 185; the
  panel's Burn race folder, tweakpane_panel.ts 1014.
- Hook `__knotFabric().fire` (`src/app/probe_hooks.ts` 449); lore
  `gameplay-fire.md`. Stage 1's tools are in the main checkout's
  `.claude/probes/K114/burn/` (burn_sim.ts, lib.ts, burn_page.mjs race |
  loss | perf, the vite configs, results_tuning_rebased.md): copy them.

## The work

1. **One clock getter** in the controller for the four L reads; turn play
   returns walkedDist. Check: every existing test passes unchanged.
2. **`fireClock`** (turn | realtime, default turn; an unused key): field,
   default, options and parse in url_state.ts, a codec row after 139,
   onClockChange, a Burn race row hidden while the fire is off, carried by
   fireSettingsOf (still null with `clk=realtime` or the turn minotaur).
   Not daily-exempt. Check: the codec table pin and url_codec.test.ts's
   defaults pin re-frozen and named in the commit; a fireSettingsOf test.
3. **The clock:** L = v_ref times the fixed-step time since the first
   accepted move, on the chase's step, shared without changing the chase.
   It runs only while racing (unsolved, not lost, the page visible) and
   idles after a restart until the next first move. Exact ops on tick
   counts (K108). Check: tick-by-tick unit tests; K80_DIGESTS unchanged.
4. **The rules.** The departure test runs when the dot leaves (a queued
   tap leaves on arrival), with L then; T(head) <= L while you stand is a
   loss where you stand; the mid-run loss per question 1. Check: unit tests
   on a small walk graph (the standing loss at its first tick, arms
   smoldering while you stand, no mid-run catch at v_ref for r < 1).
5. **The page:** the HUD's lead counts down (DOM writes only on a change);
   Try again and Reset path stay restartSolve() then updateHud(); the hook
   reports the clock and L. Check: burn_page.mjs race and loss under
   realtime: a still player loses at the predicted time, within a frame; a
   hidden tab freezes the clock; Try again restarts it.
6. **The per-frame cost.** Inferred, unmeasured: under realtime L changes
   every frame, so drawFire rebuilds and the spans re-declare every frame.
   Measure burn_page.mjs perf, both clocks, your build and master, desktop
   and 4x CPU throttling, under the perf lock. If realtime frames worse
   than a turn race at the same burnt share, re-declare less often.
7. **The balance:** burn_sim.ts's players plus a thinking time per
   decision (a few levels, turned into L by v_ref), on stage 1's dailies
   and r, h grid. Self-check (inferred): at zero thinking time and a dot at
   v_ref, realtime reproduces the turn table exactly. Propose values.
8. **Shots** at 1400x900 and 411x753 (real time, `diag_screenshot.mjs`
   rules, never `--virtual-time-budget`): mid-race, a standing loss.
9. **Checks:** `npm test`, `npm run build`; the golden, the K87 pin, the
   golden dailies and K80_DIGESTS don't move; only the codec pins move.
10. **Lore:** a REAL-TIME FIRE entry in `gameplay-fire.md` (the clock,
    v_ref, the losses, the cost); the row in `gameplay-links.md` and
    `gameplay-panel.md`; a CLAUDE.md structure line for any new file.

## Questions (take the recommendation unless the coordinator says otherwise)

1. **The dot's pace** (inferred from fire.ts's model): with the dot at
   exactly v_ref and r < 1 (fireSpeed is at most 0.95), the departure test
   is exact and nothing catches the dot mid-run; today's animation is not a
   lattice pace, and a moveSpeed above 1 would buy lead. (a) Under realtime
   the dot runs at a constant v_ref, moveSpeed unused; (b) each run takes
   len / v_ref, bends kept, plus the mid-run check; (c) today's animation
   plus the mid-run loss. Rec: (a), v_ref = the turn animation's mean
   lattice pace at moveSpeed 1 on dailies, recorded as a constant.
2. **One fireSpeed and fireDelay for both clocks?** Rec: yes; item 7
   proposes realtime values for Levi.
3. **The standing loss:** when the fire reaches you (the doc; rec), or once
   no safe arm is left (fireTrapped)?
4. **The snap:** the A/B hook `setTapsWait(false)` would put the dot ahead
   of the clock (inferred). Rec: realtime always queues.
5. **K323** section 2.4 (176-187, written before call 7) keeps the burn
   race turn-only. Rec: `fireClock` survives K323 as a Burn race row.

## Order and neighbors

- After K290 stage 3b merges: it rewrites the front, embers, smolder and
  fuse (`fabric_maze_renderer.ts`, `appear_fx.ts`); item 6 measures that.
- K80 turns stage 3 edits the same main.ts paths (moveAlong, queueTap,
  fabricTick) and the panel's exclusivity handlers: one after the other.
- K323 Stage A (codec 7, renumbering, `gameMode` replacing `fire`):
  whichever lands second rebases and re-freezes the codec pins.
- K7 stage 7 (main.ts's boot) and K5 M2 (the camera, out of main.ts): keep
  main.ts edits to the fire's paths. K280 (the retune) stays separate.

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5950-5959, each vite server with a private cacheDir
  (`probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** every instance you launch gets its own `--user-data-dir` in
  your probes folder, and the off-screen window flags. Delete the profile
  when you are done (K161).
- **Files:** probes, logs and notes go in your worktree's
  `.claude/probes/K114/stage2/` (untracked; the coordinator copies them at
  the merge).
- **Timing:** if you time frames, hold the perf lock (`probes.md`).
- **The phone** (optional): `scripts/phone.ps1` under the phone lock,
  taken with the main checkout's `.claude/probes/agents/phone_lock_take.ps1`
  (`-Owner "K114 s2 <your agent id>" -What "<what>"`; it waits inside the
  call) and released with `phone_lock_release.ps1 -Owner "<the same>"`
  beside it as soon as your shots are done. Hold it at most 20 minutes at
  a time. Never print the phone's IP address.

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
  - At the stop, commit WIP, append a "Stage 2 handoff" section to this
    file, commit it and report.
- **The final report covers:** what changed and where, and the tests that
  pin it; your answers to the questions and any other calls; the balance
  and frame tables; the shots; the test count, the build and the pins that
  moved; the lore you added; a `Ledger items` list; and the handle fields
  (branch, last commit, evidence and next).

## Stage 2 handoff (2026-10-15, agent K114 s2)

Items 1-5, 7, 9 and 10 are done; item 6 is measured, not fixed; item 8 is
shot at both sizes in Chrome (no phone pass). Evidence:
`.claude/probes/K114/stage2/` (untracked).

**Commits** (on master 023f780; master's newer 42efe61 is LEDGER.md only):

- 4c6aaac, items 1-2: the controller's `fireL` getter; `fireClock`
  (`fck`, turn | realtime) appended at codec row 146 (CODEC_VERSION stays
  6); the Burn race row "clock".
- 81f9057, items 3-4: `src/game/fire_clock.ts` (FIRE_V_REF 12, FireClock
  at CHASE_HZ 120, at most 30 steps an advance); the controller's realtime
  rules (setFireNow, the departure clock, the standing loss).
- acc2526, item 5: the page (tickFire, fireSet, queued taps, the HUD lead,
  the hook).
- da9a40c: K408, the start marker fades once the fire passes its thread
  point.
- 7ab572e, e85a5cd: lore. eed8974: the Burnt banner names the realtime
  loss.
- The handoff commit: item 6 and 8 results, the COST lore, the probe lore,
  this section.

**Calls.** Q1 (a): the dot runs at v_ref, moveSpeed unused; v_ref = 12
(`vref_probe.mjs`: 11.80 u/s over dailies 1-6 and 3320 run directions,
11.65-12.06 per daily). Q2: one pair for both clocks. Q3: the loss is the
fire reaching you (T(head) <= L); no trapped loss under realtime. Q4:
realtime always queues taps. Q5: `fireClock` survives K323 as a Burn race
row. Mine:

- The clock runs from the first accepted move until the winning move
  lands. It stops at a loss, freezes while the page is hidden, and
  rebuild and restartSolve reset it.
- A replay has no think time (only dailies replay, with the fire off).
- The closest call counts every departure but the first; a standing loss
  makes it 0. For r < 1 nothing catches the dot mid-run (proof in
  gameplay-fire.md).
- The HUD lead writes only on a change; the banner reads "The fire reaches
  you where you stand."
- K408: a 0.25 s WebFade on the explore clock; the gap slot follows the
  target; markersRight skips a faded start.

**Per-frame hunks** (for K5 R2):

- `src/app/frame_loop.ts`: `else if (realtimeFire()) tickFire(dt)` after
  the chase tick, in tickAnim's place; `if (realtimeFire()) fireSet()`
  after keyStep. FrameLoopDeps gains `realtimeFire`, `tickFire`, `fireSet`.
- `src/main.ts`: tickFire and fireSet; fireSet calls setFireNow(L),
  setMoveProgress while the dot moves, and hud.setFireLead every frame.
- `fabric_maze_renderer.ts` drawFire (already called every frame): under
  realtime L = `controller.fireNow`, so its key changes every racing frame.

**Item 5** (`rt_page.mjs still|race`, all pass, desktop and phone size):
the clock is 0 before the first move; it climbs 11.9 a second; lead +
fireL = T(head) on every frame; it advanced 0 over a 2 s hidden tab, then
one capped frame; the loss comes on the first frame the clock reaches T,
3.6-11.4 ms from the prediction; the clock stops; the HUD made 366-387
writes, none of them repeats; Try again resets. The race escapes (13 taps
queued, closest call 836, the HUD matches the hook on every frame); the
tight race (`&fsp=0.95&fdl=0`) escapes at closest call 0.98.

**Item 6** (perf lock; 4 s stand after the first move, seed 7, 1400x900;
ms, means of two runs, A B C then C B A):

| | master turn | turn | realtime |
|---|---|---|---|
| drawFire | 0.10 | 0.10 | 0.19 |
| drawFire, x4 | 0.46 | 0.47 | 1.05 |
| frame loop | 9.5 | 9.5 | 10.1 |
| frame loop, x4 | 40.9 | 39 | 42 |

The attribution run (`perf_attr.ps1`) on this branch only:

| | turn | realtime | no HUD writes | no drawFire |
|---|---|---|---|---|
| frame loop | 9.45 | 10.65 | 10.5 | 10.0 |
| frame loop, x4 | 40.4 | 42.8 | 42.2 | 42.0 |

- drawFire's re-declare costs about 0.6 ms (0.9 at x4) and the HUD
  writes about 0.1.
- About 0.5 ms (1.5 at x4) is unattributed.
- Not a same-burnt-share comparison: the turn stand sits at L 18.7, under
  the delay, while realtime's L runs from 25 to 73.
- No re-declare throttle was added. It would recover at most drawFire's
  share and would step the front.

**Item 7** (`burn_sim_rt.ts`, `proposal.md`, `results_rt*.md`): at zero
think time it reproduces stage 1 exactly. The turn defaults (0.75, 0)
leave about 0.08 s of thinking a decision on the median daily. Proposed
realtime defaults: fireSpeed 0.2, fireDelay 20. That gives a 1.7 s head
start, and the route allows 1.10 s a decision at worst, 1.25 at p10 and
1.48 at the median. At 1 s of thinking the share trapped is explorer 77,
p0.1 35, p0.2 64 and p0.3 83, against the turn defaults' 90/33/61/80. p0.1
by think time 0 / 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 s: 0 / 0 / 3 / 10 / 35
/ 80 / 98%; the route: 0 / 0 / 0 / 0 / 0 / 50 / 97%. Alternatives: Brisk
(0.35, 30), Easy (0.15, 0), Relaxed (0.1, 30), late fast (0.35, 150). The
panel and link ranges (fireSpeed [0.3, 0.95], fireDelay [0, 40]) are too
narrow for these.

**Item 8.** At 1400x900:

- `out_rt_tight/race_7_midrace.png`: mid-race, fire lead 2.3.
- `out_rt_tight/race_7_escaped.png`: despite its name, a standing loss.
  The shot before it was think time.
- `out_rt/still_7_1_burnt.png`: a loss at the start; pre-rebase build
  21241ef.
- `out_rt_mid/`: an early race (the fuse still lit) and the escape.

At 411x753 (`out_rt_phone/`, `out_rt_tight/*_phone_*`): the same set. A
pluck strip in `still_7_phone_1_burnt.png` is probably music mode's auto
pluck; that was not checked, and the tight runs pass `snd=manual`.

**Item 9:** tsc clean; `npm test` 85 files, 1187 passed and 1 skipped;
the build is green. Only the codec pins moved (param_codec.test.ts row 146,
url_codec.test.ts). The golden, K87, the golden dailies and K80_DIGESTS
did not move. New tests: `test/game/fire_clock.test.ts`, plus additions
to `test/game/fire.test.ts`.

**Lore:**

- gameplay-fire.md: REAL-TIME FIRE (the clock, v_ref, losses, banner,
  closest call, COST) and THE START MARKER BURNS.
- gameplay-links.md: FIRE CLOCK PARAM. gameplay-panel.md: FIRE CLOCK ROW.
- render-markers.md: K408. render-shaders.md: the burn rule.
- probes.md: the stage 2 probes. CLAUDE.md structure lines;
  docs/lore_index.md.

**Open after stage 2:**

- Levi: the realtime defaults (proposed 0.2 / 20) and the slider and link
  ranges, or separate realtime defaults.
- The realtime frame cost: about 0.5 ms (1.5 at x4) is unattributed. A
  CPU profile of a turn and a realtime stand at the same burnt share, then
  decide on a throttle.
- maze_stats.ts STATS: the lines for walked and fire lead are false under
  realtime.
- Two "clock" rows: K80's in Maze (turn-based | real time) and the fire's
  in Burn race (turn | realtime). Match the wording, or rename one.
- K408: the gap slot moves in one frame at the fade's start, and the exit
  marker still hides without a fade.
- Item 7 models neither pauses at forced vertices nor queued taps;
  junction think times on real players are unmeasured.
- The realtime replay clock is not synced after a replay (unreachable
  today).
- The phone pass on hardware was skipped.

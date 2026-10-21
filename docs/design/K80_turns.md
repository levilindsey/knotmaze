# K80 turns: the turn-aligned minotaur

K80's minotaur exists today only as its own real-time mode
(`clk=realtime`, stage 1 in 5fed5c1, K174's controls in
ecf2169..6ec8275). Levi also wants it as a modifier of the normal,
turn-based maze: it moves when you move. This brief plans that build in
four stages, one agent each, and details stages 1 and 2.

## What Levi decided

On 2026-10-13 at about 14:31, reviewing `docs/design/K80_gameplay_additions.md`
section 0 (verbatim in `docs/design/levi_notes_2026-10-13.md`, "About
14:31 (K80)"):

- "telegraphing sounds good", and "A param for this is good though"
  (decision 2): the telegraph is on by default, as a param.
- "I think we should have a toggle control to flip whether the minotaur
  moves in realtime in turn-aligned." Real time shipped first as its own
  mode; at about 15:30 the turn-aligned hunter became "a modifier of the
  normal maze, later" (ledger K80).
- "1. I like the movement model variants.": the hunter (section 2.3d),
  with `guard` and `stalker` as variants, and Abbott's rule as a separate
  puzzle mode.
- "3. Ooh, yeah, I like counting captures.": a catch sends you back to
  the entrance and is counted.
- "No undo after being caught, even in free play." and "4. No undo.":
  no move undo while the minotaur is on.
- "5. Good point. Only needed when in the synced-turns mode.": a wait
  move, in this mode only.
- "6. Absolutely.": dead ends stay its hunting ground.
- "7. Let's not worry yet.": no dailies with it yet.

## The stages

- **Stage 1** (merged 2026-10-14 15:19): the model and the mode,
  playable on the desktop. The hunter, guard and stalker; the contact
  rule; the sanctuary and the lair; the telegraph in a first, legible
  look; the wait move; catches; no undo; the params and the panel rows.
- **Stage 2** ("Stage 2: the retune, the catch resets and the stats", at
  the end): Levi's retune (K269) and catch resets (K273), the sliders'
  edge values (K272), real time on today's mazes (K278 (c)), and stats
  and share (section 2.9: catches, close calls, the `x` move kind and
  🐂), with the banner check (K283).
- **Stage 3**: the final telegraph look (section 2.7: chevrons, the
  destination ring, the second run at speed two, tuned at phone fit
  scale), the catch feedback (section 2.8: the flare, the ring burst,
  the dull pluck, `vibrate`; and K270's lavender band after a catch),
  the sound cues and fog interplay (section 2.10), a wait key, the move
  pad's wait and a hover cue for the wait zone, a turn analogue of
  `minoToward` (off by default, so stage 2's rates hold), and a contact
  sheet on desktop and phone for Levi.
- **Stage 4**: Abbott's rule as a puzzle mode, where waiting is part of
  the design (decision 5), with a solvability check at generation and
  Abbott's credit in `RESEARCH` (`notices/credits.ts`, K277).

Dailies come later (decision 7): before one pins a minotaur, waits enter
`fc.taps` and the attempt saves, and K47's fingerprint covers the
minotaur params. The coordinator writes each stage's brief from the
handoff of the stage before it.

## Stage 1: the model and the mode

### The work

1. **The model.** A turn-based minotaur in `src/game/` (in
   `minotaur.ts` beside the real-time code, or its own module if that
   reads better), unit-tested:
   - the movement models of section 2.3: the hunter (2.3d: roams to
     random destinations a few runs away, hunts within sight, checks the
     junction where it last saw you, then roams again), `guard` (the
     hunter with its territory around the exit) and `stalker` (always
     hunting);
   - the rules of section 2.2: one accepted tap is one turn and it moves
     `minoSpeed` runs; simultaneous, continuous contact (same end
     junction, a head-on cross on one run, or arriving where it stands;
     stepping onto the junction it is leaving by another run is safe);
     the telegraph commits its next move at the end of your previous one;
     the sanctuary (the entrance tail: it never enters it and can't see
     you there); its lair at the exit end, never returned to;
   - section 2.6's fairness guarantees, including two runs per move
     forcing the telegraph on;
   - a counter-based RNG on (seed, turn, call), like the research
     harness's `TurnRng`, so the same taps give the same minotaur and a
     game replays from its taps.

   The research harness (`.claude/probes/K80/`: `lib.ts`, `sim.ts`,
   `run.ts`) already implements these rules for its simulations; port
   from it rather than re-deriving.
2. **The mode in play.**
   - Each accepted tap is a turn: its run animates over the same
     duration as yours (section 2.2, "Animation"), and a turn never
     waits for two animations.
   - The wait move: tapping your own junction lets a turn pass, only
     while the turn-aligned minotaur is on.
   - A catch reuses the real-time path: `respawn()`, the counter, the
     HUD's caught row, the toast, and K174's re-fog when `minoRefog` is
     on.
   - No move undo while it is on, as real time's `undoAllowed(clock)`
     does. Section 2.10's Reset path rule (the restart, logged, not a
     catch) applies wherever Reset path exists outside the dailies.
   - The marker, its glow and its off-screen indicator are real time's;
     reuse them, dim while roaming and stronger while hunting.
   - The telegraph, first look: the run it will take next and its
     destination, in red, readable at phone fit scale (threads 4-5 px
     wide). Use what the renderer can already draw cheaply; stage 2
     builds the final look.
3. **Params** (section 2.11), appended to the codec table after the
   last index on master when you start (108 at 5438a60, so yours start
   at 109; the second branch to merge renumbers its appends):
   - `minotaur` (off | hunter | guard | stalker; `abbott` waits for
     stage 3), `minoSpeed`, `minoTelegraph`, and the hunter's behavior
     knobs.
   - Real time already owns `minoRoam`, `minoWake`, `minoDetect`,
     `minoLose`, `minoPauseChance`, `minoDeadEnds`, `minoFog` and others,
     in its own units (distance along threads, seconds). Decide per knob
     whether the turn mode shares it (a meaning and unit that read in
     both clocks) or gets its own (runs, moves), and record each call.
     Fewer shared knobs are better where the meaning carries.
   - How `minotaur` relates to `clock`: under `clk=realtime` the
     minotaur always runs. Make the panel show only the rows that apply
     to the current clock, and record how `minotaur` reads under real
     time (ignored, or picking real time's model later).
   - Not daily-exempt (a design param); off by default, so no link,
     daily or pin moves except the codec table's appended rows.
   - The rows go in the existing Minotaur folder: the mode, speed and
     telegraph first, the rest in a collapsed behavior subfolder.
4. **Check the port against the research.** Run the research harness's
   explorer and lapse players against the shipped module on the same
   mazes, and compare the catch rates to section 0's measurements (for
   example the telegraphed hunter's 13% for an explorer who checks it on
   80% of moves, on dailies). They must match within noise, or the
   handoff explains the difference.

### What must not change

- With `minotaur` off, everything is today's: knot mode's golden
  snapshot (`test/physics/byte_identity.test.ts`), the K87 pin, the
  golden dailies and the daily's design. The codec pin changes only by
  the appended rows.
- The real-time mode (`clk=realtime`) plays as today, K174's controls
  included.
- The paint shader (K76 stage 2a is changing it in parallel): if the
  telegraph needs a shader change, keep it small and say so in the
  handoff.

### What exists (read first)

- `docs/design/K80_gameplay_additions.md`: section 0, then sections 2.2
  to 2.11. Section 2.1 has the measurements.
- `docs/design/K80_realtime.md` (real time's stage 1 brief) and
  `docs/design/K174.md` ("Stage 1 handoff"), for what the real-time code
  already does.
- `src/game/minotaur.ts`, `src/game/fabric_controller.ts`, and the
  Minotaur folder in `src/ui/tweakpane_panel.ts`. The minotaur lore
  (`gameplay-minotaur.md`) loads with them.
- The research harness in the main checkout's `.claude/probes/K80/`
  (`lib.ts`, `sim.ts`, `run.ts`, `run_all.ps1`, `out/`). Copy what you
  reuse into your own probes folder.

### Verification

- `npm test` and `npm run build`.
- Unit tests for each contact case, the sanctuary, the lair, the
  telegraph commit, the wait move, the counter RNG (same taps, same
  minotaur) and each movement model.
- The research comparison in step 4, as a table in the handoff.
- Desktop screenshots with `scripts/diag_screenshot.mjs` (never
  `--virtual-time-budget`): a roaming minotaur, a hunt with its
  telegraph, and the frame after a catch. Read `probes.md` first: a bare
  URL is today's daily, not a fresh design.

### Setup

- Your branch starts from master.
- Link `node_modules` to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`).
- Ports 5690-5699. Give your vite server a private cacheDir.
- Any Chrome you launch gets its own `--user-data-dir` inside your probes
  folder. Delete it when you are done (K161).
- Probes, logs and notes go in `.claude/probes/K80/turns/` (untracked;
  the coordinator copies them at the merge).
- Hold the perf lock (`$env:TEMP\claude-perf.lock`) for any frame-time
  measurement, waiting for it inside one blocking command.
- Running alongside you:
  - K76 stage 2a: the paint shader (`src/render/paint_*`) and a new
    `src/game/explore_view.ts`;
  - K198 stage 2: main.ts, the edge indicators and the panel. You will
    both touch main.ts and the panel; the second to merge rebases.
- If you start helpers, give each `model: sonnet` and this brief's stop
  rule.

### Process

- One stage. Run `Get-Date` at the start and at each milestone. Commit
  WIP on your branch at every milestone, and never push. Don't edit
  `LEDGER.md`.
- Lore goes in `gameplay-minotaur.md` (the turn rules, the params and
  how they share with real time), or a new topic file with narrow
  `paths:` and a row in `docs/lore_index.md`.
- Stop when the stage is done or at your time cap, whichever comes
  first. The cap is two hours on Opus, unless your launch prompt sets
  another. Neither a compaction nor context size is a stop. After a
  compaction, re-read this brief and `git log`, then go on.
- At the stop:
  - commit WIP;
  - append a "Stage 1 handoff" section to this brief, covering what is
    done, what is next, evidence paths and "For stage 2" notes;
  - commit it and report.

  Start nothing beyond this stage.
- The final report covers:
  - what changed and where;
  - your calls (each shared or separate knob among them);
  - the verification results, with the research comparison table;
  - a `Ledger items` list: follow-ups, residuals, decisions for Levi;
  - the handle fields: branch, last commit, evidence, next.

## Stage 1 handoff

2026-10-14, the K80 turns agent; branch
`worktree-agent-af5995f5900f0f945` (d17a0ec, 4fdacf8, 0ad8931, 1e4c02b,
056dae8 and this commit), rebased onto master 6588ec0, never pushed. The
stage is done.

Done:
- The model: `src/game/minotaur_turns.ts`, its own module, ported rule
  for rule from the research harness (`lib.ts`, `sim.ts`) onto the
  shipped ChaseGraph plus a run-count hop matrix. `TurnGraph`, `decide`
  (hunter, guard, stalker), `contact`, `TurnRng` (counter-based on seed,
  turn and call), `TurnMinotaur` (commit, telegraph, `turn(edge)` with
  -1 a wait, catches, respawn), `turnConfig`, `telegraphOn`, `turnSeed`.
  A walk edge id is the chase edge index; candidates sort by run id.
  `minotaur.ts` gained `undoAllowed(clock, minotaur)`.
  `test/game/minotaur_turns.test.ts`, 30 cases: every contact case, the
  RNG, params to config (the forced telegraph), undo, TurnGraph on real
  mazes, each model, commit-then-take, the sanctuary and the lair, the
  catch and the wait, replay from taps, reactive play without the
  telegraph, two runs in one move.
- Play (`main.ts`): one accepted tap is one turn, and the minotaur's run
  animates over your move's duration (`tickTurnMino`). The wait is a tap
  on your own junction, taken in `onHead` before run hit-testing: within
  max(1.5 x markerRadius, 0.9 world) of it, and nearer than any tappable
  sample of a choice (`FabricMazeRenderer.runDistance`, which skips each
  run's 0.7-ctrl head zone). A catch lands at the tap that makes it and
  reuses real time's path: respawn, the counter, the HUD's caught row,
  the toast, the re-fog under minoRefog. No undo; Reset path restarts
  the solve (`resetPathAction` treats `turnMino` as it treats `chase`).
  The marker, glow and indicator are real time's, through
  `syncMinotaur`: lair, wander dim, hunt strong. Hooks:
  `__knotTurnMino()`, `__knotTurnMove(edge)`, `__knotTurnWait()`,
  `__knotTurnMinoObj()`.
- The telegraph, first look (`FabricMazeRenderer.drawTelegraph`): a red
  line (0xff2418) along each committed run from the junction it leaves,
  and a ring where the turn ends (around the minotaur when it stays). A
  pixi Graphics on minoLayer, so minoFog covers it; not drawn while the
  runs animate. No shader change.
- Params, appended at codec v5 108-116, not daily-exempt:

  | Param | Key | Default | Max |
  |---|---|---|---|
  | `minotaur`: off, hunter, guard, stalker | `mt` | off | |
  | `minoSpeed`: half, one, charge, two | `msp` | one | |
  | `minoTelegraph` | `mtg` | on | |
  | `minoSight` (runs) | `msi` | 4 | 20 |
  | `minoRoamRuns` | `mro` | 8 | 30 |
  | `minoTerritory` (runs) | `mtr` | 6 | 20 |
  | `minoAccuracy` | `mac` | 0.9 | 1 |
  | `minoPause` | `mpa` | 0.1 | 1 |
  | `minoSleep` (turns) | `msl` | 0 | 99 |

- The codec renumbering: K111 stage 3 (6588ec0) removed highlightMode
  (108) and made the codec v5, so after the rebase the nine appends sit
  at 108-116 instead of 109-117. The table pin is re-frozen in 4fdacf8,
  and the lore line follows in 056dae8.
- Panel: the Minotaur folder shows on both clocks in fabric mode, each
  clock with its own rows. On the turn clock, `minotaur`; while it is on,
  speed, telegraph and the collapsed "Minotaur behavior" subfolder (roam
  for the hunter only, territory for the guard only). Real time's rows
  show under clk=realtime only. minoFog and minoRefog show while either
  minotaur runs with the fog on, the indicator row while either runs.
  Undo (`undo_stack.ts`): `onTurnMinoChange` re-applies the tuning live;
  `onClockChange` now covers `minotaur` too (a restart).
- Lore: `gameplay-minotaur.md` (THE TURN-ALIGNED MINOTAUR), `probes.md`
  (a K80 turns line), rows in `lore_index.md` and `gameplay.md`.

Calls:
- Its own module, an exact port. Deviations from the harness, none of
  them reached by the research configs: a run onto the exit END always
  wins, even with the minotaur still in its lair (the harness calls that
  a catch); a waiting player is caught when the minotaur's path touches
  their junction; the stalker charges within sight; the RNG keys on the
  game's turns while sleep and half-speed parity count `lifeTurn`, so a
  second life does not replay the first; a catch is immediate, with no
  animated catching move.
- Knobs: hunter = prox, roaming to junctions min(3, roam)..roam runs
  away; guard = prox around the exit's junction, 1..territory runs;
  stalker = chase. In every model accuracy is the chance of a best step
  while it hunts, pause the chance it stands still a turn, sight the
  hunt range (it gives up beyond sight + 3) and sleep the turns it waits
  in its lair first. Speed charge and two force the telegraph on
  (section 2.6).
- Separate from real time, in runs and turns: sight, roam, territory,
  accuracy, pause, sleep (real time's are distances and seconds). Shared:
  minoFog, minoRefog and the minotaurIndicator setting. `minotaur` is
  ignored under clk=realtime, where its rows hide.
- Shown mode: lair until it leaves; hunt when the stalker sees you or
  the prox mode is non-zero; wander otherwise.
- A wait is not recorded in `fc.taps`, and there is no wait key yet.

Verification (on the rebased branch unless noted):
- `npm test`: 66 files passed, 1 skipped; 865 tests passed, 1 skipped.
  `npm run build` exits 0 (the old chunk-size warning); tsc is clean.
- With `minotaur` off: byte_identity, the K87 pin, the golden dailies
  and the daily's design pass unchanged; the codec pin changed only by
  the nine appended rows.
- Real time unchanged: K174's page probe, seed 7: panel 13 ok, refog 8
  ok, fogmodes 6 ok.
- `turns_page.mjs`, headed Chrome in real time with real clicks, stands
  in for `diag_screenshot.mjs` (which only loads and settles a URL) for
  the roam, the hunt with its telegraph and the frame after a catch:
  hunter 7 passes all 14 checks, 20 clicks, 0 fallbacks, frames stamped
  056dae8. Before the rebase: hunter 7 and 11, guard 7, stalker 7, and
  hunter 11 at 411x753 touch, all ok. At phone fit scale the hunt
  telegraph is visible but thin (about a thread wide); the lair
  telegraph traces the whole exit run.
- The research comparison (`compare.ts`): the harness and the module
  play 9600 games (80 designs x 5 configs x 3 players x 8 reps) with 0
  trace mismatches, the same before and after the rebase. % caught,
  section 0 / harness today / module today. explorer80 is the lapse
  player (it checks the telegraph on 80% of moves). hunter/T = the
  defaults, hunterBurst/T = speed charge, guard/T = the guard, chase1/T
  = the stalker at accuracy 1 and pause 0, stalker/T = the stalker's
  defaults (no section 0 row).

  | config | set | explorer | explorer80 | explorerFog4 |
  |---|---|---|---|---|
  | hunter/T | daily | 1 / 14 / 14 | 13 / 32 / 32 | 11 / 30 / 30 |
  | hunter/T | treelike | 11 / 6 / 6 | 27 / 19 / 19 | 18 / 16 / 16 |
  | hunter/T | deadends | 3 / 16 / 16 | 18 / 33 / 33 | 13 / 35 / 35 |
  | hunterBurst/T | daily | 3 / 26 / 26 | 19 / 43 / 43 | 16 / 40 / 40 |
  | hunterBurst/T | treelike | 19 / 16 / 16 | 31 / 29 / 29 | 27 / 27 / 27 |
  | hunterBurst/T | deadends | 9 / 33 / 33 | 23 / 43 / 43 | 25 / 46 / 46 |
  | guard/T | daily | 1 / 23 / 23 | 18 / 41 / 41 | 13 / 38 / 38 |
  | guard/T | treelike | 10 / 12 / 12 | 23 / 26 / 26 | 21 / 23 / 23 |
  | guard/T | deadends | 4 / 18 / 18 | 23 / 43 / 43 | 19 / 41 / 41 |
  | chase1/T | daily | 3 / 32 / 32 | 20 / 43 / 43 | 12 / 45 / 45 |
  | chase1/T | treelike | 23 / 16 / 16 | 43 / 29 / 29 | 33 / 19 / 19 |
  | chase1/T | deadends | 8 / 33 / 33 | 23 / 50 / 50 | 28 / 48 / 48 |
  | stalker/T | daily | - / 20 / 20 | - / 41 / 41 | - / 39 / 39 |
  | stalker/T | treelike | - / 13 / 13 | - / 26 / 26 | - / 24 / 24 |
  | stalker/T | deadends | - / 20 / 20 | - / 39 / 39 | - / 39 / 39 |

  The port matches the harness exactly; today's rates differ from
  section 0 because the mazes have changed since. Mean structure,
  section 0 -> today: the dailies' ends 2.0 -> 5.9, pocket vertices
  14.6 -> 40.8, bridges 2.8 -> 7.3, cycle rank 102.3 -> 89.4, optimal
  length 81.5 -> 89.6; cycle rank 102.1 -> 88.2 (treelike) and 102.8 ->
  90.3 (deadends). Today's daily is gridSize 18 with dead ends on
  (density 0.5, length 20).

Next:
- A decision for Levi: on today's mazes the default hunter catches an
  attentive explorer on 14% of dailies (section 0: 1%) and an 80%
  attentive one on 32% (section 0: 13%). Retune the defaults (sight,
  accuracy), change the designs it is tuned on, or accept.
- Stage 2, per "The stages".

For stage 2:
- Catch feedback (2.8): stage 1 catches at the tap, with no animated
  catching move. A transient lavender band shows at the catch site
  (probably a fade; not diagnosed).
- The final telegraph (2.7): chevrons, the destination ring, the second
  run at speed two; tune it at phone fit scale, where today's line is
  about a thread wide.
- Stats and share (2.9): catches as the `x` move kind and 🐂, close
  calls, sightings; log the Reset-path restart (2.10).
- Attempts: waits are in neither `fc.taps` nor attempt saves, so a
  restore would diverge from the model's inputs; K47's fingerprint must
  cover the minotaur params before a daily pins one (decision 7).
- A wait key, a move-pad wait button and a hover cue for the wait zone;
  a turn analogue of minoToward.
- Fog interplay (2.10): the glow through fog, footsteps, the telegraph
  only where visible. K76's explore view: `syncMinotaur` hides the
  minotaur until revealQuery >= 0.98, and the telegraph is unchecked
  against that view.
- Edge values: roam 0 stands still while roaming; territory 0 is a
  random walk.
- Sound cues (2.10) and the contact sheet for Levi, desktop and phone.

Evidence (untracked, `.claude/probes/K80/turns/`; the coordinator copies
it):
- `compare.ts` with its harness copies (`lib.ts`, `sim.ts`) and
  `vite.node.config.mjs` (the run command is in its header);
  `compare.md` (before the rebase) and `compare_rebased.md`.
- `turns_page.mjs` (usage in its header; `PHONE=1` for 411x753 touch),
  `turns_page_*.log`, `shots/` (`shots/rebased/` for the rebased run).
- `k174_page.mjs` (K174's probe; its links are now a bare seed, since
  `.J` is a v4 token), `k174_rt_*.log`, `k174_rt/`, `k174_rt_rebased/`.
- `npm_test*.log`, `build*.log`; `vite.private-cache.config.ts` serves
  the worktree.

## Stage 2: the retune, the catch resets and the stats

Written 2026-10-14 by the coordinator from the stage 1 handoff and
Levi's answers since. Stage 2 took Levi's retune and catch resets, so
the telegraph's final look, the catch feedback, the sound and the
contact sheet moved to stage 3 ("The stages").

### What Levi decided since stage 1

- About 15:34, on stage 1's catch rates (ledger K269): "Retune."
- About 15:46 (K273): "We should also have a toggle to conditionally
  reset the level/Minotaur/fog when dying to the Minotaur."
- About 16:01 (K274, merged): the end banner's info button explains
  each stat. Every stat row now needs its line in `STATS`
  (`src/game/maze_stats.ts`); a test fails without one.

### The work

1. **The retune (K269).** On today's mazes the default hunter catches
   an attentive explorer on 14% of dailies and an 80% one on 32%,
   against section 0's 1% and 13%. Retune the turn defaults (sight and
   accuracy first; pause or roam only if those two cannot get there)
   until the default hunter on today's dailies lands near 1% and 13%
   again, with `compare.ts`'s players. Measure on the mazes
   `PARAM_DEFAULTS` builds at your start (K74 stage 2's H1 is on).
   Sight, accuracy and pause are shared by the three models, so report
   the full table after the retune (every config, set and player, as
   stage 1's) with the guard and the stalker at the new defaults. If a
   target costs the hunter its teeth elsewhere (treelike, deadends),
   stop at the best compromise and say what it costs.
2. **Real time on H1 mazes (K278 (c)).** `test/game/minotaur.test.ts`
   builds K174's mazes with `hCutShare: 0`: on H1 mazes roamPull's gain
   (a still player found 0.8x as fast) misses its bound, 45.11 against
   44.57. Measure the pull on today's default mazes with K174's sim
   (`.claude/probes/K174/rt/`), then retune `minoToward`'s strength or
   re-derive the bound from the measurement, and lift the pin. The
   K80_DIGESTS may be re-frozen on today's mazes (pre-launch; name it in
   the commit). Say which you did and why.
3. **Catch resets (K273), on both clocks.** Today a catch sends you to
   the entrance with an empty path (counted; the clock runs on), the
   minotaur to its lair, and the fog back to the solve's start under
   `minoRefog` (on). Make each of the three a toggle in the Minotaur
   folder:
   - the level: off is today's respawn; on is the burn race's restart
     (`restartSolve()` in `src/main.ts`, then `updateHud()`);
   - the minotaur: on is today's lair; off leaves it where it caught
     you;
   - the fog: `minoRefog`, as today.
   While the level row is on, a restart resets everything, so the other
   two rows hide. The catch count must survive a level restart (section
   2.8's "the catch count is the sting"); whether the clock restarts
   follows `restartSolve()`, and the handoff says which. Defaults keep
   today's behavior. Each new param is appended to the codec (below).
4. **Edge values (K272).** Roam 0 stands still while roaming, and
   territory 0 is a random walk. Make each slider's minimum 1, or define
   0 on purpose, and say which.
5. **Stats and share (section 2.9).** On the turn clock: catches, close
   calls (moves ending one run from it) and seen (moves it spent hunting
   you); on real time, whatever of these maps (it has caught and chased
   today). A Reset path under the minotaur is a restart, counted and
   not a catch (section 2.10). The move log's fourth kind, `x` (the move
   you were caught on), shows as 🐂 wherever the move grid shows (the
   banner, a share), and the title line adds "🐂 2" or "🐂 0 · 5 close
   calls". Efficiency stays optimal / your final route. Each new stat
   gets its `STATS` line, so the banner's "What the numbers mean" list
   explains it.
6. **The banner check (K283).** After item 5, the real game's end
   banners from live solves: `.claude/probes/K155/probe_stars.mjs`
   (design, design:phone, daily, caught, realtime; its aria check
   expects "how stars and stats work"), plus a turn-minotaur solve with
   a catch. Copy the probe into your folder. Run it under the perf lock
   and put the screenshots in the handoff.

### What must not change

- With `minotaur` off on the turn clock, everything is today's: knot
  mode's golden snapshot (`test/physics/byte_identity.test.ts`), the
  K87 pin, the golden dailies and the daily's design. The codec pin
  changes only by appended rows, and the defaults pin only by the
  retune's values (name each in the commit).
- No undo while a minotaur runs, on either clock (Levi, decision 4).
- The paint shader: if a stat needs a shader change, stop and say so in
  the handoff instead.

### What exists (read first)

- This brief's "Stage 1 handoff" (above). In
  `docs/design/K80_gameplay_additions.md`: section 0, then sections 2.8
  to 2.11.
- `docs/design/K274_K277.md` ("Stage 1 handoff"): the `STATS` table
  and the banner's list.
- `src/game/minotaur_turns.ts`, `src/game/minotaur.ts`,
  `src/game/maze_stats.ts`, `src/game/share_text.ts`,
  `src/ui/maze_hud.ts`, the Minotaur folder in
  `src/ui/tweakpane_panel.ts`, and `restartSolve()` in `src/main.ts`.
  The minotaur, fire and fog lore attach with them.
- In the main checkout: `.claude/probes/K80/turns/` (`compare.ts` and
  its harness copies; the run command is in its header) and
  `.claude/probes/K174/rt/` (`rt_lib.ts`, `rt_sweeps.ts`,
  `results.md`). Copy what you reuse into your own probes folder.

### Verification

- `npm test` and `npm run build`.
- Unit tests: each reset toggle on both clocks (what moves and what
  stays, the catch count across a level restart), the edge values, each
  new stat on scripted turn games, the `x` move kind and the share text
  with 🐂.
- The retune table, before and after, and real time's pull measurement
  on today's mazes, in the handoff.
- K283's banner shots (item 6), under the perf lock.

### Setup

- Your branch starts from master. Run `git log -1 --oneline` first: if
  this section is missing, `git merge --ff-only origin/master`.
- Link `node_modules` to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`).
- Ports 5760-5769. Give your vite server a private cacheDir (see
  `probes.md`; K80's wrapper loads the config through vite's
  `loadConfigFromFile`).
- Any Chrome you launch gets its own `--user-data-dir` inside your probes
  folder. Delete it when you are done (K161).
- Probes, logs and notes go in `.claude/probes/K80/turns2/` (untracked;
  the coordinator copies them at the merge).
- Hold the perf lock (`$env:TEMP\claude-perf.lock`) for any frame-time
  measurement and any pixel-exact GPU probe, waiting for it inside one
  blocking command.
- The codec: append after the last index on master at your start. K279
  (plucks) appends from 121 in parallel; whoever merges second
  renumbers and re-freezes the table pin.
- Running alongside you: K268 stage 1 (the gap mask and paint), K279
  stage 1 (plucks: the pluck overlay, the synth, the panel and the
  codec). Both should merge before you do; rebase on master before your
  final `npm test`.
- If you start helpers, give each `model: sonnet` and this brief's stop
  rule.

### Process

- One stage. Run `Get-Date` at the start and at each milestone. Commit
  WIP on your branch at every milestone, and never push. Don't edit
  `LEDGER.md`.
- Lore goes in `gameplay-minotaur.md` (the retune's numbers, the reset
  toggles, the new stats), `gameplay-stars.md` or `gameplay-daily.md`
  if the share text changes there.
- Stop when the stage is done or at your time cap, whichever comes
  first. The cap is two hours on Opus. Neither a compaction nor context
  size is a stop. After a compaction, re-read this brief and `git log`,
  then go on.
- At the stop:
  - commit WIP;
  - append a "Stage 2 handoff" section to this brief, covering what is
    done, what is next, evidence paths and "For stage 3" notes;
  - commit it and report.

  Start nothing beyond this stage.
- The final report covers:
  - what changed and where;
  - your calls;
  - the verification results, with the retune table;
  - a `Ledger items` list: follow-ups, residuals, decisions for Levi;
  - the handle fields: branch, last commit, evidence, next.

## Stage 2 handoff

2026-10-14, the K80 turns stage 2 agent; branch
`worktree-agent-a1579d5c460af2d20` (c9529c6, c540aef, 496c64d, 60e60ae,
bbc333e and this commit), rebased onto master 2409cb9, never pushed. The
stage is done: items 1-6.

Done:
- The retune (K269): `DEFAULT_TURN_MINO` (`src/game/minotaur_turns.ts`)
  goes from sight 4 and accuracy 0.9 to sight 2 and accuracy 0.3. Pause
  0.1, roam 8, territory 6 and sleep 0 stay. The defaults pin
  (`test/ui/url_codec.test.ts`) moved by minoSight and minoAccuracy only.
- Real time on H1 mazes (K278 (c)): `test/game/minotaur.test.ts` runs
  K174's tests on today's mazes, without the `hCutShare: 0` pin.
  roamPull stays 0.5. The still-player test keeps its 0.8 bound on a
  wider sample: mazes 100-119 x 6 seeds instead of mazes 3, 17 and 42.
  K80_DIGESTS are re-frozen on today's mazes; the roamPull 0 path is
  unchanged.
- Catch resets (K273), on both clocks. Two params, appended to the codec
  and not daily-exempt:

  | Param | Key | Codec | Default | Changed |
  |---|---|---|---|---|
  | `minoRestart` | `mrs` | 128 | off | on: a catch restarts the level |
  | `minoLair` | `mlr` | 129 | on | off: the minotaur stays where it caught you |

  - minoRestart on: a catch runs `restartSolve(true)` and then
    `updateHud()` (main.ts `turnCaught` and `tickChase`). The path, the
    fog and the fuse reset, and a new minotaur starts in its lair with
    the old one's tallies (`carry()`: catches, close calls, seen,
    chased, restarts). The toast reads "Caught! Starting over." ("Caught
    N times." after the first). `__knotFabric().restarts` rises by one,
    since restartSolve calls `fabricController.reset()`.
  - THE CLOCK RESTARTS with the level: restartSolve calls resetAttempt,
    whose clock.reset leaves it idle until the next move. A banner's time
    after such a catch is the last life's.
  - minoRestart off is today's respawn: `fc.markCaught`, then
    `fc.respawn(minoRefog)`, and the toast "Caught! Back to the
    entrance.". A respawn does not count a restart.
  - minoLair off, on the turn clock: the minotaur stays at the vertex
    where its turn ended, out of its lair (`left` true), wandering (mode
    0), with lifeTurn 0, so minoSleep applies again there. On real time
    it keeps its Spot, even mid-run, and waits `wake` seconds there.
  - Panel, the Minotaur folder: both rows show while either clock's
    minotaur runs. minoLair and minoRefog hide while minoRestart is on.
- Edge values (K272): minoRoamRuns and minoTerritory start at 1
  (`MINO_RUNS_MIN`, url_state.ts) in the panel, the codec reader and the
  key=value readers; garbage reads 1. Zero got no meaning.
- Stats and share (section 2.9):
  - The turn minotaur counts close calls and seen. A close call is a move
    (no catch, no win) that ends off the start, one run from a minotaur
    out of its lair. Seen counts the turns it spent hunting you, the
    turns its marker glows red. Real time keeps caught and chased; it
    has no close calls and no seen.
  - A Reset path under either clock's minotaur, after a move and with the
    run unsolved, counts a restart, not a catch. The restarts row shows
    only above 0.
  - `STATS` gained close calls, seen and restarts, so the banner's "What
    the numbers mean" explains each. Caught's line now names the level
    reset.
  - The move log's fourth kind, `x` (the move you were caught on), is
    🐂 (U+1F402) in the share grid. The share title adds the minotaur
    tag (`share_text.ts` `minotaurTag`): `· 🐂 N`, or `· 🐂 0 · N close
    calls` when it never caught you (turn clock only).
  - The stars rate walkedDist with the catches whenever a minotaur runs:
    the rules line adds ", never caught", and any catch caps the stars at
    two.
- Tests: the retuned defaults; seen and close calls on scripted turn
  games; lair off on both clocks; the tallies carried to a restart on
  both clocks; the `x` move; the share tag with 🐂; roam and territory
  of at least 1; the new rows' `STATS` lines (`maze_hud.test.ts`). The
  level restart itself lives in main.ts, so the page probe checks it
  (item 6).
- Lore: `gameplay-minotaur.md` (STAGE 2'S RETUNE, RE-MEASURED ON H1,
  CATCH RESETS), `gameplay-links.md` (CATCH RESET PARAMS),
  `gameplay-stars.md`, `gameplay-daily.md` and `probes.md`.
- The codec: the rows were 121-122 until the rebase onto K279 (2409cb9),
  which appended 121-127 first. The messages of 496c64d and 60e60ae
  still say 121-122. The table pin is re-frozen at 128-129. K111 stage 4
  also appends from 128, so whichever branch merges second renumbers.

Calls:
- The retune moved sight and accuracy only. Sight 1 with accuracy 0.65
  came close (1.6% and 11.8%), but at sight 1 the hunter hunts only when
  you are adjacent, so I rejected it. Sight 2 with accuracy 0.3 lands on
  both targets: 1.0% and 13.1% at 64 reps (`sweep_fine64.md`).
- The cost of the retune: sight and accuracy are shared by the three
  models. The hunter falls below section 0 on the treelike and dead-ends
  sets (treelike, explorer80: 8% against 27%), and the stalker lost the
  most (dailies, explorer: 20% to 1%). Per-model accuracy would give each
  model its own teeth, a decision for Levi.
- Real time: I re-derived the bound's sample rather than retuning
  minoToward. On today's mazes K174's sim moves as it did before H1, so
  roamPull 0.5 still does its job. The test's three mazes read 0.81 on
  H1 mazes by maze-to-maze noise: one maze's ratio ranges 0.40-1.06.
- The clock follows `restartSolve()`: it restarts.
- Roam and territory: a minimum of 1, not a meaning for 0.
- The 🐂 shows only in the share grid: the win banner has no move grid.

Verification (on the rebased branch):
- tsc is clean. `npm test`: 71 files passed, 1 skipped; 934 tests
  passed, 1 skipped. `npm run build` exits 0.
- The research comparison (`compare_after.ts`): the harness and the
  module play 9600 games with 0 trace mismatches at the new defaults.
  % caught at 8 reps, the module's column: section 0 / this stage's
  start (H1 on, `compare_before.md`) / after (`compare_after.md`).
  chase1/T does not move: its overrides are accuracy 1 and pause 0.
  `compare_rebased.md` is stage 1's table, from before H1.

  | config | set | explorer | explorer80 | explorerFog4 |
  |---|---|---|---|---|
  | hunter/T | daily | 1 / 18 / 2 | 13 / 36 / 13 | 11 / 35 / 13 |
  | hunter/T | treelike | 11 / 9 / 2 | 27 / 23 / 8 | 18 / 21 / 8 |
  | hunter/T | deadends | 3 / 13 / 2 | 18 / 26 / 10 | 13 / 29 / 13 |
  | hunterBurst/T | daily | 3 / 32 / 2 | 19 / 46 / 18 | 16 / 44 / 15 |
  | hunterBurst/T | treelike | 19 / 23 / 2 | 31 / 35 / 13 | 27 / 34 / 12 |
  | hunterBurst/T | deadends | 9 / 33 / 3 | 23 / 43 / 13 | 25 / 47 / 13 |
  | guard/T | daily | 1 / 18 / 3 | 18 / 39 / 19 | 13 / 39 / 22 |
  | guard/T | treelike | 10 / 13 / 1 | 23 / 33 / 16 | 21 / 24 / 11 |
  | guard/T | deadends | 4 / 14 / 3 | 23 / 30 / 15 | 19 / 30 / 16 |
  | chase1/T | daily | 3 / 50 / 50 | 20 / 60 / 60 | 12 / 62 / 62 |
  | chase1/T | treelike | 23 / 18 / 18 | 43 / 33 / 33 | 33 / 36 / 36 |
  | chase1/T | deadends | 8 / 29 / 29 | 23 / 42 / 42 | 28 / 45 / 45 |
  | stalker/T | daily | - / 20 / 1 | - / 43 / 20 | - / 41 / 22 |
  | stalker/T | treelike | - / 15 / 1 | - / 37 / 13 | - / 29 / 17 |
  | stalker/T | deadends | - / 16 / 1 | - / 36 / 18 | - / 36 / 17 |

- Real time on the mazes of 2026-10-14, before K74 stage 3's
  trap-zone finish (9ccf360). K637 (2026-10-20) measured that finish
  raising the greedy catches to 2.19 / 2.38 / 2.50 / 2.93 / 3.25, with
  fleers escaping 50-55% and 75-78% queued
  (`.claude/probes/K637/results.md`). The 2026-10-14 numbers (K174's
  sim, 288 seeds x 3 reps, `rt/results.md`), by roamPull 0 / 0.25 /
  0.5 / 0.75 / 1:
  - the greedy player's catches: 1.29 / 1.47 / 1.66 / 1.73 / 2.02 (K174
    before H1: 1.32 at 0, 1.68 at 0.5, 1.94 at 1);
  - the greedy player spotted: 57 / 61 / 61 / 65 / 65%;
  - fleers escape 54-58%, and 75-77% with queued taps.
  - The still player (`rt/still.md`): pull 1 finds them in 0.69 of pull
    0's time on 40 mazes x 12 seeds, with H1 on or off. Windows of 20
    mazes x 6 seeds read 0.60-0.74 (`rt/still_windows.md`). The test's
    sample reads 65.6 s against 43.9 s (0.67).
- The banner check (K283), under the perf lock: `banner/probe_stars.mjs`
  in a headed, off-screen, hardware-GPU Chrome with real taps, against
  the worktree's dev server. Checks passed, by run: design 16, design at
  411x753 touch 16, daily 32, caught 18, realtime 17, turnmino 21 and
  turnmino with `&mrs=1` 21; no page errors.
  - The first daily run failed one check that has been stale since K146:
    it expected today among the History rows, but today keeps its own
    row above them. The probe now expects History without today and
    counts today in the aggregate; the re-run passed.
    `daily_first_run.log` keeps the failure.
  - turnmino (seed 7, the hunter): caught once, with the toast "Caught!
    Back to the entrance.", and the restart count unchanged (1 -> 1).
    The banner rows read caught 1, close calls 0 and seen 11. The stars
    are two (3.0x the shortest route, capped by the catch). The title is
    `Knotmaze 🧶 ★★☆ · 🐂 1`, and the grid shows 🐂 on the catch move.
  - turnmino with `&mrs=1`: the toast "Caught! Starting over.", and the
    restart count goes 1 -> 2. The banner keeps caught 1 and seen 3
    (carried) and shows time 0:10, the last life's. The grid starts over
    with no 🐂. The stars rate only the last life's walk (900 against
    886) capped at two, while the popover says "the walk before it
    counts too" (see For stage 3).
  - Screenshots in `banner/shots/`: `<run>_1_banner.png` (the banner;
    `_crop` beside it), `<run>_2_banner_why.png` (the popover open),
    `turnmino_0_caught.png` and `turnmino_restart_0_caught.png` (the
    frame after the catch), `daily_3_stats.png` to `daily_5_stats_
    history.png`, and each run's `report.json`.

Next:
- Stage 3, per "The stages".
- A decision for Levi: per-model accuracy (Calls).

For stage 3:
- The win banner has no move grid, so the 🐂 shows only in the share
  grid, and only with minoRestart off: under it a catch restarts the
  level, whose reset empties the log. The title's tag counts either way.
- Under minoRestart the stars rate only the last life's walk (reset()
  zeroes the walked meter), so the popover's "the walk before it counts
  too" is wrong there (the `&mrs=1` banner run shows it).
- With minoLair off the minotaur can camp the first junction past the
  entrance (the start is a sanctuary, so it waits there).
- markCaught on an empty move log pushes `x`, so the move count reads 1.
- The minoSleep tooltip ("in its lair … after each catch") is wrong with
  minoLair off.
- Real time has no close calls or seen; nothing maps cleanly yet.
- A Reset path restart has no toast.
- Roam 0 as a "sentry" (stands guard while it roams) is an idea, not
  built.
- K155's probe expects 4 rules lines in the stars popover, stale since
  K274 appended the stat lines; this stage's copy splits at
  `km-lines-head`.

Evidence (untracked, `.claude/probes/K80/turns2/`; also copied to the
main checkout):
- The retune: `sweep.ts`, `sweep_coarse.md`, `sweep_fine.md`,
  `sweep_fine64.md`; `full_before.md`, `full_s2a03.md` (the pick) and the
  rejected `full_s1a06.md`, `full_s1a065.md`, `full_s2a04.md`,
  `full_s2a05.md`; `compare.ts`, `compare_after.ts`, `compare_before.md`,
  `compare_rebased.md`, `compare_after.md`, with `sim.ts`, `lib.ts` and
  `vite.node.config.mjs` (run commands in the headers).
- Real time: `rt/` (`results.md`, `still.md`, `still_windows.md`, the
  jsonl rows, `still.ts`, `still_windows.ts`).
- The banner check: `banner/` (`probe_stars.mjs`, `run_batch.ps1`, the
  logs, `shots/` with each run's report.json).
- `npmtest.log`, `build.log`, `tsc.log`; `vite.private-cache.config.ts`
  serves the worktree.

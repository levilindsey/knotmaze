# K80 turns: the turn-aligned minotaur

K80's minotaur exists today only as its own real-time mode
(`clk=realtime`, stage 1 in 5fed5c1, K174's controls in
ecf2169..6ec8275). Levi also wants it as a modifier of the normal,
turn-based maze: it moves when you move. This brief plans that build in
three stages, one agent each, and details stage 1.

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

- **Stage 1** (below): the model and the mode, playable on the desktop.
  The hunter, guard and stalker; the contact rule; the sanctuary and the
  lair; the telegraph in a first, legible look; the wait move; catches;
  no undo; the params and the panel rows.
- **Stage 2**: the final telegraph look (section 2.7: chevrons, the
  destination ring, the second run at speed two), the catch feedback
  (section 2.8: the flare, the ring burst, the dull pluck, `vibrate`),
  the sound cues (section 2.10), stats and share (section 2.9: catches,
  close calls, the `x` move kind and 🐂), fog interplay (section 2.10),
  and a contact sheet on desktop and phone for Levi.
- **Stage 3**: Abbott's rule as a puzzle mode, where waiting is part of
  the design (decision 5), with a solvability check at generation.

Dailies come later (decision 7). The coordinator writes each stage's
brief from the handoff of the stage before it.

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

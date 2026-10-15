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

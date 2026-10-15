# K323: the Game folder, the game-mode dropdown and knot mode's removal

Design only (2026-10-14, no code). Written against master `b72d5dd`; line
numbers below are from that commit. Companion: `K324_realtime_minotaur.md`
(the real-time minotaur's telegraph, junction pauses and controls). Knot
mode's removal is K326; its design is section 4 here.

## Levi's words (2026-10-14 PDT, as relayed)

- 22:05: "I finally found the setting to turn on the minotaur. I was
  expecting something like "gameMode" with dropdown values like
  classic/minotaur/..., and then with a additional conditionally-shown
  mode-specific controls like a realtime checkbox. Also, with realtime, we
  can still telegraph the minotaur's next move. Also, there should be at
  least a small pause of the minotaur at each junction, but with some
  random variance. We should have a lot of param controls for the minotaur
  actually. Probably "Game" or "Gameplay" or "Game mode" should be a
  separate group."
- 22:06: "Do we have other game modes supported right now other than
  realtime minotaur and vanilla maze? I thought we had an turn-based
  minotaur version too?"
- 22:10: "mazeFabric should go away and become another "gameMode" option.
  And it should be renamed to be clearer that it's just the threads, with
  no actual game. Actually, let's get rid of it entirely"
- 22:11: "indicatorSize and markerSize sound the same"

The answer to 22:06: yes. Four modes play today: the classic maze, the
turn-based minotaur (three models: hunter, guard, stalker), the real-time
minotaur (one model, close to the hunter) and the burn race (turn clock
only). Three params switch them on, in three different places (section 1).

## The recommendation in brief

1. A new link param `gameMode` (`gm`): `classic` (default) | `minotaur` |
   `burn`, shown as "Game mode" (Classic / Minotaur / Burn race), the first
   row of a new top-level **Game** folder that sits after Design, expanded.
2. Every mode-specific row moves into the Game folder and shows only under
   its mode: under Minotaur a "Real time" checkbox, then the rows of the
   chosen clock; under Burn race its two sliders; Classic shows none.
3. `clock` (`clk`) stays a param (K80 R.4.2 plans a beat clock), shown as
   the "Real time" checkbox and read only under `gameMode = minotaur`.
4. `minotaur` (`mt`) stays the model (Hunter / Guard / Stalker, "Behavior")
   and loses its `off` option; `fire` (`fi`) and `mazeFabric` (`mf`) leave
   the codec, and the long-retired `snappiness` with them: one
   CODEC_VERSION bump (5 -> 6, or 7 if K76 stage 2c bumps first).
5. Readable word labels on every Game row; `indicatorSize` becomes
   "Off-screen arrow size" and `markerSize` "Maze marker size".
6. Knot mode goes entirely (K326). Fabric loses no feature; what goes is
   the uncarved closed knot itself, its per-strand tint path, the
   knot-only branches, the knot golden (retargeted to a maze design) and
   the knot cells of two tracked census scripts.
7. Four stages, one agent each (section 5), sequenced around K7 stage 2,
   K307 stage 2, K325, K329 and K76 stage 2c.

## 1. Today: the modes and the params they read

### 1.1 How a mode is chosen today

- `mazeFabric` (`mf`, codec index 45, default on, Maze folder row labeled
  by its key, tooltip "Branching maze..."): off is knot mode, no game at
  all. `url_state.ts:577` default, `:1022` the `mf` override key.
- `clock` (`clk`, 84, turn | realtime, default turn; Maze folder row 717,
  label "clock", options "turn-based" / "real time"): `realtime` builds a
  chase whatever `minotaur` says (`main.ts:2657`).
- `minotaur` (`mt`, 108, off | hunter | guard | stalker, default off;
  Maze > Minotaur row 1021): read on the turn clock only (`main.ts:2666`).
- `fire` (`fi`, 118, off | fuse; Maze > Burn race row 969):
  `fireSettingsOf` (`url_state.ts:684`) returns null unless fire is fuse,
  the clock is turn and the minotaur is off; the fire row and the
  minotaur row each turn the other off (K114 call 3, `tweakpane_panel.ts`
  974-977 and 1027-1030).

So the modes are exclusive by convention spread over three rows, and the
real-time minotaur hides behind a row called "clock".

### 1.2 Inventory of every param this touches

Codec indices are v5's (they renumber in v6, section 2.5). "Read under"
is the mode that reads the param today. Proposed labels are section 3's.

| Param (key, v5 idx) | Default | Today: folder, label | Read under | Proposed: folder, label |
|---|---|---|---|---|
| mazeFabric (mf, 45) | on | Maze, "mazeFabric" | all; off = knot mode | removed (K326) |
| snappiness (33) | - | no row ("Retired") | nothing | removed in the same bump |
| *new* gameMode (gm) | classic | - | - | Game, "Game mode" |
| clock (clk, 84) | turn | Maze, "clock" | realtime: chase, always | Game > Minotaur, "Real time" (checkbox) |
| minotaur (mt, 108) | off | Maze > Minotaur, "minotaur" | turn clock | Game > Minotaur, "Behavior" (no `off`) |
| fire (fi, 118) | off | Maze > Burn race, "fire" | turn, minotaur off | removed: `gameMode = burn` |
| fireSpeed (fsp, 119) | 0.75 | Burn race, "fireSpeed" | burn | Game > Burn race, "Fire speed (x yours)" |
| fireDelay (fdl, 120) | 0 | Burn race, "fireDelay" | burn | Game > Burn race, "Head start (units)" |
| playerPace (plp, 85) | 10 | Maze, "playerPace" | real time | Game > Minotaur RT, "Your speed (units/s)" |
| minoWanderPace (mwp, 86) | 0.5 | Minotaur, "minoWanderPace (x your pace)" | real time | tuning, "Wander speed (x yours)" |
| minoHuntPace (mhp, 87) | 0.7 | Minotaur, "minoHuntPace (x your pace)" | real time | tuning, "Hunt speed (x yours)" |
| minoPaceJitter (mpj, 88) | 0.2 | Minotaur, key | real time | tuning, "Speed variation" |
| minoPauseChance (mpc, 89) | 0.3 | Minotaur, key | real time | tuning, "Chance of a long stop" (K324) |
| minoPauseMin (mpn, 90) | 0.5 | Minotaur, key | real time | tuning, "Long stop, shortest (s)" |
| minoPauseMax (mpx, 91) | 2 | Minotaur, key | real time | tuning, "Long stop, longest (s)" |
| minoDetect (mdt, 92) | 15 | Minotaur, key | real time | tuning, "Spots you within" |
| minoLose (mls, 93) | 25 | Minotaur, key | real time | tuning, "Loses you beyond" |
| minoCatch (mct, 94) | 1 | Minotaur, key | real time | tuning, "Catch distance" |
| minoDeadEnds (mde, 95) | 0.4 | Minotaur, key | real time | tuning, "Visits dead ends" |
| minoRoam (mrm, 96) | 30 | Minotaur, key | real time | tuning, "Roam range" |
| minoWake (mwk, 97) | 2 | Minotaur, key | real time | tuning, "Lair wait (s)" |
| minoToward (mtw, 106) | on | Minotaur, key | real time | tuning, "Roams toward you" (K324 may make it a slider) |
| minoFog (mfg, 98) | always | Minotaur, key | both clocks, fog on | Game > Minotaur, "Seen through fog" |
| minoRefog (mrf, 107) | on | Minotaur, key | both, fog on | Game > Minotaur, "A catch brings back the fog" |
| minoRestart (mrs, 128) | off | Minotaur, key | both | Game > Minotaur, "A catch restarts the level" |
| minoLair (mlr, 129) | on | Minotaur, key | both | Game > Minotaur, "Back to its lair after a catch" |
| minoSpeed (msp, 109) | one | Minotaur, key | turn | Game > Minotaur, "Runs per turn" |
| minoTelegraph (mtg, 110) | on | Minotaur, key | turn (K324: both) | Game > Minotaur, "Show its next move" |
| minoSight (msi, 111) | 2 | Minotaur behavior, key | turn | tuning, "Sight (runs)" |
| minoRoamRuns (mro, 112) | 8 | Minotaur behavior, key | turn, hunter | tuning, "Roam range (runs)" |
| minoTerritory (mtr, 113) | 6 | Minotaur behavior, key | turn, guard | tuning, "Territory (runs)" |
| minoAccuracy (mac, 114) | 0.3 | Minotaur behavior, key | turn | tuning, "Accuracy" |
| minoPause (mpa, 115) | 0.1 | Minotaur behavior, key | turn | tuning, "Chance it waits a turn" |
| minoSleep (msl, 116) | 0 | Minotaur behavior, key | turn | tuning, "Lair sleep (turns)" |
| fogOfWar (fow, 51) | off | Maze, key | all modes | stays in Maze for stage 1; K76 2c makes it `exploration` (question 3) |
| moveSpeed | - | Maze, key | turn clock | stays in Maze (a feel setting) |
| minotaurIndicator (setting) | on | Maze, key | minotaur | Maze, "Arrow to the minotaur" |
| finishIndicator, headIndicator (settings) | - | Maze, keys | all | Maze, "Arrow to the finish", "Arrow to you" |
| indicatorSize (setting, `knotmaze.indicatorSize`) | 1 | Maze, key (873) | all | Maze, "Off-screen arrow size" |
| markerSize (mks, 104, exempt) | 1.08 | Maze, key (931) | all | Maze, "Maze marker size" |

"tuning" = the collapsed "Minotaur tuning" subfolder of Game (section 3.1).

## 2. The model: gameMode, the clock, the model

### 2.1 gameMode

- `gameMode` (`gm`): `classic` | `minotaur` | `burn`, default `classic`,
  an enum APPENDED at the end of `CODEC_PARAMS`. Values are identifiers;
  the panel shows "Classic", "Minotaur", "Burn race".
- Not a DAILY_EXEMPT_KEY: a daily is today's `PARAM_DEFAULTS`, so a daily
  is classic, and choosing another mode leaves the daily (an ordinary
  design), exactly as a `clock`, `minotaur` or `fire` edit does today.
  The golden dailies do not move: classic is today's default behavior.
- A new mode later (a beat-clock race, a K80 R.4 front) is a new option,
  appended to the enum's option list (no bump).

### 2.2 The clock stays, scoped to the minotaur

- Keep `clock` (`clk`, turn | realtime). K80's design (R.4.2,
  `docs/design/K80_gameplay_additions.md`) makes the clock a param every
  enemy and front reads, with a beat clock to come, and says "no mode may
  require real time". A boolean would have to change type again for the
  beat clock.
- The effective clock is turn unless the minotaur is on:

  ```ts
  // url_state.ts: the clock a design plays on.
  export function clockOf(p: Pick<UrlParams, "gameMode" | "clock">): ClockMode {
    return p.gameMode === "minotaur" ? p.clock : "turn";
  }
  ```

  Every reader of `params.clock` goes through it (main.ts 2657, 2666, the
  moveSpeed row's visibility, the HUD's caught row, key moves'
  liveness). Classic and the burn race ignore a stored `clk=realtime`.
- Panel: a "Real time" checkbox under Minotaur, bound to a view object
  (the gridAlign view pattern in `gameplay-panel.md`) that shows
  `clock === "realtime"` and writes `clock`. When the beat clock lands it
  becomes a "Clock" dropdown (Turns / Beat / Real time) in place.

### 2.3 The minotaur's model

- `minotaur` (`mt`) keeps its name and key and becomes the model only:
  `hunter` | `guard` | `stalker`, default `hunter`. Its `off` option goes
  (an option removal, so it rides the bump). `MINOTAUR_SETTINGS`
  (`minotaur_turns.ts:44`) and the `TurnMinotaurSetting` type lose `off`;
  whether `TurnMinoParams.model` keeps an internal `off` for "no
  minotaur" is the stage agent's call (main.ts no longer needs it).
- Real time has one model today (the hunter, roughly). K324 stage 3 ports
  the guard and the stalker to real time (recommended, K324 section 5);
  until then the "Behavior" row hides in real time.

### 2.4 Burn race

- `gameMode = burn` replaces `fire = fuse`; the `fire` param goes. A
  second burn variant later gets its own enum (`fireKind`), shown under
  Burn race.
- `fireSettingsOf` (`url_state.ts:684`) reduces to `p.gameMode === "burn"
  ? {...} : null`: its refusals (real time, minotaur on) disappear because
  the modes are exclusive by construction, and so does the panel's
  turn-the-other-off code (`tweakpane_panel.ts` 974-977, 1027-1030).
- The burn race stays turn-only (a fire under real time is K80 R.4
  territory); the Real time checkbox shows only under Minotaur.

### 2.5 Codec, links, dailies, undo

- ONE BUMP: remove `snappiness` (33), `mazeFabric` (45) and `fire` (118)
  from `CODEC_PARAMS`, drop `minotaur`'s `off`, append `gameMode`;
  `CODEC_VERSION` 5 -> 6. K76 stage 2c also bumps (it replaces
  `fogOfWar` with an `exploration` enum in place): whichever merges second
  bumps again (6 -> 7). Two bumps in a day cost nothing pre-launch.
- RENUMBERING: deleting three entries shifts every later index (34-44 by
  one, 46-117 by two, 119 on by three). That is what a bump allows; the
  alternative, retired placeholders that decode and ignore (as
  `snappiness` is today), avoids nothing worth keeping once the version
  bumps anyway. Lore that cites v5 indices stays as dated history; the
  new `gameplay-links.md` entry says so and names the table pin
  (`test/ui/param_codec.test.ts`) as the authority.
- `mazeFabric` LEAVES THE CODEC IN STAGE 1, not in K326, so that one bump
  covers it: stage 1 keeps the `UrlParams.mazeFabric` field (default on,
  still read from the `mf` override key, like `hcl`) and deletes its panel
  row; K326 deletes the field and the knot paths with no codec change.
- `key=value` LINKS: `gm=classic|minotaur|burn` (readChoice, like `clk`).
  Recommended, for the probes: an IMPLIED MODE in the key=value reader
  when `gm` is absent: `fi=fuse` gives burn, and `clk=realtime` or
  `mt=hunter|guard|stalker` gives minotaur. 21 probe scripts in 11
  `.claude/probes/` directories (K80, K114, K120, K132, K140, K155, K156,
  K174, K198, K98, K100) write those keys; without it they all open
  classic. It is a few lines in the override path, not codec machinery,
  and `url_codec.test.ts` pins it. `mt=off` reads the default (hunter),
  `fi=off` is ignored, `mf=` is ignored after K326 (optionally with one
  console.warn naming K326, so a stale knot probe says why it shows a
  maze).
- `ENUM_OPTIONS` (`url_state.ts:778`) gains `gameMode: GAME_MODES` and
  loses `fire`.
- UNDO: `undo_stack.ts` LIVE_EFFECTS' `onClockChange` list becomes
  `[gameMode, clock, minotaur, fireSpeed, fireDelay]` (the Game mode row
  runs onClockChange: a mode change restarts the solve). onChaseChange
  and onTurnMinoChange keep their lists.
- DAILY_LINK: the exempt set does not change. `MAZE_PARAM_KEYS`
  (`daily_link.ts:76`) loses `mazeFabric` in K326 (stage 1 can leave it:
  the field still exists).
- `undoAllowed(clock, minotaur)` (`minotaur.ts:76`) is unused (K263);
  stage 1 either deletes it (K263's call) or changes it to take the mode.

## 3. The panel

### 3.1 The Game folder

Top level, after Design and before Maze, expanded by default (question 1).
Rows in order; `[...]` = when it shows.

```
Game
  Game mode            Classic | Minotaur | Burn race
  -- Minotaur --
  Real time            [ ]
  Behavior             Hunter | Guard | Stalker           [turn clock; K324 st.3: both]
  Runs per turn        Half (every other turn) | One |
                       Charge (two while hunting) | Two   [turn]
  Your speed (units/s) slider                             [real time]
  Show its next move   [x]                                [turn; K324 st.2: both]
  Seen through fog     Always | While hunting | Never     [fog on]
  A catch restarts the level   [ ]
  Back to its lair after a catch [x]                      [restart off]
  A catch brings back the fog  [x]                        [fog on, restart off]
  > Minotaur tuning (collapsed)
      turn:      Sight (runs), Roam range (runs) [hunter], Territory (runs)
                 [guard], Accuracy, Chance it waits a turn, Lair sleep (turns)
      real time: Wander speed (x yours), Hunt speed (x yours), Speed
                 variation, Spots you within, Loses you beyond, Catch
                 distance, Visits dead ends, Roam range, Roams toward you,
                 Lair wait (s), plus K324's junction-stop rows
  -- Burn race --
  Fire speed (x yours) slider
  Head start (units)   slider
```

- The "Minotaur" and "Burn race" subfolders of Maze and the "Minotaur
  behavior" subfolder go; their rows move here. Row behavior (live vs
  restart, step and rounding rules, K130's no-step sliders) is unchanged:
  only the parent, the label and the visibility rule move.
- VISIBILITY (`refreshCond`, `tweakpane_panel.ts` 1874-1997): `gameMode`
  first, then the clock (`clockOf`), then today's conditions (fog,
  restart). The `!fab` conditions on the moved rows go in K326 (stage 1
  can keep them; the field is still there).
- `playerPace` moves out of Maze: only real time reads it. `moveSpeed`
  stays in Maze (the turn clock's animation speed, a feel setting) and
  keeps hiding in real time.
- FOLD STATE persists by folder title (`knotmaze.panelFolds`): "Game" and
  "Minotaur tuning" are new titles and start at their defaults; the old
  titles' stored entries are dead and harmless.
- The Game folder is a top-level folder, so K198's panel tween and the
  `--kp-top` math need nothing new.

### 3.2 Labels

Labels are free to rename; values and keys are not (`gameplay-panel.md`,
pathViz). Every Game row gets the word label in section 1.2's table. Rules
used: a unit in parentheses when the row has one; "x yours" for a multiple
of the player's speed; "Chance ..." for a probability; the minotaur is
"it", the player "you", as the tooltips already say. Tooltips keep their
text, minus "Turn-based:" prefixes that the clock rows make redundant, and
the fire/minotaur row tooltips lose "Not with the minotaur: turning one on
turns the other off".

### 3.3 indicatorSize vs markerSize

Two different things with synonym names:
- `indicatorSize` (a localStorage setting, `knotmaze.indicatorSize`,
  default 1): the scale of the OFF-SCREEN indicators, the discs with a
  glyph and a chevron at the screen's edge pointing to an off-screen
  finish, player or minotaur (`ui/offscreen_indicators.ts`).
- `markerSize` (link param `mks`, exempt, default 1.08 thread widths): the
  diameter of the markers drawn ON the maze: the player's dot, the start,
  the finish and the minotaur (`render-markers.md`, K98).

Labels: **"Off-screen arrow size"** and **"Maze marker size"**. The three
indicator toggles become "Arrow to the finish", "Arrow to you" and "Arrow
to the minotaur" (tooltips: "shown at the screen's edge while it is off
screen"), and the size row stays right after them, so the four read as
one group. "Arrow" and "marker" are no longer synonyms in the panel, and
each label names where the thing is.

### 3.4 K292 and K297

- K292 (dog-ear marks on design rows, unmarked personal rows): every Game
  row changes the design (none is daily-exempt), so every Game row gets
  the mark, the Game mode row included. The arrow rows and Maze marker
  size are personal and stay unmarked. Nothing in this design blocks
  K292 or depends on it.
- K297 (a pared-down panel, "after the churn"): the Game folder's first
  level (Game mode, Real time, Behavior, Show its next move) is a natural
  part of the front set; the tuning subfolder belongs behind it. K297
  also owns the rest of Maze's split (generation rows vs view and
  feedback rows), which this design leaves alone.

## 4. Knot mode's removal (K326)

### 4.1 What exists only under mf=0, and whether fabric has it

| Knot-mode feature | In fabric? |
|---|---|
| The uncarved knot: closed strands, no maze plan, no surgery | No: this is what goes |
| Per-strand tint (`paletteMode` false, `hueGroup`) | Yes: the "strands" color scheme (`section_colors.ts` 258, 337) |
| Plucks, tugs, temperature, flow, audio, shapes, backgrounds | Yes, all |
| Mouse picks threads anywhere | Yes (fabric picks threads and choices) |
| Reveal: the plain shuffled stagger (`reveal_plan.test.ts:179`) | Fabric has the connectors' stagger |
| Its own fit bounds and follow camera (`main.ts` 629, 643, 905) | Fabric's own |

No feature is lost except the knot itself (Levi, 22:10: "get rid of it
entirely").

### 4.2 Code

Delete (each a `params.mazeFabric` branch, keeping the fabric side):
- `src/main.ts`: 536 (fireOf), 629 and 643 (fit bounds), 905 (follow
  camera), 1296 (walkGraph), 1310 (`paletteMode: params.mazeFabric`),
  1329, 2064, 2191 (head indicator), 2253 (HUD), 2657 and 2665
  (restartChase), 3188 (keysLive), 3620 (emptyAt), 3631 (setGlowAt), 3701
  (pointerdown), 3831 (hover), 4147, 4242, 4315, 4411 (tick paths).
- `src/core/scene_graph.ts`: `SceneParams.mazeFabric` (22) and the
  plan/apply condition (57-78); `hueGroup` stops being optional. K7 stage
  1's pure builder, which the K7 worker builds from: after K7 stage 2.
- `src/ui/head_indicator.ts` (19, 30: the "no maze" reason),
  `src/ui/url_state.ts` (219, 294, 577, 1022), `src/ui/daily_link.ts:76`
  (MAZE_PARAM_KEYS), the panel's `!fab` conditions (about 35 rows).
- `src/core/reveal_plan.ts`: the knot-mode draw branch, if it is
  reachable only from knot mode (check: section_field_v1's fixture
  mentions "decorative culled loops, knot mode").

Keep (shared, not the product mode): the lattice grower, TangleGraph,
splines, and the general ParticleSystem with closed chains. Physics tests
that build raw knot graphs (`particle_system`, `quiescence.regression`,
`tug`, `settle_budget`, `sweep.manual`) are solver tests and stay.

Stage 4 (optional cleanup, section 5): the renderer's knot-only paint
path (`ribbon_renderer.ts` paletteMode-false branches at 1174, 1227
`uKBase[3]`, 1230 `uKPaint[0]`, 1280, 1365 "Knot-mode chain color"; the
`paletteMode` uniform in `paint_glsl.ts:33` and `paint_math.ts:281`; the
G2 parity fixtures that cover paletteMode 0), and a closed-chain census:
whether any maze design keeps a closed chain. If none does, the
closed-chain solver path is product-dead (K306 lists other dead surface),
and CLAUDE.md's Overview ("each strand is an independent closed chain")
needs rewording; deleting that path is a separate decision.

### 4.3 Tests

- `test/physics/byte_identity.test.ts` (the golden; raw
  `generateLatticeKnotwork` at gridSize 6, weaveDensity 0.3, turnBias 0.6,
  seeds 5 and 2773729296, 300 steps): RETARGET to a maze design built
  through `buildSceneGraph` (a default design and a fat one), same
  fingerprint method. Two steps: freeze the maze golden next to the knot
  one, then delete the knot one in K326's main stage. K7's worker brief
  (`docs/design/K7_worker.md` lines 114, 471, 735, 912) relies on "the
  golden" staying green, so the maze golden lands after K7 stage 2 merges
  (or K7 adopts it; the coordinator's call).
- Delete the knot half: `junction.test.ts:139` ("registers no junctions in
  knot mode"), `open_chain.test.ts:76` ("knot mode is uncarved"),
  `reveal_plan.test.ts:179` (if the branch goes),
  `head_indicator.test.ts` 18-34 (the `mazeFabric` field and "hides in knot
  mode"), `daily_link.test.ts` 78 and 149, `url_codec.test.ts` 77, 364,
  489 and 625 (`?7&mf=0`), `param_codec.test.ts` 76, 266-270, 333, 344
  (stage 1, with the bump).
- `sleep.regression.test.ts`: line 57's `params.mazeFabric` branch, and
  the knot link at 123 (`?s=p9ar6&mf=0&rep=.4&bd=1.75&sm=.7&tw=.52&am=instant&snd=none`,
  K41's fat knot): replace with a fat maze link that sleeps, or drop the
  case.
- Comments only: `maze_fabric.test.ts:11`, `junction.test.ts:9`,
  `open_chain.test.ts:13`, `byte_identity.test.ts` 7-11.

### 4.4 Tracked scripts with knot cells

- `scripts/fold_census.mjs` (18-31: kdef, kfat, kthin, kt64,
  link_fat_knot) and `scripts/fold_census.ts` (86, 1013, 1019
  `params.mazeFabric`).
- `scripts/phone_pass/bench.mjs` (7, 129: the knot control cell),
  `emulation.mjs` (27: LINK in knot mode), `summary.mjs` (52: "Knot mode
  (mf=0), at rest").

Each knot cell was a control: replace it with a maze design of similar
size (`?7k&am=instant`-style) or drop it; the agent records which in the
commit. These are tracked, so K326 must fix them (unlike probes).

### 4.5 Probes (stale, not fixed)

Under the main checkout's untracked `.claude/probes/`, `mf=0` appears in
346 files in 34 directories: 118 .json, 149 .txt and 30 .md results, and
49 scripts (43 .mjs, 5 .ps1, 1 .ts). By directory: K41 161, K104 41, K79
23, rounds 15, K180 12, K156 12, K77 8, K279 8, K63 7, K49 7, K7 5, K307
5, K193 4, K235 4, K154_K169 3, K90 3, K81 3, K253 3, K111 3, g2 2, K76 2,
K120 2, K4 2, and one each in K148_K149, K298, K73, K75, K93, K268, K191,
K140, K145, K45 and g1. Many are copies of `g2lib.mjs`. After K326 an
`mf=0` link opens a maze; results files stay as history.

### 4.6 Lore to rewrite (binding text; dated measurements stay history)

- CLAUDE.md: "Knot mode is guarded BYTE-IDENTICAL by the golden
  snapshot" (Roadmap status, ~216) -> maze designs; the architecture
  audit's "knot-mode rest 94.5% idle" (~225) is a dated measurement, keep;
  the Overview's closed-chain sentence after the census (4.2).
- `gameplay-badge.md:22` "KINDS: "Free play"... knot mode included".
- `gameplay-indicators.md:32` "shown in fabric mode", `:47`
  "`headIndicatorWhy`: only knot mode or".
- `gameplay-links.md:24` "`&am=instant` / `&mf=0`" (probes keep writing),
  `:61` "rows, fabric mode only", `:78` "fabric mode only".
- `gameplay-minotaur.md:18` "realtime, a fabric-mode panel row with its
  own Minotaur folder" (stage 1 rewrites this one: the Game folder).
- `gameplay-moves.md:42` "Keys are live only in fabric mode".
- `gameplay-panel.md:109` "(`!fab`: fabric mode only)", `:120-125` the K298
  ROWS entry ("fabric mode only", "always shown: knot mode picks threads
  too", "fabric only: knot mode has no choices").
- `gameplay-motion.md:107` "knot `?7k.J&mf=0`".
- `physics.md:14` "the knot-mode byte-identity rule is in CLAUDE.md";
  `physics-settle.md:50` "knot-mode byte identity (the golden steps ps
  directly)"; `physics-fabric.md:23` "knot mode never allocates the
  cover", `:34` "Knot mode structurally untouched"; `physics-kinks.md:24`
  "knot mode (19ven80, mf=0)", `:86` "the fat knot link
  (?s=p9ar6&mf=0...)".
- `probes.md:34` "Probes that want knot mode pass `mf=0`", `:123` "`mf=0`,
  never append"; `probes-phone.md:38` "knot (`mf=0`) at rest".
- `render-backgrounds.md:105` "fog and knot mode, all 0 px";
  `render-confetti.md:57-58` "bites only in knot mode",
  "`mf=0&fw=0&snd=none`"; `render-gaps.md:124` "knot mode at gap .4";
  `render-markers.md:59` "fabric mode only"; `render-pluck.md:178` and
  `:231` "knot `?7k.J&mf=0`", `:341` "a mouse press in fabric mode goes to
  `handleFabricTap`", `:356` "knot (`?7k&mf=0`, 2592 particles)";
  `render-web-fade.md:58` "in knot mode".

Line numbers are master `b72d5dd`'s; search the quoted first words.

## 5. Stages (one agent each)

| Stage | What | Files | Waits for |
|---|---|---|---|
| K323 st.1 | `gameMode`, the codec bump (snappiness, mazeFabric, fire out; mt loses off), `clockOf`, the implied-mode override keys, the Game folder and every label (3.2, 3.3), LIVE_EFFECTS, lore entries | `src/ui/url_state.ts`, `param_codec.ts`, `undo_stack.ts`, `tweakpane_panel.ts`, `src/main.ts` (about six reader lines), `src/game/minotaur_turns.ts` (MINOTAUR_SETTINGS), `minotaur.ts:76` (K263); tests `param_codec`, `url_codec`, `undo_stack`, `daily_link`; lore `gameplay-links.md`, `gameplay-panel.md`, `gameplay-minotaur.md`, `gameplay-fire.md` | K325 (panel credit row: same file); coordinate the bump with K76 2c |
| K326 st.A | Freeze a maze golden beside the knot golden | `test/physics/byte_identity.test.ts` + snapshot | K7 stage 2 merged (or K7 adopts it) |
| K326 st.B | Delete knot mode: 4.2's branches, the field, 4.3's tests, 4.4's scripts, 4.6's lore, the knot golden | `src/main.ts`, `src/core/scene_graph.ts`, `src/ui/head_indicator.ts`, `url_state.ts`, `daily_link.ts`, `tweakpane_panel.ts`, `reveal_plan.ts`; tests; `scripts/`; CLAUDE.md, `.claude/rules/` | K323 st.1, K326 st.A, and K7 st.2, K307 st.2 and K329 merged (all edit main.ts) |
| K326 st.C (optional) | The knot paint path (`paletteMode` 0) and its G2 fixtures; the closed-chain census | `ribbon_renderer.ts`, `paint_glsl.ts`, `paint_math.ts`, `test/render/fixtures/`; a census probe | K326 st.B; K111 stage 5 (hover rim, same shader files) |

K324's stages (the other doc) follow K323 stage 1: they add rows to the
Game folder and params to the same codec table.

Collision notes:
- `src/main.ts`: K7 stage 2 (gateFrame calls), K307 stage 2 (shader
  warm-up) and K329 (arrow keys at a 4-way junction) all edit it. K323
  stage 1's hunks are a few lines in restartChase and the turn-minotaur
  build, so a rebase is cheap; K326 stage B's are many and spread, so it
  waits for all three.
- `src/ui/tweakpane_panel.ts`: K325 (a credit row), K76 2c (the
  exploration dropdown in place of fogOfWar) and K111 stage 5 (maybe the
  hover rim rows). K323 stage 1 rewrites the Minotaur and Burn race
  blocks (963-1170) and adds the Game folder; it does not touch fog or
  hover rows.
- The codec table: K76 2c and K323 stage 1 both bump; the second to merge
  bumps again and re-freezes the pin. K324 stage 1 appends after both.

## 6. Open questions for Levi (each with a recommendation)

1. FOLDER NAME AND PLACE. "Game", after Design (seed, dice, Daily) and
   before Maze, expanded? Recommended: yes. The alternative is first
   (above Accessibility), which pushes the daily's own row down.
2. REAL TIME AS A CHECKBOX. A "Real time" checkbox under Minotaur now,
   becoming a "Clock" dropdown (Turns / Beat / Real time) when K80's beat
   clock lands? Recommended: yes.
3. FOG IN THE GAME FOLDER. Fog of war (K76 2c turns it into an
   "Exploration" dropdown: Off / Fog / Threads) changes how every mode
   plays. Move it into Game, right under Game mode, once K76 2c lands?
   Recommended: yes, as a small follow-up after K76 2c (not in K323 stage
   1, to keep the two branches apart).
4. LABELS. "Off-screen arrow size" and "Maze marker size", with "Arrow to
   the finish / you / the minotaur" for the three toggles? Recommended:
   yes.
5. BURN RACE AS ONE OPTION. A single "Burn race" option now, with a
   variant row added under it when a second variant exists? Recommended:
   yes.
6. THE MODELS IN REAL TIME. Should Hunter / Guard / Stalker apply to the
   real-time minotaur too (K324 stage 3)? Recommended: yes; until then the
   Behavior row hides in real time and real time plays the hunter.
7. DAILIES STAY CLASSIC. A daily is classic, and picking another mode
   leaves the daily, as today. A minotaur daily (its own results and
   share line) is a separate idea, not part of this. Recommended: keep.
8. KNOT MODE GOES ENTIRELY, the per-strand tint living on as the
   "strands" color scheme and the closed-chain solver kept until a census
   says no maze uses it. Recommended: yes.

## 7. Handoff

(Implementing agents append their stage handoffs here.)

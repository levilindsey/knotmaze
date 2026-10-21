# K138: the planner pass (section 4's M mechanisms)

Ledger: K138. One stage, opus, 1.5 h cap. Docs only: no code.

The sooner plan (`docs/design/sooner_20261020.md`, the K138 row and
queue item 8) calls for "a planner pass [that] picks its first two
non-generation mechanisms once K137 s2 lands. Then one stage per
mechanism." K137 s1 and s3a have merged and s3b is building now. K137
s2 (the aids: 4.15, 4.16, 4.28) has not been built; it stays in K137's
queue, so plan around it rather than waiting.

## The set

From `docs/design/K80_gameplay_additions.md` section 4 (grep the
headings): 4.1 Locks and keys, 4.2 One-way runs, 4.4 Required pickups
(then 4.5 Bonus pickups and stars), 4.6 Fleeing critters (simulate
first), 4.11 Switches, 4.12 Turnstile junctions, 4.18 Color-rule mazes,
4.19 Ice runs, 4.20 Rescue (escort), 4.23 The myth, 4.24 Tides, 4.27
Hidden runs, 4.31 More exits. Of these, 4.1, 4.2, 4.4, 4.11, 4.24 and
4.31 change generation: they need solvability checks and move pins
only on purpose. The costlier ones (4.8, 4.22, 4.25) are K141, not
this plan.

## Read

- Section 4's entries for the set, and section 0's decisions.
- Levi's calls: `docs/design/levi_notes_2026-10-13.md` (and
  `levi_notes_2026-10-14.md` if it touches the set). His direction:
  prototype each mechanism in free play behind its own toggle.
- What K137 built, from the Handoffs of `K137_s1.md` and `K137_s3a.md`
  (and K139's collapse mode, commit 961cd53),
  and what s3b is building: `git show
  worktree-agent-af34a0e5755494326:docs/design/K137_s3b.md` (its
  Design section; the branch moves while it runs). s3b adds more than
  one monster, sleepers, a follower, lures, snares, mud, the sword and
  sprint. Plan on top of those, not around them.
- The conventions row of `sooner_20261020.md`, and the K137 briefs'
  format (`K137_s3b.md`: Levi's direction, Decided, Your calls, Steps,
  Constraints, Stop rule).

## Write

1. **`docs/design/K138_plan.md`** (this file; add below a `## Plan`
   section). For each mechanism in the set: the rules to build (from
   section 4, made concrete in our medium: runs, junctions, the turn
   clock and the real-time clock), what it builds on (K137's pieces, the
   minotaur, cuts, the walker), whether it changes generation and how to
   check solvability, its params (appended after the codec's last
   index when it lands), the files it touches, its size (S, M) and the
   calls it needs from Levi, each with a recommendation. Then the stage
   order: the generation-free ones first, two or three at most per
   stage, each a working toggle in free play.
2. **`docs/design/K138_s1.md`**: the full brief for the first stage, in
   the K137 brief format, ready to launch once K137 s3b merges. Its
   calls carry recommendations, so the stage can build on them as s3a
   did. Leave the "Agents beside you" table for the coordinator.
3. **Questions for Levi**: at most six, one line each with the
   recommendation, at the end of the plan.

## Constraints

- Docs only: write only `docs/design/K138_plan.md` and
  `docs/design/K138_s1.md`. Read code freely to ground the plan
  (`src/game/`, `fabric_controller.ts`, `walk_graph.ts`), but change
  nothing.
- Agents beside you: K137 s3b (gameplay), K643 (glyph lint), K720
  (audio). You touch none of their files.
- No ports, no browser, no phone, no performance measurements.

## Stop rule

Stop when both documents are written or at the 1.5 h wall-clock cap,
whichever comes first. Run `Get-Date` at the start and at each milestone.
Commit WIP to your branch at every milestone and never push.

A compaction is not a stop: after one, re-read this brief and `git log`
before going on. Keep reads narrow (Grep -n, then Read with
offset/limit).

When you stop, commit, append a short "Handoff" section to this file (what
is written, what is left, the handle fields) and report. End your report
with the item's handle fields and a `Ledger items` list.

## Plan

Written by the K138 planner on 2026-10-21, against master at `3103ed4`.
K137 s3b merged with the sword alone (codec 193-194). K137 s2 (the aids)
and K708 (the sims) were building at 01:20. Sprint and the monster list
are K137 s3c, after s2.

### What the reading found

- Five of the six mechanisms listed as generation changes leave the maze
  alone. Locks (4.1), one-way runs (4.2), pickups (4.4), switches (4.11)
  and tides (4.24) are overlays. A seeded pass places them on the built
  walk graph, and a search checks the result. The maze plan, the
  dailies, the K87 pin and the golden do not move, even with the toggle
  on.
- Only 4.31 (more exits) changes generation. It edits `maze_plan.ts` and
  `maze_apply.ts`, so it is a maze key and moves pins when it is on.
- Every overlay needs the same three things: which taps are legal, a
  solvability check, and par under the rule. One module does all three
  (the rule kit, below). Stage 1 builds it.
- Par and the stars read the plain maze (`runsToExit`,
  `walk.optimalLength`), and so will K137 s2's hints (`distToExit`).
  Under a rule the plain optimum can be illegal. The kit gives the
  rule-aware numbers.
- The walk graph is small. At gs 18 it has about 199 vertices and 302
  runs, cycle rank about 103 and 3 bridges (the two tails and one more).
  Eight rule states make about 1,600 search nodes. Pickup tours (2^9
  held sets) stay near 0.1 M nodes.
- The core is bridgeless, so one locked or shut run never fences
  anything. K80 measured 5, 10 and 14 locks to fence the exit region at
  radius 2, 3 and 4. A gate that must bite goes on the exit tail (a
  bridge) or comes in a set.
- The controller counts one stroke per run walked (`strokes` is
  `taps.length`). A rule that walks several runs per tap (ice) must count
  actions instead. The cut's `actions` list already does.

### The rule kit (stage 1)

`src/game/rule_search.ts`: pure walk-graph code, engine-exact (K108).

- A rule is `{ states, start, step }`. `step(vertex, run, state)` gives
  the move one tap makes: the runs walked (one, or a slide), the arrival
  vertex, the new state and the length. It gives null when the rule
  refuses the tap.
- The controller calls the same `step` in `tapEdge`, so the game and the
  search share one judge.
- `ruleSearch(walk, rule, from?)` is a BFS over (vertex, state) for the
  fewest strokes, and a Dijkstra for the shortest length. It returns
  both, one best route and `solvable`. `from` starts it mid-solve, for
  strict par.
- Rules compose. At most one rule expands a tap into several runs (ice).
  The others judge each run walked, in order.
- Placement: each mechanism draws from its own `SeededRNG`
  (`util/random.ts`), seeded from the design seed and the mechanism's
  name. Never the shared `rng()`: its draws build the maze. It redraws
  up to 32 times until the search says solvable and the rule bites (the
  best legal route differs from the plain one), then keeps the last
  solvable draw. With the toggle off it draws nothing, so every pin
  holds bit for bit.
- Par under a rule: P = F + round(parSlack x F), with F the kit's fewest
  strokes. Strict mode asks the kit from the head's (vertex, state).
  Stars: R = walked / the kit's shortest length.
- Later stages extend it: the arrival run in the node (turnstiles), a
  phase (turnstiles, tides), a wait move (tides), a held set (keys,
  pickups, switches).

### The mechanisms

Each entry gives the rules, what it builds on, generation and
solvability, params, files, size and the calls for Levi.

What every stage shares:
- The param path: `url_state.ts` (defaults, readers, `fabricRulesOf`),
  `param_codec.ts`, `tweakpane_panel.ts`, `undo_stack.ts`
  (`onClockChange`), the key-order pin in `test/ui/param_codec.test.ts`
  and `url_codec.test.ts`'s defaults table. Params append after the
  codec's last index when they land (194 on master today; K137 s2 takes
  the next ones). The keys below are free on master today.
- Rule params are neither daily-exempt nor maze keys. They restart the
  solve, not the build. Free play only: no saved attempts, no store
  version.
- A HUD row (`maze_hud.ts`). A share tag in words, the rule's name,
  where section 4 asks for one (`share_text.ts`). A stat only where
  section 4 names one (`maze_stats.ts`).
- Off is bit-identical: the golden, K87, the golden dailies,
  `K80_DIGESTS`, `MODEL_DIGESTS`, `TURN_GAMES` and `LENGTH_GAMES`.

The clocks: in classic play the turn clock is the move count. With the
turn minotaur it is also the minotaur's turn. The real-time clock is the
real-time chase and the burn race.

#### 4.19 Ice runs (s1)

- Rules: walking an icy run carries you through its far junction
  straight on, along the same strand, into the next run. You keep going
  while the runs are icy. You stop at the far end of the first run that
  is not icy.
- A slide also stops where the strand ends at a junction, at an END, at
  the exit, and before a run it has already walked.
- "Straight on" is the walker map's strand continuation (`walker.ts`,
  `cont`). There is no heading test.
- One tap is one stroke, however many runs it slides.
- Turn clock: a slide of k runs is k moves. Real time: the dot runs on
  without a stop.
- Builds on: `walkerMapOf`, and the cut's carry queue
  (`FabricMazeController.carry`, main.ts `carryStep`), which already
  walks a chain of runs from one action.
- Generation: none. Placement frosts a seeded share of the core runs,
  never the tails. The kit's slide search checks the exit is reachable.
- Params: `ice` (`ice`, [0, 0.5] step 0.05, default 0).
- Files: `src/game/ice.ts` (new), `rule_search.ts`,
  `fabric_controller.ts`, `src/main.ts` (carryStep's gate),
  `src/app/scene.ts` and `section_colors.ts` (the frost color).
- Size: M.
- Calls: backtrack after a slide. Rec: it undoes the whole slide, as one
  stroke. Sliding back by the rule can overshoot the start.

#### 4.18 Color-rule mazes (s1)

- Rules: mode `alternate` paints the runs light and dark: never walk two
  of one shade in a row. Mode `cycle` paints them in three colors,
  walked in order (red, green, blue, red); the first run may be any
  color. A refused tap thunks.
- Section 4's "never the same color twice" with three colors refuses
  about one arm in three, and only where two runs at a junction share a
  color. Two shades bite harder and read better, so alternate replaces
  it.
- The state is the last color walked, "none" at the start: three
  states under alternate, four under cycle. Backtrack restores the state
  from before the move.
- Icy runs carry no color: the rule skips them. A slide that would end
  on a run of the wrong color is refused before it starts.
- Both clocks: no clock. A refused tap is not a move.
- Builds on: the choice pulses (`choices()` leaves refused runs out, as
  it does broken ones), and the section color table (`SectionRuns`) for
  the look. No new GL program.
- Generation: none. Placement colors the runs from a seeded stream, then
  plants one legal route: a seeded detour from the start to the exit,
  colored to obey the rule. So every draw is solvable. The kit's search
  over (vertex, last color) checks that the rule bites.
- Params: `colorRule` (`cru`: off | alternate | cycle, default off).
- Files: `src/game/color_rule.ts` (new), `rule_search.ts`, the
  controller, `scene.ts` and `section_colors.ts` (the colors),
  `marker_glyphs.ts` (cycle's glyphs).
- Size: M.
- Calls: (1) alternate as the first form. Rec: yes. (2) Colorblind play.
  Rec: alternate is lightness alone; cycle adds a glyph per color
  (circle, triangle, square) on the runs leaving the head.

#### 4.12 Turnstile junctions (s2)

- Rules: a turnstile is a three-arm junction that joins only two arms at
  a time. The open pair rotates one step on every move (AB, BC, CA),
  from a seeded phase. You may leave by the arm paired with the one you
  came in by, when that pair is open. Going back the way you came is
  always allowed.
- Turn clock: the move count turns them. Real time: the same move count
  (rec), so a puzzle has one solution in every mode. A beat-timed
  version is an idea.
- Builds on: the K81 route bands (`junction_routes.ts`), which already
  draw which arms the path joins at a junction. A turnstile draws its
  open pair as a band, with the third arm dim.
- Generation: none. Placement picks seeded three-arm junctions on or
  near the plain route. The kit's node gains the arrival run and the
  phase (moves mod 3): about 600 x 3 nodes.
- Params: `turnstiles` (`tst`, 0-8 junctions, default 0).
- Files: `src/game/turnstiles.ts` (new), `rule_search.ts`, the
  controller, `junction_routes.ts` and `fabric_maze_renderer.ts` (the
  band).
- Size: M.
- Calls: the move clock in real time too. Rec: yes.

#### 4.27 Hidden runs (s2)

- Rules: a hidden run is invisible and cannot be tapped. Plucking a
  thread of the same note within 3 runs of it reveals it for the rest of
  the solve. Hidden runs are shortcuts: the maze solves without them.
- Both clocks: no clock. A pluck is not a move.
- Builds on: the K76 thread reveal (`explore_view.ts`,
  `explore_glsl.ts`), whose unrevealed pieces are already empty space to
  every pick (K479, `tap_pick.ts` `pickRun`); the note of a run
  (`pitch_space.ts`, the length bucket); the pluck hook in main.ts.
- Generation: none. Placement hides seeded runs that shorten the plain
  route. The kit checks the maze still solves without them. Par is shown
  with and without them.
- Params: `hiddenRuns` (`hid`, 0-4, default 0).
- Files: `src/game/hidden_runs.ts` (new), `explore_view.ts`,
  `explore_glsl.ts`, `shader_warmup.ts` (if it needs an explore
  program), `tap_pick.ts`, main.ts's pluck hook, the HUD.
- Size: M. Hit-testing is the risk.
- Calls: what reveals a run. Rec: a pluck within 3 runs, on a thread of
  its note; a tap near it does nothing.

#### 4.2 One-way runs (s3)

- Rules: a one-way run is walked only in its direction. Chevrons show
  it. A backtrack against it is refused (thunk).
- Turn and real time: the minotaur obeys them too (rec), so a one-way
  run is an escape.
- Builds on: Robbins' theorem. The core is bridgeless, so it has a
  strong orientation (one DFS: tree runs away from the root, back runs
  toward it). Orienting any subset of runs by that one orientation keeps
  every vertex reachable from every other: no traps, by construction.
- Generation: none. Placement orients a seeded 20-40% of the core runs,
  weighted toward the plain route. Pockets and tails stay two-way. The
  kit confirms. Par is the directed search.
- Params: `oneWay` (`ow`, [0, 0.6] step 0.05, default 0).
- Files: `src/game/one_way.ts` (new), `rule_search.ts`, the controller
  (the backtrack refusal), `marker_glyphs.ts` and
  `fabric_maze_renderer.ts` (chevrons), and the chase graph's run filter
  if the minotaur obeys.
- Size: M.
- Calls: (1) the minotaur obeys one-way runs. Rec: yes. (2) Chevrons as
  marker glyphs along the run. Rec: yes for the prototype; shader crests
  from the pulse machinery only if Levi keeps the mechanism.

#### 4.1 Locks and keys (s3)

- Rules: a lock is a run that refuses passage until you hold its key. A
  key is a bead at a vertex; arriving takes it, with no tap. Keys are
  never used up. A refused tap thunks and the lock stays dim.
- Forms (`lockMode`):
  - `exit`: the exit tail's run is the one lock, opened by holding all
    its keys (1-3);
  - `shortcut`: locks on the plain route, one key each, placed so the
    detour competes with the long way round;
  - `colors`: each key has a color, the latest key held dyes the yarn
    (`pathColor`), and a gate passes only a yarn of its color.
- Turn and real time: locks block the minotaur and the fire too (rec),
  as broken runs do (K137-b).
- Builds on: K83 glyph beads (`marker_glyphs.ts`, `marker_mesh.ts`), the
  controller's refusal path, the HUD.
- Generation: none. Keys go where the start-key-gate detour is longest
  inside a band (K80: up to 11 runs at radius 4). The kit searches
  (vertex, keys held): 2^k states, k at most 3.
- Params: `keys` (`ky`, 0-3, default 0), `lockMode` (`lkm`: exit |
  shortcut | colors, default exit).
- Files: `src/game/locks.ts` (new), `rule_search.ts`, the controller,
  the glyphs, `fabric_maze_renderer.ts`, the HUD (keys held).
- Size: M.
- Calls: (1) the default form. Rec: exit, the clearest. (2) Locks block
  the minotaur and the fire. Rec: yes.

#### 4.11 Switches (s4)

- Rules: a lever is a junction. Arriving there flips its gates: each
  gate run toggles between open and shut. A shut gate refuses taps. A
  lever and its gates share a color. At most two levers.
- Turn and real time: gates change only on the player's arrival. They
  block the minotaur too (rec).
- Builds on: the glyph beads (a lever at the junction, a clasp on each
  gate), the kit's held set.
- Generation: none. Placement gives each lever 2-4 gates near the plain
  route, half of them shut. The kit searches (vertex, lever states), at
  most 4 states, and checks that the rule bites.
- Params: `switches` (`sws`, 0-2, default 0).
- Files: `src/game/switches.ts` (new), `rule_search.ts`, the controller,
  the glyphs, the renderer.
- Size: M. Readability is the risk: section 5 allows no more than two
  gate types on one phone screen.
- Calls: arrival flips the lever. Rec: yes; a separate pull action costs
  a button.

#### 4.24 Tides, with the wait action (s4)

- Rules: tidal runs shut for one move in every `tidePeriod`, each from a
  seeded phase. A shut run refuses taps and shows dim. The wait action
  (section 0's decision 5) passes one move without moving.
- Turn clock: the tide steps with every move and every wait. Real time:
  the same move clock (rec, as for turnstiles).
- Builds on: s2's phase in the kit; the HUD.
- Generation: none. Placement tides a seeded share of the core runs. The
  kit searches (vertex, moves mod period) with waiting as a move, so
  every draw solves. It checks that the rule bites.
- Params: `tides` (`tid`, [0, 0.4] step 0.05, default 0), `tidePeriod`
  (`td`, 2-6, default 3).
- Files: `src/game/tides.ts` (new), `rule_search.ts`, the controller (a
  wait result), main.ts and `key_moves.ts` (the wait key), the HUD (a
  wait button), the renderer (shut runs dim).
- Size: M, plus S for the wait action.
- Calls: (1) a wait is a stroke. Rec: yes. (2) The wait key. Rec: the
  stage picks a free key in `key_moves.ts`, plus a HUD button.

#### 4.4 Required pickups, then 4.5 bonus pickups (s5)

- Rules (4.4): N beads at vertices; arriving takes one. The exit refuses
  you until all are taken: 4.1's exit lock, with the beads as its keys.
- Rules (4.5): bonus beads gate nothing. The HUD and the share count
  them. They never enter the K155 star rating or the time stat.
- Both clocks: no clock. The fire and the minotaur leave beads alone.
- Builds on: 4.1's held set and exit lock, the glyph beads.
- Generation: none. Placement spreads the beads by farthest-point
  sampling, favoring dead ends and side loops, and redraws until the
  shortest tour is at most 1.6 times the plain optimum (K80). The kit's
  search over (vertex, beads held) gives par: 2^9 x 199 is about 0.1 M
  nodes. Held-Karp over the beads is the fallback if that is slow.
- Params: `pickups` (`pk2`, 0-9, default 0), `bonusPickups` (`pkb`, 0-5,
  default 0). Section 4's `pickupsRequired` is dropped: its key `pkr` is
  taken (pickChoiceRatio), and the two counts say the same thing.
- Files: `src/game/pickups.ts` (new), `locks.ts`, `rule_search.ts`, the
  controller, the glyphs, the renderer, the HUD.
- Size: M, then S.
- Calls: the count when first turned on. Rec: 5 (K80 warns of tedium
  past about 6).

#### 4.6 Fleeing critters (s6, simulate first)

- Rules: 1-3 critters on the walk graph. Touching one catches it, by the
  minotaur's catch test. Catching them is optional in the first build
  (rec): the HUD and the share count them.
- Turn clock: a critter moves every other move. Within 3 runs of the
  player it flees by Brogue's flee map (distance to the player times
  -1.2, relaxed again); otherwise it naps. Real time: half the player's
  speed, the same flee radius.
- A perfect fleer at equal speed is never caught on a braided maze. The
  half pace and the naps make it catchable.
- Builds on: K137 s3c's monster list (`extras`, `TurnPack`), the chase
  graph, the `TurnRng` streams.
- Generation: none. Critters start at seeded vertices at least 6 runs
  from the start, favoring pockets.
- Simulate first: extend K708's turn sim (`.claude/probes/K708/`) with
  critters and a greedy chaser. Tune until a greedy player catches them
  all within about twice the plain optimum, over 288 mazes.
- Params: `critters` (`cr2`, 0-3, default 0).
- Files: `src/game/critters.ts` (new), `minotaur_turns.ts` and
  `minotaur.ts` (the monster list's hooks), the glyphs, the renderer,
  the HUD.
- Size: M.
- Calls: (1) optional or required. Rec: optional first. (2) The pace.
  Rec: every other move, confirmed by the sim.

#### 4.20 Rescue (s6)

- Rules: a lamb waits at a dead-end tip off the plain route. Reaching it
  makes it follow one run behind you. Finishing with it is a rescue. The
  minotaur hunts it too.
- Turn clock: the lamb steps after you, onto your last vertex. Real
  time: it trails one run behind, along your path.
- Builds on: K137 s3c's follower (Levi's sleeper variant), with a
  friendly flag; the minotaur's choice of target.
- Generation: none. Placement picks the dead-end tip farthest off the
  plain route (a pocket when dead ends are off).
- Params: `rescue` (`res`, bool, default off).
- Files: `src/game/rescue.ts` (new), `minotaur_turns.ts`, `minotaur.ts`,
  the glyphs, the renderer, the HUD.
- Size: M.
- Calls: a caught lamb. Rec: it goes back to its tip, and a finish
  without it is a plain finish.

#### 4.23 The myth (s7)

- Rules: the lair is the vertex farthest from the entrance. Reach it,
  take the sword there, then go back out: the exit is the entrance. The
  yarn (the trail) is the way back. The twist: the minotaur cuts the
  yarn where it crosses it.
- Turn and real time: the minotaur as today, on either clock.
- Builds on: the sword (`sword.ts`: its spot becomes the lair), the yarn
  (K137 s2's spool), the controller's goal.
- Generation: none. The far exit tail goes unused.
- Params: `myth` (`myt`, bool, default off).
- Files: `src/game/myth.ts` (new), `sword.ts`, the controller (a two-leg
  goal), `trail_paint.ts` (the cut yarn), the HUD, the share (section
  4's "in 24, out 19").
- Size: M.
- Calls: what a cut yarn does. Rec: the trail is erased where the
  minotaur crossed it, so the way back must be remembered.

#### 4.31 More exits (s8, the generation change)

- Rules: two exits, a near one and a far one. The far one earns a bonus.
  Finish at either. The minotaur guards one.
- Both clocks: no clock.
- Builds on: the escape tails (`generation-shapes.md`), the off-screen
  indicators, the finish marker.
- Generation: yes. `maze_plan.ts` and `maze_apply.ts` cut a second
  escape tail, and `walk_graph.ts` gains a list of exits (`distToExit`
  takes the nearer). Default off keeps every pin. On, the maze changes,
  so `exits` is a maze key. The plan checks that both exits are
  reachable.
- Params: `exits` (`ex2`, 1-2, default 1).
- Files: `maze_plan.ts`, `maze_apply.ts`, `walk_graph.ts`, the
  controller (a win at either), `offscreen_indicators.ts`, the markers,
  the share (which exit).
- Size: M.
- Calls: (1) which exit the minotaur guards. Rec: the far one, so the
  bonus costs risk. (2) The bonus. Rec: a share tag only; the stars stay
  K155's.

### Stage order

| Stage | Mechanisms | Why these together | Waits on | Size |
|---|---|---|---|---|
| s1 | the rule kit, 4.19 ice, 4.18 color rule | walk-only rules, no new GL program, no minotaur files | K137 s3b (merged) | M + M |
| s2 | 4.12 turnstiles, 4.27 hidden runs | junction and run looks; the kit gains a phase | s1; K720 merged (audio) | M + M |
| s3 | 4.2 one-way runs, 4.1 locks and keys | Unexplored's locks and valves; two gate types | s1 | M + M |
| s4 | 4.11 switches, 4.24 tides, the wait action | state and time gates | s2 (the phase) | M + M + S |
| s5 | 4.4 pickups, 4.5 bonus pickups | 4.1's held set and exit lock | s3 | M + S |
| s6 | 4.6 critters (sim first), 4.20 rescue | movers on the chase graph | K137 s3c | M + M |
| s7 | 4.23 the myth | the sword, the lair, the yarn | K137 s2, s6 | M |
| s8 | 4.31 more exits | the one generation change | none | M |

- Each stage is a working toggle in free play. Its rules compose with
  the earlier stages' through the kit.
- s6 and s7 are generation-free. They wait only on K137 s3c; if it
  merges first, run them before s3.
- s1's rules join the minotaur and the fire in s6, when the chase files
  are free. A slide then gives the turn minotaur k turns.
- Hotspots: every stage shares the controller, the HUD, the share and
  the params with K137 s2 and s3c. They can run side by side under the
  "your rows" rule of the K137 s2 brief; the second to merge renumbers
  its params.

### Questions for Levi

1. The rules start in classic play and join the minotaur and the fire in
   s6. Rec: yes.
2. Ice: a backtrack after a slide undoes the whole slide. Rec: yes.
3. Color: two forms, alternate (light and dark) and cycle (three colors
   in order), alternate first. Rec: yes.
4. Under a rule, par and the stars rate against the best legal route,
   not the plain one. Rec: yes.
5. Locks, one-way runs, pickups, switches and tides keep the maze as
   built; only 4.31 changes generation. Rec: yes.
6. Turnstiles and tides step on the move clock in every mode, real time
   included. Rec: yes.

## Handoff

Written (2026-10-21, 01:09-01:45):
- The "## Plan" section above: what the reading found, the rule kit, the
  13 mechanism entries, the stage order and six questions for Levi.
- `docs/design/K138_s1.md`: the first stage's brief (the rule kit, 4.19
  ice runs, 4.18 the color rule), ready to launch. Its agents table is
  left for the coordinator, and its ports (5390-5393) need confirming.

Left:
- Launch s1. A worktree agent branches from `origin/master`, so the two
  K138 docs must be on master first (this branch fast-forwards from
  3103ed4; it touches only `docs/design/K138_*.md`).
- The s2-s8 briefs, each written when its stage is next (the "Waits on"
  column).
- Levi's six questions above. s1 builds on the recs of 2, 3 and 4.

Handle fields:
- owner: nobody since 2026-10-21 01:45 (agent `a8880b1b86770b4ed` of
  claude session 91b19e11-7759-4638-ba60-4705b011b94f; the planning
  stage is done).
- branch: `worktree-agent-a8880b1b86770b4ed`, worktree
  `.claude/worktrees/agent-a8880b1b86770b4ed`; last commit: the commit
  that adds this Handoff (the s1 brief is `fc7e14f`).
- evidence: `docs/design/K138_plan.md` ("## Plan"),
  `docs/design/K138_s1.md`.
- next: put both docs on master, fill the s1 brief's agents table and
  launch K138 s1 (opus, 2 h cap), beside K137 s2 under the "your rows"
  rule or after it merges.
- brief: `docs/design/K138_s1.md` (s1); the "## Plan" section of
  `docs/design/K138_plan.md` (the stages after it).

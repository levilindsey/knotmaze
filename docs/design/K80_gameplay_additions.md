# K80: the minotaur, music and rhythm, and other gameplay additions

Research and design, 2026-10-13. No code changes. Brief: `docs/design/K80.md`
(Levi's request, verbatim), plus his 2026-10-13 addition on music and
rhythm mechanics. Evidence: `.claude/probes/K80/` (simulation harness,
outputs, `out/summary2.txt`); section 7 says how to rerun it.

Two kinds of statement are kept apart below. **Measured** means our
simulations on real walk graphs. **Research** means a cited source.
**Opinion** marks a design judgment of mine, usually a recommendation.

## 0. Recommendations and your decisions

### The minotaur in one paragraph (opinion, built on the measurements)

Ship it as a **telegraphed hunter**. It starts in its lair at the exit,
roams by walking to random destinations a few runs away (your idea, and
Brogue's), and charges when you come within 4 runs. Each move it makes
one run, at the same time as yours. The game always shows the run it will
take next, the way Into the Breach shows every attack. When it loses you
it checks the junction where it last saw you, then roams again. A red
glow under the weave marks it, brighter while it hunts. A catch sends you
back to the entrance with the minotaur back in its lair, and counts
against you. Undo is allowed in free play only. The mode composes with
fog of war, where it becomes frightening, and with a sword pickup that
turns the chase around.

### What the simulations settled (measured)

Our gs-18 mazes are extremely braided: about 200 junctions and 300 runs,
with a cycle rank of about 100. Section 2.1 has the tables.

- **A careful player who can see it is almost never caught by a one-run
  minotaur on our braided mazes**, whatever its rule: 2 catches in 9,000
  telegraphed games (110 mazes, 12 one-run rules), both inside dead ends.
  This is the textbook result: one pursuer cannot catch an evader on a
  graph full of cycles of length 4 or more.
- **When it catches an attentive player, it happens in a dead end.** An
  explorer who always looks was caught 324 times in 9,000 telegraphed
  one-run games: 323 inside a pocket (a dead-end tip, or a lasso loop),
  1 in a tail, none in the braided core.
- **Danger comes from inattention, fog, dead ends and speed.**
  - Inattention: a player who checks the minotaur on 80% of moves is
    caught by the telegraphed hunter 13% of the time on dailies and 27%
    on dead-end-heavy mazes.
  - Fog (radius 4): 11% on dailies.
  - A chaser that always knows where you are: 20%.
- **Reactive fast minotaurs are unfair.** At two runs per move without
  telegraphing, an exact solver finds 0% of dailies winnable, and every
  catch of a careful player is forced. Telegraphed, the same minotaur is
  beatable on 100% of mazes. **Telegraphing is what makes speed fair.**
- **Pure random walks and wanderers are toothless:** 3-5% catches with
  lapses, and 1-2 turns a game within two runs. **A pure chaser
  tailgates:** 15-20 such turns a game. The hunter sits between them:
  about 11 near turns for an explorer, and 13% catches with lapses.
- Patrols near the exit need checking. A loop sentry left 7% of dailies
  unwinnable even with perfect play.

### Decisions for you

1. **Movement model.** Recommended: the hunter (section 2.3d), with
   `guard` (a territory around the exit) and `stalker` (always chasing)
   as variants, and Abbott's rule as a separate puzzle mode. Pacing
   patrols suit sentry enemies (section 4.8) better than the minotaur.
2. **Telegraph by default?** Recommended: on by default, and forced on at
   two runs per move. Off is a hard variant, at one run per move only.
3. **What a catch does.** Recommended: back to the entrance, counted
   (Celeste-style), so a daily always finishes. The alternative ends the
   attempt, like a failed Wordle. Section 2.8.
4. **Undo.** Recommended: in free play only, counted in the stats.
5. **A wait action** (tap your own junction to let a turn pass)?
   Recommended: not for the hunter, which never needs it. Yes for Abbott
   and sentry puzzles, where waiting is part of the design (section 2.4).
6. **Dead ends with the minotaur.** They become its hunting ground.
   Recommended: allow them; dead-end days are the scary days. K74's
   longer junction-free dead ends stay one run (two moves) deep. Only
   dead-end BRANCHES, several runs behind one bridge, would make deeper
   traps, so K74 and K80 should agree on that.
7. **On dailies:** add it as a modifier (K46's modifier slot), with its
   params pinned by the daily definition. Not before it has had a few
   weeks in free play.
8. **The music and rhythm first experiment** (section 3.7). Recommended:
   every move plucks its run, the move departs on the next beat (Rez),
   and a soft "groove" rewards on-beat taps. Nothing is ever punished.
   Then the melody path ("the song is the map") as its own mode.
9. **Suggested order after the minotaur** (section 5):
   - the sword and lure plucks;
   - traversal plucks and a notes color scheme;
   - beat quantizing;
   - locks and keys as shortcut gates;
   - one-way runs;
   - crack-then-break runs;
   - the melody path;
   - validated sentries.

**Round 2 (K114, 2026-10-13):** your further notes (real time, the
spider, fire, cutting, long runs, Pluck Hero, the auto-solver), with
their exploration, a ranked shortlist and ten more decisions, are in
section R, between 4.35 and section 5. The nine decisions above are
unchanged.

## 1. Our medium (facts this design builds on)

- The threads ARE the paths. A move is one tap at a branch point that
  runs ONE walk-graph run, junction to junction
  (`src/game/fabric_controller.ts` `tapEdge`). Re-tapping the run just
  traveled is a backtrack. Trail mode makes every tap an advance.
- The walk graph (`src/core/walk_graph.ts`) is a multigraph: junctions
  and END vertices, runs with lattice lengths, possible self-loops, and
  Dijkstra's `distToExit`. Start and exit are END vertices, the cut tails.
- Measured at gs 18 (30 dailies; medians):
  - 199 vertices, 302 runs, cycle rank 103;
  - 3 bridges (the two tails plus one), 2 pocket vertices;
  - girth 2 (parallel runs exist);
  - the optimal route is 18 runs and 80 lattice units; the fewest-runs
    route is 15 runs.

  With `deadEnds` at density 1: 8 dead-end tips, each a ONE-run pocket
  (a tip run off a junction; sometimes a lasso, a junction whose other
  run is a self-loop). Section 7 has the table.
- An attempt IS its tap list (K47); `replay(taps)` rebuilds the whole
  solve state. Anything that moves must be a pure function of (walk
  graph, seed, params, taps): that keeps saved attempts, undo and K85's
  replay links exact.
- The move log is g / d / b (shortest-route step, detour, backtrack). The
  share grid shows them as green, yellow and red squares.
- Desktop clicks resolve on press, touch taps on release (main.ts).
- **A move is silent today.** Only taps on non-choice threads, drags and
  the auto plucks (soundMode random and music) sound.
- The head glow is a soft radial sprite UNDER the weave
  (`fabric_maze_renderer.ts`: `underContainer`, `glowSprite`). That is the
  precedent for the minotaur's red highlight.
- Off-screen targets register with K73's indicator registry
  (`indicators.add` in `src/ui/offscreen_indicators.ts`). Each registers
  its world position, marker radius, icon SVG, style, visibility
  predicate, label and tap action; the finish is the first client. K83's
  marker glyphs (a black disc with a white stroked icon,
  `src/render/marker_glyphs.ts`) set the marker style.
- Audio:
  - `knot_synth.ts`: an extended Karplus-Strong harp in an AudioWorklet,
    behind the autoplay gate.
  - `pitch_space.ts`: every run owns one stable pitch, by length bucket
    (longer = lower). Music mode buckets onto the song's own pitches.
  - `songs.ts`: Scarborough Fair, D dorian, 3/4, 132 bpm.
  - `synth.pluck(freq, strength)` sounds NOW: the worklet node starts when
    it is created, and there is no scheduled start time.
  - Music mode times its notes with `performance.now()`, polled in the
    render tick (`autoAudioTick`). Onsets jitter by up to a frame: 16 ms
    at 60 fps, up to 100 ms during a gs-18 settle.
  - [Stale since K101 (e9e01ae), which landed while this was written:
    `pluck` takes a start time and music mode schedules ahead on the
    audio clock. See R.2.]

## 2. The minotaur

### 2.1 What we know

**Research: pursuit on graphs.**
- In cops and robber (Quilliot 1978; Nowakowski and Winkler 1983; Aigner
  and Fromme 1984), "on a tree, the cop number is one", and "on a cycle
  graph of length more than three, the cop number is two". On a cycle,
  one cop is evaded forever by keeping a two-step gap.
- Cop-win graphs are exactly the dismantlable graphs.
- "Every graph whose girth is greater than four has cop number at least
  equal to its minimum degree."

Sources: https://en.wikipedia.org/wiki/Cop_number and
https://en.wikipedia.org/wiki/Cop-win_graph.

Our game differs: the robber must REACH the exit, and the cop starts on
it. The theory bounds that game but does not decide it, so the
simulations do.

**Measured: the harness.** `.claude/probes/K80/` builds 110 mazes exactly
as main.ts does:
- 30 V1 dailies;
- 30 with `deadEnds` on;
- 20 "tree-like" (`deadEnds` at density 1);
- 20 small (gs 14);
- 20 long-hall (junctionSpacing 3).

It then plays 15 minotaur rules, each telegraphed (T) and reactive (R),
against six player models, 8 games per maze for random rules. The
minotaur starts on the exit END. The contact rule and turn order are in
section 2.2.

The player models:

| Model | Knows the map | Sees the minotaur | Picks |
|---|---|---|---|
| route | yes | no | the optimal route, ignoring the minotaur |
| aware | yes | always | the cheapest path to the exit, with extra cost near the minotaur; never a move it can see is deadly |
| explorer | no (sees the exit marker) | always | unvisited runs first, toward the exit marker; avoids deadly moves |
| explorer80 | no | on 80% of moves (lapses) | as explorer |
| explorerFog4 | no | within 4 lattice units (fog of war's default radius) | as explorer |
| awareFog4 | yes | within 4 lattice units | as aware |

Exact solves (breadth-first over (player, minotaur state)) answer "is
this maze winnable at all?" for the deterministic rules.

**Catch rates, telegraphed, by maze set (% of games).** These are the
players who matter: the explorer, the one with lapses, and the one in
fog.

| Rule (T) | explorer daily / tree-like | explorer80 daily / tree-like | explorerFog4 daily / tree-like | near turns per game (explorer, daily) |
|---|---|---|---|---|
| random walk | 0 / 0 | 5 / 8 | 3 / 4 | 2.0 |
| wander (3-8 runs) | 0 / 0 | 3 / 2 | 3 / 3 | 1.4 |
| pace 4 runs out from the exit | 0 / 0 | 17 / 10 | 3 / 10 | 3.9 |
| loop through the exit | 0 / 5 | 7 / 20 | 7 / 10 | 4.4 |
| chase, perfect | 3 / 23 | 20 / 43 | 12 / 33 | 20.1 |
| chase 0.8, pause 0.1 | 0 / 9 | 21 / 26 | 19 / 19 | 12.2 |
| **hunter** (wander; chase within 4, 0.9; pause 0.1; give up beyond 7) | **1 / 11** | **13 / 27** | **11 / 18** | **10.9** |
| hunter with a 2-run charge | 3 / 19 | 19 / 31 | 16 / 27 | 18.9 |
| guard (hunter with its territory within 6 runs of the exit) | 1 / 10 | 18 / 23 | 13 / 21 | 12.8 |
| Pac-Man scatter/chase | 0 / 0 | 9 / 13 | 3 / 15 | 9.9 |
| Abbott, 1 run | 0 / 5 | 7 / 20 | 0 / 5 | 11.3 |
| Abbott, 2 runs | 0 / 25 | 10 / 45 | 10 / 25 | 18.9 |
| ambusher (heads 2 runs ahead of you) | 0 / 25 | 34 / 52 | 30 / 44 | 35.0 |

"Near turns" are moves ending within two runs of the minotaur: a
measure of tension. Long-hall mazes (junctionSpacing 3) behave like the
tree-like ones: the explorer is caught 9% by the hunter and 21% by the
perfect chaser. The full table is in `out/summary2.txt`.

**Telegraphed versus reactive.** Each cell is the % caught, telegraphed
→ reactive. The careful player is `aware`:

| Rule | aware | explorer | exact solve: winnable (T → R) |
|---|---|---|---|
| chase, perfect, 1 run | 0 → 0 | 3 → 3 | 100% → 100% |
| chase, perfect, 2 runs | 0 → **100** | 0 → **100** | 100% → **0%** |
| hunter with a 2-run charge | 0 → 46 | 3 → 76 | - |
| Abbott, 2 runs | 0 → 37 | 0 → 67 | 100% → 100% |

(dailies; the other sets agree)

**Where the attentive player dies.** Over the 12 telegraphed one-run
rules (9,000 games per player):
- `aware`: 2 catches, both inside pockets.
- The full-attention explorer: 324 catches, 323 inside pockets (a
  dead-end tip or a lasso) and 1 in a tail. None in the braided core.
- Reactive, the same rules caught `aware` 6 times (2 in the core) and the
  explorer 449 times (81 in the core).
- The telegraphed 2-run charge cornered `aware` in the core 4 times in
  960 games.

**Exact solves.** Every deterministic one-run rule was winnable on
100% of dailies, dead-end and tree-like mazes, with one exception: the
loop sentry, at 93% (7% of mazes never open). Perfect play needed only
1.00-1.13 times the fewest-runs route. Waiting (a "skip" action) changed
the verdict nowhere except the reactive two-run chaser (0% → 7% on
dead-end mazes).

**Pacing (a quote, not a measurement).** Iwatani designed Pac-Man's
ghosts so "they weren't all just chasing after Pac Man in single file,
which would have been tiresome and flat". "They'd attack and then they'd
retreat... It seemed more natural than having constant attack." "When a
human being is constantly under attack like this, he becomes
discouraged." (Programmers at Work, 1986.)

### 2.2 Turns and contact (the rules)

- **A turn is one accepted tap.** You run one run; the minotaur moves
  `minoSpeed` runs: one, or two while charging, or one every other move.
  Advances, backtracks and trail-mode moves all count. Levi's "one
  segment each turn you move" maps exactly onto our move.
- **Simultaneous, continuous contact** (opinion; the simulations use
  it). Both animate during the same traversal. You are caught if:
  - you both end on the same junction;
  - you cross on the same run head-on;
  - or you arrive where it stands.

  Stepping onto the junction it is LEAVING by another run is safe. This
  matches what the eye sees, unlike the sequential rule (you move, then it
  moves), where a junction it visibly left could still kill.
- **Telegraphed:** it commits to its next move at the end of your
  previous one, from where you stood, and the game shows that move. You
  always know which runs are deadly. **Reactive:** it picks after seeing
  your tap. At one run per move, reactive changes little for careful
  players (0% either way), and catches more of those with lapses (the
  perfect chaser: 20% → 33%). At two runs it is lethal. So reactive is a
  hard variant at speed one only.
- **Sanctuary:** it never enters the entrance tail, and a player there is
  invisible to it. That prevents spawn camping.
- **Its lair is the exit END.** It never returns there, so it can never
  sit on the goal.
- **Animation:** its run plays over the same duration as yours, so a
  long run reads as a dash. A turn never waits for two animations.

### 2.3 Movement models

Each model has a precedent, a measurement and its trade-offs.

**a. Random walk.** It picks a random incident run, never straight back.
- Measured: a catch in 0-8% of games, about 2 near turns a game. It
  dithers and has no intent, so it reads as noise. Not recommended,
  except as a sentry flavor.

**b. Purpose-driven wandering (Levi's idea).** It picks a random junction
2-8 runs away, walks there by the fewest runs, then picks again.
- Research: Brogue's wanderers do exactly this between precomputed
  waypoints. `chooseNewWanderDestination` marks the target visited,
  re-arms two random ones ("equilibrates to 50% of checkpoints being
  active"), and takes the nearest unvisited one (Brogue CE,
  `src/brogue/Monsters.c`).
- Measured: rarely meets you (1.4 near turns a game) and catches 2-5%.
- Opinion: better than a random walk, because its motion has
  readable intent. But alone it is toothless. It is the right IDLE state.

**c. Patrols and pacing.** It walks out and back along a fixed corridor,
or circles a loop.
- Research: Hitman GO's enemies "remain static or rotate on a single
  node" or "patrol the board along a specific route", each type colored
  so its pattern can be learned.
- Measured:
  - Pacing 4 runs out from the exit catches 17% of explorers with
    lapses and makes cautious players wait (7% of reactive explorer
    games ran out of time).
  - A loop through the exit junction made 7% of dailies unwinnable,
    exactly.
- Opinion: patterns are learnable and fair only when checked per maze. They
  belong to sentries (section 4.8), not to the minotaur, whose appeal is
  that it reacts to you.

**d. Proximity-triggered chase with memory: the hunter (recommended).**
It is a small state machine:

1. ROAM (state b).
2. When you come within `minoSight` runs, HUNT. It steps toward you,
   optimally with probability `minoAccuracy`, otherwise at random.
3. On any turn it may PAUSE with probability `minoPause` (it snorts).
4. When you get more than `minoSight + 3` runs away, it SEARCHES: it
   walks to the junction where it last saw you, then roams again.

- Research: Brogue's hunters follow the player's scent (where you have
  been). When they lose it out of view they `wanderToward(monst,
  monst->lastSeenPlayerAt)`, and beyond twice the stealth range they
  keep tracking only on a 97% roll per turn. Iwatani's attack-and-retreat
  rhythm is the same idea in time.
- Measured: the table's middle ground. About 11 near turns a game,
  13% caught with lapses, 27% on dead-end mazes, 11% in fog, 0% for
  careful players.
- **Variant `guard`:** its roaming territory centers on the exit
  junction, so the climax is getting past it. Measured on dailies: 18%
  with lapses. The aware player always wins, using 6% more moves than the
  route, and no game timed out.

**e. Pac-Man modes (scatter and chase).**
- Research (the Pac-Man Dossier):
  - Level 1 alternates scatter 7 s / chase 20 s, twice, then 5 / 20,
    5 / 20, then chases forever.
  - Ghosts steer by a one-tile look-ahead toward a target tile, take the
    exit nearest it in a straight line, and "never voluntarily reverse
    direction".
  - Every chase/scatter switch forces a reversal, which is the player's
    cue that the mode changed.
  - Blinky targets Pac-Man's tile; Pinky four tiles ahead; Clyde
    switches to his corner within 8 tiles; frightened ghosts turn
    pseudo-randomly.
- Measured (scatter toward the exit corner, chase steering at you, no
  reversal): 9% with lapses, about 10 near turns a game. Steering by
  straight-line distance gets it lost in the knot's curves, which is part
  of the charm.
- Opinion: the schedule is a fine flavor (`ghost`), and the reversal
  cue is worth stealing for any mode change.

**f. Abbott's rule: the puzzle minotaur.**
- Research: in Theseus and the Minotaur (Mad Mazes, 1990), "For each
  turn that Theseus takes, the Minotaur takes two turns". It moves
  horizontally if that gets it closer, else vertically, else "he just
  skips that turn"; "He doesn't look ahead more than one turn". Theseus
  "can delay for one turn"
  (https://webdiis.unizar.es/~spd/pub/games/Theseus/Theseus.html).
- On a knot: each step it takes the run whose far junction is strictly
  closer to you in a straight line, and otherwise stands still.
- Measured:
  - At two steps telegraphed, careful players die only in dead ends (0%
    on dailies, 5% on tree-like mazes), but explorers die 25% of the time
    on tree-like mazes.
  - Reactive, it kills 37-60% of careful players, although an exact
    solve finds 95-100% of mazes winnable.
- Opinion: a rule you must understand and exploit, by luring it behind
  a thread where no step brings it closer. That is a different game: a
  puzzle mode with the wait action, small mazes, and a per-maze solve to
  set par.

**g. Ambusher.** It heads for where you will be, two runs ahead on your
best route (Pinky).
- Measured: the deadliest at one run (34% with lapses), and it produces
  endless near turns (35 a game for the explorer).
- Opinion: too oppressive as the minotaur. As a second enemy beside a
  hunter it would echo Pac-Man's team, but that is later work.

### 2.4 Chase quality and speed

- **Optimal steps.**
  - Measured: a perfect chaser, which always knows where you are,
    tailgates (20 near turns a game). It cannot catch a careful player
    at equal speed (0%), and catches 20% of those with lapses.
  - Opinion: "always optimal" is not scary, just clingy.
- **Mistakes and pauses.**
  - Measured: accuracy 0.8 plus a 10% pause leaves catches about the
    same (21% with lapses) but tailgates less.
  - Opinion: a pause is the better kind of mistake. It reads as the beast
    catching its breath, which gives a beat to escape. Random wrong turns
    read as a bug. Recommended: accuracy 0.9, pause 0.1.
- **Memory.** Hunting your last-seen junction, rather than your live
  position, is what makes hiding meaningful (Brogue). It matters most in
  fog.
- **Speed.**
  - One run per move is the baseline: braids make it fair.
  - Half speed (a move every other turn) is barely easier.
  - Two runs per move is only fair telegraphed: 13% with lapses but 27
    close calls a game on dailies, a frantic feel.
  - The charge (two runs only while hunting) is the best "hard" knob:
    19% with lapses, and 4 catches in 960 games for careful players.
- **Sub-run positions** (distance-based movement, opinion):
  - The minotaur could move the same lattice distance you moved, times a
    ratio, and stop mid-run.
  - For: speed would mean something physical (a long run gives it a
    long move), closer to Pac-Man's real-time feel.
  - Against: the telegraph becomes a distance-bounded stretch rather than
    a run, contact becomes continuous along runs, and it can lurk
    mid-run.
  - Runs vary from about 1 to 50 lattice units (median 3.7), so it would
    also change the game's pace a lot.
  - Recommended: keep run-based turns (a board game, like Hitman GO and
    Lara Croft GO). Revisit if long runs feel cheap.
- **Waiting** (opinion). The braided hunter never needs a wait action:
  solves gave the same verdicts with and without it. Abbott-style and
  sentry puzzles do. A wait could be "pluck your own junction": you play
  a note and let a beat pass, which ties into the instrument.

### 2.5 Starting at the finish, and luring

- Measured: from the exit END the hunter first comes within two runs of
  the player after 14-15 moves (median, dailies), about where the route
  is half done. No spawn grace is needed. Still, a `minoSleep` of a
  few moves gives the intro room to breathe.
- The lair at the finish turns the endgame into a slip-past, especially
  for `guard`. The game never deadlocked: the guard leaves the exit
  junction often enough.
- Luring (opinion):
  - With telegraphing, the player sees where it is going, and can draw a
    hunter away by showing themselves and then slipping around a loop.
  - Abbott's minotaur is the purest lure puzzle.
  - A lure pluck (section 4.10) makes luring a deliberate tool.

### 2.6 Fairness guarantees

Rules, each backed by a measurement or a proof sketch:

1. **Telegraph plus continuous contact.**
   - At one run per move, a junction is deadly to leave only along runs
     ending where the minotaur will end, or along the one run it walks
     toward you head-on. A junction has at least three runs, so some run
     is always safe unless several are parallel to its target. The
     exception is a lasso: a junction whose third run is a self-loop has
     only two ways out, and it is a pocket.
   - Measured: with telegraphing, no attentive player was caught in the
     braided core at one run per move (0 core catches in 18,000 games,
     `aware` and explorer).
2. **Pockets are the only traps.** A dead-end tip is one run deep, and
   it is entered by choice.
   - The player sees the minotaur's distance to the pocket's mouth.
   - A mouth closer than two moves is the warning that a player learns.
   - K74's longer junction-free dead ends stay one run deep in moves:
     the trap gets longer to look at, but is still two moves in and out.
     Dead-end branches (several runs behind one bridge) would be deeper.
3. **Sanctuary:** the entrance tail.
4. **The exit is never occupied.** The minotaur never returns to its lair
   END.
5. **No reactive minotaur faster than you.** Measured: the exact solve
   found 0% winnable at two runs reactive.
6. **Validate the deterministic ones per maze.** Patrols, sentries and
   Abbott get the exact solve at generation. It explored at most 21,225
   states, and took 1-12 ms per maze in the smoke test on this desktop
   (single runs, not a timing study). A failed maze rerolls, as K46's
   day bands do.

### 2.7 Telegraphing (showing its next move)

- Research: "We wanted to make something where every death felt like
  your own fault... This lead us to use of telegraphed enemy attacks as a
  core mechanic", and "When every enemy attack is telegraphed... the game
  starts to feel like a puzzle" (Justin Ma, Into the Breach, Road to the
  IGF).
- Look (opinion):
  - Red chevrons flow along the run it will take, in its direction,
    drawn like the pulse crests but red and slower.
  - Its destination junction gets a thin red ring.
  - At two runs, both runs show, the second dimmer.
  - While it roams, the telegraph is faint; while it hunts, it is bright.
  - On a phone at fit scale threads are 4-5 px wide (K46 measured), so
    the chevrons must be bold. A glow under the weave reads better than a
    thin line (K76's halo finding).
- Reactive variant: show its reach (the junctions it could take this
  turn) as a faint red wash.

### 2.8 The red highlight, catches and retry (phones first)

- **Its marker** (opinion; Levi asked for "a red highlight behind its
  position"):
  - A soft red radial glow under the weave, the head glow's twin. It is
    dim while it roams and stronger while it hunts.
  - A one-shot flare when it first sees you, the moment of being noticed.
  - On top: a K83-style marker glyph (black disc, white stroked horns).
  - Its dot rides the thread with the head dot's ctrl-space
    interpolation (Stage 12), so no physics is touched.
  - Off screen: register it with `indicators.add`. Show it while it
    hunts or is within a few runs, with a horns icon in red; a tap pans
    to it.
- **A catch:**
  - Both animations finish at the contact point. A red ring bursts from
    the head dot (static under reduced motion).
  - The caught run gets a low, dull pluck an octave down, with a
    dissonant neighbor.
  - On Android, `navigator.vibrate(60)`. It needs sticky activation and
    does nothing on Safari (MDN).
- **Then:** a banner, "Caught by the minotaur", with:
  - **Try again:** back to the entrance and the minotaur to its lair.
    The same seed means the same minotaur for the same taps, so a player
    can learn.
  - **Undo move:** free play only. It replays the taps minus the last.
  - **Explore without it:** turns the mode off, and leaves the daily.
- **Dailies, two options:**
  - (a) A catch ends the official attempt as a loss. Wordle-honest, but
    the daily becomes unfinishable for many.
  - (b) A catch restarts from the entrance with the clock running, and
    the catch is counted. **Recommended:** (b). It keeps K20's "first
    finish is official", and the catch count is the sting.

### 2.9 Stats and share

- New stats:
  - **catches** (restarts after contact);
  - **close calls** (moves ending one run from it);
  - optionally **seen** (moves it spent hunting you). Hitman GO's
    "finish unseen" style of bonus would key off this.
- The move log gains a fourth kind, `x` (the move you were caught on).
  The share grid shows it as 🐂, in place of that move's square. A title
  line adds "🐂 2" or "🐂 0 · 5 close calls".
- Efficiency stays optimal / your final route. Catches and the restart
  walk are priced by time and the catch count, not by efficiency.

### 2.10 Interactions

- **Backtracking.** Every tap is a turn, backtracks included.
  - K47's "Reset path" on a daily backtracks one run at a time. With the
    minotaur that would be suicide, so in this mode Reset path is the
    restart (logged; not a catch).
- **Trail mode** works unchanged: the minotaur only sees positions.
- **Fog of war** is where the minotaur becomes frightening (11% with fog
  versus 1% without, for the explorer).
  - Hide the minotaur beyond the fog's radius, but let its red glow bleed
    faintly through the fog, so you sense it.
  - Play footsteps: a quiet low pluck of the run it walks, panned by its
    screen x and louder when near.
  - Show its telegraph only when it is visible.
  - Recommended as the "horror" combination, with sound cues on.
- **Thread reveal** (K76, `threadReveal`): it walks hidden runs, so show
  only its glow when it stands on unrevealed thread. Optionally its trail
  reveals the threads it trampled (a hint).
- **Dailies:** a design param, so not exempt. The daily definition pins
  it (K46's modifier slot; K82 per-day overrides).
  - Its RNG must be counter-based on (day seed, turn, call), as the
    harness's `TurnRng` is.
  - K47's attempt fingerprint must cover the minotaur params, so a
    changed minotaur refuses to replay.
- **Replay links (K85):** nothing extra. The minotaur replays from the
  taps.
- **Camera:** in follow mode, frame both the head and a hunting minotaur
  when both fit; in fit mode under fog, the fog-visible region as today.
- **Sound:**
  - a growl (a low dissonant dyad) when it first sees you;
  - a heartbeat-like double pluck while it is within two runs;
  - footsteps as above.

### 2.11 Params

All are appended to the current codec table (v4 after K73), with defaults
that leave every existing link and daily unchanged.

| Param | Type | Range, step | Default | Legacy key | Notes |
|---|---|---|---|---|---|
| `minotaur` | enum | off, hunter, guard, stalker, ghost, abbott | off | `mt` | hunter = 2.3d; guard = hunter with its territory at the exit; stalker = always hunting; ghost = Pac-Man schedule; abbott = Abbott's 2-step greedy rule |
| `minoSpeed` | enum | half, one, charge, two | one | `msp` | charge = two runs while hunting; two always telegraphs |
| `minoTelegraph` | flag | | true | `mtg` | off allowed only at half / one |
| `minoSight` | runs | [1, 12], 1 | 4 | `msi` | gives up beyond sight + 3 |
| `minoRoam` | runs | [2, 20], 1 | 8 | `mro` | destinations 2..roam runs away (guard: from the exit junction; measured at 6) |
| `minoAccuracy` | 0-1 | [0, 1], 0.05 | 0.9 | `mac` | chance a hunting step is optimal |
| `minoPause` | 0-0.5 | [0, 0.5], 0.05 | 0.1 | `mpa` | chance it stands still a turn |
| `minoSleep` | moves | [0, 20], 1 | 0 | `msl` | moves before it wakes |

- Panel: a Minotaur folder with the mode, speed and telegraph rows;
  the rest in a collapsed "behavior" subfolder (K84's param pass will
  judge each).
- Not params: the sanctuary, the lair, the contact rule, and catches as
  restarts. These are rules, not knobs.

## 3. Music and rhythm mechanics (Levi's addition, 2026-10-13)

Levi: color-coding segments to notes; plucks when traversing; good paths
play a melody and bad segments dissonance; rhythm mechanics that keep you
moving, with each traversed segment's pluck re-pitched to fit the melody
and more dissonant when out of rhythm.

### 3.1 What the research says

- **Beat-locked movement** (Crypt of the NecroDancer, 2015):
  - You "can only move... if [you] perform the action on the beat".
  - A miss "does not directly harm the character in most situations";
    it resets the coin multiplier.
  - Monsters follow "predetermined patterns that the player must learn"
    (skeletons act on alternate beats).
  - Ryan Clark found the first timing "too tense": stressed players
    missed, got hurt and missed more. He "greatly expanded the accuracy
    window" and added auto-calibration that senses rushing or dragging.
  - A 2022 "No Beat" mode drops the rhythm
    (https://en.wikipedia.org/wiki/Crypt_of_the_NecroDancer).
  - Cadence of Hyrule's Fixed-Beat Mode makes "enemies move only when
    you do", and press called it an accessibility setting
    (https://www.zeldadungeon.net/cadence-of-hyrule-can-be-played-without-rhythm-mode/).
  - **Our maze already is the fixed-beat game.** A beat is something to
    add on top, optionally.
- **Beat-quantized actions** (Rez, 2001): it "quantised all sound
  effects, from your shots to explosions, so they play in time and key
  with the music" (PlayStation Blog, 2017). Input is free and output
  lands on the grid, so nothing ever sounds wrong. In Lumines (2004,
  also Mizuguchi's), a sweeping line clears squares, and each song sets
  its speed.
- **Forgiveness** (Hi-Fi Rush, 2023): attacks sync to the music
  automatically. Timing earns rewards, but the game stays fun however
  precisely you hit. This is John Johanas contrasting NecroDancer's
  penalties, as reported secondhand (Twinfinite on his MinnMax
  interview); see also GDC 2024's "Developing Hi-Fi RUSH Backwards".
- **Timing windows:** osu! scores hits within ±(80 - 6 OD),
  ±(140 - 8 OD) and ±(200 - 10 OD) ms: ±50 / 100 / 150 ms at OD 5
  (https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty).
- **Music as a key** (Loom, 1990): spells are four-note "drafts" on the
  distaff, learned by listening to objects.
  - The Standard level shows the notes; Expert "must be played by ear".
  - Some drafts played backwards do the opposite ("Dye" and "Bleach")
    (https://en.wikipedia.org/wiki/Loom_(video_game)).
  - Zelda's ocarina songs and Simon's call and response are the same
    family.
- **Consonance and dissonance:**
  - Plomp and Levelt (JASA 1965): two tones sound roughest near a
    quarter of a critical band apart, and consonant beyond a full band
    (about a minor third, above the low registers).
  - McDermott et al. (Nature 2016, doi:10.1038/nature18635): Tsimane
    listeners showed no preference for consonance, which grows with
    exposure to Western music. Yet their dislike of roughness (beating
    between close tones) matched Western listeners'.
  - So "wrong = dissonant" works for our players by learning, while
    roughness carries more universally. Pair it with a visual cue either
    way.
- **Web Audio timing:**
  - "A tale of two clocks" (Chris Wilson, 2013): main-thread timers "can
    easily be skewed by tens of milliseconds or more". Schedule notes on
    `AudioContext.currentTime` with "100ms of 'lookahead' time, with
    intervals set to 25ms", and draw from the audio clock
    (https://web.dev/articles/audio-scheduling).
  - `AudioContext.outputLatency` (Baseline 2025) estimates the device's
    output delay.
  - `getOutputTimestamp()` (Baseline 2021) pairs a context time with a
    `performance.now()` time (MDN).
- **Phone latency:**
  - Android's WALT measured tap latency (touch-down to app) of 9.6-29.6
    ms, and native audio output of 8.9-32.1 ms, on 2016-17 Nexus and
    Pixel devices (`platform/external/walt` docs). A browser adds
    buffering on top.
  - Bluetooth headphones add far more: lab averages of about 170-370 ms
    are reported for SBC and AAC (rtings.com; SoundGuys).
- **Accessibility:**
  - "Ensure no essential information is conveyed by sounds alone" (Game
    Accessibility Guidelines, Hearing, Basic): test by playing with the
    sound off.
  - WCAG 2.3.1 caps flashes at three per second.

### 3.2 Our stack, and what a beat needs

- Pitches are per run and stable (`pitch_space.ts`): the instrument
  exists.
- `colorScheme` already colors runs per segment (the `segments` scheme
  and per-vertex RGB), so a notes scheme is a palette.
- Missing piece 1: **scheduled plucks.** Today `synth.pluck` starts at
  once. A beat needs a start time.
  - `KnotStringProcessor` would take a `startTime` in its
    processorOptions and stay silent until `currentTime` reaches it. The
    node is created about 100 ms ahead.
  - A lookahead scheduler (25 ms tick, 100 ms horizon) on
    `currentTime` replaces `autoAudioTick`'s `performance.now()`
    polling. That also fixes music mode's frame jitter today.
  - [Built since by K101 (e9e01ae), in a different shape: a 0.3 s
    lookahead polled from the render tick, with sample-accurate starts
    in the worklet. See R.2.]
- Missing piece 2: **the input clock.**
  - Judge a tap by its pointer event's `timeStamp` (the performance
    clock), mapped to audio time through `getOutputTimestamp()`, minus
    `outputLatency`, plus a calibration offset.
  - Touch moves resolve on release here, so a rhythm mode judges timing
    by the pointerdown time and still resolves the move on release.
- The autoplay gate means no sound before the first gesture. **The first
  tap starts the music**, and that tap is beat one.

### 3.3 Options

Each option has trade-offs and params (proposed names; defaults off).

**A. Traversal plucks.** Each move plucks its run as the dot departs,
softly again on arrival.
- For: a maze you can hear; the foundation for everything below.
- Cost: tiny (one `synth.pluck` per move).
- Param: `traversalPluck` (`tpl`, flag, default off). It belongs in the
  Sound folder, and joins `DAILY_EXEMPT_KEYS` as a playback preference.

**B. Notes as colors.** A `notes` option for `colorScheme`: pitch class
gives the hue, octave the lightness.
- Order the hues around the circle of fifths, so notes a fifth apart
  look related, rather than chromatically.
- For: the maze becomes a score; it pairs with C and with musical locks.
- Against: it replaces the segments colors, and the hue windows of
  K46 section 3.3 still apply.
- Param: an appended `colorScheme` option.

**C. The melody path: "the song is the map".** Assign pitches so that
walking the optimal route plays the melody in order. At each junction
on the route, the right arm carries the next note and the decoy arms
carry others.
- This is a pitch assignment, not a maze change: no daily or link moves.
- The optimal route is 18 runs, so it carries a phrase or two (Scarborough
  Fair has 38 events).
- Decoys can repeat the right note to force a two-note lookahead.
- For: a player who knows the tune can navigate by ear or by color, a
  wonderful moment.
- Against: it is a strong hint. With B on, it solves the maze for anyone
  who knows the song. Mitigations:
  - only the first phrase;
  - a song per day;
  - decoys using melody notes in the wrong order.
- Param: `pitchMap` (`pm`; length | melody; default length).

**D. Harmony as a compass.** The accompaniment's harmony relaxes toward
the tonic as your distance to the exit shrinks, and suspends when you
move away.
- For: a gentle warmer-colder hint; no single move is judged.
- Against: subtle, and hard to hear without music mode.

**E. Correct = melody, wrong = dissonance (Levi's literal idea).**
- On a `g` move (a shortest-route step), the next melody note plays.
- On `d` (a detour), a sour note (3.4): the right pitch on two strings
  detuned apart, so it beats, or a semitone clash with the melody note.
- On `b` (a backtrack), the melody steps back, played in reverse like
  Loom's reversed drafts.
- For: immediate, musical feedback.
- Against: it is an ORACLE. Try an arm, hear sour, back up. The backtrack
  meter prices it, but it trivializes finding the route.
- Opinion: an "assist" for free play only, never a daily.
- Param: `noteFeedback` (`nf`; off | compass (D) | oracle (E); default
  off).

**F. Beat-quantized moves (Rez; recommended first).** A tap any time
departs on the next beat subdivision, and the traversal pluck lands on
the grid.
- At 132 bpm an eighth note is 0.23 s, so the wait is at most that.
- Nothing can be off-beat, so nothing is punished.
- For: the whole maze turns into a groove instantly; works on any phone,
  since judgment needs no calibration.
- Against: adds up to one subdivision per move to the time stat. So it
  is a design param (as `moveSpeed` is fixed for dailies, K46).
- Params:
  - `beatMode` (`bm`; off | quantize | groove | locked; default off);
  - `beatGrid` (`bg`; quarter | eighth; default eighth).

**G. Groove (soft timing; recommended with F).** A tap within the window
of a beat counts as on-beat. The traversal pluck plays the melody's
current note, re-pitched to fit, as Levi described. Each on-beat move
adds a layer of accompaniment (bass, then harmony, then shimmer). An
off-beat tap plays the sour variant and drops one layer.
- Waiting is free. The beat goes on, and after two idle bars the layers
  thin slowly. Nothing else happens, so thinking is never punished.
- It is NecroDancer's multiplier without the damage, and Hi-Fi Rush's
  "rewarded, not required".
- Share: "🎵 87% on beat".
- Param: `beatWindow` (`bw`; ms; [60, 250]; default 140). The default is
  wider than osu!'s ±100 ms "good" on purpose, for phones.

**H. A beat-locked world (NecroDancer).** The minotaur moves on every
beat, whether you move or not.
- For: the most intense mode; it composes with the minotaur ("Minotaur
  Rush").
- Against: thinking costs turns; it needs calibration, and Bluetooth
  makes it unplayable without it.
- Opinion: an opt-in hard mode only. NecroDancer and Cadence both added
  ways to turn this off.

**I. Musical locks (Loom).** A gate opens when you pluck its 3-4 note
motif on the threads.
- The motif is heard when you near the lock, and shown as notes (as in
  Loom's Standard; hidden in Expert).
- Playing it backwards locks it again.
- Uses tap-plucks, which are free and do not move you.
- Section 4.1 has the generation side.

**J. Call and response.** At marked junctions the maze plays a short
phrase, and the next k moves must follow its notes. It is a local
melody path.

**K. Sympathetic resonance.** Plucking a thread makes runs of the same
pitch ring faintly, using the existing render-only pluck overlay.
- Uses: a sonar in fog (4.26), finding hidden runs (4.27), or hearing
  where a key's note is.

**L. Tempo as tension.** The beat quickens as the minotaur nears (like
Pac-Man's Cruise Elroy), and relaxes when it loses you.

### 3.4 Making "wrong" sound wrong, kindly

- **Sour, not harsh.** The harp already plays two slightly detuned
  strings per note (`shimmer`: ±1.2 cents by default, ±3 at most). A sour
  note is the same voice with the pair ±20-25 cents apart. At 220 Hz that
  beats about 6 times a second: plainly out of tune, yet gentler than
  true roughness, which Plomp and Levelt place near a quarter of a
  critical band apart (beating of dozens of hertz). For a harsher
  "wrong", widen toward a semitone.
- A "dull" variant: low sustain and brightness (a muted string, a short
  thunk).
- Keep wrong notes quieter and shorter than right ones, so the
  soundscape stays pleasant.
- Pair every sound judgment with a visual one (a grey flash on the run),
  per the accessibility rule above and McDermott's caveat.

### 3.5 Phones: latency, scheduling, calibration

- Schedule every sound ahead on the audio clock (3.2), and draw beat
  cues from `currentTime - outputLatency`, never from rAF time.
- Judge taps by their pointerdown timestamp (3.2).
- **Calibration** is a viewer preference, never in the link:
  - tap along with eight clicks; the median offset is stored;
  - `outputLatency` seeds it where the browser reports Bluetooth;
  - NecroDancer's adaptive calibration (nudging the offset toward a
    player's habitual lead or lag) is a later refinement.
- The quantize mode (F) needs no calibration at all, which is why it
  goes first.

### 3.6 Accessibility

- **A visual beat:** the head dot's ring pulses on quarter notes; the
  choice arms' pulse crests are phase-locked to arrive at the junction on
  the beat (a conveyor metronome).
  - Quarter notes only: 2.2 Hz at 132 bpm, under WCAG 2.3.1's three
    flashes a second.
  - Under reduced motion, a brightness change only.
- **Haptics:** an optional 10-15 ms vibration per beat on Android
  (`navigator.vibrate`; not available in Safari).
- **Sound off:** every mode stays playable from the visual beat and the
  notes colors. No mode may REQUIRE rhythm: rhythm is a layer that pays a
  bonus, as Hi-Fi Rush and Cadence of Hyrule concluded.

### 3.7 The recommended first experiment

Free play first, with:
- traversal plucks (A);
- beat-quantized departures on eighth notes at the song's tempo (F);
- the groove (G): accompaniment layers for on-beat taps, a sour pluck for
  off-beat ones, and no penalties;
- the visual beat on the head dot.

It needs the scheduled-pluck work (3.2), which music mode wants anyway.

Questions it answers:
- Do players move more fluidly? Compare median seconds per move with and
  without the beat, from K85's per-move timing.
- Does the groove feel good on Levi's Pixel 11 with and without
  Bluetooth?

Then the melody path (C) with notes colors (B), as a "Song maze" mode.

## 4. The long list

Each entry says:
- what it is and why it is fun;
- its fit to runs, junctions, threads, rendering and sound;
- generation and solvability;
- phone UX;
- daily and share;
- cost (S, M or L) and risk.

All params are appended with off defaults.

### 4.1 Locks and keys

- **What:** a lock is a clasp bead on a run in its key's color; a key
  is a bead on another run, taken by running it. Fun: a goal behind a
  detour, and route planning around it (Mark Brown's Boss Keys argues the
  interest is in the choice).
- **Fit:** the measurement decides the shape. A single locked run in a
  braided maze is bypassed by a loop. Fencing off the exit region needs
  5 locked runs at radius 2, 10 at 3 and 14 at 4 (median). So three
  forms:
  - **Exit lock:** the exit tail (a bridge) is the one lock. "The exit is
    locked", with 1-3 keys (Unexplored's ThreeLeverHub: "locks the goal
    behind three keys randomly placed in the level").
  - **Shortcut locks** (Boris the Brave's soft locks, where the key "just
    helps"): lock runs on the optimal route, so the key detour competes
    with the long way around.
  - **Colored gates:** a key dyes your thread (`pathColor`), and you
    pass gates of that color.
- **Generation:**
  - Keys go at the vertex that maximizes the start → key → gate detour
    inside a band. Measured: up to 11 runs of detour are available at a
    radius-4 gate.
  - Solvability and par: breadth-first over (vertex, keys held), 2^k ×
    V states.
  - Keys are never consumed (one key opens every lock of its color), so
    there is no soft lock.
- **Phone:** beads are K83-style glyphs with halos, and held keys show in
  the HUD. A locked run plays a dull thunk and stays dim.
- **Daily and share:** "🔑 3/3". Par counts the key tour.
- **Cost:** M. **Risk:** low with permanent keys. Unexplored's lesson is
  that cycles carry it: the "locked door pattern" puts the lock on one
  arc and the key on the other.
- **Params:** `keys` (`ky`; 0-3; 0), `lockMode` (`lkm`; exit | shortcut |
  colors; exit).

### 4.2 One-way runs

- **What:** runs you may only take in one direction, shown by chevrons
  flowing along the thread. Fun: a directed puzzle, like Abbott's traffic
  mazes; the maze you see is not the maze you can walk.
- **Fit:** the walk graph becomes partly directed. A backtrack across a
  one-way run is illegal; the tap is rejected with a thunk.
- **Generation:** **Robbins' theorem** (1939): a connected bridgeless
  graph has a one-way orientation in which everything reaches
  everything; a depth-first search finds one in linear time.
  - Our core is bridgeless (bridges are only tails and dead-end tips).
  - Orient any subset of core runs as one such orientation orients them:
    every junction can still reach the exit, by construction.
  - Pockets stay two-way.
  - Pick 20-40% of runs, weighted toward the optimal route, so they
    matter. Par = directed Dijkstra.
- **Phone:** constant crests in the run's direction, reusing the pulse
  machinery; 4-5 px threads need the motion, not just a glyph.
- **Daily and share:** no new stat.
- **Cost:** M. **Risk:** low.
- **Params:** `oneWay` (`ow`; fraction of runs [0, 0.6], 0.05; 0).

### 4.3 Collapsing runs

- **What:** runs break behind you. Fun: urgency and planning;
  irreversible choices. Lara Croft GO added "floors that crack with each
  successive turn to give a sense of time-based urgency".
- **Measured:** if every run breaks after ONE crossing, an exploring
  player is stranded on 20 of 30 dailies and 16 of 20 tree-like mazes.
  If runs crack on the first crossing and break on the second, none of
  50 stranded.
- **Fit:**
  - Render-only fraying (thinner, desaturated), then the snap: the
    ribbon fades, and a sharp, short pluck sounds, a snapped string.
  - The physics stays intact.
  - A strand detector (no unbroken route to the exit) makes the thread
    sing a falling glissando, and offers undo or restart.
- **Generation:** none for crack-then-break.
- **Phone:** fine.
- **Daily and share:** "snapped 3".
- **Cost:** S-M. **Risk:** frustration, mitigated by crack-then-break.
- **Params:** `fragile` (`fg`; off | crack | snap; off). Snap is one-shot
  breaking, for experts.

### 4.4 Required pickups

- **What:** N beads (fireflies, pearls) to collect before the exit tail
  opens. Fun: a route-planning puzzle, and a reason to enter loops and
  dead ends.
- **Fit:** pickups sit on runs and are taken by running them.
- **Generation:**
  - Spread them with farthest-point sampling on the walk graph, favoring
    dead ends and side loops.
  - Par is the shortest tour start → all pickups → exit. Held-Karp is
    instant for 8 or fewer.
  - Keep the tour within about 1.6 times the plain optimum.
- **Phone:** glowing beads, with the count in the HUD.
- **Daily and share:** "✨ 5/5". Efficiency = par tour / your route.
- **Cost:** M. **Risk:** tedium beyond about 6 pickups.
- **Params:** `pickups` (`pk2`; 0-9; 0), `pickupsRequired` (`pkr`; flag;
  true). (`pkr` is taken: K298's `pickChoiceRatio`. The K138 plan uses
  `pk2` for required pickups and `pkb` for bonus ones, and drops
  `pickupsRequired`.)

### 4.5 Bonus pickups and stars

- **What:** optional goals: a hidden bead, finishing under par, never
  being seen by the minotaur (Hitman GO's briefcase and no-kill stars).
  Fun: replay value without a harder maze.
- **Fit:** the same beads as 4.4, but nothing locks.
- **Generation:** as 4.4, plus par for the under-par star.
- **Phone:** as 4.4; earned stars show on the win banner.
- **Daily and share:** stars ⭐ in the title line. Keep them out of the
  time stat, or speed and completion fight.
- **Cost and risk:** S after 4.4; low.

### 4.6 Fleeing critters

- **What:** a moving pickup (a moth, a lamb) that runs from you. Fun: the
  roles reversed.
- **Research:** Brogue's flee map ("Multiply every value in the map by a
  negative number somewhere in the neighborhood of -1.2") makes a
  fleeing creature run for exits instead of corners, and circle loops
  ("pillar dance").
- **Fit:** a small dot riding the runs on the minotaur's machinery. You
  catch it by meeting it: the contact rule, reversed.
- **Generation, and the catch:** by the theory, and by our measurements
  in reverse, you can NEVER catch a perfect fleer at equal speed on a
  braided maze. So critters:
  - move every other turn;
  - flee only within 3 runs and nap otherwise;
  - or can be cornered in pockets, so dead ends become your hunting
    ground.
- **Phone:** a glowing dot, with the count in the HUD.
- **Daily and share:** "🦋 2/2".
- **Cost and risk:** M (shared machinery). Chases that never end if tuned
  wrong; simulate before shipping.
- **Params:** `critters` (`cr2`; 0-3; 0).

### 4.7 The sword

- **What:** Ariadne's gift. Pick it up and the chase turns around for N
  moves (Pac-Man's frightened mode). The minotaur flees (the -1.2 flee
  map) and turns pale. Touching it banishes it to its lair, or slays it
  for good with a one-use sword (Lara Croft GO's spear).
- **Fit:**
  - A sword glyph on a run.
  - When taken, the minotaur's glow turns pale blue and it reverses at
    once: Pac-Man's mode-change cue.
- **Generation:** a 4-8 run detour off the route, outside the minotaur's
  territory.
- **Phone:** a sword icon and a move counter in the HUD. The pale glow
  says the chase is yours.
- **Daily and share:** "⚔️ on move 31".
- **Cost and risk:** S after the minotaur; low.
- **Params:** `sword` (`sw`; off | timed | one-use; off), `swordMoves`
  (`swm`; [4, 20]; 8).

### 4.8 Patterned enemies (sentries)

- **What:** smaller enemies with fixed, learnable patterns:
  - pacers (out and back along a few runs);
  - circlers (a loop);
  - watchers (look down one arm of a junction; entering that run while
    watched is a catch; they turn each move).

  Fun: Levi's "watch, pay attention, and remember". Hitman GO and
  NecroDancer are built on it.
- **Fit:** the minotaur's machinery with a fixed route instead of a
  policy, and its telegraph.
- **Generation** (Levi's "particular care"):
  - Put them where they matter: on or beside the optimal route, at
    junction clusters.
  - Use periods whose least common multiple stays small (2, 3, 4, 6, so
    12 at most). The time-expanded state space (vertex × time mod 12)
    then stays tiny.
  - Prove solvability per maze with breadth-first search over that
    space.
  - Require a passing window of at least 2 moves per cycle at each
    sentry.
  - Either avoid placements that force a wait, or add the wait action.
- **Measured:**
  - A loop sentry through the exit made 7% of dailies unwinnable.
  - A pacer caught 17% of explorers with lapses.
  - Placement must be validated; it cannot be random.
- **Phone:** each sentry's route as a faint dotted loop, plus its next
  step. With fog the patterns must be remembered: the hard version.
- **Daily and share:** "🛡️ 0 spotted".
- **Cost and risk:** M-L; clutter on phones, and waiting tedium.
- **Params:** `sentries` (`sn`; 0-4; 0).

### 4.9 Sleepers

- **What:** creatures asleep at junctions that wake on noise, then hunt.
  Fun: stealth, choosing quiet routes.
- **Fit:** noise is plucks, which ties the threat to the instrument.
  - The tension: waking on ordinary tap-plucks would punish playing the
    instrument, a core joy.
  - So they wake only on a lure pluck (4.10), or when you move along a
    run that touches their junction.
- **Generation:** a junction 1-3 runs off the optimal route. A woken
  sleeper is a hunter, so the minotaur's guarantees apply.
- **Phone:** a dim glyph with a slow breathing glow.
- **Daily and share:** "😴 2 woken".
- **Cost and risk:** S on top of the minotaur; the tension above.

### 4.10 Lure plucks

- **What:** pluck a run far away to draw the minotaur there. Hitman GO's
  throwables "disrupt and change enemy behaviour patterns", and Brogue's
  sounds say "Investigate them, or avoid them". Fun: agency, and the
  instrument becomes a tool.
- **Fit:** a plucked run within hearing range becomes the roaming
  minotaur's next destination.
- **Generation:** none.
- **Phone:** a lure button in the HUD arms the next tap-pluck, so
  ordinary taps stay free. A lure costs a move, or comes from a stock of
  three.
- **Daily and share:** "🎵 2 lures".
- **Cost and risk:** S; low.
- **Params:** `lures` (`lu`; 0-5; 0).

### 4.11 Switches (multi-state mazes)

- **What:** a lever junction toggles a set of gates open or closed.
  Abbott's multi-state mazes: "the rules for navigation change depending
  on how the maze has been navigated". Fun: puzzle depth.
- **Fit:** a lever glyph at the junction, and gates as clasps on runs, as
  in 4.1.
- **Generation:** breadth-first over (vertex, switch states) for
  solvability and par, with at most 2 switches (4 states).
- **Phone:** the gates of one lever share a color.
- **Daily and share:** no new stat.
- **Cost and risk:** M; readability on phones.

### 4.12 Turnstile junctions

- **What:** a junction where only two of its arms connect at a time, and
  the open pair rotates each move. Fun: timing.
- **Fit:** the junction web shows the connected pair bright and the
  third arm dim.
- **Generation:** a time-expanded search (vertex × rotation phase).
- **Phone:** the dim arm must read at fit scale.
- **Daily and share:** no new stat.
- **Cost and risk:** M; readability.

### 4.13 Tunnels (portals that keep the medium)

- **What:** a pair of junctions linked as one move. Hitman GO's trapdoors
  "let the player travel between them in one turn". Fun: a shortcut to
  discover.
- **Fit:** draw it as a thread that sinks into the backdrop and
  re-emerges, the weave's own logic, not a teleport. The walk graph gains
  a run.
- **Generation:** link two junctions far apart in moves, and recompute
  par with the tunnel.
- **Phone:** a matching glyph pair at the two mouths.
- **Daily and share:** no new stat.
- **Cost and risk:** S-M; low.

### 4.14 Par (golf)

- **What:** finish within P moves (the fewest-runs route plus slack), or
  score strokes over par. Fun: a tight plan on a visible maze.
- **Fit:** a counter in the HUD.
- **Generation:** the fewest-runs route, by breadth-first search.
- **Phone:** the counter.
- **Daily and share:** natural, since everyone has the same par: "⛳ +2".
- **Cost and risk:** S; low.
- **Params:** `par` (`pr`; off | strict | strokes; off).

### 4.15 Ariadne's spool

- **What:** the yarn (`pathViz` string) has a fixed length: the optimal
  route times 1.2-1.5. Backtracking reels it in, and you cannot go beyond
  the spool. Fun: the thread itself is the budget, in our most thematic
  form.
- **Fit:** the string mode never picks up its yarn today; this mode
  rewinds it.
- **Generation:** none (the slack times the optimal length).
- **Phone:** a spool gauge in the HUD.
- **Daily and share:** "🧶 82% of the spool".
- **Cost and risk:** S-M; low.
- **Params:** `spool` (`sp2`; slack [0.1, 1]; off).

### 4.16 Chalk marks

- **What:** chalk a junction to remember it, the way Trémaux's algorithm
  marks passages. Fun: a memory aid, decisive in fog.
- **Fit:** a tick glyph on the junction web.
- **Generation:** none.
- **Phone:** a long press already means a tug on a thread. Use a long
  press on the junction core, or a chalk button.
- **Daily and share:** a viewer convenience, not a param.
- **Cost and risk:** S; gesture conflicts.

### 4.17 Darkness and a lantern

- **What:** fog of war that closes again: explored areas fade back to
  dark after N moves. Lantern oil is a resource. Fun: memory under
  pressure.
- **Fit:** the fog canvas refills its older holes.
- **Generation:** none.
- **Phone:** as fog.
- **Daily and share:** as fog.
- **Cost and risk:** S-M on the fog machinery; frustration.

### 4.18 Color-rule mazes (Abbott)

- **What:** only runs in a color sequence (red → green → blue), or never
  the same color twice in a row. Fun: a logic layer on any maze.
- **Fit:** the segments scheme's swatches, or notes (3.3 B): "alternate
  high and low".
- **Generation:** breadth-first over (vertex, rule state) for
  solvability and par.
- **Phone:** colorblindness. Pair each color with a pattern or a note.
- **Daily and share:** fine; the rule is visible.
- **Cost and risk:** M; accessibility.

### 4.19 Ice runs

- **What:** an icy run carries you straight through the next junction
  along the SAME strand, until a non-icy run. The walk graph knows each
  run's chain, so "straight" is natural on a knot. Fun: slide puzzles.
- **Fit:** one tap, several runs of travel.
- **Generation:** a breadth-first search with slide moves for par.
  Forbid slides that loop forever.
- **Phone:** a frosted thread (pale and glittering).
- **Daily and share:** no new stat.
- **Cost and risk:** M; readability.

### 4.20 Rescue (escort)

- **What:** a lost lamb at a dead end follows you out, one run behind,
  and the minotaur hunts it too. Fun: protectiveness.
- **Fit:** a second dot following your path, like the yarn.
- **Generation:** the lamb at a dead-end tip off the route.
- **Phone:** fine.
- **Daily and share:** "🐑 saved".
- **Cost and risk:** M; escort missions' reputation.

### 4.21 Ghost race

- **What:** race a replay of your best, or a friend's, attempt; a K85
  replay link carries it. Fun: asynchronous competition.
- **Fit:** a translucent second head dot replaying taps with their
  timing. It never touches you.
- **Generation:** none.
- **Phone:** fine.
- **Daily and share:** "beat yesterday's best".
- **Cost and risk:** S-M after K85; low.

### 4.22 Two-player minotaur

- **What:** one plays Theseus, one the minotaur. Fun: social.
- **Fit:** the minotaur's moves cannot be pre-recorded, since they depend
  on the runner's. So it is hot-seat (alternating taps) or networked
  play.
- **Generation:** none.
- **Phone:** hot-seat works on one phone; the minotaur's choices show at
  its junction.
- **Daily and share:** not a daily.
- **Cost and risk:** M hot-seat, L networked.

### 4.23 The myth (in and out)

- **What:** reach the lair at the center, take the sword or slay the
  minotaur, then find the way out. Ariadne's thread is literally the way
  back. Fun: a whole story in one maze.
- **Fit:** the yarn mode is the return guide. The minotaur cutting the
  thread is the twist, without which the return is trivial.
- **Generation:** the lair is the vertex farthest from the entrance, and
  the exit is the entrance.
- **Phone:** fine.
- **Daily and share:** a special day: "🗡️ in 24, out 19".
- **Cost and risk:** M.

### 4.24 Tides (scheduled gates)

- **What:** some runs breathe open and shut on a fixed rhythm, every 3
  moves, or on the beat with 3.3 F. Fun: timing.
- **Fit:** the thread's opacity breathes with its schedule.
- **Generation:** a time-expanded search, as for sentries.
- **Phone:** the breathing must read at fit scale.
- **Daily and share:** no new stat.
- **Cost and risk:** M; waiting tedium without a wait action.

### 4.25 Over-under swap (only a woven maze can do this)

- **What:** a needle item lets you change threads at ONE crossing: you
  dive under and come up on the other thread. Crossings are never
  decision points by design. The needle breaks that rule once, on
  purpose.
- **Fit:**
  - The crossing becomes a temporary junction: split both runs at the
    crossing's ctrl.
  - The dot dips with the weave's depth.
- **Generation:** the needle's best use defines par.
- **Phone:** with the needle held, usable crossings glow.
- **Daily and share:** "🪡 used on move 12".
- **Cost and risk:** M-L (runtime walk-graph surgery; crossing positions
  come from the physics bindings). It bends the core rule, which is the
  novelty.

### 4.26 Sonar pluck

- **What:** in fog, a pluck makes nearby runs of the same pitch ring and
  show briefly through the fog (3.3 K). Fun: exploring by ear.
- **Fit:** the render-only pluck overlay, plus a brief hole in the fog.
- **Generation:** none.
- **Phone:** a tap-pluck, as today.
- **Daily and share:** "📡 4 pings", if pings are limited.
- **Cost and risk:** S; low.

### 4.27 Hidden runs

- **What:** some runs stay invisible until you pluck a thread of their
  note nearby. Fun: secrets.
- **Fit:** K76's per-pixel reveal layer. Hidden runs must not be
  tappable.
- **Generation:** hide runs that are shortcuts, so finding them pays;
  par with and without them.
- **Phone:** a found run shimmers once.
- **Daily and share:** "👁️ 2 found".
- **Cost and risk:** M; hit-testing.

### 4.28 Hints and a compass

- **What:** a few hints (light the next good arm), or a compass that
  points along the walk graph rather than in a straight line. Fun: less
  frustration; an accessibility win.
- **Fit:** the walk graph's `distToExit`.
- **Generation:** none.
- **Phone:** a hint button.
- **Daily and share:** "💡1".
- **Cost and risk:** S; none.

### 4.29 Sprint

- **What:** once per maze, two runs in one turn: a panic button against
  the minotaur.
- **Fit:** after a sprint is armed, your next two taps count as one
  turn.
- **Generation:** none.
- **Phone:** a sprint button.
- **Daily and share:** "⚡ used".
- **Cost and risk:** S; low.

### 4.30 Snares

- **What:** drop a tangle on the run behind you; the minotaur is held 3
  moves if it walks in. A knot on a knot.
- **Fit:** a knot glyph on the run.
- **Generation:** none.
- **Phone:** a snare button, then the run.
- **Daily and share:** "🪢 1".
- **Cost and risk:** S; low.

### 4.31 More exits

- **What:** two exits, a near one and a far one with a bonus, and the
  minotaur guards one. Fun: a choice of risk.
- **Fit:** more cut tails.
- **Generation:** a generation change, behind a new param that defaults
  off, so links and dailies keep their mazes (`generation.md`).
- **Phone:** two exit markers; the off-screen indicator shows both.
- **Daily and share:** which exit you took.
- **Cost and risk:** M; generation risk.

### 4.32 Lives

- **What:** three hearts; a catch costs one and returns you to your last
  pickup.
- **Fit:** hearts in the HUD.
- **Generation:** none.
- **Phone:** fine.
- **Daily and share:** "❤️ 2 left".
- **Cost and risk:** S. An alternative to 2.8's restarts.

### 4.33 Muddy runs

- **What:** thick, fuzzy runs that take two moves to cross, for you and
  the minotaur alike. Fun: a slower but safer route, or the reverse.
- **Fit:** changes the fewest-moves metric, not the lattice one.
- **Generation:** pick runs on the optimal route, so the fewest-moves
  route and the shortest route differ.
- **Phone:** a fuzzy, wider thread.
- **Daily and share:** no new stat.
- **Cost and risk:** S; low.

### 4.34 The minotaur's scent

- **What:** it leaves a fading red trail (Brogue's scent map, inverted):
  you can read where it has been. Under fog, you can track it.
- **Fit:** a fading red tint on the runs it walked, in the gameplay
  paint.
- **Generation:** none.
- **Phone:** fine.
- **Daily and share:** none.
- **Cost and risk:** S; low.

### 4.35 Not a fit

- **Abbott's number mazes** ("travel the number shown on the current
  square") need straight-line moves of a given length. Runs vary too
  much for numbers to read.
- **Real-time chases** (an animated monster on a clock, outside turns)
  would lose the board-game clarity that makes the telegraph work. The
  beat-locked mode (3.3 H) is the only real-time form worth trying.
  (Round 2 narrows this: it holds for smart chasers, not for fronts and
  stimulus-driven enemies. See R.4.2.)

## R. Round 2 (K114, 2026-10-13): cutting, real time, fire and auto-solvers

Levi's second batch of gameplay notes (R.1, verbatim), explored the way
sections 2-4 explore round 1. No code changes. Where round 1 already
covers a piece, an entry points to it instead of repeating it. Labels as
in the rest of this doc: **Measured** (reused from sections 1-4 unless it
says otherwise), **Research** (a source; round 2's are leads from memory,
listed in R.7 and not re-checked in this session), **Opinion** (my design
judgment). Sizes: S is a day or less, M a few days, L one to two weeks,
XL more.

### R.0 Summary, shortlist and your decisions

**In one paragraph (opinion).** Round 2's notes share three ideas: a new
verb (cutting), a new clock (real time) and a new role (you act on the
maze while something else walks it). They fit the medium best when the
threat is a FRONT or a STIMULUS rather than a mind: fire that spreads
along the threads, a spider that feels your moves through them, a walker
that follows its strand. Each of those reads at a glance, and two of them
keep thinking free. A smart real-time chaser is the one form that still
fights the medium (R.4.2). Start with the burn race: it is provably
fair, needs no AI and no new gesture, and builds the blocked-run
machinery that every cutting mode reuses.

**The ideas** (R.3 has Levi's, R.5 mine):

| Entry | Idea | Verdict (opinion) |
|---|---|---|
| R.3.1 | Real time as a mode parameter (`clock`) | Yes, for fronts and stimulus enemies; always with a turn fallback |
| R.3.2 | The spider | Yes, after the minotaur: stillness is safe |
| R.3.3 | Burn race | **Shortlist 1** |
| R.3.4 | One thread (unbraid) | As a win finale; as a puzzle only on small mazes |
| R.3.5 | Cutting threads to avoid monsters | Yes, with healing cuts and the Trapdoor |
| R.3.6 | Points for long runs (flow) | A separate stat first; the cut economy later |
| R.3.7 | Pluck-to-cut melody | As Pluck Hero's turn-based form |
| R.3.8 | Pluck Hero | **Shortlist 5**, as an MVP on the standard maze |
| R.3.9 | The auto-solver inversion (stop, slow, guide, show) | **Shortlist 2**, guide first |
| R.5.1 | Beat rider | **Shortlist 3** |
| R.5.2 | Firebreak | After the burn race |
| R.5.3 | Strand wave | After the minotaur |
| R.5.4 | Resonance shatter | Maybe |
| R.5.5 | Your echo | After the minotaur; also a musical canon |
| R.5.6 | Short versus Cut (two players) | Cheap once cutting exists |
| R.5.7 | Race the solver | Cheap once the walker exists |

**Ranked shortlist** (opinion; R.6 says what each prototype must answer):
1. **Burn race, turn-based** (R.3.3), S-M. Fair by construction, with
   no AI and no new gesture. It reuses the trace reveal's flood and the
   burn FX, and builds the blocked-run set.
2. **The cut verb and the auto-walker** (R.4.1, R.4.3), M, tried first
   as **Lead the walker** (a deterministic daily puzzle with a computable
   par), then **Delay it** (always finite), then **Keep it in** after a
   balance probe. One investment serves R.3.4 to R.3.9.
3. **Beat rider** (R.5.1), M: the first `clock` beyond turns. Rhythm with
   no timing judgment, so Bluetooth cannot break it. It builds the game
   clock that real time needs.
4. **The spider** (R.3.2), S-M after the minotaur ships: the real-time
   enemy that keeps thinking free.
5. **Pluck Hero MVP** (R.3.8), M on top of item 2: the standard maze, no
   scroller. The scroller and its strip generator only if the MVP is fun.

Then: healing cuts against the minotaur (R.3.5), the one-thread win
finale (R.3.4, nearly free after item 2) and the flow stat (R.3.6).

**Decisions for you (round 2).**
1. **The first round-2 prototype.** Recommended: the burn race,
   turn-based.
2. **A `clock` param** (turn | beat | realtime) that every enemy and
   front reads; it narrows 4.35. It brings timed taps into attempts (a
   store version bump) and a pause that hides the board. Recommended:
   yes, built with the beat rider.
3. **What a cut does.** Recommended: delete the whole run, and let a
   junction left with two runs stop being a decision (R.4.1). The
   alternative snips the run into two dead-end stubs.
4. **Render-only cuts plus walk-graph cuts** (recommended), or a physical
   split of the thread (L: `ParticleSystem.openChain` refuses after
   junction fusion).
5. **The cut gesture.** Recommended: a scissors button that arms the next
   tap, as 4.10's lure button arms a pluck. Alternatives: a swipe across
   a thread, a long press.
6. **Cuts against monsters: healing or permanent?** Recommended: healing
   (a cut closes again after a few moves). Permanent cuts need 4.3's
   strand detector to refuse cuts that strand you.
7. **The spider:** a `minotaur` option or an enemy of its own; its
   glyph, and an arachnophobia alternative.
8. **Pluck Hero:** an MVP on the standard maze before any strip
   generator. Recommended: yes.
9. **Dailies:** all of round 2 in free play first. Recommended first K46
   modifier from it: the burn race.
10. **The flow score** stays a separate stat, never part of efficiency.
    Recommended: yes.

### R.1 Levi's notes (verbatim, 2026-10-13)

> Other game mode ideas:
> - Real-time enemy movement would also be a great mode and/or a parameter for modes.
> - A spider enemy might be good, since it conceptually fits with the webs of threads.
> - A mode where threads burn away steadily and you have to race to the end ahead of them.
> - You can delete segments somehow. Then you want to end up with a single unbranched thread from start to end.
> - Or you can cut threads to avoid monsters.
> - Or you somehow get more points for choosing longer segments, which can feel satisfying to slide through. Cutting threads could contribute to getting to a long segment. Or not.
> - Maybe plucking could cut threads, and you have a goal to pluck a particular melody, and segments are color-coded to music notes, but then you still want to leave a path through the maze. Ooooh, this could potentially be extended to something a bit more involved, like a Guitar Hero UI (or just a side-scrolling custom lined music staff) with pluck note colors corresponding to segments, and then we also have a procedurally generated sidescrolling chunk of maze threads that is built to correspond to the music notes; then, their is an AI auto-progressing the maze navigation, but the player gets to pluck segments in time with the music, but needs to carefully and quickly choose which segments are safe to pluck while still letting the AI player proceed through the maze.
> - The maze is being auto solved, and you are trying to stop it or show it or guide it indirectly in a particular way by adding obstacles or cutting segments.
> - Again, include these with the other gameplay exploration notes, and please explore some possible gameplay modes/mechanics/concepts and pros/cons, and give me a list of ideas and descriptions.

### R.2 What round 2 changes in our medium (facts)

From the code on 2026-10-13, beyond section 1:

- **A move has no middle.** `FabricMazeController.tapEdge` moves the
  head at once; the dot's travel is render-only (`fabric_maze_renderer.ts`
  `beginMove`). A tap mid-flight snaps the previous move ("its dot lands
  at once"). In real time that is a speed exploit, so a realtime clock
  must queue the next tap until the dot arrives.
- **Travel time grows with length.** The dot moves at `MOVE_CTRL_PER_S`
  (34 ctrl/s) × `moveSpeed`, slowed in bends (`MOVE_CURVE_SLOWDOWN` 2.2),
  "deliberately independent of the run's length", so a long run takes
  proportionally longer. Real time needs a game clock that this animation
  FOLLOWS, never one it defines: K103 already records that the move
  animation slows below 10 fps.
- **An attempt is a pure tap list** (`daily_attempt.ts`: `taps: number[]`
  plus `elapsedMs`), stored in `knotmaze.daily` as `{v: 2, days, prefs}`.
  A cut is a new kind of action and a timed tap a new field. Either is a
  shape change, so the store's `v` goes to 3 (gameplay.md, daily rule 5).
- **Every tap already means something.** A tap on a choice arm moves. A
  tap on any other thread is a free, render-only tap-pluck (zero
  physics). A press waits for a slop (mouse 4, pen 6, touch 10 CSS px),
  then tugs. An empty-space drag pans, and touch resolves on release. A
  new verb on a tap must be ARMED (4.10's pattern) or it takes the free
  instrument away.
- **Threads cannot be split at runtime.** `ParticleSystem.openChain`
  throws after junction fusion, and fabric tails are carved at graph
  level (`applyMazeCuts`) before physics exists. Round 2's cuts are
  therefore render-only plus walk-graph changes, as 4.3's collapsing runs
  are.
- **Distances are a closure.** `buildWalkGraph` runs its Dijkstra (O(V²),
  about 40,000 steps at 199 vertices) inside itself. Every idea here that
  removes runs at runtime needs it exported with a removed-run set, and
  `distToExit` recomputed per cut.
- **The fire front already exists.** `reveal_plan.ts`'s trace sequence
  floods from the walk start over the walk graph by lattice length, as
  per-chain directional fronts (`intervalsAt`, `tipsAt`). The G2 shaders
  compute every pixel's ignition from KREVEAL, and `appear_fx.ts` has a
  `burn` frontier style (smoke). A burn-away is that front with the mask
  inverted.
- **Strands and notes are indexed.** Every run lives on one chain
  (`WalkEdge.chain`), main.ts's `audioRuns` maps a chain to its runs, and
  every run owns one pitch (`audioAssign.segFreq`).
- **The beat clock exists (K101, e9e01ae).** Music mode schedules its
  notes 0.3 s ahead on the AudioContext clock (`song_scheduler.ts`,
  `MUSIC_LOOKAHEAD` in main.ts), and the worklet starts each one
  sample-accurately (`startFrame`). `autoAudioTick` still polls in the
  render tick; the lookahead absorbs the frame jitter. This supersedes
  section 1's "`synth.pluck` sounds NOW" and "Music mode times its notes
  with `performance.now()`", and 3.2's missing piece 1 (built in this
  different shape). Those passages are left as written.
- **Measured** (section 1, 4.1): a median gs-18 daily has 199 vertices,
  302 runs, cycle rank 103 and 3 bridges (both tails plus one). The
  optimal route is 18 runs and 80 lattice units; the fewest-runs route
  is 15. Fencing off the exit takes 5, 10 and 14 runs at radius 2, 3 and
  4. A median run is about 3.7 lattice units, p90 11-15 (render.md,
  junction blend distance).

### R.3 Levi's ideas

Each entry: how it plays, how it fits the medium, for and against, cost,
and what it shares with round 1.

#### R.3.1 Real-time enemies, and real time as a parameter

- **Plays:** enemies and fronts move on a continuous clock while you
  think. You still move junction to junction; the clock decides what
  happens meanwhile.
- **Fit:** 2.2's contact rule is already continuous along runs (you and
  the minotaur animate over the same duration), so contact needs no new
  model. What changes is thinking time: free in turns, the danger in real
  time. R.4.2 makes it a `clock` param for every mode.
- **For:** tension and Pac-Man energy; fire and spiders feel alive; a
  difficulty lever that needs no new content.
- **Against:** a smart chaser at your speed punishes reading the maze,
  which is the game. Phones mis-tap thin threads under pressure, and a
  mis-tap is a catch. An attempt stops being a pure tap list.
- **Opinion:** real time suits threats you read at a glance (a front,
  the beat, a walker, a spider that only feels motion). A realtime
  minotaur should be slower than you, as Pac-Man's ghosts are, and
  always telegraphed. (Research, from memory and not among section 8's
  quotes: the Pac-Man Dossier gives level 1 Pac-Man 80% of top speed and
  the ghosts 75%.)
- **Cost:** M once (R.4.2), then S per enemy policy.
- **Overlaps:** 2.2 (contact), 2.7 (telegraph), 3.3 H (the beat-locked
  world is `clock=beat`), 4.35 (narrowed here).

#### R.3.2 The spider

- **Plays:** a spider waits at the hub of its web, a junction near the
  exit. It cannot see; it FEELS. Each move rings the runs you walk, each
  pluck rings its run, and the vibration travels along the threads,
  fading with thread distance. When it feels something in range it darts
  there, fast, then waits again. Standing still is silent.
- **Fit:**
  - It is the hunter (2.3d) with sight replaced by feeling along the walk
    graph: the walk distance to each vibration, the strongest in range
    wins (Brogue's sounds, 4.10).
  - Lures are native: a tap-pluck on a far thread draws it (4.10). With
    the spider on, every pluck is felt; that is the mode.
  - Silk: the spider mends cut runs (healing cuts, R.3.5, with a reason)
    and lays sticky runs that take two moves to cross (4.33's muddy
    runs). Spinning NEW runs costs more. Between two existing junctions a
    short distance apart it is a render-only strand plus a walk run (M).
    Mid-run, at maze_plan's unused splice candidates
    (`findSpliceCandidates`), it splits runs at runtime like 4.25 (M-L).
  - Its glyph is a K83 marker; an arachnophobia setting swaps it
    (Research: Grounded and Satisfactory ship such settings).
- **For:** the most on-theme enemy (a web of threads). Vibration makes
  the instrument tactical. In real time stillness is safe, so thinking
  stays free (opinion: the best answer to real time on phones).
- **Against:** arachnophobia. Accidental tap-plucks on phones become
  summons (bigger choice hit targets help). It overlaps the minotaur
  heavily, so only one should ship first.
- **Research leads:** orb-weaving spiders locate prey through web
  vibrations (Mortimer et al. 2016); Spider: The Secret of Bryce Manor
  (2009) is a phone game about a spider on its webs.
- **Cost:** S as a minotaur policy (`minotaur=spider`); M with spinning;
  realtime darting needs R.4.2.
- **Overlaps:** 2.3 (models), 2.10 (footsteps: here you make the
  noise), 3.3 K (sympathetic resonance is the vibration made audible), 4.9
  (sleepers), 4.10 (lures), 4.33 (muddy runs).

#### R.3.3 Burn race

- **Plays:** a fuse is lit at the entrance. Fire runs along every thread
  from there, slower than you, and burnt runs are gone. Reach the exit
  ahead of it. Backtracking feeds the fire.
- **Fairness (exact, from the definition):** let d(v) be a junction's
  walk distance from the entrance, r < 1 the fire's speed as a share of
  yours, and h its head start. Fire reaches v at h + d(v)/r; you reach v
  after walking L(v). Fire behind you can never catch you on a run (it
  is slower), so you are safe exactly while L(v) < h + d(v)/r at each
  junction you reach.
  - On the shortest route L(v) = d(v), always less: **the optimal route
    always escapes.** Every burn race is winnable without a solver
    (compare 4.8's 7% unwinnable sentries).
  - The detour you can afford by v is h + d(v)(1/r − 1). It grows with
    distance: early wandering is deadly, late wandering cheap. At the
    exit of a median daily (d = 80) it is h + 27 lattice units at
    r = 0.75 (about seven median runs) and h + 9 at r = 0.9.
  - Opinion: on an open board a careful player rarely feels it; with fog
    of war (2.10) or r near 0.9 it bites. Measure before tuning (R.6).
  - Fire follows the walk graph and never jumps a crossing: there the
    threads pass over and under, they do not touch.
- **Turn-based first:** the fire's clock is the length you have walked,
  so each move advances it by the run's length. That keeps the attempt a
  pure function of its taps (saved attempts and replays stay exact), and
  thinking is free. `clock=realtime` burns "steadily", as the note says.
- **Readable:** an arm whose far end the fire reaches before you would is
  drawn smoldering and refuses the tap, so you never walk into fire
  unknowingly. You lose only when no safe arm is left, and a loss always
  traces back to your own detours.
- **Fit:** the walk start is the trace flood's origin, so the fire front
  IS `reveal_plan`'s trace sequence, and the `burn` frontier FX rides its
  tips. Burnt runs leave `choices()` (R.4.1's blocked-run set). Fire is
  light: under fog, burning threads show branches the fire has reached
  and you have not.
- **For:** fair by construction; no AI, no new gesture; reuses the reveal
  machinery; a strong look (the burn intro played backwards). One param
  makes it a daily modifier.
- **Against:** the inverted mask is new G2 shader work, with its
  `paint_math` mirror and a census. Without fog it may be tension-free
  (the measurement question).
- **Variants:** sparks (fires lit at telegraphed junctions and times;
  Firebreak, R.5.2); a wick (the fire follows only YOUR path: R.5.5's
  echo, burning); collapse behind you (4.3, as fire).
- **Daily and share:** "🔥 escaped by 9.2" (the closest call: the least
  fire-minus-you margin along your route, in lattice units).
- **Params:** `fire` (off | fuse | sparks; off), `fireSpeed` (r,
  [0.3, 0.95]; 0.75), `fireDelay` (h, lattice units; 0).
- **Cost:** S-M: the logic S, the look M (inverted mask, a char band at
  the front, embers).
- **Precedent:** Pipe Dream (1989): stay ahead of a front.
- **Overlaps:** 2.10 (fog), 4.3 (collapsing runs, the strand detector),
  4.24 (tides), 4.29 (sprint), K76 (thread reveal: the same per-run
  visibility, reversed).

#### R.3.4 One thread (unbraid)

- **Plays:** cut runs until the entrance and the exit are joined by ONE
  unbranched thread. Everything you cut loose falls away. What is left is
  a single run, and the dot slides it end to end in one long move,
  playing its notes in order: the maze's song.
- **Fit:** the cut verb with contraction (R.4.1). Debris is every run no
  longer connected to the entrance-exit thread.
- **Against (inferred):** once you choose the route, the cuts are forced.
  Every other run touching a junction on it must go: k − 2 cuts for a
  junction of k runs. "Fewest cuts" therefore means "the route through
  the fewest, smallest junctions", and the cutting is busywork after
  that. Par is a shortest path weighted (k − 2) per junction, exact
  unless a run joins two junctions of the same route (one cut then
  counts for both).
- **Better forms (opinion):**
  - **The finale:** after any solve, everything off your route falls
    away and your route plays as one thread. S after R.4.1's render
    work, with no puzzle needed.
  - **The longest thread:** score the final thread's length, so the
    puzzle is choosing the longest route that never revisits a junction.
    Longest simple path is NP-hard in general (Garey and Johnson), so par
    is exact only on small mazes (a depth-first search copes with a few
    dozen junctions).
- **For:** an ending only a thread maze has: the song of your route.
- **Against:** weak as a standalone puzzle at gs 18.
- **Cost:** S after R.4.1 (the finale); S for a small-maze par.
- **Name:** "One thread" or "Unbraid" (Untangle is the planarity
  puzzle's name).
- **Overlaps:** 3.3 C (the melody path: the finale plays it), 4.14
  (par), 4.15 (Ariadne's spool).

#### R.3.5 Cutting threads to avoid monsters

- **Plays:** you carry scissors with a few charges. A cut run is closed
  to the minotaur too, so it must route around. **Trapdoor:** with the
  telegraph on (2.7), cut the run it has committed to while it is on it,
  and it falls (stunned, or back to its lair).
- **Fit (measured, section 0):** a careful player who can see the
  minotaur is almost never caught on the braided core (2 catches in 9,000
  telegraphed games). Cuts matter where the danger is: under fog (11% of
  the lapsing explorer's daily games end in a catch), against a two-run
  charge, at a pocket's mouth.
- **Healing or permanent (decision 6):** a healing cut closes again
  after a few moves (or the spider mends it), so you cannot strand
  yourself and the maze never degrades into a tree. Permanent cuts need
  4.3's strand detector to refuse a cut that leaves you no route.
- **For:** agency against the chase; the Trapdoor turns the telegraph
  into a weapon.
- **Against:** snares (4.30) are nearly the same verb (pick one); with
  charges, players hoard them.
- **Daily and share:** "✂️ 2 🕳️ 1".
- **Cost:** S after the minotaur and R.4.1.
- **Overlaps:** 4.7 (the sword), 4.11 (switches), 4.23 (the myth: the
  minotaur cutting YOUR thread is the mirror image), 4.30 (snares).

#### R.3.6 Points for long runs (flow)

- **Plays:** each run scores the first time you cross it, more than in
  proportion to its length (say length^1.5): long runs are prizes. The
  flow score sits beside efficiency, not inside it. A flow mode gives a
  move budget (par plus half) and asks for the best score at the exit.
- **The slide:** today a long run just takes longer (R.2). To feel like a
  slide: ease in, cruise faster on long runs, ease out; let the run's
  note swell (re-pluck it as a tremolo); lead the camera. All
  render-only, S.
- **Cutting makes long runs:** cutting a branch at a three-run junction
  fuses its other two runs into one (contraction). With a superlinear
  score, runs a and b score more fused than apart, so a cut budget
  becomes an economy: cut to fuse, then slide. That is the link the note
  suspects. Opinion: elegant on paper, at risk of feeling like a
  spreadsheet; ship the stat first.
- **Fit:** efficiency (optimal / your route) punishes detours and flow
  rewards them, so keep them apart (decision 10). A budgeted flow mode is
  orienteering (NP-hard in general): par is a heuristic except on small
  mazes.
- **For:** rewards the most satisfying motion in the game; cheap.
- **Against:** two scores compete for attention, and flow contradicts
  "solve efficiently" on dailies.
- **Daily and share:** "🌊 412".
- **Cost:** S (the stat and the slide); M with the cut economy.
- **Overlaps:** 4.4 (required pickups), 4.5 (bonus stars), 4.14 (par),
  4.19 (ice runs, the other slide).

#### R.3.7 Pluck-to-cut melody

- **Plays:** a short melody shows as colored notes. Pluck a run of the
  next note's color: it sounds, and it is cut. Finish the melody with the
  entrance still joined to the exit, then walk out.
- **Fit:** every run owns one pitch, and music mode buckets runs onto
  the song's pitches, so every note has runs to choose from; 3.3 B's
  notes scheme colors them. Plucks are the free instrument today, so this
  needs an armed mode (R.2).
- **The difficulty problem (inferred from measured counts):** a gs-18
  daily can lose up to 103 runs (its cycle rank) without disconnecting
  anything, and at about seven pitches each note has some 40 runs. Almost
  any choice is safe. To make it a puzzle: the run must be near your head
  (within 2-3 runs, and you walk between notes); a small maze; a route
  within par plus x must survive, not just any route; or the clock (that
  is Pluck Hero).
- **For:** music and maze become one puzzle; the song survives in the
  maze you leave behind.
- **Against:** too easy without one of those constraints; pitch colors
  at phone thread widths (6.2).
- **Cost:** S-M after R.4.1 and the notes scheme.
- **Opinion:** best as Pluck Hero's turn-based form, which is also its
  accessibility fallback (3.6).
- **Overlaps:** 3.3 B (notes colors), C (the melody path: walk the song;
  here you cut it), I (musical locks), K (resonance: hear where a note
  is), 4.27 (hidden runs).

#### R.3.8 Pluck Hero

- **Plays (the note's full version):** a note highway, or a scrolling
  staff, shows the song's coming notes in pitch colors. Beside it a long
  strip of maze scrolls, and an AI walker makes its way through. On each
  note you pluck a run of that note's color: you play the melody, and
  the pluck cuts the run. Cut one the walker needs and it reroutes; leave
  it no route and it sticks. Every note is a fast choice: which red run
  is safe?
- **Fit:**
  - Already there: per-run pitches; K101's scheduler plays a song on the
    audio clock with lookahead; the walker (R.4.3); cuts (R.4.1).
  - New: a strip generator (a long, thin lattice made in chunks and
    stitched; maze_plan is global today, so this is a generation project,
    behind a param that defaults off so links and dailies keep their
    mazes). Physics off on the strip (opinion: a 6 by 200 strip holds
    about four times a gs-18 maze's material). An audio-clock camera:
    scroll = audio time minus output latency, so what you see is what
    you hear. A chart generator that puts runs of the right pitch where
    the walker will be when each note is due ("built to correspond to
    the music notes").
  - Timing: judged timing needs 3.5's calibration and breaks over
    Bluetooth (lab averages of about 170-370 ms, 3.1). Quantized plucks
    (Rez, 3.3 F)
    avoid judging: any pluck inside a wide window sounds on the beat.
- **MVP (opinion, recommended):** the standard maze, no scroller. The
  walker takes one run per beat (or bar) along its route; the song plays;
  runs of the next note within three runs of the walker glow; you pluck
  one, quantized. A cut on its planned route makes it replan; stuck, it
  waits and the song goes on (no fail). M on top of shortlist item 2.
- **For:** a real music game only this medium could make; you become
  the band's soloist (K116's accompaniment is the band).
- **Against:** the biggest build here; panic choices on a small screen;
  judged timing is a calibration project.
- **Precedent:** Guitar Hero (2005; the highway); Patapon (2007: you drum
  commands in rhythm and never move anyone directly, the closest model);
  Lumines (the sweep); Rez (quantizing).
- **Cost:** the MVP M; the full strip L-XL.
- **Overlaps:** 3.3 F, G, H; 3.5 (calibration); 3.6 (the no-rhythm
  fallback is R.3.7); 6.3 (more songs).

#### R.3.9 The auto-solver inversion

"The maze is being auto solved, and you are trying to stop it or show it
or guide it": four verbs, one walker (R.4.3). "Show it" may be a typo for
"slow it"; both are covered.

- **Stop it (Keep it in; Chat Noir).** Turn-based: the walker takes one
  run per turn along its current shortest route, you cut one run per
  turn, and you win when the exit is out of its reach.
  - The exit tail is a bridge, so cutting it wins at once: protect the
    tail and a moat around the exit.
  - Balance (inferred from 4.1's counts, not simulated). 4.1's radius
    counts runs from the exit junction. The walker crosses into the
    radius-r ball after roughly 14 − r to 17 − r runs (the fewest-runs
    and the shortest routes, less the exit tail), and fencing that ball
    takes 5, 10 and 14 cuts at r = 2, 3 and 4. With no moat the naive
    fence wins easily (5 cuts against 12 or more turns). A moat of radius
    2 makes it close (10 cuts against 11-14 turns). A moat of radius 3
    tips it to the walker (14 cuts against 10-13 turns), unless the
    cutter makes it detour. Every cut on its route also makes it replan
    longer, which buys turns. Other knobs: a two-run walker, a cut every
    other turn. The balance probe (R.6) decides.
  - Variant: play the spider (R.3.2) catching a fly that flees for the
    exit (4.6's critter), with your body as one more blocker.
- **Slow it (Delay it).** Cuts may never disconnect the walker from the
  exit (refused, as the strand detector would). The score is the length
  of its walk.
  - Always finite: a cut that lengthens its route must break a cycle (a
    bridge elsewhere is on no route of its), and a median daily has 103
    (the measured cycle rank). Once they are gone, it walks home.
  - It is close to shortest-path interdiction (Israeli and Wood 2002),
    played online, and to the Canadian traveller problem (Papadimitriou
    and Yannakakis 1991), where a traveller learns of blocked roads only
    on reaching them.
  - A fine daily: the same walker for everyone; share "🐢 61 runs (it
    wanted 18)".
- **Guide it (Lead the walker; Lemmings, ChuChu Rocket).** The walker
  does not solve; it follows rules. It goes straight on along its strand
  through each junction (the next run of the same chain, from
  `WalkEdge.chain` and the ctrl spans), turns a fixed way where its
  strand ends, and turns back at an END. You place cuts to steer it to
  the exit: before it starts (a puzzle) or while it walks (action).
  - Par: a shortest path over (run, direction) states, where going on is
    free and turning off costs the cuts it takes; exact unless the walker
    re-enters a junction where it was turned.
  - Deterministic and readable, so a daily puzzle ("✂️ 4, par 3").
- **Show it.** The walker demonstrates: an attract mode on the title,
  the optimal route played as a melody after you finish, or R.5.5's
  canon.
- **For:** four modes from one walker and one verb, each a pure function
  of (walk graph, seed, params, your cuts), so attempts and replays stay
  exact.
- **Against:** puzzle modes start slower; the walker's rule must read on
  a phone (show its next run, 2.7, and its route as a faint dotted
  thread).
- **Cost:** the walker S-M; each verb S; each par solver S.
- **Overlaps:** 2.3 (the hunter's planner is the solver), 2.7
  (telegraph), 4.6 (fleeing critters), 4.20 (rescue: the walker is an
  escort), 4.21 (ghost race).

### R.4 The shared pieces

#### R.4.1 Cutting as a verb

- **What a cut is (decision 3):**
  - **Delete the run (recommended).** It leaves `choices()`. A junction
    left with two runs stops being a decision, and a move through it
    carries on (contraction).
  - **Snip** at the tap point into two dead-end stubs: more physical,
    but new END vertices mid-run are runtime walk-graph surgery (4.25,
    M-L), and they make new pockets where the minotaur catches.
- **Contraction without renumbering:** keep the original walk graph and
  its run ids, and let `tapEdge` carry on through two-run junctions (one
  move becomes a chain of original runs). Taps stay original ids, so
  `walkFingerprint`, replay and saved attempts keep working.
- **Distances:** export the Dijkstra with a removed-run set and recompute
  `distToExit` per cut (instant at this size). The g/d/b move log then
  reads against the current maze.
- **Safety:** 4.3's strand detector (can the head still reach the exit?)
  refuses, warns or allows, per mode.
- **Render (render-only, like 4.3):** the run fades or burns away and
  the physics is untouched. Three details:
  1. A per-run hide in the G2 paint, beside KREVEAL. K76's thread-reveal
     layer needs the same thing; whichever lands first builds it.
  2. Crossing gaps: G1 cuts a gap in an under-thread where an
     over-thread passes. When the over-thread's run is cut, that gap
     slot must close, or the under-thread shows a gap with nothing over
     it.
  3. Junction fans: the cut arm must leave its junction's fan
     (`arm_strip.ts`, `junction_field.ts`), or a stub of fan color stays.

  A flourish: the render-only pluck overlay (K77) snaps the two cut ends
  back, with 4.3's short, bright snapped-string pluck.
- **Gesture (decision 5):**
  - **A scissors button (recommended)** arms the next tap, as 4.10's lure
    button arms a pluck. One extra tap per cut, unambiguous on phones.
  - **A swipe across a thread** (Cut the Rope) is fast and satisfying.
    But a press on a thread waits for its slop and then TUGS, and an
    empty-space drag pans. Only a quick swipe that starts in empty space
    and crosses a thread could cut, and it would steal pans.
  - **A long press:** 4.16's chalk claims it, and it fights the tug.
- **Attempts:** a cut is an action, so taps become typed (move or cut):
  store `v: 3`.
- **Cost:** M once (walk graph and controller S, render M, attempts S);
  every cutting mode after it S.

#### R.4.2 Real time as a mode parameter

- **The param:** `clock` = turn (today) | beat (3.3 F and H: moves and
  enemies step on the beat) | realtime. Every enemy and front reads it:
  minotaur, spider, fire, walker.
- **Where real time fits (opinion; narrows 4.35):** threats you read at a
  glance (a front, the beat, a walker, an enemy driven by a stimulus).
  Where it fights: a smart chaser at your speed that you must out-think.
  4.35's verdict holds for SMART chasers only.
- **Thinking time is the lever.** The spider (stillness is silent) and
  the turn-based fire keep it free; a realtime minotaur makes it a cost.
  Pause must hide the board, or pausing is free thinking.
- **Determinism:** game time is a fixed-step clock (say 120 ticks a
  second, accumulated from wall time and paused while hidden, as
  SolveClock is), never the animation clock (K103: below 10 fps the move
  animation slows). The renderer animates toward the game state.
- **Attempts:** timed taps (a tick per tap): store `v: 3`, and K85's
  replay links carry the timings.
- **Mid-flight taps queue** instead of snapping (R.2).
- **Phones:** touch resolves on release, and threads are 4-5 px wide
  (6.2). Realtime modes want generous hit targets (a tap near a choice
  arm snaps to it) and slower defaults. Bluetooth delays only the sound,
  so real time without rhythm is unaffected.
- **Accessibility:** as with rhythm (3.6), no mode may require real time:
  each keeps `clock=turn` (Cadence of Hyrule's Fixed-Beat Mode, section
  8).
- **Cost:** M once (the clock, timed taps, the queue, pause, the store
  bump); S per enemy policy.

#### R.4.3 The auto-walker

- **One walker:** a policy plus a clock that taps its own
  `FabricMazeController`. Policies: a replanning shortest route (the
  minotaur's planner), a strand follower (Lead the walker), a fogged
  explorer (Race the solver; the K80 harness's explorer policies are the
  reference), a song follower (Pluck Hero).
- **Determinism:** its taps derive from (walk graph, seed, params, your
  actions), so an attempt stores only yours.
- **Readability:** show its next run (2.7) and its route as a faint
  dotted thread. A second dot with a glow is what the minotaur needs
  anyway (2.8).
- **Cost:** S-M; each verb S on top.

#### R.4.4 The rhythm mode

- **The clock is there:** K101 schedules on the audio clock (R.2).
  Gameplay on the beat maps the visual clock from the audio clock minus
  output latency (3.5), never the reverse.
- **Three intensities (opinion):**
  1. No judgment: the beat moves you, you only choose (Beat rider,
     R.5.1).
  2. Quantized: any tap inside a wide window lands on the beat (Rez;
     3.3 F; the Pluck Hero MVP).
  3. Judged: Guitar Hero windows. It needs calibration (3.5): an opt-in
     hard mode, like 3.3 H.
- **The band:** a drone or bass that keeps the beat while the player is
  quiet is K116's accompaniment (`docs/design/K116_instruments.md`).
- **Songs:** one tune today (6.3). Rhythm modes want five to ten
  public-domain tunes in different meters and tempos.

### R.5 More ideas in the same spirit

#### R.5.1 Beat rider

- **Plays:** the dot never stops. It moves on the beat, each run taking
  max(1, round(length / L)) beats (L the lattice length of one beat), and
  plucks its run's note as it goes. Before each junction you tap the arm
  you want; with no tap it goes straight on along its strand, and an END
  turns it back. Your route IS the rhythm.
- **For:** music without judgment: you choose and the beat moves you, so
  latency and Bluetooth cannot hurt. Every route sounds like a song. It
  builds the game clock R.4.2 needs.
- **Against:** no stopping to think (a slower tempo and open mazes help);
  long runs mean long waits (cap a run at four beats?). It still needs a
  turn fallback (3.6).
- **Cost:** M (the beat clock, a queued choice, and the straight-on rule
  it shares with R.3.9).
- **Overlaps:** 3.3 A (traversal plucks), F (quantizing), H; 4.19 (ice
  runs); R.3.9's strand follower.

#### R.5.2 Firebreak

- **Plays:** a spark lights at a telegraphed junction. Each turn the fire
  spreads one run in every direction and you cut k runs. Save the exit,
  or as many runs as you can. It is a cousin of the firefighter problem
  (Hartnell 1995; Finbow and MacGillivray 2009), which protects vertices
  where this cuts edges.
- **For:** a pure turn-based puzzle; it combines with the burn race
  (race AND cut).
- **Against:** abstract; NP-hard in general, so an exact par only on
  small mazes.
- **Cost:** S after the burn race and R.4.1.

#### R.5.3 Strand wave

- **Plays:** a pluck sends a wave along its WHOLE strand, through every
  crossing, and stuns any enemy on that strand's runs. You must know
  which threads are one strand as they weave across the maze.
- **For:** only a woven maze can do this. It teaches strands and gives
  the instrument teeth (`audioRuns` already maps a chain to its runs).
- **Against:** strands are hard to follow at phone widths; light the
  whole strand while a finger presses it.
- **Cost:** S after the minotaur.
- **Overlaps:** 3.3 K, 4.10, 4.26.

#### R.5.4 Resonance shatter

- **Plays:** a charge shatters every run of one pitch at once, like a
  glass harp. Block the minotaur by sacrificing all the D runs, if your
  own route survives it.
- **For:** a big, readable musical move with the notes scheme (3.3 B):
  one choice among about seven pitches.
- **Against:** blunt; it can wreck your own route (the strand detector
  warns).
- **Cost:** S after R.4.1 and the notes scheme.

#### R.5.5 Your echo

- **Plays:** your own path, replayed N moves behind you, walks the maze.
  As an enemy, touching it is a catch, so backtracking and short loops
  turn dangerous: with N = 2 every dead-end poke meets it at the mouth,
  with N = 3 you slip past (unless you turn back into it). As music, it
  replays your notes N beats
  later: a canon.
- **For:** a pure function of your taps, cheap after the minotaur. The
  canon is a lovely free gift in music mode. Lit, it is the burn race's
  wick.
- **Against:** mild in a braided maze (going forward never meets it); it
  bites in dead ends and under fog.
- **Cost:** S after the minotaur's contact rule.

#### R.5.6 Short versus Cut

- **Plays:** two players on one phone. Short claims runs (they glow) to
  join the entrance to the exit; Cut deletes runs to stop it. One run
  each per turn. A bridge would hand Cut a one-move win (a median daily
  has 3: both tails plus one, section 1), so the bridges start claimed
  for Short.
- **For:** it is the Shannon switching game, which Lehman solved (1964):
  the perfect-play winner is computable in polynomial time, so the
  generator can check a maze before offering it and pick who starts. It
  needs only the cut verb, and Gale's Bridg-It shows the game is fun.
- **Against:**
  - Inferred, not measured: our mazes are probably too sparse for a fair
    game. Short wins even moving second only if some subgraph holding
    both ends has two edge-disjoint spanning trees (Lehman's criterion,
    from memory): at least 2(n - 1) runs on its n junctions, nearly four
    runs per junction. A median daily has about three (302 runs on 199
    vertices; two trees over all of them need 396). So Cut is probably
    favored, and a fair game may need a denser maze or two claims per
    Short turn. Lehman's test on 30 dailies would settle it cheaply.
  - Two players on a phone is a niche, and a solved game fades once a
    player learns the strategy.
- **Cost:** S after R.4.1.
- **Overlaps:** 4.22 (two-player minotaur).

#### R.5.7 Race the solver

- **Plays:** a fogged AI explorer solves the same maze at the same time;
  beat it to the exit.
- **For:** an opponent every day, with tunable skill; the K80 harness
  already has explorer policies.
- **Against:** an AI that knows the maze is unbeatable, and one that
  does not must look clever enough to matter.
- **Cost:** S after R.4.3.
- **Overlaps:** 4.21 (ghost race).

### R.6 What each shortlisted prototype must answer

1. **Burn race:** at r 0.75-0.9, with and without fog, what is the
   closest call for the K80 harness's explorer policies on 30 dailies,
   and how often is an explorer trapped? If careful players never come
   within a run of the fire, drop it or make fog part of the mode.
2. **The cut verb with Lead the walker:** do daily pars land at 2-5 cuts
   (not 0, not 15)? Can a first-time phone player predict the walker's
   next run? Then the Keep it in balance probe: naive fencing against a
   replanning walker at one and two runs per turn, by moat radius.
3. **Beat rider:** is never stopping fun or stressful, at 132 bpm and
   slower? Do long runs need a beat cap?
4. **Spider:** does "stillness is safe" make real time comfortable on a
   phone, and are accidental plucks a problem?
5. **Pluck Hero MVP:** is choosing a safe same-note run inside a beat
   window fun or panic, and how wide must the window be?

### R.7 Round 2 sources (leads)

From memory and not re-checked in this session: verify before quoting.
Round 1's sources are in section 8.
- Pac-Man speeds: the Pac-Man Dossier (section 8 cites it, but not
  these speed figures, which are from memory).
- M. R. Garey and D. S. Johnson, Computers and Intractability (1979):
  longest path is NP-complete.
- Pipe Dream (The Assembly Line, published by Lucasfilm Games, 1989).
- Chat Noir (also known as Circle the Cat), a web game.
- Lemmings (DMA Design, 1991); ChuChu Rocket! (Sonic Team, 1999).
- Guitar Hero (Harmonix, 2005); Patapon (Pyramid and Japan Studio,
  2007); Cut the Rope (ZeptoLab, 2010).
- Spider: The Secret of Bryce Manor (Tiger Style, 2009).
- B. Mortimer et al., "Tuning the instrument: sonic properties in the
  spider's web", J. R. Soc. Interface 13 (2016).
- Arachnophobia settings: Grounded (Obsidian, 2020); Satisfactory
  (Coffee Stain Studios).
- A. Lehman, "A solution of the Shannon switching game", J. SIAM 12
  (1964) 687-725; David Gale's Bridg-It.
- B. Hartnell, "Firefighter! An application of domination" (1995); S.
  Finbow and G. MacGillivray, "The firefighter problem: a survey of
  results, directions and questions", Australas. J. Combin. 43 (2009)
  57-77.
- C. H. Papadimitriou and M. Yannakakis, "Shortest paths without a map",
  Theoret. Comput. Sci. 84 (1991) 127-150 (the Canadian traveller
  problem).
- E. Israeli and R. K. Wood, "Shortest-path network interdiction",
  Networks 40 (2002) 97-111.

## 5. Suggested order

**First mode: the minotaur**, as section 0 describes it.

**Next, in order** (opinion):
1. The sword (4.7) and lure plucks (4.10): S each. They give the player
   agency against the minotaur.
2. Traversal plucks and the notes scheme (3.3 A, B): S. They make every
   later music idea cheaper.
3. Scheduled plucks, then beat-quantized moves with the groove (3.2,
   3.3 F, G): M. They also fix music mode's jitter.
4. Locks and keys, exit and shortcut forms (4.1): M.
5. One-way runs (4.2): M. Provably trap-free.
6. Crack-then-break runs (4.3): S-M.
7. The melody path (3.3 C): M.
8. Validated sentries (4.8): M-L, with the time-expanded solver.

(Item 3's scheduled plucks are done: K101, e9e01ae.)

**Round 2** (section R) has its own ranked shortlist (R.0). The burn race
and the cut verb need no minotaur, so they can run beside this order; the
spider and cutting against monsters come after the minotaur.

**What composes:**
- Minotaur, fog and footsteps: the horror mode.
- Minotaur, sword and lures: power and agency.
- Keys and one-way runs: Unexplored's locks and valves.
- Melody path, notes colors and traversal plucks: the song maze.
- Rhythm (F, G) is a layer on anything.
- Collapsing runs and trail mode: no going back, ever.

**What to avoid:**
- Reactive minotaurs faster than you: 0% winnable, measured.
- One-shot collapsing runs as the default: 67% of explorers stranded,
  measured.
- Minotaur and fog without sound cues: deaths you could not see coming.
- Correctness sonification (3.3 E) on dailies: it is an answer key.
- A beat-locked minotaur without calibration, and especially over
  Bluetooth.
- More than two gate types on one phone screen.
- Unvalidated patrols: 7% unwinnable, measured.
- Dead-end branches (several runs behind one bridge) with the minotaur,
  until K74 and K80 agree how deep a trap may be.

## 6. Open questions (beyond section 0)

1. Should a hunting minotaur ever enter a pocket you are in, or wait at
   the mouth (a siege)? The player cannot wait, so a one-run tip forces
   you out next move either way. A siege only matters with a wait action.
2. Each new kind of thing on a run (keys, swords, pickups, locks,
   sentries) is a glyph at 4-5 px thread widths. K83's glyph style needs
   a size floor on phones, measured as K46 measured the threads.
3. Music mode plays Scarborough Fair only. The melody path and a
   song-per-day both want a small library of public-domain tunes in
   `songs.ts`.

## 7. Evidence and how to rerun it

Harness: `.claude/probes/K80/`, untracked like every probe folder. It was
written in the K80 worktree and belongs in the main checkout's
`.claude/probes/K80/`. Its paths are relative to the folder, so it runs
from either place.
- `lib.ts` builds mazes exactly as main.ts rebuild() does (the K46
  pattern), and turns the walk graph into a simulation graph: all-pairs
  run counts, bridges, pockets, the route.
- `sim.ts`:
  - the minotaur rules;
  - the contact rule;
  - the six player models;
  - the counter-based `TurnRng`;
  - `solve()`, the exact breadth-first solve for deterministic
    minotaurs.
- `run.ts` and `run_all.ps1` play every design × rule × player.
  `extras.ts` measures gates, key detours and collapsing runs
  (`out/extras.jsonl`).
- `analyze.mjs` writes the tables (`out/summary2.txt`); `pivot.mjs`
  gives catch rates per rule and maze set.
- `smoke.ts` plays a few games on Daily #1; `debug_forced.ts` traces a
  forced catch move by move (it found the lasso pockets).

Designs:

| Set | What | Count |
|---|---|---|
| daily | V1 dailies 1-30 | 30 |
| deadends | codec v3 defaults with `deadEnds` (density 0.25), seeds 1001-1030 | 30 |
| treelike | `deadEnds`, density 1, seeds 2001-2020 | 20 |
| small14 | gs 14, seeds 3001-3020 | 20 |
| halls3 | `junctionSpacing` 3, seeds 4001-4020 | 20 |

Structure (medians):

| Set | Vertices | Runs | Cycle rank | Bridges | Pocket vertices | Route runs | Fewest runs | Optimal length |
|---|---|---|---|---|---|---|---|---|
| daily | 199 | 302 | 103 | 3 | 2 | 18 | 15 | 80.2 |
| deadends | 203 | 304 | 103 | 5 | 4 | 19 | 15 | 83.1 |
| treelike | 215 | 316 | 102 | 11 | 10 | 21 | 16 | 85.2 |
| small14 | 120 | 180 | 62 | 3 | 2 | 14 | 12 | 69.7 |
| halls3 | 109 | 163 | 55 | 4 | 4 | 15 | 11 | 109.5 |

Second pass: 132,480 games (24,280 rows), 25 s on 4 processes (not a
timing study). Games per cell: 8 for random rules and 1 for
deterministic ones, against deterministic players. The exact solves
cover the daily, deadends and treelike sets, with and without waiting.
`claims.mjs` recomputes the headline counts of section 0.

Rerun from the checkout root (a worktree needs `node_modules` junctioned
to the main checkout's):

```powershell
.\.claude\probes\K80\run_all.ps1 -Out .claude\probes\K80\out\main2.jsonl -Parallel 4
node .claude\probes\K80\analyze.mjs .claude\probes\K80\out\main2.jsonl | Out-File -Encoding utf8 .claude\probes\K80\out\summary2.txt
node .claude\probes\K80\pivot.mjs .claude\probes\K80\out\main2.jsonl explorer80 caught
```

Model limits (so the numbers are read right):
- The players are heuristics, not people.
- `aware` is cautious to a fault: it timed out against sentries that a
  human would time.
- The explorer "sees" the exit marker and heads for it.
- Lapses are independent per move, while real attention lapses come in
  runs.
- Treat the catch rates as a ranking of rules and mazes, not a forecast.

## 8. Sources

Mazes and the minotaur:
- Robert Abbott, *Mad Mazes* (Bob Adams, 1990) and *SuperMazes* (Prima,
  1997); rules as given on the Unizar applet page:
  https://webdiis.unizar.es/~spd/pub/games/Theseus/Theseus.html. Logic
  mazes: https://en.wikipedia.org/wiki/Logic_maze (Traffic Maze, Martin
  Gardner's column, Scientific American, October 1962).
- Jamey Pittman, *The Pac-Man Dossier*: https://pacman.holenet.info/.
- Toru Iwatani, interview in Susan Lammers, *Programmers at Work*
  (1986): https://www.oocities.org/siliconvalley/heights/5874/iwatani.htm.
- Brian Walker (Brogue), "The Incredible Power of Dijkstra Maps":
  https://www.roguebasin.com/index.php/The_Incredible_Power_of_Dijkstra_Maps.
  Brogue CE source, `src/brogue/Monsters.c`:
  https://github.com/tmewett/BrogueCE.
- Hitman GO: https://en.wikipedia.org/wiki/Hitman_Go. Lara Croft GO:
  https://en.wikipedia.org/wiki/Lara_Croft_Go.
- Justin Ma, Road to the IGF: Into the Breach (Game Developer):
  https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-.
- Crypt of the NecroDancer:
  https://en.wikipedia.org/wiki/Crypt_of_the_NecroDancer. Cadence of
  Hyrule's Fixed-Beat Mode:
  https://www.zeldadungeon.net/cadence-of-hyrule-can-be-played-without-rhythm-mode/
  and GameSpot's review:
  https://gamespot.com/reviews/cadence-of-hyrule-review-groove-is-in-the-heart/1900-6417165/.

Lock and key, cycles:
- Joris Dormans, "Adventures in level design: generating missions and
  spaces for action adventure games", PCGames '10, ACM,
  doi:10.1145/1814256.1814257.
- Tommy Thompson, "Unexplored's secret: cyclic dungeon generation"
  (Game Developer, 2021):
  https://www.gamedeveloper.com/design/unexplored-s-secret-cyclic-dungeon-generation-.
- Boris the Brave, "Dungeon Generation in Unexplored" (2021):
  https://www.boristhebrave.com/2021/04/10/dungeon-generation-in-unexplored/.
- Mark Brown, Boss Keys (Game Maker's Toolkit): overview at
  https://zeldauniverse.net/2017/01/26/explore-zelda-dungeon-design-in-mark-browns-youtube-series-boss-keys/
  and https://roomescapeartist.com/2017/09/10/boss-keys-analysis-zelda-dungeons/.

Graph theory:
- Cop number and cop-win graphs (Quilliot 1978; Nowakowski and Winkler
  1983; Aigner and Fromme 1984; Bonato and Nowakowski 2011):
  https://en.wikipedia.org/wiki/Cop_number,
  https://en.wikipedia.org/wiki/Cop-win_graph.
- H. E. Robbins, "A theorem on graphs, with an application to a problem
  of traffic control", Amer. Math. Monthly 46(5) (1939) 281-283,
  doi:10.2307/2303897: https://en.wikipedia.org/wiki/Robbins%27_theorem.

Music, rhythm and audio:
- Rez quantization (PlayStation Blog, 2017):
  https://blog.playstation.com/archive/2017/10/20/classic-levels-deconstructed-tetsuya-mizuguchi-musician-adam-freeland-dissect-rez-infinites-area-5.
- Lumines' sweep speed per song: https://nintendolife.com/reviews/switch-eshop/lumines_remastered.
- Hi-Fi Rush: Twinfinite on John Johanas's MinnMax interview
  (https://twinfinite.net/news/hi-fi-rush-had-an-internal-cult-following-at-bethesda-before-it-was-even-pitched/),
  GDC 2024 "Developing Hi-Fi RUSH Backwards": https://gdcvault.com/play/1034256/.
- osu! hit windows: https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty.
- Loom: https://en.wikipedia.org/wiki/Loom_(video_game).
- R. Plomp and W. J. M. Levelt, "Tonal consonance and critical
  bandwidth", J. Acoust. Soc. Am. 38 (1965) 548-560.
- J. H. McDermott, A. F. Schultz, E. A. Undurraga and R. A. Godoy,
  "Indifference to dissonance in native Amazonians reveals cultural
  variation in music perception", Nature 535 (2016) 547-550; coverage:
  https://www.brandeis.edu/now/2016/july/music-biology-tsimane.html.
- Chris Wilson, "A tale of two clocks" (2013):
  https://web.dev/articles/audio-scheduling.
- MDN: `AudioContext.outputLatency`,
  https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency;
  `getOutputTimestamp()`,
  https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp;
  `navigator.vibrate`,
  https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate.
- Android WALT tap and audio latency:
  https://android.googlesource.com/platform/external/walt/+/HEAD/docs/TapLatency.md,
  https://android.googlesource.com/platform/external/walt/+/HEAD/docs/AudioLatency.md.
- Bluetooth latency: https://www.rtings.com/headphones/learn/latency
  (SBC about 173 ms), and SoundGuys' phone averages as reported at
  https://dev.to/keyboard-testerclick/your-bluetooth-headphones-are-300-ms-late-measure-it-in-one-browser-tab-2idp.
- Game Accessibility Guidelines, "Ensure no essential information is
  conveyed by sounds alone":
  https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-sounds-alone/.
- WCAG 2.3.1, Three Flashes or Below Threshold:
  https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html.

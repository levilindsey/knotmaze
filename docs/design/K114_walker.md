# K114 walker: the auto-walker and Lead the walker

Ledger: K114 (round 2, shortlist item 2, stage 2). One stage, opus, 2 h
cap. Design: `docs/design/K80_gameplay_additions.md` section R. Grep it
for "R.3.9 The auto-solver inversion", "R.4.3 The auto-walker", "R.6 What
each shortlisted prototype must answer" and R.0's "Ranked shortlist"
(item 2).

Stage 1 built the cut verb. Read its Handoff in `docs/design/K114_cut.md`
first: the action log, the cut set, the contraction, the distances, the
scissors button and its calls. This stage builds on them; it does not
change what a cut is.

## The plan

- R.0's shortlist item 2, which the sooner plan follows: the cut verb and
  the auto-walker, tried first as **Lead the walker** (a deterministic
  puzzle with a computable par), then **Delay it** (always finite), then
  **Keep it in** after a balance probe.
- Levi's round-2 decisions still bind: 3 (a cut deletes the whole run), 4
  (render-only plus walk-graph cuts) and 9 (all of round 2 in free play
  first, so no daily here).

## This stage, in order

Build them in this order. What the cap leaves goes in the Handoff as the
remainder.

1. **The walker and the par solver**, pure, with the par census in node.
2. **Lead the walker** on the page.
3. **Delay it.**
4. **The Keep it in balance probe**, in node only.

## Decided

### The walker (R.4.3)

- **One module**, `src/game/walker.ts`: a policy plus a step, pure. From
  (walk graph, cut runs, the walker's state) it gives the next run.
  - Its taps derive from (walk graph, seed, params, your actions), so
    stage 1's `FabricMazeController.replayActions(actions)` rebuilds
    everything (`replay(taps)` is still K47's tap replay).
- **It drives its own `FabricMazeController`:** the walker is the head.
  In a walker mode you do not walk; your actions are cuts.
  - `taps`, the move log, the trail and the fog follow the walker.
- **Two policies this stage:**
  - the strand follower, for Lead the walker;
  - the replanning shortest route, for Delay it and Keep it in. It uses
    stage 1's walk-distance Dijkstra with the cut set removed.
- **The look:**
  - the head dot with a glow of its own, in the walker's colour (as 2.8
    gives the minotaur its red highlight), so it reads as not you;
  - its next run, as the minotaur's telegraph shows the minotaur's (2.7);
  - its route ahead as a faint thread.

  Reuse the minotaur's telegraph item (`setTelegraph`, K324) in the
  walker's colour. Make it dotted only if the item supports that cheaply.
  K324 stage 2 merged (031e09a): the real-time lead, whole runs and ring,
  and the `uKTeleAt` uniform. Read REAL-TIME TELEGRAPH in
  `.claude/rules/gameplay-minotaur.md` before you reuse the item.

### Lead the walker (R.3.9 "Guide it")

- **The rule:**
  - It goes straight on along its strand through each junction: the next
    run of the same chain (`WalkEdge.chain` and the ctrl spans).
  - Where its strand ends, it turns a fixed way. Rec: the next live arm
    clockwise from straight on, so it keeps right. List it as a call.
  - At an END it turns back.
  - A cut run is gone for the rule, so a cut continuation makes it turn.
- **A puzzle, not action.**
  - You place cuts first, then press Go. In this mode a tap on a run cuts
    it, with no need to arm the scissors.
  - Undo pops a cut while it stands.
  - While it walks, taps do nothing.
  - Reset puts it back at the start and keeps your cuts.

  Cutting while it walks is a call, not built.
- **Its route before Go.** Show where it will go, up to the exit or its
  first repeated (run, direction) state, as the faint thread. Update it
  after every cut and Undo.
- **The ending.** It wins when the walker reaches the exit. If the walker
  repeats a state, it is going in circles: a toast says so ("It's going
  in circles") and play returns to planning with the cuts kept.
- **Par:** the fewest cuts that lead it to the exit.
  - R.3.9's model: a shortest path over (run, direction) states. Going on
    is free; taking another arm costs the cuts on the arms the rule would
    take first.
  - That is exact unless the walker comes back to a junction where it was
    turned. Check each par by simulating the walker with the par's cut
    set.
  - When they disagree, search exactly (for example A* over (state, cuts
    so far), bounded by the model's cost), or report the case.
- **Stage 1's limits hold.**
  - A cut that leaves the walker no route to the exit is refused.
  - The start tail, the exit tail and K115 title runs can't be cut.
- **The HUD, the banner and the share.**
  - A "cuts N · par P" row in the HUD and the banner, with its help line
    in `maze_stats.ts`.
  - The share says "✂️ 4, par 3".
- **Stars.** Rec: from cuts against par: 3 at par, 2 at par + 1, 1 beyond.
  List it as a call.

### Delay it (R.3.9 "Slow it")

- **The walker:** the replanning policy. Each turn it takes the first run
  of its current shortest route to the exit.
- **Turns.** Each of your actions is a turn: a cut, or a pass (rec: the
  Go button reads "Let it walk"). After each one, the walker takes one
  run. List the turn structure as a call; the alternative is that it
  walks on a clock and you cut at will.
- **Limits.** Cuts never disconnect it from the exit: stage 1's refusal,
  checked against the walker.
- **The score:** the length of its walk in runs.
  - A HUD row shows its walk and its shortest.
  - The share says "🐢 61 runs (it wanted 18)".

### The Keep it in balance probe (R.6.2)

- In node only; no mode, no UI.
- Naive fencing against the replanning walker, at one and two runs per
  turn, by moat radius 0 to 3. The moat is the runs within r of the exit
  junction, where you may not cut, and the exit tail is always
  protected.
- On 30 dailies, report a table of the cutter's wins and the turns
  taken.

### The param

- `cut` gains `lead` and `delay`, appended to its options; stage 1 made
  it an enum for this.
  - Appending an enum option needs no codec version bump.
  - The default stays off, so no pin moves beyond whatever lists `cut`'s
    options.
- The scope is stage 1's: cutting and walker modes work only while
  fragile, collapse, par, the minotaur and the fire are all off.

## Your calls

Decide each one and build your recommendation. List each in the Handoff
as a numbered call for Levi, with the alternatives:

1. the fixed way at a strand end;
2. puzzle or action, and whether Go locks the cuts;
3. what the route shows: all of it, or its next few runs, since the
   whole route makes the puzzle easier to read and easier to solve;
4. Lead's stars;
5. Delay's turns;
6. what to do with mazes the census finds at par 0 or past par 8.

Also add a question for Levi: can a first-time phone player predict the
walker's next run? R.6.2 asks it, and only a phone can answer it.

## Steps

1. **Read narrowly** (Grep -n, then Read with offset/limit):
   - the Handoff in `docs/design/K114_cut.md`;
   - `src/game/cut.ts`, and the controller's action log, replay and
     tapEdge;
   - `src/core/walk_graph.ts`: `WalkEdge`, `walkDistances`, `runsToExit`;
   - the telegraph's API: `setTelegraph` in `ribbon_renderer.ts`, and its
     use in `fabric_maze_renderer.ts`;
   - K80's sim policies, for a walker reference
     (`.claude/probes/K80/sim.ts`, `Policy`, in the main checkout).
2. **Design.** Append a short "Design" section to this brief: the walker's
   state and step, how a run's chain continues through a junction, the
   par solver, and the calls. Commit.
3. **The pure walker:** `src/game/walker.ts` and `test/game/walker.test.ts`.
   On hand-built graphs, test:
   - the strand follower: go on, turn at a strand end, turn back at an
     END, detect a loop;
   - the replanning walker;
   - the par solver, with its exactness check;
   - determinism.
4. **The par census**, in node.
   - Build dailies 1 to 30 (`dailyParams(n)`) with K137's sim kit,
     `.claude/probes/K137/k137_lib.ts` in the main checkout (`designParams`,
     `buildDesign`).
   - For each, record: par, and whether it is exact; the walker's route
     with no cuts (the exit, or a loop, and how long); its route with the
     par's cuts.
   - Report a histogram. R.6.2 asks whether pars land at 2-5 (not 0, not
     15). The answer decides whether Lead the walker needs a knob.
5. **Lead the walker on the page:**
   - the param option;
   - the walker's frame: its own clock, one run per the head dot's normal
     move time;
   - Go, Reset, tap-to-cut and the route thread;
   - the HUD and banner rows, and the share;
   - a probe hook, `__knotFabric().walker`: the mode, its state, the par,
     the cuts and the route.
6. **Delay it:** the same, with the replanning walker and the pass.
7. **The balance probe**, in node.
8. **Verify.**
   - `npm test` and `npm run build` pass, and no pin moves beyond `cut`'s
     options.
   - **The page.** Write a driver modelled on stage 1's, in the main
     checkout's `.claude/probes/K114/cut/`. With real taps, on desktop
     and at 411x753, it plays:
     - Lead: cuts, Go, and the walker reaches the exit; a loop; Undo and
       Reset; the share;
     - Delay: three turns with cuts, a pass and a refused cut.

     Take stills of the walker, its route thread and the HUD rows.
9. **Lore:**
   - a "Walker" section in `.claude/rules/gameplay-mechanisms.md`, beside
     Cut;
   - the param's option lines in `gameplay-links.md`;
   - the panel rows in `gameplay-panel.md`.

## Constraints

- **Agents beside you.** Stay out of their files. If a change seems to
  need one, stop and report.

  | Agent | Files |
  |---|---|
  | K137 stage 3a | `minotaur.ts`, `minotaur_turns.ts`, `mino_feedback.ts`, `fire.ts`, `fire_clock.ts`, `fragile.ts`, `syncMinotaur` and the sword marker in `fabric_maze_renderer.ts`, `marker_glyphs.ts`, `marker_mesh.ts`, main.ts's catch code, `restartSolve` and the minotaur frame. Its rows in the controller, the HUD, the stats and the share sit beside yours: resolve them at your rebase. It builds sprint's button from stage 1's scissors component, and may give the telegraph a pale flee colour; keep your telegraph change small and rebase onto theirs |
  | K580 stage 4 | `src/core/glyphs/`, `src/render/ribbon/joinery.ts`, `src/render/ribbon_mesh.ts` |

- **Yours:**
  - `walker.ts` and its test;
  - `cut.ts`, `walk_graph.ts`, and the controller's walker and action-log
    code;
  - the walker's use of the telegraph;
  - the tap routing in walker modes (main.ts's `cutTap`,
    `src/app/input_pointer.ts`) and the walker's frame
    (`src/app/frame_loop.ts`, beside `cutTick`);
  - a `src/ui/` file for Go and Reset, if you want one;
  - your rows in `maze_hud.ts`, `maze_stats.ts` and `share_text.ts`;
  - the param options, the panel rows and the lore.
- **Out of scope:**
  - Keep it in as a mode (only its probe);
  - Show it, Race the solver and Pluck Hero;
  - the spider (K627);
  - healing cuts, and cuts with the minotaur or the fire (K688);
  - Lead's action variant;
  - dailies, saved attempts and the store version;
  - a real phone pass.
- **Locks and probes.**
  - Probes go in `.claude/probes/K114/walker/` in your worktree
    (untracked).
  - Use ports 5124-5127.
  - Never use `--virtual-time-budget`.
  - Give every Chrome a fresh temp profile.
  - Take no performance measurements.
- **Rebase** onto master before your final report (`git fetch`, then
  `git rebase origin/master`), and check that `npm test` passes. If
  another param or option landed first, append after it and re-freeze the
  pin.

## Stop rule

Stop when the stage is done or at the 2 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone. Commit WIP to
your branch at every milestone, green or not, and never push.

A compaction is not a stop: after one, re-read this brief and `git log`
before going on. Keep reads narrow (Grep -n, then Read with
offset/limit). Any helper runs on sonnet with a 1 h cap under this same
rule.

When you stop:
- commit WIP;
- append a "Handoff" section to this brief: what landed, the calls, the
  census and probe tables, the page results, the residuals and the handle
  fields;
- report.

End your report with the item's handle fields and a `Ledger items` list.

## Working notes

Agent K114 walker (claude 91b19e11-7759-4638-ba60-4705b011b94f,
coordinator). Started 2026-10-20 22:23 PT; the 2 h cap is 00:23.

- Branch `worktree-agent-a0437651435d16c14`, worktree
  `.claude/worktrees/agent-a0437651435d16c14` (node_modules is a junction
  to the main checkout: `(Get-Item node_modules).Delete()` before any
  recursive delete). Ports 5124-5127, private Vite cacheDir.
- Probes: `.claude/probes/K114/walker/` (untracked), copied from the
  main checkout's `K114/cut/` (page driver, k137_lib) and `K80/sim.ts`.
- Where things are: `src/game/cut.ts` (cuttable, carryChain,
  distancesToExit; never mutate `walk.distToExit`), the controller's
  `cut`/`replayActions`/`tapEdge`/`logMove` (logMove sets `carry` when
  cuts exist: walker modes must not, so the walker taps one run at a
  time), `src/core/walk_graph.ts` (runs: chain + ctrl span, node i at
  ctrl 2i, a closed strand's wrap run ends at 2*(stops[0]+nodeCount)),
  `src/core/greedy_search.ts` `runPoly`/`headingVectors` (3 u look,
  hypot2; its `${v}|${eid}` key collides on self-loops, so the walker
  keeps per-run-end headings), `src/app/scene.ts` (graph + walk graph
  + controller built together).

## Design

- **State.** A directed run `d = 2 run + dir` (dir 0: va to vb, arriving
  at vb; dir 1: vb to va). Leaving a run by its end k (0 = va, 1 = vb)
  is `2 run + k`, so turning back is `d ^ 1`.
- **WalkerMap** (`src/game/walker.ts`, built once per maze from the
  tangle graph and the walk graph): per run end, the heading (greedy
  search's 3 u look along the run's lattice polyline, exact ops) and the
  same-strand continuation. At vb (ctrl `ctrlB`) the strand goes on into
  the run of the same chain whose `ctrlA` is `ctrlB` (mod `2 nodeCount`
  on a closed strand), at va into the run whose `ctrlB` is `ctrlA`; none
  means the strand ends at that junction (a splice bridge, H1's trimmed
  strand, a title seam).
- **Lead's step** at the vertex `d` arrives at: an END turns back; else
  the preference list is the continuation, then the other run ends
  clockwise from straight on (s = minus the arrival heading; sorted by
  half-plane, then the sign of the cross product, ties by run id: no
  atan2), then back. It takes the first live one. A repeated `d` is a
  loop (the walk is deterministic, so it would repeat forever). The route
  is the walk to the exit or to the first repeat.
- **Delay's step:** among the live runs at the walker's vertex, the least
  `length + distance(far end)` (stage 1's `distancesToExit` with the cuts
  removed), ties by run id.
- **Par:** R.3.9's model is a Dijkstra over directed states: taking the
  k-th entry of the preference list costs k cuts (none past an uncuttable
  run). Its cheapest route gives a candidate cut set, checked by
  simulating the walker. The exact search is a depth-first walk over
  partial assignments (each run cut, live or open): the walk runs as the
  rule says until the first open run in a preference list, then branches
  (take it: live; or cut it: one more cut), with iterative deepening on
  the cut count up to the candidate's size minus one. It is exact (a
  repeated state is a loop whatever is decided later) within a step
  budget; past the budget the candidate is reported as an upper bound.

## Handoff

Stopped 2026-10-21 at about 00:01 PT, inside the cap. All four items are
built and verified, and so are Lead's stars (call 4). The branch is
rebased onto origin/master (13 new commits, no conflicts; K137 s3a had
not landed, so its HUD, stats, share and star rows, `star_rating.ts`
included, are still to meet these at its merge or this one). `npm test`: 1813 passed, 1 skipped. `npm run
build` passes. The codec pin moves by `cut`'s two new options only; no
other pin moved.

### What landed

- `19c63c6` The pure walker and Lead's par (`src/game/walker.ts`, 17 tests
  in `test/game/walker.test.ts`). It has the WalkerMap (headings and
  strand continuations per run end), `leadRoute`, `delayNext` and
  `leadPar`. `leadPar` runs R.3.9's model, checked by simulation, then
  the exact search (`PAR_STEP_BUDGET` 400000, `PAR_MAX_CUTS` 12). Past the
  budget it gives an upper bound (`exact: false`).
- `532d2d6` `cut` gains `lead` and `delay`, appended. There is no codec
  bump and the default stays off. Walker modes keep stage 1's scope.
- `631f523` The route thread: the telegraph rims draw the route, the next
  run full and the rest faint. The walker buttons are
  `src/ui/walker_buttons.ts`: Go / "Let it walk", Undo, Reset.
- `82f2a47` Lead and Delay on the page:
  - the walker's frame, one run per the head dot's normal move time;
  - tap-to-cut through the pointer's cut pick, with keys G (go) and U
    (undo);
  - the HUD rows: `cuts 1 · par 1` and `cuts 2 walker 3 · shortest 14`;
  - the banner rows, and the share: `✂️ 1, par 1` and
    `🐢 18 runs (it wanted 14)`;
  - the toasts: "It's going in circles.", "The walker has no way to
    go.", "The walker can't go on.", and stage 1's refusal ("That cut
    would leave the walker no way to the exit."), checked against the
    walker.
- `d394126` The probe hook `__knotFabric().walker` (mode, state, idx,
  par, parCuts, cuts, route, end, walk, shortest, shown). The lore:
  Walker in `gameplay-mechanisms.md`, the options in `gameplay-links.md`,
  the rows in `gameplay-panel.md`.
- `2f2b4ea` Reset after a finish. Once the banner closes, the buttons
  come back with only Reset live, and it starts a fresh solve. Before
  this, the buttons stayed hidden and Reset could not be reached.
- `8dc55c8` Lead's stars (call 4): `rateCuts` and `cutRules` in
  `star_rating.ts`, Lead's branch of `starExplanation`, and main.ts's
  rating line in `showFabricWin`. 3 tests in `star_rating.test.ts`; the
  lore in `gameplay-mechanisms.md` and `gameplay-stars.md`.

### Calls for Levi

1. **The strand end.** Built: the walker keeps to its own strand. Where
   the strand ends, or its continuation is cut, it takes the first live
   arm clockwise from straight on (it keeps right). It turns back only
   when nothing else is live, and an END always turns it back.
   Alternatives: counter-clockwise (keep left), or the straightest arm.
2. **Puzzle or action.** Built: the puzzle. You cut while the walker
   plans, and Go starts the walk and locks the cuts (a tap does nothing
   while it walks). A walk that ends short says why and goes back to
   the plan with the cuts kept. Reset does the same mid-plan or mid-walk,
   and gives a fresh solve after a finish. Alternative: cutting while it
   walks (Lead's action variant, out of scope here).
3. **The route.** Built: all of it, to the exit or to its first repeat,
   redrawn after every cut. The next run is full and the rest faint.
   Alternative: the next few runs only, which is harder to read and
   harder to solve.
4. **Lead's stars.** Built as recommended: the cuts against par, 3 at
   par or under, 2 at par + 1, 1 beyond (`rateCuts` in
   `star_rating.ts`). The popover gives Lead's rules, then "You led the
   walker out with N cuts; par is P.", and the share's title wears the
   stars. Delay has no stars, because the walk rating measures your walk
   and the walker walked. Alternatives: no stars in walker modes, or
   stars for Delay from its walk against the shortest.
5. **Delay's turns.** Built: each action is a turn, a cut or a pass
   ("Let it walk", or G), and the walker takes one run after each. Undo
   takes back the last turn: the cut and the run after it, or a pass's
   run. Alternative: the walker walks on a clock and you cut at will.
6. **Par 0 or past 8.** The census found one par 0 (daily 18, whose
   uncut walker reaches the exit in 61 runs) and none past 4.
   - Built: nothing special. A par-0 maze reads `par 0`, and Go wins
     with no cuts.
   - An upper-bound par shows as a plain par; no daily hit one.
   - Options: skip or reroll par-0 seeds for Lead, say "no cuts needed",
     or mark an upper bound ("par ≤ n").

**Question for Levi (R.6.2):** can a first-time phone player predict the
walker's next run? Only a phone can answer it. The route shows the next
run full, so the test is whether a new player reads it before tapping.

### Par census, dailies 1-30

Source: `.claude/probes/K114/walker/par_census.md` (`par_census.ts`). The
whole census took 1.1 s of wall time; the largest search was 74055 steps
(daily 23).
- Every par is exact, and the model's count equals par on all 30.
- Every par cut set walks to the exit.
- Histogram: par 0: 1, par 1: 7, par 2: 12, par 3: 9, par 4: 1.

In the table, "uncut" is where Lead's walker goes with no cuts. The
"with par's cuts" column gives Lead's walk in runs and as a multiple of
the optimal walk. "Delay" is the replanning walker's uncut route, in runs.

| daily | uncut | par | steps | with par's cuts | delay |
|---|---|---|---|---|---|
| 1 | loop 76 | 2 | 2098 | 80, 4.35x | 22 |
| 2 | loop 29 | 1 | 29 | 15, 1.78x | 11 |
| 3 | loop 33 | 2 | 693 | 28, 1.57x | 14 |
| 4 | loop 10 | 1 | 10 | 22, 1.22x | 17 |
| 5 | loop 11 | 3 | 6391 | 24, 1.53x | 18 |
| 6 | loop 30 | 3 | 1787 | 24, 1.35x | 14 |
| 7 | loop 8 | 2 | 149 | 55, 3.16x | 19 |
| 8 | loop 55 | 1 | 55 | 35, 2.23x | 18 |
| 9 | loop 64 | 1 | 64 | 34, 2.33x | 14 |
| 10 | loop 51 | 2 | 1035 | 26, 1.94x | 14 |
| 11 | loop 8 | 2 | 134 | 17, 1.75x | 16 |
| 12 | loop 43 | 3 | 26361 | 34, 2.21x | 21 |
| 13 | loop 32 | 2 | 752 | 34, 2.34x | 16 |
| 14 | loop 179 | 1 | 179 | 45, 3.46x | 16 |
| 15 | loop 44 | 2 | 727 | 29, 2.35x | 12 |
| 16 | loop 18 | 2 | 160 | 24, 1.76x | 16 |
| 17 | loop 23 | 3 | 7512 | 34, 2.13x | 14 |
| 18 | exit 61 | 0 | 0 | 61, 2.99x | 22 |
| 19 | loop 35 | 2 | 550 | 33, 1.93x | 17 |
| 20 | loop 43 | 1 | 43 | 34, 2.76x | 19 |
| 21 | loop 17 | 2 | 362 | 22, 1.95x | 18 |
| 22 | loop 18 | 3 | 3012 | 37, 2.87x | 22 |
| 23 | loop 6 | 4 | 74055 | 29, 2.33x | 17 |
| 24 | loop 37 | 3 | 15745 | 18, 1.50x | 20 |
| 25 | loop 8 | 2 | 99 | 32, 2.21x | 13 |
| 26 | loop 56 | 2 | 1926 | 12, 1.24x | 11 |
| 27 | loop 11 | 1 | 11 | 28, 1.52x | 26 |
| 28 | loop 8 | 3 | 626 | 24, 2.06x | 17 |
| 29 | loop 25 | 3 | 17132 | 21, 2.88x | 17 |
| 30 | loop 12 | 3 | 5179 | 44, 2.93x | 21 |

### Keep it in balance probe

Source: `.claude/probes/K114/walker/balance.md` (`balance.ts`, run by a
sonnet helper). Naive fencing against the replanning walker on dailies
1-30, moat radius r, the exit tail protected. Each turn the cutter cuts
one run (or passes), then the walker takes k runs. The uncut route is 17
runs (median). "Fence" is the median fence size. "Walk to ball" is the
runs the walker takes, with no cuts, before it first stands within r
hops of the exit junction.

| k | r | cutter wins | turns, median [min-max] | fence | walk to ball, median [min-max] |
|---|---|---|---|---|---|
| 1 | 0 | 30/30 | 2 [2-3] | 2 | 16 [10-25] |
| 1 | 1 | 30/30 | 4 [1-4] | 4 | 15 [9-24] |
| 1 | 2 | 30/30 | 6.5 [1-8] | 7 | 14 [8-23] |
| 1 | 3 | 30/30 | 10 [2-16] | 11 | 13 [7-22] |
| 2 | 0 | 30/30 | 2 [2-3] | 2 | 16 [10-25] |
| 2 | 1 | 30/30 | 4 [1-4] | 4 | 15 [9-24] |
| 2 | 2 | 29/30 | 6.5 [1-8] | 7 | 14 [8-23] |
| 2 | 3 | 27/30 | 10 [2-16] | 11 | 13 [7-22] |

- The walker's wins: daily 11 at r = 2, and dailies 9, 17 and 27 at
  r = 3.
- Extra radii 4 to 7: at k = 1 the cutter wins 30, 30, 29 and 28. At
  k = 2 it wins 26, 18, 14 and 12.
- R.3.9's "moat 3 tips it to the walker" does not reproduce. The doc's
  moat 2 and 3 match r = 3 and 4 by counts, so the moat's definition is
  open.
- At r = 1, dailies 1, 12, 23, 28 and 29 have a one-run fence: a bridge.

### Page results

Driver: `.claude/probes/K114/walker/page/walker_page.mjs <desktop|phone>
<lead|delay> [seed]`. It uses real taps (mouse on desktop 1400x900;
touch at 411x753, dsf 2.625) on `?7&am=instant&ct=lead|delay`. All four
runs pass on the rebased build, with 0 page errors: Lead 20/20 on
desktop and on phone (with the stars), Delay 12/12 on both. JSON is in
`page/out/`, and the pre-rebase runs, which also passed, are in
`page/out/pre_rebase/`.

**Lead (seed 7)**
- Par is 1, cutting run 196.
- Uncut, the route loops (33 states). Go walks it to the repeat, and
  "It's going in circles." puts the walker back at the start with the
  cuts kept.
- A tap cuts 196, and the route then runs 22 runs to the exit. The HUD
  reads `cuts 1 · par 1`.
- Undo and the cut again both work. Go walks the 22 runs to `mexit_b`.
- The banner shows ★★★ and its rows end `cuts 1 · par 1`. The stars'
  popover gives Lead's rules, then "You led the walker out with 1 cut;
  par is 1." The share reads `Knotmaze 🧶 ★★★ · ✂️ 1, par 1`.
- The buttons hide under the banner and come back after ×. Reset then
  gives a fresh solve (no cuts, head `mentr_b`).

**Delay (seed 7)**
- The HUD starts at `cuts 0 walker 0 · shortest 14`.
- The turns:
  - turn 1 cuts 220, then the walker takes a run;
  - turn 2 is a pass;
  - turn 3 cuts 211.
- The HUD then reads `cuts 2 walker 3 · shortest 14`.
- Cutting run 223 is refused with the toast, and nothing changes.
- Undo takes back the last cut and its run.
- Passes finish at 18 runs. The banner shows `walker 18 · shortest 14`,
  and the share reads `🐢 18 runs (it wanted 14)`.

Stills are in `.claude/probes/K114/walker/shots/`, named
`walker_<desktop|phone>_lead_<start|walking|planned|win>.png` and
`walker_<desktop|phone>_delay_<start|turns|refused|win>.png`.

### Residuals

- The walker's own glow on its dot is not built; only the route rims
  show.
- The move pad shows in walker modes, but moves are refused there.
- An upper-bound par shows as a plain par (call 6).
- No real phone pass was run; that was out of scope.
- Cuts with the minotaur or the fire are K688.
- From the balance probe:
  - its cutter keeps cutting after the walker is inside the fence;
  - bridge dailies (a one-run fence at r = 1) make Keep it in trivial
    there.
- Probe note: three cold pages at once overran the K307 shader warm-up.
  The driver waits 45 s for the controller, and its runs start 20 s
  apart.

### Handle

- owner: nobody since 2026-10-21 00:01 (agent `a0437651435d16c14` of
  claude session 91b19e11-7759-4638-ba60-4705b011b94f, stage done).
- branch: `worktree-agent-a0437651435d16c14`, worktree
  `.claude/worktrees/agent-a0437651435d16c14`. Last commit: this
  Handoff, on top of `8dc55c8` (unpushed).
- evidence: `.claude/probes/K114/walker/` in the worktree (untracked):
  - `par_census.md`, `balance.md`;
  - `page/walker_page.mjs`, `page/out/`, `page/logs/`;
  - `shots/`.
- next:
  - Levi's calls 1-6 and the phone question;
  - the walker's dot glow;
  - a phone pass;
  - merge, resolving K137 s3a's rows.
- brief: `docs/design/K114_walker.md`.
- env: serve the worktree with `node node_modules\vite\bin\vite.js
  --config .claude\probes\K114\walker\page\vite.private-cache.config.ts
  --port 5124 --strictPort --host 127.0.0.1`. Then run `node
  .claude\probes\K114\walker\page\walker_page.mjs <desktop|phone>
  <lead|delay> 7`.

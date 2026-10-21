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
    stage 1's `replay(actions)` rebuilds everything.
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
  - main.ts's tap routing in walker modes and the walker's frame;
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

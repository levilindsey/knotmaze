# K114 cut: the cut verb

Ledger: K114 (round 2, shortlist item 2, stage 1). One stage, opus, 2 h
cap. Design: `docs/design/K80_gameplay_additions.md` section R. Grep it
for "R.4.1 Cutting as a verb", "R.4.3 The auto-walker", "R.3.9 The
auto-solver inversion" and R.0's "Decisions for you (round 2)".

## Levi's decisions (round 2, 2026-10-13)

- 3: a cut deletes the whole run. A junction left with two runs stops
  being a decision, and a move through it carries on (contraction).
- 4: cuts are render-only plus walk-graph cuts. The physics is untouched.
- 5: a scissors button arms the next tap.
- 6: cuts against monsters heal (R.3.5). Not this stage.
- 9: all of round 2 goes in free play first.

This stage builds the verb. The next stage builds the auto-walker and
Lead the walker on top of it (R.4.3, R.3.9). Keep the cut set and the
distances pure functions of (walk graph, cut runs), so a walker can read
them.

## Decided

- **The param.** `cut` (off | on), default off.
  - Append it after the last param on master (today codec index 191,
    after `collapse`).
  - It is an enum so that the walker stage can append its modes.
  - It is off by default, so the dailies, the golden pins, K87 and byte
    identity do not move. Re-freeze only the key-order pin in
    `test/ui/param_codec.test.ts`.
- **Scope.** Cutting works only while these are all off: fragile,
  collapse, par, the minotaur (both clocks) and the fire.
  - Otherwise the scissors stay hidden and the controller ignores cuts.
    setRules decides it, the way collapse overrides fragile.
  - A cut game is never a daily, since cut is not daily-exempt.
- **A cut is an action, not a move.** One player tap is one action: a
  move or a cut.
  - The controller keeps a typed action log, and replay(actions)
    rebuilds the state.
  - Undo pops one action: a whole contracted move, or one cut (the run
    comes back whole).
  - `taps` stays every run walked, in order, the carried-on runs of a
    contracted move included; the move log does the same. The fog, the
    trail, walkedDist, the stars, the share grid and the 43 other
    `.taps` reads then keep working unchanged.
  - With cut off, actions and taps are one to one, and every existing
    suite stays green.
- **What can be cut.** Any maze run except the start tail, the exit tail
  and K115 title runs. A dead-end stub can be cut, which prunes a dead
  end.
- **Refused cuts.**
  - A cut that leaves no route from the head to the exit is refused:
    `runsToExit` with the cut runs blocked.
  - It shows a short toast and plays a dull sound. Nothing changes and
    nothing is logged.
  - A tap on a run that is already cut, or on empty space, disarms.
- **Contraction.** It applies only at a junction that had three or more
  runs and now has two live runs.
  - A move arriving there carries on along the other live run, and on
    through every such junction. Advances and backtracks alike.
  - It stops at a junction with three or more live runs, an END, the
    exit, or a run already taken in this move (no loops).
  - A vertex that had two runs to begin with (the K115 title seam) keeps
    today's behaviour.
  - The dot animates the chain as queued moves.
- **Distances.**
  - Export a walk-distance Dijkstra that takes a removed-run set
    (`walkDistances` in `walk_graph.ts` takes none today).
  - Recompute the distances to the exit after every cut and every Undo,
    so the g/d/b move log and the hints read against the current maze.
  - Stars keep the uncut optimal, since cutting only lengthens your own
    route. Say in the Handoff whether that reads right.
- **The gesture.**
  - A scissors button arms the next tap; Esc or a second press disarms.
    A key arms it too: pick a free one (`src/app/input_keys.ts`).
  - While armed, a cursor or highlight shows it, and the pick
    (`targetAt`) can target any live run, not only the head's arms.
  - Place the button so it works at 411x753 and on desktop. Keep it
    clear of the HUD, the mode badge, the move pad (K120) and the edge
    indicators (K73).
- **The look.** Reuse K137's gone thread: the `syncBroken` spans, the
  explore programs, and shader_warmup's wave 1 when cut is on.
  - Check in stills that a cut over-thread leaves no gap in the thread
    under it, and that the junction fan drops the cut arm (R.4.1's render
    details 2 and 3). If the gone look misses either, fix it or report
    it.
  - Sound: K137's snap (the run's pitch an octave up).
  - The pluck-overlay snap-back flourish only if time is left.
- **The HUD and the share.**
  - A "cuts N" row while cut is on, in the HUD and the win banner, with
    its help line in `maze_stats.ts`.
  - " · ✂️ N" in the share title when N > 0.

## Your calls

Decide each one and build your recommendation. List each in the Handoff
as a numbered call for Levi, with the alternatives.

1. Where the scissors button sits, and its key.
2. A cut tapped mid-move: apply it at once (the run under the dot uses
   syncBroken's swept-stretch rule), or queue it until the dot arrives.
3. Whether a cut counts toward anything (strokes, efficiency) beyond the
   cuts row.

## Steps

1. **Read narrowly** (Grep -n, then Read with offset/limit):
   - `.claude/rules/gameplay-mechanisms.md` (fragile, collapse);
   - `src/game/fragile.ts`;
   - the controller's setRules, reset, replay, choices and tapEdge;
   - `walk_graph.ts`'s walkDistances and runsToExit;
   - `fabric_maze_renderer.ts`'s syncBroken and targetAt;
   - main.ts's undoMove and the tap routing.
2. **Design.** Append a short "Design" section to this brief: the action
   log, the contraction, the calls. Commit.
3. **The pure module.** Write `src/game/cut.ts` and
   `test/game/cut.test.ts`.
   - The module holds the cuttable test, the refusal, the contraction
     step and the distances.
   - Test on hand-built graphs plus a few real mazes. K137's sim kit
     builds real mazes in node: `.claude/probes/K137/k137_lib.ts` in the
     main checkout.
4. **The controller:** the action log, cut(), replay(actions), the
   contraction in tapEdge, and the distance recompute. Test that:
   - a contracted move undone returns to the junction it started from;
   - a cut undone restores the run and the distances;
   - cut off changes nothing.
5. **Wire it:**
   - the param, and the panel row in the Game folder beside collapse;
   - the scissors button and its key;
   - the pick, the look and the sound;
   - the HUD row, the banner row and the share tag;
   - a probe hook, `__knotFabric().cut` (the mode, the cut runs,
     armed).
6. **Verify.**
   - `npm test` and `npm run build` pass, and no pin moves except the
     key-order pin.
   - **The page.** Write a driver modelled on
     `.claude/probes/K139/page/k139_page.mjs` in the main checkout. With
     real taps, on desktop and at 411x753, it:
     - arms the scissors and cuts a run;
     - tries a refused cut;
     - walks a contracted move with one tap;
     - undoes each;
     - finishes, and checks the cuts row and the share tag.

     Take stills of a cut crossing and a cut junction arm.
7. **Lore.**
   - A "Cut" section in `.claude/rules/gameplay-mechanisms.md`;
   - the param's index line in `gameplay-links.md`;
   - the panel row in `gameplay-panel.md`.

## Constraints

- **Agents beside you.** Stay out of their files. If a change seems to
  need one, stop and report.

  | Agent | Files |
  |---|---|
  | K324 stage 2 | the TELE paint item, `telegraph_route.ts`, the telegraph code and `syncMinotaur` in `fabric_maze_renderer.ts`, `src/game/minotaur.ts`, main.ts's minotaur lines |
  | K620 | the section paint for glyph roots (`paint_math.ts`, `paint_glsl.ts`), `glyph_graph.ts`'s taper fields, `ribbon_renderer.ts`'s taper input |

- **Yours:**
  - `cut.ts` and its test;
  - `fabric_controller.ts`, `walk_graph.ts`, `route_plan.ts`,
    `rule_loss.ts`;
  - `maze_hud.ts`, `maze_stats.ts`, `share_text.ts`;
  - in `fabric_maze_renderer.ts`, syncBroken and the pick;
  - main.ts's tap routing and undoMove, and `input_keys.ts`;
  - a new `src/ui/` file for the button, if you want one;
  - your param and panel rows, and the lore files above.
- **Out of scope:**
  - the walker;
  - healing cuts, and cuts with the minotaur or the fire (R.3.5, R.5.2);
  - saved attempts and the store version (free play only);
  - a real phone pass.
- **Locks and probes.**
  - Probes go in `.claude/probes/K114/cut/` in your worktree
    (untracked).
  - Never use `--virtual-time-budget`.
  - Give every Chrome a fresh temp profile.
  - Use ports 5114-5117.
  - Take no performance measurements.
- **Rebase** onto master before your final report, and check that
  `npm test` passes. If another param landed first, append `cut` after
  it and re-freeze the pin.

## Stop rule

Stop when the stage is done or at the 2 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone. Commit
WIP to your branch at every milestone, green or not, and never push.

A compaction is not a stop: after one, re-read this brief and `git log`
before going on. Keep reads narrow (Grep -n, then Read with
offset/limit). Any helper runs on sonnet with a 1 h cap under this same
rule.

When you stop:
- commit WIP;
- append a "Handoff" section to this brief: what landed, the calls, the
  page results, the residuals and the handle fields;
- report.

End your report with the item's handle fields and a `Ledger items` list.

## Working notes

- Agent `K114 cut` of claude session 91b19e11. Started 2026-10-20
  9:09 PM; the 2 h cap is 11:09 PM. Branch
  `worktree-agent-a1cdbc33c6dba02ff` (worktree
  `.claude/worktrees/agent-a1cdbc33c6dba02ff`); node_modules is a
  junction (delete it with `(Get-Item node_modules).Delete()` first).
- Probes (untracked): `.claude/probes/K114/cut/` holds copies of K139's
  `k137_lib.ts`, `vite.node.config.mjs` and `page/` (k139_page.mjs,
  run_page.ps1, vite.private-cache.config.ts). Ports 5114-5117.
- Where things are: the controller's setRules / reset / replay / tapEdge
  and `onShortestRoute` (the only `walk.distToExit` read in game code);
  `walk_graph.ts` `walkDistances` (no removed set yet) and `runsToExit`
  (takes `blocked`); the renderer's `syncBroken` (reads `fragileOn` and
  `brokenRuns()`), `targetAt` (skips `controller.broken`), `edgeAt`;
  main.ts `undoMove` (replays `taps.slice(0, -1)`; only the Stranded
  banner calls it today), `handleFabricTap`, `moveAlong`, the K480 route
  (`routeStep` on each arrival, from keyStep); `input_keys.ts` keydown.

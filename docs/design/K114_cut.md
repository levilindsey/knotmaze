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

## Design

- **Cut set and actions.** The controller holds `cuts` (run ids) and
  `actions` (`{kind: "move", run}` per player move, its first run;
  `{kind: "cut", run}` per cut). `taps` and the move log stay one entry
  per run walked. With cut off every tapEdge logs one move action, so
  actions and taps are one to one.
- **Gone runs.** `broken(eid)` is fragile-broken or cut, so choices,
  tapEdge's reject, the pick and planRoute skip cut runs with no new
  branch. `brokenRuns()` stays fragile-only (the snapped count);
  `cutRuns()` lists the cuts, and syncBroken draws both.
- **Contraction, lazily.** tapEdge(r) still applies one run. In a cut
  game a move's first run sets `carry`, the rest of
  `carryChain(walk, cuts, from, r)` (`game/cut.ts`); each later tapEdge
  must take `carry[0]` (any other run is a reject) and consumes it with
  no new action. main drives the carry on each dot arrival, ahead of the
  K480 route and the keys, one run per moveAlong, so the renderer's
  per-run animation is unchanged. `replayActions(actions)`: reset, then
  each cut is cut() and each move is tapEdge(run) plus its carry; any
  failure resets and returns false. Undo replays the actions minus the
  last, then runs undoMove's restore sequence.
- **Distances.** `distToExit` becomes a controller field:
  `walk.distToExit` with no cuts, else `distancesToExit(walk, cuts)`,
  recomputed on every cut and on reset. onShortestRoute reads it. Stars
  keep `walk.optimalLength`.
- **Scope.** fabricRulesOf passes `cut` for the classic game mode only;
  setRules keeps it only with fragile, par and collapse off and no fire.
- **Calls** (Handoff has the alternatives):
  1. The scissors: a round button, with X as its key (Esc or a second
     press disarms), plus an Undo button and Z while cut is on (Undo
     exists only in the Stranded banner today). Placement: see Handoff.
  2. A cut tapped mid-move (the dot travelling, a carry included) waits
     until the move ends: one pending slot, the latest tap wins. The
     controller refuses cut() while a carry is pending.
  3. Cuts count toward nothing but the cuts row.

## Handoff

Agent `K114 cut` of claude session 91b19e11, 2026-10-20, 9:09 PM to
about 10:20 PM: the stage is done, inside the 2 h cap. Branch
`worktree-agent-a1cdbc33c6dba02ff`, rebased on master `e642df6`,
unpushed.

### What landed

- `src/game/cut.ts` (pure, the spec in its header): `cuttable`,
  `cutStrands`, `cutVerdict`, `runEnds`, `contracted`, `carryChain`,
  `distancesToExit`, the `FabricAction` / `CutResult` / `CutMode` types.
  `walk_graph.ts` `walkDistances` takes a removed set.
- `FabricMazeController`: `cut(eid)` ("cut" | "refused" | "invalid"),
  `cutOn`, `cutMode`, `cutRuns()`, `cutCount`, the action log `actions`,
  `carry`, `replayActions(actions)`, and `distToExit` as a live field;
  `broken(eid)` includes cut runs, so choices, the pick and planRoute skip
  them. With the cut off nothing changes: actions and taps are one to one
  and the distances are the walk graph's own.
- The param `cut` (`ct`: off | on, default off), appended at codec index
  191 after collapse (CODEC_VERSION stays 8); the "Cut" row in the Game
  folder after Collapse (classic game only, restarts the solve);
  fabricRulesOf and setRules keep it to the classic game with fragile, par
  and collapse off; shader warmup puts the explore variants in wave 1.
- `src/ui/cut_buttons.ts` and main.ts: the scissors and Undo buttons
  (bottom left), X / Esc / U (`input_keys.ts`), the armed tap (`cutTap`),
  the lazy carry (`carryStep`, first in keyStep), the waiting cut,
  `applyCut` (snap sound; a refusal's toast and dull pluck), Undo through
  `replayActions`. `src/app/input_pointer.ts`: the armed hover glow
  (`FabricMazeRenderer.cutAt`, mouse) under a crosshair, and a touch press
  taken as a tap while armed. syncBroken draws the cut runs as K137's gone
  thread. The HUD and banner "cuts N" row (with its STATS line) and the
  share title's ` · ✂️ N`. Probe hooks: `__knotFabric().cut`, `.runPoint`,
  `.toWorld`; choices' cost reads the live distances.
- Tests: `test/game/cut.test.ts` (the rules, contraction with self-loops
  and two-run vertices, refusals, distances, the action log, replay and
  the carry), `test/ui/cut_buttons.test.ts`, share_text and maze_hud rows,
  and the codec pins (param_codec's table pin, url_codec's defaults and
  OVERRIDE_KEYS `ct`). The golden snapshot, the golden dailies and K87 did
  not move.
- Lore: gameplay-mechanisms.md "The cut (K114)", gameplay-links.md CUT
  PARAM, gameplay-panel.md CUT ROW, the lore_index row.
- Outside the "Yours" list, for the tap routing K5 moved out of main.ts:
  `input_pointer.ts`, `frame_loop.ts` (cutTick beside the move pad),
  `probe_hooks.ts`, `shader_warmup.ts`. None of K324 stage 2's or K620's
  files.

### Calls for Levi

1. **The scissors' place and keys.** Built: two round buttons at the
   bottom left (the scissors, then Undo), styled like K120's move pad at
   the bottom right and above the build stamp; X arms or disarms, Esc
   disarms, U undoes. They show beside the desktop's side panel (it leaves
   that corner clear) and hide under a phone's settings sheet.
   Alternatives: top left under the HUD (crowds its stat rows), beside the
   hamburger (crowds the mode badge on a phone), or inside the move pad
   (it is a viewer preference and hides with the panel). The Design
   section above says Z for Undo: built U, because the keys go by the
   typed letter and AZERTY's Z key is WASD's up (KeyW), so Z would move
   and undo at once; Ctrl+Z is the other option.
2. **A cut tapped mid-move.** Built: it waits (one `pendingCut` slot, the
   latest tap wins) and lands when the move ends, its carried runs
   included; the scissors go down at the tap. Alternative: cut at once,
   with the run under the dot cut by syncBroken's swept-stretch rule;
   that needs cut() to accept a run the move is on or about to carry on
   along (it refuses while a carry is pending, since the chain was
   computed under the old cuts).
3. **What a cut counts toward.** Built: only the cuts row (HUD, banner)
   and the share tag. The stars keep the uncut optimal
   (`walk.optimalLength`), efficiency reads the route you ended on, and
   par is off with the cut on. Alternatives: each cut costs strokes (if
   par and the cut ever combine), cuts cap the stars (as a catch does), or
   the stars rate against the cut maze's optimal (cutting would then make
   three stars easier).

Smaller calls, also built: a refused cut and an uncuttable run keep the
scissors armed (a tap on empty space or a cut run puts them down); the
armed glow is mouse-only (touch has no hover); the Undo button and U
work only with the cut on (the Stranded banner keeps its own Undo).

### For the walker stage (`docs/design/K114_walker.md`)

- Its "stage 1's `replay(actions)`" is
  `FabricMazeController.replayActions(actions)`; `replay(taps)` is still
  K47's tap replay. A failed replay resets and returns false.
- `carryChain` and `contracted` read only the walk graph and the cut set;
  `carry` is set only by tapEdge with cuts present.
- `distancesToExit(walk, cuts)` returns the walk graph's own map while
  nothing is cut: never mutate it.

### Page results

- `npm test` after the rebase: 125 files and 1778 tests passed (1 skipped), tsc clean. `npm run build`: passes.
- `.claude/probes/K114/cut/page/cut_page.mjs desktop 7`: 22 checks, 0
  FAIL; `phone 7` (411x753, touch taps, its own browser): 20 checks, 0
  FAIL. Each: the buttons shown and clear of the chrome, Undo disabled
  before any action; arm by the button (desktop: X, Esc, X too, and the
  crosshair); an empty-space tap disarms; run 220 (a junction arm by the
  entrance) cut, the HUD's "cuts 1", Undo live, no longer a choice; Undo
  (button; desktop: U too) puts it back; the contracted move [0, 221] to
  node_14 with one tap, its Undo (the whole move, the cut stays) and the
  move again; a refused cut at dead end mdead4_b's stub 15 (toast, still
  armed; a second press disarms); a cut tapped mid-move waits (pending
  while the dot moves) and lands; solved by real taps in 31 taps; the
  banner's "cuts 2", the buttons hidden after the finish, the share title
  "Knotmaze 🧶 ★★☆ · ✂️ 2". Stills (`shots/`): `cut_<vp>_arm_before` /
  `_after` (the cut junction arm), `_crossing_before` / `_after` (the cut
  run where it crossed run 197), `_cut_full`, `_carried`, `_refused`,
  `_banner`. The cut run vanishes as K137's gone thread, and the junction
  it left draws with its two remaining arms.
- No performance measurements (the perf lock was K620's).

### Residuals

- The refusal toast (bottom center, pointer-events none) overlaps the
  Undo button on a phone for its 2.5 s.
- A long carried chain animates run by run (one moveAlong each, no pause
  between), not as one glide.
- K120's move pad still hides whenever the panel is open, while the
  scissors show beside the desktop's side panel (two rules side by side).
- The driver's `panelOpen` diagnostic reads true on a phone (it measures
  the wrapper, not `panel.isOpen()`); probe-only.

### Handle fields

- owner: nobody since 2026-10-20 about 10:20 PM (agent `K114 cut` of
  claude session 91b19e11-7759-4638-ba60-4705b011b94f; done)
- branch: `worktree-agent-a1cdbc33c6dba02ff`, worktree
  `.claude/worktrees/agent-a1cdbc33c6dba02ff`; last commit: this
  handoff's (unpushed)
- evidence: `.claude/probes/K114/cut/` (`page/cut_page.mjs`, `out/`,
  `shots/`, `npm_test_rebased.log`, `build_rebased.log`)
- next: merge (agent_merge.ps1), then Levi's calls 1-3
- brief: `docs/design/K114_cut.md`
- env: the driver's dev server,
  `.claude/probes/K114/cut/page/vite.private-cache.config.ts` on port 5114
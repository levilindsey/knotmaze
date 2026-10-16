# K74 stage 3: the trap-zone finish, H1's exit guard

One build stage, Opus, two-hour cap. Ports 5930-5939; probes in
`.claude/probes/K74/stage3/`. Read first: `K74.md` 72-116, its "Stage 2
handoff" (595-825) and `K74_maze_design.md` 146-163 (decisions 1-2),
550-573 (options), 588-635 (4.2 taper, 4.3 corridor; 4.4-4.5 are stage
4's, though K74.md 104 says "doc 4.2-4.5"). Levi on decision 2
(`levi_notes_2026-10-13.md` 141): "All of these sound good. Can we
implement each, and have parameters to control which is used and/or to
what degree?" Build at neutral values first: the pins hold until item 10.

## What is there (checked on master 21d701e)

- `src/core/maze_plan.ts`: MazeParams 69, defaults 119, MazePlan 149 (no
  exit point, radius or corridor; `hCutShare` only when > 0, 171).
  pickFarthest 651: one `spacing` floor; a candidate under it is dropped
  for good (K87). repairTailRoute 1010 (K109) and joinOrphanPieces 1143
  (K110) skip used edges. placeLongTails 1318: edgeLen 1335, walkFlank
  1352, `room` 1396. planMaze 1463: the exit 1494-1508, clearOf 1511
  (hypot2 from the anchor target), corner trims 1530-1546, span order
  1555-1571, tails 1705-1733, choices 1735, K110's joins 1813.
- `maze_apply.ts`: applyMazeCuts 330 runs H1 last (364-366); fuseHCuts
  627 protects only crossings on END runs up to their first junction
  (639-655, refused at 779). Inferred: a corridor past a spanning
  junction, and the clearance disc, are unprotected.
- Plumbing: `scene_graph.ts` SceneParams 16-34; `worker_host.ts`
  sceneParamsOf 110 copies keys by hand, and no test checks it copies
  all (inferred: a missed key is a fingerprint mismatch, then the
  fallback); `url_state.ts` (follow `hCutShare`: field 303, default 642,
  clamp 971, parse 1180); `param_codec.ts` maze rows (lines 167-168,
  183, 240), the last row 139 (line 272), CODEC_VERSION 6 (279);
  `daily_link.ts` MAZE_PARAM_KEYS 74; the Maze folder (`tweakpane_panel.ts`
  718-780, hidden 1967-1973). Free keys: `xcr`, `xfl`, `xtr`, `xtk`.
- Pins (`test/core/maze_plan_identity.test.ts`): PRE_K74 40 feeds the
  K87 pin (147); K74_PLANS 253; K74_WALKS_H0 312 (today's defaults at
  share 0); K74_WALKS_DEFAULT 355. The golden dailies
  (`test/ui/daily_link.test.ts` 92-116); maze_solvable, maze_reachable.
- The prototype (untracked in the main checkout's `.claude/probes/K74/`;
  copy what you use): `proto_plan_src.ts` is maze_plan at 303d335, before
  K87 and K108-K110 (Math.hypot). ProtoOpts 730-767; the flank 910-936
  (the exit trim waits, 838-841; `L = opts.exitCorridor ?? 24` is 0 with
  the corridor at 0); the corridor 938-958, last in the span orders
  (966-978), claimed after the backbone (1048-1056); the taper 1184-1198
  (choices, 4-ways). Its F and H1 are not stages 1-2's. Recipes:
  `out/spec_final.json`, `out/spec_flank.json`; stage 2's tools: `stage2/`.

## The work

1. **A pure refactor:** edgeLen and walkFlank out of placeLongTails, to
   share with the corridor. Check: every pin holds, byte for byte.
2. **The exit taper** (`xtr` radius R, `xtk` strength K; 0 is off): a
   choice's or 4-way's floor is spacing x (1 + K x max(0, 1 - d/R)), d
   its points' least hypot2 distance to the exit point. Inferred: K87's
   incremental pick holds (each floor is fixed; a candidate's nearest
   distance only falls). Check: a unit test; R or K at 0, identical plans.
3. **The exit flank** (`xfl`: stub, today's | away | near): the exit
   trim waits for it; away keeps the free flank whose nodes within L
   reach farthest from the exit point, near the other; L is the corridor,
   or 24 u without one; squared distances, as in `room`. Check: unit tests.
4. **The corridor** (`xcr`, arc length in u; 0 is off): the kept flank,
   or both untrimmed, to arc L through junctions. Spanning, K109's repair
   (1639) and K110's joins rank its sites last instead of skipping them:
   the backbone may use it when nothing else connects (inferred: a claim
   in usedEdges would bar the joins). Claim it after the repair, before
   the tails: choices, 4-ways and dead ends keep off. Check: maze_solvable,
   maze_reachable; K110's 3780 designs: exit moves, corridor junctions.
5. **H1's exit guard** (K278 (a)): the plan carries the exit's anchor
   target, clearance and corridor crossings, each only when H1 runs and it
   is non-zero; fuseHCuts refuses an X inside the clearance (clearOf's
   measure) or on the corridor. Check: a test each way; on dailies 1-80
   `stage2/clearance.ts` finds 0 fused inside the radius (36 today).
6. **The params:** MazeParams, SceneParams, sceneParamsOf and a test
   that it copies every key, url_state.ts, four codec rows after 139,
   MAZE_PARAM_KEYS, Maze rows (hidden as exitClearance's); PRE_K74 gets
   the neutral values. Check: pins hold; links round-trip.
7. **Port against the prototype:** B, C1-C3 and the flank recipes on
   dailies 1-80, dead ends off, share 0. Inferred: today's plan is
   303d335's there unless K109 or K110 fire, and in Node hypot2 has
   Math.hypot's bits. Check: 0 mismatches outside a named K109/K110 list.
8. **Measure** with stage 1's tails and H1 at 1, dailies 1-240: today,
   B, C1-C3, C3 + taper, corridors 16/24/32 (away, near): decision 1's
   bar (a band), the heading walker, the route, near misses, junctions in
   the radius (classify stage 2's 135 at share 0: corner trims, spanning,
   K109, K110), generation time (perf lock), sleep (`stage2/phys.ts`).
9. **K284:** comments naming Pullen where the corridor follows his "near
   misses at the goal", and Pullen plus Zhao and Marquez 2013 at
   placeLongTails (long blind alleys); then RESEARCH entries (credits.ts
   315), citing only what a record you open confirms. Check: test/notices.
10. **Defaults, pins, lore.** Set the defaults. Re-freeze and name
    K74_PLANS, K74_WALKS_H0 (if a corridor, flank or taper default
    moves), K74_WALKS_DEFAULT, the golden dailies, the codec table pin
    and url_codec.test.ts's defaults; the K87 pin and the knot golden hold.
    `npm test`, `npm run build`; a before/after sheet of three finishes.
    Lore: `generation-plan.md`, `gameplay-links.md`, `gameplay-panel.md`.

## Questions (take the recommendation unless the coordinator says otherwise)

1. **The defaults.** Rec: decision 2 (c) in C3's shape: corridor 24, away
   flank, exitClearance 12; the taper only if item 8 shows it adds. C3
   read 3.80x and 9% within 1.5x, P3 (C3 plus the prototype's tails and
   H1) 2.92x and 21%: stage 4's search may be what meets the bar. Step
   the corridor down if a design stops sleeping; neutral is the fallback.
2. **Names and ranges.** Rec: exitCorridor `xcr` [0, 32] step 1,
   exitFlank `xfl`, exitTaperRadius `xtr` [0, 32], exitTaperStrength
   `xtk` [0, 2] step 0.1; maze params, never daily-exempt.
3. **The guard.** Rec: refuse inside the clearance and on the corridor,
   with no param of its own: exitClearance 0 and corridor 0 turn it off.
4. **The corridor's cap.** Rec: 32, since the design reads 36 u or more
   as a second, unmarked tail (4.3); one C3 maze slept only at 5.8 s.
5. **Deeper traps** (dead-end branches, `K80_gameplay_additions.md`
   2194-2195): out of scope; K80's stage 3a brief does not settle them.

## Order and neighbors

- K323 Stage A (codec 7, renumbering from row 34), K80 turns 3a and K114
  stage 2 also append after row 139: the later one rebases and re-freezes.
- K7 stage 7 moves the scene params into the Worker's `name`; item 6's
  test guards it. K326 stage A's maze golden (`byte_identity.test.ts`)
  moves if it lands first: name it.
- Out of scope: stage 4 (D, E), the prototype's entrance taper, K278 (d)
  (dense heart and ring cut no H) and (e) (H1 can shorten the route).

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5930-5939, each vite server with a private cacheDir
  (`probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** each instance gets its own `--user-data-dir` in your probes
  folder and the off-screen flags; delete it when done (K161).
- **Files:** probes, logs and notes go in your worktree's
  `.claude/probes/K74/stage3/` (untracked; the coordinator copies them).
- **Timing:** hold the perf lock to time generation; no phone needed.

## Process

- **One stage.** `Get-Date` at the start and at each milestone; commit
  WIP on your branch at every milestone, never push; don't edit
  `LEDGER.md`. Helpers, if any: `model: sonnet`, this stop rule, 1 h cap.
- **The stop:** items 1-10 done and verified, or the two-hour cap,
  whichever comes first. Neither a compaction nor context size is a
  stop; after one, re-read this brief and `git log`. At the stop, commit
  WIP, append a "Stage 3 handoff" section here, commit it and report.
- **The final report covers:** what changed and where, and the tests that
  pin it; your answers and other calls; the port, bar, clearance and
  sleep tables; the sheet; the test count, the build and the pins that
  moved; the lore; a `Ledger items` list; and the handle fields (branch,
  last commit, evidence and next).

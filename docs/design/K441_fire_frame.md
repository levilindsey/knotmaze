# K441: the real-time fire's frame cost, profiled on post-K409 code

Ledger: K441, the next step of K114's handle. One stage, sonnet, 1 h cap.
Build on master. Measure first; build only an invisible fix, and only in
the files named below.

## The call

K114's handle (Levi took round 2's recs; the burn race is Levi's first
round-2 prototype) says: "next: K441's profile (K461 done: `rt_page.mjs`
passes `fsr` / `fdr`)". K441 itself, from the ledger: "The real-time
fire's frame cost (K114 s2 item 6): 0.6-1.2 ms more a frame than turn
(drawFire's re-declare 0.6, HUD writes 0.1, 0.5 unattributed). CPU-profile
a turn and a realtime stand at one burnt share (K461 first), then decide a
re-declare throttle."

## Where it stands

- **The stage 2 numbers** are `docs/design/K114_stage2.md`, item 6 and
  "The attribution run":
  - drawFire's re-declare costs about 0.6 ms (0.9 at 4x CPU throttling),
    and the HUD writes about 0.1;
  - about 0.5 ms (1.5 at 4x) is unattributed;
  - it was not a same-burnt-share comparison: the turn stand sat at L
    18.7 and realtime ran L from 25 to 73;
  - no throttle was added, because one "would recover at most drawFire's
    share and would step the front".
- **K409 has since rebuilt the fire look** (6b9eb8f..3231d59: world-unit
  fronts, the Gone ember ahead of the cut, the band kept). Every number
  above predates it, so measure again before deciding anything.
- **Why realtime pays every frame** (master,
  `src/render/fabric_maze_renderer.ts`):
  - `drawFire` (:1760) builds a key from L (:1782). Under the real-time
    clock L is `controller.fireNow`, which moves every frame. A turn
    stand keeps the key and returns early (:1785), running only
    `tickFireFx`.
  - On a new key, drawFire rebuilds every edge's spans and fronts, then
    calls `setBurn` (:2001). That calls `syncExplore` (:3265), whose
    burning branch builds `burnOnlyPieces` (:2027) for every chain and
    re-declares them through `ribbons.setExplore` (:3274).
  - main.ts advances the clock at :1717 and reads L at :1728.
- **The tools** are in the main checkout's `.claude/probes/K114/stage2/`:
  `perf_attr.ps1`, `perf_batch.ps1`, `burn_page.mjs`, and the old results
  in `out_attr/` and `out_perf/`. Copy what you need into
  `.claude/probes/K441/`.
  - `rt_page.mjs` takes `CLOCK=turn|realtime` (the `fck` key). Its
    `EXTRA` defaults to the realtime pair `&fsr=0.3&fdr=40` (K461).
    `fsp` / `fdl` set only the turn pair.
  - Its query is `?<seed>&am=instant&fi=fuse&fck=<clock>` plus `EXTRA`.

## Steps

1. **Same-share stands.**
   - Pick one burnt share, for example L about 40.
   - Turn: walk to L about 40 and stand there.
   - Realtime: stand still while the fire passes that L. Use a window
     short enough that the burnt share stays close, for example L from
     35 to 45.
2. **Frame cost.** For each clock, record the median and p90 frame time
   on desktop and at 4x CPU throttling, under the perf lock. Two rounds.
3. **The profile.**
   - Take a CPU profile (Chrome's Profiler domain) over the same windows.
   - Attribute the difference: drawFire's own rebuild, `setBurn`,
     `syncExplore` + `burnOnlyPieces`, `ribbons.setExplore` (the
     re-declare and its uploads), the HUD, main.ts's fire frame, and
     anything else over 0.1 ms.
   - Save the profiles and a `results.md` in `.claude/probes/K441/`.
4. **Decide.**
   - **Build** a fix only when:
     - the cost is redundant work;
     - the fix is invisible: the same output each frame, and a
       same-state A/B at 0 px;
     - it sits in drawFire's own body or main.ts's fire frame lines.

     For example, rebuilding edges whose spans can't have changed, or a
     HUD write of an unchanged string. **Commit.**
   - **Write up, don't build,** a fix that needs `setBurn`, `syncExplore`,
     `burnOnlyPieces`, `ribbon_renderer.ts` or `src/render/ribbon/`. One
     example is a fronts-only update when no span changed. K137 stage 1
     and K525 are editing those files. Put the site, the expected saving
     and a sketch in `results.md` and the handoff. It becomes K441 s2,
     after both merge.
   - **A throttle that steps the front is a look call.** Write its
     numbers and the option in `results.md`, and don't build it.
5. **Verify.** `npm test` and `npm run build` pass, and no pin moves.

## Constraints

- **Agents beside you.** Stay out of their files. If a fix needs one,
  write it up (step 4) instead.

  | Agent | Files |
  |---|---|
  | K137 stage 1 | `fabric_controller.ts`, `fragile.ts`, `par.ts`, `walk_graph.ts`, `maze_hud.ts`, `maze_stats.ts`, `share_text.ts`, `shader_warmup.ts`; in `fabric_maze_renderer.ts`, `syncExplore`, the pick and the `litArms` predicate; main.ts call sites; `__knotFabric` |
  | K525 | `fabric_maze_renderer.ts`'s telegraph (`drawTelegraph*`, its constants, `rimDecl`), `src/render/paint_*.ts`, `ribbon_renderer.ts`, `src/render/ribbon/`, `mino_feedback.ts`, its param row |
  | K324 stage 1, then stage 3 | `src/game/minotaur.ts` and its test, the param files, `undo_stack.ts`, `__knotChase` |
  | K546 stage 1 | `minotaur_turns.ts` and its test, main.ts's catch code |
  | The confetti lane (K336 + K186) | `src/render/confetti*.ts`, main.ts's `throwConfetti` and `showFabricWin`, the param files, `daily_link.ts` |

  - In `fabric_maze_renderer.ts`, keep to drawFire's body and its key.
  - In `main.ts`, keep to the fire's frame lines (about :1717-1728).
  - K442 and K443 are not yours. K442 waits for K137 stage 1, and K443
    is a label in the panel, which rides a later param stage.
- **No params.** This stage appends nothing to the codec.
- **Locks.**
  - Hold the perf lock for every timing. It is
    `$env:TEMP\claude-perf.lock`, one line: the owner, the start time and
    what.
  - Wait for it inside one blocking command. K525 and the confetti lane
    take it too.
  - Label any number taken under load as such.
- **Probes:**
  - Never use `--virtual-time-budget`, and use fresh temp Chrome
    profiles.
  - A bare URL is today's daily, so use the query above.
  - Probes and results go in `.claude/probes/K441/`, untracked.

## Stop rule

Stop when the stage is done or at the 1 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone.

When you stop:
- commit WIP;
- append a "Handoff" section to this doc, with:
  - the attribution table (desktop and 4x);
  - what you fixed and its A/B;
  - K441 s2's site, saving and sketch, if any;
  - the throttle option's numbers, if any;
  - the item's handle fields;
- report.

Never push. A compaction is not a stop: after one, re-read this brief and
`git log` before going on. Run no helpers.

End your report with the item's handle fields and a `Ledger items` list.

## Handoff (K441 agent a14002cf1416cdbd8 of claude session 91b19e11-7759-4638-ba60-4705b011b94f, 2026-10-20, stopped at the 1 h cap)

**Result.** No fix built: nothing passes the stage's rule. The fire chain costs 0.23 ms (x1) and 1.85 ms (x4) more a frame on the realtime clock than on turn, about 1% of a frame, and nearly all of it is in `ExploreGaps.setExplore`, outside this stage's zone (written up as K441 s2 below). One correction to my own first reading, and one measurement owed. Build: master f9eb418, no `src/` change. Evidence, in the worktree and untracked: `.claude/probes/K441/` (`results.md` with every table, `out/` with the per-frame rows and the four `.cpuprofile`s, `k441_page.mjs`, `run_k441.ps1`, `k441_pool.mjs`, `k441_prof.mjs`).

**Load labels.** Every number was taken under the perf lock (19:48:35-19:52:07, mine) on a desktop with its usual background load (Godot editors, TGitCache with one 12.9 s spike in the last item, claude, Code, muse; `out/batch2.log` has the per-item lines). Per-call numbers use `performance.now()` coarsened to about 0.1 ms: below 0.05 ms they are noise.

### The correction (read first)

All six realtime runs stood on a knot that had not slept (`asleep: false`, sim 2.9-3.7 s); all six turn runs stood on a slept one (`asleep: true`, sim 5.0 s). `frame_loop.ts` :770-773 runs `restFrame` (half-rate flow) when asleep and the full tick (`update`, `fabricTick`, `tickPaint`, `rebuildFillets`, `computeGapSlot`) every frame when awake, and a move does not wake the physics. So the realtime-vs-turn tick gap (+10 ms x1: 19.3 vs 9.5-9.9; +60-65 ms x4: 110-114 vs 46.5-47.8) is, from the dispatch code, the awake path against the rest path, plus plucks still decaying after the driver's last move (tickPlucks 0.92 vs 0.35 ms x1, 15.0 vs 1.6 x4). It says nothing about the fire clock. **Observed:** the stamps and the dispatch. **Inferred, untested:** that the gap is that path. The claim I first drew (the moving L sends every frame down the full path) is retracted. The fire chain's own per-call costs below do not depend on the path and stand.

### Attribution (ms per frame, wrapped methods, pooled over two rounds; realtime window L 31.9-41.9, turn stand L 36.87, same burnt share)

| stage | realtime x1 | turn x1 | diff x1 | realtime x4 | turn x4 | diff x4 |
|---|---|---|---|---|---|---|
| drawFire, total | 0.300 | 0.066 | +0.234 | 2.133 (21 frames: 2.176) | 0.323 | +1.81 (+1.85) |
| drawFire's own body | 0.048 | 0.018 | +0.030 | 0.300 | 0.080 | +0.22 |
| `ribbons.setExplore` (via `setBurn` -> `syncExplore`) | 0.178 | 0.004 | +0.174 | 1.500 | 0.013 | +1.49 |
| `burnOnlyPieces` | 0.011 | 0.006 | +0.005 | 0.100 | 0.028 | +0.07 |
| `tickFireFx` (sparks) | 0.066 | 0.047 | +0.019 | 0.350 | 0.235 | +0.12 |
| `syncExplore` own, `syncFireLights` | 0.007 | 0.003 | +0.004 | 0.034 | 0.022 | +0.01 |
| HUD `setFireLead`, main.ts `fireSet` / `tickFire` (profile) | 0.018, 0.027, 0.009 | - | about +0.04 | 0.156, 0.156 | - | about +0.16 |

That is 1.2% (x1) and 1.7% (x4) of the awake tick (19.3 / 111 ms); against the brief's "0.6-1.2 ms more a frame" that is lower at x1 (0.27 ms with the HUD and main.ts lines) and higher at x4 (2.0 ms); the two are not comparable (K114 stage 2's stands were not at one share and may carry the same physics-state confound, so its "0.5 ms unattributed" may have been the path too). In the profile `applyExploreGaps` (the per-mesh shader loop inside `ExploreGaps.setExplore`) is 0.247 ms incl (0.139 self) at x1 and 1.503 (0.793) at x4: 95% / 84% of the call. Frame time (dt p50 / p90 / mean): realtime x1 16.70 / 33.40 / 21.88, turn x1 16.70 / 16.80 / 16.67; realtime x4 133.5 / 183.3 / 144.5 (6 frames; the 21-frame pool 116.7 / 133.5 / 121.4), turn x4 33.4 / 83.5 / 51.45 (confounded as above).

### What was fixed

Nothing, so no A/B. Candidates inside the zone, each under the build bar: skip `runBurnAt` for edges in a terminal state (`runBurnAt` is 0.009 ms/frame x1, 0.077 x4); cache the full-edge `BurntSpan`; hoist `choices()` / `smoldering()`; a cheaper key. The HUD already skips an unchanged string (maze_hud.ts :382) and its write is about 1 ms over the whole window; main.ts's fire lines hold nothing redundant.

### K441 s2 (write-up; becomes a stage once K137 stage 1 has merged: K525 has)

- **Site:** `ExploreGaps.setExplore` (`src/render/ribbon/explore_gaps.ts` :213-291) and above all its `applyExploreGaps`; behind it `burnOnlyPieces` (`fabric_maze_renderer.ts` :2051) and `setBurn`'s `same` test (:2025). It sits behind `syncExplore` (K137 stage 1) and `src/render/ribbon/` (K580 stage 3 may touch it).
- **Why it is redundant work:** under the realtime clock the declared pieces keep their boundaries and only the fronts and the charred share move, yet the early return needs `samePieces && sameBurn`, so every frame re-runs the explore arrays, `exploreWhole`, `charred`, the mesh shader loop (`applyExploreGaps`), the strips, plucks, paint flags and the upload for ALL chains.
- **Expected saving:** at most 0.15-0.23 ms (x1) and 1.4-1.9 ms (x4) a frame in the moving-front case, 1.2% / 1.7% of an awake tick. Not the 10 ms / 60 ms tick gap (that is the path, above). Worth building only if the realtime race is judged on a throttled phone-class CPU.
- **Sketch:** (a) cache `burnOnlyPieces` per chain, keyed on the chain's own burn (spans and fronts), and re-declare only the chains whose key changed; (b) in `ExploreGaps.setExplore`, when `samePieces` (piece boundaries equal, fronts and charred moved), rewrite only the touched chains' slots, run the mesh shader loop for those meshes and upload the dirty range; (c) `update()`'s unconditional `syncExplore()` (:2928) needs no change (0.004-0.008 ms a call). A/B: same-state, per `probes.md` (K83 clock pins `advanceClocks`, `paintClock = 100`, `pulseBorn = 0`; `F.exploreClock = 1000`; `F.tickFireFx = function () {}` and `F.fireFx.clear()`; `&fw=0&phw=0`), the same-build control must read 0 px, then master vs branch at several L and also compare the declared tables for equality.

### The throttle (a look call: numbers only, not built)

A re-declare every N frames, the other N-1 frames costing the turn stand's level (0.066 ms x1, 0.323 ms x4), saves 0.234 (N-1)/N ms x1 and 1.85 (N-1)/N ms x4 a frame:

| N | saving x1 (ms, % of a 19.3 ms tick) | saving x4 (ms, % of 111 ms) |
|---|---|---|
| 2 | 0.117 (0.6%) | 0.93 (0.8%) |
| 3 | 0.156 (0.8%) | 1.23 (1.1%) |
| 4 | 0.176 (0.9%) | 1.39 (1.3%) |
| 6 | 0.195 (1.0%) | 1.54 (1.4%) |
| limit | 0.234 (1.2%) | 1.85 (1.7%) |

The front would step N times its per-frame travel: fsr x FIRE_V_REF = 0.6 x 12 = 7.2 u/s in the probes (0.12 u per 60 Hz frame, so 0.24 u at N = 2, 0.48 at N = 4), 2.4 u/s at the default fsr 0.2 (0.04 u a frame; derived from T(v) = h + d/r and the 12 u/s clock, not measured). The sparks and the render still run each frame. K441 s2's incremental update gets most of the same saving with no step: prefer it to the throttle.

### Owed

A same-physics-state rerun: the realtime stand AFTER the first sleep (the perf lock was K580's from 19:55:07; I did not get it before the cutoff). Recipe in `results.md` "Owed": in `k441_page.mjs`'s realtime path wait for `__knotPerf().asleep` and for `__knotPluckState().active` to empty, then throttle, drive, stand; record `asleep` at the window's ends and discard a run that woke; `run_k441.ps1 -Plan 'r3:realtime:1:0','r3:realtime:4:0','r4:realtime:1:0','r4:realtime:4:0','prof5:realtime:1:1'` under the lock, then `k441_pool.mjs`. Prediction to test: the tick gap falls to about the chain's +0.23 ms (x1) / +1.85 ms (x4) plus the HUD and main.ts lines. Then K441 closes, or K441 s2 opens on the numbers.

### Verify

No `src/` change (docs only), so nothing moves: no pin, no codec param. `npm run build` not run (nothing to build). `npm test` passed on this branch (master 4529246 plus docs): 120 files passed, 1 skipped; 1714 tests passed, 1 skipped; 111 s, 20:04-20:06 under the perf lock (K580 held it from 19:55:07 and K139 from 20:03:00 until just before). `npm run build` not run: no `src/` change.

### The item's handle

- owner: nobody since 2026-10-20 (agent a14002cf1416cdbd8 of claude session 91b19e11-7759-4638-ba60-4705b011b94f, stopped at the 1 h cap)
- branch: `worktree-agent-a14002cf1416cdbd8`, worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a14002cf1416cdbd8` (keep it: the evidence folder is untracked there); last commit: the one that adds this section (`git log -1 -- docs/design/K441_fire_frame.md`)
- evidence: `.claude/probes/K441/` (that worktree)
- next: the same-state rerun under the lock (Owed), then close K441 or open K441 s2
- brief: `docs/design/K441_fire_frame.md`

## Owed rerun (2026-10-30)

Build: master `e7b5a5ef0e2dcdcab90a5afadb39a917d18df605` (`P4 v0.4.0 e7b5a5ef`, built by `pwsh scripts/preview.ps1 -Port 5541`; every kept run's stamp reads that build, sim 5.0-5.1 s, `| asleep`). No `src/` change: the harness edits are in the untracked `.claude/probes/K441/` (`k441_page.mjs`, `k441_pool.mjs`, `run_k441.ps1`).

Method, as the Owed section and K1062 run E prescribe. `k441_page.mjs`'s realtime path now waits, before the throttle and the drive, until `__knotPerf().asleep` is true and `__knotPluckState().active` is empty; the turn path records the same gate after its walk. Every window records `asleep` at its start and end (sampled per frame inside the window, from `__knotPerf().asleep`) and is marked `discarded` if it woke at any stand frame. The batch ran on `http://127.0.0.1:5541/` under the perf lock (owner `K441-rerun-E-muse-batch3`, taken 2026-10-30T01:25:53-07:00; the single rerun below re-took it at 01:31:56) with the plan `r3:realtime:1:0`, `r3:turn:1:0`, `r3:realtime:4:0`, `r3:turn:4:0`, `r4:realtime:1:0`, `r4:turn:1:0`, `r4:realtime:4:0`, `r4:turn:4:0`, run through `pwsh -NoProfile -Command "& ./.claude/probes/K441/run_k441.ps1 ..."`. The first batch's host wrapper timed out after seven items had written kept files; the eighth (`r4:turn:4:0`, not discarded - incomplete) was rerun on its own under the lock, same build and port, and kept. The `prof5` profile run from the Owed recipe was skipped, as K1062 run E directs (it needs an unminified build and attributes cost rather than testing the prediction). Raw rows: `.claude/probes/K441/out_rerun/*.json`; pooled with `node .claude/probes/K441/k441_pool.mjs .claude/probes/K441/out_rerun`. Load label: the lock was this run's for every item, but the desktop carried its usual background load (the batch's per-item `cpu-other` lines list TGitCache at 2.8-14.2 s an item and several editor/agent processes), so read the tick means as desktop-under-load, not quiet-machine numbers.

### Asleep at both ends of every kept window

| run | stand frames | L | asleep start -> end | woke | discarded |
|---|---|---|---|---|---|
| r3_rt_x1 | 49 | 34.60 -> 50.20 | true -> true | false | false |
| r3_turn_x1 | 89 | 36.87 -> 36.87 | true -> true | false | false |
| r3_rt_x4 | 17 | 37.40 -> 51.10 | true -> true | false | false |
| r3_turn_x4 | 29 | 36.87 -> 36.87 | true -> true | false | false |
| r4_rt_x1 | 50 | 34.40 -> 50.00 | true -> true | false | false |
| r4_turn_x1 | 104 | 36.87 -> 36.87 | true -> true | false | false |
| r4_rt_x4 | 15 | 38.40 -> 51.10 | true -> true | false | false |
| r4_turn_x4 | 33 | 36.87 -> 36.87 | true -> true | false | false |

All eight runs kept: asleep at both ends, no wake in any stand frame.

### Pooled table (`k441_pool.mjs`, turn stand W = 36.87, realtime window L 31.87-41.87)

| window | n | dt p50 | dt p90 | dt mean | drawFire | df own | setBurn own | syncEx own | burnOnly | setExplore | fireLights | fireFx | render | df p90 | %draw | %setBurn | %sync | %setEx |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| realtime_x1 L 31.87..41.87 (2 runs) | 45 | 20.00 | 53.50 | 29.69 | 0.607 | 0.078 | -0.020 | 0.020 | 0.027 | 0.424 | 0.000 | 0.078 | 1.867 | 1.000 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x1 bin 30-35 | 4 | 54.70 | 73.00 | 41.05 | 0.900 | 0.075 | -0.000 | 0.050 | 0.025 | 0.675 | 0.000 | 0.075 | 3.100 | 1.700 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x1 bin 35-40 | 30 | 20.00 | 53.50 | 28.56 | 0.593 | 0.080 | -0.023 | 0.020 | 0.033 | 0.397 | 0.000 | 0.087 | 1.787 | 1.300 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x1 bin 40-45 | 32 | 18.70 | 37.60 | 26.37 | 0.534 | 0.091 | -0.019 | 0.012 | 0.016 | 0.375 | 0.000 | 0.059 | 1.869 | 0.700 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x1 bin 45-50 | 31 | 19.20 | 36.60 | 26.09 | 0.610 | 0.090 | -0.003 | 0.019 | 0.013 | 0.381 | 0.000 | 0.110 | 1.852 | 0.900 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x1 all stand frames | 99 | 19.10 | 38.00 | 27.57 | 0.592 | 0.085 | -0.014 | 0.019 | 0.021 | 0.395 | 0.000 | 0.086 | 1.894 | 0.900 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x4 L 31.87..41.87 (2 runs) | 10 | 179.70 | 249.80 | 129.22 | 2.670 | 0.280 | -0.090 | 0.130 | 0.100 | 1.920 | 0.050 | 0.280 | 10.900 | 3.500 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x4 bin 30-35 | 0 | - | - | - | - | - | - | - | - | - | - | - | - | - | 0.00 | 0.00 | 0.00 | 0.00 |
| realtime_x4 bin 35-40 | 6 | 198.10 | 249.80 | 143.37 | 2.833 | 0.333 | -0.050 | 0.067 | 0.117 | 2.017 | 0.067 | 0.283 | 10.950 | 3.500 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x4 bin 40-45 | 12 | 160.80 | 179.70 | 107.99 | 2.250 | 0.258 | -0.050 | 0.083 | 0.142 | 1.492 | 0.017 | 0.308 | 9.142 | 2.900 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x4 bin 45-50 | 12 | 143.60 | 162.10 | 99.20 | 2.425 | 0.300 | -0.050 | 0.067 | 0.108 | 1.525 | 0.000 | 0.475 | 7.625 | 2.800 | 100.00 | 100.00 | 100.00 | 100.00 |
| realtime_x4 all stand frames | 32 | 143.60 | 198.10 | 114.08 | 2.450 | 0.294 | -0.047 | 0.069 | 0.119 | 1.600 | 0.019 | 0.397 | 8.919 | 3.100 | 100.00 | 100.00 | 100.00 | 100.00 |
| turn_x1 (L 36.87, 2 runs) | 193 | 35.70 | 54.20 | 31.05 | 0.105 | 0.026 | -0.013 | 0.005 | 0.008 | 0.003 | 0.001 | 0.076 | 1.956 | 0.200 | 100.00 | 50.26 | 50.26 | 50.26 |
| turn_x4 (L 36.87, 2 runs) | 62 | 54.10 | 182.00 | 93.73 | 0.552 | 0.179 | -0.063 | 0.019 | 0.044 | 0.011 | 0.002 | 0.360 | 9.006 | 0.800 | 100.00 | 51.61 | 51.61 | 51.61 |

Per run, the frame loop's own tick cost (`__knotPerf` over the stand frames, ms; mean / p50 / p95 / max): r3_rt_x1 23.00 / 23.80 / 56.60 / 72.30; r3_turn_x1 18.26 / 22.30 / 45.40 / 68.00; r3_rt_x4 103.14 / 142.30 / 231.80 / 231.80; r3_turn_x4 95.73 / 149.20 / 221.00 / 254.20; r4_rt_x1 22.88 / 26.60 / 42.10 / 60.20; r4_turn_x1 19.14 / 22.20 / 57.60 / 61.30; r4_rt_x4 102.20 / 143.40 / 230.30 / 230.30; r4_turn_x4 (the rerun) 83.29 / 127.20 / 198.00 / 216.70.

### The tick gap against the prediction

| throttle | realtime tick mean (r3, r4) | turn tick mean (r3, r4) | realtime - turn | prediction (Handoff, Owed) |
|---|---|---|---|---|
| 1x | 22.94 (23.00, 22.88) | 18.70 (18.26, 19.14) | +4.24 (pairs +4.74, +3.74) | about +0.23, plus the HUD and main.ts lines (about +0.03; about +0.26 in all) |
| 4x | 102.67 (103.14, 102.20) | 89.51 (95.73, 83.29) | +13.16 (pairs +7.42, +18.91) | about +1.85, plus the HUD and main.ts lines (about +0.15; about +2.00 in all) |

Observed: with both stands asleep, the tick gap is far below the first stands' confounded +10 ms (1x) and +60-65 ms (4x), and in that sense the correction holds - most of that gap was the awake path against the rest path. It does not fall to the chain-only prediction: the residual +4.24 ms at 1x and +13.16 ms at 4x sit above it, as does the same-share fire chain itself in this pool (`drawFire` 0.607 vs 0.105 at 1x, +0.50; 2.670 vs 0.552 at 4x, +2.12, nearly all of it `ribbons.setExplore` at +0.42 and +1.91). The 4x same-share window holds only 10 frames and the two 4x pairs differ by 11.5 ms, so the 4x residual is thin; the load label above applies to all of it. Inferred, not measured here: how much of the residual is background load and throttled-frame scheduling, rather than the fire clock, is not separated by this rerun. Whether a K441 s2 opens on these numbers is Claude's call (K1062 run E); this rerun ends K441 as the Owed section directs.

## K1077

Build: master `fe7fa774` (no `src/` change; measurement only). Unminified build in `.claude/probes/K1077/build` (`npx vite build --minify false`), served at `http://127.0.0.1:5557/`; `run_k441.ps1`, `k441_page.mjs`, `k441_pool.mjs`, `k441_prof.mjs` and the lock scripts copied to `.claude/probes/K1077/` with both ports on 5557 and `k441_prof.mjs`'s pairs set to this run's labels. Under the perf lock (owner `K1077-muse-batch4-runD`, 2026-10-30 09:20-09:23 -07:00): `prof5:realtime:1:1`, `prof6:turn:1:1`, `prof7:realtime:4:1`, `prof8:turn:4:1`. All four windows kept by the asleep gate (asleep true at both ends, no wake; batch 3's `discarded` flag false throughout). Caller chains and self-under-entry sums: `.claude/probes/K1077/analyze.mjs` over the same profiles. Load label: the desktop carried its usual background load (per-item `cpu-other`: Godot 7.9-8.0 s, TGitCache 3.3-6.1 s, agent processes 12.8-22.2 s on two items), so read the ms as desktop-under-load numbers; the 4x realtime window holds 12 frames and is thin, as batch 3's was.

| run | frames | stand L | tick mean (p50) | asleep |
|---|---|---|---|---|
| prof5 realtime x1 | 34 | 36.4 -> 50.2 | 19.54 (25.30) | true -> true |
| prof6 turn x1 | 82 | 36.87 | 16.38 (24.40) | true -> true |
| prof7 realtime x4 | 12 | 41.1 -> 50.9 | 89.62 (60.00) | true -> true |
| prof8 turn x4 | 30 | 36.87 | 91.05 (132.70) | true -> true |

This run's own tick gap is +3.17 ms at 1x and -1.43 ms at 4x (the 12-frame realtime window again; batch 3's +13.16 does not reproduce as a tick mean here). The tables below therefore charge their rows against batch 3's gaps (+4.24 / +13.16), the numbers this run was sent to attribute; per-frame profile totals bracket them (non-idle CPU per frame: realtime 22.02 vs turn 18.07 ms at 1x, +3.95; 120.03 vs 109.23 at 4x, +10.81). Self time per frame from `k441_prof.mjs` (100 us sampling; one rAF frame is one tick in the continuous loop the probe forces). Rows are in self-diff order and stop once they pass 80% of the reference gap; positives overshoot 100% further down because other functions run cheaper on the realtime stand (`(idle)` alone is -4.89 ms/frame at 1x: the realtime stand idles less, which is the gap restated).

### 1x: rows to 82% of +4.24 ms

| # | function (source) | turn | realtime | diff | cum % of +4.24 | caller chain on the realtime stand |
|---|---|---|---|---|---|---|
| 1 | `getBoundingClientRect` (browser; `src/main.ts:3650` in `aidTick`) | 1.120 | 2.188 | +1.068 | 25% | `aidTick` (`src/main.ts:3642`) <- `cutTick` (`src/main.ts:3807`) <- `fabricTick` <- `restFrame` <- frame tick (`src/app/frame_loop.ts:699` calls `cutTick` every fabric frame) |
| 2 | `buildProfile` (`src/render/ribbon/joinery.ts:992`) | 0.170 | 0.592 | +0.422 | 35% | <- `rebuildFillets` (`src/render/ribbon/joinery.ts:654`) <- `tickPaintPalette` <- `tickPaint` (`src/render/ribbon_renderer.ts:574`) <- `fabricTick` |
| 3 | `pushFan` (`src/render/ribbon_mesh.ts:803`) | 0.684 | 0.961 | +0.277 | 42% | <- `emitFan` (`src/render/ribbon/joinery.ts:1450`) <- `rebuildFillets` <- `tickPaint` (same chain as row 2) |
| 4 | `sampleAt` (`src/render/ribbon/sampling.ts:38`) | 1.735 | 2.010 | +0.275 | 48% | <- `computeGapSlot` (`src/render/ribbon/crossing_gaps.ts:370`) <- `RibbonRenderer.update` (`src/render/ribbon_renderer.ts:1811`) <- `flowRender` <- `restFrame` |
| 5 | `computeGapSlot` (`src/render/ribbon/crossing_gaps.ts:370`) | 1.209 | 1.452 | +0.243 | 54% | <- `RibbonRenderer.update` <- `flowRender` <- `restFrame` (same chain as row 4) |
| 6 | `(program)` (browser/native, no source) | 1.053 | 1.288 | +0.235 | 59% | root: unattributed native time (see Reading) |
| 7 | `visit` (`src/render/ribbon/joinery.ts:745`) | 0.028 | 0.257 | +0.229 | 65% | <- `rebuildFillets` <- `tickPaint` (row 2's chain) |
| 8 | `setMaskIds` (`src/render/ribbon_mesh.ts:342`) | 0.000 | 0.191 | +0.191 | 69% | <- `assignGapIds` (`src/render/ribbon/crossing_gaps.ts:1259`) <- `RibbonRenderer.update` <- `flowRender` (row 4's chain; 0.000 on the turn stand: realtime-only in this window) |
| 9 | `noise3D` (simplex, via renderer update) | 0.182 | 0.339 | +0.157 | 73% | <- `RibbonRenderer.update` <- `flowRender` <- `restFrame` |
| 10 | `layout` (pluck overlay, via pluck tick) | 0.128 | 0.277 | +0.148 | 77% | <- pluck tick <- `fabricTick` <- `restFrame` |
| 11 | `bufferSubData` (WebGL upload) | 0.433 | 0.555 | +0.122 | 79% | <- `updateBuffer`/`updateBuffers` <- Pixi draw <- render |
| 12 | `RibbonRenderer.update` own (`src/render/ribbon_renderer.ts:1811`) | 0.051 | 0.172 | +0.121 | 82% | <- `flowRender` <- `restFrame` |

Just past the cut, the fire chain itself: `applyExploreGaps` (`src/render/ribbon/explore_gaps.ts:315`) +0.118, `subtractBurnt` (`src/game/explore_view.ts:518`, under `burnOnlyPieces`, `src/render/fabric_maze_renderer.ts:2862`) +0.105, `writePaintItems` (`src/render/ribbon_renderer.ts:586`, under `setExplore`, `src/render/ribbon_renderer.ts:2414`) +0.051. Whole-subtree sums (every self sample whose stack contains the entry): `drawFire` (`src/render/fabric_maze_renderer.ts:2507`) +0.526, of it `setBurn` (`src/render/fabric_maze_renderer.ts:2836`) +0.434 and `setExplore` +0.355 - batch 3's +0.50 chain, confirmed; and `cutTick` +1.407, of it `aidTick` +1.411 (row 1 is its rect).

### 4x: rows to 87% of +13.16 ms

| # | function (source) | turn | realtime | diff | cum % of +13.16 | caller chain on the realtime stand |
|---|---|---|---|---|---|---|
| 1 | `getBoundingClientRect` (browser; `src/main.ts:3650` in `aidTick`) | 4.771 | 9.264 | +4.493 | 34% | `aidTick` <- `cutTick` <- `fabricTick` <- `restFrame` (row 1 at 1x; 59% of the realtime stand's rect time, 91% of the turn stand's rect time goes through the camera poll's `readPanel`, `src/app/camera.ts:219`, which `stepPanel` (`:226`) calls every frame) |
| 2 | `rebuildFillets` own (`src/render/ribbon/joinery.ts:654`) | 3.161 | 6.855 | +3.694 | 62% | <- `tickPaintPalette` <- `tickPaint` <- `fabricTick` |
| 3 | `sampleAt` (`src/render/ribbon/sampling.ts:38`) | 8.925 | 12.247 | +3.322 | 87% | <- `protectReach`/`computeGapSlot` (`src/render/ribbon/crossing_gaps.ts:370`) <- `RibbonRenderer.update` <- `flowRender` <- `restFrame` |

Next rows down: `pushFan` +1.787, `flank` (`src/render/ribbon/joinery.ts:2074`) +1.256, `buildProfile` +1.205 (row 2's chain: the fillet cluster), `setMaskIds` +0.711 (realtime-only, row 8's chain), `applyExploreGaps` +0.555 and `drawFire` own +0.367 (the fire chain). Whole-subtree sums: `cutTick` +5.225 (`aidTick` +5.121), `drawFire` +3.155 (`setBurn` +2.617, `setExplore` +2.470).

### Reading

The residual is not one function; it is three clusters, all downstream of L moving every frame:

1. **Forced layout under the button ticks (+1.41 ms x1, +5.12 x4, subtree).** `cutTick` runs every fabric frame on both stands (`src/app/frame_loop.ts:699`, outside the GAME gate), and its aid/sprint/tool/beat ticks read the open panel's rect (`src/main.ts:3650`, `:3695`, `:3804`) when the panel is open. On the turn stand those rects are nearly free (the aid share of rect time is 7-9%); on the realtime stand the fire's per-frame work ahead of them - the GAME block's `fireSet` HUD lead write (`src/main.ts:2631`, `:2643`) and the re-declared fabric - leaves layout dirty, so the same reads force a layout pass (row 1; `layout` self time also rises). Observed: the chain shares and the rect split (realtime 59-65% aid-side, turn 91-92% camera-poll side; the poll's own rect, `readPanel`, is cheaper on the realtime stand, 0.77 vs 1.03 ms). Inferred: the dirty-layout mechanism - no layout-dirty probe was run; the per-call cost split is what the profiles show.
2. **The fillet rebuild rides `tickPaint` every frame (rows 2, 3, 7 at 1x, about +1.1 ms gross; row 2 and its cluster about +8.4 ms at 4x).** `drawFire`'s key changes with L (`src/render/fabric_maze_renderer.ts:2507`), `setBurn` re-declares the burn through `syncExplore` (`src/render/fabric_maze_renderer.ts:4693`) and `ribbons.setExplore` (`src/render/ribbon_renderer.ts:2414`), and the paint pass then rebuilds fillets (`rebuildFillets`, `buildProfile`, `pushFan`, `visit`, `flank`, `emitFan`) instead of standing pat as the turn stand's unchanged burn lets it. This is the K441 s2 site from the Handoff, now with its downstream cluster priced: the re-declare's own subtree is +0.53/+3.16 ms, and the fillet work it wakes is the larger half at 4x.
3. **The renderer's gap-slot pass redoes its work (rows 4, 5, 8, 9, 12 at 1x, about +0.97 ms; rows 3 and 7 at 4x, about +4.5 ms).** Under `RibbonRenderer.update` <- `flowRender`, `computeGapSlot`/`assignGapIds`/`setMaskIds`/`sampleAt` run at realtime rates; `setMaskIds` and `assignGapIds` do not appear on the turn stand at all in these windows. Same trigger as cluster 2 (the per-frame explore re-declare invalidates the gap assignment), separate subtree.

What this run could not attribute, and why: `(program)` (+0.235 ms at 1x, row 6) is browser/native time with no source; at 4x it runs *cheaper* on the realtime stand (-3.88), as do several shared functions at both throttles - sampling and load noise at these window sizes (34/82 frames at 1x, 12/30 at 4x), which is also why the positive rows overshoot the net gap. The 4x table is charged against batch 3's +13.16 because this run's own 4x tick means (89.62 vs 91.05, 12 realtime frames under the load label above) show no gap to attribute; the 1x tick gap (+3.17 here, +4.24 in batch 3) and the per-frame CPU totals (+3.95 / +10.81 non-idle) say the cost is real, and the profile rows say where it sits. Nothing here separates background-load scheduling from fire-clock work inside the shared renderer functions beyond the caller chains given.

Costs worth fixing, filed as Next items with their measured ms: K1081 (cluster 1: skip or cache the button ticks' panel rect), K1082 (cluster 2 = K441 s2: incremental `setExplore` so the fillet rebuild stands pat), K1083 (cluster 3: declare only changed chains so the gap-slot pass stands pat). K1077 closes on these tables: rows pass 80% of both reference gaps (82% at 1x, 87% at 4x).
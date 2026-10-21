# K441: the real-time fire's frame cost, profiled on post-K409 code

Ledger: K441, the next step of K114's handle. One stage, sonnet, 1 h cap.
Build on master. Measure first; build only an invisible fix, and only in
the files named below.

## The call

K114's handle (Levi took round 2's recs; the burn race is his first
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
# K868 S3a3: the ink drawn from the label (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`, §8's S3 and §9). Previous stage: S3a2
(`docs/design/K868_s3a2_label.md`). Read its `## Handoff` first. It is on
the branch.

## Why

S3a2 put the label pass into `src/`. With `labelInk` on, the app renders
a packed label whenever it repaints the threads. With the flag off, it
draws exactly as master. The threads still have no outline with the flag
on, so this stage draws the ink from the label: K915's band pass, which
is S3a's step 3.

It also carries out three of the coordinator's technical calls (in the
order steps 1, 2 and 4 take them up):

1. **Exact s for the fill pass.** The packed s has 11 bits, about 0.15
   world on a 300-world chain. The band pass needs no more than that,
   since it only tells |Δs| ≤ σ, with σ about 1.3 (K915 Step 6). The fill
   pass's window tests need more: the packed s costs up to 44 cells on
   g41_def_tw64.
2. **The oracle stops depending on the order it visits clusters (K964
   class C).** It resolves as the GPU does:
   - tubes first, by depth;
   - then each fill against the tube under it, by the yield;
   - then fills against each other, by depth.
3. **The label follows the threads.** S3a2 rebuilds it only once the knot
   sleeps or after 2 quiet frames. With the ink drawn from it, a drag
   would show the ink lagging behind the threads.

## Goal

With `labelInk` on, the threads have outlines drawn from the label:
- The GPU's ink matches the oracle's label ink per pixel on the 12 scenes.
- The free-end check passes as well as it does on the oracle's ink.
- The ink stays on the threads while they move.

With the flag off, the app draws exactly as master, and the branch is
ready to merge.

## Read first

- S3a2's `## Handoff`.
- S3a's steps 3-5 in `K868_s3a_app.md` `## Order`. This stage does step
  3 and part of step 5. Step 4 (the LOD) and the 4x sheet are S3a4.
- `K915_surface_borders.md` Step 6: the two passes, the fetches,
  antialiasing and the checks.
- `K923_s3_bench.md` `## Handoff`. Its band pass is in the main
  checkout's `.claude/probes/K923/` (`bench.js`, `bench.html`): port from
  it.
- `K934_recount.md`: the free-end check (the runs count) and sheet K's 14
  sites (`.claude/probes/K934/` in the main checkout).

## Order

1. **Exact s for the fill pass.**
   - The tube pass also writes s as a float into a 4-byte target.
   - The fill pass samples it through a framebuffer that does not attach
     it, so no copy is needed.
   - The band pass keeps reading the packed word.
   - Check: on the 12 scenes, P2 equals W2, or the difference is
     explained. Report the bytes per pixel.
2. **The oracle's fill order (K964 class C).**
   - Change `oracle.ts` to resolve as the GPU does (Why, call 2).
   - Check: the oracle's V is the same with the clusters visited in
     reverse order, on the 12 scenes. Class C's two cells on muse_hash
     agree with the GPU.
   - Report how many pixels of V change per scene. Then re-take the
     oracle's label ink and free-end runs count as the reference for
     step 3.
3. **The band pass.**
   - Draw strips W wide inside every outline piece: each tube edge at
     ±h, each fill's arcs and each cap.
   - Draw strips centred on each switch curve. The CPU finds the switches
     where two surfaces swap in depth inside an overlap.
   - Each fragment makes 2-3 fetches. Its coverage comes from the strip's
     distance coordinate.
   - With the flag on, this ink replaces the border look's ink. The rest
     of the look is unchanged.
   - Check:
     - The GPU's ink against the oracle's label ink, per pixel, on the 12
       scenes (K892's method). Report extra and missing pixels per scene.
       Crop the worst five sites and look.
     - The free-end check (K934's runs count) on the GPU's ink. It is the
       judge.
4. **The label follows the threads.**
   - Rebuild the label whenever the drawn positions change: every repaint
     while the knot moves, with the worker on and off.
   - Flow on at rest rebuilds only when the drawn positions change.
   - No timings: S3b times the rebuild.
   - Check: during a scripted drag, the ink stays on the threads. Crop one
     frame mid-drag beside the flag-off frame and look.
5. **The checks.**
   - On the 12 scenes:
     - the label's counts in S3a's columns, beside S3a2's W2 and P2;
     - the ink's extra and missing pixels;
     - the free-end runs count beside the oracle's.
   - The suite is green, including the golden snapshot.
   - With the flag off, 0 px against master on def and muse_hash
     (`ab_shot.mjs`).
   - K320's shader budgets hold.
   - The 14 sheet K sites at play size, with the flag on, beside the
     oracle's label ink and master. Crop and look.
   - Gameplay layers with the flag on: list what changed since S3a2's
     list. Don't fix them.

Not this stage:
- **S3a4:**
  - K923's LOD and its facet check;
  - sheet S3a at play size and 4x;
  - the label's bits for K943.
- **S3b:**
  - the Pixel bench, covering both passes, the rebuild per moving frame
    and flow at rest;
  - the look on the phone;
  - the END tuck and band W against master (§8).
- **Later:**
  - K964 classes A and B, and the open-end residue;
  - K966 (gameplay layers) and K967 (the label app's fixed values);
  - G1 corners and cr 0-6 (sheet F);
  - K892, and K943 beyond its 2 bits;
  - K953 and K955-K958.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    The coordinator has rebased it onto master with this brief. Its
    `node_modules` is a junction to the main checkout's.
  - Commit WIP at every milestone, broken or not, starting with your
    first edit to `src/`. Never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with a new file name per revision: the dev server serves
    `.claude/` stale. Reusable harnesses go in tracked `scripts/`.
  - Dev server: S3a2's command (its handoff's `env:`), port 5381. Stop it
    at the end.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time: S3a2 compacted 9 times in 78 minutes.
  - Main and `src/app/` write physics only through the host
    (`host_seam.test.ts`).
  - `npm test` passes at every milestone commit that touches `src/`.
- **Probes.**
  - Hook only the app's canvas for lost contexts. Pixi's
    `isWebGLSupported` test canvas loses its context on purpose.
  - Screenshots: `scripts/diag_screenshot.mjs` or S1a's driver, never
    `--virtual-time-budget`. Probe links carry `&snd=none`.
- **Not allowed:**
  - the phone;
  - timing;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, if steps remain, run step 5's checks on what you have.
  - A compaction is not a stop. After one, re-read this brief and
    `git log`.
  - On stopping, commit WIP, append a `## Handoff` to this brief (in the
    worktree, committed), then report.
- **The final report** gives:
  - each step, done or not, with its commits;
  - the exact s target's bytes per pixel, and the 12 scenes' P2 against
    W2;
  - the oracle's change per scene;
  - per scene: the ink's extra and missing pixels and the free-end runs
    count, both beside the oracle's;
  - the drag check;
  - the paths of the crops you looked at;
  - whether the branch is ready to merge, in your view: flag off equals
    master, the suite is green, and flag on draws the ink;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).

## Handoff

Stopped 2026-10-28 at about 03:00 (start 01:28) with steps 1-5 done.
Branch `k868-s3a`, worktree `.claude/worktrees/k868-s3a`, not pushed.
Probes and results: `.claude/probes/S3a/` (untracked). The flag is `lbi`,
off by default.

### Steps and commits

| Step | State | Commits |
|---|---|---|
| 1. Exact s for the fill pass | done | `1d495b6f` |
| 2. The oracle's fill order (K964 class C) | done | `358f4175`, `0c7c24f2` (the order test) |
| 3. The band pass | done, with residuals R1-R6 | `3ca20316` (outline strips), `9e9bdb5b` (switch strips) |
| 4. The label follows the threads | done; see R7 | `3ca20316` |
| 5. The checks | done | this handoff |

Module notes:
- `src/render/label/label_band.ts`: the band pass, 18 floats a strip.
  - Outline strips (each tube edge at ±h, each fill's arcs, each cap)
    run inward: vD = -0.5 + t(W+1).
  - Switch strips (F_SWITCH = 8) are centred: vD = (t - 0.5)(W+1). A
    switch fragment survives only where the label on one side, at
    r = W/2 + uLr, is the tube and on the other side the fill.
  - MAX blend into RGBA8; ink where the byte is 127 or more. The frame
    loop composites it after `app.render()`, so the ink draws over every
    layer (see Gameplay).
  - Depth: d0 is kept. d1 (the depth rule) is worse on every scene, e.g.
    def 466 missing beyond one cell and 49 free ends, muse_hash 199 free
    ends, fat 58.
- `src/render/label/label_switch.ts`: `findSwitchLines(m)`, the CPU's
  switch search.
  - For each chain's crossings with a cluster J, it looks for a flip of
    the fill-over order (K940's yield) at x.s ± σ and at the midpoints.
  - It requires the flip across s ± eps, a corner outside J's cluster
    and one in J's fill, and returns a line ±(h + W) along the normal.
  - It finds fill-against-tube switches only. Tube-against-tube swaps
    (twist eyes, tie-breaks) are not found (R1).
  - It runs uncached on every rebuild (R7).
- The label rebuilds whenever the drawn positions change, on both hosts.

### Step 1: exact s

The tube pass writes s as float bits into an R32UI target (S). The fill
pass reads it through a framebuffer that does not attach it, so there is
no copy. The band pass keeps reading the packed word.

- Bytes per pixel: packed 16 (S3a2: 12; memoryPacked x4/3, e.g.
  30756384 -> 41008512), wide 36.
- P2 = W2 on all 12 scenes, and the sites' P2 equals them too.

| Scene | S3a2 P2 / W2 | S3a3 P2 / W2 | S3a3 P2: missFill / wrongFill / missTube / wrongTube / extra |
|---|---|---|---|
| def | (no row in label7) | 16 / 16 | 1 / 1 / 7 / 4 / 3 |
| fat | 7 / 7 | 7 / 7 | 0 / 0 / 1 / 2 / 4 |
| g41_def_tw42 | 16 / 16 | 16 / 16 | 0 / 0 / 8 / 1 / 7 |
| g41_def_tw64 | 58 / 14 | 14 / 14 | 0 / 0 / 4 / 5 / 5 |
| g41_ring_tw42 | 7 / 7 | 7 / 7 | 0 / 0 / 2 / 2 / 3 |
| g41_ring_tw64 | 5 / 2 | 2 / 2 | 0 / 0 / 0 / 0 / 2 |
| g41_user_tw42 | 4 / 4 | 4 / 4 | 0 / 0 / 3 / 0 / 1 |
| g41_user_tw64 | 8 / 3 | 3 / 3 | 0 / 0 / 0 / 0 / 3 |
| muse_default_tw | 13 / 13 | 13 / 13 | 0 / 0 / 5 / 1 / 7 |
| muse_hash | 23 / 11 | 9 / 9 | 0 / 0 / 1 / 4 / 4 |
| ring | 5 / 4 | 4 / 4 | 0 / 0 / 2 / 1 / 1 |
| user_tw42.lightpaper | 7 / 7 | 7 / 7 | 0 / 0 / 1 / 2 / 4 |

### Step 2: the oracle's fill order

`visibleAt` now resolves as the GPU does: the tube by depth, each fill
against it by the yield, the fills by depth.
- Forward against reverse cluster order: 0 cells differ on all 12 scenes
  (`0c7c24f2` pins it).
- V against S3a2: 0 cells changed on 11 scenes. On muse_hash 2 cells
  changed (class C, at (19.908, 21.895) and (19.832, 21.971)). They are
  now chain 10's fill of cluster 25, which is what the GPU draws, where
  they were chain 85's tube of cluster 30.
- The re-taken reference for step 3 (`ref8/`):

| Scene | Oracle ink cells | Free ends, raster / exact |
|---|---|---|
| def | 397167 | 1 / 1 |
| fat | 382871 | 0 / 0 |
| g41_def_tw42 | 516066 | 0 / 0 |
| g41_def_tw64 | 303798 | 6 / 8 |
| g41_ring_tw42 | 138862 | 0 / 0 |
| g41_ring_tw64 | 84982 | 0 / 0 |
| g41_user_tw42 | 213624 | 0 / 0 |
| g41_user_tw64 | 129147 | 3 / 3 |
| muse_default_tw | 394960 | 1 / 1 |
| muse_hash | 237882 | 10 / 12 |
| ring | 95521 | 0 / 0 |
| user_tw42.lightpaper | 213648 | 0 / 0 |

### Step 3: the band pass against the oracle

Per cell of the label grid (pitch W/4). Extra means GPU ink only, missing
means oracle ink only. In brackets: the cells more than one cell from the
other's ink (edge jitter left out). Free ends: K934's runs count on each
raster, the judge.

| Scene | GPU ink | Oracle ink | Extra (beyond 1) | Missing (beyond 1) | Free ends GPU / oracle |
|---|---|---|---|---|---|
| def | 400788 | 397167 | 4460 (6) | 839 (267) | 27 / 1 |
| fat | 385542 | 382871 | 2983 (0) | 312 (0) | 0 / 0 |
| g41_def_tw42 | 520930 | 516066 | 5477 (5) | 613 (82) | 10 / 0 |
| g41_def_tw64 | 306109 | 303798 | 3905 (137) | 1594 (792) | 63 / 6 |
| g41_ring_tw42 | 139915 | 138862 | 1464 (0) | 411 (47) | 7 / 0 |
| g41_ring_tw64 | 85640 | 84982 | 955 (8) | 297 (60) | 5 / 0 |
| g41_user_tw42 | 215273 | 213624 | 2157 (64) | 508 (166) | 15 / 0 |
| g41_user_tw64 | 129741 | 129147 | 1589 (88) | 995 (347) | 38 / 3 |
| muse_default_tw | 398558 | 394960 | 4321 (0) | 723 (159) | 15 / 1 |
| muse_hash | 239788 | 237882 | 3942 (585) | 2036 (672) | 75 / 10 |
| ring | 96330 | 95521 | 1070 (0) | 261 (12) | 4 / 0 |
| user_tw42.lightpaper | 215284 | 213648 | 2154 (64) | 518 (165) | 15 / 0 |

- The switch strips helped. Before them (`gpu9/`), missing beyond one
  cell / free ends were: def 364 / 31, g41_def_tw64 1688 / 97,
  g41_ring_tw64 154 / 7, muse_default_tw 213 / 18, muse_hash 1717 / 126,
  ring 29 / 5. The other scenes did not change.
- def draws 56587 strips (edges 49898, caps 2184, arcs 4501, switches
  4), with no GL error.
- The worst five sites, cropped and looked at (red extra, blue missing):
  - def (26.225, 1.436): a line along a tube is missing inside a loop,
    and so is the ink at the loop's tips.
  - muse_hash (3.321, 28.64) / (2.713, 28.032): an extra diagonal and a
    missing arc at a loop's end. The switch strip sits off the oracle's
    switch.
  - g41_def_tw64: two small closed island rings, a short vertical
    segment and a small extra.
  - g41_user_tw64: a missing diagonal that closes a V. It is a
    tube-against-tube swap, which the search does not find.
  - g41_user_tw42: an extra short vertical at a junction (an outline
    strip).
- The 14 sheet K sites at play size (`ksites10/`, the GPU's ink beside
  the oracle's and K934's renders of the label look and of master's
  look; px = pixels that differ, GPU against oracle):
  - Same shape as the oracle (edge pixels only): a2 22, b1 51, b2 62,
    c2 60, e1 29, f1 40, g1 57, h1 28 (the #16 fix shows, where master
    differs), h2 19.
  - a1 78: the oracle draws a closed almond island; the GPU draws an
    open arc, as master does.
  - d1 64: the oracle closes a teardrop; the GPU draws an open hook, as
    master does, so the free end stays.
  - c1 29 and c3 55: a small junction tick is missing.
  - d2 63: specks are missing.

### Step 4: the label follows the threads, and the drag check

- At rest it does not rebuild: fabric mode, worker host, rebuilds
  stayed at 50 while renders went 52 -> 111 (`drag11/`).
- A scripted drag (`drag11/`, fabric mode, light wash, worker host):
  - 25 rebuilds over the drag's 37 renders.
  - Mid-drag with the flag on, the black outlines are continuous and sit
    on the threads, with no lag behind them and no ghost of an earlier
    position. The flag-off frame shows master's border look.
  - The two frames are not one state (frozen at sim 7.675 against 5.767;
    K550), so this is a look, not a pixel diff.
  - The ink is on the threads in every frame drawn, but in fabric mode
    each of those frames is slow (R7), so a real drag would stutter.
- Knot mode (`drag10/`): it rebuilds only while the knot moves.
  - With flow on at rest, every render rebuilt (26 of 26, both hosts).
    Flow moves the drawn positions, so that is the rule working, at a
    rebuild per flow frame (R8).
  - That flow page drew 26 renders in the 3 s flow window (about 9 a
    second). The same page drew 57 in its 1 s rest window with flow off,
    where nothing rebuilt. These are frame counts, not timings.
- Fabric mode with flow on (`gp11/flow_watch`, worker host): 3 rebuilds
  over 7 renders in 3 s.

### The in-thread host with the flag on (`settle11/`)

Fabric mode, `phw=0&fw=0`, seed b, under the perf lock, read 20, 40 and
60 s after load. A state readout, not a timing.

- Flag off: asleep by the 40 s read (settle phase off).
- Flag on: still awake at 60 s.
  - It drew 6, 18 and 31 frames by the three reads, and every one was a
    rebuild (the label's counters). It stepped 36 physics substeps in
    all.
  - K147's settle stays in its budget phase, with the cost estimate over
    the 12 ms budget, and its lag grows (0.9, 2.0, 3.2 s).
  - gp10/on_trail and drag11/on_phw0 waited 180 s for sleep and timed
    out.
- Observed: the frames that draw are the slow ones, so the settle barely
  advances. The app's own frame-cost counter (`__knotPerf()`, read, not
  a timing of this stage's) over its last 120 frames reads:
  - flag on: p50 2.7 ms, p95 2161 ms, max 2769 ms (304 frames in all,
    31 of them drawn);
  - flag off: p50 0.9 ms, p95 1.5 ms, max 2 ms (1664 frames).
  - On the worker host, fabric with flow on (`gp11/flow_watch`): p50
    39 ms, p95 1788 ms, max 2396 ms, and 7 frames drawn in 3 s.
- Inferred, not tested: the cost is the rebuild's CPU part, most likely
  the uncached switch search over the fabric's 117-120 clusters.
  - Knot mode has no clusters, and it settles in-thread with the flag on
    (drag10/on_phw0: 594 rebuilds, then rest).
  - On the worker host the settle runs in the worker, so the knot sleeps,
    but each rebuild frame there is as slow.
  - Splitting the rebuild's cost needs a timing, which this stage leaves
    to S3b.

### Step 5: the other checks

- Suite: green at `9e9bdb5b`, 180 files, with the golden snapshot
  (`byte_identity`) and `k320_slim` (`test_s3a3_switch.log`).
- Flag off against master (`ab/s3a3_off/`, `ab_shot.mjs`):
  - 0 px on def and muse_hash against master's shots (`ab/m3`), with the
    same physics hashes (def 910ff135, muse_hash 733ee14a).
  - src/ is unchanged from m3's base (`d4aa241e`) through the merge base
    (`efb3f4d7`) to master (`af356df4`).
  - The `ab/master` muse_hash shot is stale (64878 px), as S3a2 noted.
- K320's shader budgets hold for the programs they cover (the ribbon
  and fan programs). The label and band programs have no budget (R10).
- The label counts, ink and free ends are in steps 1 and 3.

### Gameplay with the flag on (step 5: listed, not fixed)

Worker host (`gp11/`), because the in-thread host does not settle with
the flag on. Seed b, 4 moves. Changes since S3a2's list:
- The threads draw as black band ink, and the over-thread above the
  trail now has ink.
- Fog (`xp=fog`): the ink draws over the fog, so the whole maze's
  outlines show through it. S3a2 showed only the dashed trail.
- Thread reveal (`xp=threads`): the ink draws every thread whatever the
  reveal shows. The over-threads' outline bars cross the continuous
  yellow trail.
- On a dark background the black ink has little contrast: INK_AUTO is
  one colour.
- The markers (start, the head and its glow, the finish flag) look
  unchanged at 3x.
- Labelled px: on_trail 345835, on_fog 305209, on_threads 366830 (S3a2:
  345841, 305211, 366838; not one state). There was one lost context per
  run, from Pixi's test canvas.
- Not taken: an on-against-off pixel diff. The worker host is not
  same-state, and the in-thread host does not settle with the flag on.

### Crops looked at

All under `.claude/probes/S3a/`:
- `gpu10/crops/def.d0.w0.png`, `muse_hash.d0.w0.png`,
  `g41_def_tw64.d0.w0.png`, `g41_user_tw64.d0.w0.png`,
  `g41_user_tw42.d0.w0.png`
- `ksites10/sheet_s0.png` to `sheet_s3.png`
- `drag11/on_worker.mid.png`, `drag11/off_worker.mid.png`
- `gp11/on_trail.png`, `on_trail_head.png`, `off_trail_head.png`,
  `on_fog.png`, `on_threads.png`, `z_on_head.png`, `z_off_head.png`,
  `z_on_fog_flag.png`

### Residuals

- R1: tube-against-tube switches (twist eyes, tie-breaks) are not
  found: g41_user_tw64's missing V diagonal.
- R2: small closed island outlines are missing (g41_def_tw64's rings,
  sheet site a1).
- R3: at loop tips the GPU draws an open hook where the oracle closes a
  teardrop (sheet d1). At muse_hash's worst site the switch strip also
  sits off the oracle's.
- R4: def (26.225, 1.436): a line along a tube is missing inside a loop.
- R5: junction ticks are missing (sheet c1, c3), and junctions get extra
  outline segments (g41_user_tw42; 64 extra beyond one cell on both
  tw42 user scenes).
- R6: the GPU has more free ends than the oracle on 11 of 12 scenes
  (step 3's table; fat is level).
- R7: in fabric mode with the flag on, a frame that rebuilds the label
  costs about 2 s by the app's own counter, on both hosts. In-thread the
  knot therefore never sleeps; on the worker host every moving or
  flowing frame is that slow. The suspect is the switch search, which
  runs uncached on every rebuild; its crossing list (xBy) can be cached
  per topology.
- R8: with flow on at rest, the label rebuilds on every flow frame (the
  rule working).
- R9: the ink is one colour and draws over every layer: over the fog,
  against the thread reveal, with little contrast on dark backgrounds
  (K966).
- R10: K320 has no budget for the label and band programs.
- R11: S3a2's label7 has no def row. The dev server's build stamp shows
  the SHA at the server's start, not the current one.

### Next

- R7 first, since it leaves the flag unusable in-thread in fabric mode.
  Cache the switch search per topology. Then S3b times the rebuild (CPU
  search, strip build, upload, both passes).
- S3a4 as this brief lists it (K923's LOD, sheet S3a, the label's bits
  for K943), plus R1-R6, judged by the free-end count.
- R9 goes to K966.

### How to rerun

Run from the worktree. Each script's header gives its arguments.
- Dev server: `npx vite --config .claude/probes/S3a/vite.private-cache.config.ts --port 5381 --strictPort --host 127.0.0.1`.
- Oracle reference: `oracle_ref8.ts` -> `ref8/`.
- GPU rasters: `label_run9.mjs <base> .claude/probes/S3a/gpu10 <scenes>`.
- Ink against the oracle: `ink_cmp9.ts <scenes> .claude/probes/S3a/gpu10`
  -> `cmp10_all.log`, `gpu10/crops/`.
- Label counts: `label8/a/`; the table comes from `label_table10.mjs`.
- Switch lines at a point: `switch_check10.ts`.
- Sheet K sites: `ksites10.ts`.
- Drag: `drag11_locked.ps1` (calls `label_drag10.mjs`).
- Gameplay: `gp11_locked.ps1` (calls `gameplay7.mjs`).
- Flag off: `ab7_locked.ps1` (calls `ab_shot.mjs`).
- In-thread settle: `settle11_locked.ps1` (calls `settle11.mjs`).
- Locked scripts take the perf lock.

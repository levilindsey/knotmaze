# K868 S3a2: the label pass in the app (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`, §8's S3 and §9). Previous stage: S3a
(`docs/design/K868_s3a_app.md`). Read its `## Handoff` first.

## Why

S3a added the flag (`labelInk`, `lbi`) and found the tube label's GPU form
in a probe. v6's pieces, with the local-minimum clip and the EPS overlap,
match the oracle's visible surface on the 12 scenes to 0-16 sampled px per
scene (of 59k-361k). The fills were only emulated on the CPU, with
FieldModel's own functions, so the two-pass numbers are not yet an
independent check. Nothing of the label is in `src/`, so with the flag on
the threads have no outline at all, and the branch cannot merge. This
stage puts the label pass into the app. S3a3 then draws the ink from it
(K915's band pass).

## Goal

With `labelInk` on, code in `src/` renders the label into one packed
target at the canvas's device resolution whenever the app repaints the
threads: tubes, fills and caps. Its readback matches the oracle's V on the
12 scenes at least as closely as v6 did (the table in S3a's handoff). With
the flag off, none of it runs, allocates or compiles, and the app draws
exactly as master.

## Read first

- S3a's `## Handoff`, and its probes in this worktree's
  `.claude/probes/S3a/`: `label_check_v6.ts`, `patch_v6.mjs`,
  `label_run6.mjs`, `dbg_hole.ts`, `ab_shot.mjs`. Port from them.
- `K915_surface_borders.md` Step 6 (the two passes).
- `K923_s3_bench.md` ## Handoff (the packed label and its measured cost).
  The bench's code is in the main checkout's `.claude/probes/K923/`.
- `K868_field_border.md` §3.3 (depth), §3.4 (groups), §3.6 (ends) and §9.
- `K868_s1a_scene_export.md`: the scene exporter, the driver and the
  camera that put the app and the oracle on one grid.
- The oracle's label path in `src/render/field/oracle.ts` and FieldModel
  (`depthAt`, `clusterAt`, `inFill`, `footInWindow`, `fillOrder`), read
  through the shell.

## Order

1. **The tube pass in `src/`.**
   - Port v6 (pieces, the clip, the depth, the EPS overlap) into a module
     under `src/render/`. A header comment maps its files, as in
     `src/render/ribbon/`.
   - Build the pieces render-side from the mirror's positions and the
     crossing table (§9). The worker's snapshot gains nothing.
   - Split pieces at every cluster switch. S3a bisected one, and 0-3
     pieces per scene have two.
   - It works with the worker on (the default) and off. The probes ran
     `phw=0`: check both on one scene.
   - Check: the app's own label target, read back, reproduces v6's
     tube-only `counts` on def, muse_hash and g41_def_tw42.
2. **The fill pass on the GPU.**
   - Coverage from `inFill`'s wedge tests, with `footInWindow` per arm
     window.
   - The fill's z. S3a suggests the nearest foot of the corner's two arms;
     check that against the oracle's per-pixel nearest member.
   - The yield reading T, with the fillOrder table as a data texture.
   - WebGL2 cannot read a texture attached to the framebuffer it draws
     into, so a pass that reads T draws into another target or reads a
     copy. Say which, and what it adds in memory.
   - Check: all 12 scenes, in S3a's columns (agree, extra, missTube,
     wrongTube, wrongFill, missFill), beside v6's table. This is the
     independent check that S3a's CPU emulation was not.
3. **The packed label.**
   - Target layout, 32 bits: chain 8, s 11, cluster 8, the flags fill, cap
     and closed, and 2 bits reserved for K943 (the over line inside a
     junction). That leaves no room for z.
   - First test whether z can leave the label. List every reader of z,
     here and in K915's band pass (which needs "lower or paper" across an
     edge), and whether each can read the depth texture instead. The
     depth already orders z, with the tie-break folded in.
   - If z must stay: shrink s (it only has to tell |Δs| ≤ σ, K915 Step 6)
     or derive the cluster from chain and s, and give each one's cost in
     readback mismatches. Failing both, use RG32UI (64 bits; K923
     measured 0.6-1.0 ms more) and say so. S3b measures it.
   - Past the limits (K933: chains or clusters over 255), the app falls
     back to the flag off and logs one console warning. Test it.
   - Check: the 12 scenes again. The packed label's counts equal the
     128-bit ones, or the difference is explained.
4. **Caps that match endSnap.** The probe drew round caps at open ends
   while the oracle snaps them (§3.6). Make the caps match, then recount
   the open-end residue.
5. **The checks.**
   - The 12 scenes in S3a's columns, beside v6's.
   - K964, the residue v6 left: open ends after step 4, and the wrong
     tubes that are GPU-lower after the clip. Diagnose where it is cheap:
     a cause per class, or "not found" with what you tried.
   - The suite is green, including the golden snapshot. With the flag
     off, 0 px against master on def and muse_hash (`ab_shot.mjs`). K320's
     shader budgets hold.
   - Gameplay layers (markers, trail, fog) with the flag on: list what
     breaks; don't fix it.

Not this stage:
- S3a3: the band pass (the ink), K923's LOD and sheet S3a (S3a's steps
  3-5). Until it lands, the flag on still draws no outline. That is
  expected at the end of this stage.
- S3b: the Pixel bench, the look on the phone, and the END tuck and band W
  against master (§8). No timings of any kind.
- K943 beyond its 2 reserved bits; K953 and K955-K958; G1 corners; K892.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`,
    rebased onto master with this brief. Its `node_modules` is a junction
    to the main checkout's.
  - Commit WIP at every milestone, broken or not. Never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with a new file name per revision: the dev server serves
    `.claude/` stale. Reusable harnesses go in tracked `scripts/`.
  - Dev server: `npm run dev -- --port 5381 --strictPort --host 127.0.0.1`
    in the worktree. Stop it at the end.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Main and `src/app/` write physics only through the host
    (`host_seam.test.ts`).
  - `npm test` passes at every milestone commit that touches `src/`.
- **Screenshots.** Use `scripts/diag_screenshot.mjs` or S1a's driver,
  never `--virtual-time-budget`. Probe links carry `&snd=none`.
- **Not allowed.** The phone, timing, `npm run build` in the main
  checkout, processes you did not start, Levi's Chrome profile and
  `LEDGER.md`.
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
  - the module layout: files and what each holds;
  - the bit layout and the z decision, with every reader of z;
  - per scene: S3a's columns for the app's label, beside v6's;
  - anything with no GPU form;
  - K964's diagnosis;
  - the paths of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).

## Handoff

The S3a2 agent stopped at 01:20 on 2026-10-28, with steps 1-5 done and
inside the 2 h cap (02:02). Branch `k868-s3a`, worktree
`.claude/worktrees/k868-s3a`, never pushed. Evidence is in
`.claude/probes/S3a/` (untracked).

### Steps and commits

- **Steps 1-4:**
  - `80800a03`: the label pass in src (pieces, programs, targets, app
    glue, the frame-loop hook).
  - `9640ce72`: the label app's hook on `globalThis`, the K299 lint's
    reviewed entry for the fill's s wrap, and the limits test.
- **Step 3**, the 255 fallback: past 255 chains or clusters, the app logs
  "K868 label pass: <why>; label ink off, the border look draws its own
  ink" and draws as master.
- **Step 4**, the caps: they are round on both ends. endSnap only clamps
  s inside `clusterAt`, so a cap gets the end's s and cluster, as in the
  oracle.
- **Step 5:** the checks below, with no further src change.
  - The suite is green (`test_s3a2_c.log`: 180 files, 2378 tests),
    including the golden snapshot and K320's `k320_slim` budgets.

### Module layout

- **`src/render/label/label_pieces.ts`** (pure CPU):
  - Tube pieces: v6's, split where z bends and at every cluster switch.
  - Fill pieces: one per drawn corner, the g1 wedge. g2 corners are
    skipped (0 at defaults).
  - Arm windows and crossing rows in the data texture (`DATA_W` 2048).
  - `labelLimits()` (255 chains, 255 clusters) and `buildLabelPieces(m)`.
- **`src/render/label/label_glsl.ts`:** the tube and fill programs,
  PACKED or WIDE by a `#define`. Its header holds the bit layout.
- **`src/render/label/label_pass.ts`:** the targets L, D2 and T, plus
  `read()` for probes. One render:
  1. clear L to 0 and D2 to 1;
  2. draw the tubes;
  3. blit L to T;
  4. draw the fills into L and D2.
- **`src/render/label/label_app.ts`** (its header maps the four files):
  - When to rebuild: the paint count changed and the knot sleeps, or 2
    quiet frames have passed.
  - The FieldModel params: `labelOnly`, CR 3, k883 spans.
  - The camera, taken from the root's transform.
  - `resetState()` after a render, and the fallback.
  - `globalThis.__knotLabel`: stats, pieces, camera, packed,
    `renderNow`, `setWide`, `read`.
- **`src/render/field/scene_export_hook.ts`:** `gatherSceneInput(ctx)`,
  one frame's scene input. The label app and `__knotSceneExport` share
  it.
- **`src/render/field/oracle.ts`:** `labelOnly` skips the work the label
  does not read.
- **`src/app/frame_loop.ts`:** `labelFrame` imports `label_app` lazily
  when the border look and `labelInk` are both on. It disposes the app
  otherwise, and re-creates it after a lost context.
- **Tests:**
  - `test/render/label/label_limits.test.ts`.
  - One reviewed `ROUNDED_QUOTIENTS` entry in
    `test/render/paint_ring_lap.test.ts`: the fill's closed-chain s wrap,
    `mod(dd + 0.5 * e.w, e.w)`, which is ambiguous only at the antipode.

### Bit layout and the z decision

**Packed** (the app's default) is one R32UI word:

| bits | field |
|---|---|
| 0-7 | chain + 1 (0 = paper) |
| 8-18 | s11 = round((s - s0) / len * 2047) |
| 19-26 | cluster + 1 (0 = none) |
| 27 | fill |
| 28 | cap |
| 29 | closed |
| 30-31 | reserved (K943) |

**Wide** (`setWide`, for probes) is RGBA32UI:
- x = chain + 1 | fill << 16 | cap << 17 | closed << 18
- y = the float bits of s
- z = cluster + 1
- w = the float bits of z

**z leaves the word.** The depth target D2 holds it. D2 is
DEPTH_COMPONENT32F and a texture, so a later pass can sample it (K915).
Every reader of z:
1. Pass 1's depth test, tube against tube.
2. Pass 2:
   - A fill against the tube under it decides by the yield. That reads
     T's chain, s and cluster, not z.
   - A fill against a fill is ordered by D2.
3. The oracle's `evalLabel` and `simLab` read no z.
4. K915's band pass can sample D2.
5. Probes read WIDE's w, or `depthAt` on the CPU.

**Memory:**
- Packed: L 4 + D2 4 + T 4 = 12 B/px, which is 13.4 MB at 1240x900.
- Wide: 36 B/px.
- Plus the data texture: muse_hash uses 67 rows, about 2.2 MB.
- On def's export grid: 32.07 MB packed, 96.2 MB wide.
- T is a copy of L after the tubes, because WebGL2 cannot sample the
  target it draws to.

### The 12 scenes beside v6

The columns are agree / extra / missTube / wrongTube / wrongFill /
missFill, on the oracle's label grid (`label7/a/`).
- **W2:** wide, both passes.
- **P2:** packed, both passes. This is what the app runs.

| scene | v6 | W2 | P2 |
|---|---|---|---|
| def | 283828/2/7/5/1/0 | 283828/3/7/4/1/1 | 283823/3/7/4/6/1 |
| fat | 253898/3/1/3/0/0 | 253899/4/1/2/0/0 | = W2 |
| g41_def_tw42 | 361005/7/8/1/0/0 | = v6 | = v6 |
| g41_def_tw64 | 225613/5/4/5/0/0 | = v6 | 225569/5/4/27/22/0 |
| g41_ring_tw42 | 94261/3/1/2/0/0 | 94260/3/2/2/0/0 | = W2 |
| g41_ring_tw64 | 59117/2/0/0/0/0 | = v6 | 59114/2/0/0/3/0 |
| g41_user_tw42 | 151668/1/3/0/0/0 | = v6 | = v6 |
| g41_user_tw64 | 93631/3/0/0/0/0 | = v6 | 93626/3/0/5/0/0 |
| muse_default_tw | 281169/7/5/1/0/0 | = v6 | = v6 |
| muse_hash | 173552/4/1/4/0/0 | 173550/4/1/6/0/0 | 173538/4/1/9/9/0 |
| ring | 65859/0/2/1/0/0 | 65859/1/2/1/0/0 | 65858/1/2/1/1/0 |
| user_tw42.lightpaper | 151666/2/1/1/0/0 | 151665/4/1/2/0/0 | = W2 |

**Tubes only:** packed and wide (P1 and W1) are the same on all 12
scenes. Against v6's tube-only counts:
- muse_hash is identical.
- g41_def_tw42 moves one cell: extra 7 -> 6, paper +1.
- def: agree +2, extra +1, wrongTube -1, wrongFill -1.

**W2 trails v6 on 5 scenes**, by 1-3 wrong cells each: def,
g41_ring_tw42, muse_hash (class C below), ring and lightpaper.

**P2 against W2:** every cell that differs only when packed is a fill
decision. Chain and cluster diffs per scene:

| scene | chain diffs | cluster diffs |
|---|---|---|
| def | 5 | 0 |
| muse_hash | 12 | 0 |
| g41_def_tw64 | 38 | 6 |
| g41_ring_tw64 | 0 | 3 |
| g41_user_tw64 | 3 | 2 |
| ring | 0 | 1 |
| the other six | 0 | 0 |

- On g41_def_tw64, 22 are a GPU fill over the oracle's tube and 22 are
  the wrong fill.
- The cause is inferred, not isolated: pass 2 reads T's 11-bit s in the
  yield's |ds| <= sigma test and in its nearest-crossing test.

**Fill against fill where the oracle's z tied** (dzOverTie, decided by
depth on the GPU): muse_hash 9, g41_def_tw64 30, g41_ring_tw42 9,
g41_ring_tw64 28, g41_user_tw64 26, muse_default_tw 2, lightpaper 1.

**In the app** (`live7/`): stride 2, 1240x900, one frozen frame, with the
oracle on the same frame. The columns are agree / extra / missTube /
wrongTube / wrongFill.

| run | counts |
|---|---|
| def, worker | 86446/2/2/0/1 |
| def, phw=0 | 86444/4/3/3/1 |
| muse_hash, worker | 113637/5/4/3/8 |

The app's pieces are bit-identical to pieces built from the scene export
(`piecesSameAsExport`).

### K964's diagnosis

**Class A, edge ties.** These are all 4 of def's wrong tubes and 3 of
muse_hash's 6.
- Observed:
  - The oracle's chain lies at d/h 0.9999-1.0001, about 0.003 px from
    the tube's edge.
  - CPU replays of the tube pass agree with the oracle, in float64 and
    in a float32 emulation (`dbg_lower7_*.log`).
- Inferred: the GPU differs because it interpolates vP in float32.
- Sites:
  - def (25.94, 9.11): chain 31 against 67.
  - def (33.35, 34.10): chain 61 against 75.
  - def (23.92, 24.81) and (10.38, 29.31).
  - muse_hash (32.75, 10.34), (27.58, 33.29) and (2.12, 33.67).

**Class B, the same chain covering a pixel twice on a steep z flank.**
At muse_hash (15.65, 19.77):
- Chain 66's pieces 23447 (z -0.033) and 23448 (z 0.007) both cover the
  pixel.
- The GPU keeps the larger z, so chain 66 beats chain 53 (z 0.000).
- The oracle takes z at the nearest point.
- This is a design difference with no exact GPU form.

**Class C, confirmed: the oracle's fill loop depends on the order in
which it visits clusters** (`dbg_fill7b_muse_hash.log`). At muse_hash
(19.908, 21.895) and (19.832, 21.971):
- The oracle's order is [25, 30]:
  1. J25 (nearest chain 10 at s 3.224, z -0.928) wins over chain 85's
     tube by fillOrder.
  2. J30 (nearest chain 85 at s 9.662, z -0.096) then takes the pixel
     back by z. Once S is a fill, `cs[S].d < h` is false, so fillOrder
     no longer applies.
  3. The result is chain 85, not a fill.
- Reversed, [30, 25]: J25's fill wins, which is what the GPU draws.
  FILL_FS discards J == T.cl, which amounts to the reversed order.
- At both sites, inFill (corner 73) is true and fillOrder(25, 85, s) is
  true.
- This accounts for muse_hash's +2 against v6.

**Open ends:**
- extra-at-end cells: 1-2 on 4 scenes.
- miss-tube-at-end: 1 on ring.
- muse_hash's extra at (462, 186) is chain 64, s 0, cap 1.
- def's wrongFill at (658, 548) shows in the app on both hosts.

### No GPU form

- Fill against fill is ordered by depth, not by the oracle's sequential
  better/fillOrder (class C).
- Where one chain covers a pixel twice, its z is the larger of the
  covering pieces' (class B).
- g2 corners are skipped (0 at defaults).

### Gameplay with the flag on (step 5: listed, not fixed)

The probe is `gp7/`: `?s=b&am=instant&snd=none&tlk=border&fw=0&phw=0`,
4 moves toward the exit, then frozen with the clocks pinned.
- **Markers** draw as before: the start, the head with its glow, and the
  finish flag (`on_fog`).
- **The trail** draws, but it is cut into dashes at under-crossings, with
  nothing drawn across the gaps. The thread over it has no ink until
  S3a3.
- **No threads** show in the border look. This is expected until S3a3.
- **Off against on:** 108652 px change (max delta 189, box
  210,46-1007,853).
  - All of it is thread outlines.
  - The trail looks lighter where the ink used to overlap it.
  - The markers are unchanged.
- **Fog:** only the dashed trail shows, and the fog holes reveal nothing.
- **Thread reveal** (`xp=threads`): the trail is continuous, with the
  frontier halos.
  - The label marks 366838 px (33% of the frame) while only the trail
    shows, so the label ignores the thread reveal.
  - It likewise ignores fog, the appearance reveal and plucks.
- **Labelled pixels:** on_trail 345841, on_fog 305211.
- **`lost` 1 in every run, flag off included.** This is Pixi's own
  `isWebGLSupported` test canvas, which calls `loseContext()` on
  purpose. That is inferred from Pixi's source; the app's readback
  stayed nonzero.
- **Flow on, at rest** (`flow_watch`): over 3 s, 3 rebuilds and 3
  renders (595 -> 598), clusters 117 -> 115.

### Flag off

0 px against master's shots (`ab/m3`) on def (hash 910ff135) and
muse_hash (hash 733ee14a), in `ab/s3a2_off/`. The older `ab/master`
shot of muse_hash is stale: master against m3 differs by the same 64878
px.

### Crops looked at

All in `.claude/probes/S3a/gp7/`: `on_trail.png`, `on_trail_head.png`,
`off_trail_head.png`, `diff_off_on_trail.png`, `on_fog.png`,
`on_threads.png`.

### Residuals

1. The label is stale while the knot moves. It is built on the main
   thread, and only when the knot sleeps or after 2 quiet frames.
2. With flow on, every repaint at rest rebuilds the FieldModel (3 in
   3 s). S3b should time it.
3. The label ignores the thread reveal, fog, the appearance reveal and
   plucks.
4. ctrlArc is fixed at 0.47 and CR at 3 in the label app's params.
5. The camera assumes no rotation or pivot.
6. The panel's labelInk checkbox does not refresh after the 255
   fallback.
7. The K299 reviewed site (the fill's s wrap).
8. Packed s is 11 bits, and the fill's yield reads it from T. This is
   P2's extra cells, up to 44 on g41_def_tw64. One option: an exact-s
   attachment for T (+4 B/px).
9. K964 classes A, B and C. For class C: should the oracle make its
   fill loop independent of order?
10. The open ends listed above.
11. On screen, the trail shows bare gaps at under-crossings until the ink
    lands.

### Next

S3a3: the band pass and the ink, drawn from the label (K915). Consider
an exact-s T for the fill's yield first (residual 8).

### How to rerun

- **Dev server**, in the worktree:
  `npx.cmd vite --config .claude/probes/S3a/vite.private-cache.config.ts --port 5381 --strictPort --host 127.0.0.1`
- **The 12 scenes:**
  `node .claude/probes/S3a/label_run7.mjs http://127.0.0.1:5381 <outDir> <scene,...> [stride]`
  (`label_check7.html` and `label_check_v7.ts`).
- **The app:** `live7_locked.ps1` (`label_live7.mjs`, under the perf
  lock).
- **Flag off:** `ab7_locked.ps1`, then `pngdiff.ts`.
- **Gameplay:** `gp7_locked.ps1` (`gameplay7.mjs`).
- **K964:** `dbg_lower7.ts`, `dbg_fill7.ts` and `dbg_fill7b.ts`, each
  run as `node node_modules\vite-node\vite-node.mjs <file> <scene> [run]`.

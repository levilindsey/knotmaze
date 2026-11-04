# K1040 S3d (K1097): a vertex-light tent for the Pixel's 2 ms

The coordinator's brief, 2026-11-03. One stage. Branch
`worktree-agent-aaf87e9d3775b20e4`, worktree
`.claude/worktrees/agent-aaf87e9d3775b20e4`, never pushed.

## Where S3c left it

S3c's tent pass (`fb483083`: `label_b_tent_glsl.ts`, the tent mode of
`label_b_pass.ts`) cut the label's cost 1.6-3.8x and still missed the
Pixel's 2 ms gate by 2-5x. Its label cost, by K923's method (p50 minus
floorall), was 4.7-11.2 ms over the 12 scenes, and 4.1-10.2 ms with
lr 2 (`docs/design/K1040_s3c_label.md`, "F11, measured").

F10 inferred from the desktop that the tents are bound by vertices and
primitives, not by shading:
- muse_hash draws 23,349 segment strips of 12 vertices;
- NW 32's 70 vertices cost 2.8-4.9x;
- lr 2 saves a fixed 0.12 ms.

The phone's lr 2 result agrees. The Pixel 11 is a PowerVR tiler, which
bins every primitive.

## The stage

Cut the tent pass's vertices and primitives until the Pixel's label
cost is at most 2 ms on all 12 scenes. If no vertex-light tent gets
there, show it by measurement and say what bounds it.

0. Run `Get-Date`. Rebase the branch onto `origin/master` (fetch first).
   Adopt K1142's shared phone check in the S3 phone kit: the four
   changes in the Handoff of `docs/design/K1142_phone_guard.md`. Run
   `npm test`, then commit.
1. Measure before you build. Run one cheap phone batch that separates
   primitive cost from vertex cost and fragment cost, so the build aims
   at the measured bound. For example:
   - the tent at half its strips;
   - the tents with a trivial fragment shader;
   - the same primitives with fewer vertices.

   Re-run the tent control in the same batch: F11's tent run overlapped
   another agent's adb read (about 2 s at 09:44:47).
2. Build the vertex-light tent as a new tent mode beside S3c's. Leave
   S3b's draw and S3c's tent unchanged, as controls. The approach is
   yours to choose; weigh these directions against step 1's results:
   - one continuous strip per chain run instead of one per segment
     (shared cross-sections, no inner caps);
   - tents only where a label is read (the junctions' reach) instead of
     over the whole fabric;
   - fewer facets where the cone is flat;
   - instancing.
3. Run the gate in one batch:
   - the Pixel, by the phone commands in the S3c Handoff: the control
     `fit`, `tent`, the new mode and `floorall`;
   - the desktop census (`verdict`) and timer (`time`), by its desktop
     commands.

   To pass, all three hold:
   - the Pixel's label cost is at most 2 ms on every scene;
   - the census is no worse than S3c's tent: 794 DEFECT, 504 of them at
     0.03 px or more;
   - the control's census is unchanged: 0 DEFECT.

Out of scope, for S3e after this gate: F4's merge scan, F6's SNAP, F8's
sharp joints, lr 2's class (F9) and the float64 mirror (F12).

## Rules

- **Worktree only.** A Muse agent is committing on master in the main
  checkout (`C:\Users\lsl\Repositories\knotmaze`). Never edit files
  there, never run git there except `fetch`, and never push.
- **Commits.** Commit WIP at every milestone, broken or not. Probes and
  results stay in `.claude/probes/K1040/s3/` (tracked when reusable).
- **Timing.** Every timing runs under the perf lock; `run_locked.ps1`
  and `run_phone.ps1` take it.
- **The phone.**
  - Before each run, run the shared ready check: launcher in front, no
    touch for 120 s before the first run and 20 s before each later one.
  - Run through `run_phone.ps1`, which also takes the phone lock.
  - Links carry `&snd=none`. Send no key or input event.
  - Stop at the first non-zero exit. If the phone isn't ready by your
    cap, end with the desktop results.
  - Never run `scripts/phone.ps1`. Keep serials, IPs and Tailscale names
    out of tracked files.
- **Ports.** Your dev server uses 5403 (the ledger's env line). Avoid
  5173, the phone's 5480-5489, Muse's 5500-5599 and K1139's 5620-5639.
- **Reading code.** Read it through the shell: `Select-String`, then
  `Get-Content <f> | Select-Object -Skip <n> -First <m>`. Use the Read
  tool only right before an Edit. No helpers.
- **The stop.** Stop when the stage is done or 2 h after step 0's
  `Get-Date`, whichever comes first.
  - Run `Get-Date` at each milestone.
  - A compaction is not a stop. After one, re-read this brief and
    `git log`.
  - At the stop, commit. Then append a Handoff to this brief and commit
    again. The Handoff gives what landed (commit by commit), the before
    and after table, the commands, and the next step.
  - Then report: the gate's verdict, the table, a `Ledger items` list,
    and K1097's handle fields (owner, branch and last commit, evidence,
    next, brief, env).

## Handoff

Stopped at 11:50, at the end of step 3 and before the cap (about
12:13). Branch `worktree-agent-aaf87e9d3775b20e4` (base `0385f19d`),
never pushed; master untouched.

**Verdict: the gate is not met.** The census holds; the Pixel's time
does not.
- The census: the vertex-light tent (mode `tentv`) gives S3c's tent's
  census exactly: 794 DEFECT, 504 of them at 0.03 px or more, and the
  same class and bucket counts, covered and gpuCovered on every scene.
  The control's is unchanged: 0 DEFECT.
- The Pixel: tentv's label cost is 4.1-9.4 ms over the 12 scenes
  (median 5.8), against S3c's tent's 5.0-11.6 (median 7.8): 0.2-3.8 ms
  less (median 2.0), but over 2 ms on every scene. fit and tent were
  measured at 11:08-11:12 (batch s3d), tentv and floorall at
  11:33-11:36 (batch s3dr). On one page (s3d2), tent - tentv is 1.6
  (0.4-3.7).

**What bounds it.** No tent drawn in this pass gets to 2 ms as the gate
measures it. The pass's fixed part alone is 2.0 ms or more on every
scene in both one-page runs, so nothing drawn fits beside it. The
tents' own drawing is over 2 ms by itself too, on 9 (s3d2) to 11
(s3d3) of the 12 scenes. The numbers below are differences on one
page, render-sync p50 in ms: the median, then the range over the 12
scenes (`out/split_s3d2.md`, `out/split_s3d3.md`, `out/s3d_table.md`).
- The fixed part (empty - floor) is 3.9 (3.0-4.7) on s3d2 and 2.9
  (2.0-3.6) on s3d3; s3d1 read 3.6 (2.9-4.1). That is an empty pass:
  the records uploaded, L and D cleared at 822x1506 and stored, then
  the 1-px readback. s3d3 splits it into three:
  - One render job's round trip costs nothing: kick - floor is -0.1
    (-1.1 to 0.7). kick is a 1x1 R32UI + D32F target, cleared and
    read back.
  - The full-size clears and stores (emptynoup - kick) are 2.1
    (1.3-3.1). D's share could not be measured: invalidating D after
    the draws (emptyinv, tentvinv) does not save its store on the
    Pixel; it adds 31-34 ms a pass on every scene (s3d2; tentvinv -
    floor is 33.3-42.2). K923's invalidated D24 renderbuffer showed
    nothing like it. The mechanism was not tested.
  - The record upload (empty - emptynoup) is 1.1 (0.5-1.5) on s3d3 and
    1.1 (0.2-2.2) on s3d2, for 212-410 KB a pass [S3e: 212,992-901,120 B a pass, by `uploadBytes`].
- The vertex-light tent's own drawing (tentv - empty) is 3.0 (1.2-3.5)
  on s3d2 and 2.8 (1.3-4.4) on s3d3. Under 2 ms: ring, g41_ring_tw42
  and g41_ring_tw64 on s3d2; g41_ring_tw42 alone on s3d3.
  - Nearly all of it is its vertices: VS(v), the same draw with every
    vertex clipped, is 2.1 (1.3-2.7), and raster(v) is 0.4 (-0.3 to
    1.3) (s3d2).
  - tentv's VS does little since the span search moved to the CPU, so
    what binds is most likely the vertex count itself (inferred, not
    isolated): S3c's geometry, 23,349 segment strips of 12 vertices on
    muse_hash. s3d1's half-segments run (tent - half) cut 1.7 of the
    tent's 3.2 past the empty pass.
- What S3d cut: tent - tentv is 2.0 (0.2-3.8) in the gate's runs and
  1.6 (0.4-3.7) on one page (s3d2). The desktop moves the same way but
  less: the gpu p50 median goes from 0.629 to 0.484.
- K923's 2 ms is not the same measure, so the gate is stricter than
  the budget it came from.
  - K923's floor (`v=floor` in `.claude/probes/K923/bench.js`,
    `passes()`) cleared the full-size default framebuffer before its
    1-px readback.
  - K923's label pass uploaded nothing per frame. Its depth was a D24
    renderbuffer, invalidated after the draw (line 549).
  - S3's floorall is the readback alone (`page.ts` opts.floor, whose
    comment wrongly calls it K923's floor). S3's pass uploads its
    records every pass and stores its D32F depth, which S4 samples [S3e: S4 samples nothing from D].
  - The kick run shows the missing render job costs nothing here. The
    gap is the upload and D's store, which invalidation could not
    isolate on this stack.

**Landed, commit by commit.** S3c's five commits (`af758b10` to
`b4d9e302`) sit under these on the branch: step 0 rebased them and the
brief onto `0385f19d`.
- `210b87c6` this brief (the coordinator's `3ff68698`, rebased).
- `75821beb` step 0: the S3 phone kit on K1142's shared ready check
  (the four changes of its Handoff; `phone_quiet.mjs` removed);
  `npm test` green.
- `02ba1a30` `phone_batch.ps1`, left out of the last commit
  (`.claude/probes` is ignored, so a new file there needs `git add -f`).
- `9fd18782` step 1: `page.ts` `timeMany()`, which interleaves the tent
  control and its variants on one page (empty, noup, degen, fs0,
  fsconst, half, nw1, floor). Also LabelBPass's probe knobs
  (`probeDraw`, `probeSegFrac`), whose defaults draw as before, and
  `phone_time.mjs --variants`.
- `508c8103` step 1's Pixel run (s3d1) and `split.mjs`. Medians: the
  fixed part 3.6 ms (2.9-4.1), the vertex shader 2.8, the varyings
  2.2.
- `b156f016` step 2: the vertex-light tent, mode `tentv`, beside S3c's
  tent.
  - It keeps S3c's geometry: the same strips, vertices and primitives,
    with `gl_Position` invariant.
  - The span search moves to the CPU (`tentSpanRecord`): one record
    per point, on unit 5, in place of nb, which no tent reads.
  - The 15 flat components become one flat ivec3, and the FS runs
    S3c's arithmetic.
  - Pins: `test/render/field/label_b_tentv.test.ts`. `srccheck.ts`
    checks that S3b's and S3c's sources are byte-identical to
    508c8103.
  - New variants: tentvdegen, tentvinv, emptynoup, emptyinv, uponly.
- `e80fb6ab` step 3: the desktop census (s3dctl, s3dtent, s3dtentv),
  the kick variant and `s3d_kick.ps1`.
- `b56d4d8f` the gate batch, cut at its third run: another agent held
  the perf lock from 11:12:55, past `run_phone.ps1`'s 5 min wait. Also
  `s3d_table.mjs`, and `phone_batch.ps1` now logs a throw as a stop.
- `e63ab2ec` the rest of the gate: the s3dr batch (tentv, floorall,
  and the kick split s3d3), the desktop timers, s3d2 and the tables.
- This commit: this handoff.

**Before and after** (dpr 2, the 12 scenes, oracle30's classes).
- The desktop row is the timer query's gpu p50: the range over the 12
  scenes, then the median.
- The Pixel row uses K923's method: p50 minus floorall's p50, as the
  range over the 12 scenes.

| | S3b's pass (control) | S3c tent | S3d tentv |
|---|---|---|---|
| DEFECT | 0 | 794 | 794 |
| of them at 0.03 px or more | 0 | 504 | 504 |
| desktop gpu p50, ms | 0.760-3.873 (1.824) | 0.350-0.976 (0.629) | 0.312-0.732 (0.484) |
| Pixel label cost, ms | 9.6-38.5 | 5.0-11.6 | 4.1-9.4 |
| Pixel, median | 21.7 | 7.8 | 5.8 |

The Pixel per scene, K923's method (`out/s3d_table.md`, the gate's
runs: s3dfit and s3dtent at 11:08-11:12, s3dtentv and s3dfloorall at
11:33-11:36):

| scene | S3b capsule (fit) | S3c tent | S3d tentv | tent - tentv | tentv <= 2 ms |
|---|---|---|---|---|---|
| muse_hash | 38.5 | 10.8 | 7.0 | 3.8 | MISS |
| muse_default_tw | 22.8 | 10.0 | 7.1 | 2.9 | MISS |
| def | 24.1 | 10.9 | 8.5 | 2.4 | MISS |
| fat | 20.0 | 6.7 | 5.7 | 1.0 | MISS |
| ring | 11.4 | 5.8 | 4.6 | 1.2 | MISS |
| user_tw42.lightpaper | 15.2 | 6.1 | 5.6 | 0.5 | MISS |
| g41_def_tw42 | 21.7 | 11.6 | 9.4 | 2.2 | MISS |
| g41_def_tw64 | 25.4 | 10.7 | 7.4 | 3.3 | MISS |
| g41_ring_tw42 | 9.6 | 5.0 | 4.8 | 0.2 | MISS |
| g41_ring_tw64 | 12.5 | 5.1 | 4.1 | 1.0 | MISS |
| g41_user_tw42 | 14.7 | 6.2 | 4.7 | 1.5 | MISS |
| g41_user_tw64 | 25.0 | 7.8 | 5.8 | 2.0 | MISS |
| median | 21.7 | 7.8 | 5.8 | 2.0 | |
| max | 38.5 | 11.6 | 9.4 | 3.8 | |

The bound per scene, from s3d3 (one page: kick, emptynoup, empty,
tentv, floor). tentv and kick are each minus floor; store is
emptynoup minus kick, the empty pass emptynoup minus floor, the upload
empty minus emptynoup:

| scene | tentv | kick | store | empty pass | upload | tentv - kick | tentv - empty |
|---|---|---|---|---|---|---|---|
| muse_hash | 7.2 | 0.1 | 2.3 | 2.4 | 1.1 | 7.1 | 3.7 |
| muse_default_tw | 6.4 | -1.1 | 2.0 | 0.9 | 1.1 | 7.5 | 4.4 |
| def | 7.7 | -0.3 | 2.4 | 2.1 | 1.5 | 8.0 | 4.1 |
| fat | 5.8 | 0.2 | 1.9 | 2.1 | 1.0 | 5.6 | 2.7 |
| ring | 4.4 | 0.2 | 1.3 | 1.5 | 0.8 | 4.2 | 2.1 |
| user_tw42.lightpaper | 5.4 | -0.1 | 1.9 | 1.8 | 0.9 | 5.5 | 2.7 |
| g41_def_tw42 | 7.2 | -0.7 | 2.3 | 1.6 | 1.3 | 7.9 | 4.3 |
| g41_def_tw64 | 7.0 | -1.0 | 3.1 | 2.1 | 1.1 | 8.0 | 3.8 |
| g41_ring_tw42 | 4.9 | 0.7 | 2.1 | 2.8 | 0.8 | 4.2 | 1.3 |
| g41_ring_tw64 | 4.6 | 0.3 | 1.7 | 2.0 | 0.5 | 4.3 | 2.1 |
| g41_user_tw42 | 5.4 | -0.9 | 2.5 | 1.6 | 1.0 | 6.3 | 2.8 |
| g41_user_tw64 | 5.2 | -0.1 | 1.7 | 1.6 | 1.1 | 5.3 | 2.5 |
| median | 5.8 | -0.1 | 2.1 | 2.0 | 1.1 | 6.3 | 2.8 |

The vertex-light tent's and the fixed part's split, from s3d2 (one
page: tentv, tentvdegen, tentvinv, tent, empty, emptynoup, emptyinv,
uponly, floor). tentv, tent, uponly and tentvinv are each minus floor;
fixed is empty - floor, VS(v) tentvdegen - empty, raster(v) tentv -
tentvdegen, the upload empty - emptynoup, the empty pass emptynoup -
floor, D store empty - emptyinv, tentv D tentv - tentvinv:

| scene | tentv | tent | tent - tentv | fixed | tentv - empty | VS(v) | raster(v) | upload | uponly | empty pass | D store | tentv D | tentvinv |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| muse_hash | 7.2 | 10.5 | 3.3 | 3.9 | 3.3 | 2.0 | 1.3 | 2.2 | 0.9 | 1.7 | -30.9 | -31.4 | 38.6 |
| muse_default_tw | 7.0 | 10.0 | 3.0 | 3.9 | 3.1 | 2.2 | 0.9 | 1.9 | 1.5 | 2.0 | -34.2 | -34.0 | 41.0 |
| def | 8.0 | 11.7 | 3.7 | 4.5 | 3.5 | 2.7 | 0.8 | 1.7 | 1.9 | 2.8 | -31.6 | -34.2 | 42.2 |
| fat | 6.9 | 7.3 | 0.4 | 3.8 | 3.1 | 2.1 | 1.0 | 0.9 | 2.1 | 2.9 | -32.7 | -30.2 | 37.1 |
| ring | 4.9 | 6.2 | 1.3 | 3.0 | 1.9 | 2.2 | -0.3 | 0.6 | 1.2 | 2.4 | -33.5 | -28.4 | 33.3 |
| user_tw42.lightpaper | 6.0 | 7.4 | 1.4 | 3.6 | 2.4 | 2.1 | 0.3 | 0.9 | 2.2 | 2.7 | -32.9 | -32.5 | 38.5 |
| g41_def_tw42 | 7.7 | 10.7 | 3.0 | 4.7 | 3.0 | 2.6 | 0.4 | 1.4 | 1.8 | 3.3 | -32.2 | -33.0 | 40.7 |
| g41_def_tw64 | 7.3 | 10.4 | 3.1 | 4.1 | 3.2 | 2.2 | 1.0 | 1.5 | 1.6 | 2.6 | -32.1 | -31.3 | 38.6 |
| g41_ring_tw42 | 5.0 | 6.3 | 1.3 | 3.6 | 1.4 | 1.7 | -0.3 | 0.2 | 0.7 | 3.4 | -32.1 | -33.0 | 38.0 |
| g41_ring_tw64 | 5.4 | 5.9 | 0.5 | 4.2 | 1.2 | 1.3 | -0.1 | 0.8 | 1.2 | 3.4 | -31.7 | -31.8 | 37.2 |
| g41_user_tw42 | 6.1 | 7.1 | 1.0 | 3.8 | 2.3 | 1.9 | 0.4 | 1.1 | 1.8 | 2.7 | -32.6 | -32.9 | 39.0 |
| g41_user_tw64 | 6.0 | 7.6 | 1.6 | 3.9 | 2.1 | 1.9 | 0.2 | 0.4 | 1.3 | 3.5 | -31.8 | -31.1 | 37.1 |
| median | 6.9 | 7.6 | 1.6 | 3.9 | 3.0 | 2.1 | 0.4 | 1.1 | 1.6 | 2.8 | -32.1 | -31.8 | 38.6 |

No run was touched (the phone guard's flag, in `out/s3d_table.md`).

**Commands**, from the worktree root, with
`$s3 = '.claude\probes\K1040\s3'`. Desktop, each run under the perf
lock (owner K1040-S3d):

    & "$s3\run_locked.ps1" -RunArgs @('verdict', '--tag', 's3dctl')
    & "$s3\run_locked.ps1" -RunArgs @('verdict', '--tent', '1', '--tag', 's3dtent')
    & "$s3\run_locked.ps1" -RunArgs @('verdict', '--mode', 'tentv', '--tag', 's3dtentv')
    & "$s3\run_locked.ps1" -RunArgs @('time', '--tag', 's3dctl')
    & "$s3\run_locked.ps1" -RunArgs @('time', '--tent', '1', '--tag', 's3dtent')
    & "$s3\run_locked.ps1" -RunArgs @('time', '--mode', 'tentv', '--tag', 's3dtentv')
    node "$s3\defects_table.cjs" "$s3\out" s3dtent s3dtentv > "$s3\out\defects_s3d.md"
    node scripts/run_node.mjs .claude/probes/K1040/s3/srccheck.ts
    npm test

Phone: the Pixel is left at the launcher, on its charger.
- Every run goes through `phone_batch.ps1`, which runs `run_phone.ps1`.
- `run_phone.ps1` takes the phone lock and the perf lock, then runs
  K1142's shared ready check: no touch for 120 s before a batch's
  first run, and 20 s before each later one.
- The batch stops at the first non-zero exit, a throw included.
- The links carry `&snd=none`, and nothing sends a key or an input
  event.

    & "$s3\phone_batch.ps1" -Name s3d1 -Runs @('--fit 411x753 --label s3d1 --b2b --variants tent,empty,noup,degen,fs0,fsconst,half,nw1,floor')
    node "$s3\split.mjs" s3d1 "$s3\out\split_s3d1.md"
    & "$s3\s3d_gate.ps1" -Mode tentv
    & "$s3\s3d_kick.ps1"
    node "$s3\split.mjs" s3d2 "$s3\out\split_s3d2.md" s3d2
    node "$s3\split.mjs" s3d3 "$s3\out\split_s3d3.md" s3d3
    node "$s3\s3d_table.mjs" "$s3\out\s3d_table.md"

`s3d_gate.ps1` runs the control `fit`, `tent`, `tentv` and `floorall`,
then s3d2, then the tables (`out/phone_table_s3d.md`). This time it
stopped at its third run. The rest ran as two batches
(`out/step3c_s3d_1123.log`, `out/batch_s3dr_*.log`,
`out/batch_s3d2_*.log`):

    & "$s3\phone_batch.ps1" -Name s3dr -MaxWaitMin 10 -Runs @('--fit 411x753 --label s3dtentv --b2b --mode tentv', '--fit 411x753 --label s3dfloorall --b2b --floor', '--fit 411x753 --label s3d3 --variants kick,emptynoup,empty,tentv,floor') -Tables @('s3dtentv s3dtent s3dfit s3dfloorall -Floor s3dfloorall', 's3dtent s3dtentv s3dfit s3dfloorall -Floor s3dfloorall')
    & "$s3\phone_batch.ps1" -Name s3d2 -MaxWaitMin 5 -FirstQuietS 20 -Runs @('--fit 411x753 --label s3d2 --variants tentv,tentvdegen,tentvinv,tent,empty,emptynoup,emptyinv,uponly,floor')

s3d2 took the 20 s check as a later run of the same sequence: it
started at 11:38:18, 48 s after s3dr's last run ended.

**Next:**
1. A decision for Levi or the coordinator: what the gate reads.
   - As written (p50 minus floorall's), it counts the record upload and
     L's and D's clears and stores. An empty pass fails it: 3.0-4.7 ms
     with nothing drawn (s3d2; 2.0-3.6 on s3d3).
   - K923's budget held neither an upload nor a depth store.
   - Options: keep the gate and cut the fixed part first (item 2);
     gate the drawing past an empty pass (tentv - empty, 1.2-3.5, so
     tentv still misses on 9 to 11 of the 12); or gate the per-pass
     cost when passes pipeline as a frame runs them (an x2 variant,
     two passes per readback; not built).
2. The fixed part:
   - the upload (1.1, 0.2-2.2): upload only when the fabric moved, or
     only the rows that changed;
   - the clears and stores of L and D (2.1, 1.3-3.1): a smaller L (lr
     2, whose class is F9's), and whether ANGLE folds the clears into
     load ops;
   - D: S4 samples it [S3e: it does not], so its store stays unless S4 reads the depth
     from L's word. Invalidating the D32F texture cost 31-34 ms a pass
     on the Pixel, so try K923's setup (an invalidated renderbuffer)
     on the phone first.
3. The drawing: the vertex count most likely binds (VS(v) is 2.1 of
   tentv's 3.0 past the empty pass). Step 2's untried directions:
   continuous strips per chain run, tents only within the junctions'
   reach, fewer facets, instancing.
4. S3e: F4's merge scan, F6's SNAP, F8's sharp joints, lr 2's class
   (F9), the float64 mirror (F12).

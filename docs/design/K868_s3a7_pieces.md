# K868 S3a7: the pieces on the GPU, depth per fragment (stage brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Previous stage: S3a6
(`docs/design/K868_s3a6_motion.md`). Before anything else, read S3a5's
(`docs/design/K868_s3a5_incremental.md`) sections 4, 8, 10 and 11, then
S3a6's Coordinator's calls, F1-F3, F8, F9 and `## Handoff`. Ledger items:
K868 (this stage), K971 (the per-frame cost), K993 (the census's blind
spots).

In parallel, K992 (`docs/design/K992_corner_rules.md`, branch
`k992-corners`) works on the corner rules. This stage does not touch them.

## Why

The label's pieces (the tubes that carry each thread's depth through the
junctions) are rebuilt on the CPU every frame by `buildLabelPieces`, at
53-92 ms a frame (S3a5 section 4). S3a5 measured a form that holds still
from frame to frame: one instance per chain segment, placed on the GPU
from SAMP and an s table, with the cluster and the depth evaluated per
fragment from two small tables. Its CPU part took 0.15-0.21 ms at p50.
S3a6 found that the pops in motion come from the corner rules, not from
the pieces (F9), so the pieces can move to the GPU on master's rules now.

## Coordinator's calls (technical)

1. **Master's corner rules stand.** Do not edit `src/render/field/oracle.ts`
   or the corner and re-fit code; K992 owns them. With the flag off,
   nothing drawn changes; with it on, the only intended change is call
   4's depth order.
2. **The label stays a pure function of the frame** (S3a6 call 1). The
   from-scratch build is the definition. The tables are rebuilt each frame
   from that frame's data, into preallocated arrays; no warm state may
   change an answer.
3. **The pieces' form is S3a5 section 4's:** one instance per chain segment
   (chain row, k).
   - The vertex shader places the segment's tube from SAMP's two points.
   - The fragment shader takes s = s[k] + t·segLen[k], the cluster from
     the span table and the depth from the pin table.
   - The CPU writes three tables a frame: the s table (prefix sums), the
     span table and the pin table.
4. **Depth per fragment** (S3a6 call 3): the exact `depthAt` (`plateauDepth`'s
   pins: a binary search over the chain's pins, then the two pins'
   trapezoid), never a linear z between a piece's ends.
   - Ties break by a stable rank (the cluster's, else the chain's), never by
     draw order.
   - The checks' CPU reference (a Node function, not the app's flag-off
     path) evaluates depth and rank the same way, so the GPU path and the
     reference agree by construction. Master's CPU pieces keep their
     linear z.
   - List every place where the order differs from master's, with its depth
     gap (S3a5 section 4: the order can flip where depths are within 0.5%
     of the range).
5. **Behind a flag, default off.** Master's CPU pieces stay the default and
   the A/B.
   - Read how `lbi` is parsed (`src/ui/url_state.ts`) and follow its
     pattern. If `lbi` is in the codec table, append the new key there
     (`test/ui/param_codec.test.ts` pins the order).
   - Name the flag in the findings. The coordinator turns it on after the
     gates pass and Levi has seen it in motion.
6. **The strips, windows, fills and switch lines stay on the CPU** (they
   are S3a8). If the GPU pieces need a change there to line up, stop and
   report.
7. **The gates.** All must hold before the stage calls the pieces done.
   - **Same answer, positions.** Evaluate every tube vertex in float32, as
     the vertex shader does (`Math.fround` after each operation). Each must
     be within 1e-4 world of `buildLabelPieces`' vertex. Check in Node on
     the 12 scenes and every frame of the four sequences, as S3a5's
     `seq13_pieces.ts` did for its prototype.
   - **Same answer, depth.** The per-fragment depth equals the reference's
     `depthAt` at sampled fragments (s on a fine grid per segment), to
     float32 precision.
   - **The raster census** of the 12 scenes (S3a6's `raster14.ts`, F8):
     the flag on against master. Attribute every changed pixel to a
     depth-order flip or to float32 rounding; anything else is a bug. Crop
     and look at the largest.
   - **The pop census** (`scripts/label_pops.ts`), the four sequences at
     zoom 1 and in the maximum zoom's windows (Order step 1). Nothing new
     pops against master (the flag off): per
     sequence and zoom, no more pops a transition and no more pop area.
     Crop, look at and explain each pop that master does not have. The
     census does not track the pieces (K993), so a pop from them lands in
     "none" or on a nearby event.
   - **Cost,** under the perf lock. With the flag on, `buildLabelPieces`
     leaves the per-frame path, and the three tables take at most 0.25 ms
     p95 a frame on the four sequences. Report the GPU pass's time if the
     browser exposes a timer query, else the change in frame time.

## Goal

With the flag on, the GPU pieces draw what master draws, apart from the
listed depth-order flips. `buildLabelPieces` is out of the frame, and the
gates pass. If a gate fails, the findings say which one and why.

## Order

1. **The census's noise floor.** Start the dev server (port 5381). Rerun
   master's census at zoom 1 and compare it with `pops14/before14/`. Any
   difference is the census's noise floor; report it.
   - The maximum zoom's windows are K992's (its Order step 1): a fixed,
     committed list of windows at follow mode's scale, in a commit titled
     `K992: census windows` on branch `k992-corners`. Cherry-pick it when
     step 6 needs it (`git log k992-corners --oneline`). If it is not
     there by then, run zoom 1 only and list the maximum zoom as missing.
2. **The tables on the CPU** (the s table, the span table and the pin
   table), preallocated. Add Node tests that each matches its definition
   from the from-scratch build on the 12 scenes.
3. **The exact depth and rank** (call 4) in the checks' CPU reference.
   Add unit tests, and list the order flips against master on the 12
   scenes.
4. **The GPU pieces behind the flag:** the instances, the vertex and
   fragment shaders, and the tables uploaded each frame (row-partial
   uploads like `src/render/float_rows.ts` where they fit). Give the census
   page a way to turn the flag on, if it has none.
5. **The same-answer checks** in Node (positions, then depth), then the
   raster census.
6. **The pop census,** the flag on against off, at zoom 1 and in the
   maximum zoom's windows.
7. **Cost,** under the lock.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    The coordinator has fast-forwarded it to master with this brief. Its
    `node_modules` is a junction to the main checkout's.
  - Commit at every milestone, broken or not, and never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with `*15*` in new file names. Census runs take `--out
    .claude/probes/S3a/pops15`.
  - The census and its page are tracked (`scripts/`). Name every change
    to them in its commit message.
  - Write each finding into a `## Findings` section of this brief as you
    get it, not at the end. It survives a compaction.
  - Dev server: K868's `env:` command, port 5381. Stop it at the end.
- **Timing and the census.**
  - Every timing, and every census run, goes under the perf lock
    (`$env:TEMP\claude-perf.lock`). Use `.claude\probes\S3a\locked15.ps1`
    (the coordinator made it from `locked14.ps1`, with this stage's owner
    name). It waits inside one call while another owner holds the lock.
  - K992's agent runs the census on this machine too, and the cursive
    agent runs Python fits. Take each pair you compare back to back, and
    label the numbers taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time.
  - Update the tests and pins that your changes move, and name each one in
    the commit message.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`;
  - the corner rules (call 1).
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-7 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the step you are on and write down what is
    missing. What is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief, its
    `## Findings` and `git log`.
  - On stopping:
    1. commit;
    2. append a `## Handoff` to this brief (committed);
    3. report.
- **The final report** gives:
  - the census's noise floor;
  - the tables and their tests;
  - the flag's name;
  - the same-answer results: the largest position error, the depth check,
    and the order flips;
  - the raster census's attribution;
  - the pop census before and after, per sequence and zoom, with the crops
    you looked at;
  - the cost before and after;
  - anything that changes S3a8 or S3a10;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).

## Findings

### F1. The census's noise floor (08:25)

Master's census rerun at zoom 1 (`pops15/floor15/`, `--oracle
.claude/probes/S3a/oracle_m14.ts`, the same command as `before14`; `src/`
is unchanged since `c26a9875`), against `pops14/before14/`: the four
sequences' `transitions` records (every pop, its pixels, its cause and every
event) are byte-identical, so the noise floor is 0 pops and 0 px. Only the
page's build time differs (p50 282 / 299 / 495 / 472 ms against 272 / 389 /
653 / 675 ms). Pops a transition, as F3 of S3a6: def drag 0.15 (6 pops,
359 px), def flow 0.68 (27, 1078), muse drag 1.93 (77, 1273), muse flow
6.65 (266, 7368).

### F2. The tables on the CPU (08:38)

`src/render/label/label_tables.ts`: `LabelTableBuilder.build(m)` writes one
RGBA32F table a frame into preallocated arrays (grown by 1.25x, never
shrunk): a chain table (3 texels a chain: point, span and pin bases and
counts, `closed`, `len`, `s0`, `1 / len`), the points (`x, y, s, segLen` at
each segment's start, plus the chain's end point: the label's polys, not
SAMP), the spans (a sorted partition of `[s0, s0 + len]`, `(lo, cluster,
rank)`, `clusterAt` resolved between every two span bounds) and the pins
(`s, z, rL, rR`), plus the instance list (chain, k) and the depth
normalizers (`zmin`, `zr`, `smax`, `nKeys`, master's definitions). The rank
is master's: keys `1e6 + cluster` or the chain's id, ranked among the keys
present. Its float32 reference (`refPoint`, `refS`, `refCluster`,
`refDepth`, `refFragDepth`) is what the shaders will compute, op for op.

Checks (`test/render/label/label_tables_check.ts`; probe
`.claude/probes/S3a/tables15.ts`, logs `tables15_seq.log`), each table
against its definition from the from-scratch build:
- points: 0 mismatches on the 12 scenes; every `buildLabelPieces` tube
  vertex against the table's point at the tube's s in float32: largest
  5.91e-5 world (fat, a 20 000-sample chain at s near 636), every other
  scene and every frame of the four sequences 1.53e-5 or less, under the
  1e-4 gate.
- spans: `refCluster` against `FieldModel.clusterAt` on 33 points a
  segment (770 517 on muse_hash): 2 misses on the 12 scenes, both within an
  ulp of a span bound, 0 elsewhere; on the sequences (9 a segment, 164
  frames) 237 misses, all within an ulp of a bound. Every master tube's
  cluster and rank: 0 misses on the 12 scenes; on the sequences 2 tubes
  (def drag f14, muse flow f39), both shorter than 2e-6 world and within
  2e-6 of a bound (the tube's own float32 ends), so 0 beyond float32.
- pins: `refDepth` (float32) against `depthAt` at the same s: at most
  4.0e-5 of the depth range (fat, s near 636), 1.2e-5 on the sequences;
  against `depthAt` at the float64 s, 1.3e-4 (fat; the float32 s itself).
- keys, `nKeys`, `zmin`, `zr`, `smax`: identical to `buildLabelPieces` on
  every scene and frame.
`test/render/label/label_tables.test.ts` runs the same checks on the 15
tracked field scenes, a reused builder against a fresh one (identical
tables after other frames: no warm state), and the depth formula's order.

### F3. Exact depth, rank and the order flips (09:20)

The GPU pieces' depth is `refFragDepth`, op for op: the exact `depthAt` from
the pin table at the fragment's s (a closed chain wraps s onto its lap in
float32, `u - len * floor(u / len)`, listed in K299's `ROUNDED_QUOTIENTS`),
the rank of the span the s falls in, and master's formula
(`0.5 - 0.45 z' - 2e-4 rank / nKeys - 2e-6 s / smax`). Master's CPU pieces
keep their linear z. `.claude/probes/S3a/raster15.ts` lists the places where
the two orders differ (`pops15/raster15/flips15.md`): it samples every
master tube at h / 4, pairs samples of different keys (or of one chain more
than 4 h apart along it) within 2 h, keeps a pair whose front differs
between master's depth (linear z, the piece's rank) and the GPU's (exact z,
the span's rank) or ties exactly, and merges pairs within 2 h into places.

| scene | places | largest exact z gap at a flip (% of range) | master's largest linear error (%) |
|---|---|---|---|
| def | 388 | 0.0303 | 0.0015 or less |
| fat | 0 | - | 0.0015 or less |
| g41_def_tw42 | 442 | 0.0198 | 0.0015 or less |
| g41_def_tw64 | 330 | 0.0244 | 0.0015 or less |
| g41_ring_tw42 | 61 | 0.0036 | 0.0047 |
| g41_ring_tw64 | 51 | 0.0298 | 0.0015 or less |
| g41_user_tw42 | 166 | 0.0067 | 0.0015 or less |
| g41_user_tw64 | 126 | 0.0265 | 0.0015 or less |
| muse_default_tw | 358 | 0.0245 | 0.0015 or less |
| muse_hash | 287 | 0.0253 | 0.0015 or less |
| ring | 55 | 0.0037 | 0.0015 or less |
| user_tw42.lightpaper | 166 | 0.0053 | 0.0015 or less |

Every flip is a near-cancellation: the z gap is offset by the rank term
(2e-4 of the depth a full rank range, about 0.044 % of the z range) or the s
term to within master's linear error, so the depth gap at every place is
under 0.031 % of the range. Most places are under a third tube or in the
interior of a fill, so few reach a pixel (F4).

### F4. The same answer and the raster census (09:25)

The same answer: the shaders compute F2's float32 reference op for op, so
F2's numbers are the GPU path's: positions within 5.91e-5 world (gate 1e-4)
on the 12 scenes and every frame of the four sequences, the depth within
4.0e-5 of the range (F2's pins check). The GPU's own per-fragment depth was not read back: the shader transcribes the reference, and the raster census below is the check on the GPU.

The raster census (`.claude/probes/S3a/raster15.ts`, under the perf lock;
`pops15/raster15/summary.md`): the census page renders each of the 12
scenes with the GPU pieces off (master), on, and on again (the control),
and compares the label pass's coverage per pixel (a change is more than
32 / 255). A changed pixel is credited to a flip when an F3 place lies
within 6 h of it, to float32 rounding when its blob has 6 px or fewer, and
is unexplained otherwise.

| scene | changed px | flip | rounding | unexplained | control | blobs |
|---|---|---|---|---|---|---|
| def | 3 | 3 | 0 | 0 | 0 | 3 |
| fat | 7 | 0 | 7 | 0 | 0 | 7 |
| g41_def_tw42 | 20 | 17 | 3 | 0 | 0 | 20 |
| g41_def_tw64 | 30 | 28 | 2 | 0 | 0 | 27 |
| g41_ring_tw42 | 11 | 6 | 5 | 0 | 0 | 11 |
| g41_ring_tw64 | 5 | 2 | 3 | 0 | 0 | 5 |
| g41_user_tw42 | 17 | 13 | 4 | 0 | 0 | 17 |
| g41_user_tw64 | 22 | 21 | 1 | 0 | 0 | 10 |
| muse_default_tw | 1 | 1 | 0 | 0 | 0 | 1 |
| muse_hash | 15 | 11 | 4 | 0 | 0 | 12 |
| ring | 3 | 3 | 0 | 0 | 0 | 3 |
| user_tw42.lightpaper | 14 | 12 | 2 | 0 | 0 | 14 |
| total | 148 | 117 | 31 | 0 | 0 | 130 |

No context was lost; the control is 0 px on every scene (no warm state on
the GPU path). Crops looked at (`pops15/raster15/*.png`, master | GPU |
change):
- flip_0, the largest (g41_user_tw64 at 1365, 1879, 13 px): one pixel row
  of ink added along a band's flat end. It is NOT a depth flip:
  `.claude/probes/S3a/check15.ts` finds the same front tube at that pixel
  in both paths (chain 20, cluster 24, rank 51, z 0.7233 linear and exact;
  the only other tube there, chain 11, is the same key further back).
  Inferred, not verified: the s written there rounds differently (master
  mixes the piece's float32 ends, the GPU adds t * segLen to the segment's
  s) and a band window's bound passes within that rounding of the row's
  pixel centres, so the whole row flips. That is float32 rounding; the 6 h
  radius over-credits flips.
- flip_1 (g41_def_tw64, 4 px): the GPU fills a small white notch where a
  thin line meets a thick band.
- rounding_0 (muse_hash, 2 px): a thin tip moved by a pixel.

### F5. The pop census, GPU pieces off against on (10:03)

`scripts/label_pops.ts` (with K992's census windows, cherry-picked as
`06d90998`), under the perf lock from 09:29: the four sequences at zoom 1
and in K992's windows at the maximum zoom, with the GPU pieces off (`--tag
off15_z1`, `off15_win`) and on (`--gpu`, `gpu15_z1`, `gpu15_win`), all in
`.claude/probes/S3a/pops15/`. `.claude/probes/S3a/cmp15.mjs` compares the
two (`pops15/cmp15_z1.md`, `pops15/cmp15_win.md`). A pop is new when the
other run's same transition has no pop within 3 px of its box, and gone the
other way round. A transition is identical when its pops match in area, box
and ink. Off reproduces F1's run pop for pop.

Zoom 1:

| run | pops off | on | a transition off | on | area off px | on | largest off | on | new | gone | identical transitions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| def_drag | 6 | 6 | 0.15 | 0.15 | 359 | 359 | 144 | 144 | 0 | 0 | 40 of 40 |
| def_flow | 27 | 27 | 0.68 | 0.68 | 1078 | 1078 | 225 | 225 | 0 | 0 | 40 of 40 |
| muse_drag | 77 | 78 | 1.93 | 1.95 | 1273 | 1266 | 146 | 146 | 1 | 0 | 31 of 40 |
| muse_flow | 266 | 266 | 6.65 | 6.65 | 7368 | 7357 | 237 | 237 | 3 | 3 | 28 of 40 |

K992's windows at the maximum zoom:

| run | pops off | on | a transition off | on | area off px | on | largest off | on | new | gone | identical transitions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| def_drag@w0 | 249 | 250 | 6.22 | 6.25 | 77105 | 77111 | 19589 | 19589 | 1 | 0 | 38 of 40 |
| def_flow@w0 | 184 | 162 | 4.60 | 4.05 | 89876 | 89738 | 32026 | 32038 | 2 | 24 | 20 of 40 |
| def_flow@w1 | 229 | 229 | 5.72 | 5.72 | 62961 | 62958 | 20750 | 20750 | 0 | 0 | 36 of 40 |
| def_flow@w2 | 254 | 252 | 6.35 | 6.30 | 45930 | 45922 | 11045 | 11045 | 0 | 2 | 38 of 40 |
| muse_drag@w0 | 314 | 315 | 7.85 | 7.88 | 155916 | 155929 | 25454 | 25454 | 1 | 0 | 39 of 40 |
| muse_drag@w1 | 286 | 286 | 7.15 | 7.15 | 32786 | 32787 | 3950 | 3950 | 1 | 1 | 38 of 40 |
| muse_drag@w2 | 879 | 885 | 21.98 | 22.13 | 74530 | 74736 | 9612 | 9612 | 3 | 0 | 31 of 40 |
| muse_flow@w0 | 659 | 653 | 16.48 | 16.32 | 162138 | 162102 | 29498 | 29498 | 2 | 8 | 28 of 40 |
| muse_flow@w1 | 393 | 393 | 9.82 | 9.82 | 150117 | 150118 | 34774 | 34774 | 0 | 0 | 39 of 40 |
| muse_flow@w2 | 878 | 871 | 21.95 | 21.77 | 213948 | 213540 | 23934 | 23934 | 14 | 16 | 11 of 40 |

Per sequence at the maximum zoom (its windows summed):

| sequence | pops off | on | area off px | on |
|---|---|---|---|---|
| def_drag | 249 | 250 | 77105 | 77111 |
| def_flow | 667 | 643 | 198767 | 198618 |
| muse_drag | 1479 | 1486 | 263232 | 263452 |
| muse_flow | 1930 | 1917 | 526203 | 525760 |

Most of muse_drag's extra area is not new pops. In window 2, t3 and t4
(+128 and +84 px of the +206), K992's large `reach` pops at one corner
come out bigger with the GPU pieces: at t3 master's two loss pops of 952
and 335 px merge into one of 1379 px and the gain pop grows from 684 to
720 px; at t4 one loss pop grows from 1901 to 1985 px. The frame's changed
pixels number the same to within 6 px (41039 against 41033 at t3): about the
same ink changes, and the census assigns a little more of it to the pop.

In the transitions that differ without a new or gone pop, the same pops
come out a few px larger or smaller: muse_drag t4 9 -> 5 px, t7 13 -> 15,
t10 and t12 6 -> 5, t19 and t20 11 -> 12, t27 8 -> 4, t31 12 -> 5;
muse_flow t3 25 -> 26, t5 27 -> 28, t13 20 -> 21, t23 65 -> 60, t24
66 -> 61, t27 46 -> 47, t34 67 -> 68, t35 28 -> 25, t37 11 -> 12.

The new pops, cropped in both paths at the same place
(`.claude/probes/S3a/pops_at15.ts`, `scripts/label_pops.ts` plus `--at
"run:t:x:y"`; `atspec15.mjs` lists the places; under the perf lock at
09:58; `pops15/at15_off_*` and `at15_gpu_*`, `<run>_crops/at_t<t>_<x>_<y>.png`,
frame t | frame t+1 | change):
- zoom 1, muse_drag t3 at (505, 367), 6 px, NEW: both paths draw the same
  thing. Frame 4 has a few stray dots of ink just past a thread's end, in
  master too; master's are scattered and fall under the census's minimum
  area, and on the GPU path one or two of them touch, so 6 px join into a
  blob the census counts. Same ink, not a new artifact.
- muse_drag's windows, the five new pops (w0 t1 13 px, w1 t13 5 px, w2 t8
  5 px, t15 4 px, t18 8 px; 10:00-10:02, `pops15/at15_*_mw`): in every
  one the two paths change the same ink between the two frames (the same
  edge moving, the same seam of light dashes inside a dark thread), and the
  census counts a few px of it as a pop on one path and not the other. w1
  t13 is the seam that master's census counts one transition earlier (the
  gone pop at t12). Two differ in what is drawn, and both in the GPU path's
  favour: master's frame has stray light pinholes inside the dark ink
  (three at w0 t1, two at w2 t8) that the GPU path does not draw. Inferred,
  not checked: they are master's piece seams (the CPU tubes split at
  ZTOL), which one instance per segment does not have.
- def_drag w0 t30 at (1221, 145), 4 px (10:02, `pops15/at15_*_dw`): the
  same. Both paths draw the same frames but for one stray pinhole in
  master's frame 30, the same ink changes (a light wedge advancing), and
  the GPU path's census counts 4 px at the wedge's tip as a pop.

The gate (per sequence and zoom, no more pops a transition and no more pop
area with the GPU pieces on):
- met by def_drag and def_flow at zoom 1 (identical), muse_flow at zoom 1
  (the same count, 11 px less area), and def_flow and muse_flow at the
  maximum zoom (fewer pops, less area);
- NOT met by muse_drag at zoom 1 (one more pop of 6 px; 7 px less area),
  def_drag at the maximum zoom (one more pop; 6 px more area) and muse_drag
  at the maximum zoom (7 more pops; 220 px more area, 212 px of it the
  two grown reach pops at window 2's t3 and t4).

Every new pop cropped so far is the same ink counted differently, not a new
artifact. Not cropped (no time): muse_flow's three new pops at zoom 1, the
new pops in def_flow's windows (2) and muse_flow's (2 and 14), and muse_drag
w2's grown reach pops at t3 and t4.

### F6. Cost (09:58)

Node v23.7.0, every distinct frame of the four sequences (41 each), in the
app's order, one `LabelTableBuilder` reused across frames as in
`label_app.ts`.

Off against on (`.claude/probes/S3a/cost15.ts`, `pops15/cost15_load.md`):
per frame, 3 rounds of A B B A after a warm-up, the per-frame median; ms
over the frames. Off is `buildLabelPieces`; on is the tables
(`LabelTableBuilder.build`) plus `buildLabelPiecesGpu`. TAKEN UNDER LOAD:
my own pop census's Chrome was rendering the whole time.

| sequence | off: pieces p50 | p95 | max | on: tables p50 | p95 | max | on: pieces p50 | p95 | on: total p50 | p95 |
|---|---|---|---|---|---|---|---|---|---|---|
| def_drag | 93.030 | 95.168 | 98.225 | 0.420 | 0.779 | 4.076 | 56.497 | 57.694 | 56.878 | 58.224 |
| def_flow | 91.678 | 95.934 | 96.827 | 0.448 | 0.494 | 0.563 | 56.260 | 58.692 | 56.676 | 59.181 |
| muse_drag | 69.401 | 71.776 | 74.401 | 0.379 | 0.455 | 0.668 | 39.112 | 40.945 | 39.513 | 41.356 |
| muse_flow | 69.649 | 72.208 | 72.736 | 0.402 | 0.469 | 0.512 | 39.251 | 40.657 | 39.665 | 41.126 |

The GPU path's CPU parts alone (`.claude/probes/S3a/cost_tab15.ts`,
`pops15/cost_tab15.md`), under the perf lock at 09:57 with none of my other
runs going: per frame, the first call of each after the frame's
`FieldModel` (what the app pays), in the app's order, and the tables'
median over 9 more calls; ms over the frames.

| sequence | tables first p50 | p95 | max | tables repeat p50 | p95 | vertexRanges p50 | p95 | buildLabelFills p50 | p95 | max |
|---|---|---|---|---|---|---|---|---|---|---|
| def_drag | 0.269 | 4.127 | 4.813 | 0.189 | 0.623 | 0.838 | 3.391 | 32.967 | 58.739 | 59.659 |
| def_flow | 0.260 | 0.410 | 0.426 | 0.190 | 0.227 | 0.844 | 1.371 | 32.498 | 58.021 | 71.793 |
| muse_drag | 0.379 | 0.456 | 4.125 | 0.281 | 0.307 | 1.448 | 1.620 | 38.493 | 40.756 | 68.669 |
| muse_flow | 0.256 | 0.437 | 0.711 | 0.164 | 0.285 | 0.814 | 1.460 | 23.042 | 39.527 | 49.030 |

- `buildLabelPieces` leaves the per-frame path: with `lbp` on,
  `label_app.ts` calls the table builder and `buildLabelPiecesGpu`
  instead, and the CPU tubes are gone (30-36 ms a frame p50 in the load
  run: off's pieces against on's total).
- The tables' gate (0.25 ms p95 a frame) is NOT met in Node: the first
  call is 0.26-0.38 ms p50 and 0.41-0.46 ms p95 (def_drag 4.1 ms, from a
  few frames with a spike, probably a collection), and even the warm
  repeats are 0.23-0.62 ms p95. Not measured in the browser.
- What stays on the CPU is `buildLabelPiecesGpu`, 23-38 ms a frame p50
  and 40-59 ms p95: almost all of it `buildLabelFills` (the window records,
  the crossings, the fills and the DATA texture; its `windowOf` scans every
  segment for each window), and `vertexRanges` (a `depthAt` per vertex,
  only for ZTOL's z range) 0.8-1.4 ms p50. That is S3a8's work.
- The GPU pass's own time: not measured. No timer query was tried and no
  frame-time A/B was run in a browser.

## Handoff

(K868 S3a7 agent, 2026-10-28 08:20-10:10, stopped at the wrap-up time.)

Branch `k868-s3a` (worktree `.claude/worktrees/k868-s3a`), never pushed.
Commits: `0c11b49f` the tables and their float32 reference (F2), `79c74f59`
the GPU tubes behind `lbp` (WIP when committed), `06d90998` the cherry-pick
of K992's `census windows` (its message kept; the two conflict hunks in
`scripts/label_pops.ts` are named in `7eebf704`), `7eebf704` F3 and F4, then
this handoff's commit (F5, F6). Probes and results: `.claude/probes/S3a/`
(`*15*`: `tables15.ts`, `raster15.ts`, `check15.ts`, `diag15.mjs`,
`cmp15.mjs`, `atspec15.mjs`, `pops_at15.ts` (label_pops with `--at` crops),
`cost15.ts`, `cost_tab15.ts`, `edit15.*`, `pops15/`).

Done: steps 1-7, step 7 in Node only.

The flag: `labelGpu`, link key `lbp` (default off; it acts only with
`lbi=1`). Off, nothing drawn changes (the off census runs reproduce F1's
run). On: the tubes are one instance per chain segment, placed, keyed and
given their exact depth per fragment from `LabelTableBuilder`'s tables;
`buildLabelPiecesGpu` keeps the fills, the window records and the rank keys
on the CPU (S3a8).

The gates: positions and depth pass (F2, F4); the raster census
attributes every changed pixel (F4); the pop census is NOT clean (F5:
def_drag and muse_drag at the maximum zoom, and muse_drag at zoom 1, have
more pops or more pop area with the GPU pieces); the tables' cost gate is
NOT met in Node (F6).

Missing:
- crops of the new pops not yet looked at (F5): muse_flow's three at zoom 1,
  def_flow's windows (2), muse_flow's windows (2 and 14), and muse_drag w2's
  grown reach pops at t3 and t4. `atspec15.mjs <offDir> <onDir>` prints
  the `--at` places for `pops_at15.ts`;
- the GPU pass's own time (no timer query was tried) and any frame-time
  change in a browser; F6's cost is Node's;
- flip_0's mechanism (F4) is inferred, not verified;
- Levi has not seen the flag on in motion (call 5).

Next: the coordinator's call on the pop gate (F5: no new artifact found in the
crops looked at, but def_drag and muse_drag break the numbers) and on the
tables' cost (F6). Then S3a8, whose CPU cost to remove is
`buildLabelFills` (23-38 ms a frame p50 in Node).

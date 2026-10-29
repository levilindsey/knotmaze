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

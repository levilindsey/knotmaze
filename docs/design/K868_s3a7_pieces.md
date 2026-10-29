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

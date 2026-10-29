# K868 S3a8a: the fills and windows off the frame's CPU path (stage brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Previous stage: S3a7
(`docs/design/K868_s3a7_pieces.md`). Before anything else, read S3a7's
Coordinator's calls, F4-F6 and `## Handoff`, then S3a5's
(`docs/design/K868_s3a5_incremental.md`) section 10 (the plan: S3a8 was "the
strips, windows, fills and switch lines"; this stage is its first half).
Ledger items: K868 (this stage), K971 (the per-frame cost), K993 (the
census's blind spots).

In parallel, K992 (`docs/design/K992_s2_continuous_stops.md`, branch
`k992-corners`) works on the corner rules. This stage does not touch them.

## Why

S3a7 moved the label's pieces to the GPU behind `lbp` (merged on master at
`dd107cde`). With the flag on, `buildLabelPiecesGpu` still spends 39-57 ms a
frame on the CPU (Node, under load), and `buildLabelFills` is most of it:
23-38 ms p50 and 39-59 ms p95, clean. Its `windowOf` scans every segment of
a poly for each window, and the corner fills test every drawn corner against
every crossing entry of every poly, so the cost may be the algorithm, not
the work. The strips and the switch lines (`buildBandStrips`, about 32 ms
and 6 ms) are the second half, S3a8b; they stay as they are here.

## Coordinator's calls (technical)

1. **S3a7's calls 1 and 2 stand.** Master's corner rules are K992's; do not
   edit `src/render/field/oracle.ts` or the corner and re-fit code. The
   label stays a pure function of the frame, rebuilt each frame into
   preallocated arrays, with no warm state that can change an answer.
2. **The form follows the profile.** Profile first. Where the time is an
   algorithm (a linear scan where the s table's prefix sums allow a binary
   search, an all-pairs test where a bound or a sort prunes it), fix it on
   the CPU so that the records are the same, bit for bit and in the same
   order: that is the same answer by construction, and a test can pin it.
   Move work to the GPU, behind `lbp`, only if it is still over budget
   after that, and then with S3a7's same-answer checks (positions within
   1e-4 in float32, the raster census).
3. **S3a7's gates, as read now.**
   - **The pop gate is read by its intent: nothing new pops.** At the
     maximum zoom the census counts the same ink differently after tiny
     raster changes (S3a7 F5: stray dots that touch, master's seam
     pinholes), so a raw count is not the test. A pop that the flag-on run
     has and master does not is *explained* when every off-vs-on changed
     pixel inside its box, in its frame and in the frame before, is
     attributed by S3a7's F4 classes (an order flip, float32 rounding), and
     no order flip among them differs between those two frames. Crop and
     look at every new pop that is not explained; each must be named.
   - **The tables' cost:** S3a7's tables at 0.41-0.46 ms p95 in Node are
     accepted. The cost gate is now the label's CPU per frame as a whole
     (below), and its time in a browser.
4. **The fills' s follows the tube shader.** With `lbp` on, the window and
   sigma bounds use the tube shader's float32 formula, s[k] + t·segLen[k],
   so the fill shader's `dd <= uSigma` test agrees with the tubes (S3a7 F4's
   flip_0, a 13 px row, is inferred to be this; verify it). With `lbp` off,
   nothing drawn changes.
5. **`vertexRanges`** only feeds the windows' depth tolerance (ZTOL's z
   range). If the pin table gives the same range, take it from there, with
   a test that they are equal on the 12 scenes and the four sequences.

## Goal

With `lbp` on, the label's CPU per frame after the FieldModel (the tables,
the fills, the window records and the rank keys) is at most 2 ms p95 in
Node on the four sequences, clean, under the lock (target 1 ms). Nothing
new pops (call 3). With the flag off, nothing drawn changes. The browser's
frame time with `lbi=1`, `lbp` off against on, is measured.

## Order

1. **The per-pop check** (call 3), as a probe (`pops_check18.ts` or
   similar). Validate it on S3a7's F5 runs (`pops15/`, the off and on
   directories): it must explain the 7 pops S3a7 cropped. Then classify
   S3a7's other new pops (muse_flow's 3 at zoom 1, def_flow's windows,
   muse_flow's windows, muse_drag w2's two grown reach pops at t3 and t4),
   and crop and look at any it cannot explain. This closes S3a7's pop gate;
   write it down as G1.
2. **The profile** of `buildLabelPiecesGpu` without the tables, on the four
   sequences: the time in each part (each scan in `buildLabelFills`, the
   corner fills, the crossing rows, the rank keys, `vertexRanges`).
3. **The CPU fixes** (call 2). First a Node test that pins today's records
   (the DATA texture, the fills, the window records, the rank keys) on the
   12 scenes and every frame of the four sequences, with today's code kept
   as the test's reference; then the fixes, with the test green after each.
4. **`vertexRanges` from the pin table** (call 5).
5. **The fills' s** (call 4), with `lbp` on, and flip_0 checked.
6. **The GPU, only if needed** (call 2): what is still over 2 ms p95 moves
   behind `lbp`, with S3a7's same-answer checks.
7. **The checks:** the raster census of the 12 scenes (flag on against
   master), the pop census at zoom 1 and in the ten windows (`lbp` on
   against off, judged by call 3), and the cost: Node per frame p50 and
   p95 under the lock, and the browser's frame time with `lbi=1`, `lbp`
   off against on, at rest and in flow, in a headed hardware-GPU Chrome
   (`scripts/diag_screenshot.mjs` reports the frame rate; never
   `--virtual-time-budget`). Give the GPU pass's time too, if
   `EXT_disjoint_timer_query_webgl2` is there.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    The coordinator has fast-forwarded it to master with this brief. Its
    `node_modules` is a junction to the main checkout's.
  - Commit at every milestone, broken or not, and never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with `*18*` in new file names. Census runs take `--out
    .claude/probes/S3a/pops18`.
  - The census and its page are tracked (`scripts/`). Name every change
    to them in its commit message.
  - Write each finding into a `## Findings` section of this brief as you
    get it (G1, G2, ...), not at the end. It survives a compaction.
  - Dev server: K868's `env:` command, port 5381. Stop it at the end.
- **Timing and the census.**
  - Every timing, and every census run, goes under the perf lock
    (`$env:TEMP\claude-perf.lock`). Use `.claude\probes\S3a\locked18.ps1`
    (the coordinator made it from `locked15.ps1`, with this stage's owner
    name). It waits inside one call while another owner holds the lock.
  - K992's agent runs the census on this machine too, and the cursive
    agent runs Python fits. Take each pair you compare back to back, and
    label the numbers taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time.
  - Update the tests and pins that your changes move, and name each one in
    the commit message. Run the full suite before your last commit.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`;
  - the corner rules (call 1);
  - the strips and the switch lines (S3a8b).
- **Crop and look** at your own renders before you call a visual result
  done. View an image by copying it to `$env:TEMP\k868_view\` and reading
  the copy: a Read under `.claude/probes/**` attaches 51 KB of probe lore.
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
  - G1: S3a7's new pops, explained or cropped;
  - the profile, before and after, per part;
  - each CPU fix in one sentence, with the test that pins it;
  - what moved to the GPU, if anything, and its same-answer results;
  - the fills' s and flip_0;
  - the raster census's attribution, and the pop census per sequence and
    zoom, judged by call 3, with the crops you looked at;
  - the cost: Node p50/p95 before and after, and the browser's frame time;
  - anything that changes S3a8b or S3a10;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).

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

## Findings

### G1: S3a7's new pops, each checked (call 3)

`pops_check18.ts` re-read S3a7's pop censuses (`pops15/gpu15_*` against
`pops15/off15_*`). For each pop that the flag-on run has and master does
not, it classified every off-vs-on changed pixel (|dcov| > 32/255) inside
the pop's box, in the pop's frame and in the frame before, by S3a7's F4
classes. A grown pop counts by the owner rule (S3a7). Results are in
`pops18/check18c_{z1,win}/check18.md`.

- Zoom 1: 4 new pops (muse_drag 1, muse_flow 3). All 4 are explained.
- Ten windows: 37 new pops, all explained:
  - def_drag@w0: 1;
  - def_flow@w0: 2;
  - muse_drag@w0: 1, @w1: 1, @w2: 8;
  - muse_flow@w0: 2, @w2: 22.

  This includes the grown ones, among them muse_drag@w2's t3/t4 pops and
  muse_flow@w2's t26.
- Every changed pixel was an order flip; none was rounding and none was
  unexplained.
- In no pop did an order flip differ between the two frames.

The check explains the 7 pops that S3a7 cropped, which validates it:
- zoom 1: muse_drag t3;
- muse_drag's windows: w0 t1, w1 t13, w2 t8, t15 and t18;
- def_drag w0 t30.

It also explains the pops S3a7 left uncropped: muse_flow's 3 at zoom 1,
the windows of def_flow and muse_flow, and muse_drag w2's grown pops at t3
and t4.

Some pops show no changed pixel in either frame, so off and on drew the
same there; those are explained trivially. No pop was unexplained, so call
3 required no crop.

### G2: the profile, before and after

- **Before:** S3a7's code, instrumented per part, on 164 frames, the
  first call after each frame's FieldModel (`pops18/prof18_before.md`).
  - buildLabelPiecesGpu without the tables: 30.7-48.4 ms p50, 39-75 ms
    p95.
  - The windows took 20-30 ms p50: a scan of every segment of the chain
    for every window and shift (6.6-13 ms by itself), plus the z-split
    records.
  - The crossing rows took 1.5-2.4 ms, the DATA conversion 1.3-1.5 ms
    and vertexRanges 0.8-1.0 ms.
- **The CPU rewrite** (`045fe131`, bit for bit):
  - The windows binary-search each shift's segment range.
  - A z split hands its ends' depths to its halves.
  - The crossing rows come from the entries listed by their other chain,
    each point found once.
  - Everything is written into growable float32 scratch.
  - Result: 8.3-9.4 ms p50, 9.4-14.3 ms p95 (`pops18/prof18_after.md`,
    "today's" columns).
  - Pinned by `test/render/label/label_fills_pin.test.ts` against a
    frozen copy of S3a7's code
    (`test/render/label/fixtures/label_fills_ref.ts`) on the 15 tracked
    scenes, every array as raw bits.
  - `fills_pin18.ts` runs the same check on 176 frames, the 12 census
    scenes plus the 164 distinct sequence frames: 0 differ (53,222 fills,
    7,991,195 window records, 156,683 crossing rows).
- **Still over budget, so the windows moved to the GPU** (`0862f32f`,
  turned on by `885b7bce`).
  - With lbp on, a window is one 2-texel record per segment piece:
    (ta, tb, chain, k), then (tx, ty).
  - The fill shader finds the foot on the table segment, takes s =
    s[k] + t·segLen[k] and takes z from the tube's plateau depthAt.
    `PLATEAU_GLSL` is now shared with the GPU tube.
  - That path has no z splits, no depthAt on the CPU, no vertexRanges
    and no ZTOL.
  - buildLabelPiecesGpu: 1.89-2.44 ms p50, 2.76-4.45 ms p95 (31-35K
    window records a frame; `prof18_after.md`, "GPU fills" columns).
  - That is still over the 2 ms p95 goal. The per-part split of that
    cost is in G8.

### G3: vertexRanges from the pin table (call 5): not equal

The tables' z range differs from vertexRanges in 3 of the 176 frames
(the 12 census scenes plus the 164 sequence frames), by one float64 ulp (max rel 1.2e-16). First: muse_drag#19, where
the vertices give [-0.9280000000000002, 0.9279999999999999] and the pins
give zmin -0.9279999999999999.

ZTOL is 1e-4 of that range, so taking it from the pins would move a z
split's tolerance by an ulp. The z-split path therefore keeps
vertexRanges, bit for bit S3a7's. The GPU-fills path needs no ZTOL and
skips vertexRanges.

### G4: the fills' s, and flip_0 (call 4)

With lbp on, the fills' foot s is now the tube shader's float32 formula,
s[k] + t·segLen[k], over the same table segment. The fill's sigma test
already compared against the s of the tube under the fragment (uT/uS),
not the fill's own s.

On the same 176 frames the GPU fills' pieces are the z-split windows'
pieces:
- ends within 3.8e-6 in float32;
- chain and target bit for bit;
- crossing rows bit for bit.

This is the `checkGpuFillsWindows` test, and `fills_pin18` over the
sequences.

**flip_0 is unchanged.** g41_user_tw64 (1365, 1879) is the same 13 px row
as in S3a7, and the raster census draws 0 px differently from S3a7's
z-split fills on all 12 scenes at any level. So flip_0 is not the fill's
window or sigma bound: call 4's inference is **falsified**. S3a7's check
found that pixel owned by the same tube (chain 20) on both sides, so the
difference lies in the tube's own s or depth.

A remaining hypothesis, **inferred and not tested:** the band pass packs
the tube's s into 11 bits, and `|s - vSv| <= uSigma` flips at a rounding
boundary between master's CPU piece mix and the GPU tube's
s[k] + t·segLen[k]. It is classed as an order flip (within 6 h of a flip
place) either way.

### G5: the raster census, flag on against master

The census ran on the 12 scenes (`pops18/raster18/summary.md`;
`raster18.ts` asserts each render's `gpuFills`).

| | px |
|---|---|
| changed | 148 |
| order flips | 117 |
| float32 rounding | 31 |
| unexplained | 0 |
| control | 0 |

These are S3a7's numbers exactly. Against S3a7's z-split fills
(`?gf=0`), the GPU fills differ by 0 px at any level, max |dcov| 0/255.

### G6: the pop census, lbp on against off (call 3)

The pop census ran at zoom 1 and in the ten windows with the GPU fills
(`pops18/gpu18_{z1,win}`). It was compared with S3a7's flag-off runs
(`pops15/off15_*`). The flag-off path still draws what it drew then: its
pieces are bit for bit (the pin) and its shader text is char for char
(G9). The tables are in `pops18/cmp18.log`.

- Against S3a7's flag-on runs (`pops15/gpu15_*`) the GPU fills are
  identical: 40 of 40 transitions in every run, at both zooms.
- Against flag off, zoom 1 (pops off and on):

  | run | off | on | new | gone |
  |---|---|---|---|---|
  | def_drag | 6 | 6 | 0 | 0 |
  | def_flow | 27 | 27 | 0 | 0 |
  | muse_drag | 77 | 78 | 1 | 0 |
  | muse_flow | 266 | 266 | 3 | 3 |

  Pop area on is the same or smaller in every run (muse_drag 1,273 px
  off, 1,266 on).
- Against flag off, the ten windows: 24 new pops and 51 gone. Five runs
  have more pops or more pop area on: def_drag@w0 (+1 pop),
  muse_drag@w0 (+1), muse_drag@w1 (+1 px), muse_drag@w2 (+6 pops,
  +206 px) and muse_flow@w1 (+1 px). def_flow@w0 loses 22 pops and
  muse_flow@w2 7.
- Call 3 (`pops_check18.ts`, `pops18/check18_{z1,win}/check18.md`):
  every new pop is explained, the grown ones by the owner rule. That is
  4 of 4 at zoom 1 and 37 of 37 in the windows (24 new, 13 grown).
  Every changed pixel in their boxes is an order flip; none is rounding
  and none is unexplained. No flip differs between a pop's two frames.
- These are G1's pops, since the GPU fills draw S3a7's pixels. No crop
  was required.

### G7: the browser frame time, and a GL error it found

`scripts/diag_screenshot.mjs`, 30 s a page, lbp 0 then 1 back to back,
on the dev server (port 5381). The links are seed b at rest (`fw=0`), seed b
in flow and muse in flow (`fw=0.3`), all with `phw=0&lbi=1&am=instant`
(`pops18/ft18_*.log`). They ran under the lock, but with other agents'
non-timing work running. Frame times are in ms; the stamp is one frame
at capture.

| page | lbp | median | p95 | max | stamp at capture |
|---|---|---|---|---|---|
| def rest | 0 | 18 | 596 | 868 | phys 166, render 27.0 |
| def rest | 1 | 18 | 506 | 1,247 | asleep |
| def flow | 0 | 18 | 580 | 902 | phys 162, render 26.8 |
| def flow | 1 | 18 | 506 | 1,322 | phys 138, render 20.3 |
| muse flow | 0 | 18 | 953 | 1,411 | phys 303, render 31.3 |
| muse flow | 1 | 18 | 848 | 1,684 | phys 292, render 28.7 |
| muse flow, rerun | 0 | 18 | 792 | 1,244 | phys 261, render 24.5 |
| muse flow, rerun | 1 | 18 | 738 | 1,443 | phys 235, render 20.7 |

- These runs do not isolate the label. Every page was still in its
  in-thread settle at 30 s (phase "budget", sim 2.8-5.0 s of 30 s wall),
  so its p95 and max are physics frames.
- The render at capture is 2.6-6.5 ms lower with lbp on. It is a single
  frame each.
- No GPU pass time was read: the script reports none, and no
  `EXT_disjoint_timer_query_webgl2` query was made.
- Not measured: a clean frame-time A/B (a settled page, the label's own
  share). It is listed in the handoff.

**The GL error.** The first muse lbp=1 run logged 26
`GL_INVALID_OPERATION: glDrawElements: Mismatch between texture format
and sampler type`. The def runs and every lbp=0 run logged none.

- Cause, read from the code: the fill pass's unbind assumed the active
  unit was 2 (the packed S texture). With GPU_FILLS the last unit bound
  before the draw is 3 (the tables), so the unbind cleared unit 3 twice.
  That left the R32UI S texture on unit 2, where a later pixi draw's
  float sampler met it, and the draw was rejected.
- Fix (`label_pass.ts`): each unit is unbound by name. Without GPU_FILLS
  the end state is the same as before.
- After the fix, the muse rerun logged 0 errors at lbp=1.
- Inferred, not tested: why only muse showed the error (which later pixi
  draw has a sampler on unit 2).
- What the rejected draws were, and what they left off screen, was not
  checked.
### G8: the profile after, per part

`prof18c.ts` (`pops18/prof18c.md`) times the GPU-fills
buildLabelPiecesGpu per part, on 164 frames, the first call after each
frame's FieldModel, with the tables built first and untimed. It uses a
generated instrumented copy, whose output equals the real function's on
164 of 164 frames. Values are ms, p50 / p95.

| part | def_drag | def_flow | muse_drag | muse_flow |
|---|---|---|---|---|
| crossing table and entries | 0.16 / 0.48 | 0.12 / 0.18 | 0.14 / 0.31 | 0.12 / 0.18 |
| drawn corners | 0.08 / 0.14 | 0.06 / 0.13 | 0.06 / 0.18 | 0.05 / 0.10 |
| crossing rows | 1.03 / 3.93 | 0.76 / 1.13 | 0.54 / 0.95 | 0.48 / 0.76 |
| fill records | 0.12 / 0.39 | 0.08 / 0.14 | 0.07 / 0.11 | 0.06 / 0.11 |
| windows (the records) | 1.13 / 4.52 | 0.98 / 4.33 | 0.88 / 4.66 | 0.87 / 4.43 |
| DATA conversion | 0.21 / 0.25 | 0.21 / 0.28 | 0.21 / 0.27 | 0.20 / 0.27 |
| total, real function | 2.77 / 7.21 | 2.13 / 6.30 | 1.85 / 5.68 | 1.73 / 5.50 |
| window records | 35,043 | 34,990 | 31,276 | 31,215 |
| crossing rows | 835 | 840 | 993 | 1,013 |

The rest (setup, tubes) is under 0.07 ms.

- The p50s agree with G2's run (1.9-2.4 ms). The p95s do not: 5.5-7.2
  ms here, 2.8-4.5 ms there. Both ran under the lock, but other agents'
  non-timing work does not take it. The spread sits in the windows (4x
  p50 at p95) and in def_drag's crossing rows. GC or load is inferred;
  neither was tested.
- **The goal is not met.** With the tables (0.41-0.46 ms p95), the label
  costs about 3.2-4.9 ms p95 on G2's run and 6-7.7 ms on this one,
  against 2 ms.
- What dominates now: the window records (31-35K a frame, written per
  segment piece), then the crossing rows.
  - The next fix is one record per window and shift (about 730 a frame)
    with the shader walking that range's segments, which needs a pin of
    the walked foot against today's per-piece records.
  - Then the crossing rows' near test, which uses `Math.hypot` against a
    sum. A squared compare is not bit for bit at the boundary, so it
    needs a pin decision.

### G9: the GPU fill's shader text (K320)

The first full-suite run on `885b7bce` failed K320's fill budget (6,952
against 4,000): with the `GPU_FILLS` blocks in the one text, the z-split
fill carried the GPU foot as dead text.

`labelSources` now keeps or drops each `#ifdef GPU_FILLS` block in JS
(`gpuFillsText`), so each program carries only its own foot.
- The z-split fill's text is S3a7's char for char (3,962, packed and
  unpacked; `glsl18.ts` compares it with master's `label_glsl.ts`).
- The GPU fill measures 684 + 6,200 chars.
  `test/render/k320_slim.test.ts` gains a budget for it (700 / 6,250).
- The raster census re-ran on the split text
  (`pops18/raster18_split.log`): 0 px differ from S3a7's z-split fills
  at any level, and the table matches G5's.

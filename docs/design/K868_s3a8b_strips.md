# K868 S3a8b: the strips and switch lines off the frame's CPU path (stage brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Previous stage: S3a8a
(`docs/design/K868_s3a8a_fills.md`). Before anything else, read:
- S3a8a's Coordinator's calls, G4, G6-G8 and `## Handoff`. Its "For S3a8b
  and S3a10" notes are binding here.
- S3a5's (`docs/design/K868_s3a5_incremental.md`) section 4, where the
  strips' cut rule is measured, and the strips and switch rows of section
  6's table.
- S3a6's call 4 (`docs/design/K868_s3a6_motion.md`).

Ledger items: K868 (this stage), K971 (the per-frame cost) and K993 (the
census's blind spots).

In parallel, K1000 (`docs/design/K1000_continuous_caps.md`, branch
`k992-corners`) works on the caps in `src/render/field/oracle.ts`. This
stage does not touch them.

## Why

S3a8a moved the windows and fills to the GPU behind `lbp` and rewrote the
rest of `buildLabelPiecesGpu` bit for bit (S3a8a G2, G8):
- 1.7-2.8 ms p50 and 2.8-7.2 ms p95 after the FieldModel;
- plus the tables' 0.41-0.46 ms.

The two parts it left are now most of the label's CPU per frame. These are
S3a5's numbers; re-measure them:
- `buildBandStrips`, about 32 ms;
- the switch lines, about 6 ms with S3a4's topology cache.

S3a5 planned both:
- the strips as one instance per segment and side, placed from s on the
  GPU (1.5e-5 world, measured);
- the switch lines' positions from s on the GPU (0.2-1 ms, estimated).

S3a6's call 4 dropped the strips' cuts.

S3a8a's own leftovers are the next stage, S3a8c: the window range records,
the crossing rows and the p95 spread. The whole label stays over its 2 ms
p95 until both stages are done.

## Coordinator's calls (technical)

1. **S3a8a's call 1 stands.**
   - Master's corner rules and caps belong to K992 and K1000: do not edit
     `src/render/field/oracle.ts`.
   - The label stays a pure function of the frame.
   - A cache is allowed only where the cached and uncached answers are the
     same to the bit and a check shows it, as with S3a4's switch topology
     and its `verifySwitch`.
2. **The strips drop their cuts** (S3a6's call 4). A tube edge is one quad
   per chain segment and side, with its edge straight between the segment's
   two vertex-normal offsets. The member's cluster still changes at the
   span bound, but along that straight edge. No vertex sits on the true
   offset line at a cut, so the kink goes.
   - It is the label's rule, so both paths draw it.
     - With `lbp` off, `buildBandStrips` keeps its pieces, but each cut
       piece is exactly the part of its segment's uncut quad between its s
       bounds. Its vertices and normals are interpolated at the cut.
     - With `lbp` on, the same quads come from the tables (call 3).
   - Against master, this changes the outline only on segments that hold a
     cut. S3a5 measured up to 0.73-0.77 px at zoom 1 on def and 1.8-2.2 px
     on muse.
   - Inferred, to check: it removes pops rather than adding them. Today a
     cut's vertex jumps by about h times the bend when the cut crosses a
     sample, and the uncut edge does not move at all as a cut slides.
3. **With `lbp` on, the edges are static instances.**
   - One instance per (segment, side), placed in the vertex shader from
     SAMP, with the neighbours for the vertex normals. The CPU writes them
     only when the chains or their sample counts change, not per frame.
   - Per fragment, all read from the label tables:
     - s = s[k] + t·segLen[k] (the tube's formula);
     - the cluster, from the span table;
     - the depth, from the pin table (`PLATEAU_GLSL`).
   - The caps and fill arcs are few. The CPU writes their records each
     frame, from the tables and the fills' records.
4. **The switch lines: the form follows the profile** (S3a8a's call 2).
   - Profile `switchLinesFrom` per part first.
   - Where the time is an algorithm, fix it on the CPU so that the lines
     are the same to the bit, pinned by a test.
   - If it is still over the goal after that, the CPU writes each line's
     (chain, s, cluster) and the vertex shader places it from SAMP, as S3a5
     planned.
   - A test may be dropped where the band pass's per-fragment test makes it
     redundant (the reach test may be one). The raster census must then
     show 0 px changed.
5. **The gates, as S3a8a read them.**
   - **The rule change (call 2), `lbp` off against master:**
     - in the raster census, every changed pixel lies within 3 px of a
       segment that holds a cut;
     - in the pop census, nothing new pops.
   - **The same answer, `lbp` on against off:**
     - every edge vertex and cut is within 1e-4 of the CPU path in float32,
       checked by a Node mirror of the vertex shader, as S3a7's
       `check15.ts`;
     - the raster census finds only S3a7 F4's classes: an order flip, or
       float32 rounding.
   - **The pop gate is read by its intent** (S3a8a's call 3, with
     `pops_check18.ts`). Every new pop is either explained, or cropped,
     looked at and named.
6. **The cost.**
   - **Node:** the strips' and the switch lines' CPU per frame, meaning the
     records the CPU still writes. Measure it under the lock, on the four
     sequences, as the first call after each frame's FieldModel.
   - **The browser** (S3a8a's handoff item 4): `lbi=1`, with `lbp` off
     against on, back to back, in a headed hardware-GPU Chrome.
     - The physics worker is on (the default).
     - The page is past its load settle.
     - The knot keeps moving (a scripted drag, or the temperature), so the
       label rebuilds each frame.
     - Read the label's own per-part timers (`__knotLabel.timers()`) and
       the frame times.
     - Read the GPU time of the label and band passes, if
       `EXT_disjoint_timer_query_webgl2` is there.
     - The FieldModel dominates such a frame. It is S3a10's, so report it
       separately.
7. **flip_0** (S3a8a G4). Its remaining hypothesis is the band pass's
   11-bit rounding of the tube's s. Once the strips read s from the tables,
   check it, and report the result either way.

## Goal

- **The cost.** With `lbp` on, the strips and the switch lines together
  take at most 0.5 ms p95 of CPU per frame in Node, on the four sequences,
  clean, under the lock (target 0.2 ms).
- **The rule.** The strips are uncut on both paths (call 2).
- **The gates.** Call 5's gates pass.
- **The report.** The label's whole CPU after the FieldModel (tables,
  pieces, switch, strips, upload) is reported per part, in Node and in the
  browser. Its 2 ms p95 gate belongs to S3a8c.

## Order

1. **The profile**, on the four sequences, under the lock:
   - `buildBandStrips` per part: the tube edges and their cuts, the caps,
     the fill arcs, the switch strips, and its setup;
   - `switchLinesFrom` per part: the candidates, the flip test, the
     cluster, and the reach test.
2. **The cut rule with `lbp` off** (call 2).
   1. Write a Node test that pins today's strips and switch lines on the 15
      tracked scenes and the sequences' frames. Freeze today's code as the
      test's reference, as `label_fills_pin.test.ts` does.
   2. Change the rule. Every strip vertex stays today's bit for bit, except
      at a cut, where it lies on the uncut quad's edge. Pin both.
   3. Run call 5's first gate: the raster census, then the pop census at
      zoom 1 and in the ten windows. Master's runs are S3a7's
      `pops15/off15_*`; the off path has not changed since (S3a8a G6).
   4. Crop three cuts at zoom 1, before and after, into `pops20/cuts/`.
3. **The strips with `lbp` on** (call 3), with call 5's same-answer checks.
4. **The switch lines** (call 4).
5. **flip_0** (call 7).
6. **The checks:**
   - the raster census of the 12 scenes, `lbp` on against off;
   - the pop census at zoom 1 and in the ten windows, `lbp` on against off,
     judged by call 5;
   - the cost (call 6), before and after.
7. **Stop.**

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    The coordinator has fast-forwarded it to master with this brief. Its
    `node_modules` is a junction to the main checkout's.
  - Commit at every milestone, broken or not, and never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with `*20*` in new file names. Census runs take `--out
    .claude/probes/S3a/pops20`.
  - The census and its page are tracked (`scripts/`). Name every change to
    them in its commit message.
  - Write each finding into a `## Findings` section of this brief as you
    get it (N1, N2, ...), not at the end. It survives a compaction.
  - Dev server: K868's `env:` command, port 5381. Probe links take
    `&snd=none`. Stop the server at the end.
- **Timing and the census.**
  - Every timing and every census run goes under the perf lock
    (`$env:TEMP\claude-perf.lock`). Use `.claude\probes\S3a\locked20.ps1`;
    the coordinator made it from `locked18.ps1`, with this stage's owner
    name. It waits inside one call while another owner holds the lock.
  - K1000's agent runs the census and timings on this machine too (port
    5392). Take each pair you compare back to back, and label any numbers
    taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time.
  - S3a8a's notes:
    - keep a program's variants split in JS, and give any new program text
      a K320 budget in `test/render/k320_slim.test.ts` (G9);
    - unbind every texture unit by name after a pass (G7).
  - If a new GPU program fails to compile, fall back to the CPU path with a
    reason. Never skip it silently.
  - Update the tests and pins that your changes move, and name each one in
    the commit message. Run the full suite before your last commit.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`;
  - `src/render/field/oracle.ts`, the corner rules and the caps (call 1);
  - the windows and the crossing rows (S3a8c).
- **Crop and look** at your own renders before you call a visual result
  done. To view an image, copy it to `$env:TEMP\k868_view\` and read the
  copy: a Read under `.claude/probes/**` attaches 51 KB of probe lore.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-6 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the step you are on and write down what is
    missing. What is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief, its
    `## Findings` and `git log`.
  - On stopping:
    1. commit;
    2. append a `## Handoff` to this brief, and commit it;
    3. report.
- **The final report** gives:
  - the profile, before and after, per part;
  - the cut rule: the change, its pin, the raster and pop gates against
    master, and the crops' paths;
  - the strips on the GPU, with their same-answer results;
  - the switch lines: each CPU fix in one sentence with its pin, or what
    moved to the GPU;
  - flip_0;
  - the raster and pop censuses per sequence and zoom, judged by call 5;
  - the cost:
    - Node p50/p95 per part, before and after;
    - in the browser: the per-part timers, the frame time and the GPU
      time;
  - anything that changes S3a8c or S3a10;
  - a `Ledger items` list: follow-ups and residuals. A question for Levi
    only about what shows on screen, in plain words;
  - K868's current handle fields: branch, last commit, evidence and next.

## Findings

- **N1 · The profile, before (2026-10-28 12:08, under the lock).** Node
  23.7, every distinct frame of the four sequences (164), each call the
  first of its kind after the frame's FieldModel, tables and pieces, in
  the app's order; `.claude/probes/S3a/prof20.ts` (parts from laps in
  copies `inst20.mjs` generates; the instrumented and real outputs equal
  on 164 of 164 frames). Results: `pops20/prof20_before.md`. p50 / p95 ms,
  uninstrumented totals:

  | | def_drag | def_flow | muse_drag | muse_flow |
  |---|---|---|---|---|
  | switchLinesFrom | 12.5 / 18.7 | 13.0 / 18.9 | 5.4 / 11.0 | 4.1 / 8.7 |
  | switchTopo (key changed) | 0 / 3.0 | 1.9 / 4.6 | 0 / 2.2 | 1.1 / 2.0 |
  | buildBandStrips | 25.9 / 46.5 | 26.1 / 31.0 | 17.7 / 33.2 | 16.0 / 21.5 |

  Per part (instrumented, so the laps' own cost sits in the switch's
  candidates and flip test): the switch lines are the flip test (9.2 /
  10.9 def_drag; 12,600 candidates per frame on def, 7,800 on muse, each
  scanning every crossing of its pair twice), the reach test (2.4 /
  6.1), the candidates' loop (3.4 / 4.1) and the cluster (1.4 / 2.2); the
  push is nothing (2 to 42 lines). The strips are the tube edges and
  their cuts (17.8 / 34.6 def_drag), the output's Float32Array (5.1 /
  5.4: 1.0 M numbers pushed through a JS array), the caps (1.6 / 2.7),
  the normals and bounds (0.8 / 2.4) and the fill arcs (0.5 / 0.9); the
  switch strips and the setup are nothing. 56,600 strips on def, 52,500
  on muse. The brief's ~6 ms for the switch lines is half of def's 12.5 here;
  where that figure came from (warm calls, the browser) is not checked.

- **N2 · Call 2, the cut rule (lbp off), `8db6ad52`.** A cut piece is now
  exactly its part of the segment's uncut quad: at a cut inside a segment
  its outline point and normal are the segment's end vertices and vertex
  normals interpolated at the cut's t (before: the segment's own normal, a
  kink). Nothing else in the strips moves. Pin:
  `test/render/label/label_strips_pin.test.ts` against the frozen S3a8a
  code (`fixtures/label_band_ref.ts`, `fixtures/label_switch_ref.ts`): every
  number bit for bit except a cut's point and normal, which must equal the
  uncut quad's interpolated at the cut within float32; the switch lines
  line for line. The stage's probe `strips_pin20.ts` on every frame of the
  four sequences: 0 differences, 251,248 cut ends (def_drag 70,932,
  def_flow 70,428, muse_drag 54,780, muse_flow 55,108) within 3.7e-6 world
  (normals 5.9e-8) of their uncut quads.
  - Raster census (`raster20.ts`, `pops20/raster20.log`; 12 scenes, the
    census page's `?strips=ref` against today, lbp off, |dcov| > 32):
    2,703 cut segments, 194 px changed, all 194 within 3 px of a cut
    segment's uncut quad, 0 off them, control (ref against ref) 0 px. Per
    scene 0 to 95 px (g41_user_tw64 95, g41_ring_tw64 64). The three
    largest blobs are 12-15 px slivers along a piece's end edge at a cut:
    `pops20/cuts/cut{0,1,2}_g41_user_tw64.png`, looked at. Passes.
  - Pop census (`label_pops.ts`, `pops20/off20_*` against master's
    `pops15/off15_*`, `cmp15.mjs`; pops master / today): z1 def_drag 6 / 6,
    def_flow 27 / 28 (one blob split, nothing new), muse_drag 77 / 77,
    muse_flow 266 / 266 (2 new, 2 gone); the ten windows 51 new, 46 gone. So the
    brief's inference ("removes pops rather than adding them") does not
    hold: the rule trades pops at cuts about one for one. The strict gate
    (nothing new pops) fails; read by intent (call 5),
    `pops_cut20.ts` (from pops_check18) re-rendered every new or grown pop
    (73) in master's strips and today's on the same frame and classified
    each changed px in its box: z1 2 of 2 and windows 69 of 71 changed only
    within 3 px of a cut segment's uncut quad (the rule), 1 is master's
    own ink (no px changed: the census's matching), and 1 (muse_drag@w0
    t22, 23 px) has 31 px near a cut and 1 px just past the 3 px margin:
    the same streak. Tables: `pops20/cut20_z1/cut20.md`,
    `pops20/cut20_win/cut20.md`, a crop per pop beside them. Looked at:
    the largest new pops (muse_flow@w2 t5, t8, t14, t22, 71-94 px, one
    place at (300-345, 220-255)) are a one-frame hairline crack, 1-2 px
    wide and about 40 px long, through the band at a cut, where master's
    band is solid (`muse_flow@w2_t22_317_240.png`); muse_drag@w0 t22 is a
    14 x 2 px gap in the band at a cut. Not established: why the band
    leaves a crack there (inferred, not checked: the band's piece seam now
    tilts with the interpolated normal while the label pass still cuts
    its tube pieces along the segment's own normal, so a sliver between
    them fails each piece's label test). With lbp on, the band has no
    piece seams at all, so the lbp-on census is where this is settled.

- **N3 · Call 3, the band edges from the tables: the same answer in Node.**
  `src/render/label/label_band_gpu.ts` (not wired yet): two instances per
  chain segment (the sides) from `LabelTables.segs`, placed in the VS from
  the point table with vertex normals from the neighbours (a zero-length
  neighbour borrows up to `BORROW` 8 segments on); per fragment s = s[k] +
  t segLen[k], the cluster from the span table (binary search), the depth
  from the pin table (`PLATEAU_GLSL`, now exported by label_glsl.ts).
  `refBandEdge` is the VS in float32 (`Math.fround` at every step);
  `test/render/label/label_band_gpu_check.ts` compares it with
  buildBandStrips' edges per segment and side: end points, normals and s,
  each cut (where the fragment's float32 s reaches the span bound) and
  each piece's cluster at its middle. `band_gpu20.ts`, every frame of the
  four sequences (`pops20/band_gpu20.txt`): 0 differences, gate 1e-4:

  | | segments | CPU pieces | cut ends | outline | normal | cut point | s |
  |---|---|---|---|---|---|---|---|
  | def_drag | 1,005,280 | 1,023,013 | 70,932 | 5.4e-6 | 1.2e-5 | 2.1e-5 | 1.5e-5 |
  | def_flow | 1,005,060 | 1,022,667 | 70,428 | 5.4e-6 | 1.2e-5 | 2.2e-5 | 1.5e-5 |
  | muse_drag | 957,443 | 971,138 | 54,780 | 5.4e-6 | 8.0e-6 | 1.9e-5 | 1.5e-5 |
  | muse_flow | 957,061 | 970,838 | 55,108 | 5.4e-6 | 8.1e-6 | 1.9e-5 | 1.5e-5 |

  Two def_drag pieces shorter than float32's resolution of s take the
  neighbour's cluster on the GPU (counted, not failed: sub-pixel). BORROW
  never bound. `test/render/label/label_band_gpu.test.ts` runs the check on
  the 15 tracked scenes as built and flipped (30 cases), plus the instance
  layout (uploads only when a chain's segment count changes) and the depth
  variant's split in JS (K320). Not done: the wiring (the GL draw in
  BandPass, the CPU strips without tube edges, the app and the census
  page), so the browser same-answer gate and both lbp-on censuses are not
  run.

- **N4 · Call 4, the switch lines: two exact CPU fixes; still over the goal.**
  In `switchLinesFrom` (`src/render/label/label_switch.ts`): (1) a pair whose
  chain is over every one of its crossings is skipped, since its fillOver
  is false everywhere and no candidate can flip (about 20% of the pairs);
  (2) each crossing's candidates scan a near list (the pair's crossings
  within 3 sigma of it, in index order) instead of every crossing: a
  candidate lies within sigma of its crossing and fillOver reads only
  crossings within sigma of the candidate +- eps, and the short-way
  distance is a metric, so the same nearest crossing and the same tie.
  Pins: `label_strips_pin.test.ts` (the switch lines line for line, bit for
  bit, against `fixtures/label_switch_ref.ts`), and the stage's
  `sw20.ts` on every distinct frame of the four sequences as built and
  flipped (328 scenes, 6,555 lines, 451,106 pairs, 91,881 skipped): 0
  scenes differ (`pops20/sw20.log`). Back to back under the lock, each
  call the first on a fresh FieldModel, order alternating per frame
  (`sw20t.ts`, `pops20/sw20t.md`), ms p50 / p95:

  | | before (S3a8a) | after |
  |---|---|---|
  | def_drag | 14.7 / 21.0 | 7.6 / 12.4 |
  | def_flow | 14.0 / 20.1 | 6.9 / 12.8 |
  | muse_drag | 6.9 / 10.3 | 4.8 / 8.5 |
  | muse_flow | 4.4 / 11.1 | 2.9 / 7.8 |

  Still 15 to 25 times the goal (0.5 ms p95). Per part after
  (`pops20/prof20_after.md`, instrumented, so the laps sit in the
  candidates and the flip test): candidates 3.7 / 4.7 (11,800 a frame on
  def, from 12,600), flip test 3.5 / 5.1 (from 9.2 / 10.9), cluster 1.7 /
  2.4, reach test 2.6 / 6.7 (unchanged). What is left is the search
  itself, not the lines' placement (2 to 42 lines a frame, the push is
  nothing), so call 4's fallback (CPU writes chain, s and cluster, the VS
  places from SAMP) would not reach the goal: the next stage needs a way
  to find the lines that does not test 7,000 to 12,000 candidates a frame
  (a decision, listed in the handoff).

- **N5 · The profile after (buildBandStrips, lbp off, with the cut rule).**
  `pops20/prof20_after.md`, uninstrumented p50 / p95 ms: def_drag 28.2 /
  47.9 (N1 25.9 / 46.5), def_flow 25.7 / 31.5 (26.1 / 31.0), muse_drag
  23.6 / 37.5 (17.7 / 33.2), muse_flow 22.9 / 25.7 (16.0 / 21.5); the tube
  edges and cuts 19.5 / 37.8 on def_drag (17.8 / 34.6). Not a back-to-back
  pair (12:08 and 13:20, other agents' work on the machine unknown), and
  the output part, which the cut rule does not touch, also rose on muse
  (3.5 to 4.9 ms p50, the same strip count), so the cut rule's own cost is
  not established from these. With lbp on the tube edges leave the CPU
  (call 3), which is where the strips' goal is met or not; not measured,
  since the GPU edges are not wired.

## Handoff

2026-10-28 13:30, the S3a8b agent, stopped near the 1h30 mark (start 12:01):
no further step fits before the 2 h cap.
Done: step 1 (N1), step 2 (N2: the rule, its pin, both gates read), step
3's Node half (N3: the GPU edges' shaders, layout and float32 mirror,
same answer on every frame), step 4's exact CPU fixes (N4, N5). Missing,
for the next stage:

1. **Wire call 3** (step 3's browser half). `label_band_gpu.ts` is
   complete but unused. Plan: LabelPass exposes its table texture with
   `textures` (today it does not); BandPass gains an edge draw that
   compiles `bandEdgeSources(TBL_W, depth)` lazily per variant (a compile
   failure falls back to the CPU edges with a reason), uploads the
   instances when `BandEdgeLayout.update(T)` says so (aSeg at divisor 2),
   draws `drawArraysInstanced(TRIANGLE_STRIP, 0, 4, 2 * nSegs)` after the
   CPU strips with uM, uSize, uW, uH (= m.h), uSigma, uLr, uL, uTbl and,
   for depth, uD2, uZmin, uZinv, uRinv, uSinv, uWin, uRho from the tables,
   and unbinds every unit by name after (G7); buildBandStrips takes an
   option to leave out the tube edges (caps, fill arcs and switch strips
   stay on the CPU); label_app's lbp on and the census page take it (the
   page's `?gpu=1` today switches only the GPU pieces). New program text
   needs nothing more: its K320 budgets are in `k320_slim.test.ts`.
2. **Call 5's lbp-on gates**: the browser same-answer check against the
   Node mirror, the raster census (only S3a7 F4 classes), and the pop
   census, which settles N2's hairline cracks (with lbp on there are no
   piece seams).
3. **Call 4, a decision**: N4 leaves the switch lines at 7.6 / 12.4 ms
   p50 / p95 on def_drag, and the cost is finding them (7,000 to 12,000
   candidates a frame), not placing them, so call 4's fallback would not
   meet the goal. More exact CPU fixes are possible (a sorted window
   instead of the O(n^2) near lists, a cheaper exact reject before the
   reach test), but not to 0.5 ms. Until the lines are found another way
   the label cannot meet S3a8c's 2 ms p95 gate either.
4. **flip_0** (call 7): not checked; it needs the strips reading s from
   the tables in the browser (item 1).
5. **Cost** (call 6): Node per part with lbp on (after item 1); the
   browser's lbi=1 lbp off against on, back to back, `__knotLabel.timers()`,
   frame times and the GPU time.

Evidence: `.claude/probes/S3a/` (untracked): the stage's `*20*` probes
(prof20 + inst20, strips_pin20, raster20, pops_cut20, band_gpu20, sw20,
sw20t, chain20a/b, locked20) and `pops20/` (profiles, logs, census
outputs, crops). The census runs read master's `pops15/`. Dev server:
`npx.cmd vite --config .claude/probes/S3a/vite.private-cache.config.ts
--port 5381 --strictPort --host 127.0.0.1` from the worktree (stopped).
Residuals: N2's one-frame hairline cracks at cuts with lbp off
(mechanism not established); `locked20.ps1` takes the lock after 30
minutes of waiting whoever holds it; BORROW 8 against the CPU's unbounded
borrow (never bound on 164 frames); two sub-float32 def_drag pieces take
the neighbour's cluster on the GPU.

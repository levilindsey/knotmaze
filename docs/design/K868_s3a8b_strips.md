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

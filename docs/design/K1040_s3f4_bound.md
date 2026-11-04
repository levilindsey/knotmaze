# K1040 S3f4 (K1097): what the label pass's drawing costs on the Pixel

The coordinator's brief, 2026-11-04. One run for Muse (chain run 16J), on
master, after run 16A. It follows S3f3 (`docs/design/K1040_s3f3_draw.md`),
whose Handoff ends at its Next. It is a diagnostic: it builds probe
variants of the drawing, checks that each does what its name says, times
them on the desktop and plans the Pixel batch that splits the drawing's
cost. It adopts no lever and changes no default pixel.

## Where S3f3 left it

K1097's gate is the Pixel's label cost per scene, `sync p50 -
s3ffloorall p50 + upload p50`, at most 2 ms on every one of the 12
scenes. The Pixel reads 3.3-9.9 ms, and the drawing is the largest
term: median 2.6 ms in S3f2's split (`ftentv - ftentvsetup`,
`.claude/probes/K1040/s3/out/split_s3f2.md`). At S4's and S5's targets
(the fixed part about 0.6, the moving upload about 0.3, the floor 0.3)
the drawing must come down to about 0.8 ms. S3f3's three ways to draw
fewer vertices (reach, strips, the circumscribed wedge at NW 2) all
failed the census and stay default off. The S3f3 Pixel batch was
skipped: the Pixel timed today's pass after S3f2 removed the invalidate
(s3f2b, 2026-11-03), and S3f3 changed no default pixel.

What the tables already say about the drawing (read them; these are
readings, not measures of their own):
- S3f2's split, by scene: the ring scenes (64-66k vertices a frame,
  `out/vert_count_s3f3.md`) draw in 1.3-1.7 ms, the user scenes
  (151-156k) in 2.2-2.5, the def scenes (354-370k) in 3.9-4.2, the
  muse scenes (328-348k) in 2.7-3.3. Roughly 1 ms plus 0.9 ms per 100k
  vertices: a large part does not scale with the geometry.
- S3d2 (`out/split_s3d2.md`, before S3e and S3f2 changed the fixed
  part): tentv with every vertex clipped (`tentvdegen`, z = 2) cost
  1.3-2.7 ms over the empty pass, nearly flat across 5.6x the vertices,
  and more than the whole drawing on the ring scenes; tentv minus it,
  the raster side, was 0.4 ms at the median. So a pass that issues any
  draw may cost a fixed ~1-2 ms whatever it draws (the empty pass draws
  nothing, so a tile-based driver may skip work that a pass with draws
  must do), plus a smaller per-vertex part. Neither is isolated yet.
- The segments, 80-100% of the vertices, are one instanced draw of
  12-vertex triangle strips (`drawTent` in
  `src/render/field/label_b_pass.ts`; `TENT_SEG_VERTS = 2 * NW + 6`
  with `TENT_NW` 3 in `label_b_tent_glsl.ts`). Tiny instances are a
  weak spot of some mobile GPUs: a hypothesis here, untested.

The tent pass neither discards nor writes `gl_FragDepth`
(`label_b_tent_glsl.ts`, header). S3f3's Next: a lever that keeps the
census must keep the round outline and its keys, so the next lever is
chosen by where the drawing's time goes: the fixed cost of a pass that
draws, the vertices, the fragments, or the instancing.

## Read first

1. S3f3's doc, whole (its Rules, How to work and Handoff apply here as
   changed below); S3f2's Handoff (`docs/design/K1040_s3f2_levers.md`:
   the split and its variants); S3d's Handoff
   (`docs/design/K1040_s3d_tent.md`: s3d1's and s3d2's variants and
   splits).
2. The pass: `src/render/field/label_b_pass.ts` (`drawTent` and the
   `probe*` fields), `label_b_tent_glsl.ts`.
3. The kit: `.claude/probes/K1040/s3/page.ts` (the split page: `FNEW`,
   the S3d variants `degen`, `fs0` and `tentvdegen`, S3f3's `facetOpts`),
   `split.mjs`, `phone_time.mjs`, `s3f3_gate.ps1`, `run_locked.ps1`,
   `vert_count.ts`.

## The run

0. `Get-Date`.
1. **The variants**, on the split page beside `ftentv`, `ftentvsetup`,
   `fempty` and `ffloor`, each built like the FNEW variants (lean, the
   host; default off; a probe field on `LabelBPass` where the page
   cannot reach, like `probeDraw`):
   - `ftentvone`: one segment instance and no caps or fills: the cost
     of a pass that draws anything.
   - `ftentvhalf`: half the segment instances (`probeSegFrac` 0.5): the
     segments' own cost, twice the difference.
   - `ftentvclip`: every vertex clipped after its full computation (as
     `tentvdegen`, on today's lean pass, for the segment, cap and fill
     shaders): the vertex work and primitive assembly, no fragments.
   - `ftentvflat`: a fragment shader that keeps the varyings live (as
     `fs0`: it reads every flat and varying) but does none of the label
     arithmetic: the raster, depth test and writes without the shading.
   - `ftentvnw1c`: S3f3's circumscribed wedge at NW 1 (`--circ 1 --nw
     1` in `s3.mjs`): a third fewer segment vertices (8 against 12) at a
     slightly larger coverage, which step 2 counts: the vertex slope
     with the fragments nearly held.
   - `ftentvvid`: the same segment strips as one non-instanced draw (an
     index buffer with primitive restart, or the strips stitched; the
     segment and corner from `gl_VertexID`, the per-segment data read
     as today's instance attribute is): the instancing's own cost. Its
     positions must be bit-identical to today's.
   Commit at each variant that works.
2. **The checks**, on the desktop, each a number in the Handoff. The
   variant checks read the label target back after the pass, on all 12
   scenes; say how you compared:
   - the default is unchanged: the A/B (`ab`, as S3f3's) at 0 px
     outside the label, and `npm test` green;
   - `ftentvclip` leaves the label target as cleared (no pixel differs
     from the clear value);
   - `ftentvone` writes at most one segment's pixels (a count);
   - `ftentvflat` writes the same pixels as `ftentv` (the masks of
     written pixels are equal; keep its output off the clear value);
   - `ftentvnw1c` against `ftentv`: the pixels written by one and not
     the other, a count;
   - `ftentvvid` draws today's label: its readback equals `ftentv`'s,
     bit for bit;
   - each variant's vertices per scene (`vert_count.ts`; cite
     `out/vert_count_s3f3.md` where it already has them).
   A variant that fails its check is fixed or dropped before it is
   timed; say which. `ftentvvid` is the largest piece of work: build it
   last, and if the run's time runs short, drop it and say so.
3. **The desktop timing**, under the perf lock: every variant on all 12
   scenes beside `ftentv`, `ftentvsetup`, `fempty` and `ffloor`, the
   split page run twice, as the phone part will run it. The desktop
   ranks nothing for the Pixel: it proves the variants time and gives
   the table's worked example.
4. **The split**, per scene and run, from each variant's p50, written
   so the Pixel's runs fill the same columns (`split.mjs`, a set
   `s3f4` beside S3f2's `s3f2`), each column with the two runs'
   difference beside it: a reading smaller than that spread decides
   nothing.
   - the drawing: `ftentv - ftentvsetup` (S3f2's column);
   - a pass that draws: `ftentvone - ftentvsetup`;
   - the segments: `2 * (ftentv - ftentvhalf)`, and the caps, fills and
     the rest: the drawing minus the first two;
   - the vertex side: `ftentvclip - ftentvone`; the fragment side:
     `ftentv - ftentvclip`; the shading: `ftentv - ftentvflat`;
   - the vertex slope, ms per 100k vertices: `ftentv - ftentvnw1c` over
     the vertices it saves;
   - the instancing: `ftentv - ftentvvid`.
5. **The gate script.** Copy `s3f3_gate.ps1` to `s3f4_gate.ps1`: the
   desktop part is step 3; the phone part is one batch: the split page
   twice (the variants beside `ftentv`, `ftentvsetup`, `fempty` and
   `ffloor`), then s3f3new and s3ffloorall, so the gate's numbers
   share the phone's state; the tables are `out/split_s3f4.md`
   (step 4's columns, per scene) and `out/phone_table_s3f4.md`. Run
   `s3f4_gate.ps1 -SkipPhone` for step 3, then `-DryRun`, which touches
   no phone and takes no lock, to prove the phone part plans. The
   coordinator runs that part.
6. `npm test`, commit and push. CI must be green after the push.

Done:
- the six variants built, each with its check passed (or dropped, and
  why);
- the desktop split, per scene;
- `s3f4_gate.ps1`, its phone part planned by `-DryRun`;
- `npm test` green, and CI green.

Out of scope: adopting any lever, even `ftentvvid`, and the pass's
default; S4 (the fixed part), S5 (the upload, K1157), S3g (K1143's
list); the label's look.

## Rules

S3f3's Rules apply, with these changes:
- **No phone.** No `phone_batch.ps1`, `run_phone.ps1` or
  `scripts/phone.ps1`, and no adb. Step 5's dry run touches no phone.
- **No default pixel moves.** Every variant is a probe option, off by
  default; the A/B reads 0 px.
- **The stop.** Stop when the run is done or 2 h after step 0's
  `Get-Date`, whichever comes first. A compaction is not a stop. At the
  stop, commit. Then append a Handoff to this brief (what landed,
  commit by commit; the checks; the desktop split per scene; the
  commands; the next step as a read rule on the split's columns: which
  reading of the Pixel's batch points to which lever family, for
  example the fixed cost of a pass that draws to the attachments and
  their stores, the instancing to `ftentvvid`'s draw, the vertex side
  to cheaper vertices, the fragment side to fewer covered pixels),
  commit and push.

## How to work

Batch 15's How to work (`docs/design/K1169_muse_batch15.md`) applies,
with one change: update K1097's handle, not K1169's:

`ledger.mjs handle K1097 --owner "nobody since <yyyy-mm-dd hh:mm> (S3f4 done in Muse run 16J)" --last-commit <sha8> --next "<the Handoff's next step, in one line>" --brief docs/design/K1040_s3f4_bound.md`

The kit's server is on 5403, as in S3f3. No `.claude/rules/` file covers
`src/render/field/` yet: S3f's doc (`docs/design/K1040_s3f_draw.md`) is
the lore.

Report: each variant and its check; the desktop split per scene; the
dry run; the test counts; the commits; and a `Ledger items` list for
Claude to file.

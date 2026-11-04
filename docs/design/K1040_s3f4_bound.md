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

## Handoff

Muse run 16J, 2026-11-04 03:03 to 03:16 (step 0's `Get-Date`
03:03:12 -08:00), on master in the main checkout. Desktop only, as
the brief's Rules say: no phone command ran (`s3f4_gate.ps1
-DryRun` touches no phone and takes no lock); the Pixel batch is
written and dry-planned for the coordinator. No lever adopted, no
default pixel moved: every variant is a probe option, off by
default, and the A/B's host arm differs from the control by 0 px on
all 12 scenes (s3f4ab, as S3f3's; the negative controls differ as
before, 214,574 px and about 306k px with error 1282).

**All six variants are built, and each passed its check on the
desktop on all 12 scenes** (the label target read back after the
pass, `LabelBPass.read()`'s word at every pixel of the 2480x1800
target, compared as counts of pixels whose word differs — for
ftentvclip against the clear value 0, for ftentvflat the mask of
written pixels (word non-zero), for ftentvvid the word itself, bit
for bit). One deviation from the brief's letter: its step 1 says
commit at each variant that works; the five page-driven variants
landed in one commit and `ftentvvid`, built last as the brief also
orders, in the next. The checks below are per variant, from one
`check` run over all 12 scenes.

### What landed

- `6bbb3f25`: the five page-driven variants and the check mode.
  `LabelBPass` gains `probeSegLimit` / `probeSkipCapsFills` (all
  default off); `page.ts` gains `ftentvone`, `ftentvhalf`,
  `ftentvclip`, `ftentvflat` and `ftentvnw1c` beside `ftentv` in
  `FNEW` (lean, the host) and `window.s3.check`; `s3.mjs` gains the
  `check` mode (`out/check_s3f4chk_summary.md`).
- `048159de`: `ftentvvid`. `labelBTentVidSources` in
  `label_b_tent_glsl.ts` (tentv's segment vertex shader with the
  corner from `gl_VertexID % (2 * NW + 6)`) and `probeVid` in
  `label_b_pass.ts`: aSeg repeated per vertex (divisor 0) in a
  buffer built with the layout, the strips separated by an index
  buffer's primitive-restart index, one `drawElements` in place of
  the instanced segment draw; caps and fills unchanged.
- `a9b0a2de`: the counts. `vert_count.ts` extended and
  `out/vert_count_s3f4.md` (per scene; today's by-draw count stands
  as `out/vert_count_s3f3.md`'s).
- `d2887c1c`: `split.mjs`'s set `s3f4` (step 4's columns, below)
  and `s3f4_gate.ps1` (step 5).
- `4d67cbc6`: the desktop split (two split-page runs,
  `s3f4_gate.ps1 -SkipPhone` under the perf lock, errors 0) and the
  check / A/B summaries (`out/split_s3f4_desktop.md`,
  `out/check_s3f4chk_summary.md`, `out/ab_s3f4ab_summary.md`).
- This Handoff's commit.

### The variants and their checks (step 2, all 12 scenes)

Compared as above; `ftentv`'s written pixels a scene run from
879,514 (ring) to 1,796,036 (muse_hash) of 4,464,000.

| variant | what it is | check | read |
|---|---|---|---|
| `ftentvone` | one segment instance, no caps or fills (`probeSegLimit` 1, `probeSkipCapsFills`) | writes at most one segment's pixels | 40-662 px written a scene (g41_def_tw42 to g41_ring_tw64); one segment's tent, as counted |
| `ftentvhalf` | half the segment instances (`probeSegFrac` 0.5) | (the segments' own cost, timed) | writes 373,210-1,017,398 px, about half of `ftentv`'s a scene |
| `ftentvclip` | every vertex clipped after its full computation, as `tentvdegen`, on today's lean pass (segment, cap and fill shaders) | leaves the label target as cleared | 0 px differ from the clear value on every scene |
| `ftentvflat` | a fragment shader that reads every flat and varying (as `fs0`) but does none of the label arithmetic, its output kept off the clear value | writes the same pixels as `ftentv` | the written-pixel masks differ at 0 px on every scene; it writes exactly `ftentv`'s count |
| `ftentvnw1c` | S3f3's circumscribed wedge at NW 1 (`facetOpts(1, true)`): 8 segment vertices against 12, slightly larger coverage | the pixels written by one and not the other | 51-269 px `ftentv` writes and it does not, 0 px the other way, a scene |
| `ftentvvid` | the same segment strips as one non-instanced draw (primitive restart; above) | draws today's label, bit for bit | the word differs from `ftentv`'s at 0 px on every scene |

Per scene (written px: `ftentv` / one / half; nw1c only-`ftentv`;
clip, flat and vid read 0 everywhere, as above):

| scene | ftentv | one | half | nw1c only-base (only-nw) |
|---|---|---|---|---|
| muse_hash | 1796036 | 429 | 1017398 | 269 (0) |
| muse_default_tw | 1349565 | 196 | 737881 | 79 (0) |
| def | 1368079 | 50 | 743591 | 65 (0) |
| fat | 1283028 | 91 | 698908 | 71 (0) |
| ring | 879514 | 555 | 492083 | 158 (0) |
| user_tw42.lightpaper | 1105073 | 292 | 632913 | 86 (0) |
| g41_def_tw42 | 1155808 | 40 | 616832 | 51 (0) |
| g41_def_tw64 | 1604589 | 60 | 885266 | 106 (0) |
| g41_ring_tw42 | 670443 | 292 | 373210 | 79 (0) |
| g41_ring_tw64 | 952069 | 662 | 535121 | 158 (0) |
| g41_user_tw42 | 1105096 | 293 | 632935 | 87 (0) |
| g41_user_tw64 | 1477445 | 660 | 874923 | 215 (0) |

Vertices a frame, per variant and scene, are
`out/vert_count_s3f4.md`'s table (today's 64k-370k; `ftentvone` 12;
`ftentvhalf` about half; `ftentvclip` / `ftentvflat` today's;
`ftentvnw1c` segments x 8; `ftentvvid` today's vertices plus
nInst*12 + nInst - 1 segment indices).

### The desktop split (steps 3-4, `out/split_s3f4_desktop.md`)

The split page run twice under the perf lock (`s3f4d1`, `s3f4d2`),
render-sync p50 ms. The desktop's sync is quantized to 0.1 ms, so
nearly every reading is at the quantization floor: the variants
time, and the table is the worked example of the columns the Pixel
will fill; it ranks nothing. Run 1, then the two runs' difference:

| scene | drawing | a pass that draws | segments | caps/fills/rest | vertex side | fragment side | shading | vertex slope /100k | instancing |
|---|---|---|---|---|---|---|---|---|---|
| muse_hash | 0.40 | 0.10 | 0.20 | 0.10 | 0.20 | 0.10 | 0.10 | 0.00 | 0.00 |
| muse_default_tw | 0.30 | 0.10 | 0.20 | 0.00 | 0.20 | 0.00 | 0.00 | 0.00 | 0.00 |
| def | 0.40 | 0.20 | 0.20 | 0.00 | 0.10 | 0.10 | 0.10 | 0.00 | 0.10 |
| fat | 0.20 | 0.00 | 0.20 | 0.00 | 0.10 | 0.10 | 0.00 | 0.00 | 0.00 |
| ring | 0.10 | 0.00 | 0.00 | 0.10 | 0.00 | 0.10 | 0.00 | 0.00 | 0.00 |
| user_tw42.lightpaper | 0.20 | 0.10 | 0.20 | -0.10 | 0.00 | 0.10 | 0.00 | 0.00 | 0.00 |
| g41_def_tw42 | 0.40 | 0.20 | 0.40 | -0.20 | 0.10 | 0.10 | 0.10 | 0.10 | 0.10 |
| g41_def_tw64 | 0.40 | 0.20 | 0.20 | -0.00 | 0.10 | 0.10 | 0.10 | 0.10 | 0.00 |
| g41_ring_tw42 | 0.10 | 0.00 | 0.20 | -0.10 | 0.00 | 0.10 | 0.00 | 0.54 | 0.00 |
| g41_ring_tw64 | 0.10 | 0.00 | 0.10 | -0.10 | 0.00 | 0.10 | 0.00 | 0.00 | 0.00 |
| g41_user_tw42 | 0.20 | 0.10 | 0.20 | -0.10 | 0.00 | 0.10 | 0.00 | 0.00 | 0.00 |
| g41_user_tw64 | 0.20 | 0.10 | 0.20 | -0.10 | 0.00 | 0.10 | 0.00 | 0.00 | 0.00 |
| median | 0.20 | 0.10 | 0.20 | -0.00 | 0.10 | 0.10 | 0.00 | 0.00 | 0.00 |

The runs' differences (the `d` columns of the file) are 0.00 at the
median for every column, and at most 0.20 anywhere — the desktop's
spread. `s3f4_gate.ps1 -DryRun` then planned all 4 phone runs
(s3f4a, s3f4b, s3f3new, s3ffloorall) and printed the tables from
the files in `out/`; it touched no phone and took no lock. The
coordinator runs `s3f4_gate.ps1 -SkipDesktop` for the Pixel batch.

### Commands

- Checks, under the perf lock: `run_locked.ps1 -RunArgs
  @('check','--tag','s3f4chk')` and `run_locked.ps1 -RunArgs
  @('ab','--tag','s3f4ab')`.
- Desktop: `& .claude\probes\K1040\s3\s3f4_gate.ps1 -SkipPhone`;
  `& .claude\probes\K1040\s3\s3f4_gate.ps1 -DryRun`.
- Counts: `node scripts/run_node.mjs
  .claude/probes/K1040/s3/vert_count.ts`.
- Tests: `npm test` (212 files passed, 2 skipped; 2826 tests
  passed, 9 skipped; tsc first, as the build runs it).

### Next

The Pixel batch (`s3f4_gate.ps1 -SkipDesktop`, the coordinator's
run): the split page twice (s3f4a, s3f4b) then s3f3new and
s3ffloorall, filling `out/split_s3f4.md` and
`out/phone_table_s3f4.md` in this split's columns. Read it as a
rule, column by column, each reading against its two runs'
difference (a reading smaller than that spread decides nothing):

- **`a pass that draws` is the drawing's large term** (of the order
  of the drawing itself): the cost is a pass that draws at all, not
  what it draws — the lever family is the pass's attachments and
  their stores (fewer or smaller attachments, their load/store
  ops), not the geometry.
- **`instancing` reads positive past the spread**: the instanced
  draw itself costs; the lever is `ftentvvid`'s draw (already built
  and bit-identical, so it needs no census — adopting it is the
  coordinator's call, out of this run's scope).
- **`vertex side` dominates**: the vertices' work and primitive
  assembly bind — cheaper vertices (fewer fetches per vertex, a
  cheaper span/point path), and, with **`vertex slope`** read with
  it (ms per 100k segment vertices saved, times the scenes' counts
  in `out/vert_count_s3f4.md`), whether fewer segment vertices at
  the same outline pay.
- **`segments` dominates and the slope is small**: the segments'
  cost is not their vertex count — look at coverage per segment
  (the fragment side) before vertex levers.
- **`fragment side` dominates with `shading` small**: fewer covered
  pixels (coverage: tighter tents, a smaller target) is the lever;
  with **`shading` large**, the lever is cheaper fragment
  arithmetic, not coverage.
- **`caps/fills/rest` is large**: the caps' and fills' geometry
  (their facet counts) is its own lever, separate from the segments.
- If no column clears its spread on the Pixel either, the drawing
  is spread across all of them at that size, and the 2 ms gate
  waits on S4's fixed part and S5's upload as S3f3's Next said.

K1097's gate stands where S3f3 left it: the Pixel reads 3.3-9.9 ms
against 2, and this batch's split says where the drawing's 0.8 ms
must come from.

# K1040 S3f3 (K1097): the label pass's drawing

The coordinator's brief, 2026-11-03. One run for Muse (chain run 15J), on
master, after run 15G. It continues S3f2
(`docs/design/K1040_s3f2_levers.md`), whose Handoff ends at its Next.
This brief starts life in `.claude/probes/K1053/` (the chain's folder,
untracked); step 0 commits it to `docs/design/K1040_s3f3_draw.md`.

## Where S3f2 left it

K1097 puts the depth-tested label pass on the GPU. Its gate is the
Pixel's label cost per scene, `sync p50 - s3ffloorall p50 + upload p50`
(S3f2's Handoff, The Pixel): at most 2 ms on every one of the 12 scenes,
with the census no worse than today's tentv (807 DEFECT, 515 at 0.03 px
or more, no new class) and the control at 0 DEFECT.

After S3f2 the Pixel reads 3.3-9.9 ms. The terms, medians:

| term | now (ms) | what 2 ms needs (S3f's doc, The Pixel gate) |
|---|---|---|
| the ideal floor | 0.3-0.5 | 0.3 |
| the fixed part | about 1.7 as measured; near 1.1 expected after S3f2 removed the invalidate | about 0.6 (S4's integration) |
| the moving upload | 1.3-1.6 (`ftentv up`: 1.6) | about 0.3 (SAMP's x,y at S5) |
| the drawing | 2.6 (S3f's split: 1.4-4.1) | about 0.8 |
| the upload at rest | 0.0 since S3f2 | - |

The drawing is now the largest term, and the only one whose levers are
in this run. They change the geometry, so each needs a census of its own
(S3f2's levers changed no pixel). This run is desktop only (Rules), so
it cannot pass the gate either: it is done when the levers are counted,
built, census-gated and timed on the desktop, and the Pixel batch is
written and planned for the coordinator to run.

## Read first

1. S3f2's doc, whole, and S3f's (`docs/design/K1040_s3f_draw.md`): The
   stage step 3, the Handoff (The census: why NW 2 and NW 1 fail), its
   Next 4 and The Pixel gate. Their Rules apply, changed as this
   brief's Rules say.
2. The pass: `src/render/field/label_b_pass.ts` (drawTent),
   `label_b_tent.ts`, `label_b_tent_glsl.ts` (TENT_SEG_VERTS,
   TENT_CAP_VERTS, TENT_FILL_VERTS), `label_b_host.ts` and
   `test/render/field/label_b_tentv.test.ts`.
3. The kit: `.claude/probes/K1040/s3/vert_count.ts` (today's vertices
   per scene), `s3.mjs` (the `--nw` facet knob, `page.ts` nwOpts),
   `defects.ps1`, `run_locked.ps1`, `s3f2_gate.ps1`.

## The run

0. `Get-Date`. Copy this brief to `docs/design/K1040_s3f3_draw.md`,
   commit and push it alone.
1. **The count.** Extend `vert_count.ts`: per scene, today's vertices
   by draw, then what each lever below would leave. For the first lever
   that needs the reach itself: find what reads the label, and from
   which pixels, and count the tents whose quads touch none of them.
   Commit the count (`out/vert_count_s3f3.md`) before building
   anything.
2. **Tents only within the junctions' reach.** Build it as an option of
   the pass beside today's: a tent no reader reaches is not drawn. The
   census before the timing. Commit.
3. **Continuous strips per chain run.** One strip per run of a chain's
   segments in place of one instance per segment, so neighbours share
   their vertices. An option beside today's, census, commit.
4. **The circumscribed wedge.** NW 2 and NW 1 failed the census with
   facets inside the round shape: most of NW 2's added defects are
   gpu-hole and lower. Push the facet vertices out so the polygon
   contains the round shape, and run NW 2 (and NW 1 if NW 2 passes)
   through the census. An option, commit, kept only if it passes.
5. **The census and the A/B** after each lever: within the condition
   (at most 807 DEFECT, at most 515 at 0.03 px or more, no class tentv
   lacks by `defects.ps1`), the control at 0, and the A/B (`ab`, as
   S3f2's) at 0 px outside the label. Name each lever's numbers
   scene by scene. A lever that fails is measured and dropped, not
   tuned until it passes; say why it failed.
6. **The gate script.** Copy `s3f2_gate.ps1` to `s3f3_gate.ps1` with
   the kept levers' passes (tags `s3f3...`), alone and combined, beside
   S3f2's s3f2newb and s3ffloorall.
7. **The desktop timing**, under the perf lock: `s3f3_gate.ps1
   -SkipPhone`, so today's tentv and every kept lever share one run and
   the machine's state. The desktop ranks the levers; it does not stand
   in for the Pixel. Then `s3f3_gate.ps1 -DryRun`, which touches no
   phone and takes no lock, to prove the phone part plans. The
   coordinator runs that part.
8. `npm test`, commit and push. CI must be green after the push.

Done:
- the count per scene, today and per lever;
- each lever built as an option, with its census, kept or dropped;
- the desktop timing of the kept levers, alone and combined;
- `s3f3_gate.ps1`, its phone part planned by `-DryRun`;
- `npm test` green, and CI green.

Out of scope: the default of the pass (the Pixel decides it), the live
game (S5), the upload (K1157, S5), the fixed part (S4), instancing, S3g's
list and the label's look.

## Rules

S3f2's Rules apply, with these changes:
- **No phone.** K1050's "No phone work this week" applies to this run:
  no `phone_batch.ps1`, `run_phone.ps1` or `scripts/phone.ps1`, and no
  adb. Step 7's dry run touches no phone.
- **The census gates each lever**, and the timing follows it: never
  time a lever that has not passed.
- **The stop.** Stop when the run is done or 2 h after step 0's
  `Get-Date`, whichever comes first. A compaction is not a stop. At the
  stop, commit. Then append a Handoff to this brief (what landed, commit
  by commit; the count, the census and the desktop table per scene; the
  commands; the next step), commit and push.

## How to work

Batch 15's How to work (`docs/design/K1169_muse_batch15.md`) applies,
with one change: update K1097's handle, not K1169's:

`ledger.mjs handle K1097 --owner "nobody since <yyyy-mm-dd hh:mm> (S3f3 done in Muse run 15J)" --last-commit <sha8> --next "<the Handoff's next step, in one line>" --brief docs/design/K1040_s3f3_draw.md`

No `.claude/rules/` file covers `src/render/field/` yet: S3f's doc is
the lore.

Report: the count per scene; each lever's census and desktop timing,
kept or dropped; the dry run; the test counts; the commits; and a
`Ledger items` list for Claude to file.

## Handoff

Muse run 15J, 2026-11-04 01:36 to 01:55 (step 0's `Get-Date`
01:36:05 -08:00), on master in the main checkout. Desktop only, as
the brief's Rules say: no phone command ran; the Pixel batch is
written and dry-planned for the coordinator.

**No lever kept its census, so the drawing stands where S3f2 left
it.** Each lever is built as an option beside today's pass, measured
and dropped, not tuned. Today's pass on this tree reads the
condition exactly (s3f3new: 807 DEFECT, 515 at 0.03 px or more; the
control s3f3ctl: 0), and the A/B's host arm differs from the control
by 0 px on all 12 scenes (s3f3ab; the negative controls differ as
before, 214,574 px and about 306k px with error 1282).

### What landed

- `ea3ac26e`, step 0: this brief, copied from
  `.claude/probes/K1053/K1040_s3f3_draw.md`.
- `586f8bc0`, step 1: the count (`vert_count.ts` extended,
  `out/vert_count_s3f3.md`; the tables below).
- `f032471a`, lever 1 (reach): the pass option `probeReachKeep` and
  the kit's `--reach` (page.ts `reachKeep`). Census s3f3reach
  (3 scenes; see below): dropped.
- `c4486085`, lever 3 (circ): page.ts `facetOpts` and `--circ`
  (with `--nw`). Census s3f3circ2 (all 12): dropped; NW 1 not run.
- `b2902bba`, lever 2 (strips): `labelBTentStripSources` in
  `label_b_tent_glsl.ts`, the pass's `probeStrip` strip build and
  draw, and `--strip`. Census s3f3strip (2 scenes): dropped.
- `56e56976`, step 6: `s3f3_gate.ps1` (below).
- This Handoff's commit, with `out/desktop_table_s3f3.md` and the
  s3f3new / s3f3ctl / s3f3ab summaries.

### The count (step 1, `out/vert_count_s3f3.md`)

Today's vertices a frame, by draw, stand as S3f counted them
(64k-370k; segments about 90%, caps 8-10%, fills the rest). What
each lever would leave, per scene (total vertices; the count file
has every column):

| scene | today | reach left (saved) | strips left (saved) | circ NW 2 / NW 1 |
|---|---|---|---|---|
| muse_hash | 328196 | 237884 (27.5%) | 123132 (62.5%) | 281498 / 234800 |
| muse_default_tw | 347624 | 238904 (31.3%) | 128148 (63.1%) | 300340 / 253056 |
| def | 363206 | 262430 (27.7%) | 134596 (62.9%) | 314170 / 265134 |
| fat | 207900 | 0 (100%) | 48024 (76.9%) | 173250 / 138600 |
| ring | 64354 | 30898 (52.0%) | 26348 (59.1%) | 55226 / 46098 |
| user_tw42.lightpaper | 155836 | 100420 (35.6%) | 59676 (61.7%) | 134546 / 113256 |
| g41_def_tw42 | 369806 | 260558 (29.5%) | 136346 (63.1%) | 320486 / 271166 |
| g41_def_tw64 | 353984 | 261548 (26.1%) | 130842 (63.0%) | 305278 / 256572 |
| g41_ring_tw42 | 65878 | 31270 (52.5%) | 26084 (60.4%) | 56666 / 47454 |
| g41_ring_tw64 | 63928 | 30904 (51.7%) | 26668 (58.3%) | 54820 / 45712 |
| g41_user_tw42 | 155836 | 100420 (35.6%) | 59680 (61.7%) | 134546 / 113256 |
| g41_user_tw64 | 151294 | 103630 (31.5%) | 60276 (60.2%) | 130200 / 109106 |

The reach the count uses: the label's readers are S4's band and
S7's tint/rim (F7 of `docs/design/K1040_junction_field.md`); a
surface is contested only where a junction's arms reach, so the
reader region is the tube of radius h + W + aa about every FormB
arm's polyline, and a segment tent is reached when its capsule
(radius h) touches it. The strip count is 2 vertices a point plus
the wedge fan's inner facets and a degenerate mate a joint; the
built strip (below) instead duplicates each cross-section for its
flat vQ, about 4 vertices a segment before caps and fills, so its
true saving is smaller than the count's 59-77%.

### The census, lever by lever (condition: at most 807 DEFECT, at most 515 at 0.03 px or more)

- **Reach: dropped.** fat (0 groups: every tent dropped) 1,282,835
  DEFECT, ring 575,320, muse_hash 626,536 — nearly all gpu-hole at
  bucket none. Why: the census reads the label at every pixel, and
  so does the band the pass exists for (tube edges on every
  segment, `src/render/label/label_band.ts`); a tent outside the
  junctions' reach is still read along its own segment's edges, so
  dropping it leaves a hole. The remaining 9 scenes were not run:
  the failure is one hole per dropped tent, not a scene's detail.
- **Circumscribed wedge, NW 2: dropped.** 1021 DEFECT, 649 at
  0.03 px or more, scene by scene: muse_hash 258/183,
  muse_default_tw 54/33, def 60/25, fat 22/0, ring 56/28,
  user_tw42.lightpaper 91/62, g41_def_tw42 36/9, g41_def_tw64
  75/43, g41_ring_tw42 19/8, g41_ring_tw64 53/35, g41_user_tw42
  77/61, g41_user_tw64 220/162 (DEFECT / at 0.03 px or more).
  Balanced NW 2 read 1071/681 (S3f): the circumscribed polygon
  closes the holes (gpu-hole is nearly gone) but covers past the
  round shape, and the added higher-own defects leave it over the
  condition. NW 1 was not run, as the brief orders (NW 2 first).
- **Strips: dropped.** ring 121,269 DEFECT, fat 20,137, mostly
  gpu-extra at bucket none: the mitred cross-section pokes outside
  the round tube where today's wedge arc stays balanced, and its
  corner key (z - |o|/K at h/cos(phi/2)) moves with it. The other
  scenes were not run; the mitre is the same on all of them.

No lever passed, so none was timed (the brief: never time a lever
that has not passed), and there is no combined pass. The three
options stay in the tree as probe knobs beside today's pass
(`probeReachKeep`, `probeStrip`, `facetOpts`/`--circ`), all off by
default; today's draw is untouched, as s3f3new's 807/515 and the
A/B's 0 px say.

### The desktop (step 7, `s3f3_gate.ps1 -SkipPhone`, under the perf lock)

GPU timer p50 + the upload calls' p50 (ms), today's tentv
(s3f3newtime moving, s3f3newresttime at rest; s3f3tentvtime is
S3e's state handling):

| scene | new moving | new at rest | tentv moving |
|---|---|---|---|
| muse_hash | 0.87 | 0.47 | 1.05 |
| muse_default_tw | 0.83 | 0.43 | 1.19 |
| def | 1.03 | 0.44 | 1.21 |
| fat | 0.66 | 0.36 | 0.78 |
| ring | 0.39 | 0.29 | 0.42 |
| user_tw42.lightpaper | 0.64 | 0.34 | 0.63 |
| g41_def_tw42 | 1.02 | 0.42 | 1.23 |
| g41_def_tw64 | 0.96 | 0.46 | 1.20 |
| g41_ring_tw42 | 0.38 | 0.28 | 0.41 |
| g41_ring_tw64 | 0.40 | 0.30 | 0.42 |
| g41_user_tw42 | 0.64 | 0.34 | 0.73 |
| g41_user_tw64 | 0.67 | 0.37 | 0.73 |

(`out/desktop_table_s3f3.md` has all four columns.) The desktop
ranks nothing: no lever survived to rank. `s3f3_gate.ps1 -DryRun`
then planned all 8 phone runs (s3f3new, s3ffloorall, s3f2newb,
s3ftentv, s3f3newrest, s3f2newrest, s3f2oldrest, the s3f2 split)
and printed the tables from the files in `out/`; it touched no
phone and took no lock. The coordinator runs
`s3f3_gate.ps1 -SkipDesktop` for the Pixel batch.

### Commands

- Tests: `npm test` (212 files passed, 2 skipped; 2826 tests
  passed, 9 skipped; tsc first, as the build runs it).
- Censuses, under the perf lock: `run_locked.ps1 -RunArgs
  @('verdict', ... '--reach','1','--tag','s3f3reach')`, likewise
  `--nw 2 --circ 1 --tag s3f3circ2` and `--strip 1 --tag
  s3f3strip`, each closed by `defects.ps1 <tag>`; the gate's own
  s3f3new / s3f3ctl verdicts came from the gate run below.
- Desktop: `& .claude\probes\K1040\s3\s3f3_gate.ps1 -SkipPhone`;
  `& .claude\probes\K1040\s3\s3f3_gate.ps1 -DryRun`; the A/B
  through `run_locked.ps1 -RunArgs @('ab','--tag','s3f3ab')`.
- Counts: `node scripts/run_node.mjs
  .claude/probes/K1040/s3/vert_count.ts`.

### Next

The Pixel batch (`s3f3_gate.ps1 -SkipDesktop`, the coordinator's
run) beside S3f2's s3f2newb and s3ffloorall. The drawing's counted
savings (reach 26-52%, strips about 60%, circ NW 2 about 15%) all
move the label the census reads, so the 2 ms gate still waits on
the terms S3f2 named: the fixed part's remainder at S4's
integration and the moving upload's SAMP x,y at S5. A drawing
lever that keeps the census would have to keep the round outline
and its keys (a wedge arc, not a mitre; a circumscribed arc at
today's NW, not fewer facets) — that is a vertex-shader cost
question, not a vertex-count one.

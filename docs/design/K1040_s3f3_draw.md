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

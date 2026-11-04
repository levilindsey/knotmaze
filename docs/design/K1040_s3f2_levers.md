# K1040 S3f2 (K1097): the label pass's upload and fixed part, on the Pixel

The coordinator's brief, 2026-11-03. One run for Muse (chain run 15I), on
master, after run 15H. It continues S3f (`docs/design/K1040_s3f_draw.md`),
whose code and kit landed on master in 01f69cd0.

## Where S3f left it

K1097 puts the depth-tested label pass on the GPU. Its gate is the
Pixel's label cost per scene, `s3fnew - s3ffloorall + upload`: at most
2 ms on every one of the 12 scenes, with the census no worse than
today's tentv (807 DEFECT, 515 at 0.03 px or more, no new class) and the
control at 0 DEFECT.

S3f's Pixel run (the coordinator's, 2026-11-03 22:21-22:29) missed it:
4.0-10.9 ms, median 5.5 (`.claude/probes/K1040/s3/out/phone_table_s3f.md`).
The median splits into four terms (`out/split_s3f1.md`; S3f's doc, The
Pixel gate, at its end):

| term | median (ms) | its share of 2 ms |
|---|---|---|
| the ideal floor | 0.3 | 0.3 |
| the fixed part, `fempty - d32f` | 1.5 (0.9-2.4) | about 0.6 |
| the upload, the pass's main-thread time in its calls | 1.3 (0.6-2.8); at rest 0.7-4.1 | about 0.3 |
| the drawing | 2.5 (1.4-4.1) | about 0.8 |

This run takes the two CPU-side terms, the upload and the fixed part.
Their levers change no pixel, so the census must not move at all. The
drawing's levers change the geometry, and each needs a census of its
own: they are the next stage (S3f3), not this one. So this run cannot
pass the gate alone. It is done when its levers are built and timed on
the Pixel.

## Read first

1. S3f's doc, whole: The gate, the Handoff (What landed, The census,
   Commands, Next) and The Pixel gate. Its Rules apply, changed as this
   brief's Rules say.
2. S3e's Rules (`docs/design/K1040_s3e_lean.md`), for the phone and the
   perf lock.
3. The pass: `src/render/field/label_b_pass.ts`, `label_b_host.ts` and
   `label_b_tent.ts`, and `test/render/field/label_b_tentv.test.ts`.
4. K1157 (`ledger.mjs show K1157`), the upload levers, and S3e's
   Handoff, step 2, which measured the bytes.

## The run

0. `Get-Date`.
1. **The upload at rest.** At rest the upload costs as much as moving,
   or more (s3fnewrest: 0.7-4.1 ms), because the pass records the spans
   and diffs the rows on every frame. Skip both on a frame where nothing
   the pass reads has changed. Finding that out must be cheap: a counter
   the positions already carry, or the sleep state, not a scan of them.
   Tests: a frame that changes nothing uploads nothing; a frame that
   moves one particle uploads its rows, and the texture then equals a
   full upload's, bit for bit.
2. **The moving upload (K1157).** First time the per-call cost against
   the bytes. If the calls dominate, put the tables in one texture. Then
   read x,y from K8's SAMP instead of uploading them (a quarter of the
   moving 212,992-901,120 B; it needs a vertex-to-sample map). Tests:
   the new layout gives the old layout's label on the fixtures, bit for
   bit.
3. **The fixed part.** Split `fempty - d32f` with timed variants, as
   s3f1 did (its host restore, 0.2, and `noupns - d32f`, 0.5, are the
   known parts), and remove what is cheap to remove.
4. **The census and the A/B** after each lever that touches the pass:
   the census unchanged (807 / 515, the same classes, control 0) and the
   A/B's pixels identical. If either moves, revert that lever and say
   so.
5. **The Pixel.** Copy `s3f_gate.ps1` to `s3f2_gate.ps1`, add your
   passes (tags `s3f2...`), and run them in one batch beside S3f's
   s3fnew, s3fnewrest and s3ffloorall, so before and after share the
   phone's state. The table per scene: the label cost, the upload moving
   and at rest, and the fixed part's split.
6. `npm test`, commit and push. CI must be green after the push.

Done:
- the at-rest skip, and each K1157 lever kept, or measured and dropped;
- the fixed part's split, with what was removed;
- the census and the A/B unchanged;
- the Pixel table, before and after in one batch, and the gate's verdict
  (at most 2 ms on every scene) either way;
- `npm test` green, and CI green.

## The phone (this run only)

K1050's "No phone work this week" does not apply to this run. Levi left
the phone on its charger tonight, and the coordinator gives this run the
Pixel for step 5. S3e's Rules, The phone, apply:
- Run it only through `.claude/probes/K1040/s3/phone_batch.ps1`. It takes
  the phone lock and the perf lock, then K1142's ready check.
- Links carry `&snd=none`. Send no key or input event.
- Stop at the first non-zero exit. If the phone isn't ready by your cap,
  end with the desktop results.
- Never run `scripts/phone.ps1`. Keep serials, IPs and Tailscale names
  out of tracked files, commits and your report.

## Rules

S3f's Rules apply, with these changes:
- **Master, not a worktree.** You work in the main checkout on master,
  as batch 15's How to work says. S3e's "Worktree only" and S3f's
  "Master moves under you" do not apply.
- **Ports.** The kit's server keeps 5403 (the phone's links use it;
  K1097's env line). Anything else goes on 5590-5594. Avoid 5173, the
  phone's 5480-5489 and K1139's 5620-5639.
- **Timing.** Every timing, desktop or phone, runs under the perf lock,
  through `run_locked.ps1` or `phone_batch.ps1`. Never pipe
  `run_locked.ps1` through `Select-Object -First` (K1174).
- **The stop.** Stop when the run is done or 2 h after step 0's
  `Get-Date`, whichever comes first. A compaction is not a stop. At the
  stop, commit. Then append a Handoff to this brief (what landed, commit
  by commit; the table per scene; the commands; the next step), commit
  and push.

## How to work

Batch 15's How to work (`docs/design/K1169_muse_batch15.md`) applies,
with the phone above and one more change: update K1097's handle, not
K1169's:

`ledger.mjs handle K1097 --owner "nobody since <yyyy-mm-dd hh:mm> (S3f2 done in Muse run 15I)" --last-commit <sha8> --next "<the Handoff's next step, in one line>" --brief docs/design/K1040_s3f2_levers.md`

No `.claude/rules/` file covers `src/render/field/` yet: S3f's doc is
the lore.

Report: the gate's verdict; the table per scene, before and after; the
fixed part's split; the census; the test counts; the commits; and a
`Ledger items` list for Claude to file.

## Handoff

Muse run 15I, 2026-11-03 23:13 to about 23:50, on master in the main
checkout. Step 0's `Get-Date`: 23:13:08.

**The gate missed: 3.3-9.9 ms against 2 on every scene** (s3f2newb,
below). As the brief said, this run cannot pass it alone: it took the
two CPU-side terms and left the drawing (median 2.6) for S3f3. What it
did land: the at-rest upload is now 0.0 ms on the Pixel (S3e's row diff
read 0.8-4.3 there, median 2.5, on the same pages), and the depth
invalidate is gone.

### What landed

- `188f2ef1`, step 1 (the at-rest skip) and step 2's instrument.
  `upload(T, unchanged)` in `label_b_pass.ts`: the caller asserts
  nothing the pass reads has changed (from the physics' sleep state or
  a position counter; the pass does not scan), and the pass skips
  `tentSpanRecord` and the row diff entirely — no GL call, no bytes.
  Never the first upload. `uploadCalls` counts the last upload's
  texImage2D/texSubImage2D calls beside `uploadBytes`. Probe knobs
  `probeBindOnly` / `probeNoClear` (default off) for step 3's split.
  `test/render/field/label_b_upload.test.ts` (a recording fake GL): the
  first upload never skips; an unchanged frame uploads nothing; one
  moved particle uploads only its row (16,384 B, 1 call) and the
  textures then equal a full upload's, bit for bit; `probeAllDirty`
  still sends every used row.
- `e9f96818`, the kit: `s3f2_gate.ps1` (copied from `s3f_gate.ps1`),
  page.ts's rest wiring (`time --rest` asserts unchanged; timeMany's
  `ftentvrest` asserts it while `leantentvrest` keeps S3e's row diff as
  the before) and split variants (`femptyb` bind+viewport only,
  `femptynoupnc` no clears, `femptynoupst` D's store kept), and
  split.mjs's `s3f2` columns. Its `-DryRun` parses and plans, no phone,
  no lock.
- `6bff8fbb`, step 3's removal: lean `draw()` no longer invalidates D.
  Nothing samples D, and the split read the invalidate at about 0.6 ms
  (below). `probeInvalidateDepth` keeps the old way for the probes.
- This Handoff's commit, with the tables (`out/phone_table_s3f2.md`,
  `out/phone_table_s3f2b.md`, `out/split_s3f2.md`,
  `out/desktop_table_s3f2.md`).

Step 2's levers, both measured and dropped:

- **The tables in one texture: dropped.** The moving upload is 4-5
  calls at every size (desktop, `time_s3f2newtime`): 212,992 B reads
  0.10 ms, 901,120 B 0.40. A fit over the 12 scenes gives an intercept
  of 0.003 ms for all five calls and 0.45 ms per MB: the cost is the
  bytes, not the calls. Merging the calls saves the intercept.
- **x,y from K8's SAMP: dropped, not cheap.** It needs the vertex
  fetches rewritten in both tent shaders, a vertex-to-sample map (SAMP
  packs `chainSamples`, which differ from the label's pts at the END
  arm's extension vertex; S3e's Handoff), and a probe page that runs
  the live renderer — the s3 page builds the pass alone, so no SAMP
  texture exists there to read. Its ceiling is a quarter of the moving
  upload: about 0.3 ms of the Pixel's 1.3 median. It belongs with the
  live integration (S5), not this run. Filed below.

Step 3's split (Pixel, `out/split_s3f2.md`, medians): `fempty - d32f`
1.7 (S3f: 1.5), of which the moving upload 1.0, the clears 0.5
(`femptynoup - femptynoupnc`), the host restore 0.4, and the rest
bind+viewport+sync (`no-clear rest` 0.7, which still held the
invalidate). Keeping D's store read −0.2..−1.3 (median −0.6) on all 12
scenes, so the invalidate was the one cheap removal; after it,
`femptynoup` and `femptynoupst` read the same (confirmation batch
`s3f2c`). Setup (`ftentvsetup - fempty`) 0.0. Nothing else there is
cheap: the clears and the host restore are the pass's contract with
S4 and Pixi.

### The census and the A/B

Unchanged after each lever. Desktop, under the perf lock:
`s3f2new` (before the invalidate removal) and `s3f2newb` (after) both
read 807 DEFECT, 515 at 0.03 px or more, scene by scene as S3f's
`s3fnew`; the control `s3f2ctl` reads 0. The A/B (`s3f2ab`, `s3f2ab2`):
the host arm differs from the control by 0 px on all 12 scenes, with
the negative controls differing as before (214,574 px and about
306k px with error 1282).

### The Pixel

One batch (`s3f2_gate.ps1 -SkipDesktop`, 23:23-23:32, exit 0; the
phone cool, no media playing), S3f's passes beside the new ones, then
a confirmation batch (`phone_batch.ps1 -Name s3f2b`, 23:36-23:40) after
the invalidate removal. The label cost is `sync p50 - s3ffloorall p50
+ upload p50`:

| scene | S3f's cost (2026-11-03 22:21) | s3f2new (this batch) | s3f2newb (after step 3) | at rest, upload skip / diff |
|---|---|---|---|---|
| muse_hash | 5.1 | 8.5 | 8.6 | 0.0 / 4.1 |
| muse_default_tw | 4.8 | 4.8 | 5.6 | 0.0 / 3.9 |
| def | 10.9 | 10.4 | 9.9 | 0.0 / 4.3 |
| fat | 6.4 | 5.5 | 6.1 | 0.0 / 2.5 |
| ring | 4.0 | 3.5 | 4.2 | 0.0 / 0.8 |
| user_tw42.lightpaper | 5.5 | 5.5 | 5.5 | 0.0 / 1.8 |
| g41_def_tw42 | 6.1 | 6.6 | 8.1 | 0.0 / 4.3 |
| g41_def_tw64 | 9.4 | 8.6 | 6.4 | 0.0 / 4.2 |
| g41_ring_tw42 | 4.8 | 4.0 | 3.3 | 0.0 / 0.8 |
| g41_ring_tw64 | 4.4 | 4.4 | 3.8 | 0.0 / 0.8 |
| g41_user_tw42 | 6.4 | 5.5 | 4.4 | 0.0 / 1.9 |
| g41_user_tw64 | 5.4 | 5.5 | 5.5 | 0.0 / 1.9 |

The at-rest columns are the split page's `rest up skip` (0.00 on every
scene) against `rest up diff` (S3e's row diff, same pages). Two
honesties: the batches disagree with each other by more than step 3's
saving (the full-pass cost did not move measurably; the empty-pass
split did), and `s3fnewrest` / `s3f2oldrest` in the gate batch also
assert unchanged in `time --rest`, so their upload columns read 0.0
too — the diff before is the split page's column, and S3f's recorded
0.7-4.1. The gate's moving cost is unchanged because the drawing
(median 2.6) and the moving upload (median 1.6 in `ftentv up`) are
still there, over a fixed part of about 1.7 and a floor of 0.3-0.5.

### Commands

- Tests: `npx vitest run test/render/field/label_b_upload.test.ts
  test/render/field/label_b_tentv.test.ts` (18 passed); `npm test`
  (210 files, 2799 tests passed).
- Desktop: `& .claude\probes\K1040\s3\s3f2_gate.ps1 -SkipPhone`;
  the A/B and the post-step-3 census through `run_locked.ps1`
  (`ab --tag s3f2ab2`, `verdict --mode tentv --lean 1 --state new
  --tag s3f2newb`), then `defects.ps1 s3f2newb`.
- Pixel: `& .claude\probes\K1040\s3\s3f2_gate.ps1 -SkipDesktop`;
  `& .claude\probes\K1040\s3\phone_batch.ps1 -Name s3f2b -Runs
  @('...s3f2newb...', '...s3f2floorb...', '...s3f2c variants...')`
  as run at 23:36 (its full lines are in
  `out/batch_s3f2b_20261103_2335.log`).

### Next

S3f3, the drawing: tents only within the junctions' reach first (not
yet counted), then continuous strips per chain run, then the
circumscribed wedge for fewer facets. With the drawing near 0.8, the
fixed part near 1.1 (1.7 less the invalidate) and the moving upload
near 1.3, the dense scenes still sit over 2 — the moving upload's
remaining lever is SAMP's x,y at the live integration (S5), and the
fixed part's is whatever S4's integration makes of the host restore
and the clears.

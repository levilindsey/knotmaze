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

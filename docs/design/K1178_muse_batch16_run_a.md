# Muse batch 16, Run A: draft the batch's brief (K1178)

Claude starts this run through Paseo after batch 15
(`docs/design/K1169_muse_batch15.md`, K1169) was reviewed and closed.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`. Chain
run 16J (K1097 S3f4, `docs/design/K1040_s3f4_bound.md`) follows it; the
runs this draft describes come after 16J.

## How to work

Batch 15's "How to work" applies unchanged: read it in
`docs/design/K1169_muse_batch15.md` (it sends you on to batch 8's rules
in `docs/design/K1131_muse_batch8.md` and to
`docs/design/K1050_muse_week.md`) before anything else. Read K1178
wherever it, or a page it sends you to, says K1169 or K1131.

After the run, update K1178's handle:
`ledger.mjs handle K1178 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## Run A · draft batch 16's brief (no run)

Write `docs/design/K1178_muse_batch16.md`: a brief in batch 15's form
(the header, "How to work" pointing at batch 15's, then one section per
run with Read first, the ledger's text quoted, what is there today,
Tasks, Done and the close lines), for up to six runs. This run is Run A,
so label the batch's runs B to G: the chain's tags are `16B` to `16G`
(`16J` is taken). Batch 16 uses ports 5550-5599; give each run its own
range. Take candidates in this order, and stop at six runs that fit:

1. **K1139 S3b, the fan shader**, first: section 5 of
   `docs/design/K1139_pulse_junctions.md`, S3a's brief
   (`docs/design/K1139_s3a.md`) and its commit `4f625916`. The run
   builds S3b and its numeric checks (P8 in the fan,
   the A/B at 0 px outside banded records, the paint mirror tests),
   shoots the look sheet against mock-up look A, and stops there: Claude
   judges the look before Levi sees it. The Pixel's frame cost and
   shader compile time run later, batched with S4, by the coordinator:
   the run plans that batch with a dry run and touches no phone. Two
   notes from S3a's run: the corner cubic's arc/tau ratio is about 0.79
   at 90°, so a band's tau must be arc-true; x4's e134 at node_378 is a
   cycle arm and gets no band until S4. S4 is not in this batch: it
   waits on Claude's look check.
2. `## Approved, to schedule` in `LEDGER.md`: K22, K23, K322 and K805.
   Batch 14's "Left out on purpose" (`docs/design/K1161_muse_batch14.md`)
   says why each was skipped; take one only if that reason no longer
   holds, and say why.
3. The residuals numbered above K1161 (filed since batch 14's draft),
   except K1178, this batch's own item.
4. Then `## Residuals (known, not fixed)`, in ledger order, starting
   after K1160 (batch 14's draft read through K1160). Name the last
   residual you read in the draft's header, so batch 17's draft starts
   after it. When you reach the end of the section before six runs
   fit, go on from its top, in order, and stop at six runs or where you
   started; take an item an earlier draft left out only if its reason
   no longer holds, and say why.

Skip K1040's label pass (K1097, K1143 and K1157;
`src/render/field/` and `.claude/probes/K1040/`): run 16J and Claude own
it, and no run of this batch touches those paths. Skip, too, physics
(the simulation), the cursive, phone passes, items waiting on Levi,
items In progress other than K1139, K1168 (Claude writes its brief;
deploying it needs the Google OAuth client, Cloudflare Worker and D1
database from Levi), and
K1163 and K1166 (Levi's).

Read each candidate's code before writing its run: quote no line number
you didn't read, and give any re-measurement's stand as the original
probe's source holds it (rule 11). A run whose close rewrites an item's
text (ledger.mjs has no command for it) says so in its close lines and
gives the new text in its report, for Claude to apply. End the draft
with a "Left out on purpose" list naming each candidate you read and
skipped, and why.

Commit it as a work commit (`K1178 A: batch 16 draft`) and push. Close
nothing and file nothing: put anything you would file in your report
for Claude. Claude reviews the draft on master and queues its runs.

# Muse batch 17, Run A: draft the batch's brief (K1184)

Claude starts this run through Paseo after batch 16
(`docs/design/K1178_muse_batch16.md`, K1178) was reviewed and closed.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`. The
runs this draft describes come after it, once Claude has reviewed the
draft.

## How to work

Batch 16's "How to work" applies unchanged: read it in
`docs/design/K1178_muse_batch16.md` (it sends you on to batch 15's,
batch 8's rules in `docs/design/K1131_muse_batch8.md` and
`docs/design/K1050_muse_week.md`) before anything else. Read K1184
wherever it, or a page it sends you to, says K1178, K1169 or K1131.

After the run, update K1184's handle:
`ledger.mjs handle K1184 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## Run A · draft batch 17's brief (no run)

Write `docs/design/K1184_muse_batch17.md`: a brief in batch 16's form
(the header, "How to work" pointing at batch 16's, then one section per
run with Read first, the ledger's text quoted, what is there today,
Tasks, Done and the close lines), for up to six runs. This run is Run A,
so label the batch's runs B to G: the chain's tags are `17B` to `17G`.
Batch 17 uses ports 5640-5699; give each run its own range. Every task
must be decided by a unit test, a desktop probe, a dry run or a
measurement table, and none may need Levi or the phone. A run that
changes what the player sees shoots a look sheet and stops there:
Claude judges looks. Take candidates in this order, and stop at six
runs that fit:

1. `## Approved, to schedule` in `LEDGER.md`: K22, K23, K322 and K805.
   Batch 16's "Left out on purpose" says why each was skipped; take one
   only if that reason no longer holds, and say why. K144 is skipped
   (see below).
2. The residuals numbered above K1178 (filed since batch 16's draft),
   except K1184, this batch's own item.
3. Then `## Residuals (known, not fixed)`, in ledger order, starting
   after K648 (batch 16's draft took its last run there). Name the last
   residual you read in the draft's header, so batch 18's draft starts
   after it. When you reach the end of the section before six runs
   fit, go on from its top, in order, and stop at six runs or where you
   started; take an item an earlier draft left out only if its reason
   no longer holds, and say why.
4. If fewer than six fit, `## Next, in order`, from the top: an item
   whose next stage is bounded and decided by the checks above. Name
   the stage; a whole feature is not one run.

Skip these lanes, and keep every run out of their paths:
- K1040's label pass (K1097, K1143, K1157 and K1180;
  `src/render/field/` and `.claude/probes/K1040/`): Claude owns it.
- K1139's junction pulse: a Claude agent is building its next stage in
  its own worktree, so no run touches `src/render/junction_field.ts`,
  `src/render/junction_routes.ts`, `src/render/arm_strip.ts`,
  `src/render/ribbon/`, their tests or `.claude/probes/K1139/`.
- K1179's geometry review (K1182 included, and `.claude/probes/K1179/`):
  Claude reviews S1c and Levi picks the direction.
- Physics (the simulation), the cursive, phone passes, items waiting on
  Levi, items In progress, K144 and K1168 (Claude writes their briefs;
  deploying them needs the Google OAuth client, Cloudflare Worker and
  D1 database from Levi), K1181 (the laptop's checkout), and anything
  under `.claude/worktrees/`.

Read each candidate's code before writing its run: quote no line number
you didn't read, and give any re-measurement's stand as the original
probe's source holds it (rule 11). A run whose close rewrites an item's
text (ledger.mjs has no command for it) says so in its close lines and
gives the new text in its report, for Claude to apply. End the draft
with a "Left out on purpose" list naming each candidate you read and
skipped, and why.

Commit it as a work commit (`K1184 A: batch 17 draft`) and push. Close
nothing and file nothing: put anything you would file in your report
for Claude. Claude reviews the draft on master and queues its runs.

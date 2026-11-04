# Muse batch 12, Run A: draft the batch's brief (K1153)

Claude starts this run through Paseo after batch 11
(`docs/design/K1146_muse_batch11.md`, K1146) was reviewed and closed.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1153 wherever it says K1131, and K1137's
rule 11 and K1141's rules 11 and 12 wherever they apply, as batch 11's
"How to work" describes them (`docs/design/K1146_muse_batch11.md`).

After the run, update K1153's handle:
`ledger.mjs handle K1153 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## Run A · draft batch 12's brief (no run)

Write `docs/design/K1153_batch12_draft.md`: a brief in batch 11's form
(`docs/design/K1146_muse_batch11.md`: the header, "How to work"
pointing at K1131's and at K1141's rules 11 and 12, then one section
per run with Read first, the ledger's text quoted, what is there
today, Tasks, Done and the close lines), for up to six runs. Batch 12
uses ports 5550-5599; give each run its own range. Take candidates in
this order, and stop at six runs that fit:

1. `## Approved, to schedule` in `LEDGER.md`: K22, K23, K322 and K805
   (K804 is done). Batch 11's "Left out on purpose" says why each was
   skipped then; take one only if that reason no longer holds, and say
   why.
2. Then `## Residuals (known, not fixed)`, in ledger order, starting at
   K206: batch 11's draft read through K207, which has since moved to
   `## Waiting on Levi`. Name the last residual you read in the draft's
   header, so batch 13's draft starts after it.
3. Then two residuals filed since, both phone tools that a unit test
   or a dry run can decide without the phone: K1152
   (`scripts/phone_pass/phone_ready.mjs` cites a file master never
   had) and K1148 (hand-run phone tools that skip K1142's ready check).
   A run that changes a phone tool must not run it against the phone.

Skip junctions, the cursive, physics, the thread renderer's GPU
performance, phone passes, items waiting on Levi and items In
progress. A Claude agent works on K1040's label pass in its own
worktree (`src/render/field/`, `.claude/probes/K1040/`): no run touches
those. Skip, too, what batch 11's "Left out on purpose" skipped,
except where an item there has since become possible (say why).

Read each candidate's code before writing its run: quote no line
number you didn't read, and give any re-measurement's stand as the
original probe's source holds it (rule 11). End the draft with a "Left
out on purpose" list naming each candidate you read and skipped, and
why.

Commit it as a work commit (`K1153 A: batch 12 draft`) and push.
Close nothing and file nothing: put anything you would file in your
report for Claude. Claude reviews the draft, renames it to
`docs/design/K1153_muse_batch12.md` and queues its runs.

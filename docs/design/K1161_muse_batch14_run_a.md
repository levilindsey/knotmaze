# Muse batch 14, Run A: draft the batch's brief (K1161)

Claude starts this run through Paseo after batch 13
(`docs/design/K1156_muse_batch13.md`, K1156) was reviewed and closed.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1161 wherever it says K1131, and K1137's
rule 11 and K1141's rules 11 and 12 wherever they apply, as batch 11's
"How to work" describes them (`docs/design/K1146_muse_batch11.md`).

After the run, update K1161's handle:
`ledger.mjs handle K1161 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## Run A · draft batch 14's brief (no run)

Write `docs/design/K1161_muse_batch14.md`: a brief in batch 13's form
(`docs/design/K1156_muse_batch13.md`: the header, "How to work"
pointing at K1131's and at K1141's rules 11 and 12, then one section
per run with Read first, the ledger's text quoted, what is there
today, Tasks, Done and the close lines), for up to six runs. This run
is Run A, so label the batch's runs B to G: the chain's tags are `14B`
to `14G`, and it skips a tag it has already run. Batch 14 uses ports
5550-5599; give each run its own range. Take candidates in this order,
and stop at six runs that fit:

1. `## Approved, to schedule` in `LEDGER.md`: K22, K23, K322 and K805.
   Batch 13's "Left out on purpose" says why each was skipped; take one
   only if that reason no longer holds, and say why.
2. The residuals filed since batch 13's draft, first:
   - K1160 (`scripts/phone_pass.ps1` names the phone's tailnet machine
     in a public repo). It goes first. Find the phone the way K1155's
     `Select-TailscaleIp` does in `scripts/phone.ps1` (commit
     `2e188c47`), or take the name as a parameter with an empty
     default. A test fixture's names are made up: never copy a real
     peer's name, address or key into a tracked file or a commit
     message, never quote the name the file holds today, and don't run
     `tailscale` to see one. Tailscale's documented `status --json`
     shape is enough.
   - K1159 (the three adb lookups). It touches `scripts/phone_pass.ps1`
     too, so it shares K1160's run or comes right after it; no two
     runs touch one file.
   - Any other residual numbered above K1156 (filed since batch 13's
     draft, several from its runs), except K1161, this batch's own
     item.

   These change phone tools. A unit test or a dry run decides each, and
   a run that changes a phone tool must not run it against the phone.
   K1157 and K1158 are K1040's label pass: skip them (below).
3. Then `## Residuals (known, not fixed)`, in ledger order, starting
   after K685 (batch 13's draft read through K685). Name the last
   residual you read in the draft's header, so batch 15's draft starts
   after it.

Skip junctions, the cursive, physics (the simulation), the thread
renderer's GPU performance, phone passes, items waiting on Levi and
items In progress. K1040's label pass is Claude's lane
(`src/render/field/`, `.claude/probes/K1040/`, K1157 and K1158): no run
touches those. Skip, too, what batch 13's "Left out on purpose"
skipped, except where an item there has since become possible (say
why).

Read each candidate's code before writing its run: quote no line
number you didn't read, and give any re-measurement's stand as the
original probe's source holds it (rule 11). A run whose close rewrites
an item's text (ledger.mjs has no command for it) says so in its close
lines and gives the new text in its report, for Claude to apply. End
the draft with a "Left out on purpose" list naming each candidate you
read and skipped, and why.

Commit it as a work commit (`K1161 A: batch 14 draft`) and push.
Close nothing and file nothing: put anything you would file in your
report for Claude. Claude reviews the draft on master and queues its
runs.

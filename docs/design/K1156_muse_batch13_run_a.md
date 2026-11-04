# Muse batch 13, Run A: draft the batch's brief (K1156)

Claude starts this run through Paseo after batch 12
(`docs/design/K1153_muse_batch12.md`, K1153) was reviewed and closed.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1156 wherever it says K1131, and K1137's
rule 11 and K1141's rules 11 and 12 wherever they apply, as batch 11's
"How to work" describes them (`docs/design/K1146_muse_batch11.md`).

After the run, update K1156's handle:
`ledger.mjs handle K1156 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## Run A · draft batch 13's brief (no run)

Write `docs/design/K1156_muse_batch13.md`: a brief in batch 12's form
(`docs/design/K1153_muse_batch12.md`: the header, "How to work"
pointing at K1131's and at K1141's rules 11 and 12, then one section
per run with Read first, the ledger's text quoted, what is there
today, Tasks, Done and the close lines), for up to six runs. This run
is Run A, so label the batch's runs B to G: the chain's tags are `13B`
to `13G`, and it skips a tag it has already run. Batch 13 uses ports
5500-5549; give each run its own range. Take candidates in this order,
and stop at six runs that fit:

1. `## Approved, to schedule` in `LEDGER.md`: K22, K23, K322 and K805.
   Batch 12's "Left out on purpose" says why each was skipped; take one
   only if that reason no longer holds, and say why.
2. Four residuals filed since batch 11's draft, which batch 12 left for
   this one:
   - K1152 (`scripts/phone_pass/phone_ready.mjs` cites a file master
     never had) and K1148 (hand-run phone tools that skip K1142's ready
     check).
   - K1155 (`scripts/phone.ps1`'s `-TailscaleHost` default names a
     machine in a public repo). Its test fixture's names are made up:
     never copy a real peer's name, address or key into a tracked file,
     and don't run `tailscale` to see one. Tailscale's documented
     `status --json` shape is enough.
   - K1154 (the physics-off load's wall cap counts hidden-tab time). It
     is the physics hosts' load clock, not the simulation: its run keeps
     the hosts' lockstep test (`test/physics/physics_host.test.ts`) and
     the golden snapshots (`test/physics/byte_identity.test.ts`) green
     unchanged.

   The first three change phone tools. A unit test or a dry run decides
   each, and a run that changes a phone tool must not run it against the
   phone.
3. Then `## Residuals (known, not fixed)`, in ledger order, starting
   after K308 (batch 12's draft read through K308). Name the last
   residual you read in the draft's header, so batch 14's draft starts
   after it.

Skip junctions, the cursive, physics (the simulation; K1154's load
clock is allowed as step 2 says), the thread renderer's GPU
performance, phone passes, items waiting on Levi and items In
progress. A Claude agent works on K1040's label pass in its own
worktree (`src/render/field/`, `.claude/probes/K1040/`): no run
touches those. Skip, too, what batch 12's "Left out on purpose"
skipped, except where an item there has since become possible (say
why).

Read each candidate's code before writing its run: quote no line
number you didn't read, and give any re-measurement's stand as the
original probe's source holds it (rule 11). End the draft with a "Left
out on purpose" list naming each candidate you read and skipped, and
why.

Commit it as a work commit (`K1156 A: batch 13 draft`) and push.
Close nothing and file nothing: put anything you would file in your
report for Claude. Claude reviews the draft on master and queues its
runs.

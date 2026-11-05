# Muse batch 18, Run A: draft the batch's brief (K1189)

Claude starts this run through Paseo after batch 17
(`docs/design/K1184_muse_batch17.md`, K1184) was reviewed and closed.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`. The
runs this draft describes come after it, once Claude has reviewed the
draft.

## How to work

Batch 17's "How to work" applies unchanged: read it in
`docs/design/K1184_muse_batch17.md` (it sends you on to the earlier
batches' rules) before anything else. Read K1189 wherever it, or a
page it sends you to, says K1184, K1178, K1169 or K1131.

After the run, update K1189's handle:
`ledger.mjs handle K1189 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## Run A · draft batch 18's brief (no run)

Write `docs/design/K1189_muse_batch18.md`: a brief in batch 17's form
(the header, "How to work" pointing at batch 17's, then one section per
run with Read first, the ledger's text quoted, what is there today,
Tasks, Done and the close lines), for up to six runs. This run is Run A,
so label the batch's runs B to G: the chain's tags are `18B` to `18G`.
Batch 18 uses ports 5640-5699; give each run its own range. Every task
must be decided by a unit test, a desktop probe, a dry run or a
measurement table, and none may need Levi or the phone. A run that
changes what the player sees shoots a look sheet and stops there:
Claude judges looks. Take candidates in this order, and stop at six
runs that fit:

1. Claude's picks from batch 17's reviews, one piece of an item each:
   - K782: the Snared toast fires before the monster reaches the snare
     (the full list is under `## K782 (2026-11-04, shortened at batch
     17's close)` in `docs/ledger_notes.md`).
   - K711: `__knotChaseTap` ignores broken runs.
   - K1187: a run that breaks behind the moving dot draws its unswept
     stretch unburnt, even where the fire reached it.
   - K1188: `scripts/preview.ps1` fails under a long `-Root`, and a
     `-Ref` server that is killed outright leaves its temp worktree
     behind. The run reproduces both before it changes anything. It
     makes its own temp worktrees under `$env:TEMP` and touches no
     other worktree: no `git worktree prune`, nothing under
     `.claude/worktrees/`, and never the root `$env:TEMP\k1139s4pv`
     (a Claude agent's master preview runs there).

   Take a pick only if it is bounded and decided by the checks above.
   Say why for any you skip.
2. `## Approved, to schedule` in `LEDGER.md`: K22, K23, K322 and K805.
   Batch 17's "Left out on purpose" says why each was skipped; take one
   only if that reason no longer holds, and say why.
3. `## Next, in order`, from K265 on. Batch 17's draft read the section
   from its top through K292 and stopped there. Take an item whose next
   stage is bounded and decided by the checks above. Name the stage; a
   whole feature is not one run. At the end of the section, go on from
   its top and stop at six runs or at K292. Name the last item you read
   in the draft's header, so batch 19's draft starts after it.
4. `## Residuals (known, not fixed)`: only the items numbered above
   K1184 that this list doesn't name. Batch 17's draft read the whole
   section in a full circle and found nothing more that fit, so don't
   read it again.

Skip these lanes, and keep every run out of their paths:
- K1040's label pass (K1097, K1143, K1157 and K1180;
  `src/render/field/` and `.claude/probes/K1040/`): Claude owns it.
- K1139's junction pulse: a Claude agent is running its next stage in
  its own worktree, so no run touches `src/render/junction_field.ts`,
  `src/render/junction_routes.ts`, `src/render/arm_strip.ts`,
  `src/render/ribbon/`, their tests or `.claude/probes/K1139/`. K1179's
  follow-ups (K1182, K1185 and K1186, and `.claude/probes/K1179/`) need
  those paths, so they wait until K1139 merges.
- K292 and K647: they wait on Levi's answers.
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

Commit it as a work commit (`K1189 A: batch 18 draft`) and push. Close
nothing and file nothing: put anything you would file in your report
for Claude. Claude reviews the draft on master and queues its runs.

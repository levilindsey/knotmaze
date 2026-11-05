# Muse batch 19, Run A: draft the batch's brief (K1192)

Claude starts this run through Paseo after batch 18
(`docs/design/K1189_muse_batch18.md`, K1189) was reviewed and closed.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`. The
runs this draft describes come after it, once Claude has reviewed the
draft.

## How to work

Batch 18's "How to work" applies unchanged: read it in
`docs/design/K1189_muse_batch18.md` (it sends you on to the earlier
batches' rules) before anything else. Read K1192 wherever it, or a
page it sends you to, says K1189, K1184, K1178, K1169 or K1131.

After the run, update K1192's handle:
`ledger.mjs handle K1192 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## What leads this batch

Levi (2026-11-04): "To be clear, perfecting all junction and cursive
work is always my main priority". So batch 19 leads with junction work
that a run can decide by numbers, inside the lanes the running Claude
agents leave free (listed below).

## Run A · draft batch 19's brief (no run)

Write `docs/design/K1192_muse_batch19.md`: a brief in batch 18's form
(the header, "How to work" pointing at batch 18's, then one section per
run with Read first, the ledger's text quoted, what is there today,
Tasks, Done and the close lines), for up to six runs. This run is Run
A, so label the batch's runs B to G: the chain's tags are `19B` to
`19G`. Batch 19 uses ports 5700-5759; give each run its own range of
ten. Every task must be decided by a unit test, a desktop probe, a dry
run or a measurement table, and none may need Levi or the phone. A run
that changes what the player sees puts the change behind a switch that
defaults to today's picture (the golden pins and fixtures unmoved;
read how earlier look-gated changes did it and pick the switch's form
in the draft), shoots a look sheet with the switch off and on, and
stops there: Claude judges looks and flips the default. Take candidates
in this order, and stop at six runs that fit:

1. Junction work (Levi's priority), one bounded stage each:
   - K1186, its first step only: count which junction pieces'
     per-frame choices (the fillet layer vote and the armReach clamp;
     find them in `src/render/ribbon/joinery.ts` and
     `src/render/ribbon_renderer.ts`) flip on scripted drags and
     sweeps, and the ink each flip moves (the pixels that change
     between two frames because of the flip, against the same frames
     with the choice held). A probe and a table in
     `.claude/probes/K1186/`, no change to `src/`. The run names the
     stands and scripts it used, so the fix stage can rerun them.
   - K1182: make the fill rim G1 where it meets the flank tips. Today
     it is a quadratic in `src/render/ribbon/rim_curve.ts`, G0 only; the
     K1179 review (its sections 2-3) suggests a biarc. Tests first: the
     tangent angle jump at each joint, before and after, on the
     junctions the existing rim tests use. The change stays inside
     `rim_curve.ts` and its test, behind the switch. If it needs
     `joinery.ts` or any other file in the K1139 lane below, the run
     stops and reports what it would change. A 2x look sheet of four
     junctions, switch off and on.
   - K1191's examinations, which change no code: ji 147's unlit arm 1;
     records 2129 and 2668's overlapping fans; ji 147's 52 GPU wedges
     (Stage 4's handoff in `docs/design/K1139_s3b_fix.md` describes
     each). One run may take all three; each ends in a table and a
     cause, or "not found" with what was ruled out. The run copies the
     tools it needs from `.claude/probes/K1139/` into
     `.claude/probes/K1191/` and changes nothing under
     `.claude/probes/K1139/`.
2. Claude's picks from batch 18's reviews: the next bounded piece of
   K782 and of K711 (their ledger texts and `docs/ledger_notes.md` say
   what is left). Take a piece only if it is bounded and decided by the
   checks above. Say why for any you skip.
3. `## Next, in order`: batch 18's draft read the whole section and
   left nothing unread, so read only the items numbered above K1188.
   Take an item whose next stage is bounded and decided by the checks
   above. Name the stage; a whole feature is not one run.
4. `## Residuals (known, not fixed)`: only the items numbered above
   K1189 that this list doesn't name.

Skip these lanes, and keep every run out of their paths:
- K1139's junction pulse: a Claude agent is running its next stage
  (S4, loops and cycles) in its own worktree. So no run changes
  `src/render/paint_math.ts`, `paint_glsl.ts`, `pulse_path.ts`,
  `junction_field.ts`, `junction_routes.ts`, `arm_strip.ts`,
  `fabric_maze_renderer.ts`, `ribbon_renderer.ts`, `src/render/ribbon/`
  (except `rim_curve.ts` for K1182), `src/app/probe_hooks.ts`, their
  tests, `test/render/fixtures/` or `.claude/probes/K1139/`. Reading
  them is fine. K1190 (Levi's look calls on the pulse) waits on Levi.
- K1040's label pass (K1097, K1143, K1157 and K1180;
  `src/render/field/` and `.claude/probes/K1040/`): Claude owns it.
- The cursive (K863, K1112 and K1119; `.claude/probes/K863/`): a Claude
  agent is running its next letter.
- K647: it waits on Levi's answer.
- Physics (the simulation), phone passes, items waiting on Levi, items
  In progress, K144 and K1168 (Claude writes their briefs; deploying
  them needs the Google OAuth client, Cloudflare Worker and D1 database
  from Levi), K1181 (the laptop's checkout), and anything under
  `.claude/worktrees/`.

GPU probes and timings hold the machine's perf lock (each harness's
`run_locked.ps1`). A Claude agent is running GPU probes too, so a run
may wait for the lock; say so in its tasks, and never time without it.

Read each candidate's code before writing its run: quote no line number
you didn't read, and give any re-measurement's stand as the original
probe's source holds it (rule 11). A run whose close rewrites an item's
text (ledger.mjs has no command for it) says so in its close lines and
gives the new text in its report, for Claude to apply. End the draft
with a "Left out on purpose" list naming each candidate you read and
skipped, and why.

Commit it as a work commit (`K1192 A: batch 19 draft`) and push. Close
nothing and file nothing: put anything you would file in your report
for Claude. Claude reviews the draft on master and queues its runs.

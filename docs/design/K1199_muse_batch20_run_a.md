# Muse batch 20, Run A: draft the batch's brief (K1199)

Claude starts this run through Paseo after batch 19
(`docs/design/K1192_muse_batch19.md`, K1192) ran its last run.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`. The
runs this draft describes come after it, once Claude has reviewed the
draft.

## How to work

Batch 19's "How to work" applies unchanged: read it in
`docs/design/K1192_muse_batch19.md` (it sends you on to the earlier
batches' rules) before anything else. Read K1199 wherever it, or a
page it sends you to, says K1192, K1189, K1184, K1178, K1169 or K1131.

After the run, update K1199's handle:
`ledger.mjs handle K1199 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## What leads this batch

Levi (2026-11-04): "To be clear, perfecting all junction and cursive
work is always my main priority". So batch 20 leads with junction and
cursive work that a run can decide by numbers.

No Claude agent will be running when batch 20's runs start. K1139's
Stage 4 (pulses on loops and cycles) and its follow-up S4b (the band
ridge fade) merged to master at 36aed2d5: their briefs and Handoffs are
`docs/design/K1139_s4_cycles.md` and
`docs/design/K1139_s4b_ridge_fade.md`. S4b's leftovers are K1201 (the
joint step), K1202 (a step on cyc e210's kymograph) and K1203 (the
band's end window); K1200 (the dark stretch where two trains meet on a
loop) waits on Levi.

## Run A · draft batch 20's brief (no run)

Write `docs/design/K1199_muse_batch20.md`: a brief in batch 19's form
(the header, "How to work" pointing at batch 19's, then one section per
run with Read first, the ledger's text quoted, what is there today,
Tasks, Done and the close lines), for up to six runs. This run is Run
A, so label the batch's runs B to G: the chain's tags are `20B` to
`20G`. Batch 20 uses ports 5760-5819; give each run its own range of
ten. Every task must be decided by a unit test, a desktop probe, a dry
run or a measurement table, and none may need Levi or the phone. A run
that changes what the player sees puts the change behind a switch that
defaults to today's picture (the golden pins and fixtures unmoved;
batch 19's Run C did it with `rimCurveBiarc` in
`src/render/ribbon/rim_curve.ts`), shoots a look sheet with the switch
off and on, and stops there: Claude judges looks and flips the
default. Take candidates in this order, and stop at six runs that fit:

1. Junction work (Levi's priority), one bounded stage each, in this
   order:
   - K1139 S5, your own junction: section 5 of
     `docs/design/K1139_pulse_junctions.md` (Levi answered Q3 "straight
     through, without the dim moment", section 6). Behind a switch:
     `PULSE_OUT_LEAD` 0 and no `CREST_RAMP` dip where a crest carries
     through the head (an arrival exists), the dip kept where a crest is
     born. CPU twin and GLSL together, with a test pinning them equal;
     the `pre_g23` fixtures stay frozen while the switch is off. The
     look sheet re-shoots `q3_head` (the plan's section 4.3 and the
     K1139 kit's sheet scripts) off and on. If the shader text outgrows
     a budget in `test/render/k320_slim.test.ts`, raise that budget to
     the measured length with a comment, as S4 and S4b did, and run a
     K307 cold compile against the run's base under the perf lock
     (`.claude/probes/K307/`, as S4b ran it in
     `.claude/probes/K1139/batch_s4b_k307b.txt`): the run's mean must
     sit inside the base's spread.
   - K1182 (small: fold it into another run): remove 19C's biarc rim,
     its `rimCurveBiarc` flag and their tests
     (`src/render/ribbon/rim_curve.ts`, `test/render/`), and say in the
     file's header, beside K859's Hermite, why it stays out: on Run C's
     and Run F's crops the quadratic reads smooth and the biarc grows
     stepped notches at all four targets (Claude's judgment). The
     flank's tangent points away from the corner on at least one side of
     every wedge (K859's count, 392 of 392), so a G1 rim leaves the
     corridor, the triangle tipA-corner-tipB, or turns on a tight arc
     (Run F, commit 3ddaec22, `.claude/probes/K1182/exam/`). The probes
     under `.claude/probes/K1182/` stay as they are (they need a
     checkout from before the removal). The flag was off, so the golden
     snapshots and every pin stay unchanged.
   - K1202: attribute the step at columns 20 to 21 of cyc e210's
     kymograph, the same on S4 and S4b (K1202's text;
     `.claude/probes/K1139/out/s4b/crops/kymo_steps.txt`, untracked in
     the main checkout). Probes only; a fix is a later stage behind a
     switch.
   - K1186, its next step: crop the five worst drawn flips that 19B
     counted (`.claude/probes/K1186/`, f657ac15; K1186's text and its
     `docs/ledger_notes.md` entry), 3x, the frame before and after
     each flip and the same frames with the choice held, on a sheet
     for Claude to judge. Probes only.
   - K1201: reproduce S4b's joint step on screen (a stand, or K299-style
     paint injection on cyc e210 with its ridge near and before the
     joint) and on the GPU, and measure how often play meets it (a sweep
     of head positions): S4b's Handoff and
     `.claude/probes/K1139/ridge_joint.ts`. Probes only; the fix, its
     option (b) behind a switch, is a later stage.
   - K1196: time two-ended pulses on loops and cycles at rest and
     while moves play onto them, against master's start-head pulses
     (S4's `bench_rest.json` is the one-ended baseline), under the
     perf lock. A harness and a table, no change to `src/`.
   - K1191's open residual: ji 147 arm 1's bright GPU colours, which
     the cover model leaves unexplained (Run D's
     `.claude/probes/K1191/task3_unlit_arm.md`; candidate: the fan's
     gk discard). Model the candidate and say whether it explains
     them, or "not found" with what was ruled out. Probes only, in
     `.claude/probes/K1191/`.
2. Cursive work: c's v7.2 leftovers in K1198 and K1193, the pieces that
   do not depend on K1197 (Levi's call on how c joins into a, d, g, o, q
   and k): ij's missing port solve, ci over its budget, and the untried
   Plc1m (`docs/design/K1112_cursive_j3i.md` Handoff,
   `docs/ledger_notes.md` `## K1198`). One run, a table against v7.2 and
   v7.2b. The kit is untracked under `.claude/probes/K863/trace/`: the
   run copies what it changes into `.claude/probes/K1198/` and changes
   nothing under `.claude/probes/K863/`. Say why if no piece is
   independent of K1197. Keep one of the six runs for it when such a
   piece exists, even though item 1 alone could fill all six.
3. Claude's picks from batch 19's reviews: the next bounded piece of
   K782 (after 19E) and of K711 (their ledger texts and
   `docs/ledger_notes.md` say what is left). Take a piece only if it
   is bounded and decided by the checks above. Say why for any you
   skip.
4. `## Next, in order`: batch 19's draft read the items up to K1188,
   so read only the items numbered above K1191. Take an item whose
   next stage is bounded and decided by the checks above. Name the
   stage; a whole feature is not one run.
5. `## Residuals (known, not fixed)`: only the items numbered above
   K1191 that this list doesn't name.

Skip these lanes, and keep every run out of their paths:
- K1040's label pass (K1097, K1143, K1157 and K1180;
  `src/render/field/` and `.claude/probes/K1040/`): Claude owns it, and
  its next stage needs the phone.
- The cursive's next letters and c's joins (K863, K1112, K1119 and
  K1197): they wait on Levi. Only item 2's pieces are open.
- K1190 (Levi's look calls on the junction light), K647, and every
  other item waiting on Levi.
- Physics (the simulation), phone passes, items In progress other than
  K1139's S5, K144 and K1168 (Claude writes their briefs; deploying
  them needs the Google OAuth client, Cloudflare Worker and D1 database
  from Levi), K1181 (the laptop's checkout), and anything under
  `.claude/worktrees/`.
- No two runs change the same `src/` file unless the later run's brief
  says it starts from the earlier run's commit.

GPU probes and timings hold the machine's perf lock (each harness's
`run_locked.ps1`). Say so in each such run's tasks, and never time
without it.

Read each candidate's code before writing its run: quote no line number
you didn't read, and give any re-measurement's stand as the original
probe's source holds it (rule 11). A run whose close rewrites an item's
text (ledger.mjs has no command for it) says so in its close lines and
gives the new text in its report, for Claude to apply. End the draft
with a "Left out on purpose" list naming each candidate you read and
skipped, and why.

Commit it as a work commit (`K1199 A: batch 20 draft`) and push. Close
nothing and file nothing: put anything you would file in your report
for Claude. Claude reviews the draft on master and queues its runs.

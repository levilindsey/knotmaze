# Muse batch 22, Run A: draft the batch's brief (K1208)

Claude starts this run through Paseo after batch 21
(`docs/design/K1204_muse_batch21.md`, K1204) ran its last run.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`. The
runs this draft describes come after it, once Claude has reviewed the
draft.

## How to work

Batch 21's "How to work" applies unchanged: read it in
`docs/design/K1204_muse_batch21.md` (it sends you on to batch 20's,
the earlier batches' rules and the node_modules rule) before anything
else. Read K1208 wherever it, or a page it sends you to, says K1204,
K1199, K1192, K1189, K1184, K1178, K1169 or K1131.

After the run, update K1208's handle:
`ledger.mjs handle K1208 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## What leads this batch

Levi (2026-11-04): "To be clear, perfecting all junction and cursive
work is always my main priority". So batch 22 leads with junction and
cursive work that a run can decide by numbers.

What batch 21 left (each run's findings are in its item's notes in
`docs/ledger_notes.md` or in its probe folder):
- 21B: K1097 S3f5 (8b7a2b4a): the label pass's fixed-cost and
  cheaper-vertex variants behind probe switches, all 0 px against
  `ftentv`, the desktop split, and the Pixel batch's script.
  The Pixel batch waits for the phone; Claude runs it when the phone
  is free (K1097's handle).
- 21C: K1202's 2 pxW cover ramp behind `setPulseCoverRamp`
  (5e0d5914). Claude's judgment: it spreads e210's kymograph step
  over two pixels and changes nothing visible at 1x, so the switch
  stays off and K1202 closed; the step is the two bands' fields
  disagreeing across the cover edge, not the edge's sharpness. K1207
  removes the switch.
- 21D: K1203's end window behind `setPulseBandEndWindow` (a0f1d634).
  Claude's judgment: the switch goes on. Its true spans change 0 px on
  x4 (the reach window crushes mnode_27's band), but with all 11 of
  x4's bands' spans forced to 0.05 the frame changes 0 px with the
  switch off and 958-1479 px with it on
  (`.claude/probes/K1203/claude21d/posctl.mjs`), so the GPU applies the
  window. K1207 makes it the only path.
- 21E: K1186's layer-vote A/B behind a probe-only `voteOverride`
  (080d4b49). Claude's judgment: no hold-and-fade, and K1186 is
  closed. All 34 of Run E's forced votes (18 real flips and 16 arm
  order rotations, which also account for every near jump) drew 0 px
  (max 0) at their own captured states, and so did its positive
  control, whose fan geometry did move between the layers: both fan
  layers draw above the ribbons with only an empty container between
  them (the TWO-LAYER JOINERY comment in
  `src/render/ribbon/joinery.ts`), so a vote only reorders fans.
  K1209 retires the vote.
- 21F: K1201's census (8e0c5a1c), CPU only, lattice spans,
  every non-end head of cyc, loop, x4 and dailies #19-#25. Claude's
  judgment: play meets the joint step. The census's step column is
  `ridge_joint.ts`'s metric without the reach window; weighted by
  `kReachWin` at each joint (K1201's notes), every daily at the default
  reach still has 2-6 arm-ends stepping over 0.3, up to 0.77 (31 heads
  in the seven dailies; 24 of their 32 ends are equal-length cycles
  with the ridge at the far joint, e.g. daily #25's node_216 on e251).
  Fix (b) is item 1's K1201 run.
- 21G: (Claude fills this in after judging 21G.)

No Claude agent will be running when batch 22's runs start. Claude
runs the phone passes; no run touches the phone.

## Run A · draft batch 22's brief (no run)

Write `docs/design/K1208_muse_batch22.md`: a brief in batch 21's form
(the header, "How to work" pointing at batch 21's, then one section per
run with Read first, the ledger's text quoted, what is there today,
Tasks, Done and the close lines), for up to six runs. This run is Run
A, so label the batch's runs B to G: the chain's tags are `22B` to
`22G`. Batch 22 uses ports 5880-5939; give each run its own range of
ten. Every task must be decided by a unit test, a desktop probe, a dry
run or a measurement table, and none may need Levi or the phone. A run
that changes what the player sees puts the change behind a switch that
defaults to today's picture (the golden pins and fixtures unmoved;
batch 21's Runs C and D did it with module flags in
`src/render/junction_field.ts` riding `uJParams`), shoots a look sheet
with the switch off and on, and stops there: Claude judges looks and
flips the default. Take candidates in this order, and stop at six runs
that fit:

1. Junction work (Levi's priority), one bounded stage each, in this
   order:
   - K1207 with Run D's switch, one run: remove Run C's cover-ramp
     switch (`setPulseCoverRamp`, its flag on `uJParams.z` and the
     ramp's GLSL and CPU code; the off path stays, so every pin
     reproduces bit for bit) and settle Run D's switch as Claude's
     judgment of 21D says (K1203's notes): it goes on: make the window
     the only path and remove its switch (`setPulseBandEndWindow` and its
     flag on `uJParams.w`), re-freezing each pin it moves and naming each
     in the commit (pre-launch, no back-compat: CLAUDE.md's Key Design
     Decisions). First, with the switch still in, find a stand in
     `.claude/probes/K1203/stands_cyc.mjs` where the window bites (a band
     step over 1/255 in `.claude/probes/K1203/table_cyc.mjs`, run with
     and without `K1203_ENDWIN=1`) and shoot an off/on sheet there for
     Claude's record, or say that none bites. Say whether the point where
     `.claude/probes/K1203/check_field.mjs`'s CPU twin moved about 2.3/255
     (K1203's notes) is a pixel the fan draws or a twin/GPU mismatch.
     `test/render/k320_slim.test.ts`'s budgets come down by what the
     run removes, measured, with the K307 cold compile as batch 21's
     Run C states it.
   - K1209: retire the fillet layer vote and its top layer (K1186's
     notes, Claude's judgment of 21E). A pin may move only where fans
     overlap; each one that moves is re-frozen and named in the commit.
   - K1201's fix (b), by Claude's judgment of 21F (K1201's notes): the
     band crossfade in `docs/design/K1139_s4b_ridge_fade.md` ("Fix
     options" (b), then its "Next step" 3 and 4), behind a switch that
     defaults to today's picture. It starts from the K1207 run's commit
     (both change `src/render/junction_field.ts`). The fix needs
     JUNCTION_FRAG room (that doc's "Open" item 5): raise
     `test/render/k320_slim.test.ts`'s budget by no more than the fix
     adds, measured with the K307 cold compile as batch 21's Run C
     states it, and name it in the commit. Three stands: 20E's injected
     one (cyc's node_218 on e210 at xR 0.2,
     `.claude/probes/K1201/out/SUMMARY.md`) and two natural ones from
     `.claude/probes/K1201/out/census21f.txt`: daily #25
     (`dailyParams(25)`, as 21F built it) at node_216 on e251, and x4 at
     mnode_130 on e35. Dump each natural stand's drawn-span xR from the
     page first (21F counted lattice spans), then shoot off/on sheets at
     all three.
   - K1097's next stage, by the Pixel's reading of S3f5 (K1097's
     handle; `.claude/probes/K1040/s3/out/phone_table_s3f5.md` and
     `out/split_s3f5.md` once Claude has run the Pixel batch). If
     those two files do not exist when you draft, K1097 is not a
     candidate: say so under "Left out on purpose".
   - K1196's next step, described in batch 21's drafting brief
     (`docs/design/K1204_muse_batch21_run_a.md`, item 1) and left out
     of batch 21 for room: the same three stands on S4's base
     aa1156ae and on 36aed2d5, ABBA, under the perf lock, with the
     third build 95fcf3b7 only if a stand costs more than 0.2 ms. If it
     fits, K1139's frame-tail watch (the same brief's item 3) shares
     the run: both use 20F's `bench.mjs`.
   - K1191's open residual, described in the same brief's item 1 and
     left out of batch 21 for room: model gk (a foreign over thread's
     silhouette discard) for ji 147 arm 1's bright GPU colours, or
     "not found" with what was ruled out. Probes only.
2. Cursive work: K1198's next piece, by Claude's judgment of 21G
   (K1198's notes). (Claude names the piece after judging 21G.) Keep one of the six runs for it.
3. Claude's pick from the Pixel passes: K1205's first step, described
   in batch 21's drafting brief (item 3) and left out of batch 21 for
   room. Probes only, in `.claude/probes/K1205/`, under the perf lock;
   no fix.
4. `## Next, in order`: batch 21's draft read the items up to K1203,
   so read only the items numbered above K1204. Take an item whose
   next stage is bounded and decided by the checks above. Name the
   stage; a whole feature is not one run.
5. `## Residuals (known, not fixed)`: only the items numbered above
   K1204 that this list doesn't name.

Skip these lanes, and keep every run out of their paths:
- The cursive's next letters and c's joins (K863, K1112, K1119 and
  K1197): they wait on Levi. Only item 2's piece is open.
- K1139 S6, the route pulse: it follows K1140's Glimpse design, which
  waits on Levi's picks.
- K1190 and K1200 (Levi's look calls on the junction light), K647, and
  every other item waiting on Levi.
- Physics (the simulation), phone passes, items In progress other than
  K1097's next stage, K144 and K1168 (Claude writes their briefs;
  deploying them needs the Google OAuth client, Cloudflare Worker and
  D1 database from Levi), K1181 (the laptop's checkout), and anything
  under `.claude/worktrees/`.
- No two runs change the same `src/` file unless the later run's brief
  says it starts from the earlier run's commit.

GPU probes and timings hold the machine's perf lock (each harness's
`run_locked.ps1`). Say so in each such run's tasks, and never time
without it.

Read each candidate's code before writing its run: quote no line number
you didn't read, and give any re-measurement's stand as the original
probe's source holds it (rule 11). Check every path the draft cites
before you commit it (`Test-Path`, or `git ls-files` for tracked
files), and quote each number from the file that holds it, naming
that file: batch 21's draft cited seven files batch 20's Run G never
wrote and misread one number (K1206; Claude fixed them in 854823fa).
Your report lists every path the draft cites, each with "exists" or
"written by run X". A run whose close rewrites an item's text
(ledger.mjs has no command for it) says so in its close lines and
gives the new text in its report, for Claude to apply. End the draft
with a "Left out on purpose" list naming each candidate you read and
skipped, and why.

Commit it as a work commit (`K1208 A: batch 22 draft`) and push. Close
nothing and file nothing: put anything you would file in your report
for Claude. Claude reviews the draft on master and queues its runs.

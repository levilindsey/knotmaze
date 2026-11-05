# Muse batch 21, Run A: draft the batch's brief (K1204)

Claude starts this run through Paseo after batch 20
(`docs/design/K1199_muse_batch20.md`, K1199) ran its last run.
One run, a fresh Muse agent that reads this brief, writes one document
and stops. It changes nothing in `src/`, `test/` or `scripts/`. The
runs this draft describes come after it, once Claude has reviewed the
draft.

## How to work

Batch 20's "How to work" applies unchanged: read it in
`docs/design/K1199_muse_batch20.md` (it sends you on to the earlier
batches' rules, and adds the node_modules rule) before anything else.
Read K1204 wherever it, or a page it sends you to, says K1199, K1192,
K1189, K1184, K1178, K1169 or K1131.

After the run, update K1204's handle:
`ledger.mjs handle K1204 --last-commit <sha8> --next "Run A done; Claude reviews the draft"`.

## What leads this batch

Levi (2026-11-04): "To be clear, perfecting all junction and cursive
work is always my main priority". So batch 21 leads with junction and
cursive work that a run can decide by numbers.

What batch 20 left (each run's findings are in its item's notes in
`docs/ledger_notes.md` or in its probe folder):
- 20B: K1139 S5 behind `pulseHeadPass` and K1182's biarc removal.
  Claude judged the q3_head sheet and turned S5 on by default
  (fbc1b212), as Levi asked ("Straight through, no dim moment").
- 20C: K1202 attributed (5f9c3207): the step is the cover edge of
  node_218's other pulse band crossing e210's centreline in the fan.
- 20D: K1186's five worst drawn flips at 3x (75fddf77). Claude's
  judgment: a 140 ms step mixes each flip with motion, armReach is
  continuous, and the layer vote's hard threshold is the candidate
  (item 1 below).
- 20E: K1201's step reproduced on the GPU by injection (9637302e),
  but play met it at 0 of 5 heads (item 1's census).
- 20F: K1196 timed (345a189f, `.claude/probes/K1196/out/SUMMARY.md`):
  at rest the two-ended stands read frame p50 7.50 (cyc) and 7.82
  (loop) against the start head's 7.07, in play 7.25, 7.22 and 6.95.
  The stands differ in more than their pulses, so the gap is not yet
  S4's own cost (item 1).
- 20G: K1198 measured (c3ab0a46, `.claude/probes/K1198/SUMMARY.md`):
  Plc1m (B = 1 u) clears every gate and sits nearer the font than v7.2
  on ci (2.31 u, inside its 2.5 u budget), cr, cs, cy, er and es; ij
  never reaches the join, because the font shapes it as one ligature
  glyph, `ij.jmc` (item 2).

No Claude agent will be running when batch 21's runs start. Claude
runs the phone passes; no run touches the phone.

## Run A · draft batch 21's brief (no run)

Write `docs/design/K1204_muse_batch21.md`: a brief in batch 20's form
(the header, "How to work" pointing at batch 20's, then one section per
run with Read first, the ledger's text quoted, what is there today,
Tasks, Done and the close lines), for up to six runs. This run is Run
A, so label the batch's runs B to G: the chain's tags are `21B` to
`21G`. Batch 21 uses ports 5820-5879; give each run its own range of
ten. Every task must be decided by a unit test, a desktop probe, a dry
run or a measurement table, and none may need Levi or the phone. A run
that changes what the player sees puts the change behind a switch that
defaults to today's picture (the golden pins and fixtures unmoved;
batch 20's Run B did it with `pulseHeadPass` in
`src/render/paint_math.ts` and its GLSL twin), shoots a look sheet with
the switch off and on, and stops there: Claude judges looks and flips
the default. Take candidates in this order, and stop at six runs that
fit:

1. Junction work (Levi's priority), one bounded stage each, in this
   order:
   - K1097 S3f5, the label pass's drawing on the Pixel: the section
     "The Pixel's reading" at the end of
     `docs/design/K1040_s3f4_bound.md`, and its Handoff before it.
     Two lever families cleared on nearly every scene: the pass's fixed
     cost (a pass that draws at all: 0.8 ms, the drawing's whole budget)
     and the vertex side (0.9 ms; cheaper vertices, not fewer, since the
     vertex slope reads 0). Default-off probe variants for (a) the
     pass's fixed cost (attachment count, format and size, depth's
     store, load and store hints) and (b) cheaper segment vertices
     (fewer fetches per vertex, a cheaper span and point path), each
     with S3f4's checks (0 px against `ftentv` on the 12 scenes) and
     the desktop split (`.claude/probes/K1040/s3/split.mjs` under the
     perf lock, through the kit's `run_locked.ps1`). Rejected by the
     Pixel, so not candidates: `ftentvvid` (slower on 9 of 12 scenes)
     and cheaper fragment arithmetic. The run writes the Pixel batch's
     script in `s3f4_gate.ps1 -SkipDesktop`'s form, with the variants
     as columns, and stops before it: Claude runs the phone. Its paths
     are `src/render/field/` and `.claude/probes/K1040/`; no other run
     touches them.
   - The fixes behind a switch that batch 20's attributions point at,
     each its own run and only where batch 20 found the cause:
     K1202 (the cover edge in the fan; the CPU twin ramps it over
     columns 18 to 20, so the twin's ramp is the reference) and K1203
     (the band and its child arm's end window; `table_cyc.mjs`'s BAND
     EXTENT past the arm's length). CPU twin and
     GLSL together, a test pinning them equal, the `pre_g23` fixtures
     frozen while the switch is off, and a kymograph or look sheet
     off and on for Claude. Shader budgets and the K307 cold compile
     as batch 20's Run B section says.
   - K1186's next step, by Claude's judgment of 20D's sheet (K1186's
     notes): a same-state A/B of each layer-vote flip's own ink. Add a
     probe-only override in `rebuildFillets` (default off, 0 px
     against master, pinned by a test; the renderer's `skipJointPairs`
     switch is the model) that forces one arm's vote. At each vote
     flip's frame in 19B's drags, capture the scene (`captureScene`),
     render the vote both ways (`restoreScene`, then the override) and
     diff. Crop each flip's diff at 3x with 20D's crop tools, and
     include ji116's and ji55's chatter. armReach is continuous by
     construction (it binds, it can't jump), so it stays out of the
     run unless the A/B finds a `near` jump. Paths:
     `src/render/ribbon/joinery.ts` and the switch's accessor in
     `src/render/ribbon_renderer.ts` (the override only), and
     `.claude/probes/K1186/`.
   - K1201's census, by Claude's judgment of 20E (K1201's notes).
     20E reproduced the joint step on the GPU by injection, but play
     met xR < 0.5 at 0 of 5 heads on the two stands' arms. Count it
     over a few mazes before any fix: for every head and every arm it
     lights from both ends (`pulseTree`, CPU only), xR at each end and
     the step `ridge_joint.ts` predicts there, in a table of how many
     heads meet xR < 0.5 and the largest predicted step. Name the
     mazes (the stands' links and a week of daily seeds are
     candidates). Probes only, in `.claude/probes/K1201/`. Fix (b)
     comes after, and only if play meets it.
   - K1196's next step, by Claude's judgment of 20F: the same three
     stands on S4's base aa1156ae and on 36aed2d5 (S4 and S4b; between
     the two only K1139's render files and tests change), each build
     made with `scripts/preview.ps1 -Ref <sha> -BuildOnly` and timed
     with 20F's `bench.mjs` (rest and play, a same-build control pair,
     then ABBA x4) under the perf lock through its `run_locked.ps1`.
     The base has no two-ended pulses, so its target arm is lit from
     one end: the bench's stop at `bench.mjs:321` must record that on
     the base build and go on (the head still stops). The table gives
     head minus base per stand, at rest and in play, against the
     control pair's spread. If a stand costs more than 0.2 ms, add
     95fcf3b7 (S4 alone) as a third build to split S4 from S4b. Probes
     only, in `.claude/probes/K1196/`.
   - K1191's open residual: ji 147 arm 1's bright GPU colours, which
     the cover model leaves unexplained (batch 19 Run D's
     `.claude/probes/K1191/task3_unlit_arm.md`; its candidate is gk, a
     foreign over thread's silhouette discard, the one input the cover
     model leaves out: `cover_lib`'s header). Model gk and say whether
     it explains them, or "not found" with what was ruled out. Probes
     only, in `.claude/probes/K1191/`.
2. Cursive work: K1198, one run with two pieces, Claude's picks from
   20G (`.claude/probes/K1198/SUMMARY.md` and K1198's notes). Neither
   depends on K1197 (Levi's call on how c joins into a, d, g, o, q and
   k). The kit is untracked under `.claude/probes/K863/trace/`: the
   run works in `.claude/probes/K1198/` from 20G's copies, copies
   there anything else it changes, and changes nothing under
   `.claude/probes/K863/`. Keep one of the six runs for it.
   - (a) Plc1m's sheet and its missing numbers. Draw J3i's sheets
     (`out32/cusp_v72.svg`, `c_v72.svg` and `cursive_v72_words.svg`;
     the Handoff of `docs/design/K1112_cursive_j3i.md` lists them, and
     the trace's NOTES.md under `## K1112 cusp` holds their rerun
     commands) for Plc1m, each join and word four ways: the font,
     v7.1, v7.2 and Plc1m. Add to 20G's table the font distance of ai,
     ar, ei and ni (v7.2 brought them nearer the font than v7.1),
     whether the fr and fs pins change anything under Plc1m (a no-op
     under v7.2), and the largest word moves (under v7.2 fi in "first"
     and "fifty", under v7.2b it in "hit" and "fruit"). Claude judges
     the sheet.
   - (b) ij. List every letter pair the font shapes into one glyph
     (26 x 26, through the kit's shaping with `feats_for`'s features)
     and the feature that makes each. Then shape with those ligatures
     off everywhere (the one rule takes no per-pair data), solve the
     joins they hid through the ports under Plc1m and v7.2, and run
     the census gates (hooks, spikes and rough, undesigned seams, over
     budget, side, locality, determinism) in one table against 20G's.
     Draw each such join and its words beside the font for Claude; the
     locality list names every word that moves.
3. Claude's picks from batch 20's reviews and the Pixel passes:
   - K1205's first step (the warm Pixel's 30 fps at rest at 0 moves
     and at the finish, while 7 moves holds 60; its notes). On the
     desktop, in fabric at rest at 0, 7 and 13 moves (the phone pass's
     link and walk, `scripts/phone_pass/walk.mjs`), record what keeps
     each frame drawing (`__knotLoop()`'s flags over 10 s: which visual
     flags are set, the empty frames), the frame's JS (`__knotPerf()`)
     and the GPU per pass, under the perf lock. The table names what a
     frame at 0 moves draws or runs that one at 7 moves does not.
     Probes only, in `.claude/probes/K1205/`; no fix. Claude runs the
     warm-phone pass after.
   - K1139's watch: fabric 7 moves' frames over 25 ms grew by 14 and
     15 in the Pixel passes of S3b's fix (1fe793f5 -> 71eedb94) and S5
     (36aed2d5 -> fbc1b212), floor 13. Time the in-play frame tail at
     7 moves for both pairs on the desktop, ABBA, under the perf lock
     (p95, p99, max, frames over 2x the median), and say whether
     either pair's head moves it. 20F's `bench.mjs` play mode with the
     phone pass's 7-moves stand is the tool, so this and K1196's step
     (item 1) can share one run if both fit.
4. `## Next, in order`: batch 20's draft read the items up to K1198,
   so read only the items numbered above K1199. Take an item whose
   next stage is bounded and decided by the checks above. Name the
   stage; a whole feature is not one run.
5. `## Residuals (known, not fixed)`: only the items numbered above
   K1199 that this list doesn't name.

Skip these lanes, and keep every run out of their paths:
- The cursive's next letters and c's joins (K863, K1112, K1119 and
  K1197): they wait on Levi. Only item 2's pieces are open.
- K1139 S6, the route pulse: it follows K1140's Glimpse design, which
  waits on Levi's picks.
- K1190 and K1200 (Levi's look calls on the junction light), K647, and
  every other item waiting on Levi.
- Physics (the simulation), phone passes, items In progress other than
  K1097's S3f5, K144 and K1168 (Claude writes their briefs; deploying
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

Commit it as a work commit (`K1204 A: batch 21 draft`) and push. Close
nothing and file nothing: put anything you would file in your report
for Claude. Claude reviews the draft on master and queues its runs.

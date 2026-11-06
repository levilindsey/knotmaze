# Muse batch 22 (K1208)

Claude starts these runs through Paseo, one run at a time, after
batch 21 (`docs/design/K1204_muse_batch21.md`, K1204) was reviewed
and closed. Each run is a fresh Muse agent that reads this brief,
does its run's tasks, and stops. Claude reviews each run on master
afterwards and closes K1208.

This was a drafting run (Run A,
`docs/design/K1208_muse_batch22_run_a.md`), so the batch's runs are
B to G in the drafting brief. Six runs fit (B to G below); the
chain tags are `22B` to `22G`, one run at a time. Batch 22 uses
ports 5880-5939, one range of ten per run.

Claude changed the batch on 2026-11-05, after Levi's calls of
that day:

- **Run H added** (K1210, after Run G below): Levi asked "I also
  want to make sure that fire and segment collapsing effects also
  correctly transition across segments--similar to the
  highlights". It runs second, after Run B, so the pulse it
  measures against is Run B's; tag `22H`, ports 5940-5949. It
  touches only its own probe folder, so Run C still starts from
  Run B's work. The order is B, H, C, D, E, F.
- **Run G held.** Levi rejected the joins Plc1m sits on (K1119:
  v6.8 kept on every sheet; K1197: c's old joins kept), so Run G
  is not queued. Its section stays for the record; do not run it.
- **Run G redrafted** (later on 2026-11-05): K863's J3j rebuilt the
  approved version, v6.8, and Claude found that J3i's corner rule
  (Plc1m, Plc2m) adds nothing visible on it (K1198's notes). Run G
  now shows i and j in ij on v6.8, drops Plc1m, and checks the six
  join pins K1112 may delete. It runs after Run F (tag `22G`).
Runs came from the candidates in Run A's order:

- (1) Junction work (Levi, 2026-11-04: "perfecting all junction
  and cursive work is always my main priority"), one bounded stage
  each: K1207 fits (Run B), K1209 fits (Run C, from Run B's commit),
  K1201's fix (b) fits (Run D, from Run C's commit), K1196's next
  step with K1139's frame-tail watch fits as one timing run
  (Run E), and K1191's open residual fits (Run F). K1097's next
  stage does not fit as a candidate ("Left out on purpose" below
  says why).
- (2) Cursive work: K1198's next piece fits as one run (Run G:
  only the ligature-substitution lookups emptied, censused under
  Plc1m, with the fr/fs pins sheeted both ways). Run A holds one
  of the six runs for it.
- (3) Claude's pick from the Pixel passes: K1205's first step is
  read and left ("Left out on purpose" below); junction work and
  cursive fill the six.
- (4) "Next, in order", items numbered above K1204: K1207 and
  K1209 are Runs B and C from step (1). Nothing else there is
  above K1204 (K1201 is below it, at LEDGER.md's In progress; it
  is Run D from step (1)), so nothing below that was read (Run A
  directs it; batch 21's draft read the section to K1198).
- (5) Residuals numbered above K1204, except the ones Run A's
  list names: K1198 is Run G from step (2), K1191 is Run F from
  step (1), and K1205 is step (3)'s left piece. Nothing else
  there is above K1204.

Two items end outright: K1207 and K1209, once Claude reviews
Runs B and C. Run B settles two switches Claude already judged
(no new look to judge); Run C retires a vote that draws 0 px.
Run D stops at its look sheet with the switch defaulting to
today's picture: Claude judges the sheet and flips the default,
and K1201 and K1139 stay open either way. Runs E, F, G and H change
no `src/` at all and end in tables, diffs or sheets. A run that
stops keeps its item open (batch 8 rule 1). Close lines that
rewrite an item's text give the new text in their reports, for
Claude to apply (`ledger.mjs` has no command that rewrites an
item's text, so a rewriting close says so, as the drafting brief
requires).

Every task is decided by a unit test, a desktop probe, a dry
run or a measurement table below, and none needs Levi or a
phone. Run D changes what the player sees only behind its
switch; Runs B and C settle pictures Claude already judged (Run
B's window becomes the only path; Run C's fans draw the same
ink on one layer); Runs E, F, G and H change no picture at all.

No two runs touch one file ("How to work", rule 3), except
where a run below says it starts from the earlier run's commit:
Run C starts from Run B's commit and Run D from Run C's (the
junction-field and joinery files carry all three). Read the
whole brief before your first command.

## How to work

Batch 21's "How to work" applies unchanged: read it in
`docs/design/K1204_muse_batch21.md` (it sends you on to batch
20's, batch 19's, batch 18's, batch 17's, batch 16's, batch 15's,
batch 8's ten rules and the shared process in
`docs/design/K1050_muse_week.md`) before anything else. Read
K1208 wherever it, or a page it sends you to, says K1204, K1199,
K1192, K1189, K1184, K1178, K1169 or K1131; the chain tags are
22B to 22H (22D held; 22G redrafted), and Claude starts them one at a time. Batch
22 uses ports 5880-5949; each run below names its own range. After
each run, update K1208's handle (the next run in B, H, C, D, E, F
order, or, after F, that all the runs are in and Claude reviews
and closes K1208).

GPU probes and timings hold the machine's perf lock (each
harness's `run_locked.ps1`). Say so in each such run's tasks,
and never time without it.

node_modules (batch 20's rule, unchanged): the main checkout's
node_modules is shared. Worktrees reach it through a junction,
and other servers hold its native binaries open. Never run
`npm ci` in the main checkout. Before removing a worktree,
unlink its node_modules junction first (`scripts/preview.ps1`'s
`Remove-PreviewWorktree` shows how; on this git 2.33,
`git worktree remove --force` follows a junction into its
target). To build an older commit, run
`pwsh -NoProfile -File scripts/preview.ps1 -Ref <sha> -Root
$env:TEMP\knotmaze-previews -BuildOnly`. If node_modules looks
broken, repair it with `npm install` (never `npm ci`) and say
so in the report.

Claude agents may run beside a run, each in its own worktree (a run's section names any whose files it shares); never touch their worktrees or files. Claude runs the phone passes; no run touches the phone.

Fix runs only, and probe outputs stay out of git (Levi's reset, 2026-11-05). A run lands a fix with a numeric test that shows it; a run that would only investigate is not sent, and a run that cannot make its fix within its brief stops and reports instead of landing probe results. `.claude/` is ignored apart from `.claude/rules/`: never `git add -f` a probe's outputs (JSON, PNG, TXT tables, logs, sheets). A small probe script may be force-added when a later run reuses it; its numbers go in the commit message. Run P (27d103d1) committed 68 probe files, 36,877 lines.

## Run B - K1207: settle the two pulse switches (cover ramp out, end window the only path)

**Chain tag:** 22B · **Suggested ports:** 5880-5889 (the
probe's Vite dev server takes one port in this range).

This run removes batch 21 Run C's cover-ramp switch and makes
Run D's end-window switch the only path, exactly as Claude's
two judgments direct. With the switches still in it first finds
whether any stand bites, shoots the off/on record there, and
says whether the one twin point that moved is a fan pixel. It
re-freezes each pin the window moves and names each in the
commit (pre-launch, no back-compat: CLAUDE.md's Key Design
Decisions). No new look is judged here.

### Read first

- The ledger's K1207 (quoted below), K1202 and K1203 in Done
  (`docs/ledger_notes.md`'s `## K1202`, `## K1203` judgments):
  the ramp spreads e210's step over two pixels and changes
  nothing visible at 1x, so it stays off and K1202 closed; the
  window goes on, proved by the positive control (958-1479 px
  with the switch on, 0 px off, at
  `.claude/probes/K1203/claude21d/posctl.mjs`).
- `src/render/junction_field.ts` at its two switches (search
  `setPulseCoverRamp` and `setPulseBandEndWindow`): module flags
  `pulseCoverRamp` and `pulseBandEndWindow`, default off, riding
  `uJParams.z` and `uJParams.w` through `setFieldParams`; the
  header comment (K1202 COVER RAMP) and `pulseBandCover` (the CPU
  cover the twins share). The GLSL pulse loop reads the same two
  components (`cov` from `uJParams.z`, `endWin` from
  `uJParams.w` against the record's R3.w span).
- `src/render/ribbon/joinery.ts` at `cpuJunctionField` (search
  the name): the CPU twin reads both flags itself
  (`pulseBandCover` for the cover; R3.w under the end-window
  switch as `cs`, passed to `kPulseBandV`), so one switch moves
  both twins. `src/render/paint_math.ts` at `kPulseBandV`
  (search the name): `childSpan` (default 0 is window 1) honours
  a one-ended, non-cont child's end window over
  `PULSE_END_WINDOW` (`src/render/paint_const.ts`: 0.45).
- `.claude/probes/K1203/stands_cyc.mjs` (the `x4` stand:
  `k111&am=instant&fw=0&snd=none&phw=0`, moves 0, 247, 248, 69,
  72, 73, 95, 140, 180, `&pr=8`), `table_cyc.mjs` (its
  `K1203_ENDWIN` model of the window and its BAND EXTENT past
  the arm) and `check_field.mjs` (the CPU twin at mnode_27 ji 28
  along e18, taus 0.5 to 1.25). Any stand this run reuses is
  copied with its link and moves verbatim from that source
  (rule 11), and the report names anything it adds or changes.
- `test/render/paint_gameplay.test.ts` at the `kPulseBandV`
  describes and the K1203 end-window cases, and
  `test/render/k320_slim.test.ts` at its char budgets: the
  junction budget reads 40,601 (`JUNCTION_FRAG` at or under
  40,601; its comments record K1202's branch adding 86, from
  40,388 to 40,474, and K1203's adding 127, to 40,601).
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1207** · In Muse batch 22 (K1208): remove Run C's switch (`setPulseCoverRamp`, 5e0d5914, off by K1202)
> and make Run D's end window (`setPulseBandEndWindow`, a0f1d634, on by K1203) the only path, re-freezing
> the pins it moves; it also says whether 21D's twin point is a fan pixel (K1203's notes)

Both switches default off, so today's picture is the cover's
hard edge and a band at window 1 all along its child. The
window's CPU twin point is the open question: at tau 0.91 on
x4's mnode_27 the twin moved from (0.5052, 0.8065, 0.6131) off
to (0.4960, 0.8030, 0.6059) on (about 2.3/255;
`.claude/probes/K1203/out/check_field.txt`, and K1203's
judgment notes in `docs/ledger_notes.md`), where the GPU
showed 0 px.

### Tasks

Use ports 5880-5889. The sheet and the cold compiles take the
perf lock (`.claude/probes/K1203/run_locked.ps1 -Batch`, copied
if your harness needs its own); never time without it.

**Write set:** `src/render/junction_field.ts` (the two flags,
their `uJParams.z` / `uJParams.w` writes, the pulse loop's cover
and window expressions, `pulseBandCover` and the header notes
only), `src/render/ribbon/joinery.ts` (the CPU twin's cover and
window reads only), `src/render/paint_math.ts`
(`kPulseBandV`'s window only, if the only-path form needs it),
`test/render/paint_gameplay.test.ts` (cases moved or added),
`test/render/k320_slim.test.ts` (budget lines and comments
only), and new probe files under `.claude/probes/K1203/`
(`git add -f`) beside 21D's. Nothing else; Runs C to G touch
none of these files except as Run C's and Run D's sections
state (they start from this run's commit).

1. **Before table (switches still in).** Run
   `.claude/probes/K1203/table_cyc.mjs` on the `x4` stand with
   and without `K1203_ENDWIN=1` and state in the report every
   band step over 1/255, naming the band and its tau. That table
   picks task 2's stand; if no band steps over 1/255, say so
   and task 2 shoots nothing.
2. **The record sheet (desktop probe).** At a biting stand from
   task 1, serve on a port in range with the kit's
   private-cache config, pin the clocks as 21D's harness does,
   and shoot the fan with the end-window switch off above on
   (the setter called in the page through a `/src` import, the
   same pinned state both times, a same-build off/off control
   pair first), under `.claude/probes/K1203/`. State the changed
   pixels between the pair. If task 1 found no bite, this task
   is the sentence that none bites, with task 1's table as its
   evidence.
3. **The twin point.** At `check_field.mjs`'s point (ji 28,
   tau 0.91 along e18 on the `x4` stand), say whether the fan
   draws that world point: sample the same state on the GPU
   (debug view 5's G and the normal view at that point, off and
   on) against the twin's two values above. The answer is one
   of: the fan draws it and the GPU agrees with the twin's on
   value (the 0 px was the crest the reach window crushes, as
   posctl showed at that fan), the fan draws it and the twins
   disagree, or no fan pixel covers it. Name the probe and its
   numbers.
4. **Remove the ramp; settle the window.** Delete
   `setPulseCoverRamp`, `pulseCoverRamp` and its branch in the
   GLSL cover and in `pulseBandCover`, keeping the off path
   exactly, so every pin reproduces bit for bit. Make the
   window the only path: delete `setPulseBandEndWindow` and
   `pulseBandEndWindow`; the GLSL reads the record's R3.w span
   unconditionally (today's `endWin` expression with only its
   `uJParams.w > 0.5 &&` term dropped: `r3.w > 0.0 && tau > 0.0 ?
   clamp((r3.w - tau) / PULSE_END_WINDOW, 0.0, 1.0) : 1.0`), the
   CPU twin and `kPulseBandV` read the same window without a
   flag, and `uJParams.z` / `uJParams.w` go back to free (write
   0, and say so in `setFieldParams`' comment). With the ramp
   gone and the window always on, rerun the pins: re-freeze
   each pin the window moves (the `pre_g23` fixtures and any
   golden that reads a one-ended, non-cont child's far end),
   naming each moved pin in the commit; a pin outside that set
   moving is a stop (batch 8 rule 2).
5. **Budgets and cold compiles.** Measure every fragment
   length `k320_slim.test.ts` budgets on the edited tree. The
   budgets come down by what this run removes, measured: lower
   the junction budget to the measured length with its comment
   (the ramp's 86 and the two flag branches' share, as the
   file's comments record them). Then, under the perf lock,
   run K307's cold compile (`.claude/probes/K307/`,
   `trace_intro.mjs`, as batch 21's Run C states it) against
   this run's base commit, interleaved, at least two runs each;
   the run's mean time to first visible sits inside the base's
   spread.
6. `npm test`.

### Done and close

**Done when:**

- The ramp's switch, flag and branch are gone in GLSL and CPU
  code both, and the off path's values reproduce bit for bit.
- The window is the only path (no switch remains), the band
  equals its child arm's ribbon at the far end to 1e-9, and
  every moved pin is re-frozen and named in the commit.
- Task 1's table, task 2's sheet or its no-bite sentence, and
  task 3's fan-pixel answer are in the report.
- The shader budgets read the measured lengths, and the run's
  K307 mean sits inside its base's spread.
- `npm test` passes.

**Close lines:**

Claude to mark K1207 done once Run B is reviewed:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K1207 --commit <sha8> --what "cover-ramp switch removed (off path bit for bit); end window the only path, pins re-frozen and named; 21D twin point answered"`

Then:

After the run, update K1208's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1208 --last-commit <sha8> --next "Run B done; Claude reviews it, Run H next"`

## Run C - K1209: retire the fillet layer vote and its top layer

**Chain tag:** 22C · **Suggested ports:** 5890-5899 (unused
for a server of its own unless a sheet needs one; the range is
this run's if it does).

This run starts from Run B's commit (it touches
`src/render/ribbon/joinery.ts` after Run B, rule 3's exception,
stated here as Run A requires). It retires the per-arm layer
vote and the top fan layer: every fan draws on the one bottom
layer. A pin may move only where fans overlap; each one that
moves is re-frozen and named in the commit.

### Read first

- The ledger's K1209 (quoted below) and
  `docs/ledger_notes.md`'s `## K1186` judgment of Run E: all 34
  forced votes drew 0 px (max 0), and so did the positive
  control whose fan geometry did move between the layers; both
  fan layers draw above the ribbons with only an empty container
  between them (the TWO-LAYER JOINERY comment in
  `src/render/ribbon/joinery.ts`), so a vote only reorders fans.
- `src/render/ribbon/joinery.ts`: the TWO-LAYER JOINERY comment
  (search the name; it ends "kept for the junction-shader
  merge"), the vote itself (search `underNear`: the
  `underNear` / `overNear` sets, `voteReach`, then each arm's
  `top` and `dives` resolved once per rebuild, with the
  probe-only `voteOverride` forcing one arm), `layerFor` (a
  junction's discs to the top mesh only when some arm is top
  and none dives), and every `fm` routing the vote feeds (the
  discs, the wedges and the round-join strips). Read
  `gapNearOf` with it: it stays (`armReach` and the cover cap
  read it too).
- `src/render/ribbon_renderer.ts` at the layer setup (search
  `filletTopLayer`): the root draws the base ribbons, the bottom
  fillet layer, an empty container, the top fillet layer and
  another empty container, in that order; the `voteOverride`
  facade beside `skipJointPairs` and the `filletTopMesh` /
  `filletTopLayer` accessors are the vote's other readers.
  `src/render/ribbon/explore_gaps.ts` and
  `src/render/ribbon/paint_state.ts` read the top layer too
  (its shader swap and its `labelInk` visibility), and
  `scripts/phone_pass/walk.mjs` toggles it in probes.
- `test/render/vote_override.test.ts` (whole): the pin that
  holds the override to the vote resolution; it goes with the
  override.
- `.claude/probes/K1186/out21e/sheet_key.md` (21E's sheet key):
  the 0 px verdict this retirement rests on; no new sheet is
  needed unless a pin moves.

### What is there today

> **K1209** · Retire the fillet layer vote (21E: a flip only reorders fans, 0 px; K1186): one fan layer, once
> joinery.ts's "kept for the junction-shader merge" is checked. Removes the vote loop, layerFor, the fm
> routing, filletTopMesh, `voteOverride` and its test; a moved pin is re-frozen and named.

Every rebuild re-derives each junction's vote from the nearby
crossings, and a wedge, disc or strip is pushed to the top or
bottom fan mesh by that vote. Since the per-pixel gap masks the
choice no longer changes coverage; it only changes which mesh
draws the fan, and 21E measured that change at 0 px.

### Tasks

Use ports 5890-5899. No timing; task 4's shots take the perf
lock. Start from Run B's commit; say its sha in the report.

**Write set:** `src/render/ribbon/joinery.ts` (the vote loop,
`layerFor`, the `fm` routing, `filletTopMesh`, `filletTopLayer`,
`voteOverride` and the TWO-LAYER comment only, after Run B),
`src/render/ribbon_renderer.ts` (the layer setup, the
`voteOverride` facade and the top-layer accessors only),
`src/render/ribbon/explore_gaps.ts` and
`src/render/ribbon/paint_state.ts` (the top layer's readers
only), `scripts/phone_pass/walk.mjs` (its layer toggle only, if
it names the top layer), `test/render/vote_override.test.ts`
(deleted), any pin a fan overlap moves, and new probe files
under `.claude/probes/K1186/` (`git add -f`) beside 21E's for
task 4. Nothing else; Runs
B, D, E, F and G touch none of these files except as Run D's
section states (it starts from this run's commit).

1. **Check the merge reason first.** The TWO-LAYER comment says
   the vote is "kept for the junction-shader merge". Search the
   tree for that merge (the junction shader, its explore variant
   and any design note that still plans it) and state in the
   report, with the file that holds it, whether anything still
   needs two fan layers. If a live reader needs the top layer,
   stop and report which (batch 8 rule 2); do not retire under
   it.
2. **Retire the vote.** Delete the vote loop (`underNear`,
   `overNear`, `voteReach` and the per-arm `top` / `dives`
   resolution, with `voteOverride` and its `VoteOverride` type),
   `layerFor` and every `fm` choice it fed: discs, wedges,
   cover strips and round-join strips all push to the one
   bottom mesh. Delete `filletTopMesh` and `filletTopLayer`
   (their creation, their `begin` / `commit` and their layer),
   the renderer's top-layer container and accessors, and the
   readers in `explore_gaps.ts`, `paint_state.ts` and
   `walk.mjs` that name them. `gapNearOf` stays. The root keeps
   five children before the plucks layer: the top fillet layer's
   slot (index 3) becomes an empty `Container` like slots 2 and
   4, because probes toggle the root's children by their
   historic indices (`.claude/probes/g1/attr_census.mjs` hides
   `k[1]` and `k[3]`; the renderer's layer comment lists 0 to
   4). Say so in that comment and in the one that replaces
   TWO-LAYER JOINERY, which now records the one-layer rule and
   21E's 0 px.
3. **Pins.** Delete `test/render/vote_override.test.ts`. Run
   `npm test`: a pin may move only where fans overlap (two fans
   that drew on different layers now draw in push order on one);
   re-freeze each one that moves and name each in the commit.
   A pin moving outside a fan overlap is a stop (batch 8 rule
   2): report it, do not re-freeze past it.
4. **Same pixels (desktop probe), before the retirement is
   committed.** CPU pins cannot see draw order, so measure it:
   build Run B's commit and the retired tree (`scripts/preview.ps1
   -Ref <sha> -Root $env:TEMP\knotmaze-previews -BuildOnly` for
   the base; the tree as the working build), serve each on a port
   in range, and shoot 21E's stands (`.claude/probes/K1186/ab21e.mjs`,
   links, moves and pinned clocks copied verbatim, rule 11) on
   both builds, the same pinned state, a same-build control pair
   first, under the perf lock (`.claude/probes/K1186/run_locked.ps1
   -Batch`). State the changed pixels per stand. 21E measured
   every forced vote at 0 px, so any changed pixel is a stop
   (batch 8 rule 2): crop it, name the stand, and do not push the
   retirement.
5. `npm test`.

### Done and close

**Done when:**

- Task 1's merge check is answered from the file that holds it,
  and the vote, `layerFor`, the `fm` routing, `filletTopMesh`,
  `filletTopLayer`, `voteOverride` and its test are gone; every
  fan draws on the one bottom layer.
- `npm test` passes; every moved pin is a fan overlap, re-frozen
  and named in the commit (or none moved, said so).
- Task 4's base-against-retired shots read 0 changed pixels at
  every stand, beside a control pair at 0.

**Close lines:**

Claude to mark K1209 done once Run C is reviewed:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K1209 --commit <sha8> --what "fillet layer vote and top layer retired to one fan layer (21E 0 px); moved pins re-frozen and named"`

Then:

After the run, update K1208's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1208 --last-commit <sha8> --next "Run C done; Claude reviews it, Run D next"`

## Run D - K1201 fix (b): the band crossfade at a near-ridge joint, behind a switch

**Chain tag:** 22D · **Suggested ports:** 5900-5909 (the
probe's Vite dev server takes one port in this range).

This run starts from Run C's commit (it touches
`src/render/junction_field.ts` and `src/render/ribbon/joinery.ts`
after Runs B and C, rule 3's exception, stated here as Run A
requires). It builds fix (b) behind a switch that defaults to
today's picture: inside the fan, a pulse band's child side
crossfades from its parent arm's train at the joint to the
child ribbon's own value at the fan's reach, so a ridge sitting
within `PULSE_RIDGE_FADE` of the joint (or before it) no longer
steps the light there. It proves the twins equal by unit tests,
dumps the drawn-span xR at the two natural stands, shoots
off/on sheets at all three stands, and stops there: Claude
judges the sheets and flips the default. The golden pins and
the `pre_g23` fixtures stay unmoved while the switch is off.

The switch's form follows batch 21 Runs C and D: a module flag
in `src/render/junction_field.ts`, exported beside
`setFieldParams` with a setter the probe calls, defaulting to
today's picture (off), riding a free `uJParams` component
(`.z` and `.w` are free again after Run B; say which this run
takes in the report); the CPU twin in `joinery.ts` reads the
flag itself, so one switch moves both. A panel param is the
wrong form here, for batch 20 Run B's reason: it would append
to `CODEC_PARAMS` and move the codec pin for a look nobody has
judged.

### Read first

- The ledger's K1201 (quoted below),
  `docs/design/K1139_s4b_ridge_fade.md` (its "Fix options" (b),
  then its "Next step" 3 and 4, and its Handoff's "Open" item
  5), and `docs/ledger_notes.md`'s `## K1201` judgment of Run F:
  fix (b) is the band crossfade (the band's child side fades
  from the parent's train, factor 1 and the parent's phase, at
  tau 0 to the ribbon's value at the fan's reach), behind a
  switch, from the K1207 run's commit; the census's step column
  without the reach window overstates the dailies, and weighted
  by `kReachWin` every daily still steps (below).
- `.claude/probes/K1201/out/census21f.txt` (21F, CPU only,
  lattice spans): at play reach the seven dailies hold 32
  arm-ends stepping over 0.3 at 31 heads (Claude's windowed
  check in K1201's judgment notes), up to 0.77; daily #25's
  `node_216` on e251 and x4's `mnode_130` on e35 are this run's
  natural stands (their lattice rows read xR 0.000, step 0.8981
  and 0.9000 before the reach window). 21F counted lattice
  spans; this run dumps drawn spans first (task 1).
- `.claude/probes/K1201/out/SUMMARY.md` (20E: the injected
  stand): cyc's `node_218` on e210 at xR 0.2, built by
  re-declaring e210 in the page (`dB` 2.346, `gR` 2.546 on
  `W` 2.746; predicted step 0.54, CPU band step 0.3885 after the
  live reach window). Its link and moves are the `cyc` stand's
  (below); the injection is copied from that summary, and the
  report names anything it changes.
- `.claude/probes/K1139/ridge_joint.ts` (whole): the metric
  this fix answers (parent crest against child `kPulseV2` at
  the joint over 400 clocks; xR 0.4 gives 0.18, 0.3 gives 0.36,
  0.2 gives 0.54, 0.1 gives 0.72, 0 gives 0.90 in
  `.claude/probes/K1139/out/s4b/ridge_joint.txt`), and
  `src/render/pulse_path.ts` at `pulseTree` (search the name):
  its `xR = (dist0 + dB + span) / 2 -` an end's distance, so an
  arm's two xRs sum to its span.
- `src/render/paint_math.ts` at `kPulseV2` and `kPulseBandV`
  (search the names) and `src/render/paint_glsl.ts` at
  `kPulseCrestK` (in `PULSE_CREST_GLSL`): the ribbon's ridge
  factor is `min(1, |g - gR| / PULSE_RIDGE_FADE)` past the
  ridge (`src/render/paint_const.ts`: `PULSE_RIDGE_FADE` 0.5);
  the band applies the same factor today, which is the step:
  at tau 0 the band's child side already reads the faded
  child train where the parent reads factor 1. Fix (b) blends
  the band between the two across the fan's reach instead;
  no ribbon term moves.
- `src/render/junction_field.ts` at its pulse loop (search
  `kPulseCrestK`: the band's `bk` ridge factor, `g` past the
  ridge read as `2 gR - g`) and `src/render/ribbon/joinery.ts`
  at `cpuJunctionField` (its twin loop, `kPulseBandV` with the
  same `gw`): CPU and GLSL move together, as Run B left them.
- `.claude/probes/K1203/stands_cyc.mjs` (the `cyc` stand:
  `k111&am=instant&fw=0&snd=none&phw=0`, moves 0, 246, 82, 83,
  199, 150, 151, 38, 155, 211, head `node_221`; the `x4` stand:
  same link, moves 0, 247, 248, 69, 72, 73, 95, 140, 180,
  `&pr=8`) and `src/ui/daily_link.ts` at `dailySeed` (read
  only: daily #25 is `dailyParams(25)`, as 21F built it). Any
  stand this run reuses is copied with its link and moves
  verbatim from that source (rule 11), and the report names
  anything it adds or changes.
- `test/render/paint_gameplay.test.ts` at the `kPulseBandV`
  describes and `test/render/k320_slim.test.ts` at its budgets
  (as Run B left them). With the switch off your code must pass
  every one of these untouched.
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1201** · S4b's joint step (K1139): a two-ended arm's ridge near its joint (xR < 0.5) steps the light.
> 21F (8e0c5a1c): play meets it in every daily of a week, 2-6 arm-ends each, steps up to 0.77 after the reach
> window (CPU, lattice spans; notes). Next: fix (b), the band crossfade, in batch 22 behind a switch (K1208).

At a two-ended arm's ridge the crest arrives at the joint
from both ends, and past the joint the band's child side
already reads the ridge-faded child value where the parent
side reads a full crest: predicted 0.18 at xR 0.4 up to 0.90
at xR 0 (`ridge_joint.txt`). 20E showed it only by injection;
21F's census finds play meeting it in every daily. Inside the
fan the band is the only place the two values meet, which is
where fix (b) crossfades them.

### Tasks

Use ports 5900-5909. The sheets and the cold compiles take the
perf lock (a copied `run_locked.ps1 -Batch`); never time
without it. Start from Run C's commit; say its sha in the
report.

**Write set:** `src/render/junction_field.ts` (the switch, its
`uJParams` ride and the pulse loop's crossfade only, after Run
B), `src/render/ribbon/joinery.ts` (the CPU twin's crossfade
only, after Runs B and C), `src/render/paint_math.ts`
(`kPulseBandV`'s crossfade only, if the twin needs it there),
`test/render/paint_gameplay.test.ts` (cases added),
`test/render/k320_slim.test.ts` (a budget line and its comment
only, if task 4 fires), and new probe files under
`.claude/probes/K1201/` (`git add -f`) beside 21F's. Nothing
else; Runs B, C, E, F and G touch none of these files except as
Runs B's and C's sections state. If the crossfade needs a file
outside this set, stop and report what it would change.

1. **Drawn-span xR first (desktop probe).** On the two natural
   stands (daily #25 at `node_216` on e251, built as
   `dailyParams(25)`; x4 at `mnode_130` on e35, link and moves
   verbatim from `stands_cyc.mjs`), dump each stand's drawn-span
   xR from the page (the declaration `__knotPulses` reports, as
   20E dumped it) before any fix: the arm's drawn `span`, its
   `dA` and `dB`, and xR at the named joint. State them beside
   21F's lattice rows (xR 0.000 both). If a drawn xR reads 0.5
   or over, that stand shows no step: say so, shoot it anyway
   as the control, and name the next meeting end from
   `census21f.txt` on the same maze as its replacement.
2. **The switch.** In `junction_field.ts`, the module flag (a
   name in the file's style) and its setter, defaulting to
   today's picture (off), riding the free `uJParams` component
   the section above names. With the flag off, the GLSL band
   loop and the CPU twin reproduce today's values bit for bit:
   every existing pin passes unedited. The header comment gains
   the flag's sentence: what it selects, that it defaults to
   today's picture, and that Claude flips it after judging the
   sheets.
3. **The crossfade, CPU twin and GLSL together.** With the flag
   on, on a band's child side (tau over 0) the band's value
   blends from the parent's train (the head side's crest at
   tau 0: factor 1, the parent's phase and direction) at tau 0
   to today's band value at the fan's reach (the band's own
   extent on that arm, as BAND EXTENT reads it), by a smooth
   ramp over that span; the head side and tau 0 itself read as
   today under both settings, and a band whose child is
   one-ended reads as today (no ridge, no blend). "Next step"
   3's pins are the contract: band equals parent at tau 0 and
   band equals ribbon at the reach. No ribbon term moves: the
   crest, the ridge factor on the ribbons, Run B's end window
   and the cover read as today under both settings.
4. **After table + tests.** New cases in
   `paint_gameplay.test.ts` pin: flag off reproduces the S3a,
   S4b and Run B band values exactly (the existing pins, rerun
   unedited); flag on gives band = parent at tau 0 and band =
   ribbon at the reach (to 1e-9, over 400 clocks at xR 0.2, 0
   and -0.1 on an invented two-ended arm, directions as the
   S4b describe runs), and the joint step `ridge_joint.ts`'s
   metric predicts at those xRs reads under 1/255 on the band
   with the flag on. A text pin in the same file (the
   `k320_slim` source-scan manner) slices the GLSL loop's
   crossfade expression and the CPU twin's, and matches the
   blend's reach term in both, so a crossfade in only one twin
   cannot pass. Rule 9: in a scratch change make the GLSL blend
   read today's band value always; show the tau 0 case fails,
   then undo it. Then shader budgets and the K307 cold compile
   as Run B's task 5 states them, against this run's base (Run
   C's commit): the fix needs `JUNCTION_FRAG` room (the design
   doc's "Open" item 5: 8 characters were left at S4b, and Run B
   freed the switches' share); raise the junction budget by no
   more than the fix adds, measured with the K307 cold compile
   as Run B states it, and name the raise in the commit.
5. **The sheets (desktop probe).** Three stands: 20E's injected
   one (cyc's `node_218` on e210 at xR 0.2, injection copied
   from `SUMMARY.md`), and task 1's two natural stands. On each,
   serve on a port in range with the kit's private-cache
   config, pin the clocks as the K1139 harness does, and shoot
   the joint's fan twice - flag off, then flag on (the setter
   called in the page through a `/src` import, the same pinned
   state both times, a same-build flag-off/flag-off control pair
   first). One sheet per stand, off above on, under
   `.claude/probes/K1201/`, with the joint step beside it: the
   band's largest step at the joint off and on (debug view 5's
   G at tau -0.03/+0.03 and -0.1/+0.1, as 20E sampled it).
6. `npm test`.

### Done and close

**Done when:**

- Flag off: the S3a, S4b and Run B band pins and the frozen
  `pre_g23` pins reproduce bit for bit, and the golden pins are
  unmoved. Flag on: band = parent at tau 0 and band = ribbon at
  the reach (task 4's pins), and the predicted joint step reads
  under 1/255 on the band.
- Task 1's drawn-span xRs are dumped for both natural stands
  (or a replacement is named, with its dump).
- The scratch change fails the tau 0 case (rule 9), the shader
  budgets read as task 4 states (the junction raise named, no
  more than the fix adds), and the run's K307 mean sits inside
  its base's spread.
- The three sheets exist under `.claude/probes/K1201/`: flag
  off above on, the control pair beside them, at one pinned
  state each, with the joint-step rows beside them.
- `npm test` passes.

**Close lines:**

This close rewrites K1201's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the fix
recorded ("fix (b), the band crossfade at a near-ridge joint,
behind its switch in <sha8>, default off; drawn-span xR <values>
at daily #25 node_216/e251 and x4 mnode_130/e35; sheets at
`.claude/probes/K1201/` (<sheets>): joint step <off> off,
<on> on at the injected stand; Claude judges them and flips
the default") and the remainder kept, for Claude to apply by
hand. Then:

After the run, update K1208's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1208 --last-commit <sha8> --next "Run D done; Claude reviews it and judges the sheets, Run E next"`

## Run E - K1196 next step with K1139's watch: S4's own cost on the desktop, ABBA

**Chain tag:** 22E · **Suggested ports:** 5910-5919 (the
probe's Vite dev server takes one port in this range).

This run changes no `src/`: it times the same three stands on
S4's base and on S4-and-S4b together, ABBA, under the perf
lock, so the gap 20F measured is split into S4's own cost.
K1139's frame-tail watch shares the run (the same bench): the
in-play frame tail at 7 moves for the two Pixel pairs. It ends
in those two tables. Probes only, in `.claude/probes/K1196/`.

### Read first

- The ledger's K1196 (quoted below) and
  `.claude/probes/K1196/out/SUMMARY.md` (20F, whole): at rest
  the two-ended stands read frame p50 7.50 (cyc e210) and 7.82
  (loop e102) against the start head's 7.07; in play 7.25, 7.22
  and 6.95 (spread 0.2, 0.1). The stands differ in more than
  their pulses, so the gap is not yet S4's own cost.
- `docs/design/K1204_muse_batch21_run_a.md`, item 1 (K1196's
  step and the watch, left out of batch 21 for room): the same
  three stands on S4's base `aa1156ae` and on `36aed2d5` (S4 and
  S4b; between the two only `src/render/` files and tests
  change), each build made with `scripts/preview.ps1 -Ref <sha>
  -BuildOnly` and timed with 20F's `bench.mjs` (rest and play, a
  same-build control pair, then ABBA x4) under the perf lock;
  the third build `95fcf3b7` (S4 alone) only if a stand costs
  more than 0.2 ms. The watch: fabric 7 moves' frames over
  25 ms grew by 14 and 15 in the Pixel passes of S3b's fix
  (`1fe793f5` to `71eedb94`) and S5 (`36aed2d5` to `fbc1b212`),
  floor 13; time the tail for both pairs on the desktop, ABBA,
  and say whether either pair's head moves it.
- `.claude/probes/K1196/bench.mjs` (whole, then its stop): it
  times rest (5 s) then play (24 moves) per load from
  `stands_cyc.mjs`'s stands, and stops when a stand lights no
  two-ended arm (batch 8 rule 2). The base has no two-ended
  pulses, so its target arm is lit from one end: on the base
  build that stop must record the one-ended declaration and go
  on (the head still stops), exactly as the drafting brief
  directs; on the head build the stop stays.
- `.claude/probes/K1196/stands_cyc.mjs` (verbatim from the
  K1139 kit): baseline is the shared `k111` link with no moves
  (start head); cyc is `k111` moves 0, 246, 82, 83, 199, 150,
  151, 38, 155, 211 to `node_221`; loop is seed 1 `&pr=8` moves
  185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101 to
  `node_635`. Any stand this run reuses is copied with its link
  and moves verbatim from that source (rule 11), and the report
  names anything it adds or changes.
- `scripts/preview.ps1` at its `-Ref` / `-BuildOnly` form (the
  builds) and `.claude/rules/probes.md`: headed real-time
  Chrome, never `--virtual-time-budget`, the perf lock for GPU
  work.

### What is there today

> **K1196** · Two-ended pulses (K1139 S4) on the desktop, 20F (345a189f, `.claude/probes/K1196/out/`): frame
> p50 at rest 7.50 (cyc e210), 7.82 (loop e102), start head 7.07; in play 7.25, 7.22, 6.95 (spread 0.2, 0.1).
> Other stands, so not S4's own cost: next, those stands on S4's base and head (ABBA), the Pixel if it costs

20F timed the two-ended stands against a different maze's
start head, so its 0.43 and 0.75 ms gaps mix the stands' own
cost with S4's. Timing the same stands on the build before S4
and the build after S4b isolates what S4 added; the watch
reads the same bench's play tail for the two pairs whose Pixel
tails grew.

### Tasks

Use ports 5910-5919. Every timing holds the perf lock
(`.claude/probes/K1196/run_locked.ps1 -Batch`); wait inside
that one command, and never time without it.

**Write set:** copies and new scripts under
`.claude/probes/K1196/` only (`git add -f`; 20F's `bench.mjs`,
its tables and its raw dumps stay as they are - new work goes
beside them and says so) and their output there. Nothing in
`src/`, `test/` or `scripts/` changes; Runs B, C, D, F and G
touch none of these files. A copied tool keeps its header's
stand links verbatim (rule 11); where a copy must change (its
build, its port, the base-build stop), the copy's header names
the change.

1. **The builds.** Make every build with
   `scripts/preview.ps1 -Ref <sha> -Root
   $env:TEMP\knotmaze-previews -BuildOnly`: `aa1156ae` (S4's
   base) and `36aed2d5` (S4 and S4b) for task 2, and `1fe793f5`,
   `71eedb94` and `fbc1b212` for task 3's watch (`36aed2d5`
   serves both). Say every sha in the report. If a build fails,
   name it and its error and stop
   (batch 8 rule 2); do not substitute another base.
2. **S4's own cost.** Time the three stands (baseline, cyc,
   loop) on each build with 20F's `bench.mjs` (rest then play,
   a same-build control pair first, then ABBA x4), under the
   perf lock. On the base build the bench's two-ended stop
   records the target arm's one-ended declaration and goes on;
   on the head build it stops as today. The table gives head
   minus base per stand, at rest and in play (frame p50, mean
   and finish p50), against the control pair's spread. If a
   stand's head minus base costs more than 0.2 ms, add the
   third build `95fcf3b7` (S4 alone) the same way and give S4
   and S4b their own rows; at 0.2 ms or under, say the third
   build was not needed.
3. **The watch.** On the same bench's play mode, at the phone
   pass's 7-moves stand (its link and walk from the pass, named
   in the report), time the in-play frame tail for both pairs
   (`1fe793f5` to `71eedb94`, and `36aed2d5` to `fbc1b212`),
   ABBA, under the perf lock: p95, p99, max and frames over 2x
   the median per build, against each pair's control spread.
   Say whether either pair's head moves its tail.
4. `npm test` (once, reported green; as a probe-only run's base
   check - no test should change).

### Done and close

**Done when:**

- Both builds are made (or a failure is named, with its error),
  and the ABBA table exists per stand, at rest and in play,
  head minus base against the control pair's spread.
- The third build is timed if any stand costs over 0.2 ms, or
  the table says none did.
- The watch's tail table exists for both pairs (p95, p99, max,
  frames over 2x median), with the verdict per pair.
- No file outside the write set changed, and `npm test` passes.

**Close lines:**

This close rewrites K1196's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
timing recorded ("S4's own cost on the desktop in <sha8>: head
minus base at rest <values> and in play <values> per stand
against a <spread> control spread (third build <timed: S4
<value>, S4b <value> | not needed>); tables at
`.claude/probes/K1196/`; the Pixel follows only if it costs")
and K1139's watch kept beside it ("fabric 7 moves' tail: pair
<1fe793f5 to 71eedb94> <moved | unmoved>, pair <36aed2d5 to
fbc1b212> <moved | unmoved>"), for Claude to apply by hand.
Then:

After the run, update K1208's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1208 --last-commit <sha8> --next "Run E done; Claude reviews it, Run F next"`

## Run F - K1191's open residual: model gk for ji 147 arm 1's bright GPU colours

**Chain tag:** 22F · **Suggested ports:** 5920-5929 (the
probe's Vite dev server takes one port in this range).

This run changes no `src/`: it models the one input the cover
model leaves out and says whether it explains ji 147 arm 1's
bright GPU colours, or "not found" with what was ruled out.
Probes only, in `.claude/probes/K1191/`.

### Read first

- The ledger's K1191 (quoted below) and
  `.claude/probes/K1191/task3_unlit_arm.md` (batch 19 Run D,
  whole): ji 147's arm 1 (chain 58 slot 68 dir -1) is in no
  pulse band, its fan-footprint pixels (36, 36, 36, 32, 32, 32,
  36 and 36 in phases 0 to 7, 276 summed over the phases) sit at
  the fan's rim (0.67 to 0.97 world out), the fan twin paints its quiet base
  there (luma 144.2 to 150.6, mean 148.0) and debug-5 G reads 0,
  yet at the pulse's bright phases the GPU shows ribbon-bright
  colours (up to luma 218) where the model shows the base. The
  cover model does not explain them; its unmodelled input is
  `gk`, a foreign over thread's silhouette discard (the
  `cover_lib` header there).
- `.claude/probes/K1191/cover_lib.mjs` (its header, then the
  cover kinds): what the composite model sums per pixel (fan,
  cover strip, webs, bands) and what `gk` would discard from
  it. `.claude/probes/K1191/unlit147.mjs` and
  `unlit147_detail.mjs` (19D's tables beside them) hold the per-
  phase counts this run re-reads; no stand is re-derived.
- `docs/design/K1204_muse_batch21_run_a.md`, item 1 (this
  residual, left out of batch 21 for room): model `gk` (a
  foreign over thread's silhouette discard) for ji 147 arm 1's
  bright GPU colours, or "not found" with what was ruled out.
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1191** · K1139 Stage 4 leftovers (`docs/design/K1139_s3b_fix.md`): the full model's 12/6/11 threshold
> flips; no arc-true tau rate or obliqueness in the classifier; ji 147 arm 1's bright GPU colours, unexplained
> (candidate gk). Batch 19 Run D examined the rest: none blocks K1139's merge (`.claude/probes/K1191/`)

Arm 1's quiet base is settled: no band declares it and rule
(d)'s crotch fill cannot reach it, so it stays unlit by
construction. What is open is only the bright colours the GPU
draws on those rim pixels at the bright phases, which neither
the fan twin nor the composite cover model reproduces.

### Tasks

Use ports 5920-5929. GPU work takes the perf lock (a copied
`run_locked.ps1 -Batch` from the K1139 kit); never time without it.

**Write set:** new scripts and tables under
`.claude/probes/K1191/` only (`git add -f`; 19D's `task3_unlit_arm.md`,
its tools and its raw tables stay as they are - new work goes
beside them and says so). Nothing in `src/`, `test/` or
`scripts/` changes; Runs B, C, D, E and G touch none of these
files.

1. **The model.** Add `gk` to the copied cover model: at arm 1's
   rim pixels in each of the 8 phases (the counts above, 276
   pixel-phases in all), the foreign
   over threads whose silhouettes cross the pixel (from the same
   dump 19D read), their discard's effect on the composite, and
   the modelled colour with `gk` applied. State the rule `gk`
   follows from `cover_lib.mjs`'s header exactly; if the header
   leaves the rule underdetermined, name the readings tried.
2. **The verdict.** Compare the `gk` model against the GPU's
   samples at the same pixels and phases (19D's sampling shape):
   per phase, how many of that phase's pixels read within 2 luma
   of the GPU with `gk`, against without it (19D's composite row:
   4, 5, 9, 26, 26, 26, 13 and 7, of 36, 36, 36, 32, 32, 32, 36
   and 36). `gk` explains the brightness only if the bright
   phases' counts (t0 to t2, t6 and t7, where 19D's "neither"
   row reads 32, 31, 24, 20 and 29) rise to their pixels'
   counts; anything less is "not found", with the
   per-phase table and what was ruled out (the readings of task
   1, and any input that still differs).
3. `npm test` (once, reported green; as a probe-only run's base
   check - no test should change).

### Done and close

**Done when:**

- The `gk` model exists beside 19D's tools, with its rule stated
  from the header (and its readings named, if it tried more
  than one).
- The per-phase table reads with and without `gk` at the same
  276 pixel-phases, and the verdict is one of the two the
  section above names.
- No file outside the write set changed, and `npm test` passes.

**Close lines:**

This close rewrites K1191's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
residual recorded ("ji 147 arm 1's bright GPU colours:
<modelled by gk in <sha8>: <per-phase counts> | not found in
<sha8>: <what was ruled out>>; tables at
`.claude/probes/K1191/`") and the remainder kept, for Claude to
apply by hand. Then:

After the run, update K1208's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1208 --last-commit <sha8> --next "Run F done; Claude reviews it; all runs are in (Run G held)"`

## Run G - K1198: i and j in ij on the approved base (v6.8), only the ligature lookups emptied

**Redrafted (Claude, 2026-11-05).** The first draft ran under
Plc1m, which sat on v7.2's c joins and v7.0's b, v and w exits;
Levi rejected both (K1197, K1119) and kept v6.8, which K863's J3j
rebuilt as the kit's current build (`work33/`). Claude's crops
found J3i's corner rule adds nothing visible on v6.8, so this run
drops Plc1m: it shows i and j in ij on v6.8 and changes nothing
else, then checks the six join pins.

**Chain tag:** 22G · **Ports:** 5930-5939 (unused: this run
renders no page, starts no server and takes no lock).

Work in `.claude/probes/K1198/` (`git add -f`). Nothing under
`.claude/probes/K863/` changes: a Claude stage agent (K863 J3k)
works there now in its own `work34/`, `out34/` and one NOTES.md
entry; never touch them. Probes only; nothing lands in `src/`.

### Read first

- The ledger's K1198 and every `## K1198` entry in
  `docs/ledger_notes.md` (the newest: the corner rule not taken).
- `docs/design/K863_trace.md`, "Judging a look" (binding: the
  eye picks; checks only rule a candidate out).
- `docs/design/K863_cursive_j3j.md`'s Handoff, and only the
  `## K863 base` entry of the kit's NOTES.md (find it with
  Select-String; the file is large): how v6.8 is built, its tools
  (`work33/dbg/*_k863j.*`) and its rerun (`pwsh -NoProfile -File
  work33\dbg\checks_k863j.ps1 [step ...]`, from
  `.claude/probes/K863/trace/`).
- `.claude/probes/K1198/SUMMARY_21G.md` (whole) and
  `ligature_21g.txt`: of the 676 lowercase pairs only ij ligates
  (`ij.jmc`, GSUB lookup 26, filed under `calt`); `calt` off splits
  ij into `i.mod` + `j.jmc` but unmakes every font connector (all
  334 font distances nan, all 234 census strings moved,
  `gates_21g.txt`); 21G's font-path note and its pin test.
- K1212 in the ledger: the kit's census faults (g2 reads
  `angle_deg` where the census writes `ang_deg`; rowsame keys rows
  by word number; the word lists repeat ids). Compare censuses
  with J3j's `same_k863j.py`, which works around the last two, and
  say wherever a fault touches a number you report.

### What is there today

v6.8 shapes ij as the font's ligature `ij.jmc`, and the hand
draws no j there (J3j's Handoff). The bench is J3j's census of
J3i's word list on v6.8 (`census_v68x` in `work33/`: 718 rows, 713
ids, `calt` on). K1112 (re-scoped 2026-11-05) deletes one of the
six pins (og, oe, fo, fv, fr, fs) only when the join without it
draws v6.8's.

### Tasks

Copy into `.claude/probes/K1198/` (names ending `_22g`) every file
this run changes, and run from those copies; read the kit's inputs
in place. At most 4 Python processes, and at most 2 while
`$env:TEMP\claude-perf.lock` exists (another run may be timing);
`python -I` with the kit's venv; `K926_FINAL_E=shear` set and
`K1009_PINS` unset before every solver call, as J3j did (the pin
builds of task 5 aside).

1. **The rule.** Keep `calt` and empty every GSUB
   ligature-substitution lookup (type 4, found by its type, never
   by name, number or pair; an Extension lookup, type 7, counts by
   the type its subtables wrap) in memory with fontTools, so
   shaping ligates nothing while every connector `calt` makes
   still shapes. If that cannot be done cleanly, re-shape only the
   clusters that ligate instead, and say which and why. No
   per-pair data in either form.
2. **The build.** Rebuild v6.8 with the rule (v6.8's template and
   ports, `work28/ports_k990e.json` variant M, as J3j's build) into
   `.claude/probes/K1198/v68_22g/`.
3. **The census.** Census J3i's word list on the rebuild against
   the bench. Gates: every string without ij shapes glyph for
   glyph as on the bench, and every piece of those words is
   identical (`same_k863j.py`: 0 differences); in ij's words only
   i's exit, the i-to-j join and j's pieces may move. ij's join
   solves through the ports (status 0, side at least -0.05 u); if
   the font now draws its own i-to-j connector, measure its font
   distance. Run the census twice: the two runs hash the same. If
   the rule moves anything else, list what moved and stop there
   (do not tune past it).
4. **The ij sheet** (`.claude/probes/K1198/out_22g/`, SVG and PNG
   at J3i's `Png` dpi, every column labelled): ij alone and each
   word of the list that holds it, as the font's ligature, the
   font's unligated ij (if it draws one), v6.8 today and v6.8 with
   the rule. A cell a hand cannot draw says so.
5. **The pins (last; the stop rule may cut it).** For each of the
   six pins, build v6.8 without it (SUMMARY_21G.md's pin test
   shows how to switch one off) and sheet the pair and two words
   that hold it: font, v6.8 (with the pin), without the pin. One
   table: each join's gap, angle, dk and font distance with and
   without its pin.
6. **Gates table.** The bench against the rebuild (pieces, joins,
   hooks, spikes, rough, seams, over budget, side, and the first
   row where the rebuild diverges), with task 3's glyph-for-glyph
   result beside it.

### Done and close

**Done when:**

- The rule is stated (lookups emptied by type, or the
  cluster-only fallback with its reason), with no per-pair data.
- The rebuild matches the bench glyph for glyph and piece for
  piece outside ij's words, and ij solves through the ports
  (status 0, side at least -0.05 u; its font distance measured if
  the font draws the connector), or what moved past ij is listed
  and the run stopped there.
- The two census runs hash the same.
- The ij sheet exists under `.claude/probes/K1198/out_22g/`, and
  the pin sheets and table if task 5 ran.
- Nothing under `.claude/probes/K863/` changed.

**Close lines:**

The report gives K1198's new text for Claude to apply (the item
keeps three lines): what the rule is and its commit, what moved
(ij's words only, or the list), ij's status, side and font
distance, the sheets' folder, and the pins' numbers if task 5 ran.
Claude looks at the sheets; nothing is judged in the run. Then:

After the run, update K1208's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1208 --last-commit <sha8> --next "Run G done; Claude reviews it"`

## Run H - K1210: fire and collapse across junctions, against the pulse

**Chain tag:** 22H · **Suggested ports:** 5940-5949 (the
probe's Vite dev server takes one port in this range).

Claude added this run on 2026-11-05 for Levi's request (K1210).
It runs second, after Run B, so the pulse it compares against is
Run B's. This run changes no `src/`: it measures how the burn
race's fire and collapse mode's collapsing runs pass through a
junction, beside the pulse highlight at the same junctions, and
ends in tables and sheets for Claude's look. Probes only, in
`.claude/probes/K1210/`.

### Read first

- The ledger's K1210 (quoted below).
- The baseline, the pulse at a junction: K1139's stands table and
  helpers (`.claude/probes/K1139/stands_cyc.mjs`; `lib.mjs`: the
  clock pin `setState`, `moveEdge`, the pulse dump), its kymograph
  rows (`kymo_rows_cyc.mjs`, `sheets_cyc.mjs`), and K1201's
  `kymo.mjs` and `joint_gpu.mjs` (the joint step on the GPU).
  Levi's calls on the pulse at a junction (K1139): it splits, it
  runs toward the player, and it goes straight through with no
  dim moment.
- The fire: `docs/design/K114_burn.md` ("The stages"); K290's
  entry in `docs/design/G3G4_sdf_geometry.md` (the burn reverses
  the shaped cut, makes the fans drop an arm and shrinks the
  visibility); K290 stage 3c's desktop driver
  `.claude/probes/K290/stage3c/desk_sheet.mjs` (a burn race's
  link, its fire clock, finding fronts). In `src/`: `runBurnAt`
  in `src/render/fabric_maze_renderer.ts` (and K1187's notes
  beside it), the burnt arm's lobe in
  `src/render/ribbon/explore_gaps.ts`, `kFireEmber` in
  `src/render/arm_strip.ts`, the burn in
  `src/render/ribbon/joinery.ts`, and the fans' arm material
  (`src/render/junction_field.ts`, header).
- The collapse: `src/game/collapse.ts` (K139: every run collapses
  once crossed); the Fragile runs param (K1171:
  `FragileRunsMode` in `src/ui/url_state.ts`, link values in
  `.claude/probes/K1171/rules_probe.mjs`); K139's page driver
  `.claude/probes/K139/page/k139_page.mjs` (reaching a collapse
  with hooks only; its links predate K1171's one param). In
  `src/`: how `fabric_maze_renderer.ts` draws a run as it breaks
  and after (`syncBroken`, `brokenSpans`).
- `.claude/rules/probes.md`: full design links, `phw=0`, pinned
  clocks, headed real-time Chrome, the perf lock for GPU work.

### What is there today

> **K1210** · Fire and collapse across junctions. Levi, 2026-11-05: "I also want to make sure that fire and
> segment collapsing effects also correctly transition across segments--similar to the highlights". Batch 22
> Run H measures both against the pulse (`docs/design/K1208_muse_batch22.md`); a fix follows.

The highlights are the pulse bands K1139 and K1201 tuned at
junctions. Nobody has measured the fire or the collapse there:
whether either one jumps, pops, lags or dims as it passes a
junction's fan is the open question. This run answers it in
numbers and pictures and fixes nothing.

### Tasks

Use ports 5940-5949. GPU frames take the perf lock (a copied
`run_locked.ps1 -Batch` from the K1139 kit); never shoot frames
or time without it.

**Write set:** new scripts, tables and sheets under
`.claude/probes/K1210/` only (`git add -f` the scripts, the
tables, `STANDS.md`, `SUMMARY.md` and the sheets; raw frames stay
untracked). Copy what you reuse from the K1139, K1201, K290, K139
and K1171 kits into it; never edit those kits. Nothing in `src/`,
`test/` or `scripts/` changes; no other run touches these files.

1. **The stands.** Two junctions per effect, one with three arms
   and one with four, with the whole junction in view: the fire
   reaches the junction along one arm and goes on along the
   others; for the collapse, a run that ends at the junction
   collapses. Try K1139's stands first (`stands_cyc.mjs`: fork,
   cross, four), with the burn race or the collapse switched on
   in the same link, and check that the junction's node and arms
   are the same as with the effect off (if the switch moves the
   maze, measure the pulse on the effect's own link instead).
   Where the effect does not reach those junctions, find others
   and say why. Record every stand in `STANDS.md`: the full link,
   the moves and the clock settings, verbatim, so a later run can
   shoot the same frames.
2. **Frames.** Per stand and effect, GPU frames of one crop
   around the junction (its fan and about two lattice units of
   each arm) while the effect crosses it: at least 24 frames at a
   fixed step of the effect's own clock, from the front about one
   lattice unit before the fan to one past it on every arm it
   leaves by. Pin the clock where the kits pin it (`desk_sheet.mjs`
   for the fire, K139's hooks for the collapse); if one cannot be
   pinned, shoot in real time and record each frame's clock
   reading. Then the pulse at the same junction: the same crop
   and frame count across one pass of its band (K1139's
   `setState`).
3. **Kymographs.** For each stand and effect, and for the pulse:
   GPU luma along the centreline of each arm the effect uses (the
   arm in, the fan's centre, each arm out), one row per frame, in
   `kymo_rows_cyc.mjs`'s layout. From each, the front per frame:
   where luma crosses halfway between the two sides' levels (for
   a collapse that fades rather than sweeps, the strip's and the
   fan lobe's luma per frame instead; say which it is).
4. **The measures,** per stand, effect and arm out, and the same
   for the pulse at that junction:
   - **Jump:** the front's largest one-frame advance inside the
     fan's footprint, over its median one-frame advance on the
     arms.
   - **Pops:** frames in which more than 16 pixels of the fan's
     footprint change by more than 32 luma at once.
   - **Lag or lead:** frames from the front reaching the fan's
     rim on the arm in to it leaving the rim on each arm out,
     against the frames the arms' median speed predicts for that
     distance (for a fade, the frames between the strip's and the
     fan lobe's half-way points).
   - **Dim or bright moment:** frames where the fan's mean luma
     leaves the range of the two arms beside it.
5. **Verdicts.** Per stand and effect, "like the pulse" when every
   measure is within the pulse's at that junction: jump at most
   the pulse's plus 0.5, no more pops than the pulse, lag within
   one frame of the pulse's, and no dim or bright moment the
   pulse lacks. Otherwise "differs", naming the measure, the arm
   and the frames. These numbers only flag a junction for
   Claude's look; they never call a look right.
6. **Sheets.** One PNG per stand and effect: 8 to 12 frames of the
   crop across the crossing at full size (nearest-neighbour 2x),
   the kymograph beside them, and the pulse's frames and
   kymograph at the same junction under them, each frame labelled
   with its clock reading.
7. **`SUMMARY.md`:** the stands, the measures' table, the
   verdicts, any stand that could not be built and why, and the
   perf-lock times.
8. `npm test` (once, reported green; no test should change).

### Done and close

**Done when:**

- Each effect has two stands (or the report says why it has
  fewer), recorded verbatim in `STANDS.md`.
- The measures' table covers each stand, effect and arm out
  beside the pulse's at the same junction, and each stand has a
  verdict.
- Every stand has its sheet, and `SUMMARY.md` lists them.
- No file outside the write set changed, and `npm test` passes.

**Close lines:**

K1210 stays open: Claude looks at every sheet, and a fix stage
follows wherever a junction differs. This close rewrites K1210's
text (`ledger.mjs` has no command for it): the report must give
the item's new text, at most three lines of 110 characters,
keeping Levi's request in short and recording the result ("Run H
(<sha8>): fire <like the pulse at <n> of <m> junctions | differs
at <stand>: <measure>>; collapse <the same>; sheets at
`.claude/probes/K1210/`"), for Claude to apply by hand. Then:

After the run, update K1208's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1208 --last-commit <sha8> --next "Run H done; Claude reviews it, Run C next"`

## Left out on purpose

Read in Run A's order; these are the candidates it names that
did not fit. Steps (4) and (5) gave nothing past Runs B, C, D
and G: "Next, in order" holds nothing above K1204 but K1207
and K1209, and Residuals holds nothing above K1204 but K1198,
K1191 (Run F) and K1205, so nothing else in either section was
read, as Run A directs.

### Step 1 (junction work), past Run F

- **K1097's next stage** - not a candidate for this draft.
  Run A makes it one only once Claude has run the Pixel batch
  (`.claude/probes/K1040/s3/out/phone_table_s3f5.md` and
  `out/split_s3f5.md`); neither file exists in this checkout
  (checked with `Test-Path` for this draft), so there is no
  Pixel reading to brief the lever from. It waits for the
  phone; Claude runs `s3f5_gate.ps1 -SkipDesktop` first
  (K1097's handle).

### Step 3 (Claude's picks), after the six filled

- **K1205's first step** - the warm Pixel's 30 fps at rest at
  0 moves and at the finish, while 7 moves holds 60 (its
  notes). On the desktop, in fabric at rest at 0, 7 and 13
  moves (the phone pass's link and walk,
  `scripts/phone_pass/walk.mjs`), record what keeps each frame
  drawing - `__knotLoop()`'s flags over 10 s (which visual flags
  are set, empty frames - `src/app/loop_flags.ts` and
  `src/app/frame_loop.ts` read as the flag source), the frame's
  JS (`__knotPerf()`) and GPU per pass
  (`src/app/probe_hooks.ts`'s perf pull), under the perf lock.
  Its table names what the frame at 0 moves draws or runs that
  one at 7 moves does not. Probes only, in
  `.claude/probes/K1205/`; no fix in that step. Claude runs the
  warm-phone pass after. It does not fit: step 3 comes after
  junction work and cursive, and those fill the six.

These items wait for later batches (K1097's stage once its
Pixel batch exists, then K1205); no run here read their code
beyond what the candidates above state.

### Skipped lanes (as Run A names them)

- The cursive's next letters and c's joins (K863, K1112, K1119
  and K1197) wait on Levi. Run G takes only K1198's next piece,
  which depends on neither answer; it works in
  `.claude/probes/K1198/` and lands nothing in the ports.
- K1139's S6, the route pulse, follows K1140's Glimpse design,
  which waits on Levi's picks.
- K1190 and K1200 (Levi's look calls on the junction light),
  K647, and every other item waiting on Levi: no run takes or
  answers any of them.
- Physics (the simulation), phone passes, items In progress
  other than K1097's next stage, K144 and K1168 (Claude writes
  their briefs; deploying them needs the Google OAuth client,
  Cloudflare Worker and D1 database from Levi), K1181 (the
  laptop's checkout), and anything under
  `.claude/worktrees/` (runs copy what they need from the
  K1139 kit's tracked tools into their own folders).

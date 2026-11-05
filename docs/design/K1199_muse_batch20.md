# Muse batch 20 (K1199)

Claude starts these runs through Paseo, one run at a time, after
batch 19 (`docs/design/K1192_muse_batch19.md`, K1192) was reviewed
and closed. Each run is a fresh Muse agent that reads this brief,
does its run's tasks, and stops. Claude reviews each run on master
afterwards and closes K1199.

This was a drafting run (Run A,
`docs/design/K1199_muse_batch20_run_a.md`), so the batch's runs are
B to G in the drafting brief. Six runs fit (B to G below); the
chain tags are `20B` to `20G`, one run at a time. Batch 20 uses
ports 5760-5819, one range of ten per run.

Runs came from the candidates in Run A's order:

- (1) Junction work (Levi, 2026-11-04: "perfecting all junction
  and cursive work is always my main priority"), one bounded stage
  each: K1139 S5 fits (Run B, with K1182's removal folded into it,
  as Run A directs), K1202 fits (Run C), K1186's next step fits
  (Run D), K1201 fits (Run E) and K1196 fits (Run F). K1191's
  open residual is the seventh junction piece; it does not fit
  ("Left out on purpose" below says why).
- (2) Cursive work: one piece of K1198 that does not depend on
  K1197 fits (Run G: the untried Plc1m and ij's missing port
  solve, as one table against v7.2 and v7.2b). K1193 and the
  rest of K1198 do not fit there.
- (3) Claude's picks from batch 19's reviews (the next bounded
  piece of K782, after 19E, and of K711): neither fits; no run
  is left for them in any case.
- (4) "Next, in order", items numbered above K1191: K1202,
  K1201 and K1196 are Runs C, E and F from step (1). Nothing
  else there is above K1191, so nothing below that was read
  (Run A directs it; batch 19's draft left the section read to
  K1188).
- (5) Residuals numbered above K1191, except the ones Run A's
  list names: K1193, K1194, K1195 and K1203 were read; none
  fits ("Left out on purpose" below says why for each). K1198
  is Run G from step (2).

One item ends outright: K1182, once Claude reviews Run B's
removal. Run B's S5 half stops at its look sheet with the switch
defaulting to today's picture: Claude judges the sheet and flips
the default, and K1139 stays open either way. Runs C, D, E and F
change no `src/` at all and end in tables, crops or a harness;
Run G changes nothing under `.claude/probes/K863/` and ends in a
table. A run that stops keeps its item open (batch 8 rule 1).
Close lines that rewrite an item's text give the new text in
their reports, for Claude to apply (`ledger.mjs` has no command
that rewrites an item's text, so a rewriting close says so, as
the drafting brief requires).

Every task is decided by a unit test, a desktop probe, a dry
run or a measurement table below, and none needs Levi or a
phone. Run B changes what the player sees only behind its
switch; Runs C to G change no picture at all.

No two runs touch one file ("How to work", rule 3). Read the
whole brief before your first command.

## How to work

Batch 19's "How to work" applies unchanged: read it in
`docs/design/K1192_muse_batch19.md` (it sends you on to batch
18's, batch 17's, batch 16's, batch 15's, batch 8's ten rules
and the shared process in `docs/design/K1050_muse_week.md`)
before anything else. Read K1199 wherever it, or a page it
sends you to, says K1192, K1189, K1184, K1178, K1169 or K1131;
the chain tags are 20B to 20G, and Claude starts them one at a
time. Batch 20 uses ports 5760-5819; each run below names its
own range. After each run, update K1199's handle (the next run
in B, C, D, E, F, G order, or, after G, that all the runs are
in and Claude reviews and closes K1199).

GPU probes and timings hold the machine's perf lock (each
harness's `run_locked.ps1`). Say so in each such run's tasks,
and never time without it.

## Run B - K1139 S5: straight through your own junction, behind a switch (K1182 folded in)

**Chain tag:** 20B · **Suggested ports:** 5760-5769 (the probe's
Vite dev server takes one port in this range).

This run builds S5 behind a switch that defaults to today's
picture, proves it by unit tests that pin the CPU twin and the
GLSL equal, re-shoots `q3_head` with the switch off and on, and
stops there: Claude judges the sheet and flips the default. The
golden pins and the `pre_g23` fixtures stay unmoved while the
switch is off. Folded into this run, as Run A directs, is
K1182's removal (task 7, after the sheet): 19C's biarc rim, its
flag and their tests come out, and the file's header says why
beside K859's Hermite. The flag was off, so the removal moves
no picture and no pin.

The switch's form (picked here, as Run A directs, from how
batch 19's Run C did it): a module flag in
`src/render/paint_math.ts` itself, exported beside `kPulseCrest`
with a setter the probe calls, defaulting to today's picture.
The lead lives in `paint_state.ts`'s tick, which reads the flag
each tick; the ramp dip lives in `kPulseCrest` and its GLSL
twin, which read a head-carry uniform (below). A panel param is
the wrong form here, for Run C's reason: it would append to
`CODEC_PARAMS` and move the codec pin for a look nobody has
judged.

### Read first

- `docs/design/K1139_pulse_junctions.md` section 2.6 (your own
  junction: today's lead and dip, and what "straight through,
  without the dim moment" means), section 5's S5 entry, section
  6's Q3 (Levi answered "straight through, without the dim
  moment"), section 4.3 (the sheets) and the appendix (how
  `q3_head` was cropped: `out/{fixed,lead0}/cross_t<k>_n.png` at
  363,165, 160 CSS px, then 1.6x, frames 0-7). Section 5 says S5
  "touches `kPulseV` and its GLSL twin, so the pre_g23 fixtures
  re-freeze (as in S4)"; Run A overrides that while the switch
  is off: the fixtures stay frozen, and only a later default
  flip re-freezes.
- `src/render/paint_math.ts` at `kPulseCrest` (search the name;
  read its K480/K1139 header comment too): brightness at global
  distance `dG` is `min(1, (floor + bump * 0.9) * endWin) *
  fadeIn * reachWin`, with `bump = max(0, 1 - dist /
  CREST_WIDTH) * min(1, dC / CREST_RAMP) * bumpScale`. The
  `min(1, dC / CREST_RAMP)` term is the dip: within
  `CREST_RAMP` (0.5 world) of a crest's start the train is
  dimmed, the head included. `kPulseV`, `kPulseV2` and
  `kPulseBandV` all read this one field. Read `KUniforms` in
  the same file for the uniform mirrors (the optional-uniform
  precedent is `uKTele?`: declared only where needed, absent =
  0).
- `src/render/paint_glsl.ts` at `PULSE_CREST_GLSL`:
  `kPulseCrestK` is the GLSL twin (`bump` at its `CREST_RAMP`
  line), `kPulseCrest` and `kPulseCrestQuiet` its wrappers;
  the fan shader includes this chunk without the paint items.
  CPU and GLSL must move together.
- `src/render/paint_const.ts`: `CREST_RAMP: 0.5`,
  `PULSE_OUT_LEAD: 0.3` and `PULSE_RIDGE_FADE = 0.5`. The lead
  constant keeps its value under both switch settings (see
  Tasks); do not edit it to 0.
- `src/render/ribbon/paint_state.ts` at `tickPaintPalette`:
  `U.uKPulse[0] = modS(clock * PULSE_SPEED)` and
  `U.uKPulse[1] = modS((clock + PULSE_OUT_LEAD) *
  PULSE_SPEED)` - the outward crests lead the inward ones by
  0.3 s (0.48 world at 1.6 world/s). `paintPulses` in the same
  file holds the declared `PulseArm`s (`inward`, `dist0`; the
  arrival arm is the inward arm at `dist0` 0).
- `src/render/pulse_path.ts` (whole): the lit tree. Your own
  junction gets no band ("its hand-off is S5's"), so the dip
  and the lead are the head's whole story. `arrival` is the
  walk edge you came by (-1 before the first move); arms at
  the head carry `parent` -1, and the arrival arm is the one
  with `inward` set there.
- `test/render/paint_gameplay.test.ts`: the `kPulseV` pins
  against the frozen `pre_g23` pass (`test/render/fixtures/
  pre_g23`), and the `kPulseBandV` / `kPulseV2` describes
  (S3a, S4, S4b) whose shapes your new cases follow. With the
  switch off your code must pass every one of these untouched.
- `test/render/k320_slim.test.ts` at its char budgets:
  `SECTION_FRAG` 59,050, `SECTION_EXPLORE_FRAG` 75,450,
  `STRIP_FRAG` 34,300, `JUNCTION_FRAG` 40,350 (40,342 measured
  at S4b: 8 left). If your GLSL outgrows a budget, task 5
  applies.
- `.claude/probes/K1139/strips.mjs` lines 1-25 (its `STANDS`
  table and the shared link `k111&am=instant&fw=0&snd=none&
  phw=0`) and its `K1139_LEAD0` block: the plan's lead-0 look
  was shot by forcing `U.uKPulse[1] = U.uKPulse[0]` after each
  tick. Your sheet shoots the real switch the same way, not
  that forcing. `.claude/probes/K1139/lib.mjs` (`PIN`,
  `setState`, `dumpPulses`) and `.claude/rules/probes.md`
  (full design links, `phw=0`, pinned clocks, headed real-time
  Chrome, the perf lock for GPU work).
- For task 6: `src/render/ribbon/rim_curve.ts` (whole) and
  `test/render/rim_curve.test.ts` (whole): the header's K859
  Hermite paragraph ("It stays out"), the K1182 flag
  (`rimCurveBiarc`, `setRimCurveBiarc`), `ArcSeg`,
  `arcFromStart`, `arcFromEnd`, `arcPointAt`, `biarcPoints`,
  the flag branch in `rimCurvePoints`, and the test's
  `rimCurvePoints biarc flag (K1182)` describe. The two
  pre-K859 branch pins above that describe stay.

### What is there today

> **K1139** · Choice pulses across junctions (Levi 2026-11-03: "we have to make pulses animate correctly
> across junctions"). S1 to S4b landed (S4b 88e1039d; the Pixel check waits for the phone); Levi's looks K1190
> and K1200, leftovers K1191 and K1201-K1203. S5 (Muse batch 20) and S6 next. Notes: `docs/ledger_notes.md`.

> **K1182** · Remove 19C's biarc rim and its flag `rimCurveBiarc` (`src/render/ribbon/rim_curve.ts`), saying
> why in the header: the quadratic reads smooth on Run C's and Run F's crops and the biarc grows stepped
> notches at all four targets (Run F 3ddaec22: a G1 rim leaves the corridor or turns tight). Muse batch 20.

At your own junction today the outgoing crests leave 0.3 s
before the incoming crest arrives (`PULSE_OUT_LEAD`), and both
are dim within 0.5 world of the head (`CREST_RAMP`, under the
marker): the plan's section 2.6 measures the head dim for
about 0.6 s at lead 0, which the lead roughly covers. Levi's
Q3 answer takes both away where a crest carries through the
head (an arrival exists: the incoming crest becomes the
outgoing one), and keeps the ramp where a crest is born (no
arrival: before the first move, the head is the reach's
start). Every other junction already carries through with no
lead and no head dip; S5 makes the head the same rule.

The biarc (19C, `ed14f2c9`) sits behind `rimCurveBiarc`,
default off, in `rim_curve.ts`'s fallback branch only. Run F
(`3ddaec22`, `.claude/probes/K1182/exam/`) found what cuts its
stepped corners; Claude judged the sheet: the quadratic reads
smooth and the biarc does not. The flag off is today's
picture, so removing it changes nothing drawn.

### Tasks

Use ports 5760-5769. The sheet and the cold compiles take the
perf lock (`.claude/probes/K1139/run_locked.ps1 -Batch`,
copied if your harness needs its own); never time without it.

**Write set:** `src/render/paint_math.ts` (`KUniforms`, the
flag and `kPulseCrest` only), `src/render/paint_glsl.ts`
(`PULSE_CREST_GLSL` only), `src/render/paint_model.ts` (the
`knotUniforms` group only), `src/render/ribbon/paint_state.ts`
(`tickPaintPalette`'s pulse uniforms only),
`test/render/paint_gameplay.test.ts` (cases added),
`test/render/k320_slim.test.ts` (a budget line and its comment
only, if task 5 fires), new probe files under
`.claude/probes/K1139/` (`s5_*`, `git add -f`) and their
output under `.claude/probes/K1139/out/s5/`; then, for task 6
only, `src/render/ribbon/rim_curve.ts` and
`test/render/rim_curve.test.ts`. Nothing else; Runs C to G
touch none of these files. If the head-carry signal needs a
file outside this set, stop and report what it would change.

1. **Before table (pure, unmodified source).** In
   `paint_gameplay.test.ts`'s fixture manner (its `uniforms`
   helper builds `uKPulse` with the 0.3 lead), state today's
   head numbers in the report: at pinned clocks, the outward
   crest's phase lead over the inward one at the head (0.48
   world), and `kPulseCrest`'s bump factor at `dG` 0, 0.1,
   0.25 and 0.5 on a head arm (the ramp's dip: 0 at the head,
   full at 0.5). That table is the before table.
2. **The switch.** In `paint_math.ts`, a module flag beside
   `kPulseCrest` (a name in the file's style, e.g.
   `pulseHeadPass`) and its setter, defaulting to today's
   picture (off). With the flag off, every value in task 1's
   table and every existing pin reproduces bit for bit. The
   header comment gains the flag's sentence: what it selects,
   that it defaults to today's picture, and that Claude flips
   it after judging the sheet.
3. **Lead and dip, CPU and GLSL together.** A head-carry
   uniform: `uKHead` in `KUniforms` (optional, absent = 0, the
   `uKTele?` precedent), in `knotUniforms`' group in
   `paint_model.ts`, and in the shared uniforms GLSL that
   precedes `PULSE_CREST_GLSL` in every program that includes
   it. Each tick, `tickPaintPalette` writes it: 1 exactly when
   the flag is on and an arrival exists (an inward
   `paintPulses` arm at `dist0` 0), else 0. The same tick
   selects the effective lead: the flag on gives lead 0
   (`uKPulse[1]` reduced exactly as `uKPulse[0]` is), the flag
   off gives today's `PULSE_OUT_LEAD` line unchanged;
   `PULSE_OUT_LEAD` itself is not edited. In `kPulseCrest`
   and in `kPulseCrestK`, when the head-carry uniform reads 1
   the bump's ramp factor is 1 (no dip); otherwise it is
   today's `min(1, dC / CREST_RAMP)`. No other term moves:
   bands (the head has none), two-ended arms, the quiet field
   (`bumpScale` 0) and the High-contrast branch read as today
   under both settings.
4. **After table + tests.** New cases in
   `paint_gameplay.test.ts` pin: flag off reproduces task 1's
   table and the frozen `pre_g23` values (the existing pins,
   rerun unedited); flag on with head-carry 1 gives no dip at
   `dG` 0 to 0.5 (the bump factor 1 where today's table reads
   under 1) and an outward crest in phase with the inward one
   at the head (their `kPulseCrest` values at the head match
   to 1e-9 over one period's clocks); flag on with head-carry
   0 (no arrival) equals today's values exactly. A text pin
   in the same file (the `k320_slim` source-scan manner)
   slices `PULSE_CREST_GLSL`'s `kPulseCrestK` and matches the
   head-carry branch there with the same `CREST_RAMP` term,
   so a branch in only one twin cannot pass. Rule 9: in a
   scratch change make the CPU branch read today's ramp
   always; show the no-dip case fails, then undo it.
5. **Budgets and cold compiles.** Measure every fragment
   length `k320_slim.test.ts` budgets, on the edited tree. If
   one is over its budget, raise that budget to the measured
   length with a comment in S4/S4b's manner (what the change
   adds, measured here) and say so in the report; if none is
   over, leave the file untouched and say so. Then, under the
   perf lock, run K307's cold compile
   (`.claude/probes/K307/`, `trace_intro.mjs`, as S4b ran it
   in `.claude/probes/K1139/batch_s4b_k307b.txt`): the run's
   build against its base (the master commit this run started
   from), interleaved, at least two runs each; the run's mean
   time to first visible must sit inside the base's spread.
   Report both spreads and the means.
6. **The sheet (desktop probe).** Copy the `cross` stand's
   link and moves verbatim from `strips.mjs` (`k111&am=
   instant&fw=0&snd=none&phw=0`, moves 0, 246, 82, 83, 199;
   head `node_116`, rule 11: name anything you change), serve
   on a port in range with the kit's private-cache config, pin
   the clocks as `lib.mjs`'s `PIN` does, and shoot the head's
   8 frames of one period (t = 100 + k * period / 8) twice:
   flag off, then flag on (the setter called in the page
   through a `/src` import, the paint tick forced the way the
   renderer's own tick forces one, the same pinned state both
   times, a same-build flag-off/flag-off control pair first).
   Crop each frame at the head as the plan's appendix crops
   `q3_head` (the head centred, 160 CSS px, then 1.6x) and lay
   one sheet, off above on, under
   `.claude/probes/K1139/out/s5/`. State in the report, from
   the frames, whether the on row's incoming crest reaches the
   head as the outgoing one leaves it, with no dim moment
   under the marker.
7. **K1182 folded in: remove the biarc.** In
   `rim_curve.ts`: delete `rimCurveBiarc`, `setRimCurveBiarc`,
   `ArcSeg`, `arcFromStart`, `arcFromEnd`, `arcPointAt`,
   `biarcPoints` and the flag branch in `rimCurvePoints`, so
   the fallback branch is the quadratic again. In the header,
   beside K859's Hermite paragraph, add why the biarc stays
   out: on Run C's and Run F's crops the quadratic reads
   smooth and the biarc grows stepped notches at all four
   targets (Claude's judgment); the flank's tangent points
   away from the corner on at least one side of every wedge
   (K859's count, 392 of 392), so a G1 rim leaves the
   corridor, the triangle tipA-corner-tipB, or turns on a
   tight arc (Run F, `3ddaec22`,
   `.claude/probes/K1182/exam/`). In
   `test/render/rim_curve.test.ts`: delete the
   `rimCurvePoints biarc flag (K1182)` describe and its
   imports; the pre-K859 pins above it pass unedited. The
   probes under `.claude/probes/K1182/` stay as they are
   (they need a checkout from before the removal); do not
   touch them. The flag was off, so the golden snapshots and
   every pin stay unchanged: say so in the report, with the
   `npm test` line that proves it.
8. `npm test`.

### Done and close

**Done when:**

- Flag off: task 1's table and the frozen `pre_g23` pins
  reproduce bit for bit, and the golden pins are unmoved.
  Flag on with an arrival: no dip at the head and the outward
  crest in phase with the inward one (task 4's pins); flag on
  without an arrival: today's dip kept exactly.
- The scratch change fails the no-dip case (rule 9), the
  shader budgets read as task 5 states (raised only to a
  measured length, with its comment), and the run's K307 mean
  sits inside its base's spread.
- The `q3_head` sheet exists under
  `.claude/probes/K1139/out/s5/`: 8 frames, flag off above on,
  the control pair beside them, at one pinned state.
- The biarc, its flag and their tests are gone; the header
  says why beside K859's Hermite; `rim_curve.test.ts`'s
  pre-K859 pins pass unedited.
- `npm test` passes.

**Close lines:**

Claude to mark K1182 done once Run B is reviewed:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K1182 --commit <sha8> --what "19C's biarc rim, its rimCurveBiarc flag and their tests removed; the header beside K859's Hermite says why it stays out (the quadratic reads smooth, the biarc notched at all four targets)"`

K1139 stays open (S5's switch defaults to today's picture;
S6 and the Pixel batch remain). The report gives K1139's new
`next` text for Claude to apply, with S5 recorded ("S5 built
behind its switch in <sha8>, default off; sheet at
`.claude/probes/K1139/out/s5/`; Claude judges it and flips the
default"). Then:

After the run, update K1199's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1199 --last-commit <sha8> --next "Run B done; Claude reviews it and judges the sheet, Run C next"`

## Run C - K1202: attribute cyc e210's kymograph step at columns 20 to 21

**Chain tag:** 20C · **Suggested ports:** 5770-5779 (the probe's
Vite dev server takes one port in this range).

This run changes no code anywhere: it attributes the step at
columns 20 to 21 of cyc e210's kymograph, the same before and
after S4b, and ends in a table and a cause, or "not found" with
what was ruled out. A fix is a later stage behind a switch; this
run builds none. It copies the tools it needs from
`.claude/probes/K1139/` into `.claude/probes/K1202/` and changes
nothing under `.claude/probes/K1139/`.

### Read first

- `docs/design/K1139_s4b_ridge_fade.md`, its Handoff: the
  Numbers table (the col 53 to 54 step S4b fixed, and the
  second step this run attributes), the Crops entry for
  `crops/kymo_steps.txt`, and Open item 2 ("a band-territory
  edge inside node_218's fan, where e210's centerline passes
  from another band's pixels to the e39->e210 band's",
  a hypothesis, untested).
- `.claude/probes/K1139/out/s4b/crops/kymo_steps.txt`
  (untracked in the main checkout; read it there): cyc e210
  on S4 and on S4b, column-to-column luma jumps over cols
  15..60 - the 40 (S4) / 43 (S4b) entry at the fifth position
  is the step, against 0-12 around it. S4b's Handoff reads it
  at columns 20 to 21, up to 40.2 luma on S4 and 42.9 on S4b,
  in 28-34 of 72 rows. `docs/design/K1139_s4_cycles.md`'s
  Handoff gives the kymograph's construction (`sheets_cyc.mjs`:
  72 rows over 1.5 periods, the drawn centreline through the
  fan).
- `.claude/probes/K1139/stands_cyc.mjs` (whole): the `cyc`
  stand - `k111&am=instant&fw=0&snd=none&phw=0`, moves 0, 246,
  82, 83, 199, 150, 151, 38, 155, 211, head `node_221`, its
  choice e210 lit from both ends, ridge at dG 2.18. Any stand
  this run reuses is copied with its link and moves verbatim
  from this source (rule 11), and the report names anything
  it adds or changes.
- The tools, in `.claude/probes/K1139/` (read, then copy):
  `dump_cyc.mjs` (its PROBE GOTCHA header: dump from a dev
  server started after the last source edit), `table_cyc.mjs`
  (its BAND EXTENT check: band against ribbon over the fan's
  whole extent), `sheets_cyc.mjs` and `kymo_rows_cyc.mjs` (the
  kymograph and its rows), `lib.mjs` (`dumpPulses`, `PIN`).
- `src/render/paint_math.ts` at `kPulseBandV` and `kPulseV2`
  (read only): the band's far side reads the arm's own
  two-ended field past its ridge; at the joint and inside the
  fan the candidates are the ridge factor, the gA/gB train
  switch, and the band-to-ribbon hand-off. `src/render/
  junction_field.ts`'s band loop (read only, search
  `kPulseBandV`'s GLSL twin `kPulseCrest`): which band's
  crest a fan pixel takes (the nearest band, since S3b).
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1202** · A step at columns 20 to 21 of cyc e210's kymograph (up to 43 luma), the same before and after
> K1139 S4b, unattributed (a guess: two bands meeting in node_218's fan); attribute it with probes
> (`.claude/probes/K1139/out/s4b/crops/kymo_steps.txt`, untracked)

S4b fixed the step at the band's reach (columns 53 to 54:
49.6 luma on S4, 4.4 on S4b) and left this one standing on
both builds. It sits inside node_218's fan, about a fifth of
the way along e210 from that junction (the kymograph's columns
are 0.01 world each). The CPU table's BAND EXTENT check reads
no step there: at the junction point and over the fan's extent
the band and the ribbon agree to 0.0000-0.0006 on S4b. So the
step is either a GPU pixel matter the CPU twins do not model
(which band's pixels the centreline samples on either side of
the column), or a centreline matter (the sampled path crosses
from one band's territory to the other's, or from fan to
ribbon, at that column). This run tells which.

### Tasks

Use ports 5770-5779. GPU work takes the perf lock
(`.claude/probes/K1139/run_locked.ps1 -Batch`, copied into
your harness if it needs its own); wait inside that one
command, and never time without it.

**Write set:** copies and new scripts under
`.claude/probes/K1202/` only (`git add -f`), and their output
tables and crops there. Nothing under
`.claude/probes/K1139/`, no change to `src/`, `test/` or
`scripts/`; Runs B, D, E, F and G touch none of these files.
A copied tool keeps its header's stand links verbatim
(rule 11); where a copy must change (its output path, its
port), the copy's header names the change.

1. **Setup and the step, re-measured.** Copy the tools Read
   first names into `.claude/probes/K1202/`. On the `cyc`
   stand (link and moves verbatim from `stands_cyc.mjs`),
   retake the dump and the kymograph on today's master and
   re-read the step: its column, its largest luma jump and
   in how many of the 72 rows it tops 10 luma, beside S4b's
   numbers (42.9, 28-34 of 72). If the step does not
   reproduce on master, say so with the fresh table and stop
   (batch 8 rule 2); do not attribute a step that is not
   there.
2. **The CPU field along the centreline.** From the dump,
   evaluate the CPU twins (`kPulseBandV` on each band,
   `kPulseV2` on e210) along e210's drawn centreline through
   node_218's fan, at the kymograph's own columns and clocks,
   and state the largest column-to-column step the CPU field
   has at columns 19 to 22, with the term that makes it (the
   ridge factor crossing, the gA/gB switch, a band's tau
   end). A CPU step at the same column attributes the step
   to that term; a smooth CPU field (under 1 luma-step in the
   sheet's units) sends the run to task 3.
3. **The GPU pixels either side.** Sample debug view 5's G
   and the normal view along the same centreline (the plan's
   P8 shape, `.claude/probes/K1139/`'s `px_s4.mjs` manner,
   copied): at columns 18 to 23, which band or ribbon covers
   the sampled pixel, its record and its G against the CPU
   value from task 2. Say whether the sampled path changes
   covering band, record or fan/ribbon side at the step's
   column, and whether each side's G matches its own CPU
   field (a territory edge the two fields disagree across),
   or one side departs from its field (a drawing matter in
   that band).
4. **The table.** `.claude/probes/K1202/` holds the copies,
   the fresh dump's tables, the re-measured kymograph rows
   and one summary: the step's numbers on master, the CPU
   field's step at the same columns, the covering on either
   side, and the cause (named to its band, term or territory
   edge), or "not found" with what was ruled out. Run `npm
   test` once and report it green, so the batch's base is
   known; no test should change.

### Done and close

**Done when:**

- The step is re-measured on master (or its absence is
  reported with the fresh table, and the run stops there).
- The CPU field's step at columns 19 to 22 and the GPU
  covering either side of column 20 to 21 are both in the
  table, and the summary ends in a cause or "not found" with
  what was ruled out.
- Nothing under `.claude/probes/K1139/` changed, no file
  outside `.claude/probes/K1202/` changed, and `npm test`
  passes.

**Close lines:**

This close rewrites K1202's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
attribution recorded ("cyc e210's cols 20-21 step is <cause>,
measured <numbers> at `.claude/probes/K1202/`; a fix is a
later stage behind a switch") or its "not found" with the
ruled-out list, for Claude to apply by hand. Then:

After the run, update K1199's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1199 --last-commit <sha8> --next "Run C done; Claude reviews it, Run D next"`

## Run D - K1186 next step: crop the five worst drawn flips for Claude to judge

**Chain tag:** 20D · **Suggested ports:** 5780-5789 (the probe's
Vite dev server takes one port in this range).

This run changes no code anywhere: it crops the five worst
drawn flips that 19B counted, at 3x, the frame before and
after each flip and the same frames with the choice held, on
one sheet for Claude to judge whether they pop. It stops at
the sheet: no hold-and-fade fix is built or briefed here. It
works under `.claude/probes/K1186/` (19B's own folder, whose
step PNGs were deleted after tabulation and come back by
rerunning its batch) and changes nothing in `src/`, `test/`
or `scripts/`.

### Read first

- The ledger's K1186 (quoted below) and
  `docs/ledger_notes.md`'s `## K1186` entry (Claude's reading:
  "the drawn median sits under the control's noise floor, so
  the case for the hold-and-fade fix rests on whether the few
  large flips pop at their junction. Crop the five worst
  drawn flips (before and after, 3x) and judge them before
  briefing the fix.").
- `.claude/probes/K1186/flips.mjs` (whole): its header names
  the stands (rule 11: `seed3` is `?3&am=instant&snd=none&
  fw=0&phw=0`; `fat11` is `?11&am=instant&snd=none&fw=0&
  phw=0&tw=0.72&cr=4.5`, this run's addition named there),
  its drag path per target junction (start on arm0 at 0.85
  world from the centre, 8 steps to arm1 at 0.85 world, 8
  steps back; sample points recorded in the dump), its
  per-rebuild sampler (each arm's `top`/`dives`, each wedge's
  layer, each arm's reach bound, recomputed from the live
  `underWindows`), and its drawn-ink pass (crop diff minus
  the non-flip median minus the control median). The step
  PNGs it wrote (302 MB) were deleted after tabulation;
  rerunning it is how they come back.
- `.claude/probes/K1186/out/summary.md` and
  `out/summary.json` (19B's tables): drags flip about 1/s
  (seed3 37 over 570 rebuilds, fat11 44 over 392); drawn ink
  median 0 for every kind on both stands, worst single 4314
  px (seed3, a reachBound flip, n = 1); the same-build
  controls' medians are 4484 px (seed3) and 8641 px (fat11),
  the noise floor the drawn numbers are corrected against.
- `src/render/ribbon/joinery.ts` (read only): the choices
  themselves - the per-arm vote, the per-wedge layer and
  `armReach` (search the names; batch 19's Run B Read first
  maps them). This run reads them only to name each flipped
  piece; it adds no hook and changes no file there.
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1186** · Fill look: hold junction pieces' per-frame choices (fillet layer vote, armReach clamp) while the
> knot moves, fading them on change, same picture at rest (K1179 review 5c). Counted (19B, f657ac15): drags flip
> about 1/s, drawn ink median 0, worst 4314 px. Next, Muse crops the worst flips and Claude judges whether they pop, before any fix. Notes: `docs/ledger_notes.md`.

19B counted the flips and the ink each moves, and the drawn
ink's median is zero: most flips draw nothing the control
does not. The hold-and-fade fix (remember each piece's choice
while the knot moves, fade it on change) is only worth its
stage if the few flips that do move ink visibly pop at their
junction. Those are the five this run crops. Nothing about
the fix's design is decided here; the sheet is the decision's
input, and Claude judges it.

### Tasks

Use ports 5780-5789. GPU work takes the perf lock
(`.claude/probes/K1186/run_locked.ps1 -Batch`, already in the
folder); wait inside that one command.

**Write set:** new scripts, crops and the sheet under
`.claude/probes/K1186/` only (`git add -f`; 19B's `flips.mjs`,
its tables and its raw dumps stay as they are - rerun outputs
go to a new subfolder the report names). No change to `src/`,
`test/` or `scripts/`; Runs B, C, E, F and G touch none of
these files.

1. **Name the five (from 19B's own data first).** Rank the
   flips 19B counted by drawn ink, from `out/summary.json`'s
   per-flip records and the raw dumps (`raw_seed3.json`,
   `raw_fat11.json`): the corrected drawn ink (crop diff
   minus the non-flip median minus the control median, as
   `flips.mjs` computes it), worst first, each named by
   stand, script, junction (`fieldProbe.center` and record,
   as 19B names them), piece kind and rebuild. That ranking
   is the run's stand list; state it in the report. If fewer
   than five flips read above the control's noise on either
   stand, say so, and fill the sheet's remaining rows from
   the geometric-ink ranking (19B's other measure), labelled
   as such - a sheet of five with its ranking rule stated
   passes, a silent substitution does not.
2. **Re-shoot each flip (desktop probe).** Replay its stand
   and script verbatim from `flips.mjs` (link, drag path and
   sample points from the dump; rule 11), at the same pinned
   state, and shoot the flipping junction's crop at the
   rebuild before the flip and the rebuild after it, 3x.
   Beside each pair, the held pair: the same two rebuilds
   with the flipped piece's choice held at its before value.
   Hold it probe-side only - wrap the rebuild in the page
   (the `flips.mjs` sampler's shape: it already wraps
   `rebuildFillets` to read the choices) so the piece whose
   choice flipped is drawn with its before choice for the
   second frame; name the wrapper and the piece it held in
   the report. If a piece's choice cannot be held from
   outside `joinery.ts`, shoot the held pair as the before
   frame held for both (the drag paused at the before sample)
   and say so for that row: the geometry one drag step behind
   is the stated stand-in, not a silent one. A same-build
   control pair (the stand's control drag, no flip) heads
   the sheet.
3. **The sheet.** One sheet under `.claude/probes/K1186/`:
   six rows (the control first, then the five flips), each with its before,
   after and held crops at 3x, labelled by stand, junction,
   kind and drawn ink in the report (the sheet itself follows
   the kit's no-label shape; the report is its key). State
   per row, from the crops, how many pixels the flip moves
   at the junction against the held pair's own change. Run
   `npm test` once and report it green; no test should
   change.

### Done and close

**Done when:**

- The five flips are named from 19B's data (stand, script,
  junction, kind, drawn ink), with the ranking rule stated
  where the drawn ranking runs out.
- The sheet exists: control plus five rows, before / after /
  held at 3x, at the stands' pinned states.
- No file outside `.claude/probes/K1186/` changed, and `npm
  test` passes.

**Close lines:**

This close rewrites K1186's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
crops recorded ("the five worst drawn flips cropped at
`.claude/probes/K1186/` (<sheet>): <per-row drawn px against
held>; Claude judges whether they pop before any fix") and
the hold-and-fade remainder kept, for Claude to apply by
hand. Then:

After the run, update K1199's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1199 --last-commit <sha8> --next "Run D done; Claude reviews it and judges the sheet, Run E next"`

## Run E - K1201: reproduce S4b's joint step on screen and on the GPU, and how often play meets it

**Chain tag:** 20E · **Suggested ports:** 5790-5799 (the probe's
Vite dev server takes one port in this range).

This run changes no code anywhere: it reproduces the joint
step S4b measured on the CPU twins - a two-ended arm whose
ridge sits near or before its joint steps against its
one-ended parent by 0.18 to 0.90 - on screen and on the GPU,
and measures how often play meets it over a sweep of head
positions. It ends in tables and a frequency; the fix (S4b's
option (b), behind a switch) is a later stage. It copies the
tools it needs from `.claude/probes/K1139/` into
`.claude/probes/K1201/` and changes nothing under
`.claude/probes/K1139/`.

### Read first

- `docs/design/K1139_s4b_ridge_fade.md`, its Handoff, "Items
  3 and 4: measured, not fixed" and its Next step: the step
  belongs to the ribbons themselves (the band reproduces it
  exactly); item 3 is real whenever `0 <= xR < 0.5` (`xR` the
  ridge's distance from the joint, in world), item 4
  (`dB + W < dA`, `xR < 0`) is possible by construction and
  unobserved; how often is not measured ("if the ridge fell
  uniformly along an arm, it would sit within 0.5 of one end
  or the other for 1/W of head positions (0.4 at W 2.5)"). Its
  fix options (a) to (c) are read for context only; none is
  built here.
- `.claude/probes/K1139/ridge_joint.ts` (whole, then copied):
  the synthetic measure on the CPU twins (`kPulseCrest`,
  `kPulseV2`, `kPulseBandV` from `src/render/paint_math.ts`):
  dA 5, W 2.5, spacing 2.5, the step at the joint max over 400
  clocks and both directions - control (xR 0.75, 0.5) 0;
  item 3: 0.18 at 0.4, 0.36 at 0.3, 0.54 at 0.2, 0.72 at 0.1,
  0.85 at 0.03; 0.90 at the joint; item 4: 0.89 at -0.03 to
  -0.5, 0.63 at -1.0. S4's e210 defect read 0.9859 in the
  same units. Its output is `out/s4b/ridge_joint.txt`.
- `.claude/probes/K1139/stands_cyc.mjs` (whole): the `cyc`
  and `loop` stands (links and moves verbatim, rule 11) - the
  two cycle arms on the stands (cyc e210, loop e102) both
  read joint ridge factor 1.000 at both ends in
  `table_cyc.mjs`'s TWO lines, which is why no stand shows
  the case. `table_cyc.mjs`, `dump_cyc.mjs` (its PROBE
  GOTCHA header) and `lib.mjs` (`dumpPulses`, `PIN`) are
  copied with it.
- `src/render/pulse_path.ts` (read only): the tree is a
  Dijkstra over lattice lengths, `dist0` sums drawn spans -
  so a two-ended arm can have `dB + W < dA` (item 4), and its
  ridge `(dA + dB + span) / 2` moves as the head moves. The
  sweep in task 2 reads the items `pulseTree` declares
  (`__knotPulses`, the plan's hooks in
  `docs/design/K1139_pulse_junctions.md` section 4.4).
- `src/render/paint_math.ts` at `kPulseV2` (read only): the
  ridge fade `min(1, |gA - gB| * 0.5 / PULSE_RIDGE_FADE)`
  with `PULSE_RIDGE_FADE` 0.5 - at a joint whose ridge is
  `xR` away, the child's factor there is `min(1, xR / 0.5)`.
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work. K299's paint-injection recipe (the plan's P8:
  debug view 5's G against the CPU mirror) is the shape of
  task 3's fallback.

### What is there today

> **K1201** · S4b's joint step (K1139): where a two-ended arm's ridge lies near or before its joint, the light
> steps there by 0.18 to 0.90 (`ridge_joint.ts`, synthetic; no stand shows it). Reproduce it on screen and on
> the GPU, measure how often play meets it, then fix (b) behind a switch (S4b's Handoff)

On the CPU twins the step is measured and its cause is
named: a full parent crest meets the child's ridge-faded
crest at the joint, or (item 4) the child's other-end train.
No stand shows it, because the stands' two cycle arms happen
to keep their ridges a full fade away from both joints at
the stands' head positions. Whether the GPU draws the same
step at the same joint, and how often a head in play puts a
ridge within the fade of a joint, are both unmeasured. This
run measures both; it fixes nothing.

### Tasks

Use ports 5790-5799. GPU work takes the perf lock (copied
`run_locked.ps1 -Batch`); wait inside that one command, and
never time without it.

**Write set:** copies and new scripts under
`.claude/probes/K1201/` only (`git add -f`), and their output
tables and crops there. Nothing under
`.claude/probes/K1139/`, no change to `src/`, `test/` or
`scripts/`; Runs B, C, D, F and G touch none of these files.
Copied stands keep their links and moves verbatim (rule 11);
the copy headers name any change.

1. **The sweep (desktop probe).** Copy the kit's tools. On
   the `cyc` stand's cycle and the `loop` stand's loop
   (stands verbatim from `stands_cyc.mjs`), walk the head
   around the cycle: every head position the walk can stand
   on within the reach that lights the two-ended arm from
   both ends, reached by the stand's own moves extended
   along the cycle (name the move list per head in the
   report). At each head, dump the declared items
   (`dumpPulses` / `__knotPulses` on a dev server started
   after the last edit, per the gotcha) and read each
   two-ended arm's `xR` at each end (the ridge
   `(dA + dB + span) / 2` less that end's `dist0`, in
   world) and its joint ridge factor `min(1, |xR| / 0.5)`.
   Table per stand: heads tried, heads where any end reads
   `xR < 0.5` (item 3) or `xR < 0` (item 4), the smallest
   `|xR|` seen, and the step `ridge_joint.ts`'s table
   predicts at it. That table is the frequency measure: the
   share of head positions that meet the step, against S4b's
   uniform-ridge guess (1/W at W 2.5).
2. **A stand that shows it.** Take the sweep head whose
   smallest `|xR|` is least (or, if no head in either sweep
   reads `xR < 0.5`, say so and go to task 3's injection).
   At that head, at pinned clocks, read the joint step two
   ways: the CPU table's joint check (`table_cyc.mjs`'s P1
   at that joint: parent against child at the joint, max
   over 64 clocks) and the GPU's (debug view 5's G sampled
   along each arm's drawn centreline at the joint, against
   the CPU mirror's value at the same points, the plan's P8
   tolerance of 2/255). Shoot the normal view at the same
   clocks, cropped at the joint, at the moment the CPU step
   is largest. State the three numbers (predicted, CPU,
   GPU) for that head.
3. **The injection fallback (only if task 2 finds no head).**
   On the `cyc` stand, declare (K299-style, in the page,
   through the renderer's own `setPaint`: the
   `strips.mjs` injection's shape, copied) e210 as a
   two-ended item with `dB` chosen so its `xR` at
   node_218's joint is 0.2 (state the chosen `dA`, `dB` and
   `W` and the arithmetic). Read the step on the GPU as in
   task 2 (debug 5 G at the joint against the CPU twins at
   the same declaration), and shoot the joint's crop at the
   largest-step clock. The natural-head result from task 1
   (no head meets it) stands as the frequency; the injection
   answers only whether the GPU draws the step.
4. **The tables.** `.claude/probes/K1201/` holds the copies,
   the sweep tables, the showing head's (or the injection's)
   numbers and crops, and one summary: the frequency per
   stand, the predicted/CPU/GPU steps at the shown joint,
   and whether the GPU reproduces the CPU step (within P8's
   tolerance) or not. Run `npm test` once and report it
   green; no test should change.

### Done and close

**Done when:**

- The sweep tables exist for both stands: heads tried, the
  `xR < 0.5` and `xR < 0` counts, the smallest `|xR|`, and
  the predicted step at it.
- A showing head's predicted, CPU and GPU steps are in the
  table (or the injection's GPU step is, with task 1's
  no-head result stated as the frequency).
- Nothing under `.claude/probes/K1139/` changed, no file
  outside `.claude/probes/K1201/` changed, and `npm test`
  passes.

**Close lines:**

This close rewrites K1201's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
reproduction and frequency recorded ("reproduced on the GPU
at <stand/head or injection>: predicted <n>, CPU <n>, GPU
<n>; play meets `xR < 0.5` at <k> of <n> head positions on
<stands>; tables at `.claude/probes/K1201/`; fix (b) behind
a switch is the next stage") and fix (b) kept as the next
stage, for Claude to apply by hand. Then:

After the run, update K1199's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1199 --last-commit <sha8> --next "Run E done; Claude reviews it, Run F next"`

## Run F - K1196: time two-ended pulses on loops and cycles, at rest and in play

**Chain tag:** 20F · **Suggested ports:** 5800-5809 (the probe's
Vite dev server takes one port in this range).

This run changes no `src/`: it builds a harness that times
frames with two-ended pulses lit on loops and cycles - at
rest, and while moves play onto them - against master's
start-head one-ended pulses, and ends in a table. The harness
and its tables live under `.claude/probes/K1196/`; the K1139
kit is copied, never changed.

### Read first

- The ledger's K1196 (quoted below) and S4's cost record in
  `docs/design/K1139_s4_cycles.md`'s Handoff ("Cost"): the
  rest bench (`out/s4cyc/bench_rest.json`, ABBA x4, 5 s, k111,
  desktop) reads frameP50 base 7.15 ms against S4's 7.10 -
  "Covers the start head's one-ended pulses only." That file
  is on master now (`.claude/probes/K1139/out/s4cyc/
  bench_rest.json`): its two builds' URLs are the same link
  (`?k111&am=instant&fw=0&snd=none&phw=0`) at the start head,
  before any move. Read its summary shape (frameP50,
  frameMean, finishP50 per URL) so this run's table speaks
  the same units.
- `scripts/bench_frame.mjs` (whole): the frame bench S4's
  brief names (`--cdp`; frame, submit and finish times per
  frame at rest). This run's harness follows its measures;
  where it copies it, the copy's header names the change.
- `.claude/probes/K1139/stands_cyc.mjs` (whole): the `cyc`
  stand (head `node_221`, e210 lit from both ends) and the
  `loop` stand (seed 1, `&pr=8`, head `node_635`, the
  self-loop e102 lit from both ends), links and moves
  verbatim (rule 11). `.claude/probes/K1139/lib.mjs`
  (`moveEdge`, `waitAsleep`, the continuous-loop mode a
  moving page needs: an idle on-demand page draws nothing)
  and `sheets_cyc.mjs`'s frame recipe (pinned clocks, three
  rAF waits per frame) are read with it.
- `.claude/probes/K1139/run_locked.ps1` (the `-Batch` shape)
  and `.claude/rules/probes.md`: timings hold the perf lock;
  a same-state A/B runs its same-build control first; never
  `--virtual-time-budget`.

### What is there today

> **K1196** · K1139 S4's frame bench timed only the start head's one-ended pulses at rest
> (`out/s4cyc/bench_rest.json` on S4's branch, 7.15 vs 7.10 ms): time two-ended pulses on loops and cycles with
> a harness that plays moves onto them (numeric, a Muse candidate)

S4 added the two-ended field (`kPulseV2`, its ridge fade,
and S4b's band side of it) and timed it only where no
two-ended arm is lit: the start head of the k111 maze, at
rest. What a frame costs with a cycle arm or a self-loop lit
from both ends - and while the player is moving onto them,
when the declaration refreshes as the geometry moves - is
unmeasured. This run measures both, against the start-head
numbers as the one-ended baseline. It changes no code, so
there is nothing to flip: the table is the deliverable, and
a cost it finds is filed by Claude from the report.

### Tasks

Use ports 5800-5809. Every timing holds the perf lock (the
copied `run_locked.ps1 -Batch`); wait inside that one
command, and never time without it.

**Write set:** the harness, its batch files and its tables
under `.claude/probes/K1196/` only (`git add -f`). No change
to `src/`, `test/` or `scripts/`, nothing under
`.claude/probes/K1139/`; Runs B, C, D, E and G touch none of
these files. Copied stands keep their links and moves
verbatim (rule 11); the copies' headers name any change.

1. **The harness.** Under `.claude/probes/K1196/`, a bench in
   `bench_frame.mjs`'s and S4's rest bench's shape (same
   measures: frame p50 and mean, finish p50, over a stated
   window of at least 5 s of drawn frames, desktop, the
   renderer asleep at rest). Three states, each from its
   stand's link and moves copied verbatim from
   `stands_cyc.mjs`: (a) the baseline, the start head of the
   k111 link with no moves (S4's rest bench's state, whose
   7.15/7.10 are already on record); (b) `cyc` at rest, head
   `node_221` with e210 lit from both ends; (c) `loop` at
   rest, head `node_635` with e102 lit from both its ends.
   State in the report how the harness knows each two-ended
   arm is lit (the dumped declaration's `two` items, from
   `lib.mjs`'s `dumpPulses` shape), and stop and say so if a
   stand's state lights none (batch 8 rule 2).
2. **At rest.** Time each state in ABBA rounds (at least 4
   rounds, the baseline interleaved, a same-build control
   first), under the perf lock. Table: per state, frame p50
   and mean with their round spread, beside the baseline's
   same-run numbers and S4's recorded 7.15/7.10. A state
   whose spread swallows its difference from the baseline
   reads as no measured difference, with its spread stated.
3. **In play.** The same harness, the page kept drawing
   (the continuous-loop mode), playing moves onto the lit
   arm: on `cyc`, moves along the cycle that keep e210 lit
   from both ends; on `loop`, moves around the loop's
   junction that keep e102 lit (name the move lists in the
   report, from the stands' walk). Time frames while the
   moves play (the move animation and the declaration's
   refresh included), ABBA against the same play on the
   baseline state (moves at the start head's maze of the
   same count). Table as task 2's, per stand. If a move list
   cannot keep the arm two-ended while it plays, say which
   heads lose it and time what remains, named as such.
4. **The tables.** `.claude/probes/K1196/` holds the harness,
   the raw round dumps and one summary table: rest and
   in-play, per state, against the baseline, with spreads.
   Run `npm test` once and report it green, so the batch's
   base is known; no test should change.

### Done and close

**Done when:**

- The harness exists under `.claude/probes/K1196/` and runs
  all three states, with each two-ended state's lit arm
  named from its dumped declaration.
- The summary table reads rest and in-play frame p50/mean
  per state against the same-run baseline, spreads beside
  them, S4's 7.15/7.10 quoted for reference.
- No file outside `.claude/probes/K1196/` changed, and `npm
  test` passes.

**Close lines:**

This close rewrites K1196's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
numbers recorded ("two-ended pulses at rest <p50> against
the start head's <p50>, and in play <p50> against <p50>, on
cyc e210 and loop e102; harness and tables at
`.claude/probes/K1196/`") and any cost left as its remainder,
for Claude to apply by hand. Then:

After the run, update K1199's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1199 --last-commit <sha8> --next "Run F done; Claude reviews it, Run G next"`

## Run G - K1198's independent pieces: the untried Plc1m and ij's missing solve, one table

**Chain tag:** 20G · **Suggested ports:** 5810-5819 (unused:
this run runs no server, no browser).

This run changes no code and nothing under
`.claude/probes/K863/`: it copies what it changes into
`.claude/probes/K1198/` and measures the two v7.2 leftovers
that do not depend on K1197 - the untried Plc1m (the cusp
window at B = 1 u with the 8000-evaluation budget) and ij's
missing port solve - as one table against v7.2 and v7.2b. It
lands no ports and picks no variant: Levi's calls (K1197, and
v7.2 against v7.2b) still decide what ships. Reading it,
Levi's priority makes cursive one of the six even though
step (1) alone could fill them.

### Read first

- `docs/ledger_notes.md`'s `## K1198` entry (the full
  numbers: ci 1.20 -> 3.79 u from the font against its 2.5 u
  budget, v7.2b 4.99; cr, cs, cy, er and es further; attaches
  moved up to 3 u; ij unsolved; Plc1m untried) and the
  ledger's K1198 and K1193 (quoted below).
- `docs/design/K1112_cursive_j3i.md`, its Handoff: the rule
  (every cusp letter's low-exit entry window [0, hi] becomes
  [B, hi], maxfev 8000 on the same records; Plc2m = v7.2 at B
  = 2, Plc3m = v7.2b at B = 3), the trials (72 low-exit pairs
  into a cusp window, 71 solved; ij has no port solve; Plc1
  at B = 1 with the old 3000 budget left 5 solves at MAXFEV
  and was not counted), the census (718 pieces: hooks 50,
  spikes 77, rough FAIL 147 unchanged; undesigned seams 29
  -> 6; over budget 399 -> 400), and its Next (Levi picks
  v7.2 or v7.2b; the fr/fs pins may go under v7.2 alone).
- `docs/asks/K1197.md` (what waits on Levi, read to keep out
  of it): c's joins into a, d, g, o and q run flat and turn
  up late, and ck bends in an S - should they rise like the
  font? Its "After you answer" names the stages it gates
  (a refit of where the join leaves c; or landing c's joins
  and dropping the fr/fs pins; then g). This run touches
  neither c's exit nor any landing.
- `.claude/probes/K863/trace/work32/NOTES_k1112cusp.md`
  (the stage's record, in the untracked kit): the tools
  (`work32/dbg/*_k1112cusp.*`: `mk_ports_k1112cusp.py` makes
  `work32/ports_k1112cusp.json` from J3h's ports with each
  cusp entry's window moved to [B, hi] and, for the m
  variants, maxfev 8000; `probe_k1112cusp.ps1` solves the 72
  pairs per variant; `checks_k1112cusp.ps1` runs the census,
  locality, solves, side and guard steps), the trial table
  (Plc1's 22 at a bound and 5 at MAXFEV among them), and the
  rerun commands (`venv\Scripts\python.exe -I`, from the
  trace folder; `K926_FINAL_E=shear`, `K1009_PINS` cleared).
  In the ports file itself (read it): under Pc10, c's exit
  is a merge port with stretch [0, 10] (the 10 u bound of
  K1193), i's exit is a merge port and j's entry a cusp port
  - ij's two ports both exist, so its missing solve is not a
  missing record.
- `work29/dbg/solves_k1113.py` in the same kit (the solver
  the probe calls, read only): a pair with no joins in its
  assembly is skipped without a row - ij's "(no row)" in
  `work32/probe/lowcusp_*.txt` is that skip, under every
  variant tried.

### What is there today

> **K1198** · Cursive c's v7.2 leftovers (J3i): ci 3.79 u from the font, over its 2.5 u budget (v7.1 1.20);
> cr, cs, cy, er and es further from the font; attaches moved up to 3 u; ij unsolved; Plc1m untried
> (`docs/ledger_notes.md` `## K1198`; `docs/design/K1112_cursive_j3i.md` Handoff).

> **K1193** · Cursive c (v7.1, J3h): 14 of the 26 c joins sit at the 10 u bound of c's exit port
> (`docs/design/K1112_cursive_j3h.md`, Handoff)

Two of K1198's pieces do not wait on K1197. Plc1m is the
entry window's B at 1 u: it moves where joins from every low
exit meet i, j, p, r, s, t, u, w and y, c's included only as
one left letter among eight - it does not move where a join
leaves c, which is K1197's question, and its table (seams,
solves, font distance per pair) can be read before Levi
answers. ij is i into j: neither letter is c, and both ports
exist (Read first), so why its assembly holds no join is a
kit question of i's or j's own, answerable now. The rest of
K1198 waits: ci over its budget is read here only as Plc1m's
outcome on that pair (a B outcome, not a c-exit refit), and
K1193's 14 joins at c's exit bound are K1197's own ground -
where the join leaves c is exactly what Levi is asked. None
of it lands: the run's table joins the v7.2/v7.2b choice and
K1197 on Levi's desk, it does not pre-empt either.

### Tasks

Ports 5810-5819 are this run's range and stay unused: no
server, no browser, no timing, so no perf lock. At most 4
worker processes (the kit's rule). Python is the kit's
`venv\Scripts\python.exe -I` from the trace folder, with
`K926_FINAL_E=shear` and `K1009_PINS` cleared, as J3i ran.

**Write set:** copies and new outputs under
`.claude/probes/K1198/` only (`git add -f`): the copied
`work32/dbg/*_k1112cusp.*` tools it changes, its ports file
and its tables. Nothing under `.claude/probes/K863/`
changes (the kit is untracked there; this run copies what
it changes out first, per Run A), no change to `src/`,
`test/`, `scripts/` or `docs/`; Runs B to F touch none of
these files. A copied tool keeps its inputs' paths naming
the copy, and its header names the change.

1. **Copy the kit.** Copy `work32/dbg/mk_ports_k1112cusp.py`,
   `probe_k1112cusp.ps1`, `probe_sum_k1112cusp.py`,
   `checks_k1112cusp.ps1` and the census/side/locality tools
   they call (name the full list in the report) into
   `.claude/probes/K1198/`, retargeted at the copies: the
   base stays the main checkout's `work31/base` and J3h's
   ports (read-only inputs, named in the report), the ports
   file and every output land under
   `.claude/probes/K1198/`. Run nothing yet under
   `.claude/probes/K863/`'s own folders.
2. **Plc1m.** With the copied `mk_ports`, add Plc1m (B = 1 u,
   maxfev 8000 on the cusp records, the m of J3i's Handoff)
   beside the file's Plc1, Plc2, Plc3, Plc2m and Plc3m.
   Solve the 72 low-exit pairs under Plc1m with the copied
   probe (the v7.1, Plc2m and Plc3m rows are already on
   record in `work32/probe/`; solve Plc1m only, and re-solve
   nothing else unless a copied tool needs it - say if one
   does). Report per pair, against v7.2 (Plc2m) and v7.2b
   (Plc3m): status and evaluations, at-a-bound, side minimum,
   and the font distance (dmax) the census records - in
   particular ci (1.20 in v7.1, 3.79 in v7.2, 4.99 in v7.2b,
   against its 2.5 budget), cr, cs, cy, er and es.
3. **The census under Plc1m.** Run the copied checks'
   census, side and locality steps for Plc1m against v7.1
   (J3i's steps, same pieces: J3h's words plus the 72 pairs):
   hooks, spikes, rough FAIL, undesigned seams, over budget,
   each beside v7.1's 50 / 77 / 147 / 29 / 399 and v7.2's
   50 / 77 / 147 / 6 / 400. Locality must read as J3i's did:
   only the rule's joins, their right letters' first strokes
   and the words holding them move. If a gate rises (a seam
   back, a count up), the table says so and Plc1m reads as
   measured, not as a candidate.
4. **ij.** Assemble the ij pair under Pc10 and under Plc2m
   with the kit's own path (`solves_k1113.py`'s assemble,
   copied if it must change to print why) and find where its
   join goes: which step holds no join for ij while its 71
   siblings hold one (i's exit port, j's entry port, the
   pair's strokes, or the solver's own gate). Report the
   step and the values it read, or "not found" with what was
   ruled out. Build no join for it: whether i needs a port,
   a body or a rule change is Claude's call from the table,
   and a built join would be a landing, which waits on
   K1197's stage order.
5. **The table.** `.claude/probes/K1198/` holds the copies,
   the Plc1m solves and census, the ij finding, and one
   summary table: Plc1m against v7.2 and v7.2b (solves, at
   bound, MAXFEV, seams, over budget, ci/cr/cs/cy/er/es
   distance, locality), plus ij's cause or its "not found".
   Say in the summary, per piece, whether it reads as a
   candidate for the landing stage or as measured-only.
   `npm test` once, reported green (no `src/` or `test/`
   file moves, so it is the batch's base check only).

### Done and close

**Done when:**

- Plc1m exists in the copied ports and its 72-pair solves,
  census, side and locality read beside v7.2's and v7.2b's
  in one table, ci among them.
- ij ends in its dropping step with the values it read, or
  "not found" with what was ruled out.
- Nothing under `.claude/probes/K863/` changed (the report
  names the copies and their inputs), no file outside
  `.claude/probes/K1198/` changed, and `npm test` passes.

**Close lines:**

This close rewrites K1198's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with this
run recorded ("Plc1m measured at `.claude/probes/K1198/`:
<solves/seams/over-budget/ci in one clause>; ij is <cause or
not found>; ci's budget, the c-join distances and K1193 wait
on K1197 and the v7.2/v7.2b pick") and the remainders kept,
for Claude to apply by hand. Then:

After the run, update K1199's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1199 --last-commit <sha8> --next "Run G done; all batch 20 runs are in, Claude reviews and closes K1199"`

## Left out on purpose

Drafting order, with what was read and skipped. Runs B to G
above are the fits; everything named here was read and left.

**Step (1), junction work (five of seven pieces taken):**
K1139 S5 is Run B, K1202 Run C, K1186's next step Run D,
K1201 Run E and K1196 Run F, in Run A's order. K1182 is
folded into Run B (task 7 there), as Run A directs: it is
small, its two files are Run B's alone besides, and its flag
off makes the removal picture-neutral after Run B's sheet is
shot. Left:

- K1191's open residual - ji 147 arm 1's bright GPU colours,
  which the cover model leaves unexplained (batch 19 Run D's
  `.claude/probes/K1191/task3_unlit_arm.md`: at bright phases
  the GPU shows ribbon-bright colours, to luma 218, where the
  fan twin paints its quiet base at 148; the unmodelled
  input is `gk`, a foreign over thread's silhouette discard
  - `cover_lib.mjs`'s header names it as not modelled, and
  `junction_field.ts` discards on `gk <= 0.002` after
  `gapKeepAt`). It fits Run A's shape exactly (model the
  candidate against the 276 px, or "not found" with what was
  ruled out; probes only, in `.claude/probes/K1191/`). It is
  seventh in step (1)'s order, after K1196, and the batch
  stops at six: Run G is held for cursive (step (2), Run A's
  own reservation), so K1191's residual is the piece the cap
  cuts. It waits for the next batch, first in its step's
  order there.

**Step (2), cursive (one piece taken):** Run G takes Plc1m
and ij, the two pieces of K1198 that do not depend on
K1197 (Run G's What is there today says why each is
independent). Left, all read:

- K1193 (14 of c's 26 joins at the 10 u bound of c's exit
  port): where the join leaves c is K1197's question itself
  (its card: into a, d, g, o and q flat then late, ck in an
  S; the rec refits where the join leaves c). No stage of
  it is bounded apart from Levi's answer, so it stays with
  K1197 and K1112's lane, which Run A skips.
- The rest of K1198: ci over its budget, and cr, cs, cy, er
  and es further from the font, as fixes. Run G reads ci
  only as Plc1m's measured outcome; fixing any of them is
  either the B choice (Levi's v7.2/v7.2b pick, which Plc1m
  now joins as a measured third reading) or K1197's c-exit
  refit. Neither is this batch's to land. The attaches that
  moved up to 3 u are interior re-parametrizations the
  Handoff reports at nearly the same distance - reported,
  not a defect to stage.

**Step (3), batch 19's follow-ups (none taken):** both items
were read in full (their ledger texts and
`docs/ledger_notes.md`), and neither has a next bounded
piece this batch can take - and with six runs already fit,
neither has a run in any case:

- K782 after 19E (its toast, follower's snare check and mud
  cut since fixed; `## K782` in `docs/ledger_notes.md`):
  the live switch to travel by length keeping dead snares
  drawn - the rings are `syncSnares` in
  `src/render/fabric_maze_renderer.ts`, which no run here
  needs to touch and which Run B's S5 lane already borders;
  the piece is real but its check is a live panel switch on
  a page (a by-length game, snares laid, the switch flipped
  mid-game, the rings read), not the pure unit table batch
  19's K782 pieces gated on, and no stand for it exists.
  The hover light (an armed snare lights any run) needs
  pointer plumbing no hook exposes, as batch 19's draft
  already found; the late lure clear under length travel
  and the clk=beat tools are read-from-code and untested,
  with no wrong answer a table can pin until a stand is
  built for them; the ring as a stand-in glyph is a look,
  Levi's call, and Run A bars items waiting on Levi.
- K711 (its chase tap since fixed in `ee46522e`): (d)
  `refire`'s O(V^2) per breaking move (`src/game/fire.ts`,
  its selection loop, "O(V^2) like" `walkDistances` in its
  own comment) - the item's shape is add-a-heap-if-mazes-
  grow; mazes have not grown, and a heap swap whose before
  table already reads fine is not a fix (batch 19's draft
  said the same, and nothing since has moved it). (f) The
  broken-run counts needing `main.ts` to report every
  accepted run: an audit of every input path that can accept
  a run across `main.ts`'s move machinery, with no single
  check that decides it - not one bounded stage, as batch
  19's draft also found.

**Step (4), Next above K1191:** K1202, K1201 and K1196 are
Runs C, E and F from step (1). The section's only other
items above K1191 are those three (its head is K1182, Run
B's folded piece, then K1202 and K1201; K1196 sits at its
foot). Nothing at or below K1191 was read again, as Run A
directs - batch 19's draft left the section read to K1188.

**Step (5), Residuals above K1191 (except Run A's named
items):** K1191 is step (1)'s seventh piece, left above.
K1198 is Run G. Read and left:

- K1194 (c's lead-in rough FAIL in c-initial words, facet
  0.0098; the er and es solves at MAXFEV 3000): the er/es
  half no longer stands - J3i's m budget (maxfev 8000)
  converges both under v7.2 (er 1168, es 2208 evaluations),
  so there is nothing left to stage there. The lead-in half
  is c's body in c-initial words: K1112/K1197's lane, a
  letter-body stage with its own sheet for Levi, not a
  bounded table this batch can decide.
- K1195 (`scripts/preview.ps1`: a `src-*` folder half-deleted
  by `git worktree remove` - a file held open - loses its
  `.git`, so the fallback keeps it and later -Ref runs of
  that sha under that -Root are refused as a live run until
  cleared by hand): a real, bounded tooling fix, decided by
  the dry runs its shape allows (a held-open file in a temp
  worktree under `$env:TEMP`, the script's own
  `Remove-PreviewWorktree` and `Clear-DeadPreviews` read for
  this draft). It is left on order, not on merit: junction
  and cursive fill the six first (Levi's priority, Run A's
  order), and it is the first tooling piece the next batch
  can take. Naming it here keeps it from being re-read as
  new.
- K1203 (a pulse band ignores its child arm's end window:
  x4 mnode_27 e135->e18 reads 0.0170 in BAND EXTENT, before
  S4b too; and `table_cyc.mjs`'s BAND EXTENT stops at the
  arm's length): S4b's Open items 3 and 4. It sits behind
  K1201 and K1202 in its own Handoff's order, and its fix
  (the band honoring the child's end window) changes what
  the player sees, so it needs the switch-and-sheet shape
  after an attribution this batch has no run left for. The
  0.0170 is on record in both S4 and S4b tables; nothing
  re-measures it here.

**The skipped lanes, as Run A names them, and where they
bit:** K1040's label pass (K1097, K1143, K1157 and K1180;
`src/render/field/` and `.claude/probes/K1040/`) - no run
touches it. The cursive's next letters and c's joins (K863,
K1112, K1119 and K1197) wait on Levi; Run G is the only
cursive run and keeps out of their paths (it copies the kit
and lands nothing). K1190 (Levi's look calls on the junction
light), K1200 (pulses meeting on a loop: pass through, or
fade - Levi's card), K647, and every other item waiting on
Levi - none taken. Physics (the simulation), phone passes,
items In progress other than K1139's S5 (Run B), K144 and
K1168 (Claude writes their briefs; deploying them needs the
Google OAuth client, Cloudflare Worker and D1 database from
Levi), K1181 (the laptop's checkout), and anything under
`.claude/worktrees/` (Runs C, D and E read the K1139 kit's
tracked tools and tracked output, and retake what they need
in their own folders rather than reaching into a worktree).
No Claude agent is running when this batch's runs start
(Run A records it), so the K1139 lane's paths are free to
Run B's write set and to Runs C and E's copies; no other run
writes there.

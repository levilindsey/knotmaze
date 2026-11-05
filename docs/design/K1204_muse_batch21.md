# Muse batch 21 (K1204)

Claude starts these runs through Paseo, one run at a time, after
batch 20 (`docs/design/K1199_muse_batch20.md`, K1199) was reviewed
and closed. Each run is a fresh Muse agent that reads this brief,
does its run's tasks, and stops. Claude reviews each run on master
afterwards and closes K1204.

This was a drafting run (Run A,
`docs/design/K1204_muse_batch21_run_a.md`), so the batch's runs are
B to G in the drafting brief. Six runs fit (B to G below); the
chain tags are `21B` to `21G`, one run at a time. Batch 21 uses
ports 5820-5879, one range of ten per run.

Runs came from the candidates in Run A's order:

- (1) Junction work (Levi, 2026-11-04: "perfecting all junction
  and cursive work is always my main priority"), one bounded stage
  each: K1097 S3f5 fits (Run B), K1202's fix fits (Run C), K1203's
  fix fits (Run D, from Run C's commit), K1186's next step fits
  (Run E, from Run D's commit) and K1201's census fits (Run F).
  K1196's next step and K1191's open residual do not fit
  ("Left out on purpose" below says why for each).
- (2) Cursive work: K1198's two pieces that do not depend on
  K1197 fit as one run (Run G: Plc1m's sheet and missing numbers,
  and ij's ligature list with the joins it hid, solved through
  the ports). Run A holds one of the six runs for it.
- (3) Claude's picks from batch 20's reviews and the Pixel
  passes: neither fits. K1205's first step and K1139's frame-tail
  watch are read and left ("Left out on purpose" below); the
  watch shares 20F's bench with K1196's step, so the two wait
  together.
- (4) "Next, in order", items numbered above K1199: K1202 and
  K1201 are Runs C and F from step (1). Nothing else there is
  above K1199 (its next item is K875), so nothing below that was
  read (Run A directs it; batch 20's draft read the section to
  K1198).
- (5) Residuals numbered above K1199, except the ones Run A's
  list names: K1203 is Run D from step (1) and K1205 is step
  (3)'s left piece. Nothing else there is above K1199. K1198 is
  Run G from step (2).

No item ends outright. Runs B, C and D stop at a sheet or a gate
script with the switch defaulting to today's picture: Claude
judges the sheet and flips the default, and K1097, K1139, K1202
and K1203 stay open either way. Runs E, F and G change no `src/`
at all except Run E's probe-only override, and end in tables,
diffs or a harness. A run that stops keeps its item open (batch
8 rule 1). Close lines that rewrite an item's text give the new
text in their reports, for Claude to apply (`ledger.mjs` has no
command that rewrites an item's text, so a rewriting close says
so, as the drafting brief requires).

Every task is decided by a unit test, a desktop probe, a dry
run or a measurement table below, and none needs Levi or a
phone. Runs B, C and D change what the player sees only behind
their switches; Runs E, F and G change no picture at all except
Run E's forced-vote renders, which never leave its probe.

No two runs touch one file ("How to work", rule 3), except
where a run below says it starts from the earlier run's commit:
Run D starts from Run C's commit and Run E from Run D's (the
junction-field and joinery files carry all three). Read the
whole brief before your first command.

## How to work

Batch 20's "How to work" applies unchanged: read it in
`docs/design/K1199_muse_batch20.md` (it sends you on to batch
19's, batch 18's, batch 17's, batch 16's, batch 15's, batch 8's
ten rules and the shared process in
`docs/design/K1050_muse_week.md`) before anything else. Read
K1204 wherever it, or a page it sends you to, says K1199, K1192,
K1189, K1184, K1178, K1169 or K1131; the chain tags are 21B to
21G, and Claude starts them one at a time. Batch 21 uses ports
5820-5879; each run below names its own range. After each run,
update K1204's handle (the next run in B, C, D, E, F, G order,
or, after G, that all the runs are in and Claude reviews and
closes K1204).

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

No Claude agent will be running when batch 21's runs start.
Claude runs the phone passes; no run touches the phone.

## Run B - K1097 S3f5: what the label pass's drawing costs, the fixed part and the vertices

**Chain tag:** 21B · **Suggested ports:** 5820-5829 (unused for
a server of its own: the kit's split page runs in headed Chrome
over `file://`, as S3f4's did; the range is this run's if a
server is needed).

This run builds S3f5's default-off probe variants for the two
lever families the Pixel cleared, checks each against today's
pass, times them on the desktop, writes the Pixel batch's gate
script and stops before it: Claude runs the phone. It adopts no
lever and changes no default pixel. Its paths are
`src/render/field/` and `.claude/probes/K1040/`; no other run
touches them.

### Read first

- `docs/design/K1040_s3f4_bound.md`, its Handoff and the
  section "The Pixel's reading" at its end (read in that
  order): the six S3f4 variants and their checks, the desktop
  split's columns, the read rule the Pixel's columns are read
  by, and the Pixel's own split (render-sync p50 ms, median of
  the 12 scenes: drawing 2.2, a pass that draws 0.8 clearing
  12/12, vertex side 0.9 clearing 10/12, vertex slope 0.0,
  instancing -0.3 and never positive; the gate 3.2 to 10.7 ms
  against 2). Two families clear: the pass's fixed cost and
  cheaper vertices. Rejected there, so not candidates here:
  `ftentvvid` (slower on 9 of 12 scenes) and cheaper fragment
  arithmetic.
- `src/render/field/label_b_pass.ts` (its header, then
  `resize`, `upload` and `draw`/`drawTent`): today's timed pass
  is lean tentv - L an immutable R32UI texture, D a
  DEPTH_COMPONENT32F renderbuffer nothing samples (its store
  kept; `probeDepth24` swaps in DEPTH_COMPONENT24 before
  `resize()`), the tables uploaded by the row diff, segments
  one instanced strip of `TENT_SEG_VERTS` vertices. The probe
  knobs already there are the shape a new variant follows:
  `probeSegLimit` / `probeSkipCapsFills` (S3f4's
  `ftentvone`), `probeVid`, `probeInvalidateDepth` (D's store
  skipped), `probeNoDrawCalls`, `probeBindOnly` and
  `probeNoClear`. `draw()` clears L (and G, debug only) and
  depth, draws segments, caps and fills depth-tested LESS, and
  invalidates depth only under `probeInvalidateDepth`.
- `src/render/field/label_b_tent_glsl.ts`: tentv's segment
  vertex shader (`SEG_MAIN` under `VS_LIB_V`) fetches the two
  chain texels, the segment's two points and the previous point
  per vertex, writes one flat `ivec3` (`vQ`), and its fragment
  shader fetches the two points, the chain texel and the span
  record again. `labelBTentVidSources` (S3f4's rejected draw)
  is the model for a variant source set beside today's, chosen
  at the pass's construction.
- `.claude/probes/K1040/s3/page.ts`: `FNEW` beside `ftentv`
  (lean, the host) holds S3f4's six variants; `window.s3.check`
  reads the label target back after the pass. A new variant is
  a name in that list, a lean pass built like the FNEW variants
  and, where the page cannot reach, a probe field on
  `LabelBPass`, exactly as S3f4's were. `facetOpts` and
  `nwOpts` show how a variant source set reaches the pass.
- `.claude/probes/K1040/s3/s3.mjs` (its `check`, `many` and
  `ab` modes), `split.mjs` (the set `s3f4`: per scene the
  drawing, a pass that draws, the segments, caps/fills/rest,
  the vertex side, the fragment side, the shading, the vertex
  slope and the instancing, each with the two runs' difference
  beside it), `vert_count.ts`, `run_locked.ps1` and
  `s3f4_gate.ps1` (its `-SkipDesktop` phone part is this run's
  gate-script model: the split page twice, then `s3f3new` and
  `s3ffloorall`, so the gate's numbers share the phone's state;
  its `-DryRun` touches no phone and takes no lock).
  `.claude/rules/probes.md`: headed real-time Chrome, never
  `--virtual-time-budget`, the perf lock for GPU work.

### What is there today

> **K1097** · K1040 S3, the label pass (F7 of `docs/design/K1040_junction_field.md`): the depth-tested label on
> the GPU, gated by oracle30's verdicts on the 12 scenes (0 DEFECT closes K1033), the recordings' pops and the
> Pixel's 2 ms.

S3f4 split the drawing's cost on the Pixel and two families
cleared on nearly every scene: the fixed cost of a pass that
draws at all (0.8 ms, the drawing's whole budget at S4's and
S5's targets) and the vertex side (0.9 ms; cheaper vertices,
not fewer, since the vertex slope reads 0). The gate still
reads 3.2 to 10.7 ms against 2 on all 12 scenes. This run
builds the two families' variants; which lever, if any, the
numbers point to is read from the Pixel batch Claude runs
after, by S3f4's rule.

### Tasks

Use ports 5820-5829. Every timing and check holds the perf
lock (`.claude/probes/K1040/s3/run_locked.ps1`); wait inside
that one command, and never time without it.

**Write set:** probe knobs and variant sources in
`src/render/field/label_b_pass.ts` and
`src/render/field/label_b_tent_glsl.ts` (variant code only;
today's sources and the default pass unchanged), the variant
list and check support in `.claude/probes/K1040/s3/page.ts`,
the `s3f5` split set in `.claude/probes/K1040/s3/split.mjs`,
new `s3f5_gate.ps1` beside `s3f4_gate.ps1`, and their outputs
under `.claude/probes/K1040/s3/out/`. Nothing else; Runs C to
G touch none of these files.

1. **The fixed-cost variants**, on the split page beside
   `ftentv`, `ftentvsetup`, `fempty` and `ffloor`, each built
   like the FNEW variants (lean, the host; default off; a probe
   field on `LabelBPass` where the page cannot reach, like
   `probeDraw`): the family's levers are the ones Run A names -
   attachment count, format and size, depth's store, and load
   and store hints. Build at least one variant per lever that
   can draw today's label, and name each for what it changes
   (as S3f4 named `ftentvone` for one segment instance). A
   variant that cannot keep the label - a smaller target is
   the expected case - is dropped before it is timed, and the
   report says which and why (S3f4's rule).
2. **The cheaper-vertex variants**, the same shape: fewer
   fetches per vertex, and a cheaper span and point path, in a
   variant segment source set beside today's (the
   `labelBTentVidSources` model). Their positions must be
   bit-identical to today's, as `ftentvvid`'s were. Caps and
   fills keep today's programs unless a variant's own header
   says why it must touch them.
3. **The checks**, on the desktop, each a number in the
   report, on all 12 scenes (the label target read back after
   the pass, compared as S3f4 compared: the word at every pixel
   of the target): every kept variant's readback equals
   `ftentv`'s at 0 px, and the default is unchanged (the A/B,
   as S3f4's, at 0 px outside the label; `npm test` green).
   State each variant's vertices per scene (`vert_count.ts`;
   cite `out/vert_count_s3f4.md` where it already has today's).
   A variant that fails its check is fixed or dropped before
   it is timed; say which.
4. **The desktop timing and the split**, under the perf lock:
   every kept variant on all 12 scenes beside `ftentv`,
   `ftentvsetup`, `fempty` and `ffloor`, the split page run
   twice, as the phone part will run it. Write the split per
   scene and run in `split.mjs`'s set `s3f5` beside `s3f4`:
   S3f4's columns, plus one column per kept variant (the
   variant against `ftentv`, so the Pixel's runs fill the same
   columns; each column with the two runs' difference beside
   it, and a reading smaller than that spread decides
   nothing). The desktop ranks nothing for the Pixel: it proves
   the variants time and gives the table's worked example.
5. **The gate script.** Copy `s3f4_gate.ps1` to
   `s3f5_gate.ps1`: the desktop part is task 4; the phone part
   is one batch in `s3f4_gate.ps1 -SkipDesktop`'s form - the
   split page twice (the kept variants beside `ftentv`,
   `ftentvsetup`, `fempty` and `ffloor`), then `s3f3new` and
   `s3ffloorall`, so the gate's numbers share the phone's
   state; the tables are `out/split_s3f5.md` (task 4's columns,
   per scene) and `out/phone_table_s3f5.md`. Run
   `s3f5_gate.ps1 -SkipPhone` for task 4, then `-DryRun`, which
   touches no phone and takes no lock, to prove the phone part
   plans. Stop there: Claude runs
   `s3f5_gate.ps1 -SkipDesktop` for the Pixel batch.
6. `npm test`.

### Done and close

**Done when:**

- Every kept variant is built, default off, and passes its
  check at 0 px against `ftentv` on all 12 scenes (or is
  dropped, and why); the A/B reads 0 px and no default pixel
  moved.
- The desktop split exists per scene in the `s3f5` columns,
  from two split-page runs under the perf lock.
- `s3f5_gate.ps1` exists and its phone part is planned by
  `-DryRun`; no phone command ran.
- `npm test` passes.

**Close lines:**

K1097 stays open (S3f5 adopts no lever; the Pixel batch and
the gate remain). The report gives K1097's new `next` text for
Claude to apply, with S3f5 recorded ("S3f5's variants built
behind their probe switches in <sha8>, all at 0 px against
`ftentv`; the desktop split at
`.claude/probes/K1040/s3/out/split_s3f5_desktop.md`; Claude
runs `s3f5_gate.ps1 -SkipDesktop` for the Pixel batch, then
the lever its columns point to"). Then:

After the run, update K1204's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1204 --last-commit <sha8> --next "Run B done; Claude reviews it, Run C next"`

## Run C - K1202: soften the other band's cover edge in the fan, behind a switch

**Chain tag:** 21C · **Suggested ports:** 5830-5839 (the
probe's Vite dev server takes one port in this range).

This run builds the fix 20C's attribution points at, behind a
switch that defaults to today's picture: inside node_218's
fan, e210's centreline takes the other pulse band's crest at
full cover until that band's strip cover ends, then falls to
its own band's field in one column, where the CPU twin ramps
the same cover over columns 18 to 20. The switch makes the
GPU's cover follow the twin's ramp. It proves the twins equal
by unit tests, re-shoots cyc e210's kymograph with the switch
off and on, and stops there: Claude judges the sheet and flips
the default. The golden pins and the `pre_g23` fixtures stay
unmoved while the switch is off.

The switch's form (picked here, as Run A directs): a module
flag in `src/render/junction_field.ts` itself, exported beside
`setFieldParams` with a setter the probe calls, defaulting to
today's picture (off). It rides to the shader as
`uJParams.z` (`fieldUniforms`' `.zw` are free: they carried
the over-fills' joint radii, and nothing reads them now), which
`setFieldParams` writes on the call `joinery.ts` already makes
as it builds its records; the CPU twin in the same
`joinery.ts` reads the flag itself, so one switch moves both.
A panel param is the wrong form here, for batch 20 Run B's
reason: it would append to `CODEC_PARAMS` and move the codec
pin for a look nobody has judged.

### Read first

- The ledger's K1202 (quoted below), `docs/ledger_notes.md`'s
  `## K1202` entry, and `.claude/probes/K1202/out/SUMMARY.md`
  (20C, 5f9c3207): the step re-measured on master (40.3 luma
  at columns 20 to 21, 34 of 72 rows over 10 luma), the CPU
  field smooth at those columns (largest step 0.034-0.043),
  and the covering on either side (every sample at columns 18
  to 23 is record 5363's cover strip; the bright side departs
  from every single-band field, the dark side matches its own).
- `.claude/probes/K1202/attrib.mjs` and `band_twin2.mjs` (the
  twin as 20C ported it): a band's cover at a point is
  `clamp((reach - dnow) / pxW, 0, 1)` over its centreline
  distance `dnow`, with the strip reach `0.26 + 1.5 * pxW` in
  `attrib.mjs` and the fan reach `0.26 + 0.5 * pxW` in
  `band_twin2.mjs`, at the kymograph's `pxW`. Their tables
  (`out/attrib.txt`, `out/band_twin2.txt`, `out/px5_cyc.txt`)
  give the twin's cover against the GPU's G at columns 16 to
  23: the twin ramps over columns 18 to 20, the GPU holds full
  through column 20 and cuts between 20 and 21.
- `src/render/junction_field.ts` at `junctionField` (search
  the name): the pulse bands' loop computes each band's
  `dnow` and `cov = clamp((reach - dnow) / pxW, 0.0, 1.0)`
  with the `reach` the route bands above it set
  (`uJParams.x + (strip ? (ROUTE_BAND_PAD + 1) : 0.5) * pxW`),
  reads the crest by `kPulseCrestK`, and takes
  `kFanPulseV = max(kFanPulseV, cr * cov)`; each drawing band
  then mixes its material in by its own weight (`sCov`, the
  yield to the shared bands' gold). Read `fieldUniforms` and
  `setFieldParams` with it (the switch's ride, above).
- `src/render/ribbon/joinery.ts` at `cpuJunctionField` (the
  GLSL's CPU twin, line for line): its pulse loop reads the
  same records and computes the same `cov` from `reach` and
  `pxW` (search `PULSE_COV`). This twin, not
  `attrib.mjs`'s port, is the one the test pins the GLSL
  against; the two must move together. `joinery.ts` already
  imports `setFieldParams` from `junction_field.ts`.
- `src/render/paint_math.ts` at `kPulseBandV` and
  `kPulseCrest` (read only): the band's own field is smooth
  across the step's columns - no ridge-factor crossing, no
  gA/gB switch, no tau end (20C's task 2). The step is the
  cover's, not the crest's; this run changes no crest term.
- `.claude/probes/K1139/stands_cyc.mjs` (the `cyc` stand:
  `k111&am=instant&fw=0&snd=none&phw=0`, moves 0, 246, 82, 83,
  199, 150, 151, 38, 155, 211, head `node_221`) and
  `.claude/probes/K1202/`'s copies (`dump_cyc.mjs`,
  `table_cyc.mjs` - its BAND EXTENT reads band = ribbon
  0.0000 over the fan's whole extent, the hand-off this fix
  must not break - `sheets_cyc.mjs`, `kymo.mjs`, `lib.mjs`).
  Any stand this run reuses is copied with its link and moves
  verbatim from that source (rule 11), and the report names
  anything it adds or changes.
- `test/render/paint_gameplay.test.ts` at the `kPulseBandV`
  describes (S3a and S4b) and its `pre_g23` pins, and
  `test/render/k320_slim.test.ts` at its char budgets (as
  batch 20's Run B read them). With the switch off your code
  must pass every one of these untouched.
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1202** · The step at columns 20 to 21 of cyc e210's kymograph (up to 43 luma) is the cover edge of
> node_218's other pulse band (e39->e209) crossing e210's centreline in the fan (20C, 5f9c3207; the CPU
> twin ramps it over cols 18-20); a fix is a later stage behind a switch. Notes: `docs/ledger_notes.md`.

While e210's centreline is within the other band's strip
cover, the pixel takes that band's crest, read on the e39
side near its peak at the phases that step; where the cover
ends it falls to the e39->e210 band's own field, which the
CPU twins reproduce. The covering record and strip never
change across the step. The one disagreement is the edge's
softness: the twin ramps the cover over its `pxW` at columns
18 to 20, the GPU cuts it harder and about a column later at
columns 20 to 21. That edge is this run's whole subject.

### Tasks

Use ports 5830-5839. The kymograph and the cold compiles take
the perf lock (`.claude/probes/K1202/run_locked.ps1 -Batch`,
copied from the K1139 kit if your harness needs its own);
never time without it.

**Write set:** `src/render/junction_field.ts` (the switch,
`uJParams.z` and the pulse bands' cover only),
`src/render/ribbon/joinery.ts` (the CPU twin's cover and the
`setFieldParams` call only), `test/render/paint_gameplay.test.ts`
(cases added), `test/render/k320_slim.test.ts` (a budget line
and its comment only, if task 4 fires), and new probe files
under `.claude/probes/K1202/` (`git add -f`) with their output
beside 20C's. Nothing else; Runs B, D, E, F and G touch none
of these files except as Run D's and Run E's sections state
(they start from this run's commit).

1. **Before table (unmodified source).** From 20C's copies on
   today's master, state in the report: the kymograph's step
   at columns 20 to 21 (largest luma jump, rows of 72 over 10
   luma), and both cover curves at columns 16 to 23 - the
   twin's `cov` and the GPU's effective cover (its debug-5 G
   against the twin's `cr * cov` at the same points, 20C's
   `px5_cyc` shape). That table is the before table; it names
   the ramp the switch must reproduce, in world units, from
   the twin's own `reach` and `pxW` at the sheet's view.
2. **The switch.** In `junction_field.ts`, the module flag
   (a name in the file's style) and its setter, defaulting to
   today's picture (off), riding `uJParams.z` as the section
   above states. With the flag off, the GLSL cover expression
   and the CPU twin's reproduce today's values bit for bit:
   every existing pin passes unedited. The header comment
   gains the flag's sentence: what it selects, that it
   defaults to today's picture, and that Claude flips it after
   judging the sheet.
3. **The ramp, CPU twin and GLSL together.** With the flag
   on, each pulse band's cover in `junctionField` follows the
   twin's ramp from task 1 (the same reach, the same ramp
   width in world units at the same point), and
   `cpuJunctionField` computes the same cover under the same
   flag. No other term moves: the crest (`kPulseCrestK` and
   its ridge factor), the shared bands' yield, the crotch
   fill and the route bands above read as today under both
   settings, and a shared band still draws nothing. State in
   the report what the GPU's `pxW` (`fwidth` of the fan's
   position) reads at the kymograph's view against the twin's,
   since that difference is what made the GPU's edge harder.
4. **After table + tests.** New cases in
   `paint_gameplay.test.ts` pin: flag off reproduces task 1's
   twin cover values at columns 16 to 23 exactly; flag on
   gives the twin's ramped cover at the same points (full
   cover where the twin reads 1, 0 where it reads 0, and its
   ramp values between, to 1e-9); and BAND EXTENT's agreement
   still holds in the twin (band = ribbon over the fan's
   extent, as 20C's table reads). A text pin in the same file
   (the `k320_slim` source-scan manner) slices the GLSL pulse
   loop's cover expression and the CPU twin's, and matches
   the flag's branch in both, so a ramp in only one twin
   cannot pass. Rule 9: in a scratch change make the GLSL
   branch read today's cover always; show the flag-on case
   fails, then undo it. Then shader budgets and the K307 cold
   compile as batch 20's Run B section states them (task 5
   there): measure every fragment length `k320_slim.test.ts`
   budgets on the edited tree, raise a budget only to a
   measured length with its comment, and, under the perf lock,
   run K307's cold compile against this run's base commit,
   interleaved, at least two runs each, the run's mean time to
   first visible inside the base's spread.
5. **The sheet (desktop probe).** On the `cyc` stand (link
   and moves verbatim from `stands_cyc.mjs`, rule 11), serve
   on a port in range with the kit's private-cache config, pin
   the clocks as 20C's harness does, and shoot e210's
   kymograph twice - flag off, then flag on (the setter called
   in the page through a `/src` import, the same pinned state
   both times, a same-build flag-off/flag-off control pair
   first). One sheet, off above on, under
   `.claude/probes/K1202/`, with the step table beside it:
   at columns 20 to 21 with the flag on, the largest luma jump
   and the rows over 10 luma against the flag-off row of task
   1's table. State in the report, from the rows, whether the
   step spreads over the twin's columns (18 to 20) with no new
   step beside it.
6. `npm test`.

### Done and close

**Done when:**

- Flag off: task 1's twin values and the frozen `pre_g23`
  pins reproduce bit for bit, and the golden pins are
  unmoved. Flag on: the GPU cover and the CPU twin read the
  twin's ramp at columns 16 to 23 (task 4's pins).
- The scratch change fails the flag-on case (rule 9), the
  shader budgets read as task 4 states, and the run's K307
  mean sits inside its base's spread.
- The kymograph sheet exists under `.claude/probes/K1202/`:
  flag off above on, the control pair beside them, at one
  pinned state, with the step table beside it.
- `npm test` passes.

**Close lines:**

This close rewrites K1202's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
fix recorded ("the other band's cover edge in node_218's fan
ramps as the CPU twin's does behind its switch in <sha8>,
default off; kymograph off/on at `.claude/probes/K1202/`
(<sheet>): columns 20 to 21 read <luma, rows> off and <luma,
rows> on; Claude judges it and flips the default") and the
remainder kept, for Claude to apply by hand. Then:

After the run, update K1204's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1204 --last-commit <sha8> --next "Run C done; Claude reviews it and judges the sheet, Run D next"`

## Run D - K1203: a pulse band honours its child arm's end window, behind a switch

**Chain tag:** 21D · **Suggested ports:** 5840-5849 (the
probe's Vite dev server takes one port in this range).

This run starts from Run C's commit (it touches
`junction_field.ts` and `joinery.ts` after Run C, rule 3's
exception, stated here as Run A requires). It builds the
second fix batch 20's tables point at, behind its own switch
that defaults to today's picture: a pulse band reads its
crest with end window 1 all along its child arm, where the
arm's own ribbon fades over `PULSE_END_WINDOW` at a free far
end, so the band and the ribbon disagree by 0.0170 near that
end. The switch makes the band honour the child's window. It
proves the twins equal by unit tests, extends the BAND
EXTENT comparison the item names, shoots the fan off and on,
and stops there: Claude judges the sheet and flips the
default. The golden pins and the `pre_g23` fixtures stay
unmoved while the switch is off. Run C's switch and this one
are independent: each defaults off, and neither's flag moves
the other's term.

The switch's form follows Run C's: a second module flag in
`src/render/junction_field.ts`, exported beside Run C's with
its own setter, defaulting to today's picture (off), riding
the other free component, `uJParams.w`; the CPU side reads it
where `kPulseBandV`'s callers pass the window (below). A panel
param is the wrong form, for Run C's reason.

### Read first

- The ledger's K1203 (quoted below) and
  `docs/design/K1139_s4b_ridge_fade.md`, its Handoff, "Open"
  items 3 and 4 and the Numbers table: x4 mnode_27
  e135->e18 reads 0.0170 in BAND EXTENT on S4 and on S4b, at
  tau 1.010 inside the fan (fillHalf 0.260, to tauHi 1.343);
  every other band on the four stands reads 0.0000 to 0.0008.
- `.claude/probes/K1139/table_cyc.mjs` at `bandExtent`
  (search the name): it compares each band against the ribbon
  of the arm it runs along over the fan's extent, B side at
  `d = tau` (a near band) or `W - tau` (a far band), max over
  64 clocks - and it stops at the arm's length: `tau` runs
  only to `min(tauHi, B.W)`, with the cut named in its line
  ("[B arm W ...: compared to there]") where a band outruns
  its arm. Its `bandV` port is S4b's `kPulseBandV` with end
  window 1; its `ribbonOf` reads `kPulseV2` on a two-ended
  arm and `pulseV` (S3a's crest with its end window) on a
  one-ended one.
- `src/render/paint_math.ts` at `kPulseV`, `kPulseV2` and
  `kPulseBandV`: a one-ended arm's field carries
  `endWin = cont ? 1 : min(1, max(0, (span - d) /
  PULSE_END_WINDOW))`; a two-ended arm carries none (window 1
  on both sides of its ridge); a band carries 1 always -
  `kPulseBandV` calls `kPulseCrest` with end window 1, past
  its ridge factor. `PULSE_END_WINDOW` is 0.45
  (`src/render/paint_const.ts`).
- The band's data path, end to end: `pulseTree` in
  `src/render/pulse_path.ts` emits each two-ended or cycle arm
  once (its `PulseItem` carries `span`, `cont` and `two`) and
  its `PulseBandSpec` bands (ridge `gR` since S4b, no span);
  `computePulseBands` in
  `src/render/fabric_maze_renderer.ts` turns the specs at a
  vertex into `PulseBandDecl`s; `resolvePulseRoutes` in
  `src/render/ribbon/paint_state.ts` resolves them per
  junction (`ResolvedPulseBand`: route arms, `distJ`,
  `inward`, `hovered`, `gR`, `inwardR`); `joinery.ts` packs
  each band's record (R0 to R3, then its centreline) as it
  builds its records - R3's fourth component is written 0
  today, a free slot - and its `cpuJunctionField` reads the
  crest back by `kPulseBandV`. The GLSL twin is the pulse
  loop in `junction_field.ts`'s `junctionField`: past the
  ridge switch it calls `kPulseCrestK(g, inw, hov, 1.0, bk)`.
  The child's span, its `cont` and which of its ends the band
  sits at are known at the `pulseTree` end of this path and
  at no later one; the window must ride from there.
- Run C's section (its switch, its write set and its tasks 4
  to 5): this run reuses its switch plumbing and its budget
  and cold-compile shape, on its own flag. With both switches
  off your code must pass every pin Run C left untouched.
- `.claude/probes/K1139/stands_cyc.mjs` (the `x4` stand:
  `k111&am=instant&fw=0&snd=none&phw=0`, moves 0, 247, 248,
  69, 72, 73, 95, 140, 180, `&pr=8`) and the S4b dump it
  produced (`.claude/probes/K1139/out/s4b/table_s4b.txt`, the
  mnode_27 line above). Any stand this run reuses is copied
  with its link and moves verbatim from that source (rule
  11), and the report names anything it adds or changes.
- `test/render/paint_gameplay.test.ts` at the `kPulseBandV`
  describes (S3a: the band meets both arms at its ends; S4b:
  band = the two-ended arm's own field, and `gR` 0 gives
  exactly S3a) and `test/render/k320_slim.test.ts` at its
  budgets. With the switch off these pass unedited.
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1203** · A pulse band ignores its child arm's end window (x4 mnode_27 e135 to e18 reads 0.0170, before S4b
> too), and `table_cyc.mjs`'s BAND EXTENT stops at the arm's length (K1139 S4b's Handoff)

At a child arm's free far end the ribbon's crest fades to
the floor over the last 0.45 world (`PULSE_END_WINDOW`),
unless the light carries through (`cont`) or the arm is lit
from both ends. The band through the fan reads the same crest
at window 1 to its own end, so inside the fan, near that end,
the fan is brighter than the ribbon it meets by up to
0.0170 on the one stand that shows it. The difference is
small and pre-dates S4b; it is the band's only known
disagreement with its ribbon at that size.

### Tasks

Use ports 5840-5849. The sheet and the cold compiles take the
perf lock (a copied `run_locked.ps1 -Batch`); never time
without it. Start from Run C's commit; say its sha in the
report.

**Write set:** `src/render/pulse_path.ts` (`PulseBandSpec`
and its band emission only), `src/render/fabric_maze_renderer.ts`
(`computePulseBands`' feed only),
`src/render/ribbon/paint_state.ts` (`PulseBandDecl`,
`ResolvedPulseBand` and `resolvePulseRoutes` only),
`src/render/ribbon/joinery.ts` (the band record's free slot
and the `cpuJunctionField` crest call only, after Run C),
`src/render/paint_math.ts` (`kPulseBandV`'s window only),
`src/render/junction_field.ts` (this run's flag and the pulse
loop's window only, after Run C),
`test/render/paint_gameplay.test.ts` (cases added),
`test/render/k320_slim.test.ts` (a budget line and its
comment only, if task 4 fires), new probe files under
`.claude/probes/K1203/` (`git add -f`, its copies of
`table_cyc.mjs`, `dump_cyc.mjs` and the stands) and their
output there. Nothing else; Runs B, E, F and G touch none of
these files except as Run E's section states (it starts from
this run's commit). If the window needs a file outside this
set, stop and report what it would change.

1. **Before table (pure, Run C's tree).** State x4's
   mnode_27 e135->e18 numbers in the report from the S4b
   table and a fresh dump on Run C's tree: the band against
   its child arm's ribbon over the fan's extent (0.0170 at
   tau 1.010), the child's span, whether it is `cont` or
   two-ended, which end the band sits at, and the ribbon's
   end window at tau 1.010 - the four values the fix must
   reproduce. If the fresh dump reads no step over 1e-3
   there, say so with the fresh table and stop (batch 8
   rule 2); do not build a window for a band that agrees.
2. **Carry the window.** From `pulseTree`'s item for the
   band's child arm, ride the child's span and its window
   kind (its `cont`, its `two`, and which end the band sits
   at, as `bandExtent` already derives near/far) through
   `PulseBandSpec`, the decl, the resolved band and the
   record's free slot, in each file's existing style. A
   two-ended child and a `cont` child carry window 1, as
   today; only a one-ended, non-`cont` child carries a window
   that can fall. With the switch off nothing reads the new
   fields: the declared bands, the records' other components
   and every pin reproduce Run C's tree bit for bit.
3. **The window, CPU twin and GLSL together.** With the
   flag on, `kPulseBandV` takes the child's window (optional,
   defaulting to today's 1, so its S3a and S4b pins read as
   they do) and the GLSL band loop applies the same window
   from the record's slot at the same tau: on the child side
   the band's value at distance `d` along the child equals
   the child's ribbon value there, end fade included; on the
   head side and at tau 0 it reads as today. The ridge factor
   and Run C's cover are untouched under both settings.
4. **After table + tests.** Extend the copied
   `table_cyc.mjs`'s BAND EXTENT in `.claude/probes/K1203/`
   past the arm's length (Open 4): where a band's tau runs
   past its child arm's `W`, compare it against the next
   pulse item's ribbon on that chain, named as such, instead
   of stopping at `W` - and state the mnode_27 band's line
   under the extension with the switch's window modelled in
   the copy's `bandV` port (0.0170 before, its after value
   beside it). New cases in `paint_gameplay.test.ts` pin:
   switch off (window defaulted) reproduces S3a and S4b
   exactly (the existing pins, rerun unedited); with the
   window passed, the band equals the child's `kPulseV` at
   its far end over the last `PULSE_END_WINDOW` (to 1e-9,
   clocks and directions as the S3a describe runs), and reads
   window 1 for a `cont` and a two-ended child. A text pin
   slices the GLSL loop's window expression and
   `kPulseBandV`'s, matched on the same `PULSE_END_WINDOW`
   term. Rule 9: in a scratch change make `kPulseBandV`
   ignore the window; show the far-end case fails, then undo
   it. Budgets and the K307 cold compile as Run C's task 4
   states them, against this run's base (Run C's commit).
5. **The sheet (desktop probe).** Copy the `x4` stand's link
   and moves verbatim from `stands_cyc.mjs` (rule 11), serve
   on a port in range with the kit's private-cache config,
   pin the clocks as the K1139 harness does, and shoot
   mnode_27's fan twice - flag off, then flag on (the setter
   called in the page through a `/src` import, the same
   pinned state both times, a same-build flag-off/flag-off
   control pair first), cropped at the fan as the S4b crops
   crop theirs. One sheet, off above on, under
   `.claude/probes/K1203/`. State in the report, from the
   sheet and task 4's extended table, the band's largest
   remaining disagreement with its ribbon at the child's far
   end with the flag on.
6. `npm test`.

### Done and close

**Done when:**

- Switch off: the S3a and S4b band pins and the frozen
  `pre_g23` pins reproduce bit for bit, and the golden pins
  are unmoved. Switch on: the band equals its child arm's
  ribbon at the far end (task 4's pins), and the extended
  BAND EXTENT table reads the mnode_27 band's after value
  beside its 0.0170.
- The scratch change fails the far-end case (rule 9), the
  shader budgets read as task 4 states, and the run's K307
  mean sits inside its base's spread.
- The sheet exists under `.claude/probes/K1203/`: mnode_27's
  fan, flag off above on, the control pair beside them, at
  one pinned state.
- `npm test` passes.

**Close lines:**

This close rewrites K1203's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
fix recorded ("a pulse band honours its child arm's end
window behind its switch in <sha8>, default off; BAND EXTENT
extended past the arm's length at `.claude/probes/K1203/`:
mnode_27 e135->e18 reads 0.0170 off, <after> on; sheet at
`.claude/probes/K1203/` (<sheet>); Claude judges it and flips
the default") and the remainder kept, for Claude to apply by
hand. Then:

After the run, update K1204's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1204 --last-commit <sha8> --next "Run D done; Claude reviews it and judges the sheet, Run E next"`

## Run E - K1186 next step: each layer-vote flip's own ink, same state, both ways

**Chain tag:** 21E · **Suggested ports:** 5850-5859 (the
probe's Vite dev server takes one port in this range).

This run starts from Run D's commit (it touches
`joinery.ts` after Runs C and D, rule 3's exception, stated
here as Run A requires). It adds a probe-only override in
`rebuildFillets` that forces one arm's vote, then renders
each vote flip's frame both ways at the same state and diffs
them: the flip's own ink with no drag motion in it. It crops
each diff at 3x and stops at its table and sheet: Claude
judges whether a vote flip pops, before any hold-and-fade
fix is briefed. At rest the override is never set, so no
picture changes.

### Read first

- The ledger's K1186 (quoted below) and
  `docs/ledger_notes.md`'s `## K1186` entry (both Claude
  judgments): 19B counted the flips (drags flip about 1/s;
  drawn ink median 0 for every kind, worst 4314 px), and 20D's
  crops cannot show a pop - before and after are one 140 ms
  drag step apart, so each pair carries the drag too (the
  control's 4614 px is motion alone). By the code, `armReach`
  is continuous in the geometry, so a reachBound flip is the
  clamp starting to bind, not a jump; the layer vote is a
  hard threshold, so a wedge changes layer in one frame: the
  one real candidate.
- `.claude/probes/K1186/flips.mjs` (whole): the stands
  (`seed3` is `?3&am=instant&snd=none&fw=0&phw=0`; `fat11` is
  `?11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5`), the
  drag path per target junction (start on arm0 at 0.85 world
  from the centre, 8 steps to arm1 at 0.85 world, 8 steps
  back), and its per-rebuild sampler, which already wraps
  `rebuildFillets` in the page to read each arm's `top` /
  `dives`, each wedge's layer and each arm's reach bound,
  recomputed from the live `underWindows`. Rule 11: the
  stands and drags are replayed verbatim from this source,
  and the report names anything it adds or changes.
- `.claude/probes/K1186/out/summary.md` and
  `out/summary.json` (19B's tables, the raw dumps beside
  them): the most-flipping junctions (seed3 ji116, fat11
  ji55), and `.claude/probes/K1186/out20d/sheet_key.md` with
  its crops (20D's crop shape: 260 CSS px at the flipping
  junction, shown at 3x; its `crops.mjs` holds the wrapper
  and its crop tools - copied, not edited in place, if a
  tool must change).
- `src/render/ribbon/joinery.ts` at `rebuildFillets` (search
  the name): the per-arm vote - `underNear` / `overNear`
  from the nearby crossings against `voteReach`, then each
  arm's `top` (over-near and not under-near) and `dives`
  (under-near with its gap starting within
  `FILLET_DIVE_NEAR` fillHalfs) resolved once per rebuild,
  and `layerFor` sending a junction's discs to the top mesh
  only when some arm is top and none dives (each wedge picks
  its layer from its own two arms). The choices are
  closure-local to one rebuild; `fieldProbe.arms(ji)` reads
  the last rebuild's arms back. `armReach` is in the same
  function (the joint's domain cap against the under-gap
  clamp, floored): read it to keep it out, as the judgment
  directs.
- `src/render/ribbon_renderer.ts` at `skipJointPairs` (the
  override's shape: a facade getter/setter delegating to the
  part that owns the state, false = master's behaviour, for
  A/B probes) and at `captureScene` / `restoreScene` (the
  same-state capture this run renders from: a capture taken
  at a flip's frame, restored, then the override set and the
  frame rendered again). This file is touched only for the
  override's accessor.
- `.claude/rules/probes.md`: full design links, `phw=0`,
  pinned clocks, headed real-time Chrome, the perf lock for
  GPU work.

### What is there today

> **K1186** · Fill look: hold the fillet layer vote while the knot moves, fading on change (K1179 review 5c).
> 20D's crops (`.claude/probes/K1186/out20d/`) carry 140 ms of drag each; armReach binds, it can't jump.
> Next: same-state A/B of each vote flip's own ink (probe-only override); Claude judges. Notes: ledger_notes.

Every frame the geometry moves, `rebuildFillets` re-derives
each junction's layer vote from scratch, and a vote sitting
on its `voteReach` threshold can flip back and forth as the
knot moves, redrawing its wedge on the other layer. 19B
counted the flips and 20D cropped the worst of them, but
each crop pair carries 140 ms of drag, so no crop yet shows
what a vote flip alone draws. This run isolates it: the same
captured state, rendered with the vote each way, diffed.

### Tasks

Use ports 5850-5859. GPU work takes the perf lock (the
folder's `run_locked.ps1 -Batch`, already in
`.claude/probes/K1186/`); wait inside that one command.
Start from Run D's commit; say its sha in the report.

**Write set:** `src/render/ribbon/joinery.ts` (the override
field and its one application in the vote resolution only,
after Runs C and D), `src/render/ribbon_renderer.ts` (the
override's facade accessor only, in `skipJointPairs`' shape),
a new test under `test/render/` (task 2's pin), and new
scripts, diffs and crops under `.claude/probes/K1186/`
(`git add -f`; 19B's `flips.mjs`, its tables and its raw
dumps stay as they are - new work goes to a new subfolder
the report names). Nothing else; Runs B, C, D, F and G touch
none of these files except as Runs C and D state. If forcing
a vote needs a file outside this set, stop and report what
it would change.

1. **The override.** In `joinery.ts`, a probe-only override
   beside the vote resolution (unset by default): when set
   to one arm (named as the vote names it - its chain, slot
   and direction, the `armKey` shape) and a forced
   (`top`, `dives`) pair, `rebuildFillets` resolves that
   arm's vote to the forced pair for that rebuild, and no
   other arm's. In `ribbon_renderer.ts`, its facade accessor
   in `skipJointPairs`' shape, so a probe sets it the same
   way. Unset, the rebuild's choices are today's, arm for
   arm. The field's comment says what it forces, that it is
   probe-only, and that it defaults off.
2. **The pin.** A new test under `test/render/` in the
   source-scan manner of the batch's other pins: sliced to
   `rebuildFillets`' vote resolution, it matches the
   override's application there (the forced pair written
   only under the override, for the named arm alone), and
   sliced to the renderer's accessor it matches the
   delegation, so a force wired anywhere else cannot pass.
   Rule 9: in scratch changes drop the override's branch,
   then force every arm instead of the named one; show the
   pin fails each time, then undo both. The same-build
   control in task 3 (override unset, rendered twice at one
   captured state, 0 px) is the behavioural half of this
   pin; state both in the report.
3. **The A/B (desktop probe).** Replay 19B's stands and
   drags verbatim from `flips.mjs` (links, drag paths and
   sample points from its dumps; rule 11), at the same
   pinned state, reading each rebuild's votes through
   `flips.mjs`'s sampler. At every rebuild where an arm's
   vote flips against the previous rebuild: `captureScene`
   at that state, render it with the vote as resolved, then
   `restoreScene`, set the override to the flip's before
   pair for that arm, render again, and diff the junction's
   crop - the flip's own ink, with no motion in it. Render
   the same-build control first (one captured state rendered
   twice, override unset: 0 px). Include ji116's and ji55's
   chatter (19B's most-flipping junctions on seed3 and
   fat11): every vote flip the drags meet there is A/B'd
   like any other, named by junction in the table. If no
   vote flip occurs on a replayed drag, say so with the
   sampler's counts and stop (batch 8 rule 2); do not
   manufacture one by moving the drag.
4. **The sheet.** Crop each flip's diff at 3x with 20D's
   crop tools, one sheet under `.claude/probes/K1186/` in
   its new subfolder: the control first, then each flip's
   both-ways crops and its diff, labelled in the report by
   stand, junction (`fieldProbe.center` and record), arm and
   the diff's pixel count (changed px, 20D's threshold).
   `armReach` stays out of this run, as the judgment
   directs; the one exception: at each flip's frame, record
   the flipping arm's gap-near value the sampler already
   recomputes, and if it jumps between the frames either
   side of a flip (a window appearing in `underWindows`),
   name that flip in the table as a `near` jump for Claude -
   build nothing for it here.
5. `npm test` (once, reported green; the new pin is the only
   test that should change).

### Done and close

**Done when:**

- The override exists, defaults unset, and the pin catches
  both scratch changes (rule 9); the same-build control
  renders 0 px at one captured state.
- Every vote flip the replayed drags meet is A/B'd at the
  same state (predicted vote both ways, diffed, counted),
  ji116 and ji55 included and named.
- The sheet exists: control plus each flip's crops and diff
  at 3x, in the run's new subfolder.
- No file outside the write set changed, and `npm test`
  passes.

**Close lines:**

This close rewrites K1186's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
A/B recorded ("each layer-vote flip's own ink measured
same-state in <sha8>: <n> flips over <stands>, own ink <px
range> against the control's 0 px; crops at
`.claude/probes/K1186/<subfolder>/`; <any `near` jump named,
or none>") and the hold-and-fade remainder kept, for Claude
to apply by hand. Then:

After the run, update K1204's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1204 --last-commit <sha8> --next "Run E done; Claude reviews it, Run F next"`

## Run F - K1201: how often play meets S4b's joint step (the census)

**Chain tag:** 21F · **Suggested ports:** 5860-5869 (unused:
this run renders nothing and takes no lock).

This run counts, over a few mazes and on the CPU alone, how
often play meets the joint step 20E reproduced: for every
head and every arm its `pulseTree` lights from both ends,
that arm's hand-off distance `xR` to each end and the step
`ridge_joint.ts`'s metric predicts at that hand-off. It ends
in that table. No `src/` changes, no fix: fix (b) (the end
window's fall at `xR`) comes after, only if play meets the
step here.

### Read first

- The ledger's K1201 (quoted below) and
  `docs/ledger_notes.md`'s `## K1201` entry (Claude's
  judgment): the step is reproduced on screen and on the GPU
  (`drawn = S4b + the joint term`), and GPU magnitudes are
  argued from the CPU twins plus the cemented spot, since
  the drawn spot is sub-pixel. Play met it at 0 of the 5
  heads counted so far.
- `.claude/probes/K1201/out/SUMMARY.md` (20E: the
  reproduction, the cemented `--patch` fall, and the census
  so far - 5 heads over the `cyc` and `loop` stands, xR 0.680
  on cyc's e210 and 3.835 on loop's self-loop e102, predicted
  step 0 at both; the cycle arm meets itself in one
  transition of fifteen) and
  `census.mjs` (its `ridge_joint.mjs` copy shows how 20E
  read `xR`, `W` and the span from the page dump; its span
  source is the drawn span, against which task 2 below
  names its own).
- `.claude/probes/K1139/ridge_joint.ts` (whole): at a
  two-ended arm's ridge, parent crest against child `kPulseV2`
  at the joint over 400 clocks, both directions; the table
  it prints (xR 0.4 gives 0.18, 0.3 gives 0.43, 0.2 gives
  0.69, 0.1 gives 0.85, 0 gives 0.90; dA 0 or 1.1, span 0.9,
  W 2.5, ridge at the joint) and its `--pulse` / `--patch`
  variants (the pinned fall at xR; `--patch` holds the fall
  at its xR value past the ridge: steps 0 at every distance
  0.2 to 3.0, crest low - the first candidate's check, not
  this run's fix).
- `src/render/pulse_path.ts` at `pulseTree` (search the
  name): per head (its caller walks every reachable vertex;
  `pulseTree` starts at one head `dist0`, that head's drawn
  distance along its own chain) the declared tree of
  `PulseItem`s (`spans` drawn arc, `dist0` the head's own,
  `dB` the other end's, `xR = (dist0 + dB + span) / 2 -` an
  end's distance, so an arm's two `xR`s sum to its `span`;
  a self-loop's `dB` is `dist0` again and must be counted as
  the arm it is, not as two) and its `PulseBandSpec` bands
  (the S4b ridge `gR` since `95fcf3b7`). `pulseTree` is CPU
  and pure (walk edges, head, the span lookup): it runs in
  Node with no renderer, which is this run's whole claim.
- `src/render/fabric_maze_renderer.ts` at `pulseSpan` (read
  for the span question only): drawn arc between the edge's
  ctrls when the paint data exists; before it, the lattice
  length stands in. The mazes below are counted over lattice
  spans unless your harness computes the drawn arc without a
  renderer, and the report says which, per task 2.
- `src/ui/daily_link.ts` at `dailySeed` and its header (read
  only): a daily's design is today's `PARAM_DEFAULTS` on a
  seed from the day number; `dailySeed(n)` mixes the day
  number to the seed, so a week of dailies is seven day
  numbers and their seeds, each a design in Node without a
  link. `test/physics/fabric_scene.ts` (`fabricScene` /
  `fabricGraph`: the link read against today's defaults, the
  graph built fresh per system in Node) and
  `scripts/run_node.mjs` (the repo's way to run a `.mjs`
  importing `/src`, as 20E's census ran) are the maze source:
  `buildSceneGraph` for the graph, `buildWalkGraph` in
  `src/core/walk_graph.ts` (search the name) for the walk
  edges `pulseTree` reads, start and finish as `pulseTree`'s
  caller reads them (the finish-directed path's head is the
  start junction; play's heads are the junctions it can
  stand on, so enumerate `pulseTree` from every junction
  that can be a head, as the item directs).
- `test/render/pulse_path.test.ts` at its `pulseTree` pins
  (the S3b meets, S4's two-ended arm and S4b's ridge bands):
  the tree's existing contract - this run reuses
  `pulseTree`, it does not restate it, and the pins passing
  unedited are the check on task 2's span source.
- `.claude/rules/probes.md`: nothing here renders; the
  browser rules do not fire. Say so in the report.

### What is there today

> **K1201** · S4b's joint step (K1139): a two-ended arm's ridge near or before its joint (xR < 0.5) steps the
> light 0.18-0.90 there. 20E (9637302e): the GPU shows it by injection; play met it at 0 of 5 heads (notes).
> Next: census xR over every head and two-ended arm of a few mazes (CPU); fix (b) only where play meets it.

At a two-ended arm's ridge the crest arrives at the joint
from both ends, and `kPulseV2`'s fall at the ridge mixes the
two (the correction on since S4b): past the joint the value
can step against its own ribbon - predicted 0.18 at xR 0.4,
up to 0.90 at xR 0. 20E counted 5 heads (xR 0.680 and 3.835,
predicted step 0 at both) and showed the step only by
injection: play has not met it yet. No fix is briefed until
this run's count over more mazes.

### Tasks

Use ports 5860-5869 (unused). No browser, no lock, no
timing. No change to any file outside the write set belongs
here.

**Write set:** new scripts and tables under
`.claude/probes/K1201/` (`git add -f`; 20E's dumps, `dump2`,
`census` and `table` stay as they are - new work goes beside
them and says so) and the report. Nothing in `src/` or
`test/` changes; if the census needs a `src/` change, stop
and report which (batch 8 rule 4).

1. **The mazes (named).** The `cyc` and `loop` stands' links
   from `stands_cyc.mjs` (verbatim, rule 11), `x4`'s link
   (the one 20E's census read - if it differs from
   `stands_cyc.mjs`'s, say which), and a week of daily
   designs: seven consecutive daily numbers ending at the
   run day's number, each day's `dailySeed(n)` and its maze
   built as `daily_link.ts` builds it (today's
   `PARAM_DEFAULTS` on that seed). Name every maze by link
   or by day number and seed in the report, so Claude can
   replay any row. If a daily design does not build in Node,
   name it and its error and count the mazes that build
   (do not trim a maze that merely has no two-ended arm;
   that is a row of 0 in the table).
2. **The count (CPU only).** In Node (`scripts/run_node.mjs`,
   the census's own script), for each maze: build the scene
   graph and its walk graph, then for every junction that
   can be a head (every non-end junction; name the set if
   some junction cannot be a head, and why) run `pulseTree`
   from that head over the whole walk graph, and for every
   arm the tree lights from both ends record both ends'
   `xR` (to the head's end and to the arm's other end; a
   self-loop's `dB` is `dist0` again - count it once, as
   `pulseTree` declares it), the arm's `span` and `W`, its
   `dA` and `dB`, and whether the arm is on a cycle (its
   dB end leads back). The span source is named per maze:
   lattice `WalkEdge.length` throughout, or the drawn arc if
   your harness computes it without a renderer - never a
   page dump. State the script's own check: `pulseTree`'s
   existing pins (`test/render/pulse_path.test.ts`) pass
   unedited on the same tree, and the count reproduces 20E's
   5 heads' `xR` on the stands within 0.05 (0.680 on cyc's
   e210 at both heads, 3.835 on loop's e102 at all three;
   if the lattice span moves one past 0.05, name it and its
   two spans - that row, not the script, is then in question).
3. **The table.** State in the report, per maze and
   overall: heads tried, two-ended arms lit, and for the
   threshold in the item (xR < 0.5, the fall's read band
   against `PULSE_RIDGE_FADE` 0.2) - how many heads meet it
   (an arm-end with xR < 0.5, counted per head that lights
   it) and the largest predicted step. The step at each
   meeting arm-end is `ridge_joint.ts`'s metric at that
   arm's own `dA`, `dB`, `span` and `W` (parent crest
   against child `kPulseV2` at the joint, max over 400
   clocks, both directions; computed with `paint_math.ts`'s
   twins in the script, not read off the printed W 2.5
   table - that table is the metric's worked example, cited
   for shape). Also state the meeting arm-ends' smallest
   xR overall and the largest step among them: those two
   numbers are the ones Claude briefs fix (b) from.
4. `npm test` (once, reported green; as a probe-only run's
   base check - no test should change).

### Done and close

**Done when:**

- The count ran in Node, CPU only, on every named maze, and
  the report names each maze by link or day number and seed.
- The span source is named per maze, and the check reproduces
  20E's five heads (or names the row that moved and why).
- The table exists overall and per maze: heads tried,
  two-ended arms, heads meeting xR < 0.5, smallest xR and
  largest predicted step.
- No file outside the write set changed, and `npm test`
  passes.

**Close lines:**

This close rewrites K1201's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
census recorded ("the census in <sha8>: over <mazes>, <heads>
heads tried, <n> two-ended arm-ends, <m> heads meet xR <
0.5, smallest xR <value> (in <maze>), largest predicted step
<value>; tables at `.claude/probes/K1201/`") and fix (b)'s
direction kept, for Claude to apply by hand - and if no head
meets xR < 0.5 anywhere, say so in that text, since fix (b)
then waits on play meeting it. Then:

After the run, update K1204's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1204 --last-commit <sha8> --next "Run F done; Claude reviews it, Run G next"`

## Run G - K1198: Plc1m's sheet and missing numbers, and ij's ligature joins through the ports

**Chain tag:** 21G · **Suggested ports:** 5870-5879 (unused:
this run renders no page, starts no server and takes no
lock).

This run is the cursive run (Run A holds one of the six for
it). Work is in `.claude/probes/K1198/` from 20G's copies:
copy there anything else this run changes, and change nothing
under `.claude/probes/K863/`. It is two pieces: (a) Plc1m's
sheet and its missing numbers, (b) ij - every ligature pair
listed, then the joins the ligatures hid solved through the
ports. Neither depends on K1197.

### Read first

- The ledger's K1198 (quoted below) and
  `docs/ledger_notes.md`'s `## K1198` entries (both Claude
  judgments: v7.1's and v7.2's hands, then 20G's - Plc1m
  replaces v7.2 if its sheet reads as well; ij's hand hides
  behind the font's ligature, and saying so closes K1198
  without a join).
- `.claude/probes/K1198/SUMMARY.md` (20G, whole): the hands
  (v7.1's L/R curve ports, v7.2's `P = R - B, B = 1` pinned
  join curve, Plc1m's `P = L, B = 1`), the census tool's pairs
  (which port sets it reads `Q` from: `ports_Plc1m` for
  Plc1m, `portL_manual` for v7.1, `Q` for v7.2), the gates
  bench (locality), the determinism half, the K1009_PINS
  front door, and the history every solver copy here follows
  (the ports the solver reads are built before it by solve's
  own step-1 pass; `K926_FINAL_E=shear` and
  `K1009_PINS={}` before every solver, everywhere). Read
  its Do not / open list as this run's boundary: K1198
  claimed v7.1 -> v7.2 replaces no J3i letter until a hand
  changes; K1112's R-only hand sits outside this item.
- `docs/design/K1112_cursive_j3i.md`, its Handoff (its open
  items 1 to 3, "How to run" - the sheet drawings its steps
  draw - and the largest word moves it names under v7.2:
  fi in "first" and "fifty", it in "hit" and "fruit", and
  how its locality reads them; its sheet list is
  `out32/cusp_v72.svg`, `c_v72.svg` and
  `cursive_v72_words.svg`).
- `.claude/probes/K863/trace/NOTES.md` at `## K1112 cusp`
  (its rerun commands, whole): the sheets are regenerated
  with `sheets_k1112cusp.py` into `out32`, and a copied
  harness may need its output dir created first, as 20G's
  rerun did (nothing to install or copy back, since the
  kit is untracked there; do not rebuild kit state into it,
  only into `work`-style scratch inside this run's own
  folder, under `.claude/probes/K1198/`; say it plain).
- `.claude/probes/K863/trace/tools/k886lib.py` at
  `feats_for` (`ss02` on every `p` cluster, nothing else -
  its shapes are the kit's shaping, the only features open)
  and `.claude/probes/K863/trace/tools/trace_k879.py` at
  `shape(font, text, wght, feats)` (uharfbuzz on JMJ
  Cursive via the `fontTools` face, returning the glyph
  names with advances; `.claude/probes/K1198/census_k1027.py`
  shapes each pair and word through it with `feats_for`, and
  the ligature list below shapes 26x26 pairs through the
  same tool, not a subset).
- 20G's copies in `.claude/probes/K1198/` (its SUMMARY's
  file list: `census_k1112cusp.py` and its siblings,
  `solve_lib_k1112cusp.py`, `checks_k1112cusp.py`,
  `sheets_k1112cusp.py`, `locality_k1112cusp.py`,
  `ports_k1112cusp.json`, `ports_Plc1m.json`); its gates
  benches are `census_Plc1m.md` (the pair rows) and
  `locality_k1112cusp.txt`, and its gates set is in
  `check_final_k1112cusp.py` (20G ran it for the bench).

### What is there today

> **K1198** · Cursive v7.2's leftovers (J3i), 20G (c3ab0a46; notes, `.claude/probes/K1198/SUMMARY.md`): Plc1m
> (B = 1 u) clears the gates, ci 2.31 u from the font (budget 2.5), nearer than v7.2 on cr, cs, cy, er, es;
> replaces v7.2 if its sheet reads as well (K1204). ij: the font ligates it (ij.jmc), so no join is built

Plc1m is built and clears every census gate 20G ran, and it
draws 2.31 u from the font where v7.2 drew 2.49 (the budget
is 2.5): nearer than v7.2 on five pairs and further on the
other five. It has never been sheeted, four of its font
distances have never been measured, and its fr and fs pins
have never been tested. ij was never built because the font
already ligates it (`ij.jmc`), so no join exists to draw.

### Tasks

Work is in `.claude/probes/K1198/`: work from 20G's copies
there, and copy there anything else this run changes;
nothing under `.claude/probes/K863/` changes. 20G's note on
its font path stands: a copied file that reads the kit's
font by its absolute path may need that path read as the
kit's JMJ Cursive face - say it if so; do not rebuild kit
state into the kit.

Use at most 4 workers on this machine, `python -I`, with
`K926_FINAL_E=shear` and `K1009_PINS={}` set before every
solver call, as 20G did.

1. **Plc1m's sheet and missing numbers.**
   - **Sheet.** Draw J3i's three sheets
     (`out32/cusp_v72.svg`, `c_v72.svg` and
     `cursive_v72_words.svg`) for Plc1m: every join and word
     drawn four ways, font, v7.1, v7.2 and Plc1m, in one
     sheet set a reader can compare column-wise (J3i's "How
     to run" names the sheet commands; copied harnesses run
     from this run's folder, outputs beside them). Four-way
     is the order Run A sets: font first, then v7.1, v7.2,
     Plc1m. A sheet drawn for three hands and relabeled is
     not done; if a hand cannot draw a join, the sheet says
     so in its cell (the ij cell is task 3's case: blank for
     v7.1 and v7.2, the font's ligature in the font column).
   - **Four never-measured distances**: ai, ar, ei and ni -
     font distance for each under v7.1, v7.2 and Plc1m, added
     to 20G's table. State whether v7.2 reads nearer the font
     than v7.1 on each (Run A's expectation, to verify, not
     assume), which of the four Plc1m reads nearer than v7.2
     on, and Plc1m's mean over the four against v7.2's over
     the same four.
   - **fr and fs pins** (`K1009_PINS={}` front door): solve
     fr and fs with pins cleared vs set, both under Plc1m,
     and state whether the pins change anything (a no-op
     under v7.2; the numbers, not the flag: each pair's
     shape hash, font distance, local census).
   - **Largest word moves**: list under Plc1m the largest
     word moves the locality tool reports, as J3i named them
     under its hands (under v7.2, fi in "first" and "fifty";
     under v7.2b, it in "hit" and "fruit"): name Plc1m's
     largest moves with their words, and whether those four
     words still lead.

2. **List every ligature pair.** For each ordered letter pair
   (26x26 lowercase pairs, 676 in total) shape the pair as a
   word with `shape()` through `feats_for`'s shaping (the
   tool path `trace_k879.py` shapes by, so the list is the
   font's, not a private subset's), and record: (a) pairs the
   shaping returns as one glyph where two letters went in
   (the font ligates the pair; name its glyph - `ij.jmc` is
   the pair `ij`). Then (b), for each such pair, the hb
   feature that makes it: re-shape with candidate features
   off (begin with the shaping defaults - `liga` and its kin -
   one at a time, then together) until the pair splits into
   two glyphs, and name the feature whose turning off splits
   it. `feats_for` itself opens only `ss02` on `p`, so a
   ligature `feats_for` makes is named as such; a pair no
   single feature splits is named as such, with the features
   that were tried. No per-pair data ships in any rule; the
   list is a measurement.

3. **Solve the hidden joins through the ports, everywhere.**
   Shape with those ligatures off everywhere (one rule takes
   no per-pair data: the features from task 2 turned off for
   every word, so no list ships in code), solve the joins
   they hid through the ports under Plc1m and v7.2 both, and
   run the census gates in one table against 20G's (hooks,
   spikes and rough, undesigned seams, over budget, side,
   locality, determinism: 20G's tables are the bench, named
   per gate). Draw each such join and its words' shapes
   beside the font, labelled by hand: the joins the ligatures
   hid, their words in both hands and the font. The locality
   list names every word that moves under either hand, and
   the sheet draws them; the rest are steady. If a join
   cannot be solved through the ports to the gates' standard,
   report the pair and which gate fails - invent no geometry
   the ports do not give.

4. **Gates against 20G.** One table: 20G's bench (its pair
   rows in `census_Plc1m.md`, its locality in
   `locality_k1112cusp.txt`, its gates in
   `check_final_k1112cusp.py`) against this run's - the
   pieces' pairs in both hands, their budget counts, and the
   first row where a run diverges from its bench.

5. **Determinism.** Run the whole corpus twice and compare:
   every artifact byte-identical modulo timers, as 20G's
   second half checked its half.

### Done and close

**Done when:**

- The four-way sheet exists under `.claude/probes/K1198/`:
  every join and word drawn for font, v7.1, v7.2 and Plc1m.
- ai, ar, ei and ni's font distances are in the table,
  with their accuracy added to 20G's benches from task 1's
  readings.
- fr and fs pins under Plc1m: pin on and off, byte or
  Census, and whether either changed anything.
- Largest word moves under Plc1m are listed against v7.1,
  the top three named.
- Task 2's list names every pair the font ligates and the
  feature that makes each (or says no single feature does,
  with what was tried).
- Task 3's sheet draws each join the ligatures hid and its
  words beside the font, under Plc1m and v7.2; the census
  gates read in one table against 20G's, and the locality
  list names every word that moves.
- The determinism pair ran, byte-identical modulo timers.
- Nothing under `.claude/probes/K863/` changed (any file
  the run changed is copied to `.claude/probes/K1198/`
  first).

**Close lines:**

This close rewrites K1198's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
sheet and numbers recorded ("Plc1m sheeted four ways at
`.claude/probes/K1198/` (<sheet>): ai <value>, ar <value>,
ei <value>, ni <value> from the font; fr/fs pins <change
nothing | move ...> under Plc1m; largest moves <words>;
the ligature list <set, sizes> (<pairs> pairs, <features>);
the hidden joins solved through the ports under Plc1m and
v7.2 (census gates <bench>: <verdict>; locality names
<words>)") and the decisions kept - Plc1m replaces v7.2 only
if Claude judges its sheet as well, and ij's join exists now
only as task 3's solved shape - for Claude to apply by
hand. Then:

After the run, update K1204's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1204 --last-commit <sha8> --next "Run G done; Claude reviews it, all batch 21 runs are in"`

## Left out on purpose

Read in Run A's order; these are the candidates it names
that did not fit. Steps (4) and (5) gave nothing past Runs C,
D and F and step (3)'s K1205: "Next, in order" holds nothing
above K1199 but K1202 and K1201, and Residuals holds nothing
above K1199 but K1203 and K1205 (K1198 is Run G from step
(2)), so nothing else in either section was read, as Run A
directs.

### Step 1 (junction work), past Run F

- **K1196's next step, and K1139's watch with it** - these
  do not fit as one run. K1196's step is K1139's S4 cost,
  split from S4b by ABBA x4: the same three stands on S4's
  base (`aa1156ae`) and on `36aed2d5` (S4 and S4b; between
  the two only `src/render/` files and tests change), each
  build made with `scripts/preview.ps1 -Ref <sha> -BuildOnly`
  and timed with 20F's `bench.mjs` (rest and play, a
  same-build control pair, then ABBA x4) under the perf lock
  through its `run_locked.ps1`. The base has no two-ended
  pulses, so its target arm is lit from one end:
  `bench.mjs`'s stop at `bench.mjs:321` must record that on
  the base build and go on (the head still stops). The table
  gives head minus base per stand, at rest and in play,
  against the control pair's spread. If a stand costs more
  than 0.2 ms, add `95fcf3b7` (S4 alone) as a third build, to
  split S4 from S4b. Probes only, in
  `.claude/probes/K1196/`. K1139's watch can share one run
  with it (the same bench, the phone pass's 7-moves stand):
  fabric 7 moves' frames over 25 ms grew by 14 and 15 in the
  Pixel passes of S3b's fix (`1fe793f5` to `71eedb94`) and S5
  (`36aed2d5` to `fbc1b212`), floor 13; time the in-play
  frame tail at 7 moves for both pairs on the desktop, ABBA,
  under the perf lock (p95, p99, max, frames over 2x median),
  and say whether either pair's head moves it. The two are
  ready to run together as one combined candidate; they wait
  because the junction queue ahead of them (Runs C, D, E and
  F) plus the cursive run fill the six, and timing does not
  outrank ink in Run A's order. Next batch: they come first
  in step 1's order there, K1196's step before the watch,
  as Run A lists them.
- **K1191's open residual** - `ji147` arm 1's bright GPU
  colours, which the cover model leaves unexplained (batch
  19 Run D's `.claude/probes/K1191/task3_unlit_arm.md`: the
  black target arm reads 18.0 luma, inside 13.5, arms 2-3
  8.0, its holder pure gold; candidates `gk > 1` sampled
  before the field's cap - the clamped arm's own RGB mix -
  with no GPU trace in hand). The step is to model `gk` and
  say whether it explains the brightness, or that it is not
  found. Probes only, in `.claude/probes/K1191/`. It does
  not fit: it is the seventh junction piece in Run A's
  order (S3f5, K1202, K1203, K1186, K1201, K1196, K1191),
  and the six run out at Run F's census. It waited past
  batch 20 too, where it was the seventh junction candidate
  there; it follows K1196 next batch.

### Step 3 (Claude's picks), after the six filled

- **K1205's first step** - the warm Pixel's 30 fps at rest
  at 0 moves and at the finish, while 7 moves holds 60 (its
  notes). On the desktop, in fabric at rest at 0, 7 and 13
  moves (the phone pass's link and walk,
  `scripts/phone_pass/walk.mjs`), record what keeps each
  frame drawing - `__knotLoop()`'s flags over 10 s (which
  visual flags are set, empty frames - `src/app/loop_flags.ts`
  and `src/app/frame_loop.ts` read as the flag source),
  the frame's JS (`__knotPerf()`) and GPU per pass (`src/app/
  probe_hooks.ts`'s perf pull), under the perf lock. Its
  table names what the frame at 0 moves draws or runs that
  one at 7 moves does not. Probes only, in
  `.claude/probes/K1205/`; no fix in that step. Claude runs
  the warm-phone pass after. It does not fit: step 3 comes
  after junction work and cursive, and those fill the six.

These items wait for later batches (K1196's step and K1139's
watch as one combined first candidate, then K1191, then
K1205); no run here read their code beyond what the
candidates above state.

### Skipped lanes (as Run A names them, unchanged)

- **K1042**, **K1132** and **K1053** - the tooling debt Levi
  revoked on 2026-11-04. None is read, and none belongs in a
  batch until Levi restores it.
- **K1190** (Levi's look, his notes in `docs/asks/K1190.md`)
  and the K1132 "no G2 debt" cut - both wait on Levi's answer
  in `docs/asks/K1190.md`; no run waits on Levi.
- **K1197** (K1140's Glimpse picks) - Levi directed Muse to
  make its decisions, since K1197 stands or falls with K1190;
  Run G depends on neither.
- S6 (K1139's occupancy-scaled pulses) - gated on K1197's
  Glimpse picks; S4b's tail (K1201's steps and the ordering
  one) and S5's children wait on their own censuses and
  Claude's judgments (Run F is K1201's census; its fix comes
  after, only if play meets it).
- **K1195** (the loop-mode tooling needs) - read by batch
  20's draft and left there; Run A reads only items numbered
  above K1199 in steps (4) and (5), so it is not re-read
  here and waits as it waited.

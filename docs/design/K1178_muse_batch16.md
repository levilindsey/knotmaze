# Muse batch 16 (K1178)

Claude starts these runs through Paseo, one run at a time, after
batch 15 (`docs/design/K1169_muse_batch15.md`, K1169) was reviewed
and closed. Each run is a fresh Muse agent that reads this brief,
does its run's tasks, and stops. Claude reviews each run on master
afterwards and closes K1178. Run A was the drafting run
(`docs/design/K1178_muse_batch16_run_a.md`), so the runs here are B
to G. Chain run 16J (K1097 S3f4,
`docs/design/K1040_s3f4_bound.md`) runs before them; no run below
touches its lane.

Where the runs came from (the drafting run's order, from
`docs/design/K1178_muse_batch16_run_a.md`): (1) K1139 S3b, the fan
shader, first, as the drafting brief names it. (2)
`## Approved, to schedule` in `LEDGER.md` (K22, K23, K322 and
K805) — none fits: batch 14's reasons still hold for each,
re-checked below under "Left out on purpose". (3) The residuals
numbered above K1161, except K1178 itself: K1175 fits; K1165 and
K1174 are K1040's lane, K1167 is other repos, K1177 is the phone.
(4) `## Residuals (known, not fixed)` in ledger order, starting
after K1160 (batch 14's draft read through K1160, the section's
last residual then) and so from the section's top: K999, K178,
K484 and K648 fit, in ledger order. Residuals were read in ledger
order from the top through **K648** for the runs (the sixth fit
lands there) and on through the section's end for the list below;
nothing after K648 was taken, in order, so batch 17's draft
starts after K648. See "Left out on purpose" at the end for
every candidate read and skipped, and why. Four takes revive an
item an earlier draft left out; each says why, in its run.

Every task here is decided by a unit test, a desktop probe, a dry
run or a measurement table. None needs Levi or the phone. Run B
builds the fan shader and its look sheet and stops there: Claude
judges the look before Levi sees it, and the Pixel's frame cost
and shader compile time run later, batched with S4, by the
coordinator (Run B plans that batch with a dry run and touches no
phone). S4 is not in this batch: it waits on Claude's look check.
No run changes physics (the simulation), the cursive, or anything
in `src/render/field/` or `.claude/probes/K1040/` (K1040's label
pass, K1097, works there in its own lane, run 16J included). No
two runs touch one file, and each run starts from the latest
master, in the order B to G.

## How to work

Batch 15's "How to work" applies unchanged: read it in
`docs/design/K1169_muse_batch15.md` (it sends you on to batch 8's
rules in `docs/design/K1131_muse_batch8.md` and to
`docs/design/K1050_muse_week.md`) before anything else. Read
K1178 wherever it, or a page it sends you to, says K1169 or K1131,
and K1137's rule 11 and K1141's rules 11 and 12 wherever they
apply: rule 11 (a re-measurement copies the original stand's link
verbatim, read from the old probe's source, not from a summary of
it, and its table names everything it adds or changes) wherever a
stand is copied, and rule 12 (dependencies: no run should need a
new or changed package; if one changes anyway, `npm audit` must
report no high or critical advisory afterwards, and a security fix
is taken even when it was published less than two weeks ago)
wherever a dependency moves. Batch 16 uses ports 5550-5599; each
run below names its range.

After each run, update K1178's handle, naming the next run in the
order B to G:
`ledger.mjs handle K1178 --last-commit <sha8> --next "Run <X> done; next Run <Y>"`
(after Run G: `--next "Run G done; batch 16 complete, Claude reviews and closes K1178"`).

Edit no ledger file by hand (`LEDGER.md`, `docs/ledger_done.md`,
`docs/ledger_notes.md`). `ledger.mjs` runs the commands this brief
names; any other change to an item's text goes in your report as
the item's ID, the file, the current line and its replacement, and
Claude applies it.

## Run B · K1139 S3b: the fan shader

Read first: `docs/design/K1139_pulse_junctions.md` sections 2.2
(option A), 2.6, 4.1 (T10), 4.2 (P1-P10), 4.4 (the stands and
hooks) and 5 (S3a, S3b and S4 entries; where this run and the plan
differ, this run wins on scope only: no phone, no Levi sheet, S4
untouched). Then `docs/design/K1139_s3a.md` and its commit
`4f625916` (what S3a built, and its two notes: the corner cubic's
arc/tau ratio is about 0.79 at 90°, so a band's tau must be
arc-true; x4's e134 at node_378 is a cycle arm and gets no band
until S4). The code: `PulseBandSpec` and `pulseTree` in
`src/render/pulse_path.ts`; `pulseBandRoute`, `assignPulseSlots`
and `routeCubic` in `src/render/junction_routes.ts`; the pulse
declaration and `pulseBandsProbe` in
`src/render/fabric_maze_renderer.ts` (about lines 4031-4098 and
4144-4255); `setPaint`'s route resolution in
`src/render/ribbon/paint_state.ts` (about lines 640-689) and the
record build and `cpuJunctionField` in
`src/render/ribbon/joinery.ts`; the fan shader (`junctionBase`,
`junctionField`, the route loop) in
`src/render/junction_field.ts`; the strip rows in
`src/render/arm_strip.ts`; `kPulseCrest` and `kPulseBandV` in
`src/render/paint_math.ts` (lines 1463-1517) and their GLSL twin
`kPulseV` in `src/render/paint_glsl.ts` (about line 799); the
harness in `.claude/probes/K1139/` (`lib.mjs`, `strips.mjs`'s
STANDS, `bands.mjs`, `ab.mjs`, `table.mjs`, `sheet.mjs`). Area
rules: `.claude/rules/render-paint.md`,
`.claude/rules/render-routes.md`, `.claude/rules/probes.md`.

The ledger says (In progress):

> **K1139** · Choice pulses across junctions (Levi 2026-11-03: "we have to make pulses animate correctly across
> junctions"). S1, S2 done (a4dc218a, 16246c90). Answers: the light splits at a fork (A), runs toward you behind
> you, straight through your junction with no dim moment. S3a-S6 next. Full text: `docs/ledger_notes.md`.
> - next: S3b, the fan shader, in Muse batch 16 (K1178, drafted by run 16A): its numeric checks and look sheet, then Claude's look check; the Pixel later, with S4 (the plan's section 5)

What is there today (read it, don't trust this summary). S2 made
one light field over the lit tree and S3a built its bands on the
CPU: `pulseTree` returns a `PulseBandSpec` per lit junction (the
head-side arm into each tree child; behind you, into the arrival;
`distJ` is the child's `dist0`, and the band's crest reads
`dG = distJ + tau`), `pulseBandRoute` turns a spec into a
gold-shaped `PaintRoute`, and `assignPulseSlots` shares a record's
4 slots with the gold and turnstile bands (over the cap, the
junction falls back to option B and says so). None of it reaches
the screen: the fabric renderer keeps the specs only for the
`__knotPulseBands()` probe, `paintRouteDecl` carries the gold and
turnstile routes alone into `setPaint`, and the fan shader still
draws the arms' radial crests as bars cut by angle (plan 1.2).
`kPulseBandV` is the CPU mirror of the crest on a band, pinned in
`test/render/paint_gameplay.test.ts`; the band's corner cubic
runs tau linearly -d to +d while its true arc runs about 0.79 of
that span at 90° (`test/render/junction_routes.test.ts` pins the
ratio), so tau as it stands would run the crest fast inside the
fan. The fan's record texels are (per route) R0 = (nVerts, m,
armA, armB) then verts (x, y, tau, 0): the verts' 4th component is
free, which is where the plan (2.2) puts `D_J` and the inward
flag. A banded record's base still reads its arms' composed
strips (gold and crest included), so the bars would paint under
any band drawn over them; the plan's quiet mode (no gold, no
crest; floor and hover kept) does not exist yet.

Tasks, in order (ports 5550-5559; the harness takes its host from
`K1139_HOST`, so run it at `http://127.0.0.1:5550`):

1. The before record, from today's master, before your first
   change. Start the dev server with the harness's config (`npx
   vite --config .claude/probes/K1139/vite.private-cache.config.ts
   --port 5550 --strictPort --host 127.0.0.1`). On the five stands
   of plan 4.4, copied verbatim from `strips.mjs`'s STANDS (the
   query `k111&am=instant&fw=0&snd=none&phw=0`; fork moves [0],
   cross [0, 246, 82, 83, 199], src those plus 150, four [0, 247,
   248, 69, 72, 73, 95, 140, 180, 176], x4 as `bands.mjs` holds
   it: pre4 plus `&pr=8`) — the only change from the source is the
   host's port, and the table names it — record the bands with
   `bands.mjs`, P8 on the arms as today allows it, and the strips
   into `.claude/probes/K1139/out/s3b/today/` with `strips.mjs`,
   through a batch file run by `run_locked.ps1 -Batch`. In the
   fan, sample debug view 5's G along each band's centreline the
   way task 5 will: today's fan reads the bars there, and that
   mismatch is the before half of P8-in-the-fan.
2. Arc-true tau. Where a band's verts are built (the record build
   in `joinery.ts`, from `routeCubic`'s points), rescale tau so
   |tau| is the band's true arc from the joint: the ends still
   meet the arms at ±d, and the crest's speed along the band is
   the arms' 1.6 world/s (P3). Pin it in
   `test/render/junction_routes.test.ts`: at 90° the rescaled
   tau's arc steps are uniform (the 0.79 ratio absorbed), and
   `routeCubic`'s own output is unchanged (K81's gold bands keep
   their tau; only the pulse records rescale, or the gold path
   moves — say which in the report).
3. The feed. The fabric renderer declares its pulse bands beside
   `paintRouteDecl` and hands them to the ribbons with the paint:
   per junction record, `assignPulseSlots` shares the slots with
   the gold and turnstile bands already there (a band over the
   same arm pair as the gold band is that band — behind you, the
   path's own band); a record whose distinct pairs would exceed
   `MAX_ROUTES` gets no pulse band (option B there, listed by
   P10). `distJ` and the inward flag ride in the band verts' free
   4th component or the record header (plan 2.2). x4's e134 at
   node_378 gets no band (a cycle arm; S4's). No worker message
   changes: the spans the bands hang from are main's paint data,
   as S2's are.
4. The shader and its mirror. In `junction_field.ts`, the route
   loop evaluates the crest on pulse bands at `dG = distJ + tau`
   (arc-true since task 2): the crest function is one shape
   shared by the arms and the bands, as `paint_math.ts` shares
   `kPulseCrest` (extract its GLSL twin in `paint_glsl.ts`;
   `kPulseV`'s values must not move — `paint_gameplay` pins
   them). Where two bands still overlap near the arm they came
   from they carry the same crest, so they take the max, not the
   sum. A banded record reads its arms' strips in a quiet mode
   (no gold, no crest; floor and hover kept — `arm_strip.ts`'s
   rows), so no bars paint under a band; a record with no pulse
   band reads exactly as today. `cpuJunctionField` in
   `joinery.ts` mirrors the shader line for line. Keep the
   junction-field shader under its `k320_slim.test.ts` ceiling
   (30,650 today): if the crest pushes it over, stop and report
   rather than raise the ceiling.
5. The after record, numeric first. P8 in the fan: debug view
   5's G at points along each band's centreline equals the CPU
   mirror's `kPulseBandV` within 4/255, and on the arms within
   2/255 as before. P1-P5 through the fan, from a kymograph
   sampled along the drawn centreline through the fan (plan 4.3:
   the GPU's own field, not the CPU mirror's). P10: per record,
   the slots used and any fallback, listed. Then the same-state
   A/B: master against your build, clocks pinned by
   `__knotPinClocks`, `phw=0`, a same-build control first: 0 px
   differ outside banded records.
6. The look sheet, for Claude. Shoot the after strips into
   `.claude/probes/K1139/out/s3b/s3b/`, and make one sheet per
   stand of cross, src and x4 (today above S3b, with option A's
   mock-up where it exists: `mock_A_cross.png` for cross) in
   `.claude/probes/K1139/out/doc/s3b_<stand>.png` (`sheet.mjs`),
   tracked with `git add -f`, as is the batch file. Stop there:
   Claude judges the look against the mock-up before Levi sees
   it. Do not show Levi, and do not start S4.
7. The Pixel batch, planned, not run. Write
   `.claude/probes/K1139/out/s3b/pixel_batch_plan.md`: the dry
   run of the batch the coordinator runs later with S4 — the
   stands, `scripts/bench_frame.mjs --cdp` at rest with pulses
   on (the plan's gate: no more than 0.5 ms a frame over master)
   and K307's shader-compile probe on a cold load, the commands
   whole, with the ports it would use. Touch no phone.

Done:

- The crest splits along the bands on every banded record: P8
  in the fan within 4/255, P1-P5 through the fan pass, P3's band
  speed within 10% (arc-true tau), and P10 lists every fallback
  (x4's e134 among them, as a cycle arm with no band).
- The same-state A/B reads 0 px outside banded records; records
  without pulse bands are byte-identical in behaviour (their
  strips, their fans).
- `npm test` passes. No golden pin moves
  (`test/physics/byte_identity.test.ts`, the K87 pin, the golden
  dailies, `test/ui/param_codec.test.ts`, `paint_gameplay`'s
  `kPulseV` values): S3b touches none, so if one moves, stop and
  report it instead of re-freezing. The k320 shader ceilings do
  not move either (task 4).
- The three sheets are in `out/doc/s3b_*.png`, and the Pixel
  batch plan is written. No phone was touched.

Report: the before and after tables per stand (P8 in the fan,
P1-P5, P10), the A/B pixel counts, whether `routeCubic` or only
the pulse records changed (task 2), the shader lengths against
their ceilings, the sheets' paths, and the commits. Then update
K1139's handle (it stays In progress; Claude's look check is
next):
`ledger.mjs handle K1139 --owner "nobody since <yyyy-mm-dd hh:mm> (S3b done in Muse batch 16 run B)" --last-commit <sha8> --next "Claude judges the S3b look sheet (.claude/probes/K1139/out/doc/s3b_*.png); then S4, with the Pixel batch (.claude/probes/K1139/out/s3b/pixel_batch_plan.md)" --brief "docs/design/K1178_muse_batch16.md (Run B); the plan: docs/design/K1139_pulse_junctions.md"`
Suggested ports: 5550-5559.

## Run C · K1175: key hints can go stale under flow

Read first: `.claude/rules/gameplay-moves.md` (KEY HINTS, K332;
TIE CYCLES, CHORDS AND THE MOVE WAIT), `.claude/rules/probes.md`;
then `keyHints`, `keyDepartures` and `keyPointAt` in
`src/app/input_keys.ts` (the cache at lines 187-194, the hints at
271-308), `hintMap`, `keyMap` and `chordMap` in
`src/ui/key_moves.ts`, `keyHintMarkers` and `drawKeyHints` in
`src/render/fabric_maze_renderer.ts` (lines 4843-4898),
`__knotKeyMoves` in `src/app/probe_hooks.ts` (line 991), the
probe `.claude/probes/K332/hints.mjs` whole (its stand, its
`expectedHints`, and its K1170 note at lines 295-307), and
`.claude/probes/K332/out/after_k1170.json` (the K1170 record this
item was filed from).

The ledger says (Residuals):

> **K1175** · Key hints can go stale under flow: the discs cache per vertex and stamp, and on a bisector run
> the fresh map can disagree (K1170's probe: mnode_109's run 221 showed up, read left;
> `.claude/probes/K332/out/after_k1170.json`). Check what a press of the shown key takes.

What is there today (read it, don't trust this summary). The
discs a player trusts are computed by `keyHints()` in
`input_keys.ts` from `hintMap(keyDepartures(v))`: the departures
walk the live drawn geometry (`keyPointAt` adds the flow offset),
but the result is cached on the junction, the solve stamp and
the head radius, and served until one of those changes. Under
flow (the default `flowStrength` is 0.3) the drawn runs keep
moving, so a run near a cardinal bisector can cross it: the
fresh map names a different key than the cached disc shows.
K1170's probe found it at mnode_109's run 221 (the disc showed
up; the fresh pick read left) and worked around it by not gating
that junction on equality. A press is never stale — `keyPress`
picks from fresh departures — so the disc, not the move, is what
lies. The renderer only draws the list it is handed
(`setKeyHints` every frame from `main.ts`'s aid tick);
`keyHints()` is the one place to fix.

Tasks, in order (ports 5560-5569):

1. The before table. Copy the K332 probe's stand verbatim from
   `.claude/probes/K332/hints.mjs` (the link `?7&am=instant&snd=none`
   — flow at its default 0.3, on; the base is the only change,
   your server on 5560, and the table names it). Walk to the
   probe's chord junction (the junction after the entrance, as
   its after mode does), set the hint flag with a first direction
   press, then over 10 s sample the shown discs
   (`keyHintMarkers`) against a fresh `expectedHints` over
   `__knotKeyMoves` every 250 ms: count the samples where they
   disagree, and the runs they disagree on. At one disagreeing
   sample, press the shown cardinal with the real keyboard and
   record the run the taps took. As the control, the same 10 s
   with `&fw=0` appended (name it as the one added key): today's
   cache already agrees there. The before table: disagreements
   per stand, and what the press took against what the disc
   showed.
2. Fresh hints while the geometry moves. In `input_keys.ts`,
   while the flow is on (`scene.renderer.flowStrength > 0` — the
   renderer the hints already read their points through), do not
   serve the vertex-and-stamp cache: recompute the departures
   and the hints on every `keyHints()` call (it is called once a
   frame; a junction has a handful of arms). With the flow off,
   the cache stands exactly as today. The discs' points and
   `held` flags come from the same recompute. Do not change
   `hintMap`, `keyMap`, `chordMap`, the picker or the holds:
   which key takes which run is not this item's to move.
3. The after table: the task-1 sampling on the fixed build —
   zero disagreements at the sampled instants under flow, every
   pressed shown key takes its shown run (at least three
   presses, one of them at a sample the before table caught
   disagreeing, or the bisector run nearest one), and the
   `&fw=0` control unchanged. Then the probe's own gates: run
   `hints.mjs` in after mode with its chord-junction revisit
   gated on equality again (restore the `compareHints` call
   K1170 dropped; the probe edit is part of this run, and the
   table says so). Its other checks (nothing before the first
   press, nothing while the dot travels or after the solve, the
   radius) pass as they do today.

Done:

- Under flow, the shown discs equal the fresh hint map at every
  sampled instant over 10 s, and a press of a shown key takes
  the run its disc names.
- With the flow off, the hints are today's (the cache, the
  junctions, the hidden states); `test/ui/key_moves.test.ts`
  passes unchanged and `npm test` passes.

Report: the before and after tables (disagreement counts, the
press outcomes), and the probe edit.

Close: `ledger.mjs done K1175 --commit <sha8> --what "key hints recompute while the flow is on, so a disc never names a stale key on a bisector run"`.
Suggested ports: 5560-5569.

## Run D · K999: `probes.md` rides every probe read

Read first: `.claude/rules/probes.md` (its frontmatter is the
change; read its head and skim what a cursive read would carry),
`docs/lore_index.md` (its `probes.md` row, lines 81-82), the
narrow topic files it lists (`probes-census.md`,
`probes-phone.md`, `probes-pluck.md`: K173's pattern), the
cursive tree at `.claude/probes/K863/` (what lives there besides
scripts), and `docs/design/K173.md` (the split it made).

The ledger says (Residuals):

> **K999** · `.claude/rules/probes.md` (51 KB, about 13k tokens) attaches on every Read under `.claude/probes/**`, so the
> cursive agents (K863's trace and crops live there) carry browser-probe lore they never use, again after each
> compaction (CC93). Fix: narrow its `paths:` to the browser probes, or split it (K173's pattern); interim, B1 reads crop copies.

What is there today (read it, don't trust this summary). The
frontmatter still reads `.claude/probes/**` (the file is 52 KB
now), beside `scripts/*.mjs`, `scripts/*.ps1`, `scripts/*.ts`
and `src/app/probe_hooks.ts`. Everything under the probes tree
attaches it: the browser probes it is written for, and the
cursive work it is not — K863's trace holds Python, SVGs, crops
and notes beside its scripts, and every read of those carries
the 13k tokens again. The house pattern since K173 is narrow
`paths:` per topic file (the three probe topic files above name
folders and files, never the whole tree). Batch 11 left this
item because a Muse run did not edit `.claude/rules/`; batch
15's Run C (K1162) has since edited the rules lore under its
brief, so that reason no longer holds — this run takes the item
under the exception below.

Exception (K1050's rules, and batch 8's rule 6): this run edits
`.claude/rules/probes.md`'s frontmatter and the `probes.md` row
of `docs/lore_index.md`, and nothing else under `.claude/rules/`.
The lore's text does not change.

Tasks, in order (ports 5570-5574, unused; no server):

1. The before census. Write `.claude/probes/K999/census.mjs`
   (plain node, no browser): walk `.claude/probes/` and count
   files by top folder and extension, split into the classes
   the fix turns on — probe scripts (`.mjs`, `.ps1`, `.ts`) and
   trace and data files (`.py`, `.svg`, `.png`, `.jpg`, `.json`,
   `.md`, `.txt`, `.csv`, the rest) — with the K863 subtree as
   its own row. Under today's frontmatter every one of them
   attaches `probes.md`: the table says so, with the counts.
2. Narrow the paths. Replace `.claude/probes/**` in the
   frontmatter with patterns that cover the probe scripts and
   not the trace data (extension-scoped patterns over the same
   tree, in the style the other rules files use; keep the
   `scripts/*` and `probe_hooks.ts` entries as they are). The
   census script grows a matcher for the patterns it is given
   (state the matching rule it implements) and re-reads the
   tree: every `.mjs` and `.ps1` probe file still covered, and
   no `.py`, `.svg`, `.png`, `.csv` or `.md` file under
   `.claude/probes/K863/` covered. If the pattern language
   cannot say that, split instead on K173's pattern (the
   browser-probe lore moves to a topic file with the narrow
   paths; `probes.md` keeps the rest) and say so in the report —
   do not leave a pattern whose coverage the census cannot
   state. Update the `docs/lore_index.md` row to match the new
   frontmatter exactly.
3. The after census: the same script over the same tree. The
   table is the two censuses: script classes covered before and
   after (the same counts), trace classes covered before (all)
   and after (none under K863; state any trace class still
   covered elsewhere in the tree, and why it is a probe's).

Done:

- The after census: every probe script (`.mjs`, `.ps1`) in the
  tree is still covered by `probes.md`'s paths; no K863 trace
  or data file is.
- `docs/lore_index.md`'s row matches the frontmatter, and the
  lore's text is byte-identical (the diff is the frontmatter
  and the index row).
- `npm test` passes (nothing in the suite reads the rules; say
  so, and the run's evidence is the census).

Report: the before and after censuses, the patterns chosen (or
the split, and why), and the commits (the census script is
tracked with `git add -f`, as probe kits are).

Close: `ledger.mjs done K999 --commit <sha8> --what "probes.md's paths narrowed to the probe scripts; K863's trace and data reads no longer carry it"`.
Suggested ports: 5570-5574 (unused).

## Run E · K178: the private-cache vite wrappers

Read first: `.claude/rules/probes.md` (the private-cache wrapper
and why it exists); then the tracked exemplar
`.claude/probes/K1139/vite.private-cache.config.ts` whole, and
the four wrappers the item names:
`.claude/probes/K19-K20/vite.private-cache.config.ts`,
`.claude/probes/K79/vite.private-cache.config.ts`,
`.claude/probes/K99/vite.private-cache.config.ts` and
`.claude/probes/K104/vite.private-cache.config.ts` (the working
`.claude/probes/K80/rt/` copy is the comparison the item itself
makes).

The ledger says (Residuals):

> **K178** · Since K122 the private-cache vite wrappers of K19-K20, K79, K99 and K104 fail with
> ERR_MODULE_NOT_FOUND; K80's (`.claude/probes/K80/rt/vite.private-cache.config.ts`, which loads the config with `loadConfigFromFile`) works (`.claude/rules/probes.md`).

What is there today (read it, don't trust this summary). Since
K122 the checkout's `vite.config.ts` imports an extensionless
`.ts` module (`notices/vite_plugin`), which a native `import()`
cannot resolve. The wrappers that load the base config with
`loadConfigFromFile` (vite's own loader) work — K1139's tracked
copy and K80's — and K19-K20's copy has since been converted to
that shape. The other three still do
`(await import(own)).default` on the config's file URL, which is
the failing shape; K104's header comment even names K19-K20's
path in its run line, not its own. Batches 12 and 13 left this
item with the stale-probe family (the files are untracked, so
nothing to commit or test). That reason no longer holds for
these four files: they are the dev server every probe run
starts, the working pattern is a tracked file, a server start
is a decided check, and probe kits are tracked with
`git add -f` as they are used (K1139's harness, batch 15's
sheets). This run fixes the wrappers, and only them.

Tasks, in order (ports 5575-5579; one port per wrapper start,
in turn):

1. The before table. For each of the four wrappers: its import
   shape, and a start attempt on today's tree —
   `npx vite --config <wrapper> --port <its port> --strictPort --host 127.0.0.1`,
   stopped once it has answered or failed — with a `GET /`
   against it while it runs. Record per wrapper: the
   ERR_MODULE_NOT_FOUND (and the module it names), or the
   served page's status. K19-K20 is expected to serve already;
   the table says what it does, not what the item expected.
2. The fix. Rewrite the K79, K99 and K104 wrappers in the
   tracked K1139 shape: `loadConfigFromFile` over the checkout's
   `vite.config.ts`, spread, with the private cache beside the
   wrapper file. Each header keeps its own folder, port and run
   line (K104's names its own file after the fix). No wrapper
   gains a behaviour the exemplar does not have. K19-K20's
   wrapper changes only if task 1 shows it failing, and then
   the same way, said in the report.
3. The after table: the same four starts. Each serves the page
   (`GET /` 200, the app's HTML) with no module error in the
   server's output, and is stopped. Track the three rewritten
   wrappers with `git add -f`; no other probe file changes.

Done:

- All four wrappers start a dev server that serves the page;
  the three native-import wrappers are gone.
- The three fixed wrappers are tracked, in the K1139 shape,
  each naming its own folder and run line.
- `npm test` passes (the wrappers are not in the suite; say so).

Report: the before and after tables (import shape, start,
`GET /`), and any wrapper that already served.

Close: `ledger.mjs done K178 --commit <sha8> --what "K79, K99 and K104 private-cache wrappers load the config with loadConfigFromFile, as K1139's tracked copy does"`.
Suggested ports: 5575-5579.

## Run F · K484: the sheet's history entries

Read first: `.claude/rules/gameplay-panel.md` (THE SHEET ON
PHONES), `.claude/rules/probes.md`; then `SheetHistory`,
`SHEET_STATE` and its env and hooks in `src/ui/panel_sheet.ts`
(whole file), its rig in `test/ui/panel_sheet.test.ts` (the
history describe, lines 100-171), the wiring in
`src/ui/tweakpane_panel.ts` (the `sheetHistory` construction and
`setOpen`, lines 4020-4088), and the Handoff of
`docs/design/K467.md` (its three history cases, lines 217-221).
This run takes the two countable cases only; the third (a live
switch pushing an entry without a gesture, which Chrome may skip
on Back) is browser policy the state machine does not decide,
and stays in the item (the close lines say how). Batch 13 left
the item with exactly this split prescribed — "split it first,
with a browser stand for the two countable cases" — and this run
is that split.

The ledger says (Residuals):

> **K484** · Sheet history entries (K467): a stale entry after a reload or discard with the sheet
> open, an extra one on a fast close-then-reopen, and a live switch pushing one without a gesture
> (docs/design/K467.md Handoff)

What is there today (read it, don't trust this summary). An open
sheet owns one history entry: `open()` pushes it, `release()`
asks `history.back()` for it back and counts the pop it expects
(`pending`), and `onPop` spends a counted pop on rewriting the
link, or closes the sheet on a player's Back. The seven rig
cases pin that, including a reopen before the counted pop
arrives (it is not closed by it). Two cases the rig cannot see:
a reload with the sheet open leaves the pushed entry under the
fresh page — the fresh `SheetHistory` owns nothing, so the
first Back only rewrites the link and the player stays (an entry
a dead page pushed); and a close-then-reopen inside the counted
pop's flight pushes a second entry, leaving the first in the
stack (one extra entry per fast cycle). Both are stack counts,
so both are decidable in a browser.

Tasks, in order (ports 5580-5589):

1. The before tables. The pure half first: the existing rig
   cases pass (state it; they are the state machine's current
   word). Then the browser stand, `.claude/probes/K484/history.mjs`
   (headed real-time Chrome, the harness's own profile, a port
   in 5580-5589; load a full design link at a sheet viewport —
   412 x 915 CSS px, the panel closed on load as a sheet always
   is — and drive the sheet with the menu button, not with
   `SheetHistory` directly). Case A: open the sheet, reload,
   then one Back: record `history.length`, `history.state`, the
   sheet's open state and whether the address still holds the
   current design after the Back. Case B: five fast
   close-then-reopen cycles (each under 50 ms): record
   `history.length` against one open sheet's (the single entry
   it should own), and what a final close and Back do. The
   before tables: those counts, per case.
2. The state machine. In `src/ui/panel_sheet.ts`: (a) the env
   gains a read of the current entry's sheet mark
   (`history.state`'s `kmSheet`), and `SheetHistory` gains a
   load reconcile — when the page loads on a marked entry with
   the sheet closed, consume the stale entry the way `release`
   consumes an owned one (counted pop, link rewritten on it), so
   the first player Back after a reload behaves as a fresh
   page's would; (b) a reopen while our pop is still in flight
   defers its push until that pop arrives (an `open()` with
   `pending > 0` records the want; `onPop` spends the counted
   pop, then pushes), and a `release()` before the pop cancels
   the want — exactly one entry per open sheet, however fast
   the cycle. The wiring in `tweakpane_panel.ts` passes the mark
   read and calls the reconcile once at construction (the sheet
   starts closed there by rule). Cases in
   `test/ui/panel_sheet.test.ts`'s rig: the stale load consumes
   one entry (a back, then the counted pop writes the link and
   closes nothing); the deferred push (open, release, open: one
   back outstanding, no second push until the pop, one entry
   after it); the want cancelled (open, release, open, release:
   no push ever lands); and a Back arriving while a push is
   deferred closes the reopened sheet. Every existing case
   passes unchanged.
3. The after tables: the task-1 browser stand, same cases, same
   counts to make: case A's first Back after the reload is a
   fresh page's (no entry a dead sheet pushed is left to spend
   it on), and case B's five cycles leave `history.length`
   exactly one entry over the closed sheet's, with the final
   close giving it back.

Done:

- The two countable cases read as task 3 says, in the rig and
  in the browser; the existing sheet cases pass unchanged.
- Exactly one history entry per open sheet, at any toggle
  speed; a reload leaves none behind.
- `npm test` passes.

Report: the before and after tables (pure and browser, with the
counts), and the deferred-push cases.

Close nothing outright: the gesture case is still open.
`ledger.mjs` has no command that rewrites an item's text, so don't
edit K484 by hand: give its new line in your report, and Claude
applies it after the batch:
`**K484** · Sheet history: a live switch to the sheet with the panel open pushes an entry without a gesture, which Chrome may skip on Back (the stale-on-load and fast close-then-reopen entries fixed in <sha8>) (docs/design/K467.md Handoff)`.
Suggested ports: 5580-5589.

## Run G · K648: the streamers' sag across frame rates

Read first: `.claude/rules/render-confetti.md` (K336 STREAMERS);
then `stepStreamers` and the streamer layout it steps in
`src/render/confetti_model.ts` (lines 159-174 and 783-863),
`stepRain` beside it (the dt-exact shapes), the streamer cases
in `test/render/confetti_model.test.ts`, and the `step` that
hands it `dt` (clamped, at line 1164 of the model). This run
takes the item's sag half only; the phone half (a cannon arc's
distance from the phone's edge) stays in the item (the close
lines say how). Batch 13 grouped the two; the sag half is a
pure model with a numeric gate, decided here without the phone.

The ledger says (Residuals):

> **K648** · K336 leftovers: the streamers' sag only roughly holds across frame rates (the follow
> runs once a frame); on the phone the closest cannon arc tops out 0.081 w from its edge (median
> 0.26 w).

What is there today (read it, don't trust this summary). A
streamer's head integrator is analytic in `dt` (the drag gain,
the sway integral), so the head lands where it lands at any
step size. The body does not: each step, every body point sags
the full `dt`'s worth (`STREAMER_SAG * height * t`) and is then
pulled back to one segment length behind its predecessor,
once. At a large `dt` the chain therefore cuts corners the
small-step chain walks around, and the same streamer at 20, 60
and 120 steps a second trails three bodies. The view ticks the
model with the frame's `dt`, so the sag a player sees depends
on the frame rate it happens to run at.

Tasks, in order (ports 5590-5599, unused; no server):

1. The before table, pure. With the test fixture's seeded
   streamer (copy how `confetti_model.test.ts` spawns one),
   step 2 s of life as one run per rate — 240 x 1/120 (the
   reference), 120 x 1/60, 60 x 1/30, 20 x 0.1 — and record,
   per rate, the largest distance any body point ends from the
   reference run's same point (screen px at the fixture's
   height). The before table: those four numbers (the reference
   against itself is 0).
2. Substep the follow. In `stepStreamers`, the sag-and-follow
   pass runs in substeps of at most 1/60 s (the head's advance
   stays the one analytic step it is; the body's points sag
   and are pulled in each substep, chained). At `dt <= 1/60`
   the code path is the single pass it is today, so today's
   body points at 60 fps and above do not move: the existing
   streamer cases pass with their numbers unchanged. Name the
   substep cap in a comment with its reason.
3. The after table: the task-1 rates again. The 120 x 1/60 run
   is today's 60 fps body (identical, not merely close), and
   the coarser rates land within 2 CSS px of the reference's
   body points. If the cap misses that, halve it only if the
   60 fps identity still holds (it does while the cap stays at
   or above 1/60, so it cannot: report instead, and Claude
   decides the cap).

Done:

- After table: at 60 x 1/30 and 20 x 0.1 the body ends within
  2 CSS px of the 240 x 1/120 reference; at dt <= 1/60 the
  points are today's, exactly.
- `test/render/confetti_model.test.ts` passes with its existing
  numbers, plus the new rate cases; `npm test` passes.

Report: the before and after tables (max body-point distance
per rate), and the substep cap.

Close nothing outright: the phone half is still open.
`ledger.mjs` has no command that rewrites an item's text, so don't
edit K648 by hand: give its new line in your report, and Claude
applies it after the batch:
`**K648** · K336 leftover: on the phone the closest cannon arc tops out 0.081 w from its edge (median 0.26 w) (the streamers' sag holds across frame rates since <sha8>)`.
Suggested ports: 5590-5599 (unused).

## Left out on purpose, for a later batch

Every candidate the drafting run read and skipped, in the
drafting brief's order. An item an earlier draft left out is
taken here only where its reason no longer holds (Runs D, E, F
and G say why, in place); where the same reason still holds,
the item is named with it.

Step (1) is Run B itself. S4 is not in the batch: the drafting
brief holds it for Claude's look check on S3b's sheet, and Run
B stops there.

Step (2), `## Approved, to schedule` — batch 14's reasons were
re-checked against today's ledger and code, and each still
holds:

- **K22** — follows G3's design (K8), and K8 is still In
  progress with G3-3 waiting on Levi's phone look and the
  phone render-sync stage: its input is still gathered, not
  built. Nothing to schedule yet.
- **K23** — G3-5's GPU thread renderer, its After measurement
  and a forced-particle parameter cap: the thread renderer's
  GPU lane stays out of this batch (Run B's fan shader is the
  one named exception, as candidate (1)); batch 8's list also
  bars its render-to-own-texture swap.
- **K322** — an art-credits commissioning step: Levi's budget
  and taste gate its choice, and the credits page's code half
  (the K321 art section in `notices/credits.ts`) is already in.
  No test, probe or table decides it.
- **K805** — its gates have not landed: K797's stage d
  (textures) is still to build in Next, and K1149 (the dot
  dots K805 builds on) is still an open Next item, not done.
  Batch 14's reason stands.

Step (3), the residuals numbered above K1161:

- **K1165** — S1i's leftovers live in K1040's lane: its probes
  are `.claude/probes/K1040/s1/s1i_*`, its record says
  "another agent's WIP", and the drafting brief keeps that tree
  out (run 16J works there).
- **K1167** — pre-rewrite SHAs quoted in other repos:
  claude-config's ledgers and notes, levi.dev, hex-grid. The
  work is in those repos, with no knotmaze test or probe to
  decide it; it is Claude's config work, not a run here.
- **K1174** — `run_locked.ps1`'s leftover processes live in
  `.claude/probes/K1040/` (the K1040 s3 kit): the drafting
  brief keeps every run out of that tree.
- **K1177** — K907's phone pass scripts are only parse-checked:
  running them is a phone pass (K907's floor), which the
  drafting brief skips.

Step (4), `## Residuals` in ledger order from the top through
K648 (the runs taken are D at K999, E at K178, F at K484, G at
K648; everything skipped between them, grouped by reason):

- The junction and K1040 label lane, off limits (several are
  also S3's own input, which S4, not this batch, builds):
  K1130's neighbours K1048, K1047, K1046, K1000, K1002, K1003,
  K954, K957, K958, K966, K967, K972, K973 and K974 (K868's
  census, sites, covers and guards), K936 (K868's section-3
  sites), K933 (S3's socket table input), K719 (the fan's SVG
  row), K734 (screen-leg angles for S1j/S1k), K1122, K1123 and
  K1133 (the fillets' cost and shape; K1133 also shares
  `joinery.ts` with Run B), and K1042 (the physics sweep's
  timeout, whose fix is a cause, not a number).
- The cursive and text lanes: K982, K977, K978, K951, K947,
  K938 (K863's fit, trace, caps and mirror rules), K677, K555,
  K556, K560, K562, K583, K621, K622 and K642 (glyphs, taper,
  small caps and pairs), K564 and K565 (titled dailies: K115's
  text threads, and K565's fix waits on K571's call in Waiting
  on Levi).
- Physics, which the drafting brief skips: K11, K12, K13 (the
  anchors' triangle), K65 (the resting bulge), K29, K30, K50
  (the K41 links, the lone counterproof, the sleep-on-drag
  playtest), K16 (its phone-physics measurement), K136 (the
  pinned particle), K576 (the worker's sleep grid), K596 (its
  fix is K595's contact budget), K612, K615 (the physics and
  host costs), K51 (the unfed ratchet) and K214 (physics lore
  to trim).
- Looks, balance and placement, which are Levi's calls (batch
  13's and 14's reasons hold): K914 (the root pages' paint,
  its own text says Levi decides), K836 (K84's follow-ups: a
  border, a filled cell, a full-screen diff toggle), K834,
  K877 and K760 (K85 contrast, K84 hues, on the phone besides),
  K281 (the burn's shader stage, a look), K54 (background
  accents at the gamut edge), K26 and K27 (the pluck's crumple
  and the joint's fork-and-shield), K221 (the fit camera's
  feel), K95 (the badge's narrow placement, the same look
  K229 waits on), K133 (crossed joins by look), K143, K588,
  K638 and K659 (phone looks, a confetti palette, star
  thresholds), K668 (a new stalk state is Levi's K137 call, as
  K137 stage 9 is), K669 (monster routing is a balance call),
  K683 (collapse-mode copy and trim), K699 (paper-look
  routing, Levi's call as already filed), K712 (the panel
  rows: rescale, relabel or hide is Levi's, as batch 14
  found) and K62 (those same rows' two dead ones). K226's
  spider glyph waits on Levi's K627 call; K230's badge fit and
  K106/K107's pluck blur are the same eye's; K405's tip tint
  sits with them.
- The phone, which this batch does not touch: K892 (G3-3's phone
  half), K413 (the phone lock's waiter line is claude-config's
  process, CC62, and its script is untracked probe kit), K254,
  K252, K195, K196, K123, K131, K157, K172, K181, K189, K319,
  K342, K379, K460, K491, K497, K574, K594, K613 and K614
  (passes, kits, watchers and sync, several untracked
  besides), K300 (its one-line default is verified only by the
  next phone A/A, at K253's floor) and K301 (the A/A's tab —
  its cause is unknown, and batch 14's port-when-needed rule
  covers only what a probe starts).
- The thread renderer's GPU work, and the shader-text lanes
  batch 8 closed (Run B is the named exception): K242 (the
  scene and fillet shaders under load), K236 (the pluck
  overlay's rim needs a new across varying — more than the
  call-site of batch 8's stop rule 2), K354, K355, K356 (pluck
  profiles and tips), K163 and K164 (shader warm-up and farm
  cost, K307's lane, which is In progress), K380, K433, K540,
  K547 and K542 (G3 budgets and censuses owed), K700 (the
  paper stage's census on the phone's dynamics besides),
  K781 (chevron meshes: renderer perf and a look), K387 (flow
  displacement, a shader change with a look on it). K444
  (start-marker gap slots), K124 (the marker gaps' pop) and
  K474 (the notch's missing slot) are the gaps lane's,
  unattributed.
- The reveal lane (K76 is In progress; these are its design's
  residuals, and the section-5 lane owns them): K271, K258,
  K276, K287, K363, K424, K494, K537, K652 and K663 (weave,
  two-leg siting, textiles, glow and extras splits, all
  bundles to split first besides), K384 (the fire picker, the
  pieceVis guard and the load warnings, three unlike pieces),
  K450, K452 and K453 (tug, overlap and loop behaviour,
  inferred and not yet seen on a stand), K632 and K633 (the
  explore site testers; K633 reads 0 misses today).
- Bundles to split before any run can take a piece: K246 (pace
  links, the panel's clipped labels, the exporter), K205
  (K204's small leftovers), K278 (cross-artifact pins),
  K188 (confetti leftovers), K506 (K155's leftovers), K602
  (taps, notes, lockdown and the panel's keys), K640 and K641
  (the catch lane's windows and routes; K546, their design, is
  In progress), K737 (spool, echoes, joins, hints and compass
  across five play machines), K769 (its by-length step is
  balance besides), K771 (extras' indicators are new state
  and a look), K772 (an extra catch during the sword's flee:
  the right catch semantics are K768's call in Waiting on
  Levi, so the as-built stands untested there on purpose),
  K773 (probe hooks for one queue's worlds), K782 (seven
  unlike pieces) and K791 (the census's locks slice, from the
  unmerged ratchet work).
- Untracked probes and kits, where there is still nothing
  tracked to commit or test (Run E's wrappers are the
  exception, for the reason it gives): K417 (the census-fan
  probes' sampling calls), K262 (the K80/K100 harnesses'
  removed pieces), K223 and K220 (the tooling's anchors and the
  fan census's metric), K159 (its probes' stale lines), K295,
  K303, K304, K349, K374, K375, K391 with K420 and K457 (the
  same stale probe_daily, three filings), K422 (the K120
  probes' two failing checks), K425 (variant scripts writing
  into the renderer), K476 (the census's leaked Chrome
  profile), K487 (probe sheets predating the sheet), K504
  (probe build naming), K508 (superseded probe scripts), K639
  and K660 (the sim kit's removed walk shape) and K670 (shell
  snippets in the tooling notes).
- Dated records and prose, where rewriting history is not a
  fix a test decides (batch 11's reasons, still true): K416
  (the staged split's own document, stale past §2.3), K267
  (highlightMode and v4 links in design docs and brief
  templates — the live lore already carries the removals, as
  `gameplay-links.md` and `render-paint.md` read today), K407
  (re-pinning probe links in probe records) and K285 (the
  citation details, which wait for the records that would
  confirm them).
- Rules edits that share Run D's file: K390 (the fog A/B
  recipe's `&phw=0`, a line of `.claude/rules/probes.md`) and
  K435 (the burn's two lore lines, one of them also in
  `probes.md`). No two runs touch one file, so they stand for
  Claude to fold in at review; the third K999-family repair
  (K216, the hand-kept lore index) names no fix to take.
- Nothing to take as it stands: K44 (probe quirks, a bundle
  of one-offs), K69 (not reproduced on current builds), K103
  (frame clocks well past one run's size, as batch 12 found),
  K358, K520's and K528's kin (their triggers have not fired),
  K385 (its crash report is Levi's to submit), K386 (compile
  and probe residuals in the warm-up lane), K427 (the warm-up
  check's production blind spot, same lane), K431 and K432
  (probe stands and sheets that need a rerun, not a fix),
  K439, K464 and K503 (facade moves in the renderer, K503 the
  same leftover as K439), and K455 (physics-host snapshots,
  inferred, in the physics lane besides).
- Measurements and research with no defect to fix yet: K1130
  (a probe's first dark shot: the fix is a throwaway shot, a
  probe habit, with no tracked harness named), K142 (the
  screenshot harness's one dark frame), K150 (two windows on
  one fixed Chrome profile, fixed in claude-config's lessons,
  another repo), K190 (GPU and phone runtime, unmeasured),
  K232 (fleet and motion timing, to re-measure before any
  fix), K305 (unexplained thread-size steps), K367 (a ripple
  cost to measure), K378 and K540 (bisecting a load and a spike
  in dead commits), K382 (cold-cache chips, untimed), K428
  (A/B repeatability itself), K445 (sim-model fidelity,
  unmeasured), K575 (a hazard in a dead commit), K605 (a flake
  not seen since), K619 (canvas readbacks, no number against
  today's code), K665 (a fog IoU gap, untested as batch 14
  found), K679 (a verification finding with no code defect),
  K682 (a collapse bound to prove, which runs out at 20k
  bags) and K757 (audio gates that measure, not decide).
- Design first, or waiting on a design or a gate: K59 (two
  windows' attempt adoption is an open trade — batch 12's
  question still unanswered: the rebuild cost decides it),
  K740's remainder (the panel and sheet in the toast's avoid
  list, and the aids group by list rather than class: no
  placement under an open full-height panel is stated as the
  toast's target, so there is nothing to decide the run by),
  K756 and K761 (a wait action and the rule search, designs
  for Levi), K755 (beat-note latency, a scheduling design),
  K758 (a third-control design when one exists), K802 (locks
  wait on K138's stage 6), K803 (the page-check lane is
  batch 15's standing exception shape, not a residual run),
  K315 (the worker's killed-slice decision, physics), K446
  (unreachable while either cure stands), K458 (stopped-ticker
  timers, which batch 13 read as standing behaviour, no
  defect), K473 and K475 (fused tips and a tail run,
  unverified and unconfirmed), K498 (tap limits, measured,
  with no fix or tolerance stated), K511 (intentional and
  working), K512 (a probe recipe, no code), K520 and K528
  (their triggers have not fired), K535 (a snap cause in the
  joinery lane besides), K604 (nothing to do once K326 lands),
  K607 (a known probe workaround, in place), K608 (a sliver
  corner, undiagnosed), K684 (an idle-slice design) and K701
  (a stale note about lengths, whose limits the test already
  pins: nothing to fix).
- Candidates that share a file with a run above, and so wait
  for a later batch on the no-two-runs rule alone: K208
  (`restoreYarn`'s direction rule — a tidy with no defect
  stated; it lives in Run B's `fabric_maze_renderer.ts`), K206
  (restored fog against the live stamp; the same file, and a
  physics probe besides), K217 (the trail split's placement;
  the same file), K222 (the fit camera's edge; the same file,
  and K198's own calls beyond it), K711's burn-at letter (b)
  (a burnt broken run drawn burning: its renderer half lives
  in the same file; its (d), (e) and (f) letters are a ceiling
  with no gate, an untracked probe hook and a loss case's
  reporting contract), and K348 (key-move edges, a bundle to
  split that also shares Run C's `input_keys.ts`).

Not candidates for this draft at all: the `## Next` section
(the drafting brief's sources are the Approved and the
Residuals; K1147's phone runners, K1095's chord-walk layout
(Levi's call, as its own text says) and the rest wait there),
the other In progress items (K1040's binds — run 16J's lane —
K8, K76, K137, K138, K290, K307, K546, K692, K716 and K1097
among them, each with its own brief, queue or stage gate), the
Waiting on Levi section (K1163's outcome matrix and K1166's
mapped screens among them: answers for Claude, not runs), and
K1168 (Claude's own brief; its Worker and D1 calls are Levi's
OAuth, and Muse does not book Muse runs).

# Muse batch 19 (K1192)

Claude starts these runs through Paseo, one run at a time, after
batch 18 (`docs/design/K1189_muse_batch18.md`, K1189) was reviewed
and closed. Each run is a fresh Muse agent that reads this brief,
does its run's tasks, and stops. Claude reviews each run on master
afterwards and closes K1192.

This was a drafting run (Run A,
`docs/design/K1192_muse_batch19_run_a.md`), so the batch's runs are
B to G in the drafting brief. Four runs fit (B to E below), and
Claude added Run F (K1182's examination, ports 5740-5749) after
judging Run C's sheet; G is not commissioned, and its port range
(5750-5759) stays unused. The chain tags are 19B to 19F, one run
at a time. Batch 19 uses ports 5700-5759, one range per run.

Runs came from the candidates in Run A's order:

- (1) Junction work (Levi, 2026-11-04: "perfecting all junction
  and cursive work is always my main priority"), one bounded stage
  each, inside the lanes the running Claude agents leave free:
  K1186's flip count fits (Run B), K1182's G1 rim fits (Run C) and
  K1191's three examinations fit as one run (Run D).
- (2) Claude's picks from batch 18's reviews: one piece of K782
  fits (Run E, the waiting follower's mud cut). K711 fits no piece
  ("Left out on purpose" below says why for both of its leftovers).
- (3) "Next, in order", items numbered above K1188: there are
  none. The section's highest item is K1188 itself (batch 18's
  Run E), and K1186, its only other item above K1112, is Run B
  from step (1). Nothing was read again below that; Run A directs
  this draft to read only the items above K1188 there, batch 18's
  draft having left the whole section read.
- (4) Residuals numbered above K1189, except the ones Run A's
  list names: K1191 is the only one, and it is Run D from step
  (1). K1193 and K1194 sit above K1189 too; both are cursive
  (K1112/K1119's lane, which Run A skips), so neither fits. The
  rest of Residuals was not read again (Run A directs it).

No item ends outright: Run B only counts, Run C stops at its look
sheet, Runs D and F only examine, and Run E takes one piece of K782 and
leaves the rest. Their close lines give any rewritten item text in
their reports, for Claude to apply (`ledger.mjs` has no command
that rewrites an item's text, so a rewriting close says so, as the
drafting brief requires). A run that stops keeps its item open
(batch 8 rule 1).

Every task is decided by a unit test, a desktop probe, a dry run
or a measurement table below, and none needs Levi or a phone.
Run C changes what the player sees, so its change stays behind a
switch that defaults to today's picture (the golden pins and
fixtures unmoved), it shoots a look sheet with the switch off and
on, and it stops there: Claude judges the sheet and flips the
default. Runs B, D and F change no `src/` at all. Run E changes what
the game does only by removing a wrong answer (a follower crossing
mud on its first step without paying the mud turn); it gates on
unit tests, not a look (batch 18's Runs B and C are the shape).

No two runs touch one file ("How to work", rule 3). Read the
whole brief before your first command.

## How to work

Batch 18's "How to work" applies unchanged: read it in
`docs/design/K1189_muse_batch18.md` (it sends you on to batch
17's, batch 16's, batch 15's, batch 8's ten rules and the shared
process in `docs/design/K1050_muse_week.md`) before anything
else. Read K1192 wherever it, or a page it sends you to, says
K1189, K1184, K1178, K1169 or K1131; the chain tags are 19B to
19F, and Claude starts them one at a time. Batch 19 uses ports
5700-5759; each run below names its own range. After each run,
update K1192's handle (the next run in B, C, D, E, F order, or,
after F, that all the runs are in and Claude reviews and closes
K1192).

GPU probes and timings hold the machine's perf lock (each
harness's `run_locked.ps1`). A Claude agent is running GPU probes
too, so a run may wait for the lock; never time without it.

## Run B - K1186 first step: count the flips, and the ink each moves

**Chain tag:** 19B · **Suggested ports:** 5700-5709 (the probe's
Vite dev server takes one port in this range).

This run changes no `src/`: it counts, on scripted drags and
sweeps, which junction pieces' per-frame choices flip, and how
much ink each flip moves. It names the stands and scripts it
used, so the fix stage (hold the choices, fade on change) can
rerun them. It stops at its tables: Claude reads them before any
fix is briefed.

### Read first

- `src/render/ribbon/joinery.ts`: the per-arm vote (about lines
  1564-1589: `a.top` is over-near and not under-near, `a.dives` is
  under-near with its gap starting within `FILLET_DIVE_NEAR`
  fillHalfs; `layerFor` sends a junction's discs to the top mesh
  only when some arm is top and none dives), the per-wedge layer
  (about 2370-2382: a wedge rides the top mesh iff the junction
  is top, or either of its arms is, and neither of its arms
  dives), the cover strips' layer (about 2718), and `armReach`
  (about 2159-2173: the flank reach is the least of the joint
  domain cap and the under-gap clamp, floored at
  `L * FILLET_GAP_MIN_FRAC`). Read the two-layer comment at
  about 209-214 too: since the per-pixel gap masks, the layer
  choice "no longer changes coverage" - whether a vote flip
  still moves ink is part of what this run measures, and a
  measured zero is an answer, not a failure. Line numbers drift:
  search for the names (batch 8 rule 2).
- `src/render/ribbon_renderer.ts`: it holds the `Joinery`
  instance the probes read (`this.joinery`; the facade getters
  about 729-735 and 928-934 are the shape). The choices
  themselves live in `joinery.ts`; this file is read only.
- The probe surface, read in `src/render/ribbon/joinery.ts`
  (about 244-276 and 1603-1621): `fieldProbe.arms(ji)` returns
  the last rebuild's arms for a junction, each carrying the
  `top` and `dives` the vote resolved, and `fieldProbe.center`,
  `.record`. `window.__knotRenderer()` (`src/app/probe_hooks.ts`,
  about 423-425) hands a probe the renderer. No new hook is
  needed, and none may be added: `src/app/probe_hooks.ts` is in
  the K1139 lane (Run A's skip list).
- `.claude/probes/K1139/strips.mjs` lines 1-25: its `STANDS`
  table and the shared link
  `k111&am=instant&fw=0&snd=none&phw=0` (`phw=0`, so every load
  sleeps in one state). Rule 11: any stand this run reuses is
  copied with its link and moves verbatim from that source, and
  the report names anything it adds or changes.
- `.claude/probes/K859/fallback_count.mjs` line 12: the frozen
  seed-3 stand's link shape. This run's knot stands drop its
  `tlk=border` (the fill look is the default and is what
  joinery draws) and name the change, per rule 11.
- `.claude/rules/probes.md` (every run with a probe reads it):
  a bare URL is today's daily, so probes load a full design
  link; a same-state A/B uses `&phw=0` with pinned clocks and a
  same-build control first; anything physics-dependent is shot
  through a headed real-time Chrome, never
  `--virtual-time-budget`.

### What is there today

> **K1186** · Fill look: hold junction pieces' per-frame choices (fillet layer vote, armReach clamp) while the
> knot moves and fade them on change, same picture at rest; first count which flip on scripted drags and sweeps
> and the ink each moves (K1179 review 5c). Muse; Claude judges the look.

Every frame the geometry moves, `rebuildFillets` re-derives each
junction from scratch: which mesh layer each wedge, disc and
cover strip rides, and how far each flank reaches before its
arm's nearest under-gap clamps it. Nothing is remembered between
frames (the review, section 5: "No geometric choice is
remembered"), so a choice sitting on its threshold - the dive
test's `FILLET_DIVE_NEAR` band, the vote's nearby-crossing sets,
the reach's domain-versus-gap clamp - can flip back and forth as
the knot moves, and each flip redraws that piece in its other
place. Whether that shows, and how much ink it moves, is
unmeasured. This run takes only the item's first step: the
count. The hold-and-fade fix is a later stage, briefed from
these tables.

### Tasks

Use ports 5700-5709 for the dev server. GPU work takes the perf
lock (`.claude/probes/K1139/run_locked.ps1 -Batch`, copied if
your harness needs its own); a Claude agent holds it too, so
wait inside that one command, and never time without it.

**Write set:** new probes and tables under
`.claude/probes/K1186/` only (`git add -f`). No change to
`src/`, `test/` or `scripts/`; Runs C, D and E touch none of
these files.

1. **The stands (name them in the report).** Fix two knot
   stands and copy them into the probe: (a) the frozen seed-3
   design, `?3&am=instant&snd=none&fw=0&phw=0` (K859's stand
   without its border-look keys, named per rule 11); (b) one
   denser design of your choosing at a fatter width (a
   `tw`/`cr` link the panel accepts; confirm the keys in
   `src/ui/url_state.ts` before using them, and record the full
   link). On each, the scripts are: a settle to sleep; three
   scripted drags (a pointer tug on a thread beside a junction,
   dragged across it and back, at the probe's pinned clocks -
   the drag paths and their sample points go in the report, so
   the fix stage replays the same motion); and two sweeps (the
   cusp radius `cr` stepped across its range, and the thread
   width `tw` stepped across its range, the knot at rest, one
   rebuild per step). State every link, move and step in the
   report.
2. **The flip count.** Per rebuild during the drags and sweeps,
   read every junction's arms through
   `__knotRenderer().joinery.fieldProbe.arms(ji)` and derive,
   in the probe: each arm's (`top`, `dives`) pair; each wedge's
   layer from the per-wedge rule (the junction top, or either
   arm top, with neither arm diving); and each arm's reach
   bound - which of `armReach`'s terms binds (the domain cap,
   the under-gap clamp, or the floor), recomputed in the probe
   from the formula as read above, with the reach's value. A
   flip is a change against the previous rebuild on the same
   stand and script: count flips per junction piece (arm vote,
   wedge layer, reach bound), per script, and give the rate
   (flips per rebuild, and per second of drag). Where your
   recomputed reach cannot be checked against the drawn flank,
   say so and count only bound switches your recomputation is
   sure of; a partial table with its limits stated passes, a
   silent gap does not.
3. **The ink.** For each flip, the ink it moves, two ways, both
   in the table: (a) geometric - the flipped piece's fan area in
   device px at the probe's zoom (the wedge's triangles, or the
   flank strip the reach change redraws); (b) drawn - the
   changed pixels in the junction's crop between the frames
   either side of the flip, less the same crop's median change
   on non-flip frames of the same drag, less the same drag
   replayed on the same build as a control (probes.md's
   same-build control: run it first). Report both per flip
   kind, with the control's own numbers beside them, so a flip
   whose drawn ink is zero (the layer vote, if the gap masks
   have truly retired it) reads as zero with its evidence, not
   as a missing row.
4. **The tables.** `.claude/probes/K1186/` holds the probe, the
   raw per-rebuild dump and a summary table: per stand and
   script, flips by kind, the junctions that flip most (named
   by `fieldProbe.center` and record), and each kind's ink
   (median and worst flip, both measures). No `npm test` gate
   applies to probe-only work, but run it once and report it
   green, so the batch's base is known.

### Done and close

**Done when:**

- The tables exist under `.claude/probes/K1186/`: on both
  stands, the drags and both sweeps, flips counted per piece
  kind with their rates, and each flip kind's ink by both
  measures, controls beside them.
- The report names the stands (full links), the drag paths and
  the sweep steps, so the fix stage reruns the same scripts
  unchanged.
- No file outside `.claude/probes/K1186/` changed, and
  `npm test` passes.

**Close lines:**

This close rewrites K1186's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
counts recorded ("on <stands>: <n> vote flips, <n> reach-bound
flips over <n> rebuilds; worst ink <n> px (drawn) / <n> px
(geometric); tables at `.claude/probes/K1186/`") and the
hold-and-fade remainder kept, for Claude to apply by hand.
Then:

After the run, update K1192's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1192 --last-commit <sha8> --next "Run B done; Claude reviews it, Run C next"`

## Run C - K1182: the fill rim G1 at the flank tips, behind a switch

**Chain tag:** 19C · **Suggested ports:** 5710-5719 (the probe's
Vite dev server takes one port in this range).

This run changes what the player sees, so it builds the G1 rim
behind a switch that defaults to today's picture, proves it by
tangent tables and unit tests, shoots a 2x look sheet of four
junctions with the switch off and on, and stops there: Claude
judges the sheet and flips the default. It does not call the
look settled, and the golden pins and fixtures stay unmoved.

The switch's form (picked here, as Run A directs, from how
earlier look-gated changes did it): a module flag in
`src/render/ribbon/rim_curve.ts` itself, exported beside
`rimCurvePoints` with a setter the probe calls, defaulting to
today's curve. Batch 17's Run G gated the panel marks the same
way in spirit (`:root[data-dogear]`, set only by its probe,
`DOGEAR_NOSHOOT` census first), and a probe reaches a `/src`
module in the page through the dev server (`.claude/probes/K292/dogear.mjs`
imports `/src/ui/url_state.ts` in `page.evaluate`; the Vite
module graph makes that the same instance `joinery.ts` calls).
A panel param is the wrong form here: it would append to
`CODEC_PARAMS`, grow a panel row and move the codec pin for a
look nobody has judged. The flag touches no caller, which is
what keeps this run inside `rim_curve.ts`.

### Read first

- `src/render/ribbon/rim_curve.ts` (whole, 81 lines): both
  branches - the corner-projection cubic (G1 at both tips, but
  measured nearly dead: a negative projection on at least one
  side at 392 of 392 wedges of the frozen seed-3 maze) and the
  quadratic through the corner (the de-facto rim; its end
  tangents point at the corner, so each tip join is G0). Its
  header records why the arc-fit tangent-Hermite replacement
  stays out (it overshot into neighbouring threads at tight
  junctions and churned 163k px) and names the biarc through the
  corner region as the next candidate, with this function as
  its seam.
- `test/render/rim_curve.test.ts` (whole): the two branch pins
  (the pre-K859 curves reproduced to 1e-12), the documented
  kink (`sinBetween` over 0.3 at the fallback's start), the
  wedge-angle sweep and the near-parallel cases. These are the
  junctions your tangent table extends: the same synthetic
  tips, tangents and corners, plus the sweep's angles.
- `docs/design/K1179_geometry_review.md` sections 2-3 (the rim
  as a quadratic meeting the flank tips with a tangent break;
  route 1, "today, cleaned up": a biarc rim for G1 at the flank
  tips) and section 7's criterion 2 (G1 where pieces meet: a
  tangent jump of at most 1 degree). Where this run and the
  review differ, this run wins on scope: `rim_curve.ts` only.
- `src/render/ribbon/joinery.ts` about 2512-2561 (read only):
  the one caller. A rounded wedge calls `rimCurvePoints` with
  the two flank tips, their tangents, the corner and `n`; a
  sharp wedge pushes the corner itself and never calls it.
  **If the biarc needs this file, or any other file in the
  K1139 lane (`joinery.ts`, `junction_field.ts`,
  `junction_routes.ts`, `arm_strip.ts`, `paint_math.ts`,
  `paint_glsl.ts`, `pulse_path.ts`, `fabric_maze_renderer.ts`,
  `ribbon_renderer.ts`, `src/render/ribbon/` beyond
  `rim_curve.ts`, `src/app/probe_hooks.ts`, their tests,
  `test/render/fixtures/`, `.claude/probes/K1139/`), stop and
  report what it would change (Run A's rule for this run).**
- `.claude/probes/K1139/strips.mjs` lines 1-25 and
  `.claude/rules/probes.md`: the stands the sheet copies (rule
  11) and the probe habits (full design links, `phw=0`, pinned
  clocks, headed real-time Chrome, the perf lock for GPU
  work).

### What is there today

> **K1182** · The fill rim meets the flank tips with a tangent break (G0 only:
> `src/render/ribbon/rim_curve.ts`, a quadratic); a biarc would make it G1 (K1179 review sections 2-3).

On every rounded wedge the rim leaves each flank tip along the
line to the corner, not along the flank's own tangent, so the
outline kinks at both tips (the test documents a sine over 0.3,
about 17 degrees, on its fallback case). The fan's solid rim
band straddling the line softens it in practice (K854, in the
header), which is why this is a look sheet and not a defect
fix: the biarc must make both joins G1 without the Hermite's
measured overshoot - it stays through the corner region, inside
the corridor the quadratic traces.

### Tasks

Use ports 5710-5719. The sheet takes the perf lock
(`run_locked.ps1 -Batch`); a Claude agent holds it too, so wait
inside that one command.

**Write set:** `src/render/ribbon/rim_curve.ts`, 
`test/render/rim_curve.test.ts`, and new probes and sheets
under `.claude/probes/K1182/` (`git add -f`). Nothing else;
Runs B, D and E touch none of these files.

1. **Before table (pure, unmodified source).** In
   `test/render/rim_curve.test.ts`'s manner, state the tangent
   angle jump at each tip join, in degrees, for today's curve:
   on the test's fallback case, on its cubic case, and across
   the wedge-angle sweep's angles (5 to 175 degrees), by the
   test's own 3-point end tangents. That table is the before
   table; state it in the report. (The fallback's start sine
   over 0.3 is already pinned; your table gives both tips, in
   degrees, at every swept angle.)
2. **The switch.** In `rim_curve.ts`, a module flag beside
   `rimCurvePoints` (a name in the file's style) and its
   setter, defaulting to today's curve. With the flag off,
   `rimCurvePoints` returns today's points bit for bit (the
   existing pins pass untouched, `fellBack` included). The
   header comment gains the flag's sentence: what it selects,
   that it defaults to today's picture, and that Claude flips
   it after judging the sheet.
3. **The biarc.** With the flag on, the fallback branch (only
   it; the corner-projection cubic is already G1 and keeps its
   points) returns a biarc through the corner region: two arcs
   meeting at a joint on the corner's side, each arc tangent to
   its tip's flank tangent at the tip, the pair meeting G1 at
   their joint, sampled to the same `n - 1` interior points.
   State in the report how the joint and the radii are chosen,
   and the degenerate answers (near-parallel tangents, a
   corner behind a tip, a zero-length side): finite points, no
   NaN, at the test's own edge cases. If the construction
   needs a second file, stop per Read first and report what it
   would change; do not widen the write set.
4. **After table + tests.** The task 1 table again with the
   flag on: at every swept angle and case, each tip's tangent
   jump at most 1 degree (the review's criterion), and the
   biarc's points stay within the corridor bound the existing
   sweep asserts (no point farther than a chord from the tip
   segment, as the Hermite's overshoot failed). New cases in
   `rim_curve.test.ts` pin: flag off reproduces both old
   branches exactly (the existing pins, rerun), flag on meets
   the 1-degree bound at both tips on the fallback case and
   across the sweep, and the edge cases stay finite. Rule 9:
   in a scratch change make the flag-on branch return the
   quadratic; show the new G1 cases fail, then undo it.
5. **The sheet (desktop probe).** Copy the `cross` and `four`
   stands' links and moves verbatim from `strips.mjs` (rule
   11; name anything you change), serve on a port in range with
   the private-cache config those probes use, pin the clocks
   as probes.md directs, and shoot 2x crops of four junctions -
   x4 ji 28, ji 147 and ji 149, and cross ji 33 (the junctions
   Stage 4's handoff in `docs/design/K1139_s3b_fix.md` crops) -
   each twice: flag off, then flag on (the setter called in the
   page, a rebuild forced the way the renderer's own update
   forces one, the same pinned state both times, a same-build
   flag-off/flag-off control pair first). One sheet, four
   junctions, off above on, under
   `.claude/probes/K1182/sheet/`. If a named junction draws no
   rounded wedge on its stand, say so in the report and crop
   the nearest that does, named by `fieldProbe.center` and
   record.
6. `npm test`.

### Done and close

**Done when:**

- Flag off: both pre-K859 branches reproduce bit for bit (the
  existing pins pass unedited) and the golden pins and
  fixtures are unmoved. Flag on: every tip join in the task 4
  table jumps at most 1 degree, the corridor bound holds, and
  the edge cases stay finite.
- The scratch change fails the new G1 cases (rule 9), and
  `npm test` passes.
- The 2x sheet exists under `.claude/probes/K1182/sheet/`:
  four junctions, flag off and on, the control pair beside
  them, shot at one pinned state.

**Close lines:**

Claude to mark the item done once the sheet is judged and the
default flipped:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K1182 --commit <sha8> --what "the fill rim is G1 at the flank tips (a biarc through the corner region behind a rim_curve flag, default flipped after Claude judged .claude/probes/K1182/sheet/)"`

Until then the item stays open with the flag defaulting to
today's curve. After the run, update K1192's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1192 --last-commit <sha8> --next "Run C done; Claude reviews it and judges the sheet, Run D next"`

## Run D - K1191: Stage 4's three unexamined leftovers

**Chain tag:** 19D · **Suggested ports:** 5720-5729 (only if a
fresh dump needs a server; the handoff's dumps are on disk).

This run changes no code anywhere: it examines the three things
Stage 4's handoff left unexamined, and each examination ends in
a table and a cause, or "not found" with what was ruled out. It
copies the tools it needs from `.claude/probes/K1139/` into
`.claude/probes/K1191/` and changes nothing under
`.claude/probes/K1139/` (that lane is a running Claude agent's).

### Read first

- `docs/design/K1139_s3b_fix.md`, Stage 4 and its handoff
  (from its `## Stage 4` heading to the end): the cover model
  (per sample, the last covering fillet primitive in draw order
  wins; a fan triangle whose `aLook` at the pixel centre
  exceeds 1.001 writes no sample there), Task 2's wedge table
  (x4 ji 147 keeps 52 GPU-only wedges: p10 -0.7, p90 -0.1, 40 of
  them beyond strip reach on 4-fan-sample pixels), Task 3 (all
  6055 beyond-reach GPU-only wedges at x4 ji 28 carry record
  2129 on all 4 samples, 24220 samples; four ji 28: 6494 px,
  6493 of them all-2129), Task 5 (record 2668's fan primitive,
  drawn after ji 33's 2591, covers the cross t7 box's left part;
  inferred, not checked: 2668 is ji 34's fan), and its final
  "Not examined" line: `crotch_fill.mjs`'s "ji 147 unlit arm 1,
  276 px" (`crotch_x4_147.txt`); which junctions aRec 2129 and
  2668 are.
- `.claude/probes/K1139/out/s4/wedge/crotch_x4_147.txt` (the
  276 px line in full: fan px 58740, unlit arms [1] px 276, and
  at every far-edge extent the unlit-arm pixels carry no fill
  over 0.02) and the wedge tables beside it (`x4_147.txt`,
  `cross_33.txt`, `four_28.txt`).
- The tools, in `.claude/probes/K1139/` (read, then copy):
  `wedge_s4.mjs` and `wedge.mjs` (the wedge census), 
  `cover_lib.mjs` (the cover model), `diag_s4.mjs` (the dumps:
  strip twins as `.s.*`, and `r<ji>.tri.bin`, every fillet
  triangle in page px with its `aLook` and `aRec`),
  `crotch_fill.mjs` (the unlit-arm count), `px_s4.mjs` (pixel
  attribution). The handoff's Env lines name the server (5620
  in its worktree; yours is 5720-5729), the preview root and
  `run_locked.ps1 -Batch`. **Its dumps under
  `.claude/probes/K1139/out/s4/d/` are untracked and live in
  Stage 3's worktree, not in this checkout:** say in the report
  whether they are reachable here; if they are not, retake the
  dumps you need with the copied tools, on the stands below,
  rather than reaching into `.claude/worktrees/` (Run A bars
  that tree).
- `.claude/probes/K1139/strips.mjs` lines 1-25 (`STANDS`, the
  shared link `k111&am=instant&fw=0&snd=none&phw=0`) and
  `.claude/rules/probes.md`: rule 11 stands, `phw=0` same-state
  loads, pinned clocks, the perf lock for GPU work.

### What is there today

> **K1191** · K1139 Stage 4 leftovers (handoff in `docs/design/K1139_s3b_fix.md`): ji 147's 52 GPU wedges; the
> full model's 12/6/11 threshold flips; no arc-true tau rate or obliqueness in the classifier; unexamined: ji
> 147's unlit arm 1, records 2129 and 2668's overlapping fans

Three of the item's clauses are Stage 4's to keep (the full
model's threshold flips and the classifier's missing terms are
recorded there, not this run's). This run takes the three
unexamined ones. What Stage 4 established, and this run starts
from: at ji 28 the "darker bare fan" was not ji 28's fan at all
- every beyond-reach GPU-only wedge pixel carries a neighbour's
primitive on all four samples - and at cross t7 the jump is a
neighbouring record's MSAA edge. Records 2129 and 2668 are the
two neighbours neither task named. At ji 147, 52 GPU-only
wedges survive the composite model, all within a luma of it
("threshold flips, not a structure", inferred), and 276 fan
pixels sit on unlit arm 1 with no fill over them at any extent
checked.

### Tasks

Use ports 5720-5729 if a server is needed. GPU work takes the
perf lock; a Claude agent holds it too, so wait inside that one
command.

**Write set:** copies and new scripts under
`.claude/probes/K1191/` only (`git add -f`), and their output
tables there. Nothing under `.claude/probes/K1139/`, no change
to `src/`, `test/` or `scripts/`; Runs B, C and E touch none of
these files. A copied tool keeps its header's stand links
verbatim (rule 11); where a copy must change (its output path,
its port), the copy's header names the change.

1. **Setup.** Copy the tools Read first names into
   `.claude/probes/K1191/`. State in the report which dumps you
   read (the tracked `out/s4/` tables) and whether the
   untracked `out/s4/d/` dumps were reachable; if a dump a task
   needs is missing, retake it with the copied `diag_s4.mjs` on
   the `x4` and `cross` stands (links and moves verbatim from
   `strips.mjs`), under the perf lock, and name the retaken
   files. The `__k1139diag` hook the handoff used is out of the
   tree today (its Env line checks it out from 55990189 and
   takes it out after): **do not check it out** - it edits
   `src/render/ribbon/joinery.ts`, in the K1139 lane. If a task
   cannot be answered without it, that task ends "not found"
   with the hook named as what it would need.
2. **Which junctions are records 2129 and 2668.** From the
   dumps (theirs, or your retaken ones): map every record to
   its junction (`fieldProbe.record(ji)` over the stand's
   junctions, or the dump's own record table), and find the
   junctions whose fans carry `aRec` 2129 and 2668 in the
   triangle capture. Give a table: record, junction (its index
   and centre), stand and phase, how many triangles and samples
   carry it, and where its fan overlaps ji 28's foot (2129) and
   the cross t7 box (2668) - confirming or correcting the
   handoff's inferred "2668 is ji 34's fan" and naming 2129's
   junction, which no task named. End in the cause each overlap
   is (a neighbouring junction's fan drawn later over the
   first junction's foot, per the cover model), or "not found"
   with what was ruled out.
3. **ji 147's unlit arm 1 (276 px).** With the copied
   `crotch_fill.mjs` on ji 147's dump: which pixels are the
   276 (their phases, their place against arm 1's strip and the
   crotch), what the GPU draws there against what the cover
   model draws, and why arm 1 is unlit at them (no pulse band
   declares it, a band declares it but its crest reads zero
   there, or the fan's own base is dark there - the handoff's
   Task 3 inputs: the fan's base material, the arm strip, the
   band partition, the light). End in a table (pixel counts by
   phase and by which input differs) and a cause, or "not
   found" with what was ruled out.
4. **ji 147's 52 GPU wedges.** With the copied `wedge_s4.mjs`:
   the 52 by phase, their sample kinds under the cover model
   (how many are 4-fan-sample pixels, how many carry another
   record's sample - task 2's map may answer part of this), and
   their luma against the model, pixel by pixel. Test the
   handoff's inference (the GPU sits under 1 luma darker than
   the model, across the census's 2/255 line): give the luma
   distribution and say whether a threshold at the measured
   offset empties the count, or whether any pixel's structure
   (a band switch, a strip edge, a cover boundary) explains
   it. End in a cause, or "not found" with what was ruled out.
5. **The report's tables.** `.claude/probes/K1191/` holds the
   copies, any retaken dumps' tables, and one summary per task
   (2, 3, 4): the table, the cause or "not found", and whether
   it blocks K1139's merge (Stage 4's standard: an attribution
   that proves a defect blocks; a look or a threshold artefact
   does not). Run `npm test` once and report it green, so the
   batch's base is known; no test should change.

### Done and close

**Done when:**

- Each of the three examinations ends in its table and a
  cause, or "not found" with what was ruled out, under
  `.claude/probes/K1191/`; records 2129 and 2668 are named to
  their junctions or the report says why they cannot be.
- The report states which dumps were read or retaken, names
  any examination the missing diag hook bounds, and gives each
  finding's merge call.
- Nothing under `.claude/probes/K1139/` changed, no file
  outside `.claude/probes/K1191/` changed, and `npm test`
  passes.

**Close lines:**

This close rewrites K1191's text (`ledger.mjs` has no command
for it): the report must give the item's new text, with the
three examinations recorded ("records 2129/2668 are ji <n>/ji
<n>; ji 147's unlit arm 1 is <cause>; its 52 wedges are
<cause>", each or "not found" with its ruled-out list) and the
threshold-flip and classifier clauses kept, for Claude to
apply by hand. Then:

After the run, update K1192's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1192 --last-commit <sha8> --next "Run D done; Claude reviews it, Run E next"`

## Run E - K782's mud piece: a waiting follower's first step pays the mud

**Chain tag:** 19E · **Suggested ports:** 5730-5739 (Node tests
only; unused otherwise).

### Read first

- `docs/ledger_notes.md`, the K782 section (2026-11-04,
  shortened at batch 17's close): the full list this piece
  comes from. The mud clause is its last: "a waiting follower's
  first step still skips the mud cut". (The toast and the
  follower's snare check are its "Fixed since" lines, batch
  18's Run B and batch 17's Run E; neither is this piece.)
- `src/game/minotaur_turns.ts`: `extrasTurn` (about
  1410-1476). The awake branch (about 1421-1441) spends a
  `mudWait` turn standing, else steps and then cuts the path
  at a snare (`cutAtSnare`) or, failing that, at mud
  (`cutAtMud`, about 1432-1438: `before` is cloned when snares
  or mud exist, and a mud crossing keeps its step, ends the
  turn at the far end and sets `mudWait`). The waiting branch
  (about 1442-1457) - a follower whose wait runs out wakes and
  takes its first step - was given the same snare cut by batch
  17's Run E (its comment says "snare only") but never the mud
  cut: its `before` clones only when snares exist, and no
  `cutAtMud` follows. `cutAtMud` and `cutAtSnare` themselves
  are at about 770-799; read both.
- `src/game/mud.ts` (whole): `mudStep` (the first step of a
  path onto a muddy run) and the design's rule (a muddy run
  takes two moves to cross, for the monsters alike; the turn
  minotaur spends its next turn in the mud).
- `test/game/mud.test.ts`, "K137 s5 muddy monsters" (about
  101-140): `mudStep`'s cases and the turn minotaur's mud-wait
  pattern (every run muddy, `t.mud` set directly, the turn
  after a crossing stands). `test/game/lures.test.ts` (about
  118-138) is the extras fixture: `t.setMonsters([{kind:
  "sleeper", ...}, {kind: "follower", ...}], seed)` on a
  `TurnMinotaur`, then `t.turn(-1)`.

### What is there today

> **K782** · K137 s4 lure and snare residuals (K137_s4.md Handoff; list in docs/ledger_notes.md; the
> toast fixed in 8ba8dc69): a live switch to travel by length keeps dead snares drawn; a waiting
> follower's first step skips the mud cut; plus hover, a late lure clear, clk=beat, the glyph

A follower waits at its junction for its delay, then follows
your trail. Its first step is taken from the waiting branch of
`extrasTurn`, which batch 17 taught to cut at a snare but not
at mud: if that first step crosses a muddy run, the follower
crosses it whole in one turn and owes no mud turn, where the
same follower already awake would have its path cut at the mud
and spend the next turn standing in it (and where the player
and the minotaur both pay two moves for the run). Only this
piece of K782 is taken; the by-length snares, the hover light,
the late lure clear, clk=beat and the glyph all stay with the
item.

### Tasks

**Write set:** `src/game/minotaur_turns.ts` (`extrasTurn`'s
waiting branch only) and `test/game/mud.test.ts` (cases added
in "K137 s5 muddy monsters"). Nothing else; Runs B, C and D
touch none of these files. (`src/game/mud.ts` is read only:
`mudStep` and `cutAtMud` already say what the fix needs.)

1. **Before table (pure, unmodified source).** In
   `test/game/mud.test.ts`'s fixture style (`lures.test.ts`'s
   `setMonsters` for the follower, `mud.test.ts`'s direct
   `t.mud`), write the case first and record today's answer: a
   follower whose wait runs out and whose first step crosses a
   muddy run - today it ends the turn past the mud with no
   `mudWait` owed, and its next step is taken freely. State
   that answer, and the awake follower's answer on the same
   graph and mud (path cut at the mud, next turn spent
   standing), in the report as the before table. If no fixture
   graph you build makes the waiting follower's first step
   cross mud, say so and stop this run (batch 8 rule 2); do not
   widen the fixture until it does by construction, and name
   the graph you settled on in the report either way.
2. **Fix.** In the waiting branch only, give the first step
   the awake branch's mud cut, in the awake branch's order: a
   snare cut first (as today - batch 17's piece stands), and
   only when no snare cut, `cutAtMud`. `before` must clone when
   mud exists as well as when snares do, as the awake branch's
   does, so the cut has the pre-step state to stand the
   follower in. Nothing else changes: the wait's length, the
   trail, the follower's `at` handling on a snare cut, contact
   and the catch test after the step all read as today, and a
   first step that crosses no mud and springs no snare is bit
   for bit today's.
3. **Tests.** After the fix, the task 1 case reads: the first
   step crosses the muddy run and ends at its far end (the mud
   cut keeps the crossing step, as for every monster), `mudWait`
   is owed, and the follower's next turn is spent standing in
   the mud, exactly as an awake follower's is. The same case
   with a snare on the muddy run still cuts at the snare first
   (no mud cut on a snare-cut step). Every existing case in
   `mud.test.ts`, `lures.test.ts`, `snares.test.ts` and
   `minotaur_turns.test.ts` passes unchanged.
4. `npm test`.

### Done and close

**Done when:**

- Before: a waiting follower's first step over mud crosses
  whole and owes nothing. After: it crosses, owes the mud
  turn, and spends its next turn standing, as an awake
  follower's does; a snare on that run still cuts first.
- The four suites above pass, and `npm test` passes.

**Close lines:**

This close rewrites K782's text (`ledger.mjs` has no command
for it): the report must give it, with this piece recorded
("a waiting follower's first step is mud-cut since <sha8> (it
crosses and spends its next turn in the mud, as an awake
follower's does)") and the by-length snares, the hover light,
the late lure clear, clk=beat and the glyph kept, in both
`LEDGER.md`'s K782 and the K782 section of
`docs/ledger_notes.md` (which also keeps its "Fixed since"
line, gaining this piece), for Claude to apply by hand. Then:

After the run, update K1192's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1192 --last-commit <sha8> --next "Run E done; Run F next"`

## Run F - K1182: what cuts the biarc rim's gaps into stepped corners

**Chain tag:** 19F · **Suggested ports:** 5740-5749 (the probe's
Vite dev server takes one port in this range).

Claude added this run after judging Run C's sheet. Run C
(`ed14f2c9`) put a biarc fill rim behind the `rimCurveBiarc` flag
in `src/render/ribbon/rim_curve.ts`; its tests show it G1 at both
flank tips and at its joint. On its sheet, though, the flag on
grows sharp, stepped corners in the gaps between arms at four
ji147 and cross ji33: ji147's gap gains a square notch, and the
notch above its route band fills in; ji33's round gap turns
angular. ji28 and ji149 barely change. The flag stays off.

This run only examines: it finds which layer draws those corners
and why, with numbers, and stops. No `src/` or `test/` change, no
flip, no fix: Claude picks the fix from the report.

### Read first

- `src/render/ribbon/rim_curve.ts` (whole, 321 lines): the flag,
  `biarcPoints`, and the fallback quadratic. The quadratic is
  sampled at q = i/n for i = 1..n-1, so the flag-off rim's middle
  point P4 (n = 8) gives the corner back: C = 2 P4 - (A + B)/2,
  with A and B the two tips.
- Run C's commit message (`git show -s ed14f2c9`): how the biarc
  is built (the joint on the G1 locus nearest the quadratic's
  midpoint; each tip's heading along its tangent line, toward that
  midpoint; arc-length samples, the two tip steps at 0.65x the
  mean step).
- `src/render/ribbon/joinery.ts` about 2380-2585 (read only): the
  wedge. `flank()` samples each flank from 0.12 to 1.0 of the
  arm's reach, offset to the wedge-facing edge, and returns the
  tip's outward tangent (`tanA`, `tanB`); the corner is the edge
  lines' clamped intersection. The perimeter runs A's flank inner
  to outer, the rim's n - 1 = 7 interior points
  (`FILLET_BEZIER_STEPS = 8`), then B's flank outer to inner.
  `flankArr` is uniform along the rim (1 - 2 i/n), with the tips
  at +-(1 - 2/n) (K854). `rims[k]` (the rim with both tips) feeds
  K81's route bands through `rimsOf` (about 2313-2337): each
  band's turn is fitted inside the rim (`routeRim` and `turnFits`,
  about 2620-2665, bisecting the turn's start `d`), and the field
  shader draws the band from the record, not from geometry of its
  own. `armWinL`/`armWinR` cut the
  ribbons' own border out to the tip less 0.05 (K849, K854). The
  fan is `emitFan(rec, jx, jy, rim, flankArr)`: its apex is the
  junction centre, not the corner.
- `src/render/ribbon/joinery.ts` about 1715-1750 (`emitFan`: the
  band straddles the rim, `rimOff = fillHalf * 0.97`, `bandOut`)
  and `src/render/ribbon_mesh.ts` `TriFanMesh.pushFan` (about
  790-920): triangles (apex, rim[i], rim[i+1]); the band's inner
  ring is inset perpendicular to the rim by a 3-point central
  difference, its side picked per vertex toward the apex, and the
  outer ring is outset by `bandOut`.
- `src/render/junction_field.ts`, only the lines that read
  `aFlank`/`vFlank` (the border look's flank fade; read only).
- `.claude/probes/K1182/` (Run C's kit): `sheet.mjs` (stands,
  targets, and `setFlag`, which imports
  `/src/render/ribbon/rim_curve.ts` in the page, calls the setter,
  then `rebuildFillets(true)` and `tickPaint(0)`), `lib.mjs`,
  `png.mjs`, `run_locked.ps1`, the private-cache Vite config, and
  `sheet/` (`meta.json` gives each target's centre, record and
  on-off diff).
- `.claude/rules/probes.md`: the probe habits (full design links,
  `phw=0`, pinned clocks, headed real-time Chrome, the perf lock).

**The K1139 lane is read only.** A Claude agent works there:
`joinery.ts`, `junction_field.ts`, `junction_routes.ts`,
`arm_strip.ts`, `ribbon_mesh.ts`, `paint_math.ts`,
`paint_glsl.ts`, `pulse_path.ts`, `fabric_maze_renderer.ts`,
`ribbon_renderer.ts`, `src/render/ribbon/` (`rim_curve.ts`
included this time), `src/app/probe_hooks.ts`, their tests,
`test/render/fixtures/` and `.claude/probes/K1139/`. Every
what-if below runs in the page, through a wrapper the probe
installs; if a measurement needs a change to any `src/` file,
stop and report what it would change.

### What is there today

> **K1182** · The fill rim meets the flank tips with a tangent
> break (G0: `src/render/ribbon/rim_curve.ts`'s quadratic). 19C's
> biarc (ed14f2c9, flag `rimCurveBiarc`, left off) is G1, but on
> its sheet the gaps at four ji147 and cross ji33 grow sharp
> stepped corners (`.claude/probes/K1182/sheet/`): find what cuts
> them first.

The quadratic leaves each tip toward the corner, at an angle to
the flank. The biarc leaves each tip back along the flank's own
tangent line, which is the outline's direction there: walking the
gap's edge inward along arm A, the rim carries on smoothly. The
fan's perimeter, though, runs OUT along A's flank to the tip, so
with the biarc it turns back by nearly 180 degrees at the tip and
retraces the flank line before it curves across the gap. Five
things read the rim's points, and any of them could turn that
into a stepped corner. These are the hypotheses the tables test:

- **H1, fan folds.** The fan's apex is the junction centre. Where
  the rim, seen from the centre, runs backwards, triangles fold.
  The lore says an over-covering fan never leaves holes, but
  folded triangles draw straight edges.
- **H2, corridor exit.** The biarc leaves the corridor the
  quadratic traces (the triangle tip A, corner, tip B).
- **H3, the arcs.** Unequal radii: a tight arc spends one or two
  of the 8 steps and reads as a polygon corner, or turns tighter
  than the band is wide, so the band's offset ring folds.
- **H4, the flank coordinate.** `flankArr` is uniform in index,
  but the biarc samples by arc length, so the border look's flank
  fade (keyed on |vFlank|) moves along the rim.
- **H5, the route band.** K81's band at ji147 fits its turn inside
  `rims[k]`, so a different rim moves where the band turns.
- **H6, the band rings.** `pushFan`'s 3-point normal at a tip,
  where the perimeter turns back on itself, and at the first rim
  points; its side is picked per vertex toward the apex.

Not fed by the rim, but drawn beside it: the ribbons' border
windows (`armWin`, out to the tip less 0.05) and the gap mask.

### Tasks

Use ports 5740-5749. The probes take the perf lock
(`run_locked.ps1 -Batch`); a Claude agent holds it too, so wait
inside that one command.

**Write set:** new files under `.claude/probes/K1182/` only
(`git add -f`): the examination probe (for example `exam.mjs`),
its batch file, and its output under
`.claude/probes/K1182/exam/`. Run C's `sheet.mjs` and `sheet/`
stay as they are. No `src/` or `test/` change.

1. **Capture the real rims (desktop probe).** Use `sheet.mjs`'s
   stands, links, moves and targets, copied verbatim (rule 11),
   at the same pinned state: flag off, then flag on. In the page,
   wrap `TriFanMesh.prototype.pushFan` (reach an instance as
   `window.__knotRenderer().filletMesh`; both fan meshes share the
   prototype) around one `rebuildFillets(true)`, then restore the
   original. For each call whose `rec` equals a target's
   `fieldProbe.record(ji)` and whose `flank` is not null (a
   wedge), record the apex, `rim`, `flank`, `bandIn`, `bandOut`,
   and the vertices the call wrote (`vertexData` from its first
   vertex to its last: apex, rim ring, inner ring, outer ring).
   Record each target's `fieldProbe.routes(ji)` too (four ji147
   has a band): each route's arms, `d` and `m`. Save the captures
   as JSON, per target, flag off and on.
   A wedge is rounded when 7 rim points sit between its two tip
   vertices (the flank values mark the tips). Report each
   target's wedge count, how many are rounded, and on which the
   biarc fired (points that differ from the quadratic's).

2. **The geometry table (pure, from the captures).** For every
   rounded wedge of the four targets, flag off and flag on:
   - **H1:** the fan triangles (apex, p_i, p_i+1) whose signed
     area has the minority sign, over the whole perimeter and over
     the rim from tip to tip; and the largest backward angular
     step, seen from the apex.
   - **H2:** the largest distance of a rim point outside the
     triangle tip A, corner, tip B; and the largest distance
     between the on and off rims. Take the corner from the
     flag-off quadratic (Read first's formula). Check it
     reproduces every flag-off rim point to 1e-6; if it does not,
     name the wedge as the cubic branch and skip this column.
   - **H3:** both radii (fit a circle to each arc's samples, or
     rebuild them by Run C's construction), their ratio, the
     smaller radius against `bandIn` and `bandOut`, and the
     largest turn between consecutive segments, the tips included
     (the flank's last segment into the rim's first).
   - **H6:** the perimeter's turn at each tip vertex; the band
     quads whose orientation flips (inner: inner_i, rim_i,
     rim_i+1, inner_i+1; outer likewise); inner or outer ring
     points on the wrong side of the rim; and the largest angle
     between consecutive inset normals.
   - **H4:** the flank values against the rim's normalized arc
     length from tip A, and their largest difference.
   - **H5** (targets with a route): which wedge's rim each band's
     turn is fitted in, and its `d` and `m`, off against on.

   Name each column's unit (world units or degrees). ji28 and
   ji149 barely change, so they are the controls: a hypothesis
   that fires as much there does not explain ji147 and ji33.

3. **Pixel attribution (desktop probe, same pinned state).** Run
   C's on-off diffs are 664 / 4604 / 554 / 1725 px (four ji28,
   ji147, ji149, cross ji33; `sheet/meta.json`). Take a
   same-build off/off control pair first (0 px). Then run each
   what-if below, one at a time. Each wraps `pushFan` in the page
   (or replaces it with a copy whose change you name), matching
   wedges by `rec` and their order in the rebuild; never edit
   `src/`.
   - **A (H6), flag on:** the band rings rebuilt with normals from
     the rim's own tangent (a wider stencil, or the arc's analytic
     tangent).
   - **B (H4), flag on:** `flank` replaced by values uniform in
     arc length.
   - **C (H5):** flag off, each wedge's fan given its captured
     flag-on rim (the band turns as today, the wedge is the
     biarc's); then flag on, each wedge given its flag-off rim
     (the band turns in the biarc, the wedge is today's).
     `emitFan` sets the record's reach (`rec.rMax`) from the rim
     before `pushFan` sees it: say whether a swapped rim reaches
     past it.
   - **D (H1, H3 against H6):** the band dropped
     (`bandIn = bandOut = 0`), flag off and flag on: corners that
     stay come from the fill's shape or the route, corners that
     go came from the band.

   For each what-if and target, count the changed pixels against
   flag off and against flag on (exact and over 8, as Run C
   counts), and state the share of Run C's on-off diff it returns
   to flag off. The what-if that returns most of the diff at
   ji147 and ji33 names the layer that cuts the corners.

4. **The sheets.** Under `.claude/probes/K1182/exam/`:
   - One sheet: rows off / on, then each what-if's rows, columns
     the four targets, 2x crops at Run C's clips.
   - An overlay per target, off and on: a 4x crop with the
     captured rim drawn over it (off blue, on red), its points as
     dots, the inner and outer band rings as thin lines, and the
     apex marked. Map world to screen as `sheet.mjs`'s `screenOf`
     does.

### Done and close

**Done when:**

- The captures exist for the four targets, flag off and on, with
  the wedge counts (task 1).
- The table covers every rounded wedge of the four targets, flag
  off and on, all six columns, with units (task 2).
- The what-if counts, the control pair and both sheets exist
  (tasks 3 and 4).
- The report names the hypothesis (or hypotheses) the numbers
  support at ji147 and ji33, the what-if that returns the most of
  the diff, and what each other hypothesis measured.
- `git status` shows no change outside `.claude/probes/K1182/`.

**Close lines:**

K1182 stays open. The report gives the item's new text for Claude
to apply (no `ledger.mjs` command rewrites an item's text): today's
text with its last clause, "find what cuts them first", replaced
by what this run found and the evidence path, in at most three
lines.

After the run, update K1192's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1192 --last-commit <sha8> --next "Run F done; Claude reviews it, picks K1182's fix, and closes K1192"`

## Left out on purpose

Drafting order, with what was read and skipped. Runs B to E
above are the fits; everything named here was read and left.
(Run F is not a draft: Claude added it after judging Run C's
sheet.)

**Step (1), junction work (all three named pieces taken):**
nothing in the step was skipped. K1186 is taken as its first
step only (the count; the hold-and-fade stays with the item for
a stage briefed from Run B's tables), K1182 inside
`rim_curve.ts` behind its flag (if it needs the K1139 lane it
stops, per its Read first), and K1191 as examinations only (its
threshold-flip and classifier clauses stay with the item and
with K1139's own stages, as Run D says).

**Step (2), batch 18's follow-ups (one piece taken):**

- K782's mud piece is Run E. Its other pieces stay with the
  item, each read and left for the reason named: the live
  switch to travel by length keeping dead snares drawn - the
  rings are drawn by `syncSnares` in
  `src/render/fabric_maze_renderer.ts`, which Run A's skip list
  puts in the K1139 lane, so no run here may touch it; the
  hover light (an armed snare lights any run, though a snare
  takes only the runs at your junction) - a real piece, left
  because this batch takes one piece of a bundled item (batch
  18's Runs B and C are the shape) and its check needs pointer
  plumbing through `src/app/input_pointer.ts` and a glow read
  no hook exposes today, against Run E's pure unit tests; the
  late lure clear under length travel (read from the code,
  untested) and the clk=beat tools (untested) - neither states
  a wrong answer a table can pin without first building its
  stand, and the mud piece's stand already exists in
  `test/game/mud.test.ts`; the ring as a stand-in glyph - a
  look, Levi's call, and Run A bars items waiting on Levi.
- K711, both leftovers read and skipped. (d) `refire` is
  O(V^2) per breaking move (`src/game/fire.ts`, its selection
  loop): the item itself says it "is fine at today's sizes; add
  a heap if mazes grow" - mazes have not grown, and a heap swap
  whose before table already reads fine is not a fix (batch 8
  rule 8's spirit); it waits on the growth it names. (f) The
  broken-run counts needing `main.ts` to report every accepted
  run: the audit is every input path that can accept a run
  (pointer, keys, pad, gamepad, the beat rider, holds and Undo)
  across `src/main.ts`'s move machinery, with no single check
  that decides it - not one bounded stage. (`safeArms` and
  `fireTrapped` themselves already refuse broken runs, batch
  14's K711 (c) in `fire.ts`; what is left is the reporting
  audit, and it stays with the item.)

**Step (3), Next above K1188:** none exist (the section's
highest item is K1188, batch 18's Run E; K1186 is Run B from
step (1)). Nothing below that was read, as Run A directs -
batch 18's draft left the whole section read, ending at K10.

**Step (4), Residuals above K1189 (except Run A's named
items):** K1191 is the only residual there, and it is Run D.
K1193 (c's joins at their exit-port bound) and K1194 (c's
lead-in roughness, the er/es solves) sit above K1189 in
Residuals too: both are cursive, in the K863/K1112/K1119 lane a
Claude agent is running, which Run A skips. The rest of
Residuals was not read again (Run A directs it; batch 18's
draft read above K1184 there and batch 17's read the whole
section in a full circle).

**The skipped lanes, as Run A names them, and where they bit:**
K1139's junction pulse (its S4 agent's paths, `rim_curve.ts`
excepted for Run C - Runs B and D read those paths and copy
tools out of `.claude/probes/K1139/` without changing anything
under it, and Run C stops if it needs them); K1040's label pass
(K1097, K1143, K1157, K1180 and `src/render/field/`); the
cursive (K863, K1112, K1119, and K1193/K1194 above); K647
(waiting on Levi); physics (the simulation), phone passes,
items waiting on Levi (K1190 among them: Stage 4's look calls),
items In progress, K144 and K1168 (Claude's briefs; Levi's
OAuth client, Worker and D1), K1181 (the laptop's checkout),
and anything under `.claude/worktrees/` (Run D names it: Stage
3's untracked dumps live in a worktree, so it reads the tracked
tables or retakes its dumps in its own probe folder).

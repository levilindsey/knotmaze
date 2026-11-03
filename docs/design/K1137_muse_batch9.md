# K1137: Muse batch 9

Claude starts these runs through Paseo, one run at a time, after batch
8 (`docs/design/K1131_muse_batch8.md`) has been reviewed and closed.
Each run is a fresh Muse agent that reads this brief, does its run's
tasks, and stops. Claude reviews each run on master afterwards and
closes K1137.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. None changes physics,
junctions, the cursive, or the thread ribbons' shader text: Run A adds
a second placement for the key-hint discs behind a probe hook (the
shipped look stays as it is), Run B retraces two of batch 8's
measurements on the right stand and may narrow what the gap and fillet
passes redo (no picture change), Run C adds a test and a warning, and
Run D drafts the next batch's brief. Runs A and B both read
`src/render/fabric_maze_renderer.ts`, and B may change
`src/render/ribbon/explore_gaps.ts` and `src/render/ribbon_renderer.ts`
as batch 8's Runs D and E did, so the run order A to D is load-bearing:
each run starts from the latest master.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1137 wherever it says K1131, and use ports
5500-5549 (batch 8 used 5550-5599; each run below names its range).
One rule joins them, from batch 8's review:

11. A re-measurement copies the original stand's link verbatim, read
    from the old probe's source, not from a summary of it (this brief
    included), and its table names everything it adds or changes.
    Batch 8's brief called K1077's stands `fw=0`; they had the flow on,
    and the retrace found nothing (`.claude/rules/probes.md`, PROBE
    LORE 2026-11-03).

After each run, update K1137's handle:
`ledger.mjs handle K1137 --last-commit <sha8> --next "Run <X> done; next Run <Y>"`
(after Run D: `--next "Run D done; batch 9 complete, Claude reviews and closes K1137"`).

## Run A · K1132: the key hints pushed out past the head marker, for Levi's pictures

Read first: `.claude/rules/gameplay-moves.md` (MOVES BY DIRECTION, KEY
HINTS), `.claude/rules/probes.md`; then `hintMap` and `KEY_REACH` in
`src/ui/key_moves.ts`, `reachPoint`, `hintPoint` and `keyHints` in
`src/app/input_keys.ts`, `drawKeyHints`, `setKeyHints` and
`keyHintMarkers` in `src/render/fabric_maze_renderer.ts`, the
`__knotTurnMove` hook in `src/app/probe_hooks.ts`, and K332's probe
`.claude/probes/K332/hints.mjs` with its shots beside it.

The ledger says (Waiting on Levi):

> **K1132** · After you press an arrow key (or WASD) once, small arrows sit at the start of each run at your
> junction, showing which key takes it. At the default marker size they sit mostly under your own marker,
> and only their tips show. Move them out past the marker, or keep them as they are? Pictures:
> `.claude/probes/K332/shots/` (crop_*_5x.png; K332, 3346474f)

What is there today (read it, don't trust this summary). A hint disc
sits `KEY_REACH` (0.5) of arc along its run, radius r x
`CHEVRON_SCALE` (0.286 at the defaults), inserted below the head
marker, so the head marker covers most of it. `KEY_REACH` is a fixed
arc length, while the marker radius follows thread width and marker
size. The disc's point is `hintPoint`'s, which calls `reachPoint`: the
same reach point `keyDepartures` gives the key picker. The new
placement moves only the drawn disc; the picker and `hintMap` keep
`KEY_REACH`, so which key takes which run does not change. Levi
chooses between today's placement and one past the marker; this run
builds the second placement and the pictures, and changes nothing a
player sees.

Tasks, in order (ports 5500-5509):

1. The "out" placement: each disc's arc distance along its run is
   R_head + 1.25 x r_hint, where R_head is the radius the head marker
   is drawn with (find where the head marker is placed; if its visible
   disc is smaller or larger than that radius, use the visible one and
   say so in the commit) and r_hint the hint disc's radius, so it
   follows marker size and thread width. A run shorter than that
   distance keeps its disc at the run's end; count those in task 4.
   Today's placement stays the default. The switch is a probe hook,
   `window.__knotKeyHintPlace("reach" | "out")`, registered in
   `src/app/probe_hooks.ts` beside `__knotTurnMove`, which returns the
   placement in force; the next frame draws the new points (the
   `keyHints()` cache must not keep the old ones: key it on the
   placement too, and in "out" on the radii). No link param, no panel
   row, no stored setting. A unit test pins the arc distance of both
   placements for given radii.
2. The default is unchanged: a same-state A/B of the default placement,
   before and after the commit, reads 0 px in the three states of task
   3 (`&fw=0&phw=0` added to K332's link, every clock pinned per
   `probes.md`, a same-build control first, under the perf lock).
3. Pictures, in a copy of hints.mjs at `.claude/probes/K1132/`: K332's
   link (copied from hints.mjs verbatim), its three states (before the
   first press, after it, after one move), at 1400x900 (K120's
   `launch` default, which hints.mjs used) and at the phone's size
   (411x753 at dpr 2.625, the emulation in `probes-phone.md`, loaded
   at that size), each in both placements: 12 shots. Then a 5x crop
   centred on the head marker's page point for each (one box for both
   placements of a state), and one side-by-side sheet per viewport
   (rows: the three states; columns: reach, out). PNGs in
   `.claude/probes/K1132/shots/`. Take a throwaway first shot (K1130).
4. A census of both placements: walk 20 moves on seeds 7, 2 and 11
   (the first choice in key order at each junction), and at every
   junction count the discs that overlap the head marker's disc
   (center distance under R_head + r_hint) and, of those, the ones
   whose center lies inside it; disc pairs that overlap each other;
   discs that overlap another marker on screen (start, finish, and any
   other marker the renderer draws there); and discs held at a short
   run's end. Check too that both placements hint the same runs with
   the same keys. The table goes in the commit.

Done: the hook switches both ways on a live page; the default's A/B
reads 0 px; `npm test` passes; the 12 shots, their crops and the two
sheets exist; the census table is in the commit.

Close nothing: K1132 is Levi's, and Claude updates its pointer. If the
census finds "out" discs overlapping each other or another marker,
list those junctions in the commit; don't tune the rule.

## Run B · K1083 and K1133: retrace on K1077's own stand, with the flow on

Read first: the "Read first" lines of K1131's Runs D and E,
`.claude/rules/probes.md` (the 2026-11-03 PROBE LORE line and the K441
GOTCHA about `asleep`), `flowRender` in `src/app/frame_loop.ts`, and
"K1077" in `docs/design/K441_fire_frame.md`.

The ledger says (Next and Residuals):

> **K1083** · K1077: gap slots on the realtime burn stand, to retrace with the flow on. Run E (K1131) read
> cause none, 0 solves a frame, but with `fw=0`; K1077's link had the flow on
> (`.claude/probes/K1077/k441_page.mjs:114`), and its realtime extra was setMaskIds +0.19 ms, computeGapSlot
> +0.24 and sampleAt +0.28 at 1x (`docs/design/K441_fire_frame.md`, K1077). Next: rerun
> `.claude/probes/K1083/gaps.mjs` on that link.

> **K1133** · Burn re-declare: fillet rebuilds on front-crossing frames (2-3 per 119 on K1082's realtime
> stand, uwRev under-window updates, before and after the declare alike; split from K1082), measured with
> `fw=0`. On K1077's flow-on stand, buildProfile, pushFan and visit under rebuildFillets cost +0.42, +0.28
> and +0.23 ms at 1x, realtime over turn: retrace with the flow on, with K1083, before deciding.

What is there today (read it, don't trust this summary). At rest
(`restFrame`), `flowRender` runs `renderer.update()` when a GEOM push
or a dirty flag forces it, every other frame by `flowParity` (every
tick when only ambient motion is live), while revealing, or while
`needsFxRender()` holds; with the flow off (`flowStrength` 0, `fw=0`)
it returns early unless forced, revealing or `needsFxRender()`. An
update re-solves gap slots. Batch 8's Runs D and E measured stands
with `fw=0`, which removes the parity trigger: there the gap pass
stood pat on both clocks. K1077's realtime-over-turn difference was
measured with the flow on, before K1082's incremental declare
(afaccf39) landed.

Tasks, in order (ports 5510-5519, perf lock, headed real-time Chrome):

1. The stand: read K1077's link from `.claude/probes/K1077/k441_page.mjs`
   (about line 114) and what `run_k441.ps1` sets (seed, `R`, `H`,
   `EXTRA`, the clocks, and the build it serves), and copy the link
   verbatim into copies of `.claude/probes/K1083/gaps.mjs` and
   `.claude/probes/K1082/burn.mjs` at `.claude/probes/K1083/flow/`
   (both copies today carry `&fw=0&phw=0` and their own seed and race
   values: K1077's replace them). K1077 ran on the default worker
   host, and the renderer the counters wrap runs on main either way,
   so keep it; add only what a counter needs (`&snd=none` included),
   and name each addition in the table. Wait for `asleep` on both
   clocks before counting (the K441 GOTCHA in `probes.md`).
2. Trace, 120 frames per stand, turn and realtime, on master: per
   frame, whether `update()` ran and why (forced, `flowParity`,
   revealing, or `needsFxRender()` split as gaps.mjs splits its cause:
   `pending`, `fxLive`, `other`), `computeGapSlot` calls, chains and
   slots written, `setMaskIds` calls, `rebuildFillets` calls and their
   trigger (burn.mjs's counters), and the frame's ms columns. Then both
   clocks again with `&fw=0` added: the control, which must reproduce
   batch 8's zeros.
3. K1083, from the gap columns, realtime against turn:
   - Realtime does no more updates, solves or `setMaskIds` calls than
     turn: the realtime extra is gone since K1082, or it was the flow's
     own cost on both clocks. Close K1083 with the table:
     `ledger.mjs done K1083 --commit <sha8> --what "retraced with the flow on: no realtime extra"`.
     If the flow's per-update re-solve of every slot is not in the
     ledger already (search Next and Residuals for "flow"), file it:
     `ledger.mjs add --section Next --text "<what it costs a frame, on which stand>"`.
   - Realtime does more, because the burn front sets
     `exploreUpdatePending` on frames the flow would skip: build K1131
     Run E's task 2 (declare only the chains that changed) under Run
     E's checks and Done rows: the every-10th-frame stale check on the
     realtime and drag stands, and the same-state pair at 0 px with
     `&fw=0&phw=0` and pinned clocks (a whole-frame A/B needs the flow
     off: K75 in `probes.md`). The after table is this stand's counters.
     Close K1083 when they pass.
   - Realtime does more for any other reason: close nothing, and update
     K1083's text with the cause and the table.
4. K1133, from the fillet columns, the same way: if the realtime stand
   rebuilds fillets more often than turn, name the trigger
   (`tickPaintPalette`, the gap gate's `uwRev`, or the declare). Fix it
   only when it is the declare's own re-declare, under K1131 Run D's
   checks; otherwise update K1133's text with the flow-on numbers and
   the trigger. If both clocks rebuild alike, close K1133 with the
   table.

Done: the stand's link and every addition to it are in the table; the
`fw=0` control reproduces batch 8's zeros; K1083 and K1133 are each
closed with a table, fixed under batch 8's checks, or re-filed with
their cause.

## Run C · K1135: a behavior test for Reset's step re-anchor

Read first: `.claude/rules/gameplay-panel.md` (the panel's lore file);
then `row()`, the `reanchorStep` closure inside it and `doReset` in
`src/ui/tweakpane_panel.ts`, and K1115's commit 91387212 with its
tests.

The ledger says (Residuals):

> **K1135** · Reset's reanchorStep (K1115, 91387212; `src/ui/tweakpane_panel.ts` row()) reaches Tweakpane
> internals (`controller.value.value_.constraint_`, a StepConstraint's origin) and silently does nothing if
> they change; tweakpane is `^4.0.5` and the tests pin source text only. Guard: a behavior test on a real
> Pane (a happy-dom or jsdom dev dependency) plus a warn-once.

Tasks, in order (ports 5520-5529, if a run needs a server at all):

1. A test on a real Tweakpane Pane. Add happy-dom, or jsdom if
   Tweakpane 4 won't build a Pane under happy-dom, as a dev dependency
   pinned to an exact version published at least two weeks ago
   (`npm view <package> time`), and a test file that opts into it alone
   (`// @vitest-environment happy-dom`); the rest of the suite keeps
   its environment. Build a Pane, bind a stepped slider the way `row()`
   does, with a stored value between steps, run the reset path K1115
   fixed (export what the test needs, so the test and the panel run
   one code path), and assert that the value lands exactly on the
   default and the step constraint's origin moved. Prove the test
   catches a break: a scratch change (rule 9) that skips the re-anchor
   fails it.
2. A warn-once: when `reanchorStep` can't find the step constraint, it
   calls `console.warn` once per page, naming K1135. The test covers
   that a binding without one warns once and only once.
3. `npm test` passes and `pwsh scripts/preview.ps1 -BuildOnly` builds
   (K1050's rule for a dependency change; never `npm run build` in this
   tree). The `credits.html` it builds (in the folder it prints) does
   not name the new package, since K122's notices list bundled packages
   only, and the lockfile changes only by the new package and its own
   dependencies.

Done: the test passes, fails on the scratch break, and covers the
warn-once. Close:
`ledger.mjs done K1135 --commit <sha8> --what "behavior test on a real Pane, plus a warn-once"`.

## Run D · draft batch 10's brief (no run)

Write `docs/design/K1137_batch10_draft.md`: a brief in this one's and
K1131's form (the header, "How to work" pointing at K1131's and this
brief's rule 11, then one section per run with Read first, the ledger's
text quoted, what is there today, Tasks, Done and the close lines;
ports 5550-5599), for up to six runs. Take the `Next` items in ledger
order that fit. Skip junctions, cursive, physics, the thread renderer's
GPU performance, phone passes, items waiting on Levi, items In
progress, and K1131's "Left out on purpose" list unless an item there
has since become possible (say why). Read each candidate's code before
writing its run: quote no line number you didn't read, and give any
re-measurement's stand as the original probe's source holds it (rule
11). End the draft with a "Left out on purpose" list naming each Next
item you skipped and why.

Commit it as a work commit (`K1137 D: batch 10 draft`). Close nothing
and file nothing: Claude reviews the draft, opens batch 10's item and
renames the file.

## Left out on purpose, for a later batch

- Junction S3c (no discards): it needs the phone and a Claude agent.
- Cursive v6.9: it waits on Levi's look (K1119).
- K1126, K1127, K1095 and every other look: they wait on Levi.
- The flow's own per-update re-solve, if Run B files it: it belongs to
  the flow-at-rest lever in CLAUDE.md's architecture audit, which wants
  a design before a run.

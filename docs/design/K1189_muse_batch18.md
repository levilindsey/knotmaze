# Muse batch 18 (K1189)

Claude starts these runs through Paseo, one run at a time, after
batch 17 (`docs/design/K1184_muse_batch17.md`, K1184) was reviewed
and closed. Each run is a fresh Muse agent that reads this brief,
does its run's tasks, and stops. Claude reviews each run on master
afterwards and closes K1189.

This was a drafting run (Run A,
`docs/design/K1189_muse_batch18_run_a.md`), so the batch's runs are
B to G in the drafting brief. Only four runs fit (B to E below);
F and G are not commissioned, and their port ranges stay unused.
The chain tags are 18B to 18E. Batch 18 uses ports 5640-5699, one
range per run.

Runs came from the candidates in Run A's order:

- (1) Claude's picks from batch 17's reviews: one piece of K782
  (the Snared toast) fits (Run B), K711's chase-tap piece fits
  (Run C), K1187 fits (Run D) and K1188 fits (Run E). None of the
  four is skipped; each run below says what it takes and what it
  leaves.
- (2) The "Approved, to schedule" items K22, K23, K322 and K805:
  none fits (the batch 17 reasons still hold, rechecked against
  today's ledger; "Left out on purpose" below says why).
- (3) "Next, in order", from K265 on: nothing there fits. The
  section was read from K265 to its end (K1188, already Run E from
  step (1)), then from its top (K875) through K10 (batch 17 read
  that stretch through K292; K292 now sits in Waiting on Levi).
  The last
  Next item read is K10, so batch 19's draft starts again at
  K265 (the section will have changed by then; this draft left
  nothing in it unread).
- (4) Residuals numbered above K1184, except the ones Run A's
  list names: K1187 is the only one there, and it is Run D.
  The rest of Residuals was not read again (batch 17's draft
  read the whole section in a full circle and found nothing
  more that fit, and Run A directs this draft not to repeat it).

No item ends outright except K1187 and K1188, and K1187 closes
only once Claude judges Run D's crops. Runs B and C each take
one piece of a bundled item and leave the rest; their close
lines give the item's new text in their reports, for Claude to
apply (`ledger.mjs` has no command that rewrites an item's
text, so the rewriting close says so, as the drafting brief
requires).

Every task is decided by a unit test, a desktop probe, a dry
run or a measurement table below, and none needs Levi or a
phone. Runs B and C change what the game does only by removing
a wrong answer (a toast that fires before the monster arrives,
a tap that walks a gone run); they gate on unit tests and probe
tables, not a look (batch 17's Runs C to F are the shape). Run D
changes what the player sees (a burnt stretch draws again), so
it shoots before/after crops and stops there: Claude judges
the crops before K1187 closes. Run E is tooling only, decided
by dry runs. A run that stops keeps its item open (batch 8
rule 1).

No two runs touch one file ("How to work", rule 3). Read the
whole brief before your first command.

## How to work

Batch 17's "How to work" applies unchanged: read it in
`docs/design/K1184_muse_batch17.md` (it sends you on to batch
16's, batch 15's, batch 8's ten rules and the shared process in
`docs/design/K1050_muse_week.md`) before anything else. Read
K1189 wherever it, or a page it sends you to, says K1184,
K1178, K1169 or K1131; the chain tags are 18B to 18E, and
Claude may start more than one at a time. Batch 18 uses ports
5640-5699; each run below names its own range. After each run,
update K1189's handle (the next run in B, C, D, E order, or,
after E, that all the runs are in and Claude reviews and
closes K1189).

## Run B - K782's toast piece: "Snared!" waits for the monster

**Chain tag:** 18B · **Suggested ports:** 5640-5649 (the probe
server takes one port in this range).

### Read first

- `docs/ledger_notes.md`, the K782 section (2026-11-04,
  shortened at batch 17's close): the full list this piece
  comes from. The toast is its first clause.
- `docs/design/K137_s4.md`, Handoff's "Residuals": "The
  "Snared!" toast fires when your move is accepted, before the
  monster visibly reaches the snare."
- `src/main.ts`'s `toolTick` (read for this draft): it counts
  the snares whose phase is not "set" on `scene.turnMino`
  (`tm`) and `scene.chase` (`cm`) and, when the count grows,
  calls `showToast` with "Snared! ..." at once, every frame,
  whatever either monster's animation is doing.
- `src/main.ts`'s `tickTurnMino` (read for this draft): main
  drives `scene.turnMino.setProgress(frac)` every frame - the
  wait clock's frac, else the fabric's `moveProgress`, else 1.
- `src/game/minotaur_turns.ts`: `progress` ("Animation progress
  through the last turn, [0, 1] (1 = at rest)") and
  `setProgress`; a turn sets `progress = 0` and `lastPath` to
  the cut path, and `extraSpot` / the minotaur's shown spot
  walk `lastPath` by `progress`. `springSnare` in
  `src/game/snares.ts` flips a snare to "holding" at decision
  time, before that walk is drawn.
- `test/game/snares.test.ts` (read for this draft): `line()`,
  `STALK`, `play` and `turnConfig` - the pure turn the Node
  search in task 1 drives on real graphs.
- `.claude/probes/K137/page/k137_page.mjs`'s header and
  `.claude/probes/K657/banner.mjs` (read for this draft): the
  standing headed-Chrome stand, real time, never
  `--virtual-time-budget`. The new probe copies K657's stand
  under rule 11 (its base argument, the `../K120/lib.mjs`
  launch it imports, the `knotmaze.panelOpen` preset and its
  full design links).
- `.claude/rules/probes.md` (every run with a probe reads it)
  and the rules file `docs/lore_index.md` maps to
  `src/main.ts`.

### What is there today

> **K782** · K137 s4 lure and snare residuals (K137_s4.md Handoff; list in docs/ledger_notes.md):
> the Snared toast fires early; a live switch to travel by length keeps dead snares drawn; a waiting
> follower's first step skips the mud cut; plus hover, a late lure clear, clk=beat, the glyph

On the turn clock a monster's turn is decided the moment your
move is accepted: its path is cut at the snare, the snare is
sprung ("holding") there and then, and `state.v` already reads
the stop. What the player sees lags: the renderer walks the
monster along the cut `lastPath` by `progress`, which main
advances over the move's animation (or the wait's clock). When
the cut left the monster a step or more to travel, `toolTick`
toasts "Snared!" while it is still visibly on its way. On the
real-time clock (`MinotaurChase`, `src/game/minotaur.ts`) a
snare springs in `moveMinotaur` at the vertex where the
monster stands, so next frame's toast is on time there. Only
this piece of K782 is taken; the by-length keeps, the
follower's mud cut, the hover light, the late lure clear,
clk=beat and the glyph all stay with the item.

### Tasks

**Write set:** `src/main.ts` (`toolTick` only; Runs C, D and E
do not touch this file), new `test/app/snare_toast.test.ts`,
and new probes under `.claude/probes/K782/` (`search.ts` with
its copied vite-node config, `toast.mjs`, `git add -f`).
Nothing else.

1. **Before stand (Node, unmodified source).** A search in
   `.claude/probes/K782/search.ts`, run through `npx.cmd
   vite-node` with a copy of
   `.claude/probes/K137/vite.node.config.mjs` beside it (the
   K137 sims' way). Build mazes the page's way
   (`.claude/probes/K137/k137_lib.ts`'s `buildDesign` /
   `designParams`, as `k137_sim.ts` does) and drive a
   `TurnMinotaur` on each walk built as `main.ts` builds it
   (`turnConfig(turnMinoParamsOf(params))`, `turnSeed(seed)`;
   name any param you had to fix because the search drives
   it directly). Script: wait
   (`turn(-1)`) until laying a snare on a run at the player's
   head is possible, lay it with `setSnare`, then keep waiting
   until a snare springs. Keep the first seed (say seeds 1 to
   100) whose springing turn's cut `lastPath` has at least one
   step - the monster visibly travels at least one run before
   it stands at the snare's near end. Record the stand in the
   report: seed, the link keys that reproduce it on the page,
   the move list, the snare's edge, the springing turn and its
   `lastPath`. If no seed in that range gives a cut path of at
   least one step, stop this run and say so (batch 8 rule 2);
   do not fall back to a hand graph on the page.
2. **Before table (desktop probe, unmodified tree).** A new
   `.claude/probes/K782/toast.mjs` (`git add -f`), copying
   K657's stand under rule 11 (base URL and output name
   change; its private cache and Chrome profile die with the
   run). Load the stand's link (not `am=instant`: the move
   must animate), replay the move list with
   `__knotTurnMove` / `__knotTurnWait`, lay the snare at the
   scripted turn through `__knotTurnMinoObj().setSnare(edge)`,
   and poll on a short timer from before the springing move:
   the first frame where `.km-toast.km-toast-on` reads
   "Snared! ...", together with `__knotTurnMino().progress`,
   its `minoAt` and the springing snare's phase. Today: the
   toast is first seen while `progress` is still under 1 on
   the springing turn. That table is the before table; state
   it in the report.
3. **Fix.** In `toolTick` (`src/main.ts`): read the sprung
   count as today, but on the turn clock show the toast (and
   advance the `snaresSprung` baseline) only once the turn's
   animation is at rest (`scene.turnMino.progress >= 1`; main
   sets it to 1 when nothing animates, reduced motion
   included). While `progress < 1`, leave the baseline
   untouched, so the toast is delayed, never dropped, and
   still fires once if two snares spring in one turn. With no
   turn minotaur (the real-time clock), today's immediate
   toast stands exactly. The toast's text, duration and
   counting (a "holding" or "spent" snare counts once, as
   today) do not change.
4. **After table + pin.** The probe again: the toast's first
   frame now reads `progress >= 1` on the springing turn, and
   its text is unchanged. A wiring pin in the new
   `test/app/snare_toast.test.ts`, in the panel_rect manner:
   read `src/main.ts`, slice `toolTick`'s body (from `const
   toolTick` to the `snaresSprung` assignment) and match the
   progress gate there, so a gate elsewhere in the file
   cannot satisfy it. Rule 9: in a scratch change drop the
   gate from the slice, show the pin fails, then undo it.
   The existing snare and monster suites pass unchanged (the
   model is untouched).
5. `npm test`.

### Done and close

**Done when:**

- Before: the toast's first frame reads `progress < 1` on the
  springing turn of the task 1 stand. After: its first frame
  reads `progress >= 1`, with the same text.
- The real-time clock's toast is not delayed (no turn
  minotaur, no gate): today's answer there stands, stated in
  the report from the code path, not assumed.
- The source pin catches the gate's removal (rule 9), and
  `npm test` passes.

**Close lines:**

This close rewrites K782's text (`ledger.mjs` has no command
for it): the report must give it, with the toast recorded
("the Snared toast waits for the monster's arrival since
<sha8>") and the by-length keeps, the follower's mud cut, the
hover light, the late lure, clk=beat and the glyph kept, in
both `LEDGER.md`'s K782 and the K782 section of
`docs/ledger_notes.md` (which also keeps its "Fixed since"
line), for Claude to apply by hand. Then:

After the run, update K1189's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1189 --last-commit <sha8> --next "Run B done; Claude reviews it"`

## Run C - K711's chase piece: a broken run refuses the chase tap

**Chain tag:** 18C · **Suggested ports:** 5650-5659 (Node tests
only; unused otherwise).

### Read first

- `docs/design/K137_s3a.md`'s Residuals (d to f: the item's
  source; this piece is the `__knotChaseTap` clause).
- `src/game/minotaur.ts` (read for this draft): `tap(edge)`
  queues a run when it touches the vertex ahead of the player
  and refuses nothing else - it never reads the graph's
  `blocked` set. `movePlayer` consumes the queue at a vertex
  and departs onto the queued run the same way. `ChaseGraph`
  owns `blocked` (`block(eid)` sets it when a run breaks;
  `from(..., "nobroken")` and contact already route around
  it), and `setBreakLimits` is how the chase learns the
  controller's break limits.
- `src/app/probe_hooks.ts` (read for this draft):
  `__knotChaseTap` calls `ctx.scene.chase.tap(edge)` directly
  and starts the chase on "queued" - it bypasses main's own
  tap path.
- `src/main.ts`'s `chaseAlong` and its route feeding in
  `tickChase` (read for this draft, read only here - Run B
  owns this file): both already refuse a run
  `scene.fabricController.broken(...)` names before they
  reach `chase.tap`, so the page's pointer and key paths
  already refuse broken runs; the model and the hook are the
  readers that do not.
- `test/game/minotaur.test.ts` (read for this draft): the
  K710 describe (`sim.g.block(1)` is how its tests break a run
  in the model) and "MinotaurChase: the player" (the tap
  answers the fix must keep giving). `MinotaurChase`'s replay
  (`replayChase`, same file area of `src/game/minotaur.ts`)
  replays recorded inputs through `tap`.

### What is there today

> **K711** · K137-b edges (K137_s3a.md Residuals d-f; b fixed in e5e75477): refire is O(V^2) per
> breaking move; __knotChaseTap ignores broken runs; broken-run counts need main.ts to report every
> accepted run (safeArms and fireTrapped count broken arms gone since c7e6329a)

In the real-time game the model itself is the refusal point
every other reader trusts: the minotaur's distances and
contact already treat a blocked run as gone. But `tap` queues
it anyway, and `movePlayer` then departs onto a run that is
not there - the fabric's controller refuses the same
departure on its side (`tickChase` warns once), so the
chase's player and the drawn dot part ways. The queue is
never re-read either: a run blocked while it sat queued
(the model blocks a run at a player's departure, `crossRun`
at depart; the unit tests block one directly) is departed
onto all the same, so the consumption point needs the same
refusal. Only this piece of K711 is taken - it is residual
(e) in `K137_s3a.md`; refire's O(V^2) (d) and the
broken-run counts (f) stay with the item.

### Tasks

**Write set:** `src/game/minotaur.ts` (`tap` and
`movePlayer`'s queue consumption only) and
`test/game/minotaur.test.ts` (cases added in the K710 and
player describes). `src/main.ts` is read only. Nothing else.

1. **Before table (pure, unmodified source).** In
   `test/game/minotaur.test.ts`'s fixture style (graph `G1`,
   the K710 `sim.g.block(...)` way of breaking a run), write
   the cases first and record today's answers: (a) with run 1
   (A-B) blocked and the player at A, `tap(1)` reads "queued"
   and stepping departs onto run 1; (b) queue run 1 from S
   (tap 0, then tap 1 while running), block run 1 before the
   arrival, and stepping departs onto it from A all the same.
   Those answers are the before table; state them in the
   report.
2. **Fix.** In `MinotaurChase.tap`: a run the graph has
   blocked reads "reject", exactly as a run that does not
   touch the ahead vertex does today (no input is recorded
   for it - `inputs` feeds `replayChase`, which must keep
   rejecting it too). In `movePlayer`, when the queued run
   is consumed at a vertex: if it has blocked since it was
   queued, drop the queue and depart nowhere (the player
   stands at that vertex; a later tap is read fresh). A
   player already standing on a run when it breaks is not
   this case and is untouched (`awaits` and the on-run reads
   keep today's answers). Nothing else in the chase changes:
   the minotaur's own movement, contact and the sword keep
   reading as today.
3. **Caller audit.** In the report, list every `chase.tap`
   caller as fixed at the source or already guarding:
   `__knotChaseTap` in `src/app/probe_hooks.ts` (fixed at the
   source), `chaseAlong` and the route feed in `src/main.ts`
   (already refuse `controller.broken` runs first; leave
   them untouched). Say so if any other caller appears.
4. **Tests.** After the fix: case (a) reads "reject", no
   departure is stepped and no input is recorded; case (b)
   arrives at A, departs nowhere, and the next legal tap
   from A still queues. Every case in the K710 and player
   describes that does not name a blocked run reads exactly
   as today, and `replayChase` over an input list that taps
   only unblocked runs replays as today.
5. `npm test`.

### Done and close

**Done when:**

- A blocked run reads "reject" from `tap` at the ahead
  vertex, and a run blocked while queued is never departed
  onto; unblocked taps queue, depart and record as today.
- The K710, player and replay cases pass, and `npm test`
  passes.

**Close lines:**

This close rewrites K711's text (`ledger.mjs` has no command
for it): the report must give it, with the piece recorded
("`__knotChaseTap` and the chase tap refuse broken runs since
<sha8> (the (e) piece)") and the (d) refire and (f) counts
leftovers kept, for Claude to apply by hand. Then:

After the run, update K1189's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1189 --last-commit <sha8> --next "Run C done; Claude reviews it"`

## Run D - K1187: the unswept stretch of a broken run draws its burn

**Chain tag:** 18D · **Suggested ports:** 5660-5669.

This run changes what the player sees (burnt thread appears
on a stretch that draws plain today) and stops at its crops:
build the fix, prove it by span tables and unit tests, shoot
before/after crops, and stop - Claude judges the crops before
K1187 closes. It does not call the look settled.

### Read first

- `src/render/fabric_maze_renderer.ts` (read for this
  draft): `syncBroken` - a broken run the dot is crossing
  (`this.anim`, a `MoveAnim` whose `from` / `cur` are ctrl
  positions) contributes only its swept span between `from`
  and `cur`; any other broken run contributes its whole
  span. `drawFire`'s burnt-spans loop - since batch 17's Run
  C it asks `runBurnAt(this.walk, fire, eid, L, (r) =>
  controller.broken(r))`, so a broken run of either kind
  pushes no burn span and no front. `syncExplore` subtracts
  `brokenSpans` from the pieces under both burnt looks, and
  passes the fire's spans as `char` under the char look.
- `src/game/fire.ts`'s `runBurnAt` (read for this draft): a
  run the `broken` predicate names reads unburnt at every
  clock; without a predicate it answers burning (burnt
  stretches and fronts, in distances from the run's va end)
  or burnt.
- `src/game/explore_view.ts` (read for this draft):
  `BurntSpan` ({chain, b0, b1} in ctrl), `subtractBurnt` and
  `cutPiece`'s endpoint behaviour - the span arithmetic the
  new helper mirrors.
- `test/game/fire.test.ts` (read for this draft): the K711
  (b) cases and their source pin of `drawFire`'s loop (this
  run updates that pin; it is this run's file). Its hand
  graph (`RUNS`: S-A 2, A-B 1, a second A-B 1, B-C 4, A-X 4;
  fire rate 0.5, hold 0) gives run 1 burning at clock 5 and
  burnt at clock 6.
- `test/game/explore_view.test.ts` (the helper's test home)
  and `.claude/rules/probes.md` (this run probes).

### What is there today

> **K1187** · Fire with breaking runs: a run that breaks behind the moving dot keeps its unswept stretch until
> the dot arrives (fabric_maze_renderer.ts syncBroken); since e5e75477 (K711 b) that stretch draws unburnt even
> where the fire reached it. Rare.

The unswept stretch is still thread until the dot arrives:
`syncBroken` keeps it drawn. But the fire stopped painting
it in e5e75477, because `drawFire` now asks about every run
with the whole-run broken predicate - correct for a run that
is gone whole, wrong for the one run whose unswept part is
still on screen. Under the "gone" look that stretch should
vanish where the fire burnt it; under "char" it should wear
the char; a fire front that stands on it should show. The
swept part is already gone by `brokenSpans` and must not
gain burn, char or a front back.

### Tasks

Use ports 5660-5669.

**Write set:** `src/game/explore_view.ts` (one pure helper
beside `subtractBurnt`), `src/render/fabric_maze_renderer.ts`
(`drawFire`'s burnt-spans loop only - `syncBroken`, the
smolder loop and `syncExplore` are read, not edited),
`test/game/fire.test.ts`, `test/game/explore_view.test.ts`,
and new `.claude/probes/K1187/` (`git add -f`). Nothing else.

1. **Before table (pure, unmodified source).** From
   `test/game/fire.test.ts`'s hand graph, state the span
   table `drawFire` pushes today for a broken run 1 that is
   the anim run, at clocks 5 (burning, burnt [[0, 0.5]], front
   [0.5] without a predicate) and 6 (burnt): today it pushes
   nothing at either clock, whatever the fire reached. State
   beside it what the unswept stretch needs: at clock 5 its
   burnt stretches, fronts and (under char) char spans are
   the no-predicate answer with the swept interval cut out;
   at clock 6 the whole run minus the swept interval. The
   swept interval, in ctrl, is the one `syncBroken` builds
   (`min(from, cur)` to `max(from, cur)` on the anim run).
2. **The helper (pure).** In `src/game/explore_view.ts`,
   beside `subtractBurnt`, a pure span cut (a name in that
   file's style): given a `BurntSpan` and a cut `BurntSpan`
   (ctrl, either end order), it returns the zero, one or two
   spans that lie outside the cut, dropping zero-width
   pieces and mirroring `cutPiece`'s endpoint behaviour (a
   cut that only touches an endpoint leaves the span whole;
   a cut on another chain returns the span untouched).
   Tests in `test/game/explore_view.test.ts`: a cut off each
   end, a cut through the middle (two spans), a cut that
   covers the span (none), a cut that misses (the span
   back), and a cut on another chain (the span back).
3. **Fix (renderer half).** In `drawFire`'s burnt-spans
   loop: for the anim run (`this.anim`'s edge, when an anim
   is running) ask `runBurnAt` with no broken predicate; for
   every other run keep today's predicate call. Convert the
   anim run's answer to spans as the loop does today, then
   cut each with task 2's helper by the swept interval
   before pushing it. Fronts follow the same cut: a front
   whose ctrl point (the loop's own distance-to-ctrl
   conversion, as `burnSpan` does it) lies inside the swept
   interval, or exactly at the dot (`cur`), is not pushed;
   a front outside it is pushed as today. The smolder loop
   stays as it is (it reads `choices()`, which already drops
   broken runs), and a broken run that is not the anim run
   pushes exactly what it pushes today.
4. **Pins.** Update the K711 (b) source pin in
   `test/game/fire.test.ts` to the loop's new form, and add
   a pin in the same manner: the loop slice cuts the anim
   run's spans by the swept interval (match the helper's
   call there). Rule 9 for both: in scratch changes drop the
   predicate from a non-anim call and drop the cut call,
   show each pin fails, then undo both.
5. **After table + crops (desktop probe).** First find the
   stand in Node (a script under `.claude/probes/K1187/`,
   through `npx.cmd vite-node` on a copy of
   `.claude/probes/K137/vite.node.config.mjs`): over real
   designs the page's way (as Run B's task 1), the first
   seed and move list where, mid-move, the anim run is in
   `brokenRuns()` and the fire's no-predicate answer on its
   unswept stretch is non-empty at the break's clock. Then a
   page probe copying K657's stand under rule 11 (Run B's
   read-first names it), ports 5660-5669, replays the move
   animated, polls `__knotFabric()` while the fabric is
   animating and the anim run reads broken, and crops the
   broken run's stretch (a choice's screen point from the
   fabric hooks names where it is) before the fix and after
   it, at the same progress window. Save the pair under
   `.claude/probes/K1187/sheet/`. If the Node search finds
   no stand in seeds 1 to 100, stop and say so (batch 8 rule
   2); the span tables above still go in the report.
6. `npm test`.

### Done and close

**Done when:**

- The anim run's pushed spans are its no-predicate burn
  with the swept interval cut out (the task 1 table at both
  clocks: burning and burnt); no front stands on the swept
  stretch or at the dot. Every other broken run pushes what
  it pushes today, and the K711 (b) cases pass as updated.
- The helper's cases pass, both pins catch their scratch
  removals (rule 9), and `npm test` passes.
- The before/after crop pair exists under
  `.claude/probes/K1187/sheet/` - or the report states the
  Node search found no stand, in which case K1187 stays
  open for Claude's call on the tables alone.

**Close lines:**

Claude to mark the item done once the crops are judged:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K1187 --commit <sha8> --what "a broken anim run's unswept stretch draws its burn again (its no-predicate burn with the swept interval cut out, fronts off the swept stretch); before/after crops at .claude/probes/K1187/sheet/ judged by Claude <date>"`

After the run, update K1189's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1189 --last-commit <sha8> --next "Run D done; Claude reviews it and judges the crops"`

## Run E - K1188: preview.ps1 under a long root, and after a kill

**Chain tag:** 18E · **Suggested ports:** 5670-5679.

### Read first

- `scripts/preview.ps1` (read whole for this draft, 92
  lines): `-Root` is resolved at its start and `$root` is
  where a `-Ref` run puts `src-<sha>` (a temp worktree with
  a `node_modules` junction into the main checkout) and the
  build output. A leftover `src-<sha>` for the same ref is
  cleaned at startup (the junction is unlinked first, since
  `git worktree remove --force` follows a junction into its
  target). The server's cleanup is a `finally` - a process
  killed outright never runs it.
- `docs/design/K1139_pulse_junctions.md` (the item's
  source, K1139 Stage 3; read it before citing any stand
  from it - rule 11).
- `.claude/rules/probes.md` for the server and port habits
  this run's dry runs follow.

### What is there today

> **K1188** · `scripts/preview.ps1` (K1139 Stage 3, not reproduced): fails under a long `-Root`; a `-Ref`
> server killed outright skips the `finally`, so its temp worktree stays registered with a `node_modules`
> junction inside, which `git worktree remove --force` may follow. Muse.

Both halves are unreproduced. Cleanup on kill cannot live in
the killed process: whatever fixes that half must act no
later than the next `preview.ps1` run that names the same
`-Root`, and it may only ever touch worktrees under that
root - other agents serve other roots at the same time, and
one of them is live while this run works.

This run makes its own temp worktrees under `$env:TEMP`
only. No `git worktree prune`, nothing under
`.claude/worktrees/`, and never the root
`$env:TEMP\k1139s4pv` (a Claude agent's master preview runs
there). It kills only servers it started itself, by the
process id it started.

### Tasks

Use ports 5670-5679 for every server this run starts.

**Write set:** `scripts/preview.ps1` and a new repro script
under `.claude/probes/K1188/` (`git add -f`). Nothing else;
no `src/` or `test/` change.

1. **Reproduce the long root (dry run, unmodified tree).**
   With a root under `$env:TEMP\k1188e-long\` nested deep
   enough that the full `-Root` path is at least 200
   characters (state its length in the report), run
   `pwsh scripts/preview.ps1 -Ref <master's short sha>
   -Root <that root> -BuildOnly`. Record the outcome
   verbatim (the first failing command and its error). A
   control with the same `-Ref` under a short own root
   (`$env:TEMP\k1188e-short\`) must build, so the pair
   isolates the root's length. If the long root also builds,
   say so and stop this half (batch 8 rule 2): a failure
   that does not reproduce is not fixed blind.
2. **Reproduce the kill (dry run, unmodified tree).**
   Start `pwsh scripts/preview.ps1 -Port <in range> -Ref
   <sha> -Root $env:TEMP\k1188e-kill\` as its own process,
   wait until it serves (an HTTP answer on its port, not a
   fixed sleep), record its process id, then kill that
   process outright (`Stop-Process -Force` on that id only).
   Record what is left: `git worktree list --porcelain` still
   names the run's `src-<sha>`, the folder is still there,
   and its `node_modules` junction still points at the main
   checkout. Afterwards remove only that worktree, the safe
   way the script itself does at its startup (unlink the
   junction first, then `git worktree remove --force` on
   that exact path), and show `git worktree list` clean of
   it again. That removal is this run's own temp worktree,
   made under its own root in this task.
3. **Fix.** Edit `scripts/preview.ps1` only, the smallest
   change that makes both reproductions read clean:
   - Long root: name the cause task 1 found in the report
     before fixing. Either builds under task 1's long root
     now succeed, or the script refuses before it creates a
     worktree, a junction or an output folder, with one line
     naming the root and why it cannot be used. A failure
     halfway, leaving a half-made worktree behind, is not a
     pass either way.
   - Killed server: the next `preview.ps1` run that names
     the same `-Root` (any `-Ref`, `-BuildOnly` included)
     removes a killed run's leftover before it adds its own
     worktree: each `src-*` leftover under that root only,
     its junction unlinked before any remove, and never a
     worktree whose server is still alive - how the script
     tells a live sibling from a killed one (a marker the
     serving run leaves, or an equal check) is the run's to
     choose, but task 4 proves a live sibling keeps serving.
     No `git worktree prune` and no sweep of any other root.
4. **After dry runs.** Repeat tasks 1 and 2 against the
   fixed script: the long root reads as task 3 requires; a
   server killed outright leaves a worktree that the next
   run under the same root cleans up, while a second server
   started under the same root on another port of the range
   is still serving after that cleanup run. Then the
   controls, unchanged: a working-tree `-BuildOnly` and a
   short-root `-Ref -BuildOnly` both build, and `git
   worktree list --porcelain` before the run and after it
   names the same worktrees outside this run's own roots.
   State every table in the report.
5. `npm test`.

### Done and close

**Done when:**

- Both failures were reproduced first (or the one that did
  not reproduce is reported as such and left unfixed).
- After the fix: the long root builds or refuses cleanly
  before creating anything; a killed `-Ref` server's
  worktree is gone after the next run under the same root,
  a live sibling under that root is untouched and serving,
  and the normal builds read as today.
- `npm test` passes.

**Close lines:**

Claude to mark the item done:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K1188 --commit <sha8> --what "scripts/preview.ps1 reproduced and fixed (or one half reported unreproduced): <the long root's cause and outcome>; a killed -Ref server's temp worktree is cleaned by the next run under the same -Root, junctions unlinked first, live siblings untouched"`

After the run, update K1189's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1189 --last-commit <sha8> --next "Run E done; all batch 18 runs are in, Claude reviews and closes K1189"`

## Left out on purpose

Drafting order, with what was read and skipped. Runs B to E
above are the fits; everything named here was read and left.

**Step (1), Claude's picks (all four taken; the pieces left
behind stay with their items, as Runs B and C say):** K782's
other pieces (the by-length keeps, the follower's mud cut,
the hover light, the late lure clear, clk=beat, the glyph),
K711's (d) refire cost and (f) broken-run counts.

**Step (2), Approved (K144 skipped by Run A - it and K1168
wait on Claude's briefs and Levi's Google OAuth client,
Cloudflare Worker and D1; not read as a candidate):**

- K22, K23, K322 and K805 - batch 17's reasons, rechecked
  against today's ledger, still hold: K22 follows the G3
  design (K8, In progress), whose G3-3 still waits on Levi's
  phone look; K23 is GPU particles, GPU fog and the yarn as
  a gap-masked ribbon - GPU renderer work, in
  `src/render/ribbon/`'s lane besides (Run A bars it while
  K1139's agent works there); K322 is commissioning, Levi's
  budget and taste, nothing a check decides; K805's gates
  have not landed (K797's stage d is still in Next and K1149
  is still unbuilt in Next, and the mode is behind Levi's
  budget besides), so there is still nothing to schedule.

**Step (3), Next from K265 on, read to the section's end
(K1188, Run E from step (1)), then from its top (K875)
through K10 - the last item read (batch 17 read that stretch
through K292; it is in Waiting on Levi now, and Run A bars
it):**

- The field, junction and label lanes (Claude's K1040 and
  K868 work; Run A bars their paths): K873 (flow as a K868
  scene input), K935, K941, K952, K953, K955, K956
  (K868 / K922 / K924 / K940 follow-ups), K1143 (K1040 S3g), K1180 (form B's
  round feet), K1186 (K1179's fill look - a named Run A skip
  besides, waiting on K1139), and from the top K875, K876
  (K868's oracle), K345 (the hover rim rides K868/K9's
  field), K9 (G4, junctions from one field).
- The cursive and glyph lane (Run A's skip): K569, K582,
  K912, K931, K937, K948, K949, K961, K990, K991, K997,
  K998, K1006, K1009, K1112, and from the top K557 (`RUN_FLAG.TEXT`
  after K115's redesign). K690 too: the glyph root's paint
  checks (a GPU root-pixel census and cold compile beside
  CPU-mirror tests) are glyph paint's lane, with its merge
  call still open above them in `docs/design/K620.md`.
- Physics, the sim and renderer cost (Run A's skip for the
  sim; the rest pay only on the phone or belong to K5/K8's
  GPU work): K595 (same-chain collision in
  `src/physics/forces.ts`), K611 (the drag frame's renderer
  share), K590 (G3-1's phone gap search).
- Phone-bound or sitting on a device: K365 (K279's phone
  round), K376 (the reveal's intro, desktop and phone, and a
  look besides), K709 (phone kit hardening - only its
  healthy-link no-op is tested and nothing here can arm the
  rest without the phone), K919, K1088 (the Pixel's confetti
  frame rate), and from the top K784 (a phone sitting), K10
  (the phone benchmark).
- Levi's looks, calls and tuning, and work whose gate is a
  Levi answer that has not landed: K265 with K328 (the
  high-contrast highlight and hover rim travel together and
  their look is Levi-reviewed; paint-library GPU work
  besides), K318 (win effects stage 1 is the whole show -
  runner, braking row, shader bands, panel folder - and
  every stage ends with frame sheets for Levi; not one
  bounded stage), K326 (dropping knot mode deletes across
  the app and retargets the byte-identity golden - a whole
  mode, not one run), K543 (a sheet made when Levi wants
  the look check), K649 (K525's tuning by eye), K240 (after
  K238's review; K238 sits in Waiting on Levi today),
  K340 (its folder look is Levi's pick), K341 with K297
  (sequenced after the panel's churn - K292's sheet is
  still waiting on Levi, so the churn has not settled),
  K46 (daily variety themes - a design), K78 (the handbook,
  written once the churn settles; it has not), K116
  (pluck instruments - a Pixel audio probe first, and
  Levi's lowest priority), K409 (its remaining step waits
  on K623/K624, Levi's burn calls), K797 (stage d textures -
  a look, perf-gated on the phone), K579 (GPU confetti,
  which pays only if K318 raises the counts; K318 has not
  landed).
- Launch, backend and accounts lanes: K531 (daily
  determinism at launch prep - a design with versioned
  defaults tables, no one-run stage stated), K533 (backend
  dailies alongside K144; Run A bars K144 and K1168), and
  K1168 itself (K144 stage 1; Claude writes its brief and
  deploying needs Levi's OAuth client, Worker and D1).
- Triggers that have not fired, and stands this brief may
  not use: K786 (it fires when K138's stage 6 makes monsters
  obey one-way runs; that stage has not landed), K890 (the
  K863 tracer moves into `scripts/` once K886 lands - the
  cursive lane besides), K1176 (removing agent worktrees -
  `.claude/worktrees/` is Run A's forbidden tree, and three
  of them hold WIP to ask Levi about), K548 (the usage gate
  is Claude's own session `/usage`, which no Muse run can
  read; its runner is the untracked chain kit besides),
  K887 (the open-work report is a page Claude publishes from
  an untracked probe pipeline - no tracked deliverable a
  unit test, probe or dry run here decides), K312 (adding
  K299's lesson edits claude-config, another repo, and the
  item itself holds it while Levi is away), K313 (the maze
  loader's stage 2 is phone measures, then tuning with
  Levi), K1149 (the beat dots themselves - a player-visible
  feature with no bounded stage stated, building toward
  K805 whose own gates above have not landed).

**Step (4), Residuals above K1184 (the rest of the section
was not read again; Run A directs it, batch 17 having read
it in a full circle):** K1187 is the only residual numbered
above K1184 there, and it is Run D. K1185 sits in Ideas, not
Residuals, and belongs to the K1179 revisit lane Run A bars;
K1186 sits in Next and is listed above.

Nothing in Waiting on Levi or Ideas was a candidate beyond
what Run A names: Waiting holds Levi's calls (K292 and K647
among them, both barred by Run A), and Ideas are not
scheduled by these drafts.


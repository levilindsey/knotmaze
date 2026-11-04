# Muse batch 12 (K1153) — DRAFT for Claude's review

Claude starts these runs through Paseo, one run at a time, after batch
11 (`docs/design/K1146_muse_batch11.md`, K1146) was reviewed and
closed. Each run is a fresh Muse agent that reads this brief, does its
run's tasks, and stops. Claude reviews each run on master afterwards
and closes K1153.

Where the runs came from (the drafting run's order, from
`docs/design/K1153_muse_batch12_run_a.md`): (1) `## Approved, to
schedule` in `LEDGER.md` (K22, K23, K322 and K805; K804 is done) —
none fits: batch 11's reasons still hold for each, said under "Left
out on purpose" below. (2) `## Residuals (known, not fixed)` in ledger
order, starting at K206 (batch 11's draft read through K207, which has
since moved to `## Waiting on Levi`). Residuals were read in ledger
order through **K308** (the last residual read; batch 13's draft
starts after K308). Six runs fit: K202, K201, K125, K165 (its first
half), K170 and K308, in ledger order. (3) The two residuals filed
since batch 11's draft, K1152 and K1148, were not reached: the six
runs filled from step (2) first, in the order the drafting brief
names. They stay in ledger order after K308 for batch 13. See "Left
out on purpose" at the end for every candidate read and skipped, and
why.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. No run changes
physics, junctions, the cursive, or the thread ribbons' shader text.
Run F changes one background program (contours), not a thread ribbon.
Run E changes a phone tool's default but never runs it against the
phone: its checks are a source scan, a PowerShell parse and `npm
test`. No two runs touch one file, and each run starts from the
latest master, in the order A to F.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1153 wherever it says K1131, and
K1137's rule 11 and K1141's rules 11 and 12 wherever they apply: rule
11 (a re-measurement copies the original stand's link verbatim, read
from the old probe's source, not from a summary of it, and its table
names everything it adds or changes) wherever a stand is copied, and
rule 12 (dependencies: neither run should need a new or changed
package; if one changes anyway, `npm audit` must report no high or
critical advisory afterwards, and a security fix is taken even when it
was published less than two weeks ago) wherever a dependency moves.
Use ports 5550-5599 (each run below names its range).

After each run, update K1153's handle, naming the next run in the
order A to F:
`ledger.mjs handle K1153 --last-commit <sha8> --next "Run <X> done; next Run <Y>"`
(after Run F: `--next "Run F done; batch 12 complete, Claude reviews and closes K1153"`).

## Run A · K202: an unstarted floating daily rolls over at midnight

Read first: `.claude/rules/gameplay-daily.md` (MAZE STATS + DAILY
MAZE), `.claude/rules/probes.md`; then `parseLaunch`, `dailyQuery`
and `DAILY_EXEMPT_KEYS` in `src/ui/daily_link.ts`, `todayNumber` and
`localDay` in `src/game/daily_calendar.ts`, `begunLate` in
`src/game/daily_attempt.ts`, `playDaily`, the 250 ms interval beside
`labelDay` (its midnight branch) and the `visibilitychange` handler
in `src/main.ts`, and the launch cases in
`test/ui/daily_link.test.ts` and `test/game/daily_calendar.test.ts`
to copy.

The ledger says (Residuals):

> **K202** · A bare-URL daily left open past midnight with no move becomes
> practice when begun the next day (K146). An unstarted daily the bare URL
> opened could roll over to the new day instead
> (`docs/design/K146_K151.md`, "Open").

What is there today (read it, don't trust this summary). The bare
page and `?daily` open today's daily floating (`parseLaunch`:
`floating: true`); a numbered `?daily=<n>` never floats. The bare
address already means "today's daily" on a reload (`dailyQuery`'s
comment: a bookmark never freezes one day). What breaks that is only
a tab left open across midnight: the 250 ms interval in `main.ts`
notices the day turn, updates the panel's Daily label and the HUD,
and its own comment names this case ("one not begun yet would now
begin as practice") — then does nothing, so the first move next day
begins yesterday's maze as practice (`begunLate`, K146). An attempt
begun on its day, finished later, still counts, and a saved or
restored attempt is begun by definition; a solved daily is begun
too. `playDaily(n, floating)` already does the whole entry (prefs and
attempt saved, params rebuilt, `rebuild()`), and the stats view's
Play path uses it for today's daily with `floating` set.

Tasks, in order (ports 5550-5559, headed real-time Chrome, only if
task 3 runs):

1. The before table, from the pure functions alone (no browser): a
   scratch script in `.claude/probes/K202/` (run it with
   `node scripts/run_node.mjs`) that, for a floating daily opened on
   day D and first begun on day D+1, a numbered daily in the same
   state, and a floating daily begun on day D and finished on D+1,
   records `parseLaunch`'s floating flag and what `begunLate` makes
   of the first move. The table shows the one case that turns
   practice: floating, unbegun, past midnight.
2. The rollover. One pure predicate beside `parseLaunch` in
   `src/ui/daily_link.ts` — given the daily on screen, its floating
   flag, today, and whether the attempt is begun, it returns the day
   to roll to (today) or null. Begun means any of: the solve clock
   has started, the controller's taps are non-empty, a saved attempt
   for that daily exists in the store, or this tab restored one
   (`attemptDaily` is that daily). In `main.ts`, one check function
   reading those four runs in the interval's midnight branch and
   again when the page comes back into view (the existing
   `visibilitychange` handler, beside `adoptOtherTab()`); when the
   predicate names a day it calls `playDaily(today, true)` and
   nothing else — no toast of its own (`playDaily`'s own feedback
   stands), no change to the numbered, begun or ordinary-design
   cases. A hidden tab that turns the day while hidden rolls on the
   same check when it is seen again, never while hidden.
3. A page check as a second, headed confirmation (not the gate):
   copy a daily probe's load into `.claude/probes/K202/rollover.mjs`,
   load the bare address with the page's `Date` overridden before
   load (name that override in the table; it is the only stand
   change), cross the mocked midnight, fire the visibility path, and
   read the daily on screen through `__knotDaily`. If the override
   cannot cross midnight cleanly in the page, report that and let
   task 2's tests stand as the gate — do not fake the crossing with
   a reload (a reload is the case that already works).

Done:

- Before table names the floating-unbegun case as the only one that
  turns practice; after it, that case opens today's daily, and the
  numbered, begun, restored, solved and ordinary cases are
  unchanged, each pinned by a test in `test/ui/daily_link.test.ts`.
- The golden dailies and every other daily test pass unchanged;
  `npm test` passes.

Report: the before and after tables, and how "begun" was read.

Close: `ledger.mjs done K202 --commit <sha8> --what "an unstarted floating daily rolls to the new day at midnight"`.
Suggested ports: 5550-5559.

## Run B · K201: the History's Played chip counts what the tiles count

Read first: `.claude/rules/gameplay-daily.md` (MAZE STATS + DAILY
MAZE); then `dailyHistory` and its `historyEntry`, and
`dailyAggregates`, in `src/game/daily_store.ts`, the chips block and
`historyRow` in `src/ui/daily_stats_view.ts`, the history and
aggregates cases in `test/game/daily_store.test.ts`, and
`test/ui/reanchor_step.test.ts` for the happy-dom header this run's
view test copies.

The ledger says (Residuals):

> **K201** · History's "Played" chip counts any record, practice included,
> so it can exceed the played tile (24 against 21 in K146's probe); a
> practice row's count shows only in its tooltip, which phones lack
> (`src/ui/daily_stats_view.ts`).

What is there today (read it, don't trust this summary). Two counts
of "played" disagree. The tiles count a day played when its record
carries a played mark or an official result (`dailyAggregates`:
practice is in none of them). The History's chips count a row played
when its status is anything but `unplayed` (`daily_stats_view.ts`
pushes `played: e.status !== "unplayed"`), so a practice-only day
(status `practice`, no played mark) and a resume whose attempt began
late (status `resume`; `historyEntry` already computes whether that
attempt counts, for its practice flag, and the chip ignores it)
both count at the chip and not at the tile. Separately, a practice row's repeat count
(`more`, finishes beside the one shown) reaches the screen only in
the row's `title` ("Practiced N times"); the status cell reads just
"practice", and a phone has no hover to read a title with.

Tasks, in order (no server; ports 5560-5569 if a read needs one):

1. The before table, from the pure functions alone: a scratch
   script in `.claude/probes/K201/` (`node scripts/run_node.mjs`)
   over one crafted store holding an official day, a played-only
   day, a practice-only day with two finishes, a late-begun resume
   and an unplayed day, with today holding no record. Record each
   row's status, the chip's count as the view computes it today,
   and `dailyAggregates`' played. The table shows the chip above
   the tile, and names the two statuses that cause it.
2. One counting rule. `HistoryEntry` gains the tile's answer for
   its day (official result, or a played mark — the
   `dailyAggregates` test, read off the day record `historyEntry`
   already holds), and the chips in `daily_stats_view.ts` take
   their count and their Played filter from it, so the chip, its
   filter and the tile can never split again. The practice row's
   status cell then carries its count in text: "practice" with,
   when `more` is over 0, the total beside it in the cell's own
   words (the tooltip keeps its sentence; the stars' muted
   practice look is unchanged). No other row's text changes.
3. Tests. In `test/game/daily_store.test.ts`: the new field reads
   true for the official and played-only days and false for the
   practice-only, late-resume and unplayed days, and over the
   crafted store the field's count over `dailyHistory` equals
   `dailyAggregates`' played. In a new
   `test/ui/daily_stats_view.test.ts` on happy-dom (the
   `reanchor_step.test.ts` header; the rest of the suite keeps its
   environment): open the stats view over the same crafted store
   (more than `HISTORY_CHIPS_AFTER` rows, so the chips show) and
   read the Played chip's label and a practice row's status cell —
   the chip names the tile's number and the cell names the count.

Done:

- Chip count, chip filter and played tile agree on the crafted
  store and in the tests; a practice row's count reads on the row
  itself, not only in its title.
- `npm test` passes; no stored record's shape changes (the field
  is computed, never saved).

Report: the before and after tables.

Close: `ledger.mjs done K201 --commit <sha8> --what "the Played chip counts the tile's days; a practice row shows its count"`.
Suggested ports: 5560-5569 (if any).

## Run C · K125: Scarborough Fair's loop is whole 3/4 bars

Read first: `.claude/rules/gameplay-audio.md`; then
`SCARBOROUGH_FAIR` in `src/audio/songs.ts` (its header transcribes
the 3/4 source it was taken from), `SongScheduler` in
`src/audio/song_scheduler.ts` (how a song's notes become due times
and where the loop wraps), and `test/audio/song_scheduler.test.ts`
to copy.

The ledger says (Residuals):

> **K125** · Scarborough Fair's loop is 50 beats (`src/audio/songs.ts`;
> K116 found it), not whole 3/4 bars, so a part that keeps bars would slip
> each loop. Grow its closing rest from 2 beats to 3 before any band part
> (K116's call 6).

What is there today (read it, don't trust this summary). The song is
a flat list of notes and rests in quarter-note beats at 132 bpm,
transcribed from a 3/4 source. Its beats sum to 50 — sixteen whole
bars (48) and 2 over — and it ends on a 2-beat rest. The scheduler
hands notes out on the song's own grid and wraps at the song's
total, so every loop a bar-keeping part (K116's band, not built)
would land 2 beats earlier against the bars. Nothing pins the
total: the scheduler tests drive the real song for its rhythm and
frame-rate behaviour and never read its length.

Tasks, in order (no server; ports 5570-5579 if a read needs one):

1. The before table, from the data alone: a scratch script in
   `.claude/probes/K125/` (`node scripts/run_node.mjs`) that sums
   the song's beats, states the whole bars and the remainder, and
   names its last entry. It reads 50, sixteen bars and 2 over, the
   closing rest 2.
2. The rest. The closing rest grows from 2 beats to 3, and nothing
   else in the song changes: no note, order, tempo or scheduler
   line. A test in `test/audio/song_scheduler.test.ts` (or a songs
   test beside it) pins the new shape: the beats sum to 51, the
   sum is a whole number of 3-beat bars, and the last entry is a
   3-beat rest. The existing scheduler tests pass unchanged — if
   one read the old total, stop under K1050's stop rule 1 and
   report which.

Done:

- The song loops on whole 3/4 bars (51 beats, its closing rest 3),
  pinned by the new test; every existing audio test passes
  unchanged.
- `npm test` passes.

Report: the before and after sums.

Close: `ledger.mjs done K125 --commit <sha8> --what "Scarborough Fair loops on whole bars (closing rest 3)"`.
Suggested ports: 5570-5579 (if any).

## Run D · K165 (a): a halted load keeps its HALTED stamp

Read first: `.claude/rules/render-loop.md`,
`.claude/rules/gameplay-motion.md` (where it lists
`src/app/lifecycle.ts`); then `loadingTick` and `presettleTick` in
`src/app/lifecycle.ts`, the loading branch at the head of `tick` in
`src/app/frame_loop.ts`, `test/app/lifecycle.test.ts` (its fakes are
this run's stand), and the split this run leaves at the end.

The ledger says (Residuals):

> **K165** · Two pre-existing loader bugs: `loadingTick` overwrites the
> HALTED stamp with " | loading", and the physics-off loader's
> `loadWall0` counts hidden-tab time. Found by K147
> (`docs/design/K147.md`).

This run takes the first bug only. The second lives in the physics
host's load clock (`src/physics/physics_host.ts`, and the worker
host's copy of it), which this batch does not touch; it is split out
at the end, as K252 and K804 were split before it.

What is there today (read it, don't trust this summary). When the
physics-off load's slice reports "halted", `loadingTick` in
`lifecycle.ts` sets the loop's halted flag, hides the loader, shows
the scene and writes the HALTED line into `perfLine` — and leaves
the lifecycle's state at "loading". The frame loop's loading branch
then runs on the same frame: the state still reads "loading", so it
writes " | loading" over the HALTED line, and the stamp never says
the sim halted. The pre-settle's halt, one function down in the same
file, already does the thing the load's halt misses: it moves the
state to "live" as it writes the line, with the comment that this
keeps the HALTED line on the stamp. The lifecycle tests' fake host
has no `loadFrame`, so no test drives this path today.

Tasks, in order (no server; ports 5580-5589 if a read needs one):

1. The before table, from the fakes alone: extend
   `test/app/lifecycle.test.ts`'s fake host in a scratch copy (or
   drive `createLifecycle` from a scratch script in
   `.claude/probes/K165/`) with a `loadFrame` that reports
   "halted", begin a physics-off load, tick it, and record the
   state, the halted flag and `perfLine`. It reads: still
   "loading", halted set, and — through the frame loop's branch as
   written — the stamp's line " | loading", not HALTED. State in
   the table which half each reading came from (the lifecycle
   tick alone cannot show the overwrite; the frame loop's two
   lines after it do).
2. The fix, in `lifecycle.ts` only: the load's halt leaves the
   "loading" state the way the pre-settle's halt does, so the
   frame loop's branch no longer runs over its line. Do not touch
   the frame loop's loading line, the halted flag's clearing on a
   regenerate (K436, pinned by the same test file), or any physics
   file. A test in `test/app/lifecycle.test.ts` on the extended
   fake: after the halted tick the state is no longer "loading",
   the halted flag is set, `perfLine` holds the HALTED line, and
   a following regenerate still clears the flag.

Exception (K1050's stop rule 2): this run edits `src/app/` only.
The `loadWall0` half names `src/physics/` files, and filing it
(below) is the whole of that half here.

Done:

- After table: the halted load's state, flag and stamp read as
  task 2's test pins them; the stamp keeps HALTED until a
  regenerate, as the pre-settle's halt already did.
- `npm test` passes, the K436 regenerate tests among them,
  unchanged.

Report: the before and after tables.

File the other half, as written:
`ledger.mjs add --section Residuals --text "Loader clocks: the physics-off load's wall cap counts hidden-tab time (PhysicsCore's loadWall0 in src/physics/physics_host.ts, and the worker host's loadInfo in src/physics/worker_host.ts beside it — the pre-settle already counts visible time with VisibleClock; split from K165)"`,
then close K165 for the half done:
`ledger.mjs done K165 --commit <sha8> --what "a halted load keeps its HALTED stamp; the load wall clock split out"`.
Suggested ports: 5580-5589 (if any).

## Run E · K170: the phone tunnel does not wake the phone by default

Read first: `.claude/rules/probes-phone.md`; then
`scripts/phone.ps1` whole (it is short), the guard it must not
weaken in `scripts/phone_pass/phone_ready.mjs` (its header states
the no-key-events rule's reason), the runners scan in
`test/phone_pass/phone_ready.test.ts` (which exempts
`scripts/phone.ps1` as Levi's interactive tunnel, with its reason),
and `retry_quiet.ps1` in `scripts/phone_pass/` for the copy that
already dropped its wake.

The ledger says (Residuals):

> **K170** · `scripts/phone.ps1` sends KEYCODE_WAKEUP, against the phone
> rule (no key events; the phone stays awake on its charger). Proposed:
> no wake by default and a `-Wake` switch to opt in (K156 3a proposed a
> `-NoWake` switch instead; `retry_quiet.ps1` already drops its copy).

What is there today (read it, don't trust this summary).
`scripts/phone.ps1` is Levi's interactive tunnel: it finds the
phone, sets the reverse tunnels and the DevTools forward, and opens
a URL when asked. Between choosing the serial and setting the
tunnels it unconditionally sends
`shell input keyevent KEYCODE_WAKEUP`, under a comment saying
Chrome throttles rendering on a sleeping display — the one key
event the phone rule forbids, sent by the one script every phone
session starts with. The locked-phone warning right after it is a
read (`dumpsys window`) and stays. The two proposals in the item
differ only in the default; the rule settles that (no key events;
the phone stays awake on its charger), so the wake becomes opt-in.

Tasks, in order (no server, no phone; ports 5590-5594, unused):

1. The before table: read the script and count what it sends to
   the phone before any tunnel exists — the wake, the keyguard
   read, the forwards, and the `am start` only when `-Url` names
   one. The table names the wake as the only unconditional key
   event. Do not run the script, in whole or in part: it would
   connect to the phone (a phone pass by another name, and this
   batch runs none).
2. The switch. A `-Wake` switch joins the param block; the wake
   line runs only under it, and its comment now says why it is
   off by default (the rule, and that the phone stays awake on
   its charger) and what `-Wake` is for (a sleeping display
   throttling Chrome, when Levi asks for it by hand). Nothing
   else in the script changes: the keyguard warning, the
   tunnels, the URL open and the DevTools listing read as before.
3. The pins. In `test/phone_pass/phone_ready.test.ts`, beside the
   runners scan that exempts this script: a scan test that the
   only `KEYCODE_WAKEUP` (and the only `input keyevent`) in
   `scripts/phone.ps1` sits under the `-Wake` switch, and that
   the param block names it. Prove the pin catches the old
   shape: a scratch copy of the test's pattern against the
   before text fails (rule 9's method, on the test's own fixture
   text — the script file itself is restored before any commit
   if it is touched at all). Then a parse, and only a parse:
   `pwsh -NoProfile -Command` with the PowerShell language
   parser over the file, reporting no parse errors.

Exception (K1050's rules and batch 8's rule 7): this run starts
no server and runs no phone tool. The parse in task 3 is the only
execution, and it opens nothing on the phone.

Done:

- The script sends no key event unless `-Wake` is passed; the
  scan test and the parse pass; the rest of the script reads
  unchanged.
- `npm test` passes.

Report: the before and after tables (what the script sends, by
switch), and the parse result.

Close: `ledger.mjs done K170 --commit <sha8> --what "scripts/phone.ps1 wakes the phone only under -Wake"`.
Suggested ports: 5590-5594 (unused).

## Run F · K308: the contours' fifth line counts exactly

Read first: `.claude/rules/render-backgrounds.md`,
`.claude/rules/render-shaders.md` (where it lists
`src/render/background_shaders.ts`), `.claude/rules/probes.md`;
then `CONTOURS` in `src/render/background_shaders.ts` (the warp
above the line this run changes, and the program it feeds),
`docs/design/K299_choice_pulse_bug.md` ("Residuals": the failure
this item is the leftover of), the `ROUNDED_QUOTIENTS` table and
its scan in `test/render/paint_ring_lap.test.ts`, the exact helpers
that table credits in `src/render/paint_glsl.ts` (the correction
shape to copy), the pinned program hashes in
`test/render/background_shaders.test.ts`, and K1138's stand copy
habit in `.claude/probes/K1138/backdrop.mjs` if it is still there.

The ledger says (Residuals):

> **K308** · `mod(floor(v + 0.5), 5.0)` in the background contours is a
> float quotient like K299's, allowlisted in `ROUNDED_QUOTIENTS`
> (`test/render/paint_ring_lap.test.ts`); fix it when the sha256-pinned
> programs are next re-pinned. `docs/design/K299_choice_pulse_bug.md`
> ("Residuals").

What is there today (read it, don't trust this summary). Every
fifth contour line draws stronger: `CONTOURS` takes the height
field's band index with `mod(floor(v + 0.5), 5.0)` and reads 1.0 on
the fifth band, 0.55 otherwise. `mod` divides, and a GPU division
can land a hair under the exact quotient (K299's lesson, in the
allowlist's own comment), so on an affected GPU a fifth line can
take the 0.55 weight. The site sits in `ROUNDED_QUOTIENTS` as a
known residual, and the contours program is sha256-pinned in
`background_shaders.test.ts`. The item's condition has already
fired once without taking it: K1138 re-pinned the contours program
for its morph (batch 10's Run A) and left the quotient. This run
is the re-pin that takes it. The shaped contours program reads the
same `CONTOURS` body (`SHAPED_BODIES`), so one body fix covers
both; say so in the commit, or report.

Tasks, in order (ports 5595-5599, perf lock, headed real-time
Chrome):

1. The before stand. Copy K1138's backdrop probe (or the K79
   speed probe it copied, read from its source) into
   `.claude/probes/K308/contours.mjs`, its link verbatim from
   that source with only the backdrop keys the contours case
   needs added, each addition named in the table (rule 11). Pin
   the background layer's clock per `probes.md`, run a same-build
   control first, and take a throwaway first shot (K1130). The
   before table: at two pinned times, the share of strong (fifth)
   contour lines the page draws, read from the image the way
   K1138's extent measure reads its rows, and the program hash
   the test pins today.
2. The exact count. In `CONTOURS` only: the fifth-band test
   counts without a rounded quotient — the band index estimated
   by division, then corrected by one integer step either way
   with multiplication, the shape `paint_glsl.ts`'s helpers use —
   so a band index that is an exact multiple of five reads as
   the strong line on every GPU. No line, tint, warp or drift
   line changes. The allowlist entry in
   `test/render/paint_ring_lap.test.ts` goes (the scan then pins
   its absence), and only contours' hash in
   `background_shaders.test.ts` is re-pinned — after task 3's
   A/B, not before (the lore's rule, as batch 10's Run A held
   it).
3. The after stand. The same probe on the fixed build: the
   strong-line share matches the before table at both pinned
   times, and a same-state A/B of the contours backdrop (the
   stand's link, `&fw=0&phw=0` added and named, every clock
   pinned, a same-build control first) states its pixel
   difference — 0 px on a GPU whose division was already exact,
   and any difference confined to fifth lines if this one was
   not. Shots at both pinned times go in
   `.claude/probes/K308/shots/`.

Done:

- The contours body holds no `mod(` of a quotient (the scan
  passes with the allowlist entry gone), and only its hash
  moved.
- After table matches the before table's strong-line share; the
  A/B difference is stated and, if nonzero, confined to fifth
  lines.
- `npm test` passes; the shots exist.

Report: the before and after tables, the A/B difference, and the
re-pin.

Close: `ledger.mjs done K308 --commit <sha8> --what "the contours' fifth line counts exactly (integer-corrected)"`.
Suggested ports: 5595-5599.

## Left out on purpose, for a later batch

Not for Muse, or not now (candidates in the order the header
names: Approved first, then the Residuals read in ledger order
through K308; each is named, with its reason. Batch 11's own "Left
out on purpose" list was checked the same way, and none of its
items is revived here without saying why):

From Approved, to schedule (batch 11's reasons, re-checked; none
has since become possible):

- K22 (the dynamic resolution scaler): its own record still puts
  it after G3 (`docs/design/G3G4_sdf_geometry.md`, Ordering:
  "K22 (the resolution scaler) after G3; K23 = G3-5"), and the G3
  lane is still open (G3-3 waits on Levi's phone look and a phone
  render-sync measurement, K8 in progress). Its check is still a
  frame-time table on the phone. No desktop stand here.
- K23 (GPU particles, GPU fog-of-war accumulation, the yarn as a
  gap-masked ribbon): G3-5 on the same open lane as K22, in the
  thread renderer's GPU performance, which this batch keeps off
  limits.
- K322 (art, sound and music by people): commissioning and
  licensing is still Levi's budget and taste, with no unit test
  or desktop probe to decide it. The credits page it names still
  carries its art section (`notices/credits.ts`, its K321
  entries), so there is no waiting code half for a Muse run.
- K805 (the dot-eater mode): both of its gates still stand. The
  paper look's next stage (K797's textures, perf-gated) is still
  to build, and K804's dots are now their own item (K1149, in
  Next, not done), which K805 builds on.

From the Residuals, in ledger order (the last read is K308;
batch 13's draft starts after it):

- K206 (a restored attempt's fog, stamped while the threads
  re-settle): not reachable on today's dailies. A restore only
  happens on a daily, fog only under `exploration` "fog", and
  that param is neither a daily-exempt preference nor the daily
  default (`DAILY_EXEMPT_KEYS` and `PARAM_DEFAULTS` in
  `src/ui/daily_link.ts` and `src/ui/url_state.ts`), so a restored
  daily never carries fog for `exploreRuns` to stamp. The stand
  that showed it (K100's fog-daily server) was deleted with
  DAILY_V1 (K262). Revive it when a daily design carries fog.
- K205 (K120's five leftovers): five unlike things — the follow
  camera and the move pad, a small maze at the phone's fit zoom,
  a 411 px toast over the pad, an arrow after a panel click, a
  hold that could loop runs. No one Done check covers it; split
  it first (batch 11 said the same of K246).
- K197 and K195 (the phone's load and the phone pass's gaps):
  phone measurements; K197 also ends on Levi's call (is 19 s
  acceptable?). K190 (the hash's cost on the drifting
  backgrounds): its measure waits on K79's phone gate. K196
  (crossings options at phone scale): a phone look.
- K123, K131, K142, K150, K157, K159, K178, K295, K303, K304
  (probe and phone-kit tooling): the files are untracked probes
  under `.claude/probes/` (git ignores them), a claude-config
  rules edit (K150), or a bundle with no one Done check (K159);
  nothing tracked to commit or test (batch 11 said the same of
  K262 and K223). K157's check is also the phone.
- K124 (marker gaps popping under the reveal): the fix lives in
  the thread reveal's gap gate, the reveal-drawing lane this
  batch keeps off (batch 11 left K271, K258 and K276 there).
- Physics, as the brief's scope requires: K11, K12, K13, K14,
  K16, K65, K29, K30, K50 and K51 (the loud attractor, seam
  windows, settle cost, the creep, kink eyes, wide threads, the
  riders gate, the braid ratchets).
- K62 (`branchDensity` and `fourWayFraction` dead at the default
  spacing): any rescale moves generation and the maze pins it
  holds (batch 11 left K278 for the same), and relabel-or-hide
  is a panel call for Levi. No one fix a test names.
- K59 (two tabs, one daily): the stated fix adopts on the
  `storage` event and rebuilds the other window, intro included,
  on every move. Whether that cost is the right trade is the
  open question in the item; nothing to build to until it is
  answered.
- K54 (background contrast halved on ember): normalizing the
  accents' brightness recolors every design's backdrop — a look
  for Levi, decided by eye, not by the luma table that measured
  it.
- K26, K27, K42, K43, K106 and K107 (pluck blur, cyclic
  overlaps, draw order): the thread ribbons' and pluck overlay's
  drawing, with a rejected fix already on record for K26 and a
  junction footprint under K27. Off limits here.
- K44 (probe quirks), K69 (a sliver no build since G2.3 shows)
  and K305 (an unexplained frame-callback gap): no defect stands
  to fix — a rerun rule, a vanished artifact and a measurement
  with no fix named.
- K95 (the badge below 340 px covers an open panel's header):
  every fix moves or hides the badge at its last fit level, a
  placement Levi picks (K229's badge row waits on the same
  eye). K103 (everything slowing under 10 fps on Pixi's capped
  delta): the fix rewrites the frame's one clock across the
  moves, the fire, both minotaur clocks and the beat — each
  clock's catch-up is its own call, and together they are well
  past one run.
- K133 (crossed join bridges in pre-K110 plans): fixing moves
  those plans and their pins, and the item's first step is
  whether a crossing reads wrong — a look. K136 is physics.
  K143 (vellum's fibers at scale 2) is a look for the phone
  pass.
- K158 (custom colors off by up to 2/255): the quantization is
  in the format — a design's gamut colors are floats, the panel
  and the link carry `#rrggbb`. Byte-identical custom colors
  need a higher-precision color in the link and the picker, a
  format change, not a rounding fix.
- K163 (the first-frame hitch) rides K307's warm-up, in
  progress; K164, K167 and K168 are GPU frame cost and the
  phone. K166 (K81's band and overlay residuals) is junction
  routes and the pluck overlay.
- K172 (phone-pass sheets and drift looks), K175 (the
  minotaur's UI gaps: a placeholder glyph among them), K176
  (the entrance-tail ambush: whether the sanctuary's edge
  should catch is a fairness call for Levi, with no fix
  stated), K181 (phone shares and sound-only taps), K188
  (three unlike confetti leftovers; split it first), and K189
  (fabric at rest: measure on the phone first).
- K287 (the thread reveal's residuals) stays in the reveal
  lane. K289 (no webm clips of the plucks) is media, with no
  test to decide it. K300 (the phone pass's `-Moves` default)
  changes only with the next phone A/A, and K301 (the pass
  tab's one-pixel flip) is the phone's CDP emulation, cause
  unknown.

The two residuals filed since batch 11's draft, K1152 (the
phone-ready check's comments citing a deleted probe) and K1148
(hand-run phone tools skipping that check), were not reached:
the six runs above filled from Approved and the Residuals read
through K308 first, in the drafting brief's order. Both are
phone tools a unit test or dry run can decide without the
phone, and both wait in ledger order after K308 for batch 13.
Everything after K308 in the Residuals, and every other section,
was not read for this draft.

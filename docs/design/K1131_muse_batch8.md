# K1131: Muse batch 8

Claude starts these runs through Paseo, one run at a time, after batch
7 (`docs/design/K1108_muse_batch7.md`) has merged and been reviewed.
Each run is a fresh Muse agent that reads this brief, does its run's
tasks, and stops. Claude
reviews each run on master afterwards and closes K1131.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. None changes physics,
junctions, the cursive, or the thread ribbons: junction and cursive
agents work in their own worktrees on `src/render/field/`,
`src/render/junction_*`, `src/render/arm_strip.ts` and
`src/render/ribbon/joinery.ts` while this batch runs, and no run below
touches those, `src/physics/`, `src/core/`, or any ribbon shader text.
Run A adds marker discs (it draws no thread), Runs D and E narrow what
the burn and gap passes re-declare each frame (they change no picture),
and Runs B, C and F change DOM, camera and panel code only. The runs
take `LEDGER.md`'s Next items in ledger order (K332, K657, K1081,
K1082, K1083, K1115), skipping what does not fit (see "Left out on
purpose" at the end). Three pairs touch one file between them (A and D
in `src/render/fabric_maze_renderer.ts`, B and C in `src/main.ts`, D
and E in `src/render/ribbon/explore_gaps.ts` and
`src/render/ribbon_renderer.ts`), in different functions, so the run
order A to F is load-bearing: each run starts from the latest master.

## How to work

The process in `docs/design/K1050_muse_week.md` applies unchanged. Read
its sections "Each task, start to finish", "When a task stops", "Rules",
"Off limits" and "Reports" before anything else. Where they say K1050,
read K1131 (`ledger.mjs handle K1131 ...`). Batch 3's to batch 7's rules
hold too:

1. Close an item only when its Done check below passes. A task that
   stops keeps its item open. Its commit says `Status: partial`, the item
   says which stop rule fired and what is left, and the remainder is
   filed with `ledger.mjs add`.
2. Do the task as written. If the brief looks wrong (a file, function or
   param it names isn't there, or a number it quotes doesn't match),
   stop that task and quote the brief's line in your report. Don't
   substitute other work or other measurements. Line numbers in this
   brief come from a read on 2026-11-03 and drift: search for the name.
3. A `LEDGER:` commit holds `LEDGER.md` alone. A code fix goes in a work
   commit.
4. Update only K1131's handle
   (`ledger.mjs handle K1131 --last-commit <sha> --next "..."`). Don't
   close it or edit its text: Claude closes it.
5. No subagents: Paseo crashes when Muse spawns them.
6. When a run allows something that K1050's "When a task stops", Rules
   or Off limits forbid, it says so in a line starting "Exception". The
   exception covers that run only.
7. Every server and probe uses a port in 5500-5599, never 5173 or
   5480-5489. Batches 5 to 7 have finished, so this batch uses
   5550-5599 (each run names its range). Before starting a
   server, check its port is free
   (`Get-NetTCPConnection -State Listen -LocalPort <port> -ErrorAction SilentlyContinue`);
   if it is taken, use the next free port in your range. Old probes this
   batch copies may name other ports: change them. Start servers in the
   background and stop them when the run ends.
8. A probe's before table is taken on the unfixed code first, then the
   fix, then the after table. Both go in the commit message under
   `Checked:`. A fix whose before table already passes is not a fix: say
   so, close nothing, and report. (Runs D and E trace first: there a
   before table that already stands pat answers the task the same way.)
9. A scratch change to a source file, made only to prove a test or a guard
   catches a bug, is allowed when `git status --short <file>` shows the file
   clean first. Put it back with `git checkout -- <file>` before any commit
   and say so under `Checked:`. Never do this to a file that has changes
   you didn't make.
10. Write commit-message files as UTF-8 without a byte-order mark:
    `[IO.File]::WriteAllText(<absolute path>, <text>, (New-Object Text.UTF8Encoding $false))`
    or `Set-Content -Encoding utf8NoBOM`. Batch 5's `a4cc20ee` carries a
    BOM at the start of its subject.

Muse doesn't load `.claude/rules/` by itself. Each run names the rules
files to read before changing its area; `docs/lore_index.md` maps any
other file to its rules file.

Probes follow `.claude/rules/probes.md`, which every run with a probe
reads. In short: a bare URL is today's daily (intro, saved attempt), so
probes load a full design link; two loads of one link differ on the
physics worker (K550), so a same-state A/B uses `&phw=0` (or `&phy=0`)
with pinned clocks and runs a same-build control first; mobile emulation
keeps the layout it loaded with, so reload after `setViewport`; the
panel's open state persists in `localStorage` (`knotmaze.panelOpen`), so
set it before the load; and anything physics-dependent is shot through a
headed real-time Chrome (`scripts/diag_screenshot.mjs`), never
`--virtual-time-budget`.

Timing measurements and pixel-exact GPU comparisons take the perf lock
first: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
`.claude/probes/K441/lock_take_fast.ps1` (`-Owner <ID> -What "<text>"`)
and `.claude/probes/K441/lock_release_exact.ps1` (`-Owner <ID>`) take and
release it. If another owner holds it and it is under 30 minutes old,
wait inside one command. Delete it when you're done. (Runs C, D and E
take it for their stands; their gates are counters, and the lock keeps
the stands' secondary ms columns honest.)

A follow-up for Levi goes to `Waiting on Levi` only when it is about
what Levi sees or feels, in plain words with no param or function names.
Where a run gives that item's text, use it as written.

End the run with a short report: one line per task with its status and
commit.

## Run A · K332: arrow-key hints at the player's junction

Read first: `.claude/rules/gameplay-moves.md` (MOVES BY DIRECTION,
K120/K329/K333), `.claude/rules/render-markers.md` (MARKER ICONS, K83;
MARKER SIZE, K98), `.claude/rules/probes.md`; then
`src/ui/key_moves.ts` (whole, about 560 lines),
`src/app/input_keys.ts` (`keyDepartures`, `keyPress`, `keyStep` and the
object `createKeyInput` returns), the `aidTick` block in `src/main.ts`
(it syncs the renderer's compass and chalk switches), in
`src/render/fabric_maze_renderer.ts` the `update` draw calls and
`drawOneWay` (the chevron pool it copies), `markerGlyph` and the
`arrow` design in `src/render/marker_glyphs.ts`, and
`test/ui/key_moves.test.ts` and `test/render/marker_glyphs.test.ts` to
copy.

The ledger says:

> **K332** · Arrow-key hints (Levi 10-14): a small key icon (or chord, K333) near each choice's
> start, shown after the first arrow key press. After K329. Hooks: `key_moves.ts` (`keyMap`,
> `chordMap`, `keyStep`, `stepWaiting`), K83's `MarkerMesh`, `marker_glyphs.ts`.

What is there today (read it, don't trust this summary). K329 and K333
are done: `keyMap(deps)` says which run each of the four keys takes at
a junction and `chordMap(deps)` the same for the four diagonals, over
`Departure`s that `keyDepartures` in `input_keys.ts` builds at
`KEY_REACH` (0.5 world of arc). Nothing on screen says which key takes
which run: the probe hook `__knotKeyMoves` in
`src/app/probe_hooks.ts` computes both maps for a probe, and that is
the only reader besides the picker itself. No session flag records a
first direction press. The fabric renderer already pools `MarkerMesh`
discs beside the head (the chalk ticks, the one-way chevrons, the
K138 keys and locks, each pool grown on demand in
`fabric_maze_renderer.ts`), a chevron turns its mesh
(`mk.mesh.rotation`) along its run, and `marker_glyphs.ts` already
holds an `arrow` glyph (role `start`, pointing +x in the disc frame,
so a rotation draws any of the eight directions). `aidTick` in
`main.ts` sets `fabric.compassOn`, `fabric.chalkOn` and
`fabric.shortestPathOn` when they change and calls `fabric.update`.

Tasks, in order:

1. Probe first. Write `.claude/probes/K332/hints.mjs` (headed Chrome, a
   port in 5550-5559). Load `?7&am=instant&snd=none`, walk the fewest
   route (read it in the page the way the K137 page drivers do) and at
   the entrance and the next three junctions record, from
   `__knotKeyMoves`, every choice run with the key or chord that takes
   it (or none). Screenshot the entrance into
   `.claude/probes/K332/shots/before_entrance.png`. The before table:
   those picks, and no hint discs anywhere (there is no hint surface
   to read yet: say so in the table).
2. The pure map. In `src/ui/key_moves.ts`, `hintMap(deps)` inverts
   `keyMap` and `chordMap` to one entry per run: `{ edge, dir, chord }`
   (`dir` a `KeyDir` or a `Diagonal`, `chord` true for a diagonal).
   A run two directions take wears the one with the smaller `err`; a
   cardinal beats a diagonal at equal `err` (within 1e-12). A run no
   direction takes (a tie, nothing within tolerance) gets no entry.
   Tests in `test/ui/key_moves.test.ts` on the header's own junctions:
   the up-right / down-right / left fork, an X (the tie cycle deals
   every arm a cardinal), a run only a chord reaches, a run two keys
   take (the nearer `err` wins), and a tied run with no hint.
3. The flag and the feed. In `input_keys.ts`, a session flag set by
   `keyPress` (a direction press only: not the wait, cut, sprint or
   tool keys; the move pad and the gamepad reach the same `keyPress`,
   so they set it too), never written to storage, and a `keyHints()` on the
   returned object: `[]` until the flag is set, then `hintMap` over
   `keyDepartures(keyVertex())`, each entry with the world point
   `KEY_REACH` along its run (walk it the way `chordDirection` does)
   and its angle (`atan2` of the direction's vector, y down). Cache it
   on the vertex and the solve stamp the hold already keeps
   (`keyStamp`): recompute only when they change. In `main.ts`'s
   `aidTick`, beside the compass sync, call
   `fabric.setKeyHints(...)` with it (the renderer keeps the last list
   it was given, so call it every frame like the switches' test does;
   don't edit anything else in `main.ts`).
4. The discs. In `fabric_maze_renderer.ts`, a hint pool copied from
   the chevron pool: `setKeyHints(list)` stores the list,
   `keyHintMarkers` reads back the shown discs (`x`, `y`, `r`, `dir`,
   like `lockMarkers`), and a draw step in `update` beside
   `drawOneWay` places one disc per hint at its point, radius
   `markerRadius() * 0.55` (the chevrons' scale), wearing
   `markerGlyph("arrow", "start")` with `mesh.rotation` set to the
   entry's angle. Hidden while the dot travels, once the solve is
   over, and while the list is empty. No new glyph, so
   `marker_glyphs.test.ts` passes unchanged; warm the marker program
   the way the other pools do (it is already warm: say so, or report).
5. Take the after table with the probe (the same junctions, after a
   first direction press), and prove the arrows tell the truth: at
   the entrance, press each hinted cardinal with the real keyboard
   (`page.keyboard`) and record the run the taps took; for one hinted
   chord, hold its two keys together. Screenshots
   `after_first_press.png` (the entrance, hints up) and
   `after_move.png` into `shots/`.

Exception (K1050's stop rule 3): the hints ship with no param and no
flag. The session gate (nothing until the first direction press) is
Levi's spec in the item, and the look is filed for Levi below.

Done check:

- After table: at every probed junction the shown hints (run,
  direction) equal task 1's `__knotKeyMoves` picks under task 2's
  rules; no disc shows before the first direction press, while the
  dot travels, or after the solve.
- Each pressed key moves along its hinted run (the chord too).
- The screenshot pair is in `.claude/probes/K332/shots/`.
- `npm test` passes.

Report: the before and after tables, the warm-up finding, the
screenshot paths, and any line in `gameplay-moves.md` that says the
keys have no on-screen hint (quote it; don't edit rules: Claude does).

If code changed, file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "After you press an arrow key (or WASD) once, small arrows now sit at the start of each run at your junction showing which key takes it. Do they read well at the size of the one-way chevrons? Pictures: .claude/probes/K332/shots/ (K332, <sha>)"`

Close: `ledger.mjs done K332 --commit <sha8> --what "key hints after the first direction press"`.
Suggested ports: 5550-5559.

## Run B · K657: the win banner shows the snapped and par rows

Read first: `.claude/rules/gameplay-stars.md` (STAR RATINGS, K155),
`.claude/rules/gameplay-daily.md` (MAZE STATS: the `STATS` lines),
`.claude/rules/gameplay-mechanisms.md` (FRAGILE RUNS AND PAR, K137),
`.claude/rules/probes.md`; then in `src/ui/maze_hud.ts` `WinInfo`,
`statEntries`, `ruleEntries` and `WinBanner.show`, `ruleFields` in
`src/app/rule_loss.ts`, `showFabricWin`, `hudSnapshot` and the preview
banner in `src/main.ts`, the `par`, `strokes` and `efficiency` lines
in `src/game/maze_stats.ts`, and the win cases in
`test/ui/maze_hud.test.ts`.

The ledger says:

> **K657** · K137 follow-ups: the win banner's strokes/par and snapped rows (showFabricWin is free
> since K336 merged); keep copy from promising par = perfect play (par counts runs, stars length; a
> 100%-efficient walk lost strict par, seed 7, slack 0).

What is there today (read it, don't trust this summary).
`ruleFields(c)` in `rule_loss.ts` builds the HUD's rule rows:
`snapped` (runs broken, fragile on), `parLeft` (strict par) and
`parStrokes` (strokes mode), beside `collapse`, `cuts` and the rest.
The HUD shows them through `ruleEntries`, and the Stranded and Out of
strokes banners show them through `ruleLossEntries`. The win banner
cannot: `WinInfo` in `maze_hud.ts` has no `snapped`, `parLeft` or
`parStrokes` field, `showFabricWin` passes `ruleRows`' `rules`,
`turnstiles`, `hidden`, `oneWay`, `keys` and `muddy` but none of the
three, and the panel's preview banner does the same from
`hudSnapshot` (which does carry them, through `ruleFields`).
`statEntries(w)` would print the rows the moment the fields arrive
(its `StatFields` already lists the three, and `ruleEntries` prints
`snapped`, then the par or strokes row, in that order). The share text
already carries the pair (`parScore`, the snapped count). On copy:
par counts runs (`parFor`, the fewest runs plus slack; a stroke is a
move) and the stars count length walked, so a walk can read 100%
efficient and still lose strict par (K137 s1, seed 7 at slack 0: the
shortest walk by length lost at move 4; `docs/design/K137_s1.md`,
"Par counts runs"). The `STATS` lines for `par` and `strokes` already
say runs; this run checks every line that touches par says so.

Tasks, in order:

1. Before table. Write `.claude/probes/K657/banner.mjs` (headed
   Chrome, a port in 5560-5569; copy a K137 page driver's finish: it
   walks the fewest route with `__knotTurnMove`). Finish two seed-7
   games, one in strokes mode and one with fragile runs on (their
   codec keys are in `src/ui/param_codec.ts`: build the links from
   the token plus those keys), and read the win banner's rows
   (`#maze-banner`), the HUD's rows on the last junction, and the
   share text. The before table: the banner lacks `snapped` in the
   fragile game and the strokes row in the strokes game, while the
   HUD and the share carry both. As a control, lose a strict game:
   its Out of strokes banner already shows its rows.
2. The fields. Add `snapped`, `parLeft` and `parStrokes` to `WinInfo`
   (optional, null absent, beside `cuts`), pass them in
   `showFabricWin` from `ruleRows`, and in the preview banner from
   the snapshot (`s?.snapped` and the rest, beside `s?.spoolUsed`).
   No row code changes: `statEntries` and `ruleEntries` already
   print them. Tests in `test/ui/maze_hud.test.ts`: a win snapshot
   with the three fields shows `snapped`, then its par or strokes
   row, with the HUD's strings (an infinite par reads as a dash);
   a snapshot without them shows neither (the existing win cases
   pass unchanged).
3. The copy audit. List every player-facing line that defines or
   explains par: the `STATS` lines `par` and `strokes`, the panel's
   Par and Par slack help (`src/ui/tweakpane_panel.ts`), and the
   share's par tag. Each must count runs (moves), never length, a
   shortest route, or perfect play; the `efficiency` line must keep
   its own meaning (the route ended on) apart from par. The audit
   table goes in the report. If a line does promise par as perfect
   play, reword that line only, in the same voice. If none does, add
   one pin in `test/game/maze_stats.test.ts`: the `par` and
   `strokes` lines contain "runs".

Exception (K1050's stop rule 1, task 3 only): a test that pins a
reworded line's exact text may change to the new text. No other
expected value may change.

Done check:

- After table: the win banner shows `snapped` in the fragile game
  and the strokes row in the strokes game, with the HUD's last
  values, in `ruleEntries`' order; the strict loss banner is
  unchanged; the preview banner shows the rows when its snapshot
  has them.
- The copy audit table is in the report, and no audited line
  promises par as perfect play.
- `npm test` passes.

Report: the before and after tables and the copy audit.

Close: `ledger.mjs done K657 --commit <sha8> --what "win banner shows snapped and par rows"`.
Suggested ports: 5560-5569.

## Run C · K1081: one panel-rect read a frame

Read first: `.claude/rules/gameplay-camera.md` (FIT CAMERA PAN RANGE,
K198), `.claude/rules/render-loop.md` (the frame loop's ticks),
`.claude/rules/gameplay-mechanisms.md` (the cut and the aids, whose
button ticks read the rect), `.claude/rules/probes.md`; then
`readPanel`, `stepPanel` and `openPanel` in `src/app/camera.ts`, the
`getBoundingClientRect` sites in `src/main.ts` (`panelCoversCut`,
`aidTick`, `sprintTick`, `toolTick`, `beatPauseTick`), "K1077" in
`docs/design/K441_fire_frame.md`, and the K441 stand kit in
`.claude/probes/K441/` (`k441_page.mjs`, `k441_pool.mjs`).

The ledger says:

> **K1081** · K1077: panel-rect reads force a layout per tick: aidTick on the realtime stand (+1.07 ms x1, +4.49 x4;
> main.ts:3650, frame_loop.ts:699) and the camera poll on every stand (~1.0 x1, ~4.3 x4; camera.ts:226 -> :219).
> Desktop only (no read under the phone's sheet; aidTick needs the panel open). Skip/cache the rect (K441 K1077).

What is there today (read it, don't trust this summary). The camera
reads the panel wrapper's rect every frame (`readPanel`, called by
`stepPanel` from `updateCamera`) into `panelBox`, and five button
ticks in `main.ts` each read the same element again whenever the
panel is open, to ask whether it covers their corner
(`covered(r)` on the aid, sprint, tool, beat-pause and cut buttons).
Every read can force a layout. The ledger's line numbers predate the
K5 split: the ticks live in `main.ts` today, and the camera's file
holds the one read the ticks could share. Under the phone's sheet
nothing reads the rect (the sheet counts as no panel), and with the
panel shut only the camera's read remains.

Tasks, in order:

1. Before counters. Write `.claude/probes/K1081/rects.mjs` (headed
   Chrome, a port in 5570-5579, under the perf lock; copy the K441
   pool's realtime and turn stands: an asleep knot, `&fw=0&phw=0`
   and the K83 clock pins, the panel open from before the load, the
   aids, sprint and tools on so their ticks run). Count
   `getBoundingClientRect` calls per frame over 120 frames on each
   stand (wrap the method in the page; say whose calls they are by
   turning button groups off in turn if the total needs it). The
   before table: reads a frame per stand, and which buttons show
   with the panel open and shut (a screenshot pair into
   `.claude/probes/K1081/shots/`).
2. Cache it. The camera's per-frame read becomes the only one: it
   keeps the last box it read (with the screen size, the wrapper's
   identity and the sheet query's state it read it under) and
   exposes it (`panelCssRect()`: the box, or null while shut, on the
   sheet, or before the first read). The five ticks in `main.ts`
   read that instead of the element. (`panelCoversCut` reads through
   the same cache.) The box may only change when the screen resizes,
   the panel opens or shuts, the wrapper is rebuilt, or the sheet
   query flips: if the probe shows the rect moving for another
   reason mid-frame, stop and report rather than cache harder.
   A source-scan test (`test/app/panel_rect.test.ts`, in the
   `panel_rows.test.ts` manner): `main.ts` holds no
   `getBoundingClientRect` and `camera.ts` holds exactly one.
3. Take the after table (the same stands), and the same screenshots:
   the buttons must hide and show exactly as before with the panel
   open and shut. Report the stands' tick p50 beside the counters
   as a secondary column (the desktop's load moves it; the Done
   check gates on the counters, not the ms).

Done check:

- After table: at most one rect read a frame on each stand (the
  camera's), on the realtime and turn stands alike.
- The open/shut button states and the screenshots match the before
  table.
- `npm test` passes.

Report: the before and after tables (counts, then ms), and the
reasons the cached box may change.

Close: `ledger.mjs done K1081 --commit <sha8> --what "one panel rect read a frame (camera cache)"`.
Suggested ports: 5570-5579.

## Run D · K1082: the burn re-declares only the chains it touches

Read first: `.claude/rules/render-explore.md` (THE THREAD REVEAL and
THE BURN), `.claude/rules/gameplay-fire.md` (BURN RACE, K114),
`.claude/rules/render-ribbon.md` (THE PARTS: where
`src/render/ribbon/` puts things), `.claude/rules/probes.md`; then
`drawFire`, `setBurn` and `syncExplore` in
`src/render/fabric_maze_renderer.ts`, `setExplore` in
`src/render/ribbon_renderer.ts` and in
`src/render/ribbon/explore_gaps.ts` (`setExplore`,
`applyExploreGaps`), "K441 s2" and "K1077" in
`docs/design/K441_fire_frame.md` (the sketch and cluster 2), and
`test/render/paint_explore.test.ts`.

The ledger says:

> **K1082** · K1077 (= K441 s2): the burn re-declare rebuilds fillets every frame on the realtime stand
> (about +1.1 ms x1, +8.4 ms x4): incremental setExplore (K441_fire_frame.md K1077, K441 s2 sketch).

What is there today (read it, don't trust this summary). On the
realtime burn stand the fire's front moves every frame, `setBurn`
re-declares the burn through `syncExplore` and
`ribbons.setExplore`, `applyExploreGaps` runs its per-mesh shader
loop over every mesh, and the paint pass then rebuilds the fillets
instead of standing pat (K1077's cluster 2: the re-declare's own
subtree, then `rebuildFillets` and its cluster behind `tickPaint`).
The turn stand's unchanged burn lets all of it stand pat. K441 s2's
sketch: (a) cache `burnOnlyPieces` per chain, keyed on the chain's
own burn (spans and fronts); (b) in `setExplore`, when the piece
boundaries are unchanged and only fronts and charred spans moved,
rewrite only the touched chains' slots, run the mesh loop for those
meshes and upload the dirty range. The fillets stand pat only if
the paint revision stops bumping on a front-only move: that is the
part this run proves or stops on. Nothing here edits
`src/render/ribbon/joinery.ts` (the fillet rebuild itself) or any
shader text.

Tasks, in order:

1. Before counters. Write `.claude/probes/K1082/burn.mjs` (headed
   Chrome, a port in 5580-5589, under the perf lock; copy Run C's
   realtime stand, with the burn race in realtime running, and the
   turn stand as its control). Per frame over 120 frames, count:
   `setExplore` calls, chains declared, `applyExploreGaps` mesh
   iterations, and fillet rebuilds (the renderer already installs a
   rebuild counter for the probes: find it beside `rebuildFillets`;
   if a count has no reader, add a read-only counter field and say
   so in the commit). The before table: those four counts a frame
   per stand.
2. The incremental declare. Build the sketch's (a) and (b) in
   `explore_gaps.ts` (and the `burnOnlyPieces` cache in
   `fabric_maze_renderer.ts` if it lives there; keep
   `ribbon_renderer.ts`'s delegation as it is where you can). A
   frame whose burn changed on no chain declares nothing. The
   declared tables must not move: on three burn states (early,
   mid and late front, pinned the way `probes.md` pins a fire
   frame: `tickFireFx` a no-op, `fireFx.clear()`, two frames), the
   declared gap and paint tables equal the before code's, read
   through the renderer's probe hooks, and a same-state capture
   pair reads 0 px (a same-build control first). The cache must
   never go stale either: add a probe-only hook that drops it and
   re-declares the current burn on every chain, and on every 10th
   frame of the realtime stand read the declared tables, call the
   hook, and read them again. They must be identical (a chain left
   stale by another chain's change shows here, not in the three
   pinned states).
3. The fillets. Take the after table on the same stands. If fillet
   rebuilds still run every burning frame because the paint
   revision bumps upstream of the declare, stop this part under
   K1050's stop rule 2 (the fix would live in the fillet rebuild,
   which this batch does not touch): keep the declare if its own
   counters and table checks pass, file the fillet remainder
   (below), and close K1082 for the declare half only, as the
   close lines at the end of this run say.

Done check:

- After table: frames with no burn change declare zero chains and
  iterate zero meshes; burning frames declare and iterate only the
  chains the front or the charred spans touched, on the realtime
  stand; the turn stand is unchanged.
- The declared tables equal the before code's on the three pinned
  states, and the same-state pair reads 0 px.
- The every-10th-frame stale check finds no difference.
- Fillet rebuilds a frame fall on the realtime stand, or task 3's
  stop fired and the remainder is filed.
- `npm test` passes.

Report: the before and after tables, the table-equality reads, and
whether the fillets stood pat.

Close, when every Done row passes and the fillets stood pat:
`ledger.mjs done K1082 --commit <sha8> --what "incremental burn declare; fillets stand pat"`.

If task 3 stopped, file the fillet half:
`ledger.mjs add --section Residuals --text "Burn re-declare: the fillets still rebuild every burning frame (the paint revision bumps upstream of the declare; split from K1082)"`,
and when the declare's own Done rows pass, close with
`ledger.mjs done K1082 --commit <sha8> --what "incremental burn declare; fillets split out"`,
saying in the commit which half is which. If the declare's own rows
fail, keep K1082 open and record the stop in its text.
Suggested ports: 5580-5589.

## Run E · K1083: gap slots declare only the chains that changed

Read first: `.claude/rules/render-gaps.md` (PER-PIXEL CROSSING GAPS,
G1), `.claude/rules/render-explore.md` (when `update()` runs),
`.claude/rules/probes.md`; then `update` and `computeGapSlot` in
`src/render/ribbon_renderer.ts`, `needsFxRender` in
`src/render/ribbon/paint_state.ts`, the site that sets
`exploreUpdatePending` in `src/render/fabric_maze_renderer.ts`,
"K1077" in `docs/design/K441_fire_frame.md` (cluster 3), and the
gap tests (`test/render/` beside `gap_mask.ts`). Run D lands first:
this run starts from its master.

The ledger says:

> **K1083** · K1077: RibbonRenderer.update redoes gap slots every frame on the realtime stand (about
> +0.97 ms x1, +4.5 ms x4): declare only changed chains (K441 K1077). Trace the trigger first: needsFxRender
> (paint_state.ts:719) reruns it on exploreUpdatePending (explore_gaps.ts:397, fabric_maze_renderer.ts:1082) or fxLive; under fxLive that fix won't stop it.

What is there today (read it, don't trust this summary).
`RibbonRenderer.update` redoes the gap slots whenever
`needsFxRender()` holds. The ledger's candidates: the fabric
renderer flags `exploreUpdatePending` when the explore declaration
changes (on the burn stand, every frame the front moves: Run D
narrows what that declares, not how often the flag is set), or
`fxLive` (plucks, flow and the rest still live on the stand). Under
the second, declaring only changed chains cannot make the pass
stand pat, because the pass is not what keeps it awake. Which one
holds on the realtime stand is unmeasured: this run measures it
first, and only builds under the first.

Tasks, in order:

1. Trace first. Write `.claude/probes/K1083/gaps.mjs` (headed
   Chrome, a port in 5590-5594, under the perf lock; Run D's
   realtime stand and a turn stand). Per frame over 120 frames,
   record which candidate holds (`exploreUpdatePending` or
   `fxLive`; if neither is readable from the page, add a read-only
   `lastFxCause` beside `needsFxRender` and say so in the commit),
   `computeGapSlot` calls, and chains and slots written. The before
   table: the cause and the three counts a frame per stand.
2. Only under the pending flag. Cache each chain's slot inputs
   (its geometry revision, its explore declaration and its protect
   values, the inputs `computeGapSlot` reads) and write slots only
   for chains whose inputs changed; a frame with no changed chain
   writes none. The written tables must equal the before code's on
   the same three pinned burn states Run D used (same-state pair
   0 px, same-build control first). The cache must never go stale
   either, as in Run D: a probe-only hook drops it and rewrites
   every chain's slots for the current state, and on every 10th
   frame the tables read the same before and after the hook, on
   the realtime stand and on a drag stand (a knot link with physics
   on and `&phw=0`, one thread pulled with `page.mouse` for 60
   frames, so the threads it crosses are rewritten or caught
   stale). If the cache key needs a shader
   text change or a change in `crossing_gaps.ts`'s slot math, stop
   under K1050's stop rule 2 and report: the slot contents are the
   thread ribbons' core, which this batch does not touch.
3. Under `fxLive`, build nothing. Report the cause table, close
   nothing, and file the finding (below): the pass already runs
   only while effects live, and the open question moves to why the
   stand stays live.

Done check:

- The cause table names one holder per stand (task 1), or the run
  reports why neither could be read.
- Under the pending flag: after table shows slot writes only on
  changed chains (zero on unchanged frames), tables equal, pair
  0 px; the every-10th-frame stale check finds no difference on
  the realtime and drag stands. Under `fxLive`: no code change,
  and the table is the report.
- `npm test` passes.

Report: the cause table and, when task 2 ran, the before and after
counts and table reads.

If task 3 fired, file:
`ledger.mjs add --section Residuals --text "Gap slots redo every frame because the realtime stand stays fxLive, not on the explore flag (split from K1083; K441 K1077)"`
and keep K1083 open with the cause in its text. If task 2 ran and
its Done rows pass:
`ledger.mjs done K1083 --commit <sha8> --what "gap slots declare changed chains only"`.
Suggested ports: 5590-5594.

## Run F · K1115: Reset lands on the default on every stepped row

Read first: `.claude/rules/gameplay-panel.md` (EVERY PARAM HAS A ROW,
the Reset), `.claude/rules/probes.md`; then `row`, `doReset` and the
per-row reset glyph in `src/ui/tweakpane_panel.ts`, the message of
commit `9e617d7a` (K130 and K495, with its 107-row sweep), the probe
it used (`.claude/probes/K130/reset.mjs`, if it is still there), and
`test/ui/panel_rows.test.ts`.

The ledger says:

> **K1115** · Panel: after Reset, 107 stepped rows land one step below their default when a link held an
> off-grid value (the list: 9e617d7a's message; 6B fixed four rows, K130/K495, by dropping `step`). Wants one
> general fix, not per row (Claude's call).

What is there today (read it, don't trust this summary). A stepped
row's grid is anchored on the value the row first shows. A link that
holds an off-grid value (a default plus 0.63 of a step, the K130
probe's construction) anchors the grid there, so `doReset` and the
row's own reset glyph, which write the default and then refresh,
land one step below it. K130 fixed four rows by dropping their
`step`; its sweep found 107 more stepped rows failing the same way
(the list is in `9e617d7a`'s message), 18 passing (mostly default-0
rows the range clamp rescues) and 8 skipped. Rows added since may
have moved those counts: this run re-derives them. The fix must
live in one place (`row`, `doReset`, the glyph), not in 107 option
objects, and a slider must still step as it did when dragged.

Tasks, in order:

1. Before sweep. Copy the K130 probe into `.claude/probes/K1115/`
   (a port in 5595-5599; if the original is gone, rebuild it from
   `9e617d7a`'s message: batched loads, 16 rows a load, each row's
   link value 0.63 steps off its default, then Reset, then read the
   params back). Sweep every stepped row the panel binds today.
   The before table: how many fail, and their names (expect about
   107; report today's list, don't force the count), plus three
   drag samples (a stepped row dragged on the fixed code's terms:
   where an edit lands) and the four K130 rows still exact.
2. The general fix. In `row` and the two reset paths only: give
   every stepped binding a grid anchored on its default, or make
   reset re-anchor before it refreshes (recreate the binding at
   the default, then refresh) — whichever one place does both
   without touching a row's options. Two things must survive it:
   the link's off-grid value still reads exactly before any reset
   (the sweep's loads prove it), and a dragged edit still lands on
   the grid it landed on before (the three samples). If the only
   general fix drops `step` everywhere or edits rows one by one,
   stop under the item's own terms ("one general fix, not per
   row") and report the options with their costs; if a drag lands
   differently after the fix, stop the same way (the sliders' feel
   is Levi's, K1111) and report the sample table.
3. Tests. `panel_rows.test.ts` already scans the panel's source:
   add a pin that the anchor or re-anchor lives in `row` and is
   used by both reset paths, and that no row gained or lost a
   `step` for this fix (the stepped set is the same before and
   after, apart from rows other work changed). The K130 rows'
   existing pins pass unchanged.

Done check:

- After sweep: every stepped row reads its exact default after
  Reset, the link values read exactly before it, and the three
  drag samples land where the before table landed.
- The four K130 rows still land exact.
- `npm test` passes.

Report: the before and after sweeps (counts and the names that
moved), the drag samples, and where the fix lives.

No item for Levi: the sweep decides this one.

Close: `ledger.mjs done K1115 --commit <sha8> --what "one general Reset fix in row/doReset"`.
Suggested ports: 5595-5599.

## Left out on purpose, for a later batch

Not for Muse, or not now (Next items in ledger order, each skipped
for the reason given):

- Junction work, as the brief's scope requires: K875 and K876
  (K868's oracle), K345 (rides the K868/K9 field), K9 (G4 on that
  field), K873, K935 and K941 (K922/K924 junctions), K943, K952,
  K953, K955 and K956 (K868/K940 junctions), and K1114 (S1g's
  at-rest crops: junction work, and a look for Claude and Levi).
- Cursive and text: K557 (after K115's redesign), K569, K582, K890
  (the K863 tracer's move), K912, K931 (once the lowercase
  settles), K937, K961, K948, K949, K1009, K990, K991, K1006,
  K997, K998, and K1112 (one join rule for every pair).
- The phone: K784 (sitting 6 on real touches), K10 (the
  benchmark), K365 (K279's phone round), K590 (the phone gap
  search), K919 (a phone ms saving), K1088 (Pixel frames a
  second), and K376 and K313 (a desktop half exists, but each
  ends on the phone or with Levi).
- Levi's look or decision before the work can start: K797 (the
  paper look's next stage), K409 (behind K623 and K624), K240
  (after K238's review), K46 (a proposal Levi iterates on; no
  `src/` change until agreed), K297 (which rows, after the
  churn), K340 (once Levi picks), K341 (after that iteration),
  K292 (a sheet for Levi first), K312 (held for approval), K543
  (when Levi wants the sheet), K649 (tuning by sheet), and K144
  (accounts: the backend is Levi's choice, and its next step is
  a design doc).
- A trigger that has not fired: K579 (pays only if K318 raises
  the counts), K531 (launch prep) and K533 (behind it, with
  accounts), K78 (once the churn settles), K116 (lowest
  priority, and a Pixel probe first), K318 (after K111 stage 5),
  K328 (with K265), and K786 (K138's stage 6).
- Lanes K1050 keeps off limits, or work the thread lane owns:
  K595 (physics: same-chain collision), K611 (the thread
  renderer's frame cost, across the K5 and G3 lanes), K265 and
  K328 (the paint highlight and rim profile, with their shader
  pins), K690 (the glyph root's GPU census), and K326 (dropping
  knot mode: a K1050 off-limit, a golden retarget, and well past
  300 lines).
- Not a desktop `npm test` task: K548 (the overnight runner's
  usage gate: coordinator and claude-config process, no game
  code), K887 (refreshing the open-work report: an external
  artifact and its stored picks, not a probe), and K709 (phone
  kit hardening: its untested half is a phone fault, and the
  rest edits untracked probes, so nothing to commit or test).
- Decided in part, too big for one run: K688 (healing cuts with
  the minotaur or the fire). Healing over permanent is decided;
  the heal count, the scissors' charges and the trapdoor's
  outcome are not, and the build crosses the controller, both
  minotaur clocks, the fire, the saved attempts and the renderer
  on top of K137-b's broken-run residuals. It wants a design
  stage of its own first, with the numbers pinned.

# K1107: Muse batch 6

Claude starts these runs through Paseo, one run at a time, after batch
5 (`docs/design/K1091_muse_batch5.md`) has merged and been reviewed. Each
run is a fresh Muse agent that reads this brief, does its run's tasks,
and stops. Claude reviews each run on master afterwards and closes K1107.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. None changes physics,
junctions, the cursive, or how the threads are drawn: junction and cursive
agents work in their own worktrees on `src/render/field/`,
`src/render/junction_*`, `src/render/arm_strip.ts` and
`src/render/ribbon/joinery.ts` while this batch runs, and no run below
touches those. Only Run C edits anything in `src/render/` (two files, the
marker mesh and the pluck overlay), and it stops at once if a warning it
chases comes from anywhere else there. Run A changes what the player
hears, and Run B, Run C and Run E what the player (or the console) sees,
in ways a counter or a table decides; none of them changes a picture.
The runs are in order of value to Levi, and no two share a file (Run D's
scratch edits to two source files are put back before it commits).

## How to work

The process in `docs/design/K1050_muse_week.md` applies unchanged. Read
its sections "Each task, start to finish", "When a task stops", "Rules",
"Off limits" and "Reports" before anything else. Where they say K1050,
read K1107 (`ledger.mjs handle K1107 ...`). Batch 3's, batch 4's and batch
5's rules hold too:

1. Close an item only when its Done check below passes. A task that
   stops keeps its item open. Its commit says `Status: partial`, the item
   says which stop rule fired and what is left, and the remainder is
   filed with `ledger.mjs add`.
2. Do the task as written. If the brief looks wrong (a file, function or
   param it names isn't there, or a number it quotes doesn't match),
   stop that task and quote the brief's line in your report. Don't
   substitute other work or other measurements. Line numbers in this
   brief come from a read on 2026-11-02 and drift: search for the name.
3. A `LEDGER:` commit holds `LEDGER.md` alone. A code fix goes in a work
   commit.
4. Update only K1107's handle
   (`ledger.mjs handle K1107 --last-commit <sha> --next "..."`). Don't
   close it or edit its text: Claude closes it.
5. No subagents: Paseo crashes when Muse spawns them.
6. When a run allows something that K1050's Rules or Off limits forbid,
   it says so in a line starting "Exception". The exception covers that
   run only.
7. Every server and probe uses a port in 5500-5599; batch 5 holds
   5510-5539, so this batch uses 5540-5589 (each run suggests a range).
   Old probes this batch copies may name other ports: change them. Start
   servers in the background and stop them when the run ends.
8. A probe's before table is taken on the unfixed code first, then the
   fix, then the after table. Both go in the commit message under
   `Checked:`. A fix whose before table already passes is not a fix: say
   so, close nothing, and report.
9. A scratch change to a source file, made only to prove a test or a guard
   catches a bug, is allowed when `git status --short <file>` shows the file
   clean first. Put it back with `git checkout -- <file>` before any commit
   and say so under `Checked:`. Never do this to a file that has changes
   you didn't make.
10. Write commit-message files as UTF-8 without a byte-order mark:
    `[IO.File]::WriteAllText(<absolute path>, <text>, (New-Object Text.UTF8Encoding $false))`
    or `Set-Content -Encoding utf8NoBOM`. Batch 5's `fc9b0eec` carries a
    BOM at the start of its subject.

Muse doesn't load `.claude/rules/` by itself. Each run names the rules
files to read before changing its area.

Timing measurements take the perf lock first: `$env:TEMP\claude-perf.lock`,
one line (owner, start time, what).
`.claude/probes/K441/lock_take_fast.ps1` (`-Owner <ID> -What "<text>"`)
and `.claude/probes/K441/lock_release_exact.ps1` (`-Owner <ID>`) take and
release it. If another owner holds it and it is under 30 minutes old,
wait inside one command. Delete it when you're done. (No run below times
anything; this stays for the case a probe turns out to.)

A follow-up for Levi goes to `Waiting on Levi` only when it is about
what Levi sees or feels, in plain words with no param or function names.
Where a run gives that item's text, use it as written.

End the run with a short report: one line per task with its status and
commit.

## Run A · K343: the snoring cat link snores on the first touch

Read first: `.claude/rules/gameplay-audio.md` (the AUDIO AUTOPLAY GATE
entry near the top, K720, and THE SNORING CAT LINK, from line 77),
`src/audio/snore_sfx.ts` (whole, 170 lines) and `test/audio/snore_sfx.test.ts`.

The ledger says:

> **K343** · K325's snore is silent before the first activation (no AudioContext: a first hover is
> silent, and the gesture that opens the audio gate plays nothing, the MP3 undecoded). Fix: decode
> on an OfflineAudioContext before the gate. `gameplay-audio.md`, THE SNORING CAT LINK.

What is there today (read it, don't trust this summary).
`SnoreSfx.preload()` fetches `public/snoring-cat-snore.mp3` (when the
panel opens, or from idle time on a panel that starts open) and then calls
`decodeWhenPossible()`, which asks `SampleHost.decodeSample()` to decode.
`KnotSynth.decodeSample` (`src/audio/knot_synth.ts`, near line 541) returns
null while no AudioContext exists, and until the autoplay gate opens none
does, so `SnoreSfx` parks on `host.whenOpen(...)` and decodes only after a
context exists. `play()` with no decoded buffer calls `host.open()` and
`preload()` and returns "unavailable": so the touch that opens the gate
starts the decode and makes no sound, and the next hover or touch is the
first that can snore. `playSample` (`knot_synth.ts`, near line 550) needs a
running context. `window.__knotSnore()` (`src/app/probe_hooks.ts`, near
line 245) returns `stats {fetches, decodes, plays}`.
An `AudioBuffer` belongs to no context, and an `OfflineAudioContext`
decodes with no autoplay gate and no sound hardware, so the decode can run
as soon as the bytes are in and the live context can play the finished
buffer later. Whether the sample-rate difference (the offline decode is at
the rate you give it, the live context may run at 48 kHz) matters is for
you to check on the played result (Task 3), not to assume.

Tasks, in order:

1. Probe first. Write `.claude/probes/K343/snore.mjs` (a headed Chrome on
   the dev server, a port in 5540-5549; model it on
   `.claude/probes/K325/level.mjs` for the page setup). Probe links
   normally add `&snd=none`, which here would silence what you are
   testing: read `gameplay-audio.md` and `src/main.ts` (read only, near
   the `SnoreSfx` construction, line 383 at the time of writing) for what
   `enabled()` reads, and use a link with sound on. Read
   `src/ui/snore_link.ts` first: a MOUSE snores on hover (`pointerenter`)
   and its click opens the link in a new tab with no snore, while a TOUCH
   snores on touch-down and opens the link about 300 ms later. A hover
   cannot open the audio gate, so the case this item fixes is a touch:
   the first touch of the page lands on the link. So the probe page is a
   touch page from load (411x753, `isMobile`, `hasTouch`; mobile emulation
   keeps what it loaded with), and its panel must already be open at load
   with no gesture, because a tap on the menu button would itself open the
   gate: seed the panel's open state in `localStorage` before load
   (`evaluateOnNewDocument`; probes.md names the key, `knotmaze.panelOpen`;
   read the panel code for the value). You read counters, you don't
   listen: after load, wait 3 s with no input and print `__knotSnore()`;
   then send ONE real touch tap on the snoring cat link (the "Made by
   Snoring Cat" anchor, `PanelApi.studioLink`) with `page.touchscreen.tap`
   (a real input is the gate's activating gesture: an `element.click()`
   from the page is not), close the tab it opens, and print the stats
   again after 0.5 s; then tap it a second time within 0.3 s of the first
   snore's start in a separate run, to see the never-stacked rule. Add a
   desktop row too, a mouse page with the panel seeded open: one real
   click on empty canvas away from the panel (it opens the gate), then a
   mouse hover onto the link at once, stats after 0.5 s. Take this table
   on unchanged code and keep it: it is the before table. Expect today:
   `decodes 0` before the tap and `plays 0` after it.
2. Decode before the gate. Give `SampleHost` an offline decode (a method
   such as `decodeOffline(bytes)` on `KnotSynth`, using
   `new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes)`; keep
   `decodeSample` and its null-until-a-context contract for the other
   callers) and make `SnoreSfx.decodeWhenPossible()` use it first, falling
   back to the old path only when `OfflineAudioContext` is missing or its
   decode rejects. Keep everything else in `SnoreSfx` as it is: the lazy
   fetch, the copy-before-decode, one warning and give-up on undecodable
   bytes, the never-stacked rule, the checks at play time. The fetch stays
   lazy; nothing new loads at page load.
3. Check the sound itself, still without ears: in the probe's page, after
   the press, read the played buffer's `sampleRate` and `duration` (hook
   the host's `playSample` argument from the page, or read it through
   `__knotSnore` if you extend it with the last played buffer's rate and
   duration, a test-only addition kept to `probe_hooks.ts`' existing
   pattern) and confirm the duration is 0.915 s +- 0.01 and that a
   `Context.sampleRate` of 48000 vs 44100 buffer plays (the browser
   resamples; no error, `plays 1`). If you cannot show this, report it.

Done check:

- Unit tests in `test/audio/snore_sfx.test.ts` (a fake host with the offline
  decode, a fake `load`): with no live context and the gate closed,
  `preload()` ends with `decodes 1` and a buffer held; the first `play()`
  after the gate opens returns "started" and `plays 1` with no second fetch
  and no second decode; a host without the offline decode behaves as today
  (the existing tests pass unchanged); undecodable bytes still give up with
  one warning; `play()` while the settings silence it still returns
  "unavailable". `npm test` passes.
- After table (probe): `decodes 1` before any input, and the one real
  touch tap on the link ends with `plays 1` (the gesture that opens the
  gate plays the snore). A second tap while the first still sounds adds no
  second play (never stacked). The desktop row's hover right after the
  gate-opening click plays. A page whose panel stays closed fetches
  nothing.
- Nothing in `src/main.ts` changes (it already wires `SnoreSfx` and
  `whenOpen`). If the probe shows the first press still cannot play
  because `open()` makes the context too late in the gesture, that is a
  second defect: stop (rule 3), report the table and file it.

Report: the before and after tables, and the sample-rate result of Task 3.

If code changed, file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "On the phone, with sound on and the settings panel left open from last time, reload and make your very first touch a tap on Made by Snoring Cat: do you hear the snore before the studio page opens? (K343, <sha>)"`

Close: `ledger.mjs done K343 --commit <sha8> --what "..."` when the Done
check passes. Suggested ports: 5540-5549.

## Run B · K130 and K495: Reset to defaults writes the defaults, and the End glow row shows only where it does something

Read first: `.claude/rules/gameplay-panel.md` (EXPLORATION ROWS, near line
134, and whatever it says about slider steps and Reset), `.claude/rules/probes.md`
(the panel and link recipes), and `test/ui/panel_rows.test.ts` (which scans
`src/ui/tweakpane_panel.ts` as source text). You only read the rules
files: K1050 forbids editing them. Where a rules sentence goes stale,
say which one in the commit message and Claude changes it.

The ledger says:

> **K130** · Rows with a slider step (`backgroundIntensity`, `pulseReach`, `settleBudget`,
> `loadSettle`) snap to Tweakpane's step grid from the row's first value: after an off-grid link,
> "Reset to defaults" writes a wrong default (intensity 0.48). `src/ui/tweakpane_panel.ts`; K79 B1.
>
> **K495** · The panel's end-glow row (`rvg`, K466) shows for every reveal-end look; hide it for the
> looks without a halo (gameplay-panel.md EXPLORATION ROWS).

What is there today (read it, don't trust this summary).
K130. Tweakpane's step constraint puts its grid on the row's FIRST value
(the value at the moment the row is built). A link whose value is off the
default's grid (0.73 for intensity) gives a grid of 0.73 +- n x 0.05, and
the pane's `refresh()` then snaps the value it shows, and writes the
snapped value back into the param. `doReset` in `tweakpane_panel.ts` (near
line 3452) does `Object.assign(params, PARAM_DEFAULTS)` and then
`pane.refresh()`: with intensity 0.73 loaded the default 0.5 is snapped to
0.48. The file already knows the defect and has worked around it row by
row with NO `step`: the burn race rows (comment near line 1903), the
backdrop speed (near 2736), the four backdrop shape rows (near 2766,
"Tweakpane's step grid starts at the row's FIRST value ... Reset to
defaults would write 0.98 for 1. An edit keeps 2 decimals", with a
`round2` helper) and `gridAlign` (near 3427). Four named rows still carry a
`step`: `backgroundIntensity` (near 2728, step 0.05), `pulseReach` (near
1596, 0.25), `settleBudget` (near 3101, 1) and `loadSettle` (near 3106,
0.05). Roughly 130 other rows carry a `step` too, so the defect is
probably general; the ledger names these four.
K495. `revealEndGlowRow` (near line 1573, param `revealEndGlow`,
"soft" | "bright") is shown with the other thread-reveal rows by
`revealEndGlowRow.hidden = !threads;` (near line 3584, in the function
that hides rows by mode). `RevealLook` is "fade" | "halo" | "glow" |
"dots" | "fray" | "beacon" (`src/ui/url_state.ts`, near line 249).
`gameplay-panel.md` says the glow row "shows for every look, though only
halo and beacon draw a halo", and the row's tooltip says the same ("the
halo and beacon ends").

Tasks, in order:

1. K130 probe. Write `.claude/probes/K130/reset.mjs` (a headed Chrome on
   the dev server, a port in 5550-5559). For each of the four keys, find
   its URL key and its parse and clamp rule in `src/ui/url_state.ts` and
   pick an off-grid value the link keeps (for `settleBudget`, whose step is
   1, a fractional value may be rounded by the parser; if no off-grid value
   survives the parser, say so for that row and use the hand-set value
   below). Load `?<seed>&<key>=<value>` (a `key=value` link, rewritten to
   the token on load), open the panel, press the Reset to defaults button
   and confirm in the modal (K834), and read what the page now writes in
   its address: a bare `?<seed>` means every param equals its default, and
   any changed entry is listed. If the page exposes the live params
   (`src/app/probe_hooks.ts`), print the four values too. Take the table on
   unchanged code first: for each key, the link value, the value after
   Reset, whether the address is bare. Expect 0.48 for intensity.
2. Fix K130 for the four rows the way the file already does it: remove
   `step` from the row's options, keep `min` and `max`, and have the row's
   change handler keep the old step's decimals (`round2` for the 0.05 and
   0.25 rows; a whole number for `settleBudget`), so an edit still lands on
   a clean value and a reset writes the exact default. Leave every other
   row alone. Run the probe's table on the rest of the stepped rows that
   take a plain number (a script loop over the keys in the `step:` list;
   skip rows whose link form is not a number) and put the ones that fail
   in the report with their numbers: do not change them (Claude decides if
   a general fix, such as building every stepped row from its default,
   is worth it).
3. K495. First read which looks actually read the halo strength:
   `src/render/explore_glsl.ts` and where `revealEndGlow` reaches the
   renderer (read only, nothing in `src/render/` changes). If it is not
   exactly halo and beacon, stop this task and quote that against the brief
   (rule 2). Otherwise hide the end glow row unless exploration is
   `threads` AND the look is halo or beacon, in the same function that
   hides it today, and make sure choosing a look runs that function (the
   look row's change handler may not call the panel's `refreshCond()`;
   read `row()` near line 849 and how other conditional rows get
   re-evaluated). A look you reach by link, by Reset, or by the reset
   glyph on the look row must hide or show it too.
4. Tests: `test/ui/panel_rows.test.ts` gains a source scan that the four
   rows have no `step:` and that the end glow row's hidden line names the
   look. They are weak (text, not behavior); the probe is the check.

Done check:

- After table, K130: for the four keys, after Reset the value is exactly
  the default and the address is bare. An edit on each of the four rows
  (a real drag with `page.mouse`) still lands on a value with the old
  step's decimals only.
- After table, K495: for each of the six looks under threads, the End
  glow row is shown for halo and beacon, hidden for the rest; hidden under
  `exploration` fog and off; changing the look on the page flips it without
  a reload; the other thread-reveal rows (`revealDistance`, `revealFade`,
  `revealEndCross`, `revealFinish`) are unchanged in every state.
- `npm test` passes, the pinned tests unchanged.

Report: both tables, the list of other stepped rows that failed the
reset check, and the `gameplay-panel.md` sentence that is now stale.

If code changed, file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "In the settings panel, drag Backdrop intensity, Pulse reach, Settle budget and Load settle: do the sliders still feel right? (They now move in finer steps; Reset to defaults now lands on the exact default.) (K130, <sha>)"`

Close: K130 and K495 each with `ledger.mjs done <ID> --commit <sha8> --what "..."`
when the Done check passes for that item. Suggested ports: 5550-5559.

## Run C · K128, K212 and K490: a quiet console on load

Read first: `docs/design/K299_choice_pulse_bug.md` (lines near 31 and 203:
the warnings print on master and are unrelated to that bug),
`.claude/rules/render.md` and the render topic file `docs/lore_index.md` maps
to `src/render/marker_mesh.ts`, and the one for `src/render/pluck_overlay.ts`.
Read `.claude/rules/probes.md` first for the console-capture recipe, if it
has one.

The ledger says:

> **K128** · `src/render/marker_mesh.ts:32` declares `in vec2 aUV;` but never reads it while the
> marker geometry carries it, so PixiJS warns "Attribute aUV is not present" per marker mesh on
> every load (K83; found by K81 stage 3a). Read it in the shader or drop it from the geometry.
>
> **K212** · PixiJS warns "Attribute aGap/aGapId/aUV is not present in the shader" on every
> load (K132's probes; Levi's console 2026-10-14, K311). Find which mesh binds attributes its
> program does not declare (`docs/design/K299_choice_pulse_bug.md`). On 2026-10-20 a run
> printed 10 of them, adding aEnv, aCol and aClipA/B/F (K406's probe).
>
> **K490** · A console "Failed to load resource ... 404" on every load of K465's preview build (not
> a pageerror; cause not investigated): check master's build and name the URL.
> K466 saw it on a vite dev server too (`.claude/probes/K466/sheet/key.txt`), so it is not
> preview-only.

What is there today (read it, don't trust this summary). PixiJS warns
when a mesh's geometry carries an attribute the program does not declare.
K128: `marker_mesh.ts` (the `in vec2 aUV;` line, near line 40 now)
declares `aUV` and the geometry supplies it, but the shader never reads
it (an unread input is optimized away, so the program has no such
attribute). K212: `pluck_overlay.ts` names attributes near lines 311-314,
542-543, 770-777 and 2090-2091; that is where this brief's author found
the names by search, NOT by running anything, so the real sources are for
Task 1 to find. K490: `index.html` links `./favicon.svg`,
`./apple-touch-icon.png` and `./manifest.webmanifest`, and `public/` holds
`404.html`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`,
`icon-512.png`, `manifest.webmanifest`, `snoring-cat-snore.mp3` and
`snoring-cat.png`; which request 404s is not known. Batch 5's Run D
(K1084) adds `public/_headers` and `.github/workflows/deploy.yml` is
its ground: this run does not touch either, and a 404 that turns out to
come from the deploy side (a headers or redirects rule) is reported, not
fixed.

Tasks, in order:

1. Capture. Write `.claude/probes/K212/console.mjs` (a headed Chrome on
   the dev server, a port in 5560-5569). For each of these links: `?7`
   (knot), a maze link (`?b.J&am=instant&snd=none&bg=none` as in K198's
   probe), and the same maze after one real pluck (a `page.mouse` drag on a
   thread and release): record every console message of type warning or
   error with its text, its `location().url`, and a count; record every
   response with status 400 or over (`page.on("response")`) and every
   `requestfailed`, with the URL and the resource type. To find which mesh
   a PixiJS attribute warning comes from, wrap `console.warn` before load
   (`evaluateOnNewDocument`) to keep `new Error().stack`, and print the top
   three frames of the stack per distinct warning. This is the before
   table: take it on unchanged code and keep it. It names K490's URL.
2. K128 and K212. For each distinct warning whose stack leads to
   `marker_mesh.ts` or `pluck_overlay.ts`, drop the unused attribute from
   the geometry or declare and read it, whichever is smaller; prefer
   dropping. If a warning's stack leads anywhere else (`ribbon_*`,
   `junction_*`, `field/`, `arm_strip.ts`, `gap_mask.ts`, the paint files),
   change nothing there: that is the thread renderer or junction ground
   (K1050 Off limits). List the warning, the stack and the file in the
   report.
3. K490. Name the URL in the report. If it is a file this repo should
   serve (a missing icon or a bad relative path in `index.html`,
   `public/` or `manifest.webmanifest`), fix it. If it comes from outside
   this repo (an injected analytics beacon, a Cloudflare path that exists
   only on the deployed site) say so with the evidence and change nothing.
4. Pictures must not move. A change to a mesh's attributes must leave the
   drawing byte for byte as it was, shown by a same-state A/B, not two
   ordinary loads: on the default worker host two loads of one link settle
   in different states (probes.md, K550), so plain screenshots differ
   everywhere. For the markers use K83's recipe
   (`.claude/probes/K83/k83_ab.mjs`, probes.md PROBE LORE K83: `phy=0`
   for a fixed layout, every clock pinned, each differing pixel attributed
   to a marker footprint); for the pluck overlay, K395's frozen-page A/B
   (`.claude/probes/K395/`, `probes-pluck.md`'s recipe) on the same pluck.
   Run a same-build control first (the build against itself): it must
   read 0 px, or the recipe is not pinned enough to judge anything; stop
   and report. Hold the perf lock for these pixel-exact runs (probes.md,
   K76 2b: another agent's GPU batch blanked frames in a sheet), even
   though nothing is timed. Then before against after: any differing pixel
   is a stop (rule 3): put the change back and report.

Done check:

- After table: on the three links, zero PixiJS "is not present in the
  shader" warnings that came from `marker_mesh.ts` or `pluck_overlay.ts`
  (the table says what remains and where it comes from); K490's URL is
  named, and either gone from the console or explained as not ours.
- The marker crops and the pluck crops are pixel-identical before and
  after (print the counts of differing pixels, 0).
- `npm test` passes, the pinned tests unchanged.

Report: the before and after tables, K490's URL with its cause, and every
warning left with its stack and file (Claude files those).

Close: K128 when its marker warning is gone; K212 only if every warning it
lists is gone, otherwise `ledger.mjs done` is wrong: leave K212 open, say
which attributes remain and from which file, and file the remainder with
`ledger.mjs add --section Residuals`; K490 when its URL is named and fixed
or explained. Use `ledger.mjs done <ID> --commit <sha8> --what "..."`.
Suggested ports: 5560-5569.

## Run D · K787 and K584: the beat rider's whole-game test checks what each turn returns

Read first: `docs/design/K774.md` (`## Handoff` from line 87, "The fix" from
line 129 and the Residuals near line 288), `test/app/beat_catch.test.ts`
(it mirrors main.ts's catch path; read its `turnCaught`, near line 120,
which respawns the controller with `c.respawn(false)` and rests the
rider), `test/game/beat_rider.test.ts` (the `ride()` helper near line 268
and "plays the turn minotaur one turn per committed move" near line 307)
and `src/game/beat_rider.ts` (`restAt` near line 135, `advance` near line
180; read only until Task 3).

The ledger says:

> **K787** · `test/game/beat_rider.test.ts` (the turn minotaur, one turn per committed move) ignores
> what `t.turn(run)` returns: after a catch every later turn rejects and the test still counts it,
> which is why it missed the K774 bug. Assert the result (K774 Handoff, `docs/design/K774.md`)
>
> **K584** · An optional SceneParams field silently drops from the worker-name build and loses the
> worker's fast start; only `worker_host.test.ts` catches it, since tsc skips tests (K393).

What is there today (read it, don't trust this summary). The test rides
whole games on seeds 3, 11 and 42 under both timings. Its callback is
`t.turn(run); t.setProgress(1); turns++;`, and its only checks are counts
(`turns` equals the departures, `c.taps.length` equals them, 3 games
ended). `TurnResult` is `"moved" | "caught" | "win" | "reject" | "noop"`
(`src/game/minotaur_turns.ts`, near line 1171); the test's own `OK()`
(near line 263) names "smolder" and "spool", which are the controller's
`tapEdge` results. A "caught" sends the MODEL's player to the entrance
and counts the catch, but nothing in this test respawns the controller
`c` (in main.ts a pending catch lands before the next move and respawns
it). So after the first catch every `t.turn` rejects while `c.tapEdge`
keeps taking phantom moves, and the counts still agree: that is the
ledger's "counts it". The fix for the real bug is on master as `e4dda058`
("K774 WIP: land a beat catch before the next departure"); K774.md also
names its pre-rebase twin `02032705`, which is NOT on master. It has
three parts: (a) main.ts's `moveAlong` lands a pending catch and refuses
that move, (b) `BeatRider.restAt` bumps a private `rests` counter and
`advance` returns as soon as a commit rested the rider (the line
`if (this.rests !== rests) return out;`, near line 190), (c) `turnCaught`
rests the rider at the new head. This harness runs the rider and the
controller but not main.ts, so only (b) is visible to it;
`test/app/beat_catch.test.ts` covers (a) and (c).
K584: `SceneParams` (`src/core/scene_graph.ts`, near line 23) has no
optional fields today, and `SCENE_FIELDS` in
`src/physics/physics_worker_core.ts` (near line 205) is typed
`Record<keyof SceneParams, "number" | "boolean" | "string">`, from which
`SCENE_KEYS` is derived (near line 244). `keyof` includes optional keys,
so a missing entry should be a compile error in `src`, which `npm test`'s
tsc step does check. `test/physics/worker_host.test.ts` has the "name
build (K7 stage 7)" tests (near line 226). K584 looks guarded already;
that is for Task 4 to prove.

Tasks, in order:

1. Before table, no source change. Add a temporary tally to the existing
   callback (the result of each `t.turn(run)`), run
   `npx vitest run test/game/beat_rider.test.ts`, and keep what it prints:
   per timing and seed, the counts of moved / caught / win / reject / noop
   and the move numbers of the first catch and of the first reject. Expect
   rejects after the first catch. This is the before table for `Checked:`.
2. Make the harness land a catch the way main.ts does, then assert.
   Mirror `beat_catch.test.ts`: when a move's result is "caught", mark the
   catch pending; the NEXT departure's commit lands it before it taps
   anything (`c.respawn(false)`, rest the rider at `c.head` with
   `restAt`, and refuse that move by returning false from the commit, as
   `moveAlong` does). `ride()` builds the rider itself, so let the commit
   callback reach it (a small signature change; the fire game's call
   sites stay working). Keep the seeds [3, 11, 42], both timings and the
   2-tick frame. Then assert, naming the seed, timing, move number and
   result in the failure message: every `t.turn` result is "moved",
   "caught" or "win" (never "reject" or "noop"; if a legal move can
   return "noop", read `TurnMinotaur.turn`, near line 1642, say which, and
   allow only that), and no `c.tapEdge` happens while a catch is pending
   (the K774 invariant). Add one small test of the assertion helper with a
   hand-made sequence: a catch followed by a "reject" must be flagged.
   If mirroring the landing takes more than about 40 lines of test code,
   stop this task (rule 2), keep Task 1's table in the commit message and
   report `Status: partial`.
3. Prove it can see K774, as far as this harness can. Only if
   `git status --short src/game/beat_rider.ts` is clean: delete the one
   statement `if (this.rests !== rests) return out;` in `advance` (a
   scratch edit; do not touch main.ts or beat_frame.ts), run
   `npx vitest run test/game/beat_rider.test.ts`, keep the failure output
   for `Checked:`, then `git checkout -- src/game/beat_rider.ts` and run
   it again green. If the test still passes with the guard removed, the
   whole-game test cannot see K774 at these seeds: keep Task 2's
   assertions (they still catch rejects), say so in the report, and close
   K787 with that sentence in `--what`; do not claim it would have caught
   K774.
4. K584, by proof. Only if `git status --short src/core/scene_graph.ts`
   is clean: add a throwaway optional field (`zz?: number`) to
   `SceneParams`, run the tsc call that `npm test` makes (read
   `package.json`'s `test` script for the exact command) and keep the
   error text, then `git checkout -- src/core/scene_graph.ts`. If tsc
   rejects it, K584 is already guarded: cite the error, name
   `SCENE_FIELDS` and `worker_host.test.ts`'s name-build tests, and close
   K584 with that as the reason (no code). If tsc accepts it, the guard is
   missing: stop, report, and leave K584 open.

Done check:

- Task 2: the new assertions pass on master's code with the same three
  seeds and both timings, and `npm test` passes.
- Task 3: with the guard removed the test fails naming a seed and a
  result, or the report says it could not (both outputs under `Checked:`).
- Task 4: the tsc error text for the throwaway optional field.
- `git status --short` shows only `test/game/beat_rider.test.ts` changed.

Report: the before and after tables, the failing output of Task 3 and the
error text of Task 4.

Close: K787 with `ledger.mjs done K787 --commit <sha8> --what "..."` when
Tasks 2 and 3 are done; K584 with
`ledger.mjs done K584 --commit <sha8> --what "already guarded: ..."` when
Task 4 proves it (the commit is the one that holds your Checked text; if
K584 needs no code, use K787's commit). Suggested ports: none (no
server).

## Run E · K112: another tab's Motion change is picked up live

Read first: `.claude/rules/gameplay-motion.md` (the Motion setting, K79 and
K111) and `src/ui/motion.ts` (whole), `test/ui/motion.test.ts`.

The ledger says:

> **K112** · Motion setting residuals (K79, 9ffda8a): no cross-tab sync (another tab picks a change
> up on reload; `src/ui/motion.ts`), and the camera's reduced-motion jump on an edge-indicator tap
> was code-reviewed, not probed.

This run does the first half only. The second half, the camera's jump, is
already filed as K1109, which batch 7's Run D probes
(`docs/design/K1108_muse_batch7.md`); leave it and `src/app/camera.ts`
alone.

What is there today (read it, don't trust this summary). `MotionSetting`
(`src/ui/motion.ts`) reads its choice ("system" | "full" | "reduced") from
`localStorage` under `MOTION_KEY` once, in the constructor, and writes it in
`setPref`. It listens to the system's media query (`prefers-reduced-motion`)
but not to the `storage` event, so a change made in another tab of the
same browser shows only after a reload. Its constructor takes
`(storage, query, root)`; `subscribe(fn)` is what the panel and the scene
follow, and `changed()` applies `root.dataset.motion` and calls the
listeners. `main.ts` builds it (do not edit `main.ts`): so the storage
listener has to be wired inside `motion.ts`, through an optional fourth
constructor parameter that defaults to `window` when there is one.

Tasks, in order:

1. Probe first. Write `.claude/probes/K112/tabs.mjs` (a headed Chrome, a
   port in 5570-5579): one browser, two pages on the same maze link
   (`?b.J&am=instant&snd=none&bg=none`), same origin so they share
   `localStorage`. In page 1 set the Motion setting to "reduced" through the
   panel's row (the setting is a viewer preference; look in
   `tweakpane_panel.ts` for the row, `motionRow`), then in page 2, with no
   reload, read `document.documentElement.dataset.motion`,
   `window.__knotMotion` (or whatever `probe_hooks.ts` exposes) and the
   panel row's shown value. Then set "full" in page 2 and read page 1.
   The before table is expected to show page 2 unchanged until a reload.
2. Add the listener. In `MotionSetting`, an optional parameter such as
   `events?: { addEventListener(type: "storage", fn: (e: { key: string | null; newValue: string | null }) => void): void } | null`
   that defaults to `typeof window !== "undefined" ? window : null`. On a
   `storage` event whose `key` is `MOTION_KEY` (or null: the other tab
   cleared storage), set the choice from `parseMotionPref(e.newValue)`
   and, only if the answer (`pref`) changed, call the same `changed()`
   path `setPref` uses, but WITHOUT writing storage again (the other tab
   already did; a write here would echo). Ignore every other key. Wrap
   the registration in try/catch like the media query's, so a missing or
   throwing `window` leaves the setting working as it does today.
3. Tests in `test/ui/motion.test.ts` with a fake events object: a storage
   event for `MOTION_KEY` changes `pref`, `reduced`, `root.dataset.motion`
   and calls the listeners once; the same value twice calls them once; an
   event for another key does nothing; `key: null` returns to "system";
   no events object (null) still works; a constructor that throws on
   registration does not break the setting; a listener that throws does not
   stop the others (the existing guard). The existing tests pass unchanged.

Done check:

- After table: page 2 follows page 1's change and page 1 follows page 2's
  with no reload, in `dataset.motion`, the setting's state and the panel
  row's shown value. If the panel row does not follow while the dataset
  does, the panel needs the `syncAccessibility` path
  (`tweakpane_panel.ts`, near line 3994): that is a panel edit; do it only
  if it is four lines or fewer, otherwise stop (rule 3) and report.
- The probe's own tab does not echo: page 1 writes storage once for its
  own change (count `setItem` calls with a page-side wrapper).
- `npm test` passes.

Report: the before and after tables.

If code changed, file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "With the game open in two browser tabs, change Motion in one: does the other tab follow at once, with no reload? (K112, <sha>)"`

Close: `ledger.mjs done K112 --commit <sha8> --what "cross-tab sync only; the camera half is K1109"`
when the Done check passes.
Suggested ports: 5570-5579.

## Run F · K403, K263, K600, K609 and K462: lore and design docs say what the code does

Read first: nothing in `.claude/rules/` is needed beyond the files below.
The work is reading each claim against the code and rewriting the words.

Exception: this run may edit `.claude/rules/gameplay-minotaur.md`,
`.claude/rules/gameplay-links.md`, `.claude/rules/render-pluck.md` and
`.claude/rules/probes-pluck.md`, and the design docs `docs/design/K74.md`,
`docs/design/K80_turns.md` and `docs/design/K323_game_mode.md`, to correct
statements of fact only, and the one comment in `src/game/minotaur_turns.ts`
named in Task 1 (no code line). K1050 forbids `.claude/rules/` edits;
Claude granted this run the exception (2026-11-02) for these factual
corrections only, and reviews each one. It may not touch `CLAUDE.md`, `docs/lore_index.md`,
`LEDGER.md` outside `ledger.mjs`, or `src/main.ts`.

The ledger says:

> **K403** · Doc drift from the K74/K80/K114 briefs: `minotaur_turns.ts` 41-42 puts abbott in stage
> 3 (`K80_turns.md`: stage 4); `gameplay-minotaur.md` cites "codec v5 108-116"; `main.ts` 3177-3179
> says tapsWait is off (on, 3283); `K74.md` 104 and 114-116 misname stage 3's sections.
>
> **K263** · `minotaur.ts` exports `undoAllowed`, but nothing in `src` calls it, no move undo
> exists, and `docs/design/K80_turns.md` step 2 cites it as real time's behavior. Delete it, or wire
> it when an undo lands.
>
> **K600** · `.claude/rules/gameplay-links.md` lacks the `gm` key (`gameMode`) and a K534 entry.
>
> **K609** · K395's example loop `9:133` no longer exists in `?7` (2026-10-20), so render-pluck.md's
> Pluck loop tip entry and probes-pluck.md's K395 recipe point at a loop that no longer reproduces.
> K406's sheet used chain 2, key 427 (`.claude/probes/K406/sheet/notes.md`).
>
> **K462** · K323 Stage A's design (`docs/design/K323_game_mode.md`: the params table ~l.89, the
> undo list ~l.222) predates `fireClock`, `burnt` and K440's real-time pair (`fsr`, `fdr`): Stage A
> carries the pair and labels it (its proposed labels describe the turn pair).

What is there today (read it, don't trust this summary). K263's code is
done: `undoAllowed` is gone from `src` (the K534 Stage A1 commit,
`35f3ec28`; `src/game/minotaur.ts` near line 124 and
`test/game/minotaur.test.ts` near line 316 say so), but the words still
cite it: `.claude/rules/gameplay-minotaur.md` near lines 37 and 308 say
"no undo (`undoAllowed(clock)`, which K92 must consult)" and "no move undo
(`undoAllowed(clock, minotaur)`)", and `docs/design/K80_turns.md` near
lines 98 and 234 (and `K92.md`, `K323_game_mode.md` near 228, `K324`,
`K480.md`, which are history and stay as written). K403: the
`abbott` comment in `src/game/minotaur_turns.ts` is near line 69 now
("stage 3 appends abbott"), while `K80_turns.md` line 52 says "Stage 4:
Abbott's rule"; `gameplay-minotaur.md` near line 297 reads "108-116
(codec v5 then, v6 since K76 stage 2c)" and the codec is at
`CODEC_VERSION` 9 now (`src/ui/param_codec.ts`, near line 683).
K600: `gameplay-links.md` has no `gm` / `gameMode` / K534 text at all (a
search for those found nothing). K609: neither `render-pluck.md` (the
"Pluck loop tip (K395)" entry, near line 520, and "chain 9's loop" near
536, 557 and 577) nor `probes-pluck.md` (the K395 entry near line 120)
names `9:133` any more, but both say "chain 9's loop".

Tasks, in order (each is words, checked against code, in its own commit
or one commit per item, your choice):

1. K403. Fix the `minotaur_turns.ts` comment
   (stage 4, per `K80_turns.md`; read the stage list there first and
   follow it); in `gameplay-minotaur.md` replace "108-116 (codec v5 then,
   v6 since ...)" with the params' names and a pointer to `CODEC_PARAMS`
   in `src/ui/param_codec.ts` (indices and codec versions drift, names
   don't: write no index or version number); in `K74.md` near lines 104 and
   114-116 compare each named section of stage 3 with the section list of
   the design doc K74 names (`docs/design/K74_*.md`, search for it) and
   correct the names. The `main.ts` clause ("tapsWait is off (on, 3283)")
   needs no edit: `c268a9b0` moved the key input out of `main.ts`, and
   `3b1612fb` made `tapsWait` a readable legacy flag with no effect
   (`src/app/input_keys.ts` near line 168). Search `src/main.ts` for
   `tapsWait` and confirm no comment there says it is off; put what you
   found under `Checked:`. Don't edit `main.ts`.
2. K263. In `gameplay-minotaur.md` (both places) say there is no move undo
   and no `undoAllowed` (removed in `35f3ec28`, K263); in `K80_turns.md`
   (both places) add "(removed in K534, K263)" after each mention. Do not
   touch the other design docs.
3. K600. Add to `gameplay-links.md` the `gm` key: what `gameMode` takes
   ("classic" | "minotaur" | "burn", read `src/ui/url_state.ts`) and that it
   is in `CODEC_PARAMS`, in the file's existing style, plus a K534 entry
   (read `git show 35f3ec28 --stat` and the commit message). Name params,
   not codec indices or today's `CODEC_VERSION`: those drift. Quote no
   number you did not read.
4. K609. Replace "chain 9's loop" and the `9:133` recipe with K406's
   example (chain 2, key 427, `.claude/probes/K406/sheet/notes.md` has the
   setup) only after you have shown it still reproduces: follow K406's
   setup on `?7` and check that chain 2, key 427 is a kink loop whose tip
   the K395 harness (`.claude/probes/K395/`) shows. If it does not
   reproduce, stop this task (rule 3), change nothing in those two files,
   and report what you saw.
5. K462. Update `K323_game_mode.md`'s params table (near line 89) and undo
   list (near line 222) to what Stage A actually carries: read the
   `PARAM_DEFAULTS` keys and the `CODEC_PARAMS` entries for `fireClock`,
   `burnt`, `fsr` and `fdr`, and the labels in `tweakpane_panel.ts`'s Burn
   race rows; write what is there, mark it as updated 2026-11 in the
   doc, and leave the rest of the doc as history.

Done check:

- Every changed statement now matches the code you read for it (list each
  statement, the file and line you checked it against, in the commit
  message under `Checked:`).
- `git diff --stat` shows only the files in the Exception line; the one code
  file differs by comment lines only (`git diff -U0 src/game/minotaur_turns.ts`
  shows only `//` lines).
- `npm test` passes (a rules change cannot break it; a comment change must
  not).

Report: for each item, the statements changed and anything you found
stale that you did not change.

Close: K403, K263, K600, K462 and K609 each with
`ledger.mjs done <ID> --commit <sha8> --what "..."` when their statements
check out. If a comment in `src/main.ts` still says `tapsWait` is off,
close K403 with `--what "docs and comment; main.ts comment still stale"`
and file that clause with `ledger.mjs add --section Residuals`.
Suggested ports: 5580-5589 (only for K609).

## Left out on purpose, for a later batch

K368 (a ring for the pluck ripple under High contrast) and K426 (rows in
`docs/lore_index.md`) touched batch 5's files; they are in batch 7
(`docs/design/K1108_muse_batch7.md`). Ledger-only hygiene stays Claude's.

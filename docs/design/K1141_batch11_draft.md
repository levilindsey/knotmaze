# Muse batch 11 (draft, from K1141 Run B)

Claude starts these runs through Paseo, one run at a time, after batch
10 (`docs/design/K1141_muse_batch10.md`, K1141) has been reviewed and
closed. Each run is a fresh Muse agent that reads this brief, does its
run's tasks, and stops. Claude reviews each run on master afterwards
and closes batch 11's item. This draft has SIX runs. Claude reviews
the draft, opens batch 11's item, fills its ID in below and renames
this file.

Where the runs came from (K1141 Run B's order): batch 10 used up this
batch's `Next` list, so candidates came from (1) `## Approved, to
schedule` in `LEDGER.md` (K22, K23, K322, K804 and K805, in that
order), then (2) `## Residuals (known, not fixed)` in ledger order,
then (3) two `Next` items whose next step is a design document (K144,
K688). Residuals were read in ledger order through **K207** (the last
residual read; batch 12's draft starts after K207). One run fits from
Approved (K804, in part), three from the Residuals read through K207
(K1130, K252, K207), and the two design-doc runs fill the batch. See
"Left out on purpose" at the end for every candidate read and skipped,
and why.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. Runs A, C and D change
game code, Run B changes a tracked probe script only, and Runs E and F
write a design document and change nothing in `src/`. No run changes
physics, junctions, the cursive, or the thread ribbons' shader text.
Runs A and D both touch `src/render/fabric_maze_renderer.ts`, in
different functions (the head pulse and ring; the fog stamps), so the
run order A to F is load-bearing: each run starts from the latest
master.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read batch 11's item wherever it says K1131, and
K1137's rule 11 and K1141's rules 11 and 12 wherever they apply: rule
11 (a re-measurement copies the original stand's link verbatim, read
from the old probe's source, not from a summary of it, and its table
names everything it adds or changes) wherever a stand is copied, and
rule 12 (dependencies: neither run should need a new or changed
package; if one changes anyway, `npm audit` must report no high or
critical advisory afterwards, and a security fix is taken even when it
was published less than two weeks ago) wherever a dependency moves.
Use ports 5500-5549 (batch 9's range, free again; each run below names
its range).

After each run, update batch 11's handle:
`ledger.mjs handle <batch-11 item> --last-commit <sha8> --next "Run <X> done; next Run <Y>"`
(after Run F: `--next "Run F done; batch 11 complete, Claude reviews and closes <batch-11 item>"`).
(Claude fills the item ID in when opening batch 11.)

## Run A · K804: beat indicators at the dot (pulse or ring, no dots)

Read first: `.claude/rules/gameplay-beat.md` (THE BEAT RIDER),
`.claude/rules/gameplay-panel.md` (CLOCK AND BEAT ROWS),
`.claude/rules/gameplay-links.md` (BEAT RIDER PARAMS),
`.claude/rules/probes.md`; then `beatPhase` in
`src/game/beat_clock.ts`, `beatSettingsOf` in `src/ui/url_state.ts`,
the beat rows in `src/ui/tweakpane_panel.ts`, the codec's append rule
in `src/ui/param_codec.ts` (its header is the format spec), `tickBeat`
in `src/main.ts` (where the fabric renderer's pulse is fed),
`beatPulse`, `pulseEnv`, `pulsedHeadR`, `pulseHead` and the head glow
in `src/render/fabric_maze_renderer.ts`, the old beat probe
`.claude/probes/K114/beat/beat_page.mjs` (its link construction is
this run's stand), and `test/game/beat_clock.test.ts`,
`test/ui/param_codec.test.ts` and `test/ui/url_codec.test.ts` to copy.

The ledger says (Approved, to schedule):

> **K804** · Beat indicators (Levi 2026-10-21, once there is budget): a dropdown param for showing
> when and where beats fall, inside multi-beat runs too: a pulse or a pluck at the dot, a crisp ring
> from its marker on each beat, or dots at the beat points along threads and junctions that pop with
> a ring when eaten. Takes over K114 beat item 6, the pulse (`docs/design/levi_notes_2026-10-21.md`)

This run takes the dropdown and the two looks at the dot only: the
pulse (today's look) and the crisp ring from the marker. It does not
build the dots at the beat points, along threads or at junctions, and
files them (below). Why: the pulse and the ring both live at the head
marker, whose beat phase the game already feeds every frame (below);
the dots need a new per-run table of beat points inside multi-beat
runs, an eaten state that survives moves, Undo and restarts, and
placement at junctions, and they are the foundation K805 builds on —
a build of their own, not a tail on this one.

What is there today (read it, don't trust this summary). While the
beat is the clock, `tickBeat` in `src/main.ts` feeds
`scene.fabric.beatPulse = beat.phase()` each frame and calls
`pulseHead()`: `beatPulse` is the phase in the beat (0..1,
`beatPhase` in `src/game/beat_clock.ts`), `pulseEnv` decays as
(1 - f)^2 from the beat, the head ring swells by 0.16 of that (or,
under Reduced motion, the head glow brightens by 0.25 instead of
swelling). There is no param for it: under `clk=beat` the pulse is
always on, and there is no ring look and no off setting. Beat
settings read through `beatSettingsOf` (`beatTempo`, `beatLength`,
`beatCap`, `beatTiming`, `beatPerRun`); the panel's beat rows show
only while the clock is beat.

Tasks, in order (ports 5500-5509, headed real-time Chrome):

1. The before stand. Copy the beat probe's link construction verbatim
   from `.claude/probes/K114/beat/beat_page.mjs` (seed 7,
   `?7&am=instant&snd=none&clk=beat`, read there, not from this brief)
   into `.claude/probes/K804/indicator.mjs`; name every change from
   that source (the port, in 5500-5509, included). Pin the beat phase
   per `probes.md` (a fixed tempo, the clock's ticks read in the page,
   shots at stated phases), run a same-build control first, and take
   a throwaway first shot (K1130). The before table: at phases 0,
   about 0.25 and about 0.5, the head ring's drawn radius and the
   head glow's alpha (read in the page, and a shot each into
   `.claude/probes/K804/shots/`), showing today's pulse and no way to
   turn it off or choose a ring.
2. The param. Append one choice param, `beatIndicator`
   (`pulse | ring | off`, default `pulse`: today's look, so a default
   design does not move), at the end of `PARAM_DEFAULTS` in
   `src/ui/url_state.ts` and at the end of `CODEC_PARAMS` in
   `src/ui/param_codec.ts` as a `choice`, with its legacy link reader
   and short key wired the way `beatTiming`'s is. `CODEC_VERSION`
   stays as it is. A row in the panel's beat folder, beside the beat
   rows, shown only while the clock is beat, applies live (no solve
   restart: it is a look). Tests: the codec table pin changes only by
   the appended entry (say so in the commit; K1050's stop rule 1
   exception for an appended key, as K807's rows did), a link with
   each value reads it back, and a bad value reads the default. Daily
   treatment follows the other beat settings (it is a design
   setting, not a playback preference; do not add it to the exempt
   set).
3. The two looks. In `src/main.ts`'s `tickBeat` and the fabric
   renderer, the param chooses what the fed phase drives: `pulse`
   is today's path unchanged; `off` feeds no pulse (the head ring
   keeps its plain radius, the glow its plain alpha); `ring` feeds
   no swell and instead draws one crisp ring centred on the head
   marker, starting at the head ring's radius on the beat and
   expanding to a stated multiple of it over the beat while its
   alpha fades, from the same phase. Under Reduced motion the ring
   does not expand: it brightens at the beat and fades, the way the
   pulse treats Reduced motion today. The ring draws from the
   renderer's existing marker machinery (a pooled mesh, as the other
   marker pools do); no new shader text, and nothing draws when the
   clock is not beat, the solve is over, or no head is drawn. Put the
   ring's radius and alpha as a pure function of phase beside
   `beatPhase` (in `src/game/beat_clock.ts`), with tests at phases
   0, 0.25, 0.5 and 1 in `test/game/beat_clock.test.ts`. No pluck
   vibration look in this run: Levi's words offer it as an
   alternative at the dot, and pulse and ring are the two this run
   ships; say so in the commit.
4. The after stand. Rerun task 1's probe on the fixed build (same
   link plus only the `beatIndicator` values, named in the table):
   `pulse` reads the before table's numbers; `off` reads the plain
   radius and alpha at every phase; `ring` reads its pure function's
   radius and alpha at the pinned phases. A same-state A/B of the
   default design (the beat link at its defaults, `&fw=0&phw=0`
   added, every clock pinned per `probes.md`, a same-build control
   first) reads 0 px before and after the commit. Shots for all
   three settings at the pinned phases go in
   `.claude/probes/K804/shots/`.

Exception (K1050's stop rule 1): the codec pin in
`test/ui/param_codec.test.ts` changes only by the appended
`beatIndicator` entry and its index. No other expected value may
change.

Done:

- The param reads from links and the panel row, defaults to `pulse`,
  and applies live under the beat only.
- After table: `pulse` matches the before table, `off` is plain at
  every pinned phase, `ring` matches its pure function at every
  pinned phase; the pure tests pass.
- The default design's same-state A/B reads 0 px; `npm test` passes;
  the shots exist.

Report: the before and after tables, and which of Levi's three looks
this run did not build (the dots, and the pluck vibration).

If the Done rows pass, file the dots as their own item:
`ledger.mjs add --section Next --text "Beat dots: dots at the beat points inside multi-beat runs, along threads and at junctions, that pop with a ring when the dot eats them; the dropdown and the pulse and ring at the dot are done (split from K804). Builds toward K805."`,
then close K804 for this half:
`ledger.mjs done K804 --commit <sha8> --what "beat indicator dropdown: pulse and ring at the dot; dots split out"`.

And file this for Levi, as written (fill the new item's ID and the
commit in):
`ledger.mjs add --section "Waiting on Levi" --text "Under the beat, a new Beat indicator choice: the pulse you have today, a crisp ring that spreads from your marker on each beat, or off. Does the ring read well? Pictures: .claude/probes/K804/shots/ (K804, <sha>)"`

Suggested ports: 5500-5509.

## Run B · K1130: the diagnostic screenshot takes its throwaway first

Read first: `.claude/rules/probes.md` (the verification rule and the
K1130 lore); then `scripts/diag_screenshot.mjs` whole (it is the
tracked diagnostic driver: a headed, hardware-GPU Chrome, one
screenshot after the settle, its JSON report of stamp, timing and
frame intervals), and `docs/design/K147.md` (the timing its header
explains). No `src/` file changes in this run.

The ledger says (Residuals):

> **K1130** · K309 inject probes: a run's first normal screenshot can come back dark and nearly blank (round 2026-11-02 rimSeam, 3848 bytes against 628314; round 2026-11-03 handoff step 3b). Take a throwaway first shot, or shoot each state twice and diff the repeat, before believing a pair.

What is there today (read it, don't trust this summary).
`diag_screenshot.mjs` navigates, foregrounds the window, waits the
settle argument, reads the page facts and takes exactly one
screenshot, the saved one. Nothing in it warms the capture path, and
its report does not say how large the saved file was: a dark first
capture of the kind K1130 names would be saved and believed. The
probes.md lore already tells every hand-written probe to take a
throwaway first shot; the one driver every probe shares is the place
that lore becomes automatic.

Tasks, in order (ports 5510-5519, headed real-time Chrome):

1. The before table. Serve a build (a `pwsh scripts/preview.ps1`
   build, or the dev server) on a port in 5510-5519 and run
   `node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]` five
   times on one full design link (a bare URL is today's daily, so
   use a token link, e.g. a seed-7 design with `&am=instant&snd=none`
   added; name the whole link in the table). For each run record the
   saved file's byte count and its mean luma (read the PNG back in
   the probe, not by eye), and say whether any saved shot is dark and
   nearly blank in K1130's sense (state your threshold before the
   runs: for example under 20,000 bytes, against K1130's 3,848 dark
   and 628,314 normal). If none of the five is dark, say so: the
   after table then proves the warm-up costs nothing and changes
   nothing, not that it caught the fault.
2. The throwaway. In `diag_screenshot.mjs`, at capture time, before
   the saved screenshot: take one screenshot into memory and discard
   it, then take the saved one as today. The report's JSON gains the
   discarded shot's byte count beside the saved one's, and a line
   that flags the saved shot when it falls under the threshold from
   task 1 (state the constant once, at the top of the file, naming
   K1130). Nothing else about the run changes: same settle, same
   facts, same saved path, and the discarded shot is never written
   to disk.
3. The after table. The same five runs on the fixed driver: every
   saved shot over the threshold, the discarded and saved byte
   counts per run, and, for one run, the pixel difference between
   the saved shot and a second saved shot of the same state taken
   straight after it (the repeat diff K1130's text offers), so the
   table says the warm-up did not change what a settled page draws.
   `node --check scripts/diag_screenshot.mjs` passes, and one
   before/after pair of the same link at the same settle reads the
   same stamp and timing shape (its `frames` median a healthy
   16.7 ms class, not the throttled class).

Done:

- The driver discards a first capture at capture time and reports
  both byte counts, flagging a saved shot under the stated
  threshold.
- After table: five saved shots, none dark in K1130's sense; the
  repeat diff and the stamp are as the before table's good runs
  read.
- `npm test` passes (the driver is not in the suite; the check is
  the probe table and `node --check`).

Report: the before and after tables, with the threshold stated, and
whether the before table caught a dark shot at all.

Close: `ledger.mjs done K1130 --commit <sha8> --what "diag screenshot discards a throwaway first capture and flags a near-blank save"`.
If the after table still saves a dark shot in any of the five, close
nothing, and record the counts in K1130's text instead.

Suggested ports: 5510-5519.

## Run C · K252 (a): the pan range's ease by time, not by frame

Read first: `.claude/rules/gameplay-camera.md` (FIT CAMERA PAN
RANGE, K198), `.claude/rules/probes.md`; then `RANGE_EASE`,
`easeIntoRange` and `stepRange` in `src/ui/view_clamp.ts`,
`easeView`, `stepPanel`, `updateCamera` and `fitToScreen` in
`src/app/camera.ts`, and the easing tests in
`test/ui/view_clamp.test.ts`.

The ledger says (Residuals):

> **K252** · K198 s2's residuals: (a) `RANGE_EASE` is a per-frame ease (0.15), so resize and fit
> drift settle faster at higher fps; (b) the head's 0.45 s show delay rests on five blips (longest
> 0.33 s): K156's next phone pass can check more. (`docs/design/K198.md`, "Stage 2 handoff").

This run takes (a) only. Part (b) is a phone measurement with no
desktop stand, and stays in K252's text (the close lines below say
how).

What is there today (read it, don't trust this summary).
`easeIntoRange` (in `src/ui/view_clamp.ts`) keeps (1 - rate) of how
far the view sits past each pan bound, once per call, with
`RANGE_EASE` 0.15 as the default rate; `stepRange` wraps it for the
panel edge's frame pair. `easeView` in `src/app/camera.ts` calls it
once per `updateCamera` frame with no time in hand, although
`updateCamera` itself receives the frame's `dt`, and the panel's own
tween beside it (`stepPanelTween`) is already time-based: the view
rides a closing panel home in `PANEL_TWEEN_S` at any frame rate. So
the range's ease home from a resize or fit drift runs 4x faster at
120 fps than at 30. The view_clamp tests pin the per-frame steps at
an unstated frame rate, and a time-based test for the panel tween
already sits beside them (30, 60 and 120 Hz put the view in the same
place at the same time).

Tasks, in order (ports 5520-5529, if a run needs a server at all):

1. The before table, from the pure functions alone (no browser):
   drive `easeIntoRange` from the same out-of-range view at 30, 60
   and 120 calls a second, in a scratch script, and record the wall
   time each rate takes the view to within 0.5 px of the bound (the
   ease's own drop threshold). The table shows the 4x spread K252
   names. (The scratch script lives in `.claude/probes/K252/`; it is
   not a test.)
2. Ease by time. `RANGE_EASE` becomes the per-frame share at a
   stated reference rate of 60 frames a second, and one pure
   function beside it in `src/ui/view_clamp.ts` gives the share for
   a frame step: 1 - (1 - RANGE_EASE) raised to (dt x 60), with dt
   clamped to the camera's own stall bound so a hidden tab does not
   snap the view home in one frame (read how `updateCamera`'s
   callers bound dt, and use that bound, naming it). `easeIntoRange`
   and `stepRange` take the frame step (defaulting to the 60 Hz
   step, so every step the existing tests take reads exactly as
   today), and `easeView` passes `updateCamera`'s dt. `fitToScreen`'s
   hold (rate 0) still holds. Tests in
   `test/ui/view_clamp.test.ts`: the before table rerun as a test —
   30, 60 and 120 Hz reach within 0.5 px at the same wall time
   (state the tolerance), a 1 s step lands where the bounded step
   says, and the 60 Hz steps equal today's per-frame numbers (the
   existing easing tests pass unchanged on their numbers).
3. The after table: the scratch script from task 1 against the fixed
   code reads one settle time at all three rates, within the
   tolerance the test states. If a desktop page check is wanted, a
   probe that resizes the window and reads the view home is a
   second, headed check, not the gate; the gate is the pure table.

Done:

- Before table shows the frame-rate spread; after table and the new
  test show one settle time at 30, 60 and 120 Hz.
- The existing `view_clamp` numbers at the 60 Hz step are unchanged;
  `npm test` passes.

Report: the before and after tables, and the stall bound used.

Close nothing outright. Part (b) is still open (a phone check), so
rewrite K252's line in the same LEDGER commit, dropping part (a):
`**K252** · K198 s2's residual: the head's 0.45 s show delay rests on five blips (longest 0.33 s): K156's next phone pass can check more. (`docs/design/K198.md`, "Stage 2 handoff").`
If the 60 Hz numbers cannot stay, stop under K1050's stop rule 1
and record it in K252's text instead.

Suggested ports: 5520-5529.

## Run D · K207: fog stamps stop growing within a solve

Read first: `.claude/rules/gameplay-fog.md`,
`.claude/rules/probes.md`; then `maybeStampFog`, `fogProbe`,
`renderFog` and the stamp clear on a restart in
`src/render/fabric_maze_renderer.ts`, `fogArcStations`,
`travelOrder` and `moveEnds` in `src/render/fog_arc.ts`,
`pruneDarkStamps` in `src/game/darkness.ts` (it compacts the stamp
list in place), and `test/render/fog_arc.test.ts`.

The ledger says (Residuals):

> **K207** · Fog stamps grow without bound within a solve: the spacing filter checks only the last
> stamp, and `renderFog` redraws every stamp. A spatial dedupe fixes both
> (`src/render/fabric_maze_renderer.ts`; `docs/design/K100.md`, Stage 1 handoff).

What is there today (read it, don't trust this summary).
`maybeStampFog` drops a new stamp only when it lands within
`FOG_STAMP_SPACING` (0.8 world) of the LAST stamp; walking back over
explored thread therefore stamps the same ground again, and
`fogStamps` (with its parallel `fogStampMoves`, the darkness
bookkeeping) grows for as long as the player walks. `renderFog`
redraws every stamp's hole whenever the fog is dirty, and a stamp
that lands sets it dirty. The fog's stations themselves are fixed
along the arc (`fogArcStations`: the same stations at any frame
rate), so the duplicates are the same places revisited, not new
detail. Stamps are cleared on a solve restart (beside the refog
count), and `pruneDarkStamps` compacts the two lists in place when
the darkness moves: anything that indexes the stamps must survive
both. `fogProbe` already hands a probe the stamp list, so counts
need no new hook.

Tasks, in order (ports 5530-5539, perf lock, headed real-time Chrome):

1. The before table. Write `.claude/probes/K207/fog.mjs`: load a
   full fog design (a bare URL is today's daily, so build the link
   from a design token with fog on, `&am=instant&snd=none` and the
   physics the same-state rules need; name the whole link), walk a
   stated route with the page drivers the fog probes use (there and
   back over the same runs, several times over: the walk that grows
   the list), and after each leg record, through `fogProbe`, the
   stamp count, the count of stamps within `FOG_STAMP_SPACING` of
   an earlier stamp (the duplicates, computed in the probe), and
   the explored bounds. Screenshot the fog after the last leg into
   `.claude/probes/K207/shots/`. Take a throwaway first shot (K1130).
2. The spatial dedupe. In the fabric renderer, a stamp lands only
   when no earlier stamp of this solve sits within
   `FOG_STAMP_SPACING` of it: keep a spatial index (a grid of cells
   of that spacing, keyed in the renderer, checked against the
   neighbouring cells) beside `fogStamps`, and push the stamp and
   its `fogStampMoves` entry together, or neither. The index
   empties where the stamps do (the restart clear), and is rebuilt
   from the stamp list whenever the darkness prune compacts it —
   say in the commit how the index knows (a rebuilt-when-counts-
   differ check in `maybeStampFog` is one shape). The dedupe itself
   is pure and tested: put the cell and neighbourhood math in
   `src/render/fog_arc.ts`, with tests in
   `test/render/fog_arc.test.ts` (a stamp on a cell edge finds its
   neighbour across it, a stamp exactly at the spacing lands, one
   inside it does not, and the first stamp of a solve lands). No
   change to the stations, the spacing, the reveal radius or the
   fog's drawing: `renderFog` redraws the same holes, from a
   shorter list, and only when an accepted stamp lands.
3. The after table. The same walk on the fixed build: the stamp
   count after each leg stops growing once the ground is explored
   (state the bound the counts read: no leg after the first return
   adds more than the probe's computing error), the duplicate count
   reads zero by construction, and the explored bounds match the
   before table's. A same-state pair of the fog after the last leg
   (before code, after code, `&fw=0&phw=0` added, every clock pinned
   per `probes.md`, a same-build control first) states its pixel
   difference: the holes a dropped duplicate covered are a kept
   stamp's holes too, so the fog must read the same; if it does
   not, report the difference and stop under K1050's stop rule 2
   rather than widen the spacing.

Done:

- After table: the stamp count is bounded by the explored ground on
  a there-and-back walk; the before table's growth is gone.
- The dedupe's pure tests pass; the explored bounds match; the
  same-state fog pair's difference is stated (0 px expected).
- `npm test` passes.

Report: the before and after tables (counts per leg, the bounds,
the pair difference).

Close: `ledger.mjs done K207 --commit <sha8> --what "fog stamps deduped spatially; the list stops growing within a solve"`.

Suggested ports: 5530-5539.

## Run E · K144: the accounts design document (no code)

Read first: `.claude/rules/gameplay-daily.md` (MAZE STATS + DAILY
MAZE), `.claude/rules/notices.md`; then `docs/ledger_notes.md`'s
K144 (its full text, with the design's raw material),
`docs/design/levi_notes_2026-10-13.md` (the ask verbatim), the daily
store (`DAILY_STORE_VERSION`, `DailyData`, `DailyAggregates` and
its version and migration handling) in `src/game/daily_store.ts`,
the saved attempts and their fingerprints (`walkFingerprint`,
`attemptRecord`, `restoreAttempt`) in `src/game/daily_attempt.ts`,
`DAILY_EXEMPT_KEYS` and the daily's routing in `src/ui/daily_link.ts`,
`STATS` and `efficiencyOf` in `src/game/maze_stats.ts`, the share
text in `src/game/share_text.ts`, and
the ledger's K531 and K533 (what determinism and precomputation
already owe this). Quote no file you did not open; this run reads
before it writes, like the others.

The ledger says (Next):

> **K144** · Accounts and shared stats, a stretch goal (Levi 10-13): OAuth, cross-device stats,
> opt-in sharing, percentile bands, replay anti-cheat (K108, K47). Backends: Cloudflare Workers + D1
> or the SnoringCat platform (Nakama). Next: design doc. `docs/design/levi_notes_2026-10-13.md`.

This run writes the design document and changes nothing in `src/`:
the backend is Levi's choice (K1141 already left K144 out for that
reason), and the document is the step that makes it ready to build.
The document must let Levi pick a backend from it, and let a later
batch build the first stage from it without re-deciding the data.

Tasks, in order (no server; ports 5540-5549 if a read needs one):

1. Write `docs/design/K144_accounts.md`, an options document in the
   project's design-doc shape, covering at least: what an account
   holds (today's local records, `DailyData` and the saved attempts,
   and which preferences stay per device); sign-in (OAuth providers,
   and what a logged-out player keeps); sync (what uploads, when,
   how two devices' records merge, what a newer store version does
   mid-sync — the store's own `newer` answer names the hazard);
   sharing (the opt-in, off by default; what a shared record shows);
   percentile bands (over which records, computed where, how many
   opted-in players a band needs); replay anti-cheat (what a server
   can replay from a submitted walk today — the fingerprints and the
   deterministic build, K108 — and what it cannot, including timed
   modes); privacy (what is stored, account deletion, where a
   privacy note lives); and the two backends weighed against those
   needs (Cloudflare Workers + D1 beside the Pages site, and the
   SnoringCat platform's Nakama), each one's cost shape, what code
   knotmaze would run where, and what depends on K531's determinism
   and K533's precomputation either way.
2. End the document with one recommendation (a named backend, and a
   first build stage small enough for one later run, with the
   stages after it listed), the questions only Levi can answer
   (the backend if the recommendation needs confirming, the OAuth
   providers, the sharing default's wording), and a Handoff section
   saying what is decided, what is Levi's, and which ledger items
   the build stages will close or feed (K531 and K533 among them,
   when they apply).

Done:

- `docs/design/K144_accounts.md` exists, covers every topic in
  task 1, and its claims about today's code name the files read.
- One backend is recommended, with a first build stage stated;
  the open questions are Levi's alone.
- No `src/` file changed; `npm test` passes (the doc carries no
  test, and the suite proves it).

Report: the document's recommendation in one line, and its open
questions. Put anything you would file in the report, not the
ledger: Claude files it when reviewing (this run's brief says so of
its own drafting run, and this run follows it).

Close nothing outright. When the document passes Done, move K144 to
Waiting on Levi with its question in plain words, no param or
function names, following the document's recommendation; write
that text in the run's report first, for Claude's review:
`ledger.mjs move K144 --to "Waiting on Levi"`.

Suggested ports: 5540-5549 (if any).

## Run F · K688: the healing-cuts design document (no code)

Read first: `.claude/rules/gameplay-mechanisms.md` (FRAGILE RUNS
AND PAR, and the cut), `.claude/rules/gameplay-fire.md`,
`.claude/rules/gameplay-minotaur.md`; then R.3.5 and decision 6 in
`docs/design/K80_gameplay_additions.md` (read both: the section and
the decision it feeds), the cut verb (`cuttable`, `cutVerdict`,
`carryChain`, `FabricAction`) in `src/game/cut.ts`, the cut as the
controller holds it today (`cutMode`, `cuts`, `actions` and
`replayActions`, and where the rules decide a cut is off) in
`src/game/fabric_controller.ts`, `docs/design/K114_cut.md` (what
the classic game's cut decided), the blocked runs the monsters
already obey (the chase graph's blocked set in
`src/game/minotaur.ts`, the turn graph's `withBlocked` in
`src/game/minotaur_turns.ts`, and K137-b in both), the fire's view
of a gone run (`runBurnAt` and the refire) in `src/game/fire.ts`
and `src/game/fire_clock.ts`, what a saved attempt records (taps
only, or actions too) in `src/game/daily_attempt.ts`, how a cut or
broken run draws today in `src/render/fabric_maze_renderer.ts`, and
the cuts tag in `src/game/share_text.ts`. Quote no file you did
not open.

The ledger says (Next):

> **K688** · Healing cuts against monsters (Levi took R.3.5, decision 6): a cut closes again after a
> few moves; cut with the minotaur or the fire. After the K114 walker stage
> (`docs/design/K80_gameplay_additions.md` R.3.5).

This run writes the options document and changes nothing in
`src/`: the heal count, the scissors' charges and the trapdoor's
outcome are not decided, and the build crosses the controller, both
minotaur clocks, the fire, the saved attempts and the renderer
(K1141 left K688 out for exactly that). The document decides what
it can from the code and lays the rest out for Levi, with a
recommendation each, so a later batch can build it in stages.

Tasks, in order (no server; ports 5540-5549 if a read needs one):

1. Write `docs/design/K688_healing_cuts.md`, an options document
   covering at least: the heal (a cut closes again after a few
   moves — on which clock: the player's moves, the beat rider's
   runs, real time's seconds, and the fire's steps are four
   different answers in four game shapes; what Undo and a replay
   do to a heal that has not landed yet, and what a saved attempt
   must record for a heal to restore — the attempt records taps,
   and a cut today is an action beside them); the scissors'
   charges (a stock like the lures' and snares', whether a healed
   run hands its charge back, and how the classic game's uncharged
   scissors survive beside it); the trapdoor (cut the run the
   minotaur has committed to while it stands on it: stunned in
   place, or back to its lair, for how long, under the turn clock,
   the beat and real time; with the fire, whether a cut can hold a
   burn back at all, since a burnt run cannot unburn); who a healed
   cut blocks while it is closed (the player, as the classic cut
   refuses it; the minotaur, over which graphs — the blocked sets
   K137-b already feeds them; the fire, whose distances a closed
   run leaves); and what lifting the cut's classic-only rule does
   to the rules that keep it off today (the fabric rules: fragile
   runs, par and collapse among them, and a maze the cut could
   strand once it heals under the player).
2. End the document with a recommendation for each undecided
   answer (heal count and its clock, the charges, the trapdoor's
   outcome), the questions only Levi can answer, a build plan in
   stages (the controller's heal first, each stage small enough
   for one later run, naming where each lands: the controller,
   the turn clock, the real-time chase, the fire, the saved
   attempts, the renderer and the panel), and a Handoff section
   saying what is decided, what is Levi's, and what the build must
   measure before it tunes (a balance sim over catches, as the
   K114 balance probe did for the walker).

Done:

- `docs/design/K688_healing_cuts.md` exists, covers every topic in
  task 1, and its claims about today's code name the files read.
- Each undecided answer has a recommendation, and the build is
  staged; the open questions are Levi's alone.
- No `src/` file changed; `npm test` passes.

Report: the document's recommendations in one line each, and its
open questions. Put anything you would file in the report, not the
ledger.

Close nothing outright. When the document passes Done, move K688
to Waiting on Levi with its questions in plain words, no param or
function names, following the document's recommendations; write
that text in the run's report first, for Claude's review:
`ledger.mjs move K688 --to "Waiting on Levi"`.

Suggested ports: 5540-5549 (if any).

## Left out on purpose, for a later batch

Not for Muse, or not now (candidates in the order the header
names: Approved first, then the Residuals read in ledger order
through K207; each is named, with its reason. K1141's own "Left out
on purpose" list was checked the same way, and none of its items is
revived here without saying why):

From Approved, to schedule:

- K22 (the dynamic resolution scaler): its own record puts it
  after G3 (`docs/design/G3G4_sdf_geometry.md`, Ordering: "K22
  (the resolution scaler) after G3; K23 = G3-5"), and the G3 lane
  is still open (G3-3 waits on a phone look and a phone
  measurement, K8 in progress). It is also a frame-cost change
  whose check is a frame-time table on the phone
  (`scripts/bench_frame.mjs` territory): no desktop stand here.
- K23 (GPU particles, GPU fog-of-war accumulation, the yarn as a
  gap-masked ribbon): it is G3-5 on the same open lane as K22, in
  the thread renderer's GPU performance, which this batch keeps
  off limits.
- K322 (art, sound and music by people): commissioning and
  licensing is Levi's budget and taste, with no unit test or
  desktop probe to decide it. The credits page it names already
  carries art credits (`notices/credits.ts` and its K321
  section), so there is no waiting code half for a Muse run.
- K805 (the dot-eater mode): it builds on the paper look, and
  K797 is not done (its next stage, the textures, is still to
  build, perf-gated), and on K804's dots, which Run A splits out
  as their own item. Both gates stand.

From the Residuals, in ledger order (the last read is K207;
batch 12's draft starts after it):

- Junctions (K1040 and K868, their oracle, probes and label):
  K1048, K1047, K1046, K1000, K1002, K1003, K954, K957, K958,
  K966, K967, K972, K973, K974, K936, K933, K877. That work runs
  in its own lane, and this batch touches no junction drawing.
- K999 (`probes.md` rides every probe read): its fix edits
  `.claude/rules/`, which a Muse run does not edit (K1050's
  rules: findings go in the commit, the lore change is Claude's),
  and it is claude-config process, not game code with a test.
- Cursive and text: K982, K977, K978, K951, K947, K938. Off
  limits here, as in every batch.
- K914 (wave 1's unused `section-rgb` link on root pages): its
  check is shader-compile time on the glyph root and the fix is
  shader-program scope, the thread renderer's lane; it also
  waits on a decision its text names (`rootPaint` before wave 1).
- K892 (G3-1's phone render-sync cost): a phone measurement on
  the G3 lane, kept until K868 settles it (Levi, in its text).
- K836's follow-ups and K834: the first needs Levi's eye on
  glyph stills, and the second's unreproduced half is a phone
  case. Both wait on Levi or the phone.
- K413 (the phone lock's waiter line): phone-kit process in
  claude-config (its text names CC62), and no game code or test
  decides it.
- K416 (the split design doc gone stale) and K417 (probes
  calling moved sampling helpers): the first is a historical
  record whose update no test or probe decides, and the second
  edits untracked probes, so there is nothing to commit or test
  (K1141 said the same of K709).
- K271 (the turn telegraph over hidden thread under the reveal):
  the fix is in the thread reveal's drawing, the renderer's GPU
  lane this batch keeps off, and it is twice-filed again (K363,
  K652), so a later reveal stage takes all three together.
- K266 (the hover rim's short-run limits): the paint highlight
  and rim family K1141 leaves out (K265, K328, with their
  shader pins); this one travels with it.
- K267 (stale `highlightMode` mentions in design docs): the
  docs it names are the dated design record; rewriting them is
  not a fix a test decides, and the live lore is what a reader
  follows.
- K262 (K80's and K100's broken probe harnesses): the files are
  untracked probes, with nothing to commit or test.
- K258 and K276 (the thread reveal's per-frame redeclares and
  its growth and ends): thread-reveal rendering and its shader
  scope, the lane this batch keeps off.
- K278 (K74 s2's leftovers): generation changes move the maze
  plan pins, and what is left (a slower build, bridge-cutting
  designs, a shorter optimal route) has no one fix a test names.
- K285 (citation details): the records that confirm them are
  outside the repo, so no check here decides them.
- K281 (the burn race's stage 1 leftovers): its parts wait on
  the shader look stage (its text says so), or read as the fire
  pass's frame cost, GPU work this batch keeps off.
- K254 (the phone pass's stage 1 leftovers): one part is a
  desktop dry run's report with no code to change, and the rest
  is the phone (docked landscape).
- K246 (K174's leftovers): it bundles three unlike things — old
  pace links that read as 25x (a link-meaning call for Levi),
  the stale probe copies (untracked), and panel labels that clip
  (a look). No one Done check covers it; split it first.
- K242 (the fan program's GPU cost in web fades): a GPU
  measurement with the fix in shader scope. Off limits here.
- K236 (a pluck's overlay hiding its hover glow): it needs an
  across coordinate in the overlay's shader. Shader text, off
  limits.
- Phone passes: K234 (activity ages in the phone pass), K232
  (the default link's borderline phone load, pre-worker numbers
  to remeasure on the worker host first), and K230 (the badge's
  last fit level, whose only stands are phone or emulated):
  none is a desktop task.
- K226 (the spider's glyph has no mesh): its text waits on
  K114's call 7, which is Levi's (K627 carries it).
- K223 and K220 (an old probe's check, a misreading census):
  untracked probe tooling; nothing to commit or test.
- K222 (the pan range's edge leaves out the win ring, the
  head's glow and the minotaur, and ignores the panel's
  height): those were K198's stated calls — the ring sits inside
  the 10 px gap, and the calls section of `docs/design/K198.md`
  records what was not counted, and why. No new target has been
  stated since, so there is nothing to build to.
- K221 (the range's edge creeps while the knot settles): the
  edge is the live one by design and creeps about 0.3 fit px per
  200 ms; holding it still is a camera feel call, Levi's, with
  no number in the item to meet.
- K218 and K217 (the trail's junction cap and its fade start):
  the first is a paint cap that lives beside the yarn in shader
  scope and is mostly under the gold web; the second is "slightly
  off" with no stated tolerance, and its fix needs the per-piece
  arc lengths its caller (`trailSpans`' pieces carry lattice, not
  arc — `src/render/trail_paint.ts`) does not hand it. Neither
  has a Done check as written.
- K216 (the lore index kept by hand) and K214 (physics lore that
  will not trim): one is docs process with no test, the other is
  text on the physics files, physics being off limits and there
  being nothing to decide.
- K208 (`restoreYarn` keeps its own copy of the travel rule):
  no defect is stated — the direction rule is already pure and
  tested (`travelOrder` and `moveEnds` in
  `src/render/fog_arc.ts`) — so the run would be churn in the
  restore path to prove a refactor, where Run D, next in order,
  fixes growth with a measure. If K208 is ever taken, it proves
  by a restore probe against `fogProbe`'s stamps, as its
  neighbour does.

Runs E and F take K144 and K688 from `Next` as design-doc runs, as
K1141 named them for this batch: neither is ready to build, and
the document is the step that makes it ready. Every other `Next`
item stays where K1141's "Left out on purpose" list left it
(junctions, cursive, the phone, physics and the GPU lane, Levi's
look first, triggers unfired, planning stages of their own), and
none of that list has become possible since: K1138's backdrop
work has landed (it was this batch's Run A, of batch 10), and no
trigger that list names has fired.


# K1108: Muse batch 7

Claude starts these runs through Paseo, one run at a time, after batch
5 (`docs/design/K1091_muse_batch5.md`) and batch 6
(`docs/design/K1107_muse_batch6.md`) have merged and been reviewed.
Each run is a fresh Muse agent that reads this brief, does its run's
tasks, and stops. Claude
reviews each run on master afterwards and closes K1108.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. None changes physics,
junctions, the cursive, or how the threads are drawn: junction and cursive
agents work in their own worktrees on `src/render/field/`,
`src/render/junction_*`, `src/render/arm_strip.ts` and
`src/render/ribbon/joinery.ts` while this batch runs, and no run below
touches those, `src/render/` at all, or the K863, K1040 and K1027 design
docs. Run A changes which ripple High contrast shows, Run B how one HUD
line wraps, Run C when a focus ring shows and Run D how the camera moves
under Reduced motion; each is decided by a counter or a table, and each
files a plain question for Levi where a look is involved. Runs E and F
change docs only (Run F adds one script). The runs are in order of value
to Levi, and no two share a file.

## How to work

The process in `docs/design/K1050_muse_week.md` applies unchanged. Read
its sections "Each task, start to finish", "When a task stops", "Rules",
"Off limits" and "Reports" before anything else. Where they say K1050,
read K1108 (`ledger.mjs handle K1108 ...`). Batch 3's to batch 6's rules
hold too:

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
4. Update only K1108's handle
   (`ledger.mjs handle K1108 --last-commit <sha> --next "..."`). Don't
   close it or edit its text: Claude closes it.
5. No subagents: Paseo crashes when Muse spawns them.
6. When a run allows something that K1050's "When a task stops", Rules
   or Off limits forbid, it says so in a line starting "Exception". The
   exception covers that run only.
7. Every server and probe uses a port in 5500-5599, never 5173 or
   5480-5489. Batches 5 and 6 used 5510-5589 and have finished, so this
   batch uses 5510-5549 (each run names its range). Before starting a
   server, check its port is free
   (`Get-NetTCPConnection -State Listen -LocalPort <port> -ErrorAction SilentlyContinue`);
   if it is taken, use the next free port in your range. Old probes this
   batch copies may name other ports: change them. Start servers in the
   background and stop them when the run ends.
8. A probe's before table is taken on the unfixed code first, then the
   fix, then the after table. Both go in the commit message under
   `Checked:`. A fix whose before table already passes is not a fix: say
   so, close nothing, and report. (Run D's first task is the exception:
   there the probe is the task, and a passing before table answers it.)
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
wait inside one command. Delete it when you're done. (No run below times
anything; this stays for the case a probe turns out to.)

A follow-up for Levi goes to `Waiting on Levi` only when it is about
what Levi sees or feels, in plain words with no param or function names.
Where a run gives that item's text, use it as written.

End the run with a short report: one line per task with its status and
commit.

## Run A · K368: High contrast shows the pluck ripple as a ring

Read first: `.claude/rules/gameplay-motion.md` (THE ACCESSIBILITY GROUP,
K111), `.claude/rules/render-pluck.md` (the ripple, K279),
`.claude/rules/gameplay-panel.md` (the Accessibility folder),
`.claude/rules/probes-pluck.md` and `.claude/rules/probes.md`; then
`src/ui/accessibility.ts` (whole, about 290 lines),
`test/ui/accessibility.test.ts`, and in `src/app/input_pointer.ts` the
function `startRipple`. `docs/design/K279.md` near "High contrast (K289 e),
proposed" is where the ring was proposed.

The ledger says:

> **K368** · A ring for the ripple under High contrast (K289 e; Levi, 2026-10-15: yes):
> `HIGH_CONTRAST_OVERRIDES` (`src/ui/accessibility.ts`); the glint has little room on light threads over black (inferred, not shot; fallback a stronger glint). Small: a unit test and a screenshot.

What is there today (read it, don't trust this summary). High contrast
and Reduced motion change what the scene wears through two override
tables in `accessibility.ts`. `HIGH_CONTRAST_OVERRIDES` maps a stored
param to the value to wear (the page goes black, the palette pastel, the
gap and the markers grow); `effectiveParam(stored, flags, key)` applies
the tables; `overriddenKeys(flags)` is the list the panel dims
(`panel_wiring.ts` passes it to `panel.markOverridden`). `A11yTargets`
lists the params the tables may touch, and `pluckRipple` is not among
them. Its options are `PLUCK_RIPPLES` (`src/render/pluck_model.ts`: "off",
"wave", "glint", "ring"; default "glint"; link key `prp`). The look is
picked when a ripple starts: `startRipple` in `input_pointer.ts` takes a
`look` argument that defaults to `params.pluckRipple`, and each ripple
keeps its own look (`src/render/pluck_ripple.ts`). The release, the tap
and `src/app/auto_audio.ts` call it without a look; the probe hook in
`src/app/probe_hooks.ts` (the pluck hook just above `__knotRipple`) passes
its `rippleLook` option, undefined unless the probe sets one. The pointer
input's deps carry `settings` (the panel's settings; `settings.highContrast`
is kept live by `syncAccessibility` in `tweakpane_panel.ts`) and `motion`.
main.ts's own flags object (`a11y`) is not passed in. Don't edit
`main.ts`.

Tasks, in order:

1. Probe first. Write `.claude/probes/K368/ring.mjs` (headed Chrome, a
   port in 5510-5519; copy the setup of a pluck probe that
   `probes-pluck.md` names). Load a design link with
   `&am=instant&snd=none&prp=<look>` for each look ("off", "wave",
   "glint", "ring"), with High contrast off and on (turn it on through the
   panel's Accessibility row, as a viewer would, then pluck). Pluck through
   the probe hook without `rippleLook`, and read the live ripple's look. If
   `__knotRipple` does not return the looks of the live ripples, add that
   to what it returns (one line in `probe_hooks.ts`; say so in the commit).
   The probe hook that reports `highContrast` reads main.ts's flags, not
   the panel's copy the pointer will read (`settings.highContrast`), so
   only the after table can show that copy follows the toggle: if the
   after table shows the stored look with High contrast on, stop the
   task as K1050's "When a task stops" says (the fix would need `main.ts`,
   which this run does not edit) and report. Then, with High contrast on
   and `prp=glint`, hold a ripple at a fixed time
   (`__knotRipple({ paused: true, t: 0.25 })`) and take a screenshot
   into `.claude/probes/K368/shots/before_glint.png`. The before table: the
   look always equals the stored value.
2. The override. Add `pluckRipple: string` to `A11yTargets`, and
   `pluckRipple: (v) => (v === "off" ? "off" : "ring")` to
   `HIGH_CONTRAST_OVERRIDES`, with a comment: a viewer who turned the
   ripple off keeps it off; every other look wears the ring, because the
   glint has little room on light threads over black (K368). Then change
   `startRipple`'s `look` default from `params.pluckRipple` to
   `effectiveParam(params, { reducedMotion: motion.reduced, highContrast: settings.highContrast === true }, "pluckRipple")`.
   An explicit `look` still wins. If TypeScript rejects `params` as an
   `A11yTargets`, stop and report rather than cast.
3. Tests in `test/ui/accessibility.test.ts`: under High contrast "wave" and
   "glint" wear "ring", "ring" stays "ring", "off" stays "off"; Reduced
   motion alone leaves `pluckRipple` as stored; `overriddenKeys` with High
   contrast on includes "pluckRipple". The file already has a test that
   holds each override value to its param's real options: make sure it
   covers the new key (give it `PLUCK_RIPPLES` if it needs the list). The
   existing tests pass unchanged.
4. Read the warmup. `src/render/shader_warmup.ts` decides whether to warm
   the ripple (`ripple: params.pluckRipple !== "off" && !reduced`). Read
   whether the ripple's looks compile separately. If a ring under High
   contrast could compile on the first pluck when the stored look is
   another one, report it as a residual. Don't edit `src/render/`.
5. Take the after table, and the same screenshot after the fix
   (`after_ring.png`, same link, same held time). Look at the panel with
   High contrast on: the ripple row should show as overridden like the
   other overridden rows; put that screenshot in `shots/` too.

Exception (K1050's stop rule 3): the ring under High contrast ships on,
with no flag. It is the fix K368 names, and Levi said yes to it on
2026-10-15.

Done check:

- After table: with High contrast on, every stored look except "off"
  starts a ring and "off" starts none; with it off, every look is the
  stored one (the before table's column, unchanged). A probe-hook pluck
  with an explicit `rippleLook` still wears that look.
- The overridden list includes `pluckRipple` with High contrast on and not
  with it off.
- The screenshot pair and the panel shot are in `.claude/probes/K368/shots/`.
- `npm test` passes.

Report: the before and after tables, the warmup finding, the screenshot
paths, and any line in `render-pluck.md` or `gameplay-motion.md` that
says the ripple has no High contrast tie-in (quote it; don't edit rules:
Claude does).

If code changed, file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "With High contrast on, a plucked thread now shows the ring ripple whatever ripple you picked (unless it is off). Does it read well on the light threads over black? Pictures: .claude/probes/K368/shots/ (K368, <sha>)"`

Close: `ledger.mjs done K368 --commit <sha8> --what "High contrast wears the ring"`.
Suggested ports: 5510-5519.

## Run B · K1100: the hidden-runs line wraps in whole phrases

Read first: `.claude/rules/gameplay-stars.md` and
`.claude/rules/gameplay-badge.md` (the HUD and the badge it must clear),
`.claude/rules/probes.md`; then in `src/ui/maze_hud.ts` the functions
`hiddenValue` and `swordValue` and the HUD's CSS for the value cells, the
hidden-row cases in `test/ui/maze_hud.test.ts`, the K775 probe
(`.claude/probes/K775/`: `hud775.mjs`, `out/`, `shots/`) and the message
of commit `1a6823ea` (K775 and K738, with their tables).

The ledger says:

> **K1100** · Wrapped HUD hidden-runs row leaves an orphan ('them' alone at 411x753 stats off and 360x740 on)
> and a dangling '·' line end at 360x740 (`.claude/probes/K775/shots/`): `text-wrap: balance`, or non-breaking
> joins in '13 with them'. With K1095 in a later Muse batch.

> **K1095** · K775/K738 residual (1a6823ea): at 320x640, stats on, sword slain / all-grown, the HUD value
> column extends 17.8 px past the box [10,10,246,286.2] (badge clear, gap 22). Layout call for Levi. Probe
> .claude/probes/K775 (hud775.mjs, out/before|after).

This run fixes K1100. K1095 is Levi's call: this run only makes
pictures for it (task 4) and changes nothing for it.

What is there today (read it, don't trust this summary). `hiddenValue`
returns one string, "1 / 2 found · fewest 16, 14 with them" (a dash for a
fewest with no way), joined by plain spaces, so the browser may break the
line at any of them: after "with" (leaving "them" alone) or after the "·"
(leaving it at a line's end). The HUD's value column wraps since K775, and
the badge re-fits when the HUD grows (K738). `hiddenValue` is used only in
`maze_hud.ts`, and three test expectations in `maze_hud.test.ts` quote its
text.

Tasks, in order:

1. Before table. Copy `hud775.mjs` into `.claude/probes/K1100/` (a port
   in 5520-5529) and add a per-line readout of the hidden row's value:
   walk its text node, take each character's
   `Range.getClientRects()[0].top`, and group the characters into lines.
   For 411x753, 360x740 and 320x640, stats on and off (the K775 probe's
   cases; reload after each `setViewport`), record the row's lines as
   text, whether a line is a single word, whether a line ends with "·",
   every other row's lines, and the K775 probe's overflow numbers (how far
   the value column extends past the HUD box).
2. The fix: non-breaking joins in `hiddenValue` (U+00A0) within "1 / 2",
   within "fewest 16,", within "14 with them", and between the "·" and
   "fewest", so a line can break before the "·" but not after it. What a
   reader sees is unchanged. Update the three test expectations to the
   new string and add a test that the value has no plain space inside
   those groups and a plain space between them (also for the dash case).
   If the after table still shows a single-word line somewhere, add
   `text-wrap: balance` to the hidden row's value only (not the whole
   column) and take the table again.
3. Hold the other rows still: every other row's lines are the same before
   and after.
4. For K1095, pictures only. At 320x640, stats on, sword slain (the K1095
   case), shoot the HUD as it is and with three CSS variants the probe
   injects (`page.addStyleTag`; nothing in `src/`): (a) the value column
   may break inside its phrases at that width, (b) the value text one size
   step smaller below 340 px wide, (c) the HUD box 18 px wider. Measure the
   overflow and the badge gap for each, name each file for its variant,
   and put them in `.claude/probes/K1100/k1095/`. Don't pick one.

Exception (K1050's stop rule 1): the three expectations in
`test/ui/maze_hud.test.ts` that quote `hiddenValue`'s text (search
`with them`) may change to the new string. No other expected value may
change.

Exception (K1050's stop rule 3, the fix only): the non-breaking joins,
and `text-wrap: balance` if task 2 needs it, ship with no flag: they are
the fix K1100 names. A size whose overflow gets worse still stops the
task (Done check).

Done check:

- After table: at every size and both stats settings, no line of the
  hidden row is a single word and none ends with "·"; the row's text,
  reading U+00A0 as a space, is the same as before.
- The overflow is no worse than the before table at any size (the joins
  make longer unbreakable pieces; if a size gets worse, stop under K1050's
  stop rule 3 (a layout call) and report the table).
- Every other row's lines are unchanged.
- `npm test` passes.

Report: the before and after tables, and the K1095 pictures with their
overflow and badge-gap numbers.

If code changed, file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "On a narrow phone, the hidden-runs line in the corner panel now wraps in whole phrases (no lone 'them', no dot at a line's end). Does it read well? Pictures: .claude/probes/K1100/ (K1100, <sha>)"`

Close: `ledger.mjs done K1100 --commit <sha8> --what "non-breaking joins in the hidden row"`.
Leave K1095 open; Claude shows Levi the pictures. Suggested ports:
5520-5529.

## Run C · K748: no focus ring lingers on a clicked game button

Read first: `.claude/rules/gameplay-minotaur.md` (sprint, K137),
`.claude/rules/gameplay-mechanisms.md` (the cut, walker and aid buttons),
`.claude/rules/probes.md`, and for any other file you change, the rules
file `docs/lore_index.md` names for it. Then `src/ui/sprint_button.ts`
(whole), the F key's path in `src/app/input_keys.ts` (search
`sprintKeyOf`) and `test/ui/cut_buttons.test.ts` (a button test to copy).

The ledger says:

> **K748** · Sprint polish (K137 s3c): a focus outline lingers on the sprint button after F; no real
> phone pass yet (emulated 411x753). The s3a fragile page check is weak on the hunter and the fire
> side is unit-tested only

This run fixes the first clause only. The phone pass and the fragile check
are filed as a new residual (see Close).

What is there today (read it, don't trust this summary). The sprint
button is a `<button>` with a `:focus-visible` outline (its CSS is in
`sprint_button.ts`) and a `click` listener that calls `hooks.press()`. A
mouse click focuses a button without showing the outline, but Chrome
shows `:focus-visible` on the focused element as soon as the player
presses a key, so F (the sprint key, handled on the window in
`input_keys.ts`) or an arrow after a click draws the outline, and it stays
until something else takes focus. No file calls `blur()` today. The same
kind of CSS is on the other in-game buttons: `aid_buttons.ts`,
`beat_pause.ts`, `cut_buttons.ts`, `tool_buttons.ts`, `undo_buttons.ts`,
`walker_buttons.ts`, `look_chip.ts`, `mode_badge.ts` and
`offscreen_indicators.ts` (all in `src/ui/`), and on the HUD's own buttons
in `maze_hud.ts`, which is Run B's file.

Tasks, in order:

1. Probe first. Write `.claude/probes/K748/focus.mjs` (headed Chrome, a
   port in 5530-5539). Find a link where the sprint button shows (its show
   rule in `sprint_button.ts` and the callers; K137's probes in
   `.claude/probes/K137/` load such mazes), with `&am=instant&snd=none`,
   and links for the other buttons (their mechanisms on). For each button:
   click it with the real mouse (`page.mouse.click` at its centre;
   `el.click()` does not move focus the same way), press F, then an arrow,
   and after each read `document.activeElement` and
   `el.matches(":focus-visible")`. Then the keyboard path: Tab to the
   button and press Enter, and read the same. One row per button.
2. The helper. New `src/ui/pointer_blur.ts` with
   `blurOnPointerClick(el: HTMLElement): void`: a `click` listener that
   calls `el.blur()` when `event.detail > 0` (a mouse, pen or touch click).
   A keyboard Enter or Space click has `detail` 0, so a keyboard user keeps
   the focus and the ring. Its test, `test/ui/pointer_blur.test.ts`, with a
   fake element (follow `cut_buttons.test.ts`'s setup): detail 1 blurs,
   detail 0 doesn't, a blur that throws doesn't escape the listener.
3. Call it where each button is built: in `sprint_button.ts`, and in each
   other file above whose before row shows the ring after a mouse click
   and a key. A file whose row doesn't show it stays unchanged. Don't touch
   `maze_hud.ts`, the panel (`tweakpane_panel.ts`, `panel_search_ui.ts`) or
   the stats modal (`daily_stats_view.ts`, which manages its own focus);
   report their rows.

Exception (K1050's stop rule 3): the blur after a pointer click ships
with no flag: it is the fix K748's first clause names. A keyboard user's
focus and ring stay as they are.

Done check:

- After table: after a mouse click and F (and an arrow), no button you
  changed matches `:focus-visible`, and focus is back on the page body;
  the keyboard path is the same as the before table (the button keeps
  focus and the ring after Tab and Enter).
- F after a mouse click on the sprint button still spends or disarms the
  sprint as before (read the button's state or label before and after).
- `npm test` passes.

Report: the before and after tables, and the rows you left alone with
why.

Close: first file the rest,
`ledger.mjs add --section Residuals --text "Sprint: no real phone pass yet (emulated 411x753); the s3a fragile page check is weak on the hunter, and the fire side is unit-tested only (split from K748)"`,
then `ledger.mjs done K748 --commit <sha8> --what "no focus ring after a pointer click; phone pass and fragile check split out"`.
Suggested ports: 5530-5539.

## Run D · K1109 and K1099: Reduced motion holds the camera still

Read first: `.claude/rules/gameplay-camera.md`,
`.claude/rules/gameplay-motion.md`, `.claude/rules/gameplay-indicators.md`
and `.claude/rules/probes.md`; then in `src/app/camera.ts` the functions
`resetCamera`, `stepCamTween` and `updateCamera`; `src/ui/view_clamp.ts`
(`FIT_JUMP_PX`, `FIT_JUMP_SCALE`, `fitTargetJumped`, `fitEase`) and
`test/ui/view_clamp.test.ts`; the message of commit `9e7fd3f8` (K1085)
and its probe `.claude/probes/K1085/` (`reduced.mjs`, `lib.mjs`); and the
indicator-tap probes `.claude/probes/K73/probe_exit.mjs` and
`probe_follow.mjs`.

The ledger says:

> **K1109** · The camera's reduced-motion jump on an edge-indicator tap was code-reviewed, not probed
> (`src/app/camera.ts`; split from K112 2026-11-02; Muse batch 7 Run D, `docs/design/K1108_muse_batch7.md`)

> **K1099** · Reduced motion still glides in two camera motions K1085 left (9e7fd3f8): the reset's viewHoming
> ease (0.15 a frame, `src/app/camera.ts` updateCamera; a double-click reset) and the follow camera's spring
> (FOLLOW_W). Inferred, unchecked: FIT_JUMP_PX (20) is absolute, read on the probe's 1000x800 window, so on a
> larger window the settle drift's steps may pass it and snap unsmoothed; scale it by the view.

What is there today (read it, don't trust this summary). An edge-indicator
tap, the head indicator's return and the finish peek move the camera with
a tween (`startCamTween` in `main.ts`, three callers, fed by plans from
`src/ui/head_indicator.ts` and `src/ui/finish_peek.ts`); `stepCamTween`
jumps on the first frame when the duration is 0, and a tween with `back`
holds, then tweens back. Under Reduced motion each caller passes
a duration of 0 (`frameWorld`, the edge-indicator tap's, inline as
`motion.reduced ? 0 : 0.6`; `finishPeekPlan` and `headReturnPlan` from
their `reduced` input): that is the code review K1109 names, and the
probe checks it. After an indicator tap's hold the camera eases back to
the head; in follow mode that is the follow spring. A double-click reset
in fit mode sets `viewHoming`, and `updateCamera` then moves zoom and pan
0.15 of the way home each frame, with no Reduced motion branch. In follow
mode the reset pulls the follow spring at full strength, and the spring
(`FOLLOW_W`, critically damped) follows the head after every move, Reduced
motion or not. K1085 snaps the fit under Reduced motion when the fit
target jumps (`fitTargetJumped`: more than `FIT_JUMP_PX`, 20 px, or
`FIT_JUMP_SCALE`, 0.1 of the scale, in one recompute); it read those on a
1000x800 window, where the settle drift's largest step was 14.95 px and a
panel toggle jumped 33.9 px.

Tasks, in order:

1. K1109, the probe. Write `.claude/probes/K1109/tap.mjs` (headed Chrome,
   a port in 5540-5549; Reduced motion set as K1085's probe sets it, and
   full motion as the control; `&phw=0`). Push a target off screen (zoom
   in with the real wheel as `probe_exit.mjs` does), tap its edge
   indicator with the real mouse, and record the camera every frame
   (`__knotView`; `__knotIndicators` finds the indicator) until it rests,
   through the hold and the way back if the tap returns. Do the same for
   the head indicator's return and the finish peek where the link offers
   them, in fit mode and in follow mode (`&cam=follow`). One row per tap,
   mode and motion: frames from the tap to the end of its hold (and the
   way back, for the finish peek), and among them the glide frames
   (frames whose framing lies strictly between two rest framings). Record
   the frames after the hold in their own column: in follow mode the
   follow spring moves the camera there, which is task 4's question, not
   K1109's. Reduced motion should have no glide frame in the tweens' own
   frames. If it has none, K1109 is
   answered by the table and needs no fix. If it has some, fix the plan
   that passes a nonzero duration under Reduced motion (a call-site
   change in `main.ts` or the plan's file) and take the table again.
2. The homing snap. In `view_clamp.ts`, name the reset's ease
   (`HOME_EASE = 0.15`) and add `homeEase(reduced: boolean): number`
   (1 when reduced) next to `fitEase`; `updateCamera` uses
   `homeEase(motion.reduced)` in place of the three `0.15`s. Under Reduced
   motion the reset then lands on the home view on the next frame (the
   existing convergence test ends the homing). Tests in
   `test/ui/view_clamp.test.ts`. Probe it the same way: zoom in, double-
   click empty space, both motions.
3. FIT_JUMP_PX, measured. Run K1085's Reduced motion settle probe on
   windows of about 1000x800, 1600x1000 and 2400x1300 (the sizes the
   desktop can open; record the real ones), twice each (a same-build
   control for the spread). Per window: the settle drift's largest
   recompute step and a panel toggle's jump, in px and as a fraction of
   the window's smaller side, plus the scale fractions. Then:
   - If the drift's largest step stays under 20 px on every window, the
     inference was wrong: change nothing and report the table.
   - If it passes 20 px somewhere, and one fraction of the view's smaller
     side lies above every window's drift and below every window's jump,
     make the threshold that fraction (`FIT_JUMP_FRAC`; `fitTargetJumped`
     takes the view size, which its caller has from `app.screen`), with a
     comment quoting the table and tests on two window sizes.
   - If no single fraction separates them, stop this task under K1050's
     stop rule 3 (which way to err is a feel call) and report the table.
4. The follow spring: no change. Whether the follow camera should hold
   still under Reduced motion is a feel question for Levi; file it (below).

Exception (K1050's stop rule 1, task 3's fraction outcome only): the
`fitTargetJumped` cases in `test/ui/view_clamp.test.ts` (search
`separates the settle drift`) may be rewritten to pass a view size. Pass
one at which the fraction gives 20 px, so every case keeps its true or
false. No other expected value may change.

Exception (K1050's stop rule 3, tasks 1-3): under Reduced motion the
camera may snap with no flag (a tap plan's zero duration, if task 1 needs
it; the reset that lands at once; the scaled jump threshold). These are
the fixes K1109 and K1099 name, and Reduced motion is the viewer's own
request for them. Task 3's stop when no fraction separates drift from
jumps still holds, and task 4 changes nothing.

Done check:

- K1109: the table shows no glide frame in the tweens' own frames under
  Reduced motion, for every tap the links offer and in both modes, and
  glide frames under full motion (the control).
- Homing: under Reduced motion a double-click reset lands within two
  frames with no glide frame; under full motion the frames match the
  before table (same 0.15).
- FIT_JUMP_PX: unchanged with a table showing the drift under 20 px on
  every window, or the fraction with a table showing it separates drift
  from jumps on every window.
- `npm test` passes.

Report: the tables.

File this for Levi, as written, whatever the run changed:
`ledger.mjs add --section "Waiting on Levi" --text "With Reduced motion on and the camera following the player, the view still glides after every move. Should it hold still instead, and jump only when the player gets near the edge of the screen? (K1099, follow camera)"`

Close: K1109 with `ledger.mjs done K1109 --commit <sha8> --what "probed: the taps jump"`
(or `"probed; fixed <the plan>"` when task 1 fixed one),
using the run's work commit, whose message carries the K1109 table (How to
work, item 8: here the probe is the task). K1099, once tasks
2 and 3 are done and the question is filed:
`ledger.mjs done K1099 --commit <sha8> --what "reset snaps; jump threshold <scaled | checked>; follow spring to Levi"`.
Suggested ports: 5540-5549.

## Run E · K1101: one heading per item in the ledger notes

Read first: claude-config `rules/ledger.md` ("Format": a shortened item's
full text goes to the bottom of `docs/ledger_notes.md` under `## <ID>`),
and the first 30 lines of `docs/ledger_notes.md`. No code, no rules
files; nothing here deploys (the push touches `docs/` only).

The ledger says:

> **K1101** · `docs/ledger_notes.md` holds 119 `## K<n> (2026-10-15, shortened by the diet)` headings twice,
> with differing bodies (the second copies from about line 3016): merge each pair under one heading, keeping
> both texts' facts. Mechanical; a Muse task.

What is there today (counted 2026-11-02; read it, don't trust this
summary). The file has 4,638 lines and 390 `## ` headings, 319 of them
"(2026-10-15, shortened by the diet)" for 200 IDs: 119 IDs appear exactly
twice, with the first copies between lines 430 and 2642 and the second
between 3016 and 4407. `.claude/probes/batch7/notes_pairs.mjs`
(`node .claude/probes/batch7/notes_pairs.mjs docs/ledger_notes.md`)
compares each pair's tokens (backtick spans, quoted text, IDs, SHAs and
numbers): in 104 pairs the first copy holds every token of the second, and
in 15 it lacks some (K280 1, K90 4, K323 6, K137 1, K138 1, K46 4, K340 1,
K116 3, K10 5, K326 1, K230 2, K103 1, K150 4, K84 4, K57 1). Tokens are a
proxy: a fact in plain words has none, so the word list in task 1 covers
the rest.

Tasks, in order:

1. Copy the script into `.claude/probes/K1101/` and extend it to print,
   for each pair, the tokens the first copy lacks with the second copy's
   sentence that holds each, and, for all 119, the content words (four or
   more letters) the second copy has and the first lacks. Save
   `git show HEAD:docs/ledger_notes.md` as `.claude/probes/K1101/before.md`
   and the script's output as the before table. Note the ID that
   `ledger.mjs add --section Next --text probe --dry-run` shows (a dry run
   writes nothing).
2. Merge. Keep each first copy where it is, under its heading. For the 15,
   add the second copy's missing facts to the first copy's body in the
   first copy's style (a clause or a sentence, not a pasted paragraph). For
   the other 104, read the word list and add a fact only where the second
   copy says something the first doesn't (most entries will be
   rewordings). Then delete every second copy: its heading and its body up
   to the next `## ` heading. Nothing else in the file changes.
3. Check, with `.claude/probes/K1101/check.mjs` against `before.md`:
   every token of either old copy of each of the 119 is in its merged
   entry; each diet heading's ID appears once; and with the 119 entries
   cut out of both files, the rest is byte-identical.

Done check:

- The check prints 0 missing tokens, 200 diet headings (one per ID), 271
  headings in all (390 less the 119 second copies), and identical text
  outside the merged entries.
- Every line the diff adds belongs to one of the merged entries.
- `git diff --stat` shows only `docs/ledger_notes.md`.
- `ledger.mjs lint` reports nothing new, and the same dry-run `add`
  shows the same ID as before.
- Run the check again after `git pull --rebase`, just before the push.

Report: one line per hand merge (the ID and what was added), and the
word-list facts added.

Close: `ledger.mjs done K1101 --commit <sha8> --what "119 pairs merged under one heading"`.

## Run F · K426 and K437: the lore index and the rules prose match the code

Read first: `docs/lore_index.md` (its header and rows), the `paths:` front
matter of every `.claude/rules/*.md` file (the first lines of each), and
`scripts/split_rules.mjs` (which wrote the index, K173).

The ledger says:

> **K426** · `docs/lore_index.md`'s render-paint row lacks
> `test/render/paint_ring_lap.test.ts` (drift from before K5 R1).

> **K437** · Rules prose names main.ts for code K5 M3 moved to `src/app/frame_loop.ts`: gameplay-indicators.md 25,
> gameplay-audio.md 32, render-backgrounds.md 35, render-web-fade.md 39, render-explore.md 373, render-shaders.md
> 134-136; nothing documents flow's half rate (`flowParity`). For the docs batch with K425, K426, K431, K432, K435.

What is there today (read it, don't trust this summary). K426 is wider
than its text. `.claude/probes/batch7/lore_index_drift.ps1` (from the repo
root: `pwsh -NoProfile -File .claude/probes/batch7/lore_index_drift.ps1`)
compares each rules file's `paths:` with its index row. On 2026-11-02 it
found 40 paths in the rules that the index lacks: gameplay-beat.md 3,
gameplay-fire.md 2, gameplay-mechanisms.md 34 (src/game, src/ui and
src/app files of the mechanisms and their tests) and render-paint.md 1
(K426's). The index's header says it is kept current by hand.

Tasks, in order:

1. Write `scripts/lore_index_check.mjs` (Node, no dependencies): parse
   every rules file's `paths:` and the index's rows, print per rules file
   the paths its row lacks and the row's paths the rules file doesn't
   have, and a rules file with no row; exit 1 on any. It is not added to
   `npm test` (a forgotten row should not block a deploy); its header says
   to run it after editing a rules file's `paths:`. Its output on today's
   files is the before table.
2. Fix the rows: add the missing paths to their rows in the rows' own
   order and style, and fix anything else the check reports. The check
   then exits 0.
3. K437 (only while the Exception line below is in this brief). In the
   six rules files it names, change the statements that name `main.ts`
   for code now in `src/app/frame_loop.ts` (or wherever `git grep` finds
   it now) to name that file. Then flow's half rate: search
   `render-loop.md` for it first (it may already say it, near
   "half rate"); if it does, K437's last clause is stale: say so. If not,
   add one sentence on `flowParity` to `render-loop.md`. Change prose
   only, never a `paths:` list. If `git log -3 -- <file>` shows a junction
   or cursive commit touching `render-shaders.md` or `render-explore.md`
   since this brief was written, leave that file alone and report it.

Exception (task 3 only): this run may edit the prose of
`.claude/rules/gameplay-indicators.md`, `gameplay-audio.md`,
`render-backgrounds.md`, `render-web-fade.md`, `render-explore.md`,
`render-shaders.md` and `render-loop.md`.

Done check:

- `node scripts/lore_index_check.mjs` exits 0, and its before output is
  in the commit message.
- `git diff --stat` shows only `docs/lore_index.md` and
  `scripts/lore_index_check.mjs`, plus the rules files task 3 changed.
- For K437, each changed statement names a file where `git grep` finds
  the code it describes (list them under `Checked:`).
- `npm test` passes.

Report: the check's before output, and for K437 each statement changed or
found already correct.

Close: `ledger.mjs done K426 --commit <sha8> --what "index rows complete; scripts/lore_index_check.mjs"`,
and if task 3 ran and its Done check holds,
`ledger.mjs done K437 --commit <sha8> --what "rules name frame_loop.ts; half rate <added | already there>"`.

## Left out on purpose, for a later batch

Not for Muse, or not now:

- K403's `main.ts` clause: stale. The tapsWait comment left `main.ts` in
  1161cd5a (K5 M6), and 2bcf7712 (K480 stage 1) made tapsWait a legacy
  no-op (`src/app/input_keys.ts`); batch 6's Run F closes K403 whole.
- K548 (the overnight runner's usage gate): coordinator and claude-config
  process, not game code.
- K1081 (panel-rect reads per tick): `camera.ts` is Run D's file, and it
  is a timing task under the perf lock.
- K782 (lure and snare residuals): six clauses, one in `input_pointer.ts`
  (Run A's file), several untested and one ("the ring is a stand-in for
  a glyph") a look call.
- K165 (loader stamp and hidden-tab time): its second clause is in
  `src/physics/physics_host.ts` (`loadWall0`), and its first may be stale
  (`frame_loop.ts`'s tick returns on a halt before `loadingTick`).
- K163 (a first-frame hitch): shader compilation, render and timing work;
  the warmup may already cover it, unchecked.
- K125 (Scarborough Fair's loop): changes what a beat game plays; waits
  for a band part.
- K425 and K431 (probe scripts): they edit untracked probes, so nothing
  to commit or test.
- K432 (a black backdrop in GPU sheets) and K435 (THE BURN lore): render
  investigations next to how the threads are drawn.
- K1095: Levi's layout call; Run B makes its pictures.
- K565 is near the cursive; K640, K683, K657, K202, K95 and K740 are look,
  copy or design calls for Levi.

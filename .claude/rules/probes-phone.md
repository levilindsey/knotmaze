---
paths:
  - "scripts/phone.ps1"
  - "scripts/phone_pass.ps1"
  - "scripts/phone_pass/**"
  - ".claude/probes/K79/**"
  - ".claude/probes/K156/**"
  - ".claude/probes/K7/stage5/**"
---

# Probe lore: the phone

Moved verbatim from `probes.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `probes.md` lists the area's other files.

PROBE LORE (2026-10-13, K156, the round phone pass): **one scripted
phone pass per merge round** (`scripts/phone_pass.ps1`, parts in
`scripts/phone_pass/`, record in `docs/design/K156.md`) instead of a
phone gate per feature: `-Base <ref> -Head <ref>` (head defaults to
master) are built once each into `<Out>\builds` (`preview.ps1 -Root`,
K150), served on two ports from 5480-5489, and every sample checks its
page's stamp SHA (an A/A pass builds once and serves it on both ports).
Phases: start | frames | looks | cleanup | summary (`all` runs them in
order). The phone must be awake and unlocked first (the pass never wakes
it); the watchdog stops the pass on a touch, a key, a lock or another
app in front, and `retry_quiet.ps1` retries once after 15 quiet minutes.
`-WaitReady <min>` (K171 b) waits for the phone read-only (a check every
3 minutes, two ready in a row start the pass, exit 3 at the deadline);
`retry_quiet.ps1` waits the same way (`-WaitReadyMin`) instead of
exiting 3, and `-Phase check` is the one-shot read-only check. Never
pipe a `-Dry -Phase start` run (its Chrome child inherits the pipe and
the command never returns): redirect it to a file. Nor let a background
or piped task be the one that starts the adb server: the server is the
task's child and dies with it (round 2026-10-14b: started at 09:56 under
a background `-Phase check`, it died at about 10:43 when that task was
reaped; `adb connect <phone>:5555` brought the phone back, and other
sessions' `adb reverse` tunnels survived). Start it first from a
file-redirected foreground command (`adb start-server > <file> 2>&1`).
FRAMES (`bench.mjs`): fabric at 0/7/13 moves and knot (`mf=0`) at rest,
both builds interleaved per rep (fps, p95, longest frame, render ms,
asleep), plus K147's load scenario (rAF intervals from a fresh
navigation: time to first frame, frames over 50 ms, longest, first
sleep; default link and the slow case `gs=18`; 30 s, because K147 builds
first slept at about 17.5 s on the phone). `?b.J` is solved on its 14th
move, and since K155 and K140 a finish shows stars and throws confetti,
which a frame cell must not time: the cells stop at 13 (the row's
`made`; the summary flags a sample taken at the finish). LOOKS
(`looks.mjs`, `sheet.mjs`): JSON
`{looks:[{name, link, load: sleep|frozen|none, needs:[...], steps:[...]}]}`;
the header of `looks.mjs` is the spec and `looks.example.json` is K81's
arc. `needs` = `__hook`, `param:<key>` (a key of `__knotParams()`) or
`js:<expr>`; a build without it (the feature is new) records `missing`
and the pass goes on, and only a watchdog trip stops it. Steps: waitSleep
wait moves tapChoice click panel scroll pin reload eval shot burst. An
`eval` step runs page JS (a Promise is awaited) and keeps its JSON result
in the report (`steps[].result`, listed in the summary): K140's frame
timing while confetti falls, K80's walk to the hunt. A
look runs on the head first (junction crop boxes are chosen there and
reused on base). The sheet puts base on the left (blue bar) and head on
the right (orange); a pixel diff is made for single shots only, and only
a frozen, pinned look (`phy=0&fw=0` + `pin`) can read 0 px (a live page
always differs, as the panel shot's 14061 px did on master vs master).
The `click` step sets `target=_self` on anchors, so Licenses opens in the
pass's own tab, not a second one. Every look starts on a CLEAN origin
(localStorage and sessionStorage cleared first): the panel's open state
persists, and K122's look had left the panel open over the maze in every
look after it, so their walks tapped the panel (found on the phone, 3c).
K79's drift pauses 2.5 s after a still
scene, so a speed look bursts straight after a load (motion forced to
`full` through localStorage and a reload). SUMMARY (`summary.mjs`): a
table per scenario with base, head, delta, the A/A noise and a verdict
("within noise" when |delta| <= the noise). An A/A pass writes
`noise.json`; the tracked `scripts/phone_pass/noise.json` (3 reps of
master vs master, 2026-10-14) is the floor every later summary reads. A
cell's floor is the largest of the medians' |difference|, the largest
single-rep |head - base| and one unit of the printed digit (a vsync-locked
p95 of 16.8 both ways would otherwise flag every 0.1 ms). That floor, in
A/A: fps +-1.2, p95 0.1 ms, longest frame 16-33 ms (one dropped frame),
frames over 25 ms +-3-5, fabric render ms +-2-5 (18 samples spanned
19.6-27.9 ms: K81's 20-29 vs 24-31 is noise), knot render ms +-8 (7.5-20.5,
the GPU clock), load first sleep +-1.3 s (17.5-21.6 s), frames over 50 ms
+-11-26. It is one pass: weak, and for ONE viewport, the docked phone's
LANDSCAPE one (display 2424x1080, the page 810 CSS px wide at dpr 2.625 and
331-387 high with Chrome's toolbar, not the 411x753 of the lessons). The
summary prints the viewport and warns when the floor's width or dpr
differs, and `-Phase check` prints the display. Since K193 the pass
emulates portrait (next paragraph), so this floor is the landscape one
until a portrait A/A replaces it. `-Dry` runs the same scripts against a
desktop Chrome with the phone's viewport: plumbing only, never timings.

K193 (2026-10-14), THE PASS EMULATES PORTRAIT (`docs/design/K193.md`):
`-Viewport portrait` (the default; `native` leaves the tab as the phone has
it, so an old landscape pass reproduces) sets the pass tab to 411x753 CSS px
at dpr 2.625 with `Emulation.setDeviceMetricsOverride` (mobile, portrait
orientation) from the script's own CDP session, whichever way the phone sits
(docked in landscape, or off the dock in portrait). No phone setting changes,
and the override ends with the script's connection, so EVERY script sets it
again (`myPage` calls `emulate`; `ensureViewport` runs before each
navigation). Measured on the Pixel 11: the override survives `goto` and
`reload` inside the session that set it; mobile emulation keeps the layout
width a page LOADED with, and a read right after setting an override can
still show the old width. The log and `summary.md` print the phone's display
as it sits AND the emulated viewport, the bench rows carry `emu` (what the
page reported at each sample; the summary says in how many samples it held),
and the looks report carries `viewport`. PROOF (`emulation.mjs`, the first
step of the frames phase; exit 4 stops the pass after its cleanup): the
page's own `innerWidth x innerHeight`, dpr, orientation media query, visual
viewport, document and screen; an ODD size the phone does not have (360x640
@3: when the phone itself sits in portrait, a match with 411x753 would prove
nothing); the override surviving a navigation and a reload; the canvas's CSS
box; and a viewport-clipped screenshot of the right aspect with no flat
strip. The app caps its canvas at dpr 2 (`src/main.ts`, `Math.min(
devicePixelRatio, 2)`): at 2.625 the backing is 822x1506, NOT the 1079x1977
the brief expected (reported as a note, not a verdict). THE CAPTURE SURFACE
IS TALLER THAN THE VIEWPORT (K195): a bare `page.screenshot()` came back
1080x2125 px = 808.7 CSS px under a 753 CSS px viewport (K195's landscape
frames: 387 under 331), and its bottom 148 rows are a flat off-white strip
(250,250,248: a white-row detector misses it, blue is 248). Every pass
screenshot is therefore clipped to the viewport (`shotViewport` in `lib.mjs`:
the visual viewport's rectangle, `captureBeyondViewport:false`, and a
geometry-only crop when a capture is still taller than the viewport's
aspect; the looks report counts both in `shotStats`). `emulation_unclipped.png`
keeps one bare capture as the evidence. A `-Dry` run captures at the
desktop's display scale (2), so the clip is only exercised for real on the
phone. THE CAPTURE TILES WHEN THE PHONE SITS IN LANDSCAPE (K513, 2026-10-16): the physical capture surface is then 2125x1017 device px, shorter than the 1977-device-px portrait capture, and Android Chrome repeats that surface down the request (period 1017 rows; each tile paints only the native-height top, 872 rows, leaving flat 250,250,248 bands - the last tile's tail reads as an 88-row blank strip at the clipped shot's bottom). The page is not blank: it reports 411x753 with canvas backing 822x1506, and a capture of the same CSS viewport at dpr 1 on the capture's own CDP session (411x753, fits the surface, cannot tile) shows the full page with 0 flat rows. `emulation.mjs` therefore re-checks any flat strip at dpr 1 (`emulation_lowdpr.png`) and fails `noBlankStrip` only when the strip survives there. K514 (2026-10-16): `shotViewport` now captures phone shots at a surface-fitting scale (CDP `Page.captureScreenshot` on the page's own emulation session, clip scale so height x dpr x scale <= 850 rows fits one tile; `shotStats.scaled` counts them) - clip-offset bands tile too, since the surface itself only paints its top ~872 rows. Looks shots are therefore 464x850 for the 411x753 viewport, full page, no repetition (verified `.claude/probes/K514/pass/`: emulation REAL, looks ok, sheet diff 0 px A/A); dry/desktop keeps the native-scale capture. THE WATCHDOG TRIPS WHEN A PERSON USES THE PHONE: `-Phase check`
calls an awake, unlocked phone ready even with another app in front
(sh.paseo, the Claude app), and the start then trips at once ("top
activity is sh.paseo, expected com.android.chrome"; K193, 13:21) after a
clean cleanup. `retry_quiet.ps1` then waits 15 quiet minutes and every touch
(dozens of events a second while a finger moves) restarts the wait; it
gives up at `-GiveUpMin`. THE PORTRAIT FLOOR (K253, 2026-10-14):
`scripts/phone_pass/noise.json` is a 3-rep A/A on master 9a5eaa8 (20:37-21:02,
`.claude/probes/K253/aa4/`), emulated 411x753 @2.625 (36 of 36 samples read
it from the page); its `note` says how it was taken. The docked phone's
landscape floor (810x331 @2.625, K156 3c) is kept beside it as
`noise.landscape.json`, and the summary picks whichever matches a pass's width
and dpr. `scripts/phone_pass/install_floor.mjs <aaDir> <noteFile>` installs a
floor and refuses an A/A that tripped, ran at another viewport or has fewer
than 3 base+head pairs in a cell. TO RETAKE IT: with the phone left alone and
awake, `-Phase check`, then `pwsh -NoProfile -File scripts\phone_pass.ps1
-Base master -Head master -Reps 3 -Out <dir>` (`.claude/probes/K193/
wait_then_aa.ps1` waits for 15 quiet minutes first). Two tries tripped on a
touch before it: K193/aa3 at 13:59 after one rep, K253/aa3 at 19:37 after 22
of 36 samples. Start one only when the phone can sit untouched for about 30
minutes (a rep takes about 9). THE PHONE WARMS THROUGH A PASS: skin 29.4 C at
the first sample, 37.4 at the end of rep 0 and 40.0 at the end, thermal status
1 from rep 1, and the load cells followed it (frames over 50 ms 5-8, 28-73 and
77-117 by rep; first sleep 15.7-16.4, 18.7-21.5 and 22.4-23.7 s). Base and
head run back to back in alternating order, so the load floors (frames over
50 ms ±15 default and ±27 slow, first sleep ±1.98 and ±0.86 s) are mostly
heat: compare base and head within one pass, never absolute numbers across
passes, and read a load verdict near its floor as heat. The fabric and knot
cells are tight (fps ±0.2-1.5). fabric@13 sat on the FINISH in 6 of 6
samples (the walk made 12 of 13 moves, K300), so it times the stars and
confetti; a `-Moves 0,7,11` pass has no fabric@11 floor until the next A/A.

- K79 stage B3 (2026-10-13), phone gate probes (`.claude/probes/K79/phone/`:
  `run_b3.ps1`, `panel_b3.mjs`, `passcost_x.mjs`, `watchdog.ps1`). (1) A
  "nothing jumps" pixel strip (the same strip of the page, compared before
  and after a panel action) needs `fw=0` in the URL AND a stopped drift
  (backgroundSpeed 0): the ribbons' undulation and mist's drift both move
  it, and the first desktop dry run read both as jumps. Add a control (the
  same grab, no change) to show the 0. (2) To launch Chrome over another
  app (Messages was in front), start the phone watchdog with `expect.txt` =
  `any` (its top-activity check is then off), launch Chrome, and switch
  `expect.txt` to `com.android.chrome` right after; the default trips at
  once on the other app. Tweakpane's color popup (`.tp-popv`) closes on a
  tap elsewhere, not on a second tap of its swatch.

- K7 stage 5 (2026-10-15), the physics worker on the phone
  (`.claude/probes/K7/stage5/`; the record is `docs/design/K7_worker.md`'s
  Stage 5 handoff). Stage 4's `k7_frames.mjs` and `k7_latency.mjs` take
  `--phone phone/config.json` (`phone_lib.mjs`: it drives ONLY the tab on
  the run's origin, emulates 411x753 at dpr 2.625 and no-preference motion
  from its own CDP session, CLEARS THE ORIGIN'S STORAGE before each load,
  and presses with touch, CDP `Input.dispatchTouchEvent`). The order: take
  the phone lock (`.claude/probes/agents/phone_lock_take.ps1`), serve a
  build on 5799 (`phone_srv.ps1 -Build <dir>`), `phone_setup.ps1 -Port
  5799` (a read-only awake check, `phone/config.json`, the reverse tunnel
  and the 9222 forward, ONE tab by an `am start` intent, K156's watchdog),
  the batch (`run_s5.ps1 -Batch <file> -Port 5799`: one perf-lock take, an
  `@build <dir>` line switches the served build, a `!<command>` line runs
  PowerShell), then `phone_teardown.ps1` (it clears the tab's storage
  through `phone_clear.mjs`, so the server must still be up; closes the
  tab; stops the watchdog; removes only the tunnels setup added),
  `phone_srv.ps1 -Stop`, and release the lock. `table_s5.mjs [prefix]`
  prints a row a run (the gate columns are ms after the main chunk's
  `responseEnd`) and the latency lines. GOTCHAS: never point
  `phone_lib.mjs` at levi.dev, or any origin Levi plays on, since it wipes
  his daily records there (stage 5 skipped the levi.dev cold start for
  this); the phone's cost per substep drifted 16-37 ms from load to load
  (soc 44-50 C), so compare hosts alternating within one batch; and at 60
  Hz an intro p95 of 33.4 ms is one dropped frame.
GOTCHA (K662, 2026-10-20): heat and media playback confound phone frame
times. Record `dumpsys thermalservice`'s status and the media session's
state (`dumpsys media_session`) beside every frame number. A confetti batch
ran at thermal status 1-2 (skin 40-43 C, SoC 50-53 C); the playing-vs-paused
A/B is still owed (K687).

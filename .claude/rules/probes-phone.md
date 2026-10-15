---
paths:
  - "scripts/phone.ps1"
  - "scripts/phone_pass.ps1"
  - "scripts/phone_pass/**"
  - ".claude/probes/K79/**"
  - ".claude/probes/K156/**"
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
phone. THE WATCHDOG TRIPS WHEN A PERSON USES THE PHONE: `-Phase check`
calls an awake, unlocked phone ready even with another app in front
(sh.paseo, the Claude app), and the start then trips at once ("top
activity is sh.paseo, expected com.android.chrome"; K193, 13:21) after a
clean cleanup. `retry_quiet.ps1` then waits 15 quiet minutes and every touch
(dozens of events a second while a finger moves) restarts the wait; it
gives up at `-GiveUpMin`. THE PORTRAIT FLOOR IS NOT TAKEN YET (K193 stage 1):
the 3-rep A/A (`-Base master -Head master -Reps 3`, master 96fa13a,
`.claude/probes/K193/aa3/`) ran 13:47-13:59 and TRIPPED on a touch (13:59:08,
BTN_TOUCH DOWN, the launcher in front; the cleanup ran clean) after rep 0 and
the three head fabric cells of rep 1. `scripts/phone_pass/noise.json` is
therefore STILL the landscape floor (810x331@2.625), and a portrait pass's
summary warns that it may not apply. A rep takes about 9 minutes on the phone
(a 3-rep A/A needs about 27 quiet minutes), and the phone warms through it
(skin 32.0 C at the first sample, 38.4 at the end of rep 0, 38.6-38.9 in rep
1), so one rep's cells ran at different temperatures. ONE rep (aa3 rep 0, per
cell max(|head - base|, one unit); `.claude/probes/K193/rep0_table.mjs`)
against the landscape floor: the 60 fps fabric and knot cells sit at or below
it (fps 0.1-0.5 against 0.5-1.3, render ms 0.2-2.8 against 2.1-8.4, the
longest frame 16.5-16.6 ms or 0.1 against 0.1-33.3); load-default is the same
size (fps 2.3 against 2.4, first sleep 0.5 against 1.17 s, but p95 16.3 ms
against 0.1 and frames over 50 ms 10 against 26); load-slow is larger (fps 2.8
against 1.6, frames over 50 ms 24 against 11, longest frame 50 against 33 ms,
first frame 76 against 45 ms). The three rep-1 head rows are worse (longest
frame 100-117.5 ms, 8-17 frames over 25 ms): the heat or a person near the
phone, which the rows cannot tell apart. TO FINISH: with the phone left alone
and awake, `-Phase check`, then `pwsh -NoProfile -File scripts\phone_pass.ps1
-Base master -Head master -Reps 3 -Out <dir>` (`.claude/probes/K193/
wait_then_aa.ps1` waits for 15 quiet minutes first); then `git mv
scripts/phone_pass/noise.json scripts/phone_pass/noise.landscape.json`, copy
the pass's `noise.json` to `scripts/phone_pass/noise.json` with a handwritten
`note`, and commit (the summary then picks whichever of the two matches a
pass's viewport).

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

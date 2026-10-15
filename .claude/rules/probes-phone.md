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
the command never returns): redirect it to a file.
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
+-11-26. It is one pass: weak, and for ONE viewport. The docked phone sits
in LANDSCAPE (display 2424x1080, the page 810 CSS px wide at dpr 2.625 and
331-387 high with Chrome's toolbar, not the 411x753 of the lessons), the
summary prints the viewport and warns when the floor's width or dpr
differs, and `-Phase check` prints the display: rerun an A/A
pass when the orientation changes. `-Dry` runs the same scripts against a
desktop Chrome with the phone's viewport: plumbing only, never timings.

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

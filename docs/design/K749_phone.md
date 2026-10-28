# K749: phone sitting 4 (the toasts, ice and the color rule, sprint)

Ledger: K749. One stage, sonnet, 1 h cap. Probes only: no app code
changes. The template is `docs/design/K726_phone.md`: read its "Before you
start" and "Setup" sections, then `.claude/probes/K726/` (`notes.md`,
`lib726.mjs`, `run_k726.ps1`, `build_k726.ps1`, `sword_phone.mjs`). Reuse
that kit: the K578 phone kit with K709's reconnect watchdog, the silenced
page checks, the locks and the idle gate.

Tonight's merges were checked on desktop and in phone emulation only.
This sitting checks three of them on the real Pixel with real touches
(`Input.dispatchTouchEvent`).

## Before you start

- **The phone.** Levi is asleep; the phone is on its charger and was left
  unlocked. Check the real state yourself (`mWakefulness`, keyguard,
  thermal, the media session state). Never wake or unlock it. Never touch
  media playback, or any app but the one tab the kit opens. Before each
  part: Awake and no keyguard, or stop and report. Levi may take the
  phone back around 07:00; if a person picks it up (the idle gate), stop.
- **Silence.** Every link you load carries `&snd=none`, with no
  exception. Never load the bare URL or any daily link. At each load,
  confirm the page reports soundMode none. The audiobook may be playing
  on this phone, and the game's default sound is music.
- **Where you work.** The main checkout
  (`C:\Users\lsl\Repositories\knotmaze`), only inside `.claude/probes/`,
  which git ignores. Read-only git commands plus `git fetch`. Never
  checkout, switch, stash, commit, reset or pull. The coordinator merges
  into this checkout while you run. Your probes and results go in
  `.claude/probes/K749/`.
- **Locks, the idle gate and the watchdog** work as in K726. Take the
  phone lock as `K749`. Take no performance measurements.
- **Ports.** 5749-5752.
- **The adb killer (K715).** Another session's Godot exit may run
  `adb kill-server`. Let K709's reconnect handle it, and record the time
  of any adb death exactly.

## Setup

Fetch, build origin/master into `.claude/probes/K749/builds/<sha>`, serve
it on 5749 and run the kit's phone setup as K726 did. Every link below is
on `http://127.0.0.1:5749/` and already carries `&snd=none`.

## Part 1: the toasts clear the controls (about 20 min)

K717 found two toasts over the walker buttons and the move pad on this
phone. K698 fixed it (`docs/design/K698_polish.md`, Handoff: "What
landed" and "Rect checks"), checked in emulation only. Its desktop driver
is `.claude/probes/K698/k698.mjs`: copy its in-page recorder, which
rect-checks every toast 400 ms after it shows against every visible
control (its selector list), and drive the same cases with real touches.

- **The cut** (`?7&am=instant&ct=on&snd=none`): arm the scissors, tap the
  entrance run. The refusal toast clears Undo and the move pad.
- **Lives** (`?7&am=instant&mt=hunter&mlv=3&snd=none`): walk into a real
  catch. The lives toast clears the pad.
- **The sword** (`?7&am=instant&mt=hunter&swd=oneuse&swm=20&snd=none`):
  walk to the sword (spot 107 on seed 7) with real touches, as K726's
  `sword_phone.mjs` did, then onto the minotaur. Every sword toast clears
  the pad. K740 notes these were only shown directly before, never after
  a walked pickup.
- **The walker** (`ct=lead`, then `ct=delay`): Lead's Go into "It's going
  in circles."; Delay's refused cut (the entrance run). Each toast clears
  the walker buttons (`.km-walk`). No move pad shows in Lead or Delay; it
  is back with `ct=off`.
- **The glow stills for K739.** Lead before Go and while walking, and the
  minotaur's glow (`mt=hunter`) for comparison: full-page stills over CDP
  (`Page.captureScreenshot`; never adb screencap) and crops around the
  head at 2x and 4x nearest-neighbour. Make one contact sheet with
  `.claude/probes/K525/mksheet.mjs`, named `sheet_glow.png`.

For each toast: its rect, the nearest control's rect and the gap, in CSS
px; any overlap; any toast cut off by the screen edge.

## Part 2: ice and the color rule (about 15 min)

Read "What landed" and "Page results" in `docs/design/K138_s1.md`'s
Handoff. The desktop driver is `.claude/probes/K138/s1/rules_page.mjs`
(it finds the icy runs and the breaking choices through the probe hooks).

- **Ice** (`?7&am=instant&ice=0.25&snd=none`): tap an icy run whose slide
  is two runs or more. The head ends where the rule's move ends. Then a
  backtrack (a tap on the slide's last run) undoes the whole slide.
- **Alternate and cycle** (`&cru=alternate`, `&cru=cycle`): walk until a
  choice breaks the rule and tap it. Nothing moves, the refusal toast
  shows and clears the pad, and the run plucks. Then a legal choice, then
  a backtrack (always allowed; it restores the color state).
- **Stills:** the frost on an icy run, and the rule colors at two
  junctions, full page plus 2x crops. K744 notes blips of other colors at
  junctions on desktop: say whether any show at real size.

## Part 3: sprint and the HUD rows (about 15 min)

Read "What landed" and "Page results" in `docs/design/K137_s3c.md`'s
Handoff. The desktop driver is `.claude/probes/K137/s3c/sprint_page.mjs`.

- **The turn clock** (`?7&am=instant&mt=hunter&spr=on&snd=none`): a real
  touch on the sprint button arms it (its armed look), a second touch
  disarms, a third arms again. Walk two runs: the minotaur stands through
  the first and moves on the second; the HUD row reads used and the
  button disables.
- **Real time** (the same with `&clk=realtime`): wait until
  `__knotPerf().state` leaves "loading", then call
  `__knotLoop({continuous: true})` (`.claude/rules/probes.md`, K137 stage
  3b), or the chase never ticks. Arm, walk two runs at the doubled pace,
  then used.
- **The HUD rows against the Free play badge (K738)**
  (`?7&am=instant&mt=hunter&mlv=3&swd=oneuse&swm=20&spr=on&snd=none`):
  with the hearts, sword and sprint rows all showing, and once with the
  HUD's stat rows on (`.claude/probes/K146_K151/probe_k146.mjs`'s `:hud`
  shows how), the rects of the HUD and the badge and the gap between
  them. Stills of the top of the screen, and of the button idle, armed
  and used.

## Constraints

No app code changes. Edit only inside `.claude/probes/`. Never use
`--virtual-time-budget`. Give any desktop Chrome a fresh temp profile.
Never clear Levi's Chrome profile, and touch no origin but your own
localhost ones. Close only your own tab: Levi has their own tabs open. At
the end, stop everything you started: servers, forwards, the reverse
ports you added, tunnels and the watchdog. Then release the phone lock.

## Stop rule

Stop when the parts are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone, and leave
time inside the cap to tear down. What the cap leaves goes in the report
as the remainder. A compaction is not a stop: after one, re-read this
brief and `.claude/probes/K749/notes.md` before going on. Keep notes in
`notes.md` as you go, never in the session scratchpad.

Report, for each part: the results; the paths of the stills and sheets;
what did not run, and why; any adb death, with its time. End with the
K749 handle fields and a `Ledger items` list.

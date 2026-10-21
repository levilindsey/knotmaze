# K767: phone sitting 5 (turnstiles, hidden runs, the beat rider)

Ledger: K767. One stage, sonnet, 1 h cap, and a hard stop at 06:50 PDT
(Levi may take the phone back around 07:00). Probes only: no app code
changes. The template is `docs/design/K749_phone.md`: read its "Before you
start", "Setup" and "Constraints" sections, then `.claude/probes/K749/`
(`notes.md`, `lib749.mjs`, `run_k749.ps1`, `build_k749.ps1`,
`toastrec749.mjs`, `tile749.ps1`, `sheet749.ps1`). Reuse that kit: the K578
phone kit with K709's reconnect watchdog, the silenced page checks, the
locks, the idle gate and the toast recorder.

Tonight's K138 stage 2 (turnstiles, hidden runs) and K114's beat rider
were checked on desktop and in phone emulation only. This sitting checks
them on the real Pixel with real touches (`Input.dispatchTouchEvent`).

## Before you start

Everything in K749's "Before you start" holds, with these changes:
- the phone lock is `K767`, the ports are 5767-5770, and probes and
  results go in `.claude/probes/K767/`;
- stop at 06:50 PDT whatever is left, and earlier if a person picks the
  phone up (the idle gate);
- every link carries `&snd=none` with no exception, the beat rider's too.

## Setup

Fetch, build origin/master into `.claude/probes/K767/builds/<sha>`, serve
it on 5767 and run the kit's phone setup as K749 did. Every link below is
on `http://127.0.0.1:5767/` and already carries `&snd=none`.

## Part 1: turnstiles (about 15 min)

Read "What landed" and "Page results" in the Handoff of
`docs/design/K138_s2.md`. The desktop driver is
`.claude/probes/K138/s2/s2_page.mjs` (it finds the turnstiles, their open
pairs and the plain route through the probe hooks).

- `?7&am=instant&tst=4&snd=none`: walk to a turnstile and tap an arm it
  holds closed. Nothing moves, and the refusal toast shows and clears the
  move pad (the K749 toast recorder's rect check). Then step out and back
  until the arm opens, and walk it.
- The arm you arrived by always lets you back out: a backtrack at a
  turnstile passes.
- **Stills:** two turnstiles' bands, full page plus 2x crops. Say whether
  each band reads at real size against the section colors (K760).

## Part 2: hidden runs (about 15 min)

The same Handoff, "hidden runs". The driver is the same `s2_page.mjs`.

- `?7&am=instant&hid=2&snd=none`: tap a thread on a hidden run's note
  within 3 runs of it. The run appears, the toast shows and clears the
  pad, no move is spent, and the HUD's found count goes up. Then walk the
  revealed run.
- **K764** (read from the code, never run): before a reveal, press and
  drag where a hidden run lies. Record whether the view pans (the camera
  moves) or the unseen thread is grabbed (the camera stays and nearby
  threads move). Take a still before and during the drag.
- `hid=4` once: the HUD's found / of row at real size.

## Part 3: the beat rider (about 15 min)

Read "What landed" and "Page results" in the Handoff of
`docs/design/K114_beat.md`. The desktop drivers are
`.claude/probes/K114/beat/beat_page.mjs` and `corner.mjs`.
`__knotBeat().on` reads false until the first tap.

- `?7&am=instant&clk=beat&snd=none`: the first touch starts the ride and
  the head moves on the beat with no sound. A touch on an arm before a
  junction steers the head there. With no touch it goes straight on, else
  keeps right, and an END turns it back.
- The pause: a touch stops the beat and hides the maze, a second touch
  resumes.
- `?7&am=instant&clk=beat&mt=hunter&spr=on&snd=none`: the pause sits
  above the sprint button. Record both rects and the gap in CSS px, and
  ride until the finish or a catch.
- **Stills:** the pause idle and paused, and the bottom-left corner with
  sprint, full page plus 2x crops.

## Stop rule and report

Stop when the parts are done, at the 1 h cap or at 06:50 PDT, whichever
comes first. Leave time inside it to tear down everything you started, as
K749's "Constraints" lists, then release the phone lock. Run `Get-Date` at
the start and at each milestone. A compaction is not a stop: after one,
re-read this brief and `.claude/probes/K767/notes.md`. Keep notes in
`notes.md` as you go, never in the session scratchpad.

Make one contact sheet per part with `.claude/probes/K525/mksheet.mjs`.

Report, for each part:
- the results;
- the paths of the stills and sheets;
- what did not run, and why;
- any adb death, with its time.

End with the K767 handle fields and a `Ledger items` list.

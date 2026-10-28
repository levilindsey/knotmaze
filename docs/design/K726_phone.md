# K726: overnight phone sitting 3

Ledger: K726 holds the handle. Three checks on the real Pixel:

- the K580 glyph cases behind Levi's K718 calls, at the phone's real size;
- K137 stage 3b's sword, with real touches;
- K720: sound off opens no audio.

One stage, sonnet, 1 h cap. Probes only: no app code changes. The
templates are `docs/design/K717_phone.md` and `docs/design/K703_phone.md`.
Read K703's "Before you start" and "Setup for parts 2-4" sections, then
`.claude/probes/K717/` (its notes and results: the silenced kit, the adb
reconnect). Reuse the K578 phone kit (`.claude/probes/K578/phone/`, with
K709's reconnect watchdog) and K703's `run_parts.ps1` patterns.

## Before you start

- **The phone.** Levi is asleep; the phone is on its charger and was left
  unlocked.
  - Check the real state yourself (`mWakefulness`, keyguard, thermal, and
    the media session state).
  - Never wake or unlock it. Never touch media playback, or any app but
    the one tab the kit opens.
  - Before each part: Awake and no keyguard, or stop and report.
- **Silence.** Every link you load carries `&snd=none`, with no exception.
  Never load the bare URL or any daily link. At each load, confirm the
  page reports soundMode none. The audiobook may be playing on this
  phone, and the game's default sound is music.
- **Where you work.** The main checkout, `C:\Users\lsl\Repositories\knotmaze`,
  only inside `.claude/probes/`, which git ignores.
  - Read-only git commands plus `git fetch`.
  - Never checkout, switch, stash, commit, reset or pull. The coordinator
    merges into this checkout while you run.
  - Your probes and results go in `.claude/probes/K726/`.
- **Locks, the idle gate and the watchdog** work as in K717. Take the
  phone lock as `K726`. Take no performance measurements.
- **Ports.** 5726-5729.
- **The adb killer (K715).** Another session's Godot exit may run `adb
  kill-server`. Let K709's reconnect handle it, and record the time of any
  adb death exactly.

## Setup

Fetch, build origin/master into `.claude/probes/K726/builds/<sha>`, serve
it on 5726 and run the kit's phone setup as K717 did. If K720 has not
merged yet (`git log origin/master --oneline --grep K720`), build what is
there, do parts 1 and 2, then fetch again and rebuild for part 3.

## Part 1: the K718 glyph cases at the phone's size (about 20 min)

Levi has three calls open on the a (K718; `docs/design/K580_s5.md`,
Handoff, Defects 2 and 3, and Residuals). Give Levi the evidence at the
size they play at.

- Links: `http://127.0.0.1:5726/?7&txt=<word>&am=instant&snd=none&fw=0&phw=0#glyphs2[=<options>]`.
  The options are comma-separated after one `=`: `xh2` (xh 2; xh 3 is the
  default), `notaper`, `aland`. For example `#glyphs2`,
  `#glyphs2=xh2,notaper`, `#glyphs2=aland` (`src/app/glyph_switch.ts`).
- Words `a` and `ai`, at xh 2 and xh 3, in three looks: tapered (no flag),
  `notaper` and `aland`. That is 12 pages.
- Per page: wait until the knot sleeps (the probe hooks, as K580's
  `shots.mjs` reads them; copy it from `.claude/probes/K580/`), then take a
  full page screenshot over CDP (`Page.captureScreenshot`; no screen
  recording and no adb screencap, since those can catch notifications).
- Crops: the a's J (the bowl's join to the stem foot) and the waist, at
  2x and 4x nearest-neighbour. Find the J from the full page; K580 s5's
  `attr_s5/` crops show where it sits.
- Make two contact sheets with `.claude/probes/K525/mksheet.mjs`, labelled
  by word, xh and look: the full pages, and the crops. Name them
  `sheet_glyph_pages.png` and `sheet_glyph_crops.png`.
- Write down what shows at real size: whether the J bite, the waist spikes
  and the notaper seam (the lighter disc and diagonal line) can be seen
  with the eye on the phone. Report only; Levi decides.

## Part 2: the sword on real touches (about 15 min)

Read "What landed" and "Page results" in `docs/design/K137_s3b.md`'s
Handoff. The desktop driver is `.claude/probes/K137/s3b/sword_page.mjs`
(main checkout). On seed 7 the sword lies at spot 107.

With real touches (`Input.dispatchTouchEvent`), in free play:
- the turn clock, `oneuse`, `swordMoves` 20: walk to the sword, take it,
  then walk into the minotaur while it flees (slain);
- real time, `timed`, `swordMoves` 8: take it and let the flee run out.

Stills: the sword marker before pickup, the HUD sword row, the pale blue
flee (rims and telegraph), each toast, the slain minotaur's layer gone,
and the finish banner if you reach a finish. Report whether anything
overlaps or is cut off at the phone's real size (K698 is the known toast
overlap; note only whether the sword's toasts add to it).

## Part 3: K720 on the phone (about 10 min)

Read K720's Handoff (`docs/design/K720.md`): what the rule is and how its
browser check counted. Before the page loads, add an init script
(`Page.addScriptToEvaluateOnNewDocument`) that counts `AudioContext` and
`webkitAudioContext` constructions and `resume()` calls.

On `?7&snd=none` (with your usual flags):
- a real tap on the maze, a real move, and a pluck drag on a thread;
- read the counts: they must be 0 contexts and 0 resumes;
- read the media session state before and after (`dumpsys media_session`,
  read-only). Report whether the page appears in it or changes it.

Never turn sound on during this part.

## Constraints

- No app code changes. Edit only inside `.claude/probes/`.
- Never use `--virtual-time-budget`. Give any desktop Chrome a fresh temp
  profile. Never clear Levi's Chrome profile, and touch no origin but your
  own localhost ones.
- Close only your own tab. Levi has their own tabs open.
- At the end, stop everything you started: servers, forwards, the reverse
  ports you added, tunnels and the watchdog. Then release the phone lock.

## Stop rule

Stop when the parts are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone, and leave
time inside the cap to tear down. What the cap leaves goes in the report
as the remainder.

Report, for each part:
- the results;
- the paths of the stills and sheets;
- what did not run, and why;
- any adb death, with its time.

End with the K726 handle fields and a `Ledger items` list.

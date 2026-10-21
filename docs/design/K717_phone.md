# K717: overnight phone sitting 2

Ledger: K717 holds the handle. This sitting checks the phone kit's sound
fix (K704), then three merges on the real phone:

- K137 stage 3a's lives;
- the K114 walker's Lead and Delay;
- what sitting 1 (K703) left: K177 and K687's frame cells.

One stage, sonnet, 1 h cap. Probes and kit fixes only: no app code
changes. The template is `docs/design/K703_phone.md`. Read its "Before
you start" and "Setup for parts 2-4" sections, then
`.claude/probes/K703/notes.md` (what went wrong, what worked). Reuse its
kit, `.claude/probes/K703/run_parts.ps1` with the K578 phone kit.

## Before you start

- **The phone.** It is set up as in K703_phone.md. Levi is asleep and the
  phone is on its charger. At 23:56 it was Awake, with no keyguard,
  thermal status 0 and media PAUSED.
  - Check the real state yourself (`mWakefulness`, keyguard, thermal, and
    the media session state). Don't trust this brief's numbers.
  - Never wake or unlock it. Never touch media playback, or any app but
    the one tab the kit opens.
  - Before each part: Awake and no keyguard, or stop and report.
- **Silence.** Every link you load carries `&snd=none`, with no exception.
  At each load, confirm the page reports soundMode none and 0
  AudioContexts, as K703 parts 2-4 did. The audiobook may be playing on
  this phone, and the game's default sound is music.
- **Where you work.** The main checkout, `C:\Users\lsl\Repositories\knotmaze`,
  only inside `.claude/probes/`, which git ignores.
  - Read-only git commands plus `git fetch`.
  - Never checkout, switch, stash, commit, reset or pull. The coordinator
    merges into this checkout while you run.
  - Your probes and results go in `.claude/probes/K717/`.
- **Locks, the idle gate and the watchdog** work as in K703. Take the
  phone lock as `K717`.
- **Ports.** 5717-5720, plus 5662 for K662's build (part 4).

## Part 0: the kit (about 15 min, then move on)

1. **K704: silence every kit link.** Add `snd=none` to every link the kit
   builds:
   - the K578 phone kit;
   - K662's `run_daily2.ps1`;
   - `phone_conf.mjs`'s cases, the daily case included.

   For the daily, check on a desktop Chrome (fresh temp profile, local
   server) that `?daily&snd=none` still loads the daily. The mode badge
   and the probe hooks show it. If it doesn't, find the daily form that
   stays silent and say which.
2. **K709: survive an adb restart.** The adb server died twice in K703,
   and the second time cost part 4. Add a reconnect-and-continue path. It
   must:
   - when getevent ends, or the device leaves `adb devices`, run
     `adb connect 100.88.68.65:5555`;
   - re-add the reverse ports and the 9222 forward;
   - restart getevent;
   - log the event with its time, then continue;
   - trip, as today, only if the reconnect fails within 30 s.

   Don't kill the adb server to test it. Call the path while connected
   (it must be a no-op then), and let any real death during the sitting
   test it. If an adb death happens, record its time exactly; K715 is the
   open root-cause item.

   Stop at the 15 min box and report what is unfinished.

## Part 1: K137 stage 3a's lives on the phone (about 15 min)

Build origin/master (after a fetch) into `.claude/probes/K717/builds`,
serve it on 5717, and run `phone_setup.ps1` as K703 did. Lives and K137-b
merged at `4541a9d`. Read "What landed" and "The page results" in
`docs/design/K137_s3a.md`'s Handoff. The desktop driver is
`.claude/probes/K137/s3a/lives_page.mjs`; look in the main checkout, and
if it's not there, in `.claude/worktrees/agent-a52e4207fa7a36be7/`.

With real touches (`Input.dispatchTouchEvent`), in a real-time chase with
2 hearts:
- the hearts row in the HUD;
- a catch, with its toast and the respawn at the entrance;
- the second catch restarting the level.

Then a turn-clock chase with 1 heart. Stills: the HUD hearts row, each
toast, and the finish banner's hearts row if you can reach a finish.
Report whether anything overlaps or is cut off at the phone's real size.

## Part 2: the K114 walker on the phone (about 15 min)

The walker is merging tonight. Fetch, and check
`git log origin/master --oneline --grep "K114 walker"`. If it is not
there yet, do parts 3 and 4 first and come back. If it is still not there
after those, skip this part and report it as the remainder.

Read "What landed" and "Calls for Levi" in `docs/design/K114_walker.md`'s
Handoff. Its desktop driver is
`.claude/probes/K114/walker/page/walker_page.mjs`. Build the master that
holds it and serve it on 5718.

With real touches, play Lead and Delay on seed 7:
- Lead: cut, then Go.
- Delay: cuts and passes.

Stills: the route display (the next run full, the rest faint), the
walker buttons, a Lead finish with its stars, and a Delay finish.

Levi has one open question, R.6.2: can a first-time phone player
predict the walker's next run? You can't answer it, so give him the
evidence. Take a strip of 6 page stills over the walker's first 3 runs in
Delay, each with the route display visible, and make a contact sheet
(`.claude/probes/K525/mksheet.mjs`). Use page screenshots only: no
screen recording and no adb screencap, since those can catch
notifications.

## Part 3: K177, the minotaur's edge indicator (about 5 min)

This is K703's part 4, ready to run:
`pwsh C:\Users\lsl\Repositories\knotmaze\.claude\probes\K703\run_parts.ps1 -Parts ind -End <HH:mm> -Tag <x>`.
Give it a fresh tag. K703's build `K703\builds\f02f075` is kept. Add
`snd=none` if the part's link lacks it. Compare `01_indicator`,
`02_framed` and `03_after_5s` with K174's desk stills
(`.claude/probes/K174/`). Report what a real tap on the indicator does.

## Part 4: K687, the quiet confetti frame cells (about 10 min)

These are the default-confetti frame cells only, taken as K662's part 2
took them: `.claude/probes/K662/results.md` says how, and the probe is
`phone_conf.mjs`. Use K662's build (`ea22989`, port 5662), now with
`snd=none`, so the numbers compare.

Record thermal status and the media state beside each cell
(`run_daily2.ps1`'s `PhoneState` shows how). If media is PLAYING, skip the
cells and say so.

## Constraints

- No app code changes. Edit only inside `.claude/probes/`.
- Never use `--virtual-time-budget`. Give any desktop Chrome a fresh temp
  profile. Never clear Levi's Chrome profile, and touch no origin but your
  own localhost ones.
- Close only your own tab. Levi has his own tabs open.
- At the end, stop everything you started: servers, forwards, the
  reverse ports you added, tunnels and the watchdog. Then release the
  phone lock.

## Stop rule

Stop when the parts are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone, and leave
time inside the cap to tear down. What the cap leaves goes in the report
as the remainder.

Report, for each part:
- the results;
- the paths of the stills and sheets;
- the frame numbers, with thermal and media state;
- what did not run, and why;
- any adb death, with its time.

End with the K717 handle fields and a `Ledger items` list.

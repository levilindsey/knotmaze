# K703: overnight phone sitting 1

Ledger: K703 holds the handle. The sitting covers the K114 cut verb and
K324 stage 2's real-time telegraph on the real phone (both merged
tonight; Levi has calls open on both, K694 and K695), then K687 and K177.
One stage, sonnet, 1 h cap. No code changes: builds, probes, screenshots
and counts only. Template: `docs/design/K662_phone.md`, tonight's
earlier sitting; read its "Before you start" and "Setup" sections and
reuse its kit exactly as described there.

## Before you start

- **The phone.** Pixel 11 on adb over Tailscale (`100.88.68.65:5555`;
  adb as in K662_phone.md). Levi went to bed at about 23:05 and left it
  unlocked and plugged in for the night. At 23:10: `mWakefulness=Awake`,
  powered, `stay_on_while_plugged_in` 15, no keyguard, thermal status 0,
  the audiobook PAUSED.
  - Never wake or unlock it, and never touch media playback or any app
    but the one tab the kit opens (`.claude/rules/probes-phone.md`).
  - Before each part: `mWakefulness=Awake` and no keyguard, or stop and
    report.
- **Where you work.** The main checkout, `C:\Users\lsl\Repositories\knotmaze`,
  only inside `.claude/probes/` (git ignores it). Read-only git commands
  plus `git fetch`; never checkout, switch, stash, commit, reset or pull:
  the coordinator merges into this checkout while you run. Your probes
  and results go in `.claude/probes/K703/`.
- **The lock, the idle gate and the watchdog** work as in K662_phone.md.
  Take the phone lock as `K703` for parts 2-4; part 1's runner takes and
  releases its own (as `K662`), so run it BEFORE you take yours.

## Part 1: K687, the K662 leftovers (about 15 min)

The ledger item: the daily paths 2b (reload after the official finish, no
banner expected) and 3 (replay: finish again), and default confetti frame
times with the audiobook paused at thermal status 0.

1. Run `pwsh -NoProfile -File C:\Users\lsl\Repositories\knotmaze\.claude\probes\K662\run_daily2.ps1 -End <HH:mm, 20 min ahead>`.
   It serves K662's build (`ea22989`, port 5662) and handles its own lock,
   gate, watchdog and teardown. Log: `.claude/probes/K662/logs/daily2.log`.
2. The quiet frame rerun: the default-confetti frame cells only, as
   K662's part 2 took them (`.claude/probes/K662/results.md` says how;
   the probe is `phone_conf.mjs`). Same build, so the numbers compare.
   Record thermal status and the media session state beside each cell
   (`run_daily2.ps1`'s `PhoneState` shows how). If media is PLAYING, skip
   the frame cells and say so.

## Setup for parts 2-4

As K662_phone.md's "Setup for parts 2-4", with these values: build
origin/master (`git rev-parse --short origin/master` after a fetch; at
writing, it holds K114 cut `5bb8b6f` and K324 stage 2 `031e09a`) into
`.claude/probes/K703/builds`, serve it on port 5703, take the lock as
`K703`, gate on idle, `phone_setup.ps1 -Port 5703 -Sha <sha>`, drive the
ONE tab with puppeteer-core (`defaultViewport: null`; emulate nothing).
Use real touch input over CDP (`Input.dispatchTouchEvent`), as the K662
probes do.

## Part 2: K114's cut verb on the phone (about 15 min)

Read the Handoff in `docs/design/K114_cut.md` (the param `ct`, the
scissors button `src/ui/cut_buttons.ts`, the refusal rule, Undo, the
carry) and stage 1's desktop driver in `.claude/probes/K114/cut/page/`. Copy
what you need into `K703/` and point it at the phone.

- With real taps, on a free-play design with `ct=on`: arm the scissors,
  cut a run, try a cut the game refuses (the toast), Undo, and walk
  through the carried chain if the Handoff shows how.
- Stills: the armed button, a cut run, the refusal toast, after Undo.
- **K698:** does the refusal toast overlap the Undo button on the phone,
  and does a tap on Undo during the toast's 2.5 s reach Undo? Report
  yes or no with the still.

## Part 3: K324 stage 2's real-time telegraph on the phone (about 15 min)

Read the Handoff in `docs/design/K324_s2.md`:
the lead, whole runs, the ring, the brightness options A and B (Levi's
call K695, rec B), and `mtg=0`. REAL-TIME TELEGRAPH in
`.claude/rules/gameplay-minotaur.md` has the params. K662's
`tele_phone.mjs` (`.claude/probes/K662/`) is tonight's turn-based
telegraph probe on this phone; adapt it.

- In a real-time chase: stills of the lead, the whole runs and the ring,
  at brightness A and at B, plus one with `mtg=0`. One contact sheet
  (`.claude/probes/K525/mksheet.mjs`).
- The frame pair: the rAF intervals over 10 s of the same chase with the
  telegraph on and with `mtg=0` (median, p95, longest). Phone timings
  need no perf lock.

## Part 4: K177, the minotaur's edge indicator on the phone (about 10 min)

K174 checked it on the desktop in 411x753 emulation; find its link and
stills with `git log --grep K174` and `.claude/probes/K174/`. On the
phone, shoot the indicator while the minotaur is off-screen, and what a
tap on it does if anything. Compare with K174's stills.

## Constraints

- No code changes and no edits outside `.claude/probes/`.
- Never use `--virtual-time-budget`. Give any desktop Chrome a fresh temp
  profile. Never clear Levi's Chrome profile; touch no origin but your
  own localhost ones.
- Ports: 5662 (part 1's runner) and 5703-5706.
- Stop everything you started (servers, forwards, tunnels, the watchdog)
  and release the phone lock.

## Stop rule

Stop when the parts are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone. Leave
time inside the cap to tear down. What the cap leaves goes in the report
as the remainder (a second sitting follows after the next merges).

Report, for each part: the results, the stills and sheets' paths, the
frame numbers with thermal and media state, and what did not run and
why. End with the K703 handle fields and a `Ledger items` list.

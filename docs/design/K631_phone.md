# Phone passes: K409's fire look and K244's cores

Ledger: K631. One stage, sonnet, 1 h cap. No code changes: builds,
probes, screenshots and counts only.

## Before you start

- The Pixel 11 is on adb over Tailscale (`100.88.68.65:5555`). It must be
  awake and unlocked; the passes never wake it
  (`.claude/rules/probes-phone.md`). Levi used it until 18:25.
- Take the phone lock with `.claude/probes/agents/phone_lock_take.ps1`
  (it waits while a fresh lock is held), then gate on idle with
  `.claude/probes/K578/phone/wait_idle.ps1 -MaxMin 9 -QuietS 30 -WinS 6`
  (exit 0 ready, 2 not ready). Not ready within 30 min in all: report and
  stop.
- A Chrome tab from the last pass (`localhost:5278`) is still open. Close
  it first, through DevTools (`/json/close/<id>` over the 9222 forward)
  or K578's `.claude/probes/K578/phone/phone_teardown.ps1`.
- K578's phone kit (`.claude/probes/K578/phone/`: `phone_setup.ps1`,
  `static_server.mjs`, the K156 touch watchdog) is the working plumbing;
  its `phone_setup.ps1` clears a stale watchdog trip itself.
- If the watchdog trips (someone touched the phone), stop every pass at
  once, release the lock and report what ran.

## Part 1: K409's phone sheet

K409 (the fire's widths in world units, the Gone ember ahead of the cut,
the band kept) merged at `3231d59`. Its pass is ready: take the lock as
exactly `K409 a5c384f` (the script releases only that owner), then run
`.claude/probes/K409/phone/run_phone.ps1 -Deadline <HH:mm, about 50 min
ahead>` from the main checkout. Its defaults point at the built
`3231d59` on port 5898. Sheets land in
`.claude/probes/K409/phone/out/sheet/`. Report their paths and anything
that looks wrong at phone scale.

## Part 2: K244 on the phone

K244 (merged at `ff67e4d`): auto plucks pick only sites that draw, and a
drag released in a junction core is silent. Its desktop probes are in
`.claude/probes/K244/` (`k244_probe.mjs`, `run_k244.mjs`,
`summarize.mjs`); the handoff in `docs/design/K244_cores.md` has the
desktop counts. Build master, serve it to the phone, and drive the same
checks over CDP (K572's `.claude/probes/K572/k572_phone.mjs` shows the
connection):

1. Random and music auto plucks: notes that sound with nothing drawn
   (expected 0).
2. Touch drags released in a core: sound, ripple and `navigator.vibrate`
   calls (expected none), against releases on drawn sites (each sounds
   once).
3. The `dense_phone` design, which the desktop pass never ran.

Probes go in `.claude/probes/K631/`.

## Constraints

- No code changes, and no edits outside `.claude/probes/`.
- Never use `--virtual-time-budget`. Give every desktop Chrome a fresh
  temp profile, and never clear Levi's Chrome profile.
- Stop the servers, forwards and tunnels you started, and release the
  phone lock.

## Stop rule

Stop when both parts are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone. Report
the sheets' paths, K244's counts, the K631 handle fields and a
`Ledger items` list.

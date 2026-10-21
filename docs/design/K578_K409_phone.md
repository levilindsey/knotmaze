# Phone check: K578's confetti fall and K409's fire look

Ledger: K578, K409. One stage, sonnet, 1 h cap. No code changes: builds,
probes and numbers only.

## Before you start

- The phone must be awake and unlocked; the passes never wake it
  (`.claude/rules/probes-phone.md`). Take the phone lock with
  `.claude/probes/agents/phone_lock_take.ps1` and release it at the end
  with `phone_lock_release.ps1`.
- If the phone is locked (it was at 16:54), wait for Levi to unlock it
  inside ONE blocking command: check
  `adb shell "dumpsys window | grep -c 'isKeyguardShowing=true'"` every
  30 s for up to 30 min. If it is still locked, report that and stop.

## Part 1: K578, the confetti fall (the main question)

K578's still-maze cache (branch `worktree-agent-a129cb0eb5eacb36a`, code
at `0093049`; the handoff is the end of that branch's
`docs/design/K578.md`) is used only while the confetti is the frame's
only visual need. At default settings the flow (fw 0.3) redraws every
frame, so the cache never runs. The 45 fps fall K572 measured predates
K573's cut to the gap search, so today's number is unknown.

1. Builds: `pwsh scripts/preview.ps1 -Port 5174` (master) and
   `pwsh scripts/preview.ps1 -Port 5175 -Ref 0093049` (the cache). Tunnel
   with `pwsh scripts/phone.ps1 -Ports 5174,5175`.
2. Probe: K572's (`.claude/probes/K572/k572_confetti.mjs`,
   `k572_phone.mjs`); copy what you need into `.claude/probes/K578/phone/`.
   Same design and fall as K572.
3. On the Pixel 11, the 8 s fall: median frame, fps, frames over 25 ms.
   - a. Master at defaults, 3 runs: today's number against K572's ~45 fps.
   - b. Master with `fw=0` against `0093049` with `fw=0`, ABBA twice (8
     runs): what the cache recovers where it is used. Confirm it was used
     (`window.__knotStillCache`, see the handoff).
4. Report the table and one line: is the fall still slow at defaults, and
   what would pausing the flow during the fall buy.

## Part 2: K409's phone pass

K409 (the fire's widths in world units, the Gone ember) merges to master
today; its phone pass did not run because the phone was locked. Run
`.claude/probes/K409/phone/run_phone.ps1` from the main checkout (the
merge copies the folder there; fix any path that still points into the
K409 worktree). Report its sheets' paths and anything that looks wrong on
the phone.

## Constraints

- No code changes. Probes go in `.claude/probes/K578/phone/` and
  `.claude/probes/K409/phone/` in the main checkout (untracked).
- Never use `--virtual-time-budget`. Give every Chrome a fresh temp
  profile, and never clear Levi's Chrome profile.
- Stop the servers and tunnels you started.

## Stop rule

Stop when both parts are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone. Report the
numbers, the sheets' paths, the item handle fields for K578, and a
`Ledger items` list.

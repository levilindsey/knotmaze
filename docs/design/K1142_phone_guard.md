# K1142 · the phone kit's guard

Started 2026-11-03 09:02 PT (agent K1142, Sonnet, wall-clock cap 1 h).

## Brief: K1142 · the phone kit's guard

The item, as filed: "Phone kit guard, before the next phone pass: at 08:04 on 2026-11-03 an S3c run found the phone awake and unlocked with an app in front, opened Chrome over that app, and stopped a second later when a person touched the phone (nothing timed). Fold the guard from `680651fe` (K1097's branch: run only with the launcher in front and the phone quiet; `.claude/probes/K1040/s3/phone_quiet.mjs`) into every phone runner (`run_phone.ps1`, the `scripts/` phone kit)."

What is there:
- The guard: `git show 680651fe:.claude/probes/K1040/s3/phone_quiet.mjs`, and its use in `git show 680651fe -- .claude/probes/K1040/s3/phone_time.mjs`. That commit is on K1097's branch: read it with `git show`, don't check it out, and don't touch that branch or its worktree. Its `run_phone.ps1` lives only there; it adopts your shared check when that branch rebases onto master (Claude does that), so don't edit it here; say in the Handoff what it must change (a line or two).
- Master's phone kit: `scripts/phone_pass.ps1` and `scripts/phone_pass/` (`run_pass.ps1`, `idle_wait.ps1`, `retry_quiet.ps1`, `watchdog.ps1`, `lib.mjs`, `p_common.mjs`, ...), plus any other TRACKED script that opens or drives Chrome on the phone (find them with `git grep`, e.g. for `am start`, `input `, `adb`, excluding `*.json` outputs). `scripts/phone.ps1` is Levi's interactive tunnel: leave it alone (Levi runs it while holding the phone).

Tasks:
1. One shared readiness check in `scripts/phone_pass/` (a module the runners import, or a script they call). The phone is ready only when the screen is on, the launcher (home screen) is in front, and nobody has touched it for the quiet window (take phone_quiet.mjs's window and its way of reading the phone's state, or say why something else is better). When not ready: re-check with backoff up to a timeout the caller passes, then exit non-zero with one plain line naming what failed (e.g. `phone not ready: com.example.app in front`). It never launches, closes or brings forward anything, and sends no key or input event, to make the phone ready.
2. Every tracked unattended runner calls it before it opens anything on the phone, and stops cleanly (closing only what it opened) when the phone is touched mid-run, if it doesn't already. Reuse what `idle_wait.ps1`, `retry_quiet.ps1` and `watchdog.ps1` already do rather than adding a second mechanism, and fold any duplicate logic into the shared check.
3. A unit test of the decision against captured state text (fixtures): launcher in front and quiet means ready; an app in front; the screen off; a touch inside the window; Chrome already in front (decide, and say why: a page the kit opened is not the same as Levi reading in Chrome). Fixtures keep only the lines the check parses; replace every package name other than the launcher's and Chrome's with `com.example.app`. Keep device serials, IP addresses and Tailscale names out of every tracked file and out of your report. `npm test` (tsc, then Vitest) stays green; if the worktree has no `node_modules`, run `npm ci --prefer-offline` once.
4. A live, read-only check, if the phone is reachable (`adb devices`, through the kit's own adb lookup): run the shared check alone and record its verdict (ready or not, and why) in the doc. The only phone commands you may send are read-only state queries (`dumpsys`, `getprop`, `adb devices`). Never open Chrome or any page on the phone, never send input, and run no timing or screenshot pass. If the phone isn't reachable, say so and skip this.
5. One line on the guard in the lore that describes the phone kit (path-scoped rules files attach by themselves when you read the kit's files; edit the one that covers it).

Done: the shared check; every tracked unattended runner calls it; tests green; a `## Handoff` in the doc (what each runner does now, the live verdict, what `run_phone.ps1` must change, anything left).

## How to work

- Read code through the shell: `Select-String` to find lines, `Get-Content <file> | Select-Object -Skip <n> -First <m>` to read them; use the Read tool only right before an Edit. Use PowerShell.
- Don't spawn subagents. Don't edit `LEDGER.md`. Avoid ports 5173 and 5480-5489 (you shouldn't need a server).
- Stop when the tasks are done or at 1 h wall clock (`Get-Date` at each milestone), whichever comes first: commit WIP, append the Handoff and report. A compaction is not a stop.
- Report: files and commits, the live verdict, then a `Ledger items` list (follow-ups, residuals) and K1142's handle fields (branch, last commit, evidence, next, brief).

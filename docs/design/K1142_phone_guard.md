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

## Handoff

K1142 agent (Sonnet), 2026-11-03 09:02 to about 09:45 PDT. Branch `worktree-agent-afaba2a2a3ece3c31`, worktree `.claude/worktrees/agent-afaba2a2a3ece3c31`, never pushed. Commits: `2ef9b12d` (brief), `48b1894a` (the shared check and its test), `a0f12b3c` (every runner wired, the lore), and the one that adds this section (see `git log`).

### The shared check

`scripts/phone_pass/phone_ready.mjs` (its header is the spec; a CLI and `import { ensurePhoneReady }`). The phone is READY when the screen is on, it is unlocked, the LAUNCHER is in front, and no event came from the touchscreen or a button for the quiet window (120 s: `phone_quiet.mjs`'s). The state is one adb call (`dumpsys power` wakefulness, `dumpsys window` keyguard, `dumpsys activity` top resumed activity; a dozing phone prints no top activity). The window is OBSERVED with `getevent -q -l` (the devices `watchdog.ps1` watches: `touch|gpio_keys|keys|power`, not the haptics device), because CDP traffic and adb `input` print no kernel event and `mLastUserActivityTime` moves on `puppeteer.connect()` alone. A not-ready reading holds the window at zero, as `phone_quiet.mjs` does. Not ready: it re-checks with backoff (5 s doubling to 60 s while the state is wrong, 5 s while it counts the window) for up to `--timeout-min` (always at least one whole window), gives up early when no whole window can still fit (a touch late in the wait), and ends with one plain line. Read-only: `dumpsys`, `getevent`, `adb devices`; it launches, closes, wakes, unlocks and sends nothing.

- `phone ready: launcher in front, screen on, no touch for 120 s`
- `phone not ready: an app is in front (not the launcher)` | `the screen is off` | `the phone is locked` | `Chrome is in front ...` | `touched 12 s ago (needs 120 s without a touch, waited 3 min)` | `cannot watch the touchscreen ...`
- exit 0 ready, 3 state, 4 touched, 5 no touchscreen to watch, 6 no adb or phone.

Decisions that differ from the brief or from `phone_quiet.mjs`:
- **Kind, not package.** The reason line names the kind in front (launcher, Chrome, an app), never a package name: that is K1097's own rule for logs (a package says what a person was doing), and a fixed `com.example.app in front` would be a made-up name. The tests use `com.example.app` for every other package.
- **Chrome already in front: refused by default, allowed by `--allow-chrome`.** A page the kit left behind (a pass's cleanup closes its tab and leaves Chrome in front) is indistinguishable by state text from Levi reading in Chrome, and a refused chained pass is one flag away; the person's open Chrome is the case that must never get a pass opened over it. Callers that chain passes (bisect2's later passes, `run_pass.ps1 -Cleanup`, the retry after a trip) pass the allowance and a shorter 30 s window, because they just watched the phone themselves.
- Buttons count as input, not only the touchscreen (`idle_wait.ps1` used to watch the touchscreen alone); a dead input stream restarts the window ("cannot watch the touchscreen") instead of counting as quiet.

Test: `test/phone_pass/phone_ready.test.ts`, 28 tests on a virtual clock with sanitized fixtures: state parsing; launcher in front and quiet = ready; an app in front; the screen off; locked; a touch inside the window (restarts the window for a patient caller, stops an impatient one); Chrome in front with and without the allowance; adb gone; a dead stream; the verdict lines name no package; the device filter pinned against `watchdog.ps1`'s regex; and two pins: every `scripts/` file that has `shell am start` or `input` (all but Levi's `phone.ps1`) calls `phone_ready.mjs`, and so do `idle_wait.ps1` and `retry_quiet.ps1`. `npm test` (tsc, then Vitest): 199 files, 2691 tests passed.

### What each runner does now

| Runner | Now |
|---|---|
| `scripts/phone_pass.ps1 -Phase check` | One call of the shared check (`-QuietS` 120, `-AllowChrome`, `-WaitReady <min>` = the patience); exit 3 with `PHONE NOT READY: <the line>`. It no longer logs the top package. |
| `-Phase start` / `all` | Step 1: a state-only look (`--quiet-s 0`), so a wrong state fails before the builds. Step 4: the full check (window included) right before the tunnels and the one `am start`, the only opener in `scripts/`. |
| `-Phase frames/looks/summary/cleanup` | Unchanged: they work in the pass's own tab, the watchdog stops them on a touch, and cleanup closes only what the pass opened. |
| `scripts/phone_pass/idle_wait.ps1` | A thin caller (its own `getevent` loop is gone). Exit 0 ready, 2 touched, 3 state, 5, 6; `-AllowChrome`. |
| `scripts/phone_pass/retry_quiet.ps1` | The touchscreen loop, the `dumpsys` look and the `-Phase check -WaitReady` call became ONE call (`-QuietMin` window, patience `-GiveUpMin + -WaitReadyMin`); the rerun passes `-QuietS 30`; `-AllowChrome`. |
| `scripts/phone_pass/run_pass.ps1` | Passes `-QuietS` (120; 30 with `-Cleanup`) and `-AllowChrome` (implied by `-Cleanup`) to the start; its 100 s start poll grows by the window. |
| `scripts/phone_pass/bisect2.mjs` | Its first pass has the full guard; later ones (after its own cleanup) pass `-AllowChrome -QuietS 30`. A person on the phone fails the start, which stops the driver as any failed start does, and the log line carries the verdict. |
| `scripts/phone_pass/watchdog.ps1` | Unchanged: it is the mid-run stop (a touch, a key, a lock, another app in front). |
| Not changed | `scripts/phone.ps1` (Levi's interactive tunnel); `lib.mjs` (a read-only thermal query); `bench_frame.mjs --cdp`, `k923/sync.mjs --target phone`, `k923/close_tabs.mjs` (hand-run tools that attach over the 9222 forward to a Chrome the person put in front; they open nothing with adb). |

Lore: `.claude/rules/probes-phone.md` (the guard paragraph; its two stale sentences about `-WaitReady` two-in-a-row and the "check calls an app-in-front phone ready" blind spot).

### Live check (read-only)

The phone was reachable (one device). Only `adb devices`, `dumpsys`, `getevent -p` and the input stream were used: no input, no Chrome, no page, no pass (no `getevent` was left running on the phone afterwards). Four readings of the same phone in 09:27-09:34, none touched by me: the module via `idle_wait.ps1 -QuietMin 1 -MaxMin 0` at 09:27 gave `phone not ready: the screen is off` (exit 3); `phone_pass.ps1 -Phase check` at 09:31 gave `phone not ready: an app is in front (not the launcher)` (exit 3); `retry_quiet.ps1 -NoRun -QuietMin 1` (a synthetic pass folder) at 09:32-09:33 gave `phone ready: launcher in front, screen on, no touch for 60 s`; and `phone_pass.ps1 -Phase check -QuietS 30` at 09:33-09:34 gave `phone ready: launcher in front, screen on, no touch for 30 s` and exit 0. So both verdicts occurred live, and the guard's answer followed the phone.

### What K1097's branch must change when it rebases

At `680651fe`, `run_phone.ps1` only runs `phone_time.mjs`, and `phone_quiet.mjs` is a separate script run before it. After the rebase: delete `phone_quiet.mjs`, and in `run_phone.ps1`, before the `phone_time.mjs` line, call the shared check and stop on its exit code:
`& node (Join-Path $repoRoot 'scripts\phone_pass\phone_ready.mjs') --quiet-s 120 --timeout-min <minutes to wait> --progress; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }` (3 state, 4 touched, 5 no touchscreen, 6 no phone; add `--serial <serial>` only with several devices). `phone_time.mjs` keeps its own input watch (the mid-run stop on a touch, a copy of `watchdog.ps1`'s idea) and can drop its launcher test (`if (!/launcher/.test(s0.topPkg)) throw ...`) or, from JS, call `ensurePhoneReady({ quietS: 0 })` for the state-only look. Its `front()` helper (kind by name) already matches the module's rule.

### Left over

- **Unwatched seconds before the watchdog.** Between the end of the check and the watchdog's start (the tunnels, the `am start`, the tab poll of up to 40 s, 6 s of arming) a touch is not seen. Fix idea: arm the watchdog with `expect.txt` = `any` BEFORE the `am start` and switch it to Chrome after (the K79 recipe in `probes-phone.md`). Not done: it cannot be tested without a live pass, which this brief forbids.
- **A Chrome leftover cannot be told from Levi reading in Chrome** by state text; hence the default refusal and the explicit allowance.
- **Two adb lookups.** `phone_pass.ps1`'s `Find-Adb` and the module's `findAdb` are copies (the pass hands its path over with `--adb`); fold them when either changes.
- **Unguarded hand-run tools:** `bench_frame.mjs --cdp`, `k923/sync.mjs --target phone`, `k923/close_tabs.mjs`. They need Chrome in front by design; a `--ready` flag calling `ensurePhoneReady({ allowChrome: true })` would guard them.
- **Cost:** every pass start now watches a quiet window (120 s; 30 s chained). The rounds' recipe (`idle_wait.ps1`, then `-Phase check`) still holds, but the check now also demands the launcher in front, so a phone left on an app waits for a person.
- The PowerShell wiring is checked by parse, the file pins and the live read-only runs above, not by a unit test.
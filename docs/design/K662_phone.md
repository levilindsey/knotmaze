# K662: one phone sitting

Ledger: K662 holds the handle. The sitting covers K631 part 2, K646 with
K587, K651, and K644 if K580 stage 3 has merged. One stage, sonnet, 1 h
cap. No code changes: builds, probes, screenshots and counts only.

## Before you start

- **The phone.** The Pixel 11 is on adb over Tailscale
  (`100.88.68.65:5555`; adb is
  `C:\Users\lsl\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe`).
  - Levi plugged it in at about 20:00 and left it for this sitting.
  - At 20:05 it was on AC power and awake, with stay-awake on
    (`stay_on_while_plugged_in` 15). So the screen holds between parts
    even with no tab open.
  - Never wake or unlock it (`.claude/rules/probes-phone.md`).
  - Before each part, check that `dumpsys power` shows
    `mWakefulness=Awake` and that no keyguard shows. If either fails,
    stop and report; don't wait for it.
- **Where you work.** The main checkout,
  `C:\Users\lsl\Repositories\knotmaze`, but only inside `.claude/probes/`,
  which git ignores.
  - Never edit tracked files.
  - Run only read-only git commands, plus `git fetch`. Never checkout,
    switch, stash, commit, reset or pull: the coordinator merges into
    this checkout while you run.
  - Your probes and results go in `.claude/probes/K662/`.
- **The phone lock.** Part 1's runner takes and releases its own lock.
  - For parts 2-4, take the lock as `K662`:
    `.claude/probes/agents/phone_lock_take.ps1 -Owner "K662" -What "phone sitting parts 2-4" -MaxWaitMin 5`.
  - Release it with `phone_lock_release.ps1 -Owner "K662"` when you
    finish.
- **The idle gate.** Before each part, run
  `.claude/probes/K578/phone/wait_idle.ps1 -MaxMin 9 -QuietS 30 -WinS 6`
  (exit 0 ready, 2 not ready). If it is not ready within 15 min in all,
  report and stop.
- **The watchdog** is K578's (`phone_setup.ps1` starts it). It stops the
  node scripts whose command line carries the kit's `config.json` path,
  so pass that path to each probe as a trailing argument. If it trips
  (someone touched the phone), stop every pass at once, tear down,
  release the lock and report what ran.

## Part 1: K631 part 2, K244 on the phone (about 25 min)

The checks are those in `docs/design/K631_phone.md`, part 2:

1. random and music auto plucks: notes with nothing drawn (expected 0);
2. drags released in a junction core: sound, ripple or vibrate (expected
   none), against releases on drawn sites (each sounds once);
3. the `dense_phone` design.

Steps:

- Run
  `pwsh -NoProfile -File C:\Users\lsl\Repositories\knotmaze\.claude\probes\K631\run_part2.ps1 -End <HH:mm, 35 min ahead>`.
  - It runs a 4-cell smoke, then 12 cells.
  - It serves `.claude/probes/K631/builds/` on port 5631, takes and
    releases its lock, gates on idle, and sets up and tears down the
    phone.
- Summarize with `node .claude/probes/K244/summarize.mjs .claude/probes/K631/out/phone`.
- Compare the table with the desktop counts in the Handoff of
  `docs/design/K244_cores.md`.

## Setup for parts 2-4

1. Build origin/master:
   - `git -C C:\Users\lsl\Repositories\knotmaze fetch -q origin`;
   - `<sha>` = `git rev-parse --short origin/master`;
   - `pwsh -NoProfile -File C:\Users\lsl\Repositories\knotmaze\scripts\preview.ps1 -Ref <sha> -Root C:\Users\lsl\Repositories\knotmaze\.claude\probes\K662\builds -BuildOnly`.

   It builds in a temporary worktree, so the checkout is untouched.
2. Serve it in the background:
   `node .claude/probes/K578/phone/static_server.mjs 5662 .claude/probes/K662/builds`.
   The app is then at `http://localhost:5662/<sha>/`.
3. Take the lock as `K662` and gate on idle.
4. Run `pwsh -NoProfile -File .claude/probes/K578/phone/phone_setup.ps1 -Port 5662 -Sha <sha>`.
   It adds the reverse tunnel and the 9222 forward, opens ONE tab and
   starts the watchdog.
5. Drive that tab with puppeteer-core:
   - connect with `puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null })`,
     as `.claude/probes/K525/turns_phone_real.mjs` does;
   - open each design by navigating that tab, and keep it open until the
     last part;
   - the phone is the device, so emulate nothing except reduced motion
     where a case asks for it.

When you finish, tear down:

- `pwsh -NoProfile -File .claude/probes/K578/phone/phone_teardown.ps1`.
  It closes only its tab, clears that origin's storage, and stops the
  watchdog and the tunnels it added.
- Stop the static server.
- Release the lock.

## Part 2: K646 and K587, confetti on the phone (about 15 min)

K336 (side cannons and streamers) and K186 (confetti on every win banner,
none under reduced motion) have shipped. The confetti keys are in
`docs/design/K336_cannons.md`:

- `cfc`: the cannons, on by default;
- `cfn`: the cannon amount, 0-3, default 1;
- `cfh`: the shine, 0-2, default 1;
- `cfa`: the amount.

Steps:

1. **The banner paths.** `.claude/probes/K336/banners/banners.mjs` is
   the desktop probe; its header lists the cases.
   - Copy it into `K662/` and make it connect to the phone instead of
     launching Chrome.
   - Run free, daily, practice, realtime, burn and reset.
   - Run rm_a, with reduced motion emulated before load; it expects no
     confetti.
   - Skip arrive if its reload timing doesn't work over CDP, and say so.
2. **Frame time.**
   - Play the same finish each time and record the page's
     requestAnimationFrame intervals over the confetti's life. Report
     the median, p95 and the longest frame.
   - Runs:
     - `cfn` 1 and 3, with the cannons on;
     - `cfh` 0, 1 and 2, at amount 1 (K587).
   - `.claude/probes/K140/k140_page.mjs` shows the desktop measurement.
   - Phone timings don't need the perf lock.
3. **The look.**
   - Take mid-burst stills (CDP `Page.captureScreenshot`) at amounts 1
     and 3, and at shine 0, 1 and 2.
   - Make one contact sheet. `.claude/probes/K525/mksheet.mjs` makes
     sheets; read its header.

## Part 3: K651, K525's telegraph rims on the Pixel (about 10 min)

`docs/design/K525_telegraph.md` covers this:

- step 7 (about line 207): shoot roam, hunt, a catch and the fog glow in
  one sheet, beside K524's;
- about lines 73-95: the params `mtg` (the telegraph, a flag) and `mtl`
  (rims | line | both).

Steps:

1. Copy `.claude/probes/K525/turns_phone_real.mjs` into `K662/`. It is
   K524's walk on `?7&am=instant&mt=hunter`: roam at turn 2, hunt at 47,
   caught at 48.
2. Add the telegraph to its link with `mtl=rims`. Take the exact
   key=value form from `.claude/probes/K525/tele_states.mjs`.
3. Add a fog-glow still. The fog params are in
   `.claude/rules/gameplay-minotaur.md`, or in the fog lore it names.
4. Run it against `http://localhost:5662/<sha>/`.
5. Make one sheet. Put it beside K524's real-phone sheet, which is
   probably `.claude/probes/K525/contact_sheet_real.png`; check its
   stamp.

## Part 4: K644, K580's glyphs on the Pixel (only if K580 stage 3 has merged)

1. **Check first.** After parts 1-3, fetch and look for K580 stage 3
   merged in `git show origin/master:LEDGER.md`. If it has not merged,
   skip this part and say so.
2. **The link.** Build that commit as in the setup, as a second build in
   the same `builds/` folder. Take the link form from the stage 3
   Handoff in K580's design doc on origin/master. Stage 2's form was
   `?<seed>&txt=<word>&am=instant&snd=manual&fw=0&phw=0#glyphs2`, with
   `=xh2` for x-height 2.
3. **Shoot** the words "a", "ai", "ia" and "aa", on seeds 7 and 9, at
   x-heights 2 and 3. Make one sheet.
4. **Compare** with stage 2's desktop shots at phone scale
   (`.claude/probes/K580/shots/` and `sheets/`).

## Constraints

- No code changes and no edits outside `.claude/probes/`.
- Never use `--virtual-time-budget`.
- Give any desktop Chrome a fresh temp profile.
- Never clear Levi's Chrome profile. Touch no origin but your own
  localhost ones.
- Ports: 5631 (part 1's runner) and 5662-5665.
- Stop everything you started (servers, forwards, tunnels, the
  watchdog), and release the phone lock.

## Stop rule

Stop when the parts are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone. Leave
time inside the cap to tear down.

Report, for each part:

- the results and the sheets' paths;
- K244's phone counts against the desktop's;
- the frame numbers;
- what did not run, and why.

End with the K662 handle fields, K631's state, and a `Ledger items` list.

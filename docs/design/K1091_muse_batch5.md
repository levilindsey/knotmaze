# K1091: Muse batch 5

Claude starts these runs through Paseo, one run at a time, after batch
4 (`docs/design/K1079_muse_batch4.md`). Each run is a fresh Muse agent
that reads this brief, does its run's tasks, and stops. Claude reviews
each run on master afterwards and closes K1091.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. None changes physics,
junctions, the cursive, or how the threads are drawn: a junction agent
works in its own worktree on `src/render/field/` while this batch
runs, and no run below touches anything in `src/render/`.
Run A and Run B change what the player sees, in ways a table decides
(clipped text, how fast the camera lands). The runs are in order of value
to Levi, and no two share a file.

## How to work

The process in `docs/design/K1050_muse_week.md` applies unchanged. Read
its sections "Each task, start to finish", "When a task stops", "Rules",
"Off limits" and "Reports" before anything else. Where they say K1050,
read K1091 (`ledger.mjs handle K1091 ...`). Batch 3's and batch 4's rules
hold too:

1. Close an item only when its Done check below passes. A task that
   stops keeps its item open. Its commit says `Status: partial`, the item
   says which stop rule fired and what is left, and the remainder is
   filed with `ledger.mjs add`.
2. Do the task as written. If the brief looks wrong (a file, function or
   param it names isn't there, or a number it quotes doesn't match),
   stop that task and quote the brief's line in your report. Don't
   substitute other work or other measurements.
3. A `LEDGER:` commit holds `LEDGER.md` alone. A code fix goes in a work
   commit.
4. Update only K1091's handle
   (`ledger.mjs handle K1091 --last-commit <sha> --next "..."`). Don't
   close it or edit its text: Claude closes it.
5. No subagents: Paseo crashes when Muse spawns them.
6. When a run allows something that K1050's Rules or Off limits forbid,
   it says so in a line starting "Exception". The exception covers that
   run only.
7. Every server and probe uses a port in 5500-5599 (each run suggests a
   range). Old probes this batch copies may name other ports: change
   them. Start servers in the background and stop them when the run ends.
8. A probe's before table is taken on the unfixed code first, then the
   fix, then the after table. Both go in the commit message under
   `Checked:`. A fix whose before table already passes is not a fix: say
   so, close nothing, and report.

Muse doesn't load `.claude/rules/` by itself. Each run names the rules
files to read before changing its area.

Timing measurements take the perf lock first: `$env:TEMP\claude-perf.lock`,
one line (owner, start time, what).
`.claude/probes/K441/lock_take_fast.ps1` (`-Owner <ID> -What "<text>"`)
and `.claude/probes/K441/lock_release_exact.ps1` (`-Owner <ID>`) take and
release it. If another owner holds it and it is under 30 minutes old,
wait inside one command. Delete it when you're done.

A follow-up for Levi goes to `Waiting on Levi` only when it is about
what Levi sees or feels, in plain words with no param or function names.
Where a run gives that item's text, use it as written.

End the run with a short report: one line per task with its status and
commit.

## Run A · K775 and K738: the HUD stays whole and clear of the badge and the menu

Read first: the rules files `docs/lore_index.md` maps to
`src/ui/maze_hud.ts` and to `src/ui/mode_badge.ts`, the header comment of
`src/ui/mode_badge.ts` ("PLACEMENT", `fit()`, `FIT_GAP` 8), and
`.claude/probes/K749/notes.md` and `.claude/probes/K767/notes.md` (the
phone measurements this run's numbers come from).

The ledger says:

> **K775** · K138 s2: the hidden runs HUD row (found / of) overflows its box and runs under the menu
> button at hid=2 and hid=4 on the phone (a 288 px value in a 327 px box, the last word cut off;
> K767, `.claude/probes/K767/out/hidden/stills/tiles/`)
>
> **K738** · HUD rows vs the mode badge at 411x753: the sword row (slain on move NN) clears the Free
> play badge by only 13 css px (K726, `.claude/probes/K726/out/sword/stills/`); the K137 s3c/s3d and
> K138 HUD rows may push it under the badge
>   - Real phone (K749): with stat rows on, the badge covers the HUD (2.9 px at path 1234 / 886,
>     49.7 x 42 css px with the sword slain row, hiding the time and path values); stats off, slain
>     clears by 12.7 px; at 360 px wide est. 38 px overlap. Fix: a width cap with wrap, the badge
>     moving, or the HUD stepping under it. Sheet `.claude/probes/K749/out/hudgrow_g/sheet_hudgrow.png`

What is there today (read it, don't trust this summary). The HUD
(`.km-hud` in `src/ui/maze_hud.ts`, CSS near line 230) is a two-column
grid, top-left, `max-width: calc(100vw - 84px)`, and both its key and
value cells are `white-space: nowrap`, so a long value cannot shrink and
spills out of the box: that is K775. The mode badge (`#mode-badge`,
`src/ui/mode_badge.ts`) steps down through shorter labels, a bare icon and
finally "below the menu button" (`km-fit-low`) wherever it would come
within `FIT_GAP` of the HUD, the banners or the menu, but only when
`fitModeBadge` in `src/main.ts` (near line 1089) runs. It runs on resize,
a panel open or close, a banner showing or hiding and a badge state
change. Nothing there calls it when the HUD's own rows change size (the
path counter growing, the sword row turning to "slain on move NN"). That
is inferred from reading `main.ts`, not tested: it would explain K738's
phone numbers, because the badge fits against the HUD it saw at the last
trigger. Test it first.

Tasks, in order:

1. Build the probe. Copy `.claude/probes/K749/hudgrow_phone.mjs` and
   `lib749.mjs` to `.claude/probes/K775/` (leave K749's files alone) and
   run it in its desktop mode (`DESK=1`, set `PORT` to a number in
   5500-5599; read `openDesk()` in the lib for the viewport and add
   `page.setViewport` if it doesn't set the widths, and load the page
   again after every change of width: mobile emulation keeps the layout
   width it loaded with, K73 in `.claude/rules/probes.md`). It rewrites the HUD's
   value cells in the page and reads the HUD's and the badge's rects, so
   nothing is played. Extend it to widths 411x753, 360x740 and 320x640,
   and to these states, each with the stat rows on
   (`localStorage` key `knotmaze.showMazeStats`, set before load with
   `page.evaluateOnNewDocument`; `main.ts` near line 183 shows the value
   it reads) and off:
   base; path `1234 / 886`; sword slain on move 20; all grown (the
   existing states); and the hidden runs row at `?7&am=instant&hid=2&snd=none`
   and `...&hid=4...` with the row's real text (`hiddenValue` in
   `maze_hud.ts`, near line 114).
   For every state and width record: the HUD box rect; each value
   cell's right edge against the box's inner right edge (and
   `scrollWidth` against `clientWidth`); the gap from the HUD's right
   edge to `.kp-menu`'s left edge; the rect relation to `#mode-badge` as
   `relate()` in the probe computes it; the badge's `km-fit-*` class.
   Take this table on unchanged code and keep it: it is the before table.
   Desktop fonts are narrower than the phone's, so expect smaller numbers
   than the ledger's (the K749 desk smoke saw 30 css px of overlap where
   the phone saw 49.7): the table is a regression check, not a phone
   measurement.
2. K738 first. Make the badge re-fit when the HUD changes size: a
   `ResizeObserver` on `hud.el` in `main.ts` next to the other
   `fitModeBadge` triggers, calling `fitModeBadge()` (guard against a
   loop: the badge's own fit must not resize the HUD). Re-run the probe
   states, re-fitting as the page now does by itself. If every state is
   then 8 css px or more clear of `#mode-badge` and `.kp-menu` at all
   three widths, K738 needs no CSS: stop at this step for K738.
3. K775 and whatever step 2 left. For the hidden runs row only, let the
   value wrap inside the box (a class on that row's value cell such as
   `km-wrap`: `white-space: normal`, right-aligned, the key cell and
   every other row stay `nowrap`). If a state still collides after both
   steps, the options left are a layout call (the badge moving to a new
   place, or the HUD stepping under it): that is Levi's (stop rule 3).
   Stop there, keep what passes, and file it with `ledger.mjs add
   --section Residuals --text "..."` (the state, the width, the
   numbers).

Exception: this run may edit `src/main.ts` for the one `ResizeObserver`
and nothing else in it.

Done check:

- After table: in every state at all three widths, no value cell extends
  past the HUD box, and the HUD stays at least 8 css px clear of
  `.kp-menu` and `#mode-badge`. A state the badge can't clear even at
  its lowest level at 320 wide is reported, not forced.
- Every state that was clean in the before table (no overflow, gap of 8
  or more) has identical HUD and badge rects after (print both tables
  side by side in the commit). The text of every row is unchanged.
- A unit test in `test/ui/maze_hud.test.ts` pins which rows carry the
  wrap class (the hidden runs row, no other), and `test/ui/mode_badge.test.ts`
  still passes untouched.
- `npm test` passes.

Report: the before and after tables, which of steps 2 and 3 fixed which
item, and any state left open.

If code changed, file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "On the phone, with the stat rows on, play a maze with hidden runs and the sword: does the top-left readout stay whole, and clear of the Free play pill and the menu button, as its numbers grow? (K775, K738, <sha>)"`

Close: K775 and K738 each with `ledger.mjs done <ID> --commit <sha8> --what "..."`
when the Done check passes for that item. Suggested ports: 5510-5519.

## Run B · K1085: reduced motion snaps the camera's fit

Read first: `.claude/rules/gameplay-camera.md` (the fit, K198's view clamp
in `src/ui/view_clamp.ts`), `.claude/rules/gameplay-motion.md` (the
Motion setting), `.claude/rules/probes.md`, and `## K1085` in
`docs/ledger_notes.md`.

The ledger says:

> **K1085** · Reduced motion doesn't snap the camera's fit: updateCamera's 0.08/frame ease (`src/app/camera.ts:436`)
> and easeView's range ease (:257) have no reduced path, unlike K198's panel tween (:229). K549 (f578b6ee) makes a
> panel toggle re-fit a text scene. Fix: snap both when reduced. Full text: `docs/ledger_notes.md`.

The full note: "Under reduced motion the camera's fit still eases (about
1 s) where K198's panel tween snaps: updateCamera's 0.08/frame ease
(`src/app/camera.ts:436-438`) and easeView's range ease (:257) have no
reduced path; only stepPanel (:229) has one. K549 (f578b6ee) adds a
trigger: a panel toggle now re-fits a text scene. Fix: snap both when
reduced (resize and reset then snap too)."

In `src/app/camera.ts`: `stepPanel` passes `motion.reduced ? 0 : PANEL_TWEEN_S`
to `stepPanelTween`; `updateCamera` moves `fitCur.scale`, `.x` and `.y` a
constant 0.08 of the way to `fitTarget` each frame (the target itself is
recomputed every third frame); `easeView(rate?)` calls `stepRange` with
`rate` left to its default, `RANGE_EASE` (0.15, `src/ui/view_clamp.ts`),
where 0 holds and 1 snaps. `fitToScreen()` ends with `easeView(0)`, a
hold, which must stay a hold.

Tasks:

1. Pure helpers in `src/ui/view_clamp.ts`, with tests in
   `test/ui/view_clamp.test.ts`: `FIT_EASE = 0.08` moved out of
   `camera.ts`, `fitEase(reduced)` (1 when reduced, else `FIT_EASE`) and
   `rangeRate(rate, reduced)` (an explicit `rate`, including 0, comes back
   unchanged; `undefined` gives 1 when reduced and `undefined` otherwise,
   so `stepRange` keeps its default). `camera.ts` calls them every frame
   with the live `motion.reduced` (the setting changes while running; no
   caching).
2. Probe: copy `.claude/probes/K198/pan.mjs` and `lib.mjs` to
   `.claude/probes/K1085/` and write `reduced.mjs` on the same model (a
   headed Chrome on the dev server; the maze link `?b.J&am=instant&snd=none&bg=none`;
   the page-side per-frame sampler of `__knotView()`, whose `x`, `y` and
   `s` are the applied fit). Run each case twice, once with
   `await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }])`
   before `goto` (print what `window.__knotMotion` reports, to show the
   mode took) and once with `no-preference`. Emulate both explicitly: the
   machine reports `reduce` by itself while a Remote Desktop session is
   attached (K104 in `.claude/rules/probes.md`). After load call
   `window.__knotLoop({ continuous: true })` (K6-3: an idle page may stop
   ticking) and sample from the first frame where `__knotPerf().state` is
   no longer "loading":
   a. Panel toggle: click `.kp-menu` on frame 4, as `pan.mjs` does, at
      1000x800. Settle frames = the frame of the last move after the
      click (a move is |dx| or |dy| over 0.25 css px, or |ds| over 0.0005
      between frames; keep the thresholds identical in both modes).
   b. The same at the pan limit (zoom in until the range binds, as
      `pan.mjs` does), then close the panel: this is the range ease.
   c. A resize 1000x800 to 800x700 with `page.setViewport`.
   d. The load settle: the first 8 s after load, per frame step
      `hypot(dx, dy)` and `|ds|`; report the maximum and the count of
      frames over 2 css px, per mode.
   Take the whole table on unchanged code first. Today both modes glide
   (tens of frames) in a, b and c, and that is the bug.

Done check:

- With reduced motion on, cases a, b and c settle in 6 frames or fewer
  (the target is recomputed every third frame). With `no-preference`
  they are unchanged from the before table.
- Case d is the risk: a snap follows the knot's bounds without the ease's
  smoothing. If reduced mode's largest per-frame step in d is more than
  three times the eased mode's, the snap is not clearly better for
  those who asked for less motion, and the feel is Levi's call (stop rule
  3). Then keep the helpers, but snap only on a jump: a frame whose
  fit target moved by more than a threshold you read off the table (above
  the settle drift's largest recompute step, below the panel toggle's
  smallest), and ease the smaller drift as today. Re-run the table. If that
  fails too, stop and report the table.
- Unit tests for `fitEase` and `rangeRate` (reduced and not, an explicit
  0 and 1, `undefined`) pass, and `npm test` passes.

Report: the before and after tables. List every other camera motion
that still has no reduced path and which you did not change (read the
viewHoming ease of 0.15 and `camTween` / `stepCamTween` in `camera.ts`
first); Claude files them.

Then file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "With Reduce motion on, open and close the settings panel and resize the window: does the view now jump straight to its new framing, with no glide? (K1085, <sha>)"`

Close: `ledger.mjs done K1085 --commit <sha8> --what "..."` when the Done
check passes. Suggested ports: 5520-5529.

## Run C · K228, K442 and K741: a hover that clears, and two honest texts

Read first: `.claude/rules/gameplay-stars.md` (the stars, `star_rating.ts`,
the stats), `.claude/rules/gameplay-daily.md` (what `maze_stats.ts`
feeds), `docs/design/K298_hover_glow.md` ("Picking" and "Notes"),
`docs/design/K698_polish.md` (its Handoff, for K741), and
`.claude/probes/K331/glow_probe.mjs` (the probe model).

The ledger says:

> **K228** · A choice's hover stays lit after the mouse leaves the canvas
> (`src/main.ts`; seen by K145's agent, whose glow clears there).
>
> **K442** · `src/game/maze_stats.ts` STATS: the walked and fire lead lines are false under the
> real-time fire (K114 s2). After K137 s1, which edits `maze_stats.ts`.
>
> **K741** · cutRules() still says the fewest cuts when the Lead par is only an upper bound (par at
> most P) (`docs/design/K698_polish.md` Handoff)

Facts to check before editing, since two of these pointers are old.
K228's code is no longer in `src/main.ts`: the pointer handlers are in
`src/app/input_pointer.ts` (`clearGlow` near line 491, the `pointerleave`
listener near line 884, `scene.fabric.setHover(...)` calls near 758, 795
and 842). K442's "After K137 s1" is long past. K741 is the exact text in
`cutRules()` (`src/game/star_rating.ts`, near line 78), its only callers
are `starExplanation` in the same file and `test/game/star_rating.test.ts`
near line 230.

Tasks:

1. K228. Today the `pointerleave` handler for a mouse (and no pending
   pluck) runs `clearGlow()`, which clears the glow rim, the route hover
   and the telegraph hover, but not the choice hover
   (`scene.fabric.setHover`, the renderer's `hoverEdge`). Clear it there
   too, in the `pointerleave` handler and under the same guard. Don't put
   it inside `clearGlow` unless every other call site of `clearGlow`
   wants it (read them; the probe decides).
   Probe: `.claude/probes/K228/leave.mjs`, on the model of `K331/glow_probe.mjs`
   (desktop Chrome, `?k111&am=instant&snd=none&fw=0`, wait for the load
   settle to sleep as it does, port 5530-5539): find a choice's screen
   point as that probe does, move the real mouse onto it (`page.mouse.move`),
   read `window.__knotFabricRenderer().hoverEdge` (private in TypeScript,
   readable in the page): it is 0 or more. Then dispatch a `pointerleave`
   with `pointerType: "mouse"` on the canvas from `page.evaluate` (as
   `K198/pan.mjs` dispatches its dblclick) and read it again on the next
   frame: it must be -1. Before the fix it stays on the choice (record
   that). Also check the guard: with a pluck pending (button held), a
   `pointerleave` leaves `hoverEdge` as today.
2. K442. `fireLead.line` and `walked.line` in the `STATS` table of
   `src/game/maze_stats.ts` (near lines 190 and 205) say "The fire spreads
   only as you walk, backing up included" and "The fire's clock runs on it,
   not on time". Both are true only for the turn clock and false for the
   real-time one (`fireClock`, `FireClock = "turn" | "realtime"` in
   `src/game/fire.ts`; `src/game/fire_clock.ts` header). The table is
   static and `explainedStats` has no clock, so give the two lines
   wording that is true under both: plain words, no param names, no
   claim that the clock runs on walking only or on time only, and no
   other rewrite of the line. Search `src/` for the same two claims in any
   other copy (the fire-clock panel row's help, banners) and fix those in
   the same commit; list them in the report. Test in
   `test/game/maze_stats.test.ts`: the old phrases are gone from the table
   and from `explainedStats` output, and the lines still name what they
   measure.
3. K741. `cutRules(upper = false)`: when `upper` is true, the first line
   no longer says "the fewest cuts that lead the walker out" (that is
   false when par is only an upper bound); it says three stars need
   par or fewer cuts, and that par here is only an upper bound. The
   exact-par wording stays byte for byte as today. `starExplanation`
   passes the rating's `cuts.upper`. Stars don't change (`rateCuts` keeps
   `cuts <= par ? 3 : ...`). Tests in `test/game/star_rating.test.ts`: the
   exact-par lines are pinned literally, the upper-bound case never says
   "fewest", and `starExplanation` for an upper-bound rating uses the new
   lines.

Done check:

- K228: the probe's before and after output (the choice stays lit,
  then clears; the held-button guard unchanged).
- K442 and K741: the unit tests above pass. They are text, so the
  wording is Levi's to polish later; the check is that nothing false is
  left and nothing else moved.
- No pinned test value changes (`byte_identity`, the golden dailies,
  `param_codec`). `npm test` passes.

Report: the old and new text of each changed line, the other copies of the
K442 claims you found, and the probe output.

Close: `ledger.mjs done K228 ...`, `K442`, `K741`, each with its commit
when its own check passes (they may be three commits). Suggested ports:
5530-5539.

## Run D · K1084 (and K1086, report only): cache the hashed assets

Read first: `docs/design/K412_preload_network.md` (all of it: its "Method"
and "Reading" hold this run), the header of
`.claude/probes/K412/k412_run.mjs`, and `.github/workflows/deploy.yml`.

The ledger says:

> **K1084** · K412: hashed assets are max-age=0 on Pages: pages.dev revalidates the worker fetch (304, 300 B), and
> levi.dev's proxy edge REVALIDATEs the chunk (fresh hello 941 ms vs 466 direct; that this is the cause is inferred).
> Long max-age on /assets/* (_headers), then re-run `.claude/probes/K412/k412_run.mjs` on both. `K412_preload_network.md`.
>
> **K1086** · K412 probe: each warm profile's first reload started main 3.5 s (levi.dev) / 3.2 s (pages.dev) late
> vs 68-216 ms later; all before main, both origins, no service worker. Record navigation timing on it to split
> old-page teardown from a first cache read (`.claude/probes/K412/`; full text `docs/ledger_notes.md`).

Exception: this run adds `public/_headers`, a change to what the deployed
site answers with. A push of it deploys (only ledger, docs, `.claude/`,
README and LICENSE pushes don't), so the Cloudflare workflow runs `npm
test` first and a red suite leaves the old deployment live. No `wrangler`
command is run by hand (`CLAUDE.md`). The run only reads the production
sites (GET and HEAD).

Tasks:

1. Check what the rule may cover. `npm run build`, then list `dist/assets`:
   every file there must carry a content hash in its name (for example
   `physics_worker-DIhbM4cq.js`; `vite.config.ts` uses Vite's default
   hashed names with base "./"). If one doesn't, don't use `/assets/*`:
   list the hashed patterns, or stop and report which file is unhashed.
   `dist/index.html`, `credits.html` and anything else at the root must
   not get the long cache.
2. Add `public/_headers` (Vite copies `public/` to `dist/`; Cloudflare
   Pages reads `_headers` at the output root):

   ```
   /assets/*
     Cache-Control: public, max-age=31536000, immutable
   ```

   Commit with `npm test` green, `git pull --ff-only` first, push to
   master, and watch the deploy:
   `gh run list --workflow deploy.yml --commit $(git rev-parse HEAD)`,
   then `gh run watch <id> --exit-status`.
3. Check the answer, with a hashed chunk named in the deployed page's own
   HTML (`curl.exe -s https://knotmaze.pages.dev/`), not from an older
   build: `curl.exe -sI https://knotmaze.pages.dev/assets/<that file>`
   must show `cache-control: public, max-age=31536000, immutable`; the
   page itself (`curl.exe -sI https://knotmaze.pages.dev/`) must still be
   `max-age=0, must-revalidate`. Also `curl.exe -sI
   https://levi.dev/knotmaze/assets/<that file>` and record its
   `cache-control` (the proxy serves non-HTML with its own 4-hour cache;
   it may keep doing so).
4. Re-run the measurement on both origins, after the deploy is live.
   Before it: copy `.claude/probes/K412/k412_results.jsonl` to
   `k412_results_before_K1084.jsonl` (the runner truncates the file when it
   starts). Take the perf lock (it is a wall-clock measurement over the real
   network): `pwsh -File .claude/probes/K441/lock_take_fast.ps1 -Owner K1091 -What "K1084 k412 rerun"`.
   Run `node .claude/probes/K412/k412_run.mjs`, then release it
   (`lock_release_exact.ps1 -Owner K1091`). It is desktop Chrome and
   opens windows off to the side. For K1086 (report only), first add the
   page's navigation timing for the load to each record the runner writes
   (the `performance.getEntriesByType("navigation")[0]` fields:
   `startTime`, `fetchStart`, `domainLookupStart` and `End`,
   `connectStart` and `End`, `requestStart`, `responseStart`, `responseEnd`,
   `unloadEventStart` and `End`, `domInteractive`, plus `performance.timeOrigin`):
   a few lines inside the probe, nothing in the app.
5. Append `## After K1084 (<date>, <sha>)` to
   `docs/design/K412_preload_network.md`, with the same two tables as the
   existing sections (copy their header rows) from the new results, and
   two sentences: what moved on pages.dev (the worker fetch's
   `transferSize` and status, warm reloads, the fresh hello) and what did
   or didn't on levi.dev. Docs-only commit: no deploy.

Done check:

- The `curl.exe` outputs of task 3 are in the commit message.
- On pages.dev the worker chunk is no longer revalidated: its fetch is
  `transferSize` 0 (served from the cache) in the new tables, as the
  levi.dev numbers already were, and warm reloads move nothing. If the
  numbers don't move, stop (K1050 stop rule 4), leave the file in place,
  and report the headers and the table.
- levi.dev: if its fresh hello still sits near 940 ms against about 470
  direct, the cause is in the proxy (`functions/knotmaze/[[path]].js` in
  the levi.dev repo, which this run doesn't edit): file it with
  `ledger.mjs add --section Next --text "..."` as a levi.dev proxy
  question, with the two numbers and the doc's pointer.
- K1086: say whether the late first reload repeated and which phase of
  the navigation timing holds the time (old page unloading, waiting for
  the response, or the first cache read). Leave K1086 open either way
  and put the numbers in your report; Claude files them.
- `npm test` passes (before the push).

Report: the headers, the before and after tables in one line each, and
the K1086 finding.

Close: `ledger.mjs done K1084 --commit <sha8> --what "..."` with the
commit that added `_headers`, once the measurement shows the effect.

## Run E · K1063 and K593: two small tooling residuals

Read first: the headers of `scripts/run_node.mjs` and `scripts/preview.ps1`.
This run is small; if the time cap comes first, K1063 alone is a fine
result. No rules file applies.

The ledger says:

> **K1063** · `scripts/run_node.mjs` still opens Vite's WebSocket server, so parallel runs print 'WebSocket
> server error: Port 24678' (harmless); `server.ws: false` should stop it (K1061, 011274f9).
>
> **K593** · `scripts/preview.ps1` fails in an agent worktree that has no `node_modules` junction
> (K573's run). Make it find or make the junction, or fail with that message.

Tasks:

1. K1063. In `scripts/run_node.mjs` the Vite server is created with
   `server: { middlewareMode: true, hmr: false, watch: null }`. Add
   `ws: false` (the repo is on Vite 8.3.5; check `node_modules/vite` and
   its types accept `server.ws: false`). Check: run two probes at once
   that go through the runner (for example `node scripts/run_node.mjs
   scripts/<a probe entry that runs in a second or two>.ts` twice in
   parallel from two shells; take an entry from `scripts/` or
   `.claude/probes/`, one that exits by itself) and confirm neither prints
   "WebSocket server error: Port 24678". Run once before the change to
   see the line, then after.
2. K593. `scripts/preview.ps1` makes a `node_modules` junction only in its
   `-Ref` branch (for the throwaway worktree it builds in). Run from a
   worktree of the repo that has no `node_modules` of its own, the plain
   `-Port` path dies with an unclear error. Before the build, if the
   checkout has no `node_modules`, look for the main checkout's (the
   parent of `git rev-parse --git-common-dir`) and make a directory
   junction to it, or, if there is none, stop with a message that names
   what is missing and how to fix it (`npm ci`). Remove a junction only
   by deleting the junction itself (`(Get-Item <path> -Force).Delete()`,
   as the script already does near line 60), never `Remove-Item -Recurse`
   through it, and don't leave one behind that this run didn't make.
   Check in a detached worktree outside the repo
   (`git worktree add --detach $env:TEMP\k593-check HEAD`, not under
   `.claude/worktrees/`, which is off limits): run `pwsh scripts/preview.ps1
   -BuildOnly` there (the script's switch; read the param block) before
   and after, and remove the worktree at the end after unlinking its
   junction.

Done check:

- K1063: the before run prints the WebSocket error line, the after run
  doesn't, and the probe's own output is unchanged.
- K593: the before run fails without a clear message, the after run
  builds (or prints the new message when no main checkout is found).
  `npm test` passes.

Report: the commands and the output lines, one line per task.

Close: `ledger.mjs done K1063 ...` and `ledger.mjs done K593 ...`, each with
its commit. Scripts-only pushes deploy nothing visible (the workflow
still runs `npm test` and a build).

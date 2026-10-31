# K1079: Muse batch 4

Claude starts these runs through Paseo, one run at a time, after batch
3 (`docs/design/K1062_muse_batch3.md`). Each run is a fresh Muse agent
that reads this brief, does its run's tasks, and stops. Claude reviews
each run on master afterwards and closes K1079.

Every task here is decided by a test, a probe, an inventory diff or a
measurement table. None changes physics, junctions, the cursive, or how
the threads are drawn. Run A changes how touch picks a thread, as Levi
asked on 2026-10-14 (K331). Run B changes only where the camera puts a
text scene. The runs are in order of value to Levi.

## How to work

The process in `docs/design/K1050_muse_week.md` applies unchanged. Read
its sections "Each task, start to finish", "When a task stops", "Rules",
"Off limits" and "Reports" before anything else. Where they say K1050,
read K1079 (`ledger.mjs handle K1079 ...`). Batch 3's rules hold too:

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
4. Update only K1079's handle
   (`ledger.mjs handle K1079 --last-commit <sha> --next "..."`). Don't
   close it or edit its text: Claude closes it.
5. No subagents: Paseo crashes when Muse spawns them.
6. When a run allows something that K1050's Rules or Off limits forbid,
   it says so in a line starting "Exception". The exception covers that
   run only.
7. Every server and probe uses a port in 5500-5599. Old probes this
   batch reuses may name other ports: change them. Start servers in the
   background and stop them when the run ends.

Muse doesn't load `.claude/rules/` by itself. Each run names the rules
files to read before changing its area.

Timing measurements take the perf lock first: `$env:TEMP\claude-perf.lock`,
one line (owner, start time, what).
`.claude/probes/K441/lock_take_fast.ps1` and `lock_release_exact.ps1`
take and release it. If another owner holds it and it is under 30
minutes old, wait inside one command. Delete it when you're done.

A follow-up for Levi goes to `Waiting on Levi` only when it is about
what Levi sees or feels, in plain words with no param or function names.
Where a run gives that item's text, use it as written.

End the run with a short report: one line per task with its status and
commit.

## Run A · K331 and K330: touch picks in pixels, and the glow on a touch press

Read first: `docs/design/K298_hover_glow.md` (all of it: "Picking" and
"Notes" hold this run), the comment above `pickRadius` in
`src/app/input_pointer.ts`, `.claude/rules/gameplay-links.md` (params
and links), `.claude/rules/gameplay-daily.md` (the daily-exempt
preferences), `.claude/rules/gameplay-panel.md` (rows and their help).

Levi asked on 2026-10-14 for touch to get the mouse's pick margins
(K331). Every pick reads `pickRadius(pointerType, choice)`
(`src/app/input_pointer.ts`): hover, the tap on a choice
(`fabric.edgeAt`), the thread cursor, and the press that plucks, tugs or
drags. For a mouse or pen it returns half the drawn width plus
`pickMargin` CSS px (4), times `pickChoiceRatio` (1.5) on a choice,
converted through the zoom. For touch it returns world radii,
`max(0.9, 1.6 x threadWidth)` on a choice and `GRAB_RADIUS` (0.7)
elsewhere, which grow on screen under a pinch zoom.

1. K331: touch takes the mouse's form with its own margin, a new param
   `touchPickMargin`, default 4 px, of the same kind as `pickMargin`.
   Follow `pickMargin` through `src/ui/url_state.ts`, `param_codec.ts`
   (append to `CODEC_PARAMS`, never reorder), `daily_link.ts` (if
   `pickMargin` is a daily-exempt preference there, so is this) and the
   panel, where its row sits beside `pickMargin`'s with a word label and
   help text. `pickChoiceRatio` applies to touch as it does to the
   mouse. The mouse and pen don't change, nor does `fabric.runDistance`
   (the doc's Notes). Update the comment above `pickRadius`.
2. K330: a touch press on a choice lights the hover glow on that choice
   at once: the `pendingTap` path sets the glow run that the mouse's
   hover would set. A release, a cancel or a move off the choice clears
   it as it does today.

Exception: `test/ui/param_codec.test.ts`'s key-order pin grows by the
appended key, and `test/ui/daily_link.test.ts`'s exempt-set list by
`touchPickMargin` if step 1 puts it there. Nothing else in a pin
changes: if the golden dailies or `byte_identity` move, stop (K1050 stop
rule 1) and report which.

Done check:

- Unit tests: a touch at a fixed pixel distance past a thread's edge
  picks the same thing at 1x, 2x and 4x zoom, for a choice and for a
  plain run. Today's radii fail this test; say so in the commit.
- From the doc's Notes, today's touch zones at the phone's default zoom
  reach 3.9 px past the edge on a plain run and 5.7 px on a choice. Work
  out the new zones at that zoom with the 4 px default and put the
  before/after table in the commit. Each is within 2 px of today's; if
  one isn't, stop (K1050 "When a task stops") and report the table.
- A page probe in desktop Chrome with touch emulation (CDP
  `Input.dispatchTouchEvent`, a seed link with `&snd=none`, port 55xx):
  a touch press on a choice sets the glow at once, and the release
  clears it. Read the glow through the probe hooks
  (`src/app/probe_hooks.ts`), or crop a screenshot if no hook shows it.
- `npm test` passes.

Then file this for Levi, as written:
`ledger.mjs add --section "Waiting on Levi" --text "On the phone, zoom in and out and tap threads and junction choices: do the tap targets feel right? They now stay the same finger size at every zoom (K331, <sha>)."`

## Run B · K549: a text scene fits beside the open panel

Read first: `.claude/rules/gameplay-camera.md` (the fit, and K198's view
clamp in `src/ui/view_clamp.ts`), `.claude/rules/probes.md`.

A text scene (K115 stage 2: a word drawn as a maze, `src/app/scene.ts`
around line 355) is fit to the whole viewport, so with the panel open a
wide word's exit side sits under the panel. A maze's fit clears the
open panel (K198). K549 names two fixes: fit text scenes against the
panel-cleared range like mazes, or close the panel for text scenes.
This run builds the first, the rule mazes already follow. Closing the
panel would be new behavior, which is Levi's call, so don't.

Exception to K1050's "Cursive and text" off-limits: this run may change
the camera's fit for a text scene. Nothing in the text's generation,
the cursive or the words' geometry changes, and no file under
`src/core/` does.

Make a wide text scene with the Text & emblem rows (K814); their link
keys are `SHAPE_INJECTION_PARAMS` in `src/core/shape_injection.ts`.

Done check:

- A unit test beside K198's (`test/ui/view_clamp.test.ts`, or the
  fit's own test): a wide text scene with the panel open fits inside the
  panel-cleared range.
- A page probe at a wide word with the panel open, at 1280x800 and at a
  phone-sized 412x915: the start and exit markers' screen rects don't
  overlap the panel's rect. Before: the exit overlaps. After: neither
  does. Crops of both go in `.claude/probes/K549/`.
- Mazes fit as before (their `view_clamp` tests unchanged), and
  `npm test` passes.

## Run C · K486: touch help for the panel's buttons

Read first: `.claude/rules/gameplay-panel.md` (its ROW HELP and "THE (i)
AND THE LABEL AS A BUTTON" entries, K467), `docs/design/K467.md`, and
K467's commits `1058e8cf..2c066d4b`.

K467 shows a row's help text on touch. The panel's buttons don't have
it yet: Reset path, Replay settle, Reset to defaults, the seed row, the
dice, Daily, stats (K486's list), and the two end-effect previews added
since (Preview win effect, Preview loss effect). Give each of them
K467's mechanism. A button with no help text yet gets one line, in the
style of the rows' help.

Done check:

- `scripts/panel_inventory.ts` before and after (its header gives the
  command; write both outputs to `.claude/probes/K486/`): nothing
  changes except the buttons' help texts, each one listed in the commit.
- A touch-emulated page probe (CDP, port 55xx): each of the nine buttons
  shows its help text the way a row does under K467, and a plain tap
  still does what the button does.
- `npm test` passes.

## Run D · K1077: the real-time stand's unexplained cost

Read first: `docs/design/K441_fire_frame.md` ("Owed rerun
(2026-10-30)", near the end), `.claude/probes/K441/results.md` ("Owed":
the `prof5` plan), `.claude/rules/probes.md`,
`.claude/rules/render-loop.md`.

Batch 3's run E (7bf9f07f) found the real-time stand's tick 4.24 ms
(1x CPU) and 13.16 ms (4x CPU throttle) over the turn stand, both
asleep. The fire chain explains about 0.5 ms of it (`setExplore` 0.42).
This run attributes the rest. It measures only: no fix.

1. Build unminified into `.claude/probes/K1077/build`
   (`npx vite build --minify false --outDir .claude/probes/K1077/build`;
   never build into `dist`) and serve it on a 55xx port.
2. Copy `run_k441.ps1` and its helpers to `.claude/probes/K1077/`, with
   their ports changed to 55xx. A plan item is
   `label:clock:thr:profile` (`thr` the CPU throttle, profile 1 a CPU
   profile on the unminified build). Under the perf lock, run
   `prof5:realtime:1:1` as the Owed section writes it, then
   `prof6:turn:1:1`, `prof7:realtime:4:1` and `prof8:turn:4:1`. Keep
   the asleep gate batch 3 added to `k441_page.mjs`: discard a window
   that woke.
3. From the profiles (`k441_prof.mjs`), a table per throttle: the
   functions whose self time per tick differs most between the stands,
   until the rows account for at least 80% of the gap. Each row names
   the code (file:line) that runs on the real-time clock only, and its
   caller chain.
4. Append the tables and their reading to
   `docs/design/K441_fire_frame.md` under a heading "K1077".

Done check: the tables account for at least 80% of the 4.24 / 13.16 ms
gap, or the run says what it couldn't attribute and why. K1077 closes
either way. Each cost worth fixing becomes a Next item
(`ledger.mjs add`) carrying its measured ms.

## Run E · K412: the worker preload on the real network

Read first: `.claude/rules/physics-worker.md` (the worker chunk's
preload; since K1055, c70db4fa, an inline head script modulepreloads
the chunk unless `phw=0`), `.claude/rules/probes.md`.

K7's worker-chunk preload was measured on localhost only. K412 asked
for a check through levi.dev's proxy on the phone's pass. Whether the
cache serves the worker's own fetch is the same question in desktop
Chrome, so this batch answers it there (no phone work).

1. Copy `.claude/probes/K7/stage7/k7_frames.mjs` and the
   `phone_lib.mjs` it imports to `.claude/probes/K412/`. Run it in
   desktop mode (no `--phone`) against
   `https://levi.dev/knotmaze/?<seed>&snd=none` (a seed link, not the
   bare URL, which is today's daily): five loads, each in a fresh Chrome
   profile, then five reloads in one warm profile. It measures timing,
   so take the perf lock.
2. Per load, record the `physics_worker` resource entries k7_frames
   collects (start, end, `transferSize`, initiator; the preload and the
   worker's own fetch make two, and a `transferSize` of 0 on the
   worker's fetch means the cache served it), the worker's hello time,
   and the chunk's response headers (`cache-control`, `cf-cache-status`,
   `age`).
3. The same against `https://knotmaze.pages.dev/?<seed>&snd=none`.

Done check: `docs/design/K412_preload_network.md` (new) holds the two
tables and answers in one line: on a fresh load through the proxy, is
the worker chunk downloaded once, with the worker's own fetch served
from the cache? If not, it names the header or request that breaks it,
and the fix becomes a Next item. K412 closes either way.

# K1062: Muse batch 3

Claude starts these runs through Paseo, one run at a time, after batch
2's run F (`docs/design/K1053_muse_batch2.md`). Each run is a fresh Muse
agent that reads this brief, does its run's tasks, and stops. Claude
reviews each run on master afterwards and closes K1062.

Every task here is decided by a test, a pin, an inventory diff or a
measurement table. None changes physics, junctions, cursive, or how
anything looks. Run G changes how a real-time lure plays, to the rule the
turn clock already follows; Claude queues it first. The other runs are in order of value to Levi.

## How to work

The process in `docs/design/K1050_muse_week.md` applies unchanged. Read
its sections "Each task, start to finish", "When a task stops", "Rules",
"Off limits" and "Reports" before anything else. Where they say K1050,
read K1062 (`ledger.mjs handle K1062 ...`). Five more rules, from
the review of batch 1:

1. Close an item only when its Done check below passes. A task that
   stops keeps its item open. Its commit says `Status: partial`, the item
   says which stop rule fired and what is left, and the remainder is
   filed with `ledger.mjs add`.
2. Do the task as written. If the brief looks wrong (a file, library or
   function it names isn't there), stop that task and quote the brief's
   line in your report. Don't substitute other work. Batch 1 closed K783
   and K728 on measurements nobody asked for. Its report also said the
   K810 libraries the brief named didn't exist, when the brief named the
   same three it ran (Fuse.js, uFuzzy, fuzzysort).
3. A `LEDGER:` commit holds `LEDGER.md` alone. A code fix goes in a work
   commit.
4. Update only K1062's handle
   (`ledger.mjs handle K1062 --last-commit <sha> --next "..."`). Don't
   close it or edit its text: Claude closes it.
5. No subagents: Paseo crashes when Muse spawns them.

Two more for this batch:

6. When a run allows something that K1050's Rules or Off limits forbid,
   it says so in a line starting "Exception". The exception covers that
   run only.
7. Every server and probe in this batch uses a port in 5500-5599. The
   old probes this batch reuses name other ports (5397, 5481/5482,
   5981/5983), so change them. Start servers in the background and stop
   them when the run ends.

Muse doesn't load `.claude/rules/` by itself. Each task names the rules
files to read before changing its area.

Timing measurements take the perf lock first: `$env:TEMP\claude-perf.lock`,
one line (owner, start time, what). If another owner holds it and it is
under 30 minutes old, wait. Delete it when you're done.

End the run with a short report: one line per task with its status and
commit.

## Run A · K321: the credits page

Read first: `.claude/rules/notices.md`, then `docs/design/K321_credits.md`
("Levi's words", "The stage" and "Verification"). Skip that doc's
"Setup" and "Process": they were written for a worktree agent, and this
run works on master.

Levi approved this page on 2026-10-14. The licenses page becomes the
credits page, with his name and the copyright line first. Where it is
today:

- `notices/vite_plugin.ts`:
  - `export const NOTICES_FILE = "licenses.html";` (line 28), which
    names the emitted file (line 106) and the dev placeholder's route
    (line 113);
  - the chunk banner (line 29) and the placeholder's note (line 125);
  - the header comments (lines 6 and 12).
- `notices/page.ts`:
  - `<title>Credits and licenses · Knotmaze</title>` (line 257) and
    `<h1>Credits and licenses</h1>` (263);
  - the jump links (lines 243-245);
  - `<h2 id="software">Open-source software</h2>` (266);
  - the header comment (line 1).
- `notices/credits.ts`:
  - `export interface Credit` (line 148) and `CREDITS` (line 180);
  - the comment naming `dist/licenses.html` (line 2).
- `src/ui/tweakpane_panel.ts`:
  - the panel's link, lines 328-352: the comment naming `licenses.html`
    (330), `licenses.className = "kp-licenses"` (345), the `href` ending
    `licenses.html` (346), its `title`, and `textContent = "Licenses"`
    (350);
  - its CSS, lines 461-463 (`.kp-credit a.kp-licenses`).
  - The design doc's "about lines 257-279" is stale.
- `src/util/det_math.ts` line 27: a comment naming `licenses.html`.
- `vite.config.ts` line 85: a comment naming `licenses.html`.
- `test/notices/notices.test.ts`: 47 tests. The one at line 677 checks the
  `/licenses.html` placeholder.
- `CLAUDE.md` line 133 names it too. Leave it: K1050's Rules keep
  CLAUDE.md for Claude, who updates it after this run.

Exception: you may edit `.claude/rules/notices.md`, its WHAT SHIPS and
URLS entries only.

Exception: the expected values that the rename and the new order move in
`test/notices/notices.test.ts` may change. Name each one in the commit.

1. Do the design doc's steps 1 to 4 under "The stage", as written:
   1. Rename the page to `credits.html` everywhere listed above. The link
      reads "Credits", with a title to match. Rename its class to
      `kp-credits-link` (not `kp-credits`, one letter from the
      `.kp-credit` row it sits in), and its CSS with it.
   2. Put the page in the new order.
   3. Add the four tests.
   4. Update the lore.
2. Check the Claude Code link resolves:
   `Invoke-WebRequest https://claude.com/claude-code -Method Head`
   returns 200 after redirects. If it doesn't, stop and report. Don't pick
   another URL.
3. The Art and icons and the Music and sound sections start empty, unless
   an existing `CREDITS` entry is really art or music. If you move one,
   name it in the commit and the report.
4. Build and look:
   1. Run `pwsh scripts/preview.ps1 -Root .claude\probes\K321\build -BuildOnly`
      and list the folder it prints.
   2. Serve the working tree's build with `pwsh scripts/preview.ps1 -Port 5520`.
   3. Take the design doc's four screenshots into `.claude/probes/K321/`:
      1400x900 and 411x753, light and dark, with Chrome on its own
      profile.
   4. In that Chrome, on the served build, read the panel link's address
      (`document.querySelector("a.kp-credits-link").href`) and fetch it
      with `Invoke-WebRequest`. It must return the page, containing
      "Created by Levi Lindsey". This is the design doc's "The panel's
      link opens the page from a production build".

   The screenshots are for Claude's review. They are not the Done check.

- **Done:** all of these hold, then close K321.
  - `npm test` passes with the four new tests (the commit gives the test
    count before and after).
  - The built folder has `credits.html` and no `licenses.html`.
  - `git grep -n -e 'licenses\.html' -e 'kp-licenses' -- src notices vite.config.ts`
    finds nothing. (Tests may still name the old file, to check it is
    gone.)
  - Step 4.4's link check passes.
  - The deploy run is green.
  - After the deploy, both `https://knotmaze.pages.dev/credits.html` and
    `https://levi.dev/knotmaze/credits.html` return a page containing
    "Created by Levi Lindsey". `Invoke-WebRequest` follows Pages' 308
    from `/credits.html` to `/credits` (notices.md, URLS).

## Run B · K658: K137's page gaps, checked (no fixes)

Read first: `.claude/rules/probes.md`,
`.claude/rules/gameplay-mechanisms.md`, `.claude/rules/gameplay-minotaur.md`.

K137's rules are fragile runs (`fg`) and par (`pa`, `par`). They passed
every page check in `.claude/probes/K137/page/results.md`, but its "Not
run" list left gaps:

- moves went through the `__knotTurnMove` hook, not real clicks (only
  case 6 clicked the maze);
- no touch taps;
- no real click while stranded;
- no real-time clock;
- no panel rows.

This run fills those gaps with the same probe. It is checks only:
change nothing under `src/` or `test/`. A failure is a finding, filed
for Claude.

1. Copy `.claude/probes/K137/page/k137_page.mjs` to `.claude/probes/K658/`.
   - Change its `BASE` (`http://127.0.0.1:5397`, line 24) to
     `http://127.0.0.1:5530`, and serve master's build there with
     `pwsh scripts/preview.ps1 -Port 5530`.
   - Check that the page still has the hooks `__knotTurnMove`,
     `__knotFabric` and `__knotFabricRenderer` (`src/app/probe_hooks.ts`).
   - Check that wrapping the renderer's `syncBroken`
     (`src/render/fabric_maze_renderer.ts`, line 2778) still captures the
     controller as `window.__k137c`.
   - If any of these is missing, stop and report.
2. Run the old cases once, as they are, on desktop with seed 7
   (`node .claude\probes\K658\k137_page.mjs <case> desktop 7`): `c1fog`,
   `c1plain`, `c2`, `c3`, `c4`, `c5` and `c6`. They must pass as they
   did. A case that fails now is the first finding.
3. Add these cases. Each check reads the controller and the HUD, never a
   picture.
   1. `c1click`: `c1plain` (`&fg=crack`) with every move made by a real
      mouse click, on desktop. Reuse case 6's click code (`case6()`,
      lines 995 and 1003 of the probe).
   2. `c1touch`: the same on the phone viewport (411x753, dsf 2,
      `isMobile` and `hasTouch` true), tapping with
      `page.touchscreen.tap`. Give it its own browser (probes.md, K73's
      GOTCHA). This is Chrome emulation on this machine; never the phone.
   3. `c1stranded`: after case 1 strands, a real click on a choice moves
      nothing and shows the "Stranded" banner again. Case 6 checks the
      same for the par loss.
   4. `c1rt` and `c2rt`: `c1plain` and `c2` with `&clk=realtime` (the
      probe's fourth argument). Before the first move, wait for
      `__knotPerf().state` to leave "loading" and call
      `__knotLoop({continuous: true})` (probes.md, K137 stage 3b's
      GOTCHA). Every check must pass as it does on turns. One that fails
      only here is a finding, recorded with its values.
   5. `cpanel`: open the panel and the rows' folder with real clicks, then
      set the "Fragile runs" row to crack and the "Par" row to strict.
      Those rows are native `<select>` elements, which a click cannot
      drive, so use `page.select` on each. Check that `__knotParams()`
      reads `fragile: "crack"` and `parMode: "strict"`, and that the
      captured controller reports both rules, read the way the old cases
      read them. The address bar holds one token, so read the params, not
      the link.
   6. `cchase`: `&mt=hunter&fg=crack`, on turns. Walk with real clicks
      until you are stranded or caught, whichever comes first. Record
      what the controller, the HUD and the banner report then. A console
      error is a FAIL, and so is a HUD or banner that disagrees with the
      controller (a "Caught" banner on a stranded controller, say). The
      rest is recorded for Claude.
4. Write the results to `docs/design/K658_page_checks.md` in K137's
   format: a table per case, PASS or FAIL per check, and the console
   errors and warnings counted. Traces go in `.claude/probes/K658/out/`.
5. File each FAIL as its own item with `ledger.mjs add`, pointing at its
   row in the doc.

- **Done:** the doc has a row for every check of the seven old cases and
  the six new ones, each PASS or FAIL from the script's state, and every
  FAIL has its own ledger item. Then close K658, and file the one gap left
  with `ledger.mjs add`: "K137's sounds (the snap pluck, the strand
  glissando) are unchecked; they need an ear".

## Run C · K326 stage A: a maze golden beside the knot golden

Read first: `.claude/rules/physics-settle.md`,
`.claude/rules/physics-worker.md`, `.claude/rules/physics-fabric.md`, and
`docs/design/K323_game_mode.md` section 4.3.

Exception: K1050's off-limits list names K326 (dropping knot mode). This
run does only its stage A, which adds a test and changes no file under
`src/`. Deleting knot mode stays off limits.

`test/physics/byte_identity.test.ts` guards knot mode only:

- `run(seed, steps)` builds `generateLatticeKnotwork` at gridSize 6;
- it steps a `ParticleSystem` 300 frames at 1/60;
- it fingerprints `positions` every 100 frames with `fingerprint()`;
- the snapshot is `test/physics/__snapshots__/byte_identity.test.ts.snap`.

Nothing pins the maze's physics. K323 section 4.3 asks for a maze golden
frozen beside the knot one before knot mode goes (K326 stage B): built
"through `buildSceneGraph` (a default design and a fat one)", with the
same fingerprint method.

1. In `byte_identity.test.ts`, add `describe("maze byte identity (golden
   guard)", ...)` with the knot block's two tests: deterministic across
   two runs, and matches the snapshot. For each design:
   1. Build it with `fabricScene()` and `fabricGraph()` from
      `test/physics/fabric_scene.ts` (they run `parseParams` and
      `buildSceneGraph`).
   2. Make `new ParticleSystem(graph)` and call `ps.step(1 / 60, tuning)`
      300 times, with the `tuning` that `fabricScene` returns
      (temperature 0). `test/physics/emblem_physics.test.ts` (lines 18
      and 53) steps a maze the same way.
   3. Fingerprint with the file's `fingerprint()` every 100 frames.

   Step `ps.step` directly. A physics host's budgeted frame depends on
   wall-clock time (K147), so it cannot be pinned.
2. Use two designs:
   - the default: `?7&gs=8`, the K7 tests' scene (563 particles and 71
     crossings, per `fabric_scene.ts`);
   - the fat one: `USER_RECT_LINK` from
     `test/physics/sleep.regression.test.ts` (lines 117-120), copied
     whole into the new test (it is not exported).
3. Above the block, write a comment saying:
   - it pins the maze's physics as a change detector;
   - a change to a default or to generation moves it, because links read
     today's defaults (K132);
   - after such a change, re-freeze it with
     `npx vitest run test/physics/byte_identity.test.ts -u` and name the
     move in the commit (CLAUDE.md, "Pre-launch: no back-compat");
   - the knot golden goes in K326 stage B.
4. Run `npx vitest run test/physics/byte_identity.test.ts` once to write
   the new snapshot entries, then again: the second run passes and writes
   nothing. Report the new tests' time. If they take over 10 s together,
   lower the fat design's `gs` from 12 to 8 and say so in the commit.

- **Done:** all of these hold.
  - The second run passes.
  - `git diff test/physics/__snapshots__/byte_identity.test.ts.snap` only
    adds lines; the knot entries are untouched.
  - `git status` shows no other changed file.
  - `npm test` passes, and the deploy's CI run is green.

  If CI fails on the new golden while it passes here, `git revert` the
  commit, push, and report it: the maze golden would then not be stable
  across machines, and Claude needs to know.

  K326 stays open for stages B and C. Name stage A's commit in your
  report; Claude updates the item.

## Run D · K814: the Text & emblem rows from SHAPE_INJECTION_PARAMS

Read first: `.claude/rules/gameplay-panel.md`,
`.claude/rules/gameplay-links.md`, `.claude/rules/generation-shapes.md`.

This run uses the runner that batch 2's run E fixed (K1061, `011274f9`).
Check first that this writes the file:
`node scripts/run_node.mjs --config scripts/panel_inventory.vite.config.mjs scripts/panel_inventory.ts .claude/probes/K814/check.md`.
If it doesn't, skip this run and report.

`src/core/shape_injection.ts` holds `SHAPE_INJECTION_PARAMS` (line 94),
one descriptor per param, with `key`, `label`, `tip`, `options`,
`codec`, `folder`, `daily` and `scene`. The panel still writes the "Text
& emblem" rows by hand, in `src/ui/tweakpane_panel.ts` from
`const fText = folder("Text & emblem", false, fDesign);` (line 1036).
Those are the `text`, `cartouche`, `emblem`, `cartoucheShape` and
`penReverse` rows, with labels, tips and option lists copied from the
descriptors. K822 grouped the rows; building them from the descriptors
is what's left (`docs/ledger_notes.md`, K814).

The panel inventory records no tips today, so step 1 adds them before
anything moves.

1. Add a "Tip" column to the rows table in `scripts/panel_inventory.ts`:
   the binding's `api.element.title`. `row()` in `tweakpane_panel.ts`
   (line 789) sets it, and the stub (`scripts/panel_inventory_stub.ts`)
   stores it. Commit it on its own: `K814: the panel inventory records
   each row's tip`. Don't regenerate `docs/design/K339_inventory.md`.
2. Write the before inventory:
   `node scripts/run_node.mjs --config scripts/panel_inventory.vite.config.mjs scripts/panel_inventory.ts .claude/probes/K814/before.md`.
3. In `tweakpane_panel.ts`, build the five rows from their descriptors:
   - the label from `label` and the tip from `tip`;
   - the enum options from `options`, each labelled as the panel shows it
     today (the empty choice reads "none").

   Keep each row's object, key, default (`D.<key>`), change callback
   (`regenerateWhenDone`, line 954, and the others) and order. Keep every
   row handle the panel holds, such as `cartoucheRow` (line 1042, toggled
   again at line 3420). Don't change `src/core/shape_injection.ts`:
   `test/core/shape_injection.test.ts` pins it.
4. Write `.claude/probes/K814/after.md` the same way, then diff:
   `git diff --no-index .claude/probes/K814/before.md .claude/probes/K814/after.md`.

- **Done:** all of these hold, then close K814 and file its optional
  stage 5 as an idea with `ledger.mjs add`: folding `SHAPE_FNS`
  (`src/core/shapes.ts`, line 68) into the `SHAPE_REGISTRY` entries
  (`src/core/shape_injection.ts`, line 158).
  - The diff changes no row's folder, label, key, codec, type, default,
    range, options, kind, visibility, effect or tip.
  - Only the header and the "Added" and "Read by" columns may differ, and
    the commit names each such difference.
  - `npm test` passes with no expected value changed, and the deploy run
    is green.

## Run E · K441: the owed same-state rerun

Read first: `.claude/rules/probes.md`, `.claude/rules/gameplay-fire.md`,
`.claude/rules/render-loop.md`, and `docs/design/K441_fire_frame.md` (in
its Handoff, the **Result** paragraph and the "Owed" section).

K441 measured the real-time fire's frame cost: about +0.23 ms a frame at
1x CPU and +1.85 ms at 4x, nearly all of it in `ExploreGaps.setExplore`.
But every realtime run stood on a knot that had not slept, and every turn
run on one that had. The large tick gap it saw is therefore the awake
path against the rest path, not the fire clock. The Owed section gives
the rerun.

The harness is in `.claude/probes/K441/`: `k441_page.mjs`,
`run_k441.ps1`, `k441_pool.mjs` and the lock scripts. This is measurement
only: no change under `src/`.

1. Change `k441_page.mjs`'s realtime path. Before the throttle and the
   drive:
   - wait until `__knotPerf().asleep` is true and
     `__knotPluckState().active` is empty (both hooks are in
     `src/app/probe_hooks.ts`);
   - record `asleep` at the window's start and end;
   - mark a run as discarded if it woke during its window.

   Give the turn path the same `asleep` record.
2. Serve master's build with `pwsh scripts/preview.ps1 -Port 5541`. That
   is the harness's `-BaseUrl` (it was 5981).
3. Set `$owner` in `run_k441.ps1` (line 20) to name this run, then run
   it. It takes the lock itself. Run it through `-Command`, as below:
   `pwsh <file> -Plan a,b` hands the script one string, which
   `run_k441.ps1` does not split (tested).

   ```
   pwsh -NoProfile -Command "& ./.claude/probes/K441/run_k441.ps1 -BaseUrl 'http://127.0.0.1:5541/' -Out './.claude/probes/K441/out_rerun' -Plan 'r3:realtime:1:0','r3:turn:1:0','r3:realtime:4:0','r3:turn:4:0','r4:realtime:1:0','r4:turn:1:0','r4:realtime:4:0','r4:turn:4:0'"
   ```

   The plan includes turn runs, unlike the Owed section's, because today's
   master is not the build K441 measured (`f9eb418`, per its
   `results.md`). Both clocks must be measured on the same build. The
   labels `r3` and `r4` match the pool script's file filter
   (`r\d_(turn|rt)_x\d+.json`). Skip the Owed section's `prof5` profile
   run: it needs an unminified build, and it attributes cost rather than
   testing the prediction.
4. Rerun any discarded item. Then pool:
   `node .claude\probes\K441\k441_pool.mjs .claude\probes\K441\out_rerun`.
5. Append a section "Owed rerun (<date>)" to
   `docs/design/K441_fire_frame.md` with:
   - the build's SHA;
   - the pooled table;
   - `asleep` at both ends of every kept window;
   - the realtime-minus-turn tick gap at 1x and 4x, beside the prediction
     (+0.23 ms at 1x and +1.85 ms at 4x, plus the HUD and main.ts lines).

- **Done:** the section exists, with all eight runs kept and asleep at
  both ends of every window, all taken under the perf lock. Then close
  K441: the Owed section says the rerun ends it. Whether a K441 s2 opens
  on the numbers is Claude's call; don't file it.

## Run F · K645: K140's frame A/B, cannons on and off

Read first: `.claude/rules/render-confetti.md`, `.claude/rules/probes.md`,
and the handoffs in `docs/design/K653_checks.md` (lines 175-179) and
`docs/design/K336_cannons.md` ("What's left", item 2).

K336 added the finish cannons and streamers. Its last unrun check is the
desktop frame A/B at confetti amounts 1 and 3, with the cannons on and
off. K140's harness (`.claude/probes/K140/k140_ab.mjs` and `run_ab.ps1`)
was written for master against a branch. Here, one build is compared
across links. This is measurement only.

1. Copy `k140_ab.mjs` and `run_ab.ps1` into `.claude/probes/K645/`. Leave
   K140's copies alone.
2. Serve master's build with `pwsh scripts/preview.ps1 -Port 5550`. Note
   its short SHA (`git rev-parse --short HEAD`) for the harness's stamp
   check.
3. In the copied `k140_ab.mjs`:
   1. Set `LINK` (line 29) to `?7&am=instant&ms=4`. The old `7.J` token is
      from an older codec.
   2. Open four tabs on the one base, each checked against the SHA: no
      extra keys (cannons on), `&cfa=3`, `&cfc=0`, and `&cfa=3&cfc=0`.
      `cfc` is `confettiCannons`.
   3. Run five scenarios:
      - `N`: the cannons-on tab with no burst (the control);
      - `C1` and `C3`: a burst with the cannons on, amounts 1 and 3;
      - `O1` and `O3`: a burst with `cfc=0`, amounts 1 and 3.

   `__knotConfettiBurst()` (`src/app/probe_hooks.ts` line 1241) throws
   the finish confetti at the tab's own `cfa` and `cfc`, and returns only
   whether confetti is active. `__knotConfetti()` (line 1219) counts the
   pieces alive, the cannons' among them (`cannon`).
4. Before the reps, check that the A/B can see the cannons. Throw one
   burst on the cannons-on tab and one on the `cfc=0` tab, and read
   `__knotConfetti().cannon` every 250 ms for 6 s, outside the measured
   windows (probes.md, K174's LESSON). Its peak must be above 0 with the
   cannons on and 0 with them off. If not, stop and report.
5. In the copied `run_ab.ps1`:
   - pass the one base, `http://127.0.0.1:5550/`, in place of both URLs
     (line 26);
   - set the lock line (`$mine`, line 15) to name this run;
   - write the results to `.claude/probes/K645/results/`.

   Then run `pwsh .claude\probes\K645\run_ab.ps1 -Runs desk:1,desk:4`
   (5 reps each; the script splits the one string `pwsh` hands it, at
   lines 21-22).
6. Append "## K645: the frame A/B (<date>)" to
   `docs/design/K653_checks.md` with:
   - the SHA;
   - for each scenario and throttle, the medians over the reps of:
     - the frame interval (mean, p95, max);
     - frames over 25 ms;
     - main-thread JS (mean, p95);
     - `__knotPerf` (mean, p95);
     - CPU busy share;
   - step 4's cannon peaks;
   - whether every page was asleep at open.

- **Done:** the table has all five scenarios at both throttles, 5 reps
  each, taken under the perf lock with every page asleep at open. Then
  close K645. Change no default: what the numbers mean for the cannons is
  for Claude and Levi.

## Run G · K1056: the real-time lure, as the turn clock's

Claude queues this run first. Batch 2's run F (`docs/design/K708.md`, "K1056: lures and snares in
real time") found that a real-time lure diverts the minotaur for one tick: `MinotaurChase.lure()`
(`src/game/minotaur.ts`) makes the lure's target its roam destination and drops its hunt, but the
next tick's `detect()` spots the player again whenever they are within `detectStart` (15 u), which
is where a player spends a lure (run F's trace: lured at t=13.95, spotted at t=13.96). So lures
bought nothing in real time. The turn clock does what `src/game/lures.ts`'s header, and `lure()`'s
own comment, say a lure does: the lured minotaur steps toward the target before its model's rules
and reverts to its model only on arrival, "so a hunter it lured away has to see you again". This
run makes the real-time chase do the same, then measures the stocks again. The shipped stocks
(2 lures, 1 snare) don't change in this run.

Read first: `.claude/rules/gameplay-minotaur.md` (REAL-TIME MINOTAUR, LURES AND SNARES),
`.claude/rules/probes.md`, `src/game/lures.ts`'s header, and the K1056 section of
`docs/design/K708.md`.

1. In `MinotaurChase`, a monster that hears a lure stays lured until it reaches the target. While
   lured it heads for the target at the wander pace, as a roam leg does, and `detect()` does not
   spot the player. On arrival it reverts to its model, and the next `detect()` may spot the player
   as usual. For each model (hunter, guard, stalker, and the extras), mirror what `TurnMinotaur`
   does with a lured monster (`src/game/minotaur_turns.ts`: its `lure()` and the step toward the
   target in its decisions), including whether the guard leaves its territory and how the stalker,
   which has no destinations, reaches the target. Who hears a lure, and its target, don't change.
   A newer lure it hears replaces the target. Fleeing the sword, being slain, or a catch ends it.
   Contact still catches, and a snare still holds it; after the hold it heads on to the target.
   `plan()` (the telegraph) shows the lured route.
2. Tests in `test/game/minotaur.test.ts`, for the hunter, the guard, the stalker and an extra: a
   lured monster within `detectStart` of the player doesn't spot them before it arrives, and spots
   them after it arrives if they are still in sight; a catch on the way still counts; `plan()`
   follows the lured route; a second lure retargets it. A pinned digest (such as `K80_DIGESTS`) may
   move only if its game spends a lure: re-freeze only those, and name them and why in the commit
   message.
3. Rerun the hand check and `s1056` with the commands in K708.md's K1056 section (the harness is in
   `.claude/probes/K708/rt/`, untracked; keep run F's policies). Control: every lures-0 cell must
   equal run F's rows game for game (catches and finish) for both players, since the fix touches
   only lured monsters.
4. Append `### After the lure fix (<date>)` at the end of K708.md's K1056 section: the rule for
   each model and anything real time can't mirror, the commands and run times, the same tables as
   run F (mean catches, the 3+ share, tools spent), a reading, and a suggested real-time stock
   beside the shipped 2 and 1.

Done when the tests and the control pass, `npm test` passes, the push's deploy is green, and the
section is pushed. Then K1056: if the suggestion is the shipped 2 and 1, close it with the
section's commit; if not, `ledger.mjs move K1056 --to "Waiting on Levi"` and rewrite its text as
the stock question (the suggestion, and where the table is). If the fix needs a `src/` change
outside `src/game/minotaur.ts`, stop and report.

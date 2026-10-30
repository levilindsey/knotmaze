# K1053: Muse batch 2

Claude starts these runs through Paseo at Levi's request, one run at a time: each run is a fresh
Muse agent that reads this brief, does its run's tasks, and stops. Levi, 2026-10-29: "Please
direct what you can to muse" and "reserve your Claude tokens for analysis, planning, reviews,
coordination of muse". Claude reviews each run on master afterwards and closes K1053.

## How to work

The process in `docs/design/K1050_muse_week.md` applies unchanged. Read its sections "Each task,
start to finish", "When a task stops", "Rules", "Off limits" and "Reports" before anything else.
Where they say K1050, read K1053 (`ledger.mjs handle K1053 ...`). Five more rules, from the
review of batch 1:

1. Close an item only when its Done check below passes. A task that stops keeps its item open:
   its commit says `Status: partial`, the item says which stop rule and what is left, and the
   remainder is filed with `ledger.mjs add`.
2. Do the task as written. If the brief looks wrong (a file, library or function it names isn't
   there), stop that task and quote the brief's line in your report; don't substitute other work.
   Batch 1 closed K783 and K728 on measurements nobody asked for, and its report said the K810
   libraries the brief named didn't exist, when the brief named the same three it ran (Fuse.js,
   uFuzzy, fuzzysort).
3. A `LEDGER:` commit holds `LEDGER.md` alone; a code fix goes in a work commit.
4. Update only K1053's handle (`ledger.mjs handle K1053 --last-commit <sha> --next "..."`); don't
   close it or edit its text. Claude closes it.
5. No subagents: Paseo crashes when Muse spawns them.

Muse doesn't load `.claude/rules/` by itself. Each task names the rules files to read before
changing its area. Timing measurements take the perf lock first: `$env:TEMP\claude-perf.lock`,
one line (owner, start time, what). If another owner holds it and it is under 30 minutes old,
wait; delete it when you're done.

End the run with a short report: one line per task with its status and commit.

## Run A · K783 and K728: the simulations

Read `.claude/rules/gameplay-minotaur.md`, `.claude/rules/gameplay-mechanisms.md` and
`.claude/rules/probes.md`.

Batch 1's cea08eb5 closed both items on other numbers (load-to-asleep timings and a 60-second
deviation, in `.claude/probes/K783/` and `.claude/probes/K728/`). Leave those files alone; they
are not this work. Both tasks use the K708 lives-and-sword simulations: `docs/design/K708.md`
explains them, and the harness is in `.claude/probes/K708/` (untracked; it exists on this
machine only). Real-time sweeps run with `.claude/probes/K708/rt/run_rt.ps1`, about 35 s a sweep.
Put the new harness files in `.claude/probes/K708/` too.

- **K783:** simulate games with lure and snare stocks of 0 to 3 and count the catches per game.
  What the tools do and how a player uses them: `docs/design/K137_s4.md`, its Handoff. Report a
  table of catches per game for each stock, the number of games per cell, and a suggested stock
  with its reason. The stock is Levi's call, so once the table has landed, run
  `ledger.mjs move K783 --to "Waiting on Levi"` and rewrite its text as that question (the
  suggestion, and where the table is).
- **K728:** add a sword-seeking player to the real-time sim (`MinotaurChase`, through
  `.claude/probes/K708/rt/rt_sim.ts`). It heads for the sword, takes it, then goes for the
  minotaur, like the turn-clock seeker in K708's tables. Measure the sword's real-time best case:
  how often the seeker takes the sword, how often it slays the minotaur, and catches per game
  against the blind player. Close K728, and add a pointer to the new table to K727's text (K727
  is a defaults call waiting on Levi).
- **Done:** both tables in a new section at the end of `docs/design/K708.md`,
  `## K783 and K728 (2026-10-29)`, with the commands and run times, committed and pushed (docs
  only, so no deploy). Neither sim may change `src/`: if one needs more than a harness change,
  stop and ask.

## Run B · K1052: `npm test` type-checks the tests

K393's goal was a type-check of `test/` inside `npm test`. Batch 1 added `tsconfig.tests.json`
and `npm run probe:types` (f79831c0); the probe reports 92 errors in 32 test files
(`docs/design/K393_probe.md`).

- Fix the errors in the test files a few files per commit: each commit under about 300 changed
  lines, `npm test` passing, the probe's count going down. Fix types only (annotations, typed
  fixtures, missing fields, narrowing). No `any`, `@ts-ignore` or `@ts-expect-error`, except
  where a test passes a wrong type on purpose, with a comment saying so. Don't loosen compiler
  options, and don't change `src/` except to export a type that a test needs.
- When the count reaches 0, add the test type-check to `npm run typecheck`, so that `npm test`
  and the deploy run it.
- **Done:** `npm test` type-checks `test/` and passes, and no test's expected value changed.
  Close K1052.

## Run C · K1054, K1055, and K810's table

### K1054 · The real-time chase's tap ignores the rules

Read `.claude/rules/gameplay-minotaur.md`, `.claude/rules/gameplay-moves.md` and
`.claude/rules/gameplay-mechanisms.md`.

K743 (f61eff23) switched the renderer's tap planning (`targetAt` in
`src/render/fabric_maze_renderer.ts`) to `planRouteRuled`. The real-time chase plans its own
route in `src/main.ts` (`handleChaseTap`, which calls `planRoute`), so in a chase with a rule on,
a tap past the choices can still stop at its first refused run.

- First check that a rule can be on during a real-time chase (one-way runs, turnstiles or
  another rule, with the minotaur). If none can, close K1054 and give the reason.
- Otherwise plan with `planRouteRuled` there. The route starts at `scene.chase.decisionVertex`,
  which can be the end of the run under way, so plan from the rule state the player will have
  there, not from the current one. Move the planning into a small function that a test can call
  (in `src/game/` or `src/app/`).
- Keep the chase's own blocked test (broken runs only). The renderer also skips hidden runs: say
  in the report whether the chase should do the same, but don't change it.
- **Done:** a test shows a ruled tap past the choices queuing its whole route, and `npm test`
  passes.

### K1055 · The worker preload, back for worker pages

Read `.claude/rules/physics-worker.md`.

K414 (2525712c) removed the worker chunk's modulepreload from the HTML for every page, because a
`phw=0` page never runs the worker. That also took K7 stage 7's head start away from worker
pages, which are the default (its commit: hello 35-55 ms sooner at 40 ms an asset). Get both:

- At build time, find the worker chunk's file name and write an inline script into `index.html`
  that adds the modulepreload link unless the page will run in-thread (`phw=0`, read the way the
  app reads it). Batch 1 found that a runtime `new URL(...)` resolves to a data copy under
  Rolldown, so take the name from the bundle.
- Check that no Content-Security-Policy blocks inline scripts: read the response headers of
  https://levi.dev/knotmaze/ and https://knotmaze.pages.dev. Knotmaze has no `public/_headers`;
  levi.dev proxies the page through `functions/knotmaze/[[path]].js` in the levi.dev repo. If a
  policy blocks them, stop and report.
- **Done:** `.claude/probes/K414/check.mjs` on the built page shows no worker-chunk request with
  `phw=0`, and exactly one by default, from the preload, before main constructs the Worker.
  `npm test` and `pwsh scripts/preview.ps1 -BuildOnly` pass. Report the head start measured the
  way K414's commit did, or say why it couldn't be measured.

### K810's table

K810 (443ebdda) left its numbers in `.claude/probes/K810/results.md` and in its Done line, but
the item asked for them in `docs/design/K793.md`'s Handoff. Add them there as a short subsection:
the table, the query file, the date and the commit. Docs only.

## Run D · K783, K1057 and K1060

### K783 · A chase starts with 2 lures and 1 snare

Levi, 2026-10-29, answering Claude's "I'd start with 2 lures and 1 snare" (run A's turn-clock table,
`docs/design/K708.md`, "K783 and K728 (2026-10-29)"): "sgtm. Make it tunable with param sliders".
The sliders already exist (`src/ui/tweakpane_panel.ts`, `luresRow` and `snaresRow` in the Minotaur
folder; link keys `lur` and `snr`), so this task changes the defaults and nothing else.

Read first: `.claude/rules/gameplay-minotaur.md` (the lures and snares entries),
`.claude/rules/gameplay-links.md`, and CLAUDE.md's "Pre-launch: no back-compat".

1. `src/ui/url_state.ts`, `PARAM_DEFAULTS`: `lures: 0` becomes `2`, `snares: 0` becomes `1`. Leave
   the rows, their ranges, the link keys, the codec and `CODEC_VERSION` alone. Pre-launch, a
   default edit changes what older links mean, and that is accepted.
2. Fix each test the change moves, and list each in the commit message with its old and new
   expected value. Expect tests that build a chase at the defaults and assumed it had no tools.
   Lures and snares are stocks, not part of the maze, so no generated maze may change. A pin that
   moves only because it covers every param or the link token (a golden daily's design, a codec
   pin) is re-frozen and named in the commit, as CLAUDE.md's "Pre-launch: no back-compat" says.
   If a maze's layout, a K87 identity pin or a test unrelated to lures and snares changes, stop and
   report it.
3. Lore and docs that state the old defaults as today's behaviour: grep `.claude/rules/`, `docs/`
   and `README.md`, and update those. Leave dated history as it is.
4. Page check on a build (`pwsh scripts/preview.ps1 -BuildOnly`, then serve it; headed Chrome,
   never `--virtual-time-budget`). `.claude/probes/K137/s4/tools_page.mjs` shows how to read the
   tools (`__knotTurnMino().tools`, the buttons' badges, the HUD's rows). Keep the probe and its
   output in `.claude/probes/K783/`. Check:
   - `?7&am=instant&mt=hunter&snd=none`: lure badge 2, snare badge 1, HUD rows 2 and 1, and
     `__knotParams()` reads lures 2 and snares 1.
   - The same link plus `&lur=0&snr=0`: no tool buttons, no lure or snare HUD row.
   - `?7&am=instant&snd=none` (classic): no tool buttons, no lure or snare HUD row.

Done when `npm test` passes, the three page checks hold, and the push's deploy is green.

### K1057 · The probe recipes' runner

vitest 4 dropped vite-node, so every recipe in the rules files that runs `node
node_modules\vite-node\vite-node.mjs` fails. Run A's `.claude/probes/K708/run_node.mjs` (Vite's SSR
module loader) does the same job, but `.claude/probes/` is untracked and exists on this desktop
only.

Read first: `.claude/rules/probes.md`.

1. Move it to `scripts/run_node.mjs`, tracked, with its usage in the header. Fix what the move
   breaks: its `root` is three levels up from the probes folder, and its per-process deps caches
   must land somewhere git ignores, not in `scripts/`. Point anything that called the old path at
   the new one.
2. Rewrite each recipe that calls vite-node to call it: `gameplay-mechanisms.md` (line 370 on
   2026-10-29), `physics-kinks.md` (74), `probes-pluck.md` (140), `probes.md` (18, 228, 233, 297,
   668). The old recipes passed `--config <folder>\vite.node.config.mjs`, and run_node.mjs reads no
   config, so check what each config set; where a recipe still needs it, say so in the recipe.
3. Run two of those recipes whose probe folders exist on this machine (K114's `burn_sim.ts`
   takes about 2 s) and give their results in the commit message.

Done when no rules file names vite-node except as history, two recipes run through
`scripts/run_node.mjs`, `npm test` passes and the push's deploy is green.

### K1060 · Pin the worker preload's phw reader

K1055 (c70db4fa) put an inline script in index.html's head that modulepreloads the physics
worker's chunk unless the page will run in-thread. To decide before the app loads, it reads `phw`
with its own copy of the link codec's walk (`vite.config.ts`, `workerPreloadScript`), and it
assumes `physicsWorker` defaults on (a phw entry in the blob reads as off). Only a probe checks it
(`.claude/probes/K414/check_k1055.mjs`, 14 URL forms in Node). A wrong decision costs a download
or the head start, never behaviour, so nothing would notice one.

Read first: `.claude/rules/gameplay-links.md` (the codec) and `.claude/rules/physics-worker.md`.

1. Move `workerPreloadScript` and the values it bakes in (`PHW_INDEX`, `CODEC_TYPE_CODES`,
   `CODEC_VERSION`) out of `vite.config.ts` into a module the suite can import, beside the loader's
   inline plugin in `src/loader/`. Pin the default it assumes: build it from
   `PARAM_DEFAULTS.physicsWorker` (a blob entry means the other value), or, if `url_state.ts` will
   not load in the Vite config, assert in the test that the default is on.
2. Add a test that runs the generated script against a stub `location` and `document` and
   compares its decision with what the app reads (`parseParams`'s `physicsWorker`) for: the
   probe's 14 forms; seeded random links written by the codec's own writer, with params changed
   before and after phw's index, every codec type among them, and phw both ways; `key=value`
   links; a token followed by `&phw=0` and by `&phw=1`; a token of another codec version; an
   unreadable blob. Check once by hand that the test fails when the script's decision is
   inverted, and say so in the commit message.
3. Build before and after (`pwsh scripts/preview.ps1 -BuildOnly`) and compare `index.html`'s
   inline script: it may change only where item 1 needs it to. Give the result in the commit
   message.

Done when the test passes, `npm test` passes and the push's deploy is green.

## Run E · K1061 and K396

### K1061 · The last vite-node recipes

K1057 (d4d83422) tracked `scripts/run_node.mjs` and pointed probes.md's recipes at it, but these
files still run `node_modules\vite-node\vite-node.mjs`, which left with vitest 4: the command
`scripts/fold_census.ps1` spawns for each job, and the run comments of `scripts/fold_census.ts`,
`scripts/label_pops.ts`, `scripts/panel_inventory.ts`, `test/render/field/scenes/gen.ts` and
`test/render/field/scenes/write.ts`. Two of them load a Vite config, which `run_node.mjs` cannot
do (it runs with `configFile: false`): `scripts/fold_census.vite.config.mjs` (a private deps
cache) and `scripts/panel_inventory.vite.config.mjs` (a private cache, and `tweakpane` aliased to
the recording stub).

Read first: `.claude/rules/probes.md`.

1. Give `scripts/run_node.mjs` an optional `--config <file>` before the entry, as vite-node had:
   it loads that Vite config, and where the config sets something the runner also sets (both
   configs set `cacheDir`, `logLevel` and `optimizeDeps`), the config's value wins. Without the
   flag the runner behaves exactly as it does now. Update its header.
2. Point every file above at the runner, with `--config` where it loads a config, and fix the two
   configs' "vite-node config" comments. Leave `docs/design/` (history), `.claude/probes/` (frozen
   probe recipes; K1040's and S3a's are junction work, not this task) and
   `scripts/split_rules.json` alone.
3. Run each changed recipe once, writing only under `.claude/probes/K1061/` and never over a
   tracked file (`docs/design/K339_inventory.md`, the test scenes' fixtures):
   - `panel_inventory.ts`, its output in `.claude/probes/K1061/`. Give its row count and the
     tracked inventory's in the commit message.
   - `fold_census.ps1` on a jobs file cut to a few jobs (`node scripts/fold_census.mjs jobs`),
     `-Out` under `.claude/probes/K1061/`. It takes the perf lock itself.
   - `label_pops.ts --frames 2` on one sequence, only if its inputs already exist on this
     machine; start its dev server as its header says and stop it afterwards.
   - The two test scene scripts, if they take an output path.

   A recipe that can only write tracked files, or needs inputs this machine lacks, is not run:
   say which in the commit message.

Done when the runs above work, `npm test` passes and the push's deploy is green.

### K396 · `scripts/dev.ps1`

Levi's phone loads a dev server on the LAN, started by a command a session has to remember
(`vite --host 0.0.0.0 --port 5173 --strictPort`). Make it a script, so a ledger `env:` line can
name it (claude-config `rules/sessions.md`, "Environment belongs in scripts").

1. `pwsh scripts/dev.ps1 [-Port 5173]` runs that command from the checkout's own `node_modules`,
   in the foreground.
2. Before it starts, it checks that `node_modules` holds vite; if not, it stops with a message
   naming `npm ci`. It warns, without stopping, when `package-lock.json` is newer than
   `node_modules\.package-lock.json` (the dependencies changed since the last install). It never
   runs `npm ci` or `npm install` itself: in an agent worktree `node_modules` can be a junction to
   the main checkout's, and an install through it empties the main one (K1058).
3. Add one line for it where `.claude/rules/probes.md` describes `scripts/phone.ps1` and
   `scripts/preview.ps1`.

Check on a port other than 5173, which Levi may be using: the page loads from
`http://localhost:<port>/`; a second start on the same port fails (strictPort); stopping it
leaves no node process of yours behind. Done when those checks pass, `npm test` passes and the
push's deploy is green.

## Run F · K1056: lures and snares in real time

K783 (run A) measured the stocks on the turn clock only. Levi set the defaults from that table on
2026-10-29 (lures 2, snares 1), and the same stocks apply to the real-time chase, which nobody has
simulated with tools. This run measures them there. No `src/` change, and no default changes.

Read first: `.claude/rules/gameplay-minotaur.md`, `.claude/rules/probes.md`, and in
`docs/design/K708.md` the real-time sections and "K783 and K728 (2026-10-29)". The harness is in
`.claude/probes/K708/rt/` (untracked, this machine only); run A's `run_rt_a.ps1` and its `s728`
sweep show how a sweep is added and run. Put new harness files there too.

1. Before changing anything, run the greedy and fleer rows the control in step 3 needs and keep
   their per-game results.
2. Give `rt/rt_sim.ts` the tools through the game's own calls, made as the page makes them
   (`src/main.ts` near line 3725: `MinotaurChase.lure(edge, lureRangeOf(params.lureRange))` at
   the shipped `lureRange`, and `MinotaurChase.setSnare(edge)`). Stocks are per game and don't
   refill on a catch. Mirror the turn sim's policies (K708.md, "K783: lures and snares on the turn
   clock") as closely as real time allows, judged at the player's decision points:
   - Lure: while the minotaur hunts within 3 runs of the player, pluck the run whose lure
     destination lies farthest from the player in runs, among those farther from the player than
     the minotaur; ties to the lowest run id; with none, spend nothing.
   - Snare: when the hunting minotaur's route to the player enters a run at the player's vertex
     that it hasn't entered yet, lay the snare on that run (a snare springs when a monster steps
     onto its run and holds it for `snareHoldS`, 3 s).

   Write each policy's exact rule into the new section. Check one game by hand: a spent lure is
   heard and turns the minotaur, and a laid snare springs and holds it.
3. Add a sweep `s1056` to `rt/rt_sweeps.ts`: the shipped real-time hunter settings
   (`PARAM_DEFAULTS`; name any the harness can't take from there), sword off, no extra monsters;
   lures 0 to 3 crossed with snares 0 to 3; players greedy and fleer; the same 288 H1 mazes x 3
   reps as `s708` (864 games a cell). Control: its (0, 0) cells must match step 1's results game
   for game (catches and finish). Name any existing sweep whose rows they also equal.
4. Add `## K1056: lures and snares in real time (<date>)` at the end of `docs/design/K708.md`, as
   run A's section did: the policies, the commands and run times, mean catches a game per cell
   for each player, the share of games with 3 or more catches, tools spent a game, a reading, and
   a suggested real-time stock beside the shipped 2 and 1.

Done when the section is committed and pushed (docs only, so no deploy) and the control holds.
Then, if the suggestion is the shipped 2 and 1, close K1056 with the section's commit. If not,
the stock is Levi's call: `ledger.mjs move K1056 --to "Waiting on Levi"` and rewrite its text as
that question (the suggestion, and where the table is). If the sim needs more than a harness
change, stop and report.

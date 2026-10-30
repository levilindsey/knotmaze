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

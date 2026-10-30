# K1050 · Muse's week: objective tasks, 2026-10-29 to Nov 2

Levi is handing Muse a week of knotmaze work while Claude Code waits for its weekly usage limit
to reset (Nov 2, 11:00 PT). Every task below has a done-check that is a test passing or a number
reached. None of them touch the junction or cursive drawing, the physics, or anything that needs
Levi's eye; that work stays with Claude and Levi. Work the tasks in order. They are independent,
so a stopped task doesn't block the next one. When the list is done, stop: don't take on other
ledger items.

Read `CLAUDE.md` first (the project, the commit policy, the verification rule). For each task,
read its item in `LEDGER.md` (search for the ID; the file is long) and the design-doc section
named under it.

## Setup, once

```powershell
cd C:\Users\lsl\Repositories\knotmaze
git fetch origin
git worktree add --no-track -b muse/K994 .claude\worktrees\muse origin/master
cd .claude\worktrees\muse
npm ci
# The untracked probes tasks 2 and 8 use (all of K138 is 228 MB; take only its census).
# robocopy exits with 1 when it copied files: that is success.
robocopy C:\Users\lsl\Repositories\knotmaze\.claude\probes\K708 .claude\probes\K708 /E
robocopy C:\Users\lsl\Repositories\knotmaze\.claude\probes\K138\s4\census .claude\probes\K138\s4\census /E
```

Start each later task from a clean tree on a new branch:

```powershell
git fetch origin
git switch --no-track -c muse/K788 origin/master
```

After leaving `muse/K994`, run `npm ci` again: that branch's `node_modules` won't match master's
lockfile.

## Working rules

- Work only in `.claude\worktrees\muse`. Leave the main checkout
  (`C:\Users\lsl\Repositories\knotmaze`) alone: no branch switches, edits or builds there. Claude's
  sessions need it on master.
- Commit on the task's branch as often as you like: the local `muse/*` branches are how the work
  comes back. Start each message with the ID (`K788: ...`). Never push, and never merge, rebase or
  reset master: Claude reviews and merges after the reset.
- `npm test` type-checks `src` (`tsc`, then `tsc -p notices`) and runs the whole Vitest suite.
  While you iterate, run single files: `npx vitest run <file>`.
- Dev servers go on ports 5500-5599 (5173 is Levi's own server, 5401 is K1040's).
- Browser checks use their own Chrome profile, never Levi's. Probe links add `&snd=none`. Never use
  Chrome's `--virtual-time-budget` (`CLAUDE.md`, "Verification rule"). No phone work this week.
- Never run `wrangler pages project create` or other wrangler scaffolding here: it rewrites
  `package.json`, the lockfile and `.gitignore`.
- Don't edit `LEDGER.md`, `CLAUDE.md` or `.claude/rules/`, and don't run claude-config's tools
  (`ledger.mjs`, `agent_merge.ps1`). Claude files your reports into the ledger.
- A global git hook moves weekday 08:00-18:00 commit times to the evening, which changes the SHA
  `git commit` prints. That's expected; take SHAs from `git rev-parse HEAD`.

## Stop rules

Stop a task, commit what you have, write the question into its report and go on to the next task
when:

1. a test's expected value has to change for your fix to pass. The exceptions are tests you wrote
   for the task and task 5's appended link keys. This guards the pins:
   `test/physics/byte_identity.test.ts`, `test/core/maze_plan_identity.test.ts`, the golden
   dailies in `test/ui/daily_link.test.ts` and the link format in `test/ui/param_codec.test.ts`;
2. the fix needs more than a call-site change under `src/physics/`, `src/geometry/` or
   `src/render/`;
3. the question is how something looks, feels or plays, including a change to what a move does
   beyond the fix a task names. That's Levi's call. Anything new on screen stays behind a flag,
   off by default;
4. about 2 hours of work on one task haven't made its check pass;
5. the diff passes about 300 lines, tests not counted.

## Off limits

- Junctions: K1040 and every item about junction drawing, with their briefs and probes,
  `src/render/field/` and `src/render/junction_*`.
- Cursive and text: K863, K115, K1009 and every item that mentions cursive.
- Physics and its constants (`MIN_PASS_SEPARATION`, `DEPTH_WINDOW`, the sleep gate; K595).
- The thread renderer and its GPU performance (K8, K611, K919), and dropping knot mode (K326).
- Phone passes, and every item waiting on Levi's look.
- Every other worktree under `.claude/worktrees/` and every branch not named `muse/*`: they hold
  other agents' work. Above all, don't merge, push or build on `park/muse-2026-10-26` or
  `k893-g31-revert`.

## Reports

A task's last commit message is its report:

```
K788: <what was done, in one line>

Status: done | partial | stopped (which stop rule, and the question)
Changed: the files, and what each change does
Checked: the commands run and the numbers, before -> after
Left: anything not done
```

Tasks 6 and 8 change no code: they put their results in the doc named there and commit that.

## Tasks

### 1. K994 · Dependency security fixes

`npm audit` (2026-10-28) reports 2 critical, 7 high and 2 moderate. Production has one high,
`@xmldom/xmldom` 0.8.13, which pixi.js 8.19.0 pulls in; the rest is dev tooling. `npm audit fix`
covers everything except vitest's two criticals, which need a newer vitest (today `^3.2.7`).

- Run `npm audit fix` (never `--force`). Then move vitest, with any `@vitest/*` packages, to the
  nearest release that fixes its criticals, a new major included, provided the suite passes with
  no test edits and only a few lines of config change.
- If `@xmldom/xmldom` is still flagged after that, pin a patched 0.8.x with an `overrides` entry in
  `package.json`. If no 0.8.x is patched, stop and ask.
- Ask before any other major-version bump (vite's included) and before any change to pixi.js
  itself: a pixi change can change rendering. Turning on Dependabot is Levi's (a GitHub setting).
- Done: `npm audit --omit=dev` shows no high or critical; the report lists what plain `npm audit`
  still shows, and why; `npm test` and `npm run build` pass in the worktree.

### 2. K788 · One-way runs plus ice can trap the player

With one-way runs at 0.4 and ice at 0.25 (`oneWay` and `ice` in `PARAM_DEFAULTS`,
`src/ui/url_state.ts`; both 0 by default), 42 of 50 seeds end with no legal tap or in a dead end
(44 with keys at 2). A slide crosses a one-way run and its backtrack is refused (seeds 3 and 4
traced). Nothing rejects the layout, and no Undo rescues the player (K778).

- Reproduce the 42 of 50 first, with the census that found it:
  `.claude/probes/K138/s4/census/census.ts`, with its numbers in `results.md` and its traces of
  seeds 3 and 4 beside it (`docs/design/K138_s4.md` Handoff).
- The keys (`src/game/locks.ts`), hidden runs and color rules place through `placeRule`
  (`src/game/rule_search.ts`), which keeps the first draw that leaves the maze solvable under
  `ruleSearch`. Find why one-way runs (`src/game/one_way.ts`) plus ice still trap. Likely, but not
  checked: the search doesn't model a slide across a one-way run.
- Fix it in placement or in the search: reject or redraw a layout the rules make unwinnable.
  Changing what a tap or a slide does is a rule change (stop rule 3).
- If that alone can't reach 0, because a solvable maze still lets a player walk into a one-way
  dead end, stop there: report the count and two example seeds. Whether that is fair is Levi's
  call.
- Done: the census, measured the same way as the 42 of 50, reads 0 of 50 at both settings; a unit
  test covers seeds 3 and 4; nothing changes with one-way and ice at 0.

### 3. K743, K762, K763 · Three rule bugs from K138

- K743: `planRoute` (`src/game/route_plan.ts`) ignores the rules. A tap past the choices walks part
  of a route and stops at its first refused run. Plan with the rule-aware search in
  `src/game/rule_search.ts` instead (`docs/design/K138_s1.md` Handoff; `docs/design/K480.md`). The
  renderer calls `planRoute` too (`src/render/fabric_maze_renderer.ts`); a call-site change there
  is fine. Done: a test where such a tap under one-way runs follows a legal route to the tapped
  point (when no legal route exists, keep today's behavior and say so in the report); the existing
  route tests pass unchanged.
- K762: after a backtrack, a turnstile can refuse re-entry to the run just retraced
  (`docs/design/K138_s2.md` Handoff). Done: a test that reproduces it fails before the fix and
  passes after.
- K763: with no hidden run placed, the HUD reads "0 / 0 found" (`docs/design/K138_s2.md` Handoff).
  The counter's text is assembled, so a search for the whole string finds nothing; `placed` in
  `src/game/fabric_controller.ts` says whether every rule found a layout. Done: no "0 / 0" counter
  shows when nothing was placed, with a test.

### 4. K747 and the first half of K712 · Sword counts, hearts

- K747: the sword's `takenAt` and `slainAt` (`src/game/sword.ts`) count minotaur turns, so after a
  sprint on the turn clock they read one less than the move (`docs/design/K137_s3c.md` Handoff).
  Done: a test with a sprint where both equal the move number.
- K712, first half: hearts (`src/game/lives.ts`) are kept by neither Undo nor saved attempts
  (`docs/design/K137_s3a.md`, Residuals g). Undo back past a catch should return its heart, and a
  saved attempt should restore the hearts left. Saved attempts are versioned
  (`src/game/daily_attempt.ts`, `src/game/daily_store.ts`); add the hearts the way the store has
  added fields before (its version and migration), with tests. If no Undo or saved attempt can
  hold hearts (for example, turning lives on leaves the daily), say so in the report and skip that
  half. The second half, the default of 3 hearts when lives are switched on, is Levi's.

### 5. K807 · The next gameplay constants become panel rows

From K795's audit table (`docs/design/K795.md`): the follower's delay (`FOLLOW_DELAY_MIN` 1 and
`FOLLOW_DELAY_MAX` 2 in `src/game/monsters.ts`, one picked at random per follower; not the camera's
`FOLLOW_DELAY`) and its shortcut chance, the sword's and the sleepers' distance off the shortest
way, `NEAR_HOPS` 2 (turnstiles, `src/game/turnstiles.ts`) and `ROUTE_WEIGHT` 4 (one-way runs,
`src/game/one_way.ts`). The table names the rest. Copy how K795 added its rows
(`git log --grep=K795`).

- Each new param defaults to today's constant, so no maze, daily or pin moves.
- Add each to `PARAM_DEFAULTS` (`src/ui/url_state.ts`) and append it at the end of `CODEC_PARAMS`
  (`src/ui/param_codec.ts`; its header is the link-format spec). `test/ui/param_codec.test.ts`
  pins the key order and changes only by appending. `CODEC_VERSION` stays as it is.
- The rows go in the panel folder that holds K795's rows, with row help written like theirs.
- Done: a test per param shows the code that reads it gets the panel's value; every other test
  passes unchanged.

### 6. K810 · Benchmark three search libraries

The panel search uses a hand-rolled matcher, chosen from the libraries' docs
(`docs/design/K793.md`). Run Fuse.js, uFuzzy and fuzzysort on the 44 queries in
`test/ui/panel_search_fixture.ts`, scored the way the fixture scores the shipped matcher.

- Measurement only: the app's search, `package.json` and the lockfile don't change. Install the
  libraries with `npm install --no-save`, run `npm ci` when done, and check that `git status`
  shows neither file changed.
- Done: a table in `docs/design/K793.md`'s Handoff with each library's pass count beside the
  shipped matcher's, the settings used, and where the script lives (`.claude/probes/K810/` in the
  worktree).

### 7. K393 · Type-check the test files

`npm test` runs `npm run typecheck && vitest run`, and `typecheck` is `tsc && tsc -p notices`.
`tsconfig.json` includes only `src`, and Vitest strips types, so a type error in `test/` goes
unseen.

- Add a `tsconfig.test.json` that extends `tsconfig.json` and includes `test`, and add
  `tsc -p tsconfig.test.json` to `typecheck`.
- Fix the errors it reports in test files only, without changing what any test checks. A type
  error that shows a real bug in `src` goes in the report, unfixed.
- Done: `npm test` type-checks `test/` and passes; no test's expected values changed.

### 8. K783 and K728 · Numbers from the game simulations

Probe work only: no `src` change and no default change. The harness is `.claude/probes/K708/`
(copied in at setup; `docs/design/K708.md`); real-time sweeps run with
`.claude/probes/K708/rt/run_rt.ps1`, about 35 s each.

- K783: catches per game with lure and snare stocks of 0 to 3 (`docs/design/K137_s4.md` Handoff).
  Report the table and a suggested stock with its reason; the stock itself is Levi's call.
- K728: add a sword-seeking player to the real-time sim (`MinotaurChase`) and measure the sword's
  real-time best case, which feeds K727 (a defaults call waiting on Levi).
- Done: both tables in a new section at the end of `docs/design/K708.md`, committed on
  `muse/K783`. The scripts stay in `.claude/probes/K708/` (untracked; Claude copies them out at
  review).

### Optional, if time is left

- K414: a `phw=0` page still downloads the physics worker's chunk (about 90 KB raw), because of K7
  stage 7's modulepreload (`vite.config.ts`, the preload code around lines 44-83). Done: a `phw=0`
  load fetches no worker chunk and a default load still preloads it, checked in a headed Chrome's
  network log.
- K932, desktop Chrome only (skip it if it needs the phone): `scripts/bench_frame.mjs` times only
  the CPU's submission, because Chrome's WebGL `finish()` doesn't wait for the GPU (K923 read
  0.0-0.1 ms for 3.8 ms of GPU work). End each timed frame with a 1-pixel `readPixels`, recheck the
  GPU times taken with it, and fold in K923's runner (`docs/design/K923_s3_bench.md`, Handoff).
  Timing takes the machine-wide perf lock, `$env:TEMP\claude-perf.lock` (one line: owner, start
  time, what): wait while another owner holds it (it's stale after 30 minutes) and delete it when
  done. Done: on K923's scene the frame times include the GPU's work, with before and after
  numbers in the report.

## After the week

After the Nov 2 reset Claude reviews each `muse/<ID>` branch (the diff, `npm test`, the pins), then
merges it or sends it back with notes, and updates the ledger. Muse merges nothing.

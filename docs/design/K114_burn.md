# K114 burn race: the first round-2 prototype

K114 is round 2 of the gameplay additions
(`docs/design/K80_gameplay_additions.md`, sections R.0 to R.6). Levi
took its recommendations. The first prototype they name is the burn race
(section R.3.3): a fuse lit at the entrance burns along the threads,
slower than you, and burnt runs are gone. You race it to the exit.

It is turn-based first (the fire's clock is the length you have
walked), with real-time burning behind its own toggle next. It is in
free play first, and the first K46 daily modifier from round 2. This
brief plans the build in four stages, one agent each, and details
stage 1.

Stage 1 starts after K80 turns stage 1 merges. Both change how a tap
becomes a turn, in the same files (see "Shared with K80 turns").

## What Levi decided

- His note of 2026-10-13 (verbatim in `K80_gameplay_additions.md`,
  R.1): "A mode where threads burn away steadily and you have to race to
  the end ahead of them."
- On 2026-10-14 at about 00:22, answering K114
  (`docs/design/levi_notes_2026-10-14.md`, item 12): "Recs, plus a
  spider answer". It was filed as "the recs taken, the spider explained
  in session". The R.0 recommendations that bind this work, verbatim:
  - "1. **The first round-2 prototype.** Recommended: the burn race,
    turn-based."
  - "2. **A `clock` param** (turn | beat | realtime) that every enemy and
    front reads; it narrows 4.35. It brings timed taps into attempts (a
    store version bump) and a pause that hides the board. Recommended:
    yes, built with the beat rider."
  - "9. **Dailies:** all of round 2 in free play first. Recommended first
    K46 modifier from it: the burn race."
  - "10. **The flow score** stays a separate stat, never part of
    efficiency."
  - Calls 3 and 4 (a cut deletes the whole run; render-only cuts plus
    walk-graph cuts) belong to the cut verb. A burnt run takes the same
    shape: "Burnt runs leave `choices()` (R.4.1's blocked-run set)"
    (R.3.3), and the threads stay physical. Call 7 (the spider) is not
    this work.
- The rules of R.3.3, which this brief builds (verbatim):
  - "a fuse is lit at the entrance. Fire runs along every thread from
    there, slower than you, and burnt runs are gone. Reach the exit
    ahead of it. Backtracking feeds the fire."
  - "Fire reaches v at h + d(v)/r; you reach v after walking L(v). Fire
    behind you can never catch you on a run (it is slower), so you are
    safe exactly while L(v) < h + d(v)/r at each junction you reach."
    Hence "**the optimal route always escapes.**"
  - "Fire follows the walk graph and never jumps a crossing".
  - "**Turn-based first:** the fire's clock is the length you have
    walked, so each move advances it by the run's length. That keeps the
    attempt a pure function of its taps (saved attempts and replays stay
    exact), and thinking is free."
  - "**Readable:** an arm whose far end the fire reaches before you would
    is drawn smoldering and refuses the tap, so you never walk into fire
    unknowingly. You lose only when no safe arm is left, and a loss
    always traces back to your own detours."
  - "**Params:** `fire` (off | fuse | sparks; off), `fireSpeed` (r,
    [0.3, 0.95]; 0.75), `fireDelay` (h, lattice units; 0)."
- R.6.1, the question this prototype must answer: "at r 0.75-0.9, with
  and without fog, what is the closest call for the K80 harness's
  explorer policies on 30 dailies, and how often is an explorer trapped?
  If careful players never come within a run of the fire, drop it or
  make fog part of the mode."
- On 2026-10-14 at about 14:46, on this brief's calls (verbatim): "Burn
  race: we should probably have a fire effect show at the start, but
  only actually start moving it after the player makes their first move.
  Will we have a toggle for turn-aligned vs realtime burning? I think we
  should!" So the lit fuse shows from the load and moves only from the
  first move, and stage 2 builds real-time burning behind the fire's own
  toggle, `fireClock`. Call 7 below is answered.

## The model, derived from R.3.3

Each point follows from the rules above. None is a new call.

- d(v) is v's walk distance from the walk start (`WalkGraph.start`, the
  trace flood's origin). The fire reaches v at `T(v) = h + d(v)/r`.
- The clock L is the controller's `walkedDist`. A backtrack advances the
  fire like any other move ("Backtracking feeds the fire"). L is 0 until
  the first move, so the lit fuse waits at the entrance (Levi, about
  14:46). Under real-time burning (stage 2), L runs on from the first
  move at a walking speed, so standing still feeds the fire too.
- An arm from your junction u to w, of length len, is safe when
  `L + len < T(w)`. It is strict, as R.3.3's "<" reads, so an arm
  smolders when `L + len >= T(w)`.
- Every accepted move keeps `L < T` at the junction you reach. The fire
  has not reached any junction you stand on, so none of your arms is
  burnt: each is safe or smoldering. At h = 0 the fuse is lit under you
  at the start, and only far ends are tested, so the first move is still
  fair.
- A run u-w burns from both ends. Its point at distance x from u burns at
  `h + min(d(u) + x, d(w) + len - x)/r`. The run starts burning at
  `h + min(d(u), d(w))/r` and is burnt at
  `h + (d(u) + d(w) + len)/(2r)`.
- That is the trace flood's geometry. `reveal_plan.ts` floods from the
  walk start over the walk graph at `FLOOD_SPEED` lattice units per
  second. So the fire at clock L should be the trace reveal at flood
  time `(L - h) * r / FLOOD_SPEED`, and `intervalsAt` and `tipsAt`
  should give its front for the look. Check how `buildRevealPlan` scales
  speed before relying on it.
- You lose when no safe arm is left at your junction. Reaching the exit
  wins, as today.
- The closest call is the least `T(v) - L` over every arrival, the exit
  included. The start is not an arrival. It is in lattice units: R.3.3's
  "🔥 escaped by 9.2".
- On the shortest route `L(v) = d(v) < T(v)` for every v past the start,
  since r < 1. This is the property test behind "the optimal route
  always escapes".

## The stages

- **Stage 1** (below): the model, the balance measurement (R.6.1), the
  params, the mode in play and a first, cheap look. Playable on the
  desktop.
- **Stage 2**: real-time burning, Levi's toggle (2026-10-14, about
  14:46).
  - A new param `fireClock` (turn | realtime, default turn) sits with
    the fire rows. It is the fire's own toggle, not R.0 call 2's shared
    `clock`: `clk=realtime` is K80's real-time chase, where the
    minotaur always runs (`docs/design/K80_turns.md`). Folding
    `fireClock` into `clock` later means making that minotaur
    optional; a breaking change is fine pre-launch.
  - Under `fireClock=realtime` the clock L starts at the first
    accepted move and runs at a reference walking speed (the head's
    move animation, in lattice units per second; record the value), so
    the fire moves at r times that speed. Thinking time counts: arms
    smolder while you stand, and the fire reaching your junction is a
    loss where you stand.
  - It reuses the real-time chase's fixed-step clock
    (`src/game/minotaur.ts`, R.4.2) and pauses the way that mode
    does. Its own balance measurement adds a thinking-time model to the
    stage 1 players.
  - Free play only, with no exact replay: timed taps come with the
    daily stage and R.0 call 2's clock work. The fire and the real-time
    chase (`clk=realtime`) stay mutually exclusive at first.
- **Stage 3**: the look, R.3.3's "inverted mask, a char band at the
  front, embers". It builds on K76's explore program, so it starts once
  K76's stage 2 work has merged.
  - Burnt runs, Levi's toggle (K290, 2026-10-14 about 18:08): a `burnt`
    dropdown with two looks.
    - **gone** stops drawing them through a per-run visibility in the
      paint shader (R.4.1's render-only cut). The gaps of threads that
      ran under a burnt thread close, K268's shaped gaps in reverse, and
      junction fans drop the arm.
    - **char** keeps them drawn in a burnt coloring: stage 1's char
      stroke moved into the shader, so it respects the gaps (K281 (c)).
    - Gone keeps R.3.3's char band and embers at the fire front, so a
      thread blackens before it vanishes. The sheet shows both looks;
      the default is gone (Levi, 2026-10-14 about 18:27).
  - Build it on K76's thread reveal, which R.3.3 calls "the same per-run
    visibility, reversed". On master that is the explore program and its
    VIS pieces (`src/render/explore_glsl.ts`, `src/game/explore_view.ts`;
    K76 stages 2b-2d are extending them, with lore in
    `render-explore.md`).
  - The `burn` frontier FX rides the flood tips (`tipsAt`), and the lit
    fuse burns in place at the entrance until the first move.
  - The fire's light under fog: "burning threads show branches the fire
    has reached and you have not".
  - A contact sheet on desktop and phone for Levi.
  - As a render prototype it skips the `paint_math` mirror and the
    parity tests until Levi picks a look (K152 item 3, approved
    2026-10-14). The merge stage adds them.
- **Stage 4**: the daily and the share, if stage 1's measurement keeps
  the mode.
  - The burn race as the first K46 modifier (R.0 call 9).
  - The share line ("🔥 escaped by 9.2", R.3.3).
  - How stars, stats and the move grid read a burn race.
  - What a loss does to an official attempt.
  - The `sparks` option (fires lit at telegraphed junctions and times,
    R.5.2's Firebreak).
  - The fire under the beat clock once the beat rider builds it, and
    `fireClock` folded into `clock` then (R.0 call 2).
  - The turn-based fire keeps an attempt a pure tap list. A result
    field such as the closest call is still a shape change: bump the
    daily store's `v` (3 today, K146).

The coordinator writes each later stage's brief from the handoff of the
stage before it.

## Shared with K80 turns

K80 turns stage 1 (`docs/design/K80_turns.md`) is building the
turn-aligned minotaur, where "Each accepted tap is a turn". The fire is
another thing a turn advances, so both change the same path from a tap
to a move:

- `src/game/fabric_controller.ts`: the tap results, `tapEdge`,
  `choices()`, `replay()`, `reset()`, `respawn()`;
- `src/main.ts`: `handleFabricTap`, `moveAlong`, `keyMoveAlong` (keys
  and the move pad), the chase routing (`handleChaseTap`), Reset path
  (`resetPathAction`), and the HUD and toast wiring;
- `src/ui/url_state.ts`, `src/ui/param_codec.ts` and their pins
  (`test/ui/param_codec.test.ts`, `test/ui/url_codec.test.ts`): both
  append codec rows;
- `src/ui/tweakpane_panel.ts`, `src/ui/maze_hud.ts`, and possibly
  `src/game/minotaur.ts` (its turn hook).

So stage 1 starts from master after K80 turns stage 1 has merged. Read
its "Stage 1 handoff" first.

The fire is a pure function of the clock, so it needs no state beyond
the model and the closest call so far. Where K80 turns steps its
minotaur after an accepted tap, the fire refreshes in the same place. If
the merged code leaves no clean hook, add one that both use rather than
a second path.

## Stage 1: the model, the measurement and the mode

### The work

1. **The fire model.** A pure module in `src/game/` (`fire.ts`
   recommended), unit-tested. It uses exact arithmetic only (+ - * / and
   `Math.sqrt`, or `src/util/det_math.ts`), because an attempt replays
   on any device (K108). It covers:
   - the walk graph's Dijkstra, exported from `buildWalkGraph` (its
     private `dijkstra` closure in `src/core/walk_graph.ts`), as R.2
     planned. No result may change: `distToExit`, `optimalLength` and
     every pin stay bit-identical;
   - the fire times T(v) from `WalkGraph.start`;
   - each run's state at clock L (unburnt, burning with its burnt
     intervals, or burnt), by "The model";
   - the arm test, the loss test and the closest call.

   The clock L is an input, so stage 2's real-time clock plugs in
   without a second model.

   Tests:
   - the optimal route always escapes: a property test over seeds, r and
     h;
   - a small hand-built graph for each case: a tie at `L + len = T(w)`,
     a run burning from both ends, h = 0 at the start, a backtrack;
   - the closest call.
2. **The balance measurement (R.6.1).** Run it as soon as the model
   passes its tests. Its verdict is the stage's main result, and the
   handoff carries it even if the cap stops the rest.
   - **Harness.** Copy the K80 research harness (the main checkout's
     `.claude/probes/K80/`: `lib.ts`, `sim.ts`, `run.ts`) into your
     probes folder. Its dailies build through `dailyParams`, which still
     works. Its other design sets go through `designParams`, which still
     calls `codecDefaults(3)`, removed by K132 (41e81b5). `run.ts` builds
     every set up front, so as it stands it throws before playing
     anything. Drop those sets, or build them as
     `.claude/probes/K174/rt/rt_lib.ts` does:
     `paramsFromValues(seed, { ...overrides })`. K80 turns stage 1 ran
     this harness too, so its copy may already carry the fix.
   - **The fire.** Import your shipped module through `lib.ts`'s
     `src(...)`, as the harness imports the rest, so the probe measures
     what ships.
   - **Mazes.** Dailies 1-30 (`dailyParams(n)` in
     `src/ui/daily_link.ts`: today's design on each day's seed).
   - **Players** (recommended; record what you use):
     - the harness's explorer, which knows only its own visits and the
       exit marker's direction: the fogged player;
     - a sighted player for the open board, who knows the maze but
       errs. It follows the shortest route from where it stands, except
       that at each junction it takes another safe arm with probability
       p (0.1, 0.2 and 0.3, drawn from a `TurnRng` so runs reproduce).
       It plays several seeds per maze;
     - the harness's `route` player as the model's check: it must never
       be trapped.

     Every player refuses smoldering arms, as the game does, and is
     trapped when none is left. The fire's light under fog is not
     modeled. It would help the fogged player, so the fog numbers are
     pessimistic.
   - **Grid.** r in {0.75, 0.85, 0.9}, h = 0.
   - **Report** per cell:
     - the trap rate;
     - the closest call's median and 10th percentile over wins, in
       lattice units and in median runs (3.7 lattice units, R.2's median
       daily);
     - the share of wins whose closest call is under one median run;
     - the turns and the length walked, for context.
   - **Verdict.** Apply R.6.1's rule to the table and recommend one of
     three outcomes: keep the mode as it is, make fog part of the mode,
     or drop it.
3. **Params** (R.3.3), appended to the codec table after the last index
   on master when you start. K80 turns stage 1 appends from 109, and
   K111 stage 3 removes 108 and bumps `CODEC_VERSION` to 5, so read the
   table rather than trusting these numbers.
   - `fire` (off | fuse): R.3.3's `sparks` comes in stage 4 (call 6),
     appended then.
   - `fireSpeed` (r, [0.3, 0.95], default 0.75).
   - `fireDelay` (h, lattice units, default 0). Pick its range and
     record it (R.2's median daily has an 80-unit optimal route).
   - Every plumbing site: `UrlParams`, `PARAM_DEFAULTS`, `ENUM_OPTIONS`,
     `CODEC_PARAMS`, the clamps in `parseParams`, and override keys.
     Recommended keys: `fi`, `fsp`, `fdl`. `fr` is taken (`fowRadius`),
     so check each key is free when you start.
   - Not daily-exempt (`DAILY_EXEMPT_KEYS`): the fire changes the game,
     not how it looks. It is off by default, so no link, daily or pin
     moves except the codec table's appended rows.
   - Panel rows, fabric mode only. Show `fireSpeed` and `fireDelay` only
     while `fire` is on, and hide all three under `clk=realtime` (the
     real-time chase; real-time burning is stage 2's `fireClock`). Where
     the rows sit is your call; record it.
4. **The mode in play** (with `fire` on):
   - The controller refuses a smoldering arm with a result of its own (a
     new `FabricTapResult`, "smolder" recommended), so the caller can
     say why. A refused tap is not logged and is not a turn.
   - Burnt runs leave `choices()` (R.3.3). When no safe arm is left, the
     attempt is lost; call 1 says what follows.
   - `replay(taps)` rebuilds the same fire, closest call and loss from
     the taps alone.
   - Reset path relights the fuse (call 2).
   - A toast says why a smoldering tap was refused (`showToast`), and the
     loss gets a banner (`WinBanner` is the model).
   - The HUD shows the fire's lead at your junction, `T(u) - L`, which
     reads as the closest call once solved (call 5 for its units).
5. **A first look, cheap.** Stage 3 builds the final look. Stage 1
   needs only enough to play and judge:
   - Burnt runs, burning runs and the smoldering arms at your junction,
     drawn with something the renderer already draws cheaply. K80 turns'
     telegraph overlay, if its handoff built one, is the first candidate.
     It must be legible at phone fit scale (threads 4-5 px wide).
   - The lit fuse shows at the entrance from the load and stays put
     until the first move (Levi, about 14:46). Recommended: during a
     move the fire advances with the head's animation instead of
     jumping at its end.
   - No paint-shader change: K76 is changing the shader in parallel. If
     you need one, keep it small and say so in the handoff.

### What must not change

- With `fire` off, everything is today's: knot mode's golden snapshot
  (`test/physics/byte_identity.test.ts`), the K87 pin
  (`test/core/maze_plan_identity.test.ts`), the golden dailies
  (`test/ui/daily_link.test.ts`) and the daily's design. The codec pin
  changes only by the appended rows.
- Exporting the Dijkstra changes no result. `test/core/walk_graph.test.ts`
  and the pins stay green untouched.
- Saved attempts and replays of fire-off designs replay as today
  (`test/game/daily_attempt.test.ts`).
- The real-time mode (`clk=realtime`) and the turn-aligned minotaur play
  as on master.
- No paint-shader change (step 5).

### What exists (read first)

- `docs/design/K80_gameplay_additions.md`:
  - R.0, R.2 (the shared machinery), R.3.3 (the burn race), R.4.1 and
    R.4.2 (cuts and the clock), and R.6.1;
  - R.2's "v: 2 -> v: 3" is stale: the daily store is already `v: 3`
    (K146), so typed or timed taps would make it v4;
  - R.4.1's "whichever lands first builds it" (the per-run hide) is
    settled: K76 built it on its own program.
- `docs/design/K80_turns.md`, with its "Stage 1 handoff": the turn
  machinery you share.
- The game and graph code:
  - `src/game/fabric_controller.ts` (`FabricMazeController`: `tapEdge`,
    `choices()`, `replay()`, `reset()`, `respawn()`, `walkedDist`,
    `taps`, `restarts`);
  - `src/core/walk_graph.ts` (`buildWalkGraph`, its `dijkstra` closure,
    `WalkGraph.start`, `distToExit`);
  - `src/core/reveal_plan.ts` (the trace flood: `buildRevealPlan`,
    `FLOOD_SPEED`, `intervalsAt`, `tipsAt`);
  - `src/render/appear_fx.ts` (the `burn` style, for stage 3).
- `src/main.ts`: `handleFabricTap`, `moveAlong`, `keyMoveAlong`,
  `handleChaseTap`, and Reset path (`resetPathAction`, from
  `src/game/daily_attempt.ts`).
- The UI: `src/ui/maze_hud.ts` (`statRows`, `MazeHud`, `WinBanner`;
  distances read x10 as whole numbers) and `src/ui/share.ts`
  (`showToast`).
- Params and links:
  - `src/ui/url_state.ts` (`UrlParams`, `PARAM_DEFAULTS`,
    `ENUM_OPTIONS`, `parseParams`);
  - `src/ui/param_codec.ts` (`CODEC_PARAMS`, `CODEC_VERSION`);
  - `src/ui/daily_link.ts` (`DAILY_EXEMPT_KEYS`, `dailyParams`);
  - `src/ui/tweakpane_panel.ts`.
- The lore that attaches with these files: `gameplay-minotaur.md`,
  `gameplay-fog.md`, `gameplay-daily.md`, `gameplay-links.md` and
  `probes.md`. K100's `vite.fogdaily.config.ts` (in `probes.md`) is
  broken since K132 (K262): to play a daily under fog, set `fogOfWar` in
  the design you build.
- The research harness in the main checkout's `.claude/probes/K80/`:
  - `lib.ts`: `buildMaze`, `designParams`, `toSimGraph`;
  - `sim.ts`: `TurnRng`, `PlayerKind`, `play`;
  - `run.ts` and `run_all.ps1`;
  - `.claude/probes/K174/rt/rt_lib.ts` has the post-K132 design builder.

### Verification

- `npm test` and `npm run build`.
- Unit tests for the model (step 1), the controller's refusal, loss and
  replay, and the codec appends.
- The fire-off pins in "What must not change" pass unchanged.
- The R.6.1 table and verdict in the handoff.
- Desktop screenshots with `scripts/diag_screenshot.mjs` (never
  `--virtual-time-budget`): a race in progress with smoldering arms, a
  near miss, and the loss banner. Drive the taps from a probe script.
  Read `probes.md` first: a bare URL is today's daily, not a fresh
  design, so give every probe URL a query (a token with `fire` on).

### Setup

- Your branch starts from master, after K80 turns stage 1 has merged.
- Link `node_modules` to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`).
- Ports 5720-5729. Give your vite server a private cacheDir.
- Any Chrome you launch gets its own `--user-data-dir` inside your probes
  folder. Delete it when you are done (K161).
- Probes, logs and notes go in `.claude/probes/K114/burn/` (untracked;
  the coordinator copies them at the merge).
- Hold the perf lock (`$env:TEMP\claude-perf.lock`) for any frame-time
  measurement, waiting for it inside one blocking command. The balance
  measurement counts turns and margins, not timings, so it needs no
  lock.
- Running alongside you: (the coordinator fills this at launch).
- If you start helpers, give each `model: sonnet` and this brief's stop
  rule.

### Process

- One stage. Run `Get-Date` at the start and at each milestone. Commit
  WIP on your branch at every milestone, and never push. Don't edit
  `LEDGER.md`.
- Lore:
  - the fire's rules and params go in a new topic file,
    `gameplay-fire.md`, with narrow `paths:` (the fire module and its
    test), a line in `gameplay.md`'s list and a row in
    `docs/lore_index.md`;
  - the codec rows go in `gameplay-links.md`.
- Stop when the stage is done or at your time cap, whichever comes
  first. The cap is two hours on Opus, unless your launch prompt sets
  another. Neither a compaction nor context size is a stop. After a
  compaction, re-read this brief and `git log`, then go on.
- At the stop:
  - commit WIP;
  - append a "Stage 1 handoff" section to this brief. It covers what is
    done, what is next, evidence paths, the R.6.1 table and verdict, the
    calls you built, and "For stage 2" notes;
  - commit it and report.

  Start nothing beyond this stage.
- The final report covers:
  - what changed and where;
  - your calls, including each "Calls for Levi" default you built;
  - the verification results, with the R.6.1 table;
  - a `Ledger items` list: follow-ups, residuals, decisions for Levi;
  - the handle fields: branch, last commit, evidence, next.

## Calls for Levi

Each call has a recommended default. Stage 1 builds the default, and the
handoff says so.

1. **What a loss does.** Recommended: a "Burnt" banner, then a restart
   with the fuse relit and the taps cleared, counted as a restart
   (`reset()`, `restarts`). The alternative, a respawn at the entrance
   like the minotaur's catch, does not work here: the entrance burns
   first.
2. **Reset path with the fire on.** Recommended: a restart (the fuse
   relit), since walking back to the entrance means walking into the
   fire. Reset path inside a daily is stage 4's call.
3. **The fire with the turn-aligned minotaur.** Recommended: mutually
   exclusive in stage 1 (turning one on turns the other off). A catch's
   respawn at a burnt entrance and the fire's time during a wait move are
   undefined. Whether they combine later is Levi's call.
4. **Fog: part of the mode or separate.** Recommended: separate, as
   today (`fogOfWar` stays its own param), until the R.6.1 measurement
   says whether the fire needs fog to bite. R.6.1 itself names "make fog
   part of the mode" as the fallback.
5. **The margin's units.** R.3.3's share line reads lattice units
   ("escaped by 9.2"), but the HUD reads every distance x10 as a whole
   number (`maze_hud.ts`). Recommended: the HUD's units in the HUD (92).
   Stage 4 settles the share line.
6. **`sparks`.** R.3.3 lists it as `fire`'s third option. Recommended:
   deferred to stage 4 and appended then (an appended option moves no
   link).
7. **The fire under `clk=realtime`.** Answered by Levi (2026-10-14,
   about 14:46: "Will we have a toggle for turn-aligned vs realtime
   burning? I think we should!"): stage 2 builds real-time burning
   behind the fire's own toggle, `fireClock`, since `clk=realtime`
   is the real-time chase. Stage 1 still hides the fire rows under
   `clk=realtime`.

## Stage 1 handoff

2026-10-14, about 16:40. Agent af79edbe2a4677ff5 of coordinator session
d8031183, on branch `worktree-agent-af79edbe2a4677ff5` (worktree
`.claude/worktrees/agent-af79edbe2a4677ff5`), rebased onto master faa9a52
(K74 stage 2). Master has since gained only docs and the ledger (8ab25d0,
37446df, 9c04e0c), so the branch merges without another rebase. Stage 1
is done: the model, the measurement and the mode are built, verified and
committed. Nothing is pushed.

### Done

The commits, oldest first (the SHAs change if the merge rebases):

| Commit | What |
|---|---|
| c9cca80 | the fire model, the exported walk Dijkstra, the controller's refusal and loss |
| c014a83 | the fire params, their panel rows and the undo entries (its subject says 117-119; 0cd35f7 renumbered them) |
| b0e02af | the race on the page: the Burnt banner, the smolder toast, the HUD rows, the first look |
| 12da60c | the smolder mark spares the char; the race's lore |
| da177fe | the fire lore names the panel's exclusivity as built |
| 7e4a022 | drawFire redraws only when the threads or the fire move |
| 0cd35f7 | the fire params renumbered to codec v5 118-120 |
| (last) | this handoff; the fire lore's numbers after the rebase |

Where things are:
- `src/game/fire.ts`: the model, whose header is the spec. The fire
  reaches vertex v at T(v) = h + d(v)/r, a run burns from both ends, and
  an arm is safe when L + len < T(far), where L is the length walked.
- `src/core/walk_graph.ts`: `walkDistances`, the walk Dijkstra, exported
  so the fire and the solver share it.
- `src/game/fabric_controller.ts`: `fire`, `fireLost`, `fireClosest`,
  `fireLeadHere` and `smoldering(eid)`. `tap()` returns "smolder" for a
  refused arm: not logged, not a turn, and skipped by replay().
  choices() drops burnt runs.
- `src/ui/url_state.ts`: the params, `fireSettingsOf` and the ranges.
  `fire` is off | fuse. `fireSpeed` is 0.75 in [0.3, 0.95]. `fireDelay`
  is 0 in [0, 40] lattice units: half of R.2's 80-unit median route,
  since a longer delay leaves a careful player nothing to race.
- `src/ui/param_codec.ts`: codec v5 indices 118-120, after K74's
  `hCutShare` (117). `CODEC_VERSION` stays 5.
- `src/ui/tweakpane_panel.ts`: the "Burn race" folder, in the maze folder
  before the minotaur's, on the turn clock only.
- `src/ui/undo_stack.ts`: a change to a fire key restarts the solve
  through onClockChange.
- `src/main.ts`:
  - `fireOf` builds the fire;
  - `pendingLoss` makes the loss wait for the dot, then `showFireLoss`
    shows the banner;
  - the smolder toast and the HUD rows;
  - `restartSolve()`, the one restart;
  - the `__knotFabric().fire` hook.
- `src/ui/maze_hud.ts`: `gameRows` and the `LossBanner` (`#maze-loss`).
- `src/render/fabric_maze_renderer.ts`: the first look. `drawFire` draws
  on `fireGfx`, with the FIRE_* constants and a redraw cache.
- Lore:
  - `.claude/rules/gameplay-fire.md` is new, with its line in
    `gameplay.md` and its row in `docs/lore_index.md`;
  - the codec rows are in `gameplay-links.md`;
  - the probes are in `probes.md`.
- Tests: `test/game/fire.test.ts` (10) and `test/ui/maze_hud.test.ts` (4),
  plus the codec appends in `test/ui/param_codec.test.ts` and
  `test/ui/url_codec.test.ts`.

### Verification

On the rebased branch:
- **Checks.** `tsc` is clean. `npm test` passes 69 files and 898 tests,
  with 1 skipped. `npm run build` exits 0; its chunk-size warning was
  already there.
- **Pins.** The fire-off pins pass untouched: the byte-identity golden,
  K87, the golden dailies and daily_attempt. The codec table pin gained
  only the three rows.
- **Page probes.** `burn_page.mjs` drives a headed real-time Chrome with
  real clicks; `diag_screenshot.mjs` cannot tap. The shots are in
  `shots_rebased/`.
  - The race, on seed 7 with `fsp=0.9`:
    - the lit fuse;
    - a near miss: a lead of 2.076 at the first arrival, 21 on the HUD;
    - a smoldering arm refused, with its toast;
    - the escape along the optimal route, after walking 88.6, with a
      closest call of 21 on the win banner.
  - The loss, on seed 7 at the defaults:
    - trapped after 11 taps, having walked 73.2;
    - the Burnt banner reads time 0:11, walked 732, closest call 23;
    - the clock stops and taps do nothing;
    - × closes the banner and a tap re-shows it;
    - Try again and Reset path each relight the fuse and count a
      restart.
  - Phone-viewport shots (412x915) are in `shots/race_7_phone_*`.

drawFire's cost, on seed 7 with `fsp=0.95` and every run burnt, at rest
after the exit. Not measured on a real phone.

| Condition | Cost a frame |
|---|---|
| Redrawn every frame (before the cache) | about 4.8 ms: drawFire 1.0 + pixi's tessellation 3.8 |
| With the cache, default flow (half-rate re-renders) | about 2.5 ms mean (render p95 5.8 ms) |
| With the cache, flow off (`fw=0`) | about 0 |
| With the cache, 4x CDP CPU throttle (a phone proxy) | about 11 ms: drawFire 1.95 + render 12.4, against a 3.0 ms render without the fire. The frame interval's median rose from 68.7 to 86.8 ms. |

### R.6.1: the measurement and the verdict

`burn_sim.ts` plays dailies 1-30, after K74 stage 2's H1, against the
shipped controller. The optimal routes' median is 94.6 lattice units
(p10 77.9, p90 107.5), and the median run is 3.7. The players:
- **route:** the optimal route, the model check;
- **explorer (fog):** knows only the runs it walked and the exit's
  direction;
- **sighted p:** sees the whole maze and takes a wrong arm with
  probability p at each junction, 8 seeds a maze.

Every player refuses smoldering arms and is trapped when none is left.
The fire's light under fog is not modeled.

How to read the tables:
- "trapped" is the share (count) of 30 games for route and explorer, and
  of 240 for each sighted p.
- The closest calls are over wins, in lattice units and, in brackets, in
  median runs.
- At r 0.85 and 0.9 the explorer's closest-call figures rest on one or
  two wins.

At h = 0 (`results_rebased.md`):

| player | r | trapped | wins | closest median (runs) | closest p10 (runs) | wins < 1 run | turns median | walked median |
|---|---|---|---|---|---|---|---|---|
| route | 0.75 | 0% (0) | 30 | 1.7 (0.45) | 1.0 (0.28) | 80% | 17 | 94.6 |
| explorer (fog) | 0.75 | 90% (27) | 3 | 2.5 (0.67) | 1.5 (0.41) | 67% | 15 | 86.1 |
| sighted p=0.1 | 0.75 | 33% (80) | 160 | 1.5 (0.42) | 0.8 (0.22) | 86% | 18 | 94.6 |
| sighted p=0.2 | 0.75 | 61% (147) | 93 | 1.5 (0.42) | 0.7 (0.20) | 92% | 18 | 92.3 |
| sighted p=0.3 | 0.75 | 80% (193) | 47 | 1.5 (0.41) | 0.5 (0.13) | 85% | 16 | 85.8 |
| route | 0.85 | 0% (0) | 30 | 0.9 (0.24) | 0.5 (0.15) | 100% | 17 | 94.6 |
| explorer (fog) | 0.85 | 93% (28) | 2 | 0.6 (0.16) | 0.6 (0.15) | 100% | 12 | 64.0 |
| sighted p=0.1 | 0.85 | 50% (120) | 120 | 0.8 (0.22) | 0.4 (0.10) | 100% | 17 | 84.0 |
| sighted p=0.2 | 0.85 | 77% (184) | 56 | 1.0 (0.26) | 0.4 (0.11) | 100% | 15.5 | 79.1 |
| sighted p=0.3 | 0.85 | 87% (209) | 31 | 0.8 (0.21) | 0.2 (0.06) | 100% | 12 | 59.7 |
| route | 0.9 | 0% (0) | 30 | 0.6 (0.15) | 0.3 (0.09) | 100% | 17 | 94.6 |
| explorer (fog) | 0.9 | 97% (29) | 1 | 0.1 (0.02) | 0.1 (0.02) | 100% | 11 | 60.8 |
| sighted p=0.1 | 0.9 | 54% (130) | 110 | 0.5 (0.14) | 0.3 (0.09) | 100% | 16 | 78.5 |
| sighted p=0.2 | 0.9 | 81% (194) | 46 | 0.6 (0.16) | 0.4 (0.10) | 100% | 14 | 72.3 |
| sighted p=0.3 | 0.9 | 91% (218) | 22 | 0.5 (0.14) | 0.3 (0.09) | 100% | 11 | 56.6 |

With the fire off everyone solves. The median turns are 17 for route, 38
for the explorer, and 21, 25 and 34.5 for sighted p 0.1, 0.2 and 0.3.

Tuning, r against h (`results_tuning_rebased.md`):

| r | h | sighted 0.1 / 0.2 / 0.3 trapped | explorer trapped | route closest median | route wins < 1 run | sighted 0.1 wins < 1 run |
|---|---|---|---|---|---|---|
| 0.5 | 0 | 7% / 28% / 55% | 73% | 5.0 | 13% | 22% |
| 0.6 | 0 | 16% / 43% / 64% | 87% | 3.4 | 53% | 56% |
| 0.75 | 0 | 33% / 61% / 80% | 90% | 1.7 | 80% | 86% |
| 0.9 | 0 | 54% / 81% / 91% | 97% | 0.6 | 100% | 100% |
| 0.5 | 10 | 3% / 18% / 48% | 77% | 15.0 | 0% | 5% |
| 0.6 | 10 | 7% / 31% / 56% | 70% | 13.4 | 0% | 6% |
| 0.75 | 10 | 18% / 47% / 73% | 87% | 11.7 | 0% | 14% |
| 0.9 | 10 | 33% / 65% / 82% | 90% | 10.6 | 0% | 21% |
| 0.5 | 20 | 3% / 17% / 45% | 73% | 25.0 | 0% | 2% |
| 0.6 | 20 | 5% / 23% / 57% | 73% | 23.4 | 0% | 3% |
| 0.75 | 20 | 11% / 41% / 63% | 87% | 21.7 | 0% | 8% |
| 0.9 | 20 | 21% / 53% / 76% | 87% | 20.6 | 0% | 12% |

**Verdict: keep the mode as it is, with fog separate.** R.6.1's drop rule
("if careful players never come within a run of the fire") does not hold.
80-100% of careful wins come within a run, and mistakes are punished:
sighted p 0.1 is trapped in 33-54% of games.

Caveats:
- **The closest call is set at the start.** At h = 0 it is set at the
  first junction: along the optimal route the margin is
  h + d(v)(1/r - 1), which only grows. So "within a run" mostly measures
  the start, and the trap rates are the real evidence that the fire bites.
- **Fog as part of the mode: no.** The fogged explorer is trapped on
  90-97% of dailies. That figure is pessimistic, since the fire's light
  under fog is not modeled; stage 3 does that.
- **The built defaults (r 0.75, h 0) are hot.** r 0.6 at h 0 roughly
  halves the sighted trap rates and keeps the near miss: 53% of the
  route's wins come within a run. With h >= 10, the optimal route's
  closest call is h plus its h = 0 value, so careful players lose the
  near miss. Retuning is a new call for Levi; I recommend r 0.6, h 0.

### The calls as built

| Call | Status | Built |
|---|---|---|
| 1. What a loss does | Levi answered, as recommended | The Burnt banner. Try again and Reset path call `restartSolve()`, then `updateHud()`: the fuse is relit and it counts as a restart. There is no auto-restart: × closes the banner and a tap re-shows it. |
| 2. Reset path with the fire on | open; the default is built | a restart, with the fuse relit |
| 3. The fire with the turn minotaur | open; the default is built | Exclusive. In the panel, turning one on turns the other off. `fireSettingsOf` is null while `minotaur` is not off, so a link that sets both plays the minotaur. |
| 4. Fog | open; the default is built | separate; R.6.1 says the fire bites without it |
| 5. The margin's units | Levi answered | x10 in the HUD: "fire lead" while racing and "closest call" after. Both show with the stats off, and both banners show the closest call. |
| 6. `sparks` | Levi answered | deferred to stage 4 |
| 7. `clk=realtime` | Levi answered | The rows hide under `clk=realtime`, and `fireSettingsOf` is null there. |

Other choices made in stage 1:
- **The toast.** The smolder toast shows at most once per 1.5 s. The key
  picker keeps smoldering arms, so a key press toasts as well.
- **The loss.** It waits for the dot's arrival (`pendingLoss`).
- **The drawn clock.** It rides the move animation,
  L = walkedDist - (1 - moveProgress) * runLength, so the fronts advance
  with the dot.
- **The smolder mark.** It runs from the head to the first burnt stretch.
- **No paint-shader change.** The first look is Graphics strokes on
  `fireGfx`, redrawn only when update() ran or the fire's key changed.

### Next: stage 2

Stage 2 is real-time burning behind `fireClock` (turn | realtime).

For stage 2:
- **One clock getter.** fire.ts takes the clock L as an input
  everywhere. The controller reads `this.walkedDist` as L in four
  places: choices(), fireLeadHere, smoldering() and the arrival check.
  Give it one clock getter first.
- **Two new losses.** Real time adds two that turn play cannot produce:
  - the fire reaching the head's junction while the player stands
    (T(head) <= L);
  - the fire catching the dot mid-run (the dot inside the run's burnt
    interval).

  The arrival-only check covers neither.
- **The restart.** `restartSolve()` then `updateHud()` is the one restart.
  K80 turns stage 2's catch toggle builds on it too.
- **The redraw cache.** Its key, `fireKey`, holds L, the head, solved,
  fireLost, the move animation and the thread width; it must include the
  new clock. A real-time clock redraws every frame. With everything burnt
  that costs about 11 ms a frame at 4x CPU throttling, so stage 3's
  shader look may have to come first or alongside.
- **The codec.** `fireClock` appends after master's last index; 118-120
  are the fire's.
- **The renderer.** `fireGfx` is created in the renderer's constructor
  next to K76's markers, over the yarn and under the markers. `drawFire`
  runs every frame in main.ts's fabricTick.
- **The exclusivity.** It lives in `fireSettingsOf` (url_state.ts) and in
  the panel's Burn race handlers.
- **The chase clock.** The real-time chase's fixed-step clock is in
  `src/game/minotaur.ts`.

### Known residuals

- **The fire ignores the thread reveal.** drawFire draws every run's fire,
  so K76's thread reveal does not hide unseen fire. The fog sprite does
  cover it.
- **The char covers the gaps.** The char stroke draws over crossing gaps.
- **runPoints is approximate.** It maps lattice distance to ctrl
  linearly, which is approximate on mixed diagonal runs.
- **A zero lead at the start.** At h = 0 the HUD's fire lead reads 0
  until the first move.
- **Backtracks are refused.** Right after a move, the run just walked is
  usually smoldering, so a backtrack is refused, and the toast's wording
  reads oddly there.
- **The share line's margin.** At h = 0 the closest call is the first
  junction's. Stage 4's share line could use the exit margin instead
  (h + opt/r - walked).

### Evidence

All in `.claude/probes/K114/burn/` (untracked):
- **The harness:** `burn_sim.ts`, `lib.ts` and `vite.node.config.mjs`.
  probes.md has the run line.
- **The results:**
  - `results_rebased.md` and `results_tuning_rebased.md` are current;
  - `results.md` and `results_tuning.md` are from before H1;
  - the logs are `burn_sim*.log`.
- **The page probe:** `burn_page.mjs` and its `page_*.log` files.
- **The shots:**
  - `shots_rebased/` is current;
  - `shots/` is from before the rebase, with the phone viewport;
  - `shots_cached/`, `shots_fw0/` and `shots_throttle/` hold the drawFire
    cost runs.
- **The checks:** `test_full_rebased.log` and `build_rebased.log`.
- **The dev server config:** `vite.private-cache.config.ts`.

## Stage 3a plan

Agent K290 (burn stage 3a), branch `worktree-agent-adb9f09e19dfd0c55`,
started 2026-10-15 03:27, cap 05:27. After a compaction: re-read this
section, the brief and `git log`; read code by grep and narrow ranges.

### Done (item 1, the param; committed with this section)

- `url_state.ts`: `BurntMode` gone | char, `BURNT_MODES`, UrlParams
  `burnt`, PARAM_DEFAULTS `burnt: "gone"` (last), enum table, override
  key `fbt`. `param_codec.ts`: `choice("burnt", ...)` at index 139
  (CODEC_VERSION stays 6). Tests: `param_codec.test.ts` pin appended,
  `url_codec.test.ts` defaults + override tables.
- `tweakpane_panel.ts`: `burntRow` after fireDelayRow in "Burn race",
  onTrailChange, hidden while fire is off. `undo_stack.ts`: `burnt` under
  onTrailChange (one word; not in the brief's file list).
- `main.ts` wiring line 1: `syncExploration` sets `f.burntLook`.
- Call: `burnt` is not daily-exempt (like the fire keys).

### Where things are (fabric_maze_renderer.ts unless named)

- `explore` 456, `exploreLast` 461, fire fields 487-491.
- `shownAt` 814 (gates on `explore.on`; change to `ribbons.exploreOn` so
  burnt-hidden thread is empty space). Minotaur gate 1040, exit 1076,
  `exploreVisibleBounds` 1829: keep `explore.on` and `exploreLast` (the
  reveal's meaning: the camera frames the reveal, not the burn).
- `drawFire` 1152-1244: clock L (1162), key (1163), char/ash strokes
  1224-1225 (remove for 3a; keep smolder, embers, fuse); `runPoints` 1249
  (k = (ctrlB - ctrlA) / length, c = ctrlA + x k). main.ts calls drawFire
  every fabric frame (~4565).
- `syncExplore` 2425-2469 (off -> setExplore(null); on -> exploreView ->
  `ribbons.setExplore(pieces, look, 1)` -> drawFrontierMarks). Callers:
  update() 2050, move frames 2112, tickExplore 2388, setExploreHold 2402.
- `ribbon_renderer.ts` explore section 4532-4990: writePaintItems 4538
  (`touch()` sets painted[] unless type is VIS), setExplore 4679,
  applyExploreGaps 4744, syncExploreJoints 4857, exploreOn 4919,
  exploreVisAt 4925, exploreShownAt 4942.
- `explore_glsl.ts`: EXPLORE_ITEM_VIS 5, visItem, chainWhole,
  EXPLORE_VIS_GLSL 252-310 (kExploreAt; early return on KPAINT chain .x),
  EXPLORE_MAIN_GLSL 437-459 (`if (exHere) {...}`, `aM *= ev`), before
  `gapKeep`; withExplore 522. `arm_strip.ts` STRIP_EXPLORE_* 267-288.
- `fire.ts` `runBurnAt(walk, fire, eid, L)`: unburnt | burning {burnt
  [[x0,x1]] from va, front} | burnt.

### Gone (item 2): compose the burn into the explore declaration

- Pure `subtractBurnt(pieces, spans, ringN)` in `explore_view.ts`
  (tested): each burnt span (unwrapped ctrls from runBurnAt at drawFire's
  L) cut out of each piece of its chain (rings: span copies at -n, 0,
  +n). A remnant keeps its far fade and tip; a cut end is hard (f 0, tip
  false). Reveal off: base pieces = every chain whole. Nothing burnt and
  reveal off -> setExplore(null) (master's frame).
- The ribbons get the composed pieces; `exploreLast` stays the reveal's
  view (camera, halos). syncExplore's off branch declares when the fire
  burns something. drawFire triggers syncExplore when its key (L, burnt
  mode) changes.
- Reused unchanged: gap gate + K268 shaped cut (under-gaps close where the
  over thread is burnt), joint gate (a passed junction hides), strip fans
  (a burnt arm drops out of its fan), culling, picking.

### Char (item 3)

- New item `EXPLORE_ITEM_CHAR` 6 over burnt spans (not painted; kPaintAt
  skips it). Chain flag in KPAINT texel `chain` .y: a chain with char
  skips kExploreAt's whole-chain early return. EXPLORE_MAIN: rgb mixed to
  the char color (0x22140e, ash core 0x7a3a22) by the char coverage,
  before the gap mask, so the crossing gaps stay. Char mode: visibility =
  the reveal's pieces (or every chain whole), char items over the burnt
  spans. Fans/strips char: optional, else a residual.

### Order

1. Param WIP commit (this). 2. subtractBurnt + tests, wiring (syncExplore,
drawFire trigger, shownAt), drop the char strokes; WIP commit. 3. Char
GLSL + CHAR items; compile_glsl.mjs; WIP commit. 4. tsc, npm test (lock),
build, fire-off 0 px vs master, sheet (seed 7, fi=fuse, gone/char x
reveal off/on x early/mid/late) in `.claude/probes/K290/stage3a/`. 5. Lore
(gameplay-fire, gameplay-links, gameplay-panel, render-explore,
render-shaders), handoff here, release the lock, SubagentHandback.

## Stage 3a handoff

**Levi's calls (2026-10-15, K383):** as built (calls 1 and 4: `burnt`
defaults to gone and is not daily-exempt; char shows only where the
reveal does), except call 5: the start marker HIDES once its thread has
burnt, under both looks, faded like the other markers' transitions (sent
to stage 3b). Stage 3b draws unseen fire fronts as nothing, like char.

2026-10-15, about 04:40. Agent adb9f09e19dfd0c55 (K290) of coordinator
session d8031183, on branch `worktree-agent-adb9f09e19dfd0c55` (worktree
`.claude/worktrees/agent-adb9f09e19dfd0c55`), based on master f799991.
Stage 3a is done: brief items 1-3 and 5 are built and committed, and item
4 is measured below. Nothing is pushed. Commits: 7d52824 (the param and
the plan), 2231664 (`subtractBurnt`, `wholePieces`, 8 tests), c7a03e0 (the
burn in the shaders, gone and char), f0874ed (the probe hook and the
lore), then this handoff. The lore is in gameplay-fire.md (BURNT THREAD),
gameplay-links.md (BURNT PARAM), gameplay-panel.md (BURNT ROW),
render-explore.md (THE BURN) and render-shaders.md.

### Done

- GONE: burnt stretches are cut out of the declared visibility pieces
  (`subtractBurnt`; a cut through a piece's solid part is a hard end, no
  fade and no frontier). The explore machinery that already existed does
  the rest: an under-thread's crossing gap closes where its over thread is
  burnt, a fan drops a burnt arm, a junction whose arms are all gone
  hides, a chain with nothing left is culled.
- CHAR: CHAR items (type 6) in the KPAINT rows, a chain flag in the chain
  texel's .y, `kCharAt` / `kCharLook` in the section's explore variant and
  `kStripChar` in the arm strip's. Char 0x22140e at 0.9, an ash core
  0x7a3a22 at 0.75 where |vUV.y - 0.5| < 0.15 (ribbons only), each end
  ramped over 0.08 ctrl. Drawn before the gap mask, so the crossing gaps
  cut char like thread.
- Stage 1's char and ash Graphics strokes are removed. Its embers,
  smoldering arms and lit fuse still draw (stage 3b).
- Files outside the brief's list: `src/main.ts` (`f.burntLook =
  params.burnt` in syncExploration; the hook's `burnt` key);
  `src/ui/undo_stack.ts` (`burnt` under onTrailChange's LIVE_EFFECTS);
  `src/render/ribbon_renderer.ts` (`sameBurn`, the CHAR items in
  writePaintItems, `exploreBurn` and `exploreGateByChain`, setExplore's
  `burn` argument, the joint rule and `exploreGateVisAt`);
  `src/render/paint_model.ts` (`setExploreFlags(flags, char)`);
  `test/render/paint_ring_lap.test.ts` (the nearest-lap formula's count
  1 -> 2, since kCharAt reuses it); new `test/game/explore_burn.test.ts`;
  `param_codec.test.ts` and `url_codec.test.ts` appended.
- No CPU twin of kCharAt or kStripChar (K152 item 3, Levi 2026-10-14).

### Calls made (each easy to reverse)

1. DEFAULT `gone` (the brief: "burnt runs are gone"), char the option.
   Not daily-exempt, like the fire keys; a daily plays with the fire off.
   Alternative: exempt it as a viewer's look preference.
2. JOINTS UNDER A BURN: the reveal's own pieces (the gate) apply 2b's hide
   rule; the declared pieces hide a junction only when every arm is gone,
   otherwise the web draws and a burnt arm's lobe fades with its strip.
   Alternatives: hide the web when any arm burns; or the all-arms rule
   everywhere, which changes K76 2b's transients.
3. REVEAL OFF AND SOMETHING BURNT: every chain is declared whole, less the
   burnt stretches under gone, so the explore programs draw the rest of
   the race. Nothing burnt keeps master's path (measured 0 px). Costs:
   `ribbons.exploreOn` stays true, so picking uses pickThread even under
   char; the explore programs link cold at the first burn; the frame cost
   is not measured. Alternative: a burn-only program variant, or a
   per-chain switch onto the explore programs.
4. CHAR UNDER THE REVEAL shows only what the reveal shows: the declared
   visibility scales char (`aM *= ev`), so unseen burnt thread stays
   hidden. Observed: sheet a12_on_char draws char along the walked route
   only, a12_off_char the whole burnt half. Alternative: char every burnt
   stretch under the reveal, as stage 1's strokes did; that shows the
   fire's spread, and with it the maze, outside the reveal.
5. MARKERS AND CAMERA UNDER GONE: the start marker still draws once its
   run burns, over empty space (sheet a01_on_gone). The exit marker hides
   once its point burns (by the code's exploreVisAt test; the exit never
   burnt in the sheet). The fit camera keeps framing the reveal's pieces
   (`exploreVisibleBounds` keeps `explore.on` and `exploreLast`).
6. CUT ENDS are hard at the fire: no fade, and no frontier halo (halos at
   gone points are filtered by `burntGoneAt`). The ash core draws on
   ribbons only, not on fans or strips.
7. PROBE HOOK `__knotExplore({burnt})` added to main.ts.

### Verification

Desktop RX 6800 XT, ANGLE on D3D11; every GPU run held the perf lock.

- FIRE OFF, same state, branch c7a03e0 against master f799991
  (`k290_ab.mjs ab http://localhost:5821/ http://localhost:5820/ <out>
  desktop`, link `k111&am=instant&snd=none&fw=0&phy=0`): 31/31 checks at
  0 px (reveal off at four pulse phases, a hovered choice, reveal on
  (beacon) at two phases, on then off, A/A floors 0; `ab/run2.log`). The
  first run differed by 14-18k px until the probe pinned the halo breath
  (`exploreClock = 1000`, tickExplore with dt 0).
- FIRE ON, NOTHING BURNT (`LINK=` the same link plus `&fi=fuse&fdl=40`,
  two moves in): 31/31 at 0 px (`ab/run_fire_unburnt.log`, frames in
  `ab_fire_unburnt/`). The fire's presence is indirect: "mode on changes
  the frame" reads 383778 against the fire-off run's 382325 px (the lit
  fuse), and the branch's mode-off state reads exploreOn false.
- WARNINGS (`warn_check.mjs <base> plain`, seed 7 `fi=fuse&fsp=0.9`, the
  optimal route): both builds print the same 13 PixiJS "Attribute aGap /
  aGapId / aUV is not present in the shader" warnings at load and none
  during the walk, so they predate 3a. The branch's burnt spans go from 1
  to 273 over 14 arrivals; both builds solve.
- `npm test`: 81 files, 1117 passed (1 file and 1 test skipped), 106 s;
  tsc clean.
- SwiftShader compiles all 8 variants. Fragment lengths: section 47521,
  its explore variant 55976; strip 33023, explore 37011 (was 34987);
  field 28482, explore 32936 (unchanged); still 19958, explore 23991
  (unchanged).
- CONTACT SHEET (`sheet.mjs http://localhost:5820/ <out>`, seed 7
  `fi=fuse&fsp=0.9`, the optimal route, 14 arrivals, solved, never lost):
  picks early #1 (1.1% burnt), mid #12 (40.5%), late #13 (77.2%); gone and
  char, reveal off and on. Under gone with the reveal off, the culled
  chains go 0 -> 34 -> 71 of 92. Char keeps the crossing gaps. Stage 1's
  embers float over empty space under gone, and under the reveal they draw
  at every front, seen or not (a12_on_char: about 30 over hidden thread).
- Inferred, not measured: the explore programs' frame cost through a
  race; the cold-compile freeze at the first burn; a still pluck during a
  burn (`pluck-still-explore`).

### Residuals and next

- COLD COMPILE AT THE FIRST BURN: a fire race switches every ribbon, strip
  and fan onto the explore programs at its first burnt stretch, so K307's
  warm-up must cover `section-rgb`'s explore variant, `arm-strip-explore`
  and `junction-field-explore` for fire links (likely
  `pluck-still-explore` too), or the first burn freezes the screen.
- Time a race's frames with the reveal off (`burn_page.mjs perf`, both
  builds, under the lock).
- STAGE 1'S EMBERS LEAK UNSEEN FIRE under the reveal (a12_on_char), and a
  red line from the head over hidden thread there is, by its color, stage
  1's smoldering-arm mark (not attributed). 3b replaces them; whether an
  unseen front shows is Levi's call.
- The start marker over empty space once its run burns (Levi's call).
- pickThread for the rest of the race once a burn is declared, even under
  char: check the pick feel, or gate it to gone.
- `pieceVis`' ring unwrap is ill-defined for a piece longer than n - 2
  fade (pre-existing): a guard and a test in explore_view.
- The 13 PixiJS attribute warnings at load (master has them): attribute
  the mesh and program pairs.
- STAGE 3B (the brief's list): the front's char band and embers, the
  `burn` FX on tipsAt, the lit fuse, fire light under fog, the phone
  sheet; replace stage 1's ember, smolder and fuse Graphics.

### Evidence

`.claude/probes/K290/stage3a/`, untracked, in this worktree: copy it to
the main checkout before the worktree is removed. `k290_ab.mjs` (ab),
`sheet.mjs`, `warn_check.mjs`, `dump_variants.ts` (the SwiftShader
compile), `lock_take.ps1`, `lock_release.ps1`; results in `ab/`,
`ab_fire_unburnt/`, `warn/`, `frag/`; the builds in `builds/` (`mine`,
`master`); the sheet in `sheet/` (`K290_3a_sheet_full.png`,
`K290_3a_sheet_crop.png`, the per-arrival `aNN_{off,on}_{gone,char}`
frames and crops, `shots.json`, `sheet_run.log`).

## Stage 3b brief: the fire's look

One stage: opus, 2 h cap. Written 2026-10-15 about 07:30 by coordinator
session 05e60da0, from "The stages" (stage 3) and the Stage 3a handoff.
Stage 1's "Setup" and "Process" apply, except: your branch starts from
master; ports 5830-5839; probes in `.claude/probes/K290/stage3b/`; the
handoff is a "Stage 3b handoff" at the end of this file (done, not done,
evidence, your calls, "For the next stage"). 3a's tools are in the main
checkout's `.claude/probes/K290/stage3a/` (`k290_ab.mjs`, `sheet.mjs`,
`warn_check.mjs`); copy what you use.

1. **The front.** R.3.3's char band and embers at the fire front, drawn
   in the explore programs, so a thread blackens before it vanishes under
   gone, and the band respects the crossing gaps. They replace stage 1's
   ember, smolder and fuse Graphics: delete those.
2. **The `burn` frontier FX** on the flood tips (`tipsAt`; `appear_fx.ts`).
3. **The lit fuse** burns in place at the entrance until the first move.
4. **The fire's light under fog:** burning threads show the branches the
   fire has reached and you have not.
5. **Unseen fronts draw as nothing,** as char does (K383's rec; Levi may
   overturn it, so keep it one switch).
6. **The first burn's cold compile** (3a's first residual): K307's
   warm-up covers the explore variants on fire links (`section-rgb`'s
   explore variant, `arm-strip-explore`, `junction-field-explore`,
   probably `pluck-still-explore`; `render-shaders.md`, "THE WARM-UP").
   Show that the first burn no longer links a program cold.
7. **A race's frames** with the reveal off (`burn_page.mjs perf`, your
   build against master, under the perf lock): K382.
8. **The contact sheet,** desktop and phone: gone and char, the reveal
   off and on, fog on, early, mid and late in a race, a lit fuse, an
   unseen front. The phone half comes after 08:30, under the phone lock.
9. **Checks.** Fire off stays 0 px against master (3a's `k290_ab.mjs ab`);
   `npm test` and `npm run build` are green; the golden, the K87 pin and
   the golden dailies don't move. As a render prototype, the stage still
   skips the `paint_math` mirror and the parity tests (K152 item 3).
10. **Lore:** `render-explore.md` (THE BURN) and `gameplay-fire.md`.

- **The phone.** Levi has it until 08:30: don't touch it before then.
  After that, take the phone lock with
  `pwsh C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents\phone_lock_take.ps1
  -Owner "K290 3b <your agent id>" -What "<what>"` (it waits inside the
  call), run `scripts/phone.ps1`, shoot, and release it with
  `phone_lock_release.ps1 -Owner "K290 3b <your agent id>"`. Hold it at
  most 20 minutes at a time: K7 stage 7 and K395 need the phone too.
  Never print the phone's IP address.
- **Running alongside:** K7 stage 7 (`main.ts`'s boot, the physics
  worker) and K395 (the pluck files, and pluckNodes in
  `ribbon_renderer.ts`). Keep `main.ts` edits small and out of the boot.

## Stage 3b handoff

Agent a7c0069bafcb78c52 of coordinator session 05e60da0, 2026-10-15
07:24 to about 09:00, stopped with everything done except the phone half
of the contact sheet. Branch `worktree-agent-a7c0069bafcb78c52` from
21d701e, unpushed: ef7f08b (the look, WIP), d64e9c7 (the K299 entry),
0df3eb3 (lore), f8e7d7d (the lit fuse in world terms) and this handoff.
No `main.ts` edits. The record of the look is render-explore.md's THE
BURN, stage 3b, and gameplay-fire.md's THE FIRE.

### Done

1. **The front.** `drawFire` declares a `BurnFront` for each burnt
   stretch `runBurnAt` pairs with a front, and the explore programs draw
   it (`EXPLORE_ITEM_FRONT` in the KPAINT item rows, read by kCharAt;
   `kEmberLook` after kCharLook inside `if (exHere)`, so the crossing gaps
   cut it like thread). Under char, a dark band ahead of each burning
   front (0.7 ctrl, meeting the span's own ramp); an ember at every front
   (0xff7a1a, a hot core 0xffe08a). Smoldering choices draw as a hot
   centerline (`EXPLORE_ITEM_SMOLDER`) from the head to the first burnt
   stretch, at rest only. Stage 1's Graphics (char strokes, embers,
   smoldering arms, the fuse ring) is deleted.
2. **The `burn` FX.** One lazy `AppearFxSystem` (style `burn`) over the
   yarn and under the markers and the fog; `spawnFrontier` at each front
   at 0.4 of the appearance's rates, the rate shared past 12 fronts. Under
   Reduced motion or in a hidden tab, nothing spawns.
3. **The lit fuse.** While L <= delay, a kind-1 front on each of the
   start's runs, where the thread first lies marker radius + 1.0 thread
   width (world) from the start disc's center (`runOut`). The first
   version used that world length as a lattice distance, which put the
   ember under the disc (c 1.54, centered at 731 px against the rim at
   733). f8e7d7d moves it to c 2.55 (746-757 px).
4. **Fire light under fog.** A soft hole at each burning front, 0.75 of
   the stamp radius (`fogFireLights`). The fog redraws only when a light
   appears, goes, or moves 0.3 world.
5. **Unseen fronts draw as nothing.** This is one switch,
   `FIRE_UNSEEN_FRONTS` (false). Under the reveal, the ember scales by the
   declared visibility as char does, and no FX spawns there. True would
   draw 0.4 ctrl of thread there and emit.
6. **The warm-up.** K307's wave 1 already links the three explore
   variants (`section-rgb`'s explore variant, `arm-strip-explore`,
   `junction-field-explore`). `__knotWarmup()` showed them linked with
   3b's grown texts, with no shader errors. The first burn itself was
   not traced (see "For the next stage").
7. **A race's frames (K382).** `burn_page.mjs perf` on seed 7 at
   `fsp=0.95`, measured at rest after the escape (278 runs), under the
   perf lock, against 21d701e:
   - The frame interval does not move, fire drawn or not, on both builds:
     on the desktop P50 17.4-17.5 ms and P95 18.1; under 4x CPU
     throttling, 51-52 and 70-71.
   - The fire's own CPU per frame on the desktop: drawFire 0.18-0.21 ms
     (it spawns the FX), plus about 0.2 ms of pixi render for the FX.
     Master, with stage 1's cached Graphics: 0.06 and 0.04-0.1.
   - Under 4x throttling: 0.85-0.89 and 0.8-0.9 ms (master 0.26-0.29 and
     0.2-0.4).
8. **The desktop contact sheet.** `sheet.mjs` (3a's, plus a lit-fuse row)
   on the branch build (0df3eb3+, which includes the fuse fix): seed 7 at
   `fsp=0.9` on the optimal route, 14 arrivals, solved and never lost, no
   context loss. Rows: the lit fuse #0, early #1 (1% burnt), mid #12
   (40%), late #13 (77%). Each row has gone and char, with the reveal off
   and on.
   - The fuse's ember glows just past the start disc.
   - Smoke rises at every front with the reveal off, and only at the seen
     fronts with it on (mid #12).
   - A smoldering arm draws as a red centerline (late #13).
9. **Checks.**
   - Fire off against 21d701e (3a's `k290_ab.mjs ab`): 31/31 checks,
     every frame 0 px. Run on ef7f08b; f8e7d7d touches only the fire's
     path.
   - `npm test`: 1155 passed, 84 files, 1 skipped; the golden, the K87
     pin and the golden dailies did not move. `npm run build` is green.
   - SwiftShader compiles all 8 variants. The section's explore variant
     went from 56595 to 58529 characters and `arm-strip-explore` from
     37084 to 38559; the others are unchanged.
   - K299's ring-lap scan lists the front's nearest-lap floor as a
     reviewed site.
   - As the brief allows, the stage skips the `paint_math` mirror and the
     parity tests.
10. **Lore:**
    - render-explore.md: THE BURN, stage 3b (model, shaders, unseen
      fronts, FX, fog light, THE EMBER DRAWS, measured);
    - gameplay-fire.md: THE FIRE, with stage 1's first look retired;
    - render-shaders.md: the two grown variants.

### Not done

- **Item 8's phone half.** The phone lock was never taken. The desktop
  sheet also lacks the fog-on row and a dedicated unseen-front frame. The
  reveal-on cells show unseen fronts only by their absence.
- **K383** (hide the start marker once the thread under it has burnt) is
  not built, as instructed.

### Evidence

`.claude/probes/K290/stage3b/` is untracked and lives in this worktree.
Copy it to the main checkout before the worktree is removed.

- Scripts:
  - `k290_ab.mjs` (the fire-off A/B);
  - `burn_page.mjs` (perf ported: phase B clears `fireFx`);
  - `sheet.mjs` (outDir now absolute for mksheet);
  - `look.mjs`, `zoom.mjs`, `fuse_diag.mjs`, `gfind.mjs`;
  - `ember_px.mjs`, `ember_read.mjs`, `ember_dbg.mjs`, `ember_dbg2.mjs`,
    `ember_dbg3.mjs` (these need the debug view below);
  - `dump_variants.ts` (the SwiftShader compile), `warn_check.mjs`,
    `png.mjs`;
  - `lock_take.ps1`, `lock_release.ps1`,
    `vite.private-cache.config.ts`.
- Results:
  - `out/ab`, with `ab_desktop.log`;
  - `out/variants`;
  - `out/look1`, `px1`, `fuse1`, `dbg1`-`dbg4`;
  - `out/perf_master` and `out/perf_branch`: `perf_7_perf.json` and
    `perf_7_x4_perf.json`;
  - `out/sheet`: `K290_3b_sheet_full.png`, `K290_3b_sheet_crop.png`,
    `shots.json`, the per-arrival frames and crops.
- Logs: `npm_test.log`, `npm_test2.log`, `build.log`.

### My calls

- **A static glow.** The shaders have no fire clock; the motion comes
  from the FX.
- **Band widths in ctrl** (about 1.93 ctrl per lattice unit): the band
  is 0.7, the ember reaches 0.25 ahead and 0.55 behind. They are short in
  world terms.
- **Fronts come from `runBurnAt`'s `front[]`,** paired with the burnt
  stretches.
- **The fuse sits at the disc radius + 1.0 thread width in world terms,**
  at most half the run.
- **Smolder only at rest,** in a live race (no move in flight, not solved,
  not lost), and not on the arm strips.
- **FX at 0.4 of the appearance's rates,** shared past 12 fronts.
- **Fog light only at burning fronts,** not at the fuse: the entrance is
  explored anyway.
- **`FIRE_UNSEEN_FRONTS` false,** which Levi accepted.

### For the next stage

- **The phone sheet** under the phone lock, plus a fog-on row and an
  unseen-front frame; then the merge (the coordinator's call).
- **K383:** in `fabric_maze_renderer.ts` drawMarkers, gate on the burnt
  spans covering `walk.start`'s thread point, use the marker fade, and add
  a test.
- **Look at the sheet for widths.**
  - Under gone, only a thin rim of ember shows at the cut end, because
    the ember's behind part lies on gone thread.
  - The fuse's ember sits partly under the FX smoke.
  - Consider band and ember widths in world units, or moving the ember
    onto the unburnt side under gone.
- **Time a cold link** of the grown section explore variant
  (`trace_intro.mjs`, a fresh profile). Also trace the first burn on a
  cold cache, to show item 6 directly.
- **When the look is final,** add the FRONT and SMOLDER items to the
  `paint_math` mirror and the parity tests (K152 item 3).
- **Debug view 7 is the ember's x-ray** (render-explore.md, THE EMBER
  DRAWS). It is a dev-server edit only: never commit it. A probe that
  injects fronts must first stub `syncExplore` and `drawFire`.
- **Still open from 3a:**
  - pickThread under a declared burn;
  - `pieceVis`' ring-unwrap guard;
  - the PixiJS attribute warnings at load (aGap, aGapId, aUV), which
    master has too.

## Stage 3c handoff (the phone sheet)

Agent ab1de7b1a6f3f605a of coordinator session 05e60da0, 2026-10-15
10:17 to 11:29, a probe stage: no source, test, script or rules
file changed. Branch `worktree-agent-ab1de7b1a6f3f605a` from e6e1734
(3b is in it: merged as f7dd57e, with K80's 3a), unpushed; this handoff
is its only commit. Everything was probed on e6e1734 itself (the page's
stamp read `P4 v0.4.0 e6e1734 2026-10-15 17:38`). Master has moved on
(957f04d, 17 commits ahead at 11:25): see "Master moved" under item 6.
The phone was Levi's, lent until about 11:10; its locks are released and
my server is stopped. The width call (K409) waits on Levi: this stage
gives him the facts and decides nothing. The sheets are in the main
checkout's `.claude/probes/K290/stage3c/out/sheets/` (see Evidence).

### Done

1. **The phone sheet.** 3b's cells on the phone's own Chrome.
   - Setup: Levi's Pixel 11 over USB, the production build of e6e1734
     served from the desktop on port 5890 through `adb reverse`. Link
     `?7&am=instant&fi=fuse&fsp=0.9&snd=none` (seed 7, the optimal
     route, 14 arrivals, as 3b's desktop sheet). The tab was 411x753 CSS
     px at dpr 2.625 (the canvas caps its dpr at 2); every shot is the
     full 1079x1977 frame, plus a 578x420 device px crop around the head
     (220x160 CSS px at 1:1). The physics worker ran (host kind
     `worker`), the page's wake-lock check read `True`, `ctxLost` 0.
   - The run (10:41:51 to 10:46:50, the sheet and the fog run) solved the
     maze and never lost. All 14 arrivals matched 3b's desktop run
     exactly (node, walked, lead, spans, fronts, burnt share; #12
     node_666, walked 65.18, lead 7.243, 146 spans, 29 fronts, 0.4049;
     #13 node_676, 86.38, 9.598, 264, 31, 0.7725). The knot was asleep
     at every arrival. Thermals (skin, SoC, battery, C): 33.0, 34.8,
     32.3 before; 37.5, 45.4, 36.1 after.
   - The watchdog never tripped. It watched the touchscreen with
     `getevent` and polled the power state (awake, keyguard off, Chrome
     on top) every 36 s; the user-activity timestamp never moved.
   - Phone timings are not a benchmark: a desktop probe ran beside the
     phone from 10:44, under the same perf lock.
   - `out/sheets/K290_3c_phone_full.png` (frames at 0.28x) and
     `K290_3c_phone_crop.png`: four rows (#0 the lit fuse, #1 early,
     #12 mid, #13 late) by four columns (reveal off gone | off char |
     on gone | on char). What they show:
     - **#0 the lit fuse** (gone and char alike: the fuse has no burnt
       side). Reveal off, at the phone's fit scale (s 8.8; the maze
       fills the top 40% of the portrait frame): a tiny orange speck
       inside a grey smoke glow beside the start disc, and a pale ramp
       that is the choice pulse, not the fire. Reveal on (s 86): a huge
       start disc, the thread stub ending in a pale rounded cap with
       orange sparks and ember blobs in it, a tan and pink smoke haze, a
       teal glow.
     - **#1 early** (1% is the burnt share of ALL thread; the burnt
       route is 16.6 of the 18.68 ctrl walked). Reveal off, gone: the
       start marker floats with no thread to the head; by the head a
       pale thread with an orange and yellow strip, a small ember and a
       smoke puff at the front. Char: the dark brown route from the start
       marker to the head, with a thin orange halo. Reveal on, gone: the
       start marker alone at the top left, and at the head a pale
       lavender thread, an orange and yellow arc with a red core, an
       ember at its end, grey smoke puffs and teal glows. Char: the same,
       plus the dark brown burnt route curving in from the start and a
       char loop below the front.
     - **#12 mid** (40%). Reveal off, gone: the left and top of the maze
       cut away, ragged cut ends with grey smoke puffs and only a few
       device px of orange rim. Char: those threads dark brown with
       orange-brown outlines, the cut ends with smoke and small embers.
       Reveal on, gone: only the head's neighborhood (a yellow arc with a
       red core, the head, blue and teal junction glows). Char: the dark
       brown walked route from the start to the head, with about twelve
       blue-ringed glow dots (the choice and branch markers, which gone
       removes with the route) and branch stubs.
     - **#13 late** (77%). Reveal off, gone: sparse fragments, smoke
       puffs and tiny orange rims. Char: nearly everything dark brown,
       with a few colored fragments. Reveal on, gone: the head, an orange
       and yellow arc ending in a smoke puff, the finish marker. Char:
       the same plus the long dark brown route with blue glow dots.
     - Nothing odd or broken in any frame; the vellum backdrop is in all
       of them.
2. **The fog row.** The same link plus `&xp=fog`:
   `K290_3c_phone_fog_full.png` and `_phone_fog_crop.png` (gone | char,
   the same four moments). It works as designed.
   - #0: the start disc inside a fog hole with its two threads, the
     smoke glow and orange sparks (gone and char alike).
   - #1: a fog hole around the head. Gone: the start marker floats, no
     route, a smoke puff and an ember speck at the front. Char: the dark
     brown burnt route at the upper right, and a char loop at the lower
     left under the smoke puff.
   - #12 and #13: scattered fog-revealed fragments. Gone: cut ends with
     smoke puffs and 3-6 px orange ticks, nothing along the walked
     route. Char: a diagonal band of dark brown and orange char threads
     along the walked route (the fog stamps reveal it), with intact
     threads in color. No thread shows outside the fog.
3. **The unseen-front frames** (desktop, 1400x900, as briefed). Unseen
   fronts draw as nothing, with gone and with char, and a same-camera
   pair shows it.
   - **Same camera (`cam=follow`).** `K290_3c_unseen_follow_ring.png`
     (crops) and `_unseen_follow_full.png` (full frames), arrivals 4, 5
     and 12, with a cyan ring on one unseen front. The follow camera is
     the same with the reveal on and off. Reveal on (gone and char): the
     ring sits on empty dark space: no thread, no ember, no smoke.
     Reveal off (gone and char): the same world point shows thread, with
     a smoke puff and an orange ember with sparks at the cut end inside
     the ring. The ringed fronts: arrival 4 front 0 (chain 4, c 38.401),
     5 front 7 (chain 70, c 73.219), 12 front 21 (chain 72, c 25.863).
     Fully hidden fronts in view under follow, by arrival: 4:1, 5:3,
     6:3, 7:3, 8:2, 9:3, 10:2, 11:2, 12:8, 13:2; none at 0-3.
   - **Fit camera.** `K290_3c_unseen_ring.png` and `_unseen_full.png`,
     arrivals 2, 6, 10 and 13, cells reveal on gone | on char | off gone
     | off char. The same result. The fit camera differs between reveal
     on and off (s about 90 at the start against 21.9 off), so the two
     halves show different scales and places; the sheet says so.
   - Counts per arrival from `out/desk_unseen/` (fronts, unseen with
     declared visibility under 0.5, and the probe's "hard in view"): #0
     1/0/0 (the lit fuse, kind 1); #1 1/0/0; #2 2/1/1; #3 2/1/1; #4
     7/6/5; #5 11/10/10; #6 14/13/13; #7 15/12/12; #8 17/14/14; #9
     18/17/17; #10 26/25/25; #11 30/27/26; #12 29/28/23; #13 31/30/30.
     Every front but the fuse is kind 0.
4. **The widths** (3b's question: how wide the ember and the band read).
   The facts for K409; Levi makes the call.
   - **Method.** A same-state diff on one frozen state (`fw=0`, every
     clock pinned). A = as played (FX on); B = the FX truly stopped; C =
     B with no front declared; D = |B-C| x6. "Footprint" is the px where
     B differs from C (what the shader's ember and band draw), "ember px"
     the warm ones (r > 140 and r - b > 60), "hidden" the share of the
     warm B px that the FX covers in A. `K290_3c_width_off.png` and
     `_width_on.png` show A | B | C | D for the fuse and for #12, gone
     and char (reveal off: 64x64 device px windows at 8x; reveal on: 512
     px at 1x at the fuse, 128 px at 4x at #12), and the 8
     `zs_<off|on>_<fuse|mid>_<gone|char>.png` strips show the same at
     other zooms. The control is zero: B against a second B differs by 0
     px in all 16 cells, and C has no warm px at the fuse.
   - **The numbers come from a phone-SIZED desktop Chrome** (411x753 at
     dpr 2), not from the real phone: the phone's own `_fxoff_` and
     `_none_` frames are not valid FX-off frames (see "For the next
     stage"). Its reveal-off fit camera equals the real phone's, (47.68,
     215.4, 8.8192); its reveal-on cameras differ by scene. Pixel counts
     are device px (1 CSS px is 2 per side).
   - **Scale.** The thread is 0.52 world: 9.17 device px, 4.59 CSS px at
     reveal off (s 8.82); 44.76 CSS px at the fuse with the reveal on (s
     86); 5.99 CSS px at #12 with it on (s 11.52). One ctrl is 2.97 CSS
     px at the fuse; over #12's 29 fronts at reveal off it is 2.67, 4.84
     and 7.01 CSS px (min, median, max); 6.41 at front 26 with the
     reveal on. The band and the ember are in ctrl, so their visual width
     varies 2.6x with the thread's curvature.
   - **Fuse, reveal off** (gone = char): footprint 39 px (ember 26). The
     ember reaches 0.41 CSS px ahead and 1.01 behind: about 3 device px
     long, across the full 9 px thread. The FX adds about 500 px (smoke
     radius about 11.4 CSS px, 2.5 thread widths) and hides 87% (gone) or
     92% (char) of the ember. The look is the same under both; the gap
     is the FX's own state (not checked).
   - **Fuse, reveal on** (s 86; one ctrl 29 CSS px): footprint 3538 px
     (ember 2514), ahead 4.33 and behind 9.99 CSS px, across +-22.7 CSS
     px. The FX is 30-31k px, radius 80 CSS px, and hides 81% (gone) or
     78% (char) of the ember.
   - **#12, reveal off, 29 fronts** (min / median / max):
     - gone: footprint 7 / 56 / 81 px; ember px 2 / 13 / 32; ember ahead
       0.08 / 0.84 / 3.43 CSS px; behind -2.70 / -0.01 / 0.45 (nothing
       behind the cut); across 1.82 / 2.47 / 4.72; FX radius 8.3 / 11.8
       / 13.7 CSS px; hidden 0 / 33 / 100%.
     - char: footprint 5 / 79 / 142; ember px 0 / 29 / 60; ahead -0.02 /
       0.87 / 3.43; behind -2.83 / 1.74 / 2.63; FX radius 8.2 / 12.0 /
       14.0; hidden 12 / 65 / 100%.
     - So under gone the ember is a rim of about 0.84 CSS px at a cut
       end (about 1.7 device px, 0.18 thread widths), and the FX hides a
       third of it. Under char the ember adds about 1.7 CSS px behind the
       cut, plus the dark char band, and the FX hides two thirds.
   - **#12, reveal on** (one front in view, idx 26; s 11.52). Gone:
     ahead 3.88, behind 0.02 CSS px, footprint 93 px (ember 58), FX 1215
     px, radius 13.4 CSS px, 49% hidden. Char: ahead 3.88, behind 2.26,
     footprint 169 (ember 103), FX 794 px, radius 12.0, 55% hidden.
   - **Desktop** (1400x900, k 1; reveal-off s 22.04, thread 11.46 px, one
     ctrl 6.66 / 12.09 / 17.52 CSS px over #12). Fuse, reveal off: ember
     41 px, ahead 1.08, behind 2.49 CSS px, FX radius about 30 CSS px,
     91% (gone) or 97% (char) hidden. Fuse, reveal on (s 90, thread 46.8
     px): ember 687 px, ahead 4.51, behind 10.36, FX radius 126 CSS px,
     95% or 87% hidden. #12, reveal off, gone: ember px 3 / 21 / 51,
     ahead -0.34 / 2.09 / 8.86, behind -6.66 / 0.02 / 1.31, FX radius
     20.2 / 29.6 / 33.5, hidden 0 / 24 / 100%. Char: ember px 0 / 43 /
     91, ahead -0.21 / 2.24 / 8.54, behind -7.14 / 4.20 / 6.32, hidden 27
     / 66 / 100%. #12, reveal on (front 26, s 26.05): gone ahead 8.68,
     behind -0.01 (footprint 120, ember 77, 43% hidden); char ahead 8.68,
     behind 4.95 (219, 135, 65%). All in `out/width_desk/measure.txt`.
   - **The dark ramp under gone.** Centerline samples across a cut end
     (`ahead_probe.mjs`, phone-sized #12 reveal on, front 26, 12.82
     device px per ctrl; t > 0 is the unburnt side; B against C).
     Observed, gone: for t < 0, B equals C (the dark backdrop (25,29,43):
     nothing is drawn behind the cut); a bright core at t = 0 (254,213,
     127); then a DARK ramp for t = 1 to 7 px, (120,68,32) rising to
     (217,185,60), back at the thread color (236,204,65) by t = 8 px
     (0.62 ctrl), darkest at 2-4 px. Char: char (105,53,30) for t = -12
     to -7, the ember behind the cut from t = -7 (107,54,30) up to
     (252,204,117) at t = -1, then the same ramp.
   - **Why (read from the code, not A/B'd).** The ember alone cannot
     make (120,68,32); the ramp is the front's char band. `kCharAt`
     (`explore_glsl.ts`, about lines 417-425) adds the FRONT band under
     `if (T0.w < 0.5)`, and T0.w is the front item's KIND (0 a burning
     front, 1 the lit fuse), not the burnt look. `fabric_maze_renderer.ts`
     (about 2663-2742) hands the ribbons `fronts` under gone as under
     char (only `char` is null under gone: `char: gone ? null : spans`),
     and `ribbon_renderer.ts` (about 5005-5008) pushes a `frontItem` for
     every front. So a thread blackens over EXPLORE_FRONT_BAND (0.7
     ctrl) ahead of every kind-0 front under BOTH looks (the shader's
     comment: "a thread blackens before it vanishes"). Under gone a cut
     end therefore reads, from the cut: a thin ember rim, then scorched
     thread for about 0.5 ctrl (1.3 to 3.5 CSS px over #12's fronts at
     reveal off on the phone), the FX smoke over both. `render-explore.md`
     (THE BURN, stage 3b: "A front darkens the unburnt side under char
     over FRONT_BAND 0.7 ctrl") is inaccurate for gone.
   - **Options for K409** (3b named the first two; the third is this
     stage's; none is chosen):
     1. Band and ember widths in world units, not ctrl: removes the 2.6x
        spread.
     2. Under gone, move the ember onto the unburnt side: today only the
        0.25 ctrl ahead part shows (median 0.84 CSS px), and its 0.55
        ctrl behind part lies on gone thread.
     3. Decide whether the char band (0.7 ctrl) should draw under gone at
        all; today it does.
     A fourth factor sits under all three: the FX smoke hides the ember
     (median 33% under gone and 65% under char at #12 reveal off on the
     phone; 87-92% at the lit fuse). A smaller smoke radius, or drawing
     the ember over the FX, would change that.
5. **Phone against desktop** (same build, same link).
   - Portrait 1079x1977 at dpr 2.625 (canvas dpr capped at 2) against
     1400x900 at 1. At the fit scale the thread is 4.6 CSS px wide on
     the phone against 11.5 px on the desktop, so the ember rim at a
     gone cut end is 1-2 device px there and mostly under smoke.
   - Reveal off, the phone-sized Chrome's fit camera equals the real
     phone's; reveal on, the cameras differ by scene (s 86 at #0, 11.52
     at #12).
   - Load: ready 8.3 s and the first sleep 6.65 s after ready on the
     phone, against about 5.3-5.4 s and 6.7 s on the desktop; the first
     frame's stamp read `sim 0.4s / wall 7.8s | lag 0.3s | phys 0.19ms
     render 20.84ms 39fps`. Taken beside a desktop probe: not a
     benchmark.
   - The same PixiJS "Attribute aGap, aGapId, aUV is not present in the
     shader" console errors as the desktop (5 in the sheet run, 6 in the
     fog run); they predate 3a.
   - No phone-only artifact showed in the sheets: the backdrop is in
     every frame and `ctxLost` is 0.
6. **Checks and clean-up.**
   - No source, test, script or rules file was edited: `git diff --stat
     e6e1734` shows this file only.
   - Phone: never woken, unlocked or reconfigured, and no output names
     its address or serial. The one address in the watchdog log is
     masked in place (`<phone>`). Its `adb forward` and `adb reverse`
     lists were empty after the teardown.
   - Locks and servers: `claude-phone.lock` absent; the perf lock
     released at 11:15:16; the server on port 5890 stopped; the watchdog
     ended.
   - **Master moved.** At 11:25 master was 957f04d, 17 commits past
     e6e1734, 3 of them in `src/`: K5 R1's ribbon split (7240953,
     5a39ff3, 9b468e6): `ribbon/ribbon_shader.ts` (+265) and
     `ribbon/sampling.ts` (+191) new, `ribbon_renderer.ts` -402, small
     edits to `junction_field.ts`, `pluck_overlay.ts`,
     `background_shaders.ts` and `program_registry.ts` (7 files, +480
     -393). The burn's own files (`src/render/explore_glsl.ts`,
     `fabric_maze_renderer.ts`, `appear_fx.ts`, `src/game/`) are
     identical there (empty `git diff --stat`). I probed e6e1734 and did
     not re-probe master.

### Not done

- **A phone width run.** The width diff ran on a phone-sized desktop
  Chrome; a re-run on the phone with the corrected FX-off method was not
  made (the lend ended at about 11:10).
- **No unseen-front frame on the phone,** desktop only, as briefed.
  The shots are at arrivals 4, 5 and 12 (follow camera) and 2, 6, 10 and
  13 (fit camera).
- **No second phone pass,** no cold-link timing and no first-burn trace
  (3b's open item).
- **K383** and the **`paint_math` mirror** are not built (not this
  stage).
- **The width call** is Levi's (K409).

### Evidence

`.claude/probes/K290/stage3c/` is untracked and lives in the MAIN
checkout, not in this worktree.

- Sheets, `out/sheets/`: `K290_3c_phone_full.png`, `_phone_crop.png`,
  `_phone_fog_full.png`, `_phone_fog_crop.png`, `_unseen_ring.png`,
  `_unseen_full.png`, `_unseen_follow_ring.png`,
  `_unseen_follow_full.png`, `_width_off.png`, `_width_on.png` and the
  8 `zs_*.png` strips, composed by 3a's `mksheet.mjs`
  (`.claude/probes/K268/stage2/`) from the rows files `make_rows.mjs`
  writes. 3b's desktop sheets for comparison:
  `stage3b/out/sheet/K290_3b_sheet_full.png` and `_crop.png`.
- Frames and logs:
  - `out/phone/sheet`: `p00_` fuse, `p01_` early, `p12_` mid, `p13_`
    late, each `_<off|on>_<gone|char>.png` plus `_crop.png`. The
    `_fxoff_` and `_none_` frames at #0 and #12 are NOT valid FX-off
    frames;
  - `out/phone/fog`: `p00/p01/p12/p13_fog_<gone|char>.png` plus crops;
  - `out/desk_unseen`, `out/desk_unseen_follow`;
  - `out/width_phone` (48 PNGs, `frames.json`, `measure.txt` and
    `measure.json`) and `out/width_desk`;
  - `out/run_phone.log`, `phone/state/watchdog.log`.
- Scripts:
  - the phone: `phone_sheet.mjs` (`--mode sheet|fog`, `--dry`,
    `--nofront`), `phone_lib.mjs`, `phone_setup.ps1`,
    `phone_teardown.ps1`, `phone_clear.mjs`, `run_phone.ps1` (setup, both
    runs, teardown, server stop), `serve_bg.mjs`, `phone_srv.ps1`
    (`-Stop`; port 5890);
  - the desktop: `desk_sheet.mjs` (`--mode fog|sheet|unseen`),
    `width_probe.mjs` (`--origin --out --vp phone|desk --picks 0,12 --xps
    off,on --expect e6e1734 --deadline HH:mm`), `measure.mjs <dir>
    [thr]`, `ahead_probe.mjs <dir> <cell> <frontIdx> [from] [to]`,
    `zoomstrip.mjs`, `make_rows.mjs [followDir] [arrivals]`;
  - helpers: `lib.mjs`, `png.mjs`, `zoom.mjs`, `diffbox.mjs`, `pix.mjs`;
  - the build: `builds/e6e1734`.

### My calls

- **No decision on widths.** Facts and options only (K409).
- **The production build over `adb reverse`,** not the dev server: the
  phone shows what a player gets.
- **The width diff on one frozen state:** `fw=0`, pinned clocks, the FX
  truly stopped (B), a second B as the control, and C with no front, so
  the footprint is exactly what the shader draws.
- **A same-camera unseen pair through `cam=follow`,** because the fit
  camera moves between reveal on and off.
- **The width numbers from a phone-sized desktop Chrome** (411x753 at
  dpr 2), whose reveal-off camera equals the phone's, after the phone's
  own FX-off frames proved invalid.
- **The lit fuse measured at its own state (#0),** not at a later
  arrival.

### For the next stage

- **K409, the width call (Levi).** The facts and options are in item 4.
  The constants are `EXPLORE_FRONT_BAND` (0.7), `EXPLORE_EMBER_AHEAD`
  (0.25) and `EXPLORE_EMBER_BEHIND` (0.55), in ctrl, in
  `explore_glsl.ts`; a ctrl is about 1.93 per lattice unit and 2.7 to
  7.0 CSS px at the phone's fit scale.
- **A lore correction** (not made: this stage edits no rules).
  `render-explore.md`, THE BURN stage 3b, says the front's band darkens
  the unburnt side "under char"; the code darkens it under both looks.
  Check THE EMBER DRAWS for the same assumption.
- **A probe lesson** for `probes.md`. `AppearFxSystem.tick()` sets its
  container visible each frame while particles live, and `drawFire`
  calls `tickFireFx()` every frame, so `container.visible = false` does
  not stop the FX: 3b's `_fxoff_` and `_none_` frames and
  `desk_sheet.mjs`' pattern are not reliable FX-off frames. A true
  FX-off frame shadows `tickFireFx` with an own no-op property, calls
  `fireFx.clear()` and waits two frames (`width_probe.mjs`; restore with
  `delete F.tickFireFx`, `F.fireFxT = -1` and a reset `drawFire`,
  `fireDirty`, `fireKey`). Add `fw=0`, pinned clocks and a B-against-B
  control: a plain shot-to-shot diff is polluted by flow, the
  background's drift and the FX. A same-camera unseen-front pair needs
  `cam=follow`.
- **K383** (hide the start marker once the thread under it has burnt) is
  still unbuilt.
- **The cold-link time and the first-burn trace** (3b's item): not
  done.
- **The `paint_math` mirror** for FRONT and SMOLDER (K152 item 3), when
  the look is final.
- **Still open from 3a:**
  - pickThread under a declared burn;
  - `pieceVis`' ring-unwrap guard;
  - the PixiJS attribute warnings at load (aGap, aGapId, aUV).
- **Master past e6e1734** (K5 R1's ribbon split) is not re-probed: after
  the merge, look at one burnt frame.

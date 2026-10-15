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

# K7: physics in a Web Worker

Levi asked when the physics moves off the main thread (2026-10-14 about
18:56) and approved it as the next build at about 19:00, ahead of K76
stage 2c and K268 stage 2. It is a dedicated Web Worker, not a service
worker. He then asked (about 19:01): "And with the web worker, the intro
animation will run at normal frame rates?" The design must answer that
with numbers.

## What is known

- **The plan of 2026-07-24** (`.claude/rules/physics.md`, "CANDIDATE perf
  follow-up"):
  - Move the whole, still single-threaded `ParticleSystem` into a worker,
    so physics and render overlap instead of running one after the other.
  - The numerics stay unchanged: the sim changes threads, not order.
  - Never color the Gauss-Seidel solver.
  - `positions` and `zPos` are already `Float32Array`s.
  - The costs it lists: COOP/COEP for SharedArrayBuffer; marshaling
    grab/dragTo/release; the per-crossing render state (displayF,
    over/under, emergent crossings); and "the real tax", the diagnostic
    harness that reaches into `ParticleSystem` synchronously.
- **The ledger:**
  - K7 is the worker, with render-side interpolation between physics
    steps. "Smooths the UI; it does not speed up physics."
  - K28's acceptance: the intro runs at full frame rate WHILE physics
    settles, with no settle-first loader wait.
  - K5 splits `main.ts` and `ribbon_renderer.ts`. K6 is one frame loop
    driven by what-changed flags (K21's `sceneAnimating()`, and K24's
    render on demand asking `background.needsFrame()`). The ledger has
    both as prerequisites; this stage decides whether they are.
- **Settle and wake costs:**
  - K147 (`.claude/rules/physics-settle.md`, "The load settle") paces a
    new knot's first settle at `settleBudget` 12 ms of physics a frame.
  - On the desktop at gs 18 that gives an intro p95 of 31 ms (164 before
    K147), sim/wall 0.25, and the first sleep at 21 s instead of 11.6 s.
  - One gs 18 substep costs about 12.4 ms and the render about 17 ms.
- **K16** (an idle desktop, `.claude/probes/K279/wake/`):
  - A drag, a tap with the tug and a bare wake cost the same: 8.2, 10.5
    and 20-23 ms per 1/120 s substep (knot `?7k&mf=0`, 2592 particles;
    fabric `?b`, 3011; dense, 5448).
  - So every wake spirals to the 100 ms cap of 12 substeps a frame, and
    runs at 7-9 fps for 3-8 s.
  - K162 (4) asks whether drags should get K147's budget. The worker is
    the full fix for both.

## Stage 0: the design (this stage)

A design and research stage. No `src/` change lands. A throwaway spike to
measure things is fine: a minimal worker that runs `ParticleSystem` on a
captured state, or a transfer microbenchmark. Keep it under
`.claude/probes/K7/design/`, or mark it plainly as probe code on your
branch.

### Questions to answer

1. **The boundary map.** List every main-thread read or write of physics
   state: what it touches, how often, and how it would cross the
   boundary. Cover at least:
   - the renderer (ribbons, gaps, junctions, the debug overlay);
   - input (grab, dragTo, release, the tap's tug from K279);
   - the fabric controller, markers, trail, fog and edge indicators;
   - the camera's bounds-following viewport and centroid centering;
   - pluck and audio (loop lengths to pitch);
   - the sleep gate (K63), K147's load settle and the K47 resume;
   - rebuilds on a param change, the undo stack's live effects, physics
     on/off and the temperature slider;
   - `window.__knotPoint`, `__knotRenderer`, the sim/wall stamp and the
     `diag_*` probes.

   Say which state changes every substep and which only on a rebuild,
   with sizes in bytes for the knot, fabric and dense designs above.
2. **Transport.** Choose between a SharedArrayBuffer and transferred
   ping-pong buffers or plain copies, and measure the per-frame cost of
   each at those sizes. Copies may be cheap enough to make SAB, and its
   headers, unnecessary.
3. **Cross-origin isolation**, only if you choose SAB.
   - What it takes through levi.dev's Pages Function proxy (read-only
     here: `C:\Users\lsl\Repositories\levi.dev\functions\knotmaze\[[path]].js`)
     and a `_headers` file for knotmaze.pages.dev.
   - Whether `require-corp` or `credentialless` breaks the Web Analytics
     beacon Cloudflare injects on levi.dev, or any other cross-origin
     resource the page loads.
   - Browser support: Android Chrome first, then desktop Chrome, Firefox
     and Safari, and iOS Safari for later.
   - Search the web as needed.
4. **The frame loop.**
   - Render-side interpolation between the last two physics states:
     positions interpolate, and discrete state (over/under, emergent
     crossings) comes from the newer one.
   - The grabbed point, given the EXACT grabbed-chase lore: does it draw
     at the pointer?
   - The input-latency budget.
   - Keep K24's render on demand, and stop the ticker when everything
     sleeps.
   - What part of K6 the worker actually needs.
5. **The settle and wakes under the worker.**
   - What replaces K147's budget. The proposal: the worker steps flat
     out, capped at real time, and drops time instead of spiraling.
   - Whether the hidden pre-settle (`loadSettle`) and the trefoil loader
     stay.
   - How the intro's reveal clock relates to sim time.
   - Where the sleep gate runs.
   - The first-frame hitch.
6. **Lifecycle.**
   - Rebuilds: a new seed, a param change, a mode change, a resume.
   - Worker startup cost.
   - Tab hide and show.
   - Errors, and the fallback when a worker cannot start: physics on the
     main thread as today.
   - Vite's worker bundling under the relative base `./`, served through
     the levi.dev proxy.
7. **Determinism and tests.**
   - The byte-identity golden and every physics test keep running the
     same `ParticleSystem` in Node.
   - Specify a test that drives the host interface both ways (in-thread
     and worker) and compares the state sequences.
   - Confirm that generation (K108, one link builds one maze on every
     device) reads nothing from physics and stays on the main thread.
8. **The diagnostic bridge.**
   - List every probe and harness that reads `ParticleSystem`
     synchronously: `scripts/diag_screenshot.mjs`, `scripts/phone_pass/`,
     and the `.claude/probes/` scripts the lore calls load-bearing.
   - Say how each keeps working: a main-thread mirror of the last
     snapshot, an async call, or an in-thread mode kept for probes.
   - Say which probes would then stop testing the shipping path.
9. **Prerequisites.** Are K5 and K6 needed first, or is a narrower
   physics-host boundary enough? Size each piece.
10. **Acceptance and Levi's question.**
    - **Baselines today,** on the desktop under the perf lock:
      - the daily's front door at gs 18: intro fps, p95, first sleep and
        sim/wall;
      - the render-alone cost per frame during the settle, and the
        reveal's own share;
      - a drag's frame rate;
      - a bare wake.
    - **Targets for the worker,** and what limits the frame rate once
      physics is off the main thread.
    - **The phone:** it is busy tonight, so write the measurement plan
      for a later phone pass (K156) instead of measuring.
    - Answer "will the intro run at normal frame rates?" plainly: on the
      desktop and, as far as the numbers allow, on the phone, and what
      else (render cost, K8/K9's GPU pipeline) would be needed where the
      worker alone is not enough.

### Deliverables

- **A "Design" section** in this file: the answers, a boundary table and
  the numbers.
- **Build stage briefs,** appended as "Stage N: ..." sections in the
  house format (goal, steps, Verification, Setup, Process with the stop
  rule).
  - Each is sized for one 2-hour Opus agent and names the files it owns.
    They are ordered, and say which need `main.ts` to themselves.
  - A starting shape, which you may change:
    1. A physics-host interface in-thread, byte-identical, with every
       main-thread touch going through it.
    2. The worker host behind a param: the transport, input marshaling
       and interpolation.
    3. The settle and wakes under the worker, the diagnostic bridge and
       the acceptance measurements.
    4. On by default after a phone pass, and K147's interim budget
       retired where it is moot.
  - Put K5 and K6 stages where the design says they belong.
- **A "Design handoff"** section:
  - what you measured;
  - Levi's calls, numbered, each with a recommendation;
  - a `Ledger items` list.
- **A one- or two-line pointer** from `physics.md`'s CANDIDATE paragraph
  to this file. It now reads NOT taken: mark it approved on 2026-10-14.

### Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this section is missing, `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`).
- **Servers:** ports 5780-5789. Give your vite server a private cacheDir
  (see `probes.md`).
- **Chrome:** any instance you launch gets its own `--user-data-dir` in
  your probes folder. Delete it when you are done (K161).
- **Files:** probes, logs and notes go in `.claude/probes/K7/design/`
  (untracked; the coordinator copies them at the merge).
- **The perf lock:** hold `$env:TEMP\claude-perf.lock` for every frame
  timing, waiting for it inside one blocking command. Running alongside
  you:
  - K111 stage 4 (the paint shaders, the panel and the codec) until
    about 19:53;
  - a phone pass. The phone is off-limits.
- **Helpers:** if you start any, give each `model: sonnet` and this
  brief's stop rule.

### Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
- **The stop.** Stop when the design is done or at your cap, whichever
  comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append the "Design handoff", commit it and
    report. Start no build stage.
- **The final report covers:**
  - what changed and where;
  - your calls;
  - the numbers, including the plain answer to Levi's question;
  - the stage plan;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.

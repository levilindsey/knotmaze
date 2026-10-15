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

## Design

Measured 2026-10-14 on master `0d88091`: the desktop (Ryzen 9 5900X, 24
threads; RX 6800 XT; Chrome 155), a 1600x900 window at dsf 1.5 (a
2400x1350 canvas), under the perf lock. The probes, raw results and the
spike are in `.claude/probes/K7/design/` (`node summarize.mjs daily`
there prints the baseline tables).

### The answer to Levi's question

"And with the web worker, the intro animation will run at normal frame
rates?"

- **Desktop: mostly yes.** The daily's intro runs at 22.7 fps today, and
  about 40 fps between its two long freezes. With physics in a worker a
  frame costs only the render. The daily with physics paused, which is
  that render alone, runs at 56 fps (frame interval p95 18 ms): smooth,
  but not a locked 60.
- **The two freezes stay.** The intro stalls for 2.7 s at 1.1 s and for
  2.0 s at 3.8 s. Both happen with physics paused too, so a worker cannot
  remove them. They are inferred to be shader compiles (not traced):
  K8/K9's warm-up is that fix.
- **The knot settles sooner.** The worker runs the gs 18 settle at 0.76x
  real time, against 0.19x during today's intro. The daily's first sleep
  moves from 20.7 s to about 12 s, and to about 7.3 s once K9 removes the
  freezes.
- **Phone: likely better, not proven.** The phone holds 60 fps at rest
  and 38-42 fps under today's settle, where K147 gives physics about 12
  ms of each frame. Without physics its intro frame rate is set by its
  render cost, which is unmeasured during the intro (its bench's render
  ms is 15-27, so roughly 40-60 fps). The phone pass below measures it
  before the worker becomes the default. Where the render is the limit,
  the next lever is K8/K9's GPU pipeline, not the worker.

### 1. The boundary map

The worker owns the live `ParticleSystem`. Main keeps a second one,
built from the same graph: the MIRROR. It never steps. Each snapshot
overwrites its positions and pass state, so every reader below keeps
reading the same object and fields it reads today. Writes become
messages. `ParticleSystem` appears in five `src/` files: `main.ts`,
`ribbon_renderer.ts`, `fabric_maze_renderer.ts`, `reveal.ts` and
`sleep_gate.ts`. Everything else reads the renderer's samples or the
graph.

| Area | Touches | How often | Under the worker |
|---|---|---|---|
| Ribbons, gaps, junction fans, fillets (`ribbon_renderer.ts:725`) | reads positions, chains, chainBreakAfter, crossings (each pass's ctrl and displayF, sign), emergentCrossings, pointOnChain, bindingPoint; at build passNeighbors, fusedJunctions, isAnchored | every frame | the mirror. Pass objects stay the same objects (its passInfo Map is keyed by them, 2595-2597); emergentCrossings becomes an override filled from the snapshot |
| Debug overlay, junction_field, arm_strip, gap_mask, pluck_overlay | the renderer's samples or the graph | every frame | unchanged |
| Fabric renderer: markers, trail, fog (`fabric_maze_renderer.ts:363/482`) | positions | every frame | the mirror |
| Fabric controller, edge indicators, HUD (`src/game`, `src/ui`) | the walk graph and the renderer's samples | every frame | unchanged |
| Reveal (`reveal.ts:45`) | chain layout, constructor only | per build | the mirror |
| Grab (commitPendingDrag, `main.ts` 3959-3965) | `grab(x, y, r)` picks the nearest particle and pins it; main reads `grabbedParticle` (1361, 3662, 3783, 3963) | per press | main picks the particle on the mirror with `nearest` (what is on screen) and posts `grab{particle, x, y}`; the worker grabs by index (a new `grabAt(p, x, y)`, which `grab` calls). The mirror records `grabbedParticle` |
| Drag (3608; the soft snap-back 4578) | `dragTo` | per move, per frame | `drag{x, y}`, coalesced to the latest |
| Release (3616, 3692, 3697, 3784, 4587) | `release()`; the return is discarded. beginRelease and endDrag (3661-3699, 4098-4103) read the chain and positions first | per lift | `release{}`; the reads use the mirror |
| Tap tug, K279 (3654; the delayed tug 4177-4181 checks `ps === scene`) | `tug()` writes positions and prev; its count wakes the gate | per tap | `tug{...}`; the worker wakes its own gate on a nonzero count; the delayed tug checks the host's gen |
| Camera (`computeFitTarget`, 681-730) | bounds | every third frame | the mirror |
| Centroid centering (particle_system 2550-2567) | inside the substep | every substep | moves with the sim |
| Pluck and audio | the renderer's samples and the graph | per pluck | unchanged |
| Sleep gate, K63 (`sleep_gate.ts:54`; `main.ts` 4625-4643) | maxMove, contactsStatic, ridersPending, simTime | every frame | runs in the worker at batch ends; `asleep` and the flags ride in the snapshot |
| K147 load settle (pre-settle loops 1109-1141 and 1247-1301, finishPresettle 1148, finishLoading 1307-1332, the step path 4598-4614) | steps, simTime, the flags | load, every frame | the pre-settle becomes a worker command; the budget is bypassed in worker mode and kept for the in-thread fallback |
| K47 resume (2592, 2599-2606) | initial and settled positions | per resume | the mirror, after the worker's `settled` |
| Rebuilds: seed, params, mode, undo's live effects, physics on/off (`new ParticleSystem` 1493, reset 1172) | the whole system | per rebuild | `init{gen, params, tuning}`; main builds the mirror from its own graph |
| Temperature and physics sliders | tuning, 9 numbers, every step | per change | `tuning{t}` on change |
| Probe hooks (`__knotPS` 4818, `__knotPoint`, `__knotRenderer`, the stamp, `diag_*`) | any of the above | per call | the mirror; see 8 |

**What changes every substep** (worker only): positions (8N bytes),
prev (8N), zPos (4N), the z targets, contact state, the accumulator and
slide stats. Of these the render needs positions, each pass's ctrl and
displayF, the emergent crossings and a few flags. **Built once per
rebuild and never sent**, since both sides build them from the same
graph: initial and anchor positions, chains, chainBreakAfter, rest
lengths, the crossing topology, passNeighbors, fusedJunctions and the
anchors, about 34N bytes.

**The snapshot:** a header of f64s (gen, seq, simTime, substeps run,
lag, wallAt = `performance.timeOrigin + performance.now()`, maxMove, and
the flags asleep, settleComplete, contactsStatic, ridersPending);
positions as f32 (8N); each pass's ctrl and displayF as f64, NaN meaning
undefined (32 bytes per crossing); the emergent crossings' rows with
their over/under (at most about 4 KB).

| Design | Particles | Crossings | Positions | Passes | Snapshot |
|---|---|---|---|---|---|
| knot `?7k&mf=0` | 2592 | 416 | 20,736 B | 13,312 B | about 38 KB |
| fabric `?b` | 3011 | 352 | 24,088 B | 11,264 B | about 39.5 KB |
| daily, gs 18 | 2977 | 347 | 23,816 B | 11,104 B | about 39 KB |
| dense `?b&gs=24&wd=0.6&brd=0.6` | 5448 | 728 | 43,584 B | 23,296 B | about 71 KB |

### 2. Transport

Measured with a module worker (`transport/`, results in
`transport_results.jsonl`):

- a structured clone of a typed array: 0.035-0.045 ms (p95 at most
  0.065) at 72-106 KB, 0.15-0.17 ms at 400 KB;
- a transferred buffer: 0.005 ms at any size;
- round trips: an empty ping 0.025 ms, a transfer 0.03-0.04, a clone
  0.075-0.115, a SharedArrayBuffer 0.03;
- copying 100 KB out of a SAB 0.002-0.003 ms; posting a small input
  0.0016 ms.

Every option costs under 0.1 ms a frame. **The call: transferred
buffers, no SharedArrayBuffer.**

- A pool of 4 buffers. The worker writes a snapshot into a free one after
  each substep and transfers it. With none free it skips that snapshot,
  which is harmless: a newer one supersedes it.
- Main keeps the two newest, for interpolation, and gives the rest back
  at once.
- The spike ran this with 3 buffers: main's handler and copy took under
  0.1 ms; the snapshot on screen was 4.6-8.9 ms old at p50 with main
  idle, and 20-24 ms with a 15 ms busy-wait in every frame.

### 3. Cross-origin isolation

Moot without SAB. For the record, if it is ever wanted:

- `require-corp` blocks every cross-origin subresource that lacks a
  `Cross-Origin-Resource-Policy` header. The page's only one is the Web
  Analytics beacon Cloudflare injects on levi.dev. Its script
  (`static.cloudflareinsights.com/beacon.min.js`) answers with
  `Cross-Origin-Resource-Policy: cross-origin` and
  `Access-Control-Allow-Origin: *` (a HEAD request, 2026-10-14), so
  `require-corp` would not block it, and `credentialless` (which Safari
  lacked when last known; not re-checked) is not needed.
- It needs COOP and COEP on knotmaze.pages.dev (a `_headers` file), the
  levi.dev proxy passing them through, and the dev server's config. That
  is three places to keep right, for a transport that saves under 0.1 ms
  a frame.

### 4. The frame loop

**The clock: allowances.** Each frame main posts `frame{dt}` with the
frame's capped dt, the dt `ps.step` gets today. The worker:

- adds the queued allowances into a batch of at most 0.25 s or 30
  substeps, with `ps.step`'s accumulator math;
- runs the batch one substep per macrotask, yielding through a
  MessageChannel, so inputs apply between substeps (drags coalesce to
  the latest);
- posts a snapshot after each substep;
- drops backlog beyond about 0.05 s as lag instead of spiraling,
  reported like K147's lag.

No allowance arrives while main is frozen (a shader compile, a hidden
tab), so physics pauses with the picture and nothing jumps forward after
a freeze (call 5). A clock in the worker would settle the daily sooner
(about 7-8 s instead of 12) but jump the knot after each freeze. Once K9
removes the freezes the two converge.

`ps.step` splits into `beginFrame(dt): number` (the accumulator math,
returning the substep count) and `runSubstep(tuning)`. `step()` stays
beginFrame plus the loop, numerically identical, and the golden guards
the split. There is no per-frame work after the substeps to move.

**Interpolation.** Render at `now - D`, with D the median snapshot
interval clamped to 8-50 ms, and lerp positions between the two
snapshots that bracket it by wallAt. Pass ctrl and displayF lerp too,
unless either is undefined or the pair wraps a closed chain's seam; then
the newer value wins. Discrete state (the emergent crossings, the flags)
comes from the newer snapshot. At rest both snapshots are equal and the
frame is exact.

- The caveat: an interpolated frame is not a substep-end state, and
  P3.26 makes the substep end the state collision certifies. Inferred,
  not measured: the width floor then holds to within one substep's
  motion.
- Stage 3 A/Bs interpolation against newest-only (judder, which comes
  from showing one or two substeps per frame, against that risk) and
  keeps interpolation only if it measurably helps.

**The grabbed point.** The exact grabbed chase still holds: in the
worker the grabbed particle sits on the drag target at every substep
end. On screen it trails the pointer by the input latency. No
pointer-led override at first (call 3): drawing the grabbed point at the
pointer bends the ribbon away from the physics state near the grab, the
render-physics mismatch the lore warns against.

**Input latency, estimated:** posting (under 0.01 ms), then the rest of
the current substep (about 5 ms), one substep (10.5 ms at gs 18), the
snapshot's age plus D (10-20 ms) and the next render (up to 16.7 ms):
about 40-50 ms typical, 65 ms worst. A drag frame today takes 141 ms
(interval p50), so the picture trails the pointer by 140-280 ms.

**K24 and K6.** K24's render on demand is independent. The fabric
always animates (flow, pulses), so its ticker could not stop anyway; when
K24 lands it reads `host.asleep` instead of the sleep gate. The worker
needs nothing from K6: the frame loop keeps its shape, with `ps.step`
replaced by `host.frame(dt)`.

### 5. The settle and wakes

- **K147's budget is replaced** by the allowance clock: the worker steps
  flat out, capped at real time, dropping backlog past 0.05 s. The budget
  stays for the in-thread fallback (`phw=0`, or no Worker).
- **Wakes:** a drag, a tap's tug or a bare wake costs the main thread
  nothing. Physics runs at the worker's speed: 1.0x real time for the
  knot (8.2 ms per 8.3 ms substep), 0.76x at gs 18 (10.5 ms), 0.4x
  dense (20 ms). Today a gs 18 drag runs at 7 fps and 0.70x, so the
  motion keeps its speed while the picture goes from 7 fps to 55-60.
  K162 (4), a budget for drags, becomes moot.
- **The hidden pre-settle and the trefoil stay** (call 4).
  `settle{maxSim, maxWall}` runs flat out in the worker behind the
  trefoil and ends as today's does (by sim, work or wall); `lds` stays
  0.45. Main is idle meanwhile, which is room for K9's shader warm-up.
- **The reveal stays on wall time.** Sim time at the reveal's end (11.8
  s) becomes about 4.9 s, against about 2.3 s today, so the knot is
  mostly settled when the reveal finishes.
- **The sleep gate runs in the worker** at each batch's end, with the
  same sim-time quiet window (K63). Asleep, the worker discards
  allowances and posts nothing.
- **The first-frame hitch** (2.7 s at 1.09 s) and the second (2.0 s at
  3.78 s) appear in the physics-paused runs too (2574/1934 and 2809/2035
  ms), so they are not physics. K9 should trace them first (a DevTools
  performance trace), then warm the shaders behind the trefoil.

### 6. Lifecycle

- **One long-lived module worker** per page. Every rebuild (a seed, a
  param change, a mode change, undo's live effects, a resume) posts
  `init{gen, params, tuning}`, and both sides drop messages of an older
  gen.
- **The worker regenerates the graph** from the params with
  `buildSceneGraph(params)`, a pure function extracted from `main.ts`'s
  build (about lines 1452-1491). That build reads only `params`:
  `generateLatticeKnotwork`, then for the fabric `buildMazePlan` with
  `DEFAULT_MAZE_PARAMS` and `planAnchors`, `applyMazePlan` and
  `applyMazeCuts`. The spike's `scene.ts` is the same code. Regenerating
  is deterministic (K108). `ready` carries a fingerprint (counts and a
  hash of the initial positions); a mismatch falls back to in-thread.
- **Startup** (the spike): ready in 19 ms (knot), 48 (fabric), 71 (gs 18)
  and 137 (dense), mostly graph generation (3.9 / 32.7 / 47.7 / 116.4 ms)
  plus the constructor (5-9 ms). Main builds its own graph and mirror at
  the same time (generation 5.9-125 ms, constructor 5.6-9.5 ms), so a
  rebuild takes about the same wall time as today.
- **Tab hide and show:** a hidden tab gets no rAF, so no allowances;
  `pause` and `resume` on visibilitychange also stop a batch in flight.
- **Fallback to the in-thread host** on `onerror`, `messageerror`, no
  `ready` within 3 s, a fingerprint mismatch, or no module Worker
  (Safari before 15). `__knotPerf().host = {kind, reason}` says which. A
  crash mid-session rebuilds the design in-thread with a fresh settle; a
  K47 attempt survives (it lives in localStorage).
- **Vite:** `worker: { format: "es" }` and `new Worker(new URL(
  "./physics_worker.ts", import.meta.url), { type: "module" })`. The
  spike built so under base `./` and ran under the sub-path `/knotmaze/`,
  as the levi.dev proxy serves it, with no COOP/COEP: the chunk loaded
  from `/knotmaze/assets/spike_worker-<hash>.js`, same origin. Hashed
  names are safe under the proxy's 4-hour cache. The worker chunk
  bundles simplex-noise, which the main chunk also bundles (the mirror);
  stage 3 checks that the K122 notices plugin sees the worker build.

### 7. Determinism and tests

- **The numerics do not change.** The spike stepped 600 substeps from
  fresh in the worker and on main for all four designs: positions, prev,
  zPos and simTime matched bit for bit, with main idle and busy.
- The golden, every physics test and the Node harnesses keep
  constructing `ParticleSystem` directly.
- **New tests:**
  - a shared `PhysicsCore` (the step loop, the sleep gate, the settle,
    applying inputs) used by both hosts, and `PhysicsWorkerCore.onMessage
    (msg, post)` with a pluggable scheduler (synchronous in tests), so
    Node drives the worker's code without a Worker;
  - `test/physics/physics_host.test.ts`: InThreadHost and WorkerCore in
    lockstep on scripted inputs (grab, drag, release, tug, tuning,
    reset, a re-init at gen 2, a stale-gen message dropped), comparing
    the state bit for bit after every frame, and the mirror's readers
    (positions, pass ctrl and displayF, emergentCrossings, the flags)
    against the live system's;
  - `test/physics/snapshot.test.ts`: the round trip, NaN as undefined,
    the sizes;
  - a real-Worker browser probe in stages 3 and 4, on the spike's
    pattern.
- **Generation reads nothing from physics** and stays on main:
  `generateLatticeKnotwork` and the maze plan and apply take the params
  and a seeded RNG only (K108). The golden dailies and the K87 pin stay
  unchanged.

### 8. The diagnostic bridge

**Served by the mirror, unchanged:** `__knotPS` (now the mirror),
`__knotPoint`, `__knotRenderer`, `__knotFabric`, `__knotView`,
`__knotReveal`, `__knotDiag`, the chase hooks, `__knotPhys`, the sim/wall
stamp, `__knotSettle` (plus worker fields) and `__knotPerf` (plus the
worker's step stats and `asleep`). `scripts/diag_screenshot.mjs`'s stamp
and frame stats keep working.

**Needs a new form:**

- **The freeze patch** `__knotPS().step = function(){}` is in 48 probe
  files (15 copies of `g2lib.mjs`, `scripts/phone_pass/walk.mjs:95`,
  `K83/k83_shot.mjs:123`, ...). On the mirror it would silently do
  nothing. In worker mode, assigning `step` throws, naming
  `__knotPhysFreeze(on)` (a Promise that resolves once a snapshot shows
  the freeze) and `&phw=0`. It throws for timing wrappers too (k7_frames
  and K279 wrap `step`), since a setter cannot tell them apart. In-thread
  (stage 1), InThreadHost calls `this.ps.step` through the instance, so
  the patch still works there.
- **K279:** `k279_sheet.mjs` needs `stepUntil(simTime)`; `k279_wake.mjs`
  and g1's probe_perf need the worker's step stats; `k279_live.mjs` needs
  a tug Promise and an async dump (or hash) of prev, zPos and the pass
  ctrls.
- `__knotPluck({tug})`, `__knotSetPhysics`, `__knotSetPhysicsParam` and
  `__knotReplay` forward to the host.

**Node, unaffected:** fold_census, the K63, K41 and K90 harnesses, the
11 test files that construct `ParticleSystem`, the vite-node scene
harnesses.

**Probes that stop testing the shipping path** once the worker is the
default, unless ported to the new hooks: K147's `k147_measure.mjs`,
K63/b, K279, K174's and K114's perf modes, the phone_pass bench and
diag_screenshot's frame stats. Real-input probes (template:
`scripts/diag_tug.mjs`) keep testing it. So the worker becomes the
default only after stage 4 ports them, with `phw=0` as the in-thread
escape hatch.

### 9. Prerequisites

Neither K5 nor K6 is needed. A narrow `PhysicsHost` seam is enough: the
renderers only read, and every write is in `main.ts` (about 25 call
sites: the writes, the two settle loops and the step path).

- the host seam, in-thread: one stage, `main.ts` to itself;
- the worker core, snapshot and mirror: one stage, Node only;
- the browser worker and its host: one stage, a brief `main.ts` edit;
- the bridge and desktop acceptance: one stage, `main.ts` to itself;
- the phone pass, default on, lore: one stage.

K5 (splitting `main.ts`) conflicts with stages 1, 3 and 4, and is easier
after them (the host takes physics out of `main.ts`). K6 and K24 fit
after stage 5.

### 10. Acceptance

**Baselines** (`k7_results.jsonl`; iv is the rAF interval, vsync
quantized at 16.7 and 33.3 ms; "render alone" is the frame callback
minus `ps.step`, p50 / p95):

| Daily front door, gs 18 (2977 particles), runs a / b | |
|---|---|
| visible; intro ends; first sleep | 1.09 / 1.08 s; 11.8 / 11.76 s; 20.74 / 20.89 s (sim 5.0) |
| the two freezes | 2675 / 2686 ms at 1.09 s; 1978 / 1939 ms at 3.78 s; about 300 ms at 0.4 s |
| intro | 22.7 / 22.6 fps; iv p50 18, p95 36.1; physics p50 10.5 ms (one substep a frame); render alone 14.1 / 17.2; sim/wall 0.189 |
| intro after its last freeze (5.75-11.8 s) | 39.8 fps; render alone 14.1 / 16.8; sim/wall 0.332 |
| after the intro, until sleep | 36.1 fps; iv p50 34.7; render alone 16.0 / 17.6; sim/wall 0.30 |
| K147 phases | pre-settle 734 ms wall, 0.28 sim-s, ended by work; budget 19.6 s, 5.0 sim-s, 9.6 s of lag dropped, 10.73 ms a substep, ended by sleep |
| drag | 7.0 fps; iv p50 141, p95 158; physics 125 ms (12 substeps); render alone 16.4 / 18.1; sim/wall 0.70 |
| bare wake | 9.3 / 8.9 fps |
| physics paused (the render-only ceiling) | 32.4 / 31.4 fps overall; after the freezes 56.2 fps, iv p50 17.5, p95 18.1 |

| Design | First sleep | Settle fps | ms a substep | Render alone | sim/wall | Drag | Wake |
|---|---|---|---|---|---|---|---|
| gs 18 `?1471kin.J` | 20.77 s | 22.1 intro, 39.7 between freezes | | | | 7.0 fps | |
| knot `?7k&mf=0` | 16.51 s | 36.8 | 8.2 | 13.5 / 14.6 | 0.31 | 8.9 fps (physics 98 ms) | 10.7 fps |
| fabric `?b` | 21.48 s | 28.2 | 10.8 | 15.7 / 17.4 | 0.235 | 6.9 fps | 9.3 fps |
| dense | 36.49 s | 16.5 | 20.0 | 31 / 33.8 | 0.138 | 3.7 fps (physics 237 ms) | 5.1 fps |

The reveal's own share is not exposed (`__knotReveal()` has no timing,
and `reveal.tick` runs inside the frame at `main.ts` 4416). Render alone
is lower during the intro (14.1) than after it (16.0) because the reveal
hides geometry. Stage 4 adds a reveal timing field.

**The worker spike** (`spike/`, 600 substeps from fresh, a pool of 3
transferred buffers; "busy" is a 15 ms busy-wait in every frame):

| Design | Ready (gen + ctor) | Main ms a substep | Worker p50, idle / busy | sim/wall, idle / busy | Snapshot age p50/p95, idle; busy | Identical |
|---|---|---|---|---|---|---|
| knot | 19.3 ms (3.9 + 4.9) | 8.2 | 8.1 / 8.1 | 1.002 / 1.011 | 4.6/8.2; 19.9/23.7 | yes |
| fabric | 47.7 ms (32.7 + 5.2) | 10.5 | 10.5 / 10.6 | 0.779 / 0.777 | 5.4/10.3; 19.9/24.7 | yes |
| gs 18 | 71 ms (47.7 + 7.3) | 10.6 | 10.5 / 10.5 | 0.758 / 0.733 | 5.4/10.4; 20.3/26.2 | yes |
| dense | 136.9 ms (116.4 + 9.4) | 20.2 | 19.5 / 21.3 | 0.415 / 0.381 | 8.9/16.8; 23.7/31.7 | yes |

A worker substep costs what a main-thread one does. A busy main thread
slowed the dense worker by about 9% (mean) and gs 18 by about 3.5%,
inferred to be shared caches or memory bandwidth.

**What limits the frame rate** once physics leaves main: the render, 14-
17 ms a frame at gs 18. Dense is render-bound at about 30 fps (31-34
ms), which is K8's, not K7's.

**Targets for stage 4** (desktop, phw=1 against phw=0 on one build):

- the intro at 50 fps or more between the freezes;
- the daily's first sleep by 13 s;
- a gs 18 drag at 50 fps or more;
- input latency p50 of 50 ms or less;
- at rest and with phw=0, today's numbers within noise.

**Expected,** inferred from the spike and the paused runs: the intro at
about 56 fps between the freezes; the first sleep at 1.09 + 4.65
(freezes) + (5.0 - 0.28) / 0.76, about 11.9 s (about 7.3 s without the
freezes); sim time 4.9 s at the reveal's end; drags and wakes at 55-60
fps with physics at 0.76x real time; dense at about 30 fps.

**The phone plan (K156)**, for a phone pass after stage 4, on one build:

- `scripts/phone_pass/` with `phw=0` against `phw=1`: the daily's and
  gs 18's loads (intro fps and p95, first sleep, sim/wall), 3 runs each
  for thermal spread;
- render alone with k7_frames' `--pause` (physics paused);
- the spike page (`?d=gs18`) for the phone's worker against main
  ms a substep, which shows whether the worker lands on a slow core
  (big.LITTLE);
- drag and wake fps;
- a cold worker start over levi.dev.

Pass: an intro p95 of 33 ms or less, no later first sleep than phw=0,
drags at 30 fps or more, no errors, and the worker ready within 250 ms
of the main chunk. The phone's worker substep cost is unknown until
then; the numbers above for the phone are inference.

## Build stages

Five stages, in order, each one 2-hour Opus agent:

1. the physics host, in-thread and byte-identical (`main.ts` to itself);
2. the worker core, the snapshot and the mirror, in Node (no `main.ts`);
3. the worker in the browser behind `phw`, off by default (a brief
   `main.ts` edit);
4. the diagnostic bridge and desktop acceptance (`main.ts` to itself);
5. the phone pass, the worker on by default, K147's budget retired where
   moot, and the lore (needs the phone).

Placement of related work:

- **K5** (splitting `main.ts` and `ribbon_renderer.ts`) goes after stage
  5. It conflicts with stages 1, 3 and 4, and the host makes it smaller.
- **K6 and K24** go after stage 5; K24 reads `host.asleep`.
- **K8/K9** (the GPU pipeline and the warm-up for the two freezes) can
  run beside stages 2 and 5. Beside stages 1, 3 and 4 only if they keep
  out of `main.ts`'s load path. K7 does not touch `ribbon_renderer.ts`.

### Every build stage: setup and process

**Setup:**

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if your stage's section is missing from this file, `git merge
  --ff-only origin/master`.
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before anything
  removes your worktree, delete it with `(Get-Item node_modules).Delete()`,
  never a recursive delete.
- **Servers:** your stage's ports, each server with a private vite
  cacheDir. K80's wrapper (`probes.md`) loads the config through vite's
  `loadConfigFromFile`.
- **Chrome:** its own `--user-data-dir` inside your probes folder,
  deleted when you are done (K161), and the off-screen window flags.
- **Files:** probes, logs and notes go in `.claude/probes/K7/stage<N>/`
  (untracked; the coordinator copies them at the merge). The design's
  probes (`k7_frames.mjs`, `run_k7.ps1`, `summarize.mjs`, the spike) are
  in the main checkout's `.claude/probes/K7/design/`; copy what you use.
- **The perf lock:** hold `$env:TEMP\claude-perf.lock` for every frame
  timing and every pixel-exact GPU probe, waiting for it inside one
  blocking command.
- **Running alongside:** the coordinator names it at launch.
- **Helpers:** if you start any, give each `model: sonnet` and the stop
  rule below with a 1-hour cap.

**Process:**

- **One stage.** Run `Get-Date` at the start and at each milestone.
  Commit WIP on your branch at every milestone, broken or not. Never
  push. Don't edit `LEDGER.md`.
- **The stop rule:** stop when the stage is done or at the 2-hour cap,
  whichever comes first. Neither a compaction nor context size is a
  stop. After a compaction, re-read this brief and `git log`, then go
  on.
- **At the stop:** commit WIP, append a "Stage N handoff" to this file
  (what is done, what is not, the evidence paths, and "For stage N+1"
  notes), commit it and report. Start nothing beyond your stage.
- **The final report covers:** what changed and where, your calls, the
  verification results, a `Ledger items` list, and the handle fields
  (branch, last commit, evidence, next).

## Stage 1: the physics host, in-thread and byte-identical

Put every main-thread touch of physics behind one interface, still on
the main thread, with nothing on screen and no number changing. Stage 1
needs `main.ts` nearly to itself (see Setup). Ports 5810-5811; probes in
`.claude/probes/K7/stage1/`.

### The work

1. **`src/physics/physics_host.ts`.** The `PhysicsHost` interface:
   `kind`, `gen`, `view` (the `ParticleSystem` the readers use,
   read-only by contract), `build(...)`, `presettle(): Promise`,
   `frame(dt, tuning, now)`, `grab(particle, x, y)`, `dragTo(x, y)`,
   `release()`, `tug(...)`, `reset()`, `setTuning(t)`, `asleep`,
   `wake()`, `stats()` and `dispose()`. `InThreadHost` implements it on
   today's code. A `PhysicsCore` holds what both hosts will share, moved
   verbatim from `main.ts`: the step path with K147's budget, the sleep
   gate's frame call, the pre-settle loops and the tug's wake.
2. **`grabAt(p, x, y)`** in `particle_system.ts`; `grab(x, y, r)`
   becomes `grabAt(nearest(x, y, r), x, y)`. Main picks the particle
   with `nearest` on `host.view` and calls `host.grab(p, x, y)`.
3. **`src/core/scene_graph.ts`: `buildSceneGraph(params, ...)`,** the
   pure part of `main.ts`'s build (generation, the maze plan and apply,
   about lines 1452-1491), which main and later the worker both call.
   On master it reads only `params`; keep it so (no DOM, no live state),
   and return the hue groups with the graph.
4. **Every write in `main.ts` goes through the host:** grab, dragTo
   (about 3608 and the snap-back at 4578), release (3616, 3692, 3697,
   3784, 4587), tug (3654; the delayed tug at 4177-4181 checks
   `host.gen` instead of `ps === scene`), reset (1172), the loading and
   pre-settle loops (1109-1141, 1247-1301, finishPresettle 1148,
   finishLoading 1307-1332), the step path (4598-4614) and the sleep
   gate (4625-4643). Reads go through `host.view`. The lines drift:
   search for `ps.`.
5. **The freeze patch keeps working.** InThreadHost calls
   `this.ps.step(...)` through the instance every frame, so
   `__knotPS().step = function(){}` and timing wrappers still work.
6. **A guard test,** `test/physics/host_seam.test.ts`: it scans
   `src/main.ts` and fails on a `new ParticleSystem` or a call to step,
   grab, dragTo, release, tug or reset on the system outside the host.

### What must not change

- Every number: the golden (`test/physics/byte_identity.test.ts`), the
  K87 pin, the golden dailies, every physics test, and the frame timings
  within noise.
- K147 in-thread: the stamp's settle lag and `__knotSettle()`'s phases
  and `endedBy`.
- The probe hooks' shapes, and the freeze patch.
- Behavior: grab, drag, release, taps and plucks, the reveal, the
  daily's resume.

### What exists (read first)

- This file's Design, sections 1, 4, 5 and 8.
- `src/main.ts` at the boundary table's lines.
- `src/physics/particle_system.ts`: `step` (1714), `grab` (1595),
  `release` (1611), `tug` (1632), `reset` (1536).
- `src/physics/sleep_gate.ts`; the K147 and K63 lore attaches when you
  open these files.

### Verification

- `npm test` green, with the golden, the K87 pin and the golden dailies
  untouched, and the guard test.
- k7_frames under the perf lock, master against the branch: the daily
  (2 runs) and the knot. Intro fps, first sleep and drag fps match
  within noise.
- Real input (template `scripts/diag_tug.mjs`): a drag, a tap's tug, a
  release, a rebuild in mid-drag and the daily's resume behave as on
  master.
- The freeze patch freezes: a probe sets it and checks that simTime
  holds.

### Setup

- The shared setup above; ports 5810-5811 (5790-5799 belong to K299
  until it merges, 5800-5809 to K298).
- Alongside: K298 (the hover glow, `docs/design/K298_hover_glow.md`)
  makes small `main.ts` edits: param syncs next to `hoverGlowWidth`'s,
  and a mouse pick radius in place of `GRAB_RADIUS` at the pick call
  sites (hover, click, the thread cursor, the drag grab). Keep the radius
  a plain argument at those sites so the second merge stays mechanical.
  Nothing else that edits `main.ts` runs alongside.

### Process

- The shared process above. The stop rule: stop when the stage is done
  or at the 2-hour cap, whichever comes first. Neither a compaction nor
  context size is a stop; after one, re-read this brief and `git log`.
- Lore: a line in `.claude/rules/physics-settle.md` saying where the
  settle code now lives.
- At the stop, append "Stage 1 handoff", commit and report. Start
  nothing beyond this stage.

## Stage 2: the worker core, the snapshot and the mirror, in Node

Build everything the worker will run, and the mirror, and prove both
match the in-thread host bit for bit, with no browser. No `main.ts`
change. It starts after stage 1 merges; its snapshot half (work items 2
and 3) could start beside stage 1. Probes in `.claude/probes/K7/stage2/`.

### The work

1. **The step split** in `particle_system.ts`: `beginFrame(dt): number`
   (the accumulator math, returning the substep count) and
   `runSubstep(tuning)`. `step()` stays beginFrame plus the loop.
2. **`src/physics/snapshot.ts`:** the layout in Design 1, with
   `snapshotBytes(N, C)`, `writeSnapshot(ps, buf, header)` and
   `readSnapshot(buf)`.
3. **The mirror,** in `particle_system.ts`: `applySnapshot(view)` sets
   positions and each pass's ctrl and displayF in place (the same pass
   objects), plus overrides for simTime, maxMove, settleComplete,
   contactsStatic, ridersPending and emergentCrossings. A mirror's
   `step` and position writes throw; it records `grabbedParticle`.
4. **`src/physics/physics_worker_core.ts`:** `PhysicsWorkerCore.onMessage
   (msg, post)` with a pluggable scheduler (a MessageChannel in the
   worker, synchronous in tests), built on stage 1's `PhysicsCore`. It
   speaks this protocol, and drops any message of an older gen:
   - main to worker: `init{gen, params, tuning}`, `settle{gen, maxSim,
     maxWall}`, `frame{gen, dt}`, `grab{gen, particle, x, y}`,
     `drag{gen, x, y}`, `release{gen}`, `tug{gen, ...}`,
     `tuning{gen, t}`, `reset{gen}`, `pause`, `resume`, `give{buf}`, and
     for probes `freeze{on}`, `stepUntil{simTime}`, `dump`;
   - worker to main: `ready{gen, fingerprint, genMs, ctorMs}`,
     `snap{buf}` (transferred), `settled{endedBy}`, `tugged{gen, id,
     count}`, `error`, `dumped`.
   - `frame` follows Design 4: allowances add into batches of at most
     0.25 s or 30 substeps, one substep per scheduled task, inputs
     between substeps, drags coalesced, backlog past 0.05 s dropped as
     lag, the sleep gate at batch ends, allowances discarded while
     asleep, and a snapshot after each substep while a buffer is free.
   - A tug with a nonzero count wakes the gate in the worker.
5. **Tests:**
   - `test/physics/physics_host.test.ts`: InThreadHost and the worker
     core in lockstep (synchronous scheduler, K147's budget off, frame
     dts under 0.05 s so neither drops time). Scripted inputs: grab,
     drag, release, tug, tuning, reset, a re-init at gen 2, a stale-gen
     message dropped. After every frame, positions, prev, zPos and the
     pass ctrls match bit for bit, and the mirror's readers (positions,
     pass ctrl and displayF, emergentCrossings, the flags) match the
     live system's.
   - `test/physics/snapshot.test.ts`: the round trip, NaN as undefined,
     the sizes.

### What must not change

- The golden, every physics test, the K87 pin and the golden dailies.
- `main.ts` and the browser: nothing runs in a Worker yet.

### What exists (read first)

- Design 1, 4, 6 and 7, and the spike in the main checkout's
  `.claude/probes/K7/design/spike/` (`spike_worker.ts` packs a snapshot
  into a transferred buffer pool).
- Stage 1's `physics_host.ts` and its handoff.

### Verification

- `npm test` green, with the two new test files.
- 600 substeps in Node with `step()` against beginFrame plus
  runSubstep: the same bits, the same time within noise.

### Setup

- The shared setup above. Node only: no ports, and the perf lock only
  for the timing check.

### Process

- The shared process above. The stop rule: stop when the stage is done
  or at the 2-hour cap, whichever comes first. Neither a compaction nor
  context size is a stop; after one, re-read this brief and `git log`.
- At the stop, append "Stage 2 handoff", commit and report. Start
  nothing beyond this stage.

## Stage 3: the worker in the browser, behind `phw`

Run the worker for real behind a link param that is off by default. The
`main.ts` edit is brief (choosing the host); nothing else may edit
`main.ts` while it lands. Ports 5792-5795; probes in
`.claude/probes/K7/stage3/`.

### The work

1. **`src/physics/physics_worker.ts`,** the entry: `self.onmessage` into
   the worker core, with the MessageChannel scheduler.
2. **`src/physics/worker_host.ts`:** `WorkerHost` implements
   `PhysicsHost`:
   - the mirror, built from main's own graph;
   - the buffer pool (4; keep the two newest, give the rest back);
   - interpolation (Design 4), with a switch for the A/B;
   - frame posting and input marshaling (grab by the index picked on the
     mirror);
   - gen ids, visibility pause and resume, and `presettle()` resolving on
     `settled`;
   - the fallback to InThreadHost on `onerror`, `messageerror`, no
     `ready` within 3 s, a fingerprint mismatch, or no module Worker;
   - `stats()` with the host's kind and the fallback's reason.
3. **`vite.config.ts`:** `worker: { format: "es" }`. Check that the dev
   server serves the module worker, and that the K122 notices plugin
   sees the worker build's packages (simplex-noise); fix the plugin, or
   record why the main chunk covers it.
4. **`phw`** (`physicsWorker`, a boolean, default false): in
   `url_state.ts`, appended to `CODEC_PARAMS` (re-freeze the key-order
   pin in `test/ui/param_codec.test.ts`), and exempt from the daily in
   `daily_link.ts`, following `stb` and `lds`.
5. **`main.ts`:** choose the host at build from `phw` and Worker support.
6. **Probes:**
   - a smoke run with `phw=1`: load, settle, sleep, drag, tap, rebuild,
     hide and show, served from a build under `/knotmaze/` (the spike's
     `run_spike.mjs` pattern);
   - the fallback: Worker overridden to throw, and an init that never
     answers. Both must end in-thread with `host.reason` set;
   - the interpolation A/B under the perf lock: interpolated against
     newest-only, frame-to-frame motion on a drag and during the settle.
     Keep interpolation only if it measurably smooths the motion.

### What must not change

- `phw=0`, the default, behaves exactly as stage 2's master: the golden,
  the K87 pin, the golden dailies, frame timings.
- The codec only gains a param.

### What exists (read first)

- Design 2, 4 and 6; the spike (`spike_main.ts` is a working pool and
  snapshot reader).
- Stages 1 and 2's code and handoffs.

### Verification

- `npm test` green.
- The three probes above.
- A first k7_frames look at `phw=1` against `phw=0` on the daily (the
  full acceptance is stage 4's).

### Setup

- The shared setup above; ports 5792-5795.

### Process

- The shared process above. The stop rule: stop when the stage is done
  or at the 2-hour cap, whichever comes first. Neither a compaction nor
  context size is a stop; after one, re-read this brief and `git log`.
- At the stop, append "Stage 3 handoff", commit and report. Start
  nothing beyond this stage.

## Stage 4: the diagnostic bridge and desktop acceptance

Give the probes their worker-mode forms, port the load-bearing ones, and
measure the worker against the in-thread host on the desktop. It needs
`main.ts` to itself. Ports 5796-5797; probes in
`.claude/probes/K7/stage4/`.

### The work

1. **Hooks** (Design 8): `__knotPhysFreeze(on)` (a Promise);
   `__knotPS().step` throwing on assignment in worker mode, naming
   `__knotPhysFreeze` and `&phw=0`; `stepUntil(simTime)` and a dump or
   hash of prev, zPos and the pass ctrls, both Promises; a Promise from
   `__knotPluck({tug})`; the worker's step stats, lag and `asleep` in
   `__knotPerf()` and `__knotSettle()`; and a reveal timing field.
2. **Ports:** `scripts/diag_screenshot.mjs` (frame stats valid in both
   modes) and `scripts/phone_pass/walk.mjs:95` (the freeze patch). Then
   the load-bearing probes: K147's `k147_measure.mjs`, K279's sheet,
   wake and live probes, and the newest `g2lib.mjs`. List the other
   files that use the freeze patch in the handoff, with the one-line
   port.
3. **Acceptance,** under the perf lock: k7_frames `phw=0` against
   `phw=1` on the daily (2 runs), gs 18, the knot, the fabric and dense:
   intro fps and p95, first sleep, sim/wall, drag fps and bare wake fps.
   Plus input latency: from a pointer event to the first frame whose
   grabbed point reaches its target.
4. **Targets** (Design 10): the intro at 50 fps or more between the
   freezes; the daily's first sleep by 13 s; a gs 18 drag at 50 fps or
   more; latency p50 of 50 ms or less; `phw=0` unchanged within noise.

### What must not change

- `phw=0` behavior and numbers, and the in-thread freeze patch.

### What exists (read first)

- Design 8 and 10; `scripts/diag_screenshot.mjs`;
  `scripts/phone_pass/walk.mjs`; the main checkout's
  `.claude/probes/K279/` and `.claude/probes/K147/`.

### Verification

- `npm test` green; the ported probes run in both modes.
- The acceptance table in the handoff, with each target met or the
  reason it is not.

### Setup

- The shared setup above; ports 5796-5797.
- Nothing else that edits `main.ts` runs alongside, and nothing else
  measures (the perf lock).

### Process

- The shared process above. The stop rule: stop when the stage is done
  or at the 2-hour cap, whichever comes first. Neither a compaction nor
  context size is a stop; after one, re-read this brief and `git log`.
- Lore: `probes.md` gets the freeze hook, `phw=0` and which probes test
  which path.
- At the stop, append "Stage 4 handoff", commit and report. Start
  nothing beyond this stage.

## Stage 5: the phone pass, the worker by default, and the lore

Measure the worker on the phone, turn it on by default if it passes, and
retire what it makes moot. It needs the phone (`scripts/phone.ps1`).
Ports 5798-5799; probes in `.claude/probes/K7/stage5/`.

### The work

1. **The phone pass** (Design 10's plan) on stage 4's build.
2. **If it passes:** `phw` defaults to true. Re-freeze any pin it moves
   and name it in the commit.
3. **K147:** in worker mode the budget and its stamp text are bypassed;
   `stb` stays for the fallback.
4. **Lore:**
   - a new `.claude/rules/physics-worker.md` with narrow `paths:` (the
     host, the worker, the worker core, the snapshot), a line in
     `physics.md`'s list and a row in `docs/lore_index.md`;
   - `physics.md`'s CANDIDATE paragraph becomes a pointer to it;
   - `physics-settle.md` (the budget is the fallback's);
   - CLAUDE.md: the Layer 3 overview line and the project tree.
5. **If it fails:** keep the default off, record the numbers and the
   lever (K8/K9, or the phone's worker cost), and stop.

### What must not change

- The fallback (`phw=0`, or no Worker) behaves as today.

### What exists (read first)

- Design 10; `.claude/rules/probes-phone.md`; stage 4's handoff and its
  acceptance numbers.

### Verification

- The phone pass's pass criteria (Design 10), and `npm test` green.

### Setup

- The shared setup above; ports 5798-5799; the phone, free of other
  passes.

### Process

- The shared process above. The stop rule: stop when the stage is done
  or at the 2-hour cap, whichever comes first. Neither a compaction nor
  context size is a stop; after one, re-read this brief and `git log`.
- At the stop, append "Stage 5 handoff", commit and report. Start
  nothing beyond this stage.

## Design handoff

Stage 0 ended 2026-10-14 at about 20:10, inside its cap. The branch is
`worktree-agent-a70e8b39f6fe8c19d`; no `src/` change. The evidence is in
`.claude/probes/K7/design/` (untracked, for the coordinator to copy).

### What was measured

- **Baselines** on master `0d88091` under the perf lock (`k7_frames.mjs`
  through `run_k7.ps1`; `k7_results.jsonl`, `frames/*.json`,
  `summarize.mjs`): the daily's front door twice, the daily with physics
  paused twice, gs 18, the knot, the fabric and dense, each with a drag
  and a bare wake.
- **Transport** (`transport/`): clone, transfer, SAB and round trips at
  the design sizes and at 400 KB.
- **The worker spike** (`spike/`): the real `ParticleSystem` in a module
  worker built with the app's base `./`, served under `/knotmaze/`, for
  four designs with main idle and busy. Bit-identical to main.
- **The beacon's headers** (a HEAD request): CORP cross-origin.
- **Not measured:** the phone (busy tonight; the plan is in Design 10);
  the reveal's own share (no hook; stage 4 adds one); the cause of the
  two freezes (not traced); input latency (estimated; stage 4 measures
  it); interpolation's effect (stage 3's A/B). Unresolved: in the daily's
  intro the frame callback's p50 (24.7 ms) exceeds the rAF interval's
  (18 ms), so the summaries report fps, interval p95 and render alone,
  not per-frame callback figures.

### Levi's calls

1. **The worker becomes the default** after the phone pass, with `phw=0`
   and an automatic fallback to in-thread. Recommend yes.
2. **No SharedArrayBuffer and no COOP/COEP:** transferred snapshots cost
   under 0.1 ms a frame. Recommend yes.
3. **No pointer-led grabbed point at first:** the grab trails the
   pointer by about 40-50 ms instead of 140-280. Recommend yes; revisit
   only if a drag feels laggy on the phone.
4. **Keep the hidden pre-settle and the trefoil,** moved into the
   worker. Recommend yes.
5. **Physics pauses while main is frozen** (allowances from main's
   frames): no jump after a freeze, but the daily sleeps at about 12 s
   rather than 7-8. Recommend yes; moot once K9 removes the freezes.
6. **Dense stays render-bound at about 30 fps;** its fix is K8, not K7.
   FYI, or a priority call on K8.
7. **The phone pass gates the default.** Recommend yes.
8. **K8/K9's warm-up next, beside stage 2:** the 2.7 s and 2.0 s
   freezes are the intro's remaining stutter, and the worker cannot fix
   them. Recommend yes, starting with a trace.
9. **`phw` as a link param,** exempt from the daily, like `stb` and
   `lds`. Recommend yes.
10. **Five stages instead of the brief's four.** Recommend yes.
11. **FYI: physics runs at 0.76x real time at gs 18 in the worker** (1.0x
    for the knot, 0.4x dense): the settle and drags move in mild slow
    motion, as drags do today (0.70x), but at 55-60 fps instead of 7.

Stage 1 needs none of these answered; stage 2 assumes 5 and 10.

### Ledger items

- **K7 handle:** design done (this file); next is stage 1.
- **K9:** trace the two intro freezes (2.7 s at 1.1 s, 2.0 s at 3.8 s,
  also with physics paused) before warming shaders; the worker cannot
  remove them.
- **K8:** dense (5448 particles) is render-bound at about 30 fps (render
  alone 31-34 ms).
- **K156:** the phone plan in Design 10, run in stage 5. The phone's
  worker substep cost (big.LITTLE placement) is unknown until then.
- **K162 (4):** budgets for drags become moot when the worker ships;
  close it then.
- **K147:** its budget retires in worker mode at stage 5; `stb` stays
  for the fallback.
- **K24 and K5:** after stage 5; K24 reads `host.asleep`.
- **Probes:** 48 files use the freeze patch `__knotPS().step = ...`;
  stage 4 ports the load-bearing ones, the rest need
  `__knotPhysFreeze` or `&phw=0` when next used (a residual).
- **Cleanup idea:** `particle_system.ts` carries dead surface
  (`twistFillBias`, `hasCarve`, `chainArcLength` used only by tests).
- **Residual:** `.claude/probes/K73/probe_follow.mjs` calls
  `__knotExitPointer`, which no build defines.
- **Residual:** k7_frames' callback p50 above its interval p50 in the
  daily's intro (see What was measured).

### For stage 1

- The boundary table's line numbers are from `0d88091`; search for
  `ps.` after other merges.
- `ps.grabbedParticle` is read at about 1361 (K147's budget), 3662,
  3783 and 3963; the host must keep it current on the mirror later, so
  route those reads through `host.view` now.
- The spike's `scene.ts` and `spike_worker.ts` are a working reference
  for the graph build and the snapshot pool.

## Stage 1 handoff

Stage 1 ended 2026-10-14 at 21:10, inside its two-hour cap (it started
at 20:12). The branch is `worktree-agent-a3b1bdbb421b88478`, from master
`bf7f7e9`: the code is `be9f5bd`, the lore `c9fc1c3`, this handoff the
commit after. No master commit since `bf7f7e9` touches `src/main.ts`,
`src/physics/`, `src/core/` or `test/physics/` (master `3ecae28` at
21:01), and a trial merge onto it is clean. The evidence is in
`.claude/probes/K7/stage1/` (untracked, for the coordinator to copy).

### What is done

Every work item, and the lore line.

1. **`src/physics/physics_host.ts`:** the `PhysicsHost` interface,
   `PhysicsCore`, and `InThreadHost`, which delegates to one core. Moved
   verbatim from `main.ts` into the core: K147's header comment and
   constants (`SETTLE_CHUNK_MS`, `LOAD_SIM_CAP`, `LOAD_WALL_CAP_MS`,
   `BUDGET_WALL_CAP_MS`), the step path with the budget, the sleep gate's
   frame call, the physics-off load's and the pre-settle's slices, the
   tug's wake, `asleep`, and the counters behind `__knotPerf` and
   `__knotSettle`. `PRESETTLE_SIM`, `LOADER_DELAY_MS`, `LOADER_MIN_MS` and
   `NOMINAL_SLEEP_SIM` stay in `main.ts` with the loader they time.
2. **`grabAt(p, x, y)`** in `particle_system.ts`; `grab(x, y, r)` is
   `grabAt(nearest(x, y, r), x, y)`. Main picks with `ps.nearest(x, y,
   GRAB_RADIUS)` and calls `host.grab(p, x, y)`, also on a miss (-1),
   because the old `grab` cleared `grabbedParticle` on a miss.
3. **`src/core/scene_graph.ts`:** `buildSceneGraph(params)` returns
   `{graph, hueGroup}`: the generation, the plan and its apply, moved from
   `rebuild()`. It takes a structural `SceneParams` (the 17 fields it
   reads), so `src/core` imports nothing from `ui`; K108's exact-math scan
   covers it.
4. **`main.ts` writes only through `host`:** reset, build, grab, dragTo
   (the drag and the snap-back), release (five sites), tug, the loads, the
   step and the gate. `ps` stays as main's read alias of `host.view`, set
   from `host.build(...)` in `rebuild()`, so the readers, the pick sites
   and `__knotPS = () => ps` read as before. The delayed auto-pluck tug
   checks `host.gen`.
5. **The freeze patch:** the core calls `this.ps.step(...)` through the
   instance every frame.
6. **`test/physics/host_seam.test.ts`:** parses `main.ts` with the
   TypeScript parser, works out which names hold the system
   (`host.view`, the result of `host.build(...)`, anything typed
   `ParticleSystem`, and their aliases), and fails on `new
   ParticleSystem`, a value import of it, a call to (or a reference to)
   step, grab, grabAt, dragTo, release, tug, reset, openChain or
   addJunction on the system, and an assignment, `++`/`--`, `delete` or
   array mutator into its state. Against master's `main.ts` it lists
   exactly the 16 sites the work list names (step x4, reset, the `new`,
   the value import, dragTo x2, release x5, tug, grab).

- **Lore:** `physics-settle.md` says where the settle code lives;
  `physics_host.ts` joins the `paths:` of `physics-settle.md` and
  `physics-sleep.md`, and `docs/lore_index.md` follows.

### Where it departs from the interface in work item 1

- **No `setTuning`:** `frame`, `loadFrame` and `presettleFrame` take the
  tuning per call, as main built it every frame. A worker host can send
  `tuning` when it changes.
- **No `presettle(): Promise`:** its continuation would run after the
  frame's render, so the scene would show a frame later and the
  pre-settle's times in `__knotSettle()` would shift. It is slices
  instead: `beginPresettle()`, then `presettleFrame(tuning, settleFirst,
  simCap, workCap, mayFinish)` each animation frame (`mayFinish` is
  main's loader check), then `finishPresettle(loaderShown)` before main's
  UI and `goLive(budgetMs)` after it. The physics-off load is the same
  shape: `beginLoad()`, `loadFrame(tuning)`, `endLoad()`.
- **The gate stays after the render:** `frame(dt, tuning, now, live,
  budgetMs)` steps, and `gateFrame(ignoreTemp)` runs the gate after the
  render, as on master, because `fabricTick` can wake the knot in
  between. One order change: when the gate trips, the core ends the
  budget inside `gateFrame`, before main's `freeze()`; master ran
  `freeze()` first. Inferred harmless (`freeze()` only sets physState,
  asleep and frozenSig), and the A/B's `endedBy` and first sleeps match.
- **More members:** `presettling`, `settleLagS`, `sleep()`, `armBudget`,
  `endBudget`, `disarm`. `build(graph, params)` ignores `params`
  in-thread; the worker will build from them.
- **`asleep` belongs to the host** (`host.wake()`, `host.sleep()`); main's
  `wake()` also marks the render dirty. A tug with a nonzero count wakes
  in the core, and main still calls its `wake()` for the render (a
  double wake, harmless).

### Verification (observed)

- `npx tsc --noEmit` is clean. `npm test`: 72 files passed and 1
  skipped; 941 tests passed and 1 skipped (`npm_test.log`). No snapshot
  or fixture changed: the golden, the K87 pin and the golden dailies
  hold.
- **k7_frames** under the perf lock (`run_k7.ps1 -Batch batch_ab.txt`;
  `k7_results.jsonl`, `frames/`, `summarize.mjs`, `batch_ab.log`): master
  `bf7f7e9` on 5810 against the branch `be9f5bd` on 5811, built and
  served by `serve_ab.ps1` (`scripts/preview.ps1 -BuildOnly`, then `vite
  preview`), interleaved, each run with a drag and a wake, stamps
  checked. The daily is the bare URL; the knot is
  `?7k&mf=0&am=instant&snd=none`.

  | run | intro fps | first sleep (s) | vis to sleep fps | drag fps | settle lag (s) | endedBy (pre / budget) |
  |---|---|---|---|---|---|---|
  | master daily a | 22.4 | 20.68 | 28.7 | 7.0 | 9.60 | work / sleep |
  | master daily b | 22.5 | 20.66 | 28.7 | 7.0 | 9.60 | work / sleep |
  | branch daily a | 22.1 | 20.96 | 28.4 | 7.0 | 9.78 | work / sleep |
  | branch daily b | 22.6 | 20.68 | 28.7 | 7.0 | 9.62 | work / sleep |
  | master knot | - | 16.56 | 36.6 | 8.9 | 7.78 | - / sleep |
  | branch knot | - | 16.69 | 36.4 | 8.9 | 7.77 | - / sleep |

  Sim at the first sleep is 5.0 in all six; a substep costs 10.4-10.6 ms
  (daily) and 8.2 ms (knot) on both; the drag's physics p50 is 124-126 ms
  (daily) and 98.6-98.7 ms (knot) on both. No page errors, no context
  loss.
- **Real input** (`input_probe.mjs`, `input_results.jsonl`): the same
  outcome on both builds in every scenario.
  - A tap at `ptg` 0: the positions, prev and zPos hash, simTime and the
    step count unchanged, still asleep, and a pluck.
  - A drag (press, past the slop, a circle, a hold, the release): the
    same particle grabbed at the start and mid-drag, awake, 57.75 px from
    the pointer on both; `grabbedParticle` -1 after the release; asleep
    again 2.83 s later.
  - A rebuild in mid-drag (the seed's dice): a new system, nothing
    grabbed on it, no errors, live, asleep after.
  - A tap's tug at `ptg=.3`: the stretch moved, the knot woke and slept
    again (2.9 s).
  - The freeze patch: with `__knotPS().step = function(){}` and a wake,
    simTime held at 5.000 while awake; with the patch deleted it advanced
    (to 7.55).
  - The daily: one arrow-key move, a reload: the attempt was restored
    (the same head, moves and saved record).
  - On both builds, not new: a 404 on each page load (index.html links
    no favicon; inferred: Chrome's favicon request) and PixiJS's
    "Attribute aGap / aGapId / aUV is not present in the shader"
    warnings.
- **The deterministic hidden loads** (`load_probe.mjs`,
  `load_results.jsonl`, `batch_load.log`; under the perf lock,
  21:05-21:07): the physics-off load (`phy=0`) and the settle-first
  pre-settle (`lds=5`), each for the knot (`?7k&mf=0&snd=none`) and the
  fabric (`?7k&snd=none`), on fresh loads. Both step at a virtual 60 fps
  and end on the sim-time gate, so they can be compared bit for bit, and
  master and the branch end in the same state in all four: the same
  FNV-1a hash of positions, prev and zPos (knot `471160618`, 2592
  particles; fabric `2901863473`, 3034), sim 5.000000000000038, 300
  steps, for `lds=5` the pre-settle's `endedBy` sleep, and the same hash
  1.5 s later. On both builds the two paths also agree with each other (`phy=0`
  and `lds=5` reach the same hash). Only the wall times and `loadFrames`
  (the frames the physics-off load took: 151 and 159 on master, 151 and
  153 on the branch) differ; inferred, the wall-time slicing.

### Not done

- Nothing in the stage's list.
- Not measured: gs 18, dense, the phone, and `stb=0` (real-time stepping)
  on the branch. The A/B covers the daily and the knot, as the
  verification asks.

### For stage 2

- **Build on `PhysicsCore`.** Its `frame()` is master's step path
  (`budgetedStep` while armed and live, else `ps.step`), and the gate is
  `gateFrame()` after the render. In the worker the gate runs at batch
  ends (Design 1 and 5); `gateFrame()` becomes a no-op or a notice there.
- **The step split** (`beginFrame`/`runSubstep`) goes under
  `budgetedStep` and `ps.step`; the freeze patch needs `step` still
  called through the instance in-thread.
- **`grab` takes -1** (a miss clears the grab), so the protocol's `grab
  {gen, particle, x, y}` should too.
- **`__knotPhys` calls `sys.readSlideStats()`**, which resets the slide
  counters on the system: a read that writes telemetry. The guard test
  allows it (not in its mutator list); under the mirror it needs the
  bridge (Design 8) or a worker-side count.
- **The readers** go through main's `ps` alias of `host.view`; the pick
  sites are `ps.nearest(x, y, GRAB_RADIUS)` (K298 swaps in its mouse
  pick radius there, a plain argument), plus `__knotPS`, `__knotPhys`,
  `__knotFabric`, `__knotPoint` and the renderers.
- **The pre-settle is synchronous slices,** not a Promise (see above).
  A worker host can keep the same calls and answer them from the
  worker's `settled` message, a frame late, which stage 3's A/B should
  look at.
- **`gen` bumps on every build;** the auto-pluck's delayed tug checks it,
  and the worker protocol drops older gens.

## Stage 2 handoff

Stage 2 ended 2026-10-14 at 23:18, inside its two-hour cap (it started at
22:15). The branch is `worktree-agent-ad436f128119f6c81`, from master
`b72d5dd`: nine commits, `3d58fc9` to `712d07c`, and this handoff the
commit after. Master (`7effaae`, 22:53) has changed nothing under
`src/physics/`, `src/core/` or `test/physics/` since `b72d5dd`, and a
trial merge (`git merge-tree`) finds no file changed on both sides. The
evidence is in `.claude/probes/K7/stage2/` (untracked, for the
coordinator to copy). Everything is built and tested on fabric (maze)
designs, and nothing that only knot mode needs was built (K326 removes
knot mode).

### What is done

Every work item.

1. **The step split** in `particle_system.ts`: `beginFrame(dt)` does the
   accumulator math (and resets the frame's max move when substeps are
   owed) and returns the substep count; `runSubstep(tuning)` runs one.
   `step()` is `beginFrame` plus its loop, the same float operations in
   the same order, still called through the instance, so the freeze
   patch works in-thread. `PhysicsCore` gains `beginBatch(dt, tuning)`,
   `frame()`'s unbudgeted step for the worker (it records what
   `gateFrame()` reads), and `build(graph, gen?)` takes main's gen.
2. **`src/physics/snapshot.ts`:** an 18-slot f64 header (`SNAP_HEADER`;
   `H` names the slots: gen, seq, simTime, substeps, lag, wallAt,
   maxMove, asleep, settleComplete, contactsStatic, ridersPending,
   grabbed, n, c, emergent, pending, inputs, frames), the positions (f32,
   8N bytes), the passes (f64 over ctrl, over displayF, under ctrl, under
   displayF: 32C bytes, NaN for an undefined displayF) and a fixed table
   of `EMERGENT_MAX` (256) emergent rows of `EMERGENT_ROW` (5) f32: i, u,
   j, v, over. `snapshotBytes(n, c)` is 144 + 8N + 32C + 5120 (40,936
   bytes at `?7`). `writeSnapshot(ps, buf, meta)` and `readSnapshot(buf)`
   throw on a buffer of the wrong size. `fingerprintOf(ps)` (n, c, the
   chain count and an FNV-1a hash of the initial positions) goes in
   `ready`. In `particle_system.ts`, `writeEmergentRows` fills the table
   and the protected `emergentPair` turns a row into a reader's pair.
3. **The mirror,** `MirrorSystem` in `src/physics/mirror_system.ts`, a
   subclass. `applySnapshot(view)` writes the positions, and each pass's
   ctrl and displayF in place on the same pass objects, and throws on
   another build's n or c. It overrides simTime, pendingTime, maxMove,
   settleComplete, contactsStatic, ridersPending and emergentCrossings,
   and adds `snapshotSeq`, `snapshotWallAt`, `snapshotInputs` and
   `workerAsleep`. `grabAt`, `dragTo` and `release` are the live class's
   (they write only the grab), so `grabbedParticle` reads right after
   main's call; `step`, `beginFrame`, `runSubstep`, `tug` and `reset`
   throw.
4. **`src/physics/physics_worker_core.ts`:** `PhysicsWorkerCore(scheduler,
   post)` with `onMessage(msg)`, on stage 1's `PhysicsCore`, and three
   schedulers: `SyncScheduler` (lockstep), `ManualScheduler` (a test runs
   tasks one at a time) and `ChannelScheduler` (a MessageChannel, for the
   worker). `MainToWorker` and `WorkerToMain` type the protocol, which is
   the brief's with the changes below. Init takes only a newer gen; any
   other gen message of another gen is dropped. The clock (Design 4):
   - a frame's dt queues; a batch takes the queue through `beginFrame`
     (so at most 0.25 s or 30 substeps) and runs one substep per task,
     each followed by a snapshot if one of the 4 pooled buffers
     (`SNAPSHOT_POOL`) is free; a `give` posts the latest state if it
     changed since the last snapshot;
   - while a batch is in flight, queued time past `LAG_MAX_S` (0.05 s) of
     backlog (the queue plus the batch's remaining substeps) is dropped
     and counted in the header's lag;
   - the sleep gate runs at each batch's end, and a trip discards the
     queue; frames are discarded while asleep, frozen, settling or
     halted;
   - grab, drag, release, tug and tuning apply on arrival, between
     substeps (drags coalesce: the last before a substep wins); a tug
     with a nonzero count wakes the gate (the core's tug);
   - a non-finite max move at a batch's end halts stepping until the next
     init or settle;
   - `settle` runs the in-thread loop one `SETTLE_CHUNK_MS` slice per
     task and posts `settled`;
   - a throw in a message or a task posts `error`, and the core then
     handles only give, pause, resume, freeze, dump and a newer init.
5. **Tests,** on fabric designs: `test/physics/fabric_scene.ts` builds
   one from a link (temperature 0 unless a test sets it; a knot link
   throws).
   - `test/physics/physics_host.test.ts`, 14 tests. Eight drive the
     worker core (SyncScheduler) and an `InThreadHost` side by side and,
     after every frame, compare positions, prev, zPos, the passes,
     simTime, the pending remainder and asleep bit for bit, and the
     mirror (fed the worker's snapshots) with the live system's
     positions, passes, simTime, pendingTime, maxMove, settleComplete,
     contactsStatic, ridersPending, grabbedParticle, asleep flag and
     emergentCrossings. Their scripts: 60 fps through a grab, a violent
     circling drag that makes emergent crossings, release, tug, tuning,
     sleep and wake, reset, the two gates tripping on the same frame and
     a tug waking both; 25 fps with the remainder carried, then a tuning
     only the worker gets, which shows at once (the comparison can
     fail); the temperature on for 90 frames, then off, both asleep on
     the same frame; the pre-settle to its sim cap; settle-first; the
     physics-off load; the halt on an injected Infinity; stale gens
     dropped and a gen-2 init. Four run the core between substeps: a
     drag between a frame's substeps lands on the next substep; the
     latest state waits for a buffer and goes out on give; backlog past
     `LAG_MAX_S` drops as lag; and, on a real `ChannelScheduler`, frames
     that arrive mid-batch join one batch. Two cover the probe messages
     (stepUntil, dump, freeze, pause, resume) and failures (a malformed
     give; a throw inside a scheduled substep).
   - `test/physics/snapshot.test.ts`, 8 tests: the layout and sizes, a
     wrong size rejected, the round trip (positions, passes, emergent
     rows and every header slot), NaN as undefined, the fingerprint, and
     the mirror (the live system's readers on the same pass objects; the
     grab recorded and stepping refused; another build's snapshot
     refused).

### Where it departs from the brief

- **The mirror is a subclass in its own file,** not code in
  `particle_system.ts`; the live class carries only the protected
  `emergentPair` for it. Writes into its positions array cannot throw
  (a plain Float32Array); the stepping calls, tug and reset do.
- **`new PhysicsWorkerCore(scheduler, post)` and `onMessage(msg)`,** not
  `onMessage(msg, post)`: the post function is fixed for the core's life.
- **`settle` carries `presettleFrame`'s arguments** (`kind: "presettle"`,
  settleFirst, simCap, workCap) or `kind: "load"`, not maxSim and
  maxWall. The worker ends the pre-settle at its end condition (main's
  loader check, `mayFinish`, is always true there) and sets asleep
  itself when it ended on a sleep: `goLive` without K147's budget, which
  Design 5's clock replaces. `settled` carries gen, endedBy (sleep, sim,
  work or wall; done for the load; halted), sim, workMs and ms.
- **Added:** the `wake` and `sleep` messages (the host's calls), `tug.id`
  (echoed in `tugged`), `frame.ignoreTemp` (the gate's argument; a batch
  takes its latest frame's), `ready.bytes`, `snap.gen`, and the header's
  pending, inputs and frames.
- **Reset, sleep, freeze, init and settle abort the batch in flight:** its
  remaining substeps and queue are dropped, and no gate runs for it.
- **No `halted` message:** main reads the snapshot's non-finite maxMove,
  as it reads `frame()`'s false in-thread. The check misses NaN: a NaN
  displacement fails `d * d > max`, so maxMove stays finite and only an
  infinite move halts. Master does the same.
- **The mirror has no prev, zPos, contact state or slide stats:**
  `readSlideStats` and the phase probe wait for stage 4's bridge, and the
  mirror's `release` returns speed 0 (main discards it). Its grab is
  main's: neither a worker reset nor a snapshot clears it.
- **Bit-identity holds in lockstep only.** Asynchronously, frames that
  arrive mid-batch join the next batch (one `beginFrame` for their summed
  dts, one gate), and inputs land between whichever substeps they arrive
  between.
- **A malformed message breaks the core** (it posts `error`), as a throw
  in a task does.
- **`stepUntil` runs inside its message** (frames of 1/60 s, no gate),
  ignores asleep and freeze, and counts as neither a frame nor an input.

### Verification (observed)

- `npm test` at `712d07c`: 75 files passed and 1 skipped; 973 tests
  passed and 1 skipped, in 111 s (`full_suite3.out.txt`). No snapshot or
  fixture changed: the golden, the K87 pin and the golden dailies hold.
- `npx tsc --noEmit` is clean, and so are the tests (`npx tsc --noEmit -p
  .claude/probes/K7/stage2/tsconfig.tests.json`; the root tsconfig
  includes only `src`, so nothing type-checks the tests today). `npm run
  build` passes at `712d07c` (`build_head.out.txt`).
- **The split** under the perf lock (`run_split_timing.ps1 -Reps 5`,
  `split_timing.ts`, `results.md`): 600 substeps from a fresh build (the
  settle, the costliest phase), `step()` against `beginFrame` plus
  `runSubstep`, alternated, a fresh system per run. After 600 substeps
  the bits are identical (positions, prev, zPos, passes, simTime,
  pending), and the time is the same within noise (run-to-run spread is
  about 5%):

  | design | N | C | `step()` median | split median | ratio |
  |---|---|---|---|---|---|
  | `?7&gs=8` | 563 | 71 | 1115 ms (1.86 ms a substep) | 1105 ms | 0.991 |
  | `?7` (today's defaults) | 3027 | 358 | 6608 ms (11.0 ms a substep) | 6583 ms | 0.996 |

- **Lockstep:** bit-identical on every frame of every script above,
  through the violent drag's emergent crossings, the gates tripping on
  the same frame, and the halt on both sides.

### Not done

- Nothing in the stage's list.
- Not run: a real Worker or a browser (stage 3), so not the snapshot's
  cost there either (the spike measured under 0.1 ms a frame).
- `frame.ignoreTemp` is passed through but not tested where it matters:
  with the temperature above 0 the contacts never go static (the
  temperature test checks it), so the gate cannot trip either way.

### For stage 3

- **`physics_worker.ts`** connects `PhysicsWorkerCore` to
  `self.onmessage`, `postMessage` (with the transfer list) and a
  `ChannelScheduler`; `WorkerHost` goes behind `phw`.
- **An init keeps the previous gen's asleep flag** (`PhysicsCore.build`,
  as in-thread), so main follows an init with its settle or a wake, as
  `rebuild()` does.
- **Drop snapshots of another gen** (`snap.gen`) and give their buffers
  back; the worker lets a buffer of another size go.
- **A stale asleep flag:** a snapshot written before the worker saw
  main's latest input can still say asleep. Main counts the inputs it
  posts after the init (every message carrying the gen except frame and
  stepUntil; the worker's count restarts at 0 on init) and trusts
  `workerAsleep` only once `snapshotInputs` has caught up.
- **Give buffers back promptly** (4 in the pool; keep the two newest for
  interpolation). With none free the worker holds the latest state and
  posts it on the next give, so the last state, asleep flag included,
  always arrives.
- **Pick on the mirror** (`nearest` matches the live system's; tested)
  and post `grab{particle}`, a miss (-1) too.
- **Interpolate by `snapshotWallAt`:** the worker writes
  `performance.timeOrigin + performance.now()`, which main reads on the
  same clock.
- **The fallback's checks:** `ready.fingerprint` against
  `fingerprintOf(mirror)`, and `ready.bytes` against `snapshotBytes`.
- **The build:** `worker: { format: "es" }` in `vite.config.ts`; check
  that the notices plugin (K122) lists the worker chunk's packages.
- **Init's params must be structured-cloneable** `SceneParams` (plain
  data; the worker regenerates the graph with `buildSceneGraph`).
- **The pre-settle answers a frame late:** main's slices become one
  `settle` message and a wait for `settled`. The worker stops at the end
  condition, so the loader's minimum time, and whether frames go out
  while the loader shows, stay main's decisions.
- **`frame{ignoreTemp}`** carries main's gate argument, and
  `__knotSettle` can read the snapshot's lag where it read `settleLagS`.
- **Clear main's grab** (the mirror's `grabbedParticle`) on a reset or a
  rebuild: snapshots do not carry the worker's grab into the mirror.
- **The A/B** compares outcomes (the first sleep, the sim at it,
  endedBy), as stage 1's did: async batches are not bit-identical to
  in-thread frames.

## Stage 3 handoff

Stage 3 ended 2026-10-15 at 00:43, inside its two-hour cap (it started
2026-10-14 at 23:22). The branch is `worktree-agent-a9f593eca9038e6d3`,
from `472ef83` (stage 2's handoff): three commits, `5fcee42` to
`6bbd300`, and this handoff after them. Master (`1e7456c`) has
changed `src/main.ts` since (`2c81a92`, K329/K333/K334's key moves); a
trial merge (`git merge-tree`) combines the two without a conflict, and
no other file changed on both sides. The evidence is in
`.claude/probes/K7/stage3/` (untracked, for the coordinator to copy).
Everything was built and probed on fabric (maze) designs, and nothing
that only knot mode needs was built (K326).

### What is done

Every work item.

1. **`src/physics/physics_worker.ts`,** the entry: `self.onmessage` into
   `PhysicsWorkerCore` with a `ChannelScheduler`, its posts carrying the
   transfer list. The worker scope is typed by hand: the DOM lib and the
   webworker lib collide in one tsconfig.
2. **`src/physics/worker_host.ts`:** `WorkerHost` implements
   `PhysicsHost`.
   - The mirror, built from main's own graph; `ready` is checked against
     `fingerprintOf(mirror)` and `snapshotBytes`.
   - The snapshots: the worker's pool is 4 (stage 2's `SNAPSHOT_POOL`);
     main keeps the two newest and gives the rest back at once, and gives
     back another gen's and stale ones (written before a reset) unread.
   - Interpolation (design 4): a frame draws the state at now - D, D the
     median of the last 16 snapshot intervals clamped to 8-50 ms
     (`interpDelay`); positions and pass positions are lerped between the
     two newest snapshots by their wall times (`lerpInto`; a closed
     chain's seam or an undefined displayF takes the newer value), the
     discrete state comes from the newer. On by default
     (`opts.interpolate`); a probe sets `window.__knotHostOpts =
     { interpolate: false }`, read every frame.
   - Input: grab, drag and release act on the mirror first (main reads
     `grabbedParticle` right after its own call), then post; the pick
     runs on the mirror. A reset or a rebuild clears main's grab, and a
     reset drops the snapshots written before it.
   - The gate: asleep once the newest snapshot says the worker slept and
     has seen every input main posted (`snapshotInputs >= inputsPosted`);
     the asleep frame shows that snapshot exactly, not interpolated.
   - Gen ids on every message; `visibilitychange` posts pause and resume.
   - The settles: the pre-settle and the physics-off load are one
     `settle` message each; progress comes from the snapshots, and each
     ends on `settled` plus the snapshot after it.
   - The fallback to an `InThreadHost`: a spawn that throws
     (`construct: <message>`) or no `Worker` (`no-worker`), `onerror`,
     `messageerror`, a `postMessage` that throws, a worker `error`
     message, an unreadable snapshot, no `ready` within
     `READY_TIMEOUT_MS` (3000) of ticks, or a size or fingerprint
     mismatch. A fallback after a scene exists calls `onFallback` (main's
     `rebuild()`) from a `setTimeout(0)`, never inside a host call, and
     logs one console warning.
   - `stats().host` (`HostInfo` in `physics_host.ts`, also
     `__knotPerf().host`): the kind, the fallback's reason and the
     worker's counters (ready, readyMs, snapshots, given, frames, inputs,
     delayMs, lastT, snapAgeMs, snapSim, lagS and more).
3. **The build:** `worker: { format: "es", plugins: () =>
   [noticesWorker()] }` in `vite.config.ts`. The worker chunk
   (`physics_worker-*.js`, 87.7 KB) carries the notices banner, as the
   main chunk does: `notices()`'s config hook now sets the worker's
   output options too. `noticesWorker()` (`notices/vite_plugin.ts`)
   records the worker chunk's modules for `notices()`'s page. The page
   kept its size (27.58 KB) and lists simplex-noise, which the main chunk
   bundles too (`InThreadHost` and the mirror both import
   `ParticleSystem`), so it is covered either way. That the worker's
   modules reach the collector before main's `generateBundle` is
   inferred (Vite bundles a worker during main's transform), not
   observed.
   **The dev server serves the module worker:** `dev_http.mjs` (no
   browser) read the dev transform's worker URL
   (`/src/physics/physics_worker.ts?worker_file&type=module`) and fetched
   it and its whole import graph: 20 modules, all 200, simplex-noise from
   the optimized deps. In a browser (`dev_check.mjs`, under the perf
   lock, `?7k&snd=none&phw=1`, `dev_results.jsonl`, two runs): Chrome
   started the worker from that URL, the host was ready in 397 and
   417 ms (kind worker, no reason), and no page errors. The second run
   waited for the live phase: main posted its first frame at 6.7 s,
   after 23 snapshots of the pre-settle, and 3 s later it had posted 172
   frames and the newest snapshot's sim time had gone from 0.32 to
   2.67 s.
4. **`phw`** (`physicsWorker`, a flag, default false) in `url_state.ts`,
   appended to `CODEC_PARAMS` at index 135 (codec v5 unchanged; the
   key-order pin re-frozen), exempt from the daily in `daily_link.ts`
   after `stb` and `lds`, and the PHYSICS WORKER PARAM entry in
   `.claude/rules/gameplay-links.md`. No panel row: main reads it once.
5. **`main.ts`:** `params.physicsWorker ? new WorkerHost(() => rebuild())
   : new InThreadHost()`, and `host` in `__knotPerf()`. Nothing else.
6. **`test/physics/worker_host.test.ts`,** 9 tests against a fake Worker
   that runs the stage 2 core synchronously (its messages wait for
   `deliver()`): `interpDelay`; a build going ready and showing the
   newest snapshot delivered; the grab cleared on a reset and a rebuild;
   the asleep flag trusted only from a snapshot that saw every input;
   the spawn failures (a throw, "no-worker", and the default spawn where
   Node has no Worker); a fingerprint mismatch (the fallback,
   `onFallback` after the call, the rebuild in-thread); a worker error;
   the ready timeout's ticks; and a main-thread stall past the whole
   timeout that does not fail a working worker. The codec, link and
   daily tests gain the new key.
7. **Probes** in `.claude/probes/K7/stage3/`: `lib.mjs` (a static server
   for a build under `/knotmaze/` and an off-screen headed Chrome with
   its own profile), `run_s3.ps1 -Batch <file> [-Build <dir>] [-Port
   <p>]` (a batch's lines under the perf lock), `smoke.mjs`,
   `fallback.mjs`, `interp_ab.mjs`, `k7_frames.mjs`,
   `instant_check.mjs`, `dev_check.mjs`, `dev_http.mjs` and
   `summarize.mjs`. Results are in `*_results.jsonl` and the
   `batch_*.log` files; the builds in `builds/` (s3a at `5fcee42+`, s3b
   with the tick timeout, s3c at `b8515f8+`).

### Where it departs from the brief

- **The ready timeout counts ticks,** not wall time: 12 ticks of
  `READY_TICK_MS` (250 ms), each worth its nominal time however late it
  fires. `5fcee42`'s wall-time timer failed a working worker on a
  cold-profile `am=instant` load: the first frame compiles every shader
  at once, main stalled 5.25 s (a rAF gap from 379 ms), and the timer
  fired with the worker's `ready` still queued behind the stall. With
  ticks (`b8515f8`) the same load stays on the worker (ready at 5.8 s,
  `readyMs` 5412).
- **`presettleFrame` reports a spent prediction** (`simDone: simCap`,
  `workMs: 0`) until the settle's first snapshot arrives. Main's loader
  check (the pre-settle loop in `main.ts`, near line 1184) would read a
  `simDone` of 0 as an endless settle and show the loader on the first
  frame; with this it shows only past `LOADER_DELAY_MS` (300), as
  in-thread.
- **`stats().budget` is null** on the worker: the worker's clock (the
  backlog past `LAG_MAX_S` dropped) replaces K147's budget. `armBudget`
  and `endBudget` only record the first sleep after going live, in
  `settleInfo.budget` (ms, sim, lagS, endedBy; costMs 0).
- **`tug()` answers 0:** the worker wakes itself, and its `tugged` clears
  main's asleep flag, so main skips its own `wake()`.
- **`noticesWorker()`** is a second, small plugin: Vite runs only
  `worker.plugins` in a worker's build, so `notices()` alone never sees
  the worker's modules.
- **`given` can exceed `snapshots`** in `HostInfo`: another gen's and
  stale buffers are given back without counting as received.
- **No `typeof Worker` guard in `main.ts`** (`6bbd300`): `phw=1` always
  constructs a `WorkerHost`, whose own spawn falls back with the reason
  "no-worker", so the reason always says why it runs in-thread.

### Verification

Observed unless marked inferred. Desktop only (the phone was off-limits
in this stage), fabric designs.

- `npm test` at `6bbd300`: 78 files passed and 1 skipped; 1039 tests
  passed and 1 skipped, in 110 s (`full_suite_s3.out.txt`). No snapshot
  or fixture changed: the golden, the K87 pin and the golden dailies
  hold. `npx tsc --noEmit` is clean, and so are the tests
  (`tsconfig.test.json` in the probes folder); `npm run build` passes.
- **The smoke** (`smoke.mjs`, build s3a, `?7k&snd=none&phw=1`, 3034
  particles, `smoke_results.jsonl`), with 0 page errors:
  - the load: ready in 331 ms, live at 3.8 s, the first sleep at
    12.8 s (the same link in-thread: 21.0 s; not under the lock);
  - a tap at ptg 0 left the positions bit-identical and the knot
    asleep; a tug at ptg .3 woke it in 23 ms and it re-slept in 3.3 s;
  - a drag (a 1.5 s circle, then a 500 ms hold): the grabbed particle
    sat 59.96 px from the pointer (in-thread 59.91), the grab cleared on
    release, and it re-slept in 3.56 s;
  - a rebuild mid-drag: a new system, grab -1, the new gen ready in
    37 ms, asleep after;
  - hidden and shown at `lds=5`: snapSim held at 0.2667 while hidden and
    went on when shown;
  - `phy=0`: frozen, loadMs 7005; `am=instant` (a warm profile): the
    first sleep at 7.2 s (in-thread 16.5 s); the daily (#3): badge
    "daily", the first sleep at 8.2 s.
- **The fallback** (`fallback.mjs`, `fallback_results.jsonl`): every
  case ended in-thread, settled, took a drag and re-slept, with 0 page
  errors and the reason set:
  - Worker overridden to throw: `construct: probe: Worker blocked`;
  - a worker that never answers: `no ready within 3000 ms` (3 posts,
    then terminated);
  - a worker that throws while loading: `onerror: Uncaught Error: probe
    boom`;
  - a forged fingerprint: `fingerprint 3034/345/91/34298777 vs mirror
    3034/345/91/34298776`;
  - no Worker at all (build s3c): `no-worker`, with one console warning.
  - `phw=0` reports in-thread with no reason.
- **The interpolation A/B** under the perf lock (`interp_ab.mjs`, build
  s3b, `interp_results.jsonl`, `interp/`; D about 11 ms at about
  56 fps). Per frame, d is the mean particle displacement since the last
  frame (the grabbed particle left out); jerk is mean |d_i - d_(i-1)| /
  mean d, and cv is std d / mean d (lower is smoother):
  - the settle (fresh `am=instant` loads, 4 s from the first live
    frame): jerk on 0.184 / 0.199, off 0.451 / 0.415; cv on 2.17 /
    2.26, off 2.32 / 2.39;
  - a drag (a 60 px circle at 1 rev/s, the mode alternating every
    1.5 s, 2 runs of 6 segments): jerk on 0.334 / 0.298, off 0.646 /
    0.722; cv on 0.33, off 0.46-0.48; the same fps (56.0-56.7) and no
    frame without motion (zeroFrac 0).
  - Interpolation stays on. Inferred cost: the drawn state trails the
    newest snapshot by about D.
- **A first k7_frames look** on the daily (build s3a, under the lock,
  2988 particles, `k7_results.jsonl`, `frames/`):

  | | phw=0 (2 runs) | phw=1 (2 runs) |
  |---|---|---|
  | drag fps | 7.0 (interval p50 141, p95 159 ms) | 55.1 / 54.8 (p50 17.6, p95 18.5, max 36 ms) |
  | physics on main during the drag | 124.8 ms a frame (12 substeps of 10.45 ms) | 0 |
  | wake fps | 9.6 | 55.4 / 55.7 |
  | first sleep | 21.07 / 21.02 s | 12.48 / 12.17 s |

  On phw=1 the intro ran at 28 fps, with freezes of 3.1 s and 2.2 s
  (56.7 fps after it); the pre-settle took 834 ms (ended by work), and
  the first sleep came 11.3 s after going live (5.0 sim-s, 1.41 s of
  lag dropped). These meet stage 4's desktop targets at a first look.
  **The drag in `k7_frames.mjs` is move-count paced** (188 moves with a
  16 ms sleep each), so its length follows the frame rate: 27.1 s of
  wall in-thread (189 frames), 6.6 s on the worker (about 360). Sim per
  wall second was about equal (0.70 and 0.75); the in-thread drag
  advanced more sim only because it lasted four times longer.
- **Cold-profile `am=instant`** (`instant_check.mjs`,
  `instant_results.jsonl`): the 5.3 s main-thread stall of the first
  departure. Inferred: the first frame's shader compiles on a cold GPU
  cache (K307).
- **Not the worker's:** the 404 on every load is `/favicon.ico` (the
  probe server's record of what it answered 404, `instant_results.jsonl`'s
  `missing`; K36), and PixiJS's "Attribute aGap / aGapId / aUV is not
  present" warnings show on master too (stage 2's handoff; K311).

### Not done

- The phone (off-limits in this stage): the worker's substep cost and
  the frame rate there are unknown.

### For stage 4

- **The diagnostic bridge:** on the worker `ps` is the mirror, so the
  probe hooks that reach into `ParticleSystem` read snapshots, and a
  probe's freeze patch on `ps` never reaches the worker's system. The
  mirror has no prev, zPos, contact state or slide stats.
- **Desktop acceptance under the lock.** Make `k7_frames`' drag a fixed
  wall-time drag first, or compare drags by sim per wall second.
- **The interpolation's latency** (about D, 11 ms at 56 fps) sits inside
  the 50 ms target, but nothing measured pointer-to-pixels end to end.
- **Cold shader-compile freezes on both hosts** (K307): 5.3 s on a
  cold-profile `am=instant` load, 2.2-3.1 s in the daily's intro.
- **The phone.**

## Stage 4 handoff

Stage 4 ended 2026-10-15 at [[END]], inside its two-hour cap (it started
at 00:48). The branch is `worktree-agent-abee0faca59fb8636`, from
`7f4c1bd` (stage 3's handoff): `681cd3d` (the bridge), `02357d4` (the
two tracked ports), [[LORE_SHA]] (the lore) and this handoff. Master
(`fa7f9dc`) has changed `src/main.ts` since (K76 stage 2c); a trial merge
(`git merge-tree`) combines the two without a conflict, and no other file
changed on both sides. The evidence is in `.claude/probes/K7/stage4/`
(untracked, for the coordinator to copy): the probes, the batches
(`s4_*.txt`) and their logs, `k7_results.jsonl`, `k7_latency.jsonl`,
`frames/`, and the helpers' `k307/` and `ports/`. The builds
(`builds/`, `k307/builds/`) and K307's raw traces
(`k307/runs/*/load1.trace.json`, 79 MB) need not be kept.

### What is done

Every work item. The targets are under 3.

1. **The bridge** (`681cd3d`, design 8). Every hook works on both hosts.
   - `await __knotPhysFreeze(on)` returns `{frozen, simTime, kind}`.
     In-thread it IS the old patch (an own `ps.step = function(){}`,
     deleted to unfreeze), so that path is unchanged. With the worker it
     stops the worker's live clock (a `freeze` message) and resolves once
     main shows the frozen state exactly (a fence: the first snapshot
     written after the freeze, drawn without interpolation).
   - The mirror's `step` is an accessor whose setter throws: "physics
     runs in a Web Worker (phw=1), so ps.step cannot be patched: freeze
     with __knotPhysFreeze(true) (a Promise), or load the page with
     &phw=0 for the in-thread system."
   - `await __knotStepUntil(simTime)` steps 1/60 s frames to that sim
     time through the class's own step (`ParticleSystem.prototype.step`),
     frozen or not, and does not count them as live stepping.
   - `await __knotPhysDump({arrays})` returns `{gen, simTime, n, c,
     kind, hashes, arrays?}`: FNV-1a hashes of positions, prev, zPos and
     the pass ctrls (`src/physics/probe_dump.ts`), equal across hosts for
     one state (a test). The worker answers in order, so a dump after
     `stepUntil` holds its state.
   - `__knotPluck(..., {tug})` returns a Promise that resolves once the
     tug is in the state main shows.
   - `__knotPerf()` adds `physMs` and `substeps` (cumulative live
     stepping since the build: main's `ps.step` time in-thread, the
     worker's own with a worker), `lagS`, `frozen`, `host`, and
     reveal.tick's cost (`revealMean`, `revealP95`, `revealMax`,
     `revealMsTotal`); `__knotSettle()` adds `asleep`, `physMs`,
     `substeps` and `kind`; `__knotReveal()` adds `tickMs` and
     `tickMsTotal`.
   - The worker side: `freeze`, `stepUntil` and `dump` messages in
     `physics_worker_core.ts`; the snapshot header carries the batch's
     step time (`stepMs`; the header is 152 bytes now).
2. **Ports.**
   - `scripts/diag_screenshot.mjs` (`02357d4`): `timing.host`
     (in-thread | worker) and the host's `physMs` and `substeps`. Its
     frame stats were already host-blind (rAF intervals).
   - `scripts/phone_pass/walk.mjs:95` (`02357d4`): `pinAll()` freezes
     through `__knotPhysFreeze` when the build has it, and with the old
     patch on builds before stage 4.
   - In the probes folder, as copies (the main checkout's originals are
     untouched), by a sonnet helper: `ports/K147/k147_measure.mjs`
     (reports the host and its `physMs` / `substeps`; it patched
     nothing), `ports/K279/k279_sheet.mjs` (its frozen stepping is now
     `__knotStepUntil`), `ports/K279/k279_wake.mjs` (per-frame physics
     time from `__knotPerf(1)` deltas; on a build without `physMs` it
     keeps the old wrapper), `ports/K279/k279_live.mjs` (awaits the
     tug's Promise) and `ports/g2lib/g2lib.mjs` (the union of the two
     `g2lib.mjs` lineages, freezing through the hook: copy it over a
     folder's own copy to port that folder's probes; `g2_smoke.mjs`
     checks it). `ports/run_batch.ps1` runs them all in both modes
     under the perf lock.
   - The other files that patch or wrap `ps.step` (a scan of the main
     checkout's `.claude/probes/`; lines and notes in
     `ports/FREEZE_PATCH_FILES.md`). Each tests the in-thread path only:
     run it with `&phw=0`, or port it with its kind's one line,
     feature-detected (`typeof window.__knotPhysFreeze === "function"`,
     else the old line):
     - **The freeze patch** (`__knotPS().step = function () {}`), 52
       files. Port: `await window.__knotPhysFreeze(true)` inside an async
       `page.evaluate`; an unfreeze (`delete ps.step`, or restoring a
       saved `__step`: `g1/probe_gestures.mjs:72`,
       `K7/stage1/input_probe.mjs:256`) becomes
       `await window.__knotPhysFreeze(false)`.
       - 21 library copies, which 95 probes import (`freeze` or
         `openFrozen`), so porting a folder's copy covers its probes:
         `g2lib.mjs` in `g2`, `K4`, `K75`, `K79`, `K81`, `K93`,
         `K111/stage2`, `K111/stage3`, `K111/stage4`, `K145`,
         `K154_K169/census`, `K191`, `K268`, `K298`, `K76/stage2a`,
         `K76/stage2b`, `K76/stage2c`; `lib.mjs` in `K77`, `K104`,
         `K104/collapse`, `K344`.
       - 31 probes that patch directly: `g1/` probe_capext, probe_gestures,
         probe_gx, probe_overcut_attr, probe_protab, probe_protlen,
         probe_samestate, probe_smin, probe_tipab, probe_togglediff;
         `g2/` and `K4/` census_bands, census_fx; `K104/census/census`;
         `K180/` census/census, k180_ab, k180_sheet;
         `K191/census_out`; `K21/` bg_fog, bg_sheet; `K279/k279_ab`;
         `K7/stage1/input_probe`; `K76/probe_explore`; `K79/` bg_sheet,
         k79_sheet, k79b_sheet; `K81/phone/k81phone`; `K83/k83_shot`
         (conditional: `if (freezePhysics) await ...`); `K90/k90_crops`;
         `K98/k98_shot`.
     - **A timing wrapper** around `ps.step`, 6 files: `g1/probe_perf`,
       `g1/probe_perf2` (through `wrap(ps, pproto, "step", ...)`),
       `K279/k279_wake`, and the `k7_frames.mjs` copies in `K7/design`,
       `K7/stage1` and `K7/stage3`. Port: no wrapper; difference
       `__knotPerf(1).physMs` and `.substeps` over the window or per frame
       (with the worker they arrive with the snapshots, so a frame's delta
       is a snapshot's, not a call's).
     - **Stepping a frozen scene** (a gated step plus
       `ParticleSystem.prototype.step.call`), 1 file: `K279/k279_sheet`.
       Port: freeze once, then `await window.__knotStepUntil(t)` per
       target (it overshoots a target off the 1/60 s grid by under one
       frame, where the gate clipped the last dt).
     - Not affected: Node harnesses that build their own
       `ParticleSystem` (25 files), and the historic `main.ts`
       snapshots under `K41/`.
3. **Acceptance** under the perf lock, builds of `681cd3d` (s4a) and of
   master `7f4c1bd` (its default path, in-thread), 1600x900 at dsf 1.5,
   a fresh profile per load, the drag a fixed 5 s wall-time circle. "Between
   freezes" is the intro after its last callback over 300 ms (the shader
   compiles, K307) to the intro's end, as design 10 took it.

   The daily (the bare URL, #4, 2988 particles):

   | | intro fps (p95 ms) | between freezes fps (p95) | first sleep s | sim/wall: intro, visible to sleep | drag fps (p95) | wake fps | ms/substep |
   |---|---|---|---|---|---|---|---|
   | master 1 / 2 | 20.4 / 19.7 (36) | 40.2 / 38.9 (36) | 21.39 / 21.75 | 0.17, 0.23 | 6.9 (160) | 9.2 / 9.5 | 10.7 / 10.8 |
   | phw=0 1 / 2 | 20.3 / 20.6 (36) | 40.6 / 40.5 (36) | 21.16 / 21.44 | 0.17, 0.23 | 6.9 (160) | 9.0 / 8.7 | 10.6 / 10.8 |
   | phw=1 1 / 2 | 28.2 / 28.6 (18.1) | 56.2 / 56.3 (18.1) | 12.37 / 12.37 | 0.40, 0.42 | 55.2 / 54.8 (18.5) | 55.2 / 54.4 | 10.7 / 10.8 |

   The substep costs the same in the worker as on main (10.7 ms); the
   worker wins by taking it off main's frame, not by running it faster.

   The other designs (one run each; [[OTHER_NOTE]]):

   [[OTHER_TABLE]]

   Against design 10's targets:
   - **The intro at 50 fps or more between the freezes:** met with the
     worker on every design but dense (56.2-56.3 on the daily, 56.3 at gs
     18, 55.4 on the knot, [[FABRIC_BETW]] on the fabric). Dense runs at
     37.7: main is render-bound there, not physics-bound (the callback's
     median is 24.9 ms with no physics in it, renderer.update 16.2 of it;
     on the daily it is 13.9 and 9.4). That is K8's lever, as design 10
     expected. The whole intro still averages 28-36 fps on both hosts
     because the two shader-compile freezes (about 2.9 s and 2.2 s) stay
     (K307; see 5).
   - **The daily's first sleep by 13 s:** met, 12.37 s in both runs
     (in-thread 21.2-21.4).
   - **A gs 18 drag at 50 fps or more:** met, 55.3 (in-thread 7.0).
   - **Latency p50 of 50 ms or less:** NOT met. The worker cuts it
     2.7x on the daily (p50 105 ms against 286 in-thread) and 3.3x on
     the knot (70 against 228), but what is left is the substeps the
     grabbed point needs to settle, at 10.7 ms each on the daily (see 4).
   - **`phw=0` unchanged within noise:** on the daily, s4a's `phw=0`
     matches master's default path on every column (between freezes
     40.6 / 40.5 against 40.2 / 38.9 fps, first sleep 21.16 / 21.44
     against 21.39 / 21.75 s, drag 6.9 against 6.9, wake 9.0 / 8.7
     against 9.2 / 9.5). [[PHW0_OTHERS]]
4. **Latency** (`k7_latency.mjs`, build s4a, under the lock,
   `k7_latency.jsonl`). After the first sleep, press the thread particle
   nearest the screen centre, move past the slop, hold, then 12 single
   mouse moves of 36 px alternating left and right, 700 ms apart. The
   latency of a step is the event's `timeStamp` to the end of the JS of
   the first frame whose grabbed point (as main holds it, the drawn state
   with the worker) covers 90% of where it settles for that step; the
   compositor and display after that frame (about one vsync) are not
   counted. A 36 px move settles 23.6-23.9 css px on the daily (the drag
   bound, L = 23.1 css px there), 3.2-3.7 px short of the target main
   sent, and 22.8-23.3 px on the knot (3.3-5.2 short), the same on both
   hosts.

   | run | p50 (p95) ms | first motion p50 | frames to 90% | frame interval p50 |
   |---|---|---|---|---|
   | daily, worker, 2 runs | 104.5 / 105.5 (109 / 108) | 69.2 | 5 (one step 4) | 17.6-17.7 |
   | daily, in-thread, 2 runs | 285.5 / 285.5 (288 / 291) | 285.5 | 1 | 142 |
   | knot `?7k&mf=0`, worker | 69.9 (85.3) | 51.8 | 4 | 17.6 |
   | knot, in-thread | 227.5 (241.6) | 227.5 | 1 | 121 |

   - In-thread, an event waits about a frame for its handler (140-147
     ms of queue on the daily, 112-121 on the knot: the frame in
     progress) and the next frame shows it whole: its 12 substeps run
     before the draw.
   - With the worker, the handler runs at the next frame (queue 0.2-19
     ms: Chrome aligns pointermoves to rAF), and the move shows over 4-5
     frames: the first moving frame already shows half of it (first
     motion = half, 69 ms on the daily), 90% two frames later. Inferred:
     the grabbed point needs several substeps to settle (the exact chase
     puts it on the target at a substep's start, and the constraints
     pull it back to 3.3 px short), and the worker runs about 1.6
     substeps per frame on the daily, so the last 40% of the move waits
     on the worker's throughput (10.7 ms a substep), plus the snapshot
     interpolation's D (about 11 ms).
   - Design 4's estimate (40-50 ms typical) assumed the point sits on the
     target after one substep; the first motion (52 ms on the knot, 69
     on the daily) is that estimate plus a frame's JS and the queue.
5. **K307's unattributed main-thread JS** (a sonnet helper, `k307/`:
   V8's CPU sampler inside a Chrome trace with K307's WebGL wrapper, an
   unminified source-mapped build of `7f4c1bd`, `?daily&phw=0` and
   `&phw=1`, two cold loads each, under the lock; profiling makes JS
   15-30% slower, so its 97-108 ms reads as the doc's 86). Each window
   splits into GL wait, JS and GC, and adds up to its wall time.
   - **Freeze 1 (about 86 ms, the hidden pre-settle):** the FIRST
     pre-settle step, `presettleTick` (main.ts:1171) through
     `presettleFrame` and `ParticleSystem.step`: 96 / 86 ms, of it
     `applySegmentCollision` 40 and `substep`'s own lines 28-37. It is
     cold: about 4x a warm step (22-25 ms; the worker shows the same, 91
     then 24-33 ms). `SETTLE_CHUNK_MS` (22) makes every slice one step:
     16 steps in all, one in freeze 1, about 14 in hidden frames and one
     in freeze 2. Pixi's own JS is 10-11 ms. **The worker removes the
     physics** (main's JS falls to 11.4 / 11.8 ms), but the freeze only
     shortens by 19-30 ms: the GPU process compiles serially, and
     without the physics in front, bg-vellum's 190 ms compile waits
     behind 12-15 small programs' links instead (observed in the
     GPU-thread trace; the reading is inferred).
   - **Freeze 2 (about 47 ms, the first visible frame):** half physics,
     half render. The pre-settle's 16th step (22.5 ms), then
     `finishPresettle` (main.ts:1210, 22 ms): ribbon update 16
     (`sampleOpenSpline` 6, `RibbonMesh.update` 3, `flowOffset` 2) and
     `startAppearance` 5 (RevealAnimator, buildRevealPlan); Pixi 8. **The
     worker removes the step** (main's JS 32-36 ms); the wall time is
     the section-rgb compile either way (2913 / 2914 against 2964 / 3043
     ms, inside the GPU noise of other agents' runs).
   - **The 80-96 ms frame at about 6.1 s: not reproduced at
     `7f4c1bd`.** In the helper's four traces the first frame after
     freeze 3 is a 24-36 ms task, and in the acceptance runs (minified,
     no profiler) a 29-31 ms callback in-thread and 19 ms with the
     worker; K147's budget takes ONE substep in it, then frames of 21-29
     ms (in-thread) or 11-19 ms (worker). The doc traced master
     `3e86fb5`. Nothing to fix here.
   - **Freeze 3 (about 2.2 s):** 48 ms of JS (paint palette, fillets,
     width profiles, spline sampling, one physics frame of 12 ms) inside
     the arm-strip and junction-field compiles; the worker removes the
     12 ms.
   - **Fixed in stage 4: nothing.** What the worker can take, it
     already takes (every physics slice above); the rest is render-side
     setup or GPU compile waits, K307's and K8's. Recommendations are
     under "For stage 5".
   - **Found on the way** (the worker's, observed in the trace,
     mechanism inferred): with `phw=1` the worker's `init` (posted at
     about 335 ms, before the worker had evaluated its module at 398 ms)
     is held until main processes the worker's script-evaluated
     notification, which waits behind freeze 1's long task: the worker
     idles from 398 to 692 ms, so its pre-settle starts about 300 ms
     late and the first visible frame comes at 1.16-1.21 s against
     1.02-1.05 s in-thread. And the worker idles through freezes 2 and 3:
     its clock is main's frames, one 0.25 s batch at most, so it cannot
     settle ahead while main waits on the GPU.
6. **Lore:** `probes.md` has the freeze hook, `phw=0`, the bridge and
   which probes test which path ([[LORE_SHA]]).

### Where it departs from the brief

- **Latency's target is where the grabbed point settles, not the
  pointer.** Main bounds a drag (`boundedDragTo`, L tanh(r / L) from the
  grab origin, L = tugLimit x threadWidth) and the constraints hold the
  grabbed particle short of even that, so the pointer's own position is
  never reached; the first version of the probe found no step "reached"
  on either host. A step's target is the grabbed point's position in the
  last frame before the next step, and latency runs to the first frame
  at 90% of that displacement.
- **The ported K147 and K279 probes and `g2lib.mjs` are copies** in the
  stage 4 folder, untracked like their originals.
- **One acceptance run was taken under load:** the first `phw=1` fabric
  run overlapped another agent's unlocked Chrome probe; [[RERUN_NOTE]]

### Verification

Observed unless marked inferred. Desktop only.

- `npm test`: [[NPM_TEST]]
- The bridge's tests (`test/physics/worker_host.test.ts`, "the probe
  bridge"): the worker freezes, shows the frozen state exactly and steps
  nothing until unfrozen; steps until a sim time, frozen or not; dumps
  prev, zPos and the passes; syncs; rejects what is in flight on a
  rebuild; refuses the patch on the mirror, naming the hook; and matches
  the in-thread host on the patch, `stepUntil` and the dump.
  `physics_host.test.ts` covers the in-thread side.
- `diag_screenshot.mjs` on `?7k&mf=0&am=instant`: [[DIAG]]
- The ported probes in both modes: [[PORTS_SMOKE]]
- **Not the bridge's:** with the worker, `__knotSettle().phase` reads
  `off` (K147's budget does not run there; the worker drops lag past 0.05
  s itself), so the k7_frames column of the phase is blank on `phw=1`.

### Not done

- The phone (stage 5).
- [[NOT_DONE]]

### For stage 5

- **The phone pass** on this build (design 10's plan): every hook and
  ported probe runs on the worker; `walk.mjs` pins through the hook.
  Latency on the phone is unmeasured; `k7_latency.mjs` runs there with
  a touch path added.
- **K307's freezes stay on both hosts** and dominate the intro (28 fps
  averaged on the worker, 56 between them). The worker cannot hide them:
  the compiles block main, which drives the worker's clock. Recommended
  (K307's lever, not K7's): compile the programs in parallel and before
  the first visible frame, as K307's doc measured, and look at which
  call sites queue the 12-15 small programs ahead of bg-vellum.
- **The worker start gate** (above): construct the Worker at the top of
  boot, or let main yield once after posting `init` before the first
  long frame, or have the worker say hello first and post `init` on it
  (`worker_host.ts:315`). Worth about 0.2-0.3 s to the first visible
  frame on the desktop, more on the phone (inferred).
- **The worker idles through the compile freezes:** letting it run
  ahead of main's frames during the pre-settle (a budget of its own)
  would settle during the freezes. Its saturation while the knot
  settles (97% busy, `lagS` 1.04 s by 8 s, the helper's trace) is the
  cost to watch on the phone.
- **Dense is render-bound on main** (renderer.update 16 ms a frame):
  K8.
- **K147's budget in worker mode** is already stage 5's item 3.

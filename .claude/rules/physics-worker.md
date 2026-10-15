---
paths:
  - "src/physics/physics_host.ts"
  - "src/physics/worker_host.ts"
  - "src/physics/physics_worker.ts"
  - "src/physics/physics_worker_core.ts"
  - "src/physics/mirror_system.ts"
  - "src/physics/snapshot.ts"
  - "src/physics/probe_dump.ts"
  - "src/core/scene_graph.ts"
  - "test/physics/physics_host.test.ts"
  - "test/physics/worker_host.test.ts"
  - "test/physics/host_seam.test.ts"
  - "test/physics/snapshot.test.ts"
---

# Physics lore: the physics worker (K7)

Written by K7 stage 5 (2026-10-15). The design, its measurements and every
stage's handoff are in `docs/design/K7_worker.md`; this file is what binds
the code. `physics.md` lists the area's other files; the probe bridge is
in `probes.md` (the K7 stage 4 entry).

## The shape

- **Two hosts behind one seam (`physics_host.ts`, `PhysicsHost`).**
  `InThreadHost` runs `PhysicsCore` (the step loop, the sleep gate, K147's
  settle, the inputs) on the main thread; `WorkerHost` (`worker_host.ts`)
  runs the same `PhysicsCore` inside `PhysicsWorkerCore`
  (`physics_worker_core.ts`, Node-testable with a pluggable scheduler) in
  one long-lived module Web Worker (`physics_worker.ts`, which only wires
  the port and yields through a MessageChannel). `phw` picks the host
  (`gameplay-links.md`, PHYSICS WORKER PARAM); main.ts reads it once, at
  boot, and every write to physics goes through the host.
- **The worker owns the live `ParticleSystem`; main keeps a MIRROR**
  (`mirror_system.ts`), built from main's own graph, that never steps. Each
  snapshot overwrites its positions and each pass's ctrl and displayF IN
  PLACE, on the same pass objects (the renderer keys maps by them), and
  serves the flags and emergent rows. Every reader keeps reading the
  object and fields it always read; only writes became messages. The
  mirror has no prev, zPos, contact state or slide stats.
- **Both sides build the graph from the params** (`src/core/scene_graph.ts`,
  `buildSceneGraph`: pure, reads only `params`; keep it so). `ready` carries
  a fingerprint (counts and a hash of the initial positions); a mismatch
  falls back. Generation stays deterministic (K108), so this holds.
- **Transport: transferred ArrayBuffers, no SharedArrayBuffer, no
  COOP/COEP.** Every transport measured under 0.1 ms a frame (design 2), and
  isolation headers would be three places to keep right (Pages, the levi.dev
  proxy, the dev server). The worker writes a snapshot (`snapshot.ts`, the
  layout in its header) into one of `SNAPSHOT_POOL` (4) buffers after each
  substep and transfers it, skipping one when none is free; main keeps the
  two newest and gives the rest back at once.

## The clock and the frame

- **Allowances, not a worker clock.** Each frame main posts `frame{dt}`, the
  capped dt `ps.step` got. The worker takes the queued allowance into a
  batch (`ps.step`'s accumulator math, split as `beginFrame` +
  `runSubstep`; `step()` is unchanged and the golden guards the split),
  runs ONE substep per macrotask so inputs apply between substeps (drags
  coalesce to the latest), and drops backlog past `LAG_MAX_S` (0.05 s) as
  lag (`lagS`) instead of spiraling. No allowance arrives while main is
  frozen (a shader compile, a hidden tab), so physics pauses with the
  picture and nothing jumps after a freeze. The cost: the worker idles
  through K307's compile freezes (run-ahead during the pre-settle is K371).
- **Interpolation (on by default).** A frame draws the state at now - D,
  D the median of the last 16 snapshot intervals clamped to 8-50 ms
  (`interpDelay`), lerping positions and pass positions between the two
  newest snapshots by their wall times; a closed chain's seam or an
  undefined displayF takes the newer value, and the discrete state comes
  from the newer. A probe turns it off with `window.__knotHostOpts =
  { interpolate: false }` (read every frame). Stage 3's A/B kept it.
- **The exact grabbed chase still holds in the worker;** on screen the
  grabbed point trails the pointer by the input latency. No pointer-led
  override: drawing the grab at the pointer bends the ribbon away from the
  physics state (K370 is the latency item).
- **Asleep** only once the newest snapshot says the worker slept AND has
  seen every input main posted (`snapshotInputs >= inputsPosted`); the
  asleep frame shows that snapshot exactly. Asleep, the worker discards
  allowances and posts nothing. The sleep gate (K63) runs in the worker at
  each batch's end, on the same sim-time window.
- **K147's budget does not run with the worker** (`__knotSettle().phase`
  reads `off`): the worker steps flat out, capped at real time. The hidden
  pre-settle and the physics-off load are one `settle` message each,
  behind the same trefoil. The budget and `stb` stay for the in-thread
  host (`physics-settle.md`). The stamp says ` | lag X.Xs` with the worker
  (the worker's dropped backlog since the build, drags included) and
  ` | settle lag X.Xs` in-thread.

## Lifecycle and the fallback

- Every rebuild posts `init{gen, params, tuning}`; both sides drop messages
  of an older gen. `visibilitychange` posts pause and resume.
- **The start gate (K7 stage 5).** main.ts constructs the host (and so the
  Worker) BEFORE `await app.init`, so the worker's module loads while
  Pixi starts; `init` is still posted at the first build. The worker posts
  `hello` at module evaluation and `ready` carries `initAt` / `readyAt`;
  `__knotPerf().host.gate` has spawnAt, helloAt, postAt, initAt, readyAt
  and heardAt (epoch ms).
- **Fallback to an `InThreadHost`** on: a spawn that throws (`construct:
  <message>`), no Worker (`no-worker`), `onerror`, `messageerror`, a
  `postMessage` that throws, a worker `error` message, an unreadable
  snapshot, no `ready` within `READY_TIMEOUT_MS` (3000) of ticks, or a size
  or fingerprint mismatch. A fallback after a scene exists calls main's
  `rebuild()` from a `setTimeout(0)`, never inside a host call, and warns
  once; `__knotPerf().host` says `{kind, reason}`.

## Invariants and tests

- **Moving threads does not change the numerics:** the worker and the
  in-thread host step bit for bit (`physics_host.test.ts` runs both in
  lockstep on scripted inputs; the probe dump's FNV-1a hashes compare
  across hosts in the browser). The golden byte identity and every Node
  harness construct `ParticleSystem` directly.
- **main.ts writes physics only through the host.** With the worker,
  `host.view` (alias `ps`) is the mirror, where a write silently does
  nothing; `host_seam.test.ts` parses main.ts and fails on any mutator
  call, reference or assignment on the system outside the host. Reads
  are fine.
- `phw=0`, or no module Worker, must behave exactly as before K7: it is the
  fallback and the escape hatch for every probe that patches `ps.step`.
- Assigning `__knotPS().step` THROWS with the worker (a setter cannot tell
  a freeze from a timing wrapper); the bridge (`__knotPhysFreeze`,
  `__knotStepUntil`, `__knotPhysDump`, the awaited tug) is in `probes.md`.
  52 freeze-patch probes still run only with `&phw=0` (K374).

## Measured

- **`phw` stays OFF by default (K7 stage 5, 2026-10-15): the phone pass
  missed one criterion, the start gate.** Design 10's pass on the Pixel 11
  (60 Hz; build `c0f1622`; `.claude/probes/K7/stage5/`, `s5_gate.txt`),
  today's daily and gs 18 (`?1471kin.J`), three loads a host each,
  alternating, under the perf lock:
  - intro: worker 38-50 fps with p95 33.4-33.5 ms on every load (one
    dropped 60 Hz frame at p95); in-thread 23-37 fps, p95 33.6 on its first
    load and 50.1-50.3 on the rest;
  - first sleep: worker 9.9-16.2 s, in-thread 19.6-28.5 s;
  - a 5 s touch drag: worker 33.7 fps (gs 18) and 37.3 (daily), in-thread
    4.4-4.5 (p95 234-250 ms); touch latency on the daily, p50 231 ms
    against 872;
  - no errors and no context loss on either host;
  - THE MISS: the worker is ready (its own init done) 309-513 ms after the
    main chunk's `responseEnd` (median 407), against 250, and the
    first visible frame comes 0.1-0.2 s later than in-thread (0.96-1.24 s
    against 0.90-1.12).
- **Why the start gate misses.** The worker's module is up (`hello`)
  105-138 ms after the main chunk and builds in 89-121 ms, but `init`
  reaches it only when main handles that hello: 220-392 ms in, within 1 ms
  of it on all 14 worker loads, desktop and phone (observed). Main posts
  `init` at its first build (190-285 ms) and runs app.init's tail and the
  build without yielding. Inferred: Chrome holds a dedicated worker's
  messages until main has processed the worker's script-evaluated
  notification. The desktop: hello 87-94 ms, init 282, ready 325
  (gen and ctor 42-44 ms).
- **The lever (not built):** let the worker build without waiting for
  main, for example the scene params and tuning in the Worker's `name` at
  construction (main then adopts that build when its first build's params
  match, and posts `init` only when they differ). Expected (inferred): ready
  at hello + gen and ctor, about 195-260 ms on the phone. Then re-run the
  phone pass, and flip the default if it passes.

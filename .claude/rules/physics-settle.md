---
paths:
  - "src/physics/settle_budget.ts"
  - "test/physics/settle_budget.test.ts"
  - "src/physics/physics_host.ts"
---

# Physics lore: the load settle (K147)

Moved verbatim from `physics.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `physics.md` lists the area's other files.

## The load settle (K147)

- **Where the code lives (K7 stage 1, 2026-10-14):** the settle code the
  entry below names in main.ts (`beginSettle` .. `activeBudget`, the
  K147 header comment, the frame's step, the physics-off load and the
  pre-settle slices) moved verbatim into `src/physics/physics_host.ts`:
  `PhysicsCore`, which `InThreadHost` runs on the main thread. main.ts
  keeps the loader, the stamp and the UI and calls the host;
  `__knotSettle()` reads `host.stats()`.

- **The budget is the in-thread host's only (K7 stage 5, 2026-10-15).**
  With the physics worker (`phw`, `physics-worker.md`) the budget never
  runs: the worker steps flat out on main's frame allowances and drops
  backlog past 0.05 s as lag, so the catch-up spiral cannot start, and a
  frame no longer pays for physics at all. `__knotSettle().phase` reads
  `off`, `budget` is null, and the stamp reads ` | lag X.Xs` (the
  worker's dropped backlog) instead of ` | settle lag`. The budget, `stb`
  and the entry below still bind the in-thread host: `phw=0`, and the
  fallback when a worker cannot start. The hidden pre-settle and the
  trefoil (`lds`) serve both hosts; with the worker it is one `settle`
  message.

- **A new knot's first settle is paced, never caught up (K147,
  2026-10-13; `physics/settle_budget.ts`, main.ts `beginSettle` ..
  `activeBudget`, the K147 header comment; numbers in
  `.claude/probes/K147/results.md`).** The intro used to run at 5-6 fps
  for ~11 s at gs 18 on the desktop (1.4 fps for ~40 s at 4x CPU
  throttle): the CATCH-UP SPIRAL. step(dt) runs dt/SUBSTEP substeps (12 at
  the 0.1 s cap); a settling gs 18 substep costs ~12 ms, so a slow frame
  asks the next one for more sim time, and every frame ran 12 substeps and
  took ~170 ms. Two phases now, both through the normal step():
  (1) PRE-SETTLE, hidden, in SETTLE_CHUNK_MS slices a frame behind the
  trefoil loader (shown after 300 ms, then for at least 400 ms): until
  `loadSettle` s of stepping work (default 0.45 = the old blocking
  pre-sim's cap) or +1.2 sim-s; at the param's max 5, SETTLE FIRST: until
  the first sleep (LOAD_SIM_CAP 10 sim-s, LOAD_WALL_CAP_MS 45 s).
  (2) BUDGET, from the first visible frame to the first sleep: each frame
  runs only the substeps that fit `settleBudget` ms (an EMA of the measured
  substep cost; at least one a frame, SETTLE_MIN_ONE) and DROPS the rest of
  its request, so nothing is owed and the next frame is no slower. The
  settle plays in slow motion at the render's rate: gs 18 intro p95 31 ms
  at 1x (was 164), sim/wall 0.25, first sleep 11.6 -> 21 s; at 4x p95
  160-190 ms (was 720-740), first sleep 40 -> 100 s. It stands aside
  (still armed) while a thread is grabbed or the slider is 0, and ends at
  the first sleep, a mode change, LOAD_SIM_CAP or BUDGET_WALL_CAP_MS 300 s.
  INVARIANTS: ps.step is unchanged; the budget only picks each frame's dt
  (asks for (n + 0.5) SUBSTEP - pendingTime, so step() runs exactly n), and
  speedMult scales the request before the budget caps it. Sim at first
  sleep stays 5.0 in every measured run. Untouched: the physics-off load,
  K47's resume, the sleep gate, knot-mode byte identity (the golden steps
  ps directly). Both phases' wall caps count VISIBLE time (VisibleClock
  drops frame gaps over FRAME_GAP_MS 1 s): a background tab runs no rAF,
  and wall clocks ended a hidden settle-first load by its 45 s cap with 55
  ms of work done. MEASURED CHOICES: B 12 = one substep a frame at gs 18
  with the ~17 ms render inside 33 ms (one substep costs 12.4 ms, so any B
  under ~24.5 runs one); one substep every k frames instead of minOne gave
  the same 1x p95 with a 30% slower settle, and a ~5-minute settle at 4x.
  OPEN: the same spiral during a DRAG at gs 18 (164-167 ms frames, sim/wall
  0.6; the budget is over by then); a drag-time budget would trade
  slow-motion response for frame rate. The first-frame hitch (two ~1.6 s
  long tasks, one 3.4 s before) is first-draw cost, not physics.

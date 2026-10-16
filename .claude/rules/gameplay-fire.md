---
paths:
  - "src/game/fire.ts"
  - "src/game/fire_clock.ts"
  - "test/game/fire.test.ts"
  - "test/game/fire_clock.test.ts"
---

# Gameplay lore: the burn race (K114)

Written by K114 stage 1 (2026-10-14); `gameplay.md` lists the area's other
files.

## The burn race

- BURN RACE (K114 stage 1, 2026-10-14; game/fire.ts, brief
  docs/design/K114_burn.md, whose "Stage 1 handoff" is the record). A fuse
  lit at the entrance burns along every run, slower than you; burnt runs
  are gone. THE MODEL (fire.ts's header is the spec): the fire reaches
  vertex v at T(v) = h + d(v)/r (d = walk distance from the start, h =
  `fireDelay`, r = `fireSpeed`); a run burns from both ends; a point is
  burnt once T <= L. THE CLOCK L is the controller's walkedDist (every
  move adds its run, backtracks too; 0 until the first move, so the lit
  fuse waits at the entrance); under `fireClock` realtime (stage 2) L is
  a clock instead (REAL-TIME FIRE below). Exact arithmetic only (K108): an attempt is a tap list. An arm
  is SAFE when L + len < T(far) (strict), else SMOLDERING: its tap is
  refused (`tap()` returns "smolder": not logged, not a turn; replay()
  skips it too), the page toasts "Smoldering: the fire gets to the end of
  that run first." (at most once per 1.5 s; the key picker keeps
  smoldering arms, so a key press toasts as well), and the renderer marks
  it from the head to its first burnt stretch. choices() drops burnt runs
  and is empty once solved or lost. LOST: an arrival with no safe arm
  (never at the exit). For r < 1 the optimal route always escapes (L =
  d(v) < T(v)). THE CLOSEST CALL: the least T(v) - L over arrivals, the
  exit included (Infinity, `null` in the hook, before the first).
  CONTROLLER: `fire` (main.ts `fireOf(walk)` builds it from
  `fireSettingsOf(params)`), `fireLost`, `fireClosest`, `fireLeadHere`,
  `smoldering(eid)`; reset() clears the loss and the closest call.
  THE PAGE (main.ts): the loss waits for the dot's arrival (`pendingLoss`),
  then `showFireLoss` stops the clock and shows the LossBanner (maze_hud.ts,
  `#maze-loss`: "Burnt 🔥", time, walked, closest call, Try again, x);
  taps and keys do nothing while lost, and a tap re-shows a closed banner
  (call 1: no auto-restart). Try again and Reset path (call 2) call
  `restartSolve()` and then `updateHud()`, THE one restart: the fuse
  relit (`fabricController.fire = fireOf(walk)` before reset()), the move
  cancelled, yarn, pendingWin and pendingLoss cleared, restartChase, both
  banners hidden, fabric.update, resetAttempt, wake. K80 turns stage 2's
  catch toggle builds on it. HUD (x10, like every HUD distance; call 5):
  `fire lead` while racing, `closest call` once won or lost, both shown
  with the stats off (`gameRows`); the win banner adds the closest call.
  THE FIRST LOOK (stage 1's `drawFire` Graphics: char strokes, embers
  0xff7a1a, smoldering arms 0xff3b1f, a lit-fuse ring) is GONE since K290
  stage 3b (BURNT THREAD below). Still true of `drawFire`: its clock rides
  the move animation (walkedDist minus the unplayed share of the run), so
  the fronts advance with the dot, and it recomputes only when update()
  ran since the last draw (the threads, the flow or the game state moved)
  or the fire's key changed (its clock L, the head, solved, fireLost, the
  move animation, the thread width, the fog, the marker radius); under
  the real-time clock L is the controller's `fireNow`, so it is in the
  key already. Why the look moved into
  the shaders: with every run burnt at rest the Graphics cost about 4.8
  ms a frame on the desktop when redrawn every frame, about 2.5 ms with
  the cache under the default flow (half-rate re-renders) and about 0
  with flow off; under 4x CPU throttling (a phone proxy) about 11 ms, the
  frame interval's median 69 -> 87 ms. PARAMS (codec v5 118-120, after K74's
  `hCutShare` 117; 117-119 before the branch rebased onto K74 stage 2):
  `fire` `fi` (off | fuse), `fireSpeed` `fsp` (0.75, [0.3, 0.95]),
  `fireDelay` `fdl` (0, [0, 40] lattice units); not daily-exempt, and a
  daily plays with the fire off (the default). `fireSettingsOf` is null
  unless fire is fuse, the clock (K80's `clock`, not `fireClock`) is
  turn-based and the turn minotaur is off:
  FIRE AND THE MINOTAUR ARE EXCLUSIVE (call 3, open). In the panel's
  "Burn race" folder (in the maze folder, before the minotaur's, turn clock
  only), turning one on turns the other off; speed and delay hide while the
  fire is off. A link setting both plays the minotaur. Fog stays a separate
  setting (call 4, open). UNDO: onClockChange covers the fire keys (a change
  restarts the solve). HOOK: `__knotFabric().fire` {speed, delay, lead,
  closest, lost, pendingLoss, banner, smoldering}. MEASURED (R.6.1,
  `.claude/probes/K114/burn/`: burn_sim.ts over dailies 1-30 after K74
  stage 2's H1, results_rebased.md, results_tuning_rebased.md): the
  optimal route is never trapped; at r 0.75, h 0 an explorer that sees
  only the runs it walked is trapped on 90% of dailies, and sighted
  wanderers (p 0.1 / 0.2 / 0.3 of a misstep) on 33 / 61 / 80%; r 0.6, h 0
  gives 16 / 43 / 64%. At h = 0 the closest call is set at the first
  junction (the margin along the optimal route is h + d(v)(1/r - 1), which
  only grows), so with h >= 10 the optimal route's closest call is h plus
  its h = 0 value and never under a run (2-21% of sighted p 0.1 wins).
  PAGE PROBE: `burn_page.mjs <base> <outDir> race|loss|perf [seeds]` (real
  clicks; EXTRA appends link keys, e.g. `&fsp=0.9`; probes.md has the
  rest).

- BURNT THREAD (K290 stage 3a, 2026-10-15; brief `docs/design/K114_burn.md`,
  "Stage 3a plan" and "Stage 3a handoff"). The `burnt` param (`fbt`, gone |
  char, default gone; gameplay-links.md; panel row "burnt" in the Burn race
  folder, hidden while the fire is off) picks how a burnt stretch draws.
  GONE: not drawn; the thread ends hard at the fire (no fade, no frontier
  halo), an under-thread's crossing gap closes where its over thread is
  burnt, a fan drops a burnt arm, and the exit marker hides once its point
  is burnt (the start marker fades out since K408, below). CHAR: drawn charred under the
  crossing gaps (0x22140e at 0.9, an ash core 0x7a3a22 at 0.75 where
  |vUV.y - 0.5| < 0.15, ramped over 0.08 ctrl at each burnt end; fans and
  arm strips char without the ash core). Both ride the thread reveal's
  explore programs (render-explore.md, THE BURN): `drawFire` collects each
  run's burnt stretch as a chain-ctrl span (`burnSpan`), and `setBurnSpans`
  re-declares only when the spans or the look change. With the reveal off,
  nothing burnt keeps master's frame (no explore program bound); once
  anything burns, every chain is declared whole and the burn cut from it,
  so `ribbons.exploreOn` stays true for the rest of the race. Under the
  thread reveal, char shows only the burnt thread the reveal shows.
  Contact sheet (gone vs char, reveal off and on, three moments of seed
  7's race; stage 3a): `.claude/probes/K290/stage3a/sheet/`.

- THE START MARKER BURNS (K408, from Levi's K383, 2026-10-15; e536bb6,
  built in K114 stage 2's branch): "the start marker HIDES once its
  thread has burnt, under both looks, faded like the other markers'
  transitions". fire.ts `firePassed(fire, v, L)` = T(v) < L (strict): at
  the start T is the delay, so the start's point is burnt from the first
  instant past it, when the lit fuse (L <= delay) goes out. drawFire
  calls `syncStartMarker(!firePassed(fire, start, L))` every frame on the
  L it draws (true without a fire). No marker had a fade to reuse, so the
  start borrows the gold web's `WebFade` (render-web-fade.md: 0.25 s
  smoothstep, no jump on a reversal) on the explore clock, writing
  `mesh.alpha` and `renderable` (place() keeps setting `visible`). Its
  gap slot follows the TARGET: it leaves as the fade-out starts (under
  char the burnt thread shows through the fading disc instead of a hole
  that closes at the fade's end) and returns as a fade-in starts (a
  restart); `exploreUpdatePending` forces the re-solve at rest.
  markersRight (K198's pan range) skips a faded-out start. Hook:
  `__knotFabric().fire.startMarker` {shown, level}. Test:
  `test/game/fire.test.ts` (firePassed at h 0 and 5, both clocks). The
  exit marker still hides at once, without a fade.

- REAL-TIME FIRE (K114 stage 2, 2026-10-15; brief and record
  `docs/design/K114_stage2.md`, "Stage 2 handoff"). `fireClock` (`fck`,
  turn | realtime, default turn; gameplay-links.md; panel row "clock",
  gameplay-panel.md) picks L. TURN is stage 1's: L = walkedDist, so
  standing still to think is free. REALTIME: L is time.
  - THE CLOCK (game/fire_clock.ts): `FireClock` counts fixed steps at
    CHASE_HZ (120, K80's), and L = ticks x FIRE_V_REF / 120, exact for
    the same ticks on every device. `advance(s)` runs at most 30 steps a
    frame and drops the backlog, so a long frame slows the fire instead
    of jumping it. main.ts `tickFire` (realtime only, in tickAnim's
    place) runs it from the first accepted move until the winning move
    lands, stops it at a loss, freezes it while `document.hidden`, and
    rebuild and restartSolve reset it; `fireSet`, after keyStep, hands L
    to the controller each frame. The fabric tick in `src/app/frame_loop.ts`
    (K5 M3) calls both through FrameLoopDeps (`realtimeFire`, `tickFire`,
    `fireSet`). The dot arrives when L reaches `fireArriveL`.
  - FIRE_V_REF = 12 lattice units a second (Q1): the turn animation's
    mean lattice pace at moveSpeed 1, measured 11.80 over dailies 1-6
    (3320 run directions; per daily 11.65-12.06; p10 8.7, p90 18;
    `.claude/probes/K114/stage2/vref_probe.mjs`). A constant, so
    `fireSpeed` is the same fraction of the dot's pace on both clocks.
    Under realtime the dot walks every run at v_ref and moveSpeed is
    unused: a slower dot would hand the fire time it never earned.
  - THE CONTROLLER (fabric_controller.ts, its THE REAL-TIME FIRE
    header): `setFireNow(L)` sets `fireNow`; a move that leaves at
    `fireDepartL` arrives at `fireArriveL` = depart + len. `fireL` =
    max(fireNow, fireArriveL) is the DEPARTURE clock, so a tap queued
    mid-move is tested as it leaves on arrival; the smolder test is
    stage 1's (L + len < T(far)) at that L. Taps always queue under
    realtime (Q4: setTapsWait(false) is ignored). `fireRacing`: realtime,
    a first move made, not solved or lost.
  - LOSSES (Q3): a smoldering arm is refused as before. THE STANDING
    LOSS: once the dot has arrived, setFireNow reports a loss when
    T(head) <= L (the fire reaches you where you stand; closest call 0).
    No trapped loss under realtime: arriving with no safe arm is not a
    loss, standing there is. NEVER CAUGHT MID-RUN for r < 1: at x along
    a run left at L0, the dot is at L0 + x, the fire from behind at
    T(head) + x/r > L0 + x, and the fire from ahead at
    T(far) + (len - x)/r > L0 + len >= L0 + x (the arm test).
  - THE CLOSEST CALL: every arrival's T(v) - L, as on the turn clock,
    plus every departure's margin except the first move's; a loss makes
    it 0. The HUD's `fire lead` counts down while you stand (maze_hud.ts
    `setFireLead` writes the DOM only on a change of the shown value)
    and reads the arrival's margin while the dot runs. replay() leaves
    each tap the moment the last arrives (no thinking time): only daily
    attempts replay, and dailies play with the fire off.
  - The same `fireSpeed` and `fireDelay` serve both clocks (Q2). The
    turn defaults (0.75, 0) do not carry over: the optimal route then
    affords about 0.08 s of thinking per decision on the median daily.
    Stage 2 item 7 (`.claude/probes/K114/stage2/proposal.md`) proposes
    realtime 0.2 / 20 (1.7 s head start; 1.1-1.5 s a decision), below
    the panel's ranges ([0.3, 0.95], [0, 40]); for Levi.
  - Hook: `__knotFabric().fire` adds clock, L, now, departL, arriveL,
    racing, startMarker. The fire still never plays with K80's chase
    (`clk=realtime`) or the turn minotaur (fireSettingsOf). Q5: K323's
    plan (section 2.4) kept the burn race turn-only; `fireClock` survives
    K323 as a Burn race row.
  - COST: not measured (stage 2 item 6, open). Under realtime L moves
    every frame of the race, so drawFire recomputes (and setBurnSpans
    re-declares when a span moved) every frame, where the turn clock
    recomputes only while the dot moves.

- THE FIRE (K290 stage 3b, 2026-10-15; brief and record
  `docs/design/K114_burn.md`, "Stage 3b brief" and "Stage 3b handoff";
  the shader side is render-explore.md's THE BURN, stage 3b). The
  explore programs draw each front (an ember at the front and, under
  char, a dark band ahead of it) and each smoldering choice (a hot
  centerline from the head to its first burnt stretch, at rest only).
  The lit fuse is a front on each of the start's runs just past the
  start disc while L <= delay. The `burn` FX (appear_fx.ts) emits at
  every front at 0.4 of the appearance's rates, the rate shared past 12
  fronts, over the yarn and under the markers and the fog; none under
  Reduced motion. Under fog, a soft hole at each burning front (0.75 of
  the stamp radius; the fog redraws when one moves 0.3 world). Under the
  thread reveal a front it does not show draws nothing and emits nothing
  (Levi accepted). The lit fuse's ember first sat under the start disc
  (a world length used as a lattice distance); `runOut` places it in
  world terms (render-explore.md, THE EMBER DRAWS).

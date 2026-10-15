---
paths:
  - "src/game/fire.ts"
  - "test/game/fire.test.ts"
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
  fuse waits at the entrance); stage 2's real-time clock plugs in as
  another L. Exact arithmetic only (K108): an attempt is a tap list. An arm
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
  THE FIRST LOOK (fabric_maze_renderer.ts `drawFire`, the FIRE_*
  constants; stage 3 builds the real one): char 0x22140e (1.1 thread
  widths) with an ash core over burnt stretches, embers 0xff7a1a (core
  0xffe08a) at the fronts, smoldering arms 0xff3b1f, and a lit-fuse ring
  at the entrance while L <= h. Its clock rides the move animation
  (walkedDist minus the unplayed share of the run), so the fronts advance
  with the dot. Redrawn only when update() ran since the last draw (the
  threads, the flow or the game state moved) or the fire's key changed
  (its clock L, the head, solved, fireLost, the move animation, the
  thread width); with every run burnt at rest it cost about 4.8 ms a
  frame on the desktop when redrawn every frame, about 2.5 ms with the
  cache under the default flow (half-rate re-renders) and about 0 with
  flow off. A new clock (stage 2's fireClock) must join the key. It draws
  every run, so K76's thread reveal does not hide unseen fire (the fog
  sprite does). PARAMS (codec v5 118-120, after K74's `hCutShare` 117;
  117-119 before the branch rebased onto K74 stage 2): `fire` `fi` (off |
  fuse), `fireSpeed` `fsp` (0.75, [0.3, 0.95]), `fireDelay` `fdl` (0,
  [0, 40] lattice units); not daily-exempt, and a daily plays with the
  fire off (the default).
  `fireSettingsOf` is null unless fire is fuse, the clock is turn-based
  and the turn minotaur is off: FIRE AND THE MINOTAUR ARE EXCLUSIVE (call
  3, open). In the panel's "Burn race" folder (in the maze folder, before
  the minotaur's, turn clock only), turning one on turns the other off;
  speed and delay hide while the fire is off. A link setting both plays
  the minotaur. Fog stays a separate setting (call 4, open). UNDO:
  onClockChange covers the fire keys (a change restarts the solve). HOOK:
  `__knotFabric().fire` {speed, delay, lead, closest, lost, pendingLoss,
  banner, smoldering}. MEASURED (R.6.1, `.claude/probes/K114/burn/`:
  burn_sim.ts over dailies 1-30, results.md, results_tuning.md): the
  optimal route is never trapped; at r 0.75, h 0 an explorer that sees
  only the runs it walked is trapped on 90% of dailies, and sighted
  wanderers (p 0.1 / 0.2 / 0.3 of a misstep) on 38 / 66 / 83%; r 0.6 with
  h 20 gives 4 / 22 / 48%. At h = 0 the closest call is set at the first junction
  (the margin there is h + d(v)(1/r - 1)). PAGE PROBE: `burn_page.mjs
  <base> <outDir> race|loss [seeds]` (real clicks; EXTRA appends link
  keys, e.g. `&fsp=0.9`).

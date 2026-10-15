---
paths:
  - "src/render/confetti.ts"
  - "src/render/confetti_model.ts"
  - "test/render/confetti_model.test.ts"
---

# Render lore: finish confetti (K140)

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

## Finish confetti (K140)

- FINISH CONFETTI (K140 stage 1, 2026-10-14; worktree agent; brief
  `docs/design/K140.md`). Levi: "a gratuitous confetti effect rainy down
  from the top of the screen when you finish the maze. And ... some
  smaller confetti effect spraying out from around the finish spot."
  confetti_model.ts is the pure part (counts, spawns, motion, in
  Float32Array pools); confetti.ts mirrors pool row i into Particle slot
  i of two ParticleContainers (one draw each; appear_fx.ts's pattern).
  The RAIN is SCREEN space (CSS px): released above the top edge over 2.2
  s at a release rate that falls to nothing (K335 below; K140 released
  over 1.1 s, front-loaded, and stopped dead), falling at a terminal
  0.24-0.38 screen heights/s with sway and a cos flutter that narrows
  each piece and shades its back; it dies below the bottom edge (a 6.5 s
  life is the backstop, 6 s before K335). The SPRAY is
  WORLD space: a jittered ring around the exit marker
  (`renderer.markerWorld`), flung out against drag with a slight
  fountain lift, sinking and fading within 1.4-2.4 s; its container
  copies the world root's transform, so the burst stays on the finish
  as the camera moves.
- COUNTS. Amount 1 (`cfa`, 0-3; `cf` turns it off) = 280 rain pieces on
  the Pixel 11's 411x753 viewport plus 160 spray pieces. K317 (Levi,
  2026-10-14: "more confetti by default, both from the top, but
  especially from the finish marker") doubled K140's 140 rain and
  quadrupled its 40 spray. rainScreenScale
  multiplies the rain by the screen's area in piece areas over the
  phone's, clamped to [1, 3] (1400x900 -> 576 pieces, 1920x1080 -> 710),
  so a desktop is as densely covered as a phone. The pools hold the max
  (RAIN_CAP 2520, SPRAY_CAP 480), allocated once, with page-lifetime
  particles and paper texture. The spray's unit is the marker radius
  floored at 16 CSS px (sprayUnit): at the phone's default zoom the
  marker radius is ~7 px, and unit-sized pieces were specks.
- COLORS: a fixed festive set, the path's gold (0xffd23f) first, then
  saturated hues and a warm white. Not the design's palette: a design's
  gamut is a narrow hue arc that melts into its own threads.
- REDUCED MOTION (`motion.reduced`): no rain (a full-screen fall is the
  large-area motion WCAG 2.3.3 asks to avoid), and 10% of the spray (16
  pieces at amount 1, as K140 had) at half speed with no spin or flutter. A proposal for Levi
  (`.claude/probes/K140/results/reduced_phone_1b_spray.png`).
- ANIMATING. Render-only: nothing touches the physics. `confetti.active`
  is a term of sceneAnimating() and goes false when the last piece dies
  (5.6-6.8 s after a finish since K335, 5.4-5.9 s before it; 1.9-2.7 s
  reduced). confetti.tick runs in
  the app.ticker callback after tick(), in every branch (asleep, paused,
  loading), and is one early return once both pools drain (the
  containers hide). Fabric's sceneAnimating() is true at rest today (its
  gameplay paint animates; K24's render-on-demand does not exist yet),
  so the term bites only in knot mode, where a rest check needs
  `mf=0&fw=0&snd=none` (the flow and music's auto plucks animate the
  knot otherwise).
- WHEN. throwConfetti() ends showFabricWin, so it fires with EVERY
  banner: dailies, free play, replays, the real-time mode, a reload
  that restores a solved attempt (pendingWin), and Reset path pressed
  while the winning move is in flight. A rebuild clears the pieces, and
  so does turning `cf` off; restartSolve (Play again) does not, so
  pieces in the air finish their fall.
- INPUT. Both containers sit above the world root (the rain topmost)
  with eventMode none; the banner and HUD are DOM over the canvas. The
  page probe checks a banner hit-test over the confetti and a ctrl+wheel
  zoom mid-rain.
- COST (2026-10-14, K140's counts, desktop at 1400x900 dpr 1, K104 and K155 agents
  busy; master cb532d5 vs 42f047d, interleaved, 5 reps of 6 s from the
  burst, medians of the rep means). Below the noise floor. At 1x every
  case holds 60 fps (16.67 ms intervals) with frame JS of 9.8 (master),
  10.6 (branch, no burst), 9.7 (amount 1, 288+40 pieces) and 9.9 ms
  (amount 3, 865+120). At 4x CPU throttle, applied after the settle: 68,
  70, 67 and 70 ms intervals. The pure sim (step plus pieceLook, node)
  takes 17 us a frame at amount 1 and 50 us at amount 3. The fabric at
  rest is the cost: about 10 ms of JS a frame at 1x and 64 ms at 4x (15
  fps) on master, since fabric draws every frame (K24). Throttle only
  after the settle: under 4x from the load, K147's settle was still
  awake 100 s in (about 200 ms frames), so that run measured the settle.
  The dt clamp (0.1 s) slows the pieces below 10 fps.
- PROBES (`.claude/probes/K140/`, untracked): k140_page.mjs `<url> <out>
  desk|phone|reduced|reduced:phone|realtime|knot` (a real finish by
  mouse, or K80's greedy chase; screenshots mid-spray, mid-rain and idle,
  the plan, the idle time, banner hit-test, zoom, the knot rest checks);
  k140_ab.mjs + run_ab.ps1 (the frame A/B, takes the perf
  lock; `-Runs desk:1,desk:4`); bench_sim.mjs (the sim's own cost);
  builds/<sha> served by `vite preview` on 5481/5482. Hooks:
  `__knotConfetti()` (pieces alive, bursts, frames stepped - frozen when
  idle - the plan a finish would throw, sceneAnimating) and
  `__knotConfettiBurst()` (a finish's burst on demand).

## The rain's taper (K335)

- THE RAIN'S TAPER (K335 stage 1, 2026-10-14; worktree agent; brief
  `docs/design/K335_confetti.md`). Levi: "I like the abrupt wave of
  confetti at the start, but then we also have an abrupt cut-off
  stopping the confetti, and we see an abrupt line at the top of the
  wave of confetti that I don't like." K140's releases (delay =
  1.1·r^1.5) stopped dead at 1.1 s, and the last of them fell as one
  straight line. Now the release rate is (m+1)/W·(1 - t/W)^m with W =
  RAIN_WINDOW 2.2 s and m = RAIN_TAPER 4: high at the start, so the
  first wave keeps its weight, and zero with zero slope at W, so the end
  has no step. `rainDelay(u)` inverts its CDF; `rainReleaseDensity(t)`
  is the rate. A piece released d s in also starts up to RAIN_TOP_SPREAD
  ·d/W screen heights (0.12 at the window's end) above K140's 0.05 h
  jitter: the first wave still leaves from the edge, and the thinning top
  is ragged. RAIN_LIFE_MAX went 6 -> 6.5 s to keep the backstop's margin
  over the higher starts (the oldest piece dies at 5.1 s, the fade starts
  at 6.0 s).
- CENSUS (pure model; the view draws the pool's X/Y, so it is the page's
  pipeline). 21% of the pieces leave in the first 0.1 s (K140 20%), 52%
  by 0.3 s (43%); on screen against K140 0.89/1.13/1.14/1.06/0.98 at
  0.25/0.5/0.75/1/1.5 s. The top edge, from the first 2%-of-height row
  at 5% of the frame's peak row to the first at 50%, spans 10-12 rows
  (K140 2-6); its largest single-row rise is 8-13% of the peak (K140 up
  to 29%). Rejected: a spread independent of the delay (0.12·u²) cut the
  opening to 0.29 of K140's on-screen count at 0.25 s. The rain runs out
  5.57-6.78 s after a finish, medians 5.9-6.2 (K140 5.40-5.93, medians
  5.6-5.7; 60 seeds x amounts 1 and 3 at 411x753, 1400x900 and
  3840x2160). Only knot mode feels it (sceneAnimating): about 0.3-0.6 s
  more drawn frames at the median, 0.9 s at most.
- COST. The same pieces and per-piece code. bench_sim.mjs at 1400x900,
  K317's counts, two interleaved runs: master 33.5 us a frame at amount
  1 (576+160 pieces, 343 frames a burst) and 100 us at amount 3
  (1729+480, 345 frames); K335 31.5 us (368 frames) and 92.7 us (373
  frames); p95 54 and 162-164 us for both, and the same total sim work
  per burst (11.5 and 34.5 ms). No frame A/B: nothing per frame changed,
  and K140's could not resolve tens of us under the fabric's ~10 ms frame
  noise.
- PROBES (`.claude/probes/K335/`, untracked): census.mjs (delay shares,
  run-out and oldest age, row-density profiles; census_v2.json),
  variants.mjs + variants2.mjs (window, taper and spread candidates),
  idle_range.mjs (the run-out range), bench_sim.mjs `<model.ts> <label>`
  (K140's bench with the model as an argument; master_confetti_model.ts
  is master's copy), sheet.mjs `<masterBase> <branchBase> [outDir]`
  (knot mode `?7&am=instant&mf=0&fw=0&snd=none` at 1400x900 and 411x753,
  two `__knotConfettiBurst()`s a page, frames from 0.1 to 3.0 s, the
  census's density chart, each page's run-out, webglcontextlost; takes
  the perf lock), sheet/ (the sheets).
- DEFERRED (Levi, 2026-10-14): K336 (side cannons and streamers) and
  K337 (shine) wait until after the other tasks. Their model-only draft
  is `.claude/probes/K335/deferred/k336_k337.patch`, which applies on
  top of K335.

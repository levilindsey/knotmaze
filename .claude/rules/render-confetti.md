---
paths:
  - "src/render/confetti.ts"
  - "src/render/confetti_model.ts"
  - "test/render/confetti_model.test.ts"
  - "src/app/frame_loop.ts"
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
  The RAIN is SCREEN space (CSS px): released above the top edge over 3.3
  s (K568 below; K335's 2.2 s before) at a release rate that falls to
  nothing (K335 below; K140 released
  over 1.1 s, front-loaded, and stopped dead), falling at a terminal
  0.24-0.38 screen heights/s with sway and a cos flutter that narrows
  each piece and shades its back; it dies below the bottom edge (a 6.5 s
  life is the backstop, 6 s before K335). The SPRAY is
  WORLD space: a jittered ring around the exit marker
  (`renderer.markerWorld`), flung out against drag with a slight
  fountain lift, falling (K570 below) and fading within 1.4-2.4 s; its container
  copies the world root's transform, so the burst stays on the finish
  as the camera moves.
- COUNTS. Amount 1 (`cfa`, 0-3; `cf` turns it off) = 420 rain pieces on
  the Pixel 11's 411x753 viewport plus 320 spray pieces (K568; 280 and
  160 before). K317 (Levi,
  2026-10-14: "more confetti by default, both from the top, but
  especially from the finish marker") doubled K140's 140 rain and
  quadrupled its 40 spray. rainScreenScale
  multiplies the rain by the screen's area in piece areas over the
  phone's, clamped to [1, 3] (1400x900 -> 865 pieces, 1920x1080 -> 1066),
  so a desktop is as densely covered as a phone. The pools hold the max
  (RAIN_CAP 3780, SPRAY_CAP 960: 4740 particles, 3000 before K568),
  allocated once, with page-lifetime
  particles and paper texture. The spray's unit is the marker radius
  floored at 16 CSS px (sprayUnit): at the phone's default zoom the
  marker radius is ~7 px, and unit-sized pieces were specks.
- COLORS: a fixed festive set, the path's gold (0xffd23f) first, then
  saturated hues and a warm white. Not the design's palette: a design's
  gamut is a narrow hue arc that melts into its own threads.
- REDUCED MOTION (`motion.reduced`): no rain (a full-screen fall is the
  large-area motion WCAG 2.3.3 asks to avoid), and 5% of the spray (16
  pieces at amount 1, as K140 had; 10% before K568 doubled the spray) at
  half speed with no spin or flutter. A proposal for Levi
  (`.claude/probes/K140/results/reduced_phone_1b_spray.png`).
- ANIMATING. Render-only: nothing touches the physics. `confetti.active`
  is the frame loop's OVERLAY poll (`render-loop.md`; a term of main.ts's
  sceneAnimating() before K6-1) and goes false when the last piece dies
  (6.2-7.7 s after a finish since K568, medians 6.7-7.1; 5.6-6.8 s from
  K335, 5.4-5.9 s before it; 1.9-2.7 s reduced). confetti.tick runs in
  the app.ticker callback after tick(), in every branch (asleep, paused,
  loading), and is one early return once both pools drain (the
  containers hide). Before K6-1 a fabric's sceneAnimating() was true at
  rest whatever it showed, so the term bit only in knot mode. Since
  K6-1's sceneActive an unsolved fabric is still active at rest (its
  choices' pulses are PAINT_AMBIENT), but a SOLVED fabric without flow or
  fog goes still once the confetti is gone, as the knot does. A knot rest
  check needs `mf=0&fw=0&snd=none` (the flow and music's auto plucks
  animate the knot otherwise).
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
  idle - the plan a finish would throw, sceneAnimating, which reads the
  loop's sceneActive since K6-1) and
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
  3840x2160). Only knot mode feels it (sceneAnimating; since K6-1's
  sceneActive, a solved fabric without flow or fog too): about 0.3-0.6 s
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

## Longer rain, finer spray (K568)

- LONGER RAIN, FINER SPRAY (K568, 2026-10-20; model only, no view
  change). Levi: "Let's make the confetti from the top last a bit
  longer. Let's reduce the size of the confetti from the finish marker,
  double the max initial speed of this confetti, and add more range to
  the spread of random initial start speeds, and double the number of
  particles." THE RAIN: RAIN_WINDOW 2.2 -> 3.3 s, and RAIN_PER_AMOUNT
  280 -> 420 with it, so the opening wave K335 kept releases exactly as
  densely (636 pieces/s at amount 1 on the phone; 60 leave in the first
  0.1 s and 159 by 0.3 s, K335 58 and 146) and the taper then runs 1.5x
  longer. The window alone would have thinned the opening by a third;
  slower terminal speeds would have changed each piece's fall, which
  was not asked.
- CENSUS (`.claude/probes/K568/census.mjs`, the pure model, master's
  copy against K568's; 60 seeds x amounts 1 and 3 at 411x753, 1400x900
  and 3840x2160). The rain runs out 6.20-7.70 s after a finish, medians
  6.72-7.13 (K335 5.57-6.78, medians 5.93-6.23: about +0.8 s). The
  oldest piece still dies at 4.97-5.09 s, inside the 6.5 s backstop
  (its fade starts at 6.0). On screen at amount 1 on the phone, every
  0.5 s: 149 293 361 388 398 397 343 239 133 56 19 6 1 (K335 132 231 260
  266 266 264 215 134 64 17 3): K335's half-peak count (about 133) now
  holds until 4.5 s instead of 4.0, and the last 10% and 2% of each
  one's own peak move from 4.5 to 5.0 s and from 5.0 to 5.5 s.
- THE SPRAY: paper 0.5-0.8 -> 0.3-0.5 units (4.8-8.0 CSS px at the
  16 px unit floor, 8.0-12.8 before); launch speed 6-15 -> 3-30 units/s
  (the top doubled, the spread 9 -> 27 units/s, the floor halved);
  SPRAY_PER_AMOUNT 160 -> 320. Each piece's farthest distance from the
  finish (unit 1, 60 seeds): min 1.73, p10 3.01, median 6.02, p90 9.04,
  max 11.18 units (before 2.54, 3.16, 4.34, 5.55, 6.94; all before K570's
  gravity, below). Lifetimes are
  unchanged, so the spray still runs out 2.37-2.40 s after a finish.
  REDUCED_SPRAY_SHARE 0.1 -> 0.05 keeps reduced motion at 16 pieces at
  amount 1 (48 at 3), at half pace (1.5-15 units/s).
- COST (bench_sim.mjs, node, 1400x900, two interleaved runs under the
  perf lock). Amount 1 (865+320 pieces): 43.6-43.7 us a frame, p95 83 us,
  420 frames a burst, 18.3 ms of sim work per burst (master, 576+160:
  31.8-32.3 us, p95 55 us, 368 frames, 11.8 ms). Amount 3 (2594+960):
  128-129 us, p95 250 us, 55 ms a burst (master 93 us, p95 164 us,
  35 ms). Still far under the fabric's ~10 ms frame; no frame A/B (K140's
  could not resolve tens of us).
- PROBES (`.claude/probes/K568/`, untracked): census.mjs (rain run-out,
  oldest age, on-screen series; spray reach, paper, run-out, reduced
  plans), bench_sim.mjs `<model.ts> <label> [reps]` (K335's bench on
  today's `confettiPlan(amount, reduced, w, h)`; K335's copy calls an older
  signature and fails), master_confetti_model.ts (the model
  before K568). Run with plain `node` (Node 23 strips the types).

## Spray gravity (K570)

- SPRAY GRAVITY (K570, 2026-10-20; model only, no view change). Levi:
  "let's add some gravity to confetti-from-finish-marker particles".
  Since K140 each spray piece's TERM (its gravity, units/s²) was
  unit·3.4·pace: against SPRAY_DRAG 3.4, a terminal sink of 1 unit/s,
  which did not read as a fall. SPRAY_GRAVITY 17 makes it 5 units/s (80
  CSS px/s at the 16 px unit floor; the rain falls at 180-286 px/s on the
  phone), so each path bends over into a fall: a piece launched straight
  up at 30 units/s rises ~6 units and turns over at ~0.57 s. Reduced
  motion halves it with the pace (8.5, a 2.5 units/s fall). Lifetimes are
  unchanged, so the spray still runs out 2.37-2.40 s after a finish, and
  so is the cost (the same per-piece operations).
- CENSUS (`.claude/probes/K570/gravity.mjs`, the pure model; unit 1, 60
  seeds x 320 pieces, TERM rewritten per candidate; g 3.4 -> 17; a drop
  is a piece's y below its own spawn). Drop at the fade's start, median /
  p90: 0.28 / 5.26 -> 3.83 / 8.91 units; at death 1.02 / 6.12 -> 7.62 /
  12.95. Below the finish at the fade's start: 52% -> 79%. Highest rise
  9.24 -> 7.31. Farthest from the finish, median / max: 6.02 / 11.18 ->
  9.08 / 19.73. The live cloud's mean y (+ = below the finish) at 0.25,
  0.5, ... 2.25 s: -0.3 -0.2 -0.1 0.1 0.4 0.6 0.9 1.1 1.2 -> 0.1 0.9 1.9
  3.1 4.4 5.6 6.9 8.1 9.3. The other candidates, median drop at death /
  max distance: g 8.5 3.49 / 14.39, 13.6 5.96 / 17.59, 20.4 9.27 / 21.87,
  27.2 12.60 / 26.15.
- PROBES (`.claude/probes/K570/`, untracked): gravity.mjs `[g ...]` (the
  census above), sheet.mjs `<out.png> [g ...]` (headless Chrome draws the
  pure model's pieceLook on a 2D canvas: a row per gravity, frames at
  0.15, 0.4, 0.8, 1.2, 1.6 and 2.0 s, 12 px a unit, one seed for every
  row; candidates.png holds 3.4, 13.6, 17 and 20.4). Run with plain
  `node`.

## The shine (K337)

- THE SHINE (K337, 2026-10-20; worktree agent; brief
  `docs/design/K337.md`). Levi (2026-10-14): "a shimmer/shine reflection
  effect to them, so some flash as they rotate the right way ... vaguely
  realistic directional light physics without too much effort or perf
  cost". ONE directional light, computed on the CPU per piece and frame
  into the tint the view already sets (no shader program: a new one
  compiles cold at the finish and freezes the win, K307). The normal is
  +z turned about the long axis (cos rot, sin rot, 0) by the flip:
  n = (sf sin rot, -sf cos rot, cf), flipped when cf < 0, so both faces
  light alike. LIGHT = normalize(-0.5, -0.62, 0.6) (upper left, toward
  the viewer, 53 degrees off the screen's normal), V = (0, 0, 1), and
  H = normalize(L + V) (26.5 degrees off it). The tint is
  `litHex(color, k, s)`: k = SHINE_AMBIENT 0.5 + (0.5 / Lz) max(0, n.L),
  so a face-on piece shows exactly its color, one turned from the light
  half of it and one facing it up to 1.33x (channels saturate); then a
  mix toward white by s = strength x peak x (n.H)^p, at most 1. PAPER:
  peak 0.3, p 8, a soft sheen. FOIL: peak 1, p 64, a short flash to white.
  p is a power of two (3 and 6 squarings). K140's `0.55 + 0.45 |cos flip|`
  is gone. `specular` and `shadeNormal` are the reference; pieceLook takes
  a faster path to the same tint (two trig calls a piece, master one):
  L's and H's screen-plane parts are parallel, so both dot products come
  from sf L_XY sin(rot - L_ANG), and sin flip is sqrt(1 - cf^2) with the
  phase's sign. A test holds the two within 1 a channel (99.9% exact).
- MATERIAL AND SETTINGS. Each piece draws its material at spawn (pool
  field MAT 17, stride F 18) from the foil share. At share 0 it takes no
  draw, so `cff=0` throws exactly master's pieces (on both burst sheets
  the middle row shows master's pieces in master's places, lit
  differently). A burst captures
  the strength (`ConfettiSim.shine`); pieces still in the air from an
  earlier burst take the newest. Panel rows "Confetti shine"
  (`confettiShine`, `cfh`, 0-2, default 1) and "Foil confetti"
  (`foilShare`, `cff`, 0-1, default 0.3, hidden while the strength is
  0), appended to the codec table (no version bump), daily-exempt
  viewer preferences with `cf` and `cfa`, and in the undo stack's
  confetti group. Lives and the frame loop's OVERLAY poll are unchanged.
- STRENGTH 0 IS REDUCED MOTION'S LOOK: ambient + diffuse, no specular on
  either material (pinned). Reduced motion's plan carries shine 0, and
  its few spray pieces have no flutter, so each shows its exact color.
- READ (`.claude/probes/K337/census.mjs`, the pure model, amount 1,
  share 0.3, six seeds, the rain on screen and the spray, first 4 s; a
  flash is a foil specular above 0.5, near white above 0.8, a paper
  sheen above 0.15). Phone 411x753: foil flashes 1.55% of its time
  (near white 0.49%); a frame shows a median of 2 flashing pieces, p90
  4, max 9; a flash lasts a median of 2 frames, at most 4; 81% of foil
  pieces flash at least once; paper is in sheen 13.8% of its time.
  Desktop 1400x900: median 2 a frame, p90 6, max 13. Candidates: foil
  p 32 doubles the flashing time (3.1%), p 128 halves it (0.77%);
  strength 0.5 never passes 0.5 (no flash reads white), 1.5 flashes
  2.5% of the time, 2 3.1%. The suite pins the default's bounds (median
  frame at most 4, 0.5-3% of foil time, some near white).
- COST (bench_sim.mjs, node, 1400x900, three interleaved rounds under
  the perf lock; `bench_results_3_final.txt`). Amount 1 (865+320
  pieces): 65.6-66.6 us a frame, p95 123-126 us, 27.0-27.4 ms of sim
  work a burst (master 44.9-45.4 us, p95 85-87 us, 18.9-19.0 ms); at
  strength 0, 62.1-63.7 us. Amount 3 (2594+960): 190-194 us, p95 372-379
  us, 81-82 ms a burst (master 131-133 us, 56-57 ms). The four-trig
  first cut read 74-78 and 218-232 us. No frame A/B (K140's could not
  resolve tens of us); the phone's frame rate rides K156's next pass.
- SHEETS (`.claude/probes/K337/sheet/`, 1400x900 and 411x753):
  strip_<view> (eight consecutive frames from 1.0 s at the defaults,
  cropped where the default flashes most, with counts),
  burst_<view> (0.3, 1.0 and 2.0 s and a crop of the rain at 1.0 s:
  master, the branch at `cff=0`, the branch) and strengths_<view> (cfh
  0, 0.5, 1, 1.5 and 2 on one seed and the same frames, a full frame plus
  six crops a row, each labelled with its counts). Still frames show the
  strengths apart mostly in those counts (desktop crop, frames 60-65:
  paper in sheen 0, 0, 7-9, 10-19 and 11-20 pieces; foil flashing 0-2
  from strength 1 up); a flash is a few frames, so the difference is a
  motion one. The look call between strengths is Levi's.
- PROBES (`.claude/probes/K337/`, untracked): census.mjs (the read
  above; variants by exponent, peak and strength), bench_sim.mjs
  `<model.ts> <label> [reps] [shine] [foil]` and bench_ab.mjs `[rounds]`
  (master against the branch and the branch at strength 0, under the
  perf lock), page_sheet.mjs `[burst|strengths|all] [outDir]` (dev
  servers: branch 5860, master 5861 serving `master_a6387e8/`, a git
  archive with a node_modules junction; knot link
  `?7&am=instant&fw=0&snd=none`). Its method: the page imports
  `/src/render/confetti.ts`, wraps `ConfettiLayer.prototype.tick` to
  catch the layer and pass dt 0, bursts under a seeded Math.random, then
  steps `layer.sim.step(1 / 60, h)` by hand and shoots after three rAFs,
  so every run shows the same pieces at the same frames. GOTCHAS: after
  a src edit, vite serves the app's changed modules with `?t=`, so a
  page's `import("/src/render/confetti.ts")` gets a SECOND instance and
  the wrapped prototype never ticks: restart the dev server after
  editing src. A fresh desktop profile opens the side panel over the
  finish spray: set localStorage `knotmaze.panelOpen` to "0" before
  load.
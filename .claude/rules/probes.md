---
paths:
  - ".claude/probes/**"
  - "scripts/*.mjs"
  - "scripts/*.ps1"
  - "scripts/*.ts"
  - "src/app/probe_hooks.ts"
---

# Probe and verification lore

How to probe and verify Knotmaze, moved verbatim from CLAUDE.md by K45
(2026-10-12). A passage taken from inside a longer entry is labeled
with its source; the narrative is in `docs/history.md`. Elsewhere:

- CLAUDE.md's Verification rule: never `--virtual-time-budget` for
  anything physics-dependent; use `scripts/diag_screenshot.mjs`.
- `physics-kinks.md`: the vite-node harness that reproduces the
  browser's physics exactly (KINK EYES, PROBE LORE), why a hold probe
  must move past the tug slop first (K41's PROBE LORE);
  `physics-collision.md`: the off-screen headed window (P3.23);
  `physics-sleep.md`: the K63 sleep-window harness.
- `render-gaps.md`: G1's census baselines and the slot-clearing
  attribution it used.

## PROBE LORE

PROBE LORE (2026-10-12, K56): **a bare URL is TODAY'S DAILY** - fabric
mode with music, the trace + burn intro, the daily's HUD title, and a
SAVED ATTEMPT that the next bare load restores (a probe profile that
played once is no longer fresh). Probes that want a fresh default
design must pass a query (`?am=instant`: a random seed; `?<seed>`: a
given one, at today's defaults); `?daily&am=instant` is NOT a daily any more (am is not a
preference) - daily probes wait out the intro (probe_daily.mjs
waitReady). Probes that want knot mode pass `mf=0`, and probes that need
a settled first frame without a reveal pass `am=instant` - in a
key=value link (`?s=1471kin&am=instant`) or after a token
(`?1471kin.<blob>&am=instant`). COMPACT LINKS: the app rewrites every link to one token, so
`location.search` has no keys to read - read settings via
`window.__knotParams()`. AUDIO IS GATED on a trusted user
gesture: a probe that expects sound must `page.mouse.click` (or press a
key) first, and `window.__knotSynth` exists only once a context exists
(K720: the gate opened with sound on, or a later play with sound on; at
`snd=none` or Muted it stays undefined through every input)
(scripts/diag_audio.mjs injects an OfflineAudioContext, which bypasses it).

PROBE LORE (2026-10-13, K83): **a same-state A/B needs every clock
pinned, and since G2 the paint clock lives in `advanceClocks()`** - a
probe that only overrides `tickPaint` (the older recipe below) still
animates the pulses, and master-vs-branch differed along every choice
arm. Pin `r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn =
0`. Under the thread reveal, one more: the fabric's explore clock
(`F = __knotFabricRenderer(); F.exploreClock = 1000;` and `F.tickExplore`
forwarded with 0; without it the reveal's halo breath differed by 22050
px, G3-0). Under fog, three more: the fog-fit camera eases for over a second
after a move (wait until `__knotView()` holds still, before each tap and
the capture); the background drifts in probe windows (pin
`__knotBackgroundLayer()`'s tick and clock and re-render - the fog draws
the background, so a drift changes every fogged pixel); and fog holes
were stamped wherever the dot was on each frame, so moves had to finish
in one frame (`ms=100000`) for the stamps to repeat - since K99 a move
stamps fixed stations along its run (`src/render/fog_arc.ts`), the same
at any speed, frame rate or mid-flight tap (`.claude/probes/K99/
k99_fog.mjs` checks four timings; builds before K99 still need
`ms=100000`). With those, master vs
master was 0 px (under fog + mist, 76 px of dither); K5 M1's same-build
controls differed by 4054-7979 px (K390), so run one first. Recipe:
`.claude/probes/K83/k83_ab.mjs` (phy=0 for a deterministic layout, then
every differing pixel attributed to a marker footprint).

PROBE LORE (2026-10-11): **the session scratchpad is shared by every
agent of the session** - another agent rebuilt `dist_before` under a
running A/B (the "before" stamp silently became a different commit).
Give every build/output a unique subdirectory and check the stamp's SHA.
rebuildFillets is GATED now: timing loops must call it with `true`, and
geometry injected into the fan meshes (the GPU census) survives only
until the next update() - wait for sleep and use a fw=0 URL. A rAF-to-rAF
TIME_ELAPSED query also counts GPU idle between a mid-tick GL upload and
the render (10-12 ms phantom "spikes" at rest): start the query at the
frame's first draw call (probe_gpudraw).

PROBE LORE (2026-10-14, K76 2b): **hold the perf lock for every
pixel-exact GPU probe** (censuses, contact sheets, same-state A/Bs), not
only for timings. While another agent's GPU batch ran, two sheets of
one build lost the vellum backdrop in 10 of 12 frames, and a census's
mode-off-again check failed on 77% of the frame. Alone, the same build
passed both. Inferred, not caught: a WebGL context loss under the load.
After one, a RenderTexture comes back empty, and a probe that pins the
background never renders it again. Record `webglcontextlost` and fail
on it (`render-explore.md`, the probe lesson).

PROBE LORE, same round: the renderer resets every fill/erase mesh's
`visible` each frame (hide with `renderable = false`, or per layer);
the custom section shader ignores `mesh.tint` (tint attribution only
works on default-shader meshes such as erases); and the URL-state
rewrite drops `#hash` on load (pass probe args through page.evaluate).
Three "no effect" toggles in a row meant the probe, not the renderer.

## Probe gotchas, hooks and tooling

- *K550 (2026-10-20), the worker host:* two loads of one link do NOT
  sleep in the same state on the default worker host (K7): they froze at
  sim 4.967, 5.0 and 5.017 s with different state hashes, so a
  same-build control read 88-8039 px. A same-state A/B runs with `&phy=0`
  (physics off) or `&phw=0` (in-thread, the same state every load) and
  checks the `__knotPhysDump` hashes. A burn needs its FX pinned
  (`F.tickFireFx = function () {}`, then `F.fireFx.clear()`), and knot
  mode needs a sensitivity control other than debug view 5 (hide
  `renderer.root`). Recipe: the K550 kill's `ab_probe.mjs`
  (`.claude/probes/K550/kill/`).
- *K75 (2026-10-12), cross-build frames:* a frozen page keeps the flow
  undulation at whatever flow time it had when frozen (main.ts re-syncs
  flowStrength every tick, so `freeze()`'s `flowStrength = 0` does not
  hold), and two pages freeze at different times: a same-state A/B of
  whole frames needs `fw=0` in the URL, or every ribbon edge and crossing
  differs. Debug view 5 (`renderer.paintDebug = 5`) shows the visible
  ribbon's paint terms (p, pulse v, glow); a pulse at the PULSE_MIN_V
  floor reads G = 1, so classify bands as G >= 1. Junction webs are not
  in it: find web pixels by re-rendering with `filletMesh` /
  `filletTopMesh` `.mesh.renderable = false`.

- *From JUNCTION CLEARANCE + TWO-LAYER FILLETS, the probe note:* Probe note: layer-toggle attribution must hide BOTH filletMesh and
  filletTopMesh.

- *From COMPACT LINKS, reading the live params:* `window.__knotParams()` returns the live params (the address bar has no
  readable keys any more); scripts/diag_scan.mjs reads tw/gap from it.

- *From COMPACT LINKS, probe URLs:* `?<seed>&am=instant`,
  `?<seed>.L&...` and `?s=<seed>&...` all read today's defaults (K132).
  A token of another version (`.J` = v4 since K111 stage 3 made the codec
  v5, older probes' `.c` = v3, `.U` = v2) reads as its seed at today's
  defaults, with a console warning, so the `.J` links in older entries
  still build the same design.

- *From RENDER-ONLY PLUCKS, probe hooks:* Probe hooks:
  __knotPluck, __knotPluckState, __knotPerf, __knotSetPhysics,
  __knotSetPhysicsParam, __knotReplay. PROBE GOTCHA: a `seed=`
  probe URL that already carries a key IGNORES a second copy appended
  after it (URLSearchParams.get returns the first) - REPLACE `mf=1` with
  `mf=0`, never append.

- *From MAZE STATS + DAILY MAZE, daily probes and dev servers:* PROBES: `__knotDaily()` (taps, saved attempt, prefs), `__knotPlayDaily
  (n)`, `__knotFabric()` choices' `farDeadEnd` and `routeToDeadEnd
  (exclude)`; `.claude/probes/K19-K20/` holds probe_daily.mjs (front |
  resume | leave | reset | finish | tabs | prefs, `:phone` variants, and
  K20's desktop | phone | nostorage | tz | deadends; each ends in a CHECK
  summary), run_probes.ps1, scan_dailies.ts (the day scan; `--golden`
  prints the golden test's fingerprints) and the results. Editing src/
  under a running probe reloads its page mid-solve. Serve an agent's dev
  server with a private vite cacheDir (that folder's
  vite.private-cache.config.ts wraps the served checkout's config):
  worktrees share node_modules through junctions, and a plain `vite`
  re-optimized the shared `.vite` deps under other servers. Chrome
  refuses some ports (ERR_UNSAFE_PORT: 6000 and 6665-6669 among them), so
  probe servers skip them (K465, 2026-10-15).

- K73 (2026-10-13), corner chrome probes: `.claude/probes/K73/`
  (probe_badge.mjs free | official | replay | narrow, probe_exit.mjs
  main | solve | intro, each with `:phone`; probe_pointer_look.mjs
  close-ups) and the hooks `__knotDaily().badge` and `__knotIndicators()`
  (each indicator's status, target point and placement, `finishWhy`).
  GOTCHAS: puppeteer's plain `mouse.wheel({deltaY: -300})` arrives here
  as -449.99998 (not an integer), which main.ts reads as a trackpad
  scroll (a pan, clamped to nothing at zoom 1) - zoom with ctrl + wheel
  (the trackpad pinch path). A phone viewport's `touchscreen.tap` stopped
  dispatching ANY events after a CDP `Input.dispatchTouchEvent` pinch, a
  few DOM taps and three page loads in one browser (a fresh browser
  solved the same maze in 22 taps); give touch-tap sequences their own
  browser. Mobile emulation keeps the layout width it loaded with:
  after setViewport to a narrower width, load the page again. And the
  follow camera takes seconds to ease onto the head: wait for
  `__knotView()` to hold still before tapping a choice's screen point.
  K431 (2026-10-16): a three-decimal `viewStill` is NOT pixel-still under
  cam=follow - the spring's tail creeps ~1e-5 a shot for seconds (the
  2026-10-16 census3a ramp run's clips all shifted). Pixel-exact probes
  wait for a BIT-EXACT view with frames forced each poll (rAF runs or the
  spring never advances between polls and the wait passes early):
  census3a's prepare does this (10 identical full-precision views, frames
  forced); sheet3a's EXACT=1 is the same wait.
  Builds before K96 (d8b9175) ease even slower while the knot settles
  (at most 0.05 s of spring per frame). `.claude/probes/K96/k96_cam.mjs`
  slows frames with a busy-wait in every rAF: CPU throttling barely
  slows a frozen layout.

- K79 stage B merge (2026-10-13), panel probes: a row's reset glyph
  (`.kp-reset`) listens for `pointerdown`, not `click`, so a probe's
  `.click()` leaves the value alone (dispatch a PointerEvent, or press the
  glyph with the mouse). `k79b_smoke.mjs` imports `/src/render/*.ts` inside
  the page, so it needs a Vite DEV server (the private-cache config,
  `.claude/probes/K79/vite.private-cache.config.ts`); against a
  `vite preview` build it dies at its first import. `k79b_speed8.mjs`
  (speed links, the 8x drift clock, the real slider's ends, the tooltip,
  reset) runs on a build.

- K147 (2026-10-13), the load settle: **sim and wall no longer match**
  while a knot settles, by design. The hidden pre-settle runs ahead of
  wall, and the settle budget drops what a frame cannot afford (slow
  motion; the stamp appends ` | settle lag X.Xs`, the simulated seconds
  dropped). `window.__knotSettle()` reports the phase (presettle |
  budget | free), the budget's cost estimate and lag, and how each phase
  ended (`endedBy`: sim | work | sleep | wall | mode). A probe that times
  the sim against wall passes `&stb=0` (no budget: today's real-time
  stepping and its catch-up spiral); `&lds=5` is settle-first (hidden
  until the first sleep); `&lds=0` skips the pre-settle.
  `scripts/diag_screenshot.mjs` reports `timing` (sim, wall, lag, phase)
  and `frames` (rAF interval median, p95, max) instead of expecting
  sim = wall: a ~1000 ms median is an occluded, frozen capture. The
  measuring harness is `.claude/probes/K147/k147_measure.mjs` (intro
  frame intervals, intro end, first sleep, sim/wall, frame sheets,
  `--throttle N`, `--drag`); `run_batch.ps1` runs a batch under the perf
  lock.

- K80 (2026-10-13), the real-time chase: `.claude/probes/K80/rt/` holds
  the headless simulation (`run_rt.ps1 -Sweep <name> -Seeds 288`,
  results.md) and the page probes: `rt_chase.mjs <base> <outDir>
  caught|escape|indicator[:phone] [seeds]` (real taps; EXTRA adds link
  keys) and `rt_page.mjs`. Probe links: `?<seed>.J&am=instant&clk=realtime`.
  GOTCHA: since K122 vite.config.ts imports the extensionless
  `notices/vite_plugin`, so the older private-cache wrappers (K19-K20,
  K79, K99), which import() the config natively, fail with
  ERR_MODULE_NOT_FOUND; K80's wrapper loads it through vite's
  `loadConfigFromFile` instead. The turn-aligned minotaur (K80 turns
  stage 1, 2026-10-14): `.claude/probes/K80/turns/` holds `compare.ts`
  (the module against the research harness `sim.ts`, trace by trace;
  run with vite-node and `vite.node.config.mjs`, output compare.md) and
  `turns_page.mjs <base> <outDir> [hunter|guard|stalker] [seeds]` (real
  clicks: roam, hunt and catch shots, the catch checks, a wait). Probe
  links: `?<seed>&am=instant&mt=hunter`. Stage 2 (2026-10-14):
  `.claude/probes/K80/turns2/` holds `sweep.ts` (the retune's grid:
  `node node_modules\vite-node\vite-node.mjs --config <that
  folder>\vite.node.config.mjs <that folder>\sweep.ts <out.md> <grid>
  [reps]`; full_*.md, sweep_*.md), `compare_after.ts` (module vs
  harness at the new defaults, 0 mismatches) and `rt/` (K174's real-time
  sim on H1 mazes, results.md, still.md).
- K174 (2026-10-14), the minotaur's controls: `.claude/probes/K174/rt/`
  is K80's simulation fixed for K132 (`rt_lib.ts` builds params with
  `paramsFromValues(seed, {...overrides})`; the K80 copy, which predates
  K132, needs the same fix) plus `-Sweep toward` (`rt_sweeps.ts`),
  `meet_by_time.mjs` and results.md. `k174_page.mjs <base> <outDir>
  panel|refog|fogmodes|intro|perf|perfq[:phone] [seed]` (EXTRA appends
  link keys) checks the panel rows, a catch's re-fog, the three minoFog
  modes, the intro wait and frame time. LESSON: a probe that polled the
  page over CDP at 20 Hz while it walked raised a chase's p95 frame cost
  from 19 to 34 ms; `perfq` taps from inside the page (`__knotChaseTap`
  on a timer) and times the wrapped methods per frame, with no round
  trips. `__knotReveal()` is null until K147's pre-settle ends, so an
  intro probe waits for it before it samples. K80's `rt_chase.mjs` put
  its Chrome profile in the OS temp dir; K174's copy keeps it in the
  probes folder (K161).

- K104 (2026-10-13), motion and size: while the desktop's session is
  attached over Remote Desktop (or left disconnected after one), probe
  Chrome reports `prefers-reduced-motion: reduce`, so Motion "follow
  system" runs reduced plucks and still backgrounds; at the console it
  reports no-preference. Emulate no-preference before load whatever the
  session. Set pluckSize only with `&psz=`: main.ts re-syncs
  `plucks.size` from the params every frame.
- K140 (2026-10-14), CPU throttling: throttle after the load settle, not
  from the load. A throttle from the load measures K147's slow first
  settle instead of the effect under test.
- K146 + K151 (2026-10-14), past dailies and the mode badge:
  `.claude/probes/K146_K151/probe_k146.mjs <base> <outDir>
  free|daily|practice|history[:phone][:hud]` (real taps; `history`
  shifts Date a year ahead over a seeded v3 store, `:hud` turns the HUD's
  stat rows on) and the hooks `__knotDaily().badge`, `.badgeText` (the
  label on screen), `.late` (whether this attempt is practice) and
  `.history` (dailyHistory as the stats view reads it). A Date shift
  needs `evaluateOnNewDocument` (a `Date` subclass whose `now()` and
  no-argument constructor add the offset), and a seeded store must be
  written only when absent, or every reload resets it.
- K100 (2026-10-14), the fog over backtracks and restores:
  `.claude/probes/K100/k100_fog.mjs <base> <outDir> free | daily |
  dailyoff | dailystatic | realtime` (real taps and panel buttons; its
  header says what each mode walks and checks; `lib.mjs` rebuilds the
  fog's explored field from the stamps on a world grid, so two stamp
  sets compare by IoU and revealed area, not pixels). DAILIES HAVE THE
  FOG OFF, so the daily modes need `vite.fogdaily.config.ts`: the
  checkout's own config plus an in-memory transform that adds
  `fogOfWar: true` to DAILY_V1 (the source on disk is untouched). K132
  (41e81b5) removed DAILY_V1, so the transform is BROKEN until it
  targets `PARAM_DEFAULTS`' `exploration` (`"fog"`; the param was
  `fogOfWar` until K76 stage 2c) (K262). Its env
  `K100_DAILY_EXTRA` appends more overrides (`flowStrength: 0,`
  with `?daily&phy=0` is a static daily, where a restore must reproduce
  the live stamps exactly). `simRestore` (in k100_fog.mjs) lays, on the
  geometry on screen, the stamps a restore of the attempt's taps would
  make, by the K100 travel rule or the pre-K100 A -> B one, then puts the
  live stamps back: a same-state live-vs-restore check without a reload.
  Hooks: `__knotFabric().restarts` (the controller's reset() count) and
  `.fog` (FabricMazeRenderer.fogProbe: on, held, stamps, radius and the
  restart the stamps belong to).
- K114 (2026-10-14), the burn race: `.claude/probes/K114/burn/` holds
  `burn_sim.ts` (R.6.1: scripted players over dailies 1-30 against the
  shipped controller; run `node node_modules\vite-node\vite-node.mjs
  --config <that folder>\vite.node.config.mjs <that folder>\burn_sim.ts
  <out.md> "rs=0.75,0.9" "hs=0"`, about 2 s; results_rebased.md and
  results_tuning_rebased.md are the current dailies, results.md and
  results_tuning.md the ones before K74 stage 2's H1) and `burn_page.mjs
  <base> <outDir> race|loss|perf [seeds]` (real clicks: the lit fuse, a
  near miss, a refused smoldering arm and its toast, the escape's closest
  call; or a wander to the Burnt banner, its x and re-show, Try again and
  Reset path; perf times drawFire and the pixi render at rest after an
  escape, under the perf lock, with THROTTLE=n for CDP CPU throttling;
  EXTRA appends link keys, VIEWPORT=phone a 412x915 phone viewport).
  Probe links: `?<seed>&am=instant&fi=fuse`. Hook: `__knotFabric().fire`.
  Stage 2, the real-time fire (2026-10-15): `.claude/probes/K114/stage2/`
  holds `rt_page.mjs <base> <outDir> still|race|perf [seeds]` (env CLOCK,
  EXTRA, THROTTLE, LABEL; VIEWPORT=phone is phonemouse; MIDSHOT=n shoots
  the race after move n; SUPPRESS=hud|fire no-ops the HUD lead's writes
  or drawFire), `perf_batch.ps1` and `perf_attr.ps1` (perf lock),
  `burn_sim_rt.ts` (burn_sim.ts plus think time) and `vref_probe.mjs`.
  GOTCHA: a real-time race does not wait for the probe. A shot between
  taps is think time: the tight race (closest call 0.98; stage 2 ran it
  as `&fsp=0.95&fdl=0`, since K440 `&fsr=0.95&fdr=0`) escapes without
  one and burns at the shot with it. SINCE K440 (2026-10-15) a real-time
  race reads its own pair, `fsr` / `fdr` (default 0.2 / 20), and `fsp` /
  `fdl` set only the turn clock's: rt_page.mjs's default EXTRA
  (`&fsp=0.3&fdl=40`, stage 2's runs) now races at 0.2 / 20, so pass
  `EXTRA=&fsr=0.3&fdr=40` to repeat stage 2's measurements. K440's page
  check: `.claude/probes/K440/k440_page.mjs <base> <outDir> [seed]`
  (`run_k440.ps1` under the perf lock). GOTCHA (K441, 2026-10-20): a
  realtime-vs-turn frame comparison must fix the physics state. Wait for
  `asleep` in both stands: a slept knot takes `restFrame` and an awake
  one the full tick (`frame_loop.ts` ~770), which alone made a +10 ms
  (1x) gap in K441's first stands. Stage 2's "0.5 ms unattributed" may
  be the same confound. GOTCHA (K580 stage 3, 2026-10-20): headless
  SwiftShader pages never slept (`asleep=false` in every scene of
  `.claude/probes/K580/count_base.txt`), so anything that waits for
  `asleep` needs headed real-GPU Chrome (`scripts/diag_screenshot.mjs`).
  GOTCHA (K653, 2026-10-20): `drawImage(webglCanvas)` reads back blank in
  this app, so crop-readback probes carry no pixels; use
  `page.screenshot({ clip })`.
- K111 stage 4 (2026-10-14), hover probes: a TOUCH press on a choice
  lights nothing (main.ts only sets pendingTap), so a phone-size hovered
  choice needs a MOUSE at the phone viewport (`phonemouse`: 411x753 dsf
  2, isMobile, hasTouch false, loaded so; toggling hasTouch mid-page
  re-lays out the frame, 1.16M px). A touch LIFT within the slop is a
  tap, and a tap PLUCKS the run (pointerup -> tapPluck): a probe that
  presses a thread to look and then lifts leaves a pluck moving it for
  its next shots (the first phone width sheet's "no hover" cell). Lift
  with a CDP `touchCancel` (a pointercancel never plucks) and wait for
  `__knotPluckState().active` to empty. Probes:
  `.claude/probes/K111/stage4/` (`hm_probe.mjs ab|looks`,
  `rim_sheet.mjs`, `ab_all.ps1`, `census_widths.ps1`, `sheets.ps1`).
- K299 (2026-10-14), injected paint: a probe that declares its own
  spans, pulses or rim (`renderer.setPaint` / `setRim`, with `paintKey`
  cleared) loads with `fw=0&snd=manual`. Music mode's auto plucks draw in
  normal colors and ignore paintDebug (a pink band in debug view 5 was
  one), so wait until `__knotPerf().plucks` reads 0 before shooting. A
  sleeping knot never calls setPaint, so a probe that records the paint
  by wrapping setPaint starts from the renderer's live declaration
  (`paintSpans`, `paintPulses`, `paintCaps`, `paintRoutes`,
  `paintTraveled`) and re-declares with `paintKey = ""`. Shoot two
  pulse phases (t 100 and 100.45): at one phase a run can have no crest,
  and a broken pulse matched the good one. Recipes:
  `.claude/probes/K299/` (`ab_nudge.mjs`, `inject.mjs`,
  `inject_rim.mjs`, `inject_hits.mjs`; `notes.md`).
- K307 (2026-10-14), shader compiles: `.claude/probes/K307/` holds
  `trace_intro.mjs <origin> <label> <path?query|->` (a WebGL2 wrapper
  that times every call and names each program by its source hash and
  Pixi's `SHADER_NAME`, plus a performance trace from navigation; its
  header lists the options: loads, restart, ANGLE backend, viewport,
  which loads trace), `run_k307.ps1 -Batch <file>` (batch lines under
  the perf lock), `table.mjs <label>` (a line per load),
  `compositor.mjs` (what other threads did in each long task;
  `--presents`, `--long`, `--window=a,b`), `who_compiles.mjs`,
  `programs_from_run.mjs` and `spinner/` (a worker's OffscreenCanvas
  spinner through one cold link). The findings are in
  `render-shaders.md`. GOTCHAS: Chrome's GPU program cache lives in the
  profile, keyed by source, and survives a restart, so a compile probe
  needs a fresh `--user-data-dir` per load, or every link after the
  first reads about 25 ms. For a cold load on a used profile, salt the
  shader sources; never clear Levi's Chrome. The wrapper books a whole
  compile on the first LINK_STATUS read. The trace puts the work on
  GPU-process `ThreadPoolForegroundWorker` threads (`D3DCompile`) and
  the waits on the renderer's main thread (`GetProgramiv`) and on
  `CrGpuMain` (`MainLinkLoadEvent::wait`). A frame reaches the screen
  at `DCompPresenter::Present`, on `CrGpuMain`. A probe build that reads
  a `#hash` flag must read it at module load, before main.ts's URL
  rewrite drops it (the prototype's `#seq`).
- K298 (2026-10-14), pick margins: `.claude/probes/K298/pick_probe.mjs
  <base> <out.json> [desktop|phonemouse]` (env `EXTRA=&fw=0`, `ZOOM=1`)
  moves the real cursor d px past a run's drawn edge and reads the
  canvas cursor, then clicks and press-drags at set distances;
  `pick_batch.ps1` runs it under the perf lock (call it with `&`);
  `pick_sheet.mjs` + `pick_compose.mjs` draw the old and new zones.
  Measure from the DRAWN centerline (`renderer.chainSamples`), not
  `__knotPoint`, whose curve sits 0.015-0.06 world off it (more with
  flow): gameplay-camera.md's PICK MARGINS.
- K479 (2026-10-15), tap preference: `.claude/probes/K479/` holds
  `mid_move.mjs <base> <out.json> [seed]` (the dot frozen at 30% of the
  first move into a junction, `edgeAt` along the arrival run, a real
  click on the uncovered stretch), `census.mjs` + `report.mjs`
  (`node report.mjs <census json...> --variants=old,be1.5,be2`: every
  junction entered on each of its runs, a world grid, classes from the
  true geometry, the old and new pick side by side), `hover_ab.mjs` +
  `hover_compose.mjs` (the lit run under the old and the new pick on ONE
  page and one frozen state, `tapPreference` toggled; a mouse at phone
  size, since a touch press lights nothing), `click_e2e.mjs <base> <out>
  on|off desktop|phonemouse` (a REAL click at a toss-up point, and the
  path it ends with; `click_e2e.ps1` runs the four under the perf lock)
  and `locked_verify.ps1` (suite, build and hover under the perf lock).
  GOTCHAS: the controller
  is not a window hook, so wrap `fb.edgeAt` to capture it (the next
  hover passes it); `__knotTurnMove(eid)` plays a move through
  moveAlong, which COMMITS the move at once (the head is the far
  junction while the dot is still on the run); `fb.runsInReach(x, y, c,
  maxD, c.arrivalEdge)` lists what a pick chose among.
- K7 stage 4 (2026-10-15), THE PHYSICS WORKER AND THE PROBE BRIDGE
  (`docs/design/K7_worker.md`, design 8 and the stage 4 handoff). **THE
  WORKER IS THE DEFAULT since K7 stage 6 (call F6, 2026-10-15)**: a bare
  link, a token, or `&phw=1` runs the physics in a Web Worker, and
  `__knotPS()` is main's MIRROR: positions, pass ctrls, flags and emergent
  rows from the snapshots (interpolated between the newest two), and NO
  prev, zPos, contact state or slide stats. Assigning its `step` THROWS,
  naming the fix, so **a probe that patches or wraps `ps.step` throws on
  the default build**: give it `&phw=0` (the in-thread path, unchanged:
  every older probe still runs there) or the one-line port, which is
  `await window.__knotPhysFreeze(true)` inside an async `page.evaluate`
  callback in place of `__knotPS().step = function () {}` (and
  `await window.__knotPhysFreeze(false)` in place of `delete ps.step`),
  feature-detected (`typeof window.__knotPhysFreeze === "function"`, else
  the old line) so a build without the hook still freezes. K7 stage 6
  ported the 21 shared libraries that way (`g2lib.mjs`, `lib.mjs`; 95
  probes import them), so their importers run on both hosts; a link with
  `phw=0` after a token (`?<seed>.<blob>&phw=0`) overrides the default.
  The bridge works on both
  hosts: `await __knotPhysFreeze(true|false)` -> `{frozen, simTime, kind}`
  (in-thread it IS the old `ps.step = function(){}` patch, an own
  property; with a worker it stops the worker's clock and resolves once
  main shows that exact state); `await __knotStepUntil(simTime)` steps
  1/60 s frames to that sim time through the class's own step, frozen or
  not, not counted as live stepping; `await __knotPhysDump({arrays})` ->
  FNV-1a hashes of positions, prev, zPos and passes (equal across hosts
  for one state) and, asked, the arrays; `__knotPluck({tug})` returns a
  Promise that resolves once the tug is in the state main shows.
  `__knotPerf()` and `__knotSettle()` add `physMs` and `substeps`
  (cumulative live stepping since the build: main-thread ps.step time
  in-thread, the worker's own time with a worker; difference them per
  frame instead of wrapping ps.step), `lagS`, `frozen`, `asleep`, `kind`;
  `__knotPerf()` adds reveal.tick's cost (`revealMean/P95/Max`,
  `revealMsTotal`) and `__knotReveal()` its `tickMs`. Ported to both
  hosts: `scripts/diag_screenshot.mjs` (`timing.host`, `physMs`),
  `scripts/phone_pass/walk.mjs` (pinAll freezes through the hook),
  `.claude/probes/K7/stage4/` (`k7_frames.mjs`, now a FIXED WALL-TIME
  drag, `--dragms` 5000; `k7_latency.mjs`, a pointer event to the end of
  the first frame whose grabbed point covers 90% of where it SETTLES for
  that step: main bounds a drag, L tanh(r / L), and the constraints hold
  the grabbed particle short of even that, so a target at the pointer is
  never reached) and its `ports/` (`K147/k147_measure.mjs`,
  `K279/k279_sheet.mjs` (stepUntil), `k279_wake.mjs` (physMs deltas),
  `k279_live.mjs`, and `g2lib/g2lib.mjs`, the union of the two g2lib
  lineages, freezing through the hook). Every probe that patches or
  wraps ps.step and is not ported (the 31 other freeze-patch files and the
  timing wrappers, K374) tests the in-thread path only: run it with
  `&phw=0` or port it (the list and the one-line ports: the stage 4
  handoff and `ports/FREEZE_PATCH_FILES.md`). A probe OF the budget, of
  `stb`, or of sim against wall takes `&phw=0` too, and
  `scripts/diag_screenshot.mjs` reports `timing.host` `worker` on a bare
  link, with ` | lag` (not ` | settle lag`) in the stamp. With the worker,
  `__knotSettle().phase` reads `off`: K147's budget runs only in-thread.
- K8 stage 2 (2026-10-15), G3-0's data plane: `.claude/probes/K8/stage2/`
  holds `g3_probe.mjs` (its header lists the modes: `ab`, a cross-build
  same-state A/B; `readback`, the four G3 tables on the GPU against their
  CPU mirrors and a fresh pack, `intro` sampling mid-reveal for RADII
  rows; `upload`, texture bytes per update(); `cpu` and `cpuloop`,
  update() ms across builds and with `g3Data` toggled in one page;
  `roundtrip`, capture and restore), `batch3.ps1`..`batch6.ps1` (runs
  under the perf lock) and `phone6.ps1` (the phone pass under both
  locks, each bench killed past its time budget). A THREAD-REVEAL A/B
  also pins the fabric's explore clock:
  `F = __knotFabricRenderer(); F.exploreClock = 1000;` and
  `F.tickExplore` forwarded with 0. With only k83's pins the reveal's
  halo breath differed by 22050 px between two builds, with it 2 px
  (maxΔ 1), which master against master shows too (the probe's page
  order); k83_ab pins it too since K381, older recipes do not. A ROUND
  TRIP'S CONTROL MUST DIFFER: the physics is deterministic, so two loads
  of one link sleep in the same state (in-thread or with physics off; not
  on the worker host, K550 above), and batch4's six capture/restore
  round trips passed with controls of 0 px, proving nothing. Perturb the
  restoring page before its control shot (every particle by 0.06 sin/cos,
  every displayF by 0.02) and require control > 0. Hooks:
  `__knotRenderer().captureScene()` and `.restoreScene(s)` (freeze the
  restoring page first: `__knotPS().step = function () {}` in-thread,
  `__knotPhysFreeze(true)` with a worker), `g3DataState()`,
  `g3TableRows()`, `g3Expected()` (render-ribbon.md, G3-0 DATA PLANE).
  `scripts/bench_frame.mjs <url>... [--cdp <browserURL>]` is the
  gl.finish() frame bench of G3G4 section 5.0: it loads the links in
  turn over `--rounds`, reversing the order every other round (A B, then
  B A: on the desktop update() ms crept up page by page), times each
  frame from its first draw to after gl.finish() (frameMs, split into
  submit and finish), counts draws and update() ms per call, records the
  caps and exits 1 on a lost context.
- K397 (2026-10-15), the thread reveal's stub ends:
  `.claude/probes/K397/` (stage 1) and `stage2/` (`survey.mjs`, the
  dots at every frontier; `zoomcrops.mjs`, a crossing's cut against the
  slot rejected; `pluck_stub.mjs`, a tap's blur by stretch: solid, fade,
  past; `k397.mjs`, the shared walk and freeze). A SLOT REJECTION (a
  "no cut" frame) holds only on an `am=instant` link: under an intro the
  reveal rewrites every slot's vis each frame. `run_locked.ps1` takes
  `-What` and `-Cmds` by name: a third positional string binds to
  `-MaxWaitMin` and fails to parse; call it with `&` and `npx.cmd`.
  Stage 3 (`stage3/`, the fused-joint pairs; render-ribbon.md, A FUSED
  JOINT IS NOT A CROSSING): `h1scan.mjs`, `h6look.mjs`, `jointab.mjs`,
  `farcheck.mjs`, `knuckle2.mjs` (panel M = master) and
  `verify_batch.ps1`. Its `g2/census_fan.mjs` runs the env `PRE` (a JS
  expression) in the page before the census, to flip a toggle.
  Stage 6 (K522/K523, 2026-10-16): `census2d.mjs` (K76 stage2d) no longer demands exact sets or 0 px: hard diffs are >1 level, `FLOOR_CLIP_PX` 23 is K519's measured per-clip floor, restores use contemporaneous references, JOINTS (2d) carries census3a's `attributedUW` swap and `fadeModel`, and MARKERS is exit-aware (K465's lifted exit is on at vis 0). The diff against the FIRST mode-off frame over a long census is drift (K528), not a verdict; the m10 recipe reads 30/30 (K397.md Stage 6 handoff).
- K6-1 (2026-10-15), THE FRAME LOOP'S FLAGS (`render-loop.md`):
  `__knotLoop()` returns the flag ledger's report since the last reset:
  `mode` ("ondemand" since K6-3; "continuous" when asked), `stopped`
  (K6-3: the ticker is halted), `frames`, `now` and `last` (the open and the last
  closed frame's need, as flag names), `halted`, `flags` (per flag:
  `frames` set, `sole` = frames it was the only visual flag, `pushes`),
  `empty` and `emptyRuns` {count, longest, current} (frames with no
  visual flag: each one a frame K6-3 would skip), `restarts` (what ended
  each empty run: `push` or `poll`, `byPush` / `byPoll` bits, and
  `pollWithInput`; a restart by poll with no INPUT push in its window is
  an animation a stopped ticker would miss), `ambientOnly`, `observer` (`rootMoved`:
  the root moved with CAMERA, LOAD and PHYS clear; `legacyOnly` /
  `flagsOnly`: the old sceneAnimating() against sceneActive;
  `stepUnflagged`) and `recent` / `recentPush` (the last 240 frames'
  masks). `__knotLoop({reset: true})` zeroes it. K6-3: `{continuous: true}`
  restores the every-frame loop (probes that wait for or time frames use
  it, or set `window.__knotLoopMode = "continuous"` with
  evaluateOnNewDocument before load); an idle on-demand page draws
  nothing, and diag_screenshot reports `frames.idle: true` there instead
  of a throttled frame rate. `{track: true}` arms the
  TRACKER: after Pixi's render in the same rAF it reads the whole
  framebuffer (`gl.readPixels`) and counts the pixels that differ from
  the last frame's, plus a MutationObserver's DOM changes, and the report
  gains `track`: OVER (a visual flag, 0 px, no DOM change) by flag, UNDER
  (pixels changed with no visual flag and no INPUT push: a miss),
  `underInput` (the same with an INPUT push), `dom` (in a frame, in an
  empty frame, between frames), `lost` (webglcontextlost) and `readMs`.
  `{track: false}` stops it and returns its last report. Armed, timings
  are void (a GPU sync every frame). The flags are counted on every build
  since K6-1, unarmed (a few bit operations and the polls a frame). The
  probe: `.claude/probes/K6/K6-1/loop_shadow.mjs <base> <outDir> <case>`
  (knotfw0 | knot | fabric | daily | chase | reduced | drift; phases load,
  rest, tap, drag, finish).
- K370 (2026-10-20), latency probes and locks: `.claude/probes/K370/`
  (`k370_latency.mjs`: a drag step's stages, from the event to the frame
  that covers 90% of it; `k370_profile.mjs`, a sourcemapped CPU profile
  of main; `run_k370.ps1` batches; `phone_part.ps1`, `cpu_check.ps1`)
  and `docs/design/K370.md`. GOTCHAS: `npm.ps1` (npm's PowerShell shim)
  loses a `--`, so call `npm.cmd` when a script needs args after it. A
  lock check matches its owner EXACTLY: run_k370's owner-PREFIX check let
  a second batch take over another batch's perf lock (and would have
  released it). A wait for "lock released" also matched "phone lock
  released": anchor it with `^`. On the phone, toybox `top -o <fields>`
  without `-s <field>` sorts by NAME, not CPU.

- K137 stage 3b (2026-10-21), the sword: `.claude/probes/K137/s3b/`
  holds `sword_page.mjs <base> desktop|phone <outDir> <seed>
  turn|realtime oneuse|timed <moves>` (real clicks on
  `?<seed>&am=instant&mt=hunter&swd=<mode>&swm=<moves>`; it walks to the
  sword, then onto the minotaur, and ends in a CHECK summary; outputs in
  `out/`) and `vite.private-cache.config.ts`, the private dev server's
  config. GOTCHA: the frame loop returns early while
  `__knotPerf().state` is "loading" (the warm-up and the hidden
  pre-settle; a fresh profile's cold shader compiles make it long), so a
  real-time chase does not tick then. A probe that walks a real-time
  chase waits for the state to leave "loading", then calls
  `__knotLoop({continuous: true})`; walked earlier, the chase read tick
  0 throughout.
- K137 stage 3c (2026-10-21), sprint: `.claude/probes/K137/s3c/` holds
  `sprint_page.mjs <base> [desktop|phone] [outDir] [seed=7]
  [clock=turn|realtime]` (on `?<seed>&am=instant[&clk=realtime]
  &mt=hunter&spr=on&snd=none`: a real click on the sprint button, the
  real F key, the walk through the moveAlong and chase-tap hooks; it
  checks the button's armed look, the minotaur standing through the turn
  clock's first sprinted move and moving on the second, real time's
  doubled pace for two runs, the HUD rows and used after, and ends in a
  CHECK summary; stills and JSON in `out/`, the Chrome profile in the
  probes folder) and `vite.private-cache.config.ts`, s3b's wrapper
  (vite's `loadConfigFromFile`; the K19-K20 copy failed with the K80
  GOTCHA above's ERR_MODULE_NOT_FOUND until it took the same wrapper on
  2026-10-21). s3b's
  `sword_page.mjs` links carry `&snd=off`: new links take `&snd=none`.
  `s3a_page.mjs <base> banner|fragile [desktop|phone] [outDir] [seed=7]
  [turn|realtime] [hunter|guard|stalker]` runs stage 3a's two unrun
  checks: `banner` (turn clock, `&mt=hunter&swd=oneuse&swm=20&mlv=3
  &spr=on`) walks to the sword, slays the minotaur, presses F and walks
  to the exit, then reads `#maze-banner`'s rows (hearts `n / 3`, sword
  slain on move N, sprint used); `fragile` (`&fg=snap`) walks unbroken,
  not-yet-walked arms away from the minotaur and checks after every move
  that its route (the turn telegraph; real time's plan and plan8) uses
  no broken run, with a counterfactual (`near` / `far`: runs from the
  minotaur to the player over all runs / unbroken runs only; far > near
  means a route that ignored breaks would cross one). GOTCHA: the
  start's runs are exempt and never break, so a walk that takes the
  first choice shuttles on run 0 and breaks nothing.
- K137 stage 3d (2026-10-21), sleepers and the follower:
  `.claude/probes/K137/s3d/monsters_page.mjs <base> [desktop|phone]
  [outDir] [seed=7] [kind=both] [n=2]` (on `?<seed>&am=instant&mt=hunter
  &slp=<n>&slk=<kind>&snd=none`, turn clock; real clicks on the choices'
  screen points, falling back to `__knotTurnMove` only when a click did
  not land, counted). It checks the monsters laid (each asleep at home),
  a dimmed marker per monster, the HUD's woken row (absent without a
  sleeper), walks onto the first sleeper (awake, woken 1, a full-alpha
  marker), walks onto the follower's junction and off (waiting on an
  amber marker, then awake), then a catch (every monster home asleep,
  woken kept) and no page errors, and ends in a CHECK summary; stills
  (`_m<i>` marker crops, `_hud`) and JSON in `out/`, the Chrome profile in
  the probes folder. `vite.private-cache.config.ts` is s3c's wrapper.
  GOTCHA: the renderer's `extraMarkers` are LAYER-LOCAL (the layer sits in
  the view's transform), so page points come from each
  `extraMeshes[i].mesh.getGlobalPosition()` plus the canvas rect. A walk
  back onto a follower's junction on the move its wait ends is a catch
  (the harsh follower, call 3), so a driver that wants to see it awake
  walks away from home first.

- K137 stage 4 (2026-10-21), lures and snares:
  `.claude/probes/K137/s4/tools_page.mjs <base> [desktop|phone] [outDir]
  [seed=7]` (on `?<seed>&am=instant&mt=hunter&lur=3&snr=2&snd=none`, turn
  clock; real clicks on the tool buttons and on the runs). It checks the
  link, the buttons (badges 3 and 2, inside the viewport, no other control
  over them) and the HUD rows; walks to a junction 3-6 runs from the
  minotaur; a click arms the lure, and a lure on a run at your junction is
  heard (stock, toast, `tapEdge`, the minotaur's target your junction with
  its hunt forgotten, no move made); with the minotaur one run off, a
  click arms the snare and a snare on its next run is laid (no move, no
  turn, badge and HUD 1); N arms it again, a second snare on that run is
  refused and stays armed, Esc puts it down; a wait springs it (held,
  "Snared!", no catch, it stands); a lure out of range (nobody heard,
  still spent); at 0 the lure button is disabled and L arms nothing; no
  page errors. It ends in a CHECK summary; stills and JSON in `out/` (extra phone runs in
  `out_rep*`), the contact sheet `contact_sheet.png` from `sheet_rows.json`
  through a copy of K525's `mksheet.mjs`, which needs ABSOLUTE paths
  (relative ones fail with ERR_FILE_NOT_FOUND). Hooks:
  `__knotTurnMino().tools`, `__knotTool(k)` (a press) and
  `__knotFabric().cutPick(x, y, maxD)` (the run a tap at a page point
  picks, through the cut's own pick). GOTCHA: `runPoint(edge, 0.5)` is on
  the physics curve, so a run's middle can sit on a crossing or beside a
  neighbour, and a tap there picks the other run (3 of 5 phone runs lured
  a neighbour before the fix; the layout varies per load). The driver's
  `pickPt(edge)` tries fractions 0.5, 0.42, 0.58, 0.34, 0.66, ... inside
  the view and taps the first that `cutPick` confirms, and checks
  `tools.tapEdge` after the tap ("the tap picked the run aimed at").
  `panel_rows.mjs <base>` reads the Lures and Snares rows' visibility from
  the panel's DOM (`tp-v-hidden` on the row or a parent): both show by
  runs, and Snares hides with `&mbl=1` (3 checks).

- K698 + K713 (2026-10-21), the toasts, the walker's glow and the pad:
  `.claude/probes/K698/k698.mjs <cut|aids|lives|walker|sword|glow|pad>
  <phone|land|desk> [seed]` (real taps, touch on phone and land; `run.ps1
  case:vp ...` runs a batch in parallel; out/ and shots/). An in-page
  recorder (evaluateOnNewDocument) rect-checks EVERY toast 400 ms after it
  shows against every visible control (buttons, links, inputs,
  [role=button], `.km-ind/.km-pad/.km-aid/.km-cut/.km-walk/.km-control/
  .km-banner`), plus pointer events and centring. `sword` shows the
  sword's three texts through the app's own showToast: a dev server's
  `await import("/src/ui/share.ts")` in the page is the module instance
  main.ts uses (same URL). `walker_page/` holds K114's walker page driver
  patched for port 5698 and its private-cache dev server config.

- K138 stage 4 (2026-10-21), locks and keys: `.claude/probes/K138/s4/`.
  `census/census.ts <out.md> [first] [last]` (keys and locks over 50
  seeds through the shipped controller, plus the TRAP CHECK: a forward
  BFS over legal taps, and a trap is a reachable node that cannot reach
  the exit and cannot undo out because a move on its path blocks its
  backtrack; results.md) and `census/trap_detail.ts <seed> '<rules
  json>'` (one trap's blocking moves) run with `node
  node_modules\vite-node\vite-node.mjs --config <that
  folder>\vite.node.config.mjs <script> ...` from the checkout.
  `page/plan.ts [seed=7] [keys=2]` (same runner, `page/`'s config) writes
  `plan.json`: Route A from the start to the far end of a lock run L,
  holding no key, then Route B through every key to the exit.
  `page/locks_page.mjs <base> [desktop|phone]` (run from the checkout; on
  `?<seed>&am=instant&snd=none&ky=<keys>`, headed and off-screen, a fresh
  profile deleted after) walks Route A with real clicks (desktop) or
  touch taps (phone: 411x753, dsf 2), each at a point the renderer's
  `edgeAt` confirms, falling back to `__knotTurnMove` only when a press
  did not move (counted). It presses L (at `runPoint` fractions until
  `cutPick` confirms L): refused (head, path and keys unchanged), the
  toast, the thunk in `__knotCutPlucks()`. It then walks Route B (each
  key's marker goes and the count rises, the padlock goes before the last
  run, the last run wins) and ends in a CHECK summary (21 checks; stills
  and JSON in `page/out/`). `dim_page.mjs <base> [desktop|phone] [seed]`
  (env EXTRA) crops a turnstile's third-arm dim at three clocks;
  `zoom.mjs` and `png.mjs` are its helpers. The dev server is
  `vite.private-cache.config.ts` on 5402 (s3c's wrapper). Hooks:
  `__knotFabric().rules.locks` (mode, keys, locks, held, heldMask,
  total), `__knotFabricRenderer().lockMarkers` and `__knotCutPlucks()`
  (main.ts's last 32 cutPluck calls: eid, the run, then octave, strength
  and sounded).
  GOTCHAS: at 1400x900 the open desktop panel covers the exit's lock run
  on seed 7, so the driver closes it with a real click on `.kp-menu` (the
  state persists in localStorage `knotmaze.panelOpen`; the root has
  `kp-open` while it is open). The HUD's stat rows are `#maze-hud`'s own
  `.k` / `.v` span pairs (`.km-rows` belongs to the banners). A refused
  run is not in `__knotFabric().choices`, so aim at it through
  `runPoint` and `cutPick`.

- K793 (2026-10-21), the panel search: `window.__knotPanelSearch()`
  returns the search's state (`PanelSearchState` in
  `src/ui/panel_search_ui.ts`): `query`, `active`, `rows` (rows indexed,
  228 on 2026-10-21), `count` and `shown` (rows the search shows, mode
  hiding applied, in panel order), `best` (what Enter goes to),
  `folders` (title -> expanded, shown), `hints` and `marks` (by row id,
  what is on screen) and `status` (the live region's text).
  `.claude/probes/K793/search_probe.mjs <base> desktop|phone|both` (run
  from the checkout, on `?k111&am=instant&snd=none`; headed and
  off-screen, a fresh profile deleted after; stills and
  `desk_report.json` / `phone_report.json` in `out/`) types real keys
  into the box: matches and marks, a tag hint, mode-hidden rows never
  shown, folders opened and restored, collapse and expand all, Escape
  twice, Enter, the x, a panel close and reopen, no param or link
  change, game keys not reaching the game (30 checks desktop, 33 phone).
  Env `TAG_QUERY` / `TAG_ROW` pick the tag-hint case. Its dev server is
  `vite.private-cache.config.ts` (s3c's wrapper) on 5410-5413.

## Census and diagnosis rules

- *From P3.38 (the pull-outward merge), lesson:* LESSON: the
  "same artifact" reported across N fixes was at least THREE render
  classes (fill-cap abutment at twist flips, taut-chord stacked
  twists, and this neighbor-gap repaint) plus one physics class
  (world collapse) - a merge on screen underdetermines its
  mechanism; find the exact broken STRUCTURE (which crossing, which
  fill, which erase) before choosing the class.

- *From P3.37 (twist collapse during a held grab), the probe:* Probe: `probe_hold.mjs` (archive, now reports
  pairDist/arcs/ctrlGaps), captures at dsf >= 1.5 with small clips
  (dsf-1 hid this artifact for a whole session).

- *From P3.34, lesson:* LESSON, twice paid this session: a
  census that only measures PAIRS certifies single-thread artifacts
  as healthy; and "exactly the same after the fix" means the
  diagnosis class is wrong, not the tuning.

- *From P3.28, probe rule:* Probe rule (twice burned):
  verify AT REST **after a small tug**, not just fresh settles or long
  play sessions - the three states fail differently.

- *From P3.27 (fat-thread penetration), probe rule:* Probe
  rule: verify the POST-PLAY state, not just fresh settles - and
  separate "physics penetration" (pairs without depth separation) from
  "renderer failure" (depth-separated pairs drawn uncut) before fixing
  either.

- *From P3.19/P3.20 (stuck-crossing feel), the retracted claim and its probe rule:* RETRACTED (P3.21): the "woven fabric co-motion" claim was a MEASUREMENT
  ARTIFACT — the sweep probe sampled reference points at fixed offsets
  from the SLIDING binding ctrl, conflating binding slide with material
  motion. With fixed material coordinates, swept-through material returns
  to within 0.06–0.09 of start after release: the crossings genuinely
  let material through. Probe rule: reference points must be FIXED
  material ctrls captured before the gesture. `ParticleSystem.slideStats`
  + `window.__knotPoint(chain, ctrl)` are the diagnostics.

- *From P3.20 (the cp toggle), why it went:* It was removed rather than kept as a toggle because
  a lingering `cp=0` in a live tab's URL silently poisons every later
  evaluation (Vite reloads preserve query params).

## Where the rest of the probe lore lives

K173 (2026-10-14) moved each topic to a file that attaches only with the
files it is about; `docs/lore_index.md` lists every rules file and its paths.
- `probes-census.md`: the pixel census and the census and scanner rules (`scripts/diag_scan.mjs`, `scripts/fold_census.*`)
- `probes-phone.md`: the phone pass (K156) and phone gate probes (K79)
- `probes-pluck.md`: K77's pluck profile probes, K279's pluck emphasis probes, K344's pluck cusp probes, K395's pluck loop tip probes

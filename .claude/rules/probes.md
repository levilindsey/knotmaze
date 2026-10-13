---
paths:
  - "scripts/**"
  - ".claude/probes/**"
---

# Probe and verification lore

How to probe and verify Knotmaze, moved verbatim from CLAUDE.md by K45
(2026-10-12). A passage taken from inside a longer entry is labeled
with its source; the narrative is in `docs/history.md`. Elsewhere:

- CLAUDE.md's Verification rule: never `--virtual-time-budget` for
  anything physics-dependent; use `scripts/diag_screenshot.mjs`.
- `physics.md`: the vite-node harness that reproduces the browser's
  physics exactly (KINK EYES, PROBE LORE), why a hold probe must move
  past the tug slop first (K41's PROBE LORE), the off-screen headed
  window (P3.23) and the K63 sleep-window harness.
- `render-gaps.md`: G1's census baselines and the slot-clearing
  attribution it used.

## PROBE LORE

PROBE LORE (2026-10-12, K56): **a bare URL is TODAY'S DAILY** - fabric
mode with music, the trace + burn intro, the daily's HUD title, and a
SAVED ATTEMPT that the next bare load restores (a probe profile that
played once is no longer fresh). Probes that want a fresh default
design must pass a query (`?am=instant`: a random seed; `?<seed>.J`: a
given one, at codec v4's defaults); `?daily&am=instant` is NOT a daily any more (am is not a
preference) - daily probes wait out the intro (probe_daily.mjs
waitReady). Probes that want knot mode pass `mf=0`, and probes that need
a settled first frame without a reveal pass `am=instant` - as legacy
links (`?s=1471kin&am=instant`, still parsed) or after a compact token
(`?1471kin.<blob>&am=instant`). COMPACT LINKS: the app rewrites every link to one token, so
`location.search` has no keys to read - read settings via
`window.__knotParams()`. AUDIO IS GATED on a trusted user
gesture: a probe that expects sound must `page.mouse.click` (or press a
key) first, and `window.__knotSynth` exists only once the gate has opened
(scripts/diag_audio.mjs injects an OfflineAudioContext, which bypasses it).

PROBE LORE (2026-10-13, K83): **a same-state A/B needs every clock
pinned, and since G2 the paint clock lives in `advanceClocks()`** - a
probe that only overrides `tickPaint` (the older recipe below) still
animates the pulses, and master-vs-branch differed along every choice
arm. Pin `r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn =
0`. Under fog, three more: the fog-fit camera eases for over a second
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
master is 0 px (under fog + mist, 76 px of dither). Recipe:
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

PROBE LORE (2026-10-11, per-pixel gaps): an IMPLEMENTATION-INDEPENDENT
pixel census (score the final frame against ideal casing geometry per
under-ribbon lane, connected to the crossing core) is what made the
erase grid and the shader comparable - but its "merge" also counts
intended behavior (the near-joint clearance narrowing, webs over casing
bands), and its "overcut" cannot know a spec it does not model (protect
intervals waive margin on purpose): attribute with page-side toggles and
count DARKER vs LIGHTER changed pixels before reading a count as a
failure (protect: 25820 px lighter, 0 darker). Census totals of two
captures of one frozen state also moved by a few hundred px in
directions a lighten-only toggle cannot cause (overcut UP with protect
on) - not understood; the pixel diff is the exact measure. A blend that must be
inert somewhere needs a PROOF BY PIXEL (probe_smin: same state, blend
on/off, every changed pixel tested on the CPU against the shader's own
condition) - it caught padding segments whose raw indices escaped the
far pass's skip range, so a polyline's own end read as a second branch.
A same-state A/B also needs the PHYSICS frozen when the knot does not
sleep (`__knotPS().step = () => {}`): freezing flow and paint is not
enough - on an awake URL the smooth-min proof read 486 of 500 changed
pixels as unjustified, all of them motion between the two shots.
Census "overcut" at one crossing is attributed exactly by clearing slots
one at a time in the frozen state (probe_overcut_attr: which slot frees
the pixels) - its per-crossing ideal stops the over polyline at half
the neighbor gap, the renderer at NB_CLEAR 0.8.
DRAW-ORDER REVERSAL attributes uncovered ribbon overlap: re-render one
state with the base chains drawn in reverse; every changed pixel is an
overlap no overlay covers (probe_tipab TOGGLE=reverse - it found the
tucked-cap corners). Fabric A/B crops need the PAINT CLOCK PINNED
(`renderer.paintClock = 100`) and the pointer parked off the maze. And
an off-screen probe window can STALL: on 2026-10-11 the desktop's
displays spanned x -1920..1920, the window at 2200,50 lay beyond every
display, Chrome's occlusion tracking treated it as hidden and stopped
its rAF, and probes hung waiting for sleep. Launch with
`--disable-features=CalculateNativeWinOcclusion
--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`.

PROBE LORE, same round: the renderer resets every fill/erase mesh's
`visible` each frame (hide with `renderable = false`, or per layer);
the custom section shader ignores `mesh.tint` (tint attribution only
works on default-shader meshes such as erases); and the URL-state
rewrite drops `#hash` on load (pass probe args through page.evaluate).
Three "no effect" toggles in a row meant the probe, not the renderer.

## Probe gotchas, hooks and tooling

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

- *From COMPACT LINKS, probe URLs:* PROBE GOTCHA: `?<seed>&am=instant`
  and `?s=<seed>&...` probe URLs are v1 links (junctionBlend 0, not the
  current 0.88): write `?<seed>.J&...` for current defaults (v4, since
  K73 on 2026-10-12). Older all-default tokens still parse with their own
  version's defaults: `.c` is v3 (trailLength 5, not 10), `.U` is v2
  (pluckSize 1 too).

- *From RENDER-ONLY PLUCKS, probe hooks:* Probe hooks:
  __knotPluck, __knotPluckState, __knotPerf, __knotSetPhysics,
  __knotSetPhysicsParam, __knotReplay. PROBE GOTCHA: a legacy `seed=`
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
  re-optimized the shared `.vite` deps under other servers.

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
  follow camera eases slowly while the knot settles (the spring advances
  at most 0.05 s per frame): wait for `__knotView()` to hold still before
  tapping a choice's screen point.

## Census and diagnosis rules

- *From the open artifact queue (2026-10-11), census lore:* Census lore from
  the hunt: probe_bites' "third-thread bites" (erases cutting a joint's
  bridge beside the crossing, 61/63/78 at the ring URL) are real in the
  BASE layer but covered by webs in the final image; a rescue-patch
  repaint was built, measured, and DISCARDED (it drew faint edge lines
  and fixed nothing visible). Self-crossing censuses must restrict
  "the over thread" to the over PASS's local ribbon (a shared chain
  matches the under pass too); tight kink loops still confound it.

- *From P3.40 (gap shapes at loop-end twists), probe lore and recipes:* PROBE LORE: `window.__knotRenderer()` now exposes the renderer -
  tinting `underErases[i]` by index (emergent white) attributes WHICH
  primitive draws a wrong pixel; this cracked in one capture what
  three blind fixes missed. Session probe scripts die with the
  scratchpad - recipes: gesture battery = hold pair midpoint 6s /
  pull perp 0.5 + hold / grab 0.7 past pair, pull perp 1.2, release;
  sweep = 8 seeds x fat/default, expect "asleep" by wall 18s.

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

- *From P3.36, diag_scan:* diag_scan: a long erase whose over-patch out-spans it is a COVERED
  long crossing, healthy - only uncovered spans are flagged.

- *From P3.34, lesson:* LESSON, twice paid this session: a
  census that only measures PAIRS certifies single-thread artifacts
  as healthy; and "exactly the same after the fix" means the
  diagnosis class is wrong, not the tuning.

- *From P3.32 (post-play riders), the census rule:* The
  P3.30 ramp zeroed the floor by sin 0.55 on the assumption that
  2D-close pairs in the 0.35-0.55 band are crossing-adjacent and
  render - true at rest, FALSE for tunneled tangles from violent play
  (renderability census: 23-27 unrenderable riders mid-churn, NONE
  sharing a registered crossing; the P3.30 census only counted
  sin < 0.35 and missed the class; my P3.31 census classified pairs
  with the force pass's own coverage rule and so could not see
  coverage leaks either - A CENSUS MUST MEASURE RENDERABILITY, i.e.
  erase-reach coverage, never the force rule under test).

- *From P3.28, probe rule:* Probe rule (twice burned):
  verify AT REST **after a small tug**, not just fresh settles or long
  play sessions - the three states fail differently.

- *From P3.27 (fat-thread penetration), probe rule:* Probe
  rule: verify the POST-PLAY state, not just fresh settles - and
  separate "physics penetration" (pairs without depth separation) from
  "renderer failure" (depth-separated pairs drawn uncut) before fixing
  either.

- *From P3.24 (sink-through), probe rule:* Probe rule: census scripts must
  replicate the force pass's zone lookup exactly or they lie.

- *From P3.19/P3.20 (stuck-crossing feel), the retracted claim and its probe rule:* RETRACTED (P3.21): the "woven fabric co-motion" claim was a MEASUREMENT
  ARTIFACT — the sweep probe sampled reference points at fixed offsets
  from the SLIDING binding ctrl, conflating binding slide with material
  motion. With fixed material coordinates, swept-through material returns
  to within 0.06–0.09 of start after release: the crossings genuinely
  let material through. Probe rule: reference points must be FIXED
  material ctrls captured before the gesture. `ParticleSystem.slideStats`
  + `window.__knotPoint(chain, ctrl)` are the diagnostics.

- *From P3.21 (giant gaps at loop-end twists), the scanner lesson:* The scanner's BIG-GAP threshold sat
  at 1.3 and certified the bug as healthy through two "clean" audits —
  now 0.85. Lesson: a scanner threshold chosen without a perceptual
  reference is a rubber stamp; calibrate against what the worst healthy
  case SHOULD be.

- *From P3.20 (the cp toggle), why it went:* It was removed rather than kept as a toggle because
  a lingering `cp=0` in a live tab's URL silently poisons every later
  evaluation (Vite reloads preserve query params).

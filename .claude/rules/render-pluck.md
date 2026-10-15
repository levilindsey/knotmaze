---
paths:
  - "src/render/pluck_overlay.ts"
  - "src/render/pluck_model.ts"
  - "test/render/pluck_model.test.ts"
  - "src/render/pluck_ripple.ts"
  - "test/physics/tug.test.ts"
---

# Render lore: plucks

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

- *From RENDER-ONLY PLUCKS (2026-10-11), the concave-side cap:* CONCAVE SIDE: the inner swing is capped at 0.9 radius
  minus the thread (5-station circumradius, min over +-2), SLOPE-LIMITED
  along the lobe (CAP_SLOPE 1/world - the raw cap jumped 0.06 -> 0.52 in
  two stations at a tight loop and creased the blur); tight bends keep the
  base intact +-TIGHT_K stations with a ramp (without it, narrowing beside
  the clamped fold cut slivers out of the thread). Tried and REJECTED: a
  symmetric (both-sides) cap - clean eyes zoomed in, but the noisy cap
  carved every hook's outer blur into lumps at normal zoom - and a
  3-station radius (noisier).

## Pluck base collapse (K77)

- ROUNDED BASE COLLAPSE (K77, 2026-10-13; worktree agent). Levi: plucked
  threads showed "somewhat sharp depressions ... too sharp and
  wedge-like", more around curves. CAUSE, attributed by toggles with
  per-station profiles (`.claude/probes/K77/`): during a pluck the visible
  solid edge is max(static base edge h*mul, moving core edge h - |swing|).
  Where the footprint's allow is 1 the raw mask clamp(1 - (pk + 0.02)/h)
  stays under the core. Where allow < 1 it doesn't: the COLLAPSE_RAMP
  footprint ramps, tightAllow beside tight stations (hence "around
  curves"), the visibility fades and the wIn gate. There mul = 1 -
  allow(1 - raw) pokes the base edge out through the translucent fringe;
  narrow allow windows meeting through min() cut V notches and bites, and
  the ends of full-collapse plateaus (long lobes, the knot) cut angled
  beaks. `nocollapse` removed every wedge and `nooverlay` showed them
  crisp, so it is the base collapse alone, not the overlay, caps or nodes.
  Raw profiles reached second differences down to -5.7 K*per^2 (K = 1/h^2,
  per = the base sample spacing).
- FIX (`roundCollapse` in pluck_model, applied at the end of the
  overlay's mask build): a morphological OPENING of the collapse depth
  D = 1 - mask by nested raised-cosine bumps s*cos^2(pi u / 2a(s)),
  a(s) = pi*sqrt(s / 2K), K = 1/(collapseRound*h^2). The result never
  exceeds D (the mask is only raised, and stays 1 wherever raw is 1) and
  its second difference stays >= -K*per^2, so a full pinch ends in an edge
  of curvature radius collapseRound*h. Narrow windows become shallow
  round dips; wide smooth profiles pass unchanged. COLLAPSE_ROUND = 1: in
  the A/B 0.5 left shoulders and 2 erased most of the thinning. K104
  (2026-10-13; Levi: "still a bit too acute") raised it to 1.5: worst
  second difference -0.98 -> -0.66 K on K77's 14 sites, 88% of 1's
  integrated thinning kept, no cliff between 1 and 1.75
  (`.claude/probes/K104/collapse/results.md`). A larger radius also
  widens the full-depth window, pi h sqrt(2 r).
  `PluckOverlay.collapseRound` is a live field, and 0 is the pre-K77 raw
  path, for same-state A/Bs (set it, then mark the active plucks
  needsLayout).
- VERIFIED (same state): fabric's 6 collapsing sites went from raw worst
  -0.97..-5.68 to -0.69..-0.95, the knot's 8 from -1.75..-5.73 to
  -0.46..-0.98; no rounded profile passes -1. Weave checks hold: still 0
  update() calls, only the plucked chain's base fill buffer changes (every
  erase, fill and fillet buffer and the gap slot table byte-identical;
  107 meshes in fabric, 13 in the knot), clear() restores every buffer,
  raw-vs-rounded pixel changes stay inside the raw footprint, and partner
  casing bands are identical raw vs rounded (checked at 3.3x zoom). The
  band pixels that change from before a pluck to mid-pluck are the
  overlay's under-node clip (render-gaps.md G1 PLUCKS), the same in raw
  and rounded; K104's clip fix (casing() = casingWidth/2 + CUT_BIAS,
  8e21538) cut them from 3724 to 196 of 10226 band px (fabric) and 3398
  to 128 of 10463 (knot), every other weave check unchanged. The overlay
  never reads the mask, so the hook blurs of the rejected-cap cases are
  untouched by construction.
- AMPLITUDE FLOOR (44885f3 raised tapAmplitude's floor from 0.45 h to
  0.65 h): it did not create the wedges (raw worst -3.45..-4.15 already at
  0.45 h) but deepened them by up to about 1.4x at floor-bound taps,
  through the SYMPATHETIC lobes. They scale from the pre-cap aTap, while
  the tapped lobe itself is usually clearance-capped (74 of 80 fabric
  taps, 73 of 80 in the knot), so a neighbor can out-swing the lobe that
  was tapped. Rounded profiles stay within the bound at both floors; the
  floor stays 0.65 h.
- NOT the collapse (present with `nocollapse`, and the same raw and
  rounded): a dark spike inside a hook's tight bend (the ribbon's inner
  corner) and a dark X at the center of big knot attack-lobe blurs.

## Still plucks (K104)

- COST (K104 stage 1c, 2026-10-14; the mechanism is render-gaps.md's G1
  entry, the numbers are docs/design/K104.md's stage 1c handoff). Master
  cb532d5 vs 8e21538 at 3200x1800 (RX 6800 XT, ANGLE D3D11), fabric
  `?b.J&am=instant&snd=none&fw=0`, 3 interleaved rounds of 5 strums of 12
  plucks per phase, other agents' probes running. FULL MOTION is unchanged
  within noise (GPU 2.62 -> 2.59 ms/f, pluck-blur 0.024 -> 0.035, layout
  0.34 -> 0.38 ms per pluck, overlay tick 0.47 -> 0.46 ms/f). REDUCED
  MOTION drops the overlay's per-frame CPU (tick 0.44 -> 0.03 ms/f: a
  still pluck is laid out once) and its GPU rises 0.024 -> 0.061 ms/f
  (pluck-still runs gapKeepAt per fragment). THE COMPILE: pluck-still links
  in ~340 ms cold (pluck-blur 36 ms; it carries G1's gap library, as
  section-rgb does at 1.46 s; which part costs the most is not measured).
  `warmStill` builds it the first frame reduced motion is on,
  so a reduced load folds it into the first frame, which already holds
  every link (3.45 -> 3.84 s cold), and a switch mid-session stalls ONE
  frame 317-367 ms. Chrome's program cache keeps it per profile (a reload
  or later switch: 5-8 ms, no long frame), so it recurs only when the still
  shader changes; the first still pluck compiles nothing on either path.
  COLLAPSE_ROUND 1.5 costs roundCollapse ~1.2x (sqrt 1.5) in the synthetic
  worst case (the whole chain at full depth; 8000 samples at 16 per h:
  8.4 -> 10.0 ms per layout) and 0-15% on typical windows; in the page
  refreshCollapse stays ~0.10 ms per call. Probes: `.claude/probes/K104/`
  (cost_probe.mjs, load_reduce_probe.mjs, cost_batch.ps1, cost_table.mjs,
  k77_cost.ts + k77_cost_batch.ps1).

## Pluck params (K180)

- PLUCK PARAMS (K180 stage 1, 2026-10-14; worktree agent; brief
  `docs/design/K180.md`). Levi, on K104's whole-segment pluck: "size:
  idk, let's have a parameter to play with ... crossings along the
  segment: I think I'd like to have a dropdown param to test this. glow:
  again, let's have a dropdown param to test. panel slider: Definitely!"
  Three viewer preferences in Touch & feel, appended to codec v4 at
  101-103 (after K140's 99-100) and listed in DAILY_EXEMPT_KEYS:
  `pluckWhole` (pw, [0, 1.5], default 0.5 = K104's WHOLE_AMP),
  `pluckCrossings` (pcx, through | ride | pinch, default through) and
  `pluckGlow` (pgl, off | instead | with | fallback, default off). The
  defaults are K104's look, pixel for pixel. How W meets NEIGHBORING
  threads stays "overlap" (Levi: "current is good"), not a param. main.ts
  re-syncs all three into `plucks.setWhole(amp, crossings, glow)` every
  frame (as it does the size), so a probe sets them with the link keys,
  never the overlay's fields. The amount and the glow apply to plucks
  started after a change; a crossings change re-lays out live plucks.
- AMOUNT. W0 = pluckWhole x pluckSize x gain x h (`wholeAmplitude`); 0 is
  the pre-K104 pluck bit for bit (no W, no RNG draw for its phase, and
  every crossings option then runs the pre-K104 path, so the panel hides
  the crossings row at 0). MAX 1.5 (PLUCK_WHOLE_MAX: slider and link
  clamp): 3x the default, W0 2.6 h at pluckSize 1.75, about where the
  overlap room (the neighbor's edge + WHOLE_OVERLAP h) binds W in most of
  a fabric, so more would mostly flatten against it; the neighbor search
  keeps K104's radius (it grows only past 2.2).
- CROSSINGS: how W meets the crossings INSIDE its unit (the unit's end
  nodes and hide zones are W's frets under every option). THROUGH
  (K104's look): the soft node cap holds the lobe term alone at interior
  nodes and the sum once at the frets; the lobe never drops under its
  pre-K104 swing and W draws what the cap leaves (throughStation). RIDE:
  the soft node cap holds the SUM at every node, both terms scaled alike
  (fOf), so W follows the lobes' dips. PINCH: ride, and W itself held to
  WHOLE_PINCH 0.3 h at each interior node, rising at NODE_SLOPE past the
  node's foot + COLLAPSE_RAMP (`pinchCap`).
- GLOW (the cue: the unit brightens toward white by up to CUE_WHITE on
  W's sine shape `wsOf` and the pluck's clock, whatever W's amount, so
  instead and with light it at pluckWhole 0 too). OFF; INSTEAD = K104's
  wholeMode "cue" (lobes + cue, no W); WITH = W + cue; FALLBACK = W, plus
  the cue only for a tap whose W cannot show by K104's census criterion
  (drawn peak under SHOW_MIN_H 0.6 h or SHOW_MIN_PX 2 CSS px at the
  current zoom, `pluckShows`). STILL PLUCKS (reduced motion) ignore all
  three: K104's still cue, unchanged.
- THE FALLBACK ESTIMATE (`peakEstimate`, once at pluck time after
  layout(), only under fallback; it reads nothing writeFrame writes): the
  largest DRAWN swing, writeFrame's envelope mirrored in `drawnSwing`
  (pluck_model), at each lobe onset + SHOW_DT (= K104's census PEAK_DT),
  over the stations at least half visible. A later zoom or move does not
  re-decide. Against the census (which measures the drawn swing at the
  same times from the same frozen layout): 100% agreement on every
  design, option and viewport, error 0.000, the cue lit exactly where the
  estimate says. Exact by construction: it validates the mirror, and
  K104's pixel calibration of the criterion ties it to what shows. COST:
  0.79-1.17 ms per fallback tap on the desktop, 1.75 ms with the phone's
  viewport emulated (unlocked, other agents probing: indicative). Lobes
  with the same |k| share an onset, so a Set of times would halve it
  exactly.
- SOUND-ONLY TAPS (skipCore: the tapped span minus hide zones is under
  LOBE_MIN_LEN, i.e. inside junction cores) made no pluck, so fallback
  gave them no cue, though K104's criterion counts them as can't tell
  (21 of 284 fabric taps, 51 of 564 dense). K235 made them SILENT (next
  entry), so the cue-on-the-web idea is moot for taps.
- CENSUS (`.claude/probes/K180/census/`: K104's census per option,
  can't-tell share with sound-only taps, pluckSize 1.75, pluckWhole 0.5;
  fabric `?b.J`, dense `?b.J&gs=24&wd=0.6&brd=0.6`, knot `?7k.J&mf=0`;
  desktop 1400x900, phone 411x753 at 2.625), fabric / dense / knot:
  desktop through 19.7 / 24.3 / 0%, ride the same, pinch 22.2 / 26.1 /
  0%; phone through 26.1 / 42.2 / 0%, ride 26.1 / 93.8 / 0%, pinch 71.1 /
  93.8 / 32.8%; fallback leaves 7.4 / 9.0 / 0% showing nothing on both
  (the sound-only taps, silent since K235; the cue lights 12.3 / 15.2 / 0% desktop, 18.7 /
  33.2 / 0% phone). Ride caps the sum near 1 h, and the phone's dense h
  is 1.73 px, under the 2 px line; pinch takes W from short lobes (the
  knot's, the dense design's). Through, the default, reads best.
- VERIFIED: same-state A/B against master ca7d3e6 (`k180_ab.mjs`, 20
  frames, 6 plucks each): 0 px in all 8 cases (fabric desktop and phone,
  knot, explicit defaults `&pw=0.5&pcx=through&pgl=off` in fabric and
  knot, reduced motion, reduced with pw 1.5 + pinch + with, pluckSize 3).
  Unit tests: pluck_model "pluck params (K180)", the codec pins,
  url_codec, daily_link's exempt set. K79's motion probe 38/38
  (gameplay-motion.md). Sheets (`k180_sheet.mjs`: one frozen state, pinned lobe
  phases, t 0.05 and 0.25 s; crossings, glow, amount, and fallback at a
  can't-show tap): `.claude/probes/K180/sheet/sheet_desktop.png`,
  `sheet_phone.png` (+ .html). Probes there too: census/census.mjs +
  k180_table.mjs + table.md, k79_motion.mjs, png.mjs; builds through
  `scripts/preview.ps1 -Root .claude\probes\K180\builds`.

## No sound in junction cores (K235)

- NO SOUND IN JUNCTION CORES (K235, 2026-10-14; worktree agent; brief
  `docs/design/K235_K239.md`; replaces K180's "sound-only taps"). Levi, on
  K194 call 5.2: "I think nothing makes sense. Do we trigger pluck sounds
  for this? Probably shouldn't." A tap whose pluck is skipped as skipCore
  drew nothing but still played its note (21 of K180's 284 fabric taps, 51
  of 564 dense). It now plays nothing. Every other tap sounds as before.
- HOW. `tapLobes` (pluck_model.ts, pure, tested in pluck_model.test.ts
  "a tap inside a junction core (K235)") is the one place that finds a
  tap's tapped lobe, shared by `PluckOverlay.add()` and the sound decision:
  `core` = the tapped lobe exists but its vibrating length (the span minus
  the hide zones, `vibratingSpan`) is under LOBE_MIN_LEN. `add()` records
  why it returned false in `PluckOverlay.lastSkip` ("core" | "hot" |
  "held" | "other"; `resetSkip()` clears it; the boolean return and
  `stats.skip*` are unchanged), and `tapPluck` (main.ts) resets it, draws
  FIRST, then returns before `synth.pluck` when `!drawn && lastSkip ===
  "core"`. ONLY core silences: a mid-reveal chain, pluckSize 0, a hot or
  held unit and a degenerate lobe (a tapped lobe shorter than LOBE_MIN_LEN
  has no `tapped` and stays `skipOther`) still sound. A side channel
  rather than a new return type, so ribbon_renderer.ts (renderer.pluck
  forwards add()'s boolean) stayed untouched.
- OTHER SOUND PATHS, checked and left alone: a drag's release (endDrag:
  a real tug with its own snap-back visual), auto plucks (random and music
  modes: a note must sound whatever the geometry) and key moves (silent).
  There is no strum path. An auto pluck or a release can still land in a
  core and sound with no overlay.
- VERIFIED (`.claude/probes/K235/k235_taps.mjs <host> <out> <label>
  [cases]`: REAL mouse and touch taps at the middle of every span between
  two crossing nodes, the synth's own pluck counter `__knotSynth().plucks`,
  `&am=instant&snd=manual&fw=0&pgh=0`; fabric `?b.J`, dense `?b.J&gs=24&
  wd=0.6&brd=0.6`, knot `?7k.J&mf=0`). Taps (maze moves, plucks, core) and
  synth sounds, master f5207d1 -> K235: fabric 1400x900 1124 (138, 965,
  21) 986 -> 965; dense 2336 (381, 1904, 51) 1955 -> 1904; fabric phone
  411x753 1124 (166, 937, 21) 958 -> 937; dense phone 2336 (3, 2281, 52)
  2333 -> 2281; knot 832 (0, 832, 0) 832 -> 832. Core taps 1 -> 0 sounds,
  thread taps exactly 1 as before; no tap fell in hot, held, a degenerate
  lobe or no-pluck, so those still-sounding cases never occurred in 7752
  taps. The "miss" taps are maze moves: a press on a choice run next to
  the head is a move (handleFabricTap), and the head or walked length
  moved on all 138 of the desktop fabric's.

## Pluck emphasis (K279)

- PLUCK EMPHASIS (K279 stage 1, 2026-10-14; worktree agent; brief and
  design `docs/design/K279.md`). Levi: "I want to make plucks
  visualizations more emphasized. Can we add a new non-physics-based
  shock-wave/ripple sort of undulation sort of effect around pluck
  points? This should be made more subtle around autoplucks than player
  plucks. Also, I wonder if there is something else more we can do to
  show the plucked segment vibrating. Maybe add a bit of the
  physics-based tug to it as well, and also increase the default visual
  vibration effect?" Stage 1 built prototypes behind viewer preferences
  (keys, ranges and defaults: gameplay-links.md's PLUCK EMPHASIS PARAMS;
  the auto plucks' quieter bus: gameplay-audio.md): a RIPPLE (`prp`,
  `prs`, `pra`), a SHEEN on the swing (`psh`), a TUG (`ptg`, `pta`;
  default 0 since the WAKE COST entry below, 0.3 before) and
  louder vibration defaults (psz 1.75 -> 2, pgh .35 -> .5, pw .5 ->
  .75). Levi picks the looks and numbers in stage 2. NEUTRAL (master's
  look, sound and physics):
  `&prp=off&psh=0&ptg=0&pag=1&psz=1.75&pgh=.35&pw=.5`.
- RIPPLE (`src/render/pluck_ripple.ts`, `PluckRipples`): one pixi Filter
  for the page's life, on main.ts's `root`. `root` holds the fabric's
  under container, the ribbons, the fabric's over container and the
  debug layer, so the wave bends the markers, trail and fog with the
  threads; the backdrop (K21) is outside it. The filter is attached only
  while a ripple lives; its filterArea is the whole screen (resolution
  and antialias "inherit", padding 0). RIPPLE_MAX 8 at once (a ninth
  replaces the oldest). Each lives RIPPLE_LIFE 0.9 s, fades in over 0.06
  s, and its front travels RIPPLE_RADIUS 3.6 world (ease-out) in a band
  whose half width grows 0.45 -> 0.9 world. World units, so it scales
  with the maze: about 80 CSS px at the fabric default on 1400x900 (22.3
  px/world), smaller on a phone (not measured). LOOKS at strength 1:
  `wave` (default) displaces the picture radially across the band by up
  to RIPPLE_DISP 0.18 world, with a faint crest glint (0.3 of glint's);
  `glint` brightens only the threads, toward white by up to 0.45; `ring`
  lays a white annulus over everything at up to 0.3 alpha. WHO RIPPLES:
  a tap-pluck and a drag release at `prs`; an auto pluck at `pra`, on
  its own delay and only when its overlay drew. Never a K235 core tap
  (tapPluck returns before the ripple and the tug), never under Reduced
  motion, never at `prp=off`. Hooks: `__knotRipple({paused, t})` and
  `__knotPluck`'s `ripple` and `rippleLook` options (probes-pluck.md).
- SHEEN (pluck_overlay.ts, `uPluck.w` = psh, 0 under Reduced motion): a
  vibrating string dwells at its turning points, so a band 0.55 h wide
  at each edge of the swept interval [lo, hi] brightens toward white, by
  up to SHEEN_WHITE 0.6 x psh, faded in by smoothstep(0.3 h, 1.5 h) of
  the swing's width hi - lo: a pluck at rest draws the plain thread. psh
  0 is the pre-K279 shader's output.
- TUG (`ParticleSystem.tug`, main.ts `tugAt`, ribbon_renderer.ts
  `tugSpan`; the exception to "taps touch zero physics" is in
  gameplay-camera.md). A TAP kicks the tapped stretch: a drag release
  already tugs, and an auto pluck tugs only with `pta` (on its delay,
  through setTimeout). `tugSpan(chain, at, TUG_MAX_CTRL 6)` returns the
  stretch between the neighbouring NODES (the arcs of the crossing,
  joint, marker and end centres; at most 6 ctrl each way), with the
  crest at the tap clamped to the middle half of [c0, c1]. It returns
  null only when the tap lies within a node's `hide` (a junction core or
  a marker disc, or exactly on a node) or no particle lies inside
  (ceil(c1) - floor(c0) < 2). `ps.tug(chain, c0, c1, tap, side, amp)`
  moves the slots strictly inside by a sine bump along the thread's
  normal toward `side`, amp = min(1, ptg) x threadWidth, in positions
  AND prev (it starts at rest), never an open chain's end or the grabbed
  particle. tugAt then wakes the solver, the springs bring the stretch
  home and the knot sleeps again. Live physics only, never under Reduced
  motion; ptg 0 touches no physics (bitwise). `test/physics/tug.test.ts`
  pins the motion. THE FOOTPRINT BUG (fixed in 2d905d0): the first
  tugSpan stopped at the nodes' pluck FOOTPRINTS, the stretch the
  overlay may swing, which leaves most spans no particle inside. On
  0f08f68 only spans of L 2.6 and longer tugged (fabric 1 of 4 sites,
  dense 2 of 4, knot 1 of 4; spans of L 1.2-2.1 never did). The
  footprint bounds what the overlay draws; a kick of the material may
  run up to the nodes, where the sine bump falls to 0.
- MEASURED (desktop RX 6800 XT, ANGLE D3D11; `.claude/probes/K279/`).
  NEUTRAL A/B (k279_ab.mjs, same state, master 8ab25d0 vs 0f08f68, 20
  frames and 6 plucks per case): 0 differing px and 0 moved positions
  in all six cases (fabric desktop, knot, fabric on the phone viewport,
  ghost .35, reduced motion, pluckSize 3; `ab2.log`), every pluck
  fired on both builds. B predates the tugSpan fix, which ptg 0 never
  reaches (tugAt returns first). The first run (`ab_forcedtug.log`)
  forced a tug through the hook, which ptg cannot refuse, and fabric
  phone then differed (20357 px), so the harness does see a tug. GPU
  (3200x1800, fabric
  `?b&am=instant&snd=none&fw=0`, ms/frame): a pluck 2.66, with a wave
  3.88 (its pass 0.185 + blit 0.377), glint 3.70, ring 3.90; 8 plucks
  2.74, with 8 waves 3.81. So about +1.1-1.2 ms while any ripple lives,
  nearly independent of the count; CPU unchanged, no context loss. The
  worst frame was 10.3 ms against 5.3-5.9 (probably the filter's first
  frame; not checked). SLEEP after a tugged pluck: every span tugged
  (`.claude/probes/K279/k279_live.mjs` on da1333a: four scripted taps per
  design at spans of L 1.2-2.7 ctrl, then one real click). At pluckTug 0
  nothing stepped and positions stayed bitwise. At 0.3 the peak shift was
  0.12-0.16 world (0.23-0.30 widths), and the knot slept again after
  2.57-2.63 sim-s in every design (knot, fabric, dense fabric at gs 24):
  K63's 2.5 sim-s quiet window plus about 0.1. The cost is WALL time:
  each awake frame stepped pixi's capped 100 ms deltaMS (sim-s per step
  0.096-0.097), so the wake took 27-29 frames over 3.0 s (knot, about
  10 fps), 3.7 s (fabric, 7.5 fps) and 7.1-7.3 s (dense, 3.8 fps) in the
  off-screen probe Chrome; not measured on screen or on the phone. Before
  K279 a tap cost no physics. Real clicks: the knot's and dense's rippled
  and slept again in 2.6 sim-s (2.95 and 7.19 s wall); fabric's drew no
  ripple and no wake, in both runs (timed out at 30 s). DIAGNOSED in the
  follow-up: a mouse press in fabric mode goes to `handleFabricTap`
  first, and a press on a choosable run moves the player and returns, so
  nothing plucks; the probe's site was such a run. Not a bug.
  Before the node-to-node fix only spans of L >= 2.6 tugged
  (`live_sleep.log`, 0f08f68).
- WAKE COST (K279 follow-up, 2026-10-14; the table is in
  `docs/design/K279.md`, "Wake follow-up"). `k279_wake.mjs` on 42a1684,
  under the perf lock, in one off-screen window with the occlusion-safe
  flags (1400x900 at DSF 2, CPU idle at 3-5% of 24 cores): from one
  sleeping state per design, a real click (tap at ptg 0.3), a small real
  drag-release and a bare wake() (`__knotSetPhysicsParam` re-setting
  slack), twice each, timed to the next sleep. ASLEEP the window ran
  17-18 ms frames, so it was not throttled. ALL THREE WAKES COST THE
  SAME. The first awake frame steps a normal 17-18 ms (2 substeps, no
  large first dt), but a 1/120 s substep costs 8.2 ms of physics in the
  knot (`?7k&mf=0`, 2592 particles), 10.5 ms in fabric (`?b`, 3011) and
  20-23 ms in dense (gs 24, 5448): at or past the 8.33 ms real-time
  line. Real-time stepping then spirals: dt climbs 17 -> 35 -> 53 -> 71
  -> 89 ms to pixi's 100 ms cap in 2-6 frames, and every frame after
  steps 12 substeps. rAF median 106-122 / 141-142 / 267-319 ms (8-9, 7
  and 3-4 fps), p95 124-125 / 158-160 / 284-374 ms, for 2.8-8.0 s of
  wall per wake. A drag runs as slowly during its own gesture. So the
  tap's slow wake is the physics' real cost at these sizes, not the
  window or a wake-path bug, and `ptg`'s default went back to 0 (a tap
  is render-only again); the panel and `&ptg=` still reach the tug.
  One tap-only cost, ONCE per page: the first tap's first frame spends
  30-36 ms more in pixi's tick than a later tap's (knot 67 vs 31 ms,
  fabric 60 vs 38, dense 104 vs 72) and reaches the cap a frame or two
  sooner. Probably the ripple filter's first compile (not tested).
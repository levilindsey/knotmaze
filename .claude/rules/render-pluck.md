---
paths:
  - "src/render/pluck_overlay.ts"
  - "src/render/pluck_model.ts"
  - "test/render/pluck_model.test.ts"
  - "src/render/pluck_ripple.ts"
  - "test/physics/tug.test.ts"
  - "src/app/input_pointer.ts"
  - "src/app/auto_audio.ts"
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
  `pluckWhole` (pw, [0, 1.5], default 0.5 = K104's WHOLE_AMP; 0.75 since
  K279),
  `pluckCrossings` (pcx, through | ride | pinch, default through) and
  `pluckGlow` (pgl, off | instead | with | fallback, default fallback
  since K194, off before). At K180 the defaults were K104's look, pixel
  for pixel (K279 and K194 have moved some; `&pgl=off` is the K104 glow).
  How W meets NEIGHBORING
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
  wholeMode "cue" (lobes + cue, no W); WITH = W + cue; FALLBACK (the
  default since K194) = W, plus
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
  K104's pixel calibration of the criterion ties it to what shows.
  DEDUPED (K194, 2026-10-20): lobes with the same |k| share an onset, so
  `peakTimes` keeps ONE time per distinct onset + SHOW_DT (a Set) and the
  pure `peakEstimateOf` maxes over those: the same value bit for bit (a
  max cannot see a repeated time; 0 mismatches over 380 taps). COST per
  fallback tap, before -> after, under the perf lock, steady = the mean
  of repeated calls on one tap (`performance.now` is quantized to 0.1 ms,
  so one call reads in tenths), median / p95 / max: desktop fabric 0.175
  / 1.05 / 2.05 -> 0.113 / 0.42 / 0.47 ms, desktop knot 0.33 / 0.46 /
  0.56 -> 0.14 / 0.22 / 0.24; Pixel fabric 0.24 / 1.41 / 1.57 -> 0.11 /
  0.41 / 0.46, Pixel knot 0.31 / 0.43 / 0.55 -> 0.16 / 0.25 / 0.30; a
  music run's auto plucks 0.1 ms median either way, p95 0.6-0.7 ->
  0.2-0.3, max 1.4 -> 0.5 (`.claude/probes/K194/`, the handoff in
  `docs/design/K194_defaults.md`). K180's 0.79-1.17 ms and 1.75 ms were
  taken unlocked beside other probes. What is left is `Math.exp` per
  station per time, hoistable per lobe per time if it ever matters.
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
  of 564 dense). It now plays nothing. Every other tap sounds as before
  (since K459's follow-up, only when its pluck draws: the K459 entry).
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
- OTHER SOUND PATHS, checked at K235 and left alone then: a drag's
  release (endDrag: a real tug with its own snap-back visual), auto
  plucks (random and music modes: a note must sound whatever the geometry)
  and key moves (silent). There is no strum path. K244 (2026-10-20, the
  "Nothing plucks a junction core" entry below) closed the first two: an
  auto pluck and a release no longer land in a core or sound there.
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
  while a live ripple's disc (front + REACH_BANDS 3 bands) reaches the
  screen (stage 2's cull: a disc wholly off-screen changes no pixel);
  its filterArea is the whole screen (resolution and antialias
  "inherit", padding 0; why not the discs: STAGE 2 below). `warm(stage)`,
  main.ts's one call once the stage is built, links the program and
  pools the filter's texture at load. RIPPLE_MAX 8 at once (a ninth
  replaces the oldest). Each lives RIPPLE_LIFE 0.9 s, fades in over 0.06
  s, and its front travels RIPPLE_RADIUS 3.6 world (ease-out) in a band
  whose half width grows 0.45 -> 0.9 world. World units, so it scales
  with the maze: about 80 CSS px at the fabric default on 1400x900 (22.3
  px/world) but 32 CSS px (5.6 mm) at a phone's default (8.8-9.0
  px/world), so since stage 2 RIPPLE_FLOOR_CSS 56 scales the whole
  ripple up below that (STAGE 2 below). LOOKS at strength 1:
  `wave` displaces the picture radially across the band by up
  to RIPPLE_DISP 0.18 world, with a faint crest glint (0.3 of glint's);
  `glint` (the default since stage 2, Levi's K288 pick; wave before)
  brightens only the threads, toward white by up to 0.45; `ring`
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
  pins the motion. THE FOOTPRINT BUG (fixed before stage 1 landed as
  50c1aab): the first tugSpan stopped at the nodes' pluck FOOTPRINTS,
  the stretch the overlay may swing, which leaves most spans no particle
  inside. Before the fix only spans of L 2.6 and longer tugged (fabric 1 of 4 sites,
  dense 2 of 4, knot 1 of 4; spans of L 1.2-2.1 never did). The
  footprint bounds what the overlay draws; a kick of the material may
  run up to the nodes, where the sine bump falls to 0.
- MEASURED (desktop RX 6800 XT, ANGLE D3D11; `.claude/probes/K279/`).
  NEUTRAL A/B (k279_ab.mjs, same state, master 8ab25d0 vs stage 1
  (50c1aab), 20
  frames and 6 plucks per case): 0 differing px and 0 moved positions
  in all six cases (fabric desktop, knot, fabric on the phone viewport,
  ghost .35, reduced motion, pluckSize 3; `ab2.log`), every pluck
  fired on both builds. B was built before the tugSpan fix, which ptg 0 never
  reaches (tugAt returns first). The first run (`ab_forcedtug.log`)
  forced a tug through the hook, which ptg cannot refuse, and fabric
  phone then differed (20357 px), so the harness does see a tug. GPU
  (3200x1800, fabric
  `?b&am=instant&snd=none&fw=0`, ms/frame): a pluck 2.66, with a wave
  3.88 (its pass 0.185 + blit 0.377), glint 3.70, ring 3.90; 8 plucks
  2.74, with 8 waves 3.81. So about +1.1-1.2 ms while any ripple lives,
  nearly independent of the count; CPU unchanged, no context loss. The
  worst frame was 10.3 ms against 5.3-5.9 (not attributed: stage 2's
  bursts saw 9.5-10.7 ms against 4.2-5.1 in every ripple phase on both
  builds, warm-up or not). SLEEP after a tugged pluck: every span tugged
  (`.claude/probes/K279/k279_live.mjs` on 50c1aab: four scripted taps per
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
  (`live_sleep.log`).
- WAKE COST (K279 follow-up, 2026-10-14; the table is in
  `docs/design/K279.md`, "Wake follow-up"). `k279_wake.mjs` on 50c1aab,
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
  sooner. It was the ripple filter's first use, gone since stage 2's
  warm-up (next entry).
- STAGE 2 (K279 stage 2, 2026-10-15; worktree agent; brief and handoff
  in `docs/design/K279.md`). Glint is the default ripple (Levi's K288
  pick). THE FILTER'S AREA STAYS THE SCREEN: pixi 8.19 draws a filtered
  container's children ONLY into the filter's texture, which covers the
  filterArea, so an area bounded to the live discs clips every thread
  outside them. Also rejected: replaying `root` into a disc-sized
  texture (a second draw of the world each frame), sampling the back
  buffer (it holds the backdrop, so glint would lose its content alpha)
  and an overlay (ring only). Kept: the whole screen, plus the CULL
  (`discOnScreen`, 1 px of slack). COST (k279_live.mjs burst, 3200x1800,
  `?7`, GPU ms/frame, master 9b977d8 vs f41de80, fabric / knot): 8
  plucks 2.69 / 2.28 vs 2.56 / 2.34; with 8 glints 4.06 / 3.73 vs 4.12 /
  3.58; with 8 waves 3.98 / 3.46 vs 4.47 / 3.86; 1 pluck + 1 glint 3.53 /
  3.17 vs 3.66 / 3.20. The ripple pass takes 0.18-0.19 ms for one ripple
  and 0.60-0.62 for eight (the shader loops over the live ripples), the
  blit 0.34-0.42.
  So an on-screen ripple costs what it did, +1.0-1.5 ms while any lives.
  The branch's wave phase read +0.4-0.5 ms in both designs, outside the
  ripple's own draws (one run per build, lobe phases not pinned: not
  separated from noise). WARM-UP (`warm()`): an EMPTY box on the stage
  under a copy of the filter (the same GlProgram, by source; uCount 0)
  with a screen-sized filterArea, for WARM_FRAMES 3 ticks: pixi links
  the program and pools a screen-sized MSAA texture, keyed as the first
  ripple's. The box's input is transparent and the shader returns it
  unchanged. The cost: that pooled texture is held from load (3200x1800
  takes a 4096x2048 one), and a resize before the first ripple allocates
  again. FIRST TAP (k279_firsttap.mjs: fresh profile, 1400x900 at DSF 2,
  four real clicks, ms of rAF callbacks over the tap's first 10 frames;
  knot / fabric / dense): master glint 113 / 116 / 206 against ripple off
  80 / 100 / 181; branch glint 85 / 102 / 184 against off 81 / 112 / 181.
  The ripple's first-use share (15-33 ms; tap 1 varies about 10 ms
  between fresh runs) is gone. Left on both builds,
  ripple or not: one frame interval of 35-54 ms among tap 1's first
  five, against 18 ms on later taps (dense 18-36: its frames often take
  two vsyncs). Not attributed; the pluck overlay's first draw and
  first-event JIT are candidates. PHONE SIZE (k279_phone_size.mjs on
  f41de80, before the floor; the Pixel 11's 411x753 at DSF 2.625
  emulated on the desktop): 8.8-9.0 CSS px/world, thread 4.6 CSS px,
  front at the end 32 CSS px = 5.6 mm, band half 4 -> 8 CSS px; glint's
  footprint (p50 of the changed pixels' distance from the site) follows
  just outside the front: 23 CSS px at t 0.25 s (front 20), 32 at 0.5 s
  (front 29). Desktop 1400x900: 22 px/world, front 80 CSS px.
  FLOOR (`RIPPLE_FLOOR_CSS` 56): below it one factor scales the front,
  the band and the wave's bend, and so the reach and the cull; it is
  exactly 1 at and above the floor, so a default desktop view writes
  bit-for-bit the uniforms it did. Why 56: the desktop ripple's visual
  angle (80 CSS px of about 0.25 mm at about 60 cm; a phone CSS px is
  0.177 mm at about 30 cm, about 1.4x the angle), and the front gets 5
  mm from the tap, out from under a fingertip, at 0.19 s and 63%
  strength (unfloored: 0.47 s and 23%); it ends at 9.9 mm. Not seen on
  the phone yet; 68 is the upper candidate. WAVE A/B
  (k279_ab2.mjs, `&prp=wave`, same state, master vs f41de80): 0 px on
  the daily, `?7` knot and the kink loop (11-14 frames each, plucks 4/4),
  and on 13 of `?7` fabric's 14. The 14th (`oz_far`: zoomed to 176
  px/world, the far ripple 5.5 world off-screen) differs by 112,741 px,
  exactly master's own oz_far-vs-no-ripple diff: master still filters,
  the branch culls, and its frame equals its no-ripple frame. Those
  pixels are not at a disc's edge: 103,058 at |d| 1 (the filter pass's
  8-bit rounding) and 9,535 at |d| >= 4 (36-46 levels) over 305 of 504
  100-px cells, single thread-edge AA pixels where one MSAA sample of
  four flips, since the filter draws the world again into its own MSAA
  texture (`ab2_where.mjs`). Every ripple frame differs so from its
  no-ripple frame, on both builds.

## Pluck cusp (K344)

- REPORT (Levi, 2026-10-14): "a sharp discontinuous cusp with the
  vibration effect on this loop along the bottom of the loop" at
  `?qoietk.KIiHgRRXwRlRt8fGrST4sf`, crossing 104: chain 21 over itself at
  ctrl 102 and under at 110.205. The plucked lobe runs from that over
  pass to that under pass (arc 58.77 to 62.62, 3.86 long).
- CAUSE, OBSERVED: with the overlay's under-node clip off (every clipF
  reach zeroed, same frozen page), a long straight cut through the blur
  along the loop's lower left and bottom, ending in a sharp corner, was
  gone and nothing else changed (`nocap` changed only the eye). The clip
  line of an under node is its partner's position and tangent at the
  crossing, written into every station of the lobe, and `clipAt` hides
  what lies within a casing of that line out to its reach (1.5). On a
  self-crossing the partner is the chain's OWN over pass, which is where
  the lobe starts, so the clip cut the loop's own blur in a straight band
  two casings wide. INFERRED: that cut is the cusp Levi saw (his
  screenshot was not available; it is the only straight, sharp-cornered
  edge in the loop's blur). RULED OUT: a fold past the evolute (measured:
  no tight station in the lobe, and a 0.05 radius was a 3-point curvature
  artifact); the span's ends and the collapse (the clip toggle alone
  removes the whole cut).
- RULE (the overlay's form of G1's same-chain arc exclusion,
  render-gaps.md): an under node's clip acts on its own under pass only.
  pluckNodes tags a self-crossing's under node with its over pass's arc
  (`selfArc`), and the clip's weight falls from 1 to 0 by G1's split,
  max(0.12, half the arc to that over pass less 0.08), through a
  smoothstep over min(0.3, half the split) (`selfPassAhead`,
  `underClipWeight` in pluck_model.ts; written in layout(), not per
  frame). A foreign crossing keeps weight 1 and the shader returns
  `clipAt` exactly. aClipF is a vec4 (reachA, reachB, wA, wB); the shader
  text changed, so the pluck-blur program compiles cold once per player
  (K307), with no new program.
- CHECK: the unit test "under-node clip on a self-crossing (K344)"
  (`clipKeep` mirrors the shader's clip; with the weight forced to 1, as
  before the fix, "never hides the loop's own over pass" fails with
  45266 hidden samples). In the browser, `.claude/probes/K344/sheet.mjs`
  shoots one frozen page as built and with every weight forced to 1. The
  forced shots equal the pre-fix build's to the pixel (`xcmp.mjs`: 0 px
  on 15 shots), and the fixed ones differ only where the cut was (in
  the diff panels viewed): Levi's
  loop 6.0-6.2k px at the default zoom, 65-67k at zoom step 2, 16-20k at
  step 1 over every knob end and look; three more kink loops of his
  design 5.7-6.2k; `?7` two of ten loops (1955 and 414 px); crossings
  with other chains, big loops (their weight stays 1), knot mode and
  the fat-thread loops tried 0 px.
- NOT FIXED, unchanged by the fix: a dark three-armed star in a kink
  loop's eye (the uncovered middle; `nocap` shrinks it to a thin Y);
  staircase concentric bands across the wide outer blur when zoomed in;
  and, at a crossing with another chain, the clip's straight line
  against a curving over thread. Zoomed in, that leaves a thin
  straight-edged sliver of blur on top of the over thread (removed with
  every clip reach zeroed: `.claude/probes/K344/out/nc/z2_nc_crop2.png`
  and `z2_nc_diff2.png`).
  The general fix would follow the over thread's curve (an arc instead
  of a line) or draw the over passes above the blur.

## Pluck loop tip (K395)

- REPORT (Levi, 2026-10-15, Pixel 11 Chrome, live 12709e5, Free play):
  "Pluck cusps still have a bit of weirdness in loops. It seems like
  there is a bit of discontinuity with the vibration effect at times from
  the middle of the loop tip to an edge, and there is still a bit of
  jagged pinching at the tip with the vibration effect--in this case it
  seems to not be somewhat heart shaped, with a pointy protrusion on the
  inside of the loop and a dimple on the outside". His screenshot: a
  kink loop's blur shaped like a heart, a V pointing into the eye at the
  middle of the tip. Brief and handoff: `docs/design/K395_pluck_loop_tip.md`.
- CAUSE, OBSERVED (toggles on one frozen page, `.claude/probes/K395/`):
  the V is the CONCAVE-SIDE CAP (`nocap` removes it; the ghost and W
  toggles leave it). The cap is 0.9 x the 5-station circumradius, min
  over +-2, minus the thread. A loop's spline bends most at its control
  points, so the circumradius oscillates with the control spacing (`?7`
  chain 9's loop: 5.6 at the tip between shoulders of 0.38-0.41), the min
  over +-2 makes plateaus, and CAP_SLOPE turns them into straight ramps
  that meet in corners: a triangle at the tip (stations 80-84: 0.083,
  0.153, 0.223, 0.173, 0.103). The strip's inner edge turned by -112 and
  -85 degrees at the apex stations. THE SEAM, OBSERVED at zoom step 3:
  a straight radial streak from the V's apex through the blur's bands
  toward the outer edge, plus a crease down into the eye, both gone with
  the fix (`out/ab_c9z3/`). INFERRED: the apex station's sharp inner edge
  creases the strip's interpolation across its width, and the "dimple on
  the outside" is where the streak meets the outer bands (no separate
  outer dimple was seen). RULED OUT: a screen-size dependence through the
  tap amplitude (tapAmplitude is in world units).
- RULE: after the slope limit, `roundCap` (pluck_model.ts) OPENS each
  lobe run's concave caps the way roundCollapse opens the collapse:
  nested raised-cosine bumps under min(cap, ceil), ceil = the run's
  largest swing + h, so the cap is only LOWERED (the clearance it
  guarantees holds) and its second difference stays >= -per^2 /
  (CAP_ROUND h). CAP_ROUND 1.5, as COLLAPSE_ROUND. A run whose cap never
  binds, and a flat or smooth wide cap, passes unchanged.
  `PluckOverlay.capRound` is live; 0 is the pre-K395 cap (set it, then
  mark the live plucks needsLayout). It also lowers the convex side's
  capR where its ramps near the ceil (by up to 0.15 at chain 9's tip),
  still above every swing of the run, so it binds nowhere there.
- MEASURED (`capan.mjs`, zoom step 4, same state): apex edge turns -112
  -> -0.2 degrees (station 69), -52.6 -> -17.1 (73), -85.3 -> -11.1 (82),
  -54.5 -> +9.5 (91); the tip's cap 0.223 -> 0.101. The unit fixture's
  worst second difference: -0.120 slope-limited, -0.024 at CAP_ROUND
  0.75, -0.012 at 1.5, -0.006 at 3 (`capfix.ts`).
- RESIDUAL: where an rMin plateau meets a rise the opening keeps a valley
  (it only lowers), and the inner edge turns +31..+56 degrees there
  (stations 75, 79, 85, 89): a soft "M" at the tip at zoom step 3, much
  milder than the heart. CAP_ROUND 3 takes those to +19..+42 with a flat
  arch (6 looks like 3) for 0.02-0.03 less inner swing at the tip (a
  decision for Levi). The root is the circumradius's oscillation with
  the control spacing; a smooth envelope of the radius, or a wider rMin
  window, would treat it there.
- CHECK: the unit test "rounded concave cap (K395)" (the slope limit
  alone leaves the V and fails). In the browser, `ttog.mjs` shoots `cr0`
  (capRound 0) against `base` on one frozen page; `capan.mjs` reads a
  DUMP's caps and edge turns per station.
- VERIFIED, same state (`base` vs `cr0`; `out/ab_*`, `pair_*.png` =
  cr0 | base): `?7` chain 9's loop at the phone viewport (zoom steps 3
  and 4) and the desktop, both knob ends (psz 3, pgh 1, pw 1.5, ride,
  wave; psz 0.5, pgh 0, pw 0, pinch, ring) and two kink loops of K344's
  design (3:95, 62:539): the V and the seam are gone in every case. K344's
  dark star in the eye changed shape (an X became a rounded square) and
  remains. K344's link (`?qoietk.KIiHgRRXwRlRt8fGrST4sf`) builds another
  design since later default changes: its chain 21 has no self-crossing
  now. Verified in desktop Chrome only (with the phone's viewport); the
  phone itself is still to check (`phone_run.ps1`; at 08:36 it was
  dozing and locked, and the script never wakes it).

## Pluck frets under the reveal (K397)

- REPORT (Levi, 2026-10-15, K397 issue 4): "Tapping on the end of an
  unexplored stub starts the vibration effect, which can sometimes cause
  more of the thread length to render than it should." His call (K423):
  the vibration stops at the stub's solid end. Brief and handoff:
  `docs/design/K397.md`, stage 2.
- CAUSE (stage 1, observed): K76 2c clips a pluck's unit to the thread
  that SHOWS around the tap (`exploreShownSpan`), fade included, so a
  lobe ran on into the stub's dotted fade, and its blur drew solid
  thread over the dots and past the fade's end (2gozcj f5: out to s 1.06
  of the fade).
- RULE: under the reveal (`explorePieces` on, the chain not whole),
  `pluck()` (ribbon_renderer.ts) clips the unit once more with
  `exploreSolidSpan` (in `ribbon/explore_gaps.ts` since K5 R2): the
  solid piece that holds the tap, else the nearest, grown through any
  piece that meets it. No solid stretch: the
  pluck is sound-only. It passes `fret: true`, and `segmentLobes`
  (pluck_model.ts) then treats the span's ends as HARD FRETS: the tapped
  lobe is cut there and its end at a fret gets node -1 (no hide zone,
  foot or clip); a tap past a fret (in the fade) plucks the lobe just
  inside the nearer end (a closed chain's span takes its nearer copy);
  the pseudo lobe is clipped to the span. `tapLobes` reports a core only
  for a tap inside the span. With the reveal off, or on a whole chain,
  `fret` stays false and the old path runs unchanged.
- THE OVERLAY (pluck_overlay.ts, `PluckRequest.fret`): a fretted tapped
  lobe shorter than LOBE_MIN_LEN is sound-only ("other"); a re-pluck
  matches a lobe with one real key; the per-frame deltas skip a lobe
  only when both keys are < 0; layout keeps a lobe with either key < 0
  at its stored arcs.
- TESTS (pluck_model.test.ts): "fretted (K397): the span's ends cut the
  tapped lobe", "... a tap past a fret (in the fade) plucks the stretch
  inside it" and "... the fret end has no hide zone, and a tap past it
  is never a core".
- MEASURED (`.claude/probes/K397/stage2/pluck_stub.mjs`: 2gozcj after 12
  moves at the phone viewport, one frozen page per build; changed pixels
  at t 0.06 within h + 0.3 of the centerline, binned by s along the stub
  as solid / the fade's first half / its second half / past;
  `out_s2_pluck.log`, `out_s2/pluck/*_sbs.png`). f5's fade tap: 88086 px
  (solid 41218, fade 23651 + 14028, out to s 1.06) -> 42527 (42473 / 21
  / 0 / 0), and the base collapse no longer shrinks the dots (615 -> 0
  px). f12's fade tap plucked a lobe over s 0.22-1.30 of the fade (25810
  + 17200 px there); it now plucks the solid stretch beside the solid
  end, 30254 px (30229 / 25 / 0 / 0). f12's solid tap had 6031 px in the
  fade, now 25. The 17-31 px left in the fade are the AA fringe;
  controls 0 px.
- RESIDUALS: (1) a fretted lobe keeps its stored arcs in layout, so its
  real node end does not follow drift (not measured); (2) a re-pluck
  after the stub grows meets keys [a, b] against [a, -1], so both ring;
  (3) a fade tap's pluck point clamps to BETA_MIN/MAX at the solid end;
  (4) K279's tug (`ptg`, default 0) ignores the reveal. NOT VERIFIED:
  the phone, and a reveal-off pixel A/B (the same path by construction).

## Pluck to the stub's rounded cap (K459)

- REPORT (Levi, 2026-10-15 13:39, phone, `?2gozcj.MgaM`): "it is a bit
  weird to not see the vibration extend all the way to the end of the
  solid thread stub (including the rounded cap)." His call b: "If we
  make a pluck sound, then we should show the pluck effect". Brief and
  handoff: `docs/design/K459.md`.
- MODEL (A, a FREE END): a solid end that ends in the dots' rounded cap
  is free, not K397's hard fret. A string fixed at one end and free at
  the other swings most at its free tip; a fret at the cap's tip (model
  B) would barely move the cap, the part Levi asked to see.
  `freeEndX(x, freeLo, freeHi)` (pluck_model.ts) maps the lobe's shape
  coordinate onto half of a symmetric string (freeHi: 0.5 x; freeLo: 0.5
  + 0.5 x; freeHi wins when both are set), so layout and capClearance
  see the tip as a string's middle. A free lobe ignores the tap's
  position (f5's fade and solid taps draw the same pluck), so K397's
  residual 3 (BETA_MIN/MAX) is moot there.
- WHERE (`pluck()` and `stubCaps`, ribbon_renderer.ts): under the
  reveal and not under reduced motion, an end of the solid span that is
  a piece's FRONTIER end with a fade (tip0/tip1, f > 0), under the dots
  or beacon look (uKExplore look 3 or 5), gets the cap length of
  `kExDotsSd`: 0.5 tw g, g = clamp(lf / (EXPLORE_DOTS_SPAN tw), 1e-3,
  1). The span grows by it, [a0 - freeLo, a1 + freeHi], and
  `PluckRequest.freeLo/freeHi` carry it. Other looks, still plucks and
  other ends keep the hard fret. In the overlay only the TAPPED lobe, at
  a node -1 end, gets `Lobe.freeA/freeB` (sympathetic lobes keep both
  ends fixed), and its beta is 0.5. The extrusion writes the cap
  coordinate q (0 at the solid end, 1 at the tip) to aUV.y, and
  PLUCK_FRAG narrows the thread to h sqrt(1 - vCap²) over it, so the
  blur rounds over the cap; vCap 0 is the old thread exactly.
- A NODE IN THE CAP PINS IT (`pinFreeEnds`, pluck_model.ts; add() runs
  it before tapLobes): an end whose cap stretch ([span0, span0 +
  freeLo] or [span1 - freeHi, span1], eps-inclusive; a closed chain's
  nodes matched a loop away) holds a node goes back to K397's hard fret
  at the solid end (span trimmed, free 0). Found on 2gozcj f12 (chain
  85, open, total 34.222): solid [32.634, 34.222], and freeLo 0.26
  reached 32.374, past a crossing at 32.414. Unpinned, a fade tap's
  lobe was [32.374, 32.414], 0.04 long: it drew nothing and still
  sounded. A solid tap's lobe ran from that node to the end, the node's
  footprints covered it, and its base collapse went 2004 -> 0 px
  (`.claude/probes/K459/diag_free.mjs`, `out_diag_free.log`).
- SILENT WHEN NOTHING DRAWS (call b): a reveal tap with no solid stretch
  (`pluck()`), a fretted tapped lobe under LOBE_MIN_LEN and a fretted
  tap with no tapped lobe now report lastSkip "core", which tapPluck
  silences (K235's channel). Unfretted, a degenerate lobe stays "other"
  and sounds, as K235 left it. STILL SOUNDING with nothing drawn, in
  main.ts (K6-1's file, not touched): "hot" (a chain mid-intro),
  "held", pluckSize 0 and an unfretted degenerate lobe or failed layout
  ("other"), plus, until K244, auto plucks (main.ts's auto path ignored
  lastSkip, by K76 2c's design) and drag releases (by design). FOLLOW-UP
  (the coordinator, 2026-10-15, after the merge): tapPluck plays a tap's
  note only when its pluck drew, so "hot", "held", pluckSize 0 and
  "other" taps are silent too and keep their ripple and tug (a core tap
  has neither). Auto plucks and drag releases were unchanged then; K244
  (2026-10-20) keeps both out of a core (its entry, below), and their
  "hot", "held" and pluckSize 0 cases still sound.
- TESTS (pluck_model.test.ts): "a free end (K459): the stub's lobe
  swings most at its free tip" and "a free end (K459): a node inside the
  cap pins it to the solid end".
- MEASURED (`.claude/probes/K459/pluck_stub.mjs`, K397's probe and bins;
  `out_pluck_after2.log` against
  `.claude/probes/K397/stage2/out_s2_pluck.log`; px as solid / the
  fade's first half / its second half / past). f5 (chain 49, fade 1.145
  world, cap 0.26), fade tap at t 0.06: 42527 px (42473 / 21 / 0 / 0),
  unit s [-1.306, 0] -> 53470 px (44582 / 8170 / 0 / 0), out to s 0.26,
  the cap's tip; at t 0.20 44901 (37593 / 7308 / 0 / 0); the base
  collapse still leaves the dots alone (0 px), controls 0 px. f12, its
  cap pinned by the crossing: fade tap 30254 -> 30252 px, solid tap
  30761 -> 30761, collapse 2004 -> 2003, K397's lobe. Past the tip and
  over the dots: 0 px in every case.
- RESIDUALS: (1) the rounded tip narrows the blur across the thread
  only (no AA along it at the strip's end); (2) a fretted fade tap whose
  nearer lobe is under LOBE_MIN_LEN is now silent, where it could pluck
  the next lobe inward; (3) a cap pinned by a node stays still (K397's
  behavior); (4) K397's residual 2 (a re-pluck after the stub grows)
  holds for a free lobe too. NOT VERIFIED: the phone; a reveal-off
  pixel A/B (unchanged by construction: no fret, no caps); only the
  probe link's default look was measured; the base collapse under a free
  cap (f5's collapse hides 0 px, at pluckSize 3 too, `out_psz3.log`, and
  f12's cap is pinned). The pluck-blur program's text
  changed (render-shaders.md).

## Nothing plucks a junction core (K244)

- NOTHING PLUCKS A JUNCTION CORE (K244, 2026-10-20; worktree agent; brief
  and handoff `docs/design/K244_cores.md`). Levi: "Players shouldn't be
  able to pluck junction cores." K235 silenced a TAP in a core and left
  two sound paths; K244 closes both. Auto plucks (random and music modes)
  choose only a site that would draw, and a drag released in a core plucks
  nothing: no note, no vibration, no ripple, under both pluck styles. The
  drag still ends and the thread still eases home or springs free (physics,
  not a pluck). `tapPluck` is untouched (K235, K459).
- THE PREDICATE (pluck_model.ts, pure): `drawsPluck(TapLobes)` and
  `wouldPluck(nodes, total, closed, tapArc)` are tapLobes' verdict as one
  boolean: a tapped lobe with at least LOBE_MIN_LEN of vibrating arc and
  not a `core`. The core test still lives in `tapLobes` alone.
  `PluckOverlay.siteTester()` asks it of (chain, ctrl) on the LIVE nodes
  (the ctrl becomes an arc through `paintArcAt`, as `renderer.pluck` does:
  a closed chain wraps, an open one clamps). It reads each chain's nodes
  once, because `pluckNodes` walks every crossing per call and the nodes
  move with the knot: make one tester per decision (a pick, a release).
  GEOMETRY ONLY: "hot", "held" and pluckSize 0 are not asked and stay
  sound-only, as K459 left them for auto plucks.
- AUTO PLUCKS (`src/app/auto_pick.ts`, pure and tested; wired by
  `siteResolver()` in auto_audio.ts): `triggerAutoPluck` resolves the
  site BEFORE `synth.pluck` and plays nothing when a segment has none.
  Random mode takes a random segment among those with a site
  (`pickRandomSegment`: PICK_TRIES 12 uniform draws, then an exact
  sweep, so the answer is uniform among the valid ones and exact when few
  are). Music mode asks `segmentsNear(assign, freq, valid)`, which
  returns the valid segments of the nearest pitch class that has any
  (ties to the lower), so the song's true pitch still plays and the
  segment that moves is a valid one; a note with no valid segment
  anywhere is skipped. A fabric segment plucks its run's midpoint, where
  its plucks always landed, else the nearest drawable place outward along
  the run (`nearestValidCtrl`, step 0.5; `audioSegSite` carries the run's
  `c0`/`c1` now); a run that is all core has no site. A knot strand keeps
  its random place along the strand, now a random drawable one
  (`findValidCtrl`: 12 tries, then a 0.25 ctrl sweep). The resolver
  memoizes per decision (one random tick, one music note), so the pick and
  the pluck share one site.
- DRAG RELEASE (input_pointer.ts `endDrag` and `beginRelease(style, freq,
  pluckable)`): `pluckable` is the tester's verdict at the grabbed
  particle's ctrl, the point the old release plucked. False skips
  `synth.pluck`, and the string style then skips the overlay pluck and its
  ripple. The soft style draws no overlay, so the note is its whole gate.
  The verdict is the grabbed particle's, not the press point's: a press at
  a core span's midpoint can grab a particle outside the core, and that
  release plucks (and sounds) there, as what sounds is what draws.
- RESIDUALS: (1) the site is tested when a note is scheduled and drawn up
  to MUSIC_LOOKAHEAD 0.3 s + the output latency later (random mode: the
  latency), so a knot that moves can in principle carry a marginal site
  into a core in between; (2) UNDER THE THREAD REVEAL the overlay clips to
  the solid span with `fret: true` (K397), whose verdict this unfretted
  predicate does not mirror, so a mid-reveal chain can still sound with
  nothing drawn (not exercised: the probes load `am=instant`); (3) "hot",
  "held" and pluckSize 0 plucks stay sound-only for auto plucks and
  releases, by design (the call was cores).
- TESTS: pluck_model.test.ts "would a pluck here draw anything? (K244)"
  (a core, a degenerate lobe, a mid-run site, a closed wrap, an open
  clamp), test/app/auto_pick.test.ts (random and music never choose an
  invalid segment, uniform among the valid, the nearest-pitch fallback,
  the sweep's exactness, a knot's ctrl, a fabric run's outward search) and
  pitch_space.test.ts's two `segmentsNear` filter tests. The release gate
  has no headless test (input_pointer.ts needs the pixi app and a canvas):
  the probe covers it.
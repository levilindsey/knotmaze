---
paths:
  - "src/render/**"
  - "test/render/**"
---

# Render lore

Binding lore for the renderer, moved verbatim from CLAUDE.md by K45
(2026-10-12). A passage taken from inside a longer entry is labeled with
its source; the narrative around it is in `docs/history.md`. Crossing
gaps (G1) have their own file, `render-gaps.md`. The user's standard,
from the P3.39 lessons in `physics.md`: no thread-thread contact
without a dark line, ever. Add new render lore here, not to CLAUDE.md.

## Shader paint (G2) and backgrounds (K21)

- SHADER BACKGROUNDS (K21, 2026-10-12; the commit message holds the
  measurements). `background` (bg=: none | vellum | mist | wash | silk |
  aurora | contours; default VELLUM) + `backgroundIntensity` (bgi=, [0,
  1], default 0.5; 0 = off like none) - render/background*.ts. A
  SCREEN-FIXED layer, the stage's first child: the effect's fragment
  shader fills a LOW-RES RenderTexture (0.34-0.75 texels per CSS px;
  vellum 1 for its grain) only when the drift clock says so (10-15 fps,
  6-10 on phones; static vellum once per change), and a dithered blit
  stretches it over the canvas every frame. Crossing gaps discard (G1),
  so they show it, and still read as gaps over every effect at
  intensity 1. RULES: (1) none (and intensity 0) adds NOTHING to a frame
  - same-state A/B vs master is 0 px; keep it so. (2) Colors = the page
  ink + three gamut accents (the design's own hue/arc/palette), resent
  on every recolor; the seed offsets the noise. (3) FOG = BACKGROUND: with
  an effect on, the fog of war draws the background texture at the
  pixel's screen position (FogBackdrop; the DisplacementFilter wobble is
  folded into the alpha lookup, the dither is the blit's), so fogged
  pixels ARE background pixels - a flat fog read as a flat square. (4)
  K24/K6 HOOK: needsFrame() + tick(dt, sceneActive); the drift pauses
  after 2.5 s of an otherwise still scene (main.ts sceneAnimating()
  stands in for K6's flags) and stops under reduced motion (the Motion
  setting, ui/motion.ts).
  Screen-fixed, not world-anchored: a backdrop at infinity - camera moves
  never drag it or force a re-render, zoom cannot alias it, and the fog
  can sample it. REJECTED: cells (Voronoi seams form a dark network that
  competes with the maze's faces), dither (a screen door that crawls
  under drift), linen (a 4.5 px weave that moires at fractional DPRs).
  LORE: this desktop's probe Chrome reports prefers-reduced-motion:
  reduce only while the session is attached over Remote Desktop (or left
  disconnected after one), and no-preference at the console (K104,
  probes.md), so backgrounds may not drift here - probes emulate
  no-preference; a warp of a warp amplifies its time
  offsets (mist's clock runs at 0.35) and contour lines that move faster
  than ~1 CSS px/s read as crawling; calibrate contrast as the p2-p98
  luma spread of a knot-free margin (about 9-13 levels at 0.5). Cost:
  +0.24-0.34 ms GPU per frame at 3200x1800 (the full-screen pass is most
  of it). Probes: `.claude/probes/K21/`.
  SPEED + VELLUM MOTION (K79, 2026-10-13; the commit messages hold the
  measurements): `backgroundSpeed` (bgs=, codec v4 index 70) defaults to
  AUTO (-1; any negative value, NaN or garbage reads as auto) = each
  effect's own pace; 0 = static, otherwise a multiple of the designed
  drift, clamped to BACKGROUND_SPEED_MAX = 8 (Levi, 2026-10-13: "Max
  backgroundSpeed should be like x8"; stage A shipped 3; the one constant
  feeds the slider, the link clamp and effectiveSpeed). The pass rate does
  not scale with it, so at 8x each texture pass moves the pattern 8x
  further: steppier, not costlier. Clock drift = profile drift x effectiveSpeed (auto
  = the profile's autoSpeed: vellum 0, the rest 1), so auto is
  bit-identical to K21, and the pass rate never scales. configure() zeroes
  the clock on an effect change and when an auto-static effect (vellum)
  returns to auto. VELLUM moves only at a set speed, in its own program
  VELLUM_DRIFT (effectProgram(id, t), t != 0): both mottling octaves
  drift and the vignette's light wanders; fibers and grain stay put. Keep
  TWO programs: one with its time terms zeroed put static vellum 34 px
  off master (1 LSB; the compiler fuses the multiply-adds differently).
  Same-state A/B vs master: 19 cases, 0 px, identical drift clocks. Cost
  at 3200x1800 (dpr 2): the drift pass ~2.1 ms (1 texel per CSS px =
  1600x900, for the grain) at ~10.7/s = 0.37 ms/frame, ~8x mist's pass,
  so the phone gate (K10) comes before vellum moves by default (K52). Vellum at speed 2 changes
  about as fast as aurora at auto. Programs are named bg-<id>
  (bg-vellum-drift), which is how a GPU probe times each one. Probes:
  `.claude/probes/K79/` (run_ab.ps1 + k79_ab.mjs, k79_sheet.mjs,
  k79_dstats.mjs, k79_gpu.mjs).
  SHAPE PARAMS + CUSTOM COLORS (K79 stage B, 2026-10-13; the commit
  messages hold the design notes, the panel side is in `gameplay.md`):
  ten params appended to codec v4, indices 72-81 (K74 stage 1 took 71 for
  deadEndLength first, so these renumbered at their merge; before launch
  nothing keeps a link's meaning, and whichever branch merges second
  renumbers its appends): backgroundScale (bgsz, [0.5, 2], 1),
  backgroundDetail (bgdt, [0, 2], 1), backgroundFibers and backgroundGrain
  (bgfb, bggr, [0, 3], 1), backgroundAngle (bgan, degrees
  counterclockwise from screen right, any negative = AUTO = the seed's
  own direction, -1), backgroundColorMode (bgcm, gamut | custom) and
  backgroundBase / backgroundAccent1-3 (bgc0-bgc3, #rrggbb, defaults
  #151b28 #7ab8cd #cdb17a #aa7acd). What reads what: scale every effect;
  detail mist, wash, silk and contours only (BACKGROUND_DETAIL_EFFECTS:
  vellum and aurora moved 0.4 luma levels at detail 0 and 2 against 1,
  the others 0.9-2.6, so those two keep the designed fbm and no row);
  fibers and grain vellum; angle silk; the colors every effect. None of
  them is daily-exempt, and the dailies stand (DAILY_V1 pins codec v3's
  defaults). SHAPED PROGRAMS: an effect draws with its own K21 /
  stage-A program, byte for byte, until a param IT READS leaves its
  default (needsShapeProgram); then with bg-<id>-x, which reads uShape
  (1 / scale, fbm gain, fibers, grain) and uShape2 (silk's angle). Pixi
  skips group uniforms a program does not declare, so the defaults never
  see them. Two programs per effect, not one: a generalized program does
  not reproduce the bits of the one it generalizes (the VELLUM_DRIFT
  lesson). `test/render/background_shaders.test.ts` pins the default
  sources by sha256 (all seven programs, the blit, the fog, the quad);
  re-pin only after a same-state A/B against the previous build
  (run_ab.ps1 over cases_all.json, then k79b_cases.json: explicit
  defaults, unread params, custom colors in gamut mode, none with shape
  params, fog and knot mode, all 0 px). SCALE zooms about the screen
  center (where the knot hides it): the pattern is evaluated at p / S and
  the drift time at t / S, so a drift crosses the screen at its designed
  CSS px per second at any S (contours 1.04 px/s at S 0.5, 1, 2 and 3 on
  the desktop viewport, 0.475 on the phone's, by cross-correlating two
  frames, before the max came down to 2; the crawl limit is about 1).
  Below 1 the render texture gets
  max(base, min(1, base / S)) texels per CSS px (mist, wash, silk and
  aurora reach 4x the texels at 0.5, contours 1.8x, vellum is at 1
  already): the same sharpness, and no blockiness in the sheets on
  either viewport (1x crops, and gain 4 at 3x zoom on the phone's
  0.6-0.8 texels per CSS px). Above 1 the pattern
  gets sparse and the margins quiet: the background's luma sd fell from
  3.4 to 2.6 (mist), 4.4 to 2.4 (wash) and 2.6 to 1.1 (contours, one or
  two lines on screen) from S 1 to 3. THE MAX IS 2 for that reason (K129,
  Levi 2026-10-13; BACKGROUND_SCALE_MAX, it was 3 through B2). VELLUM's
  mottling scales and its vignette stays on the screen, but its fibers
  grow with S above 1 and never shrink below their designed size (a texel
  per CSS px cannot draw them finer): at S 2-3 they read as long crossing
  hatching, not speckle. K129 kept that floor and cut the max instead
  (Levi left the vellum choice open: "whatever is best"). FBM DETAIL:
  octave gain 0.25 + 0.25 d (0.5 = designed), the sum rescaled to the
  designed fbm's RMS so contrast holds. CUSTOM COLORS: the BASE IS THE
  PAGE - the shaders' ink, the canvas's CSS background and
  `fabric.setFogColor` (so none, intensity 0 and the flat fog show it,
  and the fog still matches the backdrop). Accent 1 feeds uA2 (the
  gamut's middle color, vellum's tint), 2 feeds uA1 and 3 feeds uA3.
  BACKGROUND_ACCENTS_USED lists what each effect reads (vellum 1; silk
  and contours 2 and 3; mist, wash, aurora 1-3), and `k79b_sheet.mjs
  accents` holds it to the pixel (an unread accent changes 0 px).
  COST (stage B2b, 2026-10-13, perf lock held; RX 6800 XT, 3200x1800 =
  1600x900 CSS at dpr 2; k79b_gpu.mjs, a TIME_ELAPSED query per draw, 3
  rounds x 5 s per config on one settled page, so the page ran at 46-51
  fps; ms per pass repeats within ~5%, compare only inside one run): a
  -x program costs what its texels cost. Scale 0.5 quadruples them (mist
  1088x612, wash and aurora 1280x720, silk 1600x900) and the pass 3.9-4.3x:
  mist 0.27 -> 1.04 ms/pass, wash 0.36 -> 1.43, silk 0.34 -> 1.45, aurora
  0.43 -> 1.67 (the worst: x15/s = 0.42 ms per 60 Hz frame against 0.11);
  contours (1.8x the texels) 0.33 -> 0.59 (x10/s = 0.10 against 0.05).
  Scale 2 (the max), detail 2 and silk's angle cost the default's price
  (0.97-1.03x).
  Vellum-x at speed 1 costs the drift program's 2.1 ms/pass (x10/s = 0.35
  ms per frame) at scale 2 or fibers 3 (1.00-1.03x), and half of it at
  fibers 0 + grain 0 (0.99 ms). The blit adds ~0.2 ms (0.19-0.27) every
  frame under any effect, static vellum included; `none` draws nothing.
  These are desktop numbers: the phone's texel scales are 0.3-0.4 per CSS
  px (scale 0.5 doubles them), and the phone gate (B3) measures its cost.
  Full table: docs/design/K79.md, "Stage B2b results".
  Probes (untracked, `.claude/probes/K79/`): k79b_sheet.mjs (the sheets,
  the accent check and the contours crawl; desk or phone viewport),
  k79b_montage.mjs and k79b_bgsd.mjs (crops, contrast by scale),
  k79b_gpu.mjs (GPU ms per program, shape params in the config),
  k79b_smoke.mjs (links, programs, panel rows, custom base and fog; 70
  checks), k79b_k129.mjs (the scale max: links and the real slider; 17
  checks) and k79b_cases.json (the explicit-defaults A/B, 12 cases).

- SHADER PAINT (G2 of the GPU migration, K4; worktree agent, 2026-10-12;
  design, deviations, every measurement: docs/design/G2_shader_paint.md
  section 7). All per-sample and per-tick COLOR runs in the shaders from
  page-lifetime RGBA32F data textures (KSTATIC chains / ctrl index / RUNS,
  KGEOM arc tables per update(), KREVEAL sources, KPAINT paint records)
  and one uniform group whose clocks are reduced on the CPU in float64.
  paint_glsl.ts is the library, paint_math.ts its line-for-line CPU
  mirror (the census reference), paint_const.ts the shared numbers.
  G2.1 reveal + FX per pixel (closed-form ignition, wall ages through
  speed knots, gate SHOW TIMES in the gap slot / joint J1 instead of fade
  clocks); G2.2 section colors from a run table, evaluated per vertex
  (no cache, no drift re-bake; junctionBlend + gamut are uniforms); G2.3
  gameplay paint per pixel from the setPaint declaration (closed-form
  composition - the accent strip is gone; the trail fade is linear, K4).
  Censuses: GPU vs mirror <= 1.2/255 for FX (40 runs), section, paint and
  fans (rest, mid-reveal, after moves). At rest the CPU paint work and its
  uploads are gone (tickPaint 0.13 -> 0.01 ms, 151 -> 0 KB/frame). FANS
  read ARM STRIPS (arm_strip.ts): each arm's composed material rendered
  once per frame into an RGBA8 row (a pixi system's prerender, dirty-
  checked); per-pixel evaluation there cost the phone 60 -> 44 fps (fans
  0.57 -> 1.84 ms GPU); strips: fans 0.59 ms + pass 0.06, phone 60 at rest.
  Web paint edges ramp over the strip step. LORE (details in the doc): a cache must
  key on EVERY input of its solve (gateRev - a style uniform set after the
  first update() froze reveal-only show times); an earliest-arrival choice
  needs a precision-independent tie-break (GPU f32 ctrl flipped junction
  fronts); per-arm field views (uKBase.z 3/4) + census_fan cracked both;
  measure GPU per PROGRAM (gpu_by_program.mjs), not per frame, before
  optimizing; take the perf lock (claude-config sessions.md) and re-run
  numbers taken while other agents' scans ran.

- PULSES BRIGHTEN THE THREAD'S OWN PAINT (K75, 2026-10-12; Levi: trail
  mode's incoming-segment pulses showed "unexpected yellow banding").
  kComposePaint = mix(mix(S, gold, p), white, K_BAND max(v, glow)). The
  retired strip picked a band FAMILY per pulse ARM (onPath: gold -> white,
  else S -> white; trail mode read it at the arm's junction end), and G2.3
  kept that. Full-length crest trains run the arrival run into the trail's
  fade, so every crest edge drew pure gold over the faded thread: the
  mirror stepped up to 109/255 between samples and the GPU matched it (a
  model bug, not a shader divergence). Pre-G2 too (c3ebf11, same state:
  gold crests over the base-colored far end). K4's linear fade widened it,
  because a span's p is linear between its two ends, so the run holding
  the fade start fades from the head junction. ON_PATH, trailGoldAt and
  KPaintState.famB are gone. Gold mode is unchanged (same-state A/B: 0 px
  in 4 phases). In trail mode only band pixels over partial paint change,
  plus the joint web they feed. LORE: a per-ARM family flag is a palette
  coordinate in disguise; compose over the per-PIXEL paint (the
  blend-composed-colors rule below, one level up). Debug view 5
  (uKBase.z): the visible ribbon's (p, pulse v, glow). Probes:
  `.claude/probes/K75/`.

- PULSE REACH (K75, same day; Levi: the junction's pulse highlight should
  "only extend a set distance away from the junction along the segment",
  with a slider, fading out at the end). `pulseReach` (pr=, codec v3 index
  69, default 3, panel [0.5, 15]) is measured in world (= lattice) units
  of ARC from the junction, the unit of pulseSpacing, so every arm of a
  junction lights the same distance. Measuring by each run's lattice
  length, as trailLength does, would light arms of one junction to
  different world distances. uKReach = (reach, fade) windows kPulseV:
  1 - smoothstep over the last PULSE_REACH_FADE 1.0 (at most half the
  reach). A FIXED fade length, because a share of the reach dimmed a long
  reach's crests over its whole second half. Hover is exempt: it still
  lights the whole run a tap would take. Default from same-state sheets
  (`reach_sheet.mjs`): at 2.5 the floor glow (PULSE_FLOOR_REACH 2.0,
  renamed from PULSE_REACH) swallows the crests; at 3 one crest emerges
  past the glow and dissolves, clearly short of a median run (3.7).
  Links written before it read 3.

## RENDER LORE

RENDER LORE (2026-10-11, GPU junction field): **blend COMPOSED colors,
never palette U from different sources.** The accent strip is ordered
[bandA reversed | base | gold | bandB], so a U lerp between two arms (or
a fill and the field) sweeps every family in between: two near-white
pulse cores (U 1.5 and 234.5) blended THROUGH gold, and a traveled /
untraveled pair stepped inside 1/6 of the blend instead of ramping.
Compose each source with its own accent first (exactly the section
shader's mix(section, acc.rgb, acc.a)), then mix RGB. Interpolating U
between ADJACENT samples of one thread stays fine (that is what the
ribbon itself does). FLOAT DATA TEXTURES in pixi v8: format
rgba32float, scaleMode nearest (a float texture whose sampler asks for
LINEAR without OES_texture_float_linear is incomplete and reads black -
even via texelFetch; WebKit/mobile do not guarantee the extension),
alphaMode premultiplied-alpha (pixi sets UNPACK_PREMULTIPLY_ALPHA from
it before every upload), `precision highp sampler2D` (fragment samplers
default to lowp). Row-partial uploads go through a TextureUploaderWebGL
extension, which must be registered BEFORE the renderer exists (its
GlTextureSystem merges the uploader map at construction) - module load
of junction_field.ts does it. Texture `source.update()` runs its GL
upload synchronously, mid-tick. PARTIAL BUFFER UPLOADS: pixi's
`Buffer.update(sizeInBytes)` REMEMBERS the size (GlBufferSystem uploads
`buffer._updateSize` bytes at the next draw), so a bare update() after a
partial one re-sends only that prefix, and within a frame the LAST request
before the draw wins - over-fills kept stale paint/FX on the GPU past the
paint pass's prefix uploads (review round, measured by GL readback:
probe_glreadback compares every mesh's buffers against its CPU mirror).
Any buffer that ever gets a partial upload must pass explicit sizes on
every upload (ribbon_mesh `uploadAll`, `copyUploadPending`).

RENDER LORE (hard-won, 2026-10-11): **a junction overlay must match
the ribbons across their whole WIDTH, not along their centerlines -
and a stale cache can hide that it doesn't.** The 16c field agreed with
each arm only on its centerline, so every primitive boundary crossing an
arm's width (wedge flanks at 0.97 fillHalf, disc rims, over-fill window
ends drawn on top) showed the difference as a hard line. It stayed
invisible while the section cache was stale (ramps sat ~1 ctrl off their
joints, so nothing near a joint was strongly colored); fixing the cache
made it the dominant artifact. Certify overlays with a FIELD-vs-RIBBON
census over arm footprints (`renderer.fieldProbe`), excluding true
ribbon overlap (whose visible color is draw order, not the field).

RENDER LORE (hard-won, 2026-10-10): **a custom pixi shader ignores
mesh.texture.** Pixi v8's Mesh texture setter only updates
`shader.texture` (bookkeeping) and GlMeshAdaptor binds uTexture from
mesh.texture for the DEFAULT shader only, so the shared section shader
kept the strip it was created with: `pathColor` NEVER reached the
ribbons (default gold), while the CPU-composed fillet fans used the real
pathColor - olive fans on gold paths at a khaki pc= (the user's "olive
smudges"). Any texture a shared custom shader samples must be bound via
its resources (`bindAccent`).

RENDER LORE (hard-won, 2026-10-09): **flat fills cannot represent a
field.** Once per-vertex V blending exists, ANY flat-colored overlay
(wedge, disc) over a ramping ribbon draws a visible step or stamped
circle at its silhouette — and per-primitive sampling (host-axis
discs, per-arm wedges) still leaks faint rim arcs wherever one
primitive's footprint crosses ANOTHER arm's material. Overlays must
evaluate the SAME continuous field as the ribbons (the 16c angular
junction field). Don't reintroduce point-sampled joinery.

RENDER LORE (hard-won, 2026-10-09, closed 2026-10-10): **the arc-wrap
family bit FOUR times before the root died.** `arcAt` and `sampleAt`
wrapped arcs modulo totalLength, so an OPEN chain's terminal
(arc == total) landed at arc 0: (1) `arcAt` collapsed traveled-bridge
paint spans to a point (fixed via `paintArcAt`); (2) `sampleAt(total)`
drew every atEnd tip disc at its chain's START (fixed by reading the
endpoint sample directly); (3) fillet flank samples at corner-cut
terminals flew to the chain START (fixed by `sampleAtSafe`'s clamp);
(4) the ROOT: `sampleAt`'s ring index math itself — (arc/total)*count
with modulo — maps ANY open-chain arc within one sample spacing of
total onto a phantom last→first chord (99.8% of the way to the OTHER
END for a clamped terminal query), which fanned fillet slivers from
every fused bridge junction (42 on the repro seed) and skewed the
whole open-chain parameterization by up to one sample. Fixed at the
root: `SplineSamples.closed`; sampleAt clamps and maps over count-1
segments for open runs. The per-call-site guards stay as
belt-and-suspenders. Diagnosis lore: the jarm probe "cleared" the
junctions because it evaluated PHYSICS positions while the SAMPLES
were the thing lying — a census must measure the same pipeline it
certifies (the P3.24 probe rule again, render edition).

RENDER LORE (hard-won, 2026-10-09; the strip is RETIRED by G2.3 - paint is
 per pixel now, nothing interpolates U): **the palette strip's ORDER was
load-bearing.** Per-vertex UVs interpolate linearly between samples, so
any two paint values that can sit on ADJACENT samples must be contiguous
color families in the strip — the original [base, gold, hover, bandA…]
layout swept the UV across the gold+hover texels at every band/base
boundary and rendered a thin bright hairline exactly at gradient ends
(survived the smooth-field fix: the FIELD was continuous, the UV PATH
wasn't; per-sample color dumps validate samples, not the path between
them). Current layout: [bandA reversed | base | gold | bandB]. Also:
flat-colored overlays (tip discs, fillet halves) must sample the paint
of whatever they VISUALLY OVERLAP — a fused-tip disc lies on its HOST's
face and wears the host's paint; arm-colored discs rendered floating
pale/gold dots wherever the two paints disagreed.

RENDER LORE (hard-won, 2026-10-09): **never destroy palette textures
mid-session.** Pixi's retained render state (bind groups subscribe to
texture resources) can still reference a TextureSource the frame after
a rebuild; destroying it null-derefs in `setResource` on every
subsequent render — the shared ticker dies and the canvas blanks, which
presents as "every checkbox toggle blanks the screen" (and can leave
half-rendered frames: fills without erase gaps). Palettes live in a
page-lifetime cache (`PALETTE_CACHE`, keyed by base color); rebuilds
reuse them. Attributed with a checkbox-toggle pageerror probe — the
rebuild itself kept working while the stamp's wall clock froze.

RENDER LORE (2026-10-09; MOSTLY RETIRED by Stage 26): **gamut locality
was load-bearing only for the old V-AXIS palette.** A V-ramp between
two section colors rendered every hue BETWEEN them (the V axis is a
PATH through the gamut), so adjacent sections had to sit close in V or
junction ramps painted rainbow stripes. Stage 26 replaced V with
per-vertex RGB and straight RGB lerps — unrelated adjacent colors now
blend DIRECTLY, which is the whole point of the new segments scheme.
Still true and worth keeping: any scheme whose ramps are expressed as
coordinates through a 1D gamut path (depth/strands still are, via the
subdivider) must keep adjacent coordinate jumps small, because a
coordinate lerp sweeps the hues between.

## From the rounds and the P3 saga

- *From Stage 13 (junction joinery), the arcAt GOTCHA:* GOTCHA worth
  keeping: `arcAt`'s closing modulo wraps an OPEN chain's terminal arc
  (== total) to ZERO — traveled bridges' spans collapsed to a point
  and stayed base-colored; the paint pass uses `paintArcAt` (clamping)
  while the crossing machinery keeps `arcAt` untouched.

- *From the 2026-10-11 small fixes, adaptive wedge flanks:* CUSP RADIUS MAX 3 -> 6 (user request) + ADAPTIVE
  WEDGE FLANKS: a wedge flank is a polyline through points on its arm's
  edge, and where the arm wraps a small eye each chord cuts across the
  curved edge, leaving a circular segment (sagitta c^2/8R) that neither
  the web nor the ribbon covers - thin dark crescents. A fixed 5 flank
  points made 0.48-world chords at cr 6 (crescents at 12 of 41 ring-URL
  joints); flanks now take enough points for chords <= 0.15 world
  (FILLET_EDGE_CHORD; 0.3 still left specks). Same-state A/B
  (probe_chordab: one settled page, only the fans re-rendered per
  variant, pixel-diffed by cells_diff). A tried "outward-only flank" rule
  (stop a flank where its arm curls back toward the joint) cut V-notches
  into webs and was dropped; a fan from the joint center over-covers a
  non-star-shaped outline, it never leaves holes.

- *From the 2026-10-11 small fixes, stale fan indices:* STALE FAN INDICES
  (1ba7382): TriFanMesh uploads indices up to a high-water mark - with two
  commits before one draw, pixi's last-update()-size upload dropped a
  shrinking fill's re-zeroing for good (grey/white fans, thin bars; only
  probes forcing several rebuilds per frame hit it).

- *From the 2026-10-11 small round 2, junction blend distance:* JUNCTION BLEND DISTANCE (`junctionBlend`, jbl=,
  lattice units, panel [0, 6], default 0.88 since codec v2 - 0 = the
  historic look; live via recolor): extends the segments/strands junction ramps by a FIXED distance
  (user correction: not a ratio of the run's length - every junction bleeds
  the same distance; converted to ctrl per run through its lattice length,
  capped at the run's midpoint, so runs shorter than twice the ramps become
  one gradient junction -> own color -> junction). Measured run lengths at
  defaults: median ~3.7 lattice units, p90 11-15, max ~50; ~0.45-0.9
  lattice units per ctrl. Ramps ease toward smoothstep, fully once the
  extension reaches 1 lattice unit - a long LINEAR ramp meets the flat run
  (or the opposite ramp) with a slope kink the eye reads as a band. The
  renderer's segment lookup is now a binary search (eased ramps emit 6
  pieces each).

- *From RENDER-ONLY PLUCKS (2026-10-11), the concave-side cap:* CONCAVE SIDE: the inner swing is capped at 0.9 radius
  minus the thread (5-station circumradius, min over +-2), SLOPE-LIMITED
  along the lobe (CAP_SLOPE 1/world - the raw cap jumped 0.06 -> 0.52 in
  two stations at a tight loop and creased the blur); tight bends keep the
  base intact +-TIGHT_K stations with a ramp (without it, narrowing beside
  the clamped fold cut slivers out of the thread). Tried and REJECTED: a
  symmetric (both-sides) cap - clean eyes zoomed in, but the noisy cap
  carved every hook's outer blur into lumps at normal zoom - and a
  3-station radius (noisier).

- *From P3.40 (gap shapes at loop-end twists), lessons:* LESSONS: (1) one artifact NAME hid three mechanisms - attribute the
  exact primitive under the bad pixel before choosing a fix class;
  (2) a shaper guarding a rare degeneracy must be curvature-
  PRESERVING or it becomes the artifact at the sites that need it
  most; (3) an erase boundary may be truncated but never extended
  past its solved exit - extension erases material nothing repaints.

- *From P3.34 (the merged-parallel-threads seam), the concave-side miter clamp:* THE FIX IS IN RENDERING: the concave-side offset is
  clamped to the local turn radius (min 30% width), so an over-tight
  fold renders as a clean thinned fold at ANY radius - verified at
  radius 0.13 vs half-width 0.26.

- *From P3.28 (torn crossings after a small pull), displayF:* Passes now carry a RENDER-ONLY `displayF` (the raw joint slide
  target, before easing/clamps, stale-frozen through static mode);
  `RibbonRenderer.renderCtrl()` prefers it everywhere crossing
  geometry is placed (centers + neighbor gaps). The physics ctrl keeps
  its clamp/topology duties untouched.

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

## Marker icons (K83)

- MARKER ICONS (K83, 2026-10-13; worktree agent). Levi: "placeholder
  icons for the start, finish, and current positions ... minimal, white
  strokes with clear background. Rendered within a black circle with a
  bit of margin roughly equal to the stroke width." He will replace the
  glyphs; the contact sheets are in `.claude/probes/K83/`. GLYPHS
  (marker_glyphs.ts, pure): designed in a 24-grid like line-icon sets
  (polylines with round caps and joins, circles, dots), compiled into
  the DISC frame and scaled until the outermost ink sits exactly
  MARKER_MARGIN = MARKER_STROKE = 0.15 radii inside the rim, so every
  glyph shares one stroke width and the stroke scales with the marker.
  Defaults: play / flag / ring-and-dot; alternatives per role. A new
  glyph is one design entry; the tests check its fit and that the shader
  can hold it. markerGlyphSvg / markerGlyphSvgMarks write the same shapes
  as SVG, and markerGlyphSvgFit(id, role, inkR) scales the marks to any
  glyph box (the off-screen indicators can draw the identical flag).
  DRAWING (marker_mesh.ts): ONE QUAD per marker with a signed-distance
  fragment shader - capsule-union strokes (exact round caps and joins),
  rings, dots and the disc, with an analytic one-pixel ramp from dFdx.
  Not pixi Graphics: its round caps take 15 * angle * sqrt(radius) / pi
  segments from the RAW local radius, about 4 per cap at these sizes (the
  N-gon marker lore again). SIZE: one radius for all three,
  markerRadiusFor(tw) = max(0.55, 1.5 tw) world - read it there, never
  copy the formula (the old start/exit discs were 0.95 tw, the head's
  ringed dot 0.54 tw): about 14 CSS px across at the phone's default zoom
  (8.8 px per lattice unit at gs 18; the old discs were 8.7 px, a glyph
  could not read there) and 34 px on the 1400x900 desktop. The start/exit
  gap slots grew with the disc (concentric by construction - markerWorld).
  ORDER start < head < exit: at the entrance the player sees "you are
  here"; once solved, the flag and the win ring (1.32 radii) show. The
  head glow stays, under the weave. The three meshes are page-lifetime
  (each scene borrows them; destroy() hands them back) - the PALETTE_CACHE
  lore. The burn intro no longer colors the start disc (sectionColorAt
  went with the colored discs).

## Route bands (K81)

- ROUTE BANDS (K81, 2026-10-13; worktree agent, stages 1-3b). Levi
  (2026-10-12, `.claude/probes/K81/levi_junction_nub.png`): the
  traversed highlight showed "a discontinuous flat nub" across a
  junction; he wanted "a smooth continuous arc from right to left".
  DIAGNOSIS: a web took its color from an angular blend of the
  bracketing arms' strips (the edge-aware field; K4's per-arm strips), so
  between a gold arm and an untraveled one the gold-to-section change ran
  as a straight line (the nub), and gold also filled wedges the route
  never crossed. FIX: each traversed joint gets a ROUTE BAND, one
  thread-width gold arc from the arrival arm to the departure arm,
  continuous with both arms' gold; outside every band the web shows the
  untraveled material.
- PURE PART (`junction_routes.ts`; its header holds the decisions): which
  arms each joint's route joins (`pathLegs` / `legRoutes` / `pickRoutes`)
  and the corner (`routeCorner`, `routeCubic`: a cubic between the two
  arms' band ends, tangent to both; d grows with the turn angle, capped
  so the turn's centerline passes within 0.9 fh of the joint center, 0.5
  fh inside the cover caps and 0.25 fh inside the wedge rim, by turnFits
  bisection; a straight route is the two centerlines joined).
- RECORD + SHADER (`junction_field.ts`). A routed record holds a ROUTE
  block per band at `routeBase`: R0 = nv, m, ia, ib, then nv <=
  MAX_ROUTE_VERTS vertices x, y, tau, 0 (arm A's centerline in from its
  band end, the corner, arm B's centerline out; tau = arc along the band,
  the corner from -d to +d). A record keeps the newest MAX_ROUTES = 4
  distinct arm pairs. Every arm of a routed record writes its composed
  strip row (stripRow) AND an untraveled one (stripRow + 1). The fan
  shader: `routed = nRoutes > 0 && hd.z > 0.5`; outside every band it
  shows the arms' UNTRAVELED paint (pulses, hover and glow stay, no
  gold); inside a band, the band's arms' COMPOSED paint, A -> B blended
  over tau in [-m, m], with a one-pixel ramp at thread half-width. It
  reads the composed rows, so the band follows K93's and trail mode's
  fades with no clock of its own. COVER STRIPS (ribbon_renderer.ts): one
  per routed arm, out to min(want, coverCap), redraw the arm's ribbon
  beside the web with the same field, so the band continues past the web
  edge. A strip fragment is `fract(vRec) > 0.125`: pushStrip
  (ribbon_mesh.ts) tags strip records `rec + STRIP_REC_TAG` (0.25), so
  NOTHING ELSE may push a fractional record into the fillet mesh. Caps
  are dropped at routed junctions. The CPU mirror is `cpuJunctionField(
  rec, x, y, out, px, strip)` (reached by `fieldProbe.at`; `fieldProbe.
  routes(ji)` lists a record's bands): a GLSL change is mirrored in the
  same commit.
- WIRING. `setPaint`'s 4th argument is `routes`; fabric_maze_renderer
  feeds it: fullPath = the whole path, trail = the joints the trail still
  reaches, string = none, a move in flight folded in. The fillet rebuild
  is keyed by the routes' JSON (routeKey): a probe that edits routes goes
  through setPaint or calls `rebuildFillets(true)`. Paint debug views 3
  and 4 bypass the band (they show the base field).
- DECISIONS. (1) Backtracks: the band follows the path STACK like the
  gold; a popped pass's band goes. A joint truly passed twice holds two
  bands, newest drawn last. (2) The head: a one-arm band (arrival arm to
  the joint center, round end) under the K83 marker; start, exit and dead
  ends are free tips, keep their caps and get no band. (3) A move in
  flight: both ends carry a band (the gold slides along it). (4) A routed
  web shows untraveled material outside the bands. OPEN FOR LEVI: at a
  joint passed twice whose arms are ALL gold, small purple slivers of
  untraveled material show between its two bands where the web used to be
  all gold (`.claude/probes/K81/results/ab/zoom.png`, sheet row 2); the
  amendment is to fill outside the bands with the composed rows when
  every arm of the web is traveled. (5) Caps dropped. (6) Composed rows,
  no clock of its own. (7) The corner geometry above. (8) Width: thread
  width in webs, cover strips pad 0.5 px.
- MEASURED. SMOKE: no shader compile or link error; the console's 404s
  are favicon.ico, and the three "Attribute aUV is not present in the
  shader" warnings are K83's (marker_mesh.ts declares `in vec2 aUV;` and
  never reads it; 4deeda1 logs them too). CENSUS (GPU vs the mirror,
  `census_k81.mjs`; fans on a 5 px grid, cover strips on a 2 px grid):
  0 points over 2/255 in gold (5 moves), trail (`pv=trail&trl=5`, 8
  moves), passed twice and in flight; max 0.0056-0.0065 (routed fans /
  unrouted fans / strips; K75's fan baseline 0.0062). SAME-STATE A/B vs
  4deeda1 (`k81_ab.mjs`, every clock pinned, A/A 0 px): 2004-4222 changed
  px per scenario (max delta 137-138/255, trail 50), 0 beyond a routed
  joint's footprint + 2 px, untraveled joints 0 px. GPU (3200x1800, the
  5-move state with 5 routed records, 8 interleaved runs per side under
  the perf lock, machine quiet: CPU ~5%, 3D GPU ~1% before each run;
  master d9a7d47 vs the rebased branch, `gpu_k81.ps1` + `gpu_sum.mjs`):
  FAN 0.577 +-0.010 -> 0.778 +-0.019 ms (+0.20, ranges do not overlap),
  strip pass 0.070 -> 0.071, ribbons 1.707 -> 1.641 (noise), total 2.66
  -> 2.79 ms, same draw counts. The fan growth is the 5 routed webs plus
  their cover strips; how it scales with more routed joints on screen,
  and the phone's cost (K10; the Pixel has no GPU timer), are not
  measured.
- RESIDUALS. The pluck overlay draws over the band. A band crossing a
  non-route arm beyond that arm's cover cap leaves a ribbon patch, and a
  non-route gold arm shows untraveled material in its strip. Strip
  quantization differs by 1-2/255; the ramp shifts about 1 px where the
  band leaves the strips; a tiny far-side sliver lies beyond the 0.92 fh
  disc. The band is fh wide while the ribbon's width varies (reveal,
  swell). A self-loop's direction is taken as A -> B; passes beyond
  MAX_ROUTES lose their band; gated joints, arms shorter than 0.15 and
  arms beyond MAX_ARMS drop their caps with no band. At a tap the old
  head's route switches from one arm to two (setPaint runs a frame ahead
  of tickPaint in main.ts). Band clipping at non-adjacent routes, at
  skipped wedges (gap > 2.6) and in small webs; turnFits uses the arms'
  straight rays. In flight, the far end's band reads its arrival arm
  before that arm is painted (a faint change beside the marker). G4's SDF
  webs (K9) should carry the route as the smooth union of the traveled
  pieces only.
- PROBES (`.claude/probes/K81/`, untracked): k81lib.mjs (`open`,
  `move(page, cheapest | back | nth(k))`, `joints(page)` with each
  record's bands; a joint passed twice = walk `nth(k)` and watch for n >=
  2), smoke.mjs, census_k81.mjs, k81_ab.mjs (gold5 | back | twice |
  flight | trail), mk_k81_sheet.mjs, sheet.png, gpu_k81.ps1 +
  gpu_sum.mjs (GPU A/B). Before/after builds: detach to the base commit,
  `vite build --config .claude\probes\K81\vite.private-cache.config.ts
  --outDir ...`, switch back, `vite preview` on 5312/5313.

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
  stands in for K6's flags) and stops under prefers-reduced-motion.
  Screen-fixed, not world-anchored: a backdrop at infinity - camera moves
  never drag it or force a re-render, zoom cannot alias it, and the fog
  can sample it. REJECTED: cells (Voronoi seams form a dark network that
  competes with the maze's faces), dither (a screen door that crawls
  under drift), linen (a 4.5 px weave that moires at fractional DPRs).
  LORE: this desktop's Chrome reports prefers-reduced-motion: reduce
  (Windows animation effects are off), so backgrounds never drift here -
  probes emulate no-preference; a warp of a warp amplifies its time
  offsets (mist's clock runs at 0.35) and contour lines that move faster
  than ~1 CSS px/s read as crawling; calibrate contrast as the p2-p98
  luma spread of a knot-free margin (about 9-13 levels at 0.5). Cost:
  +0.24-0.34 ms GPU per frame at 3200x1800 (the full-screen pass is most
  of it). Probes: `.claude/probes/K21/`.

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

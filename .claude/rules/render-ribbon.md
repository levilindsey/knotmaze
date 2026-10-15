---
paths:
  - "src/render/ribbon_renderer.ts"
  - "src/render/ribbon_mesh.ts"
  - "src/render/arm_strip.ts"
  - "src/render/junction_field.ts"
  - "test/render/fixtures/chains.ts"
  - "src/render/samp_table.ts"
  - "test/render/samp_table.test.ts"
---

# Render lore: ribbons and junctions

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

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
  lattice units, panel [0, 6], default 0.88 - 0 = the
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

- *From P3.34 (the merged-parallel-threads seam), the concave-side miter clamp:* THE FIX IS IN RENDERING: the concave-side offset is
  clamped to the local turn radius (min 30% width), so an over-tight
  fold renders as a clean thinned fold at ANY radius - verified at
  radius 0.13 vs half-width 0.26.

- *From P3.28 (torn crossings after a small pull), displayF:* Passes now carry a RENDER-ONLY `displayF` (the raw joint slide
  target, before easing/clamps, stale-frozen through static mode);
  `RibbonRenderer.renderCtrl()` prefers it everywhere crossing
  geometry is placed (centers + neighbor gaps). The physics ctrl keeps
  its clamp/topology duties untouched.

- *K76 stage 2b, the thread reveal's joint gate (2026-10-14):*
  rebuildFillets skips the records of the junctions and free tips the
  reveal hides (`exploreHideJn`, `exploreHideFree`) and appends the hidden
  set (`exploreJointsKey`) to its cache key, so the fans rebuild when the
  set changes, not on growth frames. The rule and its census:
  `render-explore.md`.

## G3-0 DATA PLANE (K8 stage 2, 2026-10-15)

- **Four page-lifetime tables that nothing samples yet** (G3G4_sdf_geometry.md
  sections 2.2 and 5.1; the header of `src/render/samp_table.ts` is the
  format spec). SAMP: two samples per RGBA32F texel, every chain's sampBase
  even, so a chain's floats are exactly its `chainSamples[c].positions`.
  RADII: four `fround(h * widthMul)` per texel, a region per chain padded
  to 4, filled only while the chain's multiplier is not null. G3 CHAIN: two
  texels per chain (sampBase, radBase or -1 for unit width, the two cap
  kinds; winBase, nWin, rangeBase, nRange). RANGES: one texel per slot
  window (slot, kLo, kHi, flags), sorted by kLo, the one sample of padding
  each side included, a closed chain's seam-split window as two entries
  (flag bit 2). RANGES reproduce `assignGapIds`' per-sample `idScratch`
  exactly: `assignWindowLanes` feeds both. FOLD (G3-2) and CLUSTER (G4-0)
  ranges will start at rangeBase; nRange is 0 until then. CHAIN is its own
  table so that G3-0 changes no shader text (KSTATIC and KGEOM untouched,
  K307's warm-up unaffected).
- **Residency.** The module-level `G3` (`g3Tables()`) holds four
  `FloatRows` (1024 texels wide, grown in place). No shader binds them, so
  the WebGLSystem `G3DataSystem` (`knotG3Data`) makes each one resident on
  its first prerender (`renderer.texture.initSource`: allocate plus a full
  upload) and flushes dirty rows before every render after that.
  `contextChange` forgets residency, so a restored context re-creates
  them. One live renderer writes them at a time, like the G2 paint tables.
- **Writes, changed spans only.** `initG3Tables` (scene build) sizes the
  tables and zeroes this scene's regions. update()'s chain loop calls
  `g3WriteChain`: for SAMP, the first and last changed float bound the
  dirty texels; RADII does the same per radius. `assignGapIds` fills
  `g3RangeScratch`, and `g3WriteRanges` copies the changed span, zeroes a
  shorter frame's stale tail and rewrites the CHAIN records
  (`writeChainTexels` reports whether a record changed). The pluck
  collapse writes RADII as well, and update() ends with `g3Flush()`.
  Nothing writes while the knot sleeps, because update() does not run.
  `renderer.g3Data = false` skips every write and flush: one page can time
  the cost on and off in alternation.
- **Accounting and probes.** `FloatRows` takes an optional per-instance
  `UploadCounter` (its third constructor argument, `float_rows.ts`).
  `SAMP_UPLOAD_STATS` (`samp_table.ts`) counts the four G3 tables;
  `ROW_UPLOAD_STATS` still counts every FloatRows. `renderer.g3DataState()`
  reports on, uploadBytes/Calls, chains, sampTexels, radTexels,
  rangeEntries, rows per table and radOn. `g3TableRows()` returns the four
  FloatRows (the mirror `data`, the GPU `source`). `g3Expected()` packs
  every table afresh with the pure packers: what the mirrors and the GPU
  must hold.
- **SAME-STATE CAPTURE** (G3G4 section 5.0). `renderer.captureScene()`
  returns a `SceneCapture`: plain JSON, typed arrays in base64, so NaN and
  Infinity survive. It carries the positions, each crossing's pass ctrl
  and displayF, the emergent rows, 16 renderer scalars (flowTime,
  paintClock, pulseBorn, gateRev, fxLive, gateOpenAt, the reveal flags,
  its wall, FX and rim times, the appearance reveal's clock), gateLatch,
  gateCache, every `knotUniformValues()` key and the thread reveal's
  pieces. `restoreScene(s)` checks the particle and crossing counts,
  writes all of it and runs update(). NOT captured: the paint declaration
  and the hover (main re-declares them from the fabric every frame),
  plucks (none at rest), the camera, velocities. The restoring page keeps
  its physics frozen, and `ps.emergentCrossings` stays a getter over the
  captured rows until the page reloads: probe-only.
- **Measured** (2026-10-15, desktop RX 6800 XT, under the perf lock; the
  numbers and recipes are in `docs/design/K8_stage1.md`'s stage 2 handoff
  and `.claude/probes/K8/stage2/`). The GPU copies read back max |Δ| 0 on
  six links, a daily mid-intro (RADII on) among them. Master against the
  branch: 0 px on six links. Capture, reload and restore: 0 px on six
  links, against perturbed controls of 99k to 222k px. An awake update
  uploads 212,992 B at the default (91 chains, 12554 SAMP texels: 13 whole
  rows), plus one small-table row when a range or record changes (229,376
  B on flow frames), and 425,984 to 442,368 B dense (186 chains, 25919
  texels). Asleep: 0. update() pays about +0.15 ms at the default and
  +0.2 to +0.3 ms dense (in-page ABBA with every sample moving; about
  ±0.15 ms of noise per run). The frame bench (first draw to after
  `gl.finish`, 1600x900 at dpr 2) reads p50 0.5 ms at the default and 1.3
  to 1.4 ms dense on both builds; the branch's means sit 0.04 to 0.16 ms
  higher, which fits the upload's GPU copy landing in that window
  (inferred). On the Pixel 11 (PowerVR through ANGLE on Vulkan;
  MAX_TEXTURE_SIZE 8192, MAX_VARYING_VECTORS 30) update() pays +0.33 ms at
  the default (of 14.7 ms) and about +0.6 ms dense (of 34.5 ms; mid-settle,
  as the dense pages had not slept after 30 s, and noisy), and the frame
  bench reads p50 0.7 ms (default) and 2.5 ms (dense) on both builds.
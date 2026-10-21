---
paths:
  - "src/render/ribbon_renderer.ts"
  - "src/render/ribbon/**"
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

- *K580 s3 (2026-10-20), the convex side: round joins past 110 deg*
  (`ribbon_mesh.ts` ROUND JOINS; record `docs/design/K580_s3.md`). The
  miter put the outer vertex up to 2h out along the sample TANGENT's
  normal (cosHalf floored at 0.5), and at a cusp with unequal legs the
  tangent follows one leg: a thorn h past the stroke's edges (the a's J,
  about 0.25 LU on the raster) and a chord cutting inside the next leg.
  Past ROUND_DOT_START (110 deg) a sample gets ROUND_ARC_SEGMENTS (8) pool
  vertices after the strip's 2n (7 arc points at h between the two legs'
  outer normals, then B, the outgoing leg's corner): the outgoing quad's
  outer index is rewired to B and a fan from the inner vertex covers A..B.
  Inner and outer vertices sit on the TRUE bisector of the normalized
  legs; the concave clamp above is unchanged (0.3h at a cusp). From 110
  to 120 deg (ROUND_DOT_FULL) every round vertex blends from master's
  miter vertex by a smoothstep of the cosine (the pool starts collapsed
  on it), so a swept turn moves the outline continuously; below 110 deg
  every vertex is bit-identical. Edge-value attributes copy the sample's
  outer vertex; the pool grows by doubling (no steady-state allocation).
  K81's cover strips re-emit the fan through `RibbonMesh.coverPairs`;
  a strip with no room left drops the arc (as before). Measured: same
  state A/B (K550's ab_probe, `phw=0`) 0 px in knot, maze, reveal and burn
  at dsf 1 and 2; the J's outer offset R 2.000h -> 1.000h; Node bench
  update() 0.997-1.015x of master (noise). Pinned by
  `test/render/ribbon_round.test.ts`. NOT the miter: the i's joint notch
  in "ai" (the ideal's own concave corner between the junction's round
  piece, centred on the mean of the arms' slot samples in joinery.ts, and
  chain 3's end), and the open-end crescents beside a spur's tip. The
  root's paint (each side wears its stroke's section, blending into the
  spur's at J): render-paint.md, THE ROOT'S PAINT (K620).

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

## A FUSED JOINT IS NOT A CROSSING (K397 stage 3, 2026-10-15)

- **The knuckle U and the node_12 sliver were one mechanism** (H6,
  `docs/design/K397.md` stage 3). A tucked tip's end particle is fused
  to its host's, so the tip's last segment and the host's next one cross
  properly at that shared point. The physics' emergent collector
  (`forces.ts`: a proper intersection with sin > 0.25, no junction
  exclusion) registers the pair, and renderEmergent gave it a gap slot.
  Stub over host cut a dark round-ended ring inside the host (Levi's
  knuckle U, levi_0801: 2gozcj, 50e over host 56 at junction 132). Host
  over stub cut a band across the stub's root, past the cap cover's
  reach (stage 1's node_12 sliver: 48s under host 71). A third pair,
  55s on host 81, showed with the reveal off. The joint's own covers (the
  cap cover, the seal disc, the fans) own that overlap. Not H1: no hidden
  or gated joint in 14 walks.
- **The fix is CPU-only and touches no shader text.** `isJointPair`
  (`ribbon/crossing_gaps.ts`) is true when the two passes are on
  different chains and each lies within `JOINT_PAIR_REACH` (2) ctrl of a
  joint of the same junction (`junctionArcCtrls`, the same `jn`; wrapped
  on a closed chain). renderEmergent skips such a pair before the gate,
  so it gets no slot and no underWindows entry. The physics keeps the
  row (`ps.emergentCrossings` is unchanged). Knot mode has no fused
  junctions and does not move. Same-state toggle: `r.skipJointPairs =
  false` (master), then `r.update(); r.rebuildFillets(true)`. Pinned by
  `test/render/joint_pairs.test.ts`.
- **Side effect: the full web at those tucks.** rebuildFillets'
  `gapNearOf` reads underWindows, so the phantom window clamped the
  web's reach on the under thread's arm (armReach: FILLET_GAP_PAD,
  FILLET_GAP_MIN_FRAC). Without it, the three tucks draw the same web as
  the other 171: a rounded elbow with its inner fillet where master drew
  a sharp inner corner. The layer votes read only registered crossings,
  so they do not move (`dives` needs an under vote first).
- **Measured** (desktop, under the perf lock, same state;
  `.claude/probes/K397/stage3/`). Knot: 0 px. Fabric with the reveal off,
  174 tucks: live emergent slots 3 -> 0. Changed px within 1.6 fill
  half-widths of a tuck: 482-536. Between 1.6 and 3.5: 138-159. Beyond
  3.5: 0, at any threshold. Controls: 0. knuckle2: only the three
  vertices that see 48s change (3646-3827 px); the other nine read 0.
  census_fan (two loads): mean 0.00332 and p99 0.0046 on both; max
  0.2039 -> 0.2078, one 8-bit step at junction 132.
- **Recipe.** `h1scan.mjs` sorts fused tips by hypothesis. `h6look.mjs`
  zooms on one tip (panels A R E RE H F X). `jointab.mjs` diffs whole
  frames per tuck. `farcheck.mjs` (offline) counts changed px by
  distance from the tucks. `knuckle2.mjs` adds panel M (master).
- The dark slashes beside the head in Levi's 08:06 shot are ordinary
  crossing gaps of walked threads, not this mechanism.

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

## THE PARTS (K5)

K5 splits `ribbon_renderer.ts` into parts under `src/render/ribbon/`
(`docs/design/K5_K6_split.md` 2.3; R1 moved the first two on
2026-10-15, R2 to R5 move the rest). Every part follows these rules:

- **The façade stays.** `RibbonRenderer` keeps its name, file,
  constructor and public API, and the shared scene fields: the samples
  and controls, passInfo and neighbors, geomRev, updateCount,
  underWindows, flow, the widths and look, the containers and `ps`.
  `update()` stays on it, the pipeline that calls the parts in order.
- **A part** is a class the façade constructs with `(r: RibbonRenderer)`,
  or a set of functions of `r` when it has no state. It owns the fields
  only it uses. A moved body keeps its text, `this.x` becoming
  `this.r.x` (or `r.x`) for a shared field. Parts use `import type {
  RibbonRenderer }` (a type-only cycle). A public method that moves
  leaves a one-line delegation on the façade.
- **`private`.** A part cannot read a private member, so a shared field
  a part reads drops `private` and gets `/** @internal ribbon */`. R1's
  inventory counts them per part (`docs/design/K5_R1.md`, the handoff).
- **The probe surface stays on the façade.** Every name a probe reads,
  writes or patches through `__knotRenderer()` stays on the instance with
  the same effect. A field stays, or becomes a get/set accessor that
  forwards to its part (the K83 A/B writes `paintClock` and
  `pulseBorn`). A method probes patch (`r.advanceClocks = () => {}`)
  stays a façade method that the frame calls through the instance, and
  no part calls another part's copy where a probe patches the façade's.
- **A helper moves with its only calling region.** A helper with callers
  in two parts goes to `sampling.ts` if it is a pure read, and otherwise
  stays on the façade. A pure helper takes no `r`: tsconfig's
  `noUnusedParameters` fails a parameter never read (and
  `noUnusedLocals` a private method nothing calls).
- **Forwarders stay while probes call them.** The façade keeps each
  moved helper as a private one-line forwarder with its name, modifiers
  and signature, under a pointer comment, so its call sites and the
  probes run unchanged. It imports the module as a namespace (`import *
  as sampling from "./ribbon/sampling"`), so a forwarder never reads as
  recursion. Parts call `sampling.x` directly.
- **Each new file's header is its map:** what it holds, the commit and
  lines it came from, and who calls it.
- **Pure moves, checked mechanically** (design 2.1). Each move commit
  carries its old-to-new line map and the pins it moved. Undoing its
  edits (the indent, `export`, `this.`) gives the old text byte for byte
  (`.claude/probes/K5/R1/verify_sampling.mjs`), and every shader text
  stays byte-identical: an edit compiles cold once for every player
  (`render-shaders.md`).

WHERE THINGS ARE (R1). `ribbon/ribbon_shader.ts`: the section program
(SECTION_VERT, SECTION_FRAG, SECTION_EXPLORE_FRAG, sectionProgram,
sectionShader, sectionShaderExplore) and bindGap. K307's
`program_registry.ts` keys its two programs to that file, and
`paint_explore.test.ts` slices SECTION_FRAG out of its text.
`ribbon/sampling.ts`: sampleAt, arcAt, renderCtrl, neighborGaps,
paintArcAt, sampleAtSafe and PassNeighbors. K299's ring-lap scan reads
`src/render/` recursively, so the parts stay under its review (since
R2 it names both gap parts' files).

WHERE THINGS ARE (R2, 2026-10-15; `docs/design/K5_R2.md`; each file's
header maps its members to their old lines).
- `ribbon/crossing_gaps.ts` (`CrossingGaps`, the façade's `crossing`):
  the slot solve (computeGapSlot, twinNeighbor, buildPoly, polyDist,
  protectReach and their scratch), the emergent pool (renderEmergent),
  renderMarkerGaps, assignGapIds with G3-0's RANGES, and the gap
  constants. GATE_LEAD, CUT_BIAS, EMERGENT_POOL, MARKER_SLOTS and
  JOINT_CLEAR_REACH_SCALE are exported from there, and since K397
  stage 3 JOINT_PAIR_REACH and isJointPair (A FUSED JOINT IS NOT A
  CROSSING).
- `ribbon/explore_gaps.ts` (`ExploreGaps`, `explore`): the reveal's
  declaration (setExplore, setExploreContrast, samePieces, sameBurn,
  sameSpans), the gap gate (applyExploreGaps, exploreCutAt), the joint
  gate (syncExploreJoints, exploreJointShown, exploreGateVisAt,
  exploreJointsKey, EXPLORE_JOINT_MIN), a pluck's spans
  (exploreShownSpan, exploreSolidSpan) and the probe views
  (exploreGapState, exploreJointState).
- **A name probes use goes through the instance** (`K5_R2.md` Q3).
  computeGapSlot, assignGapIds, applyExploreGaps, exploreCutAt,
  exploreJointShown, exploreGateVisAt and exploreShownSpan keep façade
  delegations, and a part calls them as `this.r.x(...)`, never as its
  own `this.x(...)`, so a probe's patch on `__knotRenderer()` sees every
  call (renderEmergent to computeGapSlot, setExplore to
  applyExploreGaps, and so on). smoothMin, protect, gapMode, gapOverflow,
  skipJointPairs (K397 stage 3) and exploreContrast are façade accessors
  over the parts' fields.
- **No value import from the façade.** The crossing part reads `G3` and
  `FILLET_REACH_PER_HALF` through façade getters of those names, so the
  cycle stays type-only.
- **Still on the façade.** passInfo and emergentBase (shared scene
  state); update()'s gap pass, which calls the parts (R2 adds no
  GapSource `solve()`: R3 or G3-1 does); exploreVisAt, exploreShownAt
  and exploreOn (the paint and the plucks read them); exploreHideJn and
  exploreHideFree (rebuildFillets reads them); knotChainRgb and hslToHex
  (to `paint_state.ts` with recolor, R3); arcForCtrl; and the G3-0 probe
  hooks (g3DataState, g3TableRows, g3Expected, captureScene,
  restoreScene), which 2.3 does not place (R5 can home them).

WHERE THINGS ARE (R5, 2026-10-15; `docs/design/K5_K6_split.md` 2.3;
each file's header maps its members to their old lines).
- `ribbon/joinery.ts` (`Joinery`, the façade's `joinery`): the fans'
  material lookups (cpuChainMaterial, writeStripRow, cpuStripAt,
  cpuJunctionField), the section color at an arc (sectionAtArc,
  colorAtArc, armCtrlSlope), `rebuildFillets` whole, the
  FILLET/DISC/TIP constants and the fields only they use (fan scratch,
  fusedTips, the profile pool, route/fillet keys, strip rows).
  FILLET_REACH_PER_HALF is exported from there; the façade's getter of
  that name (crossing_gaps reads it) and its rimGap/pluckNodes use it.
  `sampling.ts` gained normArc (pure; both call it).
- rebuildFillets, cpuStripAt and colorAtArc keep façade delegations
  (cpuJunctionField calls cpuStripAt through the instance), and
  tipDiscScale, fusedTips, filletLayer, filletTopLayer, fieldProfLen
  and fieldProbe are façade accessors over the part. paintMirror calls
  `joinery.sectionAtArc` directly (not a probe name).
- **Still on the façade.** filletMesh and filletTopMesh (the explore
  part sets their shaders; probes read them), geomRev, routeKey,
  routesByJn, recBaseByJn, fullJn and paintTmp (shared scene state),
  and the G3-0 probe hooks (they read reveal/paint state R3/R4 have
  not homed, so R5 leaves them). G4-1 adds its JointPass beside
  joinery.ts; G4-2 deletes joinery.ts.

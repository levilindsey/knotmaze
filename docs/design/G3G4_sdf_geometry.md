> RE-BASED 2026-10-15 on master d741412 by K8 stage 1 (agent `agent-a35a43cee74c92b93`; docs only, nothing measured; brief `docs/design/K8_stage1.md`). Since the snapshot below, G1 (per-pixel gaps), G2 (shader paint), K76 2a/2b (the thread reveal), K268 stage 1 (the shaped cut), K81/K127/K169 (route bands, traveled webs, the web fade), the render-only plucks (K77, K104, K279), K7 stages 1-2 (the physics host, and the worker core in Node; the worker reaches the browser at stage 3) and K307 stage 1 (cold compiles) have landed. What changed here: sections 1-4 describe master d741412 (its line numbers), with the data model re-cut for G2's textures (SAMP packs two samples per RGBA32F texel; AUX and PAINT are gone; per-sample radii get their own texture) and the fragment programs calling G2's paint library; section 5's stages are re-cut, with the reveal chain (K76 2c, K268 stage 2, K290, K76 2d) landing first; section 6 is refreshed for the Pixel 11 on Android Chrome, with a recommendation on every question. The decisions K8 stage 1 made are marked **(K8 s1)**.
>
> DESIGN SNAPSHOT (2026-10-11), written by a read-only design agent against the G1 branch (per-pixel gaps) as it stood that day; file:line citations referred to that code. What actually lands is recorded in CLAUDE.md and the commit messages; open work is tracked in LEDGER.md.

# G3 + G4 DESIGN: SDF ribbons and SDF junction webs (Knotmaze GPU migration)

**Base.** Master d741412 (2026-10-15), with G1 and G2 landed. All `file:line` citations point at that commit and will drift.

**Terms.**
- **sample**: one entry of `chainSamples[c]` (uniform-arc spline resampling).
- **h**: the ribbon half-width.
- **pxW**: world units per device pixel.
- **side01**: the across coordinate the paint library reads, 0 at the left edge and 1 at the right (today the ribbon's `uv.y`).

## Decisions at a glance

1. **One geometry source.** The GPU gets geometry from one shared RGBA32F texture of centerline samples (SAMP), two samples per texel, written by `update()`.
   - The CPU keeps producing `chainSamples` exactly as today, so every CPU consumer keeps working. Under K7's worker they come from the mirror (section 1.1), the same positions the samples are built from.
   - Per-sample radii (the reveal taper, the pluck base collapse, the swell) live in a second texture (RADII), written only for chains whose width multiplier is not 1. **(K8 s1)**
   - There is no GPU readback anywhere.
2. **Ribbons are one instanced draw, one instance per centerline segment.**
   - Coverage is the exact signed distance to the union of round cones (uneven capsules) over the sample polyline, with per-sample radii. Analytic AA.
   - Smooth segments draw a quad bounded by the angle bisectors at both ends. That quad is exactly the nearest-segment region, so no ownership test is needed.
   - Segments near a tight fold draw a capsule box instead, and keep a pixel only if they are the nearest segment (argmin) over a CPU-flagged fold window.
   - Over-tight folds keep today's ONE-SIDED pinch: the concave edge pulls in to the local bend radius and the convex edge stays at h (section 3.3). **(K8 s1)**
   - Result: every pixel of a chain has exactly one writer.
3. **Gap slots reference SAMP instead of copying polylines.**
   - The slot header points at a sample range in SAMP plus up to 8 chunk bounding circles; a row shrinks from 114 texels to about 24.
   - The nearest-point search becomes exact and pruned (about 12 segment evaluations instead of up to 56).
   - Slot ids move from the per-vertex `aMaskId` lanes to per-chain window range lists (RANGES).
4. **Junctions are one instanced draw of per-CLUSTER octagons.**
   - A cluster is 1-2 fused joints whose domains touch (for example, both ends of a short bridge).
   - A PIECE is one chain's maximal arc range inside the cluster. A through-thread is one piece; a fused terminal is an "end" piece.
   - The fragment shader evaluates every piece with the same SDF and the same samples as the ribbon pass, then takes the hard union.
   - It adds a smooth-min web only between the two pieces that bracket the pixel's angular sector.
   - Pieces get the full G1 casing; the web is cut only by foreign over silhouettes.
   - Colour uses an edge-aware SDF blend of COMPOSED colours. Its envelope, and the web's radius, reach zero before the domain edge.
   - The ribbon pass discards its own pieces' pixels inside the domain. The hand-off is exact by construction.
   - The joint program carries what the fans carry today: K81's route bands, K127's traveled webs, K169's web fade, K76 2b's joint gate, and (once they land) K268 stage 2's anchors and K290's dropped arm. K345's hover rim runs through it, since pieces have an across coordinate. **(K8 s1)**
5. **Paint is G2's library.** Both programs call `paint_glsl.ts` with its caller contract (chain, fractional ctrl, arc, side01, pxArc). `paint_math.ts` stays the census reference. The thread reveal (`withExplore`) and the shaped cut port into the new programs once the reveal chain has landed. **(K8 s1)**
6. **Flow undulation stays on the CPU** (control-copy displacement). There is no pluck ring any more: plucks are render-only overlays (K77).
   - When asleep under flow, gap windows are reused round-robin. A smooth warp carries crossings with the material.
   - Spline sampling, SAMP and bounds still refresh every frame.
7. **The yarn becomes a host-frame pass** (K23).
   - It finds its host's nearest centerline point with the same SDF code.
   - It evaluates the analytic wander in (arc, lateral) coordinates.
   - It multiplies by the host's own gap keep, so it dips under exactly where the host does, per pixel.

---

## 1. CURRENT PIPELINE (what G3/G4 replace)

### 1.1 What runs per frame on master d741412

**The physics hand-off (K7).** On master d741412 the physics still runs on the main thread (`InThreadHost`, K7 stage 1), and the renderer reads `ps.positions` directly. K7 stage 2 built the worker core, the snapshot and the mirror in Node (`physics_worker_core.ts`, `snapshot.ts`, `mirror_system.ts`). Stage 3 (running) puts the worker in the browser behind `phw` (off by default); stage 4 adds the diagnostic bridge (`__knotPhysFreeze(on)`); stage 5 makes the worker the default. With the worker on, the renderer reads the mirror: the newest snapshot, or the last two interpolated at now − D (D = the median snapshot interval, clamped to 8-50 ms) if stage 3's A/B keeps interpolation; at rest the frame is exact. G3 reads the same positions as today's samples and never talks to the worker.

**`RibbonRenderer.update()`** (`ribbon_renderer.ts:2449-2607`). Setup: `kData()`, `geomRev++`, `underWindows` cleared, the reveal lifecycle (`finishReveal`), and K90's `splineBend.halfWidth` (off unless `__knotSplineBend(true)`). Then per chain, in order:
- Copy the controls from `ps.positions`.
- Flow displacement of the copies (`flowOffset`, 1674).
- `sampleClosedSpline` / `sampleOpenSpline(controls, fills[i].sampleCount)`.
  - `spline_generator.ts`: closed chains place sample k at arc k/count × total; open chains at k/(count−1) × total.
  - count is fixed per scene: max(MIN_SAMPLES 48, round(arc / SAMPLE_SPACING 0.09)).
- `tuckFusedTips` (4916) for fused tips; the result is `chainSamples[i]`.
- `paintScene.writeGeom(...)`: the chain's control arc table into KGEOM (G2), and `kChain`.
- The width mask, `widthMulFor(i, samples)` (2061): the appearance reveal's taper, on the CPU.
- `fills[i].update(positions, tangents, h, 0, withPluckCollapse(...))`: `RibbonMesh.update`.

There are no pluck waves (plucks are render-only overlays), no cache-drift re-bake (G2.2 evaluates the section colour per vertex from a run table) and no per-vertex paint writes (G2).

After the chains: the crossing gates (`gateLatch`; `gateCache` keyed on `gateRev`; `GATE_LEAD`), `computeGapSlot` per crossing (2632), `renderEmergent` (3301), `renderMarkerGaps` (3363), `assignGapIds` (3468), `applyExploreGaps` (4704; K76 2b, K268 stage 1), `gaps.upload()`, `paintScene.flushGeom()` (KGEOM's dirty rows) and `drawRevealTips()` (2135).

**`RibbonMesh.update` (G3 replaces this).** It extrudes two vertices per sample and contains:
- the miter (`h / cosHalf`, clamped at 2x);
- the open-tip leg duplication (Stage 7b);
- zero-length-leg borrowing (the tucked-tip spur fix);
- the P3.34 concave-side clamp: `innerCap = max(0.95·radius, 0.3·h)`, radius = ((la + lb)/4)·cosHalf/sinHalf, applied to the CONCAVE side only;
- the swell: a multiplier above 1 grows the convex side with the concave side capped; one at or below 1 scales both sides.

It uploads `aPosition` and `aTan` for all samples. **Per-vertex attributes per chain:**
- `aPosition`, `aUV` (`uv.y` is side01);
- `aKey` (chain, sample index; static), which G2's vertex stage decodes;
- `aArcPos` (the sample's arc as a unit-circle turn: closed rings go once around, open runs 0.9π; static);
- `aTan`;
- `aMaskId` (up to 4 gap slot ids, from `assignGapIds`).

`aColor` and `aFx` are gone (G2). The `vertices` getter (left and right edge points per sample) has one reader outside the mesh: K81's cover strips (`ribbon_renderer.ts` ~6870-6915, `COVER_STRIP_PTS` 32).

**Crossings.**
- `computeGapSlot` marches against coarse polylines (`COARSE_SPACING` 0.1), then builds the fine shader polyline (`FINE_SPACING` 0.075, at most `GAP_MAX_PTS` 57 points in 7 chunks of `GAP_CHUNK` 8), the protect polylines, the far-branch K and the junction clearance per side.
- A slot row is `GAP_TEX_W` 114 texels: 9 header texels, 7 chunk chords, the points ([x, y, u = d/|d|²]), two protect blocks of 19 texels and K268's 3 profile texels (`GAP_PROF_BASE` 111). Row 0 holds the globals.
- Uploads are row-partial since K268 stage 1 (the `knot-gap-rows` uploader, `GAP_UPLOAD_STATS`). `setVis` (K76 2b) and `setShape` (K268 stage 1) change a slot's strength or fade profile without a re-solve.
- `assignGapIds` writes per-sample slot ids (`idScratch`, one lane per window, ±1 sample) into `aMaskId`.

**Paint (G2).** `tickPaint` (3852) → `advanceClocks` (4380) reduces the clocks into uniforms on the CPU in float64. `writePaintItems` (4507) rewrites KPAINT only when the declaration changes (`setPaint`, `setRim`, `setExplore`). At rest that is 0.01 ms and 0 KB per frame.
- The ribbon program "section-rgb" (`SECTION_VERT/FRAG`, `ribbon_renderer.ts` ~408-534, 46850 characters) runs `PAINT_VERT_MAIN` in the vertex stage: it decodes `aKey`, binary-searches `kCtrlOfArc`, evaluates the section colour per vertex, and emits wrap-pair varyings plus flat `vKC0/vKC1/vKG0`.
- The fragment stage runs the paint library (FX, paint, pulses, the hover rim, the High contrast looks), then `gapKeep`.
- The explore variant "section-rgb-explore" is `withExplore(SECTION_FRAG)` (K76), built lazily when the reveal first turns on.

**Joinery (G4 replaces this)** — `rebuildFillets` (5406 to about 6920), gated on geomRev, the sliders, FX and the explore joints key:
- Records with radial profiles.
- Per-arm layer votes and two `TriFanMesh` layers (`aPosition`, `aRec`, `aMaskId`; high-water index uploads).
- Joint masks: foreign-over slots, silhouette only, inset one pixel.
- Free-tip discs on AXIS records, fused-tip discs (the cap cover disc, `TIP_DISC_SCALE` 1.06 h), seal discs.
- Wedges: adaptive flank polylines (`FILLET_EDGE_CHORD` 0.15, up to 20 points), the bezier rim with corner control, the `FILLET_MAX_WEDGE` 2.6 rad skip, the `armReach` gap clamp.
- K81's route records (route bands, at most 4 routes per web) and cover strips; K127's fully traveled webs; K76 2b's hidden joints (`exploreHideJn`, `exploreHideFree`).
- The fan program "junction-field" (`junction_field.ts`) evaluates the angular, edge-aware junction field over ARM STRIPS: each arm's composed material, rendered once per frame into an RGBA8 row by the "arm-strip" program (`arm_strip.ts`). Per-pixel paint on the fans cost the phone 60 → 44 fps. The fans use only `PAINT_GATE_GLSL`, plus G1's fan modes in `gapKeepAt`. K169's `WebFade` fades the gold web in over 0.25 s.

**Plucks** (K77, K104, K180, K279): render-only overlays (`pluck_overlay.ts`, `pluck_model.ts`). They read the renderer through `makePluckHost` (`ribbon_renderer.ts` ~4126-4156):
- `chainSamples` and the base sample count;
- `underGapVisibility` (1705; the overlay's rule 3);
- `composedAtArc` (the paint_math mirror's colour along the arc, with no across coordinate);
- `setCollapse(c, mul)`, which re-extrudes the base ribbon with the collapse (`reextrude`, 4180) without an `update()`;
- `gapIds` (`idScratch`): a still pluck (reduced motion, K104) runs the "pluck-still" program, `gapKeepAt` over the ribbon's own slots.

**Yarn.** `fabric_maze_renderer.ts` `drawYarn` (~1368). Positions come from `pointFlowed` (723: the physics polyline plus flowOffset), Chaikin-smoothed and stroked by a Graphics every update. Visibility comes from `underGapVisibility`, quantized.

**Not ribbon geometry, so G3/G4 leave them alone:** K93's trail spans (KPAINT items, `trail_paint.ts`), K99's fog stations (`fog_arc.ts`, placed through `pointFlowed`), K83's markers (one SDF quad each, `marker_mesh.ts`), K140's confetti and K21's backgrounds. A hidden under pixel shows the backdrop, as today.

### 1.2 Recorded costs

- **G1 vs its master** (desktop RX 6800 XT, 3200x1800):
  - GPU ribbon draw: user 0.79 → 1.78 ms per frame, ring 0.43 → 0.92, defaults 0.85 → 1.94. Draw calls 419 → 47 (user).
  - `update()` 12.0 → 5.7 ms per call at the user URL; CPU render 7.3 → 4.0 ms per frame at rest.
  - Pixel 11 (no GPU timer): defaults 39 → 60 fps at rest under flow (`update()` 32 → 15 ms); user and ring 60 fps on both builds. The gap shader was not the phone's limit; the CPU solve it replaced was.
- **G2:** `tickPaint` 0.13 → 0.01 ms; paint uploads 151 → 0 KB per frame at rest; fans 0.59 ms plus the arm-strip pass 0.06; the phone holds 60 fps at rest.
- **Today's desktop frame** (3200x1800): the ribbon program 1.59-1.71 ms at rest at the default fabric (K81, K298) and about 1.97 on the K111 test maze (K76); a frame 2.6-2.8 ms; fans 0.55-0.78 ms (0.78 with 5 routed webs, K81).
- **The dense preset** (gs 24, about 5448 particles) is render-bound at about 30 fps (K8's ledger entry).
- **Awake physics** costs 8-23 ms per substep (K279), so a wake is physics-bound: K7's problem, not G3's.
- **Open residuals G3/G4 inherit:**
  - G1's open items: (a) the GPU cost, about 2.2x master's, with four levers (a loop-free protect test, a zoom-aware polyline tolerance, a per-point far-branch gate, dropping the globals fetch); (b) the x160 merge-core tick (G4); (c) a fused tail riding its host is draw-order sensitive; (d) the silhouette-level cyclic triangle.
  - Joinery classes: V-notches, flank and tucked-tip spurs, pale stars, merge-core hairlines (the crescents went with the adaptive flanks).
- **Rendering setup:** `main.ts:391-396` sets `antialias: true` (MSAA), `preference: "webgl"`, `resolution: min(dpr, 2)` and `autoDensity`. The Pixel 11 (DSF 2.625) therefore renders at 2x.

---

## 2. DATA MODEL

### 2.1 Scene size at gs=18 (estimated from the code)

- **Thread length.** The lattice is 36×36 world units (doubled lattice). Two families of diagonal threads at spacing √2 give √2 world of thread per world², so about 1833 world units at lattice time. At `SAMPLE_SPACING` 0.09 that is about 20.4k samples.
- **Bridges.** About 40 bridges, each at `MIN_SAMPLES` 48, add about 1.9k samples. Total: **≈22k samples, ≈22k segments.**
- **The dense preset** (gs 24, `wd=0.6`): about 39-40k samples. It is the size the acceptance numbers in section 5 must survive.
- **Crossings.** 323 tree openings plus about 100 weave openings ≈ 420, minus merges and trims (K268's census counted 412 live slots on the K111 test maze). With 64 emergent and 4 marker slots: **≈480 slots.**
- **Joints.** 89-92 fused joints (measured at defaults). About 60-100 chains.
- **Coverage.** Ribbon coverage is about 60% of the lattice area (two families at width 0.52 and pitch 1.41, with overlaps).

### 2.2 Textures

All textures are page-lifetime (PALETTE_CACHE lore), NEAREST, read with `texelFetch` only, through `highp` samplers. **(K8 s1)** Every new float texture is a G2 `FloatRows` (`float_rows.ts`: RGBA32F, `ROW_W` 1024, grown in place, uploaded by the `knot-float-rows` dirty-row uploader, counted in `ROW_UPLOAD_STATS`). FloatRows needs no format parameter: SAMP packs two samples into one RGBA32F texel instead of using RG32F. Linear texel index → (i & 1023, i >> 10).

**New in G3/G4:**

| Texture | Content | Writer / cadence | Bytes at gs 18 |
|---|---|---|---|
| **SAMP** | texel `sampBase[c]/2 + j` = (x, y) of samples 2j and 2j+1. Each chain's base is even, so a chain starts on a texel. Values are `chainSamples` (flowed, tucked) rounded to float32. | `update()`, every chain while awake | 22k × 8 B = **176 KB per awake update** (dense ≈ 320 KB) |
| **RADII** | 4 radii per texel: h × widthMul, where widthMul = the reveal mask × the pluck base collapse × the swell | `update()`, only chains whose multiplier is not 1, dirty rows only; `setCollapse` writes its chain's rows | 0 at rest outside a reveal; ≤ 88 KB while every chain tapers |
| **G3 CHAIN** | 2 texels per chain: (sampBase, radBase or −1 for unit width, capStart, capEnd), (winBase, nWin, rangeBase, nRange) | `update()` | ~2 KB |
| **RANGES** | per-chain lists sorted by kLo: slot windows (slot, kLo − 1, kHi + 1, flags) replacing `aMaskId`; segment ranges (type CLUSTER/FOLD, kLo, kHi, payload) | `update()` / cluster build | ~10 KB |
| **YARN** (G3-5) | 4 texels per pass + a per-chain pass index | on yarn change; 1 texel per frame for the unspool clip | a few KB |

The G3 CHAIN texels hold only what G2's chain data lacks: KSTATIC's C0 already carries (nCtrl, closed, sampleCount, idxBase) and KGEOM's G0 (total, arcPer, fxDone, paintOn). They stay a separate table so that G3-0 changes no shader text: growing KSTATIC's per-chain stride would change the paint library's GLSL.

**Reshaped:**

| Texture | Content | Writer / cadence | Bytes at gs 18 |
|---|---|---|---|
| **GAP** (G1) | row per slot, about 24 texels: the header (texels 0-8 as today, with the point count and polyline frame replaced by a SAMP range), up to 8 chunk bounds (section 3.4), 2 protect range texels (a sample range per side instead of 19 copied texels), K268's 3 profile texels. Row 0's globals move to uniforms (G1's lever). | `update()`, `setVis`, `setShape`; row-partial (`knot-gap-rows`) | ≈412 live rows × 24 × 16 B ≈ **158 KB per awake update** (today ≈412 × 114 × 16 B ≈ 750 KB) |
| **RECORD** (fans today) | cluster records (section 3.5), K81's route blocks | gated rebuild | ~90 × ~70 texels × 16 B ≈ 100 KB |

**Read unchanged (G2):** KSTATIC (CHAINS, CTRLIDX, RUNS), KGEOM (per `update()`), KREVEAL, KPAINT (paint items, VIS items, the whole-chain flags), the `knotUniforms()` group. The arm strips (RGBA8 rows) stay until G4-2 deletes them.

**Gone:** the snapshot's AUX (FX has been per pixel since G2.1, and the width multiplier moved to RADII), its PAINT rows (G2.3) and the accent strip (G2.3).

### 2.3 Vertex and instance attributes

- **Ribbon.**
  - Static `aCorner` (4 vertices: side ±1, end 0/1) and a static 6-entry index buffer.
  - Per-instance `aSeg` = (global sample index of the segment start, chain), float32x2, `instance: true`.
  - `instanceCount` = Σ(closed ? n : n−1) ≈ 22k (dense ≈ 40k). That is 176 KB static, uploaded at scene build.
  - pixi 8.19 supports this: Geometry `instanceCount` plus Attribute `instance`; `GlEncoderSystem.draw` forwards `geometry.instanceCount`; custom-shader meshes are never batched.
  - Under the thread reveal, the vertex stage collapses a segment outside every VIS piece to a degenerate quad (K259's "draw only the visible range", G3-4).
- **Joint.**
  - Static unit octagon (8 vertices: direction + member selector, 18 indices).
  - The cluster is looked up by `gl_InstanceID` through a cluster list at the head of RECORD. There is no per-instance buffer, so no partial-upload hazard.
  - `instanceCount` = cluster count, set each rebuild.
- **Yarn.** Per-instance (host global sample, pass index), rebuilt when the yarn changes.

### 2.4 Uniforms and binding

- G2's `knotUniforms()` group (uKBase, uKFx, uKFx2, uKShape, uKInk, uKKnots[8], uKGamut, uKSect, uKPaint, uKPulse, uKReach, uKGold) is bound as it is today; the explore variants add uKExplore. Its clocks already live there, so G3 adds no time uniform.
- One more `UniformGroup`, `fabricUniforms`, holds what G2's lacks:
  - uHalf (h)
  - uPadPx (1.5)
  - uPxPerWorld (from `root.worldTransform` scale × renderer resolution; `uResolution` is also in pixi's global group)
  - uKMax, uBeta
  - the gap globals that row 0 of the gap texture holds today (G1's "drop the globals fetch" lever)
  - uYarn (amp, laneAmp, width, shadow offset)
- Every texture is bound through shader `resources`. Custom shaders ignore `mesh.texture` (RENDER LORE 2026-10-10). `bindGap`'s fan-out (the ribbon program, its explore variant, the field, the still pluck) becomes one binding list that also carries SAMP, RADII, G3 CHAIN and RANGES.

### 2.5 Per-frame upload while awake (gs 18)

| | Upload per awake `update()` |
|---|---|
| G3+G4 | ≈ 176 (SAMP) + 2 (G3 CHAIN) + 10 (RANGES) + 158 (GAP rows) + KGEOM (as today) ≈ **0.35 MB**, plus RECORD (~100 KB) on a fan rebuild and RADII rows while a reveal or a pluck collapse runs |
| Today | ≈ 1.5-2.2 MB: `aPosition` 352 KB + `aTan` 352 KB + GAP rows ≈ 750 KB + changed `aMaskId` chains (up to 704 KB) + fan vertex/index ranges + records + KGEOM |

Asleep with no flow, neither uploads anything: `update()` does not run while the knot sleeps. Under flow at rest, `update()` runs at half rate, so the awake numbers apply at half rate until G3-4's round-robin.

---

## 3. SHADERS

### 3.1 Shared library (`FABRIC_GLSL`, new module `src/render/fabric_sdf.ts`)

```glsl
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uSamp, uRadii, uG3Chain, uRanges;     // section 2.2; G2's KSTATIC/KGEOM/KPAINT come with the paint library
ivec2 rowXY(int t) { return ivec2(t & 1023, t >> 10); } // FloatRows ROW_W 1024
vec2 sampAt(int i) {                                    // global sample index; 2 samples per texel
  vec4 q = texelFetch(uSamp, rowXY(i >> 1), 0); return (i & 1) == 0 ? q.xy : q.zw;
}
float radAt(int radBase, int j) {                       // radBase < 0: unit width, no fetch
  if (radBase < 0) return uHalf;
  vec4 q = texelFetch(uRadii, rowXY(radBase + (j >> 2)), 0); return q[j & 3];
}

// Signed distance to the round cone (a,ra)->(b,rb) [iq uneven capsule];
// t = projection param on [a,b] (arc/colour), lat = signed lateral (+ = left).
float sdCone(vec2 p, vec2 a, vec2 b, float ra, float rb, out float t, out float lat) {
  vec2 ba = b - a, pa = p - a; float l2 = dot(ba, ba);
  if (l2 < 1e-12) { t = 0.0; lat = 0.0; return length(pa) - max(ra, rb); } // collapsed = disk
  float l = sqrt(l2); vec2 u = ba / l;
  float y = dot(pa, u); lat = u.x * pa.y - u.y * pa.x; float x = abs(lat);
  t = clamp(y / l, 0.0, 1.0);
  float s = (ra - rb) / l;
  if (abs(s) >= 1.0) return min(length(pa) - ra, length(p - b) - rb);   // one disk contains the other
  float c = sqrt(1.0 - s * s), k = c * y - s * x;
  if (k < 0.0)     return length(pa) - ra;
  if (k > c * l)   return length(p - b) - rb;
  return c * x + s * y - ra;
}
float aaCov(float a, float pxW) { return clamp(0.5 - a / pxW, 0.0, 1.0); }
float sminQ(float a, float b, float k) {               // C1 polynomial smooth min
  if (k < 1e-6) return min(a, b);
  float hh = max(k - abs(a - b), 0.0) / k; return min(a, b) - hh * hh * k * 0.25;
}
```

**Shared rules.**
- `pxW` comes from `fwidth(vPos)` at the top of `main()`, in uniform control flow (G1 lore).
- Every `texture()` after a branch or discard uses `textureLod(..., 0.0)`, as `FIELD_GLSL composeU` already does. Every texture here is NEAREST and read with `texelFetch`, so in practice this binds only the paint library's own reads.
- **Paint: G2's library, unchanged (K8 s1).** The ribbon and joint shaders call G2's paint library (`paint_glsl.ts`: `PAINT_FX_GLSL`, `PAINT_SECTION_GLSL`, `PAINT_PAINT_GLSL`, the CPU mirror in `paint_math.ts`). The caller contract is the strip's: chain, fractional ctrl, arc, side01 and pxArc. The SDF caller supplies them as follows.
  - ctrl: lerped by t between the two segment ends' ctrls (section 3.2).
  - arc = (k + t) · arcPer.
  - side01 = 0 at the left edge, exactly as `uv.y` is today. K328's opaque outer band and G2's `kRimAcross` read it.
  - pxArc = pxW · (|u.x| + |u.y|), with u the owning segment's direction. On a straight segment, that is exactly what `fwidth(arc)` gives the strip. It is not taken from `fwidth`, because the owner of a pixel (k−1, k or k+1) changes across a join. The residual on curves is checked in G3-2's paint census (≤ 2/255).
  - The section RGB is G2.2's per-vertex value at both segment ends (flat varyings), lerped by t: today's linear-in-arc Gouraud.
- **Radius:** `radAt` returns h × widthMul from RADII (the reveal mask × the pluck collapse × the swell), or `uHalf` for a chain whose G3 CHAIN texel flags it unit width.

### 3.2 Ribbon vertex shader (one instance = segment k → k+1 of one chain)

- **Neighbor fetch (ARC-WRAP lore).**
  - Closed chains wrap: `(k+n-1)%n`, `(k+1)%n`, `(k+2)%n` (non-negative operands only; `%` on negatives is undefined in GLSL ES).
  - Open chains clamp. A missing neighbor (k−1 < 0, k+2 > n−1) gets radius sentinel −1. **Never form a last→first chord on an open chain** (the Stage 7b phantom miter and the fourth arc-wrap bite).
- **Fetch per vertex.**
  - P0..P3 from SAMP: 2-3 texels, since a texel holds 2 samples. r0..r3 via `radAt`: no fetch for a unit-width chain, otherwise 1-2 texels.
  - The G3 CHAIN texels, plus G2's KSTATIC C0/C1 and KGEOM G0 (the strip's VS fetches those three today).
  - Binary-search the chain's slot-window list for windows covering [k, k+1]: up to 4 ids, and overflow → `gapOverflow`.
  - Binary-search the segment-range list for a CLUSTER entry (fetch its 1-2 member disks) and a FOLD entry (window lo/hi).
  - About 18 fetches per vertex, ×4 vertices per segment.
- **Paint at the segment ends (K8 s1).** ctrl at both ends comes from G2's `kCtrlOfArc(k · arcPer)` and `kCtrlOfArc((k+1) · arcPer)`. On a closed chain's seam (k+1 == n), add nCtrl to the end ctrl so the lerp does not run backwards. Both ends' section RGB (G2.2) go out as flat varyings. G2's wrap-pair varyings are not needed: they exist because the strip interpolates across the seam, and a per-fragment arc never does.
- **K259 early out (G3-4).** Under the thread reveal, a segment outside every VIS piece collapses to a degenerate quad (all four corners at P1), so the fragment shader never runs there. That is K259's "draw only the visible range" for free.
- **Footprint.** R = max(r0..r3) + uPadPx·pxW_world.
  - **Smooth segment** (no FOLD range, not an open end): trapezoid between the bisector lines at P1 and P2. With nSeg = left normal of (P2−P1) and m1 = normalize(leftN(P1−P0) + nSeg) (m2 likewise), corner = P_e + σ·m_e·R / max(dot(m_e, nSeg), 0.5).
    - The fold criterion guarantees turn angles ≤ ~0.26 rad here, so dot ≥ 0.99.
    - Adjacent quads share bisector edges exactly, so there are no gaps and no overlaps.
  - **Fold segment or open end:** capsule box from P1 − u·R·capStart to P2 + u·R·capEnd, width ±R. capStart/capEnd = 1 for a round cap or a fold, 0 for a flat cap.
- **Varyings.**
  - Geometry: flat vP0 = (P0, P1), vP1 = (P2, P3), vR, vIds, vSeg = (chain, k, flags, foldLo), vFoldHi, vJ0/vJ1 = (cx, cy, R, on), plus interpolated vPos. That is 8 vec4 + 1 vec2.
  - Paint: flat vCtrl (both ends), vSect0/vSect1 (RGB at both ends), and G2's vKC0/vKC1/vKG0.
  - Total: about 13-14 of the 15 vec4 that WebGL2 guarantees, which is tight.
  - On overflow, the fragment shader fetches KSTATIC C0/C1 and KGEOM G0 itself, 3 more fetches per fragment.
  - G3-2 queries `MAX_VARYING_VECTORS` on the Pixel's PowerVR before it chooses.

### 3.3 Ribbon fragment shader

```glsl
void main() {
  vec2 p = vPos; vec2 fw = fwidth(p); float pxW = max(max(fw.x, fw.y), 1e-5);   // uniform flow
  float t1, l1, t0, l0, t2, l2;
  // vP0/vP1/vR are the discs (P, h x widthMul), pinched (P', R') inside a fold window
  float a1 = sdCone(p, vP0.zw, vP1.xy, vR.y, vR.z, t1, l1);                     // own segment
  float a0 = vR.x < 0. ? 1e9 : sdCone(p, vP0.xy, vP0.zw, vR.x, vR.y, t0, l0);   // k-1
  float a2 = vR.w < 0. ? 1e9 : sdCone(p, vP1.xy, vP1.zw, vR.z, vR.w, t2, l2);   // k+1
  if (capFlatStart) a1 = max(a1, dot(vP0.zw - p, uDir));  // anchored tails keep Stage 7b's square cap
  if (capFlatEnd)   a1 = max(a1, dot(p - vP1.xy, uDir));
  float a = min(a1, min(a0, a2));           // the +-1 min makes width variation exact at joins
  if (isFold) { // safety net: argmin ownership over [foldLo, foldHi], a sliding 3-sample window
    for (j in window) { aj = sdCone(pinched j..j+1); if (aj < a1 - 1e-7 || (aj <= a1 && j < k)) discard; }
  }
  if (a > 0.5 * pxW) discard;                                          // cheap early out
  if ((vJ0.w > .5 && distance(p, vJ0.xy) < vJ0.z) || (vJ1.w > .5 && distance(p, vJ1.xy) < vJ1.z)) discard; // joint owns it
  float r = mix(vR.y, vR.z, t1);
  float cov = aaCov(a, pxW) * clamp(2.0 * r / pxW, 0.0, 1.0);          // no 1-px hairline at r -> 0
  // Paint reads the quad's own segment: across a bisector, (k, t=0, lat) == (k-1, t=1, lat).
  float arc = (float(k) + t1) * arcPer;                                // k < n: no wrap
  float ctrl = mix(vCtrl.x, vCtrl.y, t1);                              // seam unwrapped in the VS
  float side01 = 0.5 - 0.5 * clamp(l1 / r, -1.0, 1.0);                 // 0 at the left edge, as uv.y
  float pxArc = pxW * (abs(uDir.x) + abs(uDir.y));                     // = fwidth(arc) on a straight segment
  float keep = gapKeepAt(pxW, p, arc, uDir, vIds);                     // casings from the true SAMP centreline
  vec3 sect = mix(vSect0, vSect1, t1);                                 // G2.2's per-vertex Gouraud
  vec4 col = /* G2 paint library */ compose(chain, ctrl, arc, side01, pxArc, sect);
  finalColor = vec4(col.rgb, 1.0) * (col.a * cov * keep);              // premultiplied, as G1
}
```

**Paint reads the owning quad's segment, not the nearest of three.** On a bisector, segment k at t = 0 and segment k−1 at t = 1 give the same arc, and the same lateral distance (a bisector is equidistant from both lines). So ctrl, arc and side01 are continuous across joins, and the varyings need only segment k's two ends. The nearest-of-three min still sets the distance, and with it the edge and the AA.

**The thread reveal's port (K76).**
- Today `withExplore(SECTION_FRAG)` splices the VIS-item code into the strip shader at exact-once anchors (`explore_glsl.ts`: ANCHOR_DECL, ANCHOR_SURE, ANCHOR_BK, ANCHOR_MAIN, ANCHOR_PXARC, ANCHOR_KCTRL, ANCHOR_GAP). `paint_explore.test.ts` pins them.
- The SDF fragment shader either carries the same anchor strings, or `withExplore` takes a per-host anchor table. Either way, the test pins both hosts while the strip lives.
- K268's shaped cut (gap flag 4 SHAPED, the profile texels) lives in `gapKeepAt` and ports with it.
- This port is why G3-2 waits for the reveal chain (section 5).

**Why ownership holds.**
- For smooth segments, the bisector partition equals the nearest-segment partition as long as consecutive bisectors do not meet within R. On the concave side, the equidistant set of two lines is their angle bisector.
- For folds, explicit argmin ownership applies, with ties going to the lower index.
- **Fold detection (CPU, O(N), part of `update()`):**
  - Per sample, turn radius ρ = ((la+lb)/4)·cos(θ/2)/sin(θ/2) (the `RibbonMesh` formula).
  - Mark ρ < 1.2·(h·maxWMul + pad).
  - Expand each mark to ±W, with W = min(ceil((π·ρ + 2R)/spacing), W_max), where W_max = 2 ctrl in samples (the physics same-chain collision skip is ±2 ctrl, `forces.ts`). Beyond that, collision keeps a chain at least a width apart, so only AA fringes can touch.
  - W_max must also stay below kinkSep (at least 2.6 ctrl), so a self-crossing's two passes never share a fold window and are never Voronoi-split. They stay over/under via their slot.
  - Wrapping ranges on closed chains are split in two.

**The pinch: one-sided, as `RibbonMesh` today (K8 s1; Levi, 2026-10-13: "Pinching is probably better").** Inside a fold window, each sample's disc becomes:
- r_in = min(h, max(0.95·ρ, 0.3·h)), the strip's concave clamp (`innerCap`), with h the sample's radius;
- R' = (h + r_in)/2, centred at P' = P + n_convex·(h − r_in)/2.

The convex edge stays at h and the concave edge moves in to r_in, as on the strip. A symmetric shrink would pull the convex edge in by about 0.14 world at the P3.34 repro (ρ 0.13, h 0.26).
- The vertex shader computes (P', R') for its four samples, fetching P−1 and P4 in a fold segment. The window loop slides a 3-sample window, so each ρ costs one new fetch.
- side01 is measured about the shifted axis: 0.5 − 0.5·lat'/R'.
- Argmin ownership stays as the safety net. Below ρ ≈ 0.316h, the 0.3h floor leaves the concave sides overlapping, and the AA pads overlap anyway.
- Casings (section 3.4) still measure from the true SAMP centreline, as G1's do.
- K90's boundBend (off unless `__knotSplineBend(true)`) would make fold windows rare. G3 does not depend on it.

**Caps.**
- Free dead-end tips are round, automatically. The free-tip disc fans and their AXIS records go away (G3-3).
- Anchored tails are flat, which keeps Stage 7b.
- Fused ends until G4:
  - `tuckFusedTips`' tucked samples are zero-length cones, so the end is a round disk of radius h at the tuck point.
  - Today's cap cover disc already covers it: TIP_DISC_SCALE 1.06h, its rim clamped to 0.995h, and 0.99h behind the tuck. So G3 writes no width for it, and the snapshot's AUX 0.98 trick is gone.
  - G3-2's attributed diff checks this. G4-2 deletes both the tuck and the disc.

### 3.4 Gap slots referencing SAMP (`gap_mask.ts`, G3-1)

**Today's row** is GAP_TEX_W = 114 texels, and row 0 holds the globals. Writes are row-partial (`knot-gap-rows`, GAP_UPLOAD_STATS). The texels:
- t0: bounding circle and reject.
- t1: [arcScale, centerArc, period, strength].
- t2: [winNeg, winPos, hOver, nPts].
- t3: [capR, nProtNeg, nProtPos, flags (1 perp, 2 self, 4 SHAPED)].
- t4: [selfExcl, polyStartArc, polyStepArc, farK].
- t5: fades and center.
- t6: [underTan, margin scales].
- t7: protect intervals.
- t8: [margin, fade, sminK].
- 7 chunk chords (GAP_CHUNK 8).
- Up to 57 copied points [x, y, u].
- 2 protect blocks of 19 copied texels.
- K268's profile: 3 texels at GAP_PROF_BASE 111.

**New row (about 22-24 texels):**
- t0-t8: today's header. t2's nPts and t4's polyline frame (polyStartArc, polyStepArc) become a SAMP range: overBase, kStart, nPts, overClosed and overArcPer. Point j is `SAMP[overBase + wrap(kStart + j)]`, and its arc, used for self-exclusion, is (kStart + j)·overArcPer.
- Up to 8 chunk bounds [cx, cy, radius, firstPoint], 8 points per chunk, up to 64 points.
- 2 protect range texels: a SAMP sample range per side, instead of 19 copied texels each.
- K268's 3 profile texels, unchanged.
- Row 0's globals move to `fabricUniforms` (G1's lever).

Notes on the layout:
- `nPts = 0` means the marker disc: the "polyline" is the center, as `renderMarkerGaps` writes today.
- The CPU stops copying the over polyline and computes kStart/nPts from the over center ± reach, rounded outward. The over polyline is then the over ribbon's actual centreline, so the casing is concentric with the SDF over ribbon, about its true, unpinched axis.
- `arcScale` and the unit-circle `aArcPos` go away: the fragment supplies arc directly.
- `setVis` (K76 2b) and `setShape` (K268 s1) keep their texels and their row-partial writes.

**Search (exact, pruned):**
1. Compute the 1-8 chunk lower bounds `length(p − c) − r`.
2. Walk the chunks in INDEX order. Skip a chunk whose bound is at least the current best, respecting self-exclusion (a fully excluded chunk is skipped by its arc span). Keep today's sure2 early exit.
   - **Correction (K8 s1):** the snapshot said to take the smallest bound first. G1 measured center-out and best-first orders 8-10% slower, because the search is ALU-bound, so index order stays.
3. Over tangent from SAMP central differences (G1's blend).
4. Protect intervals become loop-free: one sample range per side, read in place.
5. The far-branch soft-min (G1 residual (2), the crease fix) belongs to K268 s2. G3-1 ports whatever lands, including its per-point far-branch gate.
6. G1's zoom-aware tolerance lever folds in here: at low zoom, the tolerance floor becomes one SAMP stride.
7. A brute-force debug mode (uniform) must give a 0 px diff (section 5, G3-1).

**Modes.**
- `gapKeepAt` (ribbons, joint pieces, yarn) is G1's ribbon branch, with K268's shaped cut and K76 2b's VIS anchors.
- `webSilhouetteKeep` is G1's junction-fan branch: `1 − clamp((d − hOver + pxW)/pxW + 0.5)`, inset 1 px. The fans keep it until G4-2.
- The still pluck (`bindPluckGap`, `gapKeepAt` with its own mask ids) and the fans bind SAMP once G3-1 lands. The still pluck reads ids from `idScratch` today. After G3-1 it reads RANGES' window lists, or the CPU fills `idScratch` from them lazily (section 4.2).
- G1's full fan mode (the projected window plus a footprint for free-tip caps) is deleted at G3-3, with the free-tip discs.

### 3.5 Joint clusters (`junction_field.ts` evolved; data + shader)

**CPU build** (inside the gated rebuild; runs when `update()` ran, a slider moved, or FX is hot):

1. Per fused joint: center c = mean of the arms' arc0 samples (no tuck in G4, so this is the fused point). Arms are (chain, k0, dir) as today.
2. **k_max** = c_cal · h · max(0, 1.25·cr − 1). This matches the old fillet's along-edge extent L − h; calibrate c_cal (start at 1.0) by A/B. cr 0 means a hard union.
3. **Radii.**
   - R_web = h + 2.5·k_max.
   - R_sep = the radius where every angularly adjacent arm pair's centerlines are at least 2h + 2·pad apart. This is a sample walk. Its cap R_cap is 3 ctrl (the JunctionCover span: physics *relies* on the joint rendering arm overlap there).
   - R = max(R_web, R_sep) + pad, capped at R_cap.
   - R_out = 0.9·R, R_in = 0.5·R_out.
4. **Piece ranges.** Walk each arm outward until its centerline is at least R + R_capsule + 2·spacing from every member center, or reaches the chain end. Out-of-range segments then cannot cover any pixel inside the disk, which keeps the ribbon gate consistent at range boundaries.
5. **Clusters.** Union-find on (disks overlap) or (ranges collide on a shared chain). Cap at 2 members; if a third would join, shrink R of the offending member and redo.
6. **Pieces.** Per chain, merge ranges into pieces. Role is THROUGH or END (the range ends at a fused terminal). Chunk bounds every 8 samples.
7. **Wedges.**
   - Arm angle profile: 8 radii, angles only, replacing the 23-texel `FIELD_PROF_DR` profile.
   - wedgeGain per angularly adjacent arm pair, default 1. Reduced near a diving arm: k_wedge ≤ max(0.3·k, gapNear − h·`FILLET_GAP_PAD`). This keeps "JOINERY HONORS THE WEAVE" (today's `armReach`).
   - rootWMul per arm (reveal).
8. **Slots** (up to 8). Slots whose under chain is a piece chain and whose window meets the range inside a disk get mode CASING (applied to that piece). If the over chain is foreign (not a piece chain within reach: G1's `ownArm` in `ribbon_renderer.ts`), the slot also gets mode SILHOUETTE (applied to the web).
9. **RANGES.** CLUSTER entries (chain, kLo, kHi, rec) for the ribbon gate.

**Record layout:**
- Head: [nMem, nPiece, nSlot, flags], [k_max, beta, –, –]
- Per member (up to 2): [cx, cy, R, nArms], [R_in, R_out, armBase, –]
- Per arm: [piece, k0, dir, wedgeGainToNext], [rootWMul, –, –, –], 2 texels of 8 profile angles
- Per piece (up to 4): [chain, base, kLo, kHi], [count, closed, arcPer, role], up to 8 chunk texels
- Per slot: [id, mode bits, pieceIdx, –]

That is about 60-80 texels per cluster.

**Fragment shader:**

```glsl
void main() {
  vec2 p = vPos; vec2 fw = fwidth(p); float pxW = max(max(fw.x, fw.y), 1e-5);
  Cluster C = cluster(int(vRec + 0.5));
  if (!insideAnyMemberDisk(C, p)) discard;
  // (1) exact piece SDFs (same sdCone + radii as the ribbon pass), chunk-pruned
  for i < nPiece: a[i] = pieceSDF(C, i, p, kp[i], tp[i], lat[i]);     aMin, aThr = min over THROUGH pieces
  // (2) web: per member, the sector's bracketing arms at radius |p-c| (profile angles);
  //     fillet only between DIFFERENT pieces (the pass-through side of a host = same piece = no bulge)
  float D = aMin;
  for each member mm: { bracket(C, mm, p, ia, ib, gain); int i = piece(ia), j = piece(ib);
     if (i != j) D = min(D, sminQ(a[i], a[j],
         C.kMax * gain * (1. - smoothstep(Rin, Rout, rho_mm)) * min(rootW(ia), rootW(ib)))); }
  if (D > 0.5 * pxW) discard;
  // (3) coverage: pieces with full casing; web = extra coverage beyond the hard union, silhouette-cut
  float covArm = 0.; for i: covArm = max(covArm, aaCov(a[i], pxW) * pieceKeep(C, i, pxW, p, arc_i, tan_i));
  float cov = clamp(covArm + max(aaCov(D, pxW) - aaCov(aMin, pxW), 0.) * webKeep(C, pxW, p), 0., 1.);
  // (4) colour: through pieces own their footprint (end piece colour SDF ac = max(a, -aThr));
  //     edge-aware blend between nearest m and its sector partner q; envelope -> 0 at R_out
  float g = max(ac_m + ac_q, C.beta);
  float tb = smoothstep(-1., 1., (ac_m - ac_q) / g) * (1. - smoothstep(Rin, Rout, rhoNearest));
  vec4 col = mix(paintAt(m...), paintAt(q...), tb);   // G2's paint library per piece: composed colours (RENDER LORE)
  finalColor = vec4(col.rgb, 1.) * (col.a * cov);
}
```

Notes on the joint shader:
- **Ownership.**
  - Ribbon pixel of chain c on segment k: discarded iff k is in a cluster piece range and p is inside a member disk (vJ0/vJ1).
  - Joint pass: draws exactly those pixels plus web pixels.
  - Ranges overshoot the disks (step 4), so the partition is exact. Foreign chains crossing a domain stay with the ribbon pass.
- **Exact hand-off.** At ρ ≥ R_out, k = 0 makes D = aMin, so the web term is 0. The colour envelope is 0, so the colour is the nearest piece's `threadColor` at the same (k, t, side) the ribbon pass uses. Coverage and colour are therefore equal on both sides of the disk edge, and each pixel has one writer.
- **The blend formula.** g = max(a_m + a_q, β) turns the transition into "across the gap between ribbon edges" when both pieces are outside, and a β-wide band in the overlap core. Inside a piece away from others it is pure that piece. This is the edge-aware field's intent, now in SDF form.
- **End-piece clip.** It reproduces the fused-tip lore: the bridge's material never paints the host's face, so a traveled gold host is not bitten at junctions.
- **Case coverage.** 3-way splice and corner fused 3-way = through + end. 4-way merge = 2 through. Self-crossing merge = 2 through pieces on one chain.
- **Reveal and FX.** An unrevealed arm has r → 0 and k scales by rootW, so the web vanishes with its arm. Materialize alpha and stripes come from each piece's own material, per pixel through G2's library. This replaces what the arm strips carry today (per-frame RGBA8 rows of composed colour, read by the fans) and the fans' `PAINT_GATE_GLSL` gate.
- **smin choice.** Polynomial quadratic first; a circular-profile smin is the alternative. Decide by crop A/B at cr 1, 3, 6 (K9).

**What the joint program carries (K8 s1).** Since the snapshot, the fans have gained features, and G4-1 ports each of them. Each gets its own check in G4-1's acceptance (section 5).
- **K81 route bands.**
  - What it is: the route block (R0 = nv, m, ia, ib; MAX_ROUTES 4), which arms the path joins, and the band's corner (`junction_routes.ts`). It reads the composed and untraveled strip rows today.
  - Carrying it: the bands become a term in the colour step. The route block moves into the cluster record.
  - Kept: `cpuJunctionField` and `fieldProbe.at` / `.routes` stay as the CPU mirror and probe hooks. G4-0 brings them to records v2.
- **K127, fully traveled webs:** a web whose arms are all traveled paints traveled. "Webs carry the route as the union of the traveled pieces" (K9).
- **K169, the gold web's fade-in** (`web_fade.ts`, 0.25 s): a per-cluster clock, unchanged.
- **K345, the hover rim through the webs.** The piece SDFs give a lateral coordinate inside a web, so `kRimAcross` can run there. Today's `rimGap` 0.975 exists only because webs and arm strips have no across coordinate. It becomes 0 in webs, and the rim continues through the junction. This is confirmed for G4-1; fan work on K345 now would be thrown away at G4-2.
- **K76 2b, the thread reveal's joint gate:** `exploreHideJn`, `exploreHideFree` and `exploreJointsKey` gate each cluster as they gate each fan today.
- **K268 s2 and K290.**
  - K268 s2 fades a joint and its cap through premultiplied strip alpha, and puts the shaped-cut anchors in the fans and the still pluck.
  - K290's burn reverses the shaped cut, makes the fans drop an arm, and shrinks the visibility (`docs/design/K114_burn.md`, "The stages").
  - Both land on the fans first. G4-1 ports them as the piece and web terms of a hidden or burnt arm (rootW → 0, the shaped cut in `pieceKeep`).
- **The high-contrast looks (K111 s5 / K265, `kHcCompose`)** go through the same library calls, so the joint program gets them with no extra work.


### 3.6 Yarn pass (host frame)

- **Instances.** (host segment, pass) pairs, in lay order, so a later pass's shadow falls on earlier passes.
- **Footprint.** The host bisector quad widened to R_y = max(h, maxOffset) + yarn width + shadow offset + pad. Fold segments use a capsule plus argmin, as in the ribbon.
- **Fragment.**
  - Nearest host point (same 3-cone code) → arc, lat, T, N.
  - Pass texels (arc0, arc1, clipArc, lane, f1..f3, p1..p3) evaluate today's `pushYarnEvent` wander analytically: `o(arc)` and `o'(arc)` with the end window.
  - Band: dist = |lat − o| / sqrt(1 + o'²) → `aaCov(dist − w/2)`.
  - Shadow: the same at (arc − S·T, lat − S·N).
  - Compose shadow then yarn, then multiply by `gapKeepAt` with the **host's** slot windows at that arc.
- **Junctions.**
  - U-turns get a "turn" instance: a half-ring SDF in (arc, lat) at arc_end + overshoot/2.
  - Pass-through continuations taper the lane bias to 0 at pass ends (a small look change) so the round end caps of consecutive passes meet at the junction.
- **CPU side.** The CPU keeps only the event list (chain, c0, c1, seed params). Ctrl → arc via `arcForCtrl` each frame.
- **Tension.** Tension changes amp/laneAmp uniforms only (live).
- **Today's yarn (K8 s1)** is a pixi `Graphics` (`fabric_maze_renderer.ts` `drawYarn`): Chaikin-smoothed points from `pointFlowed`, cut on the CPU by `ribbons.underGapVisibility`.
  - The SDF pass rides the drawn samples instead: the flow and the exact spline. It gets the GPU's exact cut.
  - There is no pluck ring to ride any more. Plucks are render-only (`pluck_overlay.ts`), and the yarn does not follow them today either.
  - `pointFlowed` stays for the fog, the markers and the hit tests. This is K23's "yarn as a gap-masked ribbon".

### 3.7 Fragment-cost model and levers

**Pixel counts.**
- Fabric region = 36×36 world.
- Ribbon-pass fragments ≈ 0.73 × region: 1.05× pad, +13% crossing double-raster, plus gated domain pixels.
- Joint fragments at cr 3 ≈ 0.31 × region: ~90 octagons, R ≈ 1.15. At cr 1 this is about 0.12.

The phone is Levi's Pixel 11 (K8 s1; the snapshot assumed an iPhone). It has a PowerVR CXTP-48 GPU and runs Chrome 154. Its layout viewport is 411×753 at DSF 2.625. The app's renderer runs at min(dpr, 2) (`main.ts` init), so the canvas is 822×1506.

| Screen | Canvas | px/world | Region | Ribbon frags | Joint frags |
|---|---|---|---|---|---|
| Desktop probe | 3200×1800 | ~46 | 2.7 MP | 2.0 M | 0.85 M |
| Pixel 11 at the app's 2x cap | 822×1506 | ~21 | 0.57 MP | 0.42 M | 0.18 M |
| Pixel 11 native 2.625x (cap lifted, K22) | 1079×1977 | ~28 | 1.02 MP | 0.74 M | 0.32 M |

**Per-fragment work** (fetch = one 8-16 B `texelFetch`; ALU ≈ scalar ops):

| Pass part | Share of fragments | Fetches | ALU |
|---|---|---|---|
| Ribbon base: 3 cones, caps, gate, AA | 100% | 0 | ~80 |
| Ribbon colour: G2's paint library | ~75% | as today's strip shader | as today's strip shader |
| Ribbon gap (chunk-pruned, 1.2 slots avg) | ~45% | ~18 per slot | ~200 per slot |
| Ribbon fold argmin and pinch | <1% | ≤30 | ≤400 |
| **Ribbon average, excluding colour** | | **~10** | **~190** |
| Joint: disk test | 100% | 1-2 | ~15 |
| Joint: 2-3 piece SDFs (~10 segments each) | ~90% | ~25 | ~300 |
| Joint: brackets + smin | ~90% | ~4 | ~90 |
| Joint: masks + 2 colours + blend | ~60% | ~18 | ~210 |
| **Joint average** | | **~40** | **~490** |
| Ribbon VS (~88k vertices at gs 18) | | ~18 per vertex | ~150 per vertex |

The colour row is the same library code that the strip's fragment shader runs today, per covered pixel. It is a constant in the G3-2 A/B, not a new cost. Only the SDF terms are new.

**Totals per frame, excluding colour.**

| Screen | Fetches | ALU |
|---|---|---|
| Desktop | ≈ 55 M | ≈ 0.8 G |
| Pixel at 2x | ≈ 11.5 M | ≈ 170 M |
| Pixel at 2.625x | ≈ 20 M | ≈ 300 M |

**Calibration (re-based, K8 s1).** Today's fabric GPU cost on the desktop at 3200×1800:
- the ribbon program, 1.59-1.71 ms (K81, K298);
- the fans, 0.58 ms, or 0.78 ms with 5 routed webs (K81);
- the strip pass, 0.06 ms (G2);
- in all about 2.3-2.5 ms, in a 2.6-2.8 ms frame.

G1 measured 2.83 ms for its brute-force version, before the pruning and G2. So:
- G3+G4 ≈ **2.2-2.8 ms desktop.** That is about today's cost, while deleting the CPU geometry work (update() 5.7 ms on the desktop and 15 ms on the phone after G1) and the artifact classes.
- **Pixel ≈ 2-3 ms at 2x**, if its PowerVR runs this mix 4-5x slower than the desktop GPU. The ratio is a guess:
  - Chrome on the Pixel exposes no GPU timer query, so it is measured as frame time, with G3-0's `__knotBench(n)` (`gl.finish` around n renders).
  - The baseline is today's 60 fps at rest at defaults. The dense preset is render-bound at about 30 fps.
- **Budget:** at most 4 ms GPU at the 2x cap for the whole fabric at cr 3 on the Pixel, and 60 fps held at defaults.

**Optimization levers, by expected payoff:**
1. Joint early-outs: octagon per member; chunk lower bounds before full piece SDFs; skip colour and masks for discarded pixels. Expected −30-40% of joint cost.
2. Chunk-pruned exact nearest search for slots and pieces (built into G3-1/G4-1). Expected −60-75% of the gap loop vs G1's brute force.
3. `mediump` (fp16; most mobile GPUs, PowerVR included, run it at a higher rate) for colour, compose and blend math. Distances and positions stay `highp`. Verify the rate on the Pixel before relying on it.
4. Skip RADII fetches on unit-width chains (the G3 CHAIN flag; already in the data model, section 2.2).
5. Slot header packing (9 → about 5 texels).
6. Asleep-flow round-robin re-solve (CPU; G3-4).
7. Render-on-demand when fully static: asleep, fw 0, no paint animation, camera still.
   - This is K24, part of K6, not G3's work. The hook exists: `main.ts`'s "K24/K6 HOOK", with `sceneAnimating()` and `background.needsFrame()`.
   - The loop that stops drawing waits on K6's what-changed flags.
8. Resolution policy: keep the 2x cap. K22's frame-time-driven scaler (2 → 2.5 → 3x) comes after G3, since analytic AA makes extra resolution pure crispness.
9. Smaller R at small cr; cap R_sep.
10. K259, the thread reveal: the vertex shader collapses segments outside every VIS piece (section 3.2, G3-4).

**Not levers (K8 s1).**
- Moving the flow to the GPU (displacing SAMP in the vertex shader) stays deferred. The CPU flow runs at half rate at rest, and an A/B would have to track the gaps.
- G5 (moving the physics to the GPU) is still not recommended. K7's worker took the physics off the main thread instead.

**MSAA.** Keep `antialias: true`: it is cheap on tile-based GPUs (PowerVR is one), and the markers and Graphics need it. Ribbon and joint quad edges sit in zero-coverage pad, so MSAA neither helps nor hurts them.

---

## 4. WHAT GETS DELETED, AND WHICH INVARIANTS STILL APPLY

### 4.1 Deleted

**G3 (most of it at G3-3, after Levi's phone check of G3-2):**
- `RibbonMesh.update`, with all its miter, open-leg, zero-length-leg, P3.34 concave-clamp and swell-clamp logic (`ribbon_mesh.ts`).
- `RibbonMesh` itself:
  - its per-vertex aPosition, aUV, aKey, aArcPos, aTan and aMaskId buffers, and their writers;
  - the ~60-100 per-chain meshes.
- The strip program: `section-rgb` (`SECTION_VERT/FRAG`, about 46.8k characters, a 2.8 s cold FXC compile) and its lazy `section-rgb-explore` variant. K307's registry drops both.
- `GAP_VERT_DECL/MAIN`.
- `gap_mask.ts`' copied texels:
  - the polyline points (up to 57 [x, y, u]) and the 2 protect blocks of 19;
  - `GAP_TEX_W` goes from 114 to about 24 (section 3.4).
- `buildPoly(fineO)` / `FINE_SPACING`.
- `assignGapIds`' per-sample 4-component packing. It becomes window range lists (RANGES).
- The unit-circle arc encoding (`aArcPos`, `arcScale`).
- G1's full fan-mask mode.
- The free-tip disc fans and the AXIS record type.
- At G3-5 (K23): `drawYarn`'s Graphics strokes, Chaikin smoothing and alpha buckets.

**What G3 keeps that the snapshot deleted (K8 s1):**
- `underGapVisibility` stays: the pluck host's `visibility` uses it (pluck rule 3). The yarn stops using it at G3-5.
- `underWindows` stays because G4's gapNear uses it.

**G4 (at G4-2):**
- `TriFanMesh` (`ribbon_mesh.ts`).
- `rebuildFillets`' geometry:
  - the discs (`DISC_*`, `TIP_DISC_SCALE`);
  - the wedges (`FILLET_EDGE_*`, `FILLET_BEZIER_STEPS`, `FILLET_CORNER_LIM`, `FILLET_MAX_WEDGE`) and the `flankPts` cache;
  - the layer votes (armTop/armDives/overNear/underNear, `FILLET_DIVE_NEAR`) and `filletTopLayer`/`filletTopMesh`;
  - the arm-reveal gate.
- The arm strips (`arm_strip.ts`: per-frame RGBA8 rows of composed colour) and the `arm-strip` program (1.7 s cold FXC).
- K81's cover strips (`COVER_STRIP_PTS` 32, `fm.pushStrip`). They read `RibbonMesh.vertices` today. Between G3-3 and G4-2 they need a small pure extrusion helper (section 4.2, dependents).
- `tuckFusedTips`, `chainTipFused`, `fusedTips`.
- `JUNCTION_VERT/FRAG` (the `junction-field` program) and the angular `junctionField` per-arm lookup.
- `cpuJunctionField` is rewritten as `fieldProbe` v2, a line-for-line transliteration of the new joint shader. It keeps K81's `fieldProbe.at` / `.routes`.

### 4.2 Hard-won invariants, stated for the new world

1. **Blend composed colours, never paint inputs from different sources.** G2 retired the palette strip, so there is no U to lerp. Joint blends mix the paint library's composed outputs (RENDER LORE).
2. **Never destroy textures mid-session.** SAMP, RADII, G3 CHAIN, RANGES, GAP, RECORD and YARN are page-lifetime, grown in place.
3. **Float data textures:** RGBA32F `FloatRows` (G2), NEAREST, `texelFetch` only, `highp sampler2D`, no premultiply on upload, the row uploader registered before the renderer exists. `source.update()` uploads synchronously mid-tick.
4. **Custom shaders ignore `mesh.texture`.** Bind through shader resources, with `bindGap`'s one binding list (section 2.4).
5. **Partial buffer uploads remember their size.** The ribbon's `aSeg` instance buffer is static per scene. The only mutable buffer left is the yarn's instance buffer: upload explicit sizes every time. Joints use `gl_InstanceID` and have no buffer.
6. **Arc-wrap family.** Open chains clamp and map over count−1 segments; closed chains wrap. This applies to the VS neighbor fetch, arc = (k+t)·arcPer, the ctrl lerp's seam unwrap, slot point arcs and piece ranges. No last→first chord on open chains, ever.
7. **Flat fills cannot represent a field; overlays must match ribbons across the whole width.** G4 pieces use the ribbon's own paint call at the ribbon's own nearest point. Certify with `fieldProbe` v2 (field vs ribbon), excluding true overlap.
8. **Render reach quotes rendered geometry (P3.36/P3.38/P3.40).** Required coverage (the over silhouette) is never reduced. A gap boundary may be truncated but never extended past its solved exit. In G3:
   - the casing measures the over ribbon's own samples, from its true centreline;
   - the pinch thins only the concave side, as the strip does today, so the casing is never narrower than the over ribbon.
9. **Junction clearance (fix A)** stays CPU-side as is. jointClear = max(1.1h, 0.55·L) + gap + CUT_BIAS, with L redefined as G4's web along-arm reach (calibrated equal to the old 1.25·h·cr). It caps only margin (floor 0.5) and fade (floor 0.45), never the march.
10. **Foreign over silhouette only, inset 1 px, for webs.** Full casing for piece material. Own-arm over slots are not listed.
11. **The JunctionCover theorem (P3.31 again).** Physics fades the anti-riding floor within ±3 ctrl of a joint because the joinery renders that overlap. G4 must keep owning it: R ≥ R_sep up to that span.
12. **A distance mask needs a window, self-exclusion and connectivity** (G1). Unchanged: CPU windows and connected-overlap marches; self-exclusion now uses sample arcs.
13. **`fwidth` in uniform control flow; discarded fragments get no MSAA.** All edges carry analytic AA.
14. **No sawtooth seam inside a fill (P3.34's real invariant)** holds by ownership. The look stays the strip's: Levi chose the pinch (2026-10-13), so an over-tight fold thins on its concave side as it does today. Argmin ownership only cleans up below ρ ≈ 0.316h (section 3.3).
15. **A census must measure the pipeline it certifies (P3.24, render edition).**
    - `fieldProbe` v2 and a new `ribbonProbe` (a CPU transliteration of the ribbon FS) read the same mirrors.
    - The paint terms are certified by G2's own CPU mirror (`paint_math.ts`).
    - G3-3 ports the G1 census and `probe_samestate` off `fills[].vertexData`.
16. **Flow is render-only and physics is never touched.** At fw = 0 asleep, `update()` does not run and nothing uploads.
17. **No thread-thread contact without a dark line (P3.39 user standard).** Casings are unchanged.
18. **Section colours are G2's (G2.2).** The snapshot's cache-drift re-bake (`CACHE_REBAKE_CTRL`) is gone. G3 reads the same per-vertex section values, at both segment ends.
19. **PROBE LORE stands (`.claude/rules/probes.md`).**
    - Pin the paint clock: since G2 it lives in `advanceClocks()`, so pin `r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0`.
    - Park the pointer. Use unique scratchpad subdirectories and check the stamp's SHA. Layers are reset each frame. The URL rewrite drops `#hash`.
    - A bare URL is today's daily, with a saved attempt, so probes pass a query (`?<seed>&am=instant&snd=none`).
    - Hold the perf lock for every pixel-exact GPU probe, not only for timings, and record `webglcontextlost`.
20. **The physics moves into K7's worker (new since the snapshot; stages 3-5, section 1.1).**
    - With the worker on, the renderer reads the mirror: exact at rest, and while awake the newest snapshot or, if K7 stage 3 keeps it, an interpolation at now − D.
    - A same-state A/B therefore freezes the physics. In-thread (today, or `&phw=0` once stage 3 adds it): the freeze patch `__knotPS().step = function () {}`. Under the worker: `__knotPhysFreeze(on)` (K7 stage 4), which resolves once a snapshot shows the freeze. `&phy=0` turns physics off for a deterministic layout.
    - Neither G3 nor G4 touches `src/physics/`.
21. **Dependents of the strip (K8 s1).** Each needs its replacement before the strip goes at G3-3.
    - The pluck host's `visibility` stays on `underGapVisibility`.
    - The still pluck reads per-sample gap ids from `idScratch`. The CPU fills them lazily from RANGES' window lists, or the still pluck reads RANGES itself.
    - `setCollapse` writes its chain's RADII rows instead of re-extruding (`reextrude`).
    - The still pluck and the fans bind SAMP after G3-1. Coordinate with K344 and K279, which work in `pluck_overlay.ts`.
    - K81's cover strips need the extrusion helper until G4-2.

---

## 5. STAGED PLAN (each stage lands end-to-end working on master)

**Re-cut by K8 s1 for master d741412.** Each stage names its files, what it stays out of, its tests and A/Bs, and its acceptance numbers. While K7's stages 3 and 4 own `main.ts`, no stage needs a line there: every hook hangs off `__knotRenderer()` (main.ts ~4829).

### 5.0 Common recipe pieces

**Links.** Every probe link passes a query (a bare URL is today's daily, with its intro and a saved attempt) and pins `am=instant&snd=none`. Same-state A/Bs add `fw=0` unless flow is the subject.
- fabric at defaults: `?b`
- dense (5448 particles, render-bound at about 30 fps): `?b&gs=24&wd=0.6&brd=0.6`
- knot mode: `?7k&mf=0`
- fat: fat threads `?b&tw=.64`; G1's fat knot `?p9ar6&mf=0&rep=.4&bd=1.75&sm=.7&tw=.52`
- the thread reveal: `__knotExplore({ on: true })` after load (the K76 stage 2a hook, main.ts 5449), or K76 2c's link key once it lands
- a daily: `?daily=<n>&snd=none` on a fresh profile, captured after its intro. `am` is not a `DAILY_EXEMPT_KEYS` entry, so `&am=instant` turns it into an ordinary design with the same maze; use that only as a labelled fallback.
- G1's set (`.claude/probes/g1/urls.mjs`: user, userGap, userThin, ring, def, defU, knot, fat, fatGap, kink) for the casing census. Its `s=` links read today's defaults plus their overrides (K132).

**Same-state cross-build A/B (K8 s1).** G3-0 adds `captureScene()` and `restoreScene(s)` to `RibbonRenderer`, reached as `__knotRenderer().captureScene()`. No main.ts lines.
- The physics part can reuse `snapshot.ts` (`writeSnapshot` / `readSnapshot`: what K7's worker ships the renderer), or copy the arrays the renderer reads from its `ps`. The rest is what `update()` reads besides: the emergent list, the gate latches and `gateCache`, `flowTime`, the paint clocks, the reveal and explore state. G3-0 lists what `update()` reads and proves the capture complete: capture, restore on the same build, 0 px. Both builds of an A/B need the hook, so it serves from G3-1 on; G3-0's own A/B against master uses `phy=0` layouts.
- Freeze the physics first. In-thread (the default until K7 stage 5): `__knotPS().step = function () {}`. Under `phw=1`: `__knotPhysFreeze(on)` (K7 stage 4). Results name the host.
- Pin the clocks: `r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0`. Park the pointer.
- The pattern to copy is `.claude/probes/K83/k83_ab.mjs`. Serve both builds with `scripts/preview.ps1 -Port <p> -Ref <commit>` on separate ports and check each page's stamp SHA.
- Hold the perf lock for every pixel-exact GPU probe, and record `webglcontextlost` (invariant 19).

**Same-build A/B.** A switch on the renderer (`r.rp = "strip" | "sdf"`, `r.jp = "fans" | "sdf"`) flips the pass on one frozen state. The escape-hatch link keys (`rp=strip`, `jp=fans`) are read from `location.search` when the module loads, because the URL rewrite drops keys the codec doesn't know. They never enter `PARAM_DEFAULTS` or the codec.

**Timing.**
- CPU: `.claude/probes/g1/probe_perf.mjs` and `.claude/probes/probe_cpuprof.mjs` (`update`, `tickPaint`, the gated rebuild).
- Desktop GPU: `.claude/probes/probe_gpudraw.mjs` at 3200×1800, per program.
- Pixel 11: Chrome there exposes no GPU timer query, so G3-0 adds a frame bench, `scripts/bench_frame.mjs` (tracked, since every later stage reuses it). It is probe_gpudraw's pattern with `gl.finish()` in place of the query: wrap the context's draw calls, take the time at a frame's first draw, and call `gl.finish()` in a rAF callback queued after the app's render. It needs no app code: `RibbonRenderer` holds no reference to the Pixi app (its constructor takes `(ps, style)`). Wrap the instanced draw calls too, because G3-2's ribbons and G4-1's joints draw instanced. Reach the phone over CDP with `scripts/phone.ps1 [-Wireless] [-Ports <p>,<q>] [-Url <link>]` and `.claude/probes/phone_probe.mjs`. Alternate the builds (A B A B), because the phone throttles over minutes. `update()` on the phone is timed the way `probe_perf` wraps it.
- Cold compiles: `.claude/probes/K307/trace_intro.mjs` on a fresh profile (section-rgb 2.8 s today).
- Upload bytes: `ROW_UPLOAD_STATS` (every `FloatRows` instance, G2's and G3's alike), `GAP_UPLOAD_STATS`, and G3-0's `SAMP_UPLOAD_STATS`, the share of G3's own tables.
- GL readback: `.claude/probes/probe_texreadback.mjs`, extended to SAMP, RADII, G3 CHAIN and RANGES.

**Shader status line.** Compile and link failures show on the page, because a phone has no console. That is one main.ts line (the stamp), so it lands with G3-2, after K7 stage 4.

### 5.1 G3-0: the data plane, no visual change. Ready now (K8 s1)

- **Files:**
  - new `src/render/samp_table.ts`: pure packers for SAMP, RADII, G3 CHAIN and RANGES (no Pixi), and `test/render/samp_table.test.ts`;
  - `ribbon_renderer.ts`: the textures (G2's `FloatRows`, page-lifetime), their writes in `update()`, `captureScene` / `restoreScene`, and a `g3Data` switch (default on) so one page can time the writes on and off;
  - new `scripts/bench_frame.mjs`, the frame bench (section 5.0).
- **Stays out of:**
  - `main.ts` (K7 stages 3-4);
  - `src/physics/*`;
  - every GLSL string, so no program changes and K307's registry is untouched;
  - `pluck_overlay.ts` (K279 stage 2);
  - `paint_*.ts` and `explore_glsl.ts` (the reveal chain).
- **Work (section 2):**
  - SAMP: `chainSamples[c]`, two samples per texel, chain bases even-aligned;
  - RADII: h × widthMul per sample, four per texel, only for chains whose widthMul isn't all 1 (the others get the unit flag);
  - G3 CHAIN: two texels per chain (section 2.2), with nRange 0 for now;
  - RANGES: per chain, the slot windows `assignGapIds` packs per sample today, as sorted sample ranges. Only the slot windows: the FOLD ranges arrive with G3-2 and the CLUSTER entries with G4-0;
  - dirty rows only. Asleep at fw 0, `update()` doesn't run, so nothing uploads.
  - No `FloatRows` format parameter: two samples per RGBA32F texel fit G2's rows as they are.
- **Tests:**
  - packing: even alignment, two samples per texel, four radii per texel, the unit flag, row partials;
  - neighbour indices: closed chains wrap, open chains clamp, never a last-to-first chord (invariant 6);
  - the window lists reproduce `idScratch`'s per-sample ids exactly, on fixtures cut from real scenes;
  - SAMP decodes to `chainSamples` bit for bit in float32;
  - `npm test` green, the golden byte-identity test untouched.
- **A/Bs:**
  - cross-build, master against G3-0: 0 px on a daily, a fat design, the thread reveal on, dense, the default fabric and knot mode. Master has no capture hook, so these load with `phy=0` (K83's deterministic layout) and the clock pins;
  - physics on, on the G3-0 build: capture, restore into a second page, 0 px. That certifies the hook that G3-1's cross-build A/Bs rely on;
  - GL readback of the four textures against the packers: max |Δ| 0.
- **Acceptance:**
  - `update()` at most +0.3 ms on the desktop (fabric default and dense) and at most +1 ms on the Pixel;
  - upload bytes per awake update: G3-0 adds SAMP, G3 CHAIN and RANGES, about 0.19 MB at the default fabric (section 2.2: 176 + 2 + 10 KB) and about 0.35 MB dense, on top of today's uploads, which shrink at G3-1 (the GAP rows) and G3-3 (the strip's buffers). RADII adds rows only while a reveal or a pluck collapse runs. Measured by `SAMP_UPLOAD_STATS`; 0 B asleep;
  - capture and restore on one build: 0 px.
- **Phone pass:** record the Pixel's caps (`MAX_VARYING_VECTORS`, the highp ranges, the real renderer via `WEBGL_debug_renderer_info`) and master's frame-bench numbers at the default fabric and dense, as G3-2's baseline.
- The brief is "Stage 2 (G3-0)" in `docs/design/K8_stage1.md`.

### 5.2 G3-1: gap slots reference SAMP, chunk-pruned search. After K268 stage 2 and K290

- **Files:**
  - `gap_mask.ts`: the new row (section 3.4), the search GLSL, the slot writer;
  - new `src/render/fabric_sdf.ts` with `sampAt`, the only part of section 3.1 the search needs;
  - `ribbon_renderer.ts`: `computeGapSlot`, `renderMarkerGaps`, and `bindGap`'s binding list, which grows SAMP for the strip, its explore variant, the fans (`bindFieldGap`) and the still pluck (`bindPluckGap`);
  - `explore_glsl.ts` only if ANCHOR_SURE / ANCHOR_BK move. The new search must keep each anchor string exactly once (`paint_explore.test.ts`).
- **Waits for:** K268 stage 2 (the far-branch soft-min, its per-point gate, the protect change and the shaped-cut anchors in the fans and the still pluck) and K290 (the shaped cut reversed). Both rewrite the same search. G3-1 ports what they land.
- **Stays out of:** `main.ts`, physics, the paint library, the strip's paint code.
- **Work:**
  - slot points referenced by SAMP range; the CPU stops building fine polylines (`buildPoly(fineO)`, `FINE_SPACING`);
  - G1's levers: row 0's globals move to uniforms; the protect test is loop-free (one sample range per side); a zoom-aware tolerance (one SAMP stride at low zoom); the per-point far-branch gate as K268 stage 2 lands it;
  - chunk bounds walked in index order (section 3.4's correction);
  - a brute-force debug uniform.
- **Tests:** the row layout; kStart/nPts rounded outward; the protect ranges; the marker disc (nPts 0); `paint_explore.test.ts` green.
- **A/Bs:**
  - brute force against pruned on one page: 0 px;
  - the G1 casing census (`.claude/probes/g1/census_lib.mjs`) on G1's set: overcut 0, naked and merge no worse than master;
  - K268's and K76's own censuses (their designs name them): unchanged;
  - same-state cross-build against master: only sub-pixel casing-edge diffs. A cluster over 2 px is attributed with the `uDebugView` tint before landing;
  - a held pluck (still) and a routed web, cropped: 0 px or attributed;
  - GL readback of GAP.
- **Acceptance:**
  - the ribbon program's GPU time drops against master's 1.59-1.71 ms at 3200×1800 (section 3.7). The target, 20% lower, is a planning figure, not a measurement: G1's per-pixel gaps took the program from 0.85 to 1.94 ms at defaults, and G1's levers are what G3-1 folds in;
  - `update()` drops;
  - GAP bytes per update drop with the row (114 → about 24 texels).
- **Coordinate:** the still pluck's binding sits in `pluck_overlay.ts`; land it after K279 stage 2.

### 5.3 G3-2: the SDF ribbon pass, default on, `rp=strip` escape hatch. After the reveal chain

- **Files:**
  - `fabric_sdf.ts`: the rest of section 3.1 (`radAt`, `sdCone`, the AA);
  - new `src/render/ribbon_sdf.ts`: the segment mesh (one static `aSeg` instance buffer per scene) and the VS/FS text, which calls G2's paint library and carries the explore anchors;
  - the fold windows (section 3.3) as a pure, tested module;
  - `ribbonProbe`, the CPU transliteration of the ribbon FS (invariant 15);
  - `ribbon_renderer.ts`: the pass, the `rp` switch, the pluck host's `setCollapse` writing RADII rows;
  - `explore_glsl.ts`: `withExplore` for the new host (same anchor strings, or a per-host anchor table).
- **Waits for:** the reveal chain (K76 2c, K268 stage 2, K290, K76 2d), then ports it: the same paint calls, the reveal's VIS anchors, K268's shaped cut in `gapKeepAt` (decision 1). Stop K90 first (section 6, 13).
- **Work:** sections 3.2-3.3: the one-sided pinch in fold windows, argmin ownership as the safety net, flat anchored caps, round free tips, the fused-end disk under today's cap cover disc, side01 exactly as `uv.y` today (K328 relies on it). G1's fans stay on top.
- **Tests:** the fold windows (turn radius, marks, ±W, wrapped ranges split); `ribbonProbe` against `paint_math.ts`; both explore hosts pinned.
- **A/Bs:**
  - same page, `rp` flipped on a frozen state, on every link above. Diff classes are attributed with the ownership tint; the expected ones are round joins (sub-pixel), the pinch (same side, smoother), taper tips (rounder) and AA style;
  - the P3.34 fold repro (radius about 0.13 under a held tug) and kink seed crops;
  - paint, rim, explore and shaped-cut censuses: at most 2/255;
  - reveal frame series for every appear FX (rainbow swell, comet and roots tapers, ink);
  - GL readback.
- **Acceptance:**
  - desktop GPU at most the strip's + 10% (same page, probe_gpudraw);
  - Pixel: 60 fps held at defaults, dense no worse than master (the frame bench); `MAX_VARYING_VECTORS` covers section 3.2's varyings;
  - cold link: ribbon-sdf compiles in at most section-rgb's 2.8 s + 15% (trace_intro on a fresh profile), and is measured on the Pixel;
  - K307's registry lists ribbon-sdf and ribbon-sdf-explore; `rp=strip` compiles on demand only.
- **Gate:** Levi checks G3-2 on his phone before G3-3 deletes the strip.

### 5.4 G3-3: cleanup

- **Delete:** the strip (`SECTION_VERT/FRAG`, section-rgb and its explore variant, `RibbonMesh` and its buffers), `GAP_VERT_DECL/MAIN`, the free-tip disc fans, AXIS records, G1's full fan mode (section 4.1).
- **Add:** a small pure extrusion helper for K81's cover strips, which read `RibbonMesh.vertices` today, until G4-2.
- **Port:** `census_lib` and `probe_samestate` off `fills[].vertexData`, onto SAMP and `ribbonProbe`.
- **Verify:** same-state cross-build 0 px against G3-2's SDF path; the probe suite; `npm test`; K307's registry drops section-rgb and section-rgb-explore.

### 5.5 G3-4: performance

- **Work:**
  - the asleep-flow round-robin re-solve (CPU): centres every frame, window extents 1/8 a frame, bounds every frame; only while asleep with no pluck, reveal or FX; a slot strength ramp forces a full solve;
  - `mediump` colour, compose and blend math, after checking the fp16 rate on the Pixel;
  - slot header packing (9 → about 5 texels);
  - K259: the VS collapses segments outside every VIS piece in the thread reveal.
  - Not here: render-on-demand (K24/K6, lever 7).
- **Verify:**
  - the flicker probe under flow: 0 spike pairs;
  - a 60 s asleep-flow series against a full solve: max casing deviation under 0.5 px;
  - CPU at rest drops (measured);
  - K259: the reveal's GPU time drops against K76 2d's per-program numbers.

### 5.6 G3-5: the yarn (K23). Independent of G4; floats after G3-2

- **Files:** `fabric_maze_renderer.ts` (`drawYarn` becomes the YARN table and instances, gap-masked through `gapKeepAt`), a yarn program (K307 registry: yarn).
- **Delete:** `drawYarn`'s Graphics strokes, Chaikin smoothing and alpha buckets. The yarn stops using `underGapVisibility`; the pluck host keeps it.
- **Verify:**
  - a scripted traversal in `pv=string` (forward moves, backtracks, U-turns; the `.claude/probes/g1/probe_travsync.mjs` family);
  - yarn pixels inside host casings: 0;
  - the tension slider stays live;
  - shadow ordering crops;
  - the trail (K93), fog (K99) and markers (K83) unchanged: they read `pointFlowed`, which stays.

### 5.7 G4-0: cluster records v2 and `fieldProbe` v2, no visual change. After G3-0

- **Work:** a pure cluster builder (tested), RANGES' cluster entries, records v2 beside v1 (`junction_field.ts`), `fieldProbe` v2 on the CPU.
- **Stays out of:** the fans' shader text. K81, K169, K76 2b, K268 stage 2 and K290 keep their looks there until G4-1 carries them.
- **Verify:** readback; the structural census (every ribbon-gated segment lies in exactly one piece; ranges clear their disks), on dense and ring as well; rebuild cost at most today's `rebuildFillets`.

### 5.8 G4-1: the joint SDF pass (K9), default on, `jp=fans` escape hatch. After G3-2

- **Files:** a new joint program module, `junction_field.ts`, `junction_routes.ts`; `ribbon_renderer.ts` turns the ribbon gate on (the joint discs in section 3.3's FS). `web_fade.ts`'s clock is read as it is.
- **Carries (section 3.5):** K81's route bands, K127's traveled webs, K169's fade, K345's hover rim (rimGap → 0 in webs), K76 2b's joint gate, K268 stage 2's anchors, K290's dropped arm, the HC looks.
- **A/Bs:**
  - crops of every joint at dsf 3 for cr {0, 1, 3, 6} × tw {0.42, 0.64} × fl {0, 0.34} on ring, user, userThin and def. The cr 1/3/6 crops are K9's blend-radius sheet for Levi;
  - route bands: `.claude/probes/K81/census_k81.mjs`;
  - gameplay paint at a pinned clock after scripted moves, including a traveled host with an untraveled bridge, and the reverse;
  - reveal FX series (no pale stars);
  - GPU against CPU (`probe_gpucensus` style): at most 1/255;
  - field against ribbon on the R_out..R ring: 0;
  - the ownership tint: one writer per pixel;
  - the G1 casing census unchanged outside the domains.
- **Acceptance:** the Pixel at most 4 ms GPU at 2x at cr 3 for the whole fabric (the frame bench), 60 fps at defaults; desktop GPU for ribbons and joints together within section 3.7's 2.2-2.8 ms; joint-sdf's cold compile under arm-strip's 1.7 s + junction-field's 0.4 s, which it replaces; K307's registry lists joint-sdf.
- **Gate:** Levi's phone check before G4-2.

### 5.9 G4-2: deletions and lore

- **Delete (section 4.1):** the fans, `TriFanMesh`, the fillet discs, wedges and votes, the arm strips and their program, the cover strips and G3-3's extrusion helper, the tuck, the junction-field program, the angular `junctionField`.
- **Lore** goes to `.claude/rules/render-*.md` topic files and `docs/lore_index.md`, not CLAUDE.md: the new layer order (0 ribbons, 1 joints) and the probes that read layers.
- **Verify:** same-state cross-build 0 px against G4-1; the probe suite; `npm test`; K307's registry drops arm-strip and junction-field.

### 5.10 Ordering (K8 s1)

This replaces "Ordering with G2": G2 has landed, so there is no `threadColor` adapter and AUX is never built.
- **G3-0 now,** at the next free code slot. It touches no shader text and no main.ts.
- **G3-1 after K268 stage 2 and K290,** which rewrite the same gap search.
- **G3-2 after the reveal chain** (K76 2c, K268 stage 2, K290, K76 2d), which it ports.
- **G4-0 after G3-0; G4-1 after G3-2** (the ribbon gate is in the SDF ribbon FS). Levi's phone checks gate G3-3 and G4-2.
- K7 stages 3-4 own main.ts. Nothing here needs it but G3-2's status line, after K7 stage 4.
- K9 = G4. **K345 → G4-1, confirmed:** a piece SDF gives an across coordinate inside webs, so the rim continues and rimGap goes to 0 there; fan work now would be deleted at G4-2.
- **K328 needs nothing from G3/G4** (a correction to the ledger's "probably K328 into G4-1"): it changes the paint library's rim profile, with K111 stage 5 and K265. G3-2 must hand the paint library side01 exactly as `uv.y` today.
- K22 (the resolution scaler) after G3. K23 = G3-5. K24/K6 (render on demand) are separate. K259 → G3-4.
- K90 (boundBend): stop it before G3-2, and never run it beside a K8 stage.

---

## 6. RISKS AND OPEN QUESTIONS

Refreshed by K8 s1 for the Pixel 11 on Android Chrome. Each question for Levi carries a recommendation.

1. **The Pixel's GPU cost is estimated, not measured.** Chrome there exposes no GPU timer query (the Pixel's PowerVR CXTP-48), so a `gl.finish()` frame bench is the instrument (`scripts/bench_frame.mjs`, G3-0); alternate builds, because the phone throttles over minutes. The joint pass is the largest single item at cr 3-6 (levers 1, 3 and 9). **Recommendation:** G3-0's phone pass records master's frame-bench numbers, so every later stage has a same-phone baseline.
2. **Android Chrome on PowerVR (ANGLE over GLES)** replaces the snapshot's WebKit risk. Each needs a device check:
   - RGBA32F vertex texture fetch with NEAREST and `texelFetch`: already proven, since G2's vertex stage reads KSTATIC and KGEOM on the phone;
   - dynamic loops in the FS (the gap search loops today; the fold argmin and joint pieces add more);
   - `MAX_VARYING_VECTORS`: section 3.2 needs about 13-14 of the 15 guaranteed vec4s;
   - highp in the FS (guaranteed by WebGL2; mediump is lever 3);
   - compile stalls: K307's warm-up must cover the new programs (risk 14);
   - `EXT_color_buffer_float`, only if flow moves to the GPU (question 8).

   No escape hatch survives G3-3 / G4-2, so Levi's on-device checks of G3-2 and G4-1 gate the deletions. **Recommendation:** read the caps in G3-0's phone pass, before any shader is written.
3. **Looks for Levi.**
   - Decided, and K8 s1 confirms: the one-sided pinch (Levi, 2026-10-13), flat caps on anchored tails, the 2x phone cap.
   - The smin web shape against today's bezier fillets (c_cal; quadratic or circular smin; whether obtuse wedges over ~150° keep a fillet: today they are skipped). **Recommendation:** a polynomial (quadratic) smin calibrated to today's reach, chosen from G4-1's cr 1/3/6 sheet; keep skipping wedges over 150° unless the sheet shows a notch.
   - The SDF colour blend against the angular field (the segments scheme's crotches, the "tan RGB-mean crotch" note). **Recommendation:** take the SDF blend if the field-against-ribbon census is 0 and the crotch crops are clean.
   - The yarn's lane bias tapering at pass ends (G3-5). **Recommendation:** accept.
4. **Large R_sep** where arms ride (the JunctionCover span) inflates domains and cost. If R_sep would exceed R_cap, the residual is a hand-off seam on riding arms. **Recommendation:** count it in G4-0's structural census before choosing a cap (lever 9).
5. **Cluster merging edge cases.** Three or more joints close together get their disks shrunk, so their webs are smaller. Long chains with many joints mean longer RANGES lists; the VS's binary search keeps them bounded. **Recommendation:** dense and ring go into G4-0's census.
6. **Webs still overpaint non-crossing foreign threads near big-cr joints,** as today. **Recommendation:** yes, webs yield to any foreign silhouette in their domain: silhouette only, inset 1 px (invariant 10).
7. **Pre-existing residuals.**
   - G1's cyclic triangle persists. The fix G1 named (exempt a thread's own over region at a nearby crossing from another slot's margin) needs over-slot ids per segment, which RANGES can carry. **Recommendation:** its own item after G3-1.
   - The concave crease: K268 stage 2's far-branch soft-min, which G3-1 ports.
   - The x160 hairline and the merge-core hairline close by construction in G4 (K9); G1's fused tail riding its host goes with the tuck at G4-2.
8. **Flow on the GPU (deferred).** It would remove the at-rest spline cost, but needs noise per fetched point inside slot loops (prohibitive) or a warp pass into a float render target (`EXT_color_buffer_float`), plus `pointFlowed` for every CPU consumer (yarn, fog, markers, hit tests). The CPU flow already runs at half rate at rest. **Recommendation:** revisit only if G3-4's round-robin still costs too much CPU on the Pixel.
9. **G5,** one full-screen pass over binned segment tiles. **Recommendation:** not now. K7's worker takes the physics off the main thread, and G5 would reuse G3/G4's data model anyway. Revisit only if draw-order residuals remain after G4.
10. **Resolution.** The Pixel 11's DSF is 2.625 and the app renders at min(dpr, 2), so its 822×1506 canvas is upscaled 1.31x; analytic AA plus the upscale reads slightly soft. Lifting the cap costs about 1.72x fragments. **Recommendation:** keep 2x until K22's frame-time scaler, after G3.

**New risks (K8 s1).**

11. **K7 interplay.** A same-state A/B needs the physics frozen, and the worker can't be patched from main: under `phw=1` use `__knotPhysFreeze(on)` (K7 stage 4). Until stage 5 makes the worker the default, A/Bs run in-thread. G3 reads positions only through `ps.positions` (the mirror under the worker) and never talks to the worker. **Recommendation:** every G3/G4 result names its host.
12. **Shader-text conflicts with the reveal chain.** K76 2c, K268 stage 2, K290 and K76 2d edit the strip shader, the gap search, the fans and the explore anchors, which G3-1 and G3-2 rewrite. **Recommendation:** the order in 5.10; never run G3-1 or G3-2 beside a reveal-chain stage.
13. **K90's boundBend** (off unless `__knotSplineBend(true)`; Levi is testing it live) changes the samples G3 packs and would make fold windows rare. **Recommendation:** decide K90 (keep or drop) and stop it before G3-2; never alongside a K8 stage.
14. **K307's warm-up and registry.** Once K307 stage 2 lands, `program_registry.test.ts` fails on any unlisted program site, so each new program lands with its entry: ribbon-sdf and ribbon-sdf-explore (G3-2), yarn (G3-5), joint-sdf (G4-1). The warm-up must compile ribbon-sdf (and its explore variant on a reveal link) and, on fabric, joint-sdf before the intro's first frame. The `rp`/`jp` hatches compile on demand and stay out of it. Cold FXC today: section-rgb 2.8 s, arm-strip 1.7 s, junction-field 0.4 s, pluck-still about 340 ms. **Recommendation:** a cold-link acceptance in every stage that adds a program (5.3, 5.8).
15. **`pluck_overlay.ts` is busy:** K344 merged at 93d0e4d (the pluck host's nodes carry `selfArc` now) and K279 stage 2 runs there. G3-1 rebinds the still pluck's gap and G3-2 moves `setCollapse` to RADII rows. **Recommendation:** land both after K279 stage 2, keeping the pluck host's interface (invariant 21).

### Critical files for implementation

- `src/render/ribbon_renderer.ts`: `update()`, the slot writers, the pluck host, `rebuildFillets`; G3-0 adds `captureScene` / `restoreScene`.
- `scripts/bench_frame.mjs` (new, G3-0): the frame bench on the desktop and the Pixel.
- `src/render/gap_mask.ts`: the slot rows and the search (G3-1).
- `src/render/float_rows.ts`, `paint_model.ts`, `paint_glsl.ts`, `paint_math.ts`: G2's rows and the paint library G3 calls; the CPU mirror the censuses read.
- `src/render/explore_glsl.ts`: the reveal's anchors, pinned by `test/render/paint_explore.test.ts`.
- `src/render/ribbon_mesh.ts`: `RibbonMesh` goes at G3-3, `TriFanMesh` at G4-2.
- `src/render/junction_field.ts`, `junction_routes.ts`, `arm_strip.ts`, `web_fade.ts`: G4.
- `src/render/pluck_overlay.ts`: the still pluck's gap binding (coordinate with K279).
- `src/render/fabric_maze_renderer.ts`: the yarn (G3-5); markers, fog and hit tests read `pointFlowed`, unchanged.
- `src/physics/snapshot.ts`: read only, for the capture's physics part.
- New: `src/render/samp_table.ts` (G3-0), `fabric_sdf.ts` (G3-1, G3-2), `ribbon_sdf.ts` (G3-2), the joint program module (G4-1); tests beside them in `test/render/`.
- `src/main.ts`: `__knotRenderer()` (~4829) is the only hook used; G3-2's status line is its one new line.

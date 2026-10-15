> RE-BASED 2026-10-15 on master d741412 by K8 stage 1 (agent `agent-a35a43cee74c92b93`; docs only, nothing measured; brief `docs/design/K8_stage1.md`). Since the snapshot below, G1 (per-pixel gaps), G2 (shader paint), K76 2a/2b (the thread reveal), K268 stage 1 (the shaped cut), K81/K127/K169 (route bands, traveled webs, the web fade), the render-only plucks (K77, K104, K279), K7 (the physics worker) and K307 stage 1 (cold compiles) have landed. What changed here: sections 1-4 describe master d741412 (its line numbers), with the data model re-cut for G2's textures (SAMP packs two samples per RGBA32F texel; AUX and PAINT are gone; per-sample radii get their own texture) and the fragment programs calling G2's paint library; section 5's stages are re-cut, with the reveal chain (K76 2c, K268 stage 2, K290, K76 2d) landing first; section 6 is refreshed for the Pixel 11 on Android Chrome, with a recommendation on every question. The decisions K8 stage 1 made are marked **(K8 s1)**.
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
   - The CPU keeps producing `chainSamples` exactly as today, so every CPU consumer keeps working. Under K7 they are the interpolated mirror positions, the same ones the samples are built from today.
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

**The physics hand-off (K7).** The renderer reads `ps.positions` from the mirror (`physics/mirror_system.ts`). With the worker on, that is the worker's snapshot stream interpolated at now − D (D = the median snapshot interval, clamped to 8-50 ms); at rest the frame is exact. `&phw=0` runs the in-thread host. G3 reads the same positions as today's samples and never talks to the worker.

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
8. **Slots** (up to 8). Slots whose under chain is a piece chain and whose window meets the range inside a disk get mode CASING (applied to that piece). If the over chain is foreign (not a piece chain within reach — G1's `ownArm`, `ribbon_renderer.ts:4641-4655`), the slot also gets mode SILHOUETTE (applied to the web).
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
  vec4 col = mix(threadColor(m...), threadColor(q...), tb);   // composed colours (RENDER LORE)
  finalColor = vec4(col.rgb, 1.) * vColor * (col.a * cov);
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
- **Reveal and FX.** An unrevealed arm has r → 0 and k scales by rootW, so the web vanishes with its arm. Materialize alpha and stripes come from each piece's own material. This replaces `fanFx` and the arm-reveal gate.
- **smin choice.** Polynomial quadratic first; a circular-profile smin is the alternative. Decide by crop A/B at cr 1, 3, 6.

### 3.6 Yarn pass (host frame)

- **Instances.** (host segment, pass) pairs, in lay order, so a later pass's shadow falls on earlier passes.
- **Footprint.** The host bisector quad widened to R_y = max(h, maxOffset) + yarn width + shadow offset + pad. Fold segments use a capsule plus argmin, as in the ribbon.
- **Fragment.**
  - Nearest host point (same 3-cone code) → arc, lat, T, N.
  - Pass texels (arc0, arc1, clipArc, lane, f1..f3, p1..p3) evaluate today's `pushYarnEvent` wander analytically: `o(arc)` and `o'(arc)` with the end window.
  - Band: dist = |lat − o| / sqrt(1 + o'²) → `aaCov(dist − w/2)`.
  - Shadow: the same at (arc − S·T, lat − S·N).
  - Compose shadow then yarn, then multiply by `gapKeepArc` with the **host's** slot windows at that arc.
- **Junctions.**
  - U-turns get a "turn" instance: a half-ring SDF in (arc, lat) at arc_end + overshoot/2.
  - Pass-through continuations taper the lane bias to 0 at pass ends (a small look change) so the round end caps of consecutive passes meet at the junction.
- **CPU side.** The CPU keeps only the event list (chain, c0, c1, seed params). Ctrl → arc via `arcForCtrl` each frame.
- **Tension.** Tension changes amp/laneAmp uniforms only (live).
- The pass also rides the pluck ring and the exact spline, which today's physics-polyline yarn does not.

### 3.7 Fragment-cost model and levers

**Pixel counts.**
- Fabric region = 36×36 world.
- Ribbon-pass fragments ≈ 0.73 × region: 1.05× pad, +13% crossing double-raster, plus gated domain pixels.
- Joint fragments at cr 3 ≈ 0.31 × region: ~90 octagons, R ≈ 1.15. At cr 1 this is about 0.12.

| Screen | Canvas | px/world | Region | Ribbon frags | Joint frags |
|---|---|---|---|---|---|
| Desktop probe | 3200×1800 | ~46 | 2.7 MP | 2.0 M | 0.85 M |
| iPhone 3x DSF at the app's 2x cap | 780×1688 | ~20 | 0.52 MP | 0.38 M | 0.16 M |
| iPhone native 3x (cap lifted) | 1170×2532 | ~30 | 1.17 MP | 0.85 M | 0.36 M |

**Per-fragment work** (fetch = one 8-16 B `texelFetch`; ALU ≈ scalar ops):

| Pass part | Share of fragments | Fetches | ALU |
|---|---|---|---|
| Ribbon base: 3 cones, caps, gate, AA | 100% | 0 | ~80 |
| Ribbon colour (pre-G2) | ~75% | 3-5 | ~40 |
| Ribbon gap (chunk-pruned, 1.2 slots avg) | ~45% | ~18 per slot | ~200 per slot |
| Ribbon fold argmin | <1% | ≤30 | ≤400 |
| **Ribbon average** | | **~10** | **~190** |
| Joint: disk test | 100% | 1-2 | ~15 |
| Joint: 2-3 piece SDFs (~10 segments each) | ~90% | ~25 | ~300 |
| Joint: brackets + smin | ~90% | ~4 | ~90 |
| Joint: masks + 2 colours + blend | ~60% | ~18 | ~210 |
| **Joint average** | | **~40** | **~490** |
| Ribbon VS (88k vertices) | | ~15 per vertex | ~150 per vertex |

**Totals per frame.**

| Screen | Fetches | ALU |
|---|---|---|
| Desktop | ≈ 55 M | ≈ 0.8 G |
| iPhone at 2x | ≈ 11.5 M | ≈ 165 M |
| iPhone at 3x | ≈ 26 M | ≈ 370 M |

**Calibration.** G1 measured 2.83 ms on the desktop for an estimated ~55 M fetches + ~1.15 G ALU. Its 68-point brute-force loops dominate. So:
- G3+G4 ≈ **2.2-2.8 ms desktop.** About G1's cost, while deleting the CPU geometry work and the artifact classes.
- iPhone ≈ **1.6-2.5 ms at 2x** and **3.5-5 ms at 3x**, assuming an A15-A17 GPU runs this mix 3-4x slower than the desktop GPU. That ratio is a guess and must be measured: WebKit has no timer queries; see G3-2.
- **Budget:** at most 4 ms GPU at 2x for the whole fabric at cr 3 on the user's iPhone.

**Optimization levers, by expected payoff:**
1. Joint early-outs: octagon per member; chunk lower bounds before full piece SDFs; skip colour and masks for discarded pixels. Expected −30-40% of joint cost.
2. Chunk-pruned exact nearest search for slots and pieces (built into G3-1/G4-1). Expected −60-75% of the gap loop vs G1.
3. `mediump` (fp16, 2x ALU rate on Apple) for colour, compose and blend math. Distances and positions stay `highp`.
4. Skip AUX and radius fetches on chains with no active reveal or FX (CHAIN flag).
5. Slot header packing (7 → 4 texels).
6. Asleep-flow round-robin re-solve (CPU; G3-4).
7. Render-on-demand when fully static: asleep, fw 0, no paint animation, camera still.
8. Resolution policy: keep the 2x cap. An optional frame-time-driven 2 → 2.5 → 3x scaler, since analytic AA makes extra resolution pure crispness.
9. Smaller R at small cr; cap R_sep.

**MSAA.** Keep `antialias: true` (cheap on TBDR; markers and Graphics need it). Ribbon and joint quad edges sit in zero-coverage pad, so MSAA neither helps nor hurts them.

---

## 4. WHAT GETS DELETED, AND WHICH INVARIANTS STILL APPLY

### 4.1 Deleted

**G3:**
- `RibbonMesh.update` with all its miter, open-leg, zero-length-leg, P3.34 concave-clamp and swell-clamp logic (`ribbon_mesh.ts:216-340`).
- `RibbonMesh`'s per-vertex aUV, aColor, aFx, aArcPos, aTan and aMaskId buffers; `writePaint`/`setFx`/`setMaskIds`; the ~45-100 per-chain meshes. `RibbonMesh` itself disappears; `TriFanMesh` goes in G4.
- `SECTION_VERT/FRAG`.
- `GAP_VERT_DECL/MAIN`.
- `gap_mask.ts` polyline texels (`GAP_MAX_PTS`, the polyline copy in `writeSlot`, `GAP_TEX_W` 40).
- `buildPoly(fineO)` / `FINE_SPACING`.
- `assignGapIds`' per-sample 4-component packing (it becomes window range lists).
- The unit-circle arc encoding.
- G1's full fan-mask mode.
- The free-tip disc fans and the AXIS record type.
- `drawYarn` Graphics strokes, Chaikin smoothing and alpha buckets.
- `underGapVisibility`. `underWindows` stays because G4's gapNear uses it.

**G4:**
- `TriFanMesh` (`ribbon_mesh.ts:422-520`).
- `rebuildFillets`' geometry: discs (`DISC_*`), wedges (`FILLET_EDGE_*`, `FILLET_BEZIER_STEPS`, `FILLET_CORNER_LIM`, `FILLET_MAX_WEDGE`), the `flankPts` cache, the layer votes (armTop/armDives/overNear/underNear, `FILLET_DIVE_NEAR`), `filletTopLayer`/`filletTopMesh`, `fanFx`/`FAN_SOLID_START`, and the arm-reveal gate.
- `tuckFusedTips`, `chainTipFused`, `fusedTips`.
- `JUNCTION_VERT/FRAG` and the angular `junctionField` per-arm lookup.
- `cpuJunctionField` is rewritten as `fieldProbe` v2, a line-for-line transliteration of the new joint shader.

### 4.2 Hard-won invariants, stated for the new world

1. **Palette strip order is load-bearing.** Lerping U between adjacent samples of one thread then sampling the strip stays legal; the FS does exactly what vertex interpolation did. **Blend composed colours, never U from different sources:** joint blends mix `threadColor` outputs.
2. **Never destroy textures mid-session.** SAMP, AUX, CHAIN, RANGES, GAP, RECORD and YARN are page-lifetime, grown in place.
3. **Float data textures:** rg32float/rgba32float, NEAREST, `texelFetch` only, `highp sampler2D`, no premultiply on upload, the row uploader registered before the renderer exists. `source.update()` uploads synchronously mid-tick.
4. **Custom shaders ignore `mesh.texture`.** Bind via resources (`bindAccent` pattern).
5. **Partial buffer uploads remember their size.** The only remaining mutable buffer is the yarn instance buffer: upload explicit sizes every time. Joints use `gl_InstanceID` and have no buffer.
6. **Arc-wrap family.** Open chains clamp and map over count−1 segments; closed chains wrap. This applies to VS neighbor fetch, arc = (k+t)·arcPer, slot point arcs and piece ranges. No last→first chord on open chains, ever.
7. **Flat fills cannot represent a field; overlays must match ribbons across the whole width.** G4 pieces use the ribbon's own colour function at the ribbon's own nearest point. Certify with `fieldProbe` v2 (field vs ribbon), excluding true overlap.
8. **Render reach quotes rendered geometry (P3.36/P3.38/P3.40).** Required coverage (the over silhouette) is never reduced. A gap boundary may be truncated but never extended past its solved exit. G3 makes this structural: the over ribbon is exactly radius h everywhere (no concave thinning), and the casing measures the same samples.
9. **Junction clearance (fix A)** stays CPU-side as is. jointClear = max(1.1h, 0.55·L) + gap + CUT_BIAS, with L redefined as G4's web along-arm reach (calibrated equal to the old 1.25·h·cr). It caps only margin (floor 0.5) and fade (floor 0.45), never the march.
10. **Foreign over silhouette only, inset 1 px, for webs.** Full casing for piece material. Own-arm over slots are not listed.
11. **The JunctionCover theorem (P3.31 again).** Physics fades the anti-riding floor within ±3 ctrl of a joint because the joinery renders that overlap. G4 must keep owning it: R ≥ R_sep up to that span.
12. **A distance mask needs a window, self-exclusion and connectivity** (G1). Unchanged: CPU windows and connected-overlap marches; self-exclusion now uses sample arcs.
13. **`fwidth` in uniform control flow; discarded fragments get no MSAA.** All edges carry analytic AA.
14. **No sawtooth seam inside a fill (P3.34's real invariant)** holds by ownership. The *look* changes: an over-tight fold renders as the true swept disk (a filled lobe) instead of a thinned fold. This is flagged for the user.
15. **A census must measure the pipeline it certifies (P3.24, render edition).** `fieldProbe` v2 and a new `ribbonProbe` (a CPU transliteration of the ribbon FS) read the same mirrors. The G1 census must be ported off `fills[].vertexData` (14 probe references).
16. **Flow is render-only and physics is never touched.** At fw = 0 asleep, `update()` does not run and nothing uploads.
17. **No thread-thread contact without a dark line (P3.39 user standard).** Casings are unchanged.
18. **Section cache drift re-bake (`CACHE_REBAKE_CTRL`)** stays until G2 replaces baked section colours.
19. **PROBE LORE stands:** pin the paint clock; park the pointer; use unique scratchpad subdirectories and check the stamp's SHA; layers are reset each frame; the URL rewrite drops `#hash`; a bare URL is fabric + music + intro (probes pass `am=instant&snd=none`).

---

## 5. STAGED PLAN (each stage lands end-to-end working on master)

**Common recipe pieces.**
- **URL set:** `urls.mjs` in the G1 worktree probes — user, userThin, ring, def, knot, fat, kink. Every URL pins `am=instant&snd=none`; the knot URLs add `mf=0`.
- **Same-state cross-build A/B.** G3-0 adds `__knotSnapshot()` / `__knotRestore(s)` (`main.ts` dev hook). Snapshot: positions, prev, zPos, every pass's ctrl/displayF/weld, the emergent list. Restore pauses the sim and pins `flowTime` and `paintClock`.
- **Same-build A/B.** Uses the dev-only runtime switches `rp=` / `jp=`. Read from `location.search` directly; not added to `PARAM_DEFAULTS`, so links are unaffected.
- **Timing.**
  - CPU: `probe_perf` / `probe_cpuprof` (`update`, `tickPaint`, gated rebuild).
  - Desktop GPU: `probe_gpudraw` at 3200x1800.
  - iPhone: new `__knotBench(n)` that re-renders the stage n times around `gl.finish()`. Shown in the stats footer behind `bench=1` so the user can screenshot it from the deployed build, with the panel version stamp.
- **Shader status line.** Compile and link failures go into the on-page stamp, because a phone has no console.

**G3-0 — data plane, no visual change.**
- **Work:** SAMP, CHAIN and RANGES written every `update()`; `FloatRows` format parameter; snapshot/restore hooks; extend `probe_texreadback` to the new textures.
- **Verify:**
  - GPU readback equals the CPU mirror (max |Δ| = 0).
  - Same-state cross-build A/B shows 0 px diff at all 7 URLs.
  - `update()` costs ≤ +0.3 ms at the user URL.

**G3-1 — slots reference SAMP, chunk-pruned search.**
- **Work:** GAP rows at 16 texels with chunk bounds; the CPU stops building fine polylines; brute-force debug flag.
- **Verify:**
  - Debug brute force vs pruned: 0 px diff.
  - G1 casing census at all URLs: overcut 0 and naked/merge no worse than G1.
  - Same-state cross-build A/B: only sub-pixel casing-edge diffs. Clusters over 2 px must be attributed with the `uDebugView` tint before landing.
  - GL readback of GAP.
  - Desktop GPU draw time drops (target ≤ 2.0 ms from 2.83); `update()` drops.

**G3-2 — SDF ribbon pass, default on, `?rp=strip` escape hatch.**
- **Work:** instanced segment mesh; VS/FS above; slot windows via RANGES (`aMaskId` retired); colours from PAINT/AUX; fold detection; flat caps for anchored tails; the 0.98 interim radius on tucked samples. G1 fans unchanged on top.
- **Verify:**
  - Same-page A/B (`rp` toggle on a frozen state) at all URLs. Diff classes are attributed with the ownership tint; the expected ones are round joins (sub-pixel), tight folds (filled lobe vs thinned), taper tips (rounder) and AA style.
  - P3.34 fold repro (radius ~0.13 under a held tug) and kink seed crops.
  - Census.
  - Reveal frame series for every appear FX (rainbow swell, comet/roots tapers, ink).
  - GL readback.
  - Desktop GPU ≤ G1 + 10%.
  - iPhone bench at 2x and a visual check on the user's phone with ring + default URLs (WebKit gate).
- **Do not delete the strip until the user confirms on iPhone.**

**G3-3 — cleanup.**
- **Work:** delete the strip path, free-tip discs, AXIS records and the full fan mode; port `census_lib` / `probe_samestate` to SAMP-based lanes; fold-window hardening.
- **Verify:** same-state cross-build 0 px diff vs G3-2's SDF path; probe suite green; `npm test` green.

**G3-4 — performance.**
- **Work:**
  - Asleep-flow round-robin re-solve: centers recomputed every frame, window extents 1/8 per frame, bounds every frame. Valid only while asleep with no pluck/reveal/FX; a slot strength ramp change forces a full solve.
  - `mediump` colour math; header packing; render-on-demand when fully static.
- **Verify:**
  - Flicker probe under flow: 0 spike pairs.
  - 60 s asleep-flow series: max casing deviation vs full solve under 0.5 px (run both and diff).
  - CPU at rest drops, measured.

**G3-5 — yarn pass** (independent of G4; can float).
- **Work:** YARN table, instances, turn instances; delete `drawYarn`.
- **Verify:**
  - Scripted traversal in `pv=string`: forward moves, backtracks and U-turns, using the `probe_travsync` family.
  - Dips under exactly with the host: census of yarn pixels inside host casings = 0.
  - Tension slider live.
  - Shadow ordering crops.

**G4-0 — cluster records, no visual change.**
- **Work:** CPU cluster builder, RANGES CLUSTER entries, record v2 written beside v1; `fieldProbe` v2 on the CPU.
- **Verify:** readback; structural census (every ribbon-gated segment lies in exactly one piece; ranges clear their disks); rebuild cost ≤ G1.

**G4-1 — joint SDF pass, default on, `?jp=fans` escape hatch.**
- **Work:** joint mesh and shader; ribbon gate active.
- **Verify:**
  - Same-page A/B crops of every joint at dsf 3 for ring (41), user, userThin and def (89-92), at cr {0, 1, 3, 6} × tw {0.42, 0.64} × fl {0, 0.34}.
  - Gameplay paint at a pinned clock after scripted moves, including a traveled host with an untraveled bridge and the reverse.
  - Reveal FX series (no pale stars).
  - GPU-vs-CPU census (`probe_gpucensus` style: inject point instances with a debug "output field" mode) ≤ 1/255.
  - Field-vs-ribbon census on the R_out..R ring: error 0.
  - Ownership tint: each pixel has exactly one writer.
  - The G1 casing census is unchanged outside domains.
  - Desktop GPU budget; iPhone bench ≤ 4 ms at 2x at cr 3.

**G4-2 — delete fans, tuck, discs, votes; lore.**
- **Work:** as in section 4.1; update CLAUDE.md render and probe lore (new layer indices: 0 ribbons, 1 joints; 2-4 empty or removed with the probes updated).
- **Verify:** same-state cross-build 0 px vs G4-1; probe suite; tests.

**Ordering with G2.** G2 can land before or after any G3 stage. The `threadColor` / `threadRadius` adapter is the seam. If G2 is first, G3-2 calls it directly and AUX is never built.

---

## 6. RISKS AND OPEN QUESTIONS

1. **Mobile GPU cost is estimated, not measured.** WebKit has no `EXT_disjoint_timer_query`, so the `gl.finish` bench is the instrument. Watch thermal throttling over multi-minute sessions. The joint pass is the largest single item at cr 3-6; levers 1, 3 and 9 above.
2. **WebKit / ANGLE-Metal.** Things that should work, each needing a device check:
   - vertex texture fetch of RG32F, dynamic loops in VS and FS, instancing (all WebGL2 core);
   - about 8 flat vec4 varyings;
   - large shaders compiling with a first-use hitch (warm up during the intro).

   No escape hatch survives G3-3/G4-2, so the user's on-device confirmation is a gate before deletion.
3. **Look changes needing user review:**
   - filled-lobe folds (P3.34);
   - smin web shape vs bezier fillets (c_cal; quadratic vs circular smin; whether obtuse wedges over ~150° should keep a fillet — today they are skipped);
   - the SDF colour blend vs the angular field (segments-scheme crotches, the "tan RGB-mean crotch" note);
   - the yarn lane bias tapering at pass ends;
   - flat vs round caps on anchored tails.
4. **Large R_sep** where arms ride (JunctionCover span) inflates domains and cost. If R_sep would exceed R_cap, the residual is a hand-off seam on riding arms; measure how often.
5. **Cluster merging edge cases.** Three or more joints close together get their disks shrunk, which gives smaller webs. Long chains with many joints mean longer RANGES lists (binary search keeps the VS bounded).
6. **Webs still overpaint non-crossing foreign threads near big-cr joints** (same as G1/today). Open question: should webs also yield to any foreign silhouette in the domain?
7. **Pre-existing residuals.**
   - The G1 cyclic triangle persists. Fix direction as G1 noted: exempt a thread's own over-region at a nearby crossing from another slot's margin. That needs over-slot ids per segment, which the RANGES list can carry.
   - The concave crease gets the optional soft-min in G3-1.
   - The merge-core hairline is gone by construction in G4.
8. **Flow on the GPU (deferred).** It would remove the at-rest spline cost. It needs either noise per fetched point inside slot loops (prohibitive) or a warp pass into a float render target (`EXT_color_buffer_float`, WebKit risk), plus `flowOffset` for every CPU consumer. Revisit only if the G3-4 round-robin path still burns too much CPU on the phone.
9. **Considered alternative ("G5").** A single full-screen pass over binned segment tiles that resolves all threads, crossings, joints and the yarn per pixel. It removes every cross-pass ownership rule and the cyclic-triangle class. It costs per-frame binning (~1 ms CPU) and ~25-40 segment evaluations over the whole fabric region, a higher fixed mobile cost and a larger rewrite. Recommendation: keep the G3/G4 data model (SAMP, slot windows, cluster records), which it would reuse, and revisit only if draw-order residuals remain after G4.
10. **Resolution cap.** The app renders 3x phones at 2x. Analytic AA plus the CSS upscale reads slightly soft. Lifting the cap costs ~2.25x fragments; use the dynamic scaler or keep the cap.

### Critical Files for Implementation
- src\render\ribbon_renderer.ts (master `src\render\ribbon_renderer.ts` after G1)
- src\render\gap_mask.ts
- src\render\junction_field.ts
- src\render\ribbon_mesh.ts
- src\render\fabric_maze_renderer.ts (yarn, markers, hit tests)

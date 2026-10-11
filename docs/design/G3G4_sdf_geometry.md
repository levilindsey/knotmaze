> DESIGN SNAPSHOT (2026-10-11), written by a read-only design agent against the G1 branch (per-pixel gaps) as it stood that day; file:line citations refer to that code and will drift. What actually lands is recorded in CLAUDE.md and the commit messages; open work is tracked in LEDGER.md.

# G3 + G4 DESIGN: SDF ribbons and SDF junction webs (Knotmaze GPU migration)

**Base.** This design builds on G1 (branch `worktree-agent-ad6a952e924609ab8`, worktree `.claude\worktrees\agent-ad6a952e924609ab8`). All `file:line` citations point at that worktree. Paths map 1:1 to `src\...` once G1 lands.

**Terms.**
- **sample**: one entry of `chainSamples[c]` (uniform-arc spline resampling).
- **h**: the ribbon half-width.
- **pxW**: world units per device pixel.

## Decisions at a glance

1. **One geometry source.** The GPU gets geometry from one shared RG32F texture of centerline samples (SAMP), uploaded once per `update()`.
   - The CPU keeps producing `chainSamples` exactly as today, so every CPU consumer keeps working.
   - There is no GPU readback anywhere.
2. **Ribbons are one instanced draw, one instance per centerline segment.**
   - Coverage is the exact signed distance to the union of round cones (uneven capsules) over the sample polyline, with per-sample radii (reveal taper, swell). Analytic AA.
   - Smooth segments draw a quad bounded by the angle bisectors at both ends. That quad is exactly the nearest-segment region, so no ownership test is needed.
   - Segments near a tight fold draw a capsule box instead, and keep a pixel only if they are the nearest segment (argmin) over a CPU-flagged fold window.
   - Result: every pixel of a chain has exactly one writer.
3. **Gap slots reference SAMP instead of copying 68-point polylines.**
   - The slot header points at a sample range in SAMP plus up to 8 chunk bounding circles.
   - The nearest-point search becomes exact and pruned (about 12 segment evaluations instead of 68).
   - Slot ids move from per-vertex attributes to per-chain window range lists.
4. **Junctions are one instanced draw of per-CLUSTER octagons.**
   - A cluster is 1-2 fused joints whose domains touch (for example, both ends of a short bridge).
   - A PIECE is one chain's maximal arc range inside the cluster. A through-thread is one piece; a fused terminal is an "end" piece.
   - The fragment shader evaluates every piece with the same SDF and the same samples as the ribbon pass, then takes the hard union.
   - It adds a smooth-min web only between the two pieces that bracket the pixel's angular sector.
   - Pieces get the full G1 casing; the web is cut only by foreign over silhouettes.
   - Colour uses an edge-aware SDF blend. Its envelope, and the web's radius, reach zero before the domain edge.
   - The ribbon pass discards its own pieces' pixels inside the domain. The hand-off is exact by construction.
5. **Flow undulation and the pluck ring stay on the CPU** (control-copy displacement).
   - When asleep under flow, gap windows are reused round-robin. A smooth warp carries crossings with the material.
   - Spline sampling, SAMP and bounds still refresh every frame.
6. **The yarn becomes a host-frame pass.**
   - It finds its host's nearest centerline point with the same SDF code.
   - It evaluates the analytic wander in (arc, lateral) coordinates.
   - It multiplies by the host's own gap keep, so it dips under exactly where the host does, per pixel.

---

## 1. CURRENT PIPELINE (what G3/G4 replace)

### 1.1 What runs per frame on the G1 base

**`RibbonRenderer.update()`** — `ribbon_renderer.ts:1839-2015`. Per chain, in order:
- Copy controls.
- Flow displacement of the control copies (1863-1869).
- Pluck waves (1876-1893).
- `sampleClosedSpline` / `sampleOpenSpline` (1895-1898).
  - `spline_generator.ts`: closed chains place sample k at arc k/count × total; open chains at k/(count-1) × total.
  - count = max(48, round(initialArc / 0.09)) (`ribbon_renderer.ts:1010`).
- `tuckFusedTips` (1903-1906, 3087-3117).
- Cache-drift re-bake.
- Reveal mask.
- `RibbonMesh.update` → `ribbon_mesh.ts:216-340`.

**`RibbonMesh.update` (G3 replaces this).** It extrudes two vertices per sample and contains:
- the miter (`halfWidth / cosHalf`, clamped at 2x);
- the open-tip leg duplication (Stage 7b);
- zero-length-leg borrowing (the tucked-tip spur fix);
- the P3.34 concave-side turn-radius clamp (`innerCap = max(0.95·radius, 0.3·h)`);
- the rainbow-swell concave clamp.

It then uploads `aPosition` and `aTan` for all samples.

**Per-vertex buffers per chain** (`ribbon_mesh.ts:116-181`):
- `aPosition`, `aUV`
- `aColor` (`writePaint`, 349-373)
- `aFx` (`setFx`, 385-402)
- `aArcPos` (unit-circle arc, static)
- `aTan`
- `aMaskId` (`setMaskIds`, 186-208)

**Crossings.**
- `computeGapSlot` (2040-2523): marches against coarse polylines (`COARSE_SPACING` 0.1, at most 128 points). It then builds the fine shader polyline (`FINE_SPACING` 0.075, at most 68 points) with `buildPoly` / `sampleAt` (2366-2374). It computes the junction clearance per side (2386-2435).
- Then `renderEmergent` (2527), `renderMarkerGaps` (2579), `assignGapIds` (2675, per-sample ids padded ±2), and `gaps.upload()`.
- The upload sends the whole slot texture: `gap_mask.ts:440`, 40 texels per row, `GAP_MAX_PTS` 68.

**Paint tick.** `tickPaintPalette` (3014) → `writeChainPaint` → `writeFillPaint` (3288). This writes per-vertex U/RGB and also the GPU paint texture rows. It then calls `rebuildFillets` (4013-5064), which is gated on geomRev, sliders and FX.

**Joinery (G4 replaces this)** — `rebuildFillets`:
- Records with radial profiles (4130-4548).
- Per-arm layer votes and two `TriFanMesh` layers (4065-4128, 4570-4595).
- Joint masks: foreign-over slots, silhouette-only (4633-4703).
- Free-tip discs on AXIS records (4744-4787).
- Fused-tip discs (4788-4842).
- Seal discs (4884-4888).
- Wedges (4892-5060):
  - adaptive flank polylines (`FILLET_EDGE_CHORD` 0.15, up to 20 points);
  - bezier rim with corner control;
  - the `FILLET_MAX_WEDGE` 2.6 rad skip;
  - the `armReach` gap clamp.
- `TriFanMesh` itself (`ribbon_mesh.ts:422-520`), with the high-water-mark index upload.
- The fan shader: `junction_field.ts` `JUNCTION_VERT/FRAG` (413-463) over `junctionField()` (340-398), the angular, edge-aware, curve-following field.
- G1's fan modes in `gapKeepAt` (`gap_mask.ts:169-182, 262-268`).

**Yarn.** `fabric_maze_renderer.ts:578-780`.
- Positions come from `pointFlowed` (physics polyline plus flowOffset), not the spline samples, so they skip the pluck ring.
- The yarn is Chaikin-smoothed and stroked by Graphics every update.
- Visibility comes from `underGapVisibility` (`ribbon_renderer.ts:1435`) quantized to 5 alpha levels.

### 1.2 Recorded costs (from CLAUDE.md)

- **G1 vs master `a67b598`:**
  - `update()` 14.9-15.2 → 5.7-6.2 ms per call at the user URL (knot: 10.8 → 4.4).
  - CPU render per frame: 9.0 → 4.2 ms at rest; 16-21 → 8.5-10 ms mid-drag.
  - GPU draw 0.82 → 2.83 ms per frame at 3200x1800. The per-fragment 68-point slot loop is "the cost to watch on mobile", unmeasured.
  - Mesh count: 545 → 45 (user), 333 → 27 (ring), 514 → 6 (knot).
- **GPU junction field round:**
  - `rebuildFillets` 7.9-10.7 → 0.95-0.99 ms per call (forced full rebuild: 2.1).
  - `tickPaint` 1.1-1.2 ms.
  - Draw-phase GPU 0.34 → 0.62 ms (before G1).
- **Architecture audit:** the flow-at-rest re-solve is the dominant idle cost (half-rate today). Its "full fix" is shader displacement, which needs a gap-tracking visual A/B.
- **Known residuals:**
  - G1: (1) the cyclic-triangle dark triangles; (2) the concave-side crease of the casing; (3) the merge-core fan hairline; (4) WebKit unverified.
  - Joinery classes: crescents (chord sagitta, 12 of 41 ring joints at cr 6 before the adaptive flank fix), V-notches, flank and tucked-tip spurs, pale stars, merge-core hairlines.
- **Rendering setup:** `main.ts:67-82` sets `antialias: true` (MSAA) and `resolution: min(dpr, 2)`. A 3x iPhone therefore renders at 2x today.

---

## 2. DATA MODEL

### 2.1 Scene size at gs=18 (estimated from the code)

- **Thread length.** The lattice is 36×36 world units (doubled lattice). Two families of diagonal threads at spacing √2 give √2 world of thread per world², so about 1833 world units at lattice time. At `SAMPLE_SPACING` 0.09 that is about 20.4k samples.
- **Bridges.** About 40 bridges, each at `MIN_SAMPLES` 48, add about 1.9k samples. Total: **≈22k samples, ≈22k segments.**
- **Crossings.** 323 tree openings plus about 100 weave openings ≈ 420, minus merges and trims. With 64 emergent and 4 marker slots: **≈480 slots.**
- **Joints.** 89-92 fused joints (measured at defaults). About 60-100 chains.
- **Coverage.** Ribbon coverage is about 60% of the lattice area (two families at width 0.52 and pitch 1.41, with overlaps).

### 2.2 Textures

All textures are page-lifetime (PALETTE_CACHE lore), NEAREST, read with `texelFetch` only, through `highp` samplers. They are grown in place via `FloatRows.ensure` and uploaded through the existing `knot-float-rows` row uploader (`junction_field.ts:110-161`), generalized with a format parameter. Linear texel index → (i & 1023, i >> 10).

| Texture | Format | Content | Writer / cadence | Bytes at gs 18 |
|---|---|---|---|---|
| **SAMP** (new) | rg32float | texel `sampleBase[c]+k` = (x, y), the flowed + plucked spline sample, bit-identical to `chainSamples` | `update()`, all rows | 22k × 8 = **176 KB per update** |
| **AUX** (new, pre-G2) | rgba32float | same index: (wMul, fx, –, –) | reveal / swell / FX passes; dirty rows only while hot | 0 at rest; up to 352 KB while animating |
| **PAINT** (exists) | rgba32float | same index: (r, g, b, U) | `writeFillPaint` per paint tick, touched rows | as today |
| **CHAIN** (new) | rgba32float | 3 texels per chain: (base, count, closed, arcPer), (total, capStart, capEnd, flags), (winListBase, nWin, rangeListBase, nRange) | `update()` | ~7 KB |
| **RANGES** (new) | rgba32float | per-chain lists sorted by kLo: slot windows (slot, kLo−2, kHi+2, –) replacing `aMaskId`; segment ranges (type CLUSTER/FOLD, kLo, kHi, payload) | `update()` / cluster build | ~10 KB |
| **GAP** (G1, reshaped) | rgba32float, 16 wide | row per slot: 7 header texels + up to 8 chunk bounds (section 3.4) | `update()` | 480 × 16 × 16 B = **123 KB** (today 512 × 40 × 16 B = 328 KB) |
| **RECORD** (exists, re-laid out) | rgba32float | cluster records (section 3.5) | gated rebuild | ~90 × ~70 texels × 16 B ≈ 100 KB |
| **YARN** (new) | rgba32float | 4 texels per pass + per-chain pass index | on yarn change; 1 texel per frame for the unspool clip | a few KB |
| Accent strip | rgba8 256×1 | unchanged | recolor | – |

When G2 lands, AUX and PAINT are superseded by G2's `color()` and width functions.

### 2.3 Vertex and instance attributes

- **Ribbon.**
  - Static `aCorner` (4 vertices: side ±1, end 0/1) and a static 6-entry index buffer.
  - Per-instance `aSeg` = (global sample index of the segment start, chain), float32x2, `instance: true`.
  - `instanceCount` = Σ(closed ? n : n−1) ≈ 22k. That is 176 KB static, uploaded at scene build.
  - pixi 8.19 supports this: Geometry `instanceCount` plus Attribute `instance`; `GlEncoderSystem.draw` forwards `geometry.instanceCount`; custom-shader meshes are never batched.
- **Joint.**
  - Static unit octagon (8 vertices: direction + member selector, 18 indices).
  - The cluster is looked up by `gl_InstanceID` through a cluster list at the head of RECORD. There is no per-instance buffer, so no partial-upload hazard.
  - `instanceCount` = cluster count, set each rebuild.
- **Yarn.** Per-instance (host global sample, pass index), rebuilt when the yarn changes.

### 2.4 Uniforms and binding

- One `UniformGroup` named `fabricUniforms`:
  - uHalf (h)
  - uPadPx (1.5)
  - uPxPerWorld (from `root.worldTransform` scale × renderer resolution; `uResolution` is also in pixi's global group)
  - uKMax, uBeta
  - uGapEnabled / uDebugView (moved out of the gap texture's row 0)
  - uYarn (amp, laneAmp, width, shadow offset)
  - uTime (for G2)
- Every texture is bound through shader `resources`. Custom shaders ignore `mesh.texture` (RENDER LORE 2026-10-10).

### 2.5 Per-frame upload while awake (gs 18)

| | Upload per awake frame |
|---|---|
| G3+G4 | ≈ 176 (SAMP) + 7 + 10 + 123 (GAP) + ~100 (RECORD) ≈ **0.42 MB**, plus AUX/PAINT rows while animating |
| Today | ≈ 1.2-2 MB: positions 352 KB + tangents 352 KB + slot table 328 KB + changed `aMaskId` chains (up to 704 KB) + fan vertex/index ranges + 145 KB records + per-vertex UVs |

---

## 3. SHADERS

### 3.1 Shared library (`FABRIC_GLSL`, new module `src/render/fabric_sdf.ts`)

```glsl
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uSamp, uAux, uChain, uRanges;
vec2 sampAt(int i) { return texelFetch(uSamp, ivec2(i & 1023, i >> 10), 0).xy; }

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
- Every `texture()` after a branch or discard uses `textureLod(..., 0.0)`, as `FIELD_GLSL composeU` already does.
- **Colour adapter.** `vec4 threadColor(int chain, int k, float t, float side01)` returns composed RGB plus alpha.
  - Pre-G2: lerp `PAINT[k..k+1]` by t → `textureLod` accent at U → `mix(section, acc.rgb, acc.a)`. Then rainbow stripes from AUX fx and `side01`, and materialize alpha from fx. This is the current `SECTION_FRAG` (`ribbon_renderer.ts:512-558`) moved per fragment.
  - Post-G2: the call becomes G2's `color(...)` (ctrl from arc through G2's table).
  - Radius adapter `threadRadius(chain, k)` = h × wMul (AUX.x pre-G2; G2's reveal-schedule function after).

### 3.2 Ribbon vertex shader (one instance = segment k → k+1 of one chain)

- **Neighbor fetch (ARC-WRAP lore).**
  - Closed chains wrap: `(k+n-1)%n`, `(k+1)%n`, `(k+2)%n` (non-negative operands only; `%` on negatives is undefined in GLSL ES).
  - Open chains clamp. A missing neighbor (k−1 < 0, k+2 > n−1) gets radius sentinel −1. **Never form a last→first chord on an open chain** (the Stage 7b phantom miter and the fourth arc-wrap bite).
- **Fetch per vertex.** P0..P3 from SAMP, r0..r3 via `threadRadius`, CHAIN info. Binary-search the chain's slot-window list for windows covering [k, k+1] (up to 4 ids; overflow → `gapOverflow`). Binary-search the segment-range list for a CLUSTER entry (fetch its 1-2 member disks) and a FOLD entry (window lo/hi). About 15 fetches per vertex.
- **Footprint.** R = max(r0..r3) + uPadPx·pxW_world.
  - **Smooth segment** (no FOLD range, not an open end): trapezoid between the bisector lines at P1 and P2. With nSeg = left normal of (P2−P1) and m1 = normalize(leftN(P1−P0) + nSeg) (m2 likewise), corner = P_e + σ·m_e·R / max(dot(m_e, nSeg), 0.5).
    - The fold criterion guarantees turn angles ≤ ~0.26 rad here, so dot ≥ 0.99.
    - Adjacent quads share bisector edges exactly, so there are no gaps and no overlaps.
  - **Fold segment or open end:** capsule box from P1 − u·R·capStart to P2 + u·R·capEnd, width ±R. capStart/capEnd = 1 for a round cap or a fold, 0 for a flat cap.
- **Flat varyings.** vP0 = (P0, P1), vP1 = (P2, P3), vR, vIds, vSeg = (chain, k, flags, foldLo), vFoldHi, vJ0/vJ1 = (cx, cy, R, on). Plus interpolated vPos. That is 8 vec4 + 1 vec2, under the WebGL2 minimum of 15.

### 3.3 Ribbon fragment shader

```glsl
void main() {
  vec2 p = vPos; vec2 fw = fwidth(p); float pxW = max(max(fw.x, fw.y), 1e-5);   // uniform flow
  float t1, l1, t0, l0, t2, l2;
  float a1 = sdCone(p, vP0.zw, vP1.xy, vR.y, vR.z, t1, l1);                     // own segment
  float a0 = vR.x < 0. ? 1e9 : sdCone(p, vP0.xy, vP0.zw, vR.x, vR.y, t0, l0);   // k-1
  float a2 = vR.w < 0. ? 1e9 : sdCone(p, vP1.xy, vP1.zw, vR.z, vR.w, t2, l2);   // k+1
  if (capFlatStart) a1 = max(a1, dot(vP0.zw - p, uDir));  // anchored tails keep Stage 7b's square cap
  if (capFlatEnd)   a1 = max(a1, dot(p - vP1.xy, uDir));
  // nearest of the three -> (kn, tn, latn); the +-1 min makes width variation exact at joins
  if (isFold) { // argmin ownership over [foldLo, foldHi] (SAMP + radius fetches)
    for (j in window) { aj = sdCone(...); if (aj < aOwn - 1e-7 || (aj <= aOwn && j < k)) discard; }
  }
  if (a > 0.5 * pxW) discard;                                          // cheap early out
  if ((vJ0.w > .5 && distance(p, vJ0.xy) < vJ0.z) || (vJ1.w > .5 && distance(p, vJ1.xy) < vJ1.z)) discard; // joint owns it
  float cov = aaCov(a, pxW) * clamp(2.0 * rNear / pxW, 0.0, 1.0);     // no 1-px hairline at r -> 0
  float arc = (float(kn) + tn) * arcPer;                               // closed: mod total
  float side01 = 0.5 - 0.5 * clamp(latn / rNear, -1.0, 1.0);           // left vertex was uv.y 0
  float keep = gapKeepArc(pxW, p, arc, segDir(kn), vIds);              // G1 ribbon mode, arc supplied
  vec4 col = threadColor(chain, kn, tn, side01);
  finalColor = vec4(col.rgb, 1.0) * vColor * (col.a * cov * keep);      // premultiplied, as G1
}
```

**Why ownership holds.**
- For smooth segments, the bisector partition equals the nearest-segment partition as long as consecutive bisectors do not meet within R. On the concave side, the equidistant set of two lines is their angle bisector.
- For folds, explicit argmin ownership applies, with ties going to the lower index.
- **Fold detection (CPU, O(N), part of `update()`):**
  - Per sample, turn radius ρ = ((la+lb)/4)·cos(θ/2)/sin(θ/2) (the `RibbonMesh` formula).
  - Mark ρ < 1.2·(h·maxWMul + pad).
  - Expand each mark to ±W, with W = min(ceil((π·ρ + 2R)/spacing), W_max), where W_max = 2 ctrl in samples (the physics same-chain collision skip is ±2 ctrl, `forces.ts:259-263`). Beyond that, collision keeps a chain at least a width apart, so only AA fringes can touch.
  - W_max must also stay below kinkSep (at least 2.6 ctrl), so a self-crossing's two passes never share a fold window and are never Voronoi-split. They stay over/under via their slot.
  - Wrapping ranges on closed chains are split in two.
- **Caps.**
  - Free dead-end tips: round, automatically. The free-tip disc fans and their AXIS records go away.
  - Anchored tails: flat (keeps Stage 7b).
  - G3-only interim for fused ends: tucked samples are zero-length cones, so the end is a round disk at the tuck point. Write AUX wMul 0.98 on the collapsed samples so G1's 0.99h fused-tip disc fully covers it until G4 deletes both.

### 3.4 Gap slots referencing SAMP (`gap_mask.ts`)

**Row layout (16 texels wide):**
- t0 [nPts, hOver, margin, fade]
- t1 [strength, perp, –, centerArc]
- t2 [winNeg, winPos, underClosed, totalU]
- t3 [underTan.xy, marginScaleNeg, marginScalePos]
- t4 [selfExcl, overBase, kStart, overCount]
- t5 [fadeScaleNeg, fadeScalePos, centerX, centerY]
- t6 [overClosed, overArcPer, underChain, nChunks]
- t7..t14: chunk bounds [cx, cy, radius, firstPoint], 8 points per chunk, up to 64 points (G1 had 68 at 0.075 spacing).

Notes on the layout:
- Point j is `SAMP[overBase + wrap(kStart + j)]`. Its arc, used for self-exclusion, is (kStart + j)·overArcPer.
- `nPts = 0` means the marker disc: the "polyline" is (centerX, centerY), as `renderMarkerGaps` writes today.
- The CPU stops building `fineO` and computes kStart/nPts from overCenter ± reach rounded outward. The over polyline is then the over ribbon's actual centerline, so the casing is exactly concentric with the SDF over ribbon.
- `arcScale` and the unit-circle `aArcPos` go away: the fragment supplies arc directly.

**Search (exact, pruned):**
1. Compute the 1-8 chunk lower bounds `length(p − c) − r`.
2. Evaluate the smallest-bound chunk first; skip chunks whose bound is at least the current best (respecting self-exclusion; a fully excluded chunk is skipped by its arc span).
3. Over tangent from SAMP central differences (G1's blend).
4. Two separated best branches (from chunks farther apart in arc than 2·(h+margin+fade)) can be combined with a soft-min. This is the G1 residual-(2) crease fix; ship it behind a flag and decide by A/B.
5. A brute-force debug mode (uniform) must give a zero-pixel diff (section 5, G3-1).

**Modes.**
- `gapKeepArc` (ribbons, joint pieces, yarn) is G1's ribbon branch.
- `webSilhouetteKeep` is G1's junction-fan branch: `1 − clamp((d − hOver + pxW)/pxW + 0.5)`, inset 1 px.
- G1's full fan mode (projected window + footprint for free-tip caps) is deleted.

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
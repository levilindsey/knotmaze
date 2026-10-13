> DESIGN SNAPSHOT (2026-10-11), written by a read-only design agent against the G1 branch (per-pixel gaps) as it stood that day; file:line citations refer to that code and will drift. What actually lands is recorded in CLAUDE.md and the commit messages; open work is tracked in LEDGER.md.

> NOTE (2026-10-11, after this design): `junctionBlend` is now a FIXED DISTANCE in lattice units (panel [0, 6]), not a [0, 1] ratio: ramp = min(span/2, r0 + dist * span / run.length) per run, ease = min(1, dist / 1.0). In section 3.3 the uKSect uniform carries (dist, ease) and each RUNS record needs the run's lattice length (or its lattice-per-ctrl) to convert.

# G2 design: all per-sample and per-tick COLOR moves into the shaders

> STATUS: IMPLEMENTED (2026-10-12; G2.0 824d561, G2.1 26a8af2, G2.2
> c815efb, G2.3 1c56a40 - SHAs before the branch was rebased onto master;
> then the K4 fan fix, arm strips). G2.4 (GPU particles)
> NOT done - a follow-up (K23). Section 7 is the
> implementation log with every measurement. Deviations from this design,
> in short:
> - G1 retired the over-fills, the fade strip and the erase grid
>   (section R); per-fragment chain points come from aKey (chain, sample
>   index), not aChain + unit-circle ctrl varyings.
> - Reveal sources live in their own texture (KREVEAL); gate show times are
>   encoded in the gap slot's strength sign and latched once open; the CPU
>   width mask is the max over covering sources (the GPU ignition the
>   earliest arrival); near-ties go to the first source scanned; the burn
>   hot head is an ARC length beyond the point (continuous); FX settle
>   skips per chain (KGEOM G0.z) and per slot (CTRLIDX.w) are exact.
> - Fans evaluate the RIBBON's per-vertex Gouraud of the section (two
>   samples), not knotSection at the pixel's exact ctrl; noise coordinates
>   are read at the renderer's construction (ps.initial is private).
> - Gameplay paint uses per-SLOT item references built from the existing
>   setPaint declaration, not per-run records + a PaintState in
>   FabricMazeRenderer (untouched); the reveal glow per pixel comes from the
>   point's own moving fronts; a per-chain paint flag (KGEOM G0.w) skips
>   unpainted chains.
> - FANS READ ARM STRIPS (the K4 fan fix, 2026-10-12, section 7 "K4 fan
>   fix"): each arm's composed material is rendered once per frame into an
>   RGBA8 strip row (arm_strip.ts); fans read two texels per arm instead of
>   evaluating it per pixel. The per-pixel fans cost the Pixel 11 60 -> 44
>   fps at rest; with strips it holds 60 (master 58-60). Paint and burn-
>   front edges inside webs ramp over the strip step (<= ~1.4 CSS px at
>   default zoom) instead of one screen pixel.

Read-only design. No files were changed.

## R. Reconciliation with the landed G1 (2026-10-12, before building)

G1 (99443cb..19209c4) landed after this design was written. What it changes
for the plan below (each item is a deviation the implementation follows):

- **Over-fills are gone** (PatchGridMesh, `repaintFromRibbonWindow`, the fill
  shader and its `aJoint` joint blend). Nothing of b6 / the fill-joint parts of
  3.7 needs migrating; paint lives only in the base ribbons and the fans.
- **The erase grid is gone.** Crossing gaps are casing masks in the section
  fragment shader (`gap_mask.ts`); a crossing's gate is its gap SLOT. G1 gates
  by `clearSlot` (hidden) plus a CPU-clocked strength ramp (`crossingShownAt`,
  slot texel 1.w). The plan's `tShow` goes into the free slot texel 8.w and the
  gap library reads the knot uniforms (fxNow) for the ramp. Marker slots keep
  their CPU reveal gate (they pop today; they are not FX-gated).
- **Ribbon vertices already carry G1 data**: `aArcPos` (the sample's arc as a
  unit vector), `aTan`, `aMaskId`, and the fragment's arc TURN arrives as G1's
  wrap pair (`vTurnA`/`vTurnB`, picked by fwidth). The plan's `vCtrlCS`
  unit-circle varying is implemented with the same A/B wrap-pair trick (no
  per-fragment atan). The vertex's arc comes from a static SAMPLE INDEX
  (`aKey = (chain, k)`, arc = k * arcPer) instead of decoding `aArcPos`: the
  G2.0 census measured the GPU atan decode at ~1e-3 world (2e-3 ctrl) on the
  long open chains, the exact index brings both to the 8-bit readout limit.
- **Junction fans** (G1 `TriFanMesh`: `aPosition`, `aRec`, `aMaskId`) are
  unchanged; their records gain the G2 fields as planned.
- **LEDGER K15** (a fan opaque beside a striped fill) is moot: no fills.

Implementation deviations found while building are listed per stage at the
end of this document (section 7).

**Base.** Master @14b6a14. It now contains junctionBlend (82b6b6b), swept burn ignition (b76f556), connectors-last draw (32849ac) and the roots spray (0cbfcc1). G1 sits on top of that once it lands.
- The G1 branch (`worktree-agent-ad6a952e924609ab8`, head 4ce02fa) is currently based on 61662cb, so it still has to rebase over those four commits.
- Its worktree has uncommitted gap_mask changes in progress: the slot header grew to 8 texels, and texel 4.w is now `farK`. G1 line numbers below are therefore approximate and given with function names.
- Master line numbers are exact at 14b6a14. The render files there are identical to 4b2aea0.

---

## 0. Decisions in one paragraph

Every ribbon or joinery pixel's colour becomes one GLSL function of:
- the material coordinates (chain, ctrl, arc, side) plus `pxArc`;
- three page-lifetime RGBA32F data textures:
  - STATIC: rebuilt on events (scene build, Look change, reveal start);
  - PAINT: rebuilt on gameplay events only;
  - GEOM: per frame, and only when `update()` ran;
- one uniform group, whose clocks are reduced on the CPU in float64.

Supporting decisions:
- **One TS mirror** (pure functions with the same names) is the single reference for markers, gates, probes and censuses. This is the `cpuJunctionField` pattern generalised.
- **Section colour** is evaluated per VERTEX in the vertex shader. That is the exact function, Gouraud-interpolated — identical to a fresh CPU bake, but live every frame, so the stale-cache and drift-rebake problem is gone.
- **Paint, FX and reveal glow** are evaluated per PIXEL.
- **Reveal and FX** use analytic per-material ignition times taken straight from the deterministic reveal plan. Burn is continuous by construction at any frame rate.
- **The accent strip texture is retired.** Its composition is closed-form: `mix(S, white, 0.9315·v)` / `mix(gold, white, 0.9315·v)` / `mix(S, gold, g)`, with pathColor as a uniform.
- **Stage order:** G2.0 infrastructure → G2.1 reveal/FX → G2.2 section → G2.3 gameplay paint → G2.4 GPU particles (independent, can trail G3) → G2.5 cleanup/lore. In this order every stage deletes one CPU subsystem and none needs a throwaway transitional encoding.

---

## 1. INVENTORY (current CPU per-sample / per-tick colour work)

"RR" = `src/render/ribbon_renderer.ts` on master. "G1" = the G1 worktree.

### (a) Section colours

**a1. Field construction** — `core/section_colors.ts` `buildSectionField` (:226).
- Emits per-chain piecewise-linear VSegments:
  - mono: constant `gamutRgb(0.5)`;
  - strands: gamut ramps of `min(2.4, span/2.5)` (:330-336);
  - depth: Dijkstra gamut sweep;
  - segments: RGB ramps of `min(1.0, 0.18·span)` toward the junction RGB-mean (:414-420);
  - noise: emits nothing.
- junctionBlend:
  - ramp length `rampLen(r0, span, reach) = r0 + (span/2 − r0)·reach` (:70);
  - shape `easeAt(u, e) = u + (smoothstep(u) − u)·e`, with `e = min(1, reach/0.25)` (:76).
- Eased ramps are approximated by 6 linear pieces (`pushRampRgb` :159, `pushGamut` :193). Gamut sweeps are subdivided every 0.06 of the coordinate (:119).
- Runs at scene build (main.ts:504) and on every Look change, including every jbl slider tick (main.ts:737). Cost O(runs·pieces): negligible, event-only.

**a2. Install** — `setSectionField` RR:2900 and `recolor` RR:2921. Both set `rgbCacheReady = false`, which forces a full re-bake on the next `update()`, plus `invalidateColors`. The noise RNG is also created here.

**a3. Per-sample bake** — `buildRgbCacheFor` RR:3059.
- O(count + nCtrl) per chain. Each sample's arc is mapped to ctrl through `controlArcLengths`, then `sectionRgbAt` (RR:2957) does a binary search over the segments.
- Noise is evaluated per sample with `noiseV` (RR:3005) at the FIRST update's flowed sample positions and is never re-baked.
- Consumed by: ribbons (`aColor` → `vSection`); the G1 paint texture (rgb channels); burn pools (as `src`); markers.

**a4. Drift re-bake** — `cacheDrift` RR:3041 runs every `update()` for every palette chain. Past `CACHE_REBAKE_CTRL` 0.1 (RR:245) it re-bakes, adds the chain to `recolorPending`, and the next tick rewrites that chain's paint. CLAUDE.md measures about 30 re-bakes/s at rest under flow, about 0.1 ms each.

**a5. Upload**
- `RibbonMesh.writePaint` (G1 ribbon_mesh ~:349) uploads `aColor` (24 B/sample, whole buffer) whenever the colours array identity changes.
- `writeFillPaint` (RR:3732) writes rgb+u texels into the G1 PAINT texture. Uploads are row-granular: 16 KB per touched 1024-texel row.

**a6. Knot mode** — `knotChainRgb` (G1 ~:1159): one 8-bit-rounded constant per chain, written once at construction and on recolor.

**a7. Consumers**
- Ribbons: `SECTION_FRAG` `vSection` (RR:508).
- Junction fans: G1 `junction_field.ts` `paintAtArc` reads rgb (~:277-301).
- Start/exit discs: `fabric_maze_renderer.ts:1345,1357` → `sectionColorAt` (RR:4556) → `colorAtArc` (RR:4570), which includes burn pools. This runs on every `fabric.update`, i.e. every awake frame.
- `fieldProbe` and `cpuJunctionField` (RR:4410).

### (b) Gameplay paint

**b1. Declaration.** `FabricMazeRenderer.update` (fabric:1160-1230) and `emitAnimFrame` (fabric:1120-1153) rebuild spans, pulses and caps, using `buildTrail` (:1010-1090), `buildCaps` (:1238-1274) and `trailGoldAt` (:1095). They then call `ribbons.setPaint` (RR:3116).
- `setPaint` bumps `paintRev` unconditionally and keys the pulse fade-in.
- It is called on EVERY awake frame (main.ts:1634, after `renderer.update()`), on every `flowRender` (main.ts:1556), on every move frame, and on taps, hover, mode and reset.
- **Finding:** because `paintRev` changes every awake frame, every gold-painted chain is rewritten and re-uploaded every awake frame, even when nothing in the paint changed.

**b2. Paint pass** — `tickPaintPalette` (RR:3192). It advances `paintClock`, builds target/animated/toWrite lists, and calls `writeChainPaint` (RR:3617) per written chain. Per sample it computes U from:
- spans → `U_GOLD`, or the trail's `goldU(p)` lerped in arc between the span-end p values;
- caps → `max(u, goldU(p))` within an arc radius;
- pulses → `pulseValueAt` (RR:4320): full-length crest trains, floor plus core glow, end window, fade-in, the 0.3 s outbound lead, hover breath; the result is `bandU(onPath, v)` when v > 0.004;
- reveal glow → `applyRevealGlowU` (RR:4265);
- then `writeFillPaint` and `setFx`.

How often:
- pulse chains every tick (60 Hz, even asleep);
- target chains on every `paintRev` change (every awake frame);
- glow, burn-hot and fx-hot chains every tick.

Cost:
- O(count × items on the chain) per chain;
- measured 1.1-1.2 ms/tick at the user URL (GPU-field round); the audit measured 1.6-1.7 ms for tickPaint plus fillet refill;
- uploads per written chain per tick: `aUV` whole buffer (16 B/sample) plus PAINT rows;
- estimate at rest with 3 pulse chains of about 1k samples: roughly 100 KB per frame.

**b3. Accent strip** (RR:385-470). A page-lifetime 256×1 RGBA8 strip per pathColor with layout `[bandA rev | base | gold | bandB]`.
- `bindAccent` (RR:554) exists because of the lore that custom shaders ignore `mesh.texture`.
- `accentSampleCpu` (RR:393) is its CPU twin.
- Composition is `mix(section, acc.rgb, acc.a)` in `SECTION_FRAG`.

**b4. Junction field paint.** The G1 PAINT texture's u channel feeds `composeU` (G1 junction_field ~:323) per arm before the edge-aware blend. `cpuPaintAtArc` (RR:4372) is the CPU twin.

**b5. Paint clock.** `paintClock` advances only in `tickPaintPalette`. It is read by pulses, hover, burn flicker and FX ages. Probes pin it (G1 probe lore).

**b6. Master only (deleted by G1):** over-fill paint replays `repaintFromRibbonWindow` (RR:3265-3294).

### (c) Reveal and appearance FX

**c1. Plan** — `core/reveal_plan.ts`. `buildRevealPlan` produces sources `{chain, cFrom, cTo, t0, rate}` (the draw-mode connectors come from `drawConnectors`). `intervalsAt` is at :330 and `tipsAt` at :373. Built once per reveal start.

**c2. Animator** — `render/reveal.ts`. `tick` (:77) does `t += dt·speed`. Ink mode: radius, perturbation and per-chain latch (:102-133).

**c3. Width masks** — `revealMaskFor` (RR:1644), per chain per `update()` during the reveal.
- Interval modes: O(count × intervals).
- Ink: O(count) with a hypot plus simplex noise per sample, using live positions.
- Also maintains `revealProg`/`revealAdvanced` (b76f556).
- Feeds `RibbonMesh.update` `widthMul`. Taper and tip floor come from `revealShape` (RR:1625).

**c4. Rainbow swell** — `rainbowWidthMul` (RR:4168), O(count) per chain per update while hot.

**c5. Burn/roots** — `newBurnPool`, `armBurnPools`, `datePassedRuns`, `applyBurnColors` (RR:3758-4066). Per hot chain per tick:
- age advance (clamped 0.1 s);
- swept ignition per tip;
- run dating;
- a colour pass into a ping-pong copy, which re-uploads `aColor` (24 B/sample) plus PAINT rows every tick.

Markers read the pools through `colorAtArc`. b76f556's residual is "2/12 and 8/169 short non-dark runs inside char" at speed 2.2/3.

**c6. FX weights** — `applyFxWeights` (RR:4074): ignition by mask crossing with sub-frame back-dating, then `setFx` → `aFx` (8 B/sample per hot chain per tick). Helpers: `fxWeightAt` (RR:4195), `fxSolid` (RR:4213).

**c7. Glow** — `applyRevealGlowU` (RR:4265), per tick per tip window.

**c8. Crossing gate.**
- In `update()`: an `fxMatHot` pool scan, plus `crossingRevealed` (RR:1607) and `crossingFxSettled` (RR:4227) for every crossing on every update, plus the `crossingShownAt` fade clock on `performance.now()`.
- G1 turns this into `gaps.clearSlot` or a strength ramp in slot header `h1.x` (G1 `update()` gate block).
- Emergent crossings get no fade-in.
- Marker gaps gate in `renderMarkerGaps`; the exit marker gates through `revealQuery` (fabric:1350).

**c9. Fan gating** — G1 `rebuildFillets`:
- `rec.on` from `revealMulAtCtrl` at each arm's `slot ± 0.8`;
- the record header `.w` holds `fanFx(min fxSolid)`;
- free-tip and fused-tip reveal checks;
- the `animating` gate (`fxHot || filletFxWas || revealOn`) forces a full fan rebuild every tick during reveal/FX (0.95-2.1 ms per rebuild).

**c10. Keep-alive** — `needsFxRender` (G1 ~:3006) keeps `update()` running while asleep as long as FX pools are hot.

**c11. Knot-mode tip glow** — `drawRevealTips` (RR:1769): a Graphics rebuild per update.

**c12. Particles** — `appear_fx.ts`, pool `MAX_FX_PARTICLES` 3200.
- Spawning: `spawnTipFrontier` (RR:1852), and `spawnInkFrontier` (RR:1905), which scans the masks for 0.5 crossings.
- `tick()` (:591-727) Euler-integrates every live particle and writes Particle x, y, rotation, scale, tint and alpha. The ParticleContainer then re-uploads its dynamic buffers every frame.

**c13. Shader FX** — `SECTION_FRAG` stripes and white wash for `aFx > 0`, materialize alpha for `aFx < 0`.

**Measured context (CLAUDE.md round-4 note).** The gs-18 intro runs at about 5 fps because PHYSICS takes 150-190 ms per frame. G2 makes the intro correct at any frame rate; it does not make it faster.

---

## 2. DATA MODEL

### 2.1 Textures

All are `FloatRows` instances:
- RGBA32F, width 1024, NEAREST, read only with `texelFetch`;
- `precision highp sampler2D`;
- uploaded through the existing "knot-float-rows" row-partial uploader;
- page-lifetime singletons, never destroyed, grown in place with `ensure()`. Writers must re-read `.data` after `ensure`.
- Move `FloatRows` and `extensions.add(ROWS_UPLOADER)` out of `junction_field.ts` into a new `src/render/float_rows.ts`. Both modules import it, so registration still happens at module load, before `app.init` (lore).

**KSTATIC** (events). Each region starts on a row boundary, so each event re-uploads only its own rows.

| Region | Texels | Layout | Rebuilt on |
|---|---|---|---|
| CHAINS | 2 per chain | `C0 = (nCtrl, closed, sampleCount, idxBase)`<br>`C1 = (geomBase, srcFirst, srcCount, 0)` | scene; `src*` at reveal start |
| CTRLIDX | nCtrl per chain (one per control slot) | `I = (runId, srcHint, noiseV, inkTign)` | `.x` scene; `.z` scheme/seed; `.y/.w` reveal start |
| RUNS | 4 per run | `R0 = (ctrlA, ctrlB, rA0, rB0)`<br>`R1 = (colA.rgb, flags)`<br>`R2 = (colMid.rgb, chain)`<br>`R3 = (colB.rgb, 0)` | Look event (recolor) |
| SRC | 2 per source | `S0 = (cLo, cHi, cFrom, dir)`<br>`S1 = (t0, rate, tEnd, span)` | reveal start |

CTRLIDX channels:
- `runId`: the walk edge id for slots inside a run; a pseudo-run id for decorative chains and for open-chain stretches outside every run. That reproduces `sectionRgbAt`'s fallback to `segs[0].rgb0`, and knot mode uses one pseudo-run per chain.
- `srcHint`: the first source intersecting `[slot, slot+1)`, or −1.
- `noiseV`: `noiseV(x, y)` at the control's INITIAL position (`ps.initial`).
- `inkTign`: the ink ignition time (anim seconds) at the control's reveal-start position.

RUNS columns: run id = walk edge id; pseudo-runs are appended after the walk edges.
- RGB-space runs: segments and knot colours.
- Gamut-space runs: mono, strands, depth, noise. Their colours are gamut coordinates stored in `.x`.
- `flags`: 1 GAMUT, 2 SWEEP (depth), 4 NOISE, 8 RAMP_A, 16 RAMP_B, 32 WALK (has a paint record).

SRC: sources are sorted by `cLo` per chain. Sources crossing a closed ring's seam are split at build time, keeping a seam-shifted `cFrom` so `|c − cFrom|` stays the unwrapped distance. `tEnd = t0 + span/rate`.

**KGEOM** (per frame, written in `update()` right after sampling, flushed at the end of `update()`). Per chain at `geomBase`:
- `G0 = (total, arcPer, 0, 0)`, with `arcPer = total/(closed ? count : count−1)`;
- then `ceil(nCtrl/4)` texels of `controlArcLengths`, packed 4 per texel in slot order.

Cost is about 4 B per control per frame. Nothing is uploaded while asleep at fw=0, because `update()` doesn't run.

**KPAINT** (gameplay events). 2 texels per walk run:
- `P0 = (flags, capA, capB, 0)`
  - flags: 1 TRAVELED (gold mode; excludes the in-flight advance run), 2 TRAIL, 4 ARM_A, 8 ARM_B, 16 INWARD, 32 ON_PATH, 64 HOVER, 128 CAP_A, 256 CAP_B;
  - `capX` = the capped vertex's trail distance excluding the in-flight piece (0 in gold mode, since pAt(0) = 1).
- `P1 = (dA, dB, 0, 0)`: lattice distance behind the path head at the run's A and B ends, excluding the in-flight piece, taken from the run's most recent occurrence. That reproduces "newest write wins".
- Caps are written into EVERY run end that shares the cap's (chain, ctrl). The CPU cap spills `capR` along the chain into the adjacent run.

**Changes to G1 data**
- Junction RECORDS:
  - the arm header becomes `(chain, sampleCount, closed, total)` (it was `paintBase`);
  - joint and axis records gain one header texel `J1 = (tOn, tLastIgnWall, 0, 0)`, so arms start at `rec + 2`. Both GLSL and `cpuJunctionField` must shift.
- GAP table: one GATE field `tShow` per slot, in whatever channel G1's settled layout leaves free, or one more header texel. Effective strength = `h1.x · gateRamp(tShow)`.
- The G1 PAINT texture (`paintData`, `uPData`): rgb unused after G2.2, deleted at G2.3.

### 2.2 Per-vertex attributes

**RibbonMesh**
- G2.0 adds `aChain` (float32, static, both vertices).
- G2.1 removes `aFx` and `setFx`.
- G2.2 removes `aColor`, `colorData`, `lastColors` and `invalidateColors`.
- G2.3 makes `aUV` static: `aUV.y` stays the side coordinate, `aUV.x` is unused (or later folds `aChain` into it).
- `aPosition`, `aTan`, `aArcPos` and `aMaskId` (G1) are unchanged.
- No new per-frame vertex data. There are no partial buffer uploads anywhere in G2, so the PARTIAL BUFFER UPLOADS lore stays satisfied.

**TriFanMesh**: unchanged (`aPosition`, `aRec`, `aMaskId`).

**Particles (G2.4)**: one static quad. Per-instance data comes from a KFX texture via `gl_InstanceID`.

### 2.3 Uniforms

One `UniformGroup` named `knotUniforms`, `isStatic: false`. Pixi re-syncs non-static groups on every draw (`GlUniformGroupSystem.updateUniformGroup`), so in-place mutation works. It is shared as a resource by the section, junction and particle shaders.

| Uniform | Contents | CPU-side reduction (float64) |
|---|---|---|
| `uKBase` | runBase, srcBase, debugView, paletteMode | — |
| `uKGamut` | baseHue, arcDeg, sat, light | from `setGamutConfig` and effHue |
| `uKSect` | reach, ease, 0, 0 | ease = min(1, reach/0.25) |
| `uKGold` | pathColor rgb | hex → float |
| `uKPaint` | mode (0 none, 1 gold, 2 trail, 3 string), capR, hoverBreath, 0 | capR = max(0.22, 0.6·tw); breath = 0.5 + 0.3·sin(clock·5.2) |
| `uKPulse` | travelInMod, travelOutMod, spacing, fadeIn | `(clock·1.6) mod s`, `((clock+0.3)·1.6) mod s`, s = max(0.5, psp), smoothstep((clock − pulseBorn)/0.45) |
| `uKTrail` | L, fadeStart, fadeMode, sweptLen | fadeStart = 0.7·L |
| `uKMove` | run, curCtrl, anchorCtrl, kind (0 none, 1 advance, 2 backtrack) | from `tickAnim` |
| `uKFx` | style, revealClockA, fxNow, fxOn | fxNow = paintClock − revealOrigin |
| `uKFx2` | phase13, phase29, revealOn, flTime | phases mod 2π; flTime = 0.3·sin φ13 + 0.2·sin φ29 |
| `uKShape` | taperArc, tipFloor, glowArc, glowHold | per style, from `revealShape` |
| `uKInk` | inkSpeed, isInk, 0, 0 | — |
| `uKKnots[8]` (vec4) | animT, wallT, invSpeed, valid | anim→wall map: a knot is appended at reveal start and on every appearSpeed change |

**Clock ownership.** The renderer gets `advanceClocks(dt)`, called in main.ts right after `reveal.tick` (main.ts:1494). `paintClock` therefore advances BEFORE `update()`, so the mirror evaluations inside `update()` (gates, masks) and the uniforms agree within a frame.
- Pixi's ticker caps `deltaMS` at 100 ms (minFPS 10), so the reveal clock and the paint clock stay coherent. Knots are needed only on speed changes.
- Probes that freeze the clock override `advanceClocks` (as `probe_gpucensus` does today with `tickPaint`).

### 2.4 What uploads when

| Situation | Uploads |
|---|---|
| At rest (asleep, fw=0) | uniforms only (pulse phases and breath) |
| Hover change, tap, arrival, mode change, reset | 1-2 KPAINT rows |
| During a traversal move | uniforms only (`uKMove`, sweptLen) |
| Look change | KSTATIC RUNS rows (+ CTRLIDX rows if the scheme became noise) |
| junctionBlend drag | uniforms only |
| Reveal start | CTRLIDX + SRC rows, once |
| During a reveal or FX | uniforms; plus KGEOM + positions because `update()` runs (geometry, not paint) |
| Flow / awake | KGEOM rows each `update()` + G1's geometry |

---

## 3. SHADER FUNCTIONS

Code lives in `src/render/paint_glsl.ts` (strings only). All numeric constants are generated from `src/render/paint_const.ts` (`glslConstBlock()` emits `const float NAME = …;`), so GLSL and TS cannot disagree on numbers.

### 3.1 Contract for callers (ribbons now, G3 and G4 later)

```glsl
// caller supplies: chain (flat), ctrl in [0,nCtrl) closed / [0,nCtrl-1] open,
// arc in [0,total), side in [0,1] across the ribbon (0.5 if none),
// pxArc = world arc per pixel from fwidth() computed at the TOP of main (uniform flow)
vec3  knotSection(KChain c, float ctrl);                       // VS (ribbons) or FS (fans/webs)
vec4  knotShade(KChain c, float ctrl, float arc, float side, float pxArc, vec3 S);  // rgb + materialize alpha
vec3  knotComposedAt(KChain c, float ctrl, float arc, float pxW);  // fans/G4 webs: section+FX+paint, no stripes
float knotRevealWidth(KChain c, float ctrl, float arc);        // mask x swell, for G3's VS extrusion / SDF
float knotFanAlpha(vec4 J1);                                   // joint gating from record times
float kCtrlOfArc(KChain c, float arc); float kArcOfCtrl(KChain c, float ctrl);  // for G4
```

### 3.2 Data access and geometry

```glsl
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uKStatic, uKGeom, uKPaint;
vec4 kS(int i){return texelFetch(uKStatic, ivec2(i & 1023, i >> 10), 0);}  // likewise kG, kP
struct KChain { int nCtrl; bool closed; int count; int idx; int geom; int src0; int srcN; float total; };
KChain kChain(int ch){ vec4 a=kS(2*ch), b=kS(2*ch+1); KChain c;
  c.nCtrl=int(a.x+.5); c.closed=a.y>.5; c.count=int(a.z+.5); c.idx=int(a.w+.5);
  c.geom=int(b.x+.5); c.src0=int(b.y+.5); c.srcN=int(b.z+.5); c.total=kG(c.geom).x; return c; }
float kCA(KChain c,int i){ vec4 t=kG(c.geom+1+(i>>2)); int j=i&3; return j==0?t.x:j==1?t.y:j==2?t.z:t.w; }

// paintArcAt / arcAt transliteration (RR:3600, RR:1381) - including open chains' negative arcs for ctrl<0
float kArcOfCtrl(KChain c,float x){ int n=c.nCtrl;
  if(c.closed){ float fl=floor(x),t=x-fl,nf=float(n); int i0=int(fl-nf*floor(fl/nf)); int i1=i0+1>=n?0:i0+1;
    float a0=kCA(c,i0),a1=kCA(c,i1); if(a1<=a0)a1+=c.total; float a=a0+(a1-a0)*t; return a-c.total*floor(a/c.total);}
  int i=clamp(int(floor(x)),0,n-1); float a0=kCA(c,i), a1=i+1<n?kCA(c,i+1):c.total;
  return min(c.total, a0+(a1-a0)*(x-float(i))); }
float kArcU(KChain c,float x){ return c.closed ? kArcOfCtrl(c,x)+c.total*floor(x/float(c.nCtrl)) : kArcOfCtrl(c,x); } // monotone unwrapped

// buildRgbCacheFor's arc->ctrl mapping (largest i with cal[i]<=a, then t=min(1,..)), as a binary search
float kCtrlOfArc(KChain c,float a){ int lo=0,hi=c.nCtrl-1;
  for(int it=0;it<13;it++){ if(lo>=hi)break; int m=(lo+hi+1)>>1; if(kCA(c,m)<=a)lo=m; else hi=m-1; }
  float a0=kCA(c,lo), a1=lo<c.nCtrl-1?kCA(c,lo+1):c.total; return float(lo)+(a1>a0?min(1.,(a-a0)/(a1-a0)):0.); }

const float K_TAU=6.283185307179586;
float kTurn(vec2 cs){ float t=atan(cs.y,cs.x)/K_TAU; return t<0.?t+1.:t; }
float kArcScale(KChain c){ return c.closed?c.total:c.total/0.45; }              // G1's aArcPos convention
float kCtrlScale(KChain c){ return c.closed?float(c.nCtrl):float(c.nCtrl-1)/0.45; }
```

**Ribbon vertex shader (G2.0).**
- `ch = int(aChain+.5); c = kChain(ch); arc = kTurn(aArcPos)·kArcScale(c); ctrl = kCtrlOfArc(c, arc)`.
- Output `vCtrlCS = (cos θ, sin θ)` with `θ = 2π·ctrl/kCtrlScale(c)`. This is the same unit-circle trick G1 uses for arc, so a closed ring's wrap quad interpolates seamlessly.
- Pass the chain header as `flat` varyings (`vChain`, `vChI`, `vChF`). That saves three fetches per fragment.

**Fragment shader, at the top of main.**
- `arc = kTurn(vArcPos)·kArcScale`, `ctrl = kTurn(vCtrlCS)·kCtrlScale`.
- `pxArc = length(fwidth(vArcPos))·kArcScale/2π`. This is seam-free; `fwidth` of the decoded arc would explode at the ring seam.

### 3.3 Section colour (VS for ribbons, FS for fans)

```glsl
vec3 kHsl(float h,float s,float l){ vec3 k=mod(vec3(0.,8.,4.)+h/30.,12.); float a=s*min(l,1.-l);
  return l-a*max(vec3(-1.),min(k-3.,min(9.-k,vec3(1.)))); }                      // hslToRgb order (r,g,b)=(f0,f8,f4)
vec3 kGamut(float v){ return kHsl(mod(uKGamut.x+(v-.5)*uKGamut.y,360.),uKGamut.z,uKGamut.w); }
float kEase(float u){ return u+(u*u*(3.-2.*u)-u)*uKSect.y; }                     // easeAt, exact (no 6 pieces)
vec3 knotSection(KChain c,float ctrl){
  int sl=clamp(int(floor(ctrl)),0,c.nCtrl-1); vec4 I=kS(c.idx+sl); int run=int(I.x+.5);
  int b=int(uKBase.x)+4*run; vec4 R0=kS(b), R1=kS(b+1), R2=kS(b+2), R3=kS(b+3); int fl=int(R1.w+.5);
  if((fl&4)!=0){ int j=c.closed?(sl+1==c.nCtrl?0:sl+1):min(sl+1,c.nCtrl-1);
    return kGamut(mix(I.z,kS(c.idx+j).z,ctrl-float(sl))); }                         // noise: material-attached
  float cu=(c.closed&&ctrl<R0.x-1e-4)?ctrl+float(c.nCtrl):ctrl;                     // wrap run (ctrlB > n)
  vec3 col;
  if((fl&2)!=0) col=mix(R1.xyz,R3.xyz,clamp((cu-R0.x)/max(R0.y-R0.x,1e-6),0.,1.)); // depth sweep
  else { float sp=R0.y-R0.x;
    float ra=(fl&8)!=0?R0.z+(.5*sp-R0.z)*uKSect.x:0., rb=(fl&16)!=0?R0.w+(.5*sp-R0.w)*uKSect.x:0.; // rampLen
    float da=cu-R0.x, db=R0.y-cu;
    col = (ra>0.&&da<ra)? mix(R1.xyz,R2.xyz,kEase(clamp(da/ra,0.,1.)))
        : (rb>0.&&db<rb)? mix(R3.xyz,R2.xyz,kEase(clamp(db/rb,0.,1.))) : R2.xyz; }
  return (fl&1)!=0 ? kGamut(col.x) : col; }
```

Notes:
- The B-end form uses the identity `easeAt(1−u) = 1 − easeAt(u)`, so it equals `pushRampRgb(mid→rgbB)`.
- Strands get `R1/R2/R3 = (vA, mid, vB)` coordinates with `rA0 = rB0 = min(2.4, span/2.5)`.
- Segments get RGB `(rgbA mean, mid, rgbB mean)` with `r0 = min(1.0, 0.18·span)`.
- Depth gets SWEEP with `(coordJ(va), coordJ(vb))`.
- Mono is a gamut-space pseudo-run at 0.5. A hue change is then a uniform-only change for every scheme except segments, whose RGB-mean endpoints need a run-table rebuild (an event).
- `section_colors.ts` becomes `buildSectionRuns(...) → RunSection[]` plus a per-chain slot→run map, and `evalRunSection(run, ctrl, reach)`. The latter is the TS twin and keeps using `rampLen`/`easeAt`. The swatch collision walk, Dijkstra and junction RGB-means stay CPU-side at event time.

### 3.4 Reveal: ignition, ages, mask, gates

```glsl
struct KIgn{ bool hit; float tA,cFrom,dir,t0,rate,tEnd,span; };
KIgn kIgnition(KChain c,float ctrl,vec4 I){ KIgn r; r.hit=false; r.tA=1e9;
  if(uKInk.y>.5){ /* lerp I.w with the next control's .w -> r.tA, r.hit=true */ return r; }
  int s0=int(I.y+.5); if(I.y<-.5) return r;
  for(int k=0;k<2;k++){ int s=s0+k; if(s>=c.src0+c.srcN)break;
    vec4 A=kS(int(uKBase.y)+2*s), B=kS(int(uKBase.y)+2*s+1);
    if(ctrl<A.x-1e-4||ctrl>A.y+1e-4)continue;
    float t=B.x+abs(ctrl-A.z)/B.y; if(t<r.tA){ r.hit=true; r.tA=t; r.cFrom=A.z; r.dir=A.w; r.t0=B.x; r.rate=B.y; r.tEnd=B.z; r.span=B.w; } }
  return r; }
uniform vec4 uKKnots[8];
float kWall(float tA){ vec4 k=uKKnots[0]; for(int i=1;i<8;i++){ vec4 q=uKKnots[i]; if(q.w<.5||q.x>tA)break; k=q; } return k.y+(tA-k.x)*k.z; }
float knotRevealMask(KChain c,KIgn g,float ctrlU){                       // == revealMaskFor per sample
  if(uKFx2.z<.5) return 1.;  if(!g.hit||uKFx.y<g.tA) return 0.;
  if(uKInk.y>.5) return clamp((uKFx.y-g.tA)*uKInk.x/INK_TAPER_WORLD,0.,1.);
  float prog=(uKFx.y-g.t0)*g.rate; if(prog>=g.span-1e-9) return 1.;   // finished end is hard (as today)
  float dIn=g.dir*(kArcU(c,g.cFrom+g.dir*prog)-kArcU(c,ctrlU));
  float m=min(1.,dIn/uKShape.x); return (uKShape.y>0.&&m<1.)? uKShape.y+(1.-uKShape.y)*m : m; }
```

Ages, in wall seconds, measured on the reveal-relative clock:
- **FX age (rainbow, dust, comet):** `fxNow − kWall(tA)`. This is the exact front arrival. The old mask-crossing ignition with sub-frame back-dating approximated it.
- **Burn/roots age:** `max(0, fxNow − kWall(min(tA + hot, tEnd)))`, where `hot = BURN_HOT_ARC / (rate·(kCA(i+1) − kCA(i)))` is the anim time for the head to clear 0.45 arc at the local arc-per-ctrl. This equals b76f556's swept dating ("age 0 inside the hot head, then time since the head left"). Its "finished front" case equals `datePassedRuns`.
- Both ages are linear in ctrl inside a source and continuous across source boundaries (V minima at vertices, peaks at cMeet). **There are no bands at any frame rate.**

Ink becomes stateless: ignition times are computed per control from the reveal-start positions, `tIgn = (|p − o| + inkPerturb(p))/inkSpeed`. Dye boundary and latch become implicit. The ink duration becomes exact (max tIgn + 0.6/inkSpeed) instead of the 17.8 s cap. **Semantic change:** the dye no longer re-reads settling positions. Ink + burn becomes possible; whether to enable it is a user decision.

**Gates, computed per slot or joint by the CPU mirror and animated by the GPU from the clock.**
- `T_rev(c)`: the time the mask reaches 0.98. The tip must clear `D98 = taper·(0.98 − tipFloor)/(1 − tipFloor)` of arc past c; solve `c98 = ctrlOfArc(arcOf(c) + dir·D98)`, then `t = t0 + |c98 − cFrom|/rate`, capped at `tEnd`. For ink: `tIgn + 0.98·0.6/inkSpeed`.
- `T_fx(c)`:
  - dust/comet: `wall(tA) + end·s⁻¹(0.97)`;
  - rainbow: `wall(tA) + HOLD + FADE·s⁻¹(0.8)`;
  - where s⁻¹ is the inverse smoothstep, precomputed in TS.
- Crossing: `tShow = max(T_rev, T_fx)` over both passes' render ctrls, recomputed each `update()`; for ungated scenes `tShow = −1e9`. The gap shader uses `strength · smoothstep(clamp((fxNow − tShow)/CROSSING_FADE_IN, 0, 1))`. Consequences:
  - `crossingShownAt` is deleted;
  - emergent crossings now fade in;
  - gap fades no longer need `update()`.
  - Push `underWindows` (yarn, `armReach`) only once `fxNow ≥ tShow`, to keep today's behaviour.
- Joints: `J1.tOn = max over arms T_rev(slot + dir·0.8)` and `J1.tLastIgnWall = max over arms wall(tA)`. `fxSolid` is monotone in age, so the least-settled arm is the latest-ignited one. Shader: `alpha = fxNow < tOn ? 0 : fanFx(fxSolid(w(fxNow − tLastIgnWall)))`. Fans are always emitted, and `rebuildFillets`' `animating` gate drops `fxHot`/`filletFxWas`.

### 3.5 FX shading (per pixel, only when `uKFx.w = 1`, a uniform branch)

- **burn/roots:** a line-for-line transliteration of RR:3987-4063, applied to `S` (the `vSection` varying) with the age above.
  - Sample coordinate `k = arc/arcPer` (continuous).
  - Flicker: `fl = .5 + spatial·(.3 sin(φ13 + k·.31) + .2 sin(φ29 + k·.83)) + (1 − spatial)·flTime`, with `spatial = 1 − char`.
  - Revealed pixels only (`fxNowA ≥ tA`).
- **rainbow:** `p = 1 − smooth((age − HOLD)/FADE)` (0 past the end), then the existing stripe and white-wash block with `side`.
- **dust/comet:** `alpha = smooth(age/end)` (0 when not yet revealed).
- **Swell:** `1 + RAINBOW_SWELL·smooth((p − .2)/.8)` lives in `knotRevealWidth`. The CPU mirror applies it until G3.

### 3.6 Gameplay paint and composition (per pixel)

```glsl
float kPAt(float d){ return d<=uKTrail.y?1.:max(0.,(uKTrail.x-d)/(uKTrail.x-uKTrail.y)); }
float kGOfP(float p){ return uKTrail.z>.5?clamp(p,0.,1.):clamp(6.*p-2.5,0.,1.); }   // strip parity: texels 117->118
float kCov(float sd,float px){ return clamp(sd/max(px,1e-6)+.5,0.,1.); }
float kPulseV(float d,float span,bool inw,bool hov){ if(d<0.||d>span)return 0.;
  float ew=clamp((span-d)/PULSE_END_WINDOW,0.,1.); if(hov)return ew*uKPaint.z;
  float s=uKPulse.z, raw=inw?d+uKPulse.x:d-uKPulse.y, ph=raw-s*floor(raw/s), dist=min(ph,s-ph);
  float dC=max(0.,d-(ph<=s-ph?ph:ph-s));
  float bump=max(0.,1.-dist/CREST_WIDTH)*min(1.,dC/CREST_RAMP);
  float fl0=(PULSE_FLOOR+PULSE_CORE_BOOST*max(0.,1.-d/PULSE_CORE_RADIUS))*max(0.,1.-d/PULSE_REACH);
  return min(1.,(fl0+bump*.9)*ew)*uKPulse.w; }                                        // == pulseValueAt
```

Paint for run `r` with walk flags. The run ends' arcs are `aA = kArcU(ctrlA)` and `aB = kArcU(ctrlB)`, both integer ctrls, so one fetch each. `arcU` is the pixel arc unwrapped into `[aA, aB]`. The steps run in the CPU's write order:

1. `g = TRAVELED ? 1 : 0`.
2. **In-flight move** (`run == uKMove.x`).
   - Gold mode: `g = max(g, kCov(arcU − aLo)·kCov(aHi − arcU))` over `[min(cur, anchor), max]`.
   - Trail mode: p is linear in arc from `pAt(0) = 1` at cur to `pAt(swept)` at the anchor; then `g = kGOfP(p)` within the piece (assignment, because the newest wins).
3. **TRAIL runs** (outside the in-flight piece): `dNear = P1 + sweptLen` at each end. **Parity form:** p is linear in arc between `pAt(dNear)` at the near end and `pAt(dFar)` at the far end, or 0 at the point where d = L if the run crosses L. That is exactly `writeChainPaint`'s span-end interpolation. Then `g = kGOfP(p)`.
4. **Caps:** `g = max(g, kGOfP(mode == trail ? pAt(capX + swept) : 1)·kCov(capR − |arcU − aEnd|, pxArc))`. Caps never darken.
5. **Pulses** (override; the A arm, then the B arm, as the CPU orders them): if `v = kPulseV(arcU − aA | aB − arcU, aB − aA, INWARD, HOVER) > 0.004` then `pulse = true, famB = ON_PATH, vP = v`.
6. **Glow** (reveal; not for burn/roots): for the hint source and up to ±2 neighbours, when the source is moving, `d = |arc − kArcOfCtrl(cTip)|` (ring-min). `glow = max(d ≤ hold ? 1 : 1 − (d − hold)/(glowArc − hold))`, revealed pixels only.

```glsl
vec3 kCompose(vec3 S,float g,bool pulse,bool famB,float vP,float glow){
  bool fam=pulse?famB:(g>=.5);  float v=max(pulse?vP:0.,glow);                     // GOLD_FAMILY_MIN 118/256 <=> g>=.5
  if(pulse||glow>0.) return fam? mix(uKGold.rgb,vec3(1.),K_BAND*v) : mix(S,vec3(1.),K_BAND*v);  // K_BAND=0.94*110/111
  return mix(S,uKGold.rgb,g); }
```

`kCompose` is the closed form of the strip:
- base texels have weight 0;
- texels 117→118 form the only base→gold ramp, which is why `goldU(p)` renders as `clamp(6p − 2.5)`;
- band A is `mix(S, white, 0.94·x/111)`;
- band B is `mix(gold, white, ·)`.

It reproduces the strip up to its 8-bit quantisation (≤ 0.5/255). It also reproduces the glow family rule, including the CPU's discontinuity for partially-gold trail samples.

### 3.7 Assembly

**Ribbon FS:**
```
S = vSection                                  // VS knotSection
sh = knotShade(c, ctrl, arc, vUV.y, pxArc, S) // FX on S -> stripes -> paint compose; .a = materialize
a = sh.a · gapKeep(pxW)
if (a ≤ .002) discard
finalColor = vec4(sh.rgb, 1)·vColor·a
```

**Junction FS:**
- `armPaint` + `composeU` become `knotComposedAt(kChain(h.x), kCtrlOfArcNear(arm, arc), arc, pxW)`.
- Use a bounded local scan of ≤ 8 controls from the arm's anchor slot, i.e. 2-3 packed fetches.
- `pxW` stands in for `pxArc`, because the arm arc is computed in non-uniform flow.
- The edge-aware blend of COMPOSED colours is unchanged (render lore).
- `aM = knotFanAlpha(jAt(rec + 1))`.

**Knot mode:** pseudo-run section colours; paint is off (mode 0); FX colours are gated by paletteMode for parity (today knot mode gets none). Optionally enable later.

**Fast paths:**
- uniform branches skip FX and paint wholesale;
- a static fabric pixel costs about 3 extra fetches (CTRLIDX, R0, P0), plus 2 more only when the run has paint flags;
- section colour is per-vertex, so it adds no per-pixel cost.

### 3.8 Exactness

**Identical** (fp32, ≤ 1/255):
- section values at samples for RGB schemes (segments, mono, knot), which equal a freshly baked cache;
- pulse, hover, cap, span and glow formulas;
- the junction field's structure;
- the plan, and the reveal mask (the same source math in the CPU mirror);
- the composition math.

**Visible changes:**
1. **Crests are exact per pixel.** Gouraud on 0.09-arc samples clipped the 0.72-wide triangular crest by up to about 12% as it slid (crawl); that is gone.
2. **Gold edges sit at the exact ctrl.** The traversal front and cap rims get a 1-px AA instead of stepping per sample. The front moves continuously with the dot. Run-end edges at junctions are AA'd one-sidedly, under the seal disc and webs.
3. **Exact HSL for gamut-space schemes.** strands, depth and noise use exact HSL per vertex instead of chained 0.06 RGB lerps (a few /255 mid-chord). junctionBlend eases are exact smoothstep (the 6 pieces were within about 1/255).
4. **No cache staleness.** Up to 0.1 ctrl of drift is gone, and so are the about 30 re-bakes/s under flow.
5. **Burn/roots are continuous at any fps** and age in real wall time.
6. **Burn now also applies to constant-colour chains** (mono, decorative). `applyBurnColors` silently returned null for length-3 caches (RR:3893). This is a likely bug fix; flag it to the user.
7. **FX ignition is exact.** Rainbow, dust and comet timing is no longer frame-quantised.
8. **Emergent crossings fade in.**
9. **Noise is material-attached** at `ps.initial`: deterministic and appearMode-independent. It used to be baked at the first update's arc fractions, which depended on the pre-sim, the flow, and frame timing.
10. **Ink dye is evaluated on reveal-start positions.**
11. **Trail (user decision).** `uKTrail.z = 0` keeps today's look. Today's trail "fade" is compressed into p ∈ [0.417, 0.583] (1/6 of the fade zone) because of the texel layout. `= 1` gives the intended linear fade over the oldest 30%. An exact `pAt(d)` variant is a further constant.
12. **Degenerate full-ring self-loop pulses.** The CPU skips them via `spanArc ≤ 1e-6`. Transliterate that skip for parity, or fix it deliberately.

### 3.9 Precision and WebKit/mobile

**Precision**
- Arcs are ≤ about 500 world (fp32 ulp about 3e-5); ctrl ≤ 8192 (13 search steps); sample index k ≤ about 6000. `k·0.31` stays under about 2000 rad, so its ulp is about 1e-4.
- No absolute clock ever reaches the GPU. The CPU reduces pulse travel mod spacing, the hover breath value, burn phases mod 2π, fxNow and knots relative to the reveal origin, and fadeIn — all in float64.
- After FX settle, `fxOn = 0` and fxNow may be frozen.
- atan decode precision is about 1e-7·scale.

**WebKit/mobile**
- WebGL2 / GLSL ES 3.00 only: highp is mandatory in the FS, `flat int` varyings, vertex texture fetch (at least 16 units), `texelFetch` on RGBA32F.
- Requires NO float filtering, NO render-to-float (no `EXT_color_buffer_float`), and no extensions at all.
- Loops have constant bounds with `break`.
- Use no `%` on possibly-negative ints; use `floor`-based mod.
- Uniform arrays of size 8 are fine.
- `fwidth` stays at the top of main.
- Sampler budget: ribbon FS ≤ 5, fan FS ≤ 6 — well under 16.
- Risks: shader compile time on Safari (Metal translation of gap lib + paint lib), and mobile fragment cost on top of G1's gap loop. G1 is already optimising its own 2.3 ms prototype loop.

---

## 4. CPU MIRRORS

**Modules**
- `src/render/paint_math.ts`: pure TS with no pixi imports, so vitest can import it. Functions are named like their GLSL twins (`kChain`, `kArcOfCtrl`, `kCtrlOfArc`, `knotSection`, `kIgnition`, `kWall`, `knotRevealMask`, `kBurn`, `kPulseV`, `kPaint`, `kGlow`, `kCompose`, `knotShade`, `knotComposedAt`, `knotRevealWidth`, `knotFanAlpha`). Each carries a `// GLSL twin` comment.
- They read the SAME Float32Array mirrors (`FloatRows.data`) and a plain uniform-values object.
- `src/render/paint_model.ts` (pixi glue) owns the three FloatRows plus the UniformGroup and the builders: `buildScene`, `setLook`, `setReveal`, `setPaintState`, `writeGeom`/`flush`, `tick` (uniform reductions).

**Remaining CPU consumers (all through the mirror)**
1. Start/exit discs: `sectionColorAt` → section + burn at the marker ctrl. The b76f556 behaviour "discs burn with their tails" is preserved exactly.
2. `revealMulAtCtrl` and `fabric.revealQuery` (exit marker gating).
3. Until G3: the per-sample width multiplier (mask × swell) for `RibbonMesh.update`. It replaces `revealMaskFor` and `rainbowWidthMul`, and the swell keeps the concave clamp in RibbonMesh.
4. Gap-slot `tShow` (registered, emergent, marker) and the joint/axis record `tOn`/`tLastIgn`.
5. `needsFxRender` → `revealOn || fxNow < fxHotUntil`. Before G3 this is needed only for the swell geometry.
6. Particle spawning: tips from the plan; ink frontier taken from the mirror masks or the ink table.
7. `fieldProbe.at` → `cpuJunctionField` with `knotComposedAt`.
8. A new probe hook `renderer.paintProbe(chain, ctrl, side)`.
9. vitest parity suites.

**What stays CPU and is not colour:** the yarn (`underGapVisibility`, G1 windows), the knot-mode tip discs, fog, and hit-testing.

**How the one source of truth is kept**
- (a) Constants are generated into GLSL from `paint_const.ts`.
- (b) Function-level transliteration with twin markers, as `cpuJunctionField` does today.
- (c) **Parity tests** (vitest, node). A frozen copy of the pre-G2 per-sample pipeline is checked into `test/render/fixtures/`: `sectionRgbAt` over VSegments, `writeChainPaint` U logic, `pulseValueAt`, `applyRevealGlowU`, and the strip with `accentSampleCpu`. It is compared against the mirror at sample arcs on synthetic chains and scripted states.
- (d) **GPU census** (`probe_paintcensus`, built from the `probe_gpucensus` template). A probe mesh drawn with the production library takes (chain, ctrl, arc, side) as attributes, into an offscreen target, with clocks pinned; it is compared against `paint_math` (≤ 2/255). The fan census (`probe_gpucensus`) keeps working through `fieldProbe`.
- (e) **Texture readback** (`probe_texreadback`, extended to uKStatic/uKGeom/uKPaint vs mirrors, using `EXT_color_buffer_float` on desktop only).

---

## 5. STAGED PLAN

Every stage lands end to end on master, with `npm test` green and the physics golden untouched.

Every stage uses these common recipes:
- `diag_screenshot` same-state crops with `cells_diff`;
- `renderer.paintClock` pinned and the pointer parked off the maze (G1 probe lore);
- `am=instant` for settled A/B; `mf=0` for knot mode;
- unique scratchpad subdirectories with a stamp-SHA check;
- **perf:**
  - `probe_cpuprof_tick` with `FN=tickPaint` (ms/call at rest with pulses);
  - a NEW `probe_uploads.mjs` that wraps `bufferData`/`bufferSubData`/`texImage2D`/`texSubImage2D` and sums bytes per rAF — at rest, during a move, during a reveal;
  - `probe_gpudraw` (draw-phase GPU ms at 3200×1800 DSF 2);
  - `probe_glreadback` (stale GPU buffers = 0).

### G2.0 Infrastructure (no visible change)

- `float_rows.ts` extraction.
- `paint_const.ts`, `paint_glsl.ts` (access/geometry helpers only), `paint_math.ts` + `paint_model.ts` (CHAINS + CTRLIDX `.x` + KGEOM).
- `aChain`; the VS computes `vCtrlCS` and the flat chain header.
- `advanceClocks`.
- A debug view (`uKBase.z`): rgb = (fract(ctrl), fract(arc/4), chain/64).

Verify:
- vitest: `kCtrlOfArc`/`kArcOfCtrl` against `buildRgbCacheFor`'s mapping and `paintArcAt` on random tables, exact in f64.
- Debug-view readback at centreline pixels against CPU per-sample ctrl/arc: |Δctrl| < 2e-3, |Δarc| < 1e-3.
- Debug off → 0 px diff.
- Perf: `update()` +< 0.1 ms; GPU +< 0.05 ms (VS search).

### G2.1 Reveal and FX on the GPU

- SRC + CTRLIDX `.y/.w` + knots + FX uniforms; `kIgnition`/`kWall`/burn/rainbow/materialize in `SECTION_FRAG`, applied to `vSection` (still CPU aColor).
- Glow stays CPU for now; it moves in G2.3.
- Gates via `tShow`/`J1`; masks and swell via the mirror.
- Fans apply burn per pixel (they still read the rgb+u rows).
- **Delete:**
  - burn: burnScratch, newBurnPool, armBurnPools, datePassedRuns, revealAdvanced/revealProg/burnArmed/revealFirstPaint;
  - FX weights: fxScratch, applyFxWeights, aFx/setFx, swellScratch;
  - gating state: crossingShownAt, the fxMatHot pool scan, fan fx/on, the `animating` fxHot gate, colorAtArc's burn branch;
  - the interval loop in revealMaskFor.

Verify:
- `am=instant` → identical to G2.0 (FX branch off).
- Pinned reveal and paint clocks at t ∈ {0.5, 1.5, 3} s for each preset (ink+dust 3, trace+burn 2.2/3, trace+rainbow 2, trace+roots 1.5, bloom+comet 2.2) → GPU census ≤ 2/255.
- **Band census** (the b76f556 metric: short non-dark runs inside char), at 60 fps and forced low fps (CPU throttle 4×, physics on/off) → expect 0. Master residual is 2/12 and 8/169.
- `probe_revealframes` sequences old vs new for the user.
- Gate strength monotone per crossing; no popping on emergent crossings.
- Perf during the reveal: tickPaint ms and bytes/frame. `aColor` ping-pong, `aFx` and burn PAINT rows go to 0.

### G2.2 Section colours on the GPU

- RUNS region; `buildSectionRuns` + `evalRunSection`; noise `.z` at `ps.initial`.
- VS `knotSection` → `vSection`. Fans use `knotSection` per pixel.
- recolor = table rebuild + uniforms; jbl = uniform only (wire the panel to `renderer.setJunctionBlend`).
- **Delete:** rgbCache, bakeFrac, cacheDrift, recolorPending, rgbCacheReady, sectionRgbAt, the noise bake, aColor.
- Rewrite `section_colors.test.ts` against the run form, keeping the same contracts: junction RGB-mean, self-loop counted twice, depth continuity, mono constant, reach 0 identical.

Verify:
- vitest `evalRunSection` vs the frozen VSegment lookup for 5 schemes × reach {0, .1, .25, .5, 1} → ≤ 1/255. The documented gamut-chord deltas are reported separately.
- GPU census ≤ 2/255.
- `fieldProbe` vs ribbon footprint census (CLAUDE.md render lore) not worse than today's means 0.005-0.015.
- Junction-convergence census → 100% at every frame. `probe_rebakerate` → 0 bakes.
- Same-state A/B vs G2.1: ≤ 2/255 outside the documented gamut and noise deltas.
- A jbl drag uploads 0 table bytes.

### G2.3 Gameplay paint on the GPU

- KPAINT + `setPaintState` (event-driven).
- `FabricMazeRenderer` builds a `PaintState` only when a key changes (path, head, hover, anim kind/edge, mode, solved). It replicates `buildTrail` distances (in-flight excluded, newest occurrence) and caps for every run end sharing (chain, ctrl). It calls `ribbons.setMove(...)` per move frame (uniform).
- Per-pixel `kPaint` + `kCompose`; glow moves here; fans use `knotComposedAt`.
- **Delete:** writeChainPaint, writeFillPaint, paintData/uPData, uScratch, paintRev, chainRev, the toWrite machinery, applyRevealGlowU, the accent strip textures and bindAccent (stop creating them), aUV.x paint.

Verify:
- vitest parity vs the frozen pipeline across scripted states (gold/trail/string, advance and backtrack mid-flight, hover, caps, self-loops, solved) → ≤ 1/255 plus documented deltas.
- `probe_gpucensus` with MOVES=5 ≤ 2/255.
- `probe_pulseframes` A/B: crest shape and steadiness.
- `probe_glreadback`: no per-tick vertex uploads remain.
- Perf: tickPaint at rest from 1.1-1.2 ms to about 0.05 ms (estimate); bytes/frame at rest and during moves → uniforms only; GPU ms delta at 3200×1800 plus `probe_phone`.

### G2.4 GPU particles (optional; independent of G3)

- An instanced quad mesh with a custom shader. Pixi v8's `GlGeometrySystem.draw` honours `geometry.instanceCount`.
- Spawn records go to a KFX FloatRows ring (4 texels per particle). The CPU keeps the identical RNG spawn decisions, so the look matches, and uploads only new rows.
- The VS evaluates closed-form motion from (record, fxNow):
  - spark: drag + gravity, `x0 + v0(1 − e^{−kt})/k + (g/k)(t − (1 − e^{−kt})/k)`;
  - streak: drag;
  - halo: linear;
  - smoke and dust: complex-exponential curl + drag (+ rise);
  - then tints, alpha and twinkle.
- The CPU tracks alive-until so it can skip spawns when full.

Verify:
- Same seed and spawn log: GPU particle positions against an f64 closed-form mirror.
- Visual A/B per preset.
- CPU `tick` ms and ParticleContainer uploads → 0.
- Note: closed form is frame-rate independent, unlike the old Euler with its dt clamp.

### G2.5 Cleanup and lore

- CLAUDE.md RENDER LORE: per-pixel paint contract; clocks reduced on the CPU; seam-free `fwidth` via unit-circle varyings; the mirror is the census reference; gate times instead of fade clocks; the trail-fade finding.
- PROBE LORE: pin the clocks by overriding `advanceClocks`; the KSTATIC/KGEOM/KPAINT readback.
- Update `probe_glreadback`/`probe_texreadback`/`probe_gpucensus` for the removed buffers and textures.

---

## 6. RISKS, and what to keep on the CPU

**Risks**
1. **GPU cost on mobile.** G2's per-pixel paint sits on top of G1's gap loop. Mitigations: section per vertex; flat chain header; uniform branches; per-run flags. Measure on a real WebKit device. Spare lever: run paint per vertex only for runs whose flags are just TRAVELED.
2. **Transliteration drift.** Mitigated by generated constants, parity tests against the frozen old code, and GPU census probes. Keep frozen fixtures until G2.5.
3. **Visible changes need user sign-off:** the trail-fade compression, burn on mono/decorative chains, noise attachment, ink frozen positions, ink + burn, knot-mode FX.
4. **Interface churn with G1 (gap header still moving), G3 and G4.** Mitigations: land the `paint_*` modules early to cut merge overlap in the 5k-line `ribbon_renderer.ts`; the §3.1 contract is the boundary; G3 must supply ctrl per fragment and absorb `knotRevealWidth` into extrusion.
5. **The mask and swell stay CPU until G3.** They go through the same mirror code, so they are consistent by construction, but `update()` must keep running during the reveal and swell until G3.
6. **Probes and tools** that reach `paintData`, `burnScratch` or the aColor/aFx/aUV buffers break. Update them per stage.
7. **Shader compile hitch** on first draw, especially on Safari. Pre-warm during the pre-sim.

**Deliberately kept on the CPU**
- The reveal plan and the section-run, paint-state and ink/noise tables: combinatorial, event-time work.
- The traversal dot ctrl (curvature-slowed integration): one uniform per frame.
- ctrl↔arc tables, until splines move to the GPU in G3.
- Mask, swell and gate times: geometry decisions fed to the slot windows, until G3.
- Marker colours (2 points).
- Particle spawn decisions, so RNG parity holds.
- The yarn: a G3 candidate as a thin ribbon masked by its host's slots.
- The knot-mode tip discs: cheap, and drawn outside the ribbons.
- Fog, audio, hit-testing.

### Critical files for implementation
- src\render\ribbon_renderer.ts
- src\render\junction_field.ts (its FloatRows/uploader move to a new float_rows.ts; the new paint_glsl.ts, paint_math.ts and paint_model.ts sit beside it)
- src\core\section_colors.ts
- src\render\fabric_maze_renderer.ts
- src\render\gap_mask.ts and ribbon_mesh.ts (G1 worktree src\render\)
---

## 7. Implementation log and deviations

### G2.0 infrastructure (landed)

- `float_rows.ts` (FloatRows + the "knot-float-rows" uploader, plus an upload
  byte counter for probes), `paint_const.ts`, `paint_glsl.ts`,
  `paint_math.ts`, `paint_model.ts` as planned. Layout writers
  (`writeChainHeader`, `writeGeomTable`) live in `paint_math.ts` so the scene
  and the vitest fixtures share one layout.
- Deviation: `aKey = (chain, sample index)` replaces the planned `aChain`
  (see section R); the fragment's arc comes from the interpolated sample
  wrap pair (`vSamp`), its ctrl from the interpolated vertex ctrl refined by
  `kCtrlNear` (a ring-aware slot walk), so both are exact per pixel.
- `advanceClocks(dt)` (main.ts, right after `reveal.tick`); `tickPaint` no
  longer advances the paint clock. Probes freeze it by overriding
  `advanceClocks`.
- Debug view `paintDebug` (1 = ctrl, 2 = arc): (fract v, fract 16 v,
  chain/63), decoded to ~1.2e-4 through 8 bits. `ProbeTriMesh` +
  `renderer.probeTris(n)` + `renderer.paintMirror()` carry the censuses.
- Verified: vitest mirror parity vs the frozen pre-G2 mapping (5 tests,
  f64); GPU census (screen-space probe triangles) |d ctrl|, |d arc| <= 3e-4
  (the readout limit) on the default fabric, knot mode and the ring URL;
  cross-build same-state A/B (physics-off links settle deterministically):
  0 px on def / knot / user / fat / def + 5 moves, ring 2 px at delta 1
  (shader-recompile rounding); `update()` +0.16 ms/call (the KGEOM writes),
  GPU unchanged (1.71 -> 1.69 ms/frame at 3200x1800, fw 0).
### G2.1 reveal and appearance FX on the GPU (landed)

- Every ribbon and fan pixel finds its reveal source (hint in CTRLIDX.y,
  up to 4 pieces scanned), its ignition anim time in closed form, and its
  wall age through the speed knots; burn / roots tint, rainbow stripes and
  dust / comet alpha are evaluated per pixel (`kFxColor`, `kRainbowBlend`).
  Deleted: the burn pools (ignition sweep, run dating, ping-pong colors),
  the FX weight pools, `aFx` / `setFx`, the swell scratch, the per-crossing
  fade clock, the FX pool scans, the fan `fx` header and the interval mask
  loop.
- Deviation: the sources live in their own texture (KREVEAL, `kR`), not a
  KSTATIC region, so event-driven regions never re-lay each other out
  (`uKBase.y` is unused).
- Deviation: a gap slot's show time is encoded in the SIGN of its strength
  (texel 1.w: -(1 + tShow)) rather than texel 8.w - no extra fetch on the
  gap shader's fast path (`gapStrength`).
- Deviation: show times are LATCHED once open (registered crossings,
  joints, lone caps). The estimate is re-solved each frame from the live
  arc tables, which move while the knot settles under the intro; an open
  gap must never fade back out.
- Deviation: fans are always emitted; their record gains the gate texel J1
  = (tOn, tLast) at rec + 1 (arms start at rec + 2), the arm header carries
  the chain (paintBase moved to the chain header C1.w until G2.3).
- Deviation: the CPU width mask is the MAX over covering sources
  (revealMaskFor's interval union), the GPU ignition the EARLIEST arrival
  (they differ only where two fronts touch one point); a source reaching a
  closed ring's seam exactly gets a zero-length companion piece at ctrl 0.
- Deviation: the burn flicker phase runs on the reveal clock (fxNow), not
  the page's paint clock, so an instant of the reveal renders the same
  whatever preceded it.
- K4 defaults: burn / roots on single-color threads (mono now burns); ink
  ignition per control from reveal-start positions with an exact duration
  (`anim.setDuration`; the latch machinery is gone); ink + burn and knot
  mode stay FX-free.
- `needsFxRender` keeps `update()` running only while the rainbow swell is
  live (geometry) or a gate is pending; dust / comet / burn tails animate
  with no CPU work. Marker gaps keep their CPU reveal gate (they popped
  before and still do); emergent crossings now fade in like registered
  ones.
- Reveal-time CPU work kept at master's level (each change measured):
  a gate solves its slot only from GATE_LEAD (0.1 s) before its show time;
  pending show times are CACHED per crossing / joint while their inputs
  hold (gateRev: the speed knots, the FX style, the taper shape) and their
  points move less than 0.1 ctrl; emergent crossings skip far-off gates;
  the width mask exits in O(1) for chains wholly revealed or not started
  (per-chain reveal spans); fans whose gate is far off are not emitted.
  LORE: the first cache keyed only on the knots, and the first update()
  after beginReveal can run before the FX style uniform is set - it froze
  reveal-only show times, and rainbow gaps opened 0.58 s early (the
  rainbow settle tail exactly). A cache must key on EVERY input of the
  solve. Found by counting open gates against master over the reveal
  (gate_count.mjs: first gate 2.06 s on master, 1.54 s in the bad build,
  2.08 s fixed).
- GPU fast paths, both EXACT (unit-tested: the skipped and the full
  evaluation agree bit for bit, and the skipped result is the identity):
  a per-chain FX settle time (KGEOM G0.z = kWall(last finish) + the
  style's tail; the ribbon shader skips its ctrl refinement there, the
  fans their ctrl search) and a per-slot one (CTRLIDX.w = the latest
  finish of the sources the slot's points can ignite from, interval
  modes). The source hint also carries its scan count ((count - 1) / 8 in
  the fraction), so kIgnition stops after the slot's own sources.
- Verified: vitest (burn colors vs applyBurnColors' block to 6 digits,
  FX weights / fan alpha / swell to 12, width masks vs revealMaskFor <
  2e-5, the two settle skips exact); GPU FX census, every appearSequence x
  appearFx at t 1.5 and 4 (40 runs): max 0.0047 (1.2/255), none over
  2/255; am=instant same-state A/B vs G2.0: 0 px (default, knot, ring,
  user); crossing gates monotone with physics on (0 decreases); band
  census (short non-dark runs inside char): none at either speed; frame-
  rate independence (6x CPU throttle vs none, pinned at T 6): 0 px for
  burn, rainbow, comet and dust (particles hidden - G2.4 scope).
- Perf, desktop, 3200x1800 (dsf 2), b.c, physics off, 4 s of the reveal,
  3 interleaved rounds, under the perf lock but WITH another agent's six
  physics scans running (CPU ~32%; both builds equally loaded). ms per
  call (mask: ms per frame), GPU = draw-phase ms per frame:

  | trace + | build | update | tickPaint | rebuildFillets | mask | GPU mean |
  |---|---|---|---|---|---|---|
  | burn | master | 10.76 | 4.22 | 3.29 | 1.02 | 1.83 |
  | burn | G2.1 | 10.50 | 3.95 | 3.50 | 0.53 | 2.47 |
  | rainbow | master | 8.09 | 3.57 | 3.05 | 0.48 | 0.76 |
  | rainbow | G2.1 | 8.12 | 3.46 | 3.08 | 0.67 | 0.89 |

  The burn GPU cost (+0.64 ms) was +1.3 ms before the settle skips. Upload
  bytes per frame fell 4211 -> 3800 KB (burn) / 3935 -> 3780 KB (rainbow):
  the color ping-pong, aFx and the FX paint rows are gone; what remains is
  geometry (G3's scope).

### G2.2 section colours on the GPU (landed)

- Run form: `core/section_colors` `buildSectionRuns` (per walk run: the
  unwrapped ctrl span, the A / own / B colours - RGB, or a gamut coordinate
  in `.x` - the base ramps and the ctrl-per-lattice-unit factor, plus each
  slot's run; uncovered stretches get a constant pseudo run in the chain's
  first run's A colour, the old `segs[0]` fallback) and `evalRunSection`,
  its TS twin. The VSegment field is frozen in
  `test/core/fixtures/section_field_v1.ts`. junctionBlend (`uKSect`) and the
  gamut (`uKGamut`) are uniforms; `recolor` rebuilds the table and uploads
  only changed texels - a live junctionBlend change sends 0 texels
  (`renderer.lastRunUpload`; the image changes by 60-115k px).
- KSTATIC RUNS region (4 texels per run, from the row after the ctrl
  index), CTRLIDX `.x` = the slot's run, `.z` = the noise coordinate.
- The ribbon VERTEX shader evaluates `knotSection` at each vertex's ctrl
  through this frame's arc table (`vSection`). Deleted: `aColor` /
  `colorData` / the colour half of `writePaint` / `invalidateColors`,
  `rgbCache`, `rgbCacheReady`, `bakeFrac`, `cacheDrift`, `recolorPending`,
  `CACHE_REBAKE_CTRL`, `sectionRgbAt`, `buildRgbCacheFor`, the noise bake.
  The PAINT texture keeps only `.w` (the paint U) until G2.3.
- Deviation: the FANS evaluate the RIBBON's Gouraud (`kSectionAtArc`: the
  section at the two bracketing samples' ctrls, lerped), not `knotSection`
  at the pixel's exact ctrl - the joinery must match the ribbons across
  their width (render lore). Measured alternative, per-pixel exact sections
  in ribbons AND fans: fans -0.55 ms, ribbons +0.7 ms at 3200x1800 - worse.
  The arm record carries the arm's ctrl-per-arc slope (header `.y`) to
  seed the ctrl searches (`kCtrlOfArcNear`: kCtrlOfArc's exact answer by a
  short walk); one run fetch serves both samples; a pixel whose blend
  weight is 0 or 1 evaluates one arm.
- Deviation: the noise coordinates are read at the controls' positions
  when the renderer is constructed (before the first physics step: these
  are `ps.initial`, which is private to the physics module).
- Knot mode: one constant RGB run per chain (the 8-bit strand tints).
- Two FX fixes the joint-web census found (fans mid-reveal, with per-arm
  probe views `uKBase.z` 3 / 4): (1) ignition NEAR-TIES (|dt| < 1e-4 s:
  fronts leaving one junction, or meeting) go to the first source scanned
  - at a junction several fronts start at once with different hot heads,
  and the GPU's f32 ctrl flipped the choice the CPU made (up to 0.41 per
  channel on web pixels sampling the joint); (2) the burn hot head leaves
  a point when the tip is `BURN_HOT_ARC` of ARC further along
  (`kHeadLeave`, an arc-table walk) - the G2.1 form divided the head's arc
  by the point's own slot's arc per ctrl, which stepped at every slot
  boundary.
- Verified: vitest - the run form against the frozen field (mono and
  segments at junctionBlend 0 identical < 1e-9; eased segment ramps within
  0.96/255 - the old 6-piece linearisation; strands within 6.75/255 and
  depth within 5.58/255 - the old 0.06-coordinate RGB chords), the
  `knotSection` mirror against `evalRunSection` (< 2e-5, 4 schemes x 5
  blends), `kSectionAtArc` = the Gouraud of the vertex sections, the seeded
  search = `kCtrlOfArc`, the hot head continuous and `BURN_HOT_ARC` long.
  GPU section census (probe vertices at random chain / sample points, 7
  URLs and schemes, 31k points each): max 0.0024, none over 2/255 (knot
  mode exactly 0). Fan census (GPU fans vs the CPU field): at rest max
  0.0024 (default, ring), mid-reveal burn / roots at 4 and 6 s, per-arm
  views included, max 0.0024. Footprint census (field vs ribbon) as G2.1
  (means 0.0040 / 0.0036 / 0.0055). Junction convergence: the section
  FUNCTION meets exactly at every joint, every frame, under flow (0 of 45
  ring joints off); the per-vertex colours at a joint differ by <= 0.013
  (Gouraud at steep junctionBlend-0 ramps; G2.1's cache: 26-29 of 45 off,
  <= 0.029). Same-state A/B vs G2.1 (am=instant): default 0 px over
  2/255, junctionBlend 0 max 1/255, mono 0, knot 0, ring / user max 1,
  strands 48 px <= 4/255 and depth 77 px <= 3/255 (exact hue arcs vs the
  old chords), noise differs by design (material-attached, same pattern).- FX census re-run on the G2.2 build (the hot head and the tie-break
  changed the FX): all 40 runs (4 sequences x 5 styles x t 1.5 / 4), max
  0.0046, none over 2/255.
- Perf, desktop, re-measured for master / G2.1 / G2.2 on a QUIET machine
  under the perf lock (CPU 1% before; no other agent's scans): 3200x1800,
  b.c, physics off, 5 scripted moves (pulses + gold live), 2 interleaved
  rounds. ms per call (update per frame in brackets), GPU = draw phase:

  | case | build | update | tickPaint | rebuildFillets | upload KB/frame | GPU |
  |---|---|---|---|---|---|---|
  | rest + flow | master | 14.16 (7.12) | 2.24 | 2.09 | 1947 | 2.02 |
  | rest + flow | G2.1 | 14.29 (7.14) | 2.23 | 2.08 | 1943 | 2.15 |
  | rest + flow | G2.2 | 13.88 (6.99) | 2.26 | 2.14 | 1804 | 3.08 |
  | rest, fw 0 | master | - | 0.15 | 0.03 | 151 | 1.75 |
  | rest, fw 0 | G2.1 | - | 0.15 | 0.03 | 151 | 1.88 |
  | rest, fw 0 | G2.2 | - | 0.15 | 0.03 | 151 | 2.83 |
  | reveal burn | master | 10.69 | 4.08 | 3.18 | - | 1.65 |
  | reveal burn | G2.1 | 10.19 | 3.76 | 3.29 | - | 2.54 |
  | reveal burn | G2.2 | 10.28 | 3.81 | 3.40 | - | 3.31 |
  | reveal rainbow | master | 7.66 | 3.31 | 2.82 | - | 0.81 |
  | reveal rainbow | G2.1 | 7.78 | 3.28 | 2.88 | - | 0.97 |
  | reveal rainbow | G2.2 | 7.70 | 3.27 | 2.91 | - | 1.09 |

  The CPU side improved (no drift re-bakes: update -0.3 ms with flow; no
  section uploads: -7% bytes). The GPU cost rose ~0.95 ms, and per-program
  timing (gpu_by_program.mjs, one timer query per draw) puts all of it in
  the FANS: 0.71 -> 1.64 ms/frame (ribbons unchanged, 1.39 -> 1.37 - the
  per-vertex section is free). Attribution by shader variants: the
  second Gouraud sample costs 0.43 ms, the first sample's ctrl search 0.14
  ms, the run evaluation ~0.35 ms; seeding the search (arm slope), a
  closed-form second ctrl, one shared run fetch and single-arm evaluation
  inside arm footprints each moved it by <= 0.05 ms. A real fix is a
  per-frame pre-pass that evaluates each arm's material strip once (RGBA8
  render target, ~32 texels per arm) and has the fan pixels read it - it
  would also absorb G2.3's per-arm paint. Recorded as a follow-up.
### G2.3 gameplay paint on the GPU (landed)

- The paint DECLARATION the fabric overlay already hands the renderer
  (`setPaint(spans, pulses, caps)`) becomes KPAINT records - items (SPAN,
  CAP, PULSE: 2 texels each) plus, per control slot, the list of items that
  can touch it (refs, at most 32 per slot) - rewritten only when the
  declaration's content changes (a traversal move's swept span changes it
  every frame: a few texels). The section shader evaluates the paint per
  pixel (`kPaintAt`) in the retired pass's exact U semantics (spans assign
  in order, caps never darken, pulses override, the glow brightens within
  its family) and composes in closed form (`kComposePaint`): band A =
  mix(S, white, K_BAND v), band B = mix(gold, white, K_BAND v), the gold
  ramp = mix(S, gold, p). The tick only reduces the pulse travel (mod the
  spacing), the fade-in and the hover breath to uniforms (`uKPulse`,
  `uKPaint.w`); the path colour is `uKGold`.
- Deleted: writeChainPaint, writeFillPaint, applyRevealGlowU, the CPU
  pulseValueAt, the accent strip textures / caches / CPU sampler and
  bindAccent / bindFieldAccent, the PAINT data texture, RibbonMesh
  writePaint / paintU, the paint-rev / chain-rev / U-scratch machinery.
- Deviation: per-SLOT item references built from the existing declaration
  API instead of per-RUN records + a PaintState in FabricMazeRenderer -
  fabric_maze_renderer.ts is untouched (parallel agents own src/game and
  the HUD flow); the in-flight move rides the declaration rather than a
  `uKMove` uniform.
- Deviation: the reveal glow per pixel comes from the point's OWN moving
  fronts (the sources that revealed it); the retired pass glowed any
  revealed sample within reach of any tip on its chain (they differ only
  where another front approaches the same stretch).
- Edges: span and cap ends get a one-pixel coverage ramp (`pxArc` from
  `fwidth` at the top of main; the fans use `pxW`). A per-chain paint flag
  (KGEOM G0.w) skips the evaluation on chains with no items: without it
  every palette-mode ribbon pixel paid a ctrl refinement (+0.3 ms).
- K4 default: the trail fade is LINEAR over the oldest 30% (`mix(S, gold,
  p)`); the strip compressed it into clamp(6p - 2.5).
- The fans compose the same paint per arm; the pluck overlay composes
  through the mirror (in knot mode too: it read the ribbon mesh's tint,
  which the section shader ignores).
- Verified: vitest - the mirror against a frozen copy of the retired pass
  and its 8-bit strip over 24 random declarations (spans, caps, pulses,
  hover) at the ribbon's sample arcs: within 1.6/255 (the strip's
  quantisation), 2000+ points incl. 100+ band points; the trail fade is
  linear. GPU paint census (probe vertices around every span / cap / pulse
  after 6 moves; gold, trail, ring URL, hover): max 0.0024, none over
  2/255. Fan census with paint (gold, trail): max 0.0024. Same-state A/B
  vs G2.2: knot mode 0 px; at rest only the start junction's pulse arms
  differ (def 46 px <= 9/255, ring 156 px <= 14/255 - crests exact per
  pixel instead of interpolated between samples); after 6 moves gold 93 px
  (span / cap edges, now antialiased at the exact ctrl), trail 1071 px
  (the linear fade). Seen while A/B-ing string mode: master and G2.2 draw
  a 1-px diagonal sliver from the start to the exit marker inside the
  markers Graphics (hiding that Graphics removes it); G2.3 does not show
  it - not attributed further (recorded as a follow-up).
- Perf (quiet machine, perf lock; 3200x1800, b.c, physics off, 5 moves):

  | case | build | update | tickPaint | upload KB/frame | GPU |
  |---|---|---|---|---|---|
  | rest, fw 0 | master | - | 0.13 | 151 | 1.70 |
  | rest, fw 0 | G2.2 | - | 0.13 | 151 | 2.77 |
  | rest, fw 0 | G2.3 | - | 0.01 | 0 | 3.12 |
  | rest + flow | master | 13.76 | 2.16 | 1867 | 1.95 |
  | rest + flow | G2.3 | 13.57 | 2.05 | 1522 | 3.33 |
  | reveal burn | master | 9.92 | 3.76 | - | 1.51 |
  | reveal burn | G2.3 | 9.72 | 3.51 | - | 3.09 |
  | reveal rainbow | master | 7.38 | 3.12 | - | 0.64 |
  | reveal rainbow | G2.3 | 7.62 | 3.09 | - | 1.25-1.55 |

  At rest the CPU paint work and its uploads are gone (tickPaint 0.13 ->
  0.01 ms, 151 -> 0 KB/frame; -18% with flow). GPU per program (G2.3):
  ribbons 1.33 ms (master 1.24), fans 1.84 ms (master 0.57) - the fan cost
  (G2.2's per-pixel section Gouraud +1.0, G2.3's per-arm paint +0.25) is
  the open GPU item; see the follow-up (a per-arm material strip pre-pass).

### K4 fan fix: arm material strips (2026-10-12, after the phone gate)

The Pixel 11 (PowerVR, no GPU timer queries) ran G2 at 44 fps at rest,
flow on or off (p90 33 ms), against master's 56-60. ATTRIBUTION by variant
builds (`?b.c&am=instant&snd=none`, settled, medians of 2; fans removed =
`rebuildFillets` returning at once): master 57.5 / 60.3 (fw 0), master
without fans 60.3 / 60.3, G2 44.5 / 42.8, G2 without fans 60.3 / 60.3,
G2 without fans or ribbon paint 60.5 / 60.3. The fans were the whole
regression; G2's per-pixel ribbon paint fits the phone's frame.

AS BUILT (`src/render/arm_strip.ts`):
- Every junction arm (and every free-tip cap axis) gets a STRIP ROW:
  STRIP_W = 64 RGBA8 texels of its COMPOSED material (section Gouraud,
  burn / roots, gameplay paint, reveal glow - the old `chainMaterial`,
  moved verbatim into the pass shader), over the arc its fans can query:
  from the joint out to the profile's arc at the record's outermost fan
  VERTEX (a pixel's projected radius never exceeds its distance from the
  joint; the profile is monotone), capped by the arm's domain. Measured
  steps at the defaults 0.009-0.029 world (median 0.016; <= 0.64 CSS px at
  the default fit zoom), cr 1 <= 0.0095, cr 6 / tw .64 up to 0.065 (1.42
  CSS px). Paint edges are antialiased over the row's own step.
- A STRIP TABLE (RGBA32F FloatRows, 2 texels per row: chain, arc0,
  arcStep, px | seed0, seedStep) is written at the end of every joinery
  rebuild; the record's arm header carries (stripRow, texels per world
  arc) where (closed, total) were (nothing read them), the axis record
  (stripRow, scale, offset).
- One quad over a 1024-wide render texture (16 rows per line) runs the
  pass; gl_FragCoord addresses it exactly as texelFetch reads it. Fans
  read two texels per arm with exact weights (`STRIP_LOOKUP_GLSL`) - no
  sampler filtering, so the CPU mirror (`cpuStripAt`: the material at both
  texels through `cpuChainMaterial`, quantized to 8 bits, lerped) quotes it
  to the bit. The fan program now includes only the gate (PAINT_GATE_GLSL,
  split out of PAINT_FX_GLSL; PAINT_CONST_GLSL split out of
  PAINT_DATA_GLSL) and the strip lookup.
- SCHEDULING: a pixi WebGL SYSTEM registered at module load (priority
  -100, last in the prerender runner) renders the pass before any render
  that is not its own, when DIRTY: the table, KSTATIC / KGEOM / KREVEAL /
  KPAINT revisions (FloatRows.rev, bumped by markDirty) or any knot uniform
  value changed. At rest in fabric mode the pulses change uniforms every
  frame, so it runs every frame (0.06-0.07 ms main thread, 0.06 ms GPU on
  the desktop); a static scene runs nothing. No main.ts change (the
  proposal needed the renderer handle; the system gets it at construction).
- For G4 (K9): the SDF webs read the same rows through the records (arm
  header .zw) and `STRIP_LOOKUP_GLSL`.

DEVIATIONS from the follow-up proposal: texelFetch + a manual lerp instead
of LINEAR sampling (exact mirror weights); the reach comes from the fans'
actual vertices, not `min(domain, profile reach)`; 64 texels fixed.

VERIFICATION (desktop, 3200x1800 unless noted):
- Strip texels vs the CPU mirror (extract readback, `census_strip.mjs`):
  38,912 texels at rest, max 1/255 (8-bit rounding flips), also pinned
  mid-reveal (burn, t 6) and with dead ends (axis rows).
- Fan GPU vs CPU (`census_fan.mjs`, 20-75k points per run): at rest, after
  6 moves, after a live junctionBlend change (0.88 -> 2.5), mid-reveal
  burn at t 6 and 9 (phy=0, pinned), with dead ends: max 1.6/255, none over
  2/255. Per-arm views (uKBase.z 3/4) at t 9: one point at rho 3.1 fillHalf
  differs (0.13) where GPU and CPU pick the two bracketing arms in opposite
  order (an angle tie); the blended view agrees there. PROBE FIX: the
  census now re-evaluates the CPU reference per batch, with the transform
  the test triangles use - plan-time values were taken before the next
  tick refreshed the paint uniforms (false 0.27 mismatches at one joint).
- Same-state A/B vs the G2.5 tree (phy=0 links, frozen clocks, pointer
  parked, particles hidden): at rest 0 px over 2/255 for def / jbl0 / mono
  / strands / depth / noise / knot / ring / user (DSF 1) and def / ring /
  user / strands (DSF 2). After 6 moves: def 65 px (max 16), ring 151 px
  (max 33) - gold span and cap edges inside webs, now ramped over two strip
  steps instead of one screen pixel (crops: softer, slightly less stepped).
  Mid-reveal: trace+burn t 6 def 75 px (max 89) / ring 39 px (max 16) - the
  burn front's leading edge where it crosses a web, lerped over a step;
  trace+roots 5 px (max 6); bloom+rainbow, ink+dust, draw+comet,
  draw+burn 0 px.
- GPU per program (`gpu_by_program.mjs`, fw 0, 3 interleaved rounds):
  fans master 0.60 / G2.5 1.87 / strips 0.59 ms, strip pass 0.06 ms;
  ribbons 1.59 / 1.82 / 1.79. Draw-phase GPU after 5 moves (2 rounds):
  fw 0 master 2.07 / G2.5 3.45 / strips 2.14 ms; flow 2.34 / 3.70 / 2.42.
  CPU at rest: tickPaint 0.01 ms (master 0.19), strip pass 0.06-0.07 ms per
  frame, uploads 0 KB/frame (master 151); flow: update 13.9-14.0 ms
  (master 14.2-14.4), uploads 1554 KB/frame (master 1943-1951). (That
  run's headed Chrome was capped at 31 fps by the machine, for all builds
  alike; per-call costs compare.)
- PHONE (Pixel 11 over Tailscale, `?b.c&am=instant&snd=none`, settled,
  each run interleaving master e235127 and the candidate):
  - cool phone, WIP 8840a6b, medians of 2: 59.8 fps with flow / 60.3
    flow-off (p90 16.7 ms) vs master 58.3 / 60.3;
  - dc248d9, medians of 3, the phone by then in LIGHT thermal throttling
    (thermalservice status 1, soc 42.8 C, on its charger): 50.8 / 60.3
    vs master 50.5 / 59.8 - flow at rest is CPU work every other frame,
    so throttling lowers both builds' flow numbers alike;
  - THE GATE, on the merged code (branch rebased onto master c3ebf11, with
    K63's sim-time sleep gate; phone cooled to status 0 first, its tab
    parked on about:blank between runs), medians of 2: 59.5 / 60.3 vs
    master 59.5 / 59.3, p90 16.7 ms both.
  Raw lines: `.claude/probes/K4/results/phone_*.txt`. K63 changes where a
  phy=0 link's hidden settle stops, so a same-state A/B must pair builds on
  the same side of it (rebased G2.5 vs the fan fix: 0 px over 2/255 at rest
  on def / ring / knot / user).

### K75 amendment: pulses brighten the thread's own paint (2026-10-12)

Section 3.6's `kCompose` kept the strip's per-ARM band family (`famB =
ON_PATH`, set per pulse arm; trail mode read it at the arm's junction end).
With full-length crest trains, the head's inbound crests ran over the trail
fade and drew pure gold crest edges over the faded thread: Levi's "yellow
banding". The mirror reproduced it (steps up to 109/255 between samples),
and so did master before G2 (c3ebf11, same state). The composition is now
`mix(mix(S, gold, p), white, K_BAND max(v, glow))`: the strip's two bands
are its p = 0 and p = 1 cases, so gold mode is unchanged (same-state A/B: 0
px). ON_PATH, `trailGoldAt` and `famB` are retired. Census after the fix:
ribbons max 0.0024, fans max 0.0062 (none over 2/255). The record:
`.claude/rules/render.md` (K75) and the K75 commit.

### Follow-ups (not done)

- G2.4 GPU particles (K23): unchanged plan (instanced quads from a KFX ring,
  closed-form motion). Particles cost 0.2-0.3 ms/frame of CPU during a
  reveal only.
- String mode on master / G2.2 draws a 1-px diagonal sliver from the start
  to the exit marker inside the markers Graphics after a few moves
  (b.c&pv=string, 6 moves; hiding that Graphics removes it); G2.3 does not
  show it. Unattributed - worth a look if it reappears.
- ARM STRIPS at deep zoom: the strip step is fixed per arm (64 texels over
  its reach), so web paint / burn-front edges soften with zoom (about 4x
  the default zoom puts a cr 3 median step near 1.5 CSS px). If that ever
  shows, size rows from the camera's world-per-pixel (variable-length rows,
  re-packed on zoom) rather than raising STRIP_W for everyone.
- The fan census's per-arm views (uKBase.z 3/4) can disagree at a bracket
  angle tie (GPU f32 vs CPU f64 pick A and B in opposite order); the
  blended field agrees. Harmless unless a probe relies on the views there.
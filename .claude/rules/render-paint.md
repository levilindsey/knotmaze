---
paths:
  - "src/render/paint_glsl.ts"
  - "src/render/paint_math.ts"
  - "src/render/paint_model.ts"
  - "src/render/paint_const.ts"
  - "src/render/float_rows.ts"
  - "test/render/paint_fx.test.ts"
  - "test/render/paint_gameplay.test.ts"
  - "test/render/paint_math.test.ts"
  - "test/render/paint_section.test.ts"
  - "test/render/fixtures/pre_g2.ts"
  - "test/render/fixtures/pre_g23.ts"
---

# Render lore: shader paint (G2) and pulses

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

## Shader paint (G2) and backgrounds (K21)

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

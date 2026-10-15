---
paths:
  - "src/render/paint_glsl.ts"
  - "src/render/paint_math.ts"
  - "src/render/paint_model.ts"
  - "src/render/paint_const.ts"
  - "src/render/float_rows.ts"
  - "src/render/trail_paint.ts"
  - "test/render/trail_paint.test.ts"
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
  the fade start fades from the head junction. K93 (2026-10-14) split
  that span (`trail_paint.ts`, buildTrail): solid gold to the fade start,
  then linear. The two spans OVERLAP, the solid one reaching halfway into
  the fading part and the fading one written after it: abutting spans
  each cover the shared point by half under the one-pixel coverage ramp,
  and p dipped to 0.75 there (a seam). ON_PATH, trailGoldAt and
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
  reach's crests over its whole second half. The hover stops at the reach
  too and fades over the same window (K93, 2026-10-14; Levi: "hover should
  stop at pulseReach (and fade-out toward the end, same as pulseReach)"):
  kReachWin in kPulseV's hovered branch, in every path mode, K120's
  key-hold preview included. Same state vs master: pr 15 0 px, pr 3 6599
  px (`.claude/probes/K93/`). Default from same-state sheets
  (`reach_sheet.mjs`): at 2.5 the floor glow (PULSE_FLOOR_REACH 2.0,
  renamed from PULSE_REACH) swallows the crests; at 3 one crest emerges
  past the glow and dissolves, clearly short of a median run (3.7).

- HOVER GLOW (K145, 2026-10-14; brief `docs/design/K93_K145.md`): the
  run under the pointer lights subtly along both rims when it is not a
  choice (a choice keeps its own, stronger hover). One KPAINT item,
  `(RIM, c0, c1, gap)`, written LAST; the strength (`hoverGlow`, hg=,
  codec index 105, default 0.4, 0 = off) and the hover point (an
  unwrapped ctrl on the run) are uniforms (uKReach.z, .w), so a pointer
  moving along one run rewrites no texel. Across: kRimAcross, x² over
  the outer RIM_EDGE 0.6 of each half (ribbon uv.y). Along: 1 -
  smooth(d / pulseReach) from the hover point, NO floor (K219, Levi:
  "Hover should honor the slider."), faded in over RIM_END_FADE 0.75
  past an end GAP at each end (rimGap: the junction web's reach along an
  arm), because webs draw over the ribbons from arm strips, which carry
  no across coordinate. Strength 0 writes no item: the paint is exactly
  the glow-less one. Not shown on webs, fans or arm strips, under a pluck
  overlay (composedAtArc has no across coordinate), or in debug view 5.
  Touch shows it while a press lasts; a mouse leaving the canvas clears
  it. Census (census_rim.mjs, 7 across positions): GPU vs mirror <=
  0.6/255. Same state vs master (ab_frames.mjs + set_glow.js): no hover
  and strength 0 with a glow forced are bit-identical; at 0.4, 367 px,
  all on the run's rims, none on a web. GPU (gpu_by_program.mjs, perf
  lock): the ribbon program +0.04-0.05 ms at rest and mid-hover, inside
  master's own 0.11 ms round-to-round spread. Default from same-state
  sheets (glow_sheet.mjs, a 9-world run): 0.25 barely visible, 0.4
  subtle but readable, 0.6 clearly bright. PROBE LESSON: `png.mjs` decodePNG
  returns `{W, H, ch, data}` (ch 3 for puppeteer shots); diffs that read
  `.width`/`.height` never ran their loop and reported "0 px changed",
  which read as a GPU that ignored the glow. Probes:
  `.claude/probes/K145/`.

- HIGHLIGHT MODES (K111 stage 2, 2026-10-14; brief `docs/design/K111.md`,
  "Stage 2"; the param's link side is in `gameplay-links.md`): how the
  CHOICES (the runs next to the player) are lit, `highlightMode` (hm=):
  pulses (default) | glow | rims | contrast. RENDER PROTOTYPES waiting on
  Levi's pick, the GLSL only: the CPU mirror (paint_math) still computes
  the pulses in every mode, so the pluck overlay's colors (composedAtArc),
  fieldProbe and paintProbe show the pulses look, and no parity test
  covers the modes. The mode id rides in uKGold.w (tickPaintPalette, from
  `renderer.highlightMode`, which main.ts's handRendererLook (K239) sets
  from look("highlightMode") before every update() and every fabric tick,
  so an accessibility toggle's forced pass wears it); kHiMode() reads it,
  `HIGHLIGHT_MODE` (paint_const.ts) names the ids. PULSES (0) is master's
  code path: every other branch sits behind kHiMode() != HM_PULSES, so
  same state vs master is 0 px (4 pulse-clock phases and a hovered choice
  at 1400x900, 4 phases at 411x753). The other modes replace kPulseV's
  trains with one level, lv x endWin x uKPulse.w x kReachWin(d): out to
  pulseReach, faded over its end, faded in after a move as the trains are,
  then STILL (t=0 vs t=1 s: 0 px; pulses 1306 px). kPaintAt marks a
  hovered choice st.y = 2 under them. GLOW (1): lv HI_GLOW 0.75 (hovered
  HI_GLOW_HOVER 1.0) through kComposePaint, a steady whitening of the
  thread's own paint. RIMS (2): kComposePaintAcross (ribbons, side =
  vUV.y) lights a band along both edges at full strength, the outer
  HI_RIM_EDGE 0.55 of each half-width plus a HI_RIM_SOFT 0.12 ramp
  inward; a hovered choice also fills its core to HI_RIM_HOVER_CORE 0.45.
  CONTRAST (3): pure white whatever the hue (not K_BAND's 0.94) with a
  black center line (inside HI_LINE 0.3 of the half-width, a HI_LINE_SOFT
  0.1 ramp); a hovered choice drops the line. High contrast wears it
  (`gameplay-motion.md`). Webs and fans have no across coordinate:
  kComposePaintFlat (the arm strips) leaves them unlit under rims, so a
  rim starts where the web ends (no K145-style end-gap fade), and flat
  white under contrast, so the center line stops at the web. TUNING: glow
  0.55 / 0.9 and rims 0.45 read too faintly in the first phone sheets;
  at 411x753 contrast is the boldest and glow the softest. GPU
  (gpu_by_program.mjs at 3200x1800 after two moves, perf lock, two
  interleaved rounds; indicative): the ribbon program 1.98-1.99 ms in
  every mode (the four within 0.02 ms of each other) against master's
  1.95 (+0.03-0.05 ms, about master's own 0.04 ms round-to-round
  spread); fans and arm strips within 0.02 ms. Probes:
  `.claude/probes/K111/stage2/` (hm_probe.mjs ab | sheet, recrop.mjs +
  mksheet.mjs for the sheets, gpu_batch.ps1).

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

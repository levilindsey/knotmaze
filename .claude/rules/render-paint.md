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
  - "test/render/paint_ring_lap.test.ts"
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

- HOVER GLOW (K145, 2026-10-14; brief `docs/design/K93_K145.md`; its
  look since K111 stage 3, `docs/design/K111.md` "Stage 3"): the run
  under the pointer lights along both edges when it is not a choice (a
  choice keeps its pulses and its own, stronger hover). One KPAINT item,
  `(RIM, c0, c1, gap)`, written LAST; the strength (`hoverGlow`, hg=,
  codec index 105, default 0.4, 0 = off) and the hover point (an
  unwrapped ctrl on the run) are uniforms (uKReach.z, .w), so a pointer
  moving along one run rewrites no texel. ACROSS (K111 stage 3, Levi
  K248: "the gradient start high at the edge and then fade-out as it
  progresses toward the center", "a bit wider"): kRimAcross = 1 -
  smooth((1 - e) / RIM_EDGE), e = |2 side - 1| (ribbon uv.y), RIM_EDGE
  0.85: full on the edge, half 0.425 of the half-width in, nothing within
  0.15 of the center. K145's was x² over the outer 0.6 (half at 0.18 in).
  Widths sheeted: 0.7, 0.85, 1.0 (the two rims meet in the middle).
  WIDTH SLIDER (K111 stage 4, Levi K264: "Rim width,0.4 is good, make it
  a slider., and personal setting."): `hoverGlowWidth` (hgw=, a viewer
  preference, default RIM_EDGE 0.85, [0.3, 1]; gameplay-links.md) is
  RIM_EDGE per viewer. It rides uKGold.w as a SCALE, kRimScale(width) =
  RIM_EDGE / width, that multiplies (1 - e) / RIM_EDGE: exactly 1 at the
  default, so the default frame is stage 3's to the bit (a reciprocal
  uniform, 1 / width, risked one-ulp differences). The mirror is
  paint_math.ts kRimScale + kRimAcross(side, scale), parity at 0.3, 0.5,
  0.7, 0.85 and 1 (paint_gameplay.test.ts). Census (strength 0.6):
  default 0.57/255 (master 0.57), 0.3 0.56, 1 0.61, a 4-ctrl run at 0.5
  0.61, none over 2/255. GPU (perf lock, 3200x1800): the ribbon program
  1.58-1.65 ms on master and branch, at rest and mid-hover (noise). Width
  sheets (strength 0.4; peak luma lift / lit px, widths 0.3, 0.5, 0.7,
  0.85, 1): 1400x900 mouse, half-width 5.7 CSS px: +24/947, +25/1512,
  +26/2086, +27/2511, +27/2935; 411x753 touch press, half-width 2.3:
  +15/188, +21/281, +23/381, +24/453, +25/522 (0.3 there is under one CSS
  px wide). `.claude/probes/K111/stage4/sheet/K111_rim_widths_*.png`. No
  dark border draws along a ribbon, so the peak sits on the ribbon's own
  edge; measured, the lift peaks at ±0.92 half-width (the outermost fully
  covered pixel). Peak luma lift at 0.4: +26 at 1400x900 (K145 +20), +25
  at 411x753 (+17). ALONG: 1 - smooth(d / pulseReach) from the hover
  point, NO floor (K219, Levi: "Hover should honor the slider."). ENDS:
  an end GAP at each end (rimGap, the junction web's reach along an arm:
  0.975 world at defaults), because webs draw over the ribbons from arm
  strips, which carry no across coordinate; then a fade-in over
  min(RIM_END_FADE 0.75, RIM_END_SHARE 0.6 x (half the run - gap)),
  floor 1e-4 (K236 c: the fixed 0.75 lit a 2.6-world run to about 40%
  mid-run; now any run past two gaps glows in full mid-run). A run under
  two gaps (1.95 world) never glows: the webs cover it. Strength 0 writes
  no item: the paint is exactly the glow-less one. Not on webs, fans or
  arm strips, by design (Levi: "clipped to not show anything outside the
  segment bounds"), and not under a pluck overlay (K236 a, left:
  composedAtArc colors per arc, with no across coordinate). Debug view 5
  shows it in blue (max with the gold glow). Touch shows it while a press
  lasts; a mouse leaving the canvas clears it. CENSUS (census_rim.mjs, 7
  across positions, strength 0.6): GPU vs mirror <= 0.56/255 on a 17-world
  run and 0.61/255 on a 2.1-world one (rim 0.59 of 0.6 mid-run; K145's
  fade gave it 0.025), none over 2/255. An open chain's terminal sample
  inside the end gap reads yellow in the probe on master too (a
  probe-triangle residual, rim 0 there). Same state vs master
  (hm_probe.mjs ab): no hover and a hovered choice 0 px. K145's GPU cost:
  the ribbon program +0.04-0.05 ms (perf lock). PROBE LESSONS: `png.mjs`
  decodePNG returns `{W, H, ch, data}` (ch 3 for puppeteer shots); diffs
  that read `.width`/`.height` never ran their loop and reported "0 px
  changed". A short run's lit window can sit under a crossing's over
  thread and show nothing (run 187): pick sheet runs by a pixel check
  (rim_sheet.mjs). Probes: `.claude/probes/K145/`,
  `.claude/probes/K111/stage3/`, `.claude/probes/K111/stage4/`
  (rim_sheet.mjs WIDTHS=..., census_widths.ps1).

- RING LAPS ARE INTEGER-CORRECTED (K299, 2026-10-14; Levi: a choice's
  pulse missing, another drawn backward, a gold sliver on the next run
  after a move; brief and handoff `docs/design/K299_choice_pulse_bug.md`).
  GPU float division is approximate: on ANGLE D3D11 (RX 6800 XT)
  floor(float(k n) / float(n)) came out k - 1 in 3275 of 16384 pairs
  (k -4..59, n 1..256; k = 1 fails at n 3, 6, 7, 12, 13, 14, 15, 24, 26,
  28, ...). Master's kArcOfCtrl wrapped a closed chain's ctrl with that
  division, so any paint ctrl in [k n, k n + 1), k != 0, read one past
  the chain's arc table: the next chain's header total (a garbage arc)
  for n % 4 == 0, padding 0 for n % 4 == 2. A seam run (a closed strand
  whose first walk vertex is node 0) stores ctrlB = n, and a seam-crossing
  run's in-flight span and hover point pass [n, n + 1). The float64
  mirror is exact, so parity never saw it. Lap math now goes through
  `kLapOf(fl, n)` (an integer-corrected floor quotient) and `kWrap(x, m)`
  (a result in [0, m)) in paint_glsl.ts and paint_math.ts (whose versions
  take the quotient as an optional argument, to test GPU-like rounding);
  PULSE spans the unwrapped run, so a full-lap (self-loop) run's pulse
  now draws (span total; master's x mod total gave 0 on every GPU).
  `test/render/paint_ring_lap.test.ts` scans every `src/render/*.ts` for
  a rounder (floor, mod, fract, int, ...) of a quotient: a new site fails
  until it uses kLapOf/kWrap or joins `ROUNDED_QUOTIENTS` with the reason
  it is benign, and a listed site that is gone fails too. The contours'
  `mod(floor(v + 0.5), 5.0)` is the listed residual (exact on this GPU,
  unfixed: the background programs are sha256-pinned). Same state on
  this GPU, each case vs the same points one lap down: master 356-6967 px
  per case, the fix 0 (seam pulses and trail, mid-move spans, the hover
  rim, two other mazes; at most 42 px of 1/255 against a 1e-4-ctrl
  nudge, the nudge's own rounding). A single pulse phase can hide the
  pulse case (no crest on the run at t 100): shoot two. Probes and
  census: `.claude/probes/K299/` (`notes.md`).

- HIGH CONTRAST LOOKS (K111 stage 4, PROTOTYPES for Levi's pick, K265;
  the what and why: gameplay-motion.md's HIGH CONTRAST): the look id
  rides uKBase.y (renderer `hcLook`: 0 = today's pulses, 1 contrast,
  2 outline, 3 chevrons; main.ts sets it only while High contrast is on).
  GLSL only (`kHcLook`, `kHcCompose`, `kComposePaintAcross` in
  SECTION_FRAG and arm_strip.ts, `kComposePaintFlat` for webs, fans and
  arm strips; PAINT_CONST HC_*): under a look, kPulseV returns a steady
  band (no trains, no breath) and kPaintAt sets st.y = 2 for a hovered
  choice. The CPU mirror is untouched (K152 (3): prototypes skip parity),
  and so is the pluck overlay (composedAtArc), which still shows pulses.
  Look 0 is master to the pixel (hm_probe.mjs ab ...  hc). Across, e =
  |2 side - 1|: CONTRAST is black inside HC_LINE 0.3 (ramp 0.1); OUTLINE
  black inside HC_CORE 0.65 (ramp 0.15; the first sheet's 0.45 read as
  CONTRAST with a wider line); CHEVRONS alternate every half HC_CHEV_PERIOD
  (0.8 world per pair) along d, the center HC_CHEV_LEAN 0.3 world ahead
  of the edges. Sheets `.claude/probes/K111/stage4/sheet/
  K111_hc_looks_{desktop,phonemouse}.png` (hm_probe.mjs looks, 36/36
  each: steady, 0 px between pulse phases; about 1680 px off look 0 at
  1400x900, 1140 at 411x753).

- HIGHLIGHT MODES: removed in K111 stage 3 (2026-10-14). Stage 2
  prototyped glow, rims and contrast looks for the choices behind
  `highlightMode` (hm=, codec index 108). Levi (K248) kept the pulses and
  a hovered choice's look on the choices, and a rim only for a hover away
  from them (HOVER GLOW above). The param, its GLSL (kHiMode, HM_*, HI_*,
  kComposePaintAcross and Flat) and High contrast's mode went;
  CODEC_VERSION 5. Stage 2's record (modes, tuning, GPU): `docs/design/
  K111.md` "Stage 2 handoff", probes `.claude/probes/K111/stage2/`.

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

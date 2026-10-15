// G2 SHADER PAINT - shared numeric constants. Every number the per-pixel
// color library (paint_glsl.ts) and its CPU mirror (paint_math.ts) must
// agree on lives HERE; glslConstBlock() emits them as GLSL `const float`
// declarations, so the two sides cannot drift. Pure module (no pixi): the
// vitest parity suites import it.

export const PAINT_CONST = {
  // Texel rows of every data texture are 2^K_ROW_SHIFT wide.
  K_ROW_SHIFT: 10,

  // REVEAL frontier shaping (Stage 22): interval modes taper over arc, ink
  // over world distance; a crossing (or a joint) shows once both passes
  // are at REVEAL_CROSSING_MIN of full width.
  REVEAL_TAPER_ARC: 0.3,
  INK_TAPER_WORLD: 0.6,
  REVEAL_CROSSING_MIN: 0.98,
  // Frontier glow reach (arc) behind each tip; rainbow's longer head holds
  // full strength over RAINBOW_GLOW_HOLD of RAINBOW_GLOW_ARC.
  REVEAL_GLOW_ARC: 1.15,
  RAINBOW_GLOW_ARC: 2.4,
  RAINBOW_GLOW_HOLD: 0.45,

  // BURN cooling clock (wall seconds after ignition) and the hot head.
  BURN_EMBER_END: 0.4,
  BURN_CHAR_END: 0.9,
  BURN_RECOVER_END: 1.3,
  BURN_HOT_ARC: 0.45,
  // ROOTS: brown tint easing out over this age window.
  ROOTS_START: 0.05,
  ROOTS_FADE: 1.0,

  // Appearance-FX per-pixel clocks (wall seconds after ignition).
  RAINBOW_HOLD: 0.12,
  RAINBOW_FADE: 0.65,
  DUST_FADE_IN: 0.55,
  COMET_FADE_IN: 1.0,
  // Rainbow width swell (geometry, CPU mirror until G3).
  RAINBOW_SWELL: 1.0,
  RAINBOW_SWELL_MIN_P: 0.2,
  // Overlays vs FX: fans fade in over the last FAN_SOLID_START..1 of their
  // arms' solidity; a crossing waits for alpha within FX_SOLID_EPS of opaque.
  FAN_SOLID_START: 0.55,
  FX_SOLID_EPS: 0.03,
  // A gated crossing's gap fades in over this many seconds.
  CROSSING_FADE_IN: 0.36,

  // PULSE trains (gameplay paint) - see RibbonRenderer's pulse comments.
  // The steady floor glow fades out over PULSE_FLOOR_REACH of arc from the
  // junction (the trains themselves end at the pulseReach param, K75).
  PULSE_FLOOR_REACH: 2.0,
  CREST_WIDTH: 0.72,
  PULSE_SPEED: 1.6,
  PULSE_FLOOR: 0.38,
  PULSE_CORE_BOOST: 0.62,
  PULSE_CORE_RADIUS: 0.55,
  CREST_RAMP: 0.5,
  PULSE_END_WINDOW: 0.45,
  PULSE_OUT_LEAD: 0.3,
  PULSE_FADE_IN: 0.45,
  HOVER_PULSE_W: 5.2,
  // Pulse values at or below this leave the paint untouched (CPU parity).
  PULSE_MIN_V: 0.004,
  // PULSE REACH (K75): a train runs out to the pulseReach param (world arc
  // from the junction) and fades out (smoothstep) over this much of its
  // end - at most half the reach. A fixed length rather than a share: a
  // share of a long reach dimmed the crests over its whole second half.
  PULSE_REACH_FADE: 1.0,
  // HOVER GLOW (K145): a run that is not a choice glows along both rims
  // around the hover point. Along the thread it falls off smoothly to 0 at
  // the pulseReach param (world arc from the hover point); toward each end
  // of the run it is gone within the item's end gap (the junction web's
  // reach there: the webs carry no across coordinate) and back in full
  // RIM_END_FADE further on. Across, it is 1 at either edge and falls as a
  // square to 0 at RIM_EDGE of the half-width in from it.
  RIM_END_FADE: 0.75,
  RIM_EDGE: 0.6,
  // HIGHLIGHT MODES (K111 stage 2): how the runs next to the player (the
  // choices) are lit; HIGHLIGHT_MODE below, the mode id in uKGold.w. Every
  // mode lights a choice out to pulseReach (fading over its end) and fades
  // in after a move like the trains. GLOW: one steady level, the hovered
  // choice brighter (no breath). RIMS: a solid band along both edges, the
  // outer HI_RIM_EDGE of each half-width with a HI_RIM_SOFT inner ramp; the
  // hovered choice also fills its core to HI_RIM_HOVER_CORE. CONTRAST: the
  // choice turns pure white with a black center line (inside HI_LINE of the
  // half-width, a HI_LINE_SOFT ramp); the hovered choice drops the line.
  // Glow and rims were raised from 0.55 / 0.9 and 0.45 after the first
  // phone sheets, where both read too faintly at a glance.
  HI_GLOW: 0.75,
  HI_GLOW_HOVER: 1.0,
  HI_RIM_EDGE: 0.55,
  HI_RIM_SOFT: 0.12,
  HI_RIM_HOVER_CORE: 0.45,
  HI_LINE: 0.3,
  HI_LINE_SOFT: 0.1,

  // COMPOSITION (the retired accent strip in closed form): both bands
  // converge to 0.94 toward white at full strength, band texels spanning
  // 110 of 111 steps -> K_BAND = 0.94 * 110 / 111.
  K_BAND: (0.94 * 110) / 111,

  // SECTION colors: junctionBlend eases fully once its extension reaches
  // this many lattice units (section_colors RAMP_EASE_FULL).
  RAMP_EASE_FULL: 1.0,
} as const;

// FX style ids (uKFx.x).
export const FX_STYLE = {
  none: 0,
  rainbow: 1,
  comet: 2,
  dust: 3,
  burn: 4,
  roots: 5,
} as const;

// HIGHLIGHT MODES (K111 stage 2): the highlightMode param's options and the
// id each one sends the shaders (uKGold.w). 0 is the pulses, today's look:
// every mode branch is skipped and the paint is exactly master's. The CPU
// mirror (paint_math) has no modes yet and draws the pulses whatever the id.
export const HIGHLIGHT_MODE = {
  pulses: 0,
  glow: 1,
  rims: 2,
  contrast: 3,
} as const;
export type HighlightMode = keyof typeof HIGHLIGHT_MODE;
export const HIGHLIGHT_MODES: HighlightMode[] = [
  "pulses",
  "glow",
  "rims",
  "contrast",
];

// GAMEPLAY PAINT items (KPAINT, G2.3): the renderer's paint declaration -
// traveled spans, junction caps, pulse arms - as records the shaders read
// per pixel (T0.x = the type; pulse flags in T1.y). Bit 2 was ON_PATH, the
// per-arm band family retired by K75 (a crest brightens the pixel's own
// paint now - see kComposePaint). RIM (K145) is the hover glow's run.
export const PAINT_ITEM = { SPAN: 1, CAP: 2, PULSE: 3, RIM: 4 } as const;
export const ITEM_FLAG = { INWARD: 1, HOVER: 4 } as const;

// RUNS flags (R1.w).
export const RUN_FLAG = {
  GAMUT: 1, // Colors are gamut coordinates (in .x), converted per pixel.
  SWEEP: 2, // Depth: one coordinate sweep from colA to colB, no ramps.
  NOISE: 4, // Spatial noise: per-control coordinate from CTRLIDX.z.
  RAMP_A: 8,
  RAMP_B: 16,
} as const;

// GLSL `const float` block for every PAINT_CONST entry (plus the flag ids
// as ints), so the shader library and the TS mirror read one source.
export function glslConstBlock(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(PAINT_CONST)) {
    if (k === "K_ROW_SHIFT") continue;
    lines.push(`const float ${k} = ${glslFloat(v)};`);
  }
  for (const [k, v] of Object.entries(PAINT_ITEM)) {
    lines.push(`const int PI_${k} = ${v};`);
  }
  for (const [k, v] of Object.entries(ITEM_FLAG)) {
    lines.push(`const int IF_${k} = ${v};`);
  }
  for (const [k, v] of Object.entries(RUN_FLAG)) {
    lines.push(`const int RF_${k} = ${v};`);
  }
  for (const [k, v] of Object.entries(HIGHLIGHT_MODE)) {
    lines.push(`const int HM_${k.toUpperCase()} = ${v};`);
  }
  return lines.join("\n");
}

function glslFloat(v: number): string {
  const s = String(v);
  return /[.eE]/.test(s) ? s : s + ".0";
}

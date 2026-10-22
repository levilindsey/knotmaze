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
  // HOVER GLOW (K145; its look K111 stage 3; K298): the run under the
  // pointer glows along both rims around the hover point (a choice too
  // since K298). Along the thread it falls off smoothly to 0 at the
  // hoverGlowLength param (world arc from the hover point; pulseReach's
  // before K298); toward each end of the run it is gone within the item's
  // end gap (the junction web's reach there: the webs carry no across
  // coordinate) and back in full hoverGlowFade further on (a fixed 0.75
  // before K298), or sooner on a short run: the fade takes at most
  // RIM_END_SHARE of the stretch between the gap and the run's middle, so
  // a short run still glows in full mid-run. Across, it peaks at either
  // edge and fades out smoothly (1 - smoothstep) to 0 at RIM_EDGE of the
  // half-width in from it: Levi (K248) wanted "the gradient start high at
  // the edge and then fade-out as it progresses toward the center", wider
  // than K145's square over the outer 0.6.
  RIM_END_SHARE: 0.6,
  RIM_EDGE: 0.85,

  // COMPOSITION (the retired accent strip in closed form): both bands
  // converge to 0.94 toward white at full strength, band texels spanning
  // 110 of 111 steps -> K_BAND = 0.94 * 110 / 111.
  K_BAND: (0.94 * 110) / 111,

  // HIGH CONTRAST PROTOTYPES (K111 stage 4, Levi K265: "Maybe the high
  // contrast highlights should get new treatment"): how a choice looks under
  // High contrast while Levi picks a look (the id in uKBase.y, 0 = today's
  // pulses; paint_glsl kComposePaintAcross). CONTRAST (stage 2's): a black
  // center line inside HC_LINE of the half-width, an HC_LINE_SOFT ramp.
  // OUTLINE: a black core inside HC_CORE, an HC_CORE_SOFT ramp, white
  // edges: a dark thread outlined in white (at the first sheet's 0.45 it
  // read as CONTRAST with a wider line). CHEVRONS: HC_CHEV_PERIOD world
  // per black + white pair, the
  // center HC_CHEV_LEAN world ahead of the edges (pointing away from the
  // junction). A hovered choice is solid white under all three.
  HC_LINE: 0.3,
  HC_LINE_SOFT: 0.1,
  HC_CORE: 0.65,
  HC_CORE_SOFT: 0.15,
  HC_CHEV_PERIOD: 0.8,
  HC_CHEV_LEAN: 0.3,

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

// GAMEPLAY PAINT items (KPAINT, G2.3): the renderer's paint declaration -
// traveled spans, junction caps, pulse arms - as records the shaders read
// per pixel (T0.x = the type; pulse flags in T1.y). Bit 2 was ON_PATH, the
// per-arm band family retired by K75 (a crest brightens the pixel's own
// paint now - see kComposePaint). RIM (K145) is the hover glow's run.
export const PAINT_ITEM = { SPAN: 1, CAP: 2, PULSE: 3, RIM: 4 } as const;
// TELE (K525): one piece of the turn minotaur's telegraphed route, drawn as
// red rims along both edges: T0 = (TELE, c0, c1, alpha), T1 = (gap0, gap1,
// fade0, fade1). It is 9 because explore_glsl.ts's VIS, CHAR, FRONT and
// SMOLDER items (5-8) share this item table. Not a PAINT_ITEM entry:
// glslConstBlock emits a PI_ constant for every entry into PAINT_CONST_GLSL,
// which the junction field and the plucks include too, so an entry would
// change their program text (a cold compile each, K307) for an item only the
// ribbons draw. kPaintAt's own chunk declares PI_TELE (paint_glsl.ts).
export const PAINT_ITEM_TELE = 9;
// FRAY (K137, 4.3's look): a cracked fragile run, thinner and
// desaturated until it snaps. Ribbon-only like TELE: declared here,
// not in PAINT_ITEM, so the junction and pluck programs keep their text.
export const PAINT_ITEM_FRAY = 10;
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
  return lines.join("\n");
}

function glslFloat(v: number): string {
  const s = String(v);
  return /[.eE]/.test(s) ? s : s + ".0";
}

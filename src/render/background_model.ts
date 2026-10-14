// SHADER BACKGROUNDS (K21) - the pure half: the effect list, each effect's
// render profile, the design-derived colors, and the drift clock that
// decides when the background texture re-renders. No pixi here, so the
// unit tests run it in node (the shaders and layers live in
// background.ts / background_shaders.ts).
//
// HOW IT RENDERS (background.ts): each effect is a fragment shader drawn
// into a LOW-RES render texture (a fraction of the CSS-pixel screen, see
// BackgroundProfile.scale) at a REDUCED rate (fps), then stretched over
// the screen as the FIRST layer of the main canvas by a dithering blit.
// Crossing gaps discard ribbon pixels (G1), so they show this layer.
// SCREEN-FIXED: the backdrop does not pan or zoom with the camera - it is
// light and air at infinity, the knot floats in front of it.

import { gamutRgb } from "../core/section_colors";
import type { RGB } from "../core/section_colors";

// The `background` param's options. ORDER IS LOAD-BEARING: the codec table
// (ui/param_codec.ts) lists these options in this order, and a published
// link stores an option's index - append new effects at the end.
export type BackgroundId =
  | "none"
  | "vellum"
  | "mist"
  | "wash"
  | "silk"
  | "aurora"
  | "contours";
export const BACKGROUNDS: readonly BackgroundId[] = [
  "none",
  "vellum",
  "mist",
  "wash",
  "silk",
  "aurora",
  "contours",
];

export interface BackgroundProfile {
  // Render-texture texels per CSS pixel (desktop / phone). Smooth fields
  // upscale invisibly from a quarter of the device resolution or less; a
  // grain texture needs about one texel per CSS pixel.
  scale: number;
  phoneScale: number;
  // The DESIGNED drift: the clock's speed (drift seconds per wall second)
  // at an animation speed of 1 (the backgroundSpeed param multiplies it).
  drift: number;
  // The animation speed at AUTO (backgroundSpeed's default): 1 = drift at
  // the designed pace, 0 = static (rendered once per change, never again)
  // until a speed is set - vellum (K79; whether it moves by default is
  // K52's call).
  autoSpeed: number;
  // Re-render rate while drifting (desktop / phone). The drift is slow
  // enough that a texel moves a small fraction of itself per update.
  fps: number;
  phoneFps: number;
}

export const BACKGROUND_PROFILES: Record<
  Exclude<BackgroundId, "none">,
  BackgroundProfile
> = {
  // Paper grain: one texel per CSS pixel (the fibers are fine). Static at
  // auto; at a set speed its mottling drifts and its light wanders, while
  // the fibers and the grain stay put (paper does not move).
  vellum: { scale: 1, phoneScale: 1, drift: 1, autoSpeed: 0, fps: 10, phoneFps: 6 },
  // Domain-warped fbm: big soft clouds - a third-res field is plenty. The
  // warp of a warp amplifies its offsets, so its clock runs slowest.
  mist: { scale: 0.34, phoneScale: 0.3, drift: 0.35, autoSpeed: 1, fps: 15, phoneFps: 10 },
  // Watercolor washes: soft blotches with pooled rims.
  wash: { scale: 0.4, phoneScale: 0.34, drift: 0.8, autoSpeed: 1, fps: 15, phoneFps: 10 },
  // Flow streaks: thin features - half-res.
  silk: { scale: 0.5, phoneScale: 0.4, drift: 0.8, autoSpeed: 1, fps: 15, phoneFps: 10 },
  // Curtains: the vertical rays need some horizontal detail.
  aurora: { scale: 0.4, phoneScale: 0.34, drift: 1, autoSpeed: 1, fps: 15, phoneFps: 10 },
  // Contour lines: the sharpest feature (antialiased lines about 1.5
  // texels wide - at half resolution a phone's 5x upscale stair-stepped
  // them) - and lines that visibly creep are the one motion the eye
  // follows, so they move about 1 CSS px a second.
  contours: { scale: 0.75, phoneScale: 0.75, drift: 0.3, autoSpeed: 1, fps: 10, phoneFps: 6 },
};

// THE ANIMATION SPEED (backgroundSpeed, K79): one param for every effect.
// AUTO (any negative value; the default, -1) = each effect's own pace
// (autoSpeed: its designed drift, or static for vellum) - exactly the
// drift every link had before the param existed. 0 = static, any other
// value a multiple of the designed drift, up to BACKGROUND_SPEED_MAX. The
// re-render rate (fps) does not scale with it.
export const BACKGROUND_SPEED_AUTO = -1;
export const BACKGROUND_SPEED_MAX = 3;

// Whether a backgroundSpeed value means AUTO (NaN does too).
export function isAutoSpeed(speed: number): boolean {
  return !(speed >= 0);
}

// The speed `speed` stands for on effect `id` (what the panel's slider
// shows): auto resolves to the effect's autoSpeed, an explicit value
// clamps to [0, BACKGROUND_SPEED_MAX]. 0 for none.
export function effectiveSpeed(id: BackgroundId, speed: number): number {
  if (id === "none") return 0;
  if (isAutoSpeed(speed)) return BACKGROUND_PROFILES[id].autoSpeed;
  return Math.min(BACKGROUND_SPEED_MAX, speed);
}

// The drift clock's speed for effect `id` at backgroundSpeed `speed`. At
// auto it is the designed drift times 1 (or 0 for vellum): bit-identical
// to the drift before the param existed (x * 1 is exact).
export function backgroundDrift(id: BackgroundId, speed: number): number {
  if (id === "none") return 0;
  return BACKGROUND_PROFILES[id].drift * effectiveSpeed(id, speed);
}

// The drift pauses once the REST of the scene has been static this long
// (seconds) - the K24 render-on-demand hook (see BackgroundClock).
export const BACKGROUND_PAUSE_GRACE = 2.5;

// THE SHAPE PARAMS (K79 stage B): how the pattern is drawn, on top of the
// effect's designed look. Scale applies to every effect, detail to four,
// and fibers, grain and angle to one each:
//   scale  - pattern size, x the designed size (backgroundScale)
//   detail - fbm roughness: 0 smooth, 1 designed, 2 rough (backgroundDetail;
//            BACKGROUND_DETAIL_EFFECTS: mist, wash, silk, contours)
//   fibers, grain - vellum's fiber and grain strength, x designed
//   angle  - silk's streak (and flow) direction, degrees counterclockwise
//            from screen right; negative = AUTO, the seed's own direction
// At the defaults (1, 1, 1, 1, auto) every effect renders with its K21
// program, byte for byte; anything else switches it to its SHAPED program
// (background_shaders.ts, `<id>-x`), which reads them as uniforms.
export interface BackgroundShape {
  scale: number;
  detail: number;
  fibers: number;
  grain: number;
  angle: number;
}
export const BACKGROUND_SHAPE_DEFAULTS: Readonly<BackgroundShape> = Object.freeze({
  scale: 1,
  detail: 1,
  fibers: 1,
  grain: 1,
  angle: -1,
});
export const BACKGROUND_SCALE_MIN = 0.5;
export const BACKGROUND_SCALE_MAX = 3;
export const BACKGROUND_DETAIL_MAX = 2;
// fibers and grain
export const BACKGROUND_TEXTURE_MAX = 3;
export const BACKGROUND_ANGLE_AUTO = -1;

function clampOr(v: number, lo: number, hi: number, fallback: number): number {
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
}
// The sanitizers every reader applies (links, legacy keys, the layer):
// out-of-range values clamp, garbage reads as the default.
export function sanitizeBackgroundScale(v: number): number {
  return clampOr(v, BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX, 1);
}
export function sanitizeBackgroundDetail(v: number): number {
  return clampOr(v, 0, BACKGROUND_DETAIL_MAX, 1);
}
export function sanitizeBackgroundTexture(v: number): number {
  return clampOr(v, 0, BACKGROUND_TEXTURE_MAX, 1);
}
// Whether a backgroundAngle value means AUTO (NaN does too).
export function isAutoAngle(v: number): boolean {
  return !(v >= 0 && Number.isFinite(v));
}
// Any negative value (or garbage) is auto; an angle wraps into [0, 360).
export function sanitizeBackgroundAngle(v: number): number {
  return isAutoAngle(v) ? BACKGROUND_ANGLE_AUTO : v % 360;
}
export function sanitizeBackgroundShape(s: BackgroundShape): BackgroundShape {
  return {
    scale: sanitizeBackgroundScale(s.scale),
    detail: sanitizeBackgroundDetail(s.detail),
    fibers: sanitizeBackgroundTexture(s.fibers),
    grain: sanitizeBackgroundTexture(s.grain),
    angle: sanitizeBackgroundAngle(s.angle),
  };
}

// fbm's per-octave gain at `detail`: 0.5 (the designed fbm) at 1, 0.25
// (nearly one smooth octave) at 0, 0.75 (rough, the fine octaves loud)
// at 2. The shaped fbm rescales its sum to the designed fbm's RMS, so
// detail changes the texture, not the contrast.
export function detailGain(detail: number): number {
  return 0.25 + 0.25 * detail;
}

// The effects that read `detail`. Vellum and aurora do not: their fbm
// octaves are few and dim next to what carries their look (vellum's fibers
// and grain, aurora's rays), so 0 / 1 / 2 moved their background pixels by
// 0.4 levels on average (mist 1.6-2.6, wash 1.6-2.1, silk 2.1-2.4, contours
// 0.9-1.9; the stage B2 sheets), nothing the eye finds. Their shaped
// programs keep the designed fbm and the panel hides the row.
export const BACKGROUND_DETAIL_EFFECTS: readonly BackgroundId[] = [
  "mist",
  "wash",
  "silk",
  "contours",
];
export function readsDetail(id: BackgroundId): boolean {
  return BACKGROUND_DETAIL_EFFECTS.includes(id);
}

// Whether effect `id` needs its shaped program for `shape` (sanitized):
// only the params it reads count, so a link that sets vellum's fibers
// draws mist with mist's own program.
export function needsShapeProgram(id: BackgroundId, shape: BackgroundShape): boolean {
  if (id === "none") return false;
  if (shape.scale !== 1) return true;
  if (shape.detail !== 1 && readsDetail(id)) return true;
  if (id === "vellum") return shape.fibers !== 1 || shape.grain !== 1;
  if (id === "silk") return !isAutoAngle(shape.angle);
  return false;
}

// Silk's AUTO direction for `seed` in the panel's terms (degrees
// counterclockwise from screen right, [0, 360)): its shader turns the
// streaks by uParams.y * 0.3 radians, clockwise on a y-down screen.
export function autoSilkAngle(seed: number): number {
  const a = backgroundSeedOffset(seed)[1] * 0.3;
  const deg = (-a * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}
// The shader's streak angle (radians, the y-down convention, >= 0) for a
// set angle in degrees; AUTO is -1 (the shader then uses the seed's).
export function silkAngleUniform(angleDeg: number): number {
  if (isAutoAngle(angleDeg)) return -1;
  return (((360 - (angleDeg % 360)) % 360) * Math.PI) / 180;
}

export function hexRgb(hex: number): RGB {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ];
}

// A design's background colors: the page INK (the flat backdrop every
// design shares, and the floor every effect stays near) plus three ACCENTS
// sampled across the design's own gamut (seed hue + hueShift, gamutArc,
// palette - the colors its threads are drawn from). The shaders mix only a
// small, intensity-scaled share of an accent into the ink, so a background
// always reads as a dark wash of its own design's colors. Reads the live
// gamut config (setGamutConfig), like every other gamut consumer.
export interface BackgroundColors {
  ink: RGB;
  accents: [RGB, RGB, RGB];
}

export function backgroundColors(ink: number, baseHue: number): BackgroundColors {
  return {
    ink: hexRgb(ink),
    accents: [
      gamutRgb(baseHue, 0.12),
      gamutRgb(baseHue, 0.5),
      gamutRgb(baseHue, 0.88),
    ],
  };
}

// CUSTOM COLORS (K79 stage B; backgroundColorMode): "gamut" = the above
// (the default, every earlier link); "custom" = a BASE color - the page
// itself: the shaders' ink, the canvas behind the knot and the flat fog,
// so none and intensity 0 show it too - plus three ACCENTS that replace
// the gamut's. Accent 1 is the MAIN one: the slot of the gamut's middle
// color (0.5), the one vellum reads; accents 2 and 3 take the gamut's
// ends (0.12 and 0.88). Order is load-bearing (the codec stores the
// option index): append new modes.
export type BackgroundColorMode = "gamut" | "custom";
export const BACKGROUND_COLOR_MODES: readonly BackgroundColorMode[] = ["gamut", "custom"];

// Which accents (1-3, the panel's numbering) effect `id` reads: the panel
// shows only those rows.
export const BACKGROUND_ACCENTS_USED: Record<BackgroundId, readonly number[]> = {
  none: [],
  vellum: [1],
  mist: [1, 2, 3],
  wash: [1, 2, 3],
  silk: [2, 3],
  aurora: [1, 2, 3],
  contours: [2, 3],
};

// "#rrggbb" (either case) -> 0xrrggbb; anything else -> fallback.
export function parseHexColor(text: string, fallback: number): number {
  return /^#[0-9a-fA-F]{6}$/.test(text) ? Number.parseInt(text.slice(1), 16) : fallback;
}
// An RGB in [0, 1] as "#rrggbb" (8 bits a channel, rounded).
export function rgbHex(c: RGB): string {
  let s = "#";
  for (let i = 0; i < 3; i++) {
    const v = Math.round(Math.max(0, Math.min(1, c[i])) * 255);
    s += v.toString(16).padStart(2, "0");
  }
  return s;
}

// The custom colors as the shaders' slots (accent 1 -> uA2, 2 -> uA1,
// 3 -> uA3). Garbage reads as the page ink (base) or black.
export function customBackgroundColors(
  base: string,
  accent1: string,
  accent2: string,
  accent3: string,
  fallbackInk: number
): BackgroundColors {
  return {
    ink: hexRgb(parseHexColor(base, fallbackInk)),
    accents: [
      hexRgb(parseHexColor(accent2, 0)),
      hexRgb(parseHexColor(accent1, 0)),
      hexRgb(parseHexColor(accent3, 0)),
    ],
  };
}
// The inverse for the panel: a design's accents in accent order (1, 2, 3)
// as "#rrggbb" - what switching to custom starts from.
export function accentHexes(colors: BackgroundColors): [string, string, string] {
  return [rgbHex(colors.accents[1]), rgbHex(colors.accents[0]), rgbHex(colors.accents[2])];
}

// Two seed-derived offsets into the noise domain, so every design gets its
// own pattern (deterministic per link: URL-as-complete-state). Kept small
// (< 64 noise cells) - highp keeps full detail there.
export function backgroundSeedOffset(seed: number): [number, number] {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return [((h & 0xffff) / 0x10000) * 64, ((h >>> 16) / 0x10000) * 64];
}

// THE DRIFT CLOCK - when does the background texture re-render? It is the
// whole battery story of an animated backdrop:
//   - DIRTY (effect, colors, size, seed or intensity changed): re-render on
//     the next frame, whatever else holds.
//   - DRIFTING (an animated effect at a non-zero speed, motion allowed,
//     not paused): re-render every `interval` seconds of wall time - 6-15
//     fps of slow drift instead of the display's 60+.
//   - PAUSED: when the rest of the scene has been static for
//     BACKGROUND_PAUSE_GRACE seconds (and pauseWhenStatic is on), the drift
//     clock stops - the texture stops changing, so a render-on-demand frame
//     loop (K24, part of K6) can stop drawing. Any scene activity resumes
//     it at once, from where it stopped (no jump).
// needsFrame() is the K6 hook: true when the next tick would change the
// background (a render loop that skips frames asks it every vsync).
export class BackgroundClock {
  // Drift time, seconds (already multiplied by the drift speed).
  time = 0;
  // A re-render is owed regardless of drift.
  dirty = true;
  private sinceRender = 0;
  private idle = 0;
  private drifting = false;
  private interval = Infinity;

  // Advance one frame of `dt` wall seconds. drift: speed multiplier (0 =
  // static); fps: drift re-render rate; sceneActive: anything else on
  // screen animated this frame. Returns true when the texture must
  // re-render now.
  tick(
    dt: number,
    drift: number,
    fps: number,
    sceneActive: boolean,
    pauseWhenStatic: boolean
  ): boolean {
    // A resumed background tab (or a long stall) must not jump the drift.
    const step = Math.max(0, Math.min(dt, 0.25));
    this.idle = sceneActive ? 0 : this.idle + step;
    const paused = pauseWhenStatic && this.idle >= BACKGROUND_PAUSE_GRACE;
    this.drifting = drift > 0 && fps > 0 && !paused;
    this.interval = fps > 0 ? 1 / fps : Infinity;
    if (this.drifting) {
      this.time += step * drift;
      this.sinceRender += step;
    }
    if (this.dirty || (this.drifting && this.sinceRender >= this.interval)) {
      this.dirty = false;
      // Keep the cadence (a frame that lands late does not push every later
      // update back), but never bank more than one interval.
      this.sinceRender =
        this.sinceRender >= 2 * this.interval
          ? 0
          : Math.max(0, this.sinceRender - this.interval);
      return true;
    }
    return false;
  }

  // Whether the drift is running (not static, not paused).
  get isDrifting(): boolean {
    return this.drifting;
  }

  // K24/K6 hook: would a tick `frameDt` from now re-render the texture?
  needsFrame(frameDt = 1 / 60): boolean {
    return (
      this.dirty ||
      (this.drifting && this.sinceRender + frameDt >= this.interval)
    );
  }
}

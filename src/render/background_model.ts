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

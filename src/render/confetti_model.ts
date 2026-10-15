// K140 FINISH CONFETTI, the pure part: how many pieces a finish throws
// (confettiPlan), each piece's launch (spawnRain, spawnSpray) and motion
// (stepRain, stepSpray), in plain Float32Array pools with no pixi in sight,
// so the tests drive it directly. The view (render/confetti.ts) mirrors each
// pool row into one pixi Particle (pieceLook).
//
// Levi (2026-10-13): "a gratuitous confetti effect rainy down from the top
// of the screen when you finish the maze. And ... some smaller confetti
// effect spraying out from around the finish spot." Two effects:
//   RAIN  - SCREEN space (CSS px): paper pieces released above the top
//           edge over RAIN_WINDOW s fall at a terminal speed scaled to the
//           screen height (a phone and a desktop both see a ~3-4.5 s
//           fall), swaying and fluttering (a cos flip squashes each piece
//           across its long axis and shades its back side), and die below
//           the bottom edge. The count grows with the screen
//           (rainScreenScale), so a desktop is as densely covered as a
//           phone.
//   SPRAY - WORLD space: a burst from a ring around the exit marker, flung
//           outward against drag, sinking under a light gravity and fading
//           out within SPRAY_LIFE_MAX s. Its unit is the marker radius with
//           a CSS px floor (sprayUnit), so a zoomed-out phone still sees
//           pieces; the view copies the world root's transform, so the
//           burst stays on the finish as the camera moves.
// REDUCED MOTION (the Motion setting): no rain - a full-screen fall is the
// large-area motion WCAG 2.3.3 asks to avoid - and a small, slow spray:
// REDUCED_SPRAY_SHARE of the pieces at half speed, with no spin or flutter.
//
// Render-only and bounded: nothing here touches the physics, and every
// piece dies within RAIN_WINDOW + RAIN_LIFE_MAX (rain) or SPRAY_LIFE_MAX
// (spray) seconds, so main.ts's sceneAnimating() returns to false.

// Pieces at amount 1 (the rain's on a phone-sized screen: rainScreenScale
// multiplies it on bigger ones), and the amount's top (the panel slider and
// the link clamp read it). The pools hold the max, so the caps are hard.
// K317 (Levi, 2026-10-14: "more confetti by default, both from the top, but
// especially from the finish marker") doubled the rain and quadrupled the
// spray.
export const RAIN_PER_AMOUNT = 280;
export const SPRAY_PER_AMOUNT = 160;
export const CONFETTI_AMOUNT_MAX = 3;
export const RAIN_SCREEN_MAX = 3;
export const RAIN_CAP = RAIN_PER_AMOUNT * CONFETTI_AMOUNT_MAX * RAIN_SCREEN_MAX;
export const SPRAY_CAP = SPRAY_PER_AMOUNT * CONFETTI_AMOUNT_MAX;
// Reduced motion keeps K140's 16 pieces at amount 1 (40% of its 40).
export const REDUCED_SPRAY_SHARE = 0.1;
// The screen RAIN_PER_AMOUNT was tuned on: the Pixel 11's layout viewport,
// CSS px, where K140's 140 pieces read as a dense fall.
export const RAIN_REF_W = 411;
export const RAIN_REF_H = 753;

// Rain timing: releases spread over RAIN_WINDOW s (front-loaded), a piece's
// speed eases to its terminal speed at RAIN_EASE /s, and RAIN_LIFE_MAX s
// after its release a piece that has not fallen out yet fades over
// RAIN_FADE s and dies (a backstop: at the terminal speeds below every
// piece leaves the screen first).
export const RAIN_WINDOW = 1.1;
export const RAIN_LIFE_MAX = 6;
export const RAIN_FADE = 0.5;
const RAIN_EASE = 2.4;
// Terminal speed, screen heights per second.
const RAIN_TERM_MIN = 0.24;
const RAIN_TERM_SPAN = 0.14;

// Spray: lifetimes, drag (1/s); speeds, the fountain's lift and gravity in
// units (sprayUnit) per second; the last SPRAY_FADE share of a life fades
// out. A piece flies out ~1.8-4.4 units against the drag, then sinks at a
// unit per second while it fades.
export const SPRAY_LIFE_MIN = 1.4;
export const SPRAY_LIFE_MAX = 2.4;
export const SPRAY_LIFT = 2.2;
const SPRAY_DRAG = 3.4;
const SPRAY_FADE = 0.4;
// The spray's unit never drops below this many CSS px: the phone's default
// zoom draws the marker radius ~7 px, where unit-sized pieces were specks.
export const SPRAY_MIN_PX = 16;

// The festive set (0xrrggbb): the path's gold first, then saturated hues
// that read on the dark page and over any design's gamut, and a warm white.
export const CONFETTI_COLORS: readonly number[] = [
  0xffd23f, 0xff5d8f, 0x4cc9f0, 0x5ee6a8, 0x9b6bff, 0xff8c42, 0xfff4e0,
];

// Pool row layout (Float32 fields).
export const F = 17;
export const X = 0; // Position (rain: CSS px; spray: world).
export const Y = 1;
export const VX = 2; // Velocity per second.
export const VY = 3;
export const AGE = 4; // Seconds since release (rain: negative until then).
export const LIFE = 5; // Seconds the piece may live after release.
export const LEN = 6; // Long side.
export const ASPECT = 7; // Short side / long side.
export const ROT = 8; // Radians.
export const SPIN = 9; // Radians/s.
export const FLIP = 10; // Flutter phase, radians (cos = the visible width).
export const FLIP_RATE = 11;
export const SWAY = 12; // Rain: sway phase, radians.
export const SWAY_RATE = 13;
export const SWAY_AMP = 14; // Rain: sway speed amplitude, px/s.
export const COLOR = 15; // 0xrrggbb (exact in f32).
export const TERM = 16; // Rain: terminal speed px/s; spray: gravity.

export class ConfettiPool {
  readonly capacity: number;
  readonly data: Float32Array;
  alive = 0;
  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity * F);
  }
  clear(): void {
    this.alive = 0;
  }
  // A free row, or -1 when full (the spawn is skipped).
  alloc(): number {
    return this.alive < this.capacity ? this.alive++ : -1;
  }
  // Swap-with-last compaction: row i takes the last live row.
  kill(i: number): void {
    const last = --this.alive;
    if (i !== last) {
      this.data.copyWithin(i * F, last * F, last * F + F);
    }
  }
}

export interface ConfettiPlan {
  rain: number;
  spray: number;
  // Reduced motion: the spray flies at half speed with no spin.
  slow: boolean;
}

// How many pieces a finish throws on a width x height CSS px screen:
// `amount` scales both effects (clamped to [0, CONFETTI_AMOUNT_MAX]; off,
// garbage or 0 = none), and the screen scales the rain (rainScreenScale;
// no screen = a phone's count). Reduced motion drops the rain and keeps
// REDUCED_SPRAY_SHARE of the spray.
export function confettiPlan(
  on: boolean,
  amount: number,
  reduced: boolean,
  width = 0,
  height = 0
): ConfettiPlan {
  const a =
    on && Number.isFinite(amount)
      ? Math.max(0, Math.min(CONFETTI_AMOUNT_MAX, amount))
      : 0;
  const spray = Math.round(SPRAY_PER_AMOUNT * a);
  const rain = RAIN_PER_AMOUNT * a * rainScreenScale(width, height);
  return {
    rain: reduced ? 0 : Math.min(RAIN_CAP, Math.round(rain)),
    spray: Math.min(
      SPRAY_CAP,
      reduced ? Math.round(spray * REDUCED_SPRAY_SHARE) : spray
    ),
    slow: reduced,
  };
}

// A rain piece's size factor: it follows the screen a little (phones get
// slightly smaller pieces).
export function rainPieceScale(width: number, height: number): number {
  return Math.max(0.8, Math.min(1.3, Math.min(width, height) / 800));
}

// The rain count's multiplier: the same paper coverage on every screen. The
// screen's area in piece areas (rainPieceScale squared) over the reference
// phone's, clamped to [1, RAIN_SCREEN_MAX]: a phone or anything smaller
// throws the base count, a 1400x900 desktop ~2.1x, 1920x1080 ~2.5x.
export function rainScreenScale(width: number, height: number): number {
  if (!(width > 0 && height > 0)) return 1;
  const s = rainPieceScale(width, height);
  const r = rainPieceScale(RAIN_REF_W, RAIN_REF_H);
  const k = (width * height * r * r) / (RAIN_REF_W * RAIN_REF_H * s * s);
  return Math.max(1, Math.min(RAIN_SCREEN_MAX, k));
}

// The spray's length unit in world units: the marker radius, floored at
// SPRAY_MIN_PX CSS px at the current zoom (pxPerWorld = the root's scale).
export function sprayUnit(markerRadius: number, pxPerWorld: number): number {
  const floor = pxPerWorld > 0 ? SPRAY_MIN_PX / pxPerWorld : 0;
  return Math.max(markerRadius, floor);
}

// One piece's paper: a strip (70%) or a near square, sized by `len`.
function paper(d: Float32Array, o: number, len: number, rand: () => number): void {
  d[o + LEN] = len;
  d[o + ASPECT] = rand() < 0.3 ? 0.75 + 0.2 * rand() : 0.36 + 0.16 * rand();
  d[o + ROT] = rand() * Math.PI * 2;
  d[o + FLIP] = rand() * Math.PI * 2;
  d[o + COLOR] = CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)];
}

// Queue `n` rain pieces over a width x height CSS px screen.
export function spawnRain(
  pool: ConfettiPool,
  n: number,
  width: number,
  height: number,
  rand: () => number
): void {
  const d = pool.data;
  const s = rainPieceScale(width, height);
  for (let k = 0; k < n; k++) {
    const i = pool.alloc();
    if (i < 0) return;
    const o = i * F;
    paper(d, o, (9 + rand() * 7) * s, rand);
    d[o + X] = -0.04 * width + rand() * 1.08 * width;
    d[o + Y] = -2 * d[o + LEN] - rand() * 0.05 * height;
    // Front-loaded releases: a dense opening that thins out.
    d[o + AGE] = -RAIN_WINDOW * Math.pow(rand(), 1.5);
    d[o + LIFE] = RAIN_LIFE_MAX;
    const term = height * (RAIN_TERM_MIN + RAIN_TERM_SPAN * rand());
    d[o + TERM] = term;
    d[o + VY] = term * (0.4 + 0.3 * rand());
    d[o + VX] = (rand() - 0.5) * 0.05 * width;
    d[o + SPIN] = (rand() - 0.5) * 6;
    d[o + FLIP_RATE] = 5 + rand() * 7;
    d[o + SWAY] = rand() * Math.PI * 2;
    d[o + SWAY_RATE] = 1.4 + rand() * 1.8;
    d[o + SWAY_AMP] = (14 + rand() * 30) * s;
  }
}

// Burst `n` spray pieces from a ring around (cx, cy), world units.
export function spawnSpray(
  pool: ConfettiPool,
  n: number,
  cx: number,
  cy: number,
  unit: number,
  slow: boolean,
  rand: () => number
): void {
  const d = pool.data;
  const pace = slow ? 0.5 : 1;
  for (let k = 0; k < n; k++) {
    const i = pool.alloc();
    if (i < 0) return;
    const o = i * F;
    // Evenly around the ring, jittered: no clumps, no empty sides.
    const a = (Math.PI * 2 * (k + rand() * 0.8)) / Math.max(1, n);
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const r0 = unit * (0.9 + 0.3 * rand());
    // About the rain's paper size (8-14 CSS px at the usual zooms).
    paper(d, o, unit * (0.5 + 0.3 * rand()), rand);
    // Reduced motion has no flutter: show each piece's full face.
    if (slow) d[o + FLIP] = 0;
    d[o + X] = cx + c * r0;
    d[o + Y] = cy + sn * r0;
    const sp = unit * (6 + rand() * 9) * pace;
    // A slight fountain: everything leaves a little upward (+y is down).
    d[o + VX] = c * sp;
    d[o + VY] = sn * sp - unit * SPRAY_LIFT * pace;
    d[o + AGE] = 0;
    d[o + LIFE] =
      (SPRAY_LIFE_MIN + rand() * (SPRAY_LIFE_MAX - SPRAY_LIFE_MIN)) *
      (slow ? 0.8 : 1);
    d[o + TERM] = unit * 3.4 * pace;
    // Drawn either way, so a reduced burst is the same burst, slowed.
    const spin = (rand() - 0.5) * 14;
    const flipRate = 6 + rand() * 8;
    d[o + SPIN] = slow ? 0 : spin;
    d[o + FLIP_RATE] = slow ? 0 : flipRate;
    d[o + SWAY] = 0;
    d[o + SWAY_RATE] = 0;
    d[o + SWAY_AMP] = 0;
  }
}

// Advance the rain by dt seconds over a screen `height` CSS px tall.
export function stepRain(pool: ConfettiPool, dt: number, height: number): void {
  const d = pool.data;
  const ease = 1 - Math.exp(-RAIN_EASE * dt);
  let i = 0;
  while (i < pool.alive) {
    const o = i * F;
    const age = d[o + AGE] + dt;
    d[o + AGE] = age;
    if (age < 0) {
      i++;
      continue;
    }
    if (age >= d[o + LIFE] || d[o + Y] - d[o + LEN] > height) {
      pool.kill(i);
      continue;
    }
    d[o + VY] += (d[o + TERM] - d[o + VY]) * ease;
    d[o + SWAY] += d[o + SWAY_RATE] * dt;
    d[o + X] += (d[o + VX] + d[o + SWAY_AMP] * Math.cos(d[o + SWAY])) * dt;
    d[o + Y] += d[o + VY] * dt;
    d[o + ROT] += d[o + SPIN] * dt;
    d[o + FLIP] += d[o + FLIP_RATE] * dt;
    i++;
  }
}

// Advance the spray by dt seconds.
export function stepSpray(pool: ConfettiPool, dt: number): void {
  const d = pool.data;
  const damp = Math.exp(-SPRAY_DRAG * dt);
  let i = 0;
  while (i < pool.alive) {
    const o = i * F;
    const age = d[o + AGE] + dt;
    d[o + AGE] = age;
    if (age >= d[o + LIFE]) {
      pool.kill(i);
      continue;
    }
    d[o + VX] *= damp;
    d[o + VY] = d[o + VY] * damp + d[o + TERM] * dt;
    d[o + X] += d[o + VX] * dt;
    d[o + Y] += d[o + VY] * dt;
    d[o + ROT] += d[o + SPIN] * dt;
    d[o + FLIP] += d[o + FLIP_RATE] * dt;
    i++;
  }
}

// What the view draws for row i: alpha, the two scales' lengths (long side,
// visible short side) and the shaded tint. `fadeShare` is the share of the
// life over which the piece fades out (rain: RAIN_FADE of its LIFE).
export interface PieceLook {
  alpha: number;
  long: number;
  short: number;
  rotation: number;
  tint: number;
}

export function pieceLook(
  d: Float32Array,
  i: number,
  spray: boolean,
  out: PieceLook
): PieceLook {
  const o = i * F;
  const age = d[o + AGE];
  const life = d[o + LIFE];
  if (age < 0) {
    out.alpha = 0;
    out.long = 0;
    out.short = 0;
    return out;
  }
  const fade = spray ? SPRAY_FADE * life : RAIN_FADE;
  out.alpha = Math.max(0, Math.min(1, (life - age) / fade));
  // The flutter: |cos| of the flip phase is the visible width; a floor
  // keeps an edge-on piece a sliver, not a gap in the fall.
  const w = Math.abs(Math.cos(d[o + FLIP]));
  out.long = d[o + LEN];
  out.short = d[o + LEN] * d[o + ASPECT] * (0.12 + 0.88 * w);
  out.rotation = d[o + ROT];
  // The back side (edge-on) reads darker: shade 0.55 .. 1.
  out.tint = shadeHex(d[o + COLOR], 0.55 + 0.45 * w);
  return out;
}

// 0xrrggbb scaled toward black by `k` in [0, 1].
export function shadeHex(c: number, k: number): number {
  const r = Math.round(((c >> 16) & 255) * k);
  const g = Math.round(((c >> 8) & 255) * k);
  const b = Math.round((c & 255) * k);
  return (r << 16) | (g << 8) | b;
}

// The longest step the pieces take in one frame: after a stall (a hidden
// tab's first frame back) they resume instead of jumping.
export const CONFETTI_MAX_DT = 0.1;

// Both effects' pools and their clock, with no pixi (render/confetti.ts
// mirrors the pools into particles). `active` is the term main.ts's
// sceneAnimating() reads: true from a burst until the last piece dies.
export class ConfettiSim {
  readonly rain = new ConfettiPool(RAIN_CAP);
  readonly spray = new ConfettiPool(SPRAY_CAP);

  get active(): boolean {
    return this.rain.alive > 0 || this.spray.alive > 0;
  }

  // Throw a finish's confetti: plan.rain over a width x height CSS px
  // screen, and plan.spray around the world point (cx, cy) in `unit`s
  // (sprayUnit). Returns whether anything was thrown.
  burst(
    plan: ConfettiPlan,
    width: number,
    height: number,
    cx: number,
    cy: number,
    unit: number,
    rand: () => number = Math.random
  ): boolean {
    let thrown = false;
    if (plan.rain > 0 && width > 0 && height > 0) {
      spawnRain(this.rain, plan.rain, width, height, rand);
      thrown = true;
    }
    if (plan.spray > 0 && unit > 0 && Number.isFinite(cx + cy)) {
      spawnSpray(this.spray, plan.spray, cx, cy, unit, plan.slow, rand);
      thrown = true;
    }
    return thrown;
  }

  // Advance both effects by dt seconds (clamped to CONFETTI_MAX_DT;
  // garbage steps 0) over a screen `height` CSS px tall.
  step(dt: number, height: number): void {
    const s = dt > 0 ? Math.min(dt, CONFETTI_MAX_DT) : 0;
    if (this.rain.alive > 0) stepRain(this.rain, s, height);
    if (this.spray.alive > 0) stepSpray(this.spray, s);
  }

  clear(): void {
    this.rain.clear();
    this.spray.clear();
  }
}

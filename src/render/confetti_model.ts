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
//           the bottom edge.
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

// Pieces at amount 1, and the amount's top (the panel slider and the link
// clamp read it). The pools hold the max, so the caps are hard.
export const RAIN_PER_AMOUNT = 140;
export const SPRAY_PER_AMOUNT = 40;
export const CONFETTI_AMOUNT_MAX = 3;
export const RAIN_CAP = RAIN_PER_AMOUNT * CONFETTI_AMOUNT_MAX;
export const SPRAY_CAP = SPRAY_PER_AMOUNT * CONFETTI_AMOUNT_MAX;
export const REDUCED_SPRAY_SHARE = 0.4;

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

// Spray: lifetimes, drag (1/s); speeds and gravity in units (sprayUnit) per
// second; the last SPRAY_FADE share of a life fades out.
export const SPRAY_LIFE_MIN = 1.0;
export const SPRAY_LIFE_MAX = 1.8;
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

// How many pieces a finish throws: `amount` scales both effects (clamped to
// [0, CONFETTI_AMOUNT_MAX]; off, garbage or 0 = none). Reduced motion drops
// the rain and keeps REDUCED_SPRAY_SHARE of the spray.
export function confettiPlan(
  on: boolean,
  amount: number,
  reduced: boolean
): ConfettiPlan {
  const a =
    on && Number.isFinite(amount)
      ? Math.max(0, Math.min(CONFETTI_AMOUNT_MAX, amount))
      : 0;
  const spray = Math.round(SPRAY_PER_AMOUNT * a);
  return {
    rain: reduced ? 0 : Math.min(RAIN_CAP, Math.round(RAIN_PER_AMOUNT * a)),
    spray: Math.min(
      SPRAY_CAP,
      reduced ? Math.round(spray * REDUCED_SPRAY_SHARE) : spray
    ),
    slow: reduced,
  };
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
  // Piece size follows the screen a little (phones get slightly smaller).
  const s = Math.max(0.8, Math.min(1.3, Math.min(width, height) / 800));
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
    paper(d, o, unit * (0.34 + 0.22 * rand()), rand);
    d[o + X] = cx + c * r0;
    d[o + Y] = cy + sn * r0;
    const sp = unit * (4 + rand() * 6.5) * pace;
    // A slight fountain: everything leaves a little upward (+y is down).
    d[o + VX] = c * sp;
    d[o + VY] = sn * sp - unit * 1.6 * pace;
    d[o + AGE] = 0;
    d[o + LIFE] =
      (SPRAY_LIFE_MIN + rand() * (SPRAY_LIFE_MAX - SPRAY_LIFE_MIN)) *
      (slow ? 0.8 : 1);
    d[o + TERM] = unit * 3.4 * pace;
    d[o + SPIN] = slow ? 0 : (rand() - 0.5) * 14;
    d[o + FLIP_RATE] = slow ? 0 : 6 + rand() * 8;
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

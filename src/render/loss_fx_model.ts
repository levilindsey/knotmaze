// K546 stage 3: the loss effects' pure part — the contact burst's pool
// (world space), the ash fall's pool (screen space) and the plan that
// sizes them, in plain Float32Array pools with no pixi in sight, so the
// tests drive it directly (the confetti_model.ts shape). The view
// (render/loss_fx.ts) mirrors each pool row into drawn pieces.
//
// The look (docs/design/K546_loss_effects.md): option B on A's clock —
// an explosion of sparks with gravity and drag in the catcher's colour,
// ignited at the meeting point under the evolved holding ring
// (game/mino_feedback.ts), then ash falling over the whole screen like
// the win rain's dark mirror, in the catcher's palette. Reduced motion:
// no ash at all (a full-screen fall is the large-area motion WCAG 2.3.3
// asks to avoid) and only a small slow burst. Every piece has a bounded
// lifetime so the frame loop's OVERLAY poll clears.

export type LossKind = "mino" | "fire";

// The amount's top (the panel slider and the link clamp read it); the
// pools hold the max, so the caps are hard.
export const LOSS_AMOUNT_MAX = 3;
export const BURST_PER_AMOUNT = 56;
export const ASH_PER_AMOUNT = 240;
export const BURST_CAP = BURST_PER_AMOUNT * LOSS_AMOUNT_MAX;
export const ASH_CAP = ASH_PER_AMOUNT * LOSS_AMOUNT_MAX * 3;
// Reduced motion's burst share and speed (the confetti spray's shape).
export const REDUCED_BURST_SHARE = 0.1;

// The catchers' colours: white-hot cores, the family's reds/oranges, and
// a smoke grey the slow pieces wear.
export const LOSS_COLORS: Record<LossKind, readonly number[]> = {
  mino: [0xffffff, 0xff6a55, 0xff2418, 0x9a9296],
  fire: [0xffffff, 0xffc46a, 0xff7a18, 0x8a8078],
};

// Burst motion: speeds and gravity in units (the marker radius) per
// second, drag 1/s — the win spray's proven numbers.
export const BURST_LIFE_MIN = 0.5;
export const BURST_LIFE_MAX = 1.3;
export const BURST_DRAG = 3.0;
export const BURST_GRAVITY = 15;
const BURST_FADE = 0.35; // last share of a life fades out
// The flash disc at ignition: full for FLASH_S, gone by FLASH_S*2.
export const FLASH_S = 0.12;

export function flashAlpha(age: number): number {
  if (age < 0 || age >= FLASH_S * 2) return 0;
  return age < FLASH_S ? 1 : 1 - (age - FLASH_S) / FLASH_S;
}

// Ash fall timing: releases taper over ASH_WINDOW (the rain's shape),
// pieces fall at a terminal speed in screen heights per second, slower
// and swaying more than the win rain.
export const ASH_WINDOW = 2.6;
export const ASH_LIFE_MAX = 6.0;
const ASH_FADE = 0.5;
const ASH_TERM_MIN = 0.16; // screen heights per second
const ASH_TERM_SPAN = 0.1;

export interface LossPlan {
  burst: number;
  ash: number;
  speedMul: number; // the burst's speed multiplier (reduced: half)
}

// The plan for one loss: counts from the amount (0 = ring only), the
// screen (ash grows with area, capped) and the motion setting.
export function lossPlan(
  amount: number,
  reduced: boolean,
  screenW: number,
  screenH: number,
): LossPlan {
  const a = Math.max(0, Math.min(LOSS_AMOUNT_MAX, amount));
  if (a <= 0) return { burst: 0, ash: 0, speedMul: 1 };
  if (reduced) {
    return {
      burst: Math.max(1, Math.round(BURST_PER_AMOUNT * a * REDUCED_BURST_SHARE)),
      ash: 0,
      speedMul: 0.5,
    };
  }
  const area = Math.max(0.25, Math.min(3, (screenW * screenH) / (411 * 753)));
  return {
    burst: Math.round(BURST_PER_AMOUNT * a),
    ash: Math.round(ASH_PER_AMOUNT * a * area),
    speedMul: 1,
  };
}

type Rng = () => number;

// One pool row per piece; `n` live rows at the front.
const B_STRIDE = 9; // x, y, vx, vy, age, life, size, colorIdx, gravMul
export class BurstPool {
  readonly data = new Float32Array(BURST_CAP * B_STRIDE);
  n = 0;

  spawn(
    cx: number,
    cy: number,
    unit: number,
    count: number,
    colorCount: number,
    rng: Rng,
    speedMul: number,
  ): void {
    let n = 0;
    for (let i = 0; i < count && n < BURST_CAP; i++) {
      const o = n * B_STRIDE;
      const ang = rng() * Math.PI * 2;
      // A few slow grey pieces hang as the smoke puff after.
      const smoke = rng() < 0.18;
      const speed = (smoke ? 0.6 + rng() * 1.2 : 2.5 + rng() * 7.5) * speedMul;
      this.data[o] = cx;
      this.data[o + 1] = cy;
      this.data[o + 2] = Math.cos(ang) * speed * unit;
      this.data[o + 3] = Math.sin(ang) * speed * unit - (smoke ? 1.2 * unit : 0);
      this.data[o + 4] = 0;
      this.data[o + 5] = smoke
        ? BURST_LIFE_MAX + rng() * 0.7
        : BURST_LIFE_MIN + rng() * (BURST_LIFE_MAX - BURST_LIFE_MIN);
      this.data[o + 6] = (smoke ? 0.5 + rng() * 0.5 : 0.16 + rng() * 0.22) * unit;
      this.data[o + 7] = smoke ? colorCount - 1 : Math.floor(rng() * (colorCount - 1));
      this.data[o + 8] = smoke ? -0.12 : 1;
      n++;
    }
    this.n = n;
  }

  // Advances every piece; dead rows swap out. Returns the live count.
  step(dt: number, unit: number): number {
    let n = this.n;
    let i = 0;
    while (i < n) {
      const o = i * B_STRIDE;
      const age = this.data[o + 4] + dt;
      if (age >= this.data[o + 5]) {
        n--;
        this.data.copyWithin(o, n * B_STRIDE, n * B_STRIDE + B_STRIDE);
        continue;
      }
      this.data[o + 4] = age;
      const drag = Math.max(0, 1 - BURST_DRAG * dt);
      this.data[o + 2] *= drag;
      this.data[o + 3] = this.data[o + 3] * drag + BURST_GRAVITY * this.data[o + 8] * unit * dt;
      this.data[o] += this.data[o + 2] * dt;
      this.data[o + 1] += this.data[o + 3] * dt;
      i++;
    }
    this.n = n;
    return n;
  }

  // Piece i's drawn look: position (world), radius and alpha in [0, 1].
  look(i: number, out: { x: number; y: number; r: number; alpha: number; color: number }): void {
    const o = i * B_STRIDE;
    const life = this.data[o + 5];
    const age = this.data[o + 4];
    const fade = Math.min(1, Math.max(0, (life - age) / (life * BURST_FADE)));
    out.x = this.data[o];
    out.y = this.data[o + 1];
    out.r = this.data[o + 6];
    out.alpha = fade;
    out.color = this.data[o + 7];
  }
}

const A_STRIDE = 9; // x, y, term, swayPhase, swayAmp, age, delay, size, colorIdx
export class AshPool {
  readonly data = new Float32Array(ASH_CAP * A_STRIDE);
  n = 0;
  private h = 1;

  spawn(w: number, h: number, count: number, colorCount: number, rng: Rng): void {
    this.h = h;
    let n = 0;
    for (let i = 0; i < count && n < ASH_CAP; i++) {
      const o = n * A_STRIDE;
      this.data[o] = rng() * w;
      this.data[o + 1] = -12 - rng() * h * 0.15;
      this.data[o + 2] = (ASH_TERM_MIN + rng() * ASH_TERM_SPAN) * h;
      this.data[o + 3] = rng() * Math.PI * 2;
      this.data[o + 4] = 14 + rng() * 26; // sway, px per second
      this.data[o + 5] = 0;
      // Releases start dense and taper (the rain's fix): front-loaded.
      this.data[o + 6] = ASH_WINDOW * Math.pow(rng(), 1.7);
      this.data[o + 7] = 1.6 + rng() * 2.6;
      this.data[o + 8] = Math.floor(rng() * colorCount);
      n++;
    }
    this.n = n;
  }

  // Advances every piece; dead rows swap out. Returns the live count
  // (pieces still in their release delay count as live).
  step(dt: number): number {
    let n = this.n;
    let i = 0;
    while (i < n) {
      const o = i * A_STRIDE;
      const age = this.data[o + 5] + dt;
      this.data[o + 5] = age;
      const fallen = age - this.data[o + 6];
      if (fallen > ASH_LIFE_MAX || this.data[o + 1] > this.h + 24) {
        n--;
        this.data.copyWithin(o, n * A_STRIDE, n * A_STRIDE + A_STRIDE);
        continue;
      }
      if (fallen > 0) {
        this.data[o + 1] += this.data[o + 2] * dt;
        this.data[o] += Math.sin(age * 1.7 + this.data[o + 3]) * this.data[o + 4] * dt;
      }
      i++;
    }
    this.n = n;
    return n;
  }

  // Piece i's drawn look (screen px); alpha 0 while it waits to release.
  look(i: number, out: { x: number; y: number; r: number; alpha: number; color: number }): void {
    const o = i * A_STRIDE;
    const fallen = this.data[o + 5] - this.data[o + 6];
    out.x = this.data[o];
    out.y = this.data[o + 1];
    out.r = this.data[o + 7];
    out.color = this.data[o + 8];
    if (fallen <= 0) {
      out.alpha = 0;
      return;
    }
    const left = ASH_LIFE_MAX - fallen;
    out.alpha = 0.85 * Math.min(1, left / ASH_FADE);
  }
}

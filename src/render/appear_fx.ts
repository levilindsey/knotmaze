// P4 Stage 26, APPEARANCE FX: frontier particles for the Stage 22 reveal
// animation. While a non-instant appear mode is revealing, every advancing
// frontier (reveal tip, or ink dye edge) emits particles from one pooled,
// Float32Array-backed system rendered on a single ParticleContainer above
// the ribbons. Styles (the `afx` URL param / appearFx dropdown):
//   sparks - warm ember spray ahead of the front: gravity + drag, a
//            white-hot -> gold -> ember tint ramp (echoes the game's gold
//            path accent), fast young sparks stretch along their velocity
//            and contract to dots (the classic speed read).
//   comet  - ice-white streak quads laid along the frontier's travel
//            direction (fixed rotation, length shrinking with age) under a
//            soft short-lived halo that rides the head, plus sparse cool
//            flecks; the cold palette keeps it distinct from the warm
//            gameplay gold.
//   dust   - slow pastel glitter motes scattered around the front that
//            drift with a gentle curl and TWINKLE (sin^2 alpha, per-mote
//            phase/frequency), echoing the ribbon gamut.
//
// Blending is NORMAL, deliberately (the Stage 22 tip-glow reasoning): the
// canvas is TRANSPARENT (Stage 18 - gaps clip the thread layer), so
// additive particles over empty canvas add into nothing and composite as
// muddy grey discs on the page backdrop. Bright, warm, high-alpha cores
// under normal blending read as glow over both the backdrop and the
// threads.
//
// Pool mechanics: capacity MAX_PARTICLES, all state in one Float32Array
// (stride FP), swap-with-last compaction, zero allocations after
// construction. Every pixi Particle slot is added to the container once;
// slot i always renders pool row i, and dead slots collapse to scale 0 +
// alpha 0 (a degenerate quad rasterizes nothing). When the pool is empty
// the container hides and tick() is a single early-return - zero per-frame
// work once the reveal ends and the field drains. Spawning simply skips
// when the pool is full; the per-frame emitter order is rotated upstream
// so no one frontier monopolizes the budget.
//
// The soft-dot texture is built once and cached for the PAGE lifetime and
// never destroyed - the palette-texture lore applies to any texture: pixi's
// retained bind groups can still reference a source the frame after a
// scene rebuild, and destroying it then kills the ticker.

import { Particle, ParticleContainer, Texture } from "pixi.js";
import type { AppearFxMode } from "../core/reveal_plan";
import { SeededRNG } from "../util/random";

export const MAX_FX_PARTICLES = 600;

// Pool row layout (Float32 fields). Tints are 24-bit hex values, exact in
// f32 (integers through 2^24).
const FP = 14;
const PX = 0; // World position.
const PY = 1;
const PVX = 2; // World velocity, units/s.
const PVY = 3;
const PAGE = 4; // Seconds alive.
const PLIFE = 5; // Lifetime, seconds.
const PSIZE = 6; // World radius at birth (streaks: full LENGTH).
const PKIND = 7; // Behavior id (K_*), per PARTICLE so a live style
//                  switch lets the old population finish its look.
const PROT = 8; // Fixed render rotation (streaks).
const PPHASE = 9; // Twinkle phase (dust), radians.
const PFREQ = 10; // Twinkle frequency (dust), rad/s.
const PCURL = 11; // Velocity curl rate (dust), rad/s.
const PC0 = 12; // Birth tint.
const PC1 = 13; // Death tint.

const K_SPARK = 0;
const K_STREAK = 1;
const K_HALO = 2;
const K_DUST = 3;

// Per-frontier spawn rates, particles/second. Deliberately generous - the
// feature is in its explore-then-tone-down phase; the 600 pool is the
// global ceiling.
const SPARK_RATE = 150;
const STREAK_RATE = 130;
const HALO_RATE = 70;
const FLECK_RATE = 30;
const DUST_RATE = 70;

// Spark physics.
const SPARK_GRAVITY = 3.1; // World units/s^2, +y is down.
const SPARK_DRAG = 2.3; // 1/s.
const STREAK_DRAG = 3.2;
const DUST_DRAG = 0.35;

// Dust mote pastel set (fixed per mote; twinkle pushes toward white).
const DUST_COLORS = [0xffd9ee, 0xd9c8ff, 0xc5f1e3, 0xffeab8, 0xc9e2ff];

const FX_TEX_SIZE = 64;
let FX_TEXTURE: Texture | null = null;

function fxTexture(): Texture {
  if (FX_TEXTURE) return FX_TEXTURE;
  const canvas = document.createElement("canvas");
  canvas.width = FX_TEX_SIZE;
  canvas.height = FX_TEX_SIZE;
  const ctx = canvas.getContext("2d")!;
  const h = FX_TEX_SIZE / 2;
  const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
  // Bright compact core, soft skirt: reads as an ember dot at small
  // scales and as a glow streak when stretched along one axis.
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.22, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.38)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FX_TEX_SIZE, FX_TEX_SIZE);
  FX_TEXTURE = Texture.from(canvas);
  return FX_TEXTURE;
}

function lerpHex(a: number, b: number, t: number): number {
  const q = t < 0 ? 0 : t > 1 ? 1 : t;
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    ((ar + (br - ar) * q) << 16) |
    ((ag + (bg - ag) * q) << 8) |
    (ab + (bb - ab) * q)
  );
}

export class AppearFxSystem {
  readonly container: ParticleContainer;
  // Live style for NEW spawns (per-row kinds persist, so switching the
  // dropdown mid-reveal lets the old population finish while fresh
  // particles wear the new look).
  style: Exclude<AppearFxMode, "none"> = "sparks";
  // World-units size reference (the thread width); the renderer syncs it.
  unit = 0.42;

  private data = new Float32Array(MAX_FX_PARTICLES * FP);
  private slots: Particle[] = [];
  private alive = 0;
  private shown = 0; // Highest slot count carrying visible state.
  private rng: SeededRNG;

  constructor(seed: number) {
    const tex = fxTexture();
    this.container = new ParticleContainer({
      texture: tex,
      // Scale and anchor live in the vertex bucket; everything the tick
      // animates must be dynamic. uvs stay static - one shared frame.
      dynamicProperties: {
        vertex: true,
        position: true,
        rotation: true,
        color: true,
      },
    });
    for (let i = 0; i < MAX_FX_PARTICLES; i++) {
      const p = new Particle({
        texture: tex,
        anchorX: 0.5,
        anchorY: 0.5,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
      });
      this.slots.push(p);
      this.container.addParticle(p);
    }
    this.container.visible = false;
    this.rng = new SeededRNG((seed ^ 0xaf37) >>> 0);
  }

  get aliveCount(): number {
    return this.alive;
  }

  // Drop every live particle (fresh reveal -> fresh field; stale motes
  // would float over a knot whose positions just reset).
  clear(): void {
    this.alive = 0;
    for (let k = 0; k < this.shown; k++) {
      const s = this.slots[k];
      s.alpha = 0;
      s.scaleX = 0;
      s.scaleY = 0;
    }
    this.shown = 0;
    this.container.visible = false;
  }

  // Emit this frame's particles for ONE frontier: (x, y) world position,
  // (dx, dy) travel direction (normalized here), frontSpeed in world
  // units/s. Call once per frontier per frame, then tick(dt) once.
  spawnFrontier(
    x: number,
    y: number,
    dx: number,
    dy: number,
    frontSpeed: number,
    dt: number
  ): void {
    const n = Math.sqrt(dx * dx + dy * dy);
    if (n > 1e-6) {
      dx /= n;
      dy /= n;
    } else {
      const a = this.rng.next() * Math.PI * 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
    }
    if (this.style === "sparks") {
      this.emitSparks(x, y, dx, dy, frontSpeed, dt);
    } else if (this.style === "comet") {
      this.emitComet(x, y, dx, dy, frontSpeed, dt);
    } else {
      this.emitDust(x, y, dx, dy, dt);
    }
  }

  // Stochastic rounding of rate*dt so fractional per-frame budgets emit
  // at the right average without per-frontier accumulator state.
  private countFor(rate: number, dt: number): number {
    const want = rate * dt;
    const base = Math.floor(want);
    return base + (this.rng.next() < want - base ? 1 : 0);
  }

  // Claim a pool row; -1 when full (spawn is simply skipped).
  private alloc(): number {
    if (this.alive >= MAX_FX_PARTICLES) return -1;
    return this.alive++;
  }

  private emitSparks(
    x: number,
    y: number,
    dx: number,
    dy: number,
    frontSpeed: number,
    dt: number
  ): void {
    const R = this.rng;
    const d = this.data;
    const tw = this.unit;
    let c = this.countFor(SPARK_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const spread = (R.next() - 0.5) * 1.7; // ~±49 degrees around travel.
      const cs = Math.cos(spread);
      const sn = Math.sin(spread);
      const hot = R.next() < 0.12; // Occasional bright popper.
      const sp =
        (0.9 + R.next() * 2.4) * (hot ? 1.7 : 1) + frontSpeed * 0.45;
      d[o + PX] = x + (R.next() - 0.5) * tw * 0.3;
      d[o + PY] = y + (R.next() - 0.5) * tw * 0.3;
      d[o + PVX] = (dx * cs - dy * sn) * sp;
      d[o + PVY] = (dx * sn + dy * cs) * sp;
      d[o + PAGE] = 0;
      d[o + PLIFE] = (0.3 + R.next() * 0.55) * (hot ? 1.5 : 1);
      d[o + PSIZE] = tw * (0.1 + R.next() * 0.15) * (hot ? 1.6 : 1);
      d[o + PKIND] = K_SPARK;
      d[o + PROT] = 0;
      d[o + PC0] = 0xfff3d0; // White-hot birth...
      d[o + PC1] = R.next() < 0.5 ? 0xffb43c : 0xff7a2e; // ...ember death.
    }
  }

  private emitComet(
    x: number,
    y: number,
    dx: number,
    dy: number,
    frontSpeed: number,
    dt: number
  ): void {
    const R = this.rng;
    const d = this.data;
    const tw = this.unit;
    const rot = Math.atan2(dy, dx);
    // Streak afterglow: laid near the head with a slight backward drift,
    // stretched along the travel direction.
    let c = this.countFor(STREAK_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const back = 0.25 + R.next() * 0.75;
      d[o + PX] = x + (R.next() - 0.5) * tw * 0.45;
      d[o + PY] = y + (R.next() - 0.5) * tw * 0.45;
      d[o + PVX] = -dx * back + (R.next() - 0.5) * 0.35;
      d[o + PVY] = -dy * back + (R.next() - 0.5) * 0.35;
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.5 + R.next() * 0.6;
      d[o + PSIZE] = tw * (1.2 + R.next() * 0.9); // Full streak length.
      d[o + PKIND] = K_STREAK;
      d[o + PROT] = rot;
      d[o + PC0] = 0xffffff;
      d[o + PC1] = 0x9db9ff;
    }
    // Halo: short-lived big soft glow; overlapping replacements read as a
    // steady luminous head riding the front.
    c = this.countFor(HALO_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      d[o + PX] = x;
      d[o + PY] = y;
      d[o + PVX] = dx * frontSpeed * 0.9;
      d[o + PVY] = dy * frontSpeed * 0.9;
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.1 + R.next() * 0.08;
      d[o + PSIZE] = tw * (1.6 + R.next() * 0.8);
      d[o + PKIND] = K_HALO;
      d[o + PROT] = 0;
      d[o + PC0] = 0xffffff;
      d[o + PC1] = 0xbfd4ff;
    }
    // Sparse cool flecks tossed wide (the spark integrator, iced).
    c = this.countFor(FLECK_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const a = (R.next() - 0.5) * 2.6;
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      const sp = 0.6 + R.next() * 1.4;
      d[o + PX] = x;
      d[o + PY] = y;
      d[o + PVX] = (dx * cs - dy * sn) * sp;
      d[o + PVY] = (dx * sn + dy * cs) * sp;
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.25 + R.next() * 0.4;
      d[o + PSIZE] = tw * (0.07 + R.next() * 0.08);
      d[o + PKIND] = K_SPARK;
      d[o + PROT] = 0;
      d[o + PC0] = 0xffffff;
      d[o + PC1] = 0x8fb4ff;
    }
  }

  private emitDust(
    x: number,
    y: number,
    dx: number,
    dy: number,
    dt: number
  ): void {
    const R = this.rng;
    const d = this.data;
    const tw = this.unit;
    let c = this.countFor(DUST_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const ja = R.next() * Math.PI * 2;
      const jr = R.next() * tw * 0.9;
      const va = R.next() * Math.PI * 2;
      const sp = 0.12 + R.next() * 0.35;
      d[o + PX] = x + Math.cos(ja) * jr;
      d[o + PY] = y + Math.sin(ja) * jr;
      d[o + PVX] = Math.cos(va) * sp + dx * 0.15;
      d[o + PVY] = Math.sin(va) * sp + dy * 0.15 - 0.18; // Upward bias.
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.8 + R.next() * 1.1;
      d[o + PSIZE] = tw * (0.08 + R.next() * 0.13);
      d[o + PKIND] = K_DUST;
      d[o + PROT] = 0;
      d[o + PPHASE] = R.next() * Math.PI * 2;
      d[o + PFREQ] = 14 + R.next() * 22; // ~2-6 Hz twinkle.
      d[o + PCURL] = (R.next() - 0.5) * 3.4;
      const tint = DUST_COLORS[R.nextInt(DUST_COLORS.length)];
      d[o + PC0] = tint;
      d[o + PC1] = tint;
    }
  }

  // Advance every live particle and mirror the pool into the Particle
  // slots. Call once per frame from the paint tick (all ticker branches).
  tick(dtIn: number): void {
    if (this.alive === 0) {
      if (this.container.visible) this.container.visible = false;
      return;
    }
    // Clamp a resumed background tab's catch-up delta: particles are
    // ephemeral decor, not simulation state.
    const dt = Math.min(dtIn, 0.1);
    this.container.visible = true;
    const d = this.data;
    const scalePerRadius = 2 / FX_TEX_SIZE; // World radius -> quad scale.
    const scalePerLength = 1 / FX_TEX_SIZE;
    const prevShown = this.shown > this.alive ? this.shown : this.alive;
    let n = this.alive;
    let i = 0;
    while (i < n) {
      const o = i * FP;
      const age = d[o + PAGE] + dt;
      const life = d[o + PLIFE];
      if (age >= life) {
        // Swap-with-last; the moved row (previously unprocessed tail)
        // re-runs at this index.
        n--;
        if (i !== n) d.copyWithin(o, n * FP, n * FP + FP);
        continue;
      }
      d[o + PAGE] = age;
      const t = age / life;
      const kind = d[o + PKIND];
      const slot = this.slots[i];
      if (kind === K_SPARK) {
        const drag = Math.exp(-SPARK_DRAG * dt);
        d[o + PVX] *= drag;
        d[o + PVY] = d[o + PVY] * drag + SPARK_GRAVITY * dt;
        d[o + PX] += d[o + PVX] * dt;
        d[o + PY] += d[o + PVY] * dt;
        const vx = d[o + PVX];
        const vy = d[o + PVY];
        const spd = Math.sqrt(vx * vx + vy * vy);
        // Fast young sparks stretch along their velocity, contracting to
        // dots as they slow and age.
        const stretch = 1 + Math.min(1.8, spd * 0.3) * (1 - t);
        const size = d[o + PSIZE] * (1 - 0.55 * t);
        slot.x = d[o + PX];
        slot.y = d[o + PY];
        slot.rotation = stretch > 1.02 ? Math.atan2(vy, vx) : 0;
        slot.scaleX = size * stretch * scalePerRadius;
        slot.scaleY = size * scalePerRadius;
        slot.tint = lerpHex(d[o + PC0], d[o + PC1], Math.min(1, t * 1.35));
        slot.alpha = Math.min(1, (1 - t) * 2.2);
      } else if (kind === K_STREAK) {
        const drag = Math.exp(-STREAK_DRAG * dt);
        d[o + PVX] *= drag;
        d[o + PVY] *= drag;
        d[o + PX] += d[o + PVX] * dt;
        d[o + PY] += d[o + PVY] * dt;
        const len = d[o + PSIZE] * (1 - 0.65 * t);
        const thick = this.unit * 0.26 * (1 - 0.4 * t);
        const fade = 1 - t;
        slot.x = d[o + PX];
        slot.y = d[o + PY];
        slot.rotation = d[o + PROT];
        slot.scaleX = len * scalePerLength;
        slot.scaleY = thick * scalePerLength;
        slot.tint = lerpHex(d[o + PC0], d[o + PC1], t);
        slot.alpha = fade * fade * 0.9;
      } else if (kind === K_HALO) {
        d[o + PX] += d[o + PVX] * dt;
        d[o + PY] += d[o + PVY] * dt;
        const size = d[o + PSIZE] * (1 + 0.5 * t);
        slot.x = d[o + PX];
        slot.y = d[o + PY];
        slot.rotation = 0;
        slot.scaleX = size * scalePerRadius;
        slot.scaleY = size * scalePerRadius;
        slot.tint = lerpHex(d[o + PC0], d[o + PC1], t);
        slot.alpha = 0.5 * (1 - t);
      } else {
        // K_DUST: curl the velocity, drift, twinkle.
        const cu = d[o + PCURL] * dt;
        const cs = Math.cos(cu);
        const sn = Math.sin(cu);
        const vx = d[o + PVX];
        const vy = d[o + PVY];
        const drag = Math.exp(-DUST_DRAG * dt);
        d[o + PVX] = (vx * cs - vy * sn) * drag;
        d[o + PVY] = (vx * sn + vy * cs) * drag;
        d[o + PX] += d[o + PVX] * dt;
        d[o + PY] += d[o + PVY] * dt;
        const s = Math.sin(d[o + PPHASE] + age * d[o + PFREQ]);
        const twinkle = s * s;
        const envIn = t < 0.12 ? t / 0.12 : 1;
        const envOut = t > 0.75 ? (1 - t) / 0.25 : 1;
        const size = d[o + PSIZE] * (0.8 + 0.5 * twinkle);
        slot.x = d[o + PX];
        slot.y = d[o + PY];
        slot.rotation = 0;
        slot.scaleX = size * scalePerRadius;
        slot.scaleY = size * scalePerRadius;
        slot.tint = lerpHex(d[o + PC0], 0xffffff, twinkle * 0.6);
        slot.alpha = envIn * envOut * (0.25 + 0.75 * twinkle);
      }
      i++;
    }
    // Collapse the slots vacated this frame.
    for (let k = n; k < prevShown; k++) {
      const s = this.slots[k];
      s.alpha = 0;
      s.scaleX = 0;
      s.scaleY = 0;
    }
    this.alive = n;
    this.shown = n;
  }
}

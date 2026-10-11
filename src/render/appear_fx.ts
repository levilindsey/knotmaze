// P4 Stage 26, APPEARANCE FX: frontier particles for the Stage 22 reveal
// animation. While a non-instant appear mode is revealing, every advancing
// frontier (reveal tip, or ink dye edge) emits particles from one pooled,
// Float32Array-backed system rendered on a single ParticleContainer above
// the ribbons. Styles (the `afx` URL param / appearFx dropdown):
//   rainbow - saturated full-spectrum spray ahead of the front: gravity + drag, a
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

// 3200: dense dust (380/s x ~0.5s) and heavy burn smoke (110/s x ~1.9s)
// across several frontiers saturated smaller pools, which silently
// capped the requested densities.
export const MAX_FX_PARTICLES = 3200;

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
const K_SMOKE = 4;

// Per-frontier spawn rates, particles/second. Deliberately generous - the
// feature is in its explore-then-tone-down phase; the 600 pool is the
// global ceiling.
const SPARK_RATE = 150;
const STREAK_RATE = 130;
const HALO_RATE = 70;
const FLECK_RATE = 30;
// Dust: DENSE and short-lived per request (doubled again 2026-10-10) -
// a busy glitter cloud that churns instead of lingering.
const DUST_RATE = 380;

// Comet/dust emit AHEAD of the reveal frontier (world units along the
// travel direction): the effect announces the thread, whose own
// appearance fades in behind it (the widened reveal taper in
// revealMaskFor when these styles are active).
const COMET_LEAD = 0.9;
const DUST_LEAD = 0.6;

// Burn: smoldering smoke from the charring zone just BEHIND the tip,
// plus a few weak embers (the thread's own orange->char->normal
// gradient lives in the renderer's applyBurnColors).
// Heavy smoke per request (was 40/s and faint).
const SMOKE_RATE = 110;
const BURN_SPARK_RATE = 36;
// A real soil spray per repeated requests: dense, chunky, and in LIGHT
// earth tones - the original dark browns all but vanished against the
// near-black backdrop.
const ROOTS_RATE = 240;
const SMOKE_DRAG = 0.8;
const SMOKE_RISE = 0.5; // World units/s^2 of buoyancy.

// hue [0,360), s/l [0,1] -> 0xrrggbb (rainbow/comet particle tints).
function hslHex(h: number, s: number, l: number): number {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    (Math.round(f(0) * 255) << 16) |
    (Math.round(f(8) * 255) << 8) |
    Math.round(f(4) * 255)
  );
}

// Spark physics.
const SPARK_GRAVITY = 3.1; // World units/s^2, +y is down.
const SPARK_DRAG = 2.3; // 1/s.
const STREAK_DRAG = 3.2;
const DUST_DRAG = 0.9;

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
  style: Exclude<AppearFxMode, "none"> = "rainbow";
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
  // `path` (optional, comet): a flat [x, y, ...] polyline of `pathPts`
  // points sampled along the HOST THREAD, ordered from the tip BACKWARD
  // over the revealed side - streaks birth along it and orient to its
  // local tangents, so the ensemble follows the thread's curve. The
  // caller may reuse one scratch array across frontiers (consumed
  // synchronously).
  spawnFrontier(
    x: number,
    y: number,
    dx: number,
    dy: number,
    frontSpeed: number,
    dt: number,
    path: Float32Array | null = null,
    pathPts = 0
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
    if (this.style === "rainbow") {
      this.emitSparks(x, y, dx, dy, frontSpeed, dt);
    } else if (this.style === "comet") {
      this.emitComet(x, y, dx, dy, frontSpeed, dt, path, pathPts);
    } else if (this.style === "burn") {
      this.emitBurn(x, y, dx, dy, dt);
    } else if (this.style === "roots") {
      this.emitRoots(x, y, dx, dy, dt);
    } else {
      this.emitDust(x, y, dx, dy, dt);
    }
  }

  // Roots: a subtle earthy dirt spray pushed aside by the probing tip -
  // small dark-brown crumbs tossed backward/outward with a little
  // gravity, deliberately less prominent than the other styles.
  private emitRoots(
    x: number,
    y: number,
    dx: number,
    dy: number,
    dt: number
  ): void {
    const R = this.rng;
    const d = this.data;
    const tw = this.unit;
    let c = this.countFor(ROOTS_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      // Toss mostly sideways/backward (soil parting around the tip).
      const spread = Math.PI * (0.35 + R.next() * 0.5);
      const side = R.next() < 0.5 ? 1 : -1;
      const cs = Math.cos(spread * side);
      const sn = Math.sin(spread * side);
      const sp = 0.35 + R.next() * 0.9;
      // ~1 in 6 is a big clod: slower, heavier-looking.
      const clod = R.next() < 0.16;
      d[o + PX] = x + (R.next() - 0.5) * tw * 0.3;
      d[o + PY] = y + (R.next() - 0.5) * tw * 0.3;
      d[o + PVX] = (dx * cs - dy * sn) * sp * (clod ? 0.6 : 1);
      d[o + PVY] = (dx * sn + dy * cs) * sp * (clod ? 0.6 : 1) + 0.2;
      d[o + PAGE] = 0;
      d[o + PLIFE] = (0.3 + R.next() * 0.4) * (clod ? 1.3 : 1);
      d[o + PSIZE] = tw * (0.16 + R.next() * 0.22) * (clod ? 1.7 : 1);
      d[o + PKIND] = K_SPARK;
      d[o + PROT] = 0;
      const tone = R.next();
      d[o + PC0] = tone < 0.4 ? 0xb88a5c : tone < 0.75 ? 0x9c7450 : 0xc9a77a;
      d[o + PC1] = 0x6a4c33;
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
      // Full-wheel rainbow sparks with only a FAINT blue lean (~25%),
      // and well SATURATED from birth - the old 0.88-lightness birth
      // read as washed-out white confetti.
      const hue =
        R.next() < 0.25 ? 195 + R.next() * 70 : R.next() * 360;
      d[o + PC0] = hslHex(hue, 0.85, 0.72);
      d[o + PC1] = hslHex(hue, 1.0, hot ? 0.58 : 0.5);
    }
  }

  // Burn: smoke puffs rising from the charring zone just behind the
  // tip, plus sparse weak embers.
  private emitBurn(
    x: number,
    y: number,
    dx: number,
    dy: number,
    dt: number
  ): void {
    const R = this.rng;
    const d = this.data;
    const tw = this.unit;
    // Smoke births slightly BEHIND the frontier (the charring zone).
    const sx = x - dx * 0.35;
    const sy = y - dy * 0.35;
    let c = this.countFor(SMOKE_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const ja = R.next() * Math.PI * 2;
      const jr = R.next() * tw * 0.5;
      d[o + PX] = sx + Math.cos(ja) * jr;
      d[o + PY] = sy + Math.sin(ja) * jr;
      d[o + PVX] = (R.next() - 0.5) * 0.25;
      d[o + PVY] = -(0.15 + R.next() * 0.2);
      d[o + PAGE] = 0;
      d[o + PLIFE] = 1.3 + R.next() * 1.1;
      d[o + PSIZE] = tw * (0.55 + R.next() * 0.6);
      d[o + PKIND] = K_SMOKE;
      d[o + PROT] = 0;
      d[o + PPHASE] = 0;
      d[o + PFREQ] = 0;
      d[o + PCURL] = (R.next() - 0.5) * 1.6;
      d[o + PC0] = 0x9a8f96;
      d[o + PC1] = 0x4a434c;
    }
    // Weak embers: the sparks integrator at reduced count/speed/size.
    c = this.countFor(BURN_SPARK_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const spread = (R.next() - 0.5) * 2.2;
      const cs = Math.cos(spread);
      const sn = Math.sin(spread);
      const sp = 0.5 + R.next() * 1.1;
      d[o + PX] = x + (R.next() - 0.5) * tw * 0.3;
      d[o + PY] = y + (R.next() - 0.5) * tw * 0.3;
      d[o + PVX] = (dx * cs - dy * sn) * sp;
      d[o + PVY] = (dx * sn + dy * cs) * sp - 0.3;
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.25 + R.next() * 0.4;
      d[o + PSIZE] = tw * (0.12 + R.next() * 0.16);
      d[o + PKIND] = K_SPARK;
      d[o + PROT] = 0;
      d[o + PC0] = 0xffd9a8;
      d[o + PC1] = R.next() < 0.5 ? 0xff9a3c : 0xd14f1e;
    }
  }

  private emitComet(
    x: number,
    y: number,
    dx: number,
    dy: number,
    frontSpeed: number,
    dt: number,
    path: Float32Array | null,
    pathPts: number
  ): void {
    const R = this.rng;
    const d = this.data;
    const tw = this.unit;
    const rot = Math.atan2(dy, dx);
    // The comet HEAD rides AHEAD of the frontier; its streak tail lies
    // along the thread behind it.
    const hx = x + dx * COMET_LEAD;
    const hy = y + dy * COMET_LEAD;
    // Streak afterglow: LONG strokes laid along the host thread's own
    // polyline (tip backward), each oriented to its local tangent - the
    // straight segments are short against the thread's curvature, so
    // the ensemble reads as one curved tail hugging the thread. Every
    // comet particle carries a FAINT cool tint with a per-particle
    // random hue in the blue..blue-green range (births stay near-white;
    // the hue shows as the particle dies).
    const cometHue = (): number => 160 + R.next() * 65;
    const segs = pathPts - 1;
    let c = this.countFor(STREAK_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const back = 0.25 + R.next() * 0.75;
      const hue = cometHue();
      let px = hx;
      let py = hy;
      let tx = dx;
      let ty = dy;
      let r = rot;
      if (path && segs >= 1) {
        // Random station along the tail (biased toward the head), then
        // the local segment tangent. Path points run tip -> backward, so
        // the travel direction is j+1 -> j.
        const t = R.next() * R.next() * segs;
        const j = Math.min(segs - 1, Math.floor(t));
        const f = t - j;
        const ax = path[j * 2];
        const ay = path[j * 2 + 1];
        const bx = path[(j + 1) * 2];
        const by = path[(j + 1) * 2 + 1];
        px = ax + (bx - ax) * f;
        py = ay + (by - ay) * f;
        const sx = ax - bx;
        const sy = ay - by;
        const sl = Math.sqrt(sx * sx + sy * sy);
        if (sl > 1e-6) {
          tx = sx / sl;
          ty = sy / sl;
          r = Math.atan2(ty, tx);
        }
      }
      // Cross-thread jitter perpendicular to the LOCAL tangent.
      const w = (R.next() - 0.5) * tw * 0.5;
      d[o + PX] = px - ty * w;
      d[o + PY] = py + tx * w;
      // Drift backward ALONG the thread, not along the head's chord.
      d[o + PVX] = -tx * back + (R.next() - 0.5) * 0.2;
      d[o + PVY] = -ty * back + (R.next() - 0.5) * 0.2;
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.5 + R.next() * 0.6;
      d[o + PSIZE] = tw * (2.1 + R.next() * 1.5); // Full streak length.
      d[o + PKIND] = K_STREAK;
      d[o + PROT] = r;
      d[o + PC0] = hslHex(hue, 0.3, 0.93);
      d[o + PC1] = hslHex(hue, 0.7, 0.68);
    }
    // Halo: short-lived big soft glow; overlapping replacements read as a
    // steady luminous head riding the front.
    c = this.countFor(HALO_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      const hue = cometHue();
      d[o + PX] = hx;
      d[o + PY] = hy;
      d[o + PVX] = dx * frontSpeed * 0.9;
      d[o + PVY] = dy * frontSpeed * 0.9;
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.1 + R.next() * 0.08;
      d[o + PSIZE] = tw * (1.6 + R.next() * 0.8);
      d[o + PKIND] = K_HALO;
      d[o + PROT] = 0;
      d[o + PC0] = hslHex(hue, 0.22, 0.95);
      d[o + PC1] = hslHex(hue, 0.55, 0.78);
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
      const hue = cometHue();
      d[o + PX] = hx;
      d[o + PY] = hy;
      d[o + PVX] = (dx * cs - dy * sn) * sp;
      d[o + PVY] = (dx * sn + dy * cs) * sp;
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.25 + R.next() * 0.4;
      d[o + PSIZE] = tw * (0.07 + R.next() * 0.08);
      d[o + PKIND] = K_SPARK;
      d[o + PROT] = 0;
      d[o + PC0] = hslHex(hue, 0.4, 0.9);
      d[o + PC1] = hslHex(hue, 0.85, 0.62);
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
    // Dust scatters AHEAD of the frontier (see COMET_LEAD's comment).
    x += dx * DUST_LEAD;
    y += dy * DUST_LEAD;
    let c = this.countFor(DUST_RATE, dt);
    while (c-- > 0) {
      const i = this.alloc();
      if (i < 0) return;
      const o = i * FP;
      // Hug the thread: tight birth jitter and gentle drift, so the
      // glitter reads as ON the appearing thread rather than a cloud.
      const ja = R.next() * Math.PI * 2;
      const jr = R.next() * tw * 0.25;
      const va = R.next() * Math.PI * 2;
      const sp = 0.05 + R.next() * 0.1;
      d[o + PX] = x + Math.cos(ja) * jr;
      d[o + PY] = y + Math.sin(ja) * jr;
      d[o + PVX] = Math.cos(va) * sp + dx * 0.15;
      d[o + PVY] = Math.sin(va) * sp + dy * 0.15 - 0.18; // Upward bias.
      d[o + PAGE] = 0;
      d[o + PLIFE] = 0.3 + R.next() * 0.45;
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
      } else if (kind === K_SMOKE) {
        // Smolder: curl + buoyant rise, growing and thinning as it ages.
        const cu = d[o + PCURL] * dt;
        const cs = Math.cos(cu);
        const sn = Math.sin(cu);
        const vx = d[o + PVX];
        const vy = d[o + PVY];
        const drag = Math.exp(-SMOKE_DRAG * dt);
        d[o + PVX] = (vx * cs - vy * sn) * drag;
        d[o + PVY] = (vx * sn + vy * cs) * drag - SMOKE_RISE * dt;
        d[o + PX] += d[o + PVX] * dt;
        d[o + PY] += d[o + PVY] * dt;
        const size = d[o + PSIZE] * (0.7 + 1.9 * t);
        slot.x = d[o + PX];
        slot.y = d[o + PY];
        slot.rotation = 0;
        slot.scaleX = size * scalePerRadius;
        slot.scaleY = size * scalePerRadius;
        slot.tint = lerpHex(d[o + PC0], d[o + PC1], Math.min(1, t * 1.2));
        // Billows in over the first moments instead of popping, then
        // thins out as it grows.
        const fin = Math.min(1, t / 0.12);
        slot.alpha = fin * fin * (3 - 2 * fin) * Math.pow(1 - t, 1.6) * 0.45;
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

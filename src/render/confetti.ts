// K140 FINISH CONFETTI, the view: two ParticleContainers (one draw call
// each) over the scene - the RAIN in screen space and the SPRAY in world
// space (it copies the world root's transform every frame it draws, so the
// burst stays on the finish as the camera moves). The motion and the counts
// are render/confetti_model.ts; this file only mirrors pool rows into pixi
// Particles, appear_fx.ts's pattern: slot i renders pool row i, dead slots
// collapse to scale 0, and once both pools drain the containers hide and
// tick() is a single early return - no per-frame work, and `active` (which
// main.ts's sceneAnimating() reads) is false again.
//
// Both containers sit ABOVE the world root on the stage (the rain topmost)
// and take no pointer events; the win banner and the HUD are DOM over the
// canvas, so the pieces never block input or hide them.
//
// The paper texture is built once and kept for the page's lifetime (the
// PALETTE_CACHE lore: never destroy a texture retained render state may
// still reference).

import { Particle, ParticleContainer, Texture, type Container } from "pixi.js";
import {
  ConfettiPool,
  F,
  X,
  Y,
  RAIN_CAP,
  SPRAY_CAP,
  pieceLook,
  spawnRain,
  spawnSpray,
  stepRain,
  stepSpray,
  type ConfettiPlan,
  type PieceLook,
} from "./confetti_model";

const TEX_W = 32;
const TEX_H = 16;
let PAPER: Texture | null = null;

function paperTexture(): Texture {
  if (PAPER) return PAPER;
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  // A one-texel clear border lets the bilinear edge antialias the piece.
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(1, 1, TEX_W - 2, TEX_H - 2, 3);
  } else {
    ctx.rect(1, 1, TEX_W - 2, TEX_H - 2);
  }
  ctx.fill();
  PAPER = Texture.from(canvas);
  return PAPER;
}

// The longest frame step the pieces take: after a stall (a hidden tab's
// first frame back) they resume instead of jumping.
const MAX_DT = 0.1;

class PieceLayer {
  readonly container: ParticleContainer;
  readonly pool: ConfettiPool;
  private readonly spray: boolean;
  private slots: Particle[] = [];
  private shown = 0;
  private look: PieceLook = { alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };

  constructor(capacity: number, spray: boolean) {
    this.spray = spray;
    const tex = paperTexture();
    this.pool = new ConfettiPool(capacity);
    this.container = new ParticleContainer({
      texture: tex,
      dynamicProperties: {
        vertex: true,
        position: true,
        rotation: true,
        color: true,
      },
    });
    this.container.eventMode = "none";
    this.container.visible = false;
    for (let i = 0; i < capacity; i++) {
      this.slots.push(
        new Particle({
          texture: tex,
          anchorX: 0.5,
          anchorY: 0.5,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
        })
      );
    }
  }

  // After a spawn: the container draws exactly the live rows' slots.
  attach(): void {
    const kids = this.container.particleChildren;
    kids.length = 0;
    for (let i = 0; i < this.pool.alive; i++) kids.push(this.slots[i]);
    this.container.update();
    this.container.visible = this.pool.alive > 0;
  }

  clear(): void {
    this.pool.clear();
    this.sync();
  }

  // Mirror the pool into the slots; hide (and detach) once it is empty.
  sync(): void {
    const d = this.pool.data;
    const n = this.pool.alive;
    const look = this.look;
    for (let i = 0; i < n; i++) {
      const p = this.slots[i];
      pieceLook(d, i, this.spray, look);
      p.x = d[i * F + X];
      p.y = d[i * F + Y];
      p.alpha = look.alpha;
      p.scaleX = look.long / TEX_W;
      p.scaleY = look.short / TEX_H;
      p.rotation = look.rotation;
      p.tint = look.tint;
    }
    for (let i = n; i < this.shown; i++) {
      const p = this.slots[i];
      p.alpha = 0;
      p.scaleX = 0;
      p.scaleY = 0;
    }
    this.shown = n;
    if (n === 0 && this.container.visible) {
      this.container.visible = false;
      this.container.particleChildren.length = 0;
      this.container.update();
    }
  }
}

export class ConfettiLayer {
  private readonly rain = new PieceLayer(RAIN_CAP, false);
  private readonly spray = new PieceLayer(SPRAY_CAP, true);
  // Probe counters: bursts thrown, and frames drawn with pieces alive.
  readonly stats = { bursts: 0, frames: 0 };

  // Add these to the stage above the world root, in this order.
  get sprayContainer(): ParticleContainer {
    return this.spray.container;
  }
  get rainContainer(): ParticleContainer {
    return this.rain.container;
  }

  get rainAlive(): number {
    return this.rain.pool.alive;
  }
  get sprayAlive(): number {
    return this.spray.pool.alive;
  }
  // Pieces alive (rain pieces waiting for their release count): while true,
  // the scene is animating.
  get active(): boolean {
    return this.rain.pool.alive > 0 || this.spray.pool.alive > 0;
  }

  // Throw a finish's confetti: plan.rain over a width x height screen, and
  // plan.spray around the world point (cx, cy) in `unit`s (sprayUnit).
  burst(
    plan: ConfettiPlan,
    width: number,
    height: number,
    cx: number,
    cy: number,
    unit: number,
    rand: () => number = Math.random
  ): void {
    if (plan.rain > 0) {
      spawnRain(this.rain.pool, plan.rain, width, height, rand);
      this.rain.attach();
    }
    if (plan.spray > 0 && unit > 0) {
      spawnSpray(this.spray.pool, plan.spray, cx, cy, unit, plan.slow, rand);
      this.spray.attach();
    }
    if (plan.rain > 0 || plan.spray > 0) this.stats.bursts++;
  }

  // Drop every piece (a rebuild, the setting turned off).
  clear(): void {
    this.rain.clear();
    this.spray.clear();
  }

  // One frame: step and mirror the live pieces; `world` is the root whose
  // transform the spray copies. A single early return when nothing lives.
  tick(dt: number, height: number, world: Container): void {
    if (!this.active) return;
    const step = Math.min(Math.max(dt, 0), MAX_DT);
    this.stats.frames++;
    if (this.rain.pool.alive > 0) {
      stepRain(this.rain.pool, step, height);
      this.rain.sync();
    }
    if (this.spray.pool.alive > 0) {
      stepSpray(this.spray.pool, step);
      this.spray.sync();
      const c = this.spray.container;
      c.position.copyFrom(world.position);
      c.scale.copyFrom(world.scale);
      c.pivot.copyFrom(world.pivot);
      c.rotation = world.rotation;
    }
  }
}

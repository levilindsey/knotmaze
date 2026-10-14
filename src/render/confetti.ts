// K140 FINISH CONFETTI, the view: two ParticleContainers (one draw call
// each) over the scene - the RAIN in screen space and the SPRAY in world
// space (it copies the world root's transform every frame it draws, so the
// burst stays on the finish as the camera moves). The motion and the counts
// are render/confetti_model.ts (ConfettiSim); this file only mirrors pool
// rows into pixi Particles, appear_fx.ts's pattern: slot i renders pool row
// i, dead slots collapse to scale 0, and once both pools drain the
// containers hide and tick() is a single early return - no per-frame work,
// and `active` (which main.ts's sceneAnimating() reads) is false again.
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
  ConfettiSim,
  F,
  X,
  Y,
  pieceLook,
  type ConfettiPlan,
  type ConfettiPool,
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

// One pool's particles: slot i draws pool row i.
class PieceLayer {
  readonly container: ParticleContainer;
  private readonly pool: ConfettiPool;
  private readonly spray: boolean;
  private slots: Particle[] = [];
  private shown = 0;
  private look: PieceLook = { alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };

  constructor(pool: ConfettiPool, spray: boolean) {
    this.pool = pool;
    this.spray = spray;
    const tex = paperTexture();
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
    for (let i = 0; i < pool.capacity; i++) {
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
    const show = n > 0;
    if (this.container.visible !== show) {
      this.container.visible = show;
      if (!show) {
        this.container.particleChildren.length = 0;
        this.container.update();
      }
    }
  }
}

export class ConfettiLayer {
  readonly sim = new ConfettiSim();
  private readonly rain = new PieceLayer(this.sim.rain, false);
  private readonly spray = new PieceLayer(this.sim.spray, true);
  // Probe counters: bursts thrown, and frames stepped with pieces alive.
  readonly stats = { bursts: 0, frames: 0 };

  // Add these to the stage above the world root, in this order.
  get sprayContainer(): ParticleContainer {
    return this.spray.container;
  }
  get rainContainer(): ParticleContainer {
    return this.rain.container;
  }

  // Pieces alive (rain pieces waiting for their release count): while true,
  // the scene is animating.
  get active(): boolean {
    return this.sim.active;
  }

  // Throw a finish's confetti (ConfettiSim.burst); `world` is the root
  // whose transform the spray copies.
  burst(
    plan: ConfettiPlan,
    width: number,
    height: number,
    cx: number,
    cy: number,
    unit: number,
    world: Container,
    rand: () => number = Math.random
  ): void {
    if (!this.sim.burst(plan, width, height, cx, cy, unit, rand)) return;
    this.stats.bursts++;
    this.rain.attach();
    this.spray.attach();
    this.follow(world);
  }

  // Drop every piece (a rebuild, the setting turned off).
  clear(): void {
    this.sim.clear();
    this.rain.sync();
    this.spray.sync();
  }

  // One frame: step and mirror the live pieces. A single early return when
  // nothing lives.
  tick(dt: number, height: number, world: Container): void {
    if (!this.sim.active) return;
    this.stats.frames++;
    this.sim.step(dt, height);
    this.rain.sync();
    this.spray.sync();
    this.follow(world);
  }

  private follow(world: Container): void {
    const c = this.spray.container;
    if (!c.visible) return;
    c.position.copyFrom(world.position);
    c.scale.copyFrom(world.scale);
    c.pivot.copyFrom(world.pivot);
    c.rotation = world.rotation;
  }
}

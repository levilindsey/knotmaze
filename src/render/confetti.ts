// K140 FINISH CONFETTI, the view: ParticleContainers (one draw call each)
// over the scene - the RAIN and K336's side CANNONS and STREAMERS in screen
// space and the SPRAY in world space (it copies the world root's transform
// every frame it draws, so the burst stays on the finish as the camera
// moves). The motion and the counts are render/confetti_model.ts
// (ConfettiSim); this file only mirrors pool rows into pixi Particles,
// appear_fx.ts's pattern: slot i renders pool row i (a streamer row takes
// STREAMER_SEGS slots, one a body segment), dead slots collapse to scale 0,
// and once every pool drains the containers hide and tick() is a single
// early return - no per-frame work, and `active` (the frame loop's OVERLAY
// poll, K6-1) is false again. Every container draws the same paper texture
// with pixi's particle program, so the streamers add no shader (K307).
//
// Every container sits ABOVE the world root on the stage, in the order
// spray, streamers, cannons, rain (topmost), and takes no pointer events;
// the win banner and the HUD are DOM over the canvas, so the pieces never
// block input or hide them. main.ts adds the spray and the rain; the
// streamers' and the cannons' containers follow the rain onto its parent,
// just below it (the rain's "added" event), so a layer K578's still-maze
// cache puts under the confetti stays under all of it.
//
// The paper texture is built once and kept for the page's lifetime (the
// PALETTE_CACHE lore: never destroy a texture retained render state may
// still reference).

import { Particle, ParticleContainer, Texture, type Container } from "pixi.js";
import {
  ConfettiSim,
  F,
  STREAMER_SEGS,
  X,
  Y,
  pieceLook,
  streamerSegLook,
  type ConfettiPlan,
  type ConfettiPool,
  type PieceLook,
  type SegLook,
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

// A container of paper pieces: one draw call, no pointer events, hidden
// until a burst.
function pieceContainer(): ParticleContainer {
  const c = new ParticleContainer({
    texture: paperTexture(),
    dynamicProperties: {
      vertex: true,
      position: true,
      rotation: true,
      color: true,
    },
  });
  c.eventMode = "none";
  c.visible = false;
  return c;
}

// `n` collapsed particle slots.
function pieceSlots(n: number): Particle[] {
  const tex = paperTexture();
  const slots: Particle[] = [];
  for (let i = 0; i < n; i++) {
    slots.push(
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
  return slots;
}

// Show a container while it has pieces; hidden, it detaches them all.
function showPieces(c: ParticleContainer, show: boolean): void {
  if (c.visible === show) return;
  c.visible = show;
  if (!show) {
    c.particleChildren.length = 0;
    c.update();
  }
}

// One pool's particles: slot i draws pool row i.
class PieceLayer {
  readonly container = pieceContainer();
  private readonly pool: ConfettiPool;
  private readonly spray: boolean;
  private readonly slots: Particle[];
  private shown = 0;
  private look: PieceLook = { alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };

  constructor(pool: ConfettiPool, spray: boolean) {
    this.pool = pool;
    this.spray = spray;
    this.slots = pieceSlots(pool.capacity);
  }

  // After a spawn: the container draws exactly the live rows' slots.
  attach(shine: number): void {
    const kids = this.container.particleChildren;
    kids.length = 0;
    for (let i = 0; i < this.pool.alive; i++) kids.push(this.slots[i]);
    this.container.update();
    this.sync(shine);
  }

  // Mirror the pool into the slots; hide (and detach) once it is empty.
  // `shine` is the burst's specular strength (K337, ConfettiSim.shine).
  sync(shine: number): void {
    const d = this.pool.data;
    const n = this.pool.alive;
    const look = this.look;
    for (let i = 0; i < n; i++) {
      const p = this.slots[i];
      pieceLook(d, i, this.spray, look, shine);
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
    showPieces(this.container, n > 0);
  }
}

// K336: the streamers' particles. Slot i * STREAMER_SEGS + j draws body
// segment j of streamer row i (streamerSegLook).
class StreamerLayer {
  readonly container = pieceContainer();
  private readonly pool: ConfettiPool;
  private readonly slots: Particle[];
  private shown = 0; // Slots written last frame.
  private look: SegLook = {
    x: 0,
    y: 0,
    alpha: 0,
    long: 0,
    short: 0,
    rotation: 0,
    tint: 0,
  };

  constructor(pool: ConfettiPool) {
    this.pool = pool;
    this.slots = pieceSlots(pool.capacity * STREAMER_SEGS);
  }

  // After a spawn: the container draws exactly the live rows' slots.
  attach(shine: number): void {
    const kids = this.container.particleChildren;
    kids.length = 0;
    const n = this.pool.alive * STREAMER_SEGS;
    for (let k = 0; k < n; k++) kids.push(this.slots[k]);
    this.container.update();
    this.sync(shine);
  }

  // Mirror the pool into the slots; hide (and detach) once it is empty.
  sync(shine: number): void {
    const d = this.pool.data;
    const rows = this.pool.alive;
    const look = this.look;
    let k = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < STREAMER_SEGS; j++, k++) {
        const p = this.slots[k];
        streamerSegLook(d, i, j, look, shine);
        p.x = look.x;
        p.y = look.y;
        p.alpha = look.alpha;
        p.scaleX = look.long / TEX_W;
        p.scaleY = look.short / TEX_H;
        p.rotation = look.rotation;
        p.tint = look.tint;
      }
    }
    for (let m = k; m < this.shown; m++) {
      const p = this.slots[m];
      p.alpha = 0;
      p.scaleX = 0;
      p.scaleY = 0;
    }
    this.shown = k;
    showPieces(this.container, rows > 0);
  }
}

export class ConfettiLayer {
  readonly sim = new ConfettiSim();
  private readonly rain = new PieceLayer(this.sim.rain, false);
  private readonly spray = new PieceLayer(this.sim.spray, true);
  // K336: the side cannons and their streamers, screen space like the rain.
  private readonly cannon = new PieceLayer(this.sim.cannon, false);
  private readonly streamers = new StreamerLayer(this.sim.streamers);
  // Probe counters: bursts thrown, and frames stepped with pieces alive.
  readonly stats = { bursts: 0, frames: 0 };

  constructor() {
    // Pixi emits "added" on a child after it joins its parent's children:
    // the streamers, then the cannons, join just below the rain.
    this.rain.container.on("added", (parent: Container) => {
      const at = parent.getChildIndex(this.rain.container);
      parent.addChildAt(this.streamers.container, at);
      parent.addChildAt(this.cannon.container, at + 1);
    });
  }

  // Add these to the stage above the world root, in this order (the
  // streamers' and the cannons' containers then join just below the rain).
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
    this.rain.attach(this.sim.shine);
    this.spray.attach(this.sim.shine);
    this.cannon.attach(this.sim.shine);
    this.streamers.attach(this.sim.shine);
    this.follow(world);
  }

  // Drop every piece (a rebuild, the setting turned off).
  clear(): void {
    this.sim.clear();
    this.rain.sync(0);
    this.spray.sync(0);
    this.cannon.sync(0);
    this.streamers.sync(0);
  }

  // One frame: step and mirror the live pieces. A single early return when
  // nothing lives.
  tick(dt: number, height: number, world: Container): void {
    if (!this.sim.active) return;
    this.stats.frames++;
    this.sim.step(dt, height);
    this.rain.sync(this.sim.shine);
    this.spray.sync(this.sim.shine);
    this.cannon.sync(this.sim.shine);
    this.streamers.sync(this.sim.shine);
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

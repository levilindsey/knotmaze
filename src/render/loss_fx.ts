// K546 stage 3: the loss effects' view — mirrors loss_fx_model.ts's
// pools into two Graphics, one in world space (the contact burst and its
// flash, following the world root like the win spray) and one in screen
// space (the ash fall). Counts are small and lifetimes bounded, so a
// redrawn Graphics per frame is the whole cost; once every pool drains
// the containers hide and tick() is a single early return, and `active`
// (the frame loop's OVERLAY poll) clears.

import { Container, Graphics } from "pixi.js";
import {
  AshPool,
  BurstPool,
  LOSS_COLORS,
  flashAlpha,
  lossPlan,
  type LossKind,
} from "./loss_fx_model";

// The screen fall starts this long after the contact (the beat's +0.35
// mark: contact first, screen second).
export const ASH_DELAY_S = 0.35;

export class LossFxLayer {
  private readonly burstPool = new BurstPool();
  private readonly ashPool = new AshPool();
  private readonly worldGfx = new Graphics();
  private readonly screenGfx = new Graphics();
  // The burst's world anchor (the meeting point) and its flash clock.
  private bx = 0;
  private by = 0;
  private bUnit = 1;
  private burstAge = -1;
  private burstColors: readonly number[] = LOSS_COLORS.mino;
  // A scheduled ash fall (its plan waits out ASH_DELAY_S).
  private ashIn = -1;
  private ashKind: LossKind = "mino";
  private ashCount = 0;
  readonly stats = { ignitions: 0, frames: 0 };

  // World-space pieces (burst + flash): add above the maze, below the
  // screen pieces; follows the world root's transform each tick.
  get worldContainer(): Graphics {
    return this.worldGfx;
  }
  // Screen-space pieces (ash): add above everything but the DOM.
  get screenContainer(): Graphics {
    return this.screenGfx;
  }

  get active(): boolean {
    return this.burstPool.n > 0 || this.ashPool.n > 0 || this.ashIn >= 0 || this.burstAge >= 0;
  }

  // One loss, at its contact: the burst ignites at the world meeting
  // point (x, y; unit = the marker radius there) and the ash fall is
  // scheduled. Amount 0 keeps the ring only (the plan is empty).
  ignite(
    x: number,
    y: number,
    unit: number,
    kind: LossKind,
    amount: number,
    reduced: boolean,
    screenW: number,
    screenH: number,
  ): void {
    const plan = lossPlan(amount, reduced, screenW, screenH);
    if (plan.burst > 0) {
      this.bx = x;
      this.by = y;
      this.bUnit = Math.max(1, unit);
      this.burstColors = LOSS_COLORS[kind];
      this.burstAge = 0;
      this.burstPool.spawn(x, y, this.bUnit, plan.burst, this.burstColors.length, Math.random, plan.speedMul);
    }
    if (plan.ash > 0) {
      this.ashIn = ASH_DELAY_S;
      this.ashKind = kind;
      this.ashCount = plan.ash;
    }
    if (plan.burst > 0 || plan.ash > 0) this.stats.ignitions++;
  }

  // Drop every piece (a rebuild).
  clear(): void {
    this.burstPool.n = 0;
    this.ashPool.n = 0;
    this.ashIn = -1;
    this.burstAge = -1;
    this.worldGfx.visible = false;
    this.screenGfx.visible = false;
  }

  tick(dt: number, screenW: number, screenH: number, world: Container): void {
    if (!this.active) return;
    this.stats.frames++;
    if (this.ashIn >= 0) {
      this.ashIn -= dt;
      if (this.ashIn < 0) {
        const colors = LOSS_COLORS[this.ashKind];
        this.ashPool.spawn(screenW, screenH, this.ashCount, colors.length, Math.random);
      }
    }
    // World pieces.
    const wg = this.worldGfx;
    if (this.burstAge >= 0) this.burstAge += dt;
    this.burstPool.step(dt, this.bUnit);
    const flash = flashAlpha(this.burstAge);
    if (this.burstPool.n === 0 && flash <= 0) this.burstAge = -1;
    wg.clear();
    if (this.burstAge >= 0 || this.burstPool.n > 0) {
      wg.visible = true;
      wg.position.copyFrom(world.position);
      wg.scale.copyFrom(world.scale);
      wg.pivot.copyFrom(world.pivot);
      wg.rotation = world.rotation;
      if (flash > 0) {
        wg.circle(this.bx, this.by, this.bUnit * 1.5);
        wg.fill({ color: 0xffffff, alpha: 0.85 * flash });
      }
      const look = { x: 0, y: 0, r: 0, alpha: 0, color: 0 };
      for (let i = 0; i < this.burstPool.n; i++) {
        this.burstPool.look(i, look);
        if (look.alpha <= 0) continue;
        wg.circle(look.x, look.y, look.r);
        wg.fill({ color: this.burstColors[look.color] ?? 0xffffff, alpha: look.alpha });
      }
    } else {
      wg.visible = false;
    }
    // Screen pieces.
    const sg = this.screenGfx;
    this.ashPool.step(dt);
    sg.clear();
    if (this.ashPool.n > 0) {
      sg.visible = true;
      const colors = LOSS_COLORS[this.ashKind];
      const look = { x: 0, y: 0, r: 0, alpha: 0, color: 0 };
      for (let i = 0; i < this.ashPool.n; i++) {
        this.ashPool.look(i, look);
        if (look.alpha <= 0) continue;
        sg.circle(look.x, look.y, look.r);
        sg.fill({ color: colors[look.color] ?? 0xffffff, alpha: look.alpha * 0.8 });
      }
    } else {
      sg.visible = false;
    }
  }
}

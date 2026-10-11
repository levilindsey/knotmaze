// P4 Stage 22, the APPEARANCE ANIMATOR: the live clock + queries over a
// pure reveal plan (core/reveal_plan). RibbonRenderer consumes it: interval
// modes (trace/bloom/draw) hand per-chain ctrl intervals to the mask pass;
// ink mode hands the dye origin + radius and the renderer evaluates the
// world-distance field per sample (positions move while settling - that is
// the organic look, so ink is deliberately evaluated against LIVE samples).

import { createNoise2D } from "simplex-noise";
import type { ParticleSystem } from "../physics/particle_system";
import type { WalkGraph } from "../core/walk_graph";
import {
  buildRevealPlan,
  intervalsAt,
  tipsAt,
} from "../core/reveal_plan";
import type {
  AppearSequence,
  RevealInterval,
  RevealPlan,
  RevealTip,
} from "../core/reveal_plan";
import { SeededRNG } from "../util/random";

// Simplex perturbation of the ink dye edge (world units of wobble; spatial
// frequency in 1/world units).
const INK_NOISE_AMP = 1.15;
const INK_NOISE_FREQ = 0.42;

export class RevealAnimator {
  readonly mode: Exclude<AppearSequence, "instant">;
  // Live speed multiplier (the appearSpeed slider; main.ts syncs it every
  // tick like moveSpeed/cuspRadius).
  speed = 1;
  done = false;

  private plan: RevealPlan;
  private t = 0; // Speed-scaled clock, seconds.
  private inkNoise: ((x: number, y: number) => number) | null = null;
  private inkChainDone: boolean[] = [];

  constructor(
    mode: Exclude<AppearSequence, "instant">,
    walk: WalkGraph | null,
    ps: ParticleSystem,
    seed: number
  ) {
    const chains = ps.chains.map((chain, i) => {
      const brk = ps.chainBreakAfter[i];
      let worldLen = 0;
      for (let k = 0; k < chain.length; k++) {
        if (k === brk) continue; // Open seam carries no material.
        const a = chain[k];
        const b = chain[(k + 1) % chain.length];
        worldLen += Math.hypot(
          ps.positions[b * 2] - ps.positions[a * 2],
          ps.positions[b * 2 + 1] - ps.positions[a * 2 + 1]
        );
      }
      return { len: chain.length, closed: brk < 0, worldLen };
    });
    const scratch = new Float32Array(2);
    this.plan = buildRevealPlan(mode, walk, chains, seed, (chain, ctrl) => {
      const len = ps.chains[chain].length;
      ps.pointOnChain(chain, ((ctrl % len) + len) % len, scratch, 0);
      return [scratch[0], scratch[1]] as const;
    });
    this.mode = this.plan.mode;
    if (this.mode === "ink") {
      const rng = new SeededRNG((seed ^ 0x1e4b) >>> 0);
      this.inkNoise = createNoise2D(() => rng.next());
      this.inkChainDone = ps.chains.map(() => false);
    }
  }

  // Advance the reveal clock by WALL dt (main.ts calls this in every
  // ticker branch - awake, asleep, paused - while incomplete).
  tick(dt: number): void {
    if (this.done) return;
    this.t += dt * this.speed;
    if (this.t >= this.plan.duration) this.done = true;
  }

  // Diagnostics (probe scripting / the __knotReveal hook).
  get clock(): number {
    return this.t;
  }

  get planDuration(): number {
    return this.plan.duration;
  }

  intervalsFor(chain: number): RevealInterval[] {
    return intervalsAt(this.plan, chain, this.t);
  }

  tips(): RevealTip[] {
    return this.mode === "ink" ? [] : tipsAt(this.plan, this.t);
  }

  // --- Ink mode ---

  get inkOrigin(): { chain: number; ctrl: number } {
    return this.plan.origin;
  }

  get inkRadius(): number {
    return this.t * this.plan.inkSpeed;
  }

  // World units/s of the dye front, live speed applied (frontier FX).
  get inkRate(): number {
    return this.plan.inkSpeed * this.speed;
  }

  // Signed wobble of the dye edge at a world point.
  inkPerturb(x: number, y: number): number {
    return this.inkNoise
      ? INK_NOISE_AMP * this.inkNoise(x * INK_NOISE_FREQ, y * INK_NOISE_FREQ)
      : 0;
  }

  // A chain whose every sample has reached full width LATCHES revealed
  // (live positions keep moving; the dye never retreats). All latched =
  // done.
  latchInkChain(chain: number): void {
    if (this.mode !== "ink" || this.inkChainDone[chain]) return;
    this.inkChainDone[chain] = true;
    if (this.inkChainDone.every(Boolean)) this.done = true;
  }

  inkChainLatched(chain: number): boolean {
    return this.inkChainDone[chain];
  }
}

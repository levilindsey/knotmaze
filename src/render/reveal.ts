// P4 Stage 22, the APPEARANCE ANIMATOR: the live clock + queries over a
// pure reveal plan (core/reveal_plan). RibbonRenderer consumes it: since
// G2 the renderer reads the plan's SOURCES directly (per-pixel ignition
// times in the shaders, mirrored on the CPU for the width masks); ink mode
// hands the dye origin + speed, and the renderer fixes every control's
// ignition time from the REVEAL-START positions (G2: the dye no longer
// re-reads settling positions, so ink is exact and stateless) and tells the
// animator its exact duration (setDuration).

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

  // The plan itself (G2: the renderer builds its per-pixel source table
  // from it at reveal start).
  get planData(): RevealPlan {
    return this.plan;
  }

  // Exact duration (anim seconds) once the renderer knows it - ink: the
  // latest control ignition plus the dye taper (the plan only carries a
  // safety cap there).
  setDuration(d: number): void {
    this.plan = { ...this.plan, duration: d };
    if (this.t >= d) this.done = true;
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
}

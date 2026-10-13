// The SLEEP GATE: when the simulation may stop stepping. main.ts asks it
// every frame (live physics: the knot sleeps until input wakes it), and the
// physics-off load and visible settle freeze where it trips.
//
// The knot sleeps once its frames have stayed QUIET for QUIET_WINDOW
// consecutive SIMULATED seconds. A frame is quiet when the hero settle is
// complete, nothing is grabbed, the frame's largest per-substep particle
// displacement is under QUIET_EPS, and no rider stands (main.ts adds the
// temperature rule: agitation holds the knot awake).
//
// K63 (2026-10-12): the window is SIM TIME. It used to be 45 still FRAMES,
// which made the gate frame-rate dependent: pixi caps a frame at 0.1 s, so
// on any device at 10 fps or less (every real settle at the default size -
// physics-bound at 5-10 fps, desktop included) 45 frames were 4.5 sim-s,
// while at 60 fps they were 0.75 s. Every design slept at exactly sim 7.0
// (settleComplete at 2.5 s + 45 x 0.1 s), although the motion is under
// QUIET_EPS by ~0.6-1.2 s and at its rest floor (~2-3e-3) by ~2.1 s. The
// window length comes from harness sweeps that compared each frozen state
// with a reference run that kept stepping - see CLAUDE.md (physics lore).
import type { ParticleSystem } from "./particle_system";

// Max per-substep displacement (world units) a quiet frame allows. (Briefly
// 2.2e-2 while the anti-riding floor held standing ~1.8e-2 corrections at
// shallow crossings; crossing coverage removed those - the rest floor is
// ~2e-3 again.)
export const QUIET_EPS = 1.5e-2;

// Consecutive quiet simulated seconds before the knot sleeps.
export const QUIET_WINDOW = 0.75;

// The physics half of the quiet test. Sliding crossings leave a sub-pixel
// oscillation floor at rest, so the threshold sits above it; deliberate
// motion (grabs) is guarded explicitly rather than by amplitude. Never
// freeze on an unrenderable overlap: a standing hard violation of the
// anti-riding floor (a rider) keeps the sim awake while the work gate
// resolves it.
export function physicsQuiet(ps: ParticleSystem): boolean {
  return (
    ps.settleComplete &&
    ps.grabbedParticle < 0 &&
    ps.maxMove < QUIET_EPS &&
    ps.ridersPending === 0
  );
}

export class SleepGate {
  private still = 0;

  // Simulated seconds of the current quiet run.
  get stillTime(): number {
    return this.still;
  }

  reset(): void {
    this.still = 0;
  }

  // One frame: was it quiet, and how many simulated seconds did it step?
  // (A frame that ran no substep adds nothing.) True once the quiet run
  // spans QUIET_WINDOW. The tolerance absorbs float sums: 45 x 1/60 is
  // 0.7499999999999999.
  frame(quiet: boolean, simDt: number): boolean {
    if (!quiet) {
      this.still = 0;
      return false;
    }
    this.still += simDt;
    return this.still >= QUIET_WINDOW - 1e-9;
  }
}

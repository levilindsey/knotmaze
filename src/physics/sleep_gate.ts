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
// while at 60 fps (and in the physics-off load's 1/60 steps) they were
// 0.75 s. Nearly every design slept at exactly sim 7.0: the quiet run
// starts at settleComplete (2.5 s), then 45 x 0.1 s.
//
// Why not 0.75 s everywhere: some designs are NOT at rest at 2.5 s. A
// local spot (a bridge at a joint, an open tail, a kink's neighborhood)
// sits near an unstable equilibrium after the settle ramp and snaps
// through to a new rest 3.5-5 s in - slowly, mostly UNDER QUIET_EPS, so no
// window sees it start. A short window freezes such a knot before or
// during its snap: 0.1-0.17 world from where it comes to rest. Harness
// sweeps (.claude/probes/K63: ~250 fresh settles - seeds x default, fat,
// tw .64, every shape at its daily size, K46 recipes incl. its late
// movers - and 130 gestures), each frozen state compared with a reference
// that kept stepping: at the worst late settlers the frozen state stays
// > 0.05 world off up to W 2.0 and within 0.033 from W 2.25 on; the
// longest quiet stretch that ended in loudness was 1.76 s (one design in
// ~1300); after gestures nothing was > 0.05 off from W 1.0 on. 2.5 s = the
// shortest clean window plus a margin. Sleep at ~5.0 sim-s on every
// device (was 7.0 at <= 10 fps, 3.25 at 60 fps and in physics-off loads).
// NOT covered by any window: a low-gridAlign knot can creep under
// QUIET_EPS for tens of seconds (ga=0: ~1.5 world over ~50 s), and both
// gates freeze it mid-creep.
import type { ParticleSystem } from "./particle_system";

// Max per-substep displacement (world units) a quiet frame allows. (Briefly
// 2.2e-2 while the anti-riding floor held standing ~1.8e-2 corrections at
// shallow crossings; crossing coverage removed those - the rest floor is
// ~2e-3 again.)
export const QUIET_EPS = 1.5e-2;

// Consecutive quiet simulated seconds before the knot sleeps (see above).
export const QUIET_WINDOW = 2.5;

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

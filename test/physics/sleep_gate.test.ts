// K63: the sleep gate counts SIMULATED time, not frames. (It counted 45
// frames: 0.75 sim-s at 60 fps but 4.5 sim-s at 10 fps or less, where pixi
// caps a frame at 0.1 s - so every real-size design slept at sim 7.0.)
import { describe, it, expect } from "vitest";
import {
  QUIET_EPS,
  QUIET_WINDOW,
  SleepGate,
  physicsQuiet,
} from "../../src/physics/sleep_gate";
import type { ParticleSystem } from "../../src/physics/particle_system";

// Sim time at which a run of quiet frames of `dt` trips the gate.
function tripTime(dt: number): number {
  const gate = new SleepGate();
  let t = 0;
  for (let i = 0; i < 100000; i++) {
    t += dt;
    if (gate.frame(true, dt)) return t;
  }
  return Infinity;
}

describe("sleep gate", () => {
  it("trips after the same simulated window at any frame rate", () => {
    for (const dt of [1 / 240, 1 / 144, 1 / 120, 1 / 60, 1 / 30, 0.1, 0.25]) {
      const t = tripTime(dt);
      expect(t).toBeGreaterThanOrEqual(QUIET_WINDOW - 1e-9);
      expect(t).toBeLessThan(QUIET_WINDOW + dt + 1e-9);
    }
    // 60 fps: exactly QUIET_WINDOW x 60 frames (sums of 1/60 land just
    // under the window - 45 of them are 0.7499999999999999 - and the
    // tolerance must absorb that).
    const gate = new SleepGate();
    let frames = 0;
    while (!gate.frame(true, 1 / 60)) frames++;
    expect(frames + 1).toBe(Math.round(QUIET_WINDOW * 60));
  });

  it("restarts the window on any loud frame", () => {
    const gate = new SleepGate();
    for (let i = 0; i < 40; i++) expect(gate.frame(true, 1 / 60)).toBe(false);
    expect(gate.frame(false, 1 / 60)).toBe(false);
    expect(gate.stillTime).toBe(0);
    let t = 0;
    while (!gate.frame(true, 0.1)) t += 0.1;
    expect(t + 0.1).toBeGreaterThanOrEqual(QUIET_WINDOW - 1e-9);
  });

  it("does not advance on frames that ran no substep", () => {
    const gate = new SleepGate();
    for (let i = 0; i < 1000; i++) expect(gate.frame(true, 0)).toBe(false);
    expect(gate.stillTime).toBe(0);
    gate.frame(true, 0.5);
    expect(gate.frame(false, 0)).toBe(false);
    expect(gate.stillTime).toBe(0);
  });

  it("reset() starts over", () => {
    const gate = new SleepGate();
    gate.frame(true, QUIET_WINDOW / 2);
    gate.reset();
    expect(gate.frame(true, QUIET_WINDOW / 2)).toBe(false);
  });

  it("quiet = settled, ungrabbed, under QUIET_EPS, no rider", () => {
    const base = {
      settleComplete: true,
      grabbedParticle: -1,
      maxMove: QUIET_EPS * 0.5,
      ridersPending: 0,
    };
    const q = (o: Partial<typeof base>): boolean =>
      physicsQuiet({ ...base, ...o } as unknown as ParticleSystem);
    expect(q({})).toBe(true);
    expect(q({ settleComplete: false })).toBe(false);
    expect(q({ grabbedParticle: 12 })).toBe(false);
    expect(q({ maxMove: QUIET_EPS })).toBe(false);
    expect(q({ ridersPending: 1 })).toBe(false);
  });
});

// Regression: the knot must fall asleep again after user interaction.
// P3.22's depth model removed the old exemption lens's parasitic
// tangential weld - which had also been the only dissipation for the PBD
// constraint standoff - and a play session left the knot jiggling
// forever (mv ~5e-2, never below the stick gate). Graduated contact
// friction (P3.23) restored the dissipation without gesture stickiness.
//
// Two tiers, because the guarantees differ by wound depth:
// - A REALISTIC drag session must fully re-sleep. (Pointer gestures
//   move the grab point continuously; drag radius 1.2 approximates a
//   vigorous real gesture.)
// - A PATHOLOGICAL wound (teleporting dragTo jumps at radius 2.5,
//   harsher than any real pointer input) can leave topologically stuck
//   sub-width tangles at slack 0 that the sim deliberately refuses to
//   freeze (the sleep gate never sleeps ON a rendered merge, and no
//   local push law can untangle them - see CLAUDE.md, loud-attractor
//   entry). The guarantee there is BOUNDED churn: the loud attractor
//   (mv 1.3e-1 - 2.3e-1, self-sustaining) must not reappear.
import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../src/core/lattice_grower";
import {
  ParticleSystem,
  DEFAULT_TUNING,
} from "../src/physics/particle_system";

const breathe = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const makeSettled = async (): Promise<ParticleSystem> => {
  const graph = generateLatticeKnotwork({
    gridSize: 12,
    weaveDensity: 0.35,
    turnBias: 0.7,
    randSeed: 2773729296,
  });
  const ps = new ParticleSystem(graph);
  const tuning = { ...DEFAULT_TUNING, slack: 0, drag: 0.5, smooth: 0.25 };
  for (let i = 0; i < 1200; i++) {
    ps.step(1 / 32, tuning);
    if (i % 120 === 0) await breathe();
  }
  return ps;
};

const tuning = { ...DEFAULT_TUNING, slack: 0, drag: 0.5, smooth: 0.25 };

const dragSession = (ps: ParticleSystem, radius: number): void => {
  for (const p of [40, 400, 800]) {
    const px = ps.positions[p * 2];
    const py = ps.positions[p * 2 + 1];
    if (ps.grab(px, py, 1.5) < 0) continue;
    for (let i = 0; i < 60; i++) {
      const ang = (i / 60) * Math.PI * 4;
      ps.dragTo(px + Math.cos(ang) * radius, py + Math.sin(ang) * radius * 0.8);
      ps.step(1 / 32, tuning);
    }
    ps.release();
    for (let i = 0; i < 16; i++) ps.step(1 / 32, tuning);
  }
};

describe("post-interaction quiescence", () => {
  it("re-sleeps after a realistic drag session", { timeout: 240000 }, async () => {
    const ps = await makeSettled();
    dragSession(ps, 1.2);
    let quiet = 0;
    let slept = false;
    for (let f = 0; f < 1920; f++) {
      ps.step(1 / 32, tuning);
      if (f % 120 === 0) await breathe();
      if (ps.maxMove < 1.5e-2) quiet++;
      else quiet = 0;
      if (quiet > 45) {
        slept = true;
        break;
      }
    }
    expect(slept).toBe(true);
  });

  it("keeps a pathological wound out of the loud attractor", { timeout: 240000 }, async () => {
    const ps = await makeSettled();
    dragSession(ps, 2.5);
    // Within 60 sim-seconds the churn must be bounded well below the
    // measured loud attractor (1.3e-1+) and stay there.
    for (let f = 0; f < 1920; f++) {
      ps.step(1 / 32, tuning);
      if (f % 120 === 0) await breathe();
    }
    let worst = 0;
    for (let f = 0; f < 320; f++) {
      ps.step(1 / 32, tuning);
      if (f % 120 === 0) await breathe();
      if (ps.maxMove > worst) worst = ps.maxMove;
    }
    expect(worst).toBeLessThan(7e-2);
  });
});

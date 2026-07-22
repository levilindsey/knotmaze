// Regression: the knot must fall asleep again after user interaction.
// P3.22's depth model removed the old exemption lens's parasitic
// tangential weld - which had also been the only dissipation for the PBD
// constraint standoff - and a play session left the knot jiggling
// forever (mv ~5e-2, never below the stick gate). Graduated contact
// friction (P3.23) restored the dissipation without gesture stickiness.
// This drives a settle -> vigorous drag -> release cycle and asserts
// re-quiescence. (The original endless-jiggle repro needed a browser
// play session; this headless version guards the dissipation channel.)
import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../src/core/lattice_grower";
import {
  ParticleSystem,
  DEFAULT_TUNING,
} from "../src/physics/particle_system";

describe("post-interaction quiescence", () => {
  it("re-sleeps after a drag session", { timeout: 240000 }, async () => {
    // Minutes of synchronous stepping starve the vitest worker's RPC
    // heartbeat ("Timeout calling onTaskUpdate", exits 1 despite green
    // tests) - yield the event loop periodically.
    const breathe = (): Promise<void> =>
      new Promise((resolve) => setImmediate(resolve));
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

    // Vigorous circular drags at three spots.
    for (const p of [40, 400, 800]) {
      const px = ps.positions[p * 2];
      const py = ps.positions[p * 2 + 1];
      if (ps.grab(px, py, 1.5) < 0) continue;
      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 4;
        ps.dragTo(px + Math.cos(ang) * 2.5, py + Math.sin(ang) * 2);
        ps.step(1 / 32, tuning);
      }
      ps.release();
      for (let i = 0; i < 16; i++) ps.step(1 / 32, tuning);
    }

    // Must return to quiescence within 60 sim-seconds. (The headless
    // dragTo gestures teleport the grab point - a harsher wound than any
    // real pointer gesture; browser play sessions settle in ~5-15 sim-s.
    // The strict anti-riding floor spends extra time actually separating
    // the riders this wound creates - measured re-sleep at sim+49 - where
    // the old lenient band slept faster by freezing ON the merges.)
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
});

import { describe, it, expect } from "vitest";
import { ParticleSystem } from "../../src/physics/particle_system";
import type { PhysicsTuning } from "../../src/physics/particle_system";
import { SleepGate, physicsQuiet } from "../../src/physics/sleep_gate";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { planEmblemHole } from "../../src/core/emblem_graph";
import { dailyParams } from "../../src/ui/daily_link";

// K115 stage 5a physics: live star sleeps and keeps its shape; pinned
// emblems do not move (docs/design/K115_stage5.md, Tests / Kill criteria).

const breathe = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

function emblemScene(emblem: string): { ps: ParticleSystem; tuning: PhysicsTuning } {
  const p = dailyParams(1);
  const { graph } = buildSceneGraph({ ...p, title: "", emblem });
  const ps = new ParticleSystem(graph);
  return {
    ps,
    tuning: {
      temperature: 0,
      slack: p.slack,
      drag: p.drag,
      repulsion: p.repulsion,
      bend: p.bend,
      smooth: p.smooth,
      stiffness: p.stiffness,
      gridAlign: p.gridAlign,
      threadWidth: p.threadWidth,
    },
  };
}

function bounds(ps: ParticleSystem): { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  let sx = 0, sy = 0;
  for (let i = 0; i < ps.particleCount; i++) {
    const x = ps.positions[i * 2], y = ps.positions[i * 2 + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    sx += x; sy += y;
  }
  return { x0, x1, y0, y1, cx: sx / ps.particleCount, cy: sy / ps.particleCount };
}

describe("emblem physics (K115 stage 5a)", () => {
  it("holds every pinned emblem particle at its initial position", () => {
    for (const emblem of ["triquetra", "solomon", "wreath"]) {
      const { ps, tuning } = emblemScene(emblem);
      const start = new Float32Array(ps.positions);
      for (let p = 0; p < ps.particleCount; p++) expect(ps.isAnchored(p)).toBe(true);
      for (let i = 0; i < 120; i++) ps.step(1 / 60, tuning);
      expect([...ps.positions], emblem).toEqual([...start]);
    }
  });

  it("settles and sleeps a live star, retaining its diameter", { timeout: 180000 }, async () => {
    const { ps, tuning } = emblemScene("star");
    const before = bounds(ps);
    const dia0 = Math.max(before.x1 - before.x0, before.y1 - before.y0);
    const gate = new SleepGate();
    let frames = 0;
    let sleptAt = Number.POSITIVE_INFINITY;
    while (ps.simTime < 15) {
      const sim0 = ps.simTime;
      ps.step(0.1, tuning);
      if (++frames % 20 === 0) await breathe();
      if (gate.frame(physicsQuiet(ps), ps.simTime - sim0)) {
        sleptAt = ps.simTime;
        break;
      }
    }
    expect(sleptAt).toBeLessThan(15);
    const after = bounds(ps);
    const dia1 = Math.max(after.x1 - after.x0, after.y1 - after.y0);
    expect(dia1 / dia0).toBeGreaterThanOrEqual(0.7);
    // Centroid inside the central half of the authored bounds.
    expect(after.cx).toBeGreaterThanOrEqual(before.x0 + 0.25 * (before.x1 - before.x0));
    expect(after.cx).toBeLessThanOrEqual(before.x1 - 0.25 * (before.x1 - before.x0));
    expect(after.cy).toBeGreaterThanOrEqual(before.y0 + 0.25 * (before.y1 - before.y0));
    expect(after.cy).toBeLessThanOrEqual(before.y1 - 0.25 * (before.y1 - before.y0));
  });

  it("sleeps a live star island in its maze hole, inside the hole (K115 5b)", { timeout: 180000 }, async () => {
    const p = dailyParams(1);
    const plan = planEmblemHole("star", p.gridSize, p.shape);
    expect(plan).not.toBeNull();
    const { graph } = buildSceneGraph({ ...p, title: "", cartouche: "", cartoucheShape: "star", seed: 11 });
    const first = graph.strands.findIndex((s) => s.nodes[0].startsWith("sn"));
    expect(first).toBeGreaterThanOrEqual(0);
    const ps = new ParticleSystem(graph);
    const tuning: PhysicsTuning = {
      temperature: 0,
      slack: p.slack,
      drag: p.drag,
      repulsion: p.repulsion,
      bend: p.bend,
      smooth: p.smooth,
      stiffness: p.stiffness,
      gridAlign: p.gridAlign,
      threadWidth: p.threadWidth,
    };
    const gate = new SleepGate();
    let frames = 0;
    let sleptAt = Number.POSITIVE_INFINITY;
    while (ps.simTime < 30) {
      const sim0 = ps.simTime;
      ps.step(0.1, tuning);
      if (++frames % 20 === 0) await breathe();
      if (gate.frame(physicsQuiet(ps), ps.simTime - sim0)) {
        sleptAt = ps.simTime;
        break;
      }
    }
    expect(sleptAt).toBeLessThan(30);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let c = first; c < ps.chains.length; c++) {
      for (const pi of ps.chains[c]) {
        const x = ps.positions[pi * 2], y = ps.positions[pi * 2 + 1];
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const hx0 = 2 * plan!.hole.cx, hy0 = 2 * plan!.hole.cy;
    const hx1 = 2 * (plan!.hole.cx + plan!.hole.w), hy1 = 2 * (plan!.hole.cy + plan!.hole.h);
    expect(x0).toBeGreaterThanOrEqual(hx0 + 0.5);
    expect(x1).toBeLessThanOrEqual(hx1 - 0.5);
    expect(y0).toBeGreaterThanOrEqual(hy0 + 0.5);
    expect(y1).toBeLessThanOrEqual(hy1 - 0.5);
  });

  it("settles and sleeps a live trefoil", { timeout: 180000 }, async () => {
    const { ps, tuning } = emblemScene("trefoil");
    const before = bounds(ps);
    const dia0 = Math.max(before.x1 - before.x0, before.y1 - before.y0);
    const gate = new SleepGate();
    let frames = 0;
    let sleptAt = Number.POSITIVE_INFINITY;
    while (ps.simTime < 15) {
      const sim0 = ps.simTime;
      ps.step(0.1, tuning);
      if (++frames % 20 === 0) await breathe();
      if (gate.frame(physicsQuiet(ps), ps.simTime - sim0)) {
        sleptAt = ps.simTime;
        break;
      }
    }
    expect(sleptAt).toBeLessThan(15);
    const after = bounds(ps);
    const dia1 = Math.max(after.x1 - after.x0, after.y1 - after.y0);
    expect(dia1 / dia0).toBeGreaterThanOrEqual(0.7);
  });
});

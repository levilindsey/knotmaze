// K41 REGRESSION GUARD: a fresh settle must reach the sleep gate.
//
// After the kink-eye change (9920fab) two verification links never fell
// asleep in the browser (95 ms of physics per frame at rest, forever),
// while 9920fab's parent slept both at sim 7.0:
// - the FAT KNOT link: mv pinned at 1.9e-2 by a period-2 limit cycle in
//   the twist eye beside a kink. The eye pressure pried the kink's
//   crossing open (a flat target asked the loop's two ends, which flank
//   the crossing, to stand a whole eye diameter apart) and squeezed the
//   neighboring eye into the capsule test's 2D-closest-point bug: the
//   eye's arms run parallel in the plane while their z slopes oppose, so
//   the "closest point" jumped between segment ends and the two final
//   collision sweeps overshot in turn.
// - the user's RECT FABRIC link: one standing rider. A twist ratchet
//   walked a crossing 2.0 -> 1.34 ctrl into a fused joint's unmet jn
//   budget, and the joint's bridge arm then rode the crossing's over
//   thread at the anti-riding floor's hard line forever.
// Both are fixed at the root (3D closest points in applySegmentCollision;
// the chord-law eye pressure; the ratchet intersection for every pass
// between a joint and a twist twin; crossing coverage through fused
// joints). See .claude/rules/physics-kinks.md, KINK EYES.
//
// The scene is built with main.ts's own calls and stepped in 0.1-s frames
// (pixi caps a frame's dt at 0.1 s, and these links run at ~10 fps in
// the browser); the gate is main.ts's (physics/sleep_gate.ts). Physics
// runs per fixed substep, so this reproduces the browser trajectory
// exactly. (Until K63 the gate counted 45 FRAMES, so at 0.1-s frames
// every design slept at sim 7.0: 2.5 s settle + 4.5 s. It counts
// simulated time now - the last test below.)
import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { planAnchors } from "../../src/core/shapes";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { ParticleSystem } from "../../src/physics/particle_system";
import type { PhysicsTuning } from "../../src/physics/particle_system";
import { applySegmentCollision } from "../../src/physics/forces";
import type { SegmentTopology } from "../../src/physics/forces";
import { SleepGate, physicsQuiet } from "../../src/physics/sleep_gate";
import { parseParams } from "../../src/ui/url_state";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { dailyParams, dailyTitle } from "../../src/ui/daily_link";

const breathe = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

function buildScene(query: string): {
  ps: ParticleSystem;
  tuning: PhysicsTuning;
} {
  const params = parseParams(query);
  const graph = generateLatticeKnotwork({
    gridSize: params.gridSize,
    weaveDensity: params.weaveDensity,
    turnBias: params.turnBias,
    randSeed: params.seed,
    shape: params.shape,
  });
  if (params.mazeFabric) {
    const plan = buildMazePlan(graph, {
      ...DEFAULT_MAZE_PARAMS,
      branchDensity: params.branchDensity,
      fourWayFraction: params.fourWayFraction,
      deadEndDensity: (params as { deadEnds?: boolean }).deadEnds ? params.deadEndDensity : 0,
      deadEndLength: params.deadEndLength,
      hCutShare: params.hCutShare,
      entranceClearance: params.entranceClearance,
      exitClearance: params.exitClearance,
      junctionSpacing: params.junctionSpacing,
      ...planAnchors(
        params.shape,
        params.gridSize,
        params.startAnchor,
        params.exitAnchor
      ),
    });
    const hueGroup = applyMazePlan(graph, plan);
    applyMazeCuts(graph, plan, hueGroup);
  }
  return {
    ps: new ParticleSystem(graph),
    tuning: {
      temperature: 0,
      slack: params.slack,
      drag: params.drag,
      repulsion: params.repulsion,
      bend: params.bend,
      smooth: params.smooth,
      stiffness: params.stiffness,
      gridAlign: params.gridAlign,
      threadWidth: params.threadWidth,
    },
  };
}

// Sim time at which main.ts's sleep gate trips (frames of `dt` seconds),
// or Infinity by maxSim.
async function simToSleep(
  query: string,
  maxSim: number,
  dt = 0.1
): Promise<number> {
  const { ps, tuning } = buildScene(query);
  const gate = new SleepGate();
  let frames = 0;
  while (ps.simTime < maxSim) {
    const sim0 = ps.simTime;
    ps.step(dt, tuning);
    if (++frames % 20 === 0) await breathe();
    if (gate.frame(physicsQuiet(ps), ps.simTime - sim0)) return ps.simTime;
  }
  return Number.POSITIVE_INFINITY;
}

// Key=value links read today's defaults (K132). `de=0&ded=.25` keep the
// maze this link has built since K74 (it read the v1 defaults then).
const USER_RECT_LINK =
  "?s=1471kin&gs=12&rep=1&bd=1&sm=.25&ga=0&tw=.64&gap=.12&cr=2.4&fl=0" +
  "&fw=.25&fv=1.15&vol=.18&hs=312&pal=moss&pc=6c644c&as=2.1" +
  "&de=0&ded=.25&am=instant&snd=none";

describe("fresh-settle sleep (K41 links)", () => {
  it("the fat knot link sleeps", { timeout: 120000 }, async () => {
    const sim = await simToSleep(
      "?s=p9ar6&mf=0&rep=.4&bd=1.75&sm=.7&tw=.52&am=instant&snd=none",
      12
    );
    expect(sim).toBeLessThan(12);
  });

  it("the user's rect fabric link sleeps", { timeout: 120000 }, async () => {
    const sim = await simToSleep(USER_RECT_LINK, 12);
    expect(sim).toBeLessThan(12);
  });
});

describe("the titled daily (K115 stage 3a)", () => {
  // Kill criterion: a titled maze sleeps, and the pinned seam does not
  // pump its tail strand awake.
  it("Daily #12 with its title thread sleeps", { timeout: 180000 }, async () => {
    const p = dailyParams(12);
    const { graph } = buildSceneGraph({ ...p, title: dailyTitle(12), glyphs2: "" });
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
  });
});

describe("the cartouche design (K115 stage 4a)", () => {
  // Kill criterion: a cartouche maze sleeps; the two pinned frame
  // junctions must not pump (junctions are occurrences on a pinned
  // strand, so they inherit its anchors).
  it("a rect cartouche design sleeps", { timeout: 180000 }, async () => {
    const p = dailyParams(1);
    const { graph } = buildSceneGraph({
      ...p,
      title: "",
      cartouche: "knot",
      seed: 11,
      gridSize: 18,
      shape: "rect", glyphs2: "",
    });
    expect(graph.nodes.has("cj_a")).toBe(true);
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
  });
});

describe("frame-rate independent sleep (K63)", () => {
  // The same trajectory at 10 fps (pixi's 0.1-s cap) and 60 fps must
  // sleep at the same SIMULATED time, up to frame quantization (a loud
  // substep spoils its whole frame, and the window ends on a frame
  // boundary). The 45-frame gate slept this link at sim 7.3 vs 3.47.
  it("sleeps at one sim time at 10 and 60 fps", { timeout: 120000 }, async () => {
    const slow = await simToSleep(USER_RECT_LINK, 12, 0.1);
    const fast = await simToSleep(USER_RECT_LINK, 12, 1 / 60);
    expect(Number.isFinite(slow)).toBe(true);
    expect(Math.abs(slow - fast)).toBeLessThan(0.25);
  });
});

describe("capsule contact", () => {
  // The two arms of a twist eye: parallel in the plane, z sloping
  // opposite ways (one depth tent descends while the other rises). They
  // interpenetrate in 3D at mid-span (z 0 on both, 0.5 apart in the
  // plane, floor 0.6); the old solve took the 2D closest point - an
  // arbitrary end of the parallel overlap, where z differs by 1.0 - and
  // saw no contact at all.
  it("solves the closest points in 3D", () => {
    const positions = new Float32Array([0, 0, 1, 0, 0, 0.5, 1, 0.5]);
    const zPos = new Float32Array([0.5, -0.5, -0.5, 0.5]);
    const topology: SegmentTopology = {
      next: Int32Array.from([1, 1, 3, 3]),
      chainOf: Int32Array.from([0, 0, 1, 1]),
      ctrlOf: Int32Array.from([0, 1, 0, 1]),
      chainLen: Int32Array.from([2, 2, 2, 2]),
      junctionOf: Int32Array.from([-1, -1, -1, -1]),
    };
    // Full crossing coverage on the pair (over side on the first
    // segment, under side on the second) stands the 2D anti-riding floor
    // down, isolating the 3D capsule.
    const slot = new Int32Array(16).fill(-1);
    const cov = new Float32Array(16);
    for (const [p, side] of [[0, 0], [1, 0], [2, 1], [3, 1]]) {
      slot[p * 4] = side;
      cov[p * 4] = 1;
    }
    const gapBefore = positions[5] - positions[1];
    applySegmentCollision(
      positions,
      zPos,
      4,
      topology,
      0.6,
      0.5,
      1.0,
      new Float32Array(0),
      { slot, cov }
    );
    const gapAfter = positions[5] - positions[1];
    // Mid-span contact (s = t = 0.5): each segment is pushed straight
    // apart, evenly at both ends - 0.025 each for the 0.1 deficit at full
    // stiffness (a mid-span contact moves its closest points by half the
    // endpoint push). The old solve moved nothing.
    expect(gapAfter - gapBefore).toBeCloseTo(0.05, 5);
    expect(positions[1]).toBeCloseTo(positions[3], 6);
    expect(positions[5]).toBeCloseTo(positions[7], 6);
  });
});

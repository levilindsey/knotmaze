// K868 S1a: the scene export's pure part (src/render/field/scene_export.ts).
// A hand-built frame: two straight runs crossing, a run whose tucked end
// meets a through run at a junction, and a closed square ring. Every
// expected number is worked out by hand from the renderer's rules.

import { describe, expect, it } from "vitest";
import {
  buildFieldScene,
  depthTent,
  wedgeKey,
  type ExportChain,
  type SceneExportInput,
} from "../../../src/render/field/scene_export";
import { cornerWedgeKey } from "../../../src/render/ribbon/corner_share";

const H = 0.2; // half-width: trim = min(0.75 h, total / 4) = 0.15

/** An open straight run from a to b: particles one ctrl apart, samples
 * every 0.1 (k / (count - 1) * total), optionally tucked. */
function run(
  a: [number, number],
  b: [number, number],
  firstParticle: number,
  tucked: [boolean, boolean]
): ExportChain {
  const total = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const count = Math.round(total / 0.1) + 1;
  const pos = new Float64Array(count * 2);
  const at = (arc: number): [number, number] => [
    a[0] + ((b[0] - a[0]) * arc) / total,
    a[1] + ((b[1] - a[1]) * arc) / total,
  ];
  for (let k = 0; k < count; k++) {
    const p = at((k / (count - 1)) * total);
    pos[k * 2] = p[0];
    pos[k * 2 + 1] = p[1];
  }
  // The tuck (strip_pass.ts): samples within trim of a fused end collapse
  // onto the point at trim.
  const trim = Math.min(0.75 * H, total / 4);
  const arcPer = total / (count - 1);
  if (tucked[0]) {
    const p = at(trim);
    for (let k = 0; k < Math.min(count - 1, Math.ceil(trim / arcPer)); k++) {
      pos[k * 2] = p[0];
      pos[k * 2 + 1] = p[1];
    }
  }
  if (tucked[1]) {
    const p = at(total - trim);
    for (let k = Math.max(1, count - Math.ceil(trim / arcPer)); k < count; k++) {
      pos[k * 2] = p[0];
      pos[k * 2 + 1] = p[1];
    }
  }
  const slots = Math.round(total) + 1;
  return {
    closed: false,
    count,
    positions: pos,
    totalLength: total,
    controlArcLengths: Array.from({ length: slots }, (_, i) => i),
    particles: Array.from({ length: slots }, (_, i) => firstParticle + i),
    tucked,
  };
}

/** A closed square ring of side 2 from (10, 0), counter-clockwise in y-up
 * terms: particles at the corners, 80 samples (k / count * total). */
function ring(firstParticle: number): ExportChain {
  const count = 80;
  const pos = new Float64Array(count * 2);
  for (let k = 0; k < count; k++) {
    const p = k * 0.1;
    let x: number;
    let y: number;
    if (p < 2) [x, y] = [10 + p, 0];
    else if (p < 4) [x, y] = [12, p - 2];
    else if (p < 6) [x, y] = [12 - (p - 4), 2];
    else [x, y] = [10, 2 - (p - 6)];
    pos[k * 2] = x;
    pos[k * 2 + 1] = y;
  }
  return {
    closed: true,
    count,
    positions: pos,
    totalLength: 8,
    controlArcLengths: [0, 2, 4, 6],
    particles: [0, 1, 2, 3].map((i) => firstParticle + i),
    tucked: [false, false],
  };
}

function fixture(): SceneExportInput {
  // Chain 0: (0,0) -> (4,0), end tucked (its end is fused at junction 0).
  // Chain 1: (2,-2) -> (2,2), start tucked, end free.
  // Chain 2: (4,-2) -> (4,2), the through run at junction 0; start anchored.
  // Chain 3: the ring.
  const chains = [
    run([0, 0], [4, 0], 0, [false, true]),
    run([2, -2], [2, 2], 5, [true, false]),
    run([4, -2], [4, 2], 10, [false, false]),
    ring(15),
  ];
  const n = 19;
  const phys = new Float64Array(n * 2);
  for (let i = 0; i < 5; i++) phys.set([i, 0], i * 2);
  for (let i = 0; i < 5; i++) phys.set([2, -2 + i], (5 + i) * 2);
  for (let i = 0; i < 5; i++) phys.set([4, -2 + i], (10 + i) * 2);
  phys.set([10, 0, 12, 0, 12, 2, 10, 2], 15 * 2);
  const crossings = [
    { over: { chain: 0, ctrl: 2, displayF: 2.1 }, under: { chain: 1, ctrl: 2 } },
  ];
  const zPos = depthTent(chains, crossings, n, 0.6, 1.4);
  zPos[15] = 0.1; // ring: a depth to interpolate across the seam
  zPos[18] = 0.3;
  const armsJ0 = [
    { chain: 0, slot: 4, dir: -1 as const },
    { chain: 2, slot: 2, dir: 1 as const },
    { chain: 2, slot: 2, dir: -1 as const },
  ];
  // Export order (by angle): chain 2 dir -1 (down), chain 2 dir +1 (up),
  // chain 0 dir -1 (left).
  const kDownUp = wedgeKey(0, armsJ0[2], armsJ0[1]);
  const kUpLeft = wedgeKey(0, armsJ0[1], armsJ0[0]);
  const kLeftDown = wedgeKey(0, armsJ0[0], armsJ0[2]);
  return {
    name: "fixture",
    source: { kind: "app", url: "test", build: "test", simTime: 0, physHash: "0" },
    camera: { worldToCss: [100, 0, 0, 100, 50, 0], pxPerUnit: 100, dpr: 1, viewport: [1000, 600] },
    look: {
      halfWidth: H,
      band: 0.38 * H,
      cornerRoundShare: 0.5,
      cuspRadius: 3,
      depthAmp: 0.6,
      depthWindow: 1.4,
      paper: "#ffffff",
      ink: "#000000",
    },
    chains,
    zPos,
    physPositions: phys,
    crossings,
    emergent: [
      // Within 0.8 of the registered crossing's drawn point (2.1, 0): dropped.
      { over: { chain: 0, ctrl: 2.5 }, under: { chain: 1, ctrl: 2.5 } },
      // Far from it: kept.
      { over: { chain: 0, ctrl: 1 }, under: { chain: 1, ctrl: 0.5 } },
    ],
    junctions: [{ particles: [4, 12], arms: armsJ0 }],
    corners: {
      candidates: [{ key: kDownUp }, { key: kUpLeft, pin: "round" }, { key: kLeftDown }],
      rounded: new Set([kUpLeft]),
    },
    freeTips: [{ chain: 1, atEnd: true }],
    anchoredTips: [{ chain: 2, atEnd: false }],
  };
}

describe("buildFieldScene", () => {
  const { scene, diag } = buildFieldScene(fixture());

  it("drops the tuck's duplicate samples and measures s on the drawn polyline", () => {
    const c0 = scene.chains[0];
    // 41 samples, the last two tucked onto (3.85, 0): one duplicate.
    expect(c0.pts.length / 2).toBe(40);
    expect(c0.pts.slice(-2)).toEqual([3.85, 0]);
    const c1 = scene.chains[1];
    // Samples 0 and 1 tucked onto (2, -1.85).
    expect(c1.pts.length / 2).toBe(40);
    [2, -1.85, 2, -1.8].forEach((v, i) => expect(c1.pts[i]).toBeCloseTo(v, 12));
    expect(diag.tuckDuplicates).toBe(2);
    expect(scene.chains[3].pts.length / 2).toBe(80);
  });

  it("places a registered crossing at its render ctrl, in export s", () => {
    const x = scene.crossings[0];
    expect(x.over).toBe("a");
    expect(x.a.chain).toBe(0);
    expect(x.a.s).toBeCloseTo(2.1, 12); // displayF, chain 0 untucked there
    expect(x.b.chain).toBe(1);
    expect(x.b.s).toBeCloseTo(1.85, 12); // arc 2 minus the 0.15 tuck
    expect(x.emergent).toBeUndefined();
  });

  it("keeps emergent crossings away from accepted ones", () => {
    expect(scene.crossings.length).toBe(2);
    expect(scene.crossings[1].emergent).toBe(true);
    expect(scene.crossings[1].a.s).toBeCloseTo(1, 12);
    expect(diag.emergentDuplicates).toBe(1);
  });

  it("carries the physics depth, linear between slots", () => {
    const tentPeak = 0.6;
    const tentSide = 0.6 * (1 - 1 / 1.4);
    const c0 = scene.chains[0];
    expect(c0.z[20]).toBeCloseTo(tentPeak, 12); // x = 2, slot 2
    expect(c0.z[25]).toBeCloseTo((tentPeak + tentSide) / 2, 12); // x = 2.5
    // Chain 1 starts at its tuck point (arc 0.15): between slots 0 and 1.
    expect(scene.chains[1].z[0]).toBeCloseTo(-tentSide * 0.15, 12);
    expect(scene.chains[1].z[19]).toBeCloseTo(-tentPeak, 12); // y = 0, arc 2
    // The ring at arc 7 (sample 70): halfway from slot 3 back to slot 0.
    expect(scene.chains[3].z[70]).toBeCloseTo((0.3 + 0.1) / 2, 12);
    expect(diag.zVsTentParticles).toBeCloseTo(0.3, 12);
  });

  it("builds the junction as joinery sees it", () => {
    const j = scene.junctions[0];
    expect(j.id).toBe("j0");
    // Centre: the mean of the arms' drawn slot points, (3.85, 0), (4, 0) twice.
    expect(j.c[0]).toBeCloseTo((3.85 + 8) / 3, 12);
    expect(j.c[1]).toBeCloseTo(0, 12);
    expect(j.arms.map((a) => [a.chain, a.dir, a.kind])).toEqual([
      [2, -1, "through"],
      [2, 1, "through"],
      [0, -1, "end"],
    ]);
    expect(j.arms[0].s).toBeCloseTo(2, 12);
    expect(j.arms[2].s).toBeCloseTo(3.85, 12); // the END's s is its total
    expect(j.corners).toEqual([
      { style: "sharp", pinned: false },
      { style: "round", pinned: true },
      { style: "sharp", pinned: false },
    ]);
    expect(diag.cornerKeysMissing).toBe(0);
    expect(wedgeKey(7, { chain: 1, slot: 2, dir: 1 }, { chain: 3, slot: 4, dir: -1 })).toBe(
      cornerWedgeKey(7, { chain: 1, slot: 2, dir: 1 }, { chain: 3, slot: 4, dir: -1 })
    );
    expect(diag.centreVsParticleMean).toBeCloseTo(Math.hypot((3.85 + 8) / 3 - 4, 0), 12);
  });

  it("measures an END terminal against the through centreline", () => {
    expect(diag.endOffsets).toHaveLength(1);
    expect(diag.endOffsets[0].tucked).toBeCloseTo(0.15, 12);
    expect(diag.endOffsets[0].particle).toBeCloseTo(0, 12);
  });

  it("lists dead ends and POIs", () => {
    expect(scene.deadEnds).toEqual([
      { chain: 1, s: expect.any(Number) },
      { chain: 2, s: 0, offscreen: true },
    ]);
    expect(scene.deadEnds[0].s).toBeCloseTo(3.85, 12);
    // (4, -2) maps to CSS (450, -200): off-screen.
    expect(diag.anchoredOnScreen).toBe(0);
    expect(scene.pois!.map((p) => p.name)).toEqual(["j0", "t0"]);
    expect(scene.pois![1].at).toEqual([2, 2]);
  });
});

describe("depthTent", () => {
  it("sums tents over the window and clamps to the amplitude", () => {
    const chains = [{ closed: true, particles: [0, 1, 2, 3] }];
    // Two over passes on one ring, 0.5 ctrl apart: slot 1 gets both.
    const t = depthTent(
      chains,
      [
        { over: { chain: 0, ctrl: 1 }, under: { chain: 0, ctrl: 3 } },
        { over: { chain: 0, ctrl: 1.5 }, under: { chain: 0, ctrl: 3.2 } },
      ],
      4,
      1,
      1.4
    );
    expect(t[1]).toBe(1); // 1 + (1 - 0.5 / 1.4), clamped
    expect(t[2]).toBeCloseTo((1 - 1 / 1.4) + (1 - 0.5 / 1.4) - (1 - 1 / 1.4) - (1 - 1.2 / 1.4), 12);
  });
});

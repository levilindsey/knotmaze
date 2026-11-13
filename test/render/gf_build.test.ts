// K1362 c1: rp=gf's build off main (src/render/gpu_field/gf_build.ts). The
// lean scene must give the tables the full export gives, bit for bit, and
// read none of what it skips (zPos, physics positions, junction particles,
// chain particle indices beyond their count); the tables must survive a
// structured clone with their buffers transferred (the worker's reply).
// The frame is scene_export.test.ts's hand-built one (two runs crossing, a
// tucked end at a junction on a through run, a closed ring), copied.

import { describe, expect, it } from "vitest";
import {
  buildFieldScene,
  buildFieldSceneLean,
  depthTent,
  wedgeKey,
  type ExportChain,
  type SceneExportInput,
} from "../../src/render/field/scene_export";
import {
  assembleGfTables, buildGfPrefix, buildTables, buildTablesPooled, gfChunkBinPart,
  gfChunkMeta, mergeGfChunkBins, partitionWeighted, solveGfCorners, type GfCorner,
} from "../../src/render/gpu_field/tables";
import { CTRL_ARC, gfBuild, tablesDiff, tablesTransfer } from "../../src/render/gpu_field/gf_build";

const H = 0.2;

function run(a: [number, number], b: [number, number], firstParticle: number, tucked: [boolean, boolean]): ExportChain {
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
  const chains = [run([0, 0], [4, 0], 0, [false, true]), run([2, -2], [2, 2], 5, [true, false]), run([4, -2], [4, 2], 10, [false, false]), ring(15)];
  const n = 19;
  const phys = new Float64Array(n * 2);
  for (let i = 0; i < 5; i++) phys.set([i, 0], i * 2);
  for (let i = 0; i < 5; i++) phys.set([2, -2 + i], (5 + i) * 2);
  for (let i = 0; i < 5; i++) phys.set([4, -2 + i], (10 + i) * 2);
  phys.set([10, 0, 12, 0, 12, 2, 10, 2], 15 * 2);
  const crossings = [{ over: { chain: 0, ctrl: 2, displayF: 2.1 }, under: { chain: 1, ctrl: 2 } }];
  const zPos = depthTent(chains, crossings, n, 0.6, 1.4);
  zPos[15] = 0.1;
  zPos[18] = 0.3;
  const armsJ0 = [
    { chain: 0, slot: 4, dir: -1 as const },
    { chain: 2, slot: 2, dir: 1 as const },
    { chain: 2, slot: 2, dir: -1 as const },
  ];
  const kDownUp = wedgeKey(0, armsJ0[2], armsJ0[1]);
  const kUpLeft = wedgeKey(0, armsJ0[1], armsJ0[0]);
  const kLeftDown = wedgeKey(0, armsJ0[0], armsJ0[2]);
  return {
    name: "fixture",
    source: { kind: "app", url: "test", build: "test", simTime: 0, physHash: "0" },
    camera: { worldToCss: [100, 0, 0, 100, 50, 0], pxPerUnit: 100, dpr: 1, viewport: [1000, 600] },
    look: { halfWidth: H, band: 0.38 * H, cornerRoundShare: 0.5, cuspRadius: 3, depthAmp: 0.6, depthWindow: 1.4, paper: "#ffffff", ink: "#000000" },
    chains,
    zPos,
    physPositions: phys,
    crossings,
    emergent: [
      { over: { chain: 0, ctrl: 2.5 }, under: { chain: 1, ctrl: 2.5 } },
      { over: { chain: 0, ctrl: 1 }, under: { chain: 1, ctrl: 0.5 } },
    ],
    junctions: [{ particles: [4, 12], arms: armsJ0 }],
    corners: {
      candidates: [{ key: kDownUp }, { key: kUpLeft, pin: "round" }, { key: kLeftDown }],
      rounded: new Set([kUpLeft]),
    },
    freeTips: [{ chain: 1, atEnd: true }],
    anchoredTips: [
      { chain: 2, atEnd: false },
      { chain: 0, atEnd: false },
    ],
  };
}

/** What gatherSceneInputLean hands the worker: no z, no physics positions,
 * no junction particles, particle counts only, float32 samples. */
function leanOf(input: SceneExportInput): SceneExportInput {
  return {
    ...input,
    zPos: new Float64Array(0),
    physPositions: new Float64Array(0),
    chains: input.chains.map((c) => ({
      ...c,
      positions: Float32Array.from(c.positions as ArrayLike<number>),
      controlArcLengths: Float64Array.from(c.controlArcLengths as ArrayLike<number>) as unknown as number[],
      particles: { length: c.particles.length } as ArrayLike<number>,
    })),
    junctions: input.junctions.map((j) => ({ ...j, particles: [] })),
  };
}

function full(input: SceneExportInput, aa: number) {
  const { scene } = buildFieldScene(input);
  scene.look.ctrlArc ??= CTRL_ARC;
  return buildTables(scene, { aa });
}

describe("gfBuild (K1362 c1)", () => {
  for (const aa of [0.5 / 100, 0.5 / 37.5]) {
    it(`lean tables equal the full export's, bit for bit (aa ${aa})`, () => {
      const input = fixture();
      const ref = full(input, aa);
      expect(ref.nV).toBeGreaterThan(0);
      expect(tablesDiff(gfBuild(input, aa).T, ref)).toEqual([]);
    });
  }

  it("reads none of what it skips (the lean gather's input)", () => {
    // Float32 samples, as the app's renderer holds them: the full export of
    // the same float32 frame is the reference.
    const lean = leanOf(fixture());
    const f32 = fixture();
    f32.chains = f32.chains.map((c) => ({ ...c, positions: Float32Array.from(c.positions as ArrayLike<number>) }));
    expect(tablesDiff(gfBuild(lean, 0.005).T, full(f32, 0.005))).toEqual([]);
    const scene = buildFieldSceneLean(lean);
    expect(scene.chains.every((c) => c.z.every((z) => z === 0))).toBe(true);
  });

  // K1362 t2: the pool path (partitioned raw vertices, corner slices,
  // chunk-bin slices, merged in order) gives the cold build's tables,
  // bit for bit, at every slice count — on the full and the lean scene.
  for (const n of [1, 2, 3, 5]) {
    it(`pooled tables equal the cold build's, bit for bit (slices ${n})`, () => {
      const input = fixture();
      const { scene } = buildFieldScene(input);
      scene.look.ctrlArc ??= CTRL_ARC;
      const cold = buildTables(scene, { aa: 0.005 });
      expect(cold.nV).toBeGreaterThan(0);
      expect(tablesDiff(buildTablesPooled(scene, { aa: 0.005 }, n), cold)).toEqual([]);
      const leanScene = buildFieldSceneLean(leanOf(fixture()));
      leanScene.look.ctrlArc ??= CTRL_ARC;
      const leanCold = buildTables(leanScene, { aa: 0.005 });
      expect(tablesDiff(buildTablesPooled(leanScene, { aa: 0.005 }, n), leanCold)).toEqual([]);
    });
  }

  // K1362 t2: the coordinator's trimmed slice prefixes (range-local arms,
  // junctions and jGroup, jBase set) solve to the cold build's tables.
  it("trimmed slice prefixes assemble to the cold build's tables", () => {
    const input = fixture();
    const { scene } = buildFieldScene(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    const cold = buildTables(scene, { aa: 0.005 });
    const P = buildGfPrefix(scene, { aa: 0.005 });
    const meta = gfChunkMeta(P);
    const n = 3;
    const jRanges = partitionWeighted(scene.junctions.map((J) => J.arms.length), n);
    const qRanges = partitionWeighted(new Array(meta.nCh).fill(1), n);
    let K: GfCorner[] = [];
    const parts = [];
    for (let s = 0; s < n; s++) {
      const jr = jRanges[s] ?? [scene.junctions.length, scene.junctions.length];
      const qr = qRanges[s] ?? [meta.nCh, meta.nCh];
      const P2 = {
        ...P,
        arms: P.arms.filter((A) => A.j >= jr[0] && A.j < jr[1]),
        junctions: P.junctions.slice(jr[0], jr[1]),
        jGroup: P.jGroup.slice(jr[0], jr[1]),
        jBase: jr[0],
      };
      K = K.concat(solveGfCorners(P2, 0, jr[1] - jr[0]));
      parts.push(gfChunkBinPart(P2, meta, qr[0], qr[1]));
    }
    const bins = mergeGfChunkBins(parts, meta.gW * meta.gH);
    const pooled = assembleGfTables(P, K, { meta, bins }, { ...P.ms, corners: 0 }, 0);
    expect(tablesDiff(pooled, cold)).toEqual([]);
  });

  it("partitionWeighted covers its range contiguously, in order", () => {
    for (const [weights, parts] of [[[5, 1, 4, 1], 3], [[1], 4], [[], 2], [[2, 2, 2, 2], 4], [[0, 0, 7], 2]] as [number[], number][]) {
      const ranges = partitionWeighted(weights, parts);
      let at = 0;
      for (const [lo, hi] of ranges) { expect(lo).toBe(at); expect(hi).toBeGreaterThanOrEqual(lo); at = hi; }
      expect(at).toBe(weights.length);
    }
  });

  it("survives the worker's transfer, and the diff sees one flipped bit", () => {
    const { T } = gfBuild(fixture(), 0.005);
    const ref = gfBuild(fixture(), 0.005).T;
    const list = tablesTransfer(T);
    expect(new Set(list).size).toBe(list.length);
    const back = structuredClone(T, { transfer: list });
    expect(tablesDiff(back, ref)).toEqual([]);
    const key = (Object.keys(back) as (keyof typeof back)[]).find((k) => {
      const v = back[k] as unknown;
      return ArrayBuffer.isView(v) && v.byteLength > 0;
    })!;
    const v = back[key] as unknown as ArrayBufferView;
    new Uint8Array(v.buffer, v.byteOffset, 1)[0] ^= 1;
    expect(tablesDiff(back, ref)).toEqual([key]);
  });
});

// K1040 S3: the label pass's CPU side. labelAt (the fragment rule's float64
// mirror) against FormB.evalPoint's top on small fixtures, the layout key's
// rule (K985) and the word's packing.
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene, SceneArm, SceneJunction } from "../../../src/render/field/scene";
import { buildLabelB, labelAt, MAX_GROUPS, packWord, unpackWord } from "../../../src/render/field/label_b";
import { labelVerdict, sampleOf } from "../../../src/render/field/label_b_verdict";

function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return out;
}

function ray(cx: number, cy: number, deg: number, r0: number, r1: number, step = 0.2): number[] {
  const a = (deg * Math.PI) / 180;
  return line(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), step);
}

function scene(chains: number[][], junctions: SceneJunction[] = [], z: number[] = []): FieldScene {
  return {
    version: 1,
    name: "label_b.test",
    source: { kind: "synthetic", generator: "label_b.test", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: chains.map((pts, id) => ({ id, closed: false, pts, z: new Array(pts.length / 2).fill(z[id] ?? 0) })),
    crossings: [],
    junctions,
    deadEnds: [],
  };
}

function junction(c: [number, number], arms: SceneArm[]): SceneJunction {
  return { id: "j0", c, arms, corners: arms.map(() => ({ style: "round" as const, pinned: false })) };
}

const FIXTURES: Record<string, () => FieldScene> = {
  tube: () => scene([line(-8, 0, 8, 0)]),
  bend: () => scene([[...line(-8, -6, 0, 0), ...line(0, 0, 8, -6).slice(2)]]),
  crossing: () => scene([line(-8, 0, 8, 0), line(0, -8, 0, 8)], [], [0.1, -0.1]),
  tee: () =>
    scene(
      [line(-10, 0, 10, 0), ray(0, 0, 90, 0, 10)],
      [
        junction(
          [0, 0],
          [
            { chain: 0, s: 10, dir: 1, kind: "through" },
            { chain: 1, s: 0, dir: 1, kind: "end" },
            { chain: 0, s: 10, dir: -1, kind: "through" },
          ],
        ),
      ],
    ),
  wye: () =>
    scene(
      [ray(0, 0, 90, 0, 10), ray(0, 0, 210, 0, 10), ray(0, 0, 330, 0, 10)],
      [
        junction(
          [0, 0],
          [
            { chain: 0, s: 0, dir: 1, kind: "end" },
            { chain: 1, s: 0, dir: 1, kind: "end" },
            { chain: 2, s: 0, dir: 1, kind: "end" },
          ],
        ),
      ],
    ),
  // A tee whose end arm starts short of the through (r0 = 0.6): a cap ramp.
  ramp: () =>
    scene(
      [line(-10, 0, 10, 0), ray(0, 0, 60, 0.6, 10)],
      [
        junction(
          [0, 0],
          [
            { chain: 0, s: 10, dir: 1, kind: "through" },
            { chain: 1, s: 0, dir: 1, kind: "end" },
            { chain: 0, s: 10, dir: -1, kind: "through" },
          ],
        ),
      ],
    ),
};

function census(sc: FieldScene, step = 0.05, R = 3) {
  const fb = new FormB(sc);
  const T = buildLabelB(fb);
  const counts: Record<string, number> = {};
  const bad: string[] = [];
  for (let y = -R; y <= R; y += step)
    for (let x = -R; x <= R; x += step) {
      const v = labelVerdict(fb, T, x, y, sampleOf(labelAt(fb, T, x, y)));
      const k = v.why ? `${v.cls}:${v.why}` : v.cls;
      counts[k] = (counts[k] ?? 0) + 1;
      if (v.cls === "DEFECT" && bad.length < 5) bad.push(`(${x.toFixed(3)}, ${y.toFixed(3)}) ${v.why} ref ${JSON.stringify(v.ref)}`);
    }
  return { counts, bad, T, fb };
}

describe("label B: labelAt is form B's top", () => {
  for (const [name, mk] of Object.entries(FIXTURES)) {
    it(name, () => {
      const { counts, bad } = census(mk());
      // LABELB_LOG=<file> appends each fixture's census (vitest hides console output here).
      if (process.env.LABELB_LOG) appendFileSync(process.env.LABELB_LOG, `${name} ${JSON.stringify(counts)} ${JSON.stringify(bad)}\n`);
      expect(bad).toEqual([]);
      expect(counts.agree).toBeGreaterThan(0);
    });
  }
});

describe("label B: tables", () => {
  it("the layout key changes only with a segment count (K985)", () => {
    const a = scene([line(-8, 0, 8, 0), line(0, -8, 0, 8)]);
    const b = scene([line(-8, 1, 8, 1.5), line(0.5, -8, 0, 8)]);
    const c = scene([line(-8, 0, 8, 0, 0.25), line(0, -8, 0, 8)]);
    const ka = buildLabelB(new FormB(a)).layoutKey;
    expect(buildLabelB(new FormB(b)).layoutKey).toBe(ka);
    expect(buildLabelB(new FormB(c)).layoutKey).not.toBe(ka);
  });

  it("instances are one per segment, chain-major", () => {
    const T = buildLabelB(new FormB(FIXTURES.tee()));
    expect(T.nInst).toBe(100 + 50);
    expect(Array.from(T.inst.slice(0, 4))).toEqual([0, 0, 0, 1]);
    expect(Array.from(T.inst.slice(200, 202))).toEqual([1, 0]);
  });

  it("the group count fits the word", () => {
    const T = buildLabelB(new FormB(FIXTURES.wye()));
    expect(T.nGroups).toBe(1);
    expect(MAX_GROUPS).toBe(255);
    expect(T.nFills).toBe(3);
  });

  it("the word packs and unpacks", () => {
    for (const [ch, s, code, fill, cap, closed] of [
      [0, 0, 0, false, false, false],
      [253, 99.999, 255, true, true, true],
      [17, 42.5, 3, false, true, false],
    ] as const) {
      const w = packWord(ch, s, 0, 100, code, fill, cap, closed);
      const u = unpackWord(w);
      expect(u).toEqual({ chain: ch, s11: Math.floor((s / 100) * 2047 + 0.5), code, fill, cap, closed });
      expect(w).toBeGreaterThan(0);
    }
  });
});

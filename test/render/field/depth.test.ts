// K868 S2: depth from the diagram (§3.3): pinned crossings, the blend, the
// tent where a crossing is isolated, and check 14 on the synthetic scenes.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { check14, checkContext } from "../../../src/render/field/checks";
import { type DepthChain, diagramDepth } from "../../../src/render/field/depth";
import { FieldModel } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const scene = (name: string) => JSON.parse(readFileSync(join(__dirname, "scenes", `${name}.json`), "utf8")) as FieldScene;

const open = (pins: [number, number][], len = 100): DepthChain => ({
  closed: false,
  s0: 0,
  len,
  pins: pins.map(([s, z]) => ({ s, z })),
});

describe("diagram depth", () => {
  const win = 3;
  it("pins every crossing exactly", () => {
    const c = open([
      [10, 1],
      [11, -1],
      [11.5, 1],
      [20, -1],
      [24.5, 1],
    ]);
    for (const p of c.pins) expect(diagramDepth(c, win, p.s)).toBe(p.z);
  });
  it("an isolated crossing keeps the physics tent", () => {
    const c = open([[50, 1]]);
    for (const d of [0, 0.5, 1.5, 2.9, 3, 4]) {
      const tent = Math.max(0, 1 - d / win);
      expect(diagramDepth(c, win, 50 + d)).toBeCloseTo(tent, 12);
      expect(diagramDepth(c, win, 50 - d)).toBeCloseTo(tent, 12);
    }
  });
  it("pins closer than the window are joined by a straight line", () => {
    const c = open([
      [10, 1],
      [12, -1],
      [13, -1],
    ]);
    expect(diagramDepth(c, win, 11)).toBeCloseTo(0, 12);
    expect(diagramDepth(c, win, 10.5)).toBeCloseTo(0.5, 12);
    expect(diagramDepth(c, win, 12.5)).toBeCloseTo(-1, 12); // two unders: no dip
  });
  it("between win and 2·win the tents sum, as physics sums them", () => {
    const c = open([
      [10, 1],
      [14, 1],
    ]);
    // At 12: both tents at 1 − 2/3.
    expect(diagramDepth(c, win, 12)).toBeCloseTo(2 / 3, 12);
  });
  it("is continuous along the chain and in a neighbour's position", () => {
    const c = open([
      [10, 1],
      [12.2, -1],
      [13, 1],
      [19, -1],
    ]);
    let prev = diagramDepth(c, win, 0);
    let maxJump = 0;
    for (let s = 0; s <= 30; s += 0.001) {
      const z = diagramDepth(c, win, s);
      maxJump = Math.max(maxJump, Math.abs(z - prev));
      prev = z;
    }
    // Steepest slope: 2 over 0.8 → 0.0025 per 0.001 step.
    expect(maxJump).toBeLessThan(0.0026);
    // Slide the second pin from 2.5·win away to 0.1·win away: z at a fixed s
    // changes continuously.
    let last = NaN;
    let worst = 0;
    for (let g = 2.5 * win; g >= 0.1 * win; g -= 0.001) {
      const d = open([
        [10, 1],
        [10 + g, -1],
      ]);
      const z = diagramDepth(d, win, 10.25);
      if (!Number.isNaN(last)) worst = Math.max(worst, Math.abs(z - last));
      last = z;
    }
    expect(worst).toBeLessThan(0.01);
  });
  it("wraps on a closed chain", () => {
    const c: DepthChain = {
      closed: true,
      s0: 0,
      len: 20,
      pins: [
        { s: 1, z: 1 },
        { s: 19, z: -1 },
      ],
    };
    // 19 → 21 (= 1) is a gap of 2 < win: a straight line across the seam.
    expect(diagramDepth(c, win, 0)).toBeCloseTo(0, 12);
    expect(diagramDepth(c, win, 19.5)).toBeCloseTo(-0.5, 12);
    expect(diagramDepth(c, win, 40.5)).toBeCloseTo(0.5, 12);
    const one: DepthChain = { closed: true, s0: 0, len: 4, pins: [{ s: 1, z: 1 }] };
    expect(diagramDepth(one, win, 1)).toBe(1);
    expect(diagramDepth(one, win, 3)).toBeCloseTo(2 * (1 - 2 / 3), 12); // both sides' tents
  });
});

describe("check 14", () => {
  it("passes on every crossing scene with the diagram rule", () => {
    for (const name of ["j_cross", "kink", "oblique30", "k42"]) {
      const m = new FieldModel(scene(name), { rRound: 0.5 });
      const r = check14(checkContext(m));
      expect(r.status, `${name}: ${r.value} ${r.details?.join("; ")}`).toBe("pass");
      expect(r.value).toContain("min z_over − z_under 2.000·amp");
    }
  });
  it("k42: the summed tent keeps the centres too, with less than half the margin", () => {
    // gen.ts's summed tent keeps every k42 centre (S1b's #11 passed): its
    // #6/#7 failures were inside the area the three tubes share, which
    // checksCrossings now skips and reports.
    const s = scene("k42");
    const old = check14(checkContext(new FieldModel(s, { rRound: 0.5, depth: "scene" })));
    expect(old.status).toBe("pass");
    const gap = Number(/min z_over − z_under ([\d.]+)·amp/.exec(old.value)?.[1]);
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(1);
  });
});

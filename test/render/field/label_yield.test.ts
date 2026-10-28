// K934: label ink's yield order (K940's crossed form, the only one since
// K934) and its equal-depth tie (labTie "surface", the default since K934),
// on j_cross: a T at the origin (chain 0 through, chain 1 up from it) whose
// round corner's fill reaches into chain 2's tube; chain 2 crosses chain 0
// at x = 2.5h, outside the T's cluster.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const built = JSON.parse(readFileSync(join(__dirname, "scenes", "j_cross.json"), "utf8")) as FieldScene;
const flipped: FieldScene = { ...built, crossings: built.crossings.map((x) => ({ ...x, over: x.over === "a" ? "b" : "a" })) };
const bare: FieldScene = { ...built, crossings: [] };

interface Vis {
  chain: number;
  s: number;
  J: number;
  z: number;
  fill: boolean;
}
/** The visible member at (x, y): chain id (not index), cluster, fill. */
function visible(s: FieldScene, cr: number, x: number, y: number, extra: Partial<OracleParams> = {}) {
  const h = s.look.halfWidth;
  const m = new FieldModel(s, {
    rRound: 0,
    rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(cr, h, th) : 0),
    crMax: cr,
    spans: "k883",
    ink: "label",
    ...extra,
  });
  const v = (m as unknown as { visibleAt(x: number, y: number): Vis | null }).visibleAt(x, y);
  return { m, v: v && { chain: m.idOf[v.chain], J: v.J, fill: v.fill } };
}

describe("label ink: the fill's yield order (crossed)", () => {
  it("the table decides where the T's corner fill meets chain 2's tube", () => {
    // (1.6h, 1.2h): inside corner 0's fill (cr 3, r 1.5h) and chain 2's tube.
    const at = [1.6, 1.2] as const;
    const { m, v: over2 } = visible(built, 3, ...at);
    expect(built.crossings[0]).toMatchObject({ a: { chain: 2 }, b: { chain: 0 }, over: "a" });
    expect(m.clusters.length).toBe(1);
    // Chain 2 over chain 0: the fill yields to chain 2's tube.
    expect(over2).toEqual({ chain: 2, J: -1, fill: false });
    // Chain 0 over chain 2: the fill (of chain 0's cluster) wins.
    expect(visible(flipped, 3, ...at).v).toEqual({ chain: 0, J: 0, fill: true });
    // No table crossing within σ: the fill yields.
    expect(visible(bare, 3, ...at).v).toEqual({ chain: 2, J: -1, fill: false });
  });

  it("any chain of the cluster that crosses the tube decides, not only the nearest one", () => {
    // (1.6h, 2.2h), cr 6 (r 3h): in the fill and chain 2's tube, nearer
    // chain 1 (1.6h) than chain 0 (2.2h). Chain 1 never crosses chain 2,
    // so K940's "near" form yielded here whatever the table said
    // (K940 Results: d4, m5, m6); the crossed form reads chain 0's crossing,
    // 2.2h along chain 2 (σ = πh).
    const at = [1.6, 2.2] as const;
    expect(at[0]).toBeLessThan(at[1]);
    // The fill wins, labelled by its nearest member: chain 1.
    expect(visible(flipped, 6, ...at).v).toEqual({ chain: 1, J: 0, fill: true });
    expect(visible(built, 6, ...at).v).toEqual({ chain: 2, J: -1, fill: false });
    expect(visible(bare, 6, ...at).v).toEqual({ chain: 2, J: -1, fill: false });
    // Beyond σ along chain 2 no crossing is read, and the fill yields.
    expect(visible(flipped, 6, ...at, { sigma: 1.5 }).v).toEqual({ chain: 2, J: -1, fill: false });
  });
});

describe("label ink: labTie at equal depth", () => {
  // (2.5h, 0.5h) with no crossing: chain 0 (in the T's cluster) and chain 2
  // (in none) overlap at depth 0 there.
  const at = [2.5, 0.5] as const;
  it("surface (default): a cluster's member beats a chain outside any cluster", () => {
    const d = visible(bare, 3, ...at);
    expect(d.v).toEqual({ chain: 0, J: 0, fill: false });
    expect(visible(bare, 3, ...at, { labTie: "surface" }).v).toEqual(d.v);
  });
  it("chain: the higher chain id wins", () => {
    expect(visible(bare, 3, ...at, { labTie: "chain" }).v).toEqual({ chain: 2, J: -1, fill: false });
  });
  it("a table crossing is not a tie: chain 2 over chain 0 shows chain 2 under either tie", () => {
    for (const labTie of ["surface", "chain"] as const) expect(visible(built, 3, ...at, { labTie }).v).toEqual({ chain: 2, J: -1, fill: false });
    for (const labTie of ["surface", "chain"] as const) expect(visible(flipped, 3, ...at, { labTie }).v).toEqual({ chain: 0, J: 0, fill: false });
  });
});

describe("label ink: the visible member does not depend on the visiting order (K964 class C)", () => {
  // K868 S3a3: the oracle resolves as the GPU does (tubes by depth, each
  // fill against the tube under it by the yield, fills by depth), so the
  // order the clusters are met in must not matter.
  for (const name of ["j_pair_cross", "x4_throughs", "x4_ends", "y120", "j_hook_cross"]) {
    it(name, () => {
      const s = JSON.parse(readFileSync(join(__dirname, "scenes", `${name}.json`), "utf8")) as FieldScene;
      const { m } = visible(s, 6, 0, 0);
      const { m: r } = visible(s, 6, 0, 0);
      (r as unknown as { visitReverse: boolean }).visitReverse = true;
      const at = (mm: FieldModel, x: number, y: number) => (mm as unknown as { visibleAt(x: number, y: number): Vis | null }).visibleAt(x, y);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const p of m.polys)
        for (let k = 0; k < p.x.length; k++) {
          x0 = Math.min(x0, p.x[k]);
          x1 = Math.max(x1, p.x[k]);
          y0 = Math.min(y0, p.y[k]);
          y1 = Math.max(y1, p.y[k]);
        }
      const g = m.h / 4;
      let fills = 0;
      for (let y = y0 - 2 * m.h; y <= y1 + 2 * m.h; y += g)
        for (let x = x0 - 2 * m.h; x <= x1 + 2 * m.h; x += g) {
          const a = at(m, x, y);
          expect(at(r, x, y)).toEqual(a);
          if (a?.fill) fills++;
        }
      expect(fills).toBeGreaterThan(0);
    });
  }
});
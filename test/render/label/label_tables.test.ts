// K868 S3a7: the GPU pieces' tables (src/render/label/label_tables.ts)
// against their definitions from the from-scratch build, on the tracked
// field scenes (the stage's probe runs the same checks, label_tables_check,
// on the 12 census scenes and every frame of the four sequences).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { LabelTableBuilder, refDepth, refFragDepth, TBL_W } from "../../../src/render/label/label_tables";
import { checkTables } from "./label_tables_check";

const dir = join(__dirname, "..", "field", "scenes");
const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
/** The label app's oracle params (label_app.ts rebuild). */
const params = (s: FieldScene): OracleParams => {
  const h = s.look.halfWidth;
  return {
    rRound: 0,
    rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
  };
};

describe("label tables: each table matches its definition", () => {
  for (const n of names) {
    it(n, () => {
      const s = load(n);
      const m = new FieldModel(s, params(s));
      const { c } = checkTables(m, new LabelTableBuilder(), 16);
      expect(c.pointMismatch).toBe(0);
      expect(c.maxPos).toBeLessThanOrEqual(1e-4);
      expect(c.clusterGridMissFar).toBe(0);
      expect(c.tubeMissFar).toBe(0);
      expect(c.keysEqual).toBe(true);
      expect(c.nKeys[0]).toBe(c.nKeys[1]);
      expect(c.zmin[0]).toBeCloseTo(c.zmin[1], 12);
      expect(c.zr[0]).toBeCloseTo(c.zr[1], 12);
      expect(c.smax[0]).toBe(c.smax[1]);
      // depthAt in float32, at the shader's s: float32 rounding only.
      expect(c.maxDepth).toBeLessThan(1e-5);
    });
  }
});

describe("label tables: a pure function of the frame", () => {
  it("a reused builder writes what a fresh one writes", () => {
    const [a, b] = [names[0], names[names.length - 1]].map((n) => {
      const s = load(n);
      return new FieldModel(s, params(s));
    });
    const fresh = new LabelTableBuilder().build(a);
    const want = Array.from(fresh.data.subarray(0, fresh.texels * 4));
    const wantSegs = Array.from(fresh.segs.subarray(0, fresh.nSegs * 2));
    const reused = new LabelTableBuilder();
    reused.build(b);
    reused.build(a);
    reused.build(b);
    const got = reused.build(a);
    expect(got.texels).toBe(fresh.texels);
    expect(Array.from(got.data.subarray(0, got.texels * 4))).toEqual(want);
    expect(Array.from(got.segs.subarray(0, got.nSegs * 2))).toEqual(wantSegs);
    expect(got.rows).toBe(Math.max(1, Math.ceil(got.texels / TBL_W)));
  });

  it("the tube depth: exact depth first, then the rank, then s", () => {
    // The scene with the widest depth range (one with crossings).
    const T = names
      .map((n) => {
        const s = load(n);
        return new LabelTableBuilder().build(new FieldModel(s, params(s)));
      })
      .reduce((a, b) => (b.zr > a.zr ? b : a));
    expect(T.zr).toBeGreaterThan(0.1);
    const z = T.zmin + 0.5 * T.zr;
    // Higher z is in front (smaller depth) past any rank and s, a higher
    // rank breaks an exact z tie at one s, and s orders one key at one z.
    expect(refFragDepth(T, z + 1e-3 * T.zr, 0, 0)).toBeLessThan(refFragDepth(T, z, T.nKeys - 1, T.smax));
    expect(refFragDepth(T, z, 2, 1)).toBeLessThan(refFragDepth(T, z, 1, 1));
    expect(refFragDepth(T, z, 1, 2)).toBeLessThan(refFragDepth(T, z, 1, 1));
    // Every depth lies in the tubes' band, behind nothing the fills draw.
    expect(refFragDepth(T, T.zmin + T.zr, T.nKeys - 1, T.smax)).toBeGreaterThan(0.047);
    expect(refFragDepth(T, T.zmin, 0, 0)).toBeLessThanOrEqual(0.5);
    // refDepth at a pin is the pin's z (a plateau), on every chain.
    for (let ci = 0; ci < T.nChains; ci++) {
      const pb = T.data[4 * (3 * ci + 1) + 2];
      const n = T.data[4 * (3 * ci + 1) + 3];
      for (let i = 0; i < n; i++) {
        const o = 4 * (pb + i);
        expect(refDepth(T, ci, T.data[o])).toBeCloseTo(T.data[o + 1], 5);
      }
    }
  });
});

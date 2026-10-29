// K868 S3a8b call 3: the band edges from the label tables
// (src/render/label/label_band_gpu.ts) against buildBandStrips' CPU edges,
// through the vertex shader's float32 reference (label_band_gpu_check.ts),
// on the tracked field scenes as built and with their crossings flipped
// (other clusters, so other cuts). The stage's probe band_gpu20 runs the
// same check on every frame of the four sequences.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { BandEdgeLayout, bandEdgeSources } from "../../../src/render/label/label_band_gpu";
import { buildLabelPieces } from "../../../src/render/label/label_pieces";
import { LabelTableBuilder, TBL_W } from "../../../src/render/label/label_tables";
import { checkBandEdges } from "./label_band_gpu_check";

const dir = join(__dirname, "..", "field", "scenes");
const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
/** The label app's oracle params (label_app.ts rebuild). */
const params = (s: FieldScene, sigma?: number): OracleParams => {
  const h = s.look.halfWidth;
  return {
    rRound: 0,
    rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
    sigma,
  };
};
const flip = (s: FieldScene): FieldScene => ({ ...s, crossings: s.crossings.map((x) => ({ ...x, over: x.over === "a" ? ("b" as const) : ("a" as const) })) });

describe("band edges from the tables: the CPU's edges, cut by the span table", () => {
  const seen = { segments: 0, cuts: 0 };
  const tb = new LabelTableBuilder();
  const cases = names.flatMap((n) => [
    { name: n, s: load(n), sigma: undefined as number | undefined },
    { name: `${n} flipped`, s: flip(load(n)), sigma: 1.2 * load(n).look.halfWidth },
  ]);
  for (const { name, s, sigma } of cases) {
    it(name, () => {
      const m = new FieldModel(s, params(s, sigma));
      const r = checkBandEdges(m, tb.build(m), buildLabelPieces(m));
      expect(r.diffs).toEqual([]);
      expect(r.clusterTiny).toBe(0);
      seen.segments += r.segments;
      seen.cuts += r.cuts;
    });
  }
  it("the scenes hold segments and cuts", () => {
    expect(seen.segments).toBeGreaterThan(0);
    expect(seen.cuts).toBeGreaterThan(0);
  });

  it("uploads the instances only when a chain's segment count changes", () => {
    const s = load(names[0]);
    const m = new FieldModel(s, params(s));
    const T = tb.build(m);
    const L = new BandEdgeLayout();
    expect(L.update(T)).toBe(true);
    expect(L.update(T)).toBe(false);
    const T2 = { ...T, data: T.data.slice() };
    T2.data[4 * 3 * 0 + 1] += 1;
    expect(L.update(T2)).toBe(true);
    expect(L.update(T2)).toBe(false);
    expect(L.update({ ...T2, nChains: T2.nChains - 1 })).toBe(true);
  });

  it("splits the depth variant in JS (K320: no dead text)", () => {
    const off = bandEdgeSources(TBL_W, false);
    const on = bandEdgeSources(TBL_W, true);
    for (const t of [off.vs, off.fs, on.vs, on.fs]) {
      expect(t).not.toContain("#ifdef");
      expect(t).toContain(`#define TBL_W ${TBL_W}`);
    }
    expect(off.fs).not.toContain("depthAt");
    expect(off.fs).not.toContain("uD2");
    expect(on.fs).toContain("float depthAt(");
    expect(on.fs).toContain("uniform sampler2D uD2;");
    expect(on.vs).toBe(off.vs);
  });
});

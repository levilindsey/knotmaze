// K868 S3a8b: the strips pin. buildBandStrips (the lbp-off path's tube
// edges, caps, fill arcs and switch strips) against the S3a8a code frozen in
// fixtures/label_band_ref.ts, and the switch lines against
// fixtures/label_switch_ref.ts (label_strips_pin_check.ts): every number
// bit for bit, except where a tube edge's piece ends at a cut inside its
// segment, whose outline point and normal now lie on the segment's uncut
// quad (call 2: the strips drop the cuts' kinks). On the tracked field
// scenes; the stage's probe strips_pin20 runs the same check on every frame
// of the four sequences.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { buildLabelPieces } from "../../../src/render/label/label_pieces";
import { checkStripsPin } from "./label_strips_pin_check";

const dir = join(__dirname, "..", "field", "scenes");
const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
/** The label app's oracle params (label_app.ts rebuild); sigma narrowed
 * for the flipped scenes, which switch (label_switch_cache.test.ts). */
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

describe("label strips: S3a8a's strips and switch lines, the cuts on the uncut quads", () => {
  const seen = { cuts: 0, lines: 0 };
  // Each scene as built, and with its crossings flipped at sigma 1.2 h (the
  // tracked scenes hold switch lines only so).
  const cases = names.flatMap((n) => [
    { name: n, s: load(n), sigma: undefined as number | undefined },
    { name: `${n} flipped`, s: flip(load(n)), sigma: 1.2 * load(n).look.halfWidth },
  ]);
  for (const { name, s, sigma } of cases) {
    it(name, () => {
      const m = new FieldModel(s, params(s, sigma));
      const r = checkStripsPin(m, buildLabelPieces(m));
      expect(r.diffs).toEqual([]);
      seen.cuts += r.cuts;
      seen.lines += r.lines;
    });
  }
  it("the scenes hold cuts and switch lines", () => {
    expect(seen.cuts).toBeGreaterThan(0);
    expect(seen.lines).toBeGreaterThan(0);
  });
});

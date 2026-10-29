// K868 S3a8a: the fills pin. S3a8a's CPU fixes to label_pieces.ts
// (buildLabelFills' window scan, z splits, crossing rows and DATA writes;
// buildLabelPiecesGpu's rank keys) must write what the S3a7 code wrote,
// frozen in fixtures/label_fills_ref.ts: the same DATA texture (chain
// table, window records, crossing rows), fill instances, rank keys and
// stats, in the same order, bit for bit (label_fills_pin_check.ts). On the
// tracked field scenes; the stage's probe fills_pin18 runs the same check
// on the 12 census scenes and every frame of the four sequences. The pin
// holds the z-split path (gpuFills false); the GPU fills (LABEL_GPU_FILLS,
// the lbp default) are held to the same windows by checkGpuFillsWindows:
// the same pieces, fills and crossing rows, ends within 1e-4.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { LabelTableBuilder } from "../../../src/render/label/label_tables";
import { checkFillsPin, checkGpuFillsWindows } from "./label_fills_pin_check";

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

describe("label fills: the records S3a7 wrote, bit for bit", () => {
  const builder = new LabelTableBuilder();
  const seen = { fills: 0, windowRecords: 0, crossingRows: 0 };
  for (const n of names) {
    it(n, () => {
      const s = load(n);
      const m = new FieldModel(s, params(s));
      const r = checkFillsPin(m, builder.build(m));
      expect(r.pieces).toEqual([]);
      expect(r.fills).toEqual([]);
      seen.fills += r.counts.nFills;
      seen.windowRecords += r.counts.windowRecords;
      seen.crossingRows += r.counts.crossingRows;
    });
  }
  it("the scenes write every kind of record", () => {
    expect(seen.fills).toBeGreaterThan(0);
    expect(seen.windowRecords).toBeGreaterThan(0);
    expect(seen.crossingRows).toBeGreaterThan(0);
  });
});

describe("label fills: the GPU fills' windows are the z-split windows' pieces", () => {
  const builder = new LabelTableBuilder();
  let records = 0;
  for (const n of names) {
    it(n, () => {
      const s = load(n);
      const m = new FieldModel(s, params(s));
      const r = checkGpuFillsWindows(m, builder.build(m));
      expect(r.diffs).toEqual([]);
      expect(r.maxPos).toBeLessThanOrEqual(1e-4);
      records += r.records;
    });
  }
  it("the scenes write window records", () => {
    expect(records).toBeGreaterThan(0);
  });
});
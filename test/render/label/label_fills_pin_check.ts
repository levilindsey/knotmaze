// K868 S3a8a: the fills pin's comparison, shared by label_fills_pin.test.ts
// (the tracked field scenes) and the stage's probe (fills_pin18, the 12
// census scenes and every frame of the four sequences): today's
// buildLabelPiecesGpu and buildLabelFills against the frozen S3a7 code
// (fixtures/label_fills_ref.ts), record for record and bit for bit, over
// what LabelPass uploads (the DATA texture's dataRows rows, nFills fill
// instances, nTubes rank key records) and every scalar and stat.
import type { FieldModel } from "../../../src/render/field/oracle";
import { buildLabelFills, buildLabelPiecesGpu, DATA_W, FILL_FLOATS, TUBE_FLOATS, type LabelFills, type LabelPieces } from "../../../src/render/label/label_pieces";
import type { LabelTables } from "../../../src/render/label/label_tables";
import { buildLabelFillsRef, buildLabelPiecesGpuRef, vertexRangesRef } from "./fixtures/label_fills_ref";

/** The first of the n leading floats where a and b differ in their bits
 * (-0 and NaN payloads included), or -1 when they are the same. */
export function firstBitDiff(a: Float32Array, b: Float32Array, n: number): number {
  if (a.length < n || b.length < n) return Math.min(a.length, b.length);
  const ua = new Uint32Array(a.buffer, a.byteOffset, n);
  const ub = new Uint32Array(b.buffer, b.byteOffset, n);
  for (let i = 0; i < n; i++) if (ua[i] !== ub[i]) return i;
  return -1;
}

function arr(out: string[], name: string, a: Float32Array, b: Float32Array, n: number, w: number): void {
  const i = firstBitDiff(a, b, n);
  if (i >= 0) out.push(`${name}[${i}] (record ${Math.floor(i / w)}, float ${i % w}): ${a[i]} vs ${b[i]}`);
}

function same(out: string[], name: string, a: unknown, b: unknown): void {
  if (!Object.is(a, b)) out.push(`${name}: ${String(a)} vs ${String(b)}`);
}

/** Every difference between got's fills and want's, as text (none: []). */
export function diffFills(got: LabelFills, want: LabelFills): string[] {
  const out: string[] = [];
  for (const k of ["nFills", "dataRows", "g2Skipped", "windowRecords", "crossingRows"] as const) same(out, k, got[k], want[k]);
  if (out.length) return out;
  arr(out, "fills", got.fills, want.fills, want.nFills * FILL_FLOATS, FILL_FLOATS);
  arr(out, "data", got.data, want.data, DATA_W * want.dataRows * 4, 4);
  return out;
}

/** Every difference between got's pieces and want's, as text (none: []). */
export function diffPieces(got: LabelPieces, want: LabelPieces): string[] {
  const out: string[] = [];
  for (const k of ["nTubes", "nFills", "dataRows", "h", "sigma", "zmin", "zr", "smax", "nKeys", "keysOnly"] as const) same(out, k, got[k], want[k]);
  for (const k of Object.keys(want.stats) as (keyof LabelPieces["stats"])[]) same(out, `stats.${k}`, got.stats[k], want.stats[k]);
  if (out.length) return out;
  arr(out, "tubes", got.tubes, want.tubes, Math.max(1, want.nTubes) * TUBE_FLOATS, TUBE_FLOATS);
  arr(out, "fills", got.fills, want.fills, want.nFills * FILL_FLOATS, FILL_FLOATS);
  arr(out, "data", got.data, want.data, DATA_W * want.dataRows * 4, 4);
  return out;
}

/** The pin on one frame: buildLabelPiecesGpu (the lbp path) and
 * buildLabelFills at the reference's ZTOL (the path lbp off shares). */
export function checkFillsPin(
  m: FieldModel,
  T: LabelTables
): { pieces: string[]; fills: string[]; counts: { nFills: number; windowRecords: number; crossingRows: number } } {
  const want = buildLabelPiecesGpuRef(m, T);
  const pieces = diffPieces(buildLabelPiecesGpu(m, T), want);
  const vr = vertexRangesRef(m);
  const ZTOL = 1e-4 * Math.max(vr.zmax - vr.zmin, 1e-9);
  const fills = diffFills(buildLabelFills(m, ZTOL, T.rankOf, T.keys.length), buildLabelFillsRef(m, ZTOL, T.rankOf, T.keys.length));
  const counts = { nFills: want.nFills, windowRecords: want.stats.windowRecords, crossingRows: want.stats.crossingRows };
  return { pieces, fills, counts };
}
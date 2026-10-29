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

/** The pin on one frame: buildLabelPiecesGpu without the GPU fills (the
 * lbp path S3a7 shipped) and buildLabelFills at the reference's ZTOL (the
 * path lbp off shares), both with gpuFills false whatever
 * LABEL_GPU_FILLS says. */
export function checkFillsPin(
  m: FieldModel,
  T: LabelTables
): { pieces: string[]; fills: string[]; counts: { nFills: number; windowRecords: number; crossingRows: number } } {
  const want = buildLabelPiecesGpuRef(m, T);
  const pieces = diffPieces(buildLabelPiecesGpu(m, T, false), want);
  const vr = vertexRangesRef(m);
  const ZTOL = 1e-4 * Math.max(vr.zmax - vr.zmin, 1e-9);
  const fills = diffFills(buildLabelFills(m, ZTOL, T.rankOf, T.keys.length, false), buildLabelFillsRef(m, ZTOL, T.rankOf, T.keys.length));
  const counts = { nFills: want.nFills, windowRecords: want.stats.windowRecords, crossingRows: want.stats.crossingRows };
  return { pieces, fills, counts };
}

/** K868 S3a8a: the GPU fills' windows against the S3a7 code's. The
 * reference at ZTOL = Infinity never splits, so it writes one 3-texel
 * record per segment piece of each window: the GPU fills' 2-texel records
 * must be the same pieces in the same order (count, chain and direction
 * bit for bit), every fill instance the same apart from its window and
 * crossing offsets, its crossing rows bit for bit, and each piece's ends
 * as the fill shader computes them in float32 (a + (b - a) t from the
 * tables' points, t = ta, tb) within `tol` of the reference's. */
export function checkGpuFillsWindows(
  m: FieldModel,
  T: LabelTables,
  tol = 1e-4
): { diffs: string[]; records: number; maxPos: number } {
  const R = buildLabelFillsRef(m, Infinity, T.rankOf, T.keys.length);
  const G = buildLabelFills(m, 0, T.rankOf, T.keys.length, true);
  const out: string[] = [];
  for (const k of ["nFills", "g2Skipped", "windowRecords", "crossingRows"] as const) same(out, k, G[k], R[k]);
  if (out.length) return { diffs: out, records: 0, maxPos: NaN };
  const f = Math.fround;
  const D = T.data;
  let records = 0;
  let maxPos = 0;
  for (let i = 0; i < R.nFills && out.length < 8; i++) {
    const o = i * FILL_FLOATS;
    for (let j = 0; j < FILL_FLOATS; j++) {
      if (j >= 12 && j <= 16) continue; // offA, cntA, offB, cntB, xOff
      if (!Object.is(G.fills[o + j], R.fills[o + j])) out.push(`fill ${i} float ${j}: ${G.fills[o + j]} vs ${R.fills[o + j]}`);
    }
    const gx = G.fills[o + 16] * 4;
    const rx = R.fills[o + 16] * 4;
    for (let r = 0; r < R.fills[o + 17] * 4; r++) {
      if (!Object.is(G.data[gx + r], R.data[rx + r])) {
        out.push(`fill ${i} crossing rows float ${r}: ${G.data[gx + r]} vs ${R.data[rx + r]}`);
        break;
      }
    }
    for (const w of [12, 14]) {
      const go = G.fills[o + w];
      const ro = R.fills[o + w];
      const n = R.fills[o + w + 1];
      same(out, `fill ${i} window ${w} count`, G.fills[o + w + 1], n);
      for (let r = 0; r < n && out.length < 8; r++) {
        const g = (go + 2 * r) * 4;
        const q = (ro + 3 * r) * 4;
        const ta = G.data[g];
        const tb = G.data[g + 1];
        const ci = G.data[g + 2];
        const k = G.data[g + 3];
        same(out, `fill ${i} window ${w} record ${r} chain`, ci, R.data[q + 10]);
        same(out, `fill ${i} window ${w} record ${r} tx`, G.data[g + 4], R.data[q + 8]);
        same(out, `fill ${i} window ${w} record ${r} ty`, G.data[g + 5], R.data[q + 9]);
        const pk = (D[12 * ci] + k) * 4;
        const ax = D[pk];
        const ay = D[pk + 1];
        const dx = f(D[pk + 4] - ax);
        const dy = f(D[pk + 5] - ay);
        const e = [
          f(ax + f(dx * ta)) - R.data[q],
          f(ay + f(dy * ta)) - R.data[q + 1],
          f(ax + f(dx * tb)) - R.data[q + 2],
          f(ay + f(dy * tb)) - R.data[q + 3],
        ];
        for (const v of e) maxPos = Math.max(maxPos, Math.abs(v));
        if (e.some((v) => !(Math.abs(v) <= tol))) out.push(`fill ${i} window ${w} record ${r} ends off by ${e.map((v) => v.toExponential(2)).join(", ")}`);
        records++;
      }
    }
  }
  return { diffs: out, records, maxPos };
}
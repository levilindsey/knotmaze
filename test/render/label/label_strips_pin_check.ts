// K868 S3a8b: the strips pin's check, shared by label_strips_pin.test.ts
// and the stage's probe (strips_pin20 runs it on every frame of the four
// sequences). Today's buildBandStrips against the frozen S3a8a copy
// (fixtures/label_band_ref.ts):
// - every number of every strip bit for bit, except at a cut: where a
//   tube edge's piece ends inside its segment (a span bound), its outline
//   point and normal lie on the segment's UNCUT quad (call 2): within a
//   float32 rounding of the uncut edge's endpoints interpolated at the
//   cut's t. The uncut quads are the frozen copy's strips on the same
//   model with no span bounds (one piece per segment);
// - the switch lines, line for line and bit for bit (findSwitchLines and
//   the cached path's switchLinesFrom against fixtures/label_switch_ref.ts).
import type { FieldModel } from "../../../src/render/field/oracle";
import { BAND_FLOATS, buildBandStrips } from "../../../src/render/label/label_band";
import type { LabelPieces } from "../../../src/render/label/label_pieces";
import { findSwitchLines, sameSwitchLines, switchLinesFrom, switchTopo } from "../../../src/render/label/label_switch";
import { buildBandStripsRef } from "./fixtures/label_band_ref";
import { findSwitchLinesRef } from "./fixtures/label_switch_ref";

export interface StripsPinResult {
  /** Differences, described; empty when the pin holds. */
  diffs: string[];
  /** Cut ends checked against their uncut quads. */
  cuts: number;
  /** The largest distance of a cut's outline point (world) and normal from the uncut quad's. */
  maxQ: number;
  maxN: number;
  strips: number;
  lines: number;
}

const FLAG_NOT_EDGE = 1 | 2 | 8;

/** The pieces' layout as the frozen copy cuts them: per chain, the ok
 * segments in order, each with its cuts (sA, the bounds inside, sB). */
function layout(m: FieldModel, ci: number): { k: number; cuts: number[] }[] {
  const p = m.polys[ci];
  const ok: boolean[] = [];
  for (let k = 0; k < p.nseg; k++) {
    const b = k + 1 === p.n ? 0 : k + 1;
    const dx = p.x[b] - p.x[k];
    const dy = p.y[b] - p.y[k];
    ok.push(Math.sqrt(dx * dx + dy * dy) > 1e-9);
  }
  if (!ok.some((v) => v)) return [];
  const shifts = p.closed ? [-p.len, 0, p.len] : [0];
  const bounds: number[] = [];
  for (const [lo, hi] of m.chainSpans[ci]) for (const sh of shifts) bounds.push(lo + sh, hi + sh);
  bounds.sort((a, b) => a - b);
  const out: { k: number; cuts: number[] }[] = [];
  for (let k = 0; k < p.nseg; k++) {
    if (!ok[k]) continue;
    const sA = p.s[k];
    const sB = sA + p.segLen[k];
    const cuts: number[] = [sA];
    const tiny = Math.max(1e-9, (sB - sA) * 1e-9);
    for (const x of bounds) if (x > sA + tiny && x < sB - tiny && x > cuts[cuts.length - 1]) cuts.push(x);
    cuts.push(sB);
    out.push({ k, cuts });
  }
  return out;
}

export function checkStripsPin(m: FieldModel, lp: LabelPieces): StripsPinResult {
  const diffs: string[] = [];
  const linesRef = findSwitchLinesRef(m);
  const lines = findSwitchLines(m);
  if (!sameSwitchLines(lines, linesRef)) diffs.push(`switch lines differ (${lines.length} vs ${linesRef.length})`);
  if (!sameSwitchLines(switchLinesFrom(switchTopo(m), m), linesRef)) diffs.push("cached switch lines differ");
  const ref = buildBandStripsRef(m, lp, linesRef);
  const now = buildBandStrips(m, lp, lines);
  // The uncut quads: the frozen copy on the model with no span bounds.
  const mU = Object.create(m) as FieldModel;
  Object.defineProperty(mU, "chainSpans", { value: m.polys.map(() => []) });
  const unc = buildBandStripsRef(mU, lp, []);
  const res: StripsPinResult = { diffs, cuts: 0, maxQ: 0, maxN: 0, strips: now.n, lines: lines.length };
  if (now.n !== ref.n) {
    diffs.push(`strip count ${now.n} vs ${ref.n}`);
    return res;
  }
  for (const key of ["edges", "caps", "arcs", "switches"] as const)
    if (now.stats[key] !== ref.stats[key]) diffs.push(`stats.${key} ${now.stats[key]} vs ${ref.stats[key]}`);
  // Which strip ends are cuts, and their uncut quads: walk the layout.
  // cutAt[i * 2 + e] = the uncut strip index and t for strip i's end e (A 0, B 1).
  const cutU = new Int32Array(2 * now.n).fill(-1);
  const cutT = new Float64Array(2 * now.n);
  let i = 0;
  let iu = 0;
  const R = ref.strips;
  const U = unc.strips;
  for (let ci = 0; ci < m.polys.length; ci++) {
    for (const { cuts } of layout(m, ci)) {
      const sA = cuts[0];
      const sB = cuts[cuts.length - 1];
      for (let j = 0; j + 1 < cuts.length; j++) {
        for (let sd = 0; sd < 2; sd++) {
          const o = (i + sd) * BAND_FLOATS;
          if (R[o + 8] !== ci + 1 || (R[o + 10] & FLAG_NOT_EDGE) !== 0 || R[o + 12] !== Math.fround(cuts[j]) || R[o + 13] !== Math.fround(cuts[j + 1]))
            diffs.push(`layout: strip ${i + sd} is not chain ${ci}'s piece [${cuts[j]}, ${cuts[j + 1]}]`);
          if (j > 0) {
            cutU[2 * (i + sd)] = iu + sd;
            cutT[2 * (i + sd)] = (cuts[j] - sA) / (sB - sA);
          }
          if (j + 2 < cuts.length) {
            cutU[2 * (i + sd) + 1] = iu + sd;
            cutT[2 * (i + sd) + 1] = (cuts[j + 1] - sA) / (sB - sA);
          }
        }
        i += 2;
      }
      iu += 2;
    }
    // The chain's caps follow its edges, in both lists.
    while (i < now.n && R[i * BAND_FLOATS + 8] === ci + 1 && (R[i * BAND_FLOATS + 10] & 2) === 2) i++;
    while (iu < unc.n && U[iu * BAND_FLOATS + 8] === ci + 1 && (U[iu * BAND_FLOATS + 10] & 2) === 2) iu++;
  }
  if (diffs.length) return res;
  const N = now.strips;
  for (let s = 0; s < now.n; s++) {
    const o = s * BAND_FLOATS;
    for (let f = 0; f < BAND_FLOATS; f++) {
      // aQ: A at 0-1, B at 2-3; aN: A at 4-5, B at 6-7.
      const end = f < 8 ? (f % 4 < 2 ? 0 : 1) : -1;
      const u = end >= 0 ? cutU[2 * s + end] : -1;
      if (u >= 0) continue;
      if (!Object.is(N[o + f], R[o + f])) {
        if (diffs.length < 20) diffs.push(`strip ${s} float ${f}: ${N[o + f]} vs ${R[o + f]}`);
      }
    }
    for (let end = 0; end < 2; end++) {
      const u = cutU[2 * s + end];
      if (u < 0) continue;
      res.cuts++;
      const t = cutT[2 * s + end];
      const ou = u * BAND_FLOATS;
      for (const [f, fa, fb, isQ] of [
        [2 * end, 0, 2, true],
        [2 * end + 1, 1, 3, true],
        [4 + 2 * end, 4, 6, false],
        [4 + 2 * end + 1, 5, 7, false],
      ] as [number, number, number, boolean][]) {
        const want = (1 - t) * U[ou + fa] + t * U[ou + fb];
        const d = Math.abs(N[o + f] - want);
        const tol = isQ ? 1e-6 * Math.max(1, Math.abs(want)) : 3e-7;
        if (isQ) res.maxQ = Math.max(res.maxQ, d);
        else res.maxN = Math.max(res.maxN, d);
        if (!(d <= tol) && diffs.length < 20) diffs.push(`strip ${s} cut end ${end} float ${f}: ${N[o + f]} vs uncut ${want} (t ${t})`);
      }
    }
  }
  return res;
}

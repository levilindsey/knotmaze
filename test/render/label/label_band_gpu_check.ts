// K868 S3a8b: the same-answer check of call 3's band edges
// (src/render/label/label_band_gpu.ts) against buildBandStrips' CPU edges,
// shared by label_band_gpu.test.ts (the tracked scenes) and the stage's
// probe band_gpu20 (every frame of the four sequences). Per chain segment
// and side, refBandEdge (EDGE_VS in float32, from the tables) against the
// CPU's pieces of that segment (call 2: each piece is the part of the
// segment's uncut quad between its cuts):
// - the same segments drawn (one with no direction draws nothing on either
//   path);
// - at the segment's ends: the outline point (world), the normal and s;
// - at a cut: the CPU's cut point against the GPU edge's point where the
//   fragment's s (s[k] + t segLen[k], float32) reaches the span bound
//   (float32), where its cluster switches;
// - each piece's cluster against the span table's at the piece's middle
//   (refCluster: the fragment's search). A piece shorter than float32's
//   resolution of s may differ: counted, not failed.
// The gate is TOL (world, and unit normals); the maxima are reported.
import type { FieldModel } from "../../../src/render/field/oracle";
import { BAND_FLOATS, buildBandStrips } from "../../../src/render/label/label_band";
import { refBandEdge } from "../../../src/render/label/label_band_gpu";
import type { LabelPieces } from "../../../src/render/label/label_pieces";
import { type LabelTables, refCluster, refS } from "../../../src/render/label/label_tables";

export const TOL = 1e-4;

export interface BandEdgeCheck {
  /** Differences, described (at most 20); empty when the check holds. */
  diffs: string[];
  /** Segments drawn, CPU pieces, and cut ends checked. */
  segments: number;
  pieces: number;
  cuts: number;
  /** The largest distances: outline points and normals at segment ends,
   * cut points, s at segment ends. */
  maxQ: number;
  maxN: number;
  maxCut: number;
  maxS: number;
  /** Pieces below float32's resolution of s whose cluster differs. */
  clusterTiny: number;
}

const f = Math.fround;

export function checkBandEdges(m: FieldModel, T: LabelTables, lp: LabelPieces): BandEdgeCheck {
  const st = buildBandStrips(m, lp, []);
  const S = st.strips;
  const r: BandEdgeCheck = { diffs: [], segments: 0, pieces: 0, cuts: 0, maxQ: 0, maxN: 0, maxCut: 0, maxS: 0, clusterTiny: 0 };
  const diff = (s: string): void => {
    if (r.diffs.length < 20) r.diffs.push(s);
  };
  // The CPU's tube edges in emission order: no cap, fill or switch bit.
  const edges: number[] = [];
  for (let i = 0; i < st.n; i++) if ((S[i * BAND_FLOATS + 10] & 11) === 0) edges.push(i * BAND_FLOATS);
  let e = 0;
  const h = m.h;
  for (let ci = 0; ci < m.polys.length; ci++) {
    const p = m.polys[ci];
    // buildBandStrips' segments (float64 length > 1e-9) and cuts.
    const okSeg = (k: number): boolean => {
      const b = k + 1 === p.n ? 0 : k + 1;
      const dx = p.x[b] - p.x[k];
      const dy = p.y[b] - p.y[k];
      return Math.sqrt(dx * dx + dy * dy) > 1e-9;
    };
    let anyOk = false;
    for (let k = 0; k < p.nseg && !anyOk; k++) anyOk = okSeg(k);
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    const bounds: number[] = [];
    for (const [lo, hi] of m.chainSpans[ci]) for (const sh of shifts) bounds.push(lo + sh, hi + sh);
    bounds.sort((a, b) => a - b);
    const pt = Math.round(T.data[4 * 3 * ci]);
    for (let k = 0; k < p.nseg; k++) {
      const cpuOk = anyOk && okSeg(k);
      const g0 = refBandEdge(T, ci, k, 0, h);
      const g1 = refBandEdge(T, ci, k, 1, h);
      if (g0.ok !== cpuOk) diff(`chain ${ci} segment ${k}: drawn on the CPU ${cpuOk}, from the tables ${g0.ok}`);
      if (!cpuOk) continue;
      if (g0.ok) r.segments++;
      const sA = p.s[k];
      const sB = sA + p.segLen[k];
      const cuts: number[] = [sA];
      const tiny = Math.max(1e-9, (sB - sA) * 1e-9);
      for (const x of bounds) if (x > sA + tiny && x < sB - tiny && x > cuts[cuts.length - 1]) cuts.push(x);
      cuts.push(sB);
      const sk = f(T.data[4 * (pt + k) + 2]);
      const sl = f(T.data[4 * (pt + k) + 3]);
      for (let i = 0; i + 1 < cuts.length; i++) {
        for (const g of [g0, g1]) {
          if (e >= edges.length) {
            diff(`chain ${ci} segment ${k}: the CPU has no more edges`);
            return r;
          }
          const o = edges[e++];
          if (S[o + 8] !== ci + 1) diff(`chain ${ci} segment ${k} piece ${i}: the CPU edge is chain ${S[o + 8] - 1}'s`);
          if (!g.ok) continue;
          if (g === g0) r.pieces++;
          // The GPU edge's point where the fragment's s reaches u (float32).
          const at = (u: number): [number, number] => {
            const t = sl > 0 ? (f(u) - sk) / sl : 0;
            return [g.ax + (g.bx - g.ax) * t, g.ay + (g.by - g.ay) * t];
          };
          if (i === 0) {
            r.maxQ = Math.max(r.maxQ, Math.hypot(S[o] - g.ax, S[o + 1] - g.ay));
            r.maxN = Math.max(r.maxN, Math.hypot(S[o + 4] - g.nax, S[o + 5] - g.nay));
            r.maxS = Math.max(r.maxS, Math.abs(S[o + 12] - g.sa));
          } else {
            const [x, y] = at(cuts[i]);
            r.maxCut = Math.max(r.maxCut, Math.hypot(S[o] - x, S[o + 1] - y));
            r.cuts++;
          }
          if (i + 2 === cuts.length) {
            r.maxQ = Math.max(r.maxQ, Math.hypot(S[o + 2] - g.bx, S[o + 3] - g.by));
            r.maxN = Math.max(r.maxN, Math.hypot(S[o + 6] - g.nbx, S[o + 7] - g.nby));
            r.maxS = Math.max(r.maxS, Math.abs(S[o + 13] - g.sb));
          } else {
            const [x, y] = at(cuts[i + 1]);
            r.maxCut = Math.max(r.maxCut, Math.hypot(S[o + 2] - x, S[o + 3] - y));
            r.cuts++;
          }
          if (g === g0) {
            // The fragment's s at the piece's middle, and its span.
            const tm = sl > 0 ? ((cuts[i] + cuts[i + 1]) / 2 - sA) / (sB - sA) : 0;
            const cl = refCluster(T, ci, refS(T, ci, k, tm))[0];
            if (cl !== S[o + 9] - 1) {
              if (f(cuts[i + 1]) - f(cuts[i]) <= 4 * Math.abs(f(cuts[i]) - f(cuts[i] * (1 + 2 ** -23)))) r.clusterTiny++;
              else diff(`chain ${ci} segment ${k} piece ${i}: cluster ${S[o + 9] - 1} on the CPU, ${cl} from the span table`);
            }
          }
        }
      }
    }
  }
  if (e !== edges.length) diff(`the CPU drew ${edges.length} edges, the check walked ${e}`);
  for (const [name, v] of [["outline point", r.maxQ], ["normal", r.maxN], ["cut point", r.maxCut], ["s", r.maxS]] as const) {
    if (!(v <= TOL)) diff(`${name}: max ${v.toExponential(3)} > ${TOL}`);
  }
  return r;
}

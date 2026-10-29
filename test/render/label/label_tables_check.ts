// K868 S3a7: the GPU pieces' same-answer checks against the from-scratch
// build, shared by label_tables.test.ts (the tracked field scenes) and the
// stage's probes (the 12 census scenes and every frame of the four
// sequences). Each table against its definition:
//   points  (x, y, s, segLen) = the poly's, as float32;
//   spans   the cluster at s = FieldModel.clusterAt (a fine s grid, and
//           every buildLabelPieces tube's own cluster);
//   pins    the per-fragment depth (refDepth) = FieldModel.depthAt, at a
//           fine s grid per segment (s as the shader computes it);
//   ranks   every tube's rank = buildLabelPieces', the keys and nKeys too;
//   points  every tube vertex (buildLabelPieces' aAB) against the segment's
//           point at the tube's s, in float32 (refPoint).
import type { FieldModel } from "../../../src/render/field/oracle";
import { buildLabelPieces, TUBE_FLOATS } from "../../../src/render/label/label_pieces";
import { LabelTableBuilder, refCluster, refDepth, refPoint, refS, type LabelTables } from "../../../src/render/label/label_tables";

export interface TableCheck {
  segs: number;
  tubes: number;
  pointMismatch: number;
  maxPos: number;
  maxPosAt: string;
  clusterGrid: number;
  clusterGridMiss: number;
  clusterGridMissFar: number;
  tubeClusterMiss: number;
  tubeRankMiss: number;
  /** Tube misses not within an ulp of a span bound (sub-ulp tubes are float32 rounding). */
  tubeMissFar: number;
  maxDepth: number;
  maxDepthAt: string;
  maxDepthSameS: number;
  keysEqual: boolean;
  nKeys: [number, number];
  zmin: [number, number];
  zr: [number, number];
  smax: [number, number];
}

const f = Math.fround;

/** The segment k whose [s[k], s[k] + segLen[k]] holds s. */
export function segOf(p: FieldModel["polys"][number], s: number): number {
  let lo = 0;
  let hi = p.nseg - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (p.s[mid] <= s) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function checkTables(m: FieldModel, builder = new LabelTableBuilder(), grid = 16): { T: LabelTables; c: TableCheck } {
  const T = builder.build(m);
  const P = buildLabelPieces(m);
  const c: TableCheck = {
    segs: T.nSegs,
    tubes: P.nTubes,
    pointMismatch: 0,
    maxPos: 0,
    maxPosAt: "",
    clusterGrid: 0,
    clusterGridMiss: 0,
    clusterGridMissFar: 0,
    tubeClusterMiss: 0,
    tubeRankMiss: 0,
    tubeMissFar: 0,
    maxDepth: 0,
    maxDepthAt: "",
    maxDepthSameS: 0,
    keysEqual: true,
    nKeys: [T.nKeys, P.nKeys],
    zmin: [T.zmin, P.zmin],
    zr: [T.zr, P.zr],
    smax: [T.smax, P.smax],
  };
  // Points: the table's (x, y, s, segLen) = the poly's.
  for (let ci = 0; ci < m.polys.length; ci++) {
    const p = m.polys[ci];
    const pb = T.data[12 * ci];
    for (let k = 0; k < p.nseg; k++) {
      const o = 4 * (pb + k);
      if (T.data[o] !== f(p.x[k]) || T.data[o + 1] !== f(p.y[k]) || T.data[o + 2] !== f(p.s[k]) || T.data[o + 3] !== f(p.segLen[k])) c.pointMismatch++;
    }
  }
  // Spans and pins on a fine grid per segment; bounds within an ulp of s
  // are counted apart (clusterGridMissFar counts the others).
  const bounds = (ci: number): number[] => {
    const p = m.polys[ci];
    const out: number[] = [];
    for (const [lo, hi] of m.chainSpans[ci]) for (const sh of p.closed ? [-p.len, 0, p.len] : [0]) out.push(lo + sh, hi + sh);
    return out;
  };
  for (let ci = 0; ci < m.polys.length; ci++) {
    const p = m.polys[ci];
    const B = bounds(ci);
    for (let k = 0; k < p.nseg; k++) {
      for (let j = 0; j <= grid; j++) {
        const t = j / grid;
        const s = refS(T, ci, k, t);
        const [cl] = refCluster(T, ci, s);
        const want = m.clusterAt(ci, s);
        c.clusterGrid++;
        if (cl !== want) {
          c.clusterGridMiss++;
          const near = B.some((b) => Math.abs(b - s) <= 4e-7 * Math.max(1, Math.abs(s)) + 1e-9);
          if (!near) c.clusterGridMissFar++;
        }
        const z = refDepth(T, ci, s);
        const zs = m.depthAt(ci, s);
        const zt = m.depthAt(ci, p.s[k] + t * p.segLen[k]);
        const d = Math.abs(z - zs) / T.zr;
        if (d > c.maxDepth) {
          c.maxDepth = d;
          c.maxDepthAt = `chain ${m.idOf[ci]} k ${k} t ${t} s ${s}`;
        }
        c.maxDepthSameS = Math.max(c.maxDepthSameS, Math.abs(z - zt) / T.zr);
      }
    }
  }
  // Every tube of buildLabelPieces: its cluster, its rank, its two vertices.
  const keysP = new Set<number>();
  for (let i = 0; i < P.nTubes; i++) {
    const b = i * TUBE_FLOATS;
    const ci = P.tubes[b + 8];
    const cl = P.tubes[b + 9];
    const p = m.polys[ci];
    const u0 = P.tubes[b + 4];
    const u1 = P.tubes[b + 5];
    keysP.add(cl >= 0 ? 1e6 + cl : m.idOf[ci]);
    const k = segOf(p, (u0 + u1) / 2);
    const [tcl, trk] = refCluster(T, ci, (u0 + u1) / 2);
    if (tcl !== cl) c.tubeClusterMiss++;
    if (trk !== P.tubes[b + 10]) c.tubeRankMiss++;
    if (tcl !== cl || trk !== P.tubes[b + 10]) {
      const sm = (u0 + u1) / 2;
      if (!bounds(ci).some((x) => Math.abs(x - sm) <= 4e-7 * Math.max(1, Math.abs(sm)) + 1e-9)) c.tubeMissFar++;
    }
    const sk = f(p.s[k]);
    const sl = f(p.segLen[k]);
    for (let e = 0; e < 2; e++) {
      const u = P.tubes[b + 4 + e];
      const t = sl > 0 ? f(f(u - sk) / sl) : 0;
      const [x, y] = refPoint(T, ci, k, t);
      const d = Math.max(Math.abs(x - P.tubes[b + 2 * e]), Math.abs(y - P.tubes[b + 2 * e + 1]));
      if (d > c.maxPos) {
        c.maxPos = d;
        c.maxPosAt = `chain ${m.idOf[ci]} k ${k} t ${t}`;
      }
    }
  }
  const kp = [...keysP].sort((a, b) => a - b);
  c.keysEqual = kp.length === T.keys.length && kp.every((x, i) => x === T.keys[i]);
  return { T, c };
}

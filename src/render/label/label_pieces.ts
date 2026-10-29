// K868 S3a2: the label pass's pieces, built on the CPU from the oracle's
// FieldModel (src/render/field/oracle.ts). Pure: no GL. The module map is
// in label_app.ts's header.
//
// TUBES (S3a v6, label_check_v6.ts): one instanced capsule per straight
// piece of every chain. Each chain segment is split where depthAt bends
// (z linear per piece to 1e-4 of the z range, down to 1/64 of a segment),
// then at EVERY cluster switch: the boundaries of chainSpans are where
// clusterAt changes, so each piece carries exactly one cluster (v6 drew one
// switch per piece and counted the pieces with more as multiSwitch).
//
// FILLS: one instance per drawn corner (r > 0, ok, no G2 curve: inFill's
// g1 wedge). Its two arm windows go into the data texture as segment
// records in footInWindow's order, and its cluster's rows of the crossing
// table (fillOrder) after them, prefiltered to the crossings a tube under
// the fill can reach (within vq + 2h + σ of a corner's q).
//
// DATA (one RGBA32F texture, DATA_W texels a row, texelFetch only):
//   [0, nChains)  chain table: s0, len, closed, 0 (the packed s decodes)
//   window records, 3 texels each: (ax, ay, bx, by), (sa, sb, za, zb),
//     (tx, ty, chain, 0) = the clipped sub-segment, its s and z at both
//     ends (unshifted s, as footInWindow returns it), and the WHOLE
//     segment's direction times the arm's dir (inFill's side test)
//   crossing rows, 1 texel each: (chain, s, over, wrap length or 0)
// K868 S3a8a, with the GPU pieces on (gpuFills): a window's records are 2
// texels each, one per segment piece in the window, (ta, tb, chain, k) and
// (tx, ty, 0, 0); the fill shader takes the segment, its s and the exact
// depth from the tables, so no z splits (and no ZTOL) on the CPU.
import type { FieldModel } from "../field/oracle";
import { normS, pointAt, segB } from "../field/geom";
import type { LabelTables } from "./label_tables";

/** Floats per tube instance: aAB, aS, aK (chain, cluster, rank, flags),
 * aN (next direction, endKind, startKind), aC (chain s0, 1 / len). */
export const TUBE_FLOATS = 18;
/** Floats per fill instance: aQ (q, r, vq + h), aU (uA, uB), aJ (cluster,
 * rank, sign, 0), aO (window texel offsets and record counts), aX (crossing
 * row offset and count). */
export const FILL_FLOATS = 18;
export const DATA_W = 2048;
/** The packed label's fields: chain + 1 and cluster + 1 in 8 bits each. */
export const LABEL_MAX_CHAINS = 255;
export const LABEL_MAX_CLUSTERS = 255;

export interface LabelPieces {
  tubes: Float32Array;
  nTubes: number;
  fills: Float32Array;
  nFills: number;
  data: Float32Array;
  dataRows: number;
  h: number;
  sigma: number;
  zmin: number;
  zr: number;
  smax: number;
  nKeys: number;
  stats: {
    zSplits: number;
    clusterSplits: number;
    keys: number;
    fillCorners: number;
    g2Skipped: number;
    windowRecords: number;
    crossingRows: number;
    zWidened: boolean;
  };
  /** buildLabelPiecesGpu's (K868 S3a7): `tubes` holds one record per rank
   * key (chain, cluster and rank at offsets 8-10, what the band pass's rank
   * map reads), not tubes; LabelPass draws the GPU tubes instead. */
  keysOnly?: boolean;
  /** K868 S3a8a, with keysOnly: the window records are the GPU pieces' (one
   * per segment piece; the fill shader's GPU_FILLS foot reads the tables). */
  gpuFills?: boolean;
}

/** The corner fills and the DATA texture (buildLabelFills). */
export interface LabelFills {
  fills: Float32Array;
  nFills: number;
  data: Float32Array;
  dataRows: number;
  g2Skipped: number;
  windowRecords: number;
  crossingRows: number;
}

/** Why the packed label cannot hold a scene of this many chains and
 * clusters, or null (8 bits each, 0 = paper / none). */
export function labelLimits(chains: number, clusters: number): string | null {
  if (chains > LABEL_MAX_CHAINS) return `${chains} chains (the packed label holds ${LABEL_MAX_CHAINS})`;
  if (clusters > LABEL_MAX_CLUSTERS) return `${clusters} clusters (the packed label holds ${LABEL_MAX_CLUSTERS})`;
  return null;
}

/** v6's ranges: z over the vertices, s over every chain's span. */
export function vertexRanges(m: FieldModel): { zmin: number; zmax: number; smax: number } {
  const polys = m.polys;
  let zmin = Infinity;
  let zmax = -Infinity;
  let smax = 1;
  for (let ci = 0; ci < polys.length; ci++) {
    const p = polys[ci];
    if (p.n > 0) smax = Math.max(smax, Math.abs(p.s[0]) + p.len + 1);
    for (let k = 0; k < p.n; k++) {
      const z = m.depthAt(ci, p.s[k]);
      zmin = Math.min(zmin, z);
      zmax = Math.max(zmax, z);
    }
  }
  if (!Number.isFinite(zmin)) {
    zmin = 0;
    zmax = 0;
  }
  return { zmin, zmax, smax };
}

export function buildLabelPieces(m: FieldModel): LabelPieces {
  const polys = m.polys;
  const h = m.h;
  const vr = vertexRanges(m);
  let zmin = vr.zmin;
  let zmax = vr.zmax;
  const smax = vr.smax;
  const zr0 = Math.max(zmax - zmin, 1e-9);
  const ZTOL = 1e-4 * zr0;
  const keyOf = (ci: number, cl: number): number => (cl >= 0 ? 1e6 + cl : m.idOf[ci]);

  // Tubes: v6's z split (a stack, v6's order), then one piece per cluster.
  const raw: number[] = [];
  const keyRaw: number[] = [];
  let zSplits = 0;
  let clusterSplits = 0;
  let pzmin = zmin;
  let pzmax = zmax;
  for (let ci = 0; ci < polys.length; ci++) {
    const p = polys[ci];
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    const bounds: number[] = [];
    for (const [lo, hi] of m.chainSpans[ci]) for (const sh of shifts) bounds.push(lo + sh, hi + sh);
    bounds.sort((a, b) => a - b);
    const closedFlag = p.closed ? 1 : 0;
    const invLen = 1 / Math.max(p.len, 1e-9);
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1 === p.n ? 0 : k + 1;
      const sA = p.s[k];
      const sB = p.s[k] + p.segLen[k];
      const ax = p.x[k];
      const ay = p.y[k];
      const bx = p.x[b];
      const by = p.y[b];
      // The local-minimum rule's end kinds (v6): past the segment's end the
      // next nonzero segment's direction (1), or an open chain's end (2).
      let endKind = 1;
      let nx = 0;
      let ny = 0;
      for (let j = 1; j <= 8; j++) {
        let kn = k + j;
        if (kn >= p.nseg) {
          if (!p.closed) {
            endKind = 2;
            break;
          }
          kn -= p.nseg;
        }
        const b2 = kn + 1 === p.n ? 0 : kn + 1;
        const dx = p.x[b2] - p.x[kn];
        const dy = p.y[b2] - p.y[kn];
        const l = Math.hypot(dx, dy);
        if (l > 1e-9) {
          nx = dx / l;
          ny = dy / l;
          break;
        }
      }
      const stack: [number, number][] = [[0, 1]];
      while (stack.length) {
        const [t0, t1] = stack.pop()!;
        const s0 = sA + (sB - sA) * t0;
        const s1 = sA + (sB - sA) * t1;
        const z0 = m.depthAt(ci, s0);
        const z1 = m.depthAt(ci, s1);
        const zm = m.depthAt(ci, (s0 + s1) / 2);
        if (Math.abs(zm - (z0 + z1) / 2) > ZTOL && t1 - t0 > 1 / 64) {
          const tm = (t0 + t1) / 2;
          stack.push([t0, tm], [tm, t1]);
          zSplits++;
          continue;
        }
        // Cluster switches inside (s0, s1): every span boundary.
        const cuts: number[] = [s0];
        const tiny = Math.max(1e-9, (s1 - s0) * 1e-9);
        for (const x of bounds) if (x > s0 + tiny && x < s1 - tiny && x > cuts[cuts.length - 1]) cuts.push(x);
        cuts.push(s1);
        clusterSplits += cuts.length - 2;
        for (let i = 0; i + 1 < cuts.length; i++) {
          const u0 = cuts[i];
          const u1 = cuts[i + 1];
          const first = i === 0;
          const last = i + 2 === cuts.length;
          const tt0 = sB > sA ? (u0 - sA) / (sB - sA) : t0;
          const tt1 = sB > sA ? (u1 - sA) / (sB - sA) : t1;
          const za = first ? z0 : m.depthAt(ci, u0);
          const zb = last ? z1 : m.depthAt(ci, u1);
          pzmin = Math.min(pzmin, za, zb);
          pzmax = Math.max(pzmax, za, zb);
          // One cluster per piece: v6's probe point when nothing switches,
          // else the sub-piece's middle (clusterAt is constant between bounds).
          const cl =
            cuts.length === 2
              ? m.clusterAt(ci, s0 + Math.min(1e-6, (s1 - s0) / 4))
              : m.clusterAt(ci, (u0 + u1) / 2);
          const ek = last && t1 === 1 ? endKind : 0;
          const sk = first && t0 === 0 && !p.closed && k === 0 ? 2 : 0;
          raw.push(
            ax + (bx - ax) * tt0, ay + (by - ay) * tt0, ax + (bx - ax) * tt1, ay + (by - ay) * tt1,
            u0, u1, za, zb,
            ci, cl, 0, closedFlag,
            ek ? nx : 0, ek ? ny : 0, ek, sk,
            p.s0, invLen
          );
          keyRaw.push(keyOf(ci, cl));
        }
      }
    }
  }
  const nTubes = keyRaw.length;
  const keys = [...new Set(keyRaw)].sort((a, b) => a - b);
  const rankOf = new Map(keys.map((k, i) => [k, i]));
  const tubes = new Float32Array(raw);
  for (let i = 0; i < nTubes; i++) tubes[i * TUBE_FLOATS + 10] = rankOf.get(keyRaw[i])!;
  // A depth peak between vertices widens the range (v6 never needed it).
  const zWidened = pzmin < zmin || pzmax > zmax;
  zmin = pzmin;
  zmax = pzmax;
  const zr = Math.max(zmax - zmin, 1e-9);
  const F = buildLabelFills(m, ZTOL, rankOf, keys.length);
  return {
    tubes,
    nTubes,
    fills: F.fills,
    nFills: F.nFills,
    data: F.data,
    dataRows: F.dataRows,
    h,
    sigma: m.sigma,
    zmin,
    zr,
    smax,
    nKeys: Math.max(1, keys.length),
    stats: {
      zSplits,
      clusterSplits,
      keys: keys.length,
      fillCorners: F.nFills,
      g2Skipped: F.g2Skipped,
      windowRecords: F.windowRecords,
      crossingRows: F.crossingRows,
      zWidened,
    },
  };
}

/** A growable float32 scratch (K868 S3a8a). Only its capacity carries from
 * one frame to the next: a build writes from 0 and copies out what it wrote,
 * so nothing an earlier frame left in it changes an answer. */
class Scratch {
  a = new Float32Array(1 << 14);
  n = 0;
  /** The array, with room for k more floats at n. */
  room(k: number): Float32Array {
    if (this.n + k > this.a.length) {
      const g = new Float32Array(Math.max(this.n + k, this.a.length * 2));
      g.set(this.a.subarray(0, this.n));
      this.a = g;
    }
    return this.a;
  }
}
const DATA_SCR = new Scratch();
const FILL_SCR = new Scratch();
/** A window's shifts (one, or a closed chain's three) and its segment
 * ranges, one [kLo, kHi) pair per shift. */
const SHIFTS = [0, 0, 0];
const RANGES = [0, 0, 0, 0, 0, 0];

/** The corner fills and the DATA texture: the chain table, the arm windows
 * (split where the depth bends by more than ZTOL) and the crossing rows.
 * A fill's rank is its cluster's among the tubes' keys (rankOf), or
 * nKeyList for a cluster no tube piece carries.
 *
 * K868 S3a8a: the records of S3a7's code, bit for bit and in its order
 * (test/render/label/label_fills_pin.test.ts pins them against the frozen
 * copy in fixtures/label_fills_ref.ts), at a fraction of its cost: a window
 * binary-searches each shift's segment range in the s table (s[k] and
 * s[k] + segLen[k] both rise with k; the old code scanned every segment), a
 * z split hands its ends' depths to its halves, a cluster's crossing rows
 * come from the entries whose other chain it spans (each entry's point
 * found once a frame, the rows visited in the old order), and everything
 * is written straight into float32 scratch. */
export function buildLabelFills(m: FieldModel, ZTOL: number, rankOf: ReadonlyMap<number, number>, nKeyList: number, gpuFills = false): LabelFills {
  const polys = m.polys;
  const h = m.h;
  const D = DATA_SCR;
  D.n = 0;
  // Data: chain table first.
  for (const p of polys) {
    const d = D.room(4);
    const o = D.n;
    d[o] = p.s0;
    d[o + 1] = p.len;
    d[o + 2] = p.closed ? 1 : 0;
    d[o + 3] = 0;
    D.n = o + 4;
  }

  // Window records in footInWindow's order, z split ascending. emit reads
  // the segment being split from these.
  let windowRecords = 0;
  let wp = polys[0];
  let wpi = 0;
  let wk = 0;
  let wkb = 0;
  let wsa = 0;
  let wsb = 0;
  let wtx = 0;
  let wty = 0;
  const emit = (u0: number, u1: number, z0: number, z1: number, depthLeft: number): void => {
    const s0 = wsa + u0 * (wsb - wsa);
    const s1 = wsa + u1 * (wsb - wsa);
    if (depthLeft > 0 && u1 - u0 > 1 / 64) {
      const zm = m.depthAt(wpi, (s0 + s1) / 2);
      if (Math.abs(zm - (z0 + z1) / 2) > ZTOL) {
        const um = (u0 + u1) / 2;
        const zu = m.depthAt(wpi, wsa + um * (wsb - wsa));
        emit(u0, um, z0, zu, depthLeft - 1);
        emit(um, u1, zu, z1, depthLeft - 1);
        return;
      }
    }
    const x = wp.x;
    const y = wp.y;
    const d = D.room(12);
    const o = D.n;
    d[o] = x[wk] + (x[wkb] - x[wk]) * u0;
    d[o + 1] = y[wk] + (y[wkb] - y[wk]) * u0;
    d[o + 2] = x[wk] + (x[wkb] - x[wk]) * u1;
    d[o + 3] = y[wk] + (y[wkb] - y[wk]) * u1;
    d[o + 4] = s0;
    d[o + 5] = s1;
    d[o + 6] = z0;
    d[o + 7] = z1;
    d[o + 8] = wtx;
    d[o + 9] = wty;
    d[o + 10] = wpi;
    d[o + 11] = 0;
    D.n = o + 12;
    windowRecords++;
  };
  let wOff = 0;
  let wCnt = 0;
  const windowOf = (pi: number, lo: number, hi: number, dir: number): void => {
    wOff = D.n / 4;
    const before = windowRecords;
    const p = polys[pi];
    const nseg = p.nseg;
    const S = p.s;
    const L = p.segLen;
    let ns = 1;
    SHIFTS[0] = 0;
    if (p.closed) {
      SHIFTS[0] = -p.len;
      SHIFTS[1] = 0;
      SHIFTS[2] = p.len;
      ns = 3;
    }
    // Each shift's segments meeting [lo, hi]: s[k] + segLen[k] + sh >= lo
    // from kLo on, s[k] + sh <= hi before kHi (a NaN bound meets every
    // segment, as the scan's b < a test lets it).
    const all = Number.isNaN(lo) || Number.isNaN(hi);
    let nr = 0;
    for (let j = 0; j < ns; j++) {
      const sh = SHIFTS[j];
      let kLo = 0;
      let kHi = nseg;
      if (!all) {
        let a1 = nseg;
        while (kLo < a1) {
          const mid = (kLo + a1) >> 1;
          if (S[mid] + L[mid] + sh >= lo) a1 = mid;
          else kLo = mid + 1;
        }
        let b0 = kLo;
        while (b0 < kHi) {
          const mid = (b0 + kHi) >> 1;
          if (S[mid] + sh > hi) kHi = mid;
          else b0 = mid + 1;
        }
      }
      if (kLo < kHi) {
        // Insert by start (at most three ranges).
        let i = nr++;
        while (i > 0 && RANGES[2 * i - 2] > kLo) {
          RANGES[2 * i] = RANGES[2 * i - 2];
          RANGES[2 * i + 1] = RANGES[2 * i - 1];
          i--;
        }
        RANGES[2 * i] = kLo;
        RANGES[2 * i + 1] = kHi;
      }
    }
    // The ranges' union in ascending k, each k's shifts in order: the
    // scan's order, without the segments it skipped.
    let kNext = 0;
    for (let r = 0; r < nr; r++) {
      const k1 = RANGES[2 * r + 1];
      for (let k = Math.max(RANGES[2 * r], kNext); k < k1; k++) {
        const sa = S[k];
        const sb = sa + L[k];
        const kb = segB(p, k);
        const tx = (p.x[kb] - p.x[k]) * dir;
        const ty = (p.y[kb] - p.y[k]) * dir;
        for (let j = 0; j < ns; j++) {
          const sh = SHIFTS[j];
          const a = Math.max(lo, sa + sh);
          const b = Math.min(hi, sb + sh);
          if (b < a) continue;
          const l = L[k] || 1;
          const ta = (a - sh - sa) / l;
          const tb = (b - sh - sa) / l;
          if (gpuFills) {
            // One record per piece: its clamps, chain and segment.
            const d = D.room(8);
            const o = D.n;
            d[o] = ta;
            d[o + 1] = tb;
            d[o + 2] = pi;
            d[o + 3] = k;
            d[o + 4] = tx;
            d[o + 5] = ty;
            d[o + 6] = 0;
            d[o + 7] = 0;
            D.n = o + 8;
            windowRecords++;
            continue;
          }
          wp = p;
          wpi = pi;
          wk = k;
          wkb = kb;
          wsa = sa;
          wsb = sb;
          wtx = tx;
          wty = ty;
          emit(ta, tb, m.depthAt(pi, sa + ta * (sb - sa)), m.depthAt(pi, sa + tb * (sb - sa)), 6);
        }
      }
      if (k1 > kNext) kNext = k1;
    }
    wCnt = windowRecords - before;
  };

  // The crossing table by chain (oracle ensureXBy).
  const xBy: { s: number; oi: number; over: boolean }[][] = polys.map(() => []);
  for (const x of m.scene.crossings) {
    const ia = m.idxOf.get(x.a.chain);
    const ib = m.idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) continue;
    xBy[ia].push({ s: normS(polys[ia], x.a.s), oi: ib, over: x.over === "a" });
    xBy[ib].push({ s: normS(polys[ib], x.b.s), oi: ia, over: x.over === "b" });
  }
  // Every entry once, numbered in the old visiting order (chain, then its
  // xBy order), with its point and its row, listed by its other chain.
  let nE = 0;
  for (const l of xBy) nE += l.length;
  const eX = new Float64Array(nE);
  const eY = new Float64Array(nE);
  const eRow = new Float64Array(4 * nE);
  const byOther: number[][] = polys.map(() => []);
  for (let pi = 0, id = 0; pi < polys.length; pi++) {
    const p = polys[pi];
    for (const e of xBy[pi]) {
      const at = pointAt(p, e.s);
      eX[id] = at.x;
      eY[id] = at.y;
      eRow[4 * id] = pi;
      eRow[4 * id + 1] = e.s;
      eRow[4 * id + 2] = e.over ? 1 : 0;
      eRow[4 * id + 3] = p.closed ? p.len : 0;
      byOther[e.oi].push(id);
      id++;
    }
  }

  const F = FILL_SCR;
  F.n = 0;
  let nFills = 0;
  let g2Skipped = 0;
  let crossingRows = 0;
  const drawn: number[] = [];
  const cand: number[] = [];
  for (let J = 0; J < m.clusters.length; J++) {
    drawn.length = 0;
    for (const k of m.clusters[J].corners) {
      const c = m.corners[k];
      if (c.r <= 0 || !c.ok) continue;
      if (c.g2?.ok) {
        g2Skipped++;
        continue;
      }
      drawn.push(k);
    }
    if (!drawn.length) continue;
    // This cluster's crossing rows: the entries whose other chain it spans.
    const spans = m.clusters[J].spans;
    const xOff = D.n / 4;
    let xCnt = 0;
    cand.length = 0;
    for (const oi of spans.keys()) {
      const l = byOther[oi];
      if (l) for (const id of l) cand.push(id);
    }
    cand.sort((a, b) => a - b);
    for (const id of cand) {
      let near = false;
      for (const k of drawn) {
        const c = m.corners[k];
        if (Math.hypot(eX[id] - c.q[0], eY[id] - c.q[1]) <= c.vq + 3 * h + m.sigma) {
          near = true;
          break;
        }
      }
      if (!near) continue;
      const d = D.room(4);
      const o = D.n;
      d[o] = eRow[4 * id];
      d[o + 1] = eRow[4 * id + 1];
      d[o + 2] = eRow[4 * id + 2];
      d[o + 3] = eRow[4 * id + 3];
      D.n = o + 4;
      xCnt++;
    }
    crossingRows += xCnt;
    let rank = rankOf.get(1e6 + J);
    if (rank === undefined) rank = nKeyList; // a cluster with no tube piece
    for (const k of drawn) {
      const c = m.corners[k];
      windowOf(c.a, c.winA[0], c.winA[1], c.armA.dir);
      const offA = wOff;
      const cntA = wCnt;
      windowOf(c.b, c.winB[0], c.winB[1], c.armB.dir);
      const sg = Math.sign(c.uA[0] * c.uB[1] - c.uA[1] * c.uB[0]);
      const f = F.room(FILL_FLOATS);
      const o = F.n;
      f[o] = c.q[0];
      f[o + 1] = c.q[1];
      f[o + 2] = c.r;
      f[o + 3] = c.vq + h;
      f[o + 4] = c.uA[0];
      f[o + 5] = c.uA[1];
      f[o + 6] = c.uB[0];
      f[o + 7] = c.uB[1];
      f[o + 8] = J;
      f[o + 9] = rank;
      f[o + 10] = sg;
      f[o + 11] = 0;
      f[o + 12] = offA;
      f[o + 13] = cntA;
      f[o + 14] = wOff;
      f[o + 15] = wCnt;
      f[o + 16] = xOff;
      f[o + 17] = xCnt;
      F.n = o + FILL_FLOATS;
      nFills++;
    }
  }
  const texel = D.n / 4;
  const dataRows = Math.max(1, Math.ceil(texel / DATA_W));
  const dataArr = new Float32Array(DATA_W * dataRows * 4);
  dataArr.set(D.a.subarray(0, D.n));
  return { fills: F.a.slice(0, F.n), nFills, data: dataArr, dataRows, g2Skipped, windowRecords, crossingRows };
}
/** K868 S3a8a: with the GPU pieces on, the fills' windows are the GPU
 * pieces' records (gpuFills), unless a caller asks for S3a7's z-split ones. */
export const LABEL_GPU_FILLS = false;

/** K868 S3a7, the GPU pieces (labelGpu): the tubes are LabelPass's GPU
 * tubes, drawn from the tables (label_tables.ts), one instance per chain
 * segment with the exact depth per fragment. This builds what stays on the
 * CPU: the fills and the DATA texture (with the tables' ranks, which are
 * buildLabelPieces' ranks) and one record per rank key in `tubes` (chain,
 * cluster, rank: what the band pass's rank map reads). The ranges are the
 * tables' (equal to buildLabelPieces'); the windows' ZTOL is still
 * buildLabelPieces' over the vertices, so the fills are bit for bit
 * master's. */
export function buildLabelPiecesGpu(m: FieldModel, T: LabelTables, gpuFills = LABEL_GPU_FILLS): LabelPieces {
  let ZTOL = 0;
  if (!gpuFills) {
    const vr = vertexRanges(m);
    ZTOL = 1e-4 * Math.max(vr.zmax - vr.zmin, 1e-9);
  }
  const nk = T.keys.length;
  const tubes = new Float32Array(Math.max(1, nk) * TUBE_FLOATS);
  for (let i = 0; i < nk; i++) {
    const key = T.keys[i];
    const o = i * TUBE_FLOATS;
    tubes[o + 8] = key >= 1e6 ? 0 : (m.idxOf.get(key) ?? 0);
    tubes[o + 9] = key >= 1e6 ? key - 1e6 : -1;
    tubes[o + 10] = i;
  }
  const F = buildLabelFills(m, ZTOL, T.rankOf, nk, gpuFills);
  return {
    tubes,
    nTubes: nk,
    fills: F.fills,
    nFills: F.nFills,
    data: F.data,
    dataRows: F.dataRows,
    h: m.h,
    sigma: m.sigma,
    zmin: T.zmin,
    zr: T.zr,
    smax: T.smax,
    nKeys: T.nKeys,
    stats: {
      zSplits: 0,
      clusterSplits: 0,
      keys: nk,
      fillCorners: F.nFills,
      g2Skipped: F.g2Skipped,
      windowRecords: F.windowRecords,
      crossingRows: F.crossingRows,
      zWidened: false,
    },
    keysOnly: true,
    gpuFills,
  };
}

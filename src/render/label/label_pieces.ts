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
import type { FieldModel } from "../field/oracle";
import { normS, pointAt, segB } from "../field/geom";

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
}

/** Why the packed label cannot hold a scene of this many chains and
 * clusters, or null (8 bits each, 0 = paper / none). */
export function labelLimits(chains: number, clusters: number): string | null {
  if (chains > LABEL_MAX_CHAINS) return `${chains} chains (the packed label holds ${LABEL_MAX_CHAINS})`;
  if (clusters > LABEL_MAX_CLUSTERS) return `${clusters} clusters (the packed label holds ${LABEL_MAX_CLUSTERS})`;
  return null;
}

export function buildLabelPieces(m: FieldModel): LabelPieces {
  const polys = m.polys;
  const h = m.h;
  // v6's ranges: z over the vertices, s over every chain's span.
  let zmin = Infinity;
  let zmax = -Infinity;
  let smax = 1;
  for (let ci = 0; ci < polys.length; ci++) {
    const p = polys[ci];
    for (let k = 0; k < p.n; k++) {
      const z = m.depthAt(ci, p.s[k]);
      zmin = Math.min(zmin, z);
      zmax = Math.max(zmax, z);
      smax = Math.max(smax, Math.abs(p.s[0]) + p.len + 1);
    }
  }
  if (!Number.isFinite(zmin)) {
    zmin = 0;
    zmax = 0;
  }
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

  // Data: chain table first.
  const data: number[] = [];
  for (const p of polys) data.push(p.s0, p.len, p.closed ? 1 : 0, 0);
  let texel = polys.length;

  // Window records in footInWindow's order, z split ascending.
  let windowRecords = 0;
  const windowOf = (pi: number, lo: number, hi: number, dir: number): [number, number] => {
    const off = texel;
    let cnt = 0;
    const p = polys[pi];
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    for (let k = 0; k < p.nseg; k++) {
      const sa = p.s[k];
      const sb = sa + p.segLen[k];
      const kb = segB(p, k);
      const tx = (p.x[kb] - p.x[k]) * dir;
      const ty = (p.y[kb] - p.y[k]) * dir;
      for (const sh of shifts) {
        const a = Math.max(lo, sa + sh);
        const b = Math.min(hi, sb + sh);
        if (b < a) continue;
        const l = p.segLen[k] || 1;
        const ta = (a - sh - sa) / l;
        const tb = (b - sh - sa) / l;
        const emit = (u0: number, u1: number, depthLeft: number): void => {
          const s0 = sa + u0 * (sb - sa);
          const s1 = sa + u1 * (sb - sa);
          const z0 = m.depthAt(pi, s0);
          const z1 = m.depthAt(pi, s1);
          if (depthLeft > 0 && u1 - u0 > 1 / 64) {
            const zm = m.depthAt(pi, (s0 + s1) / 2);
            if (Math.abs(zm - (z0 + z1) / 2) > ZTOL) {
              const um = (u0 + u1) / 2;
              emit(u0, um, depthLeft - 1);
              emit(um, u1, depthLeft - 1);
              return;
            }
          }
          data.push(
            p.x[k] + (p.x[kb] - p.x[k]) * u0, p.y[k] + (p.y[kb] - p.y[k]) * u0,
            p.x[k] + (p.x[kb] - p.x[k]) * u1, p.y[k] + (p.y[kb] - p.y[k]) * u1,
            s0, s1, z0, z1,
            tx, ty, pi, 0
          );
          texel += 3;
          cnt++;
        };
        emit(ta, tb, 6);
      }
    }
    windowRecords += cnt;
    return [off, cnt];
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

  const fillRaw: number[] = [];
  let nFills = 0;
  let g2Skipped = 0;
  let crossingRows = 0;
  for (let J = 0; J < m.clusters.length; J++) {
    const drawn: number[] = [];
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
    // This cluster's crossing rows.
    const spans = m.clusters[J].spans;
    const xOff = texel;
    let xCnt = 0;
    for (let pi = 0; pi < polys.length; pi++) {
      for (const e of xBy[pi]) {
        if (!spans.has(e.oi)) continue;
        const at = pointAt(polys[pi], e.s);
        let near = false;
        for (const k of drawn) {
          const c = m.corners[k];
          if (Math.hypot(at.x - c.q[0], at.y - c.q[1]) <= c.vq + 3 * h + m.sigma) {
            near = true;
            break;
          }
        }
        if (!near) continue;
        data.push(pi, e.s, e.over ? 1 : 0, polys[pi].closed ? polys[pi].len : 0);
        texel++;
        xCnt++;
      }
    }
    crossingRows += xCnt;
    let rank = rankOf.get(1e6 + J);
    if (rank === undefined) rank = keys.length; // a cluster with no tube piece
    for (const k of drawn) {
      const c = m.corners[k];
      const [offA, cntA] = windowOf(c.a, c.winA[0], c.winA[1], c.armA.dir);
      const [offB, cntB] = windowOf(c.b, c.winB[0], c.winB[1], c.armB.dir);
      const sg = Math.sign(c.uA[0] * c.uB[1] - c.uA[1] * c.uB[0]);
      fillRaw.push(
        c.q[0], c.q[1], c.r, c.vq + h,
        c.uA[0], c.uA[1], c.uB[0], c.uB[1],
        J, rank, sg, 0,
        offA, cntA, offB, cntB,
        xOff, xCnt
      );
      nFills++;
    }
  }
  const dataRows = Math.max(1, Math.ceil(texel / DATA_W));
  const dataArr = new Float32Array(DATA_W * dataRows * 4);
  dataArr.set(data);
  return {
    tubes,
    nTubes,
    fills: new Float32Array(fillRaw),
    nFills,
    data: dataArr,
    dataRows,
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
      fillCorners: nFills,
      g2Skipped,
      windowRecords,
      crossingRows,
      zWidened,
    },
  };
}

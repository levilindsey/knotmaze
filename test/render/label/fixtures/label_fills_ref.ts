// K868 S3a8a: a FROZEN copy of label_pieces.ts's vertexRanges,
// buildLabelFills and buildLabelPiecesGpu as they stood at df83a343 (S3a7),
// renamed *Ref. It is the reference the fills pin test
// (label_fills_pin.test.ts) and the stage's probe compare today's code
// against, record for record and bit for bit: the CPU fixes of S3a8a must
// write the same DATA texture, fills, window records and rank keys. Do not
// edit it to follow a change; a deliberate change of the records moves the
// pin test instead (and names it in the commit).
import type { FieldModel } from "../../../../src/render/field/oracle";
import { normS, pointAt, segB } from "../../../../src/render/field/geom";
import type { LabelTables } from "../../../../src/render/label/label_tables";
import { DATA_W, TUBE_FLOATS, type LabelFills, type LabelPieces } from "../../../../src/render/label/label_pieces";
/** v6's ranges: z over the vertices, s over every chain's span. */
export function vertexRangesRef(m: FieldModel): { zmin: number; zmax: number; smax: number } {
  const polys = m.polys;
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
  return { zmin, zmax, smax };
}

/** The corner fills and the DATA texture: the chain table, the arm windows
 * (split where the depth bends by more than ZTOL) and the crossing rows.
 * A fill's rank is its cluster's among the tubes' keys (rankOf), or
 * nKeyList for a cluster no tube piece carries. */
export function buildLabelFillsRef(m: FieldModel, ZTOL: number, rankOf: ReadonlyMap<number, number>, nKeyList: number): LabelFills {
  const polys = m.polys;
  const h = m.h;
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
    if (rank === undefined) rank = nKeyList; // a cluster with no tube piece
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
  return { fills: new Float32Array(fillRaw), nFills, data: dataArr, dataRows, g2Skipped, windowRecords, crossingRows };
}

/** K868 S3a7, the GPU pieces (labelGpu): the tubes are LabelPass's GPU
 * tubes, drawn from the tables (label_tables.ts), one instance per chain
 * segment with the exact depth per fragment. This builds what stays on the
 * CPU: the fills and the DATA texture (with the tables' ranks, which are
 * buildLabelPieces' ranks) and one record per rank key in `tubes` (chain,
 * cluster, rank: what the band pass's rank map reads). The ranges are the
 * tables' (equal to buildLabelPieces'); the windows' ZTOL is still
 * buildLabelPieces' over the vertices, so the fills are bit for bit
 * master's. */
export function buildLabelPiecesGpuRef(m: FieldModel, T: LabelTables): LabelPieces {
  const vr = vertexRangesRef(m);
  const ZTOL = 1e-4 * Math.max(vr.zmax - vr.zmin, 1e-9);
  const nk = T.keys.length;
  const tubes = new Float32Array(Math.max(1, nk) * TUBE_FLOATS);
  for (let i = 0; i < nk; i++) {
    const key = T.keys[i];
    const o = i * TUBE_FLOATS;
    tubes[o + 8] = key >= 1e6 ? 0 : (m.idxOf.get(key) ?? 0);
    tubes[o + 9] = key >= 1e6 ? key - 1e6 : -1;
    tubes[o + 10] = i;
  }
  const F = buildLabelFillsRef(m, ZTOL, T.rankOf, nk);
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
  };
}

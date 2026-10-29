// K868 S3a8b: a FROZEN copy of label_band.ts's buildBandStrips as it stood
// at 52c84090 (S3a8a), renamed buildBandStripsRef: the tube edges cut at the
// span bounds, each cut vertex offset along its segment's own normal. The
// strips pin (label_strips_pin.test.ts) holds today's strips to it: every
// number bit for bit, except a cut's outline point and normal, which now
// lie on the segment's uncut quad (S3a8b call 2). Do not edit it to follow
// a change; a deliberate change of the strips moves the pin test instead
// (and names it in the commit).
import type { FieldModel } from "../../../../src/render/field/oracle";
import { TUBE_FLOATS, type LabelPieces } from "../../../../src/render/label/label_pieces";
import type { SwitchLine } from "../../../../src/render/label/label_switch";
import { findSwitchLinesRef } from "./label_switch_ref";
/** Floats per strip instance: aQ (outline points), aN (outward normals),
 * aM (chain + 1, cluster + 1, flags, 0), aS (sa, sb, chain s0, chain len),
 * aD (depth at both ends). */
const BAND_FLOATS = 18;
const F_FILL = 1;
const F_CAP = 2;
const F_CLOSED = 4;
/** A switch line (label_switch.ts): a strip centred on it, aM.w = the fill's cluster + 1. */
const F_SWITCH = 8;

export interface BandStripsRef {
  strips: Float32Array;
  n: number;
  /** The ink's width in world units (the oracle's W). */
  W: number;
  stats: { edges: number; caps: number; arcs: number; switches: number };
}

/** lines: the switch lines (label_switch.ts). The app passes its cached ones
 * (SwitchCache); left out, the uncached search runs (the probes). */
export function buildBandStripsRef(m: FieldModel, lp: LabelPieces, lines?: readonly SwitchLine[]): BandStripsRef {
  const polys = m.polys;
  const h = m.h;
  const out: number[] = [];
  // The tube pass's depth: ranks by key, as label_pieces assigns them.
  const keyOf = (ci: number, cl: number): number => (cl >= 0 ? 1e6 + cl : m.idOf[ci]);
  const rank = new Map<number, number>();
  for (let i = 0; i < lp.nTubes; i++) {
    const o = i * TUBE_FLOATS;
    rank.set(keyOf(lp.tubes[o + 8], lp.tubes[o + 9]), lp.tubes[o + 10]);
  }
  const zinv = 1 / lp.zr;
  const rinv = 1 / lp.nKeys;
  const sinv = 1 / lp.smax;
  const dep = (z: number, rk: number, s: number): number => 0.5 - 0.45 * (z - lp.zmin) * zinv - 2e-4 * rk * rinv - 2e-6 * s * sinv;
  let edges = 0;
  let caps = 0;
  let arcs = 0;
  const push = (
    ax: number, ay: number, bx: number, by: number,
    nax: number, nay: number, nbx: number, nby: number,
    chain1: number, cl1: number, flags: number,
    sa: number, sb: number, s0: number, len: number,
    da: number, db: number
  ): void => {
    out.push(ax, ay, bx, by, nax, nay, nbx, nby, chain1, cl1, flags, 0, sa, sb, s0, len, da, db);
  };

  for (let ci = 0; ci < polys.length; ci++) {
    const p = polys[ci];
    const closedFlag = p.closed ? F_CLOSED : 0;
    // Unit left normals per segment; a zero-length one borrows a neighbour's.
    const nsx = new Float64Array(p.nseg);
    const nsy = new Float64Array(p.nseg);
    const okSeg = new Uint8Array(p.nseg);
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1 === p.n ? 0 : k + 1;
      const dx = p.x[b] - p.x[k];
      const dy = p.y[b] - p.y[k];
      const l = Math.sqrt(dx * dx + dy * dy);
      if (l > 1e-9) {
        nsx[k] = -dy / l;
        nsy[k] = dx / l;
        okSeg[k] = 1;
      }
    }
    if (!okSeg.some((v) => v === 1)) continue;
    for (let k = 0; k < p.nseg; k++) {
      if (okSeg[k]) continue;
      for (let j = 1; j < p.nseg; j++) {
        const kk = (k + j) % p.nseg;
        if (okSeg[kk]) {
          nsx[k] = nsx[kk];
          nsy[k] = nsy[kk];
          break;
        }
      }
    }
    // Vertex normals: the two segments' average (an open chain's end vertex
    // takes its one segment's).
    const vn = (v: number): [number, number] => {
      const kin = v - 1 >= 0 ? v - 1 : p.closed ? p.nseg - 1 : -1;
      const kout = v < p.nseg ? v : p.closed ? 0 : -1;
      let x = 0;
      let y = 0;
      if (kin >= 0) {
        x += nsx[kin];
        y += nsy[kin];
      }
      if (kout >= 0) {
        x += nsx[kout];
        y += nsy[kout];
      }
      const l = Math.sqrt(x * x + y * y);
      if (l < 1e-9) return [nsx[kout >= 0 ? kout : kin], nsy[kout >= 0 ? kout : kin]];
      return [x / l, y / l];
    };
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    const bounds: number[] = [];
    for (const [lo, hi] of m.chainSpans[ci]) for (const sh of shifts) bounds.push(lo + sh, hi + sh);
    bounds.sort((a, b) => a - b);
    for (let k = 0; k < p.nseg; k++) {
      if (!okSeg[k]) continue;
      const b = k + 1 === p.n ? 0 : k + 1;
      const sA = p.s[k];
      const sB = sA + p.segLen[k];
      const cuts: number[] = [sA];
      const tiny = Math.max(1e-9, (sB - sA) * 1e-9);
      for (const x of bounds) if (x > sA + tiny && x < sB - tiny && x > cuts[cuts.length - 1]) cuts.push(x);
      cuts.push(sB);
      const nA = vn(k);
      const nB = vn(b === 0 && !p.closed ? p.n - 1 : b);
      for (let i = 0; i + 1 < cuts.length; i++) {
        const u0 = cuts[i];
        const u1 = cuts[i + 1];
        const t0 = (u0 - sA) / (sB - sA);
        const t1 = (u1 - sA) / (sB - sA);
        const ax = p.x[k] + (p.x[b] - p.x[k]) * t0;
        const ay = p.y[k] + (p.y[b] - p.y[k]) * t0;
        const bx = p.x[k] + (p.x[b] - p.x[k]) * t1;
        const by = p.y[k] + (p.y[b] - p.y[k]) * t1;
        const na = i === 0 ? nA : [nsx[k], nsy[k]];
        const nb = i + 2 === cuts.length ? nB : [nsx[k], nsy[k]];
        const cl = m.clusterAt(ci, (u0 + u1) / 2);
        const rk = rank.get(keyOf(ci, cl)) ?? 0;
        const da = dep(m.depthAt(ci, u0), rk, u0);
        const db = dep(m.depthAt(ci, u1), rk, u1);
        for (const sd of [1, -1]) {
          push(
            ax + sd * h * na[0], ay + sd * h * na[1], bx + sd * h * nb[0], by + sd * h * nb[1],
            sd * na[0], sd * na[1], sd * nb[0], sd * nb[1],
            ci + 1, cl + 1, closedFlag, u0, u1, p.s0, p.len, da, db
          );
          edges++;
        }
      }
    }
    // Caps: an open chain's ends, half circles of radius h.
    if (!p.closed) {
      const ends: [number, number, number, number][] = [];
      {
        let k0 = 0;
        while (k0 < p.nseg - 1 && !okSeg[k0]) k0++;
        const b0 = k0 + 1;
        const l0 = Math.hypot(p.x[b0] - p.x[k0], p.y[b0] - p.y[k0]) || 1;
        ends.push([0, -(p.x[b0] - p.x[k0]) / l0, -(p.y[b0] - p.y[k0]) / l0, p.s[0]]);
        let k1 = p.nseg - 1;
        while (k1 > 0 && !okSeg[k1]) k1--;
        const b1 = k1 + 1;
        const l1 = Math.hypot(p.x[b1] - p.x[k1], p.y[b1] - p.y[k1]) || 1;
        ends.push([p.n - 1, (p.x[b1] - p.x[k1]) / l1, (p.y[b1] - p.y[k1]) / l1, p.s[p.n - 1]]);
      }
      for (const [v, ux, uy, s] of ends) {
        const cx = p.x[v];
        const cy = p.y[v];
        const cl = m.clusterAt(ci, s);
        const rk = rank.get(keyOf(ci, cl)) ?? 0;
        const d = dep(m.depthAt(ci, s), rk, s);
        const K = 12;
        const dir = (q: number): [number, number] => {
          const an = -Math.PI / 2 + (Math.PI * q) / K;
          const c = Math.cos(an);
          const sn = Math.sin(an);
          return [ux * c - uy * sn, uy * c + ux * sn];
        };
        for (let q = 0; q < K; q++) {
          const [dax, day] = dir(q);
          const [dbx, dby] = dir(q + 1);
          push(cx + h * dax, cy + h * day, cx + h * dbx, cy + h * dby, dax, day, dbx, dby, ci + 1, cl + 1, F_CAP, s, s, p.s0, p.len, d, d);
          caps++;
        }
      }
    }
  }

  // Fill arcs: the corners the label's fill pass draws.
  for (let J = 0; J < m.clusters.length; J++) {
    const rk = rank.get(1e6 + J) ?? lp.nKeys;
    for (const k of m.clusters[J].corners) {
      const c = m.corners[k];
      if (c.r <= 0 || !c.ok || c.g2?.ok) continue;
      const sw = (c.winA[0] + c.winA[1]) / 2;
      const d = 0.09 * dep(m.depthAt(c.a, sw), rk, sw);
      const a0 = Math.atan2(c.uA[1], c.uA[0]);
      let sweep = Math.atan2(c.uB[1], c.uB[0]) - a0;
      while (sweep > Math.PI) sweep -= 2 * Math.PI;
      while (sweep <= -Math.PI) sweep += 2 * Math.PI;
      const K = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
      for (let q = 0; q < K; q++) {
        const ea = a0 + (sweep * q) / K;
        const eb = a0 + (sweep * (q + 1)) / K;
        const ux = Math.cos(ea);
        const uy = Math.sin(ea);
        const vx = Math.cos(eb);
        const vy = Math.sin(eb);
        push(
          c.q[0] + c.r * ux, c.q[1] + c.r * uy, c.q[0] + c.r * vx, c.q[1] + c.r * vy,
          -ux, -uy, -vx, -vy, 0, J + 1, F_FILL, 0, 0, 0, 1, d, d
        );
        arcs++;
      }
    }
  }
  // The switch lines: strips centred on a line across the tube where a
  // cluster's fill and the tube swap which is on top (K940's yield order).
  let switches = 0;
  for (const L of lines ?? findSwitchLinesRef(m)) {
    const p = polys[L.chain];
    push(L.ax, L.ay, L.bx, L.by, L.nx, L.ny, L.nx, L.ny, L.chain + 1, L.cluster + 1, F_SWITCH | (p.closed ? F_CLOSED : 0), L.s, L.s, p.s0, p.len, 0, 0);
    out[out.length - 7] = L.J + 1;
    switches++;
  }
  const n = out.length / BAND_FLOATS;
  return { strips: new Float32Array(out), n, W: m.W, stats: { edges, caps, arcs, switches } };
}

// K868 S3a8b: a FROZEN copy of label_switch.ts as it stood at 52c84090 (S3a8a),
// its functions renamed *Ref. The strips pin (label_strips_pin.test.ts) and
// the stage's probes hold today's switch lines to it, line for line and bit
// for bit: S3a8b's CPU fixes to switchLinesFrom must find the same lines in
// the same order. Do not edit it to follow a change; a deliberate change of
// the lines moves the pin test instead (and names it in the commit).
import type { FieldModel } from "../../../../src/render/field/oracle";
import { dS, normS, pointAt } from "../../../../src/render/field/geom";
export interface SwitchLine {
  /** Across the tube: from (ax, ay) to (bx, by), the strip normal along the tube. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  nx: number;
  ny: number;
  /** The tube's chain index, its cluster (-1 = none) and the arc length. */
  chain: number;
  cluster: number;
  s: number;
  /** The fill's cluster. */
  J: number;
}

/** One (chain, cluster) pair that can switch: the table crossings between
 * the chain and a chain the cluster spans, as `index * 2 + side` (side 0 =
 * the crossing's a, 1 = its b) in table order, and whether the chain is
 * over at each. */
export interface SwitchPair {
  pi: number;
  J: number;
  refs: Int32Array;
  over: Uint8Array;
}

export interface SwitchTopo {
  key: Int32Array;
  pairs: SwitchPair[];
}

/** The switch key: everything the topology part reads. */
export function switchKeyRef(m: FieldModel): Int32Array {
  const X = m.scene.crossings;
  let n = 3 + 3 * X.length;
  for (const c of m.clusters) n += 1 + c.spans.size;
  const key = new Int32Array(n);
  let o = 0;
  key[o++] = m.polys.length;
  key[o++] = X.length;
  for (const x of X) {
    key[o++] = m.idxOf.get(x.a.chain) ?? -1;
    key[o++] = m.idxOf.get(x.b.chain) ?? -1;
    key[o++] = x.over === "a" ? 0 : x.over === "b" ? 1 : 2;
  }
  key[o++] = m.clusters.length;
  for (const c of m.clusters) {
    key[o++] = c.spans.size;
    const start = o;
    for (const ci of c.spans.keys()) key[o++] = ci;
    key.subarray(start, o).sort();
  }
  return key;
}

export function sameKeyRef(a: Int32Array, b: Int32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The topology part, for the model's key. */
export function switchTopoRef(m: FieldModel, key: Int32Array = switchKeyRef(m)): SwitchTopo {
  const polys = m.polys;
  const xBy: { r: number; oi: number; over: boolean }[][] = polys.map(() => []);
  const X = m.scene.crossings;
  for (let xi = 0; xi < X.length; xi++) {
    const x = X[xi];
    const ia = m.idxOf.get(x.a.chain);
    const ib = m.idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) continue;
    xBy[ia].push({ r: xi * 2, oi: ib, over: x.over === "a" });
    xBy[ib].push({ r: xi * 2 + 1, oi: ia, over: x.over === "b" });
  }
  const pairs: SwitchPair[] = [];
  for (let pi = 0; pi < polys.length; pi++) {
    if (xBy[pi].length === 0) continue;
    for (let J = 0; J < m.clusters.length; J++) {
      const spans = m.clusters[J].spans;
      const xs = xBy[pi].filter((x) => spans.has(x.oi));
      if (xs.length === 0) continue;
      pairs.push({ pi, J, refs: Int32Array.from(xs, (x) => x.r), over: Uint8Array.from(xs, (x) => (x.over ? 1 : 0)) });
    }
  }
  return { key, pairs };
}

let S = new Float64Array(64);
const PX = new Float64Array(9);
const PY = new Float64Array(9);
let NEAR = new Int32Array(16);

/** The geometry part: the switch lines on the model's current geometry. */
export function switchLinesFromRef(T: SwitchTopo, m: FieldModel): SwitchLine[] {
  const polys = m.polys;
  const sigma = m.sigma;
  const h = m.h;
  const X = m.scene.crossings;
  const out: SwitchLine[] = [];
  const eps = Math.min(1e-4, sigma * 1e-3);
  const ext = h + m.W;
  // S3a4: each corner's box, outside which m.inFill is false (m.fillBox),
  // filled as the pairs need them. The reach test skips the corners whose
  // box misses the cross-section's nine points: same answer, most
  // candidates rejected without an inFill.
  const KB = new Float64Array(4 * m.corners.length);
  const KBset = new Uint8Array(m.corners.length);
  const boxOf = (k: number): number => {
    const o = 4 * k;
    if (KBset[k]) return o;
    KBset[k] = 1;
    m.fillBox(k, KB, o);
    return o;
  };
  for (const P of T.pairs) {
    const p = polys[P.pi];
    const n = P.refs.length;
    if (S.length < n) S = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      const r = P.refs[i];
      const x = X[r >> 1];
      S[i] = normS(p, r & 1 ? x.b.s : x.a.s);
    }
    // The oracle's fillOrder: is cluster J's fill over the chain at s?
    const fillOver = (s: number): boolean => {
      let best = Infinity;
      let res = false;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(dS(p, s, S[i]));
        if (d <= sigma && d < best) {
          best = d;
          res = P.over[i] === 0;
        }
      }
      return res;
    };
    const corners = m.clusters[P.J].corners;
    const test = (c0: number): void => {
      if (!p.closed && (c0 <= p.s0 || c0 >= p.s0 + p.len)) return;
      const s = normS(p, c0);
      if (fillOver(s - eps) === fillOver(s + eps)) return;
      const cl = m.clusterAt(P.pi, s);
      if (cl === P.J) return;
      const at = pointAt(p, s);
      const nx = -at.ty;
      const ny = at.tx;
      // The cross-section's nine points and their box.
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      let nan = false;
      for (let i = 0; i <= 8; i++) {
        const u = -h + (2 * h * i) / 8;
        const x = at.x + nx * u;
        const y = at.y + ny * u;
        PX[i] = x;
        PY[i] = y;
        if (x !== x || y !== y) nan = true;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      // The corners whose box the points can be in (all of them if a point is NaN).
      if (NEAR.length < corners.length) NEAR = new Int32Array(2 * corners.length);
      let nn = 0;
      for (const k of corners) {
        const o = boxOf(k);
        if (!nan && (x1 < KB[o] || x0 > KB[o + 2] || y1 < KB[o + 1] || y0 > KB[o + 3])) continue;
        NEAR[nn++] = k;
      }
      let reach = false;
      for (let i = 0; i <= 8 && !reach && nn > 0; i++) {
        for (let j = 0; j < nn; j++)
          if (m.inFill(NEAR[j], PX[i], PY[i])) {
            reach = true;
            break;
          }
      }
      if (!reach) return;
      out.push({ ax: at.x - nx * ext, ay: at.y - ny * ext, bx: at.x + nx * ext, by: at.y + ny * ext, nx: at.tx, ny: at.ty, chain: P.pi, cluster: cl, s, J: P.J });
    };
    // The candidates in the order the uncached search listed them.
    for (let i = 0; i < n; i++) {
      const si = S[i];
      test(si - sigma);
      test(si + sigma);
      for (let j = 0; j < n; j++) {
        const d = dS(p, si, S[j]);
        if (d > 0 && d <= 2 * sigma) test(si + d / 2);
      }
    }
  }
  return out;
}

/** The same lines in the same order, every number to the bit. */
export function sameSwitchLinesRef(a: readonly SwitchLine[], b: readonly SwitchLine[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const A = a[i];
    const B = b[i];
    for (const k of ["ax", "ay", "bx", "by", "nx", "ny", "chain", "cluster", "s", "J"] as const) if (!Object.is(A[k], B[k])) return false;
  }
  return true;
}

export function findSwitchLinesRef(m: FieldModel): SwitchLine[] {
  return switchLinesFromRef(switchTopoRef(m), m);
}

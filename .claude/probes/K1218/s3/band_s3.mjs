// K1218 S3: which fan triangle covers a device point (offline, from fans_s3's result).
//   node band_s3.mjs <fans result.json> <x,y> [<x,y> ...]
// Rebuilds each recorded fan's rings as TriFanMesh.pushFan does (the inner ring
// bandIn toward the apex, perpendicular to the rim; the outer ring bandOut away)
// and its triangles (apex-inner fan, inner-rim band, rim-outer band), maps them
// to device px with the affine fitted from the rim's world/device pairs, and
// prints every triangle holding a point, with its vertices and the look there.
import { readFileSync } from "node:fs";

const [, , RES, ...PTS] = process.argv;
const res = JSON.parse(readFileSync(RES, "utf8"));
const pts = PTS.map((s) => s.split(",").map(Number));
// Fit device = A * world + t from the first fan's rim (least squares on 3 spread points).
const c0 = res.calls.find((c) => c.rim.length >= 6);
const n0 = c0.rim.length / 2, ia = 0, ib = Math.floor(n0 / 3), ic = Math.floor((2 * n0) / 3);
const W = (i) => [c0.rim[2 * i], c0.rim[2 * i + 1]], D = (i) => [c0.dev[2 * i], c0.dev[2 * i + 1]];
const [p, q, r] = [W(ia), W(ib), W(ic)], [P, Q, R] = [D(ia), D(ib), D(ic)];
const e1 = [q[0] - p[0], q[1] - p[1]], e2 = [r[0] - p[0], r[1] - p[1]];
const det = e1[0] * e2[1] - e2[0] * e1[1];
const f = (k) => {
  const d1 = Q[k] - P[k], d2 = R[k] - P[k];
  return [(d1 * e2[1] - d2 * e1[1]) / det, (e1[0] * d2 - e2[0] * d1) / det];
};
const [ax, ay] = f(0), [bx, by] = f(1);
const toDev = (x, y) => [P[0] + ax * (x - p[0]) + ay * (y - p[1]), P[1] + bx * (x - p[0]) + by * (y - p[1])];
const bary = (pt, a, b, c) => {
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const l1 = ((b[1] - c[1]) * (pt[0] - c[0]) + (c[0] - b[0]) * (pt[1] - c[1])) / d;
  const l2 = ((c[1] - a[1]) * (pt[0] - c[0]) + (a[0] - c[0]) * (pt[1] - c[1])) / d;
  return [l1, l2, 1 - l1 - l2];
};
for (const c of res.calls) {
  const rim = c.rim, n = rim.length / 2;
  const banded = c.bIn > 0 && n > 2, outer = banded && c.bOut > 0;
  const V = [[c.cx, c.cy]], look = [0];
  for (let i = 0; i < n; i++) { V.push([rim[2 * i], rim[2 * i + 1]]); look.push(1); }
  if (banded) {
    const inn = [], out = [];
    for (let i = 0; i < n; i++) {
      const px = rim[2 * i], py = rim[2 * i + 1];
      const i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, n - 1);
      let tx = rim[2 * i1] - rim[2 * i0], ty = rim[2 * i1 + 1] - rim[2 * i0 + 1];
      const tl = Math.hypot(tx, ty);
      if (tl > 1e-9) { tx /= tl; ty /= tl; } else { tx = 1; ty = 0; }
      let nx = -ty, ny = tx;
      if (nx * (c.cx - px) + ny * (c.cy - py) < 0) { nx = -nx; ny = -ny; }
      inn.push([px + nx * c.bIn, py + ny * c.bIn]);
      out.push([px - nx * c.bOut, py - ny * c.bOut]);
    }
    for (const v of inn) { V.push(v); look.push(0); }
    if (outer) for (const v of out) { V.push(v); look.push(2); }
  }
  const T = [];
  if (banded) {
    const I = 1 + n, O = 1 + 2 * n;
    for (let i = 0; i < n - 1; i++) {
      T.push([0, I + i, I + i + 1, `apex-inner ${i}`], [I + i, 1 + i, 2 + i, `inner-rim ${i}a`], [I + i, 2 + i, I + i + 1, `inner-rim ${i}b`]);
      if (outer) T.push([1 + i, O + i, O + i + 1, `rim-outer ${i}a`], [1 + i, O + i + 1, 2 + i, `rim-outer ${i}b`]);
    }
  } else for (let i = 0; i < n - 1; i++) T.push([0, 1 + i, 2 + i, `apex ${i}`]);
  const Vd = V.map(([x, y]) => toDev(x, y));
  for (const pt of pts) for (const [a, b, d, name] of T) {
    const l = bary(pt, Vd[a], Vd[b], Vd[d]);
    if (l.every((v) => v >= -1e-9)) {
      const lk = l[0] * look[a] + l[1] * look[b] + l[2] * look[d];
      const fmt = (k) => `${Vd[k][0].toFixed(2)},${Vd[k][1].toFixed(2)}(L${look[k]})`;
      console.log(`pt ${pt}: fan #${c.i} ${c.flank ? "wedge" : "disc"} bIn ${c.bIn?.toFixed?.(4)} bOut ${c.bOut?.toFixed?.(4)} tri ${name} [${fmt(a)} ${fmt(b)} ${fmt(d)}] look ${lk.toFixed(3)}${lk > 1.001 ? " (discarded)" : " PAINTS"}`);
    }
  }
}

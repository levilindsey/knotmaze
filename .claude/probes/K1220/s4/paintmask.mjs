// K1220 S4: Done 1 + Done 2 measurements at the i forks, offline.
//   node paintmask.mjs <shotsRoot> <label> <geomDir>
// shotsRoot/<label>/<stand>/{rest,nofans}.png + meta.json (shoot.mjs),
// geomDir/<stand>_ji<n>_geom.json (geom.mjs, that build's rest geometry).
// The "which ribbon is beneath" mask comes from geom.mjs: a pixel is under
// chain c where its distance to c's polyline is under fh*wm at that sample.
// Done 1: under a ribbon (eroded 1 device px) with |rest-nofans| > 4 in a
// channel. Done 2: fan ink = |rest-nofans| > 8 outside the ribbon union;
// bump = fan ink outside the closing of the union by a disc of 1 fh.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";

const [, , ROOT, LABEL, GEOMD] = process.argv;
const FORKS = [
  ["i_xh3", 0], ["i_xh2", 0], ["ai_xh3", 2], ["ai_xh2", 2],
  ["ia_xh3", 0], ["ia_xh2", 0], ["ii_xh3", 0], ["ii_xh3", 1], ["ii_xh2", 0], ["ii_xh2", 1],
];
function load(p) { return toRGB(decodePNG(readFileSync(p))); }
function bgOf(im) {
  const px = [];
  for (const [x0, y0] of [[0, 0], [im.W - 40, 0], [0, im.H - 40], [im.W - 40, im.H - 40]])
    for (let y = y0; y < y0 + 40; y += 4) for (let x = x0; x < x0 + 40; x += 4) {
      const o = (y * im.W + x) * 3; px.push([im.data[o], im.data[o + 1], im.data[o + 2]]);
    }
  px.sort((a, b) => a[0] - b[0]);
  return px[px.length >> 1];
}
const distPtSeg = (px, py, ax, ay, bx, by) => {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
  let u = l2 > 1e-12 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  u = Math.max(0, Math.min(1, u));
  return [Math.hypot(px - (ax + ex * u), py - (ay + ey * u)), u];
};

for (const [stand, ji] of FORKS) {
  const dir = join(ROOT, LABEL, stand);
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  const geom = JSON.parse(readFileSync(join(GEOMD, `${stand}_ji${ji}_geom.json`), "utf8"));
  const rest = load(join(dir, "rest.png")), nof = load(join(dir, "nofans.png"));
  const bg = bgOf(nof);
  const inkNof = (x, y) => {
    const o = (y * nof.W + x) * 3;
    return Math.hypot(nof.data[o] - bg[0], nof.data[o + 1] - bg[1], nof.data[o + 2] - bg[2]) > 40;
  };
  const rec = meta.recs.find((r) => r.ji === ji);
  const dsf = meta.dsf, s = meta.view.s, vx = meta.view.x, vy = meta.view.y;
  const fh = meta.fh, pxW = 1 / (s * dsf);
  const cx = rec.sx * dsf, cy = rec.sy * dsf;
  const R = 6 * fh * s * dsf;
  const x0 = Math.max(0, Math.round(cx - R)), x1 = Math.min(rest.W, Math.round(cx + R));
  const y0 = Math.max(0, Math.round(cy - R)), y1 = Math.min(rest.H, Math.round(cy + R));
  const W = x1 - x0, H = y1 - y0;
  const chains = geom.chains.map((c) => c.pts);
  const kJ = chains.map((p) => {
    let bi = 0, bd = 1e9;
    p.forEach((q, i) => { const d = Math.hypot(q[1] - geom.j[0], q[2] - geom.j[1]); if (d < bd) { bd = d; bi = q[0]; } });
    return bi;
  });
  // Pass 1: ribbon-union mask (rel < 1 device px) + best-chain attribution.
  const union = new Uint8Array(W * H);
  const relGrid = new Float32Array(W * H).fill(1e9);
  const chGrid = new Int16Array(W * H).fill(-1);
  const kGrid = new Int16Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = ((x0 + x) / dsf - vx) / s, wy = ((y0 + y) / dsf - vy) / s;
    let best = 1e9, bch = -1, bk = -1;
    for (let ci = 0; ci < chains.length; ci++) {
      const p = chains[ci];
      for (let k = 0; k + 1 < p.length; k++) {
        const [dd, u] = distPtSeg(wx, wy, p[k][1], p[k][2], p[k + 1][1], p[k + 1][2]);
        const wm = p[k][3] + (p[k + 1][3] - p[k][3]) * u;
        const rel = dd - fh * wm;
        if (rel < best) { best = rel; bch = ci; bk = p[k][0]; }
      }
    }
    const i = y * W + x;
    relGrid[i] = best; chGrid[i] = bch; kGrid[i] = bk;
    union[i] = best < pxW ? 1 : 0;
  }
  // Closing of the union by a disc of 1 fh (dilate then erode).
  const rpx = Math.max(1, Math.round(fh * s * dsf));
  const offs = [];
  for (let dy = -rpx; dy <= rpx; dy++) for (let dx = -rpx; dx <= rpx; dx++)
    if (dx * dx + dy * dy <= rpx * rpx) offs.push([dx, dy]);
  const dil = new Uint8Array(W * H), clo = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!union[y * W + x]) continue;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) dil[yy * W + xx] = 1;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let ok = 1;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || !dil[yy * W + xx]) { ok = 0; break; }
    }
    clo[y * W + x] = ok;
  }
  // Pass 2: diffs.
  let viol = 0, violMax = 0; const byKey = {}; const violPts = [];
  let fanInk = 0, bump = 0; const bumpPts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x0 + x, gy = y0 + y, o = (gy * rest.W + gx) * 3, i = y * W + x;
    const d = Math.max(Math.abs(rest.data[o] - nof.data[o]), Math.abs(rest.data[o + 1] - nof.data[o + 1]), Math.abs(rest.data[o + 2] - nof.data[o + 2]));
    if (relGrid[i] < -pxW && d > 4 && inkNof(gx, gy)) {
      viol++; violMax = Math.max(violMax, d);
      const key = `c${chGrid[i]}${kGrid[i] <= kJ[chGrid[i]] ? "R" : "S"}`;
      byKey[key] = (byKey[key] || 0) + 1;
      if (d === violMax || violPts.length < 6) violPts.push([gx, gy, d]);
    }
    if (d > 8 && !union[i]) {
      fanInk++;
      if (!clo[i]) { bump++; if (bumpPts.length < 10) bumpPts.push([gx, gy]); }
    }
  }
  console.log(`${stand} ji${ji}: Done1 viol>4 = ${viol} (max ${violMax}, by ${JSON.stringify(byKey)}) pts ${JSON.stringify(violPts.slice(0, 6))} | Done2 fanInkOffRibbon = ${fanInk}, bumpOutsideClosing = ${bump} ${JSON.stringify(bumpPts)}`);
}

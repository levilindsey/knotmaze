// K1040 F4(b): how far a quadratic smooth-min union sits from the exact
// rolling-ball fillet, at the corners of a scene export (straight-arm model
// at each junction). Usage: node smin_dev.cjs <scene.json> [dpr]
// Prints the corner angle histogram, the per-corner k that would match the
// fillet's apex, the best single k, and the deviations in device px.
const fs = require("fs");
const scene = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dpr = Number(process.argv[3] ?? 2);
const px = scene.camera.pxPerUnit * dpr;
const h = scene.look.halfWidth, W = scene.look.band;

function chainPoint(c, s) {
  // arc-length lookup on the polyline
  const p = c.pts; let acc = 0;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const dx = p[i + 2] - p[i], dy = p[i + 3] - p[i + 1], L = Math.hypot(dx, dy);
    if (acc + L >= s) { const u = L > 0 ? (s - acc) / L : 0; return [p[i] + u * dx, p[i + 1] + u * dy]; }
    acc += L;
  }
  return [p[p.length - 2], p[p.length - 1]];
}
const chains = new Map(scene.chains.map((c) => [c.id, c]));
const thetas = [];
for (const j of scene.junctions) {
  const dirs = j.arms.map((a) => {
    const c = chains.get(a.chain);
    const p0 = chainPoint(c, a.s), p1 = chainPoint(c, a.s + a.dir * 2 * h);
    return Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  }).sort((x, y) => x - y);
  for (let i = 0; i < dirs.length; i++) {
    let d = (i + 1 < dirs.length ? dirs[i + 1] : dirs[0] + 2 * Math.PI) - dirs[i];
    thetas.push(d);
  }
}
const deg = (x) => (x * 180) / Math.PI;
const hist = {};
for (const t of thetas) { const b = Math.min(180, Math.floor(deg(t) / 15) * 15); hist[b] = (hist[b] || 0) + 1; }
console.log(`corners ${thetas.length}, h ${(h * px).toFixed(2)} px, W ${(W * px).toFixed(2)} px (dpr ${dpr})`);
console.log("theta histogram (deg bucket: count):", JSON.stringify(hist));
// Corners that get a fillet: theta < 180 deg - 1 (a straight through's back has none).
const C = thetas.filter((t) => t < Math.PI - 0.02).map((t) => {
  const r = Math.min(2 * h, 1.5 * h * Math.tan(t / 2)); // cr 3
  const sn = Math.sin(t / 2);
  return { t, r, sn, apex: r / sn - r, kMatch: 4 * r * (1 - sn), innerExact: r / sn - r - W };
});
const ks = C.map((c) => c.kMatch).sort((a, b) => a - b);
console.log(`filleted corners ${C.length}; k matching each apex (px): min ${(ks[0] * px).toFixed(2)} p50 ${(ks[ks.length >> 1] * px).toFixed(2)} max ${(ks[ks.length - 1] * px).toFixed(2)}`);
// smin level sets on the bisector: outline at k/(4 sn), inner band edge at (k/4 - W)/sn
function devs(k) {
  let mo = 0, mi = 0;
  for (const c of C) {
    mo = Math.max(mo, Math.abs(k / (4 * c.sn) - c.apex));
    mi = Math.max(mi, Math.abs((k / 4 - W) / c.sn - c.innerExact));
  }
  return [mo, mi];
}
let best = { k: 0, m: Infinity };
for (let k = 0; k <= 8 * h; k += h / 400) { const [mo] = devs(k); if (mo < best.m) best = { k, m: mo }; }
const [bo, bi] = devs(best.k);
console.log(`best single k ${(best.k * px).toFixed(2)} px: apex deviation max ${(bo * px).toFixed(2)} px, inner band edge max ${(bi * px).toFixed(2)} px`);
const [zo, zi] = devs(0);
console.log(`k 0 (plain min union): apex off by up to ${(zo * px).toFixed(2)} px; inner edge spike up to ${(zi * px).toFixed(2)} px`);
// Off the bisector, with k matched per corner: sample rays from q.
function rayDev(c, k) {
  // sides: lines through V=0 at angles +-t/2 around the +x bisector; gap is the wedge x>0.
  const q = [c.r / c.sn, 0];
  const nA = [Math.sin(c.t / 2), -Math.cos(c.t / 2)], nB = [Math.sin(c.t / 2), Math.cos(c.t / 2)]; // inward normals of the gap
  const a = (p) => p[0] * nA[0] + p[1] * nA[1]; // distance to side A, positive in the gap
  const b = (p) => p[0] * nB[0] + p[1] * nB[1];
  const smin = (x, y) => { const hh = Math.max(k - Math.abs(x - y), 0) / k; return Math.min(x, y) - (k > 0 ? hh * hh * k / 4 : 0); };
  const half = Math.PI / 2 - c.t / 2; // the arc spans +-half around the -x direction from q
  let m = 0;
  for (let i = -40; i <= 40; i++) {
    const ang = Math.PI + (i / 40) * (half + 0.3);
    const d = [Math.cos(ang), Math.sin(ang)];
    // exact: arc inside the wedge, else the side line
    let xe;
    if (Math.abs(i / 40 * (half + 0.3)) <= half) xe = c.r;
    else { const n = i > 0 ? nB : nA; const den = -(d[0] * n[0] + d[1] * n[1]); xe = den > 1e-9 ? (q[0] * n[0] + q[1] * n[1]) / den : Infinity; }
    // smin: first x where smin(a, b) <= 0
    let lo = 0, hi = 6 * (c.r + h);
    const f = (x) => smin(a([q[0] + x * d[0], q[1] + x * d[1]]), b([q[0] + x * d[0], q[1] + x * d[1]]));
    if (f(hi) > 0 || !isFinite(xe)) continue;
    for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
    m = Math.max(m, Math.abs(hi - xe));
  }
  return m;
}
let mPer = 0, mBest = 0;
for (const c of C) { mPer = Math.max(mPer, rayDev(c, c.kMatch)); mBest = Math.max(mBest, rayDev(c, best.k)); }
console.log(`off the bisector: k matched per corner, max ${(mPer * px).toFixed(2)} px; best single k, max ${(mBest * px).toFixed(2)} px`);

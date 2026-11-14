// K1362 s14: what a pruned corner list would remove from the scan, pixel-weighted on the bench map.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s14_kstat.ts [scene,...] [w] [h]
// Per pixel centre (fit 0.917, aa 0.5 / s, ctrlArc 0.47, as the bench): the cell's list length kn, the thru entries,
// the entries that pass the keep loop's ring test (and, thru, reach) at that pixel (the ideal), and the entries a
// per-region list would keep (stage 11's kprune bound, cell padded 1% of G) at the cell and at sub-cells G/2, G/4.
import { readFileSync } from "node:fs";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";

const names = process.argv[2] && process.argv[2] !== "-" ? process.argv[2].split(",") : ["def", "muse_hash", "fat"];
const W = +(process.argv[3] ?? 822); const H = +(process.argv[4] ?? 1506); const FIT = 0.917;
for (const name of names) {
  const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
  scene.look.ctrlArc ??= 0.47;
  let T: GfTables = buildTables(scene, { aa: 0.01 });
  let s = 1; let cx = 0; let cy = 0;
  for (let k = 0; k < 2; k++) {
    const bw = T.gW * T.G; const bh = T.gH * T.G;
    s = FIT * Math.min(W / bw, H / bh); cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
    T = buildTables(scene, { aa: 0.5 / s });
  }
  const e = W / 2 - s * cx; const f = H / 2 - s * cy;
  const map = [1 / s, -e / s, -1 / s, (H - f) / s];
  const aa = T.aa; const Wd = T.W; const G = T.G;
  const keepAt = (k: number, x: number, y: number) => {
    const d = Math.hypot(x - T.kCx[k], y - T.kCy[k]);
    if (!(d > T.kR[k] - aa - Wd) || d > T.kRmax[k] + Wd + 2 * aa) return false;
    if (T.kThru[k] && d > T.kRV[k] + Wd + 4 * aa) return false;
    return true;
  };
  const keepBox = (k: number, x0: number, y0: number, x1: number, y1: number) => {
    const pad = 0.01 * G; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const px = Math.min(Math.max(T.kCx[k], x0), x1), py = Math.min(Math.max(T.kCy[k], y0), y1);
    const dmin = Math.hypot(px - T.kCx[k], py - T.kCy[k]);
    const fx = Math.max(Math.abs(T.kCx[k] - x0), Math.abs(T.kCx[k] - x1)), fy = Math.max(Math.abs(T.kCy[k] - y0), Math.abs(T.kCy[k] - y1));
    const dmax = Math.hypot(fx, fy);
    let ok = dmin <= T.kRmax[k] + Wd + 2 * aa && dmax > T.kR[k] - aa - Wd;
    if (ok && T.kThru[k]) ok = dmin <= T.kRV[k] + Wd + 4 * aa;
    return ok;
  };
  let pix = 0, pixK = 0, sKn = 0, sThru = 0, sIdeal = 0, sCell = 0, sSub2 = 0, sSub4 = 0, maxKn = 0, pixThruReach = 0;
  const hist = new Int32Array(12);
  for (let py = 0; py < H; py++) {
    const y = map[2] * (py + 0.5) + map[3];
    for (let pxx = 0; pxx < W; pxx++) {
      const x = map[0] * (pxx + 0.5) + map[1];
      const gx = Math.floor((x - T.gx0) / G); const gy = Math.floor((y - T.gy0) / G);
      if (gx < 0 || gy < 0 || gx >= T.gW || gy >= T.gH) continue;
      pix++;
      const cell = gy * T.gW + gx; const k0 = T.cellK0[cell]; const kn = T.cellKN[cell];
      if (kn === 0) continue;
      pixK++; sKn += kn; if (kn > maxKn) maxKn = kn; hist[Math.min(11, kn)]++;
      const X0 = T.gx0 + gx * G, Y0 = T.gy0 + gy * G;
      const s2x = Math.min(1, Math.floor((x - X0) / (G / 2))), s2y = Math.min(1, Math.floor((y - Y0) / (G / 2)));
      const s4x = Math.min(3, Math.floor((x - X0) / (G / 4))), s4y = Math.min(3, Math.floor((y - Y0) / (G / 4)));
      let thruReach = false;
      for (let q = k0; q < k0 + kn; q++) {
        const k = T.cellKList[q];
        if (T.kThru[k]) { sThru++; if (Math.hypot(x - T.kCx[k], y - T.kCy[k]) <= T.kRV[k] + Wd + 4 * aa) thruReach = true; }
        if (keepAt(k, x, y)) sIdeal++;
        if (keepBox(k, X0, Y0, X0 + G, Y0 + G)) sCell++;
        if (keepBox(k, X0 + s2x * G / 2, Y0 + s2y * G / 2, X0 + (s2x + 1) * G / 2, Y0 + (s2y + 1) * G / 2)) sSub2++;
        if (keepBox(k, X0 + s4x * G / 4, Y0 + s4y * G / 4, X0 + (s4x + 1) * G / 4, Y0 + (s4y + 1) * G / 4)) sSub4++;
      }
      if (thruReach) pixThruReach++;
    }
  }
  const r = (v: number) => (v / pixK).toFixed(3);
  console.log(`${name}: G ${G.toFixed(3)} (${(G * s).toFixed(1)} px) cells ${T.gW}x${T.gH} nK ${T.nK}; pixels ${pix}, in corner cells ${pixK} (${(100 * pixK / pix).toFixed(1)}%), max kn ${maxKn}`);
  console.log(`  per corner-cell pixel: kn ${r(sKn)} thru ${r(sThru)} | keep-ideal ${r(sIdeal)} cell ${r(sCell)} sub2 ${r(sSub2)} sub4 ${r(sSub4)} | thru reach at px ${(100 * pixThruReach / pixK).toFixed(1)}%`);
  console.log(`  kn hist (1..11+): ${Array.from(hist.slice(1)).map((v) => (100 * v / pixK).toFixed(1)).join(" ")}`);
}

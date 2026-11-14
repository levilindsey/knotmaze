// K1362 s14: kept corners per corner-cell pixel (an upper bound: the ring and thru-reach tests, no sector or yield test)
// and how many of them are inside (rho > K0.z, ki's kIn 3).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s14_nkhist.ts <sceneDir> [w] [h]
import { readFileSync, readdirSync } from "node:fs";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";

const dir = process.argv[2]; const W = +(process.argv[3] ?? 822); const H = +(process.argv[4] ?? 1506); const FIT = 0.917;
let bad = 0;
const SCENES = ["def", "muse_hash", "fat", "g41_ring_tw64", "g41_def_tw64", "user_tw42.lightpaper", "g41_user_tw42", "muse_default_tw", "ring", "g41_def_tw42", "g41_user_tw64", "g41_ring_tw42"];
for (const file of readdirSync(dir).filter((f) => SCENES.includes(f.replace(/\.json$/, ""))).sort()) {
  const scene = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  scene.look ??= {}; scene.look.ctrlArc ??= 0.47;
  let T: GfTables = buildTables(scene, { aa: 0.01 });
  let s = 1; let cx = 0; let cy = 0;
  for (let k = 0; k < 2; k++) {
    const bw = T.gW * T.G; const bh = T.gH * T.G;
    s = FIT * Math.min(W / bw, H / bh); cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
    T = buildTables(scene, { aa: 0.5 / s });
  }
  const e = W / 2 - s * cx; const f = H / 2 - s * cy;
  const aa = T.aa; const Wd = T.W; const G = T.G; const L = T.cellKPList;
  const reach = (k: number, x: number, y: number) => { const lim = T.kRV[k] + Wd + 4 * aa; const dx = x - T.kCx[k], dy = y - T.kCy[k]; return dx * dx + dy * dy <= lim * lim; };
  const keep = (k: number, x: number, y: number) => {
    const rho = Math.hypot(x - T.kCx[k], y - T.kCy[k]);
    if (!(rho > T.kR[k] - aa - Wd) || rho > T.kRmax[k] + Wd + 2 * aa) return false;
    return !(T.kThru[k] > 0.5) || reach(k, x, y);
  };
  let pixAll = 0, pixK = 0, inside = 0, nBad = 0; const nkHist = [0, 0, 0, 0];
  const check = (cell: number, x: number, y: number, count: boolean) => {
    if (count) pixAll++;
    const k0 = T.cellK0[cell], kn = T.cellKN[cell]; if (kn === 0) return;
    let nk = 0;
    for (let q = k0; q < k0 + kn; q++) { const k = T.cellKList[q]; if (keep(k, x, y)) { nk++; if (Math.hypot(x - T.kCx[k], y - T.kCy[k]) > T.kR[k]) inside++; } }
    if (count) { nkHist[Math.min(3, nk)]++; pixK++; }
  };
  for (let py = 0; py < H; py++) {
    const y = -(py + 0.5) / s + (H - f) / s;
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / s - e / s;
      const gx = Math.floor((x - T.gx0) / G); const gy = Math.floor((y - T.gy0) / G);
      if (gx < 0 || gy < 0 || gx >= T.gW || gy >= T.gH) continue;
      check(gy * T.gW + gx, x, y, true);
    }
  }
  bad += nBad;
  const pc = (v: number) => (pixK ? 100 * v / pixK : 0).toFixed(1);
  console.log(`${file.replace(".json", "").padEnd(22)} corner cells ${(100 * pixK / Math.max(1, pixAll)).toFixed(1)}% of grid px | kept 0/1/2/3+: ${pc(nkHist[0])}/${pc(nkHist[1])}/${pc(nkHist[2])}/${pc(nkHist[3])}% | inside per px ${(pixK ? inside / pixK : 0).toFixed(2)}`);
}

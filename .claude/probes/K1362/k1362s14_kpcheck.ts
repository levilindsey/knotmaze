// K1362 s14: the pruned corner lists (tables.ts cellKPList) against the whole cell list, per pixel on the bench map.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s14_kpcheck.ts <sceneDir> [w] [h]
// At every pixel centre in a corner cell (and at the cell's four corners, the cell pick's worst case), the thru
// corners passing the reach test and the corners passing the keep loop's ring (and, thru, reach) test must be the
// same sequence over the pruned lists as over cellKList (the sector test is the same per pixel, so it drops out).
// Prints per scene: list slots (bytes as packed), the kp build ms, and the walks per corner-cell pixel before/after.
import { readFileSync, readdirSync } from "node:fs";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";

const dir = process.argv[2]; const W = +(process.argv[3] ?? 822); const H = +(process.argv[4] ?? 1506); const FIT = 0.917;
let bad = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
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
  let pixK = 0, walkOld = 0, walkNew = 0, nBad = 0; const thruHist = [0, 0, 0, 0];
  const check = (cell: number, x: number, y: number, count: boolean) => {
    const k0 = T.cellK0[cell], kn = T.cellKN[cell]; if (kn === 0) return;
    const b = 4 * k0, nT = L[b], nKp = L[b + 1];
    const a1: number[] = [], b1: number[] = [], a2: number[] = [], b2: number[] = [];
    for (let q = k0; q < k0 + kn; q++) { const k = T.cellKList[q]; if (T.kThru[k] > 0.5 && reach(k, x, y)) a1.push(k); if (keep(k, x, y)) a2.push(k); }
    for (let j = 0; j < nT; j++) { const k = L[b + 2 + j]; if (reach(k, x, y)) b1.push(k); }
    for (let j = 0; j < nKp; j++) { const k = L[b + 2 + nT + j]; if (keep(k, x, y)) b2.push(k); }
    if (a1.join() !== b1.join() || a2.join() !== b2.join()) { nBad++; if (nBad < 4) console.log(`  BAD ${file} cell ${cell} at ${x},${y}: thru ${a1}|${b1} keep ${a2}|${b2}`); }
    if (count) { thruHist[Math.min(3, a1.length)]++; pixK++; walkOld += 2 * kn; walkNew += kn > 0 ? nT + nKp : 0; }
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
  for (let gy = 0; gy < T.gH; gy++) for (let gx = 0; gx < T.gW; gx++) for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) check(gy * T.gW + gx, T.gx0 + (gx + u) * G, T.gy0 + (gy + v) * G, false);
  bad += nBad;
  const r = (v: number) => (pixK ? v / pixK : 0).toFixed(3);
  console.log(`${file.replace(".json", "").padEnd(14)} nK ${String(T.nK).padStart(4)} slots ${String(L.length).padStart(6)} (${(16 * T.cellKList.length / 1024).toFixed(0)} KB) kp ${T.ms.kp.toFixed(2)} ms | walks/px ${r(walkOld)} -> ${r(walkNew)} | thru passing (reach) 1/2/3+: ${thruHist[1]}/${thruHist[2]}/${thruHist[3]} | bad ${nBad}`);
}
console.log(bad === 0 ? "kpcheck: all equal" : `kpcheck: ${bad} mismatches`);

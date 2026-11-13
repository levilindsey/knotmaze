// K1324 s3: where a seam's ink comes from. Rasters the outline (fill_tri + bandData, the census's raster)
// around a spot and prints, per cell, the outline's ink as a digit (0 = none .. 9 = >= .95, '#' = >= .995)
// next to form B's; then, for each listed probe point, every band triangle covering it: piece, kind, chain,
// alpha (and the composite). --fine: digits are the ink deficit in percent (0 = ink .99-.999, 9 = <= .91, "." < .5).
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s3_ink.ts <scene> <x> <y> [--r=0.8] [--ppu=150] [--cell=6]
//        [--at=x:y,x:y]
import { buildModel, rasterOutline, rasterFormB } from "../K1314/k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const ppu = Number(opt("ppu") ?? 150); const cell = Number(opt("cell") ?? 6); const R = Number(opt("r") ?? 0.8);
const m = buildModel(nm); const x = Number(xs); const y = Number(ys);
const c0 = Math.floor((x - R) * ppu); const r0 = Math.floor((y - R) * ppu); const W = Math.ceil(2 * R * ppu); const H = W;
const O = rasterOutline(m, c0, r0, W, H, ppu); const B = rasterFormB(m, c0, r0, W, H, ppu);
const FINE = args.includes("--fine");
const dig = (v: number): string => FINE ? (v >= 0.999 ? "#" : v < 0.5 ? "." : String(Math.min(9, Math.floor((1 - v) * 100)))) : (v >= 0.995 ? "#" : v < 0.005 ? " " : String(Math.min(9, Math.floor(v * 10))));
const nc = Math.floor(W / cell); const nr = Math.floor(H / cell);
console.log(`origin (${(c0 / ppu).toFixed(3)}, ${(r0 / ppu).toFixed(3)}) step ${(cell / ppu).toFixed(4)}; outline | form B (cell centre ink)`);
for (let r = 0; r < nr; r++) {
  let a = ""; let b = "";
  for (let c = 0; c < nc; c++) {
    const i = (r * cell + (cell >> 1)) * W + c * cell + (cell >> 1);
    a += dig(O.ink[i]); b += dig(B.ink[i]);
  }
  console.log(`${String(r).padStart(3)} ${a} | ${b}`);
}
for (const at of (opt("at") ?? "").split(",").filter(Boolean)) {
  const [px, py] = at.split(":").map(Number);
  const T = m.tri; const A = m.triA; let ink = 0;
  console.log(`at (${px}, ${py}):`);
  for (let t = 0; t < m.nTri; t++) {
    if (m.tb[4 * t + 2] < px || m.tb[4 * t] > px || m.tb[4 * t + 3] < py || m.tb[4 * t + 1] > py) continue;
    const ax = T[6 * t]; const ay = T[6 * t + 1]; const bx = T[6 * t + 2]; const by = T[6 * t + 3]; const cx = T[6 * t + 4]; const cy = T[6 * t + 5];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (!(Math.abs(den) > 1e-18)) continue;
    const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den; const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const a = Math.min(1, Math.max(0, l1 * A[3 * t] + l2 * A[3 * t + 1] + l3 * A[3 * t + 2]));
    ink = 1 - (1 - ink) * (1 - a); const p = m.table.pieces[m.triP[t]];
    console.log(`  tri ${t} p${m.triP[t]} ${p.kind} ch ${p.chain} a ${a.toFixed(3)} (verts ${A[3 * t].toFixed(2)} ${A[3 * t + 1].toFixed(2)} ${A[3 * t + 2].toFixed(2)})`);
  }
  console.log(`  ink ${ink.toFixed(3)}`);
}

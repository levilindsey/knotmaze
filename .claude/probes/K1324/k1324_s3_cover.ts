// K1324 s3: how many band triangles (the census's bandData triangles) cover each pixel around a spot, as a
// digit per pixel ('.' none), next to the composite ink (k1324_s3_ink --fine digits); then the triangles of the
// pixels covered more than once by one piece: piece, kind, triangle, its vertices and alphas.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s3_cover.ts <scene> <x> <y> [--r=0.03] [--ppu=960]
import { buildModel, rasterOutline } from "../K1314/k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const ppu = Number(opt("ppu") ?? 960); const R = Number(opt("r") ?? 0.03);
const m = buildModel(nm); const x = Number(xs); const y = Number(ys);
const c0 = Math.round(x * ppu - R * ppu); const r0 = Math.round(y * ppu - R * ppu); const W = Math.ceil(2 * R * ppu); const H = W;
const O = rasterOutline(m, c0, r0, W, H, ppu);
const cnt = new Int32Array(W * H); const tris = new Map<number, number[]>();
const T = m.tri; const A = m.triA;
for (let t = 0; t < m.nTri; t++) {
  if (m.tb[4 * t + 2] < c0 / ppu || m.tb[4 * t] > (c0 + W) / ppu || m.tb[4 * t + 3] < r0 / ppu || m.tb[4 * t + 1] > (r0 + H) / ppu) continue;
  const ax = T[6 * t]; const ay = T[6 * t + 1]; const bx = T[6 * t + 2]; const by = T[6 * t + 3]; const cx = T[6 * t + 4]; const cy = T[6 * t + 5];
  const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (!(Math.abs(den) > 1e-18)) continue;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const px = (c0 + c + 0.5) / ppu; const py = (r0 + r + 0.5) / ppu;
    const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den; const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const i = r * W + c; cnt[i]++; (tris.get(i) ?? tris.set(i, []).get(i)!).push(t);
  }
}
const dig = (v: number): string => (v >= 0.999 ? "#" : v < 0.005 ? "." : String(Math.min(9, Math.floor(v * 10))));
console.log(`origin (${(c0 / ppu).toFixed(4)}, ${(r0 / ppu).toFixed(4)}) px ${(1 / ppu).toFixed(5)}; cover | ink (tenths)`);
for (let r = 0; r < H; r++) {
  let a = ""; let b = "";
  for (let c = 0; c < W; c++) { const i = r * W + c; a += cnt[i] ? String(Math.min(9, cnt[i])) : "."; b += dig(O.ink[i]); }
  console.log(`${String(r).padStart(3)} ${a} | ${b}`);
}
const dbl = new Map<string, number>();
for (const [, ts] of tris) {
  const by = new Map<number, number[]>(); for (const t of ts) (by.get(m.triP[t]) ?? by.set(m.triP[t], []).get(m.triP[t])!).push(t);
  for (const [p, l] of by) if (l.length > 1) { const k = `${p}:${l.join(",")}`; dbl.set(k, (dbl.get(k) ?? 0) + 1); }
}
for (const [k, n] of dbl) {
  const [p, l] = k.split(":"); const pc = m.table.pieces[Number(p)];
  console.log(`p${p} ${pc.kind} ch ${pc.chain}: tris ${l} overlap on ${n} px`);
  for (const t of l.split(",").map(Number)) console.log(`   t${t}: ${[0, 1, 2].map((q) => `(${T[6 * t + 2 * q].toFixed(4)}, ${T[6 * t + 2 * q + 1].toFixed(4)}) a ${A[3 * t + q].toFixed(3)}`).join("  ")}`);
}

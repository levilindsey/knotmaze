// K1277: where the triangles leave paper that master fills, at rest.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1277_cracks.ts <scene> [--ppu=40] [--n=12] [--near=x,y,r]
// For each such pixel: the nearest triangle (distance in px), its item
// (strip / ghost strip / cap / junction), and for a strip the segment
// (0 or N-1 = at a station) and the row pair (border or centre).
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame } from "./outline";
import { loadScene } from "./k1279_census";
import { fillResolution, fillStructure, fillFrame, rasterFill, itemVerts } from "./fill_tri";
import { paintFaces } from "./k1277_census";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const nm = args.find((a) => !a.startsWith("--")) ?? "fat";
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ppu = Number(opt("ppu") ?? 40); const nShow = Number(opt("n") ?? 12);
const near = opt("near")?.split(",").map(Number); // --near=x,y,r: only pixels within r of (x, y)
const scene = loadScene(nm);
const st = structure(scene); const table = frame(st, scene);
const fs = fillStructure(st, fillResolution(st, table)); const fr = fillFrame(fs, st, table, scene);
const file = join(here, "..", "out", "s14", "fb", `${nm}_${ppu}.bin`);
if (!existsSync(file)) throw new Error(`no form B grid ${file}: run k1277_census rest first`);
const b = readFileSync(file); const hd = new Float64Array(b.buffer.slice(b.byteOffset, b.byteOffset + 32));
const [x0, y0, W, H] = [hd[0], hd[1], hd[2], hd[3]];
const top = new Int32Array(b.buffer.slice(b.byteOffset + 32, b.byteOffset + 32 + 4 * W * H));
const gA = paintFaces(table.faces, x0, y0, W, H, ppu);
const gB = rasterFill(fs, fr, x0, y0, W, H, ppu);
// vertex -> item
const itemOfV = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, k) => {
  const n = itemVerts(it);
  for (let v = it.base; v < it.base + n; v++) itemOfV[v] = k;
});
const P = fr.pos; const I = fs.idx;
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax; const dy = by - ay; const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
// bucket triangles by cell for the nearest search
const cell = 0.25; const grid = new Map<string, number[]>();
for (let t = 0; t < I.length; t += 3) {
  const xs = [P[2 * I[t]], P[2 * I[t + 1]], P[2 * I[t + 2]]]; const ys = [P[2 * I[t] + 1], P[2 * I[t + 1] + 1], P[2 * I[t + 2] + 1]];
  for (let cx = Math.floor(Math.min(...xs) / cell); cx <= Math.floor(Math.max(...xs) / cell); cx++) for (let cy = Math.floor(Math.min(...ys) / cell); cy <= Math.floor(Math.max(...ys) / cell); cy++) {
    const k = `${cx},${cy}`; let l = grid.get(k); if (!l) { l = []; grid.set(k, l); } l.push(t);
  }
}
const hist: Record<string, number> = {}; const rows: string[] = [];
let n = 0;
for (let i = 0; i < W * H; i++) {
  if (!(top[i] >= 0 && gA[i] !== 0 && gB[i] === 0)) continue;
  const r = Math.floor(i / W); const c = i % W; const x = x0 + (c + 0.5) / ppu; const y = y0 + (r + 0.5) / ppu;
  if (near && Math.hypot(x - near[0], y - near[1]) > near[2]) continue;
  n++;
  let best = Infinity; let bt = -1;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const t of grid.get(`${Math.floor(x / cell) + dx},${Math.floor(y / cell) + dy}`) ?? []) {
    const a = I[t]; const bb = I[t + 1]; const cc = I[t + 2];
    const d = Math.min(segDist(x, y, P[2 * a], P[2 * a + 1], P[2 * bb], P[2 * bb + 1]), segDist(x, y, P[2 * bb], P[2 * bb + 1], P[2 * cc], P[2 * cc + 1]), segDist(x, y, P[2 * cc], P[2 * cc + 1], P[2 * a], P[2 * a + 1]));
    if (d < best) { best = d; bt = t; }
  }
  const it = bt >= 0 ? fs.items[itemOfV[I[bt]]] : null;
  let where = "none";
  if (it && it.kind === "strip") {
    const v = I[bt] - it.base; const Wd = it.N + 1; const row = Math.floor(v / Wd); const seg = v % Wd;
    where = `${it.ghost ? "ghost" : "strip"} ${seg === 0 || seg >= it.N - 1 ? "end" : "mid"}`;
    if (rows.length < nShow) rows.push(`  (${x.toFixed(3)}, ${y.toFixed(3)}) d ${(best * ppu).toFixed(2)} px ${where} iv ${it.iv} seg ${seg}/${it.N} row ${row} chain ${fs.vChain[I[bt]]} top ${top[i]}`);
  } else if (it) {
    where = it.kind;
    if (rows.length < nShow) rows.push(`  (${x.toFixed(3)}, ${y.toFixed(3)}) d ${(best * ppu).toFixed(2)} px ${where} ${it.kind === "junc" ? `j ${it.ji}` : `pi ${it.pi}`} chain ${fs.vChain[I[bt]]} top ${top[i]}`);
  }
  const db = best * ppu < 0.01 ? "on edge" : best * ppu < 0.5 ? "<0.5 px" : best * ppu < 2 ? "<2 px" : ">=2 px";
  hist[`${where} | ${db}`] = (hist[`${where} | ${db}`] ?? 0) + 1;
}
console.log(`${nm}: ${n} px where master fills, form B covers, triangles leave paper`);
for (const [k, v] of Object.entries(hist).sort((a, b) => b[1] - a[1])) console.log(`  ${v} ${k}`);
for (const r of rows) console.log(r);

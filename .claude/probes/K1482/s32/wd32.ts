// K1482 s32: whole-link mirror diff, env GF_S32 0 vs 1, per place: px changed, gained, lost.
//   npx tsx wd32.ts <scene.json> <sites.json> [stride=2] [thr=0.02]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , sp, sitesP, stS, tS] = process.argv;
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const T: any = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: process.env.GF_KRETRY === "1" }), true);
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const E: any = new GfEval(T); const st = Number(stS ?? 2); const thr = Number(tS ?? 0.02);
let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const s of SJ.sites) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
x0 = Math.max(0, Math.floor(x0 - 80)); y0 = Math.max(0, Math.floor(y0 - 80)); x1 = Math.min(3199, Math.ceil(x1 + 80)); y1 = Math.min(1799, Math.ceil(y1 + 80));
const t0 = Date.now(); const cells = new Map<string, { n: number; g: number; l: number; x: number; y: number; m: number }>(); let tot = 0;
for (let y = y0; y <= y1; y += st) for (let x = x0; x <= x1; x += st) {
  const fx = (x + 0.5 - e) / a; const fy = (y + 0.5 - f) / d;
  process.env.GF_S32 = "0"; const i0 = E.eval(fx, fy).ink; process.env.GF_S32 = "1"; const i1 = E.eval(fx, fy).ink;
  const dv = i1 - i0;
  if (Math.abs(dv) > thr) { tot++; const k = `${Math.floor(x / 24)},${Math.floor(y / 24)}`; const c = cells.get(k) ?? { n: 0, g: 0, l: 0, x, y, m: 0 }; c.n++; if (dv > 0) c.g++; else c.l++; if (Math.abs(dv) > c.m) { c.m = Math.abs(dv); c.x = x; c.y = y; } cells.set(k, c); }
}
const seen = new Set<string>(); const places: { n: number; g: number; l: number; x: number; y: number }[] = [];
for (const k of cells.keys()) { if (seen.has(k)) continue; const stk = [k]; seen.add(k); let n = 0, g = 0, l = 0, bx = 0, by = 0, bm = -1;
  while (stk.length) { const c = stk.pop()!; const v = cells.get(c)!; n += v.n; g += v.g; l += v.l; if (v.m > bm) { bm = v.m; bx = v.x; by = v.y; } const [cx, cy] = c.split(",").map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const q = `${cx + dx},${cy + dy}`; if (cells.has(q) && !seen.has(q)) { seen.add(q); stk.push(q); } } }
  places.push({ n, g, l, x: bx, y: by }); }
places.sort((p, q) => q.n - p.n);
console.log(`window ${x0},${y0}-${x1},${y1} stride ${st} thr ${thr}: ${tot} samples changed, ${places.length} places (gain-only ${places.filter((p) => p.l === 0).length}, loss-only ${places.filter((p) => p.g === 0).length}), ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const p of places) console.log(`  ${p.x},${p.y}: n ${p.n} gained ${p.g} lost ${p.l}`);

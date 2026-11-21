// K1482 s25: whole-link mirror diff of the shared outline. npx tsx wholediff25.ts <scene.json> <sites.json> <shareW> [stride=3] [kr=0] [T=0.3]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval, GF_CAPB } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => {
  if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN;
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const [, , sp, sitesP, shS, stS, krS, tS] = process.argv;
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const aa = 0.011738963274354473;
const T0 = buildTables(scene, { aa, kRetry: krS === "1" ? true : undefined });
const T: any = withHome ? withHome(T0, true) : { ...T0, homeOn: true };
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const E: any = new GfEval(T); const st = Number(stS ?? 3); const thr = Number(tS ?? 0.3);
let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const s of SJ.sites) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
x0 = Math.max(0, Math.floor(x0 - 60)); y0 = Math.max(0, Math.floor(y0 - 60)); x1 = Math.ceil(x1 + 60); y1 = Math.ceil(y1 + 60);
const t0 = Date.now(); const cells = new Map<string, { n: number; x: number; y: number }>(); let tot = 0;
for (let y = y0; y <= y1; y += st) for (let x = x0; x <= x1; x += st) {
  const fx = (x + 0.5 - e) / a; const fy = (y + 0.5 - f) / d;
  GF_CAPB.on = false; const i0 = E.eval(fx, fy).ink; GF_CAPB.on = shS === "1"; const i1 = E.eval(fx, fy).ink;
  if (Math.abs(i1 - i0) > thr) { tot++; const k = `${Math.floor(x / 30)},${Math.floor(y / 30)}`; const c = cells.get(k) ?? { n: 0, x, y }; c.n++; cells.set(k, c); }
}
// merge adjacent cells into places
const keys = [...cells.keys()]; const seen = new Set<string>(); const places: { n: number; x: number; y: number }[] = [];
for (const k of keys) { if (seen.has(k)) continue; const st2 = [k]; seen.add(k); let n = 0; let bx = 0, by = 0, bn = -1;
  while (st2.length) { const c = st2.pop()!; const v = cells.get(c)!; n += v.n; if (v.n > bn) { bn = v.n; bx = v.x; by = v.y; } const [cx, cy] = c.split(",").map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const q = `${cx + dx},${cy + dy}`; if (cells.has(q) && !seen.has(q)) { seen.add(q); st2.push(q); } } }
  places.push({ n, x: bx, y: by }); }
places.sort((p, q) => q.n - p.n);
console.log(`window ${x0},${y0}-${x1},${y1} stride ${st}: ${tot} samples changed, ${places.length} places, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(places.slice(0, 15).map((p) => `${p.x},${p.y}:${p.n}`).join(" "));


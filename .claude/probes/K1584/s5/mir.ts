// K1584 s5: render the CPU mirror (GfEval, no gap cuts) around a world point from one capture's SCENE dump, and
// keep each pixel's winning outline term.   npx tsx mir.ts <capDir> <wx> <wy> <halfWorld> <px> <outPrefix>
// Writes <outPrefix>.json: { w, h, x0, y0, step, ink[], cov[], chain[], wk[], wa[], wb[] } (row-major, y down).
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, sx, sy, sh, spx, op] = process.argv;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const ev = new GfEval(T); ev.fadeLength = L.lookFade(G);
const wx = +sx, wy = +sy, hw = +sh, n = +spx; const step = (2 * hw) / n; const x0 = wx - hw, y0 = wy - hw;
const ink: number[] = [], cov: number[] = [], chain: number[] = [], wk: number[] = [], wa: number[] = [], wb: number[] = [];
for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
  const o = ev.eval(x0 + (i + 0.5) * step, y0 + (j + 0.5) * step);
  ink.push(+o.ink.toFixed(3)); cov.push(+o.cov.toFixed(3)); chain.push(o.chain); wk.push(o.winKind); wa.push(o.winA); wb.push(o.winB);
}
writeFileSync(op + ".json", JSON.stringify({ w: n, h: n, x0, y0, step, ink, cov, chain, wk, wa, wb }));
console.log("ok", op);

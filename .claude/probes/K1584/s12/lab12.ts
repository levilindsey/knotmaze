// K1584 s12: the CPU field's label per device pixel in a box (GfEval, no gap step): chain, ink, winning outline term
// (winKind, winA, winB), for colour maps of which border is which.
//   npx tsx lab12.ts <capDir> x0,y0,x1,y1 <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const R = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(R, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(R, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(R, "src/render/gpu_field/eval.ts")).href);
const L = await import(pathToFileURL(join(R, "src/render/gpu_field/gf_look.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, sBox, op] = process.argv; const [x0, y0, x1, y1] = sBox.split(",").map(Number);
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const A = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")).toDevA;
const T = withHome(buildTables(scene, { aa: 0.5 / Math.abs(A[0]), kRetry: true }), true);
const ev = new GfEval(T); ev.fadeLength = L.lookFade(G);
const rows: any[] = [];
for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
  const x = (X + 0.5 - A[4]) / A[0], y = (Y + 0.5 - A[5]) / A[3];
  const o = ev.eval(x, y);
  rows.push([X, Y, o.chain, +o.ink.toFixed(3), +o.s.toFixed(3), o.winKind, o.winA, o.winB]);
}
writeFileSync(op, JSON.stringify({ box: [x0, y0, x1, y1], rows }));
console.log(`${rows.length} px`);

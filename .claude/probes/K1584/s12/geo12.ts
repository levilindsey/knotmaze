// K1584 s12: the geometry around one device point of a capture, for overlays: every chain sample within the box
// (device px, chain, sample index, arc), the crossings in it (device px at the under's ctrl; over, under, index) and the
// joint corners (kCx/kCy, chains, tangent arcs, tight, theta).
//   npx tsx geo12.ts <capDir> <x> <y> <half> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const R = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(R, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(R, "src/render/gpu_field/gf_build.ts")).href);
const { kArcOfCtrl } = await import(pathToFileURL(join(R, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, sx, sy, sh, op] = process.argv; const X = +sx, Y = +sy, H = +sh;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const A = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")).toDevA;
const T = withHome(buildTables(scene, { aa: 0.5 / Math.abs(A[0]), kRetry: true }), true);
const dev = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
const inB = (p: number[]) => Math.abs(p[0] - X) <= H && Math.abs(p[1] - Y) <= H;
const samples: any[] = [];
for (let c = 0; c < G.chainSamples.length; c++) {
  const sm = G.chainSamples[c]; if (!sm || !G.kcv[c]) continue;
  const arcPer = G.kd.geom[G.kcv[c].geom * 4 + 1];
  for (let k = 0; k < sm.count; k++) { const p = dev(sm.positions[2 * k], sm.positions[2 * k + 1]); if (inB(p)) samples.push([c, k, +(k * arcPer).toFixed(3), +p[0].toFixed(2), +p[1].toFixed(2)]); }
}
const crossings: any[] = [];
G.crossings.forEach((x: any, i: number) => {
  const su = G.chainSamples[x.underChain]; if (!su) return;
  const arcPer = G.kd.geom[G.kcv[x.underChain].geom * 4 + 1];
  const uC = kArcOfCtrl(G.kd, G.kcv[x.underChain], x.underCtrl); const k = Math.min(su.count - 1, Math.round(uC / arcPer));
  const p = dev(su.positions[2 * k], su.positions[2 * k + 1]);
  const oC = kArcOfCtrl(G.kd, G.kcv[x.overChain], x.overCtrl);
  if (inB(p)) crossings.push({ i, over: x.overChain, under: x.underChain, uC: +uC.toFixed(3), oC: +oC.toFixed(3), x: +p[0].toFixed(2), y: +p[1].toFixed(2) });
});
const corners: any[] = [];
for (let k = 0; k < T.kCx.length; k++) {
  const p = dev(T.kCx[k], T.kCy[k]);
  if (inB(p)) corners.push({ k, x: +p[0].toFixed(2), y: +p[1].toFixed(2), a: T.kCa[k], sa: +T.kSa[k].toFixed(3), b: T.kCb[k], sb: +T.kSb[k].toFixed(3), tight: T.kTight?.[k], theta: +(T.kTheta[k] * 180 / Math.PI).toFixed(1), Rpx: +((T.kR[k] + T.W) * Math.abs(A[0])).toFixed(2) });
}
writeFileSync(op, JSON.stringify({ X, Y, H, toDevA: A, samples, crossings, corners }));
console.log(`samples ${samples.length}, crossings ${JSON.stringify(crossings)}\ncorners ${JSON.stringify(corners)}`);

// K1584 s6: list every tight turn (tables.ts kTight) of one capture's scene: corner index, fillet centre and radius,
// tangent points, chains, junction, all in world and device (capture image) coordinates.
//   npx tsx tight.ts <capDir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, out] = process.argv;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const dev = (x: number, y: number) => [+(A[0] * x + A[2] * y + A[4]).toFixed(1), +(A[1] * x + A[3] * y + A[5]).toFixed(1)];
const res: any[] = [];
for (let k = 0; k < T.nK; k++) {
  if (!T.kTight || !T.kTight[k]) continue;
  res.push({ k, j: T.kJ[k], ca: T.kCa[k], cb: T.kCb[k], c: [T.kCx[k], T.kCy[k]], r: T.kR[k], h: T.h, W: T.W, dev: dev(T.kCx[k], T.kCy[k]),
    ta: dev(T.kTax[k], T.kTay[k]), tb: dev(T.kTbx[k], T.kTby[k]), theta: T.kTheta[k], ext: T.kExt ? T.kExt[k] : 0 });
}
writeFileSync(out, JSON.stringify({ A, h: T.h, W: T.W, aa, tight: res }));
console.log(capDir.split(/[\\/]/).pop(), "tight", res.length, "h", T.h, "W", T.W, res.map((r) => `k${r.k}@${r.dev}`).join(" "));

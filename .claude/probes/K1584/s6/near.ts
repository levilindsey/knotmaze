// K1584 s6: corners near a world point (tables.ts), tight or not: fillet centre and radius,
// tangent points, chains, junction, all in world and device (capture image) coordinates.
//   npx tsx near.ts <capDir> <wx> <wy> <radius>: every corner (tight or not) within radius of a world point
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
const [, , capDir, wxs, wys, rs] = process.argv; const wx = +wxs, wy = +wys, rad = +rs;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const dev = (x: number, y: number) => [+(A[0] * x + A[2] * y + A[4]).toFixed(1), +(A[1] * x + A[3] * y + A[5]).toFixed(1)];
for (let k = 0; k < T.nK; k++) {
  const d = Math.hypot(T.kCx[k] - wx, T.kCy[k] - wy); if (d > rad) continue;
  console.log(`k${k} j${T.kJ[k]} c${T.kCa[k]}/c${T.kCb[k]} tight ${T.kTight ? T.kTight[k] : "-"} kR ${T.kR[k].toFixed(3)} theta ${(T.kTheta[k] * 180 / Math.PI).toFixed(0)} dist ${d.toFixed(3)} dev ${dev(T.kCx[k], T.kCy[k])} sa ${T.kSa[k].toFixed(2)} sb ${T.kSb[k].toFixed(2)}`);
}

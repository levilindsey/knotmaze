// K1584 s10: how far a corner's pixel list reaches (gf_glsl.ts's ring test: a pixel lists corner k only where
// kR - aa - W < rho <= kRmax + W + 2aa), in device px, for named corners of a capture. lkBall sees only listed corners,
// so a tight wedge's open form (to GAP_OPEN_END radii) stops where this reach ends.
//   npx tsx kreach.ts <capDir> <k1,k2,...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const R = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(R, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(R, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, sK] = process.argv;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const A = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")).toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const W = T.W ?? T.w ?? NaN; const sc = Math.abs(A[0]);
for (const k of sK.split(",").map(Number)) {
  const cx = A[0] * T.kCx[k] + A[2] * T.kCy[k] + A[4], cy = A[1] * T.kCx[k] + A[3] * T.kCy[k] + A[5];
  const reach = (T.kRmax[k] + W + 2 * aa) * sc, ball = (T.kR[k] + W) * sc;
  console.log(`k${k} centre (${cx.toFixed(1)}, ${cy.toFixed(1)}) kR ${(T.kR[k] * sc).toFixed(2)} px kRmax ${(T.kRmax[k] * sc).toFixed(2)} px W ${(W * sc).toFixed(2)} px ball ${ball.toFixed(2)} px list reach ${reach.toFixed(2)} px = ${(reach / ball).toFixed(2)} ball radii`);
}

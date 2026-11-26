// K1584 s6: each tight turn's ball against the crossings near it: for crossings whose under chain is one of the corner's
// chains (or any chain) within 1.2 world of the ball's centre q, the over chain's distance from q (y = d - h: < 0 inside
// the over's fill, 0..margin in the gap band), and the crossing's distance from q.
//   npx tsx ballgeo.ts <capDir> <cnt.json> <tight.json>
import { readFileSync } from "node:fs";
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
const [, , capDir, cntP, tP] = process.argv;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const T = withHome(buildTables(scene, { aa: 0.5 / Math.abs(A[0]), kRetry: true }), true);
const CN = JSON.parse(readFileSync(cntP, "utf8")); const TJ = JSON.parse(readFileSync(tP, "utf8"));
const dist = (c: number, x: number, y: number): number => {
  let best = Infinity; const v0 = T.cV0[c]; const nv = T.cNV[c];
  for (let v = v0; v < v0 + nv - 1; v++) {
    const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - dx * u, y - ay - dy * u));
  }
  return best;
};
for (const b of TJ.tight) {
  const [qx, qy] = b.c; const rows: string[] = [];
  for (const x of CN.crossings) {
    const dq = Math.hypot(x.wx - qx, x.wy - qy); if (dq > 1.2) continue;
    const own = x.under === b.ca || x.under === b.cb;
    rows.push(`x${x.i} u${x.under}${own ? "*" : ""} o${x.over} at ${dq.toFixed(2)} y ${(dist(x.over, qx, qy) - CN.h).toFixed(3)}`);
  }
  console.log(`k${b.k} j${b.j} c${b.ca}/c${b.cb} ${b.dev} R ${(b.r + TJ.W).toFixed(3)}: ${rows.join("; ")}`);
}

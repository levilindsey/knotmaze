// K1482 s40: what buries the other arm's outline at a corner's tangent point (the point qO of that outline nearest
// it): per corner k.t, the other arm's distance from the point, qO, and every tube / corner sector that covers qO.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s40/qo40.ts <scene.json> <sites.json> <k.a|k.b,...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, list] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h;
const E: any = new GfEval(T);
const dev = (x: number, y: number): string => `${(x * a + e).toFixed(1)},${(y * d + f).toFixed(1)}`;
for (const it of list.split(",")) {
  const [ks, ts] = it.split("."); const k = +ks; const t = ts === "b";
  const tx = t ? T.kTbx[k] : T.kTax[k]; const ty = t ? T.kTby[k] : T.kTay[k]; const cO = t ? T.kCa[k] : T.kCb[k]; const S = T.kG[k];
  E.eval(tx, ty);
  for (let m = 0; m < E.np; m++) {
    if (E.pc[m] !== cO || E.psurf[m] !== S) continue;
    const dO = Math.sqrt(E.pieceD(m, tx, ty)); if (!(dO < h)) continue;
    // qO as outlineBur takes it
    const c = cO; const v0 = T.cV0[c]; const nseg = T.cNV[c] - 1; let d2 = Infinity, fx = tx, fy = ty;
    for (let kk = E.plo[m]; kk <= E.phi[m]; kk++) { let q = kk; if (T.cClosed[c] === 1) q = ((q % nseg) + nseg) % nseg; else if (q < 0 || q >= nseg) continue; const v = v0 + q; const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay; const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((tx - ax) * dx + (ty - ay) * dy) / l2)) : 0; const ex = tx - ax - dx * u, ey = ty - ay - dy * u; if (ex * ex + ey * ey < d2) { d2 = ex * ex + ey * ey; fx = ax + dx * u; fy = ay + dy * u; } }
    const dd = Math.sqrt(d2); const qx = fx + (h * (tx - fx)) / dd, qy = fy + (h * (ty - fy)) / dd;
    const rows: string[] = [];
    for (let m2 = 0; m2 < E.np; m2++) { if (E.psurf[m2] !== S || E.pc[m2] === cO) continue; const d3 = Math.sqrt(E.pieceD(m2, qx, qy)); if (d3 < 1.1 * h) rows.push(`c${E.pc[m2]}${E.pc[m2] === (t ? T.kCb[k] : T.kCa[k]) ? "(own)" : ""} d ${(d3 / h).toFixed(3)} h`); }
    for (let i = 0; i < E.nk; i++) { const k2 = E.kk[i]; if (T.kG[k2] !== S) continue; const rq = Math.hypot(qx - T.kCx[k2], qy - T.kCy[k2]); if (rq > T.kR[k2] && rq < T.kRmax[k2] && E.inSector(k2, qx, qy)) rows.push(`sector k${k2}${E.outsideArms(k2, cO, qx, qy) ? "" : " (inside arms)"}`); }
    console.log(`k${k}.${ts} j${T.kJ[k]}: T ${dev(tx, ty)} other c${cO} s${E.ps[m].toFixed(2)} d ${(dO / h).toFixed(3)} h; qO ${dev(qx, qy)}; outlineBur ${E.outlineBur(m, tx, ty, S).toFixed(2)}; covers qO: ${rows.join("; ") || "none"}`);
  }
}

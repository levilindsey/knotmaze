// K1572 27Z4: at each place, for every px whose border ink changes between GfEval.S37 "0" (master) and ""
// (candidate), find the burying own-arm piece with the largest plain burial at the face point (arc q or
// tangent T) and report outlineBur's factor there: min / max over the changed px, plus the corner's R/h.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1572/factor27z4.ts <scene.json> <sites.json> <maze> <x,y,site;...> [R=24]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) { const F: any = (globalThis as any)[v.__t]; return F.from(v.v.map(dec)); } const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, maze, list, Rs] = process.argv; const R = +(Rs ?? 24);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h; const aa = T.aa;
const E: any = new GfEval(T);
const ss = (e0: number, e1: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
for (const it of list.split(";").filter(Boolean)) {
  const [xs, ys, site] = it.split(","); const cx = +xs, cy = +ys;
  let fmin = Infinity, fmax = -Infinity, n = 0, Rh = 0, ndiff = 0;
  for (let Y = cy - R; Y <= cy + R; Y++) for (let X = cx - R; X <= cx + R; X++) {
    const fx = (X + 0.5 - e) / a, fy = (Y + 0.5 - f) / d;
    GfEval.S37 = "0"; const r0 = E.eval(fx, fy); const q0 = { ink: r0.ink, winKind: r0.winKind, winA: r0.winA, winB: r0.winB };
    GfEval.S37 = ""; const q1 = E.eval(fx, fy);
    if (Math.abs(q1.ink - q0.ink) <= 0.02) continue; ndiff++;
    // face point of the BEFORE winner: arc -> q on circle; tan -> T; else the px itself
    let k = -1, qx = fx, qy = fy;
    if (q0.winKind === 2) { k = q0.winA; const rho = Math.hypot(fx - T.kCx[k], fy - T.kCy[k]); qx = T.kCx[k] + (T.kR[k] * (fx - T.kCx[k])) / rho; qy = T.kCy[k] + (T.kR[k] * (fy - T.kCy[k])) / rho; }
    else if (q0.winKind === 4) { k = q0.winA; qx = q0.winB ? T.kTbx[k] : T.kTax[k]; qy = q0.winB ? T.kTby[k] : T.kTay[k]; }
    else continue;
    Rh = T.kR[k] / h;
    const S = T.kG[k]; const cA = T.kCa[k]; const cB = T.kCb[k];
    let bm = -1, bw = 0;
    for (let m = 0; m < E.np; m++) {
      if (E.psurf[m] !== S || (E.pc[m] !== cA && E.pc[m] !== cB)) continue;
      const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(E.pieceD(m, qx, qy)));
      if (wb2 > bw) { bw = wb2; bm = m; }
    }
    if (bm < 0 || bw <= 0) continue;
    E.cellI = Math.floor((fy - T.gy0) / T.G) * T.gW + Math.floor((fx - T.gx0) / T.G);
    const ob = E.outlineBur(bm, qx, qy, S);
    if (ob < fmin) fmin = ob; if (ob > fmax) fmax = ob; n++;
  }
  console.log(`${maze} ${site} @${cx},${cy} diffPx ${ndiff} changedFaces ${n} outlineBur min ${fmin === Infinity ? "-" : fmin.toFixed(3)} max ${fmax === -Infinity ? "-" : fmax.toFixed(3)} Rh ${Rh.toFixed(3)}`);
}

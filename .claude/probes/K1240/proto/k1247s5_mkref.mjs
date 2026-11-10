// K1247 s5: writes outline_ref.ts (scratch, never committed), a copy of
// outline.ts whose corner growth takes its node count at run time
// (setRefGN) and, with setRefStop(true), stops exactly where w reaches 0:
// the last interval is bisected on the path (re-advanced from the last
// node each time) and integrated by the trapezoid over the bisection's
// points. Same equations otherwise: advanceToC (r0/N steps), wOfC and
// the running min, the final re-advance from node floor(integ / dN).
//   node .claude/probes/K1240/proto/k1247s5_mkref.mjs
// Used by k1247s5_ref.ts.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
let t = readFileSync(join(here, "outline.ts"), "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => { if (!t.includes(a)) throw new Error("missing: " + a); t = t.split(a).join(b); };
const MAXN = 65537;
rep("const kfGN = 32;", "let kfGN = 32;\nlet refStop = false;\nexport function setRefGN(n: number): void { kfGN = n; }\nexport function setRefStop(b: boolean): void { refStop = b; }\nexport const refInfo = { why: new Int32Array(8192), rhoEnd: new Float64Array(8192) };");
rep("new Float64Array(33 * 12)", `new Float64Array(${MAXN} * 12)`);
rep("new Int32Array(33 * 2)", `new Int32Array(${MAXN} * 2)`);
// Debug: record each failed advance attempt (env K1247S5_DBG=1).
if (process.env.K1247S5_DBG) {
  rep("        if (sok && Math.sqrt(", "        refDbgDist = Math.sqrt((sx - gx) * (sx - gx) + (sy - gy) * (sy - gy)); refDbgAcc = acc;\n        if (sok && Math.sqrt(");
  rep("export const refInfo = {", "let refDbgDist = -1; let refDbgAcc = -1;\nexport const refDbg: { on: boolean; log: string[] } = { on: false, log: [] };\nexport const refInfo = {");
  rep("    let advanced = false;\n    if (kfQa.d > 1e-12", "    let advanced = false; refDbgDist = -1; refDbgAcc = -1;\n    if (kfQa.d > 1e-12");
  rep("    else { step /= 2; if (step < 1e-5 * h) break; }", "    else { step /= 2; if (step < 1e-5 * h) { if (refDbg.on) refDbg.log.push(`giveup ci ${refCi} rho ${((kfCst.rhoCur - h) / kfCst.r0).toFixed(4)}r0 of ${(kfCst.r0 / h).toFixed(3)}h dist ${(refDbgDist / h).toExponential(2)} acc ${(refDbgAcc / h).toExponential(2)} sokF ${((Math.max(Math.abs(kfTa.d - rn), Math.abs(kfTb.d - rn))) / h).toExponential(1)} ka ${kfQa.k}->${kfTa.k} kb ${kfQb.k}->${kfTb.k} dua ${((kfTa.u - kfQa.u) / h).toFixed(4)} dub ${((kfTb.u - kfQb.u) / h).toFixed(4)}`); break; } }");
}
// The reference's acceptance floor (refAccFloor * h; today 1e-3).
rep("const acc = Math.min(h, Math.max(0.5 * Math.sqrt(ux * ux + uy * uy) * dd, 1e-3 * h));", "const acc = Math.min(h, Math.max(0.5 * Math.sqrt(ux * ux + uy * uy) * dd, refAccFloor * h));");
rep("export const refInfo = {", "let refAccFloor = 1e-3; let refCi = -1;\nexport const refTrace: { ci: number; rows: number[][] } = { ci: -1, rows: [] };\nfunction refTraceRow(C: FCache, w: number): void {\n  const h = C.h; const W = C.W;\n  const denQ = 1 + ((kfCst.qx - kfQa.x) * (kfCst.qx - kfQb.x) + (kfCst.qy - kfQa.y) * (kfCst.qy - kfQb.y)) / ((kfQa.d || 1) * (kfQb.d || 1));\n  const slack = Math.min(C.armL[kfCst.aiA] - W - (kfQa.u - C.armSR[kfCst.aiA]) * C.armDir[kfCst.aiA], C.armL[kfCst.aiB] - W - (kfQb.u - C.armSR[kfCst.aiB]) * C.armDir[kfCst.aiB]);\n  const mA = marginOfC(C, kfCst.aiA, kfQa, kfCst.wCacheA); const mB = marginOfC(C, kfCst.aiB, kfQb, kfCst.wCacheB);\n  refTrace.rows.push([(kfCst.rhoCur - h) / h, w, denQ / kfCst.denV, slack / h, ((kfQa.u - C.armSR[kfCst.aiA]) * C.armDir[kfCst.aiA]) / kfCst.rbEff, ((kfQb.u - C.armSR[kfCst.aiB]) * C.armDir[kfCst.aiB]) / kfCst.rbEff, mA / h, mB / h, kfCst.qx, kfCst.qy, kfQa.u, kfQb.u]);\n}\nexport function setRefAccFloor(v: number): void { refAccFloor = v; }\nexport const refInfo = {");
const a = t.indexOf("function growIntegC(");
const b = t.indexOf("const meetScratch");
if (a < 0 || b < 0) throw new Error("growIntegC not found");
const grow = `function restoreNodeC(kk: number, rho: number): void {
  const NS = nodeScratch; const NK = nodeScratchK; const o = kk * 12;
  kfCst.qx = NS[o]; kfCst.qy = NS[o + 1];
  kfQa.d = NS[o + 2]; kfQa.x = NS[o + 3]; kfQa.y = NS[o + 4]; kfQa.s = NS[o + 5]; kfQa.u = NS[o + 6]; kfQa.k = NK[2 * kk];
  kfQb.d = NS[o + 7]; kfQb.x = NS[o + 8]; kfQb.y = NS[o + 9]; kfQb.s = NS[o + 10]; kfQb.u = NS[o + 11]; kfQb.k = NK[2 * kk + 1];
  kfCst.rhoCur = rho;
}
const refPtsR = new Float64Array(256); const refPtsW = new Float64Array(256);
function growIntegC(C: FCache, ci: number): number {
  copyFoot(kfQa, kfFa); copyFoot(kfQb, kfFb);
  kfQa.u = C.armSR[kfCst.aiA] + C.armDir[kfCst.aiA] * armDistC(C, kfCst.aiA, kfFa.s);
  kfQb.u = C.armSR[kfCst.aiB] + C.armDir[kfCst.aiB] * armDistC(C, kfCst.aiB, kfFb.s);
  kfCst.qx = kfCst.Vx; kfCst.qy = kfCst.Vy; kfCst.rhoCur = C.h;
  refInfo.why[ci] = 0; refInfo.rhoEnd[ci] = C.h; refCi = ci;
  if (!(kfCst.r0 > 1e-9)) { C.nodeN[ci] = 0; return 0; }
  const h = C.h;
  const dN = kfCst.r0 / kfGN;
  saveNodeC(0);
  let sPrev = wOfC(C);
  let integ = 0;
  let nNodes = 1;
  let why = 1; // 1 r0 reached, 2 w reached 0, 3 advance failed
  if (!(sPrev > 0)) why = 2;
  for (let kk = 1; kk <= kfGN; kk++) {
    if (!(sPrev > 0)) { why = 2; break; }
    advanceToC(C, h + kk * dN);
    if (kfCst.rhoCur < h + kk * dN - 1e-9 * Math.max(1, h + kk * dN)) {
      const sK = Math.min(sPrev, wOfC(C));
      integ += 0.5 * (sPrev + sK) * Math.max(0, kfCst.rhoCur - (h + (kk - 1) * dN));
      why = 3;
      break;
    }
    const sW = wOfC(C);\n    if (ci === refTrace.ci) refTraceRow(C, sW);
    if (refStop && !(sW > 0)) {
      // Bisect the first zero on [rho_{k-1}, rho_k] along the path.
      const r0k = h + (kk - 1) * dN;
      let lo = r0k; let hi = h + kk * dN; let n = 0;
      refPtsR[n] = r0k; refPtsW[n] = sPrev; n++;
      for (let it = 0; it < 60 && hi - lo > 1e-10 * h; it++) {
        const m = 0.5 * (lo + hi);
        restoreNodeC(kk - 1, r0k);
        advanceToC(C, m);
        if (kfCst.rhoCur < m - 1e-9 * Math.max(1, m)) { hi = m; continue; }
        const wm = wOfC(C);
        if (wm > 0) { lo = m; refPtsR[n] = m; refPtsW[n] = wm; n++; } else hi = m;
      }
      // Trapezoid over the accepted points in rho order, running min, to hi (w = 0).
      const idx: number[] = []; for (let i = 0; i < n; i++) idx.push(i);
      idx.sort((x, y) => refPtsR[x] - refPtsR[y]);
      let wPrev = sPrev; let rPrev = r0k;
      for (let i = 1; i < idx.length; i++) {
        const wi = Math.min(wPrev, refPtsW[idx[i]]);
        integ += 0.5 * (wPrev + wi) * (refPtsR[idx[i]] - rPrev);
        wPrev = wi; rPrev = refPtsR[idx[i]];
      }
      integ += 0.5 * wPrev * (hi - rPrev);
      // The re-advance below starts from a saved node: put node kk-1 back.
      why = 2;
      break;
    }
    saveNodeC(kk); nNodes = kk + 1;
    const sK = Math.min(sPrev, sW);
    integ += 0.5 * (sPrev + sK) * dN;
    sPrev = sK;
  }
  C.nodeN[ci] = nNodes;
  const k0 = Math.min(nNodes - 1, Math.floor(integ / dN));
  restoreNodeC(k0, h + k0 * dN);
  advanceToC(C, h + integ);
  refInfo.why[ci] = why; refInfo.rhoEnd[ci] = kfCst.rhoCur;
  return Math.max(0, kfCst.rhoCur - h);
}

`;
t = t.slice(0, a) + grow + t.slice(b);
writeFileSync(join(here, "outline_ref.ts"), t);
console.log("wrote outline_ref.ts");

// K1482 s4: one pixel through GfEval: its pieces (chain, s, d, depth, key, group, ramp) and the result.
//   npx tsx px_probe.ts <tables.json> <sites.json> <site> <tx> <ty> [R=24]   (tx, ty: the mirror tile's pixel)
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , tp, sp, nm, txs, tys, Rs] = process.argv; const R = +(Rs ?? 24);
const SRC = resolve(import.meta.dirname, "../../..");
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA; const s = SJ.sites.find((q: any) => q.site === nm);
const px = Math.round(s.x) - R + +txs + 0.5, py = Math.round(s.y) - R + +tys + 0.5; const wx = (px - e) / a, wy = (py - f) / d;
const E: any = new GfEval(T); const o = { ...E.eval(wx, wy) };
console.log(`world ${wx.toFixed(3)},${wy.toFixed(3)}`, JSON.stringify(o));
for (let j = 0; j < E.np; j++) console.log(`  piece ${j} c ${E.pc[j]} s ${E.ps[j].toFixed(3)} d ${E.pd[j].toFixed(3)} z ${E.pz[j].toFixed(3)} key ${E.pkey[j].toFixed(3)} g ${E.pg[j]} ramp ${E.pramp[j].toFixed(3)} end ${E.pend[j]} surf ${E.psurf[j]}`);
const c = E.pc[0]; const A0 = T.cArm0[c], AN = T.cArmN[c];
for (const cc of new Set(Array.from({ length: E.np }, (_, j) => E.pc[j]))) for (let i = T.cArm0[cc]; i < T.cArm0[cc] + T.cArmN[cc]; i++) console.log(`  arm c ${cc} i ${i} sR ${T.aSR[i].toFixed(3)} dir ${T.aDir[i]} L ${T.aL[i].toFixed(3)} Lcut ${T.aLcut[i].toFixed(3)} home ${T.aHome[i].toFixed(3)} g ${T.aG[i]}`);

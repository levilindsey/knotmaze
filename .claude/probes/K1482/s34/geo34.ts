// K1482 s34: geometry near a site of link A, in device px: chain polylines over s ranges, the arms of a group, pins.
//   npx tsx geo34.ts <scene.json> <sites.json> <group> <c:s0:s1;c:s0:s1;...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome, chainAt } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , sp, sitesP, gS, rngS] = process.argv;
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const T: any = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const dev = (x: number, y: number): string => `${(x * a + e).toFixed(1)},${(y * d + f).toFixed(1)}`;
const E: any = new GfEval(T); const h = T.h;
console.log(`h ${h} W ${T.W} aa ${T.aa} zt ${T.zt} amp ${T.amp} win ${T.win} px/h ${(h * a).toFixed(2)}`);
const G = +gS;
for (let i = 0; i < T.nA; i++) if (T.aG[i] === G) {
  let c = -1; for (let cc = 0; cc < T.nC; cc++) if (i >= T.cArm0[cc] && i < T.cArm0[cc] + T.cArmN[cc]) c = cc;
  const p = chainAt(T, c, T.aSR[i]);
  console.log(`arm ${i} chain ${c} sR ${T.aSR[i].toFixed(3)} dir ${T.aDir[i]} L ${T.aL[i].toFixed(3)} Lcut ${T.aLcut[i].toFixed(3)} home ${T.aHome[i].toFixed(3)} root ${dev(p.x, p.y)} len ${T.cLen[c].toFixed(2)} closed ${T.cClosed[c]}`);
}
for (const r of rngS.split(";")) {
  const [c, s0, s1] = r.split(":").map(Number);
  const pins: string[] = []; for (let k = T.cPin0[c]; k < T.cPin0[c] + T.cPinN[c]; k++) if (T.pinS[k] > s0 - 1 && T.pinS[k] < s1 + 1) pins.push(`s${T.pinS[k].toFixed(2)} z${T.pinZ[k].toFixed(2)}`);
  console.log(`chain ${c} s ${s0}..${s1} len ${T.cLen[c].toFixed(2)} closed ${T.cClosed[c]} first s ${T.vs[T.cV0[c]].toFixed(3)} pins: ${pins.join(" ")}`);
  const out: string[] = [];
  for (let s = s0; s <= s1 + 1e-9; s += 0.05) { const p = chainAt(T, c, s); const m = E.memberAt(c, s); out.push(`s${s.toFixed(2)}@${dev(p.x, p.y)} g${m.g}r${m.ramp.toFixed(2)}`); }
  console.log("  " + out.join(" "));
}

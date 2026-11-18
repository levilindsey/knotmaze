// K1451 s4: the pins and arms near a spot: each pin's s2 windows (GF_NOCLIP=1 required), the arm-clip windows, the
// nearest arm interval each way, and the arms whose root lies near.
//   $env:GF_NOCLIP='1'; node scripts/run_node.mjs .claude/probes/K1451/k1451_s4_pins.ts [R=3 (h)] <scene:x:y>...
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables, chainAt } from "../../../src/render/gpu_field/tables.ts";
const args = process.argv.slice(2); const R = +args[0]; const specs = args.slice(1);
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(3) : "inf");
for (const spec of specs) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  const sc = buildModel(nm).scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
  const T: any = buildTables(sc, { aa, home: true }); const h = T.h;
  console.log(`== ${spec} h ${h} win ${f(T.win)} amp ${T.amp}`);
  for (let c = 0; c < T.nC; c++) {
    const closed = T.cClosed[c] === 1; const len = T.cLen[c];
    for (let q = T.cPin0[c]; q < T.cPin0[c] + T.cPinN[c]; q++) {
      const P = chainAt(T, c, T.pinS[q]); const d = Math.hypot(P.x - X, P.y - Y) / h; if (d > R) continue;
      const s = T.pinS[q]; const md = (v: number): number => ((v % len) + len) % len;
      const ivs: string[] = [];
      for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) {
        const ext = Math.max(T.aL[i], T.aHome[i]); const e2 = T.aSR[i] + T.aDir[i] * ext; const lo = Math.min(T.aSR[i], e2); const hi = Math.max(T.aSR[i], e2);
        const dR = closed ? md(lo - s) : lo - s; const dL = closed ? md(s - hi) : s - hi;
        const inside = closed ? md(s - lo) <= hi - lo : s >= lo && s <= hi;
        if (inside || Math.min(Math.abs(dR), Math.abs(dL)) < 4 * h) ivs.push(`arm${i}(j${T.arms?.[i]?.j ?? "?"} g${T.aG[i]} dir${T.aDir[i]} L${f(T.aL[i])} home${f(T.aHome[i])} ${inside ? "IN" : `dR ${f(dR)} dL ${f(dL)}`})`);
      }
      console.log(`  pin ${q} c${c} s ${f(s)} z ${T.pinZ[q] > 0 ? "+" : "-"} at (${f(P.x)},${f(P.y)}) d ${f(d)}h  s2 wL ${f(T.pinWL[q])} wR ${f(T.pinWR[q])}  ${ivs.join(" ")}`);
    }
  }
}

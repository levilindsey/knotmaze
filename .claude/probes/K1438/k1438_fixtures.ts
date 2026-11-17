// K1438: which test scenes have arms whose home interval reaches past aL (a fixture for the fade test).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildTables } from "../../../src/render/gpu_field/tables";
import { GfEval } from "../../../src/render/gpu_field/eval";
const dir = "test/render/field/scenes";
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47;
  const T = buildTables(s, { aa: 0.5 / 320, home: true });
  const E = new GfEval(T);
  const rows: string[] = [];
  for (let c = 0; c < T.nC; c++) for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) {
    if (!(T.aHome[i] > T.aL[i] + 1e-9)) continue;
    // sample membership along the arm from aL to aHome
    const n = 200; let lo = -1, hi = -1, last1 = -1;
    for (let k = 0; k <= n; k++) {
      const d = T.aL[i] + (T.aHome[i] - T.aL[i]) * k / n; const sArc = T.aSR[i] + d * T.aDir[i];
      const m = E.memberAt(c, sArc);
      if (m.g === T.aG[i] && m.ramp >= 1) last1 = d;
      if (m.g === T.aG[i] && m.ramp > 0 && m.ramp < 1) { if (lo < 0) lo = d; hi = d; }
    }
    rows.push(`  c${c} a${i} g${T.aG[i]} sR ${T.aSR[i].toFixed(3)} dir ${T.aDir[i]} aL ${T.aL[i].toFixed(3)} Lcut ${T.aLcut[i].toFixed(3)} home ${T.aHome[i].toFixed(3)} full-to ${last1.toFixed(3)} ramp ${lo.toFixed(3)}..${hi.toFixed(3)}`);
  }
  console.log(`${f} h ${T.h} amp ${T.amp.toFixed(3)} win ${T.win.toFixed(3)} nA ${T.nA} home>aL ${rows.length}`);
  for (const r of rows.slice(0, 6)) console.log(r);
}

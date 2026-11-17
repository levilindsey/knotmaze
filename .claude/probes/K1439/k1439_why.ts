// K1439: what decides the few parity pixels past the float floor (muse_hash on, fl 0 and 0.14). For each point:
// the mirror's ink with home on at fl 0 / 1e-6 / 0.14 and home off, then each piece the pixel folds (chain, s,
// depth z), its membership, and every arm of that chain whose home interval holds s or nearly (d against aHome).
//   node scripts/run_node.mjs .claude/probes/K1439/k1439_why.ts muse_hash 15.8938,25.1687 24.2312,32.7188
import { loadScene } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";

const [nm, ...pts] = process.argv.slice(2);
const sc = loadScene(nm) as never as { camera: { pxPerUnit: number } };
const T = buildTables(sc as never, { aa: 0.5 / (sc.camera.pxPerUnit * 2) });
const t32 = (T: GfTables): GfTables => {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(T)) o[k] = v instanceof Float64Array ? Float64Array.from(new Float32Array(v)) : typeof v === "number" ? Math.fround(v) : v;
  return o as unknown as GfTables;
};
const T32 = t32(T); const Th: GfTables = { ...T32, homeOn: true };
const Z = (fl: number): number => (fl * Th.amp) / Th.win;
type Priv = { np: number; pc: Int32Array; ps: Float64Array; depth(c: number, s: number): number };
for (const p of pts) {
  const [x, y] = p.split(",").map(Number);
  const inkAt = (home: boolean, fl: number): string => { const E = new GfEval(home ? Th : T32); E.fadeLength = fl; const r = E.eval(x, y); return `${r.ink.toFixed(5)} ch ${r.chain}`; };
  console.log(`${nm} ${x},${y}: on fl0 ${inkAt(true, 0)} | fl1e-6 ${inkAt(true, 1e-6)} | fl0.14 ${inkAt(true, 0.14)} | fl0.1 ${inkAt(true, 0.1)} | fl0.2 ${inkAt(true, 0.2)} | off ${inkAt(false, 0.14)}   Z(0.14)=${Z(0.14).toExponential(3)}`);
  const E = new GfEval(Th); E.fadeLength = 0; E.eval(x, y); const P = E as unknown as Priv;
  for (let m = 0; m < P.np; m++) {
    const c = P.pc[m]; const s = P.ps[m]; const z = P.depth.call(E, c, s); const mem = E.memberAt(c, s);
    const z32 = Math.fround(z);
    console.log(`  piece ${m}: chain ${c} s ${s.toFixed(6)} z ${z.toExponential(4)} (f32 ${z32.toExponential(4)}) member g ${mem.g} ramp ${mem.ramp.toFixed(5)}`);
    // the chain's nearest segments (a fold tie: two segments at nearly one distance, with different s) and z there
    const segs: { d: number; s: number; k: number }[] = [];
    for (let k = 0; k < Th.cNV[c] - 1; k++) {
      const v = Th.cV0[c] + k; const ax = Th.vx[v]; const ay = Th.vy[v]; const dx = Th.vx[v + 1] - ax; const dy = Th.vy[v + 1] - ay;
      const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const ex = x - ax - dx * u; const ey = y - ay - dy * u; segs.push({ d: Math.sqrt(ex * ex + ey * ey), s: Th.vs[v] + u * (Th.vs[v + 1] - Th.vs[v]), k });
    }
    segs.sort((a, b) => a.d - b.d);
    console.log(`    nearest segs: ${segs.slice(0, 3).map((g) => `k ${g.k} d ${g.d.toFixed(7)} s ${g.s.toFixed(6)} z ${P.depth.call(E, c, g.s).toExponential(4)}`).join(" | ")}`);
    console.log(`    z at s -+2e-6, -+1e-4: ${[-2e-6, 2e-6, -1e-4, 1e-4].map((e) => P.depth.call(E, c, s + e).toExponential(3)).join(", ")}`);
    const a0 = Th.cArm0[c]; const an = Th.cArmN[c]; const len = Th.cLen[c]; const closed = Th.cClosed[c] === 1;
    for (let i = a0; i < a0 + an; i++) {
      let d = (s - Th.aSR[i]) * Th.aDir[i]; if (closed) d = ((d % len) + len) % len;
      const near = d > -0.05 && d < Th.aHome[i] + 0.05;
      if (near) console.log(`    arm ${i} g ${Th.aG[i]} root ${Th.aSR[i].toFixed(6)} dir ${Th.aDir[i]} d ${d.toFixed(7)} aL ${Th.aL[i].toFixed(6)} aHome ${Th.aHome[i].toFixed(7)} (d - aHome ${(d - Th.aHome[i]).toExponential(3)})`);
    }
  }
}

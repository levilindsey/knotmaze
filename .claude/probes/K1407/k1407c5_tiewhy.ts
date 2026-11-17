// K1407 c5: where k1407c4_tie_run's TIE=gm* union fires (a group G tied with an own piece of a chain with an arm in G)
// and moves the ink by more than 0.1 against the blend, over k1407_crops' 480 px frame: per (G, chain, arm) the pixel
// count, the arm's aL / aLcut, the own piece's d along that arm (min, max), and its gap; to tell the c5 smudges
// (an arm cut at its root by the straight reach) from the ties the union must leave alone.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c5_tiewhy.ts <scene> <x> <y>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval, ss } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any; const P = 480, ppu = P / (2.5 * T.h);
const c0 = Math.round(+xs * ppu - P / 2), r0 = Math.round(+ys * ppu - P / 2);
const rows = new Map<string, { n: number; dmin: number; dmax: number; gmin: number; gmax: number; dr: number }>();
const C0 = E.composite.bind(E);
E.composite = (): number => {
  const r0v = C0(); const ns = E.ns; const zt = T.zt;
  for (let i = 0; i + 1 < ns; i++) {
    const gap = E.skey[E.sord[i]] - E.skey[E.sord[i + 1]];
    if (!(gap < zt)) continue;
    const a = E.sid[E.sord[i]], b = E.sid[E.sord[i + 1]];
    if ((a >= 0) === (b >= 0)) break;
    const G = a >= 0 ? a : b; const j = -1 - (a >= 0 ? b : a); const c = E.pc[j]; const s = E.ps[j];
    const len = T.cLen[c]; const closed = T.cClosed[c] === 1;
    for (let k = T.cArm0[c]; k < T.cArm0[c] + T.cArmN[c]; k++) {
      if (T.aG[k] !== G) continue;
      let d = (s - T.aSR[k]) * T.aDir[k]; if (closed) { d = ((d % len) + len) % len; if (d > len / 2) d -= len; }
      const key = `G${G} c${c} arm${k} top=${a >= 0 ? "G" : "own"} aL ${T.aL[k].toFixed(3)} aLcut ${T.aLcut[k] === Infinity ? "inf" : T.aLcut[k].toFixed(3)}`;
      const m = rows.get(key) ?? { n: 0, dmin: Infinity, dmax: -Infinity, gmin: Infinity, gmax: -Infinity, dr: 0 };
      m.n++; m.dmin = Math.min(m.dmin, d); m.dmax = Math.max(m.dmax, d); m.gmin = Math.min(m.gmin, gap); m.gmax = Math.max(m.gmax, gap);
      rows.set(key, m);
    }
    break;
  }
  return r0v;
};
// only pixels where the union moves the ink: evaluate twice (blend, then the union via the runner's rule)
for (let r = 0; r < P; r += 2) for (let c = 0; c < P; c += 2) {
  const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  E.eval(x, y);
}
console.log(`${nm} ${xs},${ys} h ${T.h} zt ${T.zt}`);
for (const [k, m] of [...rows.entries()].sort((p, q) => q[1].n - p[1].n).slice(0, 12))
  console.log(`${k} | px ${m.n} d [${(m.dmin / T.h).toFixed(2)}h, ${(m.dmax / T.h).toFixed(2)}h] gap [${m.gmin.toFixed(3)}, ${m.gmax.toFixed(3)}]`);
void ss;

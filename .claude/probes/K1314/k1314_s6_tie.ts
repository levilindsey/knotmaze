// K1314 s6: draw.tieAlpha's terms for chain c at a point with its own foot s and distance dC: each pass, the
// partner's foot, keys, g and the fade, next to zAtC(c, s).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s6_tie.ts <scene> <c> <x> <y> <s> <dC>
import { buildModel } from "./k1314_census";
import * as D from "../../../src/render/outline/draw";

const [nm, cs, xs, ys, ss, ds] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const c = Number(cs); const x = Number(xs); const y = Number(ys); const s = Number(ss); const dC = Number(ds);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tb = (m as any).table ?? (m as any).tb; const h = tb.h; const W = tb.W; const zt = 0.1 * m.scene.look.depthAmp;
const { zc, passes } = m.zz; const C = zc[c];
const f4 = (v: number): string => v.toFixed(4);
console.log(`c${c} closed ${C.closed} len ${f4(C.len)} zAtC(s) ${f4(D.zAtC(C, s))} keyC ${f4(D.zAtC(C, s) - (dC * zt) / h)} h ${f4(h)} W ${f4(W)} zt ${f4(zt)}`);
for (const P of passes[c]) {
  const dsv = D.dSC(C, P.s, s); const inW = !(dsv < -P.lo || dsv > P.hi);
  const O = zc[P.o]; const f = D.footNear(O, x, y, P.so, P.rO, s, P.o === c ? 3 * h : 0);
  const g = Math.min(1, Math.max(0, (h - f.d) / W)); const keyO = D.zAtC(O, f.s) - (f.d * zt) / h;
  const keyC = D.zAtC(C, s) - (dC * zt) / h; const t = Math.min(1, Math.max(0, (keyO - keyC + zt) / (2 * zt)));
  console.log(`pass o c${P.o} s ${f4(P.s)} lo ${f4(P.lo)} hi ${f4(P.hi)} so ${f4(P.so)} rO ${f4(P.rO)} ds ${f4(dsv)} in ${inW} foot s ${f4(f.s)} d ${f4(f.d)} zO ${f4(D.zAtC(O, f.s))} keyO ${f4(keyO)} g ${f4(g)} fade ${f4(1 - g * t * t * (3 - 2 * t))}`);
}

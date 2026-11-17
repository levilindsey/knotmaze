// K1438: what makes a site's band. Around (x, y), radius rad, finds the pixels where fadeLength a and b ink most
// differently (switch on), then prints each one's pieces (chain, s, depth z, group, ramp) under both and under the
// switch off, with the ink and coverage.
//   node scripts/run_node.mjs .claude/probes/K1438/k1438_why.ts <scene> <x> <y> [rad=0.5] [ppu=200] [a=0.14] [b=1.2]
import { modelOf } from "../K1433/k1433_lib.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, rs, ps, as, bs] = process.argv.slice(2);
const X = +xs, Y = +ys, rad = +(rs ?? 0.5), ppu = +(ps ?? 200), fa = +(as ?? 0.14), fb = +(bs ?? 1.2);
const M = modelOf(nm);
const sc = M.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2); // k1362s1_census's gfTablesOf
const Ton = buildTables(sc, { aa, home: true });
const Ea = new GfEval(Ton); Ea.fadeLength = fa;
const Eb = new GfEval(Ton); Eb.fadeLength = fb;
const Toff = buildTables(sc, { aa, home: false });
const top: { d: number; x: number; y: number; ia: number; ib: number }[] = [];
for (let r = -rad * ppu; r <= rad * ppu; r++) for (let c = -rad * ppu; c <= rad * ppu; c++) {
  const x = X + c / ppu, y = Y + r / ppu;
  const ia = Ea.eval(x, y).ink, ib = Eb.eval(x, y).ink;
  top.push({ d: Math.abs(ia - ib), x, y, ia, ib });
}
top.sort((p, q) => q.d - p.d);
const dump = (E: any, x: number, y: number, tag: string) => {
  const o = E.eval(x, y);
  const P: string[] = [];
  for (let j = 0; j < E.np; j++) P.push(`c${E.pc[j]} s${E.ps[j].toFixed(3)} z${E.pz[j].toFixed(3)} g${E.pg[j]} r${E.pramp[j].toFixed(3)}`);
  console.log(`  ${tag}: ink ${o.ink.toFixed(3)} cov ${o.cov.toFixed(3)} label c${o.chain} s${o.s.toFixed(3)} | ${P.join(" ; ")}`);
};
console.log(`${nm} ${X},${Y}: amp ${Ton.amp} win ${Ton.win} zt ${(0.1 * Ton.amp).toFixed(4)} | Z(a) ${(fa * Ton.amp / Ton.win).toFixed(4)} Z(b) ${(fb * Ton.amp / Ton.win).toFixed(4)}`);
const seen: { x: number; y: number }[] = [];
for (const p of top) {
  if (seen.length >= 3) break;
  if (seen.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.08)) continue;
  seen.push(p);
  console.log(`(${p.x.toFixed(3)}, ${p.y.toFixed(3)}) ink a ${p.ia.toFixed(3)} b ${p.ib.toFixed(3)}`);
  dump(Ea, p.x, p.y, `fl ${fa}`); dump(Eb, p.x, p.y, `fl ${fb}`); dump(new GfEval(Toff), p.x, p.y, "off");
}

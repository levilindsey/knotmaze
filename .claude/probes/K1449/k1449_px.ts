// K1449: one panel pixel's evaluation under off / home at fadeLength a (default 0.14) / home at fl 0: pieces (chain,
// s, d/h, z, key, group, ramp, surface), surfaces (id, key, alpha, ink), the winner, ink and label.
//   node scripts/run_node.mjs .claude/probes/K1449/k1449_px.ts <scene:x:y> <px> <py> [fl=0.14]
// (px, py) are a pixel of k1449_mark.ts's 480 px panel at the spot (left half; subtract 484 for the right half).
import { modelOf } from "../K1433/k1433_lib.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [spec, pxs, pys, fls] = process.argv.slice(2);
const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys; const fl = fls === undefined ? 0.14 : +fls;
const M = modelOf(nm); const sc = M.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
const Ton = buildTables(sc, { aa, home: true }); const Toff = buildTables(sc, { aa, home: false });
const P = 480; const ppu = P / (2.5 * Ton.h);
const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const x = (c0 + +pxs + 0.5) / ppu, y = (r0 + +pys + 0.5) / ppu;
console.log(`${nm} pixel (${pxs},${pys}) = world (${x.toFixed(4)}, ${y.toFixed(4)}); h ${Ton.h} W ${Ton.W} aa ${Ton.aa} amp ${Ton.amp} win ${Ton.win} zt ${Ton.zt}`);
const show = (tag: string, T: any, f: number): void => {
  const E: any = new GfEval(T); E.fadeLength = f; const o = E.eval(x, y);
  console.log(`${tag}: ink ${o.ink.toFixed(3)} cov ${o.cov.toFixed(3)} label c${o.chain} s${o.s.toFixed(3)} win ${o.winKind}/${o.winA}/${o.winB}`);
  for (let j = 0; j < E.np; j++) console.log(`   piece ${j}: c${E.pc[j]} s${E.ps[j].toFixed(3)} d/h ${(E.pd[j] / T.h).toFixed(3)} z ${E.pz[j].toFixed(3)} key ${E.pkey[j].toFixed(3)} g${E.pg[j]} r${E.pramp[j].toFixed(3)} surf ${E.psurf[j]}`);
  if (E.ns !== undefined) for (let i = 0; i < E.ns; i++) { const e = E.sord ? E.sord[i] : i; console.log(`   surf ${i}: id ${E.sid?.[e]} key ${E.skey?.[e]?.toFixed(3)} a ${E.sa?.[e]?.toFixed(3)} ink ${E.sink?.[e]?.toFixed?.(3)}`); }
};
show("off", Toff, fl); show(`home fl ${fl}`, Ton, fl); show("home fl 0", Ton, 0);

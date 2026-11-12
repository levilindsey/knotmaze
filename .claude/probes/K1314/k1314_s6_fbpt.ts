// K1314 s6: form B's view of one point: its pieces (chain, s, d, z, key = z - d/K, group, ramp, selfW, cover),
// the corner fills in reach (key = z - h/K), the evalPoint result, and whether the census uses the fillet there.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s6_fbpt.ts <scene> <x> <y>
import { buildModel, filletOf, filletHere } from "./k1314_census";
import { FormB } from "../../../src/render/field/form_b";

const [nm, xs, ys] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const x = Number(xs); const y = Number(ys);
const m = buildModel(nm);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as any;
const f3 = (v: number): string => (Number.isFinite(v) ? v.toFixed(4) : String(v));
console.log(`h ${f3(fb.h)} zt ${f3(fb.zt)} K ${f3(fb.K)} aa ${f3(fb.aa)} labelBy ${fb.labelBy} fillKey ${fb.fillKey}`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P: any[] = []; fb.pieces(x, y, P);
for (const A of P) console.log(`piece ${A.idx} c${A.chain} s ${f3(A.s)} d ${f3(A.d)} z ${f3(A.z)} key ${f3(A.key)} g ${A.g} surf ${A.surf} ramp ${f3(A.ramp)} selfW ${f3(A.selfW)} cover ${A.d < fb.h && A.selfW >= 0.5} alts ${A.alts?.length ?? 0}`);
for (const ci of fb.cornersNear(x, y)) {
  const c = fb.corners[ci];
  const dq = Math.hypot(x - c.qx, y - c.qy);
  const inW = fb.inWedge(c, x, y); const inF = fb.inFill(c, x, y);
  const nearerA = Math.hypot(x - c.tax, y - c.tay) <= Math.hypot(x - c.tbx, y - c.tby);
  const z = nearerA ? c.zA : c.zB;
  console.log(`corner ${ci} j${c.j} g ${c.g} r ${f3(c.r)} omega ${f3(c.omega)} dq ${f3(dq)} rV ${f3(c.rV)} inWedge ${inW} inFill ${inF} zA ${f3(c.zA)} zB ${f3(c.zB)} armA c${fb.arms[c.a]?.pi} armB c${fb.arms[c.b]?.pi} -> key ${f3(z - fb.h / fb.K)} ok ${c.ok}`);
}
const ev = fb.evalPoint(x, y);
console.log(`formB: ink ${f3(ev.ink)} top ${ev.top} chain c${ev.chain} s ${f3(ev.s)} z ${f3(ev.z)} key ${f3(ev.key)} dz ${f3(ev.dz)} dkey ${f3(ev.dkey)} nSurf ${ev.nSurf} fade ${ev.fade}`);
const ff = filletOf(m);
if (ff.thruCi.size && filletHere(ff, x, y)) { const e2 = ff.evalPoint(x, y); console.log(`fillet used: ink ${f3(e2.ink)} chain c${e2.chain} s ${f3(e2.s)}`); } else console.log("fillet not used here");

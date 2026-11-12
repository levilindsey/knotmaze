// K1314 s5: radial ink profiles around a centre (an arc's q): per angle, one row of chars along the radius, the
// census reference (hybrid: the fillet where filletHere, else form B) | the outline. '#' >= .6, '+' >= .3, '.' > .02.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s5_rad.ts <scene> qx,qy r0,r1,dr a0,a1,da(deg)
import { FormB } from "../../../src/render/field/form_b";
import { buildModel, filletHere, filletOf, rasterOutline } from "./k1314_census";

const [nm, qs, rs, as] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [qx, qy] = qs.split(",").map(Number); const [r0, r1, dr] = rs.split(",").map(Number); const [a0, a1, da] = as.split(",").map(Number);
const m = buildModel(nm);
type EV = { evalPoint(x: number, y: number): { ink: number } };
const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as EV;
const ff = filletOf(m) as unknown as EV;
const ppu = 160;
const ch = (v: number): string => (v >= 0.6 ? "#" : v >= 0.3 ? "+" : v > 0.02 ? "." : " ");
console.log(`radii ${r0}..${r1} step ${dr}; ref | outline`);
for (let a = a0; da > 0 ? a <= a1 + 1e-9 : a >= a1 - 1e-9; a += da) {
  let sr = ""; let so = "";
  for (let r = r0; r <= r1 + 1e-9; r += dr) {
    const x = qx + r * Math.cos((a * Math.PI) / 180); const y = qy + r * Math.sin((a * Math.PI) / 180);
    const v = filletHere(ff as never, x, y) ? ff.evalPoint(x, y).ink : fb.evalPoint(x, y).ink;
    const O = rasterOutline(m, Math.floor(x * ppu), Math.floor(y * ppu), 1, 1, ppu);
    sr += ch(Math.min(1, Math.max(0, v))); so += ch(O.ink[0]);
  }
  console.log(`${a.toFixed(1).padStart(6)} ${sr} | ${so}`);
}

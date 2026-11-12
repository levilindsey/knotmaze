// K1314 s5: is a find the outline's or the census reference's? Samples plain form B, the fillet copy
// (form_b_fillet, the through bend rounded) and the census's hybrid (the fillet only where cornersNear
// lists a through corner) along a segment, with the outline's ink there.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s5_ref.ts <scene> x0,y0 x1,y1 [--n=13]
import { FormB } from "../../../src/render/field/form_b";
import { buildModel, filletHere, filletOf, rasterOutline } from "./k1314_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const [nm, a0, a1] = args; const [x0, y0] = a0.split(",").map(Number); const [x1, y1] = a1.split(",").map(Number);
const n = +(opt("n") ?? "13");
const m = buildModel(nm);
type EV = { evalPoint(x: number, y: number): { ink: number; top: number; chain: number } };
const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as EV;
const ff = filletOf(m) as unknown as EV & { cornersNear(x: number, y: number): number[]; thruCi: Set<number> };
const ppu = 160;
console.log(`thru corners in the fillet copy: ${[...ff.thruCi].join(",")}`);
console.log("   x      y     plainB  fillet  hybrid(thruNear)  outline");
for (let i = 0; i < n; i++) {
  const t = n === 1 ? 0 : i / (n - 1); const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t;
  const p = fb.evalPoint(x, y); const f = ff.evalPoint(x, y);
  const near = filletHere(ff as never, x, y);
  const c = Math.floor(x * ppu); const r = Math.floor(y * ppu); const O = rasterOutline(m, c, r, 1, 1, ppu);
  const cl = (v: number): string => Math.min(1, Math.max(0, v)).toFixed(2);
  console.log(`${x.toFixed(3)} ${y.toFixed(3)}  ${cl(p.ink)} c${p.chain}  ${cl(f.ink)} c${f.chain}  ${near ? cl(f.ink) : cl(p.ink)} ${near ? "F" : "-"}  ${cl(O.ink[0])}`);
}

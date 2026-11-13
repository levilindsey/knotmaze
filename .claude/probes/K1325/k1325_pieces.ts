import { buildModel, plainOf } from "../K1314/k1314_census";
const m = buildModel(process.argv[2]); const fb = plainOf(m) as any;
console.log("sigma", fb.sigma, "h", fb.h, "W", fb.W);
const pts = process.argv.slice(3).map(Number);
for (let i = 0; i < pts.length; i += 2) {
  const x = pts[i], y = pts[i + 1]; const out: any[] = []; fb.pieces(x, y, out); const e = fb.evalPoint(x, y);
  console.log(`(${x}, ${y}) ink ${e.ink.toFixed(3)} top ${e.top} chain ${e.chain} s ${e.s.toFixed(3)} term ${e.term ? e.term.kind + "/" + e.term.surf + " w " + e.term.w.toFixed(3) + " D " + e.term.D.toFixed(3) : "-"}`);
  for (const p of out) console.log(`   piece ${p.idx} chain ${p.chain} s ${p.s.toFixed(3)} d ${p.d.toFixed(3)} z ${p.z.toFixed(3)} key ${p.key.toFixed(3)} g ${p.g} surf ${p.surf} ramp ${p.ramp.toFixed(2)} selfW ${p.selfW.toFixed(3)} alts ${p.alts.length}`);
}

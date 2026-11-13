// K1325 s2: rp=outline's ink inside a band (reference ink <= 0.02, outline < 0.5) against the census reference
// (SELF_REF off, then on) in a box, to size a faint smudge.
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_s2_smudge.ts <scene> <x0> <y0> <x1> <y1> [--ppu=1000]
import { buildModel, refEval, rasterOutline, SELF_REF } from "../K1314/k1314_census";
const a = process.argv.slice(2).filter((v) => !v.startsWith("--")); const nm = a[0]; const [x0, y0, x1, y1] = a.slice(1, 5).map(Number);
const ppu = Number(process.argv.find((v) => v.startsWith("--ppu="))?.slice(6) ?? 1000);
const m = buildModel(nm); const c0 = Math.floor(x0 * ppu); const r0 = Math.floor(y0 * ppu); const W = Math.ceil((x1 - x0) * ppu); const H = Math.ceil((y1 - y0) * ppu);
const O = rasterOutline(m, c0, r0, W, H, ppu); const cl = (v: number): number => Math.min(1, Math.max(0, v));
for (const on of [false, true]) {
  SELF_REF.on = on; let mx = 0, at = "", n05 = 0, n10 = 0, n20 = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu; const ri = cl(refEval(m, x, y).ink); const oi = cl(O.ink[r * W + c]);
    if (ri > 0.02 || oi >= 0.5) continue; // inside a band: no border offsets
    const d = oi - ri;
    if (d > mx) { mx = d; at = `(${x.toFixed(3)}, ${y.toFixed(3)}) outline ${cl(O.ink[r * W + c]).toFixed(3)}`; }
    if (d > 0.05) n05++; if (d > 0.1) n10++; if (d > 0.2) n20++;
  }
  console.log(`SELF_REF ${on}: outline - reference max ${mx.toFixed(3)} at ${at}; px > 0.05 ${n05}, > 0.1 ${n10}, > 0.2 ${n20} (at ${ppu} px/unit)`);
}
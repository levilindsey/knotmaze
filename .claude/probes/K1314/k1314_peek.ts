// K1314 s1: ASCII peek at a census window (debugging the detectors).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_peek.ts <scene> <x> <y> [--r=2.5 (in h)] [--ppu=80] [--cell=3]
// Prints two maps side by side, one char per cell x cell px block: rp=outline | form B.
// Chars: '#' ink >= .6, '+' ink .3-.6, '.' covered fill, ' ' paper. Then the cell grid's
// world origin and step.
import { buildModel, rasterOutline, rasterFormB } from "./k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const ppu = Number(opt("ppu") ?? 80); const cell = Number(opt("cell") ?? 3);
const m = buildModel(nm); const h = m.scene.look.halfWidth; const R = Number(opt("r") ?? 2.5) * h;
const x = Number(xs); const y = Number(ys);
const c0 = Math.floor((x - R) * ppu); const r0 = Math.floor((y - R) * ppu); const W = Math.ceil(2 * R * ppu); const H = W;
const O = rasterOutline(m, c0, r0, W, H, ppu); const B = rasterFormB(m, c0, r0, W, H, ppu);
const ch = (ink: number, cov: boolean): string => (ink >= 0.6 ? "#" : ink >= 0.3 ? "+" : cov ? "." : " ");
for (let cy = 0; cy + cell <= H; cy += cell) {
  let a = ""; let b = "";
  for (let cx = 0; cx + cell <= W; cx += cell) {
    let oi = 0; let bi = 0; let oc = 0; let bc = 0;
    for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) {
      const i = (cy + dy) * W + cx + dx; oi += O.ink[i]; bi += B.ink[i]; oc += O.own[i] > 0 ? 1 : 0; bc += B.chain[i] >= 0 ? 1 : 0;
    }
    const k = cell * cell; a += ch(oi / k, oc > k / 2); b += ch(bi / k, bc > k / 2);
  }
  console.log(a + " | " + b);
}
console.log(`origin ${(c0 / ppu).toFixed(3)} ${(r0 / ppu).toFixed(3)}, cell ${(cell / ppu).toFixed(4)} world, h ${h}`);

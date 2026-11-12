// K1314 s6 (s5_own with --mode=N, fill_tri S6KEY): which chain owns each cell, outline (fill_tri rasterFill) | form B (top chain), ink as '#'.
// Chains print as letters (legend at the end); '.' paper, '#' ink >= .5.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s5_own.ts <scene> <x> <y> [--r=0.3 (world)] [--cell=0.0125]
import { buildModel, rasterFormB, rasterOutline } from "./k1314_census";
import { S6KEY } from "../../../src/render/outline/fill_tri";
S6KEY.mode = Number(process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1] ?? 0);

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const [nm, xs, ys] = args; const cx = Number(xs); const cy = Number(ys);
const R = opt("r", 0.3); const cell = opt("cell", 0.0125); const ppu = 160;
const m = buildModel(nm);
const n = Math.round((2 * R) / cell); const k = Math.max(1, Math.round(cell * ppu));
const c0 = Math.floor((cx - R) * ppu); const r0 = Math.floor((cy - R) * ppu); const Wd = n * k; const Hd = n * k;
const O = rasterOutline(m, c0, r0, Wd, Hd, ppu);
const B = rasterFormB(m, c0, r0, Wd, Hd, ppu);
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"; const map = new Map<number, string>();
const L = (c: number): string => { if (c < 0) return "."; if (!map.has(c)) map.set(c, letters[map.size % letters.length]); return map.get(c)!; };
for (let r = 0; r < n; r++) {
  let so = ""; let sb = "";
  for (let c = 0; c < n; c++) {
    const i = (r * k + (k >> 1)) * Wd + c * k + (k >> 1);
    so += O.ink[i] >= 0.5 ? "#" : L(O.own[i] - 1);
    sb += B.ink[i] >= 0.5 ? "#" : L(B.chain[i]);
  }
  console.log(`${so} | ${sb}`);
}
console.log(`origin ${(c0 / ppu).toFixed(3)} ${(r0 / ppu).toFixed(3)} cell ${(k / ppu).toFixed(4)}; ${[...map].map(([c, l]) => `${l}=c${c}`).join(" ")}`);


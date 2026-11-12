// K1314 s7: the outline raster's top fill item per cell (letters, legend at the end), '#' ink >= .5, '.' paper;
// with --edge, a cell whose painted colour steps by more than --t (0..1 per channel, default .04) from its right
// or lower neighbour prints '!' (a hard colour edge inside the fill).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s7_paint.ts <scene> <x> <y> [--r=0.3] [--cell=0.0125] [--edge] [--t=0.04]
import { buildModel, rasterOutline } from "./k1314_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const [nm, xs, ys] = args; const cx = Number(xs); const cy = Number(ys);
const R = opt("r", 0.3); const cell = opt("cell", 0.0125); const T = opt("t", 0.04); const edge = process.argv.includes("--edge");
const ppu = 160; const m = buildModel(nm);
const c0 = Math.round((cx - R) * ppu); const r0 = Math.round((cy - R) * ppu); const Wd = Math.round(2 * R * ppu); const Hd = Wd;
const ras = rasterOutline(m, c0, r0, Wd, Hd, ppu);
const step = Math.max(1, Math.round(cell * ppu)); const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const legend = new Map<number, string>();
const kindOf = (it: number): string => { const k = (m as unknown as { itemKind?: (i: number) => string }).itemKind; return k ? k(it) : ""; };
const out: string[] = [];
for (let j = 0; j < Hd; j += step) {
  let line = "";
  for (let i = 0; i < Wd; i += step) {
    const o = j * Wd + i;
    if (ras.ink[o] >= 0.5) { line += "#"; continue; }
    if (edge) {
      const nb = [i + step < Wd ? o + step : -1, j + step < Hd ? o + step * Wd : -1];
      let hard = false;
      for (const q of nb) if (q >= 0 && ras.ink[q] < 0.5 && ras.rgb[3 * q] >= 0 && ras.rgb[3 * o] >= 0) {
        for (let ch = 0; ch < 3; ch++) if (Math.abs(ras.rgb[3 * q + ch] - ras.rgb[3 * o + ch]) > T) hard = true;
      }
      if (hard) { line += "!"; continue; }
    }
    const it = ras.item[o];
    if (it < 0) { line += "."; continue; }
    if (!legend.has(it)) legend.set(it, letters[legend.size % letters.length]);
    line += legend.get(it);
  }
  out.push(line);
}
console.log(out.join("\n"));
console.log(`origin ${(c0 / ppu).toFixed(3)} ${(r0 / ppu).toFixed(3)} cell ${(step / ppu).toFixed(4)}; ` +
  [...legend].map(([it, l]) => `${l}=item${it}${kindOf(it) ? ":" + kindOf(it) : ""}`).join(" "));

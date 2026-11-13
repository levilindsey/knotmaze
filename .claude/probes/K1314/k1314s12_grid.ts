// K1314 s12 scratch: ASCII grids of form B's ink (digit = ink*9.99, letter = chain: a = first listed, b = second, . other)
// and the app's ink, over a box.  node scripts/run_node.mjs .claude/probes/K1314/k1314s12_grid.ts <scene> <x0,y0> <x1,y1>
//   [--n=24] [--chains=23,43] [--off]
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import * as O from "../../../src/render/outline/outline";
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
if (args.includes("--off")) Object.keys(O.K1314S12).forEach((k) => ((O.K1314S12 as any)[k] = false));
const [nm, a, b] = args.filter((s) => !s.startsWith("--"));
const [x0, y0] = a.split(",").map(Number); const [x1, y1] = b.split(",").map(Number);
const N = Number(opt("n") ?? 24); const ch = (opt("chains") ?? "").split(",").filter(Boolean).map(Number);
const m = buildModel(nm); const ppu = 4000;
const d = (v: number): string => String(Math.min(9, Math.floor(v * 9.99)));
console.log(`cols x ${x0}..${x1}, rows y ${y0}..${y1}; form B (ink+chain) | app`);
for (let r = 0; r < N; r++) {
  const y = y0 + ((r + 0.5) / N) * (y1 - y0); let sb = ""; let sa = "";
  for (let c = 0; c < N; c++) {
    const x = x0 + ((c + 0.5) / N) * (x1 - x0);
    const e = refEval(m, (Math.floor(x * ppu) + 0.5) / ppu, (Math.floor(y * ppu) + 0.5) / ppu);
    const ci = ch.indexOf(e.chain); sb += d(e.ink) + (ci < 0 ? "." : "abcdef"[ci]);
    sa += d(appInk(m, Math.floor(x * ppu), Math.floor(y * ppu), 1, 1, ppu)[0]) + " ";
  }
  console.log(`${y.toFixed(3)} ${sb} | ${sa}`);
}

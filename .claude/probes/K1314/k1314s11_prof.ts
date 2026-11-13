// K1314 s11 scratch: ink profile along a line, form B | app (fix off) | app (fix on).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_prof.ts <scene> <x0> <y0> <x1> <y1> [--n=21]
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import { RUN_FADE_TIE } from "../../../src/render/outline/outline";
const args = process.argv.slice(2);
const [nm, a, b, c, d] = args.filter((s) => !s.startsWith("--"));
const N = Number(args.find((s) => s.startsWith("--n="))?.slice(4) ?? 21);
const x0 = +a; const y0 = +b; const x1 = +c; const y1 = +d;
RUN_FADE_TIE.on = false; const mOff = buildModel(nm); RUN_FADE_TIE.on = true; const mOn = buildModel(nm);
const ppu = 2000; const xa = Math.min(x0, x1); const ya = Math.min(y0, y1);
const c0 = Math.floor(xa * ppu) - 2; const r0 = Math.floor(ya * ppu) - 2;
const Wd = Math.ceil(Math.abs(x1 - x0) * ppu) + 5; const Hd = Math.ceil(Math.abs(y1 - y0) * ppu) + 5;
const gOff = appInk(mOff, c0, r0, Wd, Hd, ppu); const gOn = appInk(mOn, c0, r0, Wd, Hd, ppu);
const rows: string[] = [];
for (let i = 0; i < N; i++) {
  const t = i / (N - 1); const x = x0 + t * (x1 - x0); const y = y0 + t * (y1 - y0);
  const cc = Math.floor(x * ppu) - c0; const rr = Math.floor(y * ppu) - r0;
  const fb = Math.min(1, Math.max(0, refEval(mOn, (Math.floor(x * ppu) + 0.5) / ppu, (Math.floor(y * ppu) + 0.5) / ppu).ink));
  rows.push(`${x.toFixed(4)},${y.toFixed(4)}  B ${fb.toFixed(3)}  off ${gOff[rr * Wd + cc].toFixed(3)}  on ${gOn[rr * Wd + cc].toFixed(3)}`);
}
console.log(rows.join("\n"));

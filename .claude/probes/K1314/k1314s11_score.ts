// K1314 s11: the app band's ink against form B's on an N x N grid at a spot: mean |d|, lost and extra ink (% of N^2).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_score.ts <scene> <x> <y> [--w=0.4] [--n=48] [--off]
// --off: RUN_FADE_TIE off (master's double fade).
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import { RUN_FADE_TIE } from "../../../src/render/outline/outline";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
if (args.includes("--off")) RUN_FADE_TIE.on = false;
const X = +xs; const Y = +ys; const Wd = Number(opt("w") ?? 0.4); const N = Number(opt("n") ?? 48);
const m = buildModel(nm);
const ppu = N / Wd; const c0 = Math.round(X * ppu - N / 2); const r0 = Math.round(Y * ppu - N / 2);
const ink = appInk(m, c0, r0, N, N, ppu);
let e = 0; let lost = 0; let extra = 0; let big = 0;
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
  const fb = Math.min(1, Math.max(0, refEval(m, (c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu).ink));
  const d = ink[r * N + c] - fb; e += Math.abs(d); if (d < 0) lost -= d; else extra += d; if (Math.abs(d) > 0.1) big++;
}
const n2 = N * N;
const fades = m.table.pieces.map((p, i) => (p.fadeX !== undefined ? i : -1)).filter((i) => i >= 0).length;
console.log(`${nm} (${X},${Y}) w ${Wd} ${RUN_FADE_TIE.on ? "on" : "off"}: |d| ${((100 * e) / n2).toFixed(2)}% lost ${((100 * lost) / n2).toFixed(2)}% extra ${((100 * extra) / n2).toFixed(2)}% px>0.1 ${big} (fadeX pieces ${fades})`);

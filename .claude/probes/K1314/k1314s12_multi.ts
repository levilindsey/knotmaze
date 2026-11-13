// K1314 s12: |d| / px>0.1 vs form B at several spots, K1314S12 all off (master) and on (one build each).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_multi.ts <scene> <x,y;x,y;...> [--w=0.4] [--n=48]
import { buildModel, refEval, type Model } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import { K1314S12 } from "../../../src/render/outline/outline";
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, ps] = args.filter((a) => !a.startsWith("--"));
const Wd = Number(opt("w") ?? 0.4); const N = Number(opt("n") ?? 48); const ppu = N / Wd;
const ks = Object.keys(K1314S12) as (keyof typeof K1314S12)[]; const on0 = ks.map((k) => K1314S12[k]); ks.forEach((k) => (K1314S12[k] = false)); const mOff = buildModel(nm); ks.forEach((k, i) => (K1314S12[k] = on0[i])); const mOn = buildModel(nm);
const score = (m: Model, X: number, Y: number): string => {
  const c0 = Math.round(X * ppu - N / 2); const r0 = Math.round(Y * ppu - N / 2); const ink = appInk(m, c0, r0, N, N, ppu);
  let e = 0; let big = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const d = ink[r * N + c] - Math.min(1, Math.max(0, refEval(m, (c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu).ink)); e += Math.abs(d); if (Math.abs(d) > 0.1) big++; }
  return `${((100 * e) / (N * N)).toFixed(2)}%/${big}`;
};
for (const s of ps.split(";")) {
  const [X, Y] = s.split(",").map(Number); const row = [`(${X},${Y})`, `off ${score(mOff, X, Y)}`];
  row.push(`on ${score(mOn, X, Y)}`); console.log(row.join("  "));
}

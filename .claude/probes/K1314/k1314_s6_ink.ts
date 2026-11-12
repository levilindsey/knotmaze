// K1314 s6: the census's rp=outline ink around a point, one digit per cell (ink * 9, '.' = no ink, ' ' no fill),
// and the piece that gives each cell its strongest band alpha (letters, legend below).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s6_ink.ts <scene> <x> <y> [--r=0.04] [--ppu=800] [--fb]
// --fb: form B's ink in the right column instead of the piece letters.
import { buildModel, rasterFormB, rasterOutline } from "./k1314_census";

const [nm, xs, ys] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const x = Number(xs); const y = Number(ys); const r = opt("r", 0.04); const ppu = opt("ppu", 800);
const m = buildModel(nm);
const c0 = Math.round((x - r) * ppu); const r0 = Math.round((y - r) * ppu); const n = Math.round(2 * r * ppu);
const R = rasterOutline(m, c0, r0, n, n, ppu);
const FB = process.argv.includes("--fb") ? rasterFormB(m, c0, r0, n, n, ppu) : null;
const ids = new Map<number, string>(); const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lid = (p: number): string => { if (p < 0) return " "; if (!ids.has(p)) ids.set(p, L[ids.size % 26]); return ids.get(p) as string; };
const dg = (v: number): string => (v < 0.05 ? "." : String(Math.min(9, Math.round(v * 9))));
for (let j = 0; j < n; j++) {
  let a = ""; let b = ""; let c = "";
  for (let i = 0; i < n; i++) {
    const k = j * n + i; const v = R.ink[k];
    a += R.own[k] <= 0 && v < 0.05 ? " " : dg(v);
    b += lid(R.pc[k]);
    if (FB) c += dg(FB.ink[k]);
  }
  console.log(FB ? `${a} | ${c}` : `${a} | ${b}`);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pcs = (m as any).st ? null : null; void pcs;
console.log(`origin ${(c0 / ppu).toFixed(4)} ${(r0 / ppu).toFixed(4)} cell ${(1 / ppu).toFixed(5)}; ${[...ids].map(([p, c]) => `${c}=${p}`).join(" ")}`);

// K1314 s12: form B's ink and the app band's ink sampled along a segment, plus each listed piece's own ink
// (drawn alone), so a seam or a step across the segment shows as a jump in one column.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s12_line.ts <scene> <x0,y0> <x1,y1> [--n=21] [--pieces=121,1781]
//        [--off] (K1314S12 off: master)
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import * as O from "../../../src/render/outline/outline";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, a, b] = args.filter((s) => !s.startsWith("--"));
if (args.includes("--off")) (O as any).K1314S12 && Object.keys((O as any).K1314S12).forEach((k) => ((O as any).K1314S12[k] = false));
for (const k of (opt("no") ?? "").split(",").filter(Boolean)) (O as any).K1314S12[k] = false;
const [x0, y0] = a.split(",").map(Number); const [x1, y1] = b.split(",").map(Number);
const N = Number(opt("n") ?? 21); const pcs = (opt("pieces") ?? "").split(",").filter(Boolean).map(Number);
const m = buildModel(nm); const full = m.table; const ppu = 4000;
const at = (x: number, y: number): number => appInk(m, Math.floor(x * ppu), Math.floor(y * ppu), 1, 1, ppu)[0];
const cols: number[][] = [];
for (const pi of pcs) {
  (m as any).table = { ...full, pieces: full.pieces.map((p, j) => (j === pi ? p : { ...p, pts: p.pts.slice(0, 0), cpts: p.cpts.slice(0, 0), alpha: undefined, fadeA: undefined })) };
  const v: number[] = [];
  for (let k = 0; k < N; k++) { const t = k / (N - 1); v.push(at(x0 + t * (x1 - x0), y0 + t * (y1 - y0))); }
  cols.push(v); (m as any).table = full;
}
console.log(`  x       y       B      app   ${pcs.map((p) => String(p).padStart(6)).join(" ")}`);
for (let k = 0; k < N; k++) {
  const t = k / (N - 1); const x = x0 + t * (x1 - x0); const y = y0 + t * (y1 - y0);
  const e = refEval(m, (Math.floor(x * ppu) + 0.5) / ppu, (Math.floor(y * ppu) + 0.5) / ppu); const B = e.ink;
  const cs = args.includes("--cs") ? ` c${e.chain} s${e.s.toFixed(3)} top${e.top}` : "";
  console.log(`${x.toFixed(4)} ${y.toFixed(4)} ${B.toFixed(3)} ${at(x, y).toFixed(3)} ${cols.map((c) => c[k].toFixed(3).padStart(6)).join(" ")}${cs}`);
}

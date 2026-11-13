// K1314 s11: a coarse text map at a spot: form B's ink digit + owner chain letter | the app band's ink digit.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_grid.ts <scene> <x> <y> [--w=0.5] [--n=24] [--chains=23,43]
// Ink digits 0..9 (9 = black); owner letters a, b, ... in --chains order ('.' paper, '?' other chain).
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import { RUN_FADE_TIE } from "../../../src/render/outline/outline";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const X = +xs; const Y = +ys; const Wd = Number(opt("w") ?? 0.5); const N = Number(opt("n") ?? 24);
const chs = (opt("chains") ?? "").split(",").filter(Boolean).map(Number);
if (args.includes("--off")) RUN_FADE_TIE.on = false;
const m = buildModel(nm);
const ppu = N / Wd; const c0 = Math.round(X * ppu - N / 2); const r0 = Math.round(Y * ppu - N / 2);
const only = opt("only")?.split(",").map(Number); const ones = opt("ones")?.split(",").map(Number) ?? [];
for (const pi of ones) { const p = m.table.pieces[pi]; p.alpha = new Float32Array(p.pts.length).fill(1) as any; }
const full = m.table;
if (only) (m as any).table = { ...full, pieces: full.pieces.map((p, i) => (only.includes(i) ? p : { ...p, pts: p.pts.slice(0, 0), cpts: p.cpts.slice(0, 0), alpha: undefined })) };
const ink = appInk(m, c0, r0, N, N, ppu);
(m as any).table = full;
const rows: string[] = [];
for (let r = 0; r < N; r++) {
  let a = ""; let b = "";
  for (let c = 0; c < N; c++) {
    const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
    const e = refEval(m, x, y); const ci = m.scene.chains[e.chain]?.id;
    const k = e.top < 0 ? -1 : chs.indexOf(ci ?? -9);
    a += Math.min(9, Math.round(9 * Math.min(1, Math.max(0, e.ink)))) + (e.top < 0 ? "." : k >= 0 ? "abcdefgh"[k] : "?");
    b += Math.min(9, Math.round(9 * ink[r * N + c]));
  }
  rows.push(`${((r0 + r + 0.5) / ppu).toFixed(3)} ${a}  ${b}`);
}
console.log(`x from ${((c0 + 0.5) / ppu).toFixed(3)} step ${(1 / ppu).toFixed(4)}`);
console.log(rows.join("\n"));

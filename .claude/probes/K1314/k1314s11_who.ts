// K1314 s11 scratch: per-piece app ink at points (each piece drawn alone).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_who.ts <scene> <x,y;x,y;...> [--r=0.5]
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
const args = process.argv.slice(2);
const [nm, ps] = args.filter((s) => !s.startsWith("--"));
const R = Number(args.find((s) => s.startsWith("--r="))?.slice(4) ?? 0.5);
const pts = ps.split(";").map((s) => s.split(",").map(Number));
const m = buildModel(nm); const full = m.table;
for (const pi of (args.find((s) => s.startsWith("--ones="))?.slice(7) ?? "").split(",").filter(Boolean).map(Number)) { const p = full.pieces[pi]; p.alpha = new Array(p.pts.length).fill(1); p.fadeA = undefined; p.fadeX = undefined; }
const ppu = 2000;
const near = full.pieces.map((p, i) => i).filter((i) => { const q = full.pieces[i].pts; for (let k = 0; k < q.length; k += 2) for (const [x, y] of pts) if (Math.hypot(q[k] - x, q[k + 1] - y) < R) return true; return false; });
const all = (): number[] => pts.map(([x, y]) => appInk(m, Math.floor(x * ppu), Math.floor(y * ppu), 1, 1, ppu)[0]);
console.log(`B   ${pts.map(([x, y]) => refEval(m, (Math.floor(x * ppu) + 0.5) / ppu, (Math.floor(y * ppu) + 0.5) / ppu).ink.toFixed(3)).join(" ")}`);
console.log(`all ${all().map((v) => v.toFixed(3)).join(" ")}`);
for (const i of near) {
  (m as any).table = { ...full, pieces: full.pieces.map((p, j) => (j === i ? p : { ...p, pts: p.pts.slice(0, 0), cpts: p.cpts.slice(0, 0), alpha: undefined, fadeA: undefined })) };
  const v = all(); (m as any).table = full;
  if (v.some((a) => a > 0.001)) { const p = full.pieces[i]; console.log(`${i} ${p.kind} ch${p.chain} side${p.side} fadeX ${p.fadeX ?? "-"}: ${v.map((a) => a.toFixed(3)).join(" ")}`); }
}


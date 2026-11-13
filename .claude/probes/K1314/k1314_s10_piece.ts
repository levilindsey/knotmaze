// K1314 s10: a piece's record (or --full: its pts, cpts and alpha in full) and its corner.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s10_piece.ts <scene> <piece>... [--full]
import { buildModel } from "./k1314_census";
const args = process.argv.slice(2); const full = args.includes("--full"); const [nm, ...ids] = args.filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const t = m.table as any;
const f = (a: number[]) => a.map((x) => x.toFixed(3)).join(" ");
const nearA = args.find((a) => a.startsWith("--near="));
if (nearA) { const [x, y, r] = nearA.slice(7).split(",").map(Number); (t.pieces as any[]).forEach((p: any, i: number) => { const P = p.pts as number[]; if (!P) return; let best = Infinity, bi = -1; for (let k = 0; k < P.length; k += 2) { const d = Math.hypot(P[k] - x, P[k + 1] - y); if (d < best) { best = d; bi = k >> 1; } } if (best < r) console.log(`piece ${i} ${p.kind} chain ${p.chain} side ${p.side} corner ${p.corner} n ${P.length >> 1} near pt ${bi} d ${best.toFixed(3)}${p.alpha ? " alpha" : ""}`); }); }
for (const id of ids) {
  const p = t.pieces[+id];
  if (full) { console.log(id, p.kind, "chain", p.chain, "side", p.side, "s", p.s0?.toFixed(3), p.s1?.toFixed(3), "corner", p.corner); console.log(" pts ", f(p.pts)); console.log(" cpts", f(p.cpts)); if (p.alpha) console.log(" alpha", f(p.alpha)); if (p.corner >= 0) console.log(" corner", JSON.stringify(t.corners[p.corner], (k, v) => typeof v === "number" ? +v.toFixed(3) : v)); continue; }
  const o: any = {}; for (const k of Object.keys(p)) { const v = p[k]; o[k] = typeof v === "number" ? +v.toFixed(3) : Array.isArray(v) ? (v.length > 8 ? `[${v.length}]` : v.map((x: any) => typeof x === "number" ? +x.toFixed(3) : x)) : (v && typeof v === "object" ? "{..}" : v); }
  console.log(id, JSON.stringify(o));
}

// K1436: two-load agreement - per kind:class, how many of A's finds have a find of the same kind within D px in B
//   node scripts/run_node.mjs .claude/probes/K1436/k1436_agree.ts <a.json> <b.json> [D=3]
import { readFileSync } from "node:fs";
const [a, b, dS] = process.argv.slice(2); const A = JSON.parse(readFileSync(a, "utf8")), B = JSON.parse(readFileSync(b, "utf8"));
const D = (dS ? +dS : 3) / A.ppu; const out: Record<string, [number, number, number]> = {};
for (const f of A.finds) { const k = `${f.kind}:${f.cls}`; const o = (out[k] ??= [0, 0, 0]); o[0]++; o[2] += f.px; if (B.finds.some((g: any) => g.kind === f.kind && Math.hypot(g.x - f.x, g.y - f.y) < D + 0.5 * Math.sqrt(f.px) / A.ppu)) o[1]++; }
let n = 0, r = 0; const row = Object.entries(out).sort().map(([k, [c, m, p]]) => { n += c; r += m; return `${k} ${m}/${c}`; });
console.log(`${A.scene} ${A.sfx}: repeat ${r}/${n} (${(100 * r / Math.max(1, n)).toFixed(0)}%)  ${row.join(", ")}`);

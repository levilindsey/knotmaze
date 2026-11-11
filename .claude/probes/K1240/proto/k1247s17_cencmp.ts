// K1247 s17: two k1279 censuses against form B, crossing by crossing: per
// scene the totals and their change, and every crossing worse by more than
// the bar (12 px) in the second.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s17_cencmp.ts <baseTag> <tag> [--bar=12]
import { readFileSync } from "node:fs";
import { join } from "node:path";
const a = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const bar = +(process.argv.find((x) => x.startsWith("--bar="))?.slice(6) ?? 12);
type Row = { scene: string; xi: number; total: number; x: number; y: number };
const rd = (t: string): Row[] => (JSON.parse(readFileSync(join(import.meta.dirname, "..", "out", "k1279", `census_${t}.json`), "utf8")) as { rows: Row[] }).rows;
const A = rd(a[0]); const B = rd(a[1]);
const m = new Map<string, Row>(); for (const r of A) m.set(`${r.scene}#${r.xi}`, r);
const tot = new Map<string, [number, number]>(); const worse: string[] = []; let ta = 0, tb = 0, better = 0, worseN = 0;
for (const r of B) {
  const o = m.get(`${r.scene}#${r.xi}`); const ov = o?.total ?? 0;
  const t = tot.get(r.scene) ?? [0, 0]; t[0] += ov; t[1] += r.total; tot.set(r.scene, t); ta += ov; tb += r.total;
  const d = r.total - ov; if (d > 0.05) worseN++; if (d < -0.05) better++;
  if (d > bar) worse.push(`${r.scene} x${r.xi} (${r.x}, ${r.y}): ${ov} -> ${r.total} (+${d.toFixed(1)})`);
}
for (const [s, [x, y]] of tot) console.log(`${s.padEnd(22)} ${x.toFixed(0).padStart(6)} -> ${y.toFixed(0).padStart(6)} (${y - x >= 0 ? "+" : ""}${(y - x).toFixed(0)})`);
console.log(`ALL ${ta.toFixed(0)} -> ${tb.toFixed(0)} (${tb - ta >= 0 ? "+" : ""}${(tb - ta).toFixed(0)}); crossings worse ${worseN}, better ${better}; worse by > ${bar} px: ${worse.length}`);
for (const w of worse) console.log("  " + w);

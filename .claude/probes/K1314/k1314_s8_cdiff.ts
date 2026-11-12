// K1314 s8: finds that differ between two census runs, by spot.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s8_cdiff.ts <tagA> <tagB> [--all] [--d=0.06]
// Matches each find of A to one of B with the same scene and kind within d (world) and prints the unmatched
// ones (- only in A, + only in B) and matched ones whose px moved by more than 25% (~). Bar kinds only unless --all.
import { readFileSync } from "node:fs";
import { join } from "node:path";
type Art = { id: string; scene: string; kind: string; x: number; y: number; px: number; near: string; dNear: number; part: string };
const args = process.argv.slice(2); const [ta, tb] = args.filter((a) => !a.startsWith("--"));
const d = Number(args.find((a) => a.startsWith("--d="))?.slice(4) ?? 0.06);
const BAR = new Set(["stray_ink", "hard_edge", "paper", "broken_ink", "k1049"]);
const load = (t: string): Art[] => (JSON.parse(readFileSync(join(import.meta.dirname, "out", "s1", `census_${t}.json`), "utf8")).arts as Art[]).filter((a) => args.includes("--all") || BAR.has(a.kind));
const A = load(ta); const B = load(tb); const used = new Set<number>();
const fmt = (a: Art): string => `${a.scene} ${a.kind} ${a.px}px (${a.x.toFixed(3)},${a.y.toFixed(3)}) ${a.near} ${a.dNear.toFixed(2)} ${a.part}`;
const out: string[] = [];
for (const a of A) {
  let bi = -1; let bd = Infinity;
  B.forEach((b, i) => { if (used.has(i) || b.scene !== a.scene || b.kind !== a.kind) return; const e = Math.hypot(b.x - a.x, b.y - a.y); if (e < d && e < bd) { bd = e; bi = i; } });
  if (bi < 0) { out.push(`- ${fmt(a)}`); continue; }
  used.add(bi); const b = B[bi]; if (Math.abs(b.px - a.px) > 0.25 * Math.max(a.px, b.px)) out.push(`~ ${fmt(a)} -> ${b.px}px`);
}
B.forEach((b, i) => { if (!used.has(i)) out.push(`+ ${fmt(b)}`); });
const cnt = (L: Art[]): string => [...BAR].map((k) => `${k} ${L.filter((a) => a.kind === k).length}`).join(", ");
console.log(`${ta}: ${cnt(A)}\n${tb}: ${cnt(B)}`); for (const l of out) console.log(l);

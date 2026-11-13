// K1351 s1: find-for-find comparison of two census JSONs (scene, kind, place, size, part).
//   node scripts/run_node.mjs .claude/probes/K1351/k1351s1_cmp.ts <a.json> <b.json>
import { readFileSync } from "node:fs";
const load = (p: string): Map<string, unknown> => {
  const j = JSON.parse(readFileSync(p, "utf8")) as { arts: Record<string, unknown>[] };
  const m = new Map<string, unknown>();
  for (const a of j.arts) {
    const k = JSON.stringify([a.scene, a.kind, a.sub, a.x, a.y, a.px, a.part, a.piece]);
    m.set(k, a);
  }
  return m;
};
const [pa, pb] = process.argv.slice(2);
const A = load(pa), B = load(pb);
let same = 0;
const onlyA: string[] = [], onlyB: string[] = [];
for (const k of A.keys()) (B.has(k) ? same++ : onlyA.push(k));
for (const k of B.keys()) if (!A.has(k)) onlyB.push(k);
console.log(`A finds ${A.size} B finds ${B.size} identical keys ${same}`);
for (const k of onlyA.slice(0, 20)) console.log(`only A ${k}`);
for (const k of onlyB.slice(0, 20)) console.log(`only B ${k}`);
if (onlyA.length || onlyB.length) process.exit(1);
console.log("find-for-find equal");

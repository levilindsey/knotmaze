// K1451 s2: find by find, a scan variant against master (win1e-9) in one scan folder. A find matches the nearest
// unused master find of the same kind and scene within R h. Reports, per class pair, the matched counts and pixel
// sums; every unmatched find of the variant (new) and of master (gone); every matched tie (or any class) that grew.
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_match.ts <folder> [variant=src] [R=1] [--list]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const [dir, va = "src", Rs = "1"] = process.argv.slice(2).filter((a) => !a.startsWith("--")); const R = +Rs;
const list = process.argv.includes("--list");
const D = join(import.meta.dirname, "out", dir);
type F = { kind: string; cls: string; x: number; y: number; px: number; peak: number; scene: string; used?: boolean };
const load = (v: string): Map<string, { h: number; f: F[] }> => {
  const m = new Map(); for (const f of readdirSync(D).filter((n) => n.startsWith(`${v}_`) && n.endsWith(".json"))) {
    const j = JSON.parse(readFileSync(join(D, f), "utf8")); m.set(j.scene, { h: j.h, f: j.finds.map((q: F) => ({ ...q, scene: j.scene })) });
  } return m;
};
const A = load("win1e-9"), B = load(va);
const pair = new Map<string, { n: number; pa: number; pb: number }>(); const added: F[] = []; const gone: F[] = []; const grew: [F, F][] = [];
for (const [sc, b] of B) {
  const a = A.get(sc)!; const h = b.h;
  // greedy by distance
  const cand: [number, F, F][] = [];
  for (const fb of b.f) for (const fa of a.f) if (fa.kind === fb.kind) { const d = Math.hypot(fa.x - fb.x, fa.y - fb.y); if (d < R * h) cand.push([d, fa, fb]); }
  cand.sort((p, q) => p[0] - q[0]); const mb = new Set<F>();
  for (const [, fa, fb] of cand) { if (fa.used || mb.has(fb)) continue; fa.used = true; mb.add(fb);
    const k = `${fa.cls}->${fb.cls}`; const e = pair.get(k) ?? { n: 0, pa: 0, pb: 0 }; e.n++; e.pa += fa.px; e.pb += fb.px; pair.set(k, e);
    if (fb.px > fa.px + 2) grew.push([fa, fb]); }
  for (const fb of b.f) if (!mb.has(fb)) added.push(fb);
  for (const fa of a.f) if (!fa.used) gone.push(fa);
}
console.log(`${dir}: ${va} vs master (win1e-9), match radius ${R} h`);
for (const [k, e] of [...pair].sort()) console.log(`  matched ${k}\t${e.n}\tpx master ${e.pa} -> ${e.pb}`);
const by = (fs: F[]): string => { const t: Record<string, [number, number]> = {}; for (const f of fs) { const k = `${f.kind}:${f.cls}`; t[k] = t[k] ?? [0, 0]; t[k][0]++; t[k][1] += f.px; } return Object.entries(t).sort().map(([k, [n, p]]) => `${k} ${n} (${p} px)`).join(", "); };
console.log(`  new in ${va}: ${added.length}: ${by(added)}`);
console.log(`  gone (master only): ${gone.length}: ${by(gone)}`);
console.log(`  matched and grew > 2 px: ${grew.length}: ` + grew.map(([a, b]) => `${b.scene}:${b.x.toFixed(2)}:${b.y.toFixed(2)} ${a.kind} ${a.cls}->${b.cls} ${a.px}->${b.px}`).join("; "));
if (list) for (const f of added.sort((p, q) => q.px - p.px)) console.log(`  NEW ${f.scene}:${f.x.toFixed(2)}:${f.y.toFixed(2)} ${f.kind}:${f.cls} ${f.px} px peak ${f.peak}`);

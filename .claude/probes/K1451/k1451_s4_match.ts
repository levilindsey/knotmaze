// K1451 s4: match the s4scan dumps, over (this stage) against clip (master), per fade and scene, find by find within
// R world units (default 0.3), same kind: NEW (in over only), GONE (in clip only), GREW (> 10% more px).
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_s4_match.ts [R=0.3]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const D = join(dirname(fileURLToPath(import.meta.url)), "out", "s4scan"); const R = +(process.argv[2] ?? 0.3);
type F = { kind: string; cls: string; x: number; y: number; px: number };
const files = readdirSync(D).filter((f) => f.endsWith(".json") && f.includes("_clip_"));
const tot: Record<string, number[]> = {};
for (const f of files.sort()) {
  const fl = f.split("_")[0]; const a = JSON.parse(readFileSync(join(D, f), "utf8")); const b = JSON.parse(readFileSync(join(D, f.replace("_clip_", "_over_")), "utf8"));
  const A: F[] = a.finds; const B: F[] = b.finds; const used = new Set<number>(); const pairs: [F, F][] = []; const added: F[] = [];
  const cand: [number, number, number][] = [];
  B.forEach((fb, bi) => A.forEach((fa, ai) => { if (fa.kind === fb.kind) { const d = Math.hypot(fa.x - fb.x, fa.y - fb.y); if (d < R) cand.push([d, ai, bi]); } }));
  cand.sort((p, q) => p[0] - q[0]); const bUsed = new Set<number>();
  for (const [, ai, bi] of cand) if (!used.has(ai) && !bUsed.has(bi)) { used.add(ai); bUsed.add(bi); pairs.push([A[ai], B[bi]]); }
  B.forEach((fb, bi) => { if (!bUsed.has(bi)) added.push(fb); });
  const gone = A.filter((_, ai) => !used.has(ai)); const grew = pairs.filter(([p, q]) => q.px > 1.1 * p.px);
  (tot[fl] ??= [0, 0, 0, 0, 0]); tot[fl][0] += A.length; tot[fl][1] += B.length; tot[fl][2] += added.length; tot[fl][3] += gone.length; tot[fl][4] += grew.length;
  const s = (q: F): string => `${a.scene}:${q.x.toFixed(2)}:${q.y.toFixed(2)} ${q.kind}:${q.cls} ${q.px}px`;
  console.log(`${fl} ${a.scene}: clip ${A.length} over ${B.length} new ${added.length} gone ${gone.length} grew ${grew.length}`);
  for (const q of added) console.log(`   NEW ${s(q)}`); for (const q of gone) console.log(`   GONE ${s(q)}`);
  for (const [p, q] of grew) console.log(`   GREW ${s(p)} -> ${q.px}px`);
}
for (const [fl, t] of Object.entries(tot)) console.log(`TOTAL ${fl}: clip ${t[0]} over ${t[1]} new ${t[2]} gone ${t[3]} grew ${t[4]}`);

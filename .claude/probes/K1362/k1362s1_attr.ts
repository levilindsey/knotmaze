// K1362 s1: attribute every census find to a mechanism, from the winning terms at its pixel (form B / the census
// reference against the GPU field's CPU mirror). Prints counts per bucket by kind, and up to --ex examples a bucket.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_attr.ts <census tags, comma-separated> [--ex=4] [--scene=a,b]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildModel, refEval } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
import { GfEval } from "../../../src/render/gpu_field/eval";

const tags = (process.argv[2] ?? "f1,f2,f3").split(",");
const EX = +(process.argv.find((a) => a.startsWith("--ex="))?.slice(5) ?? 4);
const only = process.argv.find((a) => a.startsWith("--scene="))?.slice(8).split(",");
const dir = join(import.meta.dirname ?? ".", "out", "s1");
type Art = { id: string; scene: string; kind: string; sub: string; x: number; y: number; px: number; near: string; dNear: number };
const arts: Art[] = tags.flatMap((t) => JSON.parse(readFileSync(join(dir, `census_${t}.json`), "utf8")).arts as Art[])
  .filter((a) => ["stray_ink", "hard_edge", "paper", "broken_ink", "k1049"].includes(a.kind) && (!only || only.includes(a.scene)));
const CORNER = new Set([2, 3, 4, 5]);
const buckets = new Map<string, { n: number; byKind: Record<string, number>; ex: string[] }>();
const rows: unknown[] = [];
for (const nm of [...new Set(arts.map((a) => a.scene))]) {
  const m = buildModel(nm); const T = gfTablesOf(m); const E = new GfEval(T); const h = T.h;
  for (const a of arts.filter((u) => u.scene === nm)) {
    const g = { ...E.eval(a.x, a.y) } as { ink: number; chain: number; winKind: number; winA: number };
    const f = refEval(m, a.x, a.y) as { ink: number; chain: number; term: { kind: number; corner: number; chain: number } | null };
    const rk = f.term?.kind ?? 0; const dInk = g.ink - f.ink;
    let b: string;
    if (Math.abs(dInk) < 0.1) b = "agrees at the find's pixel now (|d ink| < 0.1)";
    else if (g.winKind === 5) b = "K1049 through-pass corner (mine)";
    else if (a.dNear > 3 * h) b = "away from junctions (> 3h)";
    else if (g.chain !== f.chain && g.chain >= 0 && f.chain >= 0) b = "label differs";
    else if (CORNER.has(rk) && g.winKind !== 2) b = "form B corner term, mine side/none";
    else if (!CORNER.has(rk) && g.winKind === 2) b = "mine corner term, form B side/none";
    else if (rk === 1 && g.winKind === 1) b = dInk < 0 ? "same side term, mine lighter (burial)" : "same side term, mine darker (burial)";
    else if (CORNER.has(rk) && g.winKind === 2) b = "same corner term, ink differs (r/q)";
    else b = `other (B term ${rk}, mine ${g.winKind})`;
    const e = buckets.get(b) ?? { n: 0, byKind: {}, ex: [] }; e.n++; e.byKind[a.kind] = (e.byKind[a.kind] ?? 0) + 1;
    if (e.ex.length < EX) e.ex.push(`${a.scene}:${a.x.toFixed(3)}:${a.y.toFixed(3)} ${a.kind}/${a.sub} ${a.px}px ${a.near} d/h ${(a.dNear / h).toFixed(1)} me ${g.ink.toFixed(2)} B ${f.ink.toFixed(2)}`);
    buckets.set(b, e); rows.push({ id: a.id, bucket: b, me: g.ink, B: f.ink, rk, wk: g.winKind });
  }
}
for (const [b, e] of [...buckets].sort((u, v) => v[1].n - u[1].n)) {
  console.log(`${String(e.n).padStart(4)} ${b} ${JSON.stringify(e.byKind)}`);
  for (const x of e.ex) console.log(`       ${x}`);
}
writeFileSync(join(dir, `attr_${tags.join("_")}.json`), JSON.stringify(rows));

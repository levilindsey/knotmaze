// K1344 s1: the prototype against src. Per scene: src's table vs outline_proto's with K1344.fix off (must be
// identical) and on (the changed pieces: index, kind, corner, where, how far the moved point went), the
// hooks cut and missed, and the tail walks that still turn back (a negative dot of consecutive steps).
//   node scripts/run_node.mjs .claude/probes/K1344/k1344_check.ts [scene,scene...] [--list]
import * as O from "../../../src/render/outline/outline";
import * as P from "./outline_proto";
import { loadScene, ALL } from "../K1314/k1314_census";

const a = process.argv.slice(2);
const names = a[0] && !a[0].startsWith("--") ? a[0].split(",") : ALL;
const LIST = a.includes("--list");
type Pc = { kind: string; pts: number[]; cpts: number[]; alpha?: number[]; corner: number };
const turns = (p: Pc): number => { let n = 0; for (let i = 1; i + 1 < p.pts.length / 2; i++) { const q = 2 * i; if ((p.pts[q] - p.pts[q - 2]) * (p.pts[q + 2] - p.pts[q]) + (p.pts[q + 1] - p.pts[q - 1]) * (p.pts[q + 3] - p.pts[q + 1]) < 0) n++; } return n; };
const same = (x?: number[], y?: number[]): boolean => (!x && !y) || (!!x && !!y && x.length === y.length && x.every((v, i) => v === y[i]));
for (const nm of names) {
  const scene = loadScene(nm);
  const src = O.frame(O.structure(scene), scene).pieces as unknown as Pc[];
  P.K1344.fix = false; P.K1344.hooks = 0; P.K1344.miss = 0;
  const off = (P.frame(P.structure(scene as never), scene as never).pieces as unknown as Pc[]);
  const missOff = P.K1344.miss;
  P.K1344.fix = true; P.K1344.hooks = 0; P.K1344.miss = 0;
  const on = (P.frame(P.structure(scene as never), scene as never).pieces as unknown as Pc[]);
  let diffOff = 0; let changed = 0; let tB = 0; let tA = 0; const rows: string[] = [];
  src.forEach((p, i) => {
    const q = off[i]; if (!q || !same(p.pts, q.pts) || !same(p.cpts, q.cpts) || !same(p.alpha, q.alpha)) diffOff++;
    if (p.kind === "tail") { tB += turns(p) > 0 ? 1 : 0; tA += turns(on[i]) > 0 ? 1 : 0; }
    const r = on[i];
    if (!same(p.pts, r.pts) || !same(p.cpts, r.cpts) || !same(p.alpha, r.alpha)) {
      changed++;
      let k = -1; let d = 0; for (let j = 0; j < p.pts.length; j += 2) { const e = Math.hypot(p.pts[j] - r.pts[j], p.pts[j + 1] - r.pts[j + 1]); if (e > d) { d = e; k = j / 2; } }
      rows.push(`  p${i} ${p.kind} corner ${p.corner} pt ${k} (${p.pts[2 * k].toFixed(3)}, ${p.pts[2 * k + 1].toFixed(3)}) moved ${d.toFixed(4)}`);
    }
  });
  console.log(`${nm}: pieces ${src.length} off-vs-src diff ${diffOff} (miss ${missOff}) | fix: hooks ${P.K1344.hooks} miss ${P.K1344.miss} changed ${changed} | tails turning back ${tB} -> ${tA}`);
  if (LIST) for (const r of rows) console.log(r);
}

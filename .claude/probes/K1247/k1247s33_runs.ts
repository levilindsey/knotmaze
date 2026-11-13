// K1247 s33 debug: why span holds change sectionPaint's run count (paintFrame throws).
import { KF_INC, alignJunctionArms, newSnapState, snapScene } from "../../../src/render/outline/outline";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { sectionPaint } from "../../../src/render/outline/paint";
import type { DiagramStructure, SceneIn } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";
const { cap, raw } = loadDrag(process.argv[2], 10);
KF_INC.jlocal = true;
const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const S = newSnapState(); let prev: SceneIn | null = null;
for (let f = 0; f < 12; f++) {
  const sc = snapScene(S, alignJunctionArms(st, raw[f]));
  const sp = sectionPaint(sc, "app", 0);
  if (prev) {
    const sp0 = sectionPaint(prev, "app", 0);
    if (sp0.runs.length !== sp.runs.length) {
      const per = (x: SceneIn) => x.chains.map((c) => { const L: number[] = []; for (const j of x.junctions) for (const a of j.arms) if (a.chain === c.id && !L.some((u) => Math.abs(u - a.s) < 1e-6)) L.push(a.s); return L.sort((p, q) => p - q).map((v) => v.toFixed(7)); }); const rc = (x: ReturnType<typeof sectionPaint>) => { const m = new Map<number, number>(); for (const r of x.runs as { chain: number }[]) m.set(r.chain, (m.get(r.chain) ?? 0) + 1); return m; }; const ma = rc(sp0); const mb = rc(sp); for (const [k, v] of mb) if (ma.get(k) !== v) console.log(`  runs chain ${k}: ${ma.get(k)} -> ${v}`);
      const A = per(prev); const B = per(sc);
      console.log(`f${f}: runs ${sp0.runs.length} -> ${sp.runs.length}`);
      let n = 0; for (let i = 0; i < A.length && n < 4; i++) if (A[i].length !== B[i].length) { n++; console.log(`  chain ${i} d ${S.dChains[i]}: ${A[i].join(" ")}  ->  ${B[i].join(" ")}`); }
    }
  }
  prev = sc;
}


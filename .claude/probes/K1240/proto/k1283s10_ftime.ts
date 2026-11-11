// K1283 s10: fillFrame() (and frame()) time on a scene for several fill variants, interleaved in
// one process: before = master f88cf62f (k1283s9_before_*), s9 = 73f695ca's fill (k1283s10_s9_fill),
// nofoot = s9 without the strip foot, src = the working tree. Run under the perf lock:
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s10_ftime.ts [scene=def] [--n=40] [--v=before,s9,nofoot,src]
import * as O from "./outline";
import * as F from "./fill_tri";
import * as B from "./k1283s9_before_outline";
import * as BF from "./k1283s9_before_fill";
import * as S9 from "./k1283s10_s9_fill";
import * as NF from "./k1283s10_nofoot_fill";
import { loadScene } from "./k1279_census";
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--")) ?? "def";
const N = Number(args.find((a) => a.startsWith("--n="))?.slice(4) ?? 40);
const want = (args.find((a) => a.startsWith("--v="))?.slice(4) ?? "before,s9,nofoot,src").split(",");
const scene = loadScene(name);
type Mods = { O: typeof O; F: typeof F };
const all: Record<string, Mods> = {
  before: { O: B as unknown as typeof O, F: BF as unknown as typeof F },
  s9: { O, F: S9 as unknown as typeof F },
  nofoot: { O, F: NF as unknown as typeof F },
  src: { O, F },
};
const run = (m: Mods): { fr: number; fi: number } => {
  const st = m.O.structure(scene);
  const t0 = m.O.frame(st, scene);
  const fs = m.F.fillStructure(st, m.F.fillResolution(st, t0));
  const fr: number[] = []; const fi: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = performance.now(); const t = m.O.frame(st, scene); const b = performance.now();
    m.F.fillFrame(fs, st, t, scene); const c = performance.now();
    fr.push(b - a); fi.push(c - b);
  }
  const med = (v: number[]): number => v.sort((x, y) => x - y)[v.length >> 1];
  return { fr: med(fr), fi: med(fi) };
};
const acc: Record<string, number[]> = {};
for (let rep = 0; rep < 3; rep++) {
  const order = rep % 2 === 0 ? want : [...want].reverse();
  for (const nm of order) {
    const r = run(all[nm]);
    (acc[nm] ??= []).push(r.fi);
    console.log(`${nm} frame ${r.fr.toFixed(2)} ms fill ${r.fi.toFixed(2)} ms`);
  }
}
for (const nm of want) console.log(`${nm} fill median-of-3 ${acc[nm].sort((x, y) => x - y)[1].toFixed(2)} ms`);

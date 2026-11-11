// K1283 s9: frame() + fillFrame() time on def, src against the before copies (master at launch),
// interleaved, in one process. Run under the perf lock:
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s9_ftime.ts [scene=def] [--n=40]
import * as O from "./outline";
import * as F from "./fill_tri";
import * as B from "./k1283s9_before_outline";
import * as BF from "./k1283s9_before_fill";
import { loadScene } from "./k1279_census";
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--")) ?? "def";
const N = Number(args.find((a) => a.startsWith("--n="))?.slice(4) ?? 40);
const scene = loadScene(name);
type Mods = { O: typeof O; F: typeof F };
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
const mods: [string, Mods][] = [["before", { O: B as unknown as typeof O, F: BF as unknown as typeof F }], ["after", { O, F }]];
for (const pass of [0, 1, 1, 0, 0, 1]) {
  const [nm, m] = mods[pass]; const r = run(m);
  console.log(`${nm} frame ${r.fr.toFixed(2)} ms fill ${r.fi.toFixed(2)} ms`);
}

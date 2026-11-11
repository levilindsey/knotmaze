// K1278 s2: what stage 2 changed in the fill, per scene: src's fillFrame
// against src before stage 2 (k1278s2_before_fill, 8f7004bf). Geometry
// (pos, key, s, across), weights and runs must be bit-identical (K1277's
// bars and the paint-thread census then hold by construction); s4 is what
// stage 2 moves, reported as vertices changed and the largest |ds|.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278s2_ident.ts [--scene=a,b]
import * as O from "../../../../src/render/outline/outline";
import * as F from "../../../../src/render/outline/fill_tri";
import * as F0 from "./k1278s2_before_fill";
import { sectionPaint } from "../../../../src/render/outline/paint";
import * as D from "../../../../src/render/outline/draw";
import { ALL, loadScene } from "./k1279_census";
const sc = process.argv.find((a) => a.startsWith("--scene="))?.slice(8).split(",") ?? ALL;
const same = (a: ArrayLike<number>, b: ArrayLike<number>): boolean => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && !(Number.isNaN(a[i]) && Number.isNaN(b[i]))) return false; return true; };
let bad = 0;
for (const nm of sc) {
  const scene = loadScene(nm); const st = O.structure(scene); const table = O.frame(st, scene);
  const fs = F.fillStructure(st, F.fillResolution(st, table)); const fr = F.fillFrame(fs, st, table, scene);
  const fs0 = F0.fillStructure(st, F0.fillResolution(st, table)); const fr0 = F0.fillFrame(fs0, st, table, scene);
  const sp = sectionPaint(scene, "app", D.baseHueFor(nm));
  const r = F.fillRuns(fs, st, fr, sp); const r0 = F0.fillRuns(fs0, st, fr0, sp);
  const chk: [string, boolean][] = [["idx", same(fs.idx, fs0.idx)], ["pos", same(fr.pos, fr0.pos)], ["key", same(fr.key, fr0.key)], ["s", same(fr.s, fr0.s)], ["w4", same(fr.w4, fr0.w4)], ["across", same(fr.across, fr0.across)], ["runs", same(r, r0)]];
  let nS = 0; let mx = 0; for (let i = 0; i < fr.s4.length; i++) { const d = Math.abs(fr.s4[i] - fr0.s4[i]); if (d > 1e-9) { nS++; mx = Math.max(mx, d); } }
  const diff = chk.filter(([, ok]) => !ok).map(([k]) => k); bad += diff.length;
  console.log(`${nm}: ${diff.length ? "DIFFERS in " + diff.join(", ") : "geometry, weights, runs identical"}; s4 slots changed ${nS} of ${fr.s4.length}, max |ds| ${mx.toFixed(3)}`);
}
console.log(bad ? `FAIL: ${bad} arrays differ` : "OK: only s4 moved");

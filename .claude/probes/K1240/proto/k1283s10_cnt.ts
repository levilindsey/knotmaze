// K1283 s10: footS calls and segments per frame on a scene (k1283s10_cnt_fill = s9's fill with counters),
// plus a profile of chain segment lengths against the strip half width.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s10_cnt.ts [scene=def]
import * as O from "./outline";
import * as C from "./k1283s10_cnt_fill";
import { zChains } from "./draw";
import { loadScene } from "./k1279_census";
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const scene = loadScene(name);
const st = O.structure(scene);
const t0 = O.frame(st, scene);
const fs = C.fillStructure(st, C.fillResolution(st, t0));
C.fillFrame(fs, st, t0, scene);
C.footCnt.calls = 0; C.footCnt.seg = 0;
C.fillFrame(fs, st, t0, scene);
console.log(`${name}: footS calls ${C.footCnt.calls}, segments ${C.footCnt.seg}, per call ${(C.footCnt.seg / C.footCnt.calls).toFixed(2)}`);
const zz = zChains(scene);
let segs = 0; let sum = 0; const ls: number[] = [];
for (const c of zz.zc) for (let k = 0; k + 1 < c.n; k++) { const l = c.s[k + 1] - c.s[k]; ls.push(l); sum += l; segs++; }
ls.sort((a, b) => a - b);
console.log(`chains ${zz.zc.length}, segments ${segs}, mean len ${(sum / segs).toFixed(4)}, p10 ${ls[Math.floor(segs * 0.1)].toFixed(4)} p50 ${ls[segs >> 1].toFixed(4)} p90 ${ls[Math.floor(segs * 0.9)].toFixed(4)}; h ${(t0 as unknown as { h: number }).h}`);

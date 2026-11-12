import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OB_DI, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { footS } from "../../../src/render/outline/band_gpu";
import { colAt, recTables, POLY } from "../../../src/render/outline/chain_frame";
const dir = process.argv[2]; const fl = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const sc: SceneIn = JSON.parse(readFileSync(join(dir, fl[0]), "utf8")); sc.look.ctrlArc ??= 0.47; OB_DI.on = true;
const st = structure(sc); const tb = frame(st, sc); const zz = zChains(sc); const T = recTables(zz.zc, tb.h);
const p = tb.pieces.find((q) => q.di === 123)!; const C = zz.zc[p.chain]; const np = p.pts.length / 2; const N = 124; const dS = p.s1 - p.s0;
console.log(`POLY.mode ${POLY.mode} h ${tb.h} W ${tb.W} chain n ${C.n} len ${C.len.toFixed(2)} s0 ${p.s0} dS ${dS} np ${np}`);
const o = new Float64Array(2);
for (let i = 0; i < 6; i++) { const s = footS(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0, 2 * tb.h); console.log(`today ${i}: (${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)}) foot s ${s.toFixed(3)}`); }
for (const i of [1, 2, 3, 60, 122, 123]) { const s = colAt(C, T.pf, T.base[p.chain], p.s0, dS, N, p.side, tb.h, i, o, 0); console.log(`col ${i}: (${o[0].toFixed(3)},${o[1].toFixed(3)}) s ${s.toFixed(3)}`); }
let k = 0; while (k < C.n && C.s[k] < p.s0) k++; console.log(`chain at s0: sample ${k} (${C.xs[k].toFixed(3)},${C.ys[k].toFixed(3)}) s ${C.s[k].toFixed(3)}; next (${C.xs[k+1].toFixed(3)},${C.ys[k+1].toFixed(3)})`);

// K1278 stage 2: the paint along a segment, src/render/outline/. Per sample:
// the winning item (kind, index), its pixel slots (run, w, s) and the colour.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278s2_line.ts --scene=def --a=3.42:33.82 --b=4.19:34.69 [--n=40] [--mode=app]
import * as O from "../../../../src/render/outline/outline";
import * as F from "../../../../src/render/outline/fill_tri";
import { sectionPaint, paintAt, type PaintMode } from "../../../../src/render/outline/paint";
import { loadScene } from "./k1279_census";
import * as D from "../../../../src/render/outline/draw";

const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = opt("scene") ?? "def";
const [ax, ay] = (opt("a") ?? "0:0").split(":").map(Number); const [bx, by] = (opt("b") ?? "1:1").split(":").map(Number);
const N = Number(opt("n") ?? 40); const mode = (opt("mode") ?? "app") as PaintMode;
const scene = loadScene(nm);
const st = O.structure(scene); const table = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, table));
const fr = F.fillFrame(fs, st, table, scene);
const sp = sectionPaint(scene, mode, D.baseHueFor(nm)); const runs = F.fillRuns(fs, st, fr, sp);
const itemOf = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, k) => { const n = it.kind === "junc" ? 1 + it.R : F.itemVerts(it); for (let q = 0; q < n; q++) itemOf[it.base + q] = k; });
const r4 = new Int32Array(4); const w4 = new Float64Array(4); const s4 = new Float64Array(4); const c: [number, number, number] = [0, 0, 0];
let prev: number[] | null = null;
for (let i = 0; i <= N; i++) {
  const t = i / N; const x = ax + (bx - ax) * t; const y = ay + (by - ay) * t;
  const win = { tri: new Int32Array(1).fill(-1), bary: new Float32Array(3) };
  F.rasterFill(fs, fr, x - 0.0005, y - 0.0005, 1, 1, 1000, win);
  const tr = win.tri[0];
  if (tr < 0) { console.log(`${t.toFixed(3)} (${x.toFixed(3)}, ${y.toFixed(3)}) paper`); prev = null; continue; }
  const vs = [fs.idx[tr], fs.idx[tr + 1], fs.idx[tr + 2]];
  F.vertexPaint(fs, fr, runs, vs, [win.bary[0], win.bary[1], win.bary[2]], r4, w4, s4);
  paintAt(sp, r4, w4, s4, c);
  const rgb = c.map((v) => Math.round(255 * v));
  const step = prev ? Math.max(...rgb.map((v, q) => Math.abs(v - prev![q]))) : 0; prev = rgb;
  const it = fs.items[itemOf[vs[0]]];
  const sl = [0, 1, 2, 3].filter((k) => w4[k] > 1e-4).map((k) => `r${r4[k]} w${w4[k].toFixed(2)} s${s4[k].toFixed(3)}`).join(" ");
  console.log(`${t.toFixed(3)} (${x.toFixed(3)}, ${y.toFixed(3)}) ${it.kind}#${itemOf[vs[0]]} rgb ${rgb.join(",")} d${step} | ${sl}`);
}

// K1278 stage 2: form B's colour beside src's at given points (app paint):
// form B's top chain, s, ink and run colour; src's winning item and colour.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278s2_fbat.ts --scene=muse_hash --at=1.30:20.54,1.27:20.51
import * as O from "../../../../src/render/outline/outline";
import * as F from "../../../../src/render/outline/fill_tri";
import { FormB } from "../../../../src/render/field/form_b";
import { sectionPaint, paintAt, runAt, runColour, type RGB } from "../../../../src/render/outline/paint";
import { loadScene } from "./k1279_census";
import * as D from "../../../../src/render/outline/draw";

const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = opt("scene") ?? "def";
const pts = (opt("at") ?? "0:0").split(",").map((p) => p.split(":").map(Number));
const scene = loadScene(nm);
const st = O.structure(scene); const table = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, table));
const fr = F.fillFrame(fs, st, table, scene);
const sp = sectionPaint(scene, "app", D.baseHueFor(nm)); const runs = F.fillRuns(fs, st, fr, sp);
const itemOf = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, k) => { const n = it.kind === "junc" ? 1 + it.R : F.itemVerts(it); for (let q = 0; q < n; q++) itemOf[it.base + q] = k; });
const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } };
const r4 = new Int32Array(4); const w4 = new Float64Array(4); const s4 = new Float64Array(4); const c: RGB = [0, 0, 0]; const cb: RGB = [0, 0, 0];
for (const [x, y] of pts) {
  const ev = fb.evalPoint(x, y); const rb = ev.chain >= 0 ? runAt(sp, ev.chain, ev.s) : -1;
  if (rb >= 0) runColour(sp.runs[rb], ev.s, cb);
  const fbTxt = rb >= 0 ? `ch${ev.chain} s${ev.s.toFixed(3)} r${rb} ink ${ev.ink.toFixed(2)} rgb ${cb.map((v) => Math.round(255 * v)).join(",")}` : `paper/none (top ${ev.top} ink ${ev.ink.toFixed(2)})`;
  const win = { tri: new Int32Array(1).fill(-1), bary: new Float32Array(3) };
  F.rasterFill(fs, fr, x - 0.0005, y - 0.0005, 1, 1, 1000, win);
  let mine = "paper";
  if (win.tri[0] >= 0) {
    const vs = [fs.idx[win.tri[0]], fs.idx[win.tri[0] + 1], fs.idx[win.tri[0] + 2]];
    F.vertexPaint(fs, fr, runs, vs, [win.bary[0], win.bary[1], win.bary[2]], r4, w4, s4); paintAt(sp, r4, w4, s4, c);
    const it = fs.items[itemOf[vs[0]]];
    const sl = [0, 1, 2, 3].filter((k) => w4[k] > 1e-4).map((k) => `r${r4[k]} w${w4[k].toFixed(2)} s${s4[k].toFixed(3)}`).join(" ");
    mine = `${it.kind}#${itemOf[vs[0]]} ch${"pi" in it ? it.pi : "-"} rgb ${c.map((v) => Math.round(255 * v)).join(",")} | ${sl}`;
  }
  console.log(`(${x}, ${y}) formB ${fbTxt} || src ${mine}`);
}

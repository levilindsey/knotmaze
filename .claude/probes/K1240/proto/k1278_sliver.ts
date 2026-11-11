// K1278: the end-arm sliver probe. At a crossing, the pixels where the
// triangles' top chain differs from form B's, grouped by the winning item
// (kind, index, chain) and form B's chain, with the winner's key and the
// best key the form-B chain's own triangles reach there.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278_sliver.ts --scene=muse_hash --x=2.252 --y=23.074 [--half=0.6] [--ppu=80]
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "./outline";
import * as F from "./fill_tri";
import { loadScene } from "./k1279_census";
import { sectionPaint } from "./paint";

const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = opt("scene") ?? "muse_hash"; const X = Number(opt("x")); const Y = Number(opt("y"));
const half = Number(opt("half") ?? 0.6); const ppu = Number(opt("ppu") ?? 80);
const scene = loadScene(nm);
const st = O.structure(scene); const table = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, table));
const fr = F.fillFrame(fs, st, table, scene);
const fb = new FormB(scene as never, { dpr: 2 });
// --paint: the chain shown is the pixel's dominant paint slot's (K1278's
// census "paint" column), not the winning triangle's owner.
const paintMode = process.argv.includes("--paint");
const sp = sectionPaint(scene, "app"); const runs = F.fillRuns(fs, st, fr, sp);
const r4 = new Int32Array(F.SLOTS); const w4 = new Float64Array(F.SLOTS); const s4 = new Float64Array(F.SLOTS);
const N =Math.round(2 * half * ppu); const x0 = X - half; const y0 = Y - half;
const win = { tri: new Int32Array(N * N).fill(-1), bary: new Float32Array(3 * N * N) };
const own = F.rasterFill(fs, fr, x0, y0, N, N, ppu, win);
const itemOf = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, k) => { const n = it.kind === "junc" ? 1 + it.R : F.itemVerts(it); for (let q = 0; q < n; q++) itemOf[it.base + q] = k; });
const groups = new Map<string, { n: number; x: number; y: number; key: number }>();
let tot = 0;
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const o = j * N + i; const px = x0 + (i + 0.5) / ppu; const py = y0 + (j + 0.5) / ppu;
  const e = fb.evalPoint(px, py) as { ink: number; top: number; chain: number };
  if (!(e.top > 0) || e.ink > 0.5 || own[o] === 0) continue;
  const t = win.tri[o]; if (t < 0) continue;
  let ch = own[o] - 1;
  if (paintMode) {
    F.vertexPaint(fs, fr, runs, [fs.idx[t], fs.idx[t + 1], fs.idx[t + 2]], [win.bary[3 * o], win.bary[3 * o + 1], win.bary[3 * o + 2]], r4, w4, s4);
    let bw = -Infinity; for (let q = 0; q < F.SLOTS; q++) if (r4[q] >= 0 && w4[q] > bw) { bw = w4[q]; ch = sp.runs[r4[q]].pi; }
  }
  if (ch === e.chain) continue;
  tot++;
  const v = fs.idx[t]; const it = itemOf[v]; const I = fs.items[it];
  const b = [win.bary[3 * o], win.bary[3 * o + 1], win.bary[3 * o + 2]];
  const key = b[0] * fr.key[fs.idx[t]] + b[1] * fr.key[fs.idx[t + 1]] + b[2] * fr.key[fs.idx[t + 2]];
  const extra = I.kind === "strip" ? ` iv ${I.iv} N ${I.N} ghost ${I.ghost} pL ${I.pL} pR ${I.pR} row/col ${Math.floor((v - I.base) / (I.N + 1))}/${(v - I.base) % (I.N + 1)}` : I.kind === "junc" ? ` ji ${I.ji}` : ` piece ${(I as { piece: number }).piece}`;
  const g = `${I.kind} #${it} ch${ch}${extra} | formB ch${e.chain}`;
  const G = groups.get(g) ?? { n: 0, x: 0, y: 0, key }; G.n++; G.x += px; G.y += py; groups.set(g, G);
}
console.log(`${nm} (${X}, ${Y}) half ${half} ppu ${ppu}: ${tot} px top chain differs from form B (filled, not ink)`);
for (const [g, G] of [...groups].sort((a, b) => b[1].n - a[1].n).slice(0, 12)) console.log(`  ${G.n} px  ${g}  centroid (${(G.x / G.n).toFixed(3)}, ${(G.y / G.n).toFixed(3)}) key ${G.key.toFixed(3)}`);

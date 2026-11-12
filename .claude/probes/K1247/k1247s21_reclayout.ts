// K1247 s21: recLayout (by runs) against the per-vertex copy it replaced, bit for bit, and where the old one's time went (tag, perm, inv, alloc, copy, idx remap), on one captured frame's fillRec 3 paint.
// argv: frameJson R
import { readFileSync } from "node:fs";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { SLOTS, fillFrame, fillResolution, fillStructure, recStrips, type StripItem } from "../../../src/render/outline/fill_tri";
import { baseHueFor, paintData, zChains } from "../../../src/render/outline/draw";
import { recLayout } from "../../../src/render/outline/outline_model";
const [fj, Rs] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(fj, "utf8")) as SceneIn; scene.look.ctrlArc ??= 0.47; scene.look.fillRec = 3;
const st = structure(scene); const tb = frame(st, scene); const fs = fillStructure(st, fillResolution(st, tb)); const zz = zChains(scene);
const fr = fillFrame(fs, st, tb, scene, zz);
const T: Record<string, number[]> = {};
for (let r = 0; r < Number(Rs); r++) {
  const pd = paintData(fs, st, fr, scene, "app", baseHueFor(scene.name));
  let t = performance.now(); const lap = (k: string): void => { const n = performance.now(); (T[k] ??= []).push(n - t); t = n; };
  const strips = recStrips(fs); const tag = new Int32Array(2 * fs.nV).fill(-1);
  for (let o = 0; o < strips.length; o++) { const it = fs.items[strips[o]] as StripItem; const W = it.N + 1; for (let q = 0; q < 3; q++) for (let i = 2; i <= it.N - 2; i++) { const v = it.base + q * W + i; tag[2 * v] = o; tag[2 * v + 1] = (q << 16) | i; } }
  lap("tag");
  const nG = pd.src.length; const perm = new Uint32Array(nG); let nDyn = 0;
  for (let g = 0; g < nG; g++) if (tag[2 * pd.src[g]] < 0) perm[nDyn++] = g;
  for (let g = 0, q = nDyn; g < nG; g++) if (tag[2 * pd.src[g]] >= 0) perm[q++] = g;
  lap("perm"); const inv = new Uint32Array(nG); for (let n = 0; n < nG; n++) inv[perm[n]] = n; lap("inv");
  const src = new Uint32Array(nG), run = new Int32Array(SLOTS * nG), pos = new Float32Array(2 * nG), key = new Float32Array(nG);
  const w = new Float32Array(SLOTS * nG), s = new Float32Array(SLOTS * nG), rec = new Int32Array(2 * nG); lap("alloc");
  for (let n = 0; n < nG; n++) {
    const g = perm[n]; const v = pd.src[g];
    src[n] = v; pos[2 * n] = pd.pos[2 * g]; pos[2 * n + 1] = pd.pos[2 * g + 1]; key[n] = pd.key[g];
    for (let k = 0; k < SLOTS; k++) { run[SLOTS * n + k] = pd.run[SLOTS * g + k]; w[SLOTS * n + k] = pd.w[SLOTS * g + k]; s[SLOTS * n + k] = pd.s[SLOTS * g + k]; }
    rec[2 * n] = tag[2 * v]; rec[2 * n + 1] = tag[2 * v] < 0 ? 0 : tag[2 * v + 1];
  }
  lap("copy"); const idx = pd.idx; for (let k = 0; k < idx.length; k++) idx[k] = inv[idx[k]]; lap("idx");
  let runs = 1; for (let n = 1; n < nG; n++) if (perm[n] !== perm[n - 1] + 1) runs++;
  const pd2 = paintData(fs, st, fr, scene, "app", baseHueFor(scene.name)); const t0 = performance.now(); const L2 = recLayout(fs, pd2); (T.whole ??= []).push(performance.now() - t0);
  const ne = (a: ArrayLike<number>, b: ArrayLike<number>): number => { if (a.length !== b.length) return -1; let d = 0; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) d++; return d; };
  if (r === 0) console.log(`recLayout vs the per-vertex copy: nDyn ${nDyn}/${L2.nDyn} src ${ne(src, pd2.src)} run ${ne(run, pd2.run)} pos ${ne(pos, pd2.pos)} key ${ne(key, pd2.key)} w ${ne(w, pd2.w)} s ${ne(s, pd2.s)} rec ${ne(rec, L2.rec)} idx ${ne(idx, pd2.idx)}`);
  if (r === 0) console.log(`nV ${fs.nV} nG ${nG} nDyn ${nDyn} idx ${idx.length} strips ${strips.length} perm runs ${runs}`);
}
const med = (a: number[]): number => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(Object.entries(T).map(([k, v]) => `${k} ${med(v).toFixed(1)}`).join("  "));

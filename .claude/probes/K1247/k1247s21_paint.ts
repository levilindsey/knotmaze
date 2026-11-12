// K1247 s21: the structure's frame-0 fill and paint, s20's (fillRec 1, then fillRec 2's table) against
// s21's (one fillRec 3 fill). Per frame: fillRec 3's table and fallback rows against fillRec 2's (bit for
// bit), fillRec 3's vertices outside the shader's columns against fillRec 2's, the shader's columns against
// fillRec 1's (px), and the paint after recLayout (sizes, runs, w, s, idx). argv: dragDir [frames=0,40,80]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure, recStrips, REC_TEXELS, type StripItem } from "../../../src/render/outline/fill_tri";
import { baseHueFor, paintData, zChains } from "../../../src/render/outline/draw";
import { recLayout } from "../../../src/render/outline/outline_model";
const [dir, frs] = process.argv.slice(2);
const pad = (k: number): string => `f${String(k).padStart(3, "0")}.json`;
for (const k of (frs ?? "0,40,80").split(",").map(Number)) {
  const scene = JSON.parse(readFileSync(join(dir, pad(k)), "utf8")) as SceneIn; scene.look.ctrlArc ??= 0.47;
  const at = (r: number): SceneIn => ({ ...scene, look: { ...scene.look, fillRec: r } } as SceneIn);
  const st = structure(scene); const tb = frame(st, scene); const fs = fillStructure(st, fillResolution(st, tb)); const zz = zChains(scene);
  const f1 = fillFrame(fs, st, tb, at(1), zz); const f2 = fillFrame(fs, st, tb, at(2), zz); const f3 = fillFrame(fs, st, tb, at(3), zz);
  const eq = (a: ArrayLike<number> | null | undefined, b: ArrayLike<number> | null | undefined): number => {
    if (!a || !b) return a === b ? 0 : -1; if (a.length !== b.length) return -2; let d = 0;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i]) && !(a[i] !== a[i] && b[i] !== b[i])) d++; return d;
  };
  const tab = eq(f2.rec!.strip, f3.rec!.strip); const fb = eq(f2.rec!.fb.subarray(0, 4 * f2.rec!.nFb), f3.rec!.fb.subarray(0, 4 * f3.rec!.nFb));
  // The shader's vertices (record strips' columns 2..N-2, rows 0..2).
  const shd = new Uint8Array(fs.nV); const fbS = new Set<number>();
  const rs = recStrips(fs); const T = f2.rec!.strip!;
  for (let o = 0; o < rs.length; o++) {
    const it = fs.items[rs[o]] as StripItem; const W = it.N + 1; if (T[4 * REC_TEXELS * o + 7] === 0) fbS.add(o);
    for (let r = 0; r < 3; r++) for (let i = 2; i <= it.N - 2; i++) shd[it.base + r * W + i] = T[4 * REC_TEXELS * o + 7] === 0 ? 2 : 1;
  }
  let outD = 0; let inMax = 0; let inN = 0; let sMax = 0;
  for (let v = 0; v < fs.nV; v++) {
    const d = !Object.is(f2.pos[2 * v], f3.pos[2 * v]) || !Object.is(f2.pos[2 * v + 1], f3.pos[2 * v + 1]) || !Object.is(f2.key[v], f3.key[v]) || !Object.is(f2.s4[4 * v], f3.s4[4 * v]);
    if (shd[v] !== 1) { if (d) outD++; continue; }
    inN++; inMax = Math.max(inMax, Math.hypot(f1.pos[2 * v] - f3.pos[2 * v], f1.pos[2 * v + 1] - f3.pos[2 * v + 1])); sMax = Math.max(sMax, Math.abs(f1.s4[4 * v] - f3.s4[4 * v]));
  }
  const bh = baseHueFor(scene.name);
  const pA = paintData(fs, st, f1, at(1), "app", bh); const lA = recLayout(fs, pA);
  const pB = paintData(fs, st, f3, at(3), "app", bh); const lB = recLayout(fs, pB);
  const run = eq(pA.run, pB.run); const idx = eq(pA.idx, pB.idx); const src = eq(pA.src, pB.src);
  let wMax = 0; let psMax = 0; let sYzw = 0; let sDyn = 0; for (let i = 0; i < Math.min(pA.w.length, pB.w.length); i++) { wMax = Math.max(wMax, Math.abs(pA.w[i] - pB.w[i])); const e = Math.abs(pA.s[i] - pB.s[i]); psMax = Math.max(psMax, e); if (i % 4) sYzw = Math.max(sYzw, e); if ((i >> 2) < lA.nDyn) sDyn = Math.max(sDyn, e); }
  console.log(`${pad(k)}: table ${tab} fb ${fb} (${fbS.size} fallback strips) | outside shader cols ${outD} differ | shader cols ${inN}: vs fillRec1 max ${inMax.toExponential(2)} px, s ${sMax.toExponential(2)} | paint nG ${pA.src.length}/${pB.src.length} nDyn ${lA.nDyn}/${lB.nDyn} src ${src} run ${run} idx ${idx} w ${wMax.toExponential(2)} s ${psMax.toExponential(2)} (S.yzw ${sYzw.toExponential(2)}, dynamic ${sDyn.toExponential(2)})`);
}

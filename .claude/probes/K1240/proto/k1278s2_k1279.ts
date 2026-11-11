// K1278 stage 2: k1278_k1279.ts reading src/render/outline/.
// K1278: K1279's crossing census with the paint's thread. Three fills per
// crossing, scored by k1279_census.scoreWin against form B:
//   master: outline.ts's faces (k1277_base_draw), K1277's "master" column;
//   tri:    fill_tri's triangles, top thread = the winning triangle's owner
//           chain (vChain; K1277's "triangles" column);
//   paint:  the same triangles, top thread = the chain of the pixel's
//           dominant paint slot (the largest interpolated weight), so a
//           junction fan's pixel belongs to the arm whose colour it shows.
// The sliver bar: the thread term at the six end-arm crossings, paint vs
// master (muse_hash x73 x47 x292 x177, g41_user_tw64 x14, g41_def_tw64 x349).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278_k1279.ts [--ppu=80] [--scene=<filter>] [--tol=12]
// Writes out/k1278/k1279_<ppu>.json.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as curO from "../../../../src/render/outline/outline";
import * as curD from "../../../../src/render/outline/draw";
import * as baseD from "./k1277_base_draw";
import { ALL, loadScene, windowsOf, formBWindows, rScene, rasterR, scoreWin, type Row } from "./k1279_census";
import * as F from "../../../../src/render/outline/fill_tri";
import { sectionPaint } from "../../../../src/render/outline/paint";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ppu = Number(opt("ppu") ?? 80); const filt = opt("scene"); const tol = Number(opt("tol") ?? 12);
const outDir = join(here, "..", "out", "k1278"); mkdirSync(outDir, { recursive: true });
const SLIVER = new Set(["muse_hash:73", "muse_hash:47", "muse_hash:292", "muse_hash:177", "g41_user_tw64:14", "g41_def_tw64:349"]);
const rowsM: Row[] = []; const rowsT: Row[] = []; const rowsP: Row[] = [];
const t0 = Date.now();
for (const nm of ALL) {
  if (filt && !nm.includes(filt)) continue;
  const scene = loadScene(nm);
  const wins = windowsOf(scene, ppu);
  const fbw = formBWindows(nm, scene, wins, ppu);
  const st = curO.structure(scene); const table = curO.frame(st, scene);
  const Rm = rScene(table, scene, baseD as unknown as typeof curD);
  const Rt = rScene(table, scene, curD); Rt.faces = [];
  const fs = F.fillStructure(st, F.fillResolution(st, table)); const fr = F.fillFrame(fs, st, table, scene);
  const sp = sectionPaint(scene, "app"); const runs = F.fillRuns(fs, st, fr, sp);
  const r4 = new Int32Array(F.SLOTS); const w4 = new Float64Array(F.SLOTS); const s4 = new Float64Array(F.SLOTS);
  wins.forEach((w, k) => {
    const rm = rasterR(Rm, w.c0, w.r0, w.N, ppu);
    const rt = rasterR(Rt, w.c0, w.r0, w.N, ppu);
    const rp = { ink: rt.ink, own: new Int32Array(rt.own.length) };
    const win = { tri: new Int32Array(w.N * w.N).fill(-1), bary: new Float32Array(3 * w.N * w.N) };
    const own = F.rasterFill(fs, fr, w.c0 / ppu, w.r0 / ppu, w.N, w.N, ppu, win);
    for (let i = 0; i < own.length; i++) {
      rt.own[i] = own[i] - 1; rp.own[i] = own[i] - 1;
      const t = win.tri[i]; if (t < 0 || own[i] === 0) continue;
      F.vertexPaint(fs, fr, runs, [fs.idx[t], fs.idx[t + 1], fs.idx[t + 2]], [win.bary[3 * i], win.bary[3 * i + 1], win.bary[3 * i + 2]], r4, w4, s4);
      let best = -1; let bw = -Infinity;
      for (let q = 0; q < F.SLOTS; q++) if (r4[q] >= 0 && w4[q] > bw) { bw = w4[q]; best = r4[q]; }
      if (best >= 0) rp.own[i] = sp.runs[best].pi;
    }
    const a = scoreWin(w, fbw[k], rm); const b = scoreWin(w, fbw[k], rt); const c = scoreWin(w, fbw[k], rp);
    const base = { scene: nm, xi: w.xi, x: +w.x.toFixed(3), y: +w.y.toFixed(3), R: +w.R.toFixed(3), theta: +w.theta.toFixed(1) };
    const row = (s: { ink: number; fill: number; thread: number }): Row => ({ ...base, ink: +s.ink.toFixed(1), fill: +s.fill.toFixed(1), thread: s.thread, total: +(s.ink + s.fill).toFixed(1) });
    rowsM.push(row(a)); rowsT.push(row(b)); rowsP.push(row(c));
  });
  console.log(`${nm}: ${wins.length} crossings`);
}
const sum = (r: Row[], f: (x: Row) => number): string => r.reduce((s, x) => s + f(x), 0).toFixed(0);
const desc = (r: Row[]): string => `${r.filter((x) => x.total > tol).length} differ, total ${sum(r, (x) => x.total)} (fill ${sum(r, (x) => x.fill)}, thread ${sum(r, (x) => x.thread)})`;
console.log(`ALL ${rowsM.length} crossings: master ${desc(rowsM)} | tri ${desc(rowsT)} | paint ${desc(rowsP)}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (const [nmB, R] of [["tri", rowsT], ["paint", rowsP]] as const) {
  const d = R.map((r, i) => ({ r, o: rowsM[i] }));
  const tw = d.filter((e) => e.r.thread > e.o.thread + 1); const tb = d.filter((e) => e.r.thread < e.o.thread - 1);
  const tdiff = d.reduce((s, e) => s + e.r.thread, 0);
  console.log(`${nmB} vs master: total worse on ${d.filter((e) => e.r.total > e.o.total + 1).length}; thread ${tdiff} px, worse on ${tw.length}, better on ${tb.length}`);
}
console.log("sliver crossings (thread px): master | tri | paint");
rowsM.forEach((m, i) => {
  if (!SLIVER.has(`${m.scene}:${m.xi}`)) return;
  console.log(`  ${m.scene} x${m.xi} (${m.x}, ${m.y}): ${m.thread} | ${rowsT[i].thread} | ${rowsP[i].thread}${rowsP[i].thread > m.thread + 1 ? "  WORSE" : ""}`);
});
const pw = rowsP.map((r, i) => ({ r, o: rowsM[i] })).filter((e) => e.r.thread > e.o.thread + 1).sort((a, b) => (b.r.thread - b.o.thread) - (a.r.thread - a.o.thread));
for (const e of pw.slice(0, 8)) console.log(`  paint thread worse ${e.r.scene} x${e.r.xi} (${e.r.x}, ${e.r.y}): ${e.o.thread} -> ${e.r.thread}`);
writeFileSync(join(outDir, `k1279_${ppu}${filt ? `_${filt}` : ""}.json`), JSON.stringify({ ppu, tol, master: rowsM, tri: rowsT, paint: rowsP }));

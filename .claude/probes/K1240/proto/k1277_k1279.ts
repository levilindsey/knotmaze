// K1277: K1279's crossing census (k1279_census.ts's windows, form B cache and
// scoring) on master's fill against the triangles, crossing by crossing.
//   master: outline.ts's faces, even-odd (draw.ts's stencil), with
//           k1277_base_draw's bands (master's draw.ts);
//   tri:    fill_tri's triangles, depth-tested (rasterFill), with draw.ts's bands.
// Usage (from the worktree root):
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1277_k1279.ts [--ppu=80] [--scene=<filter>] [--tol=12] [--top=15]
// Writes out/k1277/k1279_<ppu>.json. A crossing is worse when tri's total
// exceeds master's by more than 1 px (k1279_census --vs's rule).
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as curO from "./outline";
import * as curD from "./draw";
import * as baseD from "./k1277_base_draw";
import { ALL, loadScene, windowsOf, formBWindows, rScene, rasterR, scoreWin, type Row } from "./k1279_census";
import { fillResolution, fillStructure, fillFrame, rasterFill } from "./fill_tri";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ppu = Number(opt("ppu") ?? 80); const filt = opt("scene"); const tol = Number(opt("tol") ?? 12); const topN = Number(opt("top") ?? 15);
const outDir = join(here, "..", "out", "k1277"); mkdirSync(outDir, { recursive: true });
const rowsM: Row[] = []; const rowsT: Row[] = [];
const t0 = Date.now();
for (const nm of ALL) {
  if (filt && !nm.includes(filt)) continue;
  const scene = loadScene(nm);
  const wins = windowsOf(scene, ppu);
  const fbw = formBWindows(nm, scene, wins, ppu);
  const st = curO.structure(scene); const table = curO.frame(st, scene);
  const Rm = rScene(table, scene, baseD as unknown as typeof curD);
  const Rt = rScene(table, scene, curD); Rt.faces = [];
  const fs = fillStructure(st, fillResolution(st, table)); const fr = fillFrame(fs, st, table, scene);
  let sm = 0; let stt = 0; let dm = 0; let dt = 0;
  wins.forEach((w, k) => {
    const rm = rasterR(Rm, w.c0, w.r0, w.N, ppu);
    const rt = rasterR(Rt, w.c0, w.r0, w.N, ppu);
    const own = rasterFill(fs, fr, w.c0 / ppu, w.r0 / ppu, w.N, w.N, ppu);
    for (let i = 0; i < own.length; i++) rt.own[i] = own[i] - 1;
    const a = scoreWin(w, fbw[k], rm); const b = scoreWin(w, fbw[k], rt);
    const base = { scene: nm, xi: w.xi, x: +w.x.toFixed(3), y: +w.y.toFixed(3), R: +w.R.toFixed(3), theta: +w.theta.toFixed(1) };
    rowsM.push({ ...base, ink: +a.ink.toFixed(1), fill: +a.fill.toFixed(1), thread: a.thread, total: +(a.ink + a.fill).toFixed(1) });
    rowsT.push({ ...base, ink: +b.ink.toFixed(1), fill: +b.fill.toFixed(1), thread: b.thread, total: +(b.ink + b.fill).toFixed(1) });
    sm += a.ink + a.fill; stt += b.ink + b.fill; if (a.ink + a.fill > tol) dm++; if (b.ink + b.fill > tol) dt++;
  });
  console.log(`${nm}: ${wins.length} crossings; master ${dm} differ, total ${sm.toFixed(0)} px | triangles ${dt} differ, total ${stt.toFixed(0)} px`);
}
const sum = (r: Row[], f: (x: Row) => number): string => r.reduce((s, x) => s + f(x), 0).toFixed(0);
console.log(`ALL ${rowsM.length} crossings: master ${rowsM.filter((r) => r.total > tol).length} differ, total ${sum(rowsM, (r) => r.total)} (ink ${sum(rowsM, (r) => r.ink)}, fill ${sum(rowsM, (r) => r.fill)}, thread ${sum(rowsM, (r) => r.thread)}) | triangles ${rowsT.filter((r) => r.total > tol).length} differ, total ${sum(rowsT, (r) => r.total)} (ink ${sum(rowsT, (r) => r.ink)}, fill ${sum(rowsT, (r) => r.fill)}, thread ${sum(rowsT, (r) => r.thread)}), ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const d = rowsT.map((r, i) => ({ r, o: rowsM[i] }));
const worse = d.filter((e) => e.r.total > e.o.total + 1).sort((a, b) => (b.r.total - b.o.total) - (a.r.total - a.o.total));
const better = d.filter((e) => e.r.total < e.o.total - 1).sort((a, b) => (a.r.total - a.o.total) - (b.r.total - b.o.total));
const tWorse = d.filter((e) => e.r.thread > e.o.thread + 1).sort((a, b) => (b.r.thread - b.o.thread) - (a.r.thread - a.o.thread));
console.log(`triangles vs master: ${worse.length} worse (> +1 px), ${better.length} better, ${d.length - worse.length - better.length} same; thread worse on ${tWorse.length}, better on ${d.filter((e) => e.r.thread < e.o.thread - 1).length}`);
for (const e of worse.slice(0, topN)) console.log(`  worse ${e.r.scene} x${e.r.xi} (${e.r.x}, ${e.r.y}) θ ${e.r.theta}°: ${e.o.total} -> ${e.r.total} (ink ${e.o.ink} -> ${e.r.ink}, fill ${e.o.fill} -> ${e.r.fill}, thread ${e.o.thread} -> ${e.r.thread})`);
for (const e of better.slice(0, 5)) console.log(`  better ${e.r.scene} x${e.r.xi} (${e.r.x}, ${e.r.y}) θ ${e.r.theta}°: ${e.o.total} -> ${e.r.total} (thread ${e.o.thread} -> ${e.r.thread})`);
for (const e of tWorse.slice(0, 5)) console.log(`  thread worse ${e.r.scene} x${e.r.xi} (${e.r.x}, ${e.r.y}) θ ${e.r.theta}°: ${e.o.thread} -> ${e.r.thread}`);
writeFileSync(join(outDir, `k1279_${ppu}${filt ? `_${filt}` : ""}.json`), JSON.stringify({ ppu, tol, master: rowsM, tri: rowsT }));

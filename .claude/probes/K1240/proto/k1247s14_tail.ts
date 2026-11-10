// K1247 s14 (place 4): one end tail's f terms along u in the full frame and the reduced one
// (k1247s8_acc's default selection at <eps> device px): u/h, f, ad/h, 0.5 - ramp, the width
// term, the depth margin / zt, then the corner's TailIn inputs (sT, endS, sRX, LX, LcutX) and
// each frame's tail point count. For the tail that comes and goes (g41_def_tw64 corner 105).
// Usage: node scripts/run_node.mjs <this> <scene> <corner> <eps px> [mult=0]
import { structure, frame, tailDbg } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";
const [nm, ciS, epsS, muS] = process.argv.slice(2);
const ci = +ciS; const mu = Number(muS ?? 0);
const still = load(nm); const S = still.camera.pxPerUnit * 2;
const K = selectKeep(still, { eps: +epsS / S, win: 0, maxSeg: Infinity, keepShort: 0 });
const sc = sceneOf(nm, mu);
const rows: number[][][] = []; const n: string[] = [];
for (const [st, s] of [[structure(still), sc], [structure(reduceScene(still, K)), reduceScene(sc, K)]] as const) {
  tailDbg.ci = ci; tailDbg.rows = [];
  const t = frame(st, s);
  rows.push(tailDbg.rows.slice());
  const pc = t.pieces.find((p) => p.kind === "tail" && p.corner === ci);
  n.push(pc ? String(pc.pts.length / 2) : "-");
}
tailDbg.ci = -1;
console.log(`${nm} mult ${mu} corner ${ci} eps ${epsS}: tail pts full ${n[0]} reduced ${n[1]}`);
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(4) : String(v)).padStart(9);
console.log("      u/h        f     ad/h   0.5-rmp    width    depth |      u/h        f     ad/h   0.5-rmp    width    depth");
for (let m = 0; m < Math.max(rows[0].length, rows[1].length); m++) {
  const a = rows[0][m] ?? []; const b = rows[1][m] ?? [];
  console.log(`${a.slice(0, 6).map(f).join("")} |${b.slice(0, 6).map(f).join("")}`);
}

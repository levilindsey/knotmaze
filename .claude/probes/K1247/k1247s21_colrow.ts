// K1247 s21: colRow against colAt, bit for bit, on the chains of captured frames: random record sides
// (sA, dS, N, side, column range) per chain. argv: dragDir [every=10] [trials=400]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { colAt, colRow, recTables } from "../../../src/render/outline/chain_frame";
const [dir, evs, trs] = process.argv.slice(2);
const every = Number(evs ?? 10); const trials = Number(trs ?? 400);
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
let cols = 0; let bad = 0; let sides = 0; const t0 = performance.now(); let tRow = 0; let tAt = 0;
for (let fi = 0; fi < files.length; fi += every) {
  const scene = JSON.parse(readFileSync(join(dir, files[fi]), "utf8")) as SceneIn;
  const zc = zChains(scene).zc; const hW = scene.look.halfWidth; const T = recTables(zc, hW);
  for (let ci = 0; ci < zc.length; ci++) {
    const c = zc[ci]; if (!c || c.n < 2) continue;
    for (let t = 0; t < trials; t++) {
      const L = c.len; const sA = (rnd() * 3 - 1) * L; const dS = Math.fround(rnd() * L * (rnd() < 0.2 ? 1.2 : 0.5));
      const N = 2 + Math.floor(rnd() * 80); const sg = rnd() < 0.5 ? 1 : -1;
      const iLo = 1 + Math.floor(rnd() * 2); const iHi = N - 1 - Math.floor(rnd() * 2); if (iHi < iLo) continue;
      const A = new Float64Array(2 * (N + 1)).fill(NaN); const SA = new Float64Array(N + 1).fill(NaN);
      const R = new Float64Array(2 * (N + 1)).fill(NaN); const SR = new Float64Array(N + 1).fill(NaN);
      let q = performance.now();
      for (let i = iLo; i <= iHi; i++) SA[i] = colAt(c, T.pf, T.base[ci], sA, dS, N, sg, hW, i, A, 2 * i);
      tAt += performance.now() - q; q = performance.now();
      colRow(c, T.pf, T.base[ci], sA, dS, N, sg, hW, iLo, iHi, R, SR);
      tRow += performance.now() - q; sides++;
      for (let i = iLo; i <= iHi; i++) {
        cols++;
        const same = (x: number, y: number): boolean => Object.is(x, y) || (x !== x && y !== y);
        if (!same(A[2 * i], R[2 * i]) || !same(A[2 * i + 1], R[2 * i + 1]) || !same(SA[i], SR[i])) {
          if (bad++ < 5) console.log(`mismatch ${files[fi]} chain ${ci} N ${N} i ${i}: at ${A[2 * i]},${A[2 * i + 1]},${SA[i]} row ${R[2 * i]},${R[2 * i + 1]},${SR[i]}`);
        }
      }
    }
  }
}
console.log(`${sides} sides, ${cols} columns, ${bad} mismatches; colAt ${tAt.toFixed(0)} ms, colRow ${tRow.toFixed(0)} ms (total ${(performance.now() - t0).toFixed(0)} ms)`);

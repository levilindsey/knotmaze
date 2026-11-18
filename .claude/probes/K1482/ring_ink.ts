// K1482 s3: the mirror's ink / cov / chain around a census-scene point, with tipSink off, stage 2's step sink, and the
// a smoothstep taper of each length (in h) and the working tree's sink (src), for ring_ink.py's 4x sheet.
//   GF_HOME=1 node scripts/run_node.mjs .claude/probes/K1482/ring_ink.ts <scene> <x> <y> <half> <ppu> <out.json> [tapers]
import { writeFileSync } from "node:fs";
import { tablesOf } from "../K1436/k1436_lib.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [sc = "ring", xs = "1.77", ys = "15.26", hs = "0.5", ps = "100", op = "ring_ink.json", ts = "1"] = process.argv.slice(2);
const X = +xs, Y = +ys, H = +hs, P = +ps; const T: any = tablesOf(sc);
const E0: any = new GfEval(T); E0.tipSink = () => 0;
const ES: any = new GfEval(T); ES.tipSink = (c: number, s: number) => {
  if (T.cClosed[c] === 1) return 0; const v0 = T.cV0[c];
  return s <= T.vs[v0] || s >= T.vs[v0 + T.cNV[c] - 1] ? 10 * T.zt : 0;
};
const vars: [string, any, number][] = [["nosink", E0, 1], ["step", ES, 1]];
const ss = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
for (const t of ts.split(",")) { const E: any = new GfEval(T); E.tipSink = (c: number, s: number) => {
  if (T.cClosed[c] === 1) return 0; const v0 = T.cV0[c]; const e = Math.min(s - T.vs[v0], T.vs[v0 + T.cNV[c] - 1] - s);
  return 10 * T.zt * (1 - ss(0, +t * T.h, e)); }; vars.push([`taper${t}`, E, +t]); }
vars.push(["src", new GfEval(T), 0]);
const n = Math.round(2 * H * P); const out: any = { n, X, Y, H, P, v: {} };
for (const [nm, E] of vars) {
  const ink: number[] = [], cov: number[] = [], ch: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const q = E.eval(X - H + (i + 0.5) / P, Y - H + (j + 0.5) / P); ink.push(+q.ink.toFixed(3)); cov.push(+q.cov.toFixed(3)); ch.push(q.chain);
  }
  out.v[nm] = { ink, cov, ch };
}
writeFileSync(op, JSON.stringify(out));

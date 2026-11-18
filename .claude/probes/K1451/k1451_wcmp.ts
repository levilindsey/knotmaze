// K1451 s2: src's per-pin key windows (tables.ts pinReach, a tandem walk) against the probe's brute force
// (k1451_sev.ts reach mode, wk 1.15). Compares the EFFECTIVE window (each side cut at the pin gap, as depth() uses it).
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_wcmp.ts [scene,...]
import { tablesOf } from "../K1433/k1433_lib.ts";
const all = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const sc = process.argv[2] ? process.argv[2].split(",") : all;
const wk = 1.15;
let totP = 0, totD = 0;
for (const nm of sc) {
  const T = tablesOf(nm);
  const at = (c: number, s: number): number[] => {
    const v0 = T.cV0[c], nv = T.cNV[c]; const s0 = T.vs[v0], len = T.cLen[c]; let u = s;
    if (T.cClosed[c]) { u = (s - s0) % len; if (u < 0) u += len; u += s0; }
    let lo = v0, hi = v0 + nv - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.vs[m] <= u) lo = m; else hi = m; }
    const l = T.vs[lo + 1] - T.vs[lo]; const t = l > 0 ? Math.min(1, Math.max(0, (u - T.vs[lo]) / l)) : 0;
    const dx = T.vx[lo + 1] - T.vx[lo], dy = T.vy[lo + 1] - T.vy[lo]; const dl = Math.hypot(dx, dy) || 1;
    return [T.vx[lo] + dx * t, T.vy[lo] + dy * t, dx / dl, dy / dl];
  };
  const nP = T.pinS.length; const P: number[][] = new Array(nP); const pc = new Int32Array(nP);
  for (let c = 0; c < T.nC; c++) for (let i = 0; i < T.cPinN[c]; i++) { const b = T.cPin0[c] + i; pc[b] = c; P[b] = at(c, T.pinS[b]); }
  const pw = new Float64Array(nP).fill(T.win); const pwR = new Float64Array(nP).fill(T.win);
  const distTo = (c: number, sc2: number, x: number, y: number, span: number): number => {
    let bd = Infinity; for (let t = -span; t <= span; t += 0.05 * T.h) { const q = at(c, sc2 + t); const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) bd = d; } return bd;
  };
  for (let a = 0; a < nP; a++) {
    let best = -1, bd = T.h;
    for (let b = 0; b < nP; b++) { if (b === a) continue; const d = Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]); if (d < bd && T.pinZ[a] * T.pinZ[b] < 0) { bd = d; best = b; } }
    if (best < 0) continue;
    for (const dir of [-1, 1]) {
      let r = 0; const cap = 10 * T.h;
      for (let t = 0.1 * T.h; t <= cap; t += 0.1 * T.h) { const q = at(pc[a], T.pinS[a] + dir * t); if (distTo(pc[best], T.pinS[best], q[0], q[1], cap + 2 * T.h) > 2 * T.h) break; r = t; }
      const wv = Math.max(T.win, wk * r); if (dir < 0) pw[a] = wv; else pwR[a] = wv;
    }
  }
  // effective windows: cut at the gap to the neighbouring pin on that side
  let nd = 0, mx = 0; const rows: string[] = [];
  for (let c = 0; c < T.nC; c++) {
    const n = T.cPinN[c], b = T.cPin0[c], len = T.cLen[c], cl = T.cClosed[c] === 1;
    for (let i = 0; i < n; i++) {
      let gL = Infinity, gR = Infinity;
      if (cl) { gL = n > 1 ? T.pinS[b + i] - T.pinS[b + (i + n - 1) % n] : len; if (gL <= 0) gL += len; gR = n > 1 ? T.pinS[b + (i + 1) % n] - T.pinS[b + i] : len; if (gR <= 0) gR += len; }
      else { if (i > 0) gL = T.pinS[b + i] - T.pinS[b + i - 1]; if (i + 1 < n) gR = T.pinS[b + i + 1] - T.pinS[b + i]; }
      const q = b + i;
      for (const [side, ps, ss, g] of [["L", pw[q], T.pinWL[q], gL], ["R", pwR[q], T.pinWR[q], gR]] as [string, number, number, number][]) {
        const ep = Math.min(ps, g), es = Math.min(ss, g); const d = Math.abs(ep - es);
        const near = process.env.NEAR ? process.env.NEAR.split(",").map(Number) : null; const okN = !near || Math.hypot(P[q][0] - near[0], P[q][1] - near[1]) < near[2];
        if (d > 0.02 * T.h && okN) { nd++; rows.push(`  c${c} pin${i} s=${T.pinS[q].toFixed(3)} @(${P[q][0].toFixed(2)},${P[q][1].toFixed(2)}) ${T.pinZ[q] > 0 ? "over" : "under"} ${side} probe ${ep.toFixed(3)} src ${es.toFixed(3)} gap ${g.toFixed(3)}`); }
        if (d > mx) mx = d;
      }
    }
  }
  totP += 2 * nP; totD += nd;
  console.log(`${nm}\tpins ${nP}\tsides differing > 0.02h: ${nd}\tmax |d| ${(mx / T.h).toFixed(3)} h\twidened src ${Array.from(T.pinWL).filter((x: number) => x > T.win).length}+${Array.from(T.pinWR).filter((x: number) => x > T.win).length}`);
  for (const r of rows.slice(0, 12)) console.log(r);
}
console.log(`total sides ${totP} differing ${totD}`);

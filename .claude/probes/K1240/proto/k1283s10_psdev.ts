// K1283 s10: per strip border-row column, the ps s against footS (the s9 foot, every column): distribution and worst.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s10_psdev.ts [scene]
import * as O from "./outline";
import * as F from "./fill_tri";
import { loadScene } from "./k1279_census";
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "muse_hash";
const scene = loadScene(name);
const st = O.structure(scene); const t = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, t));
F.footDbg.on = true; F.footDbg.rows.length = 0; const band = process.argv.find((a) => a.startsWith("--band="))?.slice(7).split(",").map(Number); if (band) F.psBand(band[0], band[1]); F.psCnt.foot = 0; F.psCnt.cols = 0;
F.fillFrame(fs, st, t, scene);
const R = F.footDbg.rows; const K = 9; const n = R.length / K;
const ds: number[] = []; const worst: number[] = [];
for (let q = 0; q < n; q++) { const d = Math.abs(R[q * K + 3] - R[q * K + 2]); ds.push(d === d ? d : 0); }
const srt = [...ds].sort((a, b) => a - b);
const cnt = (e: number): number => ds.filter((d) => d > e).length;
console.log(`feet ${F.psCnt.foot} of ${F.psCnt.cols} columns`); console.log(`${name}: ${n} columns; |ps - foot| p50 ${srt[n >> 1].toExponential(2)} p90 ${srt[Math.floor(n * 0.9)].toExponential(2)} p99 ${srt[Math.floor(n * 0.99)].toExponential(2)} max ${srt[n - 1].toFixed(4)}; > 1e-3 ${cnt(1e-3)}, > 1e-2 ${cnt(1e-2)}, > 0.05 ${cnt(0.05)}`);
const idx = ds.map((d, q) => [d, q]).sort((a, b) => b[0] - a[0]).slice(0, 14);
for (const [d, q] of idx) { const o = q * K; const p = t.pieces[R[o + 4] === 0 ? R[o + 7] : R[o + 8]]; console.log(`  (${R[o].toFixed(2)}, ${R[o + 1].toFixed(2)}) ps ${R[o + 2].toFixed(3)} foot ${R[o + 3].toFixed(3)} d ${d.toFixed(3)} row ${R[o + 4]} col ${R[o + 5]}/${R[o + 6]} piece ${p?.kind} m ${p ? p.pts.length / 2 : -1}`); void worst; }import { zChains } from "./draw";
{
  const zz = zChains(scene).zc;
  const at = (c: (typeof zz)[number], s0: number): [number, number] => {
    let s = s0; if (c.closed && c.len > 0) s = ((s % c.len) + c.len) % c.len;
    let lo = 0; let hi = c.n - 1; while (hi > lo) { const m = (lo + hi + 1) >> 1; if (c.s[m] <= s) lo = m; else hi = m - 1; }
    const j = lo + 1 < c.n ? lo + 1 : c.closed ? 0 : lo; const l = (j === 0 ? c.len : c.s[j]) - c.s[lo]; const u = l > 0 ? Math.min(1, Math.max(0, (s - c.s[lo]) / l)) : 0;
    return [c.xs[lo] + (c.xs[j] - c.xs[lo]) * u, c.ys[lo] + (c.ys[j] - c.ys[lo]) * u];
  };
  let tie = 0; let worse = 0; let worseBig = 0; let endish = 0; const hW = scene.look.halfWidth;
  const hist: Record<string, number> = {};
  for (let q = 0; q < n; q++) {
    const o = q * K; if (!(ds[q] > 1e-2)) continue;
    const p = t.pieces[R[o + 4] === 0 ? R[o + 7] : R[o + 8]]; const c = zz[p.chain];
    const a = at(c, R[o + 2]); const b = at(c, R[o + 3]);
    const dP = Math.hypot(R[o] - a[0], R[o + 1] - a[1]); const dF = Math.hypot(R[o] - b[0], R[o + 1] - b[1]);
    if (dP - dF < 1e-4) tie++; else { worse++; if (dP - dF > 1e-2) worseBig++; }
    const fr = R[o + 5] / R[o + 6]; if (fr < 0.1 || fr > 0.9) endish++;
    const key = `dP/hW ${(Math.round((dP / hW) * 10) / 10).toFixed(1)}`; hist[key] = (hist[key] ?? 0) + 1;
  }
  console.log(`of ${cnt(1e-2)} over 1e-2: ties ${tie}, ps farther ${worse} (by > 1e-2: ${worseBig}); in the end 10% ${endish}`);
  console.log(Object.entries(hist).sort().map(([k, v]) => `${k}: ${v}`).join(", "));
}
{
  // one row with many columns over 1e-2: its signed deviation along the row
  let best = -1; let bc = 0;
  for (let q = 0; q < n; q++) { const o = q * K; if (R[o + 5] !== 0) continue; let c2 = 0; const N2 = R[o + 6]; for (let i = 0; i <= N2 && q + i < n; i++) if (ds[q + i] > 1e-2) c2++; if (c2 > bc && N2 > 30) { bc = c2; best = q; } }
  if (best >= 0) { const o = best * K; const N2 = R[o + 6]; const p = t.pieces[R[o + 4] === 0 ? R[o + 7] : R[o + 8]]; const line: string[] = [];
    for (let i = 0; i <= N2; i += Math.max(1, Math.floor(N2 / 16))) { const r = (best + i) * K; line.push(`${i}:${(R[r + 3] - R[r + 2]).toFixed(3)}`); }
    console.log(`row ${R[o + 4]} N ${N2} chain ${p.chain} s ${R[o + 2].toFixed(2)}.. over ${bc}: ${line.join(" ")}`); }
}
{
  const zz = zChains(scene).zc; const errs: number[] = []; let worstS = "";  let wv = 0;
  const at = (c: (typeof zz)[number], s0: number): [number, number] => {
    let s = s0; if (c.closed && c.len > 0) s = ((s % c.len) + c.len) % c.len;
    let lo = 0; let hi = c.n - 1; while (hi > lo) { const m = (lo + hi + 1) >> 1; if (c.s[m] <= s) lo = m; else hi = m - 1; }
    const j = lo + 1 < c.n ? lo + 1 : c.closed ? 0 : lo; const l = (j === 0 ? c.len : c.s[j]) - c.s[lo]; const u = l > 0 ? Math.min(1, Math.max(0, (s - c.s[lo]) / l)) : 0;
    return [c.xs[lo] + (c.xs[j] - c.xs[lo]) * u, c.ys[lo] + (c.ys[j] - c.ys[lo]) * u];
  };
  for (const p of t.pieces) { if (!p.ps) continue; const c = zz[p.chain]; for (let k = 0; k < p.ps.length; k++) { const a = at(c, p.ps[k]); const e = Math.hypot(a[0] - p.cpts[2 * k], a[1] - p.cpts[2 * k + 1]); errs.push(e); if (e > wv) { wv = e; worstS = `chain ${p.chain} s ${p.ps[k].toFixed(3)} len ${c.len.toFixed(3)} closed ${c.closed} cpt (${p.cpts[2 * k].toFixed(3)}, ${p.cpts[2 * k + 1].toFixed(3)}) at (${a[0].toFixed(3)}, ${a[1].toFixed(3)})`; } } }
  errs.sort((a, b) => a - b); const m = errs.length;
  console.log(`|cpts - zc(ps)| over ${m} piece points: p50 ${errs[m >> 1].toExponential(2)} p90 ${errs[Math.floor(m * 0.9)].toExponential(2)} p99 ${errs[Math.floor(m * 0.99)].toExponential(2)} max ${wv.toFixed(4)}; > 1e-3 ${errs.filter((e) => e > 1e-3).length}; worst ${worstS}`);
}
{
  const at0 = process.argv.find((a) => a.startsWith("--at="))?.slice(5).split(",").map(Number);
  if (at0) {
    const zz = zChains(scene).zc;
    const rows: string[] = [];
    for (let q = 0; q < n; q++) { const o = q * K; if (Math.hypot(R[o] - at0[0], R[o + 1] - at0[1]) > at0[2]) continue;
      const p = t.pieces[R[o + 4] === 0 ? R[o + 7] : R[o + 8]];
      rows.push(`(${R[o].toFixed(3)}, ${R[o + 1].toFixed(3)}) row ${R[o + 4]} col ${R[o + 5]}/${R[o + 6]} ps ${R[o + 2].toFixed(3)} foot ${R[o + 3].toFixed(3)} piece ${R[o + 4] === 0 ? R[o + 7] : R[o + 8]} ch ${p.chain} m ${p.pts.length / 2} len ${zz[p.chain].len.toFixed(2)}`); }
    console.log(rows.slice(0, 16).join("\n"));
  }
}

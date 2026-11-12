// K1247 s27 (K1327): a record side's span (chain_frame spanOf, float64) against rec_glsl's recSpan in
// float32 (each op rounded), for the strips the GPU check flags: k, V2 and the samples at the span's ends.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s27_span.ts <sceneFile> <o>[,<o>...] [--all]
// --all: every record side of every strip, counting the ones whose k or V2 differ.
import { readFileSync } from "node:fs";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { REC_TEXELS, fillFrame, fillResolution, fillStructure, recStrips, type StripItem } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";

import { COL_EPS, SPAN_EPS } from "../../../src/render/outline/chain_frame";
const F = Math.fround; const E = SPAN_EPS; const E32 = F(SPAN_EPS);
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const all = process.argv.includes("--all");
const sc0 = JSON.parse(readFileSync(args[0], "utf8")) as SceneIn; (sc0.look as { ctrlArc?: number }).ctrlArc ??= 0.47; delete (sc0.look as { fillRec?: number }).fillRec;
const st = structure(sc0);
const fs = fillStructure(st, fillResolution(st, frame(st, sc0)));
const strips = recStrips(fs);
const sc = alignJunctionArms(st, sc0); const tb = frame(st, sc); const zz = zChains(sc);
const b = fillFrame(fs, st, tb, { ...sc, look: { ...sc.look, fillRec: 2 } }, zz);
const T = b.rec!.strip;
type C = { closed: boolean; len: number; s: Float64Array; n: number };
const span64 = (c: C, sA: number, dS: number): number[] => {
  const n = c.n; const m = n - 1; const loop = c.closed && c.len > 0; const L = c.len; const ss = c.s;
  let a = sA; let base = 0;
  if (loop) { const w = ((a % L) + L) % L; base = a - w; a = w; } else a = a < 0 ? 0 : a > ss[m] ? ss[m] : a;
  const sB = (loop ? sA + dS : Math.min(Math.max(sA + dS, 0), ss[m])) - base;
  let k: number;
  if (a + E >= ss[m]) k = loop ? m : m - 1;
  else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= a + E) lo = q; else hi = q; } k = lo; }
  const sOfV = (V: number): number => { const q = Math.floor(V / n); return ss[V - q * n] + q * L; };
  const lim = sB - E; let lo = k; let hi = loop ? k + 1 + n * (Math.floor(Math.max(0, sB) / L) + 2) : m;
  while (hi - lo > 1) { const q = (lo + hi) >> 1; if (sOfV(q) < lim) lo = q; else hi = q; }
  return [a, sB, k, lo];
};
const span32 = (c: C, sA: number, dS: number): number[] => {
  const n = c.n; const m = n - 1; const L = F(c.closed && c.len > 0 ? c.len : 0); const ss = (i: number): number => F(c.s[i]);
  const sm = ss(m); let a: number; let base = 0;
  if (L > 0) { a = F(sA - F(L * Math.floor(F(sA / L)))); base = F(sA - a); } else a = Math.min(Math.max(sA, 0), sm);
  const sB = F((L > 0 ? F(sA + dS) : Math.min(Math.max(F(sA + dS), 0), sm)) - base);
  let k: number;
  if (F(a + E32) >= sm) k = L > 0 ? m : m - 1;
  else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss(q) <= F(a + E32)) lo = q; else hi = q; } k = lo; }
  const sv = (V: number): number => { const q = Math.trunc(V / n); return F(ss(V - q * n) + (q > 0 ? F(q * L) : 0)); };
  let lo = k; let hi = L > 0 ? k + 1 + n * (Math.floor(Math.max(0, sB) / L) + 2) : m;
  while (hi - lo > 1) { const q = (lo + hi) >> 1; if (sv(q) < F(sB - E32)) lo = q; else hi = q; }
  return [a, sB, k, lo];
};
const want = all ? strips.map((_, o) => o) : args[1].split(",").map(Number);
let nDiff = 0; let nSide = 0;
for (const o of want) {
  const q = 4 * REC_TEXELS * o; if (T[q + 7] < 0.5) continue;
  const it = fs.items[strips[o]] as StripItem; const c = zz.zc[T[q + 8]] as unknown as C;
  for (const [nm, sA, dS] of [["L", T[q], T[q + 1]], ["R", T[q + 2], T[q + 3]]] as [string, number, number][]) {
    nSide++;
    const p = span64(c, sA, dS); const g = span32(c, sA, dS);
    const diff = p[2] !== g[2] || p[3] !== g[3];
    if (diff) nDiff++;
    if (!all || (diff && nDiff <= 12)) {
      const n = c.n; const sAt = (V: number): number => c.s[V % n] + Math.floor(V / n) * c.len;
      console.log(`o${o} item ${strips[o]} c${it.pi} ${nm} sA ${sA} dS ${dS} | f64 a ${p[0].toFixed(7)} sB ${p[1].toFixed(7)} k ${p[2]} V2 ${p[3]} | f32 k ${g[2]} V2 ${g[3]}${diff ? " DIFF" : ""}` +
        ` | s(k) ${sAt(p[2]).toFixed(7)} s(k+1) ${sAt(p[2] + 1).toFixed(7)} s(V2) ${sAt(p[3]).toFixed(7)} s(V2+1) ${sAt(p[3] + 1).toFixed(7)}`);
    }
  }
}
console.log(`${nSide} record sides, ${nDiff} with k or V2 differing (f64 spanOf vs f32 recSpan)`);

// --ties=<o>: on that strip's sides, the column rounding cs(V) = floor((s(V) - a) B / S + 0.5) + pf: the V whose
// (s(V) - a) B / S + 0.5 sits within 1e-3 of an integer (float32 can round those either way).
const tArg = process.argv.find((x) => x.startsWith("--ties="));
if (tArg) {
  const o = Number(tArg.slice(7)); const q = 4 * REC_TEXELS * o; const N = T[q + 9]; const pf = b.rec!.pf!;
  const ci = T[q + 8]; const c = zz.zc[ci] as unknown as C; let ob = 0; for (let k = 0; k < ci; k++) ob += zz.zc[k].n;
  const n = c.n; const sOfV = (V: number): number => c.s[V % n] + Math.floor(V / n) * c.len;
  const pfU = (V: number): number => (V < 0 ? 0 : pf[ob + (V % n)] + Math.floor(V / n) * pf[ob + n - 1]);
  for (const [nm, sA, dS] of [["L", T[q], T[q + 1]], ["R", T[q + 2], T[q + 3]]] as [string, number, number][]) {
    const [a, sB, k, V2] = span64(c, sA, dS); const S = sB - a; const p0 = pfU(k); const B = N - (pfU(V2) - p0);
    console.log(`o${o} ${nm} N ${N} a ${a} sB ${sB} k ${k} V2 ${V2} B ${B} S ${S}`);
    for (let V = k + 1; V <= V2; V++) {
      const x = ((sOfV(V) - a) * B) / S + 0.5 + COL_EPS; const fr = x - Math.floor(x);
      const x32 = F(F(F(F(F(F(sOfV(V)) - F(a)) * B) / F(S)) + 0.5) + E32 * 5);
      if (fr < 2e-4 || fr > 1 - 2e-4) console.log(`  V ${V} x ${x.toFixed(8)} f32 ${x32.toFixed(8)} pf ${pfU(V) - pfU(V - 1)}`);
    }
  }
}

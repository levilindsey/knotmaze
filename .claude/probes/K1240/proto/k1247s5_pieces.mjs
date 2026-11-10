// K1247 s5: how many medial-path pieces does a corner's growth cross? The
// sizing study for an analytic growth (the brief's next stage). Writes
// outline_pieces.ts (scratch, never committed): outline.ts plus counters.
//   node .claude/probes/K1240/proto/k1247s5_pieces.mjs
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s5_pieces.ts [--scene=def]
// Per grown corner, over its nodes in rho order: the foot states (segment k
// on each arm, and whether the foot sits on a vertex), the state changes,
// and the segments each foot crosses (a lower bound on the pieces is the
// state changes + 1; each crossed vertex adds at most two pieces, a vertex
// piece and the next segment). Per margin call: whether it is 0, in the
// band ss01 reads (-0.05 h, 0), or cut; and the half-plane walks' lengths.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
let t = readFileSync(join(here, "outline.ts"), "utf8").replace(/\r\n/g, "\n");
const rep = (a, b, n = 1) => { const c = t.split(a).length - 1; if (c !== n) throw new Error(`${c} x (want ${n}): ${a}`); t = t.split(a).join(b); };
rep("  C.nodeN[ci] = growNN;\n", "  C.nodeN[ci] = growNN; pieceStat(C, growNN, integ / r0);\n");
rep("function marginOfC(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {\n", "function marginOfC(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {\n  pcStats.mCalls++;\n");
rep("      scr[nW++] = dotF;\n", "      scr[nW++] = dotF; pcStats.walkSegs++;\n");
rep("      scr[nW++] = dotB;\n", "      scr[nW++] = dotB; pcStats.walkSegs++;\n");
rep("  return d2 - dc;\n}\nfunction wOfC(", "  if (d2 < dc) { pcStats.mNonZero++; if (d2 - dc > -0.05 * h) pcStats.mBand++; }\n  return d2 - dc;\n}\nfunction wOfC(");
rep("  const mA = marginOfC(C, kfCst.aiA, kfQa, kfCst.wCacheA);\n", "  pcStats.wToMargin++;\n  const mA = marginOfC(C, kfCst.aiA, kfQa, kfCst.wCacheA);\n");
rep("function wOfC(C: FCache): number {\n", "function wOfC(C: FCache): number {\n  pcStats.wCalls++;\n");
t += `
export const pcStats = { corners: 0, nodes: 0, changes: 0, changesMax: 0, span: 0, spanMax: 0, vtxNodes: 0, wCalls: 0, wToMargin: 0, mCalls: 0, mNonZero: 0, mBand: 0, walkSegs: 0, hist: [0, 0, 0, 0, 0, 0], frac: [0, 0, 0, 0, 0] };
export function resetPc(): void { for (const k of Object.keys(pcStats) as (keyof typeof pcStats)[]) if (k !== "hist" && k !== "frac") (pcStats as Record<string, number | number[]>)[k] = 0; pcStats.hist.fill(0); pcStats.frac.fill(0); }
// fr: the corner's integral over r0 (1 = w was 1 along the whole path).
function pieceStat(C: FCache, n: number, fr: number): void {
  if (n < 1) return;
  pcStats.frac[fr >= 1 - 1e-12 ? 0 : fr >= 0.9 ? 1 : fr >= 0.5 ? 2 : fr > 0 ? 3 : 4]++;
  const idx: number[] = []; for (let i = 0; i < n; i++) idx.push(i);
  idx.sort((a, b) => nodeRho[a] - nodeRho[b]);
  const pa = C.polys[kfCst.A.pi]; const pb = C.polys[kfCst.B.pi];
  const onV = (p: Poly, k: number, s: number): number => { if (k < 0 || k >= p.nseg || !(p.segLen[k] > 0)) return 1; const u = (normS(p, s) - p.s[k]) / p.segLen[k]; return u < 1e-7 || u > 1 - 1e-7 ? 1 : 0; };
  const cyc = (p: Poly, a: number, b: number): number => { const d = Math.abs(a - b); return p.closed ? Math.min(d, p.nseg - d) : d; };
  let prev = ""; let ch = 0; let span = 0; let pka = -1; let pkb = -1;
  for (const i of idx) {
    const o = i * 12; const ka = nodeScratchK[2 * i]; const kb = nodeScratchK[2 * i + 1];
    const va = onV(pa, ka, nodeScratch[o + 5]); const vb = onV(pb, kb, nodeScratch[o + 10]);
    if (va || vb) pcStats.vtxNodes++;
    const key = ka + "|" + va + "|" + kb + "|" + vb;
    if (prev && key !== prev) ch++;
    if (pka >= 0) span += cyc(pa, pka, ka) + cyc(pb, pkb, kb);
    prev = key; pka = ka; pkb = kb;
  }
  pcStats.corners++; pcStats.nodes += n; pcStats.changes += ch; pcStats.span += span;
  if (ch > pcStats.changesMax) pcStats.changesMax = ch; if (span > pcStats.spanMax) pcStats.spanMax = span;
  pcStats.hist[span === 0 ? 0 : span === 1 ? 1 : span === 2 ? 2 : span <= 4 ? 3 : span <= 8 ? 4 : 5]++;
}
`;
writeFileSync(join(here, "outline_pieces.ts"), t);
console.log("wrote outline_pieces.ts");

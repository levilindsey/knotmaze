// K1247 s4: write outline_st.ts, an instrumented copy of outline.ts for the
// corner-solve statistics (k1247s4_stats.ts). Scratch: outline_st.ts is
// regenerated on every run and never committed.
//   node .claude/probes/K1240/proto/k1247s4_mkstats.mjs [src.ts]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] ?? "outline.ts";
let t = readFileSync(join(here, src), "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => { if (!t.includes(a)) throw new Error("missing: " + a.slice(0, 80)); t = t.replace(a, b); };
t = `const __K4 = ((globalThis as any).__k4 ??= { c: {} as Record<string, number>, t: {} as Record<string, number>, corners: [] as any[], on: false });\n` +
  `function __c(k: string, n = 1): void { if (__K4.on) __K4.c[k] = (__K4.c[k] ?? 0) + n; }\n` + t;
rep("function footNearM(C: FCache, arm: FArm, out: FFoot): void {", "function footNearM(C: FCache, arm: FArm, out: FFoot): void {\n  __c('footNearM');");
rep("function marginOfC(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {", "function marginOfC(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {\n  __c('marginOfC');");
rep("      if (dotF < 0) { hi = sv;", "      __c('walkF'); if (dotF < 0) { hi = sv;");
rep("      if (dotB > 0) { lo = sv;", "      __c('walkB'); if (dotB > 0) { lo = sv;");
rep("  if (lo > winLo) { {", "  if (lo > winLo) { __c('mfwLo'); {");
rep("  if (hi < winHi && d2 > stopAt) { {", "  if (hi < winHi && d2 > stopAt) { __c('mfwHi'); {");
rep("function advanceToC(C: FCache, rhoT: number): void {", "function advanceToC(C: FCache, rhoT: number): void {\n  __c('advance');");
rep("function wOfC(C: FCache): number {", "function wOfC(C: FCache): number {\n  __c('wOfC');");
rep("  const mA = marginOfC(C, kfCst.aiA, kfQa, kfCst.wCacheA);", "  __c('wMargins'); const mA = marginOfC(C, kfCst.aiA, kfQa, kfCst.wCacheA);");
rep("  if (fSteep === 0) return 0;", "  if (fSteep < 1) __c('fSteep<1'); if (fSteep === 0) return 0;");
rep("  if (fSlack === 0) return 0;", "  if (fSlack < 1) __c('fSlack<1'); if (fSlack === 0) return 0;");
rep("  if (fRootA === 0) return 0;", "  if (fRootA < 1) __c('fRootA<1'); if (fRootA === 0) return 0;");
rep("  if (fRootB === 0) return 0;", "  if (fRootB < 1) __c('fRootB<1'); if (fRootB === 0) return 0;");
rep("  if (mA <= -0.05 * h) return 0;", "  if (mA < 0) __c('mA<0'); if (mA < 1e300) __c('mAfinite'); if (mA <= -0.05 * h) return 0;");
rep("  if (mB <= -0.05 * h) return 0;", "  if (mB < 0) __c('mB<0'); if (mB < 1e300) __c('mBfinite'); if (mB <= -0.05 * h) return 0;");
rep("    for (let it = 0; it < 128; it++) {\n      const lo = Math.max(winLo, sv - w);", "    for (let it = 0; it < 128; it++) {\n      __c('fnIter'); const lo = Math.max(winLo, sv - w);");
rep("      for (let dk = covered ? 3 : -2; dk <= 2; dk++) {", "      if (covered) __c('fnCovered'); for (let dk = covered ? 3 : -2; dk <= 2; dk++) {");
rep("    if (full) {\n      if (cache.fSm.length", "    if (full) { __c('fullF');\n      if (cache.fSm.length");
rep("    if (full) {\n      if (cache.bSm.length", "    if (full) { __c('fullB');\n      if (cache.bSm.length");
rep("  let sPrev = wOfC(C);\n  let integ = 0;", "  let sPrev = wOfC(C); const __sq: number[] = [sPrev];\n  let integ = 0;");
rep("    sPrev = sK;\n  }", "    sPrev = sK; __sq.push(sK);\n  }");
// Per-corner record from growIntegC.
rep("  C.nodeN[ci] = nNodes;\n  const k0", "  C.nodeN[ci] = nNodes;\n  if (__K4.on) __K4.corners.push({ ci, r0: kfCst.r0 / C.h, nNodes, integ: integ / kfCst.r0, wEnd: sPrev, sq: __sq, h: C.h });\n  const k0");
// Timers.
rep("    let solveCode = trySolve(ci);", "    const __t0 = performance.now(); let solveCode = trySolve(ci); if (__K4.on) __K4.t.solve = (__K4.t.solve ?? 0) + performance.now() - __t0;");
rep("    const r = growIntegC(C, ci);", "    const __t1 = performance.now(); const r = growIntegC(C, ci); if (__K4.on) __K4.t.grow = (__K4.t.grow ?? 0) + performance.now() - __t1;");
rep("      cornerFallbackC(C, st, scene, ci, aiA, aiB, sideA, sideB, th);\n      continue;\n    }\n    const Vx", "      __c('fallback:' + solveCode); cornerFallbackC(C, st, scene, ci, aiA, aiB, sideA, sideB, th);\n      continue;\n    }\n    const Vx");
writeFileSync(join(here, "outline_st.ts"), t);
console.log("wrote outline_st.ts from " + src);

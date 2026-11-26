// K1584 s7: the gap table (GfGapTable.values) of one capture under three bakes, diffed slot by slot:
//   s6 = GF_SRC6's src (stage 6, HEAD's export from mkver.ps1), K = this worktree's src without jointPartners (rule K
//   alone: the corner rule needs the partners), s7 = this worktree's src with them (both rules).
// Each run of changed slots on a chain is one place: its under chain, the slot's over chain (s6 / s7), its sample
// range and arcs, the crossing whose window that is (the nearest crossing with that under and over), the rule that
// changed it (K: s6 -> K; C: K -> s7) and its device position (the run's middle sample, sites_gf.json's toDevA).
//   npx tsx tabdiff.ts <capDir> <out.json>        (env GF_SRC6 = out/v_s6)
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const S7 = resolve(import.meta.dirname, "../../../..");
// s7b: env GF_SRCP (a src copy, s7b/mkpad.ps1) replaces s6 with that build, both rules on: rule "K" = GF_SRCP -> s7
const SP = process.env.GF_SRCP;
const S6 = SP ?? process.env.GF_SRC6 ?? join(import.meta.dirname, "out/v_s6");
const L7 = await import(pathToFileURL(join(S7, "src/render/gpu_field/gf_look.ts")).href);
const L6 = await import(pathToFileURL(join(S6, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(S7, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(S7, "src/render/gpu_field/gf_build.ts")).href);
const { kArcOfCtrl } = await import(pathToFileURL(join(S7, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, op] = process.argv;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const h = G.style.threadWidth / 2, margin = L7.lookGap(G), fade = L7.lookFade(G);
const bake = (L: any, partners: boolean): Float32Array => {
  const JL = new Map<number, number[]>(), JP = new Map<number, number[]>();
  const src: any = {
    kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h, margin, fade,
    joints: G.junctionArcCtrls, jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin),
    jointArcs: L.gfJointArcs(T, JL, JP), jointLats: JL,
  };
  if (partners) src.jointPartners = JP;
  const tab = new L.GfGapTable();
  return Float32Array.from(tab.values(src));
};
// stage 6's right code rides x at half scale (code / 2048), s7's at quarter scale ((code + GAP_FAR_OFF) / 4096): put
// s6's on s7's scale, so an unchanged slot compares (and decodes) the same
const norm = (V: Float32Array): Float32Array => { for (let i = 1; i < V.length; i += 4) if (V[i] >= 0) { const c = Math.floor(V[i]); V[i] = c + Math.round((V[i] - c) * 2048) / 4096; } return V; };
const V6 = SP ? bake(L6, true) : norm(bake(L6, false)), VK = bake(L7, !!SP), V7 = bake(L7, true);
// the table's per chain base (positions()'s layout: raw count + 1 a closed chain)
const base: number[] = [], cnt: number[] = [];
{ let pb = 0; for (let c = 0; c < G.chainSamples.length; c++) { base.push(pb); const sm = G.chainSamples[c]; const n = sm && sm.count >= 1 && G.kcv[c] && G.kcv[c].nCtrl >= 1 ? sm.count + (G.kcv[c].closed ? 1 : 0) : 0; cnt.push(n); pb += n; } }
const xs = G.crossings.map((x: any, i: number) => ({ i, u: x.underChain, o: x.overChain, uC: kArcOfCtrl(G.kd, G.kcv[x.underChain], x.underCtrl) }));
const pmod = (a: number, n: number) => ((a % n) + n) % n;
const dev = (c: number, k: number): number[] => { const sm = G.chainSamples[c]; const kk = Math.min(k, sm.count - 1); const x = sm.positions[2 * kk], y = sm.positions[2 * kk + 1]; return [Math.round(x * A[0] + A[4]), Math.round(y * A[3] + A[5])]; };
const places: any[] = [];
const diffRuns = (Va: Float32Array, Vb: Float32Array, rule: string): void => {
  for (let c = 0; c < cnt.length; c++) {
    const n = cnt[c]; if (!n) continue;
    const S = G.kcv[c], tot = G.kd.geom[S.geom * 4], arcPer = G.kd.geom[S.geom * 4 + 1];
    let k = 0;
    while (k < n) {
      const j = 4 * (base[c] + k);
      let same = true; for (let q = 0; q < 4; q++) if (!(Va[j + q] === Vb[j + q] || (Number.isNaN(Va[j + q]) && Number.isNaN(Vb[j + q])))) same = false;
      if (same) { k++; continue; }
      const k0 = k; const ovA = new Set<number>(), ovB = new Set<number>();
      while (k < n) {
        const jj = 4 * (base[c] + k);
        let s2 = true; for (let q = 0; q < 4; q++) if (!(Va[jj + q] === Vb[jj + q] || (Number.isNaN(Va[jj + q]) && Number.isNaN(Vb[jj + q])))) s2 = false;
        if (s2) break;
        if (Va[jj + 1] >= 0) ovA.add(Math.floor(Va[jj + 1] + 1e-6));
        if (Vb[jj + 1] >= 0) ovB.add(Math.floor(Vb[jj + 1] + 1e-6));
        k++;
      }
      const k1 = k - 1, km = Math.round((k0 + k1) / 2), arc = km * arcPer;
      const ov = [...new Set([...ovA, ...ovB])];
      let best: any = null;
      for (const x of xs) {
        if (x.u !== c || (ov.length && !ov.includes(x.o))) continue;
        let off = arc - x.uC; if (S.closed) { off = pmod(off, tot); if (off > tot / 2) off -= tot; }
        if (!best || Math.abs(off) < Math.abs(best.off)) best = { i: x.i, o: x.o, off: +off.toFixed(3) };
      }
      places.push({ rule, c, k0, k1, a0: +(k0 * arcPer).toFixed(3), a1: +(k1 * arcPer).toFixed(3), ovA: [...ovA], ovB: [...ovB], x: best, dev: dev(c, km) });
    }
  }
};
diffRuns(V6, VK, "K");
diffRuns(VK, V7, "C");
writeFileSync(op, JSON.stringify({ cap: capDir, n: places.length, nK: places.filter((p) => p.rule === "K").length, nC: places.filter((p) => p.rule === "C").length, places }, null, 0));
console.log(`${capDir.split(/[\\/]/).pop()}: K ${places.filter((p) => p.rule === "K").length} runs, C ${places.filter((p) => p.rule === "C").length} runs`);

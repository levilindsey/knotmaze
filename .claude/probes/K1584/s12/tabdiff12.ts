// K1584 s12: the gap table (GfGapTable.values) of one capture baked by master's src (env GF_SRCM, default out/v_m:
// HEAD's src export) and by this worktree's src, diffed slot by slot. Each run of changed slots on a chain is one
// place: its under chain, sample range and arcs, the nearest crossing with that under and over, its device position
// (the run's middle sample, sites_gf.json's toDevA) and the decoded codes before / after at the run's middle.
//   npx tsx tabdiff12.ts <capDir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const S1 = resolve(import.meta.dirname, "../../../..");
const SM = process.env.GF_SRCM ?? join(import.meta.dirname, "out/v_m");
const L1 = await import(pathToFileURL(join(S1, "src/render/gpu_field/gf_look.ts")).href);
const LM = await import(pathToFileURL(join(SM, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(S1, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(S1, "src/render/gpu_field/gf_build.ts")).href);
const { kArcOfCtrl } = await import(pathToFileURL(join(S1, "src/render/paint_math.ts")).href);
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
const A = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")).toDevA;
const T = withHome(buildTables(scene, { aa: 0.5 / Math.abs(A[0]), kRetry: true }), true);
const h = G.style.threadWidth / 2, margin = L1.lookGap(G), fade = L1.lookFade(G);
const bake = (L: any): Float32Array => {
  const JL = new Map<number, number[]>(), JP = new Map<number, number[]>(), JW = new Map<number, number[]>();
  const ja = L.gfJointArcs(T, JL, JP, JW);
  const src: any = {
    kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h, margin, fade,
    joints: G.junctionArcCtrls, jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin),
    jointArcs: ja, jointLats: JL, jointPartners: JP, jointWedges: JW,
  };
  return Float32Array.from(new L.GfGapTable().values(src));
};
const VM = bake(LM), V1 = bake(L1);
const base: number[] = [], cnt: number[] = [];
{ let pb = 0; for (let c = 0; c < G.chainSamples.length; c++) { base.push(pb); const sm = G.chainSamples[c]; const n = sm && sm.count >= 1 && G.kcv[c] && G.kcv[c].nCtrl >= 1 ? sm.count + (G.kcv[c].closed ? 1 : 0) : 0; cnt.push(n); pb += n; } }
const xs = G.crossings.map((x: any, i: number) => ({ i, u: x.underChain, o: x.overChain, uC: kArcOfCtrl(G.kd, G.kcv[x.underChain], x.underCtrl) }));
const pmod = (a: number, n: number) => ((a % n) + n) % n;
const dev = (c: number, k: number): number[] => { const sm = G.chainSamples[c]; const kk = Math.min(k, sm.count - 1); return [Math.round(sm.positions[2 * kk] * A[0] + A[4]), Math.round(sm.positions[2 * kk + 1] * A[3] + A[5])]; };
// codes: right in x's fraction (quarter scale past the far-off bit), left in z's (/1024); code = fs*32 + ms (0..31)
const codes = (V: Float32Array, j: number): string => {
  const x = V[j + 1], z = V[j + 3]; if (!(x >= 0)) return "-";
  const r = Math.round((x - Math.floor(x)) * 4096) % 1024, l = Math.round((z - Math.floor(z)) * 1024);
  const fmt = (c: number) => `${c % 32}/${Math.floor(c / 32)}`;
  return `L${fmt(l)} R${fmt(r)}${Math.round((x - Math.floor(x)) * 4096) >= 1024 ? " fo" : ""}`;
};
const same = (j: number) => { for (let q = 0; q < 4; q++) if (!(VM[j + q] === V1[j + q] || (Number.isNaN(VM[j + q]) && Number.isNaN(V1[j + q])))) return false; return true; };
const places: any[] = [];
for (let c = 0; c < cnt.length; c++) {
  const n = cnt[c]; if (!n) continue;
  const S = G.kcv[c], tot = G.kd.geom[S.geom * 4], arcPer = G.kd.geom[S.geom * 4 + 1];
  let k = 0;
  while (k < n) {
    if (same(4 * (base[c] + k))) { k++; continue; }
    const k0 = k; const ov = new Set<number>();
    while (k < n && !same(4 * (base[c] + k))) { const jj = 4 * (base[c] + k); for (const V of [VM, V1]) if (V[jj + 1] >= 0) ov.add(Math.floor(V[jj + 1] + 1e-6) % 1024); k++; }
    const k1 = k - 1, km = Math.round((k0 + k1) / 2), arc = km * arcPer;
    let best: any = null;
    for (const x of xs) {
      if (x.u !== c || (ov.size && !ov.has(x.o))) continue;
      let off = arc - x.uC; if (S.closed) { off = pmod(off, tot); if (off > tot / 2) off -= tot; }
      if (!best || Math.abs(off) < Math.abs(best.off)) best = { i: x.i, o: x.o, off: +off.toFixed(3) };
    }
    const jm = 4 * (base[c] + km);
    const devs: number[][] = []; for (let q = k0; q <= k1; q++) devs.push(dev(c, q));
    places.push({ c, k0, k1, a0: +(k0 * arcPer).toFixed(3), a1: +(k1 * arcPer).toFixed(3), x: best, dev: dev(c, km), m: codes(VM, jm), s12: codes(V1, jm), devs });
  }
}
writeFileSync(op, JSON.stringify({ cap: capDir, n: places.length, places }, null, 0));
console.log(`${capDir.split(/[\\/]/).pop()}: ${places.length} runs` + places.map((p) => `\n  c${p.c} k${p.k0}-${p.k1} x${p.x?.i}(o${p.x?.o} off ${p.x?.off}) dev ${p.dev} | ${p.m} -> ${p.s12}`).join(""));

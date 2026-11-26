// K1584 s3: where the baked gap table differs between stage 1's rules (no jointArcs, no tight) and s3's, per under
// sample, with its device position; optional filter to a device point.
//   npx tsx tabdiff.ts <captureDir> [devX devY radius]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, fx, fy, fr] = process.argv;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const ev = new GfEval(T); const fade = L.lookFade(G); ev.fadeLength = fade;
const mem = (c: number, k: number): boolean => {
  if (c < 0 || c >= T.cV0.length) return false;
  const v0 = T.cV0[c]; const pad = T.cClosed[c] !== 1 && T.vs[v0] < 0 ? 1 : 0;
  const m = ev.memberAt(c, T.vs[v0 + Math.min(T.cNV[c] - 1, k + pad)]);
  return m.g >= 0 && m.ramp > 0;
};
const h = G.style.threadWidth / 2, margin = L.lookGap(G);
const mk = (ja: boolean) => ({
  kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h,
  margin, fade, joints: G.junctionArcCtrls,
  jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin), overMember: mem, jointArcs: ja ? L.gfJointArcs(T) : undefined,
});
const V0: Float32Array = new L.GfGapTable().values(mk(false));
const V1: Float32Array = new L.GfGapTable().values(mk(true));
const dev = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
let pb = 0, n = 0;
const rows: string[] = [];
for (let U = 0; U < G.chainSamples.length; U++) {
  const sm = G.chainSamples[U];
  if (!(sm && sm.count >= 1 && G.kcv[U] && G.kcv[U].nCtrl >= 1)) continue;
  const xy = sm.positions; let kv = 0, l = -1;
  for (let k = 0; k < sm.count; k++) {
    if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue;
    const r = pb + kv; kv++; l = k;
    const a = [0, 1, 2, 3].map((q) => V0[4 * r + q]), b = [0, 1, 2, 3].map((q) => V1[4 * r + q]);
    if (a.every((v, q) => v === b[q])) continue;
    n++;
    const [dx, dy] = dev(xy[2 * k], xy[2 * k + 1]);
    if (fx !== undefined && Math.hypot(dx - +fx, dy - +fy) > +fr) continue;
    rows.push(`ch ${U} k ${k} dev ${dx.toFixed(0)},${dy.toFixed(0)}  s1 ${a.map((v) => v.toFixed(3)).join(" ")}  s3 ${b.map((v) => v.toFixed(3)).join(" ")}`);
  }
  pb += sm.count + (G.kcv[U].closed ? 1 : 0);
}
console.log(`rows differing ${n}; shown ${rows.length}`);
for (const r of rows.slice(0, 80)) console.log(r);

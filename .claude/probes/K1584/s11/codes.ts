// K1584 s11: the baked gap slots along a tight corner's chains: per kept under sample near the corner's tangent point,
// its distance from the corner's centre in ball radii (kR + W) and device px, its arc from the tangent point, winM, the
// slot's over chain, both border codes (margin scale, fade scale; 0 = closure) and the far-off bit.
//   npx tsx codes.ts <capDir> <k> [arcSpan=2]        (this worktree's src)
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const R = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../.."); // GF_SRC: another src tree (an exported stage)
const L = await import(pathToFileURL(join(R, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(R, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(R, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, sK, sSpan] = process.argv; const K = +sK; const span = +(sSpan ?? 2);
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const A = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")).toDevA;
const aa = 0.5 / Math.abs(A[0]); const sc = Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const W = T.W; const h = G.style.threadWidth / 2, margin = L.lookGap(G), fade = L.lookFade(G);
const JL = new Map<number, number[]>(), JP = new Map<number, number[]>(), JW = new Map<number, number[]>();
const src: any = {
  kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h, margin, fade,
  joints: G.junctionArcCtrls, jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin),
  jointArcs: L.gfJointArcs(T, JL, JP, JW), jointLats: JL, jointPartners: JP,
};
if (process.env.GF_NOWEDGE !== "1") src.jointWedges = JW; // s11: the wedge corners (GF_NOWEDGE=1: as before)
const V: Float32Array = new L.GfGapTable().values(src);
const base: number[] = []; { let pb = 0; for (let c = 0; c < G.chainSamples.length; c++) { base.push(pb); const sm = G.chainSamples[c]; if (sm && sm.count >= 1 && G.kcv[c] && G.kcv[c].nCtrl >= 1) pb += sm.count + (G.kcv[c].closed ? 1 : 0); } }
const dev = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
const Rb = T.kR[K] + W;
const [cx, cy] = dev(T.kCx[K], T.kCy[K]);
console.log(`k${K} tight ${T.kTight?.[K]} theta ${(T.kTheta[K] * 180 / Math.PI).toFixed(2)} deg centre (${cx.toFixed(1)}, ${cy.toFixed(1)}) ball ${(Rb * sc).toFixed(2)} px; chains a ${T.kCa[K]} @${T.kSa[K].toFixed(3)} b ${T.kCb[K]} @${T.kSb[K].toFixed(3)}; W ${W.toFixed(4)} h ${h.toFixed(4)} margin ${margin.toFixed(4)} fade ${fade.toFixed(4)} px/world ${sc.toFixed(2)}`);
const dc = (p: number) => p === 0 ? "close" : `${(p % 32 / 31).toFixed(2)}/${(Math.floor(p / 32) / 31).toFixed(2)}`;
for (const [c, s0] of [[T.kCa[K], T.kSa[K]], [T.kCb[K], T.kSb[K]]]) {
  const sm = G.chainSamples[c]; const g = G.kd.geom; const arcPer = g[G.kcv[c].geom * 4 + 1];
  // kept index i -> sample index: positions are compacted, so walk samples and map
  const xy = sm.positions; let kv = 0, l = -1; const keptOf: number[] = [];
  for (let k = 0; k < sm.count; k++) { if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) { keptOf.push(kv - 1); continue; } keptOf.push(kv++); l = k; }
  console.log(`-- chain ${c} tangent arc ${s0.toFixed(3)} arcPer ${arcPer.toFixed(4)} count ${sm.count}`);
  for (let k = 0; k < sm.count; k++) {
    const arc = k * arcPer; if (Math.abs(arc - s0) > span) continue;
    const px = xy[2 * k], py = xy[2 * k + 1]; const r = Math.hypot(px - T.kCx[K], py - T.kCy[K]) / Rb;
    const i = base[c] + keptOf[k]; const wm = V[4 * i], x = V[4 * i + 1], z = V[4 * i + 3];
    const oc = x >= 0 ? Math.floor(x) : -1; const pr = x >= 0 ? Math.round((x - oc) * 4096) : 0; const pl = Math.round((z - Math.floor(z)) * 1024);
    const [dx, dy] = dev(px, py);
    const ka = Math.max(0, k - 1), kb = Math.min(sm.count - 1, k + 1); let tx = xy[2 * kb] - xy[2 * ka], ty = xy[2 * kb + 1] - xy[2 * ka + 1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const rL = Math.hypot(px - ty * h - T.kCx[K], py + tx * h - T.kCy[K]) / Rb, rR = Math.hypot(px + ty * h - T.kCx[K], py - tx * h - T.kCy[K]) / Rb;
    console.log(`k ${String(k).padStart(4)} arc ${(arc - s0).toFixed(3).padStart(7)} r ${r.toFixed(2).padStart(5)} (${(r * Rb * sc).toFixed(1).padStart(5)} px) dev (${dx.toFixed(1)},${dy.toFixed(1)}) rL ${rL.toFixed(2)} rR ${rR.toFixed(2)} winM ${wm.toFixed(3).padStart(7)} over ${String(oc).padStart(3)} L ${oc >= 0 ? dc(pl) : "-"} R ${oc >= 0 ? dc(pr % 1024) : "-"} fo ${pr >= 1024 ? 1 : 0}`);
  }
}

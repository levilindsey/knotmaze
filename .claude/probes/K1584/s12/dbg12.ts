// K1584 s12: one crossing's bake inputs (pairB, pairF, bRoom, gw = gapWindow's sc6, flagN/P, caps, rooms) through the
// temporary __gapDbg hook in gf_look.ts (lines marked S12DBG; never committed).
//   npx tsx dbg12.ts <capDir> <crossing index>[,<index>...]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const R = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
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
const [, , capDir, sX] = process.argv; const want = new Set(sX.split(",").map(Number));
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const A = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")).toDevA;
const T = withHome(buildTables(scene, { aa: 0.5 / Math.abs(A[0]), kRetry: true }), true);
const h = G.style.threadWidth / 2, margin = L.lookGap(G), fade = L.lookFade(G);
const JL = new Map<number, number[]>(), JP = new Map<number, number[]>(), JW = new Map<number, number[]>();
const ja = L.gfJointArcs(T, JL, JP, JW);
const src: any = {
  kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h, margin, fade,
  joints: G.junctionArcCtrls, jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin),
  jointArcs: ja, jointLats: JL, jointPartners: JP, jointWedges: JW,
};
const f = (v: number) => (Math.abs(v) >= 1e5 ? "inf" : v.toFixed(3));
(globalThis as any).__gapDbg = (o: any) => {
  const i = G.crossings.indexOf(o.x); if (!want.has(i)) return;
  console.log(`x${i} over ${o.x.overChain} under ${o.x.underChain} uC ${o.uC.toFixed(3)} oC ${o.oC.toFixed(3)} arcPer ${o.arcPer.toFixed(4)} capN ${f(o.capN)} capP ${f(o.capP)} jRoomN ${f(o.jRoomN)} jRoomP ${f(o.jRoomP)}`);
  console.log(`  pairB [nL nR pL pR] ${o.pairB.map(f).join(" ")}  pairF ${o.pairF.map(f).join(" ")}  bRoom ${o.bRoom.map(f).join(" ")}`);
  console.log(`  gw win ${f(o.gw[0])} ${f(o.gw[1])} side sc ${o.gw.slice(2, 6).map(f).join(" ")} border sc ${o.gw.slice(6, 14).map(f).join(" ")} ends ${o.gw.slice(14, 18).map(f).join(" ")}  flagN ${f(o.flagN)} flagP ${f(o.flagP)}`);
};
new L.GfGapTable().values(src);
// the under chain's joint corners (tangent arcs on it, lat, partner, wedge)
for (const i of want) {
  const x = G.crossings[i]; const jt = ja.get(x.underChain); if (!jt) continue;
  const km: number[] = []; { const sm = G.chainSamples[x.underChain]; const xy = sm.positions; let kv = 0, l = -1; for (let k = 0; k < sm.count; k++) { if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) { km.push(kv - 1); continue; } km.push(kv++); l = k; } }
  const raw: number[] = []; for (let k = 0; k < km.length; k++) if (raw[km[k]] === undefined) raw[km[k]] = k;
  const arcPer = G.kd.geom[G.kcv[x.underChain].geom * 4 + 1];
  console.log(`  chain ${x.underChain} joint tangent points: ` + jt.map((fq: number, q: number) => { const ii = Math.floor(fq), jj = Math.min(raw.length - 1, ii + 1); const arc = (raw[ii] + (fq - ii) * (raw[jj] - raw[ii])) * arcPer; return `[arc ${arc.toFixed(3)} lat ${JL.get(x.underChain)?.[q]} partner ${JP.get(x.underChain)?.[q]} wedge ${JW.get(x.underChain)?.[q] ?? 0}]`; }).join(" "));
}

// K1584 s11: the wedge corners on every maze and the gap slots their jointWedges change (this worktree's src).
//   npx tsx wcensus.ts <capRoot>     (capRoot holds one capture dir per maze: gw_gf.json, scene_gf.json, sites_gf.json)
import { readFileSync, readdirSync, existsSync } from "node:fs";
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
const root = process.argv[2];
for (const m of readdirSync(root).sort()) {
  const d = join(root, m);
  if (!existsSync(join(d, "gw_gf.json"))) continue;
  const G = dec(JSON.parse(readFileSync(join(d, "gw_gf.json"), "utf8")));
  const scene = dec(JSON.parse(readFileSync(join(d, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
  const A = JSON.parse(readFileSync(join(d, "sites_gf.json"), "utf8")).toDevA;
  const T = withHome(buildTables(scene, { aa: 0.5 / Math.abs(A[0]), kRetry: true }), true);
  const h = G.style.threadWidth / 2, margin = L.lookGap(G), fade = L.lookFade(G);
  const JL = new Map<number, number[]>(), JP = new Map<number, number[]>(), JW = new Map<number, number[]>();
  const src: any = {
    kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h, margin, fade,
    joints: G.junctionArcCtrls, jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin),
    jointArcs: L.gfJointArcs(T, JL, JP, JW), jointLats: JL, jointPartners: JP,
  };
  const a: Float32Array = Float32Array.from(new L.GfGapTable().values(src));
  const b: Float32Array = new L.GfGapTable().values({ ...src, jointWedges: JW });
  const wedges: string[] = [];
  const line = Math.fround(1 + L.GAP_WEDGE_THETA);
  for (let k = 0; k < T.nK; k++) if (T.kTight?.[k] === 1 && Math.fround(1 + T.kTheta[k]) < line) wedges.push(`k${k}(${(T.kTheta[k] * 180 / Math.PI).toFixed(1)})`);
  let n = 0; const at: string[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && !(Number.isNaN(a[i]) && Number.isNaN(b[i]))) { n++; if (at.length < 6) at.push(`${i >> 2}.${i & 3}`); }
  console.log(`${m}: wedges ${wedges.join(" ") || "-"}; slots changed ${n} ${at.join(" ")}`);
}

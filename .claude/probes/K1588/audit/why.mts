// audit: at world points, print the mirror's pieces (chain, s, distance, depth, key, group, ramp, home, surface) and the result.
//   GF_SRC=<tree> npx tsx why.ts <capDir> <x,y> [<x,y> ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.env.GF_SRC!;
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, ...pts] = process.argv;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const ev: any = new GfEval(T); ev.fadeLength = L.lookFade(G);
console.log(`h ${T.h} zt ${T.zt} amp ${T.amp} win ${T.win} fadeLength ${ev.fadeLength} homeOn ${T.homeOn} aa ${aa.toFixed(4)}  home ramp: full below |z| ${T.zt}, none above ${((ev.fadeLength * T.amp) / T.win).toFixed(4)}`);
const f = (v: number, n = 3): string => (Number.isFinite(v) ? v.toFixed(n) : String(v));
for (const p of pts) {
  const [x, y] = p.split("_").map(Number); const o = ev.eval(x, y);
  console.log(`\n(${x}, ${y}): ink ${f(o.ink)} cov ${f(o.cov)} label chain ${o.chain} win kind ${o.winKind} a ${o.winA} b ${o.winB}`);
  for (let j = 0; j < ev.np; j++) {
    const c = ev.pc[j], s = ev.ps[j]; const m = ev.memberAt(c, s);
    console.log(`  piece chain ${c} s ${f(s)} d ${f(ev.pd[j])} z ${f(ev.pz[j], 4)} key ${f(ev.pkey[j], 4)} | group ${m.g} ramp ${f(m.ramp)} homeRamp(|z|) ${f(ev.homeRamp(Math.abs(ev.pz[j])))} | last cfg: g ${ev.pg[j]} ramp ${f(ev.pramp[j])} hb ${ev.phb[j]} surf ${ev.psurf[j]}`);
  }
}


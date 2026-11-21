// K1482 s34: the arms of some groups of link A (or a K868 scene): chain, root s, dir, L, Lcut, home, whether the
// root is the chain's open end, and the root's device point.
//   npx tsx grp34.ts A <scene.json> <sites.json> <g,g,...>
//   npx tsx grp34.ts K <k868 scene name> - <g,g,...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome, chainAt } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , kind, sp, sitesP, gS] = process.argv;
let T: any; let a = 1, d = 1, e = 0, f = 0;
if (kind === "A") {
  const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
  T = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
  [a, , , d, e, f] = JSON.parse(readFileSync(sitesP, "utf8")).toDevA;
} else {
  const { modelOf } = await import(pathToFileURL(join(SRC, ".claude/probes/K1433/k1433_lib.ts")).href);
  const sc = modelOf(sp).scene; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
  T = withHome(buildTables(sc, { aa, kRetry: true }), true);
}
for (const G of gS.split(",").map(Number)) {
  console.log(`group ${G}`);
  for (let i = 0; i < T.nA; i++) if (T.aG[i] === G) {
    let c = -1; for (let cc = 0; cc < T.nC; cc++) if (i >= T.cArm0[cc] && i < T.cArm0[cc] + T.cArmN[cc]) c = cc;
    const s0 = T.vs[T.cV0[c]], s1 = T.vs[T.cV0[c] + T.cNV[c] - 1];
    const end = T.cClosed[c] === 1 ? "" : Math.abs(T.aSR[i] - (T.aDir[i] > 0 ? s0 : s1)) < 1e-4 ? " END" : "";
    const p = chainAt(T, c, T.aSR[i]);
    console.log(`  arm ${i} chain ${c} sR ${T.aSR[i].toFixed(3)} dir ${T.aDir[i]} L ${T.aL[i].toFixed(3)} Lcut ${T.aLcut[i].toFixed(3)} home ${T.aHome[i].toFixed(3)}${T.aCutC ? ` cutC ${T.aCutC[i]} cutS ${T.aCutS[i].toFixed(3)}` : ""} chainS ${T.vs[T.cV0[c]].toFixed(2)}..${T.vs[T.cV0[c] + T.cNV[c] - 1].toFixed(2)}${end} root ${(p.x * a + e).toFixed(1)},${(p.y * d + f).toFixed(1)}`);
  }
}

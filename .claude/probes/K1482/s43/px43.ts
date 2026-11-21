// K1482 s43: one device pixel's pieces in the mirror, switch off and on (GfEval.BEND = rf): chain, distance pd (in h),
// arc ps, side, end flag, and the pixel's ink / cov / chain. Shows which piece or term keeps ink after the fillet.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s43/px43.ts <scene.json> <sites.json> <rf> <x,y>...
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { const o: any = {}; for (const k in v) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, rfs, ...pts] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
GfEval.BEND = 0; const E0: any = new GfEval(T); GfEval.BEND = +rfs; const E1: any = new GfEval(T);
for (const p of pts) {
  const [X, Y] = p.split(",").map(Number);
  for (const [lab, E] of [["off", E0], ["on", E1]] as const) {
    const o = E.eval((X + 0.5 - e) / a, (Y + 0.5 - f) / d);
    const s = `${o.ink.toFixed(2)} cov ${o.cov.toFixed(2)} ch ${o.chain}`;
    const ps: string[] = [];
    for (let j = 0; j < E.np; j++) {
      const x = (X + 0.5 - e) / a, y = (Y + 0.5 - f) / d;
      const side = Math.sign(E.ptx[j] * (y - E.pfy[j]) - E.pty[j] * (x - E.pfx[j]));
      ps.push(`c${E.pc[j]} d${(E.pd[j] / T.h).toFixed(3)} s${E.ps[j].toFixed(2)} sd${side} e${E.pend[j]}`);
    }
    console.log(`${X},${Y} ${lab}: ink ${s} | ${ps.slice(0, 6).join("; ")}`);
  }
}

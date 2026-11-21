// K1482 s33: the chains tables.ts's sideRuns marks (GfTables.rtM) on link A and K868 scenes, with timing.
//   GF_KRETRY=1 node scripts/run_node.mjs rt33.ts A <scene_gf.json> | K <k868 scene>...
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, sideRuns } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , mode, ...names] = process.argv;
for (const nm of names) {
  let T: any;
  if (mode === "A") { const scene = dec(JSON.parse(readFileSync(nm, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC; T = buildTables(scene, { aa: 0.011738963274354473, kRetry: true }); }
  else { const { modelOf } = await import(pathToFileURL(join(SRC, ".claude/probes/K1433/k1433_lib.ts")).href); const sc = modelOf(nm).scene; T = buildTables(sc, { aa: 0.5 / (sc.camera.pxPerUnit * 2), kRetry: true }); }
  const t0 = performance.now(); for (let k = 0; k < 5; k++) sideRuns(T.nC, T.cV0, T.cNV, T.vx, T.vy, T.h); const ms = (performance.now() - t0) / 5;
  const marks: string[] = []; for (let c = 0; c < T.nC; c++) if (T.rtM[c] >= 0) marks.push(`C${c}/M${T.rtM[c]}`);
  console.log(`${mode === "A" ? "A" : nm}: build ${JSON.stringify(T.ms)} nC ${T.nC} nV ${T.nV} sideRuns ${ms.toFixed(1)} ms; marked ${marks.length}: ${marks.join(" ")}`);
}
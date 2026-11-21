// K1482 s42: build the tables with globalThis.__k42 = [ca, cb] set, for a debug patch of tables.ts (not committed)
// that logs each corner pair of the junctions holding both chains and where it drops out; then prints the corner
// records whose arms are those chains.
//   ca = "all": logs every through pair instead (kdbg_patch42.ps1's __k42all).
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s42/kdbg42.ts <scene.json> <sites.json> <ca> <cb>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, ca, cb] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
if (ca === "all") (globalThis as any).__k42all = 1; else (globalThis as any).__k42 = [+ca, +cb];
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const dv = (x: number, y: number): string => `${(a * x + e).toFixed(1)},${(d * y + f).toFixed(1)}`;
if (ca !== "all") for (let k = 0; k < T.nK; k++) if ([T.kCa[k], T.kCb[k]].includes(+ca) || [T.kCa[k], T.kCb[k]].includes(+cb))
  console.log(`k${k} j${T.kJ[k]} g${T.kG[k]} c ${dv(T.kCx[k], T.kCy[k])} r ${(T.kR[k] * a).toFixed(2)}px thru ${T.kThru[k]} ext ${T.kExt?.[k]} a c${T.kCa[k]}@${T.kSa[k].toFixed(3)} b c${T.kCb[k]}@${T.kSb[k].toFixed(3)}`);
console.log(`scale a ${a} e ${e} d ${d} f ${f}`);

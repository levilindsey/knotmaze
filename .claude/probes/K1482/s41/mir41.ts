// K1482 s41: the CPU mirror's border ink around a device px as a PGM (paper white, ink black), plus a winner map PGM
// (each winning term its own grey) when WIN=1. GfEval.S41 = env MODE (default "" = the build's rule; "0" = the start).
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s41/mir41.ts <scene.json> <sites.json> <x:y> <R> <out.pgm>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, xy, Rs, outP] = process.argv; const R = +(Rs ?? 40);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const E: any = new GfEval(T); GfEval.S41 = process.env.MODE ?? "";
const [cx, cy] = xy.split(":").map(Number); const n = 2 * R + 1;
const ink = Buffer.alloc(n * n), win = Buffer.alloc(n * n); const ids = new Map<string, number>();
for (let Y = cy - R; Y <= cy + R; Y++) for (let X = cx - R; X <= cx + R; X++) {
  const q = E.eval((X + 0.5 - e) / a, (Y + 0.5 - f) / d); const i = (Y - cy + R) * n + (X - cx + R);
  ink[i] = Math.round(255 * (1 - Math.max(0, Math.min(1, q.ink))));
  const k = `${q.winKind}:${q.winA}:${q.winB}`; if (!ids.has(k)) ids.set(k, ids.size);
  win[i] = q.ink >= 0.5 ? 40 + ((ids.get(k)! * 47) % 200) : 255;
}
const hdr = Buffer.from(`P5\n${n} ${n}\n255\n`);
writeFileSync(outP, Buffer.concat([hdr, ink]));
if (process.env.WIN) writeFileSync(outP.replace(/\.pgm$/, "_win.pgm"), Buffer.concat([hdr, win]));
console.log(`mode "${GfEval.S41}" ${n}x${n} at ${cx},${cy}`);

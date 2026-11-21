// K1482 s42: the mirror's ink around a device px as a PNG-ready PPM, each inked px coloured by its winner
// (winKind:winA:winB; 1 side, 2 arc, 3 end side, 4 tangent, 5 thru, 6 vtx), paper white, ink < 0.5 pale; the legend
// (colour, winner, px count) is printed. GfEval.S42 = env MODE ("" = the build's rule, "0" = the start), when present.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s42/win42.ts <scene.json> <sites.json> <x:y> <R> <out.ppm>
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
const E: any = new GfEval(T); if ("S42" in GfEval) (GfEval as any).S42 = process.env.MODE ?? "";
const [cx, cy] = xy.split(":").map(Number); const n = 2 * R + 1;
const pal = [[220, 30, 30], [30, 120, 220], [20, 160, 60], [200, 120, 0], [150, 40, 200], [0, 170, 170], [120, 120, 120], [230, 0, 150], [90, 60, 20], [0, 0, 0]];
const rgb = Buffer.alloc(n * n * 3); const ids = new Map<string, [number, number]>();
for (let Y = cy - R; Y <= cy + R; Y++) for (let X = cx - R; X <= cx + R; X++) {
  const q = E.eval((X + 0.5 - e) / a, (Y + 0.5 - f) / d); const i = ((Y - cy + R) * n + (X - cx + R)) * 3;
  if (!(q.ink > 0.02)) { rgb[i] = rgb[i + 1] = rgb[i + 2] = 255; continue; }
  const k = `${q.winKind}:${q.winA}:${q.winB}`; if (!ids.has(k)) ids.set(k, [ids.size, 0]); const r = ids.get(k)!; r[1]++;
  const c = pal[r[0] % pal.length]; const t = Math.min(1, q.ink);
  for (let m = 0; m < 3; m++) rgb[i + m] = Math.round(255 - t * (255 - c[m]));
}
writeFileSync(outP, Buffer.concat([Buffer.from(`P6\n${n} ${n}\n255\n`), rgb]));
for (const [k, [id, cnt]] of ids) console.log(`${pal[id % pal.length].join(",")} ${k} ${cnt}`);

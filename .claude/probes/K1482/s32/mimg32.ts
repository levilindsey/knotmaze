// K1482 s32: mirror ink before | after (GF_S32 0 | 1) | diff (red removed, green added) over an N x N device crop.
//   npx tsx mimg29.ts <scene.json> <sites.json> <cx,cy> <N> <out.ppm>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , sp, sitesP, c0, Ns, outp] = process.argv; const N = +Ns;
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const T: any = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const E: any = new GfEval(T); const [cx, cy] = c0.split(",").map(Number); const x0 = cx - N / 2, y0 = cy - N / 2;
const Wd = 3 * N + 4; const buf = Buffer.alloc(Wd * N * 3, 255);
for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
  const fx = (x0 + ix + 0.5 - e) / a, fy = (y0 + iy + 0.5 - f) / d;
  process.env.GF_S32 = "0"; const r0 = E.eval(fx, fy); const i0 = r0.ink; const c0f = r0.chain >= 0 ? 1 : 0;
  process.env.GF_S32 = "1"; const i1 = E.eval(fx, fy).ink;
  const put = (px: number, r: number, g: number, b: number): void => { const o = (iy * Wd + px) * 3; buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; };
  const bg = c0f ? 225 : 255;
  const g0 = Math.round(bg * (1 - i0)), g1 = Math.round(bg * (1 - i1));
  put(ix, g0, g0, g0 + (c0f ? 20 : 0) > 255 ? 255 : g0); put(N + 2 + ix, g1, g1, g1);
  const dv = i1 - i0; const gm = Math.round(200 * (1 - Math.max(i0, i1)) + 40);
  if (dv < -0.02) put(2 * N + 4 + ix, 230, 30, 30); else if (dv > 0.02) put(2 * N + 4 + ix, 30, 200, 30); else put(2 * N + 4 + ix, gm, gm, gm);
}
writeFileSync(outp, Buffer.concat([Buffer.from(`P6 ${Wd} ${N} 255\n`), buf]));



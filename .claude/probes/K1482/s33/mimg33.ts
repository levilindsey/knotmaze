// K1482 s33: the CPU copy's ink at each pair run33 found: before (runT off) | after (s31's ungated runT, or the
// build's gate with GATE=1) | diff (red removed, green added), an N x N crop magnified Z times, contrast stretched
// (ink 0..1 -> white..black). Band chain C's pixels tint blue, the over chain M's tint orange in the before panel.
//   npx tsx mimg33.ts <run33 json> <rowIndex|all> <outDir> [N=80] [Z=5]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , rp, which, outDir, Ns, Zs] = process.argv; const N = +(Ns ?? 80), Z = +(Zs ?? 5);
const R = JSON.parse(readFileSync(rp, "utf8")); mkdirSync(outDir, { recursive: true });
let T: any;
if (R.mode === "A") { const scene = dec(JSON.parse(readFileSync(R.scene, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC; T = withHome(buildTables(scene, { aa: R.aa, kRetry: true }), true); }
else { const { modelOf } = await import(pathToFileURL(join(SRC, ".claude/probes/K1433/k1433_lib.ts")).href); T = withHome(buildTables(modelOf(R.scene).scene, { aa: R.aa, kRetry: true }), true); }
const [a, d, e, f] = R.map; const E: any = new GfEval(T); const gate = process.env.GATE === "1";
const rows = which === "all" ? R.rows.map((r: any, i: number) => [r, i]) : [[R.rows[+which], +which]];
for (const [r, i] of rows) {
  const x0 = r.x - N / 2, y0 = r.y - N / 2; const Wd = (3 * N + 4) * Z, Hd = N * Z; const buf = Buffer.alloc(Wd * Hd * 3, 255);
  let nd = 0, ng = 0;
  for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
    const fx = (x0 + ix + 0.5 - e) / a, fy = (y0 + iy + 0.5 - f) / d;
    GfEval.S33 = "0"; const q0 = E.eval(fx, fy); const i0 = q0.ink; const ch = q0.chain ?? -1;
    GfEval.S33 = gate ? "" : "all"; const i1 = E.eval(fx, fy).ink;
    const g0 = Math.round(255 * (1 - i0)), g1 = Math.round(255 * (1 - i1)); const dv = i1 - i0;
    let c0: [number, number, number] = [g0, g0, g0];
    if (i0 < 0.5 && ch === r.C) c0 = [Math.round(g0 * 0.8), Math.round(g0 * 0.88), 255]; else if (i0 < 0.5 && ch === r.M) c0 = [255, Math.round(g0 * 0.85), Math.round(g0 * 0.7)];
    const gm = Math.round(200 * (1 - Math.max(i0, i1)) + 40);
    const c2: [number, number, number] = dv < -0.02 ? [230, 30, 30] : dv > 0.02 ? [30, 200, 30] : [gm, gm, gm];
    if (dv < -0.02) nd++; else if (dv > 0.02) ng++;
    const put = (px: number, c: [number, number, number]): void => { for (let zy = 0; zy < Z; zy++) for (let zx = 0; zx < Z; zx++) { const o = ((iy * Z + zy) * Wd + px * Z + zx) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; } };
    put(ix, c0); put(N + 2 + ix, [g1, g1, g1]); put(2 * N + 4 + ix, c2);
  }
  // centerlines over the before panel: C dark blue, M dark orange (env CL=1)
  if (process.env.CL === "1") for (const [ch, col] of [[r.C, [0, 0, 200]], [r.M, [220, 90, 0]]] as [number, number[]][]) { const v0 = T.cV0[ch]; for (let k = 0; k + 1 < T.cNV[ch]; k++) { const ax = T.vx[v0 + k], ay = T.vy[v0 + k], bx = T.vx[v0 + k + 1], by = T.vy[v0 + k + 1]; for (let u = 0; u <= 1; u += 0.02) { const px = (ax + (bx - ax) * u) * a + e - x0, py = (ay + (by - ay) * u) * d + f - y0; if (px < 0 || py < 0 || px >= N || py >= N) continue; const X = Math.floor(px * Z), Y = Math.floor(py * Z); for (let q = 0; q < 2; q++) for (let w = 0; w < 2; w++) { const o = ((Y + q) * Wd + X + w) * 3; if (Y + q < Hd && X + w < N * Z) { buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; } } } } }
  const nm = `${String(i).padStart(2, "0")}_C${r.C}_M${r.M}`; writeFileSync(join(outDir, `${nm}.ppm`), Buffer.concat([Buffer.from(`P6 ${Wd} ${Hd} 255\n`), buf]));
  console.log(`${nm} at ${r.x},${r.y} ${r.site ?? ""} lost ${nd} gained ${ng} run1 ${r.run1.toFixed(2)} h`);
}

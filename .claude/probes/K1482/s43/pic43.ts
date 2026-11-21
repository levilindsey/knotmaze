// K1482 s43: the mirror's ink in a device window, switch off and on (GfEval.BEND = each radius), as 8-bit PGMs
// (round(ink * 255)), plus the bend records near the window. Both halves come from the same code path; only
// GfEval.BEND differs.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s43/pic43.ts <scene.json> <sites.json> <outDir> <name> <x> <y> <R> [rf,rf2...=0.5]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return new (globalThis as any)[v.__t](v.d); const o: any = {}; for (const k in v) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, outDir, name, xs, ys, Rs, rfs] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const x0 = +xs - +Rs, y0 = +ys - +Rs, N = 2 * +Rs;
const { buildBends, GfBendsOpt } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
if (process.env.OTHER) GfBendsOpt.otherPass = +process.env.OTHER; // drop a bend only when another pass is nearer F than OTHER * R
for (const rf of (rfs ?? "0.5").split(",").map(Number)) buildBends(T, rf, (c: number, X: number, Y: number, turn: number, why: string) => { const DX = a * X + e, DY = d * Y + f; if (Math.abs(DX - +xs) < +Rs && Math.abs(DY - +ys) < +Rs) console.log(`  dropped rf ${rf}: c${c} turn ${turn.toFixed(0)} at ${DX.toFixed(0)},${DY.toFixed(0)}: ${why}`); });
mkdirSync(outDir, { recursive: true });
const render = (bend: number): Uint8Array => {
  GfEval.BEND = bend; const E: any = new GfEval(T); const img = new Uint8Array(N * N); const fl = new Float32Array(3 * N * N);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const o = E.eval((x0 + c + 0.5 - e) / a, (y0 + r + 0.5 - f) / d); const i = r * N + c; img[i] = Math.round(255 * o.ink); fl[3 * i] = o.ink; fl[3 * i + 1] = o.cov; fl[3 * i + 2] = o.chain; }
  writeFileSync(join(outDir, `${name}_${bend ? "b" + bend : "off"}_${x0}_${y0}_${N}.f32`), Buffer.from(fl.buffer));
  if (bend > 0) { const B = E.bendRecords; for (let k = 0; k < B.n; k++) { const X = a * B.fx[k] + e, Y = d * B.fy[k] + f; if (Math.abs(X - +xs) < +Rs + 20 && Math.abs(Y - +ys) < +Rs + 20) console.log(`  bend c${B.c[k]} ${B.sg[k] > 0 ? "L" : "R"} turn ${B.turn[k].toFixed(0)} F ${X.toFixed(1)},${Y.toFixed(1)} rf ${(a * B.rf[k]).toFixed(1)}px s ${B.sA[k].toFixed(2)}..${B.sB[k].toFixed(2)} fa ${(a * B.ax[k] + e).toFixed(1)},${(d * B.ay[k] + f).toFixed(1)} fb ${(a * B.bx[k] + e).toFixed(1)},${(d * B.by[k] + f).toFixed(1)}`); } }
  return img;
};
const pgm = (p: string, img: Uint8Array) => writeFileSync(p, Buffer.concat([Buffer.from(`P5 ${N} ${N} 255\n`), Buffer.from(img)]));
const off = render(0); pgm(join(outDir, `${name}_off_${x0}_${y0}.pgm`), off);
for (const rf of (rfs ?? "0.5").split(",").map(Number)) {
  const on = render(rf); pgm(join(outDir, `${name}_b${rf}_${x0}_${y0}.pgm`), on);
  let n1 = 0, n6 = 0, mx = 0; for (let i = 0; i < N * N; i++) { const dd = Math.abs(on[i] - off[i]); if (dd > 0) n1++; if (dd >= 51) n6++; mx = Math.max(mx, dd); }
  console.log(`${name} rf ${rf}: changed px ${n1} (|d ink| >= 0.2: ${n6}), max ${(mx / 255).toFixed(2)}`);
}

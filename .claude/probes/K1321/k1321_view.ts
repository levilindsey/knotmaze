// K1321: a diagnostic view of the census reference at one spot. Panels (P x P px, <zoom> h wide):
// plain form B | the fillet copy | the census reference (k1314_census refEval) | rp=outline | diff
// (red: outline ink >= .5 where the reference is < .25; blue: the reverse). Prints the corners near the spot
// (form_b_fillet's, thru flag, ok, r/h, theta deg, V, q, rV) and the stock form B's.
//   node scripts/run_node.mjs .claude/probes/K1321/k1321_view.ts <scene> <x> <y> [--zoom=3] [--px=200] [--out=file.png]
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../src/render/field/form_b";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { buildModel, filletOf, rasterOutline, refEval } from "../K1314/k1314_census";
import { writePng } from "../K1314/k1314_crops";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args; const X = +xs; const Y = +ys;
const P = +(opt("px") ?? 200); const Z = +(opt("zoom") ?? 3);
const m = buildModel(nm); const h = m.scene.look.halfWidth;
type EV = { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } };
const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as EV & { corners: { j: number; a: number; b: number; ok: boolean; r: number; theta: number; Vx: number; Vy: number; qx: number; qy: number; rV: number; style: number }[]; cornersNear(x: number, y: number): number[] };
const ff = filletOf(m) as unknown as EV & { corners: typeof fb.corners; cornersNear(x: number, y: number): number[]; thruCi: Set<number> };
const ppu = P / (Z * h); const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
const NP = 5; const Wt = NP * P + 4 * (NP - 1); const out = new Uint8Array(Wt * P * 3).fill(255);
const put = (k: number, c: number, r: number, v: [number, number, number]): void => { const o = 3 * (r * Wt + k * (P + 4) + c); out[o] = v[0]; out[o + 1] = v[1]; out[o + 2] = v[2]; };
const col: RGB = [0, 0, 0];
const comp = (chain: number, s: number, top: number, ink: number): [number, number, number] => {
  let f = [1, 1, 1]; if (top >= 0 && chain >= 0) { const k = runAt(m.sp, chain, s); if (k >= 0) { runColour(m.sp.runs[k], s, col); f = [col[0], col[1], col[2]]; } }
  const a = Math.min(1, Math.max(0, ink)); return [Math.round(255 * f[0] * (1 - a)), Math.round(255 * f[1] * (1 - a)), Math.round(255 * f[2] * (1 - a))];
};
const refInk = new Float32Array(P * P);
for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
  const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
  const a = fb.evalPoint(x, y); put(0, c, r, comp(a.chain, a.s, a.top, a.ink));
  const b = ff.evalPoint(x, y); put(1, c, r, comp(b.chain, b.s, b.top, b.ink));
  const e = refEval(m, x, y); put(2, c, r, comp(e.chain, e.s, e.top, e.ink)); refInk[r * P + c] = e.ink;
}
const R = rasterOutline(m, c0, r0, P, P, ppu);
for (let i = 0; i < P * P; i++) {
  const c = i % P; const r = (i - c) / P; const a = Math.min(1, Math.max(0, R.ink[i]));
  const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
  put(3, c, r, [Math.round(255 * f[0] * (1 - a)), Math.round(255 * f[1] * (1 - a)), Math.round(255 * f[2] * (1 - a))]);
  const o = a; const b = Math.min(1, Math.max(0, refInk[i]));
  const g = Math.round(255 * (1 - 0.35 * Math.max(o, b)));
  put(4, c, r, o >= 0.5 && b < 0.25 ? [230, 20, 20] : b >= 0.5 && o < 0.25 ? [20, 60, 230] : [g, g, g]);
}
// crosshair at the spot
const cx = Math.round(X * ppu - c0 - 0.5); const cy = Math.round(Y * ppu - r0 - 0.5);
for (let k = 0; k < NP; k++) for (let d = -4; d <= 4; d++) { if (cx + d >= 0 && cx + d < P && cy >= 0 && cy < P) put(k, cx + d, cy, [255, 0, 255]); if (cy + d >= 0 && cy + d < P && cx >= 0 && cx < P) put(k, cx, cy + d, [255, 0, 255]); }
const file = opt("out") ?? join(here, "out", "view", `${nm}_${X}_${Y}.png`); mkdirSync(dirname(file), { recursive: true });
writePng(file, out, Wt, P); console.log(`${file}  (ppu ${ppu.toFixed(1)}, h ${h})`);
const show = (tag: string, f: typeof ff | typeof fb, thru?: Set<number>): void => {
  const seen = new Set<number>(); for (const ci of f.cornersNear(X, Y)) seen.add(ci);
  for (const ci of seen) {
    const c = f.corners[ci]; if (Math.hypot(c.Vx - X, c.Vy - Y) > 4 * h && Math.hypot(c.qx - X, c.qy - Y) > 4 * h) continue;
    console.log(`${tag} c${ci} j${c.j} arms ${c.a},${c.b}${thru?.has(ci) ? " THRU" : ""} ok ${c.ok} style ${c.style} r/h ${(c.r / h).toFixed(3)} th ${(c.theta * 180 / Math.PI).toFixed(1)} V (${c.Vx.toFixed(3)},${c.Vy.toFixed(3)}) q (${c.qx.toFixed(3)},${c.qy.toFixed(3)}) rV/h ${(c.rV / h).toFixed(3)}`);
  }
};
show("fillet", ff, ff.thruCi); show("stock ", fb);
// the junctions within 3 h: arms (form B's index, angle, kind, chain, L) and every corner of the fillet copy there
const FA = (ff as unknown as { arms: { j: number; ei: number; ang: number; L: number; chain?: number }[] }).arms;
m.scene.junctions.forEach((J, ji) => {
  if (Math.hypot(J.c[0] - X, J.c[1] - Y) > 3 * h) return;
  const ais = FA.map((_, i) => i).filter((i) => FA[i].j === ji).sort((u, v) => FA[u].ang - FA[v].ang);
  console.log(`j${ji} at (${J.c[0].toFixed(3)},${J.c[1].toFixed(3)}): ` + ais.map((ai) => { const e = J.arms[FA[ai].ei] as unknown as { chain: number; kind: string; s: number }; return `a${ai}[${(FA[ai].ang * 180 / Math.PI).toFixed(0)}deg ${e.kind} c${e.chain} s${e.s.toFixed(2)} L/h ${(FA[ai].L / h).toFixed(2)}]`; }).join(" "));
  ff.corners.forEach((c, ci) => { if (c.j === ji) console.log(`  c${ci} ${c.a},${c.b}${ff.thruCi.has(ci) ? " THRU" : ""} ok ${c.ok} r/h ${(c.r / h).toFixed(3)} th ${(c.theta * 180 / Math.PI).toFixed(1)} V (${c.Vx.toFixed(3)},${c.Vy.toFixed(3)})`); });
  const SC = (m.st as unknown as { corners: { ji: number; aArm: number; bArm: number; thru: number }[] }).corners;
  m.table.corners.forEach((c, ci) => { const d = SC[ci]; if (d.ji !== ji) return; console.log(`  outline c${ci} arms ${d.aArm},${d.bArm}${d.thru ? " THRU" : ""} ok ${c.ok} r/h ${(c.r / h).toFixed(3)} th ${(c.theta * 180 / Math.PI).toFixed(1)} V (${c.Vx.toFixed(3)},${c.Vy.toFixed(3)}) q (${c.qx.toFixed(3)},${c.qy.toFixed(3)}) why ${c.why ?? "-"}`); });
});

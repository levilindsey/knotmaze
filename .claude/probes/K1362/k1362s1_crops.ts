// K1362 s1: crops form B | rp=outline (src as on master) | the GPU field's CPU mirror, at spots.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_crops.ts --spots=scene:x:y:label,... [--px=480] [--w=2.5]
//        [--out=.claude/probes/K1362/out/s1/x4] [--sheet=<name>]
// 4x = --px=480 --w=2.5 (192 px per h), 8x = --px=480 --w=1.25. A red ring marks the spot (r = 0.6 h).
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { buildModel, refEval, rasterOutline } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { writePng } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_crops.ts";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { rasterGf } from "./k1362s1_census";

type Model = ReturnType<typeof buildModel>;
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = opt("out") ?? ".claude/probes/K1362/out/s1/x4"; const P = Number(opt("px") ?? 480); const WH = Number(opt("w") ?? 2.5);
mkdirSync(OUT, { recursive: true });
const col: RGB = [0, 0, 0];
const SHEET: Uint8Array[] = []; const SHEET_NAME = opt("sheet");

function crop(file: string, m: Model, X: number, Y: number): void {
  const h = m.scene.look.halfWidth; const S = WH * h; const ppu = P / S;
  const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
  const Wt = 3 * P + 8; const img = new Uint8Array(Wt * P * 3).fill(255);
  const put = (k: number, c: number, r: number, rgb: number[]): void => { const o = 3 * (r * Wt + k * (P + 4) + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; };
  const inkB = new Float32Array(P * P);
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = refEval(m, (c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    let f = [1, 1, 1];
    if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(m.sp, ev.chain, ev.s); if (k >= 0) { runColour(m.sp.runs[k], ev.s, col); f = [col[0], col[1], col[2]]; } }
    const a = Math.min(1, Math.max(0, ev.ink)); inkB[r * P + c] = a; put(0, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
  }
  let dmax = 0; let nd = 0;
  for (const k of [1, 2]) {
    const R = k === 1 ? rasterOutline(m, c0, r0, P, P, ppu) : rasterGf(m, c0, r0, P, P, ppu);
    for (let i = 0; i < P * P; i++) {
      const c = i % P; const r = (i - c) / P; const a = Math.min(1, Math.max(0, R.ink[i]));
      if (k === 2) { const d = Math.abs(a - inkB[i]); if (d > 0.1) nd++; dmax = Math.max(dmax, d); }
      const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
      put(k, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
    }
  }
  const rr = 0.6 * h * ppu; const cx = X * ppu - c0; const cy = Y * ppu - r0;
  for (let k = 0; k < 3; k++) for (let t = 0; t < 720; t++) {
    const c = Math.round(cx + rr * Math.cos(t * Math.PI / 360)); const r = Math.round(cy + rr * Math.sin(t * Math.PI / 360));
    if (c >= 0 && c < P && r >= 0 && r < P) put(k, c, r, [230, 0, 0]);
  }
  writePng(join(OUT, file), img, Wt, P); SHEET.push(img);
  console.log(`${file}: ${S.toFixed(3)} world wide; form B vs mine: max |d ink| ${dmax.toFixed(3)}, ${nd} px > .1`);
}

const models = new Map<string, Model>();
for (const s of (opt("spots") ?? "").split(",").filter(Boolean)) {
  const [nm, x, y, label] = s.split(":"); let m = models.get(nm);
  if (!m) { m = buildModel(nm); models.set(nm, m); }
  crop(`${label}.png`, m, +x, +y);
}
if (SHEET_NAME && SHEET.length) {
  const Wt = 3 * P + 8; const H = SHEET.length * (P + 6) - 6; const all = new Uint8Array(Wt * H * 3).fill(128);
  SHEET.forEach((im, k) => all.set(im, k * (P + 6) * Wt * 3));
  writePng(join(OUT, SHEET_NAME), all, Wt, H); console.log(`${SHEET_NAME}: ${SHEET.length} crops`);
}

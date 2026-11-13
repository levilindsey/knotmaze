// K1325 s2: plain form B | self-plateau variants | rp=outline at spots, to judge a reference rule by eye.
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_s2_look.ts <scene> <x:y:label;...> [--v=inf,2] [--px=300]
//        [--w=4] [--out=.claude/probes/K1325/out/s2/look]
// Each --v is a cap (in zt) of the self plateau's z change (inf = the full plateau at self-crossings); --all gates
// every flagged crossing. Panels evaluate form B directly (no fillet), with the app's section paint; a red ring marks
// the spot (r = 0.6 h).
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { buildModel, plainOf, rasterOutline } from "../K1314/k1314_census";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { writePng } from "../K1314/k1314_crops";
import { selfPlateau } from "./k1325_s2_pz";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = opt("out") ?? ".claude/probes/K1325/out/s2/look"; mkdirSync(OUT, { recursive: true });
const P = Number(opt("px") ?? 300); const WH = Number(opt("w") ?? 4);
const caps = (opt("v") ?? "inf,2").split(",").map((v) => (v === "inf" ? Infinity : Number(v)));
const m = buildModel(pos[0]); const pl = plainOf(m); const col: RGB = [0, 0, 0];
const vs = caps.map((c) => selfPlateau(m, (_, self) => args.includes("--all") || self, c).F);
const evs = [pl, ...vs];
const comp = (ev: { ink: number; top: number; chain: number; s: number }): number[] => {
  let f = [1, 1, 1];
  if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(m.sp, ev.chain, ev.s); if (k >= 0) { runColour(m.sp.runs[k], ev.s, col); f = [col[0], col[1], col[2]]; } }
  const a = Math.min(1, Math.max(0, ev.ink)); return f.map((v) => Math.round(255 * v * (1 - a)));
};
for (const sp of pos[1].split(";")) {
  const [xs, ys, label] = sp.split(":"); const X = +xs; const Y = +ys;
  const h = m.scene.look.halfWidth; const ppu = P / (WH * h); const nP = evs.length + 1;
  const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
  const Wt = nP * (P + 4) - 4; const img = new Uint8Array(Wt * P * 3).fill(255);
  const put = (k: number, c: number, r: number, rgb: number[]): void => { const o = 3 * (r * Wt + k * (P + 4) + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; };
  evs.forEach((e, k) => { for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) put(k, c, r, comp(e.evalPoint((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu))); });
  const R = rasterOutline(m, c0, r0, P, P, ppu);
  for (let i = 0; i < P * P; i++) {
    const c = i % P; const r = (i - c) / P; const a = Math.min(1, Math.max(0, R.ink[i]));
    const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
    put(nP - 1, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
  }
  const rr = 0.6 * h * ppu; const cx = X * ppu - c0; const cy = Y * ppu - r0;
  for (let k = 0; k < nP; k++) for (let t = 0; t < 720; t++) {
    const c = Math.round(cx + rr * Math.cos(t * Math.PI / 360)); const r = Math.round(cy + rr * Math.sin(t * Math.PI / 360));
    if (c >= 0 && c < P && r >= 0 && r < P) put(k, c, r, [230, 0, 0]);
  }
  writePng(join(OUT, `${label}.png`), img, Wt, P);
  console.log(`${label}.png: plain | ${caps.join(" | ")} | outline`);
}

// K1325 s1: the brief's crops at its two spots, reference before | reference after | rp=outline, 4 h world wide.
//
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_crops.ts [--out=.claude/probes/K1325/out/s1] [--px=360]
//        [--spots=scene:x:y:label,...]   (default | --plateau | outline at each spot, e.g. the plateau census's finds)
//
// j30 (g41_user_tw64 7.55, 3.15): before = s9's reference (MARCH off: recordFail's marched V seed, --nomarch),
// after = this stage's (MARCH on). x304 (muse_hash 28.51, 18.01): before = the default reference, after = the
// opt-in plateau reference (--plateau, K922's overlap depth), which mends x304 but is not the default (see the
// handoff). Panels use the census's own evaluators (refEval, rasterOutline) and the app's section paint; a red
// ring marks the find (r = 0.6 h).
import { join } from "node:path";
import { buildModel, refEval, rasterOutline, PLATEAU, type Model } from "../K1314/k1314_census";
import { MARCH } from "../K1314/form_b_fillet";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { writePng } from "../K1314/k1314_crops";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = opt("out") ?? ".claude/probes/K1325/out/s1"; const P = Number(opt("px") ?? 360);
const col: RGB = [0, 0, 0];

function crop(file: string, mBefore: Model, mAfter: Model, X: number, Y: number, before: () => void, after: () => void): void {
  const h = mAfter.scene.look.halfWidth; const S = 4 * h; const ppu = P / S;
  const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
  const Wt = 3 * P + 8; const img = new Uint8Array(Wt * P * 3).fill(255);
  const put = (k: number, c: number, r: number, rgb: number[]): void => { const o = 3 * (r * Wt + k * (P + 4) + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; };
  const comp = (m: Model, ev: { ink: number; top: number; chain: number; s: number }): number[] => {
    let f = [1, 1, 1];
    if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(m.sp, ev.chain, ev.s); if (k >= 0) { runColour(m.sp.runs[k], ev.s, col); f = [col[0], col[1], col[2]]; } }
    const a = Math.min(1, Math.max(0, ev.ink)); return f.map((v) => Math.round(255 * v * (1 - a)));
  };
  for (const [k, m, set] of [[0, mBefore, before], [1, mAfter, after]] as const) {
    set();
    for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) put(k, c, r, comp(m, refEval(m, (c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu)));
  }
  const R = rasterOutline(mAfter, c0, r0, P, P, ppu);
  for (let i = 0; i < P * P; i++) {
    const c = i % P; const r = (i - c) / P; const a = Math.min(1, Math.max(0, R.ink[i]));
    const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
    put(2, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
  }
  const rr = 0.6 * h * ppu; const cx = X * ppu - c0; const cy = Y * ppu - r0;
  for (let k = 0; k < 3; k++) for (let t = 0; t < 720; t++) {
    const c = Math.round(cx + rr * Math.cos(t * Math.PI / 360)); const r = Math.round(cy + rr * Math.sin(t * Math.PI / 360));
    if (c >= 0 && c < P && r >= 0 && r < P) put(k, c, r, [230, 0, 0]);
  }
  writePng(join(OUT, file), img, Wt, P);
  console.log(`${file}: ${Wt}x${P}, ${S.toFixed(3)} world wide`);
}

// --spots=scene:x:y:label,... crops only those spots, default | --plateau | outline (the plateau census's finds).
const SP = opt("spots");
if (SP) {
  const models = new Map<string, Model>();
  for (const s of SP.split(",")) {
    const [nm, x, y, label] = s.split(":"); let m = models.get(nm);
    if (!m) { m = buildModel(nm); models.set(nm, m); }
    crop(`${label}.png`, m, m, +x, +y, () => { PLATEAU.on = false; }, () => { PLATEAU.on = true; });
  }
  PLATEAU.on = false;
} else {
  // j30: separate models, since the fillet (and recordFail's vfail list) is built once per model.
  MARCH.on = false; const j0 = buildModel("g41_user_tw64");
  MARCH.on = true; const j1 = buildModel("g41_user_tw64");
  crop("j30_before_after_outline.png", j0, j1, 7.55, 3.15, () => { MARCH.on = false; }, () => { MARCH.on = true; });
  // x304: one model; refEval reads PLATEAU.on per call.
  const mx = buildModel("muse_hash");
  crop("x304_before_plateau_outline.png", mx, mx, 28.51, 18.01, () => { PLATEAU.on = false; }, () => { PLATEAU.on = true; });
  PLATEAU.on = false;
}

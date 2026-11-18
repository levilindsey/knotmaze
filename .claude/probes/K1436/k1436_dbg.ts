// K1436 debug: the band sites near a world point (both sides), sorted by angle about the point
import { makeJudge, tablesOf, rasterJudge, bandSites, loadEval } from "./k1436_lib.ts";
const [which, nm, xs, ys, rs] = process.argv.slice(2); const X = +xs, Y = +ys; const RAD = rs ? +rs : 20;
const G = which === "src" ? (await import("../../../src/render/gpu_field/eval.ts")).GfEval : await loadEval(which);
const T = tablesOf(nm); const ppu = +(process.env.PPU ?? 480 / (2.5 * T.h)); const N = 2 * Math.ceil((T.W * 1.5 + 3 * T.aa) * ppu + 12 + RAD + 100);
const c0 = Math.round(X * ppu) - N / 2, r0 = Math.round(Y * ppu) - N / 2;
const R = rasterJudge(makeJudge(new G(T)), c0, r0, N, N, ppu); const S = bandSites(R, T); const WP = T.W * ppu;
const out: string[] = [];
for (let k = 0; k < S.n; k++) { const dx = S.x[k] + S.nx[k] * Math.max(0, S.wIn[k]) - N / 2, dy = S.y[k] + S.ny[k] * Math.max(0, S.wIn[k]) - N / 2; if (Math.hypot(dx, dy) > RAD) continue; out.push(`${dx.toFixed(1)}\t${dy.toFixed(1)}\tn ${S.nx[k].toFixed(2)},${S.ny[k].toFixed(2)}\twIn ${S.wIn[k].toFixed(2)}\tlvl ${S.lvl[k].toFixed(2)}\tres ${S.res[k].toFixed(2)}\tcut ${S.cut[k].toFixed(1)}\tcore ${S.core[k].toFixed(2)}\tpast ${S.past[k].toFixed(2)}\tf ${S.why[k]}`); }
console.log(`ppu ${ppu.toFixed(1)} WP ${WP.toFixed(2)} aaP ${(T.aa * ppu).toFixed(2)}`); console.log(out.join("\n"));

// K1438: how many ramping pieces each inked pixel mixes (nr, capped at MAXR in eval), with the switch as the env sets
// it: the share of inked pixels with nr >= 1 (gf_glsl's zc depth class sends them to P1), nr >= 2, and nr > MAXR (the
// overflow eval rounds to 0 / 1). A ramping piece = member() returned a group with 0 < ramp < 1.
//   node scripts/run_node.mjs .claude/probes/K1438/k1438_ramps.ts <scene> <ppu>
import { modelOf, tablesOf } from "../K1433/k1433_lib.ts";
import { loadEv } from "./k1438_ev.ts";
import { MAXR } from "../../../src/render/gpu_field/eval.ts";
const [nm, ppuS] = process.argv.slice(2);
const ppu = +ppuS; const mk = await loadEv();
const T = tablesOf(nm); modelOf(nm);
const E = mk(T);
let nr = 0;
const om = E.member;
E.member = function (c: number, s: number, z: number): void { om.call(this, c, s, z); if (this.mg >= 0 && this.mramp > 0 && this.mramp < 1) nr++; };
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const pad = T.h * 2; const c0 = Math.floor((x0 - pad) * ppu), r0 = Math.floor((y0 - pad) * ppu);
const w = Math.ceil((x1 + pad) * ppu) - c0, h = Math.ceil((y1 + pad) * ppu) - r0;
let act = 0, r1 = 0, r2 = 0, rOver = 0;
for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
  nr = 0; const o = E.eval((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
  if (!(o.cov > 0 || o.ink > 0)) continue;
  act++; if (nr >= 1) r1++; if (nr >= 2) r2++; if (nr > MAXR) rOver++;
}
const pct = (n: number) => (100 * n / act).toFixed(3);
console.log(`${nm}\thome ${process.env.GF_HOME ?? ""}\tfl ${process.env.K1438_FL ?? "default"}\tppu ${ppu}\tinked ${act}\tnr>=1 ${r1} (${pct(r1)}%)\tnr>=2 ${r2} (${pct(r2)}%)\tnr>MAXR ${rOver} (${pct(rOver)}%)`);

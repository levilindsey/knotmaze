// K1438: two evaluators over one whole scene, pixel by pixel (every GfPixel field), on the same tables.
//   node scripts/run_node.mjs .claude/probes/K1438/k1438_eq.ts <scene> <ppu> <evA> <evB>
// ev = m (master's eval.ts) | tgr (K1435's mode on master) | src | src@<fadeLength> | src@tgr (fadeLength 0.3 win:
// Z = 3 zt, tgr's ramp). src reads the tables' switch (env GF_HOME=1).
import { tablesOf } from "../K1433/k1433_lib.ts";
const [nm, ppuS, eA, eB] = process.argv.slice(2);
const ppu = +ppuS; const T = tablesOf(nm);
async function mk(e: string): Promise<any> {
  if (e === "m") return new (await import("./eval_m.ts")).GfEval(T);
  if (e === "tgr") { const G = (await import("./eval_tgr.ts")).GfEval; G.MODE = "tgr"; return new G(T); }
  const E = new (await import("../../../src/render/gpu_field/eval.ts")).GfEval(T);
  const at = e.split("@")[1]; if (at === "tgr") E.fadeLength = 0.3 * T.win; else if (at !== undefined) E.fadeLength = +at;
  return E;
}
const A = await mk(eA); const B = await mk(eB);
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const pad = T.h * 2; const c0 = Math.floor((x0 - pad) * ppu), r0 = Math.floor((y0 - pad) * ppu);
const w = Math.ceil((x1 + pad) * ppu) - c0, h = Math.ceil((y1 + pad) * ppu) - r0;
const F = ["ink", "cov", "chain", "s", "winKind", "winA", "winB", "nSeg", "nK"] as const;
let n = 0, exact = 0, maxInk = 0, inked = 0; const firstBad: string[] = [];
for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
  const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  const a = { ...A.eval(x, y) }; const b = B.eval(x, y); n++;
  if (a.ink > 0 || b.ink > 0) inked++;
  let same = true; for (const k of F) if (!Object.is(a[k], b[k])) same = false;
  if (same) exact++; else if (firstBad.length < 5) firstBad.push(`${x.toFixed(3)},${y.toFixed(3)} ` + F.filter((k) => !Object.is(a[k], b[k])).map((k) => `${k} ${a[k]} vs ${b[k]}`).join("; "));
  maxInk = Math.max(maxInk, Math.abs(a.ink - b.ink));
}
console.log(`${nm} ppu ${ppu} ${w}x${h}: ${eA} vs ${eB}: ${n - exact} of ${n} px differ (inked ${inked}), max |d ink| ${maxInk.toExponential(2)}`);
for (const s of firstBad) console.log("  " + s);

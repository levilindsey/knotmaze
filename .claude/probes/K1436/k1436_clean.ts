// K1436: candidate clean stretches for the recall check - per scene, seeded random points on PLAIN crossings (an
// exposed edge between two covered pixels of different chains, both class plain, no junction group) and PLAIN
// junctions (a covered pixel of a junction group, class plain, on an exposed edge), picked by geometry only (never by
// the test's finds). Rows go to a sheet (k1436_sheet.ts) to be judged clean by eye; the scan's finds near each are
// then read from its JSON.
//   node scripts/run_node.mjs .claude/probes/K1436/k1436_clean.ts <out.tsv> <scene,...> [perKind=2] [seed=7] [ppu=100]
import { writeFileSync } from "node:fs";
import { makeJudge, modelOf, tablesOf, rasterJudge, sameFn } from "./k1436_lib.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [out, scenes, perS, seedS, ppuS] = process.argv.slice(2);
const per = perS ? +perS : 2; let seed = seedS ? +seedS : 7; const ppu = ppuS ? +ppuS : 100;
const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rows: string[] = [];
for (const nm of scenes.split(",")) {
  const T = tablesOf(nm); modelOf(nm);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const c0 = Math.floor(x0 * ppu), r0 = Math.floor(y0 * ppu); const w = Math.ceil(x1 * ppu) - c0, h = Math.ceil(y1 * ppu) - r0;
  const R = rasterJudge(makeJudge(new GfEval(T)), c0, r0, w, h, ppu); const same = sameFn(R, T);
  const cross: number[] = [], junc: number[] = [];
  for (let r = 2; r < h - 2; r++) for (let c = 2; c < w - 2; c++) {
    const i = r * w + c; if (R.cov[i] <= 0.5 || R.cls[i] !== 0) continue;
    let edge = false, other = false;
    for (const q of [i + 1, i - 1, i + w, i - w]) if (!same(i, q)) { edge = true; if (R.cov[q] > 0.5 && R.chain[q] !== R.chain[i] && R.cls[q] === 0) other = true; }
    if (!edge) continue;
    if (R.grp[i] >= 0) junc.push(i); else if (other) cross.push(i);
  }
  const pick = (a: number[], kind: string): void => {
    const got: number[] = [];
    for (let t = 0; t < 400 && got.length < per && a.length; t++) {
      const i = a[Math.floor(rnd() * a.length)]; const x = (c0 + (i % w) + 0.5) / ppu, y = (r0 + Math.floor(i / w) + 0.5) / ppu;
      if (got.some((g) => Math.hypot((c0 + (g % w) + 0.5) / ppu - x, (r0 + Math.floor(g / w) + 0.5) / ppu - y) < 3 * T.h)) continue;
      got.push(i); rows.push(`${nm}\t${x.toFixed(3)}\t${y.toFixed(3)}\t${kind}\tplain`);
    }
  };
  pick(cross, "crossing"); pick(junc, "junction");
  console.error(`${nm}: ${cross.length} crossing px, ${junc.length} junction px`);
}
writeFileSync(out, rows.join("\n") + "\n"); console.log(rows.join("\n"));

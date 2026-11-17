// K1435: a sheet from the 480 px panels (.bin) of k1435_spots: one row per spot, one column per suffix.
//   node scripts/run_node.mjs .claude/probes/K1435/k1435_sheet.ts <panelDir> <out.png> <sfx,sfx,...> <scene:x:y,...>
// A 6 px grey gutter separates cells; the column order is the suffix list (also written to <out>.txt with the rows).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writePng } from "../K1314/k1314_crops.ts";
const [dir, out, sfxS, list] = process.argv.slice(2);
const sfx = sfxS.split(","); const spots = list.split(","); const P = 480; const Gt = 6;
const W = sfx.length * (P + Gt) + Gt; const H = spots.length * (P + Gt) + Gt;
const img = new Uint8Array(W * H * 3).fill(128);
const rows: string[] = [`columns: ${sfx.join(" | ")}`];
spots.forEach((spec, r) => {
  const [nm, xs, ys] = spec.split(":"); const base = `${nm}_${(+xs).toFixed(2)}_${(+ys).toFixed(2)}`; rows.push(`row ${r + 1}: ${spec}`);
  sfx.forEach((sf, c) => {
    let b: Uint8Array; try { b = readFileSync(join(dir, `${base}_${sf}.bin`)); } catch { return; }
    const x0 = Gt + c * (P + Gt); const y0 = Gt + r * (P + Gt);
    for (let y = 0; y < P; y++) img.set(b.subarray(y * P * 3, (y + 1) * P * 3), ((y0 + y) * W + x0) * 3);
  });
});
writePng(out, img, W, H); writeFileSync(out.replace(/\.png$/, ".txt"), rows.join("\n") + "\n");
console.log(`${out} ${W}x${H}`);

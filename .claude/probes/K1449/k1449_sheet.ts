// K1449: spot sheets from k1449_spots.ts panels (.bin, 480 px, halved to 240): one row per spot, columns
// K1439 gfh (src) | new gfh at fl 0, then the default, then 1.2, and rp=outline last. One sheet per scene.
//   node scripts/run_node.mjs .claude/probes/K1449/k1449_sheet.ts <panelDir> <outPrefix> <oldSfx> <newSfx> <scene:x:y,...>
// Panel suffixes: <oldSfx>_<fl> and <newSfx>_<fl> for fl in 0, d, 1.2, and ol.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writePng } from "../K1314/k1314_crops.ts";
const [dir, outPrefix, oldS, newS, list] = process.argv.slice(2);
const P = 480, Q = 240, G = 4;
const cols = [`${oldS}_0`, `${newS}_0`, `${oldS}_d`, `${newS}_d`, `${oldS}_1.2`, `${newS}_1.2`, "ol"];
const byScene = new Map<string, string[]>();
for (const spec of list.split(",")) { const nm = spec.split(":")[0]; if (!byScene.has(nm)) byScene.set(nm, []); byScene.get(nm)!.push(spec); }
for (const [nm, specs] of byScene) {
  const W = cols.length * (Q + G) + G, H = specs.length * (Q + G) + G;
  const img = new Uint8Array(W * H * 3).fill(128);
  specs.forEach((spec, r) => {
    const [, xs, ys] = spec.split(":"); const base = `${nm}_${(+xs).toFixed(2)}_${(+ys).toFixed(2)}`;
    cols.forEach((sfx, c) => {
      const b = readFileSync(join(dir, `${base}_${sfx}.bin`));
      for (let y = 0; y < Q; y++) for (let x = 0; x < Q; x++) for (let q = 0; q < 3; q++) {
        const v = (b[3 * ((2 * y) * P + 2 * x) + q] + b[3 * ((2 * y) * P + 2 * x + 1) + q] + b[3 * ((2 * y + 1) * P + 2 * x) + q] + b[3 * ((2 * y + 1) * P + 2 * x + 1) + q]) / 4;
        img[3 * ((G + r * (Q + G) + y) * W + G + c * (Q + G) + x) + q] = Math.round(v);
      }
    });
  });
  writePng(`${outPrefix}_${nm}.png`, img, W, H);
  writeFileSync(`${outPrefix}_${nm}.txt`, `columns: ${cols.join(" | ")}\n` + specs.map((s, i) => `row ${i + 1}: ${s}`).join("\n") + "\n");
  console.log(`${outPrefix}_${nm}.png`);
}
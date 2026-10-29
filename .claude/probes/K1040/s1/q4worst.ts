// K1040 S1, question 4's follow-up: why fade pixels differ from exact area
// coverage by up to 1. Re-evaluates q4's worst fade sites (out/q4/<scene>.json)
// in the AA'd form B and in hard ones (aa = 1e-4 and 0.25 device px).
// Run: npx vite-node .claude/probes/K1040/s1/q4worst.ts [scene...]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, TERM_NAMES, type PixelEval } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const fmt = (r: PixelEval) => `ink ${r.ink.toFixed(3)} top ${r.top} ${r.term ? TERM_NAMES[r.term.kind] : "none"} f${r.fade} nSurf ${r.nSurf} Dexp ${r.Dexp.toFixed(4)}`;
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["def", "ring"]) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const fbAA = new FormB(s);
  const ppu = fbAA.ppuDev;
  const fbHard = new FormB(s, { aa: 1e-4 / ppu });
  const fbQ = new FormB(s, { aa: 0.25 / ppu });
  const q4 = JSON.parse(readFileSync(join(here, "out", "q4", `${name}.json`), "utf8")) as { table: Record<string, { worst: { at: [number, number]; aa: number; exact: number }[] }> };
  console.log(`== ${name} (ppuDev ${ppu.toFixed(2)}, W ${(fbAA.W * ppu).toFixed(2)} px)`);
  for (const [k, row] of Object.entries(q4.table)) {
    if (!k.includes("fade") || !row.worst.length) continue;
    for (const w of row.worst.slice(0, 3)) {
      const [x, y] = w.at;
      console.log(` ${k} at (${x}, ${y}): q4 aa ${w.aa} exact ${w.exact}`);
      console.log(`   AA   ${fmt(fbAA.evalPoint(x, y))}`);
      console.log(`   0.25 ${fmt(fbQ.evalPoint(x, y))}`);
      console.log(`   hard ${fmt(fbHard.evalPoint(x, y))}`);
    }
  }
}

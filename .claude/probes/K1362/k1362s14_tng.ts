// K1362 s14: per scene, the corners the cells list and how many are non-thru (kThru <= 0.5: the only corners with
// tangent faces, the TANGENT block). A frame with none could draw a corner program without TANGENT.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s14_tng.ts <sceneDir> [w] [h]
import { readFileSync, readdirSync } from "node:fs";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";

const dir = process.argv[2]; const W = +(process.argv[3] ?? 822); const H = +(process.argv[4] ?? 1506); const FIT = 0.917;
const SCENES = ["def", "muse_hash", "fat", "g41_ring_tw64", "g41_def_tw64", "user_tw42.lightpaper", "g41_user_tw42", "muse_default_tw", "ring", "g41_def_tw42", "g41_user_tw64", "g41_ring_tw42"];
for (const file of readdirSync(dir).filter((f) => SCENES.includes(f.replace(/\.json$/, ""))).sort()) {
  const scene = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  scene.look ??= {}; scene.look.ctrlArc ??= 0.47;
  let T: GfTables = buildTables(scene, { aa: 0.01 });
  for (let k = 0; k < 2; k++) {
    const bw = T.gW * T.G; const bh = T.gH * T.G;
    const s = FIT * Math.min(W / bw, H / bh);
    T = buildTables(scene, { aa: 0.5 / s });
  }
  const listed = new Set<number>(); let cells = 0; let cellsTng = 0;
  for (let c = 0; c < T.cellKN.length; c++) {
    const k0 = T.cellK0[c], kn = T.cellKN[c]; if (kn === 0) continue;
    cells++; let tng = false;
    for (let q = k0; q < k0 + kn; q++) { const k = T.cellKList[q]; listed.add(k); if (!(T.kThru[k] > 0.5)) tng = true; }
    if (tng) cellsTng++;
  }
  let nonThru = 0; for (const k of listed) if (!(T.kThru[k] > 0.5)) nonThru++;
  console.log(`${file.replace(/\.json$/, "").padEnd(22)} corners listed ${String(listed.size).padStart(4)} non-thru ${String(nonThru).padStart(4)} | corner cells ${String(cells).padStart(5)} with a non-thru ${String(cellsTng).padStart(5)}`);
}

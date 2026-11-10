// K1247 s13: how many real crossing cuts the hit window rejects per scene at rest
// (outline.ts hitWinStats; K13_NOHITWIN=1 shows 0).
// Usage: node scripts/run_node.mjs <this> [scene,...]
import { structure, frame, hitWinStats } from "./outline";
import { ALL, load } from "./k1247s5_scenes";
const names = process.argv[2] ? process.argv[2].split(",") : ALL;
let tot = 0;
for (const nm of names) {
  const sc = load(nm); hitWinStats.out = 0;
  frame(structure(sc), sc);
  tot += hitWinStats.out;
  console.log(`${nm}: ${hitWinStats.out} hits outside the window`);
}
console.log(`total ${tot}`);
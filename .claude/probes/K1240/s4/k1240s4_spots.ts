// K1240 S4: the world spots of the crop rows (cut 273 from the port's table).
//   node scripts/run_node.mjs .claude/probes/K1240/s4/k1240s4_spots.ts <scene> <cut>...
import { buildOutline } from "../../../../src/render/outline/outline";
import { loadScene } from "../../../../test/render/outline_digest";
const [name, ...cs] = process.argv.slice(2);
const s = loadScene(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`);
const t = buildOutline(s);
console.log(`${name}: ${t.cuts.length} cuts`);
for (const c of cs) { const k = t.cuts[+c]; console.log(JSON.stringify({ cut: +c, ...k })); }
import { buildModel } from "../K1314/k1314_census";
import { K1346 } from "../../../src/render/outline/outline";
console.log("j58", K1346.j58);
const m = buildModel("muse_hash"); const p = m.table.pieces[371] as any; const np = p.pts.length >> 1;
console.log(Array.from({ length: np }, (_, i) => i + ":" + p.alpha[2 * i].toFixed(2) + "/" + p.alpha[2 * i + 1].toFixed(2)).join(" "));

import { loadScene } from "./k1314_census";
const sc = loadScene("muse_hash");
for (const id of [1, 8]) { const c = sc.chains.find((q) => q.id === id)!; const n = c.pts.length / 2; console.log(`c${id} closed ${c.closed} start ${c.pts[0].toFixed(3)} ${c.pts[1].toFixed(3)} end ${c.pts[2*n-2].toFixed(3)} ${c.pts[2*n-1].toFixed(3)}`); }

// K1228: whole-frame diff, master against mine, with attribution:
// every changed pixel must lie within one half-width of a sample whose
// radius is under 1.05 h (tight.json from tight.mjs / knot.mjs /
// textgeo.mjs: {hDev, tight: [{x, y}]}), or it is reported as an
// unexplained cluster to crop and name (Done 5).
//   node diffa.mjs <master.png> <mine.png> <tight.json> <label>
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";

const [aF, bF, tF, label] = process.argv.slice(2);
const A = toRGB(decodePNG(readFileSync(aF)));
const B = toRGB(decodePNG(readFileSync(bF)));
const T = JSON.parse(readFileSync(tF, "utf8"));
const h = T.hDev;
const CELL = 64;
const grid = new Map();
const gk = (x, y) => x * 100000 + y;
T.tight.forEach((p, i) => {
  for (let cy = Math.floor((p.y - h) / CELL); cy <= Math.floor((p.y + h) / CELL); cy++)
    for (let cx = Math.floor((p.x - h) / CELL); cx <= Math.floor((p.x + h) / CELL); cx++) {
      const k = gk(cx, cy);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
});
const nearTight = (x, y) => {
  const refs = grid.get(gk(Math.floor(x / CELL), Math.floor(y / CELL))) || [];
  for (const i of refs) if (Math.hypot(T.tight[i].x - x, T.tight[i].y - y) <= h) return true;
  return false;
};
let changed = 0;
const un = new Map();
for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
  const o = (y * A.W + x) * 3;
  if (A.data[o] === B.data[o] && A.data[o + 1] === B.data[o + 1] && A.data[o + 2] === B.data[o + 2]) continue;
  changed++;
  if (!nearTight(x + 0.5, y + 0.5)) un.set(y * A.W + x, [x, y]);
}
const seen = new Set();
const clusters = [];
for (const [k, [x, y]] of un) {
  if (seen.has(k)) continue;
  const stack = [[x, y]];
  seen.add(k);
  const px = [];
  while (stack.length) {
    const [qx, qy] = stack.pop();
    px.push([qx, qy]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const kk = (qy + dy) * A.W + (qx + dx);
      if (un.has(kk) && !seen.has(kk)) { seen.add(kk); stack.push([qx + dx, qy + dy]); }
    }
  }
  clusters.push({
    n: px.length,
    cx: Math.round(px.reduce((s, p) => s + p[0], 0) / px.length),
    cy: Math.round(px.reduce((s, p) => s + p[1], 0) / px.length),
  });
}
clusters.sort((p, q) => q.n - p.n);
console.log(`${label}: ${A.W}x${A.H} changed ${changed}, unexplained ${un.size} in ${clusters.length} clusters`);
for (const c of clusters.slice(0, 20)) console.log(`  unexplained n=${c.n} at ${c.cx},${c.cy}`);
writeFileSync(new URL(`./out/diff_${label}.json`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  JSON.stringify({ label, changed, unexplained: un.size, clusters }, null, 1));

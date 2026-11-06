// K1218 S4: hard gold/other adjacencies - a pixel within TOL of the gold next
// to (4-neighbour) a light pixel far from gold, nothing between: the gold's
// staircase against an arm's colour. Grouped by the nearest junction record
// of <dir>/meta.json within R px (else "far").
//   node hard_s4.mjs <dir> <png> [R=60] [tol=14] [top=20]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";
const [, , DIR, PNG, RAD = "60", TOL = "14", TOP = "20"] = process.argv;
const im = toRGB(decodePNG(readFileSync(join(DIR, PNG))));
const m = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const dsf = m.dsf || 1.5, R = Number(RAD), tol = Number(TOL);
const recs = m.recs.map((r) => ({ ji: r.ji, x: r.sx * dsf, y: r.sy * dsf, routed: r.routes.length, n: 0, pts: [] }));
const far = { ji: "far", n: 0, pts: [] };
const px = (x, y) => { const o = (y * im.W + x) * 3; return [im.data[o], im.data[o + 1], im.data[o + 2]]; };
const GOLD = [236, 205, 65];
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const isGold = (c) => dist(c, GOLD) <= tol;
const isOther = (c) => dist(c, GOLD) > 90 && lum(c) > 110 && c[2] > 110;
for (let y = 1; y < im.H - 1; y++) for (let x = 1; x < im.W - 1; x++) {
  const c = px(x, y);
  if (!isGold(c)) continue;
  let hit = false;
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (isOther(px(x + dx, y + dy))) hit = true;
  if (!hit) continue;
  let best = far, bd = R * R;
  for (const r of recs) { const d = (r.x - x) ** 2 + (r.y - y) ** 2; if (d < bd) { bd = d; best = r; } }
  best.n++; best.pts.push([x, y]);
}
const list = [...recs.filter((r) => r.n), ...(far.n ? [far] : [])].sort((a, b) => b.n - a.n);
console.log(`${DIR}/${PNG}: ${list.reduce((s, r) => s + r.n, 0)} hard gold px`);
for (const r of list.slice(0, Number(TOP))) {
  const xs = r.pts.map((p) => p[0]), ys = r.pts.map((p) => p[1]);
  console.log(`  ji ${r.ji}${r.routed ? " (routed)" : ""}: ${r.n} px, box ${Math.min(...xs)},${Math.min(...ys)}-${Math.max(...xs)},${Math.max(...ys)}`);
}


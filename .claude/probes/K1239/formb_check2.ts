// K1239: classify FormB band misses by proximity to junctions/crossings/ends.
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene } from "../../../src/render/field/scene";

const file = process.argv[2] ?? ".claude/probes/K1239/out/diag_def.json";
const d = JSON.parse(readFileSync(file, "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const h = scene.look.halfWidth, W = scene.look.band;
const jn = scene.junctions.map((j) => j.c);
const crossPts: [number, number][] = [];
// crossing centres: point at s on chain (approx via poly pts cumulative)
function ptAt(c: { pts: number[]; closed: boolean }, s: number): [number, number] {
  const pts = c.pts, n = pts.length / 2;
  let acc = 0;
  const segs = c.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const dx = pts[j * 2] - pts[i * 2], dy = pts[j * 2 + 1] - pts[i * 2 + 1];
    const l = Math.hypot(dx, dy);
    if (acc + l >= s) { const t = l ? (s - acc) / l : 0; return [pts[i * 2] + dx * t, pts[i * 2 + 1] + dy * t]; }
    acc += l;
  }
  return [pts[0], pts[1]];
}
for (const x of scene.crossings) crossPts.push(ptAt(scene.chains[x.a.chain], x.a.s));
const near = (x: number, y: number, list: [number, number][], r: number) => list.some(([a, b]) => Math.hypot(a - x, b - y) < r);
let tot = 0, miss = 0, missJn = 0, missX = 0, missEnd = 0, missFree: { x: number; y: number; chain: number; s: number }[] = [];
for (const c of scene.chains) {
  const pts = c.pts, n = pts.length / 2;
  let sAcc = 0;
  for (let i = 0; i < n; i += 2) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    const ip = Math.max(0, i - 1), inx = Math.min(n - 1, i + 1);
    let tx = pts[inx * 2] - pts[ip * 2], ty = pts[inx * 2 + 1] - pts[ip * 2 + 1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    if (i > 0) sAcc += Math.hypot(x - pts[(i - 1) * 2], y - pts[(i - 1) * 2 + 1]) * 1; // approx (step 2 samples, rough)
    for (const side of [1, -1]) {
      const px = x - ty * side * (h - W / 2), py = y + tx * side * (h - W / 2);
      const ev = fb.evalPoint(px, py);
      tot++;
      if (ev.ink <= 0.5) {
        miss++;
        if (near(px, py, jn, 3 * h)) missJn++;
        else if (near(px, py, crossPts, 2.5 * h)) missX++;
        else if (i < 4 || i > n - 5) missEnd++;
        else if (missFree.length < 4000) missFree.push({ x: px, y: py, chain: c.id, s: sAcc });
      }
    }
  }
}
console.log(`band samples ${tot} miss ${miss} (${(miss / tot).toFixed(3)}): nearJn ${missJn}, nearX ${missX}, nearChainEnd ${missEnd}, free ${miss - missJn - missX - missEnd}`);
const byChain = new Map<number, number>();
for (const m of missFree) byChain.set(m.chain, (byChain.get(m.chain) ?? 0) + 1);
console.log("free misses by chain:", [...byChain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15));
console.log("sample free misses:", missFree.slice(0, 10));

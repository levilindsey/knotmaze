// K1247 s17: given regions' faces at frames F-1 and F near a point: their
// vertices within a radius (px), and for each F-1 vertex its distance to the
// same region's face polyline at F (the gain tool's measure), with the
// nearest F segment's index.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s17_face.ts <F> <regions,..> <xpx,ypx> [radpx=4] [scene]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";
const a = process.argv.slice(2);
const F = +a[0]; const RS = a[1].split(",").map(Number); const [X, Y] = a[2].split(",").map(Number); const R = +(a[3] ?? 4);
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (a[4] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const S = sc[0].camera.pxPerUnit * 2;
const faces: Map<number, { pts: number[]; owner: number; hole: boolean }[]>[] = [];
for (let f = 0; f <= F; f++) {
  const t = frame(st, sc[f]);
  if (f < F - 1) continue;
  const rid = new Map<number[], number>(); t.regions.forEach((r, i) => rid.set(r.pts, i));
  const m = new Map<number, { pts: number[]; owner: number; hole: boolean }[]>();
  for (const x of t.faces) { const r = rid.get(x.pts); if (r === undefined || !RS.includes(r)) continue; if (!m.has(r)) m.set(r, []); m.get(r)!.push({ pts: Array.from(x.pts, (v) => v * S), owner: x.ownerChain, hole: !!x.hole }); }
  faces.push(m);
}
const segD = (px: number, py: number, P: number[]): [number, number] => {
  let best = Infinity, bi = -1; const n = P.length >> 1;
  for (let j = 0; j < n; j++) { const k = (j + 1) % n; const ax = P[2 * j], ay = P[2 * j + 1], bx = P[2 * k], by = P[2 * k + 1]; const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy; let u = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; u = Math.max(0, Math.min(1, u)); const d = Math.hypot(ax + u * dx - px, ay + u * dy - py); if (d < best) { best = d; bi = j; } }
  return [best, bi];
};
for (const r of RS) {
  for (let w = 0; w < 2; w++) {
    const list = faces[w].get(r) ?? [];
    list.forEach((fc, fi) => {
      const n = fc.pts.length >> 1; const rows: string[] = [];
      for (let i = 0; i < n; i++) {
        const x = fc.pts[2 * i], y = fc.pts[2 * i + 1]; if (Math.hypot(x - X, y - Y) > R) continue;
        let d = "";
        if (w === 0) { const o = faces[1].get(r)?.[fi]; if (o) { const [dd, j] = segD(x, y, o.pts); d = ` -> F dist ${dd.toFixed(3)} (seg ${j})`; } }
        rows.push(`    ${i} (${x.toFixed(3)},${y.toFixed(3)})${d}`);
      }
      console.log(`f${F - 1 + w} region ${r} face ${fi} owner ${fc.owner}${fc.hole ? " hole" : ""} n${n}:\n${rows.join("\n")}`);
    });
  }
}

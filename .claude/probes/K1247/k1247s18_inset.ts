// K1247 s18: is the records' side row inset? For a rest scene (K868 scenes), every strip side vertex
// at an interior column: on minus the off border's nearest point (the off side row as a polyline),
// signed along on's outward normal (from the centre row), in world units; percentiles, and the share
// below -0.0125 (half a census pixel at 40 px/unit), split by convex/concave (the turn of on's side).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_inset.ts <sceneName>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";

const nm = process.argv[2];
const scene = JSON.parse(readFileSync(join("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes", `${nm}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene); const tb = frame(st, scene); const fs = fillStructure(st, fillResolution(st, tb)); const zz = zChains(scene);
const off = Float64Array.from(fillFrame(fs, st, tb, scene, zz).pos);
const on = fillFrame(fs, st, tb, { ...scene, look: { ...scene.look, fillRec: 1 } } as SceneIn, zz).pos;
const dv: number[] = []; let inCv = 0; let inCc = 0; let nCv = 0; let nCc = 0;
for (const it of fs.items) {
  if (it.kind !== "strip") continue;
  const W = it.N + 1;
  for (const row of [0, 2]) {
    const b = it.base + row * W;
    for (let i = 1; i < it.N; i++) {
      const v = b + i; const c = it.base + W + i;
      let ox = on[2 * v] - on[2 * c]; let oy = on[2 * v + 1] - on[2 * c + 1]; const l = Math.hypot(ox, oy); if (l < 1e-9) continue; ox /= l; oy /= l;
      // The nearest point on the off side row (a polyline), searched near column i.
      let bd = Infinity; let bx = 0; let by = 0;
      for (let j = Math.max(0, i - 12); j < Math.min(it.N, i + 12); j++) {
        const ax = off[2 * (b + j)]; const ay = off[2 * (b + j) + 1]; const ex = off[2 * (b + j + 1)] - ax; const ey = off[2 * (b + j + 1) + 1] - ay;
        const ll = ex * ex + ey * ey; const t = ll > 0 ? Math.min(1, Math.max(0, ((on[2 * v] - ax) * ex + (on[2 * v + 1] - ay) * ey) / ll)) : 0;
        const px = ax + ex * t; const py = ay + ey * t; const d = (on[2 * v] - px) ** 2 + (on[2 * v + 1] - py) ** 2;
        if (d < bd) { bd = d; bx = px; by = py; }
      }
      const sd = (on[2 * v] - bx) * ox + (on[2 * v + 1] - by) * oy; dv.push(sd);
      // Convex where the side row turns away from the centre: its neighbours' midpoint lies inward of v.
      const mx = (on[2 * (v - 1)] + on[2 * (v + 1)]) / 2 - on[2 * v]; const my = (on[2 * (v - 1) + 1] + on[2 * (v + 1) + 1]) / 2 - on[2 * v + 1];
      const convex = mx * ox + my * oy < 0;
      if (convex) { nCv++; if (sd < -0.0125) inCv++; } else { nCc++; if (sd < -0.0125) inCc++; }
    }
  }
}
const s = Float64Array.from(dv).sort(); const q = (p: number): string => s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(4);
console.log(`${nm}: ${s.length} side vertices; signed (on - off border) along outward, world: p0.1 ${q(0.001)} p1 ${q(0.01)} p10 ${q(0.1)} p50 ${q(0.5)} p90 ${q(0.9)} p99 ${q(0.99)}`);
console.log(`  inset > 0.0125 (half a census px): convex ${inCv}/${nCv} (${(100 * inCv / nCv).toFixed(2)}%), concave ${inCc}/${nCc} (${(100 * inCc / nCc).toFixed(2)}%)`);

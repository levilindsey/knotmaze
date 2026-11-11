// K1277: sanity of the triangle fill's structure on one scene.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1277_check.ts [scene...]
// Prints the structure (items, vertices, triangles, missing arm ends), the
// frame's fallbacks, and how far each junction ring's P / N sit from the
// region polygon's points (they should coincide: same pieces).
import { structure, frame } from "./outline";
import { loadScene } from "./k1279_census";
import { fillResolution, fillStructure, fillFrame, fillSig } from "./fill_tri";

for (const nm of process.argv.slice(2).length ? process.argv.slice(2) : ["def"]) {
  const scene = loadScene(nm);
  const st = structure(scene);
  const t = frame(st, scene);
  const res = fillResolution(st, t);
  const fs = fillStructure(st, res);
  const fr = fillFrame(fs, st, t, scene);
  const kinds: Record<string, number> = {};
  for (const it of fs.items) kinds[it.kind + (it.kind === "strip" && it.ghost ? "G" : "")] = (kinds[it.kind + (it.kind === "strip" && it.ghost ? "G" : "")] ?? 0) + 1;
  console.log(`${nm}: items ${JSON.stringify(kinds)} nV ${fs.nV} tris ${fs.idx.length / 3} missingArmEnds ${fs.missingArmEnds} fallbacks ${fr.fallbacks} sig ${fillSig(fs)}`);
  // Every junction ring vertex P / N should be a vertex of some region polygon.
  const regPts = new Map<string, number>();
  const q = (x: number, y: number): string => `${Math.round(x * 1e5)},${Math.round(y * 1e5)}`;
  for (const r of t.regions) for (let i = 0; i < r.pts.length; i += 2) regPts.set(q(r.pts[i], r.pts[i + 1]), r.id);
  let jv = 0; let jhit = 0; let worst = 0;
  for (const it of fs.items) {
    if (it.kind !== "junc") continue;
    for (let k = 0; k < it.arms.length; k++) for (const o of [0, 1]) {
      const v = it.base + 1 + k * (2 + 16) + o; jv++;
      const x = fr.pos[2 * v]; const y = fr.pos[2 * v + 1];
      if (regPts.has(q(x, y))) jhit++;
      else {
        let best = Infinity;
        for (const r of t.regions) for (let i = 0; i < r.pts.length; i += 2) best = Math.min(best, Math.hypot(r.pts[i] - x, r.pts[i + 1] - y));
        worst = Math.max(worst, best);
      }
    }
  }
  console.log(`  junction P/N on a region vertex: ${jhit}/${jv}; worst miss ${worst.toFixed(5)} (h ${t.h.toFixed(3)})`);
  // Keys
  let kmin = Infinity; let kmax = -Infinity; let nan = 0;
  for (let i = 0; i < fs.nV; i++) { const k = fr.key[i]; if (!Number.isFinite(k) || !Number.isFinite(fr.pos[2 * i])) nan++; else { kmin = Math.min(kmin, k); kmax = Math.max(kmax, k); } }
  console.log(`  keys ${kmin.toFixed(3)}..${kmax.toFixed(3)} amp ${scene.look.depthAmp} nonfinite ${nan}`);
  const tails = t.pieces.filter((p) => p.kind === "tail"); console.log(`  tails ${tails.length} with region ${tails.filter((p) => p.region >= 0).length}; run/ghost cpts==pts ${t.pieces.filter((p) => (p.kind === "run" || p.kind === "ghost") && p.cpts.length === p.pts.length).length}/${t.pieces.filter((p) => p.kind === "run" || p.kind === "ghost").length}`);
}

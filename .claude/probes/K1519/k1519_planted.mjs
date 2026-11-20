// K1519 (26V) Done 4, mirror half: is the planted fault (17053a36 against a3a9a6b4) still found?
// Matches mirror finds exactly as k1436_bar_cmp.mjs does (scene, kind:class, site within 0.3 world;
// grown = px over base by >10% and >=3 px) and exits 1 when any new/grown find exists (fault found).
//   node .claude/probes/K1519/k1519_planted.mjs <baseDir> <refDir> <scene,scene>
import { readFileSync } from "node:fs";
import { join } from "node:path";
const [baseDir, refDir, scenesS] = process.argv.slice(2);
let nNew = 0, nGrown = 0;
for (const sc of scenesS.split(",")) {
  const A = JSON.parse(readFileSync(join(baseDir, `${sc}.mirror.json`), "utf8"));
  const B = JSON.parse(readFileSync(join(refDir, `${sc}.mirror.json`), "utf8"));
  const used = new Set();
  for (const f of B.finds) {
    let best = -1, bd = 0.3;
    A.finds.forEach((g, k) => { if (used.has(k) || g.kind !== f.kind || g.cls !== f.cls) return; const d = Math.hypot(g.x - f.x, g.y - f.y); if (d < bd) { bd = d; best = k; } });
    if (best < 0) { console.log(`new ${sc} ${f.kind}:${f.cls} ${f.x.toFixed(2)}:${f.y.toFixed(2)} ${f.site ?? ""} ${f.px}px`); nNew++; continue; }
    used.add(best); const g = A.finds[best];
    if (f.px > g.px * 1.1 && f.px - g.px >= 3) { console.log(`grown ${sc} ${f.kind}:${f.cls} ${f.x.toFixed(2)}:${f.y.toFixed(2)} ${f.px}px (was ${g.px}px)`); nGrown++; }
  }
  console.log(`${sc}: base ${A.finds.length} finds, ref ${B.finds.length} finds`);
}
console.log(`planted mirror: new ${nNew} grown ${nGrown} -> ${nNew + nGrown > 0 ? "FAULT FOUND" : "NOT FOUND"}`);
process.exit(nNew + nGrown > 0 ? 1 : 0);

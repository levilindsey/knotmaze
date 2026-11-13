// K1346 s1: master's outline.ts (51cc6e5f, copied to src/render/outline/outline_m51.ts, untracked) against the
// branch's: frame() after structure() on def and fat, ABBA over 9 reps, medians in ms.
import { loadScene } from "../K1314/k1314_census";
import * as B from "../../../src/render/outline/outline";
import * as M from "../../../src/render/outline/outline_m51";
for (const nm of ["def", "fat"]) {
  const sc = loadScene(nm);
  const res: Record<string, number[]> = { master: [], branch: [] };
  for (let rep = 0; rep < 9; rep++) for (const [n, O] of (rep % 2 ? [["branch", B], ["master", M]] : [["master", M], ["branch", B]]) as [string, any][]) {
    const st = O.structure(sc); const t = performance.now(); O.frame(st, sc); res[n].push(performance.now() - t);
  }
  console.log(nm, Object.entries(res).map(([n, a]) => { a.sort((x, y) => x - y); return `${n} ${a[4].toFixed(1)} (${a[1].toFixed(1)}-${a[7].toFixed(1)})`; }).join(" | "));
}
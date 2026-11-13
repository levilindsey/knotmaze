import { loadScene } from "../K1314/k1314_census";
import * as O from "../../../src/render/outline/outline";
const SW = ["fill", "chevron", "fan", "loops", "fanDrop"] as const;
const set = (v: boolean, except?: string): void => { for (const k of SW) (O.K1346 as any)[k] = k === except ? !v : v; };
for (const nm of ["def", "fat"]) {
  const sc = loadScene(nm);
  const cfgs: [string, () => void][] = [["all on", () => set(true)], ["all off", () => set(false)], ...SW.map((k) => ["-" + k, () => set(true, k)] as [string, () => void])];
  const res: Record<string, number[]> = {};
  for (let rep = 0; rep < 5; rep++) for (const [n, f] of rep % 2 ? [...cfgs].reverse() : cfgs) {
    f(); const st = O.structure(sc); const t = performance.now(); O.frame(st, sc); (res[n] ??= []).push(performance.now() - t);
  }
  set(true);
  console.log(nm, Object.entries(res).map(([n, a]) => { a.sort((x, y) => x - y); return `${n} ${a[2].toFixed(1)}`; }).join(" | "));
}

// K1283 s6: the arms of given chains after a fast frame (kind, root s, direction, junction).
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";
const [nm, ...chs] = process.argv.slice(2);
const sc = loadScene(nm); const st = O.structure(sc); O.frame(st, sc);
const want = new Set(chs.map(Number));
(st.arms as unknown as Array<Record<string, unknown>>).forEach((a, ai) => {
  if (want.has(a.pi as number)) console.log(`ai${ai} ch${a.pi} ${a.kind} s ${(a.s as number)?.toFixed?.(2)} dir ${a.dir} ji ${a.ji ?? a.j ?? "?"} keys ${Object.keys(a).join(",")}`);
});

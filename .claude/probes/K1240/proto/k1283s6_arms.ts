// K1283 s6: the arms of given chains after a fast frame (kind, root s, direction, junction).
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";
const [nm, ...chs] = process.argv.slice(2);
const sc = loadScene(nm); const st = O.structure(sc); const tb = O.frame(st, sc); console.log(`h ${tb.h}`);
const want = new Set(chs.map(Number));
(st.arms as unknown as Array<Record<string, unknown>>).forEach((a, ai) => {
  if (want.has(a.pi as number)) console.log(`ai${ai} ch${a.pi} ${a.kind} s ${(a.s as number)?.toFixed?.(2)} dir ${a.dir} ji ${a.ji ?? a.j ?? "?"} keys ${Object.keys(a).join(",")}`);
});
for (const j of chs.filter((c) => c.startsWith("j"))) console.log(`${j} c ${sc.junctions[Number(j.slice(1))].c.map((v) => v.toFixed(3)).join(":")}`);

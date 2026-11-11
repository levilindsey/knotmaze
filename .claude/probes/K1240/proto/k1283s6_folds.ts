// K1283 s6: the fast frame's fold cuts on given chains, with their points (diagnostics carry the first 20 only).
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";
const [nm, ...chs] = process.argv.slice(2);
const sc = loadScene(nm); const st = O.structure(sc); const tb = O.frame(st, sc) as unknown as { diagnostics: string[] };
const want = new Set(chs.map(Number));
console.log(tb.diagnostics.filter((d) => d.startsWith("fold")).filter((d) => !want.size || want.has(Number(/ch(\d+)/.exec(d)?.[1]))).join("\n"));

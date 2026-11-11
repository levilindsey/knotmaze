// K1283 s6: the fast frame's diagnostics mentioning given junctions (j<n>).
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";
const [nm, ...js] = process.argv.slice(2);
const sc = loadScene(nm); const st = O.structure(sc); const tb = O.frame(st, sc) as unknown as { diagnostics: string[] };
const re = new RegExp(`\\b(${js.join("|")})\\b`);
console.log(tb.diagnostics.filter((d) => re.test(d)).join("\n"));

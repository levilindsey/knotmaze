// K1283 s10: strip item count and N distribution (def), and stage 9's strip-foot call estimate.
import * as O from "./outline";
import * as F from "./fill_tri";
import { loadScene } from "./k1279_census";
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const scene = loadScene(name);
const st = O.structure(scene); const t = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, t));
const strips = (fs.items as { kind: string; N: number }[]).filter((it) => it.kind === "strip");
const Ns = strips.map((s) => s.N).sort((a, b) => a - b); const k = Ns.length;
let calls = 0; let ends = 0; let cols = 0;
for (const N of Ns) { const c = Math.ceil(N / 8) + 1; calls += 3 * c; ends += 6; cols += 3 * (N + 1); }
console.log(`${name}: strips ${k}, N p10 ${Ns[Math.floor(k * 0.1)]} p50 ${Ns[k >> 1]} p90 ${Ns[Math.floor(k * 0.9)]} max ${Ns[k - 1]}; vertices ${cols}; s9 strip calls ~${calls} (ends ${ends}, centre ${calls / 3})`);
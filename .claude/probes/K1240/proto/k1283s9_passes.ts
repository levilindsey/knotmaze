// K1283 s9: tied status of pieces (chain has passes in draw.ts zChains).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s9_passes.ts <scene> <piece>...
import * as S from "./outline";
import { zChains } from "./draw";
import { loadScene } from "./k1279_census";
const [name, ...ps] = process.argv.slice(2);
const scene = loadScene(name);
const t = S.frame(S.structure(scene), scene);
const zz = zChains(scene);
for (const q of ps.map(Number)) {
  const p = t.pieces[q];
  const n = zz.passes[p.chain]?.length ?? -1;
  console.log(`piece ${q} ${p.kind} chain ${p.chain} side ${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} np ${p.pts.length / 2} passes ${n} corner ${p.corner} alpha ${p.alpha ? p.alpha.slice(0, 4).map((v) => v.toFixed(2)).join(",") : "-"}`);
}

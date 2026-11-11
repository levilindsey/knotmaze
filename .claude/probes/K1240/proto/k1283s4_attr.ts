// K1283 s4: which fill_tri items win the pixels of a window (rasterFill's top triangle), by item kind and
// chain, plus the junction fans and round ends (disks) whose hub lies in the window: owner, hub key, arms.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s4_attr.ts <scene> <x> <y> [R=0.25] [ppu=280]
import { loadScene } from "./k1279_census";
import * as O from "./outline";
import * as F from "./fill_tri";

const [name, xs, ys, rs, ps] = process.argv.slice(2);
const scene = loadScene(name) as unknown as O.SceneIn;
const st = O.structure(scene); const t = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, t)); const fr = F.fillFrame(fs, st, t, scene);
const x = Number(xs); const y = Number(ys); const R = Number(rs ?? 0.25); const ppu = Number(ps ?? 280);
const P = Math.round(2 * R * ppu);
const win = { tri: new Int32Array(P * P).fill(-1), bary: new Float32Array(3 * P * P) };
F.rasterFill(fs, fr, x - R, y - R, P, P, ppu, win);
// vertex -> item
const itemOfV = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, q) => { for (let v = it.base; v < it.base + F.itemVerts(it); v++) itemOfV[v] = q; });
const count = new Map<string, number>();
for (let o = 0; o < P * P; o++) {
  const tr = win.tri[o]; if (tr < 0) continue;
  const q = itemOfV[fs.idx[tr]]; const it = fs.items[q];
  const k = `${it.kind}#${q} ch ${fs.vChain[fs.idx[tr]]}`;
  count.set(k, (count.get(k) ?? 0) + 1);
}
console.log([...count.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join("\n"));
fs.items.forEach((it, q) => {
  if (it.kind !== "junc" && it.kind !== "disk") return;
  const hx = fr.pos[2 * it.base]; const hy = fr.pos[2 * it.base + 1];
  if (Math.abs(hx - x) > R || Math.abs(hy - y) > R) return;
  if (it.kind === "junc") console.log(`junc#${q} j${it.ji} owner ${it.owner} hub (${hx.toFixed(3)}, ${hy.toFixed(3)}) key ${fr.key[it.base].toFixed(4)} arms ${it.arms.map((a) => `${a.pi}/${st.arms[a.ai].kind}/ring ${fr.key[it.base + 1 + it.arms.indexOf(a) * (3 + F.ARC_K) + 1].toFixed(4)}`).join(", ")}`);
  else console.log(`disk#${q} ch ${it.pi} arm ${it.ai} hub (${hx.toFixed(3)}, ${hy.toFixed(3)}) key ${fr.key[it.base].toFixed(4)} rim ${fr.key[it.base + 1].toFixed(4)} jItem ${it.jItem}`);
});

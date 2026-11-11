// K1278 stage 2: one fill item's vertices (src/render/outline/): position,
// key, runs, weights and s per slot; for a strip, the junction arms that
// name it; for a junction, its arms.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278s2_item.ts --scene=def --item=903 [--cols=0,1,N]
import * as O from "../../../../src/render/outline/outline";
import * as F from "../../../../src/render/outline/fill_tri";
import { sectionPaint, type PaintMode } from "../../../../src/render/outline/paint";
import { loadScene } from "./k1279_census";
import * as D from "../../../../src/render/outline/draw";

const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = opt("scene") ?? "def"; const k = Number(opt("item") ?? 0); const mode = (opt("mode") ?? "app") as PaintMode;
const scene = loadScene(nm);
const st = O.structure(scene); const table = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, table));
const fr = F.fillFrame(fs, st, table, scene);
const sp = sectionPaint(scene, mode, D.baseHueFor(nm)); const runs = F.fillRuns(fs, st, fr, sp);
const it = fs.items[k];
const vline = (v: number): string => `v${v} (${fr.pos[2 * v].toFixed(3)}, ${fr.pos[2 * v + 1].toFixed(3)}) key ${fr.key[v].toFixed(3)} | ` + [0, 1, 2, 3].map((q) => `r${runs[F.SLOTS * v + q]} w${fr.w4[F.SLOTS * v + q].toFixed(2)} s${fr.s4[F.SLOTS * v + q].toFixed(3)}`).join("  ");
if (it.kind === "strip") {
  const I = st.intervalsD[it.iv]; const W = it.N + 1;
  console.log(`strip #${k} ch${it.pi} iv ${it.iv} ghost ${it.ghost} N ${it.N} stations ${I.aSt} -> ${I.bSt} pL ${it.pL} pR ${it.pR}`);
  for (const p of [it.pL, it.pR]) if (p >= 0) { const P = table.pieces[p]; console.log(`  piece ${p}: s0 ${P.s0.toFixed(3)} s1 ${P.s1.toFixed(3)} pts ${P.pts.length / 2}`); }
  fs.items.forEach((j, q) => { if (j.kind === "junc") j.arms.forEach((a, ai) => { if (a.strip === k) console.log(`  named by junc #${q} ji ${j.ji} arm ${ai} ch${a.pi} atStart ${a.atStart} dir ${st.arms[a.ai].dir}`); }); });
  const cols = (opt("cols") ?? `0,1,${it.N - 1},${it.N}`).split(",").map((c) => (c === "N" ? it.N : Number(c)));
  for (const c of cols) for (let r = 0; r < 3; r++) console.log(`  col ${c} row ${r} ${vline(it.base + r * W + c)}`);
} else if (it.kind === "junc") {
  console.log(`junc #${k} ji ${it.ji} owner ch${it.owner} R ${it.R}`);
  it.arms.forEach((a, ai) => console.log(`  arm ${ai} ch${a.pi} atStart ${a.atStart} strip ${a.strip} corner ${a.corner} s ${scene.junctions[it.ji].arms[st.arms[a.ai].ei].s.toFixed(3)}`));
  console.log(`  hub ${vline(it.base)}`);
  const n = it.arms.length;
  for (let a = 0; a < n; a++) for (let q = 0; q < 3; q++) console.log(`  arm ${a} ${"PMN"[q]} ${vline(it.base + 1 + a * (3 + 16) + q)}`);
} else {
  const n = F.itemVerts(it); for (let v = 0; v < n; v++) console.log(`  ${vline(it.base + v)}`);
}

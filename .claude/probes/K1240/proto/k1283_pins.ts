// K1283: outline_port.test.ts's digests from src, printed (for the re-pin), plus
// a look at the first arc piece at each frame (its pts and cpts).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283_pins.ts
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { OutlineModel, diagramKey } from "../../../../src/render/outline/outline_model";
import type { SceneIn, OutlineTable } from "../../../../src/render/outline/outline";
import { bandData, zChains } from "../../../../src/render/outline/draw";
import { digestOut, loadScene } from "../../../../test/render/outline_digest";

const root = resolve(".");
const moved = (s: SceneIn): SceneIn => {
  const t = structuredClone(s);
  for (const c of t.chains) for (let i = 0; i < c.pts.length; i += 2) {
    const x = c.pts[i];
    const y = c.pts[i + 1];
    c.pts[i] = 1.3 + Math.cos(0.3) * x - Math.sin(0.3) * y;
    c.pts[i + 1] = -0.7 + Math.sin(0.3) * x + Math.cos(0.3) * y;
  }
  // K1293: the junction centres move with the chains (frame reads j.c).
  for (const j of t.junctions) {
    const [x, y] = j.c;
    j.c = [1.3 + Math.cos(0.3) * x - Math.sin(0.3) * y, -0.7 + Math.sin(0.3) * x + Math.cos(0.3) * y];
  }
  return t;
};
const arcLook = (t: OutlineTable): string => {
  const a = t.pieces.find((p) => p.kind === "arc" && p.pts.length >= 4);
  const nA = t.pieces.filter((p) => p.kind === "arc").length; const kinds = [...new Set(t.pieces.map((p) => p.kind))].join(","); const nC = (t as unknown as { corners?: unknown[] }).corners?.length ?? -1;
  if (!a) return `no arc (arc pieces ${nA}, kinds ${kinds}, corners ${nC})`;
  const r = (v: number): string => v.toFixed(3);
  return `arc corner ${a.corner} pts0 (${r(a.pts[0])}, ${r(a.pts[1])}) cpts0 (${r(a.cpts[0])}, ${r(a.cpts[1])})`;
};
const run = (name: string, s0: SceneIn): void => {
  const m = new OutlineModel(s0);
  let sc = s0;
  const out = () => digestOut({
    table: m.table,
    paint: { idx: m.pd.idx, run: m.pd.run, src: m.pd.src, pos: m.pd.pos, key: m.pd.key, w: m.pd.w, s: m.pd.s, tex: m.pd.tex, copies: m.pd.copies, ks: m.ks },
    band: bandData(m.table, sc, zChains(sc)),
  });
  const f0 = out();
  const l0 = arcLook(m.table);
  const s1 = moved(s0);
  if (diagramKey(s1) !== m.key) throw new Error("key moved");
  m.update(s1);
  sc = s1;
  const f1 = out();
  console.log(`${name}: { f0: ${JSON.stringify(f0)}, f1: ${JSON.stringify(f1)} }`);
  console.log(`  f0 ${l0}`);
  console.log(`  f1 ${arcLook(m.table)}`);
};
run("ring", loadScene(join(root, "test/render/fixtures/outline_ring.json.gz")));
const extra = join(root, ".claude/probes/K868/scenes/g41_ring_tw42.json");
if (existsSync(extra)) run("g41_ring_tw42", loadScene(extra));

// K1626 update cost: step a link's physics from load in 0.1-s frames (the
// census recipe) and time every ps.step; alternate two checkouts' src/ so
// load drift hits both alike. Run under the perf lock.
//
//   node scripts/run_node.mjs .claude/probes/K1626/bench.ts <rootA> <rootB> [rounds=5] [frames=60] [name=query ...]
//
// Prints per round and checkout: median and mean ms per step over the
// first `frames` frames (the settle, where the knot is awake), and the
// sleep time with main's gate (frames run on to CAP 40 sim-s for that).
import { resolve } from "node:path";

const [, , rootA, rootB, roundsArg, framesArg, ...rest] = process.argv;
const ROUNDS = +(roundsArg ?? 5);
const FRAMES = +(framesArg ?? 60);
const jobs = (rest.length ? rest : ["L=?3.FCBQ1H6L4-6NPbeg8HHN09w", "D_1=?1", "D_4=?4"]).map((p) => {
  const i = p.indexOf("=");
  return [p.slice(0, i), p.slice(i + 1)] as [string, string];
});
const fsUrl = (root: string, p: string): string => "/@fs/" + resolve(root, p).replace(/\\/g, "/");
async function load(root: string) {
  const { ParticleSystem } = await import(/* @vite-ignore */ fsUrl(root, "src/physics/particle_system.ts"));
  const { SleepGate, physicsQuiet } = await import(/* @vite-ignore */ fsUrl(root, "src/physics/sleep_gate.ts"));
  const { buildSceneGraph } = await import(/* @vite-ignore */ fsUrl(root, "src/core/scene_graph.ts"));
  const { parseParams } = await import(/* @vite-ignore */ fsUrl(root, "src/ui/url_state.ts"));
  return { ParticleSystem, SleepGate, physicsQuiet, buildSceneGraph, parseParams };
}
const mods = { A: await load(rootA), B: await load(rootB) };
const res: Record<string, { med: number[]; mean: number[]; sleep: number[] }> = {};
for (let r = 0; r < ROUNDS; r++) {
  for (const [name, query] of jobs) {
    for (const k of (r % 2 === 0 ? ["A", "B"] : ["B", "A"]) as Array<"A" | "B">) {
      const m = mods[k];
      const p = m.parseParams(query);
      const tuning = {
        temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
        smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: p.threadWidth,
      };
      const graph = m.buildSceneGraph({ ...p, title: "", glyphs2: "" }).graph;
      const ps = new m.ParticleSystem(graph);
      const gate = new m.SleepGate();
      const times: number[] = [];
      let slept = Infinity;
      for (let f = 0; ps.simTime < 40; f++) {
        const s0 = ps.simTime;
        const t0 = performance.now();
        ps.step(0.1, tuning);
        const dt = performance.now() - t0;
        if (f < FRAMES) times.push(dt);
        if (gate.frame(m.physicsQuiet(ps), ps.simTime - s0)) { slept = ps.simTime; break; }
      }
      const s = [...times].sort((a, b) => a - b);
      const med = s[s.length >> 1];
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const key = `${name} ${k}`;
      (res[key] ??= { med: [], mean: [], sleep: [] });
      res[key].med.push(med); res[key].mean.push(mean); res[key].sleep.push(slept);
      console.log(`round ${r} ${key} med ${med.toFixed(2)} ms mean ${mean.toFixed(2)} ms over ${times.length} frames, sleep ${slept.toFixed(2)}`);
    }
  }
}
const medOf = (a: number[]): number => [...a].sort((x, y) => x - y)[a.length >> 1];
for (const [name] of jobs) {
  const a = res[`${name} A`], b = res[`${name} B`];
  const ma = medOf(a.mean), mb = medOf(b.mean);
  console.log(`SUMMARY ${name}: A mean ${ma.toFixed(2)} ms, B mean ${mb.toFixed(2)} ms, B/A ${(mb / ma).toFixed(3)}; median-step A ${medOf(a.med).toFixed(2)} B ${medOf(b.med).toFixed(2)}; sleep A ${a.sleep[0].toFixed(2)} B ${b.sleep[0].toFixed(2)}`);
}

// K1626: a thread-width slider jump across the half segments' fade
// (0.55-0.7) on a settled knot. Settle <query> at width W0 to sleep, set
// width W1, step on RUN sim-s, report the re-sleep time and the closest
// joint-crossing pair, per checkout root.
//
//   node scripts/run_node.mjs .claude/probes/K1626/widthjump.ts <W0> <W1> <root> [root ...]
import { resolve } from "node:path";

const [, , w0Arg, w1Arg, ...roots] = process.argv;
const W0 = +w0Arg, W1 = +w1Arg;
const RUN = +(process.env.RUN ?? 20);
const QUERIES = (process.env.Q ?? "?1,?3.FCBQ1H6L4-6NPbeg8HHN09w").split(",");
const fsUrl = (root: string, p: string): string => "/@fs/" + resolve(root, p).replace(/\\/g, "/");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function minPair(ps: any, tw: number): number {
  const pos: Float32Array = ps.positions;
  const at = (c: number, f: number): [number, number] => {
    const ch: number[] = ps.chains[c]; const n = ch.length;
    const i0 = Math.floor(f); const t = f - i0;
    const a = ch[((i0 % n) + n) % n]; const b = ch[(((i0 + 1) % n) + n) % n];
    return [pos[a * 2] * (1 - t) + pos[b * 2] * t, pos[a * 2 + 1] * (1 - t) + pos[b * 2 + 1] * t];
  };
  const chainOf = new Map<number, number>();
  (ps.chains as number[][]).forEach((ch, c) => ch.forEach((q) => chainOf.set(q, c)));
  let min = Infinity;
  for (const g of ps.fusedJunctions as number[][]) {
    let jx = 0, jy = 0; const jc = new Set<number>();
    for (const m of g) { jx += pos[m * 2] / g.length; jy += pos[m * 2 + 1] / g.length; jc.add(chainOf.get(m)!); }
    for (const X of ps.crossings) {
      if (!jc.has(X.over.chain) && !jc.has(X.under.chain)) continue;
      const a = at(X.over.chain, X.over.ctrl); const b = at(X.under.chain, X.under.ctrl);
      min = Math.min(min, Math.hypot((a[0] + b[0]) / 2 - jx, (a[1] + b[1]) / 2 - jy) / tw);
    }
  }
  return min;
}

for (const root of roots) {
  const { ParticleSystem } = await import(/* @vite-ignore */ fsUrl(root, "src/physics/particle_system.ts"));
  const { SleepGate, physicsQuiet } = await import(/* @vite-ignore */ fsUrl(root, "src/physics/sleep_gate.ts"));
  const { buildSceneGraph } = await import(/* @vite-ignore */ fsUrl(root, "src/core/scene_graph.ts"));
  const { parseParams } = await import(/* @vite-ignore */ fsUrl(root, "src/ui/url_state.ts"));
  for (const query of QUERIES) {
    const p = parseParams(query);
    const tuning = {
      temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
      smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: W0,
    };
    // The graph is built at the link's own width (generation reads it); only the physics width jumps.
    const ps = new ParticleSystem(buildSceneGraph({ ...p, title: "", glyphs2: "" }).graph);
    if (process.env.MATFRAC) ps.jeyeMatFrac = +process.env.MATFRAC;
    if (process.env.MATMODE) ps.jeyeMatMode = +process.env.MATMODE;
    if (process.env.RELT) ps.jeyeReleaseT = +process.env.RELT;
    if (process.env.RELMODE) ps.jeyeRelMode = +process.env.RELMODE;
    if (process.env.RELFLOOR) ps.jeyeRelFloor = +process.env.RELFLOOR;
    const g = new SleepGate(); let slept = Infinity;
    while (ps.simTime < 40) { const s0 = ps.simTime; ps.step(0.1, tuning); if (g.frame(physicsQuiet(ps), ps.simTime - s0)) { slept = ps.simTime; break; } }
    const m0 = minPair(ps, W0);
    if (process.env.RELT2) ps.jeyeReleaseT = +process.env.RELT2;
    tuning.threadWidth = W1;
    const g2 = new SleepGate(); let slept2 = Infinity; const t1 = ps.simTime;
    while (ps.simTime < t1 + RUN) { const s0 = ps.simTime; ps.step(0.1, tuning); if (g2.frame(physicsQuiet(ps), ps.simTime - s0)) { slept2 = ps.simTime - t1; break; } }
    const m1 = minPair(ps, W1);
    console.log(`${root.split(/[\\/]/).slice(-1)[0]} ${query} tw ${W0}->${W1}: settled ${slept.toFixed(1)} min ${m0.toFixed(2)}w | after jump re-slept +${slept2.toFixed(1)} min ${m1.toFixed(2)}w released [${Array.from(ps.jeyeOff ?? []).map((v: number, e: number) => v ? `${e}` : "").filter(Boolean).join(" ")}]`);
  }
}

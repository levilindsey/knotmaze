// K1626: what holds a joint and its crossing together, by a change on a
// frozen settled state. Settle a link on <root>'s src (master) until main's
// sleep gate fires, measure, apply ONE change to that settled state, step
// on 8 sim-s (temperature 0), measure again. Changes:
//   ctrl   nothing (the control: the state must hold)
//   jnsep  the jn ratchet's budget pinned at 3.2 ctrl (master 2.2 at tw .34)
//   half   the joints' half segments (rest < 0.4, within 2 segments of a
//          fused member) lengthened x1.8, bending rests = the legs' sum
//   all    every segment within 2 of a joint lengthened x1.8 (more material
//          on the arm, not only the half segments)
//
//   node scripts/run_node.mjs .claude/probes/K1626/frozen.ts <root> [name=query ...]
import { resolve } from "node:path";

const [, , root, ...rest] = process.argv;
const jobs = (rest.length ? rest : ["L=?3.FCBQ1H6L4-6NPbeg8HHN09w", "D_1=?1"]).map((p) => {
  const i = p.indexOf("=");
  return [p.slice(0, i), p.slice(i + 1)] as [string, string];
});
const fsUrl = (p: string): string => "/@fs/" + resolve(root, p).replace(/\\/g, "/");
const { ParticleSystem } = await import(/* @vite-ignore */ fsUrl("src/physics/particle_system.ts"));
const { SleepGate, physicsQuiet } = await import(/* @vite-ignore */ fsUrl("src/physics/sleep_gate.ts"));
const { buildSceneGraph } = await import(/* @vite-ignore */ fsUrl("src/core/scene_graph.ts"));
const { parseParams } = await import(/* @vite-ignore */ fsUrl("src/ui/url_state.ts"));

type Seg = { a: number; b: number; rest: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function measure(ps: any, tw: number): { min: number; under25: number; halfStretch: number } {
  const pos: Float32Array = ps.positions;
  const at = (c: number, f: number): [number, number] => {
    const ch: number[] = ps.chains[c]; const n = ch.length;
    const i0 = Math.floor(f); const t = f - i0;
    const a = ch[((i0 % n) + n) % n]; const b = ch[(((i0 + 1) % n) + n) % n];
    return [pos[a * 2] * (1 - t) + pos[b * 2] * t, pos[a * 2 + 1] * (1 - t) + pos[b * 2 + 1] * t];
  };
  const chainOf = new Map<number, number>();
  (ps.chains as number[][]).forEach((ch, c) => ch.forEach((q) => chainOf.set(q, c)));
  let min = Infinity; let under25 = 0;
  for (const g of ps.fusedJunctions as number[][]) {
    let jx = 0, jy = 0; const jc = new Set<number>();
    for (const m of g) { jx += pos[m * 2] / g.length; jy += pos[m * 2 + 1] / g.length; jc.add(chainOf.get(m)!); }
    for (const X of ps.crossings) {
      if (!jc.has(X.over.chain) && !jc.has(X.under.chain)) continue;
      const a = at(X.over.chain, X.over.ctrl); const b = at(X.under.chain, X.under.ctrl);
      const d = Math.hypot((a[0] + b[0]) / 2 - jx, (a[1] + b[1]) / 2 - jy) / tw;
      min = Math.min(min, d); if (d < 2.5) under25++;
    }
  }
  // Mean stretch (length / base rest) of the half segments next to joints.
  let s = 0, n = 0;
  for (const c of halfSegs(ps, 0.4)) { const L = Math.hypot(pos[c.a * 2] - pos[c.b * 2], pos[c.a * 2 + 1] - pos[c.b * 2 + 1]); s += L / c.rest; n++; }
  return { min, under25, halfStretch: n ? s / n : NaN };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function halfSegs(ps: any, maxRest: number): Seg[] {
  const key = (a: number, b: number): number => (a < b ? a * 1e6 + b : b * 1e6 + a);
  const near = new Set<number>();
  const chs: number[][] = ps.chains; const brks: number[] = ps.chainBreakAfter;
  for (const g of ps.fusedJunctions as number[][]) for (const m of g) chs.forEach((ch, c) => {
    const s0 = ch.indexOf(m); if (s0 < 0) return; const n = ch.length; const brk = brks[c];
    let f = s0; for (let o = 0; o < 2; o++) { if (f === brk) break; const t = (f + 1) % n; near.add(key(ch[f], ch[t])); f = t; }
    let b = s0; for (let o = 0; o < 2; o++) { const t = (b - 1 + n) % n; if (t === brk) break; near.add(key(ch[t], ch[b])); b = t; }
  });
  return (ps.structural as Seg[]).filter((c) => c.rest > 0 && c.rest < maxRest && near.has(key(c.a, c.b)));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lengthen(ps: any, maxRest: number, k: number, list?: Seg[]): void {
  const key = (a: number, b: number): number => (a < b ? a * 1e6 + b : b * 1e6 + a);
  for (const c of list ?? halfSegs(ps, maxRest)) c.rest *= k;
  const restOf = new Map<number, number>();
  for (const c of ps.structural as Seg[]) if (c.rest > 0) restOf.set(key(c.a, c.b), c.rest);
  const mid = new Map<number, number>();
  (ps.chains as number[][]).forEach((ch, c) => { const n = ch.length; const brk = ps.chainBreakAfter[c]; for (let i = 0; i < n; i++) { if (brk === i || brk === (i - 1 + n) % n) continue; mid.set(key(ch[(i - 1 + n) % n], ch[(i + 1) % n]), ch[i]); } });
  for (const bc of ps.bending as Seg[]) {
    const m = mid.get(key(bc.a, bc.b)); if (m === undefined) continue;
    const r1 = restOf.get(key(bc.a, m)); const r2 = restOf.get(key(m, bc.b));
    if (r1 !== undefined && r2 !== undefined) bc.rest = r1 + r2;
  }
}

for (const [name, query] of jobs) {
  for (const change of (process.env.CHANGES ?? "ctrl,jnsep,half,all").split(",")) {
    const p = parseParams(query);
    const tuning = {
      temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
      smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: p.threadWidth,
    };
    const ps = new ParticleSystem(buildSceneGraph({ ...p, title: "", glyphs2: "" }).graph);
    const gate = new SleepGate();
    let slept = Infinity;
    while (ps.simTime < 40) { const s0 = ps.simTime; ps.step(0.1, tuning); if (gate.frame(physicsQuiet(ps), ps.simTime - s0)) { slept = ps.simTime; break; } }
    const m0 = measure(ps, p.threadWidth);
    if (change === "jnsep") Object.defineProperty(ps, "jnSep", { get: () => 3.2, set: () => {}, configurable: true });
    if (change === "half") lengthen(ps, 0.4, 1.8);
    if (change === "all") lengthen(ps, 99, 1.8);
    const RUN = +(process.env.RUN ?? 8);
    // halframp: the same x1.8, in 30 equal factors over the first 3 s.
    const rampList = halfSegs(ps, 0.4);
    const g2 = new SleepGate(); let slept2 = Infinity; const t1 = ps.simTime;
    let fr = 0; while (ps.simTime < t1 + RUN) { if (change === "halframp" && fr < 30) lengthen(ps, 0, Math.pow(1.8, 1 / 30), rampList); fr++; const s0 = ps.simTime; ps.step(0.1, tuning); if (slept2 === Infinity && ps.simTime - t1 > 1 && g2.frame(physicsQuiet(ps), ps.simTime - s0)) slept2 = ps.simTime - t1; else if (ps.simTime - t1 <= 1) g2.frame(false, ps.simTime - s0); }
    const m1 = measure(ps, p.threadWidth);
    console.log(`${name} ${change.padEnd(5)} settled ${slept.toFixed(1)}: min ${m0.min.toFixed(2)}w <2.5w ${m0.under25} halfStretch ${m0.halfStretch.toFixed(2)} | after ${RUN} s: min ${m1.min.toFixed(2)}w <2.5w ${m1.under25} halfStretch ${m1.halfStretch.toFixed(2)} re-slept +${slept2.toFixed(1)}`);
  }
}

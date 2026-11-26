// K1626 census: settle a link's physics in Node (ps.step in 0.1-s frames,
// main's sleep gate, the sleep.regression recipe) and list every fused
// junction with a registered crossing near it, at rest.
//
//   node scripts/run_node.mjs .claude/probes/K1626/census.ts <outDir> [root] [name=query ...]
//
// root: a checkout whose src/ to load (default: this worktree). With no
// name=query the 21 test mazes + Levi's link run. Writes <outDir>/<name>.json
// (the settled state + the near list) and prints one summary line per maze.
// Env: CAP (sim-s cap, default 40), NEAR (world-distance cut in thread
// widths, default 4), EXTRA (appended to every query).
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const [, , outDir, rootArg, ...rest] = process.argv;
const root = resolve(rootArg && !rootArg.includes("=") ? rootArg : process.cwd());
const pairs = (rootArg && rootArg.includes("=") ? [rootArg, ...rest] : rest).filter(Boolean);
const CAP = +(process.env.CAP ?? 40);
const NEAR = +(process.env.NEAR ?? 4);
const EXTRA = process.env.EXTRA ?? "";
mkdirSync(outDir, { recursive: true });

const A = "FGH1HtvQeDjm6e4BII";
const DEFAULT: Array<[string, string]> = [["L", "?3.FCBQ1H6L4-6NPbeg8HHN09w"]];
for (const c of "3456789abcd") DEFAULT.push([`A_${c}`, `?${c}.${A}`]);
for (const c of "123456789a") DEFAULT.push([`D_${c}`, `?${c}`]);
const jobs: Array<[string, string]> = pairs.length
  ? pairs.map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)] as [string, string]; })
  : DEFAULT;

const fsUrl = (p: string): string => "/@fs/" + resolve(root, p).replace(/\\/g, "/");
const { ParticleSystem } = await import(/* @vite-ignore */ fsUrl("src/physics/particle_system.ts"));
const { SleepGate, physicsQuiet } = await import(/* @vite-ignore */ fsUrl("src/physics/sleep_gate.ts"));
const { buildSceneGraph } = await import(/* @vite-ignore */ fsUrl("src/core/scene_graph.ts"));
const { parseParams } = await import(/* @vite-ignore */ fsUrl("src/ui/url_state.ts"));

type Pass = { chain: number; ctrl: number };

for (const [name, q0] of jobs) {
  const query = q0 + EXTRA;
  const p = parseParams(query);
  const params = { ...p, title: "", glyphs2: "" };
  const tuning = {
    temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
    smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: p.threadWidth,
  };
  const graph = buildSceneGraph(params).graph;
  const ps = new ParticleSystem(graph);
  // Experiment: JNSEP=<ctrl> pins the jn budget (the field is recomputed
  // from the constants each substep; a getter-only property wins).
  if (process.env.JNSEP) {
    const v = +process.env.JNSEP;
    Object.defineProperty(ps, "jnSep", { get: () => v, set: () => {}, configurable: true });
  }
  // Experiment: ARMK=<k> [ARMR=<segments>] lengthens the rest of the first
  // ARMR segments of every fused joint's arms by k (bending rests follow).
  if (process.env.ARMK) {
    // FADE=lo,hi: the extra material fades out between thread widths lo..hi.
    const [flo, fhi] = (process.env.FADE ?? "9,10").split(",").map(Number);
    const fade = Math.max(0, Math.min(1, (fhi - p.threadWidth) / (fhi - flo)));
    const K = 1 + (+process.env.ARMK - 1) * fade; const R = +(process.env.ARMR ?? 2);
    const chs: number[][] = ps.chains; const brks: number[] = ps.chainBreakAfter;
    const key = (a: number, b: number): number => (a < b ? a * 1e6 + b : b * 1e6 + a);
    const scaled = new Set<number>();
    for (const g of ps.fusedJunctions as number[][]) for (const m of g) {
      chs.forEach((ch, c) => {
        const s = ch.indexOf(m); if (s < 0) return;
        const n = ch.length; const brk = brks[c];
        let f = s; for (let o = 0; o < R; o++) { if (f === brk) break; const t = (f + 1) % n; scaled.add(key(ch[f], ch[t])); f = t; }
        let b = s; for (let o = 0; o < R; o++) { const t = (b - 1 + n) % n; if (t === brk) break; scaled.add(key(ch[t], ch[b])); b = t; }
      });
    }
    // HALF=1: only the short (subdivided) segments, rest < 0.75 x the
    // longest rest among the arm's next few segments; scaled up to at most
    // that full length.
    const HALF = process.env.HALF === "1";
    const restOf = new Map<number, number>();
    const all = ps.structural as Array<{ a: number; b: number; rest: number }>;
    const maxRest = all.reduce((m, c) => Math.max(m, c.rest), 0);
    void maxRest;
    for (const c of all) {
      if (c.rest > 0 && scaled.has(key(c.a, c.b))) {
        if (!HALF) c.rest *= K;
        else if (c.rest < 0.4) c.rest *= K;
      }
      if (c.rest > 0) restOf.set(key(c.a, c.b), c.rest);
    }
    // Bending a=p(i-1), b=p(i+1): rest = leg1 + leg2 via the middle particle.
    const mid = new Map<number, number>();
    chs.forEach((ch, c) => { const n = ch.length; const brk = brks[c]; for (let i = 0; i < n; i++) { if (brk === i || brk === (i - 1 + n) % n) continue; mid.set(key(ch[(i - 1 + n) % n], ch[(i + 1) % n]), ch[i]); } });
    for (const bc of ps.bending as Array<{ a: number; b: number; rest: number }>) {
      const m = mid.get(key(bc.a, bc.b)); if (m === undefined) continue;
      const r1 = restOf.get(key(bc.a, m)); const r2 = restOf.get(key(m, bc.b));
      if (r1 !== undefined && r2 !== undefined) bc.rest = r1 + r2;
    }
  }
  const gate = new SleepGate();
  let slept = Infinity;
  const t0 = performance.now();
  let substeps = 0;
  while (ps.simTime < CAP) {
    const s0 = ps.simTime;
    ps.step(0.1, tuning);
    if (gate.frame(physicsQuiet(ps), ps.simTime - s0)) { slept = ps.simTime; break; }
  }
  const wall = performance.now() - t0;
  const pos: Float32Array = ps.positions;
  const chains: number[][] = ps.chains;
  const brkOf: number[] = ps.chainBreakAfter;
  const at = (c: number, f: number): [number, number] => {
    const ch = chains[c]; const n = ch.length;
    const i0 = Math.floor(f); const t = f - i0;
    const a = ch[((i0 % n) + n) % n]; const b = ch[(((i0 + 1) % n) + n) % n];
    return [pos[a * 2] * (1 - t) + pos[b * 2] * t, pos[a * 2 + 1] * (1 - t) + pos[b * 2 + 1] * t];
  };
  // slot of each particle on its chain
  const slotOf = new Map<number, [number, number]>();
  chains.forEach((ch, c) => ch.forEach((pp, s) => slotOf.set(pp, [c, s])));
  const tw = p.threadWidth;
  const juncs = (ps.fusedJunctions as number[][]).map((g, id) => {
    let x = 0, y = 0; for (const m of g) { x += pos[m * 2]; y += pos[m * 2 + 1]; }
    return { id, x: x / g.length, y: y / g.length, members: g.map((m) => slotOf.get(m)!) };
  });
  const xs = (ps.crossings as Array<{ over: Pass; under: Pass }>).map((X, id) => {
    const a = at(X.over.chain, X.over.ctrl); const b = at(X.under.chain, X.under.ctrl);
    return { id, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, over: { chain: X.over.chain, ctrl: X.over.ctrl }, under: { chain: X.under.chain, ctrl: X.under.ctrl } };
  });
  // Arc (world) along a chain between two ctrl values, no seam crossing.
  const arc = (c: number, f0: number, f1: number): number => {
    const lo = Math.min(f0, f1), hi = Math.max(f0, f1);
    let s = 0; let prev = at(c, lo);
    for (let k = Math.floor(lo) + 1; k <= hi; k++) { const q = at(c, k); s += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
    const q = at(c, hi); s += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    return s;
  };
  // Every pass ctrl and joint slot per chain, for the outward neighbours.
  const passesOn = new Map<number, number[]>();
  for (const X of xs) for (const P of [X.over, X.under]) {
    if (!passesOn.has(P.chain)) passesOn.set(P.chain, []);
    passesOn.get(P.chain)!.push(P.ctrl);
  }
  const jointsOn = new Map<number, number[]>();
  for (const J of juncs) for (const [c, s] of J.members) {
    if (!jointsOn.has(c)) jointsOn.set(c, []);
    jointsOn.get(c)!.push(s);
  }
  // Outward ctrl distance from f (moving in dir) to the nearest value of vals.
  const outward = (c: number, f: number, dir: number, vals: number[]): number => {
    const n = chains[c].length; const brk = brkOf[c];
    let best = Infinity;
    for (const v of vals) {
      let d = (v - f) * dir;
      if (brk < 0) d = ((d % n) + n) % n;
      if (d > 1e-6 && d < best) best = d;
    }
    return best;
  };
  const near: Array<Record<string, unknown>> = [];
  for (const J of juncs) {
    for (const X of xs) {
      const d = Math.hypot(X.x - J.x, X.y - J.y);
      if (d > NEAR * tw) continue;
      // On an arm: a pass whose chain carries a member of J (ctrl distance, no seam).
      let armCtrl = Infinity, armArc = Infinity, armSide = "";
      let nextPass = Infinity, nextJoint = Infinity;
      for (const side of ["over", "under"] as const) {
        const P = X[side];
        for (const [c, s] of J.members) {
          if (c !== P.chain) continue;
          const brk = brkOf[c]; const n = chains[c].length;
          let dc = Math.abs(P.ctrl - s);
          let dir = Math.sign(P.ctrl - s);
          if (brk < 0) { if (n - dc < dc) { dc = n - dc; dir = -dir; } }
          else if ((s <= brk) !== (P.ctrl <= brk + 0.5)) continue; // other side of the seam (open chain is a path from brk+1)
          if (dc < armCtrl) {
            armCtrl = dc; armSide = side; armArc = brk < 0 && Math.abs(P.ctrl - s) > n / 2 ? NaN : arc(c, s, P.ctrl);
            nextPass = outward(c, P.ctrl, dir, passesOn.get(c)!.filter((v) => Math.abs(v - P.ctrl) > 1e-9));
            nextJoint = outward(c, P.ctrl, dir, jointsOn.get(c)!);
          }
        }
      }
      const fin = (v: number, k = 3): number | null => (Number.isFinite(v) ? +v.toFixed(k) : null);
      near.push({ j: J.id, x: X.id, d: +d.toFixed(4), dw: +(d / tw).toFixed(3), armCtrl: fin(armCtrl), armArc: fin(armArc, 4), armSide, nextPass: fin(nextPass), nextJoint: fin(nextJoint), jx: +J.x.toFixed(3), jy: +J.y.toFixed(3), xx: +X.x.toFixed(3), xy: +X.y.toFixed(3) });
    }
  }
  near.sort((a, b) => (a.d as number) - (b.d as number));
  const cnt = (k: number): number => near.filter((n) => (n.dw as number) < k).length;
  const minD = near.length ? (near[0].dw as number) : Infinity;
  let h = 0; for (let i = 0; i < pos.length; i++) h = (h * 31 + Math.round(pos[i] * 1e4)) | 0;
  console.log(`${name.padEnd(4)} tw=${tw} parts=${ps.particleCount} X=${xs.length} J=${juncs.length} sleep=${slept.toFixed(2)} wall=${wall.toFixed(0)}ms min=${minD.toFixed(3)}w <1.5w:${cnt(1.5)} <2w:${cnt(2)} <2.5w:${cnt(2.5)} <3w:${cnt(3)} hash=${(h >>> 0).toString(16)}`);
  // Unscaled structural rest per chain segment i -> i+1 (null: none).
  const rk = new Map<number, number>();
  for (const c of ps.structural as Array<{ a: number; b: number; rest: number }>) if (c.rest > 0) rk.set(c.a * 1e6 + c.b, c.rest);
  const rests = chains.map((ch) => ch.map((a, i) => rk.get(a * 1e6 + ch[(i + 1) % ch.length]) ?? null));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ name, query, tw, sleep: slept, wall, positions: Array.from(pos), chains, brk: brkOf, juncs, xs, near, rests }));
}

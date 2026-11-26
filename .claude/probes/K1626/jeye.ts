// K1626 s2: joint eyes - a fused joint's two arms that cross each other
// close an eye between the joint and the crossing. Settle a link on
// <root>'s src (Node, main's sleep gate, step(0.1) frames), list every
// joint eye with its opening (eyes.py's law: the largest, over one arm, of
// the distance to the other arm, centre to centre, in thread widths), the
// arms' rest arc, actual arc and chord. Then optionally apply ONE change
// to the settled state (CHANGE=<name>, see below), step on RUN sim-s and
// measure again, with the re-sleep time.
//
//   node scripts/run_node.mjs .claude/probes/K1626/jeye.ts <root> <outJson|-> [name=query ...]
//
// Env: CAP (settle cap, sim-s, 40), RUN (8), CHANGE (none), FLAGS (sets
// ps.jointEyeFlags after the settle, when the root has it), MAXC (6).
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , root, outJson, ...rest] = process.argv;
const A = "FGH1HtvQeDjm6e4BII";
const DEFAULT: Array<[string, string]> = [["L", "?3.FCBQ1H6L4-6NPbeg8HHN09w"]];
for (const c of "123456789a") DEFAULT.push([`D_${c}`, `?${c}`]);
void A;
const jobs: Array<[string, string]> = rest.length
  ? rest.map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)] as [string, string]; })
  : DEFAULT;
const CAP = +(process.env.CAP ?? 40);
const RUN = +(process.env.RUN ?? 8);
const MAXC = +(process.env.MAXC ?? 6);
const fsUrl = (p: string): string => "/@fs/" + resolve(root, p).replace(/\\/g, "/");
const { ParticleSystem } = await import(/* @vite-ignore */ fsUrl("src/physics/particle_system.ts"));
const { SleepGate, physicsQuiet } = await import(/* @vite-ignore */ fsUrl("src/physics/sleep_gate.ts"));
const { buildSceneGraph } = await import(/* @vite-ignore */ fsUrl("src/core/scene_graph.ts"));
const { parseParams } = await import(/* @vite-ignore */ fsUrl("src/ui/url_state.ts"));

type Pass = { chain: number; ctrl: number };
type Eye = { j: number; x: number; ca: number; sa: number; fa: number; cb: number; sb: number; fb: number; first: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findEyes(ps: any): Eye[] {
  const chains: number[][] = ps.chains;
  const slot = new Map<number, [number, number]>();
  chains.forEach((ch, c) => ch.forEach((p, s) => slot.set(p, [c, s])));
  const passes = new Map<number, number[]>();
  for (const X of ps.crossings as Array<{ over: Pass; under: Pass }>) for (const P of [X.over, X.under]) {
    if (!passes.has(P.chain)) passes.set(P.chain, []);
    passes.get(P.chain)!.push(P.ctrl);
  }
  const out: Eye[] = [];
  (ps.fusedJunctions as number[][]).forEach((g, j) => {
    const mem = g.map((q) => slot.get(q)!);
    (ps.crossings as Array<{ over: Pass; under: Pass }>).forEach((X, xi) => {
      const arms: Array<[number, number, number] | null> = [X.over, X.under].map((P) => {
        let best: [number, number, number] | null = null;
        for (const [c, s] of mem) {
          if (c !== P.chain) continue;
          const dc = P.ctrl - s;
          if (Math.abs(dc) <= MAXC && (best === null || Math.abs(dc) < Math.abs(best[2] - best[1]))) best = [c, s, P.ctrl];
        }
        return best;
      });
      if (arms[0] === null || arms[1] === null) return;
      const [ca, sa, fa] = arms[0]; const [cb, sb, fb] = arms[1];
      if (ca === cb && sa === sb) return;
      // First pass on both arms (no other pass between the joint and it).
      const clear = (c: number, s: number, f: number): boolean =>
        !(passes.get(c) ?? []).some((v) => Math.abs(v - f) > 1e-9 && (v - s) * (f - v) > 0);
      out.push({ j, x: xi, ca, sa, fa, cb, sb, fb, first: clear(ca, sa, fa) && clear(cb, sb, fb) });
    });
  });
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function measure(ps: any, eyes: Eye[], tw: number, restScale: number): Array<Record<string, number | boolean | string>> {
  const pos: Float32Array = ps.positions;
  const chains: number[][] = ps.chains;
  const at = (c: number, f: number): [number, number] => {
    const ch = chains[c]; const n = ch.length; const i0 = Math.floor(f); const t = f - i0;
    const a = ch[((i0 % n) + n) % n]; const b = ch[(((i0 + 1) % n) + n) % n];
    return [pos[a * 2] * (1 - t) + pos[b * 2] * t, pos[a * 2 + 1] * (1 - t) + pos[b * 2 + 1] * t];
  };
  const rk = new Map<number, number>();
  for (const c of ps.structural as Array<{ a: number; b: number; rest: number }>) if (c.rest > 0) { rk.set(c.a * 1e6 + c.b, c.rest); rk.set(c.b * 1e6 + c.a, c.rest); }
  const armArcs = (c: number, s: number, f: number): [number, number] => {
    // rest arc and actual arc from slot s to ctrl f along chain c
    const lo = Math.min(s, f), hi = Math.max(s, f); const ch = chains[c]; const n = ch.length;
    let r = 0, L = 0; let prev = at(c, lo);
    for (let k = Math.floor(lo); k < hi; k++) {
      const u = Math.max(k, lo), v = Math.min(k + 1, hi);
      const seg = rk.get(ch[((k % n) + n) % n] * 1e6 + ch[(((k + 1) % n) + n) % n]) ?? NaN;
      r += seg * (v - u);
      const q = at(c, v); L += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q;
    }
    return [r * restScale, L];
  };
  return eyes.map((e) => {
    const NA = 24;
    const Apts = Array.from({ length: NA + 1 }, (_, k) => at(e.ca, e.sa + ((e.fa - e.sa) * k) / NA));
    const Bpts = Array.from({ length: NA + 1 }, (_, k) => at(e.cb, e.sb + ((e.fb - e.sb) * k) / NA));
    const segD = (p: [number, number], Q: Array<[number, number]>): number => {
      let m = Infinity;
      for (let i = 0; i + 1 < Q.length; i++) {
        const u = Q[i], v = Q[i + 1]; const dx = v[0] - u[0], dy = v[1] - u[1]; const L = dx * dx + dy * dy;
        const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L));
        m = Math.min(m, Math.hypot(p[0] - u[0] - t * dx, p[1] - u[1] - t * dy));
      }
      return m;
    };
    const opening = Math.max(Math.max(...Apts.map((p) => segD(p, Bpts))), Math.max(...Bpts.map((p) => segD(p, Apts)))) / tw;
    const ja = at(e.ca, e.sa); const xa = at(e.ca, e.fa); const xb = at(e.cb, e.fb);
    const xm: [number, number] = [(xa[0] + xb[0]) / 2, (xa[1] + xb[1]) / 2];
    const [ra, la] = armArcs(e.ca, e.sa, e.fa); const [rb, lb] = armArcs(e.cb, e.sb, e.fb);
    return {
      eye: `J${e.j}xX${e.x}`, first: e.first, open: +opening.toFixed(3), dist: +(Math.hypot(xm[0] - ja[0], xm[1] - ja[1]) / tw).toFixed(3),
      ctrlA: +Math.abs(e.fa - e.sa).toFixed(2), ctrlB: +Math.abs(e.fb - e.sb).toFixed(2),
      restA: +(ra / tw).toFixed(2), restB: +(rb / tw).toFixed(2), arcA: +(la / tw).toFixed(2), arcB: +(lb / tw).toFixed(2),
      chord: +(Math.hypot(xm[0] - ja[0], xm[1] - ja[1]) / tw).toFixed(2),
    };
  });
}

const all: Record<string, unknown> = {};
for (const [name, query] of jobs) {
  const p = parseParams(query);
  const tuning = {
    temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
    smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: p.threadWidth,
  };
  const ps = new ParticleSystem(buildSceneGraph({ ...p, title: "", glyphs2: "" }).graph);
  // JSET="field=value,..." sets private knobs before the settle (A/B work).
  for (const kv of (process.env.JSET ?? "").split(",").filter(Boolean)) { const [k, v] = kv.split("="); ps[k] = +v; }
    const gate = new SleepGate();
  let slept = Infinity;
  const t0 = performance.now();
  while (ps.simTime < CAP) { const s0 = ps.simTime; ps.step(0.1, tuning); if (gate.frame(physicsQuiet(ps), ps.simTime - s0)) { slept = ps.simTime; break; } }
  const wall = performance.now() - t0;
  const shrink = 0.82 + 0.15 * p.slack;
  const eyes = findEyes(ps);
  const m0 = measure(ps, eyes, p.threadWidth, shrink);
  const rec: Record<string, unknown> = { slept, wall, eyes: m0 };
  if (process.env.DIAG) {
    // Per-stage displacement of each eye's interior arm particles along the
    // opening direction (away from the other arm), mean per substep, over
    // DIAG sim-s at rest. Positive opens the eye.
    const pos: Float32Array = ps.positions;
    const chains: number[][] = ps.chains;
    const armParts = (c: number, s: number, f: number): number[] => {
      const out: number[] = []; const n = chains[c].length; const dir = Math.sign(f - s);
      for (let k = s + dir; dir > 0 ? k < f : k > f; k += dir) out.push(chains[c][((k % n) + n) % n]);
      return out;
    };
    const eyeParts = eyes.map((e) => ({ A: armParts(e.ca, e.sa, e.fa), B: armParts(e.cb, e.sb, e.fb) }));
    const normals = (): Array<Map<number, [number, number]>> => eyeParts.map(({ A, B }) => {
      const m = new Map<number, [number, number]>();
      const side = (P: number[], Q: number[]): void => {
        for (const p of P) {
          let best = Infinity, nx = 0, ny = 0;
          for (const q of Q) { const dx = pos[p * 2] - pos[q * 2], dy = pos[p * 2 + 1] - pos[q * 2 + 1]; const d = Math.hypot(dx, dy); if (d < best && d > 1e-9) { best = d; nx = dx / d; ny = dy / d; } }
          m.set(p, [nx, ny]);
        }
      };
      side(A, B); side(B, A); return m;
    });
    let nrm = normals();
    const acc = eyes.map(() => new Map<string, number>());
    let snap = Float32Array.from(pos); let subs = 0;
    const lastLabel = "fusion-snap";
    ps.phaseProbe = new Map(); ps.probeSnap = new Float32Array(pos.length);
    ps.probe = function (label: string): void {
      eyeParts.forEach(({ A, B }, ei) => {
        let s = 0; let n = 0;
        for (const p of [...A, ...B]) { const v = nrm[ei].get(p)!; s += (pos[p * 2] - snap[p * 2]) * v[0] + (pos[p * 2 + 1] - snap[p * 2 + 1]) * v[1]; n++; }
        const key = label === "slide+transversality" ? "verlet+slide" : label;
        acc[ei].set(key, (acc[ei].get(key) ?? 0) + (n ? s / n : 0));
      });
      snap = Float32Array.from(pos);
      if (label === lastLabel) subs++;
    };
    const T = +process.env.DIAG; const t1 = ps.simTime;
    while (ps.simTime < t1 + T) { ps.step(0.1, tuning); nrm = normals(); }
    delete ps.probe;
    const tw = p.threadWidth;
    eyes.forEach((e, ei) => {
      const row = [...acc[ei].entries()].map(([k, v]) => `${k}=${((v / subs) / tw * 1e3).toFixed(2)}`).join(" ");
      console.log(`  J${e.j}xX${e.x} open=${m0[ei].open} [1e-3 w/substep] ${row}`);
    });
  }
  const CHANGE = process.env.CHANGE ?? "";
  if (CHANGE || process.env.FLAGS !== undefined) {
    if (process.env.FLAGS !== undefined) ps.jointEyeFlags = +process.env.FLAGS;
    const g2 = new SleepGate(); let slept2 = Infinity; const t1 = ps.simTime;
    while (ps.simTime < t1 + RUN) {
      const s0 = ps.simTime; ps.step(0.1, tuning);
      if (slept2 === Infinity && ps.simTime - t1 > 1 && g2.frame(physicsQuiet(ps), ps.simTime - s0)) slept2 = ps.simTime - t1;
      else if (ps.simTime - t1 <= 1) g2.frame(false, ps.simTime - s0);
    }
    rec.after = measure(ps, eyes, p.threadWidth, shrink);
    rec.reslept = slept2;
  }
  all[name] = rec;
  const firstIdx = m0.map((e, i) => (e.first ? i : -1)).filter((i) => i >= 0);
  const op = firstIdx.map((i) => m0[i].open as number).sort((a, b) => a - b);
  // Sharp turns (> 60 deg), table.py's rule, on the settled state.
  let sharp = 0;
  {
    const P = ps.positions as Float32Array;
    (ps.chains as number[][]).forEach((ch, c) => {
      const n = ch.length; const brk = ps.chainBreakAfter[c] as number;
      for (let k = 0; k < n; k++) {
        if (brk >= 0 && (k === brk || (k - 1 + n) % n === brk)) continue;
        const a = ch[(k - 1 + n) % n], b = ch[k], d = ch[(k + 1) % n];
        const v1x = P[b * 2] - P[a * 2], v1y = P[b * 2 + 1] - P[a * 2 + 1];
        const v2x = P[d * 2] - P[b * 2], v2y = P[d * 2 + 1] - P[b * 2 + 1];
        const n1 = Math.hypot(v1x, v1y), n2 = Math.hypot(v2x, v2y);
        if (n1 < 1e-9 || n2 < 1e-9) continue;
        if ((v1x * v2x + v1y * v2y) / (n1 * n2) < 0.5) sharp++;
      }
    });
  }
  rec.sharp = sharp;
  const op1 = rec.after ? firstIdx.map((i) => (rec.after as typeof m0)[i].open as number).sort((a, b) => a - b) : null;
  console.log(`${name.padEnd(4)} sleep=${slept.toFixed(2)} wall=${wall.toFixed(0)}ms eyes=${eyes.length} first=${eyes.filter((e) => e.first).length} min=${op[0]?.toFixed(2)} <1.5:${op.filter((o) => o < 1.5).length} <2:${op.filter((o) => o < 2).length} sharp=${sharp}` +
    (op1 ? ` | after ${RUN}s min=${op1[0]?.toFixed(2)} <1.5:${op1.filter((o) => o < 1.5).length} <2:${op1.filter((o) => o < 2).length} reslept=${(rec.reslept as number).toFixed(2)}` : ""));
  if (process.env.VERBOSE) for (let i = 0; i < m0.length; i++) console.log("   ", JSON.stringify(m0[i]), rec.after ? `-> open ${(rec.after as typeof m0)[i].open} dist ${(rec.after as typeof m0)[i].dist} arcA ${(rec.after as typeof m0)[i].arcA} arcB ${(rec.after as typeof m0)[i].arcB}` : "");
}
if (outJson && outJson !== "-") writeFileSync(outJson, JSON.stringify(all));

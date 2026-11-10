// K1247 s8: one failing piece, full against reduced. Prints both pieces' ends,
// where they part, and the chain's features (s full -> s reduced).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s8_diag.ts --scene=def --mult=0.1 --piece=842 --eps=0.01
import { structure, frame } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = arg("scene") ?? "def"; const mult = +(arg("mult") ?? 0); const pi = +(arg("piece") ?? 0); const epsPx = +(arg("eps") ?? 0.01);
const still = load(name); const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
const K = selectKeep(still, { eps: epsPx / S });
const sc = sceneOf(name, mult);
// --jitter=<px>: compare against the full outline of the jittered scene (no reduction).
const jit = arg("jitter");
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const jitter = (s: typeof sc): typeof sc => { const o = JSON.parse(JSON.stringify(s)) as typeof sc; seed = 12345; for (const c of o.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * +jit!) / S / Math.SQRT2; return o; };
const red = jit !== undefined ? jitter(sc) : reduceScene(sc, K);
type Pc = { kind: string; chain: number; side: number; corner: number; region: number; pts: ArrayLike<number>; cpts?: ArrayLike<number> };
const a = (frame(structure(still), sc).pieces as Pc[]).map((p) => ({ ...p, pts: Array.from(p.pts), cpts: Array.from(p.cpts ?? []) }));
const b = (frame(structure(red), red).pieces as Pc[]).map((p) => ({ ...p, pts: Array.from(p.pts), cpts: Array.from(p.cpts ?? []) }));
const p = a[pi]; const r = b[pi];
const f = (v: number): string => v.toFixed(3);
const ends = (q: number[]): string => `(${f(q[0])},${f(q[1])}) .. (${f(q[q.length - 2])},${f(q[q.length - 1])}) n${q.length / 2}`;
console.log(`h ${h} world, S ${S} px/world`);
console.log(`full ${p.kind}/${p.chain}/${p.side}/${p.corner}/${p.region} pts ${ends(p.pts)} cpts ${ends(p.cpts)}`);
console.log(`red  ${r.kind}/${r.chain}/${r.side}/${r.corner}/${r.region} pts ${ends(r.pts)} cpts ${ends(r.cpts)}`);
// Each full point's distance to the reduced polyline, and vice versa.
function dPoly(x: number, y: number, q: number[]): number {
  let best = Infinity;
  for (let i = 0; i + 3 < q.length; i += 2) {
    const ax = q[i]; const ay = q[i + 1]; const ex = q[i + 2] - ax; const ey = q[i + 3] - ay; const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0; t = Math.min(1, Math.max(0, t));
    best = Math.min(best, Math.hypot(ax + ex * t - x, ay + ey * t - y));
  }
  return best;
}
const row = (lab: string, q: number[], o: number[]): void => { const ds: string[] = []; for (let i = 0; i < q.length; i += 2) { const d = dPoly(q[i], q[i + 1], o) * S; if (d > 0.25) ds.push(`${i / 2}:${d.toFixed(2)}`); } console.log(`${lab} points > 0.25 px: ${ds.join(" ")}`); };
row("full", p.pts, r.pts); row("red ", r.pts, p.pts);
// Pieces nearby with the same chain (neighbours in order).
for (let i = Math.max(0, pi - 3); i <= Math.min(a.length - 1, pi + 3); i++) console.log(`  #${i} full ${a[i].kind}/${a[i].chain}/${a[i].side}/${a[i].corner}/${a[i].region} ${ends(a[i].pts)} | red ${b[i].kind}/${b[i].chain}/${b[i].side}/${b[i].corner}/${b[i].region} ${ends(b[i].pts)}`);
// The chain's features.
const ci = sc.chains.findIndex((c) => c.id === p.chain);
console.log(`chain ${p.chain}: n ${sc.chains[ci].pts.length / 2} kept ${K.idx[ci].length} closed ${sc.chains[ci].closed}`);
sc.crossings.forEach((x, k) => { for (const [lab, e, er] of [["a", x.a, red.crossings[k].a], ["b", x.b, red.crossings[k].b]] as const) if (e.chain === p.chain) console.log(`  crossing ${k}.${lab} s ${f(e.s)} -> ${f(er.s)}`); });
sc.junctions.forEach((j, k) => j.arms.forEach((m, q) => { if (m.chain === p.chain) console.log(`  junction ${k} arm ${q} s ${f(m.s)} -> ${f(red.junctions[k].arms[q].s)}`); }));
sc.deadEnds.forEach((e, k) => { if (e.chain === p.chain) console.log(`  deadEnd ${k} s ${f(e.s)} -> ${f(red.deadEnds[k].s)}`); });
// s (full chain) of each cpts end, and the features within 4h of it.
{
  const c = sc.chains[ci]; const P = c.pts; const n = P.length / 2;
  const sOf = (x: number, y: number): [number, number] => { let best = Infinity; let bs = 0; let acc = 0; for (let i = 0; i + 1 < n; i++) { const ax = P[2 * i]; const ay = P[2 * i + 1]; const ex = P[2 * i + 2] - ax; const ey = P[2 * i + 3] - ay; const l = Math.hypot(ex, ey); let t = l > 0 ? ((x - ax) * ex + (y - ay) * ey) / (l * l) : 0; t = Math.min(1, Math.max(0, t)); const d = Math.hypot(ax + ex * t - x, ay + ey * t - y); if (d < best) { best = d; bs = acc + t * l; } acc += l; } return [bs, best]; };
  const feats: [string, number][] = [];
  sc.crossings.forEach((x, k) => { if (x.a.chain === p.chain) feats.push([`crossing ${k}.a (other ch${x.b.chain}, over ${(x as unknown as { over?: string }).over ?? "?"})`, x.a.s]); if (x.b.chain === p.chain) feats.push([`crossing ${k}.b (other ch${x.a.chain})`, x.b.s]); });
  sc.junctions.forEach((j, k) => j.arms.forEach((m, q) => { if (m.chain === p.chain) feats.push([`junction ${k} arm ${q}`, m.s]); }));
  sc.deadEnds.forEach((e, k) => { if (e.chain === p.chain) feats.push([`deadEnd ${k}`, e.s]); });
  for (const [lab, q] of [["full", p.cpts], ["red", r.cpts]] as const) {
    for (const end of [0, q.length - 2]) {
      const [s, d] = sOf(q[end], q[end + 1]);
      console.log(`${lab} cpts ${end === 0 ? "start" : "end"} s ${s.toFixed(4)} (off ${d.toExponential(1)}): ${feats.filter(([, fs]) => Math.abs(fs - s) < 4 * h).map(([l, fs]) => `${l} @${fs.toFixed(3)} (${((fs - s) / h).toFixed(2)}h)`).join("; ")}`);
    }
  }
  console.log(JSON.stringify(sc.crossings[0]));
}

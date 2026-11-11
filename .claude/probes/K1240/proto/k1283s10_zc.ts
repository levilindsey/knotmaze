// K1283 s10: zChains(scene) time on a scene (median of --n), and a hash of its output (passes, z)
// so a faster zChains can be checked bit for bit.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s10_zc.ts [scene=def] [--n=40]
import { zChains } from "./draw";
import { loadScene } from "./k1279_census";
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--")) ?? "def";
const N = Number(args.find((a) => a.startsWith("--n="))?.slice(4) ?? 40);
const scene = loadScene(name);
const t: number[] = [];
let zz = zChains(scene);
for (let i = 0; i < N; i++) { const a = performance.now(); zz = zChains(scene); t.push(performance.now() - a); }
t.sort((x, y) => x - y);
let h = 2166136261; const mix = (v: number): void => { const b = new Float64Array([v]); const u = new Uint32Array(b.buffer); h = Math.imul(h ^ u[0], 16777619); h = Math.imul(h ^ u[1], 16777619); };
for (const ps of zz.passes) for (const q of ps) { mix(q.s); mix(q.so); mix(q.lo); mix(q.hi); mix(q.rO); mix(q.o); }
for (const c of zz.zc) for (let k = 0; k < c.n; k++) mix(c.z[k]);
console.log(`${name}: zChains median ${t[t.length >> 1].toFixed(2)} ms (p10 ${t[Math.floor(N / 10)].toFixed(2)}), hash ${(h >>> 0).toString(16)}`);
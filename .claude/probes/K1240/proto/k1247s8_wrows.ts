import { structure, frame, wDbg, cfStats, type SceneIn } from "./outline";
import { load } from "./k1247s5_scenes";
const name = process.argv[2]; const ci = +process.argv[3]; const dpx = +process.argv[4];
const still = load(name); const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
for (const [lab, s] of [["full", still], ["jit", sc]] as const) {
  wDbg.ci = ci; wDbg.rows = [];
  const st = structure(s);
  const c0 = { ...cfStats };
  const t = frame(st, s);
  console.log(`${lab}: r ${t.corners[ci].r.toFixed(4)} cf fails ${cfStats.fails - c0.fails} jumps ${cfStats.jumps - c0.jumps} dips ${cfStats.dips - c0.dips}`);
  for (const r of wDbg.rows) console.log(`   kind ${r[0]} rho-h ${r[1].toFixed(4)}h w ${r[2].toFixed(5)} q (${r[3].toFixed(4)},${r[4].toFixed(4)}) ua ${r[5].toFixed(4)} ub ${r[6].toFixed(4)} da ${r[7].toFixed(4)} db ${r[8].toFixed(4)}`);
}

// K1344 s1: frame() with the hook cut off and on, in one module (outline_proto.ts, K1344.fix), ABBA by rep.
//   node scripts/run_node.mjs .claude/probes/K1344/k1344_speed.ts [scenes] [--reps=40]
// Prints per scene the median ms of each, the difference and the run-to-run spread (half the IQR of off).
import * as P from "./outline_proto";
import { loadScene } from "../K1314/k1314_census";

const a = process.argv.slice(2);
const names = a[0] && !a[0].startsWith("--") ? a[0].split(",") : ["muse_hash", "g41_user_tw64", "def"];
const REPS = Number(a.find((x) => x.startsWith("--reps="))?.slice(7) ?? 40);
const med = (v: number[]): number => { const s = [...v].sort((x, y) => x - y); return s[s.length >> 1]; };
const q = (v: number[], f: number): number => { const s = [...v].sort((x, y) => x - y); return s[Math.floor(f * (s.length - 1))]; };
for (const nm of names) {
  const scene = loadScene(nm) as never; const st = P.structure(scene);
  const t = { off: [] as number[], on: [] as number[] };
  const run = (fix: boolean): void => { P.K1344.fix = fix; const t0 = performance.now(); P.frame(st, scene); t[fix ? "on" : "off"].push(performance.now() - t0); };
  for (let i = 0; i < 6; i++) { run(false); run(true); }
  t.off.length = 0; t.on.length = 0;
  for (let r = 0; r < REPS; r++) { if (r % 2) { run(true); run(false); } else { run(false); run(true); } }
  const mo = med(t.off); const mn = med(t.on); const spread = (q(t.off, 0.75) - q(t.off, 0.25)) / 2;
  console.log(`${nm}: off ${mo.toFixed(3)} ms, on ${mn.toFixed(3)} ms, on - off ${(mn - mo).toFixed(3)} ms; spread (half IQR of off) ${spread.toFixed(3)} ms`);
}

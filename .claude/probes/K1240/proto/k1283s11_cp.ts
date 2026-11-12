// K1283 s11: contact passes' count and zChains' cost, scene by scene: total passes, the most on one
// chain, the most whose own windows overlap at one s (band_gpu.ts packs BAND_SLOTS per quad), and
// zChains' median ms over 15 runs.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s11_cp.ts def fat muse_hash g41_user_tw64
import * as D from "./draw";
import * as DB from "./k1283s11_before_draw";
import { loadScene } from "./k1279_census";

for (const nm of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const scene = loadScene(nm);
  const zz = D.zChains(scene as never);
  const nCross = scene.crossings.length * 2;
  let tot = 0; let maxC = 0; let maxOv = 0;
  zz.passes.forEach((P, c) => {
    tot += P.length; if (P.length > maxC) maxC = P.length;
    const C = zz.zc[c];
    for (const A of P) { let n = 0; for (const B of P) { const ds = D.dSC(C, A.s, B.s); if (ds >= -B.lo - A.hi && ds <= B.hi + A.lo) n++; } if (n > maxOv) maxOv = n; }
  });
  const ms: number[] = [];
  for (let r = 0; r < 15; r++) { const t0 = performance.now(); D.zChains(scene as never); ms.push(performance.now() - t0); }
  ms.sort((a, b) => a - b);
  const zb = DB.zChains(scene as never);
  const tb: number[] = []; for (let r = 0; r < 15; r++) { const t0 = performance.now(); DB.zChains(scene as never); tb.push(performance.now() - t0); } tb.sort((a, b) => a - b);
  if (process.argv.includes("--dump")) zz.passes.forEach((P, c) => { const k = zb.passes[c].length; if (P.length > k) console.log(`  ch${c} n${k}: ${P.slice(k).map((q) => `>${q.o}@${q.s.toFixed(2)}±${q.hi.toFixed(2)} so${q.so.toFixed(2)} rO${q.rO.toFixed(2)}`).join(" ")}`); });
  { let N = 0; let L = 0; for (const c of zz.zc) { N += c.n; L += c.len; } console.log(`vertices ${N} length ${L.toFixed(0)} spacing ${(L / N).toFixed(3)} junctions ${scene.junctions.length}`); }
  console.log(`master zChains ${tb[7].toFixed(2)} ms`);
  console.log(`${nm}: chains ${zz.zc.length} crossing passes ${nCross} all passes ${tot} contact ${tot - nCross} max/chain ${maxC} max overlap ${maxOv} zChains ${ms[7].toFixed(2)} ms`);
}

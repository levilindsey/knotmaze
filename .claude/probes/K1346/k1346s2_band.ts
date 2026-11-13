// K1346 s2: the app's band part (BandRecState.band, outline_model.ts bandOf) on master's frame() table against
// the branch's, over a captured drag as the worker runs it. The band code is the branch's on both sides; only the
// table (frame()'s output: stage 1's trimmed / pinned pieces) differs. Rounds M B B M ..., a fresh structure and
// BandRecState per drag; prints the per-frame p50 of the band call, its per-drag sum (median over rounds after
// the first), the GC inside it and the band's quad count. Master's copy is outline_m2.ts (see k1346s2_ab.ts).
//   node --expose-gc scripts/run_node.mjs .claude/probes/K1346/k1346s2_band.ts <dragDir> [rounds=8]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PerformanceObserver, performance } from "node:perf_hooks";
import * as B from "../../../src/render/outline/outline";
import * as M from "../../../src/render/outline/outline_m2";
import { zChains } from "../../../src/render/outline/draw";
import { BandRecState } from "../../../src/render/outline/band_rec";
import type { SceneIn } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const rounds = +(process.argv.find((a) => a.startsWith("rounds="))?.slice(7) ?? "8");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const cap = files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
type Mod = typeof B;
const mods: Record<string, Mod> = { M: M as unknown as Mod, B };
let gcMs = 0; let inBand = false; let gcN = 0;
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (inBand) { gcMs += e.duration; gcN++; } }).observe({ entryTypes: ["gc"] });
const g = (globalThis as { gc?: () => void }).gc;
const drag = (O: Mod): { t: number[]; gc: number; quads: number; rl: number } => {
  O.OB_DI.on = true;
  const st = O.structure(cap[0]);
  const br = new BandRecState(true);
  const t0 = O.frame(st, cap[0]); br.band(st as never, t0 as never, cap[0], zChains(cap[0]));
  const t: number[] = []; gcMs = 0; gcN = 0; let quads = 0;
  for (let i = 1; i < cap.length; i++) {
    const sc = O.alignJunctionArms(st, cap[i]);
    O.OB_DI.on = true;
    const tab = O.frame(st, sc); const zz = zChains(sc);
    inBand = true; const a = performance.now();
    const out = br.band(st as never, tab as never, sc, zz);
    t.push(performance.now() - a); inBand = false;
    quads += (out as { count?: number }).count ?? 0;
  }
  return { t, gc: gcMs, quads, rl: br.relayouts };
};
const res: Record<string, { sums: number[]; all: number[]; gc: number; quads: number; rl: number[] }> = { M: { sums: [], all: [], gc: 0, quads: 0, rl: [] }, B: { sums: [], all: [], gc: 0, quads: 0, rl: [] } };
for (let r = 0; r < rounds; r++) {
  for (const k of r % 2 ? ["B", "M"] : ["M", "B"]) {
    g?.();
    const d = drag(mods[k]);
    if (r === 0) continue;
    res[k].sums.push(d.t.reduce((s, v) => s + v, 0)); res[k].all.push(...d.t); res[k].gc += d.gc; res[k].quads = d.quads; res[k].rl.push(d.rl);
  }
}
const med = (a: number[]): number => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
for (const k of ["M", "B"]) {
  const R = res[k];
  console.log(`${k}: band p50 ${med(R.all).toFixed(2)} ms | drag sum med ${med(R.sums).toFixed(1)} (${Math.min(...R.sums).toFixed(1)}-${Math.max(...R.sums).toFixed(1)}) | gc ${(R.gc / (rounds - 1)).toFixed(1)} ms per drag | quads per drag ${R.quads} | relayouts per drag ${R.rl.join(",")}`);
}

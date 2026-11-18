// K1451 s3: per spot, mirror pixels that differ from master gf (windows = win) for the stage 2 windows and for
// arm-clip variants of them, in a span x span h patch at N x N. GF_NOCLIP=1 required (T carries stage 2's windows).
//   $env:GF_NOCLIP='1'; node scripts/run_node.mjs .claude/probes/K1451/k1451_clipcmp.ts [span=4] [N=48] <scene:x:y>...
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const args = process.argv.slice(2); const span = +args[0]; const N = +args[1]; const specs = args.slice(2);
type Mode = "s2" | "in_win" | "in_keep" | "home_only" | "in_root" | "in_out";
function clip(T: any, mode: Mode): [Float64Array, Float64Array] {
  const wL = Float64Array.from(T.pinWL); const wR = Float64Array.from(T.pinWR); if (mode === "s2") return [wL, wR];
  for (let c = 0; c < T.nC; c++) {
    const a0 = T.cArm0[c]; const an = T.cArmN[c]; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
    for (let q = T.cPin0[c]; q < T.cPin0[c] + T.cPinN[c]; q++) {
      const s = T.pinS[q]; let dR = Infinity; let dL = Infinity; let inside = false; let rootL = false; let rootR = false;
      for (let i = a0; i < a0 + an; i++) {
        const lo0 = mode === "home_only" ? T.aL[i] : 0;
        const ext = Math.max(T.aL[i], T.aHome[i]); if (!(ext > lo0)) continue;
        const e1 = T.aSR[i] + T.aDir[i] * lo0; const e2 = T.aSR[i] + T.aDir[i] * ext; const lo = Math.min(e1, e2); const hi = Math.max(e1, e2);
        const md = (v: number): number => ((v % len) + len) % len;
        const isIn = closed ? md(s - lo) <= hi - lo : s >= lo && s <= hi;
        if (isIn) { inside = true; if (T.aDir[i] > 0) rootL = true; else rootR = true; continue; }
        if (closed) { dR = Math.min(dR, md(lo - s)); dL = Math.min(dL, md(s - hi)); }
        else if (lo > s) dR = Math.min(dR, lo - s); else dL = Math.min(dL, s - hi);
      }
      if (inside && mode === "in_win") { wL[q] = T.win; wR[q] = T.win; continue; }
      if (inside && mode === "in_root") { if (rootL) wL[q] = T.win; if (rootR) wR[q] = T.win; continue; }
      if (inside && mode === "in_out") { if (!rootL) wL[q] = T.win; if (!rootR) wR[q] = T.win; continue; }
      if (inside) continue;
      wR[q] = Math.max(T.win, Math.min(wR[q], dR)); wL[q] = Math.max(T.win, Math.min(wL[q], dL));
    }
  }
  return [wL, wR];
}
const cache = new Map<string, any>();
const modes: Mode[] = ["s2", "in_win", "in_root", "in_out"];
for (const spec of specs) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  if (!cache.has(nm)) { const m = buildModel(nm); const sc = m.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2); const T: any = buildTables(sc, { aa, home: true });
    const Ev: any = { m: new GfEval({ ...T, pinWL: new Float64Array(T.pinWL.length).fill(T.win), pinWR: new Float64Array(T.pinWR.length).fill(T.win) }) };
    for (const md of modes) { const [a, b] = clip(T, md); Ev[md] = new GfEval({ ...T, pinWL: a, pinWR: b }); }
    if (process.env.FL !== undefined) for (const k of Object.keys(Ev)) Ev[k].fadeLength = +process.env.FL;
    cache.set(nm, { T, Ev }); }
  const { T, Ev } = cache.get(nm); const h = T.h;
  const cnt: Record<string, number> = {}; for (const md of modes) cnt[md] = 0; let s2vs: Record<string, number> = {}; for (const md of modes) s2vs[md] = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x = X + ((c + 0.5) / N - 0.5) * span * h, y = Y + ((r + 0.5) / N - 0.5) * span * h;
    const a = Ev.m.eval(x, y); const ka = `${a.chain}:${Math.round(a.ink * 8)}`;
    const b = Ev.s2.eval(x, y); const kb = `${b.chain}:${Math.round(b.ink * 8)}`;
    for (const md of modes) { const v = Ev[md].eval(x, y); const kv = `${v.chain}:${Math.round(v.ink * 8)}`; if (kv !== ka) cnt[md]++; if (kv !== kb) s2vs[md]++; }
  }
  console.log(`${spec.padEnd(28)} vs master: ${modes.map((md) => `${md} ${cnt[md]}`).join("  ")}   vs s2: ${modes.slice(1).map((md) => `${md} ${s2vs[md]}`).join("  ")}`);
}

// K1451 s4: candidate window rules at named spots, in the mirror. Per spot and rule: pixels (chain:ink/8) that differ
// from master gf (windows = win), from stage 3's clip, and from stage 2's unclipped windows, in a span x span h patch.
// GF_NOCLIP=1 required (T then carries stage 2's windows).
//   $env:GF_NOCLIP='1'; node scripts/run_node.mjs .claude/probes/K1451/k1451_s4_rules.ts [span=4] [N=48] <scene:x:y[:FL]>...
// env RULES=comma list (default all).
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const args = process.argv.slice(2); const span = +args[0]; const N = +args[1]; const specs = args.slice(2);
export type Rule = "s2" | "clip" | "armL" | "armL_hin" | "half" | "rootcut" | "long" | "over";
/** The windows under a rule. ext(i) = the interval each arm blocks: [aSR, aSR + aDir ext]; inside -> win both sides. */
export function rule(T: any, r: Rule): [Float64Array, Float64Array] {
  if ((r as string).endsWith("+k")) return rule(T, (r as string).slice(0, -2) as Rule);
  const wL = Float64Array.from(T.pinWL); const wR = Float64Array.from(T.pinWR); if (r === "s2") return [wL, wR];
  if (r === "over") {
    // armL_hin on over pins (z > 0), the clip on under pins
    const [aL, aR] = rule(T, "armL_hin"); const [cL, cR] = rule(T, "clip");
    for (let q = 0; q < wL.length; q++) { const o = T.pinZ[q] > 0; wL[q] = o ? aL[q] : cL[q]; wR[q] = o ? aR[q] : cR[q]; }
    return [wL, wR];
  }
  if (r === "long") {
    // armL_hin on a side whose stage 2 window is at least LONGK win, the clip on the others
    const K = +(process.env.LONGK ?? 2); const [aL, aR] = rule(T, "armL_hin"); const [cL, cR] = rule(T, "clip");
    for (let q = 0; q < wL.length; q++) { wL[q] = T.pinWL[q] >= K * T.win ? aL[q] : cL[q]; wR[q] = T.pinWR[q] >= K * T.win ? aR[q] : cR[q]; }
    return [wL, wR];
  }
  for (let c = 0; c < T.nC; c++) {
    const a0 = T.cArm0[c]; const an = T.cArmN[c]; if (an === 0) continue; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
    const md = (v: number): number => ((v % len) + len) % len;
    for (let q = T.cPin0[c]; q < T.cPin0[c] + T.cPinN[c]; q++) {
      const s = T.pinS[q]; let dR = Infinity; let dL = Infinity; let inside = false;
      for (let i = a0; i < a0 + an; i++) {
        const home = Math.max(T.aL[i], T.aHome[i]);
        const cut = r === "clip" ? home : r === "half" ? 0.5 * (T.aL[i] + home) : r === "rootcut" ? 0 : T.aL[i];
        const inExt = r === "armL_hin" ? home : cut;
        const iv = (ext: number): [number, number] => { const e2 = T.aSR[i] + T.aDir[i] * ext; return [Math.min(T.aSR[i], e2), Math.max(T.aSR[i], e2)]; };
        if (inExt > 0) { const [lo, hi] = iv(inExt); if (closed ? md(s - lo) <= hi - lo : s >= lo && s <= hi) inside = true; }
        if (r === "rootcut") { const d = closed ? md(T.aSR[i] - s) : T.aSR[i] - s; const e = closed ? md(s - T.aSR[i]) : s - T.aSR[i]; if (d >= 0) dR = Math.min(dR, d); if (e >= 0) dL = Math.min(dL, e); continue; }
        if (!(cut > 0)) continue;
        const [lo, hi] = iv(cut);
        if (closed) { dR = Math.min(dR, md(lo - s)); dL = Math.min(dL, md(s - hi)); }
        else if (lo > s) dR = Math.min(dR, lo - s); else if (hi < s) dL = Math.min(dL, s - hi);
      }
      if (inside) { wL[q] = T.win; wR[q] = T.win; continue; }
      wR[q] = Math.max(T.win, Math.min(wR[q], dR)); wL[q] = Math.max(T.win, Math.min(wL[q], dL));
    }
  }
  return [wL, wR];
}
/** "+k" variants: member() reads the key depth (the home ramp then fades with the key, not the win depth). */
export function keyMember(E: any): void { const d0 = E.depth.bind(E); E.depth = (c: number, s: number): number => { const z = d0(c, s); E.mz = z; return z; }; }
const cache = new Map<string, any>();
const rules: Rule[] = (process.env.RULES ?? "clip,armL,armL_hin,half,rootcut").split(",") as Rule[];
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  console.log(`spot`.padEnd(34) + ` s2:m s2:clip | ` + rules.map((r) => `${r}: m clip s2`).join(" | "));
  for (const spec of specs) {
    const [nm, xs, ys, fl] = spec.split(":"); const X = +xs, Y = +ys;
    const key = `${nm}:${fl ?? ""}`;
    if (!cache.has(key)) {
      const m = buildModel(nm); const sc = m.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2); const T: any = buildTables(sc, { aa, home: true });
      const Ev: any = { m: new GfEval({ ...T, pinWL: new Float64Array(T.pinWL.length).fill(T.win), pinWR: new Float64Array(T.pinWR.length).fill(T.win) }) };
      for (const r of ["s2", "clip", ...rules] as Rule[]) { const [a, b] = rule(T, r); Ev[r] = new GfEval({ ...T, pinWL: a, pinWR: b }); if ((r as string).endsWith("+k")) keyMember(Ev[r]); }
      if (fl !== undefined) for (const k of Object.keys(Ev)) Ev[k].fadeLength = +fl;
      cache.set(key, { T, Ev });
    }
    const { T, Ev } = cache.get(key); const h = T.h;
    const keys: Record<string, string[]> = {};
    for (const k of Object.keys(Ev)) keys[k] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = X + ((c + 0.5) / N - 0.5) * span * h, y = Y + ((r + 0.5) / N - 0.5) * span * h;
      for (const k of Object.keys(Ev)) { const v = Ev[k].eval(x, y); keys[k].push(`${v.chain}:${Math.round(v.ink * 8)}`); }
    }
    const diff = (a: string, b: string): number => { let n = 0; for (let i = 0; i < keys[a].length; i++) if (keys[a][i] !== keys[b][i]) n++; return n; };
    console.log(`${spec.padEnd(34)} ${String(diff("s2", "m")).padStart(4)} ${String(diff("s2", "clip")).padStart(4)} | ` + rules.map((r) => `${String(diff(r, "m")).padStart(4)} ${String(diff(r, "clip")).padStart(4)} ${String(diff(r, "s2")).padStart(4)}`).join(" | "));
  }
}

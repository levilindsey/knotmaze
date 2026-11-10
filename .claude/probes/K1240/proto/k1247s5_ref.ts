// K1247 s5: the converged corner reference. Grows every corner with the
// same equations as outline.ts (outline_ref.ts, from k1247s5_mkref.mjs) at
// N = 32, 64, ... nodes with an exact stop where w reaches 0, doubling
// until no corner moves more than 1e-4 h between N and 2N (or N = NMAX).
// Writes out/k1247s5/ref_<scene>_<mult>.json: per corner q, r, ta, tb at
// the finest N, and each corner's q per N (the branch record), plus the
// plain 32-node run (no exact stop: today's output).
//   node .claude/probes/K1240/proto/k1247s5_mkref.mjs
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s5_ref.ts [--nmax=8192] [--scene=def]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneIn } from "./outline";
import * as R from "./outline_ref";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "k1247s5");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const nmax = +(process.argv.find((a) => a.startsWith("--nmax="))?.slice(7) ?? 65536);
const only = process.argv.find((a) => a.startsWith("--scene="))?.slice(8);
const onlyMult = process.argv.find((a) => a.startsWith("--mult="))?.slice(7);
// The jump floor: an advance lands within max(0.5 |u| dd, floor h) of its
// predictor (today 1e-3 h, which rejects more foot jumps as steps shrink).
const floor = +(process.argv.find((a) => a.startsWith("--floor="))?.slice(8) ?? 0.1);
R.setRefAccFloor(floor);
const tag = process.argv.find((a) => a.startsWith("--tag="))?.slice(6) ?? "";

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
// k1247c_dump.ts's perturb (--consistent).
export function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const cumOf = (c: { closed: boolean; pts: number[] }): number[] => {
    const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1; const cum = [0];
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
    return cum;
  };
  const before = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1]; const d = dxy(x, y);
      c.pts[i] = x + d[0];
      c.pts[i + 1] = y + d[1];
    }
  }
  const after = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const closedOf = new Map(sc.chains.map((c) => [c.id, c.closed]));
  const remap = (chain: number, s: number): number => {
    const o = before.get(chain); const p = after.get(chain);
    if (!o || !p || o.length < 2) return s;
    const L = o[o.length - 1]; let u = s;
    if (closedOf.get(chain) && L > 0) u = ((u % L) + L) % L;
    let i = 0; while (i + 2 < o.length && o[i + 1] < u) i++;
    const t = o[i + 1] > o[i] ? (u - o[i]) / (o[i + 1] - o[i]) : 0;
    return p[i] + (p[i + 1] - p[i]) * t;
  };
  const any = sc as unknown as { crossings?: { a: { chain: number; s: number }; b: { chain: number; s: number } }[]; junctions?: { c: number[]; arms: { chain: number; s: number }[] }[]; deadEnds?: { chain: number; s: number }[] };
  for (const x of any.crossings ?? []) { x.a.s = remap(x.a.chain, x.a.s); x.b.s = remap(x.b.chain, x.b.s); }
  for (const j of any.junctions ?? []) { const d = dxy(j.c[0], j.c[1]); j.c[0] += d[0]; j.c[1] += d[1]; for (const a of j.arms) a.s = remap(a.chain, a.s); }
  for (const e of any.deadEnds ?? []) e.s = remap(e.chain, e.s);
  return sc;
}
interface Cn { ok: boolean; r: number; qx: number; qy: number; tax: number; tay: number; tbx: number; tby: number }
const cdist = (a: Cn, b: Cn): number => Math.max(Math.hypot(a.qx - b.qx, a.qy - b.qy), Math.hypot(a.tax - b.tax, a.tay - b.tay), Math.hypot(a.tbx - b.tbx, a.tby - b.tby));
function run(scene: SceneIn, N: number, stop: boolean, fl = floor): { cs: Cn[]; why: number[] } {
  R.setRefGN(N); R.setRefStop(stop); R.setRefAccFloor(fl);
  const st = R.structure(scene);
  const t = R.frame(st, scene);
  const cs = t.corners.map((c) => ({ ok: c.ok, r: c.r, qx: c.qx, qy: c.qy, tax: c.tax, tay: c.tay, tbx: c.tbx, tby: c.tby }));
  return { cs, why: Array.from(R.refInfo.why.slice(0, cs.length)) };
}
const summary: string[] = [];
for (const name of ALL) {
  if (only && name !== only) continue;
  const orig = load(name);
  const mults = ["def", "ring", "fat"].includes(name) ? [0, 0.1, 0.5] : [0, 0.1];
  for (const mult of mults) {
    if (onlyMult !== undefined && +onlyMult !== mult) continue;
    const sc = mult ? perturb(orig, mult * orig.look.halfWidth) : orig;
    const h = orig.look.halfWidth;
    const t0 = Date.now();
    const today = run(sc, 32, false, 1e-3);
    const today128 = run(sc, 128, false, 1e-3);
    const hist: { N: number; cs: Cn[]; why: number[] }[] = [];
    let conv = -1;
    for (let N = 32; N <= nmax; N *= 2) {
      const r = run(sc, N, true);
      hist.push({ N, ...r });
      if (hist.length >= 2) {
        const a = hist[hist.length - 2].cs; const b = r.cs;
        let m = 0; for (let i = 0; i < a.length; i++) if (a[i].ok && b[i].ok) m = Math.max(m, cdist(a[i], b[i]) / h);
        if (m < 1e-4) { conv = N; break; }
      }
    }
    const fin = hist[hist.length - 1];
    // Per-N max distance to the finest, and today's.
    const dTo = (cs: Cn[]): { m: number; at: number } => { let m = 0; let at = -1; for (let i = 0; i < cs.length; i++) if (cs[i].ok && fin.cs[i].ok) { const d = cdist(cs[i], fin.cs[i]) / h; if (d > m) { m = d; at = i; } } return { m, at }; };
    const td = dTo(today.cs);
    const td128 = dTo(today128.cs);
    // The corners today misses most: r (in h) and why, today | 128 | ref.
    const worst = today.cs.map((c, i) => ({ i, d: c.ok && fin.cs[i].ok ? cdist(c, fin.cs[i]) / h : 0 })).sort((x, y) => y.d - x.d).slice(0, 3)
      .map((x) => `c${x.i} ${x.d.toFixed(3)}h r ${(today.cs[x.i].r / h).toFixed(3)}/${(today128.cs[x.i].r / h).toFixed(3)}/${(fin.cs[x.i].r / h).toFixed(3)} why ${today.why[x.i]}/${today128.why[x.i]}/${fin.why[x.i]}`).join("; ");
    const perN = hist.map((x) => { const d = dTo(x.cs); return `${x.N}:${d.m.toExponential(1)}@${d.at}`; }).join(" ");
    const whyCount = [0, 0, 0, 0]; for (const w of fin.why) whyCount[w] = (whyCount[w] ?? 0) + 1;
    const line = `${name} ${mult}: conv ${conv > 0 ? `N=${conv}` : `NOT by ${fin.N}`}; today->ref ${td.m.toFixed(4)} h @corner ${td.at}; today128->ref ${td128.m.toFixed(4)} h @corner ${td128.at}; worst [${worst}]; perN->ref ${perN}; why(r0/w0/fail) ${whyCount[1]}/${whyCount[2]}/${whyCount[3]}; ${((Date.now() - t0) / 1000).toFixed(1)}s`;
    console.log(line); summary.push(line);
    writeFileSync(join(outDir, `ref${tag}_${name}_${mult}.json`), JSON.stringify({ name, mult, h, conv, N: fin.N, ref: fin.cs, why: fin.why, today: today.cs, todayWhy: today.why, today128: today128.cs, today128Why: today128.why, hist: hist.map((x) => ({ N: x.N, q: x.cs.map((c) => [c.qx, c.qy, c.r]) })) }));
  }
}
writeFileSync(join(outDir, `ref${tag}_summary${only ? "_" + only : ""}.txt`), summary.join("\n") + "\n");

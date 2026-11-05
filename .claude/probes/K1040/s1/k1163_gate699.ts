// K1114 S1i: a copy of gate699_s1g.ts with HERE from import.meta.url and output in out/k1163.
// K1040 S1g step 3: solveCorner's 699 on its LOW side, a candidate (the
// worktree's form B with PARAMS, e.g. the root gate {"rootBand":0.5}) against
// S1f's final (form_b_s1f_q.ts, frozen). Copied from S1f's gate699.ts (its Y:
// three ENDs, h 1, chain 1's root at (−e, 0); corner 0-1 opens 2.0 rad and
// V's foot on arm 0 sits at x = 0.6424 − e, so it reaches the root at
// e = 0.6424), plus:
// C. the census at rest over the 12 scenes: every corner whose r or ω moves
//    against the same form B with rootBand 0 (the root gate alone), its
//    smaller dV, and the census's nearest corners (muse_hash jj124,
//    g41_user_tw64 jj12) whatever they do.
// Run: $env:PARAMS='{"rootBand":0.5}'; $env:TAG='rb05'; npx vite-node .claude/probes/K1040/s1/gate699_s1i.ts
//   (writes out/k1163/gate699_<TAG>.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type FormBParams } from "../../../../src/render/field/form_b";
import { FormB as FormBOld } from "./form_b_s1f_q";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const TAG = process.env.TAG ?? "new";
const extra = JSON.parse(process.env.PARAMS ?? "{}") as FormBParams;
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
type Row = { t: number; vals: number[]; txt: string };
type AnyFB = FormB | FormBOld;
function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function yOff(e: number): FieldScene {
  const pb = 2.0;
  const pc = -2.2;
  const pts = [line(0, 0, 10, 0), line(-e, 0, -e + 10 * Math.cos(pb), 10 * Math.sin(pb)), line(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc))];
  return {
    version: 1,
    name: "gate699",
    source: { kind: "synthetic", generator: "gates", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: pts.map((p, id) => ({ id, closed: false, pts: p, z: new Array(p.length / 2).fill(0) })),
    crossings: [],
    junctions: [
      {
        id: "j0",
        c: [0, 0],
        arms: [0, 1, 2].map((chain) => ({ chain, s: 0, dir: 1, kind: "end" as const })),
        corners: [0, 1, 2].map(() => ({ style: "round" as const, pinned: false })),
      },
    ],
    deadEnds: [],
  } as FieldScene;
}
function sweep(title: string, which: "old" | "new", ts: number[], ca: number, cb: number, pts: [number, number][], every: number): void {
  out.push(`${title} [${which}]`);
  out.push(`         e  L(a${ca}) L(a${cb})  dV(a${ca})/h  corner ${ca}-${cb}: r, ω (or null)    ink at ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(" ")}`);
  const rows: Row[] = [];
  ts.forEach((t, i) => {
    const fb: AnyFB = which === "old" ? new FormBOld(yOff(t)) : new FormB(yOff(t), extra);
    const fx = fb as unknown as { solveEq(a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]): { ok: boolean; fa: { s: number } }; armDist(ai: number, s: number): number };
    const A = fb.arms[ca];
    const B = fb.arms[cb];
    let bx = A.ux + B.ux;
    let by = A.uy + B.uy;
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl;
    by /= bl;
    let th = B.ang - A.ang;
    th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const Vp = fx.solveEq(ca, cb, fb.h, (bx * fb.h) / Math.sin(th / 2), (by * fb.h) / Math.sin(th / 2), [0, Infinity], [0, Infinity]);
    const dVa = Vp.ok ? fx.armDist(ca, Vp.fa.s) / fb.h : NaN;
    const c = (fb.corners as { a: number; b: number; r: number; omega: number }[]).find((k) => k.a === ca && k.b === cb);
    const ink = pts.map(([x, y]) => fb.evalPoint(x, y).ink);
    const r = c ? c.r : NaN;
    const om = c ? c.omega : NaN;
    const txt = `  ${f(t, 5).padStart(8)}  ${f(A.L).padStart(6)} ${f(B.L).padStart(6)}  ${f(dVa, 4).padStart(8)}  ${c ? `${f(r, 4)}, ${f(om, 4)}` : "null".padEnd(14)}  ${ink.map((v) => f(v, 4)).join(" ")}`;
    rows.push({ t, vals: [A.L, B.L, c ? r : -1, c ? om : -1, ...ink], txt });
    if (i % every === 0 || i === ts.length - 1) out.push(txt);
  });
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i].vals[2] < 0) !== (rows[i - 1].vals[2] < 0)) out.push(`  switch: ${rows[i - 1].txt.trim()}  ->  ${rows[i].txt.trim()}`);
  }
  const names = [`L(a${ca})`, `L(a${cb})`, "r (null = −1)", "ω (null = −1)", ...pts.map((p) => `ink(${p[0]}, ${p[1]})`)];
  const steps = names.map((nm, k) => {
    let mx = 0;
    let at = 0;
    for (let i = 1; i < rows.length; i++) {
      // r and ω: a null next to r = 0 (ω any) is no step; compare max(0, v).
      const a0 = k === 2 || k === 3 ? Math.max(0, rows[i - 1].vals[k]) : rows[i - 1].vals[k];
      const a1 = k === 2 || k === 3 ? Math.max(0, rows[i].vals[k]) : rows[i].vals[k];
      const dv = k === 3 ? Math.abs(Math.max(0, rows[i].vals[2]) > 0 || Math.max(0, rows[i - 1].vals[2]) > 0 ? a1 - a0 : 0) : Math.abs(a1 - a0);
      if (dv > mx) {
        mx = dv;
        at = rows[i].t;
      }
    }
    return `${nm} ${f(mx, 4)} (at ${f(at, 5)})`;
  });
  out.push(`  largest step (e step ${f(ts[1] - ts[0], 5)}; ω counted only where r > 0 on a side): ${steps.join("; ")}`);
}
const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const vPts: [number, number][] = [[0.02, 1.03], [0.05, 1.08], [0.1, 1.16], [0.2, 1.3], [0.15, 1.05], [-0.05, 1.08], [0.0, 1.0]];
for (const which of ["old", "new"] as const) {
  sweep("E1. 699's low side, coarse: chain 1's root at (−e, 0); corner 0-1 (θ 2.0)", which, span(0, 1.0, 200), 0, 1, vPts, 20);
  sweep("E2. 699's low side, fine at the switch", which, span(0.6374, 0.6474, 200), 0, 1, vPts, 25);
}

// C. The census at rest: the root gate alone (the same form B, rootBand 0).
out.push(`C. census at rest: form B with ${JSON.stringify(extra)} against the same with rootBand 0`);
const base = { ...extra, rootBand: 0 };
let tMoved = 0;
let tLost = 0;
for (const name of ALL) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  const A = new FormB(sc, base);
  const B = new FormB(sc, extra);
  type C = { j: number; a: number; b: number; r: number; omega: number; theta: number; dVa: number; dVb: number };
  const key = (c: C) => `${c.j}:${c.a}-${c.b}`;
  const mapA = new Map((A.corners as unknown as C[]).map((c) => [key(c), c]));
  let moved = 0;
  let lost = 0;
  let dvMin = Infinity;
  for (const c of B.corners as unknown as C[]) {
    const o = mapA.get(key(c));
    const jid = sc.junctions[c.j]?.id ?? "?";
    const near = (name === "muse_hash" && jid === "j124") || (name === "g41_user_tw64" && jid === "j12");
    if (!o) continue;
    const dv = Math.min(c.dVa, c.dVb) / B.h;
    const dr = Math.abs(c.r - o.r);
    if (dr > 1e-6 || Math.abs(c.omega - o.omega) > 1e-6 || near) {
      if (dr > 1e-6) {
        moved++;
        dvMin = Math.min(dvMin, dv);
      }
      const lostFill = o.r > 1e-9 && o.omega > 1e-9 && !(c.r > 1e-9 && c.omega > 1e-9);
      if (lostFill) lost++;
      out.push(`  ${name} corner j${c.j} (${jid}) ${c.a}-${c.b}: θ ${f(c.theta)} dV ${f(dv, 3)}h: r ${f(o.r / B.h)}h -> ${f(c.r / B.h)}h, ω ${f(o.omega)} -> ${f(c.omega)}${lostFill ? "  LOST FILL" : ""}${near ? "  (census nearest)" : ""}`);
    }
  }
  tMoved += moved;
  tLost += lost;
  out.push(`  ${name.padEnd(22)} corners whose r moved ${String(moved).padStart(3)} (lost fill ${lost}); smallest dV among them ${f(dvMin, 3)}h`);
}
out.push(`  all: corners whose r moved ${tMoved} (lost fill ${tLost})`);
mkdirSync(`${HERE}/out/k1163`, { recursive: true });
writeFileSync(`${HERE}/out/k1163/gate699_${TAG}.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => /switch|largest|^E|^C|corners whose|census nearest|LOST/.test(l)).slice(0, 60).join("\n"));

// K1040 S1f item 2: solveCorner's line 699 on its LOW side (V's foot reaches
// an arm's root, dV ≤ 1e-9h), at an opening well below π. With every arm
// rooted at c the foot sits at h·cot(θ/2) > 0, so the low side needs a root
// off c, as the scenes have (the census's nearest: muse_hash jj124, θ 2.218,
// dV 0.071h, r 0.787). A Y of three ENDs (h 1): chain 0 east from (0, 0),
// chain 1 from (−e, 0) at 2.0 rad, chain 2 from (0, 0) at −2.2 rad; corner
// 0-1 opens 2.0 rad, and V's foot on arm 0 is at x = 0.6424 − e (h·cot(1.0)
// − e), so it reaches the root at e = 0.6424. Ink is read around V there.
// Run: npx vite-node .claude/probes/K1040/s1/gate699.ts   (writes out/s1f/gate699.txt)
import { mkdirSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43dac8f0673db4df/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
type Row = { t: number; vals: number[]; txt: string };
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
function sweep(title: string, ts: number[], ca: number, cb: number, pts: [number, number][], every: number): void {
  out.push(title);
  out.push(`         e  L(a${ca}) L(a${cb})  dV(a${ca})/h  corner ${ca}-${cb}: r, ω (or null)    ink at ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(" ")}`);
  const rows: Row[] = [];
  ts.forEach((t, i) => {
    const fb = new FormB(yOff(t));
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
    const c = fb.corners.find((k) => k.a === ca && k.b === cb);
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
      const dv = Math.abs(rows[i].vals[k] - rows[i - 1].vals[k]);
      if (dv > mx) {
        mx = dv;
        at = rows[i].t;
      }
    }
    return `${nm} ${f(mx, 4)} (at ${f(at, 5)})`;
  });
  out.push(`  largest step (e step ${f(ts[1] - ts[0], 5)}): ${steps.join("; ")}`);
}
const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
// Around V at the switch, (0, 1): along the corner's bisector (1.0 rad) and beside it.
const vPts: [number, number][] = [[0.02, 1.03], [0.05, 1.08], [0.1, 1.16], [0.2, 1.3], [0.15, 1.05], [-0.05, 1.08], [0.0, 1.0]];
sweep("E1. 699's low side, coarse: chain 1's root at (−e, 0); corner 0-1 (θ 2.0)", span(0, 1.0, 200), 0, 1, vPts, 20);
sweep("E2. 699's low side, fine at the switch", span(0.6374, 0.6474, 200), 0, 1, vPts, 25);
mkdirSync(`${HERE}/out/s1f`, { recursive: true });
writeFileSync(`${HERE}/out/s1f/gate699.txt`, out.join("\n") + "\n");
console.log(out.filter((l, i) => i < 18 || /switch|largest|^E/.test(l)).join("\n"));

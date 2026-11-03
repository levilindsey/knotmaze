// K1040 S1g step 4c, fine: gateomega_s1g.ts found r jumping 1.93h within one
// 0.02h step of bump travel (θ 2, H 0.15, xk 1.22 -> 1.24) with ω 1. Here the
// step at 0.0005h, every row: r, θ, V, dVa, q, the foot on arm 0 and the ink
// at three points, plus the ball's w factors are not exposed, so the per-ρ
// story comes from r against r0 and the foot.
// Run: npx vite-node .claude/probes/K1040/s1/gateomegaf_s1g.ts   (writes out/s1g/gateomegaf.txt)
import { mkdirSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
const TH = Number(process.env.TH ?? 2);
const H = Number(process.env.H ?? 0.15);
const X0 = Number(process.env.X0 ?? 1.2);
const X1 = Number(process.env.X1 ?? 1.26);
const N = Number(process.env.N ?? 120);
function line(x0: number, y0: number, x1: number, y1: number, step = 0.05): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function bumped(xk: number): number[] {
  const o: number[] = [];
  for (let x = 0; x <= 10 + 1e-9; x += 0.05) {
    const u = (x - xk) / 0.4;
    o.push(x, Math.abs(u) < 1 ? H * Math.cos((Math.PI / 2) * u) ** 2 : 0);
  }
  return o;
}
function scene(xk: number): FieldScene {
  const pc = TH + (2 * Math.PI - TH) / 2;
  const pts = [bumped(xk), line(0, 0, 10 * Math.cos(TH), 10 * Math.sin(TH)), line(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc))];
  return {
    version: 1,
    name: "gateomegaf",
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
type Cn = { a: number; b: number; r: number; r0: number; r1: number; room: number; omega: number; qx: number; qy: number; sA: number; Vx: number; Vy: number; dVa: number; theta: number };
const pts: [number, number][] = [[1.2, 1.4], [1.6, 1.9], [0.9, 1.15]];
out.push(`θ ${TH}, H ${H}: xk ${X0}..${X1} in ${N} steps; ink at ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(" ")}`);
let prevR = NaN;
let prevInk: number[] = [];
let big = 0;
let bigAt = 0;
let bigInk = 0;
for (let i = 0; i <= N; i++) {
  const xk = X0 + ((X1 - X0) * i) / N;
  const fb = new FormB(scene(xk));
  const c = (fb.corners as unknown as Cn[]).find((q) => q.a === 0 && q.b === 1);
  const ink = pts.map(([x, y]) => fb.evalPoint(x, y).ink);
  const r = c ? c.r : 0;
  if (i > 0) {
    if (Math.abs(r - prevR) > big) [big, bigAt] = [Math.abs(r - prevR), xk];
    for (let q = 0; q < ink.length; q++) bigInk = Math.max(bigInk, Math.abs(ink[q] - prevInk[q]));
  }
  const fx = c ? pointAt(fb.polys[fb.arms[0].pi], c.sA).x : NaN;
  if (i % 10 === 0 || (i > 0 && Math.abs(r - prevR) > 0.02))
    out.push(`  xk ${f(xk, 4)}: ${c ? `r ${f(r, 4)} r0 ${f(c.r0, 3)} r1 ${f(c.r1, 3)} room ${f(c.room, 3)} ω ${f(c.omega, 3)} V (${f(c.Vx)}, ${f(c.Vy)}) dVa ${f(c.dVa)} q (${f(c.qx)}, ${f(c.qy)}) foot x ${f(fx)}` : "null"}  ink ${ink.map((v) => f(v, 3)).join(" ")}`);
  prevR = r;
  prevInk = ink;
}
out.push(`largest |Δr| ${f(big, 4)} at xk ${f(bigAt, 4)} (step ${f((X1 - X0) / N, 5)}); largest ink step at the three points ${f(bigInk, 4)}`);
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/gateomegaf_${TH}_${H}.txt`, out.join("\n") + "\n");
console.log(out.join("\n"));

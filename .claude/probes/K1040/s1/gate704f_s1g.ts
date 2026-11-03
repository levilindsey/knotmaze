// K1040 S1g step 4b, fine: gate704_s1g.ts's bend family never nulls corner
// 0-1 (704 is not reached), but its STEP rows show corner 2-0 (the far gap,
// which arm 0 bends INTO) climbing 0.05-0.2h of r per 0.005 κ near κ 0.78-0.9
// (arm 0's radius 1.1-1.3h), with a grid point on y = −1 stepping 1 -> 0.
// Here that stretch at a fine κ step: corner 2-0's r, r0, r1, room, ω, V, dV
// and q, and the ink at the STEP rows' points.
// Run: npx vite-node .claude/probes/K1040/s1/gate704f_s1g.ts   (env TH, K0, K1, N; writes out/s1g/gate704f_<TH>.txt)
import { mkdirSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
const TH = Number(process.env.TH ?? 0.7);
const K0 = Number(process.env.K0 ?? 0.86);
const K1 = Number(process.env.K1 ?? 0.91);
const N = Number(process.env.N ?? 100);
function line(x0: number, y0: number, x1: number, y1: number, step = 0.1): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function bent(k: number): number[] {
  const o: number[] = [];
  const Sb = k > 1e-9 ? Math.min(10, Math.PI / 2 / k) : 0;
  for (let s = 0; s <= 10 + 1e-9; s += 0.1) {
    if (s <= Sb && k > 1e-9) o.push(Math.sin(k * s) / k, -(1 - Math.cos(k * s)) / k);
    else {
      const ex = k > 1e-9 ? Math.sin(k * Sb) / k : 0;
      const ey = k > 1e-9 ? -(1 - Math.cos(k * Sb)) / k : 0;
      o.push(ex + Math.cos(k * Sb) * (s - Sb), ey - Math.sin(k * Sb) * (s - Sb));
    }
  }
  return o;
}
function scene(k: number): FieldScene {
  const pc = TH + (2 * Math.PI - TH) / 2;
  const pts = [bent(k), line(0, 0, 10 * Math.cos(TH), 10 * Math.sin(TH)), line(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc))];
  return {
    version: 1,
    name: "gate704f",
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
type Cn = { a: number; b: number; r: number; r0: number; r1: number; room: number; omega: number; theta: number; qx: number; qy: number; Vx: number; Vy: number; dVa: number; dVb: number };
const pts: [number, number][] = [[0.07, -1.0], [-0.26, -1.0], [0.16, -1.0], [-0.17, -1.0], [0.19, -1.0], [0.5, -1.0]];
out.push(`θ ${TH}: κ ${K0}..${K1} in ${N} steps; corner 2-0; ink at ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(" ")}`);
let prevR = NaN;
let prevInk: number[] = [];
let big = 0;
let bigAt = 0;
let bigInk = 0;
let bigInkAt = 0;
for (let i = 0; i <= N; i++) {
  const k = K0 + ((K1 - K0) * i) / N;
  const fb = new FormB(scene(k));
  const c = (fb.corners as unknown as Cn[]).find((q) => q.a === 2 && q.b === 0);
  const ink = pts.map(([x, y]) => fb.evalPoint(x, y).ink);
  const r = c ? c.r : 0;
  let st = 0;
  if (i > 0) {
    if (Math.abs(r - prevR) > big) [big, bigAt] = [Math.abs(r - prevR), k];
    for (let q = 0; q < ink.length; q++) st = Math.max(st, Math.abs(ink[q] - prevInk[q]));
    if (st > bigInk) [bigInk, bigInkAt] = [st, k];
  }
  if (i % 10 === 0 || (i > 0 && (Math.abs(r - prevR) > 0.02 || st > 0.2)))
    out.push(`  κ ${f(k, 4)}: ${c ? `r ${f(r, 4)} r0 ${f(c.r0)} r1 ${f(c.r1)} room ${f(c.room)} ω ${f(c.omega)} θ ${f(c.theta)} V (${f(c.Vx)}, ${f(c.Vy)}) dV ${f(c.dVa)}/${f(c.dVb)} q (${f(c.qx)}, ${f(c.qy)})` : "null"}  ink ${ink.map((v) => f(v, 3)).join(" ")}`);
  prevR = r;
  prevInk = ink;
}
out.push(`largest |Δr| ${f(big, 4)} at κ ${f(bigAt, 4)}; largest ink step ${f(bigInk, 4)} at κ ${f(bigInkAt, 4)} (κ step ${f((K1 - K0) / N, 5)})`);
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/gate704f_${TH}.txt`, out.join("\n") + "\n");
console.log(out.slice(0, 30).join("\n"));

// K1040 S1g step 4b: 704 (V outside the wedge) on a bend. A Y of three chain
// ENDs at the origin, h 1: chain 0 east, bent AWAY from chain 1 (clockwise)
// along a circular arc of radius R = 1/κ for its first min(10, Rπ/2) of arc
// length, then straight on; chain 1 at angle θ; chain 2 in the far gap. The
// wedge test uses each arm's 2h chord from c, so a sharp corner whose arm
// bends away can carry V across the chord's line. Swept: θ 0.5, 0.7, 1.0,
// 1.4; κ 0..1.5 (300 steps, 0.005). Per step: corner 0-1's r, ω or null and
// which exit (the V solve, the window, the wedge), the ink on a 13 x 9 grid
// around V; the largest ink step anywhere on the grid, overall and at each
// switch.
// Run: npx vite-node .claude/probes/K1040/s1/gate704_s1g.ts   (writes out/s1g/gate704.txt)
import { mkdirSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
type Sol = { ok: boolean; x: number; y: number; fa: { s: number }; fb: { s: number } };
type Fx = {
  solveEq(a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]): Sol;
  armDist(ai: number, s: number): number;
};
function line(x0: number, y0: number, x1: number, y1: number, step = 0.1): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function bent(k: number): number[] {
  const o: number[] = [];
  const total = 10;
  const Sb = k > 1e-9 ? Math.min(total, (Math.PI / 2) / k) : 0;
  for (let s = 0; s <= total + 1e-9; s += 0.1) {
    if (s <= Sb && k > 1e-9) o.push(Math.sin(k * s) / k, -(1 - Math.cos(k * s)) / k);
    else {
      const ex = k > 1e-9 ? Math.sin(k * Sb) / k : 0;
      const ey = k > 1e-9 ? -(1 - Math.cos(k * Sb)) / k : 0;
      const tx = Math.cos(k * Sb);
      const ty = -Math.sin(k * Sb);
      o.push(ex + tx * (s - Sb), ey + ty * (s - Sb));
    }
  }
  return o;
}
function scene(th: number, k: number): FieldScene {
  const pc = th + (2 * Math.PI - th) / 2; // chain 2 in the middle of the far gap
  const pts = [bent(k), line(0, 0, 10 * Math.cos(th), 10 * Math.sin(th)), line(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc))];
  return {
    version: 1,
    name: "gate704",
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
const ks = Array.from({ length: 301 }, (_, i) => (1.5 * i) / 300);
let worstSwitch = 0;
for (const th of [0.5, 0.7, 1.0, 1.4]) {
  // The grid around the straight case's V = (cot(θ/2), 1), h 1.
  const vx = 1 / Math.tan(th / 2);
  const grid: [number, number][] = [];
  for (let ix = 0; ix < 13; ix++) for (let iy = 0; iy < 9; iy++) grid.push([vx - 3 + (4 * ix) / 12, -1 + (3 * iy) / 8]);
  out.push(`θ ${th}: grid x ${f(vx - 3, 2)}..${f(vx + 1, 2)}, y −1..2 (13 x 9)`);
  out.push(`      κ  corner 0-1: r, ω (or null: exit)  V, dV(a0)  max ink step on the grid vs the previous κ`);
  let prev: number[] | null = null;
  let prevTxt = "";
  let prevNull = false;
  let maxStep = 0;
  let maxAt = 0;
  let firstNull = "";
  let prevCs = "";
  ks.forEach((k, i) => {
    const fb = new FormB(scene(th, k));
    const fx = fb as unknown as Fx;
    const c = (fb.corners as unknown as { a: number; b: number; r: number; omega: number }[]).find((q) => q.a === 0 && q.b === 1);
    let why = "";
    let Vt = "";
    if (true) {
      const A = fb.arms[0];
      const B = fb.arms[1];
      let bx = A.ux + B.ux;
      let by = A.uy + B.uy;
      const bl = Math.hypot(bx, by) || 1;
      bx /= bl;
      by /= bl;
      let t = B.ang - A.ang;
      t = ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const sn = Math.sin(t / 2);
      const V = fx.solveEq(0, 1, fb.h, (bx * fb.h) / sn, (by * fb.h) / sn, [0, Infinity], [0, Infinity]);
      const dVa = fx.armDist(0, V.fa.s);
      const dVb = fx.armDist(1, V.fb.s);
      const crossA = A.ux * V.y - A.uy * V.x;
      const crossB = B.ux * V.y - B.uy * V.x;
      const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
      Vt = `V (${f(V.x, 2)}, ${f(V.y, 2)}) dV ${f(dVa, 2)}, cross ${f(crossA * sgn, 3)}/${f(-crossB * sgn, 3)}`;
      if (!c) why = !V.ok ? "no V" : !(dVa > 1e-9 && dVa < A.L - 1e-9 && dVb > 1e-9 && dVb < B.L - 1e-9) ? "window" : !(crossA * sgn > 0 && crossB * sgn < 0) ? "WEDGE" : "other";
    }
    const ink = grid.map(([x, y]) => fb.evalPoint(x, y).ink);
    let st = 0;
    if (prev) for (let q = 0; q < ink.length; q++) st = Math.max(st, Math.abs(ink[q] - prev[q]));
    const txt = `  ${f(k, 3).padStart(6)}  ${c ? `${f(c.r, 4)}, ${f(c.omega, 4)}` : `null: ${why}`.padEnd(14)}  ${Vt}  ${f(st, 4)}`;
    const isNull = !c;
    if (i > 0 && isNull !== prevNull) {
      out.push(`  switch: ${prevTxt.trim()}  ->  ${txt.trim()}`);
      if (st > worstSwitch) worstSwitch = st;
      if (!firstNull && isNull) firstNull = `κ ${f(k, 3)} (${why})`;
    }
    if (st > maxStep) {
      maxStep = st;
      maxAt = k;
    }
    if (prev && st > 0.3) {
      let q = 0;
      for (let qq = 0; qq < ink.length; qq++) if (Math.abs(ink[qq] - prev[qq]) > Math.abs(ink[q] - prev[q])) q = qq;
      const cs = (fb.corners as unknown as { a: number; b: number; r: number; omega: number }[]).map((cc) => `${cc.a}-${cc.b} r ${f(cc.r, 3)} ω ${f(cc.omega, 3)}`).join("; ");
      out.push(`  STEP κ ${f(k, 3)}: ${f(st, 3)} at (${f(grid[q][0], 2)}, ${f(grid[q][1], 2)}) ${f(prev[q], 3)} -> ${f(ink[q], 3)}; L ${fb.arms.map((a) => f(a.L, 2)).join("/")}; corners ${cs}; prev corners ${prevCs}`);
    }
    prevCs = (fb.corners as unknown as { a: number; b: number; r: number; omega: number }[]).map((cc) => `${cc.a}-${cc.b} r ${f(cc.r, 3)} ω ${f(cc.omega, 3)}`).join("; ");
    if (i % 30 === 0) out.push(txt);
    prev = ink;
    prevTxt = txt;
    prevNull = isNull;
  });
  out.push(`  θ ${th}: first null at ${firstNull || "(none)"}; largest grid ink step ${f(maxStep, 4)} at κ ${f(maxAt, 3)}`);
}
out.push(`largest grid ink step at any switch: ${f(worstSwitch, 4)}`);
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/gate704.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => /switch|first null|largest|^θ|STEP/.test(l)).slice(0, 40).join("\n"));

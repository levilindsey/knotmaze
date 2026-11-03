// K1040 S1g step 4c: ω's ±0.5h exclusion, with a kink sliding past the foot.
// A Y of three chain ENDs (h 1, yOff's look): arm 0 east, carrying a bump
// toward arm 1 (height H, half-width 0.4, a cos² profile), arm 1 at θ, arm 2
// in the far gap. The bump's centre xk slides from 0.2 to 4.2 in 0.02 steps,
// across the foot of corner 0-1 and its ±0.5h window. Per step: r, ω, the
// code's ov and the skipped candidates' max R − d (ovEx, as S1f's gates.ts D
// computes them), the foot's x, and the ink on a 17 x 13 grid over the
// corner. Reports the largest |Δω|, |Δr| and grid ink step, and every step
// where ω < 1 or ovEx > 0.05h (a skipped candidate past ω's band).
// Run: npx vite-node .claude/probes/K1040/s1/gateomega_s1g.ts   (writes out/s1g/gateomega.txt)
import { mkdirSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { candidates, dS, pointAt, type Cand } from "../../../../src/render/field/geom";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function line(x0: number, y0: number, x1: number, y1: number, step = 0.05): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function bumped(H: number, xk: number): number[] {
  const o: number[] = [];
  for (let x = 0; x <= 10 + 1e-9; x += 0.05) {
    const u = (x - xk) / 0.4;
    o.push(x, Math.abs(u) < 1 ? H * Math.cos((Math.PI / 2) * u) ** 2 : 0);
  }
  return o;
}
function scene(th: number, H: number, xk: number): FieldScene {
  const pc = th + (2 * Math.PI - th) / 2;
  const pts = [bumped(H, xk), line(0, 0, 10 * Math.cos(th), 10 * Math.sin(th)), line(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc))];
  return {
    version: 1,
    name: "gateomega",
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
type Cn = { a: number; b: number; r: number; omega: number; qx: number; qy: number; sA: number; sB: number };
const xs = Array.from({ length: 201 }, (_, i) => 0.2 + 0.02 * i);
for (const th of [2.0, 1.2]) {
  for (const H of [0.15, 0.3, 0.6]) {
    const fb0 = new FormB(scene(th, 0, -5));
    const c0 = (fb0.corners as unknown as Cn[]).find((q) => q.a === 0 && q.b === 1)!;
    const gx0 = c0.qx;
    const grid: [number, number][] = [];
    for (let ix = 0; ix < 17; ix++) for (let iy = 0; iy < 13; iy++) grid.push([gx0 - 2 + (4 * ix) / 16, -0.2 + (3.2 * iy) / 12]);
    out.push(`θ ${th}, H ${H}: no bump r ${f(c0.r)}, q (${f(c0.qx)}, ${f(c0.qy)}), foot x ${f(pointAt(fb0.polys[fb0.arms[0].pi], c0.sA).x)}`);
    let prev: { r: number; om: number; ink: number[] } | null = null;
    let mdOm = 0;
    let mdOmAt = 0;
    let mdR = 0;
    let mdRAt = 0;
    let mdInk = 0;
    let mdInkAt = 0;
    let mxEx = -Infinity;
    let mxExAt = 0;
    let minOm = 1;
    let minOmAt = NaN;
    xs.forEach((xk, i) => {
      const fb = new FormB(scene(th, H, xk));
      const fbx = fb as unknown as { grid: never; armDist(ai: number, s: number): number; ovw: number };
      const c = (fb.corners as unknown as Cn[]).find((q) => q.a === 0 && q.b === 1);
      const h = fb.h;
      let ov = 0;
      let ovEx = -Infinity;
      let footX = NaN;
      if (c && c.r > 1e-9) {
        const R = h + c.r;
        for (const [ai, sf] of [
          [c.a, c.sA],
          [c.b, c.sB],
        ] as const) {
          const arm = fb.arms[ai];
          const p = fb.polys[arm.pi];
          const cs: Cand[] = [];
          candidates(fbx.grid, c.qx, c.qy, R, cs, arm.pi);
          for (const k of cs) {
            const dd = fbx.armDist(ai, k.s);
            if (dd < 0 || dd > arm.L) continue;
            if (Math.abs(dS(p, k.s, sf)) < 0.5 * h) ovEx = Math.max(ovEx, R - k.d);
            else ov = Math.max(ov, R - k.d);
          }
        }
        footX = pointAt(fb.polys[fb.arms[0].pi], c.sA).x;
      }
      const r = c ? c.r : 0;
      const om = c ? c.omega : 1;
      const ink = grid.map(([x, y]) => fb.evalPoint(x, y).ink);
      if (prev) {
        const dOm = Math.abs(om - prev.om);
        const dR = Math.abs(r - prev.r);
        let dI = 0;
        for (let q = 0; q < ink.length; q++) dI = Math.max(dI, Math.abs(ink[q] - prev.ink[q]));
        if (dOm > mdOm) [mdOm, mdOmAt] = [dOm, xk];
        if (dR > mdR) [mdR, mdRAt] = [dR, xk];
        if (dI > mdInk) [mdInk, mdInkAt] = [dI, xk];
      }
      if (ovEx > mxEx) [mxEx, mxExAt] = [ovEx, xk];
      if (om < minOm) [minOm, minOmAt] = [om, xk];
      if (i % 20 === 0 || om < 1 - 1e-9 || ovEx > 0.05 || (prev && Math.abs(r - prev.r) > 0.05)) out.push(`  xk ${f(xk, 2)}: ${c ? `r ${f(r, 4)} ω ${f(om, 4)}` : "null"}  ov ${f(ov, 4)} ovEx ${f(ovEx, 4)}  foot x ${f(footX)}`);
      prev = { r, om, ink };
    });
    out.push(`  θ ${th}, H ${H}: min ω ${f(minOm, 4)} (xk ${f(minOmAt, 2)}); max ovEx ${f(mxEx, 4)}h (xk ${f(mxExAt, 2)}); largest |Δω| ${f(mdOm, 4)} (xk ${f(mdOmAt, 2)}), |Δr| ${f(mdR, 4)}h (xk ${f(mdRAt, 2)}), grid ink step ${f(mdInk, 4)} (xk ${f(mdInkAt, 2)}) per 0.02h of bump travel`);
  }
}
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/gateomega.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => /^θ|min ω/.test(l)).join("\n"));

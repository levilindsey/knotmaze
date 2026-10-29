// K1040 S1d F3: the test's eye (form_b.test.ts eye(), muse_hash group 7's
// eye) - its corners, and the ink along short walks through a point with a
// fade forced, with the winning term at each sample and the steepest step.
// Run: npx vite-node .claude/probes/K1040/s1/eye_probe.ts [x y [omega]] > out/s1d/eye_<tag>.txt
// Env: SCENE=eye|acute|curved (default eye).
import type { FieldScene, SceneJunction } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { footInWindow } from "../../../../src/render/field/geom";

const H = 1;
const W = 0.38;
const [xs = "1.6", ys = "0.405", ws = "0.25"] = process.argv.slice(2);
const X = Number(xs);
const Y = Number(ys);
const OM = ws === "natural" ? undefined : Number(ws);
function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return out;
}
function scene(chains: number[][], junctions: SceneJunction[]): FieldScene {
  return {
    version: 1,
    name: "eye_probe",
    source: { kind: "synthetic", generator: "eye_probe", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: H, band: W, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: chains.map((pts, id) => ({ id, closed: false, pts, z: new Array(pts.length / 2).fill(0) })),
    crossings: [],
    junctions,
    deadEnds: [],
  } as unknown as FieldScene;
}
function eye(): FieldScene {
  const L = 3;
  const A = 1.4;
  const arc = (sgn: number) => {
    const p: number[] = [];
    for (let i = 0; i <= 30; i++) {
      const x = (L * i) / 30;
      p.push(x, sgn * A * Math.sin((Math.PI * x) / L));
    }
    return p;
  };
  const len = (p: number[]) => {
    let s = 0;
    for (let k = 2; k < p.length; k += 2) s += Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]);
    return s;
  };
  const up = arc(1);
  const lo = arc(-1);
  const c0 = [...line(-8, 0, 0, 0), ...up.slice(2), ...line(L, 0, L + 8, 0).slice(2)];
  const corners = () => [0, 1, 2].map(() => ({ style: "round" as const, pinned: false }));
  const j0: SceneJunction = {
    id: "j0",
    c: [0, 0],
    arms: [
      { chain: 1, s: 0, dir: 1, kind: "end" },
      { chain: 0, s: 8, dir: 1, kind: "through" },
      { chain: 0, s: 8, dir: -1, kind: "through" },
    ],
    corners: corners(),
  } as SceneJunction;
  const j1: SceneJunction = {
    id: "j1",
    c: [L, 0],
    arms: [
      { chain: 0, s: 8 + len(up), dir: 1, kind: "through" },
      { chain: 0, s: 8 + len(up), dir: -1, kind: "through" },
      { chain: 1, s: len(lo), dir: -1, kind: "end" },
    ],
    corners: corners(),
  } as SceneJunction;
  return scene([c0, lo], [j0, j1]);
}
const f = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
function curved(): FieldScene {
  const R = 8;
  const pts: number[] = [];
  for (let i = -400; i <= 400; i++) {
    const a = Math.PI / 2 + (i * 0.05) / R;
    pts.push(R * Math.cos(a), -R + R * Math.sin(a));
  }
  const arms = [
    { chain: 0, s: 20, dir: -1, kind: "through" },
    { chain: 1, s: 0, dir: 1, kind: "end" },
    { chain: 0, s: 20, dir: 1, kind: "through" },
  ];
  const j: SceneJunction = { id: "j0", c: [0, 0], arms, corners: arms.map(() => ({ style: "round" as const, pinned: false })) } as unknown as SceneJunction;
  return scene([pts, line(0, 0, 6.123233995736766e-16, 10, 0.05)], [j]);
}
const sc = process.env.SCENE === "curved" ? curved() : eye();
(globalThis as unknown as { FBTRACE?: boolean }).FBTRACE = !!process.env.FBTRACE;
const fb = new FormB(sc, OM === undefined ? {} : { force: { omega: OM } });
for (const a of (fb as unknown as { arms: { pi: number; sR: number; dir: number; L: number; Lcut: number; kind: string }[] }).arms) console.log(`  arm pi ${a.pi} ${a.kind} sR ${f(a.sR)} dir ${a.dir} L ${f(a.L)} Lcut ${f(a.Lcut)}`);
console.log(`eye, omega ${OM ?? "natural"}; corners:`);
for (const c of fb.corners as unknown as Record<string, number>[]) {
  console.log(`  j${c.j} ${c.a}/${c.b} th ${f(c.theta)} r0 ${f(c.r0)} r ${f(c.r)} room ${f(c.room)} V (${f(c.Vx)}, ${f(c.Vy)}) q (${f(c.qx)}, ${f(c.qy)}) tA (${f(c.tax)}, ${f(c.tay)}) tB (${f(c.tbx)}, ${f(c.tby)}) dV ${f(c.dVa)}/${f(c.dVb)} ov ${f(c.ov)} w ${f(c.omega, 3)}`);
}
const tag = (e: ReturnType<FormB["evalPoint"]>) => (e.term ? `k${e.term.kind} c${e.term.corner} ch${e.term.chain} D ${f(e.term.D)} w ${f(e.term.w, 3)}` : "none");
for (const [name, dx, dy] of [["along x", 1, 0], ["along y", 0, 1]] as const) {
  let worst = 0;
  let at = 0;
  const step = 0.0025;
  const rows: string[] = [];
  let prev = fb.evalPoint(X - dx * 0.1, Y - dy * 0.1).ink;
  for (let i = 1; i <= 80; i++) {
    const t = -0.1 + i * step;
    const e = fb.evalPoint(X + dx * t, Y + dy * t);
    const rate = Math.abs(e.ink - prev) / (step * 10);
    if (rate > worst) {
      worst = rate;
      at = t;
    }
    if (i % 4 === 0 || rate > 3) rows.push(`    t ${f(t)} ink ${f(e.ink)} rate ${f(rate, 2)} ${tag(e)}`);
    prev = e.ink;
  }
  console.log(`  ${name} through (${X}, ${Y}): worst ${f(worst, 2)} per px at t ${f(at)}`);
  for (const r of rows.slice(0, 12)) console.log(r);
}
// Debug: the first corner's tracked feet against the arms' nearest points at q.
{
  const c = fb.corners[0] as unknown as Record<string, number>;
  const fbx = fb as unknown as { arms: { pi: number; sR: number; dir: number; L: number; Lcut: number }[]; polys: unknown[]; armWindow: (ai: number) => [number, number] };
  for (const [ai, sF] of [[c.a, c.sA], [c.b, c.sB]] as const) {
    const arm = fbx.arms[ai];
    const win = fbx.armWindow.call(fb, ai);
    const p = fbx.polys[arm.pi] as Parameters<typeof footInWindow>[0];
    const g = footInWindow(p, c.qx, c.qy, win[0], win[1]);
    const l = footInWindow(p, c.qx, c.qy, sF - 0.05, sF + 0.05);
    console.log(`  arm ${ai} pi ${arm.pi} sR ${f(arm.sR)} dir ${arm.dir} L ${f(arm.L)} Lcut ${f(arm.Lcut)} win [${f(win[0])}, ${f(win[1])}] tracked s ${f(sF)}; nearest in win s ${f(g.s)} d ${f(g.d)} at (${f(g.x)}, ${f(g.y)}); near the tracked foot s ${f(l.s)} d ${f(l.d)}`);
  }
}
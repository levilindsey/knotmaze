// K1040 S1f item 2: sweeps over the corner gates, on a tee (chain 0 through
// the origin, an END at 60°, chain 2 crossing chain 0 at x = dc, 90°, over),
// h 1, and a census of ω's ±0.5h candidate exclusion over the 12 scenes.
//   A. the d-edge, fine: dc in [−0.005, 0.005] (the crossing through the root).
//   B. L → 0 (solveCorner's 681 and 699 gates): dc in [−6, −1.9], the crossing
//      ahead of arm −1 cuts it to L = |dc| − r − h; corner 1-2's r, ω, null.
//   C. the bend (699's dV → 0 and 704's wedge): the left half of chain 0 at
//      180° + β, β in [−0.3, 0.3] coarse and [−0.004, 0.004] fine; corner 2-0
//      (the bottom side, opening π − β).
//   D. ω's exclusion: per corner with fill, ov (the code's), ovEx (the max of
//      R − c.d over the candidates the ±0.5h test skips) and the ω with the
//      skipped candidates included.
// Per sweep: corner r and ω (or null), the ink at fixed points, and the
// largest step of each between neighbouring parameter values.
// Run: npx vite-node .claude/probes/K1040/s1/gates.ts   (writes out/s1f/gates.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { candidates, dS, type Cand } from "../../../../src/render/field/geom";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43dac8f0673db4df/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];

function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function tee(dc: number, beta: number): FieldScene {
  const a = (60 * Math.PI) / 180;
  const left = line(-10 * Math.cos(beta), -10 * Math.sin(beta), 0, 0);
  const c0 = [...left.slice(0, -2), ...line(0, 0, 10, 0)];
  const pts = [c0, line(0, 0, 10 * Math.cos(a), 10 * Math.sin(a)), line(dc, -10, dc, 10)];
  return {
    version: 1,
    name: "gates",
    source: { kind: "synthetic", generator: "gates", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: pts.map((p, id) => ({ id, closed: false, pts: p, z: new Array(p.length / 2).fill(0) })),
    crossings: [{ a: { chain: 0, s: 10 + dc }, b: { chain: 2, s: 10 }, over: "b" }],
    junctions: [
      {
        id: "j0",
        c: [0, 0],
        arms: [
          { chain: 0, s: 10, dir: 1, kind: "through" },
          { chain: 1, s: 0, dir: 1, kind: "end" },
          { chain: 0, s: 10, dir: -1, kind: "through" },
        ],
        corners: [0, 1, 2].map(() => ({ style: "round" as const, pinned: false })),
      },
    ],
    deadEnds: [],
  } as FieldScene;
}

type Row = { t: number; vals: number[]; txt: string };
function sweep(title: string, param: string, ts: number[], build: (t: number) => FieldScene, ca: number, cb: number, pts: [number, number][], every: number): void {
  out.push(title);
  out.push(`  ${param.padStart(8)}  L(a${ca}) L(a${cb})  corner ${ca}-${cb}: r, ω (or null)    ink at ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(" ")}`);
  const rows: Row[] = [];
  ts.forEach((t, i) => {
    const fb = new FormB(build(t));
    const c = fb.corners.find((k) => k.a === ca && k.b === cb);
    const ink = pts.map(([x, y]) => fb.evalPoint(x, y).ink);
    const r = c ? c.r : NaN;
    const om = c ? c.omega : NaN;
    const txt = `  ${f(t, 5).padStart(8)}  ${f(fb.arms[ca].L).padStart(6)} ${f(fb.arms[cb].L).padStart(6)}  ${c ? `${f(r, 4)}, ${f(om, 4)}` : "null".padEnd(14)}  ${ink.map((v) => f(v, 4)).join(" ")}`;
    rows.push({ t, vals: [fb.arms[ca].L, fb.arms[cb].L, c ? r : -1, c ? om : -1, ...ink], txt });
    if (i % every === 0 || i === ts.length - 1) out.push(txt);
  });
  // The rows either side of each null switch.
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
  out.push(`  largest step (${param} step ${f(ts[1] - ts[0], 5)}): ${steps.join("; ")}`);
}
const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

sweep("A. the d-edge, fine: the crossing through the root (dc)", "dc", span(-0.005, 0.005, 100), (t) => tee(t, 0), 0, 1, [[1.6, 1.25], [1.2, 1.4], [0.9, 1.1]], 20);
sweep("B. L → 0 on arm 2 (−1): dc from −6 to −1.9; corner 1-2 (END, arm −1)", "dc", span(-6, -1.9, 410), (t) => tee(t, 0), 1, 2, [[-1.2, 1.15], [-0.8, 1.3], [-1.6, 1.1], [-0.577, 1.0]], 41);
sweep("B2. L → 0, fine at the null switch (dVb reaches L − tol: V's foot on arm −1 sits 0.577 from the root)", "dc", span(-2.585, -2.565, 200), (t) => tee(t, 0), 1, 2, [[-0.577, 1.0], [-0.7, 1.0], [-0.45, 0.95], [-0.6, 1.1], [-1.0, 1.02], [-0.3, 0.9]], 25);
// C: a through pass's two arms get no corner (line 606, S1d F2), so the bend
// runs on a Y of three chain ENDS: chain 0 east, chain 1 north, chain 2 at
// 180° + β; corner 2-0 (the bottom side, opening π − β) meets line 597's
// θ ≥ π − 1e-6 gate (before 699's dV ≤ 1e-9h, whose θ is nearer π).
function wye(beta: number): FieldScene {
  const pts = [line(0, 0, 10, 0), line(0, 0, 0, 10), line(0, 0, 10 * Math.cos(Math.PI + beta), 10 * Math.sin(Math.PI + beta))];
  return {
    version: 1,
    name: "gates_y",
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
const yPts: [number, number][] = [[0, -1.0], [0, -1.02], [0, -1.05], [0, -0.85], [0.3, -1.0], [-0.3, -1.0], [0.6, -0.95]];
sweep("C1. the bend on a Y of ends, coarse: chain 2 at 180° + β; corner 2-0 (the bottom, opening π − β)", "β", span(-0.3, 0.3, 300), wye, 2, 0, yPts, 30);
sweep("C2. the bend on a Y of ends, fine", "β", span(-0.004, 0.004, 160), wye, 2, 0, yPts, 20);
sweep("C3. the bend on a Y of ends, finer", "β", span(-0.0001, 0.0001, 100), wye, 2, 0, yPts, 25);

// D. ω's exclusion over the 12 scenes.
out.push("D. ω's ±0.5h exclusion: per corner with r > 0, the skipped candidates' max R − c.d (ovEx) against the code's ov");
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
let allN = 0;
let allChanged = 0;
let worst = { v: -Infinity, txt: "" };
for (const name of ALL) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const fb = new FormB(sc);
  const h = fb.h;
  const fbx = fb as unknown as { grid: never; armDist(ai: number, s: number): number; ovw: number };
  let n = 0;
  let changed = 0;
  let mxEx = -Infinity;
  for (const c of fb.corners) {
    if (!(c.r > 1e-9)) continue;
    n++;
    const R = h + c.r;
    let ov = 0;
    let ovEx = -Infinity;
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
    const om = ss(0, 1, 1 - (ov - 0.05 * h) / fbx.ovw);
    const omAll = ss(0, 1, 1 - (Math.max(ov, ovEx) - 0.05 * h) / fbx.ovw);
    if (Math.abs(om - c.omega) > 1e-9) out.push(`  ${name} corner ${c.a}-${c.b}: recomputed ω ${f(om, 6)} differs from the code's ${f(c.omega, 6)}`);
    if (Math.abs(omAll - om) > 1e-9) {
      changed++;
      out.push(`  ${name} corner ${c.a}-${c.b} (j${c.j}): r ${f(c.r, 4)} ov ${f(ov / h, 4)}h ovEx ${f(ovEx / h, 4)}h: ω ${f(om, 4)} -> ${f(omAll, 4)} with the skipped candidates`);
    }
    mxEx = Math.max(mxEx, ovEx / h);
    if (ovEx / h > worst.v) worst = { v: ovEx / h, txt: `${name} corner ${c.a}-${c.b} (j${c.j}) r ${f(c.r, 4)} ov ${f(ov / h, 4)}h ω ${f(om, 4)}` };
  }
  allN += n;
  allChanged += changed;
  out.push(`  ${name}: ${n} corners with r > 0; ω changes on ${changed} with the skipped candidates included; the largest ovEx ${f(mxEx, 4)}h`);
}
out.push(`  all scenes: ${allN} corners, ω changes on ${allChanged}; the largest ovEx ${f(worst.v, 4)}h at ${worst.txt} (ω's band starts at ov 0.05h)`);
mkdirSync(`${HERE}/out/s1f`, { recursive: true });
writeFileSync(`${HERE}/out/s1f/gates.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => /^[A-D]|largest step|switch:|all scenes/.test(l)).join("\n"));

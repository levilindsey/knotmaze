// K1114 S1i: a copy of dedge_s1g.ts with HERE from import.meta.url and output in out/k1163.
// K1040 S1g step 2: the Lcut loop's d-edge, a candidate (the worktree's form
// B with PARAMS) against S1f's final (form_b_s1f_q.ts, frozen).
// 1. Census at rest over the 12 scenes: every arm whose L or Lcut moves and
//    every corner whose r or ω moves (matched by junction and arm pair), the
//    corners that gain or lose fill, and S1f F6's arms with a pass behind the
//    root whose overlap reaches it (−(reach + h) < d < 0): their corners
//    before and after.
// 2. dedge.ts's tee sweep (chain 2 crosses the tee's through chain 0 at
//    x = dc, 90°), coarse dc in [−2.5, 2.5] step 0.01 and fine dc in
//    [−0.005, 0.005] step 1e-4: both through arms' L, the corners, the ink at
//    four points and the largest step of each, old and new.
// 3. The same on a ring: chain 0 a closed circle of radius 8 through the
//    junction at its top, chain 2 crossing it at arc dc from the root.
// Run: $env:PARAMS='{"dEdge":"mirror"}'; $env:TAG='mirror'; npx vite-node .claude/probes/K1040/s1/dedge_s1i.ts
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
const sum: string[] = [];
type AnyFB = FormB | FormBOld;
const filled = (c: { r: number; omega: number }) => c.r > 1e-9 && c.omega > 1e-9;

function reachOld(fb: FormBOld, pi: number, x: FormBOld["passes"][number][number], dir: number): number {
  const h = fb.h;
  const t = Math.tan(x.theta / 2);
  let r = t > 1e-12 ? h / t : Infinity;
  const fl = 4 * h;
  if (r > fl) r = Math.min(r, Math.max(fl, fb.quadReachOf(pi, x, dir, h, fl)));
  return r;
}

out.push(`1. census at rest: S1f final (old) vs the worktree's form B with ${JSON.stringify(extra)} (new)`);
let tArms = 0;
let tCorn = 0;
let tLost = 0;
let tGain = 0;
let tF6 = 0;
let tF6Lost = 0;
for (const name of ALL) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const A = new FormBOld(sc);
  const B = new FormB(sc, extra);
  const h = A.h;
  let nArms = 0;
  A.arms.forEach((a, ai) => {
    const b = B.arms[ai];
    const dL = Math.abs(a.L - b.L);
    const dC = a.Lcut === b.Lcut ? 0 : Math.abs(a.Lcut - b.Lcut);
    if (dL > 1e-9 || dC > 1e-9) {
      nArms++;
      const p = A.polys[a.pi];
      out.push(`  ${name} arm ${ai} (j${a.j} c${a.pi} dir ${a.dir} ${a.kind}${p.closed ? " closed" : ""}): L ${f(a.L / h)}h -> ${f(b.L / h)}h, Lcut ${f(a.Lcut / h)}h -> ${f(b.Lcut / h)}h`);
    }
  });
  const key = (c: { j: number; a: number; b: number }) => `${c.j}:${c.a}-${c.b}`;
  const ca = new Map(A.corners.map((c) => [key(c), c]));
  const cb = new Map(B.corners.map((c) => [key(c), c]));
  let nC = 0;
  let lost = 0;
  let gain = 0;
  for (const k of new Set([...ca.keys(), ...cb.keys()])) {
    const x = ca.get(k);
    const y = cb.get(k);
    const rx = x ? x.r : 0;
    const ry = y ? y.r : 0;
    const ox = x ? x.omega : 0;
    const oy = y ? y.omega : 0;
    if (Math.abs(rx - ry) > 1e-6 || Math.abs(ox - oy) > 1e-6) {
      nC++;
      const fx = x ? filled(x) : false;
      const fy = y ? filled(y) : false;
      if (fx && !fy) lost++;
      if (!fx && fy) gain++;
      out.push(`  ${name} corner j${(x ?? y)!.j} ${k.split(":")[1]}: r ${f(rx / h)}h -> ${f(ry / h)}h, ω ${f(ox)} -> ${f(oy)}${fx && !fy ? "  LOST FILL" : !fx && fy ? "  GAINED FILL" : ""}`);
    }
  }
  // S1f F6's pairs: a pass behind the root whose overlap reaches it.
  let nF6 = 0;
  let nF6Lost = 0;
  A.arms.forEach((a, ai) => {
    const p = A.polys[a.pi];
    for (const x of A.passes[a.pi]) {
      let d = (x.s - a.sR) * a.dir;
      if (p.closed) {
        d = ((d % p.len) + p.len) % p.len;
        if (d > p.len / 2) d -= p.len;
      }
      if (!(d < -1e-12)) continue;
      const r = reachOld(A, a.pi, x, a.dir);
      if (!(d / (r + h) > -1)) continue;
      const cs = A.corners.filter((c) => (c.a === ai || c.b === ai) && filled(c));
      if (!cs.length) continue;
      nF6++;
      const after = cs.map((c) => {
        const y = cb.get(key(c));
        if (!y || !filled(y)) nF6Lost++;
        return `${c.a}-${c.b} r ${f(c.r / h)}h ω ${f(c.omega)} -> ${y ? `r ${f(y.r / h)}h ω ${f(y.omega)}` : "none"}`;
      });
      out.push(`  ${name} F6 arm ${ai} (j${a.j}) d ${f(d / h)}h reach ${f(r / h)}h: ${after.join("; ")}`);
    }
  });
  tArms += nArms;
  tCorn += nC;
  tLost += lost;
  tGain += gain;
  tF6 += nF6;
  tF6Lost += nF6Lost;
  sum.push(`  ${name.padEnd(22)} arms moved ${String(nArms).padStart(3)}, corners moved ${String(nC).padStart(3)} (lost fill ${lost}, gained ${gain}); F6 arms with fill ${nF6}, their filled corners now empty ${nF6Lost}`);
}
sum.push(`  all: arms moved ${tArms}, corners moved ${tCorn} (lost fill ${tLost}, gained ${tGain}); F6 arms with fill ${tF6}, filled corners now empty ${tF6Lost}`);
out.push(...sum);

// 2. The sweeps.
function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function base(pts: number[][], closed: boolean[]): FieldScene {
  return {
    version: 1,
    name: "dedge",
    source: { kind: "synthetic", generator: "dedge", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: pts.map((p, id) => ({ id, closed: closed[id], pts: p, z: new Array(p.length / 2).fill(0) })),
    crossings: [],
    junctions: [],
    deadEnds: [],
  } as unknown as FieldScene;
}
function tee(dc: number): FieldScene {
  const a = (60 * Math.PI) / 180;
  const s = base([line(-10, 0, 10, 0), line(0, 0, 10 * Math.cos(a), 10 * Math.sin(a)), line(dc, -10, dc, 10)], [false, false, false]);
  s.crossings = [{ a: { chain: 0, s: 10 + dc }, b: { chain: 2, s: 10 }, over: "b" }] as FieldScene["crossings"];
  s.junctions = [
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
  ] as FieldScene["junctions"];
  return s;
}
// A ring of radius 8 centred at (0, −8): the junction at its top (0, 0), arc
// s = 0 there, s growing clockwise (toward +x). Chain 2 crosses the ring at
// arc dc (radially), chain 1 an END up from the top at 60°.
function ring(dc: number): FieldScene {
  const R = 8;
  const n = 400;
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    pts.push(R * Math.sin(t), -R + R * Math.cos(t));
  }
  const len = 2 * Math.PI * R;
  const sc = ((dc % len) + len) % len;
  const t = sc / R;
  const cx = R * Math.sin(t);
  const cy = -R + R * Math.cos(t);
  const ux = Math.sin(t);
  const uy = Math.cos(t);
  const a = (60 * Math.PI) / 180;
  const s = base([pts, line(0, 0, 10 * Math.cos(a), 10 * Math.sin(a)), line(cx - 6 * ux, cy - 6 * uy, cx + 6 * ux, cy + 6 * uy)], [true, false, false]);
  s.crossings = [{ a: { chain: 0, s: sc }, b: { chain: 2, s: 6 }, over: "b" }] as FieldScene["crossings"];
  s.junctions = [
    {
      id: "j0",
      c: [0, 0],
      arms: [
        { chain: 0, s: 0, dir: 1, kind: "through" },
        { chain: 1, s: 0, dir: 1, kind: "end" },
        { chain: 0, s: 0, dir: -1, kind: "through" },
      ],
      corners: [0, 1, 2].map(() => ({ style: "round" as const, pinned: false })),
    },
  ] as FieldScene["junctions"];
  return s;
}
const probesTee: [number, number][] = [
  [1.6, 1.25],
  [-1.25, 1.25],
  [1.25, -1.25],
  [-1.25, -1.25],
];
const probesRing: [number, number][] = [
  [1.6, 1.25],
  [-1.25, 1.25],
  [0, 1.05],
  [0, -0.95],
];
function sweep(label: string, mk: (dc: number) => FieldScene, probes: [number, number][], lo: number, hi: number, steps: number, every: number): void {
  for (const which of ["old", "new"] as const) {
    out.push(`2. ${label}, ${which}, dc in [${lo}, ${hi}] step ${f((hi - lo) / steps, 4)}`);
    const rows: number[][] = [];
    for (let i = 0; i <= steps; i++) {
      const dc = lo + ((hi - lo) * i) / steps;
      const fb: AnyFB = which === "old" ? new FormBOld(mk(dc)) : new FormB(mk(dc), extra);
      const ap = fb.arms.find((a) => a.pi === 0 && a.dir === 1)!;
      const am = fb.arms.find((a) => a.pi === 0 && a.dir === -1)!;
      const ink = probes.map(([x, y]) => fb.evalPoint(x, y).ink);
      rows.push([dc, ap.L, am.L, ...ink]);
      if (i % every === 0)
        out.push(`  ${f(dc, 4).padStart(8)} L+1 ${f(ap.L).padStart(7)} L−1 ${f(am.L).padStart(7)}   ${fb.corners.map((c) => `${c.a}-${c.b}: ${f(c.r)}, ${f(c.omega)}`).join("; ").padEnd(40)} ink ${ink.map((v) => f(v)).join(" ")}`);
    }
    const names = ["L+1", "L−1", ...probes.map((p) => `ink(${p[0]}, ${p[1]})`)];
    const jumps = names.map((nm, k) => {
      let mx = 0;
      let at = 0;
      for (let i = 1; i < rows.length; i++) {
        const dv = Math.abs(rows[i][k + 1] - rows[i - 1][k + 1]);
        if (dv > mx) {
          mx = dv;
          at = rows[i][0];
        }
      }
      return `${nm} ${f(mx, 4)} (dc ${f(at, 4)})`;
    });
    const line1 = `  ${label} ${which}: largest step (dc step ${f((hi - lo) / steps, 4)}): ${jumps.join("; ")}`;
    out.push(line1);
    sum.push(line1);
  }
}
sweep("tee coarse", tee, probesTee, -2.5, 2.5, 500, 25);
sweep("tee fine", tee, probesTee, -0.005, 0.005, 100, 10);
sweep("ring coarse", ring, probesRing, -2.5, 2.5, 500, 25);
sweep("ring fine", ring, probesRing, -0.005, 0.005, 100, 10);
mkdirSync(`${HERE}/out/k1163`, { recursive: true });
writeFileSync(`${HERE}/out/k1163/dedge_${TAG}.txt`, out.join("\n") + "\n");
console.log(sum.join("\n"));

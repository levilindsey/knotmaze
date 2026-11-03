// K1040 S1f item 2: the Lcut loop's d < −1e-12 edge (an open chain's pass
// behind the arm's root is skipped; a closed chain's wraps to d near len).
// 1. Census over the 12 scenes: per arm, every pass behind its root (signed
//    d < 0: d itself on an open chain, d − len past len/2 on a closed one)
//    whose overlap still reaches the root, d > −(reach + h), with the reach
//    the Lcut loop would give it; the arm's L and its corners (r, ω).
// 2. A sweep: a tee (chain 0 through the origin, an END at 60°) and chain 2
//    crossing chain 0 at x = dc at 90° (so through the junction near dc 0),
//    dc in [−2.5, 2.5]: both through arms' L, each corner's r and ω, the ink
//    at four points in the wedges, and the largest step of each.
// Run: npx vite-node .claude/probes/K1040/s1/dedge.ts   (writes out/s1f/dedge.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43dac8f0673db4df/.claude/probes/K1040/s1";
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];

function reachOf(fb: FormB, pi: number, x: FormB["passes"][number][number], dir: number): number {
  const h = fb.h;
  const t = Math.tan(x.theta / 2);
  let r = t > 1e-12 ? h / t : Infinity;
  const fl = 4 * h;
  if (r > fl) r = Math.min(r, Math.max(fl, fb.quadReachOf(pi, x, dir, h, fl)));
  return r;
}

out.push("1. census: passes behind an arm's root whose overlap reaches the root (−(reach + h) < d < 0)");
let total = 0;
let closest = { v: -Infinity, txt: "none" };
for (const name of ALL) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const fb = new FormB(sc);
  const h = fb.h;
  let n = 0;
  let nFill = 0;
  let near = { v: -Infinity, txt: "" };
  fb.arms.forEach((a, ai) => {
    const p = fb.polys[a.pi];
    for (const x of fb.passes[a.pi]) {
      let d = (x.s - a.sR) * a.dir;
      if (p.closed) {
        d = ((d % p.len) + p.len) % p.len;
        if (d > p.len / 2) d -= p.len;
      }
      if (!(d < -1e-12)) continue;
      const r = reachOf(fb, a.pi, x, a.dir);
      const v = d / (r + h); // in (−1, 0): the overlap reaches the root
      const cs = fb.corners.filter((c) => c.a === ai || c.b === ai);
      const fill = cs.filter((c) => c.r > 1e-9 && c.omega > 1e-9).length;
      const txt = `${name} arm ${ai} (j${a.j} c${a.pi} dir ${a.dir} ${a.kind}${p.closed ? " closed" : ""}) L ${f(a.L)}: pass s ${f(x.s)} -> chain ${x.qi}, d ${f(d / h, 3)}h, reach ${f(r / h, 2)}h, d/(reach+h) ${f(v, 3)}; corners ${cs.map((c) => `${c.a}-${c.b} r ${f(c.r, 3)} ω ${f(c.omega, 3)}`).join(", ") || "none"}`;
      if (v > near.v) near = { v, txt };
      if (v > closest.v) closest = { v, txt };
      if (v > -1) {
        n++;
        if (fill) nFill++;
        out.push(`  ${txt}`);
      }
    }
  });
  total += n;
  out.push(`  ${name}: ${n} arm-pass pairs inside (−(reach + h), 0), ${nFill} with a corner with fill; nearest: ${near.txt || "no pass behind a root"}`);
}
out.push(`  all scenes: ${total} inside; nearest overall: ${closest.txt}`);

// 2. The sweep.
function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
function tee(dc: number): FieldScene {
  const a = (60 * Math.PI) / 180;
  const pts = [line(-10, 0, 10, 0), line(0, 0, 10 * Math.cos(a), 10 * Math.sin(a)), line(dc, -10, dc, 10)];
  return {
    version: 1,
    name: "dedge",
    source: { kind: "synthetic", generator: "dedge", params: {} },
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
const probes: [number, number][] = [
  [1.6, 1.25],
  [-1.25, 1.25],
  [1.25, -1.25],
  [-1.25, -1.25],
];
out.push("2. sweep: chain 2 crosses chain 0 at x = dc, 90°, over (h 1); a tee with its END at 60°");
out.push(`  dc      L+1     L−1    corners (arms a-b: r, ω)                          ink at ${probes.map((p) => `(${p[0]}, ${p[1]})`).join(" ")}`);
const rows: number[][] = [];
const steps = 500;
for (let i = 0; i <= steps; i++) {
  const dc = -2.5 + (5 * i) / steps;
  const fb = new FormB(tee(dc));
  const ap = fb.arms.find((a) => a.pi === 0 && a.dir === 1)!;
  const am = fb.arms.find((a) => a.pi === 0 && a.dir === -1)!;
  const ink = probes.map(([x, y]) => fb.evalPoint(x, y).ink);
  rows.push([dc, ap.L, am.L, ...ink]);
  if (i % 25 === 0 || Math.abs(dc) < 0.025)
    out.push(`  ${f(dc, 3).padStart(6)} ${f(ap.L).padStart(7)} ${f(am.L).padStart(7)}   ${fb.corners.map((c) => `${c.a}-${c.b}: ${f(c.r)}, ${f(c.omega)}`).join("; ").padEnd(48)} ${ink.map((v) => f(v)).join(" ")}`);
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
  return `${nm} ${f(mx, 4)} (at dc ${f(at, 3)})`;
});
out.push(`  largest step between neighbouring dc (step ${f(5 / steps, 3)}): ${jumps.join("; ")}`);
mkdirSync(`${HERE}/out/s1f`, { recursive: true });
writeFileSync(`${HERE}/out/s1f/dedge.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => /^ {2}(all|[a-z0-9_.]+:)|largest|^[12]\./.test(l)).join("\n"));

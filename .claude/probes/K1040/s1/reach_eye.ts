// K1040 S1f F1: the reach where the partner comes back (an eye), against a
// moved vertex. Synthetic, h = 1: chain 0 runs along y = 0; chain 1 crosses
// it at the origin at θ0 (y = θ0·x on vertices x = −20, −10, −1, 1, 3, 7,
// 11, 20, 30, 40), except its apex vertex at x = 7, lifted by w: an eye
// whose width peaks near w. The pass's θ stays θ0 whatever w (tanAt at the
// pass reads the vertices at x = ±1 only). The arm on chain 0 runs from a
// root at x = 12 (d = 12 h) toward the pass (dir −1), so "behind the pass"
// is x > 0. Per w: r0, c2's walked e_c, the quad e* (1, 2, 3 fits, floor
// 4h), the final reaches (quad min(r0, max(4h, e*2)), c2 min(r0, e_c), c3
// max(4h, min(r0, e_c))) and each L = max(0, d − reach − h); then the
// largest step between neighbouring w of each column.
// Run: npx vite-node .claude/probes/K1040/s1/reach_eye.ts [theta0=0.05] [w0=0.5] [w1=3] [steps=250] [tag=eye]
//   writes out/s1f/sweep/<tag>_t<theta0>.txt
import { mkdirSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43dac8f0673db4df/.claude/probes/K1040/s1";
const [t0Arg = "0.05", w0Arg = "0.5", w1Arg = "3", stepsArg = "250", tag = "eye"] = process.argv.slice(2);
const theta0 = Number(t0Arg);
const w0 = Number(w0Arg);
const w1 = Number(w1Arg);
const steps = Number(stepsArg);
const f = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : String(v));

function eyeScene(w: number): FieldScene {
  const xs = [-20, -10, -1, 1, 3, 7, 11, 20, 30, 40];
  const pts1: number[] = [];
  for (const x of xs) pts1.push(x, theta0 * x + (x === 7 ? w : 0));
  const pts0: number[] = [];
  for (let i = 0; i <= 300; i++) pts0.push(-20 + (60 * i) / 300, 0);
  // The crossing's arc lengths: chain 0 at x = 0 (s 20), chain 1 at its origin.
  const s1 = 20 * Math.hypot(1, theta0);
  return {
    version: 1,
    name: "reach_eye",
    source: { kind: "synthetic", generator: "reach_eye", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: [
      { id: 0, closed: false, pts: pts0, z: new Array(pts0.length / 2).fill(0) },
      { id: 1, closed: false, pts: pts1, z: new Array(pts1.length / 2).fill(0) },
    ],
    crossings: [{ a: { chain: 0, s: 20 }, b: { chain: 1, s: s1 }, over: "a" }],
    junctions: [],
    deadEnds: [],
  } as FieldScene;
}

const out: string[] = [];
const hw = 1;
const d = 12;
const dir = -1;
const fl = 4 * hw;
out.push(`eye sweep: θ0 ${theta0}, apex vertex (7, 7θ0 + w), w in [${w0}, ${w1}] h, ${steps} steps; arm root at d = ${d} h, dir ${dir}; floor 4h`);
out.push(`  w(h)      θ        r0(h)    e_c(h)   e*1(h)   e*2(h)   e*3(h)  | reach: quad    c2       c3     | L: quad    c2       c3`);
const cols: number[][] = [];
for (let i = 0; i <= steps; i++) {
  const w = w0 + ((w1 - w0) * i) / steps;
  const sc = eyeScene(w);
  const b1 = new FormB(sc, { reachSteps: 1 });
  const b2 = new FormB(sc);
  const b3 = new FormB(sc, { reachSteps: 3 });
  const x = b2.passes[0][0];
  const r0 = hw / Math.tan(x.theta / 2);
  const ec = b2.curvedReachOf(0, x, dir, r0, hw);
  const e1 = b1.quadReachOf(0, x, dir, hw, fl);
  const e2 = b2.quadReachOf(0, x, dir, hw, fl);
  const e3 = b3.quadReachOf(0, x, dir, hw, fl);
  const rq = r0 > fl ? Math.min(r0, Math.max(fl, e2)) : r0;
  const r2 = Math.min(r0, ec);
  const r3 = r0 > fl ? Math.max(fl, Math.min(r0, ec)) : r0;
  const L = (r: number) => Math.max(0, d - r - hw);
  const row = [w, x.theta, r0, ec, e1, e2, e3, rq, r2, r3, L(rq), L(r2), L(r3)];
  cols.push(row);
  out.push(`  ${row.map((v, k) => f(v, k === 0 ? 3 : 4).padStart(8)).join(" ")}`);
}
const names = ["w", "θ", "r0", "e_c", "e*1", "e*2", "e*3", "reach quad", "reach c2", "reach c3", "L quad", "L c2", "L c3"];
const jumps = names.map((n, k) => {
  let mx = 0;
  let at = 0;
  for (let i = 1; i < cols.length; i++) {
    const dv = Math.abs(cols[i][k] - cols[i - 1][k]);
    if (dv > mx) {
      mx = dv;
      at = cols[i][0];
    }
  }
  return `${n} ${f(mx, 4)} (at w ${f(at, 3)})`;
});
out.push(`largest step between neighbouring w (w step ${f((w1 - w0) / steps, 4)} h; all in h): ${jumps.slice(1).join("; ")}`);
mkdirSync(`${HERE}/out/s1f/sweep`, { recursive: true });
const file = `${HERE}/out/s1f/sweep/${tag}_t${theta0}.txt`;
writeFileSync(file, out.join("\n") + "\n");
console.log(out[0]);
console.log(out[out.length - 1]);
console.log(`wrote ${file}`);

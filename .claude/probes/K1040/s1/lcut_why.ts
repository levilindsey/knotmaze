// K1040 S1d, step 5: why an arm's L jumps between two frames. Steps t over
// the interpolated scenes (as pops_switch.ts) and prints, for each arm of
// junction <J>, L and Lcut, and every crossing pass on its chain near the
// span (d from the root, the pass's θ, its cut c = d − h·cot(θ/2) − h), at
// each t where some arm's L moved by more than 1e-3 since the last step.
// Run: npx vite-node .claude/probes/K1040/s1/lcut_why.ts <seq> <from> <to> <J> [steps=64]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const seqDir = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13";
interface Frame {
  i: number;
  scene: FieldScene;
}
function readSeq(name: string): Frame[] {
  const lines = gunzipSync(readFileSync(join(seqDir, `${name}.jsonl.gz`))).toString("utf8").split("\n").filter(Boolean);
  const frames: Frame[] = [];
  let prev = "";
  for (let k = 1; k < lines.length; k++) {
    const fr = JSON.parse(lines[k]) as Frame;
    const key = JSON.stringify(fr.scene.chains);
    if (key === prev) continue;
    prev = key;
    fr.scene.look.ctrlArc ??= 0.47;
    frames.push(fr);
  }
  return frames;
}
function chainLen(pts: number[], closed: boolean): number {
  let L = 0;
  const n = pts.length / 2;
  for (let k = 0; k + 1 < n; k++) L += Math.sqrt((pts[2 * k + 2] - pts[2 * k]) ** 2 + (pts[2 * k + 3] - pts[2 * k + 1]) ** 2);
  if (closed && n > 1) L += Math.sqrt((pts[0] - pts[2 * n - 2]) ** 2 + (pts[1] - pts[2 * n - 1]) ** 2);
  return L;
}
function lerpScene(A: FieldScene, B: FieldScene, t: number): FieldScene {
  const L = (a: number, b: number) => a + (b - a) * t;
  const chains = A.chains.map((c, i) => ({ ...c, pts: c.pts.map((v, k) => L(v, B.chains[i].pts[k])), z: c.z.map((v, k) => L(v, B.chains[i].z[k])) }));
  const lens = chains.map((c, i) => [chainLen(A.chains[i].pts, c.closed), chainLen(B.chains[i].pts, c.closed), chainLen(c.pts, c.closed)]);
  const idx = new Map(A.chains.map((c, i) => [c.id, i]));
  const sL = (chain: number, a: number, b: number) => {
    const i = idx.get(chain) ?? chain;
    if (!chains[i]?.closed) return L(a, b);
    const [la, lb, lt] = lens[i];
    const fa = a / la;
    let fb = b / lb;
    if (fb - fa > 0.5) fb -= 1;
    else if (fa - fb > 0.5) fb += 1;
    const fr = L(fa, fb);
    return (fr - Math.floor(fr)) * lt;
  };
  return {
    ...A,
    chains,
    crossings: A.crossings.map((c, i) => ({ ...c, a: { ...c.a, s: sL(c.a.chain, c.a.s, B.crossings[i].a.s) }, b: { ...c.b, s: sL(c.b.chain, c.b.s, B.crossings[i].b.s) } })),
    junctions: A.junctions.map((j, i) => ({ ...j, c: [L(j.c[0], B.junctions[i].c[0]), L(j.c[1], B.junctions[i].c[1])] as [number, number], arms: j.arms.map((a, k) => ({ ...a, s: sL(a.chain, a.s, B.junctions[i].arms[k].s) })) })),
    deadEnds: A.deadEnds.map((d, i) => ({ ...d, s: sL(d.chain, d.s, B.deadEnds[i].s) })),
  };
}
const [seq = "muse_flow", fs = "28", ts = "29", js = "37", ns = "64"] = process.argv.slice(2);
const frames = readSeq(seq);
const kA = frames.findIndex((f) => f.i === Number(fs));
const kB = frames.findIndex((f) => f.i === Number(ts));
const J = Number(js);
const N = Number(ns);
const f = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
type PassT = { s: number; theta: number };
type FbT = { arms: { j: number; pi: number; sR: number; dir: number; L: number; Lcut: number; ei: number }[]; passes: PassT[][]; polys: { closed: boolean; len: number }[]; h: number };
const sceneAt = (t: number) => lerpScene(frames[kA].scene, frames[kB].scene, t);
let prevL: number[] | null = null;
for (let i = 0; i <= N; i++) {
  const t = i / N;
  const fb = new FormB(sceneAt(t)) as unknown as FbT;
  const arms = fb.arms.filter((a) => a.j === J);
  const Ls = arms.map((a) => a.L);
  const moved = prevL !== null && Ls.some((v, k) => Math.abs(v - prevL![k]) > 1e-3);
  if (i === 0 || i === N || moved) {
    console.log(`t ${f(t)}${moved ? " (L moved)" : ""}:`);
    for (const a of arms) {
      const p = fb.polys[a.pi];
      const near: string[] = [];
      for (const x of fb.passes[a.pi]) {
        let d = (x.s - a.sR) * a.dir;
        if (p.closed) d = ((d % p.len) + p.len) % p.len;
        const tt = Math.tan(x.theta / 2);
        const c = tt > 1e-12 ? d - fb.h / tt - fb.h : -Infinity;
        if (d < 3 || c < 3) near.push(`d ${f(d, 3)} th ${f(x.theta, 3)} c ${f(c, 3)}`);
      }
      console.log(`  arm ei ${a.ei} pi ${a.pi} dir ${a.dir} sR ${f(a.sR, 3)} L ${f(a.L)} Lcut ${f(a.Lcut)}; passes: ${near.slice(0, 4).join("; ")}`);
    }
  }
  prevL = Ls;
}

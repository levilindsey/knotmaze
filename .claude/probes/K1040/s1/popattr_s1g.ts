// K1040 S1g step 5: attribute the gate's one new merged-away pop (muse_flow 31>32,
// corner 155/471/472, "radius room-dV": r 0 -> 0.055) to F1 (the d-edge) or F2
// (the root gate). Sweeps t across the two frames (corner_why.ts's lerpScene and
// helpers, copied) under one form B variant (env VARIANT: s1f | near | rb05 | both),
// N coarse steps, then bisects the largest |Δr| step 24 times: a jump keeps its
// size as the interval shrinks. Env SEQ, FROM, TO, KEY, N; writes OUT.
// Run: q4attr's pattern, four processes: popattr_run_s1g.ps1
// Env: LEV (default 30, as pops_mech.ts), OUT (default <popsDir>/corner_why.txt).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const seqDir = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13";
const NC = 8;
const LEV = Number(process.env.LEV ?? 30);
const popsDir = process.argv[2];
const seqs = (process.argv[3] ?? "def_drag,def_flow,muse_drag,muse_flow").split(",");
const outFile = process.env.OUT ?? join(popsDir, "corner_why.txt");

interface Frame {
  i: number;
  t: number;
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

type C = Record<string, number>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type F = any;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** Why junction j has no corner for arms (a, b) in F. */
function absentWhy(F: F, j: number, a: number, b: number): string {
  const ais = (F.arms as { j: number; ang: number }[]).map((_, i) => i).filter((i) => F.arms[i].j === j);
  ais.sort((u, v) => F.arms[u].ang - F.arms[v].ang);
  const n = ais.length;
  const ia = ais.indexOf(a);
  if (ia < 0 || ais[(ia + 1) % n] !== b) return "order";
  let th = F.arms[b].ang - F.arms[a].ang;
  th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (th >= Math.PI - 1e-6) return `th>=pi (th ${r3(th)})`;
  if (th <= 1e-6) return "th<=0";
  const A = F.arms[a];
  const B = F.arms[b];
  if (!(A.L > 1e-9 && B.L > 1e-9)) return `arm L 0 (${r3(A.L)}, ${r3(B.L)})`;
  const h = F.h as number;
  const jc = F.scene.junctions[j].c as [number, number];
  let bx = A.ux + B.ux;
  let by = A.uy + B.uy;
  const bl = Math.hypot(bx, by) || 1;
  bx /= bl;
  by /= bl;
  const sn = Math.sin(th / 2);
  const full: [number, number] = [0, Infinity];
  const V = F.solveEq(a, b, h, jc[0] + (bx * h) / sn, jc[1] + (by * h) / sn, full, full);
  if (!V.ok) return `no V (th ${r3(th)})`;
  const dVa = F.armDist(a, V.fa.s);
  const dVb = F.armDist(b, V.fb.s);
  const tol = 1e-9 * h;
  if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) return `V off arm (dVa ${r3(dVa)}/${r3(A.L)}, dVb ${r3(dVb)}/${r3(B.L)})`;
  return "wedge";
}
const SEQ = process.env.SEQ ?? "muse_flow";
const FROM = Number(process.env.FROM ?? 31);
const TO = Number(process.env.TO ?? 32);
const KEY = process.env.KEY ?? "155/471/472";
const NS = Number(process.env.N ?? 100);
const VARIANTS: Record<string, object> = { s1f: { dEdge: "skip", rootBand: 0 }, near: { rootBand: 0 }, rb05: { dEdge: "skip" }, both: {} };
const VN = process.env.VARIANT ?? "both";
const P = VARIANTS[VN];
const frames = readSeq(SEQ);
const kA = frames.findIndex((f) => f.i === FROM);
const kB = frames.findIndex((f) => f.i === TO);
type V = { r: number; r1: number; room: number; dVa: number; dVb: number; omega: number };
const get = (t: number): V => {
  const Fb: F = new FormB(lerpScene(frames[kA].scene, frames[kB].scene, t), P);
  const c = (Fb.corners as C[]).find((q) => `${q.j}/${q.a}/${q.b}` === KEY);
  return c ? { r: c.r, r1: c.r1, room: c.room, dVa: c.dVa, dVb: c.dVb, omega: c.omega } : { r: 0, r1: NaN, room: NaN, dVa: NaN, dVb: NaN, omega: NaN };
};
const fv = (v: V) => `r ${v.r.toFixed(4)} r1 ${v.r1.toFixed(4)} room ${v.room.toFixed(4)} dV ${v.dVa.toFixed(4)}/${v.dVb.toFixed(4)} ω ${v.omega.toFixed(3)}`;
const vals: V[] = [get(0)];
let big = 0;
let bigI = 1;
for (let i = 1; i <= NS; i++) {
  vals.push(get(i / NS));
  const dd = Math.abs(vals[i].r - vals[i - 1].r);
  if (dd > big) [big, bigI] = [dd, i];
}
let lo = (bigI - 1) / NS;
let hi = bigI / NS;
let a = vals[bigI - 1];
let b = vals[bigI];
for (let k = 0; k < 24; k++) {
  const m = (lo + hi) / 2;
  const v = get(m);
  if (Math.abs(v.r - a.r) >= Math.abs(b.r - v.r)) [hi, b] = [m, v];
  else [lo, a] = [m, v];
}
const res = [
  `${VN} (${JSON.stringify(P)}): ${SEQ} ${FROM}>${TO} corner ${KEY}`,
  `  t 0: ${fv(vals[0])}`,
  `  t 1: ${fv(vals[NS])}`,
  `  largest |Δr| per 1/${NS}: ${big.toFixed(4)} at t ${(bigI / NS).toFixed(3)}; bisected to t ${lo.toFixed(9)}..${hi.toFixed(9)}: |Δr| ${Math.abs(b.r - a.r).toFixed(4)}`,
  `    lo ${fv(a)}`,
  `    hi ${fv(b)}`,
];
writeFileSync(process.env.OUT ?? join(popsDir, `popattr_${VN}.txt`), res.join("\n") + "\n");
console.log(res.join("\n"));
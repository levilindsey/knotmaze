// K1040 S1c, step 4: why each corner solve jumps. Reads pops_mech.ts's per-pop
// list (<popsDir>/mech_<seq>/mech.json, `all`), and for every pop labelled
// `switch corner <tag>` rebuilds the two interpolated scenes either side of its
// bisected switch (t and t + 2^-LEV / NC) and names the gate that flipped:
// - new/gone: on the side without the corner, the arms' angular order changed
//   (order), the opening angle reached pi (th>=pi), or solveCorner returned
//   null: no V (Newton failed), V off an arm, V outside the wedge;
// - radius: r1 jumped (room: an arm's length L jumped, which is Lcut's pass
//   gate; r0: theta) or r1 held and the feasibility bisection's r jumped
//   (bisect);
// - root: q jumped at the same r (another root of the equidistance solve);
// - fields: the fields that jumped.
// Run: npx vite-node .claude/probes/K1040/s1/corner_why.ts <popsDir> [seq,...]
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

const out: string[] = [];
const tally: Record<string, { pops: number; px: number }> = {};
for (const seq of seqs) {
  const mech = JSON.parse(readFileSync(join(popsDir, `mech_${seq}`, "mech.json"), "utf8")) as { all: { seq: string; from: number; to: number; at: [number, number]; px: number; place: string; top: string; sw: { t: number; at: [number, number] } }[] };
  const frames = readSeq(seq);
  for (const p of mech.all) {
    if (!p.top.startsWith("switch corner")) continue;
    const kA = frames.findIndex((f) => f.i === p.from);
    const kB = frames.findIndex((f) => f.i === p.to);
    const lo = p.sw.t;
    const hi = lo + 1 / (NC * 2 ** LEV);
    const F1: F = new FormB(lerpScene(frames[kA].scene, frames[kB].scene, lo));
    const F2: F = new FormB(lerpScene(frames[kA].scene, frames[kB].scene, hi));
    const [x, y] = p.sw.at;
    const near = (Fb: F) => {
      const m = new Map<string, C>();
      for (const i of Fb.cornersNear(x, y)) {
        const c = Fb.corners[i] as C;
        if (Math.hypot(x - c.qx, y - c.qy) <= c.rV + Fb.W + 4 * Fb.aa) m.set(`${c.j}/${c.a}/${c.b}`, c);
      }
      return m;
    };
    const all = (Fb: F) => new Map((Fb.corners as C[]).map((c) => [`${c.j}/${c.a}/${c.b}`, c]));
    const n1 = near(F1);
    const n2 = near(F2);
    const a1 = all(F1);
    const a2 = all(F2);
    const reasons: string[] = [];
    let main = "";
    for (const k of new Set([...n1.keys(), ...n2.keys()])) {
      const c = a1.get(k);
      const d = a2.get(k);
      const [j, a, b] = k.split("/").map(Number);
      let why = "";
      let cls = "";
      if (!c || !d) {
        const has = (c ?? d) as C;
        const aw = absentWhy(c ? F2 : F1, j, a, b);
        cls = `${c ? "gone" : "new"} ${aw.split(" (")[0]}`;
        why = `${c ? "gone" : "new"}: ${aw}; present: theta ${r3(has.theta)} r ${r3(has.r)} rV ${r3(has.rV)} omega ${r3(has.omega)}`;
      } else {
        const jumped = ["qx", "qy", "r", "r1", "r0", "room", "theta", "omega", "ov", "Vx", "Vy", "dVa", "dVb"].filter((f) => Math.abs(c[f] - d[f]) > 1e-6);
        if (!jumped.length) continue;
        const LA1 = F1.arms[a].L;
        const LA2 = F2.arms[a].L;
        const LB1 = F1.arms[b].L;
        const LB2 = F2.arms[b].L;
        if (jumped.includes("r")) {
          if (jumped.includes("r1")) {
            const lj = Math.abs(LA1 - LA2) > 1e-6 || Math.abs(LB1 - LB2) > 1e-6;
            cls = `radius ${lj ? "room-L" : jumped.includes("room") ? "room-dV" : "r0"}`;
            why = `radius: r1 ${lj ? "room (arm L " + `${r3(LA1)}>${r3(LA2)}, ${r3(LB1)}>${r3(LB2)})` : jumped.includes("room") ? "room (dV)" : "r0"}`;
          } else {
            cls = "radius bisect";
            why = `radius: bisect (r1 ${r3(c.r1)})`;
          }
          why += `; r ${r3(c.r)}>${r3(d.r)} omega ${r3(c.omega)}`;
        } else if (jumped.includes("qx") || jumped.includes("qy")) {
          cls = "root";
          why = `root: q moved ${r3(Math.hypot(c.qx - d.qx, c.qy - d.qy))}; r ${r3(c.r)} omega ${r3(c.omega)}`;
        } else {
          cls = `fields ${jumped.join(",")}`;
          why = `fields: ${jumped.map((f) => `${f} ${r3(c[f])}>${r3(d[f])}`).join(" ")}`;
        }
      }
      reasons.push(`${k} ${why}`);
      if (!main) main = cls;
    }
    const key = `${main || "none"}`;
    const e = (tally[key] ??= { pops: 0, px: 0 });
    e.pops++;
    e.px += p.px;
    out.push(`${seq} ${p.from}>${p.to} (${p.at.join(", ")}) ${p.px} px ${p.place} [${p.top}] ${reasons.join(" | ")}`);
  }
}
const sum = Object.entries(tally)
  .sort((p, q) => q[1].px - p[1].px)
  .map(([k, v]) => `${k}: ${v.pops} pops ${v.px} px`);
writeFileSync(outFile, `${sum.join("\n")}\n\n${out.join("\n")}\n`);
for (const l of sum) console.log(l);

// K1040 S1c, F4: the rate rule on the V margin's fade, frame to frame. For
// every pair of consecutive kept frames of a recording (as pops.ts with
// WINDOWS=0 WLEN=41), every corner present in both frames whose margin factor
// fV = ss(tol, vw, mV) is below 1 on either side: |ΔfV| and |Δω| against the
// local motion (label_pops' rule: the largest motion of a chain sample within
// RHO1 of the point, in px of the first frame's camera) at the fill's corners
// V, t_a and t_b. A fill's ink moves by at most |Δω|, so |Δω| / motion is an
// upper bound on the fade's ink change per px of motion; the rule is 3.
// Run: npx vite-node .claude/probes/K1040/s1/omega_rate.ts [seq,...]
// Env: OUT (default out/s1c/omega_rate.txt), VWH (the margin's fade width in h;
// default form B's own). rate2 floors the motion with the junction centre's.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { segB, type Poly } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
// F4j's form B (the V margin fade): F4 did not keep it in src (F2 has no vw).
import { FormB } from "./form_b_f4j";

const here = dirname(fileURLToPath(import.meta.url));
const seqDir = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13";
const seqs = (process.argv[2] ?? "def_drag,def_flow,muse_drag,muse_flow").split(",");
const outFile = process.env.OUT ?? join(here, "out", "s1c", "omega_rate.txt");
const ss = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const r3 = (v: number) => Math.round(v * 1000) / 1000;

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
function distToPoly(q: Poly, x: number, y: number): number {
  let best = Infinity;
  for (let k = 0; k < q.nseg; k++) {
    const bq = segB(q, k);
    const ex = q.x[bq] - q.x[k];
    const ey = q.y[bq] - q.y[k];
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((x - q.x[k]) * ex + (y - q.y[k]) * ey) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const dx = q.x[k] + t * ex - x;
    const dy = q.y[k] + t * ey - y;
    best = Math.min(best, dx * dx + dy * dy);
  }
  return Math.sqrt(best);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type F = any;
const out: string[] = [];
const all: number[] = [];
const all2: number[] = [];
for (const seq of seqs) {
  const frames = readSeq(seq).slice(0, 41);
  const cam = frames[0].scene.camera;
  const ppu = cam.pxPerUnit;
  const s0 = frames[0].scene;
  const rho1 = (s0.look.halfWidth + s0.look.band) * ppu + 2;
  /** Local motion (px) at world point (x, y): label_pops' RHO1 rule. */
  const motionAt = (A: F, B: F, x: number, y: number) => {
    let m = 0;
    let found = false;
    for (const [P, Q] of [
      [A, B],
      [B, A],
    ]) {
      for (const p of P.polys as Poly[]) {
        const qi = Q.idxOf.get(p.id);
        if (qi === undefined) continue;
        for (let k = 0; k < p.n; k++) {
          if (Math.hypot(p.x[k] - x, p.y[k] - y) * ppu > rho1) continue;
          found = true;
          m = Math.max(m, distToPoly(Q.polys[qi], p.x[k], p.y[k]) * ppu);
        }
      }
    }
    return found ? m : NaN;
  };
  let n = 0;
  let worst = { rate: 0, line: "" };
  // VWH (env): the margin's fade width in h (default: form B's own, 0.25).
  const vwh = process.env.VWH ? Number(process.env.VWH) : 0;
  const prm = vwh ? { vw: vwh * new FormB(frames[0].scene).h } : {};
  let prevF: F = new FormB(frames[0].scene, prm);
  for (let k = 0; k + 1 < frames.length; k++) {
    const nextF: F = new FormB(frames[k + 1].scene, prm);
    const tol = 1e-9 * prevF.h;
    const fV = (Fb: F, c: Record<string, number>) => ss(tol, Fb.vw, Math.min(c.dVa, c.dVb));
    const mB = new Map((nextF.corners as Record<string, number>[]).map((c) => [`${c.j}/${c.a}/${c.b}`, c]));
    for (const c of prevF.corners as Record<string, number>[]) {
      const d = mB.get(`${c.j}/${c.a}/${c.b}`);
      if (!d) continue;
      const f1 = fV(prevF, c);
      const f2 = fV(nextF, d);
      if (f1 >= 1 && f2 >= 1) continue;
      n++;
      const dfV = Math.abs(f2 - f1);
      const dW = Math.abs(d.omega - c.omega);
      let rate = 0;
      for (const [x, y] of [
        [c.Vx, c.Vy],
        [c.tax, c.tay],
        [c.tbx, c.tby],
      ]) {
        const m = motionAt(prevF, nextF, x, y);
        const rr = dW / Math.max(m, 1e-9);
        if (Number.isFinite(rr) && rr > rate) rate = rr;
      }
      // rate2: the same, with the junction centre's own motion (px) as a floor
      // on the motion: label_pops' rule reads chain samples only.
      const jA = prevF.scene.junctions[c.j].c as [number, number];
      const jB = nextF.scene.junctions[d.j].c as [number, number];
      const jm = Math.hypot(jB[0] - jA[0], jB[1] - jA[1]) * ppu;
      const rate2 = Math.min(rate, dW / Math.max(jm, 1e-9));
      all.push(rate);
      all2.push(rate2);
      const parts = (Fb: F, e: Record<string, number>) => `dVa ${r3(e.dVa / Fb.h)}/${r3(Fb.arms[e.a].L / Fb.h)} dVb ${r3(e.dVb / Fb.h)}/${r3(Fb.arms[e.b].L / Fb.h)}`;
      const line = `${seq} ${frames[k].i}>${frames[k + 1].i} ${c.j}/${c.a}/${c.b} theta ${r3(c.theta)}>${r3(d.theta)} fV ${r3(f1)}>${r3(f2)} omega ${r3(c.omega)}>${r3(d.omega)} |dfV| ${r3(dfV)} rate ${r3(rate)}/px rate2 ${r3(rate2)} (centre ${r3(jm)} px); in h: ${parts(prevF, c)} > ${parts(nextF, d)}`;
      if (rate > worst.rate) worst = { rate, line };
      if (rate > 3) out.push(`BREACH ${line}`);
    }
    prevF = nextF;
  }
  out.push(`${seq}: ${n} corner-pairs with fV < 1 on a side; worst ${worst.line || "-"}`);
}
all.sort((p, q) => p - q);
const pct = (p: number) => (all.length ? r3(all[Math.min(all.length - 1, Math.floor(p * all.length))]) : 0);
out.push(`All: ${all.length} corner-pairs; |Δω| per px of motion: median ${pct(0.5)}, p99 ${pct(0.99)}, max ${pct(1)}; above 3: ${all.filter((v) => v > 3).length}; with the junction centre's motion as a floor (rate2), above 3: ${all2.filter((v) => v > 3).length}`);
writeFileSync(outFile, `${out.join("\n")}\n`);
for (const l of out.slice(-5)) console.log(l);

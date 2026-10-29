// K1040 S1c, step 4: what flips at one pop's hard switch. Bisects form B's ink
// at (x, y) between frames <from> and <to> of <seq> (interpolated scenes, as
// pops_mech.ts does) down to 2^-LEV of the pair, then prints the decisions on
// each side: the term, the pieces, the corners near the pixel (r, ω, the
// wedge and fill tests at the pixel and at each piece's outline point) and
// each burier's selfW · winW at the outline point.
// Run: npx vite-node .claude/probes/K1040/s1/pops_switch.ts <seq> <from> <to> <x> <y> [lev=30]
// Env: PARAMS (JSON merged into FormBParams).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type FormBParams, type Piece } from "../../../../src/render/field/form_b";

const seqDir = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13";
const extra = JSON.parse(process.env.PARAMS ?? "{}") as FormBParams;
const KN = ["none", "foot", "tA", "tB", "V", "arc"];

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

const [seq = "def_drag", fs = "0", ts = "1", xs = "0", ys = "0", ls = "30"] = process.argv.slice(2);
const frames = readSeq(seq);
const kA = frames.findIndex((f) => f.i === Number(fs));
const kB = frames.findIndex((f) => f.i === Number(ts));
if (kA < 0 || kB < 0) throw new Error(`frames ${fs}/${ts} not kept`);
const x = Number(xs);
const y = Number(ys);
const at = (t: number) => new FormB(lerpScene(frames[kA].scene, frames[kB].scene, t), extra);
const NC = 64;
const iv: number[] = [];
for (let j = 0; j <= NC; j++) iv.push(at(j / NC).evalPoint(x, y).ink);
let js = 0;
for (let j = 1; j < NC; j++) if (Math.abs(iv[j + 1] - iv[j]) > Math.abs(iv[js + 1] - iv[js])) js = j;
let lo = js / NC;
let hi = (js + 1) / NC;
let ilo = iv[js];
let ihi = iv[js + 1];
for (let l = 0; l < Number(ls); l++) {
  const mt = (lo + hi) / 2;
  const im = at(mt).evalPoint(x, y).ink;
  if (Math.abs(im - ilo) >= Math.abs(ihi - im)) {
    hi = mt;
    ihi = im;
  } else {
    lo = mt;
    ilo = im;
  }
}
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
console.log(`${seq} ${fs}>${ts} at (${x}, ${y}): ink ${r4(iv[0])} -> ${r4(iv[NC])}; largest step ${js}/${NC}; switch at t ${lo} (+${hi - lo}): ${r4(ilo)} -> ${r4(ihi)}`);
function show(tag: string, t: number) {
  const fb = at(t);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const F = fb as any;
  const r = fb.evalPoint(x, y);
  const P: Piece[] = [];
  fb.pieces(x, y, P);
  const tm = r.term;
  console.log(`${tag}: ink ${r4(r.ink)} top ${r.top} fade ${r.fade} nSurf ${r.nSurf} term ${tm ? `${KN[tm.kind]} chain ${tm.chain} s ${r4(tm.s)} surf ${tm.surf} corner ${tm.corner} w ${r4(tm.w)} D ${r4(tm.D)}` : "-"}; corners ${F.corners.length}`);
  for (const A of P) console.log(`  piece ${A.idx} chain ${A.chain} s ${r4(A.s)} k ${A.k} d ${r4(A.d)} g ${A.g} surf ${A.surf} ramp ${r4(A.ramp)} selfW ${r4(A.selfW)} key ${r4(A.key)}`);
  const foot = (A: Piece) => [A.fx + (fb.h * (x - A.fx)) / A.d, A.fy + (fb.h * (y - A.fy)) / A.d];
  for (const ci of fb.cornersNear(x, y)) {
    const c = F.corners[ci];
    const dq = Math.hypot(x - c.qx, y - c.qy);
    const ff = P.filter((A) => A.d > 1e-12)
      .map((A) => {
        const [fx, fy] = foot(A);
        return `${A.idx}:${F.inFill(c, fx, fy, A) ? 1 : 0}`;
      })
      .join(" ");
    console.log(`  corner ${ci} j ${c.j} g ${c.g} arms ${c.a},${c.b} ok ${c.ok} style ${c.style} theta ${r4(c.theta)} r ${r4(c.r)} rV ${r4(c.rV)} omega ${r4(c.omega)} dq ${r4(dq)} wedge ${F.inWedge(c, x, y) ? 1 : 0} fill ${F.inFill(c, x, y) ? 1 : 0} fillAtFoot ${ff}`);
  }
  for (const A of P) {
    if (!(A.d > 1e-12)) continue;
    const [fx, fy] = foot(A);
    const bs = P.filter((B) => B !== A && B.surf === A.surf)
      .map((B) => `${B.idx}:${r4(B.selfW)}*${r4(F.winW(B, fx, fy))}`)
      .join(" ");
    console.log(`  outline of ${A.idx} at (${r4(fx)}, ${r4(fy)}): buriers ${bs || "-"}`);
  }
}
show("lo", lo);
show("hi", hi);
// The corners whose solve jumps across the switch (any numeric field by > 1e-6).
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CA = (at(lo) as any).corners as Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CB = (at(hi) as any).corners as Record<string, unknown>[];
  console.log(`corners ${CA.length} -> ${CB.length}`);
  const keyOf = (c: Record<string, unknown>) => `${c.j}/${c.a}/${c.b}`;
  const mB = new Map(CB.map((c) => [keyOf(c), c]));
  let shown = 0;
  for (const c of CA) {
    const d = mB.get(keyOf(c));
    if (!d) {
      console.log(`  gone ${keyOf(c)} ok ${c.ok} r ${c.r}`);
      continue;
    }
    const diffs: string[] = [];
    for (const [k, v] of Object.entries(c)) {
      const w = d[k];
      if (typeof v === "number" && typeof w === "number" && Math.abs(v - w) > 1e-6) diffs.push(`${k} ${r4(v)}>${r4(w)}`);
      else if (typeof v === "boolean" && v !== w) diffs.push(`${k} ${v}>${w}`);
    }
    if (diffs.length && shown++ < 12) console.log(`  jump ${keyOf(c)}: ${diffs.join(" ")}`);
  }
  const mA = new Map(CA.map((c) => [keyOf(c), c]));
  for (const c of CB) if (!mA.has(keyOf(c))) console.log(`  new ${keyOf(c)} ok ${c.ok} r ${c.r}`);
}
// ROOTS=j/a/b: every root of the fillet's equidistance solve (rho = h + r, the
// tracked windows) near the corner's q, from a grid of starts, at lo and hi.
if (process.env.ROOTS) {
  for (const [tag, t] of [
    ["lo", lo],
    ["hi", hi],
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const F = at(t) as any;
    const c = (F.corners as Record<string, number>[]).find((q) => `${q.j}/${q.a}/${q.b}` === process.env.ROOTS);
    if (!c) {
      console.log(`${tag}: no corner ${process.env.ROOTS}`);
      continue;
    }
    const h = F.h as number;
    const wa: [number, number] = [c.dVa - h, c.dVa + 4 * h];
    const wb: [number, number] = [c.dVb - h, c.dVb + 4 * h];
    const roots: { x: number; y: number; ka: number; kb: number; n: number }[] = [];
    for (let i = -15; i <= 15; i++)
      for (let k = -15; k <= 15; k++) {
        const q = F.solveEq(c.a, c.b, h + c.r, c.qx + i * 0.02, c.qy + k * 0.02, wa, wb);
        if (!q.ok) continue;
        const e = roots.find((o) => Math.hypot(o.x - q.x, o.y - q.y) < 1e-7);
        if (e) e.n++;
        else roots.push({ x: q.x, y: q.y, ka: q.fa.k, kb: q.fb.k, n: 1 });
      }
    console.log(`${tag}: corner ${process.env.ROOTS} q (${r4(c.qx)}, ${r4(c.qy)}) r ${r4(c.r)} h ${r4(h)}: ${roots.map((o) => `(${r4(o.x)}, ${r4(o.y)}) kA ${o.ka} kB ${o.kb} x${o.n}`).join("; ")}`);
  }
}
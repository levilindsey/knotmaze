// K1247 s31: the snap (in OutlineModel.update since s31) and the frame's exact caches (KF_INC.cache: borders,
// corners) in Node. Replays a captured drag (k1247s18_capture.mjs frames, ~170 ms apart) interpolated to sub=N
// frames per captured pair (10 ~ 60 Hz), through the app's look, and reports:
//   - identity: frameSnapped with the caches on against off, on the same snapped scenes, every frame (digest);
//   - hit rates: borders (chains) and corners; the snap's cost (snapScene, p50/p95);
//   - frame cost p50/p95, interleaved per frame: raw (frame on the true input; today), snapped, snapped+cache;
//     and every profiled phase, raw -> snapped+cache;
//   - check (b): the largest offset of a drawn fill vertex (fillFrame, fillRec 3: every vertex where the shader
//     places it), snapped frame against the true input's frame, in device px, over the drag;
//   - check (a): the same offset on the drag's last frame held as the rest (no exact frame: the app sends none),
//     and whether update(scene, exact=true)'s frame equals the true input's frame there (digest).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s31_inc.ts <dragDir> [sub=10] [T=0.5] [warm=1] [time=1]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, frameSnapped, alignJunctionArms, KF_INC, newSnapState, snapScene } from "../../../src/render/outline/outline";
import type { SceneIn, DiagramStructure, OutlineTable } from "../../../src/render/outline/outline";
import { digest } from "../../../test/render/outline_digest";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const sub = +arg("sub", "10"); const T = +arg("T", "0.5"); const warm = +arg("warm", "1"); const timeIt = arg("time", "1") === "1";
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const cap = files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
const lerp = (a: SceneIn, b: SceneIn, t: number): SceneIn => {
  const s = structuredClone(b);
  s.chains.forEach((c, i) => { const p = a.chains[i].pts; if (p.length === c.pts.length) for (let k = 0; k < p.length; k++) c.pts[k] = p[k] + (c.pts[k] - p[k]) * t; });
  s.crossings.forEach((x, i) => { const y = a.crossings[i]; if (y) { x.a.s = y.a.s + (x.a.s - y.a.s) * t; x.b.s = y.b.s + (x.b.s - y.b.s) * t; } });
  s.junctions.forEach((j, i) => { const k = a.junctions[i]; if (k) { j.c = [k.c[0] + (j.c[0] - k.c[0]) * t, k.c[1] + (j.c[1] - k.c[1]) * t]; j.arms.forEach((r, q) => { if (k.arms[q]) r.s = k.arms[q].s + (r.s - k.arms[q].s) * t; }); } });
  return s;
};
const raw: SceneIn[] = [cap[0]];
for (let i = 1; i < cap.length; i++) { for (let k = 1; k < sub; k++) raw.push(lerp(cap[i - 1], cap[i], k / sub)); raw.push(cap[i]); }
KF_INC.T = T;
const mk = (): DiagramStructure => (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const f2 = (a: number[]): string => `${q(a, 0.5).toFixed(2)}/${q(a, 0.95).toFixed(2)}`;

// The snap, once (as OutlineModel.update: alignJunctionArms, then snapScene), timed.
const S = newSnapState(); const snapMs: number[] = []; const al: SceneIn[] = []; const snapped: SceneIn[] = [];
const A0 = mk();
for (const s of raw) { const a = alignJunctionArms(A0, s); al.push(a); const t0 = performance.now(); snapped.push(snapScene(S, a, T)); snapMs.push(performance.now() - t0); }

// Identity and hit rates.
const F = mk(); const I = mk(); let same = 0; let diff = 0; let firstDiff = -1; const trace = createHash("sha256"); const sTrace = createHash("sha256");
KF_INC.hits = 0; KF_INC.misses = 0; KF_INC.cHits = 0; KF_INC.cMisses = 0; KF_INC.vAux = 0; KF_INC.vMiss = 0; KF_INC.cMissJ = 0; KF_INC.why = {};
for (let i = 0; i < snapped.length; i++) {
  KF_INC.cache = false; const a = digest(frameSnapped(F, snapped[i]));
  KF_INC.cache = true; const b = digest(frameSnapped(I, snapped[i]));
  KF_INC.cache = false;
  if (a === b) same++; else { diff++; if (firstDiff < 0) firstDiff = i; }
  trace.update(a); sTrace.update(JSON.stringify(snapped[i]));
}
console.log(`snapped tables' trace (every frame's digest, caches off): ${trace.digest("hex").slice(0, 16)}; snapped scenes' trace ${sTrace.digest("hex").slice(0, 16)}`);
const name = dir.split(/[\\/]/).filter(Boolean).pop();
console.log(`${name}: ${raw.length} frames (sub ${sub}), T ${T} px, chains ${cap[0].chains.length}, junctions ${cap[0].junctions.length}`);
console.log(`identity caches on/off: same ${same}, differ ${diff}${diff ? ` (first at ${firstDiff})` : ""}`);
const pct = (h: number, m: number): string => `${(100 * h / Math.max(1, h + m)).toFixed(1)}%`;
console.log(`hit rates: borders ${pct(KF_INC.hits, KF_INC.misses)} (${KF_INC.hits}/${KF_INC.hits + KF_INC.misses}), corners ${pct(KF_INC.cHits, KF_INC.cMisses)} (${KF_INC.cHits}/${KF_INC.cHits + KF_INC.cMisses}); snap ms p50/p95 ${f2(snapMs.slice(1))}; version bumps per frame: aux ${(KF_INC.vAux / raw.length).toFixed(1)}, border ${(KF_INC.vMiss / raw.length).toFixed(1)}; corner misses on the centre alone ${KF_INC.cMissJ}; aux fields changed on border hits ${JSON.stringify(KF_INC.why)}`); KF_INC.why = null;

// Checks (b) and (a): every drawn border (the table's pieces' polylines), snapped against true: for each point of
// a piece, its distance to the other table's pieces of the same chain and side (point to segment), both ways; the
// largest, in device px. A control at T=0 (snap and feet) must read 0.
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
const groups = (t: OutlineTable): Map<string, number[][]> => { const m = new Map<string, number[][]>(); for (const p of t.pieces) { const k = `${p.chain}|${p.side}`; let g = m.get(k); if (!g) m.set(k, g = []); g.push(p.pts); } return m; };
const segD = (x: number, y: number, P: number[][]): number => {
  let b = Infinity;
  for (const p of P) {
    if (p.length === 2) { b = Math.min(b, Math.hypot(x - p[0], y - p[1])); continue; }
    for (let k = 0; k + 3 < p.length; k += 2) {
      const ax = p[k], ay = p[k + 1], ex = p[k + 2] - ax, ey = p[k + 3] - ay; const L = ex * ex + ey * ey;
      const u = L > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L)) : 0;
      b = Math.min(b, Math.hypot(x - ax - u * ex, y - ay - u * ey));
    }
  }
  return b;
};
const hd = (a: OutlineTable, b: OutlineTable): number => {
  const A = groups(a), B = groups(b); let m = 0;
  for (const [k, P] of A) { const Q = B.get(k); if (!Q) { m = Infinity; continue; } for (const p of P) for (let i = 0; i < p.length; i += 2) m = Math.max(m, segD(p[i], p[i + 1], Q)); }
  for (const [k, Q] of B) { const P = A.get(k); if (!P) { m = Infinity; continue; } for (const q2 of Q) for (let i = 0; i < q2.length; i += 2) m = Math.max(m, segD(q2[i], q2[i + 1], P)); }
  return m * px;
};
const stride = +arg("bstride", "1");
if (arg("b", "1") === "1") {
const Bs = mk(); const Rt = mk(); const C0 = mk(); const S0 = newSnapState();
const offs: number[] = []; const ctl: number[] = []; let n05 = 0; let worst = -1; let wv = 0;
for (let i = 0; i < raw.length; i++) {
  const tb = frameSnapped(Bs, snapped[i]); const tt = frame(Rt, al[i]);
  KF_INC.T = 0; const z = snapScene(S0, al[i], 0); const tc = frameSnapped(C0, z); KF_INC.T = T;
  if (i % stride !== 0 && i !== raw.length - 1) continue;
  const o = hd(tb, tt); offs.push(o); ctl.push(hd(tc, tt)); if (o > 0.5) n05++; if (o > wv) { wv = o; worst = i; }
}
console.log(`check (b) drawn border offset px (every ${stride} frames): p50 ${q(offs, 0.5).toFixed(3)} p95 ${q(offs, 0.95).toFixed(3)} max ${wv.toFixed(3)} (frame ${worst}); over 0.5 px: ${n05}/${offs.length}; control T=0 max ${Math.max(...ctl).toFixed(3)}`);
const last = raw.length - 1;
const ex = digest(frame(mk(), al[last])); KF_INC.cache = true; const exC = digest(frame(I, al[last])); KF_INC.cache = false;
console.log(`check (a) at rest (last frame held, no exact frame): offset ${offs[offs.length - 1].toFixed(3)} px; update(exact)'s frame (caches on) = the true frame: ${ex === exC}`);
}
// The snap alone, repeated (rep=N passes over the drag, fresh state each; p50/p95 over every call).
const rep = +arg("rep", "0");
if (rep > 0) { const ms: number[] = []; for (let r = 0; r < rep; r++) { const S2 = newSnapState(); for (const a of al) { const t0 = performance.now(); snapScene(S2, a, T); ms.push(performance.now() - t0); } } console.log(`snap alone ms p50/p95 over ${rep} passes: ${f2(ms)}`); }
if (timeIt) {
  const R: number[] = []; const Fm: number[] = []; const Im: number[] = [];
  const Rs = mk(); const Fs = mk(); const Is = mk();
  const PR: Record<string, number[]> = {}; const PI: Record<string, number[]> = {};
  const run = (st: DiagramStructure, i: number, mode: 0 | 1 | 2, prof: Record<string, number>): number => {
    KF_INC.cache = mode === 2; const t0 = performance.now();
    if (mode === 0) frame(st, al[i], prof); else frameSnapped(st, snapped[i], prof);
    const ms = performance.now() - t0; KF_INC.cache = false; return ms;
  };
  for (let c = 0; c < warm + 1; c++) {
    for (let i = 0; i < raw.length; i++) {
      const pr: Record<string, number> = {}; const pf: Record<string, number> = {}; const pi: Record<string, number> = {};
      const o = (i + c) % 3; let a = 0; let b = 0; let d = 0;
      const r1 = (): void => { a = run(Rs, i, 0, pr); }; const s1 = (): void => { b = run(Fs, i, 1, pf); }; const c1 = (): void => { d = run(Is, i, 2, pi); };
      if (o === 0) { r1(); s1(); c1(); } else if (o === 1) { s1(); c1(); r1(); } else { c1(); r1(); s1(); }
      if (c >= warm) {
        R.push(a); Fm.push(b); Im.push(d);
        for (const [k, v] of Object.entries(pr)) (PR[k] ??= []).push(v);
        for (const [k, v] of Object.entries(pi)) (PI[k] ??= []).push(v);
      }
    }
  }
  console.log(`frame ms p50/p95: raw ${f2(R)}  snapped ${f2(Fm)}  snapped+cache ${f2(Im)}`);
  const ph = Object.keys(PR).filter((k) => q(PR[k], 0.5) >= 0.05).sort((x, y) => q(PR[y], 0.5) - q(PR[x], 0.5));
  console.log(`phases p50 raw -> snap+cache: ${ph.map((k) => `${k} ${q(PR[k], 0.5).toFixed(2)}->${PI[k] ? q(PI[k], 0.5).toFixed(2) : "-"}`).join(", ")}`);
}

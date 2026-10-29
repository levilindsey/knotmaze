// K1040 S1 step 4: label_pops' rule and Q3's tie-band counts on the
// reference (form B), on the CPU.
//
// The rule is scripts/label_pops.ts's (its header), applied to form B's ink:
// - one camera, the recording's first frame's;
// - a pixel CHANGED when its ink moved by more than TOL (32/255);
// - it is EXPLAINED when its new value lies between the lightest and darkest
//   ink of the old frame (+-TOL) within its local motion + 1 px, and its old
//   value likewise in the new frame;
// - local motion: the largest motion of the chain samples within RHO1
//   (h + band + 2 px) of the pixel, else within RHO2 (12 h); a sample's
//   motion is its distance to the other frame's polyline of the same chain,
//   both ways;
// - unexplained pixels outside the fades (any fade bit in either frame) in
//   8-connected blobs of at least AMIN (4) px are POPS. Unexplained pixels
//   inside fades are counted apart, by fade bit.
// Q3: per frame, the TIE BAND: pixels covered by two surfaces with
// |dz| < zt (form B's nSurf >= 2 and dz < zt), split by the nearest
// structure (a crossing within 3 h, by its angle; a junction within
// 2h + W + 3h; other), and the pixels where the tie mix ran (F_TIE).
//
// Subset: WINDOWS (fractions of the kept frames, default 0.2,0.5,0.8), each
// WLEN (default 4) consecutive kept frames, so WLEN - 1 pairs per window.
// Frames whose chains equal the previous kept frame's are dropped, as
// label_pops does. Writes out/pops/<seq>.json and out/pops/summary.txt (env OUTSUB
// replaces "pops"; WINDOWS=0 WLEN=41 OUTSUB=pops_full runs every kept frame).
//
// Run from the worktree:
//   npx vite-node .claude/probes/K1040/s1/pops.ts [seq,...]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { normS, pointAt, segB, type Poly } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { F_TIE, FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const seqDir = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13";
const outDir = join(here, "out", process.env.OUTSUB ?? "pops");
mkdirSync(outDir, { recursive: true });
const TOL = 32 / 255;
const AMIN = 4;
const WINDOWS = (process.env.WINDOWS ?? "0.2,0.5,0.8").split(",").map(Number);
const WLEN = Number(process.env.WLEN ?? 4);
const seqs = (process.argv[2] ?? "def_drag,def_flow,muse_drag,muse_flow").split(",");
const r3 = (v: number) => Math.round(v * 1000) / 1000;
// S1c: DUMP=1 stores each pop's pixel indices (o = j * nx + i) for pops_mech.ts.
const DUMP = process.env.DUMP === "1";

interface Frame {
  i: number;
  t: number;
  scene: FieldScene;
}
type Cam = FieldScene["camera"];

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

interface Ras {
  ink: Float32Array;
  fade: Uint8Array;
  tie: number;
  tieMix: number;
  tieBy: Record<string, number>;
  inked: number;
  ms: number;
}

function structures(fb: FormB, s: FieldScene) {
  const xs: { x: number; y: number; deg: number }[] = [];
  for (const c of s.crossings) {
    const ia = fb.idxOf.get(c.a.chain);
    const ib = fb.idxOf.get(c.b.chain);
    if (ia === undefined || ib === undefined) continue;
    const pa = fb.polys[ia];
    const pb = fb.polys[ib];
    const A = pointAt(pa, normS(pa, c.a.s));
    const B = pointAt(pb, normS(pb, c.b.s));
    const cos = Math.abs(A.tx * B.tx + A.ty * B.ty);
    xs.push({ x: A.x, y: A.y, deg: (Math.acos(Math.min(1, cos)) * 180) / Math.PI });
  }
  const js = s.junctions.map((j) => ({ x: j.c[0], y: j.c[1] }));
  return { xs, js };
}

function classify(st: ReturnType<typeof structures>, fb: FormB, x: number, y: number): string {
  let best = Infinity;
  let deg = 0;
  for (const c of st.xs) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < best) {
      best = d;
      deg = c.deg;
    }
  }
  if (best < 3 * fb.h) return deg < 15 ? "crossing<15" : deg < 30 ? "crossing15-30" : deg < 60 ? "crossing30-60" : "crossing60+";
  const mouth = 2 * fb.h + fb.W + 3 * fb.h;
  for (const j of st.js) if (Math.hypot(j.x - x, j.y - y) < mouth) return "junction";
  return "other";
}

function rasterFrame(fb: FormB, s: FieldScene, cam: Cam): Ras {
  const t0 = Date.now();
  const [a, b, c, d, e, f] = cam.worldToCss;
  const det = a * d - b * c;
  const [nx, ny] = cam.viewport;
  const n = nx * ny;
  const ink = new Float32Array(n);
  const fade = new Uint8Array(n);
  const st = structures(fb, s);
  const tieBy: Record<string, number> = {};
  let tie = 0;
  let tieMix = 0;
  let inked = 0;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      const u = i + 0.5 - e;
      const v = j + 0.5 - f;
      const x = (d * u - c * v) / det;
      const y = (-b * u + a * v) / det;
      const r = fb.evalPoint(x, y);
      ink[o] = r.ink;
      fade[o] = r.fade;
      if (r.ink >= 0.5) inked++;
      if (r.fade & F_TIE) tieMix++;
      if (r.nSurf >= 2 && r.dz < fb.zt) {
        tie++;
        const k = classify(st, fb, x, y);
        tieBy[k] = (tieBy[k] ?? 0) + 1;
      }
    }
  return { ink, fade, tie, tieMix, tieBy, inked, ms: Date.now() - t0 };
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
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/** Per pixel, the local motion in px (label_pops' rule). */
function motionField(A: FormB, B: FormB, s: FieldScene, cam: Cam): Float32Array {
  const [a, b, c, d, e, f] = cam.worldToCss;
  const [nx, ny] = cam.viewport;
  const ppu = cam.pxPerUnit;
  const rho1 = (s.look.halfWidth + s.look.band) * ppu + 2;
  const rho2 = 12 * s.look.halfWidth * ppu;
  const n = nx * ny;
  const M1 = new Float32Array(n).fill(-1);
  const CELL = 8;
  const cxN = Math.ceil(nx / CELL);
  const cyN = Math.ceil(ny / CELL);
  const M2 = new Float32Array(cxN * cyN);
  const splat = (px: number, py: number, m: number) => {
    if (px < -rho2 || py < -rho2 || px > nx + rho2 || py > ny + rho2) return;
    const i0 = Math.max(0, Math.floor(px - rho1));
    const i1 = Math.min(nx - 1, Math.ceil(px + rho1));
    const j0 = Math.max(0, Math.floor(py - rho1));
    const j1 = Math.min(ny - 1, Math.ceil(py + rho1));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const dx = i + 0.5 - px;
        const dy = j + 0.5 - py;
        if (dx * dx + dy * dy > rho1 * rho1) continue;
        const o = j * nx + i;
        if (m > M1[o]) M1[o] = m;
      }
    const r2 = rho2 + CELL * 0.7072;
    const ci0 = Math.max(0, Math.floor((px - r2) / CELL));
    const ci1 = Math.min(cxN - 1, Math.floor((px + r2) / CELL));
    const cj0 = Math.max(0, Math.floor((py - r2) / CELL));
    const cj1 = Math.min(cyN - 1, Math.floor((py + r2) / CELL));
    for (let cj = cj0; cj <= cj1; cj++)
      for (let ci = ci0; ci <= ci1; ci++) {
        const dx = (ci + 0.5) * CELL - px;
        const dy = (cj + 0.5) * CELL - py;
        if (dx * dx + dy * dy > r2 * r2) continue;
        const o = cj * cxN + ci;
        if (m > M2[o]) M2[o] = m;
      }
  };
  for (const [P, Q] of [
    [A, B],
    [B, A],
  ] as const)
    for (const p of P.polys) {
      const qi = Q.idxOf.get(p.id);
      if (qi === undefined) continue;
      const q = Q.polys[qi];
      for (let k = 0; k < p.n; k++) {
        const x = p.x[k];
        const y = p.y[k];
        const m = distToPoly(q, x, y) * ppu;
        splat(a * x + c * y + e, b * x + d * y + f, m);
      }
    }
  const M = new Float32Array(n);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      M[o] = M1[o] >= 0 ? M1[o] : M2[Math.floor(j / CELL) * cxN + Math.floor(i / CELL)];
    }
  return M;
}

function found(cov: Float32Array, nx: number, ny: number, i: number, j: number, R: number, v: number): boolean {
  const r = Math.ceil(R);
  let lo = Infinity;
  let hi = -Infinity;
  for (let dj = -r; dj <= r; dj++)
    for (let di = -r; di <= r; di++) {
      if (di * di + dj * dj > R * R) continue;
      const ii = i + di;
      const jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const w = cov[jj * nx + ii];
      if (w < lo) lo = w;
      if (w > hi) hi = w;
      if (v >= lo - TOL && v <= hi + TOL) return true;
    }
  return v >= lo - TOL && v <= hi + TOL;
}

interface PairOut {
  from: number;
  to: number;
  changed: number;
  unexplained: number;
  unexplainedInFades: Record<string, number>;
  pops: { px: number; at: [number, number]; near: string; pix?: number[] }[];
  maxMotionPx: number;
}

function comparePair(fa: FormB, ra: Ras, fbb: FormB, rb: Ras, s: FieldScene, cam: Cam, st: ReturnType<typeof structures>): Omit<PairOut, "from" | "to"> {
  const [nx, ny] = cam.viewport;
  const n = nx * ny;
  const M = motionField(fa, fbb, s, cam);
  let maxMotionPx = 0;
  for (let o = 0; o < n; o++) if (M[o] > maxMotionPx) maxMotionPx = M[o];
  const bad = new Uint8Array(n);
  let changed = 0;
  let unexplained = 0;
  const inFades: Record<string, number> = {};
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      const v0 = ra.ink[o];
      const v1 = rb.ink[o];
      if (Math.abs(v1 - v0) <= TOL) continue;
      changed++;
      const R = M[o] + 1;
      if (found(ra.ink, nx, ny, i, j, R, v1) && found(rb.ink, nx, ny, i, j, R, v0)) continue;
      const fd = ra.fade[o] | rb.fade[o];
      if (fd) {
        inFades[`f${fd}`] = (inFades[`f${fd}`] ?? 0) + 1;
        continue;
      }
      unexplained++;
      bad[o] = 1;
    }
  // 8-connected blobs of the unexplained pixels outside the fades.
  const [a, b, c, d, e, f] = cam.worldToCss;
  const det = a * d - b * c;
  const pops: PairOut["pops"] = [];
  const stack: number[] = [];
  for (let o0 = 0; o0 < n; o0++) {
    if (bad[o0] !== 1) continue;
    bad[o0] = 2;
    stack.push(o0);
    let size = 0;
    const pix: number[] = [];
    let sx = 0;
    let sy = 0;
    while (stack.length) {
      const o = stack.pop() as number;
      const i = o % nx;
      const j = (o - i) / nx;
      size++;
      if (DUMP) pix.push(o);
      sx += i + 0.5;
      sy += j + 0.5;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
          const q = jj * nx + ii;
          if (bad[q] === 1) {
            bad[q] = 2;
            stack.push(q);
          }
        }
    }
    if (size < AMIN) continue;
    const u = sx / size - e;
    const v = sy / size - f;
    const x = (d * u - c * v) / det;
    const y = (-b * u + a * v) / det;
    pops.push({ px: size, at: [r3(x), r3(y)], near: classify(st, fa, x, y), ...(DUMP ? { pix } : {}) });
  }
  return { changed, unexplained, unexplainedInFades: inFades, pops, maxMotionPx: r3(maxMotionPx) };
}

const summary: string[] = [];
for (const name of seqs) {
  const t0 = Date.now();
  const frames = readSeq(name);
  const cam = frames[0].scene.camera;
  const starts = [...new Set(WINDOWS.map((w) => Math.max(0, Math.min(frames.length - WLEN, Math.floor(w * frames.length)))))];
  const cache = new Map<number, { fb: FormB; ras: Ras }>();
  const get = (k: number) => {
    let v = cache.get(k);
    if (!v) {
      const fb = new FormB(frames[k].scene);
      v = { fb, ras: rasterFrame(fb, frames[k].scene, cam) };
      cache.set(k, v);
    }
    return v;
  };
  const pairs: PairOut[] = [];
  for (const k0 of starts)
    for (let k = k0; k + 1 < Math.min(frames.length, k0 + WLEN); k++) {
      const A = get(k);
      const B = get(k + 1);
      const st = structures(A.fb, frames[k].scene);
      pairs.push({ from: frames[k].i, to: frames[k + 1].i, ...comparePair(A.fb, A.ras, B.fb, B.ras, frames[k].scene, cam, st) });
    }
  const perFrame = [...cache.entries()]
    .sort((p, q) => p[0] - q[0])
    .map(([k, v]) => ({ i: frames[k].i, inked: v.ras.inked, tieBand: v.ras.tie, tieMix: v.ras.tieMix, tieBy: v.ras.tieBy, rasterMs: v.ras.ms }));
  const pops = pairs.reduce((m, p) => m + p.pops.length, 0);
  const popPx = pairs.reduce((m, p) => m + p.pops.reduce((q, x) => q + x.px, 0), 0);
  const unex = pairs.reduce((m, p) => m + p.unexplained, 0);
  const inF: Record<string, number> = {};
  for (const p of pairs) for (const [k, v] of Object.entries(p.unexplainedInFades)) inF[k] = (inF[k] ?? 0) + v;
  const popsBy: Record<string, number> = {};
  for (const p of pairs) for (const x of p.pops) popsBy[x.near] = (popsBy[x.near] ?? 0) + 1;
  const tieMin = Math.min(...perFrame.map((p) => p.tieBand));
  const tieMax = Math.max(...perFrame.map((p) => p.tieBand));
  const tieBy: Record<string, number> = {};
  for (const p of perFrame) for (const [k, v] of Object.entries(p.tieBy)) tieBy[k] = (tieBy[k] ?? 0) + v;
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ seq: name, keptFrames: frames.length, windows: starts.map((k) => frames[k].i), wlen: WLEN, tol: TOL, amin: AMIN, perFrame, pairs }, null, 1));
  const lines = [
    `== ${name}: ${frames.length} kept frames; windows at frames ${starts.map((k) => frames[k].i).join(", ")} x ${WLEN}; ${pairs.length} pairs, ${cache.size} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`,
    `  label_pops' rule: ${pops} pops (${popPx} px) by ${JSON.stringify(popsBy)}; unexplained outside fades ${unex} px; inside fades ${JSON.stringify(inF)}; max motion ${Math.max(...pairs.map((p) => p.maxMotionPx))} px`,
    `  Q3 tie band (nSurf >= 2, dz < zt) per frame ${tieMin}-${tieMax} px, sum ${JSON.stringify(tieBy)}; tie mix px per frame ${perFrame.map((p) => p.tieMix).join(",")}`,
  ];
  for (const l of lines) console.log(l);
  summary.push(...lines);
}
writeFileSync(join(outDir, seqs.length === 1 ? `summary_${seqs[0]}.txt` : "summary.txt"), `${summary.join("\n")}\n`);

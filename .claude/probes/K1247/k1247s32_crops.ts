// K1247 s32: crops of drag frames (the TRUE input, the drag's own structure, alignJunctionArms + frame, as the
// app's model frames them), rendered like the K1314 census (fill_tri painted + bandData, rasterOutline) at
// mag x device px (P x P panels). Per zoom: <tag>_<mag>x.png = form B (of the first frame) | each frame's
// rp=outline, and each panel raw as <tag>_f<frame>_<mag>x.png. With before=<dir>, each frame's row is
// form B | <dir>'s raw panel of the same name (master) | now: <tag>_f<frame>_<mag>x_ba.png.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s32_crops.ts <dragDir> frames=13,14 at=22.36,14.67
//        [sub=10] [mags=4,8] [P=320] [out=.claude/probes/K1247/out/s32] [tag=def_j83] [before=<dir>] [snap=0]
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../src/render/field/form_b";
import * as O from "../../../src/render/outline/outline";
import * as D from "../../../src/render/outline/draw";
import * as F from "../../../src/render/outline/fill_tri";
import { sectionPaint, runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { rasterOutline, chainPt, type Model } from "../K1314/k1314_census";
import { readPng, writePng } from "../K1314/k1314_crops";
import { loadDrag } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2];
const sub = +arg("sub", "10"); const P = +arg("P", "320");
const frames = arg("frames", "0").split(",").map(Number); const mags = arg("mags", "4,8").split(",").map(Number);
const out = arg("out", ".claude/probes/K1247/out/s32"); const tag = arg("tag", "crop"); const before = arg("before", "");
const [ax, ay] = arg("at", "0,0").split(",").map(Number);
mkdirSync(out, { recursive: true });

/** buildModel (k1314_census) on a given structure and scene. */
export function modelOf(st: O.DiagramStructure, scene0: O.SceneIn, table?: O.OutlineTable): Model {
  table ??= O.frame(st, scene0);
  // the census paints the CPU fill and band (no record strips): drop the drag captures' GPU look keys
  const look = { ...scene0.look } as Record<string, unknown>; delete look.fillRec; delete look.bandRec; delete look.bandRecGpu;
  const scene = { ...scene0, look } as O.SceneIn;
  const zz = D.zChains(scene);
  const fs = F.fillStructure(st, F.fillResolution(st, table));
  const fr = F.fillFrame(fs, st, table, scene, zz);
  const sp = sectionPaint(scene, "app", D.baseHueFor(scene.name));
  const runs = F.fillRuns(fs, st, fr, sp);
  const vItem = new Int32Array(fs.nV).fill(-1);
  fs.items.forEach((it, ii) => { const n = F.itemVerts(it); for (let v = it.base; v < it.base + n && v < fs.nV; v++) vItem[v] = ii; });
  const T: number[] = []; const A: number[] = []; const Pi: number[] = [];
  table.pieces.forEach((p, pi) => {
    const bd = D.bandData({ ...table, pieces: [p] }, scene, zz);
    for (let k = 0; k < bd.bandCount; k++) { T.push(bd.bandPos[2 * k], bd.bandPos[2 * k + 1]); A.push(bd.bandAlpha[k]); }
    for (let k = 0; k < bd.bandCount / 3; k++) Pi.push(pi);
  });
  const nTri = Pi.length; const tri = Float64Array.from(T); const tb = new Float64Array(4 * nTri);
  for (let t = 0; t < nTri; t++) {
    tb[4 * t] = Math.min(tri[6 * t], tri[6 * t + 2], tri[6 * t + 4]); tb[4 * t + 2] = Math.max(tri[6 * t], tri[6 * t + 2], tri[6 * t + 4]);
    tb[4 * t + 1] = Math.min(tri[6 * t + 1], tri[6 * t + 3], tri[6 * t + 5]); tb[4 * t + 3] = Math.max(tri[6 * t + 1], tri[6 * t + 3], tri[6 * t + 5]);
  }
  const idx = new Map<number, number>(); scene.chains.forEach((c, i) => idx.set(c.id, i));
  const xPts = scene.crossings.map((x) => {
    const ca = scene.chains[idx.get(x.a.chain) ?? -1]; const cb = scene.chains[idx.get(x.b.chain) ?? -1];
    if (!ca || !cb) return { x: NaN, y: NaN };
    const a = chainPt(ca.pts, ca.closed, x.a.s); const b = chainPt(cb.pts, cb.closed, x.b.s);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  });
  return { scene, st, table, zz, fs, fr, sp, runs, vItem, tri, triA: Float32Array.from(A), triP: Int32Array.from(Pi), tb, nTri, xPts } as Model;
}

const comp = (fill: number[] | null, ink: number): [number, number, number] => { const a = Math.min(1, Math.max(0, ink)); const f = fill ?? [1, 1, 1]; return [Math.round(255 * f[0] * (1 - a)), Math.round(255 * f[1] * (1 - a)), Math.round(255 * f[2] * (1 - a))]; };
let lastInk: Float32Array | null = null;
function panelOutline(m: Model, c0: number, r0: number, ppu: number): Uint8Array {
  const R = rasterOutline(m, c0, r0, P, P, ppu); const o = new Uint8Array(P * P * 3);
  if (lastInk) { let n = 0; let mx = 0; for (let i = 0; i < P * P; i++) { const d = Math.abs(R.ink[i] - lastInk[i]); if (d > 0.25) n++; if (d > mx) mx = d; } console.log(`  ink vs previous panel: ${n} px differ by > 0.25, max ${mx.toFixed(2)}`); }
  lastInk = Float32Array.from(R.ink);
  for (let i = 0; i < P * P; i++) { const v = comp(R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : null, R.ink[i]); o.set(v, 3 * i); }
  return o;
}
function panelFormB(m: Model, c0: number, r0: number, ppu: number): Uint8Array {
  const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } };
  const o = new Uint8Array(P * P * 3); const col: RGB = [0, 0, 0];
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = fb.evalPoint((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu); let fill: number[] | null = null;
    if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(m.sp, ev.chain, ev.s); if (k >= 0) { runColour(m.sp.runs[k], ev.s, col); fill = [col[0], col[1], col[2]]; } }
    o.set(comp(fill, ev.ink), 3 * (r * P + c));
  }
  return o;
}
function row(panels: Uint8Array[]): { px: Uint8Array; W: number } {
  const W = panels.length * (P + 4) - 4; const px = new Uint8Array(W * P * 3).fill(255);
  panels.forEach((p, k) => { for (let r = 0; r < P; r++) px.set(p.subarray(3 * r * P, 3 * (r + 1) * P), 3 * (r * W + k * (P + 4))); });
  return { px, W };
}
function ring(p: Uint8Array, cx: number, cy: number, rp: number): void {
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) if (Math.abs(Math.hypot(c - cx, r - cy) - rp) < 0.8) p.set([235, 20, 20], 3 * (r * P + c));
}

const { cap, raw } = loadDrag(dir, sub);
const dev = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
const snapOn = arg("snap", "0") === "1";
// Each frame on the structure the worker holds then: a model fed every frame up to it (the true input, or the
// snapped one with snap=1), rebuilt where its update throws (muse_hash's drag outgrows cap[0]'s structure).
const at = new Map<number, { st: O.DiagramStructure; table: O.OutlineTable }>();
const snap0 = O.KF_INC.snap; O.KF_INC.snap = snapOn;
let model = new OutlineModel(cap[0]); let nThrew = 0;
const grab = (i: number): void => { const m = model as unknown as { st: O.DiagramStructure; table: O.OutlineTable }; at.set(i, { st: m.st, table: structuredClone(m.table) }); };
if (frames.includes(0)) grab(0);
for (let i = 1; i <= Math.max(...frames); i++) { try { model.update(raw[i], !snapOn); } catch { nThrew++; model = new OutlineModel(raw[i]); } if (frames.includes(i)) grab(i); }
O.KF_INC.snap = snap0;
console.log(`the model rebuilt ${nThrew} times up to f${Math.max(...frames)}`);
for (const mag of mags) {
  const ppu = mag * dev; const c0 = Math.round(ax * ppu - P / 2); const r0 = Math.round(ay * ppu - P / 2);
  const panels: Uint8Array[] = []; lastInk = null; console.log(`${tag} ${mag}x:`);
  const A0 = at.get(frames[0]) as { st: O.DiagramStructure }; const s0 = O.alignJunctionArms(A0.st, raw[frames[0]]);
  const fbp = panelFormB(modelOf(A0.st, s0), c0, r0, ppu); ring(fbp, P / 2, P / 2, 3 * mag); panels.push(fbp);
  for (const f of frames) {
    const A = at.get(f) as { st: O.DiagramStructure; table: O.OutlineTable }; const s = O.alignJunctionArms(A.st, raw[f]);
    const p = panelOutline(modelOf(A.st, s, A.table), c0, r0, ppu);
    const name = `${tag}_f${f}_${mag}x.png`; writePng(join(out, name), p, P, P);
    const rp = new Uint8Array(p); ring(rp, P / 2, P / 2, 3 * mag); panels.push(rp);
    if (before && existsSync(join(before, name))) {
      const B = readPng(join(before, name)); const bp = new Uint8Array(B.px); ring(bp, P / 2, P / 2, 3 * mag);
      const ba = row([fbp, bp, rp]); writePng(join(out, `${tag}_f${f}_${mag}x_ba.png`), ba.px, ba.W, P);
    }
  }
  const R = row(panels); writePng(join(out, `${tag}_${mag}x.png`), R.px, R.W, P);
}
console.log(`wrote ${tag} frames ${frames.join(",")} at (${ax}, ${ay}) mags ${mags.join(",")} to ${out}`);

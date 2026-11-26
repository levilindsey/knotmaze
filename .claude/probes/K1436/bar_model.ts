// The K1436 bar's scene model, free of rp=outline (deleted 2026-11-25). The bar reads only two things from the
// model K1314's buildModel built: the scene (gfTablesOf, the GPU field's tables) and its section paint (the
// mirror scan's SEAM test, k1436_lib colourDiff). Those parts are copied here verbatim, so the bar runs on any
// commit, before or after the delete (it copies this folder into each commit's tree):
//   sectionPaint, runAt, unwrap, runColour and their types: src/render/outline/paint.ts at 66e7eac48;
//   baseHueFor: src/render/outline/draw.ts; loadScene: ../K1314/k1314_census.ts; gfTablesOf: ../K1362/k1362s1_census.ts.
//   writePng (for k1436_spots / k1436_sheet): ../K1314/k1314_crops.ts.
// O.structure / O.frame / the fills and the band (the rest of the old Model) were computed but never read by the bar.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";

export const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";

/** The fields of a K868 scene export this file reads (the rest rides along for buildTables). */
export interface SceneIn {
  name: string;
  look: { halfWidth: number; ctrlArc?: number };
  chains: { id: number; pts: number[]; closed: boolean }[];
  junctions: { arms: { chain: number; s: number; dir: number }[] }[];
  camera: { pxPerUnit: number };
}
export type RGB = [number, number, number];
export type PaintMode = "app" | "step" | "kink";

export interface PRun {
  pi: number;
  /** Span on the chain (unwrapped: a closed chain's wrap run has sB > len). */
  sA: number; sB: number;
  /** Ramp length at each end (0 = none: a dead end, or step mode). */
  rA: number; rB: number;
  ease: number;
  /** The chain's length when closed (s unwraps about the run), else 0. */
  len: number;
  colA: RGB; colMid: RGB; colB: RGB;
  /** Junction at each end (-1: chain end / dead end). */
  jA: number; jB: number;
}

export interface SectionPaint {
  mode: PaintMode;
  runs: PRun[];
  /** The run an arm reads, by scene arm "ji:ei". */
  armRun: Map<string, number>;
  /** Per chain index, its runs in s order. */
  runsOf: number[][];
  conv: RGB[];
}

function hsl(hDeg: number, s: number, l: number): RGB {
  const h = ((((hDeg % 360) + 360) % 360) / 360);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
  const f = (t: number): number => { let u = t; if (u < 0) u += 1; if (u > 1) u -= 1; if (u < 1 / 6) return p + (q - p) * 6 * u; if (u < 1 / 2) return q; if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6; return p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

function chainLen(pts: number[], closed: boolean): number {
  let L = 0; const n = pts.length >> 1;
  for (let i = 1; i < n; i++) L += Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
  if (closed && n > 1) L += Math.hypot(pts[0] - pts[2 * n - 2], pts[1] - pts[2 * n - 1]);
  return L;
}

/** The section runs of one frame. Run order and colours depend only on the
 *  diagram (arm order along each chain), so every frame of one diagram
 *  builds the same runs with spans that follow the arms. */
export function sectionPaint(scene: SceneIn, mode: PaintMode = "app", baseHue = 0): SectionPaint {
  const idxOf = new Map<number, number>(); scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  const h = scene.look.halfWidth;
  const ctrlArc = (scene.look as { ctrlArc?: number }).ctrlArc ?? 0.47;
  const cuts: { s: number; arms: { ji: number; ei: number; dir: number }[] }[][] = scene.chains.map(() => []);
  scene.junctions.forEach((J, ji) => J.arms.forEach((a, ei) => {
    const pi = idxOf.get(a.chain); if (pi === undefined) return;
    const L = cuts[pi]; const c = L.find((u) => Math.abs(u.s - a.s) < 1e-6);
    if (c) c.arms.push({ ji, ei, dir: a.dir }); else L.push({ s: a.s, arms: [{ ji, ei, dir: a.dir }] });
  }));
  const runs: PRun[] = []; const runsOf: number[][] = []; const armRun = new Map<string, number>();
  const jOf = (c: { arms: { ji: number }[] } | undefined): number => (c ? c.arms[0].ji : -1);
  scene.chains.forEach((ch, pi) => {
    const len = chainLen(ch.pts, ch.closed);
    const L = cuts[pi].sort((a, b) => a.s - b.s);
    const mine: number[] = []; runsOf.push(mine);
    const add = (sA: number, sB: number, cA: typeof L[number] | undefined, cB: typeof L[number] | undefined): number => {
      const k = runs.length;
      runs.push({ pi, sA, sB, rA: 0, rB: 0, ease: 0, len: ch.closed ? len : 0, colA: [0, 0, 0], colMid: [0, 0, 0], colB: [0, 0, 0], jA: jOf(cA), jB: jOf(cB) });
      mine.push(k);
      for (const a of cA?.arms ?? []) if (a.dir > 0) armRun.set(`${a.ji}:${a.ei}`, k);
      for (const a of cB?.arms ?? []) if (a.dir < 0) armRun.set(`${a.ji}:${a.ei}`, k);
      return k;
    };
    if (ch.closed) {
      if (L.length === 0) { add(0, len, undefined, undefined); return; }
      for (let i = 0; i + 1 < L.length; i++) add(L[i].s, L[i + 1].s, L[i], L[i + 1]);
      add(L[L.length - 1].s, L[0].s + len, L[L.length - 1], L[0]);
      return;
    }
    // Open: boundaries 0 .. len; a cut at an end is that end's junction.
    const eps = 1e-6;
    const first = L.length && L[0].s <= eps ? L[0] : undefined;
    const last = L.length && L[L.length - 1].s >= len - eps ? L[L.length - 1] : undefined;
    const inner = L.filter((c) => c !== first && c !== last);
    const bounds: { s: number; c: typeof L[number] | undefined }[] = [{ s: 0, c: first }, ...inner.map((c) => ({ s: c.s, c })), { s: len, c: last }];
    for (let i = 0; i + 1 < bounds.length; i++) add(bounds[i].s, bounds[i + 1].s, bounds[i].c, bounds[i + 1].c);
  });
  // Colours: 12 swatches spread by a stride; runs sharing a junction never
  // share a swatch (the app's collision walk), deterministic in run order.
  const K = 12; const STRIDE = 5;
  const pick = new Array<number>(runs.length).fill(-1);
  const byJ = new Map<number, number[]>();
  runs.forEach((r, k) => { for (const j of [r.jA, r.jB]) if (j >= 0) { const l = byJ.get(j) ?? []; l.push(k); byJ.set(j, l); } });
  runs.forEach((r, k) => {
    const taken = new Set<number>();
    for (const j of [r.jA, r.jB]) if (j >= 0) for (const o of byJ.get(j)!) if (pick[o] >= 0) taken.add(pick[o]);
    let j = (k * 7 + r.pi * 3) % K;
    for (let t = 0; t < K && taken.has(j); t++) j = (j + 1) % K;
    pick[k] = j;
    r.colMid = hsl(baseHue + (((j * STRIDE) % K) / (K - 1)) * 280, 0.45, 0.64);
  });
  // Each junction's converged colour: the mean of its arms' run colours.
  const conv: RGB[] = scene.junctions.map((J, ji) => {
    const c: RGB = [0, 0, 0]; let n = 0;
    J.arms.forEach((_, ei) => { const k = armRun.get(`${ji}:${ei}`); if (k === undefined) return; for (let q = 0; q < 3; q++) c[q] += runs[k].colMid[q]; n++; });
    return n ? (c.map((v) => v / n) as RGB) : [0.5, 0.5, 0.5];
  });
  for (const r of runs) {
    const sp = r.sB - r.sA;
    let ramp = 0; let ease = 0;
    if (mode === "app") { ramp = Math.min(sp / 2, Math.min(ctrlArc, 0.18 * sp) + 0.88); ease = 0.88; }
    else if (mode === "kink") { ramp = Math.min(sp / 2, 2.5 * h); ease = 0; }
    r.ease = ease;
    r.colA = r.jA >= 0 ? conv[r.jA] : r.colMid; r.rA = r.jA >= 0 ? ramp : 0;
    r.colB = r.jB >= 0 ? conv[r.jB] : r.colMid; r.rB = r.jB >= 0 ? ramp : 0;
  }
  return { mode, runs, armRun, runsOf, conv };
}

/** The run of chain `pi` holding s (structure-time lookups only). */
export function runAt(sp: SectionPaint, pi: number, s: number): number {
  const L = sp.runsOf[pi]; if (!L || L.length === 0) return -1;
  for (const k of L) { const r = sp.runs[k]; const cu = unwrap(r, s); if (cu >= r.sA - 1e-9 && cu <= r.sB + 1e-9) return k; }
  // Nearest run end.
  let best = L[0]; let bd = Infinity;
  for (const k of L) { const r = sp.runs[k]; const cu = unwrap(r, s); const d = Math.min(Math.abs(cu - r.sA), Math.abs(cu - r.sB)); if (d < bd) { bd = d; best = k; } }
  return best;
}

/** s on a closed chain, taken to the copy nearest the run's middle. */
export function unwrap(r: PRun, s: number): number {
  if (!(r.len > 0)) return s;
  const mid = (r.sA + r.sB) / 2;
  return s + r.len * Math.round((mid - s) / r.len);
}

/** A run's section colour at s (evalRunSection's ramp, RGB space). */
export function runColour(r: PRun, s: number, out: RGB = [0, 0, 0]): RGB {
  const cu = unwrap(r, s);
  const da = cu - r.sA; const db = r.sB - cu;
  const ez = (u: number): number => u + (u * u * (3 - 2 * u) - u) * r.ease;
  let a = r.colMid; let b = r.colMid; let w = 0;
  if (r.rA > 0 && da < r.rA) { a = r.colA; w = ez(Math.max(0, Math.min(1, da / r.rA))); }
  else if (r.rB > 0 && db < r.rB) { a = r.colB; w = ez(Math.max(0, Math.min(1, db / r.rB))); }
  else { w = 1; }
  out[0] = a[0] + (b[0] - a[0]) * w; out[1] = a[1] + (b[1] - a[1]) * w; out[2] = a[2] + (b[2] - a[2]) * w;
  return out;
}

export function baseHueFor(name: string): number {
  let hsh = 2166136261;
  for (let i = 0; i < name.length; i++) { hsh ^= name.charCodeAt(i); hsh = Math.imul(hsh, 16777619); }
  return ((hsh >>> 0) / 4294967295) * 360;
}

export function loadScene(nm: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8"));
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}

/** The bar's model: the scene and its section paint, as K1314's buildModel made them. */
export interface Model { scene: SceneIn; sp: SectionPaint }
export function buildModel(nm: string): Model {
  const scene = loadScene(nm);
  const sp = sectionPaint(scene, "app", baseHueFor(scene.name));
  return { scene, sp };
}

const TCACHE = new WeakMap<Model, GfTables>();
export function gfTablesOf(m: Model): GfTables {
  let t = TCACHE.get(m);
  if (!t) { const sc = m.scene as never as { camera: { pxPerUnit: number } }; t = buildTables(m.scene as never, { aa: 0.5 / (sc.camera.pxPerUnit * 2) }); TCACHE.set(m, t); }
  return t;
}

export function writePng(file: string, px: Uint8Array, W: number, H: number): void {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(px.buffer, px.byteOffset + y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
  const crc = (buf: Buffer): number => { let c = ~0; for (const v of buf) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}


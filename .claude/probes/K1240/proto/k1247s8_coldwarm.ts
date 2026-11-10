// K1247 s8: k1247c_coldwarm.ts on the REDUCED path. The kept set is chosen
// once per scene (selectKeep on the still scene at --eps device px, a list
// runs each); structure() takes the reduced still scene and every frame the
// reduced scene (reduceScene: the gather and the s remap). Otherwise as the
// original: frame()'s warm starts must not change its output. Tolerance in h.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s8_coldwarm.ts [scenes] [--eps=0.05,0.1,0.2] [--tol=1e-6]
// The original's header:
// K1247 (Claude's check): frame()'s warm starts must not change its output.
// Per case, the cold frame (a new structure, so a new cache) against two warm
// ones on the same code: after one frame at another position, and after a
// walk of the consistent perturb from S out to 0.5h and back down to the
// case's S'. Pieces must keep their order, kind, chain, side, corner and
// region; reported: the largest point distance (world units) per case.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247c_coldwarm.ts [scenes] [--tol=1e-6] [--impl=./outline_x.ts]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "./outline";
import { selectKeep, reduceScene, keepStats, armRanges, armCrossRanges, type KeepSet } from "./k1247s8_reduce";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const args = process.argv.slice(2);
const names = (args.find((a) => !a.startsWith("--")) ?? ALL.join(",")).split(",");
const tol = Number(args.find((a) => a.startsWith("--tol="))?.slice(6) ?? 1e-6);
// --impl= runs another copy of outline.ts (one extracted from a commit, say).
const impl = args.find((a) => a.startsWith("--impl="))?.slice(7) ?? "./outline.ts";
const { structure: structure0, frame: frame0 } = (await import(/* @vite-ignore */ new URL(impl, import.meta.url).href)) as typeof import("./outline");

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
// s3f_exact.ts's consistent perturb.
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const cumOf = (c: { closed: boolean; pts: number[] }): number[] => {
    const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1; const cum = [0];
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
    return cum;
  };
  const before = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1]; const d = dxy(x, y);
      c.pts[i] = x + d[0];
      c.pts[i + 1] = y + d[1];
    }
  }
  const after = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const closedOf = new Map(sc.chains.map((c) => [c.id, c.closed]));
  const remap = (chain: number, s: number): number => {
    const o = before.get(chain); const p = after.get(chain);
    if (!o || !p || o.length < 2) return s;
    const L = o[o.length - 1]; let u = s;
    if (closedOf.get(chain) && L > 0) u = ((u % L) + L) % L;
    let i = 0; while (i + 2 < o.length && o[i + 1] < u) i++;
    const t = o[i + 1] > o[i] ? (u - o[i]) / (o[i + 1] - o[i]) : 0;
    return p[i] + (p[i + 1] - p[i]) * t;
  };
  const any = sc as unknown as { crossings?: { a: { chain: number; s: number }; b: { chain: number; s: number } }[]; junctions?: { c: number[]; arms: { chain: number; s: number }[] }[]; deadEnds?: { chain: number; s: number }[] };
  for (const x of any.crossings ?? []) { x.a.s = remap(x.a.chain, x.a.s); x.b.s = remap(x.b.chain, x.b.s); }
  for (const j of any.junctions ?? []) { const d = dxy(j.c[0], j.c[1]); j.c[0] += d[0]; j.c[1] += d[1]; for (const a of j.arms) a.s = remap(a.chain, a.s); }
  for (const e of any.deadEnds ?? []) e.s = remap(e.chain, e.s);
  return sc;
}
function ptSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax; const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(ax + ex * t - px, ay + ey * t - py);
}
function ptPoly(px: number, py: number, pts: ArrayLike<number>): number {
  const n = pts.length / 2;
  if (n === 0) return Infinity;
  if (n === 1) return Math.hypot(pts[0] - px, pts[1] - py);
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) best = Math.min(best, ptSeg(px, py, pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3]));
  return best;
}
function hausdorff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length === 0 && b.length === 0) return 0;
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, ptPoly(a[i], a[i + 1], b));
  for (let i = 0; i + 1 < b.length; i += 2) m = Math.max(m, ptPoly(b[i], b[i + 1], a));
  return m;
}
interface P { kind: string; chain: number; side: number; corner: number; region: number; pts: number[]; cpts: number[] }
// A table's run pieces are views the next frame() on the same structure
// overwrites: copy the pieces out at once.
const copy = (t: { pieces: unknown[] }): P[] => (t.pieces as { kind: string; chain: number; side: number; corner: number; region: number; pts: ArrayLike<number>; cpts?: ArrayLike<number> }[]).map((p) => ({ kind: p.kind, chain: p.chain, side: p.side, corner: p.corner, region: p.region, pts: Array.from(p.pts), cpts: Array.from(p.cpts ?? []) }));
function compare(a: P[], b: P[]): { keys: string; max: number; at: string } {
  let keys = a.length !== b.length ? `count ${a.length} vs ${b.length}` : "";
  let max = 0; let at = "-";
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const p = a[i]; const q = b[i];
    if (!keys && (p.kind !== q.kind || p.chain !== q.chain || p.side !== q.side || p.corner !== q.corner || p.region !== q.region)) keys = `piece ${i}`;
    const d = Math.max(hausdorff(p.pts, q.pts), hausdorff(p.cpts, q.cpts));
    if (d > max) { max = d; at = `#${i} ${p.kind} ch${p.chain} corner${p.corner}`; }
  }
  return { keys, max, at };
}
const epsList = (args.find((a) => a.startsWith("--eps="))?.slice(6) ?? "0.05,0.1,0.2").split(",").map(Number);
let K: KeepSet | null = null;
const structure = (s: SceneIn): ReturnType<typeof structure0> => structure0(reduceScene(s, K!));
const frame = (st: ReturnType<typeof structure0>, s: SceneIn): ReturnType<typeof frame0> => frame0(st, reduceScene(s, K!));
let fails = 0; let worst = 0;
for (const epsPx of epsList) {
for (const name of names) {
  const orig = load(name);
  const h = orig.look.halfWidth;
  { // --short / --armwin / --winx in h, as k1247s8_acc.ts (armwin from a full build of the still scene).
      const hh = orig.look.halfWidth; const av = args.find((a) => a.startsWith("--armwin="))?.slice(9); const xv = args.find((a) => a.startsWith("--winx="))?.slice(7); const sv = args.find((a) => a.startsWith("--short="))?.slice(8);
      const { buildOutlineFull } = await import("./outline");
      const axv = args.find((a) => a.startsWith("--armx="))?.slice(7); const armsF = av || axv ? buildOutlineFull(orig).structure.arms : null;
      let kr = av ? armRanges(armsF!, +av * hh) : undefined; if (axv) kr = armCrossRanges(orig, armsF!, +axv * hh, 6 * hh, kr);
      K = selectKeep(orig, { eps: epsPx / (orig.camera.pxPerUnit * 2), keepShort: sv ? +sv * hh : 0, winX: xv ? +xv * hh : undefined, keepRanges: kr });
    }
  const ks = keepStats(K);
  const mults = ["def", "ring", "fat"].includes(name) ? [0, 0.1, 0.5] : [0, 0.1];
  for (const mult of mults) {
    const sc = mult ? perturb(orig, mult * h) : orig;
    const cold = copy(frame(structure(orig), sc));
    const stA = structure(orig);
    frame(stA, perturb(orig, (mult === 0.1 ? 0.5 : 0.1) * h));
    const warmA = copy(frame(stA, sc));
    const stB = structure(orig);
    for (let k = 0; k <= 10; k++) frame(stB, k ? perturb(orig, k * 0.05 * h) : orig);
    for (let k = 9; k * 0.05 > mult + 1e-9; k--) frame(stB, perturb(orig, k * 0.05 * h));
    const warmB = copy(frame(stB, sc));
    const a = compare(cold, warmA); const b = compare(cold, warmB);
    const bad = !!(a.keys || b.keys) || a.max > tol * h || b.max > tol * h;
    if (bad) fails++;
    worst = Math.max(worst, a.max / h, b.max / h);
    console.log(`${bad ? "FAIL" : "ok  "} eps ${epsPx} px (${(ks.kept / ks.full * 100).toFixed(1)}% kept) ${name} ${mult}: one frame away ${a.keys ? `KEYS ${a.keys}; ` : ""}${(a.max / h).toExponential(2)} h (${a.at}); walk ${b.keys ? `KEYS ${b.keys}; ` : ""}${(b.max / h).toExponential(2)} h (${b.at})`);
  }
}
}
console.log(fails ? `REDUCED: ${fails} FAILURES (tolerance ${tol} h, worst ${worst.toExponential(2)} h)` : `REDUCED (eps ${epsList.join(", ")} px): COLD = WARM within ${tol} h (worst ${worst.toExponential(2)} h)`);

// K1240 r4 scratch: at the consistent S' (MOVE=<mult>, default 0.1), our pieces near a
// point and each nearby point's form B score (fade, |Dexp|, |term.D| in device px).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/_r4_jcm.ts <scene> <x> <y> [R=0.15]
import { readFileSync } from "node:fs";
import { structure, frame, type SceneIn } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";
const [name, xS, yS, rS] = process.argv.slice(2);
const scene0 = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as SceneIn;
(scene0.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const cumOf = (c: { closed: boolean; pts: number[] }): number[] => {
    const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1; const cum = [0];
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
    return cum;
  };
  const before = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
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
const mult = Number(process.env.MOVE ?? 0.1);
const scene = mult ? perturb(scene0, mult * scene0.look.halfWidth) : scene0;
const st = structure(scene0) as any;
const t = frame(st, scene) as any;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const ppd = scene.camera.pxPerUnit * 2;
const X = Number(xS); const Y = Number(yS); const R = Number(rS ?? 0.15);
const ids = scene.chains.map((c: any) => c.id);
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(3) : String(v));
(t.corners ?? []).forEach((c: any, ci: number) => {
  if (!(Math.hypot(c.Vx - X, c.Vy - Y) < 3 * R)) return;
  console.log(`c${ci} ${Object.entries(c).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k}=${typeof v === "number" ? f(v) : v}`).join(" ")}`);
});
t.pieces.forEach((p: any, i: number) => {
  const np = p.pts.length / 2; const near: string[] = [];
  for (let k = 0; k < np; k++) {
    const x = p.pts[2 * k]; const y = p.pts[2 * k + 1];
    if (Math.hypot(x - X, y - Y) >= R) continue;
    const ev = fb.evalPoint(x, y);
    const dD = Number.isFinite(ev.Dexp) ? Math.abs(ev.Dexp) * ppd : Infinity;
    const dT = ev.term ? Math.abs(ev.term.D) * ppd : Infinity;
    near.push(`#${k}(${f(x)},${f(y)}) f${ev.fade} D${dD.toFixed(2)} T${dT.toFixed(2)}`);
  }
  if (!near.length) return;
  console.log(`p${i} ${p.kind} ch${ids[p.chain]} side${p.side} corner${p.corner} n=${np} s${f(p.s0)}..${f(p.s1)} | ${near.join(" ")}`);
});

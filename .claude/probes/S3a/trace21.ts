// K992 s3: one corner's foot placement, step by step: r, q, the feet, and every
// local minimum of |q - arm| on each arm's window (the candidates the nearest-
// point foot chooses between). Frames are the census's recorded frames
// (deduplicated); --k blends frame t -> t+1 in K steps, --frames f0,f1 walks
// whole frames instead.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\trace21.ts <seq> <j/i> <t> [--k 4] [--frames f0,f1] [--oracles c19fb]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { dS, pointAt, type Poly } from "../../../src/render/field/geom";

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const [SEQ, KEY, TS] = argv;
const K = Number(opt("k", "4"));
const FR = opt("frames", "");
const ORS = opt("oracles", "c19fb").split(",");
const [JID, CI] = KEY.split("/");
type M = { FieldModel: new (s: FieldScene, p: OracleParams) => FieldModel; cornerRadius: (cr: number, h: number, th: number) => number };
const same = (a: FieldScene, b: FieldScene) => a.chains.every((c, i) => c.pts.length === b.chains[i].pts.length && c.pts.every((v, k) => v === b.chains[i].pts[k]));
const raw = gunzipSync(readFileSync(join(".claude/probes/S3a/seq13", `${SEQ}.jsonl.gz`))).toString("utf8").split("\n");
const frames: FieldScene[] = [];
for (let k = 1; k < raw.length; k++) {
  if (!raw[k]) continue;
  const f = JSON.parse(raw[k]).scene as FieldScene;
  f.look.ctrlArc ??= 0.47;
  if (frames.length && same(frames[frames.length - 1], f)) continue;
  frames.push(f);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lerp = (a: any, b: any, u: number): any => {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x, i) => lerp(x, b[i], u));
  if (a && b && typeof a === "object" && !Array.isArray(a) && typeof b === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(a)) o[k] = k in b ? lerp(a[k], b[k], u) : a[k];
    return o;
  }
  return a;
};
const scenes: [string, FieldScene][] = [];
if (FR) {
  const [f0, f1] = FR.split(",").map(Number);
  for (let f = f0; f <= f1; f++) scenes.push([`f${f}`, frames[f]]);
} else {
  const T = Number(TS);
  for (let s = 0; s <= K; s++) scenes.push([`t${T}+${s}/${K}`, lerp(frames[T], frames[T + 1], s / K) as FieldScene]);
}
const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "inf");
// Local minima of |(x, y) - p(s)| over the arm's window, sampled every h/64,
// reported as (arc length from the root along the arm, distance), in h.
const minima = (p: Poly, root: number, dir: number, win: [number, number], x: number, y: number, h: number): string => {
  const st = h / 64;
  const n = Math.ceil((win[1] - win[0]) / st);
  const ds: number[] = [];
  for (let i = 0; i <= n; i++) {
    const pt = pointAt(p, win[0] + Math.min(i * st, win[1] - win[0]));
    ds.push(Math.hypot(pt.x - x, pt.y - y));
  }
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const l = i > 0 ? ds[i - 1] : Infinity;
    const r = i < n ? ds[i + 1] : Infinity;
    if (ds[i] <= l && ds[i] < r && ds[i] < 6 * h) {
      const s = win[0] + Math.min(i * st, win[1] - win[0]);
      out.push(`${f3((dir * dS(p, root, s)) / h)}:${f3(ds[i] / h)}`);
    }
  }
  return out.join(" ");
};
for (const name of ORS) {
  const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${name}.ts`).replace(/\\/g, "/"))) as M;
  console.log(`== ${name} ${SEQ} j${JID}/${CI}`);
  for (const [lab, s] of scenes) {
    const h = s.look.halfWidth;
    const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883", labelOnly: true } as OracleParams;
    (globalThis as any).__dbgKey = `${s.junctions.findIndex((j) => `${j.id}` === JID)}/${CI}`;
    const fm = new mod.FieldModel(s, p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = fm as any;
    const c = fm.corners.find((x) => `${s.junctions[x.junction].id}` === JID && `${x.index}` === CI);
    if (!c) {
      console.log(`${lab}: no corner`);
      continue;
    }
    const pa = mm.polys[c.a] as Poly;
    const pb = mm.polys[c.b] as Poly;
    const fa = (c.armA.dir * dS(pa, c.armA.s, c.sTA)) / h;
    const fb = (c.armB.dir * dS(pb, c.armB.s, c.sTB)) / h;
    const va = (c.armA.dir * dS(pa, c.armA.s, c.sVA)) / h;
    const vb = (c.armB.dir * dS(pb, c.armB.s, c.sVB)) / h;
    const capA = mm.armCaps?.[c.junction]?.[c.armIdxA ?? -1];
    const capB = mm.armCaps?.[c.junction]?.[c.armIdxB ?? -1];
    console.log(
      `${lab}: r ${f3(c.r / h)} rule ${f3((c.rRule ?? NaN) / h)} th ${((c.theta * 180) / Math.PI).toFixed(2)} arms ${c.armIdxA}/${c.armIdxB} fit ${c.fit ?? "-"} fold ${c.fold === undefined ? "-" : f3((c.fold - h) / h)}` +
        ` | V feet ${f3(va)} ${f3(vb)} | q feet ${f3(fa)} ${f3(fb)} | fmax ${f3((c.footMaxA ?? NaN) / h)} ${f3((c.footMaxB ?? NaN) / h)}` +
        ` | caps ${capA ? f3(capA.len / h) : "?"} ${capB ? f3(capB.len / h) : "?"} | q-V ${f3((c.q[0] - c.V[0]) / h)},${f3((c.q[1] - c.V[1]) / h)}`,
    );
    console.log(`    minima A ${minima(pa, c.armA.s, c.armA.dir, c.winA, c.q[0], c.q[1], h)} | B ${minima(pb, c.armB.s, c.armB.dir, c.winB, c.q[0], c.q[1], h)}`);
  }
}

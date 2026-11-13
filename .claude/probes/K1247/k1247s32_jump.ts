// K1247 s32: drawn-border jumps on the TRUE input. For consecutive frames of a drag (frame(), no snap) the
// largest drawn-border displacement (k1247s32_lib borderDist, device px), where it is (nearest junction), and
// how far the input moved there (that junction's centre). A continuous outline moves its borders by about
// as much as its input; a jump much larger than the input is a discontinuity.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s32_jump.ts <dragDir> [sub=10] [top=12] [from=0] [to=all] [union=1: the drawn image, 0: same chain and side]
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms } from "../../../src/render/outline/outline";
import type { DiagramStructure, OutlineTable } from "../../../src/render/outline/outline";
import { loadDrag, borderDist, borderDistByJ, nearJ } from "./k1247s32_lib";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const sub = +arg("sub", "10"); const top = +arg("top", "12");
const { cap, raw } = loadDrag(dir, sub);
const from = +arg("from", "0"); const to = Math.min(raw.length - 1, +arg("to", String(raw.length - 1)));
const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
const byJ = arg("byj", "0") === "1"; const perJ = new Map<number, { n: number; max: number; f: number; mv: number; key: string }>();
let prev: OutlineTable | null = null; let prevS = raw[from];
const rows: { f: number; d: number; j: number; dj: number; jm: number; key: string; x: number; y: number }[] = [];
const t0 = performance.now();
for (let i = from; i <= to; i++) {
  const s = alignJunctionArms(st, raw[i]); const t = frame(st, s);
  if (prev) {
    const r = borderDist(prev, t, 0.05, arg("union", "1") === "1");
    const nj = nearJ(s, r.x, r.y);
    const jp = prevS.junctions.find((q) => q.id === (nj.id as never)); const jn = s.junctions.find((q) => q.id === (nj.id as never));
    const jm = jp && jn ? Math.hypot(jn.c[0] - jp.c[0], jn.c[1] - jp.c[1]) * px : NaN;
    rows.push({ f: i, d: r.d * px, j: nj.id, dj: nj.d * px, jm, key: r.key, x: r.x, y: r.y });
    if (byJ) for (const [id, o] of borderDistByJ(prev, t, s)) {
      const jp2 = prevS.junctions.find((q) => q.id === (id as never)); const jn2 = s.junctions.find((q) => q.id === (id as never));
      const mv = jp2 && jn2 ? Math.hypot(jn2.c[0] - jp2.c[0], jn2.c[1] - jp2.c[1]) * px : 0;
      const e = perJ.get(id) ?? { n: 0, max: 0, f: -1, mv: 0, key: "" }; const dpx = o.d * px;
      if (dpx > 2 + 3 * mv) e.n++;
      if (dpx - mv > e.max - e.mv) { e.max = dpx; e.f = i; e.mv = mv; e.key = o.key; }
      perJ.set(id, e);
    }
  }
  prev = t; prevS = s;
}
const name = dir.split(/[\\/]/).filter(Boolean).pop();
const ds = rows.map((r) => r.d).sort((a, b) => a - b);
console.log(`${name}: frames ${from}..${to} (sub ${sub}); ${((performance.now() - t0) / 1000).toFixed(1)} s; consecutive drawn-border step px p50 ${ds[ds.length >> 1]?.toFixed(2)} p95 ${ds[Math.floor(0.95 * ds.length)]?.toFixed(2)} max ${ds[ds.length - 1]?.toFixed(2)}`);
rows.sort((a, b) => b.d - a.d);
for (const r of rows.slice(0, top)) console.log(`  f${r.f}: step ${r.d.toFixed(2)} px at (${r.x.toFixed(3)}, ${r.y.toFixed(3)}) chain|side ${r.key}, near j${r.j} (${r.dj.toFixed(1)} px off; it moved ${r.jm.toFixed(2)} px)`);
if (byJ) {
  const L = [...perJ.entries()].filter(([, e]) => e.n > 0).sort((a, b) => (b[1].max - b[1].mv) - (a[1].max - a[1].mv));
  console.log(`junctions with a step > 2 px + 3x their move: ${L.length}`);
  for (const [id, e] of L.slice(0, top)) console.log(`  j${id}: ${e.n} frames; worst f${e.f} step ${e.max.toFixed(2)} px (moved ${e.mv.toFixed(2)}) chain|side ${e.key}`);
}
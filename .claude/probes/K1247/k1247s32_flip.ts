// K1247 s32: corner discontinuities on the TRUE input (frame(), no snap). Replays a captured drag (s18 frames)
// interpolated to sub=N frames per pair, and for every corner records ok/why/theta/V per frame. Reports the
// corners whose V jumps by more than jump= device px between consecutive frames, against how far their
// junction's centre moved (a continuous corner moves V by about as much as its input). focus=<junction id>
// prints that corner's every frame (state changes and V steps).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s32_flip.ts <dragDir> [sub=10] [jump=2] [focus=j83] [out=<json>]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms } from "../../../src/render/outline/outline";
import type { SceneIn, DiagramStructure } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const sub = +arg("sub", "10"); const jump = +arg("jump", "2"); const focus = arg("focus", ""); const out = arg("out", "");
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
const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
type Rec = { ok: boolean; why: string; th: number; vx: number; vy: number; jx: number; jy: number; a: number; b: number };
const recs: Rec[][] = [];
for (let i = 0; i < raw.length; i++) {
  const al = alignJunctionArms(st, raw[i]);
  const t = frame(st, al);
  recs.push(t.corners.map((c) => {
    const j = al.junctions.find((q) => `j${q.id}` === c.junction || String(q.id) === c.junction);
    return { ok: c.ok, why: c.why ?? "", th: c.theta, vx: c.Vx, vy: c.Vy, jx: j ? j.c[0] : NaN, jy: j ? j.c[1] : NaN, a: c.aChain, b: c.bChain };
  }));
}
const t0 = frame(st, alignJunctionArms(st, raw[0]));
const names = t0.corners.map((c) => c.junction);
const name = dir.split(/[\\/]/).filter(Boolean).pop();
console.log(`${name}: ${raw.length} frames (sub ${sub}), corners ${names.length}, px/unit ${px.toFixed(2)}`);
// Per corner: the largest V step over a frame against its junction's move that frame (device px).
const rows: { ci: number; f: number; dv: number; dj: number; from: string; to: string; th: number }[] = [];
for (let ci = 0; ci < names.length; ci++) {
  let best: (typeof rows)[number] | null = null;
  for (let i = 1; i < raw.length; i++) {
    const p = recs[i - 1][ci]; const q = recs[i][ci];
    const dv = Math.hypot(q.vx - p.vx, q.vy - p.vy) * px; const dj = Math.hypot(q.jx - p.jx, q.jy - p.jy) * px;
    const r = { ci, f: i, dv, dj, from: p.ok ? "ok" : p.why, to: q.ok ? "ok" : q.why, th: q.th };
    if (!best || dv - dj > best.dv - best.dj) best = r;
  }
  if (best && best.dv - best.dj > jump) rows.push(best);
}
rows.sort((x, y) => (y.dv - y.dj) - (x.dv - x.dj));
console.log(`corners whose V steps more than its junction by > ${jump} px in one frame: ${rows.length}`);
for (const r of rows.slice(0, 20)) console.log(`  c${r.ci} ${names[r.ci]} ch ${recs[0][r.ci].a}/${recs[0][r.ci].b}: frame ${r.f} V step ${r.dv.toFixed(1)} px, junction ${r.dj.toFixed(2)} px, ${r.from} -> ${r.to}, th ${r.th.toFixed(3)}`);
if (focus) {
  for (let ci = 0; ci < names.length; ci++) {
    if (names[ci] !== focus) continue;
    console.log(`focus ${focus} c${ci} (chains ${recs[0][ci].a}/${recs[0][ci].b}):`);
    let last = "";
    for (let i = 0; i < raw.length; i++) {
      const q = recs[i][ci]; const s = q.ok ? "ok" : q.why;
      const p = i > 0 ? recs[i - 1][ci] : q; const dv = Math.hypot(q.vx - p.vx, q.vy - p.vy) * px;
      if (s !== last || dv > jump) console.log(`  f${i}: ${s} th ${q.th.toFixed(4)} V (${q.vx.toFixed(3)}, ${q.vy.toFixed(3)}) step ${dv.toFixed(2)} px; |V-J| ${(Math.hypot(q.vx - q.jx, q.vy - q.jy) * px).toFixed(1)} px`);
      last = s;
    }
  }
}
if (out) writeFileSync(out, JSON.stringify({ names, rows }));

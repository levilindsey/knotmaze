// Categorise direction-A samples over 1/2 px by piece kind/collapse.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildOutline, type SceneIn } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const name = process.argv[2] ?? "def";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const table = buildOutline(scene);
const fb = new FormB(scene as never, { dpr: 2 });
const ppd = scene.camera.pxPerUnit * 2;
const visibleDink = (x: number, y: number): number => {
  const buf: any[] = [];
  (fb as any).pieces(x, y, buf);
  const surfIds: number[] = [];
  for (const pc of buf) if (!surfIds.includes(pc.surf)) surfIds.push(pc.surf);
  for (const ci of (fb as any).cornersNear(x, y)) { const g = fb.corners[ci].g; if (!surfIds.includes(g)) surfIds.push(g); }
  const entries = surfIds.map((s) => {
    const io = (fb as any).inkOf(s, x, y, buf);
    let key = -Infinity;
    for (const pc of buf) if (pc.surf === s && pc.d < fb.h + fb.aa) key = Math.max(key, pc.key);
    return { io, key };
  }).sort((a, b) => b.key - a.key);
  let T = 1; let best = Infinity;
  for (const e of entries) {
    if (Number.isFinite(e.io.Dexp) && T * e.io.v > 0.05) best = Math.min(best, Math.abs(e.io.Dexp) * ppd);
    T *= 1 - e.io.a;
    if (!(T > 0)) break;
  }
  return best;
};
const cats = new Map<string, number>();
const worst = new Map<string, { d: number; what: string }>();
let total = 0;
for (const p of table.pieces) {
  const collapsed = p.pts.length === 4 && p.pts[0] === p.pts[2] && p.pts[1] === p.pts[3];
  const cat = `${p.kind}${collapsed ? ":collapsed" : ""}`;
  const np = p.pts.length / 2;
  for (let i = 0; i < np; i++) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
    const ev = fb.evalPoint(x, y);
    if (ev.fade !== 0) continue;
    const dDexp = Number.isFinite(ev.Dexp) ? Math.abs(ev.Dexp) * ppd : Infinity;
    const dTerm = ev.term ? Math.abs(ev.term.D) * ppd : Infinity;
    const d = Math.min(visibleDink(x, y), dDexp, dTerm);
    if (!Number.isFinite(d)) continue;
    total++;
    if (d > 0.5) {
      cats.set(cat, (cats.get(cat) ?? 0) + 1);
      const w = worst.get(cat);
      if (!w || d > w.d) worst.set(cat, { d, what: `${p.kind} ch${p.chain} side${p.side} corner${p.corner} s=${p.s0.toFixed(2)} at ${x.toFixed(2)},${y.toFixed(2)}` });
    }
  }
}
console.log(`${name}: total A samples ${total}`);
for (const [k, v] of [...cats.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v} worst ${JSON.stringify(worst.get(k))}`);
console.log(`pieces: total ${table.pieces.length} runs ${table.pieces.filter((p) => p.kind === "run").length} collapsedRuns ${table.pieces.filter((p) => p.kind === "run" && p.pts.length === 4 && p.pts[0] === p.pts[2]).length} arcs ${table.pieces.filter((p) => p.kind === "arc").length} caps ${table.pieces.filter((p) => p.kind === "cap").length}`);

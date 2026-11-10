// K1240 r4 scratch: every tail piece's points scored as s3f_exact's A does.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/_r4_tailA.ts <scene> [all]
import { readFileSync } from "node:fs";
import { structure, frame } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";
const [name, allS] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
scene.look.ctrlArc ??= 0.47;
const st = structure(scene) as any;
const t = frame(st, scene) as any;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const ppd = scene.camera.pxPerUnit * 2;
const visibleDink = (x: number, y: number): number => {
  const buf: any[] = [];
  fb.pieces(x, y, buf);
  const surfIds: number[] = [];
  for (const pc of buf) if (!surfIds.includes(pc.surf)) surfIds.push(pc.surf);
  for (const ci of fb.cornersNear(x, y)) { const g = fb.corners[ci].g; if (!surfIds.includes(g)) surfIds.push(g); }
  const entries = surfIds.map((s) => {
    const io = fb.inkOf(s, x, y, buf);
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
const ids = scene.chains.map((c: any) => c.id);
let nT = 0; let nPts = 0; let bad = 0; let badT = 0;
t.pieces.forEach((p: any) => {
  if (p.kind !== "tail") return;
  nT++;
  const np = p.pts.length / 2;
  if (!np) return;
  nPts += np;
  const c = t.corners[p.corner];
  const row: string[] = []; let pb = 0;
  for (let i = 0; i < np; i++) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
    const ev = fb.evalPoint(x, y);
    const dD = Number.isFinite(ev.Dexp) ? Math.abs(ev.Dexp) * ppd : Infinity;
    const dT = ev.term ? Math.abs(ev.term.D) * ppd : Infinity;
    const d = ev.fade !== 0 ? -1 : Math.min(visibleDink(x, y), dD, dT);
    if (d > 2) pb++;
    row.push(ev.fade !== 0 ? `f${ev.fade}` : d.toFixed(1));
  }
  if (pb) { bad += pb; badT++; }
  if (pb || allS) console.log(`corner${p.corner} ${c?.junction} ch${ids[p.chain]} n=${np} bad=${pb} V(${c?.Vx.toFixed(3)},${c?.Vy.toFixed(3)}) end(${p.pts[2 * np - 2].toFixed(3)},${p.pts[2 * np - 1].toFixed(3)}) | ${row.join(" ")}`);
});
console.log(`${name}: tails ${nT}, with points ${t.pieces.filter((p: any) => p.kind === "tail" && p.pts.length).length}, points ${nPts}, A>2 ${bad} in ${badT} tails`);

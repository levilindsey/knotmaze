// K1240 S3f (Claude): where our outline draws what form B does not.
// Every A sample over 1/2 device px (s3f_exact.ts's own measure: min of
// the visible ink's |Dexp|, |Dexp|, |term.D|; fade excluded), by the
// piece it is on and the diagram stations that delimit it, and the
// junctions and crossings the worst cluster at.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_dbg.ts <scene> [n=12]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const name = process.argv[2] ?? "def";
const nShow = Number(process.argv[3] ?? 12);
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene);
const t = frame(st, scene);
console.log(`pieces ${t.pieces.length} piecesD ${st.piecesD.length}; ${(t.diagnostics ?? []).filter((d: string) => d.startsWith("frame") || d.startsWith("corners")).map((d: string) => d.slice(0, 200)).join("; ")}`);
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
const dOf = (x: number, y: number): number => {
  const ev = fb.evalPoint(x, y);
  if (ev.fade !== 0) return -1;
  const dDexp = Number.isFinite(ev.Dexp) ? Math.abs(ev.Dexp) * ppd : Infinity;
  const dTerm = ev.term ? Math.abs(ev.term.D) * ppd : Infinity;
  return Math.min(visibleDink(x, y), dDexp, dTerm);
};
const nearJ = (x: number, y: number): string => {
  let best = ""; let bd = Infinity;
  scene.junctions.forEach((j, ji) => { const d = Math.hypot(j.c[0] - x, j.c[1] - y); if (d < bd) { bd = d; best = "j" + ji; } });
  scene.crossings.forEach((c: any, xi: number) => { const p = c.p ?? c.c ?? [c.x, c.y]; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = "x" + xi; } });
  return `${best}@${(bd / (st as any).h || bd).toFixed(2)}`;
};
type Hit = { d: number; x: number; y: number; cat: string; desc: string; near: string };
const hits: Hit[] = [];
const cat: Record<string, { samples: number; over2: number }> = {};
t.pieces.forEach((p, i) => {
  const dp = st.piecesD[i];
  let k: string = p.kind; let desc = `${p.kind}#${i} ch${p.chain} side${p.side}`;
  if (dp && dp.kind === "run") {
    const iv = st.intervalsD[dp.interval];
    const A = st.stationsD[iv.aSt]; const B = st.stationsD[iv.bSt];
    const nm = (s: typeof A): string => (s.kind === "junction" ? "j" + st.arms[s.arm].kind[0] : s.kind);
    k = `run ${nm(A)}>${nm(B)}${p.pts.length === 2 ? " (1pt)" : ""}`;
    desc += ` ${A.key}>${B.key}`;
  } else if (dp && dp.kind === "arc") {
    desc += ` corner${dp.corner}`;
  }
  const c = (cat[k] ??= { samples: 0, over2: 0 });
  const np = p.pts.length / 2;
  for (let q = 0; q < np; q++) {
    const cand: [number, number][] = [[p.pts[2 * q], p.pts[2 * q + 1]]];
    if (q + 1 < np) {
      const mx = (p.pts[2 * q] + p.pts[2 * q + 2]) / 2; const my = (p.pts[2 * q + 1] + p.pts[2 * q + 3]) / 2;
      if (Math.hypot(p.pts[2 * q + 2] - p.pts[2 * q], p.pts[2 * q + 3] - p.pts[2 * q + 1]) * ppd > 4) cand.push([mx, my]);
    }
    for (const [x, y] of cand) {
      const d = dOf(x, y);
      if (d < 0 || !Number.isFinite(d)) continue;
      c.samples++;
      if (d > 0.5) { c.over2++; hits.push({ d, x, y, cat: k, desc, near: nearJ(x, y) }); }
    }
  }
});
console.log(`A over 1/2 px: ${hits.length}`);
for (const [k, v] of Object.entries(cat).sort((a, b) => b[1].over2 - a[1].over2)) if (v.over2) console.log(`  ${k.padEnd(26)} samples ${String(v.samples).padStart(6)} over2 ${v.over2}`);
// Clusters: by the nearest junction or crossing.
const byNear = new Map<string, Hit[]>();
for (const h of hits) { const key = h.near.split("@")[0]; (byNear.get(key) ?? byNear.set(key, []).get(key)!).push(h); }
const cl = [...byNear.entries()].map(([key, hs]) => ({ key, n: hs.length, max: Math.max(...hs.map((q) => q.d)), hs })).sort((a, b) => b.max * Math.sqrt(b.n) - a.max * Math.sqrt(a.n));
console.log(`clusters ${cl.length}; worst:`);
for (const c of cl.slice(0, nShow)) {
  const w = c.hs.reduce((a, b) => (b.d > a.d ? b : a));
  const pieces = [...new Set(c.hs.map((q) => q.desc))].slice(0, 4).join(" | ");
  console.log(`  ${c.key} n=${c.n} max ${c.max.toFixed(1)} at (${w.x.toFixed(3)},${w.y.toFixed(3)}) ${w.near}: ${pieces}`);
}

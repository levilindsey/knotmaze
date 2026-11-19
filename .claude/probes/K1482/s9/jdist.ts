// K1482 s9: per crossing, where the pixels gf's gap removes (rmall.py) sit against the fused joints: for each removed
// pixel, its world distance to the nearest joint POINT (any chain), and the arc from the over chain's nearest point
// to that chain's nearest joint (same side as the pixel). One line per crossing with removed pixels.
//   node scripts/run_node.mjs jdist.ts <gw_gf.json> <sites.json> <rmall.json> [crossing,...]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , gp, sp, rp, list] = process.argv;
const SRC = resolve(import.meta.dirname, "../../../..");
const PM = await import(pathToFileURL(join(SRC, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const G = dec(JSON.parse(readFileSync(gp, "utf8"))); const A = JSON.parse(readFileSync(sp, "utf8")).toDevA;
const RM = JSON.parse(readFileSync(rp, "utf8")); const D = G.kd, Gm = D.geom;
const geo = (ch: number) => { const c = G.kcv[ch]; return { closed: c.closed, total: Gm[c.geom * 4], arcPer: Gm[c.geom * 4 + 1] }; };
const det = A[0] * A[3] - A[1] * A[2];
const toW = (x: number, y: number) => { const X = x - A[4], Y = y - A[5]; return [(A[3] * X - A[2] * Y) / det, (-A[1] * X + A[0] * Y) / det]; };
const near = (ch: number, wx: number, wy: number) => {
  const sm = G.chainSamples[ch]; const g = geo(ch); let bd = Infinity, ba = 0; const P = sm.positions; const n = sm.count; const m = g.closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n; const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * j], by = P[2 * j + 1]; const vx = bx - ax, vy = by - ay;
    const L2 = vx * vx + vy * vy || 1e-12; let t = ((wx - ax) * vx + (wy - ay) * vy) / L2; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(ax + vx * t - wx, ay + vy * t - wy); if (d < bd) { bd = d; ba = (i + t) * g.arcPer; }
  }
  return [bd, ba];
};
const posAt = (ch: number, a: number) => { const sm = G.chainSamples[ch]; const g = geo(ch); const f = a / g.arcPer; let i = Math.floor(f); const t = f - i; const n = sm.count; const P = sm.positions; i = g.closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i)); const j = g.closed ? (i + 1) % n : Math.min(n - 1, i + 1); return [P[2 * i] + (P[2 * j] - P[2 * i]) * t, P[2 * i + 1] + (P[2 * j + 1] - P[2 * i + 1]) * t]; };
const wrap = (ch: number, d: number) => { const g = geo(ch); if (g.closed) { d = ((d % g.total) + g.total) % g.total; if (d > g.total / 2) d -= g.total; } return d; };
const jArcs = (ch: number) => (G.junctionArcCtrls?.get(ch) ?? []).map((j: any) => PM.kArcOfCtrl(D, G.kcv[ch], j.ctrl));
const JP: number[][] = [];
for (const ch of G.junctionArcCtrls?.keys?.() ?? []) for (const a of jArcs(ch)) JP.push(posAt(ch, a));
const ids = list ? list.split(",") : Object.keys(RM);
for (const id of ids) {
  const px = RM[id]; if (!px || !px.length) continue; const x = G.crossings[+id];
  const oA = PM.kArcOfCtrl(D, G.kcv[x.overChain], x.overCtrl); const oj = jArcs(x.overChain);
  const dJ: number[] = [], aJ: number[] = [];
  for (const [X, Y] of px) {
    const [wx, wy] = toW(X + 0.5, Y + 0.5);
    dJ.push(Math.min(...JP.map(([jx, jy]) => Math.hypot(jx - wx, jy - wy))));
    const [, aO] = near(x.overChain, wx, wy);
    aJ.push(oj.length ? Math.min(...oj.map((ja: number) => Math.abs(wrap(x.overChain, ja - aO)))) : 99);
  }
  // d3: the room from the pixel to a THIRD thread's silhouette edge (any chain but the crossing's two, plus the over
  // chain past its nearest joint, on that joint's side): where the under's outline next meets another outline.
  const d3: number[] = [];
  const jo = oj.length ? oj.map((ja: number) => wrap(x.overChain, ja - oA)).sort((a: number, b: number) => Math.abs(a) - Math.abs(b))[0] : NaN;
  for (const [X, Y] of px) {
    const [wx, wy] = toW(X + 0.5, Y + 0.5); let best = Infinity;
    for (let ch = 0; ch < G.chainSamples.length; ch++) {
      if (!G.chainSamples[ch] || ch === x.underChain) continue;
      const sm = G.chainSamples[ch]; const g = geo(ch); const P = sm.positions;
      for (let i = 0; i < sm.count; i++) {
        if (ch === x.overChain) { const off = wrap(ch, i * g.arcPer - oA); if (!(Number.isFinite(jo) && Math.sign(off) === Math.sign(jo) && Math.abs(off) > Math.abs(jo))) continue; }
        const d = Math.hypot(P[2 * i] - wx, P[2 * i + 1] - wy); if (d < best) best = d;
      }
    }
    d3.push(best - 0.4);
  }
  const s = (v: number[]) => [...v].sort((a, b) => a - b);
  const q = (v: number[], f: number) => s(v)[Math.floor(f * (v.length - 1))];
  console.log(`x${id} n ${px.length} dJ min ${q(dJ, 0).toFixed(2)} med ${q(dJ, 0.5).toFixed(2)} | over-arc to its joint min ${q(aJ, 0).toFixed(2)} med ${q(aJ, 0.5).toFixed(2)} | n(dJ<0.9) ${dJ.filter((v) => v < 0.9).length} | d3 min ${q(d3, 0).toFixed(2)} med ${q(d3, 0.5).toFixed(2)} n(d3<0.35) ${d3.filter((v) => v < 0.35).length}`);
}

// K1482 s37: the CPU mirror's whole-maze census of what the rule changes. The rule touches only a corner's arc and
// its two tangent discs, so per fillet corner (not a through arc) every device px within W + 2 aa of its circle or
// of a tangent point is evaluated with GfEval.S37 = "0" (K1407 c1's burial) and "" (the rule); px whose border ink
// differs by more than 0.02 are grouped (8 px linking) and each group printed with its px lost / gained, the largest
// change, the nearest corner and the nearest named site. 1 sample per px; the mirror has no gap cuts.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s37/census37.ts <scene.json> <sites.json> [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, outP] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const W = T.W;
const E: any = new GfEval(T); const reach = (W + 2 * T.aa) * a;
const seen = new Map<number, number>(); const KEY = 8192; let nEval = 0, nCorner = 0;
const visit = (X: number, Y: number): void => {
  const key = Y * KEY + X; if (seen.has(key)) return;
  const fx = (X + 0.5 - e) / a, fy = (Y + 0.5 - f) / d;
  GfEval.S37 = "0"; const i0 = E.eval(fx, fy).ink; GfEval.S37 = ""; const i1 = E.eval(fx, fy).ink; nEval++;
  seen.set(key, i1 - i0);
};
for (let k = 0; k < T.kR.length; k++) {
  if (T.kThru[k] || !Number.isFinite(T.kTax[k])) continue; nCorner++;
  const cx = T.kCx[k] * a + e, cy = T.kCy[k] * d + f, R = T.kR[k] * a;
  // the ring round the circle (the arc's band) and the two tangent discs
  const x0 = Math.floor(cx - R - reach), x1 = Math.ceil(cx + R + reach), y0 = Math.floor(cy - R - reach), y1 = Math.ceil(cy + R + reach);
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { const rr = Math.hypot(X + 0.5 - cx, Y + 0.5 - cy); if (Math.abs(rr - R) <= reach) visit(X, Y); }
  for (const [tx, ty] of [[T.kTax[k] * a + e, T.kTay[k] * d + f], [T.kTbx[k] * a + e, T.kTby[k] * d + f]])
    for (let Y = Math.floor(ty - reach); Y <= Math.ceil(ty + reach); Y++) for (let X = Math.floor(tx - reach); X <= Math.ceil(tx + reach); X++) visit(X, Y);
}
GfEval.S37 = "";
const ch: { x: number; y: number; dv: number; g: number }[] = [];
for (const [key, dv] of seen) if (Math.abs(dv) > 0.02) ch.push({ x: key % KEY, y: Math.floor(key / KEY), dv, g: -1 });
// group: union changed px within 8 px (grid buckets)
const B = 8; const bk = new Map<string, number[]>();
ch.forEach((p, i) => { const s = `${Math.floor(p.x / B)},${Math.floor(p.y / B)}`; (bk.get(s) ?? bk.set(s, []).get(s)!).push(i); });
let ng = 0;
for (let i = 0; i < ch.length; i++) {
  if (ch[i].g >= 0) continue; const st = [i]; ch[i].g = ng;
  while (st.length) { const j = st.pop()!; const bx = Math.floor(ch[j].x / B), by = Math.floor(ch[j].y / B);
    for (let yy = by - 1; yy <= by + 1; yy++) for (let xx = bx - 1; xx <= bx + 1; xx++) for (const m of bk.get(`${xx},${yy}`) ?? []) if (ch[m].g < 0 && Math.hypot(ch[m].x - ch[j].x, ch[m].y - ch[j].y) <= B) { ch[m].g = ng; st.push(m); } }
  ng++;
}
const groups = Array.from({ length: ng }, () => ({ lost: 0, gained: 0, sx: 0, sy: 0, n: 0, max: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 }));
for (const p of ch) { const g = groups[p.g]; if (p.dv < 0) g.lost++; else g.gained++; g.sx += p.x; g.sy += p.y; g.n++; if (Math.abs(p.dv) > g.max) g.max = Math.abs(p.dv); g.x0 = Math.min(g.x0, p.x); g.y0 = Math.min(g.y0, p.y); g.x1 = Math.max(g.x1, p.x); g.y1 = Math.max(g.y1, p.y); }
const sites: any[] = SJ.sites ?? [];
const out = groups.map((g) => {
  const x = g.sx / g.n, y = g.sy / g.n; let bk2 = -1, bd = Infinity, bt = "";
  for (let k = 0; k < T.kR.length; k++) { if (T.kThru[k] || !Number.isFinite(T.kTax[k])) continue;
    for (const [t, tx, ty] of [["a", T.kTax[k], T.kTay[k]], ["b", T.kTbx[k], T.kTby[k]]] as [string, number, number][]) { const dd = Math.hypot(tx * a + e - x, ty * d + f - y); if (dd < bd) { bd = dd; bk2 = k; bt = t; } } }
  let sn = "", sd = Infinity; for (const s of sites) { const dd = Math.hypot(s.x - x, s.y - y); if (dd < sd) { sd = dd; sn = s.site; } }
  return { x: Math.round(x), y: Math.round(y), lost: g.lost, gained: g.gained, max: +g.max.toFixed(2), box: [g.x0, g.y0, g.x1, g.y1], k: `k${bk2}.${bt}`, kDist: +bd.toFixed(1), j: T.kJ[bk2], arms: `${T.kCa[bk2]}/${T.kCb[bk2]}`, Rh: +(T.kR[bk2] / T.h).toFixed(3), site: sn, siteDist: +sd.toFixed(0) };
}).sort((p, q) => q.lost + q.gained - p.lost - p.gained);
const tl = out.reduce((s, g) => s + g.lost, 0), tg = out.reduce((s, g) => s + g.gained, 0);
console.log(`${nCorner} fillet corners, ${nEval} px evaluated twice; changed ${ch.length} px (lost ${tl}, gained ${tg}) in ${out.length} places`);
for (const g of out) console.log(`@${g.x},${g.y} lost ${g.lost} gained ${g.gained} max ${g.max} ${g.k} (${g.kDist} px) j${g.j} arms ${g.arms} R ${g.Rh} h; site ${g.site} (${g.siteDist} px)`);
if (outP) writeFileSync(outP, JSON.stringify({ corners: nCorner, changed: ch.length, lost: tl, gained: tg, places: out }, null, 1));

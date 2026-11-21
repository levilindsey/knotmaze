// K1482 s41: where the crease round join (eval.ts cornerS, GfEval.S41) changes the mirror's ink on a whole frame.
// A coarse pass (every STEP px, default 2) finds px where cornerS returns > 0; every px within PAD (default 12) of one
// is evaluated with S41 "0" (the start) and "" (the rule); a px counts when its ink moves by more than 0.02. Changed px
// are grouped (8 px linking); each place prints its centre, px lost / gained, the largest change, its box and the
// nearest site.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s41/census41.ts <scene.json> <sites.json> [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, outP] = process.argv;
const STEP = +(process.env.STEP ?? 2), PAD = +(process.env.PAD ?? 12), FW = +(process.env.FW ?? 3200), FH = +(process.env.FH ?? 1800);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const E: any = new GfEval(T); const orig = E.cornerS.bind(E); let hit = false;
E.cornerS = (...args: number[]): number => { const s = orig(...args); if (s > 0) hit = true; return s; };
const t0 = Date.now(); const hits: number[] = []; let nEval = 0;
GfEval.S41 = "";
for (let Y = 0; Y < FH; Y += STEP) for (let X = 0; X < FW; X += STEP) { hit = false; E.eval((X + 0.5 - e) / a, (Y + 0.5 - f) / d); nEval++; if (hit) hits.push(X, Y); }
const tc = Date.now() - t0;
const KEY = 8192; const seen = new Set<number>(); const ch: { x: number; y: number; dv: number; g: number }[] = [];
for (let i = 0; i < hits.length; i += 2) {
  for (let Y = Math.max(0, hits[i + 1] - PAD); Y <= Math.min(FH - 1, hits[i + 1] + PAD); Y++) for (let X = Math.max(0, hits[i] - PAD); X <= Math.min(FW - 1, hits[i] + PAD); X++) {
    const key = Y * KEY + X; if (seen.has(key)) continue; seen.add(key);
    const fx = (X + 0.5 - e) / a, fy = (Y + 0.5 - f) / d;
    GfEval.S41 = "0"; const i0 = E.eval(fx, fy).ink; GfEval.S41 = ""; const i1 = E.eval(fx, fy).ink; nEval += 2;
    if (Math.abs(i1 - i0) > 0.02) ch.push({ x: X, y: Y, dv: i1 - i0, g: -1 });
  }
}
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
for (const p of ch) { const g = groups[p.g]; if (p.dv < 0) g.lost++; else g.gained++; g.sx += p.x; g.sy += p.y; g.n++; if (Math.abs(p.dv) > Math.abs(g.max)) g.max = p.dv; g.x0 = Math.min(g.x0, p.x); g.y0 = Math.min(g.y0, p.y); g.x1 = Math.max(g.x1, p.x); g.y1 = Math.max(g.y1, p.y); }
const sites: any[] = SJ.sites ?? [];
const out = groups.map((g) => {
  const x = g.sx / g.n, y = g.sy / g.n; let sn = "", sd = Infinity; for (const s of sites) { const dd = Math.hypot(s.x - x, s.y - y); if (dd < sd) { sd = dd; sn = s.site; } }
  return { x: Math.round(x), y: Math.round(y), px: g.n, lost: g.lost, gained: g.gained, max: +g.max.toFixed(2), box: [g.x0, g.y0, g.x1, g.y1], site: sn, siteDist: +sd.toFixed(1) };
}).sort((p, q) => q.px - p.px);
console.log(`coarse ${FW}x${FH} step ${STEP}: ${hits.length / 2} cornerS hits in ${(tc / 1000).toFixed(1)} s; ${nEval} evals in ${((Date.now() - t0) / 1000).toFixed(1)} s; changed ${ch.length} px in ${out.length} places`);
for (const g of out) console.log(`@${g.x},${g.y} px ${g.px} lost ${g.lost} gained ${g.gained} max ${g.max} box ${g.box.join(",")} site ${g.site} (${g.siteDist} px)`);
if (outP) writeFileSync(outP, JSON.stringify({ hits: hits.length / 2, changed: ch.length, places: out }, null, 1));

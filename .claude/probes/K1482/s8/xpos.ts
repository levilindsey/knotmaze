// K1482 s8: every registered crossing's under point in device px, its distance to the nearest fused joint (arc, on
// either pass) and to the nearest site, for picking ordinary crossings.
//   node scripts/run_node.mjs xpos.ts <gw_gf.json> <sites.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , gp, sp, op] = process.argv;
const SRC = resolve(import.meta.dirname, "../../../..");
const PM = await import(pathToFileURL(join(SRC, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const G = dec(JSON.parse(readFileSync(gp, "utf8")));
const S = JSON.parse(readFileSync(sp, "utf8")); const A = S.toDevA;
const D = G.kd, Gm = D.geom;
const geo = (ch: number) => { const c = G.kcv[ch]; return { closed: c.closed, total: Gm[c.geom * 4], arcPer: Gm[c.geom * 4 + 1] }; };
const toD = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
const ptAt = (ch: number, a: number) => { const sm = G.chainSamples[ch]; const g = geo(ch); const fi = Math.max(0, Math.min(sm.count - 1, a / g.arcPer)); const i0 = Math.floor(fi), i1 = Math.min(i0 + 1, sm.count - 1), u = fi - i0; const P = sm.positions; return toD(P[2 * i0] * (1 - u) + P[2 * i1] * u, P[2 * i0 + 1] * (1 - u) + P[2 * i1 + 1] * u); };
const jd = (ch: number, a: number) => { let best = Infinity; const l = G.junctionArcCtrls?.get(ch); const g = geo(ch); if (l) for (const j of l) { let d = Math.abs(PM.kArcOfCtrl(D, G.kcv[ch], j.ctrl) - a); if (g.closed) d = Math.min(d, g.total - d); best = Math.min(best, d); } return best; };
const out: any[] = [];
G.crossings.forEach((x: any, i: number) => {
  const uA = PM.kArcOfCtrl(D, G.kcv[x.underChain], x.underCtrl), oA = PM.kArcOfCtrl(D, G.kcv[x.overChain], x.overCtrl);
  const [px, py] = ptAt(x.underChain, uA);
  let sd = Infinity, sn = ""; for (const s of S.sites) { const d = Math.hypot(s.x - px, s.y - py); if (d < sd) { sd = d; sn = s.site; } }
  out.push({ i, o: x.overChain, u: x.underChain, x: Math.round(px), y: Math.round(py), joint: +Math.min(jd(x.underChain, uA), jd(x.overChain, oA)).toFixed(2), site: sn, sd: Math.round(sd) });
});
writeFileSync(op, JSON.stringify(out));
console.log(out.length, "crossings ->", op);

// K1407 c3: where composite's tie swap moves ink (|r - unswapped| > 0.2) in a crop: count, box, and per pair of
// surfaces (top, lower) the pixel count and one sample pixel, with both surfaces' chains and members.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_swap.ts <scene> <x> <y> [R px=480]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, Rs] = process.argv.slice(2);
const X = +xs, Y = +ys; const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any;
const h = T.h, P = 480, ppu = P / (2.5 * h); const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const R = Rs ? +Rs : 480;
const C0 = E.composite.bind(E); let info = "";
E.composite = (): number => {
  const r = C0(); const ns = E.ns; info = "";
  // unswapped
  let Tt = 1, ink = 0; for (let i = 0; i < ns; i++) { const e = E.sord[i]; ink += Tt * E.sv[e]; Tt *= 1 - E.sa[e]; if (!(Tt > 0)) break; }
  const u = Math.min(1, ink);
  if (Math.abs(r - u) > 0.2) {
    for (let i = 0; i + 1 < ns; i++) { const a = E.sord[i], b = E.sord[i + 1]; const gap = E.skey[a] - E.skey[b]; if (gap < T.zt) { info = `${E.sid[a]}(v${E.sv[a].toFixed(2)} a${E.sa[a].toFixed(2)})>${E.sid[b]}(v${E.sv[b].toFixed(2)} a${E.sa[b].toFixed(2)}) gap ${gap.toFixed(3)} u ${u.toFixed(2)} r ${r.toFixed(2)}`; break; } }
    const mem: string[] = []; for (let j = 0; j < E.np; j++) mem.push(`c${E.pc[j]}:${E.psurf[j]}`); info += ` | ${mem.join(" ")}`;
  }
  return r;
};
const byPair = new Map<string, { n: number; ex: string; c0: number; c1: number; r0: number; r1: number }>();
for (let r = 0; r < P; r += 2) for (let c = 0; c < P; c += 2) {
  if ((c - 240) ** 2 + (r - 240) ** 2 > R * R) continue;
  const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu; info = ""; E.eval(x, y);
  if (!info) continue; const key = info.split(" gap")[0].replace(/\(v[^)]*\)/g, "");
  const o = byPair.get(key); if (o) { o.n++; o.c0 = Math.min(o.c0, c); o.c1 = Math.max(o.c1, c); o.r0 = Math.min(o.r0, r); o.r1 = Math.max(o.r1, r); } else byPair.set(key, { n: 1, ex: `${c}:${r} ${info}`, c0: c, c1: c, r0: r, r1: r });
}
for (const [k, o] of byPair) console.log(`${k}  n ${o.n * 4}  box c${o.c0}-${o.c1} r${o.r0}-${o.r1}  e.g. ${o.ex}`);

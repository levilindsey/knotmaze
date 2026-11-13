// K1325 s1: measure (1) each crossing pass's overlap reach (oracle.ts passReach) against form B's depth window,
// (2) form B's "no V" corners and a marched seed's V. node scripts/run_node.mjs .claude/probes/K1325/k1325_survey.ts [scenes...]
import { buildModel } from "../K1314/k1314_census";
import { FormB } from "../../../src/render/field/form_b";
import { candidates, dS, normS, pointAt, type Cand } from "../../../src/render/field/geom";
const SC = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const scenes = SC.length ? SC : ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any;
export function passReach(F: A, pa: number, s: number, pb: number, ob: number, dir: number): number {
  const h = F.h; const step = h / 8; const maxR = 10 * h; const P = F.polys[pa]; const Q = F.polys[pb]; const cs: Cand[] = []; let last = -1;
  for (let d = 0; d <= maxR + 1e-9; d += step) {
    const raw = s + dir * d; if (!P.closed && (raw < P.s0 || raw > P.s0 + P.len)) break;
    const u = normS(P, raw); const at = pointAt(P, u); let hit = false;
    for (let k = -4; k <= 4 && !hit; k++) {
      const t = (k / 4) * h * 0.999; candidates(F.grid, at.x - at.ty * t, at.y + at.tx * t, h, cs, pb);
      for (const c of cs) { if (c.chain !== pb || !(c.d < h)) continue; if (Math.abs(dS(Q, c.s, ob)) > maxR + 2 * h) continue; if (pa === pb && Math.abs(dS(P, c.s, u)) <= Math.abs(dS(P, c.s, ob))) continue; hit = true; break; }
    }
    if (!hit) break; last = d;
  }
  return last < 0 ? 0 : last + step;
}
for (const nm of scenes) {
  const m = buildModel(nm); const F = new FormB(JSON.parse(JSON.stringify(m.scene)), { dpr: 2 }) as A; const win = F.depthWin;
  const rows: string[] = []; const hist = [0, 0, 0, 0];
  m.scene.crossings.forEach((x: A, xi: number) => {
    const ia = F.idxOf.get(x.a.chain); const ib = F.idxOf.get(x.b.chain); if (ia === undefined || ib === undefined) return;
    const pa = F.passes[ia].find((p: A) => p.qi === ib && Math.abs(p.sq - normS(F.polys[ib], x.b.s)) < 1e-9); if (!pa) return;
    const r = [passReach(F, ia, pa.s, ib, pa.sq, -1), passReach(F, ia, pa.s, ib, pa.sq, 1), passReach(F, ib, pa.sq, ia, pa.s, -1), passReach(F, ib, pa.sq, ia, pa.s, 1)];
    const q = Math.max(...r) / win; hist[q > 1.5 ? 3 : q > 1 ? 2 : q > 0.7 ? 1 : 0]++;
    if (q > 0.7) rows.push(`  x${xi} (${m.xPts[xi].x.toFixed(2)}, ${m.xPts[xi].y.toFixed(2)}) th ${pa.theta.toFixed(2)} reach ${r.map((v) => v.toFixed(2)).join(",")} /win ${q.toFixed(2)}`);
  });
  const noV = (F.diagnostics as string[]).filter((d) => d.includes("no V"));
  console.log(`${nm} h ${F.h} win ${win.toFixed(3)} reach/win <=.7 ${hist[0]} .7-1 ${hist[1]} 1-1.5 ${hist[2]} >1.5 ${hist[3]}; noV ${noV.length}: ${noV.join("; ")}`);
  if (process.argv.includes("--rows")) for (const r of rows) console.log(r);
}

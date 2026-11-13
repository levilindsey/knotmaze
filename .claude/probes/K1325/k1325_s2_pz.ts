// K1325 s2: the plateau reference gated to self-crossings (a chain crossing itself), per crossing: the census pixels
// it moves against plain form B (|ink diff| > --d) and how far each reference sits from rp=outline there.
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_s2_pz.ts [scene,...] [--ppu=80] [--d=0.25] [--all]
// --all gates every flagged crossing (s1's --plateau) for comparison. A prototype of k1314_census.ts plateauOf's gate.
import { buildModel, plainOf, passReach, rasterOutline, type Model } from "../K1314/k1314_census";
import { FormB } from "../../../src/render/field/form_b";
import { normS, zAt, type Poly } from "../../../src/render/field/geom";
import { plateauDepth } from "../../../src/render/field/depth";

type FBZ = {
  evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number };
  h: number; W: number; depthWin: number; polys: Poly[]; idxOf: Map<number, number>;
  depthChains: { pins: { s: number; z: number; rL?: number; rR?: number }[] }[];
  corners: { a: number; b: number; sA: number; sB: number; zA: number; zB: number }[]; arms: { pi: number }[];
};
export type XPZ = { F: FBZ; xs: number[]; pts: Map<number, number[]>; R: number };
/** Plateau form B at the gated crossings; pts per crossing: the samples whose z it changed (x, y pairs). */
export function selfPlateau(m: Model, keep: (xi: number, self: boolean) => boolean, cap = Infinity): XPZ {
  const F = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as FBZ;
  const win = F.depthWin; const xs: number[] = []; const owner = new Map<number, Set<number>>();
  (m.scene.crossings as { a: { chain: number; s: number }; b: { chain: number; s: number } }[]).forEach((x, xi) => {
    if (!keep(xi, x.a.chain === x.b.chain)) return;
    const ia = F.idxOf.get(x.a.chain); const ib = F.idxOf.get(x.b.chain); if (ia === undefined || ib === undefined) return;
    const sa = normS(F.polys[ia], x.a.s); const sb = normS(F.polys[ib], x.b.s);
    const r = [passReach(F as never, ia, sa, ib, sb, -1), passReach(F as never, ia, sa, ib, sb, 1), passReach(F as never, ib, sb, ia, sa, -1), passReach(F as never, ib, sb, ia, sa, 1)];
    if (!(Math.max(...r) > win)) return;
    const pa = F.depthChains[ia].pins.find((q) => q.s === sa); const pb = F.depthChains[ib].pins.find((q) => q.s === sb && q !== pa);
    if (!pa || !pb) return;
    pa.rL = r[0]; pa.rR = r[1]; pb.rL = r[2]; pb.rR = r[3]; xs.push(xi);
    for (const i of [ia, ib]) { const o = owner.get(i) ?? new Set<number>(); o.add(xi); owner.set(i, o); }
  });
  const pts = new Map<number, number[]>();
  for (const [i] of owner) {
    const p = F.polys[i];
    for (let k = 0; k < p.n; k++) {
      const z0 = p.z[k]; const zp = plateauDepth(F.depthChains[i] as never, win, p.s[k], win); const zc = cap * (F as never as { zt: number }).zt;
      const z = z0 + Math.max(-zc, Math.min(zc, zp - z0));
      if (z === p.z[k]) continue;
      p.z[k] = z;
      let best = -1; let bd = Infinity; // the nearest gated crossing owns the sample
      for (const xi of owner.get(i)!) { const q = m.xPts[xi]; const d = (q.x - p.x[k]) ** 2 + (q.y - p.y[k]) ** 2; if (d < bd) { bd = d; best = xi; } }
      const l = pts.get(best) ?? []; l.push(p.x[k], p.y[k]); pts.set(best, l);
    }
  }
  for (const c of F.corners) { c.zA = zAt(F.polys[F.arms[c.a].pi], c.sA); c.zB = zAt(F.polys[F.arms[c.b].pi], c.sB); }
  return { F, xs, pts, R: 2.5 * F.h + F.W };
}

if (process.argv[1]?.includes("k1325_s2_pz")) {
  const args = process.argv.slice(2);
  const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const ppu = Number(opt("ppu") ?? 80); const D = Number(opt("d") ?? 0.25); const sc = (160 / ppu) ** 2;
  const ALLX = args.includes("--all"); const CAP = Number(opt("cap") ?? Infinity); const cl = (v: number): number => Math.min(1, Math.max(0, v));
  for (const nm of (args.find((a) => !a.startsWith("--")) ?? "muse_hash,g41_ring_tw64,g41_def_tw64,ring,g41_user_tw64").split(",")) {
    const m = buildModel(nm); const P = selfPlateau(m, (_, self) => ALLX || self, CAP); const pl = plainOf(m); const done = new Set<string>();
    const rows: string[] = []; let tm = 0;
    for (const xi of P.xs) {
      const l = P.pts.get(xi) ?? []; if (!l.length) { rows.push(`x${xi} no z change`); continue; }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < l.length; i += 2) { x0 = Math.min(x0, l[i]); x1 = Math.max(x1, l[i]); y0 = Math.min(y0, l[i + 1]); y1 = Math.max(y1, l[i + 1]); }
      const c0 = Math.floor((x0 - P.R) * ppu); const r0 = Math.floor((y0 - P.R) * ppu); const Wd = Math.ceil((x1 - x0 + 2 * P.R) * ppu); const Hd = Math.ceil((y1 - y0 + 2 * P.R) * ppu);
      const O = rasterOutline(m, c0, r0, Wd, Hd, ppu); let mv = 0; let bp = 0; let bz = 0;
      for (let r = 0; r < Hd; r++) for (let c = 0; c < Wd; c++) {
        const key = `${c0 + c},${r0 + r}`; if (done.has(key)) continue;
        const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu; let near = false;
        for (let i = 0; i < l.length && !near; i += 2) near = (l[i] - x) ** 2 + (l[i + 1] - y) ** 2 < P.R * P.R;
        if (!near) continue; done.add(key);
        const a = cl(pl.evalPoint(x, y).ink); const b = cl(P.F.evalPoint(x, y).ink); const o = cl(O.ink[r * Wd + c]);
        if (Math.abs(a - b) > D) mv++;
        if (Math.abs(a - o) > D) bp++;
        if (Math.abs(b - o) > D) bz++;
      }
      tm += mv; const q = m.xPts[xi]; const x = m.scene.crossings[xi] as { a: { chain: number; s: number }; b: { chain: number; s: number } };
      rows.push(`x${xi} c${x.a.chain}${x.a.chain === x.b.chain ? "" : "/c" + x.b.chain} (${q.x.toFixed(2)}, ${q.y.toFixed(2)}) moved ${Math.round(mv * sc)} off-outline plain ${Math.round(bp * sc)} -> ${Math.round(bz * sc)}${bz > bp ? " WORSE" : ""}`);
    }
    console.log(`${nm}: gated ${P.xs.length}, reference moved ${Math.round(tm * sc)} px`);
    for (const r of rows) console.log("  " + r);
  }
}

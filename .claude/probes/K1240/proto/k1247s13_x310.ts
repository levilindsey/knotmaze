// K1247 s13: one union move, opened up. Rebuilds k1247s9_union's two frames (still or --cyc,
// then the seeded jitter) and, for one piece index, prints its s0/s1, ends and worst drawn
// point both ways, the cuts on its chain and side near it, and its chain's slots whose cS or
// L/R refs changed between the frames.
// Usage: node scripts/run_node.mjs <this> <scene> <cyc|-> <jitter px> <piece index> [ds window=0.6]
import type { SceneIn } from "./outline";
import { structure, frame, debugCache, candDbg } from "./outline";
import { load } from "./k1247s5_scenes";
const [nm, cycS, jS, piS, wS] = process.argv.slice(2);
const pi = +piS; const win = +(wS ?? 0.6);
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const s0 = load(nm);
const still = cycS !== "-" ? perturbT(s0, ((+cycS <= 20 ? +cycS : 40 - +cycS) / 20) * 0.5 * s0.look.halfWidth) : s0; const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * +jS) / S / Math.SQRT2;
const stA = structure(still); const stB = structure(sc);
const XI = process.env.X_XI !== undefined && process.env.X_XI !== "" ? +process.env.X_XI : -1;
candDbg.xi = XI; candDbg.rows = [];
const A = frame(stA, still) as any; const candA = candDbg.rows; candDbg.rows = [];
const B = frame(stB, sc) as any; const candB = candDbg.rows; candDbg.xi = -1;
const pa = A.pieces[pi]; const pb = B.pieces[pi];
const f = (v: number): string => v.toFixed(5);
const ends = (p: any): string => `n${p.pts.length / 2} (${f(p.pts[0])},${f(p.pts[1])})..(${f(p.pts[p.pts.length - 2])},${f(p.pts[p.pts.length - 1])})`;
console.log(`piece ${pi}: ${pa.kind}/${pa.chain}/${pa.side}/${pa.corner}/${pa.region}`);
console.log(`  A s ${f(pa.s0)}..${f(pa.s1)} ${ends(pa)}`);
console.log(`  B s ${f(pb.s0)}..${f(pb.s1)} ${ends(pb)}  (ds0 ${((pb.s0 - pa.s0) * S).toFixed(3)} px-units, ds1 ${((pb.s1 - pa.s1) * S).toFixed(3)})`);
const segD = (q: number[], x: number, y: number): number => {
  let best = Infinity;
  for (let i = 0; i + 3 < q.length; i += 2) { const ax = q[i]; const ay = q[i + 1]; const ex = q[i + 2] - ax; const ey = q[i + 3] - ay; const l2 = ex * ex + ey * ey; let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; best = Math.min(best, Math.hypot(ax + ex * t - x, ay + ey * t - y)); }
  if (q.length === 2) best = Math.hypot(q[0] - x, q[1] - y);
  return best;
};
const unionD = (pcs: any[], x: number, y: number): [number, number] => { let b = Infinity; let bi = -1; pcs.forEach((p, i) => { if (p.pts.length < 2) return; const d = segD(p.pts, x, y); if (d < b) { b = d; bi = i; } }); return [b, bi]; };
for (const [from, to, tag] of [[pb, A.pieces, "B->A"], [pa, B.pieces, "A->B"]] as const) {
  let worst = -1; let wx = 0; let wy = 0; let wk = -1; let wj = -1;
  for (let k = 0; k + 1 < from.pts.length; k += 2) { const [d, j] = unionD(to, from.pts[k], from.pts[k + 1]); if (d > worst) { worst = d; wx = from.pts[k]; wy = from.pts[k + 1]; wk = k / 2; wj = j; } }
  console.log(`  ${tag}: worst ${(worst * S).toFixed(3)} px at point ${wk} (${f(wx)},${f(wy)}), nearest piece #${wj} ${to[wj]?.kind}/${to[wj]?.chain}/${to[wj]?.side}/${to[wj]?.region}`);
}
const lo = Math.min(pa.s0, pa.s1) - win; const hi = Math.max(pa.s0, pa.s1) + win;
console.log(`cuts on chain ${pa.chain} side ${pa.side} within s ${f(lo)}..${f(hi)} (A | B):`);
const cutsOf = (T: any): any[] => T.cuts.filter((c: any) => c.chain === pa.chain && c.side === pa.side && c.s >= lo && c.s <= hi);
const ca = cutsOf(A); const cb = cutsOf(B);
for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
  const a = ca[i]; const b = cb[i];
  console.log(`  ${a ? `x${a.crossing} s=${f(a.s)} (${f(a.x)},${f(a.y)}) over${a.overChain}` : "-"} | ${b ? `x${b.crossing} s=${f(b.s)} (${f(b.x)},${f(b.y)}) over${b.overChain}` : "-"}${a && b ? `  move ${(Math.hypot(a.x - b.x, a.y - b.y) * S).toFixed(3)} px` : ""}`);
}
const CA = debugCache(stA) as any; const CB = debugCache(stB) as any;
const kindName = ["xU", "xO", "jn", "cap", "seam"];
const nX = (stA as any).crossings?.length ?? 0;
console.log(`chain ${pa.chain} slots near the piece (cS A | B, L/R refs A | B):`);
for (let s = 0; s < CA.nSlots; s++) {
  if (CA.slotPi[s] !== pa.chain) continue;
  const cA = CA.stCS[s]; const cB = CB.stCS[s];
  if (cA < lo || cA > hi) continue;
  const r = CA.slotRank[s]; const k = CA.slotKind[s];
  const who = k < 2 ? `x${r >> 2}.${r & 3}` : k === 2 ? `arm${r - nX * 4}` : `r${r}`;
  const ch = CA.stLeft[s] !== CB.stLeft[s] || CA.stRight[s] !== CB.stRight[s] || CA.stActive[s] !== CB.stActive[s];
  console.log(`  ${CA.stActive[s] ? "+" : "-"}${CB.stActive[s] ? "+" : "-"} slot${s} ${kindName[k]} ${who} cS ${f(cA)} | ${f(cB)} (d ${((cB - cA) * S).toFixed(3)}) L${CA.stLeft[s]}|${CB.stLeft[s]} R${CA.stRight[s]}|${CB.stRight[s]}${ch ? "  <- refs" : ""}`);
}
if (XI >= 0) {
  for (const [st, rows, tag] of [[stA, candA, "A"], [stB, candB, "B"]] as const) {
    const C = debugCache(st) as any;
    console.log(`crossing ${XI} ${tag}: cp (${f(C.cpX[XI])},${f(C.cpY[XI])}) theta ${(C.cpTheta[XI] * 180 / Math.PI).toFixed(3)} deg sU ${f(C.cpSUnder[XI])} sO ${f(C.cpSOver[XI])} U${C.crossUnder[XI]} O${C.crossOver[XI]}; ${rows.length} candidates:`);
    for (const r of [...rows].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[4] - b[4])) console.log(`  u${r[0] > 0 ? "+" : "-"} o${r[1] > 0 ? "+" : "-"} (${f(r[2])},${f(r[3])}) dc ${f(r[4])} uS ${f(r[5])} oS ${f(r[6])}${r[7] ? " synth" : ""} seg ${r[8]}/${r[9]}`);
  }
}// All under/over border intersections near the crossing point, ignoring the s window.
if (XI >= 0) {
  for (const [st, tag] of [[stA, "A"], [stB, "B"]] as const) {
    const C = debugCache(st) as any;
    const h = C.h; const th = C.cpTheta[XI]; const R = Math.min(14 * h, h / Math.max(Math.sin(th), 0.15) + 2 * h);
    const U = C.crossUnder[XI]; const O = C.crossOver[XI]; const cx = C.cpX[XI]; const cy = C.cpY[XI];
    const sU = C.cpSUnder[XI]; const sO = C.cpSOver[XI]; const pU = C.polys[U]; const pO = C.polys[O];
    const dSp = (p: any, a: number, b: number): number => { let d = b - a; if (p.closed) { d = ((d % p.len) + p.len) % p.len; if (d > p.len / 2) d -= p.len; } return d; };
    console.log(`${tag}: h ${f(h)} R ${f(R)}`);
    for (const ui of [0, 1]) for (const oi of [0, 1]) {
      const Bu = C.bords[U * 2 + ui]; const Bo = C.bords[O * 2 + oi];
      for (let i = 0; i + 1 < Bu.nb; i++) {
        const ax = Bu.bx[i]; const ay = Bu.by[i]; const ex = Bu.bx[i + 1] - ax; const ey = Bu.by[i + 1] - ay;
        if (Math.hypot(ax - cx, ay - cy) > 2) continue;
        for (let j = 0; j + 1 < Bo.nb; j++) {
          if (U === O && ui === oi && i === j) continue;
          const bx = Bo.bx[j]; const by = Bo.by[j]; const gx = Bo.bx[j + 1] - bx; const gy = Bo.by[j + 1] - by;
          if (Math.hypot(bx - cx, by - cy) > 2.5) continue;
          const den = ex * gy - ey * gx; if (Math.abs(den) < 1e-15) continue;
          const tt = ((bx - ax) * gy - (by - ay) * gx) / den; const uu = ((bx - ax) * ey - (by - ay) * ex) / den;
          if (tt < 0 || tt > 1 || uu < 0 || uu > 1) continue;
          const px = ax + ex * tt; const py = ay + ey * tt;
          const us = Bu.bs[i] + (Bu.bs[i + 1] - Bu.bs[i]) * tt; const os = Bo.bs[j] + (Bo.bs[j + 1] - Bo.bs[j]) * uu;
          const angle = Math.abs(Math.atan2(den, ex * gx + ey * gy)) * 180 / Math.PI;
          console.log(`  u${ui ? "-" : "+"} o${oi ? "-" : "+"} (${f(px)},${f(py)}) dc ${f(Math.hypot(px - cx, py - cy))} uS ${f(us)} (d ${f(dSp(pU, sU, us))}) oS ${f(os)} (d ${f(dSp(pO, sO, os))}) seg bs u ${f(Bu.bs[i])}..${f(Bu.bs[i + 1])} o ${f(Bo.bs[j])}..${f(Bo.bs[j + 1])} angle ${angle.toFixed(2)}`);
        }
      }
    }
  }
}
// Border points of one chain side in an s range (env X_SEG=chain,side,s0,s1), both frames.
if (process.env.X_SEG) {
  const [chS, sdS, a0, a1] = process.env.X_SEG.split(",").map(Number);
  for (const [st, tag] of [[stA, "A"], [stB, "B"]] as const) {
    const C = debugCache(st) as any; const Bd = C.bords[chS * 2 + (sdS === 1 ? 0 : 1)];
    const rows: string[] = [];
    for (let i = 0; i < Bd.nb; i++) if (Bd.bs[i] >= a0 && Bd.bs[i] <= a1) rows.push(`${i}: bs ${Bd.bs[i].toFixed(6)} (${f(Bd.bx[i])},${f(Bd.by[i])})${i + 1 < Bd.nb ? ` -> len ${Math.hypot(Bd.bx[i + 1] - Bd.bx[i], Bd.by[i + 1] - Bd.by[i]).toFixed(5)} ds ${(Bd.bs[i + 1] - Bd.bs[i]).toFixed(6)}` : ""}`);
    console.log(`${tag} border chain ${chS} side ${sdS} bs ${a0}..${a1}:`); rows.forEach((r) => console.log("  " + r));
  }
}

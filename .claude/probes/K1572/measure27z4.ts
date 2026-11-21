// K1572 27Z4: per-place scene geometry at the 17 real ball places. For each place (maze, dev x, y, site),
// find the fillet corner whose tangent point is nearest (census40's rule) and print measures a narrowing
// rule could use: R/h, the angle the two arms subtend at the corner centre, each tangent point's along-chain
// distance to the nearest end of its own arm chain (in h), and the arm chains' lengths (in h).
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1572/measure27z4.ts <scene.json> <sites.json> <maze> <x,y,site;...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) { const F: any = (globalThis as any)[v.__t]; return F.from(v.v.map(dec)); } const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, maze, list] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h;
// along-chain distance (world units) from point (x,y)'s foot on chain c to the nearer chain end
const endDist = (c: number, x: number, y: number): number => {
  const v0 = T.cV0[c]; const nv = T.cNV[c]; const closed = T.cClosed[c] === 1;
  let best = Infinity, bs = 0;
  const cum = [0]; for (let v = v0; v < v0 + nv - 1; v++) cum.push(cum[cum.length - 1] + Math.hypot(T.vx[v + 1] - T.vx[v], T.vy[v + 1] - T.vy[v]));
  for (let v = v0; v < v0 + nv - 1; v++) {
    const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay;
    const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const ex = x - ax - dx * u, ey = y - ay - dy * u, e2 = ex * ex + ey * ey;
    if (e2 < best) { best = e2; bs = cum[v - v0] + u * Math.sqrt(l2); }
  }
  const total = cum[cum.length - 1];
  return closed ? Math.min(bs, total - bs, total / 2) : Math.min(bs, total - bs);
};
const chainLen = (c: number): number => { const v0 = T.cV0[c]; const nv = T.cNV[c]; let s = 0; for (let v = v0; v < v0 + nv - 1; v++) s += Math.hypot(T.vx[v + 1] - T.vx[v], T.vy[v + 1] - T.vy[v]); return s; };
// absolute heading change (deg) along chain c between arc positions s0..s1 (world arc from chain start)
const turnBetween = (c: number, s0: number, s1: number): number => {
  const v0 = T.cV0[c]; const nv = T.cNV[c]; const cum = [0];
  for (let v = v0; v < v0 + nv - 1; v++) cum.push(cum[cum.length - 1] + Math.hypot(T.vx[v + 1] - T.vx[v], T.vy[v + 1] - T.vy[v]));
  let turn = 0, prev: number | null = null;
  for (let v = v0; v < v0 + nv - 1; v++) {
    const mid = (cum[v - v0] + cum[v - v0 + 1]) / 2; if (mid < s0 || mid > s1) continue;
    const hd = Math.atan2(T.vy[v + 1] - T.vy[v], T.vx[v + 1] - T.vx[v]);
    if (prev !== null) { let dd = hd - prev; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; turn += Math.abs(dd); }
    prev = hd;
  }
  return turn * 180 / Math.PI;
};
// arc position of (x,y)'s foot on chain c, and chain total
const arcPos = (c: number, x: number, y: number): [number, number] => {
  const v0 = T.cV0[c]; const nv = T.cNV[c]; const cum = [0];
  for (let v = v0; v < v0 + nv - 1; v++) cum.push(cum[cum.length - 1] + Math.hypot(T.vx[v + 1] - T.vx[v], T.vy[v + 1] - T.vy[v]));
  let best = Infinity, bs = 0;
  for (let v = v0; v < v0 + nv - 1; v++) {
    const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay;
    const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const ex = x - ax - dx * u, ey = y - ay - dy * u, e2 = ex * ex + ey * ey;
    if (e2 < best) { best = e2; bs = cum[v - v0] + u * Math.sqrt(l2); }
  }
  return [bs, cum[cum.length - 1]];
};
for (const it of list.split(";").filter(Boolean)) {
  const [xs, ys, site] = it.split(","); const x = +xs, y = +ys;
  let bk = -1, bt = "", bd = Infinity;
  for (let k = 0; k < T.kR.length; k++) { if (T.kThru[k] || !Number.isFinite(T.kTax[k])) continue;
    for (const [t, tx, ty] of [["a", T.kTax[k], T.kTay[k]], ["b", T.kTbx[k], T.kTby[k]]] as [string, number, number][]) { const dd = Math.hypot(tx * a + e - x, ty * d + f - y); if (dd < bd) { bd = dd; bk = k; bt = t; } } }
  const k = bk; const cx = T.kCx[k], cy = T.kCy[k];
  const vax = T.kTax[k] - cx, vay = T.kTay[k] - cy, vbx = T.kTbx[k] - cx, vby = T.kTby[k] - cy;
  const cos = (vax * vbx + vay * vby) / (Math.hypot(vax, vay) * Math.hypot(vbx, vby));
  const ang = Math.acos(Math.min(1, Math.max(-1, cos))) * 180 / Math.PI;
  const cA = T.kCa[k], cB = T.kCb[k];
  const eA = endDist(cA, T.kTax[k], T.kTay[k]) / h, eB = endDist(cB, T.kTbx[k], T.kTby[k]) / h;
  const [sA, totA] = arcPos(cA, T.kTax[k], T.kTay[k]); const [sB, totB] = arcPos(cB, T.kTbx[k], T.kTby[k]);
  const nearA = Math.min(sA, totA - sA) <= Math.min(sB, totB - sB);
  const turnEndA = (sA <= totA - sA ? turnBetween(cA, 0, sA) : turnBetween(cA, sA, totA));
  const turnEndB = (sB <= totB - sB ? turnBetween(cB, 0, sB) : turnBetween(cB, sB, totB));
  const endPt = (c: number, s: number, tot: number): [number, number] => { const v0 = T.cV0[c]; return s <= tot - s ? [T.vx[v0], T.vy[v0]] : [T.vx[v0 + T.cNV[c] - 1], T.vy[v0 + T.cNV[c] - 1]]; };
  const segDir = (c: number, x: number, y: number): [number, number] => { const v0 = T.cV0[c]; const nv = T.cNV[c]; let best = Infinity, bd: [number, number] = [1, 0];
    for (let v = v0; v < v0 + nv - 1; v++) { const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay; const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; const ex = x - ax - dx * u, ey = y - ay - dy * u, e2 = ex * ex + ey * ey; if (e2 < best) { best = e2; bd = [dx, dy]; } } return bd; };
  const angEnd = (c: number, tx: number, ty: number, s: number, tot: number): number => { const [ex, ey] = endPt(c, s, tot); const [dx, dy] = segDir(c, tx, ty); const vx = ex - tx, vy = ey - ty; const cs = (dx * vx + dy * vy) / (Math.hypot(dx, dy) * Math.hypot(vx, vy)); return Math.acos(Math.min(1, Math.max(-1, cs))) * 180 / Math.PI; };
  const distCL = (c: number, x: number, y: number): number => { const v0 = T.cV0[c]; const nv = T.cNV[c]; let best = Infinity;
    for (let v = v0; v < v0 + nv - 1; v++) { const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay; const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; const ex = x - ax - dx * u, ey = y - ay - dy * u, e2 = ex * ex + ey * ey; if (e2 < best) best = e2; } return Math.sqrt(best); };
  const [eAx, eAy] = endPt(cA, sA, totA); const [eBx, eBy] = endPt(cB, sB, totB);
  const dTaO = distCL(cB, T.kTax[k], T.kTay[k]) / h; const dTbO = distCL(cA, T.kTbx[k], T.kTby[k]) / h;
  const dEndAO = distCL(cB, eAx, eAy) / h; const dEndBO = distCL(cA, eBx, eBy) / h;
  const headAt = (c: number, x: number, y: number, fromEnd: boolean): number => { const v0 = T.cV0[c]; const nv = T.cNV[c]; let best = Infinity, bh = 0;
    for (let v = v0; v < v0 + nv - 1; v++) { const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay; const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; const ex = x - ax - dx * u, ey = y - ay - dy * u, e2 = ex * ex + ey * ey; if (e2 < best) { best = e2; bh = Math.atan2(dy, dx); } } return bh; };
  const endHead = (c: number, s: number, tot: number): number => { const v0 = T.cV0[c]; const nv = T.cNV[c]; const v = s <= tot - s ? v0 : v0 + nv - 2; return Math.atan2(T.vy[v + 1] - T.vy[v], T.vx[v + 1] - T.vx[v]); };
  const jAngB = Math.abs(((endHead(cB, sB, totB) - headAt(cA, eBx, eBy, false)) * 180 / Math.PI + 540) % 360 - 180);
  const jAngA = Math.abs(((endHead(cA, sA, totA) - headAt(cB, eAx, eAy, false)) * 180 / Math.PI + 540) % 360 - 180);
  const winA = turnBetween(cA, Math.max(0, sA - 2 * h), Math.min(totA, sA + 2 * h));
  const winB = turnBetween(cB, Math.max(0, sB - 2 * h), Math.min(totB, sB + 2 * h));
  console.log(`${maze} ${site} @${x},${y} k${k}.${bt} (${bd.toFixed(1)} px) j${T.kJ[k]} arms ${cA}/${cB} Rh ${(T.kR[k] / h).toFixed(3)} ang ${ang.toFixed(1)} endA ${eA.toFixed(2)}h endB ${eB.toFixed(2)}h lenA ${(chainLen(cA) / h).toFixed(1)}h lenB ${(chainLen(cB) / h).toFixed(1)}h closedA ${T.cClosed[cA]} closedB ${T.cClosed[cB]} turnEndA ${turnEndA.toFixed(0)} turnEndB ${turnEndB.toFixed(0)} nearArm ${nearA ? "A" : "B"} winA ${winA.toFixed(0)} winB ${winB.toFixed(0)} angEndA ${angEnd(cA, T.kTax[k], T.kTay[k], sA, totA).toFixed(0)} angEndB ${angEnd(cB, T.kTbx[k], T.kTby[k], sB, totB).toFixed(0)} Rmaxh ${(T.kRmax[k] / h).toFixed(2)} dTaO ${dTaO.toFixed(2)} dTbO ${dTbO.toFixed(2)} dEndAO ${dEndAO.toFixed(2)} dEndBO ${dEndBO.toFixed(2)} jAngA ${jAngA.toFixed(0)} jAngB ${jAngB.toFixed(0)}`);
}

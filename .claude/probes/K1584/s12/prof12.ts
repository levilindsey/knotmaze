// K1584 s12: one crossing's border profile along the under thread (gapWindow's march, per border): at each arc offset
// from the under centre, each border point's distance to the over polyline (in fill halves past the fill edge: e =
// (bD - h) / margin), the nearest over arc, sinT there, and the border point's device position.
//   npx tsx prof12.ts <capDir> <crossing index> <dir -1|1> [maxOff=1.2] [step=0.035]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const R = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const L = await import(pathToFileURL(join(R, "src/render/gpu_field/gf_look.ts")).href);
const { kArcOfCtrl } = await import(pathToFileURL(join(R, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, sX, sDir, sMax, sStep] = process.argv;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const A = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")).toDevA;
const h = G.style.threadWidth / 2, margin = L.lookGap(G), fade = L.lookFade(G);
const x = G.crossings[+sX]; const dir = +sDir, maxOff = +(sMax ?? 1.2), step = +(sStep ?? 0.035);
const D = G.kd, GE = D.geom;
const sam = (ch: number) => { const c = G.kcv[ch], sm = G.chainSamples[ch]; return { positions: sm.positions, count: sm.count, closed: c.closed, total: GE[c.geom * 4], arcPer: GE[c.geom * 4 + 1] }; };
const pAt = (S: any, arc: number) => {
  const a = S.closed ? ((arc % S.total) + S.total) % S.total : Math.max(0, Math.min(S.total, arc));
  const fi = Math.max(0, Math.min(S.closed ? S.count : S.count - 1, a / S.arcPer));
  const i0 = Math.floor(fi) % S.count, i1 = S.closed ? (i0 + 1) % S.count : Math.min(i0 + 1, S.count - 1), u = fi - Math.floor(fi), P = S.positions;
  return [P[i0 * 2] + (P[i1 * 2] - P[i0 * 2]) * u, P[i0 * 2 + 1] + (P[i1 * 2 + 1] - P[i0 * 2 + 1]) * u];
};
const su = sam(x.underChain), so = sam(x.overChain);
const uC = kArcOfCtrl(D, G.kcv[x.underChain], x.underCtrl), oC = kArcOfCtrl(D, G.kcv[x.overChain], x.overCtrl);
const nO = Math.round(6.8 / 0.01); const oa: number[] = [], ox: number[] = [], oy: number[] = [];
for (let i = 0; i <= nO; i++) { const a = oC - 3.4 + i * 0.01; oa.push(a); const p = pAt(so, a); ox.push(p[0]); oy.push(p[1]); }
const near = (px: number, py: number) => { let bd = Infinity, ba = 0, bt = [1, 0]; for (let i = 0; i < nO; i++) { const dx = ox[i + 1] - ox[i], dy = oy[i + 1] - oy[i], l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ox[i]) * dx + (py - oy[i]) * dy) / l2)) : 0; const ex = px - ox[i] - dx * u, ey = py - oy[i] - dy * u, d2 = ex * ex + ey * ey; if (d2 < bd) { bd = d2; ba = oa[i] + 0.01 * u; const l = Math.sqrt(l2) || 1; bt = [dx / l, dy / l]; } } return { d: Math.sqrt(bd), a: ba, t: bt }; };
console.log(`x${sX} under ${x.underChain} over ${x.overChain} uC ${uC.toFixed(3)} oC ${oC.toFixed(3)} h ${h} margin ${margin} fade ${fade} (gap reach h+m+f = ${(h + margin + fade).toFixed(3)})`);
console.log("off   | L: bD  e/m   oArc   sinT  dev           | R: bD  e/m   oArc   sinT  dev");
for (let off = 0; off <= maxOff + 1e-9; off += step) {
  const arc = uC + dir * off; const p = pAt(su, arc), p0 = pAt(su, arc - su.arcPer), p1 = pAt(su, arc + su.arcPer);
  let tx = p1[0] - p0[0], ty = p1[1] - p0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
  const row: string[] = [off.toFixed(3)];
  for (const [nx, ny] of [[-ty, tx], [ty, -tx]]) { // left (+1), right (-1)
    const bx = p[0] + nx * h, by = p[1] + ny * h; const N = near(bx, by);
    const sinT = Math.abs(tx * N.t[1] - ty * N.t[0]);
    row.push(`${N.d.toFixed(3)} ${((N.d - h) / margin).toFixed(2).padStart(5)} ${N.a.toFixed(2).padStart(6)} ${sinT.toFixed(2)} (${(bx * A[0] + A[4]).toFixed(1)},${(by * A[3] + A[5]).toFixed(1)})`);
  }
  console.log(row.join(" | "));
}

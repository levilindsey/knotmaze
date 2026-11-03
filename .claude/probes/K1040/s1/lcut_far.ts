// K1040 S1e: the extent of S1d F5's Lcut far-pass defect (S1e F2), and what
// two fixes would change. For every arm of the 12 scenes (working tree's
// FormB): the root-based span L0, the pass that binds Lcut (d, θ, its cut),
// and the span under
//   F4:   passes past L0 skipped (S1d F4, discontinuous as a pass slides over L0);
//   fade: a pass past L0 counts with its reach faded out over [L0, L0 + h]
//         (c = d − reach·(1 − ss(L0, L0 + h, d)) − h);
//   curv: reach = min(h/tan(θ/2), e_c), e_c the distance from the pass back
//         along the arm's chain to where the partner chain's distance first
//         reaches h(1 + cos θ) (the straight model's reach exactly, for two
//         straight threads; shorter where the threads curve apart).
// Counts the arms each rule moves by more than 1e-3 and lists the largest.
// Run: npx vite-node .claude/probes/K1040/s1/lcut_far.ts [scene...]
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { footInWindow, normS, pointAt, type Poly } from "../../../../src/render/field/geom";

const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const argScenes = process.argv.slice(2);
const sceneNames = argScenes.length ? argScenes : ALL;
const fx = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const smooth = (a: number, b: number, v: number) => {
  const tt = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return tt * tt * (3 - 2 * tt);
};
interface PassX { s: number; theta: number; qi: number; sq: number }
let totF4 = 0;
let totFade = 0;
let totCurv = 0;
let totFar = 0;
for (const name of sceneNames) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const fb = new FormB(sc);
  const hh = fb.h;
  const polys = fb.polys;
  // Passes with their partner (the working tree keeps only s and θ).
  const px: PassX[][] = polys.map(() => []);
  for (const x of sc.crossings) {
    const ia = fb.idxOf.get(x.a.chain);
    const ib = fb.idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) continue;
    const sa = normS(polys[ia], x.a.s);
    const sb = normS(polys[ib], x.b.s);
    const tha = fb.passes[ia].find((q) => Math.abs(q.s - sa) < 1e-12)?.theta ?? NaN;
    px[ia].push({ s: sa, theta: tha, qi: ib, sq: sb });
    px[ib].push({ s: sb, theta: tha, qi: ia, sq: sa });
  }
  // e_c for one pass seen from chain pi, walking toward smaller d (s − dir·e).
  const reachCache = new Map<string, number>();
  const curvReach = (pi: number, ps: PassX, dir: number, r0: number): number => {
    const key = `${pi}:${fx(ps.s, 9)}:${dir}`;
    const hit = reachCache.get(key);
    if (hit !== undefined) return hit;
    const pa: Poly = polys[pi];
    const pq: Poly = polys[ps.qi];
    const target = hh * (1 + Math.cos(ps.theta));
    const step = 0.004;
    const lim = Math.min(r0, 40);
    let sqPrev = ps.sq;
    let ePrev = 0;
    let dPrev = 0;
    let out = r0;
    for (let e = step; e <= lim + 1e-12; e += step) {
      let sArm = ps.s - dir * e;
      if (pa.closed) sArm = normS(pa, sArm);
      else if (sArm < pa.s0 || sArm > pa.s0 + pa.len) break;
      const at = pointAt(pa, sArm);
      const w = 4 * step + 0.02;
      let lo = sqPrev - w;
      let hi = sqPrev + w;
      if (!pq.closed) {
        lo = Math.max(pq.s0, lo);
        hi = Math.min(pq.s0 + pq.len, hi);
      }
      const ft = footInWindow(pq, at.x, at.y, lo, hi);
      sqPrev = ft.s;
      if (ft.d >= target) {
        out = Math.min(r0, ePrev + ((target - dPrev) / (ft.d - dPrev)) * (e - ePrev));
        break;
      }
      ePrev = e;
      dPrev = ft.d;
    }
    reachCache.set(key, out);
    return out;
  };
  const rows: string[] = [];
  let nF4 = 0;
  let nFade = 0;
  let nCurv = 0;
  let nFar = 0;
  let nZero = 0;
  let nCurv01 = 0;
  let nCurv05 = 0;
  let maxCurv = 0;
  let nRestored = 0;
  for (let ai = 0; ai < fb.arms.length; ai++) {
    const a = fb.arms[ai];
    const pa = polys[a.pi];
    const delta = (s: number) => {
      let d = (s - a.sR) * a.dir;
      if (pa.closed) d = ((d % pa.len) + pa.len) % pa.len;
      return d;
    };
    let L0 = pa.closed ? pa.len : a.dir > 0 ? pa.s0 + pa.len - a.sR : a.sR - pa.s0;
    for (const bj of fb.armsOf[a.pi]) {
      const d = delta(fb.arms[bj].sR);
      if (d > 1e-9 && d < L0) L0 = d;
    }
    let cF4 = Infinity;
    let cFade = Infinity;
    let cCurv = Infinity;
    let bind = { d: NaN, theta: NaN, c: Infinity };
    for (const ps of px[a.pi]) {
      const d = delta(ps.s);
      if (d < -1e-12) continue;
      const t = Math.tan(ps.theta / 2);
      const r0 = t > 1e-12 ? hh / t : Infinity;
      const c = d - r0 - hh;
      if (c < bind.c) bind = { d, theta: ps.theta, c };
      if (d <= L0) cF4 = Math.min(cF4, c);
      const fade = d > L0 ? 1 - smooth(L0, L0 + hh, d) : 1;
      cFade = Math.min(cFade, d - (Number.isFinite(r0) ? r0 * fade : fade > 0 ? Infinity : 0) - hh);
      if (d - r0 - hh < L0) cCurv = Math.min(cCurv, d - curvReach(a.pi, ps, a.dir, r0) - hh);
    }
    const Lf4 = Math.max(0, Math.min(L0, cF4));
    const Lfade = Math.max(0, Math.min(L0, cFade));
    const Lcurv = Math.max(0, Math.min(L0, cCurv));
    const far = bind.d > L0 && bind.c < L0;
    if (far) nFar++;
    if (a.L === 0) nZero++;
    const m4 = Math.abs(Lf4 - a.L) > 1e-3;
    const mf = Math.abs(Lfade - a.L) > 1e-3;
    const mc = Math.abs(Lcurv - a.L) > 1e-3;
    if (m4) nF4++;
    if (mf) nFade++;
    if (mc) nCurv++;
    const dc = Math.abs(Lcurv - a.L);
    if (dc > 0.01) nCurv01++;
    if (dc > 0.05) nCurv05++;
    if (dc > maxCurv) maxCurv = dc;
    if (a.L === 0 && Lcurv > 1e-3) nRestored++;
    if (m4 || mf || mc)
      rows.push(
        `  arm ${ai} (j ${a.j} pi ${a.pi} dir ${a.dir}) L0 ${fx(L0)} L ${fx(a.L)} | F4 ${fx(Lf4)} fade ${fx(Lfade)} curv ${fx(Lcurv)} | binds d ${fx(bind.d)} θ ${fx(bind.theta, 4)} c ${fx(bind.c)}${far ? " FAR" : ""}`,
      );
  }
  totF4 += nF4;
  totFade += nFade;
  totCurv += nCurv;
  totFar += nFar;
  console.log(`== ${name}: arms ${fb.arms.length}, L = 0 on ${nZero}, bound by a pass past L0 ${nFar}; moved > 1e-3 by F4 ${nF4}, fade ${nFade}, curv ${nCurv}`);
  console.log(`   curv: |ΔL| > 0.01 on ${nCurv01}, > 0.05 on ${nCurv05}, max ${fx(maxCurv)}; L = 0 arms it reopens ${nRestored}`);
  // The far-pass arms first, then by arm.
  rows.sort((u, v) => Number(v.endsWith("FAR")) - Number(u.endsWith("FAR")) || u.localeCompare(v));
  for (const r of rows.slice(0, 8)) console.log(r);
  if (rows.length > 8) console.log(`  ... ${rows.length - 8} more`);
}
console.log(`ALL: bound past L0 ${totFar}; moved by F4 ${totF4}, fade ${totFade}, curv ${totCurv}`);

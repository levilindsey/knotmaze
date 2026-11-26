// K1584 s1: per crossing side and border, what the gap bake and lkCut give the under thread's border stroke
// where it leaves the over thread, from one capture's DUMPGW + SCENE dumps (cap40pin.mjs) and THIS worktree's src.
//   npx tsx gapcheck.ts <captureDir> <out.json>
// For each crossing, each under side (dir -1 / +1 along the under chain) and each border (lat +1 = left of the
// under tangent, -1 = right): walk the border stroke's centre line (offset h - band/2 from the under centreline)
// outward in 0.01 arc steps; e = (distance to the over centreline) - h is the clearance past the over thread's
// edge. For 0 <= e <= 0.22 (the first exit only) it records the point and the model's keep (1 - lkCut with the baked window, slot,
// scales and joint flag, as gf_look.ts lkGap applies them; the depth-key test is not modelled). The border's
// path is decided over the points with 0.03 <= e <= 0.09 (inside the full gap margin):
//   stolen   another crossing's window owns the slot (its over chain is not this crossing's)
//   window   no slot / the window ended (winM <= 0): the cut is off before the border clears the over thread
//   flag     the joint flag is set on that side (K1482 s15-s18: no margin, 0.3 fade, by design)
//   scale    the side's margin/fade clearance scale is below 1 (K1458, near a fused joint)
//   full     the full cut
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const { kArcOfCtrl } = await import(pathToFileURL(join(SRC, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, op] = process.argv;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const ev = new GfEval(T); const fade = L.lookFade(G); ev.fadeLength = fade;
const mem = (c: number, k: number): boolean => {
  if (c < 0 || c >= T.cV0.length) return false;
  const v0 = T.cV0[c]; const pad = T.cClosed[c] !== 1 && T.vs[v0] < 0 ? 1 : 0;
  const m = ev.memberAt(c, T.vs[v0 + Math.min(T.cNV[c] - 1, k + pad)]);
  return m.g >= 0 && m.ramp > 0;
};
const h = G.style.threadWidth / 2, margin = L.lookGap(G), band = scene.look.band;
const src = {
  kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h,
  margin, fade, joints: G.junctionArcCtrls,
  jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin), overMember: process.env.NOFLAG ? undefined : mem, jointArcs: process.env.NOJA ? undefined : (L as any).gfJointArcs?.(T),
};
(globalThis as any).__k1584q = process.env.K84Q ?? ""; (globalThis as any).__k84noU = !!process.env.NOU; const tab = new L.GfGapTable(); tab.wins = []; (tab as any).rooms = [];
const V: Float32Array = tab.values(src);
const wins: number[] = tab.wins;
// per chain: the table base and raw sample -> kept index
const base: number[] = [], keptOf: Int32Array[] = [], nKept: number[] = [];
{
  let pb = 0;
  for (let U = 0; U < G.chainSamples.length; U++) {
    const sm = G.chainSamples[U];
    base.push(pb);
    if (!(sm && sm.count >= 1 && G.kcv[U] && G.kcv[U].nCtrl >= 1)) { keptOf.push(new Int32Array(0)); nKept.push(0); continue; }
    const xy = sm.positions; const m = new Int32Array(sm.count); let kv = 0, l = -1;
    for (let k = 0; k < sm.count; k++) { if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) { m[k] = kv - 1; continue; } m[k] = kv++; l = k; }
    keptOf.push(m); nKept.push(kv);
    pb += sm.count + (G.kcv[U].closed ? 1 : 0);
  }
}
type S = { positions: ArrayLike<number>; count: number; closed: boolean; total: number; arcPer: number };
const sam = (ch: number): S => { const c = G.kcv[ch], sm = G.chainSamples[ch]; return { positions: sm.positions, count: sm.count, closed: !!c.closed, total: G.kd.geom[c.geom * 4], arcPer: G.kd.geom[c.geom * 4 + 1] }; };
const at = (s: S, arc: number): [number, number] => {
  const a = s.closed ? ((arc % s.total) + s.total) % s.total : Math.max(0, Math.min(s.total, arc));
  const fi = Math.max(0, Math.min(s.closed ? s.count : s.count - 1, a / s.arcPer));
  const i0 = Math.floor(fi) % s.count, i1 = s.closed ? (i0 + 1) % s.count : Math.min(i0 + 1, s.count - 1), u = fi - Math.floor(fi), P = s.positions;
  return [P[i0 * 2] + (P[i1 * 2] - P[i0 * 2]) * u, P[i0 * 2 + 1] + (P[i1 * 2 + 1] - P[i0 * 2 + 1]) * u];
};
const ss = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pxw = 2 * aa;
const lkCut = (d: number, sinT: number, wm: number, sx: number, sy: number): number => {
  const inner = ss(h - aa, h + aa, d);
  const fw = Math.max(fade * sy * Math.max(sinT, 0.2), 2 * aa);
  const e = d - h - margin * sx;
  const kk = Math.max(0, Math.min(1, (e + 0.5 * pxw) / Math.max(fw, pxw)));
  let cut = (1 - kk * kk * (3 - 2 * kk)) * inner;
  let fs = Math.max(0, Math.min(1, wm / Math.max(0.5 * fade, pxw)));
  const m = Math.max(0, Math.min(1, e / pxw));
  fs = 1 + (fs * fs * (3 - 2 * fs) - 1) * m;
  cut *= Math.max(0, Math.min(1, wm / pxw + 0.5)) * fs;
  return cut;
};
const dev = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
const out: any[] = [];
const counts: Record<string, number> = {};
for (let i = 0; i < G.crossings.length; i++) {
  const x = G.crossings[i];
  const su = sam(x.underChain), so = sam(x.overChain);
  const uC = kArcOfCtrl(G.kd, G.kcv[x.underChain], x.underCtrl), oC = kArcOfCtrl(G.kd, G.kcv[x.overChain], x.overCtrl);
  const self = x.overChain === x.underChain;
  let ro = 3.4;
  if (self) { let sep = Math.abs(uC - oC); if (su.closed) sep = Math.min(sep % su.total, su.total - (sep % su.total)); ro = Math.min(ro, Math.max(0.12, sep / 2 - 0.08)); }
  // the over polyline around the crossing
  const ox: number[] = [], oy: number[] = [];
  for (let a = oC - ro; a <= oC + ro + 1e-9; a += so.arcPer / 2) { if (!so.closed && (a < 0 || a > so.total)) continue; const p = at(so, a); ox.push(p[0]); oy.push(p[1]); }
  const dOver = (px: number, py: number): [number, number, number] => {
    let bd = Infinity, bi = 0;
    for (let q = 0; q + 1 < ox.length; q++) {
      const dx = ox[q + 1] - ox[q], dy = oy[q + 1] - oy[q], l2 = dx * dx + dy * dy;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ox[q]) * dx + (py - oy[q]) * dy) / l2)) : 0;
      const ex = px - ox[q] - dx * u, ey = py - oy[q] - dy * u, d2 = ex * ex + ey * ey;
      if (d2 < bd) { bd = d2; bi = q; }
    }
    const tx = ox[bi + 1] - ox[bi], ty = oy[bi + 1] - oy[bi], l = Math.hypot(tx, ty) || 1;
    return [Math.sqrt(bd), tx / l, ty / l];
  };
  const [cx, cy] = at(su, uC);
  const w = wins.slice(5 * i, 5 * i + 5); // (index, wn, wp, capN, capP)
  const rec: any = { i, under: x.underChain, over: x.overChain, self, wx: cx, wy: cy, dev: dev(cx, cy).map((q) => +q.toFixed(1)), wn: w[1], wp: w[2], capN: w[3], capP: w[4], borders: [] };
  for (const dir of [-1, 1]) for (const lat of [1, -1]) {
    const pts: number[] = [];
    let exited = false, path = "", nIn = 0;
    const tally: Record<string, number> = {};
    let keepSum = 0, sExit = NaN, msAt = NaN, fsAt = NaN, sxC = 1, syC = 1, wmAt = NaN, sinAt = NaN, jbAt = -1, memO = -1, dUm = 9, dOm = 9, uMemSelf = -1;
    for (let s = 0; s <= 3.0; s += 0.01) {
      const arc = uC + dir * s;
      if (!su.closed && (arc < 0 || arc > su.total)) break;
      const [ax, ay] = at(su, arc - 0.03), [bx, by] = at(su, arc + 0.03), [px0, py0] = at(su, arc);
      let tx = bx - ax, ty = by - ay; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const off = lat * (h - band / 2);
      const px = px0 - ty * off, py = py0 + tx * off;
      const [d, otx, oty] = dOver(px, py);
      const e = d - h;
      if (!exited) { if (e >= 0 && s > 0) { exited = true; sExit = s; } else continue; }
      if (e > 0.22) break; // the first exit only: past it the walk can meet the same over chain again (a twin crossing)
      if (e < 0) continue;
      // the table at the under foot
      const a = su.closed ? ((arc % su.total) + su.total) % su.total : arc;
      const fi = a / su.arcPer, k0 = Math.min(su.count - 1, Math.floor(fi)), k1 = su.closed ? (k0 + 1) % su.count : Math.min(su.count - 1, k0 + 1), u = fi - Math.floor(fi);
      const b = base[x.underChain], km = keptOf[x.underChain];
      const A4 = (k: number) => { const j = 4 * (b + km[k]); return [V[j], V[j + 1], V[j + 2], V[j + 3]]; };
      const Ta = A4(k0), Tb = A4(k1);
      const wm = Ta[0] + (Tb[0] - Ta[0]) * u;
      const P = (u < 0.5 && Ta[1] >= 0) || Tb[1] < 0 ? Ta : Tb;
      const slot = wm > -pxw ? P[1] : -1;
      const sinT = Math.abs(tx * oty - ty * otx);
      let keep = 1, why = "";
      if (slot < 0) { why = "window"; keep = 1 - lkCut(d, sinT, wm, 1, 1); }
      else if (Math.floor(slot) !== x.overChain) { why = "stolen"; keep = 1; }
      else {
        const jb = Math.floor((slot - Math.floor(slot)) * 8 + 0.5) & 3;
        const jf = jb === 3 || jb === (lat > 0 ? 1 : 2);
        const pk = Math.round((P[3] - Math.floor(P[3])) * 1024);
        const sx = (pk % 32) / 31, sy = Math.floor(pk / 32) / 31; sxC = sx; syC = sy;
        if (wm <= 0.5 * pxw) why = "window";
        else if (jf) why = "flag";
        else if (sx < 0.999 || sy < 0.999) why = "scale";
        else why = "full";
        keep = 1 - (jf ? lkCut(d, sinT, wm, margin > 0 ? -pxw / margin : 0, 0.3 * sy) : lkCut(d, sinT, wm, sx, sy));
      }
      if (process.env.DBG && +process.env.DBG === i) console.log(dir, lat, s.toFixed(2), e.toFixed(3), wm.toFixed(3), Ta.map((q) => +q.toFixed(3)).join(","), "|", Tb.map((q) => +q.toFixed(3)).join(","), why, keep.toFixed(2), sinT.toFixed(2), d.toFixed(3));
      const D = dev(px, py);
      pts.push(+D[0].toFixed(2), +D[1].toFixed(2), +e.toFixed(4), +keep.toFixed(3));
      if (e >= 0.03 && e <= 0.09 && memO < 0) {
        // K1584: what the flag saw here: is the nearest over sample a joint member, how far the nearest member samples lie
        const kmO = keptOf[x.overChain], kmU = keptOf[x.underChain];
        let bd = Infinity, bk = 0;
        for (let q = Math.round((oC - 1.5) / so.arcPer); q <= Math.round((oC + 1.5) / so.arcPer); q++) {
          let k = q; if (so.closed) k = ((k % so.count) + so.count) % so.count; else if (k < 0 || k >= so.count) continue;
          const dx = so.positions[2 * k] - px, dy = so.positions[2 * k + 1] - py, d2 = dx * dx + dy * dy;
          if (d2 < bd) { bd = d2; bk = k; }
          if (mem(x.overChain, kmO[k])) dOm = Math.min(dOm, Math.sqrt(d2));
        }
        memO = mem(x.overChain, kmO[bk]) ? 1 : 0;
        const kc = Math.round(a / su.arcPer);
        for (let q = kc - Math.round(1.5 / su.arcPer); q <= kc + Math.round(1.5 / su.arcPer); q++) {
          let k = q; if (su.closed) k = ((k % su.count) + su.count) % su.count; else if (k < 0 || k >= su.count) continue;
          if (mem(x.underChain, kmU[k])) { const dx = su.positions[2 * k] - px, dy = su.positions[2 * k + 1] - py; dUm = Math.min(dUm, Math.sqrt(dx * dx + dy * dy)); }
        }
        uMemSelf = mem(x.underChain, kmU[Math.min(su.count - 1, ((kc % su.count) + su.count) % su.count)]) ? 1 : 0;
      }
      if (e >= 0.03 && e <= 0.09) { tally[why] = (tally[why] ?? 0) + 1; keepSum += keep; nIn++; if (Number.isNaN(wmAt)) { wmAt = wm; sinAt = sinT; } if (why === "scale" && Number.isNaN(msAt)) { msAt = sxC; fsAt = syC; } }
    }
    if (nIn) { path = Object.entries(tally).sort((p, q) => q[1] - p[1])[0][0]; } else path = "none";
    const keepM = nIn ? keepSum / nIn : NaN;
    counts[path] = (counts[path] ?? 0) + 1;
    rec.borders.push({ dir, lat, path, ms: +msAt.toFixed(3), fs: +fsAt.toFixed(3), keepM: +keepM.toFixed(3), sExit: +sExit.toFixed(3), wm: +wmAt.toFixed(3), sin: +sinAt.toFixed(3), memO, uMemSelf, dUm: +dUm.toFixed(3), dOm: +dOm.toFixed(3), pts });
  }
  out.push(rec);
}
// K1584 s3: each crossing side's arc to the nearest joint-corner tangent point on the under chain (tables kCa/kSa, kCb/kSb)
const tanArcs = new Map<number, { arc: number; r: number; k: number; lat: number }[]>();
const sOff = (c: number): number => { const v0 = T.cV0[c]; const pad = T.cClosed[c] !== 1 && T.vs[v0] < 0 ? 1 : 0; return T.vs[v0 + pad]; };
for (let k = 0; k < T.nK; k++) {
  if (T.kThru[k] === 1) continue;
  for (const [c, s, tx, ty] of [[T.kCa[k], T.kSa[k], T.kTax[k], T.kTay[k]], [T.kCb[k], T.kSb[k], T.kTbx[k], T.kTby[k]]]) {
    if (c < 0) continue;
    const S = sam(c); const arc = s - sOff(c);
    const [px, py] = at(S, arc), [ax, ay] = at(S, arc - 0.03), [bx, by] = at(S, arc + 0.03);
    const lat = Math.sign((bx - ax) * (ty - py) - (by - ay) * (tx - px)); // +1 = left of the tangent
    if (!tanArcs.has(c)) tanArcs.set(c, []);
    tanArcs.get(c)!.push({ arc, r: T.kR[k], k, lat });
  }
}
if (process.env.MAPCHK) {
  let worst = 0, wc = -1;
  for (let c = 0; c < G.chainSamples.length; c++) {
    if (!G.chainSamples[c] || !G.kcv[c] || c >= T.cV0.length) continue;
    const v0 = T.cV0[c]; const pad = T.cClosed[c] !== 1 && T.vs[v0] < 0 ? 1 : 0; const S = sam(c);
    for (let k = 0; k + pad < T.cNV[c] && k < S.count; k++) { const e = Math.abs(T.vs[v0 + pad + k] - T.vs[v0 + pad] - k * S.arcPer); if (e > worst) { worst = e; wc = c; } }
  }
  console.log("MAPCHK worst", worst, "chain", wc, "nK", T.nK);
}
const corn: number[] = [];
for (let i = 0; i < G.crossings.length; i++) {
  const x = G.crossings[i]; const su = sam(x.underChain); const uC = kArcOfCtrl(G.kd, G.kcv[x.underChain], x.underCtrl);
  for (const dir of [-1, 1]) for (const lat of [1, -1]) {
    let best = 9;
    for (const q of tanArcs.get(x.underChain) ?? []) {
      if (q.lat !== lat) continue;
      let d = (q.arc - uC) * dir; if (su.closed) { d = ((d % su.total) + su.total) % su.total; }
      if (d >= 0 && d < best) best = d;
    }
    corn.push(i, dir, lat, best);
  }
}
console.log(`crossings ${out.length} h ${h} margin ${margin} fade ${fade} band ${band} aa ${aa.toFixed(5)} paths ${JSON.stringify(counts)}`);
writeFileSync(op, JSON.stringify({ h, margin, fade, band, aa, A, crossings: out, rooms: (tab as any).rooms, corn }));



// K1584 s7b: s7's pxdet.ts with a per-disk term census (the sBox branch below):
//   npx tsx pxterm.ts <capDir> <tab.json> - 0 "X,Y,R,label;..."      (env GF_SRC6 = ../s7/out/v_s6)
// pxdet.ts's header follows.
// K1584 s7: the per-pixel mirror at every place tabdiff.ts found (its out/tab/<maze>.json): the CPU label (GfEval) and
// K1595 pix.ts's lkGap mirror (stage 5's lkGap; stage 6's ball wedge is not mirrored: it scales a cut, it never opens
// or closes one), with the gap table baked three ways (s6 = GF_SRC6's src; K = this worktree's src without the joint
// partners, rule K alone; s7 = with them, both rules). Per place: pixels whose ink after the cut moves by > 0.1 between
// s6 -> K (rule K) and K -> s7 (the corner rule), with their bbox, and the cut-px counts of each build in the box.
//   npx tsx pxdiff.ts <capDir> <tab.json> <out.json> [padPx=14]        (env GF_SRC6 = out/v_s6)
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const S7 = resolve(import.meta.dirname, "../../../..");
// env GF_SRCP (mkpad.ps1's copy) replaces s6 with that build, both rules on: its "s6" column is the padded build
const SP = process.env.GF_SRCP;
const S6 = SP ?? process.env.GF_SRC6 ?? join(import.meta.dirname, "out/v_s6");
const L7 = await import(pathToFileURL(join(S7, "src/render/gpu_field/gf_look.ts")).href);
const L6 = await import(pathToFileURL(join(S6, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(S7, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(S7, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(S7, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, tabF, op, sPad, sBox] = process.argv; const BOX = sBox ? sBox.split(",").map(Number) : null;
const PAD = +(sPad ?? 14);
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const TJ = JSON.parse(readFileSync(tabF, "utf8"));
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const ev = new GfEval(T); const fade = L7.lookFade(G); ev.fadeLength = fade;
const h = G.style.threadWidth / 2, margin = L7.lookGap(G);
const bake = (L: any, partners: boolean): Float32Array => {
  const JL = new Map<number, number[]>(), JP = new Map<number, number[]>();
  const src: any = {
    kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf: h, margin, fade,
    joints: G.junctionArcCtrls, jointClear: L.gfJointClear(h, G.FILLET_REACH_PER_HALF, G.cuspRadius, margin),
    jointArcs: L.gfJointArcs(T, JL, JP), jointLats: JL,
  };
  if (partners) src.jointPartners = JP;
  return Float32Array.from(new L.GfGapTable().values(src));
};
// stage 6's right code rides x at half scale (code / 2048), s7's at quarter scale ((code + GAP_FAR_OFF) / 4096): put
// s6's on s7's scale, so an unchanged slot compares (and decodes) the same
const norm = (V: Float32Array): Float32Array => { for (let i = 1; i < V.length; i += 4) if (V[i] >= 0) { const c = Math.floor(V[i]); V[i] = c + Math.round((V[i] - c) * 2048) / 4096; } return V; };
const VS = SP ? [bake(L6, true), bake(L7, false), bake(L7, true)] : [norm(bake(L6, false)), bake(L7, false), bake(L7, true)];
const base: number[] = []; { let pb = 0; for (let c = 0; c < G.chainSamples.length; c++) { base.push(pb); const sm = G.chainSamples[c]; if (sm && sm.count >= 1 && G.kcv[c] && G.kcv[c].nCtrl >= 1) pb += sm.count + (G.kcv[c].closed ? 1 : 0); } }
const zt = T.zt, pxw = 2 * aa, BIG = 1e30;
const ss = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
const lkCut = (d: number, sinT: number, wm: number, sc: number[]): number => {
  const inner = ss(h - aa, h + aa, d);
  const fw = Math.max(fade * sc[1] * Math.max(sinT, 0.2), 2 * aa);
  const e = d - h - margin * sc[0];
  const kk = cl((e + 0.5 * pxw) / Math.max(fw, pxw), 0, 1);
  const cut = (1 - kk * kk * (3 - 2 * kk)) * inner;
  let fs = cl(wm / Math.max(0.5 * fade, pxw), 0, 1);
  fs = 1 + (fs * fs * (3 - 2 * fs) - 1) * cl(e / pxw, 0, 1);
  return cut * cl(wm / pxw + 0.5, 0, 1) * fs;
};
const v0 = (c: number) => T.cV0[c], nv = (c: number) => T.cNV[c], closed = (c: number) => T.cClosed[c] === 1;
const padOf = (c: number) => (!closed(c) && T.vs[v0(c)] < 0 ? 1 : 0);
const segOfS = (c: number, s: number): [number, number] => {
  let lo = 0, hi = nv(c) - 1; const b = v0(c);
  for (let it = 0; it < 24 && hi - lo > 1; it++) { const m = (lo + hi) >> 1; if (T.vs[b + m] <= s) lo = m; else hi = m; }
  const a0 = T.vs[b + lo], a1 = T.vs[b + lo + 1];
  return [lo, a1 > a0 ? cl((s - a0) / (a1 - a0), 0, 1) : 0];
};
const pmod = (a: number, n: number) => ((a % n) + n) % n;
const tanS = (c: number, q: [number, number]): [number, number] => {
  const b = v0(c), n0 = nv(c), cc = closed(c), k = q[0], n = cc ? n0 - 1 : n0;
  const im = cc ? pmod(k - 1, n) : Math.max(k - 1, 0), i0 = cc ? pmod(k, n) : k, i1 = cc ? pmod(k + 1, n) : Math.min(k + 1, n0 - 1), i2 = cc ? pmod(k + 2, n) : Math.min(k + 2, n0 - 1);
  let ax = T.vx[b + i1] - T.vx[b + im], ay = T.vy[b + i1] - T.vy[b + im], bx = T.vx[b + i2] - T.vx[b + i0], by = T.vy[b + i2] - T.vy[b + i0];
  let l = Math.hypot(ax, ay) || 1e-6; ax /= l; ay /= l; l = Math.hypot(bx, by) || 1e-6; bx /= l; by /= l;
  const tx = ax + (bx - ax) * q[1], ty = ay + (by - ay) * q[1]; l = Math.hypot(tx, ty) || 1;
  return [tx / l, ty / l];
};
const foot = (c: number, q: [number, number]): [number, number] => { const b = v0(c) + q[0]; return [T.vx[b] + (T.vx[b + 1] - T.vx[b]) * q[1], T.vy[b] + (T.vy[b + 1] - T.vy[b]) * q[1]]; };
const arcAt = (c: number, q: [number, number]): number => { const b = v0(c) + q[0]; return T.vs[b] + (T.vs[b + 1] - T.vs[b]) * q[1]; };
const nKept = (c: number): number => { const sm = G.chainSamples[c]; if (!sm) return 0; const xy = sm.positions; let kv = 0, l = -1; for (let k = 0; k < sm.count; k++) { if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue; kv++; l = k; } if (G.kcv[c].closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--; return kv; };
const nKc = new Map<number, number>();
const lastOf = (c: number) => { if (!nKc.has(c)) nKc.set(c, nKept(c)); const kv = nKc.get(c)!; return G.kcv[c].closed ? kv : kv - 1; };
const tabAt = (V: Float32Array, c: number, q: [number, number]) => {
  let k = q[0] - padOf(c), u = q[1]; const last = lastOf(c);
  if (k < 0) { k = 0; u = 0; } if (k >= last) { k = last; u = 0; }
  const ja = 4 * (base[c] + k), jb = 4 * (base[c] + Math.min(k + 1, last));
  const Aq = [V[ja], V[ja + 1], V[ja + 2], V[ja + 3]], Bq = [V[jb], V[jb + 1], V[jb + 2], V[jb + 3]];
  const wm = Aq[0] + (Bq[0] - Aq[0]) * u;
  let sl: number[];
  if (Aq[1] >= 0 && Math.floor(Bq[1]) === Math.floor(Aq[1]) && Math.abs(Bq[2] - Aq[2]) < Aq[3] + Bq[3]) sl = [u < 0.5 ? Aq[1] : Bq[1], Aq[2] + (Bq[2] - Aq[2]) * u, Math.max(Math.floor(Aq[3]), Math.floor(Bq[3])) + ((u < 0.5 ? Aq[3] : Bq[3]) % 1)];
  else { const P = (u < 0.5 && Aq[1] >= 0) || Bq[1] < 0 ? Aq : Bq; sl = [P[1], P[2], P[3]]; }
  return { wm, sl };
};
const nearOn = (c: number, s: number, w: number, px: number, py: number, aU: number, sx: number): [number, number, number] => {
  const b = v0(c), nseg = nv(c) - 1, cc = closed(c);
  let k0 = Math.floor(s + 0.5); if (!cc && T.vs[b] < 0) k0 += 1;
  const n = Math.min(Math.floor(w) + 1, 40); const per = cc ? T.vs[b + nseg] : 0;
  let bd = BIG, bq: [number, number] = [-1, 0];
  for (let i = -n; i <= n; i++) {
    let q = k0 + i; if (cc) q = pmod(q, nseg); else if (q < 0 || q >= nseg) continue;
    const ax = T.vx[b + q], ay = T.vy[b + q], dx = T.vx[b + q + 1] - ax, dy = T.vy[b + q + 1] - ay, l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? cl(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    if (aU >= 0) { let da = T.vs[b + q] + (T.vs[b + q + 1] - T.vs[b + q]) * t - aU; if (per > 0) da -= per * Math.floor(da / per + 0.5); if (Math.abs(da) < sx) continue; }
    const ex = px - ax - dx * t, ey = py - ay - dy * t, d2 = ex * ex + ey * ey;
    if (d2 < bd) { bd = d2; bq = [q, t]; }
  }
  return [Math.sqrt(bd), bq[0], bq[1]];
};
const E: any = ev;
const sx0 = 2 * h + margin + fade + 0.05;
// the cut under table V at a pixel already evaluated (o = ev.eval's result, copied; pieces read from E now)
const gapG = (V: Float32Array, o: any, x: number, y: number, key: number): [number, number] => {
  const lab = o.chain; const qU = segOfS(lab, o.s); const tu = tanS(lab, qU);
  const tb = tabAt(V, lab, qU); const wm = tb.wm; const sl = wm > -pxw ? tb.sl : [-1, 0, 0];
  let sc = [1, 1], scA = [1, 1], jf = false, fo = false;
  const fU = foot(lab, qU); const side = tu[0] * (y - fU[1]) - tu[1] * (x - fU[0]);
  if (sl[0] >= 0) {
    const pkL = Math.floor((sl[2] % 1) * 1024 + 0.5); let pkR = Math.floor((sl[0] % 1) * 4096 + 0.5);
    fo = pkR >= 1024; if (fo) pkR -= 1024; // the corner rule's far-off flag (GAP_FAR_OFF)
    let pk = pkL; if (pkR !== pkL && side < 0) pk = pkR;
    jf = pk === 0;
    sc = jf ? [margin > 0 ? -pxw / margin : 0, 0.3] : [(pk % 32) / 31, Math.floor(pk / 32) / 31];
    scA = jf ? [0.5, 0.45] : sc;
  }
  const cS = sl[0] >= 0 ? Math.floor(sl[0] + 0.5) : -1;
  let gL = 0, gF = 0;
  for (let j = 0; j < E.np; j++) {
    if (!(E.pkey[j] > key + zt)) continue;
    const c = E.pc[j]; const qO = segOfS(c, E.ps[j]); const to = tanS(c, qO);
    const sinT = Math.abs(tu[0] * to[1] - tu[1] * to[0]);
    const cj = lkCut(E.pd[j], sinT, wm, scA);
    if (cS < 0) gL = Math.max(gL, cj);
    else if (c === cS) gL = Math.max(gL, jf ? lkCut(E.pd[j], sinT, wm, sc) : cj);
  }
  if (wm > -pxw && gL < 0.999 && sl[0] >= 0 && !fo) {
    const aU = arcAt(lab, qU);
    const N = nearOn(cS, sl[1], sl[2], x, y, cS === lab ? aU : -1, sx0);
    if (N[1] >= 0) { const to = tanS(cS, [N[1], N[2]]); const sinT = Math.abs(tu[0] * to[1] - tu[1] * to[0]); gF = lkCut(N[0], sinT, wm, jf ? sc : scA); }
  }
  return [Math.max(gL, gF), gF > gL ? 2 : gL > 0 ? 1 : 0, gL, gF, sl[0] >= 0 ? Math.floor((sl[2] % 1) * 1024 + 0.5) : -1, sl[0] >= 0 ? Math.floor((sl[0] % 1) * 4096 + 0.5) : -1, cS, side];
};
const out: any = { cap: capDir, places: [] }; const DET: any[] = [];
const done = new Map<string, number[]>(); // pixel -> cached [ink after s6, K, s7]
const pxOf = (X: number, Y: number): number[] => {
  const kk = X + "," + Y; const hit = done.get(kk); if (hit) return hit;
  const x = (X + 0.5 - A[4]) / A[0], y = (Y + 0.5 - A[5]) / A[3];
  const o = ev.eval(x, y); const ink = o.ink;
  let r = [ink, ink, ink, 0, 0, 0];
  if (o.chain >= 0 && ink > 0.05) {
    const oc = { chain: o.chain, s: o.s };
    let key = BIG;
    for (let j = 0; j < E.np; j++) if (E.pc[j] === oc.chain && E.ps[j] === oc.s && E.pd[j] < h + aa) { key = E.pkey[j]; break; }
    if (key >= BIG) for (let k = 0; k < T.nK; k++) {
      if (T.kCa[k] === oc.chain && T.kSa[k] === oc.s) { key = T.kZa[k] - zt; break; }
      if (T.kCb[k] === oc.chain && T.kSb[k] === oc.s) { key = T.kZb[k] - zt; break; }
    }
    if (key < BIG) { const g = VS.map((V) => gapG(V, oc, x, y, key)); if (BOX) DET.push({ X, Y, ink: +ink.toFixed(2), ch: o.chain, s: +o.s.toFixed(3), wk: o.winKind, wa: o.winA, g: g.map((q) => q.map((v) => +(+v).toFixed(3))) }); r = [ink * (1 - g[0][0]), ink * (1 - g[1][0]), ink * (1 - g[2][0]), g[0][1], g[1][1], g[2][1]]; }
  }
  done.set(kk, r); return r;
};
const devOf = (c: number, k: number): number[] => { const sm = G.chainSamples[c]; const kk = Math.max(0, Math.min(k, sm.count - 1)); return [sm.positions[2 * kk] * A[0] + A[4], sm.positions[2 * kk + 1] * A[3] + A[5]]; };
// s7b: per disk "X,Y,R[,label]" (sBox, ';'-separated), the cut pixels (g > 0.3) of the s6 and s7 tables by term
// (1 = the loop term, 2 = the far term), how many of s7's carry the far-off flag, and the crossings (slot over chain cS)
if (sBox) {
  for (const spec of sBox.split(";")) {
    const [cx, cy, rr, lab] = spec.split(","); const X0 = +cx, Y0 = +cy, R = +rr;
    const c6 = [0, 0, 0], c7 = [0, 0, 0]; let fo7 = 0, ink = 0; const cs = new Map<string, number>();
    for (let Y = Y0 - R; Y <= Y0 + R; Y++) for (let X = X0 - R; X <= X0 + R; X++) {
      if ((X - X0) ** 2 + (Y - Y0) ** 2 > R * R) continue;
      DET.length = 0; done.delete(X + "," + Y); pxOf(X, Y); const d = DET[0]; if (!d || d.ink <= 0.3) continue; ink++;
      const g6 = d.g[0], g7 = d.g[2];
      if (g6[0] > 0.3) c6[g6[1]]++;
      if (g7[0] > 0.3) { c7[g7[1]]++; if (g7[5] >= 1024) fo7++; const k = `ch${d.ch}/o${g7[6]}${g7[5] >= 1024 ? "F" : ""}${g7[1] === 2 ? "far" : "loop"}${d.wk === 2 ? "/fil" + d.wa : ""}/s${d.s.toFixed(1)}`; cs.set(k, (cs.get(k) ?? 0) + 1); }
    }
    console.log(`${lab ?? ""} at ${X0},${Y0} R${R}: ink ${ink} | s6 cut loop ${c6[1]} far ${c6[2]} | s7 cut loop ${c7[1]} far ${c7[2]} (far-off flag on ${fo7}) | ${[...cs].map(([k, n]) => k + ":" + n).join(" ")}`);
  }
  process.exit(0);
}
for (const p of TJ.places) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let k = p.k0; k <= p.k1; k++) { const d = devOf(p.c, k); x0 = Math.min(x0, d[0]); y0 = Math.min(y0, d[1]); x1 = Math.max(x1, d[0]); y1 = Math.max(y1, d[1]); }
  x0 = Math.floor(x0 - PAD); y0 = Math.floor(y0 - PAD); x1 = Math.ceil(x1 + PAD); y1 = Math.ceil(y1 + PAD);
  const a = p.rule === "K" ? 0 : 1, b = a + 1;
  let n = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, more = 0, less = 0;
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const r = pxOf(X, Y);
    const d = r[b] - r[a];
    if (Math.abs(d) > 0.1) { n++; if (d > 0) more++; else less++; bx0 = Math.min(bx0, X); by0 = Math.min(by0, Y); bx1 = Math.max(bx1, X); by1 = Math.max(by1, Y); }
  }
  out.places.push({ ...p, box: [x0, y0, x1, y1], n, inkMore: more, inkLess: less, bbox: n ? [bx0, by0, bx1, by1] : null });
}
writeFileSync(op, JSON.stringify(out));
const nK = out.places.filter((p: any) => p.rule === "K" && p.n > 0).length, nC = out.places.filter((p: any) => p.rule === "C" && p.n > 0).length;
console.log(`${capDir.split(/[\\/]/).pop()}: K ${nK} places with px, C ${nC} places with px (of ${TJ.nK}, ${TJ.nC} runs); evals ${done.size}`);

// K1451: the scan's evaluator: src's GfEval with probe-only composite variants. Env K1451_F = the tie window as a
// fraction of zt (1 = src); K1451_MODE: "" (src's blend over the window), "dz" (the window spans zt only where the
// keys' gap comes from depth: a pure-distance tie, z equal, switches within F zt).
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const ss = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export async function loadEv(): Promise<(T: any) => any> {
  const F = process.env.K1451_F; const mode = process.env.K1451_MODE ?? "";
  return (T) => {
    const E: any = new GfEval(T);
    const wk = process.env.K1451_WIN ? +process.env.K1451_WIN : 0;
    if (wk > 0) {
      // per-pin depth window: max(win, wk * the overlap reach at the pin's crossing, h (1/tan + 1/sin)); probe only
      const at = (c: number, s: number): number[] => {
        const v0 = T.cV0[c], nv = T.cNV[c]; const s0 = T.vs[v0], len = T.cLen[c]; let u = s;
        if (T.cClosed[c]) { u = (s - s0) % len; if (u < 0) u += len; u += s0; }
        let lo = v0, hi = v0 + nv - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.vs[m] <= u) lo = m; else hi = m; }
        const l = T.vs[lo + 1] - T.vs[lo]; const t = l > 0 ? Math.min(1, Math.max(0, (u - T.vs[lo]) / l)) : 0;
        const dx = T.vx[lo + 1] - T.vx[lo], dy = T.vy[lo + 1] - T.vy[lo]; const dl = Math.hypot(dx, dy) || 1;
        return [T.vx[lo] + dx * t, T.vy[lo] + dy * t, dx / dl, dy / dl];
      };
      const nP = T.pinS.length; const P: number[][] = new Array(nP); const pc = new Int32Array(nP);
      for (let c = 0; c < T.nC; c++) for (let i = 0; i < T.cPinN[c]; i++) { const b = T.cPin0[c] + i; pc[b] = c; P[b] = at(c, T.pinS[b]); }
      const pw = new Float64Array(nP).fill(T.win); const pwR = new Float64Array(nP).fill(T.win); let paired = 0;
      const mode2 = process.env.K1451_WINM ?? "angle";
      // reach mode: along the pin's chain, the arc over which the partner pass stays within 2h (ribbons overlap)
      const distTo = (c: number, sc: number, x: number, y: number, span: number): number => {
        let bd = Infinity; for (let t = -span; t <= span; t += 0.05 * T.h) { const q = at(c, sc + t); const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) bd = d; } return bd;
      };
      for (let a = 0; a < nP; a++) {
        let best = -1, bd = +(process.env.K1451_PTOL ?? 1) * T.h;
        for (let b = 0; b < nP; b++) { if (b === a) continue; const d = Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]); if (d < bd && T.pinZ[a] * T.pinZ[b] < 0) { bd = d; best = b; } }
        if (best < 0) continue; paired++;
        const sn = Math.max(0.2, Math.abs(P[a][2] * P[best][3] - P[a][3] * P[best][2])); const cs = Math.abs(P[a][2] * P[best][2] + P[a][3] * P[best][3]);
        if (mode2 === "reach") {
          for (const dir of [-1, 1]) {
            let r = 0; const cap = 10 * T.h;
            for (let t = 0.1 * T.h; t <= cap; t += 0.1 * T.h) { const q = at(pc[a], T.pinS[a] + dir * t); if (distTo(pc[best], T.pinS[best], q[0], q[1], cap + 2 * T.h) > 2 * T.h) break; r = t; }
            const wv = Math.max(T.win, wk * r); if (dir < 0) pw[a] = wv; else pwR[a] = wv;
          }
        } else if (mode2 === "sin") { pw[a] = Math.max(T.win, wk * 2 * T.h / Math.max(0.05, Math.abs(Math.sin(T.pinTheta ? T.pinTheta[a] : Math.asin(sn))))); pwR[a] = pw[a]; }
        else { pw[a] = Math.max(T.win, wk * T.h * (cs / sn + 1 / sn)); pwR[a] = pw[a]; }
      }
      if (process.env.K1451_WINLOG) console.error(`pins ${nP} paired ${paired} win ${T.win} max ${Math.max(...pw).toFixed(3)} widened ${Array.from(pw).filter((x) => x > T.win).length}+${Array.from(pwR).filter((x) => x > T.win).length} maxR ${Math.max(...pwR).toFixed(3)}`);
      if (process.env.K1451_WINK === "1") { const od = GfEval.prototype["depth"]; const om = GfEval.prototype["member"]; E.member = function (c: number, s: number): void { om.call(this, c, s, od.call(this, c, s)); }; }
      E.depth = function (c: number, s: number): number {
        const n = T.cPinN[c]; if (n === 0) return 0;
        const b = T.cPin0[c]; let u = s; const len = T.cLen[c];
        if (T.cClosed[c]) { u = (s - T.cS0[c]) % len; if (u < 0) u += len; u += T.cS0[c]; }
        let lo = -1; let hi = n;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.pinS[b + m] <= u) lo = m; else hi = m; }
        const hat = (z: number, d: number, w: number): number => (w <= 1e-12 ? (d <= 0 ? z : 0) : d >= w ? 0 : z * (1 - d / w));
        if (T.cClosed[c]) {
          const iL = lo < 0 ? n - 1 : lo; const sL = lo < 0 ? T.pinS[b + iL] - len : T.pinS[b + iL];
          const iR = lo + 1 >= n ? 0 : lo + 1; const sR = lo + 1 >= n ? T.pinS[b + iR] + len : T.pinS[b + iR];
          const g = sR - sL; return hat(T.pinZ[b + iL], u - sL, Math.min(pwR[b + iL], g)) + hat(T.pinZ[b + iR], sR - u, Math.min(pw[b + iR], g));
        }
        if (lo < 0) return hat(T.pinZ[b], T.pinS[b] - u, pw[b]);
        if (lo + 1 >= n) return hat(T.pinZ[b + n - 1], u - T.pinS[b + n - 1], pwR[b + n - 1]);
        const g = T.pinS[b + lo + 1] - T.pinS[b + lo];
        return hat(T.pinZ[b + lo], u - T.pinS[b + lo], Math.min(pwR[b + lo], g)) + hat(T.pinZ[b + lo + 1], T.pinS[b + lo + 1] - u, Math.min(pw[b + lo + 1], g));
      };
    }
    const cm = process.env.K1451_CFG ?? "";
    if (cm) {
      // configuration mix variants: "max" = the heaviest configuration only; "min" = the least ink of the weighted ones
      const rs: number[] = [], cs: number[] = [];
      const oc = E.composite.bind(E); E.composite = (): number => { const r = oc(); rs.push(r); cs.push(E.cCov); return r; };
      const oe = E.eval.bind(E);
      E.eval = (x: number, y: number): any => {
        rs.length = 0; cs.length = 0; const o = oe(x, y);
        if (rs.length < 2 || o.winKind === 5) return o;
        const rr: number[] = []; for (let j = 0; j < E.np; j++) if (E.pg[j] >= 0 && E.pramp[j] > 0 && E.pramp[j] < 1) rr.push(E.pramp[j]);
        rr.sort((a, b) => b - a); const ws: number[] = []; for (let c = 0; c <= rr.length; c++) { const w = (c === 0 ? 1 : rr[c - 1]) - (c === rr.length ? 0 : rr[c]); if (w > 0) ws.push(w); }
        if (ws.length !== rs.length) return o;
        let bi = 0; for (let i = 1; i < ws.length; i++) if (ws[i] > ws[bi]) bi = i;
        if (cm === "max") { o.ink = Math.min(1, rs[bi]); o.cov = Math.min(1, cs[bi]); }
        else if (cm === "min") { o.ink = Math.min(...rs); }
        return o;
      };
    }
    if ((F === undefined || F === "" || +F === 1) && mode === "") return E;
    const f = F === undefined || F === "" ? 1 : +F;
    E.composite = function (this: any): number {
      const ns = this.ns; const zt = this.T.zt;
      const comp = (sw: number): number => {
        let Tt = 1; let ink = 0; let best = 0;
        for (let i = 0; i < ns; i++) {
          let e = this.sord[i]; if (sw >= 0 && i === sw) e = this.sord[i + 1]; else if (sw >= 0 && i === sw + 1) e = this.sord[i - 1];
          const c = Tt * this.sv[e];
          if (c > 0) { ink += c; if (c > best && sw < 0) { best = c; this.cWk = this.swk[e]; this.cWa = this.swa[e]; this.cWb = this.swb[e]; } }
          Tt *= 1 - this.sa[e];
          if (!(Tt > 0)) break;
        }
        if (sw < 0) this.cCov = 1 - Math.max(Tt, 0);
        return Math.min(1, ink);
      };
      this.cWk = 0; this.cWa = -1; this.cWb = 0;
      let r = comp(-1); const w = zt * f;
      for (let i = 0; i + 1 < ns; i++) {
        const gap = this.skey[this.sord[i]] - this.skey[this.sord[i + 1]];
        let ww = w;
        if (mode === "dz") {
          const ia = this.sid[this.sord[i]], ib = this.sid[this.sord[i + 1]];
          if (ia < 0 && ib < 0) { let za = 0, zb = 0; for (let j = 0; j < this.np; j++) { if (this.psurf[j] === ia) za = this.pz[j]; if (this.psurf[j] === ib) zb = this.pz[j]; } ww = Math.min(w, Math.abs(za - zb)); }
        }
        if (!(gap < w)) continue;
        if (!(gap < ww)) continue;
        const r2 = comp(i);
        if (r2 === r) continue;
        const t = ww > 1e-9 ? ss(-ww, ww, gap) : (gap > 0 ? 1 : 0.5);
        r = t * r + (1 - t) * r2;
        break;
      }
      return r;
    };
    return E;
  };
}

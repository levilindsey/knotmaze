// K1202 task 3g: the shader's band loop run in the page, on the live
// recordData() and the live uniforms, at e210's centreline points (row 14).
//   node px5_cyc.mjs
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const st = STANDS.cyc;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  await page.evaluate(PIN);
  const t = 100 + (14 * 1.5 * (2.5 / 1.6)) / 72;
  await setState(page, { t, dbg: 5, webs: true });
  const out = await page.evaluate(async (tt) => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const pts = [];
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(210, i / 256); pts.push([q.wx, q.wy]); }
    const samp = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L * 34.83));
      for (let j = 0; j < n; j++) samp.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
    }
    const JF = await import("/src/render/junction_field.ts");
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = JF.recordData().data;
    const U = MD.knotUniformValues();
    const fp = r.fieldProbe, rb = fp.record(69);
    const hd = rb * 4;
    const nr = Math.round(D[hd + 4 + 3]);
    let base = Math.round(D[hd + 3]);
    for (let i = 0; i < nr; i++) base += 1 + Math.round(D[base * 4]);
    const np = Math.round(D[base * 4]);
    const bands = [];
    let pb = base + 1;
    for (let i = 0; i < np; i++) {
      const nv = Math.round(D[pb * 4]);
      const verts = [];
      for (let v = 0; v < nv; v++) { const o = (pb + 4 + v) * 4; verts.push([D[o], D[o + 1], D[o + 2], D[o + 3]]); }
      bands.push({ nv, distJ: D[(pb + 1) * 4], flags: D[(pb + 1) * 4 + 1], code: D[(pb + 1) * 4 + 3], P: [D[(pb + 2) * 4], D[(pb + 2) * 4 + 1], D[(pb + 2) * 4 + 2]], side: [D[(pb + 3) * 4], D[(pb + 3) * 4 + 1], D[(pb + 3) * 4 + 2]], gR: D[(pb + 2) * 4 + 3], verts });
      pb += 4 + nv;
    }
    const C = { CW: 0.72, CR: 0.5, PF: 0.38, PCB: 0.62, PCR: 0.55, PFR: 2.0, PRF: 0.5 };
    const s01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
    const reachWin = (d) => 1 - s01((d - (U.uKReach ? 3 : 3) ) / 1);
    const crestK = (dG, inw, bk) => {
      const s = U.uKPulse[2], raw = inw ? dG + U.uKPulse[0] : dG - U.uKPulse[1];
      const ph = raw - s * Math.floor(raw / s), dist = Math.min(ph, s - ph);
      const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
      const bump = Math.max(0, 1 - dist / C.CW) * Math.min(1, dC / C.CR) * bk;
      const floor = (C.PF + C.PCB * Math.max(0, 1 - dG / C.PCR)) * Math.max(0, 1 - dG / C.PFR);
      return Math.min(1, floor + bump * 0.9) * U.uKPulse[3] * (1 - s01((dG - (3 - 1)) / 1));
    };
    const pxW = 1 / 34.83;
    const bandAt = (b, x, y) => {
      const verts = b.verts, nv = b.nv, code = Math.round(b.code);
      const kA = code % 64, kB = Math.floor(code / 64) % 64, piv = code >= 4096;
      const [vx, vy] = verts[0], prx = x - vx, pry = y - vy;
      const [PX, PY, PW] = b.P;
      let best = 1e20, tau = 0, s0 = PY * prx - PX * pry, hit = false, tauP = 0, eA0 = 0, eA1 = 0, eB0 = 0, eB1 = 0, q0 = 0, a0x = 0, a0y = 0;
      for (let kk = 0; kk < nv - 1; kk++) {
        const q1 = kk + 1;
        const dx = verts[q1][0] - verts[q0][0], dy = verts[q1][1] - verts[q0][1];
        const wx = x - verts[q0][0], wy = y - verts[q0][1];
        const l2 = dx * dx + dy * dy, u = l2 > 1e-12 ? Math.min(1, Math.max(0, (wx * dx + wy * dy) / l2)) : 0;
        const dd = (wx - dx * u) ** 2 + (wy - dy * u) ** 2;
        if (dd < best) { best = dd; tau = verts[q0][2] + (verts[q1][2] - verts[q0][2]) * u; }
        const a1x = verts[q1][0] - vx, a1y = verts[q1][1] - vy, e1x = a1x - prx, e1y = a1y - pry;
        const s1 = PW * (a1x * pry - a1y * prx) + (PX * e1y - PY * e1x);
        if (kk === kA) { eA0 = q0; eA1 = q1; }
        if (kk + 1 === kB) { eB0 = q0; eB1 = q1; }
        if (piv && !hit && kk >= kA && kk < kB && s0 !== s1 && ((s0 <= 0 && s1 >= 0) || (s0 >= 0 && s1 <= 0))) {
          const us = s0 / (s0 - s1), qhx = a0x + (a1x - a0x) * us, qhy = a0y + (a1y - a0y) * us;
          if ((PW * qhx - PX) * (PW * prx - PX) + (PW * qhy - PY) * (PW * pry - PY) > 0) { hit = true; tauP = verts[q0][2] + (verts[q1][2] - verts[q0][2]) * us; }
        }
        q0 = q1; a0x = a1x; a0y = a1y; s0 = s1;
      }
      if (piv) {
        if (hit) tau = tauP;
        else {
          const sd = b.side, end = sd[0] * prx + sd[1] * pry + sd[2] < 0 ? [eA0, eA1] : [eB0, eB1];
          const [i0, i1] = end, tx = verts[i1][0] - verts[i0][0], ty = verts[i1][1] - verts[i0][1], tl = Math.hypot(tx, ty);
          tau = verts[i0][2] + ((x - verts[i0][0]) * tx + (y - verts[i0][1]) * ty) / tl;
        }
      }
      const dnow = Math.sqrt(best), cov = Math.min(1, Math.max(0, (0.26 + 0.5 * pxW - dnow) / pxW));
      let g = b.distJ + tau, inw = b.flags % 2 === 1, bk = 1;
      const gR = Math.abs(b.gR);
      if (tau > 0 && gR > 0) { bk = Math.min(1, Math.abs(g - gR) / C.PRF); if (g > gR) { g = 2 * gR - g; inw = b.gR < 0; } }
      return { tau, dnow, cov, cr: crestK(g, inw, bk), hit, piv };
    };
    return {
      uKPulse: [...U.uKPulse], np, rb,
      bands: bands.map((b) => ({ distJ: b.distJ, flags: b.flags, code: b.code, gR: b.gR, nv: b.nv })),
      rows: [16, 18, 20, 21, 22, 24].map((c) => ({ c, bs: bands.map((b) => bandAt(b, samp[c][0], samp[c][1])) })),
    };
  }, t);
  console.log(`live uKPulse ${JSON.stringify(out.uKPulse)} np ${out.np} rb ${out.rb} bands ${JSON.stringify(out.bands)}`);
  for (const r of out.rows) console.log(`col ${r.c}: ${r.bs.map((b) => `tau ${b.tau.toFixed(3)} d ${b.dnow.toFixed(3)} cov ${b.cov.toFixed(2)} cr ${b.cr.toFixed(3)} -> ${(b.cr * b.cov * 255).toFixed(0)}${b.piv ? (b.hit ? " (ray hit)" : " (ray miss)") : ""}`).join(" | ")}`);
  await page.close();
} finally { await browser.close(); }

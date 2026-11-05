// K1202 21C task 1: GPU pxW + effective cover at the kymograph's view.
// Cyc stand (link/moves verbatim from stands_cyc.mjs), clocks pinned as
// lib.mjs PIN does, row 14's moment (t 100.456). In page: live recordData
// bands of node_218 (rb via fieldProbe), the twin (px5_cyc's bandAt port,
// fan + strip cov) at each centreline column's exact world point and at
// its screenshot pixel centre's world point. On disk: debug-5 screenshot
// G at those pixels. GPU effective cover = (G/255)/cr of the other band.
//   node cov21c.mjs
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, toRGB } from "./png.mjs";

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
  const shot = toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png" }))));
  writeFileSync("out21c/cov_debug5.png", Buffer.from(await page.screenshot({ type: "png" })));
  const info = await page.evaluate(async (tt) => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const pts = [];
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(210, i / 256); pts.push([q.x, q.y, q.wx, q.wy]); }
    const samp = [], sampScr = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay, awx, awy] = pts[i], [bx, by, bwx, bwy] = pts[i + 1];
      const L = Math.hypot(bx - ax, by - ay) * 1.5, n = Math.max(1, Math.round(L));
      for (let j = 0; j < n; j++) { sampScr.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]); samp.push([awx + ((bwx - awx) * j) / n, awy + ((bwy - awy) * j) / n]); }
    }
    const JF = await import("/src/render/junction_field.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = JF.recordData().data;
    const U = MD.knotUniformValues();
    const fp = r.fieldProbe;
    // node_218 is ji 69 on this stand (20C: rb 5363, band code 6661);
    // verify by its pulse section, else search every junction for it.
    const walk = (rb0) => {
      const hd0 = rb0 * 4;
      const nr0 = Math.round(D[hd0 + 4 + 3]);
      let b0 = Math.round(D[hd0 + 3]);
      if (!(b0 > 0)) return null;
      for (let i = 0; i < nr0; i++) b0 += 1 + Math.round(D[b0 * 4]);
      const np0 = Math.round(D[b0 * 4]);
      let pb0 = b0 + 1, ok = false;
      for (let i = 0; i < np0; i++) { const nv0 = Math.round(D[pb0 * 4]); if (Math.round(D[(pb0 + 1) * 4 + 3]) === 6661) ok = true; pb0 += 4 + nv0; }
      return ok ? { base: b0, np: np0 } : null;
    };
    let rb = fp.record(69);
    if (rb < 0 || !walk(rb)) { rb = -1; for (let ji = 0; ji < 1024 && rb < 0; ji++) { const q = fp.record(ji); if (q >= 0 && walk(q)) rb = q; } }
    if (rb < 0) throw new Error("node_218 record not found");
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
    const crestK = (dG, inw, bk) => {
      const s = U.uKPulse[2], raw = inw ? dG + U.uKPulse[0] : dG - U.uKPulse[1];
      const ph = raw - s * Math.floor(raw / s), dist = Math.min(ph, s - ph);
      const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
      const bump = Math.max(0, 1 - dist / C.CW) * Math.min(1, dC / C.CR) * bk;
      const floor = (C.PF + C.PCB * Math.max(0, 1 - dG / C.PCR)) * Math.max(0, 1 - dG / C.PFR);
      return Math.min(1, floor + bump * 0.9) * U.uKPulse[3] * (1 - s01((dG - (3 - 1)) / 1));
    };
    const bandAt = (b, x, y, pxW) => {
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
        else { const sd = b.side, end = sd[0] * prx + sd[1] * pry + sd[2] < 0 ? [eA0, eA1] : [eB0, eB1]; const [i0, i1] = end, tx = verts[i1][0] - verts[i0][0], ty = verts[i1][1] - verts[i0][1], tl = Math.hypot(tx, ty); tau = verts[i0][2] + ((x - verts[i0][0]) * tx + (y - verts[i0][1]) * ty) / tl; }
      }
      const dnow = Math.sqrt(best);
      const covFan = Math.min(1, Math.max(0, (0.26 + 0.5 * pxW - dnow) / pxW));
      const covStrip = Math.min(1, Math.max(0, (0.26 + 1.5 * pxW - dnow) / pxW));
      let g = b.distJ + tau, inw = b.flags % 2 === 1, bk = 1;
      const gR = Math.abs(b.gR);
      if (tau > 0 && gR > 0) { bk = Math.min(1, Math.abs(g - gR) / C.PRF); if (g > gR) { g = 2 * gR - g; inw = b.gR < 0; } }
      return { tau, dnow, covFan, covStrip, cr: crestK(g, inw, bk) };
    };
    const pxW = 1 / 34.83;
    const rows = [];
    for (let c = 14; c <= 25; c++) {
      const scr = sampScr[c], exact = samp[c];
      // screenshot device pixel containing the centreline point; its centre in CSS, then world
      const devX = Math.floor(scr[0] * 1.5), devY = Math.floor(scr[1] * 1.5);
      const wpc = k.toWorld((devX + 0.5) / 1.5, (devY + 0.5) / 1.5);
      rows.push({ c, dev: [devX, devY], exact: bands.map((b) => bandAt(b, exact[0], exact[1], pxW)), pix: bands.map((b) => bandAt(b, wpc.wx ?? wpc.x, wpc.wy ?? wpc.y, pxW)) });
    }
    const cv = document.querySelector("canvas");
    return { rows, view: window.__knotView(), dpr: window.devicePixelRatio, canvas: cv ? [cv.width, cv.height, cv.clientWidth, cv.clientHeight] : null, uJ: null, rb, np };
  }, t);
  console.log(`view s ${info.view.s} dpr ${info.dpr} canvas buffer/client ${JSON.stringify(info.canvas)} rb ${info.rb} np ${info.np} shot ${shot.W}x${shot.H}`);
  const G = (x, y) => shot.data[(y * shot.W + x) * 3 + 1];
  for (const r of info.rows) {
    const g = G(r.dev[0], r.dev[1]);
    const e0 = r.exact[0], p0 = r.pix[0];
    const covEff = (g / 255) / p0.cr;
    console.log(`col ${r.c}: GPU G ${g} | exact d ${e0.dnow.toFixed(4)} stripCov ${e0.covStrip.toFixed(3)} cr ${e0.cr.toFixed(3)} -> ${(e0.cr * e0.covStrip * 255).toFixed(0)} | pixC d ${p0.dnow.toFixed(4)} stripCov ${p0.covStrip.toFixed(3)} cr ${p0.cr.toFixed(3)} -> ${(p0.cr * p0.covStrip * 255).toFixed(0)} fanCov ${p0.covFan.toFixed(3)} | covEff ${covEff.toFixed(3)} (band1 pix ${(r.pix[1].cr * r.pix[1].covStrip * 255).toFixed(0)})`);
  }
  await page.close();
} finally { await browser.close(); }

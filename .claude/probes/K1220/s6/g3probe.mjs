// K1220 S6 debug: G3 mirrors (SAMP/RADII/CHAIN) + CPU sdMiterQuad replica.
//   node g3probe.mjs <host> <word> <xh> <chain> <x,y>...
import { openBrowser, sleep, frames, PIN } from "./lib.mjs";
const [, , HOST, WORD, XH, CH, ...PTS] = process.argv;
const hash = XH === "xh2" ? "glyphs2=xh2" : "glyphs2";
const url = `${HOST}/?7&txt=${WORD}&snd=none&phw=0&am=instant&fw=0#${hash}`;
const browser = await openBrowser();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    const a = await page.evaluate(() => { const p = window.__knotPerf && window.__knotPerf(); return !!(p && p.asleep); });
    if (a) break;
  }
  await sleep(500);
  await page.evaluate((pinSrc) => { new Function("return (" + pinSrc + ")")()(); }, PIN.toString());
  await frames(page, 3);
  const out = await page.evaluate((chain, pts) => {
    const r = window.__knotRenderer();
    const [sampT, radT, chainT] = r.g3TableRows();
    const S = sampT.data, RD = radT.data, CD = chainT.data;
    const fh = r.style.threadWidth / 2;
    const co = chain * 8;
    const sampBase = CD[co], radBase = CD[co + 1];
    const sampAt = (i) => { const o = (sampBase + i) * 2; return [S[o], S[o + 1]]; };
    const radAt = (i) => (radBase >= 0 ? RD[radBase + i] : fh);
    const sdSeg = (p, a, b) => {
      const ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey;
      let u = l2 > 1e-12 ? ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / l2 : 0;
      u = Math.max(0, Math.min(1, u));
      return Math.hypot(p[0] - (a[0] + ex * u), p[1] - (a[1] + ey * u));
    };
    const sdMiter = (p, p0, p1, p2, p3, r1, r2) => {
      // fabric_sdf sdMiterQuad, verbatim maths.
      const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
      const nrm = (v) => { const l = Math.hypot(v[0], v[1]); return l > 1e-9 ? [v[0] / l, v[1] / l] : [0, 0]; };
      let d1 = sub(p2, p1); const l1 = Math.hypot(d1[0], d1[1]);
      if (l1 < 1e-9) return 1e9;
      d1 = [d1[0] / l1, d1[1] / l1];
      let dp = sub(p1, p0); dp = Math.hypot(dp[0], dp[1]) > 1e-9 ? nrm(dp) : d1;
      let dn = sub(p3, p2); dn = Math.hypot(dn[0], dn[1]) > 1e-9 ? nrm(dn) : d1;
      const np1 = [-d1[1], d1[0]];
      const b1 = [-dp[1] + np1[0], dp[0] + np1[1]];
      const b2 = [-dn[1] + np1[0], dn[0] + np1[1]];
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
      const s1 = 1 / Math.max(dot(nrm([b1[0] + 1e-9, b1[1]]), np1), 0.35);
      const s2 = 1 / Math.max(dot(nrm([b2[0] + 1e-9, b2[1]]), np1), 0.35);
      const nb1 = nrm([b1[0] + 1e-9, b1[1]]), nb2 = nrm([b2[0] + 1e-9, b2[1]]);
      const A = [p1[0] + nb1[0] * r1 * s1, p1[1] + nb1[1] * r1 * s1];
      const B = [p2[0] + nb2[0] * r2 * s2, p2[1] + nb2[1] * r2 * s2];
      const C = [p2[0] - nb2[0] * r2 * s2, p2[1] - nb2[1] * r2 * s2];
      const D = [p1[0] - nb1[0] * r1 * s1, p1[1] - nb1[1] * r1 * s1];
      const d = Math.min(Math.min(sdSeg(p, A, B), sdSeg(p, B, C)), Math.min(sdSeg(p, C, D), sdSeg(p, D, A)));
      const cr = (a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const c1 = cr(A, B), c2 = cr(B, C), c3 = cr(C, D), c4 = cr(D, A);
      const inside = (c1 >= 0 && c2 >= 0 && c3 >= 0 && c4 >= 0) || (c1 <= 0 && c2 <= 0 && c3 <= 0 && c4 <= 0);
      return inside ? -d : d;
    };
    const res = { chain, sampBase, radBase, caps: [CD[co + 2], CD[co + 3]], fh, pts: [] };
    const cs = r.chainSamples[chain];
    res.csCount = cs.count;
    res.rad1525 = [];
    for (let k = 14; k <= 26; k++) res.rad1525.push(+radAt(k).toFixed(3));
    res.wl1525 = [];
    const wl = r.widthLast[chain];
    for (let k = 14; k <= 26; k++) res.wl1525.push(wl ? +wl[k].toFixed(3) : null);
    for (const ps of pts) {
      const p = ps.split(",").map(Number);
      let best = 1e9, bk = -1, bestCap = 1e9;
      for (let k = 0; k + 1 < cs.count; k++) {
        const sd = sdMiter(p, sampAt(Math.max(k - 1, 0)), sampAt(k), sampAt(k + 1), sampAt(Math.min(k + 2, cs.count - 1)), radAt(k), radAt(k + 1));
        if (sd < best) { best = sd; bk = k; }
        const cap = sdSeg(p, sampAt(k), sampAt(k + 1)) - radAt(k);
        if (cap < bestCap) bestCap = cap;
      }
      res.pts.push(`${p}: miter=${best.toFixed(4)} k${bk} capsule=${bestCap.toFixed(4)}`);
    }
    return res;
  }, Number(CH), PTS);
  console.log(JSON.stringify(out, null, 1));
} finally { await browser.close(); }

// K1220 S6 debug: record S6 texels + CPU sdMiterQuad at world points.
//   node sdfprobe.mjs <host> <word> <xh> <ji> <x,y>...
import { openBrowser, sleep, frames, PIN } from "./lib.mjs";
const [, , HOST, WORD, XH, JI, ...PTS] = process.argv;
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
  const out = await page.evaluate(async (ji, pts) => {
    const r = window.__knotRenderer(), fp = r.fieldProbe;
    const JF = await import("/src/render/junction_field.ts");
    const J = JF.recordData().data;
    const rb = fp.record(ji);
    const profN = Math.round(JF.recordData ? 0 : 0);
    const U = await import("/src/render/paint_model.ts").catch(() => null);
    const arms = fp.arms(ji);
    const fh = r.style.threadWidth / 2;
    // profN from uJParams: read via a record's stride? use fieldProfLen on joinery (facade accessor?)
    const profLen = r.fieldProfLen || 0;
    const stride = 4 + 2 * profLen;
    const res = { rb, fh, profLen, raw: Array.from(J.slice(0, 16)).map((v) => +v.toFixed(3)), arms: [], pts: [] };
    const n = arms.length;
    for (let i = 0; i < n; i++) {
      const a = arms[i];
      const chain = a.chain;
      const cs = r.chainSamples[chain];
      const cntS = cs.count, totS = cs.totalLength;
      res.arms.push({
        i, chain, dir: a.dir, slot: a.slot, arc0: +a.arc0.toFixed(3), domain: +a.domain.toFixed(3), toEnd: a.closed ? 1e9 : +a.toEnd.toFixed(3), closed: a.closed,
        sampJoint: +(a.closed ? (a.arc0 / totS) * cntS : (a.arc0 / totS) * Math.max(cntS - 1, 1)).toFixed(2),
        per: +(a.closed ? cntS / totS : Math.max(cntS - 1, 1) / totS).toFixed(2),
        csCount: cntS, csTotal: +totS.toFixed(3),
        sampBase: r.g3SampBase ? r.g3SampBase(chain) : -1,
      });
    }
    const sdSeg = (p, a, b) => {
      const ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey;
      let u = l2 > 1e-12 ? ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / l2 : 0;
      u = Math.max(0, Math.min(1, u));
      return Math.hypot(p[0] - (a[0] + ex * u), p[1] - (a[1] + ey * u));
    };
    for (const ps of pts) {
      const p = ps.split(",").map(Number);
      const per = [];
      for (const a of res.arms) {
        const cs = r.chainSamples[a.chain];
        if (!cs) continue;
        const wl = r.widthLast[a.chain];
        let best = 1e9, bk = -1;
        for (let k = 0; k + 1 < cs.count; k++) {
          const A = [cs.positions[k * 2], cs.positions[k * 2 + 1]];
          const B = [cs.positions[k * 2 + 2], cs.positions[k * 2 + 3]];
          const wm = wl ? wl[k] : 1;
          const d = sdSeg(p, A, B) - fh * wm;
          if (d < best) { best = d; bk = k; }
        }
        per.push(`arm${a.i}c${a.chain}: rel=${best.toFixed(4)} k${bk}`);
      }
      res.pts.push(`${p}: ${per.join(" | ")}`);
    }
    return res;
  }, Number(JI), PTS);
  console.log(JSON.stringify(out, null, 1));
} finally { await browser.close(); }

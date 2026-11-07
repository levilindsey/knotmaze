// K1228: one K1220 S2 text stand on one host (rest, pinned), dumping
// its tight samples (R < 1.05 h, device px of the DSF-2 shot) as
// tight.json for diffa.mjs. The stand's rest.png already comes from
// shoot_text.mjs; this only measures geometry in the same view.
//   node textgeo.mjs <host> <word> <xh> <out.json>
import { writeFileSync } from "node:fs";
import { openBrowser, sleep, frames, PIN } from "./lib_text.mjs";

const [host, word, xh, out] = process.argv.slice(2);
const DSF = 2;
const browser = await openBrowser();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: DSF });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument((pinSrc) => { window.__k1220pin = pinSrc; }, PIN.toString());
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
  });
  const hash = xh === "xh2" ? "glyphs2=xh2" : "glyphs2";
  await page.goto(`${host}/?7&txt=${word}&snd=none&phw=0&am=instant&fw=0#${hash}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    const asleep = await page.evaluate(() => { const p = window.__knotPerf ? window.__knotPerf() : null; return !!(p && p.asleep); });
    if (asleep) break;
  }
  await page.evaluate(() => {
    const pin = new Function("return (" + window.__k1220pin + ")")();
    pin();
    const F = window.__knotFabricRenderer && window.__knotFabricRenderer();
    if (F) F.exploreClock = 1000;
  });
  await frames(page, 4);
  await sleep(200);
  const geo = await page.evaluate((dsf) => {
    const r = window.__knotRenderer(), v = window.__knotView();
    const h = r.style.threadWidth / 2;
    const hDev = h * v.s * dsf;
    const tight = [];
    r.chainSamples.forEach((cs, c) => {
      if (!cs || !cs.positions) return;
      const P = cs.positions, n = P.length / 2;
      for (let j = 0; j < n; j++) {
        const p = cs.closed ? (j - 1 + n) % n : Math.max(j - 1, 0);
        const q = cs.closed ? (j + 1) % n : Math.min(j + 1, n - 1);
        if (p === j || q === j) continue;
        const ax = P[j * 2] - P[p * 2], ay = P[j * 2 + 1] - P[p * 2 + 1];
        const bx = P[q * 2] - P[j * 2], by = P[q * 2 + 1] - P[j * 2 + 1];
        const turn = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
        if (turn < 1e-9) continue;
        const R = ((0.5 * (Math.hypot(ax, ay) + Math.hypot(bx, by))) / turn) * v.s * dsf;
        if (R < 1.05 * hDev)
          tight.push({ chain: c, j, R: +R.toFixed(1), x: Math.round((P[j * 2] * v.s + v.x) * dsf), y: Math.round((P[j * 2 + 1] * v.s + v.y) * dsf) });
      }
    });
    tight.sort((a, b) => a.R - b.R);
    return { hDev, tight };
  }, DSF);
  writeFileSync(out, JSON.stringify(geo, null, 1));
  console.log(`${word}_${xh} @ ${host}: hDev ${geo.hDev.toFixed(1)} tight ${geo.tight.length}`);
  await page.close();
} finally {
  await browser.close();
}

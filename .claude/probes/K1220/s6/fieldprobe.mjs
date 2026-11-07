// K1220 S6: field colour at given world points on one stand (probe only).
import { openBrowser, sleep, frames, PIN } from "./lib.mjs";
const [, , HOST, WORD, XH, JI, PTS] = process.argv;
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
  const out = await page.evaluate((ji, pts) => {
    const r = window.__knotRenderer(), fp = r.fieldProbe;
    const o = new Float32Array(4);
    return pts.map(([x, y]) => {
      const ok = fp.at(ji, x, y, o, 0.005);
      return { p: [x, y], ok, rgb: [o[0], o[1], o[2]].map((v) => +v.toFixed(3)), arms: fp.lastArms() };
    });
  }, Number(JI), JSON.parse(PTS));
  for (const r of out) console.log(JSON.stringify(r));
} finally { await browser.close(); }

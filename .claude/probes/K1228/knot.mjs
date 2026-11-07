// K1228: the knot-mode default link on one host, settled and pinned,
// shot whole-frame, with its tight samples (R < 1.05 h, device px) for
// the whole-frame diff attribution.
//   node knot.mjs <outDir>   (env K1211_HOST, set by locked.ps1)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, PIN, sleep, stampText, waitAsleep, HOST } from "./lib.mjs";

const OUT = resolve(process.argv[2]);
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
const log = [];
try {
  const page = await browser.newPage();
  page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: 1.5 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
  });
  await page.goto(`${HOST}/?7k&am=instant&fw=0&snd=none&phw=0&mf=0`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  await waitAsleep(page);
  await page.evaluate(PIN);
  await sleep(300);
  const geo = await page.evaluate(() => {
    const r = window.__knotRenderer(), v = window.__knotView();
    const h = r.style.threadWidth / 2;
    const hDev = h * v.s * 1.5;
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
        const R = ((0.5 * (Math.hypot(ax, ay) + Math.hypot(bx, by))) / turn) * v.s * 1.5;
        if (R < 1.05 * hDev)
          tight.push({ chain: c, j, R: +R.toFixed(1), x: Math.round((P[j * 2] * v.s + v.x) * 1.5), y: Math.round((P[j * 2 + 1] * v.s + v.y) * 1.5) });
      }
    });
    tight.sort((p2, q2) => p2.R - q2.R);
    return { hDev, tight };
  });
  writeFileSync(join(OUT, "rest.png"), await page.screenshot({ type: "png" }));
  writeFileSync(join(OUT, "tight.json"), JSON.stringify(geo, null, 1));
  console.log(`knot @ ${HOST}: tight ${geo.tight.length} hDev ${geo.hDev.toFixed(1)} stamp ${await stampText(page)}`);
} finally {
  await browser.close();
}

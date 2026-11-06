// K1208 Run K - K678 diagnostic: do fills carry round joins, in fabric
// and in knot mode, settled? One seed each.
//   node k678diag.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, sleep } from "./lib.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
const rows = [];
try {
  for (const mode of [
    { name: "fabric", q: "7&am=instant&fw=0&snd=none&phw=0" },
    { name: "knot", q: "7&am=instant&fw=0&snd=none&phw=0&mf=0" },
  ]) {
    const log = [];
    let page;
    if (mode.name === "knot") {
      page = await browser.newPage();
      page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
      page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
      await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: 1.5 });
      const cdp = await page.createCDPSession();
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
      await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLost = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); });
      const HOST = process.env.K22K_HOST || "http://127.0.0.1:5980";
      await page.goto(`${HOST}/?${mode.q}`, { waitUntil: "load", timeout: 90000 });
      await page.bringToFront();
      await page.mouse.move(2, 2);
      await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
    } else {
      page = await openPage(browser, mode.q, log);
    }
    await waitAsleep(page);
    await sleep(300);
    const res = await page.evaluate(() => {
      const r = window.__knotRenderer();
      let fills = 0, joinsTotal = 0, maxJoins = 0;
      for (const f of r.fills) {
        if (!f) continue;
        fills++;
        const j = f.joins ? f.joins.count : 0;
        joinsTotal += j;
        if (j > maxJoins) maxJoins = j;
      }
      return { fills, joinsTotal, maxJoins, junctions: r.junctionArms.length };
    });
    console.log(`${mode.name}: fills ${res.fills} joinsTotal ${res.joinsTotal} maxJoins ${res.maxJoins} junctions ${res.junctions}`);
    rows.push({ mode: mode.name, ...res });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "k678diag.json"), JSON.stringify(rows, null, 1));

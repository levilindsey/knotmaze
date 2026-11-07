// K1040 S4b: the fieldBand flag in the app. For each family link, loads the
// border look with `&fbb=1` and without it, waits, reads the build stamp,
// `__knotFieldB.stats`, the console, and screenshots both arms; then zooms
// the flag-on page (a camera scale change rebuilds form B) and drags it.
// Usage: node smoke.mjs <base> <outDir> [settleMs] [family,...]
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir, settleArg, only] = process.argv;
const settleMs = Number(settleArg ?? 6000);
mkdirSync(outDir, { recursive: true });
// The K868 scenes' links (.claude/probes/K868/scenes/*.diag.json pageUrl).
const LINKS = {
  muse: "3.EjB9R7b0Hkh6LIKXm6e4geDMC0g",
  def: "b.EnCgeSHoaDwZgWk",
  fat: "p9ar6.EihVJ8adf0_iA8kPQ0HgzAtI",
  ring: "1rphqy1.EhKJfM6RfQ-qdfRUv6b1RfpY8lE3w-PuHoaDwZgWk",
  user: "1471kin.EhSJeJH4_ol9B-mT9CXsPh8aFfclDHiTEvRLYyJg6Gg8GYFpA",
  g41def: "b.EiR9MnkD4eSHoaDwZgWk",
};
const fams = only ? only.split(",") : Object.keys(LINKS);
const profileDir = join(tmpdir(), `k1040-s4b-smoke-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = [];
try {
  for (const fam of fams) {
    for (const arm of ["on", "off"]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
      const logs = [];
      page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") logs.push(`${m.type()}: ${m.text()}`); });
      page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message}`));
      const url = `${base}/?${LINKS[fam]}&tlk=border${arm === "on" ? "&fbb=1" : ""}&am=instant&snd=none`;
      await page.goto(url, { waitUntil: "load" });
      // Only the app's canvas (Pixi's support-test canvas loses its own on purpose).
      await page.evaluate(() => {
        window.__lost = 0;
        for (const c of document.querySelectorAll("canvas")) c.addEventListener("webglcontextlost", () => { window.__lost++; });
      });
      await sleep(settleMs);
      const read = () => page.evaluate(() => {
        const divs = [...document.querySelectorAll("div")].map((d) => d.textContent ?? "");
        const fb = window.__knotFieldB;
        return {
          stamp: divs.find((t) => /^P\d/.test(t)) ?? "STAMP MISSING",
          search: location.search,
          lost: window.__lost,
          live: (() => { const p = window.__knotParams?.(); return p ? { fieldBand: p.fieldBand, threadLook: p.threadLook, labelInk: p.labelInk } : null; })(),
          labelInk: window.__knotRenderer?.()?.labelInk ?? null,
          fieldB: fb ? { ...fb.stats, camera: fb.camera ? [...fb.camera].map((v) => +v.toFixed(3)) : null } : null,
        };
      });
      const r0 = await read();
      await page.screenshot({ path: join(outDir, `smoke_${fam}_${arm}.png`) });
      const row = { fam, arm, url, ...r0 };
      if (arm === "on") {
        // A zoom (scale change: a rebuild), then a drag across the middle.
        // ctrl + wheel: the pinch path (a plain wheel reads as a trackpad pan, probes.md K73).
        await page.mouse.move(800, 450);
        await page.keyboard.down("Control");
        for (let i = 0; i < 4; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(40); }
        await page.keyboard.up("Control");
        await sleep(2000);
        row.afterZoom = (await read()).fieldB;
        await page.screenshot({ path: join(outDir, `smoke_${fam}_on_zoom.png`) });
        await page.mouse.down();
        for (let i = 1; i <= 20; i++) { await page.mouse.move(800 + i * 6, 450 + i * 3); await sleep(16); }
        await page.mouse.up();
        await sleep(1500);
        row.afterDrag = (await read()).fieldB;
      }
      row.logs = logs.slice(0, 12);
      report.push(row);
      console.log(JSON.stringify(row));
      await page.close();
    }
  }
} finally {
  writeFileSync(join(outDir, "smoke.json"), JSON.stringify(report, null, 1));
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}

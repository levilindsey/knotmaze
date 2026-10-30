// K923: desktop fragment counts and a dbg screenshot per cell.
//   node scripts/k923/count.mjs [base] [extraQuery]
//   base defaults to http://127.0.0.1:5923/K923/bench.html (serve.mjs running)
// Writes counts<extra>.json and dbg_<cell>.png next to this file. Own temp
// Chrome profile, off-screen headed window (never Levi's profile).
import puppeteer from "puppeteer-core";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] || "http://127.0.0.1:5923/K923/bench.html";
const extra = process.argv[3] || "";
const cells = [
  ["muse_fit", "scene=muse_hash&z=1"],
  ["muse_6x", "scene=muse_hash&z=6"],
  ["g41_fit", "scene=g41_def_tw64&z=1"],
  ["g41_6x", "scene=g41_def_tw64&z=6"],
];
const profile = mkdtempSync(join(tmpdir(), "k923-count-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 411, height: 753, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=560,940"],
});
const out = {};
try {
  for (const [name, q] of cells) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
    await page.goto(`${base}?${q}&v=dbg&count=1${extra}`, { waitUntil: "load", timeout: 60000 });
    await page.bringToFront();
    await page.waitForFunction(() => window.__k923Counts || window.__k923Error, { timeout: 60000 });
    await page.waitForFunction(() => window.__k923Error || (window.__knotPerf && window.__knotPerf().asleep), { timeout: 30000 });
    const r = await page.evaluate(() => ({ info: window.__k923Info, counts: window.__k923Counts, err: window.__k923Error || null, stamp: document.getElementById("stamp").textContent }));
    await page.screenshot({ path: join(here, `dbg_${name}${extra.replace(/[^a-z0-9=]/gi, "_")}.png`) });
    out[name] = { ...r, errors };
    console.log(name, JSON.stringify(out[name]));
    await page.close();
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
writeFileSync(join(here, `counts${extra.replace(/[^a-z0-9=]/gi, "_")}.json`), JSON.stringify(out, null, 1));
